"""
Social Inbox & Engagement Module - Phase 2
- Unified Inbox (Comments, DMs, Mentions)
- Mention Tracking
- Auto-Replies (Rule-based + AI)
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from enum import Enum
import uuid
import logging

logger = logging.getLogger(__name__)

social_inbox_router = APIRouter(prefix="/social/inbox", tags=["Social Inbox"])

# Will be set by main server
db = None
get_current_user = None

def init_social_inbox_router(database, auth_func):
    global db, get_current_user
    db = database
    get_current_user = auth_func
    return social_inbox_router


# ============== ENUMS ==============

class MessageType(str, Enum):
    COMMENT = "comment"
    DM = "direct_message"
    MENTION = "mention"
    REPLY = "reply"
    REVIEW = "review"

class MessageStatus(str, Enum):
    UNREAD = "unread"
    READ = "read"
    REPLIED = "replied"
    ARCHIVED = "archived"
    SPAM = "spam"

class Sentiment(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    UNKNOWN = "unknown"

class Platform(str, Enum):
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    YOUTUBE = "youtube"


# ============== MODELS ==============

class InboxItemCreate(BaseModel):
    platform: Platform
    message_type: MessageType
    author_name: str
    author_handle: Optional[str] = None
    author_avatar: Optional[str] = None
    content: str
    post_id: Optional[str] = None  # Related post if it's a comment
    post_content: Optional[str] = None  # Snippet of the related post
    external_id: Optional[str] = None  # ID from the social platform
    sentiment: Sentiment = Sentiment.UNKNOWN

class InboxItemResponse(BaseModel):
    item_id: str
    platform: str
    message_type: str
    author_name: str
    author_handle: Optional[str]
    author_avatar: Optional[str]
    content: str
    post_id: Optional[str]
    post_content: Optional[str]
    external_id: Optional[str]
    sentiment: str
    status: str
    replied_at: Optional[str]
    reply_content: Optional[str]
    created_at: str
    updated_at: str

class ReplyCreate(BaseModel):
    content: str
    auto_generated: bool = False


# ============== INBOX ENDPOINTS ==============

@social_inbox_router.get("/items")
async def get_inbox_items(
    platform: Optional[str] = None,
    message_type: Optional[str] = None,
    status: Optional[str] = None,
    sentiment: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(lambda: get_current_user)
):
    """Get all inbox items with optional filters"""
    query = {}
    
    if platform:
        query["platform"] = platform
    if message_type:
        query["message_type"] = message_type
    if status:
        query["status"] = status
    if sentiment:
        query["sentiment"] = sentiment
    if search:
        query["$or"] = [
            {"content": {"$regex": search, "$options": "i"}},
            {"author_name": {"$regex": search, "$options": "i"}},
            {"author_handle": {"$regex": search, "$options": "i"}}
        ]
    
    items = await db.social_inbox.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.social_inbox.count_documents(query)
    
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@social_inbox_router.get("/items/{item_id}")
async def get_inbox_item(item_id: str, user: dict = Depends(lambda: get_current_user)):
    """Get a specific inbox item"""
    item = await db.social_inbox.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@social_inbox_router.post("/items")
async def create_inbox_item(data: InboxItemCreate, user: dict = Depends(lambda: get_current_user)):
    """Create a new inbox item (for webhook ingestion or manual creation)"""
    item_id = str(uuid.uuid4())
    
    item_doc = {
        "item_id": item_id,
        "platform": data.platform.value,
        "message_type": data.message_type.value,
        "author_name": data.author_name,
        "author_handle": data.author_handle,
        "author_avatar": data.author_avatar,
        "content": data.content,
        "post_id": data.post_id,
        "post_content": data.post_content,
        "external_id": data.external_id,
        "sentiment": data.sentiment.value,
        "status": MessageStatus.UNREAD.value,
        "replied_at": None,
        "reply_content": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.social_inbox.insert_one(item_doc)
    del item_doc["_id"]
    return item_doc


@social_inbox_router.put("/items/{item_id}/status")
async def update_item_status(item_id: str, status: str, user: dict = Depends(lambda: get_current_user)):
    """Update the status of an inbox item"""
    valid_statuses = [s.value for s in MessageStatus]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.social_inbox.update_one(
        {"item_id": item_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Status updated", "item_id": item_id, "status": status}


@social_inbox_router.post("/items/{item_id}/reply")
async def reply_to_item(item_id: str, data: ReplyCreate, user: dict = Depends(lambda: get_current_user)):
    """Reply to an inbox item"""
    item = await db.social_inbox.find_one({"item_id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Store the reply
    reply_doc = {
        "reply_id": str(uuid.uuid4()),
        "item_id": item_id,
        "content": data.content,
        "auto_generated": data.auto_generated,
        "created_by": user.get("id") if isinstance(user, dict) else "system",
        "created_at": datetime.now(timezone.utc).isoformat(),
        # In production, this would trigger actual API call to social platform
        "sent_to_platform": False,  # Will be True when real integration exists
        "platform_response": None
    }
    
    await db.social_inbox_replies.insert_one(reply_doc)
    
    # Update the inbox item
    await db.social_inbox.update_one(
        {"item_id": item_id},
        {"$set": {
            "status": MessageStatus.REPLIED.value,
            "replied_at": datetime.now(timezone.utc).isoformat(),
            "reply_content": data.content,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    del reply_doc["_id"]
    return reply_doc


@social_inbox_router.delete("/items/{item_id}")
async def delete_inbox_item(item_id: str, user: dict = Depends(lambda: get_current_user)):
    """Delete an inbox item"""
    result = await db.social_inbox.delete_one({"item_id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted", "item_id": item_id}


class BulkActionRequest(BaseModel):
    item_ids: List[str]
    action: str

@social_inbox_router.post("/items/bulk-action")
async def bulk_action(
    data: BulkActionRequest,
    user: dict = Depends(lambda: get_current_user)
):
    """Perform bulk actions on inbox items"""
    valid_actions = ["mark_read", "mark_unread", "archive", "delete", "mark_spam"]
    if data.action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of: {valid_actions}")
    
    item_ids = data.item_ids
    action = data.action
    
    if action == "delete":
        result = await db.social_inbox.delete_many({"item_id": {"$in": item_ids}})
        return {"message": f"Deleted {result.deleted_count} items"}
    
    status_map = {
        "mark_read": MessageStatus.READ.value,
        "mark_unread": MessageStatus.UNREAD.value,
        "archive": MessageStatus.ARCHIVED.value,
        "mark_spam": MessageStatus.SPAM.value
    }
    
    result = await db.social_inbox.update_many(
        {"item_id": {"$in": item_ids}},
        {"$set": {"status": status_map[action], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Updated {result.modified_count} items", "action": action}


@social_inbox_router.get("/stats")
async def get_inbox_stats(user: dict = Depends(lambda: get_current_user)):
    """Get inbox statistics"""
    pipeline = [
        {
            "$group": {
                "_id": None,
                "total": {"$sum": 1},
                "unread": {"$sum": {"$cond": [{"$eq": ["$status", "unread"]}, 1, 0]}},
                "replied": {"$sum": {"$cond": [{"$eq": ["$status", "replied"]}, 1, 0]}},
                "archived": {"$sum": {"$cond": [{"$eq": ["$status", "archived"]}, 1, 0]}}
            }
        }
    ]
    
    result = await db.social_inbox.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {"total": 0, "unread": 0, "replied": 0, "archived": 0}
    if "_id" in stats:
        del stats["_id"]
    
    # Platform breakdown
    platform_pipeline = [
        {"$group": {"_id": "$platform", "count": {"$sum": 1}}}
    ]
    platform_result = await db.social_inbox.aggregate(platform_pipeline).to_list(10)
    stats["by_platform"] = {p["_id"]: p["count"] for p in platform_result}
    
    # Message type breakdown
    type_pipeline = [
        {"$group": {"_id": "$message_type", "count": {"$sum": 1}}}
    ]
    type_result = await db.social_inbox.aggregate(type_pipeline).to_list(10)
    stats["by_type"] = {t["_id"]: t["count"] for t in type_result}
    
    # Sentiment breakdown
    sentiment_pipeline = [
        {"$group": {"_id": "$sentiment", "count": {"$sum": 1}}}
    ]
    sentiment_result = await db.social_inbox.aggregate(sentiment_pipeline).to_list(10)
    stats["by_sentiment"] = {s["_id"]: s["count"] for s in sentiment_result}
    
    return stats


# ============== MENTION TRACKING ENDPOINTS ==============

@social_inbox_router.get("/mentions")
async def get_mentions(
    platform: Optional[str] = None,
    sentiment: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(lambda: get_current_user)
):
    """Get all brand mentions"""
    query = {"message_type": MessageType.MENTION.value}
    
    if platform:
        query["platform"] = platform
    if sentiment:
        query["sentiment"] = sentiment
    
    mentions = await db.social_inbox.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.social_inbox.count_documents(query)
    
    return {
        "mentions": mentions,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@social_inbox_router.get("/mentions/stats")
async def get_mention_stats(user: dict = Depends(lambda: get_current_user)):
    """Get mention statistics with sentiment breakdown"""
    pipeline = [
        {"$match": {"message_type": MessageType.MENTION.value}},
        {
            "$group": {
                "_id": None,
                "total": {"$sum": 1},
                "positive": {"$sum": {"$cond": [{"$eq": ["$sentiment", "positive"]}, 1, 0]}},
                "neutral": {"$sum": {"$cond": [{"$eq": ["$sentiment", "neutral"]}, 1, 0]}},
                "negative": {"$sum": {"$cond": [{"$eq": ["$sentiment", "negative"]}, 1, 0]}}
            }
        }
    ]
    
    result = await db.social_inbox.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {"total": 0, "positive": 0, "neutral": 0, "negative": 0}
    if "_id" in stats:
        del stats["_id"]
    
    return stats


# ============== SEED DEMO DATA ==============

@social_inbox_router.post("/seed-demo")
async def seed_demo_data(user: dict = Depends(lambda: get_current_user)):
    """Seed demo inbox data for testing"""
    demo_items = [
        # Comments
        {
            "platform": "linkedin",
            "message_type": "comment",
            "author_name": "Sarah Johnson",
            "author_handle": "sarah-johnson-pm",
            "content": "Great insights on product management! Would love to hear more about your approach to user research.",
            "post_content": "5 tips for effective product launches...",
            "sentiment": "positive"
        },
        {
            "platform": "twitter",
            "message_type": "comment",
            "author_name": "TechEnthusiast",
            "author_handle": "@tech_mike",
            "content": "This is exactly what we needed. Been waiting for someone to address this topic!",
            "sentiment": "positive"
        },
        {
            "platform": "instagram",
            "message_type": "comment",
            "author_name": "Design Daily",
            "author_handle": "@designdaily",
            "content": "Love the visual style! What tools do you use?",
            "sentiment": "positive"
        },
        # DMs
        {
            "platform": "linkedin",
            "message_type": "direct_message",
            "author_name": "Mark Chen",
            "author_handle": "mark-chen-cto",
            "content": "Hi! I saw your post about scaling teams. We're facing similar challenges. Would you be open to a quick call?",
            "sentiment": "neutral"
        },
        {
            "platform": "instagram",
            "message_type": "direct_message",
            "author_name": "Brand Collab",
            "author_handle": "@brandcollab",
            "content": "Hey! We'd love to discuss a potential partnership. Are you open to collaborations?",
            "sentiment": "neutral"
        },
        # Mentions
        {
            "platform": "twitter",
            "message_type": "mention",
            "author_name": "Industry News",
            "author_handle": "@industrynews",
            "content": "Great example of innovation from @sevora - their new approach to team management is worth watching.",
            "sentiment": "positive"
        },
        {
            "platform": "linkedin",
            "message_type": "mention",
            "author_name": "Business Weekly",
            "author_handle": "business-weekly",
            "content": "Sevora's recent launch demonstrates how startups can scale effectively while maintaining culture.",
            "sentiment": "positive"
        },
        {
            "platform": "twitter",
            "message_type": "mention",
            "author_name": "Frustrated User",
            "author_handle": "@user_complaints",
            "content": "@sevora your support response time is too slow. Been waiting 3 days for a reply.",
            "sentiment": "negative"
        },
        # Reviews
        {
            "platform": "facebook",
            "message_type": "review",
            "author_name": "Alex Rivera",
            "content": "Excellent platform! Has really streamlined our workflow. 5 stars!",
            "sentiment": "positive"
        },
        {
            "platform": "facebook",
            "message_type": "review",
            "author_name": "Corporate Solutions",
            "content": "Good product but the pricing could be more competitive for enterprise clients.",
            "sentiment": "neutral"
        }
    ]
    
    created_count = 0
    for item_data in demo_items:
        item_doc = {
            "item_id": str(uuid.uuid4()),
            "platform": item_data["platform"],
            "message_type": item_data["message_type"],
            "author_name": item_data["author_name"],
            "author_handle": item_data.get("author_handle"),
            "author_avatar": None,
            "content": item_data["content"],
            "post_id": None,
            "post_content": item_data.get("post_content"),
            "external_id": f"ext-{uuid.uuid4().hex[:8]}",
            "sentiment": item_data.get("sentiment", "unknown"),
            "status": MessageStatus.UNREAD.value,
            "replied_at": None,
            "reply_content": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.social_inbox.insert_one(item_doc)
        created_count += 1
    
    return {"message": f"Created {created_count} demo inbox items", "count": created_count}
