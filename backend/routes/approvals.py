"""
Approval Workflow Routes
- Submit approval requests
- Approve/reject/delegate actions
- Approval queue management
- Workflow configuration
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from models.approvals import (
    ApprovalStatus, ApprovalAction, ApprovalType, ApproverType,
    ApprovalWorkflowConfig, ApprovalLevelConfig, ApprovalLevelStatus,
    ApprovalRequestCreate, ApprovalRequestResponse, ApprovalActionRequest,
    ApprovalHistoryEntry, DEFAULT_APPROVAL_WORKFLOWS
)

approvals_router = APIRouter(prefix="/approvals", tags=["Approval Workflows"])


# ============== DEPENDENCIES ==============

def get_db():
    from server import db
    return db


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


# ============== HELPER FUNCTIONS ==============

async def get_approver_for_level(db, requester_id: str, level_config: dict) -> Optional[dict]:
    """
    Determine the approver for a given level based on configuration.
    
    Returns approver dict with id, name, email or None if not found.
    """
    approver_type = level_config.get("approver_type", "reporting_manager")
    
    if approver_type == "reporting_manager":
        # Get requester's manager
        requester = await db.users.find_one({"id": requester_id}, {"reports_to": 1})
        if requester and requester.get("reports_to"):
            manager = await db.users.find_one(
                {"id": requester["reports_to"]},
                {"_id": 0, "id": 1, "name": 1, "email": 1}
            )
            return manager
        return None
    
    elif approver_type == "department_head":
        # Get requester's department head
        requester = await db.users.find_one({"id": requester_id}, {"department_id": 1})
        if requester and requester.get("department_id"):
            dept = await db.departments.find_one(
                {"id": requester["department_id"]},
                {"department_head_id": 1}
            )
            if dept and dept.get("department_head_id"):
                head = await db.users.find_one(
                    {"id": dept["department_head_id"]},
                    {"_id": 0, "id": 1, "name": 1, "email": 1}
                )
                return head
        return None
    
    elif approver_type == "specific_user":
        # Use specific user ID from config
        user_id = level_config.get("approver_id")
        if user_id:
            user = await db.users.find_one(
                {"id": user_id},
                {"_id": 0, "id": 1, "name": 1, "email": 1}
            )
            return user
        return None
    
    elif approver_type == "role":
        # Find any user with the specified role
        role_code = level_config.get("approver_role")
        if role_code:
            # Find users with this role
            user = await db.users.find_one(
                {
                    "$or": [
                        {"role": role_code},
                        {"role_ids": role_code},
                        {"custom_role_ids": {"$elemMatch": {"$regex": role_code}}}
                    ],
                    "status": {"$ne": "inactive"}
                },
                {"_id": 0, "id": 1, "name": 1, "email": 1}
            )
            if user:
                return user
            
            # Try to find by role code in roles collection
            role = await db.roles.find_one({"code": role_code}, {"id": 1})
            if role:
                user = await db.users.find_one(
                    {
                        "$or": [
                            {"role_ids": role["id"]},
                            {"custom_role_ids": role["id"]}
                        ],
                        "status": {"$ne": "inactive"}
                    },
                    {"_id": 0, "id": 1, "name": 1, "email": 1}
                )
                return user
        return None
    
    return None


async def build_approval_chain(db, requester_id: str, workflow: dict) -> List[dict]:
    """
    Build the approval chain based on workflow configuration.
    
    Returns list of approval levels with resolved approvers.
    """
    levels = workflow.get("levels", [])
    chain = []
    previous_approver_id = None
    
    for level_config in levels:
        approver = await get_approver_for_level(db, requester_id, level_config)
        
        if not approver:
            # Skip if approver not found and level is not required
            if not level_config.get("is_required", True):
                continue
            # Otherwise use placeholder
            chain.append({
                "level": level_config.get("level", len(chain) + 1),
                "level_name": level_config.get("name", f"Level {len(chain) + 1}"),
                "approver_id": None,
                "approver_name": "Not assigned",
                "approver_email": None,
                "status": ApprovalStatus.PENDING.value,
                "is_required": level_config.get("is_required", True),
                "error": "Approver not found"
            })
            continue
        
        # Check if same as previous (skip if configured)
        if (level_config.get("can_skip_if_same_as_previous", True) and 
            approver["id"] == previous_approver_id):
            continue
        
        chain.append({
            "level": level_config.get("level", len(chain) + 1),
            "level_name": level_config.get("name", f"Level {len(chain) + 1}"),
            "approver_id": approver["id"],
            "approver_name": approver.get("name"),
            "approver_email": approver.get("email"),
            "status": ApprovalStatus.PENDING.value,
            "is_required": level_config.get("is_required", True)
        })
        
        previous_approver_id = approver["id"]
    
    # Renumber levels
    for i, level in enumerate(chain):
        level["level"] = i + 1
    
    return chain


async def get_applicable_workflow(db, approval_type: str, amount: float = None, department_id: str = None) -> Optional[dict]:
    """
    Find the applicable workflow based on criteria.
    """
    # Build query for matching workflows
    query = {
        "approval_type": approval_type,
        "is_active": True
    }
    
    workflows = await db.approval_workflows.find(query, {"_id": 0}).to_list(100)
    
    if not workflows:
        return None
    
    # Filter by amount if provided
    if amount is not None:
        matching = []
        for wf in workflows:
            min_amt = wf.get("min_amount")
            max_amt = wf.get("max_amount")
            
            if min_amt is not None and amount < min_amt:
                continue
            if max_amt is not None and amount > max_amt:
                continue
            matching.append(wf)
        
        if matching:
            # Prefer the most specific workflow (highest min_amount)
            matching.sort(key=lambda w: w.get("min_amount", 0), reverse=True)
            return matching[0]
    
    # Return default workflow
    for wf in workflows:
        if wf.get("is_default"):
            return wf
    
    # Return first active workflow
    return workflows[0] if workflows else None


async def send_approval_notification(db, request: dict, action: str, actor: dict):
    """Send notification for approval action"""
    # TODO: Integrate with notification service
    pass


async def check_user_eligibility(user: dict, workflow: dict) -> bool:
    """
    Check if a user is eligible to use a workflow.
    
    Returns True if eligible, False otherwise.
    """
    user_id = user.get("id")
    user_department_id = user.get("department_id")
    user_role_ids = user.get("role_ids", []) or user.get("custom_role_ids", [])
    user_grade = user.get("grade") or user.get("grade_id")
    
    # Check if explicitly excluded
    excluded_users = workflow.get("excluded_user_ids", [])
    if excluded_users and user_id in excluded_users:
        return False
    
    # Check eligible users (if specified)
    eligible_users = workflow.get("eligible_user_ids", [])
    if eligible_users:
        if user_id not in eligible_users:
            return False
    
    # Check eligible departments (if specified)
    eligible_depts = workflow.get("eligible_department_ids", [])
    if eligible_depts:
        if not user_department_id or user_department_id not in eligible_depts:
            return False
    
    # Check eligible roles (if specified)
    eligible_roles = workflow.get("eligible_role_ids", [])
    if eligible_roles:
        if not any(role in eligible_roles for role in user_role_ids):
            # Also check the 'role' field
            user_role = user.get("role")
            if not user_role or user_role not in eligible_roles:
                return False
    
    # Check eligible grades (if specified)
    eligible_grades = workflow.get("eligible_grade_ids", [])
    if eligible_grades:
        if not user_grade or user_grade not in eligible_grades:
            return False
    
    return True


async def get_eligible_workflows_for_user(db, user: dict, approval_type: str = None) -> list:
    """
    Get all workflows that a user is eligible to use.
    """
    query = {"is_active": True}
    if approval_type:
        query["approval_type"] = approval_type
    
    workflows = await db.approval_workflows.find(query, {"_id": 0}).to_list(100)
    
    # Filter by eligibility - only include workflows with levels (new system)
    eligible = []
    for wf in workflows:
        if not wf.get("levels"):
            continue
        if await check_user_eligibility(user, wf):
            eligible.append(wf)
    
    return eligible


async def log_approval_history(db, request_id: str, action: str, actor_id: str, actor_name: str, level: int = None, comments: str = None, details: dict = None):
    """Log an action to approval history"""
    now = datetime.now(timezone.utc).isoformat()
    
    history_entry = {
        "timestamp": now,
        "action": action,
        "actor_id": actor_id,
        "actor_name": actor_name,
        "level": level,
        "comments": comments,
        "details": details or {}
    }
    
    await db.approval_requests.update_one(
        {"id": request_id},
        {"$push": {"history": history_entry}}
    )


# ============== WORKFLOW CONFIGURATION ENDPOINTS ==============

@approvals_router.get("/workflows")
async def get_approval_workflows(
    approval_type: Optional[str] = None,
    is_active: bool = True,
    user: dict = Depends(get_current_user_dep())
):
    """Get all approval workflow configurations"""
    db = get_db()
    
    query = {}
    if approval_type:
        query["approval_type"] = approval_type
    if is_active is not None:
        query["is_active"] = is_active
    
    workflows = await db.approval_workflows.find(query, {"_id": 0}).to_list(100)
    
    return {
        "workflows": workflows,
        "total": len(workflows)
    }


@approvals_router.post("/workflows")
async def create_approval_workflow(
    data: ApprovalWorkflowConfig,
    user: dict = Depends(get_current_user_dep())
):
    """Create a new approval workflow"""
    user_role = user.get("role", "")
    if user_role not in ["super_admin", "admin"] and not user.get("can_manage_roles"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    # If setting as default, unset other defaults of same type
    if data.is_default:
        await db.approval_workflows.update_many(
            {"approval_type": data.approval_type, "is_default": True},
            {"$set": {"is_default": False}}
        )
    
    workflow_doc = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "description": data.description,
        "approval_type": data.approval_type.value,
        "is_active": data.is_active,
        "is_default": data.is_default,
        "min_amount": data.min_amount,
        "max_amount": data.max_amount,
        "department_ids": data.department_ids,
        "levels": [level.model_dump() for level in data.levels],
        "allow_parallel_approval": data.allow_parallel_approval,
        "require_all_levels": data.require_all_levels,
        "notify_on_action": data.notify_on_action,
        "created_by": user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.approval_workflows.insert_one(workflow_doc)
    del workflow_doc["_id"]
    
    return workflow_doc


@approvals_router.put("/workflows/{workflow_id}")
async def update_approval_workflow(
    workflow_id: str,
    data: ApprovalWorkflowConfig,
    user: dict = Depends(get_current_user_dep())
):
    """Update an approval workflow"""
    user_role = user.get("role", "")
    if user_role not in ["super_admin", "admin"] and not user.get("can_manage_roles"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    existing = await db.approval_workflows.find_one({"id": workflow_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # If setting as default, unset other defaults
    if data.is_default:
        await db.approval_workflows.update_many(
            {"approval_type": data.approval_type.value, "is_default": True, "id": {"$ne": workflow_id}},
            {"$set": {"is_default": False}}
        )
    
    update_data = {
        "name": data.name,
        "description": data.description,
        "is_active": data.is_active,
        "is_default": data.is_default,
        "min_amount": data.min_amount,
        "max_amount": data.max_amount,
        "department_ids": data.department_ids,
        "levels": [level.model_dump() for level in data.levels],
        "allow_parallel_approval": data.allow_parallel_approval,
        "require_all_levels": data.require_all_levels,
        "notify_on_action": data.notify_on_action,
        "updated_at": now
    }
    
    await db.approval_workflows.update_one({"id": workflow_id}, {"$set": update_data})
    
    updated = await db.approval_workflows.find_one({"id": workflow_id}, {"_id": 0})
    return updated


@approvals_router.delete("/workflows/{workflow_id}")
async def delete_approval_workflow(
    workflow_id: str,
    user: dict = Depends(get_current_user_dep())
):
    """Delete an approval workflow"""
    user_role = user.get("role", "")
    if user_role not in ["super_admin", "admin"] and not user.get("can_manage_roles"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_db()
    
    # Check if workflow exists
    existing = await db.approval_workflows.find_one({"id": workflow_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Check if any pending requests use this workflow
    pending_count = await db.approval_requests.count_documents({
        "workflow_id": workflow_id,
        "status": {"$in": [ApprovalStatus.PENDING.value, ApprovalStatus.DRAFT.value]}
    })
    
    if pending_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete workflow with {pending_count} pending requests"
        )
    
    await db.approval_workflows.delete_one({"id": workflow_id})
    
    return {"success": True, "message": "Workflow deleted"}


@approvals_router.post("/workflows/seed-defaults")
async def seed_default_workflows(
    user: dict = Depends(get_current_user_dep())
):
    """Seed default approval workflows"""
    user_role = user.get("role", "")
    if user_role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    created = []
    skipped = []
    
    for wf_data in DEFAULT_APPROVAL_WORKFLOWS:
        # Check if workflow already exists
        existing = await db.approval_workflows.find_one({
            "name": wf_data["name"],
            "approval_type": wf_data["approval_type"]
        })
        
        if existing:
            skipped.append(wf_data["name"])
            continue
        
        workflow_doc = {
            "id": str(uuid.uuid4()),
            **wf_data,
            "created_by": user.get("id"),
            "created_at": now,
            "updated_at": now
        }
        
        await db.approval_workflows.insert_one(workflow_doc)
        created.append(wf_data["name"])
    
    return {
        "success": True,
        "created": created,
        "skipped": skipped,
        "message": f"Created {len(created)} workflows, skipped {len(skipped)} existing"
    }


# ============== USER-FACING ENDPOINTS ==============

@approvals_router.get("/my-eligible-workflows")
async def get_my_eligible_workflows(
    approval_type: Optional[str] = None,
    user: dict = Depends(get_current_user_dep())
):
    """
    Get all approval workflows that the current user is eligible to use.
    This endpoint helps users see which request types they can submit.
    """
    db = get_db()
    
    workflows = await get_eligible_workflows_for_user(db, user, approval_type)
    
    # Group by approval type for easier display
    by_type = {}
    for wf in workflows:
        wf_type = wf.get("approval_type", "other")
        if wf_type not in by_type:
            by_type[wf_type] = []
        by_type[wf_type].append({
            "id": wf.get("id"),
            "name": wf.get("name"),
            "description": wf.get("description"),
            "approval_type": wf_type,
            "levels_count": len(wf.get("levels", [])),
            "min_amount": wf.get("min_amount"),
            "max_amount": wf.get("max_amount"),
            "is_default": wf.get("is_default", False)
        })
    
    return {
        "workflows": workflows,
        "by_type": by_type,
        "total": len(workflows)
    }


@approvals_router.get("/request-types")
async def get_available_request_types(
    user: dict = Depends(get_current_user_dep())
):
    """
    Get all approval types that the user can submit requests for.
    Returns a summary suitable for displaying in a "New Request" form.
    """
    db = get_db()
    
    workflows = await get_eligible_workflows_for_user(db, user)
    
    # Get unique approval types with their details
    types_map = {}
    for wf in workflows:
        wf_type = wf.get("approval_type")
        if wf_type not in types_map:
            types_map[wf_type] = {
                "type": wf_type,
                "label": wf_type.replace("_", " ").title(),
                "workflows_count": 0,
                "has_amount_based": False,
                "description": ""
            }
        types_map[wf_type]["workflows_count"] += 1
        if wf.get("min_amount") or wf.get("max_amount"):
            types_map[wf_type]["has_amount_based"] = True
    
    # Add descriptions
    type_descriptions = {
        "expense_claim": "Submit expense reimbursement requests",
        "leave_request": "Request time off or leave",
        "purchase_requisition": "Request approval for purchases",
        "travel_request": "Submit travel plans for approval",
        "vendor_payment": "Request vendor/supplier payments",
        "budget_request": "Request budget allocation or changes",
        "content_approval": "Submit content for review and approval",
        "custom": "General approval requests"
    }
    
    for type_key, type_info in types_map.items():
        type_info["description"] = type_descriptions.get(type_key, "")
    
    return {
        "request_types": list(types_map.values()),
        "total": len(types_map)
    }


class DirectApprovalRequest(BaseModel):
    """Direct approval request from user"""
    workflow_id: str                          # Which workflow to use
    title: str                                # Request title
    description: Optional[str] = None         # Request description
    amount: Optional[float] = None            # Amount if applicable
    attachments: List[str] = []               # List of attachment URLs/IDs
    custom_fields: Dict[str, Any] = {}        # Additional custom fields
    notes: Optional[str] = None               # Notes for approvers


@approvals_router.post("/request")
async def create_approval_request_direct(
    data: DirectApprovalRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep())
):
    """
    Create a new approval request directly (user-initiated).
    The user selects which workflow to use.
    """
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    requester_id = user.get("id")
    
    # Get the workflow
    workflow = await db.approval_workflows.find_one({"id": data.workflow_id}, {"_id": 0})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    if not workflow.get("is_active"):
        raise HTTPException(status_code=400, detail="This workflow is not active")
    
    # Check eligibility
    if not await check_user_eligibility(user, workflow):
        raise HTTPException(
            status_code=403, 
            detail="You are not eligible to use this workflow. Please contact your administrator."
        )
    
    # Check amount constraints
    if data.amount is not None:
        min_amt = workflow.get("min_amount")
        max_amt = workflow.get("max_amount")
        if min_amt is not None and data.amount < min_amt:
            raise HTTPException(
                status_code=400,
                detail=f"Amount must be at least {min_amt} for this workflow"
            )
        if max_amt is not None and data.amount > max_amt:
            raise HTTPException(
                status_code=400,
                detail=f"Amount must not exceed {max_amt} for this workflow. Use a different workflow for higher amounts."
            )
    
    # Build approval chain
    approval_chain = await build_approval_chain(db, requester_id, workflow)
    
    if not approval_chain:
        raise HTTPException(
            status_code=400, 
            detail="Could not build approval chain. Please ensure you have a reporting manager assigned."
        )
    
    # Check for missing required approvers
    missing = [lvl for lvl in approval_chain if lvl.get("error")]
    if missing:
        errors = [f"{lvl['level_name']}: {lvl.get('error')}" for lvl in missing]
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot create request - missing approvers: {', '.join(errors)}"
        )
    
    # Get requester details
    requester = await db.users.find_one(
        {"id": requester_id},
        {"_id": 0, "name": 1, "email": 1, "department_id": 1}
    )
    
    # Create request document
    request_id = str(uuid.uuid4())
    request_doc = {
        "id": request_id,
        "approval_type": workflow.get("approval_type"),
        "entity_type": "direct_request",
        "entity_id": request_id,  # Self-referencing for direct requests
        "entity_title": data.title,
        "entity_details": {
            "description": data.description,
            "attachments": data.attachments,
            **data.custom_fields
        },
        
        # Requester
        "requester_id": requester_id,
        "requester_name": requester.get("name") if requester else None,
        "requester_email": requester.get("email") if requester else None,
        "requester_department_id": requester.get("department_id") if requester else None,
        
        # Status
        "status": ApprovalStatus.PENDING.value,
        "current_level": 1,
        "total_levels": len(approval_chain),
        
        # Approval chain
        "approval_chain": approval_chain,
        
        # Metadata
        "amount": data.amount,
        "notes": data.notes,
        "workflow_id": workflow.get("id"),
        "workflow_name": workflow.get("name"),
        "is_direct_request": True,
        
        # History
        "history": [{
            "timestamp": now,
            "action": "submitted",
            "actor_id": requester_id,
            "actor_name": requester.get("name") if requester else None,
            "details": {"workflow": workflow.get("name")}
        }],
        
        "submitted_at": now,
        "created_at": now,
        "updated_at": now
    }
    
    await db.approval_requests.insert_one(request_doc)
    del request_doc["_id"]
    
    # Send notification to first approver
    if approval_chain:
        background_tasks.add_task(
            send_approval_notification,
            db, request_doc, "submitted", user
        )
    
    return {
        "success": True,
        "request": request_doc,
        "message": f"Request submitted successfully. Pending approval from {approval_chain[0].get('approver_name', 'approver')}."
    }


# ============== APPROVAL REQUEST ENDPOINTS ==============

@approvals_router.post("/submit")
async def submit_approval_request(
    data: ApprovalRequestCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep())
):
    """Submit a new approval request"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    requester_id = user.get("id")
    
    # Find applicable workflow
    workflow = await get_applicable_workflow(
        db, 
        data.approval_type.value,
        amount=data.amount,
        department_id=data.department_id
    )
    
    if not workflow:
        raise HTTPException(
            status_code=400, 
            detail=f"No active workflow found for approval type: {data.approval_type.value}"
        )
    
    # Build approval chain
    approval_chain = await build_approval_chain(db, requester_id, workflow)
    
    if not approval_chain:
        raise HTTPException(status_code=400, detail="Could not build approval chain - no approvers found")
    
    # Check for missing required approvers
    missing_approvers = [lvl for lvl in approval_chain if lvl.get("error")]
    if missing_approvers:
        errors = [f"{lvl['level_name']}: {lvl.get('error')}" for lvl in missing_approvers]
        raise HTTPException(status_code=400, detail=f"Missing approvers: {', '.join(errors)}")
    
    # Get requester details
    requester = await db.users.find_one(
        {"id": requester_id},
        {"_id": 0, "name": 1, "email": 1, "department_id": 1}
    )
    
    # Create request document
    request_id = str(uuid.uuid4())
    request_doc = {
        "id": request_id,
        "approval_type": data.approval_type.value,
        "entity_type": data.entity_type,
        "entity_id": data.entity_id,
        "entity_title": data.entity_title,
        "entity_details": data.entity_details,
        
        # Requester
        "requester_id": requester_id,
        "requester_name": requester.get("name") if requester else None,
        "requester_email": requester.get("email") if requester else None,
        "requester_department_id": requester.get("department_id") if requester else data.department_id,
        
        # Status
        "status": ApprovalStatus.PENDING.value,
        "current_level": 1,
        "total_levels": len(approval_chain),
        
        # Approval chain
        "approval_chain": approval_chain,
        
        # Metadata
        "amount": data.amount,
        "notes": data.notes,
        "workflow_id": workflow.get("id"),
        "workflow_name": workflow.get("name"),
        
        # History
        "history": [{
            "timestamp": now,
            "action": "submitted",
            "actor_id": requester_id,
            "actor_name": requester.get("name") if requester else None,
            "details": {"workflow": workflow.get("name")}
        }],
        
        "submitted_at": now,
        "created_at": now,
        "updated_at": now
    }
    
    await db.approval_requests.insert_one(request_doc)
    del request_doc["_id"]
    
    # Send notification to first approver
    if approval_chain:
        background_tasks.add_task(
            send_approval_notification,
            db, request_doc, "submitted", user
        )
    
    return request_doc


