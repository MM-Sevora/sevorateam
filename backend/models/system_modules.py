"""
System Modules - Defines all sidebar modules with their sub-modules
Used for permission management at module and sub-module level
"""

from pydantic import BaseModel
from typing import List, Optional, Dict
from enum import Enum


class ModuleCategory(str, Enum):
    GENERAL = "general"           # Everyone gets access
    OPERATIONS = "operations"     # Team-based access
    BUSINESS = "business"         # Department-based access
    ADMINISTRATION = "admin"      # Admin-only access


# System Modules - Matches Sidebar exactly
SYSTEM_MODULES = {
    "sevora_pulse": {
        "code": "sevora_pulse",
        "name": "Sevora Pulse",
        "description": "Internal collaboration, work updates, recognitions",
        "icon": "Activity",
        "category": "general",
        "is_default": True,  # Everyone gets this by default
        "sub_modules": [
            {"code": "pulse_company_wall", "name": "Company Wall", "path": "/pulse"},
            {"code": "pulse_departments", "name": "Department Walls", "path": "/pulse/departments"},
            {"code": "pulse_updates", "name": "Work Updates", "path": "/pulse/updates"},
            {"code": "pulse_recognition", "name": "Recognition", "path": "/pulse/recognition"},
            {"code": "pulse_leadership", "name": "Leadership Dashboard", "path": "/pulse/leadership"},
        ]
    },
    "analytics_insights": {
        "code": "analytics_insights",
        "name": "Analytics & Insights",
        "description": "Team performance and business intelligence",
        "icon": "TrendingUp",
        "category": "general",
        "is_default": True,
        "sub_modules": [
            {"code": "analytics_dashboard", "name": "Team Dashboard", "path": "/analytics"},
            {"code": "analytics_reports", "name": "Reports", "path": "/analytics/reports"},
        ]
    },
    "goals": {
        "code": "goals",
        "name": "Goals & Objectives",
        "description": "Company, department and personal goal tracking",
        "icon": "Flag",
        "category": "operations",
        "is_default": False,
        "sub_modules": [
            {"code": "goals_dashboard", "name": "Dashboard", "path": "/goals"},
            {"code": "goals_strategic", "name": "Strategic Goals", "path": "/goals/strategic"},
            {"code": "goals_objectives", "name": "Objectives", "path": "/goals/objectives"},
            {"code": "goals_fiscal", "name": "Fiscal Years", "path": "/goals/fiscal-years"},
        ]
    },
    "communication_hub": {
        "code": "communication_hub",
        "name": "Communication Hub",
        "description": "Meetings, calendar, chat, and email",
        "icon": "CalendarDays",
        "category": "operations",
        "is_default": False,
        "sub_modules": [
            {"code": "comm_meetings", "name": "Meetings", "path": "/meetings"},
            {"code": "comm_schedule", "name": "Schedule Meeting", "path": "/meetings/new"},
            {"code": "comm_calendar", "name": "Teams Calendar", "path": "/teams/calendar"},
            {"code": "comm_chat", "name": "Teams Chat", "path": "/teams/chat"},
            {"code": "comm_inbox", "name": "Inbox", "path": "/mail/inbox"},
        ]
    },
    "project_management": {
        "code": "project_management",
        "name": "Project Management",
        "description": "Projects, tasks, and team collaboration",
        "icon": "FolderKanban",
        "category": "operations",
        "is_default": False,
        "sub_modules": [
            {"code": "pm_manager", "name": "Manager Dashboard", "path": "/projects/manager"},
            {"code": "pm_my_tasks", "name": "My Tasks", "path": "/projects/my-tasks"},
            {"code": "pm_projects", "name": "All Projects", "path": "/projects"},
            {"code": "pm_recurring", "name": "Recurring Tasks", "path": "/projects/recurring"},
        ]
    },
    "operational_tasks": {
        "code": "operational_tasks",
        "name": "Operational Tasks",
        "description": "Cross-module tasks, triggers, and activity feed",
        "icon": "ClipboardList",
        "category": "operations",
        "is_default": False,
        "sub_modules": [
            {"code": "tasks_all", "name": "All Tasks", "path": "/tasks"},
            {"code": "tasks_activities", "name": "Activity Feed", "path": "/tasks/activities"},
            {"code": "tasks_triggers", "name": "Smart Triggers", "path": "/tasks/triggers"},
        ]
    },
    "engineering": {
        "code": "engineering",
        "name": "Engineering",
        "description": "Software development, sprints, releases, and technical documentation",
        "icon": "Code",
        "category": "operations",
        "is_default": False,
        "sub_modules": [
            {"code": "eng_projects", "name": "Engineering Projects", "path": "/engineering/projects"},
            {"code": "eng_sprint_board", "name": "Sprint Board", "path": "/engineering/sprint-board"},
            {"code": "eng_backlog", "name": "Backlog", "path": "/engineering/backlog"},
            {"code": "eng_epics", "name": "Epics", "path": "/engineering/epics"},
            {"code": "eng_sprints", "name": "Sprint Planning", "path": "/engineering/sprints"},
            {"code": "eng_reports", "name": "Reports & Analytics", "path": "/engineering/reports"},
            {"code": "eng_roadmap", "name": "Roadmap", "path": "/engineering/roadmap"},
            {"code": "eng_releases", "name": "Releases", "path": "/engineering/releases"},
            {"code": "eng_workflows", "name": "Workflows", "path": "/engineering/workflows"},
            {"code": "eng_automations", "name": "Automations", "path": "/engineering/automations"},
            {"code": "eng_knowledge", "name": "Knowledge Base", "path": "/engineering/knowledge"},
        ]
    },
    "knowledge_base": {
        "code": "knowledge_base",
        "name": "Knowledge Base",
        "description": "Wiki-style documentation and knowledge management",
        "icon": "BookOpen",
        "category": "operations",
        "is_default": False,
        "sub_modules": [
            {"code": "kb_spaces", "name": "Spaces", "path": "/knowledge"},
            {"code": "kb_pages", "name": "Pages", "path": "/knowledge/pages"},
            {"code": "kb_templates", "name": "Templates", "path": "/knowledge/templates"},
        ]
    },
    "marketing_ops": {
        "code": "marketing_ops",
        "name": "Marketing Ops",
        "description": "Marketing campaigns, content, influencers, and analytics",
        "icon": "Target",
        "category": "business",
        "is_default": False,
        "sub_modules": [
            {"code": "mkt_dashboard", "name": "Insights & Analytics", "path": "/marketing"},
            {"code": "mkt_influencer_db", "name": "Influencer Database", "path": "/marketing/influencers"},
            {"code": "mkt_influencer_pipeline", "name": "Influencer Pipeline", "path": "/marketing/pipeline"},
            {"code": "mkt_publication_db", "name": "Publication Database", "path": "/marketing/publications"},
            {"code": "mkt_publication_pipeline", "name": "Publication Pipeline", "path": "/marketing/publications/pipeline"},
            {"code": "mkt_campaigns", "name": "Campaign Hub", "path": "/marketing/campaigns"},
            {"code": "mkt_ads", "name": "Digital Ads", "path": "/marketing/ads"},
            {"code": "mkt_assets", "name": "Creative Assets", "path": "/marketing/assets"},
            {"code": "mkt_content", "name": "Content Production", "path": "/marketing/content"},
            {"code": "mkt_ugc", "name": "UGC Promotion", "path": "/marketing/content-promotion"},
            {"code": "mkt_budget", "name": "Budget Management", "path": "/marketing/budget-management"},
            {"code": "mkt_ai", "name": "AI Tools", "path": "/marketing/ai-tools"},
            {"code": "mkt_settings", "name": "Settings", "path": "/marketing/settings"},
        ]
    },
    "sales": {
        "code": "sales",
        "name": "Sales & CRM",
        "description": "Leads, customers, deals, and sales pipeline",
        "icon": "ShoppingBag",
        "category": "business",
        "is_default": False,
        "sub_modules": [
            {"code": "sales_dashboard", "name": "Dashboard", "path": "/sales"},
            {"code": "sales_leads", "name": "Leads", "path": "/sales/leads"},
            {"code": "sales_customers", "name": "Customers", "path": "/sales/customers"},
            {"code": "sales_pipeline", "name": "Pipeline", "path": "/sales/pipeline"},
            {"code": "sales_wedding", "name": "Wedding Planner", "path": "/sales/wedding-planner"},
            {"code": "sales_qrcodes", "name": "QR Codes", "path": "/sales/qrcodes"},
            {"code": "sales_partners", "name": "Partners", "path": "/sales/partners"},
            {"code": "sales_analytics", "name": "Analytics", "path": "/sales/analytics"},
        ]
    },
    "social": {
        "code": "social",
        "name": "Social Media",
        "description": "Social media management, scheduling, and analytics",
        "icon": "PenTool",
        "category": "business",
        "is_default": False,
        "sub_modules": [
            {"code": "social_dashboard", "name": "Dashboard & Analytics", "path": "/social"},
            {"code": "social_inbox", "name": "Inbox", "path": "/social/inbox"},
            {"code": "social_messages", "name": "Direct Messages", "path": "/social/messages"},
            {"code": "social_listening", "name": "Social Listening", "path": "/social/listening"},
            {"code": "social_integrations", "name": "Platform Integrations", "path": "/social/integrations"},
            {"code": "social_engagement", "name": "Engagement Tracker", "path": "/social/engagement"},
            {"code": "social_campaigns", "name": "Campaigns", "path": "/social/campaigns"},
            {"code": "social_studio", "name": "Content Studio", "path": "/social/studio"},
            {"code": "social_posts", "name": "Posts & Schedule", "path": "/social/posts"},
            {"code": "social_queues", "name": "Posting Queues", "path": "/social/queues"},
            {"code": "social_autoreply", "name": "Auto-Reply Rules", "path": "/social/auto-reply"},
            {"code": "social_workflows", "name": "Approval Workflows", "path": "/social/workflows"},
            {"code": "social_library", "name": "Content Library", "path": "/social/library"},
        ]
    },
    "sourcing": {
        "code": "sourcing",
        "name": "Buying & Sourcing",
        "description": "Brand discovery, suppliers, manufacturers, and procurement",
        "icon": "Package",
        "category": "business",
        "is_default": False,
        "sub_modules": [
            {"code": "sourcing_dashboard", "name": "Dashboard", "path": "/sourcing"},
            {"code": "sourcing_brands_db", "name": "Brands Database", "path": "/sourcing/brands"},
            {"code": "sourcing_brands_pipeline", "name": "Brands Pipeline", "path": "/sourcing/brands/pipeline"},
            {"code": "sourcing_suppliers_db", "name": "Suppliers Database", "path": "/sourcing/suppliers"},
            {"code": "sourcing_suppliers_pipeline", "name": "Suppliers Pipeline", "path": "/sourcing/suppliers/pipeline"},
            {"code": "sourcing_mfg_db", "name": "Manufacturers Database", "path": "/sourcing/manufacturers"},
            {"code": "sourcing_mfg_pipeline", "name": "Manufacturers Pipeline", "path": "/sourcing/manufacturers/pipeline"},
            {"code": "sourcing_samples", "name": "Samples", "path": "/sourcing/samples"},
            {"code": "sourcing_discovery", "name": "AI Discovery", "path": "/sourcing/discovery"},
            {"code": "sourcing_campaigns", "name": "Email Campaigns", "path": "/sourcing/campaigns"},
            {"code": "sourcing_calendar", "name": "Follow-up Calendar", "path": "/sourcing/calendar"},
            {"code": "sourcing_settings", "name": "Settings", "path": "/sourcing/settings"},
        ]
    },
    "admin": {
        "code": "admin",
        "name": "Administration",
        "description": "User management, HR, Finance, and system administration",
        "icon": "Settings",
        "category": "admin",
        "is_default": False,
        "sub_modules": [
            {"code": "admin_tools", "name": "Tools Access (IT)", "path": "/it-admin/tools-access"},
            {"code": "admin_employees", "name": "Employee Database (HR)", "path": "/admin/employees"},
            {"code": "admin_organization", "name": "Organization (HR)", "path": "/admin/organization"},
            {"code": "admin_reimbursements", "name": "Reimbursements (HR)", "path": "/hr/expenses"},
            {"code": "admin_budgets", "name": "Budget Planning (Finance)", "path": "/finance/budgets"},
            {"code": "admin_payments", "name": "Payment Requests (Finance)", "path": "/finance/payments"},
            {"code": "admin_vendors", "name": "Vendor Management (Finance)", "path": "/vendors"},
            {"code": "admin_users", "name": "User Management", "path": "/admin/users"},
            {"code": "admin_permissions", "name": "Permissions", "path": "/admin/access-control"},
            {"code": "admin_modules", "name": "System Modules", "path": "/admin/system-modules"},
        ]
    },
    "systems": {
        "code": "systems",
        "name": "Systems",
        "description": "Integrations, configuration, and system settings",
        "icon": "Server",
        "category": "admin",
        "is_default": False,
        "sub_modules": [
            {"code": "sys_overview", "name": "Overview", "path": "/systems"},
            {"code": "sys_integrations", "name": "Integrations", "path": "/systems/integrations"},
            {"code": "sys_config", "name": "Configuration", "path": "/systems/config"},
            {"code": "sys_website", "name": "Website Settings", "path": "/admin/website-settings"},
        ]
    },
    "automations": {
        "code": "automations",
        "name": "Automations",
        "description": "Workflow automation and triggers",
        "icon": "Zap",
        "category": "admin",
        "is_default": False,
        "sub_modules": [
            {"code": "auto_settings", "name": "Automation Settings", "path": "/settings/automations"},
        ]
    },
    "notifications": {
        "code": "notifications",
        "name": "Alerts & Notifications",
        "description": "Notification center and alert management",
        "icon": "Bell",
        "category": "general",
        "is_default": True,
        "sub_modules": [
            {"code": "notif_center", "name": "Notification Center", "path": "/notifications"},
        ]
    },
    "help_support": {
        "code": "help_support",
        "name": "Help & Support",
        "description": "Help center, documentation, and support",
        "icon": "HelpCircle",
        "category": "general",
        "is_default": True,
        "sub_modules": [
            {"code": "help_center", "name": "Help Center", "path": "/help"},
        ]
    },
    "employee_self_service": {
        "code": "employee_self_service",
        "name": "Self Service",
        "description": "Employee tools for expense claims and reimbursements",
        "icon": "UserCircle",
        "category": "hr",
        "is_default": True,  # All authenticated users get access
        "sub_modules": [
            {"code": "ess_expenses", "name": "My Expense Claims", "path": "/employee/expenses"},
        ]
    },
}


# Pydantic Models for API
class SubModuleSchema(BaseModel):
    code: str
    name: str
    path: str
    is_active: bool = True


class SystemModuleSchema(BaseModel):
    code: str
    name: str
    description: str
    icon: str
    category: str
    is_default: bool
    sub_modules: List[SubModuleSchema]
    # Metadata for organization
    department: Optional[str] = None
    team: Optional[str] = None
    tags: List[str] = []


class ModuleAccessEntry(BaseModel):
    module_code: str
    has_access: bool = True
    sub_module_access: Dict[str, bool] = {}  # sub_module_code -> has_access


class UserModulePermissions(BaseModel):
    user_id: str
    module_access: List[ModuleAccessEntry]


# Helper to get all module codes
def get_all_module_codes() -> List[str]:
    return list(SYSTEM_MODULES.keys())


def get_default_modules() -> List[str]:
    """Get modules that are default/general for all users"""
    return [code for code, mod in SYSTEM_MODULES.items() if mod.get("is_default", False)]


def get_modules_by_category(category: str) -> List[dict]:
    """Get all modules in a category"""
    return [mod for mod in SYSTEM_MODULES.values() if mod.get("category") == category]
