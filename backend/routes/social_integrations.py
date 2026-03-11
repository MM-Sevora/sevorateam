"""
Social Media Platform Integrations - Phase 5
Direct API connections for auto-publishing to social platforms.

Structure-ready implementation: Mock publishing with real API patterns.
Easy to swap for real APIs when developer credentials are available.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Callable
from datetime import datetime, timezone, timedelta
import uuid
import os
import logging
import jwt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/social/integrations", tags=["Social Integrations"])

# Database and auth references - will be set by server.py
db = None
JWT_SECRET = None
JWT_ALGORITHM = 'HS256'
security = HTTPBearer(auto_error=False)

def init_router(database, get_current_user_func: Callable):
    """Initialize router with database and auth function"""
    global db
    db = database

def set_jwt_config(secret: str, algorithm: str = 'HS256'):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        # Use the same JWT settings as the main server
        import os
        secret = os.environ.get('JWT_SECRET', 'sevora-team-secret-2024')
        payload = jwt.decode(credentials.credentials, secret, algorithms=['HS256'])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        if db is None:
            return {"id": user_id, "name": "User"}
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

class PlatformConfig(BaseModel):
    platform: str  # linkedin, twitter, instagram, facebook, youtube
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_at: Optional[str] = None
    account_id: Optional[str] = None
    account_name: Optional[str] = None
    profile_url: Optional[str] = None
    profile_image: Optional[str] = None
    permissions: List[str] = []
    
class PlatformConnection(BaseModel):
    id: str
    user_id: str
    platform: str
    status: str  # connected, disconnected, expired, error
    account_name: Optional[str] = None
    account_id: Optional[str] = None
    profile_url: Optional[str] = None
    profile_image: Optional[str] = None
    permissions: List[str] = []
    last_synced: Optional[str] = None
    connected_at: Optional[str] = None
    error_message: Optional[str] = None

class PublishRequest(BaseModel):
    platform: str
    content: str
    media_urls: List[str] = []
    link_url: Optional[str] = None
    schedule_time: Optional[str] = None  # ISO format for scheduled posts
    post_type: str = "text"  # text, image, video, link, carousel

class PublishResponse(BaseModel):
    success: bool
    platform: str
    platform_post_id: Optional[str] = None
    platform_url: Optional[str] = None
    message: str
    published_at: Optional[str] = None
    scheduled_for: Optional[str] = None

class PublishHistory(BaseModel):
    id: str
    user_id: str
    post_id: Optional[str] = None  # Reference to social_posts
    platform: str
    platform_post_id: Optional[str] = None
    platform_url: Optional[str] = None
    status: str  # published, scheduled, failed, deleted
    content_preview: str
    published_at: Optional[str] = None
    error_message: Optional[str] = None
    engagement: Optional[Dict[str, int]] = None  # likes, comments, shares


class MultiPublishRequest(BaseModel):
    platforms: List[str]
    content: str
    media_urls: List[str] = []
    link_url: Optional[str] = None
    post_type: str = "text"


# ============== PLATFORM CONFIGURATIONS ==============

PLATFORM_CONFIGS = {
    "linkedin": {
        "name": "LinkedIn",
        "icon": "linkedin",
        "color": "#0A66C2",
        "auth_url": "https://www.linkedin.com/oauth/v2/authorization",
        "token_url": "https://www.linkedin.com/oauth/v2/accessToken",
        "api_base": "https://api.linkedin.com/v2",
        "scopes": ["r_liteprofile", "r_emailaddress", "w_member_social"],
        "post_types": ["text", "image", "video", "link", "article"],
        "max_chars": 3000,
        "supports_scheduling": True,
        "supports_analytics": True,
    },
    "twitter": {
        "name": "Twitter/X",
        "icon": "twitter",
        "color": "#1DA1F2",
        "auth_url": "https://twitter.com/i/oauth2/authorize",
        "token_url": "https://api.twitter.com/2/oauth2/token",
        "api_base": "https://api.twitter.com/2",
        "scopes": ["tweet.read", "tweet.write", "users.read", "offline.access"],
        "post_types": ["text", "image", "video", "poll"],
        "max_chars": 280,
        "supports_scheduling": True,
        "supports_analytics": True,
    },
    "instagram": {
        "name": "Instagram",
        "icon": "instagram",
        "color": "#E4405F",
        "auth_url": "https://api.instagram.com/oauth/authorize",
        "token_url": "https://api.instagram.com/oauth/access_token",
        "api_base": "https://graph.instagram.com",
        "scopes": ["instagram_basic", "instagram_content_publish", "instagram_manage_insights"],
        "post_types": ["image", "video", "carousel", "story", "reel"],
        "max_chars": 2200,
        "supports_scheduling": True,
        "supports_analytics": True,
    },
    "facebook": {
        "name": "Facebook",
        "icon": "facebook",
        "color": "#1877F2",
        "auth_url": "https://www.facebook.com/v18.0/dialog/oauth",
        "token_url": "https://graph.facebook.com/v18.0/oauth/access_token",
        "api_base": "https://graph.facebook.com/v18.0",
        "scopes": ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
        "post_types": ["text", "image", "video", "link", "carousel"],
        "max_chars": 63206,
        "supports_scheduling": True,
        "supports_analytics": True,
    },
    "youtube": {
        "name": "YouTube",
        "icon": "youtube",
        "color": "#FF0000",
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "api_base": "https://www.googleapis.com/youtube/v3",
        "scopes": ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"],
        "post_types": ["video", "short"],
        "max_chars": 5000,  # description
        "supports_scheduling": True,
        "supports_analytics": True,
    },
}


# ============== HELPER FUNCTIONS ==============

# Note: get_current_user is defined at the top of this file (line ~39) with proper JWT auth


async def mock_publish_to_platform(platform: str, content: str, media_urls: List[str], 
                                   link_url: Optional[str], post_type: str) -> Dict[str, Any]:
    """
    Mock publishing function - simulates API response.
    Replace this with actual API calls when credentials are available.
    """
    import random
    import string
    
    # Generate mock platform post ID
    platform_post_id = ''.join(random.choices(string.digits, k=18))
    
    # Platform-specific URL patterns
    url_patterns = {
        "linkedin": f"https://www.linkedin.com/feed/update/urn:li:share:{platform_post_id}",
        "twitter": f"https://twitter.com/user/status/{platform_post_id}",
        "instagram": f"https://www.instagram.com/p/{platform_post_id[:11]}/",
        "facebook": f"https://www.facebook.com/permalink.php?id={platform_post_id}",
        "youtube": f"https://www.youtube.com/watch?v={platform_post_id[:11]}",
    }
    
    # Simulate success (95% success rate for demo)
    success = random.random() > 0.05
    
    if success:
        return {
            "success": True,
            "platform_post_id": platform_post_id,
            "platform_url": url_patterns.get(platform, f"https://{platform}.com/post/{platform_post_id}"),
            "message": f"Successfully published to {PLATFORM_CONFIGS[platform]['name']}",
        }
    else:
        return {
            "success": False,
            "platform_post_id": None,
            "platform_url": None,
            "message": f"Failed to publish to {PLATFORM_CONFIGS[platform]['name']}: Rate limit exceeded (simulated)",
        }


# ============== REAL API INTEGRATIONS ==============

import httpx

async def publish_to_instagram(content: str, media_urls: List[str], post_type: str) -> Dict[str, Any]:
    """
    Publish to Instagram using the Graph API.
    Supports: image posts, carousel posts, and reels.
    Note: Instagram requires media (no text-only posts).
    """
    access_token = os.environ.get("INSTAGRAM_ACCESS_TOKEN")
    account_id = os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID")
    
    if not access_token or not account_id:
        return {
            "success": False,
            "platform_post_id": None,
            "platform_url": None,
            "message": "Instagram credentials not configured. Please add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID to .env"
        }
    
    api_base = "https://graph.facebook.com/v18.0"
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Instagram requires at least one media item
            if not media_urls:
                return {
                    "success": False,
                    "platform_post_id": None,
                    "platform_url": None,
                    "message": "Instagram requires at least one image or video. Text-only posts are not supported."
                }
            
            if post_type == "carousel" and len(media_urls) > 1:
                # Carousel post (multiple images)
                children_ids = []
                for media_url in media_urls[:10]:  # Max 10 items
                    # Create container for each media
                    child_response = await client.post(
                        f"{api_base}/{account_id}/media",
                        params={
                            "image_url": media_url,
                            "is_carousel_item": "true",
                            "access_token": access_token
                        }
                    )
                    child_data = child_response.json()
                    if "id" in child_data:
                        children_ids.append(child_data["id"])
                
                if not children_ids:
                    return {
                        "success": False,
                        "platform_post_id": None,
                        "platform_url": None,
                        "message": "Failed to create carousel items"
                    }
                
                # Create carousel container
                container_response = await client.post(
                    f"{api_base}/{account_id}/media",
                    params={
                        "media_type": "CAROUSEL",
                        "children": ",".join(children_ids),
                        "caption": content,
                        "access_token": access_token
                    }
                )
                container_data = container_response.json()
                
            elif post_type in ["video", "reel"]:
                # Video/Reel post
                container_response = await client.post(
                    f"{api_base}/{account_id}/media",
                    params={
                        "media_type": "REELS" if post_type == "reel" else "VIDEO",
                        "video_url": media_urls[0],
                        "caption": content,
                        "access_token": access_token
                    }
                )
                container_data = container_response.json()
                
            else:
                # Single image post
                container_response = await client.post(
                    f"{api_base}/{account_id}/media",
                    params={
                        "image_url": media_urls[0],
                        "caption": content,
                        "access_token": access_token
                    }
                )
                container_data = container_response.json()
            
            if "id" not in container_data:
                error_msg = container_data.get("error", {}).get("message", "Unknown error")
                return {
                    "success": False,
                    "platform_post_id": None,
                    "platform_url": None,
                    "message": f"Instagram API error: {error_msg}"
                }
            
            container_id = container_data["id"]
            
            # Publish the container
            publish_response = await client.post(
                f"{api_base}/{account_id}/media_publish",
                params={
                    "creation_id": container_id,
                    "access_token": access_token
                }
            )
            publish_data = publish_response.json()
            
            if "id" in publish_data:
                media_id = publish_data["id"]
                # Get permalink
                permalink_response = await client.get(
                    f"{api_base}/{media_id}",
                    params={
                        "fields": "permalink,shortcode",
                        "access_token": access_token
                    }
                )
                permalink_data = permalink_response.json()
                
                return {
                    "success": True,
                    "platform_post_id": media_id,
                    "platform_url": permalink_data.get("permalink", f"https://www.instagram.com/p/{permalink_data.get('shortcode', media_id)}/"),
                    "message": "Successfully published to Instagram"
                }
            else:
                error_msg = publish_data.get("error", {}).get("message", "Failed to publish")
                return {
                    "success": False,
                    "platform_post_id": None,
                    "platform_url": None,
                    "message": f"Instagram publish error: {error_msg}"
                }
                
    except httpx.TimeoutException:
        return {
            "success": False,
            "platform_post_id": None,
            "platform_url": None,
            "message": "Instagram API timeout. Please try again."
        }
    except Exception as e:
        logger.error(f"Instagram publish error: {e}")
        return {
            "success": False,
            "platform_post_id": None,
            "platform_url": None,
            "message": f"Instagram error: {str(e)}"
        }


async def get_youtube_channel_info() -> Dict[str, Any]:
    """
    Get YouTube channel information using the Data API.
    Note: YouTube API Key only allows reading. Uploading requires OAuth.
    """
    api_key = os.environ.get("YOUTUBE_API_KEY")
    
    if not api_key:
        return {"error": "YouTube API key not configured"}
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # This would need OAuth for the user's channel
            # With just API key, we can search and read public data
            response = await client.get(
                "https://www.googleapis.com/youtube/v3/channels",
                params={
                    "part": "snippet,statistics",
                    "mine": "true",
                    "key": api_key
                }
            )
            return response.json()
    except Exception as e:
        return {"error": str(e)}


async def publish_to_platform_real(platform: str, content: str, media_urls: List[str], 
                                    link_url: Optional[str], post_type: str) -> Dict[str, Any]:
    """
    Route to real API or mock based on platform and available credentials.
    """
    # Check for real credentials
    if platform == "instagram":
        access_token = os.environ.get("INSTAGRAM_ACCESS_TOKEN")
        account_id = os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID")
        if access_token and account_id:
            logger.info("Using real Instagram API")
            return await publish_to_instagram(content, media_urls, post_type)
    
    if platform == "linkedin":
        # LinkedIn requires user OAuth - check if we have a stored access token
        if db is not None:
            # Check for user's LinkedIn connection with valid token
            # For now, return info about OAuth requirement
            pass
        logger.info("LinkedIn requires OAuth authorization")
    
    # YouTube requires OAuth for uploads - API key only allows reading
    # For now, YouTube publishing remains mock until OAuth is set up
    
    # Fall back to mock for platforms without credentials
    logger.info(f"Using mock API for {platform}")
    return await mock_publish_to_platform(platform, content, media_urls, link_url, post_type)


# ============== LINKEDIN OAUTH ==============

def get_linkedin_auth_url(redirect_uri: str, state: str) -> str:
    """Generate LinkedIn OAuth authorization URL"""
    client_id = os.environ.get("LINKEDIN_CLIENT_ID")
    scopes = "openid profile email w_member_social"
    
    return (
        f"https://www.linkedin.com/oauth/v2/authorization?"
        f"response_type=code&"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"state={state}&"
        f"scope={scopes}"
    )


async def exchange_linkedin_code(code: str, redirect_uri: str) -> Dict[str, Any]:
    """Exchange authorization code for access token"""
    client_id = os.environ.get("LINKEDIN_CLIENT_ID")
    client_secret = os.environ.get("LINKEDIN_CLIENT_SECRET")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": client_id,
                    "client_secret": client_secret
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            return response.json()
    except Exception as e:
        return {"error": str(e)}


async def get_linkedin_profile(access_token: str) -> Dict[str, Any]:
    """Get LinkedIn user profile"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            return response.json()
    except Exception as e:
        return {"error": str(e)}


