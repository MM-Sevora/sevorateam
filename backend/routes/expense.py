"""
Expense & Reimbursement Routes
HR Module - Expense claim submission and approval
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64
import os
import logging

from models.expense import (
    ExpenseClaimCreate, ExpenseClaimUpdate, ExpenseClaimResponse,
    ExpenseClaimEmployeeUpdate, ExpenseCategory, ClaimStatus
)

expense_router = APIRouter(prefix="/expense", tags=["Expense & Reimbursement"])

logger = logging.getLogger(__name__)

# Import email service (lazy import to avoid circular deps)
def get_email_service():
    from services.graph_email_service import graph_email_service
    return graph_email_service


def get_db():
    from server import db
    return db

def get_current_user_dep():
    from server import get_current_user
    return get_current_user

def require_hr():
    from server import require_department
    return require_department(["admin", "hr"])

def require_hr_or_finance():
    """Require HR Admin or Finance Admin access"""
    from server import require_department
    return require_department(["admin", "hr", "finance"])


async def generate_claim_id(db) -> str:
    """Generate next claim ID in SEVRC001 format"""
    last_claim = await db.expense_claims.find_one(
        {"claim_id": {"$regex": "^SEVRC"}},
        sort=[("claim_id", -1)]
    )
    
    if last_claim and last_claim.get("claim_id"):
        try:
            last_num = int(last_claim["claim_id"].replace("SEVRC", ""))
            return f"SEVRC{str(last_num + 1).zfill(3)}"
        except Exception:
            pass
    
    return "SEVRC001"


async def get_employee_details(db, user_id: str) -> dict:
    """Get employee details for claim"""
    # Try employees collection first
    employee = await db.employees.find_one({"user_id": user_id}, {"_id": 0})
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    
    if not user:
        return {}
    
    details = {
        "employee_id": user_id,
        "employee_name": user.get("name", "Unknown"),
        "employee_email": user.get("email", ""),
    }
    
    if employee:
        details["employee_code"] = employee.get("employee_code")
        details["grade_id"] = employee.get("grade_id")
        details["department_id"] = employee.get("department_id")
        
        # Get grade name
        if employee.get("grade_id"):
            grade = await db.grade_types.find_one({"id": employee["grade_id"]}, {"name": 1})
            details["employee_grade"] = grade.get("name") if grade else None
        
        # Get department name
        if employee.get("department_id"):
            dept = await db.departments.find_one({"id": employee["department_id"]}, {"name": 1})
            details["department_name"] = dept.get("name") if dept else None
    
    return details


# ============== EMPLOYEE ENDPOINTS ==============

@expense_router.post("/claims", response_model=ExpenseClaimResponse)
async def submit_expense_claim(
    data: ExpenseClaimCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep())
):
    """Submit a new expense claim - integrated with Approval Workflow Manager"""
    db = get_db()
    
    # Import approval integration helper
    from utils.approval_integration import submit_for_approval
    
    if not data.declaration_accepted:
        raise HTTPException(status_code=400, detail="Declaration must be accepted")
    
    if not data.entries or len(data.entries) == 0:
        raise HTTPException(status_code=400, detail="At least one expense entry is required")
    
    # Calculate total
    total_amount = sum(entry.amount for entry in data.entries)
    
    if total_amount <= 0:
        raise HTTPException(status_code=400, detail="Total amount must be greater than 0")
    
    # Get employee details
    emp_details = await get_employee_details(db, user.get("id"))
    
    # Generate claim ID
    claim_id = await generate_claim_id(db)
    
    now = datetime.now(timezone.utc).isoformat()
    
    claim_doc = {
        "id": str(uuid.uuid4()),
        "claim_id": claim_id,
        **emp_details,
        "entries": [entry.model_dump() for entry in data.entries],
        "total_amount": total_amount,
        "status": "pending",
        "approval_status": "pending",
        "declaration_accepted": True,
        "notes": data.notes,
        "created_at": now,
        "updated_at": now
    }
    
    await db.expense_claims.insert_one(claim_doc)
    
    # Submit to Approval Workflow Manager
    approval_request = await submit_for_approval(
        db=db,
        approval_type="expense_claim",
        entity_type="expense_claim",
        entity_id=claim_doc["id"],
        entity_title=f"Expense Claim {claim_id} - ₹{total_amount:,.2f}",
        requester_id=user.get("id"),
        amount=total_amount,
        department_id=emp_details.get("department_id"),
        entity_details={
            "claim_id": claim_id,
            "total_amount": total_amount,
            "entries_count": len(data.entries),
            "entries_summary": [
                {
                    "category": e.category,
                    "description": e.description,
                    "amount": e.amount,
                    "date_from": e.expense_date_from,
                    "date_to": e.expense_date_to
                } for e in data.entries
            ],
            "employee_name": emp_details.get("employee_name"),
            "employee_code": emp_details.get("employee_code"),
            "department": emp_details.get("department_name"),
            "grade": emp_details.get("employee_grade")
        },
        notes=data.notes
    )
    
    if approval_request:
        # Link approval request to expense claim
        await db.expense_claims.update_one(
            {"id": claim_doc["id"]},
            {"$set": {
                "approval_request_id": approval_request.get("id"),
                "workflow_id": approval_request.get("workflow_id"),
                "workflow_name": approval_request.get("workflow_name")
            }}
        )
        claim_doc["approval_request_id"] = approval_request.get("id")
        
        # Create notification about approval workflow
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user.get("id"),
            "title": f"Expense Claim {claim_id} Submitted",
            "message": f"Your expense claim of ₹{total_amount:,.2f} has been submitted for approval via {approval_request.get('workflow_name', 'workflow')}",
            "category": "finance",
            "priority": "normal",
            "entity_type": "expense_claim",
            "entity_id": claim_doc["id"],
            "action_url": f"/approvals/{approval_request.get('id')}",
            "is_read": False,
            "created_at": now
        })
    else:
        # No workflow configured - fallback to legacy HR notification
        logger.warning(f"No expense_claim workflow found, using legacy notification for claim {claim_id}")
        
        notification_doc = {
            "id": str(uuid.uuid4()),
            "type": "expense_claim",
            "title": f"New Expense Claim - {claim_id}",
            "message": f"{emp_details.get('employee_name', 'An employee')} submitted an expense claim of ₹{total_amount:,.2f}",
            "link": f"/hr/expenses/{claim_doc['id']}",
            "for_role": "hr",
            "read": False,
            "created_at": now
        }
        await db.notifications.insert_one(notification_doc)
    
    # Send email notification to HR (in background)
    async def send_hr_email():
        try:
            email_service = get_email_service()
            await email_service.notify_hr_new_claim(
                claim_id=claim_id,
                employee_name=emp_details.get("employee_name", "Unknown"),
                employee_email=emp_details.get("employee_email", ""),
                total_amount=total_amount,
                department=emp_details.get("department_name"),
                entries_count=len(data.entries)
            )
        except Exception as e:
            logger.error(f"Failed to send HR email notification for claim {claim_id}: {e}")
    
    background_tasks.add_task(send_hr_email)
    
    if "_id" in claim_doc:
        del claim_doc["_id"]
    
    return claim_doc


@expense_router.get("/claims/my", response_model=List[ExpenseClaimResponse])
async def get_my_claims(
    status: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    user: dict = Depends(get_current_user_dep())
):
    """Get current user's expense claims"""
    db = get_db()
    
    query = {"employee_id": user.get("id")}
    if status:
        query["status"] = status
    
    claims = await db.expense_claims.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return claims


