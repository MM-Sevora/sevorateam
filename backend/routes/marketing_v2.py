"""
Marketing Routes - Unified Contacts Hub, Digital PR, Events, Content & Assets
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

from models.marketing import (
    # Contact models
    ContactCreate, ContactResponse, ContactType, ContactTier,
    # Communication models
    CommunicationCreate, CommunicationResponse,
    # Deal models
    DealCreate, DealResponse,
    # Contract models
    ContractCreate, ContractResponse,
    # Payment models
    PaymentCreate, PaymentResponse,
    # UGC models
    UGCCreate, UGCResponse,
    # PR Campaign models
    PRCampaignCreate, PRCampaignResponse,
    # Press Release models
    PressReleaseCreate, PressReleaseResponse,
    # Media Coverage models
    MediaCoverageCreate, MediaCoverageResponse,
    # PR Pitch models
    PRPitchCreate, PRPitchResponse,
    # Outreach Template models
    OutreachTemplateCreate, OutreachTemplateResponse,
    # Outreach Sequence models
    OutreachSequenceCreate, OutreachSequenceResponse,
    # Scheduled Outreach models
    ScheduledOutreachCreate, ScheduledOutreachResponse,
    # Event models
    EventCreate, EventResponse, EventAttendeeCreate,
    # Asset models
    AssetCreate, AssetResponse,
    # Approval models
    ApprovalCreate, ApprovalResponse,
    # Calendar models
    CalendarItemCreate, CalendarItemResponse,
    # Phase 5: Relationship CRM models
    InteractionCreate, InteractionResponse, RelationshipScoreUpdate,
    # Phase 8: Press Kit models
    PressKitAssetCreate, PressKitAssetResponse, PressKitCreate, PressKitResponse,
    # Phase 9: Alerts & Monitoring models
    MonitoringAlertCreate, MonitoringAlertResponse, AlertTriggerCreate, AlertTriggerResponse,
    # Phase 10: Pipeline models
    PipelineContactUpdate, PipelineContactResponse, PipelineStageStats,
    # Publication models (PR equivalent of Influencers)
    PublicationCreate, PublicationResponse,
)

marketing_v2_router = APIRouter(prefix="/marketing/v2", tags=["Marketing V2"])

# Import db and auth dependencies from main server
# These will be injected when the router is included

def get_db():
    """Get database instance - will be set by main server"""
    from server import db
    return db

def get_marketing_auth():
    """Get require_department dependency for marketing"""
    from server import require_department
    return require_department(["marketing"])


# ============== UNIFIED CAMPAIGNS (Both Influencer + PR) ==============

@marketing_v2_router.get("/unified-campaigns")
async def get_unified_campaigns(
    campaign_type: Optional[str] = None,  # "influencer", "pr", or None for all
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_marketing_auth())
):
    """Get all campaigns (both influencer and PR) in a unified view"""
    db = get_db()
    
    campaigns = []
    
    # Fetch influencer campaigns
    if not campaign_type or campaign_type == "influencer":
        inf_query = {}
        if status:
            inf_query["status"] = status
        if search:
            inf_query["name"] = {"$regex": search, "$options": "i"}
        
        inf_campaigns = await db.campaigns.find(inf_query, {"_id": 0}).limit(limit).to_list(limit)
        for c in inf_campaigns:
            c["campaign_type"] = "influencer"
            c["influencer_count"] = len(c.get("assigned_influencers", []))
            campaigns.append(c)
    
    # Fetch PR campaigns
    if not campaign_type or campaign_type == "pr":
        pr_query = {}
        if status:
            pr_query["status"] = status
        if search:
            pr_query["name"] = {"$regex": search, "$options": "i"}
        
        pr_campaigns = await db.pr_campaigns.find(pr_query, {"_id": 0}).limit(limit).to_list(limit)
        for c in pr_campaigns:
            c["campaign_type"] = "pr"
            c["journalist_count"] = len(c.get("journalist_ids", []))
            # Get coverage count
            coverage_count = await db.media_coverage.count_documents({"campaign_id": c["id"]})
            c["coverage_count"] = coverage_count
            campaigns.append(c)
    
    # Sort by created_at descending
    campaigns.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return campaigns

@marketing_v2_router.get("/unified-campaigns/stats")
async def get_unified_campaign_stats(user: dict = Depends(get_marketing_auth())):
    """Get aggregate stats across all campaign types"""
    db = get_db()
    
    # Influencer campaign stats
    inf_count = await db.campaigns.count_documents({})
    inf_active = await db.campaigns.count_documents({"status": "active"})
    inf_campaigns = await db.campaigns.find({}, {"_id": 0, "budget": 1, "spent": 1}).to_list(1000)
    inf_budget = sum(c.get("budget", 0) for c in inf_campaigns)
    inf_spent = sum(c.get("spent", 0) for c in inf_campaigns)
    
    # PR campaign stats
    pr_count = await db.pr_campaigns.count_documents({})
    pr_active = await db.pr_campaigns.count_documents({"status": "active"})
    pr_campaigns = await db.pr_campaigns.find({}, {"_id": 0, "budget": 1, "spent": 1}).to_list(1000)
    pr_budget = sum(c.get("budget", 0) for c in pr_campaigns)
    pr_spent = sum(c.get("spent", 0) for c in pr_campaigns)
    
    # Deliverables stats
    ugc_count = await db.ugc.count_documents({})
    coverage_count = await db.media_coverage.count_documents({})
    
    # Payment stats
    total_paid = 0
    total_pending = 0
    payments = await db.payments.find({}, {"_id": 0, "amount": 1, "status": 1}).to_list(10000)
    for p in payments:
        if p.get("status") == "paid":
            total_paid += p.get("amount", 0)
        elif p.get("status") == "pending":
            total_pending += p.get("amount", 0)
    
    return {
        "total_campaigns": inf_count + pr_count,
        "influencer_campaigns": inf_count,
        "pr_campaigns": pr_count,
        "active_campaigns": inf_active + pr_active,
        "total_budget": inf_budget + pr_budget,
        "total_spent": inf_spent + pr_spent,
        "budget_utilization": round((inf_spent + pr_spent) / (inf_budget + pr_budget) * 100, 1) if (inf_budget + pr_budget) > 0 else 0,
        "total_deliverables": ugc_count + coverage_count,
        "ugc_count": ugc_count,
        "coverage_count": coverage_count,
        "total_paid": total_paid,
        "total_pending": total_pending,
    }


# ============== CONTACTS HUB ==============

@marketing_v2_router.get("/contacts", response_model=List[ContactResponse])
async def get_contacts(
    contact_type: Optional[str] = None,
    status: Optional[str] = None,
    tier: Optional[str] = None,
    industry: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    skip: int = 0,
    user: dict = Depends(get_marketing_auth())
):
    """Get all contacts with filters - requires marketing auth"""
    db = get_db()
    query = {}
    
    if contact_type:
        query["contact_type"] = contact_type
    if status:
        query["status"] = status
    if tier:
        query["tier"] = tier
    if industry:
        query["industry"] = industry
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"instagram_handle": {"$regex": search, "$options": "i"}},
            {"publication": {"$regex": search, "$options": "i"}},
        ]
    
    contacts = await db.contacts.find(query, {"_id": 0}).sort("score", -1).skip(skip).limit(limit).to_list(limit)
    return contacts

@marketing_v2_router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(contact_id: str, user: dict = Depends(get_marketing_auth())):
    """Get single contact by ID - requires marketing auth"""
    db = get_db()
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@marketing_v2_router.post("/contacts", response_model=ContactResponse)
async def create_contact(data: ContactCreate, user: dict = Depends(get_marketing_auth())):
    """Create a new contact - requires marketing auth"""
    db = get_db()
    contact_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    contact_doc = {
        "id": contact_id,
        **data.model_dump(),
        "status": "identified",
        "score": calculate_contact_score(data.model_dump()),
        "created_at": now,
        "updated_at": now,
    }
    
    await db.contacts.insert_one(contact_doc)
    del contact_doc["_id"]
    return contact_doc

@marketing_v2_router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(contact_id: str, data: ContactCreate, user: dict = Depends(get_marketing_auth())):
    """Update a contact - syncs publication journalist count when publication_id changes"""
    db = get_db()
    existing = await db.contacts.find_one({"id": contact_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    old_publication_id = existing.get("publication_id")
    new_publication_id = data.publication_id
    
    update_data = data.model_dump()
    update_data["score"] = calculate_contact_score(update_data)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    
    # SYNC: Update publication journalist counts when publication_id changes
    if old_publication_id != new_publication_id:
        if old_publication_id:
            # Decrement old publication's journalist count
            await db.publications.update_one(
                {"id": old_publication_id},
                {"$inc": {"journalist_count": -1}}
            )
        if new_publication_id:
            # Increment new publication's journalist count
            await db.publications.update_one(
                {"id": new_publication_id},
                {"$inc": {"journalist_count": 1}}
            )
    
    updated = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return updated

@marketing_v2_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, user: dict = Depends(get_marketing_auth())):
    """Delete a contact - syncs publication journalist count"""
    db = get_db()
    
    # Get contact first to check publication_id
    contact = await db.contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    publication_id = contact.get("publication_id")
    
    await db.contacts.delete_one({"id": contact_id})
    
    # SYNC: Decrement publication journalist count if linked
    if publication_id:
        await db.publications.update_one(
            {"id": publication_id},
            {"$inc": {"journalist_count": -1}}
        )
    
    return {"message": "Contact deleted successfully"}

@marketing_v2_router.get("/contacts/{contact_id}/stats")
async def get_contact_stats(contact_id: str, user: dict = Depends(get_marketing_auth())):
    """Get contact statistics - requires marketing auth"""
    db = get_db()
    contact = await db.contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Get related data counts
    comms_count = await db.communications.count_documents({"contact_id": contact_id})
    deals_count = await db.deals.count_documents({"contact_id": contact_id})
    payments_count = await db.payments.count_documents({"contact_id": contact_id})
    ugc_count = await db.ugc.count_documents({"contact_id": contact_id})
    
    # Calculate total paid
    payments = await db.payments.find({"contact_id": contact_id, "status": "paid"}).to_list(1000)
    total_paid = sum(p.get("amount", 0) for p in payments)
    
    return {
        "contact_id": contact_id,
        "communications": comms_count,
        "deals": deals_count,
        "payments": payments_count,
        "ugc_items": ugc_count,
        "total_paid": total_paid,
    }

def calculate_contact_score(contact: dict) -> float:
    """Calculate a score for contact prioritization"""
    score = 0.0
    
    # Engagement rate (max 25 points)
    engagement = contact.get('engagement_rate', 0)
    score += min(engagement * 5, 25)
    
    # Followers (max 20 points)
    followers = contact.get('followers', 0)
    if followers >= 1000000:
        score += 20
    elif followers >= 500000:
        score += 18
    elif followers >= 100000:
        score += 15
    elif followers >= 50000:
        score += 10
    elif followers >= 10000:
        score += 5
    
    # Industry relevance (max 20 points)
    fashion_industries = ['fashion', 'luxury', 'beauty', 'lifestyle']
    if contact.get('industry', '').lower() in fashion_industries:
        score += 20
    
    # Contact type bonus
    contact_type = contact.get('contact_type', 'influencer')
    if contact_type == 'hybrid':
        score += 10
    elif contact_type == 'journalist':
        score += 8
    
    # Has contact info (max 10 points)
    if contact.get('email'):
        score += 5
    if contact.get('phone'):
        score += 5
    
    return round(min(score, 100), 1)

# ============== PUBLICATIONS (PR equivalent of Influencers) ==============

@marketing_v2_router.get("/publications", response_model=List[PublicationResponse])
async def get_publications(
    publication_type: Optional[str] = None,
    tier: Optional[str] = None,
    beat: Optional[str] = None,
    search: Optional[str] = None,
    relationship_status: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    skip: int = 0
):
    """Get all publications with optional filters"""
    db = get_db()
    
    query = {}
    if publication_type:
        query["publication_type"] = publication_type
    if tier:
        query["tier"] = tier
    if beat:
        query["beats_covered"] = {"$in": [beat]}
    if relationship_status:
        query["relationship_status"] = relationship_status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"website": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    publications = await db.publications.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with counts
    for pub in publications:
        # Count journalists linked to this publication
        journalist_count = await db.contacts.count_documents({
            "contact_type": "journalist",
            "publication_id": pub["id"]
        })
        pub["journalist_count"] = journalist_count
        
        # Count coverages from this publication
        coverage_count = await db.media_coverage.count_documents({
            "publication": pub["name"]
        })
        pub["coverage_count"] = coverage_count
    
    return publications

@marketing_v2_router.get("/publications/{publication_id}", response_model=PublicationResponse)
async def get_publication(publication_id: str):
    """Get a single publication by ID"""
    db = get_db()
    publication = await db.publications.find_one({"id": publication_id}, {"_id": 0})
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    # Enrich with counts
    publication["journalist_count"] = await db.contacts.count_documents({
        "contact_type": "journalist",
        "publication_id": publication_id
    })
    publication["coverage_count"] = await db.media_coverage.count_documents({
        "publication": publication["name"]
    })
    
    return publication

@marketing_v2_router.post("/publications", response_model=PublicationResponse)
async def create_publication(data: PublicationCreate):
    """Create a new publication"""
    db = get_db()
    
    pub_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    pub_doc = {
        "id": pub_id,
        **data.model_dump(),
        "journalist_count": 0,
        "coverage_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.publications.insert_one(pub_doc)
    del pub_doc["_id"]
    return pub_doc

@marketing_v2_router.put("/publications/{publication_id}", response_model=PublicationResponse)
async def update_publication(publication_id: str, data: PublicationCreate):
    """Update a publication"""
    db = get_db()
    
    existing = await db.publications.find_one({"id": publication_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        **data.model_dump(),
        "updated_at": now
    }
    
    await db.publications.update_one(
        {"id": publication_id},
        {"$set": update_data}
    )
    
    updated = await db.publications.find_one({"id": publication_id}, {"_id": 0})
    updated["journalist_count"] = await db.contacts.count_documents({
        "contact_type": "journalist",
        "publication_id": publication_id
    })
    updated["coverage_count"] = await db.media_coverage.count_documents({
        "publication": updated["name"]
    })
    
    return updated

@marketing_v2_router.delete("/publications/{publication_id}")
async def delete_publication(publication_id: str):
    """Delete a publication"""
    db = get_db()
    
    result = await db.publications.delete_one({"id": publication_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    # Unlink journalists from this publication
    await db.contacts.update_many(
        {"publication_id": publication_id},
        {"$unset": {"publication_id": ""}}
    )
    
    return {"success": True}

@marketing_v2_router.get("/publications/{publication_id}/journalists", response_model=List[ContactResponse])
async def get_publication_journalists(publication_id: str):
    """Get all journalists linked to a publication"""
    db = get_db()
    
    journalists = await db.contacts.find({
        "contact_type": "journalist",
        "publication_id": publication_id
    }, {"_id": 0}).to_list(100)
    
    return journalists

@marketing_v2_router.post("/publications/{publication_id}/journalists/{journalist_id}")
async def link_journalist_to_publication(publication_id: str, journalist_id: str):
    """Link a journalist to a publication"""
    db = get_db()
    
    # Verify publication exists
    publication = await db.publications.find_one({"id": publication_id})
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    # Verify journalist exists
    journalist = await db.contacts.find_one({"id": journalist_id, "contact_type": "journalist"})
    if not journalist:
        raise HTTPException(status_code=404, detail="Journalist not found")
    
    # Link journalist to publication
    await db.contacts.update_one(
        {"id": journalist_id},
        {"$set": {
            "publication_id": publication_id,
            "publication": publication["name"]
        }}
    )
    
    return {"success": True, "message": f"Journalist linked to {publication['name']}"}

@marketing_v2_router.delete("/publications/{publication_id}/journalists/{journalist_id}")
async def unlink_journalist_from_publication(publication_id: str, journalist_id: str):
    """Unlink a journalist from a publication"""
    db = get_db()
    
    await db.contacts.update_one(
        {"id": journalist_id, "publication_id": publication_id},
        {"$unset": {"publication_id": "", "publication": ""}}
    )
    
    return {"success": True}

@marketing_v2_router.get("/publications/{publication_id}/coverage", response_model=List[MediaCoverageResponse])
async def get_publication_coverage(publication_id: str):
    """Get all media coverage from a publication"""
    db = get_db()
    
    publication = await db.publications.find_one({"id": publication_id})
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    coverage = await db.media_coverage.find({
        "publication": publication["name"]
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return coverage

# ============== COMMUNICATIONS ==============

@marketing_v2_router.get("/contacts/{contact_id}/communications", response_model=List[CommunicationResponse])
async def get_contact_communications(contact_id: str):
    """Get all communications for a contact"""
    db = get_db()
    comms = await db.communications.find({"contact_id": contact_id}, {"_id": 0}).sort("sent_at", -1).to_list(500)
    return comms

@marketing_v2_router.post("/communications", response_model=CommunicationResponse)
async def create_communication(data: CommunicationCreate):
    """Log a new communication"""
    db = get_db()
    
    # Verify contact exists
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    comm_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    comm_doc = {
        "id": comm_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "status": "sent",
        "sent_at": now,
        "opened": False,
        "replied": False,
    }
    
    await db.communications.insert_one(comm_doc)
    del comm_doc["_id"]
    return comm_doc

@marketing_v2_router.get("/outreach/all")
async def get_all_outreach(
    contact_type: Optional[str] = None,  # "influencer" or "journalist"
    status: Optional[str] = None,
    campaign_id: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_marketing_auth())
):
    """Get unified outreach view (both communications and PR pitches)"""
    db = get_db()
    
    outreach = []
    
    # Get communications (used for influencers)
    comm_query = {}
    if status:
        comm_query["status"] = status
    if campaign_id:
        comm_query["campaign_id"] = campaign_id
    
    comms = await db.communications.find(comm_query, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
    
    # Enrich with contact type
    for comm in comms:
        contact = await db.contacts.find_one({"id": comm.get("contact_id")})
        if contact:
            comm["contact_type"] = contact.get("contact_type", "influencer")
            comm["outreach_type"] = "communication"
            
            # Filter by contact_type if specified
            if not contact_type or comm["contact_type"] == contact_type:
                outreach.append(comm)
    
    # Get PR pitches (used for journalists)
    if not contact_type or contact_type == "journalist":
        pitch_query = {}
        if status:
            pitch_query["status"] = status
        if campaign_id:
            pitch_query["campaign_id"] = campaign_id
        
        pitches = await db.pr_pitches.find(pitch_query, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
        
        for pitch in pitches:
            pitch["contact_type"] = "journalist"
            pitch["outreach_type"] = "pitch"
            outreach.append(pitch)
    
    # Sort all by sent_at
    outreach.sort(key=lambda x: x.get("sent_at", ""), reverse=True)
    
    return outreach[:limit]

@marketing_v2_router.get("/outreach/stats")
async def get_outreach_stats(
    campaign_id: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get unified outreach statistics"""
    db = get_db()
    
    # Communication stats
    comm_query = {}
    if campaign_id:
        comm_query["campaign_id"] = campaign_id
    
    total_comms = await db.communications.count_documents(comm_query)
    sent_comms = await db.communications.count_documents({**comm_query, "status": "sent"})
    opened_comms = await db.communications.count_documents({**comm_query, "opened": True})
    replied_comms = await db.communications.count_documents({**comm_query, "replied": True})
    
    # PR pitch stats
    pitch_query = {}
    if campaign_id:
        pitch_query["campaign_id"] = campaign_id
    
    total_pitches = await db.pr_pitches.count_documents(pitch_query)
    sent_pitches = await db.pr_pitches.count_documents({**pitch_query, "status": "sent"})
    opened_pitches = await db.pr_pitches.count_documents({**pitch_query, "status": "opened"})
    replied_pitches = await db.pr_pitches.count_documents({**pitch_query, "status": "replied"})
    interested_pitches = await db.pr_pitches.count_documents({**pitch_query, "status": "interested"})
    
    return {
        "total_outreach": total_comms + total_pitches,
        "total_sent": sent_comms + sent_pitches,
        "total_opened": opened_comms + opened_pitches,
        "total_replied": replied_comms + replied_pitches,
        "influencer_outreach": {
            "total": total_comms,
            "sent": sent_comms,
            "opened": opened_comms,
            "replied": replied_comms,
            "response_rate": round(replied_comms / total_comms * 100, 1) if total_comms > 0 else 0
        },
        "journalist_outreach": {
            "total": total_pitches,
            "sent": sent_pitches,
            "opened": opened_pitches,
            "replied": replied_pitches,
            "interested": interested_pitches,
            "response_rate": round((replied_pitches + interested_pitches) / total_pitches * 100, 1) if total_pitches > 0 else 0
        }
    }

