"""
Sevora Pulse - Integration Service
Handles auto-posting from all modules to Pulse
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

# Database reference (set by init)
db = None

def init_integration_service(database):
    """Initialize the integration service with database"""
    global db
    db = database
    logger.info("Pulse Integration Service initialized")


# ============== POST TYPES ==============

POST_TYPES = {
    "announcement": {"emoji": "📢", "label": "Announcement"},
    "achievement": {"emoji": "🏆", "label": "Achievement"},
    "appreciation": {"emoji": "❤️", "label": "Appreciation"},
    "operational": {"emoji": "⚙️", "label": "Operational"},
    "issue": {"emoji": "⚠️", "label": "Issue"},
    "update": {"emoji": "💬", "label": "Update"},
}


# ============== CORE AUTO-POST FUNCTION ==============

async def create_auto_post(
    title: str,
    content: str,
    post_type: str,
    source_module: str,
    source_id: str = None,
    department: str = None,
    visibility: str = "public",
    author_id: str = None,
    author_name: str = "System",
    tags: List[str] = None,
    priority: str = "normal",
    notify_users: List[str] = None
) -> Optional[dict]:
    """
    Create an automated post on Pulse from any module
    
    Args:
        title: Post title
        content: Post content
        post_type: announcement, achievement, appreciation, operational, issue, update
        source_module: projects, goals, hr, sales, social, etc.
        source_id: ID of the source item (project_id, goal_id, etc.)
        department: Target department (or None for all)
        visibility: public, department, team, private
        author_id: User ID who triggered this (or None for system)
        author_name: Display name for the post author
        tags: List of tags to add
        priority: normal, high, urgent
        notify_users: List of user IDs to notify
    
    Returns:
        Created post document or None if failed
    """
    if db is None:
        logger.warning("Database not initialized for Pulse integration")
        return None
    
    try:
        post_id = str(uuid.uuid4())
        
        post_doc = {
            "id": post_id,
            "title": title,
            "content": content,
            "post_type": post_type,
            "visibility": visibility,
            "department": department,
            "author_id": author_id or "system",
            "author_name": author_name,
            "author_department": department,
            "tags": tags or [],
            "priority": priority,
            "is_pinned": False,
            "is_edited": False,
            "is_auto_generated": True,
            "source_module": source_module,
            "source_id": source_id,
            "linked_module": source_module,
            "linked_item_id": source_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        await db.pulse_posts.insert_one(post_doc)
        
        # Create notifications for specified users
        if notify_users:
            notifications = []
            for user_id in notify_users:
                notifications.append({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "notification_type": "pulse_auto_post",
                    "category": "pulse",
                    "title": f"New {post_type}: {title[:50]}",
                    "message": content[:100] + "..." if len(content) > 100 else content,
                    "priority": priority,
                    "entity_type": "pulse_post",
                    "entity_id": post_id,
                    "action_url": f"/pulse?post={post_id}",
                    "is_read": False,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
            
            if notifications:
                await db.notifications.insert_many(notifications)
        
        logger.info(f"Auto-post created: {post_type} from {source_module} - {title}")
        
        # Remove MongoDB _id
        if "_id" in post_doc:
            del post_doc["_id"]
        
        # Broadcast via WebSocket for real-time feed updates
        try:
            from services.websocket_service import manager
            await manager.broadcast_pulse_post(
                post=post_doc,
                department=department if visibility == "department" else None
            )
            logger.debug(f"WebSocket broadcast sent for auto-post: {title}")
        except Exception as ws_error:
            logger.warning(f"Failed to broadcast auto-post via WebSocket: {ws_error}")
        
        return post_doc
        
    except Exception as e:
        logger.error(f"Failed to create auto-post: {e}")
        return None


# ============== PROJECT INTEGRATIONS ==============

async def on_project_completed(project: dict, completed_by: dict):
    """Auto-post when a project is completed"""
    return await create_auto_post(
        title=f"🎉 Project Completed: {project.get('name')}",
        content=f"Great news! The project \"{project.get('name')}\" has been successfully completed.\n\n"
                f"Completed by: {completed_by.get('name', 'Team')}\n"
                f"Department: {project.get('department', 'General').title()}",
        post_type="achievement",
        source_module="projects",
        source_id=project.get("id"),
        department=project.get("department"),
        author_id=completed_by.get("id"),
        author_name=completed_by.get("name", "System"),
        tags=["project-completion", project.get("department", "general")],
        priority="normal"
    )


async def on_project_milestone_reached(project: dict, milestone: dict, user: dict):
    """Auto-post when a project milestone is reached"""
    return await create_auto_post(
        title=f"🏁 Milestone Reached: {milestone.get('name')}",
        content=f"Project \"{project.get('name')}\" has reached a milestone!\n\n"
                f"Milestone: {milestone.get('name')}\n"
                f"Progress: {milestone.get('progress', 0)}%",
        post_type="achievement",
        source_module="projects",
        source_id=project.get("id"),
        department=project.get("department"),
        author_id=user.get("id"),
        author_name=user.get("name", "System"),
        tags=["milestone", project.get("department", "general")],
        priority="normal"
    )


async def on_project_started(project: dict, created_by: dict):
    """Auto-post when a new project starts"""
    return await create_auto_post(
        title=f"🚀 New Project: {project.get('name')}",
        content=f"A new project has been kicked off!\n\n"
                f"Project: {project.get('name')}\n"
                f"Description: {project.get('description', 'No description')[:200]}\n"
                f"Lead: {created_by.get('name', 'TBD')}",
        post_type="announcement",
        source_module="projects",
        source_id=project.get("id"),
        department=project.get("department"),
        author_id=created_by.get("id"),
        author_name=created_by.get("name", "System"),
        tags=["new-project", project.get("department", "general")],
        priority="normal"
    )


# ============== TASK INTEGRATIONS ==============

async def on_critical_task_completed(task: dict, completed_by: dict):
    """Auto-post when a critical/high-priority task is completed"""
    return await create_auto_post(
        title=f"✅ Critical Task Completed: {task.get('title')}",
        content=f"A critical task has been completed!\n\n"
                f"Task: {task.get('title')}\n"
                f"Completed by: {completed_by.get('name', 'Team member')}",
        post_type="operational",
        source_module="tasks",
        source_id=task.get("id"),
        department=task.get("department"),
        author_id=completed_by.get("id"),
        author_name=completed_by.get("name", "System"),
        tags=["task-completed", "critical"],
        priority="normal"
    )


async def on_blocker_reported(task: dict, reported_by: dict, blocker_description: str):
    """Auto-post when a blocker is reported"""
    return await create_auto_post(
        title=f"⚠️ Blocker Reported: {task.get('title')}",
        content=f"A blocker has been reported that needs attention.\n\n"
                f"Task: {task.get('title')}\n"
                f"Blocker: {blocker_description}\n"
                f"Reported by: {reported_by.get('name', 'Team member')}",
        post_type="issue",
        source_module="tasks",
        source_id=task.get("id"),
        department=task.get("department"),
        author_id=reported_by.get("id"),
        author_name=reported_by.get("name", "System"),
        tags=["blocker", "needs-attention"],
        priority="high"
    )


# ============== GOALS INTEGRATIONS ==============

async def on_okr_progress_milestone(objective: dict, key_result: dict, progress: int, user: dict):
    """Auto-post when OKR hits 25%, 50%, 75%, or 100%"""
    emoji = "🎯" if progress < 100 else "🏆"
    return await create_auto_post(
        title=f"{emoji} OKR Progress: {progress}% - {objective.get('name')[:50]}",
        content=f"Great progress on our objectives!\n\n"
                f"Objective: {objective.get('name')}\n"
                f"Key Result: {key_result.get('name')}\n"
                f"Progress: {progress}%",
        post_type="achievement" if progress >= 75 else "update",
        source_module="goals",
        source_id=objective.get("id"),
        department=objective.get("department"),
        author_id=user.get("id"),
        author_name=user.get("name", "System"),
        tags=["okr", f"progress-{progress}"],
        priority="normal" if progress < 100 else "high"
    )


async def on_strategic_goal_achieved(goal: dict, achieved_by: dict):
    """Auto-post when a strategic goal is achieved"""
    return await create_auto_post(
        title=f"🏆 Strategic Goal Achieved: {goal.get('name')}",
        content=f"We've achieved a strategic goal!\n\n"
                f"Goal: {goal.get('name')}\n"
                f"Description: {goal.get('description', '')[:200]}\n\n"
                f"Congratulations to everyone involved!",
        post_type="achievement",
        source_module="goals",
        source_id=goal.get("id"),
        visibility="public",
        author_id=achieved_by.get("id"),
        author_name=achieved_by.get("name", "System"),
        tags=["strategic-goal", "achieved"],
        priority="high"
    )


async def on_quarterly_review_complete(quarter: dict, summary: dict, user: dict):
    """Auto-post quarterly review summary"""
    return await create_auto_post(
        title=f"📊 Q{quarter.get('quarter')} {quarter.get('year')} Review Complete",
        content=f"Quarterly review is complete!\n\n"
                f"Goals Achieved: {summary.get('achieved', 0)}\n"
                f"In Progress: {summary.get('in_progress', 0)}\n"
                f"Overall Progress: {summary.get('overall_progress', 0)}%",
        post_type="update",
        source_module="goals",
        source_id=quarter.get("id"),
        visibility="public",
        author_id=user.get("id"),
        author_name=user.get("name", "Leadership"),
        tags=["quarterly-review", f"q{quarter.get('quarter')}"],
        priority="normal"
    )


# ============== HR INTEGRATIONS ==============

async def on_new_employee_joined(employee: dict, manager: dict = None):
    """Auto-post when a new employee joins"""
    content = "Please welcome our newest team member!\n\n"
    content += f"Name: {employee.get('name')}\n"
    content += f"Role: {employee.get('position', employee.get('role', 'Team Member'))}\n"
    content += f"Department: {employee.get('department', 'General').title()}\n"
    if manager:
        content += f"Manager: {manager.get('name')}\n"
    content += "\nLet's give them a warm welcome! 👋"
    
    return await create_auto_post(
        title=f"👋 Welcome to the Team: {employee.get('name')}!",
        content=content,
        post_type="announcement",
        source_module="hr",
        source_id=employee.get("id"),
        visibility="public",
        author_name="HR Team",
        tags=["new-employee", "welcome", employee.get("department", "general")],
        priority="normal"
    )


async def on_work_anniversary(employee: dict, years: int):
    """Auto-post for work anniversaries"""
    emoji = "🎉" if years < 5 else "🌟" if years < 10 else "💎"
    return await create_auto_post(
        title=f"{emoji} Work Anniversary: {employee.get('name')} - {years} Year{'s' if years > 1 else ''}!",
        content=f"Congratulations to {employee.get('name')} on their {years}-year work anniversary!\n\n"
                f"Department: {employee.get('department', 'General').title()}\n"
                f"Role: {employee.get('position', employee.get('role', 'Team Member'))}\n\n"
                f"Thank you for your dedication and contributions! 🙏",
        post_type="appreciation",
        source_module="hr",
        source_id=employee.get("id"),
        department=employee.get("department"),
        author_name="HR Team",
        tags=["anniversary", f"{years}-years", employee.get("department", "general")],
        priority="normal"
    )


async def on_promotion(employee: dict, old_role: str, new_role: str, promoted_by: dict = None):
    """Auto-post for promotions"""
    return await create_auto_post(
        title=f"🎊 Promotion: {employee.get('name')} is now {new_role}!",
        content=f"Please congratulate {employee.get('name')} on their well-deserved promotion!\n\n"
                f"Previous Role: {old_role}\n"
                f"New Role: {new_role}\n"
                f"Department: {employee.get('department', 'General').title()}\n\n"
                f"Wishing you continued success! 🚀",
        post_type="announcement",
        source_module="hr",
        source_id=employee.get("id"),
        visibility="public",
        author_name=promoted_by.get("name", "HR Team") if promoted_by else "HR Team",
        tags=["promotion", employee.get("department", "general")],
        priority="high"
    )


# ============== SALES INTEGRATIONS ==============

async def on_deal_closed(deal: dict, sales_rep: dict = None, amount: float = None):
    """Auto-post when a significant deal is closed"""
    amount_str = f"${amount:,.0f}" if amount else "significant value"
    sales_rep = sales_rep or {"id": None, "name": "Sales Team"}
    return await create_auto_post(
        title=f"🎯 Deal Closed: {deal.get('name', 'New Deal')}!",
        content=f"Great news! We've closed a deal!\n\n"
                f"Deal: {deal.get('name')}\n"
                f"Value: {amount_str}\n"
                f"Closed by: {sales_rep.get('name', 'Sales Team')}\n\n"
                f"Congratulations! 🎉",
        post_type="achievement",
        source_module="sales",
        source_id=deal.get("id"),
        department="sales",
        author_id=sales_rep.get("id"),
        author_name=sales_rep.get("name", "Sales Team"),
        tags=["deal-closed", "sales-win"],
        priority="high" if amount and amount > 50000 else "normal"
    )


async def on_lead_converted(lead: dict, converted_by: dict):
    """Auto-post when a lead is converted to customer"""
    return await create_auto_post(
        title=f"✨ Lead Converted: {lead.get('company', lead.get('name', 'New Customer'))}",
        content=f"We've converted a new customer!\n\n"
                f"Company: {lead.get('company', 'N/A')}\n"
                f"Contact: {lead.get('name', 'N/A')}\n"
                f"Converted by: {converted_by.get('name', 'Sales Team')}",
        post_type="achievement",
        source_module="sales",
        source_id=lead.get("id"),
        department="sales",
        author_id=converted_by.get("id"),
        author_name=converted_by.get("name", "Sales Team"),
        tags=["lead-converted", "new-customer"],
        priority="normal"
    )


# ============== INFLUENCER MARKETING INTEGRATIONS ==============

async def on_influencer_signed(influencer: dict, signed_by: dict):
    """Auto-post when a new influencer is signed"""
    return await create_auto_post(
        title=f"🌟 New Influencer Partnership: {influencer.get('name')}",
        content=f"We've partnered with a new influencer!\n\n"
                f"Influencer: {influencer.get('name')}\n"
                f"Platform: {influencer.get('platform', 'Multi-platform')}\n"
                f"Followers: {influencer.get('followers', 'N/A'):,}" if isinstance(influencer.get('followers'), int) else f"Followers: {influencer.get('followers', 'N/A')}\n",
        post_type="announcement",
        source_module="influencer",
        source_id=influencer.get("id"),
        department="marketing",
        author_id=signed_by.get("id"),
        author_name=signed_by.get("name", "Marketing Team"),
        tags=["influencer", "partnership", "marketing"],
        priority="normal"
    )


async def on_influencer_content_published(influencer: dict, content: dict, metrics: dict = None):
    """Auto-post when influencer content is published"""
    return await create_auto_post(
        title=f"📸 Influencer Content Live: {influencer.get('name')}",
        content=f"New influencer content is now live!\n\n"
                f"Influencer: {influencer.get('name')}\n"
                f"Content Type: {content.get('type', 'Post')}\n"
                f"Platform: {content.get('platform', 'Social Media')}",
        post_type="operational",
        source_module="influencer",
        source_id=content.get("id"),
        department="marketing",
        author_name="Marketing Team",
        tags=["influencer-content", "published"],
        priority="normal"
    )


# ============== PR & COMMUNICATIONS INTEGRATIONS ==============

async def on_press_release_published(press_release: dict, published_by: dict):
    """Auto-post when a press release is published"""
    return await create_auto_post(
        title=f"📰 Press Release: {press_release.get('title')}",
        content=f"A new press release has been published!\n\n"
                f"Title: {press_release.get('title')}\n"
                f"Summary: {press_release.get('summary', press_release.get('content', ''))[:200]}...",
        post_type="announcement",
        source_module="pr",
        source_id=press_release.get("id"),
        visibility="public",
        author_id=published_by.get("id"),
        author_name=published_by.get("name", "PR Team"),
        tags=["press-release", "pr"],
        priority="high"
    )


async def on_media_coverage(coverage: dict):
    """Auto-post when brand gets media coverage"""
    return await create_auto_post(
        title=f"📺 Media Coverage: {coverage.get('outlet', 'News Outlet')}",
        content=f"We've been featured in the media!\n\n"
                f"Outlet: {coverage.get('outlet')}\n"
                f"Title: {coverage.get('title')}\n"
                f"Type: {coverage.get('type', 'Article')}",
        post_type="achievement",
        source_module="pr",
        source_id=coverage.get("id"),
        visibility="public",
        author_name="PR Team",
        tags=["media-coverage", "pr-win"],
        priority="high"
    )


# ============== SOCIAL MEDIA INTEGRATIONS ==============

async def on_post_viral(post: dict, platform: str, engagement: int):
    """Auto-post when social media post goes viral"""
    return await create_auto_post(
        title=f"🔥 Viral Post on {platform}!",
        content=f"One of our posts is going viral!\n\n"
                f"Platform: {platform}\n"
                f"Engagement: {engagement:,}\n"
                f"Content: {post.get('content', '')[:150]}...",
        post_type="achievement",
        source_module="social",
        source_id=post.get("id"),
        department="marketing",
        author_name="Social Media Team",
        tags=["viral", "social-media", platform.lower()],
        priority="high"
    )


async def on_social_campaign_launched(campaign: dict, launched_by: dict):
    """Auto-post when a social campaign is launched"""
    return await create_auto_post(
        title=f"🚀 Campaign Launched: {campaign.get('name')}",
        content=f"A new social media campaign is now live!\n\n"
                f"Campaign: {campaign.get('name')}\n"
                f"Platforms: {', '.join(campaign.get('platforms', ['Social Media']))}\n"
                f"Objective: {campaign.get('objective', 'Engagement')}",
        post_type="announcement",
        source_module="social",
        source_id=campaign.get("id"),
        department="marketing",
        author_id=launched_by.get("id"),
        author_name=launched_by.get("name", "Social Media Team"),
        tags=["campaign-launch", "social-media"],
        priority="normal"
    )


# ============== SUPPORT INTEGRATIONS ==============

async def on_critical_ticket_resolved(ticket: dict, resolved_by: dict, resolution_time: str = None):
    """Auto-post when a critical support ticket is resolved"""
    return await create_auto_post(
        title=f"✅ Critical Issue Resolved: {ticket.get('subject', 'Support Ticket')[:50]}",
        content=f"A critical support issue has been resolved!\n\n"
                f"Ticket: {ticket.get('subject')}\n"
                f"Resolved by: {resolved_by.get('name', 'Support Team')}\n"
                f"Resolution Time: {resolution_time or 'N/A'}",
        post_type="operational",
        source_module="support",
        source_id=ticket.get("id"),
        department="support",
        author_id=resolved_by.get("id"),
        author_name=resolved_by.get("name", "Support Team"),
        tags=["support", "resolved", "critical"],
        priority="normal"
    )


# ============== LISTENING/MONITORING INTEGRATIONS ==============

async def on_brand_mention_spike(alert: dict, mention_count: int, sentiment: str = None):
    """Auto-post when there's a spike in brand mentions"""
    emoji = "📈" if sentiment == "positive" else "⚠️" if sentiment == "negative" else "📊"
    post_type = "achievement" if sentiment == "positive" else "issue" if sentiment == "negative" else "update"
    
    return await create_auto_post(
        title=f"{emoji} Brand Mention Spike Detected",
        content=f"We're seeing increased brand mentions!\n\n"
                f"Mentions: {mention_count:,}\n"
                f"Sentiment: {sentiment.title() if sentiment else 'Mixed'}\n"
                f"Source: {alert.get('source', 'Multiple platforms')}",
        post_type=post_type,
        source_module="listening",
        source_id=alert.get("id"),
        department="marketing",
        author_name="Social Listening",
        tags=["brand-mentions", "social-listening", sentiment or "mixed"],
        priority="high" if sentiment == "negative" else "normal"
    )


