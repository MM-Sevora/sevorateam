"""
Scheduled Auto-Discovery Service
Runs periodic AI-powered influencer discovery based on saved search criteria
"""
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import json
import os

logger = logging.getLogger(__name__)


class ScheduledDiscoveryService:
    """Service for scheduled influencer auto-discovery"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.running_tasks: Dict[str, asyncio.Task] = {}
        self._stop_event = asyncio.Event()
    
    async def create_scheduled_search(
        self,
        name: str,
        campaign_brief: str,
        category: str,
        location: str,
        follower_range: str,
        frequency: str = "daily",  # daily, weekly
        num_suggestions: int = 10,
        user_id: str = None
    ) -> Dict[str, Any]:
        """Create a new scheduled search configuration"""
        search_id = str(uuid.uuid4())
        
        search_doc = {
            "id": search_id,
            "name": name,
            "campaign_brief": campaign_brief,
            "category": category,
            "location": location,
            "follower_range": follower_range,
            "frequency": frequency,
            "num_suggestions": num_suggestions,
            "is_active": True,
            "last_run": None,
            "next_run": self._calculate_next_run(frequency),
            "total_discovered": 0,
            "total_imported": 0,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.scheduled_searches.insert_one(search_doc)
        
        if '_id' in search_doc:
            del search_doc['_id']
        
        logger.info(f"Created scheduled search: {name} ({search_id})")
        return search_doc
    
    def _calculate_next_run(self, frequency: str, from_time: datetime = None) -> str:
        """Calculate next run time based on frequency"""
        base_time = from_time or datetime.now(timezone.utc)
        
        if frequency == "daily":
            next_run = base_time + timedelta(days=1)
        elif frequency == "weekly":
            next_run = base_time + timedelta(weeks=1)
        elif frequency == "hourly":  # For testing
            next_run = base_time + timedelta(hours=1)
        else:
            next_run = base_time + timedelta(days=1)
        
        # Set to a consistent time (e.g., 9 AM UTC)
        next_run = next_run.replace(hour=9, minute=0, second=0, microsecond=0)
        
        return next_run.isoformat()
    
    async def get_scheduled_searches(self, user_id: str = None) -> List[Dict]:
        """Get all scheduled searches"""
        query = {}
        if user_id:
            query["created_by"] = user_id
        
        searches = await self.db.scheduled_searches.find(
            query, {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return searches
    
    async def get_scheduled_search(self, search_id: str) -> Optional[Dict]:
        """Get a specific scheduled search"""
        search = await self.db.scheduled_searches.find_one(
            {"id": search_id}, {"_id": 0}
        )
        return search
    
    async def update_scheduled_search(
        self, 
        search_id: str, 
        updates: Dict[str, Any]
    ) -> Optional[Dict]:
        """Update a scheduled search"""
        allowed_fields = {
            "name", "campaign_brief", "category", "location", 
            "follower_range", "frequency", "num_suggestions", "is_active"
        }
        
        update_data = {k: v for k, v in updates.items() if k in allowed_fields}
        
        if "frequency" in update_data:
            update_data["next_run"] = self._calculate_next_run(update_data["frequency"])
        
        result = await self.db.scheduled_searches.find_one_and_update(
            {"id": search_id},
            {"$set": update_data},
            return_document=True
        )
        
        if result and '_id' in result:
            del result['_id']
        
        return result
    
    async def delete_scheduled_search(self, search_id: str) -> bool:
        """Delete a scheduled search"""
        result = await self.db.scheduled_searches.delete_one({"id": search_id})
        return result.deleted_count > 0
    
    async def run_discovery_now(self, search_id: str) -> Dict[str, Any]:
        """Manually trigger a scheduled search to run now"""
        search = await self.get_scheduled_search(search_id)
        
        if not search:
            return {"success": False, "error": "Search not found"}
        
        # Run the discovery
        result = await self._execute_discovery(search)
        
        # Update last run time
        await self.db.scheduled_searches.update_one(
            {"id": search_id},
            {
                "$set": {
                    "last_run": datetime.now(timezone.utc).isoformat(),
                    "next_run": self._calculate_next_run(search["frequency"])
                },
                "$inc": {
                    "total_discovered": result.get("discovered_count", 0)
                }
            }
        )
        
        return result
    
    async def _execute_discovery(self, search: Dict) -> Dict[str, Any]:
        """Execute the AI discovery for a scheduled search"""
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            
            chat = LlmChat(
                api_key=api_key,
                session_id=f"scheduled-{search['id']}-{datetime.now().timestamp()}",
                system_message="""You are an expert influencer marketing strategist for luxury fashion brands. 
                Generate realistic Indian fashion influencer profiles matching the search criteria.
                Always respond in valid JSON format."""
            ).with_model("openai", "gpt-5.2")
            
            prompt = f"""Generate {search['num_suggestions']} Indian fashion influencer profiles for this search:

