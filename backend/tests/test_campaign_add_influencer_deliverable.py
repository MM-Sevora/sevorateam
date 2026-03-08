"""
Test: Campaign - Add Influencer with Deliverable and Fee
Tests the bug fix: When adding an influencer to a campaign, the delivery (rate card) and fee should be captured and stored.

Features tested:
1. GET /api/marketing/v2/contacts/{id}/deliverables - Fetch rate cards for a contact
2. POST /api/marketing/campaigns/{campaign_id}/influencers/{contact_id} - Add influencer with deliverable and fee
3. GET /api/marketing/campaigns/{campaign_id} - Verify assigned influencer shows deliverable info
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_CAMPAIGN_ID = "c5c6645c-6d42-4234-9a0f-6f46f3020365"
TEST_CONTACT_ID = "f4c76400-f85c-465b-bdce-c1bd941912a9"  # Nivrity Das


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "marketing@sevora.com",
        "password": "admin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Returns headers with authorization"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestContactDeliverables:
    """Test fetching rate cards/deliverables for a contact"""
    
    def test_get_contact_deliverables(self, headers):
        """GET /api/marketing/v2/contacts/{id}/deliverables should return rate cards"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{TEST_CONTACT_ID}/deliverables",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get deliverables: {response.text}"
        
        deliverables = response.json()
        assert isinstance(deliverables, list), "Deliverables should be a list"
        
        # Nivrity Das has multiple rate cards
        assert len(deliverables) >= 1, "Should have at least one deliverable/rate card"
        
        # Verify structure of a deliverable
        if len(deliverables) > 0:
            d = deliverables[0]
            assert "id" in d, "Deliverable should have an id"
            assert "name" in d, "Deliverable should have a name"
            # Rate should be present (either as 'rate' or 'price')
            assert "rate" in d or "price" in d, "Deliverable should have a rate/price"
        
        print(f"✓ Found {len(deliverables)} deliverables/rate cards")
        for d in deliverables:
            rate = d.get('rate') or d.get('price', 0)
            print(f"  - {d.get('name')}: ₹{rate}")


class TestAddInfluencerWithDeliverable:
    """Test adding an influencer to a campaign with deliverable and fee"""
    
    def test_remove_influencer_first(self, headers):
        """Remove influencer from campaign for clean test"""
        response = requests.delete(
            f"{BASE_URL}/api/marketing/campaigns/{TEST_CAMPAIGN_ID}/influencers/{TEST_CONTACT_ID}",
            headers=headers
        )
        # This may return 404 if already removed, which is fine
        assert response.status_code in [200, 404], f"Unexpected error: {response.text}"
        print("✓ Ensured influencer is not assigned to campaign")
    
    def test_add_influencer_with_deliverable_and_fee(self, headers):
        """POST should accept deliverable_id, deliverable_name, and agreed_fee"""
        payload = {
            "deliverable_id": "rc1",
            "deliverable_name": "Static Post",
            "agreed_fee": 22000
        }
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/campaigns/{TEST_CAMPAIGN_ID}/influencers/{TEST_CONTACT_ID}",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200, f"Failed to add influencer: {response.text}"
        
        result = response.json()
        assert result.get("message") == "Influencer added to campaign"
        assert result.get("deliverable_name") == "Static Post"
        assert result.get("agreed_fee") == 22000
        
        print("✓ Added influencer with deliverable and fee")
        print(f"  - Deliverable: {result.get('deliverable_name')}")
        print(f"  - Fee: ₹{result.get('agreed_fee')}")
    
    def test_verify_contact_updated_with_campaign_info(self, headers):
        """Contact should have campaign_deliverable_* fields set"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{TEST_CONTACT_ID}",
            headers=headers
        )
        
        assert response.status_code == 200
        
        contact = response.json()
        assert contact.get("campaign_id") == TEST_CAMPAIGN_ID, "campaign_id should be set"
        assert contact.get("campaign_deliverable_id") == "rc1", "campaign_deliverable_id should be set"
        assert contact.get("campaign_deliverable_name") == "Static Post", "campaign_deliverable_name should be set"
        assert contact.get("campaign_agreed_fee") == 22000, "campaign_agreed_fee should be set"
        
        print("✓ Contact updated with campaign deliverable info")
        print(f"  - campaign_deliverable_id: {contact.get('campaign_deliverable_id')}")
        print(f"  - campaign_deliverable_name: {contact.get('campaign_deliverable_name')}")
        print(f"  - campaign_agreed_fee: {contact.get('campaign_agreed_fee')}")
    
    def test_campaign_detail_shows_deliverable_info(self, headers):
        """Campaign detail should include deliverable info for assigned influencers"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/campaigns/{TEST_CAMPAIGN_ID}",
            headers=headers
        )
        
        assert response.status_code == 200
        
        campaign = response.json()
        assigned_influencers = campaign.get("assigned_influencers", [])
        
        assert len(assigned_influencers) > 0, "Should have assigned influencers"
        
        # Find Nivrity Das
        nivrity = next((i for i in assigned_influencers if i.get("id") == TEST_CONTACT_ID), None)
        assert nivrity is not None, "Nivrity Das should be in assigned influencers"
        
        # Verify deliverable info is included
        assert "campaign_deliverable_name" in nivrity, "Should include campaign_deliverable_name"
        assert "campaign_agreed_fee" in nivrity, "Should include campaign_agreed_fee"
        assert nivrity.get("campaign_deliverable_name") == "Static Post"
        assert nivrity.get("campaign_agreed_fee") == 22000
        
        print("✓ Campaign detail includes deliverable info for influencer")
        print(f"  - Name: {nivrity.get('name')}")
        print(f"  - Deliverable: {nivrity.get('campaign_deliverable_name')}")
        print(f"  - Fee: ₹{nivrity.get('campaign_agreed_fee')}")


class TestUpdateExistingInfluencer:
    """Test updating an already assigned influencer's deliverable/fee"""
    
    def test_update_deliverable_and_fee(self, headers):
        """Re-adding should update the deliverable and fee"""
        payload = {
            "deliverable_id": "rc2",
            "deliverable_name": "Reel / Short",
            "agreed_fee": 45000
        }
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/campaigns/{TEST_CAMPAIGN_ID}/influencers/{TEST_CONTACT_ID}",
            headers=headers,
            json=payload
        )
        
        assert response.status_code == 200
        
        # Verify updated values
        contact_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{TEST_CONTACT_ID}",
            headers=headers
        )
        
        contact = contact_response.json()
        assert contact.get("campaign_deliverable_id") == "rc2"
        assert contact.get("campaign_deliverable_name") == "Reel / Short"
        assert contact.get("campaign_agreed_fee") == 45000
        
        print("✓ Updated influencer deliverable and fee")
        print(f"  - New deliverable: {contact.get('campaign_deliverable_name')}")
        print(f"  - New fee: ₹{contact.get('campaign_agreed_fee')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
