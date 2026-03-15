"""
Custom Workflow Configuration Routes
Define custom status workflows for different issue types
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import jwt
import os
from pydantic import BaseModel

router = APIRouter(prefix="/workflows", tags=["Workflow Configuration"])
security = HTTPBearer()

# Database connection
from motor.motor_asyncio import AsyncIOMotorClient
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'sevora_production')]


# ============== MODELS ==============

class StatusDefinition(BaseModel):
    """A single status in a workflow"""
    id: str
    name: str
    color: str = "#6B7280"  # Gray default
    category: str = "todo"  # todo, in_progress, done
    order: int = 0


class TransitionDefinition(BaseModel):
    """Defines allowed transitions between statuses"""
    from_status: str  # Status ID or "*" for any
    to_status: str
    name: Optional[str] = None  # e.g., "Start Progress", "Complete"
    requires_fields: List[str] = []  # Fields that must be filled
    requires_comment: bool = False


class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    issue_types: List[str] = ["task"]  # Which issue types use this workflow
    statuses: List[StatusDefinition] = []
    transitions: List[TransitionDefinition] = []
    is_default: bool = False


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    issue_types: Optional[List[str]] = None
    statuses: Optional[List[StatusDefinition]] = None
    transitions: Optional[List[TransitionDefinition]] = None
    is_default: Optional[bool] = None


# ============== AUTH ==============

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, os.environ.get('JWT_SECRET', 'your-secret-key'), algorithms=["HS256"])
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============== ENDPOINTS ==============

@router.get("/")
async def list_workflows(
    project_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """List all workflows, optionally filtered by project"""
    query = {}
    if project_id:
        query["$or"] = [
            {"project_id": project_id},
            {"project_id": None, "is_default": True}  # Include default workflows
        ]
    
    workflows = await db.workflows.find(query, {"_id": 0}).sort("name", 1).to_list(50)
    
    # If no workflows exist, return default
    if not workflows:
        workflows = [get_default_workflow()]
    
    return workflows


@router.get("/default")
async def get_default_workflow_endpoint(user: dict = Depends(get_current_user)):
    """Get the default workflow"""
    workflow = await db.workflows.find_one({"is_default": True}, {"_id": 0})
    if not workflow:
        return get_default_workflow()
    return workflow


@router.get("/{workflow_id}")
async def get_workflow(
    workflow_id: str,
    user: dict = Depends(get_current_user)
):
    """Get a specific workflow"""
    workflow = await db.workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@router.post("/")
async def create_workflow(
    data: WorkflowCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new workflow"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc).isoformat()
    workflow_id = str(uuid.uuid4())
    
    # Convert Pydantic models to dicts
    statuses = [s.dict() for s in data.statuses] if data.statuses else get_default_statuses()
    transitions = [t.dict() for t in data.transitions] if data.transitions else get_default_transitions()
    
    workflow_doc = {
        "id": workflow_id,
        "name": data.name,
        "description": data.description,
        "issue_types": data.issue_types,
        "statuses": statuses,
        "transitions": transitions,
        "is_default": data.is_default,
        "created_by": user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    # If setting as default, unset other defaults
    if data.is_default:
        await db.workflows.update_many({}, {"$set": {"is_default": False}})
    
    await db.workflows.insert_one(workflow_doc)
    workflow_doc.pop("_id", None)
    
    return workflow_doc


@router.put("/{workflow_id}")
async def update_workflow(
    workflow_id: str,
    data: WorkflowUpdate,
    user: dict = Depends(get_current_user)
):
    """Update a workflow"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    workflow = await db.workflows.find_one({"id": workflow_id})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    update_data = {}
    
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description
    if data.issue_types is not None:
        update_data["issue_types"] = data.issue_types
    if data.statuses is not None:
        update_data["statuses"] = [s.dict() for s in data.statuses]
    if data.transitions is not None:
        update_data["transitions"] = [t.dict() for t in data.transitions]
    if data.is_default is not None:
        if data.is_default:
            await db.workflows.update_many({}, {"$set": {"is_default": False}})
        update_data["is_default"] = data.is_default
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.workflows.update_one({"id": workflow_id}, {"$set": update_data})
    
    return await get_workflow(workflow_id, user)


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a workflow"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    workflow = await db.workflows.find_one({"id": workflow_id})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    if workflow.get("is_default"):
        raise HTTPException(status_code=400, detail="Cannot delete default workflow")
    
    await db.workflows.delete_one({"id": workflow_id})
    
    return {"success": True, "message": "Workflow deleted"}


@router.get("/{workflow_id}/available-transitions/{status_id}")
async def get_available_transitions(
    workflow_id: str,
    status_id: str,
    user: dict = Depends(get_current_user)
):
    """Get available transitions from a given status"""
    workflow = await db.workflows.find_one({"id": workflow_id}, {"_id": 0})
    if not workflow:
        # Use default workflow
        workflow = get_default_workflow()
    
    transitions = workflow.get("transitions", [])
    statuses = {s["id"]: s for s in workflow.get("statuses", [])}
    
    available = []
    for t in transitions:
        if t["from_status"] == status_id or t["from_status"] == "*":
            to_status = statuses.get(t["to_status"], {})
            available.append({
                "to_status_id": t["to_status"],
                "to_status_name": to_status.get("name", t["to_status"]),
                "to_status_color": to_status.get("color", "#6B7280"),
                "transition_name": t.get("name"),
                "requires_fields": t.get("requires_fields", []),
                "requires_comment": t.get("requires_comment", False)
            })
    
    return available