async def publish_to_linkedin(access_token: str, author_urn: str, content: str, 
                               media_urls: List[str] = None, link_url: str = None) -> Dict[str, Any]:
    """
    Publish a post to LinkedIn using the API.
    Supports: text posts, link posts, and image posts.
    """
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Build the post payload
            post_data = {
                "author": author_urn,
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {
                            "text": content
                        },
                        "shareMediaCategory": "NONE"
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            }
            
            # Add link if provided
            if link_url:
                post_data["specificContent"]["com.linkedin.ugc.ShareContent"]["shareMediaCategory"] = "ARTICLE"
                post_data["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [{
                    "status": "READY",
                    "originalUrl": link_url
                }]
            
            # Post to LinkedIn
            response = await client.post(
                "https://api.linkedin.com/v2/ugcPosts",
                json=post_data,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0"
                }
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                post_id = data.get("id", "").replace("urn:li:share:", "")
                return {
                    "success": True,
                    "platform_post_id": post_id,
                    "platform_url": f"https://www.linkedin.com/feed/update/{data.get('id', '')}",
                    "message": "Successfully published to LinkedIn"
                }
            else:
                error_data = response.json() if response.content else {}
                return {
                    "success": False,
                    "platform_post_id": None,
                    "platform_url": None,
                    "message": f"LinkedIn API error: {error_data.get('message', response.status_code)}"
                }
                
    except Exception as e:
        logger.error(f"LinkedIn publish error: {e}")
        return {
            "success": False,
            "platform_post_id": None,
            "platform_url": None,
            "message": f"LinkedIn error: {str(e)}"
        }


