"""
Organization Hierarchy Utilities
- Reporting chain traversal
- Manager-reportee data scope filtering
- Department head identification
"""

from typing import List, Set, Optional, Dict, Any
from datetime import datetime, timezone


async def get_direct_reportees(db, manager_id: str) -> List[str]:
    """
    Get all users who directly report to a manager.
    
    Args:
        db: Database connection
        manager_id: The manager's user ID
        
    Returns:
        List of user IDs who report directly to this manager
    """
    reportees = await db.users.find(
        {"reports_to": manager_id, "status": {"$ne": "inactive"}},
        {"id": 1, "_id": 0}
    ).to_list(500)
    
    return [r["id"] for r in reportees]


async def get_all_reportees(db, manager_id: str, max_depth: int = 10) -> Set[str]:
    """
    Get all direct and indirect reportees (entire reporting chain).
    Uses breadth-first traversal with cycle detection.
    
    Args:
        db: Database connection
        manager_id: The manager's user ID
        max_depth: Maximum hierarchy depth to traverse (prevents infinite loops)
        
    Returns:
        Set of all user IDs in the reporting chain
    """
    all_reportees = set()
    to_process = [manager_id]
    processed = set()
    depth = 0
    
    while to_process and depth < max_depth:
        current_batch = to_process.copy()
        to_process = []
        
        for current_manager in current_batch:
            if current_manager in processed:
                continue
            processed.add(current_manager)
            
            # Get direct reportees
            direct_reportees = await get_direct_reportees(db, current_manager)
            
            for reportee_id in direct_reportees:
                if reportee_id not in all_reportees and reportee_id != manager_id:
                    all_reportees.add(reportee_id)
                    to_process.append(reportee_id)
        
        depth += 1
    
    return all_reportees


async def get_reporting_chain_up(db, user_id: str, max_depth: int = 10) -> List[Dict[str, Any]]:
    """
    Get the upward reporting chain (user → manager → manager's manager → ...).
    
    Args:
        db: Database connection
        user_id: Starting user ID
        max_depth: Maximum levels to traverse
        
    Returns:
        List of managers in order (immediate manager first)
    """
    chain = []
    current_id = user_id
    visited = set()
    
    for _ in range(max_depth):
        user = await db.users.find_one(
            {"id": current_id},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "reports_to": 1, "department_id": 1, "designation": 1}
        )
        
        if not user or not user.get("reports_to"):
            break
            
        manager_id = user["reports_to"]
        
        if manager_id in visited:
            break  # Cycle detected
        visited.add(manager_id)
        
        manager = await db.users.find_one(
            {"id": manager_id},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "department_id": 1, "designation": 1, "reports_to": 1}
        )
        
        if manager:
            chain.append(manager)
            current_id = manager_id
        else:
            break
    
    return chain


async def is_user_reportee_of(db, user_id: str, potential_manager_id: str) -> bool:
    """
    Check if a user is in the reporting chain of a potential manager.
    
    Args:
        db: Database connection
        user_id: The user to check
        potential_manager_id: The potential manager
        
    Returns:
        True if user reports to this manager (directly or indirectly)
    """
    if user_id == potential_manager_id:
        return False
    
    all_reportees = await get_all_reportees(db, potential_manager_id)
    return user_id in all_reportees


