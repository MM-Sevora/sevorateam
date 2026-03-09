"""
Project Management System API Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Header, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
import uuid

# Import models
from models.projects import (
    PMModuleCreate, PMModuleUpdate, PMModuleResponse,
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectStatus, ProjectType,
    TaskCreate, TaskUpdate, TaskResponse, TaskStatus, Priority,
    SubtaskCreate, SubtaskUpdate, SubtaskResponse,
    ChecklistItemCreate, ChecklistItemUpdate, ChecklistItemResponse,
    TaskCommentCreate, TaskCommentResponse,
    ActivityLogResponse,
    TimeLogCreate, TimeLogResponse,
    MyTasksResponse, ProjectDashboardResponse,
    ManagerDashboardResponse, TeamMemberWorkload, ProjectSummary,
    AttachmentResponse,
    LabelCreate, LabelUpdate, LabelResponse, TaskLabelResponse,
    TaskTemplateCreate, TaskTemplateUpdate, TaskTemplateResponse
)

# Import storage utilities
from utils.storage import init_storage, put_object, get_object, get_mime_type, generate_storage_path

router = APIRouter(prefix="/projects", tags=["Project Management"])

# Database and auth will be injected
db = None
_get_current_user_func = None

security = HTTPBearer(auto_error=False)

def init_router(database, auth_dependency):
    """Initialize router with database and auth dependency"""
    global db, _get_current_user_func
    db = database
    _get_current_user_func = auth_dependency


async def get_current_user_dep(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Wrapper for the injected auth dependency"""
    if _get_current_user_func is None:
        raise HTTPException(status_code=500, detail="Auth not initialized")
    return await _get_current_user_func(credentials)


# ============== HELPER FUNCTIONS ==============

async def get_user_name(user_id: str) -> str:
    """Get user name by ID"""
    if not user_id:
        return None
    user = await db.users.find_one({"id": user_id}, {"name": 1})
    return user.get("name") if user else None


async def get_department_name(dept_id: str) -> str:
    """Get department name by ID"""
    if not dept_id:
        return None
    dept = await db.departments.find_one({"id": dept_id}, {"name": 1})
    return dept.get("name") if dept else None


async def generate_project_id() -> str:
    """Generate auto-incrementing project ID like PRJ-1001"""
    # Find the highest existing project_id
    last_project = await db.pm_projects.find_one(
        {"project_id": {"$regex": "^PRJ-"}},
        sort=[("project_id", -1)]
    )
    
    if last_project and last_project.get("project_id"):
        try:
            last_num = int(last_project["project_id"].split("-")[1])
            next_num = last_num + 1
        except:
            next_num = 1001
    else:
        next_num = 1001
    
    return f"PRJ-{next_num}"


async def get_task_name(task_id: str) -> str:
    """Get task name by ID"""
    if not task_id:
        return None
    task = await db.pm_tasks.find_one({"id": task_id}, {"name": 1})
    return task.get("name") if task else None


