from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks, Query, WebSocket, WebSocketDisconnect
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
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MARKETING_MANAGER = "marketing_manager"
    SALES_MANAGER = "sales_manager"
    SOCIAL_MANAGER = "social_manager"
    VIEWER = "viewer"

# User status for activation workflow
class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"

# Department to modules mapping
DEPARTMENT_MODULES = {
    "marketing": ["influencers", "campaigns", "negotiations", "outreach", "ai_discovery", "email", "budget", "analytics"],
    "sales": ["leads", "customers", "wedding_planner", "pipeline", "qr_codes", "partners", "analytics"],
    "social": ["content_studio", "ai_tools", "autopilot", "posts", "analytics", "avatar", "youtube", "content_library"],
    "admin": ["all"]
}

# Role to department mapping
ROLE_DEPARTMENTS = {
    "super_admin": ["marketing", "sales", "social", "admin"],
    "admin": ["marketing", "sales", "social", "admin"],
    "marketing_manager": ["marketing"],
    "sales_manager": ["sales"],
    "social_manager": ["social"],
    "viewer": []
}

# Role hierarchy for permission checks
ROLE_HIERARCHY = {
    "super_admin": 100,
    "admin": 80,
    "marketing_manager": 50,
    "sales_manager": 50,
    "social_manager": 50,
    "viewer": 10
}

# ============== MODELS ==============
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    department: Department = Department.SALES
    role: UserRole = UserRole.VIEWER
    status: UserStatus = UserStatus.PENDING

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
    status: str = "active"
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None
    last_login: Optional[str] = None
    azure_id: Optional[str] = None
    employee_id: Optional[str] = None

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    departments: Optional[List[str]] = None
    status: Optional[str] = None
    employee_id: Optional[str] = None

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
    
    # Check if user is active
    user_status = user.get('status', 'active')
    if user_status == 'inactive':
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact an administrator.")
    if user_status == 'pending':
        raise HTTPException(status_code=403, detail="Your account is pending activation. Please contact an administrator.")
    
    # Update last login
    await db.users.update_one(
        {"id": user['id']},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
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
            status=user.get('status', 'active'),
            avatar_url=user.get('avatar_url'),
            created_at=user.get('created_at'),
            last_login=datetime.now(timezone.utc).isoformat()
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
        # Create new user with PENDING status (Azure AD sync workflow)
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "azure_id": azure_id,
            "email": email,
            "name": name,
            "department": "sales",
            "role": "viewer",
            "status": "pending",  # New users from Azure AD start as pending
            "avatar_url": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source": "azure_ad"
        }
        await db.users.insert_one(user)
        raise HTTPException(
            status_code=403, 
            detail="Your account has been created but is pending activation. Please contact an administrator."
        )
    else:
        # Check if user is active
        user_status = user.get('status', 'active')
        if user_status == 'inactive':
            raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact an administrator.")
        if user_status == 'pending':
            raise HTTPException(status_code=403, detail="Your account is pending activation. Please contact an administrator.")
        
        # Update Azure ID and last login
        update_data = {"last_login": datetime.now(timezone.utc).isoformat()}
        if not user.get('azure_id'):
            update_data["azure_id"] = azure_id
        await db.users.update_one({"id": user['id']}, {"$set": update_data})
    
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
            status=user.get('status', 'active'),
            avatar_url=user.get('avatar_url'),
            created_at=user.get('created_at'),
            last_login=datetime.now(timezone.utc).isoformat(),
            azure_id=azure_id
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

# ============== ADMIN ROUTES - USER MANAGEMENT ==============

def require_admin():
    """Dependency to require admin or super_admin role"""
    async def admin_check(user: dict = Depends(get_current_user)):
        if user.get('role') not in ['admin', 'super_admin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    return admin_check

def require_super_admin():
    """Dependency to require super_admin role only"""
    async def super_admin_check(user: dict = Depends(get_current_user)):
        if user.get('role') != 'super_admin':
            raise HTTPException(status_code=403, detail="Super Admin access required")
        return user
    return super_admin_check

@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(
    status: Optional[str] = None,
    role: Optional[str] = None,
    department: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(require_admin())
):
    """Get all users with optional filters"""
    query = {}
    
    if status:
        query["status"] = status
    if role:
        query["role"] = role
    if department:
        query["$or"] = [
            {"department": department},
            {"departments": department}
        ]
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"employee_id": {"$regex": search, "$options": "i"}}
        ]
    
    users = await db.users.find(query, {"_id": 0, "password": 0, "hashed_password": 0}).sort("created_at", -1).to_list(1000)
    
    for u in users:
        u['departments'] = get_user_departments(u.get('role', 'viewer'))
        # Ensure status field exists
        if 'status' not in u:
            u['status'] = 'active'
    
    return [UserResponse(**u) for u in users]

@api_router.get("/admin/users/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: str, user: dict = Depends(require_admin())):
    """Get a specific user by ID"""
    found_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0, "hashed_password": 0})
    if not found_user:
        raise HTTPException(status_code=404, detail="User not found")
    found_user['departments'] = get_user_departments(found_user.get('role', 'viewer'))
    if 'status' not in found_user:
        found_user['status'] = 'active'
    return UserResponse(**found_user)

@api_router.post("/admin/users", response_model=UserResponse)
async def create_user_admin(data: UserCreate, user: dict = Depends(require_admin())):
    """Create a new user (admin only)"""
    # Check if email already exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_pw = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    
    user_doc = {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "hashed_password": hashed_pw,
        "department": data.department.value,
        "role": data.role.value,
        "status": data.status.value,
        "departments": ROLE_DEPARTMENTS.get(data.role.value, []),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get('id'),
        "last_login": None,
        "azure_id": None,
        "employee_id": None
    }
    
    await db.users.insert_one(user_doc)
    
    # Log the action
    await log_admin_action(user.get('id'), "create_user", user_id, {"email": data.email, "role": data.role.value})
    
    del user_doc['hashed_password']
    return UserResponse(**user_doc)