async def get_department_head(db, department_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the department head for a given department.
    
    Args:
        db: Database connection
        department_id: The department ID
        
    Returns:
        Department head user dict or None
    """
    department = await db.departments.find_one(
        {"id": department_id},
        {"_id": 0, "department_head_id": 1}
    )
    
    if not department or not department.get("department_head_id"):
        return None
    
    head = await db.users.find_one(
        {"id": department["department_head_id"]},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "department_id": 1, "designation": 1}
    )
    
    return head


async def is_department_head(db, user_id: str, department_id: str = None) -> bool:
    """
    Check if a user is a department head.
    
    Args:
        db: Database connection
        user_id: The user ID to check
        department_id: Optional specific department to check (if None, checks any department)
        
    Returns:
        True if user is a department head
    """
    query = {"department_head_id": user_id}
    if department_id:
        query["id"] = department_id
    
    department = await db.departments.find_one(query, {"_id": 0, "id": 1})
    return department is not None


async def get_user_org_context(db, user_id: str) -> Dict[str, Any]:
    """
    Get complete organizational context for a user.
    
    Returns:
        Dict with:
        - direct_reportees: List of direct reportee IDs
        - all_reportees: Set of all reportee IDs (direct + indirect)
        - reports_to: Immediate manager info
        - reporting_chain: Full upward chain
        - department: Department info
        - is_department_head: Boolean
        - is_manager: Boolean (has any reportees)
    """
    user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0, "id": 1, "name": 1, "department_id": 1, "reports_to": 1}
    )
    
    if not user:
        return {"error": "User not found"}
    
    # Get reportees
    direct_reportees = await get_direct_reportees(db, user_id)
    all_reportees = await get_all_reportees(db, user_id)
    
    # Get manager
    manager = None
    if user.get("reports_to"):
        manager = await db.users.find_one(
            {"id": user["reports_to"]},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "designation": 1}
        )
    
    # Get reporting chain
    reporting_chain = await get_reporting_chain_up(db, user_id)
    
    # Get department info
    department = None
    dept_head_status = False
    if user.get("department_id"):
        department = await db.departments.find_one(
            {"id": user["department_id"]},
            {"_id": 0, "id": 1, "name": 1, "department_head_id": 1}
        )
        if department:
            dept_head_status = department.get("department_head_id") == user_id
    
    return {
        "user_id": user_id,
        "direct_reportees": direct_reportees,
        "direct_reportees_count": len(direct_reportees),
        "all_reportees": list(all_reportees),
        "all_reportees_count": len(all_reportees),
        "reports_to": manager,
        "reporting_chain": reporting_chain,
        "department": department,
        "is_department_head": dept_head_status,
        "is_manager": len(direct_reportees) > 0
    }


async def get_approval_chain(db, user_id: str, approval_type: str = "standard") -> List[Dict[str, Any]]:
    """
    Build the approval chain for a user based on their reporting structure.
    
    Approval types:
    - "standard": reports_to → department_head (if different) → final_approver
    - "skip_level": department_head → final_approver (skips direct manager)
    - "direct_only": reports_to only
    
    Args:
        db: Database connection
        user_id: The requesting user
        approval_type: Type of approval chain to build
        
    Returns:
        List of approvers in order with their level
    """
    chain = []
    user = await db.users.find_one(
        {"id": user_id},
        {"_id": 0, "id": 1, "reports_to": 1, "department_id": 1}
    )
    
    if not user:
        return chain
    
    # Level 1: Direct Manager
    if approval_type != "skip_level" and user.get("reports_to"):
        manager = await db.users.find_one(
            {"id": user["reports_to"]},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "designation": 1}
        )
        if manager:
            chain.append({
                "level": 1,
                "level_name": "manager",
                "approver_id": manager["id"],
                "approver_name": manager.get("name"),
                "approver_email": manager.get("email"),
                "is_required": True
            })
    
    # Level 2: Department Head (if not the same as direct manager)
    if user.get("department_id"):
        dept_head = await get_department_head(db, user["department_id"])
        if dept_head:
            # Don't add if same as direct manager or if it's the requester
            existing_ids = [a["approver_id"] for a in chain]
            if dept_head["id"] not in existing_ids and dept_head["id"] != user_id:
                chain.append({
                    "level": len(chain) + 1,
                    "level_name": "department_head",
                    "approver_id": dept_head["id"],
                    "approver_name": dept_head.get("name"),
                    "approver_email": dept_head.get("email"),
                    "is_required": approval_type != "direct_only"
                })
    
    # Level 3: Final Approver (configurable - could be HR, Finance, etc.)
    # This will be configured per approval workflow
    
    return chain


async def sync_user_org_flags(db, user_id: str) -> Dict[str, Any]:
    """
    Sync organizational flags on a user record.
    Called when reporting structure changes.
    
    Updates:
    - is_department_head
    - is_manager
    - direct_reports_count
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if department head
    dept_head_status = await is_department_head(db, user_id)
    
    # Count direct reports
    direct_count = await db.users.count_documents({
        "reports_to": user_id,
        "status": {"$ne": "inactive"}
    })
    
    update_data = {
        "is_department_head": dept_head_status,
        "is_manager": direct_count > 0,
        "direct_reports_count": direct_count,
        "org_flags_updated_at": now
    }
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    return update_data
