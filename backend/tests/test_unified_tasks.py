"""
Unified Task Management System Tests
- Task CRUD operations
- Activity logging
- Smart task triggers
- Dashboard stats
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTasksAuthentication:
    """Test authentication for task endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with superadmin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.user = data.get("user")
        assert self.token, "No token received"
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_tasks_endpoint_requires_auth(self):
        """Test that tasks endpoint requires authentication"""
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/tasks")
        # Should return 403 or 401 without auth
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"


class TestTasksCRUD:
    """Task Create, Read, Update, Delete operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with superadmin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.user = data.get("user")
        assert self.token, "No token received"
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_get_all_tasks(self):
        """Test fetching all tasks"""
        response = self.session.get(f"{BASE_URL}/api/tasks")
        assert response.status_code == 200, f"Failed to get tasks: {response.text}"
        
        data = response.json()
        assert "tasks" in data, "Response should have 'tasks' key"
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["tasks"], list), "Tasks should be a list"
        print(f"✓ GET /tasks - Found {data['total']} tasks")
    
    def test_create_task(self):
        """Test creating a new task"""
        task_data = {
            "title": f"TEST_Task_{uuid.uuid4().hex[:8]}",
            "description": "Test task created by automated tests",
            "priority": "high",
            "assigned_team": "sourcing",
            "source_module": "sourcing",
            "tags": ["test", "automated"]
        }
        
        response = self.session.post(f"{BASE_URL}/api/tasks", json=task_data)
        assert response.status_code == 200, f"Failed to create task: {response.text}"
        
        created_task = response.json()
        assert created_task["title"] == task_data["title"], "Title mismatch"
        assert created_task["priority"] == task_data["priority"], "Priority mismatch"
        assert created_task["status"] == "pending", "New task should be pending"
        assert "id" in created_task, "Task should have an ID"
        
        # Verify persistence by fetching the task
        task_id = created_task["id"]
        get_response = self.session.get(f"{BASE_URL}/api/tasks/{task_id}")
        assert get_response.status_code == 200, f"Failed to fetch created task: {get_response.text}"
        
        fetched_task = get_response.json()
        assert fetched_task["title"] == task_data["title"], "Fetched task title mismatch"
        print(f"✓ POST /tasks - Created task: {task_id}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/tasks/{task_id}")
        return task_id
    
    def test_update_task_status(self):
        """Test updating task status (Start Task, Mark Complete, Cancel)"""
        # First create a task
        task_data = {
            "title": f"TEST_StatusUpdate_{uuid.uuid4().hex[:8]}",
            "description": "Task for status update test",
            "priority": "medium"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/tasks", json=task_data)
        assert create_response.status_code == 200, f"Failed to create task: {create_response.text}"
        task_id = create_response.json()["id"]
        
        # Test: Start Task (pending -> in_progress)
        update_response = self.session.put(f"{BASE_URL}/api/tasks/{task_id}", json={
            "status": "in_progress"
        })
        assert update_response.status_code == 200, f"Failed to start task: {update_response.text}"
        
        updated_task = update_response.json()
        assert updated_task["status"] == "in_progress", "Status should be in_progress"
        print(f"✓ PUT /tasks/{task_id} - Status: in_progress (Start Task)")
        
        # Test: Mark Complete (in_progress -> completed)
        complete_response = self.session.put(f"{BASE_URL}/api/tasks/{task_id}", json={
            "status": "completed",
            "completion_notes": "Completed by test"
        })
        assert complete_response.status_code == 200, f"Failed to complete task: {complete_response.text}"
        
        completed_task = complete_response.json()
        assert completed_task["status"] == "completed", "Status should be completed"
        assert completed_task["completed_at"] is not None, "completed_at should be set"
        print(f"✓ PUT /tasks/{task_id} - Status: completed (Mark Complete)")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/tasks/{task_id}")
    
    def test_cancel_task(self):
        """Test cancelling a task"""
        # Create a task
        task_data = {
            "title": f"TEST_Cancel_{uuid.uuid4().hex[:8]}",
            "priority": "low"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/tasks", json=task_data)
        assert create_response.status_code == 200
        task_id = create_response.json()["id"]
        
        # Cancel the task
        cancel_response = self.session.put(f"{BASE_URL}/api/tasks/{task_id}", json={
            "status": "cancelled"
        })
        assert cancel_response.status_code == 200, f"Failed to cancel task: {cancel_response.text}"
        
        cancelled_task = cancel_response.json()
        assert cancelled_task["status"] == "cancelled", "Status should be cancelled"
        print(f"✓ PUT /tasks/{task_id} - Status: cancelled (Cancel Task)")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/tasks/{task_id}")
    
    def test_delete_task(self):
        """Test deleting a task"""
        # Create a task
        task_data = {
            "title": f"TEST_Delete_{uuid.uuid4().hex[:8]}",
            "priority": "low"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/tasks", json=task_data)
        assert create_response.status_code == 200
        task_id = create_response.json()["id"]
        
        # Delete the task
        delete_response = self.session.delete(f"{BASE_URL}/api/tasks/{task_id}")
        assert delete_response.status_code == 200, f"Failed to delete task: {delete_response.text}"
        
        delete_data = delete_response.json()
        assert "message" in delete_data, "Should have message in response"
        print(f"✓ DELETE /tasks/{task_id} - Task deleted successfully")
        
        # Verify task is gone
        get_response = self.session.get(f"{BASE_URL}/api/tasks/{task_id}")
        assert get_response.status_code == 404, "Deleted task should return 404"


class TestTasksFilters:
    """Test task filtering functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        assert login_response.status_code == 200
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_filter_by_status(self):
        """Test filtering tasks by status"""
        response = self.session.get(f"{BASE_URL}/api/tasks?status=pending")
        assert response.status_code == 200, f"Failed to filter by status: {response.text}"
        
        data = response.json()
        # All returned tasks should be pending
        for task in data["tasks"]:
            assert task["status"] == "pending", f"Task {task['id']} has status {task['status']}, expected pending"
        print(f"✓ GET /tasks?status=pending - Filtered {len(data['tasks'])} pending tasks")
    
    def test_filter_by_priority(self):
        """Test filtering tasks by priority"""
        response = self.session.get(f"{BASE_URL}/api/tasks?priority=high")
        assert response.status_code == 200, f"Failed to filter by priority: {response.text}"
        
        data = response.json()
        for task in data["tasks"]:
            assert task["priority"] == "high", f"Task {task['id']} has priority {task['priority']}, expected high"
        print(f"✓ GET /tasks?priority=high - Filtered {len(data['tasks'])} high priority tasks")
    
    def test_filter_by_module(self):
        """Test filtering tasks by source module"""
        response = self.session.get(f"{BASE_URL}/api/tasks?source_module=sourcing")
        assert response.status_code == 200, f"Failed to filter by module: {response.text}"
        
        data = response.json()
        for task in data["tasks"]:
            assert task["source_module"] == "sourcing", f"Task {task['id']} has module {task['source_module']}, expected sourcing"
        print(f"✓ GET /tasks?source_module=sourcing - Filtered {len(data['tasks'])} sourcing tasks")
    
    def test_search_tasks(self):
        """Test searching tasks by title/description"""
        # Create a task with unique title
        unique_title = f"TEST_Searchable_{uuid.uuid4().hex[:8]}"
        task_data = {"title": unique_title, "priority": "medium"}
        
        create_response = self.session.post(f"{BASE_URL}/api/tasks", json=task_data)
        assert create_response.status_code == 200
        task_id = create_response.json()["id"]
        
        # Search for the task
        response = self.session.get(f"{BASE_URL}/api/tasks?search={unique_title[:15]}")
        assert response.status_code == 200, f"Failed to search tasks: {response.text}"
        
        data = response.json()
        found_task = next((t for t in data["tasks"] if t["id"] == task_id), None)
        assert found_task is not None, f"Created task not found in search results"
        print(f"✓ GET /tasks?search={unique_title[:15]} - Found task in search")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/tasks/{task_id}")


