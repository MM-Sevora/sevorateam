"""
Project Management System API Tests
Tests for: Modules, Projects, Tasks, Subtasks, Checklists, Comments, Activity Logs, My Tasks Dashboard
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "superadmin@sevora.com"
SUPERADMIN_PASSWORD = "superadmin123"

# Track created test data for cleanup
created_ids = {
    "modules": [],
    "projects": [],
    "tasks": [],
    "subtasks": [],
    "checklists": [],
    "comments": []
}

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for superadmin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPERADMIN_EMAIL,
        "password": SUPERADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("access_token")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }

@pytest.fixture(scope="module")
def user_info(auth_token):
    """Get current user info"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    if response.status_code == 200:
        return response.json()
    return {}


# ============== PM MODULES TESTS ==============

class TestPMModules:
    """Tests for PM Modules CRUD operations"""
    
    def test_create_module(self, auth_headers):
        """Test creating a new PM module"""
        payload = {
            "name": f"TEST_Module_{uuid.uuid4().hex[:8]}",
            "description": "Test module for API testing",
            "color": "#FF5733",
            "icon": "Folder"
        }
        response = requests.post(f"{BASE_URL}/api/projects/modules", headers=auth_headers, json=payload)
        
        assert response.status_code == 200, f"Failed to create module: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["description"] == payload["description"]
        assert data["color"] == payload["color"]
        assert data["is_active"] == True
        assert "created_at" in data
        
        # Store for cleanup
        created_ids["modules"].append(data["id"])
        print(f"Created module: {data['id']}")
    
    def test_list_modules(self, auth_headers):
        """Test listing all PM modules"""
        response = requests.get(f"{BASE_URL}/api/projects/modules", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to list modules: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            module = data[0]
            assert "id" in module
            assert "name" in module
            assert "project_count" in module
    
    def test_get_module_by_id(self, auth_headers):
        """Test getting a single module by ID"""
        if not created_ids["modules"]:
            pytest.skip("No modules created yet")
        
        module_id = created_ids["modules"][0]
        response = requests.get(f"{BASE_URL}/api/projects/modules/{module_id}", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to get module: {response.text}"
        data = response.json()
        
        assert data["id"] == module_id
        assert "name" in data
        assert "project_count" in data
    
    def test_update_module(self, auth_headers):
        """Test updating a module"""
        if not created_ids["modules"]:
            pytest.skip("No modules created yet")
        
        module_id = created_ids["modules"][0]
        payload = {
            "name": f"TEST_Updated_Module_{uuid.uuid4().hex[:8]}",
            "description": "Updated description",
            "color": "#00FF00"
        }
        response = requests.put(f"{BASE_URL}/api/projects/modules/{module_id}", headers=auth_headers, json=payload)
        
        assert response.status_code == 200, f"Failed to update module: {response.text}"
        data = response.json()
        
        assert data["name"] == payload["name"]
        assert data["description"] == payload["description"]
        assert data["color"] == payload["color"]
        
        # Verify GET returns updated data
        verify_response = requests.get(f"{BASE_URL}/api/projects/modules/{module_id}", headers=auth_headers)
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["name"] == payload["name"]


# ============== PROJECTS TESTS ==============

class TestProjects:
    """Tests for Projects CRUD operations"""
    
    def test_create_project(self, auth_headers, user_info):
        """Test creating a new project"""
        # First ensure we have a module
        if not created_ids["modules"]:
            # Create a module first
            module_payload = {"name": f"TEST_ProjectModule_{uuid.uuid4().hex[:8]}"}
            module_response = requests.post(f"{BASE_URL}/api/projects/modules", headers=auth_headers, json=module_payload)
            if module_response.status_code == 200:
                created_ids["modules"].append(module_response.json()["id"])
        
        module_id = created_ids["modules"][0]
        
        # Use future dates
        start_date = datetime.now(timezone.utc).isoformat()
        end_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        
        payload = {
            "name": f"TEST_Project_{uuid.uuid4().hex[:8]}",
            "module_id": module_id,
            "description": "Test project for API testing",
            "priority": "high",
            "start_date": start_date,
            "end_date": end_date,
            "team_members": [],
            "tags": ["test", "api"]
        }
        response = requests.post(f"{BASE_URL}/api/projects", headers=auth_headers, json=payload)
        
        assert response.status_code == 200, f"Failed to create project: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["module_id"] == module_id
        assert data["status"] == "draft"
        assert data["priority"] == "high"
        assert data["task_count"] == 0
        
        created_ids["projects"].append(data["id"])
        print(f"Created project: {data['id']}")
    
    def test_list_projects(self, auth_headers):
        """Test listing all projects"""
        response = requests.get(f"{BASE_URL}/api/projects/list", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to list projects: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            project = data[0]
            assert "id" in project
            assert "name" in project
            assert "task_count" in project
            assert "progress" in project
    
    def test_get_project_by_id(self, auth_headers):
        """Test getting a single project by ID"""
        if not created_ids["projects"]:
            pytest.skip("No projects created yet")
        
        project_id = created_ids["projects"][0]
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to get project: {response.text}"
        data = response.json()
        
        assert data["id"] == project_id
        assert "name" in data
        assert "task_count" in data
        assert "progress" in data
    
    def test_update_project(self, auth_headers):
        """Test updating a project"""
        if not created_ids["projects"]:
            pytest.skip("No projects created yet")
        
        project_id = created_ids["projects"][0]
        payload = {
            "name": f"TEST_Updated_Project_{uuid.uuid4().hex[:8]}",
            "description": "Updated project description",
            "priority": "urgent",
            "status": "active"
        }
        response = requests.put(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers, json=payload)
        
        assert response.status_code == 200, f"Failed to update project: {response.text}"
        data = response.json()
        
        assert data["name"] == payload["name"]
        assert data["priority"] == "urgent"
        assert data["status"] == "active"
        
        # Verify persistence
        verify_response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        verify_data = verify_response.json()
        assert verify_data["name"] == payload["name"]


# ============== TASKS TESTS ==============

class TestTasks:
    """Tests for Tasks CRUD operations"""
    
    def test_create_task(self, auth_headers, user_info):
        """Test creating a new task"""
        if not created_ids["projects"]:
            pytest.skip("No projects created yet")
        
        project_id = created_ids["projects"][0]
        user_id = user_info.get("id")
        due_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        
        payload = {
            "name": f"TEST_Task_{uuid.uuid4().hex[:8]}",
            "project_id": project_id,
            "description": "Test task for API testing",
            "priority": "high",
            "assigned_to": user_id,
            "due_date": due_date,
            "estimated_hours": 8.0,
            "tags": ["test"]
        }
        response = requests.post(f"{BASE_URL}/api/projects/tasks", headers=auth_headers, json=payload)
        
        assert response.status_code == 200, f"Failed to create task: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["project_id"] == project_id
        assert data["priority"] == "high"
        assert "status" in data
        assert "subtask_count" in data
        assert "checklist_count" in data
        
        created_ids["tasks"].append(data["id"])
        print(f"Created task: {data['id']}")
    
    def test_list_all_tasks(self, auth_headers):
        """Test listing all tasks"""
        response = requests.get(f"{BASE_URL}/api/projects/tasks/all", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to list tasks: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            task = data[0]
            assert "id" in task
            assert "name" in task
            assert "status" in task
            assert "project_id" in task
    
    def test_list_project_tasks(self, auth_headers):
        """Test listing tasks for a specific project"""
        if not created_ids["projects"]:
            pytest.skip("No projects created yet")
        
        project_id = created_ids["projects"][0]
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}/tasks", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to list project tasks: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
    
    def test_get_task_by_id(self, auth_headers):
        """Test getting a single task by ID"""
        if not created_ids["tasks"]:
            pytest.skip("No tasks created yet")
        
        task_id = created_ids["tasks"][0]
        response = requests.get(f"{BASE_URL}/api/projects/tasks/{task_id}", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to get task: {response.text}"
        data = response.json()
        
        assert data["id"] == task_id
        assert "name" in data
        assert "subtask_count" in data
        assert "checklist_count" in data
        assert "comment_count" in data
    
    def test_update_task_status(self, auth_headers):
        """Test updating task status"""
        if not created_ids["tasks"]:
            pytest.skip("No tasks created yet")
        
        task_id = created_ids["tasks"][0]
        payload = {"status": "in_progress"}
        response = requests.put(f"{BASE_URL}/api/projects/tasks/{task_id}", headers=auth_headers, json=payload)
        
        assert response.status_code == 200, f"Failed to update task: {response.text}"
        data = response.json()
        
        assert data["status"] == "in_progress"
        
        # Verify persistence
        verify_response = requests.get(f"{BASE_URL}/api/projects/tasks/{task_id}", headers=auth_headers)
        verify_data = verify_response.json()
        assert verify_data["status"] == "in_progress"


# ============== SUBTASKS TESTS ==============

class TestSubtasks:
    """Tests for Subtasks CRUD operations"""
    
    def test_create_subtask(self, auth_headers):
        """Test creating a new subtask"""
        if not created_ids["tasks"]:
            pytest.skip("No tasks created yet")
        
        parent_task_id = created_ids["tasks"][0]
        
        payload = {
            "name": f"TEST_Subtask_{uuid.uuid4().hex[:8]}",
            "parent_task_id": parent_task_id,
            "due_date": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        }
        response = requests.post(f"{BASE_URL}/api/projects/subtasks", headers=auth_headers, json=payload)
        
        assert response.status_code == 200, f"Failed to create subtask: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["name"] == payload["name"]
        assert data["parent_task_id"] == parent_task_id
        assert "status" in data
        
        created_ids["subtasks"].append(data["id"])
        print(f"Created subtask: {data['id']}")
    
    def test_list_subtasks(self, auth_headers):
        """Test listing subtasks for a task"""
        if not created_ids["tasks"]:
            pytest.skip("No tasks created yet")
        
        task_id = created_ids["tasks"][0]
        response = requests.get(f"{BASE_URL}/api/projects/tasks/{task_id}/subtasks", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to list subtasks: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
    
    def test_update_subtask(self, auth_headers):
        """Test updating a subtask"""
        if not created_ids["subtasks"]:
            pytest.skip("No subtasks created yet")
        
        subtask_id = created_ids["subtasks"][0]
        payload = {
            "name": f"TEST_Updated_Subtask_{uuid.uuid4().hex[:8]}",
            "status": "in_progress"
        }
        response = requests.put(f"{BASE_URL}/api/projects/subtasks/{subtask_id}", headers=auth_headers, json=payload)
        
        assert response.status_code == 200, f"Failed to update subtask: {response.text}"
        data = response.json()
        
        assert data["name"] == payload["name"]
        assert data["status"] == "in_progress"


# ============== CHECKLISTS TESTS ==============

class TestChecklists:
    """Tests for Checklists CRUD operations"""
    
    def test_create_checklist_item(self, auth_headers):
        """Test creating a new checklist item"""
        if not created_ids["tasks"]:
            pytest.skip("No tasks created yet")
        
        task_id = created_ids["tasks"][0]
        
        payload = {
            "task_id": task_id,
            "text": f"TEST_Checklist Item {uuid.uuid4().hex[:8]}"
        }
        response = requests.post(f"{BASE_URL}/api/projects/checklists", headers=auth_headers, json=payload)
        
        assert response.status_code == 200, f"Failed to create checklist: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["text"] == payload["text"]
        assert data["task_id"] == task_id
        assert data["is_completed"] == False
        
        created_ids["checklists"].append(data["id"])
        print(f"Created checklist item: {data['id']}")
    
    def test_list_checklists(self, auth_headers):
        """Test listing checklist items for a task"""
        if not created_ids["tasks"]:
            pytest.skip("No tasks created yet")
        
        task_id = created_ids["tasks"][0]
        response = requests.get(f"{BASE_URL}/api/projects/tasks/{task_id}/checklists", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to list checklists: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
    
    def test_toggle_checklist_completion(self, auth_headers):
        """Test toggling checklist item completion"""
        if not created_ids["checklists"]:
            pytest.skip("No checklists created yet")
        
        item_id = created_ids["checklists"][0]
        
        # Mark as completed
        payload = {"is_completed": True}
        response = requests.put(f"{BASE_URL}/api/projects/checklists/{item_id}", headers=auth_headers, json=payload)
        
        assert response.status_code == 200, f"Failed to update checklist: {response.text}"
        data = response.json()
        
        assert data["is_completed"] == True
        assert "completed_by" in data
        assert "completed_at" in data


# ============== COMMENTS TESTS ==============

class TestComments:
    """Tests for Comments CRUD operations"""
    
    def test_create_comment(self, auth_headers):
        """Test creating a new comment"""
        if not created_ids["tasks"]:
            pytest.skip("No tasks created yet")
        
        task_id = created_ids["tasks"][0]
        
        payload = {
            "task_id": task_id,
            "content": f"TEST_Comment: This is a test comment {uuid.uuid4().hex[:8]}",
            "mentions": []
        }
        response = requests.post(f"{BASE_URL}/api/projects/comments", headers=auth_headers, json=payload)
        
        assert response.status_code == 200, f"Failed to create comment: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["content"] == payload["content"]
        assert data["task_id"] == task_id
        assert "author_id" in data
        assert "created_at" in data
        
        created_ids["comments"].append(data["id"])
        print(f"Created comment: {data['id']}")
    
    def test_list_comments(self, auth_headers):
        """Test listing comments for a task"""
        if not created_ids["tasks"]:
            pytest.skip("No tasks created yet")
        
        task_id = created_ids["tasks"][0]
        response = requests.get(f"{BASE_URL}/api/projects/tasks/{task_id}/comments", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to list comments: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)


# ============== MY TASKS DASHBOARD TESTS ==============

class TestMyTasksDashboard:
    """Tests for My Tasks Dashboard API"""
    
    def test_get_my_tasks(self, auth_headers):
        """Test getting my tasks dashboard data"""
        response = requests.get(f"{BASE_URL}/api/projects/my-tasks", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to get my tasks: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "tasks_assigned" in data
        assert "tasks_due_today" in data
        assert "tasks_overdue" in data
        assert "tasks_in_progress" in data
        assert "tasks_pending_review" in data
        assert "recently_completed" in data
        assert "stats" in data
        
        # Validate stats structure
        stats = data["stats"]
        assert "total_assigned" in stats
        assert "due_today" in stats
        assert "overdue" in stats
        assert "in_progress" in stats
        assert "pending_review" in stats
        assert "completed_this_week" in stats
        assert "total_completed" in stats
        
        print(f"My Tasks Stats: {stats}")
    
    def test_my_tasks_task_enrichment(self, auth_headers):
        """Test that my tasks are properly enriched with project/module info"""
        response = requests.get(f"{BASE_URL}/api/projects/my-tasks", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check if tasks have enriched fields
        for task in data.get("tasks_assigned", [])[:3]:
            assert "project_name" in task or task.get("project_id") is None
            assert "subtask_count" in task
            assert "checklist_count" in task
            assert "comment_count" in task


# ============== ACTIVITY LOG TESTS ==============

class TestActivityLog:
    """Tests for Activity Log API"""
    
    def test_list_activity(self, auth_headers):
        """Test listing activity logs"""
        response = requests.get(f"{BASE_URL}/api/projects/activity", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to list activity: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            log = data[0]
            assert "id" in log
            assert "entity_type" in log
            assert "action" in log
            assert "created_at" in log
    
    def test_filter_activity_by_entity_type(self, auth_headers):
        """Test filtering activity logs by entity type"""
        response = requests.get(f"{BASE_URL}/api/projects/activity?entity_type=task", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to filter activity: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        for log in data:
            assert log["entity_type"] == "task"


# ============== TIME LOGS TESTS ==============

class TestTimeLogs:
    """Tests for Time Logs API"""
    
    def test_create_time_log(self, auth_headers):
        """Test creating a time log"""
        if not created_ids["tasks"]:
            pytest.skip("No tasks created yet")
        
        task_id = created_ids["tasks"][0]
        
        payload = {
            "task_id": task_id,
            "description": "TEST: Worked on feature implementation",
            "hours": 2.5
        }
        response = requests.post(f"{BASE_URL}/api/projects/time-logs", headers=auth_headers, json=payload)
        
        assert response.status_code == 200, f"Failed to create time log: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["task_id"] == task_id
        assert data["hours"] == 2.5
        assert "user_id" in data
        
        print(f"Created time log: {data['id']}")
    
    def test_list_task_time_logs(self, auth_headers):
        """Test listing time logs for a task"""
        if not created_ids["tasks"]:
            pytest.skip("No tasks created yet")
        
        task_id = created_ids["tasks"][0]
        response = requests.get(f"{BASE_URL}/api/projects/tasks/{task_id}/time-logs", headers=auth_headers)
        
        assert response.status_code == 200, f"Failed to list time logs: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)


# ============== CLEANUP TESTS ==============

class TestCleanup:
    """Cleanup test data after all tests"""
    
    def test_delete_comments(self, auth_headers):
        """Delete test comments"""
        for comment_id in created_ids["comments"]:
            response = requests.delete(f"{BASE_URL}/api/projects/comments/{comment_id}", headers=auth_headers)
            print(f"Delete comment {comment_id}: {response.status_code}")
    
    def test_delete_checklists(self, auth_headers):
        """Delete test checklists"""
        for item_id in created_ids["checklists"]:
            response = requests.delete(f"{BASE_URL}/api/projects/checklists/{item_id}", headers=auth_headers)
            print(f"Delete checklist {item_id}: {response.status_code}")
    
    def test_delete_subtasks(self, auth_headers):
        """Delete test subtasks"""
        for subtask_id in created_ids["subtasks"]:
            response = requests.delete(f"{BASE_URL}/api/projects/subtasks/{subtask_id}", headers=auth_headers)
            print(f"Delete subtask {subtask_id}: {response.status_code}")
    
    def test_delete_tasks(self, auth_headers):
        """Delete test tasks"""
        for task_id in created_ids["tasks"]:
            response = requests.delete(f"{BASE_URL}/api/projects/tasks/{task_id}", headers=auth_headers)
            print(f"Delete task {task_id}: {response.status_code}")
    
    def test_delete_projects(self, auth_headers):
        """Delete test projects"""
        for project_id in created_ids["projects"]:
            response = requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
            print(f"Delete project {project_id}: {response.status_code}")
    
    def test_delete_modules(self, auth_headers):
        """Delete test modules"""
        for module_id in created_ids["modules"]:
            response = requests.delete(f"{BASE_URL}/api/projects/modules/{module_id}", headers=auth_headers)
            print(f"Delete module {module_id}: {response.status_code}")
