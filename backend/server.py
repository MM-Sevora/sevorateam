from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import asyncio
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'sevora-secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 1440))

# Create the main app
app = FastAPI(title="SEVORA Influencer Operations API")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])
influencer_router = APIRouter(prefix="/influencers", tags=["Influencers"])
campaign_router = APIRouter(prefix="/campaigns", tags=["Campaigns"])
outreach_router = APIRouter(prefix="/outreach", tags=["Outreach"])
analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])
ai_router = APIRouter(prefix="/ai", tags=["AI"])
social_router = APIRouter(prefix="/social", tags=["Social API"])
scheduled_router = APIRouter(prefix="/scheduled", tags=["Scheduled Discovery"])

security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============
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

class InfluencerCreate(BaseModel):
    # Basic Information
    name: str
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    
    # Social Media Handles
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    tiktok_handle: Optional[str] = None
    linkedin_handle: Optional[str] = None
    twitter_handle: Optional[str] = None
    pinterest_handle: Optional[str] = None
    blog_url: Optional[str] = None
    
    # Primary Platform - which platform is their main presence
    primary_platform: str = "instagram"  # instagram, youtube, linkedin, tiktok, twitter
    
    # Contact Information
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    
    # Location
    city: str
    state: Optional[str] = None
    country: str = "India"
    
    # Classification
    category: str  # menswear, womenswear, luxury, ethnic, streetwear
    content_type: List[str] = []  # fashion, lifestyle, beauty, fitness
    tier: str = "micro"  # nano, micro, macro, mega, celebrity
    gender_focus: str = "unisex"  # menswear, womenswear, unisex
    
    # Metrics
    followers: int = 0
    engagement_rate: float = 0.0
    avg_likes: int = 0
    avg_comments: int = 0
    avg_views: int = 0
    
    # Audience Demographics
    audience_location: str = "India"
    audience_age_group: str = "18-34"
    audience_gender_split: Optional[str] = None  # e.g., "60% Female, 40% Male"
    
    # Rate Card
    rate_per_post: Optional[float] = None
    rate_per_reel: Optional[float] = None
    rate_per_story: Optional[float] = None
    rate_per_video: Optional[float] = None
    accepts_barter: bool = False
    
    # Additional Info
    style_tags: List[str] = []
    languages: List[str] = ["English", "Hindi"]
    past_brands: List[str] = []
    portfolio_url: Optional[str] = None
    media_kit_url: Optional[str] = None
    notes: Optional[str] = None

class InfluencerUpdate(BaseModel):
    # Basic Information
    name: Optional[str] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    
    # Social Media Handles
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    tiktok_handle: Optional[str] = None
    linkedin_handle: Optional[str] = None
    twitter_handle: Optional[str] = None
    pinterest_handle: Optional[str] = None
    blog_url: Optional[str] = None
    
    # Primary Platform
    primary_platform: Optional[str] = None
    
    # Contact Information
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    
    # Location
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    
    # Classification
    category: Optional[str] = None
    content_type: Optional[List[str]] = None
    tier: Optional[str] = None
    gender_focus: Optional[str] = None
    
    # Metrics
    followers: Optional[int] = None
    engagement_rate: Optional[float] = None
    avg_likes: Optional[int] = None
    avg_comments: Optional[int] = None
    avg_views: Optional[int] = None
    
    # Audience Demographics
    audience_location: Optional[str] = None
    audience_age_group: Optional[str] = None
    audience_gender_split: Optional[str] = None
    
    # Rate Card
    rate_per_post: Optional[float] = None
    rate_per_reel: Optional[float] = None
    rate_per_story: Optional[float] = None
    rate_per_video: Optional[float] = None
    accepts_barter: Optional[bool] = None
    
    # Additional Info
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
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    tiktok_handle: Optional[str] = None
    linkedin_handle: Optional[str] = None
    twitter_handle: Optional[str] = None
    primary_platform: Optional[str] = "instagram"
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    category: Optional[str] = None
    tier: Optional[str] = None
    followers: Optional[int] = 0
    engagement_rate: Optional[float] = 0.0
    audience_location: Optional[str] = None
    style_tags: Optional[List[str]] = []
    rate_per_reel: Optional[float] = None
    rate_per_video: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    score: Optional[float] = 0.0
    created_at: Optional[str] = None
    last_contacted: Optional[str] = None

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

class NegotiationCreate(BaseModel):
    influencer_id: str
    campaign_id: Optional[str] = None
    initial_quote: float
    our_budget: Optional[float] = None
    deliverables: str
    deadline: Optional[str] = None
    notes: Optional[str] = None

class NegotiationUpdate(BaseModel):
    counter_offer: Optional[float] = None
    our_counter: Optional[float] = None
    final_price: Optional[float] = None
    status: Optional[str] = None  # pending, negotiating, agreed, rejected, on_hold
    notes: Optional[str] = None
    deadline: Optional[str] = None

class NegotiationEventCreate(BaseModel):
    event_type: str  # quote_sent, counter_received, counter_sent, agreed, rejected, note_added
    amount: Optional[float] = None
    note: Optional[str] = None

class AIMatchRequest(BaseModel):
    category: str
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
    category: str
    budget: float

class AIAutoDiscoveryRequest(BaseModel):
    campaign_brief: str
    category: Optional[str] = None
    target_audience: Optional[str] = None
    budget_range: Optional[str] = None
    location: Optional[str] = "India"
    style_preference: Optional[str] = None
    follower_range: Optional[str] = "10K-500K"
    content_type: Optional[str] = None
    num_suggestions: int = 10

