"""
Test Platform-Specific Audience Demographics Feature
Tests the new audience_demographics structure: {instagram: {age_split, gender_split, city_split}, youtube: {age_split, gender_split, city_split}}
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPlatformSpecificAudienceDemographics:
    """Tests for platform-specific audience demographics"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test credentials and get auth token"""
        self.email = f"test_platform_{uuid.uuid4().hex[:8]}@test.com"
        self.password = "test123"
        self.test_influencer_ids = []
        
        # Register/login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_demo@test.com",
            "password": "test123"
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
        else:
            # Register new user if test_demo doesn't exist
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": self.email,
                "password": self.password,
                "name": "Test Platform User"
            })
            assert response.status_code == 200, f"Registration failed: {response.text}"
            self.token = response.json()["access_token"]
        
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        yield
        
        # Cleanup - delete test influencers
        for inf_id in self.test_influencer_ids:
            try:
                requests.delete(f"{BASE_URL}/api/influencers/{inf_id}", headers=self.headers)
            except:
                pass
    
    def test_create_influencer_with_instagram_audience_only(self):
        """Test creating influencer with Instagram-only audience demographics"""
        payload = {
            "name": "TEST_Instagram_Only_Audience",
            "city": "Mumbai",
            "industry": "fashion",
            "tier": "micro",
            "instagram_handle": "@test_ig_only",
            "primary_platform": "instagram",
            "audience_demographics": {
                "instagram": {
                    "age_split": [
                        {"group": "18-24", "percentage": 40},
                        {"group": "25-34", "percentage": 35}
                    ],
                    "gender_split": [
                        {"gender": "Female", "percentage": 70},
                        {"gender": "Male", "percentage": 30}
                    ],
                    "city_split": [
                        {"city": "Mumbai", "percentage": 30},
                        {"city": "Delhi", "percentage": 25}
                    ]
                },
                "youtube": None
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/influencers", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        self.test_influencer_ids.append(data["id"])
        
        # Verify audience demographics structure
        assert "audience_demographics" in data
        assert data["audience_demographics"] is not None
        assert "instagram" in data["audience_demographics"]
        assert data["audience_demographics"]["instagram"] is not None
        
        # Verify Instagram splits
        ig = data["audience_demographics"]["instagram"]
        assert len(ig["age_split"]) == 2
        assert ig["age_split"][0]["group"] == "18-24"
        assert ig["age_split"][0]["percentage"] == 40
        
        assert len(ig["gender_split"]) == 2
        assert ig["gender_split"][0]["gender"] == "Female"
        assert ig["gender_split"][0]["percentage"] == 70
        
        assert len(ig["city_split"]) == 2
        assert ig["city_split"][0]["city"] == "Mumbai"
        
        # YouTube should be None
        assert data["audience_demographics"]["youtube"] is None
        
        print(f"✓ Instagram-only audience demographics created successfully")
    
    def test_create_influencer_with_youtube_audience_only(self):
        """Test creating influencer with YouTube-only audience demographics"""
        payload = {
            "name": "TEST_YouTube_Only_Audience",
            "city": "Bangalore",
            "industry": "tech",
            "tier": "mid",
            "youtube_handle": "@test_yt_only",
            "primary_platform": "youtube",
            "audience_demographics": {
                "instagram": None,
                "youtube": {
                    "age_split": [
                        {"group": "25-34", "percentage": 45},
                        {"group": "35-44", "percentage": 30}
                    ],
                    "gender_split": [
                        {"gender": "Male", "percentage": 65},
                        {"gender": "Female", "percentage": 35}
                    ],
                    "city_split": [
                        {"city": "Bangalore", "percentage": 20},
                        {"city": "Hyderabad", "percentage": 15},
                        {"city": "International", "percentage": 25}
                    ]
                }
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/influencers", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        self.test_influencer_ids.append(data["id"])
        
        # Verify YouTube splits
        assert data["audience_demographics"]["instagram"] is None
        yt = data["audience_demographics"]["youtube"]
        assert yt is not None
        assert len(yt["age_split"]) == 2
        assert yt["age_split"][0]["group"] == "25-34"
        assert len(yt["gender_split"]) == 2
        assert len(yt["city_split"]) == 3
        
        print(f"✓ YouTube-only audience demographics created successfully")
    
    def test_create_influencer_with_both_platform_audiences(self):
        """Test creating influencer with both Instagram AND YouTube audience demographics"""
        payload = {
            "name": "TEST_Both_Platforms_Audience",
            "city": "Delhi",
            "industry": "lifestyle",
            "tier": "macro",
            "instagram_handle": "@test_both",
            "youtube_handle": "@test_both_yt",
            "primary_platform": "instagram",
            "audience_demographics": {
                "instagram": {
                    "age_split": [
                        {"group": "18-24", "percentage": 50},
                        {"group": "25-34", "percentage": 30},
                        {"group": "35-44", "percentage": 20}
                    ],
                    "gender_split": [
                        {"gender": "Female", "percentage": 80},
                        {"gender": "Male", "percentage": 20}
                    ],
                    "city_split": [
                        {"city": "Mumbai", "percentage": 25},
                        {"city": "Delhi", "percentage": 20}
                    ]
                },
                "youtube": {
                    "age_split": [
                        {"group": "18-24", "percentage": 35},
                        {"group": "25-34", "percentage": 40},
                        {"group": "35-44", "percentage": 25}
                    ],
                    "gender_split": [
                        {"gender": "Female", "percentage": 60},
                        {"gender": "Male", "percentage": 40}
                    ],
                    "city_split": [
                        {"city": "Delhi", "percentage": 30},
                        {"city": "Bangalore", "percentage": 25},
                        {"city": "International", "percentage": 20}
                    ]
                }
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/influencers", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        self.test_influencer_ids.append(data["id"])
        
        # Verify both platforms have data
        assert data["audience_demographics"]["instagram"] is not None
        assert data["audience_demographics"]["youtube"] is not None
        
        # Verify Instagram data
        ig = data["audience_demographics"]["instagram"]
        assert len(ig["age_split"]) == 3
        assert ig["gender_split"][0]["gender"] == "Female"
        assert ig["gender_split"][0]["percentage"] == 80
        
        # Verify YouTube data
        yt = data["audience_demographics"]["youtube"]
        assert len(yt["age_split"]) == 3
        assert yt["gender_split"][0]["gender"] == "Female"
        assert yt["gender_split"][0]["percentage"] == 60
        
        # Verify platforms have different values (they should differ)
        assert ig["gender_split"][0]["percentage"] != yt["gender_split"][0]["percentage"]
        
        print(f"✓ Both platform audience demographics created successfully with different values")
    
    def test_get_influencer_returns_platform_specific_demographics(self):
        """Test GET influencer returns platform-specific demographics correctly"""
        # Create influencer first
        payload = {
            "name": "TEST_Get_Platform_Demographics",
            "city": "Chennai",
            "industry": "beauty",
            "instagram_handle": "@test_get_demo",
            "youtube_handle": "@test_get_demo_yt",
            "audience_demographics": {
                "instagram": {
                    "age_split": [{"group": "25-34", "percentage": 55}],
                    "gender_split": [{"gender": "Female", "percentage": 90}],
                    "city_split": [{"city": "Chennai", "percentage": 35}]
                },
                "youtube": {
                    "age_split": [{"group": "18-24", "percentage": 60}],
                    "gender_split": [{"gender": "Male", "percentage": 55}],
                    "city_split": [{"city": "Mumbai", "percentage": 40}]
                }
            }
        }
        
        create_response = requests.post(f"{BASE_URL}/api/influencers", json=payload, headers=self.headers)
        assert create_response.status_code == 200
        influencer_id = create_response.json()["id"]
        self.test_influencer_ids.append(influencer_id)
        
        # GET the influencer
        get_response = requests.get(f"{BASE_URL}/api/influencers/{influencer_id}", headers=self.headers)
        assert get_response.status_code == 200
        
        data = get_response.json()
        
        # Verify structure persisted correctly
        assert data["audience_demographics"] is not None
        assert data["audience_demographics"]["instagram"]["age_split"][0]["percentage"] == 55
        assert data["audience_demographics"]["youtube"]["age_split"][0]["percentage"] == 60
        
        print(f"✓ GET returns platform-specific demographics correctly")
    
    def test_update_influencer_audience_demographics(self):
        """Test updating audience demographics preserves platform structure"""
        # Create influencer
        create_payload = {
            "name": "TEST_Update_Demographics",
            "city": "Pune",
            "industry": "fitness",
            "audience_demographics": {
                "instagram": {
                    "age_split": [{"group": "18-24", "percentage": 50}],
                    "gender_split": None,
                    "city_split": None
                },
                "youtube": None
            }
        }
        
        create_response = requests.post(f"{BASE_URL}/api/influencers", json=create_payload, headers=self.headers)
        assert create_response.status_code == 200
        influencer_id = create_response.json()["id"]
        self.test_influencer_ids.append(influencer_id)
        
        # Update with new YouTube demographics
        update_payload = {
            "audience_demographics": {
                "instagram": {
                    "age_split": [{"group": "18-24", "percentage": 50}],
                    "gender_split": [{"gender": "Male", "percentage": 60}],
                    "city_split": None
                },
                "youtube": {
                    "age_split": [{"group": "25-34", "percentage": 70}],
                    "gender_split": [{"gender": "Male", "percentage": 80}],
                    "city_split": [{"city": "Pune", "percentage": 30}]
                }
            }
        }
        
        update_response = requests.put(f"{BASE_URL}/api/influencers/{influencer_id}", json=update_payload, headers=self.headers)
        assert update_response.status_code == 200
        
        data = update_response.json()
        
        # Verify update worked
        assert data["audience_demographics"]["instagram"]["gender_split"] is not None
        assert data["audience_demographics"]["instagram"]["gender_split"][0]["gender"] == "Male"
        assert data["audience_demographics"]["youtube"] is not None
        assert data["audience_demographics"]["youtube"]["age_split"][0]["percentage"] == 70
        
        print(f"✓ Update demographics preserves platform structure")
    
    def test_legacy_demographics_format_fallback(self):
        """Test that legacy demographics format (without platform split) still works"""
        # Create with old format (no instagram/youtube keys, just direct splits)
        payload = {
            "name": "TEST_Legacy_Demographics",
            "city": "Jaipur",
            "industry": "travel",
            "audience_demographics": {
                "age_split": [{"group": "25-34", "percentage": 40}],
                "gender_split": [{"gender": "Male", "percentage": 50}],
                "city_split": [{"city": "Jaipur", "percentage": 20}]
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/influencers", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        self.test_influencer_ids.append(data["id"])
        
        # Backend should accept this legacy format
        assert data["audience_demographics"] is not None
        # It should either preserve the legacy format or have migrated to new format
        
        print(f"✓ Legacy demographics format accepted")
    
    def test_empty_audience_demographics(self):
        """Test influencer with no audience demographics"""
        payload = {
            "name": "TEST_No_Demographics",
            "city": "Kolkata",
            "industry": "food",
            "audience_demographics": None
        }
        
        response = requests.post(f"{BASE_URL}/api/influencers", json=payload, headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        self.test_influencer_ids.append(data["id"])
        
        # Should be None or empty
        assert data["audience_demographics"] is None or data["audience_demographics"] == {}
        
        print(f"✓ Null audience demographics accepted")
    
    def test_platform_demographics_different_between_platforms(self):
        """Verify that different platforms can have completely different demographics"""
        payload = {
            "name": "TEST_Diverse_Platform_Demographics",
            "city": "Mumbai",
            "industry": "entertainment",
            "instagram_handle": "@diverse_ig",
            "youtube_handle": "@diverse_yt",
            "audience_demographics": {
                "instagram": {
                    "age_split": [
                        {"group": "13-17", "percentage": 30},
                        {"group": "18-24", "percentage": 50},
                        {"group": "25-34", "percentage": 20}
                    ],
                    "gender_split": [
                        {"gender": "Female", "percentage": 85},
                        {"gender": "Male", "percentage": 15}
                    ],
                    "city_split": [
                        {"city": "Mumbai", "percentage": 40},
                        {"city": "Delhi", "percentage": 30}
                    ]
                },
                "youtube": {
                    "age_split": [
                        {"group": "25-34", "percentage": 40},
                        {"group": "35-44", "percentage": 35},
                        {"group": "45-54", "percentage": 25}
                    ],
                    "gender_split": [
                        {"gender": "Male", "percentage": 70},
                        {"gender": "Female", "percentage": 30}
                    ],
                    "city_split": [
                        {"city": "Bangalore", "percentage": 25},
                        {"city": "International", "percentage": 50}
                    ]
                }
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/influencers", json=payload, headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        self.test_influencer_ids.append(data["id"])
        
        ig = data["audience_demographics"]["instagram"]
        yt = data["audience_demographics"]["youtube"]
        
        # Verify different age groups dominate
        assert ig["age_split"][1]["group"] == "18-24"  # Instagram: young
        assert yt["age_split"][0]["group"] == "25-34"  # YouTube: older
        
        # Verify different genders dominate
        assert ig["gender_split"][0]["gender"] == "Female"  # Instagram: Female dominant
        assert yt["gender_split"][0]["gender"] == "Male"  # YouTube: Male dominant
        
        # Verify different city distributions
        assert ig["city_split"][0]["city"] == "Mumbai"
        assert yt["city_split"][1]["city"] == "International"
        
        print(f"✓ Platforms have completely different demographics as expected")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
