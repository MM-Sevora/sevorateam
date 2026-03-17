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
    TODO = "todo"  # Added for backward compatibility
    NOT_STARTED = "not_started"  # For tasks created from blockers
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"


class IssueType(str, Enum):
    """Jira-like issue types for engineering tasks"""
    EPIC = "epic"           # Large feature/initiative containing stories
    STORY = "story"         # User story with acceptance criteria
    TASK = "task"           # General work item
    BUG = "bug"             # Defect/issue to fix
    SUBTASK = "subtask"     # Child task of any issue
    IMPROVEMENT = "improvement"  # Enhancement request
    SPIKE = "spike"         # Research/investigation task


class BugSeverity(str, Enum):
    """Severity levels for bugs"""
    CRITICAL = "critical"   # System down, data loss
    MAJOR = "major"         # Major feature broken
    MINOR = "minor"         # Minor feature issue
    TRIVIAL = "trivial"     # Cosmetic issues


class EpicStatus(str, Enum):
    """Status for Epics"""
    DRAFT = "draft"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


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
    module_id: Optional[str] = None  # Made optional - Module field removed from UI
    project_type: Optional[ProjectType] = ProjectType.OTHER  # Made optional - Project Type field removed from UI
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
    module_id: Optional[str] = None  # Made optional - Module field removed from UI
    module_name: Optional[str] = None
    project_type: Optional[ProjectType] = ProjectType.OTHER  # Made optional
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
    story_points: Optional[int] = None  # For sprint planning
    tags: List[str] = []
    parent_task_id: Optional[str] = None  # For subtasks
    blocked_by: List[str] = []  # Task IDs that block this task
    blocks: List[str] = []  # Task IDs that this task blocks
    external_links: List[ExternalLink] = []  # External URLs/documents
    sprint_id: Optional[str] = None  # Sprint this task belongs to
    milestone_id: Optional[str] = None  # Milestone this task is linked to
    # Issue Type (Jira-like)
    issue_type: IssueType = IssueType.TASK  # Default to task
    epic_id: Optional[str] = None  # Parent epic for stories/tasks
    # Bug-specific fields
    bug_severity: Optional[BugSeverity] = None
    reproduction_steps: Optional[str] = None
    expected_behavior: Optional[str] = None
    actual_behavior: Optional[str] = None
    environment: Optional[str] = None  # e.g., "Chrome 120, Windows 11"
    # Story-specific fields
    acceptance_criteria: Optional[str] = None
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
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    story_points: Optional[int] = None  # For sprint planning
    tags: Optional[List[str]] = None
    blocked_by: Optional[List[str]] = None
    blocks: Optional[List[str]] = None
    external_links: Optional[List[ExternalLink]] = None
    sprint_id: Optional[str] = None  # Sprint this task belongs to
    milestone_id: Optional[str] = None  # Milestone this task is linked to
    release_id: Optional[str] = None  # Release this task is linked to
    # Issue Type (Jira-like)
    issue_type: Optional[IssueType] = None
    epic_id: Optional[str] = None  # Parent epic for stories/tasks
    # Bug-specific fields
    bug_severity: Optional[BugSeverity] = None
    reproduction_steps: Optional[str] = None
    expected_behavior: Optional[str] = None
    actual_behavior: Optional[str] = None
    environment: Optional[str] = None
    # Story-specific fields
    acceptance_criteria: Optional[str] = None
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
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    story_points: Optional[int] = None  # For sprint planning
    tags: List[str] = []
    labels: List[Dict] = []  # List of {id, name, color}
    parent_task_id: Optional[str] = None
    blocked_by: List[str] = []
    blocked_by_names: List[str] = []  # Names of blocking tasks
    blocks: List[str] = []
    blocks_names: List[str] = []  # Names of tasks this blocks
    is_blocked: bool = False  # True if any blocking task is incomplete
    is_individual: bool = False  # True if not linked to any project
    # Issue Type (Jira-like)
    issue_type: IssueType = IssueType.TASK
    epic_id: Optional[str] = None
    epic_name: Optional[str] = None
    # Bug-specific fields
    bug_severity: Optional[BugSeverity] = None
    reproduction_steps: Optional[str] = None
    expected_behavior: Optional[str] = None
    actual_behavior: Optional[str] = None
    environment: Optional[str] = None
    # Story-specific fields
    acceptance_criteria: Optional[str] = None
    # Sprint & Milestone
    sprint_id: Optional[str] = None
    sprint_name: Optional[str] = None
    milestone_id: Optional[str] = None
    milestone_name: Optional[str] = None
    # Release/Version
    release_id: Optional[str] = None
    release_name: Optional[str] = None
    # Watchers
    watchers: List[str] = []  # User IDs watching this task
    watcher_count: int = 0
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


