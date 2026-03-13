"""
Automation Triggers Service - Cross-Module Automation, Sync, Alerts & Notifications

This service provides trigger functions that can be called from various endpoints
to automate notifications, task creation, and follow-ups across modules.

Modules covered:
- Sourcing: Samples, Brands, Suppliers
- Marketing: Campaigns, Influencer Deals, Content
- Sales: Leads, Follow-ups
- HR: Expense claims
- Cross-module: Digests, Mentions, Escalations
"""
import logging
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List, Any

logger = logging.getLogger(__name__)

# Will be initialized from server.py
db = None


def init_automation_triggers(database):
    """Initialize with database connection"""
    global db
    db = database


# ============== SOURCING MODULE TRIGGERS ==============

async def trigger_sample_status_changed(
    sample_id: str,
    sample_name: str,
    old_status: str,
    new_status: str,
    changed_by_id: str,
    changed_by_name: str,
    brand_name: str = None,
    assigned_to: str = None
):
    """
    Trigger when sample status changes (requested → received → approved/rejected)
    Notifies: Sample creator, assigned person, relevant stakeholders
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    if db is None:
        logger.warning("Database not initialized for automation triggers")
        return
    
    # Get sample details
    sample = await db.sourcing_samples.find_one({"id": sample_id}, {"_id": 0})
    if not sample:
        return
    
    # Determine notification priority based on status
    priority = NotificationPriority.HIGH if new_status in ["approved", "rejected"] else NotificationPriority.MEDIUM
    
    # Build notification targets
    notify_targets = set()
    if sample.get("created_by"):
        notify_targets.add(sample["created_by"])
    if assigned_to:
        notify_targets.add(assigned_to)
    if sample.get("requested_by"):
        notify_targets.add(sample["requested_by"])
    
    # Remove the person who made the change
    notify_targets.discard(changed_by_id)
    
    # Create notifications
    for user_id in notify_targets:
        await create_notification(
            user_id=user_id,
            notification_type=NotificationType.SAMPLE_STATUS_CHANGED,
            category=NotificationCategory.SOURCING,
            title=f"Sample Status: {new_status.title()}",
            message=f"Sample '{sample_name}'{' from ' + brand_name if brand_name else ''} is now {new_status}",
            priority=priority,
            entity_type="sample",
            entity_id=sample_id,
            action_url=f"/sourcing/samples/{sample_id}",
            metadata={
                "old_status": old_status,
                "new_status": new_status,
                "changed_by": changed_by_name,
                "brand_name": brand_name
            }
        )
    
    # Auto-create follow-up task if sample is received
    if new_status == "received":
        await _create_auto_task(
            title=f"Review sample: {sample_name}",
            description=f"Sample from {brand_name or 'supplier'} has been received. Please review and update status.",
            assigned_to=sample.get("requested_by") or sample.get("created_by"),
            source_module="sourcing",
            source_entity_type="sample",
            source_entity_id=sample_id,
            due_days=3,
            priority="high"
        )
    
    logger.info(f"Sample status change trigger: {sample_id} -> {new_status}")


async def trigger_brand_stage_changed(
    brand_id: str,
    brand_name: str,
    old_stage: str,
    new_stage: str,
    changed_by_id: str,
    changed_by_name: str
):
    """
    Trigger when brand pipeline stage changes
    Auto-creates follow-up tasks based on stage
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    if db is None:
        return
    
    brand = await db.sourcing_brands.find_one({"id": brand_id}, {"_id": 0})
    if not brand:
        return
    
    # Notify brand owner and assigned team
    notify_targets = set()
    if brand.get("created_by"):
        notify_targets.add(brand["created_by"])
    if brand.get("assigned_to"):
        notify_targets.add(brand["assigned_to"])
    notify_targets.discard(changed_by_id)
    
    for user_id in notify_targets:
        await create_notification(
            user_id=user_id,
            notification_type=NotificationType.BRAND_STAGE_CHANGED,
            category=NotificationCategory.SOURCING,
            title=f"Brand Stage: {new_stage.replace('_', ' ').title()}",
            message=f"'{brand_name}' moved from {old_stage.replace('_', ' ')} to {new_stage.replace('_', ' ')}",
            priority=NotificationPriority.MEDIUM,
            entity_type="brand",
            entity_id=brand_id,
            action_url=f"/sourcing/brands/{brand_id}",
            metadata={"old_stage": old_stage, "new_stage": new_stage, "changed_by": changed_by_name}
        )
    
    # Auto-create follow-up tasks based on stage
    stage_tasks = {
        "contacted": ("Schedule intro call with {brand}", "Reach out to schedule initial discussion", 2),
        "meeting_scheduled": ("Prepare for meeting with {brand}", "Review brand profile and prepare discussion points", 1),
        "sample_requested": ("Follow up on sample from {brand}", "Check sample delivery status", 5),
        "negotiating": ("Send proposal to {brand}", "Prepare and send commercial proposal", 3),
        "onboarded": ("Complete onboarding for {brand}", "Set up brand in system and initiate first order", 5)
    }
    
    if new_stage in stage_tasks:
        task_title, task_desc, due_days = stage_tasks[new_stage]
        await _create_auto_task(
            title=task_title.format(brand=brand_name),
            description=task_desc,
            assigned_to=brand.get("assigned_to") or brand.get("created_by"),
            source_module="sourcing",
            source_entity_type="brand",
            source_entity_id=brand_id,
            due_days=due_days,
            priority="medium"
        )


