"""
APScheduler Service - Background Jobs for Scheduled Discovery & Tasks
Uses MongoDB for job persistence
"""
import os
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Callable, List
from pymongo import MongoClient

logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "app_database")

# APScheduler imports
APSCHEDULER_AVAILABLE = False
scheduler = None

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.jobstores.mongodb import MongoDBJobStore
    from apscheduler.executors.pool import ThreadPoolExecutor, ProcessPoolExecutor
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger
    from apscheduler.triggers.date import DateTrigger
    APSCHEDULER_AVAILABLE = True
except ImportError:
    logger.warning("APScheduler not installed. Background jobs disabled.")


def _init_scheduler():
    """Initialize the scheduler with MongoDB job store"""
    global scheduler
    
    if not APSCHEDULER_AVAILABLE:
        logger.error("APScheduler not available")
        return None
    
    if scheduler is not None:
        return scheduler
    
    try:
        # Configure job stores (MongoDB for persistence)
        jobstores = {
            'default': MongoDBJobStore(
                database=DB_NAME,
                collection='apscheduler_jobs',
                client=MongoClient(MONGO_URL)
            )
        }
        
        executors = {
            'default': ThreadPoolExecutor(10),
            'processpool': ProcessPoolExecutor(3)
        }
        
        job_defaults = {
            'coalesce': True,  # Combine missed runs into one
            'max_instances': 1,  # Only one instance at a time
            'misfire_grace_time': 3600  # 1 hour grace for missed jobs
        }
        
        scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone='UTC'
        )
        
        logger.info("APScheduler initialized with MongoDB job store")
        return scheduler
    except Exception as e:
        logger.error(f"Failed to initialize scheduler: {e}")
        return None


def start_scheduler():
    """Start the scheduler"""
    global scheduler
    
    if not APSCHEDULER_AVAILABLE:
        logger.warning("APScheduler not available - skipping start")
        return False
    
    if scheduler is None:
        scheduler = _init_scheduler()
    
    if scheduler and not scheduler.running:
        try:
            scheduler.start()
            logger.info("APScheduler started")
            return True
        except Exception as e:
            logger.error(f"Failed to start scheduler: {e}")
            return False
    
    return scheduler is not None and scheduler.running


def shutdown_scheduler():
    """Shutdown the scheduler gracefully"""
    global scheduler
    
    if scheduler and scheduler.running:
        try:
            scheduler.shutdown(wait=True)
            logger.info("APScheduler shut down")
            return True
        except Exception as e:
            logger.error(f"Error shutting down scheduler: {e}")
            return False
    return True


def get_scheduler_status() -> Dict[str, Any]:
    """Get scheduler status and configuration"""
    global scheduler
    
    if not APSCHEDULER_AVAILABLE:
        return {
            "available": False,
            "running": False,
            "reason": "APScheduler not installed"
        }
    
    if scheduler is None:
        return {
            "available": True,
            "running": False,
            "reason": "Scheduler not initialized"
        }
    
    return {
        "available": True,
        "running": scheduler.running,
        "job_count": len(scheduler.get_jobs()) if scheduler.running else 0
    }