@approvals_router.get("/requests")
async def get_approval_requests(
    status: Optional[str] = None,
    approval_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user_dep())
):
    """Get approval requests (filtered by user's role)"""
    db = get_db()
    user_id = user.get("id")
    user_role = user.get("role", "")
    
    # Build query based on user role
    query = {}
    
    # Admin sees all
    if user_role not in ["super_admin", "admin"] and not user.get("can_manage_users"):
        # Regular user sees:
        # 1. Their own requests
        # 2. Requests where they are an approver
        query["$or"] = [
            {"requester_id": user_id},
            {"approval_chain.approver_id": user_id}
        ]
    
    if status:
        query["status"] = status
    if approval_type:
        query["approval_type"] = approval_type
    if entity_type:
        query["entity_type"] = entity_type
    
    requests = await db.approval_requests.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.approval_requests.count_documents(query)
    
    return {
        "requests": requests,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@approvals_router.get("/my-requests")
async def get_my_approval_requests(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user_dep())
):
    """Get current user's submitted approval requests"""
    db = get_db()
    user_id = user.get("id")
    
    query = {"requester_id": user_id}
    if status:
        query["status"] = status
    
    requests = await db.approval_requests.find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {
        "requests": requests,
        "total": len(requests)
    }


@approvals_router.get("/pending-my-approval")
async def get_pending_my_approval(
    user: dict = Depends(get_current_user_dep())
):
    """Get requests pending current user's approval"""
    db = get_db()
    user_id = user.get("id")
    
    # Find requests where:
    # 1. User is the approver for current level
    # 2. Status is pending
    # 3. Current level's status is pending
    
    requests = await db.approval_requests.find(
        {
            "status": ApprovalStatus.PENDING.value,
            "approval_chain": {
                "$elemMatch": {
                    "approver_id": user_id,
                    "status": ApprovalStatus.PENDING.value
                }
            }
        },
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(100)
    
    # Filter to only show requests at user's level
    pending = []
    for req in requests:
        current_level = req.get("current_level", 1)
        chain = req.get("approval_chain", [])
        
        # Find if user is approver for current level
        for level in chain:
            if level.get("level") == current_level and level.get("approver_id") == user_id:
                pending.append(req)
                break
    
    return {
        "requests": pending,
        "total": len(pending)
    }


@approvals_router.get("/requests/{request_id}")
async def get_approval_request(
    request_id: str,
    user: dict = Depends(get_current_user_dep())
):
    """Get a specific approval request"""
    db = get_db()
    
    request = await db.approval_requests.find_one({"id": request_id}, {"_id": 0})
    
    if not request:
        raise HTTPException(status_code=404, detail="Approval request not found")
    
    return request


@approvals_router.post("/requests/{request_id}/action")
async def take_approval_action(
    request_id: str,
    data: ApprovalActionRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep())
):
    """Take action on an approval request (approve, reject, delegate, etc.)"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    user_id = user.get("id")
    user_name = user.get("name")
    
    # Get the request
    request = await db.approval_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Approval request not found")
    
    if request.get("status") != ApprovalStatus.PENDING.value:
        raise HTTPException(status_code=400, detail=f"Request is not pending (status: {request.get('status')})")
    
    # Find user's position in approval chain
    current_level = request.get("current_level", 1)
    approval_chain = request.get("approval_chain", [])
    
    user_level = None
    for level in approval_chain:
        if level.get("approver_id") == user_id and level.get("level") == current_level:
            user_level = level
            break
    
    # Allow admin override
    is_admin = user.get("role") in ["super_admin", "admin"] or user.get("can_manage_users")
    
    if not user_level and not is_admin:
        raise HTTPException(status_code=403, detail="You are not the approver for the current level")
    
    # Process the action
    if data.action == ApprovalAction.APPROVE:
        # Update current level status
        for level in approval_chain:
            if level.get("level") == current_level:
                level["status"] = ApprovalStatus.APPROVED.value
                level["action_taken"] = ApprovalAction.APPROVE.value
                level["comments"] = data.comments
                level["action_at"] = now
                break
        
        # Check if all levels are approved
        all_approved = all(
            lvl.get("status") == ApprovalStatus.APPROVED.value 
            for lvl in approval_chain if lvl.get("is_required", True)
        )
        
        if all_approved or current_level >= len(approval_chain):
            # Fully approved
            update_data = {
                "status": ApprovalStatus.APPROVED.value,
                "approval_chain": approval_chain,
                "completed_at": now,
                "updated_at": now
            }
        else:
            # Move to next level
            update_data = {
                "current_level": current_level + 1,
                "approval_chain": approval_chain,
                "updated_at": now
            }
    
    elif data.action == ApprovalAction.REJECT:
        # Reject the entire request
        for level in approval_chain:
            if level.get("level") == current_level:
                level["status"] = ApprovalStatus.REJECTED.value
                level["action_taken"] = ApprovalAction.REJECT.value
                level["comments"] = data.comments
                level["action_at"] = now
                break
        
        update_data = {
            "status": ApprovalStatus.REJECTED.value,
            "approval_chain": approval_chain,
            "completed_at": now,
            "updated_at": now
        }
    
    elif data.action == ApprovalAction.REQUEST_CHANGES:
        # Request changes - keep pending but add comment
        for level in approval_chain:
            if level.get("level") == current_level:
                level["action_taken"] = ApprovalAction.REQUEST_CHANGES.value
                level["comments"] = data.comments
                level["action_at"] = now
                break
        
        update_data = {
            "approval_chain": approval_chain,
            "updated_at": now
        }
    
    elif data.action == ApprovalAction.DELEGATE:
        if not data.delegate_to:
            raise HTTPException(status_code=400, detail="delegate_to is required for delegation")
        
        # Verify delegate exists
        delegate = await db.users.find_one(
            {"id": data.delegate_to},
            {"_id": 0, "id": 1, "name": 1, "email": 1}
        )
        if not delegate:
            raise HTTPException(status_code=400, detail="Delegate user not found")
        
        # Update approver for current level
        for level in approval_chain:
            if level.get("level") == current_level:
                level["delegated_from"] = user_id
                level["delegated_from_name"] = user_name
                level["delegated_at"] = now
                level["approver_id"] = delegate["id"]
                level["approver_name"] = delegate.get("name")
                level["approver_email"] = delegate.get("email")
                break
        
        update_data = {
            "approval_chain": approval_chain,
            "updated_at": now
        }
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {data.action}")
    
    # Update the request
    await db.approval_requests.update_one({"id": request_id}, {"$set": update_data})
    
    # Log to history
    await log_approval_history(
        db, request_id, data.action.value,
        user_id, user_name, current_level, data.comments
    )
    
    # Send notifications
    background_tasks.add_task(
        send_approval_notification,
        db, request, data.action.value, user
    )
    
    # Get updated request
    updated = await db.approval_requests.find_one({"id": request_id}, {"_id": 0})
    
    return {
        "success": True,
        "action": data.action.value,
        "request": updated
    }


@approvals_router.post("/requests/{request_id}/cancel")
async def cancel_approval_request(
    request_id: str,
    user: dict = Depends(get_current_user_dep())
):
    """Cancel an approval request (only by requester or admin)"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    user_id = user.get("id")
    
    request = await db.approval_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Approval request not found")
    
    # Check permission
    is_admin = user.get("role") in ["super_admin", "admin"]
    is_requester = request.get("requester_id") == user_id
    
    if not is_admin and not is_requester:
        raise HTTPException(status_code=403, detail="Only requester or admin can cancel")
    
    if request.get("status") not in [ApprovalStatus.PENDING.value, ApprovalStatus.DRAFT.value]:
        raise HTTPException(status_code=400, detail="Can only cancel pending or draft requests")
    
    await db.approval_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": ApprovalStatus.CANCELLED.value,
            "completed_at": now,
            "updated_at": now
        }}
    )
    
    await log_approval_history(
        db, request_id, "cancelled",
        user_id, user.get("name")
    )
    
    return {"success": True, "message": "Request cancelled"}