async def trigger_supplier_delivery_due(
    supplier_id: str,
    supplier_name: str,
    delivery_date: str,
    order_details: str = None
):
    """
    Trigger reminder for upcoming supplier delivery
    Called by scheduler for deliveries due in 3 days, 1 day, and on due date
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    if db is None:
        return
    
    supplier = await db.sourcing_suppliers.find_one({"id": supplier_id}, {"_id": 0})
    if not supplier:
        return
    
    # Calculate days until due
    due_date = datetime.fromisoformat(delivery_date.replace('Z', '+00:00'))
    days_until = (due_date - datetime.now(timezone.utc)).days
    
    if days_until == 0:
        title = f"Delivery Due Today: {supplier_name}"
        priority = NotificationPriority.HIGH
    elif days_until == 1:
        title = f"Delivery Tomorrow: {supplier_name}"
        priority = NotificationPriority.HIGH
    else:
        title = f"Delivery in {days_until} days: {supplier_name}"
        priority = NotificationPriority.MEDIUM
    
    notify_targets = set()
    if supplier.get("created_by"):
        notify_targets.add(supplier["created_by"])
    if supplier.get("assigned_to"):
        notify_targets.add(supplier["assigned_to"])
    
    for user_id in notify_targets:
        await create_notification(
            user_id=user_id,
            notification_type=NotificationType.SUPPLIER_DELIVERY_DUE,
            category=NotificationCategory.SOURCING,
            title=title,
            message=order_details or f"Delivery from {supplier_name} is due",
            priority=priority,
            entity_type="supplier",
            entity_id=supplier_id,
            action_url=f"/sourcing/suppliers/{supplier_id}",
            metadata={"delivery_date": delivery_date, "days_until": days_until}
        )


# ============== MARKETING MODULE TRIGGERS ==============

async def trigger_campaign_deadline_approaching(
    campaign_id: str,
    campaign_name: str,
    deadline: str,
    campaign_type: str = "influencer"
):
    """
    Trigger when campaign deadline is approaching (3 days, 1 day before)
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    if db is None:
        return
    
    collection = "marketing_campaigns" if campaign_type == "influencer" else "pr_campaigns"
    campaign = await db[collection].find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        return
    
    due_date = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
    days_until = (due_date - datetime.now(timezone.utc)).days
    
    priority = NotificationPriority.HIGH if days_until <= 1 else NotificationPriority.MEDIUM
    
    notify_targets = set()
    if campaign.get("created_by"):
        notify_targets.add(campaign["created_by"])
    if campaign.get("owner_id"):
        notify_targets.add(campaign["owner_id"])
    for member in campaign.get("team_members", []):
        if isinstance(member, str):
            notify_targets.add(member)
        elif isinstance(member, dict):
            notify_targets.add(member.get("id"))
    
    for user_id in notify_targets:
        if user_id:
            await create_notification(
                user_id=user_id,
                notification_type=NotificationType.CAMPAIGN_DEADLINE_APPROACHING,
                category=NotificationCategory.MARKETING,
                title=f"Campaign Deadline: {days_until} day{'s' if days_until != 1 else ''} left",
                message=f"'{campaign_name}' deadline is approaching",
                priority=priority,
                entity_type="campaign",
                entity_id=campaign_id,
                action_url=f"/marketing/campaigns/{campaign_id}",
                metadata={"deadline": deadline, "days_until": days_until, "campaign_type": campaign_type}
            )