def add_job(
    func: Callable,
    trigger: str,
    job_id: str,
    trigger_args: Dict[str, Any] = None,
    **kwargs
) -> Optional[Dict[str, Any]]:
    """
    Add a new scheduled job
    
    Args:
        func: The function to execute
        trigger: Type of trigger ('cron', 'interval', 'date')
        job_id: Unique job identifier
        trigger_args: Arguments for the trigger
        **kwargs: Additional arguments for add_job (e.g., args, kwargs for the function)
    
    Returns:
        Job info dict or None if failed
    
    Examples:
        # Daily at 9 AM
        add_job(my_func, 'cron', 'daily_job', {'hour': 9, 'minute': 0})
        
        # Every 30 minutes
        add_job(my_func, 'interval', 'interval_job', {'minutes': 30})
        
        # One-time at specific date
        add_job(my_func, 'date', 'onetime_job', {'run_date': '2024-03-15 10:00:00'})
    """
    global scheduler
    
    if not APSCHEDULER_AVAILABLE or scheduler is None:
        logger.error("Scheduler not available")
        return None
    
    trigger_args = trigger_args or {}
    
    try:
        # Remove existing job if present
        existing = scheduler.get_job(job_id)
        if existing:
            scheduler.remove_job(job_id)
            logger.info(f"Removed existing job: {job_id}")
        
        # Create trigger
        if trigger == 'cron':
            trigger_obj = CronTrigger(**trigger_args)
        elif trigger == 'interval':
            trigger_obj = IntervalTrigger(**trigger_args)
        elif trigger == 'date':
            trigger_obj = DateTrigger(**trigger_args)
        else:
            logger.error(f"Unknown trigger type: {trigger}")
            return None
        
        # Add job
        job = scheduler.add_job(
            func,
            trigger=trigger_obj,
            id=job_id,
            replace_existing=True,
            **kwargs
        )
        
        logger.info(f"Job {job_id} added with trigger: {trigger}")
        
        return {
            "id": job.id,
            "name": job.name,
            "trigger": str(job.trigger),
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None
        }
    except Exception as e:
        logger.error(f"Failed to add job {job_id}: {e}")
        return None


def remove_job(job_id: str) -> bool:
    """Remove a scheduled job"""
    global scheduler
    
    if scheduler is None:
        return False
    
    try:
        scheduler.remove_job(job_id)
        logger.info(f"Job {job_id} removed")
        return True
    except Exception as e:
        logger.error(f"Failed to remove job {job_id}: {e}")
        return False


def pause_job(job_id: str) -> bool:
    """Pause a scheduled job"""
    global scheduler
    
    if scheduler is None:
        return False
    
    try:
        scheduler.pause_job(job_id)
        logger.info(f"Job {job_id} paused")
        return True
    except Exception as e:
        logger.error(f"Failed to pause job {job_id}: {e}")
        return False


def resume_job(job_id: str) -> bool:
    """Resume a paused job"""
    global scheduler
    
    if scheduler is None:
        return False
    
    try:
        scheduler.resume_job(job_id)
        logger.info(f"Job {job_id} resumed")
        return True
    except Exception as e:
        logger.error(f"Failed to resume job {job_id}: {e}")
        return False


