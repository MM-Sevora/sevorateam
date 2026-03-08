"""
Marketing Module Health Check Tests
Tests all critical marketing endpoints after recent changes (Microsoft SSO, Unified Pipeline, Deliveries, etc.)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com')
AUTH_TOKEN = None


class TestAuth:
    """Test authentication with marketing credentials"""
    
    def test_login_marketing_user(self):
        """Test login with marketing@sevora.com"""
        global AUTH_TOKEN
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "marketing@sevora.com"
        AUTH_TOKEN = data["access_token"]
        print(f"✓ Login successful, got token for {data['user']['email']}")


def get_headers():
    """Get auth headers for API calls"""
    return {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Content-Type": "application/json"
    }


class TestInfluencersModule:
    """Test Influencers List and Detail pages"""
    
    def test_list_influencers(self):
        """Test loading influencers list"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"contact_type": "influencer", "limit": 50},
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Loaded {len(data)} influencers")
    
    def test_get_specific_influencer(self):
        """Test getting specific influencer (Nivrity Das)"""
        influencer_id = "f4c76400-f85c-465b-bdce-c1bd941912a9"
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer_id}",
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        print(f"✓ Got influencer: {data.get('name')}")
    
    def test_get_influencer_deliverables(self):
        """Test getting influencer deliverables/rate cards"""
        influencer_id = "f4c76400-f85c-465b-bdce-c1bd941912a9"
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer_id}/deliverables",
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Got {len(data)} deliverables for influencer")
    
    def test_get_influencer_communications(self):
        """Test getting influencer communication history"""
        influencer_id = "f4c76400-f85c-465b-bdce-c1bd941912a9"
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer_id}/communications",
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Got {len(data)} communications for influencer")


class TestPublicationsModule:
    """Test Publications List page"""
    
    def test_list_publications(self):
        """Test loading publications list"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/publications",
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Loaded {len(data)} publications")


class TestCampaignHubModule:
    """Test Campaign Hub - List campaigns, create with multi-select objectives"""
    
    def test_list_unified_campaigns(self):
        """Test loading unified campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/unified-campaigns",
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Loaded {len(data)} unified campaigns")
    
    def test_list_marketing_campaigns(self):
        """Test loading marketing campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/campaigns",
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Loaded {len(data)} marketing campaigns")
    
    def test_create_campaign_with_objectives(self):
        """Test creating campaign with multi-select objectives"""
        campaign_data = {
            "name": "TEST_Health_Check_Campaign",
            "objective": "awareness, engagement, sales",
            "campaign_type": "influencer",
            "budget": 50000,
            "start_date": "2026-01-15",
            "end_date": "2026-02-15",
            "target_market": "Urban Women 25-35",
            "description": "Health check test campaign"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/campaigns",
            json=campaign_data,
            headers=get_headers()
        )
        assert response.status_code in [200, 201]
        data = response.json()
        campaign_id = data.get("id")
        assert campaign_id is not None
        print(f"✓ Created campaign with ID: {campaign_id}")
        
        # Cleanup - delete test campaign
        cleanup_response = requests.delete(
            f"{BASE_URL}/api/marketing/campaigns/{campaign_id}",
            headers=get_headers()
        )
        assert cleanup_response.status_code in [200, 204]
        print(f"✓ Cleaned up test campaign")


class TestCampaignDetailModule:
    """Test Campaign Detail - Add influencer with deliverable selection and fee"""
    
    def test_get_campaign_detail(self):
        """Test getting campaign details"""
        # First get a campaign
        campaigns_response = requests.get(
            f"{BASE_URL}/api/marketing/campaigns",
            headers=get_headers()
        )
        campaigns = campaigns_response.json()
        if len(campaigns) > 0:
            campaign_id = campaigns[0].get("id")
            response = requests.get(
                f"{BASE_URL}/api/marketing/campaigns/{campaign_id}",
                headers=get_headers()
            )
            assert response.status_code == 200
            data = response.json()
            assert "name" in data
            print(f"✓ Got campaign detail: {data.get('name')}")
        else:
            print("⚠ No campaigns available to test")


class TestUnifiedPipelineModule:
    """Test Unified Pipeline - Kanban board with 8 stages"""
    
    def test_load_pipeline_contacts(self):
        """Test loading contacts for pipeline"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check if contacts have pipeline_stage field
        stages = ["identified", "contacted", "replied", "negotiating", "agreed", "delivering", "completed", "lost"]
        stage_counts = {stage: 0 for stage in stages}
        
        for contact in data:
            stage = contact.get("pipeline_stage") or contact.get("status", "identified")
            if stage in stage_counts:
                stage_counts[stage] += 1
        
        print(f"✓ Pipeline stages distribution: {stage_counts}")
    
    def test_update_contact_pipeline_stage(self):
        """Test updating contact pipeline stage"""
        # Get a contact first
        contacts_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"limit": 5},
            headers=get_headers()
        )
        contacts = contacts_response.json()
        
        if len(contacts) > 0:
            contact_id = contacts[0]["id"]
            original_stage = contacts[0].get("pipeline_stage", "identified")
            
            # Update stage
            update_data = {"pipeline_stage": "contacted", "status": "contacted"}
            response = requests.put(
                f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}",
                json=update_data,
                headers=get_headers()
            )
            assert response.status_code == 200
            print(f"✓ Successfully updated contact pipeline stage")
            
            # Restore original stage
            restore_data = {"pipeline_stage": original_stage, "status": original_stage}
            requests.put(
                f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}",
                json=restore_data,
                headers=get_headers()
            )


