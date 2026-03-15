"""
Public Influencer Discovery Service
Discovers influencers from public Instagram/social media using AI and web search
"""
import os
import json
import httpx
import asyncio
from typing import Optional, List, Dict
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()


class PublicInfluencerDiscoveryService:
    """Service to discover influencers from public sources like Instagram, YouTube, etc."""
    
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        self.google_api_key = os.environ.get('GOOGLE_SEARCH_API_KEY')
        self.google_cx = os.environ.get('GOOGLE_SEARCH_ENGINE_ID')
        
    async def search_google(self, query: str, num_results: int = 10) -> List[Dict]:
        """Search Google for influencer profiles"""
        if not self.google_api_key or not self.google_cx:
            return []
            
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    "https://www.googleapis.com/customsearch/v1",
                    params={
                        "key": self.google_api_key,
                        "cx": self.google_cx,
                        "q": query,
                        "num": min(num_results, 10)
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("items", [])
        except Exception as e:
            print(f"Google search error: {e}")
        return []
    
    async def extract_instagram_profile(self, username: str) -> Optional[Dict]:
        """Try to get basic Instagram profile info (public data only)"""
        try:
            # Use a simple approach - this is limited but doesn't require API
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"https://www.instagram.com/{username}/",
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    },
                    follow_redirects=True
                )
                
                if response.status_code == 200:
                    # Basic check if profile exists
                    return {"username": username, "exists": True}
        except Exception:
            pass
        return None

    async def discover_influencers(
        self,
        niche: str,
        location: str = "",
        platform: str = "instagram",
        follower_range: str = "10k-100k",
        count: int = 20
    ) -> Dict:
        """
        AI-powered discovery of influencers. Uses web search if available,
        otherwise uses AI knowledge to suggest relevant influencers.
        """
        
        # Try web search first
        all_results = []
        if self.google_api_key and self.google_cx:
            search_queries = [
                f"top {niche} influencers {location} {platform} {follower_range} followers",
                f"best {niche} creators {location} instagram",
                f"{niche} micro influencers {location} 2024 2025",
            ]
            
            for query in search_queries[:2]:
                results = await self.search_google(query)
                all_results.extend(results)
        
        # Use AI to discover/recommend influencers
        system_prompt = """You are an expert social media researcher. Your task is to suggest REAL, ACTIVE influencers based on search criteria.

CRITICAL: Return ONLY a valid JSON object with NO additional text, NO markdown formatting, NO code blocks.

The JSON must have this exact structure:
{"influencers":[{"name":"Full Name","instagram_handle":"handle_only","estimated_followers":50000,"follower_tier":"micro","niche":"Fashion","location":"City, Country","description":"Brief bio","collaboration_fit":"Why good for brands"}],"search_insights":{"recommendations":"Tips"}}

Rules:
- Only suggest REAL influencers with verifiable Instagram handles
- Follower tiers: nano (<10k), micro (10k-100k), macro (100k-1M), mega (1M+)
- instagram_handle must NOT include @ symbol
- Return 5-10 influencers maximum
- ONLY output JSON, nothing else"""

        # Prepare context from search results if available
        search_context = ""
        if all_results:
            search_context = f"""
Web Search Results (use these to verify/enhance suggestions):
{json.dumps([{"title": r.get("title", ""), "snippet": r.get("snippet", ""), "link": r.get("link", "")} for r in all_results[:10]], indent=2)}
"""

        user_prompt = f"""Find {count} real {niche} influencers from {location or 'any location'} on {platform} with {follower_range} followers. Return ONLY valid JSON."""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"discovery-{datetime.now().timestamp()}",
                system_message=system_prompt
            ).with_model("openai", "gpt-4o")
            
            response = await chat.send_message(UserMessage(user_prompt))
            response_text = response if isinstance(response, str) else str(response)
            
            # Clean up response - handle various JSON formats
            response_text = response_text.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                parts = response_text.split("```")
                for part in parts:
                    if "{" in part and "influencers" in part:
                        response_text = part
                        break
            
            # Try to find JSON object
            response_text = response_text.strip()
            if not response_text.startswith("{"):
                start_idx = response_text.find("{")
                if start_idx != -1:
                    response_text = response_text[start_idx:]
            
            # Remove trailing non-JSON content
            if response_text.endswith("}"):
                pass
            else:
                last_brace = response_text.rfind("}")
                if last_brace != -1:
                    response_text = response_text[:last_brace + 1]
            
            result = json.loads(response_text)
            
            # Add metadata
            result["discovery_metadata"] = {
                "search_query": f"{niche} {location} {platform}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "sources_analyzed": len(all_results),
                "follower_range": follower_range,
                "method": "ai_recommendation" if not all_results else "web_search_enhanced"
            }
            
            return result
            
        except json.JSONDecodeError as e:
            return {
                "influencers": [],
                "error": f"Failed to parse AI response: {str(e)}",
                "search_insights": {"recommendations": "Try a different niche or location"}
            }
        except Exception as e:
            return {
                "influencers": [],
                "error": f"Discovery failed: {str(e)}",
                "search_insights": {"recommendations": "Check API configuration or try again"}
            }

    async def discover_by_hashtag(self, hashtag: str, location: str = "") -> Dict:
        """Discover influencers by analyzing a specific hashtag"""
        
        # Placeholder - similar implementation as discover_influencers
        return {"influencers": [], "hashtag": hashtag}

    async def enrich_influencer_data(self, handle: str, platform: str = "instagram") -> Dict:
        """Try to enrich influencer data with additional public information"""
        
        search_query = f"{handle} {platform} influencer followers engagement"
        results = await self.search_google(search_query, num_results=5)
        
        system_prompt = """Extract detailed information about this specific influencer from search results.
Include: follower count, engagement rate, niche, location, recent collaborations, contact info.
Return as JSON."""

        user_prompt = f"""
Influencer to research: @{handle} on {platform}

Search Results:
{json.dumps([{"title": r.get("title"), "snippet": r.get("snippet")} for r in results], indent=2)}

Extract all available information about this influencer.
"""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"enrich-{datetime.now().timestamp()}",
                system_message=system_prompt
            ).with_model("openai", "gpt-4o")
            
            response = await chat.send_message(UserMessage(user_prompt))
            response_text = response if isinstance(response, str) else str(response)
            
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
                
            return json.loads(response_text.strip())
        except Exception:
            return {"handle": handle, "platform": platform, "enriched": False}


# Singleton instance
public_discovery_service = PublicInfluencerDiscoveryService()
