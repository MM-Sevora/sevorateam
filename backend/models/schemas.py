from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any

# ============== USER MODELS ==============
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "influencer_manager"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ============== INFLUENCER MODELS ==============
class InfluencerCreate(BaseModel):
    # Basic Information
    name: str
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    
    # Social Media Handles (Instagram & YouTube only)
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    
    # Primary Platform - which platform is their main presence
    primary_platform: str = "instagram"  # instagram, youtube
    
    # Contact Information
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    
    # Agent/Manager Contact
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    manager_phone: Optional[str] = None
    
    # Location
    city: str
    state: Optional[str] = None
    country: str = "India"
    
    # Classification
    industry: str = "fashion"  # fashion, beauty, lifestyle, fitness, tech, food, travel
    content_type: List[str] = []  # reels, posts, stories, youtube, blogs
    tier: str = "micro"  # nano, micro, macro, mega, celebrity
    gender: Optional[str] = None  # male, female, non-binary, other
    gender_focus: str = "unisex"  # menswear, womenswear, unisex
    
    # Per-Platform Metrics
    instagram_metrics: Optional[Dict[str, Any]] = None  # followers, engagement_rate, avg_likes, avg_comments
    youtube_metrics: Optional[Dict[str, Any]] = None  # subscribers, avg_views, avg_likes, avg_comments, total_videos
    
    # Combined Metrics (from primary platform)
    followers: int = 0
    engagement_rate: float = 0.0
    avg_likes: int = 0
    avg_comments: int = 0
    avg_views: int = 0
    
    # Audience Demographics (manual input from media kit)
    audience_demographics: Optional[Dict[str, Any]] = None  # age_split, gender_split, top_cities, languages
    
    # Rate Card
    rate_per_post: Optional[float] = None
    rate_per_reel: Optional[float] = None
    rate_per_story: Optional[float] = None
    rate_per_video: Optional[float] = None
    accepts_barter: bool = False
    
    # Commercial Terms
    exclusivity_terms: Optional[str] = None
    typical_turnaround_days: Optional[int] = None
    payment_terms: Optional[str] = None  # advance, post-delivery, split
    
    # Additional Info
    style_tags: List[str] = []
    languages: List[str] = ["English", "Hindi"]
    past_brands: List[str] = []
    portfolio_url: Optional[str] = None
    media_kit_url: Optional[str] = None
    notes: Optional[str] = None

class InfluencerUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    primary_platform: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    manager_phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    content_type: Optional[List[str]] = None
    tier: Optional[str] = None
    gender: Optional[str] = None
    gender_focus: Optional[str] = None
    instagram_metrics: Optional[Dict[str, Any]] = None
    youtube_metrics: Optional[Dict[str, Any]] = None
    followers: Optional[int] = None
    engagement_rate: Optional[float] = None
    avg_likes: Optional[int] = None
    avg_comments: Optional[int] = None
    avg_views: Optional[int] = None
    audience_demographics: Optional[Dict[str, Any]] = None
    rate_per_post: Optional[float] = None
    rate_per_reel: Optional[float] = None
    rate_per_story: Optional[float] = None
    rate_per_video: Optional[float] = None
    accepts_barter: Optional[bool] = None
    exclusivity_terms: Optional[str] = None
    typical_turnaround_days: Optional[int] = None
    payment_terms: Optional[str] = None
    style_tags: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    past_brands: Optional[List[str]] = None
    portfolio_url: Optional[str] = None
    media_kit_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class InfluencerResponse(BaseModel):
    id: str
    name: str
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    primary_platform: Optional[str] = "instagram"
    email: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    manager_phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    content_type: Optional[List[str]] = []
    tier: Optional[str] = None
    gender: Optional[str] = None
    gender_focus: Optional[str] = None
    instagram_metrics: Optional[Dict[str, Any]] = None
    youtube_metrics: Optional[Dict[str, Any]] = None
    followers: Optional[int] = 0
    engagement_rate: Optional[float] = 0.0
    avg_likes: Optional[int] = 0
    avg_comments: Optional[int] = 0
    avg_views: Optional[int] = 0
    audience_demographics: Optional[Dict[str, Any]] = None
    rate_per_post: Optional[float] = None
    rate_per_reel: Optional[float] = None
    rate_per_story: Optional[float] = None
    rate_per_video: Optional[float] = None
    accepts_barter: Optional[bool] = False
    exclusivity_terms: Optional[str] = None
    typical_turnaround_days: Optional[int] = None
    payment_terms: Optional[str] = None
    style_tags: Optional[List[str]] = []
    languages: Optional[List[str]] = []
    past_brands: Optional[List[str]] = []
    portfolio_url: Optional[str] = None
    media_kit_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    score: Optional[float] = 0.0
    created_at: Optional[str] = None
    last_contacted: Optional[str] = None
    last_verified: Optional[str] = None
    verification_status: Optional[Dict[str, Any]] = None

