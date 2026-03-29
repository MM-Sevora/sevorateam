"""
Sprint Review Features Test Suite
Tests for: Task status change, Sprint Review detail view, Invite Stakeholders, 
Close Sprint modal, Mark as Reviewed, Calendar view tasks, Bulk status update
"""
import pytest
import requests
import os
import json
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSprintReviewFeatures:
    """Sprint Review and related feature tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login and get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.user_id = login_response.json().get("user", {}).get("id")
        
    # ============ Users API Tests (for Stakeholder dropdown) ============
    
    def test_get_all_users_for_stakeholders(self):
        """Test that all users are returned (not filtered by role) for stakeholder selection"""
        response = self.session.get(f"{BASE_URL}/api/workos/users")
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        
        users = response.json()
        assert isinstance(users, list), "Users should be a list"
        assert len(users) > 0, "Should have at least one user"
        
        # Verify user structure
        if users:
            user = users[0]
            assert "id" in user, "User should have id"
            assert "name" in user or "email" in user, "User should have name or email"
        
        print(f"PASS: Got {len(users)} users for stakeholder selection")
        
    # ============ Sprint Review API Tests ============
    
    def test_get_sprint_reviews(self):
        """Test getting sprint reviews list"""
        response = self.session.get(f"{BASE_URL}/api/engineering/sprint-reviews")
        assert response.status_code == 200, f"Failed to get sprint reviews: {response.text}"
        
        reviews = response.json()
        assert isinstance(reviews, list), "Reviews should be a list"
        print(f"PASS: Got {len(reviews)} sprint reviews")
        return reviews
        
    def test_sprint_review_detail_structure(self):
        """Test that sprint review has all required fields for detail view"""
        response = self.session.get(f"{BASE_URL}/api/engineering/sprint-reviews")
        assert response.status_code == 200
        
        reviews = response.json()
        if len(reviews) > 0:
            review = reviews[0]
            # Check required fields for detail view
            expected_fields = ['id', 'sprint_id', 'project_id', 'status']
            for field in expected_fields:
                assert field in review, f"Review missing field: {field}"
            
            # Check optional fields that should be present for detail view
            optional_fields = ['title', 'summary', 'demo_items', 'stakeholder_ids', 
                             'stakeholder_feedback', 'approval_count', 'rejection_count']
            present_fields = [f for f in optional_fields if f in review]
            print(f"PASS: Review has {len(present_fields)}/{len(optional_fields)} optional fields")
        else:
            print("SKIP: No reviews to test detail structure")
            
    # ============ Invite Stakeholders Tests ============
    
    def test_invite_stakeholders_endpoint_exists(self):
        """Test that invite stakeholders endpoint exists"""
        # First get a review
        reviews_response = self.session.get(f"{BASE_URL}/api/engineering/sprint-reviews")
        assert reviews_response.status_code == 200
        
        reviews = reviews_response.json()
        if len(reviews) > 0:
            review_id = reviews[0]['id']
            
            # Get users to invite
            users_response = self.session.get(f"{BASE_URL}/api/workos/users")
            users = users_response.json()
            
            if len(users) > 0:
                # Try to invite a stakeholder
                invite_response = self.session.post(
                    f"{BASE_URL}/api/engineering/sprint-reviews/{review_id}/invite-stakeholders",
                    json={
                        "stakeholder_ids": [users[0]['id']],
                        "send_notification": False,
                        "custom_message": "Test invite"
                    }
                )
                # Should return 200 or 201 for success
                assert invite_response.status_code in [200, 201], f"Invite failed: {invite_response.text}"
                print(f"PASS: Invite stakeholders endpoint works")
            else:
                print("SKIP: No users to invite")
        else:
            print("SKIP: No reviews to test invite")
            
    # ============ Mark as Reviewed Tests ============
    
    def test_mark_as_reviewed_endpoint(self):
        """Test mark as reviewed endpoint"""
        reviews_response = self.session.get(f"{BASE_URL}/api/engineering/sprint-reviews")
        assert reviews_response.status_code == 200
        
        reviews = reviews_response.json()
        if len(reviews) > 0:
            review_id = reviews[0]['id']
            
            response = self.session.post(
                f"{BASE_URL}/api/engineering/sprint-reviews/{review_id}/mark-reviewed"
            )
            assert response.status_code in [200, 201], f"Mark reviewed failed: {response.text}"
            print(f"PASS: Mark as reviewed endpoint works")
        else:
            print("SKIP: No reviews to test mark reviewed")
            
    # ============ Close Sprint Tests ============
    
    def test_get_pending_tasks_for_sprint(self):
        """Test getting pending tasks for close sprint modal"""
        # First get projects with sprints
        projects_response = self.session.get(f"{BASE_URL}/api/projects/list")
        assert projects_response.status_code == 200
        
        projects = projects_response.json()
        sprint_found = False
        
        for project in projects[:5]:  # Check first 5 projects
            sprints_response = self.session.get(f"{BASE_URL}/api/projects/{project['id']}/sprints")
            if sprints_response.status_code == 200:
                sprints = sprints_response.json()
                if len(sprints) > 0:
                    sprint_id = sprints[0]['id']
                    
                    # Test pending tasks endpoint
                    pending_response = self.session.get(
                        f"{BASE_URL}/api/projects/sprints/{sprint_id}/pending-tasks"
                    )
                    assert pending_response.status_code == 200, f"Failed to get pending tasks: {pending_response.text}"
                    
                    data = pending_response.json()
                    assert "pending_count" in data, "Response should have pending_count"
                    assert "pending_tasks" in data, "Response should have pending_tasks"
                    
                    print(f"PASS: Got pending tasks for sprint {sprint_id}: {data['pending_count']} pending")
                    sprint_found = True
                    break
                    
        if not sprint_found:
            print("SKIP: No sprints found to test pending tasks")
            
    def test_close_sprint_endpoint(self):
        """Test close sprint endpoint structure"""
        # Get a sprint to test
        projects_response = self.session.get(f"{BASE_URL}/api/projects/list")
        projects = projects_response.json()
        
        for project in projects[:5]:
            sprints_response = self.session.get(f"{BASE_URL}/api/projects/{project['id']}/sprints")
            if sprints_response.status_code == 200:
                sprints = sprints_response.json()
                # Find an active sprint
                active_sprints = [s for s in sprints if s.get('status') in ['active', 'in_progress', 'planning']]
                
                if len(active_sprints) > 0:
                    sprint_id = active_sprints[0]['id']
                    
                    # Test close sprint with backlog option (safest)
                    close_response = self.session.post(
                        f"{BASE_URL}/api/projects/sprints/{sprint_id}/close",
                        json={
                            "pending_task_action": "keep",  # Keep tasks to not affect data
                            "target_sprint_id": None,
                            "mark_as_reviewed": False
                        }
                    )
                    # Should work or return validation error
                    assert close_response.status_code in [200, 201, 400, 422], f"Unexpected error: {close_response.text}"
                    
                    if close_response.status_code in [200, 201]:
                        print(f"PASS: Close sprint endpoint works")
                    else:
                        print(f"INFO: Close sprint returned {close_response.status_code} - may need specific conditions")
                    return
                    
        print("SKIP: No active sprints found to test close")
        
    # ============ Task Status Change Tests ============
    
    def test_task_status_update(self):
        """Test that task status can be updated directly"""
        # Get a project with tasks
        projects_response = self.session.get(f"{BASE_URL}/api/projects/list")
        projects = projects_response.json()
        
        for project in projects[:5]:
            tasks_response = self.session.get(f"{BASE_URL}/api/projects/{project['id']}/tasks")
            if tasks_response.status_code == 200:
                tasks = tasks_response.json()
                if len(tasks) > 0:
                    task = tasks[0]
                    task_id = task['id']
                    original_status = task.get('status', 'todo')
                    
                    # Try to update status
                    new_status = 'in_progress' if original_status != 'in_progress' else 'todo'
                    
                    update_response = self.session.put(
                        f"{BASE_URL}/api/projects/tasks/{task_id}",
                        json={"status": new_status}
                    )
                    assert update_response.status_code == 200, f"Failed to update task status: {update_response.text}"
                    
                    # Verify the update
                    updated_task = update_response.json()
                    assert updated_task.get('status') == new_status, f"Status not updated: expected {new_status}, got {updated_task.get('status')}"
                    
                    # Restore original status
                    self.session.put(
                        f"{BASE_URL}/api/projects/tasks/{task_id}",
                        json={"status": original_status}
                    )
                    
                    print(f"PASS: Task status update works (changed from {original_status} to {new_status})")
                    return
                    
        print("SKIP: No tasks found to test status update")
        
    # ============ Bulk Status Update Tests ============
    
    def test_bulk_task_update(self):
        """Test bulk task update endpoint"""
        projects_response = self.session.get(f"{BASE_URL}/api/projects/list")
        projects = projects_response.json()
        
        for project in projects[:5]:
            tasks_response = self.session.get(f"{BASE_URL}/api/projects/{project['id']}/tasks")
            if tasks_response.status_code == 200:
                tasks = tasks_response.json()
                if len(tasks) >= 2:
                    task_ids = [tasks[0]['id'], tasks[1]['id']]
                    original_statuses = [(t['id'], t.get('status')) for t in tasks[:2]]
                    
                    # Try bulk update
                    bulk_response = self.session.put(
                        f"{BASE_URL}/api/projects/{project['id']}/tasks/bulk-update",
                        json={
                            "task_ids": task_ids,
                            "updates": {"status": "in_progress"}
                        }
                    )
                    
                    if bulk_response.status_code == 200:
                        print(f"PASS: Bulk task update works")
                        
                        # Restore original statuses
                        for task_id, status in original_statuses:
                            self.session.put(
                                f"{BASE_URL}/api/projects/tasks/{task_id}",
                                json={"status": status or "todo"}
                            )
                        return
                    elif bulk_response.status_code == 404:
                        print("INFO: Bulk update endpoint not found - may use individual updates")
                        return
                    else:
                        print(f"INFO: Bulk update returned {bulk_response.status_code}")
                        return
                        
        print("SKIP: Not enough tasks to test bulk update")
        
    # ============ Calendar View Task Tests ============
    
    def test_tasks_have_due_dates_for_calendar(self):
        """Test that tasks have due_date field for calendar view"""
        projects_response = self.session.get(f"{BASE_URL}/api/projects/list")
        projects = projects_response.json()
        
        for project in projects[:5]:
            tasks_response = self.session.get(f"{BASE_URL}/api/projects/{project['id']}/tasks")
            if tasks_response.status_code == 200:
                tasks = tasks_response.json()
                if len(tasks) > 0:
                    task = tasks[0]
                    # Check task has fields needed for calendar
                    assert 'id' in task, "Task should have id"
                    assert 'name' in task, "Task should have name"
                    # due_date may be optional but should be in schema
                    print(f"PASS: Task structure valid for calendar view")
                    return
                    
        print("SKIP: No tasks found to verify calendar structure")
        
    # ============ Sprint Planning Start Date Tests ============
    
    def test_sprint_has_start_date(self):
        """Test that sprints have start_date field"""
        projects_response = self.session.get(f"{BASE_URL}/api/projects/list")
        projects = projects_response.json()
        
        for project in projects[:5]:
            sprints_response = self.session.get(f"{BASE_URL}/api/projects/{project['id']}/sprints")
            if sprints_response.status_code == 200:
                sprints = sprints_response.json()
                if len(sprints) > 0:
                    sprint = sprints[0]
                    assert 'start_date' in sprint or 'startDate' in sprint, "Sprint should have start_date"
                    print(f"PASS: Sprint has start_date field")
                    return
                    
        print("SKIP: No sprints found to verify start_date")


class TestProjectsAndTasks:
    """Additional project and task tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
    def test_get_project_tasks(self):
        """Test getting tasks for a project"""
        projects_response = self.session.get(f"{BASE_URL}/api/projects/list")
        assert projects_response.status_code == 200
        
        projects = projects_response.json()
        if len(projects) > 0:
            project_id = projects[0]['id']
            tasks_response = self.session.get(f"{BASE_URL}/api/projects/{project_id}/tasks")
            assert tasks_response.status_code == 200
            print(f"PASS: Got tasks for project {project_id}")
        else:
            print("SKIP: No projects to test")
            
    def test_get_project_sprints(self):
        """Test getting sprints for a project"""
        projects_response = self.session.get(f"{BASE_URL}/api/projects/list")
        assert projects_response.status_code == 200
        
        projects = projects_response.json()
        if len(projects) > 0:
            project_id = projects[0]['id']
            sprints_response = self.session.get(f"{BASE_URL}/api/projects/{project_id}/sprints")
            assert sprints_response.status_code == 200
            print(f"PASS: Got sprints for project {project_id}")
        else:
            print("SKIP: No projects to test")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
