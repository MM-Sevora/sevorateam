"""
Test Bug Fixes - Iteration 37
1. POST /api/projects/{id}/members with user_id in body adds team member
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAddProjectMemberBody:
    """Tests for POST /api/projects/{id}/members with user_id in body"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        """Setup for each test"""
        self.client = api_client
        self.token = auth_token
        self.headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
    
    def test_add_member_to_project_with_body(self, api_client, auth_token):
        """Test adding team member to project using user_id in request body"""
        headers = {'Authorization': f'Bearer {auth_token}', 'Content-Type': 'application/json'}
        
        # First get list of projects
        projects_response = api_client.get(f"{BASE_URL}/api/projects/list", headers=headers)
        assert projects_response.status_code == 200, f"Failed to get projects: {projects_response.text}"
        projects = projects_response.json()
        
        if len(projects) == 0:
            pytest.skip("No projects available for testing")
        
        project = projects[0]
        project_id = project['id']
        
        # Get list of users
        users_response = api_client.get(f"{BASE_URL}/api/workos/users", headers=headers)
        assert users_response.status_code == 200, f"Failed to get users: {users_response.text}"
        users_data = users_response.json()
        users = users_data.get('users', users_data) if isinstance(users_data, dict) else users_data
        
        if len(users) < 2:
            pytest.skip("Not enough users for testing")
        
        # Find a user who is not already a team member
        current_members = project.get('team_members', [])
        user_to_add = None
        for user in users:
            if user['id'] not in current_members:
                user_to_add = user
                break
        
        if not user_to_add:
            pytest.skip("All users are already team members")
        
        # Add member using POST with user_id in body
        add_response = api_client.post(
            f"{BASE_URL}/api/projects/{project_id}/members",
            headers=headers,
            json={"user_id": user_to_add['id']}
        )
        
        assert add_response.status_code == 200, f"Failed to add member: {add_response.text}"
        add_data = add_response.json()
        assert 'team_members' in add_data
        assert user_to_add['id'] in add_data['team_members'], "User not found in team_members"
        print(f"✓ Successfully added user {user_to_add.get('name', user_to_add['id'])} to project")
        
        # Verify by fetching project again
        project_response = api_client.get(f"{BASE_URL}/api/projects/{project_id}", headers=headers)
        assert project_response.status_code == 200
        updated_project = project_response.json()
        assert user_to_add['id'] in updated_project.get('team_members', []), "User not persisted in team_members"
        print("✓ Verified user is persisted in project team_members")
    
    def test_add_member_invalid_user(self, api_client, auth_token):
        """Test adding invalid user returns 404"""
        headers = {'Authorization': f'Bearer {auth_token}', 'Content-Type': 'application/json'}
        
        # Get a project
        projects_response = api_client.get(f"{BASE_URL}/api/projects/list", headers=headers)
        assert projects_response.status_code == 200
        projects = projects_response.json()
        
        if len(projects) == 0:
            pytest.skip("No projects available")
        
        project_id = projects[0]['id']
        
        # Try to add invalid user
        response = api_client.post(
            f"{BASE_URL}/api/projects/{project_id}/members",
            headers=headers,
            json={"user_id": "invalid-user-id-that-does-not-exist"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Correctly returns 404 for invalid user_id")
    
    def test_add_member_invalid_project(self, api_client, auth_token):
        """Test adding member to invalid project returns 404"""
        headers = {'Authorization': f'Bearer {auth_token}', 'Content-Type': 'application/json'}
        
        # Get a valid user
        users_response = api_client.get(f"{BASE_URL}/api/workos/users", headers=headers)
        assert users_response.status_code == 200
        users_data = users_response.json()
        users = users_data.get('users', users_data) if isinstance(users_data, dict) else users_data
        
        if len(users) == 0:
            pytest.skip("No users available")
        
        user_id = users[0]['id']
        
        # Try to add to invalid project
        response = api_client.post(
            f"{BASE_URL}/api/projects/invalid-project-id/members",
            headers=headers,
            json={"user_id": user_id}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Correctly returns 404 for invalid project_id")


class TestProjectEditing:
    """Tests for project update/edit API"""
    
    def test_update_project_name_description(self, api_client, auth_token):
        """Test updating project name and description"""
        headers = {'Authorization': f'Bearer {auth_token}', 'Content-Type': 'application/json'}
        
        # Get projects
        projects_response = api_client.get(f"{BASE_URL}/api/projects/list", headers=headers)
        assert projects_response.status_code == 200
        projects = projects_response.json()
        
        if len(projects) == 0:
            pytest.skip("No projects available")
        
        project = projects[0]
        project_id = project['id']
        original_name = project['name']
        
        # Update project
        test_description = "TEST_Updated description for bug fix testing"
        update_response = api_client.put(
            f"{BASE_URL}/api/projects/{project_id}",
            headers=headers,
            json={"description": test_description}
        )
        
        assert update_response.status_code == 200, f"Failed to update project: {update_response.text}"
        updated = update_response.json()
        assert updated['description'] == test_description
        print(f"✓ Successfully updated project description")
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/projects/{project_id}", headers=headers)
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched['description'] == test_description
        print("✓ Update persisted correctly")
    
    def test_update_project_priority_visibility(self, api_client, auth_token):
        """Test updating project priority and visibility"""
        headers = {'Authorization': f'Bearer {auth_token}', 'Content-Type': 'application/json'}
        
        # Get projects
        projects_response = api_client.get(f"{BASE_URL}/api/projects/list", headers=headers)
        assert projects_response.status_code == 200
        projects = projects_response.json()
        
        if len(projects) == 0:
            pytest.skip("No projects available")
        
        project = projects[0]
        project_id = project['id']
        
        # Update priority and visibility
        update_response = api_client.put(
            f"{BASE_URL}/api/projects/{project_id}",
            headers=headers,
            json={"priority": "high", "visibility": "private"}
        )
        
        assert update_response.status_code == 200, f"Failed to update: {update_response.text}"
        updated = update_response.json()
        assert updated['priority'] == "high"
        assert updated.get('visibility') == "private"
        print("✓ Successfully updated priority and visibility")
        
        # Revert changes
        api_client.put(
            f"{BASE_URL}/api/projects/{project_id}",
            headers=headers,
            json={"priority": project.get('priority', 'medium'), "visibility": project.get('visibility', 'public')}
        )
    
    def test_update_project_dates(self, api_client, auth_token):
        """Test updating project start and end dates"""
        headers = {'Authorization': f'Bearer {auth_token}', 'Content-Type': 'application/json'}
        
        # Get projects
        projects_response = api_client.get(f"{BASE_URL}/api/projects/list", headers=headers)
        assert projects_response.status_code == 200
        projects = projects_response.json()
        
        if len(projects) == 0:
            pytest.skip("No projects available")
        
        project = projects[0]
        project_id = project['id']
        
        # Update dates
        test_start_date = "2026-02-01"
        test_end_date = "2026-12-31"
        
        update_response = api_client.put(
            f"{BASE_URL}/api/projects/{project_id}",
            headers=headers,
            json={"start_date": test_start_date, "end_date": test_end_date}
        )
        
        assert update_response.status_code == 200, f"Failed to update: {update_response.text}"
        updated = update_response.json()
        assert updated.get('start_date') == test_start_date or test_start_date in str(updated.get('start_date', ''))
        assert updated.get('end_date') == test_end_date or test_end_date in str(updated.get('end_date', ''))
        print("✓ Successfully updated project dates")


class TestMyTasksAPI:
    """Tests for my-tasks API that returns tasks assigned to user"""
    
    def test_my_tasks_endpoint(self, api_client, auth_token):
        """Test GET /api/projects/my-tasks endpoint"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        response = api_client.get(f"{BASE_URL}/api/projects/my-tasks", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert 'tasks_assigned' in data or 'stats' in data
        print("✓ my-tasks endpoint working correctly")
    
    def test_task_detail_endpoint(self, api_client, auth_token):
        """Test GET /api/projects/tasks/{id} endpoint for task detail modal"""
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Get my tasks first
        my_tasks_response = api_client.get(f"{BASE_URL}/api/projects/my-tasks", headers=headers)
        assert my_tasks_response.status_code == 200
        
        data = my_tasks_response.json()
        tasks = data.get('tasks_assigned', [])
        
        if len(tasks) == 0:
            # Try to get tasks from a project
            projects_response = api_client.get(f"{BASE_URL}/api/projects/list", headers=headers)
            if projects_response.status_code == 200:
                projects = projects_response.json()
                if len(projects) > 0:
                    tasks_response = api_client.get(
                        f"{BASE_URL}/api/projects/{projects[0]['id']}/tasks",
                        headers=headers
                    )
                    if tasks_response.status_code == 200:
                        tasks = tasks_response.json()
        
        if len(tasks) == 0:
            pytest.skip("No tasks available to test")
        
        task_id = tasks[0]['id']
        
        # Fetch task detail
        detail_response = api_client.get(f"{BASE_URL}/api/projects/tasks/{task_id}", headers=headers)
        assert detail_response.status_code == 200, f"Failed to get task detail: {detail_response.text}"
        
        task_detail = detail_response.json()
        assert 'id' in task_detail
        assert 'name' in task_detail
        assert 'status' in task_detail
        print(f"✓ Task detail API working: {task_detail.get('name')}")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get authentication token for superadmin"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "superadmin@sevora.com",
        "password": "superadmin123"
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Authentication failed: {response.text}")
