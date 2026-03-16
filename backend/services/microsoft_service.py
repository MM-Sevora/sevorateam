"""
Microsoft Service Wrapper - Unified interface for Microsoft Graph API
"""
from services.microsoft_email import MicrosoftEmailService

# Singleton instance
_email_service = None

def get_email_service():
    global _email_service
    if _email_service is None:
        _email_service = MicrosoftEmailService()
    return _email_service


class MicrosoftService:
    """Wrapper for Microsoft Graph services"""
    
    def __init__(self):
        self._email_service = MicrosoftEmailService()
    
    async def get_connection_status(self) -> dict:
        """Check Microsoft 365 connection status"""
        return await self._email_service.get_connection_status()
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        is_html: bool = False,
        sender_email: str = None,
        cc_recipients: list = None
    ) -> dict:
        """
        Send an email via Microsoft Graph
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Email body content
            is_html: Whether body is HTML formatted
            sender_email: Sender email (defaults to first available user)
            cc_recipients: Optional CC recipients
        
        Returns:
            dict with success status and message/error
        """
        try:
            # If no sender specified, we need to find a valid sender
            if not sender_email:
                # Try to get the first user from the organization
                # For now, we'll use a configured default or fail gracefully
                import os
                sender_email = os.environ.get('DEFAULT_SENDER_EMAIL', 'noreply@sevora.com')
            
            result = await self._email_service.send_email(
                sender_email=sender_email,
                to_recipients=[to_email],
                subject=subject,
                body=body,
                is_html=is_html,
                cc_recipients=cc_recipients
            )
            
            return result
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_emails_for_contact(
        self,
        user_email: str,
        contact_emails: list,
        limit: int = 50
    ) -> list:
        """Get all emails exchanged with a contact"""
        return await self._email_service.get_emails_for_contact(
            user_email=user_email,
            contact_emails=contact_emails,
            top=limit
        )
    
    async def get_inbox(self, user_email: str, limit: int = 50) -> list:
        """Get inbox emails"""
        return await self._email_service.get_inbox_emails(
            user_email=user_email,
            top=limit
        )
    
    async def sync_users(self) -> dict:
        """Sync users from Azure AD"""
        from services.azure_ad_sync import AzureADSync
        sync_service = AzureADSync()
        return await sync_service.sync_users()


# Global instance
microsoft_service = MicrosoftService()
