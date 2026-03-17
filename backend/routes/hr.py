"""
HR Routes - Employee Database, Grade Types, Teams, Positions, Reporting Structure, Org Chart
Includes IT Admin ↔ HR Auto-Provisioning Integration
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from models.hr import (
    GradeTypeCreate, GradeTypeUpdate, GradeTypeResponse,
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeDetailResponse,
    TeamCreate, TeamUpdate, TeamResponse,
    PositionCreate, PositionUpdate, PositionResponse,
    DepartmentEnhancedUpdate, DepartmentEnhancedResponse,
    ReportingLineCreate, ReportingLineResponse,
    OrgChartNode, DEFAULT_GRADE_TYPES, DEFAULT_POSITIONS
)

hr_router = APIRouter(prefix="/hr", tags=["HR - Employee Management"])


# ============== AUTO-PROVISIONING INTEGRATION ==============

async def trigger_auto_provisioning(
    employee_id: str,
    department_id: Optional[str],
    role_code: Optional[str],
    admin_user: dict
):
    """
    Trigger auto-provisioning of tools for a new/activated employee.
    Called when employee status changes to 'active'.
    """
    try:
        db = get_db()
        
        # Find matching templates
        query = {"is_active": True}
        templates = await db.acms_tool_templates.find(query, {"_id": 0}).to_list(100)
        
        matching_templates = []
        for template in templates:
            # Global template (no department specified)
            if not template.get("department_id"):
                matching_templates.append(template)
            # Department-specific template
            elif template.get("department_id") == department_id:
                # Check role if specified
                if template.get("role_code"):
                    if template.get("role_code") == role_code:
                        matching_templates.append(template)
                else:
                    matching_templates.append(template)
        
        if not matching_templates:
            print(f"[Auto-Provision] No matching templates for employee {employee_id}")
            return {"message": "No matching templates", "tools_provisioned": 0}
        
        # Collect all tools to provision
        tools_to_provision = {}
        for template in matching_templates:
            for tool_id in template.get("tool_ids", []):
                # Use highest access level if tool appears in multiple templates
                current_level = tools_to_provision.get(tool_id, {}).get("level", 0)
                template_level = {"viewer": 1, "editor": 2, "admin": 3}.get(
                    template.get("default_access_level", "viewer"), 1
                )
                if template_level > current_level:
                    tools_to_provision[tool_id] = {
                        "level": template_level,
                        "access_level": template.get("default_access_level", "viewer")
                    }
        
        # Provision tools
        provisioned_count = 0
        for tool_id, info in tools_to_provision.items():
            # Check if access already exists
            existing = await db.acms_user_access.find_one({
                "user_id": employee_id,
                "tool_id": tool_id,
                "is_active": True
            })
            
            if existing:
                continue
            
            # Create access record
            access_doc = {
                "id": str(uuid.uuid4()),
                "user_id": employee_id,
                "tool_id": tool_id,
                "access_level": info["access_level"],
                "access_type": "auto_provisioned",
                "granted_at": datetime.now(timezone.utc).isoformat(),
                "granted_by": admin_user.get("id"),
                "is_active": True,
                "provisioning_reason": "employee_onboarding"
            }
            
            await db.acms_user_access.insert_one(access_doc)
            provisioned_count += 1
            
            # Log activity
            tool = await db.acms_tools.find_one({"id": tool_id}, {"name": 1})
            tool_name = tool.get("name") if tool else "Unknown"
            emp = await db.users.find_one({"id": employee_id}, {"name": 1})
            emp_name = emp.get("name") if emp else "Unknown"
            
            await db.acms_audit_logs.insert_one({
                "id": str(uuid.uuid4()),
                "action": "access_auto_provisioned",
                "entity_type": "access",
                "entity_id": access_doc["id"],
                "entity_name": tool_name,
                "user_id": admin_user.get("id"),
                "user_name": admin_user.get("name"),
                "details": {
                    "target_user": emp_name,
                    "target_user_id": employee_id,
                    "tool": tool_name,
                    "access_level": info["access_level"],
                    "reason": "employee_onboarding"
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        # Log summary
        await db.acms_audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "action": "onboarding_provisioning_completed",
            "entity_type": "provisioning",
            "entity_id": employee_id,
            "entity_name": "Employee Onboarding",
            "user_id": admin_user.get("id"),
            "user_name": admin_user.get("name"),
            "details": {
                "target_user_id": employee_id,
                "templates_matched": len(matching_templates),
                "tools_provisioned": provisioned_count
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        print(f"[Auto-Provision] Provisioned {provisioned_count} tools for employee {employee_id}")
        return {
            "message": f"Provisioned {provisioned_count} tools",
            "templates_matched": len(matching_templates),
            "tools_provisioned": provisioned_count
        }
    except Exception as e:
        print(f"[Auto-Provision] Error: {str(e)}")
        return {"error": str(e)}


async def trigger_auto_revocation(
    employee_id: str,
    admin_user: dict,
    reason: str = "employee_offboarding"
):
    """
    Trigger auto-revocation of all tools for a terminated/deactivated employee.
    Called when employee status changes to 'terminated' or 'inactive'.
    """
    try:
        db = get_db()
        
        # Find all active access for this employee
        access_records = await db.acms_user_access.find({
            "user_id": employee_id,
            "is_active": True
        }, {"_id": 0}).to_list(100)
        
        if not access_records:
            print(f"[Auto-Revoke] No active tool access for employee {employee_id}")
            return {"message": "No tools to revoke", "tools_revoked": 0}
        
        revoked_count = 0
        now = datetime.now(timezone.utc).isoformat()
        
        for access in access_records:
            await db.acms_user_access.update_one(
                {"id": access["id"]},
                {
                    "$set": {
                        "is_active": False,
                        "revoked_at": now,
                        "revoked_by": admin_user.get("id"),
                        "revocation_reason": reason
                    }
                }
            )
            revoked_count += 1
            
            # Log activity
            tool = await db.acms_tools.find_one({"id": access.get("tool_id")}, {"name": 1})
            tool_name = tool.get("name") if tool else "Unknown"
            emp = await db.users.find_one({"id": employee_id}, {"name": 1})
            emp_name = emp.get("name") if emp else "Unknown"
            
            await db.acms_audit_logs.insert_one({
                "id": str(uuid.uuid4()),
                "action": "access_auto_revoked",
                "entity_type": "access",
                "entity_id": access["id"],
                "entity_name": tool_name,
                "user_id": admin_user.get("id"),
                "user_name": admin_user.get("name"),
                "details": {
                    "target_user": emp_name,
                    "target_user_id": employee_id,
                    "tool": tool_name,
                    "reason": reason
                },
                "timestamp": now
            })
        
        # Log summary
        await db.acms_audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "action": "offboarding_revocation_completed",
            "entity_type": "provisioning",
            "entity_id": employee_id,
            "entity_name": "Employee Offboarding",
            "user_id": admin_user.get("id"),
            "user_name": admin_user.get("name"),
            "details": {
                "target_user_id": employee_id,
                "tools_revoked": revoked_count,
                "reason": reason
            },
            "timestamp": now
        })
        
        print(f"[Auto-Revoke] Revoked {revoked_count} tools for employee {employee_id}")
        return {
            "message": f"Revoked {revoked_count} tool access records",
            "tools_revoked": revoked_count
        }
    except Exception as e:
        print(f"[Auto-Revoke] Error: {str(e)}")
        return {"error": str(e)}


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


# ============== GRADE TYPES ==============

@hr_router.get("/grades", response_model=List[GradeTypeResponse])
async def get_grade_types(
    include_inactive: bool = False,
    user: dict = Depends(get_current_user_dep())
):
    """Get all grade types"""
    db = get_db()
    
    query = {}
    if not include_inactive:
        query["is_active"] = {"$ne": False}
    
    grades = await db.grade_types.find(query, {"_id": 0}).sort("level", 1).to_list(100)
    
    # Enrich with employee counts
    for grade in grades:
        grade["employee_count"] = await db.users.count_documents({"grade_id": grade["id"]})
    
    return grades


@hr_router.get("/grades/{grade_id}", response_model=GradeTypeResponse)
async def get_grade_type(grade_id: str, user: dict = Depends(get_current_user_dep())):
    """Get a single grade type"""
    db = get_db()
    
    grade = await db.grade_types.find_one({"id": grade_id}, {"_id": 0})
    if not grade:
        raise HTTPException(status_code=404, detail="Grade type not found")
    
    grade["employee_count"] = await db.users.count_documents({"grade_id": grade_id})
    return grade


@hr_router.post("/grades", response_model=GradeTypeResponse)
async def create_grade_type(data: GradeTypeCreate, user: dict = Depends(require_admin())):
    """Create a new grade type"""
    db = get_db()
    
    # Check for duplicate code
    existing = await db.grade_types.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Grade code already exists")
    
    grade_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    grade_doc = {
        "id": grade_id,
        **data.model_dump(),
        "category": data.category.value if hasattr(data.category, 'value') else data.category,
        "is_active": True,
        "employee_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.grade_types.insert_one(grade_doc)
    del grade_doc["_id"]
    return grade_doc


@hr_router.put("/grades/{grade_id}", response_model=GradeTypeResponse)
async def update_grade_type(
    grade_id: str,
    data: GradeTypeUpdate,
    user: dict = Depends(require_admin())
):
    """Update a grade type"""
    db = get_db()
    
    existing = await db.grade_types.find_one({"id": grade_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Grade type not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "category" in update_data and hasattr(update_data["category"], 'value'):
        update_data["category"] = update_data["category"].value
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.grade_types.update_one({"id": grade_id}, {"$set": update_data})
    
    updated = await db.grade_types.find_one({"id": grade_id}, {"_id": 0})
    updated["employee_count"] = await db.users.count_documents({"grade_id": grade_id})
    return updated


@hr_router.delete("/grades/{grade_id}")
async def delete_grade_type(grade_id: str, user: dict = Depends(require_admin())):
    """Delete a grade type (soft delete)"""
    db = get_db()
    
    # Check if grade has employees
    employee_count = await db.users.count_documents({"grade_id": grade_id})
    if employee_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete grade with {employee_count} employees. Reassign them first.")
    
    await db.grade_types.update_one(
        {"id": grade_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Grade type deactivated"}


# ============== TEAMS ==============

@hr_router.get("/teams", response_model=List[TeamResponse])
async def get_teams(
    department_id: Optional[str] = None,
    include_inactive: bool = False,
    user: dict = Depends(get_current_user_dep())
):
    """Get all teams"""
    db = get_db()
    
    query = {}
    if department_id:
        query["department_id"] = department_id
    if not include_inactive:
        query["is_active"] = {"$ne": False}
    
    teams = await db.teams.find(query, {"_id": 0}).to_list(100)
    
    # Enrich
    for team in teams:
        if team.get("department_id"):
            dept = await db.departments.find_one({"id": team["department_id"]}, {"name": 1})
            team["department_name"] = dept.get("name") if dept else None
        if team.get("team_lead_id"):
            lead = await db.users.find_one({"id": team["team_lead_id"]}, {"name": 1})
            team["team_lead_name"] = lead.get("name") if lead else None
        team["member_count"] = await db.users.count_documents({"team_id": team["id"]})
    
    return teams


@hr_router.get("/teams/{team_id}", response_model=TeamResponse)
async def get_team(team_id: str, user: dict = Depends(get_current_user_dep())):
    """Get a single team"""
    db = get_db()
    
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    if team.get("department_id"):
        dept = await db.departments.find_one({"id": team["department_id"]}, {"name": 1})
        team["department_name"] = dept.get("name") if dept else None
    if team.get("team_lead_id"):
        lead = await db.users.find_one({"id": team["team_lead_id"]}, {"name": 1})
        team["team_lead_name"] = lead.get("name") if lead else None
    
    # Get member_ids if not already stored
    if "member_ids" not in team:
        members = await db.employees.find({"team_id": team_id}, {"id": 1}).to_list(None)
        team["member_ids"] = [m["id"] for m in members]
    
    team["member_count"] = len(team.get("member_ids", []))
    
    return team


@hr_router.post("/teams", response_model=TeamResponse)
async def create_team(data: TeamCreate, user: dict = Depends(require_admin())):
    """Create a new team"""
    db = get_db()
    
    # Check for duplicate code
    existing = await db.teams.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Team code already exists")
    
    team_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    team_doc = {
        "id": team_id,
        **data.model_dump(),
        "is_active": True,
        "member_count": len(data.member_ids),
        "created_at": now,
        "updated_at": now
    }
    
    await db.teams.insert_one(team_doc)
    
    # Update team_id for all members
    if data.member_ids:
        await db.employees.update_many(
            {"id": {"$in": data.member_ids}},
            {"$set": {"team_id": team_id}}
        )
    
    del team_doc["_id"]
    
    # Enrich for response
    if team_doc.get("department_id"):
        dept = await db.departments.find_one({"id": team_doc["department_id"]}, {"name": 1})
        team_doc["department_name"] = dept.get("name") if dept else None
    
    return team_doc


@hr_router.put("/teams/{team_id}", response_model=TeamResponse)
async def update_team(team_id: str, data: TeamUpdate, user: dict = Depends(require_admin())):
    """Update a team"""
    db = get_db()
    
    existing = await db.teams.find_one({"id": team_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Handle member_ids update
    if data.member_ids is not None:
        old_member_ids = existing.get("member_ids", [])
        new_member_ids = data.member_ids
        
        # Remove team_id from old members who are no longer in the team
        removed_members = [m for m in old_member_ids if m not in new_member_ids]
        if removed_members:
            await db.employees.update_many(
                {"id": {"$in": removed_members}},
                {"$set": {"team_id": None}}
            )
        
        # Add team_id to new members
        added_members = [m for m in new_member_ids if m not in old_member_ids]
        if added_members:
            await db.employees.update_many(
                {"id": {"$in": added_members}},
                {"$set": {"team_id": team_id}}
            )
        
        update_data["member_count"] = len(new_member_ids)
    
    await db.teams.update_one({"id": team_id}, {"$set": update_data})
    
    updated = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if updated.get("department_id"):
        dept = await db.departments.find_one({"id": updated["department_id"]}, {"name": 1})
        updated["department_name"] = dept.get("name") if dept else None
    if updated.get("team_lead_id"):
        lead = await db.users.find_one({"id": updated["team_lead_id"]}, {"name": 1})
        updated["team_lead_name"] = lead.get("name") if lead else None
    
    return updated


@hr_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, user: dict = Depends(require_admin())):
    """Delete a team (soft delete)"""
    db = get_db()
    
    member_count = await db.users.count_documents({"team_id": team_id})
    if member_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete team with {member_count} members")
    
    await db.teams.update_one(
        {"id": team_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Team deactivated"}


# ============== POSITIONS ==============

@hr_router.get("/positions", response_model=List[PositionResponse])
async def get_positions(
    department_id: Optional[str] = None,
    level: Optional[str] = None,
    include_inactive: bool = False,
    user: dict = Depends(get_current_user_dep())
):
    """Get all positions"""
    db = get_db()
    
    query = {}
    if department_id:
        query["department_id"] = department_id
    if level:
        query["level"] = level
    if not include_inactive:
        query["is_active"] = {"$ne": False}
    
    positions = await db.positions.find(query, {"_id": 0}).to_list(100)
    
    # Enrich
    for pos in positions:
        if pos.get("department_id"):
            dept = await db.departments.find_one({"id": pos["department_id"]}, {"name": 1})
            pos["department_name"] = dept.get("name") if dept else None
        if pos.get("reporting_position_id"):
            parent = await db.positions.find_one({"id": pos["reporting_position_id"]}, {"title": 1})
            pos["reporting_position_title"] = parent.get("title") if parent else None
        pos["employee_count"] = await db.users.count_documents({"position_id": pos["id"]})
    
    return positions


@hr_router.get("/positions/{position_id}", response_model=PositionResponse)
async def get_position(position_id: str, user: dict = Depends(get_current_user_dep())):
    """Get a single position"""
    db = get_db()
    
    pos = await db.positions.find_one({"id": position_id}, {"_id": 0})
    if not pos:
        raise HTTPException(status_code=404, detail="Position not found")
    
    if pos.get("department_id"):
        dept = await db.departments.find_one({"id": pos["department_id"]}, {"name": 1})
        pos["department_name"] = dept.get("name") if dept else None
    if pos.get("reporting_position_id"):
        parent = await db.positions.find_one({"id": pos["reporting_position_id"]}, {"title": 1})
        pos["reporting_position_title"] = parent.get("title") if parent else None
    pos["employee_count"] = await db.users.count_documents({"position_id": position_id})
    
    return pos


@hr_router.post("/positions", response_model=PositionResponse)
async def create_position(data: PositionCreate, user: dict = Depends(require_admin())):
    """Create a new position"""
    db = get_db()
    
    existing = await db.positions.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Position code already exists")
    
    pos_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    pos_doc = {
        "id": pos_id,
        **data.model_dump(),
        "level": data.level.value if hasattr(data.level, 'value') else data.level,
        "employee_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.positions.insert_one(pos_doc)
    del pos_doc["_id"]
    
    return pos_doc


@hr_router.put("/positions/{position_id}", response_model=PositionResponse)
async def update_position(position_id: str, data: PositionUpdate, user: dict = Depends(require_admin())):
    """Update a position"""
    db = get_db()
    
    existing = await db.positions.find_one({"id": position_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Position not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "level" in update_data and hasattr(update_data["level"], 'value'):
        update_data["level"] = update_data["level"].value
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.positions.update_one({"id": position_id}, {"$set": update_data})
    
    updated = await db.positions.find_one({"id": position_id}, {"_id": 0})
    return updated


@hr_router.delete("/positions/{position_id}")
async def delete_position(position_id: str, user: dict = Depends(require_admin())):
    """Delete a position (soft delete)"""
    db = get_db()
    
    employee_count = await db.users.count_documents({"position_id": position_id})
    if employee_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete position with {employee_count} employees")
    
    await db.positions.update_one(
        {"id": position_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Position deactivated"}


@hr_router.post("/seed-positions")
async def seed_positions(user: dict = Depends(require_admin())):
    """Seed default positions"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    count = await db.positions.count_documents({})
    if count > 0:
        return {"message": "Positions already exist", "count": count}
    
    created = 0
    for pos in DEFAULT_POSITIONS:
        pos_id = str(uuid.uuid4())
        pos_doc = {
            "id": pos_id,
            **pos,
            "is_active": True,
            "employee_count": 0,
            "created_at": now,
            "updated_at": now
        }
        await db.positions.insert_one(pos_doc)
        created += 1
    
    return {"success": True, "message": f"Created {created} positions", "count": created}


