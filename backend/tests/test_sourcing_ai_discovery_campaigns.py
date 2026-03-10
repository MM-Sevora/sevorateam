"""
Backend Tests for AI Brand Discovery and Email Campaigns (Sourcing Module)
Tests: AI Discovery endpoints, Email Campaigns endpoints, SendGrid integration, Templates
"""
import pytest
import requests
import os

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="module")
def auth_headers():
    """Get authentication headers for superadmin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "superadmin@sevora.com", "password": "superadmin123"}
    )
    if response.status_code != 200:
        pytest.skip(f"Login failed: {response.text}")
    token = response.json()["access_token"]
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


# ==========================================
# AI Discovery Service Status Tests
# ==========================================

class TestAIDiscoveryService:
    """Tests for AI Discovery service status and configuration"""
    
    def test_discovery_status_returns_configured(self, auth_headers):
        """Test AI discovery status endpoint shows service is ready"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/discovery/status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "configured" in data
        assert data["configured"] is True
        assert "message" in data
        assert "ready" in data["message"].lower()
        print(f"✓ AI Discovery status: {data['message']}")
    
    def test_discovery_options_returns_all_required_fields(self, auth_headers):
        """Test discovery options returns categories, subcategories, cities, segments"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/discovery/options",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields exist
        assert "categories" in data
        assert "subcategories" in data
        assert "cities" in data
        assert "segments" in data
        assert "target_segments" in data
        assert "service_configured" in data
        
        # Validate categories
        assert len(data["categories"]) > 0
        assert "Womenswear" in data["categories"]
        
        # Validate subcategories structure
        assert "Womenswear" in data["subcategories"]
        assert len(data["subcategories"]["Womenswear"]) > 0
        
        # Validate cities
        assert len(data["cities"]) > 0
        assert "Mumbai" in data["cities"]
        assert "Delhi" in data["cities"]
        
        # Validate segments
        assert "Affordable Luxury" in data["segments"]
        assert "price_range" in data["segments"]["Affordable Luxury"]
        
        print(f"✓ Discovery options: {len(data['categories'])} categories, {len(data['cities'])} cities")
    
    def test_discovery_history_returns_list(self, auth_headers):
        """Test discovery history endpoint returns list of jobs"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/discovery/history",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list)
        
        # If there are jobs, validate structure
        if len(data) > 0:
            job = data[0]
            assert "id" in job
            assert "category" in job
            assert "status" in job
            assert "created_at" in job
            print(f"✓ Discovery history: {len(data)} jobs found")
        else:
            print("✓ Discovery history: No jobs yet")


