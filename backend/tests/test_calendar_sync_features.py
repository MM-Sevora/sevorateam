"""
Calendar Sync Features Test Suite
Tests for:
1. PATCH /api/meetings/{id} - Partial update endpoint for outlook_event_id
2. Meetings API - GET /api/meetings with date range filters
3. Marketing Campaigns API - GET /api/marketing/v2/unified-campaigns
4. Sourcing Follow-ups API (if available)
5. Tasks API - GET /api/tasks/paginated
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"


class TestAuthentication:
    """Test authentication"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Token not in response"
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Test login returns a token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Login successful, got token")


class TestMeetingsPATCH:
    """Tests for PATCH /api/meetings/{id} - partial update for outlook_event_id"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_meeting(self, headers):
        """Create a test meeting for PATCH tests"""
        start_time = (datetime.utcnow() + timedelta(hours=2)).isoformat() + "Z"
        end_time = (datetime.utcnow() + timedelta(hours=3)).isoformat() + "Z"
        
        payload = {
            "title": "TEST_Calendar_Sync_Meeting",
            "meeting_type": "general",
            "description": "Test meeting for calendar sync testing",
            "start_time": start_time,
            "end_time": end_time,
            "timezone": "UTC",
            "visibility": "public",
            "participants": [],
            "agenda": [],
            "pre_read_documents": [],
            "sync_to_outlook": True,
            "recurrence_type": "none"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", headers=headers, json=payload)
        assert response.status_code == 200, f"Failed to create meeting: {response.text}"
        meeting = response.json()
        yield meeting
        
        # Cleanup - delete the test meeting
        requests.delete(f"{BASE_URL}/api/meetings/{meeting['id']}", headers=headers)
    
    def test_patch_outlook_event_id(self, headers, test_meeting):
        """Test PATCH endpoint can update outlook_event_id"""
        meeting_id = test_meeting["id"]
        test_outlook_id = "AAMkAGIAAABEgAAAA-test-outlook-event-id-12345"
        
        # PATCH the meeting with outlook_event_id
        response = requests.patch(
            f"{BASE_URL}/api/meetings/{meeting_id}",
            headers=headers,
            json={"outlook_event_id": test_outlook_id}
        )
        
        assert response.status_code == 200, f"PATCH failed: {response.text}"
        data = response.json()
        assert "updated_fields" in data
        assert "outlook_event_id" in data["updated_fields"]
        print(f"✓ PATCH /api/meetings/{meeting_id} - outlook_event_id updated")
        
        # Verify the update by GET
        get_response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=headers)
        assert get_response.status_code == 200
        meeting = get_response.json()
        assert meeting.get("outlook_event_id") == test_outlook_id
        print(f"✓ Verified outlook_event_id persisted: {test_outlook_id}")
    
    def test_patch_google_event_id(self, headers, test_meeting):
        """Test PATCH endpoint can update google_event_id"""
        meeting_id = test_meeting["id"]
        test_google_id = "test-google-event-id-12345abcde"
        
        response = requests.patch(
            f"{BASE_URL}/api/meetings/{meeting_id}",
            headers=headers,
            json={"google_event_id": test_google_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "google_event_id" in data.get("updated_fields", [])
        print(f"✓ PATCH with google_event_id successful")
    
    def test_patch_disallowed_fields_ignored(self, headers, test_meeting):
        """Test that disallowed fields are filtered out"""
        meeting_id = test_meeting["id"]
        
        # Try to patch a disallowed field (title)
        response = requests.patch(
            f"{BASE_URL}/api/meetings/{meeting_id}",
            headers=headers,
            json={"title": "Hacked Title", "outlook_event_id": "new-id-123"}
        )
        
        assert response.status_code == 200
        data = response.json()
        # Title should not be in updated_fields
        assert "title" not in data.get("updated_fields", [])
        # outlook_event_id should be updated
        assert "outlook_event_id" in data.get("updated_fields", [])
        print(f"✓ Disallowed fields correctly filtered out")
    
    def test_patch_nonexistent_meeting_returns_404(self, headers):
        """Test PATCH on non-existent meeting returns 404"""
        response = requests.patch(
            f"{BASE_URL}/api/meetings/nonexistent-meeting-id-12345",
            headers=headers,
            json={"outlook_event_id": "test"}
        )
        
        assert response.status_code == 404
        print(f"✓ PATCH on non-existent meeting returns 404")


class TestMeetingsListWithDateRange:
    """Tests for GET /api/meetings with date filters for calendar"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_list_meetings_returns_list(self, headers):
        """Test GET /api/meetings returns a list"""
        response = requests.get(f"{BASE_URL}/api/meetings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/meetings returns list with {len(data)} meetings")
    
    def test_list_meetings_with_date_range(self, headers):
        """Test GET /api/meetings with start_date and end_date filters"""
        start_date = datetime.utcnow().isoformat() + "Z"
        end_date = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"
        
        response = requests.get(
            f"{BASE_URL}/api/meetings",
            headers=headers,
            params={"start_date": start_date, "end_date": end_date}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/meetings with date range returns {len(data)} meetings")
    
    def test_calendar_view_endpoint(self, headers):
        """Test GET /api/meetings/calendar endpoint"""
        start_date = (datetime.utcnow() - timedelta(days=30)).isoformat() + "Z"
        end_date = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"
        
        response = requests.get(
            f"{BASE_URL}/api/meetings/calendar",
            headers=headers,
            params={"start_date": start_date, "end_date": end_date}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Calendar view should return formatted events with specific fields
        if len(data) > 0:
            event = data[0]
            # Calendar events should have start, end, title
            assert "title" in event
            assert "start" in event or "start_time" in event
        print(f"✓ GET /api/meetings/calendar returns {len(data)} calendar events")


class TestMarketingCampaignsAPI:
    """Tests for GET /api/marketing/v2/unified-campaigns for calendar"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_unified_campaigns_returns_list(self, headers):
        """Test GET /api/marketing/v2/unified-campaigns returns data"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/unified-campaigns",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/marketing/v2/unified-campaigns returns {len(data)} campaigns")
        
        # If campaigns exist, verify structure
        if len(data) > 0:
            campaign = data[0]
            # Should have name/title and dates
            assert "name" in campaign or "title" in campaign
            print(f"  - Sample campaign: {campaign.get('name', campaign.get('title', 'N/A'))}")


class TestTasksAPI:
    """Tests for GET /api/tasks/paginated for calendar task deadlines"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_tasks_paginated_returns_data(self, headers):
        """Test GET /api/tasks/paginated returns paginated tasks"""
        response = requests.get(
            f"{BASE_URL}/api/tasks/paginated",
            headers=headers,
            params={"page": 1, "page_size": 50}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have pagination structure - API returns "tasks" key
        assert "tasks" in data or "items" in data or isinstance(data, list)
        
        items = data.get("tasks") or data.get("items") or data
        if isinstance(items, list):
            print(f"✓ GET /api/tasks/paginated returns {len(items)} tasks")
            if len(items) > 0:
                task = items[0]
                assert "title" in task or "name" in task
                print(f"  - Sample task: {task.get('title', task.get('name', 'N/A'))}")
        else:
            print(f"✓ GET /api/tasks/paginated returns data")


class TestSourcingFollowUps:
    """Tests for sourcing follow-ups API (if available)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_sourcing_follow_ups_endpoint(self, headers):
        """Test sourcing follow-ups endpoint for calendar"""
        # Try different possible endpoints
        endpoints = [
            "/api/sourcing/follow-ups",
            "/api/marketing/contacts/follow-ups",
            "/api/marketing/follow-ups"
        ]
        
        success = False
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            if response.status_code == 200:
                data = response.json()
                print(f"✓ {endpoint} returns {len(data) if isinstance(data, list) else 'data'}")
                success = True
                break
            elif response.status_code == 404:
                print(f"  - {endpoint} not found (404)")
            else:
                print(f"  - {endpoint} returned {response.status_code}")
        
        if not success:
            print("⚠ No follow-ups endpoint found - this may be expected if sourcing follow-ups are not implemented")
            pytest.skip("Follow-ups endpoint not found")


class TestMeetingCreationWithSyncFlag:
    """Tests for creating meeting with sync_to_outlook flag"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_create_meeting_with_sync_to_outlook_true(self, headers):
        """Test creating meeting with sync_to_outlook=true"""
        start_time = (datetime.utcnow() + timedelta(hours=4)).isoformat() + "Z"
        end_time = (datetime.utcnow() + timedelta(hours=5)).isoformat() + "Z"
        
        payload = {
            "title": "TEST_Meeting_With_Outlook_Sync",
            "meeting_type": "general",
            "description": "Test meeting with Outlook sync enabled",
            "start_time": start_time,
            "end_time": end_time,
            "timezone": "UTC",
            "visibility": "public",
            "participants": [],
            "agenda": [],
            "pre_read_documents": [],
            "sync_to_outlook": True,
            "recurrence_type": "none"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", headers=headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        meeting = response.json()
        
        assert meeting.get("sync_to_outlook") == True
        assert "id" in meeting
        print(f"✓ Created meeting with sync_to_outlook=True, id: {meeting['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/meetings/{meeting['id']}", headers=headers)
    
    def test_create_meeting_with_sync_to_outlook_false(self, headers):
        """Test creating meeting with sync_to_outlook=false"""
        start_time = (datetime.utcnow() + timedelta(hours=6)).isoformat() + "Z"
        end_time = (datetime.utcnow() + timedelta(hours=7)).isoformat() + "Z"
        
        payload = {
            "title": "TEST_Meeting_No_Outlook_Sync",
            "meeting_type": "general",
            "description": "Test meeting without Outlook sync",
            "start_time": start_time,
            "end_time": end_time,
            "timezone": "UTC",
            "visibility": "public",
            "participants": [],
            "agenda": [],
            "pre_read_documents": [],
            "sync_to_outlook": False,
            "recurrence_type": "none"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", headers=headers, json=payload)
        assert response.status_code == 200
        meeting = response.json()
        
        assert meeting.get("sync_to_outlook") == False
        print(f"✓ Created meeting with sync_to_outlook=False")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/meetings/{meeting['id']}", headers=headers)


class TestUnauthorizedAccess:
    """Test that endpoints require authentication"""
    
    def test_meetings_requires_auth(self):
        """Test /api/meetings requires authentication"""
        response = requests.get(f"{BASE_URL}/api/meetings")
        assert response.status_code in [401, 403]
        print(f"✓ GET /api/meetings requires auth (status: {response.status_code})")
    
    def test_meetings_patch_requires_auth(self):
        """Test PATCH /api/meetings/{id} requires authentication"""
        response = requests.patch(
            f"{BASE_URL}/api/meetings/test-id",
            json={"outlook_event_id": "test"}
        )
        assert response.status_code in [401, 403]
        print(f"✓ PATCH /api/meetings requires auth (status: {response.status_code})")
    
    def test_tasks_requires_auth(self):
        """Test /api/tasks/paginated requires authentication"""
        response = requests.get(f"{BASE_URL}/api/tasks/paginated")
        assert response.status_code in [401, 403]
        print(f"✓ GET /api/tasks/paginated requires auth (status: {response.status_code})")
    
    def test_marketing_campaigns_requires_auth(self):
        """Test /api/marketing/v2/unified-campaigns requires authentication"""
        response = requests.get(f"{BASE_URL}/api/marketing/v2/unified-campaigns")
        assert response.status_code in [401, 403]
        print(f"✓ GET /api/marketing/v2/unified-campaigns requires auth (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