@expense_router.get("/claims/my/stats")
async def get_my_claim_stats(user: dict = Depends(get_current_user_dep())):
    """Get current user's claim statistics"""
    db = get_db()
    
    user_id = user.get("id")
    
    total_claims = await db.expense_claims.count_documents({"employee_id": user_id})
    pending = await db.expense_claims.count_documents({"employee_id": user_id, "status": "pending"})
    approved = await db.expense_claims.count_documents({"employee_id": user_id, "status": "approved"})
    rejected = await db.expense_claims.count_documents({"employee_id": user_id, "status": "rejected"})
    
    # Calculate totals
    all_claims = await db.expense_claims.find(
        {"employee_id": user_id},
        {"total_amount": 1, "approved_amount": 1, "status": 1}
    ).to_list(1000)
    
    total_claimed = sum(c.get("total_amount", 0) for c in all_claims)
    total_approved = sum(c.get("approved_amount", 0) or c.get("total_amount", 0) 
                        for c in all_claims if c.get("status") == "approved")
    
    return {
        "total_claims": total_claims,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "total_claimed": total_claimed,
        "total_approved": total_approved
    }


# ============== HR ENDPOINTS ==============

@expense_router.get("/claims", response_model=List[ExpenseClaimResponse])
async def get_all_claims(
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    department_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    skip: int = Query(default=0, ge=0),
    user: dict = Depends(require_hr_or_finance())
):
    """
    Get all expense claims.
    
    Access Control:
    - HR/Finance Admin: Can see all claims
    - Regular users: Use /claims/my endpoint
    
    Data scope filtering applied based on user's RBAC permissions.
    """
    db = get_db()
    
    # Import RBAC utilities
    from utils.permissions import can_user_crud, apply_data_scope_to_query
    
    # Check RBAC permission for expense module
    if not can_user_crud(user, "expense", "read"):
        raise HTTPException(
            status_code=403, 
            detail="You don't have permission to view expense claims"
        )
    
    # Build base query
    base_query = {}
    if status:
        base_query["status"] = status
    if employee_id:
        base_query["employee_id"] = employee_id
    if department_id:
        base_query["department_id"] = department_id
    if date_from:
        base_query["created_at"] = {"$gte": date_from}
    if date_to:
        if "created_at" in base_query:
            base_query["created_at"]["$lte"] = date_to
        else:
            base_query["created_at"] = {"$lte": date_to}
    
    # Apply RBAC data scope filtering
    query = await apply_data_scope_to_query(
        user=user,
        module_code="expense",
        base_query=base_query,
        owner_field="employee_id",  # Claims use employee_id as owner
        assigned_field="approver_id"
    )
    
    claims = await db.expense_claims.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).to_list(limit)
    return claims