async def log_activity(entity_type: str, entity_id: str, entity_name: str, action: str, user_id: str, details: dict = None):
    """Log an activity for audit trail"""
    user_name = await get_user_name(user_id)
    log_doc = {
        "id": str(uuid.uuid4()),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "action": action,
        "details": details or {},
        "user_id": user_id,
        "user_name": user_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.pm_activity_logs.insert_one(log_doc)


async def enrich_task(task: dict) -> dict:
    """Enrich task with related data"""
    # Get assigned user name
    if task.get("assigned_to"):
        task["assigned_to_name"] = await get_user_name(task["assigned_to"])
    
    # Get assigned by name
    if task.get("assigned_by"):
        task["assigned_by_name"] = await get_user_name(task["assigned_by"])
    
    # Get project and module info
    if task.get("project_id"):
        project = await db.pm_projects.find_one({"id": task["project_id"]}, {"name": 1, "module_id": 1})
        if project:
            task["project_name"] = project.get("name")
            task["module_id"] = project.get("module_id")
            if project.get("module_id"):
                module = await db.pm_modules.find_one({"id": project["module_id"]}, {"name": 1})
                task["module_name"] = module.get("name") if module else None
    
    # Get counts
    task["subtask_count"] = await db.pm_subtasks.count_documents({"parent_task_id": task["id"]})
    task["checklist_count"] = await db.pm_checklists.count_documents({"task_id": task["id"]})
    task["checklist_completed"] = await db.pm_checklists.count_documents({"task_id": task["id"], "is_completed": True})
    task["comment_count"] = await db.pm_comments.count_documents({"task_id": task["id"]})
    task["attachment_count"] = await db.pm_attachments.count_documents({"task_id": task["id"], "is_deleted": False})
    
    # Get dependency info
    blocked_by = task.get("blocked_by", [])
    blocks = task.get("blocks", [])
    
    # Get names of blocking tasks
    blocked_by_names = []
    is_blocked = False
    for blocking_id in blocked_by:
        blocking_task = await db.pm_tasks.find_one({"id": blocking_id}, {"name": 1, "status": 1})
        if blocking_task:
            blocked_by_names.append(blocking_task.get("name", "Unknown"))
            # Task is blocked if any blocking task is not completed
            if blocking_task.get("status") not in ["completed", "approved"]:
                is_blocked = True
    task["blocked_by_names"] = blocked_by_names
    task["is_blocked"] = is_blocked
    
    # Get names of tasks this blocks
    blocks_names = []
    for blocked_id in blocks:
        blocked_task = await db.pm_tasks.find_one({"id": blocked_id}, {"name": 1})
        if blocked_task:
            blocks_names.append(blocked_task.get("name", "Unknown"))
    task["blocks_names"] = blocks_names
    
    # Ensure blocked_by and blocks are lists
    task["blocked_by"] = blocked_by
    task["blocks"] = blocks
    
    # Get labels
    label_ids = task.get("label_ids", [])
    labels = []
    if label_ids:
        label_docs = await db.pm_labels.find({"id": {"$in": label_ids}}, {"_id": 0, "id": 1, "name": 1, "color": 1}).to_list(50)
        labels = label_docs
    task["labels"] = labels
    
    return task


# ============== PM MODULES ==============

@router.get("/modules", response_model=List[PMModuleResponse])
async def list_modules(
    is_active: Optional[bool] = None,
    user: dict = Depends(get_current_user_dep)
):
    """List all PM modules"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    
    modules = await db.pm_modules.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    
    # Enrich with project counts and owner names
    for module in modules:
        module["project_count"] = await db.pm_projects.count_documents({"module_id": module["id"]})
        if module.get("owner_id"):
            module["owner_name"] = await get_user_name(module["owner_id"])
    
    return modules


@router.post("/modules", response_model=PMModuleResponse)
async def create_module(
    data: PMModuleCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new PM module"""
    module_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    module_doc = {
        "id": module_id,
        "name": data.name,
        "description": data.description,
        "owner_id": data.owner_id,
        "color": data.color,
        "icon": data.icon,
        "is_active": True,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_modules.insert_one(module_doc)
    await log_activity("module", module_id, data.name, "created", user["id"])
    
    module_doc["project_count"] = 0
    module_doc["owner_name"] = await get_user_name(data.owner_id) if data.owner_id else None
    if "_id" in module_doc:
        del module_doc["_id"]
    
    return module_doc


@router.get("/modules/{module_id}", response_model=PMModuleResponse)
async def get_module(
    module_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get a single PM module"""
    module = await db.pm_modules.find_one({"id": module_id}, {"_id": 0})
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    module["project_count"] = await db.pm_projects.count_documents({"module_id": module_id})
    if module.get("owner_id"):
        module["owner_name"] = await get_user_name(module["owner_id"])
    
    return module


@router.put("/modules/{module_id}", response_model=PMModuleResponse)
async def update_module(
    module_id: str,
    data: PMModuleUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a PM module"""
    module = await db.pm_modules.find_one({"id": module_id})
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pm_modules.update_one({"id": module_id}, {"$set": update_data})
    await log_activity("module", module_id, module.get("name"), "updated", user["id"], update_data)
    
    updated = await db.pm_modules.find_one({"id": module_id}, {"_id": 0})
    updated["project_count"] = await db.pm_projects.count_documents({"module_id": module_id})
    if updated.get("owner_id"):
        updated["owner_name"] = await get_user_name(updated["owner_id"])
    
    return updated


@router.delete("/modules/{module_id}")
async def delete_module(
    module_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a PM module (soft delete by setting is_active=False)"""
    module = await db.pm_modules.find_one({"id": module_id})
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # Check if module has projects
    project_count = await db.pm_projects.count_documents({"module_id": module_id})
    if project_count > 0:
        # Soft delete
        await db.pm_modules.update_one(
            {"id": module_id}, 
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        await log_activity("module", module_id, module.get("name"), "deactivated", user["id"])
        return {"message": "Module deactivated (has projects)"}
    
    # Hard delete if no projects
    await db.pm_modules.delete_one({"id": module_id})
    await log_activity("module", module_id, module.get("name"), "deleted", user["id"])
    return {"message": "Module deleted"}


# ============== PROJECTS ==============

@router.get("/list", response_model=List[ProjectResponse])
async def list_projects(
    module_id: Optional[str] = None,
    department_id: Optional[str] = None,
    project_type: Optional[ProjectType] = None,
    status: Optional[ProjectStatus] = None,
    owner_id: Optional[str] = None,
    priority: Optional[Priority] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """List all projects with filters"""
    query = {}
    
    if module_id:
        query["module_id"] = module_id
    if department_id:
        query["department_id"] = department_id
    if project_type:
        query["project_type"] = project_type.value
    if status:
        query["status"] = status.value
    if owner_id:
        query["owner_id"] = owner_id
    if priority:
        query["priority"] = priority.value
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"project_id": {"$regex": search, "$options": "i"}}
        ]
    
    projects = await db.pm_projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich projects
    for project in projects:
        # Ensure project_id exists (for backward compatibility)
        if not project.get("project_id"):
            project["project_id"] = f"PRJ-{project['id'][:4].upper()}"
        
        # Get module name
        if project.get("module_id"):
            module = await db.pm_modules.find_one({"id": project["module_id"]}, {"name": 1})
            project["module_name"] = module.get("name") if module else None
        
        # Get department name
        if project.get("department_id"):
            project["department_name"] = await get_department_name(project["department_id"])
        
        # Get owner name
        if project.get("owner_id"):
            project["owner_name"] = await get_user_name(project["owner_id"])
        
        # Get project manager name
        if project.get("project_manager_id"):
            project["project_manager_name"] = await get_user_name(project["project_manager_id"])
        
        # Get team member names
        team_members = project.get("team_members", [])
        names = []
        for member_id in team_members:
            name = await get_user_name(member_id)
            if name:
                names.append(name)
        project["team_member_names"] = names
        
        # Get stakeholder names
        stakeholders = project.get("stakeholders", [])
        stakeholder_names = []
        for stakeholder_id in stakeholders:
            name = await get_user_name(stakeholder_id)
            if name:
                stakeholder_names.append(name)
        project["stakeholder_names"] = stakeholder_names
        
        # Get task counts and progress
        total_tasks = await db.pm_tasks.count_documents({"project_id": project["id"]})
        completed_tasks = await db.pm_tasks.count_documents({"project_id": project["id"], "status": "completed"})
        project["task_count"] = total_tasks
        project["completed_task_count"] = completed_tasks
        project["progress"] = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0
    
    return projects


@router.post("", response_model=ProjectResponse)
async def create_project(
    data: ProjectCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new project"""
    # Verify module exists
    module = await db.pm_modules.find_one({"id": data.module_id})
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # Verify department exists if provided
    if data.department_id:
        dept = await db.departments.find_one({"id": data.department_id})
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
    
    project_uuid = str(uuid.uuid4())
    project_id = await generate_project_id()  # Auto-generated PRJ-XXXX
    now = datetime.now(timezone.utc).isoformat()
    
    project_doc = {
        "id": project_uuid,
        "project_id": project_id,
        "name": data.name,
        "module_id": data.module_id,
        "project_type": data.project_type.value,
        "department_id": data.department_id,
        "description": data.description,
        "owner_id": data.owner_id or user["id"],
        "project_manager_id": data.project_manager_id,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "priority": data.priority.value,
        "status": ProjectStatus.DRAFT.value,
        "team_members": data.team_members,
        "stakeholders": data.stakeholders,
        "tags": data.tags,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_projects.insert_one(project_doc)
    await log_activity("project", project_uuid, data.name, "created", user["id"])
    
    # Enrich response
    project_doc["module_name"] = module.get("name")
    project_doc["owner_name"] = await get_user_name(project_doc["owner_id"])
    project_doc["project_manager_name"] = await get_user_name(data.project_manager_id) if data.project_manager_id else None
    project_doc["department_name"] = await get_department_name(data.department_id) if data.department_id else None
    
    project_doc["team_member_names"] = []
    for member_id in data.team_members:
        name = await get_user_name(member_id)
        if name:
            project_doc["team_member_names"].append(name)
    
    project_doc["stakeholder_names"] = []
    for stakeholder_id in data.stakeholders:
        name = await get_user_name(stakeholder_id)
        if name:
            project_doc["stakeholder_names"].append(name)
    
    project_doc["task_count"] = 0
    project_doc["completed_task_count"] = 0
    project_doc["progress"] = 0
    
    if "_id" in project_doc:
        del project_doc["_id"]
    
    return project_doc


# ============== ACTIVITY LOG (Must be before /{project_id}) ==============

@router.get("/activity", response_model=List[ActivityLogResponse])
async def list_activity(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    user: dict = Depends(get_current_user_dep)
):
    """List activity logs with filters"""
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    if user_id:
        query["user_id"] = user_id
    
    logs = await db.pm_activity_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return logs


# ============== MY TASKS DASHBOARD (Must be before /{project_id}) ==============

@router.get("/my-tasks", response_model=MyTasksResponse)
async def get_my_tasks(
    user: dict = Depends(get_current_user_dep)
):
    """Get dashboard of tasks for current user"""
    user_id = user["id"]
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_str = today.isoformat()
    tomorrow_str = (today + timedelta(days=1)).isoformat()
    
    # Tasks assigned to me (not completed)
    assigned_query = {
        "assigned_to": user_id,
        "status": {"$nin": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]}
    }
    tasks_assigned = await db.pm_tasks.find(assigned_query, {"_id": 0}).sort("due_date", 1).to_list(50)
    
    # Tasks due today
    due_today_query = {
        "assigned_to": user_id,
        "due_date": {"$gte": today_str, "$lt": tomorrow_str},
        "status": {"$nin": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]}
    }
    tasks_due_today = await db.pm_tasks.find(due_today_query, {"_id": 0}).to_list(50)
    
    # Overdue tasks
    overdue_query = {
        "assigned_to": user_id,
        "due_date": {"$lt": today_str},
        "status": {"$nin": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]}
    }
    tasks_overdue = await db.pm_tasks.find(overdue_query, {"_id": 0}).sort("due_date", 1).to_list(50)
    
    # Tasks in progress
    in_progress_query = {
        "assigned_to": user_id,
        "status": TaskStatus.IN_PROGRESS.value
    }
    tasks_in_progress = await db.pm_tasks.find(in_progress_query, {"_id": 0}).to_list(50)
    
    # Tasks pending review
    pending_review_query = {
        "assigned_to": user_id,
        "status": TaskStatus.PENDING_REVIEW.value
    }
    tasks_pending_review = await db.pm_tasks.find(pending_review_query, {"_id": 0}).to_list(50)
    
    # Recently completed (last 7 days)
    week_ago = (today - timedelta(days=7)).isoformat()
    completed_query = {
        "assigned_to": user_id,
        "status": {"$in": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]},
        "updated_at": {"$gte": week_ago}
    }
    recently_completed = await db.pm_tasks.find(completed_query, {"_id": 0}).sort("updated_at", -1).to_list(20)
    
    # Enrich all tasks
    enriched_assigned = [await enrich_task(t) for t in tasks_assigned]
    enriched_due_today = [await enrich_task(t) for t in tasks_due_today]
    enriched_overdue = [await enrich_task(t) for t in tasks_overdue]
    enriched_in_progress = [await enrich_task(t) for t in tasks_in_progress]
    enriched_pending_review = [await enrich_task(t) for t in tasks_pending_review]
    enriched_completed = [await enrich_task(t) for t in recently_completed]
    
    # Calculate stats
    total_assigned = await db.pm_tasks.count_documents({"assigned_to": user_id, "status": {"$nin": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]}})
    total_completed_ever = await db.pm_tasks.count_documents({"assigned_to": user_id, "status": {"$in": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]}})
    
    stats = {
        "total_assigned": total_assigned,
        "due_today": len(tasks_due_today),
        "overdue": len(tasks_overdue),
        "in_progress": len(tasks_in_progress),
        "pending_review": len(tasks_pending_review),
        "completed_this_week": len(recently_completed),
        "total_completed": total_completed_ever
    }
    
    return MyTasksResponse(
        tasks_assigned=enriched_assigned,
        tasks_due_today=enriched_due_today,
        tasks_overdue=enriched_overdue,
        tasks_in_progress=enriched_in_progress,
        tasks_pending_review=enriched_pending_review,
        recently_completed=enriched_completed,
        stats=stats
    )


