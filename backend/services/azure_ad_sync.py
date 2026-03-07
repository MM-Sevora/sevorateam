"""
Azure Active Directory User Sync Service
Syncs users from Microsoft Azure AD / Entra ID to the application
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


class AzureADSyncService:
    """Service for syncing users from Azure Active Directory"""
    
    def __init__(self):
        self._app_token = None
        self._token_expires_at = None
    
    async def _get_app_token(self) -> str:
        """Get application-level token using client credentials"""
        # Check if token is still valid
        if self._app_token and self._token_expires_at:
            if datetime.now(timezone.utc) < self._token_expires_at:
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
                expires_in = data.get("expires_in", 3600)
                from datetime import timedelta
                self._token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in - 60)
                return self._app_token
            else:
                logger.error(f"Failed to get Azure AD token: {response.text}")
                raise Exception(f"Azure AD authentication failed: {response.status_code}")
    
    def _get_headers(self, token: str) -> dict:
        """Get headers for API requests"""
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    async def check_connection(self) -> dict:
        """Check if Azure AD connection is working"""
        try:
            token = await self._get_app_token()
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{GRAPH_API_ENDPOINT}/organization",
                    headers=self._get_headers(token)
                )
                
                if response.status_code == 200:
                    org_data = response.json()
                    org_name = "Unknown"
                    if org_data.get("value") and len(org_data["value"]) > 0:
                        org_name = org_data["value"][0].get("displayName", "Unknown")
                    
                    return {
                        "connected": True,
                        "status": "active",
                        "organization": org_name,
                        "message": f"Connected to Azure AD: {org_name}"
                    }
                else:
                    return {
                        "connected": False,
                        "status": "error",
                        "message": f"Azure AD connection failed: {response.status_code}"
                    }
        except Exception as e:
            logger.error(f"Azure AD connection check failed: {e}")
            return {
                "connected": False,
                "status": "error",
                "message": str(e)
            }
    
    async def get_all_users(self, top: int = 999) -> List[dict]:
        """
        Fetch all users from Azure AD
        
        Returns list of users with:
        - id (Azure AD object ID)
        - displayName
        - mail (primary email)
        - userPrincipalName
        - jobTitle
        - department
        - employeeId
        - accountEnabled
        - createdDateTime
        """
        try:
            token = await self._get_app_token()
            all_users = []
            
            # Initial request
            url = f"{GRAPH_API_ENDPOINT}/users"
            params = {
                "$top": min(top, 999),
                "$select": "id,displayName,mail,userPrincipalName,jobTitle,department,employeeId,accountEnabled,createdDateTime,companyName,officeLocation,mobilePhone",
                "$filter": "accountEnabled eq true"  # Only get enabled accounts
            }
            
            async with httpx.AsyncClient() as client:
                while url:
                    response = await client.get(
                        url,
                        headers=self._get_headers(token),
                        params=params if not url.startswith("https://graph.microsoft.com/v1.0/users?") else None
                    )
                    
                    if response.status_code != 200:
                        logger.error(f"Failed to fetch Azure AD users: {response.text}")
                        break
                    
                    data = response.json()
                    users = data.get("value", [])
                    all_users.extend(users)
                    
                    # Check for pagination
                    url = data.get("@odata.nextLink")
                    params = None  # Clear params for next link which already has them
                    
                    if len(all_users) >= top:
                        break
            
            return all_users[:top]
            
        except Exception as e:
            logger.error(f"Failed to fetch Azure AD users: {e}")
            return []
    
    async def get_user_by_id(self, azure_id: str) -> Optional[dict]:
        """Fetch a specific user from Azure AD by their object ID"""
        try:
            token = await self._get_app_token()
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{GRAPH_API_ENDPOINT}/users/{azure_id}",
                    headers=self._get_headers(token),
                    params={
                        "$select": "id,displayName,mail,userPrincipalName,jobTitle,department,employeeId,accountEnabled,createdDateTime,companyName,officeLocation,mobilePhone"
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to fetch Azure AD user {azure_id}: {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to fetch Azure AD user: {e}")
            return None
    
    async def get_user_groups(self, azure_id: str) -> List[dict]:
        """Get groups that a user belongs to"""
        try:
            token = await self._get_app_token()
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{GRAPH_API_ENDPOINT}/users/{azure_id}/memberOf",
                    headers=self._get_headers(token),
                    params={"$select": "id,displayName"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("value", [])
                else:
                    return []
                    
        except Exception as e:
            logger.error(f"Failed to fetch user groups: {e}")
            return []
    
    def map_azure_user_to_app_user(self, azure_user: dict) -> dict:
        """
        Map Azure AD user fields to application user fields
        
        Azure AD fields -> App fields:
        - id -> azure_id
        - displayName -> name
        - mail/userPrincipalName -> email
        - jobTitle -> job_title
        - department -> azure_department
        - employeeId -> employee_id
        - accountEnabled -> (used to determine initial status)
        """
        email = azure_user.get("mail") or azure_user.get("userPrincipalName", "")
        
        return {
            "azure_id": azure_user.get("id"),
            "email": email.lower() if email else None,
            "name": azure_user.get("displayName", email.split("@")[0] if email else "Unknown"),
            "employee_id": azure_user.get("employeeId"),
            "job_title": azure_user.get("jobTitle"),
            "azure_department": azure_user.get("department"),
            "company_name": azure_user.get("companyName"),
            "office_location": azure_user.get("officeLocation"),
            "mobile_phone": azure_user.get("mobilePhone"),
            "azure_created_at": azure_user.get("createdDateTime"),
            "azure_account_enabled": azure_user.get("accountEnabled", True),
            "source": "azure_ad",
            "synced_at": datetime.now(timezone.utc).isoformat()
        }


# Global service instance
azure_ad_sync_service = AzureADSyncService()
