"""
Automation Service - Phase 1 Automations for Goals, Projects & Communication Hub
- Progress Cascade: Task -> Project -> Objective -> Goal
- Overdue Task Alerts: Daily notifications for overdue tasks
- Meeting Reminders: 24h/1h/15min notifications before meetings
- Action Item to Task: Auto-convert meeting action items to tasks
"""
import logging
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Any
from bson import ObjectId

logger = logging.getLogger(__name__)

# Will be initialized from server.py
db = None
notification_service = None
email_service = None
teams_service = None

# Default settings for new automation categories
DEFAULT_GOALS_PROJECTS_SETTINGS = {
    "progress_cascade": {
        "enabled": True,
        "description": "Automatically update project, objective, and goal progress when tasks are completed"
    },
    "overdue_task_alert": {
        "enabled": True,
        "description": "Send notifications for overdue tasks",
        "check_time": "08:00",
        "notify_assignee": True,
        "notify_manager": True,
        "channels": {
            "in_app": True,
            "email": True,
            "teams": False
        }
    },
    "task_deadline_reminder": {
        "enabled": True,
        "description": "Remind users about upcoming task deadlines",
        "days_before": [3, 1],
        "channels": {
            "in_app": True,
            "email": False,
            "teams": False
        }
    }
}

DEFAULT_COMMUNICATION_SETTINGS = {
    "meeting_reminder": {
        "enabled": True,
        "description": "Send reminders before meetings",
        "remind_at": [1440, 60, 15],  # minutes before: 24h, 1h, 15min
        "channels": {
            "in_app": True,
            "email": True,
            "teams": False
        }
    },
    "action_item_to_task": {
        "enabled": True,
        "description": "Automatically create tasks from meeting action items",
        "auto_assign": True,
        "default_priority": "medium"
    },
    "overdue_action_item": {
        "enabled": True,
        "description": "Alert when action items are overdue",
        "escalate_after_days": 3,
        "channels": {
            "in_app": True,
            "email": True,
            "teams": False
        }
    }
}


def init_automation_service(database, notif_service=None, email_svc=None, teams_svc=None):
    """Initialize the automation service with dependencies"""
    global db, notification_service, email_service, teams_service
    db = database
    notification_service = notif_service
    email_service = email_svc
    teams_service = teams_svc
    logger.info("Automation service initialized")


async def get_automation_settings():
    """Get all automation settings including new categories"""
    settings_doc = await db.automation_settings.find_one({"type": "global"}, {"_id": 0})
    
    if not settings_doc:
        return {
            "goals_projects": DEFAULT_GOALS_PROJECTS_SETTINGS,
            "communication": DEFAULT_COMMUNICATION_SETTINGS
        }
    
    settings = settings_doc.get("settings", {})
    
    # Ensure new categories exist with defaults
    if "goals_projects" not in settings:
        settings["goals_projects"] = DEFAULT_GOALS_PROJECTS_SETTINGS
    if "communication" not in settings:
        settings["communication"] = DEFAULT_COMMUNICATION_SETTINGS
    
    return settings


# ============== PROGRESS CASCADE ==============

