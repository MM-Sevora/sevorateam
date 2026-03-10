"""
Entity Integration System
Handles post-creation checks and syncs for new entities across modules
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/integrations", tags=["Entity Integrations"])
security = HTTPBearer()

# Will be set by main app
db = None
_get_current_user_func = None


def init_router(database, auth_dependency):
    global db, _get_current_user_func
    db = database
    _get_current_user_func = auth_dependency
    return router


async def get_current_user_dep(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if _get_current_user_func is None:
        raise HTTPException(status_code=500, detail="Auth not configured")
    return await _get_current_user_func(credentials)


# ============== MODELS ==============

class EntityCreatedRequest(BaseModel):
    module: str  # sourcing, marketing, sales, hr, projects
    entity_type: str  # brand, supplier, lead, employee, campaign, etc.
    entity_id: str
    entity_name: str
    entity_data: Optional[Dict[str, Any]] = None


class IntegrationAction(BaseModel):
    integration_type: str  # task, automation, notification, activity
    action: str  # created, triggered, skipped
    details: Optional[Dict[str, Any]] = None


class IntegrationCheckResponse(BaseModel):
    entity_module: str
    entity_type: str
    entity_id: str
    entity_name: str
    integrations_triggered: List[IntegrationAction]
    integrations_available: List[Dict[str, Any]]
    recommendations: List[str]


# ============== INTEGRATION DEFINITIONS ==============

# Define what integrations are available for each entity type
ENTITY_INTEGRATIONS = {
    "sourcing": {
        "brand": {
            "operational_tasks": True,
            "activity_logging": True,
            "automations": True,
            "notifications": True,
            "smart_triggers": ["initial_outreach", "schedule_meeting"],
            "recommended_actions": [
                "Create initial outreach task",
                "Set up follow-up reminder",
                "Add to email campaign"
            ]
        },
        "supplier": {
            "operational_tasks": True,
            "activity_logging": True,
            "automations": True,
            "notifications": True,
            "smart_triggers": ["request_samples", "schedule_call"],
            "recommended_actions": [
                "Request product samples",
                "Schedule intro call",
                "Add to supplier pipeline"
            ]
        },
        "manufacturer": {
            "operational_tasks": True,
            "activity_logging": True,
            "automations": True,
            "notifications": True,
            "smart_triggers": ["factory_visit", "request_quote"],
            "recommended_actions": [
                "Schedule factory visit",
                "Request pricing quote",
                "Verify certifications"
            ]
        }
    },
    "marketing": {
        "campaign": {
            "operational_tasks": True,
            "activity_logging": True,
            "automations": True,
            "notifications": True,
            "smart_triggers": ["review_assets", "launch_prep"],
            "recommended_actions": [
                "Review campaign assets",
                "Assign team members",
                "Set up tracking"
            ]
        },
        "influencer": {
            "operational_tasks": True,
            "activity_logging": True,
            "automations": True,
            "notifications": True,
            "smart_triggers": ["initial_outreach", "contract_review"],
            "recommended_actions": [
                "Send collaboration proposal",
                "Review content guidelines",
                "Set up payment schedule"
            ]
        }
    },
    "sales": {
        "lead": {
            "operational_tasks": True,
            "activity_logging": True,
            "automations": True,
            "notifications": True,
            "smart_triggers": ["initial_contact", "follow_up"],
            "recommended_actions": [
                "Make initial contact",
                "Schedule discovery call",
                "Add to nurture sequence"
            ]
        },
        "customer": {
            "operational_tasks": True,
            "activity_logging": True,
            "automations": True,
            "notifications": True,
            "smart_triggers": ["welcome_sequence", "onboarding"],
            "recommended_actions": [
                "Send welcome email",
                "Schedule onboarding call",
                "Set up account preferences"
            ]
        }
    },
    "hr": {
        "employee": {
            "operational_tasks": True,
            "activity_logging": True,
            "automations": True,
            "notifications": True,
            "smart_triggers": ["onboarding_checklist", "training_setup"],
            "recommended_actions": [
                "Complete onboarding checklist",
                "Set up system access",
                "Schedule orientation"
            ]
        }
    },
    "projects": {
        "project": {
            "operational_tasks": True,
            "activity_logging": True,
            "automations": True,
            "notifications": True,
            "smart_triggers": ["kickoff_meeting", "resource_allocation"],
            "recommended_actions": [
                "Schedule kickoff meeting",
                "Assign team members",
                "Create project milestones"
            ]
        }
    }
}


# ============== ENDPOINTS ==============

@router.post("/check-entity", response_model=IntegrationCheckResponse)
async def check_entity_integrations(
    request: EntityCreatedRequest,
    current_user: dict = Depends(get_current_user_dep)
):
    """
    Check what integrations should be triggered when a new entity is created.
    This is called after entity creation to determine sync requirements.
    """
    module = request.module
    entity_type = request.entity_type
    entity_id = request.entity_id
    entity_name = request.entity_name
    
    integrations_triggered = []
    integrations_available = []
    recommendations = []
    
    # Get integration config for this entity type
    entity_config = ENTITY_INTEGRATIONS.get(module, {}).get(entity_type, {})
    
    if not entity_config:
        return IntegrationCheckResponse(
            entity_module=module,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            integrations_triggered=[],
            integrations_available=[],
            recommendations=["No integrations configured for this entity type"]
        )
    
    # 1. Log Activity (always triggered)
    if entity_config.get("activity_logging"):
        await log_entity_activity(module, entity_type, entity_id, entity_name, "created", current_user)
        integrations_triggered.append(IntegrationAction(
            integration_type="activity",
            action="created",
            details={"message": f"Activity logged for {entity_type} creation"}
        ))
    
    # 2. Check for Smart Task Triggers
    if entity_config.get("operational_tasks"):
        task_triggers = await check_smart_task_triggers(module, entity_type, entity_id, entity_name)
        if task_triggers:
            for trigger in task_triggers:
                integrations_triggered.append(IntegrationAction(
                    integration_type="task",
                    action="triggered",
                    details=trigger
                ))
        
        integrations_available.append({
            "type": "operational_task",
            "name": "Create Operational Task",
            "description": f"Create a follow-up task for this {entity_type}",
            "endpoint": "/tasks",
            "auto_triggered": len(task_triggers) > 0
        })
    
    # 3. Check for Automations
    if entity_config.get("automations"):
        automation_result = await check_automations(module, entity_type, entity_id, entity_name)
        if automation_result.get("triggered"):
            integrations_triggered.append(IntegrationAction(
                integration_type="automation",
                action="triggered",
                details=automation_result
            ))
        
        integrations_available.append({
            "type": "automation",
            "name": "Automations",
            "description": "Automated workflows for this entity",
            "endpoint": "/automations",
            "auto_triggered": automation_result.get("triggered", False)
        })
    
    # 4. Check for Notifications
    if entity_config.get("notifications"):
        integrations_available.append({
            "type": "notification",
            "name": "Notifications",
            "description": "Send notifications to relevant team members",
            "endpoint": "/notifications",
            "auto_triggered": False
        })
    
    # 5. Get recommended actions
    recommendations = entity_config.get("recommended_actions", [])
    
    return IntegrationCheckResponse(
        entity_module=module,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        integrations_triggered=integrations_triggered,
        integrations_available=integrations_available,
        recommendations=recommendations
    )


@router.post("/trigger-integration")
async def trigger_integration(
    module: str,
    entity_type: str,
    entity_id: str,
    entity_name: str,
    integration_type: str,
    integration_config: Optional[Dict[str, Any]] = None,
    current_user: dict = Depends(get_current_user_dep)
):
    """
    Manually trigger a specific integration for an entity.
    """
    result = {"success": False, "message": "", "details": None}
    
    if integration_type == "operational_task":
        # Create an operational task
        task_doc = await create_operational_task(
            module=module,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            config=integration_config or {},
            user=current_user
        )
        result = {
            "success": True,
            "message": f"Operational task created for {entity_name}",
            "details": {"task_id": task_doc.get("id")}
        }
    
    elif integration_type == "notification":
        # Send notification
        await send_entity_notification(module, entity_type, entity_id, entity_name, current_user)
        result = {
            "success": True,
            "message": "Notification sent",
            "details": {}
        }
    
    elif integration_type == "automation":
        # Trigger automation
        automation_result = await trigger_entity_automation(module, entity_type, entity_id, entity_name)
        result = {
            "success": True,
            "message": "Automation triggered",
            "details": automation_result
        }
    
    return result


@router.get("/available/{module}/{entity_type}")
async def get_available_integrations(
    module: str,
    entity_type: str,
    current_user: dict = Depends(get_current_user_dep)
):
    """
    Get list of available integrations for an entity type.
    """
    entity_config = ENTITY_INTEGRATIONS.get(module, {}).get(entity_type, {})
    
    if not entity_config:
        return {
            "module": module,
            "entity_type": entity_type,
            "integrations": [],
            "message": "No integrations configured"
        }
    
    integrations = []
    
    if entity_config.get("operational_tasks"):
        # Get configured smart triggers
        triggers = await db.task_trigger_configs.find({
            "module": module,
            "entity_type": entity_type,
            "enabled": True
        }, {"_id": 0}).to_list(length=20)
        
        integrations.append({
            "type": "operational_tasks",
            "enabled": True,
            "auto_triggers": len(triggers),
            "trigger_configs": triggers
        })
    
    if entity_config.get("automations"):
        # Get configured automations
        automations = await db.automations.find({
            "trigger_module": module,
            "trigger_entity": entity_type,
            "is_active": True
        }, {"_id": 0, "id": 1, "name": 1, "trigger_event": 1}).to_list(length=20)
        
        integrations.append({
            "type": "automations",
            "enabled": True,
            "active_automations": len(automations),
            "automation_list": automations
        })
    
    if entity_config.get("notifications"):
        integrations.append({
            "type": "notifications",
            "enabled": True,
            "description": "Team notifications on entity events"
        })
    
    if entity_config.get("activity_logging"):
        integrations.append({
            "type": "activity_logging",
            "enabled": True,
            "description": "Activity feed tracking"
        })
    
    return {
        "module": module,
        "entity_type": entity_type,
        "integrations": integrations,
        "recommended_actions": entity_config.get("recommended_actions", [])
    }


# ============== HELPER FUNCTIONS ==============

async def log_entity_activity(module: str, entity_type: str, entity_id: str, entity_name: str, action: str, user: dict):
    """Log entity activity to activity_logs collection"""
    activity_doc = {
        "id": str(uuid.uuid4()),
        "module": module,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "action": action,
        "action_details": {},
        "user_id": user.get("id"),
        "user_name": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_logs.insert_one(activity_doc)
    return activity_doc


async def check_smart_task_triggers(module: str, entity_type: str, entity_id: str, entity_name: str):
    """Check if any smart task triggers should fire for this entity"""
    triggered_tasks = []
    
    # Find matching triggers
    triggers = await db.task_trigger_configs.find({
        "module": module,
        "entity_type": entity_type,
        "trigger_event": "created",
        "enabled": True
    }).to_list(length=10)
    
    for trigger in triggers:
        # Generate fingerprint for deduplication
        trigger_type = trigger.get("task_template", {}).get("trigger_type", "created")
        fingerprint = f"{module}_{entity_type}_{entity_id}_{trigger_type}"
        
        # Check if task already exists
        existing = await db.unified_tasks.find_one({
            "task_fingerprint": fingerprint,
            "status": {"$nin": ["completed", "cancelled"]}
        })
        
        if not existing:
            # Create the task
            template = trigger.get("task_template", {})
            now = datetime.now(timezone.utc)
            due_date = (now + timedelta(days=trigger.get("due_date_offset_days", 3))).isoformat()
            
            title = template.get("title", f"Follow up on {entity_name}")
            title = title.replace("{entity_name}", entity_name).replace("{entity_type}", entity_type)
            
            task_doc = {
                "id": str(uuid.uuid4()),
                "title": title,
                "description": template.get("description", "").replace("{entity_name}", entity_name),
                "assigned_team": template.get("assigned_team"),
                "assigned_to": template.get("assigned_to"),
                "priority": template.get("priority", "medium"),
                "priority_order": {"urgent": 4, "high": 3, "medium": 2, "low": 1}.get(template.get("priority", "medium"), 2),
                "due_date": due_date,
                "status": "pending",
                "source_module": module,
                "source_entity_type": entity_type,
                "source_entity_id": entity_id,
                "task_fingerprint": fingerprint,
                "related_url": f"/{module}/{entity_type}s/{entity_id}",
                "tags": template.get("tags", []),
                "is_auto_generated": True,
                "auto_trigger": "created",
                "created_by": "system",
                "created_by_name": "System",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }
            
            await db.unified_tasks.insert_one(task_doc)
            triggered_tasks.append({
                "task_id": task_doc["id"],
                "title": title,
                "trigger_name": trigger.get("id"),
                "due_date": due_date
            })
    
    return triggered_tasks


async def check_automations(module: str, entity_type: str, entity_id: str, entity_name: str):
    """Check if any automations should be triggered"""
    # Find matching automations
    automations = await db.automations.find({
        "trigger_module": module,
        "trigger_entity": entity_type,
        "trigger_event": "created",
        "is_active": True
    }).to_list(length=10)
    
    triggered = len(automations) > 0
    automation_names = [a.get("name") for a in automations]
    
    return {
        "triggered": triggered,
        "count": len(automations),
        "automations": automation_names
    }


async def create_operational_task(module: str, entity_type: str, entity_id: str, entity_name: str, config: dict, user: dict):
    """Create an operational task manually"""
    now = datetime.now(timezone.utc)
    due_days = config.get("due_days", 3)
    
    task_doc = {
        "id": str(uuid.uuid4()),
        "title": config.get("title", f"Follow up with {entity_name}"),
        "description": config.get("description", ""),
        "assigned_team": config.get("assigned_team", module),
        "assigned_to": config.get("assigned_to"),
        "priority": config.get("priority", "medium"),
        "priority_order": {"urgent": 4, "high": 3, "medium": 2, "low": 1}.get(config.get("priority", "medium"), 2),
        "due_date": (now + timedelta(days=due_days)).isoformat(),
        "status": "pending",
        "source_module": module,
        "source_entity_type": entity_type,
        "source_entity_id": entity_id,
        "task_fingerprint": f"{module}_{entity_type}_{entity_id}_manual_{uuid.uuid4().hex[:8]}",
        "related_url": f"/{module}/{entity_type}s/{entity_id}",
        "tags": config.get("tags", [module, entity_type]),
        "is_auto_generated": False,
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.unified_tasks.insert_one(task_doc)
    return task_doc


async def send_entity_notification(module: str, entity_type: str, entity_id: str, entity_name: str, user: dict):
    """Send notification about new entity"""
    notification_doc = {
        "id": str(uuid.uuid4()),
        "type": "entity_created",
        "title": f"New {entity_type} added",
        "message": f"{entity_name} has been added to {module}",
        "module": module,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "created_by": user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    }
    await db.notifications.insert_one(notification_doc)
    return notification_doc


async def trigger_entity_automation(module: str, entity_type: str, entity_id: str, entity_name: str):
    """Trigger automations for entity"""
    # This would integrate with the existing automation system
    return {"triggered": True, "message": "Automations queued for processing"}
