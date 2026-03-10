"""
Access Control Models - Custom Roles, Module Access, Permissions
Clean separation between User (Auth) and Employee (HR + Access)
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime


# ============== USER STATUS (Auth Only) ==============

class UserStatus(str, Enum):
    DRAFT = "draft"          # Auto-created from Microsoft, pending onboarding
    ONBOARDED = "onboarded"  # Employee record created, pending activation
    ACTIVE = "active"        # Fully active user
    INACTIVE = "inactive"    # Deactivated account


# ============== MODULES ==============

class SystemModule(str, Enum):
    DASHBOARD = "dashboard"
    MARKETING_OPS = "marketing_ops"
    PROJECT_MANAGEMENT = "project_management"
    MAIL = "mail"
    SOCIAL = "social"
    ADMIN = "admin"
    HR = "hr"
    HELP_SUPPORT = "help_support"
    AUTOMATIONS = "automations"
    MEETINGS = "meetings"
    COMMUNICATION_HUB = "communication_hub"
    SYSTEMS = "systems"


# Module definitions with display info
MODULE_DEFINITIONS = {
    "dashboard": {
        "name": "Dashboard",
        "description": "Overview and analytics",
        "icon": "LayoutDashboard",
        "routes": ["/", "/overview"],
        "default_access": True  # Everyone gets this
    },
    "marketing_ops": {
        "name": "Marketing Ops",
        "description": "Marketing campaigns, content, and analytics",
        "icon": "Target",
        "routes": ["/marketing", "/influencers", "/publications", "/campaign-hub", "/pipeline", "/content", "/budget", "/ai-tools"],
        "default_access": False
    },
    "project_management": {
        "name": "Project Management",
        "description": "Projects, tasks, and team collaboration",
        "icon": "FolderKanban",
        "routes": ["/projects", "/my-tasks", "/manager-dashboard"],
        "default_access": False
    },
    "mail": {
        "name": "Mail",
        "description": "Email management and templates",
        "icon": "Mail",
        "routes": ["/mail"],
        "default_access": False
    },
    "social": {
        "name": "Social",
        "description": "Social media management and analytics",
        "icon": "Youtube",
        "routes": ["/social"],
        "default_access": False
    },
    "admin": {
        "name": "Administration",
        "description": "System administration and settings",
        "icon": "Settings",
        "routes": ["/admin"],
        "default_access": False
    },
    "hr": {
        "name": "HR Management",
        "description": "Employee and organization management",
        "icon": "Users",
        "routes": ["/admin/employees", "/admin/org-structure", "/admin/organization"],
        "default_access": False
    },
    "help_support": {
        "name": "Help & Support",
        "description": "Help center and support tickets",
        "icon": "HelpCircle",
        "routes": ["/help"],
        "default_access": True  # Everyone gets this
    },
    "automations": {
        "name": "Automations",
        "description": "Workflow automations and scheduled tasks",
        "icon": "Zap",
        "routes": ["/settings/automations"],
        "default_access": False  # NOT given to viewers
    },
    "meetings": {
        "name": "Meetings",
        "description": "Meeting management and scheduling",
        "icon": "Calendar",
        "routes": ["/meetings"],
        "default_access": False
    },
    "communication_hub": {
        "name": "Communication Hub",
        "description": "Teams, Calendar, and Email integrations",
        "icon": "MessageSquare",
        "routes": ["/teams", "/mail"],
        "default_access": False
    },
    "systems": {
        "name": "Systems",
        "description": "System configuration, integrations, and advanced settings",
        "icon": "Server",
        "routes": ["/systems", "/systems/integrations", "/systems/config"],
        "default_access": False
    }
}


# ============== MODULE PERMISSIONS ==============

class ModulePermissions(BaseModel):
    create: bool = True
    read: bool = True
    update: bool = True
    delete: bool = True


# ============== CUSTOM ROLE MODELS ==============

class CustomRoleCreate(BaseModel):
    name: str  # e.g., "Marketing Manager", "HR Admin"
    code: str  # e.g., "marketing_manager", "hr_admin"
    description: Optional[str] = None
    module_access: List[str] = []  # List of module keys
    module_permissions: Dict[str, ModulePermissions] = {}  # CRUD per module
    is_system_role: bool = False  # True for built-in roles
    can_manage_users: bool = False
    can_manage_employees: bool = False
    can_manage_roles: bool = False


class CustomRoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    module_access: Optional[List[str]] = None
    module_permissions: Optional[Dict[str, dict]] = None  # CRUD per module
    can_manage_users: Optional[bool] = None
    can_manage_employees: Optional[bool] = None
    can_manage_roles: Optional[bool] = None
    is_active: Optional[bool] = None


class CustomRoleResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    module_access: List[str] = []
    module_permissions: Dict[str, dict] = {}  # CRUD per module
    module_names: List[str] = []  # Human readable module names
    is_system_role: bool = False
    can_manage_users: bool = False
    can_manage_employees: bool = False
    can_manage_roles: bool = False
    is_active: bool = True
    employee_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        extra = "ignore"


# ============== DEFAULT CUSTOM ROLES ==============

DEFAULT_CUSTOM_ROLES = [
    {
        "name": "Super Admin",
        "code": "super_admin",
        "description": "Full system access with all administrative privileges",
        "module_access": ["dashboard", "marketing_ops", "project_management", "mail", "social", "admin", "hr", "help_support", "automations", "meetings", "communication_hub"],
        "is_system_role": True,
        "can_manage_users": True,
        "can_manage_employees": True,
        "can_manage_roles": True
    },
    {
        "name": "HR Admin",
        "code": "hr_admin",
        "description": "Manage employees, onboarding, and organizational structure",
        "module_access": ["dashboard", "hr", "help_support", "automations"],
        "is_system_role": True,
        "can_manage_users": True,
        "can_manage_employees": True,
        "can_manage_roles": False
    },
    {
        "name": "Marketing Manager",
        "code": "marketing_manager",
        "description": "Marketing operations, campaigns, and social media",
        "module_access": ["dashboard", "marketing_ops", "social", "project_management", "help_support", "meetings", "communication_hub"],
        "is_system_role": True,
        "can_manage_users": False,
        "can_manage_employees": False,
        "can_manage_roles": False
    },
    {
        "name": "Project Manager",
        "code": "project_manager",
        "description": "Project and task management",
        "module_access": ["dashboard", "project_management", "help_support", "meetings", "automations"],
        "is_system_role": True,
        "can_manage_users": False,
        "can_manage_employees": False,
        "can_manage_roles": False
    },
    {
        "name": "Sales Manager",
        "code": "sales_manager",
        "description": "Sales operations and customer management",
        "module_access": ["dashboard", "project_management", "mail", "help_support", "meetings", "communication_hub"],
        "is_system_role": True,
        "can_manage_users": False,
        "can_manage_employees": False,
        "can_manage_roles": False
    },
    {
        "name": "Content Creator",
        "code": "content_creator",
        "description": "Content creation and social media posting",
        "module_access": ["dashboard", "marketing_ops", "social", "help_support"],
        "is_system_role": True,
        "can_manage_users": False,
        "can_manage_employees": False,
        "can_manage_roles": False
    },
    {
        "name": "Employee",
        "code": "employee",
        "description": "Basic employee access - view own profile and assigned tasks",
        "module_access": ["dashboard", "project_management", "help_support", "meetings"],
        "is_system_role": True,
        "can_manage_users": False,
        "can_manage_employees": False,
        "can_manage_roles": False
    },
    {
        "name": "Viewer",
        "code": "viewer",
        "description": "Read-only access to basic modules - NO automation access",
        "module_access": ["dashboard", "help_support"],
        "is_system_role": True,
        "can_manage_users": False,
        "can_manage_employees": False,
        "can_manage_roles": False
    }
]


# ============== ONBOARDING MODELS ==============

class OnboardingData(BaseModel):
    """Data required to complete employee onboarding"""
    # Organization
    department_id: str
    team_id: Optional[str] = None
    position_id: Optional[str] = None
    grade_id: Optional[str] = None
    reports_to: Optional[str] = None
    secondary_manager_id: Optional[str] = None
    
    # Employment
    designation: Optional[str] = None
    employment_type: str = "full_time"
    work_mode: str = "office"
    joining_date: Optional[str] = None
    
    # Access Control - Multi-role support
    custom_role_ids: List[str] = []  # Required - determines module access (supports multiple roles)
    
    # Personal (optional during onboarding)
    phone: Optional[str] = None
    gender: Optional[str] = None
    work_location: Optional[str] = None


class OnboardingResponse(BaseModel):
    user_id: str
    employee_id: str
    employee_code: str  # EMP-0001
    status: str
    message: str


# ============== USER AUTH MODEL (Simplified) ==============

class UserAuthResponse(BaseModel):
    """User model for authentication - NO organizational data"""
    id: str
    email: str
    name: str
    microsoft_id: Optional[str] = None
    status: str = "draft"  # draft, onboarded, active, inactive
    avatar_url: Optional[str] = None
    last_login: Optional[str] = None
    created_at: Optional[str] = None
    
    # Link to employee (if onboarded)
    employee_id: Optional[str] = None
    is_onboarded: bool = False
    
    class Config:
        extra = "ignore"


# ============== EMPLOYEE WITH ACCESS ==============

class EmployeeWithAccess(BaseModel):
    """Employee model with access control info"""
    id: str
    user_id: str
    employee_id: str  # EMP-0001
    email: str
    name: str
    
    # Organization
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    team_id: Optional[str] = None
    team_name: Optional[str] = None
    position_id: Optional[str] = None
    position_title: Optional[str] = None
    grade_id: Optional[str] = None
    grade_name: Optional[str] = None
    reports_to: Optional[str] = None
    manager_name: Optional[str] = None
    
    # Employment
    designation: Optional[str] = None
    employment_type: str = "full_time"
    work_mode: str = "office"
    status: str = "active"
    joining_date: Optional[str] = None
    
    # Access Control - Multi-role support
    custom_role_ids: List[str] = []
    custom_role_names: List[str] = []
    module_access: List[str] = []
    can_manage_users: bool = False
    can_manage_employees: bool = False
    can_manage_roles: bool = False
    
    class Config:
        extra = "ignore"


# ============== PERMISSION CHECK RESPONSE ==============

class PermissionCheckResponse(BaseModel):
    has_access: bool
    module: str
    user_id: str
    employee_id: Optional[str] = None
    role_name: Optional[str] = None
    reason: str
