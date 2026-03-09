"""
Test Suite for Enhanced Project Management System
Testing: Auto-generated Project IDs (PRJ-XXXX), Project Type, Department, Project Manager fields
Testing: Task Dependencies - 'Blocked by' and 'Blocks' relationships
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"


class TestProjectDependencies:
    """Tests for Enhanced Project Management with Dependencies"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_client):
        """Setup with authenticated client"""
        self.client = authenticated_client
    
    # ========== PROJECT CREATION TESTS ==========
    
    def test_project_creation_auto_generates_project_id(self, authenticated_client):
        """Test that creating a project auto-generates PRJ-XXXX format ID"""
        # First, get a valid module ID
        modules_res = authenticated_client.get(f"{BASE_URL}/api/projects/modules")
        assert modules_res.status_code == 200, f"Failed to get modules: {modules_res.text}"
        modules = modules_res.json()
        assert len(modules) > 0, "No modules available for testing"
        module_id = modules[0]["id"]
        
        # Create a project
        project_payload = {
            "name": "TEST_AutoID Project",
            "module_id": module_id,
            "project_type": "marketing",
            "priority": "medium",
            "description": "Test project for auto-ID generation"
        }
        
        res = authenticated_client.post(f"{BASE_URL}/api/projects", json=project_payload)
        assert res.status_code == 200, f"Failed to create project: {res.text}"
        
        project = res.json()
        # Verify project_id is in PRJ-XXXX format
        assert "project_id" in project, "project_id field missing from response"
        assert project["project_id"].startswith("PRJ-"), f"Project ID doesn't start with PRJ-: {project['project_id']}"
        
        # Clean up
        authenticated_client.delete(f"{BASE_URL}/api/projects/{project['id']}")
        print(f"PASS: Project auto-generated ID: {project['project_id']}")
    
    def test_project_creation_with_project_type(self, authenticated_client):
        """Test creating project with project_type field"""
        modules_res = authenticated_client.get(f"{BASE_URL}/api/projects/modules")
        modules = modules_res.json()
        module_id = modules[0]["id"]
        
        project_types = ["marketing", "development", "pr", "design", "operations", "other"]
        
        for ptype in project_types:
            project_payload = {
                "name": f"TEST_ProjectType_{ptype}",
                "module_id": module_id,
                "project_type": ptype,
                "priority": "medium"
            }
            
            res = authenticated_client.post(f"{BASE_URL}/api/projects", json=project_payload)
            assert res.status_code == 200, f"Failed to create project with type {ptype}: {res.text}"
            
            project = res.json()
            assert project["project_type"] == ptype, f"Expected type {ptype}, got {project['project_type']}"
            
            # Clean up
            authenticated_client.delete(f"{BASE_URL}/api/projects/{project['id']}")
        
        print(f"PASS: All project types work: {project_types}")
    
    def test_project_creation_with_department(self, authenticated_client):
        """Test creating project with department_id field"""
        # Get modules
        modules_res = authenticated_client.get(f"{BASE_URL}/api/projects/modules")
        modules = modules_res.json()
        module_id = modules[0]["id"]
        
        # Get departments
        depts_res = authenticated_client.get(f"{BASE_URL}/api/workos/departments")
        if depts_res.status_code == 200:
            depts = depts_res.json()
            if len(depts) > 0:
                dept_id = depts[0]["id"]
                
                project_payload = {
                    "name": "TEST_DepartmentProject",
                    "module_id": module_id,
                    "department_id": dept_id,
                    "project_type": "marketing",
                    "priority": "medium"
                }
                
                res = authenticated_client.post(f"{BASE_URL}/api/projects", json=project_payload)
                assert res.status_code == 200, f"Failed to create project with department: {res.text}"
                
                project = res.json()
                assert project["department_id"] == dept_id, "Department ID mismatch"
                assert "department_name" in project, "department_name not enriched in response"
                
                # Clean up
                authenticated_client.delete(f"{BASE_URL}/api/projects/{project['id']}")
                print(f"PASS: Project with department created, department_name: {project.get('department_name')}")
            else:
                print("SKIP: No departments available")
        else:
            print("SKIP: Departments API not accessible")
    
    def test_project_creation_with_project_manager(self, authenticated_client):
        """Test creating project with project_manager_id field"""
        # Get modules
        modules_res = authenticated_client.get(f"{BASE_URL}/api/projects/modules")
        modules = modules_res.json()
        module_id = modules[0]["id"]
        
        # Get users
        users_res = authenticated_client.get(f"{BASE_URL}/api/workos/users")
        if users_res.status_code == 200:
            users_data = users_res.json()
            users = users_data.get("users", users_data) if isinstance(users_data, dict) else users_data
            if len(users) > 0:
                user_id = users[0]["id"]
                
                project_payload = {
                    "name": "TEST_PMProject",
                    "module_id": module_id,
                    "project_manager_id": user_id,
                    "project_type": "development",
                    "priority": "high"
                }
                
                res = authenticated_client.post(f"{BASE_URL}/api/projects", json=project_payload)
                assert res.status_code == 200, f"Failed to create project with PM: {res.text}"
                
                project = res.json()
                assert project["project_manager_id"] == user_id, "Project Manager ID mismatch"
                assert "project_manager_name" in project, "project_manager_name not enriched in response"
                
                # Clean up
                authenticated_client.delete(f"{BASE_URL}/api/projects/{project['id']}")
                print(f"PASS: Project with Project Manager created, PM name: {project.get('project_manager_name')}")
            else:
                print("SKIP: No users available")
        else:
            print("SKIP: Users API not accessible")
    
    def test_project_list_returns_project_id_badge(self, authenticated_client):
        """Test that project list endpoint returns project_id for badge display"""
        res = authenticated_client.get(f"{BASE_URL}/api/projects/list")
        assert res.status_code == 200, f"Failed to list projects: {res.text}"
        
        projects = res.json()
        if len(projects) > 0:
            for project in projects[:3]:  # Check first 3
                assert "project_id" in project, f"project_id missing from list response for project {project.get('name')}"
                print(f"Project: {project['name']} has project_id: {project['project_id']}")
            print("PASS: Projects in list have project_id field")
        else:
            print("SKIP: No projects to check")
    
    # ========== TASK DEPENDENCY TESTS ==========
    
    def test_task_creation_with_dependencies(self, authenticated_client):
        """Test creating tasks with blocked_by and blocks relationships"""
        # Get or create project
        modules_res = authenticated_client.get(f"{BASE_URL}/api/projects/modules")
        modules = modules_res.json()
        module_id = modules[0]["id"]
        
        # Create test project
        project_res = authenticated_client.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_DependencyProject",
            "module_id": module_id,
            "project_type": "development",
            "priority": "medium"
        })
        project = project_res.json()
        project_id = project["id"]
        
        try:
            # Create blocking task
            task1_res = authenticated_client.post(f"{BASE_URL}/api/projects/tasks", json={
                "name": "TEST_BlockingTask",
                "project_id": project_id,
                "priority": "high",
                "blocked_by": [],
                "blocks": []
            })
            assert task1_res.status_code == 200, f"Failed to create task 1: {task1_res.text}"
            task1 = task1_res.json()
            
            # Create dependent task that's blocked by task1
            task2_res = authenticated_client.post(f"{BASE_URL}/api/projects/tasks", json={
                "name": "TEST_BlockedTask",
                "project_id": project_id,
                "priority": "medium",
                "blocked_by": [task1["id"]],
                "blocks": []
            })
            assert task2_res.status_code == 200, f"Failed to create task 2: {task2_res.text}"
            task2 = task2_res.json()
            
            # Verify blocked_by is set
            assert task2["blocked_by"] == [task1["id"]], "blocked_by not set correctly"
            assert task2["is_blocked"] == True, "is_blocked should be True when blocked_by has incomplete task"
            
            print(f"PASS: Task {task2['name']} is blocked by {task1['name']}")
            
        finally:
            # Clean up
            authenticated_client.delete(f"{BASE_URL}/api/projects/{project_id}")
    
    def test_task_dependency_update(self, authenticated_client):
        """Test updating task dependencies (adding blocked_by)"""
        modules_res = authenticated_client.get(f"{BASE_URL}/api/projects/modules")
        modules = modules_res.json()
        module_id = modules[0]["id"]
        
        # Create project
        project_res = authenticated_client.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_DepUpdateProject",
            "module_id": module_id,
            "project_type": "marketing",
            "priority": "medium"
        })
        project = project_res.json()
        project_id = project["id"]
        
        try:
            # Create two independent tasks
            task1_res = authenticated_client.post(f"{BASE_URL}/api/projects/tasks", json={
                "name": "TEST_Task1",
                "project_id": project_id,
                "priority": "high"
            })
            task1 = task1_res.json()
            
            task2_res = authenticated_client.post(f"{BASE_URL}/api/projects/tasks", json={
                "name": "TEST_Task2",
                "project_id": project_id,
                "priority": "medium"
            })
            task2 = task2_res.json()
            
            # Update task2 to be blocked by task1
            update_res = authenticated_client.put(f"{BASE_URL}/api/projects/tasks/{task2['id']}", json={
                "blocked_by": [task1["id"]]
            })
            assert update_res.status_code == 200, f"Failed to update task: {update_res.text}"
            updated_task = update_res.json()
            
            assert updated_task["blocked_by"] == [task1["id"]], "blocked_by not updated"
            assert updated_task["is_blocked"] == True, "Task should be blocked"
            
            # Verify reverse relationship - task1 should now have task2 in its blocks
            task1_check = authenticated_client.get(f"{BASE_URL}/api/projects/tasks/{task1['id']}").json()
            assert task2["id"] in task1_check.get("blocks", []), "Reverse relationship 'blocks' not set"
            
            print("PASS: Task dependencies can be updated and reverse relationships work")
            
        finally:
            authenticated_client.delete(f"{BASE_URL}/api/projects/{project_id}")
    
    def test_blocked_task_cannot_move_to_in_progress(self, authenticated_client):
        """Test that blocked tasks cannot be moved to in_progress or beyond"""
        modules_res = authenticated_client.get(f"{BASE_URL}/api/projects/modules")
        modules = modules_res.json()
        module_id = modules[0]["id"]
        
        # Create project
        project_res = authenticated_client.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_BlockMoveProject",
            "module_id": module_id,
            "project_type": "development",
            "priority": "high"
        })
        project = project_res.json()
        project_id = project["id"]
        
        try:
            # Create blocking task (not completed)
            task1_res = authenticated_client.post(f"{BASE_URL}/api/projects/tasks", json={
                "name": "TEST_BlockerTask",
                "project_id": project_id,
                "priority": "high"
            })
            task1 = task1_res.json()
            
            # Create blocked task
            task2_res = authenticated_client.post(f"{BASE_URL}/api/projects/tasks", json={
                "name": "TEST_BlockedMoveTask",
                "project_id": project_id,
                "priority": "medium",
                "blocked_by": [task1["id"]]
            })
            task2 = task2_res.json()
            
            # Try to move blocked task to in_progress - should fail
            update_res = authenticated_client.put(f"{BASE_URL}/api/projects/tasks/{task2['id']}", json={
                "status": "in_progress"
            })
            
            assert update_res.status_code == 400, f"Should not allow moving blocked task. Got status: {update_res.status_code}"
            error_msg = update_res.json().get("detail", "")
            assert "blocked" in error_msg.lower(), f"Error should mention blocking: {error_msg}"
            
            print(f"PASS: Blocked task correctly prevented from moving. Error: {error_msg}")
            
        finally:
            authenticated_client.delete(f"{BASE_URL}/api/projects/{project_id}")
    
    def test_task_can_move_after_dependency_resolved(self, authenticated_client):
        """Test that task can move to in_progress after blocking task is completed"""
        modules_res = authenticated_client.get(f"{BASE_URL}/api/projects/modules")
        modules = modules_res.json()
        module_id = modules[0]["id"]
        
        # Create project
        project_res = authenticated_client.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_ResolveDepProject",
            "module_id": module_id,
            "project_type": "development",
            "priority": "medium"
        })
        project = project_res.json()
        project_id = project["id"]
        
        try:
            # Create blocking task
            task1_res = authenticated_client.post(f"{BASE_URL}/api/projects/tasks", json={
                "name": "TEST_BlockerToComplete",
                "project_id": project_id,
                "priority": "high"
            })
            task1 = task1_res.json()
            
            # Create blocked task
            task2_res = authenticated_client.post(f"{BASE_URL}/api/projects/tasks", json={
                "name": "TEST_WaitingTask",
                "project_id": project_id,
                "priority": "medium",
                "blocked_by": [task1["id"]]
            })
            task2 = task2_res.json()
            
            # Complete the blocker task
            authenticated_client.put(f"{BASE_URL}/api/projects/tasks/{task1['id']}", json={
                "status": "completed"
            })
            
            # Now task2 should be able to move to in_progress
            update_res = authenticated_client.put(f"{BASE_URL}/api/projects/tasks/{task2['id']}", json={
                "status": "in_progress"
            })
            
            assert update_res.status_code == 200, f"Should allow moving after dependency resolved. Got: {update_res.text}"
            updated_task = update_res.json()
            assert updated_task["status"] == "in_progress", "Status should be in_progress"
            assert updated_task["is_blocked"] == False, "Task should no longer be blocked"
            
            print("PASS: Task can move after dependency is completed")
            
        finally:
            authenticated_client.delete(f"{BASE_URL}/api/projects/{project_id}")
    
    def test_task_response_includes_dependency_names(self, authenticated_client):
        """Test that task response includes blocked_by_names and blocks_names"""
        modules_res = authenticated_client.get(f"{BASE_URL}/api/projects/modules")
        modules = modules_res.json()
        module_id = modules[0]["id"]
        
        # Create project
        project_res = authenticated_client.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_DepNamesProject",
            "module_id": module_id,
            "project_type": "pr",
            "priority": "medium"
        })
        project = project_res.json()
        project_id = project["id"]
        
        try:
            # Create blocking task
            task1_res = authenticated_client.post(f"{BASE_URL}/api/projects/tasks", json={
                "name": "TEST_NamedBlocker",
                "project_id": project_id,
                "priority": "high"
            })
            task1 = task1_res.json()
            
            # Create blocked task
            task2_res = authenticated_client.post(f"{BASE_URL}/api/projects/tasks", json={
                "name": "TEST_NamedBlocked",
                "project_id": project_id,
                "priority": "medium",
                "blocked_by": [task1["id"]]
            })
            task2 = task2_res.json()
            
            # Fetch task2 and check for names
            task2_detail = authenticated_client.get(f"{BASE_URL}/api/projects/tasks/{task2['id']}").json()
            
            assert "blocked_by_names" in task2_detail, "blocked_by_names field missing"
            assert "TEST_NamedBlocker" in task2_detail["blocked_by_names"], "Blocker name not included"
            
            # Check reverse on task1
            task1_detail = authenticated_client.get(f"{BASE_URL}/api/projects/tasks/{task1['id']}").json()
            
            assert "blocks_names" in task1_detail, "blocks_names field missing"
            assert "TEST_NamedBlocked" in task1_detail["blocks_names"], "Blocked task name not included"
            
            print(f"PASS: Task dependency names resolved: blocked_by_names={task2_detail['blocked_by_names']}")
            
        finally:
            authenticated_client.delete(f"{BASE_URL}/api/projects/{project_id}")
    
    def test_remove_dependency(self, authenticated_client):
        """Test removing a task dependency"""
        modules_res = authenticated_client.get(f"{BASE_URL}/api/projects/modules")
        modules = modules_res.json()
        module_id = modules[0]["id"]
        
        # Create project
        project_res = authenticated_client.post(f"{BASE_URL}/api/projects", json={
            "name": "TEST_RemoveDepProject",
            "module_id": module_id,
            "project_type": "other",
            "priority": "low"
        })
        project = project_res.json()
        project_id = project["id"]
        
        try:
            # Create blocking task
            task1_res = authenticated_client.post(f"{BASE_URL}/api/projects/tasks", json={
                "name": "TEST_BlockerToRemove",
                "project_id": project_id,
                "priority": "high"
            })
            task1 = task1_res.json()
            
            # Create blocked task
            task2_res = authenticated_client.post(f"{BASE_URL}/api/projects/tasks", json={
                "name": "TEST_WillBeUnblocked",
                "project_id": project_id,
                "priority": "medium",
                "blocked_by": [task1["id"]]
            })
            task2 = task2_res.json()
            
            assert task2["is_blocked"] == True, "Should start as blocked"
            
            # Remove the dependency by updating blocked_by to empty
            update_res = authenticated_client.put(f"{BASE_URL}/api/projects/tasks/{task2['id']}", json={
                "blocked_by": []
            })
            
            assert update_res.status_code == 200, f"Failed to remove dependency: {update_res.text}"
            updated_task = update_res.json()
            
            assert updated_task["blocked_by"] == [], "blocked_by should be empty"
            assert updated_task["is_blocked"] == False, "Task should no longer be blocked"
            
            # Check reverse - task1 should no longer have task2 in blocks
            task1_detail = authenticated_client.get(f"{BASE_URL}/api/projects/tasks/{task1['id']}").json()
            assert task2["id"] not in task1_detail.get("blocks", []), "Reverse relationship should be removed"
            
            print("PASS: Dependency removed and reverse relationship updated")
            
        finally:
            authenticated_client.delete(f"{BASE_URL}/api/projects/{project_id}")


# ========== FIXTURES ==========

@pytest.fixture(scope="module")
def api_session():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_session):
    """Get authentication token"""
    response = api_session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        # Try both 'access_token' and 'token' field names
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.fail(f"Authentication failed: {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_session, auth_token):
    """Session with auth header"""
    api_session.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_session


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
