"""
AI PR Discovery Service - Intelligent Media Contact Discovery Engine
Phase 2: AI Media Discovery for Digital PR Platform
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

class AIPRDiscoveryService:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        
    async def discover_journalists(
        self,
        discovery_brief: Dict,
        existing_journalists: List[Dict]
    ) -> Dict:
        """
        Use AI to analyze PR brief and recommend matching journalists
        from the existing media database.
        """
        
        # Build context from existing journalists
        journalist_data = []
        for j in existing_journalists:
            journalist_data.append({
                "id": j.get("id"),
                "name": j.get("name"),
                "email": j.get("email"),
                "publication": j.get("publication"),
                "beat": j.get("beat", "General"),
                "editor_level": j.get("editor_level", "staff"),
                "domain_authority": j.get("domain_authority", 0),
                "monthly_traffic": j.get("monthly_traffic", 0),
                "location": f"{j.get('city', '')}, {j.get('country', '')}",
                "twitter_handle": j.get("twitter_handle"),
                "status": j.get("status"),
                "score": j.get("score", 0),
                "preferred_contact_method": j.get("preferred_contact_method", "email")
            })
        
        system_prompt = """You are an expert PR strategist specializing in media relations. Your task is to analyze PR campaign requirements and recommend the most suitable journalists and media contacts from a given database.

For each recommendation, provide:
1. A match score (0-100) based on how well the journalist matches the PR objectives
2. Key reasons why this journalist is a good match (beat alignment, publication reach, past coverage)
3. Potential concerns or considerations
4. Recommended pitch angle for this journalist
5. Best time/approach to contact

Return your response as a valid JSON object with the following structure:
{
    "recommendations": [
        {
            "journalist_id": "string",
            "match_score": number,
            "match_reasons": ["reason1", "reason2"],
            "concerns": ["concern1"],
            "recommended_pitch_angle": "string",
            "contact_approach": "string",
            "estimated_reach": number,
            "priority": "high|medium|low"
        }
    ],
    "pr_insights": {
        "story_angle_suggestions": ["angle1", "angle2"],
        "best_publications_for_story": ["pub1", "pub2"],
        "timing_recommendations": "string",
        "media_mix_suggestion": "string"
    },
    "outreach_strategy": {
        "primary_targets": number,
        "secondary_targets": number,
        "recommended_sequence": "string"
    }
}

Always return valid JSON. If no suitable journalists are found, return an empty recommendations array with helpful insights."""

        user_prompt = f"""
PR Discovery Brief:
- Story Topic: {discovery_brief.get('topic', 'General')}
- Industry/Vertical: {discovery_brief.get('industry', 'Any')}
- Target Publications Type: {discovery_brief.get('publication_type', 'Any')} (e.g., national, trade, digital-first)
- Geographic Focus: {discovery_brief.get('location', 'Any')}
- Story Type: {discovery_brief.get('story_type', 'News')} (e.g., news, feature, interview, product review)
- Urgency: {discovery_brief.get('urgency', 'Normal')} (breaking, time-sensitive, evergreen)
- Key Messages: {discovery_brief.get('key_messages', 'Not specified')}
- Target Audience: {discovery_brief.get('target_audience', 'General')}
- Embargo Date: {discovery_brief.get('embargo_date', 'None')}
- Exclusivity Offered: {discovery_brief.get('exclusivity', 'No')}
- Additional Context: {discovery_brief.get('additional_context', 'None')}

Available Journalists Database:
{json.dumps(journalist_data, indent=2)}

Analyze the PR brief and recommend the top journalists from the database.
Rank them by match score and provide detailed reasoning.
Consider factors like beat alignment, publication reach, editorial calendar fit, and relationship status.
"""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"pr-discovery-{datetime.now().timestamp()}",
                system_message=system_prompt
            ).with_model("openai", "gpt-4o")
            
            message = UserMessage(text=user_prompt)
            response = await chat.send_message(message)
            
            # Parse the JSON response
            try:
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
                return {
                    "success": True,
                    "data": {
                        "recommendations": [],
                        "raw_response": response,
                        "pr_insights": {
                            "story_angle_suggestions": [],
                            "best_publications_for_story": [],
                            "timing_recommendations": "See raw response",
                            "media_mix_suggestion": ""
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
    
    async def generate_pitch_message(
        self,
        journalist: Dict,
        press_release: Dict,
        tone: str = "professional"
    ) -> Dict:
        """Generate personalized pitch message for a journalist"""
        
        system_prompt = f"""You are an expert PR professional specializing in media pitching.