@api_router.put("/admin/users/{user_id}")
async def update_user(user_id: str, data: UserUpdateRequest, user: dict = Depends(require_admin())):
    """Update user details"""
    # Prevent editing super_admin unless you are super_admin
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.get('role') == 'super_admin' and user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Cannot modify Super Admin user")
    
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.role is not None:
        update_data["role"] = data.role
        update_data["departments"] = ROLE_DEPARTMENTS.get(data.role, [])
    if data.department is not None:
        update_data["department"] = data.department
    if data.departments is not None:
        update_data["departments"] = data.departments
    if data.status is not None:
        update_data["status"] = data.status
    if data.employee_id is not None:
        update_data["employee_id"] = data.employee_id
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        update_data["updated_by"] = user.get('id')
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        
        # Log the action
        await log_admin_action(user.get('id'), "update_user", user_id, update_data)
    
    return {"success": True, "message": "User updated successfully"}

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, department: str, user: dict = Depends(require_admin())):
    """Update user role and department"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.get('role') == 'super_admin' and user.get('role') != 'super_admin':
        raise HTTPException(status_code=403, detail="Cannot modify Super Admin user")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "role": role, 
            "department": department,
            "departments": ROLE_DEPARTMENTS.get(role, []),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get('id')
        }}
    )
    
    await log_admin_action(user.get('id'), "change_role", user_id, {"role": role, "department": department})
    
    return {"success": True, "message": "User role updated"}

@api_router.put("/admin/users/{user_id}/activate")
async def activate_user(user_id: str, user: dict = Depends(require_admin())):
    """Activate a user account"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "status": "active",
            "activated_at": datetime.now(timezone.utc).isoformat(),
            "activated_by": user.get('id')
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await log_admin_action(user.get('id'), "activate_user", user_id, {})
    
    return {"success": True, "message": "User activated"}

@api_router.put("/admin/users/{user_id}/deactivate")
async def deactivate_user(user_id: str, user: dict = Depends(require_admin())):
    """Deactivate a user account"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.get('role') == 'super_admin':
        raise HTTPException(status_code=403, detail="Cannot deactivate Super Admin user")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "status": "inactive",
            "deactivated_at": datetime.now(timezone.utc).isoformat(),
            "deactivated_by": user.get('id')
        }}
    )
    
    await log_admin_action(user.get('id'), "deactivate_user", user_id, {})
    
    return {"success": True, "message": "User deactivated"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_super_admin())):
    """Delete a user (Super Admin only)"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.get('role') == 'super_admin':
        raise HTTPException(status_code=403, detail="Cannot delete Super Admin user")
    
    await db.users.delete_one({"id": user_id})
    
    await log_admin_action(user.get('id'), "delete_user", user_id, {"email": target_user.get('email')})
    
    return {"success": True, "message": "User deleted"}

@api_router.get("/admin/roles")
async def get_available_roles(user: dict = Depends(require_admin())):
    """Get all available roles and their permissions"""
    roles = []
    for role_name, departments in ROLE_DEPARTMENTS.items():
        roles.append({
            "id": role_name,
            "name": role_name.replace("_", " ").title(),
            "departments": departments,
            "hierarchy": ROLE_HIERARCHY.get(role_name, 0)
        })
    return sorted(roles, key=lambda x: -x['hierarchy'])

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(require_admin())):
    """Get user statistics for admin dashboard"""
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"status": "active"})
    inactive_users = await db.users.count_documents({"status": "inactive"})
    pending_users = await db.users.count_documents({"status": "pending"})
    
    # Count by role
    role_counts = {}
    for role in UserRole:
        count = await db.users.count_documents({"role": role.value})
        role_counts[role.value] = count
    
    # Count by department
    dept_counts = {}
    for dept in Department:
        count = await db.users.count_documents({"department": dept.value})
        dept_counts[dept.value] = count
    
    # Recent logins (last 24 hours)
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    recent_logins = await db.users.count_documents({"last_login": {"$gte": yesterday}})
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": inactive_users,
        "pending_users": pending_users,
        "recent_logins": recent_logins,
        "by_role": role_counts,
        "by_department": dept_counts
    }

@api_router.get("/admin/audit-logs")
async def get_audit_logs(
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    target_id: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(require_admin())
):
    """Get admin audit logs"""
    query = {}
    if action:
        query["action"] = action
    if user_id:
        query["user_id"] = user_id
    if target_id:
        query["target_id"] = target_id
    
    logs = await db.admin_audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs

async def log_admin_action(user_id: str, action: str, target_id: str, details: dict):
    """Log an admin action for audit trail"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "target_id": target_id,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_audit_logs.insert_one(log_entry)

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

# ============== AI GENERATION ENDPOINTS ==============
ai_router = APIRouter(prefix="/ai", tags=["AI Generation"])

@ai_router.post("/text")
async def generate_ai_text(
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Generate text using GPT-5.2"""
    try:
        from services.ai_service import generate_text
        result = await generate_text(
            prompt=data.get("prompt", ""),
            system_message=data.get("system_message"),
            model=data.get("model", "gpt-5.2")
        )
        return result
    except Exception as e:
        logger.error(f"AI text generation error: {e}")
        return {"success": False, "error": str(e)}

