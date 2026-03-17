"""
WorkOS Models - Organization, Departments, Roles, Permissions
Clean Architecture: User (Auth) <-> Employee (HR + Access)
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime


# ============== USER STATUS ENUM ==============

class UserStatus(str, Enum):
    DRAFT = "draft"           # Newly synced from AD, not yet onboarded
    PENDING = "pending"       # Awaiting admin action
    ONBOARDED = "onboarded"   # Has employee record, pending activation
    ACTIVE = "active"         # Fully active user
    INACTIVE = "inactive"     # Deactivated


# ============== DEPARTMENT MODELS ==============

class DepartmentCreate(BaseModel):
    name: str
    code: str  # e.g., "marketing", "sales", "pr"
    description: Optional[str] = None
    parent_id: Optional[str] = None  # For nested departments
    lead_id: Optional[str] = None  # Department head
    color: Optional[str] = "#8B7355"  # For UI
    icon: Optional[str] = "Building2"


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    lead_id: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    lead_id: Optional[str] = None
    lead_name: Optional[str] = None
    color: str = "#8B7355"
    icon: str = "Building2"
    is_active: bool = True
    member_count: int = 0
    created_at: str
    updated_at: str


# ============== ROLE MODELS ==============

class RoleCreate(BaseModel):
    name: str
    code: str  # e.g., "marketing_exec", "sales_manager"
    description: Optional[str] = None
    level: int = 10  # Hierarchy level (higher = more access)
    department_ids: List[str] = []  # Departments this role can access
    permissions: Dict[str, Dict[str, List[str]]] = {}  # {dept: {module: [actions]}}
    is_system: bool = False  # System roles can't be deleted


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    level: Optional[int] = None
    department_ids: Optional[List[str]] = None
    permissions: Optional[Dict[str, Dict[str, List[str]]]] = None
    is_active: Optional[bool] = None


class RoleResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    level: int = 10
    department_ids: List[str] = []
    permissions: Dict[str, Dict[str, List[str]]] = {}
    is_system: bool = False
    is_active: bool = True
    user_count: int = 0
    created_at: str
    updated_at: str


# ============== ENHANCED USER MODELS ==============

class UserSimpleCreate(BaseModel):
    """Simple user creation model for admin panel"""
    email: EmailStr
    password: str
    name: str
    status: str = "active"  # active, inactive
    notes: Optional[str] = None
    department_id: Optional[str] = None
    role_id: Optional[str] = None
    reports_to: Optional[str] = None
    title: Optional[str] = None


class UserEnhancedCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    department_id: str
    role_id: str
    reports_to: Optional[str] = None  # User ID of manager
    title: Optional[str] = None  # Job title
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class UserEnhancedUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[str] = None
    role_id: Optional[str] = None
    grade_id: Optional[str] = None  # HR Grade Type
    reports_to: Optional[str] = None
    title: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    status: Optional[str] = None  # active, inactive, pending


class UserEnhancedResponse(BaseModel):
    id: str
    email: str
    name: str
    
    # Auth-related fields
    status: str = "active"     # UserStatus enum value
    employee_id: Optional[str] = None  # Link to Employee record (Clean Architecture)
    is_onboarded: bool = False  # Derived: True if employee_id exists
    
    # Legacy org fields (migrating to Employee model)
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    role_id: Optional[str] = None
    role_name: Optional[str] = None
    grade_id: Optional[str] = None
    grade_name: Optional[str] = None
    reports_to: Optional[str] = None
    manager_name: Optional[str] = None
    title: Optional[str] = None
    
    # Contact info
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    
    # Azure AD License fields
    has_azure_license: Optional[bool] = None
    azure_licenses: Optional[List[str]] = None
    azure_license_count: Optional[int] = None
    azure_synced_at: Optional[str] = None
    
    # Metadata
    last_login: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    direct_reports: List[str] = []  # IDs of users reporting to this user
    
    class Config:
        extra = "ignore"


# ============== ORGANIZATION MODELS ==============

class OrganizationSettings(BaseModel):
    name: str = "Sevora"
    logo_url: Optional[str] = None
    primary_color: str = "#8B7355"
    timezone: str = "Asia/Kolkata"
    date_format: str = "DD/MM/YYYY"
    currency: str = "INR"
    currency_symbol: str = "₹"
    fiscal_year_start: str = "April"


# ============== PERMISSION MATRIX ==============

# All available modules with actions
MODULE_DEFINITIONS = {
    "marketing": {
        "contacts": {"name": "Contacts Hub", "actions": ["view", "create", "edit", "delete", "export"]},
        "campaigns": {"name": "Campaigns", "actions": ["view", "create", "edit", "delete", "export"]},
        "pipeline": {"name": "Pipeline", "actions": ["view", "create", "edit", "delete"]},
        "digital_pr": {"name": "Digital PR", "actions": ["view", "create", "edit", "delete"]},
        "events": {"name": "Events", "actions": ["view", "create", "edit", "delete"]},
        "assets": {"name": "Content & Assets", "actions": ["view", "create", "edit", "delete", "upload"]},
        "budget": {"name": "Budget", "actions": ["view", "create", "edit", "delete", "approve"]},
        "analytics": {"name": "Analytics", "actions": ["view", "export"]},
        "ai_tools": {"name": "AI Tools", "actions": ["view", "use"]},
    },
    "sales": {
        "leads": {"name": "Leads", "actions": ["view", "create", "edit", "delete", "export"]},
        "customers": {"name": "Customers", "actions": ["view", "create", "edit", "delete"]},
        "pipeline": {"name": "Sales Pipeline", "actions": ["view", "create", "edit", "delete"]},
        "quotes": {"name": "Quotes", "actions": ["view", "create", "edit", "delete"]},
        "analytics": {"name": "Sales Analytics", "actions": ["view", "export"]},
    },
    "social": {
        "dashboard": {"name": "Dashboard", "actions": ["view"]},
        "posts": {"name": "Posts", "actions": ["view", "create", "edit", "delete", "schedule"]},
        "content_studio": {"name": "Content Studio", "actions": ["view", "create", "edit"]},
        "library": {"name": "Content Library", "actions": ["view", "upload", "delete"]},
        "analytics": {"name": "Social Analytics", "actions": ["view", "export"]},
    },
    "mail": {
        "inbox": {"name": "Inbox", "actions": ["view", "send", "delete"]},
        "templates": {"name": "Templates", "actions": ["view", "create", "edit", "delete"]},
    },
    "admin": {
        "users": {"name": "User Management", "actions": ["view", "create", "edit", "delete"]},
        "departments": {"name": "Departments", "actions": ["view", "create", "edit", "delete"]},
        "roles": {"name": "Roles & Permissions", "actions": ["view", "create", "edit", "delete"]},
        "settings": {"name": "Organization Settings", "actions": ["view", "edit"]},
        "automations": {"name": "Automations", "actions": ["view", "edit"]},
    }
}


# Default role templates
DEFAULT_ROLE_TEMPLATES = {
    "super_admin": {
        "name": "Super Admin",
        "level": 100,
        "description": "Full system access with all permissions",
        "permissions": {dept: {mod: defn["actions"] for mod, defn in mods.items()} for dept, mods in MODULE_DEFINITIONS.items()}
    },
    "hr_admin": {
        "name": "HR Admin",
        "level": 80,
        "description": "Full HR department access including employee management",
        "permissions": {
            "hr": {mod: defn["actions"] for mod, defn in MODULE_DEFINITIONS.get("hr", {}).items()} if "hr" in MODULE_DEFINITIONS else {},
            "admin": {"users": ["view", "create", "edit"], "departments": ["view", "create", "edit"], "roles": ["view"]},
            "projects": {"projects": ["view"], "tasks": ["view"]},
        }
    },
    "finance_admin": {
        "name": "Finance Admin",
        "level": 80,
        "description": "Full finance and accounting access",
        "permissions": {
            "finance": {mod: defn["actions"] for mod, defn in MODULE_DEFINITIONS.get("finance", {}).items()} if "finance" in MODULE_DEFINITIONS else {},
            "admin": {"users": ["view"], "departments": ["view"]},
            "projects": {"projects": ["view"], "tasks": ["view"]},
        }
    },
    "it_admin": {
        "name": "IT Admin",
        "level": 80,
        "description": "IT infrastructure and system administration access",
        "permissions": {
            "admin": {mod: defn["actions"] for mod, defn in MODULE_DEFINITIONS.get("admin", {}).items()} if "admin" in MODULE_DEFINITIONS else {},
            "projects": {mod: defn["actions"] for mod, defn in MODULE_DEFINITIONS.get("projects", {}).items()} if "projects" in MODULE_DEFINITIONS else {},
        }
    },
    "project_manager": {
        "name": "Project Manager",
        "level": 60,
        "description": "Full project management access",
        "permissions": {
            "projects": {mod: defn["actions"] for mod, defn in MODULE_DEFINITIONS.get("projects", {}).items()} if "projects" in MODULE_DEFINITIONS else {},
            "admin": {"users": ["view"], "departments": ["view"]},
            "mail": {"inbox": ["view", "send"], "templates": ["view"]},
        }
    },
    "employee": {
        "name": "Employee",
        "level": 20,
        "description": "Basic employee access for daily operations",
        "permissions": {
            "hr": {"profile": ["view", "edit"], "leave": ["view", "create"], "attendance": ["view"]},
            "projects": {"projects": ["view"], "tasks": ["view", "create", "edit"]},
            "mail": {"inbox": ["view", "send"]},
        }
    },
    "admin": {
        "name": "Administrator",
        "level": 80,
        "description": "Administrative access (except system settings)",
        "permissions": {
            "marketing": {mod: defn["actions"] for mod, defn in MODULE_DEFINITIONS["marketing"].items()},
            "sales": {mod: defn["actions"] for mod, defn in MODULE_DEFINITIONS["sales"].items()},
            "social": {mod: defn["actions"] for mod, defn in MODULE_DEFINITIONS["social"].items()},
            "mail": {mod: defn["actions"] for mod, defn in MODULE_DEFINITIONS["mail"].items()},
            "admin": {"users": ["view", "create", "edit"], "departments": ["view"], "roles": ["view"]},
        }
    },
    "marketing_manager": {
        "name": "Marketing Manager",
        "level": 50,
        "description": "Full marketing department access",
        "permissions": {
            "marketing": {mod: defn["actions"] for mod, defn in MODULE_DEFINITIONS["marketing"].items()},
            "mail": {"inbox": ["view", "send"], "templates": ["view", "create", "edit"]},
        }
    },
    "marketing_exec": {
        "name": "Marketing Executive",
        "level": 30,
        "description": "Marketing operations access",
        "permissions": {
            "marketing": {
                "contacts": ["view", "create", "edit"],
                "campaigns": ["view", "create", "edit"],
                "pipeline": ["view", "edit"],
                "digital_pr": ["view", "create", "edit"],
                "events": ["view", "create"],
                "assets": ["view", "upload"],
                "analytics": ["view"],
                "ai_tools": ["view", "use"],
            },
            "mail": {"inbox": ["view", "send"]},
        }
    },
    "sales_manager": {
        "name": "Sales Manager",
        "level": 50,
        "description": "Full sales department access",
        "permissions": {
            "sales": {mod: defn["actions"] for mod, defn in MODULE_DEFINITIONS["sales"].items()},
            "mail": {"inbox": ["view", "send"], "templates": ["view", "create", "edit"]},
        }
    },
    "sales_exec": {
        "name": "Sales Executive",
        "level": 30,
        "description": "Sales operations access",
        "permissions": {
            "sales": {
                "leads": ["view", "create", "edit"],
                "customers": ["view", "create", "edit"],
                "pipeline": ["view", "edit"],
                "quotes": ["view", "create"],
                "analytics": ["view"],
            },
            "mail": {"inbox": ["view", "send"]},
        }
    },
    "social_manager": {
        "name": "Social Media Manager",
        "level": 50,
        "description": "Full social media access",
        "permissions": {
            "social": {mod: defn["actions"] for mod, defn in MODULE_DEFINITIONS["social"].items()},
            "mail": {"inbox": ["view", "send"]},
        }
    },
    "viewer": {
        "name": "Viewer",
        "level": 10,
        "description": "Read-only access to view data only",
        "permissions": {
            "marketing": {mod: ["view"] for mod in MODULE_DEFINITIONS["marketing"].keys()},
            "sales": {mod: ["view"] for mod in MODULE_DEFINITIONS["sales"].keys()},
        }
    }
}
