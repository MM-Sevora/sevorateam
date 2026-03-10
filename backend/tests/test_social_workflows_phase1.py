"""
Test Social Media Workflows Phase 1:
- Multi-stage Approval Configuration (approval-chains)
- Queue Posting with Time Slots (queues)
- Post Version Control (versions)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Auth helper
def get_auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "superadmin@sevora.com", "password": "superadmin123"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

def get_auth_headers():
    """Get headers with auth token"""
    token = get_auth_token()
    if token:
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    return {"Content-Type": "application/json"}

class TestApprovalWorkflows:
    """Test Approval Workflows CRUD - Multi-stage Approval Configuration"""
    
    def test_get_approval_workflows_list(self):
        """GET /api/social/workflows/approval-chains - List all workflows"""
        response = requests.get(f"{BASE_URL}/api/social/workflows/approval-chains")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} approval workflows")
        
    def test_create_approval_workflow(self):
        """POST /api/social/workflows/approval-chains - Create new workflow"""
        unique_id = str(uuid.uuid4())[:8]
        workflow_data = {
            "name": f"TEST_WORKFLOW_{unique_id}",
            "description": "Test workflow created by pytest",
            "is_default": False,
            "platforms": ["linkedin", "twitter"],
            "stages": [
                {
                    "stage_name": "Content Review",
                    "stage_order": 1,
                    "approver_type": "role",
                    "approver_ids": ["social_manager"],
                    "can_skip": False,
                    "auto_approve_after_hours": 24
                },
                {
                    "stage_name": "Final Approval",
                    "stage_order": 2,
                    "approver_type": "role",
                    "approver_ids": ["admin", "super_admin"],
                    "can_skip": True,
                    "auto_approve_after_hours": None
                }
            ]
        }
        response = requests.post(
            f"{BASE_URL}/api/social/workflows/approval-chains",
            json=workflow_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "workflow_id" in data, "Response should contain workflow_id"
        assert data["name"] == workflow_data["name"], "Workflow name should match"
        assert len(data["stages"]) == 2, "Should have 2 stages"
        assert data["platforms"] == ["linkedin", "twitter"]
        
        # Store for cleanup
        pytest.created_workflow_id = data["workflow_id"]
        print(f"Created workflow: {data['workflow_id']}")
        
    def test_get_single_approval_workflow(self):
        """GET /api/social/workflows/approval-chains/{id} - Get specific workflow"""
        if not hasattr(pytest, 'created_workflow_id'):
            pytest.skip("No workflow created in previous test")
            
        response = requests.get(f"{BASE_URL}/api/social/workflows/approval-chains/{pytest.created_workflow_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["workflow_id"] == pytest.created_workflow_id
        assert "stages" in data
        print(f"Retrieved workflow: {data['name']}")
        
    def test_update_approval_workflow(self):
        """PUT /api/social/workflows/approval-chains/{id} - Update workflow"""
        if not hasattr(pytest, 'created_workflow_id'):
            pytest.skip("No workflow created in previous test")
            
        update_data = {
            "name": "TEST_WORKFLOW_UPDATED",
            "description": "Updated description",
            "platforms": ["linkedin", "twitter", "facebook"]
        }
        response = requests.put(
            f"{BASE_URL}/api/social/workflows/approval-chains/{pytest.created_workflow_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_WORKFLOW_UPDATED"
        assert "facebook" in data["platforms"]
        
        # Verify persistence with GET
        verify_response = requests.get(f"{BASE_URL}/api/social/workflows/approval-chains/{pytest.created_workflow_id}")
        verify_data = verify_response.json()
        assert verify_data["name"] == "TEST_WORKFLOW_UPDATED"
        print("Workflow updated and verified")
        
    def test_delete_approval_workflow(self):
        """DELETE /api/social/workflows/approval-chains/{id} - Delete workflow"""
        if not hasattr(pytest, 'created_workflow_id'):
            pytest.skip("No workflow created in previous test")
            
        response = requests.delete(f"{BASE_URL}/api/social/workflows/approval-chains/{pytest.created_workflow_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify deletion
        verify_response = requests.get(f"{BASE_URL}/api/social/workflows/approval-chains/{pytest.created_workflow_id}")
        assert verify_response.status_code == 404, "Deleted workflow should return 404"
        print(f"Workflow {pytest.created_workflow_id} deleted")
        
    def test_get_default_workflow(self):
        """GET /api/social/workflows/approval-chains/default/get - Get default workflow"""
        response = requests.get(f"{BASE_URL}/api/social/workflows/approval-chains/default/get")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "workflow_id" in data or data.get("name") == "Default Workflow"
        assert "stages" in data
        print(f"Default workflow: {data.get('name', 'Default')}")


class TestPostingQueues:
    """Test Posting Queues CRUD - Queue Posting with Time Slots"""
    
    def test_get_posting_queues_list(self):
        """GET /api/social/workflows/queues - List all queues"""
        response = requests.get(f"{BASE_URL}/api/social/workflows/queues")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} posting queues")
        
    def test_create_posting_queue(self):
        """POST /api/social/workflows/queues - Create new queue with time slots"""
        unique_id = str(uuid.uuid4())[:8]
        queue_data = {
            "name": f"TEST_QUEUE_{unique_id}",
            "platform": "linkedin",
            "description": "Test queue created by pytest",
            "is_active": True,
            "timezone": "America/New_York",
            "time_slots": [
                {
                    "day_of_week": 1,  # Monday
                    "time": "09:00",
                    "label": "Morning"
                },
                {
                    "day_of_week": 1,  # Monday
                    "time": "14:00",
                    "label": "Afternoon"
                },
                {
                    "day_of_week": 3,  # Wednesday
                    "time": "10:00",
                    "label": "Mid-morning"
                }
            ]
        }
        response = requests.post(
            f"{BASE_URL}/api/social/workflows/queues",
            json=queue_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "queue_id" in data, "Response should contain queue_id"
        assert data["name"] == queue_data["name"]
        assert data["platform"] == "linkedin"
        assert len(data["time_slots"]) == 3, "Should have 3 time slots"
        assert data["timezone"] == "America/New_York"
        
        # Store for cleanup
        pytest.created_queue_id = data["queue_id"]
        print(f"Created queue: {data['queue_id']}")
        
    def test_get_single_posting_queue(self):
        """GET /api/social/workflows/queues/{id} - Get specific queue"""
        if not hasattr(pytest, 'created_queue_id'):
            pytest.skip("No queue created in previous test")
            
        response = requests.get(f"{BASE_URL}/api/social/workflows/queues/{pytest.created_queue_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["queue_id"] == pytest.created_queue_id
        assert "time_slots" in data
        print(f"Retrieved queue: {data['name']}")
        
    def test_update_posting_queue(self):
        """PUT /api/social/workflows/queues/{id} - Update queue"""
        if not hasattr(pytest, 'created_queue_id'):
            pytest.skip("No queue created in previous test")
            
        update_data = {
            "name": "TEST_QUEUE_UPDATED",
            "is_active": False,
            "timezone": "UTC"
        }
        response = requests.put(
            f"{BASE_URL}/api/social/workflows/queues/{pytest.created_queue_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_QUEUE_UPDATED"
        assert data["is_active"] == False
        assert data["timezone"] == "UTC"
        
        # Verify persistence with GET
        verify_response = requests.get(f"{BASE_URL}/api/social/workflows/queues/{pytest.created_queue_id}")
        verify_data = verify_response.json()
        assert verify_data["name"] == "TEST_QUEUE_UPDATED"
        print("Queue updated and verified")
        
    def test_delete_posting_queue(self):
        """DELETE /api/social/workflows/queues/{id} - Delete queue"""
        if not hasattr(pytest, 'created_queue_id'):
            pytest.skip("No queue created in previous test")
            
        response = requests.delete(f"{BASE_URL}/api/social/workflows/queues/{pytest.created_queue_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify deletion
        verify_response = requests.get(f"{BASE_URL}/api/social/workflows/queues/{pytest.created_queue_id}")
        assert verify_response.status_code == 404, "Deleted queue should return 404"
        print(f"Queue {pytest.created_queue_id} deleted")


class TestPostVersionControl:
    """Test Post Version Control - Version history and restore"""
    
    @pytest.fixture(autouse=True)
    def setup_test_post(self):
        """Create a test post for version control tests"""
        unique_id = str(uuid.uuid4())[:8]
        post_data = {
            "platform": "linkedin",
            "content": f"TEST_VERSION_POST_{unique_id} - Original content for version testing",
            "status": "draft",
            "scheduled_at": "2026-03-15T10:00:00"
        }
        headers = get_auth_headers()
        response = requests.post(f"{BASE_URL}/api/social/posts", json=post_data, headers=headers)
        if response.status_code == 200:
            data = response.json()
            self.test_post_id = data.get("post_id") or data.get("id")
            self.headers = headers
            yield
            # Cleanup
            requests.delete(f"{BASE_URL}/api/social/posts/{self.test_post_id}", headers=headers)
        else:
            pytest.skip(f"Could not create test post: {response.text}")
            yield
    
    def test_get_post_versions_empty(self):
        """GET /api/social/workflows/posts/{id}/versions - Initially empty"""
        response = requests.get(f"{BASE_URL}/api/social/workflows/posts/{self.test_post_id}/versions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Post has {len(data)} versions initially")
        
    def test_create_post_version(self):
        """POST /api/social/workflows/posts/{id}/versions - Create version snapshot"""
        version_data = {
            "change_note": "Initial version saved by pytest",
            "user_id": "test_user"
        }
        response = requests.post(
            f"{BASE_URL}/api/social/workflows/posts/{self.test_post_id}/versions",
            json=version_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "version_id" in data, "Response should contain version_id"
        assert "version_number" in data
        assert data["change_note"] == "Initial version saved by pytest"
        
        pytest.created_version_id = data["version_id"]
        print(f"Created version {data['version_number']}: {data['version_id']}")
        
    def test_get_post_versions_after_create(self):
        """GET /api/social/workflows/posts/{id}/versions - Should have 1+ version after create"""
        # First create a version
        requests.post(
            f"{BASE_URL}/api/social/workflows/posts/{self.test_post_id}/versions",
            json={"change_note": "Test version"},
            headers=self.headers
        )
        
        response = requests.get(f"{BASE_URL}/api/social/workflows/posts/{self.test_post_id}/versions", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1, "Should have at least 1 version"
        
        # Check version structure
        if len(data) > 0:
            version = data[0]
            assert "version_id" in version
            assert "version_number" in version
            assert "content" in version
            assert "created_at" in version
        print(f"Found {len(data)} versions")
        
    def test_restore_post_version(self):
        """POST /api/social/workflows/posts/{id}/versions/{vid}/restore - Restore version"""
        # First create a version
        create_response = requests.post(
            f"{BASE_URL}/api/social/workflows/posts/{self.test_post_id}/versions",
            json={"change_note": "Version to restore"},
            headers=self.headers
        )
        if create_response.status_code != 200:
            pytest.skip("Could not create version for restore test")
            
        version_id = create_response.json()["version_id"]
        
        # Update the post content
        requests.put(
            f"{BASE_URL}/api/social/posts/{self.test_post_id}",
            json={"content": "Updated content that will be overwritten by restore"},
            headers=self.headers
        )
        
        # Restore to the version
        response = requests.post(
            f"{BASE_URL}/api/social/workflows/posts/{self.test_post_id}/versions/{version_id}/restore",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "restore" in data["message"].lower() or "restored" in data.get("message", "").lower()
        print(f"Restored version: {data}")


class TestSeedDefaults:
    """Test seed-defaults endpoint"""
    
    def test_seed_defaults_endpoint(self):
        """POST /api/social/workflows/seed-defaults - Create default data"""
        response = requests.post(f"{BASE_URL}/api/social/workflows/seed-defaults")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "workflows_created" in data or "queues_created" in data
        print(f"Seed results: {data}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_workflows(self):
        """Remove any TEST_ prefixed workflows"""
        response = requests.get(f"{BASE_URL}/api/social/workflows/approval-chains")
        if response.status_code == 200:
            workflows = response.json()
            for wf in workflows:
                if wf.get("name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/social/workflows/approval-chains/{wf['workflow_id']}")
                    print(f"Cleaned up workflow: {wf['name']}")
                    
    def test_cleanup_test_queues(self):
        """Remove any TEST_ prefixed queues"""
        response = requests.get(f"{BASE_URL}/api/social/workflows/queues")
        if response.status_code == 200:
            queues = response.json()
            for q in queues:
                if q.get("name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/social/workflows/queues/{q['queue_id']}")
                    print(f"Cleaned up queue: {q['name']}")