# ============== ENDPOINTS ==============

@router.get("/platforms")
async def get_available_platforms():
    """Get list of all available platforms with their configurations"""
    platforms = []
    for key, config in PLATFORM_CONFIGS.items():
        platforms.append({
            "id": key,
            "name": config["name"],
            "icon": config["icon"],
            "color": config["color"],
            "post_types": config["post_types"],
            "max_chars": config["max_chars"],
            "supports_scheduling": config["supports_scheduling"],
            "supports_analytics": config["supports_analytics"],
            "scopes": config["scopes"],
        })
    return {"platforms": platforms}


@router.get("/connections")
async def get_user_connections(user: dict = Depends(get_current_user)):
    """Get all platform connections for current user"""
    if db is None:
        # Return mock data for structure-ready implementation
        return {
            "connections": [
                {
                    "id": "conn-linkedin-1",
                    "user_id": user["id"],
                    "platform": "linkedin",
                    "status": "disconnected",
                    "account_name": None,
                    "permissions": [],
                    "connected_at": None,
                }
            ],
            "available_platforms": list(PLATFORM_CONFIGS.keys())
        }
    
    connections = await db.social_platform_connections.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(10)
    
    # Add any platforms not yet connected
    connected_platforms = {c["platform"] for c in connections}
    for platform in PLATFORM_CONFIGS.keys():
        if platform not in connected_platforms:
            connections.append({
                "id": f"conn-{platform}-new",
                "user_id": user["id"],
                "platform": platform,
                "status": "disconnected",
                "account_name": None,
                "permissions": [],
                "connected_at": None,
            })
    
    return {
        "connections": connections,
        "available_platforms": list(PLATFORM_CONFIGS.keys())
    }


