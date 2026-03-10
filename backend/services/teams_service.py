"""
Microsoft Teams Chat Integration Service
Provides chat functionality using Microsoft Graph API
"""
import os
import logging
import httpx
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

# Azure AD Configuration (reuse existing settings)
AZURE_CLIENT_ID = os.environ.get('AZURE_CLIENT_ID')
AZURE_CLIENT_SECRET = os.environ.get('AZURE_CLIENT_SECRET')
AZURE_TENANT_ID = os.environ.get('AZURE_TENANT_ID')
GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0"


class TeamsTokenManager:
    """Manages OAuth tokens for Microsoft Graph API access."""
    
    def __init__(self):
        self.access_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
        
    async def get_app_token(self) -> Optional[str]:
        """Get application-level access token using client credentials flow."""
        # Check if we have a valid cached token
        if self.access_token and self.token_expiry and datetime.now(timezone.utc) < self.token_expiry:
            return self.access_token
            
        if not all([AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID]):
            logger.error("Azure AD credentials not configured")
            return None
            
        token_url = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    token_url,
                    data={
                        "client_id": AZURE_CLIENT_ID,
                        "client_secret": AZURE_CLIENT_SECRET,
                        "scope": "https://graph.microsoft.com/.default",
                        "grant_type": "client_credentials"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.access_token = data.get("access_token")
                    expires_in = data.get("expires_in", 3600)
                    self.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in - 60)
                    return self.access_token
                else:
                    logger.error(f"Failed to get token: {response.status_code} - {response.text}")
                    return None
                    
            except Exception as e:
                logger.error(f"Error getting app token: {e}")
                return None


class TeamsUserTokenManager:
    """Manages user-delegated tokens for Teams chat operations."""
    
    def __init__(self, db):
        self.db = db
        
    async def get_user_token(self, user_id: str) -> Optional[str]:
        """Get user's stored Teams access token."""
        user = await self.db.users.find_one({"id": user_id}, {"_id": 0, "teams_access_token": 1, "teams_token_expiry": 1})
        if not user or not user.get("teams_access_token"):
            return None
            
        # Check if token is expired
        expiry = user.get("teams_token_expiry")
        if expiry:
            expiry_dt = datetime.fromisoformat(expiry.replace('Z', '+00:00')) if isinstance(expiry, str) else expiry
            if datetime.now(timezone.utc) >= expiry_dt:
                # Try to refresh token
                return await self.refresh_user_token(user_id)
                
        return user.get("teams_access_token")
        
    async def refresh_user_token(self, user_id: str) -> Optional[str]:
        """Refresh user's Teams access token using refresh token."""
        user = await self.db.users.find_one({"id": user_id}, {"_id": 0, "teams_refresh_token": 1})
        if not user or not user.get("teams_refresh_token"):
            return None
            
        token_url = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    token_url,
                    data={
                        "client_id": AZURE_CLIENT_ID,
                        "client_secret": AZURE_CLIENT_SECRET,
                        "refresh_token": user.get("teams_refresh_token"),
                        "scope": "https://graph.microsoft.com/Chat.ReadWrite https://graph.microsoft.com/User.Read offline_access",
                        "grant_type": "refresh_token"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    access_token = data.get("access_token")
                    refresh_token = data.get("refresh_token")
                    expires_in = data.get("expires_in", 3600)
                    expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in - 60)
                    
                    # Update stored tokens
                    await self.db.users.update_one(
                        {"id": user_id},
                        {"$set": {
                            "teams_access_token": access_token,
                            "teams_refresh_token": refresh_token,
                            "teams_token_expiry": expiry.isoformat()
                        }}
                    )
                    
                    return access_token
                else:
                    logger.error(f"Failed to refresh token: {response.status_code}")
                    return None
                    
            except Exception as e:
                logger.error(f"Error refreshing token: {e}")
                return None
                
    async def store_user_tokens(self, user_id: str, access_token: str, refresh_token: str, expires_in: int):
        """Store user's Teams tokens after OAuth flow."""
        expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in - 60)
        
        await self.db.users.update_one(
            {"id": user_id},
            {"$set": {
                "teams_access_token": access_token,
                "teams_refresh_token": refresh_token,
                "teams_token_expiry": expiry.isoformat(),
                "teams_connected": True,
                "teams_connected_at": datetime.now(timezone.utc).isoformat()
            }}
        )


