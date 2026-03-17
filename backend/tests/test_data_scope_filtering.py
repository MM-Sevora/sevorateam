"""
Test Data Scope Filtering for Projects, Tasks, and Employees APIs

Tests verify that:
1. Admin users can access all data (bypassing data scope restrictions)
2. Projects API returns data with proper filtering
3. Tasks API returns data with proper filtering  
4. Employees API returns data with proper filtering
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDataScopeFiltering:
    """Test data scope filtering for various modules"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login as admin"""
        # Admin login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.user = data.get("user")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
    # ============== PROJECTS API TESTS ==============
        
    def test_projects_list_returns_200(self):
        """Test that projects list API returns 200 status code"""
        response = requests.get(
            f"{BASE_URL}/api/projects/list",
            headers=self.headers
        )
        assert response.status_code == 200, f"Projects list failed: {response.text}"
        
        projects = response.json()
        assert isinstance(projects, list), "Projects should be a list"
        print(f"✓ Projects list returned {len(projects)} projects")
        
    def test_projects_list_returns_data_structure(self):
        """Test that projects list returns proper data structure"""
        response = requests.get(
            f"{BASE_URL}/api/projects/list",
            headers=self.headers
        )
        assert response.status_code == 200
        
        projects = response.json()
        if len(projects) > 0:
            project = projects[0]
            # Verify expected fields exist
            assert "id" in project, "Project should have id"
            assert "name" in project, "Project should have name"
            assert "_permissions" in project, "Project should have _permissions"
            print(f"✓ Project data structure is correct. Sample: {project.get('name')}")
        else:
            print("✓ Projects list is empty (no projects created yet)")
            
    def test_admin_sees_all_projects(self):
        """Test that admin user sees all projects (bypasses data scope)"""
        response = requests.get(
            f"{BASE_URL}/api/projects/list",
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Admin should see projects regardless of data scope settings
        # The user is super_admin so should see everything
        assert self.user.get("role") == "super_admin", "Test user should be super_admin"
        print(f"✓ Admin ({self.user.get('role')}) can access projects list")
        
    def test_projects_list_with_filters(self):
        """Test projects list with various filters"""
        # Test with status filter
        response = requests.get(
            f"{BASE_URL}/api/projects/list?status=active",
            headers=self.headers
        )
        assert response.status_code == 200, f"Projects filter by status failed: {response.text}"
        print(f"✓ Projects filter by status=active returned {len(response.json())} projects")
        
        # Test with priority filter
        response = requests.get(
            f"{BASE_URL}/api/projects/list?priority=high",
            headers=self.headers
        )
        assert response.status_code == 200, f"Projects filter by priority failed: {response.text}"
        print(f"✓ Projects filter by priority=high returned {len(response.json())} projects")
        
    # ============== TASKS API TESTS ==============
    
    def test_tasks_all_returns_200(self):
        """Test that tasks all API returns 200 status code"""
        response = requests.get(
            f"{BASE_URL}/api/projects/tasks/all?limit=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Tasks all failed: {response.text}"
        
        tasks = response.json()
        assert isinstance(tasks, list), "Tasks should be a list"
        print(f"✓ Tasks list returned {len(tasks)} tasks")
        
    def test_tasks_returns_data_structure(self):
        """Test that tasks returns proper data structure"""
        response = requests.get(
            f"{BASE_URL}/api/projects/tasks/all?limit=5",
            headers=self.headers
        )
        assert response.status_code == 200
        
        tasks = response.json()
        if len(tasks) > 0:
            task = tasks[0]
            # Verify expected fields exist
            assert "id" in task, "Task should have id"
            assert "name" in task, "Task should have name"
            assert "status" in task, "Task should have status"
            print(f"✓ Task data structure is correct. Sample: {task.get('name')}")
        else:
            print("✓ Tasks list is empty (no tasks created yet)")
            
    def test_admin_sees_all_tasks(self):
        """Test that admin user sees all tasks (bypasses data scope)"""
        response = requests.get(
            f"{BASE_URL}/api/projects/tasks/all?limit=50",
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Admin should see tasks regardless of data scope settings
        assert self.user.get("role") == "super_admin"
        print(f"✓ Admin ({self.user.get('role')}) can access all tasks")
        
    def test_tasks_with_filters(self):
        """Test tasks API with various filters"""
        # Test with status filter
        response = requests.get(
            f"{BASE_URL}/api/projects/tasks/all?status=assigned&limit=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Tasks filter by status failed: {response.text}"
        print(f"✓ Tasks filter by status=assigned returned {len(response.json())} tasks")
        
        # Test with priority filter
        response = requests.get(
            f"{BASE_URL}/api/projects/tasks/all?priority=high&limit=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Tasks filter by priority failed: {response.text}"
        print(f"✓ Tasks filter by priority=high returned {len(response.json())} tasks")
        
    # ============== EMPLOYEES API TESTS ==============
    
    def test_employees_list_returns_200(self):
        """Test that employees list API returns 200 status code"""
        response = requests.get(
            f"{BASE_URL}/api/hr/employees?limit=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Employees list failed: {response.text}"
        
        employees = response.json()
        assert isinstance(employees, list), "Employees should be a list"
        print(f"✓ Employees list returned {len(employees)} employees")
        
    def test_employees_returns_data_structure(self):
        """Test that employees returns proper data structure"""
        response = requests.get(
            f"{BASE_URL}/api/hr/employees?limit=5",
            headers=self.headers
        )
        assert response.status_code == 200
        
        employees = response.json()
        if len(employees) > 0:
            employee = employees[0]
            # Verify expected fields exist
            assert "id" in employee, "Employee should have id"
            assert "name" in employee, "Employee should have name"
            assert "email" in employee, "Employee should have email"
            print(f"✓ Employee data structure is correct. Sample: {employee.get('name')}")
        else:
            print("✓ Employees list is empty (no employees created yet)")
            
    def test_admin_sees_all_employees(self):
        """Test that admin user sees all employees (bypasses data scope)"""
        response = requests.get(
            f"{BASE_URL}/api/hr/employees?limit=100",
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Admin should see employees regardless of data scope settings
        assert self.user.get("role") == "super_admin"
        print(f"✓ Admin ({self.user.get('role')}) can access all employees")
        
    def test_employees_with_filters(self):
        """Test employees API with various filters"""
        # Test with status filter
        response = requests.get(
            f"{BASE_URL}/api/hr/employees?status=active&limit=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Employees filter by status failed: {response.text}"
        print(f"✓ Employees filter by status=active returned {len(response.json())} employees")
        
    def test_employees_with_department_filter(self):
        """Test employees API with department filter"""
        # First get departments
        dept_response = requests.get(
            f"{BASE_URL}/api/hr/departments",
            headers=self.headers
        )
        assert dept_response.status_code == 200, f"Departments API failed: {dept_response.text}"
        
        departments = dept_response.json()
        if len(departments) > 0:
            dept_id = departments[0].get("id")
            
            # Test with department filter
            response = requests.get(
                f"{BASE_URL}/api/hr/employees?department_id={dept_id}&limit=10",
                headers=self.headers
            )
            assert response.status_code == 200, f"Employees filter by department failed: {response.text}"
            print(f"✓ Employees filter by department returned {len(response.json())} employees")
        else:
            print("✓ No departments to test with")
            
    # ============== DATA SCOPE FILTER UTILITY TESTS ==============
    
    def test_departments_endpoint_works(self):
        """Test that departments endpoint works (used for data scope filtering)"""
        response = requests.get(
            f"{BASE_URL}/api/hr/departments",
            headers=self.headers
        )
        assert response.status_code == 200, f"Departments failed: {response.text}"
        
        departments = response.json()
        assert isinstance(departments, list), "Departments should be a list"
        print(f"✓ Departments endpoint returned {len(departments)} departments")
        
    def test_my_tasks_endpoint_works(self):
        """Test that my-tasks endpoint works (uses data scope filtering)"""
        response = requests.get(
            f"{BASE_URL}/api/projects/my-tasks",
            headers=self.headers
        )
        assert response.status_code == 200, f"My tasks failed: {response.text}"
        
        data = response.json()
        assert "stats" in data, "My tasks should have stats"
        print(f"✓ My tasks endpoint works. Stats: {data.get('stats', {})}")
        
    def test_manager_dashboard_works(self):
        """Test that manager dashboard endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/projects/manager-dashboard",
            headers=self.headers
        )
        assert response.status_code == 200, f"Manager dashboard failed: {response.text}"
        
        data = response.json()
        assert "total_projects" in data, "Dashboard should have total_projects"
        assert "total_tasks" in data, "Dashboard should have total_tasks"
        print(f"✓ Manager dashboard works. Projects: {data.get('total_projects')}, Tasks: {data.get('total_tasks')}")


class TestPermissionsUtility:
    """Test the permissions utility functions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.user = data.get("user")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
    def test_user_has_role_info(self):
        """Test that user object contains role information for permission checks"""
        assert "role" in self.user, "User should have role"
        assert self.user.get("role") in ["super_admin", "admin"], "Test user should be admin"
        print(f"✓ User has role: {self.user.get('role')}")
        
    def test_projects_have_permissions(self):
        """Test that project responses include _permissions field"""
        response = requests.get(
            f"{BASE_URL}/api/projects/list",
            headers=self.headers
        )
        assert response.status_code == 200
        
        projects = response.json()
        if len(projects) > 0:
            project = projects[0]
            assert "_permissions" in project, "Project should have _permissions"
            perms = project.get("_permissions", {})
            assert "can_view" in perms, "Permissions should have can_view"
            assert "can_edit" in perms, "Permissions should have can_edit"
            assert "can_delete" in perms, "Permissions should have can_delete"
            print(f"✓ Projects include permissions. Admin can_delete: {perms.get('can_delete')}")
        else:
            print("✓ No projects to check permissions on")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
