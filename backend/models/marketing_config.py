"""
Marketing Configuration Models - Configurable dropdown options

Collections:
- marketing_config_project_types: Project type options (HOW)
- marketing_config_content_categories: Content category options (WHAT)
- marketing_config_content_subtypes: Content sub-type options (linked to category)
- marketing_config_mediums: Medium/channel options (WHERE)
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ============== PROJECT TYPES (HOW) ==============

class ProjectTypeConfig(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)  # e.g., "original_production"
    description: Optional[str] = None
    icon: Optional[str] = None  # Icon name for UI
    workflow_template: Optional[str] = None  # Default workflow for this type
    is_active: bool = True
    sort_order: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ProjectTypeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    icon: Optional[str] = None
    workflow_template: Optional[str] = None
    sort_order: int = 0


class ProjectTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    workflow_template: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


# ============== CONTENT CATEGORIES (WHAT - Parent) ==============

class ContentCategoryConfig(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)  # e.g., "written", "product"
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None  # For UI badges
    is_active: bool = True
    sort_order: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ContentCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: int = 0


class ContentCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


# ============== CONTENT SUB-TYPES (WHAT - Child) ==============

class ContentSubTypeConfig(BaseModel):
    id: Optional[str] = None
    category_id: str  # Parent category reference
    category_slug: Optional[str] = None  # For convenience
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)  # e.g., "blog_article"
    description: Optional[str] = None
    default_workflow_tasks: Optional[List[str]] = None  # Default tasks for this type
    is_active: bool = True
    sort_order: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ContentSubTypeCreate(BaseModel):
    category_id: str
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    default_workflow_tasks: Optional[List[str]] = None
    sort_order: int = 0


class ContentSubTypeUpdate(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    default_workflow_tasks: Optional[List[str]] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


# ============== MEDIUMS (WHERE) ==============

class MediumConfig(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)  # e.g., "instagram", "website"
    description: Optional[str] = None
    icon: Optional[str] = None
    platform_type: Optional[str] = None  # social, website, email, ads, print
    is_active: bool = True
    sort_order: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class MediumCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    icon: Optional[str] = None
    platform_type: Optional[str] = None
    sort_order: int = 0


class MediumUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    platform_type: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


# ============== COMBINED CONFIG RESPONSE ==============

class MarketingConfigResponse(BaseModel):
    """All configuration options in one response"""
    project_types: List[ProjectTypeConfig] = []
    content_categories: List[ContentCategoryConfig] = []
    content_subtypes: List[ContentSubTypeConfig] = []
    mediums: List[MediumConfig] = []


# ============== DEFAULT DATA ==============

DEFAULT_PROJECT_TYPES = [
    {"name": "Original Production", "slug": "original_production", "description": "Created from scratch with full production workflow", "sort_order": 1},
    {"name": "Editing / Post Production", "slug": "editing", "description": "Enhance or edit existing content", "sort_order": 2},
    {"name": "Adaptation / Repurpose", "slug": "adaptation", "description": "Transform existing content for new platform or format", "sort_order": 3},
    {"name": "Graphics / Design", "slug": "graphics", "description": "Static visual design work", "sort_order": 4},
    {"name": "Delivery / Formatting", "slug": "delivery", "description": "Resize, export, or format for specific specs", "sort_order": 5},
]

DEFAULT_CONTENT_CATEGORIES = [
    {"name": "Written Content", "slug": "written", "icon": "FileText", "color": "blue", "sort_order": 1},
    {"name": "Product Content", "slug": "product", "icon": "Package", "color": "purple", "sort_order": 2},
    {"name": "Social Content", "slug": "social", "icon": "Share2", "color": "pink", "sort_order": 3},
    {"name": "Video Content", "slug": "video", "icon": "Video", "color": "red", "sort_order": 4},
    {"name": "Marketing Content", "slug": "marketing", "icon": "Megaphone", "color": "orange", "sort_order": 5},
]

DEFAULT_CONTENT_SUBTYPES = {
    "written": [
        {"name": "Blog Article", "slug": "blog_article"},
        {"name": "Website Page", "slug": "website_page"},
        {"name": "Landing Page", "slug": "landing_page"},
        {"name": "Email / Newsletter", "slug": "email"},
        {"name": "Case Study", "slug": "case_study"},
        {"name": "Press Release", "slug": "press_release"},
    ],
    "product": [
        {"name": "Product Description", "slug": "product_description"},
        {"name": "Product Images", "slug": "product_images"},
        {"name": "Product Video", "slug": "product_video"},
        {"name": "Product Lookbook", "slug": "product_lookbook"},
        {"name": "Product Styling Guide", "slug": "styling_guide"},
    ],
    "social": [
        {"name": "Instagram Post", "slug": "instagram_post"},
        {"name": "Reel / Short Video", "slug": "reel"},
        {"name": "Carousel", "slug": "carousel"},
        {"name": "Story", "slug": "story"},
        {"name": "UGC Content", "slug": "ugc"},
    ],
    "video": [
        {"name": "Brand Film", "slug": "brand_film"},
        {"name": "Product Video", "slug": "video_product"},
        {"name": "Tutorial / How-To", "slug": "tutorial"},
        {"name": "Behind The Scenes", "slug": "bts"},
        {"name": "Interview / Testimonial", "slug": "interview"},
    ],
    "marketing": [
        {"name": "Ad Creative", "slug": "ad_creative"},
        {"name": "Campaign Hero", "slug": "campaign_hero"},
        {"name": "Banner / Display", "slug": "banner"},
        {"name": "Brand Story", "slug": "brand_story"},
    ],
}

DEFAULT_MEDIUMS = [
    {"name": "Website", "slug": "website", "platform_type": "website", "icon": "Globe", "sort_order": 1},
    {"name": "Instagram", "slug": "instagram", "platform_type": "social", "icon": "Instagram", "sort_order": 2},
    {"name": "Facebook", "slug": "facebook", "platform_type": "social", "icon": "Facebook", "sort_order": 3},
    {"name": "YouTube", "slug": "youtube", "platform_type": "social", "icon": "Youtube", "sort_order": 4},
    {"name": "TikTok", "slug": "tiktok", "platform_type": "social", "icon": "Video", "sort_order": 5},
    {"name": "LinkedIn", "slug": "linkedin", "platform_type": "social", "icon": "Linkedin", "sort_order": 6},
    {"name": "Email", "slug": "email", "platform_type": "email", "icon": "Mail", "sort_order": 7},
    {"name": "Ads (Meta/Google)", "slug": "ads", "platform_type": "ads", "icon": "Megaphone", "sort_order": 8},
    {"name": "Print / Offline", "slug": "print", "platform_type": "print", "icon": "Printer", "sort_order": 9},
]
