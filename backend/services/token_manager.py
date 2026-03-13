"""
Token Manager Service
Handles token expiry tracking and automatic refresh for social platform integrations.
"""

import os
import asyncio
import aiohttp
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
import uuid

logger = logging.getLogger(__name__)

# Meta Graph API Configuration
GRAPH_API_VERSION = "v21.0"
GRAPH_API_URL = "https://graph.facebook.com"


class TokenManagerService:
    """
    Manages OAuth tokens for social platforms.
    - Tracks token expiry
    - Provides refresh capabilities for Meta tokens
    - Generates expiry warnings
    """
    
    def __init__(self, db=None):
        self.db = db
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def _calculate_expiry_status(self, expires_at: Optional[str]) -> Dict[str, Any]:
        """Calculate token expiry status"""
        if not expires_at:
            return {
                "has_expiry": False,
                "is_expired": False,
                "days_remaining": None,
                "warning_level": None,
                "message": "Token has no expiry date"
            }
        
        try:
            expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            
            if now > expiry:
                return {
                    "has_expiry": True,
                    "is_expired": True,
                    "days_remaining": 0,
                    "warning_level": "critical",
                    "message": "Token has expired"
                }
            
            time_remaining = expiry - now
            days_remaining = time_remaining.days
            
            # Determine warning level
            if days_remaining <= 3:
                warning_level = "critical"
                message = f"Token expires in {days_remaining} day{'s' if days_remaining != 1 else ''}! Refresh immediately."
            elif days_remaining <= 7:
                warning_level = "warning"
                message = f"Token expires in {days_remaining} days. Consider refreshing soon."
            elif days_remaining <= 14:
                warning_level = "caution"
                message = f"Token expires in {days_remaining} days."
            else:
                warning_level = "ok"
                message = f"Token valid for {days_remaining} days."
            
            return {
                "has_expiry": True,
                "is_expired": False,
                "days_remaining": days_remaining,
                "hours_remaining": int(time_remaining.total_seconds() // 3600),
                "expires_at": expires_at,
                "warning_level": warning_level,
                "message": message
            }
        except Exception as e:
            logger.error(f"Error parsing expiry date: {e}")
            return {
                "has_expiry": True,
                "is_expired": False,
                "days_remaining": None,
                "warning_level": "unknown",
                "message": "Could not parse expiry date"
            }
    
    async def get_all_token_status(self) -> Dict[str, Any]:
        """Get token status for all connected platforms"""
        platforms_status = {}
        
        if self.db is None:
            return {"error": "Database not available"}
        
        # Get all connections
        connections = await self.db.social_platform_connections.find(
            {"status": "connected"},
            {"_id": 0, "access_token": 0, "refresh_token": 0}
        ).to_list(20)
        
        for conn in connections:
            platform = conn.get("platform")
            expires_at = conn.get("expires_at")
            
            expiry_status = self._calculate_expiry_status(expires_at)
            
            platforms_status[platform] = {
                "account_name": conn.get("account_name"),
                "account_id": conn.get("account_id"),
                "connected_at": conn.get("connected_at"),
                **expiry_status,
                "can_refresh": platform in ["instagram", "facebook"],  # Only Meta tokens can be refreshed
                "refresh_endpoint": f"/api/social/integrations/tokens/{platform}/refresh" if platform in ["instagram", "facebook"] else None
            }
        
        # Check .env configured tokens (Instagram/Facebook) - actually validate them
        if "instagram" not in platforms_status:
            instagram_token = os.environ.get("INSTAGRAM_ACCESS_TOKEN")
            if instagram_token:
                # Actually check this token's validity
                token_check = await self.check_token_validity(instagram_token)
                if token_check.get("valid"):
                    expiry_status = self._calculate_expiry_status(token_check.get("expires_at"))
                    platforms_status["instagram"] = {
                        "account_name": "Instagram (via .env)",
                        **expiry_status,
                        "expires_at": token_check.get("expires_at"),
                        "can_refresh": True,
                        "refresh_endpoint": "/api/social/tokens/instagram/refresh"
                    }
                else:
                    platforms_status["instagram"] = {
                        "account_name": "Instagram (via .env)",
                        "has_expiry": True,
                        "is_expired": True,
                        "days_remaining": 0,
                        "warning_level": "critical",
                        "message": token_check.get("error", "Token invalid or expired"),
                        "can_refresh": True,
                        "needs_reauth": True
                    }
        
        if "facebook" not in platforms_status:
            fb_token = os.environ.get("FACEBOOK_PAGE_ACCESS_TOKEN")
            if fb_token:
                # Actually check this token's validity
                token_check = await self.check_token_validity(fb_token)
                if token_check.get("valid"):
                    expiry_status = self._calculate_expiry_status(token_check.get("expires_at"))
                    platforms_status["facebook"] = {
                        "account_name": "Facebook Page (via .env)",
                        **expiry_status,
                        "expires_at": token_check.get("expires_at"),
                        "can_refresh": True,
                        "refresh_endpoint": "/api/social/tokens/facebook/refresh"
                    }
                else:
                    platforms_status["facebook"] = {
                        "account_name": "Facebook Page (via .env)",
                        "has_expiry": True,
                        "is_expired": True,
                        "days_remaining": 0,
                        "warning_level": "critical",
                        "message": token_check.get("error", "Token invalid or expired"),
                        "can_refresh": True,
                        "needs_reauth": True
                    }
        
        # Count warnings
        critical_count = sum(1 for p in platforms_status.values() if p.get("warning_level") == "critical")
        warning_count = sum(1 for p in platforms_status.values() if p.get("warning_level") == "warning")
        
        return {
            "platforms": platforms_status,
            "summary": {
                "total_connected": len(platforms_status),
                "critical_expiry": critical_count,
                "warning_expiry": warning_count,
                "needs_attention": critical_count + warning_count > 0
            }
        }
    
    async def refresh_meta_token(self, current_token: str) -> Dict[str, Any]:
        """
        Refresh a Meta (Facebook/Instagram) long-lived access token.
        
        Meta tokens can be refreshed to extend their validity by 60 days.
        The token must be refreshed before it expires.
        
        API: GET /oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={token}
        """
        app_id = os.environ.get("META_APP_ID") or os.environ.get("FACEBOOK_APP_ID")
        app_secret = os.environ.get("META_APP_SECRET") or os.environ.get("FACEBOOK_APP_SECRET")
        
        if not app_id or not app_secret:
            return {
                "success": False,
                "error": "Meta App credentials not configured. Set META_APP_ID and META_APP_SECRET in .env"
            }
        
        try:
            url = f"{GRAPH_API_URL}/{GRAPH_API_VERSION}/oauth/access_token"
            params = {
                "grant_type": "fb_exchange_token",
                "client_id": app_id,
                "client_secret": app_secret,
                "fb_exchange_token": current_token
            }
            
            async with self.session.get(url, params=params) as response:
                data = await response.json()
                
                if "error" in data:
                    error = data["error"]
                    return {
                        "success": False,
                        "error": error.get("message", "Token refresh failed"),
                        "error_code": error.get("code")
                    }
                
                new_token = data.get("access_token")
                expires_in = data.get("expires_in", 5184000)  # Default 60 days
                
                return {
                    "success": True,
                    "access_token": new_token,
                    "expires_in": expires_in,
                    "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat(),
                    "message": f"Token refreshed successfully. Valid for {expires_in // 86400} days."
                }
        
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            return {"success": False, "error": str(e)}
    
    async def check_token_validity(self, access_token: str) -> Dict[str, Any]:
        """
        Check if a Meta access token is valid and get its details.
        Uses the debug_token endpoint.
        """
        app_id = os.environ.get("META_APP_ID") or os.environ.get("FACEBOOK_APP_ID")
        app_secret = os.environ.get("META_APP_SECRET") or os.environ.get("FACEBOOK_APP_SECRET")
        
        if not app_id or not app_secret:
            # Try using the token itself for inspection
            app_token = access_token
        else:
            app_token = f"{app_id}|{app_secret}"
        
        try:
            url = f"{GRAPH_API_URL}/{GRAPH_API_VERSION}/debug_token"
            params = {
                "input_token": access_token,
                "access_token": app_token
            }
            
            async with self.session.get(url, params=params) as response:
                data = await response.json()
                
                if "error" in data:
                    return {
                        "valid": False,
                        "error": data["error"].get("message", "Unknown error")
                    }
                
                token_data = data.get("data", {})
                
                is_valid = token_data.get("is_valid", False)
                expires_at = token_data.get("expires_at", 0)
                
                if expires_at > 0:
                    expiry_dt = datetime.fromtimestamp(expires_at, tz=timezone.utc)
                    days_remaining = (expiry_dt - datetime.now(timezone.utc)).days
                else:
                    expiry_dt = None
                    days_remaining = None
                
                return {
                    "valid": is_valid,
                    "app_id": token_data.get("app_id"),
                    "user_id": token_data.get("user_id"),
                    "type": token_data.get("type"),
                    "scopes": token_data.get("scopes", []),
                    "expires_at": expiry_dt.isoformat() if expiry_dt else None,
                    "days_remaining": days_remaining,
                    "issued_at": datetime.fromtimestamp(
                        token_data.get("issued_at", 0), tz=timezone.utc
                    ).isoformat() if token_data.get("issued_at") else None
                }
        
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return {"valid": False, "error": str(e)}
    
    async def refresh_platform_token(self, platform: str) -> Dict[str, Any]:
        """
        Refresh token for a specific platform.
        Currently supports: instagram, facebook
        
        For Meta platforms, always use .env token as the source of truth since
        these are manually configured.
        """
        if platform not in ["instagram", "facebook"]:
            return {
                "success": False,
                "error": f"Token refresh not supported for {platform}"
            }
        
        # Always prefer .env tokens for Meta platforms
        if platform == "instagram":
            current_token = os.environ.get("INSTAGRAM_ACCESS_TOKEN")
        else:
            current_token = os.environ.get("FACEBOOK_PAGE_ACCESS_TOKEN")
        
        if not current_token:
            return {"success": False, "error": f"No access token found for {platform} in .env file. Please add INSTAGRAM_ACCESS_TOKEN or FACEBOOK_PAGE_ACCESS_TOKEN to your .env configuration."}
        
        # Refresh the token
        result = await self.refresh_meta_token(current_token)
        
        if result.get("success"):
            # Token refreshed successfully
            result["message"] = f"{platform.title()} token refreshed successfully! New token valid for ~60 days."
            result["instructions"] = f"Update your .env file with the new token: {'INSTAGRAM_ACCESS_TOKEN' if platform == 'instagram' else 'FACEBOOK_PAGE_ACCESS_TOKEN'}={result.get('access_token', '')[:50]}..."
        else:
            # Check if token is expired
            error_msg = result.get("error", "")
            if "expired" in error_msg.lower():
                result["error"] = f"Token has expired and cannot be refreshed. You need to generate a NEW token from Facebook Developer Console."
                result["help_url"] = "https://developers.facebook.com/tools/explorer/"
                result["instructions"] = [
                    "1. Go to Facebook Developer Console (Graph API Explorer)",
                    "2. Select your App",
                    "3. Generate a new Page Access Token",
                    "4. Exchange it for a long-lived token (60 days)",
                    f"5. Update .env with: {'FACEBOOK_PAGE_ACCESS_TOKEN' if platform == 'facebook' else 'INSTAGRAM_ACCESS_TOKEN'}=<new_token>",
                    "6. Restart the backend service"
                ]
        
        return result


# Singleton instance
_token_manager: Optional[TokenManagerService] = None

def get_token_manager(db=None) -> TokenManagerService:
    """Get or create token manager instance"""
    global _token_manager
    if _token_manager is None or db is not None:
        _token_manager = TokenManagerService(db)
    return _token_manager
