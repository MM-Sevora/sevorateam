"""
HR Routes v2 - Using separate employees collection
Clean Architecture: Users = Auth, Employees = HR Data
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from models.employee import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeDetailResponse,
    EmploymentType, EmploymentStatus, WorkMode
)

hr_v2_router = APIRouter(prefix="/hr/v2", tags=["HR v2 - Clean Architecture"])


def get_db():
    from server import db
    return db


def require_admin():
    from server import require_department
    return require_department(["admin"])


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


async def _enrich_employee(db, employee: dict, user: dict = None) -> dict:
    """Enrich employee with related data from other collections"""
    
    # Handle employee_id vs employee_code (backward compatibility)
    if not employee.get("employee_code") and employee.get("employee_id"):
        employee["employee_code"] = employee["employee_id"]
    
    # Get user data if not provided
    if not user and employee.get("user_id"):
        user = await db.users.find_one(
            {"id": employee["user_id"]}, 
            {"_id": 0, "name": 1, "email": 1, "avatar_url": 1, "last_login": 1}
        )
    
    if user:
        employee["name"] = user.get("name", "Unknown")
        employee["email"] = user.get("email", "")
        employee["avatar_url"] = user.get("avatar_url")
        employee["last_login"] = user.get("last_login")
    
    # Department
    if employee.get("department_id"):
        dept = await db.departments.find_one({"id": employee["department_id"]}, {"name": 1})
        employee["department_name"] = dept.get("name") if dept else None
    
    # Team
    if employee.get("team_id"):
        team = await db.teams.find_one({"id": employee["team_id"]}, {"name": 1})
        employee["team_name"] = team.get("name") if team else None
    
    # Position
    if employee.get("position_id"):
        pos = await db.positions.find_one({"id": employee["position_id"]}, {"title": 1})
        employee["position_title"] = pos.get("title") if pos else None
    
    # Grade
    if employee.get("grade_id"):
        grade = await db.grade_types.find_one({"id": employee["grade_id"]}, {"name": 1})
        employee["grade_name"] = grade.get("name") if grade else None
    
    # Manager (reports_to is employee ID)
    if employee.get("reports_to"):
        manager_emp = await db.employees.find_one({"id": employee["reports_to"]}, {"user_id": 1})
        if manager_emp:
            manager_user = await db.users.find_one({"id": manager_emp["user_id"]}, {"name": 1})
            employee["manager_name"] = manager_user.get("name") if manager_user else None
    
    # Secondary Manager
    if employee.get("secondary_manager_id"):
        sec_manager_emp = await db.employees.find_one({"id": employee["secondary_manager_id"]}, {"user_id": 1})
        if sec_manager_emp:
            sec_manager_user = await db.users.find_one({"id": sec_manager_emp["user_id"]}, {"name": 1})
            employee["secondary_manager_name"] = sec_manager_user.get("name") if sec_manager_user else None
    
    # Direct reports count
    employee["direct_reports_count"] = await db.employees.count_documents({"reports_to": employee["id"]})
    
    # Years of service
    if employee.get("joining_date"):
        try:
            join_date = datetime.fromisoformat(employee["joining_date"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            years = (now - join_date).days / 365.25
            employee["years_of_service"] = round(years, 1)
        except Exception:
            pass
    
    return employee


# ============== EMPLOYEES ==============

@hr_v2_router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees_v2(
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
    """Get all employees with filters (from employees collection). Respects data scope."""
    from utils.permissions import get_data_scope_query
    
    db = get_db()
    
    # Build query for employees collection
    filter_query = {}
    if department_id:
        filter_query["department_id"] = department_id
    if grade_id:
        filter_query["grade_id"] = grade_id
    if reports_to:
        filter_query["reports_to"] = reports_to
    if status:
        filter_query["status"] = status
    if employment_type:
        filter_query["employment_type"] = employment_type
    
    # For search, we need to search across users and employees
    if search:
        # First find matching users
        user_matches = await db.users.find(
            {"$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]},
            {"id": 1}
        ).to_list(500)
        user_ids = [u["id"] for u in user_matches]
        
        # Also search by employee_code
        filter_query["$or"] = [
            {"user_id": {"$in": user_ids}},
            {"employee_code": {"$regex": search, "$options": "i"}}
        ]
    
    # Apply data scope filtering
    query = get_data_scope_query(user, "hr", filter_query)
    
    employees = await db.employees.find(
        query, 
        {"_id": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    # Enrich employees
    enriched = []
    for emp in employees:
        emp = await _enrich_employee(db, emp)
        enriched.append(emp)
    
    return enriched


@hr_v2_router.get("/employees/{employee_id}", response_model=EmployeeDetailResponse)
async def get_employee_v2(employee_id: str, user: dict = Depends(get_current_user_dep())):
    """Get a single employee with full details"""
    db = get_db()
    
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    emp = await _enrich_employee(db, emp)
    
    # Add detailed info
    emp["has_bank_details"] = bool(emp.get("bank_account_number"))
    
    # Get direct reports
    reports = await db.employees.find(
        {"reports_to": employee_id},
        {"_id": 0, "id": 1, "user_id": 1, "employee_code": 1, "designation": 1}
    ).to_list(50)
    
    direct_reports = []
    for r in reports:
        r_user = await db.users.find_one({"id": r["user_id"]}, {"name": 1, "avatar_url": 1})
        direct_reports.append({
            "id": r["id"],
            "name": r_user.get("name") if r_user else "Unknown",
            "employee_code": r.get("employee_code"),
            "designation": r.get("designation"),
            "avatar_url": r_user.get("avatar_url") if r_user else None
        })
    emp["direct_reports"] = direct_reports
    
    # Get reporting chain
    chain = []
    current_id = emp.get("reports_to")
    visited = set()
    while current_id and current_id not in visited and len(chain) < 10:
        visited.add(current_id)
        manager = await db.employees.find_one({"id": current_id}, {"_id": 0})
        if not manager:
            break
        manager_user = await db.users.find_one({"id": manager["user_id"]}, {"name": 1, "avatar_url": 1})
        chain.append({
            "id": manager["id"],
            "name": manager_user.get("name") if manager_user else "Unknown",
            "employee_code": manager.get("employee_code"),
            "designation": manager.get("designation"),
            "avatar_url": manager_user.get("avatar_url") if manager_user else None
        })
        current_id = manager.get("reports_to")
    emp["reporting_chain"] = chain
    
    return emp


@hr_v2_router.get("/employees/by-user/{user_id}", response_model=EmployeeResponse)
async def get_employee_by_user_id(user_id: str, user: dict = Depends(get_current_user_dep())):
    """Get employee record by user ID"""
    db = get_db()
    
    emp = await db.employees.find_one({"user_id": user_id}, {"_id": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="No employee record found for this user")
    
    emp = await _enrich_employee(db, emp)
    return emp


@hr_v2_router.post("/employees", response_model=EmployeeResponse)
async def create_employee_v2(data: EmployeeCreate, user: dict = Depends(require_admin())):
    """Create a new employee record (links to existing user)"""
    db = get_db()
    
    # Verify user exists
    existing_user = await db.users.find_one({"id": data.user_id})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if employee record already exists for this user
    existing_emp = await db.employees.find_one({"user_id": data.user_id})
    if existing_emp:
        raise HTTPException(status_code=400, detail="Employee record already exists for this user")
    
    emp_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate employee code if not provided
    employee_code = data.employee_code
    if not employee_code:
        last_emp = await db.employees.find_one(
            {"employee_code": {"$regex": "^EMP-"}},
            sort=[("employee_code", -1)]
        )
        if last_emp and last_emp.get("employee_code"):
            try:
                last_num = int(last_emp["employee_code"].split("-")[1])
                employee_code = f"EMP-{str(last_num + 1).zfill(4)}"
            except Exception:
                count = await db.employees.count_documents({})
                employee_code = f"EMP-{str(count + 1).zfill(4)}"
        else:
            employee_code = "EMP-0001"
    
    emp_doc = {
        "id": emp_id,
        "user_id": data.user_id,
        "employee_code": employee_code,
        **{k: v for k, v in data.model_dump().items() if k not in ["user_id", "employee_code"] and v is not None},
        "status": "active",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    # Handle enum conversions
    if "employment_type" in emp_doc and hasattr(emp_doc["employment_type"], 'value'):
        emp_doc["employment_type"] = emp_doc["employment_type"].value
    if "work_mode" in emp_doc and hasattr(emp_doc["work_mode"], 'value'):
        emp_doc["work_mode"] = emp_doc["work_mode"].value
    
    await db.employees.insert_one(emp_doc)
    
    # Update user with employee reference
    await db.users.update_one(
        {"id": data.user_id},
        {"$set": {"employee_id_ref": emp_id}}
    )
    
    emp_doc = await _enrich_employee(db, emp_doc, existing_user)
    if "_id" in emp_doc:
        del emp_doc["_id"]
    
    return emp_doc


@hr_v2_router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee_v2(
    employee_id: str,
    data: EmployeeUpdate,
    user: dict = Depends(require_admin())
):
    """Update an employee's HR data"""
    db = get_db()
    
    existing = await db.employees.find_one({"id": employee_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Handle enum conversions
    if "employment_type" in update_data and hasattr(update_data["employment_type"], 'value'):
        update_data["employment_type"] = update_data["employment_type"].value
    if "status" in update_data and hasattr(update_data["status"], 'value'):
        update_data["status"] = update_data["status"].value
    if "work_mode" in update_data and hasattr(update_data["work_mode"], 'value'):
        update_data["work_mode"] = update_data["work_mode"].value
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.employees.update_one({"id": employee_id}, {"$set": update_data})
    
    updated = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    updated = await _enrich_employee(db, updated)
    return updated


@hr_v2_router.delete("/employees/{employee_id}")
async def terminate_employee_v2(
    employee_id: str, 
    exit_date: Optional[str] = None,
    exit_reason: Optional[str] = None,
    user: dict = Depends(require_admin())
):
    """Terminate/deactivate an employee"""
    db = get_db()
    
    existing = await db.employees.find_one({"id": employee_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if employee has direct reports
    reports = await db.employees.count_documents({"reports_to": employee_id})
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
    
    await db.employees.update_one({"id": employee_id}, {"$set": update_data})
    
    return {"success": True, "message": "Employee terminated"}


@hr_v2_router.post("/employees/bulk/delete")
async def bulk_terminate_employees(data: dict, user: dict = Depends(require_admin())):
    """Bulk terminate employees"""
    db = get_db()
    
    employee_ids = data.get("employee_ids", [])
    exit_reason = data.get("exit_reason", "Bulk termination")
    
    if not employee_ids:
        raise HTTPException(status_code=400, detail="No employee IDs provided")
    
    # Check for direct reports
    for emp_id in employee_ids:
        reports_count = await db.employees.count_documents({"reports_to": emp_id})
        if reports_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot terminate employee - has {reports_count} direct reports. Reassign them first."
            )
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.employees.update_many(
        {"id": {"$in": employee_ids}},
        {"$set": {
            "status": "terminated",
            "is_active": False,
            "exit_date": now.split("T")[0],
            "exit_reason": exit_reason,
            "updated_at": now
        }}
    )
    
    return {"success": True, "message": f"{result.modified_count} employees terminated"}


@hr_v2_router.post("/employees/bulk/status")
async def bulk_update_employee_status(data: dict, user: dict = Depends(require_admin())):
    """Bulk update employee status"""
    db = get_db()
    
    employee_ids = data.get("employee_ids", [])
    new_status = data.get("status")
    
    if not employee_ids:
        raise HTTPException(status_code=400, detail="No employee IDs provided")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
    if new_status not in ["active", "inactive", "on_leave", "probation"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    now = datetime.now(timezone.utc).isoformat()
    is_active = new_status in ["active", "on_leave", "probation"]
    
    result = await db.employees.update_many(
        {"id": {"$in": employee_ids}},
        {"$set": {
            "status": new_status,
            "is_active": is_active,
            "updated_at": now
        }}
    )
    
    return {"success": True, "message": f"{result.modified_count} employees updated to {new_status}"}


# ============== REPORTING STRUCTURE ==============

@hr_v2_router.get("/employees/{employee_id}/reporting-chain")
async def get_reporting_chain_v2(employee_id: str, user: dict = Depends(get_current_user_dep())):
    """Get the full reporting chain (managers up to CEO)"""
    db = get_db()
    
    chain = []
    current_id = employee_id
    visited = set()
    
    while current_id and current_id not in visited:
        visited.add(current_id)
        emp = await db.employees.find_one({"id": current_id}, {"_id": 0})
        if not emp:
            break
        
        emp_user = await db.users.find_one(
            {"id": emp["user_id"]}, 
            {"name": 1, "avatar_url": 1}
        )
        
        chain_item = {
            "id": emp["id"],
            "employee_code": emp.get("employee_code"),
            "name": emp_user.get("name") if emp_user else "Unknown",
            "avatar_url": emp_user.get("avatar_url") if emp_user else None,
            "designation": emp.get("designation"),
            "department_id": emp.get("department_id"),
            "grade_id": emp.get("grade_id")
        }
        
        # Enrich with names
        if emp.get("department_id"):
            dept = await db.departments.find_one({"id": emp["department_id"]}, {"name": 1})
            chain_item["department_name"] = dept.get("name") if dept else None
        if emp.get("grade_id"):
            grade = await db.grade_types.find_one({"id": emp["grade_id"]}, {"name": 1})
            chain_item["grade_name"] = grade.get("name") if grade else None
        
        chain.append(chain_item)
        current_id = emp.get("reports_to")
    
    return {"chain": chain, "depth": len(chain)}


@hr_v2_router.get("/employees/{employee_id}/direct-reports")
async def get_direct_reports_v2(employee_id: str, user: dict = Depends(get_current_user_dep())):
    """Get all direct reports of an employee"""
    db = get_db()
    
    reports = await db.employees.find(
        {"reports_to": employee_id},
        {"_id": 0}
    ).to_list(100)
    
    enriched = []
    for emp in reports:
        emp = await _enrich_employee(db, emp)
        enriched.append(emp)
    
    return enriched


# ============== ORG CHART ==============

@hr_v2_router.get("/org-chart")
async def get_org_chart_v2(
    root_employee_id: Optional[str] = None,
    user: dict = Depends(get_current_user_dep())
):
    """Get organization chart starting from a root employee (or CEO if not specified)"""
    db = get_db()
    
    # Find root - either specified or employee without manager
    if root_employee_id:
        root = await db.employees.find_one({"id": root_employee_id}, {"_id": 0})
    else:
        root = await db.employees.find_one(
            {"$or": [{"reports_to": None}, {"reports_to": {"$exists": False}}]},
            {"_id": 0}
        )
    
    if not root:
        # Return all employees if no hierarchy found
        all_employees = await db.employees.find({}, {"_id": 0}).to_list(500)
        result = []
        for emp in all_employees:
            emp = await _enrich_employee(db, emp)
            result.append(emp)
        return {"nodes": result, "has_hierarchy": False}
    
    async def build_tree(employee_id: str, depth: int = 0) -> dict:
        if depth > 10:  # Prevent infinite recursion
            return None
        
        emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
        if not emp:
            return None
        
        emp = await _enrich_employee(db, emp)
        
        # Get children
        children_cursor = db.employees.find({"reports_to": employee_id}, {"_id": 0})
        children = await children_cursor.to_list(100)
        
        emp["children"] = []
        for child in children:
            child_tree = await build_tree(child["id"], depth + 1)
            if child_tree:
                emp["children"].append(child_tree)
        
        return emp
    
    tree = await build_tree(root["id"])
    return {"root": tree, "has_hierarchy": True}


# ============== STATS ==============

@hr_v2_router.get("/stats/overview")
async def get_hr_stats_overview_v2(user: dict = Depends(get_current_user_dep())):
    """Get HR overview statistics"""
    db = get_db()
    
    total = await db.employees.count_documents({})
    active = await db.employees.count_documents({"status": "active"})
    probation = await db.employees.count_documents({"status": "probation"})
    notice = await db.employees.count_documents({"status": "notice_period"})
    
    # New this month
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    new_this_month = await db.employees.count_documents({
        "created_at": {"$gte": month_start}
    })
    
    # Department count
    dept_count = await db.departments.count_documents({"is_active": {"$ne": False}})
    
    return {
        "total_employees": total,
        "active_employees": active,
        "probation": probation,
        "notice_period": notice,
        "new_this_month": new_this_month,
        "total_departments": dept_count
    }


@hr_v2_router.get("/stats/by-department")
async def get_stats_by_department_v2(user: dict = Depends(get_current_user_dep())):
    """Get employee count by department"""
    db = get_db()
    
    departments = await db.departments.find(
        {"is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "name": 1, "code": 1}
    ).to_list(100)
    
    result = []
    for dept in departments:
        count = await db.employees.count_documents({
            "department_id": dept["id"],
            "status": {"$in": ["active", "probation", "confirmed"]}
        })
        result.append({
            "department_id": dept["id"],
            "department_name": dept["name"],
            "department_code": dept.get("code"),
            "employee_count": count
        })
    
    return sorted(result, key=lambda x: x["employee_count"], reverse=True)


@hr_v2_router.get("/stats/by-grade")
async def get_stats_by_grade_v2(user: dict = Depends(get_current_user_dep())):
    """Get employee count by grade"""
    db = get_db()
    
    grades = await db.grade_types.find(
        {"is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "name": 1, "code": 1, "level": 1}
    ).sort("level", 1).to_list(100)
    
    result = []
    for grade in grades:
        count = await db.employees.count_documents({
            "grade_id": grade["id"],
            "status": {"$in": ["active", "probation", "confirmed"]}
        })
        result.append({
            "grade_id": grade["id"],
            "grade_name": grade["name"],
            "grade_code": grade.get("code"),
            "level": grade.get("level"),
            "employee_count": count
        })
    
    return result
