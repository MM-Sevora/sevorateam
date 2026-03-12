"""
Permission utilities for ownership-based access control

PERMISSION RULES:
| Action | Own Data | Assigned to Me | Others         |
|--------|----------|----------------|----------------|
| View   | ✅       | ✅             | ✅ (with module access) |
| Edit   | ✅       | ✅             | ❌ (Admin only) |
| Delete | ✅       | ❌             | ❌ (Admin only) |

- Users can DELETE only their OWN data (created_by = user_id)
- Users can EDIT data assigned to them OR that they own
- Admins can do everything
"""

def can_delete_record(record: dict, current_user: dict) -> bool:
    """
    Check if current user can delete a record.
    
    RULE: Only creator OR admin can delete
    - Admin/Super Admin: Can delete anything
    - Regular User: Can ONLY delete records they CREATED (not assigned)
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
    
    RULE: Creator OR assigned OR admin can edit
    - Admin: Can edit anything
    - Creator: Can edit their own records
    - Assigned User: Can edit records assigned to them
    - Owner/Manager/Team Member: Can edit records they own/manage/are part of
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
    
    # Project Manager can edit
    if record.get("project_manager_id") == user_id:
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


# ============== DATA SCOPE FILTERING (3D Permissions) ==============

def get_data_scope_query(
    current_user: dict, 
    module_code: str, 
    base_query: dict = None
) -> dict:
    """
    Build MongoDB query filter based on user's data scope for a module.
    
    Data scope options:
    - "all": No filter (see everything with module access)
    - "team": Filter by department_id (same department)
    - "own_assigned": Filter by created_by OR assigned_to
    - "own_only": Filter by created_by only
    
    Args:
        current_user: User dict with module_permissions
        module_code: Module code to check permissions for
        base_query: Optional existing query to extend
        
    Returns:
        MongoDB query dict
    """
    user_id = current_user.get("id")
    user_role = current_user.get("role", "")
    department_id = current_user.get("department_id")
    
    # Start with base query or empty dict
    query = dict(base_query) if base_query else {}
    
    # Super admin/admin always sees all
    if user_role in ["super_admin", "admin"]:
        return query
    
    if current_user.get("can_manage_users") or current_user.get("can_manage_roles"):
        return query
    
    # Get module permissions for this user
    module_permissions = current_user.get("module_permissions", {})
    module_perm = module_permissions.get(module_code, {})
    data_scope = module_perm.get("data_scope", "all")  # Default to 'all' for backward compatibility
    
    # Build scope filter
    if data_scope == "all":
        # No additional filtering - user sees all data in module
        pass
    elif data_scope == "team":
        # User sees records from same department/team
        if department_id:
            query["$or"] = [
                {"created_by": user_id},
                {"assigned_to": user_id},
                {"department_id": department_id},
            ]
        else:
            # No department - fall back to own + assigned
            query["$or"] = [
                {"created_by": user_id},
                {"assigned_to": user_id},
            ]
    elif data_scope == "own_assigned":
        # User sees own records + records assigned to them
        query["$or"] = [
            {"created_by": user_id},
            {"assigned_to": user_id},
        ]
    elif data_scope == "own_only":
        # User sees only their own records
        query["created_by"] = user_id
    
    return query


def can_user_crud(current_user: dict, module_code: str, action: str) -> bool:
    """
    Check if user has CRUD permission for a module.
    
    Args:
        current_user: User dict with module_permissions
        module_code: Module code to check
        action: 'create', 'read', 'update', or 'delete'
        
    Returns:
        True if user has permission, False otherwise
    """
    user_role = current_user.get("role", "")
    
    # Super admin/admin has all permissions
    if user_role in ["super_admin", "admin"]:
        return True
    
    if current_user.get("can_manage_users") or current_user.get("can_manage_roles"):
        return True
    
    # Get module permissions
    module_permissions = current_user.get("module_permissions", {})
    module_perm = module_permissions.get(module_code, {})
    
    # Default CRUD permissions (for backward compatibility)
    defaults = {"create": True, "read": True, "update": True, "delete": False}
    
    return module_perm.get(action, defaults.get(action, False))


def can_user_modify_others_data(
    current_user: dict, 
    module_code: str, 
    action: str,
    record: dict = None
) -> bool:
    """
    Check if user can edit/delete OTHER users' data in a module.
    
    Args:
        current_user: User dict with module_permissions
        module_code: Module code
        action: 'edit' or 'delete'
        record: Optional record to check ownership
        
    Returns:
        True if user can modify others' data
    """
    user_id = current_user.get("id")
    user_role = current_user.get("role", "")
    
    # Super admin/admin can always modify others' data
    if user_role in ["super_admin", "admin"]:
        return True
    
    if current_user.get("can_manage_users") or current_user.get("can_manage_roles"):
        return True
    
    # If record is provided, check if user owns it or is assigned
    if record:
        is_owner = record.get("created_by") == user_id
        is_assigned = record.get("assigned_to") == user_id
        
        if is_owner:
            return True  # Can always modify own data
        
        if action == "edit" and is_assigned:
            return True  # Can edit assigned data
    
    # Check module-specific permissions
    module_permissions = current_user.get("module_permissions", {})
    module_perm = module_permissions.get(module_code, {})
    
    if action == "edit":
        return module_perm.get("can_edit_others", False)
    elif action == "delete":
        return module_perm.get("can_delete_others", False)
    
    return False
