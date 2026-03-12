"""
Content Production Models - Database schemas for content workflow management

Collections:
- marketing_content_projects: Content production projects
- marketing_content_tasks: Individual tasks within projects
- marketing_content_reviews: Approval/review records
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


# ============== ENUMS ==============

class ContentType(str, Enum):
    VIDEO = "video"
    PHOTO = "photo"
    REEL = "reel"
    STORY = "story"
    CAROUSEL = "carousel"
    BLOG = "blog"
    GRAPHIC = "graphic"
    ANIMATION = "animation"
    PODCAST = "podcast"
    OTHER = "other"


class ProjectType(str, Enum):
    ORIGINAL_PRODUCTION = "original_production"  # Full workflow with shoot
    ADAPTATION = "adaptation"  # Repurpose existing content, no shoot
    DELIVERY_ONLY = "delivery_only"  # Just format/export for different platform
    GRAPHICS = "graphics"  # Static design work


class ContentPlatform(str, Enum):
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    WEBSITE = "website"
    EMAIL = "email"
    MULTI = "multi"


class ProjectStatus(str, Enum):
    IDEA = "idea"
    BRIEFING = "briefing"
    SCHEDULED = "scheduled"
    IN_PRODUCTION = "in_production"
    SHOOTING = "shooting"
    EDITING = "editing"
    REVIEW = "review"
    REVISIONS = "revisions"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskType(str, Enum):
    BRIEFING = "briefing"
    SCRIPTING = "scripting"
    STORYBOARD = "storyboard"
    SHOOT = "shoot"
    EDITING = "editing"
    GRAPHICS = "graphics"
    SOUND = "sound"
    COLOR_GRADE = "color_grade"
    REVIEW = "review"
    REVISIONS = "revisions"
    EXPORT = "export"
    UPLOAD = "upload"
    OTHER = "other"


class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


# ============== CONTENT PROJECTS ==============

class ContentProjectBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    
    # Project type determines workflow (HOW)
    project_type: Optional[str] = None  # Now uses config slug
    
    # Content classification (WHAT) - NEW
    content_category: Optional[str] = None  # e.g., "written", "product", "social"
    content_sub_type: Optional[str] = None  # e.g., "blog_article", "product_images"
    
    # Legacy content_type for backward compatibility
    content_type: Optional[ContentType] = None
    
    # Publishing medium (WHERE) - replaces platform
    medium: Optional[str] = None  # e.g., "website", "instagram"
    platform: Optional[ContentPlatform] = None  # Legacy, keep for compatibility
    
    # Source content (for adaptation/delivery projects)
    source_project_id: Optional[str] = None  # Link to parent project
    source_asset_id: Optional[str] = None  # Link to existing asset
    
    campaign_id: Optional[str] = None
    influencer_id: Optional[str] = None  # If influencer collaboration
    
    # Dates
    brief_date: Optional[date] = None
    shoot_date: Optional[date] = None
    due_date: Optional[date] = None  # NEW
    edit_deadline: Optional[date] = None
    publish_date: Optional[date] = None
    
    # Team
    producer_id: Optional[str] = None
    director_id: Optional[str] = None
    editor_id: Optional[str] = None
    assigned_to: List[str] = []
    
    # Details
    concept: Optional[str] = None
    brief: Optional[str] = None  # NEW - replaces concept
    script: Optional[str] = None
    shot_list: Optional[str] = None
    location: Optional[str] = None
    talent: List[str] = []
    
    # Budget
    estimated_budget: float = 0
    actual_cost: float = 0
    
    # Status
    status: ProjectStatus = ProjectStatus.IDEA
    priority: Priority = Priority.MEDIUM
    
    # Linked assets
    asset_ids: List[str] = []
    final_asset_id: Optional[str] = None
    
    # Metadata
    tags: List[str] = []
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ContentProjectCreate(ContentProjectBase):
    pass


class ContentProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project_type: Optional[str] = None  # Changed to str for config slug
    content_category: Optional[str] = None  # NEW
    content_sub_type: Optional[str] = None  # NEW
    content_type: Optional[ContentType] = None  # Legacy
    medium: Optional[str] = None  # NEW
    platform: Optional[ContentPlatform] = None  # Legacy
    source_project_id: Optional[str] = None
    source_asset_id: Optional[str] = None
    campaign_id: Optional[str] = None
    influencer_id: Optional[str] = None
    brief_date: Optional[date] = None
    shoot_date: Optional[date] = None
    due_date: Optional[date] = None  # NEW
    edit_deadline: Optional[date] = None
    publish_date: Optional[date] = None
    producer_id: Optional[str] = None
    director_id: Optional[str] = None
    editor_id: Optional[str] = None
    assigned_to: Optional[List[str]] = None
    concept: Optional[str] = None
    brief: Optional[str] = None  # NEW
    script: Optional[str] = None
    shot_list: Optional[str] = None
    location: Optional[str] = None
    talent: Optional[List[str]] = None
    estimated_budget: Optional[float] = None
    actual_cost: Optional[float] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[Priority] = None
    asset_ids: Optional[List[str]] = None
    final_asset_id: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


class ContentProjectResponse(ContentProjectBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    task_count: int = 0
    completed_tasks: int = 0
    source_project_title: Optional[str] = None  # For displaying linked project
    
    class Config:
        from_attributes = True


# ============== CONTENT TASKS ==============

class ContentTaskBase(BaseModel):
    project_id: str
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = None
    task_type: TaskType
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    status: TaskStatus = TaskStatus.TODO
    priority: Priority = Priority.MEDIUM
    dependencies: List[str] = []  # Task IDs this depends on
    notes: Optional[str] = None


class ContentTaskCreate(ContentTaskBase):
    pass


class ContentTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[TaskType] = None
    assigned_to: Optional[str] = None
    due_date: Optional[date] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    status: Optional[TaskStatus] = None
    priority: Optional[Priority] = None
    dependencies: Optional[List[str]] = None
    notes: Optional[str] = None


class ContentTaskResponse(ContentTaskBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============== CONTENT REVIEWS ==============

class ContentReviewBase(BaseModel):
    project_id: str
    reviewer_id: str
    version: int = 1
    status: ReviewStatus = ReviewStatus.PENDING
    feedback: Optional[str] = None
    changes_requested: List[str] = []
    asset_id: Optional[str] = None  # The asset being reviewed


class ContentReviewCreate(ContentReviewBase):
    pass


class ContentReviewUpdate(BaseModel):
    status: Optional[ReviewStatus] = None
    feedback: Optional[str] = None
    changes_requested: Optional[List[str]] = None


class ContentReviewResponse(ContentReviewBase):
    id: str
    reviewer_name: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============== WORKFLOW TEMPLATES ==============

class WorkflowStep(BaseModel):
    order: int
    task_type: TaskType
    title: str
    default_assignee_role: Optional[str] = None  # producer, editor, etc.
    estimated_hours: Optional[float] = None
    requires_approval: bool = False


class WorkflowTemplate(BaseModel):
    name: str
    content_type: ContentType
    steps: List[WorkflowStep]


# ============== STATS ==============

class ContentProductionStats(BaseModel):
    total_projects: int
    by_status: Dict[str, int]
    by_type: Dict[str, int]
    by_platform: Dict[str, int]
    projects_this_month: int
    overdue_projects: int
    avg_production_days: float


# Default workflow templates
DEFAULT_WORKFLOWS = {
    ContentType.VIDEO: [
        WorkflowStep(order=1, task_type=TaskType.BRIEFING, title="Create Brief", estimated_hours=2),
        WorkflowStep(order=2, task_type=TaskType.SCRIPTING, title="Write Script", estimated_hours=4),
        WorkflowStep(order=3, task_type=TaskType.STORYBOARD, title="Create Storyboard", estimated_hours=3),
        WorkflowStep(order=4, task_type=TaskType.SHOOT, title="Video Shoot", estimated_hours=8),
        WorkflowStep(order=5, task_type=TaskType.EDITING, title="Edit Video", estimated_hours=6),
        WorkflowStep(order=6, task_type=TaskType.COLOR_GRADE, title="Color Grade", estimated_hours=2),
        WorkflowStep(order=7, task_type=TaskType.SOUND, title="Sound Design", estimated_hours=2),
        WorkflowStep(order=8, task_type=TaskType.REVIEW, title="Review & Approval", requires_approval=True),
        WorkflowStep(order=9, task_type=TaskType.EXPORT, title="Export Final", estimated_hours=1),
    ],
    ContentType.PHOTO: [
        WorkflowStep(order=1, task_type=TaskType.BRIEFING, title="Create Brief", estimated_hours=1),
        WorkflowStep(order=2, task_type=TaskType.SHOOT, title="Photo Shoot", estimated_hours=4),
        WorkflowStep(order=3, task_type=TaskType.EDITING, title="Retouch & Edit", estimated_hours=3),
        WorkflowStep(order=4, task_type=TaskType.REVIEW, title="Review & Approval", requires_approval=True),
        WorkflowStep(order=5, task_type=TaskType.EXPORT, title="Export Final", estimated_hours=1),
    ],
    ContentType.REEL: [
        WorkflowStep(order=1, task_type=TaskType.BRIEFING, title="Create Brief", estimated_hours=1),
        WorkflowStep(order=2, task_type=TaskType.SCRIPTING, title="Write Script/Hook", estimated_hours=1),
        WorkflowStep(order=3, task_type=TaskType.SHOOT, title="Record Reel", estimated_hours=2),
        WorkflowStep(order=4, task_type=TaskType.EDITING, title="Edit & Add Effects", estimated_hours=2),
        WorkflowStep(order=5, task_type=TaskType.REVIEW, title="Review & Approval", requires_approval=True),
    ],
    ContentType.GRAPHIC: [
        WorkflowStep(order=1, task_type=TaskType.BRIEFING, title="Create Brief", estimated_hours=1),
        WorkflowStep(order=2, task_type=TaskType.GRAPHICS, title="Design Graphic", estimated_hours=3),
        WorkflowStep(order=3, task_type=TaskType.REVIEW, title="Review & Approval", requires_approval=True),
        WorkflowStep(order=4, task_type=TaskType.EXPORT, title="Export Versions", estimated_hours=1),
    ],
}

# Workflows by Project Type
WORKFLOWS_BY_PROJECT_TYPE = {
    # Original Production - Full workflow with shoot (uses DEFAULT_WORKFLOWS based on content type)
    ProjectType.ORIGINAL_PRODUCTION: None,  # Will use DEFAULT_WORKFLOWS
    
    # Adaptation - No shoot, start from editing
    ProjectType.ADAPTATION: [
        WorkflowStep(order=1, task_type=TaskType.BRIEFING, title="Create Brief", estimated_hours=1),
        WorkflowStep(order=2, task_type=TaskType.OTHER, title="Select Source Content", estimated_hours=0.5),
        WorkflowStep(order=3, task_type=TaskType.EDITING, title="Edit & Adapt", estimated_hours=4),
        WorkflowStep(order=4, task_type=TaskType.COLOR_GRADE, title="Color/Sound Adjustments", estimated_hours=1),
        WorkflowStep(order=5, task_type=TaskType.REVIEW, title="Review & Approval", requires_approval=True),
        WorkflowStep(order=6, task_type=TaskType.EXPORT, title="Export Final", estimated_hours=1),
    ],
    
    # Delivery Only - Just format and export
    ProjectType.DELIVERY_ONLY: [
        WorkflowStep(order=1, task_type=TaskType.OTHER, title="Select Source Content", estimated_hours=0.5),
        WorkflowStep(order=2, task_type=TaskType.EDITING, title="Resize/Format", estimated_hours=1),
        WorkflowStep(order=3, task_type=TaskType.REVIEW, title="Quick Review", requires_approval=True),
        WorkflowStep(order=4, task_type=TaskType.EXPORT, title="Export for Platform", estimated_hours=0.5),
    ],
    
    # Graphics - Design workflow, no video
    ProjectType.GRAPHICS: [
        WorkflowStep(order=1, task_type=TaskType.BRIEFING, title="Create Brief", estimated_hours=1),
        WorkflowStep(order=2, task_type=TaskType.GRAPHICS, title="Design", estimated_hours=3),
        WorkflowStep(order=3, task_type=TaskType.REVIEW, title="Review & Approval", requires_approval=True),
        WorkflowStep(order=4, task_type=TaskType.REVISIONS, title="Revisions (if needed)", estimated_hours=1),
        WorkflowStep(order=5, task_type=TaskType.EXPORT, title="Export All Sizes", estimated_hours=1),
    ],
}
