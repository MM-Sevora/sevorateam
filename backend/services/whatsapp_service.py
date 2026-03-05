"""
WhatsApp Business API Service
Uses Meta Cloud API for sending messages and outreach
Supports MOCK mode when WhatsApp API is not configured
"""
import os
import logging
import uuid
import requests
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class WhatsAppService:
    """Service for WhatsApp Business API integration with MOCK fallback"""
    
    def __init__(self):
        self.access_token = os.environ.get('WA_ACCESS_TOKEN')
        self.phone_number_id = os.environ.get('WA_PHONE_NUMBER_ID')
        self.business_account_id = os.environ.get('WA_BUSINESS_ACCOUNT_ID')
        self.api_version = os.environ.get('WA_API_VERSION', 'v21.0')
        self.base_url = f"https://graph.facebook.com/{self.api_version}"
        self.verify_token = os.environ.get('WA_VERIFY_TOKEN', 'sevora-whatsapp-verify')
        
        # Enable mock mode via env var
        self._mock_mode = os.environ.get('WHATSAPP_MOCK_MODE', 'true').lower() == 'true'
        self._real_configured = bool(self.access_token and self.phone_number_id)
    
    @property
    def is_configured(self) -> bool:
        """Check if WhatsApp service is available (real or mock)"""
        return self._mock_mode or self._real_configured
    
    @property
    def is_mock_mode(self) -> bool:
        """Check if running in mock mode"""
        return self._mock_mode or not self._real_configured
    
    def get_configuration_status(self) -> Dict[str, Any]:
        """Get current configuration status"""
        return {
            "configured": self.is_configured,
            "mock_mode": self.is_mock_mode,
            "has_access_token": bool(self.access_token),
            "has_phone_number_id": bool(self.phone_number_id),
            "has_business_account_id": bool(self.business_account_id),
            "api_version": self.api_version
        }
    
    def _mock_send(self, phone_number: str, message_type: str = "text") -> Dict[str, Any]:
        """Mock message send - logs and returns success"""
        mock_message_id = f"wamid.mock{uuid.uuid4().hex[:16]}"
        logger.info(f"[MOCK] WhatsApp {message_type} sent to {phone_number}: message_id={mock_message_id}")
        return {
            "messaging_product": "whatsapp",
            "contacts": [{"input": phone_number, "wa_id": phone_number}],
            "messages": [{"id": mock_message_id}],
            "mock": True
        }
    
    def _send_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send message through WhatsApp Cloud API.
        
        Args:
            message_data: Message payload dictionary
            
        Returns:
            API response containing message_id
        """
        # Use mock mode if enabled
        if self.is_mock_mode:
            return self._mock_send(message_data.get('to'), message_data.get('type', 'text'))
        
        if not self._real_configured:
            raise Exception("WhatsApp API not configured. Set WA_ACCESS_TOKEN and WA_PHONE_NUMBER_ID")
        
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            logger.info(f"Sending WhatsApp message to {message_data.get('to')}")
            response = requests.post(
                url,
                json=message_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code >= 400:
                error_detail = response.json() if response.text else str(response.status_code)
                logger.error(f"WhatsApp API error: {error_detail}")
                # Fall back to mock on error if mock mode enabled
                if self._mock_mode:
                    logger.info("Falling back to mock mode due to API error")
                    return self._mock_send(message_data.get('to'), message_data.get('type', 'text'))
                raise Exception(f"WhatsApp API error: {error_detail}")
            
            result = response.json()
            logger.info(f"WhatsApp message sent successfully: {result}")
            return result
            
        except requests.RequestException as e:
            logger.error(f"WhatsApp request failed: {str(e)}")
            if self._mock_mode:
                logger.info("Falling back to mock mode due to request error")
                return self._mock_send(message_data.get('to'), message_data.get('type', 'text'))
            raise Exception(f"Failed to send WhatsApp message: {str(e)}")
    
    def send_text_message(self, phone_number: str, text: str) -> Dict[str, Any]:
        """
        Send simple text message.
        Note: This only works within 24-hour conversation window.
        
        Args:
            phone_number: Recipient phone number in E.164 format (e.g., "919876543210")
            text: Message text (max 4096 chars)
            
        Returns:
            API response with message_id
        """
        message = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone_number,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": text[:4096]  # Truncate to max length
            }
        }
        return self._send_message(message)
    
    def send_template_message(
        self,
        phone_number: str,
        template_name: str,
        template_language: str = "en_US",
        parameters: Optional[List[str]] = None,
        header_parameters: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Send pre-approved template message.
        Required for business-initiated conversations.
        
        Args:
            phone_number: Recipient phone number in E.164 format
            template_name: Name of approved template (from WhatsApp Business Manager)
            template_language: Language code for template (e.g., "en_US", "en")
            parameters: List of parameter values for body variables {{1}}, {{2}}, etc.
            header_parameters: List of parameter values for header variables
            
        Returns:
            API response with message_id
        """
        components = []
        
        # Add header parameters if provided
        if header_parameters:
            header_params = [
                {"type": "text", "text": str(param)} for param in header_parameters
            ]
            components.append({
                "type": "header",
                "parameters": header_params
            })
        
        # Add body parameters if provided
        if parameters:
            body_params = [
                {"type": "text", "text": str(param)} for param in parameters
            ]
            components.append({
                "type": "body",
                "parameters": body_params
            })
        
        message = {
            "messaging_product": "whatsapp",
            "to": phone_number,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": template_language
                }
            }
        }
        
        if components:
            message["template"]["components"] = components
        
        return self._send_message(message)
    
    def send_influencer_outreach(
        self,
        phone_number: str,
        influencer_name: str,
        brand_name: str = "SEVORA",
        campaign_name: str = None,
        offer_details: str = None
    ) -> Dict[str, Any]:
        """
        Send influencer collaboration outreach message.
        Uses template: influencer_collaboration (must be created and approved in WhatsApp Business Manager)
        
        Template structure should be:
        "Hi {{1}}, I'm reaching out from {{2}} regarding an exciting collaboration opportunity.
        {{3}} We'd love to work with you! Reply if interested."
        
        Args:
            phone_number: Influencer's phone number
            influencer_name: Name or handle of influencer
            brand_name: Your brand name (default: SEVORA)
            campaign_name: Name of the campaign (optional)
            offer_details: Additional offer details (optional)
            
        Returns:
            API response with message_id
        """
        # Build personalized message details
        campaign_info = f"We're launching our {campaign_name} campaign." if campaign_name else ""
        offer_info = offer_details or "We have an exciting opportunity for you."
        
        parameters = [
            influencer_name,
            brand_name,
            f"{campaign_info} {offer_info}".strip()
        ]
        
        return self.send_template_message(
            phone_number=phone_number,
            template_name="influencer_collaboration",  # Must be approved template
            template_language="en_US",
            parameters=parameters
        )
    
    def send_batch_messages(
        self,
        recipients: List[Dict[str, Any]],
        template_name: str,
        template_language: str = "en_US"
    ) -> Dict[str, Any]:
        """
        Send template messages to multiple recipients.
        
        Args:
            recipients: List of dicts with 'phone_number' and optional 'parameters'
            template_name: Approved template name
            template_language: Language code
            
        Returns:
            Summary with success/failure counts and details
        """
        results = []
        
        for recipient in recipients:
            phone_number = recipient.get("phone_number")
            parameters = recipient.get("parameters", [])
            
            try:
                response = self.send_template_message(
                    phone_number=phone_number,
                    template_name=template_name,
                    template_language=template_language,
                    parameters=parameters
                )
                results.append({
                    "phone_number": phone_number,
                    "success": True,
                    "message_id": response.get("messages", [{}])[0].get("id")
                })
            except Exception as e:
                logger.error(f"Failed to send to {phone_number}: {str(e)}")
                results.append({
                    "phone_number": phone_number,
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
    
    def validate_webhook_signature(
        self,
        payload_body: bytes,
        received_signature: str
    ) -> bool:
        """
        Validate webhook signature using HMAC-SHA256.
        
        Args:
            payload_body: Raw request body bytes
            received_signature: Signature from x-hub-signature-256 header
            
        Returns:
            True if signature is valid
        """
        import hmac
        import hashlib
        
        if not received_signature:
            return False
        
        # Remove "sha256=" prefix if present
        if received_signature.startswith("sha256="):
            received_signature = received_signature[7:]
        
        # Compute expected signature
        computed_signature = hmac.new(
            key=self.verify_token.encode('utf-8'),
            msg=payload_body,
            digestmod=hashlib.sha256
        ).hexdigest()
        
        # Use constant-time comparison
        return hmac.compare_digest(computed_signature, received_signature)
    
    def validate_webhook_challenge(
        self,
        mode: str,
        challenge: str,
        token: str
    ) -> Optional[str]:
        """
        Validate webhook challenge during initial setup.
        
        Args:
            mode: Should be "subscribe"
            challenge: Random string from WhatsApp
            token: Verify token sent by WhatsApp
            
        Returns:
            Challenge string if valid, None otherwise
        """
        if mode == "subscribe" and token == self.verify_token:
            return challenge
        return None


# Singleton instance
_whatsapp_service: Optional[WhatsAppService] = None


def get_whatsapp_service() -> WhatsAppService:
    """Get or create WhatsApp service instance"""
    global _whatsapp_service
    if _whatsapp_service is None:
        _whatsapp_service = WhatsAppService()
    return _whatsapp_service