# ============== MANAGER DASHBOARD (Must be before /{project_id}) ==============

@router.get("/manager-dashboard", response_model=ManagerDashboardResponse)
async def get_manager_dashboard(
    user: dict = Depends(get_current_user_dep)
):
    """Get manager's overview dashboard for all projects"""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_str = today.isoformat()
    week_from_now = (today + timedelta(days=7)).isoformat()
    
    # ===== PROJECT STATS =====
    total_projects = await db.pm_projects.count_documents({})
    active_projects = await db.pm_projects.count_documents({"status": ProjectStatus.ACTIVE.value})
    completed_projects = await db.pm_projects.count_documents({"status": ProjectStatus.COMPLETED.value})
    on_hold_projects = await db.pm_projects.count_documents({"status": ProjectStatus.ON_HOLD.value})
    
    # Projects by status
    projects_by_status = {
        "draft": await db.pm_projects.count_documents({"status": ProjectStatus.DRAFT.value}),
        "active": active_projects,
        "on_hold": on_hold_projects,
        "completed": completed_projects,
        "cancelled": await db.pm_projects.count_documents({"status": ProjectStatus.CANCELLED.value})
    }
    
    # Projects by priority
    projects_by_priority = {
        "urgent": await db.pm_projects.count_documents({"priority": Priority.URGENT.value}),
        "high": await db.pm_projects.count_documents({"priority": Priority.HIGH.value}),
        "medium": await db.pm_projects.count_documents({"priority": Priority.MEDIUM.value}),
        "low": await db.pm_projects.count_documents({"priority": Priority.LOW.value})
    }
    
    # ===== TASK STATS =====
    total_tasks = await db.pm_tasks.count_documents({"parent_task_id": None})
    completed_tasks = await db.pm_tasks.count_documents({
        "parent_task_id": None,
        "status": {"$in": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]}
    })
    overdue_tasks = await db.pm_tasks.count_documents({
        "parent_task_id": None,
        "due_date": {"$lt": today_str},
        "status": {"$nin": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]}
    })
    unassigned_tasks = await db.pm_tasks.count_documents({
        "parent_task_id": None,
        "assigned_to": None,
        "status": {"$nin": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]}
    })
    blocked_tasks = await db.pm_tasks.count_documents({
        "parent_task_id": None,
        "blocked_by": {"$ne": []},
        "status": {"$nin": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]}
    })
    
    # Tasks by status
    tasks_by_status = {
        "draft": await db.pm_tasks.count_documents({"parent_task_id": None, "status": TaskStatus.DRAFT.value}),
        "assigned": await db.pm_tasks.count_documents({"parent_task_id": None, "status": TaskStatus.ASSIGNED.value}),
        "in_progress": await db.pm_tasks.count_documents({"parent_task_id": None, "status": TaskStatus.IN_PROGRESS.value}),
        "pending_review": await db.pm_tasks.count_documents({"parent_task_id": None, "status": TaskStatus.PENDING_REVIEW.value}),
        "completed": await db.pm_tasks.count_documents({"parent_task_id": None, "status": TaskStatus.COMPLETED.value}),
        "approved": await db.pm_tasks.count_documents({"parent_task_id": None, "status": TaskStatus.APPROVED.value}),
        "on_hold": await db.pm_tasks.count_documents({"parent_task_id": None, "status": TaskStatus.ON_HOLD.value})
    }
    
    # ===== TEAM WORKLOAD =====
    # Get all users with tasks
    pipeline = [
        {"$match": {"parent_task_id": None, "assigned_to": {"$ne": None}}},
        {"$group": {
            "_id": "$assigned_to",
            "total": {"$sum": 1},
            "completed": {"$sum": {"$cond": [{"$in": ["$status", ["completed", "approved"]]}, 1, 0]}},
            "in_progress": {"$sum": {"$cond": [{"$eq": ["$status", "in_progress"]}, 1, 0]}}
        }}
    ]
    workload_data = await db.pm_tasks.aggregate(pipeline).to_list(100)
    
    team_workload = []
    for entry in workload_data:
        user_id = entry["_id"]
        user_name = await get_user_name(user_id)
        if user_name:
            # Count overdue for this user
            user_overdue = await db.pm_tasks.count_documents({
                "assigned_to": user_id,
                "parent_task_id": None,
                "due_date": {"$lt": today_str},
                "status": {"$nin": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]}
            })
            team_workload.append(TeamMemberWorkload(
                user_id=user_id,
                user_name=user_name,
                total_tasks=entry["total"],
                completed_tasks=entry["completed"],
                in_progress_tasks=entry["in_progress"],
                overdue_tasks=user_overdue
            ))
    
    # Sort by total tasks descending
    team_workload.sort(key=lambda x: x.total_tasks, reverse=True)
    
    # ===== AT-RISK PROJECTS =====
    # Projects with overdue tasks or past end date
    at_risk_project_list = []
    at_risk_projects_count = 0
    
    # Get active projects
    active_project_docs = await db.pm_projects.find(
        {"status": ProjectStatus.ACTIVE.value}, 
        {"_id": 0}
    ).to_list(100)
    
    for project in active_project_docs:
        project_id = project["id"]
        # Count overdue tasks in this project
        overdue_count = await db.pm_tasks.count_documents({
            "project_id": project_id,
            "parent_task_id": None,
            "due_date": {"$lt": today_str},
            "status": {"$nin": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]}
        })
        
        # Check if project is past end date
        is_past_deadline = False
        if project.get("end_date") and project["end_date"] < today_str:
            is_past_deadline = True
        
        is_at_risk = overdue_count > 0 or is_past_deadline
        
        if is_at_risk:
            at_risk_projects_count += 1
            total_tasks_proj = await db.pm_tasks.count_documents({"project_id": project_id, "parent_task_id": None})
            completed_tasks_proj = await db.pm_tasks.count_documents({
                "project_id": project_id,
                "parent_task_id": None,
                "status": {"$in": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]}
            })
            progress = round((completed_tasks_proj / total_tasks_proj * 100), 1) if total_tasks_proj > 0 else 0
            
            at_risk_project_list.append(ProjectSummary(
                id=project_id,
                project_id=project.get("project_id", f"PRJ-{project_id[:4].upper()}"),
                name=project["name"],
                status=project["status"],
                priority=project.get("priority", "medium"),
                progress=progress,
                task_count=total_tasks_proj,
                completed_task_count=completed_tasks_proj,
                overdue_task_count=overdue_count,
                end_date=project.get("end_date"),
                is_at_risk=True
            ))
    
    # ===== UPCOMING DEADLINES =====
    # Projects ending within next 7 days
    upcoming_deadline_projects = await db.pm_projects.find({
        "status": ProjectStatus.ACTIVE.value,
        "end_date": {"$gte": today_str, "$lte": week_from_now}
    }, {"_id": 0}).sort("end_date", 1).to_list(10)
    
    upcoming_deadlines = []
    for project in upcoming_deadline_projects:
        project_id = project["id"]
        total_tasks_proj = await db.pm_tasks.count_documents({"project_id": project_id, "parent_task_id": None})
        completed_tasks_proj = await db.pm_tasks.count_documents({
            "project_id": project_id,
            "parent_task_id": None,
            "status": {"$in": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]}
        })
        progress = round((completed_tasks_proj / total_tasks_proj * 100), 1) if total_tasks_proj > 0 else 0
        
        upcoming_deadlines.append(ProjectSummary(
            id=project_id,
            project_id=project.get("project_id", f"PRJ-{project_id[:4].upper()}"),
            name=project["name"],
            status=project["status"],
            priority=project.get("priority", "medium"),
            progress=progress,
            task_count=total_tasks_proj,
            completed_task_count=completed_tasks_proj,
            overdue_task_count=0,
            end_date=project.get("end_date"),
            is_at_risk=False
        ))
    
    # ===== RECENT ACTIVITY =====
    recent_logs = await db.pm_activity_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(15)
    recent_activity = [ActivityLogResponse(**log) for log in recent_logs]
    
    # ===== WEEKLY COMPLETION (Last 7 days) =====
    weekly_completion = []
    for i in range(7):
        day = today - timedelta(days=6-i)
        day_start = day.isoformat()
        day_end = (day + timedelta(days=1)).isoformat()
        
        completed_on_day = await db.pm_tasks.count_documents({
            "parent_task_id": None,
            "status": {"$in": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]},
            "updated_at": {"$gte": day_start, "$lt": day_end}
        })
        
        weekly_completion.append({
            "date": day.strftime("%a"),  # Mon, Tue, etc.
            "full_date": day.strftime("%Y-%m-%d"),
            "completed": completed_on_day
        })
    
    return ManagerDashboardResponse(
        total_projects=total_projects,
        active_projects=active_projects,
        completed_projects=completed_projects,
        on_hold_projects=on_hold_projects,
        at_risk_projects=at_risk_projects_count,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        overdue_tasks=overdue_tasks,
        unassigned_tasks=unassigned_tasks,
        blocked_tasks=blocked_tasks,
        projects_by_status=projects_by_status,
        projects_by_priority=projects_by_priority,
        tasks_by_status=tasks_by_status,
        team_workload=team_workload,
        at_risk_project_list=at_risk_project_list,
        upcoming_deadlines=upcoming_deadlines,
        recent_activity=recent_activity,
        weekly_completion=weekly_completion
    )


