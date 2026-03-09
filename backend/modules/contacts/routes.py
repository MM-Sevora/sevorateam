"""
Unified Contacts Module - Routes
Consolidates contacts, influencers, and publications into a single collection
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from enum import Enum
import uuid
from datetime import datetime, timezone

# Create router
contacts_router = APIRouter(prefix="/contacts", tags=["Contacts (Unified)"])


class ContactType(str, Enum):
    INFLUENCER = "influencer"
    PUBLICATION = "publication"
    PARTNER = "partner"
    LEAD = "lead"
    VENDOR = "vendor"
    OTHER = "other"


class ContactTier(str, Enum):
    MEGA = "mega"
    MACRO = "macro"
    MID = "mid"
    MICRO = "micro"
    NANO = "nano"


class ContactStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    CONTACTED = "contacted"
    NEGOTIATING = "negotiating"
    ONBOARDED = "onboarded"
    BLACKLISTED = "blacklisted"


class ContactCreate(BaseModel):
    name: str
    contact_type: ContactType
    email: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    
    # Social handles
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    twitter_handle: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    
    # Location
    city: Optional[str] = None
    country: Optional[str] = None
    
    # Classification
    industry: Optional[str] = None
    tier: Optional[str] = None
    primary_platform: Optional[str] = None
    content_type: Optional[str] = None
    
    # Metrics (for influencers)
    followers: Optional[int] = None
    engagement_rate: Optional[float] = None
    
    # Publication specific
    publication_type: Optional[str] = None
    domain_authority: Optional[int] = None
    monthly_traffic: Optional[int] = None
    
    # Campaign assignment
    campaign_id: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    contact_type: Optional[ContactType] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    twitter_handle: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    tier: Optional[str] = None
    primary_platform: Optional[str] = None
    content_type: Optional[str] = None
    followers: Optional[int] = None
    engagement_rate: Optional[float] = None
    status: Optional[str] = None
    campaign_id: Optional[str] = None


# Import dependencies from server
def get_db():
    from server import db
    return db

def get_current_user_dep():
    from server import get_current_user
    return get_current_user


def calculate_contact_score(contact: dict) -> float:
    """Calculate a score for ranking contacts"""
    score = 0.0
    
    contact_type = contact.get("contact_type")
    
    if contact_type == "influencer":
        # Follower score (max 40 points)
        followers = contact.get("followers", 0)
        if followers >= 1000000:
            score += 40
        elif followers >= 100000:
            score += 30
        elif followers >= 10000:
            score += 20
        elif followers >= 1000:
            score += 10
        
        # Engagement score (max 30 points)
        engagement = contact.get("engagement_rate", 0)
        score += min(engagement * 5, 30)
        
        # Platform presence (max 20 points)
        if contact.get("instagram_handle"):
            score += 5
        if contact.get("youtube_handle"):
            score += 5
        if contact.get("twitter_handle"):
            score += 5
        if contact.get("linkedin_url"):
            score += 5
        
        # Profile completeness (max 10 points)
        if contact.get("bio"):
            score += 3
        if contact.get("email"):
            score += 4
        if contact.get("phone"):
            score += 3
    
    elif contact_type == "publication":
        # Domain authority score (max 40 points)
        da = contact.get("domain_authority", 0)
        score += min(da * 0.5, 40)
        
        # Traffic score (max 30 points)
        traffic = contact.get("monthly_traffic", 0)
        if traffic >= 1000000:
            score += 30
        elif traffic >= 100000:
            score += 20
        elif traffic >= 10000:
            score += 10
        
        # Tier score (max 30 points)
        tier = contact.get("tier", "").lower()
        tier_scores = {"mega": 30, "macro": 24, "mid": 18, "micro": 12, "nano": 6}
        score += tier_scores.get(tier, 0)
    
    return round(score, 2)


# ============== CRUD OPERATIONS ==============

@contacts_router.get("")
async def get_contacts(
    contact_type: Optional[str] = None,
    status: Optional[str] = None,
    tier: Optional[str] = None,
    industry: Optional[str] = None,
    city: Optional[str] = None,
    campaign_id: Optional[str] = None,
    min_followers: Optional[int] = None,
    search: Optional[str] = None,
    sort_by: str = Query(default="score", description="Sort by: score, name, followers, created_at"),
    limit: int = Query(default=100, le=500),
    skip: int = Query(default=0, ge=0),
    user: dict = Depends(get_current_user_dep())
):
    """Get all contacts with filters"""
    db = get_db()
    
    query = {}
    
    if contact_type:
        query["contact_type"] = contact_type
    if status:
        query["status"] = status
    if tier:
        query["tier"] = {"$regex": tier, "$options": "i"}
    if industry:
        query["industry"] = {"$regex": industry, "$options": "i"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if campaign_id:
        query["campaign_id"] = campaign_id
    if min_followers:
        query["followers"] = {"$gte": min_followers}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"instagram_handle": {"$regex": search, "$options": "i"}},
            {"youtube_handle": {"$regex": search, "$options": "i"}},
        ]
    
    # Determine sort order
    sort_field = "score"
    sort_order = -1
    if sort_by == "name":
        sort_field = "name"
        sort_order = 1
    elif sort_by == "followers":
        sort_field = "followers"
        sort_order = -1
    elif sort_by == "created_at":
        sort_field = "created_at"
        sort_order = -1
    
    contacts = await db.contacts.find(query, {"_id": 0}).sort(sort_field, sort_order).skip(skip).limit(limit).to_list(limit)
    
    return contacts


@contacts_router.get("/stats")
async def get_contacts_stats(user: dict = Depends(get_current_user_dep())):
    """Get contact statistics"""
    db = get_db()
    
    total = await db.contacts.count_documents({})
    
    # By type
    by_type = {}
    for ct in ["influencer", "publication", "partner", "lead", "vendor"]:
        count = await db.contacts.count_documents({"contact_type": ct})
        if count > 0:
            by_type[ct] = count
    
    # By status
    by_status = {}
    for status in ["active", "contacted", "negotiating", "onboarded"]:
        count = await db.contacts.count_documents({"status": status})
        if count > 0:
            by_status[status] = count
    
    # By tier (for influencers)
    by_tier = {}
    for tier in ["mega", "macro", "mid", "micro", "nano"]:
        count = await db.contacts.count_documents({"tier": {"$regex": tier, "$options": "i"}})
        if count > 0:
            by_tier[tier] = count
    
    # Campaign assigned
    in_campaigns = await db.contacts.count_documents({"campaign_id": {"$exists": True, "$ne": None}})
    
    return {
        "total": total,
        "by_type": by_type,
        "by_status": by_status,
        "by_tier": by_tier,
        "in_campaigns": in_campaigns
    }


@contacts_router.get("/{contact_id}")
async def get_contact(contact_id: str, user: dict = Depends(get_current_user_dep())):
    """Get single contact by ID"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Enrich with campaign info if assigned
    if contact.get("campaign_id"):
        campaign = await db.marketing_campaigns.find_one(
            {"id": contact["campaign_id"]},
            {"_id": 0, "id": 1, "name": 1, "status": 1}
        )
        contact["campaign"] = campaign
    
    # Get communication history
    communications = await db.communications.find(
        {"contact_id": contact_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    contact["recent_communications"] = communications
    
    # Get payment summary
    payments = await db.payments.find(
        {"contact_id": contact_id},
        {"_id": 0, "amount": 1, "status": 1}
    ).to_list(100)
    
    contact["payment_summary"] = {
        "total": sum(p.get("amount", 0) for p in payments),
        "paid": sum(p.get("amount", 0) for p in payments if p.get("status") == "paid"),
        "pending": sum(p.get("amount", 0) for p in payments if p.get("status") == "pending")
    }
    
    return contact


@contacts_router.post("")
async def create_contact(data: ContactCreate, user: dict = Depends(get_current_user_dep())):
    """Create new contact"""
    db = get_db()
    
    contact_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    contact_doc = {
        "id": contact_id,
        **data.model_dump(exclude_none=True),
        "status": "active",
        "score": 0.0,
        "created_at": now,
        "created_by": user.get("id")
    }
    
    # Convert enum to string
    if "contact_type" in contact_doc and hasattr(contact_doc["contact_type"], "value"):
        contact_doc["contact_type"] = contact_doc["contact_type"].value
    
    # Calculate score
    contact_doc["score"] = calculate_contact_score(contact_doc)
    
    await db.contacts.insert_one(contact_doc)
    
    if "_id" in contact_doc:
        del contact_doc["_id"]
    
    return contact_doc


@contacts_router.put("/{contact_id}")
async def update_contact(contact_id: str, data: ContactUpdate, user: dict = Depends(get_current_user_dep())):
    """Update contact"""
    db = get_db()
    
    existing = await db.contacts.find_one({"id": contact_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Convert enum to string
    if "contact_type" in update_data and hasattr(update_data["contact_type"], "value"):
        update_data["contact_type"] = update_data["contact_type"].value
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Recalculate score
    merged = {**existing, **update_data}
    update_data["score"] = calculate_contact_score(merged)
    
    result = await db.contacts.find_one_and_update(
        {"id": contact_id},
        {"$set": update_data},
        return_document=True
    )
    
    del result["_id"]
    return result


@contacts_router.delete("/{contact_id}")
async def delete_contact(contact_id: str, user: dict = Depends(get_current_user_dep())):
    """Delete contact"""
    db = get_db()
    
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return {"message": "Contact deleted", "id": contact_id}


# ============== BULK OPERATIONS ==============

@contacts_router.post("/bulk/assign-campaign")
async def bulk_assign_campaign(
    contact_ids: List[str],
    campaign_id: str,
    user: dict = Depends(get_current_user_dep())
):
    """Assign multiple contacts to a campaign"""
    db = get_db()
    
    # Verify campaign exists
    campaign = await db.marketing_campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    result = await db.contacts.update_many(
        {"id": {"$in": contact_ids}},
        {"$set": {"campaign_id": campaign_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "message": f"Assigned {result.modified_count} contacts to campaign",
        "campaign_id": campaign_id,
        "modified_count": result.modified_count
    }


@contacts_router.post("/bulk/update-status")
async def bulk_update_status(
    contact_ids: List[str],
    status: str,
    user: dict = Depends(get_current_user_dep())
):
    """Update status for multiple contacts"""
    db = get_db()
    
    result = await db.contacts.update_many(
        {"id": {"$in": contact_ids}},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "message": f"Updated status for {result.modified_count} contacts",
        "status": status,
        "modified_count": result.modified_count
    }


# ============== LEGACY COMPATIBILITY ==============

@contacts_router.get("/type/influencers")
async def get_influencers_compat(
    industry: Optional[str] = None,
    city: Optional[str] = None,
    min_followers: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user_dep())
):
    """Legacy endpoint: Get influencers only"""
    db = get_db()
    
    query = {"contact_type": "influencer"}
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
    
    influencers = await db.contacts.find(query, {"_id": 0}).sort("score", -1).to_list(500)
    return influencers


@contacts_router.get("/type/publications")
async def get_publications_compat(
    publication_type: Optional[str] = None,
    tier: Optional[str] = None,
    user: dict = Depends(get_current_user_dep())
):
    """Legacy endpoint: Get publications only"""
    db = get_db()
    
    query = {"contact_type": "publication"}
    if publication_type:
        query["publication_type"] = publication_type
    if tier:
        query["tier"] = {"$regex": tier, "$options": "i"}
    
    publications = await db.contacts.find(query, {"_id": 0}).sort("score", -1).to_list(500)
    return publications
