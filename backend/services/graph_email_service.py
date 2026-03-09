"""
Microsoft Graph Email Service
For sending expense claim notifications via Microsoft Graph API
"""

import os
import logging
from datetime import datetime, timezone
from azure.identity import ClientSecretCredential
from msgraph import GraphServiceClient
from msgraph.generated.models.message import Message
from msgraph.generated.models.email_address import EmailAddress
from msgraph.generated.models.recipient import Recipient
from msgraph.generated.models.item_body import ItemBody
from msgraph.generated.models.body_type import BodyType
from msgraph.generated.users.item.send_mail.send_mail_post_request_body import SendMailPostRequestBody

logger = logging.getLogger(__name__)


class GraphEmailService:
    """Service for sending emails via Microsoft Graph API"""
    
    def __init__(self):
        """Initialize Graph client with Azure AD credentials"""
        self.tenant_id = os.environ.get("AZURE_TENANT_ID")
        self.client_id = os.environ.get("AZURE_CLIENT_ID")
        self.client_secret = os.environ.get("AZURE_CLIENT_SECRET")
        self.sender_email = os.environ.get("GRAPH_SENDER_EMAIL", "hr@sevora.com")
        self.hr_email = os.environ.get("HR_NOTIFICATION_EMAIL", "hr@sevora.com")
        
        self.client = None
        self._initialized = False
        
        if self.tenant_id and self.client_id and self.client_secret:
            try:
                credential = ClientSecretCredential(
                    tenant_id=self.tenant_id,
                    client_id=self.client_id,
                    client_secret=self.client_secret
                )
                self.client = GraphServiceClient(credentials=credential)
                self._initialized = True
                logger.info("Graph Email Service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Graph Email Service: {e}")
                self._initialized = False
        else:
            logger.warning("Azure credentials not configured - email notifications will be mocked")
    
    @property
    def is_configured(self) -> bool:
        """Check if the service is properly configured"""
        return self._initialized and self.client is not None
    
    async def send_email(
        self,
        recipient_email: str,
        subject: str,
        body_html: str,
        sender_email: str = None
    ) -> bool:
        """
        Send an email via Microsoft Graph API
        
        Args:
            recipient_email: Recipient's email address
            subject: Email subject
            body_html: HTML content of the email
            sender_email: Optional sender email override
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.is_configured:
            logger.info(f"[MOCK EMAIL] To: {recipient_email}, Subject: {subject}")
            return True  # Return success for mock
        
        try:
            sender = sender_email or self.sender_email
            
            # Create recipient
            recipient_address = EmailAddress()
            recipient_address.address = recipient_email
            
            to_recipient = Recipient()
            to_recipient.email_address = recipient_address
            
            # Create email body
            email_body = ItemBody()
            email_body.content = body_html
            email_body.content_type = BodyType.Html
            
            # Create message
            message = Message()
            message.subject = subject
            message.body = email_body
            message.to_recipients = [to_recipient]
            
            # Create request body
            request_body = SendMailPostRequestBody()
            request_body.message = message
            request_body.save_to_sent_items = True
            
            # Send the email
            await self.client.users.by_user_id(sender).send_mail.post(body=request_body)
            
            logger.info(f"Email sent to {recipient_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {recipient_email}: {e}")
            return False
    
    async def notify_hr_new_claim(
        self,
        claim_id: str,
        employee_name: str,
        employee_email: str,
        total_amount: float,
        department: str = None,
        entries_count: int = 0
    ) -> bool:
        """
        Send notification to HR when a new expense claim is submitted
        """
        subject = f"New Expense Claim Submitted - {claim_id}"
        
        body_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #fff; }}
                .header {{ background: linear-gradient(135deg, #4A3728 0%, #6B5D52 100%); color: white; padding: 30px 20px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
                .header .badge {{ display: inline-block; background: #F5EDE4; color: #4A3728; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-top: 10px; }}
                .content {{ padding: 30px 20px; background: #F9F6F3; }}
                .claim-card {{ background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }}
                .claim-card h3 {{ margin: 0 0 15px 0; color: #4A3728; font-size: 16px; }}
                .detail-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E8D5C4; }}
                .detail-row:last-child {{ border-bottom: none; }}
                .detail-label {{ color: #6B5D52; font-size: 14px; }}
                .detail-value {{ color: #4A3728; font-weight: 600; font-size: 14px; }}
                .amount-highlight {{ background: #E8F5E9; color: #2E7D32; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }}
                .amount-highlight .amount {{ font-size: 28px; font-weight: 700; }}
                .amount-highlight .label {{ font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }}
                .cta-button {{ display: inline-block; background: #4A3728; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 15px; }}
                .footer {{ background: #4A3728; color: #D4BBA6; padding: 20px; text-align: center; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>New Expense Claim</h1>
                    <span class="badge">Pending Review</span>
                </div>
                <div class="content">
                    <div class="claim-card">
                        <h3>Claim Details</h3>
                        <div class="detail-row">
                            <span class="detail-label">Claim ID</span>
                            <span class="detail-value">{claim_id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Employee</span>
                            <span class="detail-value">{employee_name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Email</span>
                            <span class="detail-value">{employee_email}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Department</span>
                            <span class="detail-value">{department or 'N/A'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Expense Items</span>
                            <span class="detail-value">{entries_count} item(s)</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Submitted</span>
                            <span class="detail-value">{datetime.now(timezone.utc).strftime('%B %d, %Y at %I:%M %p')}</span>
                        </div>
                    </div>
                    
                    <div class="amount-highlight">
                        <div class="label">Total Amount Claimed</div>
                        <div class="amount">₹{total_amount:,.2f}</div>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="#" class="cta-button">Review Claim</a>
                    </div>
                </div>
                <div class="footer">
                    <p>Sevora Team Platform • Automated Notification</p>
                    <p>Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(
            recipient_email=self.hr_email,
            subject=subject,
            body_html=body_html
        )
    
    async def notify_employee_claim_approved(
        self,
        claim_id: str,
        employee_name: str,
        employee_email: str,
        total_amount: float,
        approved_amount: float,
        hr_notes: str = None
    ) -> bool:
        """
        Send notification to employee when their claim is approved
        """
        subject = f"Your Expense Claim {claim_id} Has Been Approved"
        
        body_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #fff; }}
                .header {{ background: linear-gradient(135deg, #2E7D32 0%, #43A047 100%); color: white; padding: 30px 20px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
                .header .icon {{ font-size: 48px; margin-bottom: 10px; }}
                .content {{ padding: 30px 20px; background: #F9F6F3; }}
                .message {{ background: white; border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center; }}
                .message p {{ color: #4A3728; font-size: 16px; line-height: 1.6; }}
                .claim-card {{ background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }}
                .detail-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E8D5C4; }}
                .detail-row:last-child {{ border-bottom: none; }}
                .detail-label {{ color: #6B5D52; font-size: 14px; }}
                .detail-value {{ color: #4A3728; font-weight: 600; font-size: 14px; }}
                .amount-approved {{ background: #E8F5E9; color: #2E7D32; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }}
                .amount-approved .amount {{ font-size: 32px; font-weight: 700; }}
                .amount-approved .label {{ font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }}
                .notes {{ background: #FFF8E1; border-left: 4px solid #FFB300; padding: 15px; margin-top: 20px; border-radius: 4px; }}
                .notes .title {{ font-weight: 600; color: #F57C00; margin-bottom: 5px; }}
                .footer {{ background: #4A3728; color: #D4BBA6; padding: 20px; text-align: center; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="icon">✓</div>
                    <h1>Claim Approved!</h1>
                </div>
                <div class="content">
                    <div class="message">
                        <p>Hi {employee_name},</p>
                        <p>Great news! Your expense claim has been reviewed and approved.</p>
                    </div>
                    
                    <div class="amount-approved">
                        <div class="label">Approved Amount</div>
                        <div class="amount">₹{approved_amount:,.2f}</div>
                    </div>
                    
                    <div class="claim-card">
                        <div class="detail-row">
                            <span class="detail-label">Claim ID</span>
                            <span class="detail-value">{claim_id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Original Amount</span>
                            <span class="detail-value">₹{total_amount:,.2f}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Processed</span>
                            <span class="detail-value">{datetime.now(timezone.utc).strftime('%B %d, %Y')}</span>
                        </div>
                        
                        {f'<div class="notes"><div class="title">HR Notes</div><p>{hr_notes}</p></div>' if hr_notes else ''}
                    </div>
                </div>
                <div class="footer">
                    <p>Sevora Team Platform • Automated Notification</p>
                    <p>Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(
            recipient_email=employee_email,
            subject=subject,
            body_html=body_html
        )
    
    async def notify_employee_claim_rejected(
        self,
        claim_id: str,
        employee_name: str,
        employee_email: str,
        total_amount: float,
        rejection_reason: str,
        hr_notes: str = None
    ) -> bool:
        """
        Send notification to employee when their claim is rejected
        """
        subject = f"Your Expense Claim {claim_id} Requires Attention"
        
        body_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #fff; }}
                .header {{ background: linear-gradient(135deg, #C62828 0%, #E53935 100%); color: white; padding: 30px 20px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
                .header .icon {{ font-size: 48px; margin-bottom: 10px; }}
                .content {{ padding: 30px 20px; background: #F9F6F3; }}
                .message {{ background: white; border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }}
                .message p {{ color: #4A3728; font-size: 16px; line-height: 1.6; }}
                .claim-card {{ background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }}
                .detail-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #E8D5C4; }}
                .detail-row:last-child {{ border-bottom: none; }}
                .detail-label {{ color: #6B5D52; font-size: 14px; }}
                .detail-value {{ color: #4A3728; font-weight: 600; font-size: 14px; }}
                .rejection-reason {{ background: #FFEBEE; border-left: 4px solid #C62828; padding: 20px; margin: 20px 0; border-radius: 4px; }}
                .rejection-reason .title {{ font-weight: 600; color: #C62828; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }}
                .rejection-reason p {{ color: #4A3728; margin: 0; line-height: 1.6; }}
                .notes {{ background: #FFF8E1; border-left: 4px solid #FFB300; padding: 15px; margin-top: 20px; border-radius: 4px; }}
                .notes .title {{ font-weight: 600; color: #F57C00; margin-bottom: 5px; }}
                .help-text {{ background: #E3F2FD; padding: 15px; border-radius: 8px; margin-top: 20px; }}
                .help-text p {{ margin: 0; color: #1565C0; font-size: 14px; }}
                .footer {{ background: #4A3728; color: #D4BBA6; padding: 20px; text-align: center; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="icon">✗</div>
                    <h1>Claim Not Approved</h1>
                </div>
                <div class="content">
                    <div class="message">
                        <p>Hi {employee_name},</p>
                        <p>We've reviewed your expense claim and unfortunately, we're unable to approve it at this time. Please see the details below.</p>
                    </div>
                    
                    <div class="rejection-reason">
                        <div class="title">Reason for Rejection</div>
                        <p>{rejection_reason}</p>
                    </div>
                    
                    <div class="claim-card">
                        <div class="detail-row">
                            <span class="detail-label">Claim ID</span>
                            <span class="detail-value">{claim_id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Amount Claimed</span>
                            <span class="detail-value">₹{total_amount:,.2f}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Reviewed</span>
                            <span class="detail-value">{datetime.now(timezone.utc).strftime('%B %d, %Y')}</span>
                        </div>
                        
                        {f'<div class="notes"><div class="title">Additional Notes</div><p>{hr_notes}</p></div>' if hr_notes else ''}
                    </div>
                    
                    <div class="help-text">
                        <p>If you have questions about this decision or would like to submit a revised claim, please contact the HR department.</p>
                    </div>
                </div>
                <div class="footer">
                    <p>Sevora Team Platform • Automated Notification</p>
                    <p>Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return await self.send_email(
            recipient_email=employee_email,
            subject=subject,
            body_html=body_html
        )


# Global instance
graph_email_service = GraphEmailService()
