"""
Digital PR Platform - Phases 2-4 Tests
Phase 2: AI Media Discovery (ai-discover, ai-generate-pitch)
Phase 3: PR Campaign Management (campaigns CRUD, journalists add/remove)
Phase 4: Outreach Automation (templates, schedule, send, stats)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta
import time

# Use public URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com').rstrip('/')

class TestSetup:
    """Setup and helper functions"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers for requests"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestPhase2AIDiscovery(TestSetup):
    """Phase 2: AI Media Discovery Tests"""
    
    def test_ai_discover_journalists(self, auth_headers):
        """Test POST /api/marketing/v2/pr/ai-discover with discovery brief"""
        discovery_brief = {
            "topic": "Spring Fashion Collection Launch 2026",
            "industry": "Fashion",
            "publication_type": "digital",
            "location": "India",
            "story_type": "news",
            "urgency": "normal",
            "key_messages": "Sustainable materials, modern design",
            "target_audience": "Fashion-conscious millennials",
            "additional_context": "Focus on eco-friendly fashion"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/pr/ai-discover",
            json=discovery_brief,
            headers=auth_headers,
            timeout=30  # Allow time for LLM response
        )
        
        print(f"AI Discover Response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"AI Discovery failed: {response.text}"
        
        data = response.json()
        # Check response structure
        assert "success" in data, "Response should have success field"
        
        if data.get("success"):
            assert "data" in data or "session_id" in data, "Successful response should have data or session_id"
            # If we have recommendations, verify structure
            if "data" in data and data["data"].get("recommendations"):
                rec = data["data"]["recommendations"][0]
                # Recommendations should have these fields
                assert "journalist_id" in rec or "match_score" in rec, "Recommendation should have journalist_id or match_score"
        else:
            # Even failed responses should have error message
            print(f"AI Discovery returned success=False: {data.get('error')}")
    
    def test_ai_discover_requires_auth(self):
        """Test that AI discover requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/pr/ai-discover",
            json={"topic": "Test"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, "AI discover should require authentication"
    
    def test_ai_generate_pitch(self, auth_headers):
        """Test POST /api/marketing/v2/pr/ai-generate-pitch for journalist"""
        # First get a journalist to generate pitch for
        contacts_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"contact_type": "journalist", "limit": 1},
            headers=auth_headers
        )
        
        if contacts_response.status_code == 200 and contacts_response.json():
            journalist = contacts_response.json()[0]
            journalist_id = journalist["id"]
            
            response = requests.post(
                f"{BASE_URL}/api/marketing/v2/pr/ai-generate-pitch",
                params={"journalist_id": journalist_id, "tone": "professional"},
                headers=auth_headers,
                timeout=30
            )
            
            print(f"AI Generate Pitch Response: {response.status_code} - {response.text[:500]}")
            assert response.status_code == 200, f"AI Generate Pitch failed: {response.text}"
            
            data = response.json()
            assert "success" in data, "Response should have success field"
            
            if data.get("success"):
                # Pitch response should have data with subject and body
                assert "data" in data, "Successful response should have data"
        else:
            pytest.skip("No journalist contacts available for pitch generation test")
    
    def test_ai_generate_pitch_not_found_journalist(self, auth_headers):
        """Test AI pitch generation with non-existent journalist"""
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/pr/ai-generate-pitch",
            params={"journalist_id": "non-existent-id", "tone": "professional"},
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 for non-existent journalist: {response.status_code}"


class TestPhase3PRCampaigns(TestSetup):
    """Phase 3: PR Campaign Management Tests"""
    
    test_campaign_id = None
    test_journalist_id = None
    
    def test_get_campaigns_list(self, auth_headers):
        """Test GET /api/marketing/v2/pr/campaigns list"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/campaigns",
            headers=auth_headers
        )
        
        print(f"Get Campaigns Response: {response.status_code}")
        assert response.status_code == 200, f"Get campaigns failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} PR campaigns")
    
    def test_create_campaign(self, auth_headers):
        """Test POST /api/marketing/v2/pr/campaigns create"""
        campaign_data = {
            "name": f"TEST_PHASE3_Campaign_{datetime.now().strftime('%H%M%S')}",
            "objective": "Test campaign for Phase 3 testing",
            "description": "Automated test campaign",
            "story_angle": "Testing the PR platform",
            "key_messages": ["Test message 1", "Test message 2"],
            "target_publications": ["Vogue", "Elle"],
            "target_beats": ["Fashion", "Lifestyle"],
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "budget": 50000
        }
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/pr/campaigns",
            json=campaign_data,
            headers=auth_headers
        )
        
        print(f"Create Campaign Response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"Create campaign failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have campaign id"
        assert data["name"] == campaign_data["name"], "Campaign name should match"
        assert data["status"] == "planning", "New campaign should have planning status"
        
        # Store for later tests
        TestPhase3PRCampaigns.test_campaign_id = data["id"]
        print(f"Created campaign: {data['id']}")
    
    def test_update_campaign_status(self, auth_headers):
        """Test PUT /api/marketing/v2/pr/campaigns/{id}/status update"""
        campaign_id = TestPhase3PRCampaigns.test_campaign_id
        if not campaign_id:
            pytest.skip("No test campaign available")
        
        response = requests.put(
            f"{BASE_URL}/api/marketing/v2/pr/campaigns/{campaign_id}/status",
            params={"status": "active"},
            headers=auth_headers
        )
        
        print(f"Update Campaign Status Response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Update status failed: {response.text}"
        
        # Verify status was updated
        verify_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/campaigns/{campaign_id}",
            headers=auth_headers
        )
        assert verify_response.status_code == 200
        assert verify_response.json()["status"] == "active", "Campaign status should be updated to active"
    
    def test_add_journalist_to_campaign(self, auth_headers):
        """Test POST /api/marketing/v2/pr/campaigns/{id}/journalists/{id}"""
        campaign_id = TestPhase3PRCampaigns.test_campaign_id
        if not campaign_id:
            pytest.skip("No test campaign available")
        
        # Get a journalist
        contacts_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"contact_type": "journalist", "limit": 1},
            headers=auth_headers
        )
        
        if contacts_response.status_code != 200 or not contacts_response.json():
            pytest.skip("No journalist contacts available")
        
        journalist = contacts_response.json()[0]
        journalist_id = journalist["id"]
        TestPhase3PRCampaigns.test_journalist_id = journalist_id
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/pr/campaigns/{campaign_id}/journalists/{journalist_id}",
            headers=auth_headers
        )
        
        print(f"Add Journalist Response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Add journalist failed: {response.text}"
        
        # Verify journalist was added
        verify_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/campaigns/{campaign_id}",
            headers=auth_headers
        )
        assert verify_response.status_code == 200
        campaign_data = verify_response.json()
        assert journalist_id in campaign_data.get("journalist_ids", []), "Journalist should be in campaign"
    
    def test_get_campaign_journalists(self, auth_headers):
        """Test GET /api/marketing/v2/pr/campaigns/{id}/journalists"""
        campaign_id = TestPhase3PRCampaigns.test_campaign_id
        if not campaign_id:
            pytest.skip("No test campaign available")
        
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/campaigns/{campaign_id}/journalists",
            headers=auth_headers
        )
        
        print(f"Get Campaign Journalists Response: {response.status_code}")
        assert response.status_code == 200, f"Get campaign journalists failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_campaigns_requires_auth(self):
        """Test that campaigns endpoints require authentication"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/campaigns",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, "Campaigns should require authentication"


class TestPhase4OutreachAutomation(TestSetup):
    """Phase 4: Outreach Automation Tests"""
    
    test_template_id = None
    test_outreach_id = None
    
    def test_get_templates_list(self, auth_headers):
        """Test GET /api/marketing/v2/outreach/templates list"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/outreach/templates",
            headers=auth_headers
        )
        
        print(f"Get Templates Response: {response.status_code}")
        assert response.status_code == 200, f"Get templates failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} templates")
    
    def test_create_template(self, auth_headers):
        """Test POST /api/marketing/v2/outreach/templates create"""
        template_data = {
            "name": f"TEST_PHASE4_Template_{datetime.now().strftime('%H%M%S')}",
            "template_type": "initial_pitch",
            "subject": "Exclusive Story Opportunity - {{name}}",
            "body": "Dear {{name}},\n\nI hope this email finds you well. I wanted to reach out about an exclusive story opportunity...\n\nBest regards",
            "delay_days": 0,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/outreach/templates",
            json=template_data,
            headers=auth_headers
        )
        
        print(f"Create Template Response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"Create template failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have template id"
        assert data["name"] == template_data["name"], "Template name should match"
        assert data["template_type"] == "initial_pitch", "Template type should match"
        
        TestPhase4OutreachAutomation.test_template_id = data["id"]
        print(f"Created template: {data['id']}")
    
    def test_schedule_outreach(self, auth_headers):
        """Test POST /api/marketing/v2/outreach/schedule"""
        template_id = TestPhase4OutreachAutomation.test_template_id
        
        # Get template if not created
        if not template_id:
            templates_response = requests.get(
                f"{BASE_URL}/api/marketing/v2/outreach/templates",
                headers=auth_headers
            )
            if templates_response.status_code == 200 and templates_response.json():
                template_id = templates_response.json()[0]["id"]
            else:
                pytest.skip("No templates available for scheduling")
        
        # Get a contact to schedule outreach for
        contacts_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"contact_type": "journalist", "limit": 1},
            headers=auth_headers
        )
        
        if contacts_response.status_code != 200 or not contacts_response.json():
            pytest.skip("No contacts available for scheduling")
        
        contact = contacts_response.json()[0]
        
        schedule_data = {
            "contact_id": contact["id"],
            "template_id": template_id,
            "scheduled_at": (datetime.now() + timedelta(days=1)).isoformat(),
            "channel": "email"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/outreach/schedule",
            json=schedule_data,
            headers=auth_headers
        )
        
        print(f"Schedule Outreach Response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"Schedule outreach failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have outreach id"
        assert data["status"] == "scheduled", "New outreach should have scheduled status"
        
        TestPhase4OutreachAutomation.test_outreach_id = data["id"]
        print(f"Scheduled outreach: {data['id']}")
    
    def test_get_outreach_stats(self, auth_headers):
        """Test GET /api/marketing/v2/outreach/stats"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/outreach/stats",
            headers=auth_headers
        )
        
        print(f"Get Outreach Stats Response: {response.status_code} - {response.text[:500]}")
        assert response.status_code == 200, f"Get outreach stats failed: {response.text}"
        
        data = response.json()
        assert "outreach" in data, "Response should have outreach stats"
        assert "pitches" in data, "Response should have pitches stats"
        
        # Verify outreach stats structure
        outreach = data["outreach"]
        assert "scheduled" in outreach, "Outreach stats should have scheduled count"
        assert "sent" in outreach, "Outreach stats should have sent count"
    
    def test_send_scheduled_outreach_manual(self, auth_headers):
        """Test PUT /api/marketing/v2/outreach/scheduled/{id}/send (manual mode)"""
        outreach_id = TestPhase4OutreachAutomation.test_outreach_id
        
        if not outreach_id:
            # Get any scheduled outreach
            scheduled_response = requests.get(
                f"{BASE_URL}/api/marketing/v2/outreach/scheduled",
                params={"status": "scheduled", "limit": 1},
                headers=auth_headers
            )
            if scheduled_response.status_code == 200 and scheduled_response.json():
                outreach_id = scheduled_response.json()[0]["id"]
            else:
                pytest.skip("No scheduled outreach available for send test")
        
        response = requests.put(
            f"{BASE_URL}/api/marketing/v2/outreach/scheduled/{outreach_id}/send",
            params={"use_microsoft_graph": False},
            headers=auth_headers
        )
        
        print(f"Send Outreach Response: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Send outreach failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert data.get("status") == "sent" or "sent" in data.get("message", "").lower(), "Outreach should be marked as sent"
    
    def test_get_scheduled_outreach_list(self, auth_headers):
        """Test GET /api/marketing/v2/outreach/scheduled list"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/outreach/scheduled",
            headers=auth_headers
        )
        
        print(f"Get Scheduled Outreach Response: {response.status_code}")
        assert response.status_code == 200, f"Get scheduled outreach failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_outreach_requires_auth(self):
        """Test that outreach endpoints require authentication"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/outreach/templates",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, "Outreach templates should require authentication"
        
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/outreach/stats",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, "Outreach stats should require authentication"


class TestCleanup(TestSetup):
    """Cleanup test data"""
    
    def test_cleanup_test_campaigns(self, auth_headers):
        """Delete test campaigns created during testing"""
        campaign_id = TestPhase3PRCampaigns.test_campaign_id
        if campaign_id:
            # Note: No DELETE endpoint for campaigns in Phase 3
            print(f"Test campaign {campaign_id} created - no delete endpoint available")
    
    def test_cleanup_test_templates(self, auth_headers):
        """Delete test templates created during testing"""
        template_id = TestPhase4OutreachAutomation.test_template_id
        if template_id:
            response = requests.delete(
                f"{BASE_URL}/api/marketing/v2/outreach/templates/{template_id}",
                headers=auth_headers
            )
            print(f"Delete template {template_id}: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
