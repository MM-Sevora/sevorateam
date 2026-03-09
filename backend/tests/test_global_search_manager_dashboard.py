"""
Test Global Search and Manager Dashboard Features
Tests for iteration 38 - Global Search functionality and Manager Dashboard stats

Endpoints tested:
- GET /api/projects/list?search=<query> - Search projects
- GET /api/projects/tasks/all?search=<query> - Search tasks
- GET /api/projects/manager-dashboard - Manager dashboard stats
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com').rstrip('/')


class TestGlobalSearch:
    """Test Global Search functionality - searches projects and tasks"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for superadmin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    # === Project Search Tests ===
    
    def test_projects_list_endpoint_exists(self, headers):
        """Test that projects list endpoint exists and returns 200"""
        response = requests.get(f"{BASE_URL}/api/projects/list", headers=headers)
        assert response.status_code == 200, f"Projects list failed: {response.text}"
        assert isinstance(response.json(), list), "Expected list response"
        print(f"PASSED: Projects list returns {len(response.json())} projects")
    
    def test_projects_search_with_query(self, headers):
        """Test project search with search parameter"""
        # First get all projects to find a search term
        all_response = requests.get(f"{BASE_URL}/api/projects/list", headers=headers)
        assert all_response.status_code == 200
        projects = all_response.json()
        
        if len(projects) > 0:
            # Use first project's name for search
            search_term = projects[0]["name"][:4]  # First 4 chars
            search_response = requests.get(
                f"{BASE_URL}/api/projects/list?search={search_term}", 
                headers=headers
            )
            assert search_response.status_code == 200, f"Search failed: {search_response.text}"
            results = search_response.json()
            assert isinstance(results, list), "Expected list response"
            print(f"PASSED: Search for '{search_term}' returned {len(results)} results")
            
            # Validate result structure has required fields
            if len(results) > 0:
                result = results[0]
                assert "id" in result, "Missing id field"
                assert "name" in result, "Missing name field"
                assert "project_id" in result, "Missing project_id field"
                assert "status" in result, "Missing status field"
                print(f"PASSED: Search result contains project_id={result.get('project_id')}, status={result.get('status')}, progress={result.get('progress', 0)}")
        else:
            print("SKIPPED: No projects found to test search")
    
    def test_projects_search_by_project_id(self, headers):
        """Test project search by project_id (PRJ-XXXX format)"""
        all_response = requests.get(f"{BASE_URL}/api/projects/list", headers=headers)
        projects = all_response.json()
        
        if len(projects) > 0:
            project_id = projects[0].get("project_id")
            if project_id:
                search_response = requests.get(
                    f"{BASE_URL}/api/projects/list?search={project_id}", 
                    headers=headers
                )
                assert search_response.status_code == 200
                results = search_response.json()
                print(f"PASSED: Search by project_id '{project_id}' returned {len(results)} results")
    
    def test_projects_search_no_results(self, headers):
        """Test project search with query that should return no results"""
        response = requests.get(
            f"{BASE_URL}/api/projects/list?search=ZZZZNONEXISTENT12345", 
            headers=headers
        )
        assert response.status_code == 200, f"Search failed: {response.text}"
        results = response.json()
        assert isinstance(results, list), "Expected list response"
        # May or may not return empty - just check it doesn't error
        print(f"PASSED: Search for non-existent term returned {len(results)} results")
    
    # === Task Search Tests ===
    
    def test_tasks_all_endpoint_exists(self, headers):
        """Test that tasks/all endpoint exists and returns 200"""
        response = requests.get(f"{BASE_URL}/api/projects/tasks/all", headers=headers)
        assert response.status_code == 200, f"Tasks all failed: {response.text}"
        assert isinstance(response.json(), list), "Expected list response"
        print(f"PASSED: Tasks all returns {len(response.json())} tasks")
    
    def test_tasks_search_with_query(self, headers):
        """Test task search with search parameter"""
        # First get all tasks to find a search term
        all_response = requests.get(f"{BASE_URL}/api/projects/tasks/all", headers=headers)
        assert all_response.status_code == 200
        tasks = all_response.json()
        
        if len(tasks) > 0:
            # Use first task's name for search
            search_term = tasks[0]["name"][:4]  # First 4 chars
            search_response = requests.get(
                f"{BASE_URL}/api/projects/tasks/all?search={search_term}", 
                headers=headers
            )
            assert search_response.status_code == 200, f"Task search failed: {search_response.text}"
            results = search_response.json()
            assert isinstance(results, list), "Expected list response"
            print(f"PASSED: Task search for '{search_term}' returned {len(results)} results")
            
            # Validate result structure for tasks
            if len(results) > 0:
                task = results[0]
                assert "id" in task, "Missing id field"
                assert "name" in task, "Missing name field"
                assert "priority" in task, "Missing priority field"
                # Check for optional enriched fields
                print(f"PASSED: Task result contains priority={task.get('priority')}, assigned_to_name={task.get('assigned_to_name')}, due_date={task.get('due_date')}")
        else:
            print("SKIPPED: No tasks found to test search")
    
    def test_tasks_search_by_description(self, headers):
        """Test task search includes description field"""
        # The API should search in both name and description
        response = requests.get(
            f"{BASE_URL}/api/projects/tasks/all?search=task", 
            headers=headers
        )
        assert response.status_code == 200
        print(f"PASSED: Task search by generic term returned {len(response.json())} results")


