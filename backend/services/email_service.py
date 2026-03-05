"""
SendGrid Email Service for Influencer Outreach
Sends personalized emails for collaboration requests
"""
import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, Personalization

logger = logging.getLogger(__name__)


class EmailDeliveryError(Exception):
    """Raised when email delivery fails"""
    pass


class SendGridEmailService:
    """Service for sending emails via SendGrid"""
    
    def __init__(self):
        self.api_key = os.environ.get('SENDGRID_API_KEY')
        self.sender_email = os.environ.get('SENDGRID_SENDER_EMAIL', 'outreach@sevora.com')
        self.sender_name = os.environ.get('SENDGRID_SENDER_NAME', 'SEVORA Team')
        self._client = None
        self._configured = bool(self.api_key)
    
    @property
    def is_configured(self) -> bool:
        """Check if SendGrid is properly configured"""
        return self._configured
    
    def get_configuration_status(self) -> Dict[str, Any]:
        """Get current configuration status"""
        return {
            "configured": self._configured,
            "has_api_key": bool(self.api_key),
            "sender_email": self.sender_email if self._configured else None,
            "sender_name": self.sender_name if self._configured else None
        }
    
    def _get_client(self) -> SendGridAPIClient:
        """Get or create SendGrid client"""
        if not self._configured:
            raise EmailDeliveryError("SendGrid not configured. Set SENDGRID_API_KEY environment variable.")
        
        if self._client is None:
            self._client = SendGridAPIClient(self.api_key)
        return self._client
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        plain_content: Optional[str] = None,
        reply_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a single email via SendGrid.
        
        Args:
            to_email: Recipient email address
            subject: Email subject line
            html_content: HTML email body
            plain_content: Plain text fallback (optional)
            reply_to: Reply-to address (optional)
            
        Returns:
            Response dict with status and message_id
        """
        message = Mail(
            from_email=(self.sender_email, self.sender_name),
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )
        
        if plain_content:
            message.add_content(Content("text/plain", plain_content))
        
        if reply_to:
            message.reply_to = reply_to
        
        try:
            client = self._get_client()
            response = client.send(message)
            
            success = response.status_code in [200, 201, 202]
            
            logger.info(f"Email sent to {to_email}: status={response.status_code}")
            
            return {
                "success": success,
                "status_code": response.status_code,
                "message_id": response.headers.get('X-Message-Id'),
                "to": to_email
            }
            
        except Exception as e:
            logger.error(f"SendGrid error sending to {to_email}: {str(e)}")
            raise EmailDeliveryError(f"Failed to send email: {str(e)}")
    
    def send_influencer_outreach(
        self,
        to_email: str,
        influencer_name: str,
        campaign_name: Optional[str] = None,
        offer_details: Optional[str] = None,
        personalized_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send influencer collaboration outreach email.
        
        Args:
            to_email: Influencer's email address
            influencer_name: Name or handle of influencer
            campaign_name: Name of the campaign (optional)
            offer_details: Specific offer details (optional)
            personalized_message: Custom message from the team (optional)
        """
        subject = f"Collaboration Opportunity with SEVORA"
        if campaign_name:
            subject = f"SEVORA x You: {campaign_name} Collaboration"
        
        # Build personalized email content
        campaign_section = ""
        if campaign_name:
            campaign_section = f"""
            <div style="background: #f8f4ef; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #333;">Campaign: {campaign_name}</h3>
                {f'<p style="margin: 0; color: #666;">{offer_details}</p>' if offer_details else ''}
            </div>
            """
        
        custom_message = ""
        if personalized_message:
            custom_message = f'<p style="color: #333; line-height: 1.6;">{personalized_message}</p>'
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); padding: 30px; text-align: center;">
                        <h1 style="color: #c4a35a; margin: 0; font-size: 28px; letter-spacing: 2px;">SEVORA</h1>
                        <p style="color: #999; margin: 10px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Luxury Fashion</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 30px;">
                        <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">Hi {influencer_name},</h2>
                        
                        <p style="color: #333; line-height: 1.6;">
                            We've been following your amazing work and love your unique style and creative content. 
                            Your aesthetic perfectly aligns with SEVORA's vision for luxury fashion.
                        </p>
                        
                        {custom_message}
                        
                        <p style="color: #333; line-height: 1.6;">
                            We'd love to explore a collaboration opportunity with you for an upcoming project.
                        </p>
                        
                        {campaign_section}
                        
                        <p style="color: #333; line-height: 1.6;">
                            If you're interested in learning more, we'd be happy to share the details and discuss 
                            how we can work together to create something special.
                        </p>
                        
                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="mailto:collaborations@sevora.com?subject=Re: Collaboration Interest" 
                               style="display: inline-block; background: #c4a35a; color: white; padding: 15px 40px; 
                                      text-decoration: none; border-radius: 25px; font-weight: bold; letter-spacing: 1px;">
                                I'M INTERESTED
                            </a>
                        </div>
                        
                        <p style="color: #666; line-height: 1.6;">
                            Looking forward to hearing from you!
                        </p>
                        
                        <p style="color: #333; margin-top: 30px;">
                            Warm regards,<br>
                            <strong>The SEVORA Team</strong>
                        </p>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background: #f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                        <p style="color: #999; font-size: 12px; margin: 0;">
                            SEVORA | Luxury Fashion<br>
                            Mumbai, India
                        </p>
                        <p style="color: #999; font-size: 10px; margin: 10px 0 0 0;">
                            This email was sent to {to_email}. If you received this in error, please ignore.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_content = f"""
Hi {influencer_name},

We've been following your amazing work and love your unique style and creative content.

{f'Campaign: {campaign_name}' if campaign_name else ''}
{f'{offer_details}' if offer_details else ''}

{personalized_message if personalized_message else ''}

We'd love to explore a collaboration opportunity with you. If you're interested, please reply to this email.

Looking forward to hearing from you!

Warm regards,
The SEVORA Team
        """
        
        return self.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            plain_content=plain_content,
            reply_to="collaborations@sevora.com"
        )
    
    def send_batch_outreach(
        self,
        recipients: List[Dict[str, Any]],
        campaign_name: Optional[str] = None,
        default_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send outreach emails to multiple influencers.
        
        Args:
            recipients: List of dicts with 'email', 'name', and optional 'message'
            campaign_name: Campaign name for all emails
            default_message: Default personalized message
            
        Returns:
            Summary with success/failure counts
        """
        results = []
        
        for recipient in recipients:
            email = recipient.get('email')
            name = recipient.get('name', 'there')
            message = recipient.get('message') or default_message
            
            try:
                result = self.send_influencer_outreach(
                    to_email=email,
                    influencer_name=name,
                    campaign_name=campaign_name,
                    personalized_message=message
                )
                results.append({
                    "email": email,
                    "name": name,
                    "success": True,
                    "message_id": result.get('message_id')
                })
            except EmailDeliveryError as e:
                logger.error(f"Batch email failed for {email}: {str(e)}")
                results.append({
                    "email": email,
                    "name": name,
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "total": len(recipients),
            "successful": sum(1 for r in results if r["success"]),
            "failed": sum(1 for r in results if not r["success"]),
            "results": results,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    def send_follow_up(
        self,
        to_email: str,
        influencer_name: str,
        days_since_contact: int = 7
    ) -> Dict[str, Any]:
        """Send a follow-up email to an influencer who hasn't responded"""
        
        subject = "Following up on our collaboration opportunity"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px;">
                <h2 style="color: #c4a35a; margin: 0 0 20px 0;">SEVORA</h2>
                
                <p style="color: #333; line-height: 1.6;">Hi {influencer_name},</p>
                
                <p style="color: #333; line-height: 1.6;">
                    I wanted to follow up on my previous email about a potential collaboration with SEVORA. 
                    I understand you're busy, but I didn't want you to miss this opportunity!
                </p>
                
                <p style="color: #333; line-height: 1.6;">
                    We're still very interested in working with you and would love to hear your thoughts.
                    Even a quick reply letting us know if you're interested would be great.
                </p>
                
                <p style="color: #333; margin-top: 30px;">
                    Best regards,<br>
                    <strong>The SEVORA Team</strong>
                </p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            reply_to="collaborations@sevora.com"
        )


# Singleton instance
_email_service: Optional[SendGridEmailService] = None


def get_email_service() -> SendGridEmailService:
    """Get or create email service instance"""
    global _email_service
    if _email_service is None:
        _email_service = SendGridEmailService()
    return _email_service
