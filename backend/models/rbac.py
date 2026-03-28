"""
Unified RBAC (Role-Based Access Control) Models
Clean, streamlined permission system with:
- Multiple roles per user
- CRUD permissions per module
- Data scope levels (Own, Team, Department, All)
- Automatic module registration
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


# ============== ENUMS ==============

class DataScope(str, Enum):
    """Data visibility scope for a module"""
    OWN = "own"                    # See only own records (created_by = user)
    OWN_ASSIGNED = "own_assigned"  # See own + assigned records
    TEAM = "team"                  # See team/department records
    DEPARTMENT = "department"      # See department records
    REPORTEES = "reportees"        # See data of all direct/indirect reports
    ALL = "all"                    # See all records


class CRUDAction(str, Enum):
    """CRUD operations"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"


# ============== MODULE DEFINITION ==============

class ModuleDefinition(BaseModel):
    """Definition of a system module"""
    code: str                           # Unique identifier (e.g., "marketing_ops")
    name: str                           # Display name
    description: str = ""
    icon: str = "Box"                   # Lucide icon name
    category: str = "general"           # Module category for grouping
    routes: List[str] = []              # Associated frontend routes
    is_default: bool = False            # Auto-granted to all users
    is_active: bool = True
    parent_module: Optional[str] = None # For sub-modules
    sort_order: int = 100


class ModulePermission(BaseModel):
    """Permission settings for a module within a role"""
    # CRUD permissions
    create: bool = False
    read: bool = True
    update: bool = False
    delete: bool = False
    
    # Data scope
    data_scope: DataScope = DataScope.OWN
    
    # Advanced permissions
    can_edit_others: bool = False      # Can edit records created by others
    can_delete_others: bool = False    # Can delete records created by others
    can_approve: bool = False          # Can approve/reject (for workflow modules)
    can_export: bool = False           # Can export data
    can_bulk_edit: bool = False        # Can bulk update records
    
    def to_dict(self) -> dict:
        return {
            "create": self.create,
            "read": self.read,
            "update": self.update,
            "delete": self.delete,
            "data_scope": self.data_scope.value if isinstance(self.data_scope, DataScope) else self.data_scope,
            "can_edit_others": self.can_edit_others,
            "can_delete_others": self.can_delete_others,
            "can_approve": self.can_approve,
            "can_export": self.can_export,
            "can_bulk_edit": self.can_bulk_edit
        }


# ============== ROLE MODELS ==============

class RoleCreate(BaseModel):
    """Create a new role"""
    name: str
    code: str
    description: Optional[str] = None
    module_access: List[str] = []                          # List of module codes
    module_permissions: Dict[str, Dict[str, Any]] = {}     # {module_code: ModulePermission}
    is_system_role: bool = False
    can_manage_users: bool = False
    can_manage_roles: bool = False


class RoleUpdate(BaseModel):
    """Update an existing role"""
    name: Optional[str] = None
    description: Optional[str] = None
    module_access: Optional[List[str]] = None
    module_permissions: Optional[Dict[str, Dict[str, Any]]] = None
    can_manage_users: Optional[bool] = None
    can_manage_roles: Optional[bool] = None
    is_active: Optional[bool] = None


class RoleResponse(BaseModel):
    """Role response with computed fields"""
    id: str
    name: str
    code: str
    description: Optional[str] = None
    module_access: List[str] = []
    module_permissions: Dict[str, Dict[str, Any]] = {}
    module_names: List[str] = []                # Human-readable module names
    is_system_role: bool = False
    can_manage_users: bool = False
    can_manage_roles: bool = False
    is_active: bool = True
    user_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        extra = "ignore"


# ============== USER PERMISSION MODELS ==============

class UserRoleAssignment(BaseModel):
    """Assign roles to a user"""
    user_id: str
    role_ids: List[str]                              # Multiple roles supported
    additional_modules: List[str] = []               # Extra modules beyond roles
    custom_permissions: Dict[str, Dict[str, Any]] = {}  # Per-module overrides


