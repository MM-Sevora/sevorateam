"""
HR Routes - Employee Database, Grade Types, Reporting Structure, Org Chart
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from models.hr import (
    GradeTypeCreate, GradeTypeUpdate, GradeTypeResponse,
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeDetailResponse,
    ReportingLineCreate, ReportingLineResponse,
    OrgChartNode, DEFAULT_GRADE_TYPES
)

hr_router = APIRouter(prefix="/hr", tags=["HR - Employee Management"])


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
    """Get all employees with filters"""
    db = get_db()
    
    query = {}
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
async def create_employee(data: EmployeeCreate, user: dict = Depends(require_admin())):
    """Create a new employee"""
    db = get_db()
    
    # Check for duplicate email
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    emp_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate employee ID if not provided
    employee_code = data.employee_id
    if not employee_code:
        count = await db.users.count_documents({})
        employee_code = f"EMP{str(count + 1).zfill(4)}"
    
    emp_doc = {
        "id": emp_id,
        **data.model_dump(exclude={"employment_type"}),
        "employee_id": employee_code,
        "employment_type": data.employment_type.value if hasattr(data.employment_type, 'value') else data.employment_type,
        "status": "active",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(emp_doc)
    
    emp_doc = await _enrich_employee(db, emp_doc)
    if "_id" in emp_doc:
        del emp_doc["_id"]
    return emp_doc


@hr_router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: str,
    data: EmployeeUpdate,
    user: dict = Depends(require_admin())
):
    """Update an employee"""
    db = get_db()
    
    existing = await db.users.find_one({"id": employee_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Handle enum conversions
    if "employment_type" in update_data and hasattr(update_data["employment_type"], 'value'):
        update_data["employment_type"] = update_data["employment_type"].value
    if "status" in update_data and hasattr(update_data["status"], 'value'):
        update_data["status"] = update_data["status"].value
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": employee_id}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": employee_id}, {"_id": 0, "password": 0})
    updated = await _enrich_employee(db, updated)
    return updated


@hr_router.delete("/employees/{employee_id}")
async def terminate_employee(
    employee_id: str, 
    exit_date: Optional[str] = None,
    exit_reason: Optional[str] = None,
    user: dict = Depends(require_admin())
):
    """Terminate/deactivate an employee"""
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
    
    return {"success": True, "message": "Employee terminated"}


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


@hr_router.put("/employees/{employee_id}/manager")
async def update_manager(
    employee_id: str,
    new_manager_id: Optional[str] = None,
    user: dict = Depends(require_admin())
):
    """Update an employee's reporting manager"""
    db = get_db()
    
    emp = await db.users.find_one({"id": employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
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
    
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {"reports_to": new_manager_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Manager updated"}


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
    
    # Role name
    if emp.get("role_id"):
        role = await db.roles.find_one({"id": emp["role_id"]}, {"name": 1})
        emp["role_name"] = role.get("name") if role else None
    
    # Grade name
    if emp.get("grade_id"):
        grade = await db.grade_types.find_one({"id": emp["grade_id"]}, {"name": 1})
        emp["grade_name"] = grade.get("name") if grade else None
    
    # Manager name
    if emp.get("reports_to"):
        manager = await db.users.find_one({"id": emp["reports_to"]}, {"name": 1})
        emp["manager_name"] = manager.get("name") if manager else None
    
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
        except:
            emp["years_of_service"] = None
    
    return emp