async def cascade_progress_on_task_complete(task_id: str, project_id: str = None):
    """
    When a task is completed, cascade the progress update:
    Task -> Project -> Objective -> Goal
    """
    settings = await get_automation_settings()
    if not settings.get("goals_projects", {}).get("progress_cascade", {}).get("enabled", True):
        return
    
    try:
        # Get task to find project
        task = await db.pm_tasks.find_one({"id": task_id})
        if not task:
            return
        
        proj_id = project_id or task.get("project_id")
        if not proj_id:
            return
        
        # Update project progress
        project = await db.pm_projects.find_one({"id": proj_id})
        if not project:
            return
        
        # Calculate new project progress
        total_tasks = await db.pm_tasks.count_documents({"project_id": proj_id})
        completed_tasks = await db.pm_tasks.count_documents({
            "project_id": proj_id,
            "status": {"$in": ["done", "completed"]}
        })
        
        new_progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # Update project
        await db.pm_projects.update_one(
            {"id": proj_id},
            {"$set": {
                "progress": new_progress,
                "completed_task_count": completed_tasks,
                "task_count": total_tasks,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # If project is linked to an objective, update objective progress
        objective_id = project.get("linked_objective_id")
        if objective_id:
            await update_objective_progress(objective_id)
        
        # Log the automation
        await log_automation_action("progress_cascade", {
            "task_id": task_id,
            "project_id": proj_id,
            "new_progress": new_progress,
            "objective_id": objective_id
        })
        
        logger.info(f"Progress cascade completed: Project {proj_id} now at {new_progress:.1f}%")
        
    except Exception as e:
        logger.error(f"Progress cascade failed: {e}")


async def update_objective_progress(objective_id: str):
    """Update objective progress based on linked projects"""
    try:
        # Find all projects linked to this objective
        projects = await db.pm_projects.find(
            {"linked_objective_id": objective_id},
            {"_id": 0, "progress": 1}
        ).to_list(100)
        
        if not projects:
            return
        
        # Average progress of all linked projects
        avg_progress = sum(p.get("progress", 0) for p in projects) / len(projects)
        
        # Update objective
        await db.objectives.update_one(
            {"_id": ObjectId(objective_id)},
            {"$set": {
                "progress": avg_progress,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Get objective to find linked goal
        objective = await db.objectives.find_one({"_id": ObjectId(objective_id)})
        if objective and objective.get("strategic_goal_id"):
            await update_goal_progress(objective["strategic_goal_id"])
        
    except Exception as e:
        logger.error(f"Objective progress update failed: {e}")


async def update_goal_progress(goal_id: str):
    """Update goal progress based on linked objectives"""
    try:
        # Find all objectives linked to this goal
        objectives = await db.objectives.find(
            {"strategic_goal_id": goal_id},
            {"_id": 0, "progress": 1}
        ).to_list(100)
        
        if not objectives:
            return
        
        # Average progress of all objectives
        avg_progress = sum(o.get("progress", 0) for o in objectives) / len(objectives)
        
        # Update goal
        await db.strategic_goals.update_one(
            {"_id": ObjectId(goal_id)},
            {"$set": {
                "progress": avg_progress,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
    except Exception as e:
        logger.error(f"Goal progress update failed: {e}")


# ============== OVERDUE TASK ALERTS ==============

async def check_overdue_tasks():
    """
    Daily job to check for overdue tasks and send notifications.
    Called by scheduler at configured time (default 8 AM).
    """
    settings = await get_automation_settings()
    task_settings = settings.get("goals_projects", {}).get("overdue_task_alert", {})
    
    if not task_settings.get("enabled", True):
        logger.info("Overdue task alerts disabled, skipping")
        return
    
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    try:
        # Find overdue tasks (due_date < today, not completed)
        overdue_tasks = await db.pm_tasks.find({
            "due_date": {"$lt": today},
            "status": {"$nin": ["done", "completed", "cancelled"]}
        }).to_list(500)
        
        logger.info(f"Found {len(overdue_tasks)} overdue tasks")
        
        channels = task_settings.get("channels", {"in_app": True, "email": True, "teams": False})
        
        for task in overdue_tasks:
            assignee_id = task.get("assigned_to") or task.get("assignee_id")
            if not assignee_id:
                continue
            
            # Calculate days overdue
            due_date = datetime.fromisoformat(task["due_date"]).date()
            days_overdue = (now.date() - due_date).days
            
            # Send notification to assignee
            if task_settings.get("notify_assignee", True):
                await send_overdue_notification(
                    user_id=assignee_id,
                    task=task,
                    days_overdue=days_overdue,
                    channels=channels
                )
            
            # Send notification to manager (project owner)
            if task_settings.get("notify_manager", True):
                project = await db.pm_projects.find_one({"id": task.get("project_id")})
                if project and project.get("manager_id") and project["manager_id"] != assignee_id:
                    await send_overdue_notification(
                        user_id=project["manager_id"],
                        task=task,
                        days_overdue=days_overdue,
                        channels=channels,
                        is_manager=True
                    )
        
        # Log automation run
        await log_automation_action("overdue_task_check", {
            "tasks_found": len(overdue_tasks),
            "timestamp": now.isoformat()
        })
        
    except Exception as e:
        logger.error(f"Overdue task check failed: {e}")


async def send_overdue_notification(user_id: str, task: dict, days_overdue: int, channels: dict, is_manager: bool = False):
    """Send overdue task notification via configured channels"""
    try:
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
        if not user:
            return
        
        task_name = task.get("name", task.get("title", "Unnamed Task"))
        
        if is_manager:
            message = f"Task '{task_name}' assigned to team member is {days_overdue} day(s) overdue"
            title = "Team Task Overdue"
        else:
            message = f"Your task '{task_name}' is {days_overdue} day(s) overdue"
            title = "Task Overdue"
        
        # In-app notification
        if channels.get("in_app", True):
            notification = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "title": title,
                "message": message,
                "type": "task_overdue",
                "category": "task",
                "priority": "high" if days_overdue > 3 else "medium",
                "reference_type": "task",
                "reference_id": task.get("id"),
                "action_url": f"/projects/tasks/{task.get('id')}",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
        
        # Email notification
        if channels.get("email", True) and email_service and user.get("email"):
            try:
                await email_service.send_email(
                    to=user["email"],
                    subject=f"[Sevora] {title}: {task_name}",
                    body=f"""
                    <h2>{title}</h2>
                    <p>{message}</p>
                    <p><strong>Due Date:</strong> {task.get('due_date')}</p>
                    <p><strong>Priority:</strong> {task.get('priority', 'medium').capitalize()}</p>
                    <p><a href="{os.environ.get('FRONTEND_URL', '')}/projects/tasks/{task.get('id')}">View Task</a></p>
                    """,
                    is_html=True
                )
            except Exception as e:
                logger.error(f"Failed to send overdue email: {e}")
        
        # Teams notification (if connected)
        if channels.get("teams", False) and teams_service:
            # Teams notifications would require user's Teams connection
            pass
        
    except Exception as e:
        logger.error(f"Failed to send overdue notification: {e}")


# ============== MEETING REMINDERS ==============

async def check_upcoming_meetings():
    """
    Scheduled job to check for upcoming meetings and send reminders.
    Called every 5 minutes by scheduler.
    """
    settings = await get_automation_settings()
    reminder_settings = settings.get("communication", {}).get("meeting_reminder", {})
    
    if not reminder_settings.get("enabled", True):
        return
    
    now = datetime.now(timezone.utc)
    remind_at = reminder_settings.get("remind_at", [1440, 60, 15])  # minutes
    channels = reminder_settings.get("channels", {"in_app": True, "email": True, "teams": False})
    
    try:
        for minutes in remind_at:
            # Calculate target time window (±2.5 minutes for the 5-minute check interval)
            target_time = now + timedelta(minutes=minutes)
            window_start = target_time - timedelta(minutes=2.5)
            window_end = target_time + timedelta(minutes=2.5)
            
            # Find meetings starting in this window
            meetings = await db.meetings.find({
                "start_time": {
                    "$gte": window_start.isoformat(),
                    "$lte": window_end.isoformat()
                },
                "status": {"$ne": "cancelled"},
                f"reminder_sent_{minutes}min": {"$ne": True}
            }).to_list(100)
            
            for meeting in meetings:
                await send_meeting_reminder(meeting, minutes, channels)
                
                # Mark reminder as sent
                await db.meetings.update_one(
                    {"id": meeting["id"]},
                    {"$set": {f"reminder_sent_{minutes}min": True}}
                )
        
    except Exception as e:
        logger.error(f"Meeting reminder check failed: {e}")


async def send_meeting_reminder(meeting: dict, minutes_before: int, channels: dict):
    """Send meeting reminder to all participants"""
    try:
        participants = meeting.get("participants", [])
        organizer_id = meeting.get("organizer_id")
        
        # Get all user IDs to notify
        user_ids = set()
        if organizer_id:
            user_ids.add(organizer_id)
        for p in participants:
            if p.get("user_id"):
                user_ids.add(p["user_id"])
        
        meeting_title = meeting.get("title", "Upcoming Meeting")
        start_time = meeting.get("start_time", "")
        location = meeting.get("location", "")
        
        if minutes_before >= 60:
            time_str = f"{minutes_before // 60} hour(s)"
        else:
            time_str = f"{minutes_before} minutes"
        
        message = f"'{meeting_title}' starts in {time_str}"
        if location:
            message += f" at {location}"
        
        for user_id in user_ids:
            user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
            if not user:
                continue
            
            # In-app notification
            if channels.get("in_app", True):
                notification = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "title": "Meeting Reminder",
                    "message": message,
                    "type": "meeting_reminder",
                    "category": "meeting",
                    "priority": "high" if minutes_before <= 15 else "medium",
                    "reference_type": "meeting",
                    "reference_id": meeting.get("id"),
                    "action_url": f"/meetings/{meeting.get('id')}",
                    "is_read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.notifications.insert_one(notification)
            
            # Email notification
            if channels.get("email", True) and email_service and user.get("email"):
                try:
                    await email_service.send_email(
                        to=user["email"],
                        subject=f"[Sevora] Meeting Reminder: {meeting_title}",
                        body=f"""
                        <h2>Meeting Reminder</h2>
                        <p>{message}</p>
                        <p><strong>Time:</strong> {start_time}</p>
                        <p><strong>Location:</strong> {location or 'Not specified'}</p>
                        <p><a href="{os.environ.get('FRONTEND_URL', '')}/meetings/{meeting.get('id')}">View Meeting</a></p>
                        """,
                        is_html=True
                    )
                except Exception as e:
                    logger.error(f"Failed to send meeting reminder email: {e}")
        
        logger.info(f"Sent {time_str} reminder for meeting: {meeting_title}")
        
    except Exception as e:
        logger.error(f"Failed to send meeting reminder: {e}")


# ============== ACTION ITEM TO TASK ==============

async def create_task_from_action_item(action_item: dict, meeting: dict, user_id: str):
    """
    Automatically create a task from a meeting action item.
    Called when action item is created/confirmed.
    """
    settings = await get_automation_settings()
    ai_settings = settings.get("communication", {}).get("action_item_to_task", {})
    
    if not ai_settings.get("enabled", True):
        return None
    
    try:
        task_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Determine assignee
        assignee_id = action_item.get("assigned_to_id")
        if not assignee_id and ai_settings.get("auto_assign", True):
            assignee_id = user_id
        
        # Determine project (from meeting or action item)
        project_id = action_item.get("linked_project_id") or meeting.get("linked_project_id")
        
        task = {
            "id": task_id,
            "name": action_item.get("title", action_item.get("description", "Action Item"))[:200],
            "description": f"From meeting: {meeting.get('title', 'Meeting')}\n\n{action_item.get('description', '')}",
            "status": "todo",
            "priority": ai_settings.get("default_priority", "medium"),
            "due_date": action_item.get("due_date"),
            "assigned_to": assignee_id,
            "project_id": project_id,
            "source": "meeting_action_item",
            "source_meeting_id": meeting.get("id"),
            "source_action_item_id": action_item.get("id"),
            "created_by": user_id,
            "created_at": now,
            "updated_at": now
        }
        
        await db.pm_tasks.insert_one(task)
        
        # Link back to action item
        if action_item.get("id"):
            await db.meetings.update_one(
                {"id": meeting["id"], "action_items.id": action_item["id"]},
                {"$set": {"action_items.$.linked_task_id": task_id}}
            )
        
        # Send notification to assignee
        if assignee_id and assignee_id != user_id:
            notification = {
                "id": str(uuid.uuid4()),
                "user_id": assignee_id,
                "title": "New Task Assigned",
                "message": f"Task created from meeting action item: {task['name'][:50]}",
                "type": "task_assigned",
                "category": "task",
                "reference_type": "task",
                "reference_id": task_id,
                "action_url": f"/projects/tasks/{task_id}",
                "is_read": False,
                "created_at": now
            }
            await db.notifications.insert_one(notification)
        
        # Log automation
        await log_automation_action("action_item_to_task", {
            "action_item_id": action_item.get("id"),
            "meeting_id": meeting.get("id"),
            "task_id": task_id
        })
        
        logger.info(f"Created task {task_id} from action item in meeting {meeting.get('id')}")
        return task
        
    except Exception as e:
        logger.error(f"Failed to create task from action item: {e}")
        return None


# ============== UTILITY FUNCTIONS ==============

async def log_automation_action(action: str, details: dict, user_id: str = None, user_name: str = None):
    """Log an automation action"""
    try:
        log_entry = {
            "id": str(uuid.uuid4()),
            "action": action,
            "details": details,
            "user_id": user_id,
            "user_name": user_name or "System",
            "result": {"success": True},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.automation_logs.insert_one(log_entry)
    except Exception as e:
        logger.error(f"Failed to log automation action: {e}")


async def get_pending_automation_actions(user_id: str = None) -> List[dict]:
    """Get pending automation actions for Goals, Projects & Communication Hub"""
    settings = await get_automation_settings()
    pending = []
    now = datetime.now(timezone.utc)
    
    # Check overdue tasks
    if settings.get("goals_projects", {}).get("overdue_task_alert", {}).get("enabled", True):
        today = now.date().isoformat()
        overdue_count = await db.pm_tasks.count_documents({
            "due_date": {"$lt": today},
            "status": {"$nin": ["done", "completed", "cancelled"]}
        })
        if overdue_count > 0:
            pending.append({
                "type": "overdue_tasks",
                "priority": "high",
                "count": overdue_count,
                "message": f"{overdue_count} task(s) are overdue and need attention"
            })
    
    # Check overdue action items
    if settings.get("communication", {}).get("overdue_action_item", {}).get("enabled", True):
        today = now.date().isoformat()
        overdue_ai = await db.meetings.aggregate([
            {"$unwind": "$action_items"},
            {"$match": {
                "action_items.due_date": {"$lt": today},
                "action_items.status": {"$ne": "completed"}
            }},
            {"$count": "total"}
        ]).to_list(1)
        
        ai_count = overdue_ai[0]["total"] if overdue_ai else 0
        if ai_count > 0:
            pending.append({
                "type": "overdue_action_items",
                "priority": "medium",
                "count": ai_count,
                "message": f"{ai_count} meeting action item(s) are overdue"
            })
    
    return pending


# Import os for environment variables
import os
