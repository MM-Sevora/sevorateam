"""
Unified Task Management System
- Hybrid assignment (Team + Primary Owner)
- Activity logging across modules
- Smart auto-generated tasks with deduplication
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/tasks", tags=["Tasks"])
security = HTTPBearer()

# Will be set by main app
db = None
_get_current_user_func = None


def init_router(database, auth_dependency):
    global db, _get_current_user_func
    db = database
    _get_current_user_func = auth_dependency
    return router


async def get_current_user_dep(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    if _get_current_user_func is None:
        raise HTTPException(status_code=500, detail="Auth not configured")
    return await _get_current_user_func(credentials)


def can_delete_record(record: dict, current_user: dict) -> bool:
    """
    Check if current user can delete a record.
    
    SIMPLE RULE:
    - Admin/Super Admin: Can delete anything
    - Regular User: Can ONLY delete records they CREATED
    """
    user_id = current_user.get("id")
    user_role = current_user.get("role", "")
    
    # Super admin or admin can delete anything
    if user_role in ["super_admin", "admin"]:
        return True
    
    # User has admin capabilities
    if current_user.get("can_manage_users") or current_user.get("can_manage_roles"):
        return True
    
    # SIMPLE RULE: Only creator can delete their own data
    if record.get("created_by") == user_id:
        return True
    
    return False


def get_delete_error_message(record: dict) -> str:
    """Generate helpful error message for delete permission denial"""
    creator_name = record.get("created_by_name") or "another user"
    return f"You cannot delete this item. It was created by {creator_name}. Only the creator or an admin can delete it."


# ============== MODELS ==============

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_team: Optional[str] = None  # Department/Team
    assigned_to: Optional[str] = None    # Primary owner (user_id)
    priority: str = "medium"  # low, medium, high, urgent
    due_date: Optional[str] = None
    source_module: Optional[str] = None  # sourcing, marketing, sales, hr, finance, etc.
    source_entity_type: Optional[str] = None  # leave_request, expense, reimbursement, etc.
    source_entity_id: Optional[str] = None
    tags: List[str] = []
    related_url: Optional[str] = None  # Link to the source entity
    sync_to_outlook: bool = False  # Create Outlook reminder for due date
    # Approval workflow fields
    task_type: str = "general"  # general, approval, review, action_required
    requires_approval: bool = False
    approver_id: Optional[str] = None  # User who needs to approve
    approval_type: Optional[str] = None  # leave, expense, reimbursement, document, other


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_team: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None  # pending, in_progress, completed, cancelled, pending_approval, approved, rejected
    tags: Optional[List[str]] = None
    completion_notes: Optional[str] = None
    sync_to_outlook: Optional[bool] = None  # Create/update Outlook reminder
    # Approval workflow fields
    approval_status: Optional[str] = None  # pending, approved, rejected
    approval_notes: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None


class ActivityLog(BaseModel):
    module: str  # sourcing, marketing, sales, hr, projects, etc.
    entity_type: str  # brand, supplier, campaign, task, etc.
    entity_id: str
    entity_name: str
    action: str  # created, updated, deleted, status_changed, email_sent, etc.
    action_details: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None


class TaskTriggerConfig(BaseModel):
    module: str
    entity_type: str
    trigger_event: str  # created, status_changed, field_updated, etc.
    trigger_condition: Optional[Dict[str, Any]] = None  # e.g., {"new_status": "qualified"}
    task_template: Dict[str, Any]  # Task template to create
    enabled: bool = True
    due_date_offset_days: int = 3


# ============== OUTLOOK SYNC HELPER ==============

async def sync_task_to_outlook(task_doc: dict, user_id: str) -> Optional[str]:
    """
    Create or update an Outlook calendar event for a task deadline.
    Returns the Outlook event ID if successful, None otherwise.
    """
    import httpx
    import os
    
    # Get user's MS Calendar connection
    connection = await db.ms_calendar_connections.find_one(
        {"user_id": user_id, "is_connected": True}, {"_id": 0}
    )
    
    if not connection or not connection.get("access_token"):
        return None
    
    due_date = task_doc.get("due_date")
    if not due_date:
        return None
    
    # Parse due date and create all-day event or timed reminder
    try:
        # If due_date is just a date (YYYY-MM-DD), create a reminder at 9 AM
        if "T" not in due_date:
            start_datetime = f"{due_date}T09:00:00"
            end_datetime = f"{due_date}T09:30:00"
        else:
            start_datetime = due_date
            # 30 min event
            from datetime import datetime as dt
            start_dt = dt.fromisoformat(due_date.replace("Z", "+00:00"))
            end_dt = start_dt + timedelta(minutes=30)
            end_datetime = end_dt.isoformat()
    except Exception:
        return None
    
    # Build event payload
    priority_emoji = {"urgent": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(task_doc.get("priority", "medium"), "🟡")
    
    event_data = {
        "subject": f"{priority_emoji} Task Due: {task_doc.get('title')}",
        "body": {
            "contentType": "HTML",
            "content": f"""
                <p><strong>Task:</strong> {task_doc.get('title')}</p>
                <p><strong>Priority:</strong> {task_doc.get('priority', 'medium').title()}</p>
                {f"<p><strong>Description:</strong> {task_doc.get('description')}</p>" if task_doc.get('description') else ""}
                {f"<p><strong>Tags:</strong> {', '.join(task_doc.get('tags', []))}</p>" if task_doc.get('tags') else ""}
                <p><em>Created from Sevora Tasks</em></p>
            """
        },
        "start": {
            "dateTime": start_datetime,
            "timeZone": "UTC"
        },
        "end": {
            "dateTime": end_datetime,
            "timeZone": "UTC"
        },
        "isReminderOn": True,
        "reminderMinutesBeforeStart": 60,  # 1 hour before
        "categories": ["Task Deadline"],
        "showAs": "free"  # Don't block the calendar
    }
    
    try:
        async with httpx.AsyncClient() as client:
            existing_event_id = task_doc.get("outlook_event_id")
            
            if existing_event_id:
                # Update existing event
                response = await client.patch(
                    f"https://graph.microsoft.com/v1.0/me/events/{existing_event_id}",
                    headers={
                        "Authorization": f"Bearer {connection.get('access_token')}",
                        "Content-Type": "application/json"
                    },
                    json=event_data
                )
            else:
                # Create new event
                response = await client.post(
                    "https://graph.microsoft.com/v1.0/me/events",
                    headers={
                        "Authorization": f"Bearer {connection.get('access_token')}",
                        "Content-Type": "application/json"
                    },
                    json=event_data
                )
            
            if response.status_code in [200, 201]:
                event_response = response.json()
                return event_response.get("id")
            else:
                print(f"Outlook sync failed: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        print(f"Error syncing task to Outlook: {e}")
        return None


async def delete_outlook_task_event(outlook_event_id: str, user_id: str) -> bool:
    """Delete an Outlook calendar event for a completed/cancelled task."""
    import httpx
    
    connection = await db.ms_calendar_connections.find_one(
        {"user_id": user_id, "is_connected": True}, {"_id": 0}
    )
    
    if not connection or not connection.get("access_token"):
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"https://graph.microsoft.com/v1.0/me/events/{outlook_event_id}",
                headers={
                    "Authorization": f"Bearer {connection.get('access_token')}"
                }
            )
            return response.status_code == 204
    except Exception:
        return False


# ============== TASK ENDPOINTS ==============

@router.get("")
async def get_tasks(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    assigned_team: Optional[str] = None,
    source_module: Optional[str] = None,
    priority: Optional[str] = None,
    is_overdue: Optional[bool] = None,
    search: Optional[str] = None,
    include_my_tasks: bool = True,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user_dep)
):
    """Get all tasks with filters. Respects data scope permissions."""
    from utils.permissions import get_data_scope_query
    
    user_id = current_user.get("id")
    user_role = current_user.get("role", "")
    is_admin = user_role in ["super_admin", "admin"] or current_user.get("can_manage_users")
    
    filter_query = {}
    
    if status:
        filter_query["status"] = status
    if assigned_to:
        filter_query["assigned_to"] = assigned_to
    if assigned_team:
        filter_query["assigned_team"] = assigned_team
    if source_module:
        filter_query["source_module"] = source_module
    if priority:
        filter_query["priority"] = priority
    if search:
        filter_query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if is_overdue:
        now = datetime.now(timezone.utc).isoformat()
        filter_query["due_date"] = {"$lt": now}
        filter_query["status"] = {"$nin": ["completed", "cancelled"]}
    
    # Apply data scope filtering based on user's module permissions
    query = get_data_scope_query(current_user, "project_management", filter_query)
    
    tasks = await db.unified_tasks.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    total = await db.unified_tasks.count_documents(query)
    
    # Add permission info to each task
    for task in tasks:
        task["_permissions"] = {
            "can_edit": task.get("created_by") == user_id or task.get("assigned_to") == user_id or is_admin,
            "can_delete": task.get("created_by") == user_id or is_admin,
            "is_owner": task.get("created_by") == user_id,
        }
    
    return {
        "tasks": tasks,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/paginated")
async def get_tasks_paginated(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    assigned_team: Optional[str] = None,
    source_module: Optional[str] = None,
    priority: Optional[str] = None,
    created_by: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(default="created_at", description="Field to sort by"),
    sort_order: Optional[str] = Query(default="desc", description="Sort order: asc or desc"),
    current_user: dict = Depends(get_current_user_dep)
):
    """Get tasks with pagination, sorting, and filter metadata. Respects data scope."""
    from utils.permissions import get_data_scope_query
    
    user_id = current_user.get("id")
    user_role = current_user.get("role", "")
    is_admin = user_role in ["super_admin", "admin"] or current_user.get("can_manage_users")
    
    filter_query = {}
    
    if status:
        filter_query["status"] = status
    if assigned_to:
        filter_query["assigned_to"] = assigned_to
    if assigned_team:
        filter_query["assigned_team"] = assigned_team
    if source_module:
        filter_query["source_module"] = source_module
    if priority:
        filter_query["priority"] = priority
    if created_by:
        filter_query["created_by"] = created_by
    if search:
        filter_query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    # Apply data scope filtering based on user's module permissions
    query = get_data_scope_query(current_user, "project_management", filter_query)
    
    total = await db.unified_tasks.count_documents(query)
    skip = (page - 1) * page_size
    
    # Validate sort field
    allowed_sort_fields = ["created_at", "title", "due_date", "priority", "status", "updated_at"]
    if sort_by not in allowed_sort_fields:
        sort_by = "created_at"
    sort_direction = -1 if sort_order == "desc" else 1
    
    tasks = await db.unified_tasks.find(query, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(page_size).to_list(length=page_size)
    
    # Add permission info
    for task in tasks:
        task["_permissions"] = {
            "can_edit": task.get("created_by") == user_id or task.get("assigned_to") == user_id or is_admin,
            "can_delete": task.get("created_by") == user_id or is_admin,
            "is_owner": task.get("created_by") == user_id,
        }
    
    # Get filter metadata
    active_users = await db.users.find(
        {"status": "active"}, 
        {"_id": 0, "id": 1, "name": 1}
    ).to_list(100)
    users_list = [{"id": u["id"], "name": u.get("name", "Unknown")} for u in active_users]
    users_list.sort(key=lambda x: x.get("name", "").lower())
    
    unique_teams = await db.unified_tasks.distinct("assigned_team")
    unique_teams = [t for t in unique_teams if t]
    
    unique_modules = await db.unified_tasks.distinct("source_module")
    unique_modules = [m for m in unique_modules if m]
    
    return {
        "tasks": tasks,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "filters_meta": {
            "users": users_list,
            "teams": sorted(unique_teams) if unique_teams else [],
            "modules": sorted(unique_modules) if unique_modules else [],
            "priorities": ["urgent", "high", "medium", "low"],
            "statuses": ["pending", "in_progress", "completed", "cancelled"]
        }
    }


@router.get("/my-tasks")
async def get_my_tasks(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user_dep)
):
    """Get tasks assigned to current user or their team"""
    user_id = current_user.get("id")
    user_dept = current_user.get("department")
    
    query = {
        "$or": [
            {"assigned_to": user_id},
            {"assigned_team": user_dept}
        ]
    }
    
    if status:
        query["status"] = status
    else:
        query["status"] = {"$nin": ["completed", "cancelled"]}
    
    tasks = await db.unified_tasks.find(query, {"_id": 0}).sort([
        ("priority_order", -1),
        ("due_date", 1)
    ]).to_list(length=100)
    
    return tasks


@router.get("/dashboard-stats")
async def get_task_dashboard_stats(
    period: str = "month",
    team: Optional[str] = None,
    current_user: dict = Depends(get_current_user_dep)
):
    """Get task statistics for dashboard"""
    # Calculate date range based on period
    now = datetime.now(timezone.utc)
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
    elif period == "month":
        start_date = now.replace(day=1)
    elif period == "quarter":
        quarter_month = ((now.month - 1) // 3) * 3 + 1
        start_date = now.replace(month=quarter_month, day=1)
    else:  # year
        start_date = now.replace(month=1, day=1)
    
    base_query = {"created_at": {"$gte": start_date.isoformat()}}
    if team:
        base_query["assigned_team"] = team
    
    # Get counts by status
    pipeline = [
        {"$match": base_query},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    status_counts = await db.unified_tasks.aggregate(pipeline).to_list(length=100)
    
    # Get counts by module
    module_pipeline = [
        {"$match": base_query},
        {"$group": {
            "_id": "$source_module",
            "count": {"$sum": 1}
        }}
    ]
    module_counts = await db.unified_tasks.aggregate(module_pipeline).to_list(length=100)
    
    # Get counts by priority
    priority_pipeline = [
        {"$match": {**base_query, "status": {"$nin": ["completed", "cancelled"]}}},
        {"$group": {
            "_id": "$priority",
            "count": {"$sum": 1}
        }}
    ]
    priority_counts = await db.unified_tasks.aggregate(priority_pipeline).to_list(length=100)
    
    # Get overdue count
    overdue_count = await db.unified_tasks.count_documents({
        **base_query,
        "due_date": {"$lt": now.isoformat()},
        "status": {"$nin": ["completed", "cancelled"]}
    })
    
    # Get completion rate
    total_tasks = await db.unified_tasks.count_documents(base_query)
    completed_tasks = await db.unified_tasks.count_documents({**base_query, "status": "completed"})
    completion_rate = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
    
    return {
        "by_status": {item["_id"]: item["count"] for item in status_counts if item["_id"]},
        "by_module": {item["_id"]: item["count"] for item in module_counts if item["_id"]},
        "by_priority": {item["_id"]: item["count"] for item in priority_counts if item["_id"]},
        "overdue": overdue_count,
        "total": total_tasks,
        "completed": completed_tasks,
        "completion_rate": completion_rate,
        "period": period
    }


@router.get("/by-assignee")
async def get_tasks_by_assignee(
    period: str = "month",
    current_user: dict = Depends(get_current_user_dep)
):
    """Get task distribution by assignee for team dashboard"""
    now = datetime.now(timezone.utc)
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
    elif period == "month":
        start_date = now.replace(day=1)
    elif period == "quarter":
        quarter_month = ((now.month - 1) // 3) * 3 + 1
        start_date = now.replace(month=quarter_month, day=1)
    else:
        start_date = now.replace(month=1, day=1)
    
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date.isoformat()}}},
        {"$group": {
            "_id": {
                "assigned_to": "$assigned_to",
                "assigned_to_name": "$assigned_to_name",
                "status": "$status"
            },
            "count": {"$sum": 1}
        }},
        {"$group": {
            "_id": {
                "assigned_to": "$_id.assigned_to",
                "assigned_to_name": "$_id.assigned_to_name"
            },
            "tasks": {
                "$push": {
                    "status": "$_id.status",
                    "count": "$count"
                }
            },
            "total": {"$sum": "$count"}
        }},
        {"$sort": {"total": -1}},
        {"$limit": 20}
    ]
    
    results = await db.unified_tasks.aggregate(pipeline).to_list(length=20)
    
    return {
        "assignees": [
            {
                "assigned_to": r["_id"]["assigned_to"],
                "name": r["_id"]["assigned_to_name"] or "Unassigned",
                "tasks": r["tasks"],
                "total": r["total"]
            }
            for r in results
        ],
        "period": period
    }


@router.get("/team-performance")
async def get_team_performance(
    period: str = "month",
    task_type: Optional[str] = None,  # operational, project, personal, all
    department: Optional[str] = None,
    current_user: dict = Depends(get_current_user_dep)
):
    """Get detailed team performance data with task breakdown by type"""
    now = datetime.now(timezone.utc)
    
    # Calculate date range
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
    elif period == "month":
        start_date = now.replace(day=1)
    elif period == "quarter":
        quarter_month = ((now.month - 1) // 3) * 3 + 1
        start_date = now.replace(month=quarter_month, day=1)
    else:  # year
        start_date = now.replace(month=1, day=1)
    
    start_date_str = start_date.isoformat()
    
    # Get all active users (exclude deleted)
    users = await db.users.find(
        {"status": {"$nin": ["deleted", "terminated"]}}, 
        {"_id": 0, "id": 1, "name": 1, "email": 1, "department": 1, "role": 1}
    ).to_list(length=200)
    
    if department and department != 'all':
        users = [u for u in users if u.get('department') == department]
    
    team_performance = []
    
    for user in users:
        user_id = user.get('id')
        user_name = user.get('name', 'Unknown')
        
        # Get operational tasks (from unified_tasks)
        operational_query = {
            "created_at": {"$gte": start_date_str},
            "$or": [
                {"assigned_to": user_id},
                {"created_by": user_id}
            ]
        }
        
        operational_total = await db.unified_tasks.count_documents(operational_query)
        operational_completed = await db.unified_tasks.count_documents({**operational_query, "status": "completed"})
        operational_in_progress = await db.unified_tasks.count_documents({**operational_query, "status": "in_progress"})
        operational_overdue = await db.unified_tasks.count_documents({
            **operational_query,
            "due_date": {"$lt": now.isoformat()},
            "status": {"$nin": ["completed", "cancelled"]}
        })
        
        # Get project tasks (from tasks collection - project management)
        project_query = {
            "created_at": {"$gte": start_date_str},
            "$or": [
                {"assignee_id": user_id},
                {"assigned_to": user_id}
            ]
        }
        
        project_total = await db.tasks.count_documents(project_query)
        project_completed = await db.tasks.count_documents({**project_query, "status": {"$in": ["completed", "done"]}})
        project_in_progress = await db.tasks.count_documents({**project_query, "status": {"$in": ["in_progress", "in-progress"]}})
        project_overdue = await db.tasks.count_documents({
            **project_query,
            "due_date": {"$lt": now.isoformat()},
            "status": {"$nin": ["completed", "done", "cancelled"]}
        })
        
        # Personal tasks are project tasks created by and assigned to the same user
        personal_query = {
            "created_at": {"$gte": start_date_str},
            "created_by": user_id,
            "$or": [
                {"assignee_id": user_id},
                {"assigned_to": user_id},
                {"assignee_id": {"$exists": False}},
                {"assigned_to": {"$exists": False}}
            ]
        }
        
        personal_total = await db.tasks.count_documents(personal_query)
        personal_completed = await db.tasks.count_documents({**personal_query, "status": {"$in": ["completed", "done"]}})
        
        # Calculate totals
        total_tasks = operational_total + project_total
        total_completed = operational_completed + project_completed
        total_overdue = operational_overdue + project_overdue
        _ = round((total_completed / total_tasks * 100) if total_tasks > 0 else 0, 1)  # Used in breakdown
        
        # Filter by task type if specified
        if task_type == 'operational':
            displayed_total = operational_total
            displayed_completed = operational_completed
            displayed_in_progress = operational_in_progress
            displayed_overdue = operational_overdue
        elif task_type == 'project':
            displayed_total = project_total
            displayed_completed = project_completed
            displayed_in_progress = project_in_progress
            displayed_overdue = project_overdue
        elif task_type == 'personal':
            displayed_total = personal_total
            displayed_completed = personal_completed
            displayed_in_progress = 0
            displayed_overdue = 0
        else:
            displayed_total = total_tasks
            displayed_completed = total_completed
            displayed_in_progress = operational_in_progress + project_in_progress
            displayed_overdue = total_overdue
        
        if displayed_total > 0 or task_type is None:  # Include users with 0 tasks only if no filter
            team_performance.append({
                "user_id": user_id,
                "name": user_name,
                "email": user.get('email'),
                "department": user.get('department'),
                "role": user.get('role'),
                "performance": {
                    "total": displayed_total,
                    "completed": displayed_completed,
                    "in_progress": displayed_in_progress,
                    "overdue": displayed_overdue,
                    "completion_rate": round((displayed_completed / displayed_total * 100) if displayed_total > 0 else 0, 1),
                    "breakdown": {
                        "operational": {
                            "total": operational_total,
                            "completed": operational_completed,
                            "in_progress": operational_in_progress,
                            "overdue": operational_overdue
                        },
                        "project": {
                            "total": project_total,
                            "completed": project_completed,
                            "in_progress": project_in_progress,
                            "overdue": project_overdue
                        },
                        "personal": {
                            "total": personal_total,
                            "completed": personal_completed
                        }
                    }
                }
            })
    
    # Sort by completion rate descending
    team_performance.sort(key=lambda x: (x["performance"]["completed"], x["performance"]["completion_rate"]), reverse=True)
    
    return {
        "period": period,
        "task_type": task_type or "all",
        "department": department or "all",
        "team_members": team_performance[:50],  # Top 50
        "summary": {
            "total_members": len(team_performance),
            "avg_completion_rate": round(sum(m["performance"]["completion_rate"] for m in team_performance) / len(team_performance), 1) if team_performance else 0,
            "total_tasks": sum(m["performance"]["total"] for m in team_performance),
            "total_completed": sum(m["performance"]["completed"] for m in team_performance),
            "total_overdue": sum(m["performance"]["overdue"] for m in team_performance)
        }
    }


@router.post("")
async def create_task(
    task: TaskCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user_dep)
):
    """Create a new task"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Get assignee name if assigned_to is provided
    assigned_to_name = None
    if task.assigned_to:
        user = await db.users.find_one({"id": task.assigned_to}, {"name": 1})
        assigned_to_name = user.get("name") if user else None
    
    # Calculate priority order for sorting
    priority_order = {"urgent": 4, "high": 3, "medium": 2, "low": 1}.get(task.priority, 2)
    
    # Generate task fingerprint for deduplication
    fingerprint = None
    if task.source_module and task.source_entity_id:
        fingerprint = f"{task.source_module}_{task.source_entity_type}_{task.source_entity_id}_manual"
    
    task_doc = {
        "id": str(uuid.uuid4()),
        "title": task.title,
        "description": task.description,
        "assigned_team": task.assigned_team,
        "assigned_to": task.assigned_to,
        "assigned_to_name": assigned_to_name,
        "priority": task.priority,
        "priority_order": priority_order,
        "due_date": task.due_date,
        "status": "pending",
        "source_module": task.source_module,
        "source_entity_type": task.source_entity_type,
        "source_entity_id": task.source_entity_id,
        "task_fingerprint": fingerprint,
        "related_url": task.related_url,
        "tags": task.tags,
        "is_auto_generated": False,
        "auto_trigger": None,
        "sync_to_outlook": task.sync_to_outlook,
        "outlook_event_id": None,
        "created_by": current_user.get("id"),
        "created_by_name": current_user.get("name"),
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
        "completion_notes": None
    }
    
    # Sync to Outlook if enabled and has due date
    if task.sync_to_outlook and task.due_date:
        outlook_event_id = await sync_task_to_outlook(task_doc, current_user.get("id"))
        if outlook_event_id:
            task_doc["outlook_event_id"] = outlook_event_id
    
    await db.unified_tasks.insert_one(task_doc)
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        module="tasks",
        entity_type="task",
        entity_id=task_doc["id"],
        entity_name=task.title,
        action="created",
        user_id=current_user.get("id"),
        user_name=current_user.get("name")
    )
    
    del task_doc["_id"]
    return task_doc


