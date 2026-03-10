"""
Analytics & Insights Module - Team Dashboard APIs
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics & Insights"])

# Database and auth will be injected
db = None
_get_current_user_func = None

def init_router(database, auth_dependency):
    """Initialize router with database and auth dependency"""
    global db, _get_current_user_func
    db = database
    _get_current_user_func = auth_dependency


from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer(auto_error=False)

async def get_current_user_dep(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Wrapper for the injected auth dependency"""
    if _get_current_user_func is None:
        raise HTTPException(status_code=500, detail="Auth not initialized")
    return await _get_current_user_func(credentials)


# ============== RESPONSE MODELS ==============

class TeamOverviewResponse(BaseModel):
    total_employees: int
    active_today: int
    departments: List[Dict[str, Any]]
    new_employees_this_month: int


class TaskSummaryResponse(BaseModel):
    total_tasks: int
    assigned: int
    in_progress: int
    completed: int
    overdue: int
    completion_rate: float


class ProjectSummaryResponse(BaseModel):
    total_projects: int
    active: int
    completed: int
    on_hold: int
    at_risk: int
    projects: List[Dict[str, Any]]


class DeadlineItem(BaseModel):
    id: str
    title: str
    type: str  # 'task' or 'milestone'
    due_date: str
    project_name: Optional[str] = None
    assignee_name: Optional[str] = None
    priority: Optional[str] = None
    status: str


class MeetingItem(BaseModel):
    id: str
    title: str
    start_time: str
    end_time: Optional[str] = None
    meeting_type: str
    participants_count: int
    status: str


class ProductivityDataPoint(BaseModel):
    date: str
    tasks_completed: int
    tasks_created: int


class WorkloadItem(BaseModel):
    user_id: str
    user_name: str
    department: Optional[str] = None
    total_tasks: int
    completed: int
    in_progress: int
    overdue: int


class GoalProgressResponse(BaseModel):
    total_goals: int
    total_objectives: int
    completed_objectives: int
    in_progress_objectives: int
    overall_progress: float
    by_department: List[Dict[str, Any]]


class ActivityItem(BaseModel):
    id: str
    type: str
    description: str
    user_name: str
    user_id: Optional[str] = None
    timestamp: str
    module: str
    related_id: Optional[str] = None


class DashboardResponse(BaseModel):
    team_overview: TeamOverviewResponse
    task_summary: TaskSummaryResponse
    project_summary: ProjectSummaryResponse
    upcoming_deadlines: List[DeadlineItem]
    todays_meetings: List[MeetingItem]
    goal_progress: GoalProgressResponse


# ============== HELPER FUNCTIONS ==============

def get_date_range(period: str) -> tuple:
    """Get start and end dates for a period"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if period == "today":
        return today_start, now
    elif period == "week":
        week_start = today_start - timedelta(days=today_start.weekday())
        return week_start, now
    elif period == "month":
        month_start = today_start.replace(day=1)
        return month_start, now
    elif period == "quarter":
        quarter_month = ((now.month - 1) // 3) * 3 + 1
        quarter_start = today_start.replace(month=quarter_month, day=1)
        return quarter_start, now
    elif period == "year":
        year_start = today_start.replace(month=1, day=1)
        return year_start, now
    else:
        return today_start - timedelta(days=30), now


# ============== DASHBOARD ENDPOINTS ==============

@router.get("/team-overview", response_model=TeamOverviewResponse)
async def get_team_overview(
    department: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get team overview statistics"""
    query = {"status": "active"}
    if department:
        query["department"] = department
    
    # Total employees
    total_employees = await db.users.count_documents(query)
    
    # Active today (users who logged in today)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    active_query = {**query, "last_login": {"$gte": today_start.isoformat()}}
    active_today = await db.users.count_documents(active_query)
    
    # Department distribution
    pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$department", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    dept_cursor = db.users.aggregate(pipeline)
    departments = []
    async for doc in dept_cursor:
        departments.append({
            "department": doc["_id"] or "Unassigned",
            "count": doc["count"]
        })
    
    # New employees this month
    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_employees = await db.users.count_documents({
        "created_at": {"$gte": month_start.isoformat()}
    })
    
    return TeamOverviewResponse(
        total_employees=total_employees,
        active_today=active_today,
        departments=departments,
        new_employees_this_month=new_employees
    )


