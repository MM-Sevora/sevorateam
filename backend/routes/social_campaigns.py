"""
Social Campaigns Routes - Campaign planning and management for social media
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/social/campaigns", tags=["Social Campaigns"])
security = HTTPBearer()

# Will be initialized from server.py
db = None
_get_current_user_func = None


def init_router(database, auth_dependency):
    global db, _get_current_user_func
    db = database
    _get_current_user_func = auth_dependency
    return router


async def get_current_user_dep(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    if _get_current_user_func is None:
        raise HTTPException(status_code=500, detail="Auth not configured")
    return await _get_current_user_func(credentials)


# ============== MODELS ==============
class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    objective: Optional[str] = "awareness"  # awareness, engagement, traffic, conversions
    start_date: str
    end_date: str
    platforms: List[str] = []  # linkedin, instagram, facebook, twitter, youtube
    status: Optional[str] = "draft"  # draft, active, paused, completed
    owner_id: Optional[str] = None
    budget: Optional[float] = 0
    target_audience: Optional[str] = ""
    hashtags: List[str] = []
    color: Optional[str] = "#E11D48"  # For calendar display


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    objective: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    platforms: Optional[List[str]] = None
    status: Optional[str] = None
    owner_id: Optional[str] = None
    budget: Optional[float] = None
    target_audience: Optional[str] = None
    hashtags: Optional[List[str]] = None
    color: Optional[str] = None


# ============== ROUTES ==============
@router.get("")
async def get_campaigns(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get all social campaigns with filters"""
    query = {}
    if status:
        query["status"] = status
    if platform:
        query["platforms"] = platform
    
    campaigns = await db.social_campaigns.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with post counts and owner names
    for campaign in campaigns:
        post_count = await db.posts.count_documents({"campaign_id": campaign["id"]})
        campaign["post_count"] = post_count
        
        if campaign.get("owner_id"):
            owner = await db.users.find_one({"id": campaign["owner_id"]}, {"_id": 0, "name": 1})
            campaign["owner_name"] = owner.get("name") if owner else None
    
    return campaigns


@router.get("/stats")
async def get_campaign_stats(user: dict = Depends(get_current_user_dep)):
    """Get campaign statistics"""
    total = await db.social_campaigns.count_documents({})
    active = await db.social_campaigns.count_documents({"status": "active"})
    draft = await db.social_campaigns.count_documents({"status": "draft"})
    completed = await db.social_campaigns.count_documents({"status": "completed"})
    paused = await db.social_campaigns.count_documents({"status": "paused"})
    
    total_posts = await db.posts.count_documents({"campaign_id": {"$exists": True, "$ne": None}})
    
    return {
        "total": total,
        "active": active,
        "draft": draft,
        "completed": completed,
        "paused": paused,
        "total_linked_posts": total_posts
    }


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str, user: dict = Depends(get_current_user_dep)):
    """Get single campaign with details"""
    campaign = await db.social_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    post_count = await db.posts.count_documents({"campaign_id": campaign_id})
    campaign["post_count"] = post_count
    
    if campaign.get("owner_id"):
        owner = await db.users.find_one({"id": campaign["owner_id"]}, {"_id": 0, "name": 1})
        campaign["owner_name"] = owner.get("name") if owner else None
    
    return campaign


@router.get("/{campaign_id}/posts")
async def get_campaign_posts(campaign_id: str, user: dict = Depends(get_current_user_dep)):
    """Get all posts linked to a campaign"""
    campaign = await db.social_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    posts = await db.posts.find({"campaign_id": campaign_id}, {"_id": 0}).sort("scheduled_at", 1).to_list(500)
    
    return {
        "campaign": campaign,
        "posts": posts,
        "total": len(posts)
    }


@router.post("")
async def create_campaign(data: CampaignCreate, user: dict = Depends(get_current_user_dep)):
    """Create a new social campaign"""
    campaign_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    campaign_doc = {
        "id": campaign_id,
        "name": data.name,
        "description": data.description or "",
        "objective": data.objective or "awareness",
        "start_date": data.start_date,
        "end_date": data.end_date,
        "platforms": data.platforms or [],
        "status": data.status or "draft",
        "owner_id": data.owner_id or user["id"],
        "budget": data.budget or 0,
        "target_audience": data.target_audience or "",
        "hashtags": data.hashtags or [],
        "color": data.color or "#E11D48",
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.social_campaigns.insert_one(campaign_doc)
    
    # Remove _id for response
    response_doc = {k: v for k, v in campaign_doc.items() if k != "_id"}
    
    owner_name = None
    if response_doc.get("owner_id"):
        owner = await db.users.find_one({"id": response_doc["owner_id"]}, {"_id": 0, "name": 1})
        owner_name = owner.get("name") if owner else None
    
    response_doc["owner_name"] = owner_name
    response_doc["post_count"] = 0
    
    return response_doc


@router.put("/{campaign_id}")
async def update_campaign(campaign_id: str, data: CampaignUpdate, user: dict = Depends(get_current_user_dep)):
    """Update a campaign"""
    existing = await db.social_campaigns.find_one({"id": campaign_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.social_campaigns.update_one({"id": campaign_id}, {"$set": update_data})
    
    updated = await db.social_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    
    post_count = await db.posts.count_documents({"campaign_id": campaign_id})
    updated["post_count"] = post_count
    
    if updated.get("owner_id"):
        owner = await db.users.find_one({"id": updated["owner_id"]}, {"_id": 0, "name": 1})
        updated["owner_name"] = owner.get("name") if owner else None
    
    return updated


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str, user: dict = Depends(get_current_user_dep)):
    """Delete a campaign"""
    result = await db.social_campaigns.delete_one({"id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    await db.posts.update_many({"campaign_id": campaign_id}, {"$unset": {"campaign_id": ""}})
    
    return {"message": "Campaign deleted", "posts_unlinked": True}


@router.post("/{campaign_id}/link-post/{post_id}")
async def link_post_to_campaign(campaign_id: str, post_id: str, user: dict = Depends(get_current_user_dep)):
    """Link a post to a campaign"""
    campaign = await db.social_campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    post = await db.posts.find_one({"post_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    await db.posts.update_one({"post_id": post_id}, {"$set": {"campaign_id": campaign_id}})
    
    return {"message": "Post linked to campaign", "campaign_id": campaign_id, "post_id": post_id}


@router.post("/{campaign_id}/unlink-post/{post_id}")
async def unlink_post_from_campaign(campaign_id: str, post_id: str, user: dict = Depends(get_current_user_dep)):
    """Unlink a post from a campaign"""
    await db.posts.update_one({"post_id": post_id}, {"$unset": {"campaign_id": ""}})
    
    return {"message": "Post unlinked from campaign", "post_id": post_id}


@router.post("/{campaign_id}/duplicate")
async def duplicate_campaign(campaign_id: str, user: dict = Depends(get_current_user_dep)):
    """Duplicate a campaign (without posts)"""
    original = await db.social_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    new_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    new_campaign = {
        **original,
        "id": new_id,
        "name": f"{original['name']} (Copy)",
        "status": "draft",
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.social_campaigns.insert_one(new_campaign)
    new_campaign["post_count"] = 0
    
    return new_campaign
