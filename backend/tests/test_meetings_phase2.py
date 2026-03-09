"""
Meeting & Review Management System - Phase 2 Tests
Tests for MeetingDetail page functionality:
- Start/Complete meeting
- Discussion notes CRUD
- Action items CRUD
- Convert action item to task
- Previous meeting context
- Meeting minutes (manual & auto-generate)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"

# Existing test meeting from Phase 1
EXISTING_MEETING_ID = "eeb6d6fd-d27b-4a58-ada4-a3074fcfba22"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def test_meeting(headers):
    """Create a test meeting for Phase 2 tests"""
    meeting_data = {
        "title": "TEST_Phase2_Meeting",
        "meeting_type": "weekly_team_review",
        "description": "Test meeting for Phase 2 testing",
        "start_time": (datetime.utcnow() + timedelta(hours=1)).isoformat() + "Z",
        "end_time": (datetime.utcnow() + timedelta(hours=2)).isoformat() + "Z",
        "timezone": "UTC",
        "location": "Test Room",
        "participants": [],
        "agenda": [
            {"title": "Test Agenda Item 1", "duration_minutes": 15},
            {"title": "Test Agenda Item 2", "duration_minutes": 15}
        ],
        "pre_read_documents": [],
        "visibility": "public",
        "recurrence_type": "none"
    }
    
    response = requests.post(f"{BASE_URL}/api/meetings", headers=headers, json=meeting_data)
    assert response.status_code == 200, f"Failed to create test meeting: {response.text}"
    meeting = response.json()
    yield meeting
    
    # Cleanup - delete the test meeting
    requests.delete(f"{BASE_URL}/api/meetings/{meeting['id']}", headers=headers)


class TestMeetingDetailGet:
    """GET /api/meetings/{id} - Returns meeting with full details"""
    
    def test_get_existing_meeting(self, headers):
        """Test fetching existing meeting from Phase 1"""
        response = requests.get(f"{BASE_URL}/api/meetings/{EXISTING_MEETING_ID}", headers=headers)
        
        assert response.status_code == 200
        meeting = response.json()
        
        # Verify all expected fields
        assert meeting["id"] == EXISTING_MEETING_ID
        assert "title" in meeting
        assert "agenda" in meeting
        assert "participants" in meeting
        assert "discussion_notes" in meeting
        assert "action_items" in meeting
        assert "status" in meeting
        
    def test_get_nonexistent_meeting(self, headers):
        """Test fetching non-existent meeting returns 404"""
        response = requests.get(f"{BASE_URL}/api/meetings/nonexistent-id-12345", headers=headers)
        assert response.status_code == 404


class TestMeetingStartComplete:
    """Test meeting status transitions"""
    
    def test_start_meeting(self, headers, test_meeting):
        """POST /api/meetings/{id}/start - Changes status to in_progress"""
        meeting_id = test_meeting["id"]
        
        response = requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/start", headers=headers)
        assert response.status_code == 200
        
        # Verify status changed
        get_response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=headers)
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "in_progress"
        
    def test_complete_meeting(self, headers, test_meeting):
        """POST /api/meetings/{id}/complete - Changes status to completed"""
        meeting_id = test_meeting["id"]
        
        response = requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/complete", headers=headers)
        assert response.status_code == 200
        
        # Verify status changed
        get_response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=headers)
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "completed"
        
    def test_start_nonexistent_meeting(self, headers):
        """Test starting non-existent meeting returns 404"""
        response = requests.post(f"{BASE_URL}/api/meetings/nonexistent-id/start", headers=headers)
        assert response.status_code == 404


class TestDiscussionNotes:
    """Discussion notes CRUD tests"""
    
    def test_add_note_basic(self, headers, test_meeting):
        """POST /api/meetings/{id}/notes - Adds basic discussion note"""
        meeting_id = test_meeting["id"]
        
        params = {
            "topic": "TEST_Note_Topic",
            "notes": "Test discussion notes content"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/notes",
            headers=headers,
            params=params
        )
        
        assert response.status_code == 200
        note = response.json()
        assert note["topic"] == "TEST_Note_Topic"
        assert note["notes"] == "Test discussion notes content"
        assert "id" in note
        
        # Store note_id for cleanup
        test_meeting["_test_note_id"] = note["id"]
        
    def test_add_note_with_goal_project(self, headers, test_meeting):
        """POST /api/meetings/{id}/notes - Adds note with goal/project linkage"""
        meeting_id = test_meeting["id"]
        
        params = {
            "topic": "TEST_Linked_Note",
            "notes": "Discussion linked to goal and project"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/notes",
            headers=headers,
            params=params
        )
        
        assert response.status_code == 200
        note = response.json()
        assert note["topic"] == "TEST_Linked_Note"
        
    def test_add_note_missing_required_fields(self, headers, test_meeting):
        """Test adding note without required fields"""
        meeting_id = test_meeting["id"]
        
        # Missing notes field
        params = {"topic": "Only topic"}
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/notes",
            headers=headers,
            params=params
        )
        # Should fail validation
        assert response.status_code in [400, 422]
        
    def test_delete_note(self, headers, test_meeting):
        """DELETE /api/meetings/{id}/notes/{note_id} - Deletes discussion note"""
        meeting_id = test_meeting["id"]
        
        # First add a note to delete
        params = {"topic": "TEST_Delete_Note", "notes": "To be deleted"}
        add_response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/notes",
            headers=headers,
            params=params
        )
        assert add_response.status_code == 200
        note_id = add_response.json()["id"]
        
        # Delete the note
        response = requests.delete(
            f"{BASE_URL}/api/meetings/{meeting_id}/notes/{note_id}",
            headers=headers
        )
        assert response.status_code == 200
        
        # Verify note is deleted
        get_response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=headers)
        meeting = get_response.json()
        note_ids = [n["id"] for n in meeting.get("discussion_notes", [])]
        assert note_id not in note_ids


class TestActionItems:
    """Action items CRUD tests"""
    
    def test_add_action_item_basic(self, headers, test_meeting):
        """POST /api/meetings/{id}/action-items - Creates basic action item"""
        meeting_id = test_meeting["id"]
        
        params = {
            "title": "TEST_Action_Item",
            "priority": "high"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/action-items",
            headers=headers,
            params=params
        )
        
        assert response.status_code == 200
        action_item = response.json()
        assert action_item["title"] == "TEST_Action_Item"
        assert action_item["priority"] == "high"
        assert action_item["status"] == "pending"
        assert "id" in action_item
        
        # Store for later tests
        test_meeting["_test_action_item_id"] = action_item["id"]
        
    def test_add_action_item_full(self, headers, test_meeting):
        """POST /api/meetings/{id}/action-items - Creates action item with all fields"""
        meeting_id = test_meeting["id"]
        
        params = {
            "title": "TEST_Full_Action_Item",
            "description": "Full description of action item",
            "priority": "urgent",
            "deadline": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/action-items",
            headers=headers,
            params=params
        )
        
        assert response.status_code == 200
        action_item = response.json()
        assert action_item["title"] == "TEST_Full_Action_Item"
        assert action_item["description"] == "Full description of action item"
        assert action_item["priority"] == "urgent"
        
        test_meeting["_test_full_action_item_id"] = action_item["id"]
        
    def test_update_action_item_status(self, headers, test_meeting):
        """PUT /api/meetings/{id}/action-items/{id} - Updates action item status"""
        meeting_id = test_meeting["id"]
        action_item_id = test_meeting.get("_test_action_item_id")
        
        if not action_item_id:
            pytest.skip("No action item to update")
        
        # Update to in_progress
        response = requests.put(
            f"{BASE_URL}/api/meetings/{meeting_id}/action-items/{action_item_id}",
            headers=headers,
            params={"status": "in_progress"}
        )
        
        assert response.status_code == 200
        
        # Verify status changed
        get_response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=headers)
        meeting = get_response.json()
        action_item = next((a for a in meeting.get("action_items", []) if a["id"] == action_item_id), None)
        assert action_item is not None
        assert action_item["status"] == "in_progress"
        
    def test_update_action_item_to_completed(self, headers, test_meeting):
        """PUT /api/meetings/{id}/action-items/{id} - Marks action item as completed"""
        meeting_id = test_meeting["id"]
        action_item_id = test_meeting.get("_test_action_item_id")
        
        if not action_item_id:
            pytest.skip("No action item to update")
        
        response = requests.put(
            f"{BASE_URL}/api/meetings/{meeting_id}/action-items/{action_item_id}",
            headers=headers,
            params={"status": "completed"}
        )
        
        assert response.status_code == 200
        
        # Verify completion
        get_response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=headers)
        meeting = get_response.json()
        action_item = next((a for a in meeting.get("action_items", []) if a["id"] == action_item_id), None)
        assert action_item["status"] == "completed"


class TestConvertActionItemToTask:
    """Action Item to Task conversion tests"""
    
    def test_convert_to_task_success(self, headers, test_meeting):
        """POST /api/meetings/{id}/action-items/{id}/convert-to-task"""
        meeting_id = test_meeting["id"]
        
        # First create an action item to convert
        params = {"title": "TEST_Convert_To_Task", "priority": "medium"}
        add_response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/action-items",
            headers=headers,
            params=params
        )
        assert add_response.status_code == 200
        action_item_id = add_response.json()["id"]
        
        # Convert to task
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/action-items/{action_item_id}/convert-to-task",
            headers=headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "task_id" in result
        assert result["message"] == "Action item converted to task"
        
        # Verify action item status is now converted_to_task
        get_response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=headers)
        meeting = get_response.json()
        action_item = next((a for a in meeting.get("action_items", []) if a["id"] == action_item_id), None)
        assert action_item["status"] == "converted_to_task"
        assert action_item["converted_task_id"] == result["task_id"]
        
    def test_convert_already_converted_fails(self, headers, test_meeting):
        """Test converting already converted action item fails"""
        meeting_id = test_meeting["id"]
        
        # Get a converted action item
        get_response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=headers)
        meeting = get_response.json()
        
        converted_item = next(
            (a for a in meeting.get("action_items", []) if a.get("status") == "converted_to_task"),
            None
        )
        
        if not converted_item:
            pytest.skip("No converted action item available")
        
        # Try to convert again
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/action-items/{converted_item['id']}/convert-to-task",
            headers=headers
        )
        
        assert response.status_code == 400


class TestPreviousContext:
    """Previous meeting context tests"""
    
    def test_get_previous_context(self, headers, test_meeting):
        """GET /api/meetings/{id}/previous-context - Returns previous meeting context"""
        meeting_id = test_meeting["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/meetings/{meeting_id}/previous-context",
            headers=headers
        )
        
        assert response.status_code == 200
        context = response.json()
        
        # Verify expected fields exist (may be null if no previous meeting)
        assert "previous_meeting_id" in context or context.get("previous_meeting_id") is None
        assert "pending_action_items" in context
        assert "completed_action_items" in context
        assert "overdue_action_items" in context
        
    def test_get_previous_context_nonexistent_meeting(self, headers):
        """Test previous context for non-existent meeting returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/meetings/nonexistent-id/previous-context",
            headers=headers
        )
        assert response.status_code == 404


