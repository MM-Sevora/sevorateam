"""
Auto-Reply System - Rule-based + AI-powered
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from enum import Enum
import uuid
import re
import logging

logger = logging.getLogger(__name__)

auto_reply_router = APIRouter(prefix="/social/auto-reply", tags=["Auto Reply"])

# Will be set by main server
db = None
get_current_user = None
llm_client = None  # For AI-powered replies

def init_auto_reply_router(database, auth_func, ai_client=None):
    global db, get_current_user, llm_client
    db = database
    get_current_user = auth_func
    llm_client = ai_client
    return auto_reply_router


# ============== ENUMS ==============

class RuleCondition(str, Enum):
    CONTAINS = "contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    EXACT_MATCH = "exact_match"
    REGEX = "regex"

class RuleAction(str, Enum):
    REPLY = "reply"
    TAG = "tag"
    ASSIGN = "assign"
    ARCHIVE = "archive"
    ESCALATE = "escalate"


# ============== MODELS ==============

class AutoReplyRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    priority: int = 0  # Higher = processed first
    platforms: List[str] = []  # Empty = all platforms
    message_types: List[str] = []  # Empty = all types
    conditions: List[Dict[str, Any]]  # [{field, operator, value}]
    action: RuleAction
    reply_template: Optional[str] = None  # For REPLY action
    tags: List[str] = []  # For TAG action
    assign_to: Optional[str] = None  # For ASSIGN action

class AIReplyRequest(BaseModel):
    message_content: str
    context: Optional[str] = None  # Additional context
    tone: str = "professional"  # professional, friendly, formal
    max_length: int = 280  # Character limit


# ============== RULE MANAGEMENT ==============

@auto_reply_router.get("/rules")
async def get_auto_reply_rules(user: dict = Depends(lambda: get_current_user)):
    """Get all auto-reply rules"""
    rules = await db.auto_reply_rules.find({}, {"_id": 0}).sort("priority", -1).to_list(100)
    return rules


@auto_reply_router.get("/rules/{rule_id}")
async def get_auto_reply_rule(rule_id: str, user: dict = Depends(lambda: get_current_user)):
    """Get a specific rule"""
    rule = await db.auto_reply_rules.find_one({"rule_id": rule_id}, {"_id": 0})
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule


@auto_reply_router.post("/rules")
async def create_auto_reply_rule(data: AutoReplyRuleCreate, user: dict = Depends(lambda: get_current_user)):
    """Create a new auto-reply rule"""
    rule_id = str(uuid.uuid4())
    
    rule_doc = {
        "rule_id": rule_id,
        "name": data.name,
        "description": data.description,
        "is_active": data.is_active,
        "priority": data.priority,
        "platforms": data.platforms,
        "message_types": data.message_types,
        "conditions": data.conditions,
        "action": data.action.value,
        "reply_template": data.reply_template,
        "tags": data.tags,
        "assign_to": data.assign_to,
        "stats": {"triggered": 0, "success": 0, "failed": 0},
        "created_by": user.get("id") if isinstance(user, dict) else "system",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.auto_reply_rules.insert_one(rule_doc)
    del rule_doc["_id"]
    return rule_doc


@auto_reply_router.put("/rules/{rule_id}")
async def update_auto_reply_rule(rule_id: str, data: dict, user: dict = Depends(lambda: get_current_user)):
    """Update an auto-reply rule"""
    existing = await db.auto_reply_rules.find_one({"rule_id": rule_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    update_data = {k: v for k, v in data.items() if k not in ["rule_id", "_id", "created_at", "created_by"]}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.auto_reply_rules.update_one({"rule_id": rule_id}, {"$set": update_data})
    
    updated = await db.auto_reply_rules.find_one({"rule_id": rule_id}, {"_id": 0})
    return updated


@auto_reply_router.delete("/rules/{rule_id}")
async def delete_auto_reply_rule(rule_id: str, user: dict = Depends(lambda: get_current_user)):
    """Delete an auto-reply rule"""
    result = await db.auto_reply_rules.delete_one({"rule_id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    return {"message": "Rule deleted", "rule_id": rule_id}


@auto_reply_router.put("/rules/{rule_id}/toggle")
async def toggle_rule(rule_id: str, user: dict = Depends(lambda: get_current_user)):
    """Toggle a rule's active status"""
    rule = await db.auto_reply_rules.find_one({"rule_id": rule_id})
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    new_status = not rule.get("is_active", True)
    await db.auto_reply_rules.update_one(
        {"rule_id": rule_id},
        {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Rule toggled", "rule_id": rule_id, "is_active": new_status}


# ============== RULE MATCHING ENGINE ==============

def check_condition(content: str, condition: Dict[str, Any]) -> bool:
    """Check if content matches a condition"""
    field = condition.get("field", "content")
    operator = condition.get("operator", "contains")
    value = condition.get("value", "")
    
    # For now, we only support content field
    text = content.lower()
    check_value = value.lower()
    
    if operator == "contains":
        return check_value in text
    elif operator == "starts_with":
        return text.startswith(check_value)
    elif operator == "ends_with":
        return text.endswith(check_value)
    elif operator == "exact_match":
        return text == check_value
    elif operator == "regex":
        try:
            return bool(re.search(value, content, re.IGNORECASE))
        except re.error:
            return False
    
    return False


def check_all_conditions(content: str, conditions: List[Dict], match_mode: str = "all") -> bool:
    """Check if content matches all/any conditions"""
    if not conditions:
        return True
    
    results = [check_condition(content, c) for c in conditions]
    
    if match_mode == "all":
        return all(results)
    else:  # any
        return any(results)


@auto_reply_router.post("/process")
async def process_message(
    item_id: str,
    user: dict = Depends(lambda: get_current_user)
):
    """Process an inbox item through auto-reply rules"""
    # Get the inbox item
    item = await db.social_inbox.find_one({"item_id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")
    
    # Get active rules sorted by priority
    rules = await db.auto_reply_rules.find({"is_active": True}, {"_id": 0}).sort("priority", -1).to_list(100)
    
    matched_rule = None
    for rule in rules:
        # Check platform filter
        if rule.get("platforms") and item["platform"] not in rule["platforms"]:
            continue
        
        # Check message type filter
        if rule.get("message_types") and item["message_type"] not in rule["message_types"]:
            continue
        
        # Check conditions
        if check_all_conditions(item["content"], rule.get("conditions", [])):
            matched_rule = rule
            break
    
    if not matched_rule:
        return {"matched": False, "message": "No matching rule found"}
    
    # Execute action
    result = {"matched": True, "rule_id": matched_rule["rule_id"], "rule_name": matched_rule["name"]}
    
    action = matched_rule["action"]
    
    if action == "reply":
        # Generate reply from template
        reply_content = matched_rule.get("reply_template", "Thank you for your message!")
        # Simple variable substitution
        reply_content = reply_content.replace("{author_name}", item.get("author_name", ""))
        reply_content = reply_content.replace("{platform}", item.get("platform", ""))
        
        result["action"] = "reply"
        result["reply_content"] = reply_content
        result["auto_reply_ready"] = True
        
    elif action == "tag":
        result["action"] = "tag"
        result["tags"] = matched_rule.get("tags", [])
        
    elif action == "assign":
        result["action"] = "assign"
        result["assign_to"] = matched_rule.get("assign_to")
        
    elif action == "archive":
        await db.social_inbox.update_one(
            {"item_id": item_id},
            {"$set": {"status": "archived", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        result["action"] = "archive"
        result["archived"] = True
        
    elif action == "escalate":
        result["action"] = "escalate"
        result["escalated"] = True
    
    # Update rule stats
    await db.auto_reply_rules.update_one(
        {"rule_id": matched_rule["rule_id"]},
        {"$inc": {"stats.triggered": 1, "stats.success": 1}}
    )
    
    return result


# ============== AI-POWERED REPLIES ==============

@auto_reply_router.post("/generate-ai")
async def generate_ai_reply(
    data: AIReplyRequest,
    user: dict = Depends(lambda: get_current_user)
):
    """Generate an AI-powered reply suggestion"""
    
    # Check if AI client is configured
    if not llm_client:
        # Return a helpful template response when AI is not configured
        return {
            "success": True,
            "reply": f"Thank you for reaching out! We appreciate your message and will get back to you shortly.",
            "ai_generated": False,
            "note": "AI not configured - using template response. Configure LLM integration for AI-powered replies."
        }
    
    try:
        # Build the prompt
        tone_instructions = {
            "professional": "Respond in a professional, business-appropriate tone.",
            "friendly": "Respond in a warm, friendly, and approachable tone.",
            "formal": "Respond in a formal, corporate communication style."
        }
        
        prompt = f"""You are a social media manager responding to a customer message.

Message to respond to:
"{data.message_content}"

{f'Additional context: {data.context}' if data.context else ''}

Instructions:
- {tone_instructions.get(data.tone, tone_instructions['professional'])}
- Keep the response under {data.max_length} characters.
- Be helpful and address any questions or concerns.
- Do not use hashtags unless appropriate for the platform.
- Sound human and authentic, not robotic.

Generate only the reply text, nothing else."""

        # Call the LLM
        response = await llm_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.7
        )
        
        ai_reply = response.choices[0].message.content.strip()
        
        # Truncate if needed
        if len(ai_reply) > data.max_length:
            ai_reply = ai_reply[:data.max_length - 3] + "..."
        
        return {
            "success": True,
            "reply": ai_reply,
            "ai_generated": True,
            "tokens_used": response.usage.total_tokens if hasattr(response, 'usage') else None
        }
        
    except Exception as e:
        logger.error(f"AI reply generation failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback_reply": "Thank you for your message! We'll get back to you shortly."
        }


@auto_reply_router.get("/suggestions/{item_id}")
async def get_reply_suggestions(item_id: str, user: dict = Depends(lambda: get_current_user)):
    """Get reply suggestions for an inbox item (both rule-based and AI)"""
    item = await db.social_inbox.find_one({"item_id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Inbox item not found")
    
    suggestions = []
    
    # 1. Check for matching rules
    rules = await db.auto_reply_rules.find(
        {"is_active": True, "action": "reply"},
        {"_id": 0}
    ).sort("priority", -1).to_list(10)
    
    for rule in rules:
        if rule.get("platforms") and item["platform"] not in rule["platforms"]:
            continue
        if rule.get("message_types") and item["message_type"] not in rule["message_types"]:
            continue
        if check_all_conditions(item["content"], rule.get("conditions", [])):
            reply = rule.get("reply_template", "")
            reply = reply.replace("{author_name}", item.get("author_name", ""))
            suggestions.append({
                "type": "rule",
                "rule_name": rule["name"],
                "content": reply,
                "confidence": "high"
            })
    
    # 2. Add quick replies based on sentiment/type
    quick_replies = {
        "positive": [
            "Thank you so much for your kind words! We really appreciate your support. 🙏",
            "Thanks for the feedback! We're glad you're enjoying our content."
        ],
        "negative": [
            "We're sorry to hear about your experience. Please DM us so we can help resolve this.",
            "Thank you for bringing this to our attention. We'd like to make this right - please reach out directly."
        ],
        "neutral": [
            "Thanks for reaching out! We'll get back to you shortly.",
            "Thank you for your message. Our team will review and respond soon."
        ]
    }
    
    sentiment = item.get("sentiment", "neutral")
    for reply in quick_replies.get(sentiment, quick_replies["neutral"]):
        suggestions.append({
            "type": "quick",
            "content": reply,
            "confidence": "medium"
        })
    
    return {
        "item_id": item_id,
        "message_content": item["content"],
        "sentiment": sentiment,
        "suggestions": suggestions[:5]  # Return top 5
    }


# ============== SEED DEFAULT RULES ==============

@auto_reply_router.post("/seed-defaults")
async def seed_default_rules(user: dict = Depends(lambda: get_current_user)):
    """Seed default auto-reply rules"""
    default_rules = [
        {
            "name": "Thank You Response",
            "description": "Auto-reply to thank you messages",
            "priority": 10,
            "platforms": [],
            "message_types": ["comment"],
            "conditions": [
                {"field": "content", "operator": "contains", "value": "thank you"},
                {"field": "content", "operator": "contains", "value": "thanks"}
            ],
            "action": "reply",
            "reply_template": "You're welcome, {author_name}! We're glad we could help. 😊"
        },
        {
            "name": "Pricing Inquiry",
            "description": "Route pricing questions to sales",
            "priority": 20,
            "platforms": [],
            "message_types": ["comment", "direct_message"],
            "conditions": [
                {"field": "content", "operator": "contains", "value": "pricing"},
                {"field": "content", "operator": "contains", "value": "cost"},
                {"field": "content", "operator": "contains", "value": "price"}
            ],
            "action": "reply",
            "reply_template": "Hi {author_name}! For pricing information, please visit our website or DM us directly and our sales team will be happy to help!"
        },
        {
            "name": "Support Request Escalation",
            "description": "Escalate urgent support requests",
            "priority": 30,
            "platforms": [],
            "message_types": ["comment", "direct_message", "mention"],
            "conditions": [
                {"field": "content", "operator": "contains", "value": "urgent"},
                {"field": "content", "operator": "contains", "value": "help"},
                {"field": "content", "operator": "contains", "value": "issue"}
            ],
            "action": "escalate"
        },
        {
            "name": "Partnership Inquiries",
            "description": "Tag partnership messages",
            "priority": 15,
            "platforms": ["linkedin", "instagram"],
            "message_types": ["direct_message"],
            "conditions": [
                {"field": "content", "operator": "contains", "value": "partnership"},
                {"field": "content", "operator": "contains", "value": "collaborate"},
                {"field": "content", "operator": "contains", "value": "sponsor"}
            ],
            "action": "tag",
            "tags": ["partnership", "review-needed"]
        }
    ]
    
    created_count = 0
    for rule_data in default_rules:
        # Check if rule with same name exists
        existing = await db.auto_reply_rules.find_one({"name": rule_data["name"]})
        if not existing:
            rule_doc = {
                "rule_id": str(uuid.uuid4()),
                **rule_data,
                "is_active": True,
                "stats": {"triggered": 0, "success": 0, "failed": 0},
                "created_by": "system",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.auto_reply_rules.insert_one(rule_doc)
            created_count += 1
    
    return {"message": f"Created {created_count} default rules", "count": created_count}