async def trigger_influencer_deal_status_changed(
    deal_id: str,
    influencer_name: str,
    campaign_name: str,
    old_status: str,
    new_status: str,
    changed_by_id: str,
    changed_by_name: str
):
    """
    Trigger when influencer deal status changes (contacted → negotiating → confirmed → completed)
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    if db is None:
        return
    
    deal = await db.influencer_deals.find_one({"id": deal_id}, {"_id": 0})
    if not deal:
        return
    
    # High priority for confirmations and completions
    priority = NotificationPriority.HIGH if new_status in ["confirmed", "completed", "cancelled"] else NotificationPriority.MEDIUM
    
    notify_targets = set()
    if deal.get("created_by"):
        notify_targets.add(deal["created_by"])
    if deal.get("account_manager"):
        notify_targets.add(deal["account_manager"])
    notify_targets.discard(changed_by_id)
    
    status_messages = {
        "confirmed": f"🎉 {influencer_name} has confirmed for '{campaign_name}'",
        "negotiating": f"{influencer_name} is now in negotiation for '{campaign_name}'",
        "completed": f"✅ Deal with {influencer_name} for '{campaign_name}' is complete",
        "cancelled": f"❌ Deal with {influencer_name} for '{campaign_name}' was cancelled"
    }
    
    message = status_messages.get(new_status, f"{influencer_name}'s deal status changed to {new_status}")
    
    for user_id in notify_targets:
        await create_notification(
            user_id=user_id,
            notification_type=NotificationType.INFLUENCER_DEAL_STATUS_CHANGED,
            category=NotificationCategory.MARKETING,
            title=f"Deal Update: {new_status.title()}",
            message=message,
            priority=priority,
            entity_type="deal",
            entity_id=deal_id,
            action_url=f"/marketing/deals/{deal_id}",
            metadata={
                "old_status": old_status,
                "new_status": new_status,
                "influencer_name": influencer_name,
                "campaign_name": campaign_name
            }
        )
    
    # Auto-create task on confirmation
    if new_status == "confirmed":
        await _create_auto_task(
            title=f"Prepare content brief for {influencer_name}",
            description=f"Create and send content brief for campaign '{campaign_name}'",
            assigned_to=deal.get("account_manager") or deal.get("created_by"),
            source_module="marketing",
            source_entity_type="deal",
            source_entity_id=deal_id,
            due_days=2,
            priority="high"
        )


async def trigger_content_approval_pending(
    content_id: str,
    content_title: str,
    campaign_name: str,
    submitted_by_id: str,
    submitted_by_name: str,
    approver_ids: List[str]
):
    """
    Trigger when content is submitted for approval
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    for approver_id in approver_ids:
        await create_notification(
            user_id=approver_id,
            notification_type=NotificationType.CONTENT_APPROVAL_PENDING,
            category=NotificationCategory.APPROVAL,
            title="Content Awaiting Approval",
            message=f"{submitted_by_name} submitted '{content_title}' for review",
            priority=NotificationPriority.HIGH,
            entity_type="content",
            entity_id=content_id,
            action_url=f"/marketing/content/{content_id}",
            metadata={
                "campaign_name": campaign_name,
                "submitted_by": submitted_by_name
            }
        )


