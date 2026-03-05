"""
Test suite for Audience Demographics, Manager Contact, and Commercial Terms features.
Tests the new fields added to influencer management:
- Audience Demographics: age_split, gender_split, city_split with percentage ratios
- Manager Contact: manager_name, manager_email, manager_phone
- Commercial Terms: exclusivity_terms, typical_turnaround_days, payment_terms
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    unique_email = f"test_aud_{uuid.uuid4().hex[:8]}@test.com"
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": unique_email,
        "password": "test123",
        "name": "Test Audience User"
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    
    # Try login if already registered
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": unique_email,
        "password": "test123"
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture
def api_client(auth_token):
    """Get authenticated API client"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestAudienceDemographics:
    """Test audience demographics fields: age_split, gender_split, city_split"""
    
    def test_create_influencer_with_audience_demographics(self, api_client):
        """Test creating an influencer with full audience demographics"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_AudDemo_{unique_id}",
            "city": "Mumbai",
            "industry": "fashion",
            "tier": "micro",
            "instagram_handle": f"@test_demo_{unique_id}",
            "followers": 50000,
            "engagement_rate": 4.5,
            "audience_demographics": {
                "age_split": [
                    {"group": "18-24", "percentage": 40},
                    {"group": "25-34", "percentage": 35},
                    {"group": "35-44", "percentage": 15},
                    {"group": "45-54", "percentage": 10}
                ],
                "gender_split": [
                    {"gender": "Female", "percentage": 70},
                    {"gender": "Male", "percentage": 25},
                    {"gender": "Other", "percentage": 5}
                ],
                "city_split": [
                    {"city": "Mumbai", "percentage": 30},
                    {"city": "Delhi", "percentage": 25},
                    {"city": "Bangalore", "percentage": 20},
                    {"city": "Kolkata", "percentage": 15},
                    {"city": "International", "percentage": 10}
                ]
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/influencers", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["audience_demographics"] is not None
        
        # Verify age_split
        assert "age_split" in data["audience_demographics"]
        assert len(data["audience_demographics"]["age_split"]) == 4
        age_groups = [item["group"] for item in data["audience_demographics"]["age_split"]]
        assert "18-24" in age_groups
        
        # Verify gender_split
        assert "gender_split" in data["audience_demographics"]
        assert len(data["audience_demographics"]["gender_split"]) == 3
        total_gender = sum(item["percentage"] for item in data["audience_demographics"]["gender_split"])
        assert total_gender == 100
        
        # Verify city_split
        assert "city_split" in data["audience_demographics"]
        assert len(data["audience_demographics"]["city_split"]) == 5
        
        # Cleanup - store influencer_id for later
        self.created_influencer_id = data["id"]
        
        return data["id"]
    
    def test_get_influencer_returns_demographics(self, api_client):
        """Test that GET influencer returns audience demographics"""
        # First create an influencer with demographics
        unique_id = uuid.uuid4().hex[:8]
        create_payload = {
            "name": f"TEST_GetDemo_{unique_id}",
            "city": "Delhi",
            "audience_demographics": {
                "age_split": [{"group": "25-34", "percentage": 60}],
                "gender_split": [{"gender": "Male", "percentage": 55}],
                "city_split": [{"city": "Delhi", "percentage": 40}]
            }
        }
        
        create_response = api_client.post(f"{BASE_URL}/api/influencers", json=create_payload)
        influencer_id = create_response.json()["id"]
        
        # GET the influencer and verify demographics are returned
        get_response = api_client.get(f"{BASE_URL}/api/influencers/{influencer_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["audience_demographics"] is not None
        assert data["audience_demographics"]["age_split"][0]["group"] == "25-34"
        assert data["audience_demographics"]["age_split"][0]["percentage"] == 60
    
    def test_create_influencer_without_demographics(self, api_client):
        """Test creating influencer without demographics - should allow null"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_NoDemos_{unique_id}",
            "city": "Chennai",
            "industry": "tech"
        }
        
        response = api_client.post(f"{BASE_URL}/api/influencers", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["audience_demographics"] is None or data["audience_demographics"] == {}


class TestManagerContact:
    """Test manager/agent contact fields"""
    
    def test_create_influencer_with_manager_contact(self, api_client):
        """Test creating an influencer with manager contact details"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_Manager_{unique_id}",
            "city": "Mumbai",
            "manager_name": "Jane Agent",
            "manager_email": "jane.agent@talent.com",
            "manager_phone": "+91 99887 76655"
        }
        
        response = api_client.post(f"{BASE_URL}/api/influencers", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["manager_name"] == "Jane Agent"
        assert data["manager_email"] == "jane.agent@talent.com"
        assert data["manager_phone"] == "+91 99887 76655"
    
    def test_update_manager_contact(self, api_client):
        """Test updating manager contact fields"""
        # Create influencer first
        unique_id = uuid.uuid4().hex[:8]
        create_payload = {
            "name": f"TEST_UpdateMgr_{unique_id}",
            "city": "Bangalore"
        }
        create_response = api_client.post(f"{BASE_URL}/api/influencers", json=create_payload)
        influencer_id = create_response.json()["id"]
        
        # Update with manager contact
        update_payload = {
            "manager_name": "New Manager",
            "manager_email": "new.manager@agency.com",
            "manager_phone": "+91 11223 34455"
        }
        
        update_response = api_client.put(
            f"{BASE_URL}/api/influencers/{influencer_id}",
            json=update_payload
        )
        assert update_response.status_code == 200
        
        # Verify update persisted
        get_response = api_client.get(f"{BASE_URL}/api/influencers/{influencer_id}")
        data = get_response.json()
        assert data["manager_name"] == "New Manager"
        assert data["manager_email"] == "new.manager@agency.com"


class TestCommercialTerms:
    """Test commercial terms fields"""
    
    def test_create_influencer_with_commercial_terms(self, api_client):
        """Test creating influencer with commercial terms"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_Commercial_{unique_id}",
            "city": "Hyderabad",
            "exclusivity_terms": "No competing fashion brands for 45 days",
            "typical_turnaround_days": 14,
            "payment_terms": "advance"
        }
        
        response = api_client.post(f"{BASE_URL}/api/influencers", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["exclusivity_terms"] == "No competing fashion brands for 45 days"
        assert data["typical_turnaround_days"] == 14
        assert data["payment_terms"] == "advance"
    
    def test_payment_terms_options(self, api_client):
        """Test different payment terms options"""
        payment_options = ["advance", "50-50", "post-delivery", "milestone"]
        
        for payment_term in payment_options:
            unique_id = uuid.uuid4().hex[:8]
            payload = {
                "name": f"TEST_Pay_{payment_term}_{unique_id}",
                "city": "Pune",
                "payment_terms": payment_term
            }
            
            response = api_client.post(f"{BASE_URL}/api/influencers", json=payload)
            assert response.status_code == 200, f"Failed for payment_terms={payment_term}"
            
            data = response.json()
            assert data["payment_terms"] == payment_term
    
    def test_update_commercial_terms(self, api_client):
        """Test updating commercial terms"""
        # Create influencer
        unique_id = uuid.uuid4().hex[:8]
        create_payload = {
            "name": f"TEST_UpdateComm_{unique_id}",
            "city": "Jaipur"
        }
        create_response = api_client.post(f"{BASE_URL}/api/influencers", json=create_payload)
        influencer_id = create_response.json()["id"]
        
        # Update commercial terms
        update_payload = {
            "exclusivity_terms": "Updated exclusivity clause",
            "typical_turnaround_days": 7,
            "payment_terms": "50-50"
        }
        
        update_response = api_client.put(
            f"{BASE_URL}/api/influencers/{influencer_id}",
            json=update_payload
        )
        assert update_response.status_code == 200
        
        # Verify update persisted
        get_response = api_client.get(f"{BASE_URL}/api/influencers/{influencer_id}")
        data = get_response.json()
        assert data["exclusivity_terms"] == "Updated exclusivity clause"
        assert data["typical_turnaround_days"] == 7
        assert data["payment_terms"] == "50-50"


class TestCombinedNewFields:
    """Test all new fields together"""
    
    def test_create_influencer_with_all_new_fields(self, api_client):
        """Test creating influencer with all new fields (audience, manager, commercial)"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_AllNew_{unique_id}",
            "city": "Mumbai",
            "industry": "fashion",
            "tier": "macro",
            "instagram_handle": f"@test_allnew_{unique_id}",
            "followers": 500000,
            "engagement_rate": 3.8,
            # Manager Contact
            "manager_name": "Full Stack Manager",
            "manager_email": "fullstack@manager.com",
            "manager_phone": "+91 12345 67890",
            # Audience Demographics
            "audience_demographics": {
                "age_split": [
                    {"group": "18-24", "percentage": 35},
                    {"group": "25-34", "percentage": 45},
                    {"group": "35-44", "percentage": 20}
                ],
                "gender_split": [
                    {"gender": "Female", "percentage": 65},
                    {"gender": "Male", "percentage": 35}
                ],
                "city_split": [
                    {"city": "Mumbai", "percentage": 25},
                    {"city": "Delhi", "percentage": 20},
                    {"city": "Bangalore", "percentage": 15},
                    {"city": "International", "percentage": 40}
                ]
            },
            # Commercial Terms
            "exclusivity_terms": "Full exclusivity for luxury fashion segment for 60 days",
            "typical_turnaround_days": 10,
            "payment_terms": "50-50",
            # Rate Card
            "rate_per_post": 50000,
            "rate_per_reel": 75000,
            "rate_per_story": 15000
        }
        
        response = api_client.post(f"{BASE_URL}/api/influencers", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify all new fields are present and correct
        # Manager
        assert data["manager_name"] == "Full Stack Manager"
        assert data["manager_email"] == "fullstack@manager.com"
        assert data["manager_phone"] == "+91 12345 67890"
        
        # Audience Demographics
        assert data["audience_demographics"] is not None
        assert len(data["audience_demographics"]["age_split"]) == 3
        assert len(data["audience_demographics"]["gender_split"]) == 2
        assert len(data["audience_demographics"]["city_split"]) == 4
        
        # Commercial Terms
        assert data["exclusivity_terms"] == "Full exclusivity for luxury fashion segment for 60 days"
        assert data["typical_turnaround_days"] == 10
        assert data["payment_terms"] == "50-50"
        
        # Rate Card
        assert data["rate_per_post"] == 50000
        assert data["rate_per_reel"] == 75000
        assert data["rate_per_story"] == 15000
        
        print(f"Successfully created influencer with all new fields: {data['id']}")


class TestDataValidation:
    """Test data validation for new fields"""
    
    def test_percentage_values_in_demographics(self, api_client):
        """Test that percentage values are stored correctly"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST_Percent_{unique_id}",
            "city": "Mumbai",
            "audience_demographics": {
                "age_split": [
                    {"group": "18-24", "percentage": 100}  # Edge case: 100%
                ],
                "gender_split": [
                    {"gender": "Female", "percentage": 0},  # Edge case: 0%
                    {"gender": "Male", "percentage": 100}
                ],
                "city_split": [
                    {"city": "Mumbai", "percentage": 50},
                    {"city": "Delhi", "percentage": 50}
                ]
            }
        }
        
        response = api_client.post(f"{BASE_URL}/api/influencers", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["audience_demographics"]["age_split"][0]["percentage"] == 100
        assert data["audience_demographics"]["gender_split"][0]["percentage"] == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