@expense_router.get("/claims/stats")
async def get_claims_stats(user: dict = Depends(require_hr())):
    """Get overall claim statistics (HR only)"""
    db = get_db()
    
    total = await db.expense_claims.count_documents({})
    pending = await db.expense_claims.count_documents({"status": "pending"})
    approved = await db.expense_claims.count_documents({"status": "approved"})
    rejected = await db.expense_claims.count_documents({"status": "rejected"})
    
    # This month stats
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    this_month_claims = await db.expense_claims.find(
        {"created_at": {"$gte": month_start}},
        {"total_amount": 1, "approved_amount": 1, "status": 1}
    ).to_list(1000)
    
    this_month_total = sum(c.get("total_amount", 0) for c in this_month_claims)
    this_month_approved = sum(c.get("approved_amount", 0) or c.get("total_amount", 0) 
                             for c in this_month_claims if c.get("status") == "approved")
    this_month_pending = sum(c.get("total_amount", 0) 
                            for c in this_month_claims if c.get("status") == "pending")
    
    # By category
    all_claims = await db.expense_claims.find({}, {"entries": 1, "status": 1}).to_list(1000)
    by_category = {}
    for claim in all_claims:
        for entry in claim.get("entries", []):
            cat = entry.get("category", "others")
            if cat not in by_category:
                by_category[cat] = {"count": 0, "total": 0}
            by_category[cat]["count"] += 1
            by_category[cat]["total"] += entry.get("amount", 0)
    
    return {
        "total_claims": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "this_month": {
            "claims": len(this_month_claims),
            "total_amount": this_month_total,
            "approved_amount": this_month_approved,
            "pending_amount": this_month_pending
        },
        "by_category": by_category
    }


