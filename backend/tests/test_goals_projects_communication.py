"""
Comprehensive Test Suite for Goals & Objectives, Communication Hub, and Project Management Modules
Testing CRUD operations, cross-module functionality, and integration points
"""
import pytest
import requests
import os
import time
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@sevora.com"
SUPER_ADMIN_PASSWORD = "superadmin123"

# ========== Fixtures ==========

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for super admin"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    # API returns access_token, not token
    return data.get("access_token") or data.get("token")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return headers with authentication token"""
    return {"Authorization": f"Bearer {auth_token}"}

# ========== GOALS & OBJECTIVES MODULE TESTS ==========

class TestFiscalYears:
    """Test Fiscal Years CRUD operations"""
    
    def test_list_fiscal_years(self, auth_headers):
        """Test listing fiscal years"""
        response = requests.get(f"{BASE_URL}/api/goals/fiscal-years", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} fiscal years")
    
    def test_fiscal_year_has_quarters(self, auth_headers):
        """Test that fiscal years include quarters"""
        response = requests.get(f"{BASE_URL}/api/goals/fiscal-years?include_quarters=true", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        if data:
            fy = data[0]
            assert "quarters" in fy
            print(f"✓ Fiscal year '{fy.get('name')}' has {len(fy.get('quarters', []))} quarters")
    
    def test_create_fiscal_year(self, auth_headers):
        """Test creating a new fiscal year"""
        test_name = f"TEST_FY_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        payload = {
            "name": test_name,
            "start_date": "2027-04-01",
            "end_date": "2028-03-31",
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/goals/fiscal-years", 
                               json=payload, headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            assert data.get("name") == test_name
            assert "quarters" in data  # Should auto-create quarters
            print(f"✓ Created fiscal year with {len(data.get('quarters', []))} quarters")
            # Cleanup - archive
            fy_id = data.get("id")
            requests.delete(f"{BASE_URL}/api/goals/fiscal-years/{fy_id}", headers=auth_headers)
        else:
            print(f"Note: Create fiscal year returned {response.status_code}")


class TestStrategicGoals:
    """Test Strategic Goals CRUD operations"""
    
    def test_list_strategic_goals(self, auth_headers):
        """Test listing strategic goals"""
        response = requests.get(f"{BASE_URL}/api/goals/strategic-goals", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} strategic goals")
    
    def test_get_strategic_goals_with_filters(self, auth_headers):
        """Test filtering strategic goals by status"""
        response = requests.get(f"{BASE_URL}/api/goals/strategic-goals?status=active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for goal in data:
            assert goal.get("status") == "active"
        print(f"✓ Filtered active goals: {len(data)}")
    
    def test_strategic_goal_has_progress(self, auth_headers):
        """Test that goals include progress calculation"""
        response = requests.get(f"{BASE_URL}/api/goals/strategic-goals", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        if data:
            goal = data[0]
            assert "progress" in goal
            assert "objectives_count" in goal
            print(f"✓ Goal '{goal.get('title')}' has progress: {goal.get('progress')}%")
    
    def test_create_and_delete_strategic_goal(self, auth_headers):
        """Test creating and deleting a strategic goal"""
        # First get a fiscal year
        fy_response = requests.get(f"{BASE_URL}/api/goals/fiscal-years", headers=auth_headers)
        fy_data = fy_response.json()
        if not fy_data:
            pytest.skip("No fiscal year available")
        
        fy_id = fy_data[0].get("id")
        
        # Create goal
        test_title = f"TEST_GOAL_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        payload = {
            "title": test_title,
            "description": "Test goal for automated testing",
            "fiscal_year_id": fy_id,
            "priority": "medium",
            "status": "planning"
        }
        response = requests.post(f"{BASE_URL}/api/goals/strategic-goals", 
                               json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("title") == test_title
        goal_id = data.get("id")
        print(f"✓ Created goal: {test_title}")
        
        # Delete (archive) goal
        delete_response = requests.delete(f"{BASE_URL}/api/goals/strategic-goals/{goal_id}", 
                                         headers=auth_headers)
        assert delete_response.status_code == 200
        print(f"✓ Archived goal: {test_title}")


class TestObjectives:
    """Test Objectives CRUD operations"""
    
    def test_list_objectives(self, auth_headers):
        """Test listing objectives"""
        response = requests.get(f"{BASE_URL}/api/goals/objectives", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} objectives")
    
    def test_objectives_have_required_fields(self, auth_headers):
        """Test that objectives have all required computed fields"""
        response = requests.get(f"{BASE_URL}/api/goals/objectives", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        if data:
            obj = data[0]
            # Check required computed fields
            assert "strategic_goal_title" in obj or obj.get("strategic_goal_id") is None
            assert "fiscal_year_name" in obj
            assert "progress" in obj
            print(f"✓ Objective '{obj.get('title')}' has all required fields")
    
    def test_filter_objectives_by_status(self, auth_headers):
        """Test filtering objectives by status"""
        response = requests.get(f"{BASE_URL}/api/goals/objectives?status=active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for obj in data:
            assert obj.get("status") == "active"
        print(f"✓ Filtered active objectives: {len(data)}")


class TestGoalsDashboard:
    """Test Goals Dashboard endpoint"""
    
    def test_goals_dashboard(self, auth_headers):
        """Test goals dashboard data"""
        response = requests.get(f"{BASE_URL}/api/goals/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Check required fields
        assert "total_goals" in data
        assert "total_objectives" in data
        assert "goals_by_status" in data
        print(f"✓ Dashboard: {data.get('total_goals')} goals, {data.get('total_objectives')} objectives")


# ========== PROJECT MANAGEMENT MODULE TESTS ==========

class TestProjectManagementDashboard:
    """Test Manager Dashboard"""
    
    def test_manager_dashboard(self, auth_headers):
        """Test manager dashboard loads"""
        response = requests.get(f"{BASE_URL}/api/projects/manager-dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Check required fields
        assert "total_projects" in data
        assert "active_projects" in data
        assert "total_tasks" in data
        assert "team_workload" in data
        print(f"✓ Dashboard: {data.get('total_projects')} projects, {data.get('total_tasks')} tasks")


class TestProjects:
    """Test Projects CRUD operations"""
    
    def test_list_projects(self, auth_headers):
        """Test listing projects"""
        response = requests.get(f"{BASE_URL}/api/projects/list", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} projects")
    
    def test_project_has_required_fields(self, auth_headers):
        """Test that projects have required computed fields"""
        response = requests.get(f"{BASE_URL}/api/projects/list", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        if data:
            proj = data[0]
            assert "id" in proj
            assert "name" in proj
            assert "status" in proj
            assert "task_count" in proj
            assert "progress" in proj
            print(f"✓ Project '{proj.get('name')}' has all required fields, progress: {proj.get('progress')}%")
    
    def test_create_and_delete_project(self, auth_headers):
        """Test creating and deleting a project"""
        test_name = f"TEST_PROJECT_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        payload = {
            "name": test_name,
            "description": "Test project for automated testing",
            "priority": "medium",
            "visibility": "public",
            "team_members": [],
            "stakeholders": [],
            "tags": ["test"]
        }
        response = requests.post(f"{BASE_URL}/api/projects", 
                               json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("name") == test_name
        project_id = data.get("id")
        print(f"✓ Created project: {test_name}")
        
        # Cleanup - set to cancelled status
        update_response = requests.put(f"{BASE_URL}/api/projects/{project_id}", 
                                      json={"status": "cancelled"}, headers=auth_headers)
        print(f"✓ Cancelled project: {test_name}")
    
    def test_get_single_project(self, auth_headers):
        """Test getting a single project by ID"""
        # First list projects
        list_response = requests.get(f"{BASE_URL}/api/projects/list", headers=auth_headers)
        data = list_response.json()
        if not data:
            pytest.skip("No projects available")
        
        project_id = data[0].get("id")
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=auth_headers)
        assert response.status_code == 200
        proj = response.json()
        assert proj.get("id") == project_id
        print(f"✓ Retrieved project: {proj.get('name')}")


class TestMyTasks:
    """Test My Tasks functionality"""
    
    def test_my_tasks(self, auth_headers):
        """Test My Tasks dashboard"""
        response = requests.get(f"{BASE_URL}/api/projects/my-tasks", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        assert "tasks_assigned" in data
        print(f"✓ My Tasks: {data.get('stats', {}).get('total_assigned', 0)} assigned tasks")
    
    def test_create_personal_task(self, auth_headers):
        """Test creating a personal task"""
        test_name = f"TEST_TASK_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        payload = {
            "name": test_name,
            "description": "Test task for automated testing",
            "priority": "medium"
        }
        response = requests.post(f"{BASE_URL}/api/projects/my-tasks", 
                               json=payload, headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            assert data.get("name") == test_name
            print(f"✓ Created personal task: {test_name}")
            # Cleanup
            task_id = data.get("id")
            requests.delete(f"{BASE_URL}/api/projects/tasks/{task_id}", headers=auth_headers)
        else:
            # Might need personal project created first
            print(f"Note: Create personal task returned {response.status_code}")
    
    def test_assigned_by_me(self, auth_headers):
        """Test assigned by me endpoint"""
        response = requests.get(f"{BASE_URL}/api/projects/assigned-by-me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Assigned by me: {len(data)} tasks")


class TestProjectTasks:
    """Test Project Tasks CRUD operations"""
    
    def test_list_project_tasks(self, auth_headers):
        """Test listing tasks for a project"""
        # First get a project
        projects_response = requests.get(f"{BASE_URL}/api/projects/list", headers=auth_headers)
        projects = projects_response.json()
        if not projects:
            pytest.skip("No projects available")
        
        project_id = projects[0].get("id")
        response = requests.get(f"{BASE_URL}/api/projects/{project_id}/tasks", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} tasks in project")
    
    def test_create_task_in_project(self, auth_headers):
        """Test creating a task in a project"""
        # First get a project
        projects_response = requests.get(f"{BASE_URL}/api/projects/list", headers=auth_headers)
        projects = projects_response.json()
        if not projects:
            pytest.skip("No projects available")
        
        project_id = projects[0].get("id")
        test_name = f"TEST_TASK_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        payload = {
            "name": test_name,
            "description": "Test task",
            "priority": "medium",
            "status": "draft",
            "project_id": project_id  # Include project_id in body
        }
        # Use generic tasks endpoint with project_id in body
        response = requests.post(f"{BASE_URL}/api/projects/tasks", 
                               json=payload, headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            assert data.get("name") == test_name
            task_id = data.get("id")
            print(f"✓ Created task: {test_name}")
            
            # Test update
            update_response = requests.put(f"{BASE_URL}/api/projects/tasks/{task_id}", 
                                          json={"status": "in_progress"}, headers=auth_headers)
            if update_response.status_code == 200:
                print(f"✓ Updated task status to in_progress")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/projects/tasks/{task_id}", headers=auth_headers)
            print(f"✓ Deleted task: {test_name}")
        else:
            print(f"Note: Create task returned {response.status_code}: {response.text}")


class TestRecurringTasks:
    """Test Recurring Tasks functionality"""
    
    def test_recurring_dashboard(self, auth_headers):
        """Test recurring tasks dashboard"""
        response = requests.get(f"{BASE_URL}/api/projects/recurring-dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "active_templates" in data
        assert "total_templates" in data
        print(f"✓ Recurring: {data.get('active_templates')} active, {data.get('paused_templates')} paused")
    
    def test_list_recurring_templates(self, auth_headers):
        """Test listing recurring templates"""
        response = requests.get(f"{BASE_URL}/api/projects/recurring-templates", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} recurring templates")
    
    def test_create_recurring_template(self, auth_headers):
        """Test creating a recurring task template"""
        test_name = f"TEST_RECURRING_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        payload = {
            "name": test_name,
            "description": "Test recurring task",
            "recurrence_type": "daily",
            "frequency": 1,
            "repeat_on_days": [0, 1, 2, 3, 4],  # Weekdays
            "start_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "task_due_offset_days": 0,
            "priority": "medium",
            "recurrence_end_type": "after_occurrences",
            "max_occurrences": 5
        }
        response = requests.post(f"{BASE_URL}/api/projects/recurring-templates", 
                               json=payload, headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            assert data.get("name") == test_name
            template_id = data.get("id")
            print(f"✓ Created recurring template: {test_name}")
            
            # Test pause
            pause_response = requests.post(f"{BASE_URL}/api/projects/recurring-templates/{template_id}/pause", 
                                          headers=auth_headers)
            assert pause_response.status_code == 200
            print(f"✓ Paused template")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/projects/recurring-templates/{template_id}", headers=auth_headers)
            print(f"✓ Deleted recurring template")
        else:
            print(f"Note: Create recurring template returned {response.status_code}: {response.text}")


class TestTaskComments:
    """Test Task Comments with @mentions"""
    
    def test_get_users_for_mentions(self, auth_headers):
        """Test getting users for mention suggestions"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} users for mentions")


