"""
Permission utilities for ownership-based access control
"""

def can_delete_record(record: dict, current_user: dict) -> bool:
    """
    Check if current user can delete a record.
    Rules:
    - Super admins can delete anything
    - Users with admin capabilities can delete anything
    - Record creator can delete their own record
    - Project owner/manager can delete
    - Assigned user can delete their assigned item
    """
    user_id = current_user.get("id")
    user_role = current_user.get("role", "")
    
    # Super admin or admin can delete anything
    if user_role in ["super_admin", "admin"]:
        return True
    
    # User has admin capabilities
    if current_user.get("can_manage_users") or current_user.get("can_manage_employees"):
        return True
    
    # Creator can delete
    if record.get("created_by") == user_id:
        return True
    
    # Owner/Manager can delete
    if record.get("owner_id") == user_id or record.get("manager_id") == user_id:
        return True
    
    # Assigned user can delete
    if record.get("assigned_to") == user_id:
        return True
    
    # Team member with specific role can delete (for projects)
    team_members = record.get("team_members", [])
    for member in team_members:
        if member.get("user_id") == user_id and member.get("role") in ["owner", "manager"]:
            return True
    
    return False


def get_delete_error_message(record: dict) -> str:
    """Generate helpful error message for delete permission denial"""
    creator_name = record.get("created_by_name") or "another user"
    return f"You cannot delete this item. It was created by {creator_name}. Only the creator, owner, or an admin can delete it."


def can_edit_record(record: dict, current_user: dict) -> bool:
    """
    Check if current user can edit a record.
    Similar rules to delete but may include more collaborators.
    """
    user_id = current_user.get("id")
    user_role = current_user.get("role", "")
    
    # Super admin or admin can edit anything
    if user_role in ["super_admin", "admin"]:
        return True
    
    # User has admin capabilities
    if current_user.get("can_manage_users") or current_user.get("can_manage_employees"):
        return True
    
    # Creator can edit
    if record.get("created_by") == user_id:
        return True
    
    # Owner/Manager can edit
    if record.get("owner_id") == user_id or record.get("manager_id") == user_id:
        return True
    
    # Assigned user can edit
    if record.get("assigned_to") == user_id:
        return True
    
    # Any team member can edit
    team_members = record.get("team_members", [])
    for member in team_members:
        if member.get("user_id") == user_id:
            return True
    
    return False
