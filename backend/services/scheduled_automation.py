"""
Scheduled Automation Jobs - Daily/Weekly automated checks and notifications

Jobs included:
- Daily: Stale lead reminders, upcoming deadlines, task digests
- Weekly: Progress reports, campaign performance digests
"""
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

# Will be initialized from server.py
db = None


def init_scheduled_automation(database):
    """Initialize with database connection"""
    global db
    db = database


# ============== DAILY JOBS ==============

async def run_daily_stale_lead_check():
    """
    Check for leads with no activity in X days and send reminders
    Default: 5 days for warning, 10 days for urgent
    """
    from services.automation_triggers import trigger_stale_lead_reminder
    
    if db is None:
        logger.warning("Database not initialized for scheduled automation")
        return {"processed": 0, "errors": []}
    
    now = datetime.now(timezone.utc)
    processed = 0
    errors = []
    
    # Check for stale leads (no update in 5+ days, not closed)
    stale_threshold = now - timedelta(days=5)
    
    try:
        stale_leads = await db.leads.find({
            "stage": {"$nin": ["Closed Lost", "Order Confirmed", "Closed Won"]},
            "updated_at": {"$lt": stale_threshold.isoformat()}
        }, {"_id": 0, "id": 1, "name": 1, "updated_at": 1}).to_list(100)
        
        for lead in stale_leads:
            try:
                last_update = datetime.fromisoformat(lead["updated_at"].replace('Z', '+00:00'))
                days_stale = (now - last_update).days
                
                await trigger_stale_lead_reminder(
                    lead_id=lead["id"],
                    lead_name=lead["name"],
                    days_stale=days_stale,
                    last_activity_date=lead["updated_at"]
                )
                processed += 1
            except Exception as e:
                errors.append(f"Lead {lead['id']}: {str(e)}")
        
        logger.info(f"Stale lead check: {processed} leads processed, {len(errors)} errors")
    except Exception as e:
        logger.error(f"Stale lead check failed: {e}")
        errors.append(str(e))
    
    return {"processed": processed, "errors": errors}


async def run_daily_deadline_check():
    """
    Check for upcoming deadlines (campaigns, tasks, deliveries) and send reminders
    """
    from services.automation_triggers import (
        trigger_campaign_deadline_approaching,
        trigger_supplier_delivery_due
    )
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    if db is None:
        return {"processed": 0, "errors": []}
    
    now = datetime.now(timezone.utc)
    processed = 0
    errors = []
    
    # Check campaign deadlines (3 days and 1 day before)
    for days_before in [3, 1]:
        target_date = now + timedelta(days=days_before)
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        try:
            # Influencer campaigns
            campaigns = await db.marketing_campaigns.find({
                "status": {"$nin": ["completed", "cancelled"]},
                "end_date": {
                    "$gte": start_of_day.isoformat(),
                    "$lte": end_of_day.isoformat()
                }
            }, {"_id": 0, "id": 1, "name": 1, "end_date": 1}).to_list(50)
            
            for campaign in campaigns:
                try:
                    await trigger_campaign_deadline_approaching(
                        campaign_id=campaign["id"],
                        campaign_name=campaign["name"],
                        deadline=campaign["end_date"],
                        campaign_type="influencer"
                    )
                    processed += 1
                except Exception as e:
                    errors.append(f"Campaign {campaign['id']}: {str(e)}")
            
            # PR campaigns
            pr_campaigns = await db.pr_campaigns.find({
                "status": {"$nin": ["completed", "cancelled"]},
                "end_date": {
                    "$gte": start_of_day.isoformat(),
                    "$lte": end_of_day.isoformat()
                }
            }, {"_id": 0, "id": 1, "name": 1, "end_date": 1}).to_list(50)
            
            for campaign in pr_campaigns:
                try:
                    await trigger_campaign_deadline_approaching(
                        campaign_id=campaign["id"],
                        campaign_name=campaign["name"],
                        deadline=campaign["end_date"],
                        campaign_type="pr"
                    )
                    processed += 1
                except Exception as e:
                    errors.append(f"PR Campaign {campaign['id']}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Campaign deadline check failed: {e}")
            errors.append(str(e))
    
    # Check task due dates
    for days_before in [3, 1, 0]:
        target_date = now + timedelta(days=days_before)
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        try:
            tasks = await db.unified_tasks.find({
                "status": {"$nin": ["completed", "cancelled"]},
                "due_date": {
                    "$gte": start_of_day.isoformat(),
                    "$lte": end_of_day.isoformat()
                }
            }, {"_id": 0, "id": 1, "title": 1, "due_date": 1, "assigned_to": 1}).to_list(100)
            
            for task in tasks:
                if task.get("assigned_to"):
                    try:
                        priority = NotificationPriority.HIGH if days_before == 0 else NotificationPriority.MEDIUM
                        title = "Task Due Today" if days_before == 0 else f"Task Due in {days_before} day{'s' if days_before > 1 else ''}"
                        
                        await create_notification(
                            user_id=task["assigned_to"],
                            notification_type=NotificationType.TASK_DUE_SOON,
                            category=NotificationCategory.TASK,
                            title=title,
                            message=f"'{task['title']}' is due soon",
                            priority=priority,
                            entity_type="task",
                            entity_id=task["id"],
                            action_url=f"/tasks?id={task['id']}",
                            metadata={"due_date": task["due_date"], "days_until": days_before}
                        )
                        processed += 1
                    except Exception as e:
                        errors.append(f"Task {task['id']}: {str(e)}")
        except Exception as e:
            logger.error(f"Task deadline check failed: {e}")
            errors.append(str(e))
    
    logger.info(f"Deadline check: {processed} items processed, {len(errors)} errors")
    return {"processed": processed, "errors": errors}


