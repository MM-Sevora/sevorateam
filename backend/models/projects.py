"""
Project Management System Models
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime


# ============== ENUMS ==============

class ProjectStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskStatus(str, Enum):
    DRAFT = "draft"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


# ============== MODULE MODELS ==============

class PMModuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    owner_id: Optional[str] = None
    color: str = "#8B7355"
    icon: str = "Folder"


class PMModuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None


class PMModuleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    color: str = "#8B7355"
    icon: str = "Folder"
    is_active: bool = True
    project_count: int = 0
    created_at: str
    updated_at: str


# ============== PROJECT MODELS ==============

class ProjectCreate(BaseModel):
    name: str
    module_id: str
    description: Optional[str] = None
    owner_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    team_members: List[str] = []
    tags: List[str] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[ProjectStatus] = None
    team_members: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    module_id: str
    module_name: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    status: ProjectStatus = ProjectStatus.DRAFT
    team_members: List[str] = []
    team_member_names: List[str] = []
    tags: List[str] = []
    task_count: int = 0
    completed_task_count: int = 0
    progress: float = 0.0
    created_by: Optional[str] = None
    created_at: str
    updated_at: str


# ============== TASK MODELS ==============

class TaskCreate(BaseModel):
    name: str
    project_id: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    tags: List[str] = []
    parent_task_id: Optional[str] = None  # For subtasks


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    tags: Optional[List[str]] = None


class TaskResponse(BaseModel):
    id: str
    name: str
    project_id: str
    project_name: Optional[str] = None
    module_id: Optional[str] = None
    module_name: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_by: Optional[str] = None
    assigned_by_name: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    status: TaskStatus = TaskStatus.DRAFT
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    tags: List[str] = []
    parent_task_id: Optional[str] = None
    subtask_count: int = 0
    checklist_count: int = 0
    checklist_completed: int = 0
    comment_count: int = 0
    attachment_count: int = 0
    created_by: Optional[str] = None
    created_at: str
    updated_at: str


# ============== SUBTASK MODELS ==============

class SubtaskCreate(BaseModel):
    name: str
    parent_task_id: str
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None


class SubtaskUpdate(BaseModel):
    name: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[str] = None


class SubtaskResponse(BaseModel):
    id: str
    name: str
    parent_task_id: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    status: TaskStatus = TaskStatus.DRAFT
    due_date: Optional[str] = None
    created_at: str
    updated_at: str


# ============== CHECKLIST MODELS ==============

class ChecklistItemCreate(BaseModel):
    task_id: str
    text: str
    assigned_to: Optional[str] = None


class ChecklistItemUpdate(BaseModel):
    text: Optional[str] = None
    is_completed: Optional[bool] = None
    assigned_to: Optional[str] = None


class ChecklistItemResponse(BaseModel):
    id: str
    task_id: str
    text: str
    is_completed: bool = False
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    completed_by: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str


# ============== COMMENT MODELS ==============

class TaskCommentCreate(BaseModel):
    task_id: str
    content: str
    mentions: List[str] = []  # User IDs mentioned


class TaskCommentResponse(BaseModel):
    id: str
    task_id: str
    content: str
    mentions: List[str] = []
    author_id: str
    author_name: Optional[str] = None
    created_at: str
    updated_at: str


# ============== ACTIVITY LOG MODELS ==============

class ActivityLogResponse(BaseModel):
    id: str
    entity_type: str  # project, task, subtask, checklist
    entity_id: str
    entity_name: Optional[str] = None
    action: str  # created, updated, status_changed, assigned, commented, etc.
    details: Dict = {}
    user_id: str
    user_name: Optional[str] = None
    created_at: str


# ============== TIME LOG MODELS ==============

class TimeLogCreate(BaseModel):
    task_id: str
    description: Optional[str] = None
    hours: Optional[float] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class TimeLogResponse(BaseModel):
    id: str
    task_id: str
    task_name: Optional[str] = None
    user_id: str
    user_name: Optional[str] = None
    description: Optional[str] = None
    hours: float = 0.0
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    created_at: str


# ============== DASHBOARD MODELS ==============

class MyTasksResponse(BaseModel):
    tasks_assigned: List[TaskResponse] = []
    tasks_due_today: List[TaskResponse] = []
    tasks_overdue: List[TaskResponse] = []
    tasks_in_progress: List[TaskResponse] = []
    tasks_pending_review: List[TaskResponse] = []
    recently_completed: List[TaskResponse] = []
    stats: Dict = {}


class ProjectDashboardResponse(BaseModel):
    project: ProjectResponse
    tasks_by_status: Dict[str, int] = {}
    tasks_by_priority: Dict[str, int] = {}
    team_workload: List[Dict] = []
    recent_activity: List[ActivityLogResponse] = []
    upcoming_deadlines: List[TaskResponse] = []
