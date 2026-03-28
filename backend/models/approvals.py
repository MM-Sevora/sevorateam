"""
Approval Workflow Models
- Configurable approval chains
- Multi-level approval support
- Status tracking and audit trail
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


# ============== ENUMS ==============

class ApprovalStatus(str, Enum):
    """Status of an approval request"""
    DRAFT = "draft"                      # Not yet submitted
    PENDING = "pending"                  # Awaiting approval at current level
    APPROVED = "approved"                # Fully approved (all levels)
    REJECTED = "rejected"                # Rejected at any level
    CANCELLED = "cancelled"              # Cancelled by requester
    EXPIRED = "expired"                  # Auto-expired due to timeout


class ApprovalAction(str, Enum):
    """Actions an approver can take"""
    APPROVE = "approve"
    REJECT = "reject"
    REQUEST_CHANGES = "request_changes"
    DELEGATE = "delegate"
    ESCALATE = "escalate"


class ApprovalType(str, Enum):
    """Types of items that can require approval"""
    EXPENSE_CLAIM = "expense_claim"
    LEAVE_REQUEST = "leave_request"
    PURCHASE_REQUISITION = "purchase_requisition"
    TRAVEL_REQUEST = "travel_request"
    VENDOR_PAYMENT = "vendor_payment"
    BUDGET_REQUEST = "budget_request"
    CONTENT_APPROVAL = "content_approval"
    CUSTOM = "custom"


class ApproverType(str, Enum):
    """How to determine the approver"""
    REPORTING_MANAGER = "reporting_manager"  # User's reports_to
    DEPARTMENT_HEAD = "department_head"      # Department head
    SPECIFIC_USER = "specific_user"          # Specific user ID
    ROLE = "role"                            # Anyone with a specific role
    CUSTOM = "custom"                        # Custom logic


# ============== WORKFLOW CONFIGURATION ==============

class ApprovalLevelConfig(BaseModel):
    """Configuration for a single approval level"""
    level: int = 1                                    # Level number (1, 2, 3...)
    name: str = "Manager Approval"                    # Display name
    approver_type: ApproverType = ApproverType.REPORTING_MANAGER
    approver_id: Optional[str] = None                 # For SPECIFIC_USER type
    approver_role: Optional[str] = None               # For ROLE type
    is_required: bool = True                          # Whether this level is mandatory
    can_skip_if_same_as_previous: bool = True         # Skip if same approver as previous level
    auto_approve_if_self: bool = False                # Auto-approve if requester is the approver
    timeout_hours: Optional[int] = None               # Auto-escalate after this many hours
    escalation_user_id: Optional[str] = None          # Who to escalate to on timeout


class ApprovalWorkflowConfig(BaseModel):
    """Configuration for an approval workflow"""
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    approval_type: ApprovalType
    is_active: bool = True
    is_default: bool = False                          # Default workflow for this type
    
    # Conditions for when this workflow applies
    min_amount: Optional[float] = None                # Apply when amount >= this
    max_amount: Optional[float] = None                # Apply when amount <= this
    department_ids: List[str] = []                    # Apply to specific departments (empty = all)
    
    # Eligibility restrictions (who can submit requests using this workflow)
    eligible_department_ids: List[str] = []           # Limit to users in these departments (empty = all)
    eligible_role_ids: List[str] = []                 # Limit to users with these roles (empty = all)
    eligible_grade_ids: List[str] = []                # Limit to users with these grades (empty = all)
    eligible_user_ids: List[str] = []                 # Limit to specific users (empty = all)
    excluded_user_ids: List[str] = []                 # Explicitly exclude these users
    
    # Approval levels
    levels: List[ApprovalLevelConfig] = []
    
    # Settings
    allow_parallel_approval: bool = False             # All levels must approve simultaneously
    require_all_levels: bool = True                   # All levels must approve (vs any one)
    notify_on_action: bool = True                     # Send notifications
    
    # Metadata
    created_by: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ============== APPROVAL REQUEST ==============

class ApprovalLevelStatus(BaseModel):
    """Status of a single approval level"""
    level: int
    level_name: str
    approver_id: str
    approver_name: Optional[str] = None
    approver_email: Optional[str] = None
    status: ApprovalStatus = ApprovalStatus.PENDING
    action_taken: Optional[ApprovalAction] = None
    comments: Optional[str] = None
    action_at: Optional[str] = None
    delegated_to: Optional[str] = None
    delegated_at: Optional[str] = None


class ApprovalRequestCreate(BaseModel):
    """Create a new approval request"""
    approval_type: ApprovalType
    entity_type: str                        # e.g., "expense_claim", "leave_request"
    entity_id: str                          # ID of the entity being approved
    entity_title: str                       # Display title
    entity_details: Dict[str, Any] = {}     # Additional details for display
    amount: Optional[float] = None          # For amount-based routing
    department_id: Optional[str] = None     # For department-based routing
    workflow_id: Optional[str] = None       # Specific workflow to use (optional)
    notes: Optional[str] = None             # Requester notes


class ApprovalRequestResponse(BaseModel):
    """Approval request response"""
    id: str
    approval_type: str
    entity_type: str
    entity_id: str
    entity_title: str
    entity_details: Dict[str, Any] = {}
    
    # Requester
    requester_id: str
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    requester_department_id: Optional[str] = None
    
    # Status
    status: ApprovalStatus
    current_level: int
    total_levels: int
    
    # Approval chain
    approval_chain: List[ApprovalLevelStatus] = []
    
    # Metadata
    amount: Optional[float] = None
    notes: Optional[str] = None
    workflow_id: Optional[str] = None
    workflow_name: Optional[str] = None
    
    submitted_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        extra = "ignore"


class ApprovalActionRequest(BaseModel):
    """Request to take action on an approval"""
    action: ApprovalAction
    comments: Optional[str] = None
    delegate_to: Optional[str] = None       # For DELEGATE action


# ============== APPROVAL HISTORY ==============

class ApprovalHistoryEntry(BaseModel):
    """A single entry in approval history"""
    timestamp: str
    action: str
    actor_id: str
    actor_name: Optional[str] = None
    level: Optional[int] = None
    comments: Optional[str] = None
    details: Dict[str, Any] = {}


# ============== DEFAULT WORKFLOWS ==============

DEFAULT_APPROVAL_WORKFLOWS = [
    {
        "name": "Standard Expense Approval",
        "description": "Default expense claim approval workflow",
        "approval_type": "expense_claim",
        "is_active": True,
        "is_default": True,
        "levels": [
            {
                "level": 1,
                "name": "Manager Approval",
                "approver_type": "reporting_manager",
                "is_required": True,
                "can_skip_if_same_as_previous": False,
                "timeout_hours": 48
            },
            {
                "level": 2,
                "name": "Finance Approval",
                "approver_type": "role",
                "approver_role": "finance_admin",
                "is_required": True,
                "timeout_hours": 72
            }
        ],
        "require_all_levels": True,
        "notify_on_action": True
    },
    {
        "name": "High Value Expense Approval",
        "description": "For expenses above threshold - requires director approval",
        "approval_type": "expense_claim",
        "is_active": True,
        "is_default": False,
        "min_amount": 50000,
        "levels": [
            {
                "level": 1,
                "name": "Manager Approval",
                "approver_type": "reporting_manager",
                "is_required": True,
                "timeout_hours": 48
            },
            {
                "level": 2,
                "name": "Department Head Approval",
                "approver_type": "department_head",
                "is_required": True,
                "can_skip_if_same_as_previous": True,
                "timeout_hours": 48
            },
            {
                "level": 3,
                "name": "Finance Approval",
                "approver_type": "role",
                "approver_role": "finance_admin",
                "is_required": True,
                "timeout_hours": 72
            }
        ],
        "require_all_levels": True,
        "notify_on_action": True
    },
    {
        "name": "Standard Leave Approval",
        "description": "Default leave request approval workflow",
        "approval_type": "leave_request",
        "is_active": True,
        "is_default": True,
        "levels": [
            {
                "level": 1,
                "name": "Manager Approval",
                "approver_type": "reporting_manager",
                "is_required": True,
                "timeout_hours": 24
            }
        ],
        "require_all_levels": True,
        "notify_on_action": True
    },
    {
        "name": "Standard Purchase Requisition",
        "description": "Default purchase requisition approval",
        "approval_type": "purchase_requisition",
        "is_active": True,
        "is_default": True,
        "levels": [
            {
                "level": 1,
                "name": "Manager Approval",
                "approver_type": "reporting_manager",
                "is_required": True,
                "timeout_hours": 48
            },
            {
                "level": 2,
                "name": "Finance Approval",
                "approver_type": "role",
                "approver_role": "finance_admin",
                "is_required": True,
                "timeout_hours": 72
            }
        ],
        "require_all_levels": True,
        "notify_on_action": True
    },
    {
        "name": "Vendor Payment Approval",
        "description": "Approval for vendor payments",
        "approval_type": "vendor_payment",
        "is_active": True,
        "is_default": True,
        "levels": [
            {
                "level": 1,
                "name": "Requester's Manager",
                "approver_type": "reporting_manager",
                "is_required": True,
                "timeout_hours": 48
            },
            {
                "level": 2,
                "name": "Finance Team",
                "approver_type": "role",
                "approver_role": "finance_admin",
                "is_required": True,
                "timeout_hours": 72
            }
        ],
        "require_all_levels": True,
        "notify_on_action": True
    }
]
