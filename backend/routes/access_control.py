"""
Access Control Routes - Custom Roles, Module Access, Onboarding, Permissions
Clean architecture separating User (Auth) from Employee (HR + Access)
Includes IT Admin ↔ HR Auto-Provisioning Integration
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from models.access_control import (
    CustomRoleCreate, CustomRoleUpdate, CustomRoleResponse,
    OnboardingData, OnboardingResponse,
    UserAuthResponse, EmployeeWithAccess, PermissionCheckResponse,
    UserStatus, SystemModule, MODULE_DEFINITIONS, DEFAULT_CUSTOM_ROLES
)

access_control_router = APIRouter(prefix="/access", tags=["Access Control - Roles & Permissions"])


# Import db and auth from main server
def get_db():
    from server import db
    return db


def require_admin():
    from server import require_department
    return require_department(["admin"])


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


# ============== AUTO-PROVISIONING HELPERS ==============

async def _trigger_auto_provisioning(db, employee_id: str, department_id: Optional[str], role_code: Optional[str], admin_user: dict):
    """Trigger auto-provisioning of tools for an activated employee"""
    try:
        # Find matching templates
        templates = await db.acms_tool_templates.find({"is_active": True}, {"_id": 0}).to_list(100)
        
        matching_templates = []
        for template in templates:
            if not template.get("department_id"):
                matching_templates.append(template)
            elif template.get("department_id") == department_id:
                if template.get("role_code"):
                    if template.get("role_code") == role_code:
                        matching_templates.append(template)
                else:
                    matching_templates.append(template)
        
        if not matching_templates:
            return {"tools_provisioned": 0}
        
        tools_to_provision = {}
        for template in matching_templates:
            for tool_id in template.get("tool_ids", []):
                current_level = tools_to_provision.get(tool_id, {}).get("level", 0)
                template_level = {"viewer": 1, "editor": 2, "admin": 3}.get(template.get("default_access_level", "viewer"), 1)
                if template_level > current_level:
                    tools_to_provision[tool_id] = {"level": template_level, "access_level": template.get("default_access_level", "viewer")}
        
        provisioned_count = 0
        for tool_id, info in tools_to_provision.items():
            existing = await db.acms_user_access.find_one({"user_id": employee_id, "tool_id": tool_id, "is_active": True})
            if existing:
                continue
            
            access_doc = {
                "id": str(uuid.uuid4()),
                "user_id": employee_id,
                "tool_id": tool_id,
                "access_level": info["access_level"],
                "access_type": "auto_provisioned",
                "granted_at": datetime.now(timezone.utc).isoformat(),
                "granted_by": admin_user.get("id"),
                "is_active": True,
                "provisioning_reason": "employee_activation"
            }
            await db.acms_user_access.insert_one(access_doc)
            provisioned_count += 1
        
        return {"tools_provisioned": provisioned_count}
    except Exception as e:
        print(f"[Auto-Provision] Error: {str(e)}")
        return {"tools_provisioned": 0, "error": str(e)}


async def _trigger_auto_revocation(db, employee_id: str, admin_user: dict, reason: str = "deactivation"):
    """Trigger auto-revocation of all tools for a deactivated employee"""
    try:
        access_records = await db.acms_user_access.find({"user_id": employee_id, "is_active": True}, {"_id": 0}).to_list(100)
        
        revoked_count = 0
        now = datetime.now(timezone.utc).isoformat()
        
        for access in access_records:
            await db.acms_user_access.update_one(
                {"id": access["id"]},
                {"$set": {"is_active": False, "revoked_at": now, "revoked_by": admin_user.get("id"), "revocation_reason": reason}}
            )
            revoked_count += 1
        
        return {"tools_revoked": revoked_count}
    except Exception as e:
        print(f"[Auto-Revoke] Error: {str(e)}")
        return {"tools_revoked": 0, "error": str(e)}


# ============== CUSTOM ROLES ==============

@access_control_router.get("/roles", response_model=List[CustomRoleResponse])
async def get_custom_roles(
    include_inactive: bool = False,
    user: dict = Depends(get_current_user_dep())
):
    """Get all custom roles"""
    db = get_db()
    
    query = {}
    if not include_inactive:
        query["is_active"] = {"$ne": False}
    
    roles = await db.custom_roles.find(query, {"_id": 0}).to_list(100)
    
    # Enrich with employee counts and module names
    for role in roles:
        # Count from both employees collection (legacy) and users collection (new)
        emp_count = await db.employees.count_documents({"custom_role_id": role["id"]})
        # Also count users who have this role in their custom_role_ids array
        user_count = await db.users.count_documents({"custom_role_ids": role["id"]})
        role["employee_count"] = max(emp_count, user_count)  # Use the higher count
        
        # Add human-readable module names
        role["module_names"] = [
            MODULE_DEFINITIONS.get(m, {}).get("name", m) 
            for m in role.get("module_access", [])
        ]
    
    return roles


@access_control_router.get("/roles/{role_id}", response_model=CustomRoleResponse)
async def get_custom_role(role_id: str, user: dict = Depends(get_current_user_dep())):
    """Get a single custom role"""
    db = get_db()
    
    role = await db.custom_roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    role["employee_count"] = await db.employees.count_documents({"custom_role_id": role_id})
    role["module_names"] = [
        MODULE_DEFINITIONS.get(m, {}).get("name", m) 
        for m in role.get("module_access", [])
    ]
    
    return role


@access_control_router.post("/roles", response_model=CustomRoleResponse)
async def create_custom_role(data: CustomRoleCreate, user: dict = Depends(require_admin())):
    """Create a new custom role"""
    db = get_db()
    
    # Check for duplicate code
    existing = await db.custom_roles.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Role code already exists")
    
    role_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    role_doc = {
        "id": role_id,
        **data.model_dump(),
        "is_active": True,
        "employee_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.custom_roles.insert_one(role_doc)
    del role_doc["_id"]
    
    role_doc["module_names"] = [
        MODULE_DEFINITIONS.get(m, {}).get("name", m) 
        for m in role_doc.get("module_access", [])
    ]
    
    return role_doc


@access_control_router.put("/roles/{role_id}", response_model=CustomRoleResponse)
async def update_custom_role(
    role_id: str,
    data: CustomRoleUpdate,
    user: dict = Depends(require_admin())
):
    """Update a custom role"""
    db = get_db()
    
    existing = await db.custom_roles.find_one({"id": role_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Get all non-None values from the update data
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # For system roles, restrict certain fields
    if existing.get("is_system_role"):
        # Cannot change name or code for system roles
        if "name" in update_dict and update_dict["name"] != existing.get("name"):
            raise HTTPException(status_code=400, detail="Cannot change name of system roles")
        if "code" in update_dict and update_dict["code"] != existing.get("code"):
            raise HTTPException(status_code=400, detail="Cannot change code of system roles")
        
        # Filter to only allowed fields for system roles
        allowed = ["description", "is_active", "module_access", "module_permissions", 
                   "can_manage_users", "can_manage_employees", "can_manage_roles"]
        update_data = {k: v for k, v in update_dict.items() if k in allowed}
    else:
        update_data = update_dict
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.custom_roles.update_one({"id": role_id}, {"$set": update_data})
    
    updated = await db.custom_roles.find_one({"id": role_id}, {"_id": 0})
    # Count from both employees and users collections
    emp_count = await db.employees.count_documents({"custom_role_id": role_id})
    user_count = await db.users.count_documents({"custom_role_ids": role_id})
    updated["employee_count"] = max(emp_count, user_count)
    updated["module_names"] = [
        MODULE_DEFINITIONS.get(m, {}).get("name", m) 
        for m in updated.get("module_access", [])
    ]
    
    return updated


@access_control_router.delete("/roles/{role_id}")
async def delete_custom_role(role_id: str, user: dict = Depends(require_admin())):
    """Delete a custom role. Super Admin can delete system roles except 'super_admin'."""
    db = get_db()
    
    role = await db.custom_roles.find_one({"id": role_id})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Never allow deletion of super_admin role
    if role.get("code") == "super_admin":
        raise HTTPException(status_code=400, detail="Cannot delete the Super Admin role - it is required for system operation")
    
    # Check if role has employees
    employee_count = await db.employees.count_documents({"custom_role_id": role_id})
    if employee_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete role with {employee_count} employees. Reassign them first."
        )
    
    # Hard delete the role
    await db.custom_roles.delete_one({"id": role_id})
    
    return {"success": True, "message": f"Role '{role.get('name')}' deleted successfully"}


# ============== MODULE DEFINITIONS ==============

@access_control_router.get("/modules")
async def get_module_definitions(user: dict = Depends(get_current_user_dep())):
    """Get all available modules and their definitions"""
    return {
        "modules": MODULE_DEFINITIONS,
        "module_keys": list(MODULE_DEFINITIONS.keys())
    }


# ============== ONBOARDING WORKFLOW ==============

@access_control_router.post("/onboard/{user_id}", response_model=OnboardingResponse)
async def onboard_user(
    user_id: str,
    data: OnboardingData,
    current_user: dict = Depends(require_admin())
):
    """
    Onboard a draft user - Updates the User record with organizational data.
    In the current architecture, User record serves both auth and HR purposes.
    This updates the user's organizational fields to complete their profile.
    Supports multi-role assignment for access control.
    """
    db = get_db()
    
    # 1. Fetch the user
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already onboarded (has department and custom_role assigned)
    existing_roles = user.get("custom_role_ids", [])
    if not existing_roles:
        # Check legacy field
        existing_roles = [user.get("custom_role_id")] if user.get("custom_role_id") else []
    
    if existing_roles and user.get("department_id"):
        raise HTTPException(
            status_code=400, 
            detail="User is already onboarded. Use employee update endpoints instead."
        )
    
    # 2. Validate custom roles exist (multi-role support)
    if not data.custom_role_ids or len(data.custom_role_ids) == 0:
        raise HTTPException(status_code=400, detail="At least one access role is required")
    
    validated_roles = []
    for role_id in data.custom_role_ids:
        custom_role = await db.custom_roles.find_one({"id": role_id})
        if not custom_role:
            raise HTTPException(status_code=400, detail=f"Invalid custom role ID: {role_id}")
        validated_roles.append(custom_role)
    
    # 3. Validate department exists
    department = await db.departments.find_one({"id": data.department_id})
    if not department:
        raise HTTPException(status_code=400, detail="Invalid department ID")
    
    # 4. Validate optional references
    if data.team_id:
        team = await db.teams.find_one({"id": data.team_id})
        if not team:
            raise HTTPException(status_code=400, detail="Invalid team ID")
    
    if data.position_id:
        position = await db.positions.find_one({"id": data.position_id})
        if not position:
            raise HTTPException(status_code=400, detail="Invalid position ID")
    
    if data.grade_id:
        grade = await db.grade_types.find_one({"id": data.grade_id})
        if not grade:
            raise HTTPException(status_code=400, detail="Invalid grade ID")
    
    if data.reports_to:
        manager = await db.users.find_one({"id": data.reports_to})
        if not manager:
            raise HTTPException(status_code=400, detail="Invalid reporting manager ID")
    
    # 5. Generate employee code if not already assigned (must match EMP-XXXX pattern)
    existing_code = user.get("employee_id", "")
    if existing_code and existing_code.startswith("EMP-"):
        employee_code = existing_code
    else:
        last_emp = await db.users.find_one(
            {"employee_id": {"$regex": "^EMP-"}},
            sort=[("employee_id", -1)]
        )
        if last_emp and last_emp.get("employee_id"):
            try:
                last_num = int(last_emp["employee_id"].split("-")[1])
                employee_code = f"EMP-{str(last_num + 1).zfill(4)}"
            except (ValueError, IndexError):
                count = await db.users.count_documents({"employee_id": {"$regex": "^EMP-"}})
                employee_code = f"EMP-{str(count + 1).zfill(4)}"
        else:
            employee_code = "EMP-0001"
    
    # 6. Merge module access from all assigned roles
    merged_module_access = set()
    can_manage_users = False
    can_manage_employees = False
    can_manage_roles = False
    
    for role in validated_roles:
        merged_module_access.update(role.get("module_access", []))
        if role.get("can_manage_users"):
            can_manage_users = True
        if role.get("can_manage_employees"):
            can_manage_employees = True
        if role.get("can_manage_roles"):
            can_manage_roles = True
    
    # 7. Update User record with organizational data
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        # Organization
        "department_id": data.department_id,
        "team_id": data.team_id,
        "position_id": data.position_id,
        "grade_id": data.grade_id,
        "reports_to": data.reports_to,
        "secondary_manager_id": data.secondary_manager_id,
        
        # Employment
        "employee_id": employee_code,
        "designation": data.designation,
        "employment_type": data.employment_type,
        "work_mode": data.work_mode,
        "joining_date": data.joining_date or now.split("T")[0],
        
        # Access Control - Multi-role support
        "custom_role_ids": data.custom_role_ids,
        "custom_role_id": data.custom_role_ids[0] if data.custom_role_ids else None,  # Legacy field - use first role
        "merged_module_access": list(merged_module_access),
        "can_manage_users": can_manage_users,
        "can_manage_employees": can_manage_employees,
        "can_manage_roles": can_manage_roles,
        
        # Status
        "status": UserStatus.ONBOARDED.value,
        
        # Personal
        "phone": data.phone or user.get("phone"),
        "work_location": data.work_location,
        
        # Metadata
        "updated_at": now,
        "onboarded_by": current_user.get("id"),
        "onboarded_at": now
    }
    
    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    role_names = ", ".join([r.get("name", "") for r in validated_roles])
    
    return OnboardingResponse(
        user_id=user_id,
        employee_id=user_id,  # In current architecture, user_id is the employee reference
        employee_code=employee_code,
        status="success",
        message=f"User successfully onboarded as {employee_code} with roles: {role_names}"
    )


class UpdateUserRolesRequest(BaseModel):
    """Request model for updating user roles"""
    custom_role_ids: List[str]


@access_control_router.put("/users/{user_id}/roles")
async def update_user_roles(
    user_id: str,
    data: UpdateUserRolesRequest,
    current_user: dict = Depends(require_admin())
):
    """
    Update the custom roles assigned to a user.
    This updates the user's access control without re-onboarding.
    Allows 0 roles - user will only have access to default modules and direct grants.
    """
    db = get_db()
    
    # 1. Fetch the user
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 2. Validate all role IDs exist (allow empty list)
    validated_roles = []
    for role_id in (data.custom_role_ids or []):
        custom_role = await db.custom_roles.find_one({"id": role_id})
        if not custom_role:
            raise HTTPException(status_code=400, detail=f"Invalid role ID: {role_id}")
        validated_roles.append(custom_role)
    
    # 3. Merge module access from all assigned roles
    merged_module_access = set()
    can_manage_users = False
    can_manage_employees = False
    can_manage_roles = False
    
    for role in validated_roles:
        merged_module_access.update(role.get("module_access", []))
        if role.get("can_manage_users"):
            can_manage_users = True
        if role.get("can_manage_employees"):
            can_manage_employees = True
        if role.get("can_manage_roles"):
            can_manage_roles = True
    
    # 3b. Also include direct module grants from user_module_access
    user_access = await db.user_module_access.find_one({"user_id": user_id})
    if user_access:
        granted = set(user_access.get("granted_modules", []))
        denied = set(user_access.get("denied_modules", []))
        merged_module_access = (merged_module_access | granted) - denied
    
    # 4. Update user record
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "custom_role_ids": data.custom_role_ids or [],
        "custom_role_id": data.custom_role_ids[0] if data.custom_role_ids else None,
        "merged_module_access": list(merged_module_access),
        "can_manage_users": can_manage_users,
        "can_manage_employees": can_manage_employees,
        "can_manage_roles": can_manage_roles,
        "updated_at": now,
        "roles_updated_by": current_user.get("id"),
        "roles_updated_at": now
    }
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    # 5. Also update employees collection if exists (for backwards compatibility)
    employee = await db.employees.find_one({"user_id": user_id})
    if employee:
        await db.employees.update_one(
            {"user_id": user_id},
            {"$set": {
                "custom_role_ids": data.custom_role_ids,
                "custom_role_id": data.custom_role_ids[0] if data.custom_role_ids else None,
                "updated_at": now
            }}
        )
    
    role_names = [r.get("name", "") for r in validated_roles]
    
    return {
        "success": True,
        "user_id": user_id,
        "custom_role_ids": data.custom_role_ids,
        "role_names": role_names,
        "merged_module_access": list(merged_module_access),
        "message": f"Roles updated: {', '.join(role_names)}"
    }


@access_control_router.post("/activate/{employee_id}")
async def activate_employee(
    employee_id: str,
    current_user: dict = Depends(require_admin())
):
    """Activate an onboarded employee - changes their status to Active and auto-provisions tools"""
    db = get_db()
    
    employee = await db.employees.find_one({"id": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update employee status
    await db.employees.update_one(
        {"id": employee_id},
        {"$set": {"status": "active", "updated_at": now}}
    )
    
    # Update user status
    user_id = employee.get("user_id")
    if user_id:
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"status": UserStatus.ACTIVE.value, "updated_at": now}}
        )
    
    # Auto-provision tools based on templates
    provisioning_result = await _trigger_auto_provisioning(
        db=db,
        employee_id=user_id or employee_id,
        department_id=employee.get("department_id"),
        role_code=employee.get("role"),
        admin_user=current_user
    )
    
    return {
        "success": True, 
        "message": "Employee activated",
        "tools_provisioned": provisioning_result.get("tools_provisioned", 0)
    }


@access_control_router.post("/deactivate/{employee_id}")
async def deactivate_employee(
    employee_id: str,
    current_user: dict = Depends(require_admin())
):
    """Deactivate an employee - removes system access and auto-revokes all tools"""
    db = get_db()
    
    employee = await db.employees.find_one({"id": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update employee status
    await db.employees.update_one(
        {"id": employee_id},
        {"$set": {"status": "inactive", "updated_at": now}}
    )
    
    # Update user status
    user_id = employee.get("user_id")
    if user_id:
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"status": UserStatus.INACTIVE.value, "updated_at": now}}
        )
    
    # Auto-revoke all tool access
    revocation_result = await _trigger_auto_revocation(
        db=db,
        employee_id=user_id or employee_id,
        admin_user=current_user,
        reason="employee_deactivation"
    )
    
    return {
        "success": True, 
        "message": "Employee deactivated",
        "tools_revoked": revocation_result.get("tools_revoked", 0)
    }


# ============== PERMISSION CHECKS ==============

@access_control_router.get("/check/{module_key}")
async def check_module_access(
    module_key: str,
    user: dict = Depends(get_current_user_dep())
) -> PermissionCheckResponse:
    """Check if current user has access to a specific module"""
    db = get_db()
    
    user_id = user.get("id")
    
    # Get full user record
    full_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    
    if not full_user:
        return PermissionCheckResponse(
            has_access=False,
            module=module_key,
            user_id=user_id,
            employee_id=None,
            role_name=None,
            reason="User not found"
        )
    
    # Check if legacy super_admin
    if full_user.get("role") == "super_admin":
        return PermissionCheckResponse(
            has_access=True,
            module=module_key,
            user_id=user_id,
            employee_id=user_id,
            role_name="Super Admin (Legacy)",
            reason="Legacy super admin access"
        )
    
    # Check if user has custom_role_id (onboarded)
    custom_role_id = full_user.get("custom_role_id")
    if not custom_role_id:
        return PermissionCheckResponse(
            has_access=False,
            module=module_key,
            user_id=user_id,
            employee_id=user_id,
            role_name=None,
            reason="User not onboarded - no custom role assigned"
        )
    
    custom_role = await db.custom_roles.find_one({"id": custom_role_id}, {"_id": 0})
    if not custom_role:
        return PermissionCheckResponse(
            has_access=False,
            module=module_key,
            user_id=user_id,
            employee_id=user_id,
            role_name=None,
            reason="Custom role not found"
        )
    
    # Check module access
    module_access = custom_role.get("module_access", [])
    has_access = module_key in module_access
    
    # Check for default access modules
    module_def = MODULE_DEFINITIONS.get(module_key, {})
    if module_def.get("default_access"):
        has_access = True
    
    return PermissionCheckResponse(
        has_access=has_access,
        module=module_key,
        user_id=user_id,
        employee_id=user_id,
        role_name=custom_role.get("name"),
        reason="Access granted" if has_access else f"Module '{module_key}' not in role's module_access list"
    )


@access_control_router.get("/my-access")
async def get_my_access(user: dict = Depends(get_current_user_dep())):
    """Get complete access profile for current user (supports multi-role)"""
    db = get_db()
    
    user_id = user.get("id")
    
    # Get full user record (which includes employee data in current architecture)
    full_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    
    if not full_user:
        return {
            "user_id": user_id,
            "is_onboarded": False,
            "employee_id": None,
            "custom_roles": [],
            "module_access": ["dashboard", "help_support"],
            "can_manage_users": False,
            "can_manage_employees": False,
            "can_manage_roles": False
        }
    
    # Check if user is onboarded (has custom_role_ids and department_id)
    custom_role_ids = full_user.get("custom_role_ids", [])
    if not custom_role_ids and full_user.get("custom_role_id"):
        # Legacy single role support
        custom_role_ids = [full_user.get("custom_role_id")]
    
    is_onboarded = bool(custom_role_ids and full_user.get("department_id"))
    
    # Legacy super_admin check
    if full_user.get("role") == "super_admin":
        return {
            "user_id": user_id,
            "is_onboarded": True,
            "employee_id": user_id,
            "employee_code": full_user.get("employee_id"),
            "department_id": full_user.get("department_id"),
            "department_name": None,
            "custom_roles": [{
                "id": None,
                "name": "Super Admin (Legacy)",
                "code": "super_admin"
            }],
            "module_access": list(MODULE_DEFINITIONS.keys()),
            "can_manage_users": True,
            "can_manage_employees": True,
            "can_manage_roles": True,
            "status": full_user.get("status", "active"),
            "legacy_role": "super_admin"
        }
    
    if not is_onboarded:
        return {
            "user_id": user_id,
            "is_onboarded": False,
            "employee_id": None,
            "custom_roles": [],
            "module_access": ["dashboard", "help_support"],
            "can_manage_users": full_user.get("role") in ["admin"],
            "can_manage_employees": full_user.get("role") in ["admin"],
            "can_manage_roles": False,
            "legacy_role": full_user.get("role")
        }
    
    # Get custom roles (multi-role support)
    custom_roles = []
    module_access = set(["dashboard", "help_support"])
    can_manage_users = False
    can_manage_employees = False
    can_manage_roles = False
    
    for role_id in custom_role_ids:
        role = await db.custom_roles.find_one({"id": role_id}, {"_id": 0})
        if role:
            custom_roles.append({
                "id": role.get("id"),
                "name": role.get("name"),
                "code": role.get("code")
            })
            module_access.update(role.get("module_access", []))
            if role.get("can_manage_users"):
                can_manage_users = True
            if role.get("can_manage_employees"):
                can_manage_employees = True
            if role.get("can_manage_roles"):
                can_manage_roles = True
    
    # Enrich with department name
    dept_name = None
    if full_user.get("department_id"):
        dept = await db.departments.find_one({"id": full_user["department_id"]}, {"name": 1})
        dept_name = dept.get("name") if dept else None
    
    return {
        "user_id": user_id,
        "is_onboarded": True,
        "employee_id": user_id,
        "employee_code": full_user.get("employee_id"),
        "department_id": full_user.get("department_id"),
        "department_name": dept_name,
        "custom_roles": custom_roles,
        "module_access": list(module_access),
        "can_manage_users": can_manage_users,
        "can_manage_employees": can_manage_employees,
        "can_manage_roles": can_manage_roles,
        "status": full_user.get("status", "active")
    }


# ============== DRAFT USERS (Pending Onboarding) ==============

@access_control_router.get("/draft-users", response_model=List[UserAuthResponse])
async def get_draft_users(
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    user: dict = Depends(require_admin())
):
    """Get all users pending onboarding (no custom_role_id assigned)"""
    db = get_db()
    
    # Find users who need onboarding (no custom_role_id assigned)
    # In current architecture, a user is "onboarded" when they have:
    # 1. custom_role_id AND department_id assigned
    query = {
        "$or": [
            {"custom_role_id": {"$exists": False}},
            {"custom_role_id": None},
            {"custom_role_id": ""},
            {"department_id": {"$exists": False}},
            {"department_id": None}
        ]
    }
    
    if search:
        query = {
            "$and": [
                query,
                {"$or": [
                    {"name": {"$regex": search, "$options": "i"}},
                    {"email": {"$regex": search, "$options": "i"}}
                ]}
            ]
        }
    
    users = await db.users.find(
        query, 
        {"_id": 0, "password": 0}
    ).limit(limit).to_list(limit)
    
    # Enrich with onboarding status
    for u in users:
        u["is_onboarded"] = bool(u.get("custom_role_id") and u.get("department_id"))
        u["status"] = u.get("status", "draft")
    
    return users


# ============== SEED DEFAULT ROLES ==============

@access_control_router.post("/seed-roles")
async def seed_default_roles(user: dict = Depends(require_admin())):
    """Seed default custom roles"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if already seeded
    count = await db.custom_roles.count_documents({})
    if count > 0:
        return {"message": "Custom roles already exist", "count": count}
    
    created = 0
    for role_data in DEFAULT_CUSTOM_ROLES:
        role_id = str(uuid.uuid4())
        role_doc = {
            "id": role_id,
            **role_data,
            "is_active": True,
            "employee_count": 0,
            "created_at": now,
            "updated_at": now
        }
        await db.custom_roles.insert_one(role_doc)
        created += 1
    
    return {
        "success": True, 
        "message": f"Created {created} default custom roles", 
        "count": created
    }
