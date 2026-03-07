"""
Additional Marketing Models - Gifting, Contracts, Promo Codes, etc.
"""

from pydantic import BaseModel
from typing import Optional, List
from enum import Enum
from datetime import datetime

# ============== GIFTING/SEEDING ==============
class GiftingStatus(str, Enum):
    PLANNED = "planned"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    RECEIVED = "received"
    POSTED = "posted"
    NO_RESPONSE = "no_response"

class GiftingCreate(BaseModel):
    contact_id: str
    campaign_id: Optional[str] = None
    product_name: str
    product_value: float = 0.0
    quantity: int = 1
    shipping_address: Optional[str] = None
    tracking_number: Optional[str] = None
    shipped_date: Optional[str] = None
    expected_post_date: Optional[str] = None
    notes: Optional[str] = None

class GiftingResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    product_name: str
    product_value: float = 0.0
    quantity: int = 1
    shipping_address: Optional[str] = None
    tracking_number: Optional[str] = None
    status: str = "planned"
    shipped_date: Optional[str] = None
    delivered_date: Optional[str] = None
    expected_post_date: Optional[str] = None
    actual_post_date: Optional[str] = None
    post_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: str

# ============== PROMO CODES ==============
class PromoCodeCreate(BaseModel):
    contact_id: str
    campaign_id: Optional[str] = None
    code: Optional[str] = None  # Auto-generate if not provided
    discount_type: str = "percentage"  # percentage, fixed
    discount_value: float = 10.0
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    max_uses: Optional[int] = None
    notes: Optional[str] = None

class PromoCodeResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    code: str
    discount_type: str
    discount_value: float
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    max_uses: Optional[int] = None
    current_uses: int = 0
    total_revenue: float = 0.0
    is_active: bool = True
    notes: Optional[str] = None
    created_at: str

# ============== UTM LINKS ==============
class UTMLinkCreate(BaseModel):
    contact_id: str
    campaign_id: Optional[str] = None
    base_url: str
    utm_source: str = "influencer"
    utm_medium: str = "social"
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    custom_alias: Optional[str] = None

class UTMLinkResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    campaign_id: Optional[str] = None
    base_url: str
    full_url: str
    short_url: Optional[str] = None
    utm_source: str
    utm_medium: str
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    clicks: int = 0
    created_at: str

# ============== CONTRACTS ==============
class ContractStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    ACKNOWLEDGED = "acknowledged"
    SIGNED = "signed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class ContractTemplateCreate(BaseModel):
    name: str
    content: str  # HTML/Markdown content with placeholders
    category: str = "general"  # general, influencer, brand, nda

class ContractTemplateResponse(BaseModel):
    id: str
    name: str
    content: str
    category: str
    usage_count: int = 0
    created_at: str
    updated_at: Optional[str] = None

class InfluencerContractCreate(BaseModel):
    contact_id: str
    campaign_id: Optional[str] = None
    deal_id: Optional[str] = None
    template_id: Optional[str] = None
    title: str
    content: str
    deliverables: List[dict] = []
    total_value: float = 0.0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    exclusivity_period: Optional[int] = None  # days
    usage_rights: Optional[str] = None
    payment_terms: Optional[str] = None

class InfluencerContractResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    deal_id: Optional[str] = None
    title: str
    content: str
    deliverables: List[dict] = []
    total_value: float = 0.0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    exclusivity_period: Optional[int] = None
    usage_rights: Optional[str] = None
    payment_terms: Optional[str] = None
    status: str = "draft"
    sent_at: Optional[str] = None
    viewed_at: Optional[str] = None
    acknowledged_at: Optional[str] = None
    acknowledged_by_ip: Optional[str] = None
    created_at: str

# ============== CONTENT APPROVAL ==============
class ContentApprovalStatus(str, Enum):
    PENDING_SUBMISSION = "pending_submission"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REVISION_REQUESTED = "revision_requested"
    REJECTED = "rejected"

class ContentSubmissionCreate(BaseModel):
    contact_id: str
    campaign_id: Optional[str] = None
    deal_id: Optional[str] = None
    content_type: str  # reel, post, story, video
    platform: str = "instagram"
    title: str
    description: Optional[str] = None
    media_urls: List[str] = []
    caption: Optional[str] = None
    hashtags: List[str] = []
    scheduled_post_date: Optional[str] = None

class ContentSubmissionResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    campaign_id: Optional[str] = None
    deal_id: Optional[str] = None
    content_type: str
    platform: str
    title: str
    description: Optional[str] = None
    media_urls: List[str] = []
    caption: Optional[str] = None
    hashtags: List[str] = []
    scheduled_post_date: Optional[str] = None
    status: str = "pending_submission"
    submitted_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    review_notes: Optional[str] = None
    revision_count: int = 0
    revision_history: List[dict] = []
    created_at: str

# ============== BRAND SAFETY ==============
class BrandSafetyCheckCreate(BaseModel):
    contact_id: str
    check_type: str = "full"  # full, quick, content_only

class BrandSafetyCheckResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    overall_score: float = 0.0  # 0-100
    risk_level: str = "low"  # low, medium, high, critical
    issues_found: List[dict] = []
    recommendations: List[str] = []
    last_checked: str
    content_analyzed: int = 0

# ============== SENTIMENT ANALYSIS ==============
class SentimentAnalysisCreate(BaseModel):
    contact_id: str
    content_urls: List[str] = []
    analyze_comments: bool = True

class SentimentAnalysisResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    overall_sentiment: str = "neutral"  # positive, neutral, negative
    sentiment_score: float = 0.0  # -1 to 1
    positive_ratio: float = 0.0
    negative_ratio: float = 0.0
    neutral_ratio: float = 0.0
    top_positive_themes: List[str] = []
    top_negative_themes: List[str] = []
    sample_comments: List[dict] = []
    analyzed_at: str

# ============== EXCLUSIVITY TRACKER ==============
class ExclusivityStatus(str, Enum):
    AVAILABLE = "available"
    EXCLUSIVE = "exclusive"
    PARTIAL = "partial"
    EXPIRED = "expired"

class ExclusivityRecord(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    brand_name: str
    category: str  # fashion, beauty, etc.
    start_date: str
    end_date: str
    contract_id: Optional[str] = None
    status: str = "exclusive"
    notes: Optional[str] = None

# ============== AVAILABILITY CALENDAR ==============
class AvailabilityStatus(str, Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    TENTATIVE = "tentative"
    BLOCKED = "blocked"

class AvailabilitySlot(BaseModel):
    contact_id: str
    start_date: str
    end_date: str
    status: str = "busy"
    reason: Optional[str] = None
    campaign_id: Optional[str] = None

class AvailabilityResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    start_date: str
    end_date: str
    status: str
    reason: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    created_at: str

# ============== RELATIONSHIP SCORE ==============
class RelationshipScoreResponse(BaseModel):
    contact_id: str
    contact_name: Optional[str] = None
    overall_score: float = 0.0  # 0-100
    tier: str = "new"  # new, developing, established, vip, ambassador
    total_campaigns: int = 0
    total_revenue: float = 0.0
    avg_response_time: float = 0.0  # hours
    content_quality_avg: float = 0.0
    reliability_score: float = 0.0
    engagement_trend: str = "stable"  # improving, stable, declining
    last_collaboration: Optional[str] = None
    next_scheduled: Optional[str] = None
    recommendations: List[str] = []

# ============== POST-CAMPAIGN REPORT ==============
class CampaignReportResponse(BaseModel):
    campaign_id: str
    campaign_name: str
    report_generated_at: str
    
    # Overview
    status: str
    start_date: str
    end_date: Optional[str] = None
    total_budget: float = 0.0
    total_spent: float = 0.0
    
    # Influencer Stats
    total_influencers: int = 0
    influencers_completed: int = 0
    influencers_pending: int = 0
    
    # Content Stats
    total_content_pieces: int = 0
    content_by_type: dict = {}
    
    # Engagement Stats
    total_reach: int = 0
    total_impressions: int = 0
    total_engagement: int = 0
    avg_engagement_rate: float = 0.0
    
    # Promo Code Stats
    promo_codes_used: int = 0
    promo_revenue: float = 0.0
    
    # ROI
    cost_per_engagement: float = 0.0
    cost_per_reach: float = 0.0
    estimated_media_value: float = 0.0
    roi_percentage: float = 0.0
    
    # Top Performers
    top_influencers: List[dict] = []
    top_content: List[dict] = []
    
    # Insights
    ai_insights: List[str] = []
    recommendations: List[str] = []
