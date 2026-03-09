"""
Sales Module - Routes
Extracted from server.py for clean architecture
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import qrcode
import io
import base64

# Create router
sales_router = APIRouter(prefix="/sales", tags=["Sales"])

# Import dependencies from server
def get_db():
    from server import db
    return db

def get_current_user_dep():
    from server import get_current_user
    return get_current_user


# ============== LEADS ==============

@sales_router.get("/leads")
async def get_leads(
    status: Optional[str] = None,
    source: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user_dep())
):
    """Get all leads with filters"""
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    if source:
        query["source"] = source
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}}
        ]
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return leads


@sales_router.post("/leads")
async def create_lead(data: dict, user: dict = Depends(get_current_user_dep())):
    """Create new lead"""
    db = get_db()
    lead_id = str(uuid.uuid4())
    lead_doc = {
        "id": lead_id,
        **data,
        "status": data.get("status", "new"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.leads.insert_one(lead_doc)
    if '_id' in lead_doc:
        del lead_doc['_id']
    return lead_doc


@sales_router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, user: dict = Depends(get_current_user_dep())):
    """Get single lead"""
    db = get_db()
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@sales_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, data: dict, user: dict = Depends(get_current_user_dep())):
    """Update lead"""
    db = get_db()
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.leads.find_one_and_update(
        {"id": lead_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Lead not found")
    del result['_id']
    return result


@sales_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user: dict = Depends(get_current_user_dep())):
    """Delete lead"""
    db = get_db()
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted"}


# ============== CUSTOMERS ==============

@sales_router.get("/customers")
async def get_customers(search: Optional[str] = None, user: dict = Depends(get_current_user_dep())):
    """Get all customers"""
    db = get_db()
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}}
        ]
    customers = await db.customers.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return customers


@sales_router.post("/customers")
async def create_customer(data: dict, user: dict = Depends(get_current_user_dep())):
    """Create new customer"""
    db = get_db()
    customer_id = str(uuid.uuid4())
    customer_doc = {
        "id": customer_id,
        **data,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.customers.insert_one(customer_doc)
    if '_id' in customer_doc:
        del customer_doc['_id']
    return customer_doc


# ============== QR CODES ==============

@sales_router.get("/qrcodes")
async def get_qrcodes(user: dict = Depends(get_current_user_dep())):
    """Get all QR codes"""
    db = get_db()
    qrcodes = await db.qrcodes.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return qrcodes


@sales_router.post("/qrcodes")
async def create_qrcode(data: dict, user: dict = Depends(get_current_user_dep())):
    """Create new QR code"""
    db = get_db()
    qr_id = str(uuid.uuid4())
    
    # Generate QR code image
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data.get("url", f"https://sevora.com/qr/{qr_id}"))
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_image = base64.b64encode(buffer.getvalue()).decode()
    
    qr_doc = {
        "id": qr_id,
        **data,
        "qr_image": qr_image,
        "scan_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.qrcodes.insert_one(qr_doc)
    if '_id' in qr_doc:
        del qr_doc['_id']
    return qr_doc


# ============== PARTNERS ==============

@sales_router.get("/partners")
async def get_partners(user: dict = Depends(get_current_user_dep())):
    """Get all partners"""
    db = get_db()
    partners = await db.partners.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return partners


@sales_router.post("/partners")
async def create_partner(data: dict, user: dict = Depends(get_current_user_dep())):
    """Create new partner"""
    db = get_db()
    partner_id = str(uuid.uuid4())
    partner_doc = {
        "id": partner_id,
        **data,
        "status": data.get("status", "active"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.partners.insert_one(partner_doc)
    if '_id' in partner_doc:
        del partner_doc['_id']
    return partner_doc


@sales_router.put("/partners/{partner_id}")
async def update_partner(partner_id: str, data: dict, user: dict = Depends(get_current_user_dep())):
    """Update partner"""
    db = get_db()
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.partners.find_one_and_update(
        {"id": partner_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Partner not found")
    del result['_id']
    return result


@sales_router.delete("/partners/{partner_id}")
async def delete_partner(partner_id: str, user: dict = Depends(get_current_user_dep())):
    """Delete partner"""
    db = get_db()
    result = await db.partners.delete_one({"id": partner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {"message": "Partner deleted"}


# ============== WEDDING PLANS ==============

@sales_router.get("/wedding-plans")
async def get_wedding_plans(user: dict = Depends(get_current_user_dep())):
    """Get all wedding plans"""
    db = get_db()
    plans = await db.wedding_plans.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return plans


@sales_router.post("/wedding-plans")
async def create_wedding_plan(data: dict, user: dict = Depends(get_current_user_dep())):
    """Create new wedding plan"""
    db = get_db()
    plan_id = str(uuid.uuid4())
    plan_doc = {
        "id": plan_id,
        **data,
        "status": data.get("status", "draft"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.wedding_plans.insert_one(plan_doc)
    if '_id' in plan_doc:
        del plan_doc['_id']
    return plan_doc


@sales_router.put("/wedding-plans/{plan_id}")
async def update_wedding_plan(plan_id: str, data: dict, user: dict = Depends(get_current_user_dep())):
    """Update wedding plan"""
    db = get_db()
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.wedding_plans.find_one_and_update(
        {"id": plan_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Wedding plan not found")
    del result['_id']
    return result


# ============== PIPELINE & DASHBOARD ==============

@sales_router.get("/pipeline")
async def get_pipeline(user: dict = Depends(get_current_user_dep())):
    """Get sales pipeline stats"""
    db = get_db()
    
    stages = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]
    pipeline = {}
    
    for stage in stages:
        count = await db.leads.count_documents({"status": stage})
        pipeline[stage] = count
    
    return {"stages": pipeline}


@sales_router.get("/dashboard")
async def get_sales_dashboard(user: dict = Depends(get_current_user_dep())):
    """Get sales dashboard stats"""
    db = get_db()
    
    total_leads = await db.leads.count_documents({})
    total_customers = await db.customers.count_documents({})
    total_partners = await db.partners.count_documents({})
    active_plans = await db.wedding_plans.count_documents({"status": {"$ne": "completed"}})
    
    return {
        "total_leads": total_leads,
        "total_customers": total_customers,
        "total_partners": total_partners,
        "active_wedding_plans": active_plans
    }


# ============== USERS (for assignment) ==============

@sales_router.get("/users")
async def get_sales_users(user: dict = Depends(get_current_user_dep())):
    """Get users for sales assignment dropdown"""
    db = get_db()
    users = await db.users.find(
        {"status": "active"},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "department": 1}
    ).to_list(200)
    return users


# ============== CAMPAIGNS (for QR codes) ==============

@sales_router.get("/campaigns")
async def get_sales_campaigns(user: dict = Depends(get_current_user_dep())):
    """Get campaigns for sales QR code assignment"""
    db = get_db()
    campaigns = await db.marketing_campaigns.find(
        {"status": {"$in": ["active", "draft"]}},
        {"_id": 0, "id": 1, "name": 1, "status": 1}
    ).to_list(100)
    return campaigns
