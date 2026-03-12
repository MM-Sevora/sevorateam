"""
Permission utilities for ownership-based access control

SIMPLE RULE:
- Users can DELETE only their OWN data (created_by = user_id)
- Users can EDIT data assigned to them
- Admins can do everything
"""

def can_delete_record(record: dict, current_user: dict) -> bool:
    """
    Check if current user can delete a record.
    
    SIMPLE RULE:
    - Admin/Super Admin: Can delete anything
    - Regular User: Can ONLY delete records they CREATED
    """
    user_id = current_user.get("id")
    user_role = current_user.get("role", "")
    
    # Super admin or admin can delete anything
    if user_role in ["super_admin", "admin"]:
        return True
    
    # User has admin capabilities
    if current_user.get("can_manage_users") or current_user.get("can_manage_roles"):
        return True
    
    # SIMPLE RULE: Only creator can delete their own data
    if record.get("created_by") == user_id:
        return True
    
    return False


def get_delete_error_message(record: dict) -> str:
    """Generate helpful error message for delete permission denial"""
    creator_name = record.get("created_by_name") or "another user"
    return f"You cannot delete this item. It was created by {creator_name}. Only the creator or an admin can delete it."


def can_edit_record(record: dict, current_user: dict) -> bool:
    """
    Check if current user can edit a record.
    
    RULE:
    - Admin: Can edit anything
    - Creator: Can edit their own records
    - Assigned User: Can edit records assigned to them
    - Owner/Manager: Can edit records they own/manage
    """
    user_id = current_user.get("id")
    user_role = current_user.get("role", "")
    
    # Super admin or admin can edit anything
    if user_role in ["super_admin", "admin"]:
        return True
    
    # User has admin capabilities
    if current_user.get("can_manage_users") or current_user.get("can_manage_roles"):
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
    
    # Team member can edit
    team_members = record.get("team_members", [])
    if isinstance(team_members, list):
        for member in team_members:
            if isinstance(member, dict) and member.get("user_id") == user_id:
                return True
            elif isinstance(member, str) and member == user_id:
                return True
    
    return False


def get_edit_error_message(record: dict) -> str:
    """Generate helpful error message for edit permission denial"""
    creator_name = record.get("created_by_name") or "another user"
    return f"You cannot edit this item. It was created by {creator_name}. Only the creator, assigned user, or an admin can edit it."


def get_record_permissions(record: dict, current_user: dict) -> dict:
    """
    Get all permissions for a record for the current user.
    Useful for frontend to show/hide action buttons.
    """
    return {
        "can_view": True,  # If they fetched it, they can view it
        "can_edit": can_edit_record(record, current_user),
        "can_delete": can_delete_record(record, current_user),
        "is_owner": record.get("created_by") == current_user.get("id"),
        "is_assigned": record.get("assigned_to") == current_user.get("id"),
    }
