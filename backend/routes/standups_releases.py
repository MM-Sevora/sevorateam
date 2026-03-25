"""
Daily Standup, App Releases & Sprint Retrospective Routes
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import jwt
import os
from models.projects import (
    StandupEntryCreate, StandupEntryUpdate, StandupEntryResponse,
    StandupMeetingCreate, StandupMeetingResponse,
    AppReleaseCreate, AppReleaseUpdate, AppReleaseResponse,
    AppPlatform, AppReleaseStatus,
    RetroItemCreate, RetroItemUpdate, RetroItemResponse, RetroItemType,
    SprintRetroCreate, SprintRetroResponse
)
from server import db

router = APIRouter(prefix="/engineering", tags=["Engineering - Standups, Releases & Retros"])

# Auth setup
security = HTTPBearer()
JWT_SECRET = os.environ.get("JWT_SECRET", "sevora-secret-key-2024")
JWT_ALGORITHM = "HS256"

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return current user"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============== DAILY STANDUP ROUTES ==============

@router.post("/standups/entry", response_model=StandupEntryResponse)
async def create_standup_entry(
    data: StandupEntryCreate,
    user: dict = Depends(get_current_user)
):
    """Create or update today's standup entry for the current user"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    user_id = user["id"]
    
    # Check if entry already exists for today
    existing = await db.standup_entries.find_one({
        "user_id": user_id,
        "date": today,
        "project_id": data.project_id
    })
    
    if existing:
        # Update existing entry
        update_data = {
            "yesterday": data.yesterday,
            "today": data.today,
            "blockers": data.blockers,
            "mood": data.mood,
            "updated_at": datetime.now(timezone.utc)
        }
        await db.standup_entries.update_one(
            {"id": existing["id"]},
            {"$set": update_data}
        )
        entry_id = existing["id"]
    else:
        # Create new entry
        entry_id = str(uuid.uuid4())
        entry = {
            "id": entry_id,
            "user_id": user_id,
            "project_id": data.project_id,
            "sprint_id": data.sprint_id,
            "date": today,
            "yesterday": data.yesterday,
            "today": data.today,
            "blockers": data.blockers,
            "mood": data.mood,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.standup_entries.insert_one(entry)
    
    # Fetch the entry with enriched data
    return await get_standup_entry_response(entry_id, user_id)


@router.get("/standups/my-entry", response_model=Optional[StandupEntryResponse])
async def get_my_standup_entry(
    project_id: Optional[str] = None,
    date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get current user's standup entry for today or a specific date"""
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {
        "user_id": user["id"],
        "date": target_date
    }
    if project_id:
        query["project_id"] = project_id
    
    entry = await db.standup_entries.find_one(query, {"_id": 0})
    if not entry:
        return None
    
    return await get_standup_entry_response(entry["id"], user["id"])


@router.get("/standups/team", response_model=List[StandupEntryResponse])
async def get_team_standup_entries(
    project_id: Optional[str] = None,
    sprint_id: Optional[str] = None,
    date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get all team standup entries for a date"""
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {"date": target_date}
    if project_id:
        query["project_id"] = project_id
    if sprint_id:
        query["sprint_id"] = sprint_id
    
    entries = await db.standup_entries.find(query, {"_id": 0}).to_list(100)
    
    results = []
    for entry in entries:
        enriched = await get_standup_entry_response(entry["id"], entry["user_id"])
        results.append(enriched)
    
    return results


@router.get("/standups/history", response_model=List[StandupEntryResponse])
async def get_standup_history(
    user_id: Optional[str] = None,
    project_id: Optional[str] = None,
    days: int = 14,
    user: dict = Depends(get_current_user)
):
    """Get standup history for a user or project"""
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    query = {"date": {"$gte": start_date}}
    if user_id:
        query["user_id"] = user_id
    if project_id:
        query["project_id"] = project_id
    
    entries = await db.standup_entries.find(query, {"_id": 0}).sort("date", -1).to_list(100)
    
    results = []
    for entry in entries:
        enriched = await get_standup_entry_response(entry["id"], entry["user_id"])
        results.append(enriched)
    
    return results


@router.post("/standups/meeting", response_model=StandupMeetingResponse)
async def create_standup_meeting(
    data: StandupMeetingCreate,
    user: dict = Depends(get_current_user)
):
    """Create a standup meeting session"""
    meeting_id = str(uuid.uuid4())
    
    meeting = {
        "id": meeting_id,
        "project_id": data.project_id,
        "sprint_id": data.sprint_id,
        "date": data.date,
        "notes": data.notes,
        "action_items": data.action_items or [],
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.standup_meetings.insert_one(meeting)
    
    return await get_standup_meeting_response(meeting_id)


@router.get("/standups/meetings", response_model=List[StandupMeetingResponse])
async def get_standup_meetings(
    project_id: Optional[str] = None,
    sprint_id: Optional[str] = None,
    days: int = 30,
    user: dict = Depends(get_current_user)
):
    """Get standup meetings history"""
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    query = {"date": {"$gte": start_date}}
    if project_id:
        query["project_id"] = project_id
    if sprint_id:
        query["sprint_id"] = sprint_id
    
    meetings = await db.standup_meetings.find(query, {"_id": 0}).sort("date", -1).to_list(50)
    
    results = []
    for meeting in meetings:
        enriched = await get_standup_meeting_response(meeting["id"])
        results.append(enriched)
    
    return results


@router.put("/standups/meeting/{meeting_id}")
async def update_standup_meeting(
    meeting_id: str,
    notes: Optional[str] = None,
    action_items: Optional[List[str]] = None,
    user: dict = Depends(get_current_user)
):
    """Update standup meeting notes and action items"""
    update_data = {}
    if notes is not None:
        update_data["notes"] = notes
    if action_items is not None:
        update_data["action_items"] = action_items
    
    if update_data:
        await db.standup_meetings.update_one(
            {"id": meeting_id},
            {"$set": update_data}
        )
    
    return await get_standup_meeting_response(meeting_id)


# ============== APP RELEASE ROUTES ==============

@router.post("/app-releases", response_model=AppReleaseResponse)
async def create_app_release(
    data: AppReleaseCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new app release"""
    release_id = str(uuid.uuid4())
    
    release = {
        "id": release_id,
        "project_id": data.project_id,
        "version": data.version,
        "build_number": data.build_number,
        "platform": data.platform.value if isinstance(data.platform, AppPlatform) else data.platform,
        "release_notes": data.release_notes,
        "target_date": data.target_date,
        "status": AppReleaseStatus.DRAFT.value,
        "linked_tasks": [],
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.app_releases.insert_one(release)
    
    return await get_app_release_response(release_id)


@router.get("/app-releases", response_model=List[AppReleaseResponse])
async def get_app_releases(
    project_id: Optional[str] = None,
    platform: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get app releases with optional filters"""
    query = {}
    if project_id:
        query["project_id"] = project_id
    if platform:
        query["platform"] = platform
    if status:
        query["status"] = status
    
    releases = await db.app_releases.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    results = []
    for release in releases:
        enriched = await get_app_release_response(release["id"])
        results.append(enriched)
    
    return results


@router.get("/app-releases/{release_id}", response_model=AppReleaseResponse)
async def get_app_release(
    release_id: str,
    user: dict = Depends(get_current_user)
):
    """Get a specific app release"""
    return await get_app_release_response(release_id)


@router.put("/app-releases/{release_id}", response_model=AppReleaseResponse)
async def update_app_release(
    release_id: str,
    data: AppReleaseUpdate,
    user: dict = Depends(get_current_user)
):
    """Update an app release"""
    release = await db.app_releases.find_one({"id": release_id})
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if isinstance(v, (AppPlatform, AppReleaseStatus)):
                update_data[k] = v.value
            else:
                update_data[k] = v
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await db.app_releases.update_one(
            {"id": release_id},
            {"$set": update_data}
        )
    
    return await get_app_release_response(release_id)


@router.post("/app-releases/{release_id}/link-tasks")
async def link_tasks_to_release(
    release_id: str,
    task_ids: List[str],
    user: dict = Depends(get_current_user)
):
    """Link tasks to an app release"""
    await db.app_releases.update_one(
        {"id": release_id},
        {"$addToSet": {"linked_tasks": {"$each": task_ids}}}
    )
    
    return await get_app_release_response(release_id)


@router.post("/app-releases/{release_id}/unlink-tasks")
async def unlink_tasks_from_release(
    release_id: str,
    task_ids: List[str],
    user: dict = Depends(get_current_user)
):
    """Unlink tasks from an app release"""
    await db.app_releases.update_one(
        {"id": release_id},
        {"$pull": {"linked_tasks": {"$in": task_ids}}}
    )
    
    return await get_app_release_response(release_id)


@router.delete("/app-releases/{release_id}")
async def delete_app_release(
    release_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete an app release"""
    result = await db.app_releases.delete_one({"id": release_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Release not found")
    
    return {"message": "Release deleted"}


# ============== HELPER FUNCTIONS ==============

async def get_standup_entry_response(entry_id: str, user_id: str) -> StandupEntryResponse:
    """Get enriched standup entry response"""
    entry = await db.standup_entries.find_one({"id": entry_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Get user name
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "name": 1})
    entry["user_name"] = user.get("name") if user else None
    
    # Get project name
    if entry.get("project_id"):
        project = await db.pm_projects.find_one({"id": entry["project_id"]}, {"_id": 0, "name": 1})
        entry["project_name"] = project.get("name") if project else None
    
    # Get sprint name
    if entry.get("sprint_id"):
        sprint = await db.pm_sprints.find_one({"id": entry["sprint_id"]}, {"_id": 0, "name": 1})
        entry["sprint_name"] = sprint.get("name") if sprint else None
    
    # Auto-populate tasks completed yesterday
    yesterday = (datetime.strptime(entry["date"], "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
    tasks_completed = await db.pm_tasks.find({
        "assigned_to": user_id,
        "status": {"$in": ["completed", "approved"]},
        "updated_at": {"$regex": f"^{yesterday}"}
    }, {"_id": 0, "id": 1, "name": 1}).to_list(10)
    entry["tasks_completed_yesterday"] = tasks_completed
    
    # Auto-populate tasks in progress
    tasks_in_progress = await db.pm_tasks.find({
        "assigned_to": user_id,
        "status": "in_progress"
    }, {"_id": 0, "id": 1, "name": 1}).to_list(10)
    entry["tasks_in_progress"] = tasks_in_progress
    
    return StandupEntryResponse(**entry)


async def get_standup_meeting_response(meeting_id: str) -> StandupMeetingResponse:
    """Get enriched standup meeting response"""
    meeting = await db.standup_meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Get project name
    if meeting.get("project_id"):
        project = await db.pm_projects.find_one({"id": meeting["project_id"]}, {"_id": 0, "name": 1})
        meeting["project_name"] = project.get("name") if project else None
    
    # Get sprint name
    if meeting.get("sprint_id"):
        sprint = await db.pm_sprints.find_one({"id": meeting["sprint_id"]}, {"_id": 0, "name": 1})
        meeting["sprint_name"] = sprint.get("name") if sprint else None
    
    # Get all entries for this meeting date
    query = {"date": meeting["date"]}
    if meeting.get("project_id"):
        query["project_id"] = meeting["project_id"]
    
    entries = await db.standup_entries.find(query, {"_id": 0}).to_list(50)
    
    enriched_entries = []
    total_blockers = 0
    for entry in entries:
        enriched = await get_standup_entry_response(entry["id"], entry["user_id"])
        enriched_entries.append(enriched)
        if enriched.blockers:
            total_blockers += 1
    
    meeting["entries"] = enriched_entries
    meeting["total_blockers"] = total_blockers
    
    # Calculate participation rate
    if meeting.get("project_id"):
        project = await db.pm_projects.find_one({"id": meeting["project_id"]}, {"_id": 0, "team_members": 1})
        team_size = len(project.get("team_members", [])) if project else 0
        meeting["participation_rate"] = (len(entries) / team_size * 100) if team_size > 0 else 0
    else:
        meeting["participation_rate"] = 0
    
    return StandupMeetingResponse(**meeting)


async def get_app_release_response(release_id: str) -> AppReleaseResponse:
    """Get enriched app release response"""
    release = await db.app_releases.find_one({"id": release_id}, {"_id": 0})
    if not release:
        raise HTTPException(status_code=404, detail="Release not found")
    
    # Get project name
    project = await db.pm_projects.find_one({"id": release["project_id"]}, {"_id": 0, "name": 1})
    release["project_name"] = project.get("name") if project else None
    
    # Get creator name
    if release.get("created_by"):
        creator = await db.users.find_one({"id": release["created_by"]}, {"_id": 0, "name": 1})
        release["created_by_name"] = creator.get("name") if creator else None
    
    # Count linked tasks
    linked_tasks = release.get("linked_tasks", [])
    release["total_tasks"] = len(linked_tasks)
    
    if linked_tasks:
        completed = await db.pm_tasks.count_documents({
            "id": {"$in": linked_tasks},
            "status": {"$in": ["completed", "approved"]}
        })
        release["completed_tasks"] = completed
    else:
        release["completed_tasks"] = 0
    
    return AppReleaseResponse(**release)



# ============== SPRINT RETROSPECTIVE ROUTES ==============

@router.post("/retros", response_model=SprintRetroResponse)
async def create_retrospective(
    data: SprintRetroCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new sprint retrospective"""
    # Check if retro already exists for this sprint
    existing = await db.sprint_retros.find_one({"sprint_id": data.sprint_id})
    if existing:
        raise HTTPException(status_code=400, detail="Retrospective already exists for this sprint")
    
    retro_id = str(uuid.uuid4())
    
    retro = {
        "id": retro_id,
        "sprint_id": data.sprint_id,
        "facilitator_id": data.facilitator_id or user["id"],
        "notes": data.notes,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.sprint_retros.insert_one(retro)
    
    return await get_retro_response(retro_id)


@router.get("/retros/sprint/{sprint_id}", response_model=Optional[SprintRetroResponse])
async def get_sprint_retrospective(
    sprint_id: str,
    user: dict = Depends(get_current_user)
):
    """Get retrospective for a specific sprint"""
    retro = await db.sprint_retros.find_one({"sprint_id": sprint_id}, {"_id": 0})
    if not retro:
        return None
    
    return await get_retro_response(retro["id"])


@router.get("/retros", response_model=List[SprintRetroResponse])
async def get_retrospectives(
    project_id: Optional[str] = None,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """Get all retrospectives, optionally filtered by project"""
    pipeline = []
    
    # If project_id is specified, we need to join with sprints first
    if project_id:
        # Get sprint IDs for this project
        sprints = await db.pm_sprints.find(
            {"project_id": project_id},
            {"_id": 0, "id": 1}
        ).to_list(100)
        sprint_ids = [s["id"] for s in sprints]
        pipeline.append({"$match": {"sprint_id": {"$in": sprint_ids}}})
    
    pipeline.extend([
        {"$sort": {"created_at": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0}}
    ])
    
    retros = await db.sprint_retros.aggregate(pipeline).to_list(limit)
    
    results = []
    for retro in retros:
        enriched = await get_retro_response(retro["id"])
        results.append(enriched)
    
    return results


@router.put("/retros/{retro_id}")
async def update_retrospective(
    retro_id: str,
    notes: Optional[str] = None,
    facilitator_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Update retrospective notes or facilitator"""
    update_data = {}
    if notes is not None:
        update_data["notes"] = notes
    if facilitator_id:
        update_data["facilitator_id"] = facilitator_id
    
    if update_data:
        await db.sprint_retros.update_one(
            {"id": retro_id},
            {"$set": update_data}
        )
    
    return await get_retro_response(retro_id)


@router.post("/retros/{retro_id}/complete")
async def complete_retrospective(
    retro_id: str,
    user: dict = Depends(get_current_user)
):
    """Mark retrospective as complete"""
    await db.sprint_retros.update_one(
        {"id": retro_id},
        {"$set": {"completed_at": datetime.now(timezone.utc)}}
    )
    
    return await get_retro_response(retro_id)


@router.post("/retros/items", response_model=RetroItemResponse)
async def create_retro_item(
    data: RetroItemCreate,
    user: dict = Depends(get_current_user)
):
    """Add an item to a retrospective"""
    item_id = str(uuid.uuid4())
    
    item = {
        "id": item_id,
        "sprint_id": data.sprint_id,
        "item_type": data.item_type.value if isinstance(data.item_type, RetroItemType) else data.item_type,
        "content": data.content,
        "votes": data.votes,
        "is_resolved": False,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.retro_items.insert_one(item)
    
    return await get_retro_item_response(item_id)


@router.put("/retros/items/{item_id}", response_model=RetroItemResponse)
async def update_retro_item(
    item_id: str,
    data: RetroItemUpdate,
    user: dict = Depends(get_current_user)
):
    """Update a retrospective item"""
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            update_data[k] = v
    
    if update_data:
        await db.retro_items.update_one(
            {"id": item_id},
            {"$set": update_data}
        )
    
    return await get_retro_item_response(item_id)


@router.post("/retros/items/{item_id}/vote")
async def vote_retro_item(
    item_id: str,
    user: dict = Depends(get_current_user)
):
    """Add a vote to a retrospective item"""
    await db.retro_items.update_one(
        {"id": item_id},
        {"$inc": {"votes": 1}}
    )
    
    return await get_retro_item_response(item_id)


@router.delete("/retros/items/{item_id}")
async def delete_retro_item(
    item_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a retrospective item"""
    result = await db.retro_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item deleted"}


# ============== RETRO HELPER FUNCTIONS ==============

async def get_retro_response(retro_id: str) -> SprintRetroResponse:
    """Get enriched retrospective response"""
    retro = await db.sprint_retros.find_one({"id": retro_id}, {"_id": 0})
    if not retro:
        raise HTTPException(status_code=404, detail="Retrospective not found")
    
    # Get sprint info
    sprint = await db.pm_sprints.find_one(
        {"id": retro["sprint_id"]},
        {"_id": 0, "name": 1, "project_id": 1}
    )
    if sprint:
        retro["sprint_name"] = sprint.get("name")
        retro["project_id"] = sprint.get("project_id")
        
        # Get project name
        project = await db.pm_projects.find_one(
            {"id": sprint.get("project_id")},
            {"_id": 0, "name": 1}
        )
        retro["project_name"] = project.get("name") if project else None
    
    # Get facilitator name
    if retro.get("facilitator_id"):
        facilitator = await db.users.find_one(
            {"id": retro["facilitator_id"]},
            {"_id": 0, "name": 1}
        )
        retro["facilitator_name"] = facilitator.get("name") if facilitator else None
    
    # Get all items for this sprint
    items = await db.retro_items.find(
        {"sprint_id": retro["sprint_id"]},
        {"_id": 0}
    ).to_list(100)
    
    went_well = []
    didnt_go_well = []
    action_items = []
    total_votes = 0
    action_items_resolved = 0
    
    for item in items:
        enriched = await get_retro_item_response(item["id"])
        total_votes += enriched.votes
        
        if item["item_type"] == "went_well":
            went_well.append(enriched)
        elif item["item_type"] == "didnt_go_well":
            didnt_go_well.append(enriched)
        elif item["item_type"] == "action_item":
            action_items.append(enriched)
            if item.get("is_resolved"):
                action_items_resolved += 1
    
    # Sort by votes (descending)
    went_well.sort(key=lambda x: x.votes, reverse=True)
    didnt_go_well.sort(key=lambda x: x.votes, reverse=True)
    action_items.sort(key=lambda x: x.votes, reverse=True)
    
    retro["went_well"] = went_well
    retro["didnt_go_well"] = didnt_go_well
    retro["action_items"] = action_items
    retro["total_items"] = len(items)
    retro["total_votes"] = total_votes
    retro["action_items_total"] = len(action_items)
    retro["action_items_resolved"] = action_items_resolved
    
    return SprintRetroResponse(**retro)


async def get_retro_item_response(item_id: str) -> RetroItemResponse:
    """Get enriched retro item response"""
    item = await db.retro_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Get creator name
    creator = await db.users.find_one({"id": item["created_by"]}, {"_id": 0, "name": 1})
    item["created_by_name"] = creator.get("name") if creator else None
    
    # Get assignee name if action item
    if item.get("assigned_to"):
        assignee = await db.users.find_one({"id": item["assigned_to"]}, {"_id": 0, "name": 1})
        item["assigned_to_name"] = assignee.get("name") if assignee else None
    
    return RetroItemResponse(**item)
