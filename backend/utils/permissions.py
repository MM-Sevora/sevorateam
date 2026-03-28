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

# Data scope constants
DATA_SCOPE_OWN = "own"          # User can only access their own data
DATA_SCOPE_DEPARTMENT = "department"  # User can access data from their department
DATA_SCOPE_ALL = "all"          # User can access all data


async def get_user_module_permission(user_id: str, category: str, module: str) -> dict:
    """
    Get permission for a specific module from the database.
    Handles both role-based and custom permissions.
    
    Returns: {"actions": [...], "data_scope": "own|department|all"}
    """
    from server import db
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return {"actions": [], "data_scope": "own"}
    
    # Get role permissions
    role_permissions = {}
    if user.get("role_id"):
        role = await db.roles.find_one({"id": user["role_id"]}, {"_id": 0})
        if role:
            role_permissions = role.get("permissions", {})
    
    # Get custom permissions
    custom_permissions = user.get("custom_permissions", {})
    override_mode = user.get("permission_override_mode", "merge")
    
    # Determine effective permission for this module
    result = {"actions": [], "data_scope": "own"}
    
    # Get from role first
    if category in role_permissions and module in role_permissions[category]:
        role_perm = role_permissions[category][module]
        if isinstance(role_perm, dict):
            result = {
                "actions": role_perm.get("actions", []),
                "data_scope": role_perm.get("data_scope", "all")
            }
        elif isinstance(role_perm, list):
            result = {"actions": role_perm, "data_scope": "all"}
    
    # Apply custom permissions based on mode
    if override_mode == "replace" and custom_permissions:
        # Use only custom permissions
        if category in custom_permissions and module in custom_permissions[category]:
            custom_perm = custom_permissions[category][module]
            if isinstance(custom_perm, dict):
                result = {
                    "actions": custom_perm.get("actions", []),
                    "data_scope": custom_perm.get("data_scope", "own")
                }
            elif isinstance(custom_perm, list):
                result = {"actions": custom_perm, "data_scope": "all"}
        else:
            # Module not in custom perms under replace mode = no access
            result = {"actions": [], "data_scope": "own"}
    elif custom_permissions:
        # Merge: custom adds to role
        if category in custom_permissions and module in custom_permissions[category]:
            custom_perm = custom_permissions[category][module]
            if isinstance(custom_perm, dict):
                # Merge actions
                existing_actions = set(result.get("actions", []))
                new_actions = set(custom_perm.get("actions", []))
                result["actions"] = list(existing_actions | new_actions)
                # Custom data scope overrides role
                if "data_scope" in custom_perm:
                    result["data_scope"] = custom_perm["data_scope"]
            elif isinstance(custom_perm, list):
                existing_actions = set(result.get("actions", []))
                new_actions = set(custom_perm)
                result["actions"] = list(existing_actions | new_actions)
    
    return result


async def get_data_scope_filter_async(
    user_id: str, 
    category: str, 
    module: str,
    user_field: str = "created_by",
    department_field: str = "department_id"
) -> dict:
    """
    Get MongoDB filter query based on user's data scope for a module.
    
    Args:
        user_id: The requesting user's ID
        category: Permission category (e.g., "hr", "projects", "finance")
        module: The specific module (e.g., "employees", "tasks", "payments")
        user_field: The field in the collection that stores user ID
        department_field: The field in the collection that stores department ID
    
    Returns:
        MongoDB filter dict to be merged with the query
    """
    from server import db
    
    # Check if super admin (bypass all restrictions)
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user and user.get("role") in ["super_admin", "admin"]:
        return {}  # No filter for admins
    
    perm = await get_user_module_permission(user_id, category, module)
    data_scope = perm.get("data_scope", "own")
    
    if data_scope == DATA_SCOPE_ALL:
        # User can see all data - no filter
        return {}
    
    if data_scope == DATA_SCOPE_DEPARTMENT:
        # User can see data from their department
        department_id = user.get("department_id") if user else None
        
        if department_id:
            return {"$or": [
                {user_field: user_id},  # Own data
                {department_field: department_id}  # Department data
            ]}
        else:
            # User has no department - fall back to own data only
            return {user_field: user_id}
    
    # DATA_SCOPE_OWN - User can only see their own data
    return {user_field: user_id}


async def apply_data_scope_filter(
    base_query: dict,
    user_id: str,
    category: str,
    module: str,
    user_field: str = "created_by",
    department_field: str = "department_id"
) -> dict:
    """
    Apply data scope filter to an existing query.
    
    Returns the query with data scope filter applied
    """
    scope_filter = await get_data_scope_filter_async(
        user_id, category, module, user_field, department_field
    )
    
    if not scope_filter:
        return base_query
    
    # Merge scope filter with existing query
    if base_query:
        return {"$and": [base_query, scope_filter]}
    return scope_filter


