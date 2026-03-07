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
import httpx
import json
from enum import Enum
import qrcode
import io
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'sevora-team-secret-2024')
JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 1440))

# Azure AD Settings
AZURE_CLIENT_ID = os.environ.get('AZURE_CLIENT_ID')
AZURE_TENANT_ID = os.environ.get('AZURE_TENANT_ID')
AZURE_CLIENT_SECRET = os.environ.get('AZURE_CLIENT_SECRET')
AZURE_AUTHORITY = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}"

# Create the main app
app = FastAPI(title="SEVORA Team API - Unified Platform")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

# Department-specific routers
marketing_router = APIRouter(prefix="/marketing", tags=["Marketing Ops"])
sales_router = APIRouter(prefix="/sales", tags=["Sales"])
social_router = APIRouter(prefix="/social", tags=["Social Media"])

security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== ENUMS ==============
class Department(str, Enum):
    MARKETING = "marketing"
    SALES = "sales"
    SOCIAL = "social"
    ADMIN = "admin"

class UserRole(str, Enum):
    ADMIN = "admin"
    MARKETING_MANAGER = "marketing_manager"
    SALES_MANAGER = "sales_manager"
    SOCIAL_MANAGER = "social_manager"
    STYLIST = "stylist"
    VIEWER = "viewer"

# Department to modules mapping
DEPARTMENT_MODULES = {
    "marketing": ["influencers", "campaigns", "negotiations", "outreach", "ai_discovery"],
    "sales": ["leads", "customers", "wedding_planner", "pipeline", "qr_codes", "partners"],
    "social": ["content_studio", "ai_tools", "autopilot", "posts", "analytics", "avatar", "youtube"],
    "admin": ["all"]
}

# Role to department mapping
ROLE_DEPARTMENTS = {
    "admin": ["marketing", "sales", "social"],
    "marketing_manager": ["marketing"],
    "sales_manager": ["sales"],
    "social_manager": ["social"],
    "stylist": ["sales"],
    "viewer": []
}

# ============== MODELS ==============
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    department: Department = Department.SALES
    role: UserRole = UserRole.VIEWER

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    department: str
    role: str
    departments: List[str] = []
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class AzureTokenRequest(BaseModel):
    azure_token: str

# Marketing Models
class InfluencerCreate(BaseModel):
    name: str
    bio: Optional[str] = None
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    primary_platform: str = "instagram"
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    city: str
    country: str = "India"
    industry: str = "fashion"
    content_type: List[str] = []
    tier: str = "micro"
    followers: int = 0
    engagement_rate: float = 0.0
    rate_per_post: Optional[float] = None
    rate_per_reel: Optional[float] = None
    style_tags: List[str] = []
    languages: List[str] = ["English", "Hindi"]
    notes: Optional[str] = None

class InfluencerResponse(BaseModel):
    id: str
    name: str
    bio: Optional[str] = None
    instagram_handle: Optional[str] = None
    youtube_handle: Optional[str] = None
    primary_platform: Optional[str] = "instagram"
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    content_type: Optional[List[str]] = []
    tier: Optional[str] = None
    followers: Optional[int] = 0
    engagement_rate: Optional[float] = 0.0
    rate_per_post: Optional[float] = None
    rate_per_reel: Optional[float] = None
    style_tags: Optional[List[str]] = []
    languages: Optional[List[str]] = []
    notes: Optional[str] = None
    status: Optional[str] = None
    score: Optional[float] = 0.0
    created_at: Optional[str] = None

class CampaignCreate(BaseModel):
    name: str
    objective: str
    budget: float
    start_date: str
    end_date: str
    target_market: str
    description: Optional[str] = None

class CampaignResponse(BaseModel):
    id: str
    name: str
    objective: str
    budget: float
    spent: float = 0.0
    start_date: str
    end_date: str
    target_market: str
    description: Optional[str] = None
    status: str
    influencers: List[dict] = []
    created_at: str

class OutreachCreate(BaseModel):
    influencer_id: str
    channel: str
    subject: Optional[str] = None
    message: str

class OutreachResponse(BaseModel):
    id: str
    influencer_id: str
    influencer_name: Optional[str] = None
    channel: Optional[str] = None
    subject: Optional[str] = None
    message: str
    status: str
    sent_at: str
    opened: bool = False
    replied: bool = False

class NegotiationCreate(BaseModel):
    influencer_id: str
    campaign_id: Optional[str] = None
    initial_quote: float
    our_budget: Optional[float] = None
    deliverables: str
    deadline: Optional[str] = None
    notes: Optional[str] = None

