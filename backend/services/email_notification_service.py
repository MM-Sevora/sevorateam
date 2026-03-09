"""
Email Notification Service - Sends notification emails using Microsoft Graph API
"""
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional
import asyncio

logger = logging.getLogger(__name__)

# Will be initialized from server.py
db = None
microsoft_email_service = None
DEFAULT_SENDER = "notifications@sevora.com"


def init_email_notification_service(database, email_service):
    """Initialize the email notification service"""
    global db, microsoft_email_service
    db = database
    microsoft_email_service = email_service


async def should_send_email(user_id: str, category: str) -> bool:
    """Check if user has email notifications enabled for this category"""
    prefs = await db.notification_preferences.find_one({"user_id": user_id})
    if not prefs:
        return False  # Default to no email
    
    if not prefs.get("email_enabled", False):
        return False
    
    # Check category-specific preference
    category_map = {
        "task": "task_notifications",
        "project": "project_notifications",
        "marketing": "marketing_notifications",
        "mail": "mail_notifications",
        "social": "social_notifications",
        "mention": "mention_notifications",
        "approval": "approval_notifications",
    }
    
    pref_key = category_map.get(category)
    if pref_key and not prefs.get(pref_key, True):
        return False
    
    return True


async def get_email_frequency(user_id: str) -> str:
    """Get user's email notification frequency preference"""
    prefs = await db.notification_preferences.find_one({"user_id": user_id})
    if prefs:
        return prefs.get("email_frequency", "instant")
    return "instant"


async def send_instant_email_notification(user_id: str, notification: dict):
    """Send immediate email notification"""
    if not microsoft_email_service:
        logger.warning("Email service not initialized")
        return
    
    # Check if user wants email for this category
    if not await should_send_email(user_id, notification.get("category", "system")):
        return
    
    # Check frequency
    frequency = await get_email_frequency(user_id)
    if frequency != "instant":
        # Queue for digest instead
        await queue_for_digest(user_id, notification)
        return
    
    # Get user email
    user = await db.users.find_one({"id": user_id}, {"email": 1, "name": 1})
    if not user or not user.get("email"):
        logger.warning(f"User {user_id} has no email")
        return
    
    # Build email
    subject = f"[Sevora] {notification.get('title', 'Notification')}"
    body = build_notification_email_html(notification, user.get("name", "User"))
    
    try:
        result = await microsoft_email_service.send_email(
            sender_email=DEFAULT_SENDER,
            to_recipients=[user["email"]],
            subject=subject,
            body=body,
            is_html=True
        )
        logger.info(f"Sent email notification to {user['email']}")
        return result
    except Exception as e:
        logger.error(f"Failed to send email notification: {e}")


async def queue_for_digest(user_id: str, notification: dict):
    """Queue notification for digest email"""
    await db.notification_email_queue.insert_one({
        "user_id": user_id,
        "notification": notification,
        "queued_at": datetime.now(timezone.utc).isoformat(),
        "sent": False
    })