async def on_competitor_activity(competitor: str, activity: str, detected_by: str = "Social Listening"):
    """Auto-post when significant competitor activity is detected"""
    return await create_auto_post(
        title=f"🔍 Competitor Activity: {competitor}",
        content=f"Competitor activity detected.\n\n"
                f"Competitor: {competitor}\n"
                f"Activity: {activity}\n"
                f"Detected via: {detected_by}",
        post_type="update",
        source_module="listening",
        department="marketing",
        visibility="department",
        author_name="Social Listening",
        tags=["competitor", "market-intel"],
        priority="normal"
    )


# ============== AUTOMATION INTEGRATIONS ==============

async def on_automation_milestone(automation: dict, hours_saved: float, period: str = "this month"):
    """Auto-post when automation saves significant time"""
    return await create_auto_post(
        title=f"⚡ Automation Win: {hours_saved:.1f} Hours Saved!",
        content=f"Our automations are making a difference!\n\n"
                f"Automation: {automation.get('name', 'System Automation')}\n"
                f"Hours Saved: {hours_saved:.1f} hours {period}\n"
                f"Efficiency Gain: {automation.get('efficiency_gain', 'Significant')}",
        post_type="achievement",
        source_module="automation",
        source_id=automation.get("id"),
        visibility="public",
        author_name="System",
        tags=["automation", "efficiency"],
        priority="normal"
    )


