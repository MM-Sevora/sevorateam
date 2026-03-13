"""
Test Suite for Shared Mailboxes Admin API and Entity Links API
Features:
- Shared Mailboxes: CRUD operations for admin mailbox management with role/department/user access control
- Entity Links: Link any entity (influencer, lead, email, etc.) to campaigns

MongoDB Collections: shared_mailboxes, entity_links
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"


class TestAuthentication:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == TEST_EMAIL


class TestSharedMailboxesCRUD:
    """Shared Mailboxes CRUD API Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_list_shared_mailboxes(self, headers):
        """GET /api/shared-mailboxes - List all shared mailboxes"""
        response = requests.get(
            f"{BASE_URL}/api/shared-mailboxes",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to list mailboxes: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} shared mailboxes")
    
    def test_create_shared_mailbox_success(self, headers):
        """POST /api/shared-mailboxes - Create new shared mailbox"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "email": f"TEST_marketing_{unique_id}@sevora.com",
            "display_name": f"TEST Marketing Team {unique_id}",
            "description": "Test shared mailbox for marketing team",
            "allowed_roles": ["marketing_manager", "admin"],
            "allowed_departments": ["Marketing"],
            "allowed_users": [],
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/shared-mailboxes",
            headers=headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to create mailbox: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["email"] == payload["email"].lower()
        assert data["display_name"] == payload["display_name"]
        assert data["is_active"] == True
        assert "created_at" in data
        print(f"Created mailbox: {data['id']}")
        
        # Cleanup: Delete the created mailbox
        delete_response = requests.delete(
            f"{BASE_URL}/api/shared-mailboxes/{data['id']}",
            headers=headers
        )
        assert delete_response.status_code == 200
    
    def test_create_and_verify_persistence(self, headers):
        """Create mailbox and verify it persists via GET"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "email": f"TEST_persist_{unique_id}@sevora.com",
            "display_name": f"TEST Persistence Check {unique_id}",
            "description": "Testing persistence",
            "allowed_roles": ["admin"],
            "allowed_departments": ["IT"],
            "allowed_users": [],
            "is_active": True
        }
        
        # Create
        create_response = requests.post(
            f"{BASE_URL}/api/shared-mailboxes",
            headers=headers,
            json=payload
        )
        assert create_response.status_code == 200
        created = create_response.json()
        mailbox_id = created["id"]
        
        # Verify via GET specific mailbox
        get_response = requests.get(
            f"{BASE_URL}/api/shared-mailboxes/{mailbox_id}",
            headers=headers
        )
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["email"] == payload["email"].lower()
        assert fetched["display_name"] == payload["display_name"]
        assert fetched["description"] == payload["description"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/shared-mailboxes/{mailbox_id}", headers=headers)
        print("Create->GET persistence verified successfully")
    
    def test_update_shared_mailbox(self, headers):
        """PUT /api/shared-mailboxes/{id} - Update shared mailbox"""
        unique_id = str(uuid.uuid4())[:8]
        
        # First create a mailbox
        create_payload = {
            "email": f"TEST_update_{unique_id}@sevora.com",
            "display_name": f"TEST Update Original {unique_id}",
            "description": "Original description",
            "allowed_roles": ["admin"],
            "allowed_departments": [],
            "allowed_users": [],
            "is_active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/shared-mailboxes",
            headers=headers,
            json=create_payload
        )
        assert create_response.status_code == 200
        mailbox_id = create_response.json()["id"]
        
        # Update the mailbox
        update_payload = {
            "display_name": f"TEST Update Modified {unique_id}",
            "description": "Updated description",
            "allowed_roles": ["admin", "marketing_manager"],
            "allowed_departments": ["Marketing", "Sales"],
            "is_active": False
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/shared-mailboxes/{mailbox_id}",
            headers=headers,
            json=update_payload
        )
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["display_name"] == update_payload["display_name"]
        assert updated["description"] == update_payload["description"]
        assert updated["is_active"] == False
        assert "Marketing" in updated["allowed_departments"]
        
        # Verify persistence via GET
        get_response = requests.get(
            f"{BASE_URL}/api/shared-mailboxes/{mailbox_id}",
            headers=headers
        )
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["display_name"] == update_payload["display_name"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/shared-mailboxes/{mailbox_id}", headers=headers)
        print("Update->GET persistence verified successfully")
    
    def test_delete_shared_mailbox(self, headers):
        """DELETE /api/shared-mailboxes/{id} - Delete shared mailbox"""
        unique_id = str(uuid.uuid4())[:8]
        
        # First create a mailbox
        create_payload = {
            "email": f"TEST_delete_{unique_id}@sevora.com",
            "display_name": f"TEST Delete {unique_id}",
            "description": "To be deleted",
            "allowed_roles": [],
            "allowed_departments": [],
            "allowed_users": [],
            "is_active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/shared-mailboxes",
            headers=headers,
            json=create_payload
        )
        assert create_response.status_code == 200
        mailbox_id = create_response.json()["id"]
        
        # Delete the mailbox
        delete_response = requests.delete(
            f"{BASE_URL}/api/shared-mailboxes/{mailbox_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        assert "deleted" in delete_response.json().get("message", "").lower()
        
        # Verify deletion via GET (should return 404)
        get_response = requests.get(
            f"{BASE_URL}/api/shared-mailboxes/{mailbox_id}",
            headers=headers
        )
        assert get_response.status_code == 404
        print("Delete->GET (404) verified successfully")
    
    def test_delete_nonexistent_returns_404(self, headers):
        """DELETE /api/shared-mailboxes/{id} - Returns 404 for non-existent mailbox"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/shared-mailboxes/{fake_id}",
            headers=headers
        )
        assert response.status_code == 404
    
    def test_create_duplicate_email_returns_400(self, headers):
        """POST /api/shared-mailboxes - Duplicate email should return 400"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "email": f"TEST_dup_{unique_id}@sevora.com",
            "display_name": f"TEST Duplicate {unique_id}",
            "allowed_roles": [],
            "allowed_departments": [],
            "allowed_users": [],
            "is_active": True
        }
        
        # Create first mailbox
        response1 = requests.post(
            f"{BASE_URL}/api/shared-mailboxes",
            headers=headers,
            json=payload
        )
        assert response1.status_code == 200
        mailbox_id = response1.json()["id"]
        
        # Try to create duplicate
        response2 = requests.post(
            f"{BASE_URL}/api/shared-mailboxes",
            headers=headers,
            json=payload
        )
        assert response2.status_code == 400
        assert "already exists" in response2.json().get("detail", "").lower()
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/shared-mailboxes/{mailbox_id}", headers=headers)
    
    def test_get_my_mailboxes(self, headers):
        """GET /api/shared-mailboxes/my-mailboxes - Get user's accessible mailboxes"""
        response = requests.get(
            f"{BASE_URL}/api/shared-mailboxes/my-mailboxes",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"User has access to {len(data)} mailboxes")


class TestEntityLinksCRUD:
    """Entity Links API Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_list_entity_links(self, headers):
        """GET /api/entity-links - List all entity links"""
        response = requests.get(
            f"{BASE_URL}/api/entity-links",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} entity links")
    
    def test_get_available_campaigns(self, headers):
        """GET /api/entity-links/campaigns - Get campaigns for linking"""
        response = requests.get(
            f"{BASE_URL}/api/entity-links/campaigns",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} campaigns available for linking")
        
        # Verify campaign structure if campaigns exist
        if data:
            campaign = data[0]
            assert "id" in campaign
            assert "name" in campaign
            assert "campaign_type" in campaign
    
    def test_create_entity_link_success(self, headers):
        """POST /api/entity-links - Create new entity link"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "source_type": "influencer",
            "source_id": f"TEST_inf_{unique_id}",
            "source_name": f"TEST Influencer {unique_id}",
            "target_type": "campaign",
            "target_id": f"TEST_camp_{unique_id}",
            "target_name": f"TEST Campaign {unique_id}",
            "link_type": "related",
            "notes": "Test entity link"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/entity-links",
            headers=headers,
            json=payload
        )
        assert response.status_code == 200, f"Failed to create link: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["source_type"] == payload["source_type"]
        assert data["source_id"] == payload["source_id"]
        assert data["target_type"] == payload["target_type"]
        assert data["target_id"] == payload["target_id"]
        assert data["link_type"] == "related"
        assert "created_at" in data
        
        # Cleanup
        delete_response = requests.delete(
            f"{BASE_URL}/api/entity-links/{data['id']}",
            headers=headers
        )
        assert delete_response.status_code == 200
        print(f"Created and deleted link: {data['id']}")
    
    def test_create_and_verify_persistence(self, headers):
        """Create link and verify persistence via GET for-entity"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "source_type": "lead",
            "source_id": f"TEST_lead_{unique_id}",
            "source_name": f"TEST Lead {unique_id}",
            "target_type": "campaign",
            "target_id": f"TEST_campaign_{unique_id}",
            "target_name": f"TEST Campaign {unique_id}",
            "link_type": "assigned",
            "notes": "Testing persistence"
        }
        
        # Create
        create_response = requests.post(
            f"{BASE_URL}/api/entity-links",
            headers=headers,
            json=payload
        )
        assert create_response.status_code == 200
        created = create_response.json()
        link_id = created["id"]
        
        # Verify via GET for-entity
        get_response = requests.get(
            f"{BASE_URL}/api/entity-links/for-entity/{payload['source_type']}/{payload['source_id']}",
            headers=headers
        )
        assert get_response.status_code == 200
        links = get_response.json()
        assert isinstance(links, list)
        assert len(links) >= 1
        
        found_link = next((l for l in links if l["id"] == link_id), None)
        assert found_link is not None
        assert found_link["source_name"] == payload["source_name"]
        assert found_link["target_name"] == payload["target_name"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/entity-links/{link_id}", headers=headers)
        print("Create->GET persistence verified successfully")
    
    def test_get_links_for_entity(self, headers):
        """GET /api/entity-links/for-entity/{type}/{id} - Get links for specific entity"""
        unique_id = str(uuid.uuid4())[:8]
        entity_type = "email"
        entity_id = f"TEST_email_{unique_id}"
        
        # Create a link
        payload = {
            "source_type": entity_type,
            "source_id": entity_id,
            "source_name": f"TEST Email {unique_id}",
            "target_type": "campaign",
            "target_id": f"TEST_camp_{unique_id}",
            "target_name": "Test Campaign",
            "link_type": "mentioned"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/entity-links",
            headers=headers,
            json=payload
        )
        assert create_response.status_code == 200
        link_id = create_response.json()["id"]
        
        # Get links for entity
        response = requests.get(
            f"{BASE_URL}/api/entity-links/for-entity/{entity_type}/{entity_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/entity-links/{link_id}", headers=headers)
    
    def test_get_campaign_linked_entities(self, headers):
        """GET /api/entity-links/campaign/{id}/linked-entities - Get entities linked to campaign"""
        unique_id = str(uuid.uuid4())[:8]
        campaign_id = f"TEST_camp_{unique_id}"
        
        # Create multiple links to the campaign
        link_ids = []
        for entity_type in ["influencer", "lead", "email"]:
            payload = {
                "source_type": entity_type,
                "source_id": f"TEST_{entity_type}_{unique_id}",
                "source_name": f"TEST {entity_type.title()} {unique_id}",
                "target_type": "campaign",
                "target_id": campaign_id,
                "target_name": f"TEST Campaign {unique_id}",
                "link_type": "related"
            }
            response = requests.post(
                f"{BASE_URL}/api/entity-links",
                headers=headers,
                json=payload
            )
            assert response.status_code == 200
            link_ids.append(response.json()["id"])
        
        # Get linked entities for campaign
        response = requests.get(
            f"{BASE_URL}/api/entity-links/campaign/{campaign_id}/linked-entities",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify grouped structure
        assert "influencers" in data
        assert "leads" in data
        assert "emails" in data
        assert len(data["influencers"]) >= 1
        assert len(data["leads"]) >= 1
        assert len(data["emails"]) >= 1
        
        # Cleanup
        for link_id in link_ids:
            requests.delete(f"{BASE_URL}/api/entity-links/{link_id}", headers=headers)
        print("Campaign linked entities grouped correctly")
    
    def test_delete_entity_link(self, headers):
        """DELETE /api/entity-links/{id} - Delete entity link"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create a link
        payload = {
            "source_type": "contact",
            "source_id": f"TEST_contact_{unique_id}",
            "source_name": "Test Contact",
            "target_type": "campaign",
            "target_id": f"TEST_camp_{unique_id}",
            "target_name": "Test Campaign"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/entity-links",
            headers=headers,
            json=payload
        )
        assert create_response.status_code == 200
        link_id = create_response.json()["id"]
        
        # Delete the link
        delete_response = requests.delete(
            f"{BASE_URL}/api/entity-links/{link_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        assert "deleted" in delete_response.json().get("message", "").lower()
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/entity-links/for-entity/{payload['source_type']}/{payload['source_id']}",
            headers=headers
        )
        assert get_response.status_code == 200
        links = get_response.json()
        found = any(l["id"] == link_id for l in links)
        assert not found
        print("Delete->verify removal successful")
    
    def test_delete_nonexistent_returns_404(self, headers):
        """DELETE /api/entity-links/{id} - Returns 404 for non-existent link"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/entity-links/{fake_id}",
            headers=headers
        )
        assert response.status_code == 404
    
    def test_create_duplicate_link_returns_400(self, headers):
        """POST /api/entity-links - Duplicate link should return 400"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "source_type": "brand",
            "source_id": f"TEST_brand_{unique_id}",
            "source_name": "Test Brand",
            "target_type": "campaign",
            "target_id": f"TEST_camp_{unique_id}",
            "target_name": "Test Campaign"
        }
        
        # Create first link
        response1 = requests.post(
            f"{BASE_URL}/api/entity-links",
            headers=headers,
            json=payload
        )
        assert response1.status_code == 200
        link_id = response1.json()["id"]
        
        # Try to create duplicate
        response2 = requests.post(
            f"{BASE_URL}/api/entity-links",
            headers=headers,
            json=payload
        )
        assert response2.status_code == 400
        assert "already exists" in response2.json().get("detail", "").lower()
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/entity-links/{link_id}", headers=headers)
    
    def test_list_with_filters(self, headers):
        """GET /api/entity-links with query parameters"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create a link
        payload = {
            "source_type": "influencer",
            "source_id": f"TEST_inf_filter_{unique_id}",
            "source_name": "Test Influencer",
            "target_type": "campaign",
            "target_id": f"TEST_camp_filter_{unique_id}",
            "target_name": "Test Campaign"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/entity-links",
            headers=headers,
            json=payload
        )
        assert create_response.status_code == 200
        link_id = create_response.json()["id"]
        
        # Test filter by source_type
        response = requests.get(
            f"{BASE_URL}/api/entity-links?source_type=influencer",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/entity-links/{link_id}", headers=headers)


class TestUnauthorizedAccess:
    """Test API authorization"""
    
    def test_shared_mailboxes_unauthorized(self):
        """Shared mailboxes endpoints require auth"""
        response = requests.get(f"{BASE_URL}/api/shared-mailboxes")
        assert response.status_code == 401
    
    def test_entity_links_unauthorized(self):
        """Entity links endpoints require auth"""
        response = requests.get(f"{BASE_URL}/api/entity-links")
        assert response.status_code == 401
    
    def test_campaigns_endpoint_unauthorized(self):
        """Entity links campaigns endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/entity-links/campaigns")
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
