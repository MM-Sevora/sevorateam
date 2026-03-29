"""
Marketing Module - Routes
Extracted from server.py for clean architecture
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional
import uuid
from datetime import datetime, timezone

# Create router
marketing_router = APIRouter(prefix="/marketing", tags=["Marketing Ops"])

# Import dependencies from server
def get_db():
    from server import db
    return db

def get_require_department():
    from server import require_department
    return require_department

def get_current_user_dep():
    from server import get_current_user
    return get_current_user

def calculate_influencer_score(influencer: dict) -> float:
    """Calculate influencer score based on metrics"""
    from server import calculate_influencer_score as calc_score
    return calc_score(influencer)


# Import models from server (they stay in server.py for now)
def get_models():
    from server import (
        InfluencerCreate, InfluencerResponse,
        CampaignCreate, CampaignResponse,
        OutreachCreate, OutreachResponse,
        NegotiationCreate
    )
    return {
        'InfluencerCreate': InfluencerCreate,
        'InfluencerResponse': InfluencerResponse,
        'CampaignCreate': CampaignCreate,
        'CampaignResponse': CampaignResponse,
        'OutreachCreate': OutreachCreate,
        'OutreachResponse': OutreachResponse,
        'NegotiationCreate': NegotiationCreate,
    }


# ============== INFLUENCERS ==============

@marketing_router.get("/influencers")
async def get_influencers(
    industry: Optional[str] = None,
    city: Optional[str] = None,
    min_followers: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user_dep())
):
    """Get all influencers with filters"""
    db = get_db()
    require_department = get_require_department()
    
    query = {}
    if industry:
        query["industry"] = {"$regex": industry, "$options": "i"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if min_followers:
        query["followers"] = {"$gte": min_followers}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"instagram_handle": {"$regex": search, "$options": "i"}}
        ]
    
    # Add contact_type filter for unified collection
    query["contact_type"] = "influencer"
    influencers = await db.contacts.find(query, {"_id": 0}).sort("score", -1).to_list(500)
    return influencers


@marketing_router.get("/influencers/{influencer_id}")
async def get_influencer(influencer_id: str, user: dict = Depends(get_current_user_dep())):
    """Get single influencer by ID"""
    db = get_db()
    influencer = await db.contacts.find_one({"id": influencer_id, "contact_type": "influencer"}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    return influencer


@marketing_router.post("/influencers")
async def create_influencer(data: dict, user: dict = Depends(get_current_user_dep())):
    """Create new influencer"""
    db = get_db()
    influencer_id = str(uuid.uuid4())
    influencer_doc = {
        "id": influencer_id,
        **data,
        "contact_type": "influencer",
        "status": "identified",
        "pipeline_stage": "identified",
        "score": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    influencer_doc['score'] = calculate_influencer_score(influencer_doc)
    await db.contacts.insert_one(influencer_doc)
    if '_id' in influencer_doc:
        del influencer_doc['_id']
    return influencer_doc


@marketing_router.put("/influencers/{influencer_id}")
async def update_influencer(influencer_id: str, data: dict, user: dict = Depends(get_current_user_dep())):
    """Update influencer"""
    db = get_db()
    update_data = {k: v for k, v in data.items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.contacts.find_one_and_update(
        {"id": influencer_id, "contact_type": "influencer"},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    new_score = calculate_influencer_score(result)
    await db.contacts.update_one({"id": influencer_id}, {"$set": {"score": new_score}})
    result['score'] = new_score
    del result['_id']
    return result


@marketing_router.delete("/influencers/{influencer_id}")
async def delete_influencer(influencer_id: str, user: dict = Depends(get_current_user_dep())):
    """Delete influencer"""
    db = get_db()
    result = await db.contacts.delete_one({"id": influencer_id, "contact_type": "influencer"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Influencer not found")
    return {"message": "Influencer deleted"}


# ============== CAMPAIGNS ==============

@marketing_router.get("/campaigns")
async def get_marketing_campaigns(status: Optional[str] = None, user: dict = Depends(get_current_user_dep())):
    """Get all marketing campaigns"""
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    campaigns = await db.marketing_campaigns.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for campaign in campaigns:
        influencer_count = await db.contacts.count_documents({"campaign_id": campaign["id"]})
        campaign["influencer_count"] = influencer_count
    
    return campaigns


@marketing_router.get("/campaigns/{campaign_id}")
async def get_campaign_detail(campaign_id: str, user: dict = Depends(get_current_user_dep())):
    """Get single campaign with full details"""
    db = get_db()
    campaign = await db.marketing_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    influencers = await db.contacts.find(
        {"campaign_id": campaign_id},
        {"_id": 0, "id": 1, "name": 1, "instagram_handle": 1, "youtube_handle": 1, 
         "followers": 1, "engagement_rate": 1, "tier": 1, "status": 1, "industry": 1,
         "campaign_deliverable_id": 1, "campaign_deliverable_name": 1, "campaign_agreed_fee": 1}
    ).to_list(100)
    
    campaign["assigned_influencers"] = influencers
    campaign["influencer_count"] = len(influencers)
    
    total_reach = sum(i.get("followers", 0) for i in influencers)
    avg_engagement = sum(i.get("engagement_rate", 0) for i in influencers) / len(influencers) if influencers else 0
    
    campaign["metrics"] = {
        "total_reach": total_reach,
        "avg_engagement": round(avg_engagement, 2),
        "influencer_count": len(influencers)
    }
    
    return campaign


@marketing_router.post("/campaigns")
async def create_marketing_campaign(data: dict, user: dict = Depends(get_current_user_dep())):
    """Create new campaign"""
    db = get_db()
    campaign_id = str(uuid.uuid4())
    campaign_doc = {
        "id": campaign_id,
        **data,
        "status": data.get("status", "draft"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.marketing_campaigns.insert_one(campaign_doc)
    if '_id' in campaign_doc:
        del campaign_doc['_id']
    return campaign_doc


@marketing_router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, data: dict, user: dict = Depends(get_current_user_dep())):
    """Update campaign"""
    db = get_db()
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.marketing_campaigns.find_one_and_update(
        {"id": campaign_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Campaign not found")
    del result['_id']
    return result


@marketing_router.delete("/campaigns/{campaign_id}")
async def delete_marketing_campaign(campaign_id: str, user: dict = Depends(get_current_user_dep())):
    """Delete campaign"""
    db = get_db()
    await db.contacts.update_many(
        {"campaign_id": campaign_id},
        {"$unset": {"campaign_id": "", "campaign_deliverable_id": "", 
                    "campaign_deliverable_name": "", "campaign_agreed_fee": ""}}
    )
    result = await db.marketing_campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted"}


# ============== CAMPAIGN INFLUENCERS ==============

@marketing_router.get("/campaigns/{campaign_id}/influencers")
async def get_campaign_influencers(campaign_id: str, user: dict = Depends(get_current_user_dep())):
    """Get influencers assigned to a campaign"""
    db = get_db()
    influencers = await db.contacts.find(
        {"campaign_id": campaign_id},
        {"_id": 0}
    ).to_list(100)
    return influencers


@marketing_router.post("/campaigns/{campaign_id}/influencers/{contact_id}")
async def add_influencer_to_campaign(
    campaign_id: str,
    contact_id: str,
    deliverable_id: Optional[str] = None,
    deliverable_name: Optional[str] = None,
    agreed_fee: Optional[float] = None,
    user: dict = Depends(get_current_user_dep())
):
    """Add influencer to campaign"""
    db = get_db()
    campaign = await db.marketing_campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    contact = await db.contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = {"campaign_id": campaign_id}
    if deliverable_id:
        update_data["campaign_deliverable_id"] = deliverable_id
    if deliverable_name:
        update_data["campaign_deliverable_name"] = deliverable_name
    if agreed_fee is not None:
        update_data["campaign_agreed_fee"] = agreed_fee
    
    await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    
    return {"message": "Influencer added to campaign", "contact_id": contact_id, "campaign_id": campaign_id}


@marketing_router.delete("/campaigns/{campaign_id}/influencers/{contact_id}")
async def remove_influencer_from_campaign(campaign_id: str, contact_id: str, user: dict = Depends(get_current_user_dep())):
    """Remove influencer from campaign"""
    db = get_db()
    result = await db.contacts.update_one(
        {"id": contact_id, "campaign_id": campaign_id},
        {"$unset": {"campaign_id": "", "campaign_deliverable_id": "", 
                    "campaign_deliverable_name": "", "campaign_agreed_fee": ""}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Contact not in this campaign")
    return {"message": "Influencer removed from campaign"}


# ============== PAYMENTS ==============

@marketing_router.get("/payments")
async def get_payments(
    contact_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user_dep())
):
    """Get all payments with filters"""
    db = get_db()
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if campaign_id:
        query["campaign_id"] = campaign_id
    if status:
        query["status"] = status
    
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return payments


@marketing_router.post("/payments")
async def create_payment(data: dict, user: dict = Depends(get_current_user_dep())):
    """Create new payment"""
    db = get_db()
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        **data,
        "status": data.get("status", "pending"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.payments.insert_one(payment_doc)
    if '_id' in payment_doc:
        del payment_doc['_id']
    return payment_doc


@marketing_router.get("/payments/{payment_id}")
async def get_payment(payment_id: str, user: dict = Depends(get_current_user_dep())):
    """Get single payment"""
    db = get_db()
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@marketing_router.put("/payments/{payment_id}")
async def update_payment(payment_id: str, data: dict, user: dict = Depends(get_current_user_dep())):
    """Update payment"""
    db = get_db()
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.payments.find_one_and_update(
        {"id": payment_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Payment not found")
    del result['_id']
    return result


@marketing_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, user: dict = Depends(get_current_user_dep())):
    """Delete payment"""
    db = get_db()
    result = await db.payments.delete_one({"id": payment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Payment deleted"}


@marketing_router.get("/payments/summary/by-contact/{contact_id}")
async def get_contact_payment_summary(contact_id: str, user: dict = Depends(get_current_user_dep())):
    """Get payment summary for a contact"""
    db = get_db()
    payments = await db.payments.find({"contact_id": contact_id}, {"_id": 0}).to_list(100)
    
    total = sum(p.get("amount", 0) for p in payments)
    paid = sum(p.get("amount", 0) for p in payments if p.get("status") == "paid")
    pending = sum(p.get("amount", 0) for p in payments if p.get("status") == "pending")
    
    return {
        "contact_id": contact_id,
        "total_amount": total,
        "paid_amount": paid,
        "pending_amount": pending,
        "payment_count": len(payments)
    }


@marketing_router.get("/payments/summary/by-campaign/{campaign_id}")
async def get_campaign_payment_summary(campaign_id: str, user: dict = Depends(get_current_user_dep())):
    """Get payment summary for a campaign"""
    db = get_db()
    payments = await db.payments.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(100)
    
    total = sum(p.get("amount", 0) for p in payments)
    paid = sum(p.get("amount", 0) for p in payments if p.get("status") == "paid")
    pending = sum(p.get("amount", 0) for p in payments if p.get("status") == "pending")
    
    by_contact = {}
    for p in payments:
        cid = p.get("contact_id")
        if cid not in by_contact:
            by_contact[cid] = {"total": 0, "paid": 0}
        by_contact[cid]["total"] += p.get("amount", 0)
        if p.get("status") == "paid":
            by_contact[cid]["paid"] += p.get("amount", 0)
    
    return {
        "campaign_id": campaign_id,
        "total_amount": total,
        "paid_amount": paid,
        "pending_amount": pending,
        "payment_count": len(payments),
        "by_contact": by_contact
    }


# ============== OUTREACH & NEGOTIATIONS ==============

@marketing_router.get("/outreach")
async def get_outreach(influencer_id: Optional[str] = None, user: dict = Depends(get_current_user_dep())):
    """Get outreach records"""
    db = get_db()
    query = {}
    if influencer_id:
        query["influencer_id"] = influencer_id
    outreach = await db.outreach.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return outreach


@marketing_router.post("/outreach")
async def create_outreach(data: dict, user: dict = Depends(get_current_user_dep())):
    """Create outreach record"""
    db = get_db()
    outreach_id = str(uuid.uuid4())
    outreach_doc = {
        "id": outreach_id,
        **data,
        "status": data.get("status", "pending"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.outreach.insert_one(outreach_doc)
    if '_id' in outreach_doc:
        del outreach_doc['_id']
    return outreach_doc


@marketing_router.get("/negotiations")
async def get_negotiations(
    contact_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    user: dict = Depends(get_current_user_dep())
):
    """Get negotiations"""
    db = get_db()
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if campaign_id:
        query["campaign_id"] = campaign_id
    negotiations = await db.negotiations.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return negotiations


@marketing_router.post("/negotiations")
async def create_negotiation(data: dict, user: dict = Depends(get_current_user_dep())):
    """Create negotiation record"""
    db = get_db()
    negotiation_id = str(uuid.uuid4())
    negotiation_doc = {
        "id": negotiation_id,
        **data,
        "status": data.get("status", "in_progress"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.negotiations.insert_one(negotiation_doc)
    if '_id' in negotiation_doc:
        del negotiation_doc['_id']
    return negotiation_doc


# ============== DASHBOARD ==============

@marketing_router.get("/dashboard")
async def get_marketing_dashboard(user: dict = Depends(get_current_user_dep())):
    """Get marketing dashboard stats"""
    db = get_db()
    
    total_influencers = await db.contacts.count_documents({"contact_type": "influencer"})
    active_campaigns = await db.marketing_campaigns.count_documents({"status": "active"})
    total_campaigns = await db.marketing_campaigns.count_documents({})
    total_outreach = await db.outreach.count_documents({})
    
    return {
        "total_influencers": total_influencers,
        "active_campaigns": active_campaigns,
        "total_campaigns": total_campaigns,
        "total_outreach": total_outreach
    }
