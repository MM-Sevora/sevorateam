"""
Social Media Webhook Receiver - Real-time Engagement Tracking
Receives webhook events from social platforms for:
- Post engagement (likes, comments, shares, saves)
- Follower changes (new followers, unfollows)
- Brand mentions

Structure-ready: Webhook endpoints configured for each platform.
When connected to real APIs, platforms will POST events here.
"""

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import os
import logging
import hashlib
import hmac
import json
import jwt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/social/webhooks", tags=["Social Webhooks"])

# Database reference - will be set by server.py
db = None
security = HTTPBearer(auto_error=False)

def init_router(database):
    """Initialize router with database"""
    global db
    db = database


# ============== MODELS ==============

class WebhookEvent(BaseModel):
    id: str
    platform: str
    event_type: str  # post_like, post_comment, post_share, new_follower, unfollow, mention
    post_id: Optional[str] = None
    platform_post_id: Optional[str] = None
    actor: Optional[Dict[str, Any]] = None  # User who triggered the event
    content: Optional[str] = None  # Comment text, mention text, etc.
    engagement_delta: Optional[Dict[str, int]] = None  # {likes: +1, comments: +1}
    metadata: Optional[Dict[str, Any]] = None
    received_at: str
    processed: bool = False

class EngagementStats(BaseModel):
    post_id: str
    platform: str
    platform_post_id: str
    likes: int = 0
    comments: int = 0
    shares: int = 0
    saves: int = 0
    clicks: int = 0
    impressions: int = 0
    reach: int = 0
    last_updated: str

class WebhookConfig(BaseModel):
    platform: str
    enabled: bool = True
    webhook_url: str
    secret_key: Optional[str] = None
    events_subscribed: List[str] = []
    verified: bool = False
    last_event_at: Optional[str] = None


# ============== WEBHOOK SECRETS (would be env vars in production) ==============

WEBHOOK_SECRETS = {
    "linkedin": os.environ.get("LINKEDIN_WEBHOOK_SECRET", "linkedin_webhook_secret_dev"),
    "twitter": os.environ.get("TWITTER_WEBHOOK_SECRET", "twitter_webhook_secret_dev"),
    "instagram": os.environ.get("INSTAGRAM_WEBHOOK_SECRET", "instagram_webhook_secret_dev"),
    "facebook": os.environ.get("FACEBOOK_WEBHOOK_SECRET", "facebook_webhook_secret_dev"),
    "youtube": os.environ.get("YOUTUBE_WEBHOOK_SECRET", "youtube_webhook_secret_dev"),
}

# Event type mappings per platform
EVENT_TYPES = {
    "linkedin": {
        "LIKE": "post_like",
        "COMMENT": "post_comment",
        "SHARE": "post_share",
        "FOLLOW": "new_follower",
        "MENTION": "mention",
    },
    "twitter": {
        "favorite": "post_like",
        "tweet_create_events": "post_comment",  # reply
        "retweet": "post_share",
        "follow": "new_follower",
        "unfollow": "unfollow",
        "mention": "mention",
    },
    "instagram": {
        "comments": "post_comment",
        "mentions": "mention",
        "story_insights": "story_view",
    },
    "facebook": {
        "feed": "post_engagement",
        "mention": "mention",
        "messages": "message",
    },
    "youtube": {
        "video.liked": "post_like",
        "video.commented": "post_comment",
        "channel.subscribed": "new_follower",
        "channel.unsubscribed": "unfollow",
    },
}


# ============== HELPER FUNCTIONS ==============