# ============== EPIC MODELS ==============

class EpicCreate(BaseModel):
    """Create a new Epic - container for related stories/tasks"""
    name: str
    description: Optional[str] = None
    owner_id: Optional[str] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    color: str = "#8B5CF6"  # Default purple for epics
    labels: List[str] = []


class EpicUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[str] = None
    status: Optional[EpicStatus] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    priority: Optional[Priority] = None
    color: Optional[str] = None
    labels: Optional[List[str]] = None


class EpicResponse(BaseModel):
    id: str
    name: str
    project_id: str
    project_name: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    status: EpicStatus = EpicStatus.TODO
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    color: str = "#8B5CF6"
    labels: List[str] = []
    # Progress tracking
    total_issues: int = 0
    completed_issues: int = 0
    total_story_points: int = 0
    completed_story_points: int = 0
    progress_percent: float = 0.0
    # Linked items
    story_ids: List[str] = []
    task_ids: List[str] = []
    bug_ids: List[str] = []
    created_by: Optional[str] = None
    created_at: str
    updated_at: str


# ============== BACKLOG MODELS ==============

class BacklogItemResponse(BaseModel):
    """Item in the backlog view"""
    id: str
    name: str
    issue_type: IssueType
    priority: Priority
    status: TaskStatus
    story_points: Optional[int] = None
    epic_id: Optional[str] = None
    epic_name: Optional[str] = None
    epic_color: Optional[str] = None
    sprint_id: Optional[str] = None
    sprint_name: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    due_date: Optional[str] = None
    created_at: str


class BacklogResponse(BaseModel):
    """Backlog view response"""
    backlog_items: List[BacklogItemResponse] = []  # Items not in any sprint
    total_items: int = 0
    total_story_points: int = 0


# ============== BURNDOWN CHART MODELS ==============

class BurndownDataPoint(BaseModel):
    """Single data point in burndown chart"""
    date: str
    ideal_remaining: float  # Ideal burndown line
    actual_remaining: float  # Actual remaining work
    completed: float  # Work completed by this date


class BurndownChartResponse(BaseModel):
    """Burndown chart data for a sprint"""
    sprint_id: str
    sprint_name: str
    start_date: str
    end_date: str
    total_story_points: int
    completed_story_points: int
    data_points: List[BurndownDataPoint] = []


# ============== VELOCITY CHART MODELS ==============

class VelocityDataPoint(BaseModel):
    """Velocity data for a single sprint"""
    sprint_id: str
    sprint_name: str
    committed_points: int  # Story points committed at sprint start
    completed_points: int  # Story points actually completed
    start_date: str
    end_date: str


class VelocityChartResponse(BaseModel):
    """Velocity chart showing team performance over sprints"""
    sprints: List[VelocityDataPoint] = []
    average_velocity: float = 0.0
    trend: str = "stable"  # increasing, decreasing, stable


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



# ============== RECURRING TASK MODELS ==============

class RecurrenceType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class RecurrenceEndType(str, Enum):
    NEVER = "never"
    END_DATE = "end_date"
    AFTER_OCCURRENCES = "after_occurrences"


class MonthlyRepeatType(str, Enum):
    DAY_OF_MONTH = "day_of_month"  # e.g., 15th of every month
    WEEKDAY_OF_MONTH = "weekday_of_month"  # e.g., First Monday


