"""
AI Discovery Service - Intelligent Influencer Recommendation Engine
"""
import os
import json
from typing import Optional, List, Dict
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# Optional import for emergentintegrations
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    EMERGENT_AVAILABLE = True
except ImportError:
    LlmChat = None
    UserMessage = None
    EMERGENT_AVAILABLE = False

class AIDiscoveryService:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        
    async def discover_influencers(
        self,
        campaign_brief: Dict,
        existing_influencers: List[Dict]
    ) -> Dict:
        """
        Use AI to analyze campaign brief and recommend matching influencers
        from the existing database.
        """
        
        # Build context from existing influencers
        influencer_data = []
        for inf in existing_influencers:
            influencer_data.append({
                "id": inf.get("id"),
                "name": inf.get("name"),
                "handle": inf.get("instagram_handle") or inf.get("youtube_handle"),
                "platform": inf.get("primary_platform", "instagram"),
                "followers": inf.get("followers", 0),
                "engagement_rate": inf.get("engagement_rate", 0),
                "industry": inf.get("industry", "Unknown"),
                "location": f"{inf.get('city', '')}, {inf.get('state', '')}",
                "gender": inf.get("gender"),
                "tier": inf.get("tier"),
                "status": inf.get("status"),
                "bio": inf.get("bio", "")[:200] if inf.get("bio") else "",
                "avg_likes": inf.get("avg_likes", 0),
                "avg_comments": inf.get("avg_comments", 0)
            })
        
        system_prompt = """You are an expert influencer marketing strategist. Your task is to analyze campaign requirements and recommend the most suitable influencers from a given database.

For each recommendation, provide:
1. A match score (0-100) based on how well the influencer matches the campaign brief
2. Key reasons why this influencer is a good match
3. Potential concerns or considerations
4. Suggested collaboration type

Return your response as a valid JSON object with the following structure:
{
    "recommendations": [
        {
            "influencer_id": "string",
            "match_score": number,
            "match_reasons": ["reason1", "reason2"],
            "concerns": ["concern1"],
            "suggested_collaboration": "string",
            "estimated_reach": number,
            "estimated_engagement": number
        }
    ],
    "campaign_insights": {
        "target_audience_analysis": "string",
        "recommended_content_types": ["type1", "type2"],
        "best_posting_times": "string",
        "budget_allocation_suggestion": "string"
    },
    "additional_recommendations": "string"
}

Always return valid JSON. If no suitable influencers are found, return an empty recommendations array with helpful insights."""

        user_prompt = f"""
Campaign Brief:
- Industry/Niche: {campaign_brief.get('industry', 'Any')}
- Target Audience: {campaign_brief.get('target_audience', 'General')}
- Platform Focus: {campaign_brief.get('platform', 'Any')}
- Location: {campaign_brief.get('location', 'Any')}
- Budget Range: {campaign_brief.get('budget_min', 0)} - {campaign_brief.get('budget_max', 'Unlimited')} INR
- Follower Range: {campaign_brief.get('follower_min', 0)} - {campaign_brief.get('follower_max', 'Any')}
- Campaign Objective: {campaign_brief.get('objective', 'Brand Awareness')}
- Content Type Preference: {campaign_brief.get('content_type', 'Any')}
- Additional Requirements: {campaign_brief.get('additional_requirements', 'None')}

Available Influencers Database:
{json.dumps(influencer_data, indent=2)}

Analyze the campaign brief and recommend the top influencers from the database. 
Rank them by match score and provide detailed reasoning.
Consider factors like audience alignment, engagement quality, platform fit, and budget efficiency.
"""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"discovery-{datetime.now().timestamp()}",
                system_message=system_prompt
            ).with_model("openai", "gpt-4o")
            
            message = UserMessage(text=user_prompt)
            response = await chat.send_message(message)
            
            # Parse the JSON response
            try:
                # Clean up the response if it has markdown code blocks
                cleaned_response = response.strip()
                if cleaned_response.startswith("```"):
                    cleaned_response = cleaned_response.split("```")[1]
                    if cleaned_response.startswith("json"):
                        cleaned_response = cleaned_response[4:]
                cleaned_response = cleaned_response.strip()
                
                result = json.loads(cleaned_response)
                return {
                    "success": True,
                    "data": result,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            except json.JSONDecodeError:
                # If JSON parsing fails, return the raw response
                return {
                    "success": True,
                    "data": {
                        "recommendations": [],
                        "raw_response": response,
                        "campaign_insights": {
                            "target_audience_analysis": "Analysis available in raw response",
                            "recommended_content_types": [],
                            "best_posting_times": "",
                            "budget_allocation_suggestion": ""
                        }
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    async def generate_outreach_message(
        self,
        influencer: Dict,
        campaign: Dict,
        tone: str = "professional"
    ) -> Dict:
        """Generate personalized outreach message for an influencer"""
        
        system_prompt = f"""You are an expert influencer outreach specialist. 
Generate a personalized, {tone} outreach message for an influencer collaboration.
The message should be engaging, respect the influencer's work, and clearly communicate the opportunity.
Return the response as JSON with: subject, message, and follow_up_message fields."""

        user_prompt = f"""
Influencer Details:
- Name: {influencer.get('name')}
- Handle: {influencer.get('instagram_handle') or influencer.get('youtube_handle')}
- Platform: {influencer.get('primary_platform', 'Instagram')}
- Industry: {influencer.get('industry')}
- Followers: {influencer.get('followers', 0)}

Campaign Details:
- Campaign Name: {campaign.get('name')}
- Objective: {campaign.get('objective')}
- Brand/Company: {campaign.get('brand_name', 'Our brand')}
- Key Message: {campaign.get('key_message', 'Collaboration opportunity')}

Generate a personalized outreach message."""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"outreach-{datetime.now().timestamp()}",
                system_message=system_prompt
            ).with_model("openai", "gpt-4o")
            
            message = UserMessage(text=user_prompt)
            response = await chat.send_message(message)
            
            try:
                cleaned_response = response.strip()
                if cleaned_response.startswith("```"):
                    cleaned_response = cleaned_response.split("```")[1]
                    if cleaned_response.startswith("json"):
                        cleaned_response = cleaned_response[4:]
                result = json.loads(cleaned_response.strip())
                return {"success": True, "data": result}
            except json.JSONDecodeError:
                return {"success": True, "data": {"message": response}}
                
        except Exception as e:
            return {"success": False, "error": str(e)}

# Singleton instance
ai_discovery_service = AIDiscoveryService()
