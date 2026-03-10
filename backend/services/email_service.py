"""
SendGrid Email Service for Buying & Sourcing Module
"""
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, To, Personalization
from typing import List, Optional, Dict
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """SendGrid email service for sourcing outreach"""
    
    def __init__(self):
        self.api_key = os.environ.get('SENDGRID_API_KEY')
        self.from_email = os.environ.get('SENDER_EMAIL', 'sourcing@sevora.com')
        self.client = SendGridAPIClient(self.api_key) if self.api_key else None
    
    def is_configured(self) -> bool:
        """Check if SendGrid is properly configured"""
        return bool(self.api_key and self.client)
    
    async def send_single_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        from_name: Optional[str] = "Sevora Sourcing"
    ) -> Dict:
        """Send a single email"""
        if not self.is_configured():
            return {"success": False, "error": "SendGrid not configured"}
        
        try:
            message = Mail(
                from_email=(self.from_email, from_name),
                to_emails=to_email,
                subject=subject,
                html_content=html_content
            )
            
            response = self.client.send(message)
            
            return {
                "success": response.status_code in [200, 202],
                "status_code": response.status_code,
                "message_id": response.headers.get('X-Message-Id', '')
            }
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_bulk_emails(
        self,
        recipients: List[Dict],
        subject: str,
        html_content: str,
        from_name: Optional[str] = "Sevora Sourcing"
    ) -> Dict:
        """
        Send bulk emails using SendGrid personalizations
        recipients: List of dicts with 'email', 'name', and optional 'substitutions'
        """
        if not self.is_configured():
            return {"success": False, "error": "SendGrid not configured"}
        
        try:
            message = Mail()
            message.from_email = (self.from_email, from_name)
            message.subject = subject
            
            for recipient in recipients:
                personalization = Personalization()
                personalization.add_to(To(recipient.get('email'), recipient.get('name', '')))
                
                # Add custom substitutions for template variables
                if 'substitutions' in recipient:
                    for key, value in recipient['substitutions'].items():
                        personalization.add_substitution(key, value)
                
                message.add_personalization(personalization)
            
            message.add_content("text/html", html_content)
            
            response = self.client.send(message)
            
            return {
                "success": response.status_code in [200, 202],
                "status_code": response.status_code,
                "recipients_count": len(recipients),
                "message_id": response.headers.get('X-Message-Id', '')
            }
        except Exception as e:
            logger.error(f"Failed to send bulk emails: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def render_template(self, template_content: str, variables: Dict) -> str:
        """Render template with variable substitutions"""
        rendered = template_content
        for key, value in variables.items():
            rendered = rendered.replace(f"{{{{{key}}}}}", str(value))
        return rendered
    
    def generate_html_email(self, content: str, brand_name: Optional[str] = None) -> str:
        """Generate a styled HTML email"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sevora Sourcing</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <tr>
            <td style="padding: 30px 40px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Sevora</h1>
                <p style="margin: 5px 0 0; color: #a0a0a0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Buying & Sourcing</p>
            </td>
        </tr>
        <!-- Content -->
        <tr>
            <td style="padding: 40px;">
                <div style="color: #333333; font-size: 15px; line-height: 1.7;">
                    {content}
                </div>
            </td>
        </tr>
        <!-- Footer -->
        <tr>
            <td style="padding: 20px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
                <p style="margin: 0; color: #6c757d; font-size: 12px; text-align: center;">
                    This email was sent by Sevora Sourcing Team
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
"""


# Singleton instance
email_service = EmailService()
