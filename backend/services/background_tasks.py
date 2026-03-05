"""
Background Task Service for AI Discovery
Handles long-running AI tasks with status polling
"""
import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid
import json
import os

logger = logging.getLogger(__name__)

# In-memory task storage (for quick access)
_task_store: Dict[str, Dict[str, Any]] = {}


class BackgroundTaskService:
    """Service for managing background AI discovery tasks"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def create_task(
        self,
        task_type: str,
        params: Dict[str, Any],
        user_id: str
    ) -> str:
        """Create a new background task and return task_id"""
        task_id = str(uuid.uuid4())
        
        task_doc = {
            "id": task_id,
            "type": task_type,
            "params": params,
            "status": "pending",  # pending, running, completed, failed
            "progress": 0,
            "message": "Task created, waiting to start...",
            "result": None,
            "error": None,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "started_at": None,
            "completed_at": None
        }
        
        # Store in MongoDB
        await self.db.background_tasks.insert_one(task_doc)
        
        # Store in memory for quick access
        _task_store[task_id] = task_doc.copy()
        if '_id' in _task_store[task_id]:
            del _task_store[task_id]['_id']
        
        return task_id
    
    async def update_task_status(
        self,
        task_id: str,
        status: str,
        progress: int = None,
        message: str = None,
        result: Any = None,
        error: str = None
    ):
        """Update task status"""
        update_data = {"status": status}
        
        if progress is not None:
            update_data["progress"] = progress
        if message is not None:
            update_data["message"] = message
        if result is not None:
            update_data["result"] = result
        if error is not None:
            update_data["error"] = error
        
        if status == "running" and "started_at" not in update_data:
            update_data["started_at"] = datetime.now(timezone.utc).isoformat()
        if status in ["completed", "failed"]:
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update MongoDB
        await self.db.background_tasks.update_one(
            {"id": task_id},
            {"$set": update_data}
        )
        
        # Update in-memory store
        if task_id in _task_store:
            _task_store[task_id].update(update_data)
    
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get current task status"""
        # Try memory first for quick access
        if task_id in _task_store:
            return _task_store[task_id]
        
        # Fall back to MongoDB
        task = await self.db.background_tasks.find_one(
            {"id": task_id}, {"_id": 0}
        )
        if task:
            _task_store[task_id] = task
        return task
    
    async def run_ai_discovery_task(self, task_id: str):
        """Execute AI discovery in background"""
        task = await self.get_task_status(task_id)
        if not task:
            logger.error(f"Task {task_id} not found")
            return
        
        params = task["params"]
        
        try:
            await self.update_task_status(
                task_id, "running", 10, "Starting AI discovery..."
            )
            
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            
            await self.update_task_status(
                task_id, "running", 25, "Analyzing campaign brief..."
            )
            
            chat = LlmChat(
                api_key=api_key,
                session_id=f"bg-discover-{task_id}",
                system_message="""You are an expert influencer marketing strategist for luxury fashion brands. 
                Generate realistic Indian fashion influencer profiles matching the criteria.
                Always respond in valid JSON format."""
            ).with_model("openai", "gpt-5.2")
            
            await self.update_task_status(
                task_id, "running", 40, "Generating influencer profiles..."
            )
            
            num_suggestions = params.get("num_suggestions", 10)
            campaign_brief = params.get("campaign_brief", "Fashion campaign")
            industry = params.get("industry", "fashion")
            location = params.get("location", "India")
            follower_range = params.get("follower_range", "10K-500K")
            
            prompt = f"""Generate {num_suggestions} Indian fashion influencer profiles for:

Brief: {campaign_brief}
Industry: {industry}
Location: {location}
Follower Range: {follower_range}

Return ONLY valid JSON (no markdown):
{{
    "search_strategy": "one sentence strategy",
    "ideal_profile": "one sentence profile description",
    "influencers": [
        {{
            "name": "Full Name",
            "instagram_handle": "handle",
            "bio": "Short bio",
            "city": "City",
            "industry": "{industry}",
            "tier": "micro",
            "followers": 50000,
            "engagement_rate": 4.5,
            "style_tags": ["minimal", "luxury"],
            "content_type": ["Reels"],
            "estimated_rate_per_reel": 25000,
            "why_recommended": "Reason",
            "audience_match_score": 85
        }}
    ]
}}"""
            
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            await self.update_task_status(
                task_id, "running", 70, "Processing AI response..."
            )
            
            # Parse response
            response_text = response
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            parsed = json.loads(response_text.strip())
            
            await self.update_task_status(
                task_id, "running", 85, "Searching existing database..."
            )
            
            # Search existing database for matches
            db_query = {}
            if industry:
                db_query["industry"] = {"$regex": industry, "$options": "i"}
            if location and location != "India":
                db_query["city"] = {"$regex": location, "$options": "i"}
            
            existing_matches = await self.db.influencers.find(
                db_query, {"_id": 0}
            ).sort("score", -1).limit(5).to_list(5)
            
            await self.update_task_status(
                task_id, "running", 95, "Finalizing results..."
            )
            
            result = {
                "success": True,
                "search_strategy": parsed.get("search_strategy", ""),
                "ideal_profile": parsed.get("ideal_profile", ""),
                "discovered_influencers": parsed.get("influencers", []),
                "existing_matches": existing_matches,
                "total_discovered": len(parsed.get("influencers", [])),
                "total_existing_matches": len(existing_matches)
            }
            
            await self.update_task_status(
                task_id, "completed", 100, 
                f"Discovery complete! Found {result['total_discovered']} new profiles.",
                result=result
            )
            
            logger.info(f"Task {task_id} completed successfully")
            
        except json.JSONDecodeError as e:
            error_msg = f"Failed to parse AI response: {str(e)}"
            logger.error(f"Task {task_id} failed: {error_msg}")
            await self.update_task_status(
                task_id, "failed", 100, error_msg, error=error_msg
            )
        except Exception as e:
            error_msg = f"Discovery failed: {str(e)}"
            logger.error(f"Task {task_id} failed: {error_msg}")
            await self.update_task_status(
                task_id, "failed", 100, error_msg, error=error_msg
            )
    
    async def cleanup_old_tasks(self, days: int = 7):
        """Clean up completed/failed tasks older than specified days"""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        
        result = await self.db.background_tasks.delete_many({
            "status": {"$in": ["completed", "failed"]},
            "completed_at": {"$lt": cutoff.isoformat()}
        })
        
        logger.info(f"Cleaned up {result.deleted_count} old background tasks")
        return result.deleted_count


# Import timedelta for cleanup
from datetime import timedelta


def create_background_task_service(db: AsyncIOMotorDatabase) -> BackgroundTaskService:
    """Factory function to create the service"""
    return BackgroundTaskService(db)
