"""
Marketing Budget Models - Database schemas for budget management

Collections:
- marketing_budgets: Budget allocations by period/department/campaign
- marketing_budget_items: Individual line items within budgets
- marketing_expenses: Actual expenses tracked against budgets
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


# ============== ENUMS ==============

class BudgetPeriod(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CAMPAIGN = "campaign"  # Campaign-specific budget


class BudgetStatus(str, Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    ACTIVE = "active"
    CLOSED = "closed"
    OVERSPENT = "overspent"


class BudgetCategory(str, Enum):
    DIGITAL_ADS = "digital_ads"
    INFLUENCER = "influencer"
    CONTENT_PRODUCTION = "content_production"
    PR_COMMUNICATIONS = "pr_communications"
    EVENTS = "events"
    CREATIVE_AGENCY = "creative_agency"
    SOFTWARE_TOOLS = "software_tools"
    RESEARCH = "research"
    PARTNERSHIPS = "partnerships"
    OTHER = "other"


class ExpenseStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    REJECTED = "rejected"


class ExpenseType(str, Enum):
    AD_SPEND = "ad_spend"
    INFLUENCER_FEE = "influencer_fee"
    PRODUCTION_COST = "production_cost"
    AGENCY_FEE = "agency_fee"
    SOFTWARE = "software"
    EVENT = "event"
    MEDIA_BUY = "media_buy"
    CREATIVE = "creative"
    OTHER = "other"


# ============== BUDGET ==============

class BudgetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    
    period: BudgetPeriod
    fiscal_year: int
    quarter: Optional[int] = None  # 1-4 if quarterly
    month: Optional[int] = None  # 1-12 if monthly
    
    # Dates
    start_date: date
    end_date: date
    
    # Amounts
    total_budget: float = Field(..., ge=0)
    currency: str = "INR"
    
    # Categorization
    department_id: Optional[str] = None
    campaign_id: Optional[str] = None  # If campaign-specific
    
    status: BudgetStatus = BudgetStatus.DRAFT
    
    # Metadata
    notes: Optional[str] = None
    tags: List[str] = []


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    period: Optional[BudgetPeriod] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_budget: Optional[float] = None
    status: Optional[BudgetStatus] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class BudgetResponse(BudgetBase):
    id: str
    allocated_amount: float = 0  # Sum of line items
    spent_amount: float = 0  # Sum of approved expenses
    remaining_amount: float = 0  # total - spent
    utilization_percentage: float = 0  # spent / total * 100
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============== BUDGET LINE ITEMS ==============

class BudgetItemBase(BaseModel):
    budget_id: str
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: BudgetCategory
    
    allocated_amount: float = Field(..., ge=0)
    
    # Optional breakdown
    platform: Optional[str] = None  # meta, google, youtube, etc.
    vendor_id: Optional[str] = None
    campaign_id: Optional[str] = None
    
    notes: Optional[str] = None


class BudgetItemCreate(BudgetItemBase):
    pass


class BudgetItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[BudgetCategory] = None
    allocated_amount: Optional[float] = None
    platform: Optional[str] = None
    vendor_id: Optional[str] = None
    notes: Optional[str] = None


class BudgetItemResponse(BudgetItemBase):
    id: str
    spent_amount: float = 0
    remaining_amount: float = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============== EXPENSES ==============

class ExpenseBase(BaseModel):
    budget_id: str
    budget_item_id: Optional[str] = None  # Link to specific line item
    
    description: str = Field(..., min_length=1, max_length=500)
    expense_type: ExpenseType
    category: BudgetCategory
    
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    
    # Reference
    expense_date: date
    invoice_number: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_id: Optional[str] = None
    
    # Links
    campaign_id: Optional[str] = None
    ad_campaign_id: Optional[str] = None
    content_project_id: Optional[str] = None
    influencer_id: Optional[str] = None
    
    # Status
    status: ExpenseStatus = ExpenseStatus.PENDING
    
    # Attachments
    receipt_url: Optional[str] = None
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    expense_type: Optional[ExpenseType] = None
    category: Optional[BudgetCategory] = None
    amount: Optional[float] = None
    expense_date: Optional[date] = None
    invoice_number: Optional[str] = None
    vendor_name: Optional[str] = None
    status: Optional[ExpenseStatus] = None
    receipt_url: Optional[str] = None
    notes: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============== STATS & ANALYTICS ==============

class BudgetOverview(BaseModel):
    total_budgets: int
    total_allocated: float
    total_spent: float
    total_remaining: float
    overall_utilization: float
    active_budgets: int
    overspent_budgets: int


class CategoryBreakdown(BaseModel):
    category: str
    allocated: float
    spent: float
    remaining: float
    percentage_of_total: float


class BudgetAnalytics(BaseModel):
    overview: BudgetOverview
    by_category: List[CategoryBreakdown]
    by_period: Dict[str, float]
    top_expenses: List[Dict[str, Any]]
    spending_trend: List[Dict[str, Any]]


# Category display names
CATEGORY_DISPLAY = {
    BudgetCategory.DIGITAL_ADS: "Digital Advertising",
    BudgetCategory.INFLUENCER: "Influencer Marketing",
    BudgetCategory.CONTENT_PRODUCTION: "Content Production",
    BudgetCategory.PR_COMMUNICATIONS: "PR & Communications",
    BudgetCategory.EVENTS: "Events & Activations",
    BudgetCategory.CREATIVE_AGENCY: "Creative Agency",
    BudgetCategory.SOFTWARE_TOOLS: "Software & Tools",
    BudgetCategory.RESEARCH: "Research & Insights",
    BudgetCategory.PARTNERSHIPS: "Partnerships",
    BudgetCategory.OTHER: "Other",
}
