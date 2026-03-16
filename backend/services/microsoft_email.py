"""
Microsoft Graph Email Service - Full Email Management
Supports: Read, Send, Reply, Forward, Star, Flag, Archive, Delete
"""
import os
import httpx
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0"

# Azure AD Configuration
AZURE_CLIENT_ID = os.environ.get('AZURE_CLIENT_ID')
AZURE_TENANT_ID = os.environ.get('AZURE_TENANT_ID')
AZURE_CLIENT_SECRET = os.environ.get('AZURE_CLIENT_SECRET')


class MicrosoftEmailService:
    """Full-featured Microsoft Graph Email Service"""
    
    def __init__(self, access_token: str = None, user_email: str = None):
        self.access_token = access_token
        self.user_email = user_email
        self._app_token = None
    
    async def _get_app_token(self) -> str:
        """Get application-level token using client credentials"""
        if self._app_token:
            return self._app_token
        
        token_url = f"https://login.microsoftonline.com/{AZURE_TENANT_ID}/oauth2/v2.0/token"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data={
                    "client_id": AZURE_CLIENT_ID,
                    "client_secret": AZURE_CLIENT_SECRET,
                    "scope": "https://graph.microsoft.com/.default",
                    "grant_type": "client_credentials"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self._app_token = data.get("access_token")
                return self._app_token
            else:
                logger.error(f"Failed to get app token: {response.text}")
                raise Exception("Failed to authenticate with Microsoft Graph")
    
    def _get_headers(self, token: str = None) -> dict:
        """Get headers for API requests"""
        return {
            "Authorization": f"Bearer {token or self.access_token}",
            "Content-Type": "application/json"
        }
    
    async def get_connection_status(self) -> dict:
        """Check if Microsoft connection is active"""
        try:
            token = await self._get_app_token()
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{GRAPH_API_ENDPOINT}/organization",
                    headers=self._get_headers(token)
                )
                
                if response.status_code == 200:
                    return {
                        "connected": True,
                        "status": "active",
                        "message": "Microsoft 365 connection active"
                    }
                else:
                    return {
                        "connected": False,
                        "status": "error",
                        "message": "Unable to connect to Microsoft 365"
                    }
        except Exception as e:
            logger.error(f"Connection check failed: {e}")
            return {
                "connected": False,
                "status": "error",
                "message": str(e)
            }
    
    async def get_emails(
        self,
        user_email: str,
        folder: str = "inbox",
        top: int = 50,
        skip: int = 0,
        filter_query: str = None,
        search_query: str = None
    ) -> List[dict]:
        """
        Get emails from a specific folder
        
        Args:
            user_email: User's email address
            folder: Folder name (inbox, sentitems, drafts, archive)
            top: Number of emails to fetch
            skip: Number of emails to skip (pagination)
            filter_query: OData filter query
            search_query: Search query for subject/body/sender
        """
        try:
            token = await self._get_app_token()
            
            # Build URL
            url = f"{GRAPH_API_ENDPOINT}/users/{user_email}/mailFolders/{folder}/messages"
            
            params = {
                "$top": top,
                "$skip": skip,
                "$orderby": "receivedDateTime desc",
                "$select": "id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,bodyPreview,body,isRead,hasAttachments,flag,conversationId,importance"
            }
            
            if filter_query:
                params["$filter"] = filter_query
            
            if search_query:
                params["$search"] = f'"{search_query}"'
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self._get_headers(token),
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("value", [])
                else:
                    logger.error(f"Failed to get emails: {response.text}")
                    return []
        except Exception as e:
            logger.error(f"Get emails error: {e}")
            return []
    
    async def get_emails_for_contact(
        self,
        user_email: str,
        contact_emails: List[str],
        top: int = 100
    ) -> List[dict]:
        """
        Get all emails exchanged with specific contact(s)
        Searches both inbox and sent items
        """
        try:
            token = await self._get_app_token()
            all_emails = []
            
            # Search in both inbox and sent items
            folders = ["inbox", "sentitems"]
            
            for folder in folders:
                for contact_email in contact_emails:
                    # Build filter to find emails from/to this contact
                    url = f"{GRAPH_API_ENDPOINT}/users/{user_email}/mailFolders/{folder}/messages"
                    
                    params = {
                        "$top": top,
                        "$orderby": "receivedDateTime desc",
                        "$select": "id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,bodyPreview,body,isRead,hasAttachments,flag,conversationId,importance",
                        "$search": f'"{contact_email}"'
                    }
                    
                    async with httpx.AsyncClient() as client:
                        response = await client.get(
                            url,
                            headers=self._get_headers(token),
                            params=params
                        )
                        
                        if response.status_code == 200:
                            data = response.json()
                            emails = data.get("value", [])
                            
                            # Filter to only include emails actually involving the contact
                            for email in emails:
                                from_email = email.get("from", {}).get("emailAddress", {}).get("address", "").lower()
                                to_emails = [r.get("emailAddress", {}).get("address", "").lower() 
                                            for r in email.get("toRecipients", [])]
                                cc_emails = [r.get("emailAddress", {}).get("address", "").lower() 
                                            for r in email.get("ccRecipients", [])]
                                
                                contact_lower = contact_email.lower()
                                if (contact_lower == from_email or 
                                    contact_lower in to_emails or 
                                    contact_lower in cc_emails):
                                    email["_folder"] = folder
                                    all_emails.append(email)
            
            # Remove duplicates by ID and sort by date
            seen_ids = set()
            unique_emails = []
            for email in all_emails:
                if email["id"] not in seen_ids:
                    seen_ids.add(email["id"])
                    unique_emails.append(email)
            
            # Sort by received date descending
            unique_emails.sort(
                key=lambda x: x.get("receivedDateTime") or x.get("sentDateTime") or "",
                reverse=True
            )
            
            return unique_emails[:top]
        except Exception as e:
            logger.error(f"Get emails for contact error: {e}")
            return []
    
    async def get_message(self, user_email: str, message_id: str) -> Optional[dict]:
        """Get full email message content"""
        try:
            token = await self._get_app_token()
            url = f"{GRAPH_API_ENDPOINT}/users/{user_email}/messages/{message_id}"
            
            params = {
                "$select": "id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,body,isRead,hasAttachments,flag,conversationId,importance,replyTo"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self._get_headers(token),
                    params=params
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get message: {response.text}")
                    return None
        except Exception as e:
            logger.error(f"Get message error: {e}")
            return None
    
    async def get_attachments(self, user_email: str, message_id: str) -> List[dict]:
        """Get email attachments"""
        try:
            token = await self._get_app_token()
            url = f"{GRAPH_API_ENDPOINT}/users/{user_email}/messages/{message_id}/attachments"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    headers=self._get_headers(token)
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("value", [])
                else:
                    return []
        except Exception as e:
            logger.error(f"Get attachments error: {e}")
            return []
    
    async def get_user_id(self, email: str) -> str:
        """Get the Object ID of a user or shared mailbox by email"""
        try:
            token = await self._get_app_token()
            async with httpx.AsyncClient() as client:
                # Try to get user/mailbox by email
                response = await client.get(
                    f"{GRAPH_API_ENDPOINT}/users/{email}",
                    headers=self._get_headers(token)
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("id")
                return None
        except Exception as e:
            logger.error(f"Failed to get user ID: {e}")
            return None
    
    async def send_email(
        self,
        sender_email: str,
        to_recipients: List[str],
        subject: str,
        body: str,
        is_html: bool = True,
        cc_recipients: List[str] = None,
        bcc_recipients: List[str] = None,
        reply_to_message_id: str = None,
        is_reply_all: bool = False,
        from_shared_mailbox: str = None  # For sending from shared mailbox
    ) -> dict:
        """
        Send a new email or reply to an existing one
        
        Args:
            sender_email: Licensed user's email address (the actual sender)
            to_recipients: List of recipient emails
            subject: Email subject
            body: Email body (HTML or text)
            is_html: Whether body is HTML
            cc_recipients: CC recipients
            bcc_recipients: BCC recipients
            reply_to_message_id: If replying, the original message ID
            is_reply_all: Whether to reply all
            from_shared_mailbox: Shared mailbox address to show as "from" (requires Send As permission)
        """
        try:
            token = await self._get_app_token()
            
            if reply_to_message_id:
                # Reply to existing message
                if is_reply_all:
                    url = f"{GRAPH_API_ENDPOINT}/users/{sender_email}/messages/{reply_to_message_id}/replyAll"
                else:
                    url = f"{GRAPH_API_ENDPOINT}/users/{sender_email}/messages/{reply_to_message_id}/reply"
                
                request_body = {
                    "message": {
                        "body": {
                            "contentType": "HTML" if is_html else "Text",
                            "content": body
                        }
                    }
                }
            else:
                # Send new email via licensed user
                url = f"{GRAPH_API_ENDPOINT}/users/{sender_email}/sendMail"
                
                message = {
                    "subject": subject,
                    "body": {
                        "contentType": "HTML" if is_html else "Text",
                        "content": body
                    },
                    "toRecipients": [
                        {"emailAddress": {"address": email}} for email in to_recipients
                    ]
                }
                
                # If sending from shared mailbox, set the "from" field
                # This requires the sender_email user to have "Send As" permission on the shared mailbox
                if from_shared_mailbox:
                    message["from"] = {
                        "emailAddress": {
                            "address": from_shared_mailbox
                        }
                    }
                
                if cc_recipients:
                    message["ccRecipients"] = [
                        {"emailAddress": {"address": email}} for email in cc_recipients
                    ]
                
                if bcc_recipients:
                    message["bccRecipients"] = [
                        {"emailAddress": {"address": email}} for email in bcc_recipients
                    ]
                
                request_body = {
                    "message": message,
                    "saveToSentItems": True
                }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(token),
                    json=request_body
                )
                
                if response.status_code in [200, 202]:
                    return {
                        "success": True,
                        "message": "Email sent successfully",
                        "sent_at": datetime.now(timezone.utc).isoformat()
                    }
                else:
                    logger.error(f"Failed to send email: {response.text}")
                    return {
                        "success": False,
                        "error": response.text
                    }
        except Exception as e:
            logger.error(f"Send email error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def forward_email(
        self,
        sender_email: str,
        message_id: str,
        to_recipients: List[str],
        comment: str = ""
    ) -> dict:
        """Forward an email"""
        try:
            token = await self._get_app_token()
            url = f"{GRAPH_API_ENDPOINT}/users/{sender_email}/messages/{message_id}/forward"
            
            request_body = {
                "toRecipients": [
                    {"emailAddress": {"address": email}} for email in to_recipients
                ]
            }
            
            if comment:
                request_body["comment"] = comment
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(token),
                    json=request_body
                )
                
                if response.status_code in [200, 202]:
                    return {"success": True, "message": "Email forwarded successfully"}
                else:
                    return {"success": False, "error": response.text}
        except Exception as e:
            logger.error(f"Forward email error: {e}")
            return {"success": False, "error": str(e)}
    
    async def mark_as_read(
        self,
        user_email: str,
        message_id: str,
        is_read: bool = True
    ) -> dict:
        """Mark email as read or unread"""
        try:
            token = await self._get_app_token()
            url = f"{GRAPH_API_ENDPOINT}/users/{user_email}/messages/{message_id}"
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    url,
                    headers=self._get_headers(token),
                    json={"isRead": is_read}
                )
                
                if response.status_code == 200:
                    return {"success": True, "isRead": is_read}
                else:
                    return {"success": False, "error": response.text}
        except Exception as e:
            logger.error(f"Mark as read error: {e}")
            return {"success": False, "error": str(e)}
    
    async def set_flag(
        self,
        user_email: str,
        message_id: str,
        flag_status: str = "flagged"
    ) -> dict:
        """Set email flag status (flagged, notFlagged, complete)"""
        try:
            token = await self._get_app_token()
            url = f"{GRAPH_API_ENDPOINT}/users/{user_email}/messages/{message_id}"
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    url,
                    headers=self._get_headers(token),
                    json={"flag": {"flagStatus": flag_status}}
                )
                
                if response.status_code == 200:
                    return {"success": True, "flagStatus": flag_status}
                else:
                    return {"success": False, "error": response.text}
        except Exception as e:
            logger.error(f"Set flag error: {e}")
            return {"success": False, "error": str(e)}
    
    async def archive_message(self, user_email: str, message_id: str) -> dict:
        """Move message to archive folder"""
        try:
            token = await self._get_app_token()
            
            # First, find or create archive folder
            folders_url = f"{GRAPH_API_ENDPOINT}/users/{user_email}/mailFolders"
            
            async with httpx.AsyncClient() as client:
                # Get archive folder ID
                response = await client.get(
                    folders_url,
                    headers=self._get_headers(token),
                    params={"$filter": "displayName eq 'Archive'"}
                )
                
                archive_folder_id = None
                if response.status_code == 200:
                    folders = response.json().get("value", [])
                    if folders:
                        archive_folder_id = folders[0]["id"]
                
                if not archive_folder_id:
                    # Create archive folder
                    create_response = await client.post(
                        folders_url,
                        headers=self._get_headers(token),
                        json={"displayName": "Archive"}
                    )
                    if create_response.status_code == 201:
                        archive_folder_id = create_response.json()["id"]
                
                if archive_folder_id:
                    # Move message to archive
                    move_url = f"{GRAPH_API_ENDPOINT}/users/{user_email}/messages/{message_id}/move"
                    move_response = await client.post(
                        move_url,
                        headers=self._get_headers(token),
                        json={"destinationId": archive_folder_id}
                    )
                    
                    if move_response.status_code in [200, 201]:
                        return {"success": True, "message": "Email archived"}
                    else:
                        return {"success": False, "error": move_response.text}
                else:
                    return {"success": False, "error": "Could not find or create archive folder"}
        except Exception as e:
            logger.error(f"Archive message error: {e}")
            return {"success": False, "error": str(e)}
    
    async def delete_message(self, user_email: str, message_id: str) -> dict:
        """Delete an email message"""
        try:
            token = await self._get_app_token()
            url = f"{GRAPH_API_ENDPOINT}/users/{user_email}/messages/{message_id}"
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    url,
                    headers=self._get_headers(token)
                )
                
                if response.status_code == 204:
                    return {"success": True, "message": "Email deleted"}
                else:
                    return {"success": False, "error": response.text}
        except Exception as e:
            logger.error(f"Delete message error: {e}")
            return {"success": False, "error": str(e)}


# Global service instance
microsoft_email_service = MicrosoftEmailService()