@ai_router.post("/image")
async def generate_ai_image(
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Generate images using GPT Image 1"""
    try:
        from services.ai_service import generate_image
        result = await generate_image(
            prompt=data.get("prompt", ""),
            model=data.get("model", "gpt-image-1"),
            num_images=data.get("num_images", 1)
        )
        return result
    except Exception as e:
        logger.error(f"AI image generation error: {e}")
        return {"success": False, "error": str(e)}

@ai_router.post("/video")
async def generate_ai_video(
    data: dict,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """Generate video using Sora 2 (background task)"""
    try:
        from services.ai_service import generate_video_sync
        
        # Video generation is slow, run in background
        video_id = str(uuid.uuid4())
        
        # Store pending video job
        await db.video_jobs.insert_one({
            "id": video_id,
            "prompt": data.get("prompt", ""),
            "status": "pending",
            "user_id": user['id'],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Run in background
        def generate_and_store():
            result = generate_video_sync(
                prompt=data.get("prompt", ""),
                model=data.get("model", "sora-2"),
                size=data.get("size", "1280x720"),
                duration=data.get("duration", 4)
            )
            # Update job status (sync update since we're in background)
            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(
                db.video_jobs.update_one(
                    {"id": video_id},
                    {"$set": {
                        "status": "completed" if result.get("success") else "failed",
                        "result": result,
                        "completed_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
            )
            loop.close()
        
        background_tasks.add_task(generate_and_store)
        
        return {
            "success": True,
            "job_id": video_id,
            "status": "pending",
            "message": "Video generation started. Check status with GET /api/ai/video/{job_id}"
        }
    except Exception as e:
        logger.error(f"AI video generation error: {e}")
        return {"success": False, "error": str(e)}

@ai_router.get("/video/{job_id}")
async def get_video_job_status(
    job_id: str,
    user: dict = Depends(get_current_user)
):
    """Get video generation job status"""
    job = await db.video_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Video job not found")
    return job

@ai_router.post("/caption")
async def generate_caption(
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Generate social media caption with AI"""
    try:
        from services.ai_service import generate_social_caption
        result = await generate_social_caption(
            topic=data.get("topic", ""),
            platform=data.get("platform", "instagram"),
            tone=data.get("tone", "engaging")
        )
        return result
    except Exception as e:
        logger.error(f"Caption generation error: {e}")
        return {"success": False, "error": str(e)}

@ai_router.post("/email-content")
async def generate_email(
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Generate email content with AI"""
    try:
        from services.ai_service import generate_email_content
        result = await generate_email_content(
            subject_hint=data.get("subject", ""),
            recipient_type=data.get("recipient_type", "customer"),
            tone=data.get("tone", "professional")
        )
        return result
    except Exception as e:
        logger.error(f"Email content generation error: {e}")
        return {"success": False, "error": str(e)}

# ============== COMMUNICATION ENDPOINTS ==============
comm_router = APIRouter(prefix="/communication", tags=["Communication"])

@comm_router.post("/whatsapp/send")
async def send_whatsapp_message(
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Send WhatsApp message via Twilio"""
    try:
        from services.communication_service import whatsapp_service
        
        result = whatsapp_service.send_message(
            to_number=data.get("to"),
            message=data.get("message")
        )
        
        # Log the message
        if result.get("success"):
            await db.communication_logs.insert_one({
                "id": str(uuid.uuid4()),
                "type": "whatsapp",
                "to": data.get("to"),
                "message": data.get("message"),
                "status": result.get("status"),
                "message_sid": result.get("message_sid"),
                "sent_by": user['id'],
                "sent_at": datetime.now(timezone.utc).isoformat()
            })
        
        return result
    except Exception as e:
        logger.error(f"WhatsApp send error: {e}")
        return {"success": False, "error": str(e)}

@comm_router.post("/whatsapp/template")
async def send_whatsapp_template(
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Send WhatsApp template message"""
    try:
        from services.communication_service import whatsapp_service
        
        result = whatsapp_service.send_template_message(
            to_number=data.get("to"),
            template_name=data.get("template"),
            variables=data.get("variables", {})
        )
        
        if result.get("success"):
            await db.communication_logs.insert_one({
                "id": str(uuid.uuid4()),
                "type": "whatsapp_template",
                "to": data.get("to"),
                "template": data.get("template"),
                "variables": data.get("variables"),
                "status": result.get("status"),
                "sent_by": user['id'],
                "sent_at": datetime.now(timezone.utc).isoformat()
            })
        
        return result
    except Exception as e:
        logger.error(f"WhatsApp template error: {e}")
        return {"success": False, "error": str(e)}

@comm_router.post("/email/send")
async def send_outlook_email(
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Send email via Microsoft Outlook/Graph"""
    try:
        from services.communication_service import email_service
        
        result = await email_service.send_email(
            sender_email=data.get("from", user.get("email")),
            to_recipients=data.get("to", []),
            subject=data.get("subject", ""),
            body=data.get("body", ""),
            content_type=data.get("content_type", "html"),
            cc_recipients=data.get("cc", [])
        )
        
        if result.get("success"):
            await db.communication_logs.insert_one({
                "id": str(uuid.uuid4()),
                "type": "email",
                "to": data.get("to"),
                "subject": data.get("subject"),
                "status": "sent",
                "sent_by": user['id'],
                "sent_at": datetime.now(timezone.utc).isoformat()
            })
        
        return result
    except Exception as e:
        logger.error(f"Email send error: {e}")
        return {"success": False, "error": str(e)}

@comm_router.get("/logs")
async def get_communication_logs(
    type: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user)
):
    """Get communication logs"""
    query = {}
    if type:
        query["type"] = type
    
    logs = await db.communication_logs.find(query, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
    return logs

# ============== TEAM COLLABORATION ENDPOINTS ==============
collab_router = APIRouter(prefix="/collaboration", tags=["Team Collaboration"])

@collab_router.post("/comments")
async def add_comment(
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Add a comment to any entity (campaign, lead, content, etc.)"""
    comment_id = str(uuid.uuid4())
    
    # Parse mentions from comment text
    mentions = []
    import re
    mention_pattern = r'@(\w+)'
    matches = re.findall(mention_pattern, data.get("text", ""))
    
    if matches:
        # Find mentioned users
        for mention in matches:
            mentioned_user = await db.users.find_one(
                {"$or": [{"name": {"$regex": mention, "$options": "i"}}, {"email": {"$regex": mention, "$options": "i"}}]},
                {"_id": 0, "id": 1, "name": 1, "email": 1}
            )
            if mentioned_user:
                mentions.append(mentioned_user)
    
    comment_doc = {
        "id": comment_id,
        "entity_type": data.get("entity_type"),  # campaign, lead, content, etc.
        "entity_id": data.get("entity_id"),
        "text": data.get("text"),
        "mentions": mentions,
        "author_id": user['id'],
        "author_name": user['name'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.comments.insert_one(comment_doc)
    
    # Remove MongoDB _id before returning
    if '_id' in comment_doc:
        del comment_doc['_id']
    
    # Create notifications for mentioned users and send via WebSocket
    from services.websocket_service import manager as ws_manager
    for mentioned in mentions:
        notification_doc = {
            "id": str(uuid.uuid4()),
            "type": "mention",
            "user_id": mentioned['id'],
            "title": f"{user['name']} mentioned you",
            "message": f"{user['name']} mentioned you in a comment on {data.get('entity_type')}",
            "entity_type": data.get("entity_type"),
            "entity_id": data.get("entity_id"),
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification_doc)
        if '_id' in notification_doc:
            del notification_doc['_id']
        
        # Send real-time WebSocket notification
        await ws_manager.send_personal_notification(mentioned['id'], notification_doc)
    
    # Create activity feed entry
    activity_doc = {
        "id": str(uuid.uuid4()),
        "type": "comment",
        "user_id": user['id'],
        "user_name": user['name'],
        "entity_type": data.get("entity_type"),
        "entity_id": data.get("entity_id"),
        "description": f"commented on {data.get('entity_type')}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_feed.insert_one(activity_doc)
    if '_id' in activity_doc:
        del activity_doc['_id']
    
    # Broadcast activity to all connected users
    await ws_manager.broadcast_activity(activity_doc)
    
    return comment_doc

@collab_router.get("/comments/{entity_type}/{entity_id}")
async def get_comments(
    entity_type: str,
    entity_id: str,
    user: dict = Depends(get_current_user)
):
    """Get comments for an entity"""
    comments = await db.comments.find(
        {"entity_type": entity_type, "entity_id": entity_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return comments

@collab_router.get("/activity-feed")
async def get_activity_feed(
    department: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user)
):
    """Get activity feed for team"""
    query = {}
    if department:
        query["department"] = department
    
    activities = await db.activity_feed.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return activities

@collab_router.get("/notifications")
async def get_notifications(
    unread_only: bool = False,
    user: dict = Depends(get_current_user)
):
    """Get notifications for current user"""
    query = {"user_id": user['id']}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return notifications

@collab_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: dict = Depends(get_current_user)
):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user['id']},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

@collab_router.put("/notifications/read-all")
async def mark_all_notifications_read(
    user: dict = Depends(get_current_user)
):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": user['id'], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# Include new routers
api_router.include_router(ai_router)
api_router.include_router(comm_router)
api_router.include_router(collab_router)

# Include routers
api_router.include_router(auth_router)
api_router.include_router(marketing_router)
api_router.include_router(sales_router)
api_router.include_router(social_router)
app.include_router(api_router)

# ============== WEBSOCKET FOR REAL-TIME NOTIFICATIONS ==============
from services.websocket_service import manager as ws_manager

@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """
    WebSocket endpoint for real-time notifications
    Connect with: ws://host/ws/{jwt_token}
    """
    try:
        # Verify token
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
        
        # Get user's departments
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            await websocket.close(code=4001, reason="User not found")
            return
        
        departments = get_user_departments(user.get('role', 'viewer'))
        
        # Connect
        await ws_manager.connect(websocket, user_id, departments)
        
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "user_id": user_id,
            "departments": departments,
            "online_users": ws_manager.get_online_users_count()
        })
        
        # Keep connection alive and handle messages
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle ping
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                
                # Handle mark notification as read via WebSocket
                elif message.get("type") == "mark_read":
                    notification_id = message.get("notification_id")
                    if notification_id:
                        await db.notifications.update_one(
                            {"id": notification_id, "user_id": user_id},
                            {"$set": {"read": True}}
                        )
                        await websocket.send_json({
                            "type": "notification_marked_read",
                            "notification_id": notification_id
                        })
                        
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                continue
            except Exception as e:
                logger.error(f"WebSocket message error: {e}")
                continue
                
    except jwt.ExpiredSignatureError:
        await websocket.close(code=4001, reason="Token expired")
    except jwt.InvalidTokenError:
        await websocket.close(code=4001, reason="Invalid token")
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if 'user_id' in locals():
            ws_manager.disconnect(websocket, user_id)

@api_router.get("/ws/online-users")
async def get_online_users(user: dict = Depends(get_current_user)):
    """Get count and list of online users"""
    return {
        "count": ws_manager.get_online_users_count(),
        "users": ws_manager.get_online_users()
    }

# Helper function to send notifications via WebSocket
async def notify_new_lead(lead_name: str, source: str):
    """Call this when a new lead is created"""
    await ws_manager.send_lead_notification("sales", lead_name, source)

async def notify_campaign_update(campaign_name: str, action: str):
    """Call this when a campaign is updated"""
    await ws_manager.send_campaign_notification(campaign_name, action)

async def notify_content_update(content_title: str, status: str):
    """Call this when content status changes"""
    await ws_manager.send_content_notification(content_title, status)

async def notify_mention(mentioned_user_id: str, mentioner_name: str, 
                        entity_type: str, entity_id: str, comment_text: str):
    """Call this when user is mentioned"""
    await ws_manager.send_mention_notification(
        mentioned_user_id, mentioner_name, entity_type, entity_id, comment_text
    )

# ============== CONTENT STUDIO ENDPOINTS ==============
content_studio_router = APIRouter(prefix="/content", tags=["Content Studio"])

@content_studio_router.post("/generate")
async def generate_content(data: dict, user: dict = Depends(require_department(["social"]))):
    """Generate AI content for social media"""
    try:
        from services.ai_service import generate_text
        
        platform = data.get("platform", "instagram")
        topic = data.get("topic", "")
        tone = data.get("tone", "professional")
        content_type = data.get("content_type", "post")
        
        prompt = f"""Create a {content_type} for {platform} about: {topic}
        
Tone: {tone}
Platform requirements:
- Instagram: Max 2200 chars, include hashtags
- Twitter/X: Max 280 chars, punchy
- LinkedIn: Professional, max 3000 chars
- Facebook: Conversational, max 500 chars

Respond with JSON: {{"content": "the post text", "hashtags": ["tag1", "tag2"], "hook": "attention grabber"}}"""
        
        result = await generate_text(prompt=prompt, system_message="You are a social media content expert. Always respond with valid JSON.")
        
        if result.get("success"):
            response_text = result.get("text", "") or result.get("content", "")
            try:
                import json
                content_data = json.loads(response_text)
                return {
                    "success": True,
                    "content": content_data.get("content", response_text),
                    "hashtags": content_data.get("hashtags", []),
                    "hook": content_data.get("hook", "")
                }
            except:
                return {"success": True, "content": response_text, "hashtags": [], "hook": ""}
        return {"success": False, "error": result.get("error", "Generation failed")}
    except Exception as e:
        logger.error(f"Content generation error: {e}")
        return {"success": False, "error": str(e)}

@content_studio_router.post("/ideas")
async def generate_ideas(data: dict, user: dict = Depends(require_department(["social"]))):
    """Generate content ideas"""
    try:
        from services.ai_service import generate_text
        
        platform = data.get("platform", "instagram")
        topic = data.get("topic", "")
        tone = data.get("tone", "professional")
        
        prompt = f"""Generate 5 creative content ideas for {platform} about: {topic}
        
Tone: {tone}

Respond with JSON array: [{{"title": "idea title", "description": "brief description", "hook": "opening hook", "type": "post/reel/story/carousel"}}]"""
        
        result = await generate_text(prompt=prompt, system_message="You are a social media strategist. Always respond with valid JSON array.")
        
        if result.get("success"):
            response_text = result.get("text", "") or result.get("content", "")
            try:
                import json
                ideas = json.loads(response_text)
                return {"success": True, "ideas": ideas}
            except:
                return {"success": True, "ideas": [{"title": "Generated Idea", "description": response_text, "hook": "", "type": "post"}]}
        return {"success": False, "error": result.get("error", "Generation failed")}
    except Exception as e:
        logger.error(f"Ideas generation error: {e}")
        return {"success": False, "error": str(e)}

@content_studio_router.post("/refine")
async def refine_content(data: dict, user: dict = Depends(require_department(["social"]))):
    """Refine existing content"""
    try:
        from services.ai_service import generate_text
        
        content = data.get("content", "")
        action = data.get("action", "improve")
        platform = data.get("platform", "instagram")
        
        action_prompts = {
            "shorten": f"Make this {platform} post shorter and punchier while keeping the key message:\n\n{content}",
            "expand": f"Expand this {platform} post with more details and engagement elements:\n\n{content}",
            "improve": f"Improve this {platform} post to be more engaging and professional:\n\n{content}",
            "hooks": f"Generate 3 attention-grabbing hooks for this {platform} post:\n\n{content}",
            "cta": f"Add a compelling call-to-action to this {platform} post:\n\n{content}",
            "emoji": f"Add appropriate emojis to enhance this {platform} post:\n\n{content}"
        }
        
        prompt = action_prompts.get(action, action_prompts["improve"])
        result = await generate_text(prompt=prompt, system_message="You are a social media editor.")
        
        response_text = result.get("text", "") or result.get("content", content)
        return {"success": True, "refined_content": response_text, "action": action}
    except Exception as e:
        logger.error(f"Content refinement error: {e}")
        return {"success": False, "error": str(e)}

@content_studio_router.post("/quality-check")
async def quality_check(data: dict, user: dict = Depends(require_department(["social"]))):
    """Check content quality and compliance"""
    try:
        from services.ai_service import generate_text
        
        content = data.get("platform", "") + ": " + data.get("topic", "")
        platform = data.get("platform", "instagram")
        
        prompt = f"""Analyze this {platform} post and provide quality feedback:

{content}

Respond with JSON:
{{
    "score": 0-100,
    "readability": "easy/medium/hard",
    "engagement_potential": "low/medium/high",
    "issues": ["list of issues"],
    "suggestions": ["improvement suggestions"],
    "hashtag_quality": "good/needs work",
    "cta_present": true/false
}}"""
        
        result = await generate_text(prompt=prompt, system_message="You are a social media quality analyst. Always respond with valid JSON.")
        
        if result.get("success"):
            response_text = result.get("text", "") or result.get("content", "")
            try:
                import json
                analysis = json.loads(response_text)
                return {"success": True, **analysis}
            except:
                return {"success": True, "score": 75, "issues": [], "suggestions": ["Content looks good!"], "engagement_potential": "medium"}
        return {"success": False, "error": result.get("error", "Check failed")}
    except Exception as e:
        logger.error(f"Quality check error: {e}")
        return {"success": False, "error": str(e)}

@content_studio_router.post("/generate-image")
async def generate_content_image(data: dict, user: dict = Depends(require_department(["social"]))):
    """Generate image for content"""
    try:
        from services.ai_service import generate_image
        
        prompt = data.get("prompt", "")
        style = data.get("style", "modern social media")
        
        enhanced_prompt = f"{prompt}. Style: {style}, high quality, social media optimized"
        result = await generate_image(prompt=enhanced_prompt)
        
        return result
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        return {"success": False, "error": str(e)}

# ============== TEMPLATES ENDPOINTS ==============
@app.get("/api/templates")
async def get_templates(user: dict = Depends(require_department(["social"]))):
    """Get content templates"""
    templates = [
        {"id": "1", "name": "Product Launch", "category": "marketing", "content": "Introducing [PRODUCT] - [BENEFIT]! Get yours now.", "platforms": ["instagram", "facebook"]},
        {"id": "2", "name": "Behind the Scenes", "category": "engagement", "content": "Ever wonder what goes on behind the curtain? Here's a sneak peek!", "platforms": ["instagram", "tiktok"]},
        {"id": "3", "name": "Customer Testimonial", "category": "social_proof", "content": "Don't just take our word for it - hear from [NAME]!", "platforms": ["linkedin", "facebook"]},
        {"id": "4", "name": "Tips & Tricks", "category": "educational", "content": "Pro tip: [TIP] This simple trick will [BENEFIT]!", "platforms": ["twitter", "linkedin"]},
        {"id": "5", "name": "Question Post", "category": "engagement", "content": "We want to hear from you! [QUESTION]? Drop your answer below!", "platforms": ["instagram", "facebook", "twitter"]},
    ]
    return templates

# ============== PILLARS ENDPOINTS ==============
@app.get("/api/pillars")
async def get_pillars(user: dict = Depends(require_department(["social"]))):
    """Get content pillars"""
    pillars = await db.pillars.find({"user_id": user['id']}).to_list(100)
    for p in pillars:
        p['pillar_id'] = str(p.pop('_id'))
    return pillars

@app.post("/api/pillars")
async def create_pillar(data: dict, user: dict = Depends(require_department(["social"]))):
    """Create content pillar"""
    pillar = {
        "name": data.get("name"),
        "description": data.get("description", ""),
        "color": data.get("color", "#4A3728"),
        "target_percentage": data.get("target_percentage", 20),
        "user_id": user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.pillars.insert_one(pillar)
    pillar['pillar_id'] = str(result.inserted_id)
    del pillar['_id']
    return pillar

@app.delete("/api/pillars/{pillar_id}")
async def delete_pillar(pillar_id: str, user: dict = Depends(require_department(["social"]))):
    """Delete content pillar"""
    from bson import ObjectId
    await db.pillars.delete_one({"_id": ObjectId(pillar_id), "user_id": user['id']})
    return {"success": True}

@content_studio_router.post("/ideas-by-pillar")
async def generate_ideas_by_pillar(pillar: str, data: dict, user: dict = Depends(require_department(["social"]))):
    """Generate ideas based on content pillar"""
    try:
        from services.ai_service import generate_text
        
        platform = data.get("platform", "instagram")
        topic = data.get("topic", "")
        tone = data.get("tone", "professional")
        
        prompt = f"""Generate 5 content ideas for {platform} aligned with the content pillar: {pillar}
        
Additional context: {topic}
Tone: {tone}

Respond with JSON array: [{{"title": "idea title", "description": "brief description", "pillar_alignment": "how it fits the pillar", "type": "post/reel/story"}}]"""
        
        result = await generate_text(prompt=prompt, system_message="You are a content strategist. Always respond with valid JSON array.")
        
        if result.get("success"):
            response_text = result.get("text", "") or result.get("content", "")
            try:
                import json
                ideas = json.loads(response_text)
                return {"success": True, "ideas": ideas, "pillar": pillar}
            except:
                return {"success": True, "ideas": [{"title": "Pillar-aligned idea", "description": response_text, "pillar_alignment": pillar, "type": "post"}], "pillar": pillar}
        return {"success": False, "error": result.get("error", "Generation failed")}
    except Exception as e:
        logger.error(f"Pillar ideas error: {e}")
        return {"success": False, "error": str(e)}

# ============== APPROVALS ENDPOINTS ==============
@app.get("/api/approvals")
async def get_approvals(user: dict = Depends(require_department(["social"]))):
    """Get approval requests"""
    approvals = await db.approvals.find({}).sort("created_at", -1).to_list(100)
    for a in approvals:
        a['approval_id'] = str(a.pop('_id'))
    return approvals

@app.get("/api/approvals/stats")
async def get_approval_stats(user: dict = Depends(require_department(["social"]))):
    """Get approval statistics"""
    pending = await db.approvals.count_documents({"status": "pending"})
    approved = await db.approvals.count_documents({"status": "approved"})
    rejected = await db.approvals.count_documents({"status": "rejected"})
    return {"pending": pending, "approved": approved, "rejected": rejected, "total": pending + approved + rejected}

@app.get("/api/approvals/actionable")
async def get_actionable_approvals(user: dict = Depends(require_department(["social"]))):
    """Get approvals needing action"""
    approvals = await db.approvals.find({"status": "pending"}).sort("created_at", -1).to_list(50)
    for a in approvals:
        a['approval_id'] = str(a.pop('_id'))
    return approvals

@app.post("/api/approvals/submit")
async def submit_for_approval(data: dict, user: dict = Depends(require_department(["social"]))):
    """Submit content for approval"""
    approval = {
        "post_id": data.get("post_id"),
        "note": data.get("note", ""),
        "status": "pending",
        "submitted_by": user['id'],
        "submitted_by_name": user.get('name', 'Unknown'),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_at": None,
        "reviewer_id": None,
        "feedback": ""
    }
    result = await db.approvals.insert_one(approval)
    approval['approval_id'] = str(result.inserted_id)
    del approval['_id']
    return {"success": True, "approval": approval}

@app.post("/api/approvals/{approval_id}/review")
async def review_approval(approval_id: str, data: dict, user: dict = Depends(require_department(["social"]))):
    """Review approval request"""
    from bson import ObjectId
    action = data.get("action")  # "approve" or "reject"
    feedback = data.get("feedback", "")
    
    update = {
        "status": "approved" if action == "approve" else "rejected",
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "reviewer_id": user['id'],
        "feedback": feedback
    }
    
    await db.approvals.update_one({"_id": ObjectId(approval_id)}, {"$set": update})
    return {"success": True, "status": update["status"]}

@app.post("/api/approvals/{approval_id}/move-to-queue")
async def move_to_queue(approval_id: str, status: str = "scheduled", user: dict = Depends(require_department(["social"]))):
    """Move approved content to schedule queue"""
    from bson import ObjectId
    approval = await db.approvals.find_one({"_id": ObjectId(approval_id)})
    if approval and approval.get("status") == "approved":
        # Update the associated post status
        if approval.get("post_id"):
            await db.posts.update_one({"id": approval["post_id"]}, {"$set": {"status": status}})
        return {"success": True}
    return {"success": False, "error": "Approval not found or not approved"}

@app.post("/api/approvals/{approval_id}/resubmit")
async def resubmit_approval(approval_id: str, user: dict = Depends(require_department(["social"]))):
    """Resubmit rejected content for approval"""
    from bson import ObjectId
    await db.approvals.update_one(
        {"_id": ObjectId(approval_id)},
        {"$set": {"status": "pending", "reviewed_at": None, "reviewer_id": None, "feedback": ""}}
    )
    return {"success": True}

# ============== AUTOPILOT ENDPOINTS ==============
@app.post("/api/autopilot/generate")
async def autopilot_generate(data: dict, user: dict = Depends(require_department(["social"]))):
    """Generate multiple posts with autopilot"""
    try:
        from services.ai_service import generate_text
        
        industry = data.get("industry", "general")
        topics = data.get("topics", [])
        tone = data.get("tone", "professional")
        platforms = data.get("platforms", ["instagram"])
        posts_per_day = data.get("posts_per_day", 1)
        days = data.get("days", 7)
        
        total_posts = posts_per_day * days
        topics_str = ", ".join(topics) if topics else industry
        
        prompt = f"""Generate {total_posts} social media posts for a {industry} business.
        
Topics to cover: {topics_str}
Platforms: {", ".join(platforms)}
Tone: {tone}

Create varied content including: tips, behind-the-scenes, questions, testimonials, announcements.

Respond with JSON array:
[{{"day": 1, "platform": "instagram", "content": "post text", "type": "tip/question/announcement", "hashtags": ["tag1"]}}]"""
        
        result = await generate_text(prompt=prompt, system_message="You are a social media scheduler. Generate diverse, engaging posts. Always respond with valid JSON array.")
        
        if result.get("success"):
            response_text = result.get("text", "") or result.get("content", "")
            try:
                import json
                posts = json.loads(response_text)
                return {"success": True, "posts": posts, "total": len(posts)}
            except:
                # Generate placeholder posts
                posts = []
                for day in range(1, days + 1):
                    for _ in range(posts_per_day):
                        posts.append({
                            "day": day,
                            "platform": platforms[0] if platforms else "instagram",
                            "content": f"Day {day} content about {topics_str}",
                            "type": "post",
                            "hashtags": []
                        })
                return {"success": True, "posts": posts, "total": len(posts)}
        return {"success": False, "error": result.get("error", "Generation failed")}
    except Exception as e:
        logger.error(f"Autopilot generation error: {e}")
        return {"success": False, "error": str(e)}

# ============== PREDICT PERFORMANCE ==============
@app.post("/api/predict/performance")
async def predict_performance(data: dict, user: dict = Depends(require_department(["social"]))):
    """Predict post performance"""
    try:
        from services.ai_service import generate_text
        
        content = data.get("content", "")
        platform = data.get("platform", "instagram")
        
        prompt = f"""Analyze this {platform} post and predict its performance:

{content}

Respond with JSON:
{{
    "predicted_engagement": "low/medium/high",
    "estimated_reach": "100-500/500-2000/2000-10000/10000+",
    "best_posting_time": "9 AM - 11 AM",
    "strengths": ["list of strengths"],
    "weaknesses": ["areas to improve"],
    "score": 0-100,
    "viral_potential": "low/medium/high"
}}"""
        
        result = await generate_text(prompt=prompt, system_message="You are a social media analytics expert. Always respond with valid JSON.")
        
        if result.get("success"):
            response_text = result.get("text", "") or result.get("content", "")
            try:
                import json
                prediction = json.loads(response_text)
                return {"success": True, **prediction}
            except:
                return {
                    "success": True,
                    "predicted_engagement": "medium",
                    "estimated_reach": "500-2000",
                    "best_posting_time": "10 AM - 12 PM",
                    "strengths": ["Good content"],
                    "weaknesses": [],
                    "score": 70,
                    "viral_potential": "medium"
                }
        return {"success": False, "error": result.get("error", "Prediction failed")}
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return {"success": False, "error": str(e)}

# Register content studio router
app.include_router(content_studio_router, prefix="/api")

# ============== MICROSOFT EMAIL ENDPOINTS ==============
from services.microsoft_email import microsoft_email_service

# Default sender email for the organization
DEFAULT_SENDER_EMAIL = os.environ.get('MICROSOFT_SENDER_EMAIL', 'admin@sevora.com')

microsoft_router = APIRouter(prefix="/api/microsoft", tags=["Microsoft Email"])

@microsoft_router.get("/status")
async def get_microsoft_status():
    """Check Microsoft 365 connection status"""
    return await microsoft_email_service.get_connection_status()

@microsoft_router.get("/emails")
async def get_microsoft_emails(
    folder: str = "inbox",
    top: int = 50,
    skip: int = 0,
    search: str = None,
    user_email: str = None
):
    """Get emails from a specific folder"""
    sender = user_email or DEFAULT_SENDER_EMAIL
    return await microsoft_email_service.get_emails(
        user_email=sender,
        folder=folder,
        top=top,
        skip=skip,
        search_query=search
    )

@microsoft_router.get("/emails-for-contact")
async def get_emails_for_contact(
    email: str,
    additional_emails: str = None,
    top: int = 100,
    user_email: str = None
):
    """Get all emails exchanged with a specific contact"""
    sender = user_email or DEFAULT_SENDER_EMAIL
    contact_emails = [email]
    if additional_emails:
        contact_emails.extend(additional_emails.split(","))
    return await microsoft_email_service.get_emails_for_contact(
        user_email=sender,
        contact_emails=contact_emails,
        top=top
    )

@microsoft_router.get("/message/{message_id}")
async def get_microsoft_message(message_id: str, user_email: str = None):
    """Get full email message content"""
    sender = user_email or DEFAULT_SENDER_EMAIL
    return await microsoft_email_service.get_message(
        user_email=sender,
        message_id=message_id
    )

@microsoft_router.get("/message/{message_id}/attachments")
async def get_microsoft_attachments(message_id: str, user_email: str = None):
    """Get email attachments"""
    sender = user_email or DEFAULT_SENDER_EMAIL
    return await microsoft_email_service.get_attachments(
        user_email=sender,
        message_id=message_id
    )

class MicrosoftSendEmailRequest(BaseModel):
    to_recipients: List[str]
    subject: str
    body: str
    is_html: bool = True
    cc_recipients: Optional[List[str]] = None
    bcc_recipients: Optional[List[str]] = None
    reply_to_message_id: Optional[str] = None
    is_reply_all: bool = False

@microsoft_router.post("/send")
async def send_microsoft_email(request: MicrosoftSendEmailRequest, user_email: str = None):
    """Send a new email or reply to existing"""
    sender = user_email or DEFAULT_SENDER_EMAIL
    return await microsoft_email_service.send_email(
        sender_email=sender,
        to_recipients=request.to_recipients,
        subject=request.subject,
        body=request.body,
        is_html=request.is_html,
        cc_recipients=request.cc_recipients,
        bcc_recipients=request.bcc_recipients,
        reply_to_message_id=request.reply_to_message_id,
        is_reply_all=request.is_reply_all
    )

class MicrosoftForwardEmailRequest(BaseModel):
    to_recipients: List[str]
    comment: str = ""

@microsoft_router.post("/message/{message_id}/forward")
async def forward_microsoft_email(
    message_id: str,
    request: MicrosoftForwardEmailRequest,
    user_email: str = None
):
    """Forward an email"""
    sender = user_email or DEFAULT_SENDER_EMAIL
    return await microsoft_email_service.forward_email(
        sender_email=sender,
        message_id=message_id,
        to_recipients=request.to_recipients,
        comment=request.comment
    )

@microsoft_router.post("/message/{message_id}/read")
async def mark_microsoft_message_read(
    message_id: str,
    is_read: bool = True,
    user_email: str = None
):
    """Mark email as read or unread"""
    sender = user_email or DEFAULT_SENDER_EMAIL
    return await microsoft_email_service.mark_as_read(
        user_email=sender,
        message_id=message_id,
        is_read=is_read
    )

@microsoft_router.post("/message/{message_id}/flag")
async def set_microsoft_message_flag(
    message_id: str,
    flag_status: str = "flagged",
    user_email: str = None
):
    """Set email flag status (flagged, notFlagged, complete)"""
    sender = user_email or DEFAULT_SENDER_EMAIL
    return await microsoft_email_service.set_flag(
        user_email=sender,
        message_id=message_id,
        flag_status=flag_status
    )

@microsoft_router.post("/message/{message_id}/archive")
async def archive_microsoft_message(message_id: str, user_email: str = None):
    """Move email to archive folder"""
    sender = user_email or DEFAULT_SENDER_EMAIL
    return await microsoft_email_service.archive_message(
        user_email=sender,
        message_id=message_id
    )

@microsoft_router.delete("/message/{message_id}")
async def delete_microsoft_message(message_id: str, user_email: str = None):
    """Delete an email message"""
    sender = user_email or DEFAULT_SENDER_EMAIL
    return await microsoft_email_service.delete_message(
        user_email=sender,
        message_id=message_id
    )

# Register Microsoft router
app.include_router(microsoft_router)

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
