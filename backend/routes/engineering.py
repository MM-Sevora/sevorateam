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


# ============== AUTOMATION FEATURES ==============

# 1. AUTO SPRINT CARRY-FORWARD
@router.post("/sprints/{sprint_id}/complete")
async def complete_sprint_with_carry_forward(
    sprint_id: str,
    target_sprint_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """
    Complete a sprint and automatically carry forward incomplete tasks.
    - Marks sprint as completed
    - Moves all non-done tasks to target sprint (or backlog if none specified)
    - Creates automation log entry
    """
    # Get the sprint
    sprint = await db.pm_sprints.find_one({"id": sprint_id})
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    project_id = sprint.get("project_id")
    
    # Get incomplete tasks in this sprint
    incomplete_statuses = ["todo", "not_started", "assigned", "in_progress", "pending_review", "on_hold", "draft"]
    incomplete_tasks = await db.pm_tasks.find({
        "sprint_id": sprint_id,
        "status": {"$in": incomplete_statuses}
    }).to_list(None)
    
    carried_forward_count = len(incomplete_tasks)
    carried_task_ids = []
    
    # Determine target for incomplete tasks
    if target_sprint_id:
        # Verify target sprint exists
        target_sprint = await db.pm_sprints.find_one({"id": target_sprint_id})
        if not target_sprint:
            raise HTTPException(status_code=404, detail="Target sprint not found")
        target_name = target_sprint.get("name", "Next Sprint")
    else:
        # Find next planning sprint for same project
        next_sprint = await db.pm_sprints.find_one({
            "project_id": project_id,
            "status": "planning",
            "id": {"$ne": sprint_id}
        }, sort=[("start_date", 1)])
        
        if next_sprint:
            target_sprint_id = next_sprint["id"]
            target_name = next_sprint.get("name", "Next Sprint")
        else:
            target_sprint_id = None
            target_name = "Backlog"
    
    # Move incomplete tasks
    for task in incomplete_tasks:
        carried_task_ids.append(task["id"])
        update_data = {
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if target_sprint_id:
            update_data["sprint_id"] = target_sprint_id
        else:
            # Move to backlog (remove sprint_id)
            update_data["sprint_id"] = None
        
        await db.pm_tasks.update_one(
            {"id": task["id"]},
            {"$set": update_data}
        )
    
    # Mark sprint as completed
    await db.pm_sprints.update_one(
        {"id": sprint_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "completed_by": user.get("id"),
            "carry_forward_count": carried_forward_count,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create automation log
    automation_log = {
        "id": str(uuid.uuid4()),
        "type": "sprint_carry_forward",
        "trigger": "sprint_completed",
        "sprint_id": sprint_id,
        "sprint_name": sprint.get("name"),
        "project_id": project_id,
        "tasks_carried": carried_forward_count,
        "task_ids": carried_task_ids,
        "target_sprint_id": target_sprint_id,
        "target_name": target_name,
        "triggered_by": user.get("id"),
        "triggered_by_name": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.automation_logs.insert_one(automation_log)
    
    return {
        "success": True,
        "message": f"Sprint completed. {carried_forward_count} tasks moved to {target_name}",
        "sprint_id": sprint_id,
        "tasks_carried_forward": carried_forward_count,
        "target": target_name,
        "target_sprint_id": target_sprint_id,
        "carried_task_ids": carried_task_ids
    }


# 2. WORKFLOW AUTOMATION TRIGGERS
from pydantic import BaseModel
from typing import List, Dict, Any

class WorkflowTrigger(BaseModel):
    """Automation trigger configuration"""
    type: str  # status_changed, task_created, due_date_approaching, blocked_days
    conditions: Optional[Dict[str, Any]] = {}

class WorkflowAction(BaseModel):
    """Automation action configuration"""
    type: str  # update_status, send_notification, assign_user, close_subtasks, add_comment
    config: Optional[Dict[str, Any]] = {}

class AutomationRuleCreate(BaseModel):
    """Create automation rule"""
    name: str
    description: Optional[str] = ""
    project_id: Optional[str] = None  # None = global rule
    trigger: WorkflowTrigger
    actions: List[WorkflowAction]
    is_active: bool = True

@router.post("/automations/rules")
async def create_automation_rule(
    rule: AutomationRuleCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new workflow automation rule"""
    rule_doc = {
        "id": str(uuid.uuid4()),
        "name": rule.name,
        "description": rule.description,
        "project_id": rule.project_id,
        "trigger": rule.trigger.dict(),
        "actions": [a.dict() for a in rule.actions],
        "is_active": rule.is_active,
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "execution_count": 0
    }
    
    await db.automation_rules.insert_one(rule_doc)
    del rule_doc["_id"]
    
    return rule_doc

@router.get("/automations/rules")
async def get_automation_rules(
    project_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all automation rules (optionally filtered by project)"""
    query = {}
    if project_id:
        query["$or"] = [{"project_id": project_id}, {"project_id": None}]
    
    rules = await db.automation_rules.find(query, {"_id": 0}).to_list(100)
    return rules

@router.delete("/automations/rules/{rule_id}")
async def delete_automation_rule(
    rule_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete an automation rule"""
    result = await db.automation_rules.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"success": True, "message": "Rule deleted"}

@router.post("/automations/execute")
async def execute_automation_trigger(
    trigger_type: str,
    context: Dict[str, Any],
    user: dict = Depends(get_current_user)
):
    """
    Execute automation rules based on a trigger.
    Called internally when events occur (status change, task creation, etc.)
    """
    # Find matching rules
    query = {
        "is_active": True,
        "trigger.type": trigger_type
    }
    
    if context.get("project_id"):
        query["$or"] = [
            {"project_id": context["project_id"]},
            {"project_id": None}
        ]
    
    rules = await db.automation_rules.find(query, {"_id": 0}).to_list(50)
    
    executed_actions = []
    
    for rule in rules:
        # Check trigger conditions
        trigger_conditions = rule.get("trigger", {}).get("conditions", {})
        conditions_met = True
        
        for key, expected_value in trigger_conditions.items():
            if context.get(key) != expected_value:
                conditions_met = False
                break
        
        if not conditions_met:
            continue
        
        # Execute actions
        for action in rule.get("actions", []):
            action_type = action.get("type")
            action_config = action.get("config", {})
            
            result = await _execute_action(action_type, action_config, context, user)
            executed_actions.append({
                "rule_id": rule["id"],
                "rule_name": rule["name"],
                "action_type": action_type,
                "result": result
            })
        
        # Increment execution count
        await db.automation_rules.update_one(
            {"id": rule["id"]},
            {"$inc": {"execution_count": 1}}
        )
    
    # Log execution
    if executed_actions:
        log_entry = {
            "id": str(uuid.uuid4()),
            "type": "workflow_automation",
            "trigger_type": trigger_type,
            "context": context,
            "actions_executed": executed_actions,
            "triggered_by": user.get("id"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.automation_logs.insert_one(log_entry)
    
    return {
        "success": True,
        "rules_matched": len(rules),
        "actions_executed": len(executed_actions),
        "details": executed_actions
    }

async def _execute_action(action_type: str, config: dict, context: dict, user: dict):
    """Execute a single automation action"""
    task_id = context.get("task_id")
    
    if action_type == "update_status":
        new_status = config.get("status")
        if task_id and new_status:
            await db.pm_tasks.update_one(
                {"id": task_id},
                {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"updated_status": new_status}
    
    elif action_type == "close_subtasks":
        if task_id:
            result = await db.pm_tasks.update_many(
                {"parent_task_id": task_id},
                {"$set": {"status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"subtasks_closed": result.modified_count}
    
    elif action_type == "add_comment":
        comment_text = config.get("comment", "Automation triggered")
        if task_id:
            comment = {
                "id": str(uuid.uuid4()),
                "task_id": task_id,
                "content": f"🤖 {comment_text}",
                "author_id": "system",
                "author_name": "Automation",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_system": True
            }
            await db.pm_task_comments.insert_one(comment)
            return {"comment_added": True}
    
    elif action_type == "send_notification":
        # Create notification for task assignee or specified users
        notification_title = config.get("title", "Automation Alert")
        notification_body = config.get("body", "An automated action was triggered")
        recipient_ids = config.get("recipient_ids", [])
        
        # If no recipients specified, notify task assignee
        if not recipient_ids and task_id:
            task = await db.pm_tasks.find_one({"id": task_id})
            if task and task.get("assignee_id"):
                recipient_ids = [task["assignee_id"]]
        
        for recipient_id in recipient_ids:
            notification = {
                "id": str(uuid.uuid4()),
                "user_id": recipient_id,
                "title": notification_title,
                "body": notification_body,
                "type": "automation",
                "related_type": "task",
                "related_id": task_id,
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
        
        return {"notifications_sent": len(recipient_ids)}
    
    elif action_type == "assign_user":
        assignee_id = config.get("assignee_id")
        if task_id and assignee_id:
            await db.pm_tasks.update_one(
                {"id": task_id},
                {"$set": {"assignee_id": assignee_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"assigned_to": assignee_id}
    
    return {"action": action_type, "status": "no_op"}


# 3. RELEASE NOTES GENERATOR
@router.get("/releases/{release_id}/notes")
async def generate_release_notes(
    release_id: str,
    format: str = "markdown",
    user: dict = Depends(get_current_user)
):
    """
    Auto-generate release notes from completed tasks in a release.
    Groups by type: Features, Bug Fixes, Improvements, Other
    """
    # Get release
    release = await db.pm_releases.find_one({"id": release_id})
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    release_name = release.get("name", "Release")
    release_version = release.get("version", "")
    target_date = release.get("target_date", "")
    
    # Get all tasks linked to this release that are completed
    completed_statuses = ["completed", "done", "approved"]
    tasks = await db.pm_tasks.find({
        "release_id": release_id,
        "status": {"$in": completed_statuses}
    }, {"_id": 0}).to_list(500)
    
    # Also get tasks by sprint if release has sprints
    sprint_ids = release.get("sprint_ids", [])
    if sprint_ids:
        sprint_tasks = await db.pm_tasks.find({
            "sprint_id": {"$in": sprint_ids},
            "status": {"$in": completed_statuses}
        }, {"_id": 0}).to_list(500)
        
        # Merge and dedupe
        task_ids = {t["id"] for t in tasks}
        for t in sprint_tasks:
            if t["id"] not in task_ids:
                tasks.append(t)
    
    # Group tasks by issue type
    grouped = {
        "feature": [],
        "story": [],
        "bug": [],
        "improvement": [],
        "task": [],
        "other": []
    }
    
    for task in tasks:
        issue_type = task.get("issue_type", "task")
        if issue_type in grouped:
            grouped[issue_type].append(task)
        else:
            grouped["other"].append(task)
    
    # Generate markdown
    lines = [
        f"# {release_name} {release_version}",
        f"**Release Date:** {target_date or 'TBD'}",
        "",
        "---",
        ""
    ]
    
    # Features & Stories
    features = grouped["feature"] + grouped["story"]
    if features:
        lines.append("## ✨ New Features")
        lines.append("")
        for task in features:
            title = task.get("title", "Untitled")
            task_id = task.get("id", "")[:8]
            description = task.get("description", "")
            # Strip HTML tags from description
            import re
            clean_desc = re.sub(r'<[^>]+>', '', description) if description else ""
            clean_desc = clean_desc[:150] + "..." if len(clean_desc) > 150 else clean_desc
            
            lines.append(f"- **{title}** `#{task_id}`")
            if clean_desc:
                lines.append(f"  - {clean_desc}")
        lines.append("")
    
    # Bug Fixes
    if grouped["bug"]:
        lines.append("## 🐛 Bug Fixes")
        lines.append("")
        for task in grouped["bug"]:
            title = task.get("title", "Untitled")
            task_id = task.get("id", "")[:8]
            severity = task.get("bug_severity", "")
            severity_emoji = {"critical": "🔴", "major": "🟠", "minor": "🟡", "trivial": "⚪"}.get(severity, "")
            lines.append(f"- {severity_emoji} **{title}** `#{task_id}`")
        lines.append("")
    
    # Improvements
    if grouped["improvement"]:
        lines.append("## ⚡ Improvements")
        lines.append("")
        for task in grouped["improvement"]:
            title = task.get("title", "Untitled")
            task_id = task.get("id", "")[:8]
            lines.append(f"- **{title}** `#{task_id}`")
        lines.append("")
    
    # Other Tasks
    other_tasks = grouped["task"] + grouped["other"]
    if other_tasks:
        lines.append("## 📋 Other Changes")
        lines.append("")
        for task in other_tasks:
            title = task.get("title", "Untitled")
            task_id = task.get("id", "")[:8]
            lines.append(f"- {title} `#{task_id}`")
        lines.append("")
    
    # Summary stats
    lines.append("---")
    lines.append("")
    lines.append("### Summary")
    lines.append(f"- **Total Changes:** {len(tasks)}")
    lines.append(f"- **Features:** {len(features)}")
    lines.append(f"- **Bug Fixes:** {len(grouped['bug'])}")
    lines.append(f"- **Improvements:** {len(grouped['improvement'])}")
    lines.append(f"- **Other:** {len(other_tasks)}")
    
    markdown_content = "\n".join(lines)
    
    # Store generated notes
    await db.pm_releases.update_one(
        {"id": release_id},
        {"$set": {
            "generated_notes": markdown_content,
            "notes_generated_at": datetime.now(timezone.utc).isoformat(),
            "notes_generated_by": user.get("id")
        }}
    )
    
    return {
        "release_id": release_id,
        "release_name": release_name,
        "version": release_version,
        "format": format,
        "content": markdown_content,
        "task_count": len(tasks),
        "breakdown": {
            "features": len(features),
            "bugs": len(grouped["bug"]),
            "improvements": len(grouped["improvement"]),
            "other": len(other_tasks)
        }
    }

@router.get("/automations/logs")
async def get_automation_logs(
    limit: int = 50,
    automation_type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get automation execution logs"""
    query = {}
    if automation_type:
        query["type"] = automation_type
    
    logs = await db.automation_logs.find(
        query, 
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return logs

# Seed default automation rules
@router.post("/automations/seed-defaults")
async def seed_default_automation_rules(user: dict = Depends(get_current_user)):
    """Create default automation rules"""
    default_rules = [
        {
            "id": str(uuid.uuid4()),
            "name": "Auto-close subtasks when parent done",
            "description": "When a task is marked as completed, automatically close all its subtasks",
            "project_id": None,
            "trigger": {"type": "status_changed", "conditions": {"new_status": "completed"}},
            "actions": [{"type": "close_subtasks", "config": {}}],
            "is_active": True,
            "created_by": user.get("id"),
            "created_by_name": user.get("name"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "execution_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Notify on task blocked",
            "description": "Send notification when a task is marked as blocked/on_hold",
            "project_id": None,
            "trigger": {"type": "status_changed", "conditions": {"new_status": "on_hold"}},
            "actions": [{"type": "send_notification", "config": {"title": "Task Blocked", "body": "A task has been marked as blocked and needs attention"}}],
            "is_active": True,
            "created_by": user.get("id"),
            "created_by_name": user.get("name"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "execution_count": 0
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Add completion comment",
            "description": "Add an automated comment when task is completed",
            "project_id": None,
            "trigger": {"type": "status_changed", "conditions": {"new_status": "completed"}},
            "actions": [{"type": "add_comment", "config": {"comment": "Task completed! Great work! 🎉"}}],
            "is_active": True,
            "created_by": user.get("id"),
            "created_by_name": user.get("name"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "execution_count": 0
        }
    ]
    
    created = 0
    for rule in default_rules:
        # Check if similar rule exists
        exists = await db.automation_rules.find_one({"name": rule["name"]})
        if not exists:
            await db.automation_rules.insert_one(rule)
            created += 1
    
    return {"success": True, "message": f"Created {created} default automation rules"}

