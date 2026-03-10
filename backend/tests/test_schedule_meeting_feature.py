"""
Test Suite for Schedule Meeting Feature from Teams Chat and Email
Tests the POST /api/meetings endpoint with different meeting types and sources
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com').rstrip('/')

# Valid meeting types from the feature spec
VALID_MEETING_TYPES = [
    "general",
    "okr_review", 
    "leadership_strategy",
    "quarterly_business_review",
    "department_weekly",
    "department_monthly",
    "project_kickoff",
    "sprint_planning",
    "project_review",
    "sprint_retrospective",
    "weekly_team_review",
    "daily_standup",
    "one_on_one",
    "performance_discussion"
]


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "superadmin@sevora.com",
        "password": "superadmin123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed")


@pytest.fixture
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestScheduleMeetingFromTeamsChat:
    """Tests for scheduling meetings from Teams Chat messages"""
    
    def test_create_meeting_from_teams_chat_general(self, api_client):
        """Test creating a general meeting from Teams chat"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        meeting_data = {
            "title": "Follow-up: Discussion from Teams Chat",
            "meeting_type": "general",
            "description": "Meeting scheduled from Teams chat with John:\n\n\"Let's discuss the project timeline\"\n\n— John Doe",
            "start_time": f"{tomorrow}T10:00:00Z",
            "end_time": f"{tomorrow}T10:30:00Z",
            "timezone": "UTC",
            "location": "Conference Room A",
            "visibility": "public",
            "source": "teams_chat"
        }
        
        response = api_client.post(f"{BASE_URL}/api/meetings", json=meeting_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["title"] == meeting_data["title"]
        assert data["meeting_type"] == "general"
        assert data["status"] == "scheduled"
        assert "id" in data
        
    def test_create_meeting_from_teams_chat_one_on_one(self, api_client):
        """Test creating a one-on-one meeting from Teams chat"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        meeting_data = {
            "title": "1:1 Discussion from Chat",
            "meeting_type": "one_on_one",
            "description": "One-on-one meeting scheduled from Teams chat",
            "start_time": f"{tomorrow}T14:00:00Z",
            "end_time": f"{tomorrow}T14:30:00Z",
            "timezone": "UTC",
            "visibility": "public",
            "source": "teams_chat"
        }
        
        response = api_client.post(f"{BASE_URL}/api/meetings", json=meeting_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["meeting_type"] == "one_on_one"
        
    def test_create_meeting_from_teams_chat_project_review(self, api_client):
        """Test creating a project review meeting from Teams chat"""
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        meeting_data = {
            "title": "Project Review: Q1 Sprint",
            "meeting_type": "project_review",
            "description": "Review the current sprint progress",
            "start_time": f"{tomorrow}T09:00:00Z",
            "end_time": f"{tomorrow}T10:00:00Z",
            "timezone": "UTC",
            "visibility": "public",
            "source": "teams_chat"
        }
        
        response = api_client.post(f"{BASE_URL}/api/meetings", json=meeting_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["meeting_type"] == "project_review"
        
    def test_create_meeting_from_teams_chat_weekly_review(self, api_client):
        """Test creating a weekly team review meeting from Teams chat"""
        tomorrow = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        
        meeting_data = {
            "title": "Weekly Team Sync",
            "meeting_type": "weekly_team_review",
            "description": "Weekly team review from chat discussion",
            "start_time": f"{tomorrow}T11:00:00Z",
            "end_time": f"{tomorrow}T11:30:00Z",
            "timezone": "UTC",
            "visibility": "public",
            "source": "teams_chat"
        }
        
        response = api_client.post(f"{BASE_URL}/api/meetings", json=meeting_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["meeting_type"] == "weekly_team_review"
        
    def test_create_meeting_from_teams_chat_daily_standup(self, api_client):
        """Test creating a daily standup meeting from Teams chat"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        meeting_data = {
            "title": "Daily Standup",
            "meeting_type": "daily_standup",
            "description": "Daily standup discussion",
            "start_time": f"{tomorrow}T09:00:00Z",
            "end_time": f"{tomorrow}T09:15:00Z",
            "timezone": "UTC",
            "visibility": "public",
            "source": "teams_chat"
        }
        
        response = api_client.post(f"{BASE_URL}/api/meetings", json=meeting_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["meeting_type"] == "daily_standup"


class TestScheduleMeetingFromEmail:
    """Tests for scheduling meetings from Email threads"""
    
    def test_create_meeting_from_email_general(self, api_client):
        """Test creating a general meeting from email"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        meeting_data = {
            "title": "Follow-up: RE: Project Update",
            "meeting_type": "general",
            "description": "Meeting scheduled from email:\n\nSubject: RE: Project Update\nFrom: Jane Smith <jane@example.com>",
            "start_time": f"{tomorrow}T10:00:00Z",
            "end_time": f"{tomorrow}T10:30:00Z",
            "timezone": "UTC",
            "visibility": "public",
            "source": "email"
        }
        
        response = api_client.post(f"{BASE_URL}/api/meetings", json=meeting_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == meeting_data["title"]
        assert data["meeting_type"] == "general"
        
    def test_create_meeting_from_email_with_project_link(self, api_client):
        """Test creating a meeting from email with linked project"""
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        # First get a project ID
        projects_response = api_client.get(f"{BASE_URL}/api/projects")
        project_id = None
        if projects_response.status_code == 200 and projects_response.json():
            project_id = projects_response.json()[0].get("id")
        
        meeting_data = {
            "title": "Project Discussion from Email",
            "meeting_type": "project_review",
            "description": "Meeting to discuss project from email thread",
            "start_time": f"{tomorrow}T14:00:00Z",
            "end_time": f"{tomorrow}T15:00:00Z",
            "timezone": "UTC",
            "visibility": "public",
            "source": "email"
        }
        
        if project_id:
            meeting_data["linked_project_id"] = project_id
        
        response = api_client.post(f"{BASE_URL}/api/meetings", json=meeting_data)
        
        assert response.status_code == 200
        data = response.json()
        if project_id:
            assert data["linked_project_id"] == project_id


class TestMeetingFormValidation:
    """Tests for meeting form validation"""
    
    def test_meeting_requires_title(self, api_client):
        """Test that title is required"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        meeting_data = {
            "meeting_type": "general",
            "start_time": f"{tomorrow}T10:00:00Z",
            "end_time": f"{tomorrow}T10:30:00Z"
        }
        
        response = api_client.post(f"{BASE_URL}/api/meetings", json=meeting_data)
        
        # Should fail validation
        assert response.status_code in [400, 422], f"Expected validation error, got {response.status_code}"
        
    def test_meeting_requires_start_time(self, api_client):
        """Test that start_time is required"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        meeting_data = {
            "title": "Test Meeting",
            "meeting_type": "general",
            "end_time": f"{tomorrow}T10:30:00Z"
        }
        
        response = api_client.post(f"{BASE_URL}/api/meetings", json=meeting_data)
        
        # Should fail validation
        assert response.status_code in [400, 422], f"Expected validation error, got {response.status_code}"


class TestMeetingTypeDropdownOptions:
    """Tests to verify all meeting types in dropdown are valid"""
    
    def test_all_meeting_types_are_valid(self, api_client):
        """Test that meetings can be created with each type shown in the dropdown"""
        tomorrow = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        
        # Types shown in the UI dropdown
        dropdown_types = ["general", "one_on_one", "project_review", "weekly_team_review", "daily_standup"]
        
        for meeting_type in dropdown_types:
            meeting_data = {
                "title": f"Test {meeting_type} meeting",
                "meeting_type": meeting_type,
                "start_time": f"{tomorrow}T10:00:00Z",
                "end_time": f"{tomorrow}T10:30:00Z",
                "timezone": "UTC",
                "visibility": "public"
            }
            
            response = api_client.post(f"{BASE_URL}/api/meetings", json=meeting_data)
            
            assert response.status_code == 200, f"Failed to create meeting with type {meeting_type}: {response.text}"
            data = response.json()
            assert data["meeting_type"] == meeting_type


class TestMeetingListAndRetrieval:
    """Tests for listing and retrieving created meetings"""
    
    def test_list_meetings(self, api_client):
        """Test that created meetings appear in list"""
        response = api_client.get(f"{BASE_URL}/api/meetings")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_my_meetings_endpoint(self, api_client):
        """Test the my-meetings endpoint for current user's meetings"""
        response = api_client.get(f"{BASE_URL}/api/meetings/my-meetings")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