def get_jobs() -> List[Dict[str, Any]]:
    """Get all scheduled jobs"""
    global scheduler
    
    if scheduler is None or not scheduler.running:
        return []
    
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "trigger": str(job.trigger),
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            "pending": job.pending
        })
    
    return jobs


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific job by ID"""
    global scheduler
    
    if scheduler is None:
        return None
    
    try:
        job = scheduler.get_job(job_id)
        if job:
            return {
                "id": job.id,
                "name": job.name,
                "trigger": str(job.trigger),
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "pending": job.pending
            }
        return None
    except Exception as e:
        logger.error(f"Failed to get job {job_id}: {e}")
        return None


# ============== HELPER FUNCTIONS FOR COMMON SCHEDULES ==============

def schedule_daily(func: Callable, job_id: str, hour: int = 9, minute: int = 0, **kwargs) -> Optional[Dict[str, Any]]:
    """Schedule a job to run daily at specified time (UTC)"""
    return add_job(
        func=func,
        trigger='cron',
        job_id=job_id,
        trigger_args={'hour': hour, 'minute': minute},
        **kwargs
    )


def schedule_weekly(
    func: Callable, 
    job_id: str, 
    day_of_week: str = 'mon', 
    hour: int = 9, 
    minute: int = 0,
    **kwargs
) -> Optional[Dict[str, Any]]:
    """Schedule a job to run weekly on specified day (UTC)"""
    return add_job(
        func=func,
        trigger='cron',
        job_id=job_id,
        trigger_args={'day_of_week': day_of_week, 'hour': hour, 'minute': minute},
        **kwargs
    )


def schedule_interval(
    func: Callable,
    job_id: str,
    hours: int = 0,
    minutes: int = 0,
    seconds: int = 0,
    **kwargs
) -> Optional[Dict[str, Any]]:
    """Schedule a job to run at regular intervals"""
    trigger_args = {}
    if hours > 0:
        trigger_args['hours'] = hours
    if minutes > 0:
        trigger_args['minutes'] = minutes
    if seconds > 0:
        trigger_args['seconds'] = seconds
    
    if not trigger_args:
        trigger_args['hours'] = 1  # Default to 1 hour
    
    return add_job(
        func=func,
        trigger='interval',
        job_id=job_id,
        trigger_args=trigger_args,
        **kwargs
    )


def schedule_once(func: Callable, job_id: str, run_date: str, **kwargs) -> Optional[Dict[str, Any]]:
    """Schedule a one-time job at specified datetime"""
    return add_job(
        func=func,
        trigger='date',
        job_id=job_id,
        trigger_args={'run_date': run_date},
        **kwargs
    )


# ============== OBJECTIVE DEADLINE NOTIFICATIONS ==============

async def process_objective_deadline_notifications():
    """Process objective deadline notifications and send to owners"""
    from motor.motor_asyncio import AsyncIOMotorClient
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        now = datetime.now(timezone.utc)
        
        # Get objectives that are not completed and have target dates
        objectives = await db.objectives.find({
            "status": {"$nin": ["completed", "archived"]},
            "target_date": {"$ne": None}
        }).to_list(500)
        
        for obj in objectives:
            try:
                target_date = obj.get("target_date")
                if not target_date:
                    continue
                
                # Ensure target_date is datetime
                if isinstance(target_date, str):
                    target_date = datetime.fromisoformat(target_date.replace('Z', '+00:00'))
                
                owner_id = obj.get("owner_id")
                if not owner_id:
                    continue
                
                obj_id = str(obj["_id"])
                obj_title = obj.get("title", "Unknown Objective")
                
                # Check if notification was already sent today for this objective
                notification_key = f"objective_deadline_{obj_id}"
                today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
                
                existing_notification = await db.notifications.find_one({
                    "metadata.notification_key": notification_key,
                    "created_at": {"$gte": today_start.isoformat()}
                })
                
                if existing_notification:
                    continue
                
                # Determine notification type and message
                days_until_deadline = (target_date - now).days
                
                if days_until_deadline < 0:
                    # Overdue
                    days_overdue = abs(days_until_deadline)
                    title = f"Objective Overdue: {obj_title}"
                    message = f"This objective is {days_overdue} day{'s' if days_overdue > 1 else ''} overdue. Please update the status or adjust the timeline."
                    priority = NotificationPriority.URGENT
                elif days_until_deadline <= 3:
                    # Due soon (within 3 days)
                    title = f"Objective Due Soon: {obj_title}"
                    message = f"This objective is due in {days_until_deadline} day{'s' if days_until_deadline > 1 else ''}. Current progress: {obj.get('progress', 0):.0f}%"
                    priority = NotificationPriority.HIGH
                elif days_until_deadline <= 7:
                    # Upcoming (within 7 days)
                    title = f"Upcoming Deadline: {obj_title}"
                    message = f"This objective is due in {days_until_deadline} days. Current progress: {obj.get('progress', 0):.0f}%"
                    priority = NotificationPriority.MEDIUM
                else:
                    continue  # Don't notify for deadlines more than 7 days away
                
                # Create notification
                await create_notification(
                    user_id=owner_id,
                    notification_type=NotificationType.TASK_DUE,
                    category=NotificationCategory.TASK,
                    title=title,
                    message=message,
                    priority=priority,
                    entity_type="objective",
                    entity_id=obj_id,
                    action_url=f"/goals/objectives/{obj_id}",
                    metadata={
                        "objective_title": obj_title,
                        "target_date": target_date.isoformat() if isinstance(target_date, datetime) else target_date,
                        "days_until_deadline": days_until_deadline,
                        "progress": obj.get("progress", 0),
                        "notification_key": notification_key
                    }
                )
                
                logger.info(f"Sent deadline notification for objective {obj_id} to user {owner_id}")
                
            except Exception as e:
                logger.error(f"Error processing objective {obj.get('_id')}: {e}")
        
        client.close()
        
    except Exception as e:
        logger.error(f"Error in process_objective_deadline_notifications: {e}")


def setup_objective_deadline_job():
    """Setup the objective deadline notification job to run daily at 9 AM UTC"""
    global scheduler
    
    if not APSCHEDULER_AVAILABLE or scheduler is None:
        logger.warning("Cannot setup objective deadline job - scheduler not available")
        return
    
    job_id = "process_objective_deadlines"
    
    # Remove existing job if present
    try:
        scheduler.remove_job(job_id)
    except:
        pass
    
    # Add new job - runs daily at 9 AM UTC
    add_job(
        func=process_objective_deadline_notifications,
        trigger='cron',
        job_id=job_id,
        trigger_args={'hour': 9, 'minute': 0},
        replace_existing=True
    )
    
    logger.info("Objective deadline notification job scheduled (daily at 9 AM UTC)")


# ============== TASK REMINDER PROCESSING ==============

async def process_task_reminders():
    """Process due task reminders and send notifications"""
    from motor.motor_asyncio import AsyncIOMotorClient
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Find reminders that are due and not sent
        due_reminders = await db.task_reminders.find({
            "remind_at": {"$lte": now},
            "is_sent": False
        }, {"_id": 0}).to_list(100)
        
        for reminder in due_reminders:
            try:
                # Get task details
                task = await db.pm_tasks.find_one(
                    {"id": reminder["task_id"]}, 
                    {"_id": 0, "name": 1, "project_id": 1, "assigned_to": 1, "status": 1}
                )
                
                if task:
                    # Create notification
                    message = reminder.get("message") or f"Follow-up reminder for task: {task.get('name', 'Unknown')}"
                    action_url = f"/projects/{task.get('project_id')}?task={reminder['task_id']}" if task.get('project_id') else "/projects/my-tasks"
                    
                    await create_notification(
                        user_id=reminder["user_id"],
                        notification_type=NotificationType.TASK_DUE,
                        category=NotificationCategory.TASK,
                        title="Task Follow-up Reminder",
                        message=message,
                        priority=NotificationPriority.HIGH,
                        entity_type="task",
                        entity_id=reminder["task_id"],
                        action_url=action_url,
                        metadata={
                            "task_name": task.get("name"),
                            "task_status": task.get("status"),
                            "reminder_id": reminder["id"]
                        }
                    )
                
                # Mark reminder as sent
                await db.task_reminders.update_one(
                    {"id": reminder["id"]},
                    {"$set": {"is_sent": True, "sent_at": now}}
                )
                
                logger.info(f"Processed task reminder {reminder['id']}")
                
            except Exception as e:
                logger.error(f"Error processing reminder {reminder['id']}: {e}")
        
        client.close()
        
    except Exception as e:
        logger.error(f"Error in process_task_reminders: {e}")


def setup_reminder_job():
    """Setup the task reminder processing job to run every 5 minutes"""
    global scheduler
    
    if not APSCHEDULER_AVAILABLE or scheduler is None:
        logger.warning("Cannot setup reminder job - scheduler not available")
        return
    
    job_id = "process_task_reminders"
    
    # Remove existing job if present
    try:
        scheduler.remove_job(job_id)
    except:
        pass
    
    # Add new job
    add_job(
        func=process_task_reminders,
        trigger='interval',
        job_id=job_id,
        trigger_args={'minutes': 5},
        replace_existing=True
    )
    
    logger.info("Task reminder processing job scheduled (every 5 minutes)")
    
    # Also setup objective deadline notifications
    setup_objective_deadline_job()