# ============== HELPERS ==============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_influencer_score(influencer: dict) -> float:
    """Calculate influencer score based on various metrics"""
    score = 0.0
    # Engagement rate (25%)
    engagement = influencer.get('engagement_rate', 0)
    score += min(engagement * 5, 25)
    # Followers (20%) - normalized
    followers = influencer.get('followers', 0)
    if followers >= 500000:
        score += 20
    elif followers >= 100000:
        score += 15
    elif followers >= 50000:
        score += 10
    elif followers >= 10000:
        score += 5
    # Fashion relevance (20%) - based on category
    fashion_cats = ['luxury', 'streetwear', 'ethnic', 'menswear', 'womenswear', 'minimal']
    if influencer.get('category', '').lower() in fashion_cats:
        score += 20
    # Content quality placeholder (15%)
    score += 12
    # Audience location (10%)
    if influencer.get('audience_location', '').lower() == 'india':
        score += 10
    # Brand alignment placeholder (10%)
    score += 8
    return round(min(score, 100), 1)

# ============== AUTH ROUTES ==============
@auth_router.post("/register", response_model=TokenResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "role": user.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"sub": user_id, "email": user.email})
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user_id, email=user.email, name=user.name, role=user.role)
    )

@auth_router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user['id'], "email": user['email']})
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user['id'], email=user['email'], name=user['name'], role=user['role'])
    )

@auth_router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)

# ============== INFLUENCER ROUTES ==============
@influencer_router.get("", response_model=List[InfluencerResponse])
async def get_influencers(
    category: Optional[str] = None,
    city: Optional[str] = None,
    min_followers: Optional[int] = None,
    min_engagement: Optional[float] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if category:
        query["category"] = {"$regex": category, "$options": "i"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if min_followers:
        query["followers"] = {"$gte": min_followers}
    if min_engagement:
        query["engagement_rate"] = {"$gte": min_engagement}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"instagram_handle": {"$regex": search, "$options": "i"}}
        ]
    
    influencers = await db.influencers.find(query, {"_id": 0}).sort("score", -1).to_list(500)
    return influencers

