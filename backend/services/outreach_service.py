"""
Unified Outreach Service
Handles both Email and WhatsApp messaging with templates
"""
import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

logger = logging.getLogger(__name__)


class UnifiedOutreachService:
    """Unified service for sending outreach via multiple channels"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_templates(self, channel: Optional[str] = None) -> List[Dict]:
        """Get all message templates, optionally filtered by channel"""
        query = {}
        if channel:
            query["channel"] = channel
        
        templates = await self.db.message_templates.find(
            query, {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return templates
    
    async def create_template(
        self,
        name: str,
        channel: str,  # email, whatsapp, both
        subject: Optional[str] = None,  # For email
        body: str = "",
        variables: List[str] = None,  # e.g., ["influencer_name", "campaign_name"]
        user_id: str = None
    ) -> Dict:
        """Create a new message template"""
        template_id = str(uuid.uuid4())
        
        template_doc = {
            "id": template_id,
            "name": name,
            "channel": channel,
            "subject": subject,
            "body": body,
            "variables": variables or [],
            "is_active": True,
            "use_count": 0,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.message_templates.insert_one(template_doc)
        
        if '_id' in template_doc:
            del template_doc['_id']
        
        return template_doc
    
    async def get_template(self, template_id: str) -> Optional[Dict]:
        """Get a specific template"""
        return await self.db.message_templates.find_one(
            {"id": template_id}, {"_id": 0}
        )
    
    async def update_template(self, template_id: str, updates: Dict) -> Optional[Dict]:
        """Update a template"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await self.db.message_templates.find_one_and_update(
            {"id": template_id},
            {"$set": updates},
            return_document=True
        )
        
        if result and '_id' in result:
            del result['_id']
        
        return result
    
    async def delete_template(self, template_id: str) -> bool:
        """Delete a template"""
        result = await self.db.message_templates.delete_one({"id": template_id})
        return result.deleted_count > 0
    
    def _replace_variables(self, text: str, variables: Dict[str, str]) -> str:
        """Replace template variables with actual values"""
        if not text:
            return text
        
        for key, value in variables.items():
            text = text.replace(f"{{{{{key}}}}}", str(value))
            text = text.replace(f"{{{{ {key} }}}}", str(value))
            text = text.replace(f"{{{key}}}", str(value))
        
        return text
    
    async def send_outreach(
        self,
        influencer_id: str,
        channel: str,  # email, whatsapp
        message: str,
        subject: Optional[str] = None,  # For email
        template_id: Optional[str] = None,
        variables: Optional[Dict[str, str]] = None,
        campaign_name: Optional[str] = None,
        user_id: str = None
    ) -> Dict[str, Any]:
        """
        Send outreach message via specified channel.
        
        Args:
            influencer_id: Target influencer
            channel: 'email' or 'whatsapp'
            message: Message body (can contain variables like {{influencer_name}})
            subject: Email subject (for email channel)
            template_id: Optional template to use
            variables: Variables to replace in message
            campaign_name: Campaign name for tracking
            user_id: Sender user ID
        """
        # Get influencer
        influencer = await self.db.influencers.find_one(
            {"id": influencer_id}, {"_id": 0}
        )
        
        if not influencer:
            return {"success": False, "error": "Influencer not found"}
        
        # Prepare variables
        all_variables = {
            "influencer_name": influencer.get('name', 'there'),
            "brand_name": "SEVORA",
            "campaign_name": campaign_name or "our upcoming campaign",
            **(variables or {})
        }
        
        # If using template, get it
        if template_id:
            template = await self.get_template(template_id)
            if template:
                message = template.get('body', message)
                subject = template.get('subject', subject)
                # Increment use count
                await self.db.message_templates.update_one(
                    {"id": template_id},
                    {"$inc": {"use_count": 1}}
                )
        
        # Replace variables in message
        final_message = self._replace_variables(message, all_variables)
        final_subject = self._replace_variables(subject, all_variables) if subject else None
        
        result = {"success": False, "error": "Unknown channel"}
        
        if channel == "email":
            result = await self._send_email(
                influencer=influencer,
                subject=final_subject or f"Collaboration Opportunity with SEVORA",
                message=final_message,
                campaign_name=campaign_name,
                user_id=user_id
            )
        elif channel == "whatsapp":
            result = await self._send_whatsapp(
                influencer=influencer,
                message=final_message,
                campaign_name=campaign_name,
                user_id=user_id
            )
        
        # Log the outreach
        if result.get("success"):
            await self._log_outreach(
                influencer=influencer,
                channel=channel,
                message=final_message,
                subject=final_subject,
                template_id=template_id,
                campaign_name=campaign_name,
                result=result,
                user_id=user_id
            )
            
            # Update influencer status
            await self.db.influencers.update_one(
                {"id": influencer_id},
                {
                    "$set": {
                        "status": "contacted",
                        "last_contacted": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
        
        return result
    
    async def _send_email(
        self,
        influencer: Dict,
        subject: str,
        message: str,
        campaign_name: Optional[str],
        user_id: str
    ) -> Dict[str, Any]:
        """Send email via SendGrid"""
        email = influencer.get('email')
        if not email:
            return {"success": False, "error": "Influencer has no email on file"}
        
        from services.email_service import get_email_service, EmailDeliveryError
        
        email_service = get_email_service()
        
        if not email_service.is_configured:
            return {
                "success": False, 
                "error": "SendGrid not configured. Set SENDGRID_API_KEY in environment.",
                "channel": "email"
            }
        
        # Build HTML email
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); padding: 25px; text-align: center;">
                    <h1 style="color: #c4a35a; margin: 0; font-size: 24px; letter-spacing: 2px;">SEVORA</h1>
                </div>
                <div style="padding: 30px;">
                    <div style="color: #333; line-height: 1.8; white-space: pre-wrap;">{message}</div>
                    <p style="color: #333; margin-top: 30px;">
                        Warm regards,<br>
                        <strong>The SEVORA Team</strong>
                    </p>
                </div>
                <div style="background: #f8f8f8; padding: 15px; text-align: center; border-top: 1px solid #eee;">
                    <p style="color: #999; font-size: 11px; margin: 0;">SEVORA | Luxury Fashion</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            result = email_service.send_email(
                to_email=email,
                subject=subject,
                html_content=html_content,
                plain_content=message
            )
            
            return {
                "success": True,
                "channel": "email",
                "message_id": result.get('message_id'),
                "recipient": email
            }
        except EmailDeliveryError as e:
            return {"success": False, "error": str(e), "channel": "email"}
    
    async def _send_whatsapp(
        self,
        influencer: Dict,
        message: str,
        campaign_name: Optional[str],
        user_id: str
    ) -> Dict[str, Any]:
        """Send WhatsApp message via Meta Cloud API"""
        phone = influencer.get('phone') or influencer.get('whatsapp')
        if not phone:
            return {"success": False, "error": "Influencer has no phone number on file"}
        
        from services.whatsapp_service import get_whatsapp_service
        
        wa_service = get_whatsapp_service()
        
        if not wa_service.is_configured:
            return {
                "success": False,
                "error": "WhatsApp not configured. Set WA_ACCESS_TOKEN and WA_PHONE_NUMBER_ID.",
                "channel": "whatsapp"
            }
        
        try:
            result = wa_service.send_text_message(phone, message)
            
            return {
                "success": True,
                "channel": "whatsapp",
                "message_id": result.get("messages", [{}])[0].get("id"),
                "recipient": phone
            }
        except Exception as e:
            return {"success": False, "error": str(e), "channel": "whatsapp"}
    
    async def _log_outreach(
        self,
        influencer: Dict,
        channel: str,
        message: str,
        subject: Optional[str],
        template_id: Optional[str],
        campaign_name: Optional[str],
        result: Dict,
        user_id: str
    ):
        """Log outreach to database"""
        outreach_doc = {
            "id": str(uuid.uuid4()),
            "type": channel,
            "influencer_id": influencer.get('id'),
            "influencer_name": influencer.get('name'),
            "recipient": result.get('recipient'),
            "subject": subject,
            "message": message[:500],  # Store first 500 chars
            "template_id": template_id,
            "campaign_name": campaign_name,
            "status": "sent",
            "message_id": result.get('message_id'),
            "sent_by": user_id,
            "sent_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.outreach.insert_one(outreach_doc)
    
    async def send_batch_outreach(
        self,
        influencer_ids: List[str],
        channel: str,
        message: str,
        subject: Optional[str] = None,
        template_id: Optional[str] = None,
        campaign_name: Optional[str] = None,
        user_id: str = None
    ) -> Dict[str, Any]:
        """Send outreach to multiple influencers"""
        results = []
        
        for influencer_id in influencer_ids:
            result = await self.send_outreach(
                influencer_id=influencer_id,
                channel=channel,
                message=message,
                subject=subject,
                template_id=template_id,
                campaign_name=campaign_name,
                user_id=user_id
            )
            results.append({
                "influencer_id": influencer_id,
                **result
            })
        
        return {
            "total": len(influencer_ids),
            "successful": sum(1 for r in results if r.get("success")),
            "failed": sum(1 for r in results if not r.get("success")),
            "results": results
        }
    
    async def get_outreach_history(
        self,
        influencer_id: Optional[str] = None,
        channel: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """Get outreach history"""
        query = {}
        if influencer_id:
            query["influencer_id"] = influencer_id
        if channel:
            query["type"] = channel
        
        history = await self.db.outreach.find(
            query, {"_id": 0}
        ).sort("sent_at", -1).limit(limit).to_list(limit)
        
        return history


def create_outreach_service(db: AsyncIOMotorDatabase) -> UnifiedOutreachService:
    """Factory function"""
    return UnifiedOutreachService(db)
