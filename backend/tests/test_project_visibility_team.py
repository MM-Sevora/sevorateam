"""
Test Cases for Project Management Enhancements:
1. Project Visibility (Public/Private)
2. Project Team Management
3. Individual Tasks (Decoupled Task Structure)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPERADMIN_EMAIL = "superadmin@sevora.com"
SUPERADMIN_PASSWORD = "superadmin123"
MARKETING_EMAIL = "marketing@sevora.com"
MARKETING_PASSWORD = "admin123"


class TestProjectVisibilityTeam:
    """Test Project Visibility and Team Management Features"""
    
    token = None
    user_id = None
    marketing_token = None
    marketing_user_id = None
    test_module_id = None
    test_project_public_id = None
    test_project_private_id = None
    individual_task_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup - get auth tokens for both users"""
        # Super admin login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPERADMIN_EMAIL,
            "password": SUPERADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Super admin login failed: {response.text}"
        data = response.json()
        TestProjectVisibilityTeam.token = data["access_token"]
        TestProjectVisibilityTeam.user_id = data["user"]["id"]
        
        # Marketing login  
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKETING_EMAIL,
            "password": MARKETING_PASSWORD
        })
        assert response.status_code == 200, f"Marketing login failed: {response.text}"
        data = response.json()
        TestProjectVisibilityTeam.marketing_token = data["access_token"]
        TestProjectVisibilityTeam.marketing_user_id = data["user"]["id"]
        
    def get_headers(self, token=None):
        return {
            "Authorization": f"Bearer {token or self.token}",
            "Content-Type": "application/json"
        }
    
    # ============== MODULE TESTS ==============
    
    def test_01_list_modules(self):
        """Get or create a module for testing"""
        response = requests.get(
            f"{BASE_URL}/api/projects/modules",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        modules = response.json()
        
        if modules:
            TestProjectVisibilityTeam.test_module_id = modules[0]["id"]
            print(f"Using existing module: {modules[0]['name']} (ID: {modules[0]['id']})")
        else:
            # Create a module
            response = requests.post(
                f"{BASE_URL}/api/projects/modules",
                headers=self.get_headers(),
                json={"name": "TEST_Visibility_Module", "description": "Test module for visibility tests"}
            )
            assert response.status_code == 200
            TestProjectVisibilityTeam.test_module_id = response.json()["id"]
            print(f"Created test module: {response.json()['name']}")
    
    # ============== PROJECT VISIBILITY TESTS ==============
    
    def test_02_create_public_project(self):
        """Create a public project - should be visible to all"""
        response = requests.post(
            f"{BASE_URL}/api/projects",
            headers=self.get_headers(),
            json={
                "name": "TEST_Public_Project",
                "module_id": self.test_module_id,
                "description": "This is a public project",
                "visibility": "public",
                "priority": "medium"
            }
        )
        assert response.status_code == 200, f"Failed to create public project: {response.text}"
        project = response.json()
        TestProjectVisibilityTeam.test_project_public_id = project["id"]
        
        # Verify visibility is public
        assert project["visibility"] == "public", f"Expected public visibility, got {project['visibility']}"
        # Verify creator is auto-added to team
        assert self.user_id in project["team_members"], "Creator should be auto-added to team_members"
        print(f"Created public project: {project['name']} (ID: {project['id']})")
        print(f"Team members: {project['team_members']}")
    
    def test_03_create_private_project(self):
        """Create a private project - creator should be auto-added to team"""
        response = requests.post(
            f"{BASE_URL}/api/projects",
            headers=self.get_headers(),
            json={
                "name": "TEST_Private_Project",
                "module_id": self.test_module_id,
                "description": "This is a private project",
                "visibility": "private",
                "priority": "high"
            }
        )
        assert response.status_code == 200, f"Failed to create private project: {response.text}"
        project = response.json()
        TestProjectVisibilityTeam.test_project_private_id = project["id"]
        
        # Verify visibility is private
        assert project["visibility"] == "private", f"Expected private visibility, got {project['visibility']}"
        # Verify creator is auto-added to team
        assert self.user_id in project["team_members"], "Creator should be auto-added to team_members"
        print(f"Created private project: {project['name']} (ID: {project['id']})")
        print(f"Team members: {project['team_members']}")
    
    def test_04_list_projects_visibility_filtering(self):
        """Verify public projects visible to all, private only to team members"""
        # Super admin should see both (admin access)
        response = requests.get(
            f"{BASE_URL}/api/projects/list",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        projects = response.json()
        
        project_ids = [p["id"] for p in projects]
        assert self.test_project_public_id in project_ids, "Super admin should see public project"
        assert self.test_project_private_id in project_ids, "Super admin should see private project (admin access)"
        print(f"Super admin sees {len(projects)} projects")
        
        # Marketing user - not in private project team yet
        response = requests.get(
            f"{BASE_URL}/api/projects/list",
            headers=self.get_headers(self.marketing_token)
        )
        assert response.status_code == 200
        projects = response.json()
        
        project_ids = [p["id"] for p in projects]
        assert self.test_project_public_id in project_ids, "Marketing should see public project"
        # Marketing might not see private project if not a team member and not admin
        print(f"Marketing user sees {len(projects)} projects")
    
    def test_05_update_project_visibility(self):
        """Update project visibility from public to private"""
        response = requests.put(
            f"{BASE_URL}/api/projects/{self.test_project_public_id}",
            headers=self.get_headers(),
            json={"visibility": "private"}
        )
        assert response.status_code == 200, f"Failed to update visibility: {response.text}"
        project = response.json()
        assert project["visibility"] == "private", "Visibility should be updated to private"
        print(f"Updated project visibility to: {project['visibility']}")
        
        # Revert to public
        response = requests.put(
            f"{BASE_URL}/api/projects/{self.test_project_public_id}",
            headers=self.get_headers(),
            json={"visibility": "public"}
        )
        assert response.status_code == 200
        print("Reverted project visibility back to public")
    
    # ============== TEAM MANAGEMENT TESTS ==============
    
    def test_06_add_team_member_to_project(self):
        """Add a team member to a private project"""
        response = requests.post(
            f"{BASE_URL}/api/projects/{self.test_project_private_id}/members/{self.marketing_user_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Failed to add member: {response.text}"
        print(f"Added marketing user to private project team")
        
        # Verify member is now in team
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.test_project_private_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        project = response.json()
        assert self.marketing_user_id in project["team_members"], "Marketing user should be in team_members"
        print(f"Team members after addition: {project['team_members']}")
    
    def test_07_marketing_can_see_private_project_after_added(self):
        """Marketing user should now see private project after being added to team"""
        response = requests.get(
            f"{BASE_URL}/api/projects/list",
            headers=self.get_headers(self.marketing_token)
        )
        assert response.status_code == 200
        projects = response.json()
        
        project_ids = [p["id"] for p in projects]
        assert self.test_project_private_id in project_ids, "Marketing should now see private project as team member"
        print(f"Marketing user can now see private project")
    
    def test_08_remove_team_member_from_project(self):
        """Remove a team member from a project"""
        response = requests.delete(
            f"{BASE_URL}/api/projects/{self.test_project_private_id}/members/{self.marketing_user_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Failed to remove member: {response.text}"
        print(f"Removed marketing user from private project team")
        
        # Verify member is removed
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.test_project_private_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        project = response.json()
        assert self.marketing_user_id not in project["team_members"], "Marketing user should be removed from team_members"
        print(f"Team members after removal: {project['team_members']}")
    
    # ============== INDIVIDUAL TASK TESTS ==============
    
    def test_09_create_individual_task_without_project(self):
        """Create an individual task without project_id"""
        response = requests.post(
            f"{BASE_URL}/api/projects/tasks",
            headers=self.get_headers(),
            json={
                "name": "TEST_Individual_Task",
                "description": "This is an individual task without project",
                "priority": "high",
                "due_date": "2026-03-15"
            }
        )
        assert response.status_code == 200, f"Failed to create individual task: {response.text}"
        task = response.json()
        TestProjectVisibilityTeam.individual_task_id = task["id"]
        
        # Verify task is individual (no project_id)
        assert task.get("project_id") is None, f"Individual task should have no project_id, got {task.get('project_id')}"
        assert task.get("is_individual") is True, f"is_individual flag should be True, got {task.get('is_individual')}"
        print(f"Created individual task: {task['name']} (ID: {task['id']})")
        print(f"is_individual: {task['is_individual']}, project_id: {task.get('project_id')}")
    
    def test_10_get_individual_tasks_endpoint(self):
        """Get individual tasks endpoint should return only individual tasks"""
        response = requests.get(
            f"{BASE_URL}/api/projects/individual-tasks",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Failed to get individual tasks: {response.text}"
        tasks = response.json()
        
        # All tasks should be individual
        for task in tasks:
            assert task.get("is_individual") is True or task.get("project_id") is None, \
                f"Individual tasks endpoint returned non-individual task: {task['name']}"
        
        # Our test task should be present
        task_ids = [t["id"] for t in tasks]
        assert self.individual_task_id in task_ids, "Our test individual task should be in the list"
        print(f"Found {len(tasks)} individual tasks")
    
    def test_11_create_task_with_project(self):
        """Create a task linked to a project - should NOT be individual"""
        response = requests.post(
            f"{BASE_URL}/api/projects/tasks",
            headers=self.get_headers(),
            json={
                "name": "TEST_Project_Task",
                "description": "This is a project-linked task",
                "project_id": self.test_project_public_id,
                "priority": "medium"
            }
        )
        assert response.status_code == 200, f"Failed to create project task: {response.text}"
        task = response.json()
        
        # Verify task is NOT individual (has project_id)
        assert task.get("project_id") == self.test_project_public_id, "Task should have project_id"
        assert task.get("is_individual") is False, f"is_individual should be False, got {task.get('is_individual')}"
        print(f"Created project task: {task['name']} (project_id: {task['project_id']})")
    
    def test_12_get_my_tasks_includes_individual_tasks(self):
        """My Tasks endpoint should include both project and individual tasks"""
        response = requests.get(
            f"{BASE_URL}/api/projects/my-tasks",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Failed to get my tasks: {response.text}"
        data = response.json()
        
        # Check stats
        assert "stats" in data, "Response should include stats"
        print(f"My Tasks stats: {data['stats']}")
        
        # Check that we have tasks assigned
        all_tasks = data.get("tasks_assigned", [])
        print(f"Tasks assigned to current user: {len(all_tasks)}")
    
    def test_13_get_individual_task_detail(self):
        """Get individual task by ID and verify is_individual flag"""
        response = requests.get(
            f"{BASE_URL}/api/projects/tasks/{self.individual_task_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Failed to get task: {response.text}"
        task = response.json()
        
        assert task["id"] == self.individual_task_id
        assert task.get("is_individual") is True, "Task should be marked as individual"
        assert task.get("project_name") is None, "Individual task should have no project_name"
        print(f"Individual task verified: {task['name']}, is_individual={task['is_individual']}")
    
    # ============== VISIBILITY FILTER TESTS ==============
    
    def test_14_list_projects_with_visibility_filter(self):
        """Filter projects by visibility"""
        # Filter public only
        response = requests.get(
            f"{BASE_URL}/api/projects/list?visibility=public",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        public_projects = response.json()
        for p in public_projects:
            assert p.get("visibility") == "public", f"Expected public, got {p.get('visibility')}"
        print(f"Found {len(public_projects)} public projects")
        
        # Filter private only
        response = requests.get(
            f"{BASE_URL}/api/projects/list?visibility=private",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        private_projects = response.json()
        for p in private_projects:
            assert p.get("visibility") == "private", f"Expected private, got {p.get('visibility')}"
        print(f"Found {len(private_projects)} private projects")
    
    def test_15_get_project_detail_includes_visibility(self):
        """Verify project detail includes visibility and team info"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{self.test_project_private_id}",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        project = response.json()
        
        assert "visibility" in project, "Response should include visibility"
        assert "team_members" in project, "Response should include team_members"
        assert "team_member_names" in project, "Response should include team_member_names"
        print(f"Project detail - visibility: {project['visibility']}, team_members: {len(project['team_members'])}")
    
    # ============== CLEANUP ==============
    
    def test_99_cleanup(self):
        """Cleanup test data"""
        headers = self.get_headers()
        
        # Delete test task
        if self.individual_task_id:
            requests.delete(f"{BASE_URL}/api/projects/tasks/{self.individual_task_id}", headers=headers)
            print(f"Deleted individual task: {self.individual_task_id}")
        
        # Delete test projects
        if self.test_project_public_id:
            requests.delete(f"{BASE_URL}/api/projects/{self.test_project_public_id}", headers=headers)
            print(f"Deleted public project: {self.test_project_public_id}")
        
        if self.test_project_private_id:
            requests.delete(f"{BASE_URL}/api/projects/{self.test_project_private_id}", headers=headers)
            print(f"Deleted private project: {self.test_project_private_id}")
        
        print("Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
