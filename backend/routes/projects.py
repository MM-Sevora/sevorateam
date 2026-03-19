"""
Project Management System API Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Header, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import os
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
import uuid
import logging
from bson import ObjectId

logger = logging.getLogger(__name__)

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
    TaskTemplateCreate, TaskTemplateUpdate, TaskTemplateResponse,
    RecurringTaskTemplateCreate, RecurringTaskTemplateUpdate, RecurringTaskTemplateResponse,
    RecurrenceType, RecurrenceEndType, MonthlyRepeatType, GeneratedTaskInfo,
    # New models
    MilestoneCreate, MilestoneUpdate, MilestoneResponse, MilestoneStatus,
    SprintCreate, SprintUpdate, SprintResponse, SprintStatus,
    TaskWatcherCreate, TaskWatcherResponse,
    BulkTaskUpdate, BulkTaskDelete, BulkOperationResult,
    TaskDuplicateRequest, KanbanColumn, KanbanBoardResponse,
    # Release/Version models
    ReleaseCreate, ReleaseUpdate, ReleaseResponse, ReleaseStatus
)

# Import storage utilities
from utils.storage import init_storage, put_object, get_object, get_mime_type, generate_storage_path

# Import notification helpers
from routes.notifications import (
    create_notification, NotificationType, NotificationCategory, NotificationPriority
)

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
        except Exception:
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


async def recalculate_objective_progress(objective_id: str):
    """Recalculate objective progress based on linked projects"""
    if not objective_id:
        return
    
    try:
        from bson import ObjectId as BsonObjectId
        
        # Get all projects linked to this objective
        linked_projects = await db.pm_projects.find(
            {"linked_objective_id": objective_id}
        ).to_list(100)
        
        if not linked_projects:
            return
        
        # Calculate average progress
        total_progress = 0
        for project in linked_projects:
            project_id = project.get("id")
            total_tasks = await db.pm_tasks.count_documents({"project_id": project_id})
            completed_tasks = await db.pm_tasks.count_documents({"project_id": project_id, "status": "completed"})
            project_progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
            total_progress += project_progress
        
        avg_progress = total_progress / len(linked_projects) if linked_projects else 0
        
        # Update objective progress
        await db.objectives.update_one(
            {"_id": BsonObjectId(objective_id)},
            {"$set": {"progress": round(avg_progress, 1), "updated_at": datetime.now(timezone.utc)}}
        )
        
        logger.info(f"Updated objective {objective_id} progress to {avg_progress:.1f}%")
    except Exception as e:
        logger.error(f"Failed to recalculate objective progress: {e}")


async def get_or_create_personal_project(user_id: str, user_name: str) -> dict:
    """Get or create a personal project for a user"""
    # Check if personal project exists
    personal_project = await db.pm_projects.find_one({
        "owner_id": user_id,
        "is_personal": True
    }, {"_id": 0})
    
    if personal_project:
        return personal_project
    
    # Create personal project
    now = datetime.now(timezone.utc).isoformat()
    project_id = await generate_project_id()
    
    # Get or create a default module for personal projects
    personal_module = await db.pm_modules.find_one({"name": "Personal"}, {"_id": 0})
    if not personal_module:
        personal_module = {
            "id": str(uuid.uuid4()),
            "name": "Personal",
            "description": "Personal tasks and projects",
            "color": "#6366F1",
            "icon": "User",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        await db.pm_modules.insert_one(personal_module)
    
    personal_project = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "name": "My Tasks",
        "module_id": personal_module["id"],
        "project_type": "other",
        "description": f"Personal tasks and day-to-day work for {user_name}",
        "owner_id": user_id,
        "project_manager_id": user_id,
        "start_date": now[:10],
        "priority": "medium",
        "status": "active",
        "is_personal": True,  # Flag to identify personal projects
        "team_members": [user_id],
        "stakeholders": [],
        "tags": ["personal"],
        "created_by": user_id,
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_projects.insert_one(personal_project)
    logger.info(f"Created personal project for user {user_id}")
    
    if "_id" in personal_project:
        del personal_project["_id"]
    
    return personal_project


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
        task["is_individual"] = False
    else:
        # Individual task (not linked to any project)
        task["is_individual"] = True
        task["project_name"] = None
        task["module_name"] = None
    
    # Get sprint info
    if task.get("sprint_id"):
        sprint = await db.pm_sprints.find_one({"id": task["sprint_id"]}, {"name": 1})
        task["sprint_name"] = sprint.get("name") if sprint else None
    else:
        task["sprint_name"] = None
    
    # Get milestone info
    if task.get("milestone_id"):
        milestone = await db.pm_milestones.find_one({"id": task["milestone_id"]}, {"name": 1})
        task["milestone_name"] = milestone.get("name") if milestone else None
    else:
        task["milestone_name"] = None
    
    # Get release info
    if task.get("release_id"):
        release = await db.pm_releases.find_one({"id": task["release_id"]}, {"name": 1})
        task["release_name"] = release.get("name") if release else None
    else:
        task["release_name"] = None
    
    # Get watchers count
    watchers = task.get("watchers", [])
    task["watchers"] = watchers
    task["watcher_count"] = len(watchers)
    
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
    
    # Ensure external_links is present
    task["external_links"] = task.get("external_links", [])
    
    # Ensure story_points is present
    task["story_points"] = task.get("story_points")
    
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

@router.get("/personal", response_model=ProjectResponse)
async def get_personal_project(
    user: dict = Depends(get_current_user_dep)
):
    """Get or create the user's personal project for standalone tasks"""
    personal_project = await get_or_create_personal_project(user["id"], user.get("name", "User"))
    
    # Enrich with names
    personal_project["owner_name"] = user.get("name")
    personal_project["project_manager_name"] = user.get("name")
    
    # Get module name
    module = await db.pm_modules.find_one({"id": personal_project.get("module_id")}, {"name": 1})
    personal_project["module_name"] = module.get("name") if module else "Personal"
    
    # Get task counts
    task_count = await db.pm_tasks.count_documents({"project_id": personal_project["id"]})
    completed_count = await db.pm_tasks.count_documents({
        "project_id": personal_project["id"],
        "status": "completed"
    })
    
    personal_project["task_count"] = task_count
    personal_project["completed_task_count"] = completed_count
    personal_project["progress"] = (completed_count / task_count * 100) if task_count > 0 else 0
    personal_project["team_member_names"] = [user.get("name")]
    personal_project["stakeholder_names"] = []
    
    return personal_project


@router.get("/list")
async def list_projects(
    module_id: Optional[str] = None,
    department_id: Optional[str] = None,
    project_type: Optional[ProjectType] = None,
    status: Optional[ProjectStatus] = None,
    owner_id: Optional[str] = None,
    priority: Optional[Priority] = None,
    visibility: Optional[str] = None,
    linked_objective_id: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """List all projects with filters, respecting visibility settings and data_scope permissions"""
    from utils.permissions import apply_data_scope_filter
    
    user_id = user["id"]
    
    # Build base query
    filter_query = {}
    
    if module_id:
        filter_query["module_id"] = module_id
    if department_id:
        filter_query["department_id"] = department_id
    if project_type:
        filter_query["project_type"] = project_type.value
    if status:
        filter_query["status"] = status.value
    if owner_id:
        filter_query["owner_id"] = owner_id
    if priority:
        filter_query["priority"] = priority.value
    if visibility:
        filter_query["visibility"] = visibility
    if linked_objective_id:
        filter_query["linked_objective_id"] = linked_objective_id
    if search:
        filter_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"project_id": {"$regex": search, "$options": "i"}}
        ]
    
    # Get user role level for access control
    user_role = user.get("role", "viewer")
    role_level = user.get("role_level", 10)
    is_admin = role_level >= 80 or user_role in ["super_admin", "admin"]
    
    # Apply data scope filtering based on user's permissions
    # Uses the "projects" category and "projects" module for permission lookup
    query = await apply_data_scope_filter(
        filter_query, 
        user_id, 
        "projects",  # category
        "projects",  # module
        user_field="owner_id",  # Projects use owner_id as the user field
        department_field="department_id"
    )
    
    projects = await db.pm_projects.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Filter projects based on visibility
    filtered_projects = []
    for project in projects:
        project_visibility = project.get("visibility", "public")
        team_members = project.get("team_members", [])
        owner_id_proj = project.get("owner_id")
        project_manager_id = project.get("project_manager_id")
        
        # Admins can see all projects
        if is_admin:
            filtered_projects.append(project)
            continue
        
        # Public projects are visible to all
        if project_visibility == "public":
            filtered_projects.append(project)
            continue
        
        # Private projects: check if user is owner, PM, or team member
        if (user_id == owner_id_proj or 
            user_id == project_manager_id or 
            user_id in team_members):
            filtered_projects.append(project)
            continue
        
        # Also check if user has tasks assigned in this project
        task_count = await db.pm_tasks.count_documents({
            "project_id": project["id"],
            "assigned_to": user_id
        })
        if task_count > 0:
            filtered_projects.append(project)
    
    # Enrich projects
    for project in filtered_projects:
        # Ensure visibility field exists
        if not project.get("visibility"):
            project["visibility"] = "public"
        
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
        
        # Get linked objective title
        project["linked_objective_id"] = project.get("linked_objective_id")
        project["linked_objective_title"] = None
        if project.get("linked_objective_id"):
            try:
                objective = await db.objectives.find_one({"_id": ObjectId(project["linked_objective_id"])})
                if objective:
                    project["linked_objective_title"] = objective.get("title")
            except Exception:
                pass
        
        # Add permissions for frontend
        # Rule: Edit = Own + PM + Team Member; Delete = Own only (+ Admin for both)
        is_owner = project.get("created_by") == user_id or project.get("owner_id") == user_id
        is_pm = project.get("project_manager_id") == user_id
        is_team_member = user_id in project.get("team_members", [])
        project["_permissions"] = {
            "can_view": True,
            "can_edit": is_owner or is_pm or is_team_member or is_admin,
            "can_delete": is_owner or is_admin,  # Only owner can delete
            "is_owner": is_owner,
            "is_pm": is_pm,
            "is_team_member": is_team_member,
        }
    
    return filtered_projects


