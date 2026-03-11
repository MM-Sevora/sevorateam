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


# ============== MODELS ==============

class VendorCreate(BaseModel):
    name: str
    category: str
    services: Optional[List[str]] = []
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_tax_id: Optional[str] = None
    notes: Optional[str] = None


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    services: Optional[List[str]] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_tax_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[VendorStatus] = None


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
    start_date: Optional[str] = None
    expected_completion_date: Optional[str] = None
    attachments: Optional[List[str]] = []


class WorkOrderUpdate(BaseModel):
    work_description: Optional[str] = None
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
        "services": vendor.services or [],
        "contact_person": vendor.contact_person,
        "phone": vendor.phone,
        "email": vendor.email,
        "address": vendor.address,
        "gst_tax_id": vendor.gst_tax_id,
        "notes": vendor.notes,
        "status": VendorStatus.active.value,
        "rating": None,
        "total_ratings": 0,
        "total_work_orders": 0,
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
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"services": {"$regex": search, "$options": "i"}},
            {"vendor_id": {"$regex": search, "$options": "i"}}
        ]
    
    vendors = await db.vendors.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.vendors.count_documents(query)
    
    return {
        "vendors": vendors,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{vendor_id}")
async def get_vendor(vendor_id: str, user: dict = Depends(get_current_user_dep)):
    """Get vendor details"""
    vendor = await db.vendors.find_one({"id": vendor_id}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Get recent work orders
    work_orders = await db.vendor_work_orders.find(
        {"vendor_id": vendor_id, "is_active": True},
        {"_id": 0, "id": 1, "work_order_id": 1, "work_description": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    vendor["recent_work_orders"] = work_orders
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
    vendor = await db.vendors.find_one({"id": order.vendor_id}, {"name": 1})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    count = await db.vendor_work_orders.count_documents({})
    wo_id = f"WO-{str(count + 1).zfill(5)}"
    
    order_doc = {
        "id": str(uuid.uuid4()),
        "work_order_id": wo_id,
        "vendor_id": order.vendor_id,
        "vendor_name": vendor.get("name"),
        "requirement_id": order.requirement_id,
        "department": order.department,
        "work_description": order.work_description,
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
    
    del proposal_doc["_id"] if "_id" in proposal_doc else None
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


@router.get("/recurring")
async def list_recurring_work(
    vendor_id: Optional[str] = None,
    department: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """List recurring vendor work"""
    query = {"is_active": True}
    if vendor_id:
        query["vendor_id"] = vendor_id
    if department:
        query["department"] = department
    
    recurring = await db.vendor_recurring.find(query, {"_id": 0}).sort("next_due_date", 1).to_list(50)
    
    # Mark items due soon
    now = datetime.now(timezone.utc)
    for r in recurring:
        next_due = datetime.fromisoformat(r["next_due_date"].replace('Z', '+00:00'))
        days_until_due = (next_due - now).days
        r["days_until_due"] = days_until_due
        r["is_overdue"] = days_until_due < 0
        r["is_due_soon"] = 0 <= days_until_due <= 7
    
    return {"recurring_work": recurring}


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


@router.get("/po-invoices/{record_id}")
async def get_po_invoice(record_id: str, user: dict = Depends(get_current_user_dep)):
    """Get PO/Invoice record details"""
    record = await db.vendor_po_invoices.find_one({"id": record_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record