# ============== SALES MODULE TRIGGERS ==============

async def trigger_lead_stage_changed(
    lead_id: str,
    lead_name: str,
    old_stage: str,
    new_stage: str,
    changed_by_id: str,
    changed_by_name: str
):
    """
    Trigger when lead stage changes in the pipeline
    Auto-creates follow-up tasks based on stage
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    if db is None:
        return
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        return
    
    # High priority for advanced stages
    high_priority_stages = ["styling_session_scheduled", "order_confirmed", "trial_selection"]
    priority = NotificationPriority.HIGH if new_stage.lower().replace(" ", "_") in high_priority_stages else NotificationPriority.MEDIUM
    
    notify_targets = set()
    if lead.get("created_by"):
        notify_targets.add(lead["created_by"])
    if lead.get("assigned_to"):
        notify_targets.add(lead["assigned_to"])
    notify_targets.discard(changed_by_id)
    
    for user_id in notify_targets:
        await create_notification(
            user_id=user_id,
            notification_type=NotificationType.LEAD_STAGE_CHANGED,
            category=NotificationCategory.SALES,
            title=f"Lead Stage: {new_stage}",
            message=f"'{lead_name}' moved to {new_stage}",
            priority=priority,
            entity_type="lead",
            entity_id=lead_id,
            action_url=f"/sales/leads/{lead_id}",
            metadata={"old_stage": old_stage, "new_stage": new_stage, "changed_by": changed_by_name}
        )
    
    # Auto-create tasks based on stage
    stage_tasks = {
        "Contacted": ("Follow up with {lead}", "Send follow-up message or call", 2),
        "Styling Session Scheduled": ("Prepare for styling session with {lead}", "Review preferences and prepare options", 1),
        "Trial / Selection": ("Follow up on trial with {lead}", "Check in on selection progress", 3),
        "Order Confirmed": ("Process order for {lead}", "Initiate order processing and delivery coordination", 1)
    }
    
    if new_stage in stage_tasks:
        task_title, task_desc, due_days = stage_tasks[new_stage]
        await _create_auto_task(
            title=task_title.format(lead=lead_name),
            description=task_desc,
            assigned_to=lead.get("assigned_to") or lead.get("created_by"),
            source_module="sales",
            source_entity_type="lead",
            source_entity_id=lead_id,
            due_days=due_days,
            priority="high" if new_stage == "Order Confirmed" else "medium"
        )


async def trigger_stale_lead_reminder(
    lead_id: str,
    lead_name: str,
    days_stale: int,
    last_activity_date: str
):
    """
    Trigger reminder for leads with no activity for X days
    Called by scheduler
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    if db is None:
        return
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        return
    
    notify_targets = set()
    if lead.get("assigned_to"):
        notify_targets.add(lead["assigned_to"])
    if lead.get("created_by"):
        notify_targets.add(lead["created_by"])
    
    priority = NotificationPriority.HIGH if days_stale >= 7 else NotificationPriority.MEDIUM
    
    for user_id in notify_targets:
        await create_notification(
            user_id=user_id,
            notification_type=NotificationType.LEAD_STALE_REMINDER,
            category=NotificationCategory.SALES,
            title=f"Stale Lead: {days_stale} days inactive",
            message=f"'{lead_name}' hasn't been updated in {days_stale} days",
            priority=priority,
            entity_type="lead",
            entity_id=lead_id,
            action_url=f"/sales/leads/{lead_id}",
            metadata={"days_stale": days_stale, "last_activity": last_activity_date}
        )


