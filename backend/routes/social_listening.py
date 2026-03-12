"""
Social Listening Module - Phase 4
- Keyword Monitoring
- Alerts & Notifications
- Summary Reports
"""

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import logging

# Import Pulse integration service
from services.pulse_integrations import on_brand_mention_spike, on_competitor_activity

logger = logging.getLogger(__name__)

social_listening_router = APIRouter(prefix="/social/listening", tags=["Social Listening"])

# Will be set by main server
db = None
get_current_user = None

def init_social_listening_router(database, auth_func):
    global db, get_current_user
    db = database
    get_current_user = auth_func
    return social_listening_router


# ============== ENUMS ==============

class KeywordStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"

class AlertType(str, Enum):
    KEYWORD_MENTION = "keyword_mention"
    SENTIMENT_SPIKE = "sentiment_spike"
    VOLUME_SPIKE = "volume_spike"
    NEGATIVE_MENTION = "negative_mention"

class AlertPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class ReportFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


# ============== MODELS ==============

class KeywordCreate(BaseModel):
    keyword: str
    description: Optional[str] = None
    platforms: List[str] = []  # Empty = all platforms
    alert_on_mention: bool = True
    alert_on_negative: bool = True
    track_sentiment: bool = True
    tags: List[str] = []

class AlertConfigCreate(BaseModel):
    name: str
    alert_type: AlertType
    keywords: List[str] = []  # Keyword IDs to monitor
    threshold: Optional[int] = None  # For volume/sentiment spikes
    notify_email: bool = True
    notify_in_app: bool = True
    priority: AlertPriority = AlertPriority.MEDIUM

class ReportConfigCreate(BaseModel):
    name: str
    frequency: ReportFrequency
    keywords: List[str] = []  # Keyword IDs to include
    include_sentiment: bool = True
    include_volume: bool = True
    include_top_mentions: bool = True
    recipients: List[str] = []  # Email addresses


# ============== KEYWORD MANAGEMENT ==============

@social_listening_router.get("/keywords")
async def get_keywords(
    status: Optional[str] = None,
    user: dict = Depends(lambda: get_current_user)
):
    """Get all tracked keywords"""
    query = {}
    if status:
        query["status"] = status
    
    keywords = await db.listening_keywords.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return keywords


@social_listening_router.get("/keywords/{keyword_id}")
async def get_keyword(keyword_id: str, user: dict = Depends(lambda: get_current_user)):
    """Get a specific keyword with stats"""
    keyword = await db.listening_keywords.find_one({"keyword_id": keyword_id}, {"_id": 0})
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    # Get mention stats (would come from real API in production)
    mentions = await db.listening_mentions.count_documents({"keyword_id": keyword_id})
    keyword["stats"] = {
        "total_mentions": mentions,
        "mentions_24h": await db.listening_mentions.count_documents({
            "keyword_id": keyword_id,
            "detected_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()}
        }),
        "mentions_7d": await db.listening_mentions.count_documents({
            "keyword_id": keyword_id,
            "detected_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}
        }),
    }
    
    return keyword


