"""
Automation Service - Automations for Goals, Projects & Communication Hub

Phase 1:
- Progress Cascade: Task -> Project -> Objective -> Goal
- Overdue Task Alerts: Daily notifications for overdue tasks
- Meeting Reminders: 24h/1h/15min notifications before meetings
- Action Item to Task: Auto-convert meeting action items to tasks

Phase 2:
- Goal At-Risk Alerts: Alert when goals are behind schedule
- Blocked Task Escalation: Escalate tasks blocked for too long
- Weekly Progress Report: Automated weekly summary
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
    },
    # Phase 2
    "goal_at_risk_alert": {
        "enabled": True,
        "description": "Alert when goals are behind schedule and at risk of missing deadlines",
        "progress_threshold": 50,
        "days_before_deadline": 30,
        "auto_schedule_review": True,
        "channels": {
            "in_app": True,
            "email": True,
            "teams": False
        }
    },
    "blocked_task_escalation": {
        "enabled": True,
        "description": "Escalate tasks that have been blocked for too long",
        "blocked_days_threshold": 2,
        "auto_schedule_meeting": False,
        "channels": {
            "in_app": True,
            "email": True,
            "teams": False
        }
    },
    "weekly_progress_report": {
        "enabled": True,
        "description": "Send weekly progress summary every Monday",
        "send_day": "monday",
        "send_time": "09:00",
        "include_goals": True,
        "include_projects": True,
        "include_tasks": True,
        "channels": {
            "in_app": True,
            "email": True,
            "teams": False
        }
    },
    # Phase 3
    "daily_task_digest": {
        "enabled": True,
        "description": "Send daily task digest email every morning",
        "send_time": "08:00",
        "include_overdue": True,
        "include_due_today": True,
        "include_due_this_week": True,
        "channels": {
            "in_app": False,
            "email": True,
            "teams": False
        }
    },
    "auto_archive_completed": {
        "enabled": True,
        "description": "Automatically archive completed tasks after a period",
        "archive_after_days": 30,
        "archive_completed_projects": True,
        "archive_completed_goals": False
    },
    "stale_task_reminder": {
        "enabled": True,
        "description": "Remind about tasks that haven't been updated in a while",
        "stale_days": 7,
        "notify_assignee": True,
        "notify_manager": True,
        "channels": {
            "in_app": True,
            "email": True,
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
    
    # Check at-risk goals
    if settings.get("goals_projects", {}).get("goal_at_risk_alert", {}).get("enabled", True):
        at_risk = await get_at_risk_goals()
        if at_risk:
            pending.append({
                "type": "at_risk_goals",
                "priority": "high",
                "count": len(at_risk),
                "message": f"{len(at_risk)} goal(s) are at risk of missing deadlines"
            })
    
    # Check blocked tasks
    if settings.get("goals_projects", {}).get("blocked_task_escalation", {}).get("enabled", True):
        blocked = await get_blocked_tasks()
        if blocked:
            pending.append({
                "type": "blocked_tasks",
                "priority": "medium",
                "count": len(blocked),
                "message": f"{len(blocked)} task(s) are blocked and need attention"
            })
    
    return pending


# ============== PHASE 2: GOAL AT-RISK ALERTS ==============

async def get_at_risk_goals() -> List[dict]:
    """Get goals that are at risk of missing deadlines"""
    settings = await get_automation_settings()
    alert_settings = settings.get("goals_projects", {}).get("goal_at_risk_alert", {})
    
    if not alert_settings.get("enabled", True):
        return []
    
    progress_threshold = alert_settings.get("progress_threshold", 50)
    days_before = alert_settings.get("days_before_deadline", 30)
    
    now = datetime.now(timezone.utc)
    deadline_cutoff = (now + timedelta(days=days_before)).isoformat()
    
    try:
        # Find goals with low progress and approaching deadline
        at_risk_goals = []
        
        async for goal in db.strategic_goals.find({
            "status": {"$nin": ["completed", "cancelled", "archived"]},
            "progress": {"$lt": progress_threshold}
        }):
            # Check if goal has a target date within the threshold
            target_date = goal.get("target_date") or goal.get("end_date")
            if target_date and target_date <= deadline_cutoff:
                goal_data = {
                    "id": str(goal.get("_id")),
                    "title": goal.get("title", "Untitled Goal"),
                    "progress": goal.get("progress", 0),
                    "target_date": target_date,
                    "owner_id": goal.get("owner_id"),
                    "department_id": goal.get("department_id")
                }
                at_risk_goals.append(goal_data)
        
        return at_risk_goals
        
    except Exception as e:
        logger.error(f"Failed to get at-risk goals: {e}")
        return []


async def check_at_risk_goals():
    """
    Daily job to check for at-risk goals and send alerts.
    Called by scheduler daily.
    """
    settings = await get_automation_settings()
    alert_settings = settings.get("goals_projects", {}).get("goal_at_risk_alert", {})
    
    if not alert_settings.get("enabled", True):
        logger.info("Goal at-risk alerts disabled, skipping")
        return
    
    try:
        at_risk_goals = await get_at_risk_goals()
        logger.info(f"Found {len(at_risk_goals)} at-risk goals")
        
        channels = alert_settings.get("channels", {"in_app": True, "email": True, "teams": False})
        auto_schedule = alert_settings.get("auto_schedule_review", True)
        
        for goal in at_risk_goals:
            # Check if we already sent an alert for this goal today
            today = datetime.now(timezone.utc).date().isoformat()
            existing_alert = await db.automation_logs.find_one({
                "action": "goal_at_risk_alert",
                "details.goal_id": goal["id"],
                "created_at": {"$regex": f"^{today}"}
            })
            
            if existing_alert:
                continue  # Already alerted today
            
            # Get goal owner and stakeholders
            owner_id = goal.get("owner_id")
            if owner_id:
                await send_at_risk_notification(goal, owner_id, channels, is_owner=True)
            
            # Auto-schedule review meeting if enabled
            if auto_schedule and owner_id:
                await schedule_goal_review_meeting(goal, owner_id)
            
            # Log the alert
            await log_automation_action("goal_at_risk_alert", {
                "goal_id": goal["id"],
                "goal_title": goal["title"],
                "progress": goal["progress"],
                "target_date": goal["target_date"]
            })
        
    except Exception as e:
        logger.error(f"Goal at-risk check failed: {e}")


async def send_at_risk_notification(goal: dict, user_id: str, channels: dict, is_owner: bool = False):
    """Send at-risk goal notification"""
    try:
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
        if not user:
            return
        
        progress = goal.get("progress", 0)
        target_date = goal.get("target_date", "N/A")
        
        title = "Goal At Risk" if is_owner else "Team Goal At Risk"
        message = f"Goal '{goal['title']}' is at {progress:.0f}% progress with deadline approaching ({target_date[:10]})"
        
        # In-app notification
        if channels.get("in_app", True):
            notification = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "title": title,
                "message": message,
                "type": "goal_at_risk",
                "category": "goal",
                "priority": "high",
                "reference_type": "goal",
                "reference_id": goal["id"],
                "action_url": f"/goals/strategic-goals/{goal['id']}",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
        
        # Email notification
        if channels.get("email", True) and email_service and user.get("email"):
            try:
                await email_service.send_email(
                    to=user["email"],
                    subject=f"[Sevora] {title}: {goal['title']}",
                    body=f"""
                    <h2>{title}</h2>
                    <p>{message}</p>
                    <p><strong>Current Progress:</strong> {progress:.0f}%</p>
                    <p><strong>Target Date:</strong> {target_date[:10]}</p>
                    <p>Please review and take action to get this goal back on track.</p>
                    <p><a href="{os.environ.get('FRONTEND_URL', '')}/goals/strategic-goals/{goal['id']}">View Goal</a></p>
                    """,
                    is_html=True
                )
            except Exception as e:
                logger.error(f"Failed to send at-risk email: {e}")
                
    except Exception as e:
        logger.error(f"Failed to send at-risk notification: {e}")


async def schedule_goal_review_meeting(goal: dict, organizer_id: str):
    """Auto-schedule a review meeting for at-risk goal"""
    try:
        # Schedule meeting for tomorrow at 10 AM
        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        start_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(hours=1)
        
        meeting = {
            "id": str(uuid.uuid4()),
            "title": f"Goal Review: {goal['title'][:50]}",
            "meeting_type": "okr_review",
            "description": f"Auto-scheduled review meeting for at-risk goal.\n\nGoal: {goal['title']}\nCurrent Progress: {goal.get('progress', 0):.0f}%\nTarget Date: {goal.get('target_date', 'N/A')[:10]}",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "location": "Virtual",
            "organizer_id": organizer_id,
            "linked_goal_id": goal["id"],
            "status": "scheduled",
            "is_auto_scheduled": True,
            "participants": [{"user_id": organizer_id, "status": "accepted"}],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.meetings.insert_one(meeting)
        logger.info(f"Auto-scheduled review meeting for goal: {goal['title']}")
        
    except Exception as e:
        logger.error(f"Failed to schedule goal review meeting: {e}")


# ============== PHASE 2: BLOCKED TASK ESCALATION ==============

async def get_blocked_tasks() -> List[dict]:
    """Get tasks that have been blocked for too long"""
    settings = await get_automation_settings()
    escalation_settings = settings.get("goals_projects", {}).get("blocked_task_escalation", {})
    
    if not escalation_settings.get("enabled", True):
        return []
    
    days_threshold = escalation_settings.get("blocked_days_threshold", 2)
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days_threshold)).isoformat()
    
    try:
        blocked_tasks = []
        
        async for task in db.pm_tasks.find({
            "status": "blocked",
            "$or": [
                {"blocked_at": {"$lte": cutoff_date}},
                {"updated_at": {"$lte": cutoff_date}, "blocked_at": {"$exists": False}}
            ]
        }):
            task_data = {
                "id": task.get("id"),
                "name": task.get("name", task.get("title", "Untitled Task")),
                "project_id": task.get("project_id"),
                "assigned_to": task.get("assigned_to"),
                "blocked_at": task.get("blocked_at", task.get("updated_at")),
                "blocked_reason": task.get("blocked_reason", "Not specified")
            }
            blocked_tasks.append(task_data)
        
        return blocked_tasks
        
    except Exception as e:
        logger.error(f"Failed to get blocked tasks: {e}")
        return []


async def check_blocked_tasks():
    """
    Daily job to check for blocked tasks and escalate.
    Called by scheduler daily.
    """
    settings = await get_automation_settings()
    escalation_settings = settings.get("goals_projects", {}).get("blocked_task_escalation", {})
    
    if not escalation_settings.get("enabled", True):
        logger.info("Blocked task escalation disabled, skipping")
        return
    
    try:
        blocked_tasks = await get_blocked_tasks()
        logger.info(f"Found {len(blocked_tasks)} blocked tasks needing escalation")
        
        channels = escalation_settings.get("channels", {"in_app": True, "email": True, "teams": False})
        auto_schedule = escalation_settings.get("auto_schedule_meeting", False)
        
        for task in blocked_tasks:
            # Check if we already escalated this task today
            today = datetime.now(timezone.utc).date().isoformat()
            existing_escalation = await db.automation_logs.find_one({
                "action": "blocked_task_escalation",
                "details.task_id": task["id"],
                "created_at": {"$regex": f"^{today}"}
            })
            
            if existing_escalation:
                continue  # Already escalated today
            
            # Get project manager to escalate to
            manager_id = None
            if task.get("project_id"):
                project = await db.pm_projects.find_one({"id": task["project_id"]})
                if project:
                    manager_id = project.get("manager_id") or project.get("owner_id")
            
            # Notify assignee
            if task.get("assigned_to"):
                await send_blocked_escalation_notification(task, task["assigned_to"], channels, is_assignee=True)
            
            # Notify manager
            if manager_id and manager_id != task.get("assigned_to"):
                await send_blocked_escalation_notification(task, manager_id, channels, is_assignee=False)
            
            # Auto-schedule resolution meeting if enabled
            if auto_schedule and manager_id:
                await schedule_blocked_resolution_meeting(task, manager_id)
            
            # Log the escalation
            await log_automation_action("blocked_task_escalation", {
                "task_id": task["id"],
                "task_name": task["name"],
                "project_id": task.get("project_id"),
                "blocked_reason": task.get("blocked_reason")
            })
        
    except Exception as e:
        logger.error(f"Blocked task escalation check failed: {e}")


async def send_blocked_escalation_notification(task: dict, user_id: str, channels: dict, is_assignee: bool = False):
    """Send blocked task escalation notification"""
    try:
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1, "email": 1})
        if not user:
            return
        
        if is_assignee:
            title = "Task Still Blocked"
            message = f"Your task '{task['name']}' has been blocked for an extended period. Please resolve or seek help."
        else:
            title = "Blocked Task Escalation"
            message = f"Task '{task['name']}' has been blocked and needs your attention."
        
        # In-app notification
        if channels.get("in_app", True):
            notification = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "title": title,
                "message": message,
                "type": "task_blocked_escalation",
                "category": "task",
                "priority": "high",
                "reference_type": "task",
                "reference_id": task["id"],
                "action_url": f"/projects/tasks/{task['id']}",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
        
        # Email notification
        if channels.get("email", True) and email_service and user.get("email"):
            try:
                await email_service.send_email(
                    to=user["email"],
                    subject=f"[Sevora] {title}: {task['name']}",
                    body=f"""
                    <h2>{title}</h2>
                    <p>{message}</p>
                    <p><strong>Blocked Reason:</strong> {task.get('blocked_reason', 'Not specified')}</p>
                    <p>Please take action to unblock this task.</p>
                    <p><a href="{os.environ.get('FRONTEND_URL', '')}/projects/tasks/{task['id']}">View Task</a></p>
                    """,
                    is_html=True
                )
            except Exception as e:
                logger.error(f"Failed to send blocked task email: {e}")
                
    except Exception as e:
        logger.error(f"Failed to send blocked escalation notification: {e}")


async def schedule_blocked_resolution_meeting(task: dict, organizer_id: str):
    """Auto-schedule a resolution meeting for blocked task"""
    try:
        # Schedule meeting for tomorrow at 2 PM
        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        start_time = tomorrow.replace(hour=14, minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(minutes=30)
        
        participants = [{"user_id": organizer_id, "status": "accepted"}]
        if task.get("assigned_to") and task["assigned_to"] != organizer_id:
            participants.append({"user_id": task["assigned_to"], "status": "pending"})
        
        meeting = {
            "id": str(uuid.uuid4()),
            "title": f"Blocked Task Resolution: {task['name'][:40]}",
            "meeting_type": "project_review",
            "description": f"Auto-scheduled meeting to resolve blocked task.\n\nTask: {task['name']}\nBlocked Reason: {task.get('blocked_reason', 'Not specified')}",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "location": "Virtual",
            "organizer_id": organizer_id,
            "linked_project_id": task.get("project_id"),
            "status": "scheduled",
            "is_auto_scheduled": True,
            "participants": participants,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.meetings.insert_one(meeting)
        logger.info(f"Auto-scheduled resolution meeting for blocked task: {task['name']}")
        
    except Exception as e:
        logger.error(f"Failed to schedule blocked resolution meeting: {e}")


# ============== PHASE 2: WEEKLY PROGRESS REPORT ==============

async def generate_weekly_progress_report():
    """
    Weekly job to generate and send progress reports.
    Called by scheduler every Monday.
    """
    settings = await get_automation_settings()
    report_settings = settings.get("goals_projects", {}).get("weekly_progress_report", {})
    
    if not report_settings.get("enabled", True):
        logger.info("Weekly progress report disabled, skipping")
        return
    
    try:
        channels = report_settings.get("channels", {"in_app": True, "email": True, "teams": False})
        include_goals = report_settings.get("include_goals", True)
        include_projects = report_settings.get("include_projects", True)
        include_tasks = report_settings.get("include_tasks", True)
        
        # Get all active users (managers and above)
        users = await db.users.find({
            "status": "active",
            "role": {"$in": ["admin", "super_admin", "manager", "department_head"]}
        }).to_list(100)
        
        logger.info(f"Generating weekly report for {len(users)} users")
        
        for user in users:
            user_id = user.get("id")
            if not user_id:
                continue
            
            report_data = await compile_user_weekly_report(user_id, include_goals, include_projects, include_tasks)
            
            if report_data:
                await send_weekly_report_notification(user, report_data, channels)
        
        # Log the automation
        await log_automation_action("weekly_progress_report", {
            "users_notified": len(users),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Weekly progress report generation failed: {e}")


async def compile_user_weekly_report(user_id: str, include_goals: bool, include_projects: bool, include_tasks: bool) -> dict:
    """Compile weekly report data for a specific user"""
    try:
        report = {
            "period_start": (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d"),
            "period_end": datetime.now(timezone.utc).strftime("%Y-%m-%d")
        }
        
        if include_goals:
            # Get goals owned by user or in their department
            goals = await db.strategic_goals.find({
                "$or": [
                    {"owner_id": user_id},
                    {"stakeholders": user_id}
                ],
                "status": {"$nin": ["completed", "cancelled", "archived"]}
            }).to_list(20)
            
            report["goals"] = {
                "total": len(goals),
                "on_track": len([g for g in goals if g.get("progress", 0) >= 50]),
                "at_risk": len([g for g in goals if g.get("progress", 0) < 50]),
                "items": [{
                    "title": g.get("title", "Untitled"),
                    "progress": g.get("progress", 0)
                } for g in goals[:5]]
            }
        
        if include_projects:
            # Get projects managed by user
            projects = await db.pm_projects.find({
                "$or": [
                    {"manager_id": user_id},
                    {"owner_id": user_id},
                    {"created_by": user_id}
                ],
                "status": {"$nin": ["completed", "cancelled", "archived"]}
            }).to_list(20)
            
            report["projects"] = {
                "total": len(projects),
                "items": [{
                    "name": p.get("name", "Untitled"),
                    "progress": p.get("progress", 0),
                    "task_count": p.get("task_count", 0)
                } for p in projects[:5]]
            }
        
        if include_tasks:
            # Get tasks assigned to user
            now = datetime.now(timezone.utc)
            week_ago = (now - timedelta(days=7)).isoformat()
            
            completed_count = await db.pm_tasks.count_documents({
                "assigned_to": user_id,
                "status": {"$in": ["done", "completed"]},
                "updated_at": {"$gte": week_ago}
            })
            
            pending_count = await db.pm_tasks.count_documents({
                "assigned_to": user_id,
                "status": {"$nin": ["done", "completed", "cancelled"]}
            })
            
            overdue_count = await db.pm_tasks.count_documents({
                "assigned_to": user_id,
                "due_date": {"$lt": now.date().isoformat()},
                "status": {"$nin": ["done", "completed", "cancelled"]}
            })
            
            report["tasks"] = {
                "completed_this_week": completed_count,
                "pending": pending_count,
                "overdue": overdue_count
            }
        
        return report
        
    except Exception as e:
        logger.error(f"Failed to compile weekly report for user {user_id}: {e}")
        return None


async def send_weekly_report_notification(user: dict, report: dict, channels: dict):
    """Send weekly progress report notification"""
    try:
        user_id = user.get("id")
        user_name = user.get("name", "User")
        user_email = user.get("email")
        
        # Build summary message
        summary_parts = []
        if "goals" in report:
            summary_parts.append(f"{report['goals']['total']} goals ({report['goals']['at_risk']} at risk)")
        if "projects" in report:
            summary_parts.append(f"{report['projects']['total']} active projects")
        if "tasks" in report:
            summary_parts.append(f"{report['tasks']['completed_this_week']} tasks completed, {report['tasks']['overdue']} overdue")
        
        message = "Weekly Summary: " + ", ".join(summary_parts)
        
        # In-app notification
        if channels.get("in_app", True):
            notification = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "title": "Weekly Progress Report",
                "message": message,
                "type": "weekly_report",
                "category": "report",
                "priority": "low",
                "action_url": "/goals/dashboard",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
        
        # Email notification with detailed report
        if channels.get("email", True) and email_service and user_email:
            try:
                # Build detailed HTML report
                html_content = f"""
                <h2>Weekly Progress Report</h2>
                <p>Hi {user_name},</p>
                <p>Here's your weekly summary for {report['period_start']} to {report['period_end']}:</p>
                """
                
                if "goals" in report:
                    html_content += f"""
                    <h3>Goals</h3>
                    <ul>
                        <li>Total Active: {report['goals']['total']}</li>
                        <li>On Track: {report['goals']['on_track']}</li>
                        <li>At Risk: {report['goals']['at_risk']}</li>
                    </ul>
                    """
                
                if "projects" in report:
                    html_content += f"""
                    <h3>Projects</h3>
                    <ul>
                        <li>Active Projects: {report['projects']['total']}</li>
                    </ul>
                    """
                
                if "tasks" in report:
                    html_content += f"""
                    <h3>Tasks</h3>
                    <ul>
                        <li>Completed This Week: {report['tasks']['completed_this_week']}</li>
                        <li>Pending: {report['tasks']['pending']}</li>
                        <li>Overdue: {report['tasks']['overdue']}</li>
                    </ul>
                    """
                
                html_content += f"""
                <p><a href="{os.environ.get('FRONTEND_URL', '')}/goals/dashboard">View Full Dashboard</a></p>
                """
                
                await email_service.send_email(
                    to=user_email,
                    subject="[Sevora] Your Weekly Progress Report",
                    body=html_content,
                    is_html=True
                )
            except Exception as e:
                logger.error(f"Failed to send weekly report email: {e}")
                
    except Exception as e:
        logger.error(f"Failed to send weekly report notification: {e}")


# ============== PHASE 3 AUTOMATIONS ==============

async def run_daily_task_digest():
    """Send daily task digest to all users (Phase 3)"""
    if not db:
        logger.error("Database not initialized for daily task digest")
        return
    
    logger.info("Running daily task digest automation")
    
    try:
        # Get automation settings
        settings_doc = await db.automation_settings.find_one({}) or {}
        goals_projects_settings = settings_doc.get("goals_projects", DEFAULT_GOALS_PROJECTS_SETTINGS)
        digest_settings = goals_projects_settings.get("daily_task_digest", {})
        
        if not digest_settings.get("enabled", True):
            logger.info("Daily task digest is disabled")
            return
        
        channels = digest_settings.get("channels", {"email": True})
        include_overdue = digest_settings.get("include_overdue", True)
        include_due_today = digest_settings.get("include_due_today", True)
        include_due_this_week = digest_settings.get("include_due_this_week", True)
        
        # Get all active users
        users = await db.users.find({"status": "active"}).to_list(None)
        
        today = datetime.now(timezone.utc).date()
        end_of_week = today + timedelta(days=(6 - today.weekday()))
        
        for user in users:
            user_id = user.get("id")
            user_email = user.get("email")
            user_name = user.get("name", "User")
            
            if not user_id:
                continue
            
            # Get tasks for this user
            tasks_query = {
                "assigned_to": user_id,
                "status": {"$nin": ["done", "archived"]}
            }
            
            tasks = await db.pm_tasks.find(tasks_query).to_list(None)
            
            overdue_tasks = []
            due_today_tasks = []
            due_this_week_tasks = []
            
            for task in tasks:
                due_date_str = task.get("due_date")
                if not due_date_str:
                    continue
                    
                try:
                    if isinstance(due_date_str, str):
                        due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00')).date()
                    else:
                        due_date = due_date_str.date() if hasattr(due_date_str, 'date') else due_date_str
                    
                    if due_date < today and include_overdue:
                        overdue_tasks.append(task)
                    elif due_date == today and include_due_today:
                        due_today_tasks.append(task)
                    elif today < due_date <= end_of_week and include_due_this_week:
                        due_this_week_tasks.append(task)
                except Exception:
                    continue
            
            # Skip if no tasks to report
            total_tasks = len(overdue_tasks) + len(due_today_tasks) + len(due_this_week_tasks)
            if total_tasks == 0:
                continue
            
            # Send email digest
            if channels.get("email", True) and email_service and user_email:
                try:
                    html_content = f"""
                    <h2>Your Daily Task Digest</h2>
                    <p>Good morning {user_name}!</p>
                    <p>Here's your task summary for today:</p>
                    """
                    
                    if overdue_tasks:
                        html_content += f"""
                        <h3 style="color: #dc2626;">Overdue Tasks ({len(overdue_tasks)})</h3>
                        <ul>
                        """
                        for task in overdue_tasks[:5]:
                            html_content += f"<li><strong>{task.get('name', 'Untitled')}</strong> - Due: {task.get('due_date', 'N/A')[:10]}</li>"
                        if len(overdue_tasks) > 5:
                            html_content += f"<li>...and {len(overdue_tasks) - 5} more</li>"
                        html_content += "</ul>"
                    
                    if due_today_tasks:
                        html_content += f"""
                        <h3 style="color: #f59e0b;">Due Today ({len(due_today_tasks)})</h3>
                        <ul>
                        """
                        for task in due_today_tasks[:5]:
                            html_content += f"<li><strong>{task.get('name', 'Untitled')}</strong></li>"
                        html_content += "</ul>"
                    
                    if due_this_week_tasks:
                        html_content += f"""
                        <h3 style="color: #3b82f6;">Due This Week ({len(due_this_week_tasks)})</h3>
                        <ul>
                        """
                        for task in due_this_week_tasks[:5]:
                            html_content += f"<li><strong>{task.get('name', 'Untitled')}</strong> - Due: {task.get('due_date', 'N/A')[:10]}</li>"
                        if len(due_this_week_tasks) > 5:
                            html_content += f"<li>...and {len(due_this_week_tasks) - 5} more</li>"
                        html_content += "</ul>"
                    
                    html_content += f"""
                    <p><a href="{os.environ.get('FRONTEND_URL', '')}/projects/my-tasks">View All Tasks</a></p>
                    """
                    
                    await email_service.send_email(
                        to=user_email,
                        subject=f"[Sevora] Daily Task Digest - {total_tasks} tasks need attention",
                        body=html_content,
                        is_html=True
                    )
                    logger.info(f"Sent daily digest to {user_email}")
                except Exception as e:
                    logger.error(f"Failed to send daily digest to {user_email}: {e}")
        
        logger.info("Daily task digest completed")
        
    except Exception as e:
        logger.error(f"Error running daily task digest: {e}")


async def run_auto_archive():
    """Archive completed tasks/projects after specified period (Phase 3)"""
    if not db:
        logger.error("Database not initialized for auto-archive")
        return
    
    logger.info("Running auto-archive automation")
    
    try:
        # Get automation settings
        settings_doc = await db.automation_settings.find_one({}) or {}
        goals_projects_settings = settings_doc.get("goals_projects", DEFAULT_GOALS_PROJECTS_SETTINGS)
        archive_settings = goals_projects_settings.get("auto_archive_completed", {})
        
        if not archive_settings.get("enabled", True):
            logger.info("Auto-archive is disabled")
            return
        
        archive_after_days = archive_settings.get("archive_after_days", 30)
        archive_projects = archive_settings.get("archive_completed_projects", True)
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=archive_after_days)
        cutoff_str = cutoff_date.isoformat()
        
        archived_count = 0
        
        # Archive completed tasks
        tasks_result = await db.pm_tasks.update_many(
            {
                "status": "done",
                "completed_at": {"$lt": cutoff_str},
                "archived": {"$ne": True}
            },
            {
                "$set": {
                    "archived": True,
                    "archived_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        archived_count += tasks_result.modified_count
        
        # Archive completed projects if enabled
        if archive_projects:
            projects_result = await db.pm_projects.update_many(
                {
                    "status": "completed",
                    "completed_at": {"$lt": cutoff_str},
                    "archived": {"$ne": True}
                },
                {
                    "$set": {
                        "archived": True,
                        "archived_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            archived_count += projects_result.modified_count
        
        logger.info(f"Auto-archive completed: {archived_count} items archived")
        
        # Log the automation run
        await db.automation_logs.insert_one({
            "id": str(uuid.uuid4()),
            "automation_type": "auto_archive",
            "run_at": datetime.now(timezone.utc).isoformat(),
            "items_archived": archived_count,
            "archive_after_days": archive_after_days
        })
        
    except Exception as e:
        logger.error(f"Error running auto-archive: {e}")


async def run_stale_task_reminder():
    """Remind about tasks that haven't been updated in a while (Phase 3)"""
    if not db:
        logger.error("Database not initialized for stale task reminder")
        return
    
    logger.info("Running stale task reminder automation")
    
    try:
        # Get automation settings
        settings_doc = await db.automation_settings.find_one({}) or {}
        goals_projects_settings = settings_doc.get("goals_projects", DEFAULT_GOALS_PROJECTS_SETTINGS)
        stale_settings = goals_projects_settings.get("stale_task_reminder", {})
        
        if not stale_settings.get("enabled", True):
            logger.info("Stale task reminder is disabled")
            return
        
        stale_days = stale_settings.get("stale_days", 7)
        notify_assignee = stale_settings.get("notify_assignee", True)
        notify_manager = stale_settings.get("notify_manager", True)
        channels = stale_settings.get("channels", {"in_app": True, "email": True})
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=stale_days)
        cutoff_str = cutoff_date.isoformat()
        
        # Find stale tasks (not updated recently, not completed/archived)
        stale_tasks = await db.pm_tasks.find({
            "status": {"$nin": ["done", "archived"]},
            "updated_at": {"$lt": cutoff_str},
            "$or": [
                {"stale_notified_at": {"$exists": False}},
                {"stale_notified_at": {"$lt": cutoff_str}}
            ]
        }).to_list(None)
        
        logger.info(f"Found {len(stale_tasks)} stale tasks")
        
        for task in stale_tasks:
            task_id = task.get("id")
            task_name = task.get("name", "Untitled Task")
            assigned_to = task.get("assigned_to")
            project_id = task.get("project_id")
            
            # Get project manager
            project_manager = None
            if project_id and notify_manager:
                project = await db.pm_projects.find_one({"id": project_id})
                if project:
                    project_manager = project.get("owner_id")
            
            notification_targets = []
            if notify_assignee and assigned_to:
                notification_targets.append(assigned_to)
            if notify_manager and project_manager and project_manager not in notification_targets:
                notification_targets.append(project_manager)
            
            for target_user_id in notification_targets:
                # In-app notification
                if channels.get("in_app", True):
                    notification = {
                        "id": str(uuid.uuid4()),
                        "user_id": target_user_id,
                        "title": "Stale Task Alert",
                        "message": f"Task '{task_name}' hasn't been updated in {stale_days} days",
                        "type": "stale_task",
                        "category": "task",
                        "priority": "medium",
                        "action_url": f"/projects/tasks/{task_id}",
                        "is_read": False,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.notifications.insert_one(notification)
            
            # Mark task as notified
            await db.pm_tasks.update_one(
                {"id": task_id},
                {"$set": {"stale_notified_at": datetime.now(timezone.utc).isoformat()}}
            )
        
        logger.info(f"Stale task reminder completed: {len(stale_tasks)} tasks notified")
        
    except Exception as e:
        logger.error(f"Error running stale task reminder: {e}")


# Import os for environment variables
import os