@router.get("/task-summary", response_model=TaskSummaryResponse)
async def get_task_summary(
    department: Optional[str] = None,
    project_id: Optional[str] = None,
    user_id: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get task summary statistics"""
    query = {}
    if project_id:
        query["project_id"] = project_id
    if user_id:
        query["assigned_to"] = user_id
    
    # Get all tasks
    total_tasks = await db.pm_tasks.count_documents(query)
    
    # By status
    assigned = await db.pm_tasks.count_documents({**query, "status": "assigned"})
    in_progress = await db.pm_tasks.count_documents({**query, "status": "in_progress"})
    completed = await db.pm_tasks.count_documents({**query, "status": "completed"})
    
    # Overdue tasks
    now = datetime.now(timezone.utc).isoformat()
    overdue = await db.pm_tasks.count_documents({
        **query,
        "due_date": {"$lt": now},
        "status": {"$nin": ["completed", "cancelled"]}
    })
    
    completion_rate = (completed / total_tasks * 100) if total_tasks > 0 else 0
    
    return TaskSummaryResponse(
        total_tasks=total_tasks,
        assigned=assigned,
        in_progress=in_progress,
        completed=completed,
        overdue=overdue,
        completion_rate=round(completion_rate, 1)
    )


@router.get("/project-summary", response_model=ProjectSummaryResponse)
async def get_project_summary(
    department: Optional[str] = None,
    limit: int = 10,
    user: dict = Depends(get_current_user_dep)
):
    """Get project summary with top projects"""
    query = {}
    if department:
        query["department_id"] = department
    
    # Counts by status
    total_projects = await db.pm_projects.count_documents(query)
    active = await db.pm_projects.count_documents({**query, "status": "active"})
    completed = await db.pm_projects.count_documents({**query, "status": "completed"})
    on_hold = await db.pm_projects.count_documents({**query, "status": "on_hold"})
    
    # At risk: overdue or low progress
    now = datetime.now(timezone.utc).isoformat()
    at_risk = await db.pm_projects.count_documents({
        **query,
        "status": "active",
        "$or": [
            {"end_date": {"$lt": now}},
            {"progress": {"$lt": 25}, "end_date": {"$lt": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()}}
        ]
    })
    
    # Top projects with progress
    projects_cursor = db.pm_projects.find(
        {**query, "status": {"$in": ["active", "on_hold"]}},
        {"_id": 0, "id": 1, "name": 1, "project_id": 1, "status": 1, "progress": 1, 
         "end_date": 1, "owner_id": 1, "priority": 1}
    ).sort("updated_at", -1).limit(limit)
    
    projects = []
    async for p in projects_cursor:
        # Get owner name
        owner_name = None
        if p.get("owner_id"):
            owner = await db.users.find_one({"id": p["owner_id"]}, {"name": 1})
            owner_name = owner.get("name") if owner else None
        
        projects.append({
            "id": p["id"],
            "name": p["name"],
            "project_id": p.get("project_id"),
            "status": p["status"],
            "progress": p.get("progress", 0),
            "end_date": p.get("end_date"),
            "owner_name": owner_name,
            "priority": p.get("priority", "medium")
        })
    
    return ProjectSummaryResponse(
        total_projects=total_projects,
        active=active,
        completed=completed,
        on_hold=on_hold,
        at_risk=at_risk,
        projects=projects
    )


@router.get("/upcoming-deadlines", response_model=List[DeadlineItem])
async def get_upcoming_deadlines(
    days: int = 7,
    limit: int = 20,
    user: dict = Depends(get_current_user_dep)
):
    """Get upcoming task deadlines"""
    now = datetime.now(timezone.utc)
    future_date = (now + timedelta(days=days)).isoformat()
    now_str = now.isoformat()
    
    # Get tasks with upcoming deadlines
    tasks_cursor = db.pm_tasks.find(
        {
            "due_date": {"$gte": now_str, "$lte": future_date},
            "status": {"$nin": ["completed", "cancelled"]}
        },
        {"_id": 0}
    ).sort("due_date", 1).limit(limit)
    
    deadlines = []
    async for task in tasks_cursor:
        # Get project name
        project_name = None
        if task.get("project_id"):
            project = await db.pm_projects.find_one({"id": task["project_id"]}, {"name": 1})
            project_name = project.get("name") if project else None
        
        # Get assignee name
        assignee_name = None
        if task.get("assigned_to"):
            assignee = await db.users.find_one({"id": task["assigned_to"]}, {"name": 1})
            assignee_name = assignee.get("name") if assignee else None
        
        deadlines.append(DeadlineItem(
            id=task["id"],
            title=task.get("name", "Untitled Task"),
            type="task",
            due_date=task.get("due_date", ""),
            project_name=project_name,
            assignee_name=assignee_name,
            priority=task.get("priority", "medium"),
            status=task.get("status", "assigned")
        ))
    
    return deadlines


@router.get("/todays-meetings", response_model=List[MeetingItem])
async def get_todays_meetings(
    include_upcoming: bool = True,
    user: dict = Depends(get_current_user_dep)
):
    """Get today's and upcoming meetings"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
    
    query = {
        "start_time": {"$gte": today_start, "$lte": today_end},
        "status": {"$ne": "cancelled"}
    }
    
    if include_upcoming:
        # Include next 3 days
        future_end = (now + timedelta(days=3)).isoformat()
        query = {
            "start_time": {"$gte": today_start, "$lte": future_end},
            "status": {"$ne": "cancelled"}
        }
    
    meetings_cursor = db.meetings.find(query, {"_id": 0}).sort("start_time", 1).limit(10)
    
    meetings = []
    async for meeting in meetings_cursor:
        meetings.append(MeetingItem(
            id=meeting["id"],
            title=meeting.get("title", "Untitled Meeting"),
            start_time=meeting.get("start_time", ""),
            end_time=meeting.get("end_time"),
            meeting_type=meeting.get("meeting_type", "general"),
            participants_count=len(meeting.get("participants", [])),
            status=meeting.get("status", "scheduled")
        ))
    
    return meetings


@router.get("/productivity-trends")
async def get_productivity_trends(
    period: str = "month",  # week, month, quarter
    department: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get productivity trends over time"""
    start_date, end_date = get_date_range(period)
    
    # Aggregate tasks completed per day
    pipeline = [
        {
            "$match": {
                "status": "completed",
                "updated_at": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()}
            }
        },
        {
            "$addFields": {
                "date": {"$substr": ["$updated_at", 0, 10]}
            }
        },
        {
            "$group": {
                "_id": "$date",
                "tasks_completed": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    completed_cursor = db.pm_tasks.aggregate(pipeline)
    completed_by_date = {}
    async for doc in completed_cursor:
        completed_by_date[doc["_id"]] = doc["tasks_completed"]
    
    # Aggregate tasks created per day
    pipeline[0]["$match"] = {
        "created_at": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()}
    }
    pipeline[1] = {"$addFields": {"date": {"$substr": ["$created_at", 0, 10]}}}
    pipeline[2]["$group"]["_id"] = "$date"
    pipeline[2]["$group"]["tasks_created"] = {"$sum": 1}
    del pipeline[2]["$group"]["tasks_completed"]
    
    created_cursor = db.pm_tasks.aggregate(pipeline)
    created_by_date = {}
    async for doc in created_cursor:
        created_by_date[doc["_id"]] = doc["tasks_created"]
    
    # Combine data
    all_dates = sorted(set(list(completed_by_date.keys()) + list(created_by_date.keys())))
    
    data_points = []
    for date in all_dates:
        data_points.append({
            "date": date,
            "tasks_completed": completed_by_date.get(date, 0),
            "tasks_created": created_by_date.get(date, 0)
        })
    
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "data": data_points
    }


@router.get("/workload-distribution")
async def get_workload_distribution(
    department: Optional[str] = None,
    limit: int = 15,
    user: dict = Depends(get_current_user_dep)
):
    """Get workload distribution across team members"""
    # Get users
    user_query = {"status": "active"}
    if department:
        user_query["department"] = department
    
    users_cursor = db.users.find(user_query, {"_id": 0, "id": 1, "name": 1, "department": 1}).limit(50)
    
    workload = []
    now = datetime.now(timezone.utc).isoformat()
    
    async for u in users_cursor:
        user_id = u["id"]
        
        # Count tasks by status
        total = await db.pm_tasks.count_documents({"assigned_to": user_id})
        completed = await db.pm_tasks.count_documents({"assigned_to": user_id, "status": "completed"})
        in_progress = await db.pm_tasks.count_documents({"assigned_to": user_id, "status": "in_progress"})
        overdue = await db.pm_tasks.count_documents({
            "assigned_to": user_id,
            "due_date": {"$lt": now},
            "status": {"$nin": ["completed", "cancelled"]}
        })
        
        workload.append(WorkloadItem(
            user_id=user_id,
            user_name=u.get("name", "Unknown"),
            department=u.get("department"),
            total_tasks=total,
            completed=completed,
            in_progress=in_progress,
            overdue=overdue
        ))
    
    # Sort by total tasks
    workload.sort(key=lambda x: x.total_tasks, reverse=True)
    
    return workload[:limit]


@router.get("/goal-progress", response_model=GoalProgressResponse)
async def get_goal_progress(
    department: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get goal/OKR progress summary"""
    # Count goals
    total_goals = await db.goals.count_documents({})
    
    # Count objectives
    obj_query = {}
    total_objectives = await db.objectives.count_documents(obj_query)
    completed_objectives = await db.objectives.count_documents({**obj_query, "status": "completed"})
    in_progress_objectives = await db.objectives.count_documents({**obj_query, "status": "in_progress"})
    
    # Calculate overall progress
    pipeline = [
        {"$group": {"_id": None, "avg_progress": {"$avg": "$progress"}}}
    ]
    progress_cursor = db.objectives.aggregate(pipeline)
    overall_progress = 0
    async for doc in progress_cursor:
        overall_progress = doc.get("avg_progress", 0) or 0
    
    # Progress by department
    dept_pipeline = [
        {"$group": {
            "_id": "$department_id",
            "avg_progress": {"$avg": "$progress"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"avg_progress": -1}}
    ]
    
    by_department = []
    dept_cursor = db.objectives.aggregate(dept_pipeline)
    async for doc in dept_cursor:
        dept_name = "General"
        if doc["_id"]:
            dept = await db.departments.find_one({"id": doc["_id"]}, {"name": 1})
            dept_name = dept.get("name") if dept else "Unknown"
        
        by_department.append({
            "department": dept_name,
            "progress": round(doc.get("avg_progress", 0) or 0, 1),
            "objective_count": doc["count"]
        })
    
    return GoalProgressResponse(
        total_goals=total_goals,
        total_objectives=total_objectives,
        completed_objectives=completed_objectives,
        in_progress_objectives=in_progress_objectives,
        overall_progress=round(overall_progress, 1),
        by_department=by_department
    )


@router.get("/activity-feed", response_model=List[ActivityItem])
async def get_activity_feed(
    limit: int = 20,
    module: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get recent activity feed"""
    query = {}
    if module:
        query["module"] = module
    
    # Try to get from activity_logs collection if exists
    activities = []
    
    # Fallback: construct from recent changes in various collections
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=7)).isoformat()
    
    # Recent tasks
    tasks_cursor = db.pm_tasks.find(
        {"updated_at": {"$gte": since}},
        {"_id": 0, "id": 1, "name": 1, "status": 1, "assigned_to": 1, "updated_at": 1, "created_at": 1}
    ).sort("updated_at", -1).limit(10)
    
    async for task in tasks_cursor:
        user_name = "System"
        if task.get("assigned_to"):
            u = await db.users.find_one({"id": task["assigned_to"]}, {"name": 1})
            user_name = u.get("name") if u else "Unknown"
        
        activities.append(ActivityItem(
            id=task["id"],
            type="task_updated",
            description=f"Task '{task.get('name', 'Untitled')}' updated to {task.get('status', 'unknown')}",
            user_name=user_name,
            user_id=task.get("assigned_to", ""),
            timestamp=task.get("updated_at", ""),
            module="tasks",
            related_id=task["id"]
        ))
    
    # Recent meetings
    meetings_cursor = db.meetings.find(
        {"updated_at": {"$gte": since}},
        {"_id": 0, "id": 1, "title": 1, "status": 1, "created_by": 1, "updated_at": 1}
    ).sort("updated_at", -1).limit(10)
    
    async for meeting in meetings_cursor:
        user_name = "System"
        if meeting.get("created_by"):
            u = await db.users.find_one({"id": meeting["created_by"]}, {"name": 1})
            user_name = u.get("name") if u else "Unknown"
        
        activities.append(ActivityItem(
            id=meeting["id"],
            type="meeting_updated",
            description=f"Meeting '{meeting.get('title', 'Untitled')}' - {meeting.get('status', 'scheduled')}",
            user_name=user_name,
            user_id=meeting.get("created_by", ""),
            timestamp=meeting.get("updated_at", ""),
            module="meetings",
            related_id=meeting["id"]
        ))
    
    # Sort by timestamp and limit
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    return activities[:limit]


@router.get("/dashboard-summary", response_model=DashboardResponse)
async def get_dashboard_summary(
    department: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get complete dashboard summary in one call"""
    team_overview = await get_team_overview(department, user)
    task_summary = await get_task_summary(department=department, user=user)
    project_summary = await get_project_summary(department, limit=5, user=user)
    upcoming_deadlines = await get_upcoming_deadlines(days=7, limit=10, user=user)
    todays_meetings = await get_todays_meetings(include_upcoming=True, user=user)
    goal_progress = await get_goal_progress(department, user)
    
    return DashboardResponse(
        team_overview=team_overview,
        task_summary=task_summary,
        project_summary=project_summary,
        upcoming_deadlines=upcoming_deadlines,
        todays_meetings=todays_meetings,
        goal_progress=goal_progress
    )