# ============== CAMPAIGN MODELS ==============
class DeliverableCreate(BaseModel):
    deliverable_type: str  # reel, post, story, video
    quantity: int
    deadline: Optional[str] = None
    fee: float

class CampaignCreate(BaseModel):
    name: str
    objective: str  # branding, sales
    budget: float
    start_date: str
    end_date: str
    target_market: str
    description: Optional[str] = None
    deliverables: List[DeliverableCreate] = []

class CampaignInfluencerAssign(BaseModel):
    influencer_id: str
    deliverables: List[DeliverableCreate]
    agreed_fee: float

class CampaignResponse(BaseModel):
    id: str
    name: str
    objective: str
    budget: float
    spent: float
    start_date: str
    end_date: str
    target_market: str
    description: Optional[str]
    status: str
    influencers: List[dict]
    created_at: str

# ============== OUTREACH MODELS ==============
class OutreachCreate(BaseModel):
    influencer_id: str
    channel: str  # email, whatsapp
    subject: Optional[str] = None
    message: str

class OutreachResponse(BaseModel):
    id: str
    influencer_id: str
    influencer_name: str
    channel: str
    subject: Optional[str]
    message: str
    status: str
    sent_at: str
    opened: bool
    replied: bool

# ============== NEGOTIATION MODELS ==============
class DeliverableItem(BaseModel):
    type: str  # reel, post, story, video, youtube_video, carousel, live
    quantity: int = 1
    rate: float  # per unit rate
    total: Optional[float] = None  # quantity * rate
    platform: str = "instagram"  # instagram, youtube
    notes: Optional[str] = None

class NegotiationCreate(BaseModel):
    influencer_id: str
    campaign_id: Optional[str] = None
    initial_quote: float
    our_budget: Optional[float] = None
    deliverables: str  # Legacy text field
    deliverables_bucket: Optional[List[DeliverableItem]] = []
    deadline: Optional[str] = None
    notes: Optional[str] = None

class NegotiationUpdate(BaseModel):
    counter_offer: Optional[float] = None
    our_counter: Optional[float] = None
    final_price: Optional[float] = None
    status: Optional[str] = None  # pending, negotiating, agreed, rejected, on_hold
    notes: Optional[str] = None
    deadline: Optional[str] = None
    deliverables_bucket: Optional[List[DeliverableItem]] = None

class NegotiationEventCreate(BaseModel):
    event_type: str  # quote_sent, counter_received, counter_sent, agreed, rejected, note_added
    amount: Optional[float] = None
    note: Optional[str] = None
    deliverables_bucket: Optional[List[DeliverableItem]] = None

# ============== AI MODELS ==============
class AIMatchRequest(BaseModel):
    min_followers: int = 10000
    min_engagement: float = 3.0
    city: Optional[str] = None
    style_tags: List[str] = []

class AICaptionRequest(BaseModel):
    brand: str
    product: str
    tone: str = "luxury"
    hashtags: bool = True

class AICampaignIdeaRequest(BaseModel):
    season: str
    budget: float

class AIAutoDiscoveryRequest(BaseModel):
    campaign_brief: str
    target_audience: Optional[str] = None
    budget_range: Optional[str] = None
    location: Optional[str] = "India"
    style_preference: Optional[str] = None
    follower_range: Optional[str] = "10K-500K"
    content_type: Optional[str] = None
    num_suggestions: int = 10

# ============== SOCIAL API MODELS ==============
class SocialConfigRequest(BaseModel):
    instagram_token: Optional[str] = None
    instagram_account_id: Optional[str] = None
    youtube_api_key: Optional[str] = None

class SocialVerifyRequest(BaseModel):
    platform: str  # instagram, youtube
    handle: str
