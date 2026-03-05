"""
User Roles and Permissions Service
Handles role-based access control for the application
"""
from functools import wraps
from typing import List, Callable
from fastapi import HTTPException, status

# Role definitions
ROLES = {
    "admin": {
        "name": "Administrator",
        "description": "Full access to everything",
        "permissions": ["*"]  # Wildcard = all permissions
    },
    "marketing_manager": {
        "name": "Marketing Manager",
        "description": "Manage influencers, campaigns, outreach, and AI tools",
        "permissions": [
            "influencers:read", "influencers:write", "influencers:delete",
            "campaigns:read", "campaigns:write", "campaigns:delete",
            "outreach:read", "outreach:write",
            "negotiations:read", "negotiations:write",
            "ai:read", "ai:write",
            "scheduled:read", "scheduled:write",
            "social:read", "social:write",
            "analytics:read"  # Can view but not modify budgets
        ]
    },
    "finance": {
        "name": "Finance",
        "description": "Budget, payments, and analytics only",
        "permissions": [
            "analytics:read", "analytics:write",
            "campaigns:read",  # Can view campaigns but not edit
            "negotiations:read",  # Can view negotiations (for payment tracking)
            "influencers:read"  # Can view influencer rates
        ]
    }
}

# Permission to route mapping
ROUTE_PERMISSIONS = {
    # Influencers
    "GET /api/influencers": "influencers:read",
    "POST /api/influencers": "influencers:write",
    "GET /api/influencers/{id}": "influencers:read",
    "PUT /api/influencers/{id}": "influencers:write",
    "DELETE /api/influencers/{id}": "influencers:delete",
    "POST /api/influencers/compare": "influencers:read",
    "POST /api/influencers/refresh/{id}": "influencers:write",
    "POST /api/influencers/batch-refresh": "influencers:write",
    
    # Campaigns
    "GET /api/campaigns": "campaigns:read",
    "POST /api/campaigns": "campaigns:write",
    "GET /api/campaigns/{id}": "campaigns:read",
    "PUT /api/campaigns/{id}": "campaigns:write",
    "DELETE /api/campaigns/{id}": "campaigns:delete",
    "POST /api/campaigns/{id}/assign": "campaigns:write",
    
    # Outreach
    "GET /api/outreach": "outreach:read",
    "POST /api/outreach": "outreach:write",
    "POST /api/outreach/send-email": "outreach:write",
    "POST /api/outreach/send-whatsapp": "outreach:write",
    
    # Negotiations
    "GET /api/negotiations": "negotiations:read",
    "POST /api/negotiations": "negotiations:write",
    "GET /api/negotiations/{id}": "negotiations:read",
    "PUT /api/negotiations/{id}": "negotiations:write",
    "DELETE /api/negotiations/{id}": "negotiations:write",
    "POST /api/negotiations/{id}/event": "negotiations:write",
    
    # AI Tools
    "POST /api/ai/match-influencers": "ai:read",
    "POST /api/ai/generate-caption": "ai:write",
    "POST /api/ai/campaign-ideas": "ai:write",
    "POST /api/ai/auto-discover": "ai:write",
    "GET /api/ai/auto-discover-stream": "ai:write",
    "POST /api/ai/auto-discover-background": "ai:write",
    "GET /api/ai/task-status/{id}": "ai:read",
    "POST /api/ai/import-discovered": "ai:write",
    
    # Scheduled Discovery
    "GET /api/scheduled/searches": "scheduled:read",
    "POST /api/scheduled/searches": "scheduled:write",
    "PUT /api/scheduled/searches/{id}": "scheduled:write",
    "DELETE /api/scheduled/searches/{id}": "scheduled:write",
    "POST /api/scheduled/searches/{id}/run": "scheduled:write",
    "GET /api/scheduled/results": "scheduled:read",
    "GET /api/scheduled/status": "scheduled:read",
    
    # Social API
    "POST /api/social/configure": "social:write",
    "GET /api/social/verify/{platform}/{username}": "social:read",
    "POST /api/social/verify-influencer/{id}": "social:write",
    
    # Analytics
    "GET /api/analytics/dashboard": "analytics:read",
    "GET /api/analytics/campaign/{id}": "analytics:read",
    
    # Users (admin only)
    "GET /api/users": "users:read",
    "PUT /api/users/{id}/role": "users:write",
    "DELETE /api/users/{id}": "users:delete"
}


def get_role_permissions(role: str) -> List[str]:
    """Get permissions for a role"""
    if role not in ROLES:
        return []
    return ROLES[role]["permissions"]


def has_permission(user_role: str, required_permission: str) -> bool:
    """Check if a user role has a specific permission"""
    permissions = get_role_permissions(user_role)
    
    # Admin has all permissions
    if "*" in permissions:
        return True
    
    # Check exact permission
    if required_permission in permissions:
        return True
    
    # Check wildcard (e.g., "influencers:*" matches "influencers:read")
    permission_category = required_permission.split(":")[0]
    if f"{permission_category}:*" in permissions:
        return True
    
    return False


def check_route_permission(user_role: str, method: str, path: str) -> bool:
    """Check if user has permission for a specific route"""
    # Normalize path (remove trailing slashes, convert IDs to {id})
    import re
    normalized_path = re.sub(r'/[a-f0-9-]{36}', '/{id}', path)
    normalized_path = normalized_path.rstrip('/')
    
    route_key = f"{method.upper()} {normalized_path}"
    
    # Check if route is in permission map
    if route_key in ROUTE_PERMISSIONS:
        required_permission = ROUTE_PERMISSIONS[route_key]
        return has_permission(user_role, required_permission)
    
    # If route not in map, allow by default (or could deny by default)
    return True


def require_permission(permission: str):
    """Decorator to require a specific permission"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get user from kwargs (injected by Depends)
            user = kwargs.get('user')
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            user_role = user.get('role', 'marketing_manager')
            
            if not has_permission(user_role, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied. Required: {permission}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_roles(*roles: str):
    """Decorator to require specific roles"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user = kwargs.get('user')
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            user_role = user.get('role', 'marketing_manager')
            
            if user_role not in roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Required roles: {', '.join(roles)}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def get_all_roles() -> dict:
    """Get all available roles with their descriptions"""
    return {
        role: {
            "name": info["name"],
            "description": info["description"],
            "permissions_count": len(info["permissions"])
        }
        for role, info in ROLES.items()
    }


def get_role_details(role: str) -> dict:
    """Get detailed information about a role"""
    if role not in ROLES:
        return None
    
    return {
        "role": role,
        "name": ROLES[role]["name"],
        "description": ROLES[role]["description"],
        "permissions": ROLES[role]["permissions"]
    }
