"""
Social Analytics Module - Phase 3
Performance metrics and dashboards
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import random
import logging

logger = logging.getLogger(__name__)

social_analytics_router = APIRouter(prefix="/social/analytics", tags=["Social Analytics"])

# Will be set by main server
db = None
get_current_user = None

def init_social_analytics_router(database, auth_func):
    global db, get_current_user
    db = database
    get_current_user = auth_func
    return social_analytics_router


# ============== MOCK DATA GENERATORS ==============

def generate_mock_time_series(days: int = 30, base_value: int = 1000, variance: float = 0.3):
    """Generate mock time series data"""
    data = []
    current = base_value
    for i in range(days):
        date = (datetime.now(timezone.utc) - timedelta(days=days - i - 1)).strftime("%Y-%m-%d")
        change = random.uniform(-variance, variance)
        current = max(100, int(current * (1 + change)))
        data.append({"date": date, "value": current})
    return data


def generate_platform_breakdown():
    """Generate mock platform breakdown"""
    platforms = ["linkedin", "twitter", "instagram", "facebook"]
    total = random.randint(50000, 150000)
    breakdown = {}
    remaining = total
    for i, p in enumerate(platforms):
        if i == len(platforms) - 1:
            breakdown[p] = remaining
        else:
            val = random.randint(int(remaining * 0.15), int(remaining * 0.4))
            breakdown[p] = val
            remaining -= val
    return breakdown


# ============== OVERVIEW ENDPOINTS ==============

@social_analytics_router.get("/overview")
async def get_analytics_overview(
    period: str = "30d",
    user: dict = Depends(lambda: get_current_user)
):
    """Get overview analytics for the dashboard"""
    days = int(period.replace("d", "")) if "d" in period else 30
    
    # Get real post counts from database
    total_posts = await db.social_posts.count_documents({})
    published_posts = await db.social_posts.count_documents({"status": "published"})
    scheduled_posts = await db.social_posts.count_documents({"status": "scheduled"})
    draft_posts = await db.social_posts.count_documents({"status": "draft"})
    
    # Generate mock engagement metrics
    base_followers = random.randint(10000, 50000)
    follower_growth = random.uniform(0.02, 0.08)
    
    return {
        "period": period,
        "metrics": {
            "total_followers": base_followers,
            "follower_growth": round(follower_growth * 100, 1),
            "total_impressions": random.randint(100000, 500000),
            "total_reach": random.randint(50000, 200000),
            "total_engagement": random.randint(5000, 25000),
            "engagement_rate": round(random.uniform(2.5, 6.5), 2),
            "total_posts": total_posts,
            "published_posts": published_posts,
            "scheduled_posts": scheduled_posts,
            "draft_posts": draft_posts,
            "avg_post_reach": random.randint(500, 3000),
            "best_performing_platform": random.choice(["linkedin", "twitter", "instagram"]),
        },
        "trends": {
            "followers_up": random.choice([True, True, True, False]),
            "engagement_up": random.choice([True, True, False, False]),
            "reach_up": random.choice([True, False]),
        }
    }


@social_analytics_router.get("/engagement")
async def get_engagement_metrics(
    period: str = "30d",
    platform: Optional[str] = None,
    user: dict = Depends(lambda: get_current_user)
):
    """Get detailed engagement metrics"""
    days = int(period.replace("d", "")) if "d" in period else 30
    
    return {
        "period": period,
        "platform": platform or "all",
        "metrics": {
            "total_likes": random.randint(5000, 30000),
            "total_comments": random.randint(500, 3000),
            "total_shares": random.randint(200, 2000),
            "total_saves": random.randint(100, 1000),
            "total_clicks": random.randint(2000, 15000),
            "avg_engagement_per_post": round(random.uniform(50, 300), 1),
            "engagement_rate": round(random.uniform(2.5, 6.5), 2),
        },
        "time_series": {
            "likes": generate_mock_time_series(days, 200, 0.25),
            "comments": generate_mock_time_series(days, 30, 0.3),
            "shares": generate_mock_time_series(days, 15, 0.35),
        },
        "by_type": {
            "likes": random.randint(5000, 20000),
            "comments": random.randint(500, 2000),
            "shares": random.randint(200, 1500),
            "saves": random.randint(100, 800),
            "clicks": random.randint(2000, 10000),
        }
    }


@social_analytics_router.get("/reach")
async def get_reach_metrics(
    period: str = "30d",
    user: dict = Depends(lambda: get_current_user)
):
    """Get reach and impressions metrics"""
    days = int(period.replace("d", "")) if "d" in period else 30
    
    return {
        "period": period,
        "metrics": {
            "total_impressions": random.randint(100000, 500000),
            "total_reach": random.randint(50000, 200000),
            "unique_viewers": random.randint(30000, 150000),
            "avg_impressions_per_post": random.randint(1000, 5000),
            "viral_posts": random.randint(0, 5),
        },
        "time_series": {
            "impressions": generate_mock_time_series(days, 5000, 0.2),
            "reach": generate_mock_time_series(days, 2500, 0.25),
        },
        "by_platform": generate_platform_breakdown(),
    }


@social_analytics_router.get("/audience")
async def get_audience_metrics(
    user: dict = Depends(lambda: get_current_user)
):
    """Get audience demographics and growth"""
    return {
        "total_followers": random.randint(10000, 50000),
        "follower_growth": {
            "daily": generate_mock_time_series(30, 50, 0.5),
            "net_change_30d": random.randint(500, 3000),
            "growth_rate": round(random.uniform(2, 8), 1),
        },
        "by_platform": {
            "linkedin": {"followers": random.randint(3000, 15000), "growth": round(random.uniform(1, 5), 1)},
            "twitter": {"followers": random.randint(2000, 10000), "growth": round(random.uniform(0.5, 4), 1)},
            "instagram": {"followers": random.randint(4000, 20000), "growth": round(random.uniform(2, 7), 1)},
            "facebook": {"followers": random.randint(1000, 8000), "growth": round(random.uniform(0, 3), 1)},
        },
        "demographics": {
            "age_groups": [
                {"range": "18-24", "percentage": random.randint(10, 20)},
                {"range": "25-34", "percentage": random.randint(25, 40)},
                {"range": "35-44", "percentage": random.randint(20, 30)},
                {"range": "45-54", "percentage": random.randint(10, 20)},
                {"range": "55+", "percentage": random.randint(5, 15)},
            ],
            "gender": {
                "male": random.randint(40, 55),
                "female": random.randint(40, 55),
                "other": random.randint(2, 8),
            },
            "top_locations": [
                {"country": "United States", "percentage": random.randint(30, 50)},
                {"country": "United Kingdom", "percentage": random.randint(10, 20)},
                {"country": "Canada", "percentage": random.randint(5, 15)},
                {"country": "Australia", "percentage": random.randint(3, 10)},
                {"country": "Germany", "percentage": random.randint(2, 8)},
            ],
        },
        "active_times": {
            "best_days": ["Tuesday", "Wednesday", "Thursday"],
            "best_hours": ["9:00 AM", "12:00 PM", "5:00 PM"],
            "hourly_activity": [
                {"hour": h, "activity": random.randint(20, 100)} 
                for h in range(24)
            ],
        }
    }


@social_analytics_router.get("/content-performance")
async def get_content_performance(
    period: str = "30d",
    limit: int = 10,
    user: dict = Depends(lambda: get_current_user)
):
    """Get top performing content"""
    # Get real posts from database
    posts = await db.social_posts.find(
        {"status": "published"},
        {"_id": 0, "post_id": 1, "content": 1, "platform": 1, "created_at": 1}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Add mock performance metrics to each post
    for post in posts:
        post["metrics"] = {
            "impressions": random.randint(500, 10000),
            "reach": random.randint(300, 5000),
            "likes": random.randint(20, 500),
            "comments": random.randint(2, 50),
            "shares": random.randint(1, 30),
            "engagement_rate": round(random.uniform(1.5, 8.0), 2),
            "clicks": random.randint(10, 200),
        }
        post["performance_score"] = random.randint(60, 100)
    
    # Sort by performance score
    posts.sort(key=lambda x: x["performance_score"], reverse=True)
    
    return {
        "period": period,
        "top_posts": posts,
        "content_type_performance": {
            "text_only": {"avg_engagement": round(random.uniform(2, 5), 1), "count": random.randint(5, 20)},
            "with_image": {"avg_engagement": round(random.uniform(4, 8), 1), "count": random.randint(10, 30)},
            "with_video": {"avg_engagement": round(random.uniform(5, 10), 1), "count": random.randint(2, 10)},
            "carousel": {"avg_engagement": round(random.uniform(6, 12), 1), "count": random.randint(1, 8)},
        },
        "best_posting_times": [
            {"day": "Tuesday", "time": "10:00 AM", "avg_engagement": round(random.uniform(5, 8), 1)},
            {"day": "Wednesday", "time": "2:00 PM", "avg_engagement": round(random.uniform(4, 7), 1)},
            {"day": "Thursday", "time": "11:00 AM", "avg_engagement": round(random.uniform(4, 7), 1)},
        ],
    }


@social_analytics_router.get("/platform/{platform}")
async def get_platform_analytics(
    platform: str,
    period: str = "30d",
    user: dict = Depends(lambda: get_current_user)
):
    """Get analytics for a specific platform"""
    days = int(period.replace("d", "")) if "d" in period else 30
    
    platform_names = {
        "linkedin": "LinkedIn",
        "twitter": "Twitter/X", 
        "instagram": "Instagram",
        "facebook": "Facebook",
        "youtube": "YouTube"
    }
    
    if platform not in platform_names:
        raise HTTPException(status_code=400, detail=f"Invalid platform: {platform}")
    
    # Get real post count for this platform
    post_count = await db.social_posts.count_documents({"platform": platform})
    
    return {
        "platform": platform,
        "platform_name": platform_names[platform],
        "period": period,
        "summary": {
            "followers": random.randint(2000, 20000),
            "follower_growth": round(random.uniform(1, 6), 1),
            "posts": post_count,
            "impressions": random.randint(20000, 150000),
            "reach": random.randint(10000, 80000),
            "engagement_rate": round(random.uniform(2, 7), 2),
        },
        "engagement": {
            "likes": random.randint(1000, 10000),
            "comments": random.randint(100, 1000),
            "shares": random.randint(50, 500),
            "saves": random.randint(20, 300),
        },
        "time_series": {
            "followers": generate_mock_time_series(days, random.randint(5000, 15000), 0.02),
            "impressions": generate_mock_time_series(days, random.randint(1000, 5000), 0.25),
            "engagement": generate_mock_time_series(days, random.randint(100, 500), 0.3),
        },
        "top_content": [
            {
                "type": "post",
                "preview": f"Sample high-performing {platform} content...",
                "engagement": random.randint(200, 1000),
                "impressions": random.randint(2000, 10000),
            }
            for _ in range(3)
        ],
    }


@social_analytics_router.get("/comparison")
async def get_platform_comparison(
    period: str = "30d",
    user: dict = Depends(lambda: get_current_user)
):
    """Compare performance across platforms"""
    platforms = ["linkedin", "twitter", "instagram", "facebook"]
    
    comparison = []
    for platform in platforms:
        post_count = await db.social_posts.count_documents({"platform": platform})
        comparison.append({
            "platform": platform,
            "metrics": {
                "posts": post_count,
                "followers": random.randint(2000, 20000),
                "impressions": random.randint(20000, 150000),
                "reach": random.randint(10000, 80000),
                "engagement": random.randint(500, 5000),
                "engagement_rate": round(random.uniform(2, 7), 2),
                "growth_rate": round(random.uniform(0.5, 5), 1),
            }
        })
    
    # Calculate totals
    totals = {
        "posts": sum(p["metrics"]["posts"] for p in comparison),
        "followers": sum(p["metrics"]["followers"] for p in comparison),
        "impressions": sum(p["metrics"]["impressions"] for p in comparison),
        "reach": sum(p["metrics"]["reach"] for p in comparison),
        "engagement": sum(p["metrics"]["engagement"] for p in comparison),
    }
    
    return {
        "period": period,
        "platforms": comparison,
        "totals": totals,
        "best_performer": max(comparison, key=lambda x: x["metrics"]["engagement_rate"])["platform"],
        "fastest_growing": max(comparison, key=lambda x: x["metrics"]["growth_rate"])["platform"],
    }


# ============== CAMPAIGN ANALYTICS ==============

@social_analytics_router.get("/campaigns")
async def get_campaign_analytics(
    user: dict = Depends(lambda: get_current_user)
):
    """Get analytics for social campaigns"""
    # Get real campaigns from database
    campaigns = await db.social_campaigns.find({}, {"_id": 0}).to_list(20)
    
    for campaign in campaigns:
        # Add mock performance metrics
        campaign["analytics"] = {
            "total_posts": random.randint(5, 30),
            "impressions": random.randint(10000, 100000),
            "reach": random.randint(5000, 50000),
            "engagement": random.randint(500, 5000),
            "engagement_rate": round(random.uniform(2, 8), 2),
            "clicks": random.randint(100, 2000),
            "conversions": random.randint(5, 100),
            "roi": round(random.uniform(1.5, 5.0), 2),
        }
    
    return {
        "campaigns": campaigns,
        "summary": {
            "total_campaigns": len(campaigns),
            "active_campaigns": sum(1 for c in campaigns if c.get("status") == "active"),
            "total_impressions": sum(c["analytics"]["impressions"] for c in campaigns) if campaigns else 0,
            "avg_engagement_rate": round(sum(c["analytics"]["engagement_rate"] for c in campaigns) / len(campaigns), 2) if campaigns else 0,
        }
    }
