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
        
        # Build digest email
        subject = f"[Sevora] You have {len(notifications)} notifications"
        body = build_digest_email_html(notifications, user.get("name", "User"), frequency)
        
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
