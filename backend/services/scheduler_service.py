"""
Scheduled Auto-Discovery Service with APScheduler
Uses MongoDB for job persistence (survives restarts)
"""
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import json
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.mongodb import MongoDBJobStore
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler: Optional[AsyncIOScheduler] = None


def run_scheduled_discovery_sync(search_id: str, mongo_url: str, db_name: str):
    """
    Synchronous wrapper for running scheduled discovery.
    APScheduler calls this function, which then runs the async discovery.
    """
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient
    
    async def _run_async():
        # Create a new database connection for this job
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        try:
            search = await db.scheduled_searches.find_one({"id": search_id}, {"_id": 0})
            
            if not search:
                logger.error(f"Scheduled search not found: {search_id}")
                return
            
            if not search.get("is_active", True):
                logger.info(f"Scheduled search is inactive: {search_id}")
                return
            
            logger.info(f"Running scheduled discovery for: {search.get('name')}")
            
            # Execute the discovery
            try:
                from emergentintegrations.llm.chat import LlmChat, UserMessage
                
                api_key = os.environ.get('EMERGENT_LLM_KEY')
                
                chat = LlmChat(
                    api_key=api_key,
                    session_id=f"scheduled-{search_id}-{datetime.now().timestamp()}",
                    system_message="""You are an expert influencer marketing strategist for luxury fashion brands. 
                    Generate realistic Indian fashion influencer profiles matching the search criteria.
                    Always respond in valid JSON format."""
                ).with_model("openai", "gpt-5.2")
                
                prompt = f"""Generate {search['num_suggestions']} Indian fashion influencer profiles for this search:

Brief: {search['campaign_brief']}
Industry: {search.get('industry', 'fashion')}
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
            "industry": "{search.get('industry', 'fashion')}",
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
                
                await db.discovery_results.insert_one(discovery_result)
                
                # Update search stats
                await db.scheduled_searches.update_one(
                    {"id": search_id},
                    {
                        "$set": {
                            "last_run": datetime.now(timezone.utc).isoformat(),
                            "next_run": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
                        },
                        "$inc": {
                            "total_discovered": len(influencers),
                            "run_count": 1
                        }
                    }
                )
                
                logger.info(f"Scheduled discovery completed: {search['name']} - {len(influencers)} found")
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON parse error in scheduled discovery: {e}")
            except Exception as e:
                logger.error(f"Discovery execution error: {e}")
            
        finally:
            client.close()
    
    # Run the async function in a new event loop
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(_run_async())
    except Exception as e:
        logger.error(f"Scheduled discovery job error: {e}")
    finally:
        loop.close()


class ScheduledDiscoveryService:
    """Service for scheduled influencer auto-discovery with APScheduler"""
    
    def __init__(self, db: AsyncIOMotorDatabase, mongo_url: str, db_name: str):
        self.db = db
        self.mongo_url = mongo_url
        self.db_name = db_name
        self._scheduler = None
    
    def get_scheduler(self) -> AsyncIOScheduler:
        """Get or create the scheduler instance"""
        global _scheduler
        
        if _scheduler is None:
            # Configure MongoDB job store for persistence
            jobstores = {
                'default': MongoDBJobStore(
                    database=self.db_name,
                    collection='apscheduler_jobs',
                    client=None,  # Will use mongo_url
                    host=self.mongo_url
                )
            }
            
            _scheduler = AsyncIOScheduler(
                jobstores=jobstores,
                job_defaults={
                    'coalesce': True,  # Combine missed runs
                    'max_instances': 1,  # Only one instance at a time
                    'misfire_grace_time': 3600  # 1 hour grace period
                }
            )
            
            logger.info("APScheduler initialized with MongoDB job store")
        
        return _scheduler
    
    def start_scheduler(self):
        """Start the APScheduler"""
        scheduler = self.get_scheduler()
        if not scheduler.running:
            scheduler.start()
            logger.info("APScheduler started")
    
    def shutdown_scheduler(self):
        """Shutdown the APScheduler"""
        global _scheduler
        if _scheduler and _scheduler.running:
            _scheduler.shutdown(wait=False)
            logger.info("APScheduler shutdown")
    
    async def create_scheduled_search(
        self,
        name: str,
        campaign_brief: str,
        industry: str,
        location: str,
        follower_range: str,
        frequency: str = "daily",  # daily, weekly, hourly (for testing)
        num_suggestions: int = 10,
        user_id: str = None
    ) -> Dict[str, Any]:
        """Create a new scheduled search and add to scheduler"""
        search_id = str(uuid.uuid4())
        
        # Calculate next run time
        next_run = self._calculate_next_run(frequency)
        
        search_doc = {
            "id": search_id,
            "name": name,
            "campaign_brief": campaign_brief,
            "industry": industry,
            "location": location,
            "follower_range": follower_range,
            "frequency": frequency,
            "num_suggestions": num_suggestions,
            "is_active": True,
            "last_run": None,
            "next_run": next_run,
            "total_discovered": 0,
            "total_imported": 0,
            "run_count": 0,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.scheduled_searches.insert_one(search_doc)
        
        # Add job to APScheduler
        self._add_job_to_scheduler(search_id, frequency)
        
        if '_id' in search_doc:
            del search_doc['_id']
        
        logger.info(f"Created scheduled search: {name} ({search_id}) - {frequency}")
        return search_doc
    
    def _add_job_to_scheduler(self, search_id: str, frequency: str):
        """Add a job to APScheduler"""
        scheduler = self.get_scheduler()
        
        # Create trigger based on frequency
        if frequency == "hourly":
            trigger = IntervalTrigger(hours=1)
        elif frequency == "daily":
            trigger = CronTrigger(hour=9, minute=0)  # 9 AM daily
        elif frequency == "weekly":
            trigger = CronTrigger(day_of_week='mon', hour=9, minute=0)  # Monday 9 AM
        else:
            trigger = CronTrigger(hour=9, minute=0)  # Default daily
        
        # Add job (replace if exists)
        job_id = f"discovery_{search_id}"
        
        # Use a synchronous wrapper function that will run the async discovery
        scheduler.add_job(
            run_scheduled_discovery_sync,  # Synchronous wrapper
            trigger=trigger,
            id=job_id,
            name=f"Discovery: {search_id}",
            args=[search_id, self.mongo_url, self.db_name],
            replace_existing=True
        )
        
        logger.info(f"Added scheduler job: {job_id}")
    
    def _remove_job_from_scheduler(self, search_id: str):
        """Remove a job from APScheduler"""
        scheduler = self.get_scheduler()
        job_id = f"discovery_{search_id}"
        
        try:
            scheduler.remove_job(job_id)
            logger.info(f"Removed scheduler job: {job_id}")
        except Exception as e:
            logger.warning(f"Could not remove job {job_id}: {e}")
    
    def _calculate_next_run(self, frequency: str, from_time: datetime = None) -> str:
        """Calculate next run time based on frequency"""
        base_time = from_time or datetime.now(timezone.utc)
        
        if frequency == "hourly":
            next_run = base_time + timedelta(hours=1)
        elif frequency == "daily":
            next_run = base_time + timedelta(days=1)
            next_run = next_run.replace(hour=9, minute=0, second=0, microsecond=0)
        elif frequency == "weekly":
            next_run = base_time + timedelta(weeks=1)
            next_run = next_run.replace(hour=9, minute=0, second=0, microsecond=0)
        else:
            next_run = base_time + timedelta(days=1)
        
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
            "name", "campaign_brief", "industry", "location", 
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
        
        if result:
            if '_id' in result:
                del result['_id']
            
            # Update scheduler job if frequency changed or is_active changed
            if "frequency" in update_data or "is_active" in update_data:
                if result.get("is_active", True):
                    self._add_job_to_scheduler(search_id, result.get("frequency", "daily"))
                else:
                    self._remove_job_from_scheduler(search_id)
        
        return result
    
    async def delete_scheduled_search(self, search_id: str) -> bool:
        """Delete a scheduled search"""
        # Remove from scheduler
        self._remove_job_from_scheduler(search_id)
        
        # Remove from database
        result = await self.db.scheduled_searches.delete_one({"id": search_id})
        return result.deleted_count > 0
    
    async def run_discovery_now(self, search_id: str) -> Dict[str, Any]:
        """Manually trigger a scheduled search to run now"""
        search = await self.get_scheduled_search(search_id)
        
        if not search:
            return {"success": False, "error": "Search not found"}
        
        # Run the discovery
        result = await self._execute_discovery(search)
        
        # Update last run time and stats
        await self.db.scheduled_searches.update_one(
            {"id": search_id},
            {
                "$set": {
                    "last_run": datetime.now(timezone.utc).isoformat(),
                    "next_run": self._calculate_next_run(search["frequency"])
                },
                "$inc": {
                    "total_discovered": result.get("discovered_count", 0),
                    "run_count": 1
                }
            }
        )
        
        return result
    
    async def _run_scheduled_discovery(self, search_id: str):
        """Callback for APScheduler - runs discovery for a search"""
        logger.info(f"APScheduler triggered discovery for: {search_id}")
        
        # Need to run in async context
        search = await self.get_scheduled_search(search_id)
        
        if not search:
            logger.error(f"Scheduled search not found: {search_id}")
            return
        
        if not search.get("is_active", True):
            logger.info(f"Scheduled search is inactive: {search_id}")
            return
        
        await self.run_discovery_now(search_id)
    
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
Industry: {search.get('industry', 'fashion')}
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
            "industry": "{search.get('industry', 'fashion')}",
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
                
                logger.info(f"Scheduled discovery completed: {search['name']} - {len(influencers)} found")
                
                return {
                    "success": True,
                    "discovered_count": len(influencers),
                    "result": discovery_result
                }
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON parse error in scheduled discovery: {e}")
                return {"success": False, "error": "Failed to parse AI response", "discovered_count": 0}
            
        except Exception as e:
            logger.error(f"Scheduled discovery error: {e}")
            return {"success": False, "error": str(e), "discovered_count": 0}
    
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
    
    async def restore_jobs_on_startup(self):
        """Restore all active scheduled searches to APScheduler on startup"""
        active_searches = await self.db.scheduled_searches.find(
            {"is_active": True}, {"_id": 0}
        ).to_list(100)
        
        for search in active_searches:
            self._add_job_to_scheduler(search["id"], search.get("frequency", "daily"))
        
        logger.info(f"Restored {len(active_searches)} scheduled searches to APScheduler")
    
    def get_scheduler_status(self) -> Dict[str, Any]:
        """Get current scheduler status and jobs"""
        scheduler = self.get_scheduler()
        
        jobs = []
        for job in scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger)
            })
        
        return {
            "running": scheduler.running,
            "jobs_count": len(jobs),
            "jobs": jobs
        }


# Factory function
def create_scheduled_discovery_service(
    db: AsyncIOMotorDatabase, 
    mongo_url: str = None, 
    db_name: str = None
) -> ScheduledDiscoveryService:
    """Create the scheduled discovery service"""
    if mongo_url is None:
        mongo_url = os.environ.get('MONGO_URL')
    if db_name is None:
        db_name = os.environ.get('DB_NAME')
    
    return ScheduledDiscoveryService(db, mongo_url, db_name)