# Sales Models
class LeadSource(str, Enum):
    INSTAGRAM_ADS = "Instagram Ads"
    FACEBOOK_ADS = "Facebook Ads"
    INFLUENCER = "Influencer"
    EVENT = "Event"
    QR_CODE = "QR Code"
    WEBSITE = "Website"
    REFERRAL = "Referral"

class PipelineStage(str, Enum):
    NEW_LEAD = "New Lead"
    CONTACTED = "Contacted"
    STYLING_SCHEDULED = "Styling Session Scheduled"
    STYLING_COMPLETED = "Styling Completed"
    TRIAL_SELECTION = "Trial / Selection"
    ORDER_CONFIRMED = "Order Confirmed"
    CLOSED_LOST = "Closed Lost"

class LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    source: LeadSource
    source_details: Optional[str] = None
    occasion: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None

class LeadResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    source: str
    source_details: Optional[str] = None
    stage: str
    occasion: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_at: str
    updated_at: str

class CustomerCreate(BaseModel):
    lead_id: Optional[str] = None
    name: str
    phone: str
    email: Optional[EmailStr] = None
    city: Optional[str] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    preferred_styles: List[str] = []
    occasion_type: Optional[str] = None
    notes: Optional[str] = None

class CustomerResponse(BaseModel):
    id: str
    lead_id: Optional[str] = None
    name: str
    phone: str
    email: Optional[str] = None
    city: Optional[str] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    preferred_styles: List[str] = []
    occasion_type: Optional[str] = None
    notes: Optional[str] = None
    total_orders: int = 0
    total_spent: float = 0
    created_at: str

class QRCodeCreate(BaseModel):
    name: str
    source_type: LeadSource
    campaign: Optional[str] = None
    location: Optional[str] = None

class QRCodeResponse(BaseModel):
    id: str
    name: str
    source_type: str
    campaign: Optional[str] = None
    location: Optional[str] = None
    url: str
    qr_image: str
    scan_count: int = 0
    leads_count: int = 0
    created_at: str

# Social Models
class ContentCreate(BaseModel):
    title: str
    content_type: str
    platform: str
    caption: Optional[str] = None
    hashtags: List[str] = []
    media_url: Optional[str] = None
    scheduled_at: Optional[str] = None
    status: str = "draft"

class ContentResponse(BaseModel):
    id: str
    title: str
    content_type: str
    platform: str
    caption: Optional[str] = None
    hashtags: List[str] = []
    media_url: Optional[str] = None
    scheduled_at: Optional[str] = None
    status: str
    created_at: str

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

def get_user_departments(role: str) -> List[str]:
    return ROLE_DEPARTMENTS.get(role, [])

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user['departments'] = get_user_departments(user.get('role', 'viewer'))
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_department(allowed_departments: List[str]):
    async def department_checker(user: dict = Depends(get_current_user)):
        user_depts = get_user_departments(user.get('role', 'viewer'))
        if 'admin' in user_depts or any(dept in user_depts for dept in allowed_departments):
            return user
        raise HTTPException(status_code=403, detail="Access denied to this department")
    return department_checker

def calculate_influencer_score(influencer: dict) -> float:
    score = 0.0
    engagement = influencer.get('engagement_rate', 0)
    score += min(engagement * 5, 25)
    followers = influencer.get('followers', 0)
    if followers >= 500000:
        score += 20
    elif followers >= 100000:
        score += 15
    elif followers >= 50000:
        score += 10
    elif followers >= 10000:
        score += 5
    fashion_industries = ['fashion', 'luxury', 'beauty', 'lifestyle']
    if influencer.get('industry', '').lower() in fashion_industries:
        score += 20
    score += 12
    if influencer.get('audience_demographics'):
        score += 10
    score += 8
    return round(min(score, 100), 1)

# ============== AZURE AD AUTH ==============
async def verify_azure_token(azure_token: str) -> dict:
    """Verify Azure AD token and get user info"""
    try:
        # Get user info from Microsoft Graph
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {azure_token}"}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid Azure token")
            return response.json()
    except Exception as e:
        logger.error(f"Azure token verification error: {e}")
        raise HTTPException(status_code=401, detail="Azure authentication failed")

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
        "department": user.department.value,
        "role": user.role.value,
        "avatar_url": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"sub": user_id, "email": user.email, "role": user.role.value})
    departments = get_user_departments(user.role.value)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id, 
            email=user.email, 
            name=user.name, 
            department=user.department.value,
            role=user.role.value,
            departments=departments,
            created_at=user_doc['created_at']
        )
    )