@expense_router.get("/claims/{claim_id}", response_model=ExpenseClaimResponse)
async def get_claim_detail(claim_id: str, user: dict = Depends(get_current_user_dep())):
    """Get single claim detail"""
    db = get_db()
    
    # Try by UUID first, then by claim_id (SEVRC001)
    claim = await db.expense_claims.find_one({"id": claim_id}, {"_id": 0})
    if not claim:
        claim = await db.expense_claims.find_one({"claim_id": claim_id}, {"_id": 0})
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Check access - HR can see all, employees can only see their own
    user_role = user.get("role", "")
    user_dept = user.get("department", "")
    is_hr = user_role == "admin" or user_dept in ["admin", "hr"]
    
    if not is_hr and claim.get("employee_id") != user.get("id"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return claim


@expense_router.put("/claims/{claim_id}")
async def update_expense_claim(
    claim_id: str,
    data: ExpenseClaimEmployeeUpdate,
    user: dict = Depends(get_current_user_dep())
):
    """Update an expense claim (only pending claims can be edited by owner)"""
    db = get_db()
    
    # Find the claim
    claim = await db.expense_claims.find_one({"id": claim_id})
    if not claim:
        claim = await db.expense_claims.find_one({"claim_id": claim_id})
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Only owner can edit their own claim
    if claim.get("employee_id") != user.get("id"):
        raise HTTPException(status_code=403, detail="You can only edit your own claims")
    
    # Only pending claims can be edited
    if claim.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending claims can be edited")
    
    # Build update data
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.entries is not None:
        entries_list = [entry.dict() for entry in data.entries]
        update_data["entries"] = entries_list
        update_data["total_amount"] = sum(entry.amount for entry in data.entries)
    
    if data.notes is not None:
        update_data["notes"] = data.notes
    
    await db.expense_claims.update_one({"id": claim["id"]}, {"$set": update_data})
    
    # Log activity
    activity_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user.get("id"),
        "user_name": user.get("name"),
        "entity_type": "expense_claim",
        "entity_id": claim["id"],
        "action": "updated",
        "message": f"{user.get('name')} updated expense claim {claim.get('claim_id')}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_logs.insert_one(activity_doc)
    
    # Return updated claim
    updated_claim = await db.expense_claims.find_one({"id": claim["id"]}, {"_id": 0})
    return updated_claim


@expense_router.delete("/claims/{claim_id}")
async def delete_expense_claim(
    claim_id: str,
    user: dict = Depends(get_current_user_dep())
):
    """Delete/Cancel an expense claim (only pending claims can be deleted by owner)"""
    db = get_db()
    
    # Find the claim
    claim = await db.expense_claims.find_one({"id": claim_id})
    if not claim:
        claim = await db.expense_claims.find_one({"claim_id": claim_id})
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Only owner can delete their own claim
    if claim.get("employee_id") != user.get("id"):
        raise HTTPException(status_code=403, detail="You can only delete your own claims")
    
    # Only pending claims can be deleted
    if claim.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending claims can be deleted")
    
    # Soft delete by updating status to 'cancelled'
    now = datetime.now(timezone.utc).isoformat()
    await db.expense_claims.update_one(
        {"id": claim["id"]},
        {"$set": {
            "status": "cancelled",
            "cancelled_at": now,
            "cancelled_by": user.get("id"),
            "updated_at": now
        }}
    )
    
    # Delete associated approval task
    await db.unified_tasks.delete_one({
        "source_entity_id": claim["id"],
        "source_entity_type": "expense"
    })
    
    # Log activity
    activity_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user.get("id"),
        "user_name": user.get("name"),
        "entity_type": "expense_claim",
        "entity_id": claim["id"],
        "action": "cancelled",
        "message": f"{user.get('name')} cancelled expense claim {claim.get('claim_id')}",
        "created_at": now
    }
    await db.activity_logs.insert_one(activity_doc)
    
    return {"success": True, "message": f"Expense claim {claim.get('claim_id')} has been cancelled"}


