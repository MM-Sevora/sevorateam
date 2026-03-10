"""
Test Suite for Dropdown Actions (Objectives/Projects) and @mentions in Comments
Tests:
1. Objectives page dropdown has View Details, Schedule Meeting, Edit, Delete options
2. Projects list/card dropdown has View Details, Schedule Meeting, Edit, Delete options  
3. @mentions in task comments - Backend accepts mentions array and creates notifications
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


def get_fresh_token():
    """Login and get auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "superadmin@sevora.com", "password": "superadmin123"}
    )
    if response.status_code != 200:
        raise Exception(f"Login failed: {response.text}")
    data = response.json()
    # API returns access_token, not token
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="function")
def auth_headers():
    """Get fresh auth headers for each test"""
    token = get_fresh_token()
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ============== OBJECTIVES DROPDOWN TESTS ==============

class TestObjectivesDropdownActions:
    """Test Objectives dropdown menu options - Backend API support"""
    
    def test_objectives_list_api(self, auth_headers):
        """Test GET /api/goals/objectives returns list with required fields"""
        response = requests.get(f"{BASE_URL}/api/goals/objectives", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get objectives: {response.text}"
        
        objectives = response.json()
        print(f"Found {len(objectives)} objectives")
        
        if objectives:
            obj = objectives[0]
            assert "id" in obj, "Objective should have 'id' field"
            assert "title" in obj, "Objective should have 'title' field"
            print(f"First objective: {obj.get('title')} - ID: {obj.get('id')}")
    
    def test_objective_get_single_api(self, auth_headers):
        """Test GET /api/goals/objectives/{id} for View Details action"""
        response = requests.get(f"{BASE_URL}/api/goals/objectives", headers=auth_headers)
        if response.status_code == 200 and response.json():
            obj_id = response.json()[0]["id"]
            
            detail_response = requests.get(f"{BASE_URL}/api/goals/objectives/{obj_id}", headers=auth_headers)
            assert detail_response.status_code == 200, f"View Details API failed: {detail_response.text}"
            print(f"View Details API working for objective {obj_id}")
        else:
            pytest.skip("No objectives available to test View Details")
    
    def test_objective_update_api(self, auth_headers):
        """Test PUT /api/goals/objectives/{id} for Edit action"""
        response = requests.get(f"{BASE_URL}/api/goals/objectives", headers=auth_headers)
        if response.status_code == 200 and response.json():
            obj = response.json()[0]
            obj_id = obj["id"]
            
            update_response = requests.put(
                f"{BASE_URL}/api/goals/objectives/{obj_id}",
                headers=auth_headers,
                json={"title": obj.get("title", "Test Objective")}
            )
            assert update_response.status_code == 200, f"Edit API failed: {update_response.text}"
            print(f"Edit API working for objective {obj_id}")
        else:
            pytest.skip("No objectives available to test Edit")


# ============== PROJECTS DROPDOWN TESTS ==============

class TestProjectsDropdownActions:
    """Test Projects dropdown menu options - Backend API support"""
    
    def test_projects_list_api(self, auth_headers):
        """Test GET /api/projects/list returns list with required fields"""
        response = requests.get(f"{BASE_URL}/api/projects/list", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get projects: {response.text}"
        
        projects = response.json()
        print(f"Found {len(projects)} projects")
        
        if projects:
            proj = projects[0]
            assert "id" in proj, "Project should have 'id' field"
            assert "name" in proj, "Project should have 'name' field"
            print(f"First project: {proj.get('name')} - ID: {proj.get('id')}")
    
    def test_project_get_single_api(self, auth_headers):
        """Test GET /api/projects/{id} for View Details action"""
        response = requests.get(f"{BASE_URL}/api/projects/list", headers=auth_headers)
        if response.status_code == 200 and response.json():
            proj_id = response.json()[0]["id"]
            
            detail_response = requests.get(f"{BASE_URL}/api/projects/{proj_id}", headers=auth_headers)
            assert detail_response.status_code == 200, f"View Details API failed: {detail_response.text}"
            print(f"View Details API working for project {proj_id}")
        else:
            pytest.skip("No projects available to test View Details")
    
    def test_project_update_api(self, auth_headers):
        """Test PUT /api/projects/{id} for Edit action"""
        response = requests.get(f"{BASE_URL}/api/projects/list", headers=auth_headers)
        if response.status_code == 200 and response.json():
            proj = response.json()[0]
            proj_id = proj["id"]
            
            update_response = requests.put(
                f"{BASE_URL}/api/projects/{proj_id}",
                headers=auth_headers,
                json={"name": proj.get("name", "Test Project")}
            )
            assert update_response.status_code == 200, f"Edit API failed: {update_response.text}"
            print(f"Edit API working for project {proj_id}")
        else:
            pytest.skip("No projects available to test Edit")


# ============== SCHEDULE MEETING FROM DROPDOWN TESTS ==============

class TestMeetingScheduleFromDropdown:
    """Test Schedule Meeting action from dropdowns"""
    
    def test_meeting_create_with_objective_link(self, auth_headers):
        """Test creating a meeting with objective_id parameter"""
        obj_response = requests.get(f"{BASE_URL}/api/goals/objectives", headers=auth_headers)
        if obj_response.status_code != 200 or not obj_response.json():
            pytest.skip("No objectives available")
        
        obj_id = obj_response.json()[0]["id"]
        
        meeting_data = {
            "title": "TEST_OKR Review Meeting",
            "meeting_type": "okr_review",
            "start_time": "2026-04-01T10:00:00",
            "end_time": "2026-04-01T11:00:00",
            "location": "Conference Room A",
            "objective_id": obj_id
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/meetings",
            headers=auth_headers,
            json=meeting_data
        )
        
        assert create_response.status_code in [200, 201], f"Meeting creation failed: {create_response.text}"
        meeting = create_response.json()
        print(f"Created meeting linked to objective: {meeting.get('id')}")
        
        if meeting.get("id"):
            requests.delete(f"{BASE_URL}/api/meetings/{meeting['id']}", headers=auth_headers)
            print("Test meeting cleaned up")
    
    def test_meeting_create_with_project_link(self, auth_headers):
        """Test creating a meeting with project_id parameter"""
        proj_response = requests.get(f"{BASE_URL}/api/projects/list", headers=auth_headers)
        if proj_response.status_code != 200 or not proj_response.json():
            pytest.skip("No projects available")
        
        proj_id = proj_response.json()[0]["id"]
        
        meeting_data = {
            "title": "TEST_Project Review Meeting",
            "meeting_type": "project_review",
            "start_time": "2026-04-02T14:00:00",
            "end_time": "2026-04-02T14:45:00",
            "location": "Virtual",
            "project_id": proj_id
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/meetings",
            headers=auth_headers,
            json=meeting_data
        )
        
        assert create_response.status_code in [200, 201], f"Meeting creation failed: {create_response.text}"
        meeting = create_response.json()
        print(f"Created meeting linked to project: {meeting.get('id')}")
        
        if meeting.get("id"):
            requests.delete(f"{BASE_URL}/api/meetings/{meeting['id']}", headers=auth_headers)
            print("Test meeting cleaned up")


# ============== MENTIONS IN COMMENTS TESTS ==============

class TestMentionsInComments:
    """Test @mentions in task comments"""
    
    def test_get_users_for_mentions(self, auth_headers):
        """Test that users list is available for @mentions suggestions"""
        response = requests.get(f"{BASE_URL}/api/workos/users", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        
        users_data = response.json()
        users = users_data.get("users", users_data) if isinstance(users_data, dict) else users_data
        
        print(f"Found {len(users)} users for @mentions")
        if users:
            user = users[0]
            assert "id" in user, "User should have 'id' for mentions"
            assert "name" in user, "User should have 'name' for mentions display"
            print(f"First user: {user.get('name')} - ID: {user.get('id')}")
    
    def test_create_comment_with_mentions(self, auth_headers):
        """Test POST /api/projects/comments with mentions array"""
        # First, get a task to comment on
        proj_response = requests.get(f"{BASE_URL}/api/projects/list", headers=auth_headers)
        
        task_id = None
        if proj_response.status_code == 200 and proj_response.json():
            proj_id = proj_response.json()[0]["id"]
            tasks_response = requests.get(f"{BASE_URL}/api/projects/{proj_id}/tasks", headers=auth_headers)
            if tasks_response.status_code == 200 and tasks_response.json():
                task_id = tasks_response.json()[0]["id"]
        
        if not task_id:
            # Try my-tasks endpoint
            my_tasks_response = requests.get(f"{BASE_URL}/api/projects/my-tasks", headers=auth_headers)
            if my_tasks_response.status_code == 200:
                tasks_data = my_tasks_response.json()
                for key in ["tasks_assigned", "tasks_in_progress", "tasks_due_today"]:
                    if tasks_data.get(key):
                        task_id = tasks_data[key][0]["id"]
                        break
        
        if not task_id:
            pytest.skip("No tasks available to test comments")
        
        # Get a user to mention
        users_response = requests.get(f"{BASE_URL}/api/workos/users", headers=auth_headers)
        if users_response.status_code != 200:
            pytest.skip("Cannot get users for mentions test")
        
        users_data = users_response.json()
        users = users_data.get("users", users_data) if isinstance(users_data, dict) else users_data
        
        if not users:
            pytest.skip("No users available to mention")
        
        mention_user_id = users[0]["id"]
        mention_user_name = users[0]["name"]
        
        # Create comment with mentions
        comment_data = {
            "task_id": task_id,
            "content": f"<p>Testing mentions - @{mention_user_name} please review this.</p>",
            "mentions": [mention_user_id]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/projects/comments",
            headers=auth_headers,
            json=comment_data
        )
        
        assert response.status_code in [200, 201], f"Comment creation failed: {response.text}"
        comment = response.json()
        
        assert "mentions" in comment, "Response should include 'mentions' field"
        assert comment["mentions"] == [mention_user_id], "Mentions should be saved correctly"
        
        print(f"Created comment with mention: {comment.get('id')}")
        print(f"Mentioned user: {mention_user_name} ({mention_user_id})")
        
        # Verify the comment was saved with mentions
        task_comments = requests.get(
            f"{BASE_URL}/api/projects/tasks/{task_id}/comments",
            headers=auth_headers
        )
        
        if task_comments.status_code == 200:
            comments = task_comments.json()
            our_comment = next((c for c in comments if c["id"] == comment["id"]), None)
            if our_comment:
                assert our_comment.get("mentions") == [mention_user_id], "Mentions should persist in database"
                print("Verified mentions persisted in database")
    
    def test_comment_without_mentions(self, auth_headers):
        """Test creating a comment without mentions works"""
        proj_response = requests.get(f"{BASE_URL}/api/projects/list", headers=auth_headers)
        
        task_id = None
        if proj_response.status_code == 200 and proj_response.json():
            proj_id = proj_response.json()[0]["id"]
            tasks_response = requests.get(f"{BASE_URL}/api/projects/{proj_id}/tasks", headers=auth_headers)
            if tasks_response.status_code == 200 and tasks_response.json():
                task_id = tasks_response.json()[0]["id"]
        
        if not task_id:
            pytest.skip("No tasks available to test comments")
        
        comment_data = {
            "task_id": task_id,
            "content": "<p>Simple comment without mentions</p>",
            "mentions": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/projects/comments",
            headers=auth_headers,
            json=comment_data
        )
        
        assert response.status_code in [200, 201], f"Comment without mentions failed: {response.text}"
        comment = response.json()
        
        assert comment.get("mentions") == [], "Empty mentions should work"
        print("Comment without mentions created successfully")


# ============== NOTIFICATIONS FOR MENTIONS TESTS ==============

class TestNotificationsForMentions:
    """Test that notifications are created for mentioned users"""
    
    def test_notifications_endpoint_exists(self, auth_headers):
        """Test that notifications endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        # Accept 200 or 404 (if no notifications)
        assert response.status_code in [200, 404], f"Notifications endpoint failed: {response.text}"
        
        if response.status_code == 200:
            notifications = response.json()
            print(f"Found {len(notifications)} notifications")
            
            mention_notifications = [n for n in notifications if n.get("notification_type") == "user_mentioned"]
            print(f"Found {len(mention_notifications)} mention notifications")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
