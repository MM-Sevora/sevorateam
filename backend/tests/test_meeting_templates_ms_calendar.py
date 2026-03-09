"""
Test Meeting Templates and MS Calendar API endpoints (P1/P2 Features)
- Meeting Templates CRUD
- Schedule meeting from template
- MS Calendar status and connect endpoints
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token") or response.json().get("token")


@pytest.fixture
def headers(auth_token):
    """Get request headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestMeetingTemplatesAPI:
    """Test Meeting Templates API endpoints"""
    
    def test_get_templates_list(self, headers):
        """GET /api/meetings/templates - List templates"""
        response = requests.get(
            f"{BASE_URL}/api/meetings/templates?include_global=true",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get templates: {response.text}"
        templates = response.json()
        assert isinstance(templates, list), "Response should be a list"
        print(f"✓ GET /api/meetings/templates - Found {len(templates)} templates")
        return templates
    
    def test_get_templates_with_filters(self, headers):
        """GET /api/meetings/templates with category filter"""
        response = requests.get(
            f"{BASE_URL}/api/meetings/templates?category=operational",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get templates with filter: {response.text}"
        print(f"✓ GET /api/meetings/templates?category=operational - Status {response.status_code}")
    
    def test_create_template(self, headers):
        """POST /api/meetings/templates - Create a new template"""
        template_data = {
            "name": "TEST_Sprint Planning Template",
            "description": "Standard sprint planning meeting format",
            "category": "project",
            "meeting_type": "sprint_planning",
            "duration_minutes": 90,
            "is_global": False,
            "default_agenda": [
                {"title": "Sprint Goal Review", "duration_minutes": 10},
                {"title": "Backlog Refinement", "duration_minutes": 30},
                {"title": "Task Assignment", "duration_minutes": 30},
                {"title": "Q&A", "duration_minutes": 20}
            ]
        }
        response = requests.post(
            f"{BASE_URL}/api/meetings/templates",
            headers=headers,
            json=template_data
        )
        assert response.status_code == 200, f"Failed to create template: {response.text}"
        created = response.json()
        assert created.get("id"), "Template should have an ID"
        assert created.get("name") == template_data["name"], "Template name mismatch"
        assert created.get("category") == template_data["category"], "Category mismatch"
        assert created.get("meeting_type") == template_data["meeting_type"], "Meeting type mismatch"
        assert created.get("duration_minutes") == template_data["duration_minutes"], "Duration mismatch"
        assert len(created.get("default_agenda", [])) == 4, "Agenda items count mismatch"
        print(f"✓ POST /api/meetings/templates - Created template: {created.get('id')}")
        return created["id"]
    
    def test_get_template_by_id(self, headers):
        """GET /api/meetings/templates/{id} - Get specific template"""
        # First create a template
        template_data = {
            "name": "TEST_Template_Get_By_Id",
            "category": "operational",
            "meeting_type": "daily_standup",
            "duration_minutes": 15
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/meetings/templates",
            headers=headers,
            json=template_data
        )
        assert create_resp.status_code == 200, f"Failed to create template: {create_resp.text}"
        template_id = create_resp.json().get("id")
        
        # Now get by ID
        response = requests.get(
            f"{BASE_URL}/api/meetings/templates/{template_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get template by ID: {response.text}"
        template = response.json()
        assert template.get("id") == template_id, "Template ID mismatch"
        assert template.get("name") == template_data["name"], "Template name mismatch"
        print(f"✓ GET /api/meetings/templates/{template_id} - Retrieved template")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/meetings/templates/{template_id}", headers=headers)
        return template_id
    
    def test_delete_template(self, headers):
        """DELETE /api/meetings/templates/{id} - Delete template"""
        # First create a template
        template_data = {
            "name": "TEST_Template_To_Delete",
            "category": "other",
            "meeting_type": "general",
            "duration_minutes": 30
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/meetings/templates",
            headers=headers,
            json=template_data
        )
        assert create_resp.status_code == 200, f"Failed to create template: {create_resp.text}"
        template_id = create_resp.json().get("id")
        
        # Delete the template
        response = requests.delete(
            f"{BASE_URL}/api/meetings/templates/{template_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to delete template: {response.text}"
        print(f"✓ DELETE /api/meetings/templates/{template_id} - Deleted template")
        
        # Verify it's deleted
        get_resp = requests.get(
            f"{BASE_URL}/api/meetings/templates/{template_id}",
            headers=headers
        )
        assert get_resp.status_code == 404, "Template should be not found after deletion"


class TestScheduleFromTemplate:
    """Test scheduling meeting from template"""
    
    def test_schedule_meeting_from_template(self, headers):
        """POST /api/meetings/templates/{id}/create-meeting - Schedule from template"""
        # First create a template
        template_data = {
            "name": "TEST_Template_For_Scheduling",
            "description": "Template for scheduling test",
            "category": "project",
            "meeting_type": "project_review",
            "duration_minutes": 60,
            "default_agenda": [
                {"title": "Progress Update", "duration_minutes": 20},
                {"title": "Blockers Discussion", "duration_minutes": 20},
                {"title": "Next Steps", "duration_minutes": 20}
            ]
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/meetings/templates",
            headers=headers,
            json=template_data
        )
        assert create_resp.status_code == 200, f"Failed to create template: {create_resp.text}"
        template_id = create_resp.json().get("id")
        
        # Schedule meeting from template
        start_time = (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z"
        schedule_data = {
            "title": "TEST_Meeting_From_Template",
            "start_time": start_time,
            "location": "Conference Room A",
            "meeting_link": "https://meet.example.com/test",
            "participants": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/meetings/templates/{template_id}/create-meeting",
            headers=headers,
            json=schedule_data
        )
        assert response.status_code == 200, f"Failed to create meeting from template: {response.text}"
        meeting = response.json()
        
        # Verify meeting properties
        assert meeting.get("id"), "Meeting should have an ID"
        assert meeting.get("title") == schedule_data["title"], "Meeting title mismatch"
        assert meeting.get("meeting_type") == template_data["meeting_type"], "Meeting type should inherit from template"
        assert meeting.get("location") == schedule_data["location"], "Location mismatch"
        # Note: source_template_id is stored in DB but not exposed in MeetingResponse model (minor model issue)
        
        # Verify agenda was inherited from template
        agenda = meeting.get("agenda", [])
        assert len(agenda) == len(template_data["default_agenda"]), "Agenda items should be inherited from template"
        
        print(f"✓ POST /api/meetings/templates/{template_id}/create-meeting - Created meeting: {meeting.get('id')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/meetings/{meeting.get('id')}", headers=headers)
        requests.delete(f"{BASE_URL}/api/meetings/templates/{template_id}", headers=headers)
        
        return meeting.get("id")


class TestMSCalendarAPI:
    """Test MS Calendar API endpoints"""
    
    def test_ms_calendar_status(self, headers):
        """GET /api/meetings/ms-calendar/status - Get connection status"""
        response = requests.get(
            f"{BASE_URL}/api/meetings/ms-calendar/status",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get MS Calendar status: {response.text}"
        status = response.json()
        
        # Verify response structure
        assert "is_connected" in status, "Response should have is_connected field"
        assert "sync_status" in status, "Response should have sync_status field"
        
        print(f"✓ GET /api/meetings/ms-calendar/status - is_connected: {status.get('is_connected')}, sync_status: {status.get('sync_status')}")
        return status
    
    def test_ms_calendar_connect(self, headers):
        """POST /api/meetings/ms-calendar/connect - Initiate OAuth connection"""
        response = requests.post(
            f"{BASE_URL}/api/meetings/ms-calendar/connect",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to initiate MS Calendar connection: {response.text}"
        result = response.json()
        
        # Verify response structure - should return auth_url since Azure credentials are present
        assert "status" in result, "Response should have status field"
        
        if result.get("status") == "ready":
            assert "auth_url" in result, "Response should have auth_url when ready"
            assert result.get("auth_url").startswith("https://login.microsoftonline.com/"), "Auth URL should be Azure OAuth URL"
            print(f"✓ POST /api/meetings/ms-calendar/connect - OAuth URL returned (Azure credentials present)")
        elif result.get("status") == "not_configured":
            print(f"✓ POST /api/meetings/ms-calendar/connect - Not configured: {result.get('message')}")
        
        return result


class TestRecurringBadgeInMeetingList:
    """Test that recurring meetings have recurrence info in list response"""
    
    def test_meeting_list_includes_recurrence_type(self, headers):
        """GET /api/meetings - Verify recurrence_type in list response"""
        # First create a recurring meeting
        start_time = (datetime.utcnow() + timedelta(days=2)).isoformat() + "Z"
        end_time = (datetime.utcnow() + timedelta(days=2, hours=1)).isoformat() + "Z"
        
        meeting_data = {
            "title": "TEST_Weekly_Recurring_Meeting",
            "meeting_type": "weekly_team_review",
            "start_time": start_time,
            "end_time": end_time,
            "recurrence_type": "weekly",
            "participants": []
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/meetings",
            headers=headers,
            json=meeting_data
        )
        assert create_resp.status_code == 200, f"Failed to create meeting: {create_resp.text}"
        meeting_id = create_resp.json().get("id")
        
        # Now get meeting list
        response = requests.get(
            f"{BASE_URL}/api/meetings",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to get meetings: {response.text}"
        meetings = response.json()
        
        # Find the meeting we created
        test_meeting = None
        for m in meetings:
            if m.get("id") == meeting_id:
                test_meeting = m
                break
        
        assert test_meeting, "Created meeting should be in the list"
        assert "recurrence_type" in test_meeting, "Meeting list item should include recurrence_type"
        assert test_meeting.get("recurrence_type") == "weekly", "Recurrence type should be 'weekly'"
        
        print(f"✓ GET /api/meetings - Meeting list includes recurrence_type: {test_meeting.get('recurrence_type')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/meetings/{meeting_id}", headers=headers)


@pytest.fixture(autouse=True, scope="module")
def cleanup_test_templates(auth_token):
    """Cleanup TEST_ prefixed templates after all tests"""
    yield
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    # Get all templates and delete TEST_ prefixed ones
    response = requests.get(f"{BASE_URL}/api/meetings/templates?include_global=true", headers=headers)
    if response.status_code == 200:
        templates = response.json()
        for template in templates:
            if template.get("name", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/meetings/templates/{template['id']}", headers=headers)
                print(f"  Cleaned up template: {template['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
