"""
Contacts Routes - CRUD operations, stats, communications, follow-ups
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from .base import (
    get_db, get_marketing_auth, calculate_contact_score,
    ContactCreate, ContactUpdate, ContactResponse,
    CommunicationCreate, CommunicationResponse
)

router = APIRouter(tags=["Contacts"])


# ============== CONTACTS CRUD ==============

@router.get("/contacts", response_model=List[ContactResponse])
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


@router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(contact_id: str, user: dict = Depends(get_marketing_auth())):
    """Get single contact by ID - requires marketing auth"""
    db = get_db()
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.post("/contacts", response_model=ContactResponse)
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


@router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(contact_id: str, data: ContactUpdate, user: dict = Depends(get_marketing_auth())):
    """Update a contact - supports partial updates, syncs publication journalist count when publication_id changes"""
    db = get_db()
    existing = await db.contacts.find_one({"id": contact_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    old_publication_id = existing.get("publication_id")
    
    # Only include non-None values for partial update
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Handle empty strings - convert to None for optional fields
    empty_string_fields = ['email', 'bio', 'phone', 'city', 'instagram_handle', 'youtube_handle', 
                          'twitter_handle', 'linkedin_url', 'publication', 'publication_id', 
                          'beat', 'editor_level', 'notes', 'campaign_id']
    for field in empty_string_fields:
        if field in update_data and update_data[field] == "":
            update_data[field] = None
    
    # Recalculate score if relevant fields changed
    merged_data = {**existing, **update_data}
    update_data["score"] = calculate_contact_score(merged_data)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    new_publication_id = update_data.get("publication_id", old_publication_id)
    
    await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    
    # SYNC: Update publication journalist counts when publication_id changes
    if old_publication_id != new_publication_id:
        if old_publication_id:
            await db.publications.update_one(
                {"id": old_publication_id},
                {"$inc": {"journalist_count": -1}}
            )
        if new_publication_id:
            await db.publications.update_one(
                {"id": new_publication_id},
                {"$inc": {"journalist_count": 1}}
            )
    
    updated = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return updated


@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, user: dict = Depends(get_marketing_auth())):
    """Delete a contact - syncs publication journalist count"""
    db = get_db()
    
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


@router.post("/contacts/bulk-delete")
async def bulk_delete_contacts(data: dict, user: dict = Depends(get_marketing_auth())):
    """Bulk delete multiple contacts"""
    db = get_db()
    
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    contacts = await db.contacts.find({"id": {"$in": ids}}).to_list(len(ids))
    
    # Track publication updates
    publication_decrements = {}
    for contact in contacts:
        pub_id = contact.get("publication_id")
        if pub_id:
            publication_decrements[pub_id] = publication_decrements.get(pub_id, 0) + 1
    
    result = await db.contacts.delete_many({"id": {"$in": ids}})
    
    # Update publication journalist counts
    for pub_id, decrement in publication_decrements.items():
        await db.publications.update_one(
            {"id": pub_id},
            {"$inc": {"journalist_count": -decrement}}
        )
    
    # Also delete related data
    await db.communications.delete_many({"contact_id": {"$in": ids}})
    await db.deals.delete_many({"contact_id": {"$in": ids}})
    
    return {"deleted_count": result.deleted_count, "message": f"Deleted {result.deleted_count} contacts"}


# ============== CONTACT STATS & DELIVERABLES ==============

@router.get("/contacts/{contact_id}/stats")
async def get_contact_stats(contact_id: str, user: dict = Depends(get_marketing_auth())):
    """Get contact statistics - requires marketing auth"""
    db = get_db()
    contact = await db.contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    comms_count = await db.communications.count_documents({"contact_id": contact_id})
    deals_count = await db.deals.count_documents({"contact_id": contact_id})
    payments_count = await db.payments.count_documents({"contact_id": contact_id})
    ugc_count = await db.ugc.count_documents({"contact_id": contact_id})
    
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


@router.get("/contacts/{contact_id}/deliverables")
async def get_contact_deliverables(contact_id: str, user: dict = Depends(get_marketing_auth())):
    """Get rate cards/deliverables for a specific contact (influencer)"""
    db = get_db()
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0, "deliverables": 1, "name": 1})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    deliverables = contact.get("deliverables", [])
    
    for i, d in enumerate(deliverables):
        if not d.get("id"):
            d["id"] = f"{contact_id}_deliverable_{i}"
        if d.get("price") is not None and d.get("rate") is None:
            d["rate"] = d["price"]
        elif d.get("rate") is not None and d.get("price") is None:
            d["price"] = d["rate"]
    
    return deliverables


# ============== COMMUNICATIONS ==============

@router.get("/contacts/{contact_id}/communications", response_model=List[CommunicationResponse])
async def get_contact_communications(contact_id: str):
    """Get all communications for a contact"""
    db = get_db()
    comms = await db.communications.find({"contact_id": contact_id}, {"_id": 0}).sort("sent_at", -1).to_list(500)
    return comms


@router.put("/contacts/{contact_id}/communications/{comm_id}")
async def update_communication_status(
    contact_id: str,
    comm_id: str,
    data: dict
):
    """Update communication status (opened, replied, etc.)"""
    db = get_db()
    
    comm = await db.communications.find_one({"id": comm_id, "contact_id": contact_id})
    if not comm:
        raise HTTPException(status_code=404, detail="Communication not found")
    
    update_fields = {}
    if "status" in data:
        update_fields["status"] = data["status"]
    if "opened" in data:
        update_fields["opened"] = data["opened"]
    if "replied" in data:
        update_fields["replied"] = data["replied"]
    if data.get("status") == "replied":
        update_fields["replied"] = True
        update_fields["replied_at"] = datetime.now(timezone.utc).isoformat()
    if data.get("status") == "opened":
        update_fields["opened"] = True
        update_fields["opened_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_fields:
        await db.communications.update_one(
            {"id": comm_id},
            {"$set": update_fields}
        )
    
    updated = await db.communications.find_one({"id": comm_id}, {"_id": 0})
    return updated


@router.post("/communications", response_model=CommunicationResponse)
async def create_communication(data: CommunicationCreate):
    """Log a new communication"""
    db = get_db()
    
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


@router.post("/communications/bulk-delete")
async def bulk_delete_communications(data: dict, user: dict = Depends(get_marketing_auth())):
    """Bulk delete multiple communications"""
    db = get_db()
    
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    result = await db.communications.delete_many({"id": {"$in": ids}})
    
    return {"deleted_count": result.deleted_count, "message": f"Deleted {result.deleted_count} communications"}


# ============== FOLLOW-UPS ==============

@router.post("/contacts/{contact_id}/follow-ups")
async def create_follow_up(
    contact_id: str,
    data: dict,
    user: dict = Depends(get_marketing_auth())
):
    """Schedule a follow-up reminder for a contact"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    follow_up_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    follow_up_doc = {
        "id": follow_up_id,
        "contact_id": contact_id,
        "contact_name": contact.get("name"),
        "communication_id": data.get("communication_id"),
        "scheduled_date": data.get("scheduled_date"),
        "note": data.get("note", ""),
        "priority": data.get("priority", "medium"),
        "status": "pending",
        "created_by": user.get("id"),
        "created_at": now
    }
    
    await db.follow_ups.insert_one(follow_up_doc)
    del follow_up_doc["_id"]
    return follow_up_doc


@router.get("/follow-ups")
async def get_all_follow_ups(
    status: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get all scheduled follow-ups"""
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status
    
    follow_ups = await db.follow_ups.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(100)
    return follow_ups