@router.get("/{task_id}")
async def get_task(task_id: str, current_user: dict = Depends(get_current_user_dep)):
    """Get a specific task"""
    task = await db.unified_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}")
async def update_task(
    task_id: str,
    update: TaskUpdate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user_dep)
):
    """Update a task"""
    task = await db.unified_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = now
    
    # Update assignee name if assigned_to changed
    if "assigned_to" in update_data:
        user = await db.users.find_one({"id": update_data["assigned_to"]}, {"name": 1})
        update_data["assigned_to_name"] = user.get("name") if user else None
    
    # Update priority order
    if "priority" in update_data:
        update_data["priority_order"] = {"urgent": 4, "high": 3, "medium": 2, "low": 1}.get(update_data["priority"], 2)
    
    # Set completed_at if status changed to completed
    if update_data.get("status") == "completed" and task.get("status") != "completed":
        update_data["completed_at"] = now
    
    # Handle Outlook sync
    should_sync_outlook = False
    should_delete_outlook_event = False
    
    # If sync_to_outlook is being enabled, sync to Outlook
    if update_data.get("sync_to_outlook") and not task.get("sync_to_outlook"):
        should_sync_outlook = True
    
    # If due_date changed and sync is enabled, update Outlook
    if "due_date" in update_data and task.get("sync_to_outlook"):
        should_sync_outlook = True
    
    # If task is completed/cancelled, remove from Outlook
    if update_data.get("status") in ["completed", "cancelled"] and task.get("outlook_event_id"):
        should_delete_outlook_event = True
    
    # Handle Outlook sync before updating database
    if should_delete_outlook_event:
        await delete_outlook_task_event(task.get("outlook_event_id"), current_user.get("id"))
        update_data["outlook_event_id"] = None
    elif should_sync_outlook and (task.get("due_date") or update_data.get("due_date")):
        merged_task = {**task, **update_data}
        merged_task["outlook_event_id"] = task.get("outlook_event_id")  # Keep existing ID for update
        outlook_event_id = await sync_task_to_outlook(merged_task, current_user.get("id"))
        if outlook_event_id:
            update_data["outlook_event_id"] = outlook_event_id
    
    await db.unified_tasks.update_one({"id": task_id}, {"$set": update_data})
    
    # BIDIRECTIONAL SYNC: Update pm_tasks if this task is synced
    if task.get("synced_pm_task_id") or task.get("source_module") == "meetings":
        pm_update = {}
        if "status" in update_data:
            # Map unified_tasks status to pm_tasks status
            status_map = {"pending": "todo", "in_progress": "in_progress", "completed": "done", "cancelled": "cancelled"}
            pm_update["status"] = status_map.get(update_data["status"], update_data["status"])
        if "assigned_to" in update_data:
            pm_update["assigned_to"] = update_data["assigned_to"]
        if "priority" in update_data:
            pm_update["priority"] = update_data["priority"]
        if "due_date" in update_data:
            pm_update["due_date"] = update_data["due_date"]
        if pm_update:
            pm_update["updated_at"] = now
            await db.pm_tasks.update_one({"id": task_id}, {"$set": pm_update})
    
    # Log activity
    action = "updated"
    if "status" in update_data:
        action = f"status_changed_to_{update_data['status']}"
    
    background_tasks.add_task(
        log_activity,
        module="tasks",
        entity_type="task",
        entity_id=task_id,
        entity_name=task.get("title"),
        action=action,
        action_details=update_data,
        user_id=current_user.get("id"),
        user_name=current_user.get("name")
    )
    
    updated_task = await db.unified_tasks.find_one({"id": task_id}, {"_id": 0})
    return updated_task


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user_dep)
):
    """Delete a task - only creator, assigned user, or admin can delete"""
    task = await db.unified_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check delete permission
    if not can_delete_record(task, current_user):
        raise HTTPException(status_code=403, detail=get_delete_error_message(task))
    
    await db.unified_tasks.delete_one({"id": task_id})
    
    background_tasks.add_task(
        log_activity,
        module="tasks",
        entity_type="task",
        entity_id=task_id,
        entity_name=task.get("title"),
        action="deleted",
        user_id=current_user.get("id"),
        user_name=current_user.get("name")
    )
    
    return {"message": "Task deleted successfully"}


