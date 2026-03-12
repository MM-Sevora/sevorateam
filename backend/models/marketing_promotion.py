"""
Content Promotion Models - Database schemas for UGC/Influencer content promotion

Collections:
- marketing_content_promotions: Promotions of influencer content as ads
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


# ============== ENUMS ==============

class PromotionStatus(str, Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PromotionType(str, Enum):
    BOOSTED_POST = "boosted_post"
    SPARK_AD = "spark_ad"  # TikTok
    BRANDED_CONTENT = "branded_content"
    WHITELISTED_AD = "whitelisted_ad"
    DARK_POST = "dark_post"
    PARTNERSHIP_AD = "partnership_ad"


class ContentSource(str, Enum):
    INFLUENCER_POST = "influencer_post"
    UGC = "ugc"
    BRAND_COLLAB = "brand_collab"
    TESTIMONIAL = "testimonial"
    REVIEW = "review"


# ============== CONTENT PROMOTIONS ==============

class ContentPromotionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    
    # Content source
    influencer_id: str
    content_source: ContentSource
    original_post_url: Optional[str] = None
    original_post_id: Optional[str] = None
    content_asset_id: Optional[str] = None  # Link to marketing_assets
    
    # Promotion details
    promotion_type: PromotionType
    platform: str  # instagram, facebook, tiktok, etc.
    
    # Link to ads
    ad_campaign_id: Optional[str] = None
    ad_set_id: Optional[str] = None
    ad_id: Optional[str] = None
    
    # Budget & Schedule
    budget: float = Field(default=0, ge=0)
    budget_type: str = Field(default="lifetime")  # daily, lifetime
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    # Targeting (optional override)
    target_audience: Optional[Dict[str, Any]] = None
    
    # Status
    status: PromotionStatus = PromotionStatus.DRAFT
    
    # Permissions
    influencer_approved: bool = False
    influencer_approved_at: Optional[datetime] = None
    usage_rights_until: Optional[date] = None
    
    # Performance
    total_spend: float = 0
    impressions: int = 0
    reach: int = 0
    clicks: int = 0
    conversions: int = 0
    
    # Notes
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ContentPromotionCreate(ContentPromotionBase):
    pass


class ContentPromotionUpdate(BaseModel):
    name: Optional[str] = None
    original_post_url: Optional[str] = None
    original_post_id: Optional[str] = None
    content_asset_id: Optional[str] = None
    promotion_type: Optional[PromotionType] = None
    ad_campaign_id: Optional[str] = None
    ad_set_id: Optional[str] = None
    ad_id: Optional[str] = None
    budget: Optional[float] = None
    budget_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    target_audience: Optional[Dict[str, Any]] = None
    status: Optional[PromotionStatus] = None
    influencer_approved: Optional[bool] = None
    usage_rights_until: Optional[date] = None
    notes: Optional[str] = None


class ContentPromotionResponse(ContentPromotionBase):
    id: str
    influencer_name: Optional[str] = None
    influencer_handle: Optional[str] = None
    campaign_name: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Calculated metrics
    ctr: float = 0
    cpc: float = 0
    roas: float = 0
    
    class Config:
        from_attributes = True


# ============== PROMOTION REQUEST ==============

class PromotionRequestBase(BaseModel):
    """Request to promote influencer content - sent to influencer for approval"""
    influencer_id: str
    content_url: str
    proposed_budget: float
    proposed_duration_days: int
    platforms: List[str]
    message: Optional[str] = None
    terms: Optional[str] = None


class PromotionRequestCreate(PromotionRequestBase):
    pass


class PromotionRequestResponse(PromotionRequestBase):
    id: str
    status: str  # pending, approved, rejected
    influencer_response: Optional[str] = None
    created_at: datetime
    responded_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============== STATS ==============

class PromotionStats(BaseModel):
    total_promotions: int
    active_promotions: int
    total_spend: float
    total_impressions: int
    total_clicks: int
    total_conversions: int
    avg_ctr: float
    avg_cpc: float
    by_status: Dict[str, int]
    by_platform: Dict[str, int]
    by_type: Dict[str, int]
    top_performing: List[str]  # Promotion IDs


class InfluencerPromotionSummary(BaseModel):
    influencer_id: str
    influencer_name: str
    total_promotions: int
    active_promotions: int
    total_spend: float
    total_impressions: int
    total_conversions: int
    avg_performance_score: float