# ============== ENHANCED DEPARTMENTS ==============

@hr_router.get("/departments", response_model=List[DepartmentEnhancedResponse])
async def get_departments_enhanced(
    include_inactive: bool = False,
    user: dict = Depends(get_current_user_dep())
):
    """Get all departments with enhanced info"""
    db = get_db()
    
    query = {}
    if not include_inactive:
        query["is_active"] = {"$ne": False}
    
    depts = await db.departments.find(query, {"_id": 0}).to_list(100)
    
    for dept in depts:
        # Parent department
        if dept.get("parent_department_id"):
            parent = await db.departments.find_one({"id": dept["parent_department_id"]}, {"name": 1})
            dept["parent_department_name"] = parent.get("name") if parent else None
        # Department head
        if dept.get("department_head_id"):
            head = await db.users.find_one({"id": dept["department_head_id"]}, {"name": 1})
            dept["department_head_name"] = head.get("name") if head else None
        # Counts
        dept["member_count"] = await db.users.count_documents({"department_id": dept["id"]})
        dept["team_count"] = await db.teams.count_documents({"department_id": dept["id"]})
    
    return depts


@hr_router.put("/departments/{department_id}", response_model=DepartmentEnhancedResponse)
async def update_department_enhanced(
    department_id: str,
    data: DepartmentEnhancedUpdate,
    user: dict = Depends(require_admin())
):
    """Update a department with enhanced fields"""
    db = get_db()
    
    existing = await db.departments.find_one({"id": department_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Department not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.departments.update_one({"id": department_id}, {"$set": update_data})
    
    updated = await db.departments.find_one({"id": department_id}, {"_id": 0})
    
    # Enrich
    if updated.get("parent_department_id"):
        parent = await db.departments.find_one({"id": updated["parent_department_id"]}, {"name": 1})
        updated["parent_department_name"] = parent.get("name") if parent else None
    if updated.get("department_head_id"):
        head = await db.users.find_one({"id": updated["department_head_id"]}, {"name": 1})
        updated["department_head_name"] = head.get("name") if head else None
    updated["member_count"] = await db.users.count_documents({"department_id": department_id})
    updated["team_count"] = await db.teams.count_documents({"department_id": department_id})
    
    return updated


@hr_router.get("/departments/{department_id}/hierarchy")
async def get_department_hierarchy(department_id: str, user: dict = Depends(get_current_user_dep())):
    """Get department hierarchy (parent chain and children)"""
    db = get_db()
    
    dept = await db.departments.find_one({"id": department_id}, {"_id": 0})
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    # Get parent chain
    parent_chain = []
    current_id = dept.get("parent_department_id")
    visited = set()
    while current_id and current_id not in visited:
        visited.add(current_id)
        parent = await db.departments.find_one({"id": current_id}, {"_id": 0, "id": 1, "name": 1, "parent_department_id": 1})
        if not parent:
            break
        parent_chain.append(parent)
        current_id = parent.get("parent_department_id")
    
    # Get children
    children = await db.departments.find(
        {"parent_department_id": department_id},
        {"_id": 0, "id": 1, "name": 1, "code": 1}
    ).to_list(100)
    
    # Get teams in this department
    teams = await db.teams.find(
        {"department_id": department_id, "is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "name": 1}
    ).to_list(100)
    
    return {
        "department": dept,
        "parent_chain": parent_chain,
        "children": children,
        "teams": teams
    }


# ============== EMPLOYEES ==============

@hr_router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees(
    department_id: Optional[str] = None,
    grade_id: Optional[str] = None,
    reports_to: Optional[str] = None,
    status: Optional[str] = None,
    employment_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    skip: int = Query(default=0, ge=0),
    user: dict = Depends(get_current_user_dep())
):
    """Get all employees with filters, respecting data scope permissions"""
    from utils.permissions import apply_data_scope_filter
    
    db = get_db()
    user_id = user.get("id")
    
    query = {}
    
    # By default exclude deleted users
    if not status:
        query["status"] = {"$ne": "deleted"}
    
    if department_id:
        query["department_id"] = department_id
    if grade_id:
        query["grade_id"] = grade_id
    if reports_to:
        query["reports_to"] = reports_to
    if status:
        query["status"] = status
    if employment_type:
        query["employment_type"] = employment_type
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"employee_id": {"$regex": search, "$options": "i"}}
        ]
    
    # Apply data scope filtering based on user's permissions
    query = await apply_data_scope_filter(
        query, 
        user_id, 
        "hr",  # category
        "employees",  # module
        user_field="id",  # Employee's own ID
        department_field="department_id"
    )
    
    employees = await db.users.find(
        query, 
        {"_id": 0, "password": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    # Enrich employees
    for emp in employees:
        emp = await _enrich_employee(db, emp)
    
    return employees


@hr_router.get("/employees/{employee_id}", response_model=EmployeeDetailResponse)
async def get_employee(employee_id: str, user: dict = Depends(get_current_user_dep())):
    """Get a single employee with full details"""
    db = get_db()
    
    emp = await db.users.find_one({"id": employee_id}, {"_id": 0, "password": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    emp = await _enrich_employee(db, emp, full_details=True)
    return emp


@hr_router.post("/employees", response_model=EmployeeResponse)
async def create_employee(
    data: EmployeeCreate, 
    background_tasks: BackgroundTasks = None,
    user: dict = Depends(require_admin())
):
    """Create a new employee - automatically provisions tools based on templates"""
    db = get_db()
    
    # Check for duplicate email
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    emp_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate employee ID in format EMP-0001 if not provided
    employee_code = data.employee_id
    if not employee_code:
        # Get highest existing employee number
        last_emp = await db.users.find_one(
            {"employee_id": {"$regex": "^EMP-"}},
            sort=[("employee_id", -1)]
        )
        if last_emp and last_emp.get("employee_id"):
            try:
                last_num = int(last_emp["employee_id"].split("-")[1])
                employee_code = f"EMP-{str(last_num + 1).zfill(4)}"
            except Exception:
                count = await db.users.count_documents({})
                employee_code = f"EMP-{str(count + 1).zfill(4)}"
        else:
            employee_code = "EMP-0001"
    
    emp_doc = {
        "id": emp_id,
        **data.model_dump(exclude={"employment_type", "work_mode"}),
        "employee_id": employee_code,
        "employment_type": data.employment_type.value if hasattr(data.employment_type, 'value') else data.employment_type,
        "work_mode": data.work_mode.value if hasattr(data.work_mode, 'value') else data.work_mode,
        "status": "active",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(emp_doc)
    
    # Auto-provision tools for new employee based on templates
    await trigger_auto_provisioning(
        employee_id=emp_id,
        department_id=data.department_id,
        role_code=data.role if hasattr(data, 'role') else None,
        admin_user=user
    )
    
    emp_doc = await _enrich_employee(db, emp_doc)
    if "_id" in emp_doc:
        del emp_doc["_id"]
    return emp_doc


@hr_router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: str,
    data: EmployeeUpdate,
    background_tasks: BackgroundTasks = None,
    user: dict = Depends(require_admin())
):
    """Update an employee - triggers auto-provisioning/revocation on status changes"""
    db = get_db()
    
    existing = await db.users.find_one({"id": employee_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    old_status = existing.get("status")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Handle enum conversions
    if "employment_type" in update_data and hasattr(update_data["employment_type"], 'value'):
        update_data["employment_type"] = update_data["employment_type"].value
    if "status" in update_data and hasattr(update_data["status"], 'value'):
        update_data["status"] = update_data["status"].value
    
    new_status = update_data.get("status", old_status)
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": employee_id}, {"$set": update_data})
    
    # Handle auto-provisioning/revocation based on status change
    if new_status != old_status:
        # If changing to active status -> auto-provision tools
        if new_status in ["active", "confirmed"] and old_status not in ["active", "confirmed"]:
            await trigger_auto_provisioning(
                employee_id=employee_id,
                department_id=update_data.get("department_id") or existing.get("department_id"),
                role_code=existing.get("role"),
                admin_user=user
            )
        # If changing to terminated/inactive -> auto-revoke tools
        elif new_status in ["terminated", "inactive", "resigned"]:
            await trigger_auto_revocation(
                employee_id=employee_id,
                admin_user=user,
                reason=f"status_change_to_{new_status}"
            )
    
    updated = await db.users.find_one({"id": employee_id}, {"_id": 0, "password": 0})
    updated = await _enrich_employee(db, updated)
    return updated


@hr_router.delete("/employees/{employee_id}")
async def terminate_employee(
    employee_id: str, 
    exit_date: Optional[str] = None,
    exit_reason: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    user: dict = Depends(require_admin())
):
    """Terminate/deactivate an employee - automatically revokes all tool access"""
    db = get_db()
    
    existing = await db.users.find_one({"id": employee_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if employee has direct reports
    reports = await db.users.count_documents({"reports_to": employee_id})
    if reports > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot terminate employee with {reports} direct reports. Reassign them first."
        )
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        "status": "terminated",
        "is_active": False,
        "exit_date": exit_date or now.split("T")[0],
        "exit_reason": exit_reason,
        "updated_at": now
    }
    
    await db.users.update_one({"id": employee_id}, {"$set": update_data})
    
    # Auto-revoke all tool access for terminated employee
    revocation_result = await trigger_auto_revocation(
        employee_id=employee_id,
        admin_user=user,
        reason=f"employee_termination: {exit_reason or 'No reason provided'}"
    )
    
    return {
        "success": True, 
        "message": "Employee terminated",
        "tools_revoked": revocation_result.get("tools_revoked", 0)
    }


# ============== REPORTING STRUCTURE ==============

@hr_router.get("/employees/{employee_id}/reporting-chain")
async def get_reporting_chain(employee_id: str, user: dict = Depends(get_current_user_dep())):
    """Get the full reporting chain (managers up to CEO)"""
    db = get_db()
    
    chain = []
    current_id = employee_id
    visited = set()
    
    while current_id and current_id not in visited:
        visited.add(current_id)
        emp = await db.users.find_one(
            {"id": current_id}, 
            {"_id": 0, "id": 1, "name": 1, "title": 1, "department_id": 1, "grade_id": 1, "reports_to": 1, "avatar_url": 1}
        )
        if not emp:
            break
        
        # Enrich with names
        if emp.get("department_id"):
            dept = await db.departments.find_one({"id": emp["department_id"]}, {"name": 1})
            emp["department_name"] = dept.get("name") if dept else None
        if emp.get("grade_id"):
            grade = await db.grade_types.find_one({"id": emp["grade_id"]}, {"name": 1})
            emp["grade_name"] = grade.get("name") if grade else None
        
        chain.append(emp)
        current_id = emp.get("reports_to")
    
    return {"chain": chain, "depth": len(chain)}


@hr_router.get("/employees/{employee_id}/direct-reports")
async def get_direct_reports(employee_id: str, user: dict = Depends(get_current_user_dep())):
    """Get all direct reports of an employee"""
    db = get_db()
    
    reports = await db.users.find(
        {"reports_to": employee_id},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    for emp in reports:
        emp = await _enrich_employee(db, emp)
    
    return reports


class UpdateManagerRequest(BaseModel):
    manager_id: Optional[str] = None  # None to remove manager


@hr_router.put("/employees/{employee_id}/manager")
async def update_employee_manager(
    employee_id: str,
    data: UpdateManagerRequest,
    user: dict = Depends(require_admin())
):
    """Update an employee's reporting manager"""
    db = get_db()
    
    emp = await db.users.find_one({"id": employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    new_manager_id = data.manager_id
    
    if new_manager_id:
        manager = await db.users.find_one({"id": new_manager_id})
        if not manager:
            raise HTTPException(status_code=404, detail="Manager not found")
        
        # Prevent circular reporting
        if new_manager_id == employee_id:
            raise HTTPException(status_code=400, detail="Employee cannot report to themselves")
        
        # Check for circular chain
        current_id = new_manager_id
        visited = set()
        while current_id and current_id not in visited:
            if current_id == employee_id:
                raise HTTPException(status_code=400, detail="This would create a circular reporting chain")
            visited.add(current_id)
            mgr = await db.users.find_one({"id": current_id}, {"reports_to": 1})
            if not mgr:
                break
            current_id = mgr.get("reports_to")
    
    old_manager_id = emp.get("reports_to")
    
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"reports_to": new_manager_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Also update employees collection if exists
    await db.employees.update_one(
        {"id": employee_id},
        {"$set": {"reports_to": new_manager_id, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=False
    )
    
    # Get manager name for response
    manager_name = None
    if new_manager_id:
        mgr = await db.users.find_one({"id": new_manager_id}, {"name": 1})
        manager_name = mgr.get("name") if mgr else None
    
    return {
        "success": True,
        "employee_id": employee_id,
        "employee_name": emp.get("name"),
        "old_manager_id": old_manager_id,
        "new_manager_id": new_manager_id,
        "new_manager_name": manager_name,
        "message": f"Manager updated to {manager_name}" if manager_name else "Manager removed"
    }


# ============== ORG CHART ==============

@hr_router.get("/org-chart")
async def get_org_chart(
    root_id: Optional[str] = None,
    department_id: Optional[str] = None,
    user: dict = Depends(get_current_user_dep())
):
    """Get organization chart starting from root or specific node"""
    db = get_db()
    
    async def build_tree(manager_id: Optional[str], depth: int = 0) -> List[dict]:
        if depth > 10:  # Prevent infinite recursion
            return []
        
        query = {"reports_to": manager_id}
        if department_id and depth == 0:
            query["department_id"] = department_id
        
        employees = await db.users.find(
            query,
            {"_id": 0, "id": 1, "name": 1, "title": 1, "department_id": 1, "grade_id": 1, "avatar_url": 1, "email": 1}
        ).to_list(100)
        
        nodes = []
        for emp in employees:
            # Enrich
            if emp.get("department_id"):
                dept = await db.departments.find_one({"id": emp["department_id"]}, {"name": 1})
                emp["department_name"] = dept.get("name") if dept else None
            if emp.get("grade_id"):
                grade = await db.grade_types.find_one({"id": emp["grade_id"]}, {"name": 1})
                emp["grade_name"] = grade.get("name") if grade else None
            
            emp["children"] = await build_tree(emp["id"], depth + 1)
            nodes.append(emp)
        
        return nodes
    
    if root_id:
        # Start from specific employee
        root = await db.users.find_one(
            {"id": root_id},
            {"_id": 0, "id": 1, "name": 1, "title": 1, "department_id": 1, "grade_id": 1, "avatar_url": 1, "email": 1}
        )
        if not root:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        if root.get("department_id"):
            dept = await db.departments.find_one({"id": root["department_id"]}, {"name": 1})
            root["department_name"] = dept.get("name") if dept else None
        if root.get("grade_id"):
            grade = await db.grade_types.find_one({"id": root["grade_id"]}, {"name": 1})
            root["grade_name"] = grade.get("name") if grade else None
        
        root["children"] = await build_tree(root_id)
        return root
    else:
        # Start from top-level (employees with no manager)
        return await build_tree(None)


# ============== DEPARTMENT WISE STATS ==============

@hr_router.get("/stats/by-department")
async def get_stats_by_department(user: dict = Depends(get_current_user_dep())):
    """Get employee statistics grouped by department"""
    db = get_db()
    
    departments = await db.departments.find({"is_active": {"$ne": False}}, {"_id": 0}).to_list(100)
    
    stats = []
    for dept in departments:
        dept_id = dept["id"]
        
        # Count employees by status
        total = await db.users.count_documents({"department_id": dept_id})
        active = await db.users.count_documents({"department_id": dept_id, "status": "active"})
        on_notice = await db.users.count_documents({"department_id": dept_id, "status": "on_notice"})
        probation = await db.users.count_documents({"department_id": dept_id, "status": "probation"})
        
        # Get grade distribution
        grade_pipeline = [
            {"$match": {"department_id": dept_id}},
            {"$group": {"_id": "$grade_id", "count": {"$sum": 1}}}
        ]
        grade_dist = await db.users.aggregate(grade_pipeline).to_list(100)
        
        # Enrich grade names
        grade_breakdown = {}
        for g in grade_dist:
            if g["_id"]:
                grade = await db.grade_types.find_one({"id": g["_id"]}, {"name": 1})
                grade_name = grade.get("name") if grade else "Unknown"
                grade_breakdown[grade_name] = g["count"]
        
        stats.append({
            "department_id": dept_id,
            "department_name": dept["name"],
            "department_code": dept["code"],
            "total_employees": total,
            "active": active,
            "on_notice": on_notice,
            "probation": probation,
            "grade_breakdown": grade_breakdown
        })
    
    return stats


@hr_router.get("/stats/by-grade")
async def get_stats_by_grade(user: dict = Depends(get_current_user_dep())):
    """Get employee statistics grouped by grade"""
    db = get_db()
    
    grades = await db.grade_types.find({"is_active": {"$ne": False}}, {"_id": 0}).sort("level", 1).to_list(100)
    
    stats = []
    for grade in grades:
        grade_id = grade["id"]
        
        total = await db.users.count_documents({"grade_id": grade_id})
        
        # Get department distribution
        dept_pipeline = [
            {"$match": {"grade_id": grade_id}},
            {"$group": {"_id": "$department_id", "count": {"$sum": 1}}}
        ]
        dept_dist = await db.users.aggregate(dept_pipeline).to_list(100)
        
        dept_breakdown = {}
        for d in dept_dist:
            if d["_id"]:
                dept = await db.departments.find_one({"id": d["_id"]}, {"name": 1})
                dept_name = dept.get("name") if dept else "Unknown"
                dept_breakdown[dept_name] = d["count"]
        
        stats.append({
            "grade_id": grade_id,
            "grade_name": grade["name"],
            "grade_code": grade["code"],
            "category": grade.get("category"),
            "level": grade.get("level"),
            "total_employees": total,
            "department_breakdown": dept_breakdown
        })
    
    return stats


@hr_router.get("/stats/overview")
async def get_hr_overview(user: dict = Depends(get_current_user_dep())):
    """Get overall HR statistics"""
    db = get_db()
    
    total_employees = await db.users.count_documents({})
    active = await db.users.count_documents({"status": "active"})
    on_notice = await db.users.count_documents({"status": "on_notice"})
    probation = await db.users.count_documents({"status": "probation"})
    on_leave = await db.users.count_documents({"status": "on_leave"})
    
    # Employment type breakdown
    full_time = await db.users.count_documents({"employment_type": "full_time"})
    part_time = await db.users.count_documents({"employment_type": "part_time"})
    contract = await db.users.count_documents({"employment_type": "contract"})
    intern = await db.users.count_documents({"employment_type": "intern"})
    
    # Department count
    dept_count = await db.departments.count_documents({"is_active": {"$ne": False}})
    
    # Grade count
    grade_count = await db.grade_types.count_documents({"is_active": {"$ne": False}})
    
    return {
        "total_employees": total_employees,
        "status_breakdown": {
            "active": active,
            "on_notice": on_notice,
            "probation": probation,
            "on_leave": on_leave,
            "terminated": total_employees - active - on_notice - probation - on_leave
        },
        "employment_type_breakdown": {
            "full_time": full_time,
            "part_time": part_time,
            "contract": contract,
            "intern": intern
        },
        "total_departments": dept_count,
        "total_grades": grade_count
    }


# ============== SEED DATA ==============

@hr_router.post("/seed-grades")
async def seed_grade_types(user: dict = Depends(require_admin())):
    """Seed default grade types"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if already seeded
    count = await db.grade_types.count_documents({})
    if count > 0:
        return {"message": "Grade types already exist", "count": count}
    
    created = 0
    for grade in DEFAULT_GRADE_TYPES:
        grade_id = str(uuid.uuid4())
        grade_doc = {
            "id": grade_id,
            **grade,
            "is_active": True,
            "employee_count": 0,
            "created_at": now,
            "updated_at": now
        }
        await db.grade_types.insert_one(grade_doc)
        created += 1
    
    return {"success": True, "message": f"Created {created} grade types", "count": created}


@hr_router.post("/reset-and-seed")
async def reset_and_seed_hr_data(user: dict = Depends(require_admin())):
    """Reset and seed all HR data (grades and departments)"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    # Clear existing grades
    await db.grade_types.delete_many({})
    
    # Seed new grades
    grades_created = 0
    for grade in DEFAULT_GRADE_TYPES:
        grade_id = str(uuid.uuid4())
        grade_doc = {
            "id": grade_id,
            **grade,
            "is_active": True,
            "employee_count": 0,
            "created_at": now,
            "updated_at": now
        }
        await db.grade_types.insert_one(grade_doc)
        grades_created += 1
    
    # Define company departments
    company_departments = [
        {"name": "Warehouse & Inventory", "code": "warehouse", "description": "Warehouse operations and inventory management", "color": "#795548", "icon": "Package"},
        {"name": "Fulfilment", "code": "fulfilment", "description": "Order fulfilment operations", "color": "#FF9800", "icon": "Box"},
        {"name": "Delivery", "code": "delivery", "description": "Delivery and logistics", "color": "#4CAF50", "icon": "Truck"},
        {"name": "Stylist", "code": "stylist", "description": "Fashion styling team", "color": "#E91E63", "icon": "Sparkles"},
        {"name": "Marketing & Growth", "code": "marketing", "description": "Marketing and growth initiatives", "color": "#9C27B0", "icon": "Target"},
        {"name": "Customer Support", "code": "customer_support", "description": "Customer service and support", "color": "#00BCD4", "icon": "Headphones"},
        {"name": "Catalogue Management", "code": "catalogue", "description": "Product catalogue management", "color": "#3F51B5", "icon": "BookOpen"},
        {"name": "Product Design", "code": "product_design", "description": "Product design and development", "color": "#FF5722", "icon": "Palette"},
        {"name": "Sourcing & Procurement", "code": "sourcing", "description": "Sourcing and procurement operations", "color": "#607D8B", "icon": "Search"},
        {"name": "Assortment Planning", "code": "assortment", "description": "Product assortment planning", "color": "#8BC34A", "icon": "LayoutGrid"},
        {"name": "Merchandise Planning", "code": "merchandise", "description": "Merchandise planning and strategy", "color": "#673AB7", "icon": "Calendar"},
        {"name": "Finance & Accounts", "code": "finance", "description": "Finance and accounting", "color": "#2196F3", "icon": "DollarSign"},
        {"name": "HR & Admin", "code": "admin", "description": "Human resources and administration", "color": "#8B7355", "icon": "Users"},
    ]
    
    # Clear and reseed departments
    await db.departments.delete_many({})
    
    depts_created = 0
    for dept in company_departments:
        dept_id = str(uuid.uuid4())
        await db.departments.insert_one({
            "id": dept_id,
            **dept,
            "is_active": True,
            "member_count": 0,
            "created_at": now,
            "updated_at": now
        })
        depts_created += 1
    
    # Clear user department and grade assignments (optional - keeps users but clears assignments)
    await db.users.update_many({}, {"$unset": {"department_id": "", "grade_id": ""}})
    
    return {
        "success": True,
        "message": f"Reset complete. Created {grades_created} grades and {depts_created} departments",
        "grades_created": grades_created,
        "departments_created": depts_created
    }


# ============== HELPER FUNCTIONS ==============

async def _enrich_employee(db, emp: dict, full_details: bool = False) -> dict:
    """Enrich employee data with related names and counts"""
    
    # Department name
    if emp.get("department_id"):
        dept = await db.departments.find_one({"id": emp["department_id"]}, {"name": 1})
        emp["department_name"] = dept.get("name") if dept else None
    
    # Team name
    if emp.get("team_id"):
        team = await db.teams.find_one({"id": emp["team_id"]}, {"name": 1})
        emp["team_name"] = team.get("name") if team else None
    
    # Position title
    if emp.get("position_id"):
        pos = await db.positions.find_one({"id": emp["position_id"]}, {"title": 1})
        emp["position_title"] = pos.get("title") if pos else None
    
    # Role name
    if emp.get("role_id"):
        role = await db.roles.find_one({"id": emp["role_id"]}, {"name": 1})
        emp["role_name"] = role.get("name") if role else None
    
    # Grade name
    if emp.get("grade_id"):
        grade = await db.grade_types.find_one({"id": emp["grade_id"]}, {"name": 1})
        emp["grade_name"] = grade.get("name") if grade else None
    
    # Primary Manager name
    if emp.get("reports_to"):
        manager = await db.users.find_one({"id": emp["reports_to"]}, {"name": 1})
        emp["manager_name"] = manager.get("name") if manager else None
    
    # Secondary Manager name
    if emp.get("secondary_manager_id"):
        sec_mgr = await db.users.find_one({"id": emp["secondary_manager_id"]}, {"name": 1})
        emp["secondary_manager_name"] = sec_mgr.get("name") if sec_mgr else None
    
    # Direct reports
    direct_reports = await db.users.find({"reports_to": emp["id"]}, {"id": 1}).to_list(100)
    emp["direct_reports"] = [r["id"] for r in direct_reports]
    emp["direct_reports_count"] = len(direct_reports)
    
    # Calculate years of service
    if emp.get("joining_date"):
        try:
            join_date = datetime.fromisoformat(emp["joining_date"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            emp["years_of_service"] = round((now - join_date).days / 365.25, 1)
        except Exception:
            emp["years_of_service"] = None
    
    return emp



# ============== MY TEAM - DIRECT REPORTS ==============

@hr_router.get("/my-team")
async def get_my_team(user: dict = Depends(get_current_user_dep())):
    """Get the current user's direct reports (employees who report to them)"""
    db = get_db()
    
    user_id = user.get("id")
    
    # Find all employees who report to this user
    direct_reports = await db.users.find(
        {"reports_to": user_id, "status": {"$ne": "inactive"}},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    # Enrich with department and grade info
    for emp in direct_reports:
        if emp.get("department_id"):
            dept = await db.departments.find_one({"id": emp["department_id"]}, {"name": 1})
            emp["department_name"] = dept.get("name") if dept else None
        if emp.get("grade_id"):
            grade = await db.grade_types.find_one({"id": emp["grade_id"]}, {"name": 1})
            emp["grade_name"] = grade.get("name") if grade else None
        
        # Count their direct reports
        emp["direct_reports_count"] = await db.users.count_documents({"reports_to": emp["id"]})
    
    # Sort by name
    direct_reports.sort(key=lambda x: x.get("name", "").lower())
    
    return {
        "manager_id": user_id,
        "manager_name": user.get("name"),
        "direct_reports_count": len(direct_reports),
        "direct_reports": direct_reports
    }


@hr_router.get("/my-team/tree")
async def get_my_team_tree(
    depth: int = Query(default=3, ge=1, le=10),
    user: dict = Depends(get_current_user_dep())
):
    """Get the current user's full reporting tree (all levels below them)"""
    db = get_db()
    
    user_id = user.get("id")
    
    async def build_subtree(manager_id: str, current_depth: int) -> List[dict]:
        if current_depth > depth:
            return []
        
        reports = await db.users.find(
            {"reports_to": manager_id, "status": {"$ne": "inactive"}},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "title": 1, "designation": 1, 
             "department_id": 1, "avatar_url": 1, "status": 1}
        ).to_list(100)
        
        for emp in reports:
            if emp.get("department_id"):
                dept = await db.departments.find_one({"id": emp["department_id"]}, {"name": 1})
                emp["department_name"] = dept.get("name") if dept else None
            emp["children"] = await build_subtree(emp["id"], current_depth + 1)
            emp["direct_reports_count"] = len(emp["children"])
        
        return reports
    
    tree = await build_subtree(user_id, 1)
    
    # Count total team members (all levels)
    def count_all(nodes):
        total = len(nodes)
        for node in nodes:
            total += count_all(node.get("children", []))
        return total
    
    return {
        "manager_id": user_id,
        "manager_name": user.get("name"),
        "total_team_size": count_all(tree),
        "direct_reports_count": len(tree),
        "tree": tree
    }


@hr_router.get("/managers")
async def get_all_managers(user: dict = Depends(get_current_user_dep())):
    """Get list of all users who have direct reports (managers)"""
    db = get_db()
    
    # Find all unique manager IDs
    pipeline = [
        {"$match": {"reports_to": {"$ne": None}, "status": {"$ne": "inactive"}}},
        {"$group": {"_id": "$reports_to", "count": {"$sum": 1}}}
    ]
    
    manager_stats = await db.users.aggregate(pipeline).to_list(200)
    manager_ids = [m["_id"] for m in manager_stats]
    manager_report_counts = {m["_id"]: m["count"] for m in manager_stats}
    
    # Fetch manager details
    managers = await db.users.find(
        {"id": {"$in": manager_ids}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "department_id": 1, "title": 1, "designation": 1, "avatar_url": 1}
    ).to_list(200)
    
    # Enrich with department names and report counts
    for mgr in managers:
        mgr["direct_reports_count"] = manager_report_counts.get(mgr["id"], 0)
        if mgr.get("department_id"):
            dept = await db.departments.find_one({"id": mgr["department_id"]}, {"name": 1})
            mgr["department_name"] = dept.get("name") if dept else None
    
    # Sort by number of direct reports (descending)
    managers.sort(key=lambda x: x.get("direct_reports_count", 0), reverse=True)
    
    return {
        "total_managers": len(managers),
        "managers": managers
    }
