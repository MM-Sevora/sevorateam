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
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    processing = "processing"
    completed = "completed"
    cancelled = "cancelled"


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

class PaymentRequestAction(BaseModel):
    action: str  # approve, reject, process, complete, cancel
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
    """Create a new payment request"""
    request_doc = {
        "id": str(uuid.uuid4()),
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
        "status": PaymentStatus.pending.value,
        "requester_id": user.get("id"),
        "requester_name": user.get("name"),
        "requester_department": request.department or user.get("department"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "approver_id": None,
        "approved_at": None,
        "processed_at": None,
        "completed_at": None,
        "comments": [],
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
    """Perform action on payment request"""
    request = await db.finance_payment_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Payment request not found")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {"updated_at": now}
    
    if action.action == "approve":
        update_data["status"] = PaymentStatus.approved.value
        update_data["approver_id"] = user.get("id")
        update_data["approver_name"] = user.get("name")
        update_data["approved_at"] = now
        
        # Update budget spent amount if linked
        if request.get("budget_id"):
            await db.finance_budgets.update_one(
                {"id": request["budget_id"]},
                {"$inc": {"spent_amount": request["amount"], "remaining_amount": -request["amount"]}}
            )
    
    elif action.action == "reject":
        update_data["status"] = PaymentStatus.rejected.value
        update_data["rejected_by"] = user.get("id")
        update_data["rejected_at"] = now
    
    elif action.action == "process":
        update_data["status"] = PaymentStatus.processing.value
        update_data["processed_at"] = now
    
    elif action.action == "complete":
        update_data["status"] = PaymentStatus.completed.value
        update_data["completed_at"] = now
    
    elif action.action == "cancel":
        update_data["status"] = PaymentStatus.cancelled.value
        update_data["cancelled_at"] = now
    
    # Add comment if provided
    if action.comments:
        comment = {
            "user_id": user.get("id"),
            "user_name": user.get("name"),
            "action": action.action,
            "comment": action.comments,
            "timestamp": now
        }
        await db.finance_payment_requests.update_one(
            {"id": request_id},
            {"$push": {"comments": comment}}
        )
    
    await db.finance_payment_requests.update_one({"id": request_id}, {"$set": update_data})
    
    return {"message": f"Payment request {action.action}d", "status": update_data.get("status")}


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