# ============== APPROVAL WORKFLOW ENDPOINTS ==============

@router.get("/approvals/pending")
async def get_pending_approvals(
    current_user: dict = Depends(get_current_user_dep)
):
    """Get all tasks pending approval for the current user"""
    query = {
        "$or": [
            {"approver_id": current_user.get("id")},
            {"assigned_to": current_user.get("id"), "requires_approval": True}
        ],
        "approval_status": {"$in": ["pending", None]},
        "requires_approval": True,
        "status": {"$ne": "cancelled"}
    }
    
    tasks = await db.unified_tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Group by approval type
    grouped = {
        "leave": [],
        "expense": [],
        "reimbursement": [],
        "document": [],
        "other": []
    }
    
    for task in tasks:
        approval_type = task.get("approval_type", "other")
        if approval_type in grouped:
            grouped[approval_type].append(task)
        else:
            grouped["other"].append(task)
    
    return {
        "total": len(tasks),
        "grouped": grouped,
        "tasks": tasks
    }


@router.post("/{task_id}/approve")
async def approve_task(
    task_id: str,
    approval_data: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user_dep)
):
    """Approve a task that requires approval"""
    task = await db.unified_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if user can approve
    if task.get("approver_id") != current_user.get("id") and current_user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="You are not authorized to approve this task")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "approval_status": "approved",
        "approved_by": current_user.get("id"),
        "approved_by_name": current_user.get("name"),
        "approved_at": now,
        "approval_notes": approval_data.get("notes", ""),
        "status": "completed",
        "updated_at": now
    }
    
    await db.unified_tasks.update_one({"id": task_id}, {"$set": update_data})
    
    # Update source entity if linked (e.g., approve the leave request)
    if task.get("source_module") and task.get("source_entity_id"):
        await _update_source_entity_approval(
            task.get("source_module"),
            task.get("source_entity_type"),
            task.get("source_entity_id"),
            "approved",
            current_user
        )
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        module="tasks",
        entity_type="approval",
        entity_id=task_id,
        entity_name=task.get("title"),
        action="approved",
        action_details={"notes": approval_data.get("notes", "")},
        user_id=current_user.get("id"),
        user_name=current_user.get("name")
    )
    
    # Create notification for task creator
    if task.get("created_by") and task.get("created_by") != current_user.get("id"):
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": task.get("created_by"),
            "title": "Task Approved",
            "message": f"Your request '{task.get('title')}' has been approved by {current_user.get('name')}",
            "category": "tasks",
            "priority": "normal",
            "entity_type": "task",
            "entity_id": task_id,
            "action_url": f"/tasks?task={task_id}",
            "is_read": False,
            "created_at": now
        })
    
    return {"status": "success", "message": "Task approved successfully"}


