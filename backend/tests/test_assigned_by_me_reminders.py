"""
Tests for Task Assignment Control & Monitoring features:
1) Assigned by Me tab (GET /api/projects/assigned-by-me)
2) Task Reminders/Follow-ups CRUD (POST/GET/DELETE /api/projects/reminders)
3) Rich Text support in comments and task descriptions
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="module")
def superadmin_auth():
    """Authenticate as superadmin"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "superadmin@sevora.com", "password": "superadmin123"}
    )
    if response.status_code != 200:
        pytest.skip(f"Superadmin login failed: {response.text}")
    
    token = response.json()["access_token"]
    user_id = response.json()["user"]["id"]
    return {
        "token": token,
        "user_id": user_id,
        "headers": {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    }


@pytest.fixture(scope="module")
def marketing_auth():
    """Authenticate as marketing user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "marketing@sevora.com", "password": "admin123"}
    )
    if response.status_code != 200:
        pytest.skip(f"Marketing login failed: {response.text}")
    
    token = response.json()["access_token"]
    user_id = response.json()["user"]["id"]
    return {
        "token": token,
        "user_id": user_id,
        "headers": {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    }


@pytest.fixture(scope="module")
def test_project(superadmin_auth):
    """Create a test project for task tests"""
    # Get or create a module first
    modules_response = requests.get(
        f"{BASE_URL}/api/projects/modules",
        headers=superadmin_auth["headers"]
    )
    
    if modules_response.status_code == 200 and modules_response.json():
        module_id = modules_response.json()[0]["id"]
    else:
        # Create a module
        module_response = requests.post(
            f"{BASE_URL}/api/projects/modules",
            headers=superadmin_auth["headers"],
            json={"name": "TEST_Module", "description": "Test module"}
        )
        module_id = module_response.json()["id"]
    
    # Create test project
    project_response = requests.post(
        f"{BASE_URL}/api/projects",
        headers=superadmin_auth["headers"],
        json={
            "name": f"TEST_Assigned_By_Me_Project_{uuid.uuid4().hex[:8]}",
            "module_id": module_id,
            "project_type": "development",
            "description": "Test project for assigned-by-me tests",
            "priority": "medium",
            "visibility": "public"
        }
    )
    
    assert project_response.status_code == 200, f"Failed to create project: {project_response.text}"
    project = project_response.json()
    
    yield project
    
    # Cleanup
    requests.delete(
        f"{BASE_URL}/api/projects/{project['id']}",
        headers=superadmin_auth["headers"]
    )


class TestAssignedByMeEndpoint:
    """Test GET /api/projects/assigned-by-me endpoint"""
    
    def test_assigned_by_me_returns_empty_initially(self, superadmin_auth):
        """Test that assigned-by-me returns tasks (or empty list)"""
        response = requests.get(
            f"{BASE_URL}/api/projects/assigned-by-me",
            headers=superadmin_auth["headers"]
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/projects/assigned-by-me returns {len(data)} tasks")
    
    def test_assigned_by_me_shows_delegated_tasks(self, superadmin_auth, marketing_auth, test_project):
        """Test that tasks assigned by me to others appear in assigned-by-me"""
        # Create a task as superadmin and assign to marketing user
        task_response = requests.post(
            f"{BASE_URL}/api/projects/tasks",
            headers=superadmin_auth["headers"],
            json={
                "name": f"TEST_Delegated_Task_{uuid.uuid4().hex[:8]}",
                "project_id": test_project["id"],
                "description": "Task assigned by superadmin to marketing",
                "priority": "high",
                "assigned_to": marketing_auth["user_id"]
            }
        )
        
        assert task_response.status_code == 200, f"Failed to create task: {task_response.text}"
        task = task_response.json()
        task_id = task["id"]
        
        # Verify assigned_by is set to the creator
        assert task.get("assigned_by") == superadmin_auth["user_id"], "assigned_by should be the creator"
        print(f"✓ Task created with assigned_by set correctly")
        
        # Now check assigned-by-me for superadmin
        response = requests.get(
            f"{BASE_URL}/api/projects/assigned-by-me",
            headers=superadmin_auth["headers"]
        )
        
        assert response.status_code == 200
        delegated_tasks = response.json()
        
        # Find the task we just created
        found = any(t["id"] == task_id for t in delegated_tasks)
        assert found, "Delegated task should appear in assigned-by-me"
        print(f"✓ Delegated task appears in assigned-by-me endpoint")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/projects/tasks/{task_id}",
            headers=superadmin_auth["headers"]
        )
    
    def test_assigned_by_me_excludes_self_assigned(self, superadmin_auth, test_project):
        """Test that self-assigned tasks don't appear in assigned-by-me"""
        # Create a task assigned to self
        task_response = requests.post(
            f"{BASE_URL}/api/projects/tasks",
            headers=superadmin_auth["headers"],
            json={
                "name": f"TEST_Self_Assigned_Task_{uuid.uuid4().hex[:8]}",
                "project_id": test_project["id"],
                "description": "Task assigned to self",
                "priority": "medium",
                "assigned_to": superadmin_auth["user_id"]
            }
        )
        
        assert task_response.status_code == 200
        task = task_response.json()
        task_id = task["id"]
        
        # Check assigned-by-me - self-assigned should NOT appear
        response = requests.get(
            f"{BASE_URL}/api/projects/assigned-by-me",
            headers=superadmin_auth["headers"]
        )
        
        assert response.status_code == 200
        delegated_tasks = response.json()
        
        # Self-assigned task should NOT be in the list
        found = any(t["id"] == task_id for t in delegated_tasks)
        assert not found, "Self-assigned task should NOT appear in assigned-by-me"
        print(f"✓ Self-assigned tasks correctly excluded from assigned-by-me")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/projects/tasks/{task_id}",
            headers=superadmin_auth["headers"]
        )
    
    def test_assigned_by_me_filters_by_status(self, superadmin_auth, marketing_auth, test_project):
        """Test status filter on assigned-by-me endpoint"""
        # Create task
        task_response = requests.post(
            f"{BASE_URL}/api/projects/tasks",
            headers=superadmin_auth["headers"],
            json={
                "name": f"TEST_Filter_Task_{uuid.uuid4().hex[:8]}",
                "project_id": test_project["id"],
                "priority": "medium",
                "assigned_to": marketing_auth["user_id"]
            }
        )
        
        task_id = task_response.json()["id"]
        
        # Test without include_completed (default)
        response_active = requests.get(
            f"{BASE_URL}/api/projects/assigned-by-me",
            headers=superadmin_auth["headers"]
        )
        assert response_active.status_code == 200
        
        # Test with include_completed
        response_all = requests.get(
            f"{BASE_URL}/api/projects/assigned-by-me?include_completed=true",
            headers=superadmin_auth["headers"]
        )
        assert response_all.status_code == 200
        print(f"✓ assigned-by-me supports include_completed filter")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/projects/tasks/{task_id}",
            headers=superadmin_auth["headers"]
        )


