"""
Project Management System Models
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime


# ============== ENUMS ==============

class ProjectVisibility(str, Enum):
    PUBLIC = "public"    # Visible to all employees
    PRIVATE = "private"  # Only visible to team members


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ProjectType(str, Enum):
    MARKETING = "marketing"
    DEVELOPMENT = "development"
    PR = "pr"
    DESIGN = "design"
    OPERATIONS = "operations"
    OTHER = "other"


class ProjectRole(str, Enum):
    OWNER = "owner"           # Full control
    MANAGER = "manager"       # Manage tasks & members
    MEMBER = "member"         # Work on tasks
    STAKEHOLDER = "stakeholder"  # View only


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

class ProjectMemberCreate(BaseModel):
    user_id: str
    role: ProjectRole = ProjectRole.MEMBER


class ProjectCreate(BaseModel):
    name: str
    module_id: str
    project_type: ProjectType = ProjectType.OTHER
    department_id: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[str] = None
    project_manager_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    visibility: str = "public"  # public or private
    team_members: List[str] = []
    stakeholders: List[str] = []
    tags: List[str] = []
    linked_objective_id: Optional[str] = None  # Link to Goals & Objectives module


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    project_type: Optional[ProjectType] = None
    department_id: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[str] = None
    project_manager_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[ProjectStatus] = None
    visibility: Optional[str] = None  # public or private
    team_members: Optional[List[str]] = None
    stakeholders: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    linked_objective_id: Optional[str] = None  # Link to Goals & Objectives module


class ProjectResponse(BaseModel):
    id: str
    project_id: str  # Auto-generated PRJ-XXXX format
    name: str
    module_id: str
    module_name: Optional[str] = None
    project_type: ProjectType = ProjectType.OTHER
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    project_manager_id: Optional[str] = None
    project_manager_name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    status: ProjectStatus = ProjectStatus.DRAFT
    visibility: str = "public"  # public or private
    team_members: List[str] = []
    team_member_names: List[str] = []
    stakeholders: List[str] = []
    stakeholder_names: List[str] = []
    tags: List[str] = []
    task_count: int = 0
    completed_task_count: int = 0
    progress: float = 0.0
    linked_objective_id: Optional[str] = None
    linked_objective_title: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str
    updated_at: str


# ============== EXTERNAL LINK MODEL ==============

class ExternalLink(BaseModel):
    """External link/reference attached to a task"""
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    link_type: str = "url"  # url, document, video, image, other


# ============== TASK MODELS ==============

class TaskCreate(BaseModel):
    name: str
    project_id: Optional[str] = None  # Optional for individual tasks
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    tags: List[str] = []
    parent_task_id: Optional[str] = None  # For subtasks
    blocked_by: List[str] = []  # Task IDs that block this task
    blocks: List[str] = []  # Task IDs that this task blocks
    external_links: List[ExternalLink] = []  # External URLs/documents
    # Recurrence fields
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # daily, weekly, monthly, custom
    recurrence_interval: int = 1  # Every X days/weeks/months
    recurrence_days: Optional[List[int]] = None  # For weekly: [0,1,2,3,4,5,6] = Mon-Sun
    recurrence_end_date: Optional[str] = None


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
    blocked_by: Optional[List[str]] = None
    blocks: Optional[List[str]] = None
    external_links: Optional[List[ExternalLink]] = None
    # Recurrence fields
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    recurrence_interval: Optional[int] = None
    recurrence_days: Optional[List[int]] = None
    recurrence_end_date: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    name: str
    project_id: Optional[str] = None  # Optional for individual tasks
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
    labels: List[Dict] = []  # List of {id, name, color}
    parent_task_id: Optional[str] = None
    blocked_by: List[str] = []
    blocked_by_names: List[str] = []  # Names of blocking tasks
    blocks: List[str] = []
    blocks_names: List[str] = []  # Names of tasks this blocks
    is_blocked: bool = False  # True if any blocking task is incomplete
    is_individual: bool = False  # True if not linked to any project
    # Recurrence fields
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    recurrence_interval: int = 1
    recurrence_days: Optional[List[int]] = None
    recurrence_end_date: Optional[str] = None
    parent_recurring_id: Optional[str] = None  # ID of the parent recurring task
    # Counts
    subtask_count: int = 0
    checklist_count: int = 0
    checklist_completed: int = 0
    comment_count: int = 0
    attachment_count: int = 0
    external_links: List[ExternalLink] = []
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


# ============== ATTACHMENT MODELS ==============

class AttachmentResponse(BaseModel):
    id: str
    task_id: str
    original_filename: str
    storage_path: str
    content_type: str
    size: int
    uploaded_by: Optional[str] = None
    uploaded_by_name: Optional[str] = None
    created_at: str


# ============== LABEL MODELS ==============

class LabelCreate(BaseModel):
    name: str
    color: str = "blue"  # red, orange, yellow, green, blue, purple, pink, gray
    project_id: Optional[str] = None  # If None, label is available for all projects


class LabelUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class LabelResponse(BaseModel):
    id: str
    name: str
    color: str
    project_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: str


class TaskLabelResponse(BaseModel):
    id: str
    name: str
    color: str



# ============== TASK TEMPLATE MODELS ==============

class TemplateCategory(str, Enum):
    MEETINGS = "meetings"
    REPORTS = "reports"
    SPRINTS = "sprints"
    CHECKLISTS = "checklists"
    OTHER = "other"


class TaskTemplateChecklistItem(BaseModel):
    text: str
    assigned_to: Optional[str] = None


class TaskTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    project_id: Optional[str] = None  # None = global template
    category: TemplateCategory = TemplateCategory.OTHER
    default_priority: Priority = Priority.MEDIUM
    default_assignee: Optional[str] = None
    estimated_hours: Optional[float] = None
    default_labels: List[str] = []  # Label IDs
    default_tags: List[str] = []
    checklist_items: List[TaskTemplateChecklistItem] = []
    # Recurring settings
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    recurrence_interval: int = 1


class TaskTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[TemplateCategory] = None
    default_priority: Optional[Priority] = None
    default_assignee: Optional[str] = None
    estimated_hours: Optional[float] = None
    default_labels: Optional[List[str]] = None
    default_tags: Optional[List[str]] = None
    checklist_items: Optional[List[TaskTemplateChecklistItem]] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    recurrence_interval: Optional[int] = None


class TaskTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None  # "Global" if project_id is None
    category: str = "other"
    default_priority: Priority = Priority.MEDIUM
    default_assignee: Optional[str] = None
    default_assignee_name: Optional[str] = None
    estimated_hours: Optional[float] = None
    default_labels: List[str] = []
    default_label_names: List[Dict] = []  # [{id, name, color}]
    default_tags: List[str] = []
    checklist_items: List[TaskTemplateChecklistItem] = []
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    recurrence_interval: int = 1
    usage_count: int = 0
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: str
    updated_at: str


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


class TeamMemberWorkload(BaseModel):
    user_id: str
    user_name: str
    total_tasks: int = 0
    completed_tasks: int = 0
    in_progress_tasks: int = 0
    overdue_tasks: int = 0


class ProjectSummary(BaseModel):
    id: str
    project_id: str
    name: str
    status: str
    priority: str
    progress: float = 0.0
    task_count: int = 0
    completed_task_count: int = 0
    overdue_task_count: int = 0
    end_date: Optional[str] = None
    is_at_risk: bool = False


class ManagerDashboardResponse(BaseModel):
    """Manager's overview dashboard for project management"""
    # Project Stats
    total_projects: int = 0
    active_projects: int = 0
    completed_projects: int = 0
    on_hold_projects: int = 0
    at_risk_projects: int = 0
    
    # Task Stats
    total_tasks: int = 0
    completed_tasks: int = 0
    overdue_tasks: int = 0
    unassigned_tasks: int = 0
    blocked_tasks: int = 0
    
    # Breakdowns
    projects_by_status: Dict[str, int] = {}
    projects_by_priority: Dict[str, int] = {}
    tasks_by_status: Dict[str, int] = {}
    
    # Team Workload
    team_workload: List[TeamMemberWorkload] = []
    
    # At-Risk Projects (overdue/blocked/stalled)
    at_risk_project_list: List[ProjectSummary] = []
    
    # Upcoming Deadlines (projects ending soon)
    upcoming_deadlines: List[ProjectSummary] = []
    
    # Recent Activity
    recent_activity: List[ActivityLogResponse] = []
    
    # Weekly Progress (for burndown-style chart)
    weekly_completion: List[Dict] = []