@router.post("/{task_id}/reject")
async def reject_task(
    task_id: str,
    rejection_data: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user_dep)
):
    """Reject a task that requires approval"""
    task = await db.unified_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if user can reject
    if task.get("approver_id") != current_user.get("id") and current_user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="You are not authorized to reject this task")
    
    reason = rejection_data.get("reason", "")
    if not reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "approval_status": "rejected",
        "approved_by": current_user.get("id"),
        "approved_by_name": current_user.get("name"),
        "approved_at": now,
        "approval_notes": reason,
        "status": "cancelled",
        "updated_at": now
    }
    
    await db.unified_tasks.update_one({"id": task_id}, {"$set": update_data})
    
    # Update source entity if linked
    if task.get("source_module") and task.get("source_entity_id"):
        await _update_source_entity_approval(
            task.get("source_module"),
            task.get("source_entity_type"),
            task.get("source_entity_id"),
            "rejected",
            current_user,
            reason
        )
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        module="tasks",
        entity_type="approval",
        entity_id=task_id,
        entity_name=task.get("title"),
        action="rejected",
        action_details={"reason": reason},
        user_id=current_user.get("id"),
        user_name=current_user.get("name")
    )
    
    # Create notification for task creator
    if task.get("created_by") and task.get("created_by") != current_user.get("id"):
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": task.get("created_by"),
            "title": "Task Rejected",
            "message": f"Your request '{task.get('title')}' has been rejected. Reason: {reason}",
            "category": "tasks",
            "priority": "high",
            "entity_type": "task",
            "entity_id": task_id,
            "action_url": f"/tasks?task={task_id}",
            "is_read": False,
            "created_at": now
        })
    
    return {"status": "success", "message": "Task rejected"}


