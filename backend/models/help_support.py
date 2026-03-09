"""
Models for Help & Support Module
Auto-scaffolds help structures when modules are created
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ============== ENUMS ==============

class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_USER = "waiting_user"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketType(str, Enum):
    BUG = "bug"
    QUESTION = "question"
    FEATURE_REQUEST = "feature_request"
    HOW_TO = "how_to"
    OTHER = "other"


class ArticleStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


# ============== HELP MODULE ==============

class HelpModuleCreate(BaseModel):
    """Create a help module (auto-generated or manual)"""
    module_key: str = Field(..., description="Unique identifier for the module (e.g., 'project_management')")
    module_name: str = Field(..., description="Display name (e.g., 'Project Management')")
    description: Optional[str] = None
    icon: Optional[str] = "help-circle"
    parent_module_key: Optional[str] = None  # For submodules
    order: int = 0


class HelpModuleUpdate(BaseModel):
    """Update a help module"""
    module_name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class HelpModuleResponse(BaseModel):
    """Help module response"""
    id: str
    module_key: str
    module_name: str
    description: Optional[str] = None
    icon: str = "help-circle"
    parent_module_key: Optional[str] = None
    order: int = 0
    is_active: bool = True
    article_count: int = 0
    faq_count: int = 0
    created_at: str
    updated_at: Optional[str] = None


# ============== HELP ARTICLE ==============

class HelpArticleCreate(BaseModel):
    """Create a help article"""
    module_key: str
    title: str
    slug: Optional[str] = None  # Auto-generated if not provided
    content: str  # Markdown content
    section: str = "overview"  # overview, how_it_works, features, troubleshooting
    tags: List[str] = []
    order: int = 0


class HelpArticleUpdate(BaseModel):
    """Update a help article"""
    title: Optional[str] = None
    content: Optional[str] = None
    section: Optional[str] = None
    tags: Optional[List[str]] = None
    order: Optional[int] = None
    status: Optional[ArticleStatus] = None


class HelpArticleResponse(BaseModel):
    """Help article response"""
    id: str
    module_key: str
    title: str
    slug: str
    content: str
    section: str
    tags: List[str] = []
    order: int = 0
    status: ArticleStatus = ArticleStatus.PUBLISHED
    views: int = 0
    helpful_count: int = 0
    not_helpful_count: int = 0
    created_by: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None


# ============== FAQ ==============

class FAQCreate(BaseModel):
    """Create a FAQ"""
    module_key: str
    question: str
    answer: str
    tags: List[str] = []
    order: int = 0


class FAQUpdate(BaseModel):
    """Update a FAQ"""
    question: Optional[str] = None
    answer: Optional[str] = None
    tags: Optional[List[str]] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class FAQResponse(BaseModel):
    """FAQ response"""
    id: str
    module_key: str
    question: str
    answer: str
    tags: List[str] = []
    order: int = 0
    is_active: bool = True
    helpful_count: int = 0
    created_at: str
    updated_at: Optional[str] = None


# ============== SUPPORT TICKET ==============

class TicketCreate(BaseModel):
    """Create a support ticket"""
    module_key: str
    submodule_key: Optional[str] = None
    issue_type: TicketType = TicketType.QUESTION
    priority: TicketPriority = TicketPriority.MEDIUM
    subject: str
    description: str
    attachments: List[str] = []  # URLs to attachments


class TicketUpdate(BaseModel):
    """Update a support ticket"""
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None


class TicketCommentCreate(BaseModel):
    """Add a comment to a ticket"""
    content: str
    is_internal: bool = False  # Internal notes not visible to requester


class TicketCommentResponse(BaseModel):
    """Ticket comment response"""
    id: str
    ticket_id: str
    user_id: str
    user_name: str
    content: str
    is_internal: bool = False
    created_at: str


class TicketResponse(BaseModel):
    """Support ticket response"""
    id: str
    ticket_number: str  # Human-readable ticket number (e.g., HELP-001)
    requester_id: str
    requester_name: str
    requester_email: str
    module_key: str
    module_name: str
    submodule_key: Optional[str] = None
    issue_type: TicketType
    priority: TicketPriority
    status: TicketStatus
    subject: str
    description: str
    attachments: List[str] = []
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    resolution_notes: Optional[str] = None
    comments: List[TicketCommentResponse] = []
    created_at: str
    updated_at: Optional[str] = None
    resolved_at: Optional[str] = None


# ============== SEARCH & ANALYTICS ==============

class HelpSearchResult(BaseModel):
    """Search result item"""
    type: str  # article, faq, module
    id: str
    title: str
    snippet: str
    module_key: str
    module_name: str
    url: str
    score: float = 0.0


class HelpAnalytics(BaseModel):
    """Help center analytics"""
    total_articles: int
    total_faqs: int
    total_tickets: int
    open_tickets: int
    avg_resolution_time_hours: float
    most_viewed_articles: List[dict]
    common_ticket_categories: List[dict]
    ticket_trend: List[dict]  # Daily ticket counts


# ============== AUTO-SCAFFOLD TEMPLATE ==============

# Default sections created for each module
DEFAULT_HELP_SECTIONS = [
    {"section": "overview", "title": "Overview", "order": 0},
    {"section": "how_it_works", "title": "How It Works", "order": 1},
    {"section": "features", "title": "Key Features", "order": 2},
    {"section": "troubleshooting", "title": "Troubleshooting", "order": 3},
]

# Default FAQs template
DEFAULT_FAQ_TEMPLATES = [
    {"question": "How do I get started with {module_name}?", "order": 0},
    {"question": "What are the main features of {module_name}?", "order": 1},
    {"question": "How do I report an issue with {module_name}?", "order": 2},
]
