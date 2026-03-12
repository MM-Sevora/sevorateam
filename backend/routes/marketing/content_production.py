"""
Content Production Routes

Handles:
- Content projects (video, photo, reels, etc.)
- Production workflow (Idea → Shoot → Edit → Approve → Publish)
- Tasks and assignments
- Reviews and approvals
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime, date, timedelta
import uuid
import os

from models.marketing_content import (
    ContentType, ContentPlatform, ProjectStatus, TaskStatus, TaskType,
    ReviewStatus, Priority, ProjectType,
    ContentProjectCreate, ContentProjectUpdate, ContentProjectResponse,
    ContentTaskCreate, ContentTaskUpdate, ContentTaskResponse,
    ContentReviewCreate, ContentReviewUpdate, ContentReviewResponse,
    ContentProductionStats, DEFAULT_WORKFLOWS, WORKFLOWS_BY_PROJECT_TYPE
)

router = APIRouter(prefix="/content", tags=["Marketing - Content Production"])


def get_db():
    """Get database connection"""
    from pymongo import MongoClient
    client = MongoClient(os.environ.get("MONGO_URL"))
    return client[os.environ.get("DB_NAME", "sevora_production")]


def serialize_doc(doc: dict) -> dict:
    """Serialize MongoDB document for JSON response"""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id", doc.get("id", "")))
    return doc


# ============== PROJECTS ==============

@router.get("/projects", response_model=List[ContentProjectResponse])
async def list_content_projects(
    status: Optional[ProjectStatus] = None,
    content_type: Optional[ContentType] = None,
    platform: Optional[ContentPlatform] = None,
    campaign_id: Optional[str] = None,
    assigned_to: Optional[str] = None,
    priority: Optional[Priority] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """List content projects with filters"""
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status.value
    if content_type:
        query["content_type"] = content_type.value
    if platform:
        query["platform"] = platform.value
    if campaign_id:
        query["campaign_id"] = campaign_id
    if assigned_to:
        query["assigned_to"] = assigned_to
    if priority:
        query["priority"] = priority.value
    
    projects = list(
        db.marketing_content_projects.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    
    # Add task counts
    for project in projects:
        project_id = str(project["_id"])
        project["task_count"] = db.marketing_content_tasks.count_documents({"project_id": project_id})
        project["completed_tasks"] = db.marketing_content_tasks.count_documents({
            "project_id": project_id,
            "status": "completed"
        })
    
    return [serialize_doc(p) for p in projects]


@router.get("/projects/sources")
async def get_available_sources():
    """Get list of projects that can be used as source for adaptation/delivery"""
    db = get_db()
    
    # Get published or approved projects that can be sources
    projects = list(
        db.marketing_content_projects.find(
            {"status": {"$in": ["published", "approved"]}},
            {"_id": 1, "title": 1, "content_type": 1, "platform": 1}
        ).sort("created_at", -1).limit(50)
    )
    
    return [serialize_doc(p) for p in projects]


@router.post("/projects", response_model=ContentProjectResponse)
async def create_content_project(project: ContentProjectCreate, user_id: Optional[str] = None):
    """Create a new content project"""
    db = get_db()
    
    project_doc = project.model_dump()
    project_doc["_id"] = str(uuid.uuid4())
    project_doc["project_type"] = project.project_type.value
    project_doc["content_type"] = project.content_type.value
    project_doc["platform"] = project.platform.value
    project_doc["status"] = project.status.value
    project_doc["priority"] = project.priority.value
    
    # Convert dates
    for date_field in ["brief_date", "shoot_date", "edit_deadline", "publish_date"]:
        if project_doc.get(date_field):
            project_doc[date_field] = project_doc[date_field].isoformat()
    
    project_doc["created_by"] = user_id
    project_doc["created_at"] = datetime.utcnow()
    project_doc["task_count"] = 0
    project_doc["completed_tasks"] = 0
    
    # If this is a derivative project, get source project title
    if project_doc.get("source_project_id"):
        source = db.marketing_content_projects.find_one({"_id": project_doc["source_project_id"]})
        if source:
            project_doc["source_project_title"] = source.get("title")
    
    db.marketing_content_projects.insert_one(project_doc)
    
    return serialize_doc(project_doc)


@router.get("/projects/{project_id}", response_model=ContentProjectResponse)
async def get_content_project(project_id: str):
    """Get a specific content project"""
    db = get_db()
    
    project = db.marketing_content_projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Add task counts
    project["task_count"] = db.marketing_content_tasks.count_documents({"project_id": project_id})
    project["completed_tasks"] = db.marketing_content_tasks.count_documents({
        "project_id": project_id,
        "status": "completed"
    })
    
    return serialize_doc(project)


@router.put("/projects/{project_id}", response_model=ContentProjectResponse)
async def update_content_project(project_id: str, update: ContentProjectUpdate):
    """Update a content project"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Convert enums
    for enum_field in ["content_type", "platform", "status", "priority"]:
        if enum_field in update_data:
            update_data[enum_field] = update_data[enum_field].value
    
    # Convert dates
    for date_field in ["brief_date", "shoot_date", "edit_deadline", "publish_date"]:
        if date_field in update_data and update_data[date_field]:
            update_data[date_field] = update_data[date_field].isoformat()
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_content_projects.find_one_and_update(
        {"_id": project_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return serialize_doc(result)


@router.delete("/projects/{project_id}")
async def delete_content_project(project_id: str):
    """Delete a content project"""
    db = get_db()
    
    # Check for tasks
    task_count = db.marketing_content_tasks.count_documents({"project_id": project_id})
    if task_count > 0:
        # Archive instead of delete
        db.marketing_content_projects.update_one(
            {"_id": project_id},
            {"$set": {"status": "archived", "updated_at": datetime.utcnow()}}
        )
        return {"message": f"Project archived (has {task_count} tasks)"}
    
    result = db.marketing_content_projects.delete_one({"_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project deleted successfully"}


@router.post("/projects/{project_id}/generate-tasks")
async def generate_project_tasks(project_id: str):
    """Generate default workflow tasks for a project based on project type and content type"""
    db = get_db()
    
    project = db.marketing_content_projects.find_one({"_id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Determine workflow based on project type
    project_type = ProjectType(project.get("project_type", "original_production"))
    content_type = ContentType(project.get("content_type", "video"))
    
    # Get appropriate workflow
    if project_type == ProjectType.ORIGINAL_PRODUCTION:
        # Use content-type specific workflow
        workflow = DEFAULT_WORKFLOWS.get(content_type, DEFAULT_WORKFLOWS[ContentType.VIDEO])
    else:
        # Use project-type specific workflow
        workflow = WORKFLOWS_BY_PROJECT_TYPE.get(project_type, WORKFLOWS_BY_PROJECT_TYPE[ProjectType.ADAPTATION])
    
    created_tasks = []
    for step in workflow:
        task_doc = {
            "_id": str(uuid.uuid4()),
            "project_id": project_id,
            "title": step.title,
            "task_type": step.task_type.value,
            "estimated_hours": step.estimated_hours,
            "status": "todo",
            "priority": "medium",
            "order": step.order,
            "requires_approval": step.requires_approval,
            "created_at": datetime.utcnow()
        }
        db.marketing_content_tasks.insert_one(task_doc)
        created_tasks.append(serialize_doc(task_doc.copy()))
    
    return {
        "project_id": project_id,
        "project_type": project_type.value,
        "tasks_created": len(created_tasks),
        "tasks": created_tasks
    }


@router.put("/projects/{project_id}/status")
async def update_project_status(project_id: str, status: ProjectStatus):
    """Update project status (workflow transition)"""
    db = get_db()
    
    update_data = {
        "status": status.value,
        "updated_at": datetime.utcnow()
    }
    
    # Add timestamp for key status changes
    if status == ProjectStatus.PUBLISHED:
        update_data["published_at"] = datetime.utcnow()
    elif status == ProjectStatus.APPROVED:
        update_data["approved_at"] = datetime.utcnow()
    
    result = db.marketing_content_projects.find_one_and_update(
        {"_id": project_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return serialize_doc(result)


# ============== TASKS ==============

@router.get("/projects/{project_id}/tasks", response_model=List[ContentTaskResponse])
async def list_project_tasks(
    project_id: str,
    status: Optional[TaskStatus] = None
):
    """List tasks for a project"""
    db = get_db()
    
    query = {"project_id": project_id}
    if status:
        query["status"] = status.value
    
    tasks = list(db.marketing_content_tasks.find(query).sort("order", 1))
    
    return [serialize_doc(t) for t in tasks]


@router.post("/tasks", response_model=ContentTaskResponse)
async def create_task(task: ContentTaskCreate, user_id: Optional[str] = None):
    """Create a new task"""
    db = get_db()
    
    # Verify project exists
    project = db.marketing_content_projects.find_one({"_id": task.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    task_doc = task.model_dump()
    task_doc["_id"] = str(uuid.uuid4())
    task_doc["task_type"] = task.task_type.value
    task_doc["status"] = task.status.value
    task_doc["priority"] = task.priority.value
    
    if task_doc.get("due_date"):
        task_doc["due_date"] = task_doc["due_date"].isoformat()
    
    task_doc["created_by"] = user_id
    task_doc["created_at"] = datetime.utcnow()
    
    db.marketing_content_tasks.insert_one(task_doc)
    
    return serialize_doc(task_doc)


@router.get("/tasks/{task_id}", response_model=ContentTaskResponse)
async def get_task(task_id: str):
    """Get a specific task"""
    db = get_db()
    
    task = db.marketing_content_tasks.find_one({"_id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return serialize_doc(task)


@router.put("/tasks/{task_id}", response_model=ContentTaskResponse)
async def update_task(task_id: str, update: ContentTaskUpdate):
    """Update a task"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Convert enums
    for enum_field in ["task_type", "status", "priority"]:
        if enum_field in update_data:
            update_data[enum_field] = update_data[enum_field].value
    
    if "due_date" in update_data and update_data["due_date"]:
        update_data["due_date"] = update_data["due_date"].isoformat()
    
    # Track completion
    if update_data.get("status") == "completed":
        update_data["completed_at"] = datetime.utcnow()
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_content_tasks.find_one_and_update(
        {"_id": task_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return serialize_doc(result)


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a task"""
    db = get_db()
    
    result = db.marketing_content_tasks.delete_one({"_id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"message": "Task deleted successfully"}


# ============== REVIEWS ==============

@router.get("/projects/{project_id}/reviews", response_model=List[ContentReviewResponse])
async def list_project_reviews(project_id: str):
    """List reviews for a project"""
    db = get_db()
    
    reviews = list(
        db.marketing_content_reviews.find({"project_id": project_id})
        .sort("created_at", -1)
    )
    
    # Add reviewer names
    for review in reviews:
        if review.get("reviewer_id"):
            user = db.users.find_one({"_id": review["reviewer_id"]}, {"name": 1})
            review["reviewer_name"] = user.get("name") if user else None
    
    return [serialize_doc(r) for r in reviews]


@router.post("/reviews", response_model=ContentReviewResponse)
async def create_review(review: ContentReviewCreate):
    """Create a review request"""
    db = get_db()
    
    # Verify project exists
    project = db.marketing_content_projects.find_one({"_id": review.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    review_doc = review.model_dump()
    review_doc["_id"] = str(uuid.uuid4())
    review_doc["status"] = review.status.value
    review_doc["created_at"] = datetime.utcnow()
    
    db.marketing_content_reviews.insert_one(review_doc)
    
    return serialize_doc(review_doc)


@router.put("/reviews/{review_id}", response_model=ContentReviewResponse)
async def update_review(review_id: str, update: ContentReviewUpdate):
    """Update a review (approve/reject/request changes)"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
        if update_data["status"] in ["approved", "rejected", "changes_requested"]:
            update_data["reviewed_at"] = datetime.utcnow()
    
    result = db.marketing_content_reviews.find_one_and_update(
        {"_id": review_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # If approved, update project status
    if update_data.get("status") == "approved":
        db.marketing_content_projects.update_one(
            {"_id": result["project_id"]},
            {"$set": {"status": "approved", "updated_at": datetime.utcnow()}}
        )
    
    return serialize_doc(result)


# ============== STATS ==============

@router.get("/stats", response_model=ContentProductionStats)
async def get_content_stats():
    """Get content production statistics"""
    db = get_db()
    
    total_projects = db.marketing_content_projects.count_documents({})
    
    # By status
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    by_status = {r["_id"]: r["count"] for r in db.marketing_content_projects.aggregate(status_pipeline)}
    
    # By type
    type_pipeline = [
        {"$group": {"_id": "$content_type", "count": {"$sum": 1}}}
    ]
    by_type = {r["_id"]: r["count"] for r in db.marketing_content_projects.aggregate(type_pipeline)}
    
    # By platform
    platform_pipeline = [
        {"$group": {"_id": "$platform", "count": {"$sum": 1}}}
    ]
    by_platform = {r["_id"]: r["count"] for r in db.marketing_content_projects.aggregate(platform_pipeline)}
    
    # This month
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    projects_this_month = db.marketing_content_projects.count_documents({
        "created_at": {"$gte": month_start}
    })
    
    # Overdue (past publish_date but not published)
    today = date.today().isoformat()
    overdue_projects = db.marketing_content_projects.count_documents({
        "publish_date": {"$lt": today},
        "status": {"$nin": ["published", "archived"]}
    })
    
    return ContentProductionStats(
        total_projects=total_projects,
        by_status=by_status,
        by_type=by_type,
        by_platform=by_platform,
        projects_this_month=projects_this_month,
        overdue_projects=overdue_projects,
        avg_production_days=0  # Would calculate from completed projects
    )


# ============== WORKFLOW TEMPLATES ==============

@router.get("/workflow-templates")
async def get_workflow_templates():
    """Get available workflow templates by project type"""
    result = {
        "by_project_type": {},
        "by_content_type": {}
    }
    
    # Workflows by project type
    for project_type, steps in WORKFLOWS_BY_PROJECT_TYPE.items():
        if steps:  # Skip None (original_production uses content type workflows)
            result["by_project_type"][project_type.value] = [
                {
                    "order": s.order,
                    "task_type": s.task_type.value,
                    "title": s.title,
                    "estimated_hours": s.estimated_hours,
                    "requires_approval": s.requires_approval
                }
                for s in steps
            ]
    
    # Workflows by content type (for original production)
    for content_type, steps in DEFAULT_WORKFLOWS.items():
        result["by_content_type"][content_type.value] = [
            {
                "order": s.order,
                "task_type": s.task_type.value,
                "title": s.title,
                "estimated_hours": s.estimated_hours,
                "requires_approval": s.requires_approval
            }
            for s in steps
        ]
    
    return result
