"""
Scheduler API Routes - Background Job Management
For scheduled discovery, sync tasks, and automation
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import asyncio

from services.scheduler_service import (
    get_scheduler_status,
    start_scheduler,
    shutdown_scheduler,
    get_jobs,
    get_job,
    add_job,
    remove_job,
    pause_job,
    resume_job,
    schedule_daily,
    schedule_weekly,
    schedule_interval
)

scheduler_router = APIRouter(prefix="/scheduler", tags=["Background Jobs"])


# ============== MODELS ==============

class ScheduledJobCreate(BaseModel):
    job_type: str  # 'discovery', 'sync', 'report', 'custom'
    name: str
    schedule_type: str  # 'daily', 'weekly', 'interval', 'once'
    schedule_config: Dict[str, Any]  # hour, minute, day_of_week, interval_hours, etc.
    job_config: Dict[str, Any]  # Job-specific configuration
    enabled: bool = True


class ScheduledSearch(BaseModel):
    name: str
    search_params: Dict[str, Any]  # industry, location, min_followers, etc.
    schedule_type: str  # 'daily', 'weekly'
    schedule_time: str = "09:00"  # HH:MM in UTC
    day_of_week: Optional[str] = None  # For weekly: 'mon', 'tue', etc.
    enabled: bool = True


# ============== SCHEDULER STATUS ==============

@scheduler_router.get("/status")
async def get_status():
    """Get scheduler status and configuration"""
    return get_scheduler_status()


@scheduler_router.post("/start")
async def start():
    """Start the scheduler"""
    success = start_scheduler()
    if success:
        return {"message": "Scheduler started", "running": True}
    raise HTTPException(status_code=500, detail="Failed to start scheduler")


@scheduler_router.post("/shutdown")
async def shutdown():
    """Shutdown the scheduler"""
    success = shutdown_scheduler()
    if success:
        return {"message": "Scheduler stopped", "running": False}
    raise HTTPException(status_code=500, detail="Failed to stop scheduler")


# ============== JOB MANAGEMENT ==============

@scheduler_router.get("/jobs")
async def list_jobs():
    """List all scheduled jobs"""
    jobs = get_jobs()
    return {"jobs": jobs, "count": len(jobs)}


@scheduler_router.get("/jobs/{job_id}")
async def get_job_details(job_id: str):
    """Get details of a specific job"""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return job


@scheduler_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Remove a scheduled job"""
    success = remove_job(job_id)
    if success:
        return {"message": f"Job '{job_id}' removed"}
    raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")


@scheduler_router.post("/jobs/{job_id}/pause")
async def pause_scheduled_job(job_id: str):
    """Pause a scheduled job"""
    success = pause_job(job_id)
    if success:
        return {"message": f"Job '{job_id}' paused"}
    raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")


@scheduler_router.post("/jobs/{job_id}/resume")
async def resume_scheduled_job(job_id: str):
    """Resume a paused job"""
    success = resume_job(job_id)
    if success:
        return {"message": f"Job '{job_id}' resumed"}
    raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")


# ============== SCHEDULED DISCOVERY ==============

@scheduler_router.post("/discovery/schedule")
async def schedule_discovery_job(data: ScheduledSearch):
    """
    Schedule a recurring influencer discovery job
    
    This will automatically run discovery searches at scheduled times
    and save results to the database.
    """
    from server import db
    
    job_id = f"discovery_{uuid.uuid4().hex[:8]}"
    
    # Parse schedule time
    try:
        hour, minute = map(int, data.schedule_time.split(':'))
    except Exception:
        hour, minute = 9, 0
    
    # Create job record in database
    job_record = {
        "id": job_id,
        "name": data.name,
        "type": "discovery",
        "search_params": data.search_params,
        "schedule_type": data.schedule_type,
        "schedule_time": data.schedule_time,
        "day_of_week": data.day_of_week,
        "enabled": data.enabled,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_run": None,
        "run_count": 0
    }
    
    await db.scheduled_jobs.insert_one(job_record)
    del job_record["_id"]
    
    # Schedule the job if enabled
    if data.enabled:
        if data.schedule_type == 'daily':
            result = schedule_daily(
                func=run_discovery_job,
                job_id=job_id,
                hour=hour,
                minute=minute,
                kwargs={"job_id": job_id, "search_params": data.search_params}
            )
        elif data.schedule_type == 'weekly':
            result = schedule_weekly(
                func=run_discovery_job,
                job_id=job_id,
                day_of_week=data.day_of_week or 'mon',
                hour=hour,
                minute=minute,
                kwargs={"job_id": job_id, "search_params": data.search_params}
            )
        else:
            result = None
        
        if not result:
            job_record["scheduler_status"] = "failed_to_schedule"
        else:
            job_record["scheduler_status"] = "scheduled"
            job_record["next_run"] = result.get("next_run")
    
    return job_record