class TeamsService:
    """Microsoft Teams Chat Service using Graph API."""
    
    def __init__(self, db):
        self.db = db
        self.token_manager = TeamsUserTokenManager(db)
        
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        user_id: str,
        data: Optional[dict] = None,
        params: Optional[dict] = None
    ) -> Optional[Dict[Any, Any]]:
        """Make authenticated request to Microsoft Graph API."""
        token = await self.token_manager.get_user_token(user_id)
        if not token:
            logger.error(f"No valid token for user {user_id}")
            return None
            
        url = f"{GRAPH_API_ENDPOINT}{endpoint}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                if method == "GET":
                    response = await client.get(url, headers=headers, params=params)
                elif method == "POST":
                    response = await client.post(url, headers=headers, json=data)
                elif method == "PATCH":
                    response = await client.patch(url, headers=headers, json=data)
                elif method == "DELETE":
                    response = await client.delete(url, headers=headers)
                else:
                    logger.error(f"Unsupported HTTP method: {method}")
                    return None
                    
                if response.status_code in [200, 201]:
                    return response.json() if response.text else {"success": True}
                elif response.status_code == 204:
                    return {"success": True}
                else:
                    logger.error(f"Graph API error: {response.status_code} - {response.text}")
                    return None
                    
            except Exception as e:
                logger.error(f"Request error: {e}")
                return None
                
    async def check_connection(self, user_id: str) -> Dict[str, Any]:
        """Check if user has Teams connected."""
        user = await self.db.users.find_one(
            {"id": user_id}, 
            {"_id": 0, "teams_connected": 1, "teams_connected_at": 1}
        )
        
        if not user or not user.get("teams_connected"):
            return {"connected": False}
            
        # Verify token is still valid
        token = await self.token_manager.get_user_token(user_id)
        if not token:
            return {"connected": False, "error": "Token expired"}
            
        return {
            "connected": True,
            "connected_at": user.get("teams_connected_at")
        }
        
    async def list_chats(self, user_id: str, include_members: bool = False) -> List[Dict]:
        """List all chats for the user."""
        endpoint = "/me/chats"
        if include_members:
            endpoint += "?$expand=members"
            
        result = await self._make_request("GET", endpoint, user_id)
        if result and "value" in result:
            return result["value"]
        return []
        
    async def list_chats_with_preview(self, user_id: str, include_members: bool = True) -> List[Dict]:
        """List chats with last message preview and optionally members."""
        if include_members:
            endpoint = "/me/chats?$expand=lastMessagePreview,members"
        else:
            endpoint = "/me/chats?$expand=lastMessagePreview"
        result = await self._make_request("GET", endpoint, user_id)
        if result and "value" in result:
            return result["value"]
        return []
        
    async def get_chat(self, user_id: str, chat_id: str) -> Optional[Dict]:
        """Get details of a specific chat."""
        endpoint = f"/chats/{chat_id}?$expand=members"
        return await self._make_request("GET", endpoint, user_id)
        
    async def get_chat_messages(
        self, 
        user_id: str, 
        chat_id: str, 
        top: int = 50
    ) -> List[Dict]:
        """Get messages from a chat."""
        endpoint = f"/chats/{chat_id}/messages?$top={top}&$orderby=createdDateTime desc"
        result = await self._make_request("GET", endpoint, user_id)
        if result and "value" in result:
            return result["value"]
        return []
        
    async def send_message(
        self, 
        user_id: str, 
        chat_id: str, 
        content: str,
        content_type: str = "text"
    ) -> Optional[Dict]:
        """Send a message to a chat."""
        endpoint = f"/chats/{chat_id}/messages"
        data = {
            "body": {
                "contentType": "html" if content_type == "html" else "text",
                "content": content
            }
        }
        return await self._make_request("POST", endpoint, user_id, data=data)
        
    async def send_message_with_mentions(
        self,
        user_id: str,
        chat_id: str,
        content: str,
        mentions: List[Dict]
    ) -> Optional[Dict]:
        """Send a message with @mentions."""
        # Build mentions array for Graph API
        mentions_array = []
        formatted_content = content
        
        for idx, mention in enumerate(mentions):
            mention_user_id = mention.get("user_id")
            display_name = mention.get("display_name", "User")
            
            mentions_array.append({
                "id": idx,
                "mentionText": display_name,
                "mentioned": {
                    "user": {
                        "id": mention_user_id,
                        "displayName": display_name
                    }
                }
            })
            
            # Replace @name with mention markup
            formatted_content = formatted_content.replace(
                f"@{display_name}",
                f'<at id="{idx}">{display_name}</at>'
            )
            
        endpoint = f"/chats/{chat_id}/messages"
        data = {
            "body": {
                "contentType": "html",
                "content": formatted_content
            },
            "mentions": mentions_array
        }
        
        return await self._make_request("POST", endpoint, user_id, data=data)
        
    async def create_chat(
        self,
        user_id: str,
        member_ids: List[str],
        topic: Optional[str] = None
    ) -> Optional[Dict]:
        """Create a new chat (1:1 or group)."""
        # Build members array
        members = []
        
        # Add the current user
        me = await self._make_request("GET", "/me", user_id)
        if me:
            members.append({
                "@odata.type": "#microsoft.graph.aadUserConversationMember",
                "roles": ["owner"],
                "user@odata.bind": f"https://graph.microsoft.com/v1.0/users('{me.get('id')}')"
            })
            
        # Add other members
        for member_id in member_ids:
            members.append({
                "@odata.type": "#microsoft.graph.aadUserConversationMember",
                "roles": ["owner"],
                "user@odata.bind": f"https://graph.microsoft.com/v1.0/users('{member_id}')"
            })
            
        chat_type = "oneOnOne" if len(member_ids) == 1 else "group"
        
        data = {
            "chatType": chat_type,
            "members": members
        }
        
        if topic and chat_type == "group":
            data["topic"] = topic
            
        return await self._make_request("POST", "/chats", user_id, data=data)
        
    async def search_users(self, user_id: str, query: str) -> List[Dict]:
        """Search for users to chat with."""
        endpoint = f"/users?$filter=startswith(displayName,'{query}') or startswith(mail,'{query}')&$top=10"
        result = await self._make_request("GET", endpoint, user_id)
        if result and "value" in result:
            return result["value"]
        return []


# Singleton instance will be created in routes
teams_service = None

def init_teams_service(db):
    """Initialize Teams service with database connection."""
    global teams_service
    teams_service = TeamsService(db)
    return teams_service