@expense_router.put("/claims/{claim_id}/approve")
async def approve_claim(
    claim_id: str,
    background_tasks: BackgroundTasks,
    approved_amount: Optional[float] = None,
    hr_notes: Optional[str] = None,
    user: dict = Depends(require_hr_or_finance())
):
    """
    Approve an expense claim (HR Admin or Finance Admin).
    
    RBAC: Requires 'update' permission on 'expense' module + can_approve flag.
    """
    db = get_db()
    
    # Check RBAC permissions
    from utils.permissions import can_user_crud
    
    if not can_user_crud(user, "expense", "update"):
        raise HTTPException(
            status_code=403, 
            detail="You don't have permission to approve expense claims"
        )
    
    # Check if user has approval permission
    module_perms = user.get("module_permissions", {}).get("expense", {})
    if not module_perms.get("can_approve", True):  # Default True for backward compatibility
        # Also allow if user is HR/Finance admin
        if user.get("role") not in ["super_admin", "admin"]:
            raise HTTPException(
                status_code=403,
                detail="You don't have approval permission for expense claims"
            )
    
    claim = await db.expense_claims.find_one({"id": claim_id})
    if not claim:
        claim = await db.expense_claims.find_one({"claim_id": claim_id})
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    if claim.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending claims can be approved")
    
    now = datetime.now(timezone.utc).isoformat()
    final_approved_amount = approved_amount or claim.get("total_amount")
    
    update_data = {
        "status": "approved",
        "approved_amount": final_approved_amount,
        "hr_notes": hr_notes,
        "reviewed_by": user.get("id"),
        "reviewed_by_name": user.get("name"),
        "reviewed_at": now,
        "updated_at": now
    }
    
    await db.expense_claims.update_one({"id": claim["id"]}, {"$set": update_data})
    
    # Mark the unified approval task as completed
    await db.unified_tasks.update_one(
        {"source_entity_id": claim["id"], "source_entity_type": "expense", "task_type": "approval"},
        {"$set": {
            "status": "completed",
            "approval_status": "approved",
            "completed_at": now,
            "completed_by": user.get("id"),
            "completed_by_name": user.get("name"),
            "completion_notes": hr_notes,
            "updated_at": now
        }}
    )
    
    # Notify employee via in-app notification
    notification_doc = {
        "id": str(uuid.uuid4()),
        "user_id": claim.get("employee_id"),
        "type": "expense_approved",
        "title": f"Expense Claim Approved - {claim.get('claim_id')}",
        "message": f"Your expense claim of ₹{final_approved_amount:,.2f} has been approved.",
        "link": "/hr/expenses/my",
        "read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notification_doc)
    
    # Send email notification to employee (in background)
    async def send_approval_email():
        try:
            email_service = get_email_service()
            await email_service.notify_employee_claim_approved(
                claim_id=claim.get("claim_id"),
                employee_name=claim.get("employee_name", ""),
                employee_email=claim.get("employee_email", ""),
                total_amount=claim.get("total_amount", 0),
                approved_amount=final_approved_amount,
                hr_notes=hr_notes
            )
        except Exception as e:
            logger.error(f"Failed to send approval email for claim {claim.get('claim_id')}: {e}")
    
    background_tasks.add_task(send_approval_email)
    
    return {"success": True, "message": "Claim approved", "claim_id": claim.get("claim_id")}


@expense_router.put("/claims/{claim_id}/reject")
async def reject_claim(
    claim_id: str,
    rejection_reason: str,
    background_tasks: BackgroundTasks,
    hr_notes: Optional[str] = None,
    user: dict = Depends(require_hr_or_finance())
):
    """Reject an expense claim (HR Admin or Finance Admin)"""
    db = get_db()
    
    claim = await db.expense_claims.find_one({"id": claim_id})
    if not claim:
        claim = await db.expense_claims.find_one({"claim_id": claim_id})
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    if claim.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending claims can be rejected")
    
    if not rejection_reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "status": "rejected",
        "rejection_reason": rejection_reason,
        "hr_notes": hr_notes,
        "reviewed_by": user.get("id"),
        "reviewed_by_name": user.get("name"),
        "reviewed_at": now,
        "updated_at": now
    }
    
    await db.expense_claims.update_one({"id": claim["id"]}, {"$set": update_data})
    
    # Mark the unified approval task as rejected
    await db.unified_tasks.update_one(
        {"source_entity_id": claim["id"], "source_entity_type": "expense", "task_type": "approval"},
        {"$set": {
            "status": "cancelled",
            "approval_status": "rejected",
            "completed_at": now,
            "completed_by": user.get("id"),
            "completed_by_name": user.get("name"),
            "completion_notes": f"Rejected: {rejection_reason}",
            "updated_at": now
        }}
    )
    
    # Notify employee via in-app notification
    notification_doc = {
        "id": str(uuid.uuid4()),
        "user_id": claim.get("employee_id"),
        "type": "expense_rejected",
        "title": f"Expense Claim Rejected - {claim.get('claim_id')}",
        "message": f"Your expense claim has been rejected. Reason: {rejection_reason}",
        "link": "/hr/expenses/my",
        "read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notification_doc)
    
    # Send email notification to employee (in background)
    async def send_rejection_email():
        try:
            email_service = get_email_service()
            await email_service.notify_employee_claim_rejected(
                claim_id=claim.get("claim_id"),
                employee_name=claim.get("employee_name", ""),
                employee_email=claim.get("employee_email", ""),
                total_amount=claim.get("total_amount", 0),
                rejection_reason=rejection_reason,
                hr_notes=hr_notes
            )
        except Exception as e:
            logger.error(f"Failed to send rejection email for claim {claim.get('claim_id')}: {e}")
    
    background_tasks.add_task(send_rejection_email)
    
    return {"success": True, "message": "Claim rejected", "claim_id": claim.get("claim_id")}


# ============== FILE UPLOAD ==============

@expense_router.post("/upload-receipt")
async def upload_receipt(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user_dep())
):
    """Upload expense receipt"""
    # Validate file size (5MB max)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, and PDF files are allowed")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"receipt_{user.get('id')}_{uuid.uuid4().hex[:8]}.{ext}"
    
    # Save to uploads directory
    upload_dir = "/app/backend/uploads/receipts"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Return URL (relative path)
    return {
        "success": True,
        "filename": file.filename,
        "stored_filename": filename,
        "url": f"/api/expense/receipts/{filename}",
        "size": len(contents)
    }