@scheduler_router.get("/discovery/jobs")
async def list_discovery_jobs():
    """List all scheduled discovery jobs"""
    from server import db
    
    jobs = await db.scheduled_jobs.find(
        {"type": "discovery"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"jobs": jobs, "count": len(jobs)}


@scheduler_router.delete("/discovery/{job_id}")
async def delete_discovery_job(job_id: str):
    """Delete a scheduled discovery job"""
    from server import db
    
    # Remove from scheduler
    remove_job(job_id)
    
    # Remove from database
    result = await db.scheduled_jobs.delete_one({"id": job_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Discovery job not found")
    
    return {"message": f"Discovery job '{job_id}' deleted"}


# ============== SCHEDULED SYNC ==============

@scheduler_router.post("/sync/schedule")
async def schedule_sync_job(
    name: str,
    sync_type: str = "social",  # 'social', 'azure_ad', 'all'
    schedule_type: str = "daily",
    hour: int = 6,
    minute: int = 0
):
    """
    Schedule a recurring data sync job
    
    sync_type:
        - 'social': Sync Instagram/YouTube metrics for all contacts
        - 'azure_ad': Sync users from Azure AD
        - 'all': Run all sync jobs
    """
    from server import db
    
    job_id = f"sync_{sync_type}_{uuid.uuid4().hex[:8]}"
    
    job_record = {
        "id": job_id,
        "name": name,
        "type": "sync",
        "sync_type": sync_type,
        "schedule_type": schedule_type,
        "hour": hour,
        "minute": minute,
        "enabled": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_run": None,
        "run_count": 0
    }
    
    await db.scheduled_jobs.insert_one(job_record)
    del job_record["_id"]
    
    # Schedule the job
    result = schedule_daily(
        func=run_sync_job,
        job_id=job_id,
        hour=hour,
        minute=minute,
        kwargs={"job_id": job_id, "sync_type": sync_type}
    )
    
    if result:
        job_record["scheduler_status"] = "scheduled"
        job_record["next_run"] = result.get("next_run")
    else:
        job_record["scheduler_status"] = "failed_to_schedule"
    
    return job_record


# ============== JOB EXECUTION FUNCTIONS ==============

async def run_discovery_job(job_id: str, search_params: Dict[str, Any]):
    """
    Execute a discovery job - find influencers based on search params
    This is called by the scheduler
    """
    from server import db
    from services.ai_service import generate_text
    
    try:
        # Update job status
        await db.scheduled_jobs.update_one(
            {"id": job_id},
            {
                "$set": {"last_run": datetime.now(timezone.utc).isoformat()},
                "$inc": {"run_count": 1}
            }
        )
        
        # Use AI to discover influencers based on search params
        industry = search_params.get("industry", "fashion")
        location = search_params.get("location", "India")
        min_followers = search_params.get("min_followers", 10000)
        
        prompt = f"""Find 10 influencers for this criteria:
        Industry: {industry}
        Location: {location}
        Minimum followers: {min_followers}
        
        Return a JSON array with: name, instagram_handle, estimated_followers, niche, why_recommended
        """
        
        result = await generate_text(
            prompt=prompt,
            system_message="You are an influencer marketing expert. Return only valid JSON."
        )
        
        if result.get("success"):
            # Parse and save results
            import json
            try:
                influencers = json.loads(result.get("text", "[]"))
                
                # Save discovery results
                discovery_record = {
                    "id": str(uuid.uuid4()),
                    "job_id": job_id,
                    "search_params": search_params,
                    "results": influencers,
                    "count": len(influencers),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.discovery_results.insert_one(discovery_record)
                
                return {"success": True, "count": len(influencers)}
            except json.JSONDecodeError:
                return {"success": False, "error": "Failed to parse AI response"}
        
        return {"success": False, "error": result.get("error")}
    
    except Exception as e:
        return {"success": False, "error": str(e)}


async def run_sync_job(job_id: str, sync_type: str):
    """
    Execute a sync job - sync social media data or Azure AD users
    """
    from server import db
    from services.social_api import get_social_profile_service
    
    try:
        # Update job status
        await db.scheduled_jobs.update_one(
            {"id": job_id},
            {
                "$set": {"last_run": datetime.now(timezone.utc).isoformat()},
                "$inc": {"run_count": 1}
            }
        )
        
        if sync_type == "social":
            # Sync social media data for all contacts with handles
            service = get_social_profile_service()
            
            contacts = await db.contacts.find({
                "$or": [
                    {"instagram_handle": {"$exists": True, "$ne": None}},
                    {"youtube_handle": {"$exists": True, "$ne": None}}
                ]
            }).to_list(100)
            
            synced = 0
            errors = 0
            
            for contact in contacts:
                try:
                    updates = {}
                    
                    # Sync Instagram
                    ig_handle = contact.get("instagram_handle")
                    if ig_handle:
                        ig_profile = service.fetch_profile("instagram", ig_handle)
                        if ig_profile:
                            updates["instagram_followers"] = ig_profile.get("followers", 0)
                            updates["instagram_engagement_rate"] = ig_profile.get("engagement_rate", 0)
                    
                    # Sync YouTube
                    yt_handle = contact.get("youtube_handle")
                    if yt_handle:
                        yt_profile = service.fetch_profile("youtube", yt_handle)
                        if yt_profile:
                            updates["youtube_subscribers"] = yt_profile.get("subscribers", 0)
                    
                    if updates:
                        updates["social_synced_at"] = datetime.now(timezone.utc).isoformat()
                        await db.contacts.update_one(
                            {"id": contact["id"]},
                            {"$set": updates}
                        )
                        synced += 1
                
                except Exception:
                    errors += 1
            
            # Log sync result
            sync_log = {
                "id": str(uuid.uuid4()),
                "job_id": job_id,
                "sync_type": sync_type,
                "synced": synced,
                "errors": errors,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.sync_logs.insert_one(sync_log)
            
            return {"success": True, "synced": synced, "errors": errors}
        
        return {"success": False, "error": f"Unknown sync type: {sync_type}"}
    
    except Exception as e:
        return {"success": False, "error": str(e)}


# ============== MANUAL TRIGGERS ==============

@scheduler_router.post("/run/{job_id}")
async def run_job_now(job_id: str, background_tasks: BackgroundTasks):
    """Manually trigger a scheduled job to run immediately"""
    from server import db
    
    job = await db.scheduled_jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_type = job.get("type")
    
    if job_type == "discovery":
        background_tasks.add_task(
            run_discovery_job,
            job_id=job_id,
            search_params=job.get("search_params", {})
        )
    elif job_type == "sync":
        background_tasks.add_task(
            run_sync_job,
            job_id=job_id,
            sync_type=job.get("sync_type", "social")
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unknown job type: {job_type}")
    
    return {"message": f"Job '{job_id}' triggered", "status": "running"}


@scheduler_router.get("/history/{job_id}")
async def get_job_history(job_id: str, limit: int = 20):
    """Get execution history for a job"""
    from server import db
    
    # Check discovery results
    discovery_results = await db.discovery_results.find(
        {"job_id": job_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Check sync logs
    sync_logs = await db.sync_logs.find(
        {"job_id": job_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "job_id": job_id,
        "discovery_results": discovery_results,
        "sync_logs": sync_logs
    }
