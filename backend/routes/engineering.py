"""
Engineering Tools Routes - Epics, Backlog, Burndown & Velocity Charts
Jira-like features for engineering teams
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import jwt
import os

from models.projects import (
    EpicCreate, EpicUpdate, EpicResponse, EpicStatus,
    BacklogItemResponse, BacklogResponse,
    BurndownDataPoint, BurndownChartResponse,
    VelocityDataPoint, VelocityChartResponse,
    IssueType, Priority, TaskStatus, BugSeverity
)

router = APIRouter(prefix="/engineering", tags=["Engineering Tools"])
security = HTTPBearer()

# Database connection
from motor.motor_asyncio import AsyncIOMotorClient
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'sevora_production')]


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, os.environ.get('JWT_SECRET', 'your-secret-key'), algorithms=["HS256"])
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_user_name(user_id: str) -> str:
    """Get user name by ID"""
    if not user_id:
        return None
    user = await db.users.find_one({"id": user_id}, {"name": 1})
    return user.get("name") if user else None


# ============== EPIC ENDPOINTS ==============

@router.get("/projects/{project_id}/epics", response_model=List[EpicResponse])
async def list_project_epics(
    project_id: str,
    status: Optional[EpicStatus] = None,
    user: dict = Depends(get_current_user)
):
    """List all epics for a project with progress stats"""
    query = {"project_id": project_id}
    if status:
        query["status"] = status.value
    
    epics = await db.pm_epics.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get project name
    project = await db.pm_projects.find_one({"id": project_id}, {"name": 1})
    project_name = project.get("name") if project else None
    
    # Enrich each epic with progress data
    for epic in epics:
        epic["project_name"] = project_name
        
        # Get owner name
        if epic.get("owner_id"):
            epic["owner_name"] = await get_user_name(epic["owner_id"])
        
        # Count linked issues
        linked_tasks = await db.pm_tasks.find(
            {"epic_id": epic["id"]},
            {"status": 1, "story_points": 1, "issue_type": 1}
        ).to_list(500)
        
        total = len(linked_tasks)
        completed = sum(1 for t in linked_tasks if t.get("status") in ["completed", "approved"])
        total_points = sum(t.get("story_points", 0) or 0 for t in linked_tasks)
        completed_points = sum(
            t.get("story_points", 0) or 0 
            for t in linked_tasks 
            if t.get("status") in ["completed", "approved"]
        )
        
        epic["total_issues"] = total
        epic["completed_issues"] = completed
        epic["total_story_points"] = total_points
        epic["completed_story_points"] = completed_points
        epic["progress_percent"] = round((completed / total * 100), 1) if total > 0 else 0
        
        # Categorize linked items
        epic["story_ids"] = [t["id"] for t in linked_tasks if t.get("issue_type") == "story"]
        epic["task_ids"] = [t["id"] for t in linked_tasks if t.get("issue_type") in ["task", None]]
        epic["bug_ids"] = [t["id"] for t in linked_tasks if t.get("issue_type") == "bug"]
    
    return epics


@router.post("/projects/{project_id}/epics", response_model=EpicResponse)
async def create_epic(
    project_id: str,
    data: EpicCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new epic"""
    # Verify project exists
    project = await db.pm_projects.find_one({"id": project_id}, {"name": 1})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    now = datetime.now(timezone.utc).isoformat()
    epic_id = str(uuid.uuid4())
    
    epic_doc = {
        "id": epic_id,
        "project_id": project_id,
        "name": data.name,
        "description": data.description,
        "owner_id": data.owner_id or user.get("id"),
        "status": EpicStatus.TODO.value,
        "start_date": data.start_date,
        "target_date": data.target_date,
        "priority": data.priority.value,
        "color": data.color,
        "labels": data.labels,
        "created_by": user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_epics.insert_one(epic_doc)
    epic_doc.pop("_id", None)
    
    # Add enriched fields
    epic_doc["project_name"] = project.get("name")
    epic_doc["owner_name"] = await get_user_name(epic_doc.get("owner_id"))
    epic_doc["total_issues"] = 0
    epic_doc["completed_issues"] = 0
    epic_doc["total_story_points"] = 0
    epic_doc["completed_story_points"] = 0
    epic_doc["progress_percent"] = 0
    epic_doc["story_ids"] = []
    epic_doc["task_ids"] = []
    epic_doc["bug_ids"] = []
    
    return epic_doc


@router.get("/epics/{epic_id}", response_model=EpicResponse)
async def get_epic(
    epic_id: str,
    user: dict = Depends(get_current_user)
):
    """Get epic details with all linked issues"""
    epic = await db.pm_epics.find_one({"id": epic_id}, {"_id": 0})
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")
    
    # Get project name
    project = await db.pm_projects.find_one({"id": epic.get("project_id")}, {"name": 1})
    epic["project_name"] = project.get("name") if project else None
    
    # Get owner name
    epic["owner_name"] = await get_user_name(epic.get("owner_id"))
    
    # Get linked tasks with details
    linked_tasks = await db.pm_tasks.find(
        {"epic_id": epic_id},
        {"_id": 0, "id": 1, "status": 1, "story_points": 1, "issue_type": 1}
    ).to_list(500)
    
    total = len(linked_tasks)
    completed = sum(1 for t in linked_tasks if t.get("status") in ["completed", "approved"])
    total_points = sum(t.get("story_points", 0) or 0 for t in linked_tasks)
    completed_points = sum(
        t.get("story_points", 0) or 0 
        for t in linked_tasks 
        if t.get("status") in ["completed", "approved"]
    )
    
    epic["total_issues"] = total
    epic["completed_issues"] = completed
    epic["total_story_points"] = total_points
    epic["completed_story_points"] = completed_points
    epic["progress_percent"] = round((completed / total * 100), 1) if total > 0 else 0
    
    epic["story_ids"] = [t["id"] for t in linked_tasks if t.get("issue_type") == "story"]
    epic["task_ids"] = [t["id"] for t in linked_tasks if t.get("issue_type") in ["task", None]]
    epic["bug_ids"] = [t["id"] for t in linked_tasks if t.get("issue_type") == "bug"]
    
    return epic


@router.put("/epics/{epic_id}", response_model=EpicResponse)
async def update_epic(
    epic_id: str,
    data: EpicUpdate,
    user: dict = Depends(get_current_user)
):
    """Update an epic"""
    epic = await db.pm_epics.find_one({"id": epic_id})
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    if "priority" in update_data:
        update_data["priority"] = update_data["priority"].value
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pm_epics.update_one({"id": epic_id}, {"$set": update_data})
    
    return await get_epic(epic_id, user)


@router.delete("/epics/{epic_id}")
async def delete_epic(
    epic_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete an epic (unlinks all child issues)"""
    epic = await db.pm_epics.find_one({"id": epic_id})
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found")
    
    # Unlink all tasks from this epic
    await db.pm_tasks.update_many(
        {"epic_id": epic_id},
        {"$set": {"epic_id": None}}
    )
    
    await db.pm_epics.delete_one({"id": epic_id})
    
    return {"success": True, "message": "Epic deleted"}


# ============== BACKLOG ENDPOINTS ==============

@router.get("/projects/{project_id}/backlog", response_model=BacklogResponse)
async def get_project_backlog(
    project_id: str,
    issue_type: Optional[IssueType] = None,
    epic_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get backlog items (tasks not in any sprint)"""
    query = {
        "project_id": project_id,
        "$or": [
            {"sprint_id": None},
            {"sprint_id": ""},
            {"sprint_id": {"$exists": False}}
        ],
        "status": {"$nin": ["completed", "approved"]}  # Exclude completed items
    }
    
    if issue_type:
        query["issue_type"] = issue_type.value
    if epic_id:
        query["epic_id"] = epic_id
    
    tasks = await db.pm_tasks.find(query, {"_id": 0}).sort([
        ("priority", -1),  # Urgent first
        ("created_at", 1)  # Oldest first within same priority
    ]).to_list(500)
    
    # Get epic info for all tasks
    epic_ids = list(set(t.get("epic_id") for t in tasks if t.get("epic_id")))
    epics_map = {}
    if epic_ids:
        epics = await db.pm_epics.find({"id": {"$in": epic_ids}}, {"_id": 0, "id": 1, "name": 1, "color": 1}).to_list(100)
        epics_map = {e["id"]: e for e in epics}
    
    # Build response items
    backlog_items = []
    total_points = 0
    
    for task in tasks:
        epic = epics_map.get(task.get("epic_id"), {})
        
        item = BacklogItemResponse(
            id=task["id"],
            name=task["name"],
            issue_type=task.get("issue_type", "task"),
            priority=task.get("priority", "medium"),
            status=task.get("status", "todo"),
            story_points=task.get("story_points"),
            epic_id=task.get("epic_id"),
            epic_name=epic.get("name"),
            epic_color=epic.get("color"),
            sprint_id=task.get("sprint_id"),
            sprint_name=task.get("sprint_name"),
            assigned_to=task.get("assigned_to"),
            assigned_to_name=await get_user_name(task.get("assigned_to")),
            due_date=task.get("due_date"),
            created_at=task.get("created_at", "")
        )
        backlog_items.append(item)
        total_points += task.get("story_points", 0) or 0
    
    return BacklogResponse(
        backlog_items=backlog_items,
        total_items=len(backlog_items),
        total_story_points=total_points
    )


@router.post("/tasks/{task_id}/move-to-sprint")
async def move_task_to_sprint(
    task_id: str,
    sprint_id: Optional[str] = None,  # None = move to backlog
    user: dict = Depends(get_current_user)
):
    """Move a task to a sprint or back to backlog"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    sprint_name = None
    if sprint_id:
        sprint = await db.pm_sprints.find_one({"id": sprint_id}, {"name": 1})
        if not sprint:
            raise HTTPException(status_code=404, detail="Sprint not found")
        sprint_name = sprint.get("name")
    
    await db.pm_tasks.update_one(
        {"id": task_id},
        {"$set": {
            "sprint_id": sprint_id,
            "sprint_name": sprint_name,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Task moved to {'sprint ' + sprint_name if sprint_name else 'backlog'}"
    }


@router.post("/tasks/{task_id}/link-epic")
async def link_task_to_epic(
    task_id: str,
    epic_id: Optional[str] = None,  # None = unlink from epic
    user: dict = Depends(get_current_user)
):
    """Link a task/story to an epic"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    epic_name = None
    if epic_id:
        epic = await db.pm_epics.find_one({"id": epic_id}, {"name": 1})
        if not epic:
            raise HTTPException(status_code=404, detail="Epic not found")
        epic_name = epic.get("name")
    
    await db.pm_tasks.update_one(
        {"id": task_id},
        {"$set": {
            "epic_id": epic_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Task {'linked to epic ' + epic_name if epic_name else 'unlinked from epic'}"
    }


# ============== BURNDOWN CHART ==============

@router.get("/sprints/{sprint_id}/burndown", response_model=BurndownChartResponse)
async def get_sprint_burndown(
    sprint_id: str,
    user: dict = Depends(get_current_user)
):
    """Get burndown chart data for a sprint"""
    sprint = await db.pm_sprints.find_one({"id": sprint_id}, {"_id": 0})
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    start_date = sprint.get("start_date", "")
    end_date = sprint.get("end_date", "")
    
    if not start_date or not end_date:
        raise HTTPException(status_code=400, detail="Sprint must have start and end dates")
    
    # Get all tasks in this sprint
    tasks = await db.pm_tasks.find(
        {"sprint_id": sprint_id},
        {"_id": 0, "id": 1, "story_points": 1, "status": 1, "updated_at": 1}
    ).to_list(500)
    
    total_points = sum(t.get("story_points", 0) or 0 for t in tasks)
    completed_points = sum(
        t.get("story_points", 0) or 0 
        for t in tasks 
        if t.get("status") in ["completed", "approved"]
    )
    
    # Generate data points - ensure timezone aware datetimes
    def parse_date(date_str):
        """Parse date string to timezone-aware datetime"""
        if not date_str:
            return None
        # Handle various date formats
        date_str = str(date_str)
        if 'T' not in date_str:
            # Just a date like "2026-03-14"
            return datetime.strptime(date_str[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        # ISO format with potential timezone
        if date_str.endswith('Z'):
            date_str = date_str.replace("Z", "+00:00")
        elif '+' not in date_str and '-' not in date_str[10:]:
            # No timezone info, assume UTC
            date_str = date_str + "+00:00"
        return datetime.fromisoformat(date_str)
    
    start = parse_date(start_date)
    end = parse_date(end_date)
    today = datetime.now(timezone.utc)
    
    total_days = (end - start).days or 1
    daily_burn_rate = total_points / total_days
    
    data_points = []
    current_date = start
    
    while current_date <= min(end, today):
        day_num = (current_date - start).days
        ideal_remaining = max(0, total_points - (daily_burn_rate * day_num))
        
        # Calculate actual remaining for this date
        # For simplicity, we'll interpolate based on current completion
        if current_date.date() == today.date():
            actual_remaining = total_points - completed_points
        else:
            # Historical data would require tracking - for now use linear interpolation
            progress_ratio = day_num / total_days
            actual_remaining = total_points * (1 - (completed_points / total_points if total_points > 0 else 0) * progress_ratio)
        
        data_points.append(BurndownDataPoint(
            date=current_date.strftime("%Y-%m-%d"),
            ideal_remaining=round(ideal_remaining, 1),
            actual_remaining=round(actual_remaining, 1),
            completed=round(total_points - actual_remaining, 1)
        ))
        
        current_date += timedelta(days=1)
    
    return BurndownChartResponse(
        sprint_id=sprint_id,
        sprint_name=sprint.get("name", ""),
        start_date=start_date,
        end_date=end_date,
        total_story_points=total_points,
        completed_story_points=completed_points,
        data_points=data_points
    )


# ============== VELOCITY CHART ==============

@router.get("/projects/{project_id}/velocity", response_model=VelocityChartResponse)
async def get_project_velocity(
    project_id: str,
    sprint_count: int = Query(default=10, le=20),
    user: dict = Depends(get_current_user)
):
    """Get velocity chart data for recent sprints"""
    # Get completed sprints for this project
    sprints = await db.pm_sprints.find(
        {
            "project_id": project_id,
            "status": "completed"
        },
        {"_id": 0}
    ).sort("end_date", -1).limit(sprint_count).to_list(sprint_count)
    
    sprints.reverse()  # Chronological order
    
    velocity_data = []
    total_velocity = 0
    
    for sprint in sprints:
        # Get tasks for this sprint
        tasks = await db.pm_tasks.find(
            {"sprint_id": sprint["id"]},
            {"story_points": 1, "status": 1}
        ).to_list(500)
        
        committed = sum(t.get("story_points", 0) or 0 for t in tasks)
        completed = sum(
            t.get("story_points", 0) or 0 
            for t in tasks 
            if t.get("status") in ["completed", "approved"]
        )
        
        velocity_data.append(VelocityDataPoint(
            sprint_id=sprint["id"],
            sprint_name=sprint.get("name", ""),
            committed_points=committed,
            completed_points=completed,
            start_date=sprint.get("start_date", ""),
            end_date=sprint.get("end_date", "")
        ))
        
        total_velocity += completed
    
    # Calculate average and trend
    avg_velocity = total_velocity / len(sprints) if sprints else 0
    
    # Determine trend
    trend = "stable"
    if len(velocity_data) >= 3:
        recent = sum(v.completed_points for v in velocity_data[-3:]) / 3
        older = sum(v.completed_points for v in velocity_data[:3]) / 3
        if recent > older * 1.1:
            trend = "increasing"
        elif recent < older * 0.9:
            trend = "decreasing"
    
    return VelocityChartResponse(
        sprints=velocity_data,
        average_velocity=round(avg_velocity, 1),
        trend=trend
    )


# ============== ISSUE TYPE STATS ==============

@router.get("/projects/{project_id}/issue-stats")
async def get_issue_type_stats(
    project_id: str,
    user: dict = Depends(get_current_user)
):
    """Get statistics by issue type for a project"""
    pipeline = [
        {"$match": {"project_id": project_id}},
        {"$group": {
            "_id": {"$ifNull": ["$issue_type", "task"]},
            "total": {"$sum": 1},
            "completed": {"$sum": {"$cond": [{"$in": ["$status", ["completed", "approved"]]}, 1, 0]}},
            "story_points": {"$sum": {"$ifNull": ["$story_points", 0]}}
        }}
    ]
    
    results = await db.pm_tasks.aggregate(pipeline).to_list(10)
    
    stats = {
        "epic": {"total": 0, "completed": 0, "story_points": 0},
        "story": {"total": 0, "completed": 0, "story_points": 0},
        "task": {"total": 0, "completed": 0, "story_points": 0},
        "bug": {"total": 0, "completed": 0, "story_points": 0},
        "subtask": {"total": 0, "completed": 0, "story_points": 0},
        "improvement": {"total": 0, "completed": 0, "story_points": 0},
        "spike": {"total": 0, "completed": 0, "story_points": 0}
    }
    
    for r in results:
        issue_type = r["_id"]
        if issue_type in stats:
            stats[issue_type] = {
                "total": r["total"],
                "completed": r["completed"],
                "story_points": r["story_points"]
            }
    
    # Count epics separately
    epic_count = await db.pm_epics.count_documents({"project_id": project_id})
    completed_epics = await db.pm_epics.count_documents({"project_id": project_id, "status": "done"})
    stats["epic"]["total"] = epic_count
    stats["epic"]["completed"] = completed_epics
    
    return stats