class RecurringTaskTemplateCreate(BaseModel):
    """Template for recurring tasks"""
    name: str
    description: Optional[str] = None
    project_id: Optional[str] = None  # Optional - can be standalone
    department_id: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    tags: List[str] = []
    estimated_hours: Optional[float] = None
    
    # Recurrence Settings
    recurrence_type: RecurrenceType = RecurrenceType.WEEKLY
    frequency: int = 1  # Every X days/weeks/months
    
    # Weekly settings
    repeat_on_days: List[int] = []  # 0=Monday, 1=Tuesday, ..., 6=Sunday
    
    # Monthly settings
    monthly_repeat_type: MonthlyRepeatType = MonthlyRepeatType.DAY_OF_MONTH
    day_of_month: Optional[int] = None  # 1-31
    week_of_month: Optional[int] = None  # 1=First, 2=Second, -1=Last
    weekday_of_month: Optional[int] = None  # 0=Monday, ..., 6=Sunday
    
    # End settings
    recurrence_end_type: RecurrenceEndType = RecurrenceEndType.NEVER
    end_date: Optional[str] = None
    max_occurrences: Optional[int] = None
    
    # Start settings
    start_date: str  # When to start generating tasks
    task_due_offset_days: int = 0  # Task due X days after generation


class RecurringTaskTemplateUpdate(BaseModel):
    """Update recurring task template"""
    name: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[str] = None
    department_id: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[Priority] = None
    tags: Optional[List[str]] = None
    estimated_hours: Optional[float] = None
    
    # Recurrence Settings
    recurrence_type: Optional[RecurrenceType] = None
    frequency: Optional[int] = None
    repeat_on_days: Optional[List[int]] = None
    monthly_repeat_type: Optional[MonthlyRepeatType] = None
    day_of_month: Optional[int] = None
    week_of_month: Optional[int] = None
    weekday_of_month: Optional[int] = None
    recurrence_end_type: Optional[RecurrenceEndType] = None
    end_date: Optional[str] = None
    max_occurrences: Optional[int] = None
    start_date: Optional[str] = None
    task_due_offset_days: Optional[int] = None
    
    # Status
    is_active: Optional[bool] = None
    is_paused: Optional[bool] = None


class RecurringTaskTemplateResponse(BaseModel):
    """Response for recurring task template"""
    id: str
    name: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    tags: List[str] = []
    estimated_hours: Optional[float] = None
    
    # Recurrence Settings
    recurrence_type: RecurrenceType
    frequency: int = 1
    repeat_on_days: List[int] = []
    monthly_repeat_type: MonthlyRepeatType = MonthlyRepeatType.DAY_OF_MONTH
    day_of_month: Optional[int] = None
    week_of_month: Optional[int] = None
    weekday_of_month: Optional[int] = None
    recurrence_end_type: RecurrenceEndType = RecurrenceEndType.NEVER
    end_date: Optional[str] = None
    max_occurrences: Optional[int] = None
    start_date: str
    task_due_offset_days: int = 0
    
    # Status
    is_active: bool = True
    is_paused: bool = False
    
    # Statistics
    occurrences_generated: int = 0
    next_occurrence: Optional[str] = None
    last_generated: Optional[str] = None
    
    # Metadata
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: str
    updated_at: str
    
    # Display helpers
    recurrence_description: str = ""  # Human-readable recurrence description


class GeneratedTaskInfo(BaseModel):
    """Info about a generated task from a recurring template"""
    id: str
    name: str
    status: TaskStatus
    due_date: Optional[str] = None
    assigned_to_name: Optional[str] = None
    generated_at: str



# ============== MILESTONE MODELS ==============

class MilestoneStatus(str, Enum):
    UPCOMING = "upcoming"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    MISSED = "missed"


class MilestoneCreate(BaseModel):
    """Create a project milestone"""
    project_id: str
    name: str
    description: Optional[str] = None
    due_date: str
    linked_task_ids: List[str] = []  # Tasks that must be completed for milestone


class MilestoneUpdate(BaseModel):
    """Update a milestone"""
    name: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[MilestoneStatus] = None
    linked_task_ids: Optional[List[str]] = None
    completion_notes: Optional[str] = None


class MilestoneResponse(BaseModel):
    """Milestone response"""
    id: str
    project_id: str
    project_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    due_date: str
    status: MilestoneStatus = MilestoneStatus.UPCOMING
    linked_task_ids: List[str] = []
    linked_tasks_count: int = 0
    linked_tasks_completed: int = 0
    progress: float = 0.0
    completion_notes: Optional[str] = None
    completed_at: Optional[str] = None
    completed_by: Optional[str] = None
    completed_by_name: Optional[str] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: str
    updated_at: str


