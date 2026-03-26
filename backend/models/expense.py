"""
Expense & Reimbursement Models
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class ExpenseCategory(str, Enum):
    TRAVEL = "travel"
    FOOD = "food"
    ACCOMMODATION = "accommodation"
    OFFICE_SUPPLIES = "office_supplies"
    OTHERS = "others"


class ClaimStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    MANAGER_APPROVED = "manager_approved"  # Optional: for 2-level approval


class ExpenseEntry(BaseModel):
    """Single expense entry within a claim"""
    expense_date_from: str  # Date range start
    expense_date_to: str  # Date range end
    category: ExpenseCategory
    description: str
    amount: float
    receipt_url: Optional[str] = None  # Uploaded file URL
    receipt_filename: Optional[str] = None


class ExpenseClaimCreate(BaseModel):
    """Create new expense claim"""
    entries: List[ExpenseEntry]
    declaration_accepted: bool = False
    notes: Optional[str] = None


class ExpenseClaimUpdate(BaseModel):
    """Update expense claim (for HR actions)"""
    status: Optional[ClaimStatus] = None
    rejection_reason: Optional[str] = None
    approved_amount: Optional[float] = None
    hr_notes: Optional[str] = None


class ExpenseClaimEmployeeUpdate(BaseModel):
    """Update expense claim by employee (only for pending claims)"""
    entries: Optional[List[ExpenseEntry]] = None
    notes: Optional[str] = None


class ExpenseClaimResponse(BaseModel):
    """Expense claim response"""
    id: str
    claim_id: str  # SEVRC001 format
    employee_id: str
    employee_name: str
    employee_email: str
    employee_grade: Optional[str] = None
    department_name: Optional[str] = None
    
    entries: List[dict]
    total_amount: float
    approved_amount: Optional[float] = None
    
    status: str
    rejection_reason: Optional[str] = None
    hr_notes: Optional[str] = None
    
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    
    declaration_accepted: bool
    notes: Optional[str] = None
    
    created_at: str
    updated_at: Optional[str] = None


class ExpenseLimitConfig(BaseModel):
    """Expense limits by grade"""
    grade_id: str
    grade_name: str
    monthly_limit: float
    per_claim_limit: float
    requires_manager_approval: bool = False
    manager_approval_threshold: float = 10000  # Amount above which manager approval needed
