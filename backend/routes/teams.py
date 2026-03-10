"""
Microsoft Teams Chat Routes
Provides API endpoints for Teams chat integration
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teams", tags=["Microsoft Teams"])

# Database and dependencies - will be set from server.py
db = None
get_current_user = None
teams_service = None

# Azure AD Configuration
AZURE_CLIENT_ID = os.environ.get('AZURE_CLIENT_ID')
AZURE_TENANT_ID = os.environ.get('AZURE_TENANT_ID')
AZURE_REDIRECT_URI = os.environ.get('AZURE_REDIRECT_URI', 'http://localhost:3000')


def init_teams_router(database, current_user_dep):
    """Initialize the Teams router with dependencies."""
    global db, get_current_user, teams_service
    db = database
    get_current_user = current_user_dep
    
    from services.teams_service import init_teams_service
    teams_service = init_teams_service(database)


# ============== Request/Response Models ==============

class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)
    content_type: str = Field(default="text", pattern="^(text|html)$")


class SendMessageWithMentionsRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)
    mentions: List[Dict[str, str]]


class CreateChatRequest(BaseModel):
    member_ids: List[str] = Field(..., min_items=1)
    topic: Optional[str] = None


class ChatResponse(BaseModel):
    id: str
    topic: Optional[str] = None
    chatType: str
    createdDateTime: Optional[str] = None
    lastUpdatedDateTime: Optional[str] = None
    members: Optional[List[Dict]] = None
    lastMessagePreview: Optional[Dict] = None


class MessageResponse(BaseModel):
    id: str
    body: Dict
    from_user: Optional[Dict] = None
    createdDateTime: str


# ============== OAuth Routes ==============

@router.get("/auth/config")
async def get_teams_auth_config():
    """Get OAuth configuration for Teams integration."""
    if not AZURE_CLIENT_ID or not AZURE_TENANT_ID:
        raise HTTPException(status_code=500, detail="Azure AD not configured")
        
    # Scopes required for Teams chat
    scopes = [
        "Chat.ReadWrite",
        "Chat.Read", 
        "User.Read",
        "User.ReadBasic.All",
        "offline_access"
    ]
    
    # Use frontend URL for Teams OAuth callback
    frontend_url = os.environ.get('FRONTEND_URL', 'https://sevora-hub.preview.emergentagent.com')
    teams_redirect_uri = f"{frontend_url}/teams/callback"
    
    return {
        "client_id": AZURE_CLIENT_ID,
        "tenant_id": AZURE_TENANT_ID,
        "authority": f"https://login.microsoftonline.com/{AZURE_TENANT_ID}",
        "redirect_uri": teams_redirect_uri,
        "scopes": scopes,
        "scope_string": " ".join([f"https://graph.microsoft.com/{s}" for s in scopes[:4]] + ["offline_access"])
    }


@router.post("/auth/callback")
async def teams_auth_callback(
    code: str,
    user: dict = Depends(lambda: get_current_user)
):
    """Handle OAuth callback and store tokens."""
    import httpx
    
    # Use frontend URL for Teams OAuth callback
    frontend_url = os.environ.get('FRONTEND_URL', 'https://sevora-hub.preview.emergentagent.com')
    teams_redirect_uri = f"{frontend_url}/teams/callback"
    
    token_url = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            token_url,
            data={
                "client_id": AZURE_CLIENT_ID,
                "client_secret": os.environ.get('AZURE_CLIENT_SECRET'),
                "code": code,
                "redirect_uri": teams_redirect_uri,
                "grant_type": "authorization_code",
                "scope": "https://graph.microsoft.com/Chat.ReadWrite https://graph.microsoft.com/Chat.Read https://graph.microsoft.com/User.Read https://graph.microsoft.com/User.ReadBasic.All offline_access"
            }
        )
        
        if response.status_code != 200:
            logger.error(f"Token exchange failed: {response.text}")
            raise HTTPException(status_code=400, detail="Failed to exchange code for tokens")
            
        data = response.json()
        
        # Store tokens
        await teams_service.token_manager.store_user_tokens(
            user_id=user['id'],
            access_token=data.get('access_token'),
            refresh_token=data.get('refresh_token'),
            expires_in=data.get('expires_in', 3600)
        )
        
        return {
            "success": True,
            "message": "Teams connected successfully"
        }


@router.get("/auth/status")
async def get_teams_connection_status(user: dict = Depends(lambda: get_current_user)):
    """Check if user has Teams connected."""
    status = await teams_service.check_connection(user['id'])
    return status


@router.post("/auth/disconnect")
async def disconnect_teams(user: dict = Depends(lambda: get_current_user)):
    """Disconnect Teams integration."""
    await db.users.update_one(
        {"id": user['id']},
        {"$unset": {
            "teams_access_token": "",
            "teams_refresh_token": "",
            "teams_token_expiry": "",
            "teams_connected": "",
            "teams_connected_at": ""
        }}
    )
    
    return {"success": True, "message": "Teams disconnected"}


# ============== Chat Routes ==============

@router.get("/chats")
async def list_chats(
    include_members: bool = False,
    with_preview: bool = False,
    user: dict = Depends(lambda: get_current_user)
):
    """List all Teams chats for the user."""
    # Check connection
    status = await teams_service.check_connection(user['id'])
    if not status.get('connected'):
        raise HTTPException(status_code=401, detail="Teams not connected. Please connect your Teams account first.")
        
    if with_preview:
        chats = await teams_service.list_chats_with_preview(user['id'])
    else:
        chats = await teams_service.list_chats(user['id'], include_members=include_members)
        
    return {
        "success": True,
        "chats": chats,
        "count": len(chats)
    }


@router.get("/chats/{chat_id}")
async def get_chat(
    chat_id: str,
    user: dict = Depends(lambda: get_current_user)
):
    """Get details of a specific chat."""
    status = await teams_service.check_connection(user['id'])
    if not status.get('connected'):
        raise HTTPException(status_code=401, detail="Teams not connected")
        
    chat = await teams_service.get_chat(user['id'], chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    return {
        "success": True,
        "chat": chat
    }


@router.get("/chats/{chat_id}/messages")
async def get_chat_messages(
    chat_id: str,
    top: int = Query(default=50, le=100),
    user: dict = Depends(lambda: get_current_user)
):
    """Get messages from a chat."""
    status = await teams_service.check_connection(user['id'])
    if not status.get('connected'):
        raise HTTPException(status_code=401, detail="Teams not connected")
        
    messages = await teams_service.get_chat_messages(user['id'], chat_id, top=top)
    
    return {
        "success": True,
        "messages": messages,
        "count": len(messages)
    }


@router.post("/chats/{chat_id}/messages")
async def send_message(
    chat_id: str,
    request: SendMessageRequest,
    user: dict = Depends(lambda: get_current_user)
):
    """Send a message to a chat."""
    status = await teams_service.check_connection(user['id'])
    if not status.get('connected'):
        raise HTTPException(status_code=401, detail="Teams not connected")
        
    message = await teams_service.send_message(
        user_id=user['id'],
        chat_id=chat_id,
        content=request.content,
        content_type=request.content_type
    )
    
    if not message:
        raise HTTPException(status_code=400, detail="Failed to send message")
        
    return {
        "success": True,
        "message": message
    }


@router.post("/chats/{chat_id}/messages/mention")
async def send_message_with_mentions(
    chat_id: str,
    request: SendMessageWithMentionsRequest,
    user: dict = Depends(lambda: get_current_user)
):
    """Send a message with @mentions."""
    status = await teams_service.check_connection(user['id'])
    if not status.get('connected'):
        raise HTTPException(status_code=401, detail="Teams not connected")
        
    message = await teams_service.send_message_with_mentions(
        user_id=user['id'],
        chat_id=chat_id,
        content=request.content,
        mentions=request.mentions
    )
    
    if not message:
        raise HTTPException(status_code=400, detail="Failed to send message")
        
    return {
        "success": True,
        "message": message
    }


@router.post("/chats")
async def create_chat(
    request: CreateChatRequest,
    user: dict = Depends(lambda: get_current_user)
):
    """Create a new chat (1:1 or group)."""
    status = await teams_service.check_connection(user['id'])
    if not status.get('connected'):
        raise HTTPException(status_code=401, detail="Teams not connected")
        
    chat = await teams_service.create_chat(
        user_id=user['id'],
        member_ids=request.member_ids,
        topic=request.topic
    )
    
    if not chat:
        raise HTTPException(status_code=400, detail="Failed to create chat")
        
    return {
        "success": True,
        "chat": chat
    }


@router.get("/users/search")
async def search_users(
    query: str = Query(..., min_length=1),
    user: dict = Depends(lambda: get_current_user)
):
    """Search for users to start a chat with."""
    status = await teams_service.check_connection(user['id'])
    if not status.get('connected'):
        raise HTTPException(status_code=401, detail="Teams not connected")
        
    users = await teams_service.search_users(user['id'], query)
    
    return {
        "success": True,
        "users": users,
        "count": len(users)
    }