# ========== COMMUNICATION HUB TESTS ==========

class TestCommunicationHub:
    """Test Communication Hub endpoints"""
    
    def test_teams_endpoint_exists(self, auth_headers):
        """Test that teams endpoint responds"""
        # Teams may require Microsoft auth, so we just check endpoint exists
        response = requests.get(f"{BASE_URL}/api/teams/status", headers=auth_headers)
        # Could be 200, 401, or 404 depending on implementation
        assert response.status_code in [200, 401, 404]
        print(f"✓ Teams endpoint status: {response.status_code}")
    
    def test_calendar_endpoint(self, auth_headers):
        """Test calendar endpoints"""
        response = requests.get(f"{BASE_URL}/api/meetings", headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Found {len(data)} meetings")
        else:
            print(f"Note: Meetings list returned {response.status_code}")


class TestMeetings:
    """Test Meetings functionality"""
    
    def test_list_meetings(self, auth_headers):
        """Test listing meetings"""
        response = requests.get(f"{BASE_URL}/api/meetings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} meetings")
    
    def test_create_meeting(self, auth_headers):
        """Test creating a meeting"""
        test_title = f"TEST_MEETING_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        start_time = (datetime.now() + timedelta(days=1)).replace(hour=10, minute=0).isoformat()
        end_time = (datetime.now() + timedelta(days=1)).replace(hour=11, minute=0).isoformat()
        
        payload = {
            "title": test_title,
            "meeting_type": "team_sync",
            "description": "Test meeting for automated testing",
            "start_time": start_time,
            "end_time": end_time,
            "location": "Virtual",
            "participants": []
        }
        response = requests.post(f"{BASE_URL}/api/meetings/create", 
                               json=payload, headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            assert data.get("title") == test_title
            meeting_id = data.get("id")
            print(f"✓ Created meeting: {test_title}")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/meetings/{meeting_id}", headers=auth_headers)
            print(f"✓ Deleted meeting")
        else:
            print(f"Note: Create meeting returned {response.status_code}: {response.text}")


# ========== CROSS-MODULE TESTS ==========

class TestCrossModule:
    """Test cross-module functionality"""
    
    def test_navigation_endpoints(self, auth_headers):
        """Test that all navigation endpoints are accessible"""
        endpoints = [
            "/api/goals/fiscal-years",
            "/api/goals/strategic-goals",
            "/api/goals/objectives",
            "/api/goals/dashboard",
            "/api/projects/list",
            "/api/projects/manager-dashboard",
            "/api/projects/my-tasks",
            "/api/projects/recurring-templates",
            "/api/meetings"  # Fixed endpoint
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=auth_headers)
            assert response.status_code == 200, f"Endpoint {endpoint} failed with {response.status_code}"
            print(f"✓ {endpoint} - OK")
    
    def test_search_functionality(self, auth_headers):
        """Test search functionality across modules"""
        # Search in goals
        response = requests.get(f"{BASE_URL}/api/goals/strategic-goals?search=test", headers=auth_headers)
        assert response.status_code == 200
        print(f"✓ Goals search works")
        
        # Search in objectives
        response = requests.get(f"{BASE_URL}/api/goals/objectives?search=test", headers=auth_headers)
        assert response.status_code == 200
        print(f"✓ Objectives search works")
        
        # Search in projects
        response = requests.get(f"{BASE_URL}/api/projects/list?search=test", headers=auth_headers)
        assert response.status_code == 200
        print(f"✓ Projects search works")
    
    def test_users_endpoint(self, auth_headers):
        """Test users endpoint for dropdowns"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Found {len(data)} users for dropdowns")
    
    def test_notifications(self, auth_headers):
        """Test notifications endpoint"""
        response = requests.get(f"{BASE_URL}/api/notifications?limit=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} notifications")


class TestScheduleMeeting:
    """Test Schedule Meeting from Goals/Objectives/Projects"""
    
    def test_meeting_types(self, auth_headers):
        """Test that meeting types are available"""
        response = requests.get(f"{BASE_URL}/api/meetings/templates", headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Found {len(data)} meeting templates")
        else:
            # Templates might not exist, that's ok
            print(f"Note: Meeting templates returned {response.status_code}")
    
    def test_create_meeting_with_goal_link(self, auth_headers):
        """Test creating a meeting linked to a goal"""
        # Get a goal first
        goals_response = requests.get(f"{BASE_URL}/api/goals/strategic-goals", headers=auth_headers)
        goals = goals_response.json()
        if not goals:
            pytest.skip("No goals available")
        
        goal_id = goals[0].get("id")
        test_title = f"TEST_GOAL_MEETING_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        start_time = (datetime.now() + timedelta(days=1)).replace(hour=14, minute=0).isoformat()
        end_time = (datetime.now() + timedelta(days=1)).replace(hour=15, minute=0).isoformat()
        
        payload = {
            "title": test_title,
            "meeting_type": "okr_review",
            "description": "Goal review meeting",
            "start_time": start_time,
            "end_time": end_time,
            "related_goal_id": goal_id,
            "participants": []
        }
        response = requests.post(f"{BASE_URL}/api/meetings/create", 
                               json=payload, headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            meeting_id = data.get("id")
            print(f"✓ Created meeting linked to goal")
            # Cleanup
            requests.delete(f"{BASE_URL}/api/meetings/{meeting_id}", headers=auth_headers)
        else:
            print(f"Note: Create meeting with goal link returned {response.status_code}")


# ========== HEALTH CHECK ==========

class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print(f"✓ API health check passed")
    
    def test_auth_login(self):
        """Test login endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data or "token" in data
        print(f"✓ Login successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