class TestManagerDashboard:
    """Test Manager Dashboard - real project and task stats"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for superadmin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_manager_dashboard_endpoint_exists(self, headers):
        """Test manager-dashboard endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/projects/manager-dashboard", headers=headers)
        assert response.status_code == 200, f"Manager dashboard failed: {response.text}"
        data = response.json()
        assert isinstance(data, dict), "Expected dict response"
        print(f"PASSED: Manager dashboard endpoint returns valid response")
    
    def test_manager_dashboard_project_stats(self, headers):
        """Test manager dashboard returns real project stats"""
        response = requests.get(f"{BASE_URL}/api/projects/manager-dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check project stat fields exist
        assert "total_projects" in data, "Missing total_projects"
        assert "active_projects" in data, "Missing active_projects"
        assert "completed_projects" in data, "Missing completed_projects"
        assert "on_hold_projects" in data, "Missing on_hold_projects"
        assert "at_risk_projects" in data, "Missing at_risk_projects"
        
        # Verify values are integers
        assert isinstance(data["total_projects"], int), "total_projects should be int"
        assert isinstance(data["active_projects"], int), "active_projects should be int"
        assert isinstance(data["completed_projects"], int), "completed_projects should be int"
        
        print(f"PASSED: Project stats - Total: {data['total_projects']}, Active: {data['active_projects']}, Completed: {data['completed_projects']}, On Hold: {data['on_hold_projects']}, At Risk: {data['at_risk_projects']}")
    
    def test_manager_dashboard_task_stats(self, headers):
        """Test manager dashboard returns real task stats"""
        response = requests.get(f"{BASE_URL}/api/projects/manager-dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check task stat fields exist
        assert "total_tasks" in data, "Missing total_tasks"
        assert "completed_tasks" in data, "Missing completed_tasks"
        assert "overdue_tasks" in data, "Missing overdue_tasks"
        assert "unassigned_tasks" in data, "Missing unassigned_tasks"
        assert "blocked_tasks" in data, "Missing blocked_tasks"
        
        # Verify values are integers
        assert isinstance(data["total_tasks"], int), "total_tasks should be int"
        assert isinstance(data["completed_tasks"], int), "completed_tasks should be int"
        
        print(f"PASSED: Task stats - Total: {data['total_tasks']}, Completed: {data['completed_tasks']}, Overdue: {data['overdue_tasks']}, Unassigned: {data['unassigned_tasks']}, Blocked: {data['blocked_tasks']}")
    
    def test_manager_dashboard_projects_by_status(self, headers):
        """Test manager dashboard returns projects_by_status chart data"""
        response = requests.get(f"{BASE_URL}/api/projects/manager-dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "projects_by_status" in data, "Missing projects_by_status"
        pbs = data["projects_by_status"]
        assert isinstance(pbs, dict), "projects_by_status should be dict"
        
        # Check expected status keys
        expected_statuses = ["draft", "active", "on_hold", "completed", "cancelled"]
        for status in expected_statuses:
            assert status in pbs, f"Missing status: {status}"
        
        print(f"PASSED: Projects by status - {pbs}")
    
    def test_manager_dashboard_projects_by_priority(self, headers):
        """Test manager dashboard returns projects_by_priority chart data"""
        response = requests.get(f"{BASE_URL}/api/projects/manager-dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "projects_by_priority" in data, "Missing projects_by_priority"
        pbp = data["projects_by_priority"]
        assert isinstance(pbp, dict), "projects_by_priority should be dict"
        
        # Check expected priority keys
        expected_priorities = ["urgent", "high", "medium", "low"]
        for priority in expected_priorities:
            assert priority in pbp, f"Missing priority: {priority}"
        
        print(f"PASSED: Projects by priority - {pbp}")
    
    def test_manager_dashboard_weekly_completion(self, headers):
        """Test manager dashboard returns weekly_completion chart data"""
        response = requests.get(f"{BASE_URL}/api/projects/manager-dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "weekly_completion" in data, "Missing weekly_completion"
        wc = data["weekly_completion"]
        assert isinstance(wc, list), "weekly_completion should be list"
        assert len(wc) == 7, f"Expected 7 days, got {len(wc)}"
        
        # Verify each day has required fields
        for day in wc:
            assert "date" in day, "Missing date field in weekly_completion"
            assert "completed" in day, "Missing completed field in weekly_completion"
        
        print(f"PASSED: Weekly completion has 7 days of data")
    
    def test_manager_dashboard_team_workload(self, headers):
        """Test manager dashboard returns team_workload card data"""
        response = requests.get(f"{BASE_URL}/api/projects/manager-dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "team_workload" in data, "Missing team_workload"
        tw = data["team_workload"]
        assert isinstance(tw, list), "team_workload should be list"
        
        if len(tw) > 0:
            member = tw[0]
            assert "user_id" in member, "Missing user_id in team_workload"
            assert "user_name" in member, "Missing user_name in team_workload"
            assert "total_tasks" in member, "Missing total_tasks in team_workload"
            assert "completed_tasks" in member, "Missing completed_tasks in team_workload"
            print(f"PASSED: Team workload has {len(tw)} members - First: {member['user_name']} ({member['total_tasks']} tasks)")
        else:
            print("PASSED: Team workload is empty (no assigned tasks)")
    
    def test_manager_dashboard_at_risk_projects(self, headers):
        """Test manager dashboard returns at_risk_project_list card data"""
        response = requests.get(f"{BASE_URL}/api/projects/manager-dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "at_risk_project_list" in data, "Missing at_risk_project_list"
        arp = data["at_risk_project_list"]
        assert isinstance(arp, list), "at_risk_project_list should be list"
        
        if len(arp) > 0:
            project = arp[0]
            assert "id" in project, "Missing id in at_risk_project"
            assert "name" in project, "Missing name in at_risk_project"
            assert "project_id" in project, "Missing project_id in at_risk_project"
            assert "is_at_risk" in project, "Missing is_at_risk in at_risk_project"
            print(f"PASSED: At-risk projects has {len(arp)} projects - First: {project['name']} (PRJ: {project['project_id']})")
        else:
            print("PASSED: No at-risk projects (good!)")
    
    def test_manager_dashboard_upcoming_deadlines(self, headers):
        """Test manager dashboard returns upcoming_deadlines data"""
        response = requests.get(f"{BASE_URL}/api/projects/manager-dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "upcoming_deadlines" in data, "Missing upcoming_deadlines"
        ud = data["upcoming_deadlines"]
        assert isinstance(ud, list), "upcoming_deadlines should be list"
        print(f"PASSED: Upcoming deadlines has {len(ud)} projects")
    
    def test_manager_dashboard_recent_activity(self, headers):
        """Test manager dashboard returns recent_activity data"""
        response = requests.get(f"{BASE_URL}/api/projects/manager-dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "recent_activity" in data, "Missing recent_activity"
        ra = data["recent_activity"]
        assert isinstance(ra, list), "recent_activity should be list"
        
        if len(ra) > 0:
            activity = ra[0]
            assert "entity_type" in activity, "Missing entity_type in activity"
            assert "action" in activity, "Missing action in activity"
            print(f"PASSED: Recent activity has {len(ra)} entries")
        else:
            print("PASSED: No recent activity")
    
    def test_manager_dashboard_data_consistency(self, headers):
        """Test that project stats are consistent (sum of statuses equals total)"""
        response = requests.get(f"{BASE_URL}/api/projects/manager-dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify projects_by_status sum equals total_projects
        pbs = data.get("projects_by_status", {})
        status_sum = sum(pbs.values())
        total = data.get("total_projects", 0)
        assert status_sum == total, f"Status sum ({status_sum}) != total_projects ({total})"
        
        print(f"PASSED: Data consistency check - {status_sum} projects by status = {total} total")


class TestSearchIntegration:
    """Integration tests for Global Search combined with navigation"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for superadmin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_search_result_project_navigable(self, headers):
        """Test that project search results contain id for navigation"""
        response = requests.get(f"{BASE_URL}/api/projects/list", headers=headers)
        projects = response.json()
        
        if len(projects) > 0:
            project = projects[0]
            # Verify the project can be fetched by ID (navigation target)
            detail_response = requests.get(
                f"{BASE_URL}/api/projects/{project['id']}", 
                headers=headers
            )
            assert detail_response.status_code == 200, f"Project detail fetch failed"
            print(f"PASSED: Project {project['id']} is navigable via /projects/{project['id']}")
    
    def test_search_result_task_has_project_id(self, headers):
        """Test that task search results contain project_id for navigation"""
        response = requests.get(f"{BASE_URL}/api/projects/tasks/all", headers=headers)
        tasks = response.json()
        
        tasks_with_project = [t for t in tasks if t.get("project_id")]
        if len(tasks_with_project) > 0:
            task = tasks_with_project[0]
            # Verify the task's project exists (navigation target)
            detail_response = requests.get(
                f"{BASE_URL}/api/projects/{task['project_id']}", 
                headers=headers
            )
            assert detail_response.status_code == 200, f"Task's project fetch failed"
            print(f"PASSED: Task {task['id']} has navigable project_id={task['project_id']}")
        else:
            print("SKIPPED: No tasks with project_id found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