async def run_daily_lead_followup_check():
    """
    Check for lead follow-ups due today and send reminders
    """
    from services.automation_triggers import trigger_lead_followup_due
    
    if db is None:
        return {"processed": 0, "errors": []}
    
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    processed = 0
    errors = []
    
    try:
        # Find leads with follow-up due today
        leads = await db.leads.find({
            "next_followup_date": {
                "$gte": start_of_day.isoformat(),
                "$lte": end_of_day.isoformat()
            },
            "stage": {"$nin": ["Closed Lost", "Order Confirmed"]}
        }, {"_id": 0, "id": 1, "name": 1, "next_followup_date": 1, "followup_notes": 1}).to_list(100)
        
        for lead in leads:
            try:
                await trigger_lead_followup_due(
                    lead_id=lead["id"],
                    lead_name=lead["name"],
                    followup_date=lead["next_followup_date"],
                    followup_note=lead.get("followup_notes")
                )
                processed += 1
            except Exception as e:
                errors.append(f"Lead {lead['id']}: {str(e)}")
    except Exception as e:
        logger.error(f"Lead follow-up check failed: {e}")
        errors.append(str(e))
    
    logger.info(f"Lead follow-up check: {processed} leads processed, {len(errors)} errors")
    return {"processed": processed, "errors": errors}


async def run_daily_task_digest():
    """
    Send daily task digest email to all active users
    Includes: Overdue tasks, due today, due this week
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    if db is None:
        return {"processed": 0, "errors": []}
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    week_end = today_start + timedelta(days=7)
    
    processed = 0
    errors = []
    
    try:
        # Get all active users
        users = await db.users.find({"status": "active"}, {"_id": 0, "id": 1, "name": 1}).to_list(500)
        
        for user in users:
            try:
                user_id = user["id"]
                
                # Get user's tasks
                overdue_tasks = await db.unified_tasks.count_documents({
                    "$or": [{"assigned_to": user_id}, {"created_by": user_id}],
                    "status": {"$nin": ["completed", "cancelled"]},
                    "due_date": {"$lt": today_start.isoformat()}
                })
                
                due_today = await db.unified_tasks.count_documents({
                    "$or": [{"assigned_to": user_id}, {"created_by": user_id}],
                    "status": {"$nin": ["completed", "cancelled"]},
                    "due_date": {"$gte": today_start.isoformat(), "$lte": today_end.isoformat()}
                })
                
                due_this_week = await db.unified_tasks.count_documents({
                    "$or": [{"assigned_to": user_id}, {"created_by": user_id}],
                    "status": {"$nin": ["completed", "cancelled"]},
                    "due_date": {"$gt": today_end.isoformat(), "$lte": week_end.isoformat()}
                })
                
                total_pending = overdue_tasks + due_today + due_this_week
                
                # Only send digest if user has tasks
                if total_pending > 0:
                    message_parts = []
                    if overdue_tasks > 0:
                        message_parts.append(f"⚠️ {overdue_tasks} overdue")
                    if due_today > 0:
                        message_parts.append(f"📅 {due_today} due today")
                    if due_this_week > 0:
                        message_parts.append(f"📆 {due_this_week} due this week")
                    
                    await create_notification(
                        user_id=user_id,
                        notification_type=NotificationType.DAILY_TASK_DIGEST,
                        category=NotificationCategory.DIGEST,
                        title=f"Daily Task Summary: {total_pending} tasks",
                        message=" | ".join(message_parts),
                        priority=NotificationPriority.HIGH if overdue_tasks > 0 else NotificationPriority.MEDIUM,
                        action_url="/tasks",
                        metadata={
                            "overdue": overdue_tasks,
                            "due_today": due_today,
                            "due_this_week": due_this_week,
                            "total": total_pending
                        }
                    )
                    processed += 1
            except Exception as e:
                errors.append(f"User {user['id']}: {str(e)}")
    except Exception as e:
        logger.error(f"Daily task digest failed: {e}")
        errors.append(str(e))
    
    logger.info(f"Daily task digest: {processed} users notified, {len(errors)} errors")
    return {"processed": processed, "errors": errors}


# ============== WEEKLY JOBS ==============

async def run_weekly_progress_report():
    """
    Send weekly progress report to all users on Monday morning
    Includes: Tasks completed, projects progress, goals status
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    if db is None:
        return {"processed": 0, "errors": []}
    
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    
    processed = 0
    errors = []
    
    try:
        users = await db.users.find({"status": "active"}, {"_id": 0, "id": 1, "name": 1}).to_list(500)
        
        for user in users:
            try:
                user_id = user["id"]
                
                # Tasks completed this week
                tasks_completed = await db.unified_tasks.count_documents({
                    "$or": [{"assigned_to": user_id}, {"created_by": user_id}],
                    "status": "completed",
                    "updated_at": {"$gte": week_ago.isoformat()}
                })
                
                # Tasks created
                tasks_created = await db.unified_tasks.count_documents({
                    "created_by": user_id,
                    "created_at": {"$gte": week_ago.isoformat()}
                })
                
                # Currently pending
                tasks_pending = await db.unified_tasks.count_documents({
                    "$or": [{"assigned_to": user_id}, {"created_by": user_id}],
                    "status": {"$in": ["pending", "in_progress"]}
                })
                
                message = f"✅ {tasks_completed} completed | 📝 {tasks_created} created | ⏳ {tasks_pending} pending"
                
                await create_notification(
                    user_id=user_id,
                    notification_type=NotificationType.WEEKLY_PROGRESS_REPORT,
                    category=NotificationCategory.DIGEST,
                    title="Weekly Progress Report",
                    message=message,
                    priority=NotificationPriority.LOW,
                    action_url="/tasks",
                    metadata={
                        "tasks_completed": tasks_completed,
                        "tasks_created": tasks_created,
                        "tasks_pending": tasks_pending,
                        "week_start": week_ago.isoformat(),
                        "week_end": now.isoformat()
                    }
                )
                processed += 1
            except Exception as e:
                errors.append(f"User {user['id']}: {str(e)}")
    except Exception as e:
        logger.error(f"Weekly progress report failed: {e}")
        errors.append(str(e))
    
    logger.info(f"Weekly progress report: {processed} users notified, {len(errors)} errors")
    return {"processed": processed, "errors": errors}


