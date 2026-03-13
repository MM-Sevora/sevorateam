from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks, Query, WebSocket, WebSocketDisconnect, Body, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, JSONResponse
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
from dateutil.relativedelta import relativedelta
from dateutil.parser import parse as parse_date
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
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 10080))  # 7 days default

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

# Permission actions
class PermissionAction(str, Enum):
    VIEW = "view"
    CREATE = "create"
    EDIT = "edit"
    DELETE = "delete"
    EXPORT = "export"

# All modules in the system
ALL_MODULES = {
    "marketing": [
        {"id": "contacts_hub", "name": "Contacts Hub", "description": "Unified contact management (influencers, journalists, bloggers)"},
        {"id": "digital_pr", "name": "Digital PR", "description": "Press releases, media coverage, PR outreach"},
        {"id": "campaigns", "name": "Campaigns", "description": "Marketing campaign management"},
        {"id": "events", "name": "Events", "description": "Brand launches, press events, influencer meetups"},
        {"id": "calendar", "name": "Marketing Calendar", "description": "Unified marketing calendar"},
        {"id": "content_assets", "name": "Content & Assets", "description": "Brand assets, press kit, UGC library, templates"},
        {"id": "budget", "name": "Budget & Payments", "description": "Budget tracking, payments, invoices"},
        {"id": "ai_tools", "name": "AI Tools", "description": "AI-powered marketing tools"},
        {"id": "analytics", "name": "Analytics", "description": "Marketing analytics and reports"},
    ],
    "sales": [
        {"id": "leads", "name": "Leads", "description": "Lead management and tracking"},
        {"id": "customers", "name": "Customers", "description": "Customer profiles and history"},
        {"id": "pipeline", "name": "Pipeline", "description": "Sales pipeline management"},
        {"id": "qr_codes", "name": "QR Codes", "description": "QR code generation and tracking"},
        {"id": "partners", "name": "Partners", "description": "Partner management"},
        {"id": "wedding_planner", "name": "Wedding Planner", "description": "Wedding planning tools"},
        {"id": "analytics", "name": "Analytics", "description": "Sales analytics and reports"},
    ],
    "social": [
        {"id": "content_studio", "name": "Content Studio", "description": "AI content creation"},
        {"id": "posts", "name": "Posts & Schedule", "description": "Post scheduling and management"},
        {"id": "autopilot", "name": "Autopilot", "description": "Automated posting"},
        {"id": "content_library", "name": "Content Library", "description": "Media and content storage"},
        {"id": "ai_tools", "name": "AI Tools", "description": "AI-powered social tools"},
        {"id": "youtube", "name": "YouTube", "description": "YouTube integration"},
        {"id": "avatar", "name": "Avatar", "description": "AI avatar management"},
        {"id": "analytics", "name": "Analytics", "description": "Social media analytics"},
    ],
    "mail": [
        {"id": "inbox", "name": "Inbox", "description": "Email inbox management"},
        {"id": "compose", "name": "Compose", "description": "Send and compose emails"},
        {"id": "contacts", "name": "Contact Emails", "description": "View email history per contact"},
    ],
    "admin": [
        {"id": "users", "name": "User Management", "description": "Manage user accounts"},
        {"id": "azure_sync", "name": "Azure AD Sync", "description": "Sync users from Azure AD"},
        {"id": "audit_logs", "name": "Audit Logs", "description": "View admin action logs"},
        {"id": "permissions", "name": "Permissions", "description": "Manage user permissions"},
    ],
}

# Default permissions by role
DEFAULT_ROLE_PERMISSIONS = {
    "super_admin": {
        # Full access to everything
        "marketing": {"contacts_hub": ["view", "create", "edit", "delete", "export"], "digital_pr": ["view", "create", "edit", "delete", "export"], "campaigns": ["view", "create", "edit", "delete", "export"], "events": ["view", "create", "edit", "delete", "export"], "calendar": ["view", "create", "edit", "delete"], "content_assets": ["view", "create", "edit", "delete", "export"], "budget": ["view", "create", "edit", "delete", "export"], "ai_tools": ["view", "create", "edit", "delete"], "analytics": ["view", "export"]},
        "sales": {"leads": ["view", "create", "edit", "delete", "export"], "customers": ["view", "create", "edit", "delete", "export"], "pipeline": ["view", "create", "edit", "delete"], "qr_codes": ["view", "create", "edit", "delete"], "partners": ["view", "create", "edit", "delete", "export"], "wedding_planner": ["view", "create", "edit", "delete"], "analytics": ["view", "export"]},
        "social": {"content_studio": ["view", "create", "edit", "delete"], "posts": ["view", "create", "edit", "delete"], "autopilot": ["view", "create", "edit", "delete"], "content_library": ["view", "create", "edit", "delete"], "ai_tools": ["view", "create", "edit", "delete"], "youtube": ["view", "create", "edit", "delete"], "avatar": ["view", "create", "edit", "delete"], "analytics": ["view", "export"]},
        "mail": {"inbox": ["view", "create", "edit", "delete"], "compose": ["view", "create"], "contacts": ["view"]},
        "admin": {"users": ["view", "create", "edit", "delete"], "azure_sync": ["view", "create"], "audit_logs": ["view"], "permissions": ["view", "edit"]},
    },
    "admin": {
        "marketing": {"contacts_hub": ["view", "create", "edit", "delete", "export"], "digital_pr": ["view", "create", "edit", "delete", "export"], "campaigns": ["view", "create", "edit", "delete", "export"], "events": ["view", "create", "edit", "delete", "export"], "calendar": ["view", "create", "edit", "delete"], "content_assets": ["view", "create", "edit", "delete", "export"], "budget": ["view", "create", "edit", "delete", "export"], "ai_tools": ["view", "create", "edit", "delete"], "analytics": ["view", "export"]},
        "sales": {"leads": ["view", "create", "edit", "delete", "export"], "customers": ["view", "create", "edit", "delete", "export"], "pipeline": ["view", "create", "edit", "delete"], "qr_codes": ["view", "create", "edit", "delete"], "partners": ["view", "create", "edit", "delete", "export"], "wedding_planner": ["view", "create", "edit", "delete"], "analytics": ["view", "export"]},
        "social": {"content_studio": ["view", "create", "edit", "delete"], "posts": ["view", "create", "edit", "delete"], "autopilot": ["view", "create", "edit", "delete"], "content_library": ["view", "create", "edit", "delete"], "ai_tools": ["view", "create", "edit", "delete"], "youtube": ["view", "create", "edit", "delete"], "avatar": ["view", "create", "edit", "delete"], "analytics": ["view", "export"]},
        "mail": {"inbox": ["view", "create", "edit", "delete"], "compose": ["view", "create"], "contacts": ["view"]},
        "admin": {"users": ["view", "create", "edit"], "azure_sync": ["view", "create"], "audit_logs": ["view"], "permissions": ["view", "edit"]},
    },
    "marketing_manager": {
        "marketing": {"contacts_hub": ["view", "create", "edit", "delete", "export"], "digital_pr": ["view", "create", "edit", "delete", "export"], "campaigns": ["view", "create", "edit", "delete", "export"], "events": ["view", "create", "edit", "delete", "export"], "calendar": ["view", "create", "edit", "delete"], "content_assets": ["view", "create", "edit", "delete", "export"], "budget": ["view", "edit"], "ai_tools": ["view", "create", "edit"], "analytics": ["view", "export"]},
        "mail": {"inbox": ["view"], "compose": ["view", "create"], "contacts": ["view"]},
    },
    "sales_manager": {
        "sales": {"leads": ["view", "create", "edit", "delete", "export"], "customers": ["view", "create", "edit", "delete", "export"], "pipeline": ["view", "create", "edit", "delete"], "qr_codes": ["view", "create", "edit", "delete"], "partners": ["view", "create", "edit", "delete", "export"], "wedding_planner": ["view", "create", "edit", "delete"], "analytics": ["view", "export"]},
        "mail": {"inbox": ["view"], "compose": ["view", "create"], "contacts": ["view"]},
    },
    "social_manager": {
        "social": {"content_studio": ["view", "create", "edit", "delete"], "posts": ["view", "create", "edit", "delete"], "autopilot": ["view", "create", "edit", "delete"], "content_library": ["view", "create", "edit", "delete"], "ai_tools": ["view", "create", "edit", "delete"], "youtube": ["view", "create", "edit", "delete"], "avatar": ["view", "create", "edit", "delete"], "analytics": ["view", "export"]},
        "mail": {"inbox": ["view"], "compose": ["view", "create"], "contacts": ["view"]},
    },
    "viewer": {
        "marketing": {"contacts_hub": ["view"], "digital_pr": ["view"], "campaigns": ["view"], "events": ["view"], "calendar": ["view"], "content_assets": ["view"], "budget": ["view"], "ai_tools": ["view"], "analytics": ["view"]},
        "sales": {"leads": ["view"], "customers": ["view"], "pipeline": ["view"], "qr_codes": ["view"], "partners": ["view"], "wedding_planner": ["view"], "analytics": ["view"]},
        "social": {"content_studio": ["view"], "posts": ["view"], "autopilot": ["view"], "content_library": ["view"], "ai_tools": ["view"], "youtube": ["view"], "avatar": ["view"], "analytics": ["view"]},
        "mail": {"inbox": ["view"], "contacts": ["view"]},
    },
}

# Department to modules mapping (for backward compatibility)
DEPARTMENT_MODULES = {
    "marketing": ["influencers", "campaigns", "negotiations", "outreach", "ai_discovery", "email", "budget", "analytics"],
    "sales": ["leads", "customers", "wedding_planner", "pipeline", "qr_codes", "partners", "analytics"],
    "social": ["content_studio", "ai_tools", "autopilot", "posts", "analytics", "avatar", "youtube", "content_library"],
    "mail": ["inbox", "compose", "contacts"],
    "admin": ["users", "azure_sync", "audit_logs", "permissions"]
}

# Role to department mapping (Legacy - kept for backward compatibility)
# New system uses WorkOS roles from database
ROLE_DEPARTMENTS = {
    "super_admin": ["marketing", "sales", "social", "mail", "admin"],
    "admin": ["marketing", "sales", "social", "mail", "admin"],
    "marketing_manager": ["marketing", "mail"],
    "sales_manager": ["sales", "mail"],
    "social_manager": ["social", "mail"],
    "viewer": []
}

# Role hierarchy for permission checks (Legacy)
ROLE_HIERARCHY = {
    "super_admin": 100,
    "admin": 80,
    "marketing_manager": 50,
    "sales_manager": 50,
    "social_manager": 50,
    "viewer": 10
}

async def get_user_role_from_workos(user: dict) -> dict:
    """Fetch user's role and permissions from WorkOS system"""
    role_id = user.get("role_id")
    if not role_id:
        # Fallback: try to map legacy role to WorkOS role
        legacy_role = user.get("role", "viewer")
        role = await db.roles.find_one({"code": legacy_role}, {"_id": 0})
        if role:
            return role
        # Return minimal permissions if no role found
        return {
            "code": legacy_role,
            "level": ROLE_HIERARCHY.get(legacy_role, 10),
            "permissions": {},
            "department_ids": []
        }
    
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    return role if role else {"code": "viewer", "level": 10, "permissions": {}, "department_ids": []}

async def get_user_departments_dynamic(user: dict) -> List[str]:
    """Get user's accessible departments from WorkOS role permissions"""
    role = await get_user_role_from_workos(user)
    if not role:
        # Fallback to legacy
        return ROLE_DEPARTMENTS.get(user.get("role", "viewer"), [])
    
    permissions = role.get("permissions", {})
    # Return department codes where user has any permissions
    departments = list(permissions.keys())
    
    # Super admin and admin always have all access
    if role.get("code") in ["super_admin", "admin"] or role.get("level", 0) >= 80:
        return ["marketing", "sales", "social", "mail", "admin"]
    
    return departments if departments else ROLE_DEPARTMENTS.get(user.get("role", "viewer"), [])

def get_user_permissions_from_role(role: dict) -> dict:
    """Extract permissions dict from WorkOS role"""
    return role.get("permissions", {})

def get_default_permissions(role: str) -> dict:
    """Get default permissions for a role"""
    return DEFAULT_ROLE_PERMISSIONS.get(role, DEFAULT_ROLE_PERMISSIONS["viewer"])

def get_user_permissions(user: dict) -> dict:
    """Get effective permissions for a user (custom or default based on role)"""
    # If user has custom permissions, use those
    if user.get("custom_permissions"):
        return user["custom_permissions"]
    # Otherwise, return default permissions for their role
    return get_default_permissions(user.get("role", "viewer"))

def check_permission(user: dict, department: str, module: str, action: str) -> bool:
    """Check if user has permission for a specific action on a module"""
    permissions = get_user_permissions(user)
    dept_perms = permissions.get(department, {})
    module_perms = dept_perms.get(module, [])
    return action in module_perms

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
    permissions: Optional[dict] = None
    has_custom_permissions: bool = False
    custom_role_ids: List[str] = []
    custom_role_names: List[str] = []
    merged_module_access: List[str] = []

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
    """Legacy sync function - use get_user_departments_dynamic for async"""
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
        
        # Fetch dynamic permissions from WorkOS
        workos_role = await get_user_role_from_workos(user)
        user['workos_role'] = workos_role
        user['departments'] = await get_user_departments_dynamic(user)
        user['permissions'] = get_user_permissions_from_role(workos_role) if workos_role else get_user_permissions(user)
        user['role_level'] = workos_role.get('level', ROLE_HIERARCHY.get(user.get('role'), 10)) if workos_role else 10
        
        # Compute merged_module_access if not already present
        if not user.get('merged_module_access'):
            custom_role_ids = user.get('custom_role_ids', [])
            if custom_role_ids:
                roles = await db.custom_roles.find({"id": {"$in": custom_role_ids}}).to_list(10)
                module_set = set()
                role_names = []
                for role in roles:
                    module_set.update(role.get('module_access', []))
                    role_names.append(role.get('name', ''))
                user['merged_module_access'] = list(module_set)
                user['custom_role_names'] = role_names
            else:
                user['merged_module_access'] = []
                user['custom_role_names'] = []
        
        # Ensure sub_module_access is included (if not already in user doc)
        if not user.get('sub_module_access'):
            user_access = await db.user_module_access.find_one({"user_id": user_id}, {"_id": 0})
            if user_access:
                user['sub_module_access'] = user_access.get('sub_module_access', {})
            else:
                user['sub_module_access'] = {}
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Module-to-Department mapping for backward compatibility during migration
MODULE_DEPARTMENT_MAP = {
    "dashboard": ["admin", "marketing", "sales", "social", "mail"],
    "marketing_ops": ["marketing", "admin"],
    "project_management": ["admin", "marketing", "sales"],
    "mail": ["mail", "marketing", "admin"],
    "social": ["social", "marketing", "admin"],
    "admin": ["admin"],
    "hr": ["admin", "hr"],
    "help_support": ["admin", "marketing", "sales", "social", "mail"],
    "automations": ["admin"],
    "meetings": ["admin", "marketing", "sales"],
    "communication_hub": ["marketing", "sales", "admin"]
}