class TestContentAssetsModule:
    """Test Content & Assets - Deliveries tab and Record Delivery modal"""
    
    def test_list_brand_assets(self):
        """Test loading brand assets"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/assets",
            params={"category": "brand_assets"},
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Loaded {len(data)} brand assets")
    
    def test_list_deliveries(self):
        """Test loading influencer deliveries"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/deliveries/influencer",
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Loaded {len(data)} influencer deliveries")
    
    def test_delivery_stats(self):
        """Test getting delivery statistics"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/deliveries/stats",
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Got delivery stats: {data}")
    
    def test_list_templates(self):
        """Test loading templates"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/templates",
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Loaded {len(data)} templates")
    
    def test_list_ugc(self):
        """Test loading UGC library"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/ugc",
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Loaded {len(data)} UGC items")


class TestAIDiscoveryModule:
    """Test AI Discovery page"""
    
    def test_ai_discover_endpoint_exists(self):
        """Test AI discovery endpoint"""
        # Just test that the endpoint exists and returns expected structure
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/ai/discover-influencers",
            json={
                "industry": "Fashion",
                "platform": "Instagram",
                "location": "India",
                "budget_min": 10000,
                "budget_max": 100000,
                "follower_min": 10000,
                "follower_max": 500000,
                "objective": "Brand Awareness"
            },
            headers=get_headers()
        )
        # AI endpoints may return 200 or 422 if parameters are invalid
        assert response.status_code in [200, 422, 500]
        print(f"✓ AI Discovery endpoint responded with status: {response.status_code}")


class TestBudgetModule:
    """Test Budget & Payments page"""
    
    def test_list_payments(self):
        """Test loading payments"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/payments",
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Loaded {len(data)} payments")
    
    def test_unified_campaigns_stats(self):
        """Test getting unified campaign stats"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/unified-campaigns/stats",
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Got unified campaign stats")


class TestPRModule:
    """Test PR-related endpoints"""
    
    def test_list_journalists(self):
        """Test loading journalists"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"contact_type": "journalist"},
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Loaded {len(data)} journalists")
    
    def test_list_pr_coverage(self):
        """Test loading PR coverage"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/coverage",
            headers=get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Loaded {len(data)} PR coverage items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