# ============== DASHBOARD ENDPOINTS ==============

@approvals_router.get("/dashboard")
async def get_approval_dashboard(
    user: dict = Depends(get_current_user_dep())
):
    """Get approval dashboard metrics for current user"""
    db = get_db()
    user_id = user.get("id")
    user_role = user.get("role", "")
    
    # Pending my approval
    pending_my_approval = await db.approval_requests.count_documents({
        "status": ApprovalStatus.PENDING.value,
        "approval_chain": {
            "$elemMatch": {
                "approver_id": user_id,
                "status": ApprovalStatus.PENDING.value
            }
        }
    })
    
    # My submitted requests
    my_pending = await db.approval_requests.count_documents({
        "requester_id": user_id,
        "status": ApprovalStatus.PENDING.value
    })
    
    my_approved = await db.approval_requests.count_documents({
        "requester_id": user_id,
        "status": ApprovalStatus.APPROVED.value
    })
    
    my_rejected = await db.approval_requests.count_documents({
        "requester_id": user_id,
        "status": ApprovalStatus.REJECTED.value
    })
    
    # Admin stats
    admin_stats = None
    if user_role in ["super_admin", "admin"]:
        total_pending = await db.approval_requests.count_documents({
            "status": ApprovalStatus.PENDING.value
        })
        total_approved = await db.approval_requests.count_documents({
            "status": ApprovalStatus.APPROVED.value
        })
        total_rejected = await db.approval_requests.count_documents({
            "status": ApprovalStatus.REJECTED.value
        })
        
        admin_stats = {
            "total_pending": total_pending,
            "total_approved": total_approved,
            "total_rejected": total_rejected
        }
    
    return {
        "pending_my_approval": pending_my_approval,
        "my_requests": {
            "pending": my_pending,
            "approved": my_approved,
            "rejected": my_rejected
        },
        "admin_stats": admin_stats
    }
