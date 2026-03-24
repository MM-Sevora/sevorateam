"""
AI Services Module - Text, Image, and Video Generation
Using Emergent LLM Key with OpenAI models (optional - graceful degradation if not available)
"""
import os
import base64
import asyncio
from datetime import datetime, timezone
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Check if emergentintegrations is available
EMERGENT_AVAILABLE = False
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    EMERGENT_AVAILABLE = True
except ImportError:
    logger.warning("emergentintegrations not available - AI features will be disabled")
    LlmChat = None
    UserMessage = None

# ============== TEXT GENERATION (GPT-5.2) ==============
async def generate_text(prompt: str, system_message: str = None, model: str = "gpt-5.2") -> dict:
    """
    Generate text using GPT-5.2 via Emergent LLM Key
    """
    if not EMERGENT_AVAILABLE:
        return {
            "success": False,
            "error": "AI features not available - emergentintegrations not installed"
        }
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"sevora-{datetime.now(timezone.utc).timestamp()}",
            system_message=system_message or "You are a helpful AI assistant for content creation."
        )
        chat.with_model("openai", model)
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "success": True,
            "text": response,
            "model": model
        }
    except Exception as e:
        logger.error(f"Text generation error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

# ============== IMAGE GENERATION (GPT Image 1) ==============
async def generate_image(prompt: str, model: str = "gpt-image-1", num_images: int = 1) -> dict:
    """
    Generate images using OpenAI GPT Image 1 via Emergent LLM Key
    """
    if not EMERGENT_AVAILABLE:
        return {
            "success": False,
            "error": "AI features not available - emergentintegrations not installed"
        }
    
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        image_gen = OpenAIImageGeneration(api_key=EMERGENT_LLM_KEY)
        images = await image_gen.generate_images(
            prompt=prompt,
            model=model,
            number_of_images=num_images
        )
        
        if images and len(images) > 0:
            # Convert to base64
            images_base64 = []
            for img_bytes in images:
                img_base64 = base64.b64encode(img_bytes).decode('utf-8')
                images_base64.append(f"data:image/png;base64,{img_base64}")
            
            return {
                "success": True,
                "images": images_base64,
                "count": len(images_base64),
                "model": model
            }
        else:
            return {
                "success": False,
                "error": "No images generated"
            }
    except Exception as e:
        logger.error(f"Image generation error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

# ============== VIDEO GENERATION (Sora 2) ==============
def generate_video_sync(prompt: str, output_path: str = None, model: str = "sora-2", 
                       size: str = "1280x720", duration: int = 4) -> dict:
    """
    Generate video using Sora 2 via Emergent LLM Key
    Note: This is synchronous as Sora 2 SDK doesn't support async
    """
    if not EMERGENT_AVAILABLE:
        return {
            "success": False,
            "error": "AI features not available - emergentintegrations not installed"
        }
    
    try:
        from emergentintegrations.llm.openai.video_generation import OpenAIVideoGeneration
        
        if output_path is None:
            output_path = f"/tmp/sevora_video_{datetime.now(timezone.utc).timestamp()}.mp4"
        
        video_gen = OpenAIVideoGeneration(api_key=EMERGENT_LLM_KEY)
        
        video_bytes = video_gen.text_to_video(
            prompt=prompt,
            model=model,
            size=size,
            duration=duration,
            max_wait_time=600
        )
        
        if video_bytes:
            video_gen.save_video(video_bytes, output_path)
            
            # Also return as base64 for frontend
            video_base64 = base64.b64encode(video_bytes).decode('utf-8')
            
            return {
                "success": True,
                "video_path": output_path,
                "video_base64": f"data:video/mp4;base64,{video_base64}",
                "model": model,
                "duration": duration,
                "size": size
            }
        else:
            return {
                "success": False,
                "error": "Video generation failed"
            }
    except Exception as e:
        logger.error(f"Video generation error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

# ============== CONTENT GENERATION HELPERS ==============
async def generate_social_caption(topic: str, platform: str = "instagram", tone: str = "engaging") -> dict:
    """Generate social media caption with hashtags"""
    prompt = f"""Create an engaging {platform} caption about: {topic}
    
Tone: {tone}
Include:
- A catchy hook
- Main message (2-3 sentences)
- Call to action
- 5-7 relevant hashtags

Format as JSON with keys: caption, hashtags (array), hook"""
    
    result = await generate_text(
        prompt=prompt,
        system_message="You are a social media expert who creates viral content. Always respond in valid JSON format."
    )
    
    return result

async def generate_email_content(subject_hint: str, recipient_type: str = "customer", tone: str = "professional") -> dict:
    """Generate email content for outreach"""
    prompt = f"""Write a {tone} email about: {subject_hint}
    
Recipient type: {recipient_type}
Include:
- Subject line
- Greeting
- Body (2-3 paragraphs)
- Call to action
- Professional sign-off

Format as JSON with keys: subject, body"""
    
    result = await generate_text(
        prompt=prompt,
        system_message="You are a professional copywriter specializing in business communication. Always respond in valid JSON format."
    )
    
    return result

async def analyze_influencer_profile(profile_data: dict) -> dict:
    """AI analysis of influencer profile"""
    prompt = f"""Analyze this influencer profile and provide insights:
    
Name: {profile_data.get('name', 'Unknown')}
Platform: {profile_data.get('platform', 'Instagram')}
Followers: {profile_data.get('followers', 0)}
Engagement Rate: {profile_data.get('engagement_rate', 0)}%
Industry: {profile_data.get('industry', 'general')}
Content Type: {profile_data.get('content_type', [])}

Provide:
1. Overall score (0-100)
2. Strengths (list)
3. Weaknesses (list)
4. Brand fit assessment
5. Recommended collaboration type
6. Estimated reach potential

Format as JSON."""
    
    result = await generate_text(
        prompt=prompt,
        system_message="You are an influencer marketing analyst. Provide data-driven insights. Always respond in valid JSON format."
    )
    
    return result
