"""
Goals & Objectives Module - API Routes
Handles Strategic Goals, Financial Years, Quarters, and Objectives
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone, date
from bson import ObjectId
import os

from models.goals import (
    FiscalYearCreate, FiscalYearUpdate, FiscalYearResponse,
    QuarterCreate, QuarterUpdate, QuarterResponse,
    StrategicGoalCreate, StrategicGoalUpdate, StrategicGoalResponse,
    ObjectiveCreate, ObjectiveUpdate, ObjectiveResponse,
    KeyResultCreate, KeyResultUpdate, KeyResultResponse,
    ObjectiveProgressUpdateCreate, ObjectiveProgressUpdateResponse,
    GoalsDashboardResponse,
    GoalStatus, ObjectiveStatus, FiscalYearStatus
)

router = APIRouter(prefix="/goals", tags=["Goals & Objectives"])

# Database connection - will be set from server.py
db = None

def set_database(database):
    global db
    db = database


def get_db():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return db


# ============ Helper Functions ============

def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON serializable format"""
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, date):
            result[key] = value.isoformat()
        else:
            result[key] = value
    return result


async def get_user_name(user_id: str) -> Optional[str]:
    """Get user name by ID"""
    if not user_id:
        return None
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)}, {"name": 1})
        return user.get("name") if user else None
    except Exception:
        return None


async def get_fiscal_year_name(fy_id: str) -> Optional[str]:
    """Get fiscal year name by ID"""
    if not fy_id:
        return None
    try:
        fy = await db.fiscal_years.find_one({"_id": ObjectId(fy_id)}, {"name": 1})
        return fy.get("name") if fy else None
    except Exception:
        return None


async def get_quarter_name(quarter_id: str) -> Optional[str]:
    """Get quarter name by ID"""
    if not quarter_id:
        return None
    try:
        quarter = await db.quarters.find_one({"_id": ObjectId(quarter_id)}, {"name": 1})
        return quarter.get("name") if quarter else None
    except Exception:
        return None


async def get_quarter_names(quarter_ids: list) -> list:
    """Get multiple quarter names by IDs"""
    if not quarter_ids:
        return []
    names = []
    for qid in quarter_ids:
        name = await get_quarter_name(qid)
        if name:
            names.append(name)
    return names


async def get_goal_title(goal_id: str) -> Optional[str]:
    """Get strategic goal title by ID"""
    if not goal_id:
        return None
    try:
        goal = await db.strategic_goals.find_one({"_id": ObjectId(goal_id)}, {"title": 1})
        return goal.get("title") if goal else None
    except Exception:
        return None


# ============ Fiscal Year Routes ============