class TestDashboardStats:
    """Test dashboard statistics endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        assert login_response.status_code == 200
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        response = self.session.get(f"{BASE_URL}/api/tasks/dashboard-stats")
        assert response.status_code == 200, f"Failed to get dashboard stats: {response.text}"
        
        stats = response.json()
        
        # Verify required fields
        assert "by_status" in stats, "Stats should have by_status"
        assert "by_module" in stats, "Stats should have by_module"
        assert "by_priority" in stats, "Stats should have by_priority"
        assert "total" in stats, "Stats should have total"
        assert "completed" in stats, "Stats should have completed"
        assert "completion_rate" in stats, "Stats should have completion_rate"
        assert "overdue" in stats, "Stats should have overdue"
        
        print(f"✓ GET /tasks/dashboard-stats - Total: {stats['total']}, Completed: {stats['completed']}, Rate: {stats['completion_rate']}%")
    
    def test_dashboard_stats_periods(self):
        """Test dashboard stats with different time periods"""
        periods = ["today", "week", "month", "quarter", "year"]
        
        for period in periods:
            response = self.session.get(f"{BASE_URL}/api/tasks/dashboard-stats?period={period}")
            assert response.status_code == 200, f"Failed to get stats for period {period}: {response.text}"
            
            stats = response.json()
            assert stats["period"] == period, f"Period mismatch: expected {period}, got {stats['period']}"
        
        print(f"✓ GET /tasks/dashboard-stats?period=[various] - All periods working")
    
    def test_my_tasks_endpoint(self):
        """Test my tasks endpoint"""
        response = self.session.get(f"{BASE_URL}/api/tasks/my-tasks")
        assert response.status_code == 200, f"Failed to get my tasks: {response.text}"
        
        tasks = response.json()
        assert isinstance(tasks, list), "My tasks should return a list"
        print(f"✓ GET /tasks/my-tasks - Found {len(tasks)} assigned tasks")


class TestActivityFeed:
    """Test activity feed endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        assert login_response.status_code == 200
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_get_activity_feed(self):
        """Test fetching activity feed"""
        response = self.session.get(f"{BASE_URL}/api/tasks/activities/feed")
        assert response.status_code == 200, f"Failed to get activity feed: {response.text}"
        
        activities = response.json()
        assert isinstance(activities, list), "Activity feed should return a list"
        print(f"✓ GET /tasks/activities/feed - Found {len(activities)} activities")
    
    def test_activity_feed_filters(self):
        """Test activity feed with filters"""
        # Filter by module
        response = self.session.get(f"{BASE_URL}/api/tasks/activities/feed?module=tasks")
        assert response.status_code == 200, f"Failed to filter activities by module: {response.text}"
        
        activities = response.json()
        for activity in activities:
            assert activity["module"] == "tasks", f"Activity module mismatch: {activity['module']}"
        print(f"✓ GET /tasks/activities/feed?module=tasks - Filtered {len(activities)} task activities")
    
    def test_activity_logged_on_task_create(self):
        """Test that activity is logged when a task is created"""
        # Create a task
        unique_title = f"TEST_ActivityLog_{uuid.uuid4().hex[:8]}"
        task_data = {"title": unique_title, "priority": "medium"}
        
        create_response = self.session.post(f"{BASE_URL}/api/tasks", json=task_data)
        assert create_response.status_code == 200
        task_id = create_response.json()["id"]
        
        # Wait a moment for background task to complete
        import time
        time.sleep(1)
        
        # Check activity feed for the creation event
        response = self.session.get(f"{BASE_URL}/api/tasks/activities/feed?module=tasks&limit=10")
        assert response.status_code == 200
        
        activities = response.json()
        created_activity = next((a for a in activities if a["entity_id"] == task_id and a["action"] == "created"), None)
        assert created_activity is not None, "Task creation should be logged in activity feed"
        assert created_activity["entity_name"] == unique_title, "Activity should have task title"
        print(f"✓ Activity logged for task creation: {task_id}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/tasks/{task_id}")


