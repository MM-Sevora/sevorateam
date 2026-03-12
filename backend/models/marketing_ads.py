"""
Marketing Ads Models - Database schemas and Pydantic models for Digital Ads Management

Collections:
- marketing_ads_accounts: Ad platform accounts (Meta, Google, YouTube)
- marketing_ads_campaigns: Ad campaigns
- marketing_ads_sets: Ad sets with targeting
- marketing_ads: Individual ads
- marketing_ads_metrics: Daily metrics snapshots
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
import uuid


# ============== ENUMS ==============

class AdPlatform(str, Enum):
    META = "meta"  # Facebook + Instagram
    GOOGLE = "google"
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"


class AdAccountStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    DISABLED = "disabled"
    PENDING_REVIEW = "pending_review"


class AdCampaignObjective(str, Enum):
    AWARENESS = "awareness"
    REACH = "reach"
    TRAFFIC = "traffic"
    ENGAGEMENT = "engagement"
    APP_INSTALLS = "app_installs"
    VIDEO_VIEWS = "video_views"
    LEAD_GENERATION = "lead_generation"
    CONVERSIONS = "conversions"
    CATALOG_SALES = "catalog_sales"
    STORE_TRAFFIC = "store_traffic"


class AdCampaignType(str, Enum):
    BRAND = "brand"
    PERFORMANCE = "performance"
    RETARGETING = "retargeting"
    PROSPECTING = "prospecting"
    LOOKALIKE = "lookalike"


class AdCampaignStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class AdSetStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class AdStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    ACTIVE = "active"
    PAUSED = "paused"
    REJECTED = "rejected"
    COMPLETED = "completed"


class AdFormat(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    CAROUSEL = "carousel"
    STORIES = "stories"
    REELS = "reels"
    COLLECTION = "collection"


class OptimizationGoal(str, Enum):
    IMPRESSIONS = "impressions"
    REACH = "reach"
    LINK_CLICKS = "link_clicks"
    LANDING_PAGE_VIEWS = "landing_page_views"
    CONVERSIONS = "conversions"
    APP_INSTALLS = "app_installs"
    VIDEO_VIEWS = "video_views"
    ENGAGEMENT = "engagement"


# ============== AD ACCOUNTS ==============

class AdAccountBase(BaseModel):
    platform: AdPlatform
    account_name: str = Field(..., min_length=1, max_length=200)
    account_id: str = Field(..., min_length=1, max_length=100)
    currency: str = Field(default="INR", max_length=3)
    timezone: str = Field(default="Asia/Kolkata")
    owner_id: Optional[str] = None
    status: AdAccountStatus = AdAccountStatus.ACTIVE
    credentials: Optional[Dict[str, Any]] = None  # Encrypted credentials
    metadata: Optional[Dict[str, Any]] = None


class AdAccountCreate(AdAccountBase):
    pass


class AdAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    owner_id: Optional[str] = None
    status: Optional[AdAccountStatus] = None
    credentials: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class AdAccountResponse(AdAccountBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============== AD CAMPAIGNS ==============

class AdCampaignBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    platform: AdPlatform
    account_id: str
    objective: AdCampaignObjective
    campaign_type: AdCampaignType = AdCampaignType.PERFORMANCE
    budget: float = Field(..., ge=0)
    budget_type: str = Field(default="daily")  # daily, lifetime
    start_date: date
    end_date: Optional[date] = None
    status: AdCampaignStatus = AdCampaignStatus.DRAFT
    marketing_campaign_id: Optional[str] = None  # Link to internal campaign
    external_campaign_id: Optional[str] = None  # Platform's campaign ID
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AdCampaignCreate(AdCampaignBase):
    pass


class AdCampaignUpdate(BaseModel):
    name: Optional[str] = None
    objective: Optional[AdCampaignObjective] = None
    campaign_type: Optional[AdCampaignType] = None
    budget: Optional[float] = None
    budget_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[AdCampaignStatus] = None
    marketing_campaign_id: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AdCampaignResponse(AdCampaignBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_spend: float = 0
    total_impressions: int = 0
    total_clicks: int = 0
    total_conversions: int = 0
    
    class Config:
        from_attributes = True


# ============== AD SETS ==============

class AudienceDefinition(BaseModel):
    name: Optional[str] = None
    locations: List[str] = []  # Countries, cities
    age_min: int = Field(default=18, ge=13, le=65)
    age_max: int = Field(default=65, ge=13, le=65)
    genders: List[str] = []  # male, female, all
    interests: List[str] = []
    behaviors: List[str] = []
    custom_audiences: List[str] = []  # IDs of custom audiences
    lookalike_audiences: List[str] = []
    excluded_audiences: List[str] = []
    languages: List[str] = []
    placements: List[str] = []  # feed, stories, reels, etc.


class AdSetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    campaign_id: str
    audience: AudienceDefinition = Field(default_factory=AudienceDefinition)
    budget: Optional[float] = None  # Ad set level budget
    budget_type: str = Field(default="daily")
    bid_strategy: str = Field(default="lowest_cost")
    bid_amount: Optional[float] = None
    optimization_goal: OptimizationGoal = OptimizationGoal.LINK_CLICKS
    status: AdSetStatus = AdSetStatus.DRAFT
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    external_adset_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AdSetCreate(AdSetBase):
    pass


class AdSetUpdate(BaseModel):
    name: Optional[str] = None
    audience: Optional[AudienceDefinition] = None
    budget: Optional[float] = None
    budget_type: Optional[str] = None
    bid_strategy: Optional[str] = None
    bid_amount: Optional[float] = None
    optimization_goal: Optional[OptimizationGoal] = None
    status: Optional[AdSetStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    metadata: Optional[Dict[str, Any]] = None


class AdSetResponse(AdSetBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_spend: float = 0
    total_impressions: int = 0
    total_clicks: int = 0
    
    class Config:
        from_attributes = True


# ============== ADS ==============

class AdBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    ad_set_id: str
    creative_asset_id: Optional[str] = None  # Link to marketing_assets
    headline: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)
    primary_text: Optional[str] = Field(None, max_length=2000)
    cta: str = Field(default="Learn More")  # Call to action
    landing_page: Optional[str] = None
    display_url: Optional[str] = None
    format: AdFormat = AdFormat.IMAGE
    media_urls: List[str] = []  # Image/video URLs
    status: AdStatus = AdStatus.DRAFT
    external_ad_id: Optional[str] = None
    tracking_params: Optional[Dict[str, str]] = None  # UTM parameters
    metadata: Optional[Dict[str, Any]] = None


class AdCreate(AdBase):
    pass


class AdUpdate(BaseModel):
    name: Optional[str] = None
    creative_asset_id: Optional[str] = None
    headline: Optional[str] = None
    description: Optional[str] = None
    primary_text: Optional[str] = None
    cta: Optional[str] = None
    landing_page: Optional[str] = None
    display_url: Optional[str] = None
    format: Optional[AdFormat] = None
    media_urls: Optional[List[str]] = None
    status: Optional[AdStatus] = None
    tracking_params: Optional[Dict[str, str]] = None
    metadata: Optional[Dict[str, Any]] = None


class AdResponse(AdBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    total_spend: float = 0
    total_impressions: int = 0
    total_clicks: int = 0
    ctr: float = 0
    cpc: float = 0
    
    class Config:
        from_attributes = True


# ============== AD METRICS ==============

class AdMetricsBase(BaseModel):
    ad_id: str
    ad_set_id: Optional[str] = None
    campaign_id: Optional[str] = None
    date: date
    impressions: int = 0
    reach: int = 0
    clicks: int = 0
    ctr: float = 0  # Click-through rate
    cpc: float = 0  # Cost per click
    cpm: float = 0  # Cost per 1000 impressions
    conversions: int = 0
    conversion_rate: float = 0
    cost: float = 0
    revenue: float = 0
    roas: float = 0  # Return on ad spend
    video_views: int = 0
    video_views_p25: int = 0
    video_views_p50: int = 0
    video_views_p75: int = 0
    video_views_p100: int = 0
    engagement: int = 0  # likes + comments + shares
    saves: int = 0
    shares: int = 0
    comments: int = 0
    metadata: Optional[Dict[str, Any]] = None


class AdMetricsCreate(AdMetricsBase):
    pass


class AdMetricsResponse(AdMetricsBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============== AGGREGATED METRICS ==============

class CampaignMetricsSummary(BaseModel):
    campaign_id: str
    campaign_name: str
    platform: AdPlatform
    status: AdCampaignStatus
    budget: float
    total_spend: float
    total_impressions: int
    total_reach: int
    total_clicks: int
    total_conversions: int
    avg_ctr: float
    avg_cpc: float
    avg_cpm: float
    roas: float
    period_start: date
    period_end: date


class PlatformMetricsSummary(BaseModel):
    platform: AdPlatform
    total_campaigns: int
    active_campaigns: int
    total_spend: float
    total_impressions: int
    total_clicks: int
    total_conversions: int
    avg_ctr: float
    avg_cpc: float
    roas: float


class AdsOverviewStats(BaseModel):
    total_accounts: int
    total_campaigns: int
    active_campaigns: int
    total_ad_sets: int
    total_ads: int
    total_spend: float
    total_impressions: int
    total_clicks: int
    total_conversions: int
    avg_ctr: float
    avg_cpc: float
    overall_roas: float
    platforms_breakdown: List[PlatformMetricsSummary]