@auth_router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user['id'], "email": user['email'], "role": user.get('role', 'viewer')})
    departments = get_user_departments(user.get('role', 'viewer'))
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user['id'], 
            email=user['email'], 
            name=user['name'], 
            department=user.get('department', 'sales'),
            role=user.get('role', 'viewer'),
            departments=departments,
            avatar_url=user.get('avatar_url'),
            created_at=user.get('created_at')
        )
    )

@auth_router.post("/azure", response_model=TokenResponse)
async def azure_login(request: AzureTokenRequest):
    """Login with Azure AD token"""
    azure_user = await verify_azure_token(request.azure_token)
    
    email = azure_user.get('mail') or azure_user.get('userPrincipalName')
    name = azure_user.get('displayName', email.split('@')[0])
    azure_id = azure_user.get('id')
    
    # Check if user exists
    user = await db.users.find_one({"$or": [{"azure_id": azure_id}, {"email": email}]}, {"_id": 0})
    
    if not user:
        # Create new user
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "azure_id": azure_id,
            "email": email,
            "name": name,
            "department": "sales",
            "role": "viewer",
            "avatar_url": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    else:
        # Update Azure ID if not set
        if not user.get('azure_id'):
            await db.users.update_one({"id": user['id']}, {"$set": {"azure_id": azure_id}})
    
    token = create_access_token({"sub": user['id'], "email": email, "role": user.get('role', 'viewer')})
    departments = get_user_departments(user.get('role', 'viewer'))
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user['id'],
            email=email,
            name=name,
            department=user.get('department', 'sales'),
            role=user.get('role', 'viewer'),
            departments=departments,
            avatar_url=user.get('avatar_url'),
            created_at=user.get('created_at')
        )
    )

@auth_router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)

@auth_router.put("/me/department")
async def update_user_department(department: str, role: str, user: dict = Depends(get_current_user)):
    """Admin only: Update user's department and role"""
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can update departments")
    
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {"department": department, "role": role}}
    )
    return {"message": "Department updated"}

@auth_router.get("/config")
async def get_auth_config():
    """Return Azure AD configuration for frontend"""
    return {
        "clientId": AZURE_CLIENT_ID,
        "tenantId": AZURE_TENANT_ID,
        "authority": AZURE_AUTHORITY,
        "redirectUri": os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    }

# ============== MARKETING ROUTES ==============
@marketing_router.get("/influencers", response_model=List[InfluencerResponse])
async def get_influencers(
    industry: Optional[str] = None,
    city: Optional[str] = None,
    min_followers: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(require_department(["marketing"]))
):
    query = {}
    if industry:
        query["industry"] = {"$regex": industry, "$options": "i"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if min_followers:
        query["followers"] = {"$gte": min_followers}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"instagram_handle": {"$regex": search, "$options": "i"}}
        ]
    
    influencers = await db.influencers.find(query, {"_id": 0}).sort("score", -1).to_list(500)
    return influencers

