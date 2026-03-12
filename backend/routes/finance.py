"""
Finance Management Routes
- Budget Planning
- Payment Requests
- Reimbursements
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

router = APIRouter(prefix="/finance", tags=["Finance"])
security = HTTPBearer()

# Database and auth dependency will be injected
db = None
_get_current_user_func = None

# Initialize function to be called from server.py
def init_router(database, auth_dependency):
    global db, _get_current_user_func
    db = database
    _get_current_user_func = auth_dependency
    return router


async def get_current_user_dep(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if _get_current_user_func is None:
        raise HTTPException(status_code=500, detail="Auth not configured")
    return await _get_current_user_func(credentials)


# ============== ENUMS ==============

class BudgetStatus(str, Enum):
    draft = "draft"
    pending_approval = "pending_approval"
    approved = "approved"
    rejected = "rejected"
    active = "active"
    closed = "closed"

class PaymentStatus(str, Enum):
    draft = "draft"
    pending_approval = "pending_approval"
    approved = "approved"
    rejected = "rejected"
    processing = "processing"
    paid = "paid"
    completed = "completed"
    cancelled = "cancelled"

class ApprovalLevel(str, Enum):
    manager = "manager"
    finance = "finance"
    director = "director"

# Payment Type to Module Mapping
PAYMENT_TYPE_MODULE_MAP = {
    "rent": {"module": "finance", "sub_module": "facilities", "requires_approval": True, "approval_levels": ["manager", "finance"]},
    "utilities": {"module": "finance", "sub_module": "facilities", "requires_approval": True, "approval_levels": ["manager", "finance"]},
    "payroll": {"module": "hr", "sub_module": "payroll", "requires_approval": True, "approval_levels": ["manager", "finance", "director"]},
    "tools": {"module": "operations", "sub_module": "procurement", "requires_approval": True, "approval_levels": ["manager", "finance"]},
    "reimbursement": {"module": "hr", "sub_module": "reimbursement", "requires_approval": True, "approval_levels": ["manager", "finance"]},
    "software": {"module": "it", "sub_module": "subscriptions", "requires_approval": True, "approval_levels": ["manager", "finance"]},
    "services": {"module": "operations", "sub_module": "services", "requires_approval": True, "approval_levels": ["manager", "finance"]},
    "travel": {"module": "hr", "sub_module": "travel", "requires_approval": True, "approval_levels": ["manager"]},
    "supplies": {"module": "operations", "sub_module": "procurement", "requires_approval": False, "approval_levels": ["manager"]},
    "training": {"module": "hr", "sub_module": "learning", "requires_approval": True, "approval_levels": ["manager", "finance"]},
    "insurance": {"module": "finance", "sub_module": "insurance", "requires_approval": True, "approval_levels": ["finance", "director"]},
    "telecom": {"module": "it", "sub_module": "telecom", "requires_approval": True, "approval_levels": ["manager"]},
    "maintenance": {"module": "operations", "sub_module": "facilities", "requires_approval": True, "approval_levels": ["manager"]},
    "vendor": {"module": "vendors", "sub_module": "payments", "requires_approval": True, "approval_levels": ["manager", "finance"]},
    "other": {"module": "finance", "sub_module": "misc", "requires_approval": True, "approval_levels": ["manager", "finance"]}
}


# ============== MODELS ==============

class BudgetCreate(BaseModel):
    name: str
    department: str
    fiscal_year: str
    category: str
    allocated_amount: float
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class BudgetUpdate(BaseModel):
    name: Optional[str] = None
    allocated_amount: Optional[float] = None
    description: Optional[str] = None
    status: Optional[BudgetStatus] = None

class PaymentRequestCreate(BaseModel):
    title: str
    vendor_name: Optional[str] = None
    amount: float
    currency: str = "INR"
    category: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    invoice_number: Optional[str] = None
    budget_id: Optional[str] = None
    department: Optional[str] = None
    payment_method: Optional[str] = None
    account_details: Optional[str] = None
    reference_number: Optional[str] = None
    # Source tracking
    source_type: Optional[str] = None  # work_order, direct, reimbursement, recurring
    source_id: Optional[str] = None  # work_order_id if linked
    source_reference: Optional[str] = None  # WO-00015, etc.
    requested_by_id: Optional[str] = None
    requested_by_name: Optional[str] = None
    # Linked module reference
    linked_module: Optional[str] = None
    linked_record_id: Optional[str] = None

class PaymentRequestAction(BaseModel):
    action: str  # submit, approve, reject, process, mark_paid, complete, cancel
    comments: Optional[str] = None
    level: Optional[str] = None  # manager, finance, director
    payment_reference: Optional[str] = None  # UTR, check number, etc.
    payment_date: Optional[str] = None

class PaymentStatusUpdate(BaseModel):
    status: str
    payment_reference: Optional[str] = None
    payment_date: Optional[str] = None
    payment_method: Optional[str] = None
    comments: Optional[str] = None


# ============== BUDGET PLANNING ==============

@router.post("/budgets")
async def create_budget(
    budget: BudgetCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new budget"""
    budget_doc = {
        "id": str(uuid.uuid4()),
        "name": budget.name,
        "department": budget.department,
        "fiscal_year": budget.fiscal_year,
        "category": budget.category,
        "allocated_amount": budget.allocated_amount,
        "spent_amount": 0,
        "remaining_amount": budget.allocated_amount,
        "description": budget.description,
        "start_date": budget.start_date,
        "end_date": budget.end_date,
        "status": BudgetStatus.draft.value,
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "approver_id": None,
        "approved_at": None,
        "is_active": True
    }
    
    await db.finance_budgets.insert_one(budget_doc)
    del budget_doc["_id"]
    return budget_doc