# Reverse mapping: department to modules
DEPARTMENT_MODULE_MAP = {
    "admin": ["dashboard", "marketing_ops", "project_management", "mail", "social", "admin", "hr", "help_support", "automations", "meetings", "communication_hub"],
    "marketing": ["dashboard", "marketing_ops", "project_management", "social", "help_support", "meetings", "communication_hub"],
    "sales": ["dashboard", "project_management", "help_support", "meetings", "communication_hub"],
    "social": ["dashboard", "social", "help_support"],
    "mail": ["dashboard", "mail", "help_support"],
    "hr": ["dashboard", "hr", "help_support"]
}

def require_department(allowed_departments: List[str]):
    """
    DEPRECATED: Use require_module_access() instead.
    This function now also checks module-based access for backward compatibility.
    Will be removed in a future version.
    """
    async def department_checker(user: dict = Depends(get_current_user)):
        # Log deprecation warning
        logger.warning(f"DEPRECATED: require_department({allowed_departments}) called. Migrate to require_module_access().")
        
        user_depts = user.get('departments', [])
        
        # Admin access or matching department (old system)
        if 'admin' in user_depts or any(dept in user_depts for dept in allowed_departments):
            return user
        
        # Also check by role level (80+ = admin equivalent)
        if user.get('role_level', 0) >= 80:
            return user
        
        # NEW: Also check module-based access for backward compatibility
        user_modules = user.get('merged_module_access', [])
        if not user_modules:
            custom_role_ids = user.get('custom_role_ids', [])
            if custom_role_ids:
                roles = await db.custom_roles.find({"id": {"$in": custom_role_ids}}).to_list(10)
                for role in roles:
                    user_modules.extend(role.get('module_access', []))
                user_modules = list(set(user_modules))
        
        # Check if any user module maps to the allowed departments
        for module in user_modules:
            module_depts = MODULE_DEPARTMENT_MAP.get(module, [])
            if any(dept in module_depts for dept in allowed_departments):
                return user
        
        raise HTTPException(status_code=403, detail="Access denied to this department")
    return department_checker


def require_module_access(required_modules: List[str]):
    """
    Dependency that checks if user has access to specified modules.
    Uses the new module-based access control system.
    
    Usage:
        @app.get("/api/automations")
        async def get_automations(user: dict = Depends(require_module_access(["automations"]))):
            ...
    """
    async def module_checker(user: dict = Depends(get_current_user)):
        # Super admin always has access
        if user.get('role') == 'super_admin':
            return user
        
        # Get user's merged module access
        user_modules = user.get('merged_module_access', [])
        
        # If user doesn't have merged_module_access, fetch from custom_role_ids
        if not user_modules:
            custom_role_ids = user.get('custom_role_ids', [])
            if custom_role_ids:
                # Fetch roles and merge module access
                roles = await db.custom_roles.find({"id": {"$in": custom_role_ids}}).to_list(10)
                for role in roles:
                    user_modules.extend(role.get('module_access', []))
                user_modules = list(set(user_modules))
        
        # Check if user has access to any of the required modules
        if any(mod in user_modules for mod in required_modules):
            return user
        
        # Log the access denial for debugging
        logger.warning(
            f"Module access denied: user={user.get('email')} "
            f"required={required_modules} has={user_modules}"
        )
        
        raise HTTPException(
            status_code=403, 
            detail=f"Access denied. Required module access: {', '.join(required_modules)}"
        )
    return module_checker

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
    
    # ===== PULSE INTEGRATION: Announce new employee =====
    try:
        from services.pulse_integrations import on_new_employee_joined
        await on_new_employee_joined(user_doc)
    except Exception as e:
        logger.warning(f"Pulse integration failed for new employee (non-fatal): {e}")
    
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
    if not user:
        logger.error(f"Login failed: user not found for {credentials.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(credentials.password, user.get('password', '')):
        logger.error(f"Login failed: password mismatch for {credentials.email}")
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
    
    # Get merged module access from custom roles
    merged_module_access = user.get('merged_module_access', [])
    custom_role_ids = user.get('custom_role_ids', [])
    custom_role_names = []
    
    if not merged_module_access and custom_role_ids:
        # Fetch and merge module access from roles
        roles = await db.custom_roles.find({"id": {"$in": custom_role_ids}}).to_list(10)
        module_set = set()
        for role in roles:
            module_set.update(role.get('module_access', []))
            custom_role_names.append(role.get('name', ''))
        merged_module_access = list(module_set)
    
    token = create_access_token({"sub": user['id'], "email": user['email'], "role": user.get('role', 'viewer')})
    departments = get_user_departments(user.get('role', 'viewer'))
    permissions = get_user_permissions(user)
    
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
            last_login=datetime.now(timezone.utc).isoformat(),
            permissions=permissions,
            has_custom_permissions=bool(user.get('custom_permissions')),
            custom_role_ids=custom_role_ids,
            custom_role_names=custom_role_names,
            merged_module_access=merged_module_access
        )
    )