class TestRemindersEndpoint:
    """Test Task Reminders/Follow-ups CRUD operations"""
    
    @pytest.fixture(scope="class")
    def test_task(self, superadmin_auth, test_project):
        """Create a test task for reminder tests"""
        task_response = requests.post(
            f"{BASE_URL}/api/projects/tasks",
            headers=superadmin_auth["headers"],
            json={
                "name": f"TEST_Reminder_Task_{uuid.uuid4().hex[:8]}",
                "project_id": test_project["id"],
                "description": "Task for testing reminders",
                "priority": "high"
            }
        )
        
        assert task_response.status_code == 200
        task = task_response.json()
        
        yield task
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/projects/tasks/{task['id']}",
            headers=superadmin_auth["headers"]
        )
    
    def test_create_reminder(self, superadmin_auth, test_task):
        """Test POST /api/projects/reminders creates a reminder"""
        remind_at = (datetime.utcnow() + timedelta(hours=1)).isoformat()
        
        response = requests.post(
            f"{BASE_URL}/api/projects/reminders",
            headers=superadmin_auth["headers"],
            json={
                "task_id": test_task["id"],
                "remind_at": remind_at,
                "message": "Follow up on progress"
            }
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        reminder = response.json()
        
        assert "id" in reminder, "Reminder should have an ID"
        assert reminder["task_id"] == test_task["id"]
        assert reminder["message"] == "Follow up on progress"
        assert reminder["is_sent"] == False
        print(f"✓ POST /api/projects/reminders creates reminder successfully")
        
        # Store for cleanup
        test_task["reminder_id"] = reminder["id"]
        return reminder
    
    def test_get_reminders(self, superadmin_auth, test_task):
        """Test GET /api/projects/reminders returns user's reminders"""
        # Create a reminder first
        remind_at = (datetime.utcnow() + timedelta(hours=2)).isoformat()
        create_response = requests.post(
            f"{BASE_URL}/api/projects/reminders",
            headers=superadmin_auth["headers"],
            json={
                "task_id": test_task["id"],
                "remind_at": remind_at,
                "message": "Test reminder"
            }
        )
        reminder_id = create_response.json()["id"]
        
        # Get reminders
        response = requests.get(
            f"{BASE_URL}/api/projects/reminders",
            headers=superadmin_auth["headers"]
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        reminders = response.json()
        assert isinstance(reminders, list)
        print(f"✓ GET /api/projects/reminders returns {len(reminders)} reminders")
        
        # Verify reminder with task_name enrichment
        found = [r for r in reminders if r["id"] == reminder_id]
        assert len(found) == 1, "Created reminder should be in the list"
        assert "task_name" in found[0], "Reminder should include task_name"
        print(f"✓ Reminders include task_name enrichment")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/projects/reminders/{reminder_id}",
            headers=superadmin_auth["headers"]
        )
    
    def test_get_reminders_by_task(self, superadmin_auth, test_task):
        """Test filtering reminders by task_id"""
        # Create reminder
        remind_at = (datetime.utcnow() + timedelta(hours=3)).isoformat()
        create_response = requests.post(
            f"{BASE_URL}/api/projects/reminders",
            headers=superadmin_auth["headers"],
            json={
                "task_id": test_task["id"],
                "remind_at": remind_at
            }
        )
        reminder_id = create_response.json()["id"]
        
        # Filter by task_id
        response = requests.get(
            f"{BASE_URL}/api/projects/reminders?task_id={test_task['id']}",
            headers=superadmin_auth["headers"]
        )
        
        assert response.status_code == 200
        reminders = response.json()
        assert all(r["task_id"] == test_task["id"] for r in reminders)
        print(f"✓ GET /api/projects/reminders?task_id filters correctly")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/projects/reminders/{reminder_id}",
            headers=superadmin_auth["headers"]
        )
    
    def test_delete_reminder(self, superadmin_auth, test_task):
        """Test DELETE /api/projects/reminders/{id}"""
        # Create a reminder
        remind_at = (datetime.utcnow() + timedelta(days=1)).isoformat()
        create_response = requests.post(
            f"{BASE_URL}/api/projects/reminders",
            headers=superadmin_auth["headers"],
            json={
                "task_id": test_task["id"],
                "remind_at": remind_at,
                "message": "Reminder to delete"
            }
        )
        reminder = create_response.json()
        
        # Delete the reminder
        delete_response = requests.delete(
            f"{BASE_URL}/api/projects/reminders/{reminder['id']}",
            headers=superadmin_auth["headers"]
        )
        
        assert delete_response.status_code == 200, f"Failed: {delete_response.text}"
        assert delete_response.json().get("success") == True
        print(f"✓ DELETE /api/projects/reminders/{reminder['id']} succeeds")
        
        # Verify it's deleted
        get_response = requests.get(
            f"{BASE_URL}/api/projects/reminders?task_id={test_task['id']}",
            headers=superadmin_auth["headers"]
        )
        reminders = get_response.json()
        assert all(r["id"] != reminder["id"] for r in reminders)
        print(f"✓ Reminder no longer in list after deletion")
    
    def test_delete_nonexistent_reminder(self, superadmin_auth):
        """Test deleting a non-existent reminder returns 404"""
        fake_id = str(uuid.uuid4())
        
        response = requests.delete(
            f"{BASE_URL}/api/projects/reminders/{fake_id}",
            headers=superadmin_auth["headers"]
        )
        
        assert response.status_code == 404
        print(f"✓ DELETE non-existent reminder returns 404")