async def trigger_lead_followup_due(
    lead_id: str,
    lead_name: str,
    followup_date: str,
    followup_note: str = None
):
    """
    Trigger when lead follow-up is due
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    if db is None:
        return
    
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        return
    
    notify_targets = set()
    if lead.get("assigned_to"):
        notify_targets.add(lead["assigned_to"])
    if lead.get("created_by"):
        notify_targets.add(lead["created_by"])
    
    for user_id in notify_targets:
        await create_notification(
            user_id=user_id,
            notification_type=NotificationType.LEAD_FOLLOWUP_DUE,
            category=NotificationCategory.SALES,
            title="Follow-up Due Today",
            message=f"Follow up with '{lead_name}'" + (f": {followup_note}" if followup_note else ""),
            priority=NotificationPriority.HIGH,
            entity_type="lead",
            entity_id=lead_id,
            action_url=f"/sales/leads/{lead_id}",
            metadata={"followup_date": followup_date, "note": followup_note}
        )


# ============== HR MODULE TRIGGERS ==============

async def trigger_expense_status_changed(
    expense_id: str,
    expense_title: str,
    amount: float,
    old_status: str,
    new_status: str,
    employee_id: str,
    reviewer_name: str = None,
    rejection_reason: str = None
):
    """
    Trigger when expense claim status changes
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    notification_type = NotificationType.EXPENSE_STATUS_CHANGED
    if new_status == "approved":
        notification_type = NotificationType.EXPENSE_APPROVED
        title = "Expense Approved"
        message = f"Your expense '{expense_title}' (₹{amount:,.2f}) has been approved"
        priority = NotificationPriority.MEDIUM
    elif new_status == "rejected":
        notification_type = NotificationType.EXPENSE_REJECTED
        title = "Expense Rejected"
        message = f"Your expense '{expense_title}' was rejected"
        if rejection_reason:
            message += f": {rejection_reason}"
        priority = NotificationPriority.HIGH
    else:
        title = f"Expense Status: {new_status.title()}"
        message = f"Your expense '{expense_title}' status changed to {new_status}"
        priority = NotificationPriority.MEDIUM
    
    await create_notification(
        user_id=employee_id,
        notification_type=notification_type,
        category=NotificationCategory.HR,
        title=title,
        message=message,
        priority=priority,
        entity_type="expense",
        entity_id=expense_id,
        action_url=f"/hr/expenses/{expense_id}",
        metadata={
            "old_status": old_status,
            "new_status": new_status,
            "amount": amount,
            "reviewer": reviewer_name,
            "rejection_reason": rejection_reason
        }
    )


# ============== CROSS-MODULE TRIGGERS ==============

