"""
Content & Assets Module Backend Tests
Testing: Templates, Deliveries (Influencer + PR Coverage), Assets, UGC Library
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "marketing@sevora.com"
TEST_USER_PASSWORD = "admin123"

@pytest.fixture(scope="session")
def auth_headers():
    """Get authentication headers by logging in"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        return {"Authorization": f"Bearer {token}"}
    pytest.skip(f"Authentication failed with status {response.status_code}")

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ==================== TEMPLATES TESTS ====================

class TestTemplatesAPI:
    """Tests for /api/marketing/v2/templates endpoints"""
    
    def test_get_templates_list(self, api_client, auth_headers):
        """GET /api/marketing/v2/templates - Returns templates list"""
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/templates", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Templates should be a list"
        print(f"✓ GET /api/marketing/v2/templates - Returns {len(data)} templates")
    
    def test_create_template_with_variables(self, api_client, auth_headers):
        """POST /api/marketing/v2/templates - Creates template with variables"""
        template_data = {
            "name": "TEST_Email_Outreach_Template",
            "template_type": "email",
            "subject": "Hi {{name}}, Check out our new collection!",
            "content": "Dear {{name}},\n\nWe are excited to introduce our latest {{product}} collection.\n\nBest regards,\n{{sender_name}}",
            "variables": ["name", "product", "sender_name"],
            "tags": ["outreach", "fashion", "marketing"]
        }
        response = api_client.post(f"{BASE_URL}/api/marketing/v2/templates", json=template_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain template id"
        assert data["name"] == template_data["name"], "Template name should match"
        assert data["template_type"] == "email", "Template type should be email"
        assert data["variables"] == template_data["variables"], "Variables should match"
        assert data["content"] == template_data["content"], "Content should match"
        print(f"✓ POST /api/marketing/v2/templates - Created template {data['id']}")
        
        # Store for cleanup
        pytest.created_template_id = data["id"]
        return data["id"]
    
    def test_get_template_by_id(self, api_client, auth_headers):
        """GET /api/marketing/v2/templates/{id} - Returns single template"""
        # First create a template
        template_id = self.test_create_template_with_variables(api_client, auth_headers)
        
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/templates/{template_id}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["id"] == template_id, "Template ID should match"
        print(f"✓ GET /api/marketing/v2/templates/{template_id} - Template retrieved")
    
    def test_update_template(self, api_client, auth_headers):
        """PUT /api/marketing/v2/templates/{id} - Updates template"""
        # First create a template
        template_data = {
            "name": "TEST_Template_To_Update",
            "template_type": "email",
            "subject": "Original Subject",
            "content": "Original content",
            "variables": ["name"],
            "tags": ["test"]
        }
        create_response = api_client.post(f"{BASE_URL}/api/marketing/v2/templates", json=template_data, headers=auth_headers)
        template_id = create_response.json()["id"]
        
        # Update the template
        update_data = {
            "name": "TEST_Template_To_Update",
            "subject": "Updated Subject",
            "content": "Updated content with {{company}}",
            "variables": ["name", "company"],
            "tags": ["test", "updated"]
        }
        response = api_client.put(f"{BASE_URL}/api/marketing/v2/templates/{template_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["subject"] == "Updated Subject", "Subject should be updated"
        assert "company" in data["variables"], "Variables should include 'company'"
        print(f"✓ PUT /api/marketing/v2/templates/{template_id} - Template updated")
    
    def test_delete_template(self, api_client, auth_headers):
        """DELETE /api/marketing/v2/templates/{id} - Deletes template"""
        # First create a template
        template_data = {
            "name": "TEST_Template_To_Delete",
            "template_type": "email",
            "content": "Delete me",
            "variables": [],
            "tags": []
        }
        create_response = api_client.post(f"{BASE_URL}/api/marketing/v2/templates", json=template_data, headers=auth_headers)
        template_id = create_response.json()["id"]
        
        # Delete the template
        response = api_client.delete(f"{BASE_URL}/api/marketing/v2/templates/{template_id}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify deletion - should return 404
        verify_response = api_client.get(f"{BASE_URL}/api/marketing/v2/templates/{template_id}", headers=auth_headers)
        assert verify_response.status_code == 404, "Deleted template should return 404"
        print(f"✓ DELETE /api/marketing/v2/templates/{template_id} - Template deleted and verified")


# ==================== INFLUENCER DELIVERIES TESTS ====================

class TestInfluencerDeliveriesAPI:
    """Tests for /api/marketing/v2/deliveries/influencer endpoints"""
    
    @pytest.fixture
    def test_contact_id(self, api_client, auth_headers):
        """Get or create a test influencer contact"""
        # Get existing influencer contacts
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/contacts?contact_type=influencer&limit=1", headers=auth_headers)
        if response.status_code == 200:
            contacts = response.json()
            if contacts:
                return contacts[0]["id"]
        
        # Create a test contact if none exists
        contact_data = {
            "name": "TEST_Influencer_For_Delivery",
            "contact_type": "influencer",
            "email": "test.influencer.delivery@example.com",
            "platform": "instagram"
        }
        create_response = api_client.post(f"{BASE_URL}/api/marketing/v2/contacts", json=contact_data, headers=auth_headers)
        if create_response.status_code == 200:
            return create_response.json()["id"]
        pytest.skip("Could not get or create test contact")
    
    def test_get_influencer_deliveries_list(self, api_client, auth_headers):
        """GET /api/marketing/v2/deliveries/influencer - Returns deliveries with filters"""
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/deliveries/influencer", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Deliveries should be a list"
        print(f"✓ GET /api/marketing/v2/deliveries/influencer - Returns {len(data)} deliveries")
    
    def test_get_deliveries_with_filters(self, api_client, auth_headers):
        """GET /api/marketing/v2/deliveries/influencer with platform and content_type filters"""
        # Test platform filter
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/deliveries/influencer?platform=instagram", headers=auth_headers)
        assert response.status_code == 200, "Platform filter should work"
        
        # Test content_type filter
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/deliveries/influencer?content_type=post", headers=auth_headers)
        assert response.status_code == 200, "Content type filter should work"
        print("✓ GET /api/marketing/v2/deliveries/influencer - Filters working")
    
    def test_create_influencer_delivery_with_metrics(self, api_client, auth_headers, test_contact_id):
        """POST /api/marketing/v2/deliveries/influencer - Creates delivery with metrics"""
        delivery_data = {
            "contact_id": test_contact_id,
            "platform": "instagram",
            "content_type": "reel",
            "content_url": "https://instagram.com/reel/TEST123",
            "title": "TEST_Delivery_Content",
            "publish_date": datetime.now().strftime("%Y-%m-%d"),
            "views": 15000,
            "likes": 1200,
            "comments": 89,
            "shares": 45,
            "saves": 234,
            "reach": 18500
        }
        response = api_client.post(f"{BASE_URL}/api/marketing/v2/deliveries/influencer", json=delivery_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain delivery id"
        assert data["contact_id"] == test_contact_id, "Contact ID should match"
        assert data["platform"] == "instagram", "Platform should match"
        assert data["content_type"] == "reel", "Content type should match"
        assert data["views"] == 15000, "Views should match"
        assert data["likes"] == 1200, "Likes should match"
        assert data["reach"] == 18500, "Reach should match"
        print(f"✓ POST /api/marketing/v2/deliveries/influencer - Created delivery {data['id']} with engagement metrics")
        
        pytest.created_delivery_id = data["id"]
        return data["id"]
    
    def test_delete_influencer_delivery(self, api_client, auth_headers, test_contact_id):
        """DELETE /api/marketing/v2/deliveries/influencer/{id} - Deletes delivery"""
        # Create a delivery to delete
        delivery_data = {
            "contact_id": test_contact_id,
            "platform": "youtube",
            "content_type": "video",
            "content_url": "https://youtube.com/watch?v=TEST_DELETE",
            "title": "TEST_Delivery_To_Delete",
            "publish_date": datetime.now().strftime("%Y-%m-%d"),
            "views": 1000,
            "likes": 50
        }
        create_response = api_client.post(f"{BASE_URL}/api/marketing/v2/deliveries/influencer", json=delivery_data, headers=auth_headers)
        delivery_id = create_response.json()["id"]
        
        # Delete the delivery
        response = api_client.delete(f"{BASE_URL}/api/marketing/v2/deliveries/influencer/{delivery_id}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ DELETE /api/marketing/v2/deliveries/influencer/{delivery_id} - Delivery deleted")


# ==================== DELIVERIES STATS TESTS ====================

class TestDeliveriesStatsAPI:
    """Tests for /api/marketing/v2/deliveries/stats endpoint"""
    
    def test_get_deliveries_stats(self, api_client, auth_headers):
        """GET /api/marketing/v2/deliveries/stats - Returns aggregated stats"""
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/deliveries/stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check influencer deliveries stats
        assert "influencer_deliveries" in data, "Should have influencer_deliveries stats"
        assert "total" in data["influencer_deliveries"], "Should have total count"
        assert "total_views" in data["influencer_deliveries"], "Should have total_views"
        assert "total_reach" in data["influencer_deliveries"], "Should have total_reach"
        
        # Check PR coverage stats
        assert "pr_coverage" in data, "Should have pr_coverage stats"
        assert "total" in data["pr_coverage"], "Should have total coverage count"
        
        print(f"✓ GET /api/marketing/v2/deliveries/stats - Stats: {data['influencer_deliveries']['total']} deliveries, {data['pr_coverage']['total']} coverage")


# ==================== ASSETS TESTS ====================

class TestAssetsAPI:
    """Tests for /api/marketing/v2/assets endpoints"""
    
    def test_get_assets_list(self, api_client, auth_headers):
        """GET /api/marketing/v2/assets - Returns assets list"""
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/assets", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Assets should be a list"
        print(f"✓ GET /api/marketing/v2/assets - Returns {len(data)} assets")
    
    def test_get_assets_by_category(self, api_client, auth_headers):
        """GET /api/marketing/v2/assets?category=brand_assets - Filter by category"""
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/assets?category=brand_assets", headers=auth_headers)
        assert response.status_code == 200, "Category filter should work"
        
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/assets?category=press_kit", headers=auth_headers)
        assert response.status_code == 200, "Press kit category filter should work"
        print("✓ GET /api/marketing/v2/assets - Category filters working")
    
    def test_create_asset(self, api_client, auth_headers):
        """POST /api/marketing/v2/assets - Creates new asset"""
        asset_data = {
            "name": "TEST_Brand_Logo",
            "asset_type": "logo",
            "category": "brand_assets",
            "description": "Test logo asset",
            "file_url": "https://example.com/test-logo.png",
            "tags": ["logo", "brand", "test"]
        }
        response = api_client.post(f"{BASE_URL}/api/marketing/v2/assets", json=asset_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain asset id"
        assert data["name"] == asset_data["name"], "Asset name should match"
        assert data["category"] == "brand_assets", "Category should match"
        print(f"✓ POST /api/marketing/v2/assets - Created asset {data['id']}")
        
        pytest.created_asset_id = data["id"]
        return data["id"]
    
    def test_update_asset_campaign_link(self, api_client, auth_headers):
        """PUT /api/marketing/v2/assets/{id} - Updates asset (campaign linking)"""
        # Create an asset first
        asset_data = {
            "name": "TEST_Asset_For_Campaign",
            "asset_type": "image",
            "category": "brand_assets",
            "file_url": "https://example.com/test-image.jpg",
            "tags": ["test"]
        }
        create_response = api_client.post(f"{BASE_URL}/api/marketing/v2/assets", json=asset_data, headers=auth_headers)
        asset_id = create_response.json()["id"]
        
        # Update the asset
        update_params = {
            "name": "TEST_Asset_For_Campaign_Updated",
            "description": "Updated description",
            "tags": ["test", "updated", "campaign"]
        }
        response = api_client.put(f"{BASE_URL}/api/marketing/v2/assets/{asset_id}", params=update_params, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ PUT /api/marketing/v2/assets/{asset_id} - Asset updated")
    
    def test_create_asset_version(self, api_client, auth_headers):
        """POST /api/marketing/v2/assets/{id}/version - Creates asset version"""
        # Create an asset first
        asset_data = {
            "name": "TEST_Asset_With_Versions",
            "asset_type": "image",
            "category": "brand_assets",
            "file_url": "https://example.com/v1.jpg",
            "tags": ["versioned"]
        }
        create_response = api_client.post(f"{BASE_URL}/api/marketing/v2/assets", json=asset_data, headers=auth_headers)
        asset_id = create_response.json()["id"]
        
        # Create a new version
        version_params = {
            "file_url": "https://example.com/v2.jpg",
            "description": "Version 2 - Updated logo"
        }
        response = api_client.post(
            f"{BASE_URL}/api/marketing/v2/assets/{asset_id}/version", 
            params=version_params,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["version"] == 2, "New version should be 2"
        assert data["parent_asset_id"] == asset_id, "Parent asset ID should match"
        print(f"✓ POST /api/marketing/v2/assets/{asset_id}/version - Created version 2")
    
    def test_delete_asset(self, api_client, auth_headers):
        """DELETE /api/marketing/v2/assets/{id} - Deletes asset"""
        # Create an asset to delete
        asset_data = {
            "name": "TEST_Asset_To_Delete",
            "asset_type": "document",
            "category": "brand_assets",
            "file_url": "https://example.com/delete-me.pdf",
            "tags": []
        }
        create_response = api_client.post(f"{BASE_URL}/api/marketing/v2/assets", json=asset_data, headers=auth_headers)
        asset_id = create_response.json()["id"]
        
        # Delete the asset
        response = api_client.delete(f"{BASE_URL}/api/marketing/v2/assets/{asset_id}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ DELETE /api/marketing/v2/assets/{asset_id} - Asset deleted")


# ==================== UGC LIBRARY TESTS ====================

class TestUGCLibraryAPI:
    """Tests for /api/marketing/v2/ugc endpoints"""
    
    @pytest.fixture
    def test_contact_id(self, api_client, auth_headers):
        """Get or create a test influencer contact for UGC"""
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/contacts?contact_type=influencer&limit=1", headers=auth_headers)
        if response.status_code == 200:
            contacts = response.json()
            if contacts:
                return contacts[0]["id"]
        pytest.skip("No influencer contact available for UGC test")
    
    def test_get_ugc_list(self, api_client, auth_headers):
        """GET /api/marketing/v2/ugc - Returns UGC list"""
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/ugc", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "UGC should be a list"
        print(f"✓ GET /api/marketing/v2/ugc - Returns {len(data)} UGC items")
    
    def test_get_ugc_with_filters(self, api_client, auth_headers):
        """GET /api/marketing/v2/ugc - Search and filter by platform, campaign"""
        # Test platform filter
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/ugc?platform=instagram", headers=auth_headers)
        assert response.status_code == 200, "Platform filter should work"
        print("✓ GET /api/marketing/v2/ugc - Filters working")
    
    def test_create_ugc(self, api_client, auth_headers, test_contact_id):
        """POST /api/marketing/v2/ugc - Creates UGC entry"""
        ugc_data = {
            "contact_id": test_contact_id,
            "title": "TEST_UGC_Content",
            "content_type": "reel",
            "platform": "instagram",
            "media_urls": ["https://example.com/ugc1.jpg", "https://example.com/ugc2.jpg"],
            "caption": "Amazing content for our brand! #fashion #style",
            "hashtags": ["fashion", "style", "brand"]
        }
        response = api_client.post(f"{BASE_URL}/api/marketing/v2/ugc", json=ugc_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain UGC id"
        assert data["contact_id"] == test_contact_id, "Contact ID should match"
        assert data["platform"] == "instagram", "Platform should match"
        print(f"✓ POST /api/marketing/v2/ugc - Created UGC {data['id']}")


# ==================== PR COVERAGE TESTS ====================

class TestPRCoverageAPI:
    """Tests for /api/marketing/v2/pr/coverage endpoints"""
    
    def test_get_pr_coverage_list(self, api_client, auth_headers):
        """GET /api/marketing/v2/pr/coverage - Returns PR coverage list"""
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/pr/coverage", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Coverage should be a list"
        print(f"✓ GET /api/marketing/v2/pr/coverage - Returns {len(data)} coverage items")
    
    def test_pr_coverage_has_expected_fields(self, api_client, auth_headers):
        """Verify PR coverage items have expected fields"""
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/pr/coverage", headers=auth_headers)
        data = response.json()
        
        if data:
            coverage = data[0]
            expected_fields = ["id", "title", "publication", "url", "coverage_type"]
            for field in expected_fields:
                assert field in coverage, f"Coverage should have '{field}' field"
            print(f"✓ PR Coverage items have expected fields")
        else:
            print("✓ PR Coverage endpoint works (no data to verify fields)")


# ==================== CLEANUP ====================

@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data(request, auth_headers):
    """Cleanup TEST_ prefixed data after test session completes"""
    yield
    
    # Cleanup will happen automatically as test data uses TEST_ prefix
    # Could add explicit cleanup here if needed
    print("\n✓ Test session completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