class EffectivePermissions(BaseModel):
    """Computed effective permissions for a user"""
    user_id: str
    roles: List[Dict[str, Any]] = []                 # List of assigned roles
    modules: List[str] = []                          # All accessible modules
    permissions: Dict[str, Dict[str, Any]] = {}      # Merged permissions per module
    is_admin: bool = False
    can_manage_users: bool = False
    can_manage_roles: bool = False


# ============== DEFAULT PERMISSIONS ==============

# Default permission levels for quick assignment
PERMISSION_PRESETS = {
    "viewer": ModulePermission(
        create=False, read=True, update=False, delete=False,
        data_scope=DataScope.OWN_ASSIGNED,
        can_edit_others=False, can_delete_others=False
    ),
    "editor": ModulePermission(
        create=True, read=True, update=True, delete=False,
        data_scope=DataScope.TEAM,
        can_edit_others=False, can_delete_others=False
    ),
    "manager": ModulePermission(
        create=True, read=True, update=True, delete=True,
        data_scope=DataScope.DEPARTMENT,
        can_edit_others=True, can_delete_others=False
    ),
    "admin": ModulePermission(
        create=True, read=True, update=True, delete=True,
        data_scope=DataScope.ALL,
        can_edit_others=True, can_delete_others=True,
        can_approve=True, can_export=True, can_bulk_edit=True
    )
}


# ============== MODULE REGISTRY ==============

# Central registry of all system modules
# New modules should be added here to auto-appear in RBAC
SYSTEM_MODULES: Dict[str, ModuleDefinition] = {
    # Core / Default Access
    "dashboard": ModuleDefinition(
        code="dashboard", name="Dashboard", 
        description="Overview and analytics dashboard",
        icon="LayoutDashboard", category="core", is_default=True, sort_order=1
    ),
    "notifications": ModuleDefinition(
        code="notifications", name="Notifications",
        description="Notification center",
        icon="Bell", category="core", is_default=True, sort_order=2
    ),
    "help_support": ModuleDefinition(
        code="help_support", name="Help & Support",
        description="Help center and documentation",
        icon="HelpCircle", category="core", is_default=True, sort_order=3
    ),
    
    # Collaboration
    "sevora_pulse": ModuleDefinition(
        code="sevora_pulse", name="Sevora Pulse",
        description="Internal collaboration, updates, and recognition",
        icon="Activity", category="collaboration", is_default=True, sort_order=10
    ),
    "communication_hub": ModuleDefinition(
        code="communication_hub", name="Communication Hub",
        description="Teams, Calendar, and Email integrations",
        icon="MessageSquare", category="collaboration", sort_order=11
    ),
    "meetings": ModuleDefinition(
        code="meetings", name="Meetings",
        description="Meeting management and scheduling",
        icon="Calendar", category="collaboration", sort_order=12
    ),
    
    # Operations
    "project_management": ModuleDefinition(
        code="project_management", name="Project Management",
        description="Projects, tasks, sprints, and Kanban boards",
        icon="FolderKanban", category="operations", sort_order=20
    ),
    "operational_tasks": ModuleDefinition(
        code="operational_tasks", name="Tasks",
        description="Cross-module task management",
        icon="ClipboardList", category="operations", sort_order=21
    ),
    "goals": ModuleDefinition(
        code="goals", name="Goals & OKRs",
        description="Company, department, and personal goals",
        icon="Target", category="operations", sort_order=22
    ),
    
    # Business
    "marketing_ops": ModuleDefinition(
        code="marketing_ops", name="Marketing Ops",
        description="Campaigns, content, influencers, and budget",
        icon="Megaphone", category="business", sort_order=30
    ),
    "sales": ModuleDefinition(
        code="sales", name="Sales & CRM",
        description="Leads, customers, deals, and pipeline",
        icon="TrendingUp", category="business", sort_order=31
    ),
    "sourcing": ModuleDefinition(
        code="sourcing", name="Buying & Sourcing",
        description="Brands, suppliers, and procurement",
        icon="Package", category="business", sort_order=32
    ),
    "social": ModuleDefinition(
        code="social", name="Social Media",
        description="Social media management and analytics",
        icon="Share2", category="business", sort_order=33
    ),
    "mail": ModuleDefinition(
        code="mail", name="Mail",
        description="Email management and templates",
        icon="Mail", category="business", sort_order=34
    ),
    
    # HR & Finance
    "hr": ModuleDefinition(
        code="hr", name="HR Management",
        description="Employee management and organization",
        icon="Users", category="hr_finance", sort_order=40
    ),
    "expense": ModuleDefinition(
        code="expense", name="Expense Management",
        description="Expense claims and reimbursements",
        icon="Receipt", category="hr_finance", sort_order=41
    ),
    "employee_self_service": ModuleDefinition(
        code="employee_self_service", name="Self Service",
        description="Employee self-service tools",
        icon="UserCircle", category="hr_finance", is_default=True, sort_order=42
    ),
    
    # Analytics & Insights
    "analytics_insights": ModuleDefinition(
        code="analytics_insights", name="Analytics & Insights",
        description="Business intelligence and reporting",
        icon="BarChart3", category="analytics", sort_order=50
    ),
    
    # Administration
    "admin": ModuleDefinition(
        code="admin", name="Administration",
        description="User management, roles, and settings",
        icon="Settings", category="admin", sort_order=60
    ),
    "systems": ModuleDefinition(
        code="systems", name="Systems",
        description="System configuration and integrations",
        icon="Server", category="admin", sort_order=61
    ),
    "automations": ModuleDefinition(
        code="automations", name="Automations",
        description="Workflow automations and triggers",
        icon="Zap", category="admin", sort_order=62
    ),
    "audit_log": ModuleDefinition(
        code="audit_log", name="Audit Log",
        description="Track user activities and system changes",
        icon="FileSearch", category="admin", sort_order=63
    ),
    "knowledge_base": ModuleDefinition(
        code="knowledge_base", name="Knowledge Base",
        description="Internal wiki and documentation",
        icon="BookOpen", category="collaboration", sort_order=13
    ),
}


