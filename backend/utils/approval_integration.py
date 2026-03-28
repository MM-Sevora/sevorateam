"""
Approval Integration Helper
Provides utilities to integrate existing modules with the approval workflow engine
"""

from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid


async def submit_for_approval(
    db,
    approval_type: str,
    entity_type: str,
    entity_id: str,
    entity_title: str,
    requester_id: str,
    amount: float = None,
    department_id: str = None,
    entity_details: dict = None,
    notes: str = None
) -> Dict[str, Any]:
    """
    Submit an entity for approval using the approval workflow engine.
    
    This is a helper function that can be called from any module to integrate
    with the centralized approval system.
    
    Args:
        db: Database connection
        approval_type: Type from ApprovalType enum (expense_claim, leave_request, etc.)
        entity_type: Module-specific entity type (e.g., "expense_claim", "leave")
        entity_id: ID of the entity being submitted
        entity_title: Display title for the approval request
        requester_id: User ID of the requester
        amount: Optional amount for amount-based workflow routing
        department_id: Optional department ID for department-based routing
        entity_details: Additional details to display in approval request
        notes: Requester's notes
        
    Returns:
        Created approval request document
    """
    from routes.approvals import (
        get_applicable_workflow,
        build_approval_chain
    )
    from models.approvals import ApprovalStatus
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Find applicable workflow
    workflow = await get_applicable_workflow(
        db,
        approval_type,
        amount=amount,
        department_id=department_id
    )
    
    if not workflow:
        # No workflow configured - return None (caller can handle this)
        return None
    
    # Build approval chain
    approval_chain = await build_approval_chain(db, requester_id, workflow)
    
    if not approval_chain:
        return None
    
    # Get requester details
    requester = await db.users.find_one(
        {"id": requester_id},
        {"_id": 0, "name": 1, "email": 1, "department_id": 1}
    )
    
    # Create request document
    request_id = str(uuid.uuid4())
    request_doc = {
        "id": request_id,
        "approval_type": approval_type,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_title": entity_title,
        "entity_details": entity_details or {},
        
        # Requester
        "requester_id": requester_id,
        "requester_name": requester.get("name") if requester else None,
        "requester_email": requester.get("email") if requester else None,
        "requester_department_id": requester.get("department_id") if requester else department_id,
        
        # Status
        "status": ApprovalStatus.PENDING.value,
        "current_level": 1,
        "total_levels": len(approval_chain),
        
        # Approval chain
        "approval_chain": approval_chain,
        
        # Metadata
        "amount": amount,
        "notes": notes,
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
    
    return request_doc


async def get_entity_approval_status(
    db,
    entity_type: str,
    entity_id: str
) -> Optional[Dict[str, Any]]:
    """
    Get approval status for an entity.
    
    Returns the approval request if exists, None otherwise.
    """
    request = await db.approval_requests.find_one(
        {"entity_type": entity_type, "entity_id": entity_id},
        {"_id": 0}
    )
    return request


async def cancel_entity_approval(
    db,
    entity_type: str,
    entity_id: str,
    cancelled_by: str
) -> bool:
    """
    Cancel approval for an entity.
    
    Returns True if cancelled, False if not found or already completed.
    """
    from models.approvals import ApprovalStatus
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.approval_requests.update_one(
        {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "status": {"$in": [ApprovalStatus.PENDING.value, ApprovalStatus.DRAFT.value]}
        },
        {
            "$set": {
                "status": ApprovalStatus.CANCELLED.value,
                "completed_at": now,
                "updated_at": now
            },
            "$push": {
                "history": {
                    "timestamp": now,
                    "action": "cancelled",
                    "actor_id": cancelled_by
                }
            }
        }
    )
    
    return result.modified_count > 0


async def sync_entity_status_from_approval(
    db,
    entity_collection: str,
    entity_id: str,
    approval_status: str
) -> bool:
    """
    Sync entity status based on approval status.
    
    Called when approval action is taken to update the source entity.
    
    Args:
        db: Database connection
        entity_collection: Name of the MongoDB collection
        entity_id: ID of the entity
        approval_status: New approval status (approved, rejected, etc.)
        
    Returns:
        True if updated successfully
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # Map approval status to entity status
    status_map = {
        "approved": "approved",
        "rejected": "rejected",
        "cancelled": "cancelled",
        "pending": "pending"
    }
    
    new_status = status_map.get(approval_status, approval_status)
    
    result = await db[entity_collection].update_one(
        {"id": entity_id},
        {"$set": {
            "status": new_status,
            "approval_status": approval_status,
            "updated_at": now
        }}
    )
    
    return result.modified_count > 0


async def get_pending_approvals_for_user(
    db,
    user_id: str,
    approval_type: str = None
) -> list:
    """
    Get all pending approval requests where user is the current approver.
    
    Args:
        db: Database connection
        user_id: The approver's user ID
        approval_type: Optional filter by approval type
        
    Returns:
        List of pending approval requests
    """
    from models.approvals import ApprovalStatus
    
    query = {
        "status": ApprovalStatus.PENDING.value,
        "approval_chain": {
            "$elemMatch": {
                "approver_id": user_id,
                "status": ApprovalStatus.PENDING.value
            }
        }
    }
    
    if approval_type:
        query["approval_type"] = approval_type
    
    requests = await db.approval_requests.find(query, {"_id": 0}).to_list(100)
    
    # Filter to only show requests at user's current level
    pending = []
    for req in requests:
        current_level = req.get("current_level", 1)
        chain = req.get("approval_chain", [])
        
        for level in chain:
            if level.get("level") == current_level and level.get("approver_id") == user_id:
                pending.append(req)
                break
    
    return pending


async def get_approval_count_for_user(db, user_id: str) -> int:
    """Get count of pending approvals for a user (for dashboard badges)"""
    pending = await get_pending_approvals_for_user(db, user_id)
    return len(pending)