async def send_digest_emails(frequency: str = "hourly"):
    """Send digest emails for all users with pending notifications"""
    if not microsoft_email_service:
        return
    
    # Get users with this frequency preference and pending notifications
    pipeline = [
        {"$match": {"sent": False}},
        {"$group": {
            "_id": "$user_id",
            "notifications": {"$push": "$notification"},
            "ids": {"$push": "$_id"}
        }}
    ]
    
    queued = await db.notification_email_queue.aggregate(pipeline).to_list(1000)
    
    for item in queued:
        user_id = item["_id"]
        notifications = item["notifications"]
        queue_ids = item["ids"]
        
        # Check user frequency matches
        user_frequency = await get_email_frequency(user_id)
        if (frequency == "hourly" and user_frequency != "hourly") or \
           (frequency == "daily" and user_frequency != "daily"):
            continue
        
        # Get user email
        user = await db.users.find_one({"id": user_id}, {"email": 1, "name": 1})
        if not user or not user.get("email"):
            continue
        
        # Group notifications for better summary
        grouped = group_notifications_for_digest(notifications)
        
        # Build digest email with smart grouping
        subject = build_digest_subject(grouped, frequency)
        body = build_smart_digest_email_html(grouped, user.get("name", "User"), frequency)
        
        try:
            await microsoft_email_service.send_email(
                sender_email=DEFAULT_SENDER,
                to_recipients=[user["email"]],
                subject=subject,
                body=body,
                is_html=True
            )
            
            # Mark as sent
            await db.notification_email_queue.update_many(
                {"_id": {"$in": queue_ids}},
                {"$set": {"sent": True, "sent_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            logger.info(f"Sent {frequency} digest to {user['email']} with {len(notifications)} notifications")
        except Exception as e:
            logger.error(f"Failed to send digest to {user_id}: {e}")


def group_notifications_for_digest(notifications: List[dict]) -> Dict:
    """Group notifications by category and type for digest"""
    groups = {
        "tasks": {"items": [], "count": 0},
        "mentions": {"items": [], "count": 0},
        "marketing": {"items": [], "count": 0},
        "social": {"items": [], "count": 0},
        "mail": {"items": [], "count": 0},
        "other": {"items": [], "count": 0}
    }
    
    for n in notifications:
        category = n.get("category", "other")
        notification_type = n.get("type", "")
        
        if category == "task" or notification_type.startswith("task_"):
            groups["tasks"]["items"].append(n)
            groups["tasks"]["count"] += 1
        elif category == "mention" or notification_type == "user_mentioned":
            groups["mentions"]["items"].append(n)
            groups["mentions"]["count"] += 1
        elif category == "marketing":
            groups["marketing"]["items"].append(n)
            groups["marketing"]["count"] += 1
        elif category == "social":
            groups["social"]["items"].append(n)
            groups["social"]["count"] += 1
        elif category == "mail":
            groups["mail"]["items"].append(n)
            groups["mail"]["count"] += 1
        else:
            groups["other"]["items"].append(n)
            groups["other"]["count"] += 1
    
    return groups


def build_digest_subject(grouped: Dict, frequency: str) -> str:
    """Build smart subject line for digest email"""
    parts = []
    
    if grouped["tasks"]["count"] > 0:
        parts.append(f"{grouped['tasks']['count']} task update{'s' if grouped['tasks']['count'] > 1 else ''}")
    if grouped["mentions"]["count"] > 0:
        parts.append(f"{grouped['mentions']['count']} mention{'s' if grouped['mentions']['count'] > 1 else ''}")
    if grouped["marketing"]["count"] > 0:
        parts.append(f"{grouped['marketing']['count']} marketing alert{'s' if grouped['marketing']['count'] > 1 else ''}")
    
    total = sum(g["count"] for g in grouped.values())
    
    if len(parts) == 0:
        return f"[Sevora] Your {frequency} summary ({total} notifications)"
    elif len(parts) == 1:
        return f"[Sevora] {parts[0]}"
    elif len(parts) == 2:
        return f"[Sevora] {parts[0]} and {parts[1]}"
    else:
        return f"[Sevora] {parts[0]}, {parts[1]} +{total - grouped['tasks']['count'] - grouped['mentions']['count']} more"


def build_smart_digest_email_html(grouped: Dict, user_name: str, frequency: str) -> str:
    """Build HTML email for notification digest with smart grouping"""
    period = "hour" if frequency == "hourly" else "day"
    total = sum(g["count"] for g in grouped.values())
    
    sections_html = ""
    
    # Tasks section
    if grouped["tasks"]["count"] > 0:
        task_items = ""
        for n in grouped["tasks"]["items"][:5]:
            task_items += f"""
            <div style="padding: 8px 12px; border-left: 3px solid #3b82f6; background: #eff6ff; margin-bottom: 6px; border-radius: 4px;">
                <strong style="color: #1e40af; font-size: 13px;">{n.get('title', 'Task Update')}</strong>
                <p style="margin: 2px 0 0 0; color: #4b5563; font-size: 12px;">{n.get('message', '')[:80]}</p>
            </div>
            """
        if grouped["tasks"]["count"] > 5:
            task_items += f'<p style="color: #6b7280; font-size: 12px; margin: 4px 0;">+{grouped["tasks"]["count"] - 5} more task updates</p>'
        
        sections_html += f"""
        <div style="margin-bottom: 20px;">
            <h3 style="color: #3b82f6; font-size: 14px; margin: 0 0 10px 0; display: flex; align-items: center;">
                📋 Tasks ({grouped["tasks"]["count"]})
            </h3>
            {task_items}
        </div>
        """
    
    # Mentions section
    if grouped["mentions"]["count"] > 0:
        mention_items = ""
        for n in grouped["mentions"]["items"][:3]:
            mention_items += f"""
            <div style="padding: 8px 12px; border-left: 3px solid #f59e0b; background: #fffbeb; margin-bottom: 6px; border-radius: 4px;">
                <strong style="color: #b45309; font-size: 13px;">{n.get('title', 'Mentioned')}</strong>
                <p style="margin: 2px 0 0 0; color: #4b5563; font-size: 12px;">{n.get('message', '')[:80]}</p>
            </div>
            """
        if grouped["mentions"]["count"] > 3:
            mention_items += f'<p style="color: #6b7280; font-size: 12px; margin: 4px 0;">+{grouped["mentions"]["count"] - 3} more mentions</p>'
        
        sections_html += f"""
        <div style="margin-bottom: 20px;">
            <h3 style="color: #f59e0b; font-size: 14px; margin: 0 0 10px 0;">
                💬 Mentions ({grouped["mentions"]["count"]})
            </h3>
            {mention_items}
        </div>
        """
    
    # Marketing section
    if grouped["marketing"]["count"] > 0:
        marketing_items = ""
        for n in grouped["marketing"]["items"][:3]:
            marketing_items += f"""
            <div style="padding: 8px 12px; border-left: 3px solid #8b5cf6; background: #f5f3ff; margin-bottom: 6px; border-radius: 4px;">
                <strong style="color: #6d28d9; font-size: 13px;">{n.get('title', 'Marketing')}</strong>
                <p style="margin: 2px 0 0 0; color: #4b5563; font-size: 12px;">{n.get('message', '')[:80]}</p>
            </div>
            """
        
        sections_html += f"""
        <div style="margin-bottom: 20px;">
            <h3 style="color: #8b5cf6; font-size: 14px; margin: 0 0 10px 0;">
                📢 Marketing ({grouped["marketing"]["count"]})
            </h3>
            {marketing_items}
        </div>
        """
    
    # Social section
    if grouped["social"]["count"] > 0:
        social_items = ""
        for n in grouped["social"]["items"][:3]:
            social_items += f"""
            <div style="padding: 8px 12px; border-left: 3px solid #ec4899; background: #fdf2f8; margin-bottom: 6px; border-radius: 4px;">
                <strong style="color: #be185d; font-size: 13px;">{n.get('title', 'Social')}</strong>
                <p style="margin: 2px 0 0 0; color: #4b5563; font-size: 12px;">{n.get('message', '')[:80]}</p>
            </div>
            """
        
        sections_html += f"""
        <div style="margin-bottom: 20px;">
            <h3 style="color: #ec4899; font-size: 14px; margin: 0 0 10px 0;">
                📱 Social ({grouped["social"]["count"]})
            </h3>
            {social_items}
        </div>
        """
    
    # Other notifications
    other_count = grouped["mail"]["count"] + grouped["other"]["count"]
    if other_count > 0:
        sections_html += f"""
        <div style="margin-bottom: 20px;">
            <p style="color: #6b7280; font-size: 13px;">
                +{other_count} other notification{'s' if other_count > 1 else ''}
            </p>
        </div>
        """
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FDF8F3; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #4A3728 0%, #6B5D52 100%); color: white; padding: 24px;">
                <h1 style="margin: 0; font-size: 20px; font-weight: 600;">Your {frequency.title()} Summary</h1>
                <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">{total} notification{'s' if total > 1 else ''} in the last {period}</p>
            </div>
            <div style="padding: 24px;">
                <p style="color: #6B5D52; margin: 0 0 20px 0; font-size: 15px;">Hi {user_name},</p>
                {sections_html}
                <a href="https://sevora-hub.preview.emergentagent.com/notifications" 
                   style="display: inline-block; background: #4A3728; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">
                    View All Notifications
                </a>
            </div>
            <div style="padding: 16px 24px; border-top: 1px solid #E8D5C4; background: #FDFBF9;">
                <p style="color: #9C8C74; font-size: 12px; margin: 0;">
                    You're receiving this {frequency} digest based on your notification preferences.
                    <a href="https://sevora-hub.preview.emergentagent.com/notifications" style="color: #6B5D52;">Manage settings</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """


def build_notification_email_html(notification: dict, user_name: str) -> str:
    """Build HTML email for single notification"""
    priority_colors = {
        "high": "#dc2626",
        "medium": "#d97706",
        "low": "#6b7280"
    }
    priority = notification.get("priority", "medium")
    priority_color = priority_colors.get(priority, "#6b7280")
    
    action_url = notification.get("action_url", "")
    full_url = f"https://sevora-hub.preview.emergentagent.com{action_url}" if action_url else ""
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FDF8F3; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, #4A3728 0%, #6B5D52 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; }}
            .header h1 {{ margin: 0; font-size: 20px; font-weight: 600; }}
            .content {{ padding: 24px; }}
            .notification {{ background: #FDF8F3; border-left: 4px solid {priority_color}; padding: 16px; border-radius: 8px; margin-bottom: 16px; }}
            .notification h2 {{ margin: 0 0 8px 0; font-size: 16px; color: #4A3728; }}
            .notification p {{ margin: 0; color: #6B5D52; font-size: 14px; }}
            .badge {{ display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; margin-top: 8px; }}
            .badge-{priority} {{ background: {priority_color}20; color: {priority_color}; }}
            .btn {{ display: inline-block; background: #4A3728; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; margin-top: 16px; }}
            .footer {{ padding: 16px 24px; border-top: 1px solid #E8D5C4; color: #9C8C74; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Sevora Notification</h1>
            </div>
            <div class="content">
                <p style="color: #6B5D52; margin-bottom: 16px;">Hi {user_name},</p>
                <div class="notification">
                    <h2>{notification.get('title', 'Notification')}</h2>
                    <p>{notification.get('message', '')}</p>
                    <span class="badge badge-{priority}">{priority.upper()} PRIORITY</span>
                </div>
                {f'<a href="{full_url}" class="btn">View Details</a>' if full_url else ''}
            </div>
            <div class="footer">
                <p>You received this email because you have email notifications enabled in Sevora.</p>
                <p>To change your notification preferences, visit your <a href="https://sevora-hub.preview.emergentagent.com/notifications">Notification Settings</a>.</p>
            </div>
        </div>
    </body>
    </html>
    """


def build_digest_email_html(notifications: List[dict], user_name: str, frequency: str) -> str:
    """Build HTML email for notification digest"""
    period = "hour" if frequency == "hourly" else "day"
    
    notification_items = ""
    for n in notifications[:10]:  # Limit to 10 in digest
        notification_items += f"""
        <div style="background: #FDF8F3; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #D4BBA6;">
            <strong style="color: #4A3728;">{n.get('title', 'Notification')}</strong>
            <p style="margin: 4px 0 0 0; color: #6B5D52; font-size: 13px;">{n.get('message', '')}</p>
        </div>
        """
    
    if len(notifications) > 10:
        notification_items += f'<p style="color: #9C8C74; font-size: 13px;">...and {len(notifications) - 10} more notifications</p>'
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FDF8F3; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, #4A3728 0%, #6B5D52 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; }}
            .content {{ padding: 24px; }}
            .btn {{ display: inline-block; background: #4A3728; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; }}
            .footer {{ padding: 16px 24px; border-top: 1px solid #E8D5C4; color: #9C8C74; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Your {frequency.title()} Notification Summary</h1>
            </div>
            <div class="content">
                <p style="color: #6B5D52; margin-bottom: 16px;">Hi {user_name}, here's what happened in the last {period}:</p>
                {notification_items}
                <a href="https://sevora-hub.preview.emergentagent.com/notifications" class="btn" style="margin-top: 16px;">View All Notifications</a>
            </div>
            <div class="footer">
                <p>You're receiving this {frequency} digest because of your notification preferences.</p>
                <p>To change frequency or disable, visit your <a href="https://sevora-hub.preview.emergentagent.com/notifications">Notification Settings</a>.</p>
            </div>
        </div>
    </body>
    </html>
    """
