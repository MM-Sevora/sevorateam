"""
Simple in-memory cache with TTL support for frequently accessed data.
Use for data that doesn't change frequently (departments, grades, settings, etc.)
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Optional, Callable
import functools

class SimpleCache:
    """Simple in-memory cache with TTL"""
    
    def __init__(self):
        self._cache = {}
        self._expiry = {}
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key in self._cache:
            if datetime.now() < self._expiry.get(key, datetime.min):
                return self._cache[key]
            else:
                # Expired, remove
                del self._cache[key]
                del self._expiry[key]
        return None
    
    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set value in cache with TTL (default 5 minutes)"""
        self._cache[key] = value
        self._expiry[key] = datetime.now() + timedelta(seconds=ttl_seconds)
    
    def delete(self, key: str):
        """Delete key from cache"""
        self._cache.pop(key, None)
        self._expiry.pop(key, None)
    
    def clear(self):
        """Clear all cache"""
        self._cache.clear()
        self._expiry.clear()
    
    def clear_pattern(self, pattern: str):
        """Clear all keys matching pattern"""
        keys_to_delete = [k for k in self._cache.keys() if pattern in k]
        for key in keys_to_delete:
            self.delete(key)


# Global cache instance
cache = SimpleCache()


def cached(ttl_seconds: int = 300, key_prefix: str = ""):
    """
    Decorator for caching async function results.
    
    Usage:
        @cached(ttl_seconds=600, key_prefix="users")
        async def get_user_by_id(user_id: str):
            ...
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = f"{key_prefix}:{func.__name__}:{str(args)}:{str(sorted(kwargs.items()))}"
            
            # Check cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call function and cache result
            result = await func(*args, **kwargs)
            cache.set(cache_key, result, ttl_seconds)
            return result
        
        return wrapper
    return decorator


# Helper functions for common cache operations
def invalidate_user_cache(user_id: str):
    """Invalidate all cache related to a user"""
    cache.clear_pattern(f"user:{user_id}")


def invalidate_project_cache(project_id: str):
    """Invalidate all cache related to a project"""
    cache.clear_pattern(f"project:{project_id}")


def invalidate_contact_cache(contact_id: str = None):
    """Invalidate contact-related cache"""
    if contact_id:
        cache.clear_pattern(f"contact:{contact_id}")
    else:
        cache.clear_pattern("contacts")


def invalidate_campaign_cache(campaign_id: str = None):
    """Invalidate campaign-related cache"""
    if campaign_id:
        cache.clear_pattern(f"campaign:{campaign_id}")
    else:
        cache.clear_pattern("campaigns")