@expense_router.get("/receipts/{filename}")
async def get_receipt(filename: str):
    """Get uploaded receipt file"""
    from fastapi.responses import FileResponse
    
    file_path = f"/app/backend/uploads/receipts/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)


# ============== EXPENSE LIMITS (ADMIN) ==============

@expense_router.get("/limits")
async def get_expense_limits(user: dict = Depends(require_hr())):
    """Get expense limits by grade"""
    db = get_db()
    
    limits = await db.expense_limits.find({}, {"_id": 0}).to_list(100)
    return limits


@expense_router.post("/limits")
async def set_expense_limit(
    grade_id: str,
    monthly_limit: float,
    per_claim_limit: float,
    requires_manager_approval: bool = False,
    manager_approval_threshold: float = 10000,
    user: dict = Depends(require_hr())
):
    """Set expense limit for a grade"""
    db = get_db()
    
    # Get grade name
    grade = await db.grade_types.find_one({"id": grade_id}, {"name": 1})
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    
    limit_doc = {
        "id": str(uuid.uuid4()),
        "grade_id": grade_id,
        "grade_name": grade.get("name"),
        "monthly_limit": monthly_limit,
        "per_claim_limit": per_claim_limit,
        "requires_manager_approval": requires_manager_approval,
        "manager_approval_threshold": manager_approval_threshold,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert
    await db.expense_limits.update_one(
        {"grade_id": grade_id},
        {"$set": limit_doc},
        upsert=True
    )
    
    return limit_doc


# ============== EXPORT ==============

@expense_router.get("/export/csv")
async def export_claims_csv(
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: dict = Depends(require_hr())
):
    """Export claims to CSV"""
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status
    if date_from:
        query["created_at"] = {"$gte": date_from}
    if date_to:
        if "created_at" in query:
            query["created_at"]["$lte"] = date_to
        else:
            query["created_at"] = {"$lte": date_to}
    
    claims = await db.expense_claims.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Generate CSV
    import csv
    import io
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Claim ID", "Employee Name", "Employee Email", "Department", "Grade",
        "Total Amount", "Approved Amount", "Status", "Submission Date", "Review Date"
    ])
    
    # Data
    for claim in claims:
        writer.writerow([
            claim.get("claim_id"),
            claim.get("employee_name"),
            claim.get("employee_email"),
            claim.get("department_name", ""),
            claim.get("employee_grade", ""),
            claim.get("total_amount"),
            claim.get("approved_amount", ""),
            claim.get("status"),
            claim.get("created_at", "")[:10] if claim.get("created_at") else "",
            claim.get("reviewed_at", "")[:10] if claim.get("reviewed_at") else ""
        ])
    
    csv_content = output.getvalue()
    
    from fastapi.responses import Response
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=expense_claims.csv"}
    )
