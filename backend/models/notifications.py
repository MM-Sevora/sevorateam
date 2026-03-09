"""
Notification Models for Alert & Notification System
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class NotificationPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class NotificationCategory(str, Enum):
    TASK = "task"
    PROJECT = "project"
    MARKETING = "marketing"
    MAIL = "mail"
    SOCIAL = "social"
    SYSTEM = "system"
    MENTION = "mention"
    APPROVAL = "approval"
    REMINDER = "reminder"


class NotificationType(str, Enum):
    # Task notifications
    TASK_ASSIGNED = "task_assigned"
    TASK_STATUS_CHANGED = "task_status_changed"
    TASK_DUE_SOON = "task_due_soon"
    TASK_OVERDUE = "task_overdue"
    TASK_COMMENT = "task_comment"
    TASK_COMPLETED = "task_completed"
    
    # Project notifications
    PROJECT_CREATED = "project_created"
    PROJECT_STATUS_CHANGED = "project_status_changed"
    PROJECT_MEMBER_ADDED = "project_member_added"
    
    # Marketing notifications
    CAMPAIGN_CREATED = "campaign_created"
    CAMPAIGN_APPROVED = "campaign_approved"
    INFLUENCER_CONFIRMED = "influencer_confirmed"
    CONTENT_PUBLISHED = "content_published"
    
    # Mail notifications
    EMAIL_RECEIVED = "email_received"
    EMAIL_SENT = "email_sent"
    
    # Social notifications
    POST_SCHEDULED = "post_scheduled"
    POST_PUBLISHED = "post_published"
    ENGAGEMENT_ALERT = "engagement_alert"
    
    # Mentions
    USER_MENTIONED = "user_mentioned"
    
    # Approvals
    APPROVAL_REQUIRED = "approval_required"
    APPROVAL_GRANTED = "approval_granted"
    APPROVAL_REJECTED = "approval_rejected"
    
    # System
    SYSTEM_ALERT = "system_alert"
    WELCOME = "welcome"


class NotificationCreate(BaseModel):
    user_id: str
    type: NotificationType
    category: NotificationCategory
    title: str
    message: str
    priority: NotificationPriority = NotificationPriority.MEDIUM
    entity_type: Optional[str] = None  # task, project, campaign, etc.
    entity_id: Optional[str] = None
    action_url: Optional[str] = None
    metadata: Dict[str, Any] = {}


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    category: Optional[str] = "system"
    title: str
    message: str
    priority: Optional[str] = "medium"
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    action_url: Optional[str] = None
    metadata: Dict[str, Any] = {}
    is_read: bool = False
    read: Optional[bool] = None  # Legacy field
    read_at: Optional[str] = None
    created_at: str


class NotificationPreferencesUpdate(BaseModel):
    task_notifications: Optional[bool] = None
    project_notifications: Optional[bool] = None
    marketing_notifications: Optional[bool] = None
    mail_notifications: Optional[bool] = None
    social_notifications: Optional[bool] = None
    mention_notifications: Optional[bool] = None
    approval_notifications: Optional[bool] = None
    email_enabled: Optional[bool] = None
    email_frequency: Optional[str] = None  # instant, hourly, daily


class NotificationPreferencesResponse(BaseModel):
    user_id: str
    task_notifications: bool = True
    project_notifications: bool = True
    marketing_notifications: bool = True
    mail_notifications: bool = True
    social_notifications: bool = True
    mention_notifications: bool = True
    approval_notifications: bool = True
    email_enabled: bool = False
    email_frequency: str = "instant"
    updated_at: str