async def trigger_mention(
    mentioned_user_id: str,
    mentioner_id: str,
    mentioner_name: str,
    context_type: str,  # task, comment, project, etc.
    context_id: str,
    context_name: str,
    mention_text: str
):
    """
    Universal @mention trigger that works across all modules
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    # Don't notify if user mentions themselves
    if mentioned_user_id == mentioner_id:
        return
    
    # Determine action URL based on context
    url_map = {
        "task": f"/tasks?id={context_id}",
        "project": f"/projects/{context_id}",
        "comment": f"/tasks?id={context_id}",
        "lead": f"/sales/leads/{context_id}",
        "brand": f"/sourcing/brands/{context_id}",
        "campaign": f"/marketing/campaigns/{context_id}",
        "pulse": f"/pulse?post={context_id}"
    }
    
    await create_notification(
        user_id=mentioned_user_id,
        notification_type=NotificationType.USER_MENTIONED,
        category=NotificationCategory.MENTION,
        title=f"{mentioner_name} mentioned you",
        message=f"In {context_type}: {mention_text[:100]}{'...' if len(mention_text) > 100 else ''}",
        priority=NotificationPriority.HIGH,
        entity_type=context_type,
        entity_id=context_id,
        action_url=url_map.get(context_type, f"/{context_type}s/{context_id}"),
        metadata={
            "mentioner_id": mentioner_id,
            "mentioner_name": mentioner_name,
            "context_name": context_name
        }
    )


async def trigger_blocked_item_escalation(
    item_type: str,  # task, project, lead, etc.
    item_id: str,
    item_name: str,
    blocked_days: int,
    blocked_reason: str = None,
    owner_id: str = None,
    escalate_to_ids: List[str] = None
):
    """
    Trigger escalation for items blocked too long
    """
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    notify_targets = set()
    if owner_id:
        notify_targets.add(owner_id)
    if escalate_to_ids:
        notify_targets.update(escalate_to_ids)
    
    for user_id in notify_targets:
        await create_notification(
            user_id=user_id,
            notification_type=NotificationType.BLOCKED_ITEM_ESCALATION,
            category=NotificationCategory.SYSTEM,
            title=f"⚠️ Blocked {item_type.title()}: {blocked_days} days",
            message=f"'{item_name}' has been blocked for {blocked_days} days" + (f": {blocked_reason}" if blocked_reason else ""),
            priority=NotificationPriority.HIGH,
            entity_type=item_type,
            entity_id=item_id,
            action_url=f"/{item_type}s/{item_id}",
            metadata={
                "blocked_days": blocked_days,
                "blocked_reason": blocked_reason
            }
        )


# ============== HELPER FUNCTIONS ==============

async def _create_auto_task(
    title: str,
    description: str,
    assigned_to: str,
    source_module: str,
    source_entity_type: str,
    source_entity_id: str,
    due_days: int = 3,
    priority: str = "medium"
):
    """Helper to create automated follow-up tasks"""
    from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
    
    if not db or not assigned_to:
        return None
    
    task_id = str(uuid.uuid4())
    due_date = (datetime.now(timezone.utc) + timedelta(days=due_days)).isoformat()
    
    task = {
        "id": task_id,
        "title": title,
        "description": description,
        "status": "pending",
        "priority": priority,
        "assigned_to": assigned_to,
        "source_module": source_module,
        "source_entity_type": source_entity_type,
        "source_entity_id": source_entity_id,
        "due_date": due_date,
        "is_auto_generated": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.unified_tasks.insert_one(task)
    
    # Notify assignee
    await create_notification(
        user_id=assigned_to,
        notification_type=NotificationType.TASK_ASSIGNED,
        category=NotificationCategory.TASK,
        title="Auto-generated Task",
        message=f"New task: {title}",
        priority=NotificationPriority.MEDIUM,
        entity_type="task",
        entity_id=task_id,
        action_url=f"/tasks?id={task_id}",
        metadata={
            "source_module": source_module,
            "source_entity_type": source_entity_type,
            "source_entity_id": source_entity_id,
            "is_auto_generated": True
        }
    )
    
    logger.info(f"Auto-created task: {task_id} for {source_module}/{source_entity_type}/{source_entity_id}")
    return task_id


async def extract_mentions(text: str) -> List[str]:
    """
    Extract @mentions from text and return list of user IDs
    Supports formats: @username, @[User Name], @user_id
    """
    import re
    
    if not text or not db:
        return []
    
    # Find all @mentions
    mention_pattern = r'@\[([^\]]+)\]|@(\w+)'
    matches = re.findall(mention_pattern, text)
    
    mentioned_names = []
    for match in matches:
        name = match[0] or match[1]
        if name:
            mentioned_names.append(name)
    
    if not mentioned_names:
        return []
    
    # Look up user IDs by name
    user_ids = []
    for name in mentioned_names:
        user = await db.users.find_one(
            {"$or": [
                {"name": {"$regex": f"^{name}$", "$options": "i"}},
                {"username": {"$regex": f"^{name}$", "$options": "i"}},
                {"id": name}
            ]},
            {"id": 1}
        )
        if user:
            user_ids.append(user["id"])
    
    return user_ids