@marketing_router.get("/influencers/{influencer_id}", response_model=InfluencerResponse)
async def get_influencer(influencer_id: str, user: dict = Depends(require_department(["marketing"]))):
    influencer = await db.influencers.find_one({"id": influencer_id}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    return influencer

@marketing_router.post("/influencers", response_model=InfluencerResponse)
async def create_influencer(data: InfluencerCreate, user: dict = Depends(require_department(["marketing"]))):
    influencer_id = str(uuid.uuid4())
    influencer_doc = {
        "id": influencer_id,
        **data.model_dump(),
        "status": "identified",
        "score": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    influencer_doc['score'] = calculate_influencer_score(influencer_doc)
    await db.influencers.insert_one(influencer_doc)
    if '_id' in influencer_doc:
        del influencer_doc['_id']
    return influencer_doc

@marketing_router.put("/influencers/{influencer_id}", response_model=InfluencerResponse)
async def update_influencer(influencer_id: str, data: dict, user: dict = Depends(require_department(["marketing"]))):
    update_data = {k: v for k, v in data.items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.influencers.find_one_and_update(
        {"id": influencer_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    new_score = calculate_influencer_score(result)
    await db.influencers.update_one({"id": influencer_id}, {"$set": {"score": new_score}})
    result['score'] = new_score
    del result['_id']
    return result

@marketing_router.delete("/influencers/{influencer_id}")
async def delete_influencer(influencer_id: str, user: dict = Depends(require_department(["marketing"]))):
    result = await db.influencers.delete_one({"id": influencer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Influencer not found")
    return {"message": "Influencer deleted"}

# Marketing Campaigns
@marketing_router.get("/campaigns", response_model=List[CampaignResponse])
async def get_marketing_campaigns(status: Optional[str] = None, user: dict = Depends(require_department(["marketing"]))):
    query = {}
    if status:
        query["status"] = status
    campaigns = await db.marketing_campaigns.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return campaigns

@marketing_router.post("/campaigns", response_model=CampaignResponse)
async def create_marketing_campaign(data: CampaignCreate, user: dict = Depends(require_department(["marketing"]))):
    campaign_id = str(uuid.uuid4())
    campaign_doc = {
        "id": campaign_id,
        **data.model_dump(),
        "spent": 0.0,
        "status": "planning",
        "influencers": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user['id']
    }
    await db.marketing_campaigns.insert_one(campaign_doc)
    if '_id' in campaign_doc:
        del campaign_doc['_id']
    return campaign_doc

# Marketing Outreach
@marketing_router.get("/outreach", response_model=List[OutreachResponse])
async def get_outreach(influencer_id: Optional[str] = None, user: dict = Depends(require_department(["marketing"]))):
    query = {}
    if influencer_id:
        query["influencer_id"] = influencer_id
    outreach = await db.outreach.find(query, {"_id": 0}).sort("sent_at", -1).to_list(200)
    return outreach

@marketing_router.post("/outreach", response_model=OutreachResponse)
async def create_outreach(data: OutreachCreate, user: dict = Depends(require_department(["marketing"]))):
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
    await db.influencers.update_one(
        {"id": data.influencer_id},
        {"$set": {"status": "contacted", "last_contacted": outreach_doc['sent_at']}}
    )
    
    if '_id' in outreach_doc:
        del outreach_doc['_id']
    return outreach_doc

# Marketing Negotiations
@marketing_router.get("/negotiations")
async def get_negotiations(
    influencer_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(require_department(["marketing"]))
):
    query = {}
    if influencer_id:
        query["influencer_id"] = influencer_id
    if status:
        query["status"] = status
    negotiations = await db.negotiations.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return negotiations

@marketing_router.post("/negotiations")
async def create_negotiation(data: NegotiationCreate, user: dict = Depends(require_department(["marketing"]))):
    influencer = await db.influencers.find_one({"id": data.influencer_id}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    neg_id = str(uuid.uuid4())
    neg_doc = {
        "id": neg_id,
        "influencer_id": data.influencer_id,
        "influencer_name": influencer['name'],
        "campaign_id": data.campaign_id,
        "initial_quote": data.initial_quote,
        "our_budget": data.our_budget,
        "deliverables": data.deliverables,
        "deadline": data.deadline,
        "status": "pending",
        "notes": data.notes,
        "timeline": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.negotiations.insert_one(neg_doc)
    await db.influencers.update_one({"id": data.influencer_id}, {"$set": {"status": "negotiation"}})
    if '_id' in neg_doc:
        del neg_doc['_id']
    return neg_doc

# Marketing Dashboard
@marketing_router.get("/dashboard")
async def get_marketing_dashboard(user: dict = Depends(require_department(["marketing"]))):
    total_influencers = await db.influencers.count_documents({})
    active_campaigns = await db.marketing_campaigns.count_documents({"status": "active"})
    pending_negotiations = await db.negotiations.count_documents({"status": "pending"})
    
    campaigns = await db.marketing_campaigns.find({}, {"_id": 0, "budget": 1, "spent": 1}).to_list(100)
    total_budget = sum(c.get('budget', 0) for c in campaigns)
    total_spent = sum(c.get('spent', 0) for c in campaigns)
    
    status_pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    status_dist = await db.influencers.aggregate(status_pipeline).to_list(10)
    
    return {
        "total_influencers": total_influencers,
        "active_campaigns": active_campaigns,
        "pending_negotiations": pending_negotiations,
        "total_budget": total_budget,
        "total_spent": total_spent,
        "budget_remaining": total_budget - total_spent,
        "status_distribution": {s['_id']: s['count'] for s in status_dist if s['_id']}
    }

# ============== SALES ROUTES ==============
@sales_router.get("/leads", response_model=List[LeadResponse])
async def get_leads(
    source: Optional[str] = None,
    stage: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(require_department(["sales"]))
):
    query = {}
    if source:
        query["source"] = source
    if stage:
        query["stage"] = stage
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [LeadResponse(**lead) for lead in leads]

@sales_router.post("/leads", response_model=LeadResponse)
async def create_lead(lead: LeadCreate, user: dict = Depends(require_department(["sales"]))):
    lead_id = str(uuid.uuid4())
    lead_doc = {
        "id": lead_id,
        "name": lead.name,
        "phone": lead.phone,
        "email": lead.email,
        "source": lead.source.value,
        "source_details": lead.source_details,
        "stage": PipelineStage.NEW_LEAD.value,
        "occasion": lead.occasion,
        "city": lead.city,
        "notes": lead.notes,
        "assigned_to": None,
        "assigned_to_name": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.leads.insert_one(lead_doc)
    return LeadResponse(**{k: v for k, v in lead_doc.items() if k != "_id"})

@sales_router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, user: dict = Depends(require_department(["sales"]))):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadResponse(**lead)

@sales_router.put("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, update: dict, user: dict = Depends(require_department(["sales"]))):
    update_data = {k: v for k, v in update.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadResponse(**updated)

@sales_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user: dict = Depends(require_department(["sales"]))):
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted"}

# Sales Customers
@sales_router.get("/customers", response_model=List[CustomerResponse])
async def get_customers(search: Optional[str] = None, user: dict = Depends(require_department(["sales"]))):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    customers = await db.customers.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [CustomerResponse(**c) for c in customers]

@sales_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, user: dict = Depends(require_department(["sales"]))):
    customer_id = str(uuid.uuid4())
    customer_doc = {
        "id": customer_id,
        **customer.model_dump(),
        "total_orders": 0,
        "total_spent": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customers.insert_one(customer_doc)
    return CustomerResponse(**{k: v for k, v in customer_doc.items() if k != "_id"})

# Sales QR Codes
@sales_router.get("/qrcodes", response_model=List[QRCodeResponse])
async def get_qrcodes(user: dict = Depends(require_department(["sales"]))):
    qrcodes = await db.qrcodes.find({}, {"_id": 0}).to_list(1000)
    return [QRCodeResponse(**q) for q in qrcodes]

@sales_router.post("/qrcodes", response_model=QRCodeResponse)
async def create_qrcode(qr: QRCodeCreate, user: dict = Depends(require_department(["sales"]))):
    qr_id = str(uuid.uuid4())
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    lead_url = f"{frontend_url}/capture?qr={qr_id}&source={qr.source_type.value}"
    
    qr_img = qrcode.QRCode(version=1, box_size=10, border=5)
    qr_img.add_data(lead_url)
    qr_img.make(fit=True)
    img = qr_img.make_image(fill_color="#064E3B", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    qr_doc = {
        "id": qr_id,
        "name": qr.name,
        "source_type": qr.source_type.value,
        "campaign": qr.campaign,
        "location": qr.location,
        "url": lead_url,
        "qr_image": f"data:image/png;base64,{qr_base64}",
        "scan_count": 0,
        "leads_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.qrcodes.insert_one(qr_doc)
    return QRCodeResponse(**{k: v for k, v in qr_doc.items() if k != "_id"})

# Sales Pipeline
@sales_router.get("/pipeline")
async def get_pipeline(user: dict = Depends(require_department(["sales"]))):
    pipeline = [{"$group": {"_id": "$stage", "count": {"$sum": 1}, "leads": {"$push": "$$ROOT"}}}]
    stages = await db.leads.aggregate(pipeline).to_list(10)
    
    result = {}
    for stage in PipelineStage:
        stage_data = next((s for s in stages if s['_id'] == stage.value), None)
        result[stage.value] = {
            "count": stage_data['count'] if stage_data else 0,
            "leads": [{k: v for k, v in l.items() if k != '_id'} for l in (stage_data['leads'][:10] if stage_data else [])]
        }
    return result

# Sales Dashboard
@sales_router.get("/dashboard")
async def get_sales_dashboard(user: dict = Depends(require_department(["sales"]))):
    total_leads = await db.leads.count_documents({})
    total_customers = await db.customers.count_documents({})
    
    pipeline_source = [{"$group": {"_id": "$source", "count": {"$sum": 1}}}]
    source_results = await db.leads.aggregate(pipeline_source).to_list(100)
    leads_by_source = {r["_id"]: r["count"] for r in source_results}
    
    pipeline_stage = [{"$group": {"_id": "$stage", "count": {"$sum": 1}}}]
    stage_results = await db.leads.aggregate(pipeline_stage).to_list(100)
    leads_by_stage = {r["_id"]: r["count"] for r in stage_results}
    
    confirmed = leads_by_stage.get(PipelineStage.ORDER_CONFIRMED.value, 0)
    conversion_rate = (confirmed / total_leads * 100) if total_leads > 0 else 0
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    leads_today = await db.leads.count_documents({"created_at": {"$gte": today_start.isoformat()}})
    
    return {
        "total_leads": total_leads,
        "total_customers": total_customers,
        "leads_by_source": leads_by_source,
        "leads_by_stage": leads_by_stage,
        "conversion_rate": round(conversion_rate, 2),
        "leads_today": leads_today
    }

# ============== SOCIAL ROUTES ==============
@social_router.get("/content", response_model=List[ContentResponse])
async def get_content(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(require_department(["social"]))
):
    query = {}
    if platform:
        query["platform"] = platform
    if status:
        query["status"] = status
    content = await db.content.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [ContentResponse(**c) for c in content]

@social_router.post("/content", response_model=ContentResponse)
async def create_content(data: ContentCreate, user: dict = Depends(require_department(["social"]))):
    content_id = str(uuid.uuid4())
    content_doc = {
        "id": content_id,
        **data.model_dump(),
        "created_by": user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.content.insert_one(content_doc)
    if '_id' in content_doc:
        del content_doc['_id']
    return ContentResponse(**content_doc)

@social_router.put("/content/{content_id}", response_model=ContentResponse)
async def update_content(content_id: str, data: dict, user: dict = Depends(require_department(["social"]))):
    update_data = {k: v for k, v in data.items() if v is not None}
    
    result = await db.content.find_one_and_update(
        {"id": content_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Content not found")
    del result['_id']
    return ContentResponse(**result)

@social_router.delete("/content/{content_id}")
async def delete_content(content_id: str, user: dict = Depends(require_department(["social"]))):
    result = await db.content.delete_one({"id": content_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")
    return {"message": "Content deleted"}

# Social Dashboard
@social_router.get("/dashboard")
async def get_social_dashboard(user: dict = Depends(require_department(["social"]))):
    total_content = await db.content.count_documents({})
    scheduled = await db.content.count_documents({"status": "scheduled"})
    published = await db.content.count_documents({"status": "published"})
    drafts = await db.content.count_documents({"status": "draft"})
    
    platform_pipeline = [{"$group": {"_id": "$platform", "count": {"$sum": 1}}}]
    platform_dist = await db.content.aggregate(platform_pipeline).to_list(10)
    
    return {
        "total_content": total_content,
        "scheduled": scheduled,
        "published": published,
        "drafts": drafts,
        "by_platform": {p['_id']: p['count'] for p in platform_dist if p['_id']}
    }

# Social Autopilot
@social_router.get("/autopilot/settings")
async def get_autopilot_settings(user: dict = Depends(require_department(["social"]))):
    settings = await db.autopilot_settings.find_one({"user_id": user['id']}, {"_id": 0})
    return settings or {"enabled": False, "platforms": [], "schedule": []}

@social_router.put("/autopilot/settings")
async def update_autopilot_settings(settings: dict, user: dict = Depends(require_department(["social"]))):
    await db.autopilot_settings.update_one(
        {"user_id": user['id']},
        {"$set": {**settings, "user_id": user['id']}},
        upsert=True
    )
    return {"message": "Settings updated"}

# ============== UNIFIED DASHBOARD ==============
@api_router.get("/dashboard/unified")
async def get_unified_dashboard(user: dict = Depends(get_current_user)):
    """Get unified dashboard stats across all departments user has access to"""
    departments = get_user_departments(user.get('role', 'viewer'))
    
    result = {
        "user": {
            "name": user['name'],
            "role": user.get('role'),
            "departments": departments
        },
        "stats": {}
    }
    
    if 'admin' in departments or 'marketing' in departments:
        result['stats']['marketing'] = {
            "influencers": await db.influencers.count_documents({}),
            "campaigns": await db.marketing_campaigns.count_documents({"status": "active"}),
            "negotiations": await db.negotiations.count_documents({"status": "pending"})
        }
    
    if 'admin' in departments or 'sales' in departments:
        result['stats']['sales'] = {
            "leads": await db.leads.count_documents({}),
            "customers": await db.customers.count_documents({}),
            "new_leads_today": await db.leads.count_documents({
                "created_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()}
            })
        }
    
    if 'admin' in departments or 'social' in departments:
        result['stats']['social'] = {
            "content": await db.content.count_documents({}),
            "scheduled": await db.content.count_documents({"status": "scheduled"}),
            "published": await db.content.count_documents({"status": "published"})
        }
    
    return result

# ============== ADMIN ROUTES ==============
@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(user: dict = Depends(get_current_user)):
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    for u in users:
        u['departments'] = get_user_departments(u.get('role', 'viewer'))
    return [UserResponse(**u) for u in users]

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, department: str, user: dict = Depends(get_current_user)):
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": role, "department": department}}
    )
    return {"message": "User role updated"}

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "sevora-team"}

# ============== SALES PARTNERS ==============
@sales_router.get("/partners")
async def get_partners(
    status: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(require_department(["sales"]))
):
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"contact_person": {"$regex": search, "$options": "i"}}
        ]
    partners = await db.partners.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return partners

@sales_router.post("/partners")
async def create_partner(data: dict, user: dict = Depends(require_department(["sales"]))):
    partner_id = str(uuid.uuid4())
    partner_doc = {
        "id": partner_id,
        **data,
        "status": data.get("status", "Active"),
        "leads_generated": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.partners.insert_one(partner_doc)
    if '_id' in partner_doc: del partner_doc['_id']
    return partner_doc

@sales_router.put("/partners/{partner_id}")
async def update_partner(partner_id: str, data: dict, user: dict = Depends(require_department(["sales"]))):
    update_data = {k: v for k, v in data.items() if v is not None}
    await db.partners.update_one({"id": partner_id}, {"$set": update_data})
    updated = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    return updated

@sales_router.delete("/partners/{partner_id}")
async def delete_partner(partner_id: str, user: dict = Depends(require_department(["sales"]))):
    await db.partners.delete_one({"id": partner_id})
    return {"message": "Partner deleted"}

# ============== SALES WEDDING PLANS ==============
@sales_router.get("/wedding-plans")
async def get_wedding_plans(user: dict = Depends(require_department(["sales"]))):
    plans = await db.wedding_plans.find({}, {"_id": 0}).sort("event_date", 1).to_list(500)
    return plans

@sales_router.post("/wedding-plans")
async def create_wedding_plan(data: dict, user: dict = Depends(require_department(["sales"]))):
    plan_id = str(uuid.uuid4())
    plan_doc = {
        "id": plan_id,
        **data,
        "status": "planning",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wedding_plans.insert_one(plan_doc)
    if '_id' in plan_doc: del plan_doc['_id']
    return plan_doc

@sales_router.put("/wedding-plans/{plan_id}")
async def update_wedding_plan(plan_id: str, data: dict, user: dict = Depends(require_department(["sales"]))):
    update_data = {k: v for k, v in data.items() if v is not None}
    await db.wedding_plans.update_one({"id": plan_id}, {"$set": update_data})
    updated = await db.wedding_plans.find_one({"id": plan_id}, {"_id": 0})
    return updated

# ============== SALES USERS (for assignment) ==============
@sales_router.get("/users")
async def get_sales_users(user: dict = Depends(require_department(["sales"]))):
    users = await db.users.find(
        {"$or": [{"department": "sales"}, {"role": "admin"}]},
        {"_id": 0, "password": 0}
    ).to_list(100)
    return users

# ============== SALES CAMPAIGNS (for QR codes) ==============
@sales_router.get("/campaigns")
async def get_sales_campaigns(status: Optional[str] = None, user: dict = Depends(require_department(["sales"]))):
    query = {}
    if status:
        query["status"] = status
    campaigns = await db.sales_campaigns.find(query, {"_id": 0}).to_list(100)
    return campaigns

# ============== SOCIAL POSTS ==============
@social_router.get("/posts")
async def get_posts(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(require_department(["social"]))
):
    query = {}
    if platform:
        query["platform"] = platform
    if status:
        query["status"] = status
    posts = await db.social_posts.find(query, {"_id": 0}).sort("scheduled_at", -1).to_list(500)
    return posts

@social_router.post("/posts")
async def create_post(data: dict, user: dict = Depends(require_department(["social"]))):
    post_id = str(uuid.uuid4())
    post_doc = {
        "id": post_id,
        **data,
        "status": data.get("status", "draft"),
        "created_by": user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.social_posts.insert_one(post_doc)
    if '_id' in post_doc: del post_doc['_id']
    return post_doc

@social_router.post("/posts/schedule")
async def schedule_post(data: dict, user: dict = Depends(require_department(["social"]))):
    post_id = str(uuid.uuid4())
    post_doc = {
        "id": post_id,
        **data,
        "status": "scheduled",
        "created_by": user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.social_posts.insert_one(post_doc)
    if '_id' in post_doc: del post_doc['_id']
    return post_doc

# ============== SOCIAL AI TOOLS ==============
@social_router.post("/ai/caption")
async def generate_caption(data: dict, user: dict = Depends(require_department(["social"]))):
    # Placeholder for AI caption generation
    return {
        "caption": f"Engaging caption for {data.get('topic', 'your post')}",
        "hashtags": ["#trending", "#content", "#socialmedia"],
        "score": 85
    }

@social_router.post("/ai/image")
async def generate_image(data: dict, user: dict = Depends(require_department(["social"]))):
    # Placeholder for AI image generation
    return {
        "image_url": "https://via.placeholder.com/800x600",
        "prompt": data.get('prompt', '')
    }

@social_router.post("/ai/analyze")
async def analyze_content(data: dict, user: dict = Depends(require_department(["social"]))):
    return {
        "score": 78,
        "suggestions": ["Add more hashtags", "Consider posting at peak hours"],
        "sentiment": "positive"
    }

# ============== SOCIAL LIBRARY ==============
@social_router.get("/library")
async def get_library(user: dict = Depends(require_department(["social"]))):
    items = await db.content_library.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@social_router.post("/library")
async def upload_to_library(data: dict, user: dict = Depends(require_department(["social"]))):
    item_id = str(uuid.uuid4())
    item_doc = {
        "id": item_id,
        **data,
        "created_by": user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.content_library.insert_one(item_doc)
    if '_id' in item_doc: del item_doc['_id']
    return item_doc

# ============== SOCIAL YOUTUBE ==============
@social_router.get("/youtube")
async def get_youtube_data(user: dict = Depends(require_department(["social"]))):
    return {
        "videos": [],
        "analytics": {"views": 0, "subscribers": 0}
    }

# ============== SOCIAL ANALYTICS ==============
@social_router.get("/analytics")
async def get_social_analytics(user: dict = Depends(require_department(["social"]))):
    return {
        "total_posts": await db.social_posts.count_documents({}),
        "engagement_rate": 4.5,
        "reach": 0,
        "impressions": 0
    }

# ============== SOCIAL AVATAR ==============
@social_router.get("/avatar")
async def get_avatar(user: dict = Depends(require_department(["social"]))):
    avatar = await db.social_avatars.find_one({"user_id": user['id']}, {"_id": 0})
    return avatar or {"style": "default", "voice": "neutral"}

@social_router.put("/avatar")
async def update_avatar(data: dict, user: dict = Depends(require_department(["social"]))):
    await db.social_avatars.update_one(
        {"user_id": user['id']},
        {"$set": {**data, "user_id": user['id']}},
        upsert=True
    )
    return {"message": "Avatar updated"}

# ============== MARKETING ANALYTICS ==============
@marketing_router.get("/analytics")
async def get_marketing_analytics(user: dict = Depends(require_department(["marketing"]))):
    return {
        "total_reach": 0,
        "engagement": 0,
        "roi": 0,
        "campaigns_performance": []
    }

# ============== MARKETING PAYMENTS ==============
@marketing_router.get("/payments")
async def get_payments(user: dict = Depends(require_department(["marketing"]))):
    payments = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return payments

@marketing_router.post("/payments")
async def create_payment(data: dict, user: dict = Depends(require_department(["marketing"]))):
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        **data,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_doc)
    if '_id' in payment_doc: del payment_doc['_id']
    return payment_doc

# ============== MARKETING SCHEDULED ==============
@marketing_router.get("/scheduled")
async def get_scheduled(user: dict = Depends(require_department(["marketing"]))):
    scheduled = await db.scheduled_content.find({}, {"_id": 0}).sort("scheduled_at", 1).to_list(100)
    return scheduled

# ============== MARKETING AI ==============
@marketing_router.post("/ai/discover")
async def discover_influencers(data: dict, user: dict = Depends(require_department(["marketing"]))):
    # Placeholder for AI influencer discovery
    return {
        "influencers": [],
        "total": 0
    }

@marketing_router.get("/ai/analyze/{influencer_id}")
async def analyze_influencer(influencer_id: str, user: dict = Depends(require_department(["marketing"]))):
    influencer = await db.influencers.find_one({"id": influencer_id}, {"_id": 0})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    return {
        "influencer": influencer,
        "analysis": {
            "score": influencer.get("score", 0),
            "engagement_trend": "stable",
            "recommended": True
        }
    }

# Include routers
api_router.include_router(auth_router)
api_router.include_router(marketing_router)
api_router.include_router(sales_router)
api_router.include_router(social_router)
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
