"""
Authentication Routes - Extracted from server.py
Handles user registration, login, Azure AD login, and user profile
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import jwt
import bcrypt
import httpx
import os
import logging
from enum import Enum

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Database connection - will be set from server.py
db = None

# Settings - will be set from server.py
JWT_SECRET = None
JWT_ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 1440
AZURE_CLIENT_ID = None
AZURE_TENANT_ID = None
AZURE_CLIENT_SECRET = None
AZURE_AUTHORITY = None


def set_database(database):
    global db
    db = database


def set_jwt_settings(secret: str, algorithm: str, expire_minutes: int):
    global JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm
    ACCESS_TOKEN_EXPIRE_MINUTES = expire_minutes


def set_azure_settings(client_id: str, tenant_id: str, client_secret: str):
    global AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET, AZURE_AUTHORITY
    AZURE_CLIENT_ID = client_id
    AZURE_TENANT_ID = tenant_id
    AZURE_CLIENT_SECRET = client_secret
    AZURE_AUTHORITY = f"https://login.microsoftonline.com/{tenant_id}"


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


# ============== REQUEST/RESPONSE MODELS ==============
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    department: Department = Department.SALES
    role: UserRole = UserRole.VIEWER


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class AzureTokenRequest(BaseModel):
    azure_token: str


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
    permissions: Optional[Dict[str, Any]] = None
    has_custom_permissions: Optional[bool] = None
    azure_id: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ============== HELPER FUNCTIONS ==============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + __import__('datetime').timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_user_departments(role: str) -> List[str]:
    """Get list of departments a user has access to based on role"""
    role_departments = {
        "super_admin": ["marketing", "sales", "social", "admin"],
        "admin": ["marketing", "sales", "social", "admin"],
        "marketing_manager": ["marketing"],
        "sales_manager": ["sales"],
        "social_manager": ["social"],
        "viewer": []
    }
    return role_departments.get(role, [])


def get_user_permissions(user: dict) -> Dict[str, Any]:
    """Get user permissions based on role and custom overrides"""
    # Default permissions based on role
    role = user.get('role', 'viewer')
    role_permissions = {
        "super_admin": {"all": True},
        "admin": {"all": True},
        "marketing_manager": {"marketing": {"view": True, "create": True, "edit": True, "delete": True}},
        "sales_manager": {"sales": {"view": True, "create": True, "edit": True, "delete": True}},
        "social_manager": {"social": {"view": True, "create": True, "edit": True, "delete": True}},
        "viewer": {"view_only": True}
    }
    
    base_permissions = role_permissions.get(role, {"view_only": True})
    
    # Check for custom permissions
    if user.get('custom_permissions'):
        return {**base_permissions, **user.get('custom_permissions')}
    
    return base_permissions


async def verify_azure_token(azure_token: str) -> dict:
    """Verify Azure AD token and get user info"""
    try:
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
@router.post("/register", response_model=TokenResponse)
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


@router.post("/login", response_model=TokenResponse)
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
            has_custom_permissions=bool(user.get('custom_permissions'))
        )
    )


@router.post("/azure", response_model=TokenResponse)
async def azure_login(request: AzureTokenRequest):
    """Login with Azure AD token - Only allows Sevora domain or pre-created users"""
    azure_user = await verify_azure_token(request.azure_token)
    
    email = azure_user.get('mail') or azure_user.get('userPrincipalName')
    name = azure_user.get('displayName', email.split('@')[0])
    azure_id = azure_user.get('id')
    
    # Allowed Microsoft domains (Sevora organization)
    ALLOWED_DOMAINS = ['sevora.com']
    email_domain = email.lower().split('@')[-1] if '@' in email else ''
    is_sevora_domain = email_domain in ALLOWED_DOMAINS
    
    # Check if user exists
    user = await db.users.find_one({"$or": [{"azure_id": azure_id}, {"email": email}]}, {"_id": 0})
    
    if not user:
        # Only allow auto-creation for Sevora domain emails
        if not is_sevora_domain:
            raise HTTPException(
                status_code=403, 
                detail="Access denied. Only users with Sevora organization email or pre-registered accounts can sign in. Please contact an administrator."
            )
        
        # Auto-create and activate user for Sevora domain
        user_id = str(uuid.uuid4())
        user = {
            "id": user_id,
            "azure_id": azure_id,
            "email": email,
            "name": name,
            "department": "sales",
            "role": "viewer",
            "status": "active",  # Auto-activated for Sevora domain
            "avatar_url": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source": "azure_ad"
        }
        await db.users.insert_one(user)
        logger.info(f"Auto-created Sevora user from Microsoft login: {email}")
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


@router.get("/config")
async def get_auth_config():
    """Return Azure AD configuration for frontend"""
    return {
        "clientId": AZURE_CLIENT_ID,
        "tenantId": AZURE_TENANT_ID,
        "authority": AZURE_AUTHORITY,
        "redirectUri": os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    }