def get_data_scope_query(
    current_user: dict, 
    module_code: str, 
    base_query: dict = None,
    reportee_ids: list = None
) -> dict:
    """
    Build MongoDB query filter based on user's data scope for a module.
    
    Data scope options:
    - "all": No filter (see everything with module access)
    - "reportees": Filter by user's reportees (requires reportee_ids parameter)
    - "team": Filter by department_id (same department)
    - "department": Same as team
    - "own_assigned": Filter by created_by OR assigned_to
    - "own_only": Filter by created_by only
    
    Args:
        current_user: User dict with module_permissions
        module_code: Module code to check permissions for
        base_query: Optional existing query to extend
        reportee_ids: Pre-fetched list of reportee IDs (for "reportees" scope)
        
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
    elif data_scope == "reportees":
        # Manager sees own data + all reportees' data
        if reportee_ids:
            allowed_ids = list(reportee_ids) + [user_id]
            query["$or"] = [
                {"created_by": {"$in": allowed_ids}},
                {"assigned_to": {"$in": allowed_ids}},
            ]
        else:
            # Fallback to own + assigned if no reportee_ids provided
            query["$or"] = [
                {"created_by": user_id},
                {"assigned_to": user_id},
            ]
    elif data_scope == "team" or data_scope == "department":
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
    elif data_scope == "own_only" or data_scope == "own":
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



# ============== RBAC-AWARE DEPENDENCIES ==============

def require_module_access(module_code: str, action: str = "read"):
    """
    FastAPI dependency to check module access with RBAC.
    
    Usage:
        @router.get("/items")
        async def get_items(user: dict = Depends(require_module_access("expense", "read"))):
            ...
    
    Args:
        module_code: The module code to check (e.g., "expense", "marketing_ops")
        action: CRUD action to check ("create", "read", "update", "delete")
    """
    async def check_access(user: dict):
        from server import get_current_user
        
        # Check if user has the required permission
        if not can_user_crud(user, module_code, action):
            from fastapi import HTTPException
            raise HTTPException(
                status_code=403, 
                detail=f"You don't have {action} permission for {module_code} module"
            )
        
        return user
    
    return check_access


async def apply_data_scope_to_query(
    user: dict,
    module_code: str, 
    base_query: dict = None,
    owner_field: str = "created_by",
    assigned_field: str = "assigned_to"
) -> dict:
    """
    Apply RBAC data scope filtering to a MongoDB query.
    
    Args:
        user: Current user dict with module_permissions
        module_code: Module code to check scope for
        base_query: Existing query to extend
        owner_field: Field name that stores the owner/creator ID
        assigned_field: Field name that stores assigned user ID
    
    Returns:
        MongoDB query with data scope filters applied
    """
    user_id = user.get("id")
    user_role = user.get("role", "")
    department_id = user.get("department_id")
    
    query = dict(base_query) if base_query else {}
    
    # Super admin/admin sees all
    if user_role in ["super_admin", "admin"]:
        return query
    
    if user.get("can_manage_users") or user.get("can_manage_roles"):
        return query
    
    # Get module permissions
    module_permissions = user.get("module_permissions", {})
    module_perm = module_permissions.get(module_code, {})
    data_scope = module_perm.get("data_scope", "all")
    
    if data_scope == "all":
        return query
    elif data_scope == "reportees":
        # Manager sees own data + all reportees' data
        from utils.org_hierarchy import get_all_reportees
        from server import db
        reportee_ids = await get_all_reportees(db, user_id)
        reportee_ids_list = list(reportee_ids)
        reportee_ids_list.append(user_id)  # Include self
        
        query["$or"] = [
            {owner_field: {"$in": reportee_ids_list}},
            {assigned_field: {"$in": reportee_ids_list}}
        ]
    elif data_scope == "department":
        if department_id:
            query["$or"] = [
                {owner_field: user_id},
                {assigned_field: user_id},
                {"department_id": department_id}
            ]
        else:
            query["$or"] = [
                {owner_field: user_id},
                {assigned_field: user_id}
            ]
    elif data_scope == "team":
        if department_id:
            query["$or"] = [
                {owner_field: user_id},
                {assigned_field: user_id},
                {"department_id": department_id}
            ]
        else:
            query["$or"] = [
                {owner_field: user_id},
                {assigned_field: user_id}
            ]
    elif data_scope == "own_assigned":
        query["$or"] = [
            {owner_field: user_id},
            {assigned_field: user_id}
        ]
    elif data_scope == "own" or data_scope == "own_only":
        query[owner_field] = user_id
    
    return query
