"""
Meeting & Review Management System - Data Models
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime


# ============== ENUMS ==============

class MeetingType(str, Enum):
    # Strategic Meetings
    OKR_REVIEW = "okr_review"
    LEADERSHIP_STRATEGY = "leadership_strategy"
    QUARTERLY_BUSINESS_REVIEW = "quarterly_business_review"
    
    # Department Meetings
    DEPARTMENT_WEEKLY = "department_weekly"
    DEPARTMENT_MONTHLY = "department_monthly"
    
    # Project Meetings
    PROJECT_KICKOFF = "project_kickoff"
    SPRINT_PLANNING = "sprint_planning"
    PROJECT_REVIEW = "project_review"
    SPRINT_RETROSPECTIVE = "sprint_retrospective"
    
    # Operational Meetings
    WEEKLY_TEAM_REVIEW = "weekly_team_review"
    DAILY_STANDUP = "daily_standup"
    
    # Individual Meetings
    ONE_ON_ONE = "one_on_one"
    PERFORMANCE_DISCUSSION = "performance_discussion"
    
    # General
    GENERAL = "general"


class MeetingStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    POSTPONED = "postponed"


class MeetingVisibility(str, Enum):
    PUBLIC = "public"
    DEPARTMENT = "department"
    PRIVATE = "private"


class ActionItemStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    CONVERTED_TO_TASK = "converted_to_task"


class ActionItemPriority(str, Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RecurrenceType(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


# ============== SUB-MODELS ==============

class MeetingParticipant(BaseModel):
    """Participant in a meeting"""
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    role: str = "attendee"  # organizer, presenter, attendee
    attendance_status: str = "invited"  # invited, accepted, declined, tentative


class AgendaItem(BaseModel):
    """Agenda item for a meeting"""
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    presenter_id: Optional[str] = None
    presenter_name: Optional[str] = None
    duration_minutes: int = 10
    order: int = 0
    notes: Optional[str] = None


class DiscussionNote(BaseModel):
    """Discussion note captured during meeting"""
    id: Optional[str] = None
    topic: str
    notes: str
    related_goal_id: Optional[str] = None
    related_goal_name: Optional[str] = None
    related_project_id: Optional[str] = None
    related_project_name: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[str] = None


class ActionItem(BaseModel):
    """Action item from a meeting"""
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    deadline: Optional[str] = None
    priority: ActionItemPriority = ActionItemPriority.MEDIUM
    status: ActionItemStatus = ActionItemStatus.PENDING
    linked_project_id: Optional[str] = None
    linked_project_name: Optional[str] = None
    linked_goal_id: Optional[str] = None
    linked_goal_name: Optional[str] = None
    converted_task_id: Optional[str] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None


class PreReadDocument(BaseModel):
    """Pre-read document for meeting preparation"""
    id: Optional[str] = None
    title: str
    url: Optional[str] = None
    file_type: str = "link"  # link, file, dashboard, report
    description: Optional[str] = None


# ============== MEETING MODELS ==============

class MeetingCreate(BaseModel):
    """Create a new meeting"""
    title: str
    meeting_type: MeetingType = MeetingType.GENERAL
    description: Optional[str] = None
    
    # Schedule
    start_time: str  # ISO datetime
    end_time: str  # ISO datetime
    timezone: str = "UTC"
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    
    # Participants
    organizer_id: Optional[str] = None
    participants: List[MeetingParticipant] = []
    
    # Linkage
    department_id: Optional[str] = None
    linked_goal_id: Optional[str] = None
    linked_objective_id: Optional[str] = None
    linked_project_id: Optional[str] = None
    linked_milestone_id: Optional[str] = None
    
    # Content
    agenda: List[AgendaItem] = []
    pre_read_documents: List[PreReadDocument] = []
    
    # Settings
    visibility: MeetingVisibility = MeetingVisibility.PUBLIC
    
    # Recurrence
    recurrence_type: RecurrenceType = RecurrenceType.NONE
    recurrence_day_of_week: Optional[int] = None  # 0=Monday
    recurrence_day_of_month: Optional[int] = None
    recurrence_end_date: Optional[str] = None
    
    # Microsoft Calendar
    sync_to_outlook: bool = False


class MeetingUpdate(BaseModel):
    """Update meeting fields"""
    title: Optional[str] = None
    meeting_type: Optional[MeetingType] = None
    description: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    timezone: Optional[str] = None
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    organizer_id: Optional[str] = None
    participants: Optional[List[MeetingParticipant]] = None
    department_id: Optional[str] = None
    linked_goal_id: Optional[str] = None
    linked_objective_id: Optional[str] = None
    linked_project_id: Optional[str] = None
    linked_milestone_id: Optional[str] = None
    agenda: Optional[List[AgendaItem]] = None
    pre_read_documents: Optional[List[PreReadDocument]] = None
    visibility: Optional[MeetingVisibility] = None
    status: Optional[MeetingStatus] = None
    recurrence_type: Optional[RecurrenceType] = None
    recurrence_day_of_week: Optional[int] = None
    recurrence_day_of_month: Optional[int] = None
    recurrence_end_date: Optional[str] = None
    sync_to_outlook: Optional[bool] = None


class MeetingResponse(BaseModel):
    """Meeting response with all details"""
    id: str
    title: str
    meeting_type: MeetingType
    description: Optional[str] = None
    
    # Schedule
    start_time: str
    end_time: str
    timezone: str = "UTC"
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    
    # Participants
    organizer_id: Optional[str] = None
    organizer_name: Optional[str] = None
    participants: List[MeetingParticipant] = []
    
    # Linkage
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    linked_goal_id: Optional[str] = None
    linked_goal_name: Optional[str] = None
    linked_objective_id: Optional[str] = None
    linked_objective_name: Optional[str] = None
    linked_project_id: Optional[str] = None
    linked_project_name: Optional[str] = None
    linked_milestone_id: Optional[str] = None
    linked_milestone_name: Optional[str] = None
    
    # Content
    agenda: List[AgendaItem] = []
    pre_read_documents: List[PreReadDocument] = []
    discussion_notes: List[DiscussionNote] = []
    action_items: List[ActionItem] = []
    
    # Settings
    visibility: MeetingVisibility = MeetingVisibility.PUBLIC
    status: MeetingStatus = MeetingStatus.SCHEDULED
    
    # Recurrence
    recurrence_type: RecurrenceType = RecurrenceType.NONE
    recurrence_day_of_week: Optional[int] = None
    recurrence_day_of_month: Optional[int] = None
    recurrence_end_date: Optional[str] = None
    parent_recurring_id: Optional[str] = None
    
    # Microsoft Calendar
    sync_to_outlook: bool = False
    outlook_event_id: Optional[str] = None
    
    # Metadata
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: str
    updated_at: str
    
    # Statistics
    total_action_items: int = 0
    completed_action_items: int = 0
    pending_action_items: int = 0


class MeetingListItem(BaseModel):
    """Simplified meeting for list views"""
    id: str
    title: str
    meeting_type: MeetingType
    start_time: str
    end_time: str
    location: Optional[str] = None
    organizer_name: Optional[str] = None
    participant_count: int = 0
    status: MeetingStatus
    linked_project_name: Optional[str] = None
    linked_goal_name: Optional[str] = None
    department_name: Optional[str] = None
    has_action_items: bool = False


# ============== MEETING MINUTES MODELS ==============

class MeetingMinutesCreate(BaseModel):
    """Create meeting minutes"""
    meeting_id: str
    summary: Optional[str] = None
    key_discussions: Optional[str] = None
    decisions: Optional[str] = None
    next_steps: Optional[str] = None
    auto_generated: bool = False


class MeetingMinutesResponse(BaseModel):
    """Meeting minutes response"""
    id: str
    meeting_id: str
    meeting_title: str
    meeting_date: str
    participants: List[str] = []
    
    # Content
    summary: Optional[str] = None
    agenda_summary: Optional[str] = None
    key_discussions: Optional[str] = None
    decisions: Optional[str] = None
    action_items: List[ActionItem] = []
    next_steps: Optional[str] = None
    
    # Metadata
    auto_generated: bool = False
    created_by: Optional[str] = None
    created_at: str
    updated_at: str


# ============== ACTION ITEM CONVERSION ==============

class ConvertActionItemRequest(BaseModel):
    """Request to convert action item to task"""
    action_item_id: str
    project_id: Optional[str] = None
    module_id: Optional[str] = None
    additional_description: Optional[str] = None
    tags: List[str] = []


# ============== DASHBOARD & ANALYTICS ==============

class MeetingDashboardResponse(BaseModel):
    """Meeting dashboard data"""
    # Counts
    total_meetings_this_month: int = 0
    meetings_today: int = 0
    upcoming_meetings: int = 0
    completed_meetings: int = 0
    
    # Action Items
    total_action_items: int = 0
    pending_action_items: int = 0
    completed_action_items: int = 0
    overdue_action_items: int = 0
    
    # By Type
    meetings_by_type: dict = {}
    
    # Recent & Upcoming
    recent_meetings: List[MeetingListItem] = []
    upcoming_meeting_list: List[MeetingListItem] = []
    
    # Action Items Needing Attention
    overdue_action_list: List[ActionItem] = []


class MeetingAnalyticsResponse(BaseModel):
    """Meeting analytics data"""
    # Totals
    total_meetings: int = 0
    total_decisions: int = 0
    total_action_items: int = 0
    action_items_completed: int = 0
    completion_rate: float = 0.0
    
    # Trends
    meetings_by_month: List[dict] = []
    action_items_by_month: List[dict] = []
    
    # By Department
    meetings_by_department: List[dict] = []
    
    # By Type
    meetings_by_type: List[dict] = []
    
    # Top Contributors
    top_organizers: List[dict] = []


# ============== PREVIOUS MEETING CONTEXT ==============

class PreviousMeetingContext(BaseModel):
    """Context from previous related meeting"""
    previous_meeting_id: Optional[str] = None
    previous_meeting_title: Optional[str] = None
    previous_meeting_date: Optional[str] = None
    
    # Action Items from Previous
    pending_action_items: List[ActionItem] = []
    completed_action_items: List[ActionItem] = []
    overdue_action_items: List[ActionItem] = []
    
    # Summary
    previous_summary: Optional[str] = None
    key_decisions: List[str] = []
