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


# ============== PULSE ANALYTICS FOR TEAM DASHBOARD ==============

class PulseEngagementStats(BaseModel):
    total_posts: int = 0
    posts_this_week: int = 0
    posts_this_month: int = 0
    total_reactions: int = 0
    total_comments: int = 0
    total_recognitions: int = 0
    recognitions_this_week: int = 0
    active_posters: int = 0
    engagement_rate: float = 0.0
    top_badge_types: List[Dict[str, Any]] = []
    recognition_leaderboard: List[Dict[str, Any]] = []
    department_engagement: List[Dict[str, Any]] = []
    trending_tags: List[Dict[str, Any]] = []
    work_updates_submitted: int = 0
    blockers_reported: int = 0


@router.get("/pulse-engagement", response_model=PulseEngagementStats)
async def get_pulse_engagement_stats(
    period: str = "month",  # week, month, quarter, year
    department: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get Pulse engagement statistics for the team dashboard"""
    now = datetime.now(timezone.utc)
    
    # Calculate period boundaries
    if period == "week":
        period_start = (now - timedelta(days=7)).isoformat()
    elif period == "month":
        period_start = (now - timedelta(days=30)).isoformat()
    elif period == "quarter":
        period_start = (now - timedelta(days=90)).isoformat()
    else:  # year
        period_start = (now - timedelta(days=365)).isoformat()
    
    week_start = (now - timedelta(days=7)).isoformat()
    month_start = (now - timedelta(days=30)).isoformat()
    
    # Build base query
    base_query = {}
    if department:
        base_query["author_department"] = department
    
    # Total posts
    total_posts = await db.pulse_posts.count_documents(base_query)
    
    # Posts this week/month
    posts_this_week = await db.pulse_posts.count_documents({
        **base_query,
        "created_at": {"$gte": week_start}
    })
    posts_this_month = await db.pulse_posts.count_documents({
        **base_query,
        "created_at": {"$gte": month_start}
    })
    
    # Get reaction and comment counts via aggregation
    engagement_pipeline = [
        {"$match": base_query},
        {"$project": {
            "reactions_count": {"$size": {"$ifNull": ["$reactions", []]}},
            "comments_count": {"$size": {"$ifNull": ["$comments", []]}}
        }},
        {"$group": {
            "_id": None,
            "total_reactions": {"$sum": "$reactions_count"},
            "total_comments": {"$sum": "$comments_count"}
        }}
    ]
    
    engagement_result = await db.pulse_posts.aggregate(engagement_pipeline).to_list(1)
    total_reactions = engagement_result[0]["total_reactions"] if engagement_result else 0
    total_comments = engagement_result[0]["total_comments"] if engagement_result else 0
    
    # Recognition stats
    recognition_query = {}
    if department:
        recognition_query["recipient_department"] = department
    
    total_recognitions = await db.pulse_recognitions.count_documents(recognition_query)
    recognitions_this_week = await db.pulse_recognitions.count_documents({
        **recognition_query,
        "created_at": {"$gte": week_start}
    })
    
    # Active posters (unique authors in the period)
    active_authors = await db.pulse_posts.distinct("author_id", {
        **base_query,
        "created_at": {"$gte": period_start}
    })
    active_posters = len(active_authors)
    
    # Calculate engagement rate (interactions / posts)
    engagement_rate = 0.0
    if total_posts > 0:
        total_interactions = total_reactions + total_comments
        engagement_rate = round((total_interactions / total_posts) * 100, 1)
    
    # Top badge types
    badge_pipeline = [
        {"$match": {"created_at": {"$gte": period_start}}},
        {"$group": {"_id": "$badge_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_badges = await db.pulse_recognitions.aggregate(badge_pipeline).to_list(5)
    top_badge_types = [{"badge_type": b["_id"], "count": b["count"]} for b in top_badges]
    
    # Recognition leaderboard (top recipients)
    leaderboard_pipeline = [
        {"$match": {"created_at": {"$gte": period_start}}},
        {"$group": {
            "_id": "$recipient_id",
            "name": {"$first": "$recipient_name"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    leaderboard = await db.pulse_recognitions.aggregate(leaderboard_pipeline).to_list(5)
    recognition_leaderboard = [
        {"user_id": entry["_id"], "name": entry.get("name", "Unknown"), "recognitions": entry["count"]}
        for entry in leaderboard
    ]
    
    # Department engagement
    dept_pipeline = [
        {"$match": {"created_at": {"$gte": period_start}}},
        {"$group": {
            "_id": "$author_department",
            "posts": {"$sum": 1}
        }},
        {"$sort": {"posts": -1}},
        {"$limit": 10}
    ]
    dept_engagement = await db.pulse_posts.aggregate(dept_pipeline).to_list(10)
    department_engagement = [
        {"department": d["_id"] or "Unknown", "posts": d["posts"]}
        for d in dept_engagement if d["_id"]
    ]
    
    # Trending tags
    tag_pipeline = [
        {"$match": {"created_at": {"$gte": period_start}}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    trending = await db.pulse_posts.aggregate(tag_pipeline).to_list(10)
    trending_tags = [{"tag": t["_id"], "count": t["count"]} for t in trending]
    
    # Work updates stats
    daily_updates = await db.daily_updates.count_documents({
        "created_at": {"$gte": period_start}
    })
    weekly_updates = await db.weekly_updates.count_documents({
        "created_at": {"$gte": period_start}
    })
    work_updates_submitted = daily_updates + weekly_updates
    
    # Count blockers reported
    blocker_pipeline = [
        {"$match": {"created_at": {"$gte": period_start}}},
        {"$project": {"blocker_count": {"$size": {"$ifNull": ["$blockers", []]}}}},
        {"$group": {"_id": None, "total": {"$sum": "$blocker_count"}}}
    ]
    blocker_result = await db.daily_updates.aggregate(blocker_pipeline).to_list(1)
    blockers_reported = blocker_result[0]["total"] if blocker_result else 0
    
    return PulseEngagementStats(
        total_posts=total_posts,
        posts_this_week=posts_this_week,
        posts_this_month=posts_this_month,
        total_reactions=total_reactions,
        total_comments=total_comments,
        total_recognitions=total_recognitions,
        recognitions_this_week=recognitions_this_week,
        active_posters=active_posters,
        engagement_rate=engagement_rate,
        top_badge_types=top_badge_types,
        recognition_leaderboard=recognition_leaderboard,
        department_engagement=department_engagement,
        trending_tags=trending_tags,
        work_updates_submitted=work_updates_submitted,
        blockers_reported=blockers_reported
    )


@router.get("/pulse-trends")
async def get_pulse_trends(
    period: str = "month",
    user: dict = Depends(get_current_user_dep)
):
    """Get Pulse activity trends over time"""
    now = datetime.now(timezone.utc)
    
    # Determine granularity based on period
    if period == "week":
        days = 7
        group_format = "%Y-%m-%d"
    elif period == "month":
        days = 30
        group_format = "%Y-%m-%d"
    else:  # quarter/year
        days = 90 if period == "quarter" else 365
        group_format = "%Y-%W"  # Week number
    
    period_start = (now - timedelta(days=days)).isoformat()
    
    # Get daily post counts
    pipeline = [
        {"$match": {"created_at": {"$gte": period_start}}},
        {"$addFields": {
            "date": {"$dateFromString": {"dateString": "$created_at"}}
        }},
        {"$group": {
            "_id": {"$dateToString": {"format": group_format, "date": "$date"}},
            "posts": {"$sum": 1},
            "reactions": {"$sum": {"$size": {"$ifNull": ["$reactions", []]}}},
            "comments": {"$sum": {"$size": {"$ifNull": ["$comments", []]}}}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    trends = await db.pulse_posts.aggregate(pipeline).to_list(100)
    
    return {
        "period": period,
        "data": [
            {"date": t["_id"], "posts": t["posts"], "reactions": t["reactions"], "comments": t["comments"]}
            for t in trends
        ]
    }



# ============== REPORTS MODULE ==============

class ReportSection(BaseModel):
    title: str
    data: Dict[str, Any]


class ReportResponse(BaseModel):
    id: str
    report_type: str  # daily, weekly, monthly, quarterly
    title: str
    period_start: str
    period_end: str
    generated_at: str
    generated_by: str
    sections: List[ReportSection]
    summary: Optional[str] = None


class ReportListItem(BaseModel):
    id: str
    report_type: str
    title: str
    period_start: str
    period_end: str
    generated_at: str
    generated_by_name: str


async def generate_report_data(report_type: str, start_date: datetime, end_date: datetime, department: Optional[str] = None) -> Dict[str, Any]:
    """Generate report data for a specific period"""
    start_str = start_date.isoformat()
    end_str = end_date.isoformat()
    
    sections = []
    
    # 1. Executive Summary / Overview
    total_users = await db.users.count_documents({"status": "active"})
    
    # 2. Task Metrics
    task_query = {"created_at": {"$gte": start_str, "$lte": end_str}}
    tasks_created = await db.pm_tasks.count_documents(task_query)
    
    completed_query = {
        "status": "completed",
        "updated_at": {"$gte": start_str, "$lte": end_str}
    }
    tasks_completed = await db.pm_tasks.count_documents(completed_query)
    
    overdue_query = {
        "due_date": {"$lt": end_str},
        "status": {"$nin": ["completed", "cancelled"]}
    }
    tasks_overdue = await db.pm_tasks.count_documents(overdue_query)
    
    in_progress = await db.pm_tasks.count_documents({"status": "in_progress"})
    
    sections.append(ReportSection(
        title="Task Metrics",
        data={
            "tasks_created": tasks_created,
            "tasks_completed": tasks_completed,
            "tasks_overdue": tasks_overdue,
            "tasks_in_progress": in_progress,
            "completion_rate": round((tasks_completed / tasks_created * 100) if tasks_created > 0 else 0, 1)
        }
    ))
    
    # 3. Project Status
    projects_active = await db.pm_projects.count_documents({"status": "active"})
    projects_completed_period = await db.pm_projects.count_documents({
        "status": "completed",
        "updated_at": {"$gte": start_str, "$lte": end_str}
    })
    projects_on_hold = await db.pm_projects.count_documents({"status": "on_hold"})
    
    # Get top projects
    top_projects = []
    projects_cursor = db.pm_projects.find(
        {"status": {"$in": ["active", "completed"]}},
        {"_id": 0, "id": 1, "name": 1, "status": 1, "progress": 1}
    ).sort("updated_at", -1).limit(5)
    async for p in projects_cursor:
        top_projects.append({
            "name": p.get("name"),
            "status": p.get("status"),
            "progress": p.get("progress", 0)
        })
    
    sections.append(ReportSection(
        title="Project Status",
        data={
            "active_projects": projects_active,
            "completed_in_period": projects_completed_period,
            "on_hold": projects_on_hold,
            "top_projects": top_projects
        }
    ))
    
    # 4. Meeting Summary
    meetings_query = {
        "start_time": {"$gte": start_str, "$lte": end_str}
    }
    meetings_total = await db.meetings.count_documents(meetings_query)
    meetings_completed = await db.meetings.count_documents({**meetings_query, "status": "completed"})
    
    # Count action items from meetings
    action_items_pipeline = [
        {"$match": meetings_query},
        {"$project": {"action_count": {"$size": {"$ifNull": ["$action_items", []]}}}},
        {"$group": {"_id": None, "total": {"$sum": "$action_count"}}}
    ]
    action_cursor = db.meetings.aggregate(action_items_pipeline)
    action_items_total = 0
    async for doc in action_cursor:
        action_items_total = doc.get("total", 0)
    
    sections.append(ReportSection(
        title="Meeting Summary",
        data={
            "total_meetings": meetings_total,
            "completed_meetings": meetings_completed,
            "action_items_created": action_items_total,
            "avg_meetings_per_day": round(meetings_total / max((end_date - start_date).days, 1), 1)
        }
    ))
    
    # 5. Goals & OKR Progress
    objectives_total = await db.objectives.count_documents({})
    objectives_completed = await db.objectives.count_documents({"status": "completed"})
    
    # Average progress
    progress_pipeline = [
        {"$group": {"_id": None, "avg_progress": {"$avg": "$progress"}}}
    ]
    progress_cursor = db.objectives.aggregate(progress_pipeline)
    avg_progress = 0
    async for doc in progress_cursor:
        avg_progress = doc.get("avg_progress", 0) or 0
    
    sections.append(ReportSection(
        title="Goals & OKR Progress",
        data={
            "total_objectives": objectives_total,
            "completed_objectives": objectives_completed,
            "in_progress_objectives": objectives_total - objectives_completed,
            "average_progress": round(avg_progress, 1)
        }
    ))
    
    # 6. Team Contributions (Top performers)
    contributors_pipeline = [
        {"$match": {"status": "completed", "updated_at": {"$gte": start_str, "$lte": end_str}}},
        {"$group": {"_id": "$assigned_to", "tasks_completed": {"$sum": 1}}},
        {"$sort": {"tasks_completed": -1}},
        {"$limit": 5}
    ]
    contributors = []
    contrib_cursor = db.pm_tasks.aggregate(contributors_pipeline)
    async for doc in contrib_cursor:
        if doc["_id"]:
            user = await db.users.find_one({"id": doc["_id"]}, {"name": 1, "department": 1})
            if user:
                contributors.append({
                    "name": user.get("name", "Unknown"),
                    "department": user.get("department", ""),
                    "tasks_completed": doc["tasks_completed"]
                })
    
    sections.append(ReportSection(
        title="Team Contributions",
        data={
            "top_contributors": contributors
        }
    ))
    
    # 7. Risks & Blockers
    blocked_tasks = await db.pm_tasks.count_documents({"status": "blocked"})
    high_priority_overdue = await db.pm_tasks.count_documents({
        "priority": {"$in": ["high", "urgent"]},
        "due_date": {"$lt": end_str},
        "status": {"$nin": ["completed", "cancelled"]}
    })
    
    # At risk projects
    at_risk_projects = await db.pm_projects.count_documents({
        "status": "active",
        "$or": [
            {"end_date": {"$lt": end_str}},
            {"progress": {"$lt": 25}}
        ]
    })
    
    sections.append(ReportSection(
        title="Risks & Blockers",
        data={
            "blocked_tasks": blocked_tasks,
            "high_priority_overdue": high_priority_overdue,
            "at_risk_projects": at_risk_projects
        }
    ))
    
    # 8. Upcoming Priorities
    upcoming_tasks = []
    next_week = (end_date + timedelta(days=7)).isoformat()
    upcoming_cursor = db.pm_tasks.find(
        {
            "due_date": {"$gte": end_str, "$lte": next_week},
            "status": {"$nin": ["completed", "cancelled"]}
        },
        {"_id": 0, "name": 1, "due_date": 1, "priority": 1}
    ).sort("due_date", 1).limit(10)
    async for task in upcoming_cursor:
        upcoming_tasks.append({
            "name": task.get("name"),
            "due_date": task.get("due_date"),
            "priority": task.get("priority")
        })
    
    sections.append(ReportSection(
        title="Upcoming Priorities",
        data={
            "upcoming_tasks": upcoming_tasks,
            "count": len(upcoming_tasks)
        }
    ))
    
    return {
        "sections": sections,
        "summary_stats": {
            "total_users": total_users,
            "tasks_completed": tasks_completed,
            "projects_active": projects_active,
            "avg_goal_progress": round(avg_progress, 1)
        }
    }


@router.post("/reports/generate")
async def generate_report(
    report_type: str = Query(..., regex="^(daily|weekly|monthly|quarterly)$"),
    custom_start: Optional[str] = None,
    custom_end: Optional[str] = None,
    department: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Generate a new report"""
    import uuid
    
    now = datetime.now(timezone.utc)
    
    # Calculate period based on report type
    if custom_start and custom_end:
        start_date = datetime.fromisoformat(custom_start.replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(custom_end.replace('Z', '+00:00'))
    else:
        if report_type == "daily":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now
        elif report_type == "weekly":
            start_date = now - timedelta(days=now.weekday())
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now
        elif report_type == "monthly":
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_date = now
        elif report_type == "quarterly":
            quarter_month = ((now.month - 1) // 3) * 3 + 1
            start_date = now.replace(month=quarter_month, day=1, hour=0, minute=0, second=0, microsecond=0)
            end_date = now
    
    # Generate report data
    report_data = await generate_report_data(report_type, start_date, end_date, department)
    
    # Create report title
    period_labels = {
        "daily": f"Daily Report - {start_date.strftime('%B %d, %Y')}",
        "weekly": f"Weekly Report - Week of {start_date.strftime('%B %d, %Y')}",
        "monthly": f"Monthly Report - {start_date.strftime('%B %Y')}",
        "quarterly": f"Q{((start_date.month - 1) // 3) + 1} {start_date.year} Report"
    }
    
    report_id = str(uuid.uuid4())
    
    # Save report to database
    report_doc = {
        "id": report_id,
        "report_type": report_type,
        "title": period_labels.get(report_type, f"{report_type.capitalize()} Report"),
        "period_start": start_date.isoformat(),
        "period_end": end_date.isoformat(),
        "generated_at": now.isoformat(),
        "generated_by": user.get("id"),
        "generated_by_name": user.get("name", "Unknown"),
        "department": department,
        "sections": [s.dict() for s in report_data["sections"]],
        "summary_stats": report_data["summary_stats"]
    }
    
    await db.reports.insert_one(report_doc)
    
    # Return without _id
    if "_id" in report_doc:
        del report_doc["_id"]
    
    return report_doc


@router.get("/reports")
async def list_reports(
    report_type: Optional[str] = None,
    limit: int = 20,
    skip: int = 0,
    user: dict = Depends(get_current_user_dep)
):
    """List all generated reports"""
    query = {}
    if report_type:
        query["report_type"] = report_type
    
    reports = []
    cursor = db.reports.find(query, {"_id": 0}).sort("generated_at", -1).skip(skip).limit(limit)
    
    async for doc in cursor:
        reports.append(ReportListItem(
            id=doc["id"],
            report_type=doc["report_type"],
            title=doc["title"],
            period_start=doc["period_start"],
            period_end=doc["period_end"],
            generated_at=doc["generated_at"],
            generated_by_name=doc.get("generated_by_name", "Unknown")
        ))
    
    total = await db.reports.count_documents(query)
    
    return {
        "reports": reports,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/reports/{report_id}")
async def get_report(
    report_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get a specific report by ID"""
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return report


@router.delete("/reports/{report_id}")
async def delete_report(
    report_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a report"""
    result = await db.reports.delete_one({"id": report_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {"success": True, "message": "Report deleted"}


@router.get("/reports/{report_id}/export")
async def export_report(
    report_id: str,
    format: str = Query("json", regex="^(json|csv)$"),
    user: dict = Depends(get_current_user_dep)
):
    """Export report data"""
    from fastapi.responses import JSONResponse
    import csv
    import io
    
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if format == "json":
        return JSONResponse(content=report)
    
    elif format == "csv":
        from fastapi.responses import StreamingResponse
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(["Report", report["title"]])
        writer.writerow(["Period", f"{report['period_start']} to {report['period_end']}"])
        writer.writerow(["Generated", report["generated_at"]])
        writer.writerow([])
        
        # Write sections
        for section in report.get("sections", []):
            writer.writerow([section["title"]])
            for key, value in section.get("data", {}).items():
                if isinstance(value, list):
                    writer.writerow([key, f"{len(value)} items"])
                else:
                    writer.writerow([key, value])
            writer.writerow([])
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=report_{report_id}.csv"}
        )
