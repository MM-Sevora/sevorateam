"""
Meeting & Review Management System - API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.meetings import (
    MeetingType, MeetingStatus, MeetingVisibility, ActionItemStatus, ActionItemPriority,
    RecurrenceType, MeetingCreate, MeetingUpdate, MeetingResponse, MeetingListItem,
    MeetingMinutesCreate, MeetingMinutesResponse, ConvertActionItemRequest,
    MeetingDashboardResponse, MeetingAnalyticsResponse, PreviousMeetingContext,
    AgendaItem, DiscussionNote, ActionItem, MeetingParticipant,
    Decision, DecisionImpact, IssueRisk, IssueRiskType, IssueRiskStatus, IssueRiskImpact
)

# Database and auth will be set from server.py
db = None
_get_current_user_func = None
security = HTTPBearer()


def set_database(database, auth_dependency=None):
    global db, _get_current_user_func
    db = database
    _get_current_user_func = auth_dependency


async def get_current_user_dep(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    if _get_current_user_func is None:
        raise HTTPException(status_code=500, detail="Auth not configured")
    return await _get_current_user_func(credentials)


router = APIRouter(prefix="/meetings", tags=["Meetings"])


# ============== HELPER FUNCTIONS ==============

async def get_user_name(user_id: str) -> Optional[str]:
    """Get user display name by ID"""
    if not user_id:
        return None
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "first_name": 1, "last_name": 1})
    if user:
        return f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    return None


async def get_department_name(dept_id: str) -> Optional[str]:
    """Get department name by ID"""
    if not dept_id:
        return None
    dept = await db.departments.find_one({"id": dept_id}, {"_id": 0, "name": 1})
    return dept.get("name") if dept else None


async def get_goal_name(goal_id: str) -> Optional[str]:
    """Get goal name by ID"""
    if not goal_id:
        return None
    goal = await db.strategic_goals.find_one({"id": goal_id}, {"_id": 0, "name": 1})
    return goal.get("name") if goal else None


async def get_objective_name(obj_id: str) -> Optional[str]:
    """Get objective name by ID"""
    if not obj_id:
        return None
    obj = await db.objectives.find_one({"id": obj_id}, {"_id": 0, "name": 1})
    return obj.get("name") if obj else None


async def get_project_name(project_id: str) -> Optional[str]:
    """Get project name by ID"""
    if not project_id:
        return None
    project = await db.projects.find_one({"id": project_id}, {"_id": 0, "name": 1})
    return project.get("name") if project else None


async def enrich_meeting(meeting: dict) -> dict:
    """Enrich meeting with related names"""
    meeting["organizer_name"] = await get_user_name(meeting.get("organizer_id"))
    meeting["department_name"] = await get_department_name(meeting.get("department_id"))
    meeting["linked_goal_name"] = await get_goal_name(meeting.get("linked_goal_id"))
    meeting["linked_objective_name"] = await get_objective_name(meeting.get("linked_objective_id"))
    meeting["linked_project_name"] = await get_project_name(meeting.get("linked_project_id"))
    meeting["created_by_name"] = await get_user_name(meeting.get("created_by"))
    
    # Enrich participants
    for p in meeting.get("participants", []):
        if p.get("user_id") and not p.get("name"):
            p["name"] = await get_user_name(p["user_id"])
    
    # Enrich action items
    for ai in meeting.get("action_items", []):
        if ai.get("assigned_to") and not ai.get("assigned_to_name"):
            ai["assigned_to_name"] = await get_user_name(ai["assigned_to"])
        if ai.get("linked_project_id") and not ai.get("linked_project_name"):
            ai["linked_project_name"] = await get_project_name(ai["linked_project_id"])
        if ai.get("linked_goal_id") and not ai.get("linked_goal_name"):
            ai["linked_goal_name"] = await get_goal_name(ai["linked_goal_id"])
    
    # Calculate action item stats
    action_items = meeting.get("action_items", [])
    meeting["total_action_items"] = len(action_items)
    meeting["completed_action_items"] = len([a for a in action_items if a.get("status") in ["completed", "converted_to_task"]])
    meeting["pending_action_items"] = len([a for a in action_items if a.get("status") in ["pending", "in_progress"]])
    
    return meeting


def meeting_to_list_item(meeting: dict) -> dict:
    """Convert meeting to list item format"""
    return {
        "id": meeting.get("id"),
        "title": meeting.get("title"),
        "meeting_type": meeting.get("meeting_type"),
        "start_time": meeting.get("start_time"),
        "end_time": meeting.get("end_time"),
        "location": meeting.get("location"),
        "organizer_name": meeting.get("organizer_name"),
        "participant_count": len(meeting.get("participants", [])),
        "status": meeting.get("status"),
        "linked_project_name": meeting.get("linked_project_name"),
        "linked_goal_name": meeting.get("linked_goal_name"),
        "department_name": meeting.get("department_name"),
        "has_action_items": len(meeting.get("action_items", [])) > 0
    }


# ============== MEETING CRUD ==============

@router.post("", response_model=MeetingResponse)
async def create_meeting(
    data: MeetingCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new meeting"""
    meeting_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate IDs for agenda items
    agenda = []
    for idx, item in enumerate(data.agenda):
        item_dict = item.dict()
        item_dict["id"] = str(uuid.uuid4())
        item_dict["order"] = idx
        agenda.append(item_dict)
    
    # Generate IDs for pre-read documents
    pre_reads = []
    for doc in data.pre_read_documents:
        doc_dict = doc.dict()
        doc_dict["id"] = str(uuid.uuid4())
        pre_reads.append(doc_dict)
    
    meeting = {
        "id": meeting_id,
        "title": data.title,
        "meeting_type": data.meeting_type.value,
        "description": data.description,
        "start_time": data.start_time,
        "end_time": data.end_time,
        "timezone": data.timezone,
        "location": data.location,
        "meeting_link": data.meeting_link,
        "organizer_id": data.organizer_id or user.get("id"),
        "participants": [p.dict() for p in data.participants],
        "department_id": data.department_id,
        "linked_goal_id": data.linked_goal_id,
        "linked_objective_id": data.linked_objective_id,
        "linked_project_id": data.linked_project_id,
        "linked_milestone_id": data.linked_milestone_id,
        "agenda": agenda,
        "pre_read_documents": pre_reads,
        "discussion_notes": [],
        "action_items": [],
        "visibility": data.visibility.value,
        "status": MeetingStatus.SCHEDULED.value,
        "recurrence_type": data.recurrence_type.value,
        "recurrence_day_of_week": data.recurrence_day_of_week,
        "recurrence_day_of_month": data.recurrence_day_of_month,
        "recurrence_end_date": data.recurrence_end_date,
        "parent_recurring_id": None,
        "sync_to_outlook": data.sync_to_outlook,
        "outlook_event_id": None,
        "created_by": user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.meetings.insert_one(meeting)
    
    # Enrich and return
    meeting = await enrich_meeting(meeting)
    return MeetingResponse(**meeting)


@router.get("", response_model=List[MeetingListItem])
async def list_meetings(
    status: Optional[str] = None,
    meeting_type: Optional[str] = None,
    department_id: Optional[str] = None,
    project_id: Optional[str] = None,
    goal_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    organizer_id: Optional[str] = None,
    participant_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    skip: int = 0,
    user: dict = Depends(get_current_user_dep)
):
    """List meetings with filters"""
    query = {}
    
    if status:
        query["status"] = status
    if meeting_type:
        query["meeting_type"] = meeting_type
    if department_id:
        query["department_id"] = department_id
    if project_id:
        query["linked_project_id"] = project_id
    if goal_id:
        query["linked_goal_id"] = goal_id
    if organizer_id:
        query["organizer_id"] = organizer_id
    if participant_id:
        query["participants.user_id"] = participant_id
    if start_date:
        query["start_time"] = {"$gte": start_date}
    if end_date:
        if "start_time" in query:
            query["start_time"]["$lte"] = end_date
        else:
            query["start_time"] = {"$lte": end_date}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    meetings = await db.meetings.find(
        query, {"_id": 0}
    ).sort("start_time", -1).skip(skip).limit(limit).to_list(limit)
    
    result = []
    for meeting in meetings:
        meeting = await enrich_meeting(meeting)
        result.append(meeting_to_list_item(meeting))
    
    return result


@router.get("/calendar")
async def get_calendar_meetings(
    start_date: str,
    end_date: str,
    department_id: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get meetings for calendar view"""
    query = {
        "start_time": {"$gte": start_date, "$lte": end_date}
    }
    
    if department_id:
        query["department_id"] = department_id
    
    meetings = await db.meetings.find(
        query, {"_id": 0}
    ).sort("start_time", 1).to_list(500)
    
    result = []
    for meeting in meetings:
        meeting = await enrich_meeting(meeting)
        result.append({
            "id": meeting.get("id"),
            "title": meeting.get("title"),
            "start": meeting.get("start_time"),
            "end": meeting.get("end_time"),
            "meeting_type": meeting.get("meeting_type"),
            "status": meeting.get("status"),
            "location": meeting.get("location"),
            "organizer_name": meeting.get("organizer_name"),
            "linked_project_name": meeting.get("linked_project_name"),
            "participant_count": len(meeting.get("participants", []))
        })
    
    return result


@router.get("/my-meetings")
async def get_my_meetings(
    status: Optional[str] = None,
    upcoming_only: bool = False,
    limit: int = Query(default=20, le=100),
    user: dict = Depends(get_current_user_dep)
):
    """Get current user's meetings (as organizer or participant)"""
    user_id = user.get("id")
    now = datetime.now(timezone.utc).isoformat()
    
    query = {
        "$or": [
            {"organizer_id": user_id},
            {"participants.user_id": user_id}
        ]
    }
    
    if status:
        query["status"] = status
    if upcoming_only:
        query["start_time"] = {"$gte": now}
    
    meetings = await db.meetings.find(
        query, {"_id": 0}
    ).sort("start_time", 1 if upcoming_only else -1).limit(limit).to_list(limit)
    
    result = []
    for meeting in meetings:
        meeting = await enrich_meeting(meeting)
        result.append(meeting_to_list_item(meeting))
    
    return result


# ============== GLOBAL DECISION LOG (must be before /{meeting_id}) ==============

@router.get("/all-decisions")
async def get_all_decisions(
    project_id: Optional[str] = None,
    goal_id: Optional[str] = None,
    impact: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    user: dict = Depends(get_current_user_dep)
):
    """Get all decisions across meetings"""
    pipeline = [
        {"$unwind": "$decisions"},
        {"$match": {"decisions": {"$exists": True}}}
    ]
    
    if project_id:
        pipeline.append({"$match": {"decisions.linked_project_id": project_id}})
    if goal_id:
        pipeline.append({"$match": {"decisions.linked_goal_id": goal_id}})
    if impact:
        pipeline.append({"$match": {"decisions.impact": impact}})
    if start_date:
        pipeline.append({"$match": {"decisions.decision_date": {"$gte": start_date}}})
    if end_date:
        pipeline.append({"$match": {"decisions.decision_date": {"$lte": end_date}}})
    
    pipeline.extend([
        {"$project": {
            "_id": 0,
            "meeting_id": "$id",
            "meeting_title": "$title",
            "decision": "$decisions"
        }},
        {"$sort": {"decision.decision_date": -1}},
        {"$limit": limit}
    ])
    
    results = await db.meetings.aggregate(pipeline).to_list(limit)
    return results


# ============== GLOBAL ISSUES & RISKS (must be before /{meeting_id}) ==============

@router.get("/all-issues-risks")
async def get_all_issues_risks(
    type: Optional[str] = None,
    status: Optional[str] = None,
    project_id: Optional[str] = None,
    impact: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    user: dict = Depends(get_current_user_dep)
):
    """Get all issues and risks across meetings"""
    pipeline = [
        {"$unwind": "$issues_risks"},
        {"$match": {"issues_risks": {"$exists": True}}}
    ]
    
    if type:
        pipeline.append({"$match": {"issues_risks.type": type}})
    if status:
        pipeline.append({"$match": {"issues_risks.status": status}})
    if project_id:
        pipeline.append({"$match": {"issues_risks.linked_project_id": project_id}})
    if impact:
        pipeline.append({"$match": {"issues_risks.impact": impact}})
    
    pipeline.extend([
        {"$project": {
            "_id": 0,
            "meeting_id": "$id",
            "meeting_title": "$title",
            "item": "$issues_risks"
        }},
        {"$sort": {"item.created_at": -1}},
        {"$limit": limit}
    ])
    
    results = await db.meetings.aggregate(pipeline).to_list(limit)
    return results


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get meeting details"""
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting = await enrich_meeting(meeting)
    return MeetingResponse(**meeting)


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: str,
    data: MeetingUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a meeting"""
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    
    # Convert enums to values
    if "meeting_type" in update_data:
        update_data["meeting_type"] = update_data["meeting_type"].value
    if "visibility" in update_data:
        update_data["visibility"] = update_data["visibility"].value
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    if "recurrence_type" in update_data:
        update_data["recurrence_type"] = update_data["recurrence_type"].value
    if "participants" in update_data:
        update_data["participants"] = [p.dict() if hasattr(p, 'dict') else p for p in update_data["participants"]]
    if "agenda" in update_data:
        agenda = []
        for idx, item in enumerate(update_data["agenda"]):
            item_dict = item.dict() if hasattr(item, 'dict') else item
            if not item_dict.get("id"):
                item_dict["id"] = str(uuid.uuid4())
            item_dict["order"] = idx
            agenda.append(item_dict)
        update_data["agenda"] = agenda
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": update_data}
    )
    
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    meeting = await enrich_meeting(meeting)
    return MeetingResponse(**meeting)


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a meeting"""
    result = await db.meetings.delete_one({"id": meeting_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Also delete meeting minutes
    await db.meeting_minutes.delete_many({"meeting_id": meeting_id})
    
    return {"message": "Meeting deleted successfully"}


@router.post("/{meeting_id}/start")
async def start_meeting(
    meeting_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Start a meeting (change status to in_progress)"""
    result = await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {
            "status": MeetingStatus.IN_PROGRESS.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return {"message": "Meeting started"}


@router.post("/{meeting_id}/complete")
async def complete_meeting(
    meeting_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Complete a meeting"""
    result = await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {
            "status": MeetingStatus.COMPLETED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return {"message": "Meeting completed"}


# ============== DISCUSSION NOTES ==============

@router.post("/{meeting_id}/notes")
async def add_discussion_note(
    meeting_id: str,
    topic: str,
    notes: str,
    related_goal_id: Optional[str] = None,
    related_project_id: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Add a discussion note to a meeting"""
    note = {
        "id": str(uuid.uuid4()),
        "topic": topic,
        "notes": notes,
        "related_goal_id": related_goal_id,
        "related_goal_name": await get_goal_name(related_goal_id) if related_goal_id else None,
        "related_project_id": related_project_id,
        "related_project_name": await get_project_name(related_project_id) if related_project_id else None,
        "created_by": user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.meetings.update_one(
        {"id": meeting_id},
        {
            "$push": {"discussion_notes": note},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return note


@router.delete("/{meeting_id}/notes/{note_id}")
async def delete_discussion_note(
    meeting_id: str,
    note_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a discussion note"""
    result = await db.meetings.update_one(
        {"id": meeting_id},
        {
            "$pull": {"discussion_notes": {"id": note_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return {"message": "Note deleted"}


# ============== ACTION ITEMS ==============

@router.post("/{meeting_id}/action-items")
async def add_action_item(
    meeting_id: str,
    title: str,
    description: Optional[str] = None,
    assigned_to: Optional[str] = None,
    deadline: Optional[str] = None,
    priority: ActionItemPriority = ActionItemPriority.MEDIUM,
    linked_project_id: Optional[str] = None,
    linked_goal_id: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Add an action item to a meeting"""
    action_item = {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": description,
        "assigned_to": assigned_to,
        "assigned_to_name": await get_user_name(assigned_to) if assigned_to else None,
        "deadline": deadline,
        "priority": priority.value,
        "status": ActionItemStatus.PENDING.value,
        "linked_project_id": linked_project_id,
        "linked_project_name": await get_project_name(linked_project_id) if linked_project_id else None,
        "linked_goal_id": linked_goal_id,
        "linked_goal_name": await get_goal_name(linked_goal_id) if linked_goal_id else None,
        "converted_task_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    result = await db.meetings.update_one(
        {"id": meeting_id},
        {
            "$push": {"action_items": action_item},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return action_item


@router.put("/{meeting_id}/action-items/{action_item_id}")
async def update_action_item(
    meeting_id: str,
    action_item_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    assigned_to: Optional[str] = None,
    deadline: Optional[str] = None,
    priority: Optional[ActionItemPriority] = None,
    status: Optional[ActionItemStatus] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Update an action item"""
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    action_items = meeting.get("action_items", [])
    item_found = False
    
    for item in action_items:
        if item.get("id") == action_item_id:
            item_found = True
            if title is not None:
                item["title"] = title
            if description is not None:
                item["description"] = description
            if assigned_to is not None:
                item["assigned_to"] = assigned_to
                item["assigned_to_name"] = await get_user_name(assigned_to)
            if deadline is not None:
                item["deadline"] = deadline
            if priority is not None:
                item["priority"] = priority.value
            if status is not None:
                item["status"] = status.value
                if status == ActionItemStatus.COMPLETED:
                    item["completed_at"] = datetime.now(timezone.utc).isoformat()
            break
    
    if not item_found:
        raise HTTPException(status_code=404, detail="Action item not found")
    
    await db.meetings.update_one(
        {"id": meeting_id},
        {
            "$set": {
                "action_items": action_items,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Action item updated"}


@router.post("/{meeting_id}/action-items/{action_item_id}/convert-to-task")
async def convert_action_item_to_task(
    meeting_id: str,
    action_item_id: str,
    project_id: Optional[str] = None,
    module_id: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Convert an action item to a task (with confirmation)"""
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Find the action item
    action_item = None
    for item in meeting.get("action_items", []):
        if item.get("id") == action_item_id:
            action_item = item
            break
    
    if not action_item:
        raise HTTPException(status_code=404, detail="Action item not found")
    
    if action_item.get("status") == ActionItemStatus.CONVERTED_TO_TASK.value:
        raise HTTPException(status_code=400, detail="Action item already converted to task")
    
    # Use linked project from action item if not provided
    task_project_id = project_id or action_item.get("linked_project_id")
    
    # Create the task
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    task = {
        "id": task_id,
        "name": action_item.get("title"),
        "description": action_item.get("description") or f"Action item from meeting: {meeting.get('title')}",
        "project_id": task_project_id,
        "module_id": module_id,
        "assigned_to": action_item.get("assigned_to"),
        "due_date": action_item.get("deadline"),
        "priority": action_item.get("priority", "medium"),
        "status": "todo",
        "tags": ["from-meeting"],
        "source_meeting_id": meeting_id,
        "source_action_item_id": action_item_id,
        "created_by": user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.pm_tasks.insert_one(task)
    
    # Update the action item status
    action_items = meeting.get("action_items", [])
    for item in action_items:
        if item.get("id") == action_item_id:
            item["status"] = ActionItemStatus.CONVERTED_TO_TASK.value
            item["converted_task_id"] = task_id
            break
    
    await db.meetings.update_one(
        {"id": meeting_id},
        {
            "$set": {
                "action_items": action_items,
                "updated_at": now
            }
        }
    )
    
    return {
        "message": "Action item converted to task",
        "task_id": task_id
    }


@router.delete("/{meeting_id}/action-items/{action_item_id}")
async def delete_action_item(
    meeting_id: str,
    action_item_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete an action item"""
    result = await db.meetings.update_one(
        {"id": meeting_id},
        {
            "$pull": {"action_items": {"id": action_item_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return {"message": "Action item deleted"}


# ============== MEETING MINUTES ==============

@router.post("/{meeting_id}/minutes", response_model=MeetingMinutesResponse)
async def create_meeting_minutes(
    meeting_id: str,
    data: MeetingMinutesCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create meeting minutes (manual or auto-generated)"""
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting = await enrich_meeting(meeting)
    minutes_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Build agenda summary from meeting agenda
    agenda_items = meeting.get("agenda", [])
    agenda_summary = "\n".join([f"- {item.get('title')}" for item in agenda_items]) if agenda_items else None
    
    # Get participant names
    participants = [p.get("name") or await get_user_name(p.get("user_id")) for p in meeting.get("participants", [])]
    
    minutes = {
        "id": minutes_id,
        "meeting_id": meeting_id,
        "meeting_title": meeting.get("title"),
        "meeting_date": meeting.get("start_time"),
        "participants": [p for p in participants if p],
        "summary": data.summary,
        "agenda_summary": agenda_summary,
        "key_discussions": data.key_discussions,
        "decisions": data.decisions,
        "action_items": meeting.get("action_items", []),
        "next_steps": data.next_steps,
        "auto_generated": data.auto_generated,
        "created_by": user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.meeting_minutes.insert_one(minutes)
    
    return MeetingMinutesResponse(**minutes)


@router.get("/{meeting_id}/minutes", response_model=MeetingMinutesResponse)
async def get_meeting_minutes(
    meeting_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get meeting minutes"""
    minutes = await db.meeting_minutes.find_one({"meeting_id": meeting_id}, {"_id": 0})
    
    if not minutes:
        raise HTTPException(status_code=404, detail="Meeting minutes not found")
    
    return MeetingMinutesResponse(**minutes)


@router.post("/{meeting_id}/minutes/generate")
async def generate_meeting_minutes(
    meeting_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Auto-generate meeting minutes from meeting data"""
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting = await enrich_meeting(meeting)
    
    # Build summary from discussion notes
    discussion_notes = meeting.get("discussion_notes", [])
    key_discussions = "\n\n".join([
        f"**{note.get('topic')}**\n{note.get('notes')}"
        for note in discussion_notes
    ]) if discussion_notes else "No discussion notes recorded."
    
    # Build action items summary
    action_items = meeting.get("action_items", [])
    next_steps = "\n".join([
        f"- {item.get('title')} (Assigned to: {item.get('assigned_to_name', 'TBD')}, Due: {item.get('deadline', 'TBD')})"
        for item in action_items
    ]) if action_items else "No action items."
    
    # Create minutes data
    data = MeetingMinutesCreate(
        meeting_id=meeting_id,
        summary=f"Meeting held on {meeting.get('start_time', 'N/A')}",
        key_discussions=key_discussions,
        decisions="",  # Would need to add decision tracking for this
        next_steps=next_steps,
        auto_generated=True
    )
    
    return await create_meeting_minutes(meeting_id, data, user)


# ============== PREVIOUS MEETING CONTEXT ==============

@router.get("/{meeting_id}/previous-context", response_model=PreviousMeetingContext)
async def get_previous_meeting_context(
    meeting_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get context from previous related meeting"""
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Find previous meeting of same type with same linkage
    query = {
        "id": {"$ne": meeting_id},
        "meeting_type": meeting.get("meeting_type"),
        "start_time": {"$lt": meeting.get("start_time")},
        "status": MeetingStatus.COMPLETED.value
    }
    
    # Match by project, goal, or department
    if meeting.get("linked_project_id"):
        query["linked_project_id"] = meeting.get("linked_project_id")
    elif meeting.get("linked_goal_id"):
        query["linked_goal_id"] = meeting.get("linked_goal_id")
    elif meeting.get("department_id"):
        query["department_id"] = meeting.get("department_id")
    
    previous = await db.meetings.find_one(
        query,
        {"_id": 0},
        sort=[("start_time", -1)]
    )
    
    if not previous:
        return PreviousMeetingContext()
    
    previous = await enrich_meeting(previous)
    now = datetime.now(timezone.utc).isoformat()
    
    # Categorize action items
    action_items = previous.get("action_items", [])
    pending = [a for a in action_items if a.get("status") in ["pending", "in_progress"]]
    completed = [a for a in action_items if a.get("status") in ["completed", "converted_to_task"]]
    overdue = [a for a in pending if a.get("deadline") and a.get("deadline") < now]
    
    # Get previous minutes for summary
    minutes = await db.meeting_minutes.find_one({"meeting_id": previous.get("id")}, {"_id": 0})
    
    return PreviousMeetingContext(
        previous_meeting_id=previous.get("id"),
        previous_meeting_title=previous.get("title"),
        previous_meeting_date=previous.get("start_time"),
        pending_action_items=pending,
        completed_action_items=completed,
        overdue_action_items=overdue,
        previous_summary=minutes.get("summary") if minutes else None,
        key_decisions=[]  # Would need decision log for this
    )


# ============== DASHBOARD ==============

@router.get("/dashboard/overview", response_model=MeetingDashboardResponse)
async def get_meeting_dashboard(
    user: dict = Depends(get_current_user_dep)
):
    """Get meeting dashboard data"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Count meetings
    total_this_month = await db.meetings.count_documents({
        "start_time": {"$gte": month_start.isoformat()}
    })
    
    meetings_today = await db.meetings.count_documents({
        "start_time": {
            "$gte": today_start.isoformat(),
            "$lt": (today_start + timedelta(days=1)).isoformat()
        }
    })
    
    upcoming = await db.meetings.count_documents({
        "start_time": {"$gte": now.isoformat()},
        "status": MeetingStatus.SCHEDULED.value
    })
    
    completed = await db.meetings.count_documents({
        "status": MeetingStatus.COMPLETED.value
    })
    
    # Get all action items from meetings
    meetings_with_actions = await db.meetings.find(
        {"action_items.0": {"$exists": True}},
        {"_id": 0, "action_items": 1}
    ).to_list(1000)
    
    all_action_items = []
    for m in meetings_with_actions:
        all_action_items.extend(m.get("action_items", []))
    
    total_action_items = len(all_action_items)
    pending_action_items = len([a for a in all_action_items if a.get("status") in ["pending", "in_progress"]])
    completed_action_items = len([a for a in all_action_items if a.get("status") in ["completed", "converted_to_task"]])
    overdue_action_items = len([
        a for a in all_action_items 
        if a.get("status") in ["pending", "in_progress"] 
        and a.get("deadline") 
        and a.get("deadline") < now.isoformat()
    ])
    
    # Meetings by type
    by_type_pipeline = [
        {"$group": {"_id": "$meeting_type", "count": {"$sum": 1}}}
    ]
    by_type_raw = await db.meetings.aggregate(by_type_pipeline).to_list(20)
    meetings_by_type = {item["_id"]: item["count"] for item in by_type_raw}
    
    # Recent meetings
    recent_raw = await db.meetings.find(
        {"status": MeetingStatus.COMPLETED.value},
        {"_id": 0}
    ).sort("start_time", -1).limit(5).to_list(5)
    
    recent_meetings = []
    for m in recent_raw:
        m = await enrich_meeting(m)
        recent_meetings.append(meeting_to_list_item(m))
    
    # Upcoming meetings
    upcoming_raw = await db.meetings.find(
        {"start_time": {"$gte": now.isoformat()}, "status": MeetingStatus.SCHEDULED.value},
        {"_id": 0}
    ).sort("start_time", 1).limit(5).to_list(5)
    
    upcoming_list = []
    for m in upcoming_raw:
        m = await enrich_meeting(m)
        upcoming_list.append(meeting_to_list_item(m))
    
    # Overdue action items list
    overdue_list = [
        a for a in all_action_items 
        if a.get("status") in ["pending", "in_progress"] 
        and a.get("deadline") 
        and a.get("deadline") < now.isoformat()
    ][:10]
    
    return MeetingDashboardResponse(
        total_meetings_this_month=total_this_month,
        meetings_today=meetings_today,
        upcoming_meetings=upcoming,
        completed_meetings=completed,
        total_action_items=total_action_items,
        pending_action_items=pending_action_items,
        completed_action_items=completed_action_items,
        overdue_action_items=overdue_action_items,
        meetings_by_type=meetings_by_type,
        recent_meetings=recent_meetings,
        upcoming_meeting_list=upcoming_list,
        overdue_action_list=overdue_list
    )


# ============== ANALYTICS ==============

@router.get("/analytics/overview", response_model=MeetingAnalyticsResponse)
async def get_meeting_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get meeting analytics"""
    query = {}
    if start_date:
        query["start_time"] = {"$gte": start_date}
    if end_date:
        if "start_time" in query:
            query["start_time"]["$lte"] = end_date
        else:
            query["start_time"] = {"$lte": end_date}
    
    # Total meetings
    total_meetings = await db.meetings.count_documents(query)
    
    # Get all action items
    meetings_with_actions = await db.meetings.find(
        {"action_items.0": {"$exists": True}, **query},
        {"_id": 0, "action_items": 1}
    ).to_list(1000)
    
    all_action_items = []
    for m in meetings_with_actions:
        all_action_items.extend(m.get("action_items", []))
    
    total_action_items = len(all_action_items)
    action_items_completed = len([a for a in all_action_items if a.get("status") in ["completed", "converted_to_task"]])
    completion_rate = round((action_items_completed / total_action_items * 100), 1) if total_action_items > 0 else 0
    
    # Meetings by month (last 6 months)
    now = datetime.now(timezone.utc)
    meetings_by_month = []
    for i in range(6):
        month_start = (now - timedelta(days=30*i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            month_end = (now - timedelta(days=30*(i-1))).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            month_end = now + timedelta(days=1)
        
        count = await db.meetings.count_documents({
            "start_time": {"$gte": month_start.isoformat(), "$lt": month_end.isoformat()}
        })
        meetings_by_month.append({
            "month": month_start.strftime("%b %Y"),
            "count": count
        })
    meetings_by_month.reverse()
    
    # By department
    by_dept_pipeline = [
        {"$match": {"department_id": {"$ne": None}}},
        {"$group": {"_id": "$department_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    by_dept_raw = await db.meetings.aggregate(by_dept_pipeline).to_list(10)
    
    meetings_by_department = []
    for item in by_dept_raw:
        dept_name = await get_department_name(item["_id"])
        meetings_by_department.append({
            "department_id": item["_id"],
            "department_name": dept_name or "Unknown",
            "count": item["count"]
        })
    
    # By type
    by_type_pipeline = [
        {"$group": {"_id": "$meeting_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_type_raw = await db.meetings.aggregate(by_type_pipeline).to_list(20)
    meetings_by_type = [{"type": item["_id"], "count": item["count"]} for item in by_type_raw]
    
    # Top organizers
    by_organizer_pipeline = [
        {"$match": {"organizer_id": {"$ne": None}}},
        {"$group": {"_id": "$organizer_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    by_organizer_raw = await db.meetings.aggregate(by_organizer_pipeline).to_list(5)
    
    top_organizers = []
    for item in by_organizer_raw:
        name = await get_user_name(item["_id"])
        top_organizers.append({
            "user_id": item["_id"],
            "name": name or "Unknown",
            "meetings_organized": item["count"]
        })
    
    return MeetingAnalyticsResponse(
        total_meetings=total_meetings,
        total_decisions=0,  # Would need decision log
        total_action_items=total_action_items,
        action_items_completed=action_items_completed,
        completion_rate=completion_rate,
        meetings_by_month=meetings_by_month,
        action_items_by_month=[],  # Would need timestamp on action items
        meetings_by_department=meetings_by_department,
        meetings_by_type=meetings_by_type,
        top_organizers=top_organizers
    )



# ============== DECISIONS ==============

@router.post("/{meeting_id}/decisions")
async def add_decision(
    meeting_id: str,
    title: str,
    description: Optional[str] = None,
    decision_owner: Optional[str] = None,
    impact: DecisionImpact = DecisionImpact.MEDIUM,
    impact_area: Optional[str] = None,
    linked_goal_id: Optional[str] = None,
    linked_project_id: Optional[str] = None,
    rationale: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Add a decision to a meeting"""
    decision = {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": description,
        "decision_owner": decision_owner,
        "decision_owner_name": await get_user_name(decision_owner) if decision_owner else None,
        "decision_date": datetime.now(timezone.utc).isoformat(),
        "impact": impact.value,
        "impact_area": impact_area,
        "linked_goal_id": linked_goal_id,
        "linked_goal_name": await get_goal_name(linked_goal_id) if linked_goal_id else None,
        "linked_project_id": linked_project_id,
        "linked_project_name": await get_project_name(linked_project_id) if linked_project_id else None,
        "rationale": rationale,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.meetings.update_one(
        {"id": meeting_id},
        {
            "$push": {"decisions": decision},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return decision


@router.put("/{meeting_id}/decisions/{decision_id}")
async def update_decision(
    meeting_id: str,
    decision_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    decision_owner: Optional[str] = None,
    impact: Optional[DecisionImpact] = None,
    impact_area: Optional[str] = None,
    rationale: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Update a decision"""
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    decisions = meeting.get("decisions", [])
    item_found = False
    
    for item in decisions:
        if item.get("id") == decision_id:
            item_found = True
            if title is not None:
                item["title"] = title
            if description is not None:
                item["description"] = description
            if decision_owner is not None:
                item["decision_owner"] = decision_owner
                item["decision_owner_name"] = await get_user_name(decision_owner)
            if impact is not None:
                item["impact"] = impact.value
            if impact_area is not None:
                item["impact_area"] = impact_area
            if rationale is not None:
                item["rationale"] = rationale
            break
    
    if not item_found:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    await db.meetings.update_one(
        {"id": meeting_id},
        {
            "$set": {
                "decisions": decisions,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Decision updated"}


@router.delete("/{meeting_id}/decisions/{decision_id}")
async def delete_decision(
    meeting_id: str,
    decision_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a decision"""
    result = await db.meetings.update_one(
        {"id": meeting_id},
        {
            "$pull": {"decisions": {"id": decision_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return {"message": "Decision deleted"}


# ============== ISSUES & RISKS ==============

@router.post("/{meeting_id}/issues-risks")
async def add_issue_risk(
    meeting_id: str,
    type: IssueRiskType,
    title: str,
    description: Optional[str] = None,
    impact: IssueRiskImpact = IssueRiskImpact.MEDIUM,
    probability: Optional[str] = None,
    owner: Optional[str] = None,
    resolution_plan: Optional[str] = None,
    linked_project_id: Optional[str] = None,
    due_date: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Add an issue or risk to a meeting"""
    issue_risk = {
        "id": str(uuid.uuid4()),
        "type": type.value,
        "title": title,
        "description": description,
        "impact": impact.value,
        "probability": probability,
        "owner": owner,
        "owner_name": await get_user_name(owner) if owner else None,
        "resolution_plan": resolution_plan,
        "status": IssueRiskStatus.OPEN.value,
        "linked_project_id": linked_project_id,
        "linked_project_name": await get_project_name(linked_project_id) if linked_project_id else None,
        "due_date": due_date,
        "resolved_date": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.meetings.update_one(
        {"id": meeting_id},
        {
            "$push": {"issues_risks": issue_risk},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return issue_risk


@router.put("/{meeting_id}/issues-risks/{item_id}")
async def update_issue_risk(
    meeting_id: str,
    item_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    impact: Optional[IssueRiskImpact] = None,
    probability: Optional[str] = None,
    owner: Optional[str] = None,
    resolution_plan: Optional[str] = None,
    status: Optional[IssueRiskStatus] = None,
    due_date: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Update an issue or risk"""
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    issues_risks = meeting.get("issues_risks", [])
    item_found = False
    
    for item in issues_risks:
        if item.get("id") == item_id:
            item_found = True
            if title is not None:
                item["title"] = title
            if description is not None:
                item["description"] = description
            if impact is not None:
                item["impact"] = impact.value
            if probability is not None:
                item["probability"] = probability
            if owner is not None:
                item["owner"] = owner
                item["owner_name"] = await get_user_name(owner)
            if resolution_plan is not None:
                item["resolution_plan"] = resolution_plan
            if status is not None:
                item["status"] = status.value
                if status in [IssueRiskStatus.RESOLVED, IssueRiskStatus.MITIGATED, IssueRiskStatus.CLOSED]:
                    item["resolved_date"] = datetime.now(timezone.utc).isoformat()
            if due_date is not None:
                item["due_date"] = due_date
            break
    
    if not item_found:
        raise HTTPException(status_code=404, detail="Issue/Risk not found")
    
    await db.meetings.update_one(
        {"id": meeting_id},
        {
            "$set": {
                "issues_risks": issues_risks,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Issue/Risk updated"}


@router.delete("/{meeting_id}/issues-risks/{item_id}")
async def delete_issue_risk(
    meeting_id: str,
    item_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete an issue or risk"""
    result = await db.meetings.update_one(
        {"id": meeting_id},
        {
            "$pull": {"issues_risks": {"id": item_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return {"message": "Issue/Risk deleted"}