def verify_linkedin_signature(request_body: bytes, signature: str) -> bool:
    """Verify LinkedIn webhook signature"""
    secret = WEBHOOK_SECRETS["linkedin"].encode()
    expected = hmac.new(secret, request_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

def verify_twitter_signature(request_body: bytes, signature: str) -> bool:
    """Verify Twitter webhook CRC signature"""
    secret = WEBHOOK_SECRETS["twitter"].encode()
    expected = "sha256=" + hmac.new(secret, request_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

def verify_meta_signature(request_body: bytes, signature: str) -> bool:
    """Verify Instagram/Facebook webhook signature"""
    secret = WEBHOOK_SECRETS["instagram"].encode()
    expected = "sha256=" + hmac.new(secret, request_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

def verify_youtube_signature(request_body: bytes, signature: str) -> bool:
    """Verify YouTube PubSubHubbub signature"""
    secret = WEBHOOK_SECRETS["youtube"].encode()
    expected = hmac.new(secret, request_body, hashlib.sha1).hexdigest()
    return hmac.compare_digest(expected, signature)


async def process_webhook_event(event: dict, platform: str):
    """Process and store webhook event, update engagement stats"""
    if db is None:
        logger.warning("Database not connected, skipping event processing")
        return
    
    event_id = str(uuid.uuid4())
    event_doc = {
        "id": event_id,
        "platform": platform,
        "event_type": event.get("type", "unknown"),
        "post_id": event.get("post_id"),
        "platform_post_id": event.get("platform_post_id"),
        "actor": event.get("actor"),
        "content": event.get("content"),
        "engagement_delta": event.get("engagement_delta"),
        "metadata": event.get("metadata"),
        "raw_payload": event.get("raw_payload"),
        "received_at": datetime.now(timezone.utc).isoformat(),
        "processed": True,
    }
    
    await db.social_webhook_events.insert_one(event_doc)
    
    # Update engagement stats if this is an engagement event
    if event.get("platform_post_id") and event.get("engagement_delta"):
        delta = event["engagement_delta"]
        update_ops = {}
        for key, value in delta.items():
            if value != 0:
                update_ops[f"${key}"] = value if value > 0 else {"$inc": {key: value}}
        
        if update_ops:
            await db.social_engagement_stats.update_one(
                {"platform_post_id": event["platform_post_id"], "platform": platform},
                {
                    "$inc": delta,
                    "$set": {"last_updated": datetime.now(timezone.utc).isoformat()},
                    "$setOnInsert": {
                        "id": str(uuid.uuid4()),
                        "post_id": event.get("post_id"),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
                upsert=True
            )
    
    logger.info(f"Processed {platform} webhook event: {event.get('type', 'unknown')}")
    return event_id


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        secret = os.environ.get('JWT_SECRET', 'sevora-team-secret-2024')
        payload = jwt.decode(credentials.credentials, secret, algorithms=['HS256'])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        if db is None:
            return {"id": user_id, "name": "User"}
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============== WEBHOOK VERIFICATION ENDPOINTS ==============
# These are called by platforms to verify webhook ownership

@router.get("/verify/linkedin")
async def verify_linkedin_webhook(challenge: str = Query(...)):
    """LinkedIn webhook verification (challenge-response)"""
    return {"challenge": challenge}


@router.get("/verify/twitter")
async def verify_twitter_webhook(crc_token: str = Query(...)):
    """Twitter CRC challenge verification"""
    secret = WEBHOOK_SECRETS["twitter"].encode()
    sha256_hash = hmac.new(secret, crc_token.encode(), hashlib.sha256).digest()
    import base64
    response_token = base64.b64encode(sha256_hash).decode()
    return {"response_token": f"sha256={response_token}"}


@router.get("/verify/instagram")
async def verify_instagram_webhook(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_challenge: str = Query(..., alias="hub.challenge"),
    hub_verify_token: str = Query(..., alias="hub.verify_token")
):
    """Instagram/Facebook webhook verification"""
    expected_token = os.environ.get("META_VERIFY_TOKEN", "sevora_webhook_verify")
    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.get("/verify/facebook")
async def verify_facebook_webhook(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_challenge: str = Query(..., alias="hub.challenge"),
    hub_verify_token: str = Query(..., alias="hub.verify_token")
):
    """Facebook webhook verification (same as Instagram)"""
    expected_token = os.environ.get("META_VERIFY_TOKEN", "sevora_webhook_verify")
    if hub_mode == "subscribe" and hub_verify_token == expected_token:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.get("/verify/youtube")
async def verify_youtube_webhook(
    hub_challenge: str = Query(..., alias="hub.challenge")
):
    """YouTube PubSubHubbub verification"""
    return hub_challenge


# ============== WEBHOOK EVENT RECEIVERS ==============
# These receive actual events from platforms

@router.post("/events/linkedin")
async def receive_linkedin_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receive LinkedIn webhook events"""
    body = await request.body()
    signature = request.headers.get("X-LinkedIn-Signature", "")
    
    # In production, verify signature
    # if not verify_linkedin_signature(body, signature):
    #     raise HTTPException(status_code=401, detail="Invalid signature")
    
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    # Process LinkedIn event format
    events = payload if isinstance(payload, list) else [payload]
    processed_ids = []
    
    for event_data in events:
        event_type = EVENT_TYPES["linkedin"].get(event_data.get("type"), "unknown")
        event = {
            "type": event_type,
            "platform_post_id": event_data.get("object", {}).get("id"),
            "actor": {
                "id": event_data.get("actor"),
                "name": event_data.get("actorName"),
            },
            "content": event_data.get("comment", {}).get("text") if event_type == "post_comment" else None,
            "engagement_delta": {
                "likes": 1 if event_type == "post_like" else 0,
                "comments": 1 if event_type == "post_comment" else 0,
                "shares": 1 if event_type == "post_share" else 0,
            },
            "raw_payload": event_data,
        }
        event_id = await process_webhook_event(event, "linkedin")
        if event_id:
            processed_ids.append(event_id)
    
    return {"status": "received", "processed": len(processed_ids), "event_ids": processed_ids}


@router.post("/events/twitter")
async def receive_twitter_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receive Twitter/X webhook events (Account Activity API)"""
    body = await request.body()
    signature = request.headers.get("X-Twitter-Webhooks-Signature", "")
    
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    processed_ids = []
    
    # Process different Twitter event types
    for event_key, event_type in EVENT_TYPES["twitter"].items():
        if event_key in payload:
            events = payload[event_key]
            if not isinstance(events, list):
                events = [events]
            
            for event_data in events:
                event = {
                    "type": event_type,
                    "platform_post_id": event_data.get("id_str") or event_data.get("target", {}).get("id_str"),
                    "actor": {
                        "id": event_data.get("user", {}).get("id_str"),
                        "name": event_data.get("user", {}).get("screen_name"),
                        "display_name": event_data.get("user", {}).get("name"),
                    },
                    "content": event_data.get("text"),
                    "engagement_delta": {
                        "likes": 1 if event_type == "post_like" else 0,
                        "comments": 1 if event_type == "post_comment" else 0,
                        "shares": 1 if event_type == "post_share" else 0,
                    },
                    "raw_payload": event_data,
                }
                event_id = await process_webhook_event(event, "twitter")
                if event_id:
                    processed_ids.append(event_id)
    
    return {"status": "received", "processed": len(processed_ids)}


@router.post("/events/instagram")
async def receive_instagram_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receive Instagram webhook events"""
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    processed_ids = []
    
    # Instagram sends events in entry array
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            field = change.get("field")
            value = change.get("value", {})
            
            event_type = EVENT_TYPES["instagram"].get(field, "unknown")
            event = {
                "type": event_type,
                "platform_post_id": value.get("media_id"),
                "actor": {
                    "id": value.get("from", {}).get("id"),
                    "name": value.get("from", {}).get("username"),
                },
                "content": value.get("text"),
                "engagement_delta": {
                    "comments": 1 if event_type == "post_comment" else 0,
                },
                "metadata": {
                    "ig_id": entry.get("id"),
                    "time": entry.get("time"),
                },
                "raw_payload": change,
            }
            event_id = await process_webhook_event(event, "instagram")
            if event_id:
                processed_ids.append(event_id)
    
    return {"status": "received", "processed": len(processed_ids)}


@router.post("/events/facebook")
async def receive_facebook_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receive Facebook webhook events"""
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    processed_ids = []
    
    # Facebook sends events similar to Instagram
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            field = change.get("field")
            value = change.get("value", {})
            
            event_type = EVENT_TYPES["facebook"].get(field, "unknown")
            event = {
                "type": event_type,
                "platform_post_id": value.get("post_id") or value.get("item_id"),
                "actor": {
                    "id": value.get("from", {}).get("id") or value.get("sender_id"),
                    "name": value.get("from", {}).get("name") or value.get("sender_name"),
                },
                "content": value.get("message") or value.get("text"),
                "engagement_delta": {
                    "likes": 1 if value.get("reaction_type") == "like" else 0,
                    "comments": 1 if field == "feed" and value.get("item") == "comment" else 0,
                    "shares": 1 if field == "feed" and value.get("item") == "share" else 0,
                },
                "metadata": {
                    "page_id": entry.get("id"),
                    "time": entry.get("time"),
                },
                "raw_payload": change,
            }
            event_id = await process_webhook_event(event, "facebook")
            if event_id:
                processed_ids.append(event_id)
    
    return {"status": "received", "processed": len(processed_ids)}


@router.post("/events/youtube")
async def receive_youtube_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receive YouTube PubSubHubbub notifications"""
    body = await request.body()
    
    # YouTube sends XML, but we'll also accept JSON for testing
    content_type = request.headers.get("Content-Type", "")
    
    if "xml" in content_type:
        # Parse XML feed (simplified)
        body_str = body.decode()
        # In production, use proper XML parser
        event = {
            "type": "video_update",
            "platform_post_id": "extracted_from_xml",
            "content": body_str[:500],
            "raw_payload": {"xml": body_str},
        }
    else:
        try:
            payload = json.loads(body)
            event_type = "unknown"
            for yt_type, mapped_type in EVENT_TYPES["youtube"].items():
                if yt_type in str(payload):
                    event_type = mapped_type
                    break
            
            event = {
                "type": event_type,
                "platform_post_id": payload.get("video_id"),
                "actor": {
                    "id": payload.get("channel_id"),
                    "name": payload.get("channel_title"),
                },
                "engagement_delta": {
                    "likes": payload.get("like_count_delta", 0),
                    "comments": payload.get("comment_count_delta", 0),
                },
                "raw_payload": payload,
            }
        except json.JSONDecodeError:
            event = {
                "type": "unknown",
                "raw_payload": {"raw": body.decode()[:1000]},
            }
    
    event_id = await process_webhook_event(event, "youtube")
    return {"status": "received", "event_id": event_id}


# ============== MANAGEMENT & ANALYTICS ENDPOINTS ==============

@router.get("/events")
async def get_webhook_events(
    platform: Optional[str] = None,
    event_type: Optional[str] = None,
    since: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user)
):
    """Get recent webhook events (admin view)"""
    if db is None:
        return {"events": [], "total": 0, "message": "Database not connected"}
    
    query = {}
    if platform:
        query["platform"] = platform
    if event_type:
        query["event_type"] = event_type
    if since:
        query["received_at"] = {"$gte": since}
    
    events = await db.social_webhook_events.find(
        query,
        {"_id": 0, "raw_payload": 0}  # Exclude raw payload for performance
    ).sort("received_at", -1).limit(limit).to_list(limit)
    
    total = await db.social_webhook_events.count_documents(query)
    
    return {"events": events, "total": total}


@router.get("/engagement/summary")
async def get_engagement_summary(
    platform: Optional[str] = None,
    period: str = "7d",
    user: dict = Depends(get_current_user)
):
    """Get aggregated engagement summary"""
    if db is None:
        # Return mock data for structure-ready mode
        return {
            "period": period,
            "total_events": 0,
            "by_type": {
                "post_like": 0,
                "post_comment": 0,
                "post_share": 0,
                "new_follower": 0,
                "mention": 0
            },
            "by_platform": {},
            "trending_posts": [],
            "message": "Structure-ready mode - connect webhooks to see real data"
        }
    
    # Calculate date range
    days = int(period.replace("d", ""))
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Build query
    match_query = {"received_at": {"$gte": start_date}}
    if platform:
        match_query["platform"] = platform
    
    # Aggregate by event type
    type_pipeline = [
        {"$match": match_query},
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}}
    ]
    type_results = await db.social_webhook_events.aggregate(type_pipeline).to_list(20)
    by_type = {item["_id"]: item["count"] for item in type_results}
    
    # Aggregate by platform
    platform_pipeline = [
        {"$match": match_query},
        {"$group": {"_id": "$platform", "count": {"$sum": 1}}}
    ]
    platform_results = await db.social_webhook_events.aggregate(platform_pipeline).to_list(10)
    by_platform = {item["_id"]: item["count"] for item in platform_results}
    
    # Get top engaged posts
    top_posts_pipeline = [
        {"$match": match_query},
        {"$group": {
            "_id": "$platform_post_id",
            "platform": {"$first": "$platform"},
            "total_engagement": {"$sum": 1}
        }},
        {"$sort": {"total_engagement": -1}},
        {"$limit": 5}
    ]
    trending = await db.social_webhook_events.aggregate(top_posts_pipeline).to_list(5)
    
    total_events = await db.social_webhook_events.count_documents(match_query)
    
    return {
        "period": period,
        "total_events": total_events,
        "by_type": by_type,
        "by_platform": by_platform,
        "trending_posts": trending,
    }


@router.get("/engagement/{platform_post_id}")
async def get_post_engagement(
    platform_post_id: str,
    user: dict = Depends(get_current_user)
):
    """Get engagement stats for a specific post"""
    if db is None:
        return {"error": "Database not connected"}
    
    stats = await db.social_engagement_stats.find_one(
        {"platform_post_id": platform_post_id},
        {"_id": 0}
    )
    
    if not stats:
        return {
            "platform_post_id": platform_post_id,
            "likes": 0,
            "comments": 0,
            "shares": 0,
            "saves": 0,
            "message": "No engagement data yet"
        }
    
    return stats


@router.get("/config")
async def get_webhook_configs(user: dict = Depends(get_current_user)):
    """Get webhook configuration for all platforms"""
    base_url = os.environ.get("BACKEND_URL", os.environ.get("FRONTEND_URL", "https://your-domain.com"))
    
    configs = []
    for platform in ["linkedin", "twitter", "instagram", "facebook", "youtube"]:
        configs.append({
            "platform": platform,
            "verify_url": f"{base_url}/api/social/webhooks/verify/{platform}",
            "events_url": f"{base_url}/api/social/webhooks/events/{platform}",
            "events_subscribed": list(EVENT_TYPES.get(platform, {}).values()),
            "setup_instructions": get_setup_instructions(platform, base_url),
        })
    
    return {"configs": configs}


def get_setup_instructions(platform: str, base_url: str) -> dict:
    """Get platform-specific webhook setup instructions"""
    instructions = {
        "linkedin": {
            "steps": [
                "1. Go to LinkedIn Developer Portal",
                "2. Select your app → Webhooks",
                "3. Add webhook URL: {events_url}",
                "4. Subscribe to: SHARE, COMMENT, LIKE events",
                "5. Copy the webhook secret to your environment",
            ],
            "docs_url": "https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-api",
        },
        "twitter": {
            "steps": [
                "1. Go to Twitter Developer Portal",
                "2. Navigate to your app → Dev Environments",
                "3. Set up Account Activity API environment",
                "4. Register webhook URL: {events_url}",
                "5. Subscribe your app user to receive events",
            ],
            "docs_url": "https://developer.twitter.com/en/docs/twitter-api/enterprise/account-activity-api",
        },
        "instagram": {
            "steps": [
                "1. Go to Meta for Developers",
                "2. Select your app → Webhooks",
                "3. Add Instagram product webhook",
                "4. Callback URL: {events_url}",
                "5. Verify Token: sevora_webhook_verify",
                "6. Subscribe to: comments, mentions",
            ],
            "docs_url": "https://developers.facebook.com/docs/instagram-api/webhooks",
        },
        "facebook": {
            "steps": [
                "1. Go to Meta for Developers",
                "2. Select your app → Webhooks",
                "3. Add Page product webhook",
                "4. Callback URL: {events_url}",
                "5. Verify Token: sevora_webhook_verify",
                "6. Subscribe to: feed, mention",
            ],
            "docs_url": "https://developers.facebook.com/docs/graph-api/webhooks",
        },
        "youtube": {
            "steps": [
                "1. Go to Google Cloud Console",
                "2. Enable YouTube Data API",
                "3. Set up PubSubHubbub subscription",
                "4. Callback URL: {events_url}",
                "5. Subscribe to channel updates",
            ],
            "docs_url": "https://developers.google.com/youtube/v3/guides/push_notifications",
        },
    }
    
    platform_info = instructions.get(platform, {"steps": [], "docs_url": ""})
    platform_info["events_url"] = f"{base_url}/api/social/webhooks/events/{platform}"
    platform_info["verify_url"] = f"{base_url}/api/social/webhooks/verify/{platform}"
    
    return platform_info


@router.post("/test/{platform}")
async def simulate_webhook_event(
    platform: str,
    event_type: str = "post_like",
    user: dict = Depends(get_current_user)
):
    """Simulate a webhook event for testing"""
    if platform not in EVENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")
    
    # Create simulated event
    test_event = {
        "type": event_type,
        "platform_post_id": f"test_post_{uuid.uuid4().hex[:8]}",
        "actor": {
            "id": f"test_user_{uuid.uuid4().hex[:6]}",
            "name": "Test User",
        },
        "content": f"Simulated {event_type} event for testing" if event_type in ["post_comment", "mention"] else None,
        "engagement_delta": {
            "likes": 1 if event_type == "post_like" else 0,
            "comments": 1 if event_type == "post_comment" else 0,
            "shares": 1 if event_type == "post_share" else 0,
        },
        "metadata": {"simulated": True, "triggered_by": user["id"]},
    }
    
    event_id = await process_webhook_event(test_event, platform)
    
    return {
        "success": True,
        "message": f"Simulated {event_type} event for {platform}",
        "event_id": event_id,
        "event": test_event,
    }