async def _update_source_entity_approval(
    source_module: str,
    source_entity_type: str,
    source_entity_id: str,
    status: str,
    approver: dict,
    reason: str = ""
):
    """Update the source entity when approval status changes"""
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "approval_status": status,
        "approved_by": approver.get("id"),
        "approved_by_name": approver.get("name"),
        "approved_at": now,
        "updated_at": now
    }
    
    if reason:
        update_data["rejection_reason"] = reason
    
    # Update based on source module
    if source_module == "hr" and source_entity_type == "leave_request":
        await db.leave_requests.update_one({"id": source_entity_id}, {"$set": update_data})
    elif source_module == "finance" and source_entity_type in ["expense", "reimbursement"]:
        await db.expenses.update_one({"id": source_entity_id}, {"$set": update_data})
    elif source_module == "hr" and source_entity_type == "reimbursement":
        await db.reimbursements.update_one({"id": source_entity_id}, {"$set": update_data})


@router.get("/approvals/history")
async def get_approval_history(
    status: Optional[str] = None,
    approval_type: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user_dep)
):
    """Get approval history for tasks the user has acted on"""
    query = {
        "approved_by": current_user.get("id"),
        "requires_approval": True
    }
    
    if status:
        query["approval_status"] = status
    if approval_type:
        query["approval_type"] = approval_type
    
    tasks = await db.unified_tasks.find(query, {"_id": 0}).sort("approved_at", -1).limit(limit).to_list(limit)
    
    return {
        "total": len(tasks),
        "tasks": tasks
    }


