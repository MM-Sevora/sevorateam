"""
Social Module - Routes
Extracted from server.py for clean architecture
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from typing import List, Optional
import uuid
from datetime import datetime, timezone

# Create router
social_router = APIRouter(prefix="/social", tags=["Social Media"])

# Import dependencies from server
def get_db():
    from server import db
    return db

def get_current_user_dep():
    from server import get_current_user
    return get_current_user


# ============== CONTENT ==============

@social_router.get("/content")
async def get_content(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user_dep())
):
    """Get all content with filters"""
    db = get_db()
    query = {}
    if platform:
        query["platform"] = platform
    if status:
        query["status"] = status
    
    content = await db.content.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return content


@social_router.post("/content")
async def create_content(data: dict, user: dict = Depends(get_current_user_dep())):
    """Create new content"""
    db = get_db()
    content_id = str(uuid.uuid4())
    content_doc = {
        "id": content_id,
        **data,
        "status": data.get("status", "draft"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.content.insert_one(content_doc)
    if '_id' in content_doc:
        del content_doc['_id']
    return content_doc


@social_router.put("/content/{content_id}")
async def update_content(content_id: str, data: dict, user: dict = Depends(get_current_user_dep())):
    """Update content"""
    db = get_db()
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.content.find_one_and_update(
        {"id": content_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Content not found")
    del result['_id']
    return result


@social_router.delete("/content/{content_id}")
async def delete_content(content_id: str, user: dict = Depends(get_current_user_dep())):
    """Delete content"""
    db = get_db()
    result = await db.content.delete_one({"id": content_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")
    return {"message": "Content deleted"}


# ============== POSTS ==============

@social_router.get("/posts")
async def get_posts(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    user: dict = Depends(get_current_user_dep())
):
    """Get all posts with filters"""
    db = get_db()
    query = {}
    if platform:
        query["platform"] = platform
    if status:
        query["status"] = status
    
    posts = await db.social_posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return posts


@social_router.post("/posts")
async def create_post(data: dict, user: dict = Depends(get_current_user_dep())):
    """Create new post"""
    db = get_db()
    post_id = str(uuid.uuid4())
    post_doc = {
        "id": post_id,
        **data,
        "status": data.get("status", "draft"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id"),
        "metrics": {"likes": 0, "comments": 0, "shares": 0, "views": 0}
    }
    await db.social_posts.insert_one(post_doc)
    if '_id' in post_doc:
        del post_doc['_id']
    return post_doc


@social_router.put("/posts/{post_id}")
async def update_post(post_id: str, data: dict, user: dict = Depends(get_current_user_dep())):
    """Update post"""
    db = get_db()
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.social_posts.find_one_and_update(
        {"id": post_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Post not found")
    del result['_id']
    return result


@social_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(get_current_user_dep())):
    """Delete post"""
    db = get_db()
    result = await db.social_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted"}


# ============== DASHBOARD ==============

@social_router.get("/dashboard")
async def get_social_dashboard(user: dict = Depends(get_current_user_dep())):
    """Get social dashboard stats"""
    db = get_db()
    
    total_content = await db.content.count_documents({})
    draft_content = await db.content.count_documents({"status": "draft"})
    published_content = await db.content.count_documents({"status": "published"})
    scheduled_content = await db.content.count_documents({"status": "scheduled"})
    
    # Get content by platform
    platforms = ["instagram", "youtube", "twitter", "linkedin", "facebook"]
    by_platform = {}
    for platform in platforms:
        count = await db.content.count_documents({"platform": platform})
        if count > 0:
            by_platform[platform] = count
    
    return {
        "total_content": total_content,
        "draft": draft_content,
        "published": published_content,
        "scheduled": scheduled_content,
        "by_platform": by_platform
    }


# ============== AUTOPILOT ==============

@social_router.get("/autopilot/settings")
async def get_autopilot_settings(user: dict = Depends(get_current_user_dep())):
    """Get autopilot settings"""
    db = get_db()
    settings = await db.autopilot_settings.find_one({}, {"_id": 0})
    return settings or {"enabled": False, "platforms": [], "frequency": "daily"}


@social_router.put("/autopilot/settings")
async def update_autopilot_settings(data: dict, user: dict = Depends(get_current_user_dep())):
    """Update autopilot settings"""
    db = get_db()
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    data["updated_by"] = user.get("id")
    
    await db.autopilot_settings.update_one(
        {},
        {"$set": data},
        upsert=True
    )
    return data


# ============== LIBRARY ==============

@social_router.get("/library")
async def get_library(
    media_type: Optional[str] = None,
    user: dict = Depends(get_current_user_dep())
):
    """Get media library"""
    db = get_db()
    query = {}
    if media_type:
        query["media_type"] = media_type
    
    items = await db.media_library.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@social_router.post("/library")
async def add_to_library(data: dict, user: dict = Depends(get_current_user_dep())):
    """Add item to library"""
    db = get_db()
    item_id = str(uuid.uuid4())
    item_doc = {
        "id": item_id,
        **data,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.media_library.insert_one(item_doc)
    if '_id' in item_doc:
        del item_doc['_id']
    return item_doc


@social_router.delete("/library/{item_id}")
async def delete_from_library(item_id: str, user: dict = Depends(get_current_user_dep())):
    """Delete item from library"""
    db = get_db()
    result = await db.media_library.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}


# ============== ANALYTICS ==============

@social_router.get("/analytics")
async def get_social_analytics(
    platform: Optional[str] = None,
    days: int = Query(default=30, le=365),
    user: dict = Depends(get_current_user_dep())
):
    """Get social analytics"""
    db = get_db()
    
    query = {"status": "published"}
    if platform:
        query["platform"] = platform
    
    posts = await db.social_posts.find(query, {"_id": 0}).to_list(1000)
    
    total_posts = len(posts)
    total_likes = sum(p.get("metrics", {}).get("likes", 0) for p in posts)
    total_comments = sum(p.get("metrics", {}).get("comments", 0) for p in posts)
    total_shares = sum(p.get("metrics", {}).get("shares", 0) for p in posts)
    total_views = sum(p.get("metrics", {}).get("views", 0) for p in posts)
    
    engagement_rate = (total_likes + total_comments + total_shares) / total_views * 100 if total_views > 0 else 0
    
    return {
        "total_posts": total_posts,
        "total_likes": total_likes,
        "total_comments": total_comments,
        "total_shares": total_shares,
        "total_views": total_views,
        "engagement_rate": round(engagement_rate, 2)
    }


# ============== AVATAR ==============

@social_router.get("/avatar")
async def get_avatar(user: dict = Depends(get_current_user_dep())):
    """Get user avatar settings"""
    db = get_db()
    avatar = await db.avatars.find_one({"user_id": user.get("id")}, {"_id": 0})
    return avatar or {"user_id": user.get("id"), "avatar_url": None, "style": "default"}


@social_router.put("/avatar")
async def update_avatar(data: dict, user: dict = Depends(get_current_user_dep())):
    """Update user avatar"""
    db = get_db()
    data["user_id"] = user.get("id")
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.avatars.update_one(
        {"user_id": user.get("id")},
        {"$set": data},
        upsert=True
    )
    return data


# ============== AI TOOLS ==============

@social_router.post("/ai/generate-caption")
async def generate_caption(data: dict, user: dict = Depends(get_current_user_dep())):
    """Generate AI caption for post"""
    # Mock response - would integrate with actual AI service
    return {
        "caption": f"✨ {data.get('topic', 'Amazing content')} - Check this out! #trending #viral",
        "hashtags": ["trending", "viral", "content", "social"],
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@social_router.post("/ai/generate-hashtags")
async def generate_hashtags(data: dict, user: dict = Depends(get_current_user_dep())):
    """Generate AI hashtags"""
    topic = data.get("topic", "general")
    return {
        "hashtags": [f"#{topic}", "#trending", "#viral", "#explore", "#fyp"],
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@social_router.post("/ai/analyze-sentiment")
async def analyze_sentiment(data: dict, user: dict = Depends(get_current_user_dep())):
    """Analyze sentiment of text"""
    text = data.get("text", "")
    # Mock sentiment analysis
    return {
        "text": text,
        "sentiment": "positive",
        "score": 0.85,
        "analyzed_at": datetime.now(timezone.utc).isoformat()
    }