class TestSmartTaskTriggers:
    """Test smart task trigger configuration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        assert login_response.status_code == 200
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_get_trigger_configs(self):
        """Test fetching trigger configurations"""
        response = self.session.get(f"{BASE_URL}/api/tasks/triggers/config")
        assert response.status_code == 200, f"Failed to get trigger configs: {response.text}"
        
        triggers = response.json()
        assert isinstance(triggers, list), "Triggers should return a list"
        print(f"✓ GET /tasks/triggers/config - Found {len(triggers)} triggers")
        
        # Verify seeded triggers exist
        if len(triggers) > 0:
            trigger = triggers[0]
            assert "id" in trigger, "Trigger should have id"
            assert "module" in trigger, "Trigger should have module"
            assert "entity_type" in trigger, "Trigger should have entity_type"
            assert "trigger_event" in trigger, "Trigger should have trigger_event"
            assert "enabled" in trigger, "Trigger should have enabled flag"
            assert "task_template" in trigger, "Trigger should have task_template"
    
    def test_seed_default_triggers(self):
        """Test seeding default triggers (should be idempotent)"""
        response = self.session.post(f"{BASE_URL}/api/tasks/triggers/seed")
        assert response.status_code == 200, f"Failed to seed triggers: {response.text}"
        
        data = response.json()
        assert "message" in data, "Should have message"
        assert "count" in data, "Should have trigger count"
        print(f"✓ POST /tasks/triggers/seed - {data['count']} triggers seeded")
    
    def test_toggle_trigger_enabled(self):
        """Test toggling trigger enabled/disabled"""
        # First get existing triggers
        get_response = self.session.get(f"{BASE_URL}/api/tasks/triggers/config")
        assert get_response.status_code == 200
        
        triggers = get_response.json()
        if len(triggers) == 0:
            pytest.skip("No triggers to test toggle")
        
        trigger = triggers[0]
        original_enabled = trigger["enabled"]
        trigger_id = trigger["id"]
        
        # Toggle the enabled state
        trigger["enabled"] = not original_enabled
        update_response = self.session.put(f"{BASE_URL}/api/tasks/triggers/config/{trigger_id}", json=trigger)
        assert update_response.status_code == 200, f"Failed to toggle trigger: {update_response.text}"
        
        # Verify the change
        verify_response = self.session.get(f"{BASE_URL}/api/tasks/triggers/config")
        assert verify_response.status_code == 200
        
        updated_triggers = verify_response.json()
        updated_trigger = next((t for t in updated_triggers if t["id"] == trigger_id), None)
        assert updated_trigger is not None, "Trigger not found after update"
        assert updated_trigger["enabled"] == (not original_enabled), "Enabled state not toggled"
        
        print(f"✓ PUT /tasks/triggers/config/{trigger_id} - Toggled enabled: {original_enabled} -> {not original_enabled}")
        
        # Restore original state
        trigger["enabled"] = original_enabled
        self.session.put(f"{BASE_URL}/api/tasks/triggers/config/{trigger_id}", json=trigger)
    
    def test_create_custom_trigger(self):
        """Test creating a custom trigger configuration"""
        trigger_data = {
            "module": "marketing",
            "entity_type": "campaign",
            "trigger_event": "created",
            "trigger_condition": None,
            "task_template": {
                "title": "TEST - Review campaign {entity_name}",
                "description": "Review the newly created campaign",
                "priority": "high",
                "assigned_team": "marketing",
                "trigger_type": "review_campaign",
                "tags": ["test", "campaign-review"]
            },
            "enabled": True,
            "due_date_offset_days": 2
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/tasks/triggers/config", json=trigger_data)
        assert create_response.status_code == 200, f"Failed to create trigger: {create_response.text}"
        
        created_trigger = create_response.json()
        assert "id" in created_trigger, "Created trigger should have id"
        assert created_trigger["module"] == trigger_data["module"], "Module mismatch"
        
        trigger_id = created_trigger["id"]
        print(f"✓ POST /tasks/triggers/config - Created trigger: {trigger_id}")
        
        # Cleanup - delete the test trigger
        delete_response = self.session.delete(f"{BASE_URL}/api/tasks/triggers/config/{trigger_id}")
        assert delete_response.status_code == 200, f"Failed to delete trigger: {delete_response.text}"
        print(f"✓ DELETE /tasks/triggers/config/{trigger_id} - Trigger deleted")


class TestTasksByAssignee:
    """Test tasks by assignee endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        assert login_response.status_code == 200
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_get_tasks_by_assignee(self):
        """Test getting tasks grouped by assignee"""
        response = self.session.get(f"{BASE_URL}/api/tasks/by-assignee")
        assert response.status_code == 200, f"Failed to get tasks by assignee: {response.text}"
        
        assignee_stats = response.json()
        assert isinstance(assignee_stats, list), "Should return a list of assignee stats"
        
        if len(assignee_stats) > 0:
            stat = assignee_stats[0]
            assert "user_id" in stat, "Should have user_id"
            assert "user_name" in stat, "Should have user_name"
            assert "total" in stat, "Should have total"
        
        print(f"✓ GET /tasks/by-assignee - Found stats for {len(assignee_stats)} assignees")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