class TestAIDiscoveryRun:
    """Tests for running AI discovery (AI-only mode since Google Search not enabled)"""
    
    def test_run_discovery_with_valid_params(self, auth_headers):
        """Test running AI discovery with valid parameters"""
        request_data = {
            "category": "Womenswear",
            "subcategories": ["Sarees"],
            "segment": "Affordable Luxury",
            "city": "Mumbai",
            "count": 3  # Small count for testing
        }
        
        response = requests.post(
            f"{BASE_URL}/api/sourcing/discovery/run-now",
            headers=auth_headers,
            json=request_data,
            timeout=60  # AI generation may take time
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "success" in data
        assert data["success"] is True
        assert "job_id" in data
        assert "message" in data
        assert "brands" in data
        assert "stats" in data
        
        # Verify brands were discovered
        brands = data["brands"]
        assert isinstance(brands, list)
        
        # If brands found, validate structure
        if len(brands) > 0:
            brand = brands[0]
            assert "name" in brand
            print(f"✓ AI Discovery run: Found {len(brands)} brands")
        else:
            print("✓ AI Discovery run: Completed (no new brands found)")
    
    def test_run_discovery_without_city(self, auth_headers):
        """Test AI discovery without city filter"""
        request_data = {
            "category": "Accessories",
            "subcategories": [],
            "segment": "Bridge to Luxury",
            "count": 3
        }
        
        response = requests.post(
            f"{BASE_URL}/api/sourcing/discovery/run-now",
            headers=auth_headers,
            json=request_data,
            timeout=60
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"✓ AI Discovery (no city): {data['message']}")


# ==========================================
# Email Campaigns Service Tests
# ==========================================

class TestEmailCampaignsService:
    """Tests for Email Campaigns service status and configuration"""
    
    def test_email_service_status_shows_sendgrid_ready(self, auth_headers):
        """Test email service status shows SendGrid is configured"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/campaigns/status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "configured" in data
        assert data["configured"] is True
        assert "message" in data
        assert "ready" in data["message"].lower() or "sendgrid" in data["message"].lower()
        print(f"✓ Email Service status: {data['message']}")
    
    def test_list_campaigns_returns_list(self, auth_headers):
        """Test listing campaigns returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/campaigns",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Campaigns list: {len(data)} campaigns")
    
    def test_recent_outreach_logs(self, auth_headers):
        """Test recent outreach logs endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/campaigns/logs/recent?limit=50",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Recent logs: {len(data)} outreach activities")


class TestEmailCampaignsSend:
    """Tests for sending emails (single and bulk)"""
    
    def test_send_single_email_validates_required_fields(self, auth_headers):
        """Test single email endpoint validates required fields"""
        # Test with missing required fields
        response = requests.post(
            f"{BASE_URL}/api/sourcing/campaigns/send-single",
            headers=auth_headers,
            json={"to_name": "Test"}  # Missing to_email, subject, content
        )
        
        # Should return 422 (validation error)
        assert response.status_code == 422
        print("✓ Single email validation: Rejects missing required fields")
    
    def test_send_single_email_validates_email_format(self, auth_headers):
        """Test single email validates email format"""
        response = requests.post(
            f"{BASE_URL}/api/sourcing/campaigns/send-single",
            headers=auth_headers,
            json={
                "to_email": "invalid-email",
                "subject": "Test Subject",
                "content": "Test content"
            }
        )
        
        # Should return 422 (invalid email format)
        assert response.status_code == 422
        print("✓ Single email validation: Rejects invalid email format")
    
    def test_bulk_email_validates_recipients(self, auth_headers):
        """Test bulk email validates recipients list"""
        response = requests.post(
            f"{BASE_URL}/api/sourcing/campaigns/send-bulk",
            headers=auth_headers,
            json={
                "campaign_name": "Test Campaign",
                "subject": "Test Subject",
                "content": "Test content",
                "recipients": []  # Empty recipients
            }
        )
        
        # Should return 400 (no recipients)
        assert response.status_code == 400
        assert "recipients" in response.json().get("detail", "").lower()
        print("✓ Bulk email validation: Rejects empty recipients list")


# ==========================================
# Email Templates Tests
# ==========================================

class TestEmailTemplates:
    """Tests for email templates functionality"""
    
    def test_list_templates_returns_list(self, auth_headers):
        """Test listing email templates"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/templates",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        # If templates exist, validate structure
        if len(data) > 0:
            template = data[0]
            assert "id" in template
            assert "name" in template
            assert "type" in template
            print(f"✓ Templates list: {len(data)} templates available")
        else:
            print("✓ Templates list: No templates yet")
    
    def test_templates_have_required_fields(self, auth_headers):
        """Test that templates have all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/templates",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Skip if no templates
        if len(data) == 0:
            pytest.skip("No templates available for field validation")
        
        # Check a template has required fields
        template = data[0]
        required_fields = ["id", "name", "type", "content", "created_at"]
        for field in required_fields:
            assert field in template, f"Template missing required field: {field}"
        
        print(f"✓ Template structure validated: {template['name']}")


# ==========================================
# Brands for Email Selection Tests
# ==========================================

class TestBrandsForEmail:
    """Tests for brands endpoint used in email selection"""
    
    def test_list_brands_returns_list(self, auth_headers):
        """Test listing brands for email campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/brands?limit=10",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        # If brands exist, validate structure
        if len(data) > 0:
            brand = data[0]
            assert "id" in brand
            assert "name" in brand
            print(f"✓ Brands list: {len(data)} brands available")
        else:
            print("✓ Brands list: No brands yet")
    
    def test_brands_with_email_can_be_filtered(self, auth_headers):
        """Test getting brands with email addresses for bulk campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/brands?limit=500",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Count brands with email
        brands_with_email = [
            b for b in data 
            if b.get("email") or b.get("contact_email")
        ]
        
        print(f"✓ Brands with email: {len(brands_with_email)} out of {len(data)} total brands")


# ==========================================
# Discovery Job Scoring Tests
# ==========================================

class TestBrandScoring:
    """Tests for brand fit score calculation"""
    
    def test_score_brand_not_found(self, auth_headers):
        """Test scoring a non-existent brand returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/sourcing/discovery/score-brand/non-existent-id",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("✓ Score brand: Returns 404 for non-existent brand")


# ==========================================
# Authentication Tests
# ==========================================

class TestAuthRequired:
    """Tests that all endpoints require authentication"""
    
    def test_discovery_status_requires_auth(self):
        """Test discovery status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sourcing/discovery/status")
        assert response.status_code in [401, 403]
        print("✓ Discovery status: Requires authentication")
    
    def test_campaigns_status_requires_auth(self):
        """Test campaigns status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sourcing/campaigns/status")
        assert response.status_code in [401, 403]
        print("✓ Campaigns status: Requires authentication")
    
    def test_templates_requires_auth(self):
        """Test templates list requires authentication"""
        response = requests.get(f"{BASE_URL}/api/sourcing/templates")
        assert response.status_code in [401, 403]
        print("✓ Templates list: Requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
