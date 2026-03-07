"""
WebSocket Service for Real-time Notifications
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set
import json
import asyncio
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time notifications"""
    
    def __init__(self):
        # User ID -> Set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Department -> Set of User IDs subscribed
        self.department_subscriptions: Dict[str, Set[str]] = {
            "marketing": set(),
            "sales": set(),
            "social": set(),
            "all": set()  # For admins
        }
    
    async def connect(self, websocket: WebSocket, user_id: str, departments: List[str]):
        """Connect a user's WebSocket"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        
        # Subscribe to departments
        for dept in departments:
            if dept in self.department_subscriptions:
                self.department_subscriptions[dept].add(user_id)
        
        # Admin users subscribe to all
        if "admin" in departments or len(departments) == 3:
            self.department_subscriptions["all"].add(user_id)
        
        logger.info(f"User {user_id} connected. Active connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Disconnect a user's WebSocket"""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                # Remove from department subscriptions
                for dept_users in self.department_subscriptions.values():
                    dept_users.discard(user_id)
        
        logger.info(f"User {user_id} disconnected. Active connections: {len(self.active_connections)}")
    
    async def send_personal_notification(self, user_id: str, notification: dict):
        """Send notification to a specific user"""
        if user_id in self.active_connections:
            message = json.dumps({
                "type": "notification",
                "data": notification
            })
            disconnected = set()
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Error sending to {user_id}: {e}")
                    disconnected.add(connection)
            
            # Clean up disconnected
            for conn in disconnected:
                self.active_connections[user_id].discard(conn)
    
    async def broadcast_to_department(self, department: str, notification: dict):
        """Broadcast notification to all users in a department"""
        user_ids = self.department_subscriptions.get(department, set())
        # Also include admins
        user_ids = user_ids.union(self.department_subscriptions.get("all", set()))
        
        message = json.dumps({
            "type": "department_notification",
            "department": department,
            "data": notification
        })
        
        for user_id in user_ids:
            if user_id in self.active_connections:
                for connection in self.active_connections[user_id]:
                    try:
                        await connection.send_text(message)
                    except Exception:
                        pass
    
    async def broadcast_activity(self, activity: dict):
        """Broadcast activity feed update to all connected users"""
        message = json.dumps({
            "type": "activity",
            "data": activity
        })
        
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass
    
    async def send_mention_notification(self, mentioned_user_id: str, mentioner_name: str, 
                                        entity_type: str, entity_id: str, comment_text: str):
        """Send notification when user is mentioned"""
        notification = {
            "id": f"mention_{datetime.now(timezone.utc).timestamp()}",
            "type": "mention",
            "title": f"{mentioner_name} mentioned you",
            "message": f"You were mentioned in a comment on {entity_type}",
            "entity_type": entity_type,
            "entity_id": entity_id,
            "preview": comment_text[:100] + "..." if len(comment_text) > 100 else comment_text,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.send_personal_notification(mentioned_user_id, notification)
    
    async def send_lead_notification(self, department: str, lead_name: str, source: str):
        """Notify sales team of new lead"""
        notification = {
            "id": f"lead_{datetime.now(timezone.utc).timestamp()}",
            "type": "new_lead",
            "title": "New Lead Captured",
            "message": f"{lead_name} from {source}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.broadcast_to_department("sales", notification)
    
    async def send_campaign_notification(self, campaign_name: str, action: str):
        """Notify marketing team of campaign updates"""
        notification = {
            "id": f"campaign_{datetime.now(timezone.utc).timestamp()}",
            "type": "campaign_update",
            "title": f"Campaign {action}",
            "message": f"Campaign '{campaign_name}' has been {action}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.broadcast_to_department("marketing", notification)
    
    async def send_content_notification(self, content_title: str, status: str):
        """Notify social team of content updates"""
        notification = {
            "id": f"content_{datetime.now(timezone.utc).timestamp()}",
            "type": "content_update",
            "title": f"Content {status}",
            "message": f"'{content_title}' is now {status}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await self.broadcast_to_department("social", notification)
    
    def get_online_users_count(self) -> int:
        """Get count of online users"""
        return len(self.active_connections)
    
    def get_online_users(self) -> List[str]:
        """Get list of online user IDs"""
        return list(self.active_connections.keys())


# Global connection manager instance
manager = ConnectionManager()