Generate a personalized, {tone} pitch email for a journalist.
The pitch should:
- Have a compelling subject line that stands out in their inbox
- Open with a hook relevant to their beat
- Clearly explain why this story matters to their readers
- Include key facts and data points
- End with a clear call-to-action
- Be concise (under 300 words for the body)

Return the response as JSON with: subject, opening_hook, body, call_to_action, and follow_up_timing fields."""

        user_prompt = f"""
Journalist Details:
- Name: {journalist.get('name')}
- Publication: {journalist.get('publication')}
- Beat: {journalist.get('beat', 'General')}
- Role: {journalist.get('editor_level', 'Writer')}
- Preferred Contact: {journalist.get('preferred_contact_method', 'email')}

Press Release/Story:
- Headline: {press_release.get('title')}
- Subtitle: {press_release.get('subtitle', '')}
- Key Points: {press_release.get('body', '')[:500]}
- Target Publications: {', '.join(press_release.get('target_publications', []))}

Generate a personalized pitch that would resonate with this journalist's beat and publication style."""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"pitch-{datetime.now().timestamp()}",
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
                return {"success": True, "data": {"subject": "Media Opportunity", "body": response}}
                
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def generate_follow_up(
        self,
        journalist: Dict,
        original_pitch: Dict,
        follow_up_number: int = 1
    ) -> Dict:
        """Generate follow-up message for a pitch"""
        
        system_prompt = f"""You are an expert PR professional.
Generate a follow-up email for a journalist who hasn't responded to an initial pitch.
This is follow-up #{follow_up_number}.

Guidelines:
- Keep it shorter than the original (under 150 words)
- Add new value or angle if possible
- Be respectful of their time
- Include a soft call-to-action
- Don't be pushy or desperate

Return JSON with: subject, body, and suggested_send_time fields."""

        user_prompt = f"""
Journalist: {journalist.get('name')} at {journalist.get('publication')}
Beat: {journalist.get('beat', 'General')}

Original Pitch Subject: {original_pitch.get('subject')}
Days Since Original: {original_pitch.get('days_since_sent', 3)}

Generate follow-up #{follow_up_number}."""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"followup-{datetime.now().timestamp()}",
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
                return {"success": True, "data": {"subject": "Following up", "body": response}}
                
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def analyze_media_list(
        self,
        journalists: List[Dict],
        campaign_objectives: Dict
    ) -> Dict:
        """Analyze a media list and provide coverage potential insights"""
        
        system_prompt = """You are a PR analytics expert.
Analyze the provided media list and campaign objectives to provide insights on coverage potential.

Return JSON with:
{
    "coverage_potential": {
        "estimated_total_reach": number,
        "tier_breakdown": {"tier1": number, "tier2": number, "tier3": number},
        "beat_coverage": {"beat_name": percentage}
    },
    "gaps_identified": ["gap1", "gap2"],
    "recommendations": ["rec1", "rec2"],
    "risk_assessment": "string"
}"""

        journalist_summary = [{
            "publication": j.get("publication"),
            "beat": j.get("beat"),
            "domain_authority": j.get("domain_authority", 0),
            "monthly_traffic": j.get("monthly_traffic", 0)
        } for j in journalists]

        user_prompt = f"""
Campaign Objectives:
{json.dumps(campaign_objectives, indent=2)}

Media List Summary ({len(journalists)} contacts):
{json.dumps(journalist_summary, indent=2)}

Analyze coverage potential and identify gaps."""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"analysis-{datetime.now().timestamp()}",
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
                return {"success": True, "data": {"analysis": response}}
                
        except Exception as e:
            return {"success": False, "error": str(e)}


# Singleton instance
ai_pr_discovery_service = AIPRDiscoveryService()