Brief: {search['campaign_brief']}
Category: {search['category']}
Location: {search['location']}
Follower Range: {search['follower_range']}

Return ONLY valid JSON (no markdown) with this structure:
{{
    "influencers": [
        {{
            "name": "Full Name",
            "instagram_handle": "handle",
            "bio": "Short bio",
            "city": "Mumbai",
            "category": "{search['category']}",
            "tier": "micro",
            "followers": 50000,
            "engagement_rate": 4.5,
            "style_tags": ["minimal", "luxury"],
            "why_recommended": "Reason",
            "audience_match_score": 85
        }}
    ]
}}"""
            
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            # Parse response
            try:
                response_text = response
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0]
                
                parsed = json.loads(response_text.strip())
                influencers = parsed.get("influencers", [])
                
                # Store discovery results
                discovery_result = {
                    "id": str(uuid.uuid4()),
                    "search_id": search["id"],
                    "search_name": search["name"],
                    "discovered_at": datetime.now(timezone.utc).isoformat(),
                    "influencers": influencers,
                    "discovered_count": len(influencers)
                }
                
                await self.db.discovery_results.insert_one(discovery_result)
                
                if '_id' in discovery_result:
                    del discovery_result['_id']
                
                return {
                    "success": True,
                    "discovered_count": len(influencers),
                    "result": discovery_result
                }
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON parse error in scheduled discovery: {e}")
                return {"success": False, "error": "Failed to parse AI response"}
            
        except Exception as e:
            logger.error(f"Scheduled discovery error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_discovery_results(
        self, 
        search_id: str = None,
        limit: int = 10
    ) -> List[Dict]:
        """Get discovery results, optionally filtered by search ID"""
        query = {}
        if search_id:
            query["search_id"] = search_id
        
        results = await self.db.discovery_results.find(
            query, {"_id": 0}
        ).sort("discovered_at", -1).limit(limit).to_list(limit)
        
        return results
    
    async def start_scheduler(self):
        """Start the background scheduler for auto-discovery"""
        logger.info("Starting scheduled discovery service...")
        
        while not self._stop_event.is_set():
            try:
                # Check for searches due to run
                now = datetime.now(timezone.utc)
                
                due_searches = await self.db.scheduled_searches.find({
                    "is_active": True,
                    "next_run": {"$lte": now.isoformat()}
                }, {"_id": 0}).to_list(50)
                
                for search in due_searches:
                    logger.info(f"Running scheduled search: {search['name']}")
                    await self.run_discovery_now(search["id"])
                
                # Sleep for 5 minutes before checking again
                await asyncio.sleep(300)
                
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                await asyncio.sleep(60)
    
    def stop_scheduler(self):
        """Stop the background scheduler"""
        self._stop_event.set()
        logger.info("Scheduled discovery service stopped")


# Factory function to create the service
def create_scheduled_discovery_service(db: AsyncIOMotorDatabase) -> ScheduledDiscoveryService:
    return ScheduledDiscoveryService(db)