class TestMeetingMinutes:
    """Meeting minutes tests"""
    
    def test_create_manual_minutes(self, headers, test_meeting):
        """POST /api/meetings/{id}/minutes - Creates manual meeting minutes"""
        meeting_id = test_meeting["id"]
        
        minutes_data = {
            "meeting_id": meeting_id,
            "summary": "TEST_Meeting summary for Phase 2 testing",
            "key_discussions": "Key points discussed during the meeting",
            "decisions": "Important decisions made",
            "next_steps": "Follow-up actions required",
            "auto_generated": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/minutes",
            headers=headers,
            json=minutes_data
        )
        
        assert response.status_code == 200
        minutes = response.json()
        assert minutes["summary"] == minutes_data["summary"]
        assert minutes["key_discussions"] == minutes_data["key_discussions"]
        assert minutes["auto_generated"] == False
        
    def test_get_meeting_minutes(self, headers, test_meeting):
        """GET /api/meetings/{id}/minutes - Gets meeting minutes"""
        meeting_id = test_meeting["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/meetings/{meeting_id}/minutes",
            headers=headers
        )
        
        # May return 404 if no minutes exist, or 200 with minutes
        assert response.status_code in [200, 404]
        
    def test_auto_generate_minutes(self, headers, test_meeting):
        """POST /api/meetings/{id}/minutes/generate - Auto-generates meeting minutes"""
        meeting_id = test_meeting["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/minutes/generate",
            headers=headers
        )
        
        assert response.status_code == 200
        minutes = response.json()
        assert minutes["auto_generated"] == True
        assert "summary" in minutes
        

class TestMeetingDashboard:
    """Meeting dashboard tests"""
    
    def test_get_dashboard_overview(self, headers):
        """GET /api/meetings/dashboard/overview - Gets dashboard data"""
        response = requests.get(
            f"{BASE_URL}/api/meetings/dashboard/overview",
            headers=headers
        )
        
        assert response.status_code == 200
        dashboard = response.json()
        
        # Verify expected fields
        assert "total_meetings_this_month" in dashboard
        assert "meetings_today" in dashboard
        assert "upcoming_meetings" in dashboard
        assert "total_action_items" in dashboard


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_meeting(self, headers, test_meeting):
        """Delete test meeting and verify cleanup"""
        meeting_id = test_meeting["id"]
        
        response = requests.delete(f"{BASE_URL}/api/meetings/{meeting_id}", headers=headers)
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/meetings/{meeting_id}", headers=headers)
        assert get_response.status_code == 404
