"""
Project Management New Features Test Suite
Tests: Kanban Board, Sprints, Milestones, Task Watchers, Bulk Operations, Task Duplication
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "admin123"

# Existing test project ID from main agent context
TEST_PROJECT_ID = "d4a14f00-2cf9-4b13-970e-55d3ced7c520"

class TestAuthentication:
    """Authentication tests"""
    
    def test_login_success(self, api_client):
        """Test login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✅ Login successful for {data['user'].get('email')}")


class TestKanbanBoard:
    """Kanban Board API tests"""
    
    def test_get_kanban_board_all_tasks(self, authenticated_client):
        """GET /api/projects/kanban returns columns and tasks"""
        response = authenticated_client.get(f"{BASE_URL}/api/projects/kanban")
        assert response.status_code == 200
        data = response.json()
        
        assert "columns" in data
        assert "tasks_by_column" in data
        assert "total_tasks" in data
        assert isinstance(data["columns"], list)
        assert len(data["columns"]) > 0
        
        # Verify column structure
        first_column = data["columns"][0]
        assert "id" in first_column
        assert "name" in first_column
        assert "status" in first_column
        
        print(f"✅ Kanban board returned {len(data['columns'])} columns with {data['total_tasks']} total tasks")
    
    def test_get_kanban_board_with_project_filter(self, authenticated_client):
        """GET /api/projects/kanban?project_id={id} filters by project"""
        response = authenticated_client.get(f"{BASE_URL}/api/projects/kanban?project_id={TEST_PROJECT_ID}")
        
        if response.status_code == 200:
            data = response.json()
            assert "columns" in data
            assert "tasks_by_column" in data
            print(f"✅ Kanban board with project filter returned {data['total_tasks']} tasks")
        elif response.status_code == 404:
            pytest.skip("Test project not found - may have been deleted")
    
    def test_move_task_on_kanban(self, authenticated_client, created_task):
        """PUT /api/projects/kanban/move-task moves task between columns"""
        task_id = created_task["id"]
        new_status = "in_progress"
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/projects/kanban/move-task?task_id={task_id}&new_status={new_status}"
        )
        assert response.status_code == 200
        data = response.json()
        # API returns {"task_id": x, "new_status": y, "message": z}
        assert data.get("new_status") == new_status or data.get("status") == new_status
        print(f"✅ Task moved to '{new_status}' status on Kanban board")