# ============== HR/FINANCE INTEGRATION ==============

@router.post("/create-approval-task")
async def create_approval_task(
    request_data: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user_dep)
):
    """
    Create an approval task from HR/Finance modules.
    Called when leave request, expense, or reimbursement is submitted.
    """
    source_module = request_data.get("source_module")  # hr, finance
    source_entity_type = request_data.get("source_entity_type")  # leave_request, expense, reimbursement
    source_entity_id = request_data.get("source_entity_id")
    title = request_data.get("title")
    description = request_data.get("description", "")
    approver_id = request_data.get("approver_id")  # Manager or designated approver
    priority = request_data.get("priority", "medium")
    due_date = request_data.get("due_date")
    related_url = request_data.get("related_url")
    
    if not all([source_module, source_entity_type, source_entity_id, title, approver_id]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Map entity type to approval type
    approval_type_map = {
        "leave_request": "leave",
        "expense": "expense",
        "reimbursement": "reimbursement",
        "document": "document"
    }
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Get approver name
    approver = await db.users.find_one({"id": approver_id}, {"name": 1})
    approver_name = approver.get("name") if approver else "Unknown"
    
    task_doc = {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": description,
        "assigned_to": approver_id,
        "assigned_to_name": approver_name,
        "priority": priority,
        "due_date": due_date,
        "status": "pending",
        "source_module": source_module,
        "source_entity_type": source_entity_type,
        "source_entity_id": source_entity_id,
        "related_url": related_url,
        "tags": [source_module, source_entity_type, "approval"],
        "task_type": "approval",
        "requires_approval": True,
        "approver_id": approver_id,
        "approval_type": approval_type_map.get(source_entity_type, "other"),
        "approval_status": "pending",
        "created_by": current_user.get("id"),
        "created_by_name": current_user.get("name"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.unified_tasks.insert_one(task_doc)
    
    # Create notification for approver
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": approver_id,
        "title": f"New {source_entity_type.replace('_', ' ').title()} for Approval",
        "message": f"{current_user.get('name')} has submitted: {title}",
        "category": "tasks",
        "priority": "high",
        "entity_type": "task",
        "entity_id": task_doc["id"],
        "action_url": f"/tasks/approvals",
        "is_read": False,
        "created_at": now
    })
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        module="tasks",
        entity_type="approval_task",
        entity_id=task_doc["id"],
        entity_name=title,
        action="created",
        action_details={"source_module": source_module, "source_entity_type": source_entity_type},
        user_id=current_user.get("id"),
        user_name=current_user.get("name")
    )
    
    return {
        "status": "success",
        "task_id": task_doc["id"],
        "message": "Approval task created and notification sent"
    }


# ============== ACTIVITY LOG ENDPOINTS ==============

@router.get("/activities/feed")
async def get_activity_feed(
    module: Optional[str] = None,
    entity_type: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user_dep)
):
    """Get activity feed with filters"""
    query = {}
    if module:
        query["module"] = module
    if entity_type:
        query["entity_type"] = entity_type
    if user_id:
        query["user_id"] = user_id
    
    activities = await db.activity_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(length=limit)
    return activities