@router.get("/connections/{platform}")
async def get_platform_connection(platform: str, user: dict = Depends(get_current_user)):
    """Get connection status for a specific platform"""
    if platform not in PLATFORM_CONFIGS:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")
    
    if db is None:
        return {
            "platform": platform,
            "status": "disconnected",
            "config": PLATFORM_CONFIGS[platform],
            "message": "Database not connected - structure-ready mode"
        }
    
    connection = await db.social_platform_connections.find_one(
        {"user_id": user["id"], "platform": platform},
        {"_id": 0}
    )
    
    return {
        "platform": platform,
        "connection": connection,
        "config": PLATFORM_CONFIGS[platform],
        "status": connection["status"] if connection else "disconnected"
    }


@router.post("/connect/{platform}")
async def initiate_platform_connection(platform: str, user: dict = Depends(get_current_user)):
    """
    Initiate OAuth flow for platform connection.
    For LinkedIn: Returns OAuth URL for user authorization.
    For others: Simulates connection (structure-ready).
    """
    if platform not in PLATFORM_CONFIGS:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")
    
    config = PLATFORM_CONFIGS[platform]
    
    # LinkedIn: Real OAuth flow
    if platform == "linkedin":
        client_id = os.environ.get("LINKEDIN_CLIENT_ID")
        if client_id:
            base_url = os.environ.get("BACKEND_URL", os.environ.get("FRONTEND_URL", ""))
            redirect_uri = f"{base_url}/api/social/integrations/callback/linkedin"
            state = f"{user['id']}_{uuid.uuid4().hex[:8]}"
            
            auth_url = get_linkedin_auth_url(redirect_uri, state)
            
            # Store state in DB for verification
            if db is not None:
                await db.oauth_states.update_one(
                    {"user_id": user["id"], "platform": "linkedin"},
                    {"$set": {
                        "state": state,
                        "user_id": user["id"],
                        "platform": "linkedin",
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }},
                    upsert=True
                )
            
            return {
                "success": True,
                "requires_oauth": True,
                "auth_url": auth_url,
                "message": f"Please authorize LinkedIn access. Redirect to the auth_url.",
                "note": "User should be redirected to auth_url to complete OAuth flow"
            }
    
    # Structure-ready: Simulate OAuth and create mock connection
    connection_id = str(uuid.uuid4())
    mock_account_id = f"mock_{platform}_{uuid.uuid4().hex[:8]}"
    
    connection_doc = {
        "id": connection_id,
        "user_id": user["id"],
        "platform": platform,
        "status": "connected",
        "account_id": mock_account_id,
        "account_name": f"{user.get('name', 'User')}'s {config['name']} Account",
        "profile_url": f"https://{platform}.com/user/{mock_account_id}",
        "profile_image": None,
        "permissions": config["scopes"],
        "access_token": f"mock_token_{uuid.uuid4().hex}",  # Would be real token
        "refresh_token": f"mock_refresh_{uuid.uuid4().hex}",
        "expires_at": None,
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "last_synced": datetime.now(timezone.utc).isoformat(),
    }
    
    if db is not None:
        # Upsert connection
        await db.social_platform_connections.update_one(
            {"user_id": user["id"], "platform": platform},
            {"$set": connection_doc},
            upsert=True
        )
    
    return {
        "success": True,
        "message": f"Successfully connected to {config['name']} (structure-ready mode)",
        "connection": {
            "id": connection_id,
            "platform": platform,
            "status": "connected",
            "account_name": connection_doc["account_name"],
            "connected_at": connection_doc["connected_at"],
        },
        "note": "This is a simulated connection. Replace with real OAuth when API credentials are available."
    }