# ============== TASK TEMPLATES (Must be before /{project_id}) ==============

@router.get("/templates", response_model=List[TaskTemplateResponse])
async def list_templates(
    project_id: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """List task templates - global and/or project-specific"""
    query = {}
    if project_id:
        # Get templates for this project + global templates
        query["$or"] = [{"project_id": project_id}, {"project_id": None}]
    
    templates = await db.pm_task_templates.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    
    # Enrich templates
    for template in templates:
        if template.get("project_id"):
            project = await db.pm_projects.find_one({"id": template["project_id"]}, {"name": 1})
            template["project_name"] = project.get("name") if project else None
        else:
            template["project_name"] = "Global"
        
        if template.get("default_assignee"):
            template["default_assignee_name"] = await get_user_name(template["default_assignee"])
        
        if template.get("created_by"):
            template["created_by_name"] = await get_user_name(template["created_by"])
        
        # Get label details
        label_ids = template.get("default_labels", [])
        if label_ids:
            labels = await db.pm_labels.find({"id": {"$in": label_ids}}, {"_id": 0, "id": 1, "name": 1, "color": 1}).to_list(50)
            template["default_label_names"] = labels
        else:
            template["default_label_names"] = []
    
    return templates


@router.post("/templates", response_model=TaskTemplateResponse)
async def create_template(
    data: TaskTemplateCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new task template"""
    # Verify project if provided
    if data.project_id:
        project = await db.pm_projects.find_one({"id": data.project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    
    template_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    template_doc = {
        "id": template_id,
        "name": data.name,
        "description": data.description,
        "project_id": data.project_id,
        "default_priority": data.default_priority.value,
        "default_assignee": data.default_assignee,
        "estimated_hours": data.estimated_hours,
        "default_labels": data.default_labels,
        "default_tags": data.default_tags,
        "checklist_items": [item.model_dump() for item in data.checklist_items],
        "is_recurring": data.is_recurring,
        "recurrence_pattern": data.recurrence_pattern,
        "recurrence_interval": data.recurrence_interval,
        "usage_count": 0,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_task_templates.insert_one(template_doc)
    await log_activity("template", template_id, data.name, "created", user["id"])
    
    if "_id" in template_doc:
        del template_doc["_id"]
    
    # Enrich response
    template_doc["project_name"] = "Global" if not data.project_id else (await db.pm_projects.find_one({"id": data.project_id}, {"name": 1})).get("name")
    template_doc["default_assignee_name"] = await get_user_name(data.default_assignee) if data.default_assignee else None
    template_doc["created_by_name"] = user.get("name")
    template_doc["default_label_names"] = []
    if data.default_labels:
        labels = await db.pm_labels.find({"id": {"$in": data.default_labels}}, {"_id": 0, "id": 1, "name": 1, "color": 1}).to_list(50)
        template_doc["default_label_names"] = labels
    
    return template_doc


@router.get("/templates/{template_id}", response_model=TaskTemplateResponse)
async def get_template(
    template_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get a single task template"""
    template = await db.pm_task_templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Enrich
    if template.get("project_id"):
        project = await db.pm_projects.find_one({"id": template["project_id"]}, {"name": 1})
        template["project_name"] = project.get("name") if project else None
    else:
        template["project_name"] = "Global"
    
    if template.get("default_assignee"):
        template["default_assignee_name"] = await get_user_name(template["default_assignee"])
    
    if template.get("created_by"):
        template["created_by_name"] = await get_user_name(template["created_by"])
    
    label_ids = template.get("default_labels", [])
    if label_ids:
        labels = await db.pm_labels.find({"id": {"$in": label_ids}}, {"_id": 0, "id": 1, "name": 1, "color": 1}).to_list(50)
        template["default_label_names"] = labels
    else:
        template["default_label_names"] = []
    
    return template


@router.put("/templates/{template_id}", response_model=TaskTemplateResponse)
async def update_template(
    template_id: str,
    data: TaskTemplateUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a task template"""
    template = await db.pm_task_templates.find_one({"id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if k == "default_priority":
                update_data[k] = v.value
            elif k == "checklist_items":
                update_data[k] = [item if isinstance(item, dict) else item.model_dump() for item in v]
            else:
                update_data[k] = v
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pm_task_templates.update_one({"id": template_id}, {"$set": update_data})
    await log_activity("template", template_id, template.get("name"), "updated", user["id"])
    
    return await get_template(template_id, user)


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a task template"""
    template = await db.pm_task_templates.find_one({"id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await db.pm_task_templates.delete_one({"id": template_id})
    await log_activity("template", template_id, template.get("name"), "deleted", user["id"])
    
    return {"message": "Template deleted"}


@router.post("/templates/{template_id}/create-task", response_model=TaskResponse)
async def create_task_from_template(
    template_id: str,
    project_id: str,
    task_name: Optional[str] = None,
    due_date: Optional[str] = None,
    assigned_to: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new task from a template"""
    template = await db.pm_task_templates.find_one({"id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Verify project
    project = await db.pm_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Create task from template
    task_doc = {
        "id": task_id,
        "name": task_name or template.get("name"),
        "project_id": project_id,
        "description": template.get("description"),
        "assigned_to": assigned_to or template.get("default_assignee"),
        "assigned_by": user["id"] if (assigned_to or template.get("default_assignee")) else None,
        "priority": template.get("default_priority", "medium"),
        "status": TaskStatus.DRAFT.value if not (assigned_to or template.get("default_assignee")) else TaskStatus.ASSIGNED.value,
        "due_date": due_date,
        "estimated_hours": template.get("estimated_hours"),
        "tags": template.get("default_tags", []),
        "label_ids": template.get("default_labels", []),
        "is_recurring": template.get("is_recurring", False),
        "recurrence_pattern": template.get("recurrence_pattern"),
        "recurrence_interval": template.get("recurrence_interval", 1),
        "blocked_by": [],
        "blocks": [],
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_tasks.insert_one(task_doc)
    
    # Create checklist items from template
    checklist_items = template.get("checklist_items", [])
    for item in checklist_items:
        checklist_id = str(uuid.uuid4())
        checklist_doc = {
            "id": checklist_id,
            "task_id": task_id,
            "text": item.get("text"),
            "is_completed": False,
            "assigned_to": item.get("assigned_to"),
            "completed_by": None,
            "completed_at": None,
            "created_at": now
        }
        await db.pm_checklists.insert_one(checklist_doc)
    
    # Increment template usage count
    await db.pm_task_templates.update_one(
        {"id": template_id},
        {"$inc": {"usage_count": 1}}
    )
    
    await log_activity("task", task_id, task_doc["name"], "created_from_template", user["id"], {"template_id": template_id})
    
    if "_id" in task_doc:
        del task_doc["_id"]
    
    return await enrich_task(task_doc)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get a single project with full details"""
    project = await db.pm_projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Ensure project_id exists (backward compatibility)
    if not project.get("project_id"):
        project["project_id"] = f"PRJ-{project['id'][:4].upper()}"
    
    # Get department name
    if project.get("department_id"):
        project["department_name"] = await get_department_name(project["department_id"])
    
    # Get project manager name
    if project.get("project_manager_id"):
        project["project_manager_name"] = await get_user_name(project["project_manager_id"])
    
    # Enrich
    if project.get("module_id"):
        module = await db.pm_modules.find_one({"id": project["module_id"]}, {"name": 1})
        project["module_name"] = module.get("name") if module else None
    
    if project.get("owner_id"):
        project["owner_name"] = await get_user_name(project["owner_id"])
    
    team_members = project.get("team_members", [])
    project["team_member_names"] = []
    for member_id in team_members:
        name = await get_user_name(member_id)
        if name:
            project["team_member_names"].append(name)
    
    stakeholders = project.get("stakeholders", [])
    project["stakeholder_names"] = []
    for stakeholder_id in stakeholders:
        name = await get_user_name(stakeholder_id)
        if name:
            project["stakeholder_names"].append(name)
    
    total_tasks = await db.pm_tasks.count_documents({"project_id": project_id})
    completed_tasks = await db.pm_tasks.count_documents({"project_id": project_id, "status": "completed"})
    project["task_count"] = total_tasks
    project["completed_task_count"] = completed_tasks
    project["progress"] = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0
    
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a project"""
    project = await db.pm_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if isinstance(v, Priority) or isinstance(v, ProjectStatus):
                update_data[k] = v.value
            else:
                update_data[k] = v
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pm_projects.update_one({"id": project_id}, {"$set": update_data})
    await log_activity("project", project_id, project.get("name"), "updated", user["id"], update_data)
    
    return await get_project(project_id, user)


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a project and all its tasks"""
    project = await db.pm_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete all related data
    task_ids = [t["id"] async for t in db.pm_tasks.find({"project_id": project_id}, {"id": 1})]
    
    for task_id in task_ids:
        await db.pm_subtasks.delete_many({"parent_task_id": task_id})
        await db.pm_checklists.delete_many({"task_id": task_id})
        await db.pm_comments.delete_many({"task_id": task_id})
        await db.pm_time_logs.delete_many({"task_id": task_id})
    
    await db.pm_tasks.delete_many({"project_id": project_id})
    await db.pm_projects.delete_one({"id": project_id})
    await log_activity("project", project_id, project.get("name"), "deleted", user["id"])
    
    return {"message": "Project and all related data deleted"}


@router.post("/{project_id}/members/{member_id}")
async def add_project_member(
    project_id: str,
    member_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Add a team member to a project"""
    project = await db.pm_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if member exists
    member = await db.users.find_one({"id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Add member if not already in team
    team_members = project.get("team_members", [])
    if member_id not in team_members:
        team_members.append(member_id)
        await db.pm_projects.update_one(
            {"id": project_id},
            {"$set": {"team_members": team_members, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        await log_activity("project", project_id, project.get("name"), "member_added", user["id"], {"member_id": member_id})
    
    return {"message": "Member added to project"}


@router.delete("/{project_id}/members/{member_id}")
async def remove_project_member(
    project_id: str,
    member_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Remove a team member from a project"""
    project = await db.pm_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    team_members = project.get("team_members", [])
    if member_id in team_members:
        team_members.remove(member_id)
        await db.pm_projects.update_one(
            {"id": project_id},
            {"$set": {"team_members": team_members, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        await log_activity("project", project_id, project.get("name"), "member_removed", user["id"], {"member_id": member_id})
    
    return {"message": "Member removed from project"}


# ============== TASKS ==============

@router.get("/tasks/all", response_model=List[TaskResponse])
async def list_all_tasks(
    project_id: Optional[str] = None,
    status: Optional[TaskStatus] = None,
    assigned_to: Optional[str] = None,
    priority: Optional[Priority] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """List all tasks with filters"""
    query = {"parent_task_id": None}  # Only top-level tasks
    
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status.value
    if assigned_to:
        query["assigned_to"] = assigned_to
    if priority:
        query["priority"] = priority.value
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    tasks = await db.pm_tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich tasks
    enriched_tasks = []
    for task in tasks:
        enriched_tasks.append(await enrich_task(task))
    
    return enriched_tasks


@router.get("/{project_id}/tasks", response_model=List[TaskResponse])
async def list_project_tasks(
    project_id: str,
    status: Optional[TaskStatus] = None,
    assigned_to: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """List all tasks for a project"""
    # Verify project exists
    project = await db.pm_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    query = {"project_id": project_id, "parent_task_id": None}
    if status:
        query["status"] = status.value
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    tasks = await db.pm_tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    enriched_tasks = []
    for task in tasks:
        enriched_tasks.append(await enrich_task(task))
    
    return enriched_tasks


@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    data: TaskCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new task"""
    # Verify project exists
    project = await db.pm_projects.find_one({"id": data.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # If parent_task_id provided, verify it exists
    if data.parent_task_id:
        parent = await db.pm_tasks.find_one({"id": data.parent_task_id})
        if not parent:
            raise HTTPException(status_code=404, detail="Parent task not found")
    
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    task_doc = {
        "id": task_id,
        "name": data.name,
        "project_id": data.project_id,
        "description": data.description,
        "assigned_to": data.assigned_to,
        "assigned_by": user["id"] if data.assigned_to else None,
        "priority": data.priority.value,
        "status": TaskStatus.DRAFT.value if not data.assigned_to else TaskStatus.ASSIGNED.value,
        "due_date": data.due_date,
        "estimated_hours": data.estimated_hours,
        "actual_hours": 0,
        "tags": data.tags,
        "parent_task_id": data.parent_task_id,
        "blocked_by": data.blocked_by,
        "blocks": data.blocks,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_tasks.insert_one(task_doc)
    
    # Update reverse relationships for blocks
    for blocked_task_id in data.blocks:
        await db.pm_tasks.update_one(
            {"id": blocked_task_id},
            {"$addToSet": {"blocked_by": task_id}}
        )
    
    # Update reverse relationships for blocked_by
    for blocking_task_id in data.blocked_by:
        await db.pm_tasks.update_one(
            {"id": blocking_task_id},
            {"$addToSet": {"blocks": task_id}}
        )
    
    await log_activity("task", task_id, data.name, "created", user["id"])
    
    if "_id" in task_doc:
        del task_doc["_id"]
    
    return await enrich_task(task_doc)


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get a single task with full details"""
    task = await db.pm_tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return await enrich_task(task)


@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a task"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if isinstance(v, Priority) or isinstance(v, TaskStatus):
                update_data[k] = v.value
            else:
                update_data[k] = v
    
    # Track status changes
    old_status = task.get("status")
    new_status = update_data.get("status")
    
    # Check if task is blocked before allowing status change to in_progress or beyond
    if new_status and new_status not in [TaskStatus.DRAFT.value, TaskStatus.ASSIGNED.value, TaskStatus.ON_HOLD.value]:
        blocked_by = task.get("blocked_by", [])
        for blocking_id in blocked_by:
            blocking_task = await db.pm_tasks.find_one({"id": blocking_id}, {"status": 1, "name": 1})
            if blocking_task and blocking_task.get("status") not in ["completed", "approved"]:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot move task: blocked by '{blocking_task.get('name')}' which is not completed"
                )
    
    # If assigning to someone, update assigned_by
    if "assigned_to" in update_data and update_data["assigned_to"] != task.get("assigned_to"):
        update_data["assigned_by"] = user["id"]
        if not new_status and old_status == TaskStatus.DRAFT.value:
            update_data["status"] = TaskStatus.ASSIGNED.value
    
    # Handle blocked_by updates
    if "blocked_by" in update_data:
        old_blocked_by = set(task.get("blocked_by", []))
        new_blocked_by = set(update_data["blocked_by"])
        
        # Remove this task from "blocks" of tasks no longer blocking
        for removed_id in old_blocked_by - new_blocked_by:
            await db.pm_tasks.update_one(
                {"id": removed_id},
                {"$pull": {"blocks": task_id}}
            )
        
        # Add this task to "blocks" of new blocking tasks
        for added_id in new_blocked_by - old_blocked_by:
            await db.pm_tasks.update_one(
                {"id": added_id},
                {"$addToSet": {"blocks": task_id}}
            )
    
    # Handle blocks updates
    if "blocks" in update_data:
        old_blocks = set(task.get("blocks", []))
        new_blocks = set(update_data["blocks"])
        
        # Remove this task from "blocked_by" of tasks no longer blocked
        for removed_id in old_blocks - new_blocks:
            await db.pm_tasks.update_one(
                {"id": removed_id},
                {"$pull": {"blocked_by": task_id}}
            )
        
        # Add this task to "blocked_by" of new blocked tasks
        for added_id in new_blocks - old_blocks:
            await db.pm_tasks.update_one(
                {"id": added_id},
                {"$addToSet": {"blocked_by": task_id}}
            )
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pm_tasks.update_one({"id": task_id}, {"$set": update_data})
    
    # Log status change specifically
    if new_status and new_status != old_status:
        await log_activity("task", task_id, task.get("name"), "status_changed", user["id"], 
                          {"from": old_status, "to": new_status})
        
        # Handle recurring task - create next instance when completed
        if new_status in ["completed", "approved"] and task.get("is_recurring"):
            await create_next_recurring_task(task, user["id"])
    else:
        await log_activity("task", task_id, task.get("name"), "updated", user["id"], update_data)
    
    updated = await db.pm_tasks.find_one({"id": task_id}, {"_id": 0})
    return await enrich_task(updated)


async def create_next_recurring_task(task: dict, user_id: str):
    """Create the next instance of a recurring task"""
    pattern = task.get("recurrence_pattern")
    interval = task.get("recurrence_interval", 1)
    end_date = task.get("recurrence_end_date")
    current_due = task.get("due_date")
    
    if not pattern or not current_due:
        return
    
    # Check if we've passed the end date
    if end_date and datetime.fromisoformat(end_date.replace('Z', '+00:00')) < datetime.now(timezone.utc):
        return
    
    # Calculate next due date
    current = datetime.fromisoformat(current_due.replace('Z', '+00:00'))
    
    if pattern == "daily":
        next_due = current + timedelta(days=interval)
    elif pattern == "weekly":
        next_due = current + timedelta(weeks=interval)
    elif pattern == "monthly":
        next_due = current + relativedelta(months=interval)
    elif pattern == "yearly":
        next_due = current + relativedelta(years=interval)
    else:
        return
    
    # Check if next due date is past end date
    if end_date and next_due > datetime.fromisoformat(end_date.replace('Z', '+00:00')):
        return
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create new task
    new_task = {
        "id": str(uuid.uuid4()),
        "name": task.get("name"),
        "project_id": task.get("project_id"),
        "module_id": task.get("module_id"),
        "description": task.get("description"),
        "assigned_to": task.get("assigned_to"),
        "priority": task.get("priority"),
        "status": "draft",
        "due_date": next_due.isoformat(),
        "estimated_hours": task.get("estimated_hours"),
        "tags": task.get("tags", []),
        "label_ids": task.get("label_ids", []),
        "is_recurring": True,
        "recurrence_pattern": pattern,
        "recurrence_interval": interval,
        "recurrence_days": task.get("recurrence_days"),
        "recurrence_end_date": end_date,
        "parent_recurring_id": task.get("parent_recurring_id") or task.get("id"),
        "created_by": user_id,
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_tasks.insert_one(new_task)
    await log_activity("task", new_task["id"], new_task["name"], "created", user_id, {"recurring": True})


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a task and all its subtasks, checklists, comments"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Delete related data
    await db.pm_subtasks.delete_many({"parent_task_id": task_id})
    await db.pm_checklists.delete_many({"task_id": task_id})
    await db.pm_comments.delete_many({"task_id": task_id})
    await db.pm_time_logs.delete_many({"task_id": task_id})
    await db.pm_tasks.delete_one({"id": task_id})
    
    await log_activity("task", task_id, task.get("name"), "deleted", user["id"])
    
    return {"message": "Task and all related data deleted"}


# ============== SUBTASKS ==============

@router.get("/tasks/{task_id}/subtasks", response_model=List[SubtaskResponse])
async def list_subtasks(
    task_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """List all subtasks for a task"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    subtasks = await db.pm_subtasks.find({"parent_task_id": task_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    
    for subtask in subtasks:
        if subtask.get("assigned_to"):
            subtask["assigned_to_name"] = await get_user_name(subtask["assigned_to"])
    
    return subtasks


@router.post("/subtasks", response_model=SubtaskResponse)
async def create_subtask(
    data: SubtaskCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new subtask"""
    task = await db.pm_tasks.find_one({"id": data.parent_task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Parent task not found")
    
    subtask_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    subtask_doc = {
        "id": subtask_id,
        "name": data.name,
        "parent_task_id": data.parent_task_id,
        "assigned_to": data.assigned_to,
        "status": TaskStatus.DRAFT.value,
        "due_date": data.due_date,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_subtasks.insert_one(subtask_doc)
    await log_activity("subtask", subtask_id, data.name, "created", user["id"], {"parent_task_id": data.parent_task_id})
    
    if "_id" in subtask_doc:
        del subtask_doc["_id"]
    
    if subtask_doc.get("assigned_to"):
        subtask_doc["assigned_to_name"] = await get_user_name(subtask_doc["assigned_to"])
    
    return subtask_doc


@router.put("/subtasks/{subtask_id}", response_model=SubtaskResponse)
async def update_subtask(
    subtask_id: str,
    data: SubtaskUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a subtask"""
    subtask = await db.pm_subtasks.find_one({"id": subtask_id})
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if isinstance(v, TaskStatus):
                update_data[k] = v.value
            else:
                update_data[k] = v
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pm_subtasks.update_one({"id": subtask_id}, {"$set": update_data})
    await log_activity("subtask", subtask_id, subtask.get("name"), "updated", user["id"], update_data)
    
    updated = await db.pm_subtasks.find_one({"id": subtask_id}, {"_id": 0})
    if updated.get("assigned_to"):
        updated["assigned_to_name"] = await get_user_name(updated["assigned_to"])
    
    return updated


@router.delete("/subtasks/{subtask_id}")
async def delete_subtask(
    subtask_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a subtask"""
    subtask = await db.pm_subtasks.find_one({"id": subtask_id})
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    await db.pm_subtasks.delete_one({"id": subtask_id})
    await log_activity("subtask", subtask_id, subtask.get("name"), "deleted", user["id"])
    
    return {"message": "Subtask deleted"}


# ============== CHECKLISTS ==============

@router.get("/tasks/{task_id}/checklists", response_model=List[ChecklistItemResponse])
async def list_checklists(
    task_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """List all checklist items for a task"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    checklists = await db.pm_checklists.find({"task_id": task_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    
    for item in checklists:
        if item.get("assigned_to"):
            item["assigned_to_name"] = await get_user_name(item["assigned_to"])
    
    return checklists


@router.post("/checklists", response_model=ChecklistItemResponse)
async def create_checklist_item(
    data: ChecklistItemCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new checklist item"""
    task = await db.pm_tasks.find_one({"id": data.task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    item_doc = {
        "id": item_id,
        "task_id": data.task_id,
        "text": data.text,
        "is_completed": False,
        "assigned_to": data.assigned_to,
        "completed_by": None,
        "completed_at": None,
        "created_at": now
    }
    
    await db.pm_checklists.insert_one(item_doc)
    
    if "_id" in item_doc:
        del item_doc["_id"]
    
    if item_doc.get("assigned_to"):
        item_doc["assigned_to_name"] = await get_user_name(item_doc["assigned_to"])
    
    return item_doc


@router.put("/checklists/{item_id}", response_model=ChecklistItemResponse)
async def update_checklist_item(
    item_id: str,
    data: ChecklistItemUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a checklist item"""
    item = await db.pm_checklists.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Track completion
    if "is_completed" in update_data:
        if update_data["is_completed"] and not item.get("is_completed"):
            update_data["completed_by"] = user["id"]
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        elif not update_data["is_completed"]:
            update_data["completed_by"] = None
            update_data["completed_at"] = None
    
    await db.pm_checklists.update_one({"id": item_id}, {"$set": update_data})
    
    updated = await db.pm_checklists.find_one({"id": item_id}, {"_id": 0})
    if updated.get("assigned_to"):
        updated["assigned_to_name"] = await get_user_name(updated["assigned_to"])
    
    return updated


@router.delete("/checklists/{item_id}")
async def delete_checklist_item(
    item_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a checklist item"""
    item = await db.pm_checklists.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    
    await db.pm_checklists.delete_one({"id": item_id})
    return {"message": "Checklist item deleted"}


# ============== COMMENTS ==============

@router.get("/tasks/{task_id}/comments", response_model=List[TaskCommentResponse])
async def list_comments(
    task_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """List all comments for a task"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    comments = await db.pm_comments.find({"task_id": task_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    
    for comment in comments:
        comment["author_name"] = await get_user_name(comment["author_id"])
    
    return comments


@router.post("/comments", response_model=TaskCommentResponse)
async def create_comment(
    data: TaskCommentCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new comment on a task"""
    task = await db.pm_tasks.find_one({"id": data.task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    comment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    comment_doc = {
        "id": comment_id,
        "task_id": data.task_id,
        "content": data.content,
        "mentions": data.mentions,
        "author_id": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_comments.insert_one(comment_doc)
    await log_activity("task", data.task_id, task.get("name"), "commented", user["id"], {"comment_id": comment_id})
    
    if "_id" in comment_doc:
        del comment_doc["_id"]
    
    comment_doc["author_name"] = user.get("name")
    
    return comment_doc


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a comment (only author can delete)"""
    comment = await db.pm_comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Only author or admin can delete
    if comment["author_id"] != user["id"] and user.get("role_level", 0) < 80:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    await db.pm_comments.delete_one({"id": comment_id})
    return {"message": "Comment deleted"}


# ============== TIME LOGS ==============

@router.get("/tasks/{task_id}/time-logs", response_model=List[TimeLogResponse])
async def list_time_logs(
    task_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """List all time logs for a task"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    logs = await db.pm_time_logs.find({"task_id": task_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    for log in logs:
        log["user_name"] = await get_user_name(log["user_id"])
        log["task_name"] = task.get("name")
    
    return logs


@router.post("/time-logs", response_model=TimeLogResponse)
async def create_time_log(
    data: TimeLogCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Log time spent on a task"""
    task = await db.pm_tasks.find_one({"id": data.task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    log_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate hours if start and end time provided
    hours = data.hours or 0
    if data.start_time and data.end_time and not data.hours:
        try:
            start = datetime.fromisoformat(data.start_time.replace('Z', '+00:00'))
            end = datetime.fromisoformat(data.end_time.replace('Z', '+00:00'))
            hours = (end - start).total_seconds() / 3600
        except:
            pass
    
    log_doc = {
        "id": log_id,
        "task_id": data.task_id,
        "user_id": user["id"],
        "description": data.description,
        "hours": round(hours, 2),
        "start_time": data.start_time,
        "end_time": data.end_time,
        "created_at": now
    }
    
    await db.pm_time_logs.insert_one(log_doc)
    
    # Update task's actual hours
    total_hours = task.get("actual_hours", 0) + hours
    await db.pm_tasks.update_one({"id": data.task_id}, {"$set": {"actual_hours": round(total_hours, 2)}})
    
    if "_id" in log_doc:
        del log_doc["_id"]
    
    log_doc["user_name"] = user.get("name")
    log_doc["task_name"] = task.get("name")
    
    return log_doc


# ============== ATTACHMENT ROUTES ==============

@router.get("/tasks/{task_id}/attachments", response_model=List[AttachmentResponse])
async def list_attachments(
    task_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """List all attachments for a task"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    attachments = await db.pm_attachments.find(
        {"task_id": task_id, "is_deleted": False}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for att in attachments:
        att["uploaded_by_name"] = await get_user_name(att.get("uploaded_by"))
    
    return attachments


@router.post("/tasks/{task_id}/attachments", response_model=AttachmentResponse)
async def upload_attachment(
    task_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user_dep)
):
    """Upload an attachment to a task"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Validate file size (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    # Generate unique ID and storage path
    attachment_id = str(uuid.uuid4())
    content_type = file.content_type or get_mime_type(file.filename)
    storage_path = generate_storage_path(user["id"], file.filename, attachment_id)
    
    try:
        # Upload to storage
        result = put_object(storage_path, content, content_type)
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Store reference in database
        attachment_doc = {
            "id": attachment_id,
            "task_id": task_id,
            "original_filename": file.filename,
            "storage_path": result["path"],
            "content_type": content_type,
            "size": result.get("size", len(content)),
            "uploaded_by": user["id"],
            "is_deleted": False,
            "created_at": now
        }
        
        await db.pm_attachments.insert_one(attachment_doc)
        
        # Log activity
        await log_activity("task", task_id, task.get("name"), "attachment_added", user["id"], {
            "filename": file.filename
        })
        
        if "_id" in attachment_doc:
            del attachment_doc["_id"]
        
        attachment_doc["uploaded_by_name"] = user.get("name")
        
        return attachment_doc
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.get("/attachments/{attachment_id}/download")
async def download_attachment(
    attachment_id: str,
    authorization: str = Header(None),
    auth: str = Query(None),
    user: dict = Depends(get_current_user_dep)
):
    """Download an attachment"""
    attachment = await db.pm_attachments.find_one({
        "id": attachment_id,
        "is_deleted": False
    }, {"_id": 0})
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    try:
        content, content_type = get_object(attachment["storage_path"])
        
        return Response(
            content=content,
            media_type=attachment.get("content_type", content_type),
            headers={
                "Content-Disposition": f'attachment; filename="{attachment["original_filename"]}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")


@router.delete("/attachments/{attachment_id}")
async def delete_attachment(
    attachment_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Soft delete an attachment"""
    attachment = await db.pm_attachments.find_one({
        "id": attachment_id,
        "is_deleted": False
    })
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Soft delete (storage doesn't support delete)
    await db.pm_attachments.update_one(
        {"id": attachment_id},
        {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Get task for activity log
    task = await db.pm_tasks.find_one({"id": attachment["task_id"]})
    
    await log_activity("task", attachment["task_id"], task.get("name") if task else None, "attachment_removed", user["id"], {
        "filename": attachment["original_filename"]
    })
    
    return {"message": "Attachment deleted"}


# ============== LABEL ROUTES ==============

@router.get("/labels", response_model=List[LabelResponse])
async def list_labels(
    project_id: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """List all labels, optionally filtered by project"""
    query = {}
    if project_id:
        query["$or"] = [{"project_id": project_id}, {"project_id": None}]
    
    labels = await db.pm_labels.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    return labels


@router.post("/labels", response_model=LabelResponse)
async def create_label(
    label: LabelCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new label"""
    now = datetime.now(timezone.utc).isoformat()
    
    label_doc = {
        "id": str(uuid.uuid4()),
        "name": label.name,
        "color": label.color,
        "project_id": label.project_id,
        "created_by": user["id"],
        "created_at": now
    }
    
    await db.pm_labels.insert_one(label_doc)
    
    if "_id" in label_doc:
        del label_doc["_id"]
    
    return label_doc


@router.put("/labels/{label_id}", response_model=LabelResponse)
async def update_label(
    label_id: str,
    label: LabelUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a label"""
    existing = await db.pm_labels.find_one({"id": label_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Label not found")
    
    update_data = {k: v for k, v in label.dict().items() if v is not None}
    
    if update_data:
        await db.pm_labels.update_one({"id": label_id}, {"$set": update_data})
    
    updated = await db.pm_labels.find_one({"id": label_id}, {"_id": 0})
    return updated


@router.delete("/labels/{label_id}")
async def delete_label(
    label_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a label and remove it from all tasks"""
    existing = await db.pm_labels.find_one({"id": label_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Label not found")
    
    # Remove label from all tasks
    await db.pm_tasks.update_many(
        {"label_ids": label_id},
        {"$pull": {"label_ids": label_id}}
    )
    
    # Delete the label
    await db.pm_labels.delete_one({"id": label_id})
    
    return {"message": "Label deleted"}


@router.post("/tasks/{task_id}/labels/{label_id}")
async def add_label_to_task(
    task_id: str,
    label_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Add a label to a task"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    label = await db.pm_labels.find_one({"id": label_id})
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    
    # Add label if not already present
    await db.pm_tasks.update_one(
        {"id": task_id},
        {"$addToSet": {"label_ids": label_id}}
    )
    
    return {"message": "Label added to task"}


@router.delete("/tasks/{task_id}/labels/{label_id}")
async def remove_label_from_task(
    task_id: str,
    label_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Remove a label from a task"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.pm_tasks.update_one(
        {"id": task_id},
        {"$pull": {"label_ids": label_id}}
    )
    
    return {"message": "Label removed from task"}
