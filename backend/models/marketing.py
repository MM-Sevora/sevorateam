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
    publication_website: Optional[str] = None
    beat: Optional[str] = None  # e.g., "fashion", "lifestyle", "tech"
    editor_level: Optional[str] = None  # e.g., "staff", "senior", "editor-in-chief"
    domain_authority: Optional[int] = None  # 1-100
    monthly_traffic: Optional[int] = None
    preferred_contact_method: Optional[str] = None  # email, phone, linkedin, twitter
    
    notes: Optional[str] = None
    
    # Campaign assignment
    campaign_id: Optional[str] = None

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
    beat: Optional[str] = None
    editor_level: Optional[str] = None
    notes: Optional[str] = None
    status: str = "identified"
    score: float = 0.0
    campaign_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

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
    initial_quote: float
    our_budget: Optional[float] = None
    final_amount: Optional[float] = None
    deliverables: List[DeliverableItem] = []
    deadline: Optional[str] = None
    notes: Optional[str] = None

class DealResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    campaign_id: Optional[str] = None
    campaign_name: Optional[str] = None
    initial_quote: float
    our_budget: Optional[float] = None
    final_amount: Optional[float] = None
    deliverables: List[dict] = []
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

class PaymentCreate(BaseModel):
    contact_id: str
    deal_id: Optional[str] = None
    amount: float
    description: str
    payment_method: str = "bank_transfer"
    invoice_number: Optional[str] = None

class PaymentResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: Optional[str] = None
    deal_id: Optional[str] = None
    amount: float
    description: str
    payment_method: str
    invoice_number: Optional[str] = None
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
    published_date: str
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
    published_date: str
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

class AssetCreate(BaseModel):
    name: str
    asset_type: AssetType
    category: str  # brand_assets, press_kit, templates
    description: Optional[str] = None
    file_url: str
    file_size: Optional[int] = None
    file_format: Optional[str] = None
    tags: List[str] = []

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
