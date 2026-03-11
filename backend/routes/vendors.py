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
