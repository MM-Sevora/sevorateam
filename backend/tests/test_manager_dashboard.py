"""
Test Suite for Manager Dashboard API
Tests the GET /api/projects/manager-dashboard endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestManagerDashboard:
    """Tests for Manager Dashboard API endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test credentials and token"""
        self.email = "superadmin@sevora.com"
        self.password = "superadmin123"
        self.token = None
        
        # Login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": self.email, "password": self.password}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        assert self.token, "No token received from login"
        
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_manager_dashboard_returns_200(self):
        """Test that manager dashboard endpoint returns 200 OK"""
        response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_manager_dashboard_project_stats_structure(self):
        """Test that dashboard returns correct project stats structure"""
        response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify project stats fields exist
        assert "total_projects" in data
        assert "active_projects" in data
        assert "completed_projects" in data
        assert "on_hold_projects" in data
        assert "at_risk_projects" in data
        
        # Verify they are integers
        assert isinstance(data["total_projects"], int)
        assert isinstance(data["active_projects"], int)
        assert isinstance(data["completed_projects"], int)
        assert isinstance(data["on_hold_projects"], int)
        assert isinstance(data["at_risk_projects"], int)
    
    def test_manager_dashboard_task_stats_structure(self):
        """Test that dashboard returns correct task stats structure"""
        response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify task stats fields exist
        assert "total_tasks" in data
        assert "completed_tasks" in data
        assert "overdue_tasks" in data
        assert "unassigned_tasks" in data
        assert "blocked_tasks" in data
        
        # Verify they are integers
        assert isinstance(data["total_tasks"], int)
        assert isinstance(data["completed_tasks"], int)
        assert isinstance(data["overdue_tasks"], int)
        assert isinstance(data["unassigned_tasks"], int)
        assert isinstance(data["blocked_tasks"], int)
    
    def test_manager_dashboard_projects_by_status(self):
        """Test projects by status breakdown structure"""
        response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "projects_by_status" in data
        projects_by_status = data["projects_by_status"]
        
        # Verify all status keys exist
        expected_statuses = ["draft", "active", "on_hold", "completed", "cancelled"]
        for status in expected_statuses:
            assert status in projects_by_status, f"Missing status: {status}"
            assert isinstance(projects_by_status[status], int)
    
    def test_manager_dashboard_projects_by_priority(self):
        """Test projects by priority breakdown structure"""
        response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "projects_by_priority" in data
        projects_by_priority = data["projects_by_priority"]
        
        # Verify all priority keys exist
        expected_priorities = ["urgent", "high", "medium", "low"]
        for priority in expected_priorities:
            assert priority in projects_by_priority, f"Missing priority: {priority}"
            assert isinstance(projects_by_priority[priority], int)
    
    def test_manager_dashboard_tasks_by_status(self):
        """Test tasks by status breakdown structure"""
        response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "tasks_by_status" in data
        tasks_by_status = data["tasks_by_status"]
        
        # Verify common status keys exist
        expected_statuses = ["draft", "assigned", "in_progress", "pending_review", "completed", "approved", "on_hold"]
        for status in expected_statuses:
            assert status in tasks_by_status, f"Missing task status: {status}"
            assert isinstance(tasks_by_status[status], int)
    
    def test_manager_dashboard_team_workload_structure(self):
        """Test team workload structure"""
        response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "team_workload" in data
        assert isinstance(data["team_workload"], list)
        
        # If there are team members, verify structure
        if len(data["team_workload"]) > 0:
            member = data["team_workload"][0]
            assert "user_id" in member
            assert "user_name" in member
            assert "total_tasks" in member
            assert "completed_tasks" in member
            assert "in_progress_tasks" in member
            assert "overdue_tasks" in member
    
    def test_manager_dashboard_at_risk_projects_structure(self):
        """Test at-risk projects list structure"""
        response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "at_risk_project_list" in data
        assert isinstance(data["at_risk_project_list"], list)
        
        # If there are at-risk projects, verify structure
        if len(data["at_risk_project_list"]) > 0:
            project = data["at_risk_project_list"][0]
            assert "id" in project
            assert "project_id" in project
            assert "name" in project
            assert "status" in project
            assert "priority" in project
            assert "progress" in project
    
    def test_manager_dashboard_upcoming_deadlines_structure(self):
        """Test upcoming deadlines structure"""
        response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "upcoming_deadlines" in data
        assert isinstance(data["upcoming_deadlines"], list)
    
    def test_manager_dashboard_recent_activity_structure(self):
        """Test recent activity structure"""
        response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "recent_activity" in data
        assert isinstance(data["recent_activity"], list)
        
        # If there are activities, verify structure
        if len(data["recent_activity"]) > 0:
            activity = data["recent_activity"][0]
            assert "id" in activity
            assert "entity_type" in activity
            assert "entity_id" in activity
            assert "action" in activity
            assert "user_id" in activity
            assert "created_at" in activity
    
    def test_manager_dashboard_weekly_completion_structure(self):
        """Test weekly completion chart data structure"""
        response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "weekly_completion" in data
        assert isinstance(data["weekly_completion"], list)
        assert len(data["weekly_completion"]) == 7, "Weekly completion should have 7 days"
        
        # Verify each day has required fields
        for day in data["weekly_completion"]:
            assert "date" in day  # Mon, Tue, etc.
            assert "full_date" in day  # YYYY-MM-DD
            assert "completed" in day
            assert isinstance(day["completed"], int)
    
    def test_manager_dashboard_data_consistency(self):
        """Test that project counts are consistent"""
        response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Sum of projects by status should equal total projects
        projects_by_status = data["projects_by_status"]
        status_sum = sum(projects_by_status.values())
        assert status_sum == data["total_projects"], \
            f"Projects by status sum ({status_sum}) doesn't match total ({data['total_projects']})"
    
    def test_manager_dashboard_requires_auth(self):
        """Test that endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard"
        )
        assert response.status_code in [401, 403], \
            f"Expected 401 or 403 without auth, got {response.status_code}"


class TestManagerDashboardWithData:
    """Additional tests that verify actual data values"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test credentials and token"""
        self.email = "superadmin@sevora.com"
        self.password = "superadmin123"
        
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": self.email, "password": self.password}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("access_token")
        
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_dashboard_shows_existing_projects(self):
        """Verify dashboard shows correct count of existing projects"""
        # Get projects list
        projects_response = requests.get(
            f"{BASE_URL}/api/projects/list",
            headers=self.headers
        )
        assert projects_response.status_code == 200
        projects = projects_response.json()
        
        # Get dashboard
        dashboard_response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert dashboard_response.status_code == 200
        dashboard = dashboard_response.json()
        
        # Verify counts match
        assert dashboard["total_projects"] == len(projects), \
            f"Dashboard shows {dashboard['total_projects']} projects, but list has {len(projects)}"
    
    def test_dashboard_shows_existing_tasks(self):
        """Verify dashboard shows correct count of existing tasks"""
        # Get all tasks
        tasks_response = requests.get(
            f"{BASE_URL}/api/projects/tasks/all",
            headers=self.headers
        )
        assert tasks_response.status_code == 200
        tasks = tasks_response.json()
        
        # Get dashboard
        dashboard_response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert dashboard_response.status_code == 200
        dashboard = dashboard_response.json()
        
        # Verify counts match (only parent tasks, not subtasks)
        parent_tasks = [t for t in tasks if not t.get("parent_task_id")]
        assert dashboard["total_tasks"] == len(parent_tasks), \
            f"Dashboard shows {dashboard['total_tasks']} tasks, but found {len(parent_tasks)} parent tasks"
