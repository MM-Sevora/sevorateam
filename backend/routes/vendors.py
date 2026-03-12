"""
Vendor Management System (VMS) Routes
Phase 1: Vendor Database, Work Requests, Work Orders, Dashboard
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

router = APIRouter(prefix="/vendors", tags=["Vendor Management"])
security = HTTPBearer()

# Database and auth dependency
db = None
_get_current_user_func = None


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

class VendorStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    under_review = "under_review"
    blacklisted = "blacklisted"


class RequirementStatus(str, Enum):
    draft = "draft"
    proposal_requested = "proposal_requested"
    proposals_received = "proposals_received"
    vendor_selected = "vendor_selected"
    work_in_progress = "work_in_progress"
    completed = "completed"
    cancelled = "cancelled"


class WorkOrderStatus(str, Enum):
    assigned = "assigned"
    in_progress = "in_progress"
    delivered = "delivered"
    completed = "completed"
    cancelled = "cancelled"


class ProposalStatus(str, Enum):
    submitted = "submitted"
    under_review = "under_review"
    shortlisted = "shortlisted"
    selected = "selected"
    rejected = "rejected"


class ApprovalStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    revision_requested = "revision_requested"


class PaymentType(str, Enum):
    advance = "advance"
    partial = "partial"
    milestone = "milestone"
    final = "final"
    full = "full"


class RecurringFrequency(str, Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    quarterly = "quarterly"
    yearly = "yearly"


class VendorType(str, Enum):
    vendor = "vendor"
    freelancer = "freelancer"
    influencer = "influencer"


class CreatorPlatform(str, Enum):
    instagram = "instagram"
    youtube = "youtube"
    twitter = "twitter"
    linkedin = "linkedin"
    facebook = "facebook"
    tiktok = "tiktok"
    other = "other"


class CreatorPaymentType(str, Enum):
    per_deliverable = "per_deliverable"
    per_campaign = "per_campaign"
    per_project = "per_project"
    monthly_retainer = "monthly_retainer"


class CreatorPaymentStatus(str, Enum):
    pending_deliverable = "pending_deliverable"
    ready_for_payment = "ready_for_payment"
    payment_requested = "payment_requested"
    payment_approved = "payment_approved"
    paid = "paid"
    cancelled = "cancelled"


# ============== MODELS ==============

class VendorCreate(BaseModel):
    name: str
    category: str
    vendor_type: Optional[str] = "vendor"  # vendor, freelancer, influencer
    services: Optional[List[str]] = []
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_tax_id: Optional[str] = None
    notes: Optional[str] = None
    # Creator-specific fields
    platform: Optional[str] = None  # instagram, youtube, etc.
    handle: Optional[str] = None  # @username or profile link
    creator_category: Optional[str] = None  # fashion, lifestyle, tech, etc.
    followers: Optional[int] = None
    rate_card: Optional[str] = None


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    vendor_type: Optional[str] = None
    services: Optional[List[str]] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_tax_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[VendorStatus] = None
    # Creator-specific fields
    platform: Optional[str] = None
    handle: Optional[str] = None
    creator_category: Optional[str] = None
    followers: Optional[int] = None
    rate_card: Optional[str] = None


class WorkRequestCreate(BaseModel):
    title: str
    description: str
    department: str
    expected_completion_date: Optional[str] = None
    attachments: Optional[List[str]] = []


class WorkRequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_owner_id: Optional[str] = None
    expected_completion_date: Optional[str] = None
    status: Optional[RequirementStatus] = None


class WorkOrderCreate(BaseModel):
    vendor_id: str
    requirement_id: Optional[str] = None
    department: str
    work_description: str
    campaign_project: Optional[str] = None  # For creator/freelancer work
    deliverable_type: Optional[str] = None  # For creator/freelancer work
    order_type: Optional[str] = "one_time"  # one_time, recurring, project
    agreed_amount: Optional[float] = None
    start_date: Optional[str] = None
    expected_completion_date: Optional[str] = None
    attachments: Optional[List[str]] = []


class WorkOrderUpdate(BaseModel):
    work_description: Optional[str] = None
    campaign_project: Optional[str] = None
    deliverable_type: Optional[str] = None
    order_type: Optional[str] = None
    agreed_amount: Optional[float] = None
    assigned_owner_id: Optional[str] = None
    start_date: Optional[str] = None
    expected_completion_date: Optional[str] = None
    status: Optional[WorkOrderStatus] = None
    deliverables: Optional[List[str]] = None


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProposalCreate(BaseModel):
    requirement_id: str
    vendor_id: str
    amount: float
    currency: str = "INR"
    delivery_days: Optional[int] = None
    notes: Optional[str] = None
    quotation_url: Optional[str] = None


class ApprovalAction(BaseModel):
    action: str  # approve, reject, request_revision
    comments: Optional[str] = None
    level: Optional[str] = None  # team_lead, manager, finance


class WorkOrderPaymentCreate(BaseModel):
    amount: float
    payment_type: PaymentType = PaymentType.full
    description: Optional[str] = None
    invoice_number: Optional[str] = None
    po_number: Optional[str] = None


class RecurringWorkCreate(BaseModel):
    name: str
    vendor_id: str
    department: str
    description: str
    frequency: RecurringFrequency
    start_date: str
    estimated_amount: Optional[float] = None


class POInvoiceCreate(BaseModel):
    work_order_id: str
    po_number: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    amount: float
    invoice_url: Optional[str] = None
    notes: Optional[str] = None


class CreatorPaymentCreate(BaseModel):
    creator_id: str  # vendor_id of the freelancer/influencer
    campaign_project: str  # Campaign or project name/reference
    department: str
    deliverable_type: str  # e.g., "Instagram Reel", "YouTube Video", "Blog Post"
    agreed_fee: float
    payment_type: CreatorPaymentType = CreatorPaymentType.per_deliverable
    expected_payment_date: Optional[str] = None
    notes: Optional[str] = None
    contract_url: Optional[str] = None
    content_link: Optional[str] = None


class CreatorPaymentUpdate(BaseModel):
    campaign_project: Optional[str] = None
    deliverable_type: Optional[str] = None
    agreed_fee: Optional[float] = None
    payment_type: Optional[CreatorPaymentType] = None
    expected_payment_date: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[CreatorPaymentStatus] = None
    contract_url: Optional[str] = None
    content_link: Optional[str] = None
    invoice_url: Optional[str] = None


# ============== VENDOR CATEGORIES (Configurable) ==============

@router.get("/categories")
async def get_vendor_categories(user: dict = Depends(get_current_user_dep)):
    """Get all vendor categories"""
    categories = await db.vendor_categories.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("name", 1).to_list(100)
    
    # If no categories exist, create default ones
    if not categories:
        default_categories = [
            {"id": str(uuid.uuid4()), "name": "Packaging", "description": "Packaging suppliers", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Printing", "description": "Printing services", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Admin", "description": "Administrative services", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Logistics", "description": "Logistics and transportation", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Marketing", "description": "Marketing agencies", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Events", "description": "Event management", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Technology", "description": "IT and technology services", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Maintenance", "description": "Maintenance services", "is_active": True},
        ]
        await db.vendor_categories.insert_many(default_categories)
        categories = default_categories
    
    return {"categories": categories}


@router.post("/categories")
async def create_vendor_category(
    category: CategoryCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new vendor category"""
    existing = await db.vendor_categories.find_one({"name": category.name, "is_active": True})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    category_doc = {
        "id": str(uuid.uuid4()),
        "name": category.name,
        "description": category.description,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    await db.vendor_categories.insert_one(category_doc)
    del category_doc["_id"]
    return category_doc


@router.delete("/categories/{category_id}")
async def delete_vendor_category(category_id: str, user: dict = Depends(get_current_user_dep)):
    """Soft delete a vendor category"""
    result = await db.vendor_categories.update_one(
        {"id": category_id},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}


# ============== VENDOR MASTER DATABASE ==============

@router.post("")
async def create_vendor(
    vendor: VendorCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new vendor profile"""
    # Generate vendor ID
    count = await db.vendors.count_documents({})
    vendor_id = f"VND-{str(count + 1).zfill(5)}"
    
    vendor_doc = {
        "id": str(uuid.uuid4()),
        "vendor_id": vendor_id,
        "name": vendor.name,
        "category": vendor.category,
        "vendor_type": vendor.vendor_type or "vendor",
        "services": vendor.services or [],
        "contact_person": vendor.contact_person,
        "phone": vendor.phone,
        "email": vendor.email,
        "address": vendor.address,
        "gst_tax_id": vendor.gst_tax_id,
        "notes": vendor.notes,
        # Creator-specific fields
        "platform": vendor.platform,
        "handle": vendor.handle,
        "creator_category": vendor.creator_category,
        "followers": vendor.followers,
        "rate_card": vendor.rate_card,
        "status": VendorStatus.active.value,
        "rating": None,
        "total_ratings": 0,
        "total_work_orders": 0,
        "total_payments": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    
    await db.vendors.insert_one(vendor_doc)
    
    # Log audit
    await log_vendor_audit(
        db, "vendor_created", "vendor", vendor_doc["id"],
        vendor.name, user.get("id"), user.get("name")
    )
    
    del vendor_doc["_id"]
    return vendor_doc


@router.get("")
async def list_vendors(
    category: Optional[str] = None,
    status: Optional[str] = None,
    vendor_type: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user_dep)
):
    """List all vendors with filters"""
    query = {"is_active": True}
    
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if vendor_type:
        query["vendor_type"] = vendor_type
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"services": {"$regex": search, "$options": "i"}},
            {"vendor_id": {"$regex": search, "$options": "i"}},
            {"handle": {"$regex": search, "$options": "i"}}
        ]
    
    vendors = await db.vendors.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.vendors.count_documents(query)
    
    return {
        "vendors": vendors,
        "total": total,
        "skip": skip,
        "limit": limit
    }


# ============== RECURRING VENDOR WORK (listed here to prevent route conflict with /{vendor_id}) ==============

@router.get("/recurring")
async def list_recurring_work(
    vendor_id: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """List recurring vendor work"""
    query = {}
    
    # Status filter - default to showing active only, but allow 'all' or 'paused'
    if status == "paused":
        query["is_active"] = False
    elif status == "all":
        pass  # No filter on is_active
    else:
        # Default: show active only
        query["is_active"] = True
    
    if vendor_id:
        query["vendor_id"] = vendor_id
    if department:
        query["department"] = department
    
    recurring = await db.vendor_recurring.find(query, {"_id": 0}).sort("next_due_date", 1).to_list(50)
    
    # Mark items due soon and add execution count
    now = datetime.now(timezone.utc)
    for r in recurring:
        next_due_str = r.get("next_due_date", "")
        try:
            # Handle both timezone-aware and naive datetime strings
            if '+' in next_due_str or 'Z' in next_due_str:
                next_due = datetime.fromisoformat(next_due_str.replace('Z', '+00:00'))
            else:
                # Assume UTC if no timezone info
                next_due = datetime.fromisoformat(next_due_str).replace(tzinfo=timezone.utc)
            days_until_due = (next_due - now).days
        except (ValueError, TypeError):
            days_until_due = 0
        r["days_until_due"] = days_until_due
        r["is_overdue"] = days_until_due < 0 and r.get("is_active", True)
        r["is_due_soon"] = 0 <= days_until_due <= 7 and r.get("is_active", True)
        r["executions"] = len(r.get("work_orders_created", []))
    
    return {"recurring_work": recurring}


# ============== PO & INVOICE TRACKING (listed here to prevent route conflict with /{vendor_id}) ==============

@router.get("/po-invoices")
async def list_po_invoices(
    vendor_id: Optional[str] = None,
    work_order_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user_dep)
):
    """List PO/Invoice records"""
    query = {"is_active": True}
    if vendor_id:
        query["vendor_id"] = vendor_id
    if work_order_id:
        query["work_order_id"] = work_order_id
    
    records = await db.vendor_po_invoices.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.vendor_po_invoices.count_documents(query)
    
    return {
        "records": records,
        "total": total
    }


# ============== ROUTES THAT MUST BE BEFORE /{vendor_id} TO AVOID ROUTE CONFLICT ==============

@router.get("/requirements")
async def list_work_requests_v2(
    status: Optional[str] = None,
    department: Optional[str] = None,
    assigned_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user_dep)
):
    """List vendor work requests"""
    query = {"is_active": True}
    
    if status:
        query["status"] = status
    if department:
        query["department"] = department
    if assigned_to:
        query["assigned_owner_id"] = assigned_to
    
    requests = await db.vendor_requirements.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.vendor_requirements.count_documents(query)
    
    return {
        "requirements": requests,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/work-orders")
async def list_work_orders_v2(
    status: Optional[str] = None,
    vendor_id: Optional[str] = None,
    department: Optional[str] = None,
    assigned_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user_dep)
):
    """List vendor work orders"""
    query = {"is_active": True}
    
    if status:
        query["status"] = status
    if vendor_id:
        query["vendor_id"] = vendor_id
    if department:
        query["department"] = department
    if assigned_to:
        query["assigned_owner_id"] = assigned_to
    
    orders = await db.vendor_work_orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.vendor_work_orders.count_documents(query)
    
    # Calculate payment status for each order
    for order in orders:
        payment_requests = order.get("payment_requests", [])
        agreed_amount = order.get("agreed_amount", 0) or 0
        
        if not payment_requests:
            order["payment_status"] = "no_payments"
            order["total_paid"] = 0
            order["total_requested"] = 0
        else:
            # Fetch actual payment statuses
            payment_ids = [p.get("id") for p in payment_requests if p.get("id")]
            if payment_ids:
                payments = await db.finance_payment_requests.find(
                    {"id": {"$in": payment_ids}}, {"_id": 0, "amount": 1, "status": 1}
                ).to_list(None)
                total_requested = sum(p.get("amount", 0) for p in payments)
                total_paid = sum(p.get("amount", 0) for p in payments if p.get("status") == "completed")
                
                order["total_paid"] = total_paid
                order["total_requested"] = total_requested
                
                if total_paid == 0:
                    order["payment_status"] = "pending"
                elif agreed_amount > 0 and total_paid >= agreed_amount:
                    order["payment_status"] = "paid"
                elif total_paid >= total_requested:
                    order["payment_status"] = "paid"
                else:
                    order["payment_status"] = "partial"
            else:
                order["payment_status"] = "pending"
                order["total_paid"] = 0
                order["total_requested"] = sum(p.get("amount", 0) for p in payment_requests)
    
    return {
        "work_orders": orders,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/audit-logs")
async def get_audit_logs_v2(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user_dep)
):
    """Get vendor audit logs"""
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    
    logs = await db.vendor_audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.vendor_audit_logs.count_documents(query)
    
    return {
        "logs": logs,
        "total": total
    }


@router.get("/approvals/pending")
async def get_pending_approvals_v2(
    level: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get pending approvals"""
    query = {"is_active": True, "overall_status": ApprovalStatus.pending.value}
    if level:
        query["current_level"] = level
    
    approvals = await db.vendor_approvals.find(query, {"_id": 0}).sort("submitted_at", -1).to_list(50)
    
    # Enrich with entity details
    for approval in approvals:
        if approval.get("entity_type") == "requirement":
            req = await db.vendor_requirements.find_one(
                {"id": approval["entity_id"]},
                {"_id": 0, "title": 1, "department": 1, "selected_vendor_id": 1, "proposals": 1}
            )
            if req:
                approval["requirement_details"] = req
                # Get selected proposal amount
                selected = next((p for p in req.get("proposals", []) if p.get("status") == "selected"), None)
                if selected:
                    approval["selected_amount"] = selected.get("amount")
    
    return {"approvals": approvals}


@router.get("/dashboard/stats")
async def get_dashboard_stats_v2(user: dict = Depends(get_current_user_dep)):
    """Get vendor management dashboard statistics"""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Vendor stats
    total_vendors = await db.vendors.count_documents({"is_active": True})
    active_vendors = await db.vendors.count_documents({"is_active": True, "status": "active"})
    under_review = await db.vendors.count_documents({"is_active": True, "status": "under_review"})
    
    # Vendors by category
    vendors_by_category = await db.vendors.aggregate([
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(20)
    
    # Work request stats
    total_requirements = await db.vendor_requirements.count_documents({"is_active": True})
    pending_requirements = await db.vendor_requirements.count_documents({
        "is_active": True,
        "status": {"$in": ["draft", "proposal_requested", "proposals_received"]}
    })
    
    # Work order stats
    total_work_orders = await db.vendor_work_orders.count_documents({"is_active": True})
    open_work_orders = await db.vendor_work_orders.count_documents({
        "is_active": True,
        "status": {"$in": ["assigned", "in_progress"]}
    })
    completed_this_month = await db.vendor_work_orders.count_documents({
        "is_active": True,
        "status": "completed",
        "actual_completion_date": {"$gte": month_start}
    })
    
    # Work orders by status
    wo_by_status = await db.vendor_work_orders.aggregate([
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(10)
    
    # Recent work orders
    recent_work_orders = await db.vendor_work_orders.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "work_order_id": 1, "vendor_name": 1, "status": 1, "created_at": 1, "department": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Recent requirements
    recent_requirements = await db.vendor_requirements.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "requirement_id": 1, "title": 1, "status": 1, "created_at": 1, "department": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Top vendors by work orders
    top_vendors = await db.vendors.find(
        {"is_active": True, "total_work_orders": {"$gt": 0}},
        {"_id": 0, "id": 1, "vendor_id": 1, "name": 1, "category": 1, "total_work_orders": 1, "rating": 1}
    ).sort("total_work_orders", -1).limit(5).to_list(5)
    
    return {
        "vendors": {
            "total": total_vendors,
            "active": active_vendors,
            "under_review": under_review,
            "by_category": [{"category": v["_id"] or "Uncategorized", "count": v["count"]} for v in vendors_by_category]
        },
        "requirements": {
            "total": total_requirements,
            "pending": pending_requirements,
            "recent": recent_requirements
        },
        "work_orders": {
            "total": total_work_orders,
            "open": open_work_orders,
            "completed_this_month": completed_this_month,
            "by_status": {s["_id"]: s["count"] for s in wo_by_status},
            "recent": recent_work_orders
        },
        "top_vendors": top_vendors
    }


# ============== CREATOR/FREELANCER PAYMENTS ==============

@router.get("/creator-payments")
async def list_creator_payments(
    creator_id: Optional[str] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user_dep)
):
    """List creator/freelancer payment records"""
    query = {"is_active": True}
    if creator_id:
        query["creator_id"] = creator_id
    if status:
        query["status"] = status
    if department:
        query["department"] = department
    
    payments = await db.creator_payments.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.creator_payments.count_documents(query)
    
    # Get summary stats
    pending_count = await db.creator_payments.count_documents({"is_active": True, "status": "pending_deliverable"})
    ready_count = await db.creator_payments.count_documents({"is_active": True, "status": "ready_for_payment"})
    paid_count = await db.creator_payments.count_documents({"is_active": True, "status": "paid"})
    
    # Calculate totals
    pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {
            "_id": "$status",
            "total": {"$sum": "$agreed_fee"},
            "count": {"$sum": 1}
        }}
    ]
    by_status = await db.creator_payments.aggregate(pipeline).to_list(10)
    
    return {
        "payments": payments,
        "total": total,
        "summary": {
            "pending_deliverable": pending_count,
            "ready_for_payment": ready_count,
            "paid": paid_count,
            "by_status": {s["_id"]: {"count": s["count"], "total": s["total"]} for s in by_status}
        }
    }


@router.post("/creator-payments")
async def create_creator_payment(
    payment: CreatorPaymentCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a creator/freelancer payment record"""
    # Verify creator exists and is freelancer/influencer
    creator = await db.vendors.find_one({"id": payment.creator_id, "is_active": True})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    if creator.get("vendor_type") not in ["freelancer", "influencer"]:
        raise HTTPException(status_code=400, detail="Vendor is not a freelancer or influencer")
    
    # Generate payment ID
    count = await db.creator_payments.count_documents({})
    payment_id = f"CP-{str(count + 1).zfill(5)}"
    
    payment_doc = {
        "id": str(uuid.uuid4()),
        "payment_id": payment_id,
        "creator_id": payment.creator_id,
        "creator_name": creator.get("name"),
        "creator_type": creator.get("vendor_type"),
        "campaign_project": payment.campaign_project,
        "department": payment.department,
        "deliverable_type": payment.deliverable_type,
        "agreed_fee": payment.agreed_fee,
        "currency": "INR",
        "payment_type": payment.payment_type.value,
        "expected_payment_date": payment.expected_payment_date,
        "notes": payment.notes,
        "contract_url": payment.contract_url,
        "content_link": payment.content_link,
        "status": CreatorPaymentStatus.pending_deliverable.value,
        "assigned_owner_id": user.get("id"),
        "assigned_owner_name": user.get("name"),
        "payment_request_id": None,
        "payment_date": None,
        "transaction_reference": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    
    await db.creator_payments.insert_one(payment_doc)
    
    # Update creator total payments count
    await db.vendors.update_one(
        {"id": payment.creator_id},
        {"$inc": {"total_payments": 1}}
    )
    
    # Log audit
    await log_vendor_audit(
        db, "creator_payment_created", "creator_payment", payment_doc["id"],
        f"{creator.get('name')} - {payment.campaign_project}",
        user.get("id"), user.get("name")
    )
    
    del payment_doc["_id"]
    return payment_doc


@router.get("/creator-payments/dashboard/stats")
async def get_creator_payments_dashboard(user: dict = Depends(get_current_user_dep)):
    """Get creator payments dashboard statistics"""
    # Count by status
    pending = await db.creator_payments.count_documents({"is_active": True, "status": "pending_deliverable"})
    ready = await db.creator_payments.count_documents({"is_active": True, "status": "ready_for_payment"})
    requested = await db.creator_payments.count_documents({"is_active": True, "status": "payment_requested"})
    paid = await db.creator_payments.count_documents({"is_active": True, "status": "paid"})
    
    # Total amounts
    pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {
            "_id": "$status",
            "total": {"$sum": "$agreed_fee"}
        }}
    ]
    amounts = await db.creator_payments.aggregate(pipeline).to_list(10)
    amounts_by_status = {a["_id"]: a["total"] for a in amounts}
    
    # By campaign/project
    by_campaign = await db.creator_payments.aggregate([
        {"$match": {"is_active": True}},
        {"$group": {
            "_id": "$campaign_project",
            "count": {"$sum": 1},
            "total": {"$sum": "$agreed_fee"}
        }},
        {"$sort": {"total": -1}},
        {"$limit": 10}
    ]).to_list(10)
    
    # By creator
    by_creator = await db.creator_payments.aggregate([
        {"$match": {"is_active": True}},
        {"$group": {
            "_id": {"id": "$creator_id", "name": "$creator_name"},
            "count": {"$sum": 1},
            "total": {"$sum": "$agreed_fee"}
        }},
        {"$sort": {"total": -1}},
        {"$limit": 10}
    ]).to_list(10)
    
    # Recent payments
    recent = await db.creator_payments.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "counts": {
            "pending_deliverable": pending,
            "ready_for_payment": ready,
            "payment_requested": requested,
            "paid": paid,
            "total": pending + ready + requested + paid
        },
        "amounts": {
            "pending": amounts_by_status.get("pending_deliverable", 0) + amounts_by_status.get("ready_for_payment", 0),
            "requested": amounts_by_status.get("payment_requested", 0),
            "paid": amounts_by_status.get("paid", 0),
            "total": sum(amounts_by_status.values())
        },
        "by_campaign": [{"campaign": c["_id"], "count": c["count"], "total": c["total"]} for c in by_campaign],
        "by_creator": [{"creator_id": c["_id"]["id"], "creator_name": c["_id"]["name"], "count": c["count"], "total": c["total"]} for c in by_creator],
        "recent": recent
    }


@router.get("/creator-payments/{payment_id}")
async def get_creator_payment(payment_id: str, user: dict = Depends(get_current_user_dep)):
    """Get creator payment details"""
    payment = await db.creator_payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
    
    # Get creator details
    creator = await db.vendors.find_one(
        {"id": payment.get("creator_id")},
        {"_id": 0, "name": 1, "vendor_type": 1, "platform": 1, "handle": 1, "email": 1, "phone": 1}
    )
    payment["creator_details"] = creator
    
    return payment


@router.put("/creator-payments/{payment_id}")
async def update_creator_payment(
    payment_id: str,
    update: CreatorPaymentUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update creator payment record"""
    payment = await db.creator_payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if "status" in update_data:
        update_data["status"] = update_data["status"].value if hasattr(update_data["status"], "value") else update_data["status"]
    if "payment_type" in update_data:
        update_data["payment_type"] = update_data["payment_type"].value if hasattr(update_data["payment_type"], "value") else update_data["payment_type"]
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.creator_payments.update_one({"id": payment_id}, {"$set": update_data})
    
    await log_vendor_audit(
        db, "creator_payment_updated", "creator_payment", payment_id,
        payment.get("payment_id"), user.get("id"), user.get("name"),
        {"updated_fields": list(update_data.keys())}
    )
    
    return {"message": "Payment record updated", "id": payment_id}


@router.post("/creator-payments/{payment_id}/mark-ready")
async def mark_creator_payment_ready(
    payment_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Mark creator payment as ready for payment (deliverable completed)"""
    payment = await db.creator_payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
    
    if payment.get("status") != "pending_deliverable":
        raise HTTPException(status_code=400, detail="Payment is not in pending deliverable status")
    
    await db.creator_payments.update_one(
        {"id": payment_id},
        {"$set": {
            "status": CreatorPaymentStatus.ready_for_payment.value,
            "deliverable_completed_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_vendor_audit(
        db, "creator_payment_ready", "creator_payment", payment_id,
        payment.get("payment_id"), user.get("id"), user.get("name")
    )
    
    return {"message": "Payment marked as ready", "id": payment_id}


@router.post("/creator-payments/{payment_id}/create-payment-request")
async def create_creator_payment_request(
    payment_id: str,
    invoice_url: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Create a payment request for the creator payment"""
    payment = await db.creator_payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
    
    if payment.get("status") not in ["ready_for_payment", "pending_deliverable"]:
        raise HTTPException(status_code=400, detail="Payment is not ready for payment request")
    
    # Create payment request in finance module
    count = await db.finance_payment_requests.count_documents({})
    request_id = f"PR-{str(count + 1).zfill(5)}"
    
    payment_request = {
        "id": str(uuid.uuid4()),
        "request_id": request_id,
        "vendor_id": payment.get("creator_id"),
        "vendor_name": payment.get("creator_name"),
        "amount": payment.get("agreed_fee"),
        "currency": "INR",
        "category": "Creator Payment",
        "description": f"{payment.get('deliverable_type')} - {payment.get('campaign_project')}",
        "status": "pending",
        "department": payment.get("department"),
        "linked_entity_type": "creator_payment",
        "linked_entity_id": payment_id,
        "invoice_number": payment.get("payment_id"),
        "invoice_url": invoice_url or payment.get("invoice_url"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "is_active": True
    }
    
    await db.finance_payment_requests.insert_one(payment_request)
    
    # Update creator payment status
    await db.creator_payments.update_one(
        {"id": payment_id},
        {"$set": {
            "status": CreatorPaymentStatus.payment_requested.value,
            "payment_request_id": payment_request["id"],
            "invoice_url": invoice_url or payment.get("invoice_url"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_vendor_audit(
        db, "creator_payment_request_created", "creator_payment", payment_id,
        payment.get("payment_id"), user.get("id"), user.get("name")
    )
    
    del payment_request["_id"]
    return {
        "message": "Payment request created",
        "payment_request": payment_request,
        "creator_payment_id": payment_id
    }


@router.get("/{vendor_id}")
async def get_vendor(vendor_id: str, user: dict = Depends(get_current_user_dep)):
    """Get vendor details with complete work history"""
    vendor = await db.vendors.find_one({"id": vendor_id}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Get ALL work orders for this vendor
    work_orders = await db.vendor_work_orders.find(
        {"vendor_id": vendor_id, "is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Get payments for each work order
    for wo in work_orders:
        wo_payments = await db.finance_payment_requests.find(
            {"linked_work_order_id": wo.get("id"), "is_active": True},
            {"_id": 0, "id": 1, "payment_type": 1, "amount": 1, "currency": 1, "status": 1, "created_at": 1}
        ).to_list(20)
        wo["payments"] = wo_payments
    
    # Get proposals submitted by this vendor
    proposals = await db.vendor_proposals.find(
        {"vendor_id": vendor_id, "is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Get recurring work for this vendor
    recurring = await db.vendor_recurring.find(
        {"vendor_id": vendor_id, "is_active": True},
        {"_id": 0}
    ).to_list(20)
    
    # Get creator payments (if freelancer/influencer)
    creator_payments = []
    if vendor.get("vendor_type") in ["freelancer", "influencer"]:
        creator_payments = await db.creator_payments.find(
            {"creator_id": vendor_id, "is_active": True},
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)
    
    # Calculate statistics
    total_work_orders = len(work_orders)
    completed_orders = len([wo for wo in work_orders if wo.get("status") == "completed"])
    in_progress_orders = len([wo for wo in work_orders if wo.get("status") == "in_progress"])
    
    # Calculate total payments
    total_payments = 0
    for wo in work_orders:
        for p in wo.get("payments", []):
            if p.get("status") == "paid":
                total_payments += p.get("amount", 0)
    
    vendor["work_orders"] = work_orders
    vendor["proposals"] = proposals
    vendor["recurring_work"] = recurring
    vendor["creator_payments"] = creator_payments
    vendor["statistics"] = {
        "total_work_orders": total_work_orders,
        "completed_orders": completed_orders,
        "in_progress_orders": in_progress_orders,
        "total_payments": total_payments,
        "total_proposals": len(proposals),
        "selected_proposals": len([p for p in proposals if p.get("status") == "selected"]),
        "recurring_schedules": len(recurring)
    }
    
    return vendor


@router.put("/{vendor_id}")
async def update_vendor(
    vendor_id: str,
    update: VendorUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update vendor details"""
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.vendors.update_one({"id": vendor_id}, {"$set": update_data})
    
    # Log audit
    await log_vendor_audit(
        db, "vendor_updated", "vendor", vendor_id,
        vendor.get("name"), user.get("id"), user.get("name"),
        {"updated_fields": list(update_data.keys())}
    )
    
    return {"message": "Vendor updated", "id": vendor_id}


@router.delete("/{vendor_id}")
async def delete_vendor(vendor_id: str, user: dict = Depends(get_current_user_dep)):
    """Soft delete a vendor"""
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    await db.vendors.update_one(
        {"id": vendor_id},
        {"$set": {"is_active": False, "status": VendorStatus.inactive.value}}
    )
    
    await log_vendor_audit(
        db, "vendor_deleted", "vendor", vendor_id,
        vendor.get("name"), user.get("id"), user.get("name")
    )
    
    return {"message": "Vendor deleted"}


# ============== VENDOR WORK REQUESTS ==============

@router.post("/requirements")
async def create_work_request(
    request: WorkRequestCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a vendor work request"""
    count = await db.vendor_requirements.count_documents({})
    req_id = f"REQ-{str(count + 1).zfill(5)}"
    
    request_doc = {
        "id": str(uuid.uuid4()),
        "requirement_id": req_id,
        "title": request.title,
        "description": request.description,
        "department": request.department,
        "requested_by": user.get("id"),
        "requested_by_name": user.get("name"),
        "assigned_owner_id": None,
        "assigned_owner_name": None,
        "expected_completion_date": request.expected_completion_date,
        "attachments": request.attachments or [],
        "status": RequirementStatus.draft.value,
        "selected_vendor_id": None,
        "proposals": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    
    await db.vendor_requirements.insert_one(request_doc)
    
    await log_vendor_audit(
        db, "requirement_created", "requirement", request_doc["id"],
        request.title, user.get("id"), user.get("name")
    )
    
    del request_doc["_id"]
    return request_doc


@router.get("/requirements")
async def list_work_requests(
    status: Optional[str] = None,
    department: Optional[str] = None,
    assigned_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user_dep)
):
    """List vendor work requests"""
    query = {"is_active": True}
    
    if status:
        query["status"] = status
    if department:
        query["department"] = department
    if assigned_to:
        query["assigned_owner_id"] = assigned_to
    
    requests = await db.vendor_requirements.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.vendor_requirements.count_documents(query)
    
    return {
        "requirements": requests,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/requirements/{requirement_id}")
async def get_work_request(requirement_id: str, user: dict = Depends(get_current_user_dep)):
    """Get work request details"""
    req = await db.vendor_requirements.find_one({"id": requirement_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return req


@router.put("/requirements/{requirement_id}")
async def update_work_request(
    requirement_id: str,
    update: WorkRequestUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update work request"""
    req = await db.vendor_requirements.find_one({"id": requirement_id})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If assigning owner, get their name
    if update.assigned_owner_id:
        owner = await db.users.find_one({"id": update.assigned_owner_id}, {"name": 1})
        if owner:
            update_data["assigned_owner_name"] = owner.get("name")
    
    await db.vendor_requirements.update_one({"id": requirement_id}, {"$set": update_data})
    
    await log_vendor_audit(
        db, "requirement_updated", "requirement", requirement_id,
        req.get("title"), user.get("id"), user.get("name")
    )
    
    return {"message": "Requirement updated"}


@router.post("/requirements/{requirement_id}/assign-owner")
async def assign_requirement_owner(
    requirement_id: str,
    owner_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Assign internal owner to requirement"""
    req = await db.vendor_requirements.find_one({"id": requirement_id})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    owner = await db.users.find_one({"id": owner_id}, {"name": 1})
    if not owner:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.vendor_requirements.update_one(
        {"id": requirement_id},
        {"$set": {
            "assigned_owner_id": owner_id,
            "assigned_owner_name": owner.get("name"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Owner assigned", "owner_name": owner.get("name")}


# ============== VENDOR WORK ORDERS ==============

@router.post("/work-orders")
async def create_work_order(
    order: WorkOrderCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a vendor work order"""
    # Verify vendor exists
    vendor = await db.vendors.find_one({"id": order.vendor_id}, {"name": 1, "vendor_type": 1})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    count = await db.vendor_work_orders.count_documents({})
    wo_id = f"WO-{str(count + 1).zfill(5)}"
    
    order_doc = {
        "id": str(uuid.uuid4()),
        "work_order_id": wo_id,
        "vendor_id": order.vendor_id,
        "vendor_name": vendor.get("name"),
        "vendor_type": vendor.get("vendor_type", "vendor"),
        "requirement_id": order.requirement_id,
        "department": order.department,
        "work_description": order.work_description,
        "campaign_project": order.campaign_project,  # For creator work
        "deliverable_type": order.deliverable_type,  # For creator work
        "order_type": order.order_type or "one_time",  # one_time, recurring, project
        "agreed_amount": order.agreed_amount,
        "agreed_currency": "INR",
        "assigned_owner_id": user.get("id"),
        "assigned_owner_name": user.get("name"),
        "start_date": order.start_date,
        "expected_completion_date": order.expected_completion_date,
        "actual_completion_date": None,
        "attachments": order.attachments or [],
        "deliverables": [],
        "status": WorkOrderStatus.assigned.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    
    await db.vendor_work_orders.insert_one(order_doc)
    
    # Update vendor work order count
    await db.vendors.update_one(
        {"id": order.vendor_id},
        {"$inc": {"total_work_orders": 1}}
    )
    
    # If linked to requirement, update requirement status
    if order.requirement_id:
        await db.vendor_requirements.update_one(
            {"id": order.requirement_id},
            {"$set": {
                "status": RequirementStatus.work_in_progress.value,
                "selected_vendor_id": order.vendor_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    await log_vendor_audit(
        db, "work_order_created", "work_order", order_doc["id"],
        wo_id, user.get("id"), user.get("name"),
        {"vendor": vendor.get("name")}
    )
    
    del order_doc["_id"]
    return order_doc


@router.get("/work-orders")
async def list_work_orders(
    status: Optional[str] = None,
    vendor_id: Optional[str] = None,
    department: Optional[str] = None,
    assigned_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user_dep)
):
    """List vendor work orders"""
    query = {"is_active": True}
    
    if status:
        query["status"] = status
    if vendor_id:
        query["vendor_id"] = vendor_id
    if department:
        query["department"] = department
    if assigned_to:
        query["assigned_owner_id"] = assigned_to
    
    orders = await db.vendor_work_orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.vendor_work_orders.count_documents(query)
    
    # Calculate payment status for each order
    for order in orders:
        payment_requests = order.get("payment_requests", [])
        agreed_amount = order.get("agreed_amount", 0) or 0
        
        if not payment_requests:
            order["payment_status"] = "no_payments"
            order["total_paid"] = 0
            order["total_requested"] = 0
        else:
            # Fetch actual payment statuses
            payment_ids = [p.get("id") for p in payment_requests if p.get("id")]
            if payment_ids:
                payments = await db.finance_payment_requests.find(
                    {"id": {"$in": payment_ids}}, {"_id": 0, "amount": 1, "status": 1}
                ).to_list(None)
                total_requested = sum(p.get("amount", 0) for p in payments)
                total_paid = sum(p.get("amount", 0) for p in payments if p.get("status") == "completed")
                
                order["total_paid"] = total_paid
                order["total_requested"] = total_requested
                
                if total_paid == 0:
                    order["payment_status"] = "pending"
                elif agreed_amount > 0 and total_paid >= agreed_amount:
                    order["payment_status"] = "paid"
                elif total_paid >= total_requested:
                    order["payment_status"] = "paid"
                else:
                    order["payment_status"] = "partial"
            else:
                order["payment_status"] = "pending"
                order["total_paid"] = 0
                order["total_requested"] = sum(p.get("amount", 0) for p in payment_requests)
    
    return {
        "work_orders": orders,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/work-orders/{order_id}")
async def get_work_order(order_id: str, user: dict = Depends(get_current_user_dep)):
    """Get work order details"""
    order = await db.vendor_work_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    # Get vendor details
    if order.get("vendor_id"):
        vendor = await db.vendors.find_one({"id": order["vendor_id"]}, {"_id": 0, "name": 1, "email": 1, "phone": 1})
        order["vendor_details"] = vendor
    
    return order


@router.put("/work-orders/{order_id}")
async def update_work_order(
    order_id: str,
    update: WorkOrderUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update work order"""
    order = await db.vendor_work_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If completing, set actual completion date
    if update.status == WorkOrderStatus.completed:
        update_data["actual_completion_date"] = datetime.now(timezone.utc).isoformat()
        
        # Update linked requirement if exists
        if order.get("requirement_id"):
            await db.vendor_requirements.update_one(
                {"id": order["requirement_id"]},
                {"$set": {
                    "status": RequirementStatus.completed.value,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    # If assigning owner, get their name
    if update.assigned_owner_id:
        owner = await db.users.find_one({"id": update.assigned_owner_id}, {"name": 1})
        if owner:
            update_data["assigned_owner_name"] = owner.get("name")
    
    await db.vendor_work_orders.update_one({"id": order_id}, {"$set": update_data})
    
    await log_vendor_audit(
        db, "work_order_updated", "work_order", order_id,
        order.get("work_order_id"), user.get("id"), user.get("name"),
        {"status": update.status.value if update.status else None}
    )
    
    return {"message": "Work order updated"}


@router.post("/work-orders/{order_id}/create-payment-request")
async def create_payment_from_work_order(
    order_id: str,
    amount: float,
    description: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Create payment request from completed work order"""
    order = await db.vendor_work_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    if order.get("status") != WorkOrderStatus.completed.value:
        raise HTTPException(status_code=400, detail="Work order must be completed before creating payment request")
    
    # Get vendor details
    vendor = await db.vendors.find_one({"id": order.get("vendor_id")}, {"name": 1})
    
    # Create payment request using existing finance module
    payment_doc = {
        "id": str(uuid.uuid4()),
        "title": f"Payment for {order.get('work_order_id')}",
        "vendor_name": vendor.get("name") if vendor else "Unknown",
        "amount": amount,
        "currency": "INR",
        "category": "Services",
        "description": description or order.get("work_description"),
        "due_date": None,
        "invoice_number": None,
        "budget_id": None,
        "status": "pending",
        "requester_id": user.get("id"),
        "requester_name": user.get("name"),
        "requester_department": order.get("department"),
        "linked_work_order_id": order_id,
        "linked_vendor_id": order.get("vendor_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "comments": [],
        "is_active": True
    }
    
    await db.finance_payment_requests.insert_one(payment_doc)
    
    # Update work order with payment request link
    await db.vendor_work_orders.update_one(
        {"id": order_id},
        {"$set": {
            "payment_request_id": payment_doc["id"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_vendor_audit(
        db, "payment_request_created", "work_order", order_id,
        order.get("work_order_id"), user.get("id"), user.get("name"),
        {"amount": amount}
    )
    
    del payment_doc["_id"]
    return {"message": "Payment request created", "payment_request": payment_doc}


# ============== DASHBOARD ==============

@router.get("/dashboard/stats")
async def get_vendor_dashboard(user: dict = Depends(get_current_user_dep)):
    """Get vendor management dashboard statistics"""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    # Vendor stats
    total_vendors = await db.vendors.count_documents({"is_active": True})
    active_vendors = await db.vendors.count_documents({"is_active": True, "status": "active"})
    under_review = await db.vendors.count_documents({"is_active": True, "status": "under_review"})
    
    # Vendors by category
    vendors_by_category = await db.vendors.aggregate([
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(20)
    
    # Work request stats
    total_requirements = await db.vendor_requirements.count_documents({"is_active": True})
    pending_requirements = await db.vendor_requirements.count_documents({
        "is_active": True,
        "status": {"$in": ["draft", "proposal_requested", "proposals_received"]}
    })
    
    # Work order stats
    total_work_orders = await db.vendor_work_orders.count_documents({"is_active": True})
    open_work_orders = await db.vendor_work_orders.count_documents({
        "is_active": True,
        "status": {"$in": ["assigned", "in_progress"]}
    })
    completed_this_month = await db.vendor_work_orders.count_documents({
        "is_active": True,
        "status": "completed",
        "actual_completion_date": {"$gte": month_start}
    })
    
    # Work orders by status
    wo_by_status = await db.vendor_work_orders.aggregate([
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(10)
    
    # Recent work orders
    recent_work_orders = await db.vendor_work_orders.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "work_order_id": 1, "vendor_name": 1, "status": 1, "created_at": 1, "department": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Recent requirements
    recent_requirements = await db.vendor_requirements.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "requirement_id": 1, "title": 1, "status": 1, "created_at": 1, "department": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Top vendors by work orders
    top_vendors = await db.vendors.find(
        {"is_active": True, "total_work_orders": {"$gt": 0}},
        {"_id": 0, "id": 1, "vendor_id": 1, "name": 1, "category": 1, "total_work_orders": 1, "rating": 1}
    ).sort("total_work_orders", -1).limit(5).to_list(5)
    
    return {
        "vendors": {
            "total": total_vendors,
            "active": active_vendors,
            "under_review": under_review,
            "by_category": [{"category": v["_id"] or "Uncategorized", "count": v["count"]} for v in vendors_by_category]
        },
        "requirements": {
            "total": total_requirements,
            "pending": pending_requirements,
            "recent": recent_requirements
        },
        "work_orders": {
            "total": total_work_orders,
            "open": open_work_orders,
            "completed_this_month": completed_this_month,
            "by_status": {s["_id"]: s["count"] for s in wo_by_status},
            "recent": recent_work_orders
        },
        "top_vendors": top_vendors
    }


# ============== AUDIT LOGGING ==============

async def log_vendor_audit(
    db,
    action: str,
    entity_type: str,
    entity_id: str,
    entity_name: str,
    user_id: str,
    user_name: str,
    details: dict = None
):
    """Log vendor management audit trail"""
    audit_doc = {
        "id": str(uuid.uuid4()),
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "user_id": user_id,
        "user_name": user_name,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.vendor_audit_logs.insert_one(audit_doc)


@router.get("/audit-logs")
async def get_vendor_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user_dep)
):
    """Get vendor audit logs"""
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    
    logs = await db.vendor_audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.vendor_audit_logs.count_documents(query)
    
    return {
        "logs": logs,
        "total": total
    }



# ============== PROPOSAL MANAGEMENT ==============

@router.post("/requirements/{requirement_id}/proposals")
async def add_proposal(
    requirement_id: str,
    proposal: ProposalCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Add a vendor proposal to a requirement"""
    req = await db.vendor_requirements.find_one({"id": requirement_id})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    vendor = await db.vendors.find_one({"id": proposal.vendor_id}, {"name": 1})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    proposal_doc = {
        "id": str(uuid.uuid4()),
        "requirement_id": requirement_id,
        "vendor_id": proposal.vendor_id,
        "vendor_name": vendor.get("name"),
        "amount": proposal.amount,
        "currency": proposal.currency,
        "delivery_days": proposal.delivery_days,
        "notes": proposal.notes,
        "quotation_url": proposal.quotation_url,
        "status": ProposalStatus.submitted.value,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "submitted_by": user.get("id"),
        "submitted_by_name": user.get("name")
    }
    
    # Add to requirement's proposals array
    await db.vendor_requirements.update_one(
        {"id": requirement_id},
        {
            "$push": {"proposals": proposal_doc},
            "$set": {
                "status": RequirementStatus.proposals_received.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Also store in separate collection for easier querying
    await db.vendor_proposals.insert_one(proposal_doc)
    
    await log_vendor_audit(
        db, "proposal_added", "proposal", proposal_doc["id"],
        f"Proposal from {vendor.get('name')}", user.get("id"), user.get("name"),
        {"requirement_id": requirement_id, "amount": proposal.amount}
    )
    
    if "_id" in proposal_doc:
        del proposal_doc["_id"]
    return proposal_doc


@router.get("/requirements/{requirement_id}/proposals")
async def get_requirement_proposals(
    requirement_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get all proposals for a requirement with comparison view"""
    req = await db.vendor_requirements.find_one({"id": requirement_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    proposals = req.get("proposals", [])
    
    # Enrich with vendor ratings
    for p in proposals:
        vendor = await db.vendors.find_one({"id": p.get("vendor_id")}, {"rating": 1, "total_work_orders": 1})
        if vendor:
            p["vendor_rating"] = vendor.get("rating")
            p["vendor_work_orders"] = vendor.get("total_work_orders", 0)
    
    # Sort by amount for comparison
    proposals_sorted = sorted(proposals, key=lambda x: x.get("amount", 0))
    
    return {
        "requirement": req,
        "proposals": proposals_sorted,
        "lowest_amount": proposals_sorted[0]["amount"] if proposals_sorted else None,
        "highest_amount": proposals_sorted[-1]["amount"] if proposals_sorted else None,
        "proposal_count": len(proposals)
    }


@router.post("/requirements/{requirement_id}/proposals/{proposal_id}/select")
async def select_proposal(
    requirement_id: str,
    proposal_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Select a vendor proposal"""
    req = await db.vendor_requirements.find_one({"id": requirement_id})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    proposals = req.get("proposals", [])
    selected_proposal = None
    
    for p in proposals:
        if p["id"] == proposal_id:
            p["status"] = ProposalStatus.selected.value
            selected_proposal = p
        else:
            if p["status"] not in [ProposalStatus.rejected.value]:
                p["status"] = ProposalStatus.rejected.value
    
    if not selected_proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    await db.vendor_requirements.update_one(
        {"id": requirement_id},
        {"$set": {
            "proposals": proposals,
            "selected_vendor_id": selected_proposal["vendor_id"],
            "selected_proposal_id": proposal_id,
            "status": RequirementStatus.vendor_selected.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update proposal in separate collection
    await db.vendor_proposals.update_one(
        {"id": proposal_id},
        {"$set": {"status": ProposalStatus.selected.value}}
    )
    
    await log_vendor_audit(
        db, "proposal_selected", "proposal", proposal_id,
        f"Selected {selected_proposal['vendor_name']}", user.get("id"), user.get("name"),
        {"requirement_id": requirement_id, "amount": selected_proposal["amount"]}
    )
    
    return {"message": "Proposal selected", "vendor": selected_proposal["vendor_name"]}


# ============== APPROVAL WORKFLOW ==============

@router.post("/requirements/{requirement_id}/submit-for-approval")
async def submit_for_approval(
    requirement_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Submit requirement for approval after vendor selection"""
    req = await db.vendor_requirements.find_one({"id": requirement_id})
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    if not req.get("selected_vendor_id"):
        raise HTTPException(status_code=400, detail="Please select a vendor first")
    
    approval_doc = {
        "id": str(uuid.uuid4()),
        "entity_type": "requirement",
        "entity_id": requirement_id,
        "entity_name": req.get("title"),
        "submitted_by": user.get("id"),
        "submitted_by_name": user.get("name"),
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "levels": [
            {"level": "team_lead", "status": ApprovalStatus.pending.value, "approver_id": None, "approved_at": None, "comments": None},
            {"level": "manager", "status": ApprovalStatus.pending.value, "approver_id": None, "approved_at": None, "comments": None},
            {"level": "finance", "status": ApprovalStatus.pending.value, "approver_id": None, "approved_at": None, "comments": None}
        ],
        "current_level": "team_lead",
        "overall_status": ApprovalStatus.pending.value,
        "is_active": True
    }
    
    await db.vendor_approvals.insert_one(approval_doc)
    
    await db.vendor_requirements.update_one(
        {"id": requirement_id},
        {"$set": {
            "approval_id": approval_doc["id"],
            "approval_status": ApprovalStatus.pending.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_vendor_audit(
        db, "submitted_for_approval", "requirement", requirement_id,
        req.get("title"), user.get("id"), user.get("name")
    )
    
    del approval_doc["_id"]
    return approval_doc


@router.get("/approvals/pending")
async def get_pending_approvals(
    level: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get pending approvals"""
    query = {"is_active": True, "overall_status": ApprovalStatus.pending.value}
    if level:
        query["current_level"] = level
    
    approvals = await db.vendor_approvals.find(query, {"_id": 0}).sort("submitted_at", -1).to_list(50)
    
    # Enrich with entity details
    for approval in approvals:
        if approval.get("entity_type") == "requirement":
            req = await db.vendor_requirements.find_one(
                {"id": approval["entity_id"]},
                {"_id": 0, "title": 1, "department": 1, "selected_vendor_id": 1, "proposals": 1}
            )
            if req:
                approval["requirement_details"] = req
                # Get selected proposal amount
                selected = next((p for p in req.get("proposals", []) if p.get("status") == "selected"), None)
                if selected:
                    approval["selected_amount"] = selected.get("amount")
    
    return {"approvals": approvals}


@router.post("/approvals/{approval_id}/action")
async def approval_action(
    approval_id: str,
    action: ApprovalAction,
    user: dict = Depends(get_current_user_dep)
):
    """Approve, reject, or request revision"""
    approval = await db.vendor_approvals.find_one({"id": approval_id})
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    
    current_level = approval.get("current_level")
    levels = approval.get("levels", [])
    now = datetime.now(timezone.utc).isoformat()
    
    # Update current level
    level_order = ["team_lead", "manager", "finance"]
    for i, level in enumerate(levels):
        if level["level"] == current_level:
            level["status"] = action.action
            level["approver_id"] = user.get("id")
            level["approver_name"] = user.get("name")
            level["approved_at"] = now
            level["comments"] = action.comments
            
            if action.action == "approve":
                # Move to next level or complete
                if i < len(level_order) - 1:
                    next_level = level_order[i + 1]
                    await db.vendor_approvals.update_one(
                        {"id": approval_id},
                        {"$set": {
                            "levels": levels,
                            "current_level": next_level,
                            "updated_at": now
                        }}
                    )
                else:
                    # All levels approved
                    await db.vendor_approvals.update_one(
                        {"id": approval_id},
                        {"$set": {
                            "levels": levels,
                            "overall_status": ApprovalStatus.approved.value,
                            "completed_at": now,
                            "updated_at": now
                        }}
                    )
                    # Update requirement status
                    await db.vendor_requirements.update_one(
                        {"id": approval["entity_id"]},
                        {"$set": {"approval_status": ApprovalStatus.approved.value}}
                    )
            
            elif action.action == "reject":
                await db.vendor_approvals.update_one(
                    {"id": approval_id},
                    {"$set": {
                        "levels": levels,
                        "overall_status": ApprovalStatus.rejected.value,
                        "updated_at": now
                    }}
                )
                await db.vendor_requirements.update_one(
                    {"id": approval["entity_id"]},
                    {"$set": {"approval_status": ApprovalStatus.rejected.value}}
                )
            
            elif action.action == "request_revision":
                await db.vendor_approvals.update_one(
                    {"id": approval_id},
                    {"$set": {
                        "levels": levels,
                        "overall_status": ApprovalStatus.revision_requested.value,
                        "updated_at": now
                    }}
                )
            
            break
    
    await log_vendor_audit(
        db, f"approval_{action.action}", "approval", approval_id,
        approval.get("entity_name"), user.get("id"), user.get("name"),
        {"level": current_level}
    )
    
    return {"message": f"Approval {action.action}d at {current_level} level"}


# ============== CONVERT WORK REQUEST TO WORK ORDER ==============

@router.post("/requirements/{requirement_id}/convert-to-order")
async def convert_request_to_work_order(
    requirement_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Convert an approved work request into a work order"""
    req = await db.vendor_requirements.find_one({"id": requirement_id})
    if not req:
        raise HTTPException(status_code=404, detail="Work request not found")
    
    # Check if request has been approved
    if req.get("approval_status") != "approved":
        raise HTTPException(status_code=400, detail="Work request must be approved before converting to work order")
    
    # Check if vendor is selected
    if not req.get("selected_vendor_id"):
        raise HTTPException(status_code=400, detail="No vendor selected for this request")
    
    # Check if already converted
    if req.get("work_order_id"):
        raise HTTPException(status_code=400, detail="Work request already converted to work order")
    
    # Get selected proposal
    proposals = req.get("proposals", [])
    selected_proposal = next((p for p in proposals if p.get("status") == "selected"), None)
    
    # Get vendor details
    vendor = await db.vendors.find_one({"id": req["selected_vendor_id"]}, {"name": 1, "vendor_type": 1})
    if not vendor:
        raise HTTPException(status_code=404, detail="Selected vendor not found")
    
    # Generate work order ID
    count = await db.vendor_work_orders.count_documents({})
    wo_id = f"WO-{str(count + 1).zfill(5)}"
    
    # Create work order document
    order_doc = {
        "id": str(uuid.uuid4()),
        "work_order_id": wo_id,
        "vendor_id": req["selected_vendor_id"],
        "vendor_name": vendor.get("name"),
        "vendor_type": vendor.get("vendor_type", "vendor"),
        "requirement_id": requirement_id,
        "department": req.get("department"),
        "work_description": req.get("description"),
        "campaign_project": None,
        "deliverable_type": None,
        "assigned_owner_id": req.get("assigned_owner_id") or user.get("id"),
        "assigned_owner_name": req.get("assigned_owner_name") or user.get("name"),
        "start_date": datetime.now(timezone.utc).isoformat().split('T')[0],
        "expected_completion_date": req.get("expected_completion_date"),
        "actual_completion_date": None,
        "attachments": req.get("attachments", []),
        "deliverables": [],
        "status": WorkOrderStatus.assigned.value,
        "agreed_amount": selected_proposal.get("amount") if selected_proposal else None,
        "agreed_currency": selected_proposal.get("currency", "INR") if selected_proposal else "INR",
        "agreed_delivery_days": selected_proposal.get("delivery_days") if selected_proposal else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    
    await db.vendor_work_orders.insert_one(order_doc)
    
    # Update vendor work order count
    await db.vendors.update_one(
        {"id": req["selected_vendor_id"]},
        {"$inc": {"total_work_orders": 1}}
    )
    
    # Update requirement status and link to work order
    await db.vendor_requirements.update_one(
        {"id": requirement_id},
        {"$set": {
            "status": RequirementStatus.work_in_progress.value,
            "work_order_id": order_doc["id"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_vendor_audit(
        db, "request_converted_to_order", "requirement", requirement_id,
        req.get("title"), user.get("id"), user.get("name"),
        {"work_order_id": wo_id, "vendor": vendor.get("name")}
    )
    
    del order_doc["_id"]
    return {
        "message": "Work request converted to work order successfully",
        "work_order": order_doc
    }


# ============== ADVANCE/UPFRONT PAYMENTS ==============

@router.post("/work-orders/{order_id}/payments")
async def create_work_order_payment(
    order_id: str,
    payment: WorkOrderPaymentCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create payment request for work order (advance, partial, milestone, final)"""
    order = await db.vendor_work_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    vendor = await db.vendors.find_one({"id": order.get("vendor_id")}, {"name": 1})
    
    # Payment can be created at any stage (advance, during work, or after completion)
    payment_doc = {
        "id": str(uuid.uuid4()),
        "title": f"{payment.payment_type.value.title()} Payment - {order.get('work_order_id')}",
        "vendor_name": vendor.get("name") if vendor else "Unknown",
        "amount": payment.amount,
        "currency": "INR",
        "category": "Vendor Payment",
        "description": payment.description or f"{payment.payment_type.value.title()} payment for {order.get('work_description', '')[:100]}",
        "due_date": None,
        "invoice_number": payment.invoice_number,
        "po_number": payment.po_number,
        "budget_id": None,
        "status": "pending",
        "payment_type": payment.payment_type.value,
        "requester_id": user.get("id"),
        "requester_name": user.get("name"),
        "requester_department": order.get("department"),
        "linked_work_order_id": order_id,
        "linked_vendor_id": order.get("vendor_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "comments": [],
        "is_active": True
    }
    
    await db.finance_payment_requests.insert_one(payment_doc)
    
    # Track payments on work order
    await db.vendor_work_orders.update_one(
        {"id": order_id},
        {
            "$push": {"payment_requests": {"id": payment_doc["id"], "type": payment.payment_type.value, "amount": payment.amount}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    await log_vendor_audit(
        db, f"{payment.payment_type.value}_payment_created", "work_order", order_id,
        order.get("work_order_id"), user.get("id"), user.get("name"),
        {"amount": payment.amount, "type": payment.payment_type.value}
    )
    
    del payment_doc["_id"]
    return {"message": f"{payment.payment_type.value.title()} payment request created", "payment_request": payment_doc}


@router.get("/work-orders/{order_id}/payments")
async def get_work_order_payments(
    order_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get all payments for a work order"""
    order = await db.vendor_work_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    payment_ids = [p["id"] for p in order.get("payment_requests", [])]
    
    payments = await db.finance_payment_requests.find(
        {"id": {"$in": payment_ids}},
        {"_id": 0}
    ).to_list(20)
    
    total_requested = sum(p.get("amount", 0) for p in payments)
    total_paid = sum(p.get("amount", 0) for p in payments if p.get("status") == "completed")
    
    return {
        "payments": payments,
        "summary": {
            "total_requested": total_requested,
            "total_paid": total_paid,
            "pending": total_requested - total_paid
        }
    }


# ============== RECURRING VENDOR WORK ==============

@router.post("/recurring")
async def create_recurring_work(
    recurring: RecurringWorkCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create recurring vendor work schedule"""
    vendor = await db.vendors.find_one({"id": recurring.vendor_id}, {"name": 1})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    from dateutil.relativedelta import relativedelta
    from datetime import datetime as dt
    
    start = dt.fromisoformat(recurring.start_date.replace('Z', '+00:00'))
    
    # Calculate next due date based on frequency
    if recurring.frequency == RecurringFrequency.daily:
        next_due = start + relativedelta(days=1)
    elif recurring.frequency == RecurringFrequency.weekly:
        next_due = start + relativedelta(weeks=1)
    elif recurring.frequency == RecurringFrequency.monthly:
        next_due = start + relativedelta(months=1)
    elif recurring.frequency == RecurringFrequency.quarterly:
        next_due = start + relativedelta(months=3)
    else:  # yearly
        next_due = start + relativedelta(years=1)
    
    recurring_doc = {
        "id": str(uuid.uuid4()),
        "name": recurring.name,
        "vendor_id": recurring.vendor_id,
        "vendor_name": vendor.get("name"),
        "department": recurring.department,
        "description": recurring.description,
        "frequency": recurring.frequency.value,
        "start_date": recurring.start_date,
        "next_due_date": next_due.isoformat(),
        "estimated_amount": recurring.estimated_amount,
        "assigned_owner_id": user.get("id"),
        "assigned_owner_name": user.get("name"),
        "work_orders_created": [],
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id")
    }
    
    await db.vendor_recurring.insert_one(recurring_doc)
    
    await log_vendor_audit(
        db, "recurring_work_created", "recurring", recurring_doc["id"],
        recurring.name, user.get("id"), user.get("name")
    )
    
    del recurring_doc["_id"]
    return recurring_doc


@router.put("/recurring/{recurring_id}")
async def update_recurring_work(
    recurring_id: str,
    update_data: dict,
    user: dict = Depends(get_current_user_dep)
):
    """Update a recurring work schedule"""
    recurring = await db.vendor_recurring.find_one({"id": recurring_id})
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring work not found")
    
    # Build update dict
    update_fields = {}
    allowed_fields = ["name", "description", "frequency", "estimated_amount", "start_date", "end_date", "is_active", "assigned_owner_id", "department"]
    
    for field in allowed_fields:
        if field in update_data:
            update_fields[field] = update_data[field]
    
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.vendor_recurring.update_one(
        {"id": recurring_id},
        {"$set": update_fields}
    )
    
    await log_vendor_audit(
        db, "recurring_work_updated", "recurring", recurring_id,
        recurring.get("name"), user.get("id"), user.get("name"),
        {"updated_fields": list(update_fields.keys())}
    )
    
    return {"message": "Recurring schedule updated", "updated_fields": list(update_fields.keys())}


@router.delete("/recurring/{recurring_id}")
async def delete_recurring_work(
    recurring_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a recurring work schedule"""
    recurring = await db.vendor_recurring.find_one({"id": recurring_id})
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring work not found")
    
    await db.vendor_recurring.update_one(
        {"id": recurring_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_vendor_audit(
        db, "recurring_work_deleted", "recurring", recurring_id,
        recurring.get("name"), user.get("id"), user.get("name")
    )
    
    return {"message": "Recurring schedule deleted"}


@router.post("/recurring/{recurring_id}/create-work-order")
async def create_work_order_from_recurring(
    recurring_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Manually create work order from recurring schedule"""
    recurring = await db.vendor_recurring.find_one({"id": recurring_id})
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring work not found")
    
    # Create work order
    count = await db.vendor_work_orders.count_documents({})
    wo_id = f"WO-{str(count + 1).zfill(5)}"
    
    order_doc = {
        "id": str(uuid.uuid4()),
        "work_order_id": wo_id,
        "vendor_id": recurring["vendor_id"],
        "vendor_name": recurring["vendor_name"],
        "requirement_id": None,
        "recurring_id": recurring_id,
        "department": recurring["department"],
        "work_description": recurring["description"],
        "order_type": "recurring",
        "agreed_amount": recurring.get("estimated_amount"),
        "assigned_owner_id": recurring.get("assigned_owner_id") or user.get("id"),
        "assigned_owner_name": recurring.get("assigned_owner_name") or user.get("name"),
        "start_date": datetime.now(timezone.utc).isoformat(),
        "expected_completion_date": None,
        "actual_completion_date": None,
        "attachments": [],
        "deliverables": [],
        "payment_requests": [],
        "status": WorkOrderStatus.assigned.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    
    await db.vendor_work_orders.insert_one(order_doc)
    
    # Update recurring with new work order and next due date
    from dateutil.relativedelta import relativedelta
    from datetime import datetime as dt
    
    now = dt.now(timezone.utc)
    freq = recurring["frequency"]
    
    if freq == "daily":
        next_due = now + relativedelta(days=1)
    elif freq == "weekly":
        next_due = now + relativedelta(weeks=1)
    elif freq == "monthly":
        next_due = now + relativedelta(months=1)
    elif freq == "quarterly":
        next_due = now + relativedelta(months=3)
    else:
        next_due = now + relativedelta(years=1)
    
    await db.vendor_recurring.update_one(
        {"id": recurring_id},
        {
            "$push": {"work_orders_created": {"id": order_doc["id"], "wo_id": wo_id, "created_at": now.isoformat()}},
            "$set": {"next_due_date": next_due.isoformat()}
        }
    )
    
    await db.vendors.update_one(
        {"id": recurring["vendor_id"]},
        {"$inc": {"total_work_orders": 1}}
    )
    
    del order_doc["_id"]
    return {"message": "Work order created from recurring schedule", "work_order": order_doc}


# ============== PO & INVOICE TRACKING ==============

@router.post("/po-invoices")
async def create_po_invoice_record(
    record: POInvoiceCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create PO/Invoice reference record"""
    order = await db.vendor_work_orders.find_one({"id": record.work_order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    vendor = await db.vendors.find_one({"id": order.get("vendor_id")}, {"name": 1})
    
    doc = {
        "id": str(uuid.uuid4()),
        "work_order_id": record.work_order_id,
        "work_order_number": order.get("work_order_id"),
        "vendor_id": order.get("vendor_id"),
        "vendor_name": vendor.get("name") if vendor else "Unknown",
        "po_number": record.po_number,
        "invoice_number": record.invoice_number,
        "invoice_date": record.invoice_date,
        "amount": record.amount,
        "invoice_url": record.invoice_url,
        "notes": record.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "is_active": True
    }
    
    await db.vendor_po_invoices.insert_one(doc)
    
    # Update work order with PO/Invoice reference
    await db.vendor_work_orders.update_one(
        {"id": record.work_order_id},
        {
            "$push": {"po_invoices": {"id": doc["id"], "po": record.po_number, "invoice": record.invoice_number}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    await log_vendor_audit(
        db, "po_invoice_recorded", "po_invoice", doc["id"],
        f"PO: {record.po_number or 'N/A'}, Invoice: {record.invoice_number or 'N/A'}",
        user.get("id"), user.get("name")
    )
    
    del doc["_id"]
    return doc


@router.get("/po-invoices/{record_id}")
async def get_po_invoice(record_id: str, user: dict = Depends(get_current_user_dep)):
    """Get PO/Invoice record details"""
    record = await db.vendor_po_invoices.find_one({"id": record_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record