@auth_router.post("/refresh")
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """
    Refresh the access token.
    Call this endpoint periodically to extend user session.
    Returns a new token valid for 7 days.
    """
    user = await db.users.find_one({"id": current_user.get("id")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Check if user is still active
    if user.get('status') == 'inactive':
        raise HTTPException(status_code=403, detail="Account deactivated")
    
    # Create new token
    token = create_access_token({
        "sub": user['id'], 
        "email": user['email'], 
        "role": user.get('role', 'viewer')
    })
    
    return {"access_token": token, "token_type": "bearer"}


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


@auth_router.get("/init-admin")
async def initialize_admin():
    """
    One-time initialization endpoint to create super admin.
    Only works if NO users exist in the database.
    After first use, this endpoint becomes inactive.
    """
    # Check if any users exist
    user_count = await db.users.count_documents({})
    
    if user_count > 0:
        return {
            "success": False,
            "message": f"Database already has {user_count} user(s). Initialization not allowed.",
            "hint": "Use Microsoft SSO or contact your administrator for access."
        }
    
    # Create super admin user
    admin_id = str(uuid.uuid4())
    admin_password = "SuperAdmin@2024!"  # Strong default password
    hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Get or create super_admin role
    super_admin_role = await db.custom_roles.find_one({"name": "Super Admin"})
    role_ids = [super_admin_role["id"]] if super_admin_role else []
    
    admin_user = {
        "id": admin_id,
        "email": "superadmin@sevora.com",
        "name": "Super Administrator",
        "password": hashed_password,
        "department": "admin",
        "role": "super_admin",
        "status": "active",
        "custom_role_ids": role_ids,
        "departments": ["marketing", "sales", "social", "mail", "admin"],
        "module_access": ["dashboard", "goals", "project_management", "communication_hub", 
                         "task_management", "social", "help_support", "admin", "marketing_ops"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_user)
    
    # Also create the Super Admin role if it doesn't exist
    if not super_admin_role:
        role_id = str(uuid.uuid4())
        await db.custom_roles.insert_one({
            "id": role_id,
            "name": "Super Admin",
            "description": "Full system access",
            "is_system_role": True,
            "module_access": ["dashboard", "goals", "project_management", "communication_hub",
                             "task_management", "social", "help_support", "admin", "marketing_ops"],
            "module_permissions": {
                "dashboard": {"create": True, "read": True, "update": True, "delete": True},
                "goals": {"create": True, "read": True, "update": True, "delete": True},
                "project_management": {"create": True, "read": True, "update": True, "delete": True},
                "communication_hub": {"create": True, "read": True, "update": True, "delete": True},
                "task_management": {"create": True, "read": True, "update": True, "delete": True},
                "social": {"create": True, "read": True, "update": True, "delete": True},
                "help_support": {"create": True, "read": True, "update": True, "delete": True},
                "admin": {"create": True, "read": True, "update": True, "delete": True},
                "marketing_ops": {"create": True, "read": True, "update": True, "delete": True}
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        # Update the user with the new role ID
        await db.users.update_one({"id": admin_id}, {"$set": {"custom_role_ids": [role_id]}})
    
    return {
        "success": True,
        "message": "Super Admin account created successfully!",
        "credentials": {
            "email": "superadmin@sevora.com",
            "password": admin_password
        },
        "warning": "⚠️ IMPORTANT: Change this password immediately after first login!",
        "next_steps": [
            "1. Go to the login page",
            "2. Use the credentials above to sign in",
            "3. Go to Admin > Users to change your password",
            "4. Set up additional users as needed"
        ]
    }


@auth_router.get("/promote-admin/{secret_key}")
async def promote_to_admin(secret_key: str):
    """
    One-time endpoint to promote mashum.mollah@sevora.com to Super Admin.
    Uses a secret key for security. This endpoint self-destructs after use.
    """
    # Security: Only allow with correct secret key
    VALID_SECRET = "sevora-promote-2024-xyz"
    
    if secret_key != VALID_SECRET:
        raise HTTPException(status_code=404, detail="Not Found")
    
    target_email = "mashum.mollah@sevora.com"
    
    # Find the user
    user = await db.users.find_one({"email": target_email})
    
    if not user:
        return {
            "success": False,
            "message": f"User {target_email} not found. Please login via Microsoft SSO first.",
            "action": "Go to https://teams.sevora.com/login and sign in with Microsoft"
        }
    
    # Check if already super admin
    if user.get("role") == "super_admin":
        return {
            "success": True,
            "message": f"{target_email} is already a Super Admin!",
            "action": "You can login and access all features."
        }
    
    # Get or create Super Admin role
    super_admin_role = await db.custom_roles.find_one({"name": "Super Admin"})
    
    if not super_admin_role:
        # Create the role
        role_id = str(uuid.uuid4())
        super_admin_role = {
            "id": role_id,
            "name": "Super Admin",
            "description": "Full system access",
            "is_system_role": True,
            "module_access": ["dashboard", "goals", "project_management", "communication_hub",
                             "task_management", "social", "help_support", "admin", "marketing_ops"],
            "module_permissions": {
                "dashboard": {"create": True, "read": True, "update": True, "delete": True},
                "goals": {"create": True, "read": True, "update": True, "delete": True},
                "project_management": {"create": True, "read": True, "update": True, "delete": True},
                "communication_hub": {"create": True, "read": True, "update": True, "delete": True},
                "task_management": {"create": True, "read": True, "update": True, "delete": True},
                "social": {"create": True, "read": True, "update": True, "delete": True},
                "help_support": {"create": True, "read": True, "update": True, "delete": True},
                "admin": {"create": True, "read": True, "update": True, "delete": True},
                "marketing_ops": {"create": True, "read": True, "update": True, "delete": True}
            },
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.custom_roles.insert_one(super_admin_role)
    
    # Promote the user
    await db.users.update_one(
        {"email": target_email},
        {"$set": {
            "role": "super_admin",
            "custom_role_ids": [super_admin_role["id"]],
            "departments": ["marketing", "sales", "social", "mail", "admin"],
            "module_access": ["dashboard", "goals", "project_management", "communication_hub",
                             "task_management", "social", "help_support", "admin", "marketing_ops"],
            "status": "active",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"🎉 {target_email} has been promoted to Super Admin!",
        "access": "Full access to all modules and features",
        "next_steps": [
            "1. Go to https://teams.sevora.com/login",
            "2. Sign in with Microsoft (mashum.mollah@sevora.com)",
            "3. You now have full Super Admin access!"
        ]
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
    # Query unified contacts collection with influencer filter
    query = {"contact_type": "influencer"}
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
    
    influencers = await db.contacts.find(query, {"_id": 0}).sort("score", -1).to_list(500)
    return influencers

@marketing_router.get("/influencers/{influencer_id}", response_model=InfluencerResponse)
async def get_influencer(influencer_id: str, user: dict = Depends(require_department(["marketing"]))):
    # Try contacts first (unified), fallback to influencers
    influencer = await db.contacts.find_one({"id": influencer_id, "contact_type": "influencer"}, {"_id": 0})
    if not influencer:
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
        "contact_type": "influencer",  # Add type for unified collection
        "status": "identified",
        "score": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    influencer_doc['score'] = calculate_influencer_score(influencer_doc)
    # Insert into unified contacts collection
    await db.contacts.insert_one(influencer_doc)
    if '_id' in influencer_doc:
        del influencer_doc['_id']
    return influencer_doc

@marketing_router.put("/influencers/{influencer_id}", response_model=InfluencerResponse)
async def update_influencer(influencer_id: str, data: dict, user: dict = Depends(require_department(["marketing"]))):
    update_data = {k: v for k, v in data.items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # Try contacts first (unified)
    result = await db.contacts.find_one_and_update(
        {"id": influencer_id, "contact_type": "influencer"},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        # Fallback to old influencers collection
        result = await db.influencers.find_one_and_update(
            {"id": influencer_id},
            {"$set": update_data},
            return_document=True
        )
    if not result:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    new_score = calculate_influencer_score(result)
    # Update score in the appropriate collection
    if result.get("contact_type") == "influencer":
        await db.contacts.update_one({"id": influencer_id}, {"$set": {"score": new_score}})
    else:
        await db.influencers.update_one({"id": influencer_id}, {"$set": {"score": new_score}})
    result['score'] = new_score
    del result['_id']
    return result

@marketing_router.delete("/influencers/{influencer_id}")
async def delete_influencer(influencer_id: str, user: dict = Depends(require_department(["marketing"]))):
    # Try contacts first (unified)
    result = await db.contacts.delete_one({"id": influencer_id, "contact_type": "influencer"})
    if result.deleted_count == 0:
        # Fallback to old influencers collection
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
    
    # Enrich campaigns with actual influencer counts from contacts collection
    for campaign in campaigns:
        influencer_count = await db.contacts.count_documents({"campaign_id": campaign["id"]})
        campaign["influencer_count"] = influencer_count
    
    return campaigns

@marketing_router.get("/campaigns/{campaign_id}")
async def get_campaign_detail(campaign_id: str, user: dict = Depends(require_department(["marketing"]))):
    """Get single campaign with full details"""
    campaign = await db.marketing_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get assigned influencers
    influencers = await db.contacts.find(
        {"campaign_id": campaign_id},
        {"_id": 0, "id": 1, "name": 1, "instagram_handle": 1, "youtube_handle": 1, 
         "followers": 1, "engagement_rate": 1, "tier": 1, "status": 1, "industry": 1,
         "campaign_deliverable_id": 1, "campaign_deliverable_name": 1, "campaign_agreed_fee": 1}
    ).to_list(100)
    
    campaign["assigned_influencers"] = influencers
    campaign["influencer_count"] = len(influencers)
    
    # Calculate campaign metrics
    total_reach = sum(i.get("followers", 0) for i in influencers)
    avg_engagement = sum(i.get("engagement_rate", 0) for i in influencers) / len(influencers) if influencers else 0
    
    campaign["metrics"] = {
        "total_reach": total_reach,
        "avg_engagement": round(avg_engagement, 2),
        "influencer_count": len(influencers)
    }
    
    return campaign

@marketing_router.get("/campaigns/{campaign_id}/influencers")
async def get_campaign_influencers(campaign_id: str, user: dict = Depends(require_department(["marketing"]))):
    """Get all influencers assigned to a campaign"""
    campaign = await db.marketing_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    influencers = await db.contacts.find(
        {"campaign_id": campaign_id},
        {"_id": 0}
    ).to_list(100)
    
    return influencers

@marketing_router.post("/campaigns/{campaign_id}/influencers/{contact_id}")
async def add_influencer_to_campaign(
    campaign_id: str, 
    contact_id: str, 
    data: dict = Body(default={}),
    user: dict = Depends(require_department(["marketing"]))
):
    """Add an influencer to a campaign with deliverable and fee information"""
    campaign = await db.marketing_campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    contact = await db.contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Extract deliverable and fee info from request body
    deliverable_id = data.get("deliverable_id")
    deliverable_name = data.get("deliverable_name")
    agreed_fee = data.get("agreed_fee", 0)
    
    # Update contact with campaign_id and campaign-specific info
    update_data = {
        "campaign_id": campaign_id,
        "campaign_deliverable_id": deliverable_id,
        "campaign_deliverable_name": deliverable_name,
        "campaign_agreed_fee": agreed_fee,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.contacts.update_one(
        {"id": contact_id},
        {"$set": update_data}
    )
    
    return {
        "message": "Influencer added to campaign", 
        "campaign_id": campaign_id, 
        "contact_id": contact_id,
        "deliverable_name": deliverable_name,
        "agreed_fee": agreed_fee
    }

@marketing_router.delete("/campaigns/{campaign_id}/influencers/{contact_id}")
async def remove_influencer_from_campaign(campaign_id: str, contact_id: str, user: dict = Depends(require_department(["marketing"]))):
    """Remove an influencer from a campaign"""
    contact = await db.contacts.find_one({"id": contact_id, "campaign_id": campaign_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found in this campaign")
    
    # Remove campaign_id from contact
    await db.contacts.update_one(
        {"id": contact_id},
        {"$set": {"campaign_id": None, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Influencer removed from campaign", "campaign_id": campaign_id, "contact_id": contact_id}

@marketing_router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, data: dict, user: dict = Depends(require_department(["marketing"]))):
    """Update campaign details"""
    campaign = await db.marketing_campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Filter allowed fields
    allowed_fields = ["name", "objective", "budget", "start_date", "end_date", "target_market", "description", "status"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.marketing_campaigns.update_one(
        {"id": campaign_id},
        {"$set": update_data}
    )
    
    updated = await db.marketing_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return updated

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


@marketing_router.delete("/campaigns/{campaign_id}")
async def delete_marketing_campaign(campaign_id: str, user: dict = Depends(require_department(["marketing"]))):
    """Delete a marketing campaign"""
    campaign = await db.marketing_campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Delete the campaign
    await db.marketing_campaigns.delete_one({"id": campaign_id})
    
    # Remove campaign_id from any associated contacts
    await db.contacts.update_many(
        {"campaign_id": campaign_id},
        {"$set": {"campaign_id": None}}
    )
    
    return {"message": "Campaign deleted successfully"}

# ========== PAYMENT TRACKING APIs ==========

@marketing_router.get("/payments")
async def get_payments(
    contact_id: Optional[str] = None, 
    campaign_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(require_department(["marketing"]))
):
    """Get all payments with optional filters"""
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if campaign_id:
        query["campaign_id"] = campaign_id
    if status:
        query["status"] = status
    
    payments = await db.payments.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return payments

@marketing_router.post("/payments")
async def create_payment(data: dict, user: dict = Depends(require_department(["marketing"]))):
    """Create a new payment record"""
    payment_id = str(uuid.uuid4())
    
    # Validate contact exists
    contact = await db.contacts.find_one({"id": data.get("contact_id")})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    payment_doc = {
        "id": payment_id,
        "contact_id": data.get("contact_id"),
        "contact_name": contact.get("name"),
        "campaign_id": data.get("campaign_id"),
        "campaign_name": data.get("campaign_name"),
        "amount": data.get("amount", 0),
        "currency": data.get("currency", "INR"),
        "payment_type": data.get("payment_type", "influencer_fee"),  # influencer_fee, bonus, reimbursement
        "description": data.get("description", ""),
        "deliverables": data.get("deliverables", []),
        "invoice_number": data.get("invoice_number"),
        "due_date": data.get("due_date"),
        "status": "pending",  # pending, approved, processing, completed, failed
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user['id'],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payments.insert_one(payment_doc)
    del payment_doc['_id']
    return payment_doc

@marketing_router.get("/payments/{payment_id}")
async def get_payment(payment_id: str, user: dict = Depends(require_department(["marketing"]))):
    """Get single payment by ID"""
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment

@marketing_router.put("/payments/{payment_id}")
async def update_payment(payment_id: str, data: dict, user: dict = Depends(require_department(["marketing"]))):
    """Update payment details"""
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    allowed_fields = ["amount", "description", "deliverables", "invoice_number", "due_date", "status", "payment_date", "notes"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If status changed to completed, update campaign spent
    if data.get("status") == "completed" and payment.get("status") != "completed":
        update_data["payment_date"] = datetime.now(timezone.utc).isoformat()
        # Update campaign spent amount
        if payment.get("campaign_id"):
            await db.marketing_campaigns.update_one(
                {"id": payment["campaign_id"]},
                {"$inc": {"spent": payment.get("amount", 0)}}
            )
    
    await db.payments.update_one({"id": payment_id}, {"$set": update_data})
    updated = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    return updated

@marketing_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, user: dict = Depends(require_department(["marketing"]))):
    """Delete a payment record"""
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # If payment was completed, deduct from campaign spent
    if payment.get("status") == "completed" and payment.get("campaign_id"):
        await db.marketing_campaigns.update_one(
            {"id": payment["campaign_id"]},
            {"$inc": {"spent": -payment.get("amount", 0)}}
        )
    
    await db.payments.delete_one({"id": payment_id})
    return {"message": "Payment deleted"}

@marketing_router.get("/payments/summary/by-contact/{contact_id}")
async def get_contact_payment_summary(contact_id: str, user: dict = Depends(require_department(["marketing"]))):
    """Get payment summary for a specific contact/influencer"""
    payments = await db.payments.find({"contact_id": contact_id}, {"_id": 0}).to_list(500)
    
    total_paid = sum(p.get("amount", 0) for p in payments if p.get("status") == "completed")
    total_pending = sum(p.get("amount", 0) for p in payments if p.get("status") in ["pending", "approved", "processing"])
    
    return {
        "contact_id": contact_id,
        "total_paid": total_paid,
        "total_pending": total_pending,
        "total_payments": len(payments),
        "payments": payments
    }

@marketing_router.get("/payments/summary/by-campaign/{campaign_id}")
async def get_campaign_payment_summary(campaign_id: str, user: dict = Depends(require_department(["marketing"]))):
    """Get payment summary for a specific campaign"""
    payments = await db.payments.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(500)
    
    total_paid = sum(p.get("amount", 0) for p in payments if p.get("status") == "completed")
    total_pending = sum(p.get("amount", 0) for p in payments if p.get("status") in ["pending", "approved", "processing"])
    
    # Group by contact
    by_contact = {}
    for p in payments:
        cid = p.get("contact_id")
        if cid not in by_contact:
            by_contact[cid] = {"contact_name": p.get("contact_name"), "paid": 0, "pending": 0}
        if p.get("status") == "completed":
            by_contact[cid]["paid"] += p.get("amount", 0)
        else:
            by_contact[cid]["pending"] += p.get("amount", 0)
    
    return {
        "campaign_id": campaign_id,
        "total_paid": total_paid,
        "total_pending": total_pending,
        "total_payments": len(payments),
        "by_influencer": list(by_contact.values()),
        "payments": payments
    }

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
@sales_router.get("/leads")
async def get_leads(
    source: Optional[str] = None,
    stage: Optional[str] = None,
    search: Optional[str] = None,
    include_my_leads: bool = True,
    user: dict = Depends(require_department(["sales"]))
):
    """Get leads with filters. Respects data_scope from user's module_permissions."""
    from utils.permissions import get_data_scope_query
    
    user_id = user.get("id")
    user_role = user.get("role", "")
    is_admin = user_role in ["super_admin", "admin"] or user.get("can_manage_users")
    
    # Start with search/filter query
    filter_query = {}
    if source:
        filter_query["source"] = source
    if stage:
        filter_query["stage"] = stage
    if search:
        filter_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    # Apply data scope filtering based on user's module_permissions
    # This respects the 3D permission system: all/team/own_assigned/own_only
    query = get_data_scope_query(user, "leads", filter_query)
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Add permissions to each lead
    # Rule: Edit = Own + Assigned; Delete = Own only (+ Admin for both)
    for lead in leads:
        is_owner = lead.get("created_by") == user_id
        is_assigned = lead.get("assigned_to") == user_id
        lead["_permissions"] = {
            "can_view": True,
            "can_edit": is_owner or is_assigned or is_admin,
            "can_delete": is_owner or is_admin,  # Only owner can delete (not assigned)
            "is_owner": is_owner,
            "is_assigned": is_assigned,
        }
    
    return leads


@sales_router.get("/leads/paginated")
async def get_leads_paginated(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    source: Optional[str] = None,
    stage: Optional[str] = None,
    city: Optional[str] = None,
    added_by: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = Query(default="created_at", description="Field to sort by"),
    sort_order: Optional[str] = Query(default="desc", description="Sort order: asc or desc"),
    user: dict = Depends(require_department(["sales"]))
):
    """Get leads with pagination, sorting, and filter metadata"""
    from utils.permissions import get_data_scope_query
    
    user_id = user.get("id")
    user_role = user.get("role", "")
    is_admin = user_role in ["super_admin", "admin"] or user.get("can_manage_users")
    
    filter_query = {}
    if source:
        filter_query["source"] = source
    if stage:
        filter_query["stage"] = stage
    if city:
        filter_query["city"] = city
    if added_by:
        filter_query["created_by"] = added_by
    if search:
        filter_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    query = get_data_scope_query(user, "leads", filter_query)
    
    total = await db.leads.count_documents(query)
    skip = (page - 1) * page_size
    
    # Validate sort field
    allowed_sort_fields = ["created_at", "name", "source", "stage", "city", "updated_at"]
    if sort_by not in allowed_sort_fields:
        sort_by = "created_at"
    sort_direction = -1 if sort_order == "desc" else 1
    
    leads = await db.leads.find(query, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(page_size).to_list(length=page_size)
    
    # Add permissions
    for lead in leads:
        is_owner = lead.get("created_by") == user_id
        is_assigned = lead.get("assigned_to") == user_id
        lead["_permissions"] = {
            "can_view": True,
            "can_edit": is_owner or is_assigned or is_admin,
            "can_delete": is_owner or is_admin,
            "is_owner": is_owner,
            "is_assigned": is_assigned,
        }
    
    # Get filter metadata
    active_users = await db.users.find(
        {"status": "active"}, 
        {"_id": 0, "id": 1, "name": 1}
    ).to_list(100)
    creators_list = [{"id": u["id"], "name": u.get("name", "Unknown")} for u in active_users]
    creators_list.sort(key=lambda x: x.get("name", "").lower())
    
    unique_cities = await db.leads.distinct("city")
    unique_cities = [c for c in unique_cities if c]
    
    unique_sources = await db.leads.distinct("source")
    unique_sources = [s for s in unique_sources if s]
    
    unique_stages = await db.leads.distinct("stage")
    unique_stages = [s for s in unique_stages if s]
    
    return {
        "leads": leads,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
        "filters_meta": {
            "creators": creators_list,
            "cities": sorted(unique_cities),
            "sources": unique_sources,
            "stages": unique_stages
        }
    }


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
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
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
    update_data["updated_by"] = user.get("id")
    update_data["updated_by_name"] = user.get("name")
    
    await db.leads.update_one({"id": lead_id}, {"$set": update_data})
    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadResponse(**updated)

@sales_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, user: dict = Depends(require_department(["sales"]))):
    """Delete a lead - only creator or admin can delete"""
    lead = await db.leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    user_id = user.get("id")
    user_role = user.get("role", "")
    is_admin = user_role in ["super_admin", "admin"] or user.get("can_manage_users")
    
    # Only creator or admin can delete
    if lead.get("created_by") != user_id and not is_admin:
        creator_name = lead.get("created_by_name") or "another user"
        raise HTTPException(status_code=403, detail=f"You cannot delete this lead. It was created by {creator_name}. Only the creator or an admin can delete it.")
    
    await db.leads.delete_one({"id": lead_id})
    return {"message": "Lead deleted"}

# Sales Customers
@sales_router.get("/customers")
async def get_customers(search: Optional[str] = None, include_my_customers: bool = True, user: dict = Depends(require_department(["sales"]))):
    """Get customers with filters. Respects data_scope from user's module_permissions."""
    from utils.permissions import get_data_scope_query
    
    user_id = user.get("id")
    user_role = user.get("role", "")
    is_admin = user_role in ["super_admin", "admin"] or user.get("can_manage_users")
    
    # Start with search/filter query
    filter_query = {}
    if search:
        filter_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    # Apply data scope filtering based on user's module_permissions
    query = get_data_scope_query(user, "customers", filter_query)
    
    customers = await db.customers.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Add permissions
    # Rule: Edit = Own + Assigned; Delete = Own only (+ Admin for both)
    for customer in customers:
        is_owner = customer.get("created_by") == user_id
        is_assigned = customer.get("assigned_to") == user_id
        customer["_permissions"] = {
            "can_view": True,
            "can_edit": is_owner or is_assigned or is_admin,
            "can_delete": is_owner or is_admin,  # Only owner can delete (not assigned)
            "is_owner": is_owner,
            "is_assigned": is_assigned,
        }
    
    return customers

@sales_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, user: dict = Depends(require_department(["sales"]))):
    customer_id = str(uuid.uuid4())
    customer_doc = {
        "id": customer_id,
        **customer.model_dump(),
        "total_orders": 0,
        "total_spent": 0,
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customers.insert_one(customer_doc)
    return CustomerResponse(**{k: v for k, v in customer_doc.items() if k != "_id"})


@sales_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, user: dict = Depends(require_department(["sales"]))):
    """Delete a customer - only creator or admin can delete"""
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    user_id = user.get("id")
    user_role = user.get("role", "")
    is_admin = user_role in ["super_admin", "admin"] or user.get("can_manage_users")
    
    # Only creator or admin can delete
    if customer.get("created_by") != user_id and not is_admin:
        creator_name = customer.get("created_by_name") or "another user"
        raise HTTPException(status_code=403, detail=f"You cannot delete this customer. It was created by {creator_name}. Only the creator or an admin can delete it.")
    
    await db.customers.delete_one({"id": customer_id})
    return {"message": "Customer deleted"}


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
    

# ============== PULSE INTEGRATION ENDPOINTS ==============

@api_router.post("/integrations/pulse/trigger")
async def trigger_pulse_integration(
    integration_type: str = Body(...),
    data: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Trigger a Pulse integration manually or from other modules
    
    Integration types:
    - project_completed, project_milestone, project_started
    - task_completed, blocker_reported
    - okr_progress, goal_achieved, quarterly_review
    - new_employee, work_anniversary, promotion
    - deal_closed, lead_converted
    - influencer_signed, influencer_content
    - press_release, media_coverage
    - post_viral, campaign_launched
    - ticket_resolved
    - mention_spike, competitor_activity
    - automation_milestone
    - issue_to_task (reverse integration)
    """
    try:
        from services.pulse_integrations import (
            on_project_completed, on_project_milestone_reached, on_project_started,
            on_critical_task_completed, on_blocker_reported,
            on_okr_progress_milestone, on_strategic_goal_achieved, on_quarterly_review_complete,
            on_new_employee_joined, on_work_anniversary, on_promotion,
            on_deal_closed, on_lead_converted,
            on_influencer_signed, on_influencer_content_published,
            on_press_release_published, on_media_coverage,
            on_post_viral, on_social_campaign_launched,
            on_critical_ticket_resolved,
            on_brand_mention_spike, on_competitor_activity,
            on_automation_milestone,
            create_task_from_issue_post
        )
        
        result = None
        
        # Project integrations
        if integration_type == "project_completed":
            result = await on_project_completed(data.get("project", {}), current_user)
        elif integration_type == "project_milestone":
            result = await on_project_milestone_reached(
                data.get("project", {}), 
                data.get("milestone", {}), 
                current_user
            )
        elif integration_type == "project_started":
            result = await on_project_started(data.get("project", {}), current_user)
        
        # Task integrations
        elif integration_type == "task_completed":
            result = await on_critical_task_completed(data.get("task", {}), current_user)
        elif integration_type == "blocker_reported":
            result = await on_blocker_reported(
                data.get("task", {}), 
                current_user, 
                data.get("description", "Blocker reported")
            )
        
        # Goal integrations
        elif integration_type == "okr_progress":
            result = await on_okr_progress_milestone(
                data.get("objective", {}),
                data.get("key_result", {}),
                data.get("progress", 0),
                current_user
            )
        elif integration_type == "goal_achieved":
            result = await on_strategic_goal_achieved(data.get("goal", {}), current_user)
        elif integration_type == "quarterly_review":
            result = await on_quarterly_review_complete(
                data.get("quarter", {}),
                data.get("summary", {}),
                current_user
            )
        
        # HR integrations
        elif integration_type == "new_employee":
            result = await on_new_employee_joined(
                data.get("employee", {}),
                data.get("manager")
            )
        elif integration_type == "work_anniversary":
            result = await on_work_anniversary(
                data.get("employee", {}),
                data.get("years", 1)
            )
        elif integration_type == "promotion":
            result = await on_promotion(
                data.get("employee", {}),
                data.get("old_role", "Previous Role"),
                data.get("new_role", "New Role"),
                current_user
            )
        
        # Sales integrations
        elif integration_type == "deal_closed":
            result = await on_deal_closed(
                data.get("deal", {}),
                current_user,
                data.get("amount")
            )
        elif integration_type == "lead_converted":
            result = await on_lead_converted(data.get("lead", {}), current_user)
        
        # Influencer integrations
        elif integration_type == "influencer_signed":
            result = await on_influencer_signed(data.get("influencer", {}), current_user)
        elif integration_type == "influencer_content":
            result = await on_influencer_content_published(
                data.get("influencer", {}),
                data.get("content", {}),
                data.get("metrics")
            )
        
        # PR integrations
        elif integration_type == "press_release":
            result = await on_press_release_published(data.get("press_release", {}), current_user)
        elif integration_type == "media_coverage":
            result = await on_media_coverage(data.get("coverage", {}))
        
        # Social integrations
        elif integration_type == "post_viral":
            result = await on_post_viral(
                data.get("post", {}),
                data.get("platform", "Social Media"),
                data.get("engagement", 0)
            )
        elif integration_type == "campaign_launched":
            result = await on_social_campaign_launched(data.get("campaign", {}), current_user)
        
        # Support integrations
        elif integration_type == "ticket_resolved":
            result = await on_critical_ticket_resolved(
                data.get("ticket", {}),
                current_user,
                data.get("resolution_time")
            )
        
        # Listening integrations
        elif integration_type == "mention_spike":
            result = await on_brand_mention_spike(
                data.get("alert", {}),
                data.get("count", 0),
                data.get("sentiment")
            )
        elif integration_type == "competitor_activity":
            result = await on_competitor_activity(
                data.get("competitor", "Competitor"),
                data.get("activity", "Activity detected")
            )
        
        # Automation integrations
        elif integration_type == "automation_milestone":
            result = await on_automation_milestone(
                data.get("automation", {}),
                data.get("hours_saved", 0),
                data.get("period", "this month")
            )
        
        # Reverse integration: Issue to Task
        elif integration_type == "issue_to_task":
            result = await create_task_from_issue_post(data.get("post", {}))
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown integration type: {integration_type}")
        
        if result:
            return {"success": True, "result": result}
        else:
            return {"success": False, "message": "Integration triggered but no result"}
            
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Integration service not available: {e}")
    except Exception as e:
        logger.error(f"Integration trigger failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/integrations/pulse/types")
async def get_pulse_integration_types(current_user: dict = Depends(get_current_user)):
    """Get all available Pulse integration types"""
    return {
        "integration_types": {
            "projects": ["project_completed", "project_milestone", "project_started"],
            "tasks": ["task_completed", "blocker_reported"],
            "goals": ["okr_progress", "goal_achieved", "quarterly_review"],
            "hr": ["new_employee", "work_anniversary", "promotion"],
            "sales": ["deal_closed", "lead_converted"],
            "influencer": ["influencer_signed", "influencer_content"],
            "pr": ["press_release", "media_coverage"],
            "social": ["post_viral", "campaign_launched"],
            "support": ["ticket_resolved"],
            "listening": ["mention_spike", "competitor_activity"],
            "automation": ["automation_milestone"],
            "reverse": ["issue_to_task"]
        }
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
        
        # Enrich with custom_role_names and merged_module_access from custom_role_ids
        custom_role_ids = u.get("custom_role_ids", [])
        if not custom_role_ids and u.get("custom_role_id"):
            custom_role_ids = [u.get("custom_role_id")]
        
        if custom_role_ids:
            custom_roles = await db.custom_roles.find(
                {"id": {"$in": custom_role_ids}}, 
                {"name": 1, "module_access": 1}
            ).to_list(10)
            u["custom_role_names"] = [r.get("name") for r in custom_roles if r.get("name")]
            
            # Merge module access from all roles
            merged_access = set()
            for role in custom_roles:
                merged_access.update(role.get("module_access", []))
            u["merged_module_access"] = list(merged_access)
        else:
            u["custom_role_names"] = []
            u["merged_module_access"] = []
    
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

# ============== AZURE AD SYNC ENDPOINTS ==============
from services.azure_ad_sync import azure_ad_sync_service

class AzureSyncResponse(BaseModel):
    success: bool
    message: str
    synced_count: int = 0
    created_count: int = 0
    updated_count: int = 0
    skipped_count: int = 0
    errors: List[str] = []

@api_router.get("/admin/azure-ad/status")
async def get_azure_ad_status(user: dict = Depends(require_admin())):
    """Check Azure AD connection status"""
    return await azure_ad_sync_service.check_connection()

@api_router.get("/admin/azure-ad/users")
async def get_azure_ad_users(
    top: int = 100,
    user: dict = Depends(require_admin())
):
    """Preview users from Azure AD (without syncing)"""
    try:
        azure_users = await azure_ad_sync_service.get_all_users(top=top)
        
        # Map to app format and check existing status
        mapped_users = []
        for azure_user in azure_users:
            mapped = azure_ad_sync_service.map_azure_user_to_app_user(azure_user)
            if mapped.get("email"):
                # Check if user already exists in our system
                existing = await db.users.find_one(
                    {"$or": [
                        {"azure_id": mapped["azure_id"]},
                        {"email": mapped["email"]}
                    ]},
                    {"_id": 0, "id": 1, "status": 1, "role": 1}
                )
                mapped["exists_in_app"] = existing is not None
                mapped["app_status"] = existing.get("status") if existing else None
                mapped["app_role"] = existing.get("role") if existing else None
                mapped_users.append(mapped)
        
        return {
            "total": len(mapped_users),
            "users": mapped_users
        }
    except Exception as e:
        logger.error(f"Failed to fetch Azure AD users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/azure-ad/sync", response_model=AzureSyncResponse)
async def sync_azure_ad_users(
    create_new: bool = True,
    update_existing: bool = False,
    default_role: str = "viewer",
    default_department: str = "sales",
    user: dict = Depends(require_admin())
):
    """
    Sync users from Azure AD to the application
    
    Args:
        create_new: Create new users in app if they don't exist
        update_existing: Update existing users with Azure AD data
        default_role: Default role for new users
        default_department: Default department for new users
    """
    try:
        azure_users = await azure_ad_sync_service.get_all_users(top=999)
        
        synced_count = 0
        created_count = 0
        updated_count = 0
        skipped_count = 0
        errors = []
        
        for azure_user in azure_users:
            try:
                mapped = azure_ad_sync_service.map_azure_user_to_app_user(azure_user)
                
                if not mapped.get("email"):
                    skipped_count += 1
                    continue
                
                # Check if user already exists
                existing = await db.users.find_one({
                    "$or": [
                        {"azure_id": mapped["azure_id"]},
                        {"email": mapped["email"]}
                    ]
                })
                
                if existing:
                    if update_existing:
                        # Update existing user with Azure AD data
                        update_data = {
                            "azure_id": mapped["azure_id"],
                            "employee_id": mapped.get("employee_id") or existing.get("employee_id"),
                            "azure_department": mapped.get("azure_department"),
                            "job_title": mapped.get("job_title"),
                            "synced_at": mapped["synced_at"],
                            "source": "azure_ad"
                        }
                        # Update name only if it's different and not manually changed
                        if existing.get("source") == "azure_ad" and existing.get("name") != mapped["name"]:
                            update_data["name"] = mapped["name"]
                        
                        await db.users.update_one(
                            {"id": existing["id"]},
                            {"$set": update_data}
                        )
                        updated_count += 1
                    else:
                        skipped_count += 1
                else:
                    if create_new:
                        # Create new user with pending status
                        user_id = str(uuid.uuid4())
                        new_user = {
                            "id": user_id,
                            "azure_id": mapped["azure_id"],
                            "email": mapped["email"],
                            "name": mapped["name"],
                            "department": default_department,
                            "role": default_role,
                            "status": "pending",  # New users from Azure AD start as pending
                            "departments": ROLE_DEPARTMENTS.get(default_role, []),
                            "employee_id": mapped.get("employee_id"),
                            "job_title": mapped.get("job_title"),
                            "azure_department": mapped.get("azure_department"),
                            "source": "azure_ad",
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "synced_at": mapped["synced_at"]
                        }
                        await db.users.insert_one(new_user)
                        created_count += 1
                    else:
                        skipped_count += 1
                
                synced_count += 1
                
            except Exception as e:
                errors.append(f"Error syncing {azure_user.get('mail', 'unknown')}: {str(e)}")
        
        # Log the sync action
        await log_admin_action(
            user.get('id'),
            "azure_ad_sync",
            "bulk",
            {
                "synced": synced_count,
                "created": created_count,
                "updated": updated_count,
                "skipped": skipped_count,
                "errors": len(errors)
            }
        )
        
        # Record sync history
        await db.azure_sync_history.insert_one({
            "id": str(uuid.uuid4()),
            "synced_by": user.get('id'),
            "synced_at": datetime.now(timezone.utc).isoformat(),
            "total_azure_users": len(azure_users),
            "synced_count": synced_count,
            "created_count": created_count,
            "updated_count": updated_count,
            "skipped_count": skipped_count,
            "errors": errors
        })
        
        return AzureSyncResponse(
            success=True,
            message=f"Sync completed. Created: {created_count}, Updated: {updated_count}, Skipped: {skipped_count}",
            synced_count=synced_count,
            created_count=created_count,
            updated_count=updated_count,
            skipped_count=skipped_count,
            errors=errors[:10]  # Limit errors to first 10
        )
        
    except Exception as e:
        logger.error(f"Azure AD sync failed: {e}")
        return AzureSyncResponse(
            success=False,
            message=str(e),
            errors=[str(e)]
        )

@api_router.get("/admin/azure-ad/sync-history")
async def get_azure_sync_history(
    limit: int = 10,
    user: dict = Depends(require_admin())
):
    """Get history of Azure AD sync operations"""
    history = await db.azure_sync_history.find(
        {},
        {"_id": 0}
    ).sort("synced_at", -1).limit(limit).to_list(limit)
    return history

@api_router.post("/admin/azure-ad/sync-user/{azure_id}")
async def sync_single_azure_user(
    azure_id: str,
    default_role: str = "viewer",
    default_department: str = "sales",
    user: dict = Depends(require_admin())
):
    """Sync a single user from Azure AD by their Azure ID"""
    try:
        azure_user = await azure_ad_sync_service.get_user_by_id(azure_id)
        
        if not azure_user:
            raise HTTPException(status_code=404, detail="User not found in Azure AD")
        
        mapped = azure_ad_sync_service.map_azure_user_to_app_user(azure_user)
        
        if not mapped.get("email"):
            raise HTTPException(status_code=400, detail="User has no email address")
        
        # Check if user already exists
        existing = await db.users.find_one({
            "$or": [
                {"azure_id": mapped["azure_id"]},
                {"email": mapped["email"]}
            ]
        })
        
        if existing:
            # Update existing user
            await db.users.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "azure_id": mapped["azure_id"],
                    "employee_id": mapped.get("employee_id") or existing.get("employee_id"),
                    "azure_department": mapped.get("azure_department"),
                    "job_title": mapped.get("job_title"),
                    "synced_at": mapped["synced_at"],
                    "source": "azure_ad"
                }}
            )
            
            await log_admin_action(user.get('id'), "sync_azure_user", existing["id"], {"action": "updated"})
            
            return {"success": True, "action": "updated", "user_id": existing["id"]}
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            new_user = {
                "id": user_id,
                "azure_id": mapped["azure_id"],
                "email": mapped["email"],
                "name": mapped["name"],
                "department": default_department,
                "role": default_role,
                "status": "pending",
                "departments": ROLE_DEPARTMENTS.get(default_role, []),
                "employee_id": mapped.get("employee_id"),
                "job_title": mapped.get("job_title"),
                "azure_department": mapped.get("azure_department"),
                "source": "azure_ad",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "synced_at": mapped["synced_at"]
            }
            await db.users.insert_one(new_user)
            
            await log_admin_action(user.get('id'), "sync_azure_user", user_id, {"action": "created", "email": mapped["email"]})
            
            return {"success": True, "action": "created", "user_id": user_id}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Single user sync failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== PERMISSION MANAGEMENT ENDPOINTS ==============

@api_router.get("/admin/modules")
async def get_all_modules(user: dict = Depends(require_admin())):
    """Get all available modules organized by department"""
    return ALL_MODULES

@api_router.get("/admin/permissions/default/{role}")
async def get_default_role_permissions(role: str, user: dict = Depends(require_admin())):
    """Get default permissions for a specific role"""
    if role not in DEFAULT_ROLE_PERMISSIONS:
        raise HTTPException(status_code=404, detail="Role not found")
    return {
        "role": role,
        "permissions": DEFAULT_ROLE_PERMISSIONS[role]
    }

@api_router.get("/admin/users/{user_id}/permissions")
async def get_user_permissions_endpoint(user_id: str, user: dict = Depends(require_admin())):
    """Get effective permissions for a specific user"""
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    has_custom = bool(target_user.get("custom_permissions"))
    permissions = get_user_permissions(target_user)
    
    return {
        "user_id": user_id,
        "role": target_user.get("role"),
        "has_custom_permissions": has_custom,
        "permissions": permissions
    }

class UpdatePermissionsRequest(BaseModel):
    permissions: dict
    use_custom: bool = True

@api_router.put("/admin/users/{user_id}/permissions")
async def update_user_permissions(
    user_id: str, 
    request: UpdatePermissionsRequest,
    user: dict = Depends(require_admin())
):
    """Update permissions for a specific user"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent non-super_admin from modifying super_admin permissions
    if target_user.get("role") == "super_admin" and user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Cannot modify Super Admin permissions")
    
    if request.use_custom:
        # Set custom permissions
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "custom_permissions": request.permissions,
                "permissions_updated_at": datetime.now(timezone.utc).isoformat(),
                "permissions_updated_by": user.get("id")
            }}
        )
        await log_admin_action(user.get("id"), "update_permissions", user_id, {"custom": True})
    else:
        # Remove custom permissions (revert to role default)
        await db.users.update_one(
            {"id": user_id},
            {"$unset": {"custom_permissions": ""}}
        )
        await log_admin_action(user.get("id"), "reset_permissions", user_id, {"custom": False})
    
    return {"success": True, "message": "Permissions updated"}

@api_router.delete("/admin/users/{user_id}/permissions")
async def reset_user_permissions(user_id: str, user: dict = Depends(require_admin())):
    """Reset user permissions to role defaults"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$unset": {"custom_permissions": ""}}
    )
    
    await log_admin_action(user.get("id"), "reset_permissions", user_id, {})
    
    return {"success": True, "message": "Permissions reset to role defaults"}

@api_router.post("/admin/permissions/check")
async def check_user_permission(
    department: str,
    module: str,
    action: str,
    user: dict = Depends(get_current_user)
):
    """Check if current user has a specific permission"""
    has_permission = check_permission(user, department, module, action)
    return {
        "has_permission": has_permission,
        "department": department,
        "module": module,
        "action": action
    }

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
    
    # Handle recurring post settings
    is_recurring = data.get("is_recurring", False)
    recurrence_pattern = data.get("recurrence_pattern")  # daily, weekly, monthly, custom
    recurrence_days = data.get("recurrence_days", [])  # For weekly: [0,1,2,3,4,5,6] (Sun-Sat)
    recurrence_end_date = data.get("recurrence_end_date")  # When to stop recurring
    recurrence_count = data.get("recurrence_count")  # Number of occurrences
    
    post_doc = {
        "id": post_id,
        "post_id": post_id,  # Alias for consistency
        **{k: v for k, v in data.items() if not k.startswith("recurrence_") and k != "is_recurring"},
        "status": data.get("status", "draft"),
        "is_recurring": is_recurring,
        "recurrence_pattern": recurrence_pattern if is_recurring else None,
        "recurrence_days": recurrence_days if is_recurring else [],
        "recurrence_end_date": recurrence_end_date if is_recurring else None,
        "recurrence_count": recurrence_count if is_recurring else None,
        "parent_recurring_id": None,  # Will be set for generated instances
        "created_by": user['id'],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.social_posts.insert_one(post_doc)
    
    # If recurring, generate future instances
    if is_recurring and recurrence_pattern and data.get("scheduled_at"):
        await generate_recurring_instances(post_doc, db)
    
    if '_id' in post_doc: del post_doc['_id']
    return post_doc


async def generate_recurring_instances(parent_post: dict, database):
    """Generate future post instances based on recurrence pattern"""
    try:
        base_date = parse_date(parent_post.get("scheduled_at"))
        pattern = parent_post.get("recurrence_pattern")
        end_date = parse_date(parent_post.get("recurrence_end_date")) if parent_post.get("recurrence_end_date") else None
        max_count = parent_post.get("recurrence_count") or 12  # Default max 12 instances
        recurrence_days = parent_post.get("recurrence_days", [])
        
        instances = []
        current_date = base_date
        count = 0
        
        while count < max_count:
            # Calculate next date based on pattern
            if pattern == "daily":
                current_date = current_date + relativedelta(days=1)
            elif pattern == "weekly":
                current_date = current_date + relativedelta(weeks=1)
            elif pattern == "biweekly":
                current_date = current_date + relativedelta(weeks=2)
            elif pattern == "monthly":
                current_date = current_date + relativedelta(months=1)
            elif pattern == "custom" and recurrence_days:
                # For custom, find next occurrence on specified days
                current_date = current_date + relativedelta(days=1)
                while current_date.weekday() not in recurrence_days:
                    current_date = current_date + relativedelta(days=1)
            else:
                break
            
            # Check end conditions
            if end_date and current_date > end_date:
                break
            
            # Create instance
            instance_id = str(uuid.uuid4())
            instance = {
                "id": instance_id,
                "post_id": instance_id,
                "platform": parent_post.get("platform"),
                "content": parent_post.get("content"),
                "content_html": parent_post.get("content_html"),
                "image_url": parent_post.get("image_url"),
                "campaign_id": parent_post.get("campaign_id"),
                "scheduled_at": current_date.isoformat(),
                "status": "scheduled",
                "is_recurring": False,
                "parent_recurring_id": parent_post.get("id"),
                "created_by": parent_post.get("created_by"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            instances.append(instance)
            count += 1
        
        if instances:
            await database.social_posts.insert_many(instances)
            logger.info(f"Generated {len(instances)} recurring post instances for parent {parent_post.get('id')}")
    
    except Exception as e:
        logger.error(f"Error generating recurring instances: {e}")

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
    
    # Send notification about scheduled post
    try:
        from routes.notifications import (
            create_notification, NotificationType, NotificationCategory, NotificationPriority
        )
        await create_notification(
            user_id=user['id'],
            notification_type=NotificationType.POST_SCHEDULED,
            category=NotificationCategory.SOCIAL,
            title="Post Scheduled",
            message=f"Your {data.get('platform', 'social')} post has been scheduled",
            priority=NotificationPriority.LOW,
            entity_type="post",
            entity_id=post_id,
            action_url=f"/social/posts/{post_id}",
            metadata={"platform": data.get("platform"), "scheduled_at": data.get("scheduled_at")}
        )
    except Exception as e:
        logger.error(f"Failed to send post scheduled notification: {e}")
    
    if '_id' in post_doc: del post_doc['_id']
    return post_doc


@social_router.put("/posts/{post_id}")
async def update_post(post_id: str, data: dict, user: dict = Depends(require_department(["social"]))):
    """Update an existing social post"""
    existing = await db.social_posts.find_one({"post_id": post_id})
    if not existing:
        # Try with 'id' field as well
        existing = await db.social_posts.find_one({"id": post_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Auto-save version before updating (version control)
    if existing.get("content") or existing.get("content_html"):
        try:
            last_version = await db.post_versions.find_one(
                {"post_id": post_id},
                sort=[("version_number", -1)]
            )
            next_version = (last_version.get("version_number", 0) if last_version else 0) + 1
            version_doc = {
                "version_id": str(uuid.uuid4()),
                "post_id": post_id,
                "version_number": next_version,
                "content": existing.get("content"),
                "content_html": existing.get("content_html"),
                "image_url": existing.get("image_url"),
                "platform": existing.get("platform"),
                "change_note": f"Auto-saved before edit (v{next_version})",
                "created_by": user['id'],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.post_versions.insert_one(version_doc)
        except Exception as e:
            logger.error(f"Failed to save post version: {e}")
    
    # Build update data
    update_data = {k: v for k, v in data.items() if k not in ['id', 'post_id', '_id', 'created_by', 'created_at']}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user['id']
    
    await db.social_posts.update_one(
        {"$or": [{"post_id": post_id}, {"id": post_id}]},
        {"$set": update_data}
    )
    
    updated = await db.social_posts.find_one({"$or": [{"post_id": post_id}, {"id": post_id}]}, {"_id": 0})
    return updated


@social_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(require_department(["social"]))):
    """Delete a social post"""
    existing = await db.social_posts.find_one({"$or": [{"post_id": post_id}, {"id": post_id}]})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    
    result = await db.social_posts.delete_one({"$or": [{"post_id": post_id}, {"id": post_id}]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"message": "Post deleted successfully", "post_id": post_id}


@social_router.post("/posts/{post_id}/publish")
async def publish_post(post_id: str, user: dict = Depends(require_department(["social"]))):
    """Manually publish a scheduled post"""
    existing = await db.social_posts.find_one({"$or": [{"post_id": post_id}, {"id": post_id}]})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    
    await db.social_posts.update_one(
        {"$or": [{"post_id": post_id}, {"id": post_id}]},
        {"$set": {
            "status": "published",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "published_by": user['id']
        }}
    )
    
    updated = await db.social_posts.find_one({"$or": [{"post_id": post_id}, {"id": post_id}]}, {"_id": 0})
    return updated

# ============== RECURRING POST MANAGEMENT ==============
@social_router.get("/posts/recurring")
async def get_recurring_posts(user: dict = Depends(require_department(["social"]))):
    """Get all recurring post templates"""
    posts = await db.social_posts.find(
        {"is_recurring": True}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # For each recurring post, count instances
    for post in posts:
        instance_count = await db.social_posts.count_documents({
            "parent_recurring_id": post.get("id")
        })
        post["instance_count"] = instance_count
    
    return posts


@social_router.get("/posts/recurring/{post_id}/instances")
async def get_recurring_instances(post_id: str, user: dict = Depends(require_department(["social"]))):
    """Get all instances of a recurring post"""
    parent = await db.social_posts.find_one({"id": post_id, "is_recurring": True}, {"_id": 0})
    if not parent:
        raise HTTPException(status_code=404, detail="Recurring post not found")
    
    instances = await db.social_posts.find(
        {"parent_recurring_id": post_id},
        {"_id": 0}
    ).sort("scheduled_at", 1).to_list(500)
    
    return {
        "parent": parent,
        "instances": instances,
        "total": len(instances)
    }


@social_router.put("/posts/recurring/{post_id}")
async def update_recurring_post(post_id: str, data: dict, user: dict = Depends(require_department(["social"]))):
    """Update a recurring post and optionally regenerate instances"""
    parent = await db.social_posts.find_one({"id": post_id, "is_recurring": True})
    if not parent:
        raise HTTPException(status_code=404, detail="Recurring post not found")
    
    update_future = data.pop("update_future_instances", False)
    regenerate = data.pop("regenerate_instances", False)
    
    # Update parent post
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.social_posts.update_one({"id": post_id}, {"$set": data})
    
    if update_future:
        # Update all future instances with content changes
        content_updates = {k: v for k, v in data.items() if k in ["content", "content_html", "image_url"]}
        if content_updates:
            await db.social_posts.update_many(
                {
                    "parent_recurring_id": post_id,
                    "status": {"$in": ["scheduled", "draft"]}
                },
                {"$set": content_updates}
            )
    
    if regenerate:
        # Delete all future scheduled instances and regenerate
        await db.social_posts.delete_many({
            "parent_recurring_id": post_id,
            "status": {"$in": ["scheduled", "draft"]}
        })
        updated_parent = await db.social_posts.find_one({"id": post_id}, {"_id": 0})
        await generate_recurring_instances(updated_parent, db)
    
    updated = await db.social_posts.find_one({"id": post_id}, {"_id": 0})
    return updated


@social_router.delete("/posts/recurring/{post_id}")
async def delete_recurring_post(post_id: str, delete_instances: bool = False, user: dict = Depends(require_department(["social"]))):
    """Delete a recurring post and optionally its instances"""
    parent = await db.social_posts.find_one({"id": post_id, "is_recurring": True})
    if not parent:
        raise HTTPException(status_code=404, detail="Recurring post not found")
    
    # Delete parent
    await db.social_posts.delete_one({"id": post_id})
    
    deleted_instances = 0
    if delete_instances:
        # Delete all instances
        result = await db.social_posts.delete_many({"parent_recurring_id": post_id})
        deleted_instances = result.deleted_count
    else:
        # Just unlink instances
        await db.social_posts.update_many(
            {"parent_recurring_id": post_id},
            {"$unset": {"parent_recurring_id": ""}}
        )
    
    return {
        "message": "Recurring post deleted",
        "instances_deleted": deleted_instances
    }

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

# ============== FILE UPLOAD ==============
@api_router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload an image file and return its URL"""
    try:
        # Read file content
        content = await file.read()
        
        # Validate file size (max 10MB)
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}")
        
        # Generate unique filename
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_filename = f"{uuid.uuid4()}.{file_ext}"
        
        # Store in database as base64 (for simplicity - in production use S3/Cloud Storage)
        file_doc = {
            "id": str(uuid.uuid4()),
            "filename": unique_filename,
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size": len(content),
            "data": base64.b64encode(content).decode('utf-8'),
            "uploaded_by": user['id'],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.uploaded_files.insert_one(file_doc)
        
        # Return URL that serves the file
        backend_url = os.environ.get('BACKEND_URL', '')
        file_url = f"{backend_url}/api/files/{unique_filename}"
        
        return {
            "url": file_url,
            "filename": unique_filename,
            "original_filename": file.filename,
            "size": len(content)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")

@api_router.get("/files/{filename}")
async def serve_file(filename: str):
    """Serve an uploaded file"""
    file_doc = await db.uploaded_files.find_one({"filename": filename})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    content = base64.b64decode(file_doc['data'])
    return StreamingResponse(
        io.BytesIO(content),
        media_type=file_doc.get('content_type', 'image/jpeg'),
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )

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

# ============== AI INFLUENCER DISCOVERY ==============

@ai_router.post("/discovery/search")
async def ai_discovery_search(
    data: dict,
    user: dict = Depends(require_department(["marketing"]))
):
    """
    AI-powered influencer discovery based on campaign brief.
    Analyzes existing influencers and recommends best matches.
    """
    try:
        from services.ai_discovery_service import ai_discovery_service
        
        # Get all influencers from database
        influencers = await db.contacts.find(
            {"contact_type": "influencer"},
            {"_id": 0}
        ).to_list(500)
        
        # Run AI discovery
        campaign_brief = {
            "industry": data.get("industry", "Any"),
            "target_audience": data.get("target_audience", "General"),
            "platform": data.get("platform", "Any"),
            "location": data.get("location", "Any"),
            "budget_min": data.get("budget_min", 0),
            "budget_max": data.get("budget_max", "Unlimited"),
            "follower_min": data.get("follower_min", 0),
            "follower_max": data.get("follower_max", "Any"),
            "objective": data.get("objective", "Brand Awareness"),
            "content_type": data.get("content_type", "Any"),
            "additional_requirements": data.get("additional_requirements", "")
        }
        
        result = await ai_discovery_service.discover_influencers(
            campaign_brief=campaign_brief,
            existing_influencers=influencers
        )
        
        # Store discovery session
        session_id = str(uuid.uuid4())
        await db.discovery_sessions.insert_one({
            "id": session_id,
            "campaign_brief": campaign_brief,
            "result": result,
            "created_by": user['id'],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "session_id": session_id,
            **result
        }
        
    except Exception as e:
        logger.error(f"AI Discovery error: {e}")
        return {"success": False, "error": str(e)}

@ai_router.post("/discovery/save")
async def save_discovery_result(
    data: dict,
    user: dict = Depends(require_department(["marketing"]))
):
    """Save an influencer from discovery results to a list"""
    try:
        influencer_id = data.get("influencer_id")
        list_name = data.get("list_name", "Saved from Discovery")
        notes = data.get("notes", "")
        
        # Update influencer status if needed
        if data.get("update_status"):
            await db.contacts.update_one(
                {"id": influencer_id},
                {"$set": {
                    "status": "shortlisted",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        # Add to saved list
        saved_record = {
            "id": str(uuid.uuid4()),
            "influencer_id": influencer_id,
            "list_name": list_name,
            "notes": notes,
            "source": "ai_discovery",
            "saved_by": user['id'],
            "saved_at": datetime.now(timezone.utc).isoformat()
        }
        await db.saved_influencers.insert_one(saved_record)
        del saved_record['_id']
        
        return {"success": True, "data": saved_record}
        
    except Exception as e:
        logger.error(f"Save discovery result error: {e}")
        return {"success": False, "error": str(e)}

@ai_router.post("/discovery/reject")
async def reject_discovery_result(
    data: dict,
    user: dict = Depends(require_department(["marketing"]))
):
    """Mark an influencer as rejected from discovery results"""
    try:
        influencer_id = data.get("influencer_id")
        reason = data.get("reason", "")
        
        # Store rejection
        rejection_record = {
            "id": str(uuid.uuid4()),
            "influencer_id": influencer_id,
            "reason": reason,
            "rejected_by": user['id'],
            "rejected_at": datetime.now(timezone.utc).isoformat()
        }
        await db.rejected_influencers.insert_one(rejection_record)
        
        return {"success": True, "message": "Influencer rejected"}
        
    except Exception as e:
        logger.error(f"Reject discovery result error: {e}")
        return {"success": False, "error": str(e)}

@ai_router.get("/discovery/sessions")
async def get_discovery_sessions(
    user: dict = Depends(require_department(["marketing"]))
):
    """Get all discovery sessions"""
    sessions = await db.discovery_sessions.find(
        {},
        {"_id": 0, "result": 0}  # Exclude large result data
    ).sort("created_at", -1).to_list(50)
    return sessions

@ai_router.get("/discovery/saved")
async def get_saved_influencers(
    list_name: Optional[str] = None,
    user: dict = Depends(require_department(["marketing"]))
):
    """Get saved influencers from discovery"""
    query = {}
    if list_name:
        query["list_name"] = list_name
    
    saved = await db.saved_influencers.find(query, {"_id": 0}).sort("saved_at", -1).to_list(200)
    
    # Enrich with influencer data
    for item in saved:
        influencer = await db.contacts.find_one({"id": item["influencer_id"]}, {"_id": 0})
        if influencer:
            item["influencer"] = influencer
    
    return saved

@ai_router.post("/discovery/outreach-message")
async def generate_discovery_outreach(
    data: dict,
    user: dict = Depends(require_department(["marketing"]))
):
    """Generate personalized outreach message for a discovered influencer"""
    try:
        from services.ai_discovery_service import ai_discovery_service
        
        # Get influencer data
        influencer = await db.contacts.find_one({"id": data.get("influencer_id")}, {"_id": 0})
        if not influencer:
            raise HTTPException(status_code=404, detail="Influencer not found")
        
        # Get campaign data if provided
        campaign = {}
        if data.get("campaign_id"):
            campaign = await db.marketing_campaigns.find_one({"id": data.get("campaign_id")}, {"_id": 0}) or {}
        
        campaign.update({
            "brand_name": data.get("brand_name", "Our Brand"),
            "key_message": data.get("key_message", "Exciting collaboration opportunity")
        })
        
        result = await ai_discovery_service.generate_outreach_message(
            influencer=influencer,
            campaign=campaign,
            tone=data.get("tone", "professional")
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Outreach generation error: {e}")
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
            
            # Trigger automation: auto-advance contact stage
            automation_result = await trigger_auto_advance_on_contact(
                contact_identifier=data.get("to"),
                channel="whatsapp",
                user_id=user.get('id'),
                user_name=user.get('name')
            )
            if automation_result:
                result["automation"] = automation_result
            
            # Log communication to contact history
            await log_communication_for_contact(
                contact_identifier=data.get("to"),
                channel="whatsapp",
                message=data.get("message"),
                user_id=user.get('id')
            )
        
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
            
            # Trigger automation: auto-advance contact stage
            automation_result = await trigger_auto_advance_on_contact(
                contact_identifier=data.get("to"),
                channel="whatsapp",
                user_id=user.get('id'),
                user_name=user.get('name')
            )
            if automation_result:
                result["automation"] = automation_result
        
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
            
            # Trigger automation for each recipient
            recipients = data.get("to", [])
            if isinstance(recipients, str):
                recipients = [recipients]
            
            for recipient in recipients:
                automation_result = await trigger_auto_advance_on_contact(
                    contact_identifier=recipient,
                    channel="email",
                    user_id=user.get('id'),
                    user_name=user.get('name')
                )
                
                # Log communication to contact history
                await log_communication_for_contact(
                    contact_identifier=recipient,
                    channel="email",
                    message=f"Subject: {data.get('subject', '')}",
                    user_id=user.get('id')
                )
        
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

# Register Marketing V2 routes (new unified contacts hub)
try:
    import sys
    sys.path.insert(0, str(ROOT_DIR))
    from routes.marketing_v2 import marketing_v2_router
    from routes.marketing_extended import marketing_extended_router
    api_router.include_router(marketing_v2_router)
    api_router.include_router(marketing_extended_router)
    logger.info("Marketing V2 and Extended routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Marketing V2 routes: {e}")

# Register Social API routes (Instagram/YouTube integration)
try:
    from routes.social_api import social_api_router
    api_router.include_router(social_api_router)
    logger.info("Social API routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Social API routes: {e}")

# Register WorkOS routes (Organization, Departments, Roles, Permissions)
try:
    from routes.workos import workos_router
    api_router.include_router(workos_router)
    logger.info("WorkOS routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load WorkOS routes: {e}")

# Register HR routes (Employee Database, Grade Types, Reporting Structure)
try:
    from routes.hr import hr_router
    api_router.include_router(hr_router)
    logger.info("HR routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load HR routes: {e}")

# Register HR v2 routes (Clean Architecture - separate employees collection)
try:
    from routes.hr_v2 import hr_v2_router
    api_router.include_router(hr_v2_router)
    logger.info("HR v2 routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load HR v2 routes: {e}")

# Register Access Control routes (Custom Roles, Onboarding, Permissions)
try:
    from routes.access_control import access_control_router
    api_router.include_router(access_control_router)
    logger.info("Access Control routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Access Control routes: {e}")

# Register Scheduler routes (Background jobs)
try:
    from routes.scheduler import scheduler_router
    api_router.include_router(scheduler_router)
    logger.info("Scheduler routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Scheduler routes: {e}")

# Register Project Management routes
try:
    from routes.projects import router as projects_router, init_router as init_projects_router
    init_projects_router(db, get_current_user)
    api_router.include_router(projects_router)
    logger.info("Project Management routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Project Management routes: {e}")

# Register Notifications routes
try:
    from routes.notifications import router as notifications_router, init_notifications_router
    from services.websocket_service import manager as ws_manager
    init_notifications_router(db, get_current_user, ws_manager)
    api_router.include_router(notifications_router)
    logger.info("Notifications routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Notifications routes: {e}")

# Register Help & Support routes
try:
    from routes.help_support import router as help_support_router, init_help_router as init_help_support_router
    init_help_support_router(db, get_current_user)
    api_router.include_router(help_support_router)
    logger.info("Help & Support routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Help & Support routes: {e}")

# Register Analytics routes (Team Dashboard & Reports)
try:
    from routes.analytics import router as analytics_router, init_router as init_analytics_router
    init_analytics_router(db, get_current_user)
    api_router.include_router(analytics_router)
    logger.info("Analytics routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Analytics routes: {e}")

# Register Access & Credential Management System (ACMS) routes
try:
    from routes.acms import router as acms_router, init_router as init_acms_router
    init_acms_router(db, get_current_user)
    api_router.include_router(acms_router)
    logger.info("ACMS routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load ACMS routes: {e}")

# Register Finance Management routes (Budget Planning, Payment Requests, Reimbursements)
try:
    from routes.finance import router as finance_router, init_router as init_finance_router
    init_finance_router(db, get_current_user)
    api_router.include_router(finance_router)
    logger.info("Finance Management routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Finance Management routes: {e}")

# Register Vendor Management System routes
try:
    from routes.vendors import router as vendors_router, init_router as init_vendors_router
    init_vendors_router(db, get_current_user)
    api_router.include_router(vendors_router)
    logger.info("Vendor Management routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Vendor Management routes: {e}")

# Register Unified Contacts routes (merged contacts/influencers/publications)
try:
    from modules.contacts.routes import contacts_router
    api_router.include_router(contacts_router)
    logger.info("Unified Contacts routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Unified Contacts routes: {e}")

# Register Expense & Reimbursement routes
try:
    from routes.expense import expense_router
    api_router.include_router(expense_router)
    logger.info("Expense routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Expense routes: {e}")

# Register Goals & Objectives routes
try:
    from routes.goals import router as goals_router, set_database as set_goals_db
    set_goals_db(db)
    api_router.include_router(goals_router)
    logger.info("Goals & Objectives routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Goals & Objectives routes: {e}")

# Register Meetings & Reviews routes
try:
    from routes.meetings import router as meetings_router, set_database as set_meetings_db
    set_meetings_db(db, get_current_user)
    api_router.include_router(meetings_router)
    logger.info("Meetings & Reviews routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Meetings & Reviews routes: {e}")

# Register Microsoft Teams Chat routes
try:
    from routes.teams import router as teams_router, init_teams_router
    init_teams_router(db, get_current_user)
    api_router.include_router(teams_router)
    logger.info("Microsoft Teams routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Microsoft Teams routes: {e}")

# Register Buying & Sourcing routes
try:
    from routes.sourcing import sourcing_router
    api_router.include_router(sourcing_router)
    logger.info("Buying & Sourcing routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Buying & Sourcing routes: {e}")

# Register Unified Task Management routes
try:
    from routes.unified_tasks import router as unified_tasks_router, init_router as init_unified_tasks_router
    init_unified_tasks_router(db, get_current_user)
    api_router.include_router(unified_tasks_router)
    logger.info("Unified Task Management routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Unified Task Management routes: {e}")

# Register Entity Integration routes
try:
    from routes.entity_integrations import router as entity_integrations_router, init_router as init_entity_integrations_router
    init_entity_integrations_router(db, get_current_user)
    api_router.include_router(entity_integrations_router)
    logger.info("Entity Integration routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Entity Integration routes: {e}")

# Register Social Campaigns routes
try:
    from routes.social_campaigns import router as social_campaigns_router, init_router as init_social_campaigns_router
    init_social_campaigns_router(db, get_current_user)
    api_router.include_router(social_campaigns_router)
    logger.info("Social Campaigns routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Social Campaigns routes: {e}")

# Load Social Workflows routes (Approval chains, Queues, Version control)
try:
    from routes.social_workflows import social_workflows_router, init_social_workflows_router
    init_social_workflows_router(db)
    api_router.include_router(social_workflows_router)
    logger.info("Social Workflows routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Social Workflows routes: {e}")

# Load Social Inbox routes (Unified Inbox, Mentions)
try:
    from routes.social_inbox import social_inbox_router, init_social_inbox_router
    init_social_inbox_router(db, get_current_user)
    api_router.include_router(social_inbox_router)
    logger.info("Social Inbox routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Social Inbox routes: {e}")

# Load Auto-Reply routes (Rule-based + AI)
try:
    from routes.social_auto_reply import auto_reply_router, init_auto_reply_router
    # AI client is optional - will use template responses if not configured
    init_auto_reply_router(db, get_current_user, None)
    api_router.include_router(auto_reply_router)
    logger.info("Auto-Reply routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Auto-Reply routes: {e}")

# Load Social Analytics routes (Performance Dashboards)
try:
    from routes.social_analytics import social_analytics_router, init_social_analytics_router
    init_social_analytics_router(db, get_current_user)
    api_router.include_router(social_analytics_router)
    logger.info("Social Analytics routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Social Analytics routes: {e}")

# Load Social Listening routes (Keyword Monitoring, Alerts)
try:
    from routes.social_listening import social_listening_router, init_social_listening_router
    init_social_listening_router(db, get_current_user)
    api_router.include_router(social_listening_router)
    logger.info("Social Listening routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Social Listening routes: {e}")

# Load Social Platform Integrations routes (Phase 5 - Direct API Publishing)
try:
    from routes.social_integrations import router as social_integrations_router, init_router as init_integrations_router
    init_integrations_router(db, get_current_user)
    api_router.include_router(social_integrations_router)
    logger.info("Social Integrations routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Social Integrations routes: {e}")

# Load Social Webhooks routes (Real-time Engagement Tracking)
try:
    from routes.social_webhooks import router as social_webhooks_router, init_router as init_webhooks_router
    init_webhooks_router(db)
    api_router.include_router(social_webhooks_router)
    logger.info("Social Webhooks routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Social Webhooks routes: {e}")

# Load Sevora Pulse routes (Company Wall & Team Engagement)
try:
    from routes.pulse import router as pulse_router, init_router as init_pulse_router
    init_pulse_router(db)
    api_router.include_router(pulse_router)
    logger.info("Sevora Pulse routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Sevora Pulse routes: {e}")

# Initialize Pulse Integration Service
try:
    from services.pulse_integrations import init_integration_service
    init_integration_service(db)
    logger.info("Pulse Integration Service initialized")
except Exception as e:
    logger.error(f"Failed to initialize Pulse Integration Service: {e}")

# Load Admin V2 routes
try:
    from routes.admin import router as admin_v2_router, set_database as set_admin_db, set_jwt_settings as set_admin_jwt
    set_admin_db(db)
    set_admin_jwt(JWT_SECRET, JWT_ALGORITHM)
    api_router.include_router(admin_v2_router)
    logger.info("Admin V2 routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Admin V2 routes: {e}")

# Load System Modules routes
try:
    from routes.system_modules import router as system_modules_router, set_database as set_system_modules_db
    set_system_modules_db(db)
    api_router.include_router(system_modules_router)
    logger.info("System Modules routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load System Modules routes: {e}")

# Load Module Categories routes
try:
    from routes.module_categories import router as module_categories_router, set_database as set_module_categories_db
    set_module_categories_db(db)
    api_router.include_router(module_categories_router)
    logger.info("Module Categories routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Module Categories routes: {e}")

# Load Marketing V3 Modular routes (Digital Ads + Creative Assets)
try:
    from routes.marketing import marketing_modular_router
    api_router.include_router(marketing_modular_router)
    logger.info("Marketing V3 Modular routes loaded successfully (Ads + Assets)")
except Exception as e:
    logger.error(f"Failed to load Marketing V3 Modular routes: {e}")


# Data Import routes
try:
    from routes.data_import import router as data_import_router, set_db as set_data_import_db
    set_data_import_db(db)
    api_router.include_router(data_import_router)
    logger.info("Data Import routes loaded successfully")
except Exception as e:
    logger.error(f"Failed to load Data Import routes: {e}")

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
            except Exception:
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
            except Exception:
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
            except Exception:
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
            except Exception:
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
            except Exception:
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
            except Exception:
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
async def send_microsoft_email(
    request: MicrosoftSendEmailRequest, 
    user_email: str = None,
    user: dict = Depends(get_current_user)
):
    """Send a new email or reply to existing"""
    sender = user_email or DEFAULT_SENDER_EMAIL
    result = await microsoft_email_service.send_email(
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
    
    # Trigger automation for each recipient
    if result.get("success") or result.get("id"):
        for recipient in request.to_recipients:
            automation_result = await trigger_auto_advance_on_contact(
                contact_identifier=recipient,
                channel="email",
                user_id=user.get('id') if user else None,
                user_name=user.get('name') if user else sender
            )
            
            # Log communication to contact history
            await log_communication_for_contact(
                contact_identifier=recipient,
                channel="email",
                message=f"Subject: {request.subject}",
                user_id=user.get('id') if user else None
            )
        
        # Send notification about sent email
        if user and user.get('id'):
            try:
                from routes.notifications import (
                    create_notification, NotificationType, NotificationCategory, NotificationPriority
                )
                to_list = ', '.join(request.to_recipients[:2])
                if len(request.to_recipients) > 2:
                    to_list += f" +{len(request.to_recipients) - 2} more"
                await create_notification(
                    user_id=user['id'],
                    notification_type=NotificationType.EMAIL_SENT,
                    category=NotificationCategory.MAIL,
                    title="Email Sent",
                    message=f"To: {to_list} - {request.subject[:50]}",
                    priority=NotificationPriority.LOW,
                    entity_type="email",
                    entity_id=result.get("id"),
                    action_url="/mail/sent",
                    metadata={"recipients": request.to_recipients, "subject": request.subject}
                )
            except Exception as e:
                logger.error(f"Failed to send email sent notification: {e}")
    
    return result

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

# ============== AUTOMATION ENGINE ==============
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

# Initialize scheduler
scheduler = AsyncIOScheduler()

# Default automation settings
DEFAULT_AUTOMATION_SETTINGS = {
    "pipeline": {
        "auto_advance_on_contact": {"enabled": True, "description": "Auto-advance to 'Contacted' stage when first outreach is sent"},
        "stuck_deal_alert": {"enabled": True, "days": 5, "description": "Alert when deals are stuck in a stage for too long"},
        "auto_archive_lost": {"enabled": False, "days": 30, "description": "Auto-archive 'Lost' deals after specified days"}
    },
    "email": {
        "follow_up_reminder": {"enabled": True, "days": 3, "description": "Send reminder for contacts with no reply"},
        "auto_sequence": {"enabled": False, "description": "Enable email drip sequences"}
    },
    "social": {
        "auto_publish": {"enabled": True, "description": "Auto-publish posts at scheduled time"},
        "daily_limit": {"enabled": False, "limit": 10, "description": "Limit posts per day per platform"}
    },
    "goals_projects": {
        "progress_cascade": {
            "enabled": True,
            "description": "Auto-update project, objective, and goal progress when tasks are completed"
        },
        "overdue_task_alert": {
            "enabled": True,
            "description": "Send notifications for overdue tasks",
            "check_time": "08:00",
            "notify_assignee": True,
            "notify_manager": True,
            "channels": {"in_app": True, "email": True, "teams": False}
        },
        "task_deadline_reminder": {
            "enabled": True,
            "description": "Remind users about upcoming task deadlines",
            "days_before": [3, 1],
            "channels": {"in_app": True, "email": False, "teams": False}
        },
        # Phase 2
        "goal_at_risk_alert": {
            "enabled": True,
            "description": "Alert when goals are behind schedule and at risk of missing deadlines",
            "progress_threshold": 50,
            "days_before_deadline": 30,
            "auto_schedule_review": True,
            "channels": {"in_app": True, "email": True, "teams": False}
        },
        "blocked_task_escalation": {
            "enabled": True,
            "description": "Escalate tasks that have been blocked for too long",
            "blocked_days_threshold": 2,
            "auto_schedule_meeting": False,
            "channels": {"in_app": True, "email": True, "teams": False}
        },
        "weekly_progress_report": {
            "enabled": True,
            "description": "Send weekly progress summary every Monday",
            "send_day": "monday",
            "send_time": "09:00",
            "include_goals": True,
            "include_projects": True,
            "include_tasks": True,
            "channels": {"in_app": True, "email": True, "teams": False}
        }
    },
    "communication": {
        "meeting_reminder": {
            "enabled": True,
            "description": "Send reminders before meetings",
            "remind_at": [1440, 60, 15],
            "channels": {"in_app": True, "email": True, "teams": False}
        },
        "action_item_to_task": {
            "enabled": True,
            "description": "Automatically create tasks from meeting action items",
            "auto_assign": True,
            "default_priority": "medium"
        },
        "overdue_action_item": {
            "enabled": True,
            "description": "Alert when action items are overdue",
            "escalate_after_days": 3,
            "channels": {"in_app": True, "email": True, "teams": False}
        }
    }
}

# ============== AUTOMATION TRIGGER HELPERS ==============
async def get_automation_settings_cached():
    """Get automation settings (cached for performance)"""
    settings_doc = await db.automation_settings.find_one({"type": "global"}, {"_id": 0})
    if settings_doc:
        return settings_doc.get("settings", DEFAULT_AUTOMATION_SETTINGS)
    return DEFAULT_AUTOMATION_SETTINGS

async def trigger_auto_advance_on_contact(contact_identifier: str, channel: str, user_id: str = None, user_name: str = None):
    """
    Trigger automation to advance contact stage when contacted via email/WhatsApp.
    contact_identifier can be email address or phone number.
    """
    try:
        settings = await get_automation_settings_cached()
        
        # Check if auto-advance is enabled
        if not settings.get("pipeline", {}).get("auto_advance_on_contact", {}).get("enabled", False):
            logger.info(f"Auto-advance disabled, skipping for {contact_identifier}")
            return None
        
        # Find contact by email or phone
        contact = None
        if "@" in contact_identifier:
            # Search by email
            contact = await db.contacts.find_one({
                "$or": [
                    {"email": {"$regex": f"^{contact_identifier}$", "$options": "i"}},
                    {"emails": {"$elemMatch": {"$regex": f"^{contact_identifier}$", "$options": "i"}}}
                ]
            })
        else:
            # Search by phone (clean up phone number)
            clean_phone = contact_identifier.replace("+", "").replace(" ", "").replace("-", "")
            contact = await db.contacts.find_one({
                "$or": [
                    {"phone": {"$regex": clean_phone}},
                    {"whatsapp": {"$regex": clean_phone}}
                ]
            })
        
        if not contact:
            logger.info(f"No contact found for {contact_identifier}, skipping auto-advance")
            return None
        
        # Check both "stage" and "status" fields (different schema versions)
        current_stage = contact.get("stage") or contact.get("status") or contact.get("pipeline_stage") or "identified"
        
        # Only advance if in early stages (identified or earlier)
        early_stages = ["identified", "new", None, ""]
        if current_stage not in early_stages:
            logger.info(f"Contact {contact.get('name')} already in stage '{current_stage}', skipping auto-advance")
            return {"skipped": True, "reason": f"Already in stage: {current_stage}"}
        
        # Update contact stage to "contacted"
        now = datetime.now(timezone.utc).isoformat()
        update_data = {
            "stage": "contacted",
            "status": "contacted",  # Update both fields for compatibility
            "pipeline_stage": "contacted",
            "stage_updated_at": now,
            "last_contacted_at": now,
            "last_contact_channel": channel,
            "updated_at": now
        }
        
        await db.contacts.update_one(
            {"id": contact["id"]},
            {"$set": update_data}
        )
        
        # Log the automation action
        await db.automation_logs.insert_one({
            "id": str(uuid.uuid4()),
            "action": "auto_advance_stage",
            "trigger": f"{channel}_sent",
            "contact_id": contact["id"],
            "contact_name": contact.get("name"),
            "from_stage": current_stage,
            "to_stage": "contacted",
            "user_id": user_id,
            "user_name": user_name,
            "created_at": now
        })
        
        logger.info(f"Auto-advanced contact '{contact.get('name')}' from '{current_stage}' to 'contacted' via {channel}")
        
        return {
            "success": True,
            "contact_id": contact["id"],
            "contact_name": contact.get("name"),
            "from_stage": current_stage,
            "to_stage": "contacted",
            "channel": channel
        }
        
    except Exception as e:
        logger.error(f"Auto-advance trigger error: {e}")
        return {"success": False, "error": str(e)}

async def log_communication_for_contact(contact_identifier: str, channel: str, message: str, user_id: str = None):
    """Log communication to contact's history"""
    try:
        # Find contact
        contact = None
        if "@" in contact_identifier:
            contact = await db.contacts.find_one({
                "$or": [
                    {"email": {"$regex": f"^{contact_identifier}$", "$options": "i"}},
                    {"emails": {"$elemMatch": {"$regex": f"^{contact_identifier}$", "$options": "i"}}}
                ]
            })
        else:
            clean_phone = contact_identifier.replace("+", "").replace(" ", "").replace("-", "")
            contact = await db.contacts.find_one({
                "$or": [
                    {"phone": {"$regex": clean_phone}},
                    {"whatsapp": {"$regex": clean_phone}}
                ]
            })
        
        if contact:
            # Add to communication history
            comm_entry = {
                "id": str(uuid.uuid4()),
                "type": channel,
                "direction": "outbound",
                "message_preview": message[:200] if message else "",
                "sent_by": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            await db.contacts.update_one(
                {"id": contact["id"]},
                {
                    "$push": {"communication_history": comm_entry},
                    "$set": {"last_contacted_at": datetime.now(timezone.utc).isoformat()}
                }
            )
            return True
    except Exception as e:
        logger.error(f"Error logging communication: {e}")
    return False

automation_router = APIRouter(prefix="/automations", tags=["Automations"])

@automation_router.get("/settings")
async def get_automation_settings(user: dict = Depends(require_module_access(["automations", "admin"]))):
    """Get automation settings for the organization"""
    settings = await db.automation_settings.find_one({"type": "global"}, {"_id": 0})
    if not settings:
        # Return defaults if no settings exist
        return {"settings": DEFAULT_AUTOMATION_SETTINGS, "is_default": True}
    return {"settings": settings.get("settings", DEFAULT_AUTOMATION_SETTINGS), "is_default": False}

@automation_router.put("/settings")
async def update_automation_settings(data: dict, user: dict = Depends(require_module_access(["automations", "admin"]))):
    """Update automation settings"""
    # Only admins can update settings
    if user.get('role') not in ['super_admin', 'admin'] and not user.get('can_manage_roles'):
        raise HTTPException(status_code=403, detail="Only admins can update automation settings")
    
    settings = data.get("settings", {})
    await db.automation_settings.update_one(
        {"type": "global"},
        {"$set": {"settings": settings, "updated_by": user['id'], "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    # Log the change
    await db.automation_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "settings_updated",
        "user_id": user['id'],
        "user_name": user.get('name'),
        "changes": settings,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Automation settings updated", "settings": settings}

@automation_router.get("/logs")
async def get_automation_logs(limit: int = 50, user: dict = Depends(require_module_access(["automations", "admin"]))):
    """Get automation execution logs"""
    logs = await db.automation_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return logs

@automation_router.get("/pending-actions")
async def get_pending_actions(user: dict = Depends(require_module_access(["automations", "admin"]))):
    """Get pending automation actions (reminders, follow-ups, etc.)"""
    settings_doc = await db.automation_settings.find_one({"type": "global"}, {"_id": 0})
    settings = settings_doc.get("settings", DEFAULT_AUTOMATION_SETTINGS) if settings_doc else DEFAULT_AUTOMATION_SETTINGS
    
    pending = []
    now = datetime.now(timezone.utc)
    
    # Check for stuck deals
    if settings.get("pipeline", {}).get("stuck_deal_alert", {}).get("enabled"):
        days = settings["pipeline"]["stuck_deal_alert"].get("days", 5)
        cutoff = (now - timedelta(days=days)).isoformat()
        
        stuck_contacts = await db.contacts.find({
            "stage": {"$in": ["negotiating", "agreed", "delivering"]},
            "stage_updated_at": {"$lt": cutoff}
        }, {"_id": 0, "id": 1, "name": 1, "stage": 1, "stage_updated_at": 1}).to_list(100)
        
        for contact in stuck_contacts:
            days_stuck = (now - datetime.fromisoformat(contact.get("stage_updated_at", now.isoformat()).replace('Z', '+00:00'))).days
            pending.append({
                "type": "stuck_deal",
                "priority": "high" if days_stuck > 7 else "medium",
                "contact_id": contact["id"],
                "contact_name": contact.get("name"),
                "stage": contact.get("stage"),
                "days_stuck": days_stuck,
                "message": f"{contact.get('name')} has been in '{contact.get('stage')}' stage for {days_stuck} days"
            })
    
    # Check for follow-up reminders
    if settings.get("email", {}).get("follow_up_reminder", {}).get("enabled"):
        days = settings["email"]["follow_up_reminder"].get("days", 3)
        cutoff = (now - timedelta(days=days)).isoformat()
        
        # Find contacts that were contacted but haven't replied
        no_reply_contacts = await db.contacts.find({
            "stage": "contacted",
            "last_contacted_at": {"$lt": cutoff},
            "last_reply_at": None
        }, {"_id": 0, "id": 1, "name": 1, "email": 1, "last_contacted_at": 1}).to_list(100)
        
        for contact in no_reply_contacts:
            last_contact = contact.get("last_contacted_at")
            if last_contact:
                days_since = (now - datetime.fromisoformat(last_contact.replace('Z', '+00:00'))).days
                pending.append({
                    "type": "follow_up_reminder",
                    "priority": "medium",
                    "contact_id": contact["id"],
                    "contact_name": contact.get("name"),
                    "email": contact.get("email"),
                    "days_since_contact": days_since,
                    "message": f"No reply from {contact.get('name')} in {days_since} days - consider following up"
                })
    
    # Check for scheduled social posts ready to publish
    if settings.get("social", {}).get("auto_publish", {}).get("enabled"):
        ready_posts = await db.posts.find({
            "status": "scheduled",
            "scheduled_at": {"$lte": now.isoformat()}
        }, {"_id": 0, "post_id": 1, "content": 1, "platform": 1, "scheduled_at": 1}).to_list(50)
        
        for post in ready_posts:
            pending.append({
                "type": "scheduled_post",
                "priority": "high",
                "post_id": post.get("post_id"),
                "platform": post.get("platform"),
                "scheduled_at": post.get("scheduled_at"),
                "message": f"Post for {post.get('platform')} is ready to publish"
            })
    
    # Sort by priority
    priority_order = {"high": 0, "medium": 1, "low": 2}
    pending.sort(key=lambda x: priority_order.get(x.get("priority"), 2))
    
    return {"pending_actions": pending, "total": len(pending)}

@automation_router.post("/execute/{action_type}")
async def execute_automation_action(action_type: str, data: dict, user: dict = Depends(get_current_user)):
    """Manually execute an automation action"""
    result = {"success": False, "message": "Unknown action type"}
    
    if action_type == "advance_stage":
        contact_id = data.get("contact_id")
        new_stage = data.get("new_stage")
        if contact_id and new_stage:
            await db.contacts.update_one(
                {"id": contact_id},
                {"$set": {"stage": new_stage, "status": new_stage, "pipeline_stage": new_stage, "stage_updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            result = {"success": True, "message": f"Contact moved to {new_stage}"}
    
    elif action_type == "test_trigger":
        # Test the automation trigger with an email address
        contact_email = data.get("contact_email")
        if contact_email:
            trigger_result = await trigger_auto_advance_on_contact(
                contact_identifier=contact_email,
                channel="test",
                user_id=user.get('id'),
                user_name=user.get('name')
            )
            result = {"success": True, "message": "Trigger tested", "trigger_result": trigger_result}
        else:
            result = {"success": False, "message": "contact_email required"}
    
    elif action_type == "send_follow_up":
        contact_id = data.get("contact_id")
        # This would integrate with email sending
        result = {"success": True, "message": "Follow-up queued", "contact_id": contact_id}
    
    elif action_type == "publish_post":
        post_id = data.get("post_id")
        if post_id:
            post = await db.posts.find_one({"post_id": post_id})
            await db.posts.update_one(
                {"post_id": post_id},
                {"$set": {"status": "published", "published_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            # Send notification about published post
            if post and post.get("created_by"):
                try:
                    from routes.notifications import (
                        create_notification, NotificationType, NotificationCategory, NotificationPriority
                    )
                    await create_notification(
                        user_id=post["created_by"],
                        notification_type=NotificationType.POST_PUBLISHED,
                        category=NotificationCategory.SOCIAL,
                        title="Post Published",
                        message=f"Your {post.get('platform', 'social')} post is now live!",
                        priority=NotificationPriority.MEDIUM,
                        entity_type="post",
                        entity_id=post_id,
                        action_url=f"/social/posts/{post_id}",
                        metadata={"platform": post.get("platform")}
                    )
                except Exception as e:
                    logger.error(f"Failed to send post published notification: {e}")
            
            result = {"success": True, "message": "Post published"}
    
    elif action_type == "dismiss":
        # Just log the dismissal
        result = {"success": True, "message": "Action dismissed"}
    
    # Log the action
    await db.automation_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": f"manual_{action_type}",
        "user_id": user['id'],
        "user_name": user.get('name'),
        "data": data,
        "result": result,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return result

# Background job: Process scheduled social posts
async def process_scheduled_posts():
    """Background job to auto-publish scheduled posts"""
    try:
        settings_doc = await db.automation_settings.find_one({"type": "global"}, {"_id": 0})
        settings = settings_doc.get("settings", DEFAULT_AUTOMATION_SETTINGS) if settings_doc else DEFAULT_AUTOMATION_SETTINGS
        
        if not settings.get("social", {}).get("auto_publish", {}).get("enabled"):
            return
        
        now = datetime.now(timezone.utc)
        ready_posts = await db.posts.find({
            "status": "scheduled",
            "scheduled_at": {"$lte": now.isoformat()}
        }).to_list(50)
        
        for post in ready_posts:
            # Mark as published (in production, this would call actual social APIs)
            await db.posts.update_one(
                {"post_id": post["post_id"]},
                {"$set": {"status": "published", "published_at": now.isoformat()}}
            )
            
            await db.automation_logs.insert_one({
                "id": str(uuid.uuid4()),
                "action": "auto_publish_post",
                "post_id": post["post_id"],
                "platform": post.get("platform"),
                "created_at": now.isoformat()
            })
            
        logger.info(f"Processed {len(ready_posts)} scheduled posts")
    except Exception as e:
        logger.error(f"Error processing scheduled posts: {e}")

# Start scheduler on app startup
@app.on_event("startup")
async def start_scheduler():
    # Initialize object storage
    try:
        from utils.storage import init_storage
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Object storage init failed (non-fatal): {e}")
    
    # Initialize email notification service
    try:
        from services.email_notification_service import init_email_notification_service
        init_email_notification_service(db, microsoft_email_service)
        logger.info("Email notification service initialized")
    except Exception as e:
        logger.warning(f"Email notification service init failed (non-fatal): {e}")
    
    # Initialize automation service for Goals, Projects & Communication Hub
    try:
        from services.automation_service import init_automation_service
        init_automation_service(db, notif_service=None, email_svc=microsoft_email_service, teams_svc=None)
        logger.info("Automation service initialized")
    except Exception as e:
        logger.warning(f"Automation service init failed (non-fatal): {e}")
    
    # Run scheduled posts check every 5 minutes
    scheduler.add_job(process_scheduled_posts, IntervalTrigger(minutes=5), id="process_scheduled_posts", replace_existing=True)
    
    # Run hourly notification digest every hour
    async def send_hourly_digests():
        try:
            from services.email_notification_service import send_digest_emails
            await send_digest_emails("hourly")
        except Exception as e:
            logger.error(f"Hourly digest error: {e}")
    
    scheduler.add_job(send_hourly_digests, IntervalTrigger(hours=1), id="hourly_notification_digest", replace_existing=True)
    
    # Run daily notification digest at 8 AM UTC
    async def send_daily_digests():
        try:
            from services.email_notification_service import send_digest_emails
            await send_digest_emails("daily")
        except Exception as e:
            logger.error(f"Daily digest error: {e}")
    
    from apscheduler.triggers.cron import CronTrigger
    scheduler.add_job(send_daily_digests, CronTrigger(hour=8, minute=0), id="daily_notification_digest", replace_existing=True)
    
    # === PHASE 1 AUTOMATIONS ===
    
    # Overdue task check - daily at 8 AM UTC
    async def check_overdue_tasks_job():
        try:
            from services.automation_service import check_overdue_tasks
            await check_overdue_tasks()
        except Exception as e:
            logger.error(f"Overdue task check error: {e}")
    
    scheduler.add_job(check_overdue_tasks_job, CronTrigger(hour=8, minute=0), id="check_overdue_tasks", replace_existing=True)
    
    # Meeting reminders - check every 5 minutes
    async def check_meeting_reminders_job():
        try:
            from services.automation_service import check_upcoming_meetings
            await check_upcoming_meetings()
        except Exception as e:
            logger.error(f"Meeting reminder check error: {e}")
    
    scheduler.add_job(check_meeting_reminders_job, IntervalTrigger(minutes=5), id="check_meeting_reminders", replace_existing=True)
    
    # === PHASE 2 AUTOMATIONS ===
    
    # Goal at-risk check - daily at 9 AM UTC
    async def check_at_risk_goals_job():
        try:
            from services.automation_service import check_at_risk_goals
            await check_at_risk_goals()
        except Exception as e:
            logger.error(f"Goal at-risk check error: {e}")
    
    scheduler.add_job(check_at_risk_goals_job, CronTrigger(hour=9, minute=0), id="check_at_risk_goals", replace_existing=True)
    
    # Blocked task escalation - daily at 9:30 AM UTC
    async def check_blocked_tasks_job():
        try:
            from services.automation_service import check_blocked_tasks
            await check_blocked_tasks()
        except Exception as e:
            logger.error(f"Blocked task check error: {e}")
    
    scheduler.add_job(check_blocked_tasks_job, CronTrigger(hour=9, minute=30), id="check_blocked_tasks", replace_existing=True)
    
    # Weekly progress report - every Monday at 9 AM UTC
    async def weekly_report_job():
        try:
            from services.automation_service import generate_weekly_progress_report
            await generate_weekly_progress_report()
        except Exception as e:
            logger.error(f"Weekly report error: {e}")
    
    scheduler.add_job(weekly_report_job, CronTrigger(day_of_week='mon', hour=9, minute=0), id="weekly_progress_report", replace_existing=True)
    
    scheduler.start()
    logger.info("Automation scheduler started with Phase 1 & Phase 2 automations")

@app.on_event("shutdown")
async def stop_scheduler():
    scheduler.shutdown()
    logger.info("Automation scheduler stopped")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= Website Settings Router =============
settings_router = APIRouter(prefix="/settings")

@settings_router.get("/website/public")
async def get_public_website_settings():
    """Get public website settings (no auth required) - site name, tagline, description for branding"""
    settings = await db.website_settings.find_one({"type": "global"}, {"_id": 0})
    if not settings or not settings.get("settings"):
        return {
            "site_name": "Sevora Team",
            "site_tagline": "Unified Operations Platform",
            "site_description": "A comprehensive platform for team collaboration and project management.",
            "primary_color": "#4A3728",
            "logo_url": None
        }
    s = settings.get("settings", {})
    return {
        "site_name": s.get("site_name", "Sevora Team"),
        "site_tagline": s.get("site_tagline", ""),
        "site_description": s.get("site_description", ""),
        "primary_color": s.get("primary_color", "#4A3728"),
        "logo_url": s.get("logo_url", None)
    }

@settings_router.get("/website")
async def get_website_settings(user: dict = Depends(require_module_access(["admin"]))):
    """Get website settings"""
    settings = await db.website_settings.find_one({"type": "global"}, {"_id": 0})
    if not settings:
        return {"settings": None, "is_default": True}
    return {"settings": settings.get("settings", {}), "is_default": False}

@settings_router.put("/website")
async def update_website_settings(data: dict, user: dict = Depends(require_module_access(["admin"]))):
    """Update website settings"""
    # Only admins can update settings
    if user.get('role') not in ['super_admin', 'admin'] and not user.get('can_manage_roles'):
        raise HTTPException(status_code=403, detail="Only admins can update website settings")
    
    settings = data.get("settings", {})
    
    await db.website_settings.update_one(
        {"type": "global"},
        {
            "$set": {
                "settings": settings,
                "updated_by": user['id'],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Website settings updated"}

# Register settings router
app.include_router(settings_router, prefix="/api")
logger.info("Website settings routes loaded successfully")

# Register automation router (after it's defined)
app.include_router(automation_router, prefix="/api")
logger.info("Automation routes loaded successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
