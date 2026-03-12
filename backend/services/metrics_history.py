"""
Influencer Metrics History Service
Tracks follower growth and engagement trends over time.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
import uuid

logger = logging.getLogger(__name__)


class MetricsHistoryService:
    """
    Service for tracking influencer metrics over time.
    Stores daily snapshots and provides growth analytics.
    """
    
    def __init__(self, db):
        self.db = db
    
    async def record_metrics_snapshot(
        self, 
        contact_id: str,
        platform: str,
        metrics: Dict[str, Any],
        source: str = "manual"
    ) -> Dict[str, Any]:
        """
        Record a metrics snapshot for an influencer.
        Prevents duplicate snapshots on the same day.
        """
        if self.db is None:
            return {"success": False, "error": "Database not available"}
        
        today = datetime.now(timezone.utc).date().isoformat()
        
        # Check if we already have a snapshot today
        existing = await self.db.influencer_metrics_history.find_one({
            "contact_id": contact_id,
            "platform": platform,
            "date": today
        })
        
        if existing:
            # Update existing snapshot
            await self.db.influencer_metrics_history.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "metrics": metrics,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"success": True, "action": "updated", "date": today}
        
        # Create new snapshot
        snapshot = {
            "id": str(uuid.uuid4()),
            "contact_id": contact_id,
            "platform": platform,
            "date": today,
            "metrics": metrics,
            "source": source,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.influencer_metrics_history.insert_one(snapshot)
        
        return {"success": True, "action": "created", "date": today}
    
    async def get_metrics_history(
        self,
        contact_id: str,
        platform: Optional[str] = None,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get metrics history for an influencer.
        Returns daily snapshots for the specified period.
        """
        if self.db is None:
            return []
        
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
        
        query = {
            "contact_id": contact_id,
            "date": {"$gte": cutoff_date}
        }
        
        if platform:
            query["platform"] = platform
        
        history = await self.db.influencer_metrics_history.find(
            query,
            {"_id": 0}
        ).sort("date", 1).to_list(days + 10)
        
        return history
    
    async def calculate_growth(
        self,
        contact_id: str,
        platform: str,
        period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Calculate growth metrics for an influencer.
        Returns: growth rate, absolute change, trend direction.
        """
        history = await self.get_metrics_history(contact_id, platform, period_days)
        
        if len(history) < 2:
            return {
                "has_data": False,
                "message": "Not enough data to calculate growth"
            }
        
        oldest = history[0]
        newest = history[-1]
        
        # Get follower counts
        if platform == "instagram":
            old_followers = oldest.get("metrics", {}).get("followers", 0)
            new_followers = newest.get("metrics", {}).get("followers", 0)
            old_engagement = oldest.get("metrics", {}).get("engagement_rate", 0)
            new_engagement = newest.get("metrics", {}).get("engagement_rate", 0)
        else:  # youtube
            old_followers = oldest.get("metrics", {}).get("subscribers", 0)
            new_followers = newest.get("metrics", {}).get("subscribers", 0)
            old_engagement = 0
            new_engagement = 0
        
        # Calculate changes
        follower_change = new_followers - old_followers
        follower_growth_rate = (follower_change / old_followers * 100) if old_followers > 0 else 0
        
        engagement_change = new_engagement - old_engagement
        
        # Determine trend
        if follower_growth_rate > 5:
            trend = "growing"
        elif follower_growth_rate < -5:
            trend = "declining"
        else:
            trend = "stable"
        
        return {
            "has_data": True,
            "platform": platform,
            "period_days": period_days,
            "data_points": len(history),
            "followers": {
                "start": old_followers,
                "current": new_followers,
                "change": follower_change,
                "growth_rate": round(follower_growth_rate, 2),
                "trend": trend
            },
            "engagement": {
                "start": round(old_engagement, 2),
                "current": round(new_engagement, 2),
                "change": round(engagement_change, 2)
            },
            "first_recorded": oldest.get("date"),
            "last_recorded": newest.get("date")
        }
    
    async def get_growth_chart_data(
        self,
        contact_id: str,
        platform: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get data formatted for rendering a growth chart.
        Returns: dates array, followers array, engagement array.
        """
        history = await self.get_metrics_history(contact_id, platform, days)
        
        if not history:
            return {
                "has_data": False,
                "dates": [],
                "followers": [],
                "engagement": []
            }
        
        dates = []
        followers = []
        engagement = []
        
        for snapshot in history:
            dates.append(snapshot.get("date"))
            metrics = snapshot.get("metrics", {})
            
            if platform == "instagram":
                followers.append(metrics.get("followers", 0))
                engagement.append(metrics.get("engagement_rate", 0))
            else:
                followers.append(metrics.get("subscribers", 0))
                engagement.append(0)
        
        return {
            "has_data": True,
            "platform": platform,
            "dates": dates,
            "followers": followers,
            "engagement": engagement,
            "total_points": len(dates)
        }


def get_metrics_history_service(db) -> MetricsHistoryService:
    """Factory function to create metrics history service"""
    return MetricsHistoryService(db)