# ============== REVERSE INTEGRATION: PULSE → TASKS ==============

async def create_task_from_issue_post(post: dict) -> Optional[dict]:
    """Create a task from an issue post on Pulse"""
    if db is None:
        return None
    
    try:
        task_id = str(uuid.uuid4())
        
        task_doc = {
            "id": task_id,
            "title": f"[From Pulse] {post.get('title', 'Issue')}",
            "description": post.get("content", ""),
            "status": "todo",
            "priority": post.get("priority", "medium"),
            "department": post.get("department"),
            "labels": ["from-pulse", "issue"],
            "source": "pulse",
            "source_id": post.get("id"),
            "created_by": post.get("author_id"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        await db.unified_tasks.insert_one(task_doc)
        
        # Update the post to link to the task
        await db.pulse_posts.update_one(
            {"id": post.get("id")},
            {"$set": {"linked_task_id": task_id}}
        )
        
        logger.info(f"Task created from Pulse issue: {task_id}")
        
        if "_id" in task_doc:
            del task_doc["_id"]
        
        return task_doc
        
    except Exception as e:
        logger.error(f"Failed to create task from issue: {e}")
        return None


# ============== EXPORT ==============

__all__ = [
    'init_integration_service',
    'create_auto_post',
    # Projects
    'on_project_completed',
    'on_project_milestone_reached',
    'on_project_started',
    # Tasks
    'on_critical_task_completed',
    'on_blocker_reported',
    # Goals
    'on_okr_progress_milestone',
    'on_strategic_goal_achieved',
    'on_quarterly_review_complete',
    # HR
    'on_new_employee_joined',
    'on_work_anniversary',
    'on_promotion',
    # Sales
    'on_deal_closed',
    'on_lead_converted',
    # Influencer
    'on_influencer_signed',
    'on_influencer_content_published',
    # PR
    'on_press_release_published',
    'on_media_coverage',
    # Social
    'on_post_viral',
    'on_social_campaign_launched',
    # Support
    'on_critical_ticket_resolved',
    # Listening
    'on_brand_mention_spike',
    'on_competitor_activity',
    # Automation
    'on_automation_milestone',
    # Reverse
    'create_task_from_issue_post',
]