@router.post("", response_model=ProjectResponse)
async def create_project(
    data: ProjectCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new project. Creator is automatically added to team members."""
    # Verify module exists only if module_id is provided (module is now optional)
    module = None
    if data.module_id:
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
    
    # Auto-add creator to team members (best practice)
    team_members = list(set([user["id"]] + data.team_members))
    
    project_doc = {
        "id": project_uuid,
        "project_id": project_id,
        "name": data.name,
        "module_id": data.module_id,
        "project_type": data.project_type.value if data.project_type else ProjectType.OTHER.value,
        "department_id": data.department_id,
        "description": data.description,
        "owner_id": data.owner_id or user["id"],
        "project_manager_id": data.project_manager_id,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "priority": data.priority.value,
        "status": ProjectStatus.DRAFT.value,
        "visibility": data.visibility,  # public or private
        "team_members": team_members,
        "stakeholders": data.stakeholders,
        "tags": data.tags,
        "linked_objective_id": data.linked_objective_id,  # Link to Goals & Objectives
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_projects.insert_one(project_doc)
    await log_activity("project", project_uuid, data.name, "created", user["id"])
    
    # Enrich response
    project_doc["module_name"] = module.get("name") if module else None
    project_doc["owner_name"] = await get_user_name(project_doc["owner_id"])
    project_doc["project_manager_name"] = await get_user_name(data.project_manager_id) if data.project_manager_id else None
    project_doc["department_name"] = await get_department_name(data.department_id) if data.department_id else None
    
    project_doc["team_member_names"] = []
    for member_id in team_members:
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
    project_doc["linked_objective_title"] = None
    
    # Get linked objective title if linked
    if data.linked_objective_id:
        objective = await db.objectives.find_one({"_id": ObjectId(data.linked_objective_id)})
        if objective:
            project_doc["linked_objective_title"] = objective.get("title")
    
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


@router.post("/my-tasks", response_model=TaskResponse)
async def create_personal_task(
    data: TaskCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a personal task (not linked to a project)"""
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user_id = user["id"]
    
    # Determine assignee
    assignee_id = data.assigned_to if data.assigned_to else user_id
    
    task_doc = {
        "id": task_id,
        "name": data.name,
        "description": data.description or "",
        "status": TaskStatus.ASSIGNED.value,
        "priority": data.priority.value if data.priority else Priority.MEDIUM.value,
        "project_id": None,  # No project - personal task
        "is_individual": True,
        "parent_task_id": data.parent_task_id,
        "assigned_to": assignee_id,
        "created_by": user_id,
        "due_date": data.due_date,
        "start_date": None,
        "estimated_hours": data.estimated_hours,
        "tags": data.tags or [],
        "attachments": [],
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_tasks.insert_one(task_doc)
    
    # If assigning to someone else, create notification
    if assignee_id != user_id:
        await create_notification(
            user_id=assignee_id,
            notification_type="task_assigned",
            title="New Task Assigned",
            message=f"You have been assigned a task: {data.name}",
            reference_id=task_id,
            reference_type="task",
            action_url=f"/projects/my-tasks?task={task_id}",
            metadata={
                "task_id": task_id,
                "task_name": data.name,
                "assigned_by": user["name"]
            }
        )
    
    return await enrich_task(task_doc)


@router.get("/individual-tasks", response_model=List[TaskResponse])
async def get_individual_tasks(
    status: Optional[TaskStatus] = None,
    priority: Optional[Priority] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get all individual tasks (not linked to any project) for current user"""
    user_id = user["id"]
    
    query = {
        "$or": [
            {"project_id": None},
            {"project_id": {"$exists": False}},
            {"is_individual": True}
        ],
        "assigned_to": user_id,
        "parent_task_id": None  # Only top-level tasks
    }
    
    if status:
        query["status"] = status.value
    if priority:
        query["priority"] = priority.value
    
    tasks = await db.pm_tasks.find(query, {"_id": 0}).sort("due_date", 1).to_list(100)
    
    enriched_tasks = [await enrich_task(t) for t in tasks]
    return enriched_tasks


@router.get("/assigned-by-me", response_model=List[TaskResponse])
async def get_tasks_assigned_by_me(
    status: Optional[TaskStatus] = None,
    priority: Optional[Priority] = None,
    include_completed: bool = False,
    user: dict = Depends(get_current_user_dep)
):
    """Get all tasks that current user has assigned to others"""
    user_id = user["id"]
    
    query = {
        "assigned_by": user_id,
        "assigned_to": {"$ne": user_id}  # Exclude self-assigned tasks
    }
    
    if not include_completed:
        query["status"] = {"$nin": [TaskStatus.COMPLETED.value, TaskStatus.APPROVED.value]}
    elif status:
        query["status"] = status.value
    
    if priority:
        query["priority"] = priority.value
    
    tasks = await db.pm_tasks.find(query, {"_id": 0}).sort("due_date", 1).to_list(100)
    
    enriched_tasks = [await enrich_task(t) for t in tasks]
    return enriched_tasks


# ============== TASK REMINDERS/FOLLOW-UPS ==============

class TaskReminderCreate(BaseModel):
    task_id: str
    remind_at: str  # ISO datetime
    message: Optional[str] = None

class TaskReminderResponse(BaseModel):
    id: str
    task_id: str
    task_name: Optional[str] = None
    user_id: str
    remind_at: str
    message: Optional[str] = None
    is_sent: bool = False
    created_at: str

@router.post("/reminders", response_model=TaskReminderResponse)
async def create_task_reminder(
    data: TaskReminderCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a reminder/follow-up for a task"""
    # Verify task exists
    task = await db.pm_tasks.find_one({"id": data.task_id}, {"_id": 0, "name": 1})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    reminder_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    reminder_doc = {
        "id": reminder_id,
        "task_id": data.task_id,
        "user_id": user["id"],
        "remind_at": data.remind_at,
        "message": data.message,
        "is_sent": False,
        "created_at": now
    }
    
    await db.task_reminders.insert_one(reminder_doc)
    
    reminder_doc["task_name"] = task.get("name")
    if "_id" in reminder_doc:
        del reminder_doc["_id"]
    
    return reminder_doc


@router.get("/reminders", response_model=List[TaskReminderResponse])
async def get_my_reminders(
    task_id: Optional[str] = None,
    include_sent: bool = False,
    user: dict = Depends(get_current_user_dep)
):
    """Get all reminders for current user"""
    query = {"user_id": user["id"]}
    
    if task_id:
        query["task_id"] = task_id
    
    if not include_sent:
        query["is_sent"] = False
    
    reminders = await db.task_reminders.find(query, {"_id": 0}).sort("remind_at", 1).to_list(100)
    
    # Enrich with task names
    for reminder in reminders:
        task = await db.pm_tasks.find_one({"id": reminder["task_id"]}, {"_id": 0, "name": 1})
        reminder["task_name"] = task.get("name") if task else None
    
    return reminders


@router.delete("/reminders/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a reminder"""
    result = await db.task_reminders.delete_one({
        "id": reminder_id,
        "user_id": user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return {"success": True}


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
    category: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """List task templates - global and/or project-specific, optionally filtered by category"""
    query = {}
    if project_id:
        # Get templates for this project + global templates
        query["$or"] = [{"project_id": project_id}, {"project_id": None}]
    
    if category:
        query["category"] = category
    
    templates = await db.pm_task_templates.find(query, {"_id": 0}).sort([("category", 1), ("name", 1)]).to_list(100)
    
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
        "category": data.category.value,
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
            elif k == "category":
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


# ============== RECURRING TASK TEMPLATES (Must be before /{project_id}) ==============
# Note: Full implementation is at the end of this file, but route registration must happen here

@router.get("/recurring-dashboard")
async def get_recurring_dashboard_route(
    user: dict = Depends(get_current_user_dep)
):
    """Get recurring tasks dashboard data - Forward to implementation"""
    return await _get_recurring_dashboard_impl(user)


@router.get("/recurring-templates", response_model=List[RecurringTaskTemplateResponse])
async def list_recurring_templates_route(
    project_id: Optional[str] = None,
    department_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    recurrence_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_paused: Optional[bool] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """List recurring task templates - Forward to implementation"""
    return await _list_recurring_templates_impl(
        project_id, department_id, assigned_to, recurrence_type, 
        is_active, is_paused, search, user
    )


@router.post("/recurring-templates", response_model=RecurringTaskTemplateResponse)
async def create_recurring_template_route(
    data: RecurringTaskTemplateCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a recurring task template - Forward to implementation"""
    return await _create_recurring_template_impl(data, user)


@router.get("/recurring-templates/{template_id}", response_model=RecurringTaskTemplateResponse)
async def get_recurring_template_route(
    template_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get a recurring task template - Forward to implementation"""
    return await _get_recurring_template_impl(template_id, user)


@router.put("/recurring-templates/{template_id}", response_model=RecurringTaskTemplateResponse)
async def update_recurring_template_route(
    template_id: str,
    data: RecurringTaskTemplateUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a recurring task template - Forward to implementation"""
    return await _update_recurring_template_impl(template_id, data, user)


@router.delete("/recurring-templates/{template_id}")
async def delete_recurring_template_route(
    template_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a recurring task template - Forward to implementation"""
    return await _delete_recurring_template_impl(template_id, user)


@router.post("/recurring-templates/{template_id}/pause")
async def pause_recurring_template_route(
    template_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Pause a recurring task template - Forward to implementation"""
    return await _pause_recurring_template_impl(template_id, user)


@router.post("/recurring-templates/{template_id}/resume")
async def resume_recurring_template_route(
    template_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Resume a recurring task template - Forward to implementation"""
    return await _resume_recurring_template_impl(template_id, user)


@router.get("/recurring-templates/{template_id}/generated-tasks", response_model=List[GeneratedTaskInfo])
async def get_generated_tasks_route(
    template_id: str,
    limit: int = Query(default=20, le=100),
    user: dict = Depends(get_current_user_dep)
):
    """Get tasks generated from a template - Forward to implementation"""
    return await _get_generated_tasks_impl(template_id, limit, user)


@router.post("/recurring-templates/{template_id}/generate-now")
async def generate_task_now_route(
    template_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Manually generate a task from template - Forward to implementation"""
    return await _generate_task_now_impl(template_id, user)


# ============== OBJECTIVES FOR LINKING (Must be before /{project_id}) ==============

@router.get("/objectives-list")
async def get_objectives_for_linking(
    user: dict = Depends(get_current_user_dep)
):
    """Get active objectives for linking to projects"""
    try:
        # Get objectives that are not completed
        objectives = await db.objectives.find(
            {"status": {"$nin": ["completed"]}},
            {"_id": 1, "title": 1, "quarter_id": 1, "fiscal_year_id": 1, "status": 1, "department": 1}
        ).sort("created_at", -1).to_list(100)
        
        results = []
        for obj in objectives:
            # Get quarter name
            quarter_name = None
            if obj.get("quarter_id"):
                quarter = await db.quarters.find_one({"_id": ObjectId(obj["quarter_id"])}, {"name": 1})
                quarter_name = quarter.get("name") if quarter else None
            
            # Get fiscal year name
            fy_name = None
            if obj.get("fiscal_year_id"):
                fy = await db.fiscal_years.find_one({"_id": ObjectId(obj["fiscal_year_id"])}, {"name": 1})
                fy_name = fy.get("name") if fy else None
            
            results.append({
                "id": str(obj["_id"]),
                "title": obj.get("title"),
                "quarter_name": quarter_name,
                "fiscal_year_name": fy_name,
                "status": obj.get("status"),
                "department": obj.get("department")
            })
        
        return results
    except Exception as e:
        logger.error(f"Failed to get objectives for linking: {e}")
        return []


# ============== KANBAN BOARD (Must be before /{project_id}) ==============

@router.get("/kanban")
async def get_kanban_board(
    project_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get Kanban board view with tasks grouped by status"""
    # Define columns based on task statuses
    columns = [
        {"id": "draft", "name": "Backlog", "status": TaskStatus.DRAFT.value, "wip_limit": None},
        {"id": "assigned", "name": "To Do", "status": TaskStatus.ASSIGNED.value, "wip_limit": None},
        {"id": "in_progress", "name": "In Progress", "status": TaskStatus.IN_PROGRESS.value, "wip_limit": 5},
        {"id": "pending_review", "name": "Review", "status": TaskStatus.PENDING_REVIEW.value, "wip_limit": None},
        {"id": "completed", "name": "Done", "status": TaskStatus.COMPLETED.value, "wip_limit": None}
    ]
    
    # Build query
    query = {"parent_task_id": None}
    if project_id:
        query["project_id"] = project_id
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    # Fetch tasks
    tasks = await db.pm_tasks.find(query, {"_id": 0}).sort("updated_at", -1).to_list(500)
    
    # Enrich and group by status
    tasks_by_column = {col["id"]: [] for col in columns}
    
    for task in tasks:
        enriched = await enrich_task(task)
        status = task.get("status", "draft")
        
        # Map status to column
        if status in ["completed", "approved"]:
            column_id = "completed"
        elif status == "pending_review":
            column_id = "pending_review"
        elif status == "in_progress":
            column_id = "in_progress"
        elif status == "assigned":
            column_id = "assigned"
        else:
            column_id = "draft"
        
        tasks_by_column[column_id].append(enriched)
    
    # Update column counts
    for col in columns:
        col["task_count"] = len(tasks_by_column.get(col["id"], []))
    
    # Get project name if filtered
    project_name = None
    if project_id:
        project = await db.pm_projects.find_one({"id": project_id}, {"name": 1})
        project_name = project.get("name") if project else None
    
    return {
        "project_id": project_id,
        "project_name": project_name,
        "columns": columns,
        "tasks_by_column": tasks_by_column,
        "total_tasks": len(tasks)
    }


@router.put("/kanban/move-task")
async def move_kanban_task(
    task_id: str = Query(...),
    new_status: str = Query(...),
    user: dict = Depends(get_current_user_dep)
):
    """Move a task to a different status column (for drag-and-drop)"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Validate status
    valid_statuses = [s.value for s in TaskStatus]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    old_status = task.get("status")
    
    # Check if task is blocked before allowing progress
    if new_status in ["in_progress", "pending_review", "completed", "approved"]:
        blocked_by = task.get("blocked_by", [])
        for blocking_id in blocked_by:
            blocking_task = await db.pm_tasks.find_one({"id": blocking_id}, {"status": 1, "name": 1})
            if blocking_task and blocking_task.get("status") not in ["completed", "approved"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot move task: blocked by '{blocking_task.get('name')}' which is not completed"
                )
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {"status": new_status, "updated_at": now}
    
    await db.pm_tasks.update_one({"id": task_id}, {"$set": update_data})
    
    await log_activity(
        "task", task_id, task.get("name"), "status_changed", user["id"],
        {"old_status": old_status, "new_status": new_status}
    )
    
    # Notify watchers about status change
    watchers = task.get("watchers", [])
    for watcher_id in watchers:
        if watcher_id != user["id"]:
            try:
                await create_notification(
                    user_id=watcher_id,
                    notification_type=NotificationType.TASK_STATUS_CHANGED,
                    category=NotificationCategory.TASK,
                    title="Task Status Changed",
                    message=f"'{task.get('name')}' moved from {old_status} to {new_status}",
                    priority=NotificationPriority.LOW,
                    entity_type="task",
                    entity_id=task_id,
                    action_url=f"/projects/tasks/{task_id}"
                )
            except Exception as e:
                logger.error(f"Failed to notify watcher: {e}")
    
    return {"message": "Task moved successfully", "task_id": task_id, "new_status": new_status}

# ============== RELEASE/VERSION MANAGEMENT ==============


@router.post("/releases", response_model=ReleaseResponse)
async def create_release(data: ReleaseCreate, user: dict = Depends(get_current_user_dep)):
    """Create a new release/version for a project"""
    # Verify project exists
    project = await db.pm_projects.find_one({"id": data.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    now = datetime.now(timezone.utc)
    release_id = str(uuid.uuid4())
    
    release = {
        "id": release_id,
        "project_id": data.project_id,
        "name": data.name,
        "description": data.description,
        "start_date": data.start_date,
        "release_date": data.release_date,
        "actual_release_date": None,
        "status": data.status.value,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_releases.insert_one(release)
    
    # Log activity
    await log_activity("release", release_id, data.name, "created", user["id"], {"project_id": data.project_id})
    
    return await enrich_release(release)


@router.get("/releases", response_model=List[ReleaseResponse])
async def list_releases(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """List all releases, optionally filtered by project"""
    query = {}
    if project_id:
        query["project_id"] = project_id
    if status:
        query["status"] = status
    
    releases = await db.pm_releases.find(query, {"_id": 0}).sort("release_date", -1).to_list(None)
    
    return [await enrich_release(r) for r in releases]


@router.get("/releases/{release_id}", response_model=ReleaseResponse)
async def get_release(release_id: str, user: dict = Depends(get_current_user_dep)):
    """Get a specific release by ID"""
    release = await db.pm_releases.find_one({"id": release_id}, {"_id": 0})
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    return await enrich_release(release)


@router.put("/releases/{release_id}", response_model=ReleaseResponse)
async def update_release(release_id: str, data: ReleaseUpdate, user: dict = Depends(get_current_user_dep)):
    """Update a release"""
    release = await db.pm_releases.find_one({"id": release_id})
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    now = datetime.now(timezone.utc)
    updates = {"updated_at": now}
    
    if data.name is not None:
        updates["name"] = data.name
    if data.description is not None:
        updates["description"] = data.description
    if data.start_date is not None:
        updates["start_date"] = data.start_date
    if data.release_date is not None:
        updates["release_date"] = data.release_date
    if data.actual_release_date is not None:
        updates["actual_release_date"] = data.actual_release_date
    if data.status is not None:
        updates["status"] = data.status.value
        # Auto-set actual_release_date when status changes to released
        if data.status == ReleaseStatus.RELEASED and not release.get("actual_release_date"):
            updates["actual_release_date"] = now.isoformat()
    
    await db.pm_releases.update_one({"id": release_id}, {"$set": updates})
    
    # Log activity
    await log_activity("release", release_id, release["name"], "updated", user["id"])
    
    updated = await db.pm_releases.find_one({"id": release_id}, {"_id": 0})
    return await enrich_release(updated)


@router.delete("/releases/{release_id}")
async def delete_release(release_id: str, user: dict = Depends(get_current_user_dep)):
    """Delete a release (only if no tasks are linked)"""
    release = await db.pm_releases.find_one({"id": release_id})
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Check for linked tasks
    linked_tasks = await db.pm_tasks.count_documents({"release_id": release_id})
    if linked_tasks > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete release with {linked_tasks} linked tasks. Unlink tasks first."
        )
    
    await db.pm_releases.delete_one({"id": release_id})
    
    # Log activity
    await log_activity("release", release_id, release["name"], "deleted", user["id"])
    
    return {"message": "Release deleted", "id": release_id}


@router.get("/releases/{release_id}/tasks", response_model=List[TaskResponse])
async def get_release_tasks(release_id: str, user: dict = Depends(get_current_user_dep)):
    """Get all tasks linked to a release"""
    release = await db.pm_releases.find_one({"id": release_id})
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    tasks = await db.pm_tasks.find({"release_id": release_id}, {"_id": 0}).to_list(None)
    return [await enrich_task(t) for t in tasks]


@router.post("/releases/{release_id}/tasks/{task_id}")
async def link_task_to_release(release_id: str, task_id: str, user: dict = Depends(get_current_user_dep)):
    """Link a task to a release"""
    release = await db.pm_releases.find_one({"id": release_id})
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Ensure task belongs to same project as release
    if task.get("project_id") != release.get("project_id"):
        raise HTTPException(status_code=400, detail="Task must belong to the same project as the release")
    
    await db.pm_tasks.update_one(
        {"id": task_id}, 
        {"$set": {"release_id": release_id, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Log activity
    await log_activity("task", task_id, task["name"], "linked_to_release", user["id"], {"release_id": release_id, "release_name": release["name"]})
    
    return {"message": "Task linked to release", "task_id": task_id, "release_id": release_id}


@router.delete("/releases/{release_id}/tasks/{task_id}")
async def unlink_task_from_release(release_id: str, task_id: str, user: dict = Depends(get_current_user_dep)):
    """Unlink a task from a release"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task.get("release_id") != release_id:
        raise HTTPException(status_code=400, detail="Task is not linked to this release")
    
    await db.pm_tasks.update_one(
        {"id": task_id}, 
        {"$set": {"release_id": None, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Task unlinked from release", "task_id": task_id}


async def enrich_release(release: dict) -> dict:
    """Enrich release with computed fields"""
    if not release:
        return None
    
    release_id = release.get("id")
    project_id = release.get("project_id")
    
    # Get project name
    project = await db.pm_projects.find_one({"id": project_id}, {"name": 1})
    release["project_name"] = project.get("name") if project else None
    
    # Get creator name
    release["created_by_name"] = await get_user_name(release.get("created_by"))
    
    # Count linked tasks and calculate progress
    pipeline = [
        {"$match": {"release_id": release_id}},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "completed": {"$sum": {"$cond": [{"$in": ["$status", ["completed", "approved"]]}, 1, 0]}},
            "story_points_total": {"$sum": {"$ifNull": ["$story_points", 0]}},
            "story_points_completed": {"$sum": {"$cond": [
                {"$in": ["$status", ["completed", "approved"]]},
                {"$ifNull": ["$story_points", 0]},
                0
            ]}}
        }}
    ]
    
    stats = await db.pm_tasks.aggregate(pipeline).to_list(1)
    if stats:
        release["total_issues"] = stats[0].get("total", 0)
        release["completed_issues"] = stats[0].get("completed", 0)
        release["story_points_total"] = stats[0].get("story_points_total", 0)
        release["story_points_completed"] = stats[0].get("story_points_completed", 0)
        if release["total_issues"] > 0:
            release["progress"] = round((release["completed_issues"] / release["total_issues"]) * 100, 1)
        else:
            release["progress"] = 0
    else:
        release["total_issues"] = 0
        release["completed_issues"] = 0
        release["story_points_total"] = 0
        release["story_points_completed"] = 0
        release["progress"] = 0
    
    return release

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
    
    # ===== PULSE INTEGRATION: Auto-post for project status changes =====
    old_status = project.get("status")
    new_status = update_data.get("status")
    if new_status and new_status != old_status:
        try:
            from services.pulse_integrations import on_project_completed, on_project_started
            if new_status == "completed":
                await on_project_completed(project, user)
            elif new_status == "in_progress" and old_status in ["draft", "planning", None]:
                await on_project_started(project, user)
        except Exception as e:
            logger.warning(f"Pulse integration failed for project status (non-fatal): {e}")
    
    await db.pm_projects.update_one({"id": project_id}, {"$set": update_data})
    await log_activity("project", project_id, project.get("name"), "updated", user["id"], update_data)
    
    return await get_project(project_id, user)


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a project and all its tasks - only creator, owner, or admin can delete"""
    project = await db.pm_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check delete permission
    if not can_delete_record(project, user):
        raise HTTPException(status_code=403, detail=get_delete_error_message(project))
    
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


class AddMemberRequest(BaseModel):
    user_id: str


@router.post("/{project_id}/members")
async def add_project_member_body(
    project_id: str,
    data: AddMemberRequest,
    user: dict = Depends(get_current_user_dep)
):
    """Add a team member to a project (accepts user_id in body)"""
    project = await db.pm_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    member_id = data.user_id
    
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
    
    return {"message": "Member added to project", "team_members": team_members}


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


# ============== PROJECT ATTACHMENTS ==============

class ProjectAttachmentResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    file_type: str
    size: int
    url: str
    uploaded_by: Optional[str] = None
    uploaded_by_name: Optional[str] = None
    created_at: str


@router.get("/{project_id}/attachments", response_model=List[ProjectAttachmentResponse])
async def list_project_attachments(
    project_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """List all attachments for a project"""
    attachments = await db.project_attachments.find(
        {"project_id": project_id, "is_deleted": {"$ne": True}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for att in attachments:
        if att.get("uploaded_by"):
            att["uploaded_by_name"] = await get_user_name(att["uploaded_by"])
    
    return attachments


@router.post("/{project_id}/attachments", response_model=ProjectAttachmentResponse)
async def upload_project_attachment(
    project_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user_dep)
):
    """Upload an attachment to a project"""
    project = await db.pm_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Generate unique filename
    unique_filename = f"{project_id}_{uuid.uuid4().hex[:8]}_{file.filename}"
    
    # Save to uploads directory
    upload_dir = "/app/uploads/projects"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_filename)
    
    with open(file_path, 'wb') as f:
        f.write(content)
    
    attachment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    attachment_doc = {
        "id": attachment_id,
        "project_id": project_id,
        "filename": file.filename,
        "file_path": file_path,
        "file_type": file.content_type or 'application/octet-stream',
        "size": file_size,
        "url": f"/api/projects/attachments/{attachment_id}/download",
        "uploaded_by": user["id"],
        "created_at": now,
        "is_deleted": False
    }
    
    await db.project_attachments.insert_one(attachment_doc)
    
    attachment_doc["uploaded_by_name"] = user.get("name")
    if "_id" in attachment_doc:
        del attachment_doc["_id"]
    
    return attachment_doc


@router.delete("/{project_id}/attachments/{attachment_id}")
async def delete_project_attachment(
    project_id: str,
    attachment_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a project attachment"""
    result = await db.project_attachments.update_one(
        {"id": attachment_id, "project_id": project_id},
        {"$set": {"is_deleted": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    return {"message": "Attachment deleted"}


@router.get("/attachments/{attachment_id}/download")
async def download_project_attachment(
    attachment_id: str
):
    """Download a project attachment"""
    attachment = await db.project_attachments.find_one({"id": attachment_id, "is_deleted": {"$ne": True}})
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    file_path = attachment.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return Response(
        content=open(file_path, 'rb').read(),
        media_type=attachment.get("file_type", "application/octet-stream"),
        headers={
            "Content-Disposition": f"attachment; filename={attachment.get('filename')}"
        }
    )


# ============== TASKS ==============

@router.get("/tasks/all", response_model=List[TaskResponse])
async def list_all_tasks(
    project_id: Optional[str] = None,
    status: Optional[TaskStatus] = None,
    assigned_to: Optional[str] = None,
    priority: Optional[Priority] = None,
    search: Optional[str] = None,
    include_my_tasks: bool = True,
    user: dict = Depends(get_current_user_dep)
):
    """List all tasks with filters. By default includes tasks assigned to current user."""
    from utils.permissions import apply_data_scope_filter
    
    user_id = user.get("id")
    
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
    
    # Apply data scope filtering based on user's permissions
    # Uses the "projects" category and "tasks" module for permission lookup
    query = await apply_data_scope_filter(
        query, 
        user_id, 
        "projects",  # category
        "tasks",  # module
        user_field="assigned_to",  # Tasks primarily use assigned_to as user field
        department_field="department_id"
    )
    
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


@router.get("/{project_id}/epics")
async def get_project_epics(
    project_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get all epics for a project"""
    project = await db.pm_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    epics = await db.pm_epics.find(
        {"project_id": project_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return epics


@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    data: TaskCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new task. Can be linked to a project or be an individual task."""
    project = None
    
    # If project_id provided, verify project exists
    if data.project_id:
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
        "project_id": data.project_id,  # Can be None for individual tasks
        "description": data.description,
        "assigned_to": data.assigned_to or user["id"],  # Default to creator for individual tasks
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
        "external_links": [link.model_dump() for link in data.external_links] if data.external_links else [],
        "is_individual": data.project_id is None,  # Flag for individual tasks
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
    
    # Send notification if task is assigned to someone else
    if data.assigned_to and data.assigned_to != user["id"]:
        try:
            action_url = f"/projects/{data.project_id}?task={task_id}" if data.project_id else f"/projects/my-tasks?task={task_id}"
            await create_notification(
                user_id=data.assigned_to,
                notification_type=NotificationType.TASK_ASSIGNED,
                category=NotificationCategory.TASK,
                title="New Task Assigned",
                message=f"{user.get('name', 'Someone')} assigned you: {data.name}",
                priority=NotificationPriority.HIGH if data.priority.value in ['high', 'urgent'] else NotificationPriority.MEDIUM,
                entity_type="task",
                entity_id=task_id,
                action_url=action_url,
                metadata={"project_name": project.get("name") if project else "Individual Task", "assigner": user.get("name")}
            )
        except Exception as e:
            logger.error(f"Failed to send task assignment notification: {e}")
    
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


@router.get("/tasks/{task_id}/available-transitions")
async def get_task_available_transitions(
    task_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get available status transitions for a task based on its workflow"""
    task = await db.pm_tasks.find_one({"id": task_id}, {"_id": 0, "status": 1, "issue_type": 1})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    current_status = task.get("status", "draft")
    issue_type = task.get("issue_type", "task")
    
    # Find appropriate workflow
    workflow = await db.workflows.find_one(
        {"issue_types": issue_type},
        {"_id": 0, "statuses": 1, "transitions": 1}
    )
    
    if not workflow:
        workflow = await db.workflows.find_one(
            {"is_default": True},
            {"_id": 0, "statuses": 1, "transitions": 1}
        )
    
    if not workflow:
        # Return default statuses if no workflow exists
        return {
            "current_status": current_status,
            "available_statuses": [
                {"id": "draft", "name": "Draft", "color": "#9CA3AF"},
                {"id": "todo", "name": "To Do", "color": "#3B82F6"},
                {"id": "in_progress", "name": "In Progress", "color": "#8B5CF6"},
                {"id": "in_review", "name": "In Review", "color": "#F59E0B"},
                {"id": "completed", "name": "Completed", "color": "#10B981"},
            ],
            "workflow_enabled": False
        }
    
    statuses = {s["id"]: s for s in workflow.get("statuses", [])}
    transitions = workflow.get("transitions", [])
    
    # Find available transitions from current status
    available = []
    for t in transitions:
        from_status = t.get("from_status")
        to_status = t.get("to_status")
        
        if from_status == current_status or from_status == "*":
            status_info = statuses.get(to_status, {})
            available.append({
                "id": to_status,
                "name": status_info.get("name", to_status),
                "color": status_info.get("color", "#6B7280"),
                "category": status_info.get("category", "todo"),
                "transition_name": t.get("name"),
                "requires_fields": t.get("requires_fields", []),
                "requires_comment": t.get("requires_comment", False)
            })
    
    # Also include current status
    current_info = statuses.get(current_status, {"name": current_status, "color": "#6B7280"})
    
    return {
        "current_status": current_status,
        "current_status_info": {
            "id": current_status,
            "name": current_info.get("name", current_status),
            "color": current_info.get("color", "#6B7280")
        },
        "available_transitions": available,
        "all_statuses": list(statuses.values()),
        "workflow_enabled": True
    }


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
    
    # ===== WORKFLOW VALIDATION =====
    # Validate status transition against workflow rules
    if new_status and new_status != old_status:
        issue_type = task.get("issue_type", "task")
        
        # Find the appropriate workflow for this issue type
        workflow = await db.workflows.find_one(
            {"issue_types": issue_type},
            {"_id": 0, "statuses": 1, "transitions": 1, "name": 1}
        )
        
        if not workflow:
            # Use default workflow
            workflow = await db.workflows.find_one(
                {"is_default": True},
                {"_id": 0, "statuses": 1, "transitions": 1, "name": 1}
            )
        
        if workflow and workflow.get("transitions"):
            transitions = workflow["transitions"]
            
            # Check if the transition is allowed
            transition_allowed = False
            matching_transition = None
            
            for t in transitions:
                from_status = t.get("from_status")
                to_status = t.get("to_status")
                
                # Wildcard "*" means transition is allowed from any status
                if (from_status == old_status or from_status == "*") and to_status == new_status:
                    transition_allowed = True
                    matching_transition = t
                    break
            
            if not transition_allowed:
                # Get the current status name for better error message
                status_names = {s["id"]: s["name"] for s in workflow.get("statuses", [])}
                from_name = status_names.get(old_status, old_status)
                to_name = status_names.get(new_status, new_status)
                
                # Check what transitions are available from current status
                available = []
                for t in transitions:
                    if t.get("from_status") == old_status or t.get("from_status") == "*":
                        available.append(status_names.get(t.get("to_status"), t.get("to_status")))
                
                available_str = ", ".join(available) if available else "none"
                raise HTTPException(
                    status_code=400,
                    detail=f"Workflow violation: Cannot transition from '{from_name}' to '{to_name}'. Available transitions: {available_str}"
                )
            
            # Check if transition requires specific fields
            if matching_transition:
                required_fields = matching_transition.get("requires_fields", [])
                for field in required_fields:
                    if not task.get(field) and not update_data.get(field):
                        raise HTTPException(
                            status_code=400,
                            detail=f"Workflow requires '{field}' to be set for this transition"
                        )
                
                # Note: requires_comment validation would need frontend changes to include comment
    
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
        
        # Send notification to newly assigned user
        new_assignee = update_data["assigned_to"]
        if new_assignee and new_assignee != user["id"]:
            try:
                project = await db.pm_projects.find_one({"id": task.get("project_id")}, {"name": 1})
                await create_notification(
                    user_id=new_assignee,
                    notification_type=NotificationType.TASK_ASSIGNED,
                    category=NotificationCategory.TASK,
                    title="Task Assigned to You",
                    message=f"{user.get('name', 'Someone')} assigned you: {task.get('name')}",
                    priority=NotificationPriority.HIGH,
                    entity_type="task",
                    entity_id=task_id,
                    action_url=f"/projects/{task.get('project_id')}?task={task_id}",
                    metadata={"project_name": project.get("name") if project else None}
                )
            except Exception as e:
                logger.error(f"Failed to send task reassignment notification: {e}")
    
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
        
        # ===== PULSE INTEGRATION: Auto-post for critical task completion =====
        if new_status in ["completed", "approved"] and task.get("priority") in ["high", "critical", "urgent"]:
            try:
                from services.pulse_integrations import on_critical_task_completed
                await on_critical_task_completed(task, user)
            except Exception as e:
                logger.warning(f"Pulse integration failed for task completion (non-fatal): {e}")
        
        # Recalculate objective progress if project is linked to an objective
        if task.get("project_id"):
            project = await db.pm_projects.find_one({"id": task.get("project_id")}, {"linked_objective_id": 1})
            if project and project.get("linked_objective_id"):
                await recalculate_objective_progress(project["linked_objective_id"])
            
            # Trigger progress cascade automation for complete status tracking
            if new_status in ["completed", "approved"]:
                try:
                    from services.automation_service import cascade_progress_on_task_complete
                    await cascade_progress_on_task_complete(task_id, task.get("project_id"))
                except Exception as e:
                    logger.warning(f"Progress cascade automation failed (non-fatal): {e}")
        
        # Notify task assignee about status change (if not the one making the change)
        assignee = task.get("assigned_to")
        if assignee and assignee != user["id"]:
            try:
                status_labels = {
                    "in_progress": "In Progress",
                    "in_review": "In Review",
                    "completed": "Completed",
                    "approved": "Approved",
                    "on_hold": "On Hold"
                }
                await create_notification(
                    user_id=assignee,
                    notification_type=NotificationType.TASK_STATUS_CHANGED,
                    category=NotificationCategory.TASK,
                    title="Task Status Updated",
                    message=f"'{task.get('name')}' moved to {status_labels.get(new_status, new_status)}",
                    priority=NotificationPriority.MEDIUM,
                    entity_type="task",
                    entity_id=task_id,
                    action_url=f"/projects/{task.get('project_id')}?task={task_id}",
                    metadata={"old_status": old_status, "new_status": new_status}
                )
            except Exception as e:
                logger.error(f"Failed to send task status notification: {e}")
        
        # Notify task creator when completed (if different from assignee and modifier)
        creator = task.get("created_by")
        if new_status in ["completed", "approved"] and creator and creator != user["id"] and creator != assignee:
            try:
                await create_notification(
                    user_id=creator,
                    notification_type=NotificationType.TASK_COMPLETED,
                    category=NotificationCategory.TASK,
                    title="Task Completed",
                    message=f"'{task.get('name')}' has been marked as {new_status}",
                    priority=NotificationPriority.MEDIUM,
                    entity_type="task",
                    entity_id=task_id,
                    action_url=f"/projects/{task.get('project_id')}?task={task_id}"
                )
            except Exception as e:
                logger.error(f"Failed to send task completion notification: {e}")
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
    """Delete a task and all its subtasks, checklists, comments - only creator, assigned user, or admin can delete"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check delete permission
    if not can_delete_record(task, user):
        raise HTTPException(status_code=403, detail=get_delete_error_message(task))
    
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
    """Delete a subtask - only creator, assigned user, or admin can delete"""
    subtask = await db.pm_subtasks.find_one({"id": subtask_id})
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    # Check delete permission
    if not can_delete_record(subtask, user):
        raise HTTPException(status_code=403, detail=get_delete_error_message(subtask))
    
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
    
    # Notify task assignee about new comment
    assignee = task.get("assigned_to")
    if assignee and assignee != user["id"]:
        try:
            await create_notification(
                user_id=assignee,
                notification_type=NotificationType.TASK_COMMENT,
                category=NotificationCategory.TASK,
                title="New Comment",
                message=f"{user.get('name', 'Someone')} commented on '{task.get('name')}'",
                priority=NotificationPriority.MEDIUM,
                entity_type="task",
                entity_id=data.task_id,
                action_url=f"/projects/{task.get('project_id')}?task={data.task_id}",
                metadata={"comment_preview": data.content[:100] if data.content else ""}
            )
        except Exception as e:
            logger.error(f"Failed to send comment notification: {e}")
    
    # Notify mentioned users
    if data.mentions:
        for mentioned_user_id in data.mentions:
            if mentioned_user_id != user["id"]:
                try:
                    await create_notification(
                        user_id=mentioned_user_id,
                        notification_type=NotificationType.USER_MENTIONED,
                        category=NotificationCategory.MENTION,
                        title=f"{user.get('name', 'Someone')} mentioned you",
                        message=f"In task '{task.get('name')}': {data.content[:80]}...",
                        priority=NotificationPriority.HIGH,
                        entity_type="task",
                        entity_id=data.task_id,
                        action_url=f"/projects/{task.get('project_id')}?task={data.task_id}",
                        metadata={"mentioner": user.get("name"), "context": "task_comment"}
                    )
                except Exception as e:
                    logger.error(f"Failed to send mention notification: {e}")
    
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
        except Exception:
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



# ============== RECURRING TASK TEMPLATES ==============

def get_recurrence_description(template: dict) -> str:
    """Generate human-readable recurrence description"""
    rec_type = template.get("recurrence_type", "weekly")
    freq = template.get("frequency", 1)
    
    freq_text = "" if freq == 1 else f"{freq} "
    
    if rec_type == "daily":
        return f"Every {freq_text}day{'s' if freq > 1 else ''}"
    
    elif rec_type == "weekly":
        days = template.get("repeat_on_days", [])
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        if days:
            day_str = ", ".join([day_names[d] for d in sorted(days) if d < 7])
            return f"Every {freq_text}week{'s' if freq > 1 else ''} on {day_str}"
        return f"Every {freq_text}week{'s' if freq > 1 else ''}"
    
    elif rec_type == "monthly":
        monthly_type = template.get("monthly_repeat_type", "day_of_month")
        if monthly_type == "day_of_month":
            day = template.get("day_of_month", 1)
            suffix = "th" if 11 <= day <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
            return f"Every {freq_text}month{'s' if freq > 1 else ''} on the {day}{suffix}"
        else:
            week = template.get("week_of_month", 1)
            weekday = template.get("weekday_of_month", 0)
            week_names = {1: "First", 2: "Second", 3: "Third", 4: "Fourth", -1: "Last"}
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            return f"Every {freq_text}month{'s' if freq > 1 else ''} on the {week_names.get(week, 'First')} {day_names[weekday]}"
    
    elif rec_type == "quarterly":
        return f"Every {freq_text}quarter{'s' if freq > 1 else ''}"
    
    elif rec_type == "yearly":
        return f"Every {freq_text}year{'s' if freq > 1 else ''}"
    
    return f"Custom ({rec_type})"


def calculate_next_occurrence(template: dict, from_date: datetime = None) -> Optional[datetime]:
    """Calculate the next occurrence date for a recurring task"""
    if template.get("is_paused") or not template.get("is_active", True):
        return None
    
    from_date = from_date or datetime.now(timezone.utc)
    rec_type = template.get("recurrence_type", "weekly")
    freq = template.get("frequency", 1)
    start_date_str = template.get("start_date")
    
    if not start_date_str:
        return None
    
    try:
        start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
    except Exception:
        return None
    
    # If start date is in the future, that's the next occurrence
    if start_date > from_date:
        return start_date
    
    # Check end conditions
    end_type = template.get("recurrence_end_type", "never")
    if end_type == "end_date":
        end_date_str = template.get("end_date")
        if end_date_str:
            try:
                end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
                if end_date.tzinfo is None:
                    end_date = end_date.replace(tzinfo=timezone.utc)
                if from_date > end_date:
                    return None
            except Exception:
                pass
    elif end_type == "after_occurrences":
        max_occ = template.get("max_occurrences", 0)
        generated = template.get("occurrences_generated", 0)
        if max_occ > 0 and generated >= max_occ:
            return None
    
    next_date = start_date
    
    if rec_type == "daily":
        while next_date <= from_date:
            next_date += timedelta(days=freq)
    
    elif rec_type == "weekly":
        repeat_days = template.get("repeat_on_days", [])
        if not repeat_days:
            repeat_days = [start_date.weekday()]
        
        while True:
            if next_date > from_date and next_date.weekday() in repeat_days:
                break
            next_date += timedelta(days=1)
            # Check if we've passed a full week cycle
            if (next_date - start_date).days > 365:
                return None
    
    elif rec_type == "monthly":
        monthly_type = template.get("monthly_repeat_type", "day_of_month")
        
        if monthly_type == "day_of_month":
            day = template.get("day_of_month", start_date.day)
            while next_date <= from_date:
                next_date = next_date + relativedelta(months=freq)
                try:
                    next_date = next_date.replace(day=min(day, 28))
                except Exception:
                    pass
        else:
            # weekday_of_month - e.g., "First Monday"
            week = template.get("week_of_month", 1)
            weekday = template.get("weekday_of_month", 0)
            
            while next_date <= from_date:
                next_date = next_date + relativedelta(months=freq)
                # Find the correct weekday occurrence
                first_of_month = next_date.replace(day=1)
                first_weekday = first_of_month.weekday()
                
                if week == -1:  # Last
                    last_of_month = next_date.replace(day=28) + timedelta(days=4)
                    last_of_month = last_of_month - timedelta(days=last_of_month.day)
                    while last_of_month.weekday() != weekday:
                        last_of_month -= timedelta(days=1)
                    next_date = last_of_month
                else:
                    days_until_weekday = (weekday - first_weekday + 7) % 7
                    target_day = 1 + days_until_weekday + (week - 1) * 7
                    try:
                        next_date = next_date.replace(day=target_day)
                    except Exception:
                        pass
    
    elif rec_type == "quarterly":
        while next_date <= from_date:
            next_date = next_date + relativedelta(months=3 * freq)
    
    elif rec_type == "yearly":
        while next_date <= from_date:
            next_date = next_date + relativedelta(years=freq)
    
    return next_date


async def _create_recurring_template_impl(
    data: RecurringTaskTemplateCreate,
    user: dict
):
    """Create a new recurring task template - Implementation"""
    now = datetime.now(timezone.utc).isoformat()
    template_id = str(uuid.uuid4())
    
    template_doc = {
        "id": template_id,
        "name": data.name,
        "description": data.description,
        "project_id": data.project_id,
        "department_id": data.department_id,
        "assigned_to": data.assigned_to,
        "priority": data.priority.value,
        "tags": data.tags,
        "estimated_hours": data.estimated_hours,
        "recurrence_type": data.recurrence_type.value,
        "frequency": data.frequency,
        "repeat_on_days": data.repeat_on_days,
        "monthly_repeat_type": data.monthly_repeat_type.value,
        "day_of_month": data.day_of_month,
        "week_of_month": data.week_of_month,
        "weekday_of_month": data.weekday_of_month,
        "recurrence_end_type": data.recurrence_end_type.value,
        "end_date": data.end_date,
        "max_occurrences": data.max_occurrences,
        "start_date": data.start_date,
        "task_due_offset_days": data.task_due_offset_days,
        "is_active": True,
        "is_paused": False,
        "occurrences_generated": 0,
        "last_generated": None,
        "created_by": user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.recurring_task_templates.insert_one(template_doc)
    
    # Build response
    response = {**template_doc}
    response["project_name"] = await get_project_name(data.project_id) if data.project_id else None
    response["department_name"] = await get_department_name(data.department_id) if data.department_id else None
    response["assigned_to_name"] = await get_user_name(data.assigned_to) if data.assigned_to else None
    response["created_by_name"] = await get_user_name(user.get("id"))
    response["recurrence_description"] = get_recurrence_description(template_doc)
    response["next_occurrence"] = calculate_next_occurrence(template_doc)
    if response["next_occurrence"]:
        response["next_occurrence"] = response["next_occurrence"].isoformat()
    
    return response


async def get_project_name(project_id: str) -> Optional[str]:
    """Get project name by ID"""
    if not project_id:
        return None
    project = await db.pm_projects.find_one({"id": project_id}, {"name": 1})
    return project.get("name") if project else None


async def _list_recurring_templates_impl(
    project_id: Optional[str],
    department_id: Optional[str],
    assigned_to: Optional[str],
    recurrence_type: Optional[str],
    is_active: Optional[bool],
    is_paused: Optional[bool],
    search: Optional[str],
    user: dict
):
    """List all recurring task templates - Implementation"""
    query = {}
    
    if project_id:
        query["project_id"] = project_id
    if department_id:
        query["department_id"] = department_id
    if assigned_to:
        query["assigned_to"] = assigned_to
    if recurrence_type:
        query["recurrence_type"] = recurrence_type
    if is_active is not None:
        query["is_active"] = is_active
    if is_paused is not None:
        query["is_paused"] = is_paused
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    templates = await db.recurring_task_templates.find(query).sort("created_at", -1).to_list(500)
    
    results = []
    for t in templates:
        t.pop("_id", None)
        t["project_name"] = await get_project_name(t.get("project_id")) if t.get("project_id") else None
        t["department_name"] = await get_department_name(t.get("department_id")) if t.get("department_id") else None
        t["assigned_to_name"] = await get_user_name(t.get("assigned_to")) if t.get("assigned_to") else None
        t["created_by_name"] = await get_user_name(t.get("created_by"))
        t["recurrence_description"] = get_recurrence_description(t)
        next_occ = calculate_next_occurrence(t)
        t["next_occurrence"] = next_occ.isoformat() if next_occ else None
        results.append(t)
    
    return results


async def _get_recurring_template_impl(
    template_id: str,
    user: dict
):
    """Get a recurring task template by ID - Implementation"""
    template = await db.recurring_task_templates.find_one({"id": template_id})
    
    if not template:
        raise HTTPException(status_code=404, detail="Recurring template not found")
    
    template.pop("_id", None)
    template["project_name"] = await get_project_name(template.get("project_id")) if template.get("project_id") else None
    template["department_name"] = await get_department_name(template.get("department_id")) if template.get("department_id") else None
    template["assigned_to_name"] = await get_user_name(template.get("assigned_to")) if template.get("assigned_to") else None
    template["created_by_name"] = await get_user_name(template.get("created_by"))
    template["recurrence_description"] = get_recurrence_description(template)
    next_occ = calculate_next_occurrence(template)
    template["next_occurrence"] = next_occ.isoformat() if next_occ else None
    
    return template


async def _update_recurring_template_impl(
    template_id: str,
    data: RecurringTaskTemplateUpdate,
    user: dict
):
    """Update a recurring task template - Implementation"""
    template = await db.recurring_task_templates.find_one({"id": template_id})
    
    if not template:
        raise HTTPException(status_code=404, detail="Recurring template not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    
    # Convert enums to values
    if "recurrence_type" in update_data:
        update_data["recurrence_type"] = update_data["recurrence_type"].value
    if "recurrence_end_type" in update_data:
        update_data["recurrence_end_type"] = update_data["recurrence_end_type"].value
    if "monthly_repeat_type" in update_data:
        update_data["monthly_repeat_type"] = update_data["monthly_repeat_type"].value
    if "priority" in update_data:
        update_data["priority"] = update_data["priority"].value
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.recurring_task_templates.update_one(
        {"id": template_id},
        {"$set": update_data}
    )
    
    return await _get_recurring_template_impl(template_id, user)


async def _delete_recurring_template_impl(
    template_id: str,
    user: dict
):
    """Delete a recurring task template - Implementation"""
    template = await db.recurring_task_templates.find_one({"id": template_id})
    
    if not template:
        raise HTTPException(status_code=404, detail="Recurring template not found")
    
    await db.recurring_task_templates.delete_one({"id": template_id})
    
    return {"message": "Recurring template deleted successfully"}


async def _pause_recurring_template_impl(
    template_id: str,
    user: dict
):
    """Pause a recurring task template - Implementation"""
    template = await db.recurring_task_templates.find_one({"id": template_id})
    
    if not template:
        raise HTTPException(status_code=404, detail="Recurring template not found")
    
    await db.recurring_task_templates.update_one(
        {"id": template_id},
        {"$set": {"is_paused": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Recurring template paused"}


async def _resume_recurring_template_impl(
    template_id: str,
    user: dict
):
    """Resume a paused recurring task template - Implementation"""
    template = await db.recurring_task_templates.find_one({"id": template_id})
    
    if not template:
        raise HTTPException(status_code=404, detail="Recurring template not found")
    
    await db.recurring_task_templates.update_one(
        {"id": template_id},
        {"$set": {"is_paused": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Recurring template resumed"}


async def _get_generated_tasks_impl(
    template_id: str,
    limit: int,
    user: dict
):
    """Get tasks generated from this recurring template - Implementation"""
    template = await db.recurring_task_templates.find_one({"id": template_id})
    
    if not template:
        raise HTTPException(status_code=404, detail="Recurring template not found")
    
    tasks = await db.pm_tasks.find(
        {"parent_recurring_id": template_id}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    results = []
    for task in tasks:
        results.append({
            "id": task.get("id"),
            "name": task.get("name"),
            "status": task.get("status", "draft"),
            "due_date": task.get("due_date"),
            "assigned_to_name": await get_user_name(task.get("assigned_to")),
            "generated_at": task.get("created_at")
        })
    
    return results


async def _generate_task_now_impl(
    template_id: str,
    user: dict
):
    """Manually generate a task from a recurring template - Implementation"""
    template = await db.recurring_task_templates.find_one({"id": template_id})
    
    if not template:
        raise HTTPException(status_code=404, detail="Recurring template not found")
    
    if not template.get("is_active", True):
        raise HTTPException(status_code=400, detail="Template is not active")
    
    # Generate the task
    task_id = await generate_task_from_template(template, user.get("id"))
    
    return {"message": "Task generated successfully", "task_id": task_id}


async def generate_task_from_template(template: dict, triggered_by: str = None) -> str:
    """Generate a task from a recurring template"""
    now = datetime.now(timezone.utc)
    task_id = str(uuid.uuid4())
    
    # Calculate due date
    due_date = None
    offset_days = template.get("task_due_offset_days", 0)
    if offset_days > 0:
        due_date = (now + timedelta(days=offset_days)).isoformat()
    
    task_doc = {
        "id": task_id,
        "name": template.get("name"),
        "description": template.get("description"),
        "project_id": template.get("project_id"),
        "assigned_to": template.get("assigned_to"),
        "priority": template.get("priority", "medium"),
        "status": "assigned" if template.get("assigned_to") else "draft",
        "due_date": due_date,
        "estimated_hours": template.get("estimated_hours"),
        "tags": template.get("tags", []),
        "parent_recurring_id": template.get("id"),
        "is_recurring": True,
        "created_by": triggered_by or template.get("created_by"),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.pm_tasks.insert_one(task_doc)
    
    # Update template stats
    await db.recurring_task_templates.update_one(
        {"id": template.get("id")},
        {
            "$inc": {"occurrences_generated": 1},
            "$set": {"last_generated": now.isoformat(), "updated_at": now.isoformat()}
        }
    )
    
    # Send notification to assignee
    if template.get("assigned_to"):
        try:
            await create_notification(
                user_id=template.get("assigned_to"),
                notification_type=NotificationType.TASK_ASSIGNED,
                category=NotificationCategory.TASK,
                title=f"Recurring Task: {template.get('name')}",
                message="A new task has been generated from recurring template.",
                priority=NotificationPriority.MEDIUM,
                entity_type="task",
                entity_id=task_id,
                action_url=f"/projects/tasks/{task_id}",
                metadata={
                    "task_name": template.get("name"),
                    "recurring_template_id": template.get("id"),
                    "due_date": due_date
                }
            )
        except Exception as e:
            logger.error(f"Failed to send notification for recurring task: {e}")
    
    return task_id


# ============== RECURRING TASK DASHBOARD ==============

async def _get_recurring_dashboard_impl(
    user: dict
):
    """Get recurring tasks dashboard data - Implementation"""
    # Total templates
    total = await db.recurring_task_templates.count_documents({"is_active": True})
    active = await db.recurring_task_templates.count_documents({"is_active": True, "is_paused": False})
    paused = await db.recurring_task_templates.count_documents({"is_active": True, "is_paused": True})
    
    # By frequency
    by_frequency = {}
    for freq in ["daily", "weekly", "monthly", "quarterly", "yearly"]:
        count = await db.recurring_task_templates.count_documents({
            "is_active": True,
            "recurrence_type": freq
        })
        by_frequency[freq] = count
    
    # Tasks generated today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    tasks_today = await db.pm_tasks.count_documents({
        "parent_recurring_id": {"$ne": None},
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    # Tasks generated this week
    week_start = today_start - timedelta(days=today_start.weekday())
    tasks_this_week = await db.pm_tasks.count_documents({
        "parent_recurring_id": {"$ne": None},
        "created_at": {"$gte": week_start.isoformat()}
    })
    
    # === NEW: Completion & Overdue Metrics ===
    
    # Total recurring tasks ever generated
    total_generated = await db.pm_tasks.count_documents({
        "parent_recurring_id": {"$ne": None}
    })
    
    # Completed recurring tasks
    completed_recurring = await db.pm_tasks.count_documents({
        "parent_recurring_id": {"$ne": None},
        "status": {"$in": ["completed", "done"]}
    })
    
    # Completion rate
    completion_rate = round((completed_recurring / total_generated * 100), 1) if total_generated > 0 else 0
    
    # Overdue recurring tasks
    now = datetime.now(timezone.utc).isoformat()
    overdue_recurring = await db.pm_tasks.count_documents({
        "parent_recurring_id": {"$ne": None},
        "status": {"$nin": ["completed", "done", "cancelled"]},
        "due_date": {"$lt": now, "$ne": None}
    })
    
    # In-progress recurring tasks
    in_progress_recurring = await db.pm_tasks.count_documents({
        "parent_recurring_id": {"$ne": None},
        "status": {"$in": ["in_progress", "assigned", "review"]}
    })
    
    # === NEW: By Project Stats ===
    by_project_pipeline = [
        {"$match": {"is_active": True, "project_id": {"$ne": None}}},
        {"$group": {"_id": "$project_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    by_project_raw = await db.recurring_task_templates.aggregate(by_project_pipeline).to_list(10)
    
    by_project = []
    for item in by_project_raw:
        project = await db.pm_projects.find_one({"id": item["_id"]}, {"_id": 0, "name": 1})
        by_project.append({
            "project_id": item["_id"],
            "project_name": project.get("name") if project else "Unknown",
            "template_count": item["count"]
        })
    
    # === NEW: By Assignee Stats ===
    by_assignee_pipeline = [
        {"$match": {"is_active": True, "assigned_to": {"$ne": None}}},
        {"$group": {"_id": "$assigned_to", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    by_assignee_raw = await db.recurring_task_templates.aggregate(by_assignee_pipeline).to_list(10)
    
    by_assignee = []
    for item in by_assignee_raw:
        user_name = await get_user_name(item["_id"])
        by_assignee.append({
            "user_id": item["_id"],
            "user_name": user_name or "Unassigned",
            "template_count": item["count"]
        })
    
    # === NEW: Weekly Generation Trend (Last 4 weeks) ===
    weekly_trend = []
    for i in range(4):
        week_end = today_start - timedelta(days=today_start.weekday()) - timedelta(weeks=i)
        week_start_trend = week_end - timedelta(days=7)
        count = await db.pm_tasks.count_documents({
            "parent_recurring_id": {"$ne": None},
            "created_at": {"$gte": week_start_trend.isoformat(), "$lt": week_end.isoformat()}
        })
        weekly_trend.append({
            "week_start": week_start_trend.strftime("%b %d"),
            "count": count
        })
    weekly_trend.reverse()
    
    # === NEW: Top Templates by Generation Count ===
    top_templates_pipeline = [
        {"$match": {"is_active": True}},
        {"$sort": {"occurrences_generated": -1}},
        {"$limit": 5},
        {"$project": {"_id": 0, "id": 1, "name": 1, "occurrences_generated": 1, "recurrence_type": 1}}
    ]
    top_templates = await db.recurring_task_templates.aggregate(top_templates_pipeline).to_list(5)
    
    # Upcoming occurrences (next 7 days)
    upcoming = []
    templates = await db.recurring_task_templates.find({
        "is_active": True,
        "is_paused": False
    }).to_list(100)
    
    for t in templates:
        next_occ = calculate_next_occurrence(t)
        if next_occ and next_occ <= datetime.now(timezone.utc) + timedelta(days=7):
            upcoming.append({
                "template_id": t.get("id"),
                "name": t.get("name"),
                "next_occurrence": next_occ.isoformat(),
                "recurrence_type": t.get("recurrence_type"),
                "assigned_to_name": await get_user_name(t.get("assigned_to")),
                "project_name": None
            })
            # Get project name if project_id exists
            if t.get("project_id"):
                project = await db.pm_projects.find_one({"id": t.get("project_id")}, {"_id": 0, "name": 1})
                if project:
                    upcoming[-1]["project_name"] = project.get("name")
    
    # Sort upcoming by date
    upcoming.sort(key=lambda x: x["next_occurrence"])
    
    return {
        "total_templates": total,
        "active_templates": active,
        "paused_templates": paused,
        "by_frequency": by_frequency,
        "tasks_generated_today": tasks_today,
        "tasks_generated_this_week": tasks_this_week,
        # New metrics
        "total_generated_all_time": total_generated,
        "completed_recurring": completed_recurring,
        "completion_rate": completion_rate,
        "overdue_recurring": overdue_recurring,
        "in_progress_recurring": in_progress_recurring,
        "by_project": by_project,
        "by_assignee": by_assignee,
        "weekly_trend": weekly_trend,
        "top_templates": top_templates,
        "upcoming_occurrences": upcoming[:10]
    }


# ============== MILESTONES ==============

@router.get("/{project_id}/milestones", response_model=List[MilestoneResponse])
async def list_project_milestones(
    project_id: str,
    status: Optional[MilestoneStatus] = None,
    user: dict = Depends(get_current_user_dep)
):
    """List all milestones for a project"""
    project = await db.pm_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    query = {"project_id": project_id}
    if status:
        query["status"] = status.value
    
    milestones = await db.pm_milestones.find(query, {"_id": 0}).sort("due_date", 1).to_list(100)
    
    # Enrich milestones
    for milestone in milestones:
        milestone["project_name"] = project.get("name")
        
        # Calculate progress from linked tasks
        linked_task_ids = milestone.get("linked_task_ids", [])
        if linked_task_ids:
            total = len(linked_task_ids)
            completed = await db.pm_tasks.count_documents({
                "id": {"$in": linked_task_ids},
                "status": {"$in": ["completed", "approved"]}
            })
            milestone["linked_tasks_count"] = total
            milestone["linked_tasks_completed"] = completed
            milestone["progress"] = round((completed / total * 100), 1) if total > 0 else 0
        else:
            milestone["linked_tasks_count"] = 0
            milestone["linked_tasks_completed"] = 0
            milestone["progress"] = 0
        
        # Get creator name
        if milestone.get("created_by"):
            milestone["created_by_name"] = await get_user_name(milestone["created_by"])
        if milestone.get("completed_by"):
            milestone["completed_by_name"] = await get_user_name(milestone["completed_by"])
    
    return milestones


@router.post("/milestones", response_model=MilestoneResponse)
async def create_milestone(
    data: MilestoneCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new milestone"""
    project = await db.pm_projects.find_one({"id": data.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    milestone_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    milestone_doc = {
        "id": milestone_id,
        "project_id": data.project_id,
        "name": data.name,
        "description": data.description,
        "due_date": data.due_date,
        "status": MilestoneStatus.UPCOMING.value,
        "linked_task_ids": data.linked_task_ids,
        "completion_notes": None,
        "completed_at": None,
        "completed_by": None,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_milestones.insert_one(milestone_doc)
    await log_activity("milestone", milestone_id, data.name, "created", user["id"])
    
    # Link tasks to this milestone
    if data.linked_task_ids:
        await db.pm_tasks.update_many(
            {"id": {"$in": data.linked_task_ids}},
            {"$set": {"milestone_id": milestone_id}}
        )
    
    if "_id" in milestone_doc:
        del milestone_doc["_id"]
    
    milestone_doc["project_name"] = project.get("name")
    milestone_doc["linked_tasks_count"] = len(data.linked_task_ids)
    milestone_doc["linked_tasks_completed"] = 0
    milestone_doc["progress"] = 0
    milestone_doc["created_by_name"] = user.get("name")
    
    return milestone_doc


@router.put("/milestones/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(
    milestone_id: str,
    data: MilestoneUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a milestone"""
    milestone = await db.pm_milestones.find_one({"id": milestone_id})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Handle status changes
    if data.status == MilestoneStatus.COMPLETED and milestone.get("status") != "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        update_data["completed_by"] = user["id"]
    
    # Handle linked task changes
    if data.linked_task_ids is not None:
        old_task_ids = set(milestone.get("linked_task_ids", []))
        new_task_ids = set(data.linked_task_ids)
        
        # Remove milestone_id from unlinked tasks
        removed = old_task_ids - new_task_ids
        if removed:
            await db.pm_tasks.update_many(
                {"id": {"$in": list(removed)}},
                {"$set": {"milestone_id": None}}
            )
        
        # Add milestone_id to new linked tasks
        added = new_task_ids - old_task_ids
        if added:
            await db.pm_tasks.update_many(
                {"id": {"$in": list(added)}},
                {"$set": {"milestone_id": milestone_id}}
            )
    
    await db.pm_milestones.update_one({"id": milestone_id}, {"$set": update_data})
    await log_activity("milestone", milestone_id, milestone.get("name"), "updated", user["id"], update_data)
    
    updated = await db.pm_milestones.find_one({"id": milestone_id}, {"_id": 0})
    
    # Enrich
    project = await db.pm_projects.find_one({"id": updated["project_id"]}, {"name": 1})
    updated["project_name"] = project.get("name") if project else None
    
    linked_task_ids = updated.get("linked_task_ids", [])
    if linked_task_ids:
        total = len(linked_task_ids)
        completed = await db.pm_tasks.count_documents({
            "id": {"$in": linked_task_ids},
            "status": {"$in": ["completed", "approved"]}
        })
        updated["linked_tasks_count"] = total
        updated["linked_tasks_completed"] = completed
        updated["progress"] = round((completed / total * 100), 1) if total > 0 else 0
    else:
        updated["linked_tasks_count"] = 0
        updated["linked_tasks_completed"] = 0
        updated["progress"] = 0
    
    if updated.get("created_by"):
        updated["created_by_name"] = await get_user_name(updated["created_by"])
    if updated.get("completed_by"):
        updated["completed_by_name"] = await get_user_name(updated["completed_by"])
    
    return updated


@router.delete("/milestones/{milestone_id}")
async def delete_milestone(
    milestone_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a milestone"""
    milestone = await db.pm_milestones.find_one({"id": milestone_id})
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    # Unlink tasks
    await db.pm_tasks.update_many(
        {"milestone_id": milestone_id},
        {"$set": {"milestone_id": None}}
    )
    
    await db.pm_milestones.delete_one({"id": milestone_id})
    await log_activity("milestone", milestone_id, milestone.get("name"), "deleted", user["id"])
    
    return {"message": "Milestone deleted"}


# ============== SPRINTS ==============

@router.get("/{project_id}/sprints", response_model=List[SprintResponse])
async def list_project_sprints(
    project_id: str,
    status: Optional[SprintStatus] = None,
    user: dict = Depends(get_current_user_dep)
):
    """List all sprints for a project"""
    project = await db.pm_projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    query = {"project_id": project_id}
    if status:
        query["status"] = status.value
    
    sprints = await db.pm_sprints.find(query, {"_id": 0}).sort("start_date", -1).to_list(100)
    
    # Enrich sprints
    for sprint in sprints:
        sprint["project_name"] = project.get("name")
        
        # Get task counts
        task_count = await db.pm_tasks.count_documents({"sprint_id": sprint["id"]})
        completed_count = await db.pm_tasks.count_documents({
            "sprint_id": sprint["id"],
            "status": {"$in": ["completed", "approved"]}
        })
        
        # Get story points
        pipeline = [
            {"$match": {"sprint_id": sprint["id"], "story_points": {"$ne": None}}},
            {"$group": {"_id": None, "total": {"$sum": "$story_points"}}}
        ]
        total_points_result = await db.pm_tasks.aggregate(pipeline).to_list(1)
        total_points = total_points_result[0]["total"] if total_points_result else 0
        
        completed_pipeline = [
            {"$match": {"sprint_id": sprint["id"], "story_points": {"$ne": None}, "status": {"$in": ["completed", "approved"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$story_points"}}}
        ]
        completed_points_result = await db.pm_tasks.aggregate(completed_pipeline).to_list(1)
        completed_points = completed_points_result[0]["total"] if completed_points_result else 0
        
        sprint["task_count"] = task_count
        sprint["completed_task_count"] = completed_count
        sprint["story_points_total"] = total_points
        sprint["story_points_completed"] = completed_points
        sprint["progress"] = round((completed_count / task_count * 100), 1) if task_count > 0 else 0
        
        if sprint.get("created_by"):
            sprint["created_by_name"] = await get_user_name(sprint["created_by"])
    
    return sprints


@router.post("/sprints", response_model=SprintResponse)
async def create_sprint(
    data: SprintCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new sprint"""
    project = await db.pm_projects.find_one({"id": data.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    sprint_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    sprint_doc = {
        "id": sprint_id,
        "project_id": data.project_id,
        "name": data.name,
        "goal": data.goal,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "status": SprintStatus.PLANNING.value,
        "retrospective_notes": None,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_sprints.insert_one(sprint_doc)
    await log_activity("sprint", sprint_id, data.name, "created", user["id"])
    
    if "_id" in sprint_doc:
        del sprint_doc["_id"]
    
    sprint_doc["project_name"] = project.get("name")
    sprint_doc["task_count"] = 0
    sprint_doc["completed_task_count"] = 0
    sprint_doc["story_points_total"] = 0
    sprint_doc["story_points_completed"] = 0
    sprint_doc["progress"] = 0
    sprint_doc["created_by_name"] = user.get("name")
    
    return sprint_doc


@router.put("/sprints/{sprint_id}", response_model=SprintResponse)
async def update_sprint(
    sprint_id: str,
    data: SprintUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a sprint"""
    sprint = await db.pm_sprints.find_one({"id": sprint_id})
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pm_sprints.update_one({"id": sprint_id}, {"$set": update_data})
    await log_activity("sprint", sprint_id, sprint.get("name"), "updated", user["id"], update_data)
    
    updated = await db.pm_sprints.find_one({"id": sprint_id}, {"_id": 0})
    
    # Enrich
    project = await db.pm_projects.find_one({"id": updated["project_id"]}, {"name": 1})
    updated["project_name"] = project.get("name") if project else None
    
    task_count = await db.pm_tasks.count_documents({"sprint_id": sprint_id})
    completed_count = await db.pm_tasks.count_documents({
        "sprint_id": sprint_id,
        "status": {"$in": ["completed", "approved"]}
    })
    
    updated["task_count"] = task_count
    updated["completed_task_count"] = completed_count
    updated["progress"] = round((completed_count / task_count * 100), 1) if task_count > 0 else 0
    
    if updated.get("created_by"):
        updated["created_by_name"] = await get_user_name(updated["created_by"])
    
    return updated


@router.delete("/sprints/{sprint_id}")
async def delete_sprint(
    sprint_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a sprint"""
    sprint = await db.pm_sprints.find_one({"id": sprint_id})
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    # Unlink tasks from this sprint
    await db.pm_tasks.update_many(
        {"sprint_id": sprint_id},
        {"$set": {"sprint_id": None}}
    )
    
    await db.pm_sprints.delete_one({"id": sprint_id})
    await log_activity("sprint", sprint_id, sprint.get("name"), "deleted", user["id"])
    
    return {"message": "Sprint deleted"}


@router.get("/sprints/{sprint_id}/tasks", response_model=List[TaskResponse])
async def get_sprint_tasks(
    sprint_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get all tasks in a sprint"""
    sprint = await db.pm_sprints.find_one({"id": sprint_id})
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    tasks = await db.pm_tasks.find({"sprint_id": sprint_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    enriched_tasks = [await enrich_task(t) for t in tasks]
    return enriched_tasks


@router.post("/sprints/{sprint_id}/start")
async def start_sprint(
    sprint_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Start a sprint (change status to active)"""
    sprint = await db.pm_sprints.find_one({"id": sprint_id})
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    if sprint.get("status") != "planning":
        raise HTTPException(status_code=400, detail="Sprint can only be started from planning status")
    
    # Check if there's already an active sprint
    active_sprint = await db.pm_sprints.find_one({
        "project_id": sprint["project_id"],
        "status": "active"
    })
    if active_sprint:
        raise HTTPException(status_code=400, detail="There is already an active sprint for this project")
    
    await db.pm_sprints.update_one(
        {"id": sprint_id},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    await log_activity("sprint", sprint_id, sprint.get("name"), "started", user["id"])
    
    return {"message": "Sprint started"}


@router.post("/sprints/{sprint_id}/complete")
async def complete_sprint(
    sprint_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Complete a sprint"""
    sprint = await db.pm_sprints.find_one({"id": sprint_id})
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    
    await db.pm_sprints.update_one(
        {"id": sprint_id},
        {"$set": {"status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    await log_activity("sprint", sprint_id, sprint.get("name"), "completed", user["id"])
    
    return {"message": "Sprint completed"}


# ============== TASK WATCHERS ==============

@router.get("/tasks/{task_id}/watchers", response_model=List[TaskWatcherResponse])
async def get_task_watchers(
    task_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get all watchers for a task"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    watchers = await db.task_watchers.find({"task_id": task_id}, {"_id": 0}).to_list(100)
    
    for watcher in watchers:
        user_doc = await db.users.find_one({"id": watcher["user_id"]}, {"name": 1, "email": 1})
        watcher["user_name"] = user_doc.get("name") if user_doc else None
        watcher["user_email"] = user_doc.get("email") if user_doc else None
    
    return watchers


@router.post("/tasks/{task_id}/watchers")
async def add_task_watcher(
    task_id: str,
    data: TaskWatcherCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Add a watcher to a task"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if already watching
    existing = await db.task_watchers.find_one({"task_id": task_id, "user_id": data.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="User is already watching this task")
    
    watcher_doc = {
        "id": str(uuid.uuid4()),
        "task_id": task_id,
        "user_id": data.user_id,
        "added_at": datetime.now(timezone.utc).isoformat(),
        "added_by": user["id"]
    }
    
    await db.task_watchers.insert_one(watcher_doc)
    
    # Update task's watcher list
    await db.pm_tasks.update_one(
        {"id": task_id},
        {"$addToSet": {"watchers": data.user_id}}
    )
    
    if "_id" in watcher_doc:
        del watcher_doc["_id"]
    
    user_doc = await db.users.find_one({"id": data.user_id}, {"name": 1, "email": 1})
    watcher_doc["user_name"] = user_doc.get("name") if user_doc else None
    watcher_doc["user_email"] = user_doc.get("email") if user_doc else None
    
    return watcher_doc


@router.delete("/tasks/{task_id}/watchers/{user_id}")
async def remove_task_watcher(
    task_id: str,
    user_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Remove a watcher from a task"""
    result = await db.task_watchers.delete_one({"task_id": task_id, "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Watcher not found")
    
    # Update task's watcher list
    await db.pm_tasks.update_one(
        {"id": task_id},
        {"$pull": {"watchers": user_id}}
    )
    
    return {"message": "Watcher removed"}


@router.post("/tasks/{task_id}/watch")
async def watch_task(
    task_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Current user starts watching a task"""
    task = await db.pm_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    user_id = user["id"]
    
    # Check if already watching
    existing = await db.task_watchers.find_one({"task_id": task_id, "user_id": user_id})
    if existing:
        return {"message": "Already watching this task", "watching": True}
    
    watcher_doc = {
        "id": str(uuid.uuid4()),
        "task_id": task_id,
        "user_id": user_id,
        "added_at": datetime.now(timezone.utc).isoformat(),
        "added_by": user_id
    }
    
    await db.task_watchers.insert_one(watcher_doc)
    await db.pm_tasks.update_one({"id": task_id}, {"$addToSet": {"watchers": user_id}})
    
    return {"message": "Now watching this task", "watching": True}


@router.delete("/tasks/{task_id}/watch")
async def unwatch_task(
    task_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Current user stops watching a task"""
    user_id = user["id"]
    
    await db.task_watchers.delete_one({"task_id": task_id, "user_id": user_id})
    await db.pm_tasks.update_one({"id": task_id}, {"$pull": {"watchers": user_id}})
    
    return {"message": "Stopped watching this task", "watching": False}


# ============== BULK OPERATIONS ==============

@router.post("/tasks/bulk/update", response_model=BulkOperationResult)
async def bulk_update_tasks(
    data: BulkTaskUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Bulk update multiple tasks"""
    if not data.task_ids:
        raise HTTPException(status_code=400, detail="No task IDs provided")
    
    now = datetime.now(timezone.utc).isoformat()
    update_fields = {"updated_at": now}
    
    if data.status:
        update_fields["status"] = data.status.value
    if data.priority:
        update_fields["priority"] = data.priority.value
    if data.assigned_to:
        update_fields["assigned_to"] = data.assigned_to
        update_fields["assigned_by"] = user["id"]
    if data.due_date:
        update_fields["due_date"] = data.due_date
    if data.sprint_id:
        update_fields["sprint_id"] = data.sprint_id
    
    success_count = 0
    failed_ids = []
    
    for task_id in data.task_ids:
        try:
            task = await db.pm_tasks.find_one({"id": task_id})
            if not task:
                failed_ids.append(task_id)
                continue
            
            update_data = dict(update_fields)
            
            # Handle tag operations
            if data.add_tags or data.remove_tags:
                current_tags = set(task.get("tags", []))
                if data.add_tags:
                    current_tags.update(data.add_tags)
                if data.remove_tags:
                    current_tags -= set(data.remove_tags)
                update_data["tags"] = list(current_tags)
            
            await db.pm_tasks.update_one({"id": task_id}, {"$set": update_data})
            success_count += 1
            
        except Exception as e:
            logger.error(f"Failed to update task {task_id}: {e}")
            failed_ids.append(task_id)
    
    await log_activity(
        "task", "bulk", f"{success_count} tasks", "bulk_updated", user["id"],
        {"task_count": success_count, "updates": {k: str(v) for k, v in update_fields.items() if k != "updated_at"}}
    )
    
    return BulkOperationResult(
        success_count=success_count,
        failed_count=len(failed_ids),
        failed_ids=failed_ids,
        message=f"Updated {success_count} tasks successfully"
    )


@router.post("/tasks/bulk/delete", response_model=BulkOperationResult)
async def bulk_delete_tasks(
    data: BulkTaskDelete,
    user: dict = Depends(get_current_user_dep)
):
    """Bulk delete multiple tasks"""
    if not data.task_ids:
        raise HTTPException(status_code=400, detail="No task IDs provided")
    
    success_count = 0
    failed_ids = []
    
    for task_id in data.task_ids:
        try:
            task = await db.pm_tasks.find_one({"id": task_id})
            if not task:
                failed_ids.append(task_id)
                continue
            
            # Check permission
            if not can_delete_record(task, user):
                failed_ids.append(task_id)
                continue
            
            # Delete related data
            await db.pm_subtasks.delete_many({"parent_task_id": task_id})
            await db.pm_checklists.delete_many({"task_id": task_id})
            await db.pm_comments.delete_many({"task_id": task_id})
            await db.task_watchers.delete_many({"task_id": task_id})
            
            await db.pm_tasks.delete_one({"id": task_id})
            success_count += 1
            
        except Exception as e:
            logger.error(f"Failed to delete task {task_id}: {e}")
            failed_ids.append(task_id)
    
    await log_activity(
        "task", "bulk", f"{success_count} tasks", "bulk_deleted", user["id"],
        {"task_count": success_count}
    )
    
    return BulkOperationResult(
        success_count=success_count,
        failed_count=len(failed_ids),
        failed_ids=failed_ids,
        message=f"Deleted {success_count} tasks successfully"
    )


# ============== TASK DUPLICATE ==============

@router.post("/tasks/duplicate", response_model=TaskResponse)
async def duplicate_task(
    data: TaskDuplicateRequest,
    user: dict = Depends(get_current_user_dep)
):
    """Duplicate a task with optional subtasks and checklists"""
    original_task = await db.pm_tasks.find_one({"id": data.task_id}, {"_id": 0})
    if not original_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    now = datetime.now(timezone.utc).isoformat()
    new_task_id = str(uuid.uuid4())
    
    # Create the duplicate task
    new_task = dict(original_task)
    new_task["id"] = new_task_id
    new_task["name"] = data.new_name or f"Copy of {original_task['name']}"
    new_task["status"] = TaskStatus.DRAFT.value
    new_task["assigned_to"] = data.assigned_to or original_task.get("assigned_to")
    new_task["created_by"] = user["id"]
    new_task["created_at"] = now
    new_task["updated_at"] = now
    new_task["watchers"] = []
    
    # Reset blocked_by/blocks (dependencies don't transfer)
    new_task["blocked_by"] = []
    new_task["blocks"] = []
    
    await db.pm_tasks.insert_one(new_task)
    
    # Duplicate subtasks if requested
    if data.include_subtasks:
        subtasks = await db.pm_subtasks.find({"parent_task_id": data.task_id}, {"_id": 0}).to_list(100)
        for subtask in subtasks:
            new_subtask = dict(subtask)
            new_subtask["id"] = str(uuid.uuid4())
            new_subtask["parent_task_id"] = new_task_id
            new_subtask["status"] = TaskStatus.DRAFT.value
            new_subtask["created_at"] = now
            new_subtask["updated_at"] = now
            await db.pm_subtasks.insert_one(new_subtask)
    
    # Duplicate checklists if requested
    if data.include_checklists:
        checklists = await db.pm_checklists.find({"task_id": data.task_id}, {"_id": 0}).to_list(100)
        for checklist in checklists:
            new_checklist = dict(checklist)
            new_checklist["id"] = str(uuid.uuid4())
            new_checklist["task_id"] = new_task_id
            new_checklist["is_completed"] = False
            new_checklist["completed_by"] = None
            new_checklist["completed_at"] = None
            new_checklist["created_at"] = now
            await db.pm_checklists.insert_one(new_checklist)
    
    await log_activity("task", new_task_id, new_task["name"], "duplicated", user["id"], {"original_task_id": data.task_id})
    
    return await enrich_task(new_task)