# ============== DEFAULT ROLES ==============

DEFAULT_ROLES = [
    {
        "name": "Super Admin",
        "code": "super_admin",
        "description": "Full system access with all administrative privileges",
        "module_access": list(SYSTEM_MODULES.keys()),
        "module_permissions": {
            module: PERMISSION_PRESETS["admin"].to_dict()
            for module in SYSTEM_MODULES.keys()
        },
        "is_system_role": True,
        "can_manage_users": True,
        "can_manage_roles": True
    },
    {
        "name": "HR Admin",
        "code": "hr_admin",
        "description": "Manage employees, onboarding, and organizational structure",
        "module_access": ["dashboard", "sevora_pulse", "hr", "expense", "analytics_insights", "goals", "notifications", "help_support"],
        "module_permissions": {
            "hr": PERMISSION_PRESETS["admin"].to_dict(),
            "expense": PERMISSION_PRESETS["manager"].to_dict(),
        },
        "is_system_role": True,
        "can_manage_users": True,
        "can_manage_roles": False
    },
    {
        "name": "Finance Admin",
        "code": "finance_admin",
        "description": "Manage expenses, approvals, and financial data",
        "module_access": ["dashboard", "sevora_pulse", "expense", "analytics_insights", "notifications", "help_support"],
        "module_permissions": {
            "expense": PERMISSION_PRESETS["admin"].to_dict(),
        },
        "is_system_role": True,
        "can_manage_users": False,
        "can_manage_roles": False
    },
    {
        "name": "Project Manager",
        "code": "project_manager",
        "description": "Manage projects, tasks, and team collaboration",
        "module_access": ["dashboard", "sevora_pulse", "project_management", "operational_tasks", "goals", "meetings", "notifications", "help_support"],
        "module_permissions": {
            "project_management": PERMISSION_PRESETS["manager"].to_dict(),
            "operational_tasks": PERMISSION_PRESETS["manager"].to_dict(),
        },
        "is_system_role": True,
        "can_manage_users": False,
        "can_manage_roles": False
    },
    {
        "name": "Marketing Manager",
        "code": "marketing_manager",
        "description": "Marketing operations, campaigns, and social media",
        "module_access": ["dashboard", "sevora_pulse", "marketing_ops", "social", "analytics_insights", "project_management", "meetings", "notifications", "help_support"],
        "module_permissions": {
            "marketing_ops": PERMISSION_PRESETS["manager"].to_dict(),
            "social": PERMISSION_PRESETS["editor"].to_dict(),
        },
        "is_system_role": True,
        "can_manage_users": False,
        "can_manage_roles": False
    },
    {
        "name": "Sales Manager",
        "code": "sales_manager",
        "description": "Sales operations and customer management",
        "module_access": ["dashboard", "sevora_pulse", "sales", "mail", "analytics_insights", "meetings", "notifications", "help_support"],
        "module_permissions": {
            "sales": PERMISSION_PRESETS["manager"].to_dict(),
        },
        "is_system_role": True,
        "can_manage_users": False,
        "can_manage_roles": False
    },
    {
        "name": "Sourcing Manager",
        "code": "sourcing_manager",
        "description": "Buying, sourcing, and supplier management",
        "module_access": ["dashboard", "sevora_pulse", "sourcing", "expense", "project_management", "meetings", "notifications", "help_support"],
        "module_permissions": {
            "sourcing": PERMISSION_PRESETS["manager"].to_dict(),
        },
        "is_system_role": True,
        "can_manage_users": False,
        "can_manage_roles": False
    },
    {
        "name": "Team Member",
        "code": "team_member",
        "description": "Standard team member with basic access",
        "module_access": ["dashboard", "sevora_pulse", "project_management", "operational_tasks", "goals", "meetings", "employee_self_service", "notifications", "help_support"],
        "module_permissions": {
            "project_management": PERMISSION_PRESETS["editor"].to_dict(),
            "operational_tasks": PERMISSION_PRESETS["editor"].to_dict(),
        },
        "is_system_role": True,
        "can_manage_users": False,
        "can_manage_roles": False
    },
    {
        "name": "Viewer",
        "code": "viewer",
        "description": "Read-only access to basic modules",
        "module_access": ["dashboard", "sevora_pulse", "notifications", "help_support"],
        "module_permissions": {
            "dashboard": PERMISSION_PRESETS["viewer"].to_dict(),
            "sevora_pulse": PERMISSION_PRESETS["viewer"].to_dict(),
        },
        "is_system_role": True,
        "can_manage_users": False,
        "can_manage_roles": False
    }
]


def get_all_modules() -> List[Dict[str, Any]]:
    """Get all registered modules as a list of dicts"""
    return [
        {
            "code": m.code,
            "name": m.name,
            "description": m.description,
            "icon": m.icon,
            "category": m.category,
            "is_default": m.is_default,
            "is_active": m.is_active,
            "sort_order": m.sort_order
        }
        for m in sorted(SYSTEM_MODULES.values(), key=lambda x: x.sort_order)
    ]


def get_modules_by_category() -> Dict[str, List[Dict[str, Any]]]:
    """Get modules grouped by category"""
    categories = {}
    for module in sorted(SYSTEM_MODULES.values(), key=lambda x: x.sort_order):
        cat = module.category
        if cat not in categories:
            categories[cat] = []
        categories[cat].append({
            "code": module.code,
            "name": module.name,
            "description": module.description,
            "icon": module.icon,
            "is_default": module.is_default
        })
    return categories


def get_default_modules() -> List[str]:
    """Get list of default module codes (auto-granted to all users)"""
    return [m.code for m in SYSTEM_MODULES.values() if m.is_default]
