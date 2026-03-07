"""
Communication Services - WhatsApp (Twilio) and Email (Microsoft Graph)
"""
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
import logging
from twilio.rest import Client as TwilioClient

load_dotenv()

logger = logging.getLogger(__name__)

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_WHATSAPP_NUMBER = os.environ.get('TWILIO_WHATSAPP_NUMBER', '+918967719301')

# Azure AD Configuration (for Microsoft Graph)
AZURE_CLIENT_ID = os.environ.get('AZURE_CLIENT_ID')
AZURE_TENANT_ID = os.environ.get('AZURE_TENANT_ID')
AZURE_CLIENT_SECRET = os.environ.get('AZURE_CLIENT_SECRET')

# ============== WHATSAPP VIA TWILIO ==============
class WhatsAppService:
    def __init__(self):
        self.client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        self.from_number = f"whatsapp:{TWILIO_WHATSAPP_NUMBER}"
    
    def send_message(self, to_number: str, message: str) -> dict:
        """
        Send a WhatsApp message via Twilio
        
        Args:
            to_number: Recipient phone number (with country code, e.g., +919876543210)
            message: Message content
        
        Returns:
            dict with success status and message details
        """
        try:
            # Ensure proper WhatsApp format
            if not to_number.startswith('whatsapp:'):
                to_number = f"whatsapp:{to_number}"
            
            twilio_message = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_number
            )
            
            return {
                "success": True,
                "message_sid": twilio_message.sid,
                "status": twilio_message.status,
                "to": to_number,
                "sent_at": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"WhatsApp send error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def send_template_message(self, to_number: str, template_name: str, variables: dict = None) -> dict:
        """
        Send a WhatsApp template message
        
        Args:
            to_number: Recipient phone number
            template_name: Name of the pre-approved template
            variables: Template variable replacements
        """
        try:
            if not to_number.startswith('whatsapp:'):
                to_number = f"whatsapp:{to_number}"
            
            # Build message body from template
            templates = {
                "lead_followup": "Hi {{name}}! Thanks for your interest in Sevora. We'd love to help you find the perfect style. When would be a good time to chat?",
                "appointment_reminder": "Hi {{name}}! This is a reminder about your styling appointment on {{date}} at {{time}}. See you soon!",
                "order_confirmation": "Hi {{name}}! Your order #{{order_id}} has been confirmed. Total: {{amount}}. We'll update you on delivery.",
                "campaign_invite": "Hi {{name}}! We have an exciting collaboration opportunity. Would you be interested in working with us on {{campaign}}?"
            }
            
            message = templates.get(template_name, "Hello from Sevora Team!")
            
            if variables:
                for key, value in variables.items():
                    message = message.replace(f"{{{{{key}}}}}", str(value))
            
            return self.send_message(to_number, message)
        except Exception as e:
            logger.error(f"WhatsApp template error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

# ============== EMAIL VIA MICROSOFT GRAPH ==============
class OutlookEmailService:
    def __init__(self):
        self.client_id = AZURE_CLIENT_ID
        self.tenant_id = AZURE_TENANT_ID
        self.client_secret = AZURE_CLIENT_SECRET
        self._graph_client = None
    
    async def _get_graph_client(self):
        """Get authenticated Microsoft Graph client"""
        try:
            from azure.identity.aio import ClientSecretCredential
            from msgraph import GraphServiceClient
            
            credential = ClientSecretCredential(
                tenant_id=self.tenant_id,
                client_id=self.client_id,
                client_secret=self.client_secret
            )
            
            scopes = ["https://graph.microsoft.com/.default"]
            return GraphServiceClient(credentials=credential, scopes=scopes)
        except Exception as e:
            logger.error(f"Graph client error: {e}")
            raise
    
    async def send_email(
        self,
        sender_email: str,
        to_recipients: list,
        subject: str,
        body: str,
        content_type: str = "html",
        cc_recipients: list = None,
        save_to_sent: bool = True
    ) -> dict:
        """
        Send email via Microsoft Graph API
        
        Args:
            sender_email: Sender's email address (must have permissions)
            to_recipients: List of recipient emails
            subject: Email subject
            body: Email body (HTML or plain text)
            content_type: "html" or "text"
            cc_recipients: Optional CC recipients
            save_to_sent: Whether to save to sent items
        
        Returns:
            dict with success status
        """
        try:
            from msgraph.generated.users.item.send_mail.send_mail_post_request_body import SendMailPostRequestBody
            from msgraph.generated.models.message import Message
            from msgraph.generated.models.item_body import ItemBody
            from msgraph.generated.models.body_type import BodyType
            from msgraph.generated.models.recipient import Recipient
            from msgraph.generated.models.email_address import EmailAddress
            
            client = await self._get_graph_client()
            
            # Build message
            message = Message()
            message.subject = subject
            message.body = ItemBody(
                content_type=BodyType.Html if content_type == "html" else BodyType.Text,
                content=body
            )
            
            # Add recipients
            message.to_recipients = [
                Recipient(email_address=EmailAddress(address=email))
                for email in to_recipients
            ]
            
            if cc_recipients:
                message.cc_recipients = [
                    Recipient(email_address=EmailAddress(address=email))
                    for email in cc_recipients
                ]
            
            # Create request body
            request_body = SendMailPostRequestBody(
                message=message,
                save_to_sent_items=save_to_sent
            )
            
            # Send email
            await client.users.by_user_id(sender_email).send_mail.post(body=request_body)
            
            return {
                "success": True,
                "message": f"Email sent to {', '.join(to_recipients)}",
                "sent_at": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Email send error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_outreach_email(
        self,
        sender_email: str,
        recipient_email: str,
        recipient_name: str,
        subject: str,
        body: str,
        outreach_type: str = "influencer"
    ) -> dict:
        """
        Send an outreach email with tracking
        """
        # Add tracking pixel and styling
        styled_body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .signature {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }}
            </style>
        </head>
        <body>
            <p>Hi {recipient_name},</p>
            {body}
            <div class="signature">
                <p>Best regards,<br>
                <strong>Sevora Team</strong></p>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(
            sender_email=sender_email,
            to_recipients=[recipient_email],
            subject=subject,
            body=styled_body,
            content_type="html"
        )

# Initialize service instances
whatsapp_service = WhatsAppService()
email_service = OutlookEmailService()
