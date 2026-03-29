"""
Marketing Module Models - Phase 1-8 Implementation
Unified Contacts Hub, Digital PR, Events, Content & Assets
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum
from datetime import datetime

# ============== CONTACT TYPES ==============
class ContactType(str, Enum):
    INFLUENCER = "influencer"
    JOURNALIST = "journalist"
    BLOGGER = "blogger"
    HYBRID = "hybrid"  # Both influencer and journalist/blogger

class ContactStatus(str, Enum):
    IDENTIFIED = "identified"
    CONTACTED = "contacted"
    INTERESTED = "interested"
    NEGOTIATING = "negotiating"
    CONFIRMED = "confirmed"
    INACTIVE = "inactive"

class ContactTier(str, Enum):
    NANO = "nano"        # < 10K
    MICRO = "micro"      # 10K - 100K
    MACRO = "macro"      # 100K - 1M
    MEGA = "mega"        # 1M - 10M
    CELEBRITY = "celebrity"  # 10M+

# ============== UNIFIED CONTACT MODEL ==============
class ContactCreate(BaseModel):
    """Unified contact model for influencers, journalists, bloggers"""
    name: str
    contact_type: ContactType = ContactType.INFLUENCER
    bio: Optional[str] = None
    
    # Social handles
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    twitter_handle: Optional[str] = None
    linkedin_url: Optional[str] = None
    
    # Contact info
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    
    # Location
    city: Optional[str] = None
    country: str = "India"
    
    # Professional info
    industry: str = "fashion"
    primary_platform: str = "instagram"
    content_type: List[str] = []
    style_tags: List[str] = []
    languages: List[str] = ["English", "Hindi"]
    
    # For influencers
    tier: Optional[ContactTier] = ContactTier.MICRO
    followers: int = 0
    engagement_rate: float = 0.0
    rate_per_post: Optional[float] = None
    rate_per_reel: Optional[float] = None
    
    # For journalists/bloggers
    publication: Optional[str] = None
    publication_id: Optional[str] = None  # Link to publications collection
    publication_website: Optional[str] = None
    beat: Optional[str] = None  # e.g., "fashion", "lifestyle", "tech"
    editor_level: Optional[str] = None  # e.g., "staff", "senior", "editor-in-chief"
    domain_authority: Optional[int] = None  # 1-100
    monthly_traffic: Optional[int] = None
    preferred_contact_method: Optional[str] = None  # email, phone, linkedin, twitter
    
    notes: Optional[str] = None
    
    # Status/Pipeline stage (optional on create, defaults to "identified")
    status: Optional[str] = None
    
    # Campaign assignment
    campaign_id: Optional[str] = None

class ContactUpdate(BaseModel):
    """Update model - all fields optional for partial updates"""
    name: Optional[str] = None
    contact_type: Optional[ContactType] = None
    bio: Optional[str] = None
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    twitter_handle: Optional[str] = None
    linkedin_url: Optional[str] = None
    email: Optional[str] = None  # Changed from EmailStr to allow empty strings
    phone: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    primary_platform: Optional[str] = None
    content_type: Optional[List[str]] = None
    style_tags: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    tier: Optional[ContactTier] = None
    followers: Optional[int] = None
    engagement_rate: Optional[float] = None
    rate_per_post: Optional[float] = None
    rate_per_reel: Optional[float] = None
    rate_per_youtube: Optional[float] = None
    publication: Optional[str] = None
    publication_id: Optional[str] = None
    publication_website: Optional[str] = None
    beat: Optional[str] = None
    editor_level: Optional[str] = None
    domain_authority: Optional[int] = None
    monthly_traffic: Optional[int] = None
    preferred_contact_method: Optional[str] = None
    notes: Optional[str] = None
    campaign_id: Optional[str] = None
    status: Optional[str] = None
    pipeline_stage: Optional[str] = None  # Unified pipeline stage
    
    # YouTube-specific metrics (matching frontend field names)
    youtube_subscribers: Optional[int] = None
    youtube_avg_views: Optional[int] = None
    youtube_avg_likes: Optional[int] = None
    youtube_total_videos: Optional[int] = None
    youtube_video_count: Optional[int] = None
    
    # Instagram-specific metrics
    avg_likes: Optional[int] = None
    avg_comments: Optional[int] = None
    
    # Audience Demographics (manual entry)
    audience_age_13_17: Optional[float] = None  # percentage
    audience_age_18_24: Optional[float] = None
    audience_age_25_34: Optional[float] = None
    audience_age_35_44: Optional[float] = None
    audience_age_45_plus: Optional[float] = None
    audience_gender_male: Optional[float] = None  # percentage
    audience_gender_female: Optional[float] = None
    audience_top_locations: Optional[List[str]] = None  # e.g., ["Mumbai 25%", "Delhi 18%"]
    audience_interests: Optional[List[str]] = None  # e.g., ["Fashion", "Beauty", "Lifestyle"]
    
    # Content Performance Metrics
    avg_reel_views: Optional[int] = None
    avg_story_views: Optional[int] = None
    posting_frequency: Optional[str] = None  # e.g., "3x per week"
    best_posting_time: Optional[str] = None  # e.g., "6-9 PM IST"
    content_style: Optional[List[str]] = None  # e.g., ["UGC", "Product Reviews", "Tutorials"]
    
    # Deliverables / Rate cards
    deliverables: Optional[List[dict]] = None
    
    # Allow extra fields from frontend (Pydantic v2 syntax)
    model_config = {"extra": "ignore"}

class ContactResponse(BaseModel):
    id: str
    name: str
    contact_type: str
    bio: Optional[str] = None
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    twitter_handle: Optional[str] = None
    linkedin_url: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    primary_platform: Optional[str] = None
    content_type: List[str] = []
    style_tags: List[str] = []
    languages: List[str] = []
    tier: Optional[str] = None
    followers: int = 0
    engagement_rate: float = 0.0
    rate_per_post: Optional[float] = None
    rate_per_reel: Optional[float] = None
    publication: Optional[str] = None
    publication_id: Optional[str] = None  # Link to publications collection
    beat: Optional[str] = None
    editor_level: Optional[str] = None
    notes: Optional[str] = None
    status: str = "identified"
    pipeline_stage: Optional[str] = "identified"  # Unified pipeline stage
    score: float = 0.0
    campaign_id: Optional[str] = None
    campaign_deliverable_id: Optional[str] = None
    campaign_deliverable_name: Optional[str] = None
    campaign_agreed_fee: Optional[float] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    # YouTube-specific metrics
    youtube_subscribers: Optional[int] = None
    youtube_avg_views: Optional[int] = None
    youtube_avg_likes: Optional[int] = None
    youtube_video_count: Optional[int] = None
    youtube_total_videos: Optional[int] = None
    
    # Instagram-specific metrics  
    avg_likes: Optional[int] = None
    avg_comments: Optional[int] = None
    
    # Deliverables / Rate cards
    deliverables: List[dict] = []

# ============== COMMUNICATION MODEL ==============
class CommunicationType(str, Enum):
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    PHONE = "phone"
    DM = "dm"
    NOTE = "note"

class CommunicationCreate(BaseModel):
    contact_id: str
    comm_type: CommunicationType
    subject: Optional[str] = None
    message: str
    direction: str = "outbound"  # outbound or inbound

class CommunicationResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    comm_type: str
    subject: Optional[str] = None
    message: str
    direction: str
    status: str = "sent"
    sent_at: str
    opened: bool = False
    replied: bool = False

# ============== DEAL & CONTRACT MODEL ==============
class DealStatus(str, Enum):
    PENDING = "pending"
    NEGOTIATING = "negotiating"
    AGREED = "agreed"
    CONTRACT_SENT = "contract_sent"
    SIGNED = "signed"
    REJECTED = "rejected"
    ON_HOLD = "on_hold"

class DeliverableType(str, Enum):
    REEL = "reel"
    POST = "post"
    STORY = "story"
    CAROUSEL = "carousel"
    YOUTUBE_VIDEO = "youtube_video"
    YOUTUBE_SHORT = "youtube_short"
    LIVE = "live"
    ARTICLE = "article"  # For journalists
    MENTION = "mention"  # PR mention

class DeliverableItem(BaseModel):
    type: DeliverableType
    quantity: int = 1
    rate: float = 0.0
    platform: str = "instagram"

class DealCreate(BaseModel):
    contact_id: str
    campaign_id: Optional[str] = None
    initial_quote: Optional[float] = 0
    our_budget: Optional[float] = None
    final_amount: Optional[float] = None
    deliverables: Optional[str] = ""  # Text description of deliverables
    deadline: Optional[str] = None
    notes: Optional[str] = None

class DealResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    initial_quote: Optional[float] = 0
    our_budget: Optional[float] = None
    final_amount: Optional[float] = None
    deliverables: Optional[str] = ""  # Text description of deliverables
    deadline: Optional[str] = None
    notes: Optional[str] = None
    status: str = "pending"
    timeline: List[dict] = []  # Negotiation history
    created_at: str
    updated_at: Optional[str] = None

# ============== CONTRACT MODEL ==============
class ContractStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    VIEWED = "viewed"
    SIGNED = "signed"
    EXPIRED = "expired"

class ContractCreate(BaseModel):
    deal_id: str
    contact_id: str
    title: str
    content: str  # HTML or markdown content
    valid_until: Optional[str] = None

class ContractResponse(BaseModel):
    id: str
    deal_id: str
    contact_id: str
    contact_name: Optional[str] = None
    title: str
    content: str
    status: str = "draft"
    valid_until: Optional[str] = None
    sent_at: Optional[str] = None
    signed_at: Optional[str] = None
    created_at: str

# ============== PAYMENT MODEL ==============
class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"

class PaymentType(str, Enum):
    INFLUENCER_FEE = "influencer_fee"
    PR_PLACEMENT = "pr_placement"
    ADVERTORIAL = "advertorial"
    BONUS = "bonus"
    REIMBURSEMENT = "reimbursement"
    ADVANCE = "advance"
    OTHER = "other"

class PaymentCreate(BaseModel):
    contact_id: str
    deal_id: Optional[str] = None
    campaign_id: Optional[str] = None  # Links to campaign budget
    deliverable_id: Optional[str] = None  # ID of UGC or MediaCoverage
    deliverable_type: Optional[str] = None  # "ugc" or "coverage" or "deal"
    amount: float
    description: str
    payment_type: str = "influencer_fee"
    payment_method: str = "bank_transfer"
    invoice_number: Optional[str] = None
    due_date: Optional[str] = None

class PaymentResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    deal_id: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    deliverable_id: Optional[str] = None
    deliverable_type: Optional[str] = None
    amount: float
    description: str
    payment_type: str = "influencer_fee"
    payment_method: Optional[str] = "bank_transfer"
    invoice_number: Optional[str] = None
    due_date: Optional[str] = None
    status: str = "pending"
    paid_at: Optional[str] = None
    created_at: str

# ============== UGC (User Generated Content) MODEL ==============
class ContentStatus(str, Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    PUBLISHED = "published"

class UGCCreate(BaseModel):
    contact_id: str
    campaign_id: Optional[str] = None
    deal_id: Optional[str] = None
    title: str
    content_type: str  # reel, post, story, article
    platform: str
    url: Optional[str] = None
    media_urls: List[str] = []
    caption: Optional[str] = None
    hashtags: List[str] = []
    scheduled_date: Optional[str] = None

class UGCResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    campaign_id: Optional[str] = None
    deal_id: Optional[str] = None
    title: str
    content_type: str
    platform: str
    url: Optional[str] = None
    media_urls: List[str] = []
    caption: Optional[str] = None
    hashtags: List[str] = []
    status: str = "draft"
    scheduled_date: Optional[str] = None
    published_date: Optional[str] = None
    metrics: dict = {}  # likes, comments, shares, views
    created_at: str

# ============== DIGITAL PR MODELS ==============

# PR Campaign
class PRCampaignStatus(str, Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PRCampaignCreate(BaseModel):
    name: str
    objective: str
    description: Optional[str] = None
    story_angle: Optional[str] = None
    key_messages: List[str] = []
    target_publications: List[str] = []
    target_beats: List[str] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    embargo_date: Optional[str] = None
    budget: float = 0.0
    owner_id: Optional[str] = None

class PRCampaignResponse(BaseModel):
    id: str
    name: str
    objective: str
    description: Optional[str] = None
    story_angle: Optional[str] = None
    key_messages: List[str] = []
    target_publications: List[str] = []
    target_beats: List[str] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    embargo_date: Optional[str] = None
    budget: float = 0.0
    spent: float = 0.0
    status: str = "planning"
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    journalist_ids: List[str] = []
    press_release_ids: List[str] = []
    pitch_count: int = 0
    coverage_count: int = 0
    response_rate: float = 0.0
    created_at: str
    updated_at: Optional[str] = None

# Outreach Sequence / Email Template
class OutreachTemplateType(str, Enum):
    INITIAL_PITCH = "initial_pitch"
    FOLLOW_UP_1 = "follow_up_1"
    FOLLOW_UP_2 = "follow_up_2"
    FOLLOW_UP_3 = "follow_up_3"
    THANK_YOU = "thank_you"
    EXCLUSIVE_OFFER = "exclusive_offer"

class OutreachTemplateCreate(BaseModel):
    name: str
    template_type: OutreachTemplateType
    subject: str
    body: str
    delay_days: int = 0  # Days after previous step
    is_active: bool = True

class OutreachTemplateResponse(BaseModel):
    id: str
    name: str
    template_type: str
    subject: str
    body: str
    delay_days: int = 0
    is_active: bool = True
    usage_count: int = 0
    created_at: str

# Outreach Sequence (Automation)
class OutreachSequenceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    pr_campaign_id: Optional[str] = None
    template_ids: List[str] = []  # Ordered list of template IDs
    is_active: bool = True

class OutreachSequenceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    pr_campaign_id: Optional[str] = None
    template_ids: List[str] = []
    templates: List[dict] = []  # Populated template details
    is_active: bool = True
    contacts_enrolled: int = 0
    created_at: str

# Scheduled Outreach
class ScheduledOutreachStatus(str, Enum):
    SCHEDULED = "scheduled"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ScheduledOutreachCreate(BaseModel):
    contact_id: str
    sequence_id: Optional[str] = None
    template_id: str
    pr_campaign_id: Optional[str] = None
    scheduled_at: str
    channel: str = "email"  # email, linkedin, twitter

class ScheduledOutreachResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    sequence_id: Optional[str] = None
    template_id: str
    pr_campaign_id: Optional[str] = None
    scheduled_at: str
    sent_at: Optional[str] = None
    channel: str = "email"
    status: str = "scheduled"
    subject: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str

# Press Release
class PressReleaseStatus(str, Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    DISTRIBUTED = "distributed"
    PUBLISHED = "published"

class PressReleaseCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    body: str
    boilerplate: Optional[str] = None
    contact_info: Optional[str] = None
    embargo_date: Optional[str] = None
    target_publications: List[str] = []
    media_assets: List[str] = []  # URLs to images/videos

class PressReleaseResponse(BaseModel):
    id: str
    title: str
    subtitle: Optional[str] = None
    body: str
    boilerplate: Optional[str] = None
    contact_info: Optional[str] = None
    embargo_date: Optional[str] = None
    target_publications: List[str] = []
    media_assets: List[str] = []
    status: str = "draft"
    distributed_to: List[str] = []  # Contact IDs
    coverage_count: int = 0
    created_at: str
    published_at: Optional[str] = None

# Media Coverage
class CoverageType(str, Enum):
    ARTICLE = "article"
    MENTION = "mention"
    FEATURE = "feature"
    INTERVIEW = "interview"
    REVIEW = "review"

class CoverageSentiment(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"

class MediaCoverageCreate(BaseModel):
    title: str
    publication: str
    url: str
    coverage_type: CoverageType
    contact_id: Optional[str] = None  # Journalist who wrote it
    press_release_id: Optional[str] = None
    campaign_id: Optional[str] = None
    published_date: Optional[str] = None
    sentiment: CoverageSentiment = CoverageSentiment.NEUTRAL
    reach: Optional[int] = None  # Estimated reach
    notes: Optional[str] = None

class MediaCoverageResponse(BaseModel):
    id: str
    title: str
    publication: str
    url: str
    coverage_type: str
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    press_release_id: Optional[str] = None
    campaign_id: Optional[str] = None
    published_date: Optional[str] = None
    sentiment: str
    reach: Optional[int] = None
    notes: Optional[str] = None
    created_at: str

# PR Outreach (Pitches)
class PRPitchStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    OPENED = "opened"
    RESPONDED = "responded"
    INTERESTED = "interested"
    DECLINED = "declined"

class PRPitchCreate(BaseModel):
    contact_id: str
    press_release_id: Optional[str] = None
    subject: str
    message: str
    follow_up_date: Optional[str] = None

class PRPitchResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    publication: Optional[str] = None
    press_release_id: Optional[str] = None
    subject: str
    message: str
    status: str = "draft"
    sent_at: Optional[str] = None
    opened_at: Optional[str] = None
    responded_at: Optional[str] = None
    follow_up_date: Optional[str] = None
    created_at: str

# ============== EVENTS MODEL ==============
class EventType(str, Enum):
    BRAND_LAUNCH = "brand_launch"
    PRESS_EVENT = "press_event"
    INFLUENCER_MEETUP = "influencer_meetup"
    FASHION_SHOW = "fashion_show"
    WEBINAR = "webinar"
    PRODUCT_LAUNCH = "product_launch"
    OTHER = "other"

class EventStatus(str, Enum):
    PLANNING = "planning"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class EventCreate(BaseModel):
    name: str
    event_type: EventType
    description: Optional[str] = None
    venue: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    campaign_id: Optional[str] = None
    budget: float = 0.0
    max_attendees: Optional[int] = None
    registration_required: bool = False
    notes: Optional[str] = None

class EventResponse(BaseModel):
    id: str
    name: str
    event_type: str
    description: Optional[str] = None
    venue: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    budget: float = 0.0
    spent: float = 0.0
    max_attendees: Optional[int] = None
    confirmed_attendees: int = 0
    registration_required: bool = False
    status: str = "planning"
    attendees: List[dict] = []  # List of contact IDs with RSVP status
    notes: Optional[str] = None
    created_at: str

class EventAttendeeCreate(BaseModel):
    event_id: str
    contact_id: str
    rsvp_status: str = "invited"  # invited, confirmed, declined, attended
    notes: Optional[str] = None

# ============== CONTENT & ASSETS MODELS ==============
class AssetType(str, Enum):
    LOGO = "logo"
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"
    GUIDELINE = "guideline"
    TEMPLATE = "template"
    PRESS_RELEASE = "press_release"
    FOUNDER_IMAGE = "founder_image"
    PRODUCT_IMAGE = "product_image"
    BRAND_STORY = "brand_story"

class AssetCreate(BaseModel):
    name: str
    asset_type: AssetType
    category: str  # brand_assets, press_kit, templates
    description: Optional[str] = None
    file_url: str
    file_size: Optional[int] = None
    file_format: Optional[str] = None
    tags: List[str] = []
    campaign_id: Optional[str] = None  # Link to campaign
    version: int = 1
    parent_asset_id: Optional[str] = None  # For version history

class AssetResponse(BaseModel):
    id: str
    name: str
    asset_type: str
    category: str
    description: Optional[str] = None
    file_url: str
    file_size: Optional[int] = None
    file_format: Optional[str] = None
    tags: List[str] = []
    downloads: int = 0
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    version: int = 1
    parent_asset_id: Optional[str] = None
    versions: List[dict] = []  # Version history
    created_at: str
    updated_at: Optional[str] = None

# ============== TEMPLATE MODEL ==============
class TemplateType(str, Enum):
    EMAIL = "email"
    OUTREACH = "outreach"
    PRESS_RELEASE = "press_release"
    CAMPAIGN_BRIEF = "campaign_brief"
    PITCH = "pitch"
    CONTRACT = "contract"

class TemplateCreate(BaseModel):
    name: str
    template_type: TemplateType
    subject: Optional[str] = None  # For email templates
    content: str  # HTML or text content
    variables: List[str] = []  # Placeholders like {{name}}, {{company}}
    category: Optional[str] = None
    tags: List[str] = []

class TemplateResponse(BaseModel):
    id: str
    name: str
    template_type: str
    subject: Optional[str] = None
    content: str
    variables: List[str] = []
    category: Optional[str] = None
    tags: List[str] = []
    usage_count: int = 0
    created_at: str
    updated_at: Optional[str] = None

# ============== INFLUENCER DELIVERY MODEL ==============
class DeliveryContentType(str, Enum):
    POST = "post"
    REEL = "reel"
    STORY = "story"
    VIDEO = "video"
    CAROUSEL = "carousel"
    BLOG = "blog"
    LIVE = "live"

class InfluencerDeliveryCreate(BaseModel):
    contact_id: str  # Influencer ID
    campaign_id: Optional[str] = None
    platform: str  # instagram, youtube, etc.
    content_type: DeliveryContentType
    content_url: str
    title: Optional[str] = None
    description: Optional[str] = None
    publish_date: str
    # Engagement metrics
    views: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    saves: int = 0
    reach: int = 0
    impressions: int = 0

class InfluencerDeliveryResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    platform: str
    content_type: str
    content_url: str
    title: Optional[str] = None
    description: Optional[str] = None
    publish_date: str
    views: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    saves: int = 0
    reach: int = 0
    impressions: int = 0
    engagement_rate: float = 0.0
    created_at: str
    updated_at: Optional[str] = None

# ============== APPROVAL WORKFLOW MODEL ==============
class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISION_REQUESTED = "revision_requested"

class ApprovalCreate(BaseModel):
    item_type: str  # ugc, press_release, content
    item_id: str
    submitted_by: str
    notes: Optional[str] = None

class ApprovalResponse(BaseModel):
    id: str
    item_type: str
    item_id: str
    item_title: Optional[str] = None
    submitted_by: str
    submitted_by_name: Optional[str] = None
    status: str = "pending"
    reviewed_by: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    review_notes: Optional[str] = None
    submitted_at: str
    reviewed_at: Optional[str] = None

# ============== MARKETING CALENDAR MODEL ==============
class CalendarItemType(str, Enum):
    CAMPAIGN = "campaign"
    PR = "pr"
    EVENT = "event"
    CONTENT = "content"
    DEADLINE = "deadline"

class CalendarItemCreate(BaseModel):
    title: str
    item_type: CalendarItemType
    reference_id: Optional[str] = None  # ID of campaign/event/etc
    start_date: str
    end_date: Optional[str] = None
    all_day: bool = True
    color: Optional[str] = None
    description: Optional[str] = None

class CalendarItemResponse(BaseModel):
    id: str
    title: str
    item_type: str
    reference_id: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    all_day: bool = True
    color: Optional[str] = None
    description: Optional[str] = None
    created_at: str


# ============== UNIFIED OUTREACH SEQUENCE MODELS ==============
class SequenceStepType(str, Enum):
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    LINKEDIN = "linkedin"
    CALL = "call"
    WAIT = "wait"

class UnifiedSequenceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    target_type: str  # "influencer" or "journalist" or "both"
    steps: List[dict]  # [{step_type, delay_days, template_id, message, subject}]
    is_active: bool = True
    campaign_id: Optional[str] = None

class UnifiedSequenceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    target_type: str
    steps: List[dict]
    is_active: bool = True
    campaign_id: Optional[str] = None
    enrolled_count: int = 0
    completed_count: int = 0
    response_count: int = 0
    created_at: str
    updated_at: Optional[str] = None

class SequenceEnrollmentCreate(BaseModel):
    sequence_id: str
    contact_id: str
    campaign_id: Optional[str] = None
    start_immediately: bool = True

class SequenceEnrollmentResponse(BaseModel):
    id: str
    sequence_id: str
    sequence_name: Optional[str] = None
    contact_id: str
    contact_name: Optional[str] = None
    contact_type: Optional[str] = None
    campaign_id: Optional[str] = None
    current_step: int = 0
    status: str = "active"  # active, paused, completed, stopped
    next_action_at: Optional[str] = None
    enrolled_at: str
    completed_at: Optional[str] = None

# ============== UNIFIED ACTIVITY FEED MODELS ==============
class ActivityType(str, Enum):
    COMMUNICATION = "communication"
    DEAL = "deal"
    PAYMENT = "payment"
    PITCH = "pitch"
    COVERAGE = "coverage"
    INTERACTION = "interaction"
    STATUS_CHANGE = "status_change"
    SEQUENCE = "sequence"
    CAMPAIGN = "campaign"

class ActivityResponse(BaseModel):
    id: str
    activity_type: str
    title: str
    description: Optional[str] = None
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    reference_id: Optional[str] = None  # ID of the related entity
    metadata: Optional[dict] = None
    created_at: str
    created_by: Optional[str] = None

# ============== PUBLICATION ADVERTORIAL/PAID PLACEMENT MODELS ==============
class AdvertorialType(str, Enum):
    SPONSORED_ARTICLE = "sponsored_article"
    NATIVE_AD = "native_ad"
    BRANDED_CONTENT = "branded_content"
    PRESS_RELEASE = "press_release"
    INTERVIEW = "interview"
    FEATURE = "feature"
    PRODUCT_REVIEW = "product_review"

class AdvertorialCreate(BaseModel):
    publication_id: str
    journalist_id: Optional[str] = None  # Contact ID of journalist handling it
    campaign_id: Optional[str] = None
    advertorial_type: AdvertorialType
    title: str
    description: Optional[str] = None
    proposed_amount: float
    final_amount: Optional[float] = None
    publish_date: Optional[str] = None
    deliverables: List[str] = []  # ["1x feature article", "2x social posts"]
    requirements: Optional[str] = None

class AdvertorialResponse(BaseModel):
    id: str
    publication_id: str
    publication_name: Optional[str] = None
    journalist_id: Optional[str] = None
    journalist_name: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    advertorial_type: str
    title: str
    description: Optional[str] = None
    proposed_amount: float
    final_amount: Optional[float] = None
    publish_date: Optional[str] = None
    deliverables: List[str] = []
    requirements: Optional[str] = None
    status: str = "proposed"  # proposed, negotiating, confirmed, in_progress, published, cancelled
    payment_status: str = "pending"  # pending, partial, paid
    timeline: List[dict] = []
    created_at: str
    updated_at: Optional[str] = None



# ============== PHASE 5: RELATIONSHIP CRM ==============

class InteractionType(str, Enum):
    EMAIL = "email"
    CALL = "call"
    MEETING = "meeting"
    SOCIAL = "social"
    EVENT = "event"
    PITCH = "pitch"
    FOLLOW_UP = "follow_up"
    COVERAGE = "coverage"
    NOTE = "note"

class InteractionCreate(BaseModel):
    contact_id: str
    interaction_type: InteractionType
    subject: Optional[str] = None
    notes: str
    outcome: Optional[str] = None  # positive, neutral, negative, pending
    follow_up_date: Optional[str] = None
    related_campaign_id: Optional[str] = None

class InteractionResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    interaction_type: str
    subject: Optional[str] = None
    notes: str
    outcome: Optional[str] = None
    follow_up_date: Optional[str] = None
    related_campaign_id: Optional[str] = None
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: str

class RelationshipScoreUpdate(BaseModel):
    contact_id: str
    score_adjustment: int  # -10 to +10
    reason: str

# ============== PHASE 8: PRESS KIT MANAGEMENT ==============

class PressKitAssetType(str, Enum):
    LOGO = "logo"
    BRAND_GUIDELINES = "brand_guidelines"
    PRODUCT_IMAGE = "product_image"
    FOUNDER_BIO = "founder_bio"
    COMPANY_FACT_SHEET = "company_fact_sheet"
    PRESS_RELEASE = "press_release"
    VIDEO = "video"
    PRESENTATION = "presentation"
    OTHER = "other"

class PressKitAssetCreate(BaseModel):
    name: str
    asset_type: PressKitAssetType
    description: Optional[str] = None
    file_url: str
    file_size: Optional[int] = None  # in bytes
    file_format: Optional[str] = None  # jpg, png, pdf, mp4
    is_public: bool = True  # Available for press kit download
    tags: List[str] = []
    category: Optional[str] = None  # Products, Company, Leadership, Events

class PressKitAssetResponse(BaseModel):
    id: str
    name: str
    asset_type: str
    description: Optional[str] = None
    file_url: str
    file_size: Optional[int] = None
    file_format: Optional[str] = None
    is_public: bool = True
    tags: List[str] = []
    category: Optional[str] = None
    download_count: int = 0
    created_at: str
    updated_at: Optional[str] = None

class PressKitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    asset_ids: List[str] = []
    is_active: bool = True
    password_protected: bool = False
    password: Optional[str] = None
    expiry_date: Optional[str] = None

class PressKitResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    asset_ids: List[str] = []
    assets: List[dict] = []  # Populated asset details
    is_active: bool = True
    password_protected: bool = False
    expiry_date: Optional[str] = None
    share_url: Optional[str] = None
    view_count: int = 0
    download_count: int = 0
    created_at: str

# ============== PHASE 9: ALERTS & MONITORING ==============

class AlertType(str, Enum):
    BRAND_MENTION = "brand_mention"
    KEYWORD = "keyword"
    COMPETITOR = "competitor"
    JOURNALIST = "journalist"
    PUBLICATION = "publication"

class AlertPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class MonitoringAlertCreate(BaseModel):
    name: str
    alert_type: AlertType
    keywords: List[str]  # Keywords to monitor
    sources: List[str] = []  # Specific publications/platforms to monitor
    is_active: bool = True
    notify_email: bool = True
    notify_in_app: bool = True
    priority: AlertPriority = AlertPriority.MEDIUM

class MonitoringAlertResponse(BaseModel):
    id: str
    name: str
    alert_type: str
    keywords: List[str]
    sources: List[str] = []
    is_active: bool = True
    notify_email: bool = True
    notify_in_app: bool = True
    priority: str = "medium"
    last_triggered: Optional[str] = None
    trigger_count: int = 0
    created_at: str

class AlertTriggerCreate(BaseModel):
    alert_id: str
    title: str
    source: str
    url: Optional[str] = None
    snippet: Optional[str] = None
    sentiment: Optional[str] = None  # positive, neutral, negative
    matched_keywords: List[str] = []

class AlertTriggerResponse(BaseModel):
    id: str
    alert_id: str
    alert_name: Optional[str] = None
    title: str
    source: str
    url: Optional[str] = None
    snippet: Optional[str] = None
    sentiment: Optional[str] = None
    matched_keywords: List[str] = []
    is_read: bool = False
    is_actioned: bool = False
    created_at: str

# ============== PHASE 10: PIPELINE VIEW ==============

class PipelineStage(str, Enum):
    PROSPECT = "prospect"
    RESEARCHING = "researching"
    CONTACTED = "contacted"
    REPLIED = "replied"
    INTERESTED = "interested"
    NEGOTIATING = "negotiating"
    CONFIRMED = "confirmed"
    PUBLISHED = "published"
    DECLINED = "declined"

class PipelineContactUpdate(BaseModel):
    contact_id: str
    stage: PipelineStage
    notes: Optional[str] = None
    pr_campaign_id: Optional[str] = None

class PipelineContactResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: str
    contact_email: Optional[str] = None
    publication: Optional[str] = None
    beat: Optional[str] = None
    stage: str
    notes: Optional[str] = None
    pr_campaign_id: Optional[str] = None
    days_in_stage: int = 0
    last_activity: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

class PipelineStageStats(BaseModel):
    stage: str
    count: int
    contacts: List[dict] = []



# ============== PUBLICATION MODELS (PR equivalent of Influencers) ==============

class PublicationType(str, Enum):
    NEWSPAPER = "newspaper"
    MAGAZINE = "magazine"
    ONLINE_PUBLICATION = "online_publication"
    BLOG = "blog"
    NEWS_WIRE = "news_wire"
    TRADE_PUBLICATION = "trade_publication"
    BROADCAST = "broadcast"

class PublicationTier(str, Enum):
    TIER_1 = "tier_1"      # Top national/international (Vogue, Elle, GQ)
    TIER_2 = "tier_2"      # Major regional/industry (Femina, Grazia)
    TIER_3 = "tier_3"      # Niche/specialized
    TIER_4 = "tier_4"      # Local/emerging

class PublicationCreate(BaseModel):
    """Publication model - PR equivalent of Influencer"""
    name: str
    publication_type: PublicationType = PublicationType.ONLINE_PUBLICATION
    tier: PublicationTier = PublicationTier.TIER_2
    
    # Publication info
    website: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    
    # Metrics (equivalent to influencer followers/engagement)
    domain_authority: Optional[int] = None  # 1-100
    monthly_traffic: Optional[int] = None
    monthly_readership: Optional[int] = None
    social_followers: Optional[int] = None  # Combined social following
    
    # Audience
    audience_demographics: Optional[str] = None  # e.g., "Women 25-45, urban, affluent"
    geographic_focus: List[str] = []  # e.g., ["India", "South Asia"]
    
    # Editorial
    beats_covered: List[str] = []  # e.g., ["Fashion", "Lifestyle", "Beauty"]
    content_types: List[str] = []  # e.g., ["News", "Features", "Interviews", "Reviews"]
    editorial_calendar: Optional[str] = None  # Notes about their editorial calendar
    
    # Pricing (for paid PR)
    advertorial_rate: Optional[float] = None
    sponsored_content_rate: Optional[float] = None
    display_ad_rate: Optional[float] = None
    
    # Contact
    general_email: Optional[str] = None
    editorial_email: Optional[str] = None
    pr_email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    
    # Social handles
    instagram_handle: Optional[str] = None
    twitter_handle: Optional[str] = None
    linkedin_url: Optional[str] = None
    
    # Relationship
    relationship_status: str = "new"  # new, active, dormant, vip
    relationship_score: int = 0  # 0-100
    
    notes: Optional[str] = None

class PublicationResponse(BaseModel):
    id: str
    name: str
    publication_type: str
    tier: str
    website: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    domain_authority: Optional[int] = None
    monthly_traffic: Optional[int] = None
    monthly_readership: Optional[int] = None
    social_followers: Optional[int] = None
    audience_demographics: Optional[str] = None
    geographic_focus: List[str] = []
    beats_covered: List[str] = []
    content_types: List[str] = []
    editorial_calendar: Optional[str] = None
    advertorial_rate: Optional[float] = None
    sponsored_content_rate: Optional[float] = None
    display_ad_rate: Optional[float] = None
    general_email: Optional[str] = None
    editorial_email: Optional[str] = None
    pr_email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    instagram_handle: Optional[str] = None
    twitter_handle: Optional[str] = None
    linkedin_url: Optional[str] = None
    relationship_status: str = "new"
    relationship_score: int = 0
    notes: Optional[str] = None
    journalist_count: int = 0  # Number of journalists linked to this publication
    coverage_count: int = 0  # Number of coverages from this publication
    created_at: str
    updated_at: Optional[str] = None