@router.get("/budgets")
async def list_budgets(
    department: Optional[str] = None,
    fiscal_year: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user_dep)
):
    """List all budgets with filters"""
    query = {"is_active": True}
    
    if department:
        query["department"] = department
    if fiscal_year:
        query["fiscal_year"] = fiscal_year
    if status:
        query["status"] = status
    
    budgets = await db.finance_budgets.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.finance_budgets.count_documents(query)
    
    return {
        "budgets": budgets,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/budgets/{budget_id}")
async def get_budget(budget_id: str, user: dict = Depends(get_current_user_dep)):
    """Get a specific budget"""
    budget = await db.finance_budgets.find_one({"id": budget_id}, {"_id": 0})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    # Get linked payment requests
    payments = await db.finance_payment_requests.find(
        {"budget_id": budget_id, "is_active": True},
        {"_id": 0, "id": 1, "title": 1, "amount": 1, "status": 1}
    ).to_list(100)
    
    budget["linked_payments"] = payments
    return budget


@router.put("/budgets/{budget_id}")
async def update_budget(
    budget_id: str,
    update: BudgetUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a budget"""
    budget = await db.finance_budgets.find_one({"id": budget_id})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Recalculate remaining if allocated changed
    if "allocated_amount" in update_data:
        update_data["remaining_amount"] = update_data["allocated_amount"] - budget.get("spent_amount", 0)
    
    await db.finance_budgets.update_one({"id": budget_id}, {"$set": update_data})
    
    return {"message": "Budget updated", "id": budget_id}


@router.post("/budgets/{budget_id}/approve")
async def approve_budget(
    budget_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Approve a budget"""
    budget = await db.finance_budgets.find_one({"id": budget_id})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    await db.finance_budgets.update_one(
        {"id": budget_id},
        {"$set": {
            "status": BudgetStatus.approved.value,
            "approver_id": user.get("id"),
            "approver_name": user.get("name"),
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Budget approved"}


@router.get("/budgets/summary/overview")
async def get_budget_overview(
    fiscal_year: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get budget overview summary"""
    now = datetime.now(timezone.utc)
    current_year = fiscal_year or str(now.year)
    
    # Total budgets
    total_result = await db.finance_budgets.aggregate([
        {"$match": {"fiscal_year": current_year, "is_active": True}},
        {"$group": {
            "_id": None,
            "total_allocated": {"$sum": "$allocated_amount"},
            "total_spent": {"$sum": "$spent_amount"},
            "total_remaining": {"$sum": "$remaining_amount"},
            "budget_count": {"$sum": 1}
        }}
    ]).to_list(1)
    
    totals = total_result[0] if total_result else {
        "total_allocated": 0,
        "total_spent": 0,
        "total_remaining": 0,
        "budget_count": 0
    }
    
    # By department
    by_department = await db.finance_budgets.aggregate([
        {"$match": {"fiscal_year": current_year, "is_active": True}},
        {"$group": {
            "_id": "$department",
            "allocated": {"$sum": "$allocated_amount"},
            "spent": {"$sum": "$spent_amount"},
            "remaining": {"$sum": "$remaining_amount"}
        }},
        {"$sort": {"allocated": -1}}
    ]).to_list(20)
    
    # By category
    by_category = await db.finance_budgets.aggregate([
        {"$match": {"fiscal_year": current_year, "is_active": True}},
        {"$group": {
            "_id": "$category",
            "allocated": {"$sum": "$allocated_amount"},
            "spent": {"$sum": "$spent_amount"}
        }},
        {"$sort": {"allocated": -1}}
    ]).to_list(20)
    
    return {
        "fiscal_year": current_year,
        "summary": {
            "total_allocated": totals.get("total_allocated", 0),
            "total_spent": totals.get("total_spent", 0),
            "total_remaining": totals.get("total_remaining", 0),
            "budget_count": totals.get("budget_count", 0),
            "utilization_rate": round((totals.get("total_spent", 0) / max(totals.get("total_allocated", 1), 1)) * 100, 1)
        },
        "by_department": [
            {"department": d["_id"] or "Unassigned", "allocated": d["allocated"], "spent": d["spent"], "remaining": d["remaining"]}
            for d in by_department
        ],
        "by_category": [
            {"category": c["_id"] or "Uncategorized", "allocated": c["allocated"], "spent": c["spent"]}
            for c in by_category
        ]
    }


# ============== PAYMENT REQUESTS ==============

@router.post("/payment-requests")
async def create_payment_request(
    request: PaymentRequestCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new payment request with approval workflow"""
    # Get type mapping for approval configuration
    type_config = PAYMENT_TYPE_MODULE_MAP.get(request.category, PAYMENT_TYPE_MODULE_MAP["other"])
    
    request_doc = {
        "id": str(uuid.uuid4()),
        "request_number": f"PR-{datetime.now().strftime('%Y%m')}-{str(uuid.uuid4())[:4].upper()}",
        "title": request.title,
        "vendor_name": request.vendor_name or request.category,
        "amount": request.amount,
        "currency": request.currency,
        "category": request.category,
        "description": request.description,
        "due_date": request.due_date,
        "invoice_number": request.invoice_number,
        "budget_id": request.budget_id,
        "department": request.department,
        "payment_method": request.payment_method,
        "account_details": request.account_details,
        "reference_number": request.reference_number,
        # Source tracking
        "source_type": request.source_type or "direct",
        "source_id": request.source_id,
        "source_reference": request.source_reference,
        # Linked module
        "linked_module": request.linked_module or type_config["module"],
        "linked_sub_module": type_config["sub_module"],
        "linked_record_id": request.linked_record_id,
        # Requester (can be different from creator)
        "requested_by_id": request.requested_by_id or user.get("id"),
        "requested_by_name": request.requested_by_name or user.get("name"),
        # Creator info
        "status": PaymentStatus.draft.value,
        "requester_id": user.get("id"),
        "requester_name": user.get("name"),
        "requester_department": request.department or user.get("department"),
        # Approval workflow
        "requires_approval": type_config["requires_approval"],
        "approval_levels": type_config["approval_levels"],
        "current_approval_level": None,
        "approvals": [],  # [{level, approver_id, approver_name, status, comments, timestamp}]
        "approval_status": "pending" if type_config["requires_approval"] else "not_required",
        # Payment tracking
        "payment_status": "unpaid",
        "payment_reference": None,
        "payment_date": None,
        "paid_amount": 0,
        "paid_by_id": None,
        "paid_by_name": None,
        # Timestamps
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "submitted_at": None,
        "approved_at": None,
        "processed_at": None,
        "paid_at": None,
        "completed_at": None,
        # Activity log
        "activity_log": [{
            "action": "created",
            "user_id": user.get("id"),
            "user_name": user.get("name"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": f"Payment request created for {request.category}"
        }],
        "is_active": True
    }
    
    await db.finance_payment_requests.insert_one(request_doc)
    del request_doc["_id"]
    return request_doc


@router.get("/payment-requests")
async def list_payment_requests(
    status: Optional[str] = None,
    category: Optional[str] = None,
    requester_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user_dep)
):
    """List payment requests"""
    query = {"is_active": True}
    
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if requester_id:
        query["requester_id"] = requester_id
    
    requests = await db.finance_payment_requests.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.finance_payment_requests.count_documents(query)
    
    return {
        "requests": requests,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/payment-requests/{request_id}")
async def get_payment_request(request_id: str, user: dict = Depends(get_current_user_dep)):
    """Get a specific payment request"""
    request = await db.finance_payment_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Payment request not found")
    return request


@router.post("/payment-requests/{request_id}/action")
async def payment_request_action(
    request_id: str,
    action: PaymentRequestAction,
    user: dict = Depends(get_current_user_dep)
):
    """Perform action on payment request with full workflow support"""
    request = await db.finance_payment_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Payment request not found")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {"updated_at": now}
    activity_entry = {
        "action": action.action,
        "user_id": user.get("id"),
        "user_name": user.get("name"),
        "timestamp": now,
        "details": action.comments or ""
    }
    
    if action.action == "submit":
        # Submit for approval
        approval_levels = request.get("approval_levels", ["manager", "finance"])
        update_data["status"] = PaymentStatus.pending_approval.value
        update_data["submitted_at"] = now
        update_data["current_approval_level"] = approval_levels[0] if approval_levels else None
        activity_entry["details"] = f"Submitted for approval (Level: {approval_levels[0] if approval_levels else 'N/A'})"
    
    elif action.action == "approve":
        # Approve at current level
        current_level = action.level or request.get("current_approval_level", "manager")
        approval_levels = request.get("approval_levels", ["manager", "finance"])
        approvals = request.get("approvals", [])
        
        # Add approval record
        approval_record = {
            "level": current_level,
            "approver_id": user.get("id"),
            "approver_name": user.get("name"),
            "status": "approved",
            "comments": action.comments,
            "timestamp": now
        }
        approvals.append(approval_record)
        update_data["approvals"] = approvals
        
        # Check if all levels approved
        approved_levels = [a["level"] for a in approvals if a["status"] == "approved"]
        pending_levels = [l for l in approval_levels if l not in approved_levels]
        
        if not pending_levels:
            # All levels approved
            update_data["status"] = PaymentStatus.approved.value
            update_data["approval_status"] = "approved"
            update_data["approved_at"] = now
            update_data["current_approval_level"] = None
            activity_entry["details"] = f"Final approval granted by {user.get('name')} ({current_level})"
            
            # Update budget spent amount if linked
            if request.get("budget_id"):
                await db.finance_budgets.update_one(
                    {"id": request["budget_id"]},
                    {"$inc": {"spent_amount": request["amount"], "remaining_amount": -request["amount"]}}
                )
        else:
            # Move to next approval level
            update_data["current_approval_level"] = pending_levels[0]
            activity_entry["details"] = f"Approved by {user.get('name')} ({current_level}). Next: {pending_levels[0]}"
    
    elif action.action == "reject":
        current_level = action.level or request.get("current_approval_level", "manager")
        approvals = request.get("approvals", [])
        approvals.append({
            "level": current_level,
            "approver_id": user.get("id"),
            "approver_name": user.get("name"),
            "status": "rejected",
            "comments": action.comments,
            "timestamp": now
        })
        update_data["approvals"] = approvals
        update_data["status"] = PaymentStatus.rejected.value
        update_data["approval_status"] = "rejected"
        update_data["rejected_by_id"] = user.get("id")
        update_data["rejected_by_name"] = user.get("name")
        update_data["rejected_at"] = now
        activity_entry["details"] = f"Rejected by {user.get('name')} ({current_level}): {action.comments or 'No reason provided'}"
    
    elif action.action == "process":
        update_data["status"] = PaymentStatus.processing.value
        update_data["processed_at"] = now
        update_data["processed_by_id"] = user.get("id")
        update_data["processed_by_name"] = user.get("name")
        activity_entry["details"] = f"Payment processing started by {user.get('name')}"
    
    elif action.action == "mark_paid":
        update_data["status"] = PaymentStatus.paid.value
        update_data["payment_status"] = "paid"
        update_data["paid_at"] = now
        update_data["paid_by_id"] = user.get("id")
        update_data["paid_by_name"] = user.get("name")
        update_data["paid_amount"] = request.get("amount", 0)
        if action.payment_reference:
            update_data["payment_reference"] = action.payment_reference
        if action.payment_date:
            update_data["payment_date"] = action.payment_date
        activity_entry["details"] = f"Payment marked as paid. Ref: {action.payment_reference or 'N/A'}"
    
    elif action.action == "complete":
        update_data["status"] = PaymentStatus.completed.value
        update_data["completed_at"] = now
        activity_entry["details"] = f"Payment request completed by {user.get('name')}"
    
    elif action.action == "cancel":
        update_data["status"] = PaymentStatus.cancelled.value
        update_data["cancelled_at"] = now
        update_data["cancelled_by_id"] = user.get("id")
        update_data["cancelled_by_name"] = user.get("name")
        activity_entry["details"] = f"Cancelled by {user.get('name')}: {action.comments or 'No reason'}"
    
    # Add to activity log
    await db.finance_payment_requests.update_one(
        {"id": request_id},
        {"$push": {"activity_log": activity_entry}}
    )
    
    await db.finance_payment_requests.update_one({"id": request_id}, {"$set": update_data})
    
    return {"message": f"Payment request {action.action} successful", "status": update_data.get("status")}


@router.put("/payment-requests/{request_id}/payment-status")
async def update_payment_status(
    request_id: str,
    status_update: PaymentStatusUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update payment status directly (for marking payments as paid/completed)"""
    request = await db.finance_payment_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Payment request not found")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        "updated_at": now,
        "payment_status": status_update.status
    }
    
    if status_update.status == "paid":
        update_data["status"] = PaymentStatus.paid.value
        update_data["paid_at"] = now
        update_data["paid_by_id"] = user.get("id")
        update_data["paid_by_name"] = user.get("name")
        update_data["paid_amount"] = request.get("amount", 0)
        if status_update.payment_reference:
            update_data["payment_reference"] = status_update.payment_reference
        if status_update.payment_date:
            update_data["payment_date"] = status_update.payment_date
        if status_update.payment_method:
            update_data["payment_method"] = status_update.payment_method
    
    activity_entry = {
        "action": f"payment_status_{status_update.status}",
        "user_id": user.get("id"),
        "user_name": user.get("name"),
        "timestamp": now,
        "details": status_update.comments or f"Payment status updated to {status_update.status}"
    }
    
    await db.finance_payment_requests.update_one(
        {"id": request_id},
        {"$set": update_data, "$push": {"activity_log": activity_entry}}
    )
    
    return {"message": f"Payment status updated to {status_update.status}"}


@router.get("/payment-requests/type-mapping")
async def get_payment_type_mapping(user: dict = Depends(get_current_user_dep)):
    """Get payment type to module mapping configuration"""
    return {"mapping": PAYMENT_TYPE_MODULE_MAP}


@router.get("/payment-requests/summary/stats")
async def get_payment_stats(user: dict = Depends(get_current_user_dep)):
    """Get payment request statistics"""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Status counts
    status_counts = await db.finance_payment_requests.aggregate([
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}, "total_amount": {"$sum": "$amount"}}}
    ]).to_list(10)
    
    # This month
    month_stats = await db.finance_payment_requests.aggregate([
        {"$match": {"is_active": True, "created_at": {"$gte": month_start}}},
        {"$group": {"_id": None, "count": {"$sum": 1}, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    return {
        "by_status": {s["_id"]: {"count": s["count"], "amount": s["total_amount"]} for s in status_counts},
        "this_month": month_stats[0] if month_stats else {"count": 0, "total": 0},
        "pending_count": sum(s["count"] for s in status_counts if s["_id"] == "pending"),
        "pending_amount": sum(s["total_amount"] for s in status_counts if s["_id"] == "pending")
    }


# ============== DASHBOARD ==============

@router.get("/dashboard")
async def get_finance_dashboard(user: dict = Depends(get_current_user_dep)):
    """Get finance dashboard overview"""
    now = datetime.now(timezone.utc)
    current_year = str(now.year)
    
    # Budget summary
    budget_summary = await db.finance_budgets.aggregate([
        {"$match": {"fiscal_year": current_year, "is_active": True}},
        {"$group": {
            "_id": None,
            "total_allocated": {"$sum": "$allocated_amount"},
            "total_spent": {"$sum": "$spent_amount"},
            "count": {"$sum": 1}
        }}
    ]).to_list(1)
    
    # Payment requests pending
    pending_payments = await db.finance_payment_requests.aggregate([
        {"$match": {"status": "pending", "is_active": True}},
        {"$group": {"_id": None, "count": {"$sum": 1}, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    # Recent activity
    recent_payments = await db.finance_payment_requests.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "title": 1, "amount": 1, "status": 1, "created_at": 1, "vendor_name": 1}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    budget_data = budget_summary[0] if budget_summary else {"total_allocated": 0, "total_spent": 0, "count": 0}
    payment_data = pending_payments[0] if pending_payments else {"count": 0, "total": 0}
    
    return {
        "budget_summary": {
            "total_allocated": budget_data.get("total_allocated", 0),
            "total_spent": budget_data.get("total_spent", 0),
            "remaining": budget_data.get("total_allocated", 0) - budget_data.get("total_spent", 0),
            "budget_count": budget_data.get("count", 0),
            "utilization": round((budget_data.get("total_spent", 0) / max(budget_data.get("total_allocated", 1), 1)) * 100, 1)
        },
        "pending_payments": {
            "count": payment_data.get("count", 0),
            "amount": payment_data.get("total", 0)
        },
        "recent_payments": recent_payments
    }