# ============== SPRINT MODELS ==============

class SprintStatus(str, Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SprintCreate(BaseModel):
    """Create a sprint/iteration"""
    project_id: str
    name: str
    goal: Optional[str] = None
    start_date: str
    end_date: str


class SprintUpdate(BaseModel):
    """Update a sprint"""
    name: Optional[str] = None
    goal: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[SprintStatus] = None
    retrospective_notes: Optional[str] = None


class SprintResponse(BaseModel):
    """Sprint response"""
    id: str
    project_id: str
    project_name: Optional[str] = None
    name: str
    goal: Optional[str] = None
    start_date: str
    end_date: str
    status: SprintStatus = SprintStatus.PLANNING
    task_count: int = 0
    completed_task_count: int = 0
    story_points_total: int = 0
    story_points_completed: int = 0
    progress: float = 0.0
    retrospective_notes: Optional[str] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: str
    updated_at: str


# ============== TASK WATCHER MODELS ==============

class TaskWatcherCreate(BaseModel):
    """Add a watcher to a task"""
    task_id: str
    user_id: str


class TaskWatcherResponse(BaseModel):
    """Task watcher response"""
    id: str
    task_id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    added_at: str
    added_by: Optional[str] = None


# ============== BULK OPERATION MODELS ==============

class BulkTaskUpdate(BaseModel):
    """Bulk update multiple tasks"""
    task_ids: List[str]
    status: Optional[TaskStatus] = None
    priority: Optional[Priority] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    sprint_id: Optional[str] = None
    add_tags: List[str] = []
    remove_tags: List[str] = []


class BulkTaskDelete(BaseModel):
    """Bulk delete tasks"""
    task_ids: List[str]


class BulkOperationResult(BaseModel):
    """Result of bulk operation"""
    success_count: int = 0
    failed_count: int = 0
    failed_ids: List[str] = []
    message: str = ""


# ============== TASK DUPLICATE MODEL ==============

class TaskDuplicateRequest(BaseModel):
    """Request to duplicate a task"""
    task_id: str
    include_subtasks: bool = True
    include_checklists: bool = True
    include_attachments: bool = False
    new_name: Optional[str] = None  # If not provided, will use "Copy of {original_name}"
    assigned_to: Optional[str] = None  # Override assignee


# ============== KANBAN BOARD MODELS ==============

class KanbanColumn(BaseModel):
    """Kanban board column"""
    id: str
    name: str
    status: TaskStatus
    task_count: int = 0
    wip_limit: Optional[int] = None  # Work-in-progress limit


class KanbanBoardResponse(BaseModel):
    """Kanban board response"""
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    columns: List[KanbanColumn] = []
    tasks_by_column: Dict[str, List[TaskResponse]] = {}
    total_tasks: int = 0



# ============== RELEASE/VERSION MODELS ==============

class ReleaseStatus(str, Enum):
    """Status for releases/versions"""
    PLANNED = "planned"           # Not started
    IN_PROGRESS = "in_progress"   # Development ongoing
    READY_FOR_RELEASE = "ready"   # QA complete, awaiting deployment
    RELEASED = "released"         # Live in production
    ARCHIVED = "archived"         # Old version


class ReleaseCreate(BaseModel):
    """Create a new release/version"""
    project_id: str
    name: str  # e.g., "v1.2.0", "2024-Q1 Release"
    description: Optional[str] = None
    start_date: Optional[str] = None
    release_date: Optional[str] = None  # Target release date
    status: ReleaseStatus = ReleaseStatus.PLANNED


class ReleaseUpdate(BaseModel):
    """Update release/version"""
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    release_date: Optional[str] = None
    actual_release_date: Optional[str] = None  # When actually released
    status: Optional[ReleaseStatus] = None


class ReleaseResponse(BaseModel):
    """Release/version response"""
    id: str
    project_id: str
    project_name: Optional[str] = None
    name: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    release_date: Optional[str] = None
    actual_release_date: Optional[str] = None
    status: ReleaseStatus = ReleaseStatus.PLANNED
    # Computed fields
    total_issues: int = 0
    completed_issues: int = 0
    progress: float = 0  # Percentage
    story_points_total: int = 0
    story_points_completed: int = 0
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