@influencer_router.get("/{influencer_id}", response_model=InfluencerResponse)
async def get_influencer(influencer_id: str, user: dict = Depends(get_current_user)):
    influencer = await db.influencers.find_one({"id": influencer_id}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    return influencer

@influencer_router.post("", response_model=InfluencerResponse)
async def create_influencer(data: InfluencerCreate, user: dict = Depends(get_current_user)):
    influencer_id = str(uuid.uuid4())
    influencer_doc = {
        "id": influencer_id,
        **data.model_dump(),
        "status": "identified",
        "score": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_contacted": None
    }
    influencer_doc['score'] = calculate_influencer_score(influencer_doc)
    await db.influencers.insert_one(influencer_doc)
    if '_id' in influencer_doc:
        del influencer_doc['_id']
    return influencer_doc

@influencer_router.put("/{influencer_id}", response_model=InfluencerResponse)
async def update_influencer(influencer_id: str, data: InfluencerUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.influencers.find_one_and_update(
        {"id": influencer_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    # Recalculate score
    new_score = calculate_influencer_score(result)
    await db.influencers.update_one({"id": influencer_id}, {"$set": {"score": new_score}})
    result['score'] = new_score
    del result['_id']
    return result

@influencer_router.delete("/{influencer_id}")
async def delete_influencer(influencer_id: str, user: dict = Depends(get_current_user)):
    result = await db.influencers.delete_one({"id": influencer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Influencer not found")
    return {"message": "Influencer deleted"}

# ============== CAMPAIGN ROUTES ==============
@campaign_router.get("", response_model=List[CampaignResponse])
async def get_campaigns(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    campaigns = await db.campaigns.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return campaigns

@campaign_router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: str, user: dict = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@campaign_router.post("", response_model=CampaignResponse)
async def create_campaign(data: CampaignCreate, user: dict = Depends(get_current_user)):
    campaign_id = str(uuid.uuid4())
    campaign_doc = {
        "id": campaign_id,
        "name": data.name,
        "objective": data.objective,
        "budget": data.budget,
        "spent": 0.0,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "target_market": data.target_market,
        "description": data.description,
        "status": "planning",
        "influencers": [],
        "deliverables": [d.model_dump() for d in data.deliverables],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user['id']
    }
    await db.campaigns.insert_one(campaign_doc)
    if '_id' in campaign_doc:
        del campaign_doc['_id']
    return campaign_doc

@campaign_router.put("/{campaign_id}/status")
async def update_campaign_status(campaign_id: str, status: str, user: dict = Depends(get_current_user)):
    valid_statuses = ["planning", "active", "completed", "paused"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")
    
    result = await db.campaigns.update_one({"id": campaign_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Status updated"}

@campaign_router.post("/{campaign_id}/assign")
async def assign_influencer(campaign_id: str, data: CampaignInfluencerAssign, user: dict = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    influencer = await db.influencers.find_one({"id": data.influencer_id}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    assignment = {
        "influencer_id": data.influencer_id,
        "influencer_name": influencer['name'],
        "deliverables": [d.model_dump() for d in data.deliverables],
        "agreed_fee": data.agreed_fee,
        "status": "assigned",
        "content_status": "pending",
        "assigned_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$push": {"influencers": assignment}, "$inc": {"spent": data.agreed_fee}}
    )
    
    await db.influencers.update_one({"id": data.influencer_id}, {"$set": {"status": "confirmed"}})
    
    return {"message": "Influencer assigned", "assignment": assignment}

@campaign_router.put("/{campaign_id}/influencer/{influencer_id}/content-status")
async def update_content_status(
    campaign_id: str, 
    influencer_id: str, 
    content_status: str,
    user: dict = Depends(get_current_user)
):
    valid_statuses = ["pending", "brief_sent", "draft_submitted", "approved", "published"]
    if content_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")
    
    result = await db.campaigns.update_one(
        {"id": campaign_id, "influencers.influencer_id": influencer_id},
        {"$set": {"influencers.$.content_status": content_status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign or influencer assignment not found")
    return {"message": "Content status updated"}

# ============== OUTREACH ROUTES ==============
@outreach_router.get("", response_model=List[OutreachResponse])
async def get_outreach(influencer_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if influencer_id:
        query["influencer_id"] = influencer_id
    outreach = await db.outreach.find(query, {"_id": 0}).sort("sent_at", -1).to_list(200)
    return outreach

@outreach_router.post("", response_model=OutreachResponse)
async def create_outreach(data: OutreachCreate, user: dict = Depends(get_current_user)):
    influencer = await db.influencers.find_one({"id": data.influencer_id}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    outreach_id = str(uuid.uuid4())
    outreach_doc = {
        "id": outreach_id,
        "influencer_id": data.influencer_id,
        "influencer_name": influencer['name'],
        "channel": data.channel,
        "subject": data.subject,
        "message": data.message,
        "status": "sent",
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "opened": False,
        "replied": False,
        "sent_by": user['id']
    }
    await db.outreach.insert_one(outreach_doc)
    
    # Update influencer status and last contacted
    await db.influencers.update_one(
        {"id": data.influencer_id},
        {"$set": {"status": "contacted", "last_contacted": outreach_doc['sent_at']}}
    )
    
    if '_id' in outreach_doc:
        del outreach_doc['_id']
    return outreach_doc

@outreach_router.put("/{outreach_id}/response")
async def update_outreach_response(outreach_id: str, opened: bool = False, replied: bool = False, user: dict = Depends(get_current_user)):
    update = {}
    if opened:
        update["opened"] = True
    if replied:
        update["replied"] = True
        # Update influencer status
        outreach = await db.outreach.find_one({"id": outreach_id})
        if outreach:
            await db.influencers.update_one(
                {"id": outreach['influencer_id']},
                {"$set": {"status": "interested"}}
            )
    
    if update:
        await db.outreach.update_one({"id": outreach_id}, {"$set": update})
    return {"message": "Updated"}

# ============== NEGOTIATION ROUTES ==============
@api_router.get("/negotiations")
async def get_negotiations(
    influencer_id: Optional[str] = None, 
    campaign_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if influencer_id:
        query["influencer_id"] = influencer_id
    if campaign_id:
        query["campaign_id"] = campaign_id
    if status:
        query["status"] = status
    negotiations = await db.negotiations.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return negotiations

@api_router.get("/negotiations/{neg_id}")
async def get_negotiation(neg_id: str, user: dict = Depends(get_current_user)):
    neg = await db.negotiations.find_one({"id": neg_id}, {"_id": 0})
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    return neg

@api_router.post("/negotiations")
async def create_negotiation(data: NegotiationCreate, user: dict = Depends(get_current_user)):
    influencer = await db.influencers.find_one({"id": data.influencer_id}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    campaign_name = None
    if data.campaign_id:
        campaign = await db.campaigns.find_one({"id": data.campaign_id}, {"_id": 0, "name": 1})
        campaign_name = campaign.get("name") if campaign else None
    
    neg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Initial timeline event
    timeline = [{
        "id": str(uuid.uuid4()),
        "event_type": "negotiation_started",
        "amount": data.initial_quote,
        "note": f"Negotiation started. Influencer's initial quote: ₹{data.initial_quote:,.0f}",
        "timestamp": now,
        "created_by": user.get('email', 'system')
    }]
    
    neg_doc = {
        "id": neg_id,
        "influencer_id": data.influencer_id,
        "influencer_name": influencer['name'],
        "influencer_handle": influencer.get('instagram_handle', ''),
        "campaign_id": data.campaign_id,
        "campaign_name": campaign_name,
        "initial_quote": data.initial_quote,
        "our_budget": data.our_budget,
        "counter_offer": None,
        "our_counter": None,
        "final_price": None,
        "deliverables": data.deliverables,
        "deadline": data.deadline,
        "status": "pending",
        "notes": data.notes,
        "timeline": timeline,
        "created_at": now,
        "updated_at": now
    }
    await db.negotiations.insert_one(neg_doc)
    await db.influencers.update_one({"id": data.influencer_id}, {"$set": {"status": "negotiation"}})
    if '_id' in neg_doc:
        del neg_doc['_id']
    return neg_doc

@api_router.put("/negotiations/{neg_id}")
async def update_negotiation(neg_id: str, data: NegotiationUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.negotiations.find_one_and_update(
        {"id": neg_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    
    # Update influencer status based on negotiation status
    if data.status == "agreed":
        await db.influencers.update_one(
            {"id": result["influencer_id"]}, 
            {"$set": {"status": "confirmed"}}
        )
    elif data.status == "rejected":
        await db.influencers.update_one(
            {"id": result["influencer_id"]}, 
            {"$set": {"status": "identified"}}
        )
    
    del result['_id']
    return result

@api_router.post("/negotiations/{neg_id}/timeline")
async def add_negotiation_event(neg_id: str, data: NegotiationEventCreate, user: dict = Depends(get_current_user)):
    """Add an event to the negotiation timeline"""
    neg = await db.negotiations.find_one({"id": neg_id}, {"_id": 0})
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    
    event = {
        "id": str(uuid.uuid4()),
        "event_type": data.event_type,
        "amount": data.amount,
        "note": data.note,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get('email', 'system')
    }
    
    # Update negotiation based on event type
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.event_type == "counter_received" and data.amount:
        update_data["counter_offer"] = data.amount
        update_data["status"] = "negotiating"
        event["note"] = event["note"] or f"Influencer counter-offered: ₹{data.amount:,.0f}"
    elif data.event_type == "counter_sent" and data.amount:
        update_data["our_counter"] = data.amount
        update_data["status"] = "negotiating"
        event["note"] = event["note"] or f"We countered with: ₹{data.amount:,.0f}"
    elif data.event_type == "agreed" and data.amount:
        update_data["final_price"] = data.amount
        update_data["status"] = "agreed"
        event["note"] = event["note"] or f"Deal agreed at ₹{data.amount:,.0f}"
        # Update influencer status
        await db.influencers.update_one({"id": neg["influencer_id"]}, {"$set": {"status": "confirmed"}})
    elif data.event_type == "rejected":
        update_data["status"] = "rejected"
        event["note"] = event["note"] or "Negotiation rejected"
        await db.influencers.update_one({"id": neg["influencer_id"]}, {"$set": {"status": "identified"}})
    
    result = await db.negotiations.find_one_and_update(
        {"id": neg_id},
        {
            "$set": update_data,
            "$push": {"timeline": event}
        },
        return_document=True
    )
    
    del result['_id']
    return result

@api_router.get("/negotiations/stats/summary")
async def get_negotiation_stats(user: dict = Depends(get_current_user)):
    """Get negotiation statistics"""
    all_negs = await db.negotiations.find({}, {"_id": 0}).to_list(500)
    
    total = len(all_negs)
    by_status = {}
    total_initial = 0
    total_final = 0
    successful = 0
    
    for neg in all_negs:
        status = neg.get("status", "pending")
        by_status[status] = by_status.get(status, 0) + 1
        total_initial += neg.get("initial_quote", 0)
        
        if neg.get("final_price"):
            total_final += neg["final_price"]
            successful += 1
    
    avg_discount = 0
    if successful > 0 and total_initial > 0:
        avg_agreed = total_final / successful
        avg_initial = total_initial / total
        avg_discount = ((avg_initial - avg_agreed) / avg_initial) * 100 if avg_initial > 0 else 0
    
    return {
        "total": total,
        "by_status": by_status,
        "success_rate": (successful / total * 100) if total > 0 else 0,
        "avg_discount_percent": round(avg_discount, 1),
        "total_value_negotiated": total_initial,
        "total_value_agreed": total_final
    }

# ============== ANALYTICS ROUTES ==============
@analytics_router.get("/dashboard")
async def get_dashboard_analytics(user: dict = Depends(get_current_user)):
    # Get counts
    total_influencers = await db.influencers.count_documents({})
    active_campaigns = await db.campaigns.count_documents({"status": "active"})
    
    # Get budget stats
    campaigns = await db.campaigns.find({}, {"_id": 0, "budget": 1, "spent": 1}).to_list(100)
    total_budget = sum(c.get('budget', 0) for c in campaigns)
    total_spent = sum(c.get('spent', 0) for c in campaigns)
    
    # Get influencer status distribution
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_dist = await db.influencers.aggregate(pipeline).to_list(10)
    
    # Get category distribution
    cat_pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    cat_dist = await db.influencers.aggregate(cat_pipeline).to_list(20)
    
    # Get recent outreach
    recent_outreach = await db.outreach.find({}, {"_id": 0}).sort("sent_at", -1).limit(5).to_list(5)
    
    # Get top influencers by score
    top_influencers = await db.influencers.find({}, {"_id": 0}).sort("score", -1).limit(5).to_list(5)
    
    return {
        "total_influencers": total_influencers,
        "active_campaigns": active_campaigns,
        "total_budget": total_budget,
        "total_spent": total_spent,
        "budget_remaining": total_budget - total_spent,
        "status_distribution": {s['_id']: s['count'] for s in status_dist if s['_id']},
        "category_distribution": {c['_id']: c['count'] for c in cat_dist if c['_id']},
        "recent_outreach": recent_outreach,
        "top_influencers": top_influencers
    }

@analytics_router.get("/campaign/{campaign_id}")
async def get_campaign_analytics(campaign_id: str, user: dict = Depends(get_current_user)):
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    influencer_count = len(campaign.get('influencers', []))
    content_published = sum(1 for i in campaign.get('influencers', []) if i.get('content_status') == 'published')
    
    return {
        "campaign": campaign,
        "influencer_count": influencer_count,
        "content_published": content_published,
        "budget_utilization": round((campaign.get('spent', 0) / campaign.get('budget', 1)) * 100, 1),
        "completion_rate": round((content_published / max(influencer_count, 1)) * 100, 1)
    }

# ============== AI ROUTES ==============
@ai_router.post("/match-influencers")
async def ai_match_influencers(data: AIMatchRequest, user: dict = Depends(get_current_user)):
    """Use AI to find and rank best matching influencers"""
    query = {
        "followers": {"$gte": data.min_followers},
        "engagement_rate": {"$gte": data.min_engagement}
    }
    if data.category:
        query["category"] = {"$regex": data.category, "$options": "i"}
    if data.city:
        query["city"] = {"$regex": data.city, "$options": "i"}
    
    influencers = await db.influencers.find(query, {"_id": 0}).sort("score", -1).limit(20).to_list(20)
    
    # Use AI to provide recommendations
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"match-{uuid.uuid4()}",
            system_message="You are a fashion influencer marketing expert. Analyze influencer profiles and provide concise recommendations."
        ).with_model("openai", "gpt-5.2")
        
        influencer_summary = "\n".join([
            f"- {i['name']}: {i['followers']} followers, {i['engagement_rate']}% engagement, {i['category']}, {i['city']}"
            for i in influencers[:10]
        ])
        
        message = UserMessage(
            text=f"Based on these influencers for a {data.category} campaign:\n{influencer_summary}\n\nProvide a brief 2-3 sentence recommendation on which 3 would be best for a luxury fashion brand campaign."
        )
        
        recommendation = await chat.send_message(message)
        
        return {
            "influencers": influencers,
            "ai_recommendation": recommendation
        }
    except Exception as e:
        logger.error(f"AI matching error: {e}")
        return {
            "influencers": influencers,
            "ai_recommendation": "AI recommendations unavailable. Showing top matches by score."
        }

@ai_router.post("/generate-caption")
async def ai_generate_caption(data: AICaptionRequest, user: dict = Depends(get_current_user)):
    """Generate caption for influencer posts"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"caption-{uuid.uuid4()}",
            system_message="You are a luxury fashion copywriter. Create engaging, sophisticated social media captions."
        ).with_model("openai", "gpt-5.2")
        
        message = UserMessage(
            text=f"Write a {data.tone} Instagram caption for {data.brand}'s {data.product}. {'Include relevant hashtags.' if data.hashtags else 'No hashtags.'} Keep it under 200 characters."
        )
        
        caption = await chat.send_message(message)
        return {"caption": caption}
    except Exception as e:
        logger.error(f"Caption generation error: {e}")
        return {"caption": f"Elevate your style with {data.brand}. #Fashion #Luxury #Style"}

@ai_router.post("/campaign-ideas")
async def ai_campaign_ideas(data: AICampaignIdeaRequest, user: dict = Depends(get_current_user)):
    """Generate campaign ideas"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ideas-{uuid.uuid4()}",
            system_message="You are a fashion marketing strategist. Generate creative campaign ideas."
        ).with_model("openai", "gpt-5.2")
        
        message = UserMessage(
            text=f"Generate 3 creative influencer campaign ideas for a {data.season} {data.category} fashion campaign with a budget of ₹{data.budget:,.0f}. Include campaign name, concept, and suggested deliverables. Be concise."
        )
        
        ideas = await chat.send_message(message)
        return {"ideas": ideas}
    except Exception as e:
        logger.error(f"Campaign ideas error: {e}")
        return {"ideas": "1. Seasonal Style Showcase\n2. Street Fashion Spotlight\n3. Luxury Lifestyle Series"}

@ai_router.post("/auto-discover")
async def ai_auto_discover_influencers(data: AIAutoDiscoveryRequest, user: dict = Depends(get_current_user)):
    """AI-powered automatic influencer discovery based on campaign brief"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        
        # First, use AI to analyze the campaign brief and generate search criteria
        analysis_chat = LlmChat(
            api_key=api_key,
            session_id=f"discover-analysis-{uuid.uuid4()}",
            system_message="""You are an expert influencer marketing strategist for luxury fashion brands. 
            Analyze campaign briefs and identify the ideal influencer profiles. 
            Always respond in valid JSON format."""
        ).with_model("openai", "gpt-5.2")
        
        analysis_prompt = f"""Generate {data.num_suggestions} Indian fashion influencer profiles for this campaign:

Brief: {data.campaign_brief}
Category: {data.category or 'Fashion'}
Location: {data.location}
Follower Range: {data.follower_range}

Return ONLY valid JSON (no markdown) with this exact structure:
{{
    "search_strategy": "one sentence strategy",
    "ideal_profile": "one sentence profile description",
    "influencers": [
        {{
            "name": "Full Name",
            "instagram_handle": "handle",
            "bio": "Short bio",
            "city": "Mumbai",
            "category": "luxury",
            "tier": "micro",
            "followers": 50000,
            "engagement_rate": 4.5,
            "style_tags": ["minimal", "luxury"],
            "content_type": ["Reels"],
            "estimated_rate_per_reel": 25000,
            "why_recommended": "Reason",
            "audience_match_score": 85
        }}
    ]
}}"""
        
        analysis_message = UserMessage(text=analysis_prompt)
        ai_response = await analysis_chat.send_message(analysis_message)
        
        # Parse AI response
        try:
            # Clean up response - extract JSON from markdown if needed
            response_text = ai_response
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            parsed = json.loads(response_text.strip())
            
            # Handle various response formats
            if isinstance(parsed, list):
                # AI returned a list of influencers directly
                discovered = {
                    "search_strategy": "AI-powered influencer discovery based on campaign brief",
                    "ideal_profile": "Influencers matching your campaign requirements",
                    "influencers": parsed
                }
            elif "influencers" in parsed and isinstance(parsed["influencers"], list):
                # Standard format with influencers array
                discovered = parsed
            else:
                # Try to extract influencers from nested structure
                discovered = {
                    "search_strategy": parsed.get("search_strategy", "AI-powered discovery"),
                    "ideal_profile": parsed.get("ideal_profile", ""),
                    "influencers": []
                }
                # Check for nested influencers
                for key, value in parsed.items():
                    if isinstance(value, list):
                        for item in value:
                            if isinstance(item, dict) and "influencers" in item:
                                discovered["influencers"].extend(item["influencers"])
                                if item.get("search_strategy"):
                                    discovered["search_strategy"] = item["search_strategy"]
                                if item.get("ideal_profile"):
                                    discovered["ideal_profile"] = item["ideal_profile"]
                            elif isinstance(item, dict) and "name" in item:
                                discovered["influencers"].append(item)
                                
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            # Fallback structure
            discovered = {
                "search_strategy": "AI-powered search based on campaign requirements",
                "ideal_profile": "Fashion-forward influencers with engaged audiences",
                "influencers": []
            }
        
        # Also search existing database for matches
        db_query = {}
        if data.category:
            db_query["category"] = {"$regex": data.category, "$options": "i"}
        if data.location and data.location != "India":
            db_query["city"] = {"$regex": data.location, "$options": "i"}
        
        existing_matches = await db.influencers.find(db_query, {"_id": 0}).sort("score", -1).limit(5).to_list(5)
        
        # Generate AI insights for each discovered influencer
        insights_chat = LlmChat(
            api_key=api_key,
            session_id=f"discover-insights-{uuid.uuid4()}",
            system_message="You are an influencer marketing expert. Provide brief, actionable insights."
        ).with_model("openai", "gpt-5.2")
        
        campaign_insights_prompt = f"""Based on the campaign brief: "{data.campaign_brief}"
        
Provide 3 key recommendations for outreach strategy and 2 potential risks to watch for. Keep it concise (2-3 sentences each)."""
        
        insights_message = UserMessage(text=campaign_insights_prompt)
        campaign_insights = await insights_chat.send_message(insights_message)
        
        return {
            "success": True,
            "search_strategy": discovered.get("search_strategy", ""),
            "ideal_profile": discovered.get("ideal_profile", ""),
            "discovered_influencers": discovered.get("influencers", []),
            "existing_matches": existing_matches,
            "campaign_insights": campaign_insights,
            "total_discovered": len(discovered.get("influencers", [])),
            "total_existing_matches": len(existing_matches)
        }
        
    except Exception as e:
        logger.error(f"AI auto-discovery error: {e}")
        return {
            "success": False,
            "error": str(e),
            "discovered_influencers": [],
            "existing_matches": [],
            "campaign_insights": "Unable to generate insights. Please try again."
        }

@ai_router.post("/import-discovered")
async def import_discovered_influencer(
    influencer_data: dict,
    user: dict = Depends(get_current_user)
):
    """Import an AI-discovered influencer into the database"""
    try:
        influencer_id = str(uuid.uuid4())
        
        influencer_doc = {
            "id": influencer_id,
            "name": influencer_data.get("name", "Unknown"),
            "instagram_handle": influencer_data.get("instagram_handle", ""),
            "bio": influencer_data.get("bio", ""),
            "city": influencer_data.get("city", "Mumbai"),
            "category": influencer_data.get("category", "luxury"),
            "tier": influencer_data.get("tier", "micro"),
            "followers": influencer_data.get("followers", 0),
            "engagement_rate": influencer_data.get("engagement_rate", 0),
            "style_tags": influencer_data.get("style_tags", []),
            "content_type": influencer_data.get("content_type", []),
            "rate_per_reel": influencer_data.get("estimated_rate_per_reel"),
            "audience_location": "India",
            "status": "identified",
            "score": 0.0,
            "notes": f"AI Discovered. Match Score: {influencer_data.get('audience_match_score', 0)}%. Reason: {influencer_data.get('why_recommended', '')}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source": "ai_discovery",
            "last_contacted": None
        }
        
        # Calculate score
        influencer_doc['score'] = calculate_influencer_score(influencer_doc)
        
        await db.influencers.insert_one(influencer_doc)
        if '_id' in influencer_doc:
            del influencer_doc['_id']
        
        return {
            "success": True,
            "message": "Influencer imported successfully",
            "influencer": influencer_doc
        }
    except Exception as e:
        logger.error(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== CONTENT LIBRARY ==============
@api_router.get("/content-library")
async def get_content_library(
    campaign_id: Optional[str] = None,
    influencer_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if campaign_id:
        query["campaign_id"] = campaign_id
    if influencer_id:
        query["influencer_id"] = influencer_id
    
    content = await db.content_library.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return content

@api_router.post("/content-library")
async def add_content(
    campaign_id: str,
    influencer_id: str,
    content_type: str,
    content_url: str,
    description: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    content_id = str(uuid.uuid4())
    content_doc = {
        "id": content_id,
        "campaign_id": campaign_id,
        "influencer_id": influencer_id,
        "content_type": content_type,
        "content_url": content_url,
        "description": description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.content_library.insert_one(content_doc)
    if '_id' in content_doc:
        del content_doc['_id']
    return content_doc

# ============== BUDGET & PAYMENTS ==============
@api_router.get("/payments")
async def get_payments(campaign_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if campaign_id:
        query["campaign_id"] = campaign_id
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return payments

@api_router.post("/payments")
async def record_payment(
    campaign_id: str,
    influencer_id: str,
    amount: float,
    payment_status: str = "pending",
    user: dict = Depends(get_current_user)
):
    influencer = await db.influencers.find_one({"id": influencer_id}, {"_id": 0})
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "campaign_id": campaign_id,
        "influencer_id": influencer_id,
        "influencer_name": influencer['name'] if influencer else "Unknown",
        "amount": amount,
        "status": payment_status,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_doc)
    if '_id' in payment_doc:
        del payment_doc['_id']
    return payment_doc

@api_router.put("/payments/{payment_id}/status")
async def update_payment_status(payment_id: str, status: str, user: dict = Depends(get_current_user)):
    valid_statuses = ["pending", "processing", "completed", "failed"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")
    
    result = await db.payments.update_one({"id": payment_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Payment status updated"}

# ============== SOCIAL API VERIFICATION ROUTES ==============
class SocialVerifyRequest(BaseModel):
    platform: str  # instagram, youtube
    handle: str

class SocialConfigRequest(BaseModel):
    instagram_token: Optional[str] = None
    instagram_account_id: Optional[str] = None
    youtube_api_key: Optional[str] = None

@social_router.post("/configure")
async def configure_social_apis(config: SocialConfigRequest, user: dict = Depends(get_current_user)):
    """Configure social media API credentials"""
    from services.social_api import social_api_service
    
    configured = []
    
    if config.instagram_token and config.instagram_account_id:
        social_api_service.configure_instagram(config.instagram_token, config.instagram_account_id)
        configured.append("instagram")
    
    if config.youtube_api_key:
        social_api_service.configure_youtube(config.youtube_api_key)
        configured.append("youtube")
    
    return {"message": "APIs configured", "configured_platforms": configured}

@social_router.post("/verify")
async def verify_social_profile(request: SocialVerifyRequest, user: dict = Depends(get_current_user)):
    """Verify a social media profile and get metrics"""
    from services.social_api import social_api_service
    
    result = None
    
    if request.platform == "instagram":
        result = await social_api_service.verify_instagram(request.handle)
    elif request.platform == "youtube":
        result = await social_api_service.verify_youtube(request.handle)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {request.platform}")
    
    if not result:
        raise HTTPException(status_code=404, detail=f"Profile not found or API not configured for {request.platform}")
    
    return result.dict()

@social_router.post("/verify-influencer/{influencer_id}")
async def verify_influencer_profiles(
    influencer_id: str, 
    user: dict = Depends(get_current_user)
):
    """Verify and update an influencer's social profiles"""
    from services.social_api import social_api_service
    
    influencer = await db.influencers.find_one({"id": influencer_id}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    handles = {}
    if influencer.get("instagram_handle"):
        handles["instagram"] = influencer["instagram_handle"]
    if influencer.get("youtube_handle"):
        handles["youtube"] = influencer["youtube_handle"]
    
    if not handles:
        return {"message": "No social handles to verify", "verified": {}}
    
    results = await social_api_service.verify_all_platforms(handles)
    
    # Update influencer with verified data
    update_data = {"last_verified": datetime.now(timezone.utc).isoformat()}
    
    for platform, profile in results.items():
        if profile:
            if platform == "instagram":
                update_data["followers"] = profile.followers
                update_data["engagement_rate"] = profile.engagement_rate
                update_data["instagram_verified"] = profile.is_verified
            elif platform == "youtube":
                update_data["youtube_subscribers"] = profile.followers
                update_data["youtube_engagement"] = profile.engagement_rate
    
    await db.influencers.update_one({"id": influencer_id}, {"$set": update_data})
    
    # Recalculate score
    updated = await db.influencers.find_one({"id": influencer_id})
    new_score = calculate_influencer_score(updated)
    await db.influencers.update_one({"id": influencer_id}, {"$set": {"score": new_score}})
    
    return {
        "message": "Profiles verified",
        "verified": {k: v.dict() if v else None for k, v in results.items()},
        "updated_score": new_score
    }

# ============== SCHEDULED DISCOVERY ROUTES ==============
class ScheduledSearchCreate(BaseModel):
    name: str
    campaign_brief: str
    category: str
    location: str = "India"
    follower_range: str = "10K-500K"
    frequency: str = "daily"  # daily, weekly
    num_suggestions: int = 10

class ScheduledSearchUpdate(BaseModel):
    name: Optional[str] = None
    campaign_brief: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    follower_range: Optional[str] = None
    frequency: Optional[str] = None
    num_suggestions: Optional[int] = None
    is_active: Optional[bool] = None

@scheduled_router.get("/searches")
async def get_scheduled_searches(user: dict = Depends(get_current_user)):
    """Get all scheduled searches"""
    from services.scheduled_discovery import create_scheduled_discovery_service
    service = create_scheduled_discovery_service(db)
    return await service.get_scheduled_searches(user['id'])

@scheduled_router.post("/searches")
async def create_scheduled_search(data: ScheduledSearchCreate, user: dict = Depends(get_current_user)):
    """Create a new scheduled search"""
    from services.scheduled_discovery import create_scheduled_discovery_service
    service = create_scheduled_discovery_service(db)
    return await service.create_scheduled_search(
        name=data.name,
        campaign_brief=data.campaign_brief,
        category=data.category,
        location=data.location,
        follower_range=data.follower_range,
        frequency=data.frequency,
        num_suggestions=data.num_suggestions,
        user_id=user['id']
    )

@scheduled_router.get("/searches/{search_id}")
async def get_scheduled_search(search_id: str, user: dict = Depends(get_current_user)):
    """Get a specific scheduled search"""
    from services.scheduled_discovery import create_scheduled_discovery_service
    service = create_scheduled_discovery_service(db)
    search = await service.get_scheduled_search(search_id)
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    return search

@scheduled_router.put("/searches/{search_id}")
async def update_scheduled_search(search_id: str, data: ScheduledSearchUpdate, user: dict = Depends(get_current_user)):
    """Update a scheduled search"""
    from services.scheduled_discovery import create_scheduled_discovery_service
    service = create_scheduled_discovery_service(db)
    update_dict = {k: v for k, v in data.dict().items() if v is not None}
    result = await service.update_scheduled_search(search_id, update_dict)
    if not result:
        raise HTTPException(status_code=404, detail="Search not found")
    return result

@scheduled_router.delete("/searches/{search_id}")
async def delete_scheduled_search(search_id: str, user: dict = Depends(get_current_user)):
    """Delete a scheduled search"""
    from services.scheduled_discovery import create_scheduled_discovery_service
    service = create_scheduled_discovery_service(db)
    success = await service.delete_scheduled_search(search_id)
    if not success:
        raise HTTPException(status_code=404, detail="Search not found")
    return {"message": "Search deleted"}

@scheduled_router.post("/searches/{search_id}/run")
async def run_scheduled_search_now(search_id: str, user: dict = Depends(get_current_user)):
    """Manually trigger a scheduled search to run now"""
    from services.scheduled_discovery import create_scheduled_discovery_service
    service = create_scheduled_discovery_service(db)
    result = await service.run_discovery_now(search_id)
    return result

@scheduled_router.get("/results")
async def get_discovery_results(
    search_id: Optional[str] = None,
    limit: int = Query(default=10, le=50),
    user: dict = Depends(get_current_user)
):
    """Get discovery results from scheduled searches"""
    from services.scheduled_discovery import create_scheduled_discovery_service
    service = create_scheduled_discovery_service(db)
    return await service.get_discovery_results(search_id, limit)

# ============== INFLUENCER COMPARISON ROUTES ==============
class CompareRequest(BaseModel):
    influencer_ids: List[str]  # 2-5 influencers to compare

@api_router.post("/influencers/compare")
async def compare_influencers(request: CompareRequest, user: dict = Depends(get_current_user)):
    """Compare multiple influencers side by side"""
    if len(request.influencer_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 influencers required for comparison")
    if len(request.influencer_ids) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 influencers can be compared")
    
    influencers = []
    for inf_id in request.influencer_ids:
        inf = await db.influencers.find_one({"id": inf_id}, {"_id": 0})
        if inf:
            influencers.append(inf)
    
    if len(influencers) < 2:
        raise HTTPException(status_code=404, detail="Not enough valid influencers found")
    
    # Calculate comparison metrics
    comparison = {
        "influencers": influencers,
        "metrics": {
            "followers": {
                "values": [i.get("followers", 0) for i in influencers],
                "max": max(i.get("followers", 0) for i in influencers),
                "min": min(i.get("followers", 0) for i in influencers),
                "avg": sum(i.get("followers", 0) for i in influencers) / len(influencers)
            },
            "engagement_rate": {
                "values": [i.get("engagement_rate", 0) for i in influencers],
                "max": max(i.get("engagement_rate", 0) for i in influencers),
                "min": min(i.get("engagement_rate", 0) for i in influencers),
                "avg": sum(i.get("engagement_rate", 0) for i in influencers) / len(influencers)
            },
            "score": {
                "values": [i.get("score", 0) for i in influencers],
                "max": max(i.get("score", 0) for i in influencers),
                "min": min(i.get("score", 0) for i in influencers),
                "avg": sum(i.get("score", 0) for i in influencers) / len(influencers)
            },
            "rate_per_reel": {
                "values": [i.get("rate_per_reel", 0) or 0 for i in influencers],
                "max": max((i.get("rate_per_reel", 0) or 0) for i in influencers),
                "min": min((i.get("rate_per_reel", 0) or 0) for i in influencers),
                "avg": sum((i.get("rate_per_reel", 0) or 0) for i in influencers) / len(influencers)
            }
        },
        "recommendation": None
    }
    
    # AI recommendation for comparison
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"compare-{uuid.uuid4()}",
            system_message="You are a fashion influencer marketing expert. Compare influencers and recommend the best choice."
        ).with_model("openai", "gpt-5.2")
        
        inf_summary = "\n".join([
            f"- {i['name']}: {i.get('followers', 0):,} followers, {i.get('engagement_rate', 0)}% engagement, Score: {i.get('score', 0)}, Rate: Rs.{i.get('rate_per_reel', 'N/A')}"
            for i in influencers
        ])
        
        message = UserMessage(
            text=f"Compare these influencers for a luxury fashion campaign:\n{inf_summary}\n\nProvide a 2-3 sentence recommendation on which to choose and why."
        )
        
        comparison["recommendation"] = await chat.send_message(message)
    except Exception as e:
        logger.error(f"Comparison AI error: {e}")
        comparison["recommendation"] = "AI recommendation unavailable. Review metrics to make your choice."
    
    return comparison

# ============== AI DISCOVERY WITH SSE PROGRESS ==============
@ai_router.get("/auto-discover-stream")
async def ai_auto_discover_stream(
    campaign_brief: str,
    category: str = "luxury",
    location: str = "India",
    follower_range: str = "10K-500K",
    num_suggestions: int = 8,
    user: dict = Depends(get_current_user)
):
    """AI-powered auto-discovery with Server-Sent Events for progress updates"""
    
    async def generate_events():
        try:
            yield f"data: {json.dumps({'type': 'progress', 'message': 'Starting AI discovery...', 'progress': 10})}\n\n"
            await asyncio.sleep(0.5)
            
            yield f"data: {json.dumps({'type': 'progress', 'message': 'Analyzing campaign brief...', 'progress': 25})}\n\n"
            
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            
            yield f"data: {json.dumps({'type': 'progress', 'message': 'Generating influencer profiles...', 'progress': 40})}\n\n"
            
            chat = LlmChat(
                api_key=api_key,
                session_id=f"discover-stream-{uuid.uuid4()}",
                system_message="""You are an expert influencer marketing strategist for luxury fashion brands. 
                Generate realistic Indian fashion influencer profiles. 
                Always respond in valid JSON format."""
            ).with_model("openai", "gpt-5.2")
            
            prompt = f"""Generate {num_suggestions} Indian fashion influencer profiles for:

Brief: {campaign_brief}
Category: {category}
Location: {location}
Follower Range: {follower_range}

Return ONLY valid JSON (no markdown):
{{
    "search_strategy": "one sentence strategy",
    "influencers": [
        {{
            "name": "Full Name",
            "instagram_handle": "handle",
            "bio": "Short bio",
            "city": "City",
            "category": "{category}",
            "tier": "micro",
            "followers": 50000,
            "engagement_rate": 4.5,
            "style_tags": ["minimal", "luxury"],
            "why_recommended": "Reason",
            "audience_match_score": 85
        }}
    ]
}}"""
            
            message = UserMessage(text=prompt)
            
            yield f"data: {json.dumps({'type': 'progress', 'message': 'AI is thinking...', 'progress': 60})}\n\n"
            
            response = await chat.send_message(message)
            
            yield f"data: {json.dumps({'type': 'progress', 'message': 'Processing results...', 'progress': 80})}\n\n"
            
            # Parse response
            response_text = response
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            parsed = json.loads(response_text.strip())
            influencers = parsed.get("influencers", [])
            
            yield f"data: {json.dumps({'type': 'progress', 'message': f'Found {len(influencers)} influencers!', 'progress': 100})}\n\n"
            
            # Send final result
            result = {
                "type": "complete",
                "success": True,
                "search_strategy": parsed.get("search_strategy", "AI-powered discovery"),
                "discovered_influencers": influencers,
                "total_discovered": len(influencers)
            }
            
            yield f"data: {json.dumps(result)}\n\n"
            
        except Exception as e:
            logger.error(f"SSE Discovery error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# ============== INCLUDE ROUTERS ==============
api_router.include_router(auth_router)
api_router.include_router(influencer_router)
api_router.include_router(campaign_router)
api_router.include_router(outreach_router)
api_router.include_router(analytics_router)
api_router.include_router(ai_router)
api_router.include_router(social_router)
api_router.include_router(scheduled_router)

@api_router.get("/")
async def root():
    return {"message": "SEVORA Influencer Operations API", "version": "1.0.0"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