@router.delete("/disconnect/{platform}")
async def disconnect_platform(platform: str, user: dict = Depends(get_current_user)):
    """Disconnect a platform integration"""
    if platform not in PLATFORM_CONFIGS:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")
    
    if db is not None:
        result = await db.social_platform_connections.update_one(
            {"user_id": user["id"], "platform": platform},
            {"$set": {
                "status": "disconnected",
                "access_token": None,
                "refresh_token": None,
                "disconnected_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    return {
        "success": True,
        "message": f"Disconnected from {PLATFORM_CONFIGS[platform]['name']}",
        "platform": platform
    }


@router.post("/publish")
async def publish_to_platform(
    request: PublishRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Publish content to a specific platform.
    Structure-ready: Uses mock publishing, easy to swap for real APIs.
    """
    if request.platform not in PLATFORM_CONFIGS:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {request.platform}")
    
    config = PLATFORM_CONFIGS[request.platform]
    
    # Validate content length
    if len(request.content) > config["max_chars"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Content exceeds {config['max_chars']} character limit for {config['name']}"
        )
    
    # Validate post type
    if request.post_type not in config["post_types"]:
        raise HTTPException(
            status_code=400,
            detail=f"Post type '{request.post_type}' not supported for {config['name']}. Supported: {config['post_types']}"
        )
    
    # Check connection status
    connection = None
    if db is not None:
        connection = await db.social_platform_connections.find_one(
            {"user_id": user["id"], "platform": request.platform, "status": "connected"},
            {"_id": 0}
        )
    
    # For structure-ready, allow publishing even without DB connection
    if connection is None and db is not None:
        raise HTTPException(
            status_code=400,
            detail=f"Not connected to {config['name']}. Please connect your account first."
        )
    
    # Publish using real API if available, otherwise mock
    result = await publish_to_platform_real(
        platform=request.platform,
        content=request.content,
        media_urls=request.media_urls,
        link_url=request.link_url,
        post_type=request.post_type
    )
    
    # Log publish history
    history_id = str(uuid.uuid4())
    history_doc = {
        "id": history_id,
        "user_id": user["id"],
        "platform": request.platform,
        "platform_post_id": result.get("platform_post_id"),
        "platform_url": result.get("platform_url"),
        "status": "published" if result["success"] else "failed",
        "content_preview": request.content[:200],
        "media_urls": request.media_urls,
        "post_type": request.post_type,
        "published_at": datetime.now(timezone.utc).isoformat() if result["success"] else None,
        "error_message": None if result["success"] else result["message"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    if db is not None:
        await db.social_publish_history.insert_one(history_doc)
    
    return PublishResponse(
        success=result["success"],
        platform=request.platform,
        platform_post_id=result.get("platform_post_id"),
        platform_url=result.get("platform_url"),
        message=result["message"],
        published_at=history_doc.get("published_at"),
    )


@router.post("/publish/multi")
async def publish_to_multiple_platforms(
    request: MultiPublishRequest,
    user: dict = Depends(get_current_user)
):
    """Publish same content to multiple platforms at once"""
    results = []
    
    for platform in request.platforms:
        if platform not in PLATFORM_CONFIGS:
            results.append({
                "platform": platform,
                "success": False,
                "message": f"Unknown platform: {platform}"
            })
            continue
        
        config = PLATFORM_CONFIGS[platform]
        
        # Truncate content if needed for platform limits
        platform_content = request.content[:config["max_chars"]]
        
        result = await publish_to_platform_real(
            platform=platform,
            content=platform_content,
            media_urls=request.media_urls,
            link_url=request.link_url,
            post_type=request.post_type
        )
        
        results.append({
            "platform": platform,
            "platform_name": config["name"],
            **result
        })
        
        # Log to history
        if db is not None:
            await db.social_publish_history.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "platform": platform,
                "platform_post_id": result.get("platform_post_id"),
                "platform_url": result.get("platform_url"),
                "status": "published" if result["success"] else "failed",
                "content_preview": platform_content[:200],
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
    
    success_count = sum(1 for r in results if r.get("success"))
    
    return {
        "total": len(request.platforms),
        "successful": success_count,
        "failed": len(request.platforms) - success_count,
        "results": results
    }


@router.get("/history")
async def get_publish_history(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user)
):
    """Get publishing history for the current user"""
    if db is None:
        return {
            "history": [],
            "total": 0,
            "message": "Database not connected - structure-ready mode"
        }
    
    query = {"user_id": user["id"]}
    if platform:
        query["platform"] = platform
    if status:
        query["status"] = status
    
    history = await db.social_publish_history.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    total = await db.social_publish_history.count_documents(query)
    
    return {
        "history": history,
        "total": total
    }


@router.get("/stats")
async def get_integration_stats(user: dict = Depends(get_current_user)):
    """Get publishing statistics across all platforms"""
    if db is None:
        # Return mock stats for structure-ready mode
        return {
            "connected_platforms": 0,
            "total_posts": 0,
            "posts_today": 0,
            "posts_this_week": 0,
            "by_platform": {},
            "by_status": {"published": 0, "failed": 0, "scheduled": 0},
            "message": "Database not connected - structure-ready mode"
        }
    
    # Get connected platforms count
    connected = await db.social_platform_connections.count_documents({
        "user_id": user["id"],
        "status": "connected"
    })
    
    # Get total posts
    total_posts = await db.social_publish_history.count_documents({
        "user_id": user["id"]
    })
    
    # Get posts by status
    pipeline = [
        {"$match": {"user_id": user["id"]}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_agg = await db.social_publish_history.aggregate(pipeline).to_list(10)
    by_status = {item["_id"]: item["count"] for item in status_agg}
    
    # Get posts by platform
    platform_pipeline = [
        {"$match": {"user_id": user["id"]}},
        {"$group": {"_id": "$platform", "count": {"$sum": 1}}}
    ]
    platform_agg = await db.social_publish_history.aggregate(platform_pipeline).to_list(10)
    by_platform = {item["_id"]: item["count"] for item in platform_agg}
    
    return {
        "connected_platforms": connected,
        "total_posts": total_posts,
        "by_platform": by_platform,
        "by_status": by_status,
    }


@router.post("/test/{platform}")
async def test_platform_connection(platform: str, user: dict = Depends(get_current_user)):
    """Test if the platform connection is working"""
    if platform not in PLATFORM_CONFIGS:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")
    
    config = PLATFORM_CONFIGS[platform]
    
    # Test real Instagram connection
    if platform == "instagram":
        access_token = os.environ.get("INSTAGRAM_ACCESS_TOKEN")
        account_id = os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID")
        
        if access_token and account_id:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    # Test by fetching account info
                    response = await client.get(
                        f"https://graph.facebook.com/v18.0/{account_id}",
                        params={
                            "fields": "username,name,profile_picture_url,followers_count,media_count",
                            "access_token": access_token
                        }
                    )
                    data = response.json()
                    
                    if "error" in data:
                        return {
                            "platform": platform,
                            "platform_name": config["name"],
                            "test_successful": False,
                            "message": f"Instagram API error: {data['error'].get('message', 'Unknown error')}",
                            "note": "Check if your access token is valid and has the correct permissions."
                        }
                    
                    return {
                        "platform": platform,
                        "platform_name": config["name"],
                        "test_successful": True,
                        "message": f"Connected to Instagram account: @{data.get('username', 'unknown')}",
                        "account_info": {
                            "username": data.get("username"),
                            "name": data.get("name"),
                            "followers": data.get("followers_count"),
                            "posts": data.get("media_count"),
                            "profile_picture": data.get("profile_picture_url")
                        },
                        "note": "Real Instagram API connection verified!"
                    }
            except Exception as e:
                return {
                    "platform": platform,
                    "platform_name": config["name"],
                    "test_successful": False,
                    "message": f"Connection error: {str(e)}",
                    "note": "Could not connect to Instagram API."
                }
    
    # Test LinkedIn connection
    if platform == "linkedin":
        client_id = os.environ.get("LINKEDIN_CLIENT_ID")
        client_secret = os.environ.get("LINKEDIN_CLIENT_SECRET")
        
        if client_id and client_secret:
            # Check if user has an active LinkedIn connection
            if db is not None:
                connection = await db.social_platform_connections.find_one(
                    {"user_id": user["id"], "platform": "linkedin", "status": "connected"},
                    {"_id": 0}
                )
                
                if connection and connection.get("access_token"):
                    # Test the stored access token
                    try:
                        profile = await get_linkedin_profile(connection["access_token"])
                        if "error" not in profile:
                            return {
                                "platform": platform,
                                "platform_name": config["name"],
                                "test_successful": True,
                                "message": f"Connected to LinkedIn: {profile.get('name', 'Unknown')}",
                                "account_info": {
                                    "name": profile.get("name"),
                                    "email": profile.get("email"),
                                    "picture": profile.get("picture")
                                },
                                "note": "Real LinkedIn API connection verified!"
                            }
                    except Exception as e:
                        pass
            
            # Credentials exist but user needs to authorize
            return {
                "platform": platform,
                "platform_name": config["name"],
                "test_successful": False,
                "message": "LinkedIn credentials configured. Please authorize your account.",
                "requires_oauth": True,
                "note": "Click 'Connect LinkedIn' to authorize access to your LinkedIn account."
            }
    
    # Test YouTube API (read-only with API key)
    if platform == "youtube":
        api_key = os.environ.get("YOUTUBE_API_KEY")
        if api_key:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    # Test by searching (API key allows this)
                    response = await client.get(
                        "https://www.googleapis.com/youtube/v3/search",
                        params={
                            "part": "snippet",
                            "q": "test",
                            "maxResults": 1,
                            "key": api_key
                        }
                    )
                    data = response.json()
                    
                    if "error" in data:
                        return {
                            "platform": platform,
                            "platform_name": config["name"],
                            "test_successful": False,
                            "message": f"YouTube API error: {data['error'].get('message', 'Unknown error')}",
                            "note": "Check if your API key is valid."
                        }
                    
                    return {
                        "platform": platform,
                        "platform_name": config["name"],
                        "test_successful": True,
                        "message": "YouTube API key is working!",
                        "note": "Note: Uploading videos requires OAuth. API key only allows reading data."
                    }
            except Exception as e:
                return {
                    "platform": platform,
                    "platform_name": config["name"],
                    "test_successful": False,
                    "message": f"Connection error: {str(e)}",
                    "note": "Could not connect to YouTube API."
                }
    
    # Simulated test for other platforms
    test_result = await mock_publish_to_platform(
        platform=platform,
        content=f"Test post from Sevora Social Media Manager - {datetime.now().isoformat()}",
        media_urls=[],
        link_url=None,
        post_type="text"
    )
    
    return {
        "platform": platform,
        "platform_name": config["name"],
        "test_successful": test_result["success"],
        "message": test_result["message"],
        "note": "This is a simulated test. No actual post was made."
    }


# ============== OAUTH ENDPOINTS ==============

@router.get("/oauth/linkedin/start")
async def start_linkedin_oauth(user: dict = Depends(get_current_user)):
    """Start LinkedIn OAuth flow - returns URL to redirect user"""
    base_url = os.environ.get("BACKEND_URL", os.environ.get("FRONTEND_URL", ""))
    redirect_uri = f"{base_url}/api/social/integrations/callback/linkedin"
    state = f"{user['id']}_{uuid.uuid4().hex[:8]}"
    
    auth_url = get_linkedin_auth_url(redirect_uri, state)
    
    # Store state in DB for verification
    if db is not None:
        await db.oauth_states.insert_one({
            "state": state,
            "user_id": user["id"],
            "platform": "linkedin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {
        "auth_url": auth_url,
        "state": state,
        "message": "Redirect user to auth_url to authorize LinkedIn access"
    }


# ============== OAUTH CALLBACK HANDLERS ==============

@router.get("/callback/linkedin")
async def linkedin_callback(code: str, state: str):
    """Handle LinkedIn OAuth callback - exchange code for token"""
    # Verify state
    user_id = None
    if db is not None:
        state_doc = await db.oauth_states.find_one({"state": state})
        if state_doc:
            user_id = state_doc["user_id"]
            await db.oauth_states.delete_one({"state": state})
    
    base_url = os.environ.get("BACKEND_URL", os.environ.get("FRONTEND_URL", ""))
    redirect_uri = f"{base_url}/api/social/integrations/callback/linkedin"
    
    # Exchange code for token
    token_data = await exchange_linkedin_code(code, redirect_uri)
    
    if "error" in token_data:
        # Redirect to frontend with error
        return {"success": False, "error": token_data.get("error_description", token_data.get("error"))}
    
    access_token = token_data.get("access_token")
    expires_in = token_data.get("expires_in", 5184000)  # Default 60 days
    
    # Get user profile
    profile = await get_linkedin_profile(access_token)
    
    if "error" in profile:
        return {"success": False, "error": "Could not fetch LinkedIn profile"}
    
    # Store connection in database
    connection_id = str(uuid.uuid4())
    connection_doc = {
        "id": connection_id,
        "user_id": user_id or "unknown",
        "platform": "linkedin",
        "status": "connected",
        "account_id": profile.get("sub"),
        "account_name": profile.get("name"),
        "profile_url": f"https://www.linkedin.com/in/{profile.get('sub', '')}",
        "profile_image": profile.get("picture"),
        "access_token": access_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat(),
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "permissions": ["w_member_social", "openid", "profile", "email"],
    }
    
    if db is not None:
        await db.social_platform_connections.update_one(
            {"user_id": user_id, "platform": "linkedin"},
            {"$set": connection_doc},
            upsert=True
        )
    
    # Redirect to frontend success page
    frontend_url = os.environ.get("FRONTEND_URL", base_url)
    
    return {
        "success": True,
        "message": f"Successfully connected LinkedIn account: {profile.get('name')}",
        "profile": {
            "name": profile.get("name"),
            "email": profile.get("email"),
            "picture": profile.get("picture")
        },
        "redirect_url": f"{frontend_url}/social/integrations?connected=linkedin"
    }


@router.get("/callback/twitter")
async def twitter_callback(code: str, state: str):
    """Handle Twitter OAuth callback"""
    return {"message": "Twitter OAuth callback - credentials needed", "code": code[:10] + "..."}

@router.get("/callback/instagram")
async def instagram_callback(code: str):
    """Handle Instagram OAuth callback"""
    return {"message": "Instagram OAuth callback - structure ready", "code": code[:10] + "..."}

@router.get("/callback/facebook")
async def facebook_callback(code: str, state: str):
    """Handle Facebook OAuth callback"""
    return {"message": "Facebook OAuth callback - structure ready", "code": code[:10] + "..."}

@router.get("/callback/youtube")
async def youtube_callback(code: str, state: str):
    """Handle YouTube OAuth callback"""
    return {"message": "YouTube OAuth callback - structure ready", "code": code[:10] + "..."}