async def run_weekly_campaign_digest():
    """
    Send weekly campaign performance digest to marketing team
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    if db is None:
        return {"processed": 0, "errors": []}
    
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    
    processed = 0
    errors = []
    
    try:
        # Get campaign stats
        active_campaigns = await db.marketing_campaigns.count_documents({
            "status": {"$in": ["active", "in_progress"]}
        })
        
        campaigns_launched = await db.marketing_campaigns.count_documents({
            "created_at": {"$gte": week_ago.isoformat()}
        })
        
        campaigns_completed = await db.marketing_campaigns.count_documents({
            "status": "completed",
            "updated_at": {"$gte": week_ago.isoformat()}
        })
        
        # Get users with marketing access
        marketing_users = await db.users.find({
            "status": "active",
            "$or": [
                {"role": {"$in": ["super_admin", "admin"]}},
                {"departments": {"$in": ["marketing"]}},
                {"module_permissions.marketing_ops": {"$exists": True}}
            ]
        }, {"_id": 0, "id": 1}).to_list(100)
        
        for user in marketing_users:
            try:
                await create_notification(
                    user_id=user["id"],
                    notification_type=NotificationType.CAMPAIGN_PERFORMANCE_DIGEST,
                    category=NotificationCategory.MARKETING,
                    title="Weekly Campaign Digest",
                    message=f"📊 {active_campaigns} active | 🚀 {campaigns_launched} launched | ✅ {campaigns_completed} completed",
                    priority=NotificationPriority.LOW,
                    action_url="/marketing/campaigns",
                    metadata={
                        "active_campaigns": active_campaigns,
                        "campaigns_launched": campaigns_launched,
                        "campaigns_completed": campaigns_completed
                    }
                )
                processed += 1
            except Exception as e:
                errors.append(f"User {user['id']}: {str(e)}")
    except Exception as e:
        logger.error(f"Weekly campaign digest failed: {e}")
        errors.append(str(e))
    
    logger.info(f"Weekly campaign digest: {processed} users notified, {len(errors)} errors")
    return {"processed": processed, "errors": errors}


# ============== MASTER SCHEDULER FUNCTIONS ==============

async def run_all_daily_jobs():
    """Run all daily automation jobs"""
    results = {
        "stale_leads": await run_daily_stale_lead_check(),
        "deadlines": await run_daily_deadline_check(),
        "followups": await run_daily_lead_followup_check(),
        "task_digest": await run_daily_task_digest()
    }
    
    total_processed = sum(r.get("processed", 0) for r in results.values())
    total_errors = sum(len(r.get("errors", [])) for r in results.values())
    
    logger.info(f"Daily automation complete: {total_processed} total processed, {total_errors} total errors")
    return results


async def run_all_weekly_jobs():
    """Run all weekly automation jobs"""
    results = {
        "progress_report": await run_weekly_progress_report(),
        "campaign_digest": await run_weekly_campaign_digest()
    }
    
    total_processed = sum(r.get("processed", 0) for r in results.values())
    total_errors = sum(len(r.get("errors", [])) for r in results.values())
    
    logger.info(f"Weekly automation complete: {total_processed} total processed, {total_errors} total errors")
    return results
