"""
Marketing Routes - Unified Contacts Hub, Digital PR, Events, Content & Assets
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import uuid
from datetime import datetime, timezone

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
    # Press Release models
    PressReleaseCreate, PressReleaseResponse,
    # Media Coverage models
    MediaCoverageCreate, MediaCoverageResponse,
    # PR Pitch models
    PRPitchCreate, PRPitchResponse,
    # Event models
    EventCreate, EventResponse, EventAttendeeCreate,
    # Asset models
    AssetCreate, AssetResponse,
    # Approval models
    ApprovalCreate, ApprovalResponse,
    # Calendar models
    CalendarItemCreate, CalendarItemResponse,
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
    """Update a contact - requires marketing auth"""
    db = get_db()
    existing = await db.contacts.find_one({"id": contact_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = data.model_dump()
    update_data["score"] = calculate_contact_score(update_data)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    
    updated = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return updated

@marketing_v2_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, user: dict = Depends(get_marketing_auth())):
    """Delete a contact - requires marketing auth"""
    db = get_db()
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
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
    """Update deal status"""
    db = get_db()
    
    deal = await db.deals.find_one({"id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
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
    
    # Update contact status based on deal status
    contact_status_map = {
        "agreed": "confirmed",
        "rejected": "identified",
        "signed": "confirmed",
    }
    if status in contact_status_map:
        await db.contacts.update_one(
            {"id": deal["contact_id"]},
            {"$set": {"status": contact_status_map[status]}}
        )
    
    return {"message": f"Deal status updated to {status}"}

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
    return payments

@marketing_v2_router.post("/payments", response_model=PaymentResponse)
async def create_payment(data: PaymentCreate):
    """Create a new payment record"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
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
        "status": "pending",
        "created_at": now,
    }
    
    await db.payments.insert_one(payment_doc)
    del payment_doc["_id"]
    return payment_doc

@marketing_v2_router.put("/payments/{payment_id}/status")
async def update_payment_status(payment_id: str, status: str):
    """Update payment status"""
    db = get_db()
    
    update_data = {"status": status}
    if status == "paid":
        update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.payments.update_one({"id": payment_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {"message": f"Payment status updated to {status}"}

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