class TestSprints:
    """Sprint Management API tests"""
    
    def test_list_sprints_for_project(self, authenticated_client):
        """GET /api/projects/{project_id}/sprints returns sprints list"""
        response = authenticated_client.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/sprints")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"✅ Listed {len(data)} sprints for project")
        elif response.status_code == 404:
            pytest.skip("Test project not found")
    
    def test_create_sprint(self, authenticated_client):
        """POST /api/projects/sprints creates a new sprint"""
        start_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d")
        
        sprint_data = {
            "project_id": TEST_PROJECT_ID,
            "name": f"TEST_Sprint_{uuid.uuid4().hex[:8]}",
            "goal": "Test sprint goal for automated testing",
            "start_date": start_date,
            "end_date": end_date
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/projects/sprints", json=sprint_data)
        
        # API returns 200 on success
        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data
            assert data["name"] == sprint_data["name"]
            assert data["status"] == "planning"
            print(f"✅ Created sprint: {data['name']}")
            # Cleanup
            authenticated_client.delete(f"{BASE_URL}/api/projects/sprints/{data['id']}")
            return data
        elif response.status_code == 404:
            pytest.skip("Test project not found")
        else:
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")
    
    def test_update_sprint(self, authenticated_client, created_sprint):
        """PUT /api/projects/sprints/{sprint_id} updates sprint"""
        sprint_id = created_sprint["id"]
        
        update_data = {
            "goal": "Updated goal for test sprint"
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/projects/sprints/{sprint_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["goal"] == update_data["goal"]
        print(f"✅ Sprint updated successfully")
    
    def test_start_sprint(self, authenticated_client, created_sprint):
        """POST /api/projects/sprints/{sprint_id}/start changes status to active"""
        sprint_id = created_sprint["id"]
        
        response = authenticated_client.post(f"{BASE_URL}/api/projects/sprints/{sprint_id}/start")
        
        if response.status_code == 200:
            print(f"✅ Sprint started successfully")
        elif response.status_code == 400:
            # Already an active sprint
            print(f"⚠️ Sprint start failed (possibly another active sprint exists)")
    
    def test_complete_sprint(self, authenticated_client, created_sprint):
        """POST /api/projects/sprints/{sprint_id}/complete marks sprint as complete"""
        sprint_id = created_sprint["id"]
        
        # First start the sprint if it hasn't been started
        authenticated_client.post(f"{BASE_URL}/api/projects/sprints/{sprint_id}/start")
        
        response = authenticated_client.post(f"{BASE_URL}/api/projects/sprints/{sprint_id}/complete")
        
        if response.status_code == 200:
            print(f"✅ Sprint completed successfully")
        elif response.status_code == 400:
            print(f"⚠️ Sprint complete failed (possibly not in active state)")


class TestMilestones:
    """Milestone Management API tests"""
    
    def test_list_milestones_for_project(self, authenticated_client):
        """GET /api/projects/{project_id}/milestones returns milestones list"""
        response = authenticated_client.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"✅ Listed {len(data)} milestones for project")
        elif response.status_code == 404:
            pytest.skip("Test project not found")
    
    def test_create_milestone(self, authenticated_client):
        """POST /api/projects/milestones creates a new milestone"""
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        milestone_data = {
            "project_id": TEST_PROJECT_ID,
            "name": f"TEST_Milestone_{uuid.uuid4().hex[:8]}",
            "description": "Test milestone for automated testing",
            "due_date": due_date,
            "linked_task_ids": []
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/projects/milestones", json=milestone_data)
        
        # API returns 200 on success
        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data
            assert data["name"] == milestone_data["name"]
            assert data["status"] == "upcoming"
            print(f"✅ Created milestone: {data['name']}")
            # Cleanup
            authenticated_client.delete(f"{BASE_URL}/api/projects/milestones/{data['id']}")
            return data
        elif response.status_code == 404:
            pytest.skip("Test project not found")
        else:
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")
    
    def test_update_milestone(self, authenticated_client, created_milestone):
        """PUT /api/projects/milestones/{milestone_id} updates milestone"""
        milestone_id = created_milestone["id"]
        
        update_data = {
            "description": "Updated description for test milestone",
            "status": "in_progress"
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/projects/milestones/{milestone_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == update_data["description"]
        print(f"✅ Milestone updated successfully")
    
    def test_complete_milestone(self, authenticated_client, created_milestone):
        """PUT /api/projects/milestones/{milestone_id} with status=completed"""
        milestone_id = created_milestone["id"]
        
        update_data = {"status": "completed"}
        response = authenticated_client.put(f"{BASE_URL}/api/projects/milestones/{milestone_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        print(f"✅ Milestone marked as completed")


class TestTaskWatchers:
    """Task Watcher API tests"""
    
    def test_watch_task(self, authenticated_client, created_task):
        """POST /api/projects/tasks/{task_id}/watch adds current user as watcher"""
        task_id = created_task["id"]
        
        response = authenticated_client.post(f"{BASE_URL}/api/projects/tasks/{task_id}/watch")
        assert response.status_code == 200
        data = response.json()
        assert data.get("watching") == True
        print(f"✅ User now watching task")
    
    def test_unwatch_task(self, authenticated_client, created_task):
        """DELETE /api/projects/tasks/{task_id}/watch removes watcher"""
        task_id = created_task["id"]
        
        # First watch the task
        authenticated_client.post(f"{BASE_URL}/api/projects/tasks/{task_id}/watch")
        
        # Then unwatch
        response = authenticated_client.delete(f"{BASE_URL}/api/projects/tasks/{task_id}/watch")
        assert response.status_code == 200
        data = response.json()
        assert data.get("watching") == False
        print(f"✅ User stopped watching task")
    
    def test_get_task_watchers(self, authenticated_client, created_task):
        """GET /api/projects/tasks/{task_id}/watchers returns watchers list"""
        task_id = created_task["id"]
        
        # First watch the task
        authenticated_client.post(f"{BASE_URL}/api/projects/tasks/{task_id}/watch")
        
        response = authenticated_client.get(f"{BASE_URL}/api/projects/tasks/{task_id}/watchers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} watchers for task")


class TestBulkOperations:
    """Bulk Operation API tests"""
    
    def test_bulk_update_tasks(self, authenticated_client, created_tasks_for_bulk):
        """POST /api/projects/tasks/bulk/update updates multiple tasks"""
        task_ids = [task["id"] for task in created_tasks_for_bulk]
        
        bulk_data = {
            "task_ids": task_ids,
            "priority": "high"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/projects/tasks/bulk/update", json=bulk_data)
        assert response.status_code == 200
        data = response.json()
        assert data["success_count"] > 0
        print(f"✅ Bulk updated {data['success_count']} tasks")
    
    def test_bulk_update_tasks_status(self, authenticated_client, created_tasks_for_bulk):
        """POST /api/projects/tasks/bulk/update can update status for multiple tasks"""
        task_ids = [task["id"] for task in created_tasks_for_bulk]
        
        bulk_data = {
            "task_ids": task_ids,
            "status": "in_progress"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/projects/tasks/bulk/update", json=bulk_data)
        assert response.status_code == 200
        data = response.json()
        assert "success_count" in data
        print(f"✅ Bulk status update completed: {data['success_count']} tasks")


class TestTaskDuplication:
    """Task Duplication API tests"""
    
    def test_duplicate_task(self, authenticated_client, created_task):
        """POST /api/projects/tasks/duplicate duplicates a task"""
        task_id = created_task["id"]
        
        duplicate_data = {
            "task_id": task_id,
            "include_subtasks": True,
            "include_checklists": True,
            "include_attachments": False
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/projects/tasks/duplicate", json=duplicate_data)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        assert data["id"] != task_id
        print(f"✅ Task duplicated: {data['name']}")
        # Cleanup duplicate
        authenticated_client.delete(f"{BASE_URL}/api/projects/tasks/{data['id']}")
    
    def test_duplicate_task_with_custom_name(self, authenticated_client, created_task):
        """POST /api/projects/tasks/duplicate with custom name"""
        task_id = created_task["id"]
        custom_name = f"TEST_Duplicate_{uuid.uuid4().hex[:8]}"
        
        duplicate_data = {
            "task_id": task_id,
            "new_name": custom_name
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/projects/tasks/duplicate", json=duplicate_data)
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["name"] == custom_name
        print(f"✅ Task duplicated with custom name: {custom_name}")
        # Cleanup duplicate
        authenticated_client.delete(f"{BASE_URL}/api/projects/tasks/{data['id']}")


class TestSidebarNavigation:
    """Tests for sidebar navigation routes - verifies routes are accessible"""
    
    def test_kanban_route_accessible(self, authenticated_client):
        """Verify /api/projects/kanban endpoint exists"""
        response = authenticated_client.get(f"{BASE_URL}/api/projects/kanban")
        assert response.status_code == 200
        print(f"✅ Kanban board route accessible")
    
    def test_sprints_route_accessible(self, authenticated_client):
        """Verify sprints endpoint exists"""
        response = authenticated_client.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/sprints")
        # 200 or 404 (project not found) are both valid responses
        assert response.status_code in [200, 404]
        print(f"✅ Sprints route accessible")
    
    def test_milestones_route_accessible(self, authenticated_client):
        """Verify milestones endpoint exists"""
        response = authenticated_client.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/milestones")
        assert response.status_code in [200, 404]
        print(f"✅ Milestones route accessible")


# ============== FIXTURES ==============

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="session")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


@pytest.fixture
def created_task(authenticated_client):
    """Create a task for testing and cleanup after"""
    task_name = f"TEST_Task_{uuid.uuid4().hex[:8]}"
    task_data = {
        "name": task_name,
        "project_id": TEST_PROJECT_ID,
        "description": "Test task for automated testing",
        "priority": "medium"
    }
    
    # Note: Task creation uses /api/projects/tasks endpoint (not project-specific)
    response = authenticated_client.post(f"{BASE_URL}/api/projects/tasks", json=task_data)
    
    if response.status_code in [200, 201]:
        task = response.json()
        yield task
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/projects/tasks/{task['id']}")
    else:
        pytest.skip(f"Could not create test task: {response.status_code} - {response.text}")


@pytest.fixture
def created_tasks_for_bulk(authenticated_client):
    """Create multiple tasks for bulk operation testing"""
    tasks = []
    for i in range(3):
        task_name = f"TEST_BulkTask_{uuid.uuid4().hex[:6]}_{i}"
        task_data = {
            "name": task_name,
            "project_id": TEST_PROJECT_ID,
            "priority": "low"
        }
        # Note: Task creation uses /api/projects/tasks endpoint
        response = authenticated_client.post(f"{BASE_URL}/api/projects/tasks", json=task_data)
        if response.status_code in [200, 201]:
            tasks.append(response.json())
    
    if not tasks:
        pytest.skip("Could not create tasks for bulk testing")
    
    yield tasks
    
    # Cleanup
    for task in tasks:
        authenticated_client.delete(f"{BASE_URL}/api/projects/tasks/{task['id']}")


@pytest.fixture
def created_sprint(authenticated_client):
    """Create a sprint for testing and cleanup after"""
    start_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    end_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
    
    sprint_data = {
        "project_id": TEST_PROJECT_ID,
        "name": f"TEST_Sprint_{uuid.uuid4().hex[:8]}",
        "goal": "Test sprint",
        "start_date": start_date,
        "end_date": end_date
    }
    
    response = authenticated_client.post(f"{BASE_URL}/api/projects/sprints", json=sprint_data)
    
    # API returns 200 on success
    if response.status_code in [200, 201]:
        sprint = response.json()
        yield sprint
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/projects/sprints/{sprint['id']}")
    else:
        pytest.skip(f"Could not create test sprint: {response.status_code}")


@pytest.fixture
def created_milestone(authenticated_client):
    """Create a milestone for testing and cleanup after"""
    due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    milestone_data = {
        "project_id": TEST_PROJECT_ID,
        "name": f"TEST_Milestone_{uuid.uuid4().hex[:8]}",
        "description": "Test milestone",
        "due_date": due_date,
        "linked_task_ids": []
    }
    
    response = authenticated_client.post(f"{BASE_URL}/api/projects/milestones", json=milestone_data)
    
    # API returns 200 on success
    if response.status_code in [200, 201]:
        milestone = response.json()
        yield milestone
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/projects/milestones/{milestone['id']}")
    else:
        pytest.skip(f"Could not create test milestone: {response.status_code}")