@social_listening_router.post("/keywords")
async def create_keyword(data: KeywordCreate, user: dict = Depends(lambda: get_current_user)):
    """Create a new keyword to track"""
    keyword_id = str(uuid.uuid4())
    
    # Check if keyword already exists
    existing = await db.listening_keywords.find_one({"keyword": data.keyword.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Keyword already being tracked")
    
    keyword_doc = {
        "keyword_id": keyword_id,
        "keyword": data.keyword.lower(),
        "display_name": data.keyword,
        "description": data.description,
        "platforms": data.platforms,
        "alert_on_mention": data.alert_on_mention,
        "alert_on_negative": data.alert_on_negative,
        "track_sentiment": data.track_sentiment,
        "tags": data.tags,
        "status": KeywordStatus.ACTIVE.value,
        "stats": {
            "total_mentions": 0,
            "positive_mentions": 0,
            "negative_mentions": 0,
            "neutral_mentions": 0,
        },
        "created_by": user.get("id") if isinstance(user, dict) else "system",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.listening_keywords.insert_one(keyword_doc)
    del keyword_doc["_id"]
    return keyword_doc


@social_listening_router.put("/keywords/{keyword_id}")
async def update_keyword(keyword_id: str, data: dict, user: dict = Depends(lambda: get_current_user)):
    """Update a tracked keyword"""
    existing = await db.listening_keywords.find_one({"keyword_id": keyword_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    update_data = {k: v for k, v in data.items() if k not in ["keyword_id", "_id", "created_at", "created_by"]}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.listening_keywords.update_one({"keyword_id": keyword_id}, {"$set": update_data})
    
    updated = await db.listening_keywords.find_one({"keyword_id": keyword_id}, {"_id": 0})
    return updated


@social_listening_router.delete("/keywords/{keyword_id}")
async def delete_keyword(keyword_id: str, user: dict = Depends(lambda: get_current_user)):
    """Delete a tracked keyword"""
    result = await db.listening_keywords.delete_one({"keyword_id": keyword_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    # Also delete related mentions
    await db.listening_mentions.delete_many({"keyword_id": keyword_id})
    
    return {"message": "Keyword deleted", "keyword_id": keyword_id}


@social_listening_router.put("/keywords/{keyword_id}/toggle")
async def toggle_keyword(keyword_id: str, user: dict = Depends(lambda: get_current_user)):
    """Toggle keyword active/paused status"""
    keyword = await db.listening_keywords.find_one({"keyword_id": keyword_id})
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")
    
    new_status = KeywordStatus.PAUSED.value if keyword["status"] == KeywordStatus.ACTIVE.value else KeywordStatus.ACTIVE.value
    
    await db.listening_keywords.update_one(
        {"keyword_id": keyword_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Status toggled", "keyword_id": keyword_id, "status": new_status}


# ============== MENTIONS ==============

@social_listening_router.get("/mentions")
async def get_mentions(
    keyword_id: Optional[str] = None,
    platform: Optional[str] = None,
    sentiment: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(lambda: get_current_user)
):
    """Get keyword mentions"""
    query = {}
    if keyword_id:
        query["keyword_id"] = keyword_id
    if platform:
        query["platform"] = platform
    if sentiment:
        query["sentiment"] = sentiment
    
    mentions = await db.listening_mentions.find(query, {"_id": 0}).sort("detected_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.listening_mentions.count_documents(query)
    
    return {
        "mentions": mentions,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@social_listening_router.post("/mentions")
async def create_mention(data: dict, user: dict = Depends(lambda: get_current_user)):
    """
    Create a mention (for webhook ingestion from real APIs)
    In production, this would be called by platform webhooks
    """
    mention_id = str(uuid.uuid4())
    
    mention_doc = {
        "mention_id": mention_id,
        "keyword_id": data.get("keyword_id"),
        "keyword": data.get("keyword"),
        "platform": data.get("platform", "unknown"),
        "content": data.get("content", ""),
        "author": data.get("author", {}),
        "url": data.get("url"),
        "sentiment": data.get("sentiment", "neutral"),
        "reach": data.get("reach", 0),
        "engagement": data.get("engagement", 0),
        "detected_at": datetime.now(timezone.utc).isoformat(),
        "processed": False
    }
    
    await db.listening_mentions.insert_one(mention_doc)
    
    # Update keyword stats
    if data.get("keyword_id"):
        sentiment_field = f"stats.{data.get('sentiment', 'neutral')}_mentions"
        await db.listening_keywords.update_one(
            {"keyword_id": data["keyword_id"]},
            {
                "$inc": {"stats.total_mentions": 1, sentiment_field: 1},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
    
    del mention_doc["_id"]
    return mention_doc


# ============== ALERTS ==============

@social_listening_router.get("/alerts")
async def get_alerts(
    read: Optional[bool] = None,
    priority: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(lambda: get_current_user)
):
    """Get alerts"""
    query = {}
    if read is not None:
        query["read"] = read
    if priority:
        query["priority"] = priority
    
    alerts = await db.listening_alerts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.listening_alerts.count_documents(query)
    unread = await db.listening_alerts.count_documents({"read": False})
    
    return {
        "alerts": alerts,
        "total": total,
        "unread": unread,
        "skip": skip,
        "limit": limit
    }


@social_listening_router.post("/alerts")
async def create_alert(data: dict, user: dict = Depends(lambda: get_current_user)):
    """Create an alert (usually triggered automatically)"""
    alert_id = str(uuid.uuid4())
    alert_type = data.get("type", AlertType.KEYWORD_MENTION.value)
    priority = data.get("priority", AlertPriority.MEDIUM.value)
    
    alert_doc = {
        "alert_id": alert_id,
        "type": alert_type,
        "title": data.get("title", "New Alert"),
        "message": data.get("message", ""),
        "keyword_id": data.get("keyword_id"),
        "mention_id": data.get("mention_id"),
        "priority": priority,
        "read": False,
        "actioned": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.listening_alerts.insert_one(alert_doc)
    del alert_doc["_id"]
    
    # PULSE INTEGRATION: Auto-post for significant alerts
    if priority in ["high", "urgent"]:
        try:
            if alert_type in [AlertType.SENTIMENT_SPIKE.value, AlertType.VOLUME_SPIKE.value]:
                await on_brand_mention_spike(
                    alert=alert_doc,
                    mention_count=data.get("count", 0),
                    sentiment=data.get("sentiment", "mixed")
                )
            elif alert_type == "competitor_activity":
                await on_competitor_activity(
                    competitor=data.get("competitor", "Competitor"),
                    activity=data.get("activity_description", "significant activity"),
                    detected_by="Social Listening"
                )
        except Exception as e:
            logger.error(f"Pulse integration error (listening_alert): {e}")
    
    return alert_doc


@social_listening_router.put("/alerts/{alert_id}/read")
async def mark_alert_read(alert_id: str, user: dict = Depends(lambda: get_current_user)):
    """Mark an alert as read"""
    result = await db.listening_alerts.update_one(
        {"alert_id": alert_id},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert marked as read", "alert_id": alert_id}


@social_listening_router.post("/alerts/mark-all-read")
async def mark_all_alerts_read(user: dict = Depends(lambda: get_current_user)):
    """Mark all alerts as read"""
    result = await db.listening_alerts.update_many(
        {"read": False},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Marked {result.modified_count} alerts as read"}


@social_listening_router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str, user: dict = Depends(lambda: get_current_user)):
    """Delete an alert"""
    result = await db.listening_alerts.delete_one({"alert_id": alert_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted", "alert_id": alert_id}


# ============== ALERT CONFIGURATIONS ==============

@social_listening_router.get("/alert-configs")
async def get_alert_configs(user: dict = Depends(lambda: get_current_user)):
    """Get alert configurations"""
    configs = await db.listening_alert_configs.find({}, {"_id": 0}).to_list(50)
    return configs


@social_listening_router.post("/alert-configs")
async def create_alert_config(data: AlertConfigCreate, user: dict = Depends(lambda: get_current_user)):
    """Create an alert configuration"""
    config_id = str(uuid.uuid4())
    
    config_doc = {
        "config_id": config_id,
        "name": data.name,
        "alert_type": data.alert_type.value,
        "keywords": data.keywords,
        "threshold": data.threshold,
        "notify_email": data.notify_email,
        "notify_in_app": data.notify_in_app,
        "priority": data.priority.value,
        "is_active": True,
        "created_by": user.get("id") if isinstance(user, dict) else "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.listening_alert_configs.insert_one(config_doc)
    del config_doc["_id"]
    return config_doc


@social_listening_router.delete("/alert-configs/{config_id}")
async def delete_alert_config(config_id: str, user: dict = Depends(lambda: get_current_user)):
    """Delete an alert configuration"""
    result = await db.listening_alert_configs.delete_one({"config_id": config_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Config not found")
    return {"message": "Config deleted", "config_id": config_id}


# ============== REPORTS ==============

@social_listening_router.get("/reports")
async def get_reports(user: dict = Depends(lambda: get_current_user)):
    """Get generated reports"""
    reports = await db.listening_reports.find({}, {"_id": 0}).sort("generated_at", -1).limit(50).to_list(50)
    return reports


@social_listening_router.get("/report-configs")
async def get_report_configs(user: dict = Depends(lambda: get_current_user)):
    """Get report configurations"""
    configs = await db.listening_report_configs.find({}, {"_id": 0}).to_list(50)
    return configs


@social_listening_router.post("/report-configs")
async def create_report_config(data: ReportConfigCreate, user: dict = Depends(lambda: get_current_user)):
    """Create a report configuration"""
    config_id = str(uuid.uuid4())
    
    config_doc = {
        "config_id": config_id,
        "name": data.name,
        "frequency": data.frequency.value,
        "keywords": data.keywords,
        "include_sentiment": data.include_sentiment,
        "include_volume": data.include_volume,
        "include_top_mentions": data.include_top_mentions,
        "recipients": data.recipients,
        "is_active": True,
        "last_run": None,
        "next_run": None,
        "created_by": user.get("id") if isinstance(user, dict) else "system",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.listening_report_configs.insert_one(config_doc)
    del config_doc["_id"]
    return config_doc


@social_listening_router.post("/reports/generate")
async def generate_report(
    keyword_ids: List[str] = [],
    period: str = "7d",
    user: dict = Depends(lambda: get_current_user)
):
    """Generate an on-demand report"""
    report_id = str(uuid.uuid4())
    # Parse period for potential future use
    _ = int(period.replace("d", "")) if "d" in period else 7
    
    # Gather data for report
    query = {}
    if keyword_ids:
        query["keyword_id"] = {"$in": keyword_ids}
    
    total_mentions = await db.listening_mentions.count_documents(query)
    
    # Get sentiment breakdown
    sentiment_pipeline = [
        {"$match": query} if query else {"$match": {}},
        {"$group": {"_id": "$sentiment", "count": {"$sum": 1}}}
    ]
    sentiment_results = await db.listening_mentions.aggregate(sentiment_pipeline).to_list(10)
    sentiment_breakdown = {s["_id"]: s["count"] for s in sentiment_results if s["_id"]}
    
    # Get platform breakdown
    platform_pipeline = [
        {"$match": query} if query else {"$match": {}},
        {"$group": {"_id": "$platform", "count": {"$sum": 1}}}
    ]
    platform_results = await db.listening_mentions.aggregate(platform_pipeline).to_list(10)
    platform_breakdown = {p["_id"]: p["count"] for p in platform_results if p["_id"]}
    
    # Get top mentions
    top_mentions = await db.listening_mentions.find(
        query,
        {"_id": 0, "mention_id": 1, "content": 1, "platform": 1, "sentiment": 1, "engagement": 1}
    ).sort("engagement", -1).limit(10).to_list(10)
    
    report_doc = {
        "report_id": report_id,
        "period": period,
        "keyword_ids": keyword_ids,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_by": user.get("id") if isinstance(user, dict) else "system",
        "data": {
            "total_mentions": total_mentions,
            "sentiment_breakdown": sentiment_breakdown,
            "platform_breakdown": platform_breakdown,
            "top_mentions": top_mentions,
        },
        "summary": {
            "total_mentions": total_mentions,
            "positive_ratio": round(sentiment_breakdown.get("positive", 0) / max(total_mentions, 1) * 100, 1),
            "negative_ratio": round(sentiment_breakdown.get("negative", 0) / max(total_mentions, 1) * 100, 1),
            "most_active_platform": max(platform_breakdown, key=platform_breakdown.get) if platform_breakdown else None,
        }
    }
    
    await db.listening_reports.insert_one(report_doc)
    del report_doc["_id"]
    return report_doc


# ============== DASHBOARD STATS ==============

@social_listening_router.get("/dashboard")
async def get_listening_dashboard(user: dict = Depends(lambda: get_current_user)):
    """Get listening dashboard overview"""
    # Get keyword stats
    total_keywords = await db.listening_keywords.count_documents({})
    active_keywords = await db.listening_keywords.count_documents({"status": "active"})
    
    # Get mention stats
    total_mentions = await db.listening_mentions.count_documents({})
    mentions_24h = await db.listening_mentions.count_documents({
        "detected_at": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()}
    })
    mentions_7d = await db.listening_mentions.count_documents({
        "detected_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}
    })
    
    # Get alert stats
    unread_alerts = await db.listening_alerts.count_documents({"read": False})
    urgent_alerts = await db.listening_alerts.count_documents({"read": False, "priority": "urgent"})
    
    # Get sentiment breakdown
    sentiment_pipeline = [
        {"$group": {"_id": "$sentiment", "count": {"$sum": 1}}}
    ]
    sentiment_results = await db.listening_mentions.aggregate(sentiment_pipeline).to_list(10)
    sentiment_breakdown = {s["_id"]: s["count"] for s in sentiment_results if s["_id"]}
    
    # Get recent keywords with their stats
    recent_keywords = await db.listening_keywords.find(
        {"status": "active"},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "keywords": {
            "total": total_keywords,
            "active": active_keywords,
            "recent": recent_keywords
        },
        "mentions": {
            "total": total_mentions,
            "last_24h": mentions_24h,
            "last_7d": mentions_7d,
            "sentiment": sentiment_breakdown
        },
        "alerts": {
            "unread": unread_alerts,
            "urgent": urgent_alerts
        }
    }


# ============== CRAWLER ENDPOINTS ==============

@social_listening_router.post("/crawl")
async def trigger_crawl_all(
    background_tasks: BackgroundTasks,
    user: dict = Depends(lambda: get_current_user)
):
    """
    Trigger crawling for all active keywords.
    Searches Google, YouTube, Reddit, and News RSS feeds.
    """
    from services.social_crawler import run_crawler
    
    # Run in background for large keyword sets
    background_tasks.add_task(run_crawler, db)
    
    return {
        "message": "Crawl started in background",
        "status": "processing"
    }


@social_listening_router.post("/crawl/sync")
async def trigger_crawl_all_sync(
    user: dict = Depends(lambda: get_current_user)
):
    """
    Trigger crawling for all active keywords (synchronous).
    Returns results immediately - use for testing or small keyword sets.
    """
    from services.social_crawler import run_crawler
    
    result = await run_crawler(db)
    return result


@social_listening_router.post("/crawl/{keyword_id}")
async def crawl_single_keyword(
    keyword_id: str,
    user: dict = Depends(lambda: get_current_user)
):
    """
    Crawl a single keyword by ID.
    Useful for testing or immediate updates.
    """
    from services.social_crawler import crawl_single_keyword as crawl_kw
    
    result = await crawl_kw(db, keyword_id)
    return result


@social_listening_router.get("/crawl/logs")
async def get_crawl_logs(
    limit: int = Query(20, le=100),
    user: dict = Depends(lambda: get_current_user)
):
    """Get recent crawl logs"""
    logs = await db.listening_crawl_logs.find(
        {},
        {"_id": 0}
    ).sort("crawled_at", -1).limit(limit).to_list(limit)
    
    return {"logs": logs}


@social_listening_router.get("/crawl/status")
async def get_crawl_status(
    user: dict = Depends(lambda: get_current_user)
):
    """Get crawler status and configuration"""
    import os
    
    # Check API configurations
    google_configured = bool(os.environ.get("GOOGLE_SEARCH_API_KEY") and os.environ.get("GOOGLE_SEARCH_ENGINE_ID"))
    youtube_configured = bool(os.environ.get("YOUTUBE_API_KEY"))
    
    # Get last crawl
    last_crawl = await db.listening_crawl_logs.find_one(
        {},
        {"_id": 0},
        sort=[("crawled_at", -1)]
    )
    
    # Count active keywords
    active_keywords = await db.listening_keywords.count_documents({"status": "active"})
    
    # Count mentions by source
    pipeline = [
        {"$group": {"_id": "$source", "count": {"$sum": 1}}}
    ]
    source_counts = {}
    async for doc in db.listening_mentions.aggregate(pipeline):
        source_counts[doc["_id"] or "unknown"] = doc["count"]
    
    return {
        "data_sources": {
            "google_search": {
                "configured": google_configured,
                "status": "active" if google_configured else "not_configured",
                "description": "Web and news mentions via Google Custom Search"
            },
            "youtube": {
                "configured": youtube_configured,
                "status": "active" if youtube_configured else "not_configured",
                "description": "Video mentions via YouTube Data API"
            },
            "reddit": {
                "configured": True,  # Public API, no auth needed
                "status": "active",
                "description": "Community discussions via Reddit public API"
            },
            "news_rss": {
                "configured": True,
                "status": "active",
                "description": "News aggregation via RSS feeds (Google News, Bing, Yahoo)"
            }
        },
        "active_keywords": active_keywords,
        "last_crawl": last_crawl,
        "mentions_by_source": source_counts
    }