@router.post("/activities/log")
async def create_activity_log(
    activity: ActivityLog,
    current_user: dict = Depends(get_current_user_dep)
):
    """Manually log an activity"""
    await log_activity(
        module=activity.module,
        entity_type=activity.entity_type,
        entity_id=activity.entity_id,
        entity_name=activity.entity_name,
        action=activity.action,
        action_details=activity.action_details,
        user_id=activity.user_id or current_user.get("id"),
        user_name=activity.user_name or current_user.get("name")
    )
    return {"message": "Activity logged"}


# ============== TASK SYNC ENDPOINTS ==============

class PMTaskSync(BaseModel):
    """Sync a PM task status to unified tasks"""
    pm_task_id: str
    status: str
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None


@router.post("/sync/from-pm-task")
async def sync_from_pm_task(
    sync_data: PMTaskSync,
    current_user: dict = Depends(get_current_user_dep)
):
    """Sync status from pm_tasks to unified_tasks (called when PM task is updated)"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Find corresponding unified task
    unified_task = await db.unified_tasks.find_one({"id": sync_data.pm_task_id})
    
    if unified_task:
        # Map pm_tasks status to unified_tasks status
        status_map = {"todo": "pending", "in_progress": "in_progress", "done": "completed", "cancelled": "cancelled"}
        
        update_data = {
            "status": status_map.get(sync_data.status, sync_data.status),
            "updated_at": now
        }
        
        if sync_data.status in ["done", "completed"]:
            update_data["completed_at"] = now
        
        if sync_data.assigned_to:
            update_data["assigned_to"] = sync_data.assigned_to
        if sync_data.priority:
            update_data["priority"] = sync_data.priority
        if sync_data.due_date:
            update_data["due_date"] = sync_data.due_date
        
        await db.unified_tasks.update_one({"id": sync_data.pm_task_id}, {"$set": update_data})
        
        return {"message": "Unified task synced", "task_id": sync_data.pm_task_id}
    
    return {"message": "No unified task found to sync", "task_id": sync_data.pm_task_id}


@router.get("/unified-view")
async def get_unified_task_view(
    assigned_to: Optional[str] = None,
    status: Optional[str] = None,
    source: str = "all",  # all, unified, pm
    include_completed: bool = False,
    limit: int = 100,
    current_user: dict = Depends(get_current_user_dep)
):
    """Get a unified view of tasks from both unified_tasks and pm_tasks"""
    user_id = assigned_to or current_user.get("id")
    tasks = []
    
    # Build base query
    base_query = {"$or": [{"assigned_to": user_id}, {"created_by": user_id}]}
    if status:
        base_query["status"] = status
    if not include_completed:
        base_query["status"] = {"$nin": ["completed", "done", "cancelled"]}
    
    # Get from unified_tasks
    if source in ["all", "unified"]:
        unified = await db.unified_tasks.find(base_query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        for t in unified:
            t["_source"] = "operational"
            t["_display_status"] = t.get("status", "pending")
        tasks.extend(unified)
    
    # Get from pm_tasks (exclude those already synced)
    if source in ["all", "pm"]:
        pm_query = {**base_query}
        pm_status_map = {"pending": {"$in": ["todo", "in_progress"]}, "completed": "done"}
        if status and status in pm_status_map:
            pm_query["status"] = pm_status_map[status]
        if not include_completed:
            pm_query["status"] = {"$nin": ["done", "cancelled"]}
        
        pm_tasks = await db.pm_tasks.find(pm_query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Exclude already synced tasks
        unified_ids = {t.get("id") for t in tasks}
        for t in pm_tasks:
            if t.get("id") not in unified_ids and not t.get("synced_unified_task_id"):
                t["_source"] = "project"
                t["title"] = t.get("name", t.get("title"))  # Normalize field name
                status_map = {"todo": "pending", "in_progress": "in_progress", "done": "completed"}
                t["_display_status"] = status_map.get(t.get("status"), t.get("status"))
                tasks.append(t)
    
    # Sort all tasks by created_at
    tasks.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {
        "tasks": tasks[:limit],
        "total": len(tasks),
        "sources": {"unified": source in ["all", "unified"], "pm": source in ["all", "pm"]}
    }


# ============== TASK TRIGGER CONFIGURATION ==============

@router.get("/triggers/config")
async def get_trigger_configs(current_user: dict = Depends(get_current_user_dep)):
    """Get all task trigger configurations"""
    configs = await db.task_trigger_configs.find({}, {"_id": 0}).to_list(length=100)
    return configs


@router.post("/triggers/config")
async def create_trigger_config(
    config: TaskTriggerConfig,
    current_user: dict = Depends(get_current_user_dep)
):
    """Create a new task trigger configuration"""
    config_doc = {
        "id": str(uuid.uuid4()),
        **config.dict(),
        "created_by": current_user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.task_trigger_configs.insert_one(config_doc)
    del config_doc["_id"]
    return config_doc


@router.put("/triggers/config/{config_id}")
async def update_trigger_config(
    config_id: str,
    config: TaskTriggerConfig,
    current_user: dict = Depends(get_current_user_dep)
):
    """Update a task trigger configuration"""
    update_data = config.dict()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.task_trigger_configs.update_one(
        {"id": config_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Config not found")
    
    return {"message": "Config updated"}


@router.delete("/triggers/config/{config_id}")
async def delete_trigger_config(
    config_id: str,
    current_user: dict = Depends(get_current_user_dep)
):
    """Delete a task trigger configuration"""
    result = await db.task_trigger_configs.delete_one({"id": config_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Config not found")
    return {"message": "Config deleted"}


@router.post("/triggers/seed")
async def seed_triggers(current_user: dict = Depends(get_current_user_dep)):
    """Seed default task triggers"""
    await seed_default_triggers()
    configs = await db.task_trigger_configs.find({}, {"_id": 0}).to_list(length=100)
    return {"message": "Default triggers seeded", "count": len(configs)}


# ============== HELPER FUNCTIONS ==============

async def log_activity(
    module: str,
    entity_type: str,
    entity_id: str,
    entity_name: str,
    action: str,
    action_details: dict = None,
    user_id: str = None,
    user_name: str = None
):
    """Log an activity to the activity_logs collection"""
    activity_doc = {
        "id": str(uuid.uuid4()),
        "module": module,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "action": action,
        "action_details": action_details or {},
        "user_id": user_id,
        "user_name": user_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_logs.insert_one(activity_doc)
    
    # Check for auto-task triggers
    await check_and_create_auto_task(module, entity_type, entity_id, entity_name, action, action_details)


async def check_and_create_auto_task(
    module: str,
    entity_type: str,
    entity_id: str,
    entity_name: str,
    action: str,
    action_details: dict = None
):
    """Check trigger configs and create auto-task if conditions match"""
    # Find matching trigger configs
    configs = await db.task_trigger_configs.find({
        "module": module,
        "entity_type": entity_type,
        "trigger_event": action,
        "enabled": True
    }).to_list(length=10)
    
    for config in configs:
        # Check trigger condition if specified
        if config.get("trigger_condition"):
            condition = config["trigger_condition"]
            # Simple condition check - can be extended
            if action_details:
                match = all(action_details.get(k) == v for k, v in condition.items())
                if not match:
                    continue
        
        # Generate unique fingerprint
        trigger_type = config.get("task_template", {}).get("trigger_type", action)
        fingerprint = f"{module}_{entity_type}_{entity_id}_{trigger_type}"
        
        # Check if task with this fingerprint already exists and is not completed
        existing = await db.unified_tasks.find_one({
            "task_fingerprint": fingerprint,
            "status": {"$nin": ["completed", "cancelled"]}
        })
        
        if existing:
            # Skip - task already exists
            continue
        
        # Create auto-task
        template = config.get("task_template", {})
        now = datetime.now(timezone.utc)
        due_date = (now + timedelta(days=config.get("due_date_offset_days", 3))).isoformat()
        
        # Replace placeholders in title/description
        title = template.get("title", f"Follow up on {entity_name}")
        title = title.replace("{entity_name}", entity_name).replace("{entity_type}", entity_type)
        
        description = template.get("description", "")
        description = description.replace("{entity_name}", entity_name).replace("{entity_type}", entity_type)
        
        task_doc = {
            "id": str(uuid.uuid4()),
            "title": title,
            "description": description,
            "assigned_team": template.get("assigned_team"),
            "assigned_to": template.get("assigned_to"),
            "assigned_to_name": None,
            "priority": template.get("priority", "medium"),
            "priority_order": {"urgent": 4, "high": 3, "medium": 2, "low": 1}.get(template.get("priority", "medium"), 2),
            "due_date": due_date,
            "status": "pending",
            "source_module": module,
            "source_entity_type": entity_type,
            "source_entity_id": entity_id,
            "task_fingerprint": fingerprint,
            "related_url": f"/{module}/{entity_type}s/{entity_id}",
            "tags": template.get("tags", []),
            "is_auto_generated": True,
            "auto_trigger": action,
            "created_by": "system",
            "created_by_name": "System",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "completed_at": None,
            "completion_notes": None
        }
        
        await db.unified_tasks.insert_one(task_doc)


# ============== SEED DEFAULT TRIGGERS ==============

async def seed_default_triggers():
    """Seed default task triggers if none exist"""
    count = await db.task_trigger_configs.count_documents({})
    if count > 0:
        return
    
    default_triggers = [
        # Sourcing - Brands
        {
            "id": str(uuid.uuid4()),
            "module": "sourcing",
            "entity_type": "brand",
            "trigger_event": "created",
            "trigger_condition": None,
            "task_template": {
                "title": "Initial outreach to {entity_name}",
                "description": "Send introduction email to the newly added brand",
                "priority": "high",
                "assigned_team": "sourcing",
                "trigger_type": "initial_outreach",
                "tags": ["outreach", "new-brand"]
            },
            "enabled": True,
            "due_date_offset_days": 2,
            "created_by": "system",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "module": "sourcing",
            "entity_type": "brand",
            "trigger_event": "status_changed",
            "trigger_condition": {"new_status": "Qualified"},
            "task_template": {
                "title": "Schedule meeting with {entity_name}",
                "description": "Brand has been qualified. Schedule an intro meeting.",
                "priority": "high",
                "assigned_team": "sourcing",
                "trigger_type": "schedule_meeting",
                "tags": ["meeting", "qualified"]
            },
            "enabled": True,
            "due_date_offset_days": 3,
            "created_by": "system",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Sourcing - Suppliers
        {
            "id": str(uuid.uuid4()),
            "module": "sourcing",
            "entity_type": "supplier",
            "trigger_event": "created",
            "trigger_condition": None,
            "task_template": {
                "title": "Request samples from {entity_name}",
                "description": "Contact the new supplier and request product samples",
                "priority": "medium",
                "assigned_team": "sourcing",
                "trigger_type": "request_samples",
                "tags": ["samples", "new-supplier"]
            },
            "enabled": True,
            "due_date_offset_days": 5,
            "created_by": "system",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Sourcing - Manufacturers
        {
            "id": str(uuid.uuid4()),
            "module": "sourcing",
            "entity_type": "manufacturer",
            "trigger_event": "created",
            "trigger_condition": None,
            "task_template": {
                "title": "Schedule factory visit for {entity_name}",
                "description": "Arrange a factory visit to assess manufacturing capabilities",
                "priority": "medium",
                "assigned_team": "sourcing",
                "trigger_type": "factory_visit",
                "tags": ["factory-visit", "new-manufacturer"]
            },
            "enabled": True,
            "due_date_offset_days": 7,
            "created_by": "system",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Marketing
        {
            "id": str(uuid.uuid4()),
            "module": "marketing",
            "entity_type": "campaign",
            "trigger_event": "created",
            "trigger_condition": None,
            "task_template": {
                "title": "Review assets for {entity_name}",
                "description": "Review and approve campaign creative assets",
                "priority": "high",
                "assigned_team": "marketing",
                "trigger_type": "review_assets",
                "tags": ["review", "campaign"]
            },
            "enabled": True,
            "due_date_offset_days": 2,
            "created_by": "system",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # HR
        {
            "id": str(uuid.uuid4()),
            "module": "hr",
            "entity_type": "employee",
            "trigger_event": "onboarded",
            "trigger_condition": None,
            "task_template": {
                "title": "Complete onboarding for {entity_name}",
                "description": "Ensure all onboarding steps are completed for the new employee",
                "priority": "high",
                "assigned_team": "hr",
                "trigger_type": "onboarding_checklist",
                "tags": ["onboarding", "new-employee"]
            },
            "enabled": True,
            "due_date_offset_days": 7,
            "created_by": "system",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.task_trigger_configs.insert_many(default_triggers)
    print("Default task triggers seeded")