# ============== DEALS & CONTRACTS ==============

@marketing_v2_router.get("/contacts/{contact_id}/deals", response_model=List[DealResponse])
async def get_contact_deals(contact_id: str):
    """Get all deals for a contact"""
    db = get_db()
    deals = await db.deals.find({"contact_id": contact_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return deals

@marketing_v2_router.post("/deals", response_model=DealResponse)
async def create_deal(data: DealCreate):
    """Create a new deal"""
    db = get_db()
    
    # Verify contact exists
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    campaign_name = None
    if data.campaign_id:
        campaign = await db.campaigns.find_one({"id": data.campaign_id})
        campaign_name = campaign.get("name") if campaign else None
    
    deal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    deal_doc = {
        "id": deal_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "campaign_name": campaign_name,
        "status": "pending",
        "timeline": [{"event": "deal_created", "date": now, "note": "Deal initiated"}],
        "created_at": now,
        "updated_at": now,
    }
    
    await db.deals.insert_one(deal_doc)
    
    # Update contact status
    await db.contacts.update_one({"id": data.contact_id}, {"$set": {"status": "negotiating"}})
    
    del deal_doc["_id"]
    return deal_doc

@marketing_v2_router.put("/deals/{deal_id}/status")
async def update_deal_status(deal_id: str, status: str, note: Optional[str] = None, amount: Optional[float] = None):
    """Update deal status - syncs contact status and campaign metrics"""
    db = get_db()
    
    deal = await db.deals.find_one({"id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    old_status = deal.get("status")
    now = datetime.now(timezone.utc).isoformat()
    timeline_entry = {"event": f"status_changed_to_{status}", "date": now}
    if note:
        timeline_entry["note"] = note
    if amount:
        timeline_entry["amount"] = amount
    
    update_data = {
        "status": status,
        "updated_at": now,
    }
    
    if status == "agreed" and amount:
        update_data["final_amount"] = amount
    
    await db.deals.update_one(
        {"id": deal_id},
        {
            "$set": update_data,
            "$push": {"timeline": timeline_entry}
        }
    )
    
    # SYNC: Update contact status based on deal status
    contact_status_map = {
        "proposed": "interested",
        "negotiating": "negotiation",
        "agreed": "confirmed",
        "rejected": "identified",
        "signed": "confirmed",
        "completed": "completed",
    }
    if status in contact_status_map:
        await db.contacts.update_one(
            {"id": deal["contact_id"]},
            {"$set": {"status": contact_status_map[status]}}
        )
    
    # SYNC: Update campaign confirmed count when deal is signed/agreed
    campaign_id = deal.get("campaign_id")
    if campaign_id:
        if status in ["agreed", "signed"] and old_status not in ["agreed", "signed"]:
            # Deal just got confirmed - increment confirmed count
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$inc": {"confirmed_count": 1}}
            )
        elif old_status in ["agreed", "signed"] and status not in ["agreed", "signed"]:
            # Deal was confirmed but now changed - decrement
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$inc": {"confirmed_count": -1}}
            )
    
    return {"message": f"Deal status updated to {status}", "contact_synced": True}

# ============== CONTRACTS ==============

@marketing_v2_router.get("/deals/{deal_id}/contracts", response_model=List[ContractResponse])
async def get_deal_contracts(deal_id: str):
    """Get contracts for a deal"""
    db = get_db()
    contracts = await db.contracts.find({"deal_id": deal_id}, {"_id": 0}).to_list(50)
    return contracts

@marketing_v2_router.post("/contracts", response_model=ContractResponse)
async def create_contract(data: ContractCreate):
    """Create a new contract"""
    db = get_db()
    
    deal = await db.deals.find_one({"id": data.deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    
    contract_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    contract_doc = {
        "id": contract_id,
        **data.model_dump(),
        "contact_name": contact.get("name") if contact else None,
        "status": "draft",
        "created_at": now,
    }
    
    await db.contracts.insert_one(contract_doc)
    del contract_doc["_id"]
    return contract_doc

# ============== PAYMENTS ==============

@marketing_v2_router.get("/contacts/{contact_id}/payments", response_model=List[PaymentResponse])
async def get_contact_payments(contact_id: str):
    """Get all payments for a contact"""
    db = get_db()
    payments = await db.payments.find({"contact_id": contact_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with campaign names
    for payment in payments:
        if payment.get("campaign_id"):
            campaign = await db.campaigns.find_one({"id": payment["campaign_id"]})
            if not campaign:
                campaign = await db.pr_campaigns.find_one({"id": payment["campaign_id"]})
            payment["campaign_name"] = campaign.get("name") if campaign else None
    
    return payments

@marketing_v2_router.get("/campaigns/{campaign_id}/payments", response_model=List[PaymentResponse])
async def get_campaign_payments(campaign_id: str):
    """Get all payments for a campaign"""
    db = get_db()
    payments = await db.payments.find({"campaign_id": campaign_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return payments

@marketing_v2_router.post("/payments", response_model=PaymentResponse)
async def create_payment(data: PaymentCreate):
    """Create a new payment record - linked to campaign budget"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Get campaign name if campaign_id provided
    campaign_name = None
    if data.campaign_id:
        campaign = await db.campaigns.find_one({"id": data.campaign_id})
        if not campaign:
            campaign = await db.pr_campaigns.find_one({"id": data.campaign_id})
        if campaign:
            campaign_name = campaign.get("name")
    
    payment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate invoice number if not provided
    invoice_number = data.invoice_number
    if not invoice_number:
        count = await db.payments.count_documents({})
        invoice_number = f"INV-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"
    
    payment_doc = {
        "id": payment_id,
        **data.model_dump(),
        "invoice_number": invoice_number,
        "contact_name": contact.get("name"),
        "campaign_name": campaign_name,
        "status": "pending",
        "created_at": now,
    }
    
    await db.payments.insert_one(payment_doc)
    del payment_doc["_id"]
    return payment_doc

@marketing_v2_router.put("/payments/{payment_id}/status")
async def update_payment_status(payment_id: str, status: str):
    """Update payment status - auto-syncs campaign budget when paid"""
    db = get_db()
    
    # Get the payment first
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    old_status = payment.get("status")
    
    update_data = {"status": status}
    if status == "paid":
        update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.payments.update_one({"id": payment_id}, {"$set": update_data})
    
    # SYNC: Update campaign spent when payment status changes
    campaign_id = payment.get("campaign_id")
    amount = payment.get("amount", 0)
    
    if campaign_id and amount > 0:
        # Determine which collection the campaign is in
        campaign = await db.campaigns.find_one({"id": campaign_id})
        collection = db.campaigns if campaign else db.pr_campaigns
        
        if status == "paid" and old_status != "paid":
            # Payment just marked as paid - increment spent
            await collection.update_one(
                {"id": campaign_id},
                {"$inc": {"spent": amount}}
            )
        elif old_status == "paid" and status != "paid":
            # Payment was paid but now changed to something else - decrement spent
            await collection.update_one(
                {"id": campaign_id},
                {"$inc": {"spent": -amount}}
            )
    
    return {"message": f"Payment status updated to {status}", "campaign_synced": bool(campaign_id)}

# ============== UGC (User Generated Content) ==============

@marketing_v2_router.get("/ugc", response_model=List[UGCResponse])
async def get_all_ugc(
    contact_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    status: Optional[str] = None,
    content_type: Optional[str] = None,
    limit: int = 100,
):
    """Get all UGC with filters"""
    db = get_db()
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if campaign_id:
        query["campaign_id"] = campaign_id
    if status:
        query["status"] = status
    if content_type:
        query["content_type"] = content_type
    
    ugc = await db.ugc.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return ugc

@marketing_v2_router.post("/ugc", response_model=UGCResponse)
async def create_ugc(data: UGCCreate):
    """Create a new UGC entry"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    ugc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    ugc_doc = {
        "id": ugc_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "status": "draft",
        "metrics": {},
        "created_at": now,
    }
    
    await db.ugc.insert_one(ugc_doc)
    del ugc_doc["_id"]
    return ugc_doc


# ============== UNIFIED DELIVERABLES (UGC + PR Coverage) ==============

@marketing_v2_router.get("/unified-deliverables")
async def get_unified_deliverables(
    campaign_id: Optional[str] = None,
    deliverable_type: Optional[str] = None,  # "ugc" or "coverage"
    status: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_marketing_auth())
):
    """Get all deliverables (UGC + PR Coverage) in a unified view"""
    db = get_db()
    
    deliverables = []
    
    # Fetch UGC (Influencer content)
    if not deliverable_type or deliverable_type == "ugc":
        ugc_query = {}
        if campaign_id:
            ugc_query["campaign_id"] = campaign_id
        if status:
            ugc_query["status"] = status
        
        ugc_items = await db.ugc.find(ugc_query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        for item in ugc_items:
            item["deliverable_type"] = "ugc"
            item["deliverable_category"] = "influencer_content"
            deliverables.append(item)
    
    # Fetch PR Coverage
    if not deliverable_type or deliverable_type == "coverage":
        coverage_query = {}
        if campaign_id:
            coverage_query["campaign_id"] = campaign_id
        if status:
            coverage_query["status"] = status
        
        coverage_items = await db.media_coverage.find(coverage_query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        for item in coverage_items:
            item["deliverable_type"] = "coverage"
            item["deliverable_category"] = "pr_coverage"
            deliverables.append(item)
    
    # Sort by created_at descending
    deliverables.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return deliverables[:limit]

@marketing_v2_router.get("/unified-deliverables/stats")
async def get_deliverables_stats(
    campaign_id: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get deliverables statistics"""
    db = get_db()
    
    ugc_query = {} if not campaign_id else {"campaign_id": campaign_id}
    coverage_query = {} if not campaign_id else {"campaign_id": campaign_id}
    
    # UGC stats
    total_ugc = await db.ugc.count_documents(ugc_query)
    ugc_approved = await db.ugc.count_documents({**ugc_query, "status": "approved"})
    ugc_published = await db.ugc.count_documents({**ugc_query, "status": "published"})
    ugc_pending = await db.ugc.count_documents({**ugc_query, "status": "pending_approval"})
    
    # Coverage stats
    total_coverage = await db.media_coverage.count_documents(coverage_query)
    coverage_published = await db.media_coverage.count_documents({**coverage_query, "status": "published"})
    coverage_pending = await db.media_coverage.count_documents({**coverage_query, "status": "pending"})
    
    # Calculate estimated media value from coverage
    coverage_items = await db.media_coverage.find(coverage_query, {"_id": 0, "estimated_media_value": 1}).to_list(10000)
    total_media_value = sum(c.get("estimated_media_value", 0) for c in coverage_items)
    
    return {
        "total_deliverables": total_ugc + total_coverage,
        "ugc": {
            "total": total_ugc,
            "approved": ugc_approved,
            "published": ugc_published,
            "pending": ugc_pending
        },
        "coverage": {
            "total": total_coverage,
            "published": coverage_published,
            "pending": coverage_pending,
            "estimated_media_value": total_media_value
        }
    }


# ============== DIGITAL PR - PRESS RELEASES ==============

@marketing_v2_router.get("/pr/releases", response_model=List[PressReleaseResponse])
async def get_press_releases(status: Optional[str] = None, limit: int = 50):
    """Get all press releases"""
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    
    releases = await db.press_releases.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return releases

@marketing_v2_router.post("/pr/releases", response_model=PressReleaseResponse)
async def create_press_release(data: PressReleaseCreate):
    """Create a new press release"""
    db = get_db()
    
    release_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    release_doc = {
        "id": release_id,
        **data.model_dump(),
        "status": "draft",
        "distributed_to": [],
        "coverage_count": 0,
        "created_at": now,
    }
    
    await db.press_releases.insert_one(release_doc)
    del release_doc["_id"]
    return release_doc

@marketing_v2_router.put("/pr/releases/{release_id}")
async def update_press_release(release_id: str, data: PressReleaseCreate):
    """Update a press release"""
    db = get_db()
    
    result = await db.press_releases.update_one(
        {"id": release_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Press release not found")
    
    return {"message": "Press release updated"}

# ============== DIGITAL PR - MEDIA COVERAGE ==============

@marketing_v2_router.get("/pr/coverage", response_model=List[MediaCoverageResponse])
async def get_media_coverage(
    campaign_id: Optional[str] = None,
    sentiment: Optional[str] = None,
    limit: int = 100,
):
    """Get all media coverage"""
    db = get_db()
    query = {}
    if campaign_id:
        query["campaign_id"] = campaign_id
    if sentiment:
        query["sentiment"] = sentiment
    
    coverage = await db.media_coverage.find(query, {"_id": 0}).sort("published_date", -1).limit(limit).to_list(limit)
    return coverage

@marketing_v2_router.post("/pr/coverage", response_model=MediaCoverageResponse)
async def create_media_coverage(data: MediaCoverageCreate):
    """Record new media coverage"""
    db = get_db()
    
    contact_name = None
    if data.contact_id:
        contact = await db.contacts.find_one({"id": data.contact_id})
        contact_name = contact.get("name") if contact else None
    
    coverage_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    coverage_doc = {
        "id": coverage_id,
        **data.model_dump(),
        "contact_name": contact_name,
        "created_at": now,
    }
    
    await db.media_coverage.insert_one(coverage_doc)
    
    # Update press release coverage count if linked
    if data.press_release_id:
        await db.press_releases.update_one(
            {"id": data.press_release_id},
            {"$inc": {"coverage_count": 1}}
        )
    
    del coverage_doc["_id"]
    return coverage_doc

# ============== DIGITAL PR - PITCHES ==============

@marketing_v2_router.get("/pr/pitches", response_model=List[PRPitchResponse])
async def get_pr_pitches(status: Optional[str] = None, limit: int = 100):
    """Get all PR pitches"""
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    
    pitches = await db.pr_pitches.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return pitches

@marketing_v2_router.post("/pr/pitches", response_model=PRPitchResponse)
async def create_pr_pitch(data: PRPitchCreate):
    """Create a new PR pitch"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    pitch_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    pitch_doc = {
        "id": pitch_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "publication": contact.get("publication"),
        "status": "draft",
        "created_at": now,
    }
    
    await db.pr_pitches.insert_one(pitch_doc)
    del pitch_doc["_id"]
    return pitch_doc

# ============== EVENTS ==============

@marketing_v2_router.get("/events", response_model=List[EventResponse])
async def get_events(
    event_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
):
    """Get all events"""
    db = get_db()
    query = {}
    if event_type:
        query["event_type"] = event_type
    if status:
        query["status"] = status
    
    events = await db.events.find(query, {"_id": 0}).sort("start_date", -1).limit(limit).to_list(limit)
    return events

@marketing_v2_router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str):
    """Get single event"""
    db = get_db()
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@marketing_v2_router.post("/events", response_model=EventResponse)
async def create_event(data: EventCreate):
    """Create a new event"""
    db = get_db()
    
    campaign_name = None
    if data.campaign_id:
        campaign = await db.campaigns.find_one({"id": data.campaign_id})
        campaign_name = campaign.get("name") if campaign else None
    
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    event_doc = {
        "id": event_id,
        **data.model_dump(),
        "campaign_name": campaign_name,
        "status": "planning",
        "spent": 0.0,
        "confirmed_attendees": 0,
        "attendees": [],
        "created_at": now,
    }
    
    await db.events.insert_one(event_doc)
    del event_doc["_id"]
    return event_doc

@marketing_v2_router.post("/events/{event_id}/attendees")
async def add_event_attendee(event_id: str, data: EventAttendeeCreate):
    """Add attendee to event"""
    db = get_db()
    
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    attendee_entry = {
        "contact_id": data.contact_id,
        "contact_name": contact.get("name"),
        "rsvp_status": data.rsvp_status,
        "notes": data.notes,
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Update confirmed count if status is confirmed
    update_ops = {"$push": {"attendees": attendee_entry}}
    if data.rsvp_status == "confirmed":
        update_ops["$inc"] = {"confirmed_attendees": 1}
    
    await db.events.update_one({"id": event_id}, update_ops)
    
    return {"message": "Attendee added successfully"}

# ============== CONTENT & ASSETS ==============

@marketing_v2_router.get("/assets", response_model=List[AssetResponse])
async def get_assets(
    category: Optional[str] = None,
    asset_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
):
    """Get all assets"""
    db = get_db()
    query = {}
    if category:
        query["category"] = category
    if asset_type:
        query["asset_type"] = asset_type
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search]}},
        ]
    
    assets = await db.assets.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return assets

@marketing_v2_router.post("/assets", response_model=AssetResponse)
async def create_asset(data: AssetCreate):
    """Upload a new asset"""
    db = get_db()
    
    asset_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    asset_doc = {
        "id": asset_id,
        **data.model_dump(),
        "downloads": 0,
        "created_at": now,
        "updated_at": now,
    }
    
    await db.assets.insert_one(asset_doc)
    del asset_doc["_id"]
    return asset_doc

@marketing_v2_router.put("/assets/{asset_id}/download")
async def track_asset_download(asset_id: str):
    """Track asset download"""
    db = get_db()
    await db.assets.update_one({"id": asset_id}, {"$inc": {"downloads": 1}})
    return {"message": "Download tracked"}

# ============== APPROVAL WORKFLOW ==============

@marketing_v2_router.get("/approvals", response_model=List[ApprovalResponse])
async def get_approvals(status: Optional[str] = None, limit: int = 50):
    """Get all pending approvals"""
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    else:
        query["status"] = "pending"  # Default to pending
    
    approvals = await db.approvals.find(query, {"_id": 0}).sort("submitted_at", -1).limit(limit).to_list(limit)
    return approvals

@marketing_v2_router.post("/approvals", response_model=ApprovalResponse)
async def submit_for_approval(data: ApprovalCreate):
    """Submit item for approval"""
    db = get_db()
    
    approval_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Get item title based on type
    item_title = None
    if data.item_type == "ugc":
        item = await db.ugc.find_one({"id": data.item_id})
        item_title = item.get("title") if item else None
    elif data.item_type == "press_release":
        item = await db.press_releases.find_one({"id": data.item_id})
        item_title = item.get("title") if item else None
    
    approval_doc = {
        "id": approval_id,
        **data.model_dump(),
        "item_title": item_title,
        "status": "pending",
        "submitted_at": now,
    }
    
    await db.approvals.insert_one(approval_doc)
    del approval_doc["_id"]
    return approval_doc

@marketing_v2_router.put("/approvals/{approval_id}/review")
async def review_approval(approval_id: str, status: str, reviewed_by: str, notes: Optional[str] = None):
    """Review and approve/reject"""
    db = get_db()
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "status": status,
        "reviewed_by": reviewed_by,
        "review_notes": notes,
        "reviewed_at": now,
    }
    
    result = await db.approvals.update_one({"id": approval_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Approval not found")
    
    # Update the original item status
    approval = await db.approvals.find_one({"id": approval_id})
    if approval:
        item_status = "approved" if status == "approved" else "rejected"
        collection_map = {
            "ugc": db.ugc,
            "press_release": db.press_releases,
        }
        if approval["item_type"] in collection_map:
            await collection_map[approval["item_type"]].update_one(
                {"id": approval["item_id"]},
                {"$set": {"status": item_status}}
            )
    
    return {"message": f"Approval {status}"}

# ============== MARKETING CALENDAR ==============

@marketing_v2_router.get("/calendar", response_model=List[CalendarItemResponse])
async def get_calendar_items(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    item_type: Optional[str] = None,
):
    """Get calendar items"""
    db = get_db()
    query = {}
    
    if item_type:
        query["item_type"] = item_type
    
    if start_date:
        query["start_date"] = {"$gte": start_date}
    if end_date:
        if "start_date" in query:
            query["start_date"]["$lte"] = end_date
        else:
            query["start_date"] = {"$lte": end_date}
    
    items = await db.calendar_items.find(query, {"_id": 0}).sort("start_date", 1).to_list(500)
    return items

@marketing_v2_router.post("/calendar", response_model=CalendarItemResponse)
async def create_calendar_item(data: CalendarItemCreate):
    """Create a calendar item"""
    db = get_db()
    
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    item_doc = {
        "id": item_id,
        **data.model_dump(),
        "created_at": now,
    }
    
    await db.calendar_items.insert_one(item_doc)
    del item_doc["_id"]
    return item_doc

# ============== DASHBOARD STATS ==============

@marketing_v2_router.get("/dashboard/stats")
async def get_marketing_dashboard_stats():
    """Get marketing dashboard statistics"""
    db = get_db()
    
    # Contact stats by type
    total_contacts = await db.contacts.count_documents({})
    influencer_count = await db.contacts.count_documents({"contact_type": "influencer"})
    journalist_count = await db.contacts.count_documents({"contact_type": "journalist"})
    blogger_count = await db.contacts.count_documents({"contact_type": "blogger"})
    hybrid_count = await db.contacts.count_documents({"contact_type": "hybrid"})
    
    # Deal stats
    active_deals = await db.deals.count_documents({"status": {"$in": ["pending", "negotiating"]}})
    agreed_deals = await db.deals.count_documents({"status": "agreed"})
    
    # PR stats
    press_releases = await db.press_releases.count_documents({})
    media_coverage = await db.media_coverage.count_documents({})
    
    # Event stats
    upcoming_events = await db.events.count_documents({"status": {"$in": ["planning", "confirmed"]}})
    
    # UGC stats
    pending_approvals = await db.approvals.count_documents({"status": "pending"})
    
    return {
        "contacts": {
            "total": total_contacts,
            "influencers": influencer_count,
            "journalists": journalist_count,
            "bloggers": blogger_count,
            "hybrid": hybrid_count,
        },
        "deals": {
            "active": active_deals,
            "agreed": agreed_deals,
        },
        "pr": {
            "press_releases": press_releases,
            "media_coverage": media_coverage,
        },
        "events": {
            "upcoming": upcoming_events,
        },
        "approvals": {
            "pending": pending_approvals,
        },
    }


# ============== PHASE 2: AI MEDIA DISCOVERY ==============

@marketing_v2_router.post("/pr/ai-discover")
async def ai_discover_journalists(
    discovery_brief: dict,
    user: dict = Depends(get_marketing_auth())
):
    """AI-powered journalist discovery based on PR brief"""
    from services.ai_pr_discovery_service import ai_pr_discovery_service
    
    db = get_db()
    
    # Get all journalists from database
    journalists = await db.contacts.find(
        {"contact_type": "journalist"},
        {"_id": 0}
    ).to_list(500)
    
    if not journalists:
        return {
            "success": False,
            "error": "No journalists in database. Add media contacts first.",
            "recommendations": []
        }
    
    # Run AI discovery
    result = await ai_pr_discovery_service.discover_journalists(discovery_brief, journalists)
    
    # Save discovery session
    session_id = str(uuid.uuid4())
    session_doc = {
        "id": session_id,
        "type": "pr_discovery",
        "brief": discovery_brief,
        "result": result.get("data", {}),
        "user_id": user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.discovery_sessions.insert_one(session_doc)
    
    return {
        "session_id": session_id,
        **result
    }

@marketing_v2_router.post("/pr/ai-generate-pitch")
async def ai_generate_pitch(
    journalist_id: str,
    press_release_id: Optional[str] = None,
    tone: str = "professional",
    user: dict = Depends(get_marketing_auth())
):
    """AI-generate personalized pitch for a journalist"""
    from services.ai_pr_discovery_service import ai_pr_discovery_service
    
    db = get_db()
    
    journalist = await db.contacts.find_one({"id": journalist_id}, {"_id": 0})
    if not journalist:
        raise HTTPException(status_code=404, detail="Journalist not found")
    
    press_release = {}
    if press_release_id:
        press_release = await db.press_releases.find_one({"id": press_release_id}, {"_id": 0}) or {}
    
    result = await ai_pr_discovery_service.generate_pitch_message(journalist, press_release, tone)
    return result

@marketing_v2_router.post("/pr/ai-generate-followup")
async def ai_generate_followup(
    journalist_id: str,
    original_pitch_id: str,
    follow_up_number: int = 1,
    user: dict = Depends(get_marketing_auth())
):
    """AI-generate follow-up message for a pitch"""
    from services.ai_pr_discovery_service import ai_pr_discovery_service
    
    db = get_db()
    
    journalist = await db.contacts.find_one({"id": journalist_id}, {"_id": 0})
    if not journalist:
        raise HTTPException(status_code=404, detail="Journalist not found")
    
    original_pitch = await db.pr_pitches.find_one({"id": original_pitch_id}, {"_id": 0})
    if not original_pitch:
        raise HTTPException(status_code=404, detail="Original pitch not found")
    
    # Calculate days since sent
    if original_pitch.get("sent_at"):
        sent_date = datetime.fromisoformat(original_pitch["sent_at"].replace("Z", "+00:00"))
        days_since = (datetime.now(timezone.utc) - sent_date).days
        original_pitch["days_since_sent"] = days_since
    
    result = await ai_pr_discovery_service.generate_follow_up(journalist, original_pitch, follow_up_number)
    return result

@marketing_v2_router.post("/pr/ai-analyze-list")
async def ai_analyze_media_list(
    journalist_ids: List[str],
    campaign_objectives: dict,
    user: dict = Depends(get_marketing_auth())
):
    """AI-analyze a media list for coverage potential"""
    from services.ai_pr_discovery_service import ai_pr_discovery_service
    
    db = get_db()
    
    journalists = await db.contacts.find(
        {"id": {"$in": journalist_ids}},
        {"_id": 0}
    ).to_list(len(journalist_ids))
    
    result = await ai_pr_discovery_service.analyze_media_list(journalists, campaign_objectives)
    return result

# ============== PHASE 3: PR CAMPAIGN MANAGEMENT ==============

@marketing_v2_router.get("/pr/campaigns", response_model=List[PRCampaignResponse])
async def get_pr_campaigns(
    status: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_marketing_auth())
):
    """Get all PR campaigns"""
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    
    campaigns = await db.pr_campaigns.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return campaigns

@marketing_v2_router.get("/pr/campaigns/{campaign_id}", response_model=PRCampaignResponse)
async def get_pr_campaign(campaign_id: str, user: dict = Depends(get_marketing_auth())):
    """Get single PR campaign with details"""
    db = get_db()
    
    campaign = await db.pr_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="PR Campaign not found")
    
    # Get pitch and coverage counts
    pitch_count = await db.pr_pitches.count_documents({"pr_campaign_id": campaign_id})
    coverage_count = await db.media_coverage.count_documents({"campaign_id": campaign_id})
    responded_count = await db.pr_pitches.count_documents({
        "pr_campaign_id": campaign_id,
        "status": {"$in": ["responded", "interested"]}
    })
    
    campaign["pitch_count"] = pitch_count
    campaign["coverage_count"] = coverage_count
    campaign["response_rate"] = (responded_count / pitch_count * 100) if pitch_count > 0 else 0
    
    return campaign

@marketing_v2_router.post("/pr/campaigns", response_model=PRCampaignResponse)
async def create_pr_campaign(
    data: PRCampaignCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Create a new PR campaign"""
    db = get_db()
    
    campaign_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    owner_name = None
    if data.owner_id:
        owner = await db.users.find_one({"id": data.owner_id})
        owner_name = owner.get("name") if owner else None
    
    campaign_doc = {
        "id": campaign_id,
        **data.model_dump(),
        "owner_name": owner_name,
        "status": "planning",
        "spent": 0.0,
        "journalist_ids": [],
        "press_release_ids": [],
        "pitch_count": 0,
        "coverage_count": 0,
        "response_rate": 0.0,
        "created_at": now,
        "updated_at": now,
    }
    
    await db.pr_campaigns.insert_one(campaign_doc)
    del campaign_doc["_id"]
    return campaign_doc

@marketing_v2_router.put("/pr/campaigns/{campaign_id}", response_model=PRCampaignResponse)
async def update_pr_campaign(
    campaign_id: str,
    data: PRCampaignCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Update a PR campaign"""
    db = get_db()
    
    existing = await db.pr_campaigns.find_one({"id": campaign_id})
    if not existing:
        raise HTTPException(status_code=404, detail="PR Campaign not found")
    
    update_data = data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pr_campaigns.update_one({"id": campaign_id}, {"$set": update_data})
    
    updated = await db.pr_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return updated

@marketing_v2_router.put("/pr/campaigns/{campaign_id}/status")
async def update_pr_campaign_status(
    campaign_id: str,
    status: str,
    user: dict = Depends(get_marketing_auth())
):
    """Update PR campaign status"""
    db = get_db()
    
    result = await db.pr_campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="PR Campaign not found")
    
    return {"message": f"Campaign status updated to {status}"}

@marketing_v2_router.post("/pr/campaigns/{campaign_id}/journalists/{journalist_id}")
async def add_journalist_to_campaign(
    campaign_id: str,
    journalist_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Add journalist to PR campaign"""
    db = get_db()
    
    campaign = await db.pr_campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="PR Campaign not found")
    
    journalist = await db.contacts.find_one({"id": journalist_id})
    if not journalist:
        raise HTTPException(status_code=404, detail="Journalist not found")
    
    await db.pr_campaigns.update_one(
        {"id": campaign_id},
        {"$addToSet": {"journalist_ids": journalist_id}}
    )
    
    return {"message": "Journalist added to campaign"}

@marketing_v2_router.delete("/pr/campaigns/{campaign_id}/journalists/{journalist_id}")
async def remove_journalist_from_campaign(
    campaign_id: str,
    journalist_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Remove journalist from PR campaign"""
    db = get_db()
    
    await db.pr_campaigns.update_one(
        {"id": campaign_id},
        {"$pull": {"journalist_ids": journalist_id}}
    )
    
    return {"message": "Journalist removed from campaign"}

@marketing_v2_router.post("/pr/campaigns/{campaign_id}/releases/{release_id}")
async def link_release_to_campaign(
    campaign_id: str,
    release_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Link press release to PR campaign"""
    db = get_db()
    
    await db.pr_campaigns.update_one(
        {"id": campaign_id},
        {"$addToSet": {"press_release_ids": release_id}}
    )
    
    # Also update the press release
    await db.press_releases.update_one(
        {"id": release_id},
        {"$set": {"pr_campaign_id": campaign_id}}
    )
    
    return {"message": "Press release linked to campaign"}

@marketing_v2_router.get("/pr/campaigns/{campaign_id}/journalists")
async def get_campaign_journalists(
    campaign_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Get all journalists in a PR campaign"""
    db = get_db()
    
    campaign = await db.pr_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="PR Campaign not found")
    
    journalist_ids = campaign.get("journalist_ids", [])
    if not journalist_ids:
        return []
    
    journalists = await db.contacts.find(
        {"id": {"$in": journalist_ids}},
        {"_id": 0}
    ).to_list(len(journalist_ids))
    
    # Add pitch status for each journalist
    for j in journalists:
        pitch = await db.pr_pitches.find_one(
            {"contact_id": j["id"], "pr_campaign_id": campaign_id},
            {"_id": 0, "status": 1, "sent_at": 1}
        )
        j["pitch_status"] = pitch.get("status") if pitch else "not_pitched"
        j["pitch_sent_at"] = pitch.get("sent_at") if pitch else None
    
    return journalists

# ============== PHASE 4: OUTREACH AUTOMATION ==============

@marketing_v2_router.get("/outreach/templates", response_model=List[OutreachTemplateResponse])
async def get_outreach_templates(
    template_type: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get all outreach email templates"""
    db = get_db()
    query = {}
    if template_type:
        query["template_type"] = template_type
    
    templates = await db.outreach_templates.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return templates

@marketing_v2_router.post("/outreach/templates", response_model=OutreachTemplateResponse)
async def create_outreach_template(
    data: OutreachTemplateCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Create a new outreach email template"""
    db = get_db()
    
    template_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    template_doc = {
        "id": template_id,
        **data.model_dump(),
        "usage_count": 0,
        "created_at": now,
    }
    
    await db.outreach_templates.insert_one(template_doc)
    del template_doc["_id"]
    return template_doc

@marketing_v2_router.put("/outreach/templates/{template_id}")
async def update_outreach_template(
    template_id: str,
    data: OutreachTemplateCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Update an outreach template"""
    db = get_db()
    
    result = await db.outreach_templates.update_one(
        {"id": template_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template updated"}

@marketing_v2_router.delete("/outreach/templates/{template_id}")
async def delete_outreach_template(
    template_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Delete an outreach template"""
    db = get_db()
    
    result = await db.outreach_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted"}

@marketing_v2_router.get("/outreach/sequences", response_model=List[OutreachSequenceResponse])
async def get_outreach_sequences(user: dict = Depends(get_marketing_auth())):
    """Get all outreach sequences"""
    db = get_db()
    
    sequences = await db.outreach_sequences.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    # Populate template details
    for seq in sequences:
        template_ids = seq.get("template_ids", [])
        if template_ids:
            templates = await db.outreach_templates.find(
                {"id": {"$in": template_ids}},
                {"_id": 0}
            ).to_list(len(template_ids))
            seq["templates"] = templates
    
    return sequences

@marketing_v2_router.post("/outreach/sequences", response_model=OutreachSequenceResponse)
async def create_outreach_sequence(
    data: OutreachSequenceCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Create a new outreach sequence"""
    db = get_db()
    
    sequence_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    sequence_doc = {
        "id": sequence_id,
        **data.model_dump(),
        "contacts_enrolled": 0,
        "created_at": now,
    }
    
    await db.outreach_sequences.insert_one(sequence_doc)
    del sequence_doc["_id"]
    
    # Get template details
    if data.template_ids:
        templates = await db.outreach_templates.find(
            {"id": {"$in": data.template_ids}},
            {"_id": 0}
        ).to_list(len(data.template_ids))
        sequence_doc["templates"] = templates
    
    return sequence_doc

@marketing_v2_router.post("/outreach/schedule", response_model=ScheduledOutreachResponse)
async def schedule_outreach(
    data: ScheduledOutreachCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Schedule an outreach email"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    template = await db.outreach_templates.find_one({"id": data.template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    outreach_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Personalize subject with contact name
    personalized_subject = template.get("subject", "").replace("{{name}}", contact.get("name", ""))
    
    outreach_doc = {
        "id": outreach_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "contact_email": contact.get("email"),
        "subject": personalized_subject,
        "status": "scheduled",
        "created_at": now,
    }
    
    await db.scheduled_outreach.insert_one(outreach_doc)
    del outreach_doc["_id"]
    
    # Update template usage count
    await db.outreach_templates.update_one(
        {"id": data.template_id},
        {"$inc": {"usage_count": 1}}
    )
    
    return outreach_doc

@marketing_v2_router.get("/outreach/scheduled", response_model=List[ScheduledOutreachResponse])
async def get_scheduled_outreach(
    status: Optional[str] = None,
    contact_id: Optional[str] = None,
    pr_campaign_id: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_marketing_auth())
):
    """Get all scheduled outreach"""
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    if contact_id:
        query["contact_id"] = contact_id
    if pr_campaign_id:
        query["pr_campaign_id"] = pr_campaign_id
    
    outreach = await db.scheduled_outreach.find(query, {"_id": 0}).sort("scheduled_at", 1).limit(limit).to_list(limit)
    return outreach

@marketing_v2_router.put("/outreach/scheduled/{outreach_id}/send")
async def send_scheduled_outreach(
    outreach_id: str,
    use_microsoft_graph: bool = False,
    user: dict = Depends(get_marketing_auth())
):
    """Send a scheduled outreach email (manual or via Microsoft Graph)"""
    db = get_db()
    
    outreach = await db.scheduled_outreach.find_one({"id": outreach_id}, {"_id": 0})
    if not outreach:
        raise HTTPException(status_code=404, detail="Scheduled outreach not found")
    
    contact_email = outreach.get("contact_email")
    if not contact_email:
        raise HTTPException(status_code=400, detail="Contact has no email address")
    
    # Get template for full message
    template = await db.outreach_templates.find_one({"id": outreach.get("template_id")}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Personalize message
    contact_name = outreach.get("contact_name", "")
    personalized_body = template.get("body", "").replace("{{name}}", contact_name)
    personalized_subject = outreach.get("subject", template.get("subject", ""))
    
    now = datetime.now(timezone.utc).isoformat()
    
    if use_microsoft_graph:
        # Try to send via Microsoft Graph
        try:
            from services.microsoft_service import microsoft_service
            result = await microsoft_service.send_email(
                to_email=contact_email,
                subject=personalized_subject,
                body=personalized_body,
                is_html=False
            )
            if result.get("success"):
                await db.scheduled_outreach.update_one(
                    {"id": outreach_id},
                    {"$set": {"status": "sent", "sent_at": now}}
                )
                
                # Update contact status
                await db.contacts.update_one(
                    {"id": outreach.get("contact_id")},
                    {"$set": {"status": "contacted", "last_contacted_date": now}}
                )
                
                # Log communication
                comm_doc = {
                    "id": str(uuid.uuid4()),
                    "contact_id": outreach.get("contact_id"),
                    "contact_name": contact_name,
                    "comm_type": "email",
                    "subject": personalized_subject,
                    "message": personalized_body,
                    "direction": "outbound",
                    "status": "sent",
                    "sent_at": now,
                    "opened": False,
                    "replied": False
                }
                await db.communications.insert_one(comm_doc)
                
                return {"message": "Email sent via Microsoft Graph", "status": "sent"}
            else:
                await db.scheduled_outreach.update_one(
                    {"id": outreach_id},
                    {"$set": {"status": "failed", "error_message": result.get("error")}}
                )
                return {"message": "Failed to send email", "error": result.get("error")}
        except Exception as e:
            await db.scheduled_outreach.update_one(
                {"id": outreach_id},
                {"$set": {"status": "failed", "error_message": str(e)}}
            )
            return {"message": "Failed to send email", "error": str(e)}
    else:
        # Manual send - just mark as sent and log
        await db.scheduled_outreach.update_one(
            {"id": outreach_id},
            {"$set": {"status": "sent", "sent_at": now}}
        )
        
        # Update contact status
        await db.contacts.update_one(
            {"id": outreach.get("contact_id")},
            {"$set": {"status": "contacted", "last_contacted_date": now}}
        )
        
        # Log communication
        comm_doc = {
            "id": str(uuid.uuid4()),
            "contact_id": outreach.get("contact_id"),
            "contact_name": contact_name,
            "comm_type": "email",
            "subject": personalized_subject,
            "message": personalized_body,
            "direction": "outbound",
            "status": "sent",
            "sent_at": now,
            "opened": False,
            "replied": False
        }
        await db.communications.insert_one(comm_doc)
        
        return {
            "message": "Outreach marked as sent (manual)",
            "status": "sent",
            "to": contact_email,
            "subject": personalized_subject
        }

@marketing_v2_router.put("/outreach/scheduled/{outreach_id}/cancel")
async def cancel_scheduled_outreach(
    outreach_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Cancel a scheduled outreach"""
    db = get_db()
    
    result = await db.scheduled_outreach.update_one(
        {"id": outreach_id},
        {"$set": {"status": "cancelled"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Scheduled outreach not found")
    
    return {"message": "Outreach cancelled"}

@marketing_v2_router.post("/outreach/enroll-sequence")
async def enroll_contacts_in_sequence(
    sequence_id: str,
    contact_ids: List[str],
    start_date: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Enroll multiple contacts in an outreach sequence"""
    db = get_db()
    
    sequence = await db.outreach_sequences.find_one({"id": sequence_id}, {"_id": 0})
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    template_ids = sequence.get("template_ids", [])
    if not template_ids:
        raise HTTPException(status_code=400, detail="Sequence has no templates")
    
    # Get templates with their delays
    templates = await db.outreach_templates.find(
        {"id": {"$in": template_ids}},
        {"_id": 0}
    ).to_list(len(template_ids))
    
    # Sort templates by their position in the sequence
    template_map = {t["id"]: t for t in templates}
    sorted_templates = [template_map[tid] for tid in template_ids if tid in template_map]
    
    base_date = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if start_date else datetime.now(timezone.utc)
    
    scheduled_count = 0
    for contact_id in contact_ids:
        contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
        if not contact:
            continue
        
        cumulative_delay = 0
        for template in sorted_templates:
            cumulative_delay += template.get("delay_days", 0)
            scheduled_at = base_date + timedelta(days=cumulative_delay)
            
            outreach_doc = {
                "id": str(uuid.uuid4()),
                "contact_id": contact_id,
                "contact_name": contact.get("name"),
                "contact_email": contact.get("email"),
                "sequence_id": sequence_id,
                "template_id": template["id"],
                "pr_campaign_id": sequence.get("pr_campaign_id"),
                "scheduled_at": scheduled_at.isoformat(),
                "channel": "email",
                "status": "scheduled",
                "subject": template.get("subject", "").replace("{{name}}", contact.get("name", "")),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.scheduled_outreach.insert_one(outreach_doc)
            scheduled_count += 1
    
    # Update sequence enrollment count
    await db.outreach_sequences.update_one(
        {"id": sequence_id},
        {"$inc": {"contacts_enrolled": len(contact_ids)}}
    )
    
    return {
        "message": f"Enrolled {len(contact_ids)} contacts in sequence",
        "scheduled_emails": scheduled_count
    }

@marketing_v2_router.get("/pr/outreach/stats")
async def get_pr_outreach_stats(
    pr_campaign_id: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get PR-specific outreach statistics"""
    db = get_db()
    
    query = {}
    if pr_campaign_id:
        query["pr_campaign_id"] = pr_campaign_id
    
    total_scheduled = await db.scheduled_outreach.count_documents({**query, "status": "scheduled"})
    total_sent = await db.scheduled_outreach.count_documents({**query, "status": "sent"})
    total_failed = await db.scheduled_outreach.count_documents({**query, "status": "failed"})
    total_cancelled = await db.scheduled_outreach.count_documents({**query, "status": "cancelled"})
    
    # Get response stats from pitches
    pitch_query = {"pr_campaign_id": pr_campaign_id} if pr_campaign_id else {}
    total_pitches = await db.pr_pitches.count_documents(pitch_query)
    responded_pitches = await db.pr_pitches.count_documents({**pitch_query, "status": {"$in": ["responded", "interested"]}})
    
    return {
        "outreach": {
            "scheduled": total_scheduled,
            "sent": total_sent,
            "failed": total_failed,
            "cancelled": total_cancelled,
            "total": total_scheduled + total_sent + total_failed + total_cancelled
        },
        "pitches": {
            "total": total_pitches,
            "responded": responded_pitches,
            "response_rate": (responded_pitches / total_pitches * 100) if total_pitches > 0 else 0
        }
    }

# Update pitch status
@marketing_v2_router.put("/pr/pitches/{pitch_id}/status")
async def update_pitch_status(
    pitch_id: str,
    status: str,
    user: dict = Depends(get_marketing_auth())
):
    """Update PR pitch status"""
    db = get_db()
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {"status": status}
    
    if status == "sent":
        update_data["sent_at"] = now
    elif status == "opened":
        update_data["opened_at"] = now
    elif status in ["responded", "interested", "declined"]:
        update_data["responded_at"] = now
    
    result = await db.pr_pitches.update_one({"id": pitch_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pitch not found")
    
    # Update contact status based on pitch response
    pitch = await db.pr_pitches.find_one({"id": pitch_id})
    if pitch and status in ["interested"]:
        await db.contacts.update_one(
            {"id": pitch["contact_id"]},
            {"$set": {"status": "interested"}}
        )
    
    return {"message": f"Pitch status updated to {status}"}


# ============== PHASE 5: RELATIONSHIP CRM ==============

@marketing_v2_router.get("/relationships/interactions", response_model=List[InteractionResponse])
async def get_interactions(
    contact_id: Optional[str] = None,
    interaction_type: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_marketing_auth())
):
    """Get interaction history"""
    db = get_db()
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if interaction_type:
        query["interaction_type"] = interaction_type
    
    interactions = await db.interactions.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return interactions

@marketing_v2_router.post("/relationships/interactions", response_model=InteractionResponse)
async def create_interaction(
    data: InteractionCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Log an interaction with a contact"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    interaction_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    interaction_doc = {
        "id": interaction_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "created_at": now,
    }
    
    await db.interactions.insert_one(interaction_doc)
    del interaction_doc["_id"]
    
    # Update contact's last_contacted_date
    await db.contacts.update_one(
        {"id": data.contact_id},
        {"$set": {"last_contacted_date": now}}
    )
    
    # Adjust relationship score based on interaction type
    score_adjustments = {
        "email": 1, "call": 2, "meeting": 5, "event": 3,
        "pitch": 1, "follow_up": 1, "coverage": 10, "note": 0
    }
    adjustment = score_adjustments.get(data.interaction_type, 0)
    if data.outcome == "positive":
        adjustment += 2
    elif data.outcome == "negative":
        adjustment -= 2
    
    if adjustment != 0:
        await db.contacts.update_one(
            {"id": data.contact_id},
            {"$inc": {"relationship_score": adjustment}}
        )
    
    return interaction_doc

@marketing_v2_router.get("/relationships/contacts/{contact_id}/history")
async def get_contact_relationship_history(
    contact_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Get full relationship history for a contact"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Get interactions
    interactions = await db.interactions.find(
        {"contact_id": contact_id}, {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # Get pitches
    pitches = await db.pr_pitches.find(
        {"contact_id": contact_id}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # Get coverage
    coverage = await db.media_coverage.find(
        {"contact_id": contact_id}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # Get communications
    communications = await db.communications.find(
        {"contact_id": contact_id}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {
        "contact": contact,
        "relationship_score": contact.get("relationship_score", 0),
        "interactions": interactions,
        "pitches": pitches,
        "coverage": coverage,
        "communications": communications,
        "stats": {
            "total_interactions": len(interactions),
            "total_pitches": len(pitches),
            "total_coverage": len(coverage),
            "response_rate": len([p for p in pitches if p.get("status") in ["responded", "interested"]]) / len(pitches) * 100 if pitches else 0
        }
    }

@marketing_v2_router.put("/relationships/contacts/{contact_id}/score")
async def update_relationship_score(
    contact_id: str,
    adjustment: int,
    reason: str,
    user: dict = Depends(get_marketing_auth())
):
    """Manually adjust relationship score"""
    db = get_db()
    
    adjustment = max(-10, min(10, adjustment))  # Clamp to -10 to +10
    
    result = await db.contacts.update_one(
        {"id": contact_id},
        {"$inc": {"relationship_score": adjustment}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Log the adjustment
    await db.interactions.insert_one({
        "id": str(uuid.uuid4()),
        "contact_id": contact_id,
        "interaction_type": "note",
        "notes": f"Relationship score adjusted by {adjustment}: {reason}",
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": f"Relationship score adjusted by {adjustment}"}

@marketing_v2_router.get("/relationships/top-contacts")
async def get_top_contacts(
    limit: int = 10,
    user: dict = Depends(get_marketing_auth())
):
    """Get contacts with highest relationship scores"""
    db = get_db()
    
    contacts = await db.contacts.find(
        {"contact_type": "journalist"},
        {"_id": 0}
    ).sort("relationship_score", -1).limit(limit).to_list(limit)
    
    return contacts

# ============== PHASE 8: PRESS KIT MANAGEMENT ==============

@marketing_v2_router.get("/press-kits/assets", response_model=List[PressKitAssetResponse])
async def get_press_kit_assets(
    asset_type: Optional[str] = None,
    category: Optional[str] = None,
    is_public: Optional[bool] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get all press kit assets"""
    db = get_db()
    query = {}
    if asset_type:
        query["asset_type"] = asset_type
    if category:
        query["category"] = category
    if is_public is not None:
        query["is_public"] = is_public
    
    assets = await db.press_kit_assets.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return assets

@marketing_v2_router.post("/press-kits/assets", response_model=PressKitAssetResponse)
async def create_press_kit_asset(
    data: PressKitAssetCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Add a new asset to the press kit library"""
    db = get_db()
    
    asset_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    asset_doc = {
        "id": asset_id,
        **data.model_dump(),
        "download_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    
    await db.press_kit_assets.insert_one(asset_doc)
    del asset_doc["_id"]
    return asset_doc

@marketing_v2_router.put("/press-kits/assets/{asset_id}")
async def update_press_kit_asset(
    asset_id: str,
    data: PressKitAssetCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Update a press kit asset"""
    db = get_db()
    
    update_data = data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.press_kit_assets.update_one({"id": asset_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    return {"message": "Asset updated"}

@marketing_v2_router.delete("/press-kits/assets/{asset_id}")
async def delete_press_kit_asset(
    asset_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Delete a press kit asset"""
    db = get_db()
    
    result = await db.press_kit_assets.delete_one({"id": asset_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Remove from any press kits
    await db.press_kits.update_many(
        {"asset_ids": asset_id},
        {"$pull": {"asset_ids": asset_id}}
    )
    
    return {"message": "Asset deleted"}

@marketing_v2_router.get("/press-kits", response_model=List[PressKitResponse])
async def get_press_kits(
    is_active: Optional[bool] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get all press kits"""
    db = get_db()
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    
    kits = await db.press_kits.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    # Populate assets
    for kit in kits:
        asset_ids = kit.get("asset_ids", [])
        if asset_ids:
            assets = await db.press_kit_assets.find(
                {"id": {"$in": asset_ids}}, {"_id": 0}
            ).to_list(len(asset_ids))
            kit["assets"] = assets
    
    return kits

@marketing_v2_router.post("/press-kits", response_model=PressKitResponse)
async def create_press_kit(
    data: PressKitCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Create a new press kit"""
    db = get_db()
    
    kit_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate share URL
    share_token = str(uuid.uuid4())[:8]
    
    kit_doc = {
        "id": kit_id,
        **data.model_dump(),
        "share_url": f"/press-kit/{share_token}",
        "share_token": share_token,
        "view_count": 0,
        "download_count": 0,
        "created_at": now,
    }
    
    await db.press_kits.insert_one(kit_doc)
    del kit_doc["_id"]
    
    # Populate assets
    if data.asset_ids:
        assets = await db.press_kit_assets.find(
            {"id": {"$in": data.asset_ids}}, {"_id": 0}
        ).to_list(len(data.asset_ids))
        kit_doc["assets"] = assets
    
    return kit_doc

@marketing_v2_router.get("/press-kits/{kit_id}", response_model=PressKitResponse)
async def get_press_kit(
    kit_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Get a specific press kit"""
    db = get_db()
    
    kit = await db.press_kits.find_one({"id": kit_id}, {"_id": 0})
    if not kit:
        raise HTTPException(status_code=404, detail="Press kit not found")
    
    # Populate assets
    asset_ids = kit.get("asset_ids", [])
    if asset_ids:
        assets = await db.press_kit_assets.find(
            {"id": {"$in": asset_ids}}, {"_id": 0}
        ).to_list(len(asset_ids))
        kit["assets"] = assets
    
    return kit

@marketing_v2_router.put("/press-kits/{kit_id}/assets")
async def update_press_kit_assets(
    kit_id: str,
    asset_ids: List[str],
    user: dict = Depends(get_marketing_auth())
):
    """Update assets in a press kit"""
    db = get_db()
    
    result = await db.press_kits.update_one(
        {"id": kit_id},
        {"$set": {"asset_ids": asset_ids}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Press kit not found")
    
    return {"message": "Press kit assets updated"}

@marketing_v2_router.get("/press-kits/public/{share_token}")
async def get_public_press_kit(share_token: str):
    """Get public press kit by share token (no auth required)"""
    db = get_db()
    
    kit = await db.press_kits.find_one(
        {"share_token": share_token, "is_active": True},
        {"_id": 0, "password": 0}
    )
    if not kit:
        raise HTTPException(status_code=404, detail="Press kit not found")
    
    # Check expiry
    if kit.get("expiry_date"):
        expiry = datetime.fromisoformat(kit["expiry_date"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expiry:
            raise HTTPException(status_code=410, detail="Press kit has expired")
    
    # Increment view count
    await db.press_kits.update_one({"id": kit["id"]}, {"$inc": {"view_count": 1}})
    
    # Get public assets only
    asset_ids = kit.get("asset_ids", [])
    if asset_ids:
        assets = await db.press_kit_assets.find(
            {"id": {"$in": asset_ids}, "is_public": True},
            {"_id": 0}
        ).to_list(len(asset_ids))
        kit["assets"] = assets
    
    return kit

# ============== PHASE 9: ALERTS & MONITORING ==============

@marketing_v2_router.get("/monitoring/alerts", response_model=List[MonitoringAlertResponse])
async def get_monitoring_alerts(
    alert_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get all monitoring alerts"""
    db = get_db()
    query = {}
    if alert_type:
        query["alert_type"] = alert_type
    if is_active is not None:
        query["is_active"] = is_active
    
    alerts = await db.monitoring_alerts.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return alerts

@marketing_v2_router.post("/monitoring/alerts", response_model=MonitoringAlertResponse)
async def create_monitoring_alert(
    data: MonitoringAlertCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Create a new monitoring alert"""
    db = get_db()
    
    alert_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    alert_doc = {
        "id": alert_id,
        **data.model_dump(),
        "trigger_count": 0,
        "created_at": now,
    }
    
    await db.monitoring_alerts.insert_one(alert_doc)
    del alert_doc["_id"]
    return alert_doc

@marketing_v2_router.put("/monitoring/alerts/{alert_id}")
async def update_monitoring_alert(
    alert_id: str,
    data: MonitoringAlertCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Update a monitoring alert"""
    db = get_db()
    
    result = await db.monitoring_alerts.update_one({"id": alert_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"message": "Alert updated"}

@marketing_v2_router.delete("/monitoring/alerts/{alert_id}")
async def delete_monitoring_alert(
    alert_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Delete a monitoring alert"""
    db = get_db()
    
    result = await db.monitoring_alerts.delete_one({"id": alert_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"message": "Alert deleted"}

@marketing_v2_router.put("/monitoring/alerts/{alert_id}/toggle")
async def toggle_monitoring_alert(
    alert_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Toggle alert active status"""
    db = get_db()
    
    alert = await db.monitoring_alerts.find_one({"id": alert_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    new_status = not alert.get("is_active", True)
    await db.monitoring_alerts.update_one({"id": alert_id}, {"$set": {"is_active": new_status}})
    
    return {"message": f"Alert {'activated' if new_status else 'deactivated'}"}

@marketing_v2_router.get("/monitoring/triggers", response_model=List[AlertTriggerResponse])
async def get_alert_triggers(
    alert_id: Optional[str] = None,
    is_read: Optional[bool] = None,
    limit: int = 50,
    user: dict = Depends(get_marketing_auth())
):
    """Get alert triggers/mentions"""
    db = get_db()
    query = {}
    if alert_id:
        query["alert_id"] = alert_id
    if is_read is not None:
        query["is_read"] = is_read
    
    triggers = await db.alert_triggers.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return triggers

@marketing_v2_router.post("/monitoring/triggers", response_model=AlertTriggerResponse)
async def create_alert_trigger(
    data: AlertTriggerCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Manually log an alert trigger/mention"""
    db = get_db()
    
    alert = await db.monitoring_alerts.find_one({"id": data.alert_id}, {"_id": 0})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    trigger_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    trigger_doc = {
        "id": trigger_id,
        **data.model_dump(),
        "alert_name": alert.get("name"),
        "is_read": False,
        "is_actioned": False,
        "created_at": now,
    }
    
    await db.alert_triggers.insert_one(trigger_doc)
    del trigger_doc["_id"]
    
    # Update alert stats
    await db.monitoring_alerts.update_one(
        {"id": data.alert_id},
        {"$inc": {"trigger_count": 1}, "$set": {"last_triggered": now}}
    )
    
    return trigger_doc

@marketing_v2_router.put("/monitoring/triggers/{trigger_id}/read")
async def mark_trigger_read(
    trigger_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Mark a trigger as read"""
    db = get_db()
    
    result = await db.alert_triggers.update_one({"id": trigger_id}, {"$set": {"is_read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trigger not found")
    
    return {"message": "Marked as read"}

@marketing_v2_router.put("/monitoring/triggers/{trigger_id}/action")
async def mark_trigger_actioned(
    trigger_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Mark a trigger as actioned"""
    db = get_db()
    
    result = await db.alert_triggers.update_one(
        {"id": trigger_id},
        {"$set": {"is_read": True, "is_actioned": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trigger not found")
    
    return {"message": "Marked as actioned"}

@marketing_v2_router.get("/monitoring/stats")
async def get_monitoring_stats(user: dict = Depends(get_marketing_auth())):
    """Get monitoring statistics"""
    db = get_db()
    
    total_alerts = await db.monitoring_alerts.count_documents({})
    active_alerts = await db.monitoring_alerts.count_documents({"is_active": True})
    total_triggers = await db.alert_triggers.count_documents({})
    unread_triggers = await db.alert_triggers.count_documents({"is_read": False})
    
    # Triggers by sentiment
    positive_triggers = await db.alert_triggers.count_documents({"sentiment": "positive"})
    negative_triggers = await db.alert_triggers.count_documents({"sentiment": "negative"})
    
    # Recent triggers
    recent = await db.alert_triggers.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "alerts": {
            "total": total_alerts,
            "active": active_alerts
        },
        "triggers": {
            "total": total_triggers,
            "unread": unread_triggers,
            "positive": positive_triggers,
            "negative": negative_triggers
        },
        "recent_triggers": recent
    }

# ============== PHASE 10: PIPELINE VIEW ==============

@marketing_v2_router.get("/pipeline/contacts")
async def get_pipeline_contacts(
    pr_campaign_id: Optional[str] = None,
    stage: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get contacts in pipeline format"""
    db = get_db()
    
    query = {"contact_type": "journalist"}
    if stage:
        query["pipeline_stage"] = stage
    
    # If campaign specified, only get journalists in that campaign
    if pr_campaign_id:
        campaign = await db.pr_campaigns.find_one({"id": pr_campaign_id})
        if campaign:
            journalist_ids = campaign.get("journalist_ids", [])
            if journalist_ids:
                query["id"] = {"$in": journalist_ids}
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(500)
    
    # Group by stage
    stages = ["prospect", "researching", "contacted", "replied", "interested", "negotiating", "confirmed", "published", "declined"]
    pipeline = {}
    
    for stage_name in stages:
        stage_contacts = [c for c in contacts if c.get("pipeline_stage", "prospect") == stage_name]
        pipeline[stage_name] = {
            "count": len(stage_contacts),
            "contacts": stage_contacts
        }
    
    return pipeline

@marketing_v2_router.get("/pipeline/board")
async def get_pipeline_board(
    pr_campaign_id: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get Kanban-style pipeline board"""
    db = get_db()
    
    query = {"contact_type": "journalist"}
    
    if pr_campaign_id:
        campaign = await db.pr_campaigns.find_one({"id": pr_campaign_id})
        if campaign:
            journalist_ids = campaign.get("journalist_ids", [])
            if journalist_ids:
                query["id"] = {"$in": journalist_ids}
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(500)
    
    # Define stages with display names
    stages = [
        {"id": "prospect", "name": "Prospect", "color": "gray"},
        {"id": "researching", "name": "Researching", "color": "blue"},
        {"id": "contacted", "name": "Contacted", "color": "purple"},
        {"id": "replied", "name": "Replied", "color": "amber"},
        {"id": "interested", "name": "Interested", "color": "green"},
        {"id": "negotiating", "name": "Negotiating", "color": "orange"},
        {"id": "confirmed", "name": "Confirmed", "color": "emerald"},
        {"id": "published", "name": "Published", "color": "teal"},
        {"id": "declined", "name": "Declined", "color": "red"},
    ]
    
    board = []
    for stage in stages:
        stage_contacts = [c for c in contacts if c.get("pipeline_stage", "prospect") == stage["id"]]
        
        # Calculate days in stage for each contact
        for c in stage_contacts:
            if c.get("stage_entered_at"):
                entered = datetime.fromisoformat(c["stage_entered_at"].replace("Z", "+00:00"))
                days = (datetime.now(timezone.utc) - entered).days
                c["days_in_stage"] = days
            else:
                c["days_in_stage"] = 0
        
        board.append({
            **stage,
            "count": len(stage_contacts),
            "contacts": stage_contacts
        })
    
    return board

@marketing_v2_router.put("/pipeline/contacts/{contact_id}/stage")
async def update_pipeline_stage(
    contact_id: str,
    stage: str,
    notes: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Move contact to a different pipeline stage"""
    db = get_db()
    
    valid_stages = ["prospect", "researching", "contacted", "replied", "interested", "negotiating", "confirmed", "published", "declined"]
    if stage not in valid_stages:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {valid_stages}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "pipeline_stage": stage,
        "stage_entered_at": now,
    }
    
    # Also update the contact status to match certain stages
    status_mapping = {
        "contacted": "contacted",
        "replied": "contacted",
        "interested": "interested",
        "confirmed": "confirmed",
    }
    if stage in status_mapping:
        update_data["status"] = status_mapping[stage]
    
    result = await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Log the stage change as an interaction
    contact = await db.contacts.find_one({"id": contact_id})
    await db.interactions.insert_one({
        "id": str(uuid.uuid4()),
        "contact_id": contact_id,
        "contact_name": contact.get("name") if contact else None,
        "interaction_type": "note",
        "notes": f"Moved to '{stage}' stage" + (f": {notes}" if notes else ""),
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "created_at": now
    })
    
    return {"message": f"Contact moved to {stage}"}

@marketing_v2_router.post("/pipeline/bulk-move")
async def bulk_move_pipeline(
    contact_ids: List[str],
    stage: str,
    user: dict = Depends(get_marketing_auth())
):
    """Move multiple contacts to a pipeline stage"""
    db = get_db()
    
    valid_stages = ["prospect", "researching", "contacted", "replied", "interested", "negotiating", "confirmed", "published", "declined"]
    if stage not in valid_stages:
        raise HTTPException(status_code=400, detail="Invalid stage")
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.contacts.update_many(
        {"id": {"$in": contact_ids}},
        {"$set": {"pipeline_stage": stage, "stage_entered_at": now}}
    )
    
    return {"message": f"Moved {result.modified_count} contacts to {stage}"}

@marketing_v2_router.get("/pipeline/stats")
async def get_pipeline_stats(
    pr_campaign_id: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get pipeline statistics"""
    db = get_db()
    
    query = {"contact_type": "journalist"}
    
    if pr_campaign_id:
        campaign = await db.pr_campaigns.find_one({"id": pr_campaign_id})
        if campaign:
            journalist_ids = campaign.get("journalist_ids", [])
            if journalist_ids:
                query["id"] = {"$in": journalist_ids}
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(500)
    
    total = len(contacts)
    stage_counts = {}
    for c in contacts:
        stage = c.get("pipeline_stage", "prospect")
        stage_counts[stage] = stage_counts.get(stage, 0) + 1
    
    # Calculate conversion rates
    contacted = stage_counts.get("contacted", 0) + stage_counts.get("replied", 0) + stage_counts.get("interested", 0) + stage_counts.get("negotiating", 0) + stage_counts.get("confirmed", 0) + stage_counts.get("published", 0)
    responded = stage_counts.get("replied", 0) + stage_counts.get("interested", 0) + stage_counts.get("negotiating", 0) + stage_counts.get("confirmed", 0) + stage_counts.get("published", 0)
    published = stage_counts.get("published", 0)
    
    return {
        "total": total,
        "by_stage": stage_counts,
        "conversion": {
            "contact_rate": (contacted / total * 100) if total > 0 else 0,
            "response_rate": (responded / contacted * 100) if contacted > 0 else 0,
            "publish_rate": (published / total * 100) if total > 0 else 0
        }
    }