class TestRichTextComments:
    """Test rich text support in comments"""
    
    @pytest.fixture(scope="class")
    def test_task_for_comments(self, superadmin_auth, test_project):
        """Create a test task for comment tests"""
        task_response = requests.post(
            f"{BASE_URL}/api/projects/tasks",
            headers=superadmin_auth["headers"],
            json={
                "name": f"TEST_Comments_Task_{uuid.uuid4().hex[:8]}",
                "project_id": test_project["id"],
                "description": "<p>Rich <strong>description</strong> with <em>formatting</em></p>",
                "priority": "medium"
            }
        )
        
        assert task_response.status_code == 200
        task = task_response.json()
        
        yield task
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/projects/tasks/{task['id']}",
            headers=superadmin_auth["headers"]
        )
    
    def test_create_comment_with_rich_text(self, superadmin_auth, test_task_for_comments):
        """Test creating a comment with HTML content"""
        rich_content = """
        <h2>Update</h2>
        <p>This is a <strong>bold</strong> and <em>italic</em> comment.</p>
        <ul>
            <li>Item 1</li>
            <li>Item 2</li>
        </ul>
        <pre><code>const x = 1;</code></pre>
        """
        
        response = requests.post(
            f"{BASE_URL}/api/projects/comments",
            headers=superadmin_auth["headers"],
            json={
                "task_id": test_task_for_comments["id"],
                "content": rich_content
            }
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        comment = response.json()
        
        assert "id" in comment
        assert comment["content"] == rich_content
        assert "author_name" in comment
        print(f"✓ Comment with rich text HTML created successfully")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/projects/comments/{comment['id']}",
            headers=superadmin_auth["headers"]
        )
    
    def test_get_comments_preserves_html(self, superadmin_auth, test_task_for_comments):
        """Test that fetching comments preserves HTML content"""
        rich_content = "<p><strong>Bold</strong> text with <a href='https://example.com'>link</a></p>"
        
        # Create comment
        create_response = requests.post(
            f"{BASE_URL}/api/projects/comments",
            headers=superadmin_auth["headers"],
            json={
                "task_id": test_task_for_comments["id"],
                "content": rich_content
            }
        )
        comment_id = create_response.json()["id"]
        
        # Fetch comments
        response = requests.get(
            f"{BASE_URL}/api/projects/tasks/{test_task_for_comments['id']}/comments",
            headers=superadmin_auth["headers"]
        )
        
        assert response.status_code == 200
        comments = response.json()
        
        found = [c for c in comments if c["id"] == comment_id]
        assert len(found) == 1
        assert "<strong>Bold</strong>" in found[0]["content"]
        print(f"✓ HTML content preserved when fetching comments")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/projects/comments/{comment_id}",
            headers=superadmin_auth["headers"]
        )
    
    def test_task_description_supports_html(self, superadmin_auth, test_project):
        """Test that task description supports HTML content"""
        html_description = """
        <h1>Task Overview</h1>
        <p>This task requires:</p>
        <ol>
            <li>First step</li>
            <li>Second step</li>
        </ol>
        <blockquote>Important note</blockquote>
        """
        
        # Create task with HTML description
        response = requests.post(
            f"{BASE_URL}/api/projects/tasks",
            headers=superadmin_auth["headers"],
            json={
                "name": f"TEST_HTML_Task_{uuid.uuid4().hex[:8]}",
                "project_id": test_project["id"],
                "description": html_description,
                "priority": "medium"
            }
        )
        
        assert response.status_code == 200
        task = response.json()
        
        # Verify description is preserved
        assert task["description"] == html_description
        print(f"✓ Task description supports HTML content")
        
        # Fetch task and verify
        get_response = requests.get(
            f"{BASE_URL}/api/projects/tasks/{task['id']}",
            headers=superadmin_auth["headers"]
        )
        
        assert get_response.status_code == 200
        fetched_task = get_response.json()
        assert "<h1>Task Overview</h1>" in fetched_task["description"]
        print(f"✓ HTML preserved when fetching task")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/projects/tasks/{task['id']}",
            headers=superadmin_auth["headers"]
        )


class TestMyTasksWithAssignedByMe:
    """Test that My Tasks page includes correct counts"""
    
    def test_my_tasks_endpoint(self, superadmin_auth):
        """Test GET /api/projects/my-tasks returns stats"""
        response = requests.get(
            f"{BASE_URL}/api/projects/my-tasks",
            headers=superadmin_auth["headers"]
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "stats" in data
        assert "tasks_assigned" in data
        assert "tasks_due_today" in data
        assert "tasks_overdue" in data
        assert "tasks_in_progress" in data
        assert "tasks_pending_review" in data
        assert "recently_completed" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_assigned" in stats
        assert "due_today" in stats
        assert "overdue" in stats
        assert "in_progress" in stats
        assert "pending_review" in stats
        
        print(f"✓ GET /api/projects/my-tasks returns correct structure")
        print(f"  Stats: total_assigned={stats['total_assigned']}, overdue={stats['overdue']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
