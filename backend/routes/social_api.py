"""
Social Media API Routes - Instagram & YouTube Integration
For influencer discovery and live profile data
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from services.social_api import (
    get_instagram_service,
    get_youtube_service,
    get_social_profile_service
)

social_api_router = APIRouter(prefix="/social-api", tags=["Social Media APIs"])


# ============== CONNECTION STATUS ==============

@social_api_router.get("/status")
async def get_api_status():
    """Get connection status for all social media APIs"""
    service = get_social_profile_service()
    return service.get_status()


@social_api_router.get("/instagram/status")
async def get_instagram_status():
    """Get Instagram Graph API connection status"""
    service = get_instagram_service()
    return service.get_connection_status()


@social_api_router.get("/youtube/status")
async def get_youtube_status():
    """Get YouTube Data API connection status"""
    service = get_youtube_service()
    return service.get_connection_status()


# ============== INSTAGRAM ENDPOINTS ==============

@social_api_router.get("/instagram/profile/{username}")
async def get_instagram_profile(username: str):
    """
    Fetch Instagram profile data using Business Discovery API
    
    Args:
        username: Instagram handle (with or without @)
    
    Returns:
        Profile data with followers, engagement rate, recent media
    """
    service = get_instagram_service()
    
    if not service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="Instagram API not configured. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID."
        )
    
    profile = service.get_business_discovery(username)
    
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"Instagram profile '{username}' not found or is private"
        )
    
    return profile


@social_api_router.get("/instagram/hashtag/{hashtag}")
async def search_instagram_hashtag(hashtag: str, limit: int = Query(20, le=50)):
    """
    Search for recent media with a specific hashtag
    Note: Requires hashtag_search permission on Instagram API
    """
    service = get_instagram_service()
    
    if not service.is_configured:
        raise HTTPException(status_code=503, detail="Instagram API not configured")
    
    result = service.search_hashtag(hashtag, limit)
    
    if not result:
        raise HTTPException(status_code=404, detail=f"Hashtag '{hashtag}' not found")
    
    return result


# ============== YOUTUBE ENDPOINTS ==============

@social_api_router.get("/youtube/channel/{handle}")
async def get_youtube_channel(handle: str):
    """
    Fetch YouTube channel data by handle or custom URL
    
    Args:
        handle: YouTube handle (with or without @)
    
    Returns:
        Channel data with subscribers, views, recent videos
    """
    service = get_youtube_service()
    
    if not service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="YouTube API not configured. Set YOUTUBE_API_KEY."
        )
    
    channel = service.get_channel_by_handle(handle)
    
    if not channel:
        raise HTTPException(
            status_code=404,
            detail=f"YouTube channel '{handle}' not found"
        )
    
    return channel


@social_api_router.get("/youtube/channel/id/{channel_id}")
async def get_youtube_channel_by_id(channel_id: str):
    """Fetch YouTube channel by channel ID"""
    service = get_youtube_service()
    
    if not service.is_configured:
        raise HTTPException(status_code=503, detail="YouTube API not configured")
    
    channel = service.get_channel_by_id(channel_id)
    
    if not channel:
        raise HTTPException(status_code=404, detail=f"Channel ID '{channel_id}' not found")
    
    return channel


@social_api_router.get("/youtube/search")
async def search_youtube_channels(
    query: str = Query(..., min_length=2),
    limit: int = Query(10, le=25)
):
    """Search for YouTube channels by keyword"""
    service = get_youtube_service()
    
    if not service.is_configured:
        raise HTTPException(status_code=503, detail="YouTube API not configured")
    
    channels = service.search_channels(query, limit)
    return {"query": query, "results": channels, "count": len(channels)}


# ============== UNIFIED PROFILE ENDPOINTS ==============

@social_api_router.get("/profile/{platform}/{handle}")
async def get_social_profile(platform: str, handle: str):
    """
    Fetch profile from any supported platform
    
    Args:
        platform: 'instagram' or 'youtube'
        handle: Username/handle for the platform
    """
    service = get_social_profile_service()
    
    profile = service.fetch_profile(platform, handle)
    
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"Profile '{handle}' not found on {platform}"
        )
    
    return profile


@social_api_router.post("/profile/bulk")
async def get_bulk_profiles(handles: dict):
    """
    Fetch profiles from multiple platforms in one request
    
    Body:
        {
            "instagram": "@fashionista",
            "youtube": "@fashionvlog"
        }
    
    Returns:
        Dict with platform as key and profile data as value
    """
    service = get_social_profile_service()
    results = service.fetch_all_profiles(handles)
    return results


# ============== INFLUENCER SYNC ENDPOINTS ==============

@social_api_router.post("/sync/influencer/{contact_id}")
async def sync_influencer_social_data(contact_id: str):
    """
    Sync social media data for an influencer contact
    Updates the contact record with latest metrics from Instagram/YouTube
    """
    from server import db
    
    # Get contact
    contact = await db.contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    service = get_social_profile_service()
    updates = {}
    sync_results = {"synced_platforms": [], "errors": []}
    
    # Sync Instagram
    instagram_handle = contact.get("instagram_handle")
    if instagram_handle:
        try:
            ig_profile = service.fetch_profile("instagram", instagram_handle)
            if ig_profile:
                updates["instagram_followers"] = ig_profile.get("followers", 0)
                updates["instagram_engagement_rate"] = ig_profile.get("engagement_rate", 0)
                updates["instagram_posts_count"] = ig_profile.get("posts_count", 0)
                updates["instagram_profile_pic"] = ig_profile.get("profile_picture")
                updates["instagram_synced_at"] = datetime.now(timezone.utc).isoformat()
                sync_results["synced_platforms"].append("instagram")
                sync_results["instagram"] = {
                    "followers": ig_profile.get("followers"),
                    "engagement_rate": ig_profile.get("engagement_rate")
                }
        except Exception as e:
            sync_results["errors"].append({"platform": "instagram", "error": str(e)})
    
    # Sync YouTube
    youtube_handle = contact.get("youtube_handle")
    if youtube_handle:
        try:
            yt_profile = service.fetch_profile("youtube", youtube_handle)
            if yt_profile:
                updates["youtube_subscribers"] = yt_profile.get("subscribers", 0)
                updates["youtube_total_views"] = yt_profile.get("total_views", 0)
                updates["youtube_video_count"] = yt_profile.get("video_count", 0)
                updates["youtube_engagement_rate"] = yt_profile.get("engagement_rate", 0)
                updates["youtube_synced_at"] = datetime.now(timezone.utc).isoformat()
                sync_results["synced_platforms"].append("youtube")
                sync_results["youtube"] = {
                    "subscribers": yt_profile.get("subscribers"),
                    "total_views": yt_profile.get("total_views")
                }
        except Exception as e:
            sync_results["errors"].append({"platform": "youtube", "error": str(e)})
    
    # Update primary metrics if we synced the primary platform
    primary_platform = contact.get("primary_platform", "instagram")
    if primary_platform == "instagram" and "instagram_followers" in updates:
        updates["followers"] = updates["instagram_followers"]
        updates["engagement_rate"] = updates.get("instagram_engagement_rate", 0)
    elif primary_platform == "youtube" and "youtube_subscribers" in updates:
        updates["followers"] = updates["youtube_subscribers"]
        updates["engagement_rate"] = updates.get("youtube_engagement_rate", 0)
    
    # Save updates
    if updates:
        updates["social_synced_at"] = datetime.now(timezone.utc).isoformat()
        await db.contacts.update_one({"id": contact_id}, {"$set": updates})
    
    sync_results["contact_id"] = contact_id
    sync_results["updated_fields"] = list(updates.keys())
    
    return sync_results


@social_api_router.post("/sync/batch")
async def batch_sync_social_data(contact_ids: List[str]):
    """
    Sync social media data for multiple contacts
    
    Body:
        ["contact_id_1", "contact_id_2", ...]
    """
    results = []
    
    for contact_id in contact_ids[:20]:  # Limit to 20 to avoid rate limits
        try:
            result = await sync_influencer_social_data(contact_id)
            results.append({"contact_id": contact_id, "success": True, "data": result})
        except HTTPException as e:
            results.append({"contact_id": contact_id, "success": False, "error": e.detail})
        except Exception as e:
            results.append({"contact_id": contact_id, "success": False, "error": str(e)})
    
    return {
        "total": len(contact_ids),
        "processed": len(results),
        "successful": len([r for r in results if r.get("success")]),
        "failed": len([r for r in results if not r.get("success")]),
        "results": results
    }