@router.post("/fiscal-years", response_model=FiscalYearResponse)
async def create_fiscal_year(data: FiscalYearCreate):
    """Create a new fiscal year"""
    doc = {
        "name": data.name,
        "start_date": datetime.combine(data.start_date, datetime.min.time()),
        "end_date": datetime.combine(data.end_date, datetime.min.time()),
        "status": data.status.value,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.fiscal_years.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    # Auto-create quarters
    quarters = []
    year_start = data.start_date.year
    quarter_dates = [
        ("Q1", data.start_date, date(year_start, 6, 30)),
        ("Q2", date(year_start, 7, 1), date(year_start, 9, 30)),
        ("Q3", date(year_start, 10, 1), date(year_start, 12, 31)),
        ("Q4", date(year_start + 1, 1, 1), data.end_date),
    ]
    
    for q_name, q_start, q_end in quarter_dates:
        q_doc = {
            "name": q_name,
            "fiscal_year_id": str(result.inserted_id),
            "start_date": datetime.combine(q_start, datetime.min.time()),
            "end_date": datetime.combine(q_end, datetime.min.time()),
            "created_at": datetime.now(timezone.utc)
        }
        q_result = await db.quarters.insert_one(q_doc)
        quarters.append({
            "id": str(q_result.inserted_id),
            "name": q_name,
            "start_date": q_start.isoformat(),
            "end_date": q_end.isoformat()
        })
    
    response = serialize_doc(doc)
    response["quarters"] = quarters
    return response


@router.get("/fiscal-years", response_model=List[FiscalYearResponse])
async def list_fiscal_years(
    status: Optional[FiscalYearStatus] = None,
    include_quarters: bool = True
):
    """List all fiscal years"""
    query = {}
    if status:
        query["status"] = status.value
    
    fiscal_years = await db.fiscal_years.find(query).sort("start_date", -1).to_list(100)
    results = []
    
    for fy in fiscal_years:
        fy_data = serialize_doc(fy)
        if include_quarters:
            quarters = await db.quarters.find({"fiscal_year_id": fy_data["id"]}).sort("start_date", 1).to_list(10)
            fy_data["quarters"] = [serialize_doc(q) for q in quarters]
        else:
            fy_data["quarters"] = []
        results.append(fy_data)
    
    return results


@router.get("/fiscal-years/{fy_id}", response_model=FiscalYearResponse)
async def get_fiscal_year(fy_id: str):
    """Get a fiscal year by ID"""
    try:
        fy = await db.fiscal_years.find_one({"_id": ObjectId(fy_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid fiscal year ID")
    
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    fy_data = serialize_doc(fy)
    quarters = await db.quarters.find({"fiscal_year_id": fy_id}).sort("start_date", 1).to_list(10)
    fy_data["quarters"] = [serialize_doc(q) for q in quarters]
    
    return fy_data


@router.put("/fiscal-years/{fy_id}", response_model=FiscalYearResponse)
async def update_fiscal_year(fy_id: str, data: FiscalYearUpdate):
    """Update a fiscal year"""
    try:
        fy = await db.fiscal_years.find_one({"_id": ObjectId(fy_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid fiscal year ID")
    
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    if "start_date" in update_data:
        update_data["start_date"] = datetime.combine(update_data["start_date"], datetime.min.time())
    if "end_date" in update_data:
        update_data["end_date"] = datetime.combine(update_data["end_date"], datetime.min.time())
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.fiscal_years.update_one({"_id": ObjectId(fy_id)}, {"$set": update_data})
    
    updated_fy = await db.fiscal_years.find_one({"_id": ObjectId(fy_id)})
    fy_data = serialize_doc(updated_fy)
    quarters = await db.quarters.find({"fiscal_year_id": fy_id}).sort("start_date", 1).to_list(10)
    fy_data["quarters"] = [serialize_doc(q) for q in quarters]
    
    return fy_data


@router.delete("/fiscal-years/{fy_id}")
async def delete_fiscal_year(fy_id: str):
    """Delete a fiscal year (archive)"""
    try:
        result = await db.fiscal_years.update_one(
            {"_id": ObjectId(fy_id)},
            {"$set": {"status": "archived", "updated_at": datetime.now(timezone.utc)}}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid fiscal year ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    return {"message": "Fiscal year archived successfully"}


# ============ Quarter Routes ============

@router.get("/quarters", response_model=List[QuarterResponse])
async def list_quarters(fiscal_year_id: Optional[str] = None):
    """List all quarters, optionally filtered by fiscal year"""
    query = {}
    if fiscal_year_id:
        query["fiscal_year_id"] = fiscal_year_id
    
    quarters = await db.quarters.find(query).sort("start_date", 1).to_list(100)
    results = []
    
    for q in quarters:
        q_data = serialize_doc(q)
        q_data["fiscal_year_name"] = await get_fiscal_year_name(q.get("fiscal_year_id"))
        results.append(q_data)
    
    return results


@router.put("/quarters/{quarter_id}", response_model=QuarterResponse)
async def update_quarter(quarter_id: str, data: QuarterUpdate):
    """Update a quarter"""
    try:
        quarter = await db.quarters.find_one({"_id": ObjectId(quarter_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid quarter ID")
    
    if not quarter:
        raise HTTPException(status_code=404, detail="Quarter not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if "start_date" in update_data:
        update_data["start_date"] = datetime.combine(update_data["start_date"], datetime.min.time())
    if "end_date" in update_data:
        update_data["end_date"] = datetime.combine(update_data["end_date"], datetime.min.time())
    
    await db.quarters.update_one({"_id": ObjectId(quarter_id)}, {"$set": update_data})
    
    updated_quarter = await db.quarters.find_one({"_id": ObjectId(quarter_id)})
    q_data = serialize_doc(updated_quarter)
    q_data["fiscal_year_name"] = await get_fiscal_year_name(updated_quarter.get("fiscal_year_id"))
    
    return q_data


# ============ Strategic Goal Routes ============

@router.post("/strategic-goals", response_model=StrategicGoalResponse)
async def create_strategic_goal(data: StrategicGoalCreate):
    """Create a new strategic goal"""
    doc = {
        "title": data.title,
        "description": data.description,
        "fiscal_year_id": data.fiscal_year_id,
        "owner_id": data.owner_id,
        "priority": data.priority.value,
        "status": data.status.value,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.strategic_goals.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    response = serialize_doc(doc)
    response["fiscal_year_name"] = await get_fiscal_year_name(data.fiscal_year_id)
    response["owner_name"] = await get_user_name(data.owner_id)
    response["objectives_count"] = 0
    response["objectives_completed"] = 0
    response["progress"] = 0.0
    
    return response


@router.get("/strategic-goals", response_model=List[StrategicGoalResponse])
async def list_strategic_goals(
    fiscal_year_id: Optional[str] = None,
    status: Optional[GoalStatus] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None
):
    """List all strategic goals"""
    query = {}
    if fiscal_year_id:
        query["fiscal_year_id"] = fiscal_year_id
    if status:
        query["status"] = status.value
    if priority:
        query["priority"] = priority
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    goals = await db.strategic_goals.find(query).sort("created_at", -1).to_list(100)
    results = []
    
    for goal in goals:
        goal_data = serialize_doc(goal)
        goal_data["fiscal_year_name"] = await get_fiscal_year_name(goal.get("fiscal_year_id"))
        goal_data["owner_name"] = await get_user_name(goal.get("owner_id"))
        
        # Count objectives
        objectives = await db.objectives.find({"strategic_goal_id": goal_data["id"]}).to_list(1000)
        goal_data["objectives_count"] = len(objectives)
        goal_data["objectives_completed"] = sum(1 for o in objectives if o.get("status") == "completed")
        
        # Calculate progress
        if objectives:
            total_progress = sum(o.get("progress", 0) for o in objectives)
            goal_data["progress"] = total_progress / len(objectives)
        else:
            goal_data["progress"] = 0.0
        
        results.append(goal_data)
    
    return results


@router.get("/strategic-goals/{goal_id}", response_model=StrategicGoalResponse)
async def get_strategic_goal(goal_id: str):
    """Get a strategic goal by ID"""
    try:
        goal = await db.strategic_goals.find_one({"_id": ObjectId(goal_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid goal ID")
    
    if not goal:
        raise HTTPException(status_code=404, detail="Strategic goal not found")
    
    goal_data = serialize_doc(goal)
    goal_data["fiscal_year_name"] = await get_fiscal_year_name(goal.get("fiscal_year_id"))
    goal_data["owner_name"] = await get_user_name(goal.get("owner_id"))
    
    # Count objectives
    objectives = await db.objectives.find({"strategic_goal_id": goal_id}).to_list(1000)
    goal_data["objectives_count"] = len(objectives)
    goal_data["objectives_completed"] = sum(1 for o in objectives if o.get("status") == "completed")
    
    # Calculate progress
    if objectives:
        total_progress = sum(o.get("progress", 0) for o in objectives)
        goal_data["progress"] = total_progress / len(objectives)
    else:
        goal_data["progress"] = 0.0
    
    return goal_data


@router.put("/strategic-goals/{goal_id}", response_model=StrategicGoalResponse)
async def update_strategic_goal(goal_id: str, data: StrategicGoalUpdate):
    """Update a strategic goal"""
    try:
        goal = await db.strategic_goals.find_one({"_id": ObjectId(goal_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid goal ID")
    
    if not goal:
        raise HTTPException(status_code=404, detail="Strategic goal not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if "priority" in update_data:
        update_data["priority"] = update_data["priority"].value
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.strategic_goals.update_one({"_id": ObjectId(goal_id)}, {"$set": update_data})
    
    return await get_strategic_goal(goal_id)


@router.delete("/strategic-goals/{goal_id}")
async def delete_strategic_goal(goal_id: str):
    """Delete a strategic goal (archive)"""
    try:
        result = await db.strategic_goals.update_one(
            {"_id": ObjectId(goal_id)},
            {"$set": {"status": "archived", "updated_at": datetime.now(timezone.utc)}}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid goal ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Strategic goal not found")
    
    return {"message": "Strategic goal archived successfully"}


# ============ Objectives Routes ============

@router.post("/objectives", response_model=ObjectiveResponse)
async def create_objective(data: ObjectiveCreate):
    """Create a new objective"""
    # Handle quarter_ids as array
    quarter_ids = data.quarter_ids if data.quarter_ids else []
    quarter_id = quarter_ids[0] if quarter_ids else None
    
    doc = {
        "title": data.title,
        "description": data.description,
        "strategic_goal_id": data.strategic_goal_id,
        "fiscal_year_id": data.fiscal_year_id,
        "quarter_ids": quarter_ids,
        "quarter_id": quarter_id,  # Keep for backward compatibility
        "department": data.department,
        "owner_id": data.owner_id,
        "sponsor_id": data.sponsor_id,
        "priority": data.priority.value,
        "status": data.status.value,
        "start_date": datetime.combine(data.start_date, datetime.min.time()) if data.start_date else None,
        "target_date": datetime.combine(data.target_date, datetime.min.time()) if data.target_date else None,
        "progress": 0.0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.objectives.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    response = serialize_doc(doc)
    response["strategic_goal_title"] = await get_goal_title(data.strategic_goal_id)
    response["fiscal_year_name"] = await get_fiscal_year_name(data.fiscal_year_id)
    response["quarter_names"] = await get_quarter_names(quarter_ids)
    response["quarter_name"] = response["quarter_names"][0] if response["quarter_names"] else None
    response["owner_name"] = await get_user_name(data.owner_id)
    response["sponsor_name"] = await get_user_name(data.sponsor_id)
    response["linked_projects_count"] = 0
    response["key_results_count"] = 0
    
    return response


@router.get("/objectives", response_model=List[ObjectiveResponse])
async def list_objectives(
    fiscal_year_id: Optional[str] = None,
    quarter_id: Optional[str] = None,
    strategic_goal_id: Optional[str] = None,
    department: Optional[str] = None,
    owner_id: Optional[str] = None,
    status: Optional[ObjectiveStatus] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None
):
    """List all objectives"""
    query = {}
    if fiscal_year_id:
        query["fiscal_year_id"] = fiscal_year_id
    if quarter_id:
        # Support both old single quarter_id and new quarter_ids array
        query["$or"] = [
            {"quarter_id": quarter_id},
            {"quarter_ids": quarter_id}
        ]
    if strategic_goal_id:
        query["strategic_goal_id"] = strategic_goal_id
    if department:
        query["department"] = department
    if owner_id:
        query["owner_id"] = owner_id
    if status:
        query["status"] = status.value
    if priority:
        query["priority"] = priority
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    objectives = await db.objectives.find(query).sort("created_at", -1).to_list(500)
    results = []
    
    for obj in objectives:
        obj_data = serialize_doc(obj)
        obj_data["strategic_goal_title"] = await get_goal_title(obj.get("strategic_goal_id"))
        obj_data["fiscal_year_name"] = await get_fiscal_year_name(obj.get("fiscal_year_id"))
        
        # Handle both old quarter_id and new quarter_ids
        quarter_ids = obj.get("quarter_ids") or ([obj.get("quarter_id")] if obj.get("quarter_id") else [])
        obj_data["quarter_ids"] = quarter_ids
        obj_data["quarter_names"] = await get_quarter_names(quarter_ids)
        obj_data["quarter_name"] = obj_data["quarter_names"][0] if obj_data["quarter_names"] else await get_quarter_name(obj.get("quarter_id"))
        
        obj_data["owner_name"] = await get_user_name(obj.get("owner_id"))
        obj_data["sponsor_name"] = await get_user_name(obj.get("sponsor_id"))
        
        # Count linked projects
        linked_projects = await db.pm_projects.count_documents({"linked_objective_id": obj_data["id"]})
        obj_data["linked_projects_count"] = linked_projects
        
        # Count key results
        key_results = await db.key_results.count_documents({"objective_id": obj_data["id"]})
        obj_data["key_results_count"] = key_results
        
        results.append(obj_data)
    
    return results


@router.get("/objectives/{objective_id}", response_model=ObjectiveResponse)
async def get_objective(objective_id: str):
    """Get an objective by ID"""
    try:
        obj = await db.objectives.find_one({"_id": ObjectId(objective_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid objective ID")
    
    if not obj:
        raise HTTPException(status_code=404, detail="Objective not found")
    
    obj_data = serialize_doc(obj)
    obj_data["strategic_goal_title"] = await get_goal_title(obj.get("strategic_goal_id"))
    obj_data["fiscal_year_name"] = await get_fiscal_year_name(obj.get("fiscal_year_id"))
    
    # Handle both old quarter_id and new quarter_ids
    quarter_ids = obj.get("quarter_ids") or ([obj.get("quarter_id")] if obj.get("quarter_id") else [])
    obj_data["quarter_ids"] = quarter_ids
    obj_data["quarter_names"] = await get_quarter_names(quarter_ids)
    obj_data["quarter_name"] = obj_data["quarter_names"][0] if obj_data["quarter_names"] else await get_quarter_name(obj.get("quarter_id"))
    
    obj_data["owner_name"] = await get_user_name(obj.get("owner_id"))
    obj_data["sponsor_name"] = await get_user_name(obj.get("sponsor_id"))
    
    # Count linked projects
    linked_projects = await db.pm_projects.count_documents({"linked_objective_id": objective_id})
    obj_data["linked_projects_count"] = linked_projects
    
    # Count key results
    key_results = await db.key_results.count_documents({"objective_id": objective_id})
    obj_data["key_results_count"] = key_results
    
    return obj_data


@router.put("/objectives/{objective_id}", response_model=ObjectiveResponse)
async def update_objective(objective_id: str, data: ObjectiveUpdate):
    """Update an objective"""
    try:
        obj = await db.objectives.find_one({"_id": ObjectId(objective_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid objective ID")
    
    if not obj:
        raise HTTPException(status_code=404, detail="Objective not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if "priority" in update_data:
        update_data["priority"] = update_data["priority"].value
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    if "start_date" in update_data:
        update_data["start_date"] = datetime.combine(update_data["start_date"], datetime.min.time())
    if "target_date" in update_data:
        update_data["target_date"] = datetime.combine(update_data["target_date"], datetime.min.time())
    
    # Handle quarter_ids update - also update quarter_id for backward compatibility
    if "quarter_ids" in update_data and update_data["quarter_ids"]:
        update_data["quarter_id"] = update_data["quarter_ids"][0]
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.objectives.update_one({"_id": ObjectId(objective_id)}, {"$set": update_data})
    
    return await get_objective(objective_id)


@router.delete("/objectives/{objective_id}")
async def delete_objective(objective_id: str):
    """Delete an objective"""
    try:
        result = await db.objectives.delete_one({"_id": ObjectId(objective_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid objective ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Objective not found")
    
    return {"message": "Objective deleted successfully"}


# ============ Key Results Routes ============

@router.post("/key-results", response_model=KeyResultResponse)
async def create_key_result(data: KeyResultCreate):
    """Create a new key result"""
    # Calculate progress
    progress = (data.current_value / data.target_value * 100) if data.target_value > 0 else 0
    
    doc = {
        "title": data.title,
        "objective_id": data.objective_id,
        "target_value": data.target_value,
        "current_value": data.current_value,
        "unit_type": data.unit_type.value,
        "progress": min(progress, 100),
        "status": data.status.value,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.key_results.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    return serialize_doc(doc)


@router.get("/key-results", response_model=List[KeyResultResponse])
async def list_key_results(objective_id: str):
    """List all key results for an objective"""
    key_results = await db.key_results.find({"objective_id": objective_id}).sort("created_at", 1).to_list(100)
    return [serialize_doc(kr) for kr in key_results]


@router.put("/key-results/{kr_id}", response_model=KeyResultResponse)
async def update_key_result(kr_id: str, data: KeyResultUpdate):
    """Update a key result"""
    try:
        kr = await db.key_results.find_one({"_id": ObjectId(kr_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid key result ID")
    
    if not kr:
        raise HTTPException(status_code=404, detail="Key result not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if "unit_type" in update_data:
        update_data["unit_type"] = update_data["unit_type"].value
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    
    # Recalculate progress
    target = update_data.get("target_value", kr.get("target_value", 0))
    current = update_data.get("current_value", kr.get("current_value", 0))
    old_progress = kr.get("progress", 0)
    new_progress = 0
    if target > 0:
        new_progress = min((current / target * 100), 100)
        update_data["progress"] = new_progress
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.key_results.update_one({"_id": ObjectId(kr_id)}, {"$set": update_data})
    
    # ===== PULSE INTEGRATION: Auto-post for OKR milestones =====
    try:
        milestones = [25, 50, 75, 100]
        for milestone in milestones:
            if old_progress < milestone <= new_progress:
                from services.pulse_integrations import on_okr_progress_milestone
                objective = await db.objectives.find_one({"_id": ObjectId(kr.get("objective_id"))})
                if objective:
                    await on_okr_progress_milestone(
                        serialize_doc(objective),
                        serialize_doc(kr),
                        milestone,
                        {"id": "system", "name": "Goals System"}
                    )
                break
    except Exception as e:
        import logging
        logging.warning(f"Pulse integration failed for OKR progress (non-fatal): {e}")
    
    updated_kr = await db.key_results.find_one({"_id": ObjectId(kr_id)})
    return serialize_doc(updated_kr)


@router.delete("/key-results/{kr_id}")
async def delete_key_result(kr_id: str):
    """Delete a key result"""
    try:
        result = await db.key_results.delete_one({"_id": ObjectId(kr_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid key result ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Key result not found")
    
    return {"message": "Key result deleted successfully"}


# ============ Progress Updates Routes ============

@router.post("/objectives/{objective_id}/updates", response_model=ObjectiveProgressUpdateResponse)
async def create_objective_update(objective_id: str, data: ObjectiveProgressUpdateCreate, user_id: str = "system"):
    """Create a progress update for an objective"""
    try:
        obj = await db.objectives.find_one({"_id": ObjectId(objective_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid objective ID")
    
    if not obj:
        raise HTTPException(status_code=404, detail="Objective not found")
    
    doc = {
        "objective_id": objective_id,
        "progress": data.progress,
        "note": data.note,
        "blockers": data.blockers,
        "updated_by_id": user_id,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.objective_updates.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    # Update objective progress
    await db.objectives.update_one(
        {"_id": ObjectId(objective_id)},
        {"$set": {"progress": data.progress, "updated_at": datetime.now(timezone.utc)}}
    )
    
    response = serialize_doc(doc)
    response["updated_by_name"] = await get_user_name(user_id)
    
    return response


@router.get("/objectives/{objective_id}/updates", response_model=List[ObjectiveProgressUpdateResponse])
async def list_objective_updates(objective_id: str):
    """List all updates for an objective"""
    updates = await db.objective_updates.find({"objective_id": objective_id}).sort("created_at", -1).to_list(100)
    results = []
    
    for update in updates:
        update_data = serialize_doc(update)
        update_data["updated_by_name"] = await get_user_name(update.get("updated_by_id"))
        results.append(update_data)
    
    return results


# ============ Dashboard Routes ============

@router.get("/dashboard", response_model=GoalsDashboardResponse)
async def get_goals_dashboard(fiscal_year_id: Optional[str] = None):
    """Get Goals & Objectives dashboard data"""
    # Get active fiscal year if not specified
    if not fiscal_year_id:
        active_fy = await db.fiscal_years.find_one({"status": "active"})
        if active_fy:
            fiscal_year_id = str(active_fy["_id"])
    
    fiscal_year = None
    if fiscal_year_id:
        try:
            fy = await db.fiscal_years.find_one({"_id": ObjectId(fiscal_year_id)})
            if fy:
                fiscal_year = serialize_doc(fy)
        except Exception:
            pass
    
    # Goals statistics
    goals_query = {"fiscal_year_id": fiscal_year_id} if fiscal_year_id else {}
    goals = await db.strategic_goals.find(goals_query).to_list(500)
    
    goals_by_status = {}
    for goal in goals:
        status = goal.get("status", "planning")
        goals_by_status[status] = goals_by_status.get(status, 0) + 1
    
    # Objectives statistics
    obj_query = {"fiscal_year_id": fiscal_year_id} if fiscal_year_id else {}
    objectives = await db.objectives.find(obj_query).to_list(1000)
    
    objectives_completed = sum(1 for o in objectives if o.get("status") == "completed")
    objectives_in_progress = sum(1 for o in objectives if o.get("status") in ["active", "planning"])
    objectives_delayed = sum(1 for o in objectives if o.get("status") in ["delayed", "at_risk"])
    
    # Quarterly progress
    quarterly_progress = []
    if fiscal_year_id:
        quarters = await db.quarters.find({"fiscal_year_id": fiscal_year_id}).sort("start_date", 1).to_list(10)
        for q in quarters:
            q_id = str(q["_id"])
            q_objectives = [o for o in objectives if o.get("quarter_id") == q_id]
            q_completed = sum(1 for o in q_objectives if o.get("status") == "completed")
            q_progress = sum(o.get("progress", 0) for o in q_objectives) / len(q_objectives) if q_objectives else 0
            quarterly_progress.append({
                "quarter": q["name"],
                "objectives": len(q_objectives),
                "completed": q_completed,
                "progress": round(q_progress, 1)
            })
    
    # Objectives by department
    dept_stats = {}
    for obj in objectives:
        dept = obj.get("department") or "Unassigned"
        if dept not in dept_stats:
            dept_stats[dept] = {"total": 0, "completed": 0}
        dept_stats[dept]["total"] += 1
        if obj.get("status") == "completed":
            dept_stats[dept]["completed"] += 1
    
    objectives_by_department = [
        {"department": dept, "objectives": stats["total"], "completed": stats["completed"]}
        for dept, stats in dept_stats.items()
    ]
    
    # Delayed objectives
    delayed_objectives = []
    for obj in objectives:
        if obj.get("status") in ["delayed", "at_risk"]:
            target_date = obj.get("target_date")
            delay_days = 0
            if target_date:
                delay_days = (datetime.now(timezone.utc) - target_date).days if target_date < datetime.now(timezone.utc) else 0
            
            owner_name = await get_user_name(obj.get("owner_id"))
            delayed_objectives.append({
                "id": str(obj["_id"]),
                "title": obj.get("title"),
                "owner": owner_name,
                "delay_days": max(delay_days, 0),
                "status": obj.get("status")
            })
    
    # Recent updates
    recent_updates = await db.objective_updates.find().sort("created_at", -1).limit(10).to_list(10)
    recent_updates_formatted = []
    for update in recent_updates:
        obj = await db.objectives.find_one({"_id": ObjectId(update.get("objective_id"))})
        if obj:
            recent_updates_formatted.append({
                "objective_title": obj.get("title"),
                "progress": update.get("progress"),
                "note": update.get("note"),
                "updated_by": await get_user_name(update.get("updated_by_id")),
                "created_at": update.get("created_at").isoformat() if update.get("created_at") else None
            })
    
    return {
        "fiscal_year": fiscal_year,
        "total_goals": len(goals),
        "goals_by_status": goals_by_status,
        "total_objectives": len(objectives),
        "objectives_completed": objectives_completed,
        "objectives_in_progress": objectives_in_progress,
        "objectives_delayed": objectives_delayed,
        "quarterly_progress": quarterly_progress,
        "objectives_by_department": objectives_by_department,
        "delayed_objectives": delayed_objectives,
        "recent_updates": recent_updates_formatted
    }


# ============ Users List for Assignment ============

@router.get("/users")
async def list_users_for_assignment():
    """Get list of users for assignment dropdowns"""
    users = await db.users.find({}, {"_id": 1, "name": 1, "email": 1, "department": 1}).to_list(500)
    return [serialize_doc(u) for u in users]


# ============ Departments List ============

@router.get("/departments")
async def list_departments():
    """Get list of departments from organization management"""
    # First try to get departments from the departments collection (WorkOS)
    departments = await db.departments.find({"is_active": {"$ne": False}}, {"_id": 0, "id": 1, "name": 1, "code": 1}).to_list(100)
    
    if departments and len(departments) > 0:
        return departments
    
    # Fallback: Get unique departments from users if no departments collection exists
    user_departments = await db.users.distinct("department")
    # Add common departments if not present
    common_depts = ["Product", "Engineering", "Marketing", "Sales", "Operations", "HR", "Finance"]
    all_depts = list(set(user_departments + common_depts))
    # Return as list of strings for backward compatibility
    return sorted([d for d in all_depts if d])