@router.post("/seed-default")
async def seed_default_workflow(user: dict = Depends(get_current_user)):
    """Create the default workflow if it doesn't exist"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.workflows.find_one({"is_default": True})
    if existing:
        return {"success": True, "message": "Default workflow already exists", "workflow_id": existing["id"]}
    
    now = datetime.now(timezone.utc).isoformat()
    workflow = get_default_workflow()
    workflow["created_by"] = user.get("id")
    workflow["created_at"] = now
    workflow["updated_at"] = now
    
    await db.workflows.insert_one(workflow)
    
    return {"success": True, "message": "Default workflow created", "workflow_id": workflow["id"]}


# ============== HELPER FUNCTIONS ==============

def get_default_statuses():
    return [
        {"id": "draft", "name": "Draft", "color": "#9CA3AF", "category": "todo", "order": 0},
        {"id": "todo", "name": "To Do", "color": "#3B82F6", "category": "todo", "order": 1},
        {"id": "in_progress", "name": "In Progress", "color": "#8B5CF6", "category": "in_progress", "order": 2},
        {"id": "in_review", "name": "In Review", "color": "#F59E0B", "category": "in_progress", "order": 3},
        {"id": "done", "name": "Done", "color": "#10B981", "category": "done", "order": 4},
    ]


def get_default_transitions():
    return [
        {"from_status": "draft", "to_status": "todo", "name": "Ready for Work"},
        {"from_status": "todo", "to_status": "in_progress", "name": "Start Progress"},
        {"from_status": "in_progress", "to_status": "in_review", "name": "Submit for Review"},
        {"from_status": "in_progress", "to_status": "todo", "name": "Stop Progress"},
        {"from_status": "in_review", "to_status": "in_progress", "name": "Request Changes"},
        {"from_status": "in_review", "to_status": "done", "name": "Approve"},
        {"from_status": "*", "to_status": "draft", "name": "Return to Draft"},  # Can go back to draft from anywhere
    ]


def get_default_workflow():
    return {
        "id": "default",
        "name": "Default Workflow",
        "description": "Standard workflow for all issue types",
        "issue_types": ["task", "story", "bug", "improvement", "spike", "subtask"],
        "statuses": get_default_statuses(),
        "transitions": get_default_transitions(),
        "is_default": True
    }


# ============== BUG-SPECIFIC WORKFLOW ==============

@router.post("/seed-bug-workflow")
async def seed_bug_workflow(user: dict = Depends(get_current_user)):
    """Create a bug-specific workflow"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.workflows.find_one({"name": "Bug Workflow"})
    if existing:
        return {"success": True, "message": "Bug workflow already exists", "workflow_id": existing["id"]}
    
    now = datetime.now(timezone.utc).isoformat()
    
    workflow = {
        "id": str(uuid.uuid4()),
        "name": "Bug Workflow",
        "description": "Workflow for bug tracking with triage and verification",
        "issue_types": ["bug"],
        "statuses": [
            {"id": "new", "name": "New", "color": "#EF4444", "category": "todo", "order": 0},
            {"id": "triaged", "name": "Triaged", "color": "#F59E0B", "category": "todo", "order": 1},
            {"id": "in_progress", "name": "In Progress", "color": "#8B5CF6", "category": "in_progress", "order": 2},
            {"id": "fixed", "name": "Fixed", "color": "#3B82F6", "category": "in_progress", "order": 3},
            {"id": "verified", "name": "Verified", "color": "#10B981", "category": "done", "order": 4},
            {"id": "closed", "name": "Closed", "color": "#6B7280", "category": "done", "order": 5},
            {"id": "wont_fix", "name": "Won't Fix", "color": "#9CA3AF", "category": "done", "order": 6},
        ],
        "transitions": [
            {"from_status": "new", "to_status": "triaged", "name": "Triage", "requires_fields": ["bug_severity"]},
            {"from_status": "new", "to_status": "wont_fix", "name": "Won't Fix", "requires_comment": True},
            {"from_status": "triaged", "to_status": "in_progress", "name": "Start Fix"},
            {"from_status": "in_progress", "to_status": "fixed", "name": "Mark Fixed"},
            {"from_status": "fixed", "to_status": "verified", "name": "Verify Fix"},
            {"from_status": "fixed", "to_status": "in_progress", "name": "Reopen", "requires_comment": True},
            {"from_status": "verified", "to_status": "closed", "name": "Close"},
        ],
        "is_default": False,
        "created_by": user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.workflows.insert_one(workflow)
    workflow.pop("_id", None)
    
    return {"success": True, "message": "Bug workflow created", "workflow_id": workflow["id"]}
