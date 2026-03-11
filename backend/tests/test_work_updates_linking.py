"""
Test Work Updates Linking Feature for Sevora Pulse
Tests: Daily/Weekly updates with linked tasks/projects, linkable items endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWorkUpdatesLinking:
    """Tests for Work Updates with linked items feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        """Setup for each test"""
        self.client = api_client
        self.client.headers.update({"Authorization": f"Bearer {auth_token}"})
    
    # ===================== LINKABLE ITEMS ENDPOINT =====================
    
    def test_get_linkable_items_endpoint_exists(self, api_client, auth_token):
        """Test GET /api/pulse/updates/linkable-items returns user's tasks and projects"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        response = api_client.get(f"{BASE_URL}/api/pulse/updates/linkable-items")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should have 'items' key"
        assert isinstance(data["items"], list), "Items should be a list"
    
    def test_linkable_items_structure(self, api_client, auth_token):
        """Test linkable items have correct structure"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        response = api_client.get(f"{BASE_URL}/api/pulse/updates/linkable-items?limit=10")
        
        assert response.status_code == 200
        data = response.json()
        
        # If there are items, verify structure
        if len(data["items"]) > 0:
            item = data["items"][0]
            assert "item_type" in item, "Item should have item_type (task/project)"
            assert "item_id" in item, "Item should have item_id"
            assert "item_name" in item, "Item should have item_name"
            assert item["item_type"] in ["task", "project"], f"Invalid item_type: {item['item_type']}"
        
        print(f"Linkable items returned: {len(data['items'])} items")
    
    def test_linkable_items_with_search(self, api_client, auth_token):
        """Test linkable items search filter"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # Search with a common term
        response = api_client.get(f"{BASE_URL}/api/pulse/updates/linkable-items?search=task")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["items"], list)
        print(f"Search 'task' returned: {len(data['items'])} items")
    
    def test_linkable_items_filter_by_type_task(self, api_client, auth_token):
        """Test linkable items filtering by item_type=task"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        response = api_client.get(f"{BASE_URL}/api/pulse/updates/linkable-items?item_type=task")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned items should be tasks
        for item in data["items"]:
            assert item["item_type"] == "task", f"Expected task, got {item['item_type']}"
        
        print(f"Filter item_type=task returned: {len(data['items'])} tasks")
    
    def test_linkable_items_filter_by_type_project(self, api_client, auth_token):
        """Test linkable items filtering by item_type=project"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        response = api_client.get(f"{BASE_URL}/api/pulse/updates/linkable-items?item_type=project")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned items should be projects
        for item in data["items"]:
            assert item["item_type"] == "project", f"Expected project, got {item['item_type']}"
        
        print(f"Filter item_type=project returned: {len(data['items'])} projects")
    
    # ===================== DAILY UPDATE WITH LINKED ITEMS =====================
    
    def test_submit_daily_update_with_linked_item(self, api_client, auth_token):
        """Test submitting daily update with linked task/project"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # First, get a linkable item
        linkable_response = api_client.get(f"{BASE_URL}/api/pulse/updates/linkable-items?limit=1")
        linkable_data = linkable_response.json()
        
        linked_item = None
        if len(linkable_data["items"]) > 0:
            item = linkable_data["items"][0]
            linked_item = {
                "item_type": item["item_type"],
                "item_id": item["item_id"],
                "item_name": item["item_name"],
                "project_id": item.get("project_id"),
                "project_name": item.get("project_name")
            }
        
        # Submit daily update with completed_items structure
        update_payload = {
            "completed_items": [
                {
                    "text": "TEST_Completed feature implementation",
                    "linked_item": linked_item,
                    "completion_date": None
                }
            ],
            "blockers": ["TEST_No blockers"],
            "tomorrow_focus": ["TEST_Continue testing"],
            "notes": "TEST_Daily update with linked item"
        }
        
        response = api_client.post(f"{BASE_URL}/api/pulse/updates/daily", json=update_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Should return success: true"
        assert "update" in data, "Should return update object"
        
        update = data["update"]
        assert "completed_items" in update, "Update should have completed_items field"
        
        # Verify linked item is stored
        if linked_item:
            found_linked = False
            for item in update["completed_items"]:
                if item.get("linked_item"):
                    found_linked = True
                    assert item["linked_item"]["item_type"] == linked_item["item_type"]
                    assert item["linked_item"]["item_id"] == linked_item["item_id"]
            assert found_linked, "Linked item should be stored in completed_items"
        
        print(f"Daily update submitted with linked item: {linked_item is not None}")
    
    def test_submit_daily_update_legacy_format(self, api_client, auth_token):
        """Test submitting daily update with legacy completed_tasks format"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # Submit with legacy format (completed_tasks as string array)
        update_payload = {
            "completed_tasks": ["TEST_Legacy task 1", "TEST_Legacy task 2"],
            "blockers": [],
            "tomorrow_focus": ["TEST_Legacy tomorrow focus"],
            "notes": ""
        }
        
        response = api_client.post(f"{BASE_URL}/api/pulse/updates/daily", json=update_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        update = data["update"]
        # Should have both completed_tasks and completed_items
        assert "completed_tasks" in update, "Update should maintain legacy completed_tasks"
        assert "completed_items" in update, "Update should also have completed_items"
        
        print("Legacy daily update format works correctly")
    
    def test_submit_daily_update_mixed_items(self, api_client, auth_token):
        """Test submitting daily update with mix of linked and unlinked items"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # Get a linkable item
        linkable_response = api_client.get(f"{BASE_URL}/api/pulse/updates/linkable-items?limit=1")
        linkable_data = linkable_response.json()
        
        linked_item = None
        if len(linkable_data["items"]) > 0:
            item = linkable_data["items"][0]
            linked_item = {
                "item_type": item["item_type"],
                "item_id": item["item_id"],
                "item_name": item["item_name"],
                "project_id": item.get("project_id"),
                "project_name": item.get("project_name")
            }
        
        # Mix of items - some with links, some without
        update_payload = {
            "completed_items": [
                {"text": "TEST_Task without link", "linked_item": None},
                {"text": "TEST_Task with link", "linked_item": linked_item}
            ],
            "blockers": [],
            "tomorrow_focus": [],
            "notes": ""
        }
        
        response = api_client.post(f"{BASE_URL}/api/pulse/updates/daily", json=update_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        update = data["update"]
        
        # Should have both items
        assert len(update["completed_items"]) >= 2
        
        print("Mixed daily update (linked + unlinked items) works correctly")
    
    # ===================== WEEKLY UPDATE WITH LINKED ITEMS =====================
    
    def test_submit_weekly_update_with_linked_item(self, api_client, auth_token):
        """Test submitting weekly update with linked task/project"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # Get a linkable item
        linkable_response = api_client.get(f"{BASE_URL}/api/pulse/updates/linkable-items?limit=1")
        linkable_data = linkable_response.json()
        
        linked_item = None
        if len(linkable_data["items"]) > 0:
            item = linkable_data["items"][0]
            linked_item = {
                "item_type": item["item_type"],
                "item_id": item["item_id"],
                "item_name": item["item_name"],
                "project_id": item.get("project_id"),
                "project_name": item.get("project_name")
            }
        
        # Submit weekly update with achievement_items structure
        update_payload = {
            "achievement_items": [
                {
                    "text": "TEST_Weekly achievement with link",
                    "linked_item": linked_item,
                    "completion_date": None
                }
            ],
            "issues_faced": ["TEST_No major issues"],
            "next_week_focus": ["TEST_Continue development"],
            "team_highlights": ["TEST_Great teamwork"],
            "notes": "TEST_Weekly update with linked item"
        }
        
        response = api_client.post(f"{BASE_URL}/api/pulse/updates/weekly", json=update_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "update" in data
        
        update = data["update"]
        assert "achievement_items" in update, "Update should have achievement_items field"
        
        # Verify linked item is stored
        if linked_item:
            found_linked = False
            for item in update["achievement_items"]:
                if item.get("linked_item"):
                    found_linked = True
                    assert item["linked_item"]["item_type"] == linked_item["item_type"]
            assert found_linked, "Linked item should be stored in achievement_items"
        
        print(f"Weekly update submitted with linked item: {linked_item is not None}")
    
    def test_submit_weekly_update_legacy_format(self, api_client, auth_token):
        """Test submitting weekly update with legacy achievements format"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # Submit with legacy format (achievements as string array)
        update_payload = {
            "achievements": ["TEST_Legacy achievement 1", "TEST_Legacy achievement 2"],
            "key_metrics": {},
            "issues_faced": [],
            "next_week_focus": [],
            "team_highlights": [],
            "notes": ""
        }
        
        response = api_client.post(f"{BASE_URL}/api/pulse/updates/weekly", json=update_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        update = data["update"]
        # Should have both achievements and achievement_items
        assert "achievements" in update, "Update should maintain legacy achievements"
        assert "achievement_items" in update, "Update should also have achievement_items"
        
        print("Legacy weekly update format works correctly")
    
    # ===================== FEED VIEW WITH LINKED ITEMS =====================
    
    def test_daily_updates_contain_linked_items(self, api_client, auth_token):
        """Test that GET daily updates includes linked_items in response"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        response = api_client.get(f"{BASE_URL}/api/pulse/updates/daily?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "updates" in data
        
        # Check structure of updates
        for update in data["updates"]:
            # Should have completed_items field (new format)
            if "completed_items" in update:
                for item in update["completed_items"]:
                    assert "text" in item, "Each completed_item should have 'text'"
                    # linked_item can be null or an object
                    if item.get("linked_item"):
                        assert "item_type" in item["linked_item"]
                        assert "item_id" in item["linked_item"]
                        assert "item_name" in item["linked_item"]
        
        print(f"Daily updates response structure is correct, {len(data['updates'])} updates found")
    
    def test_weekly_updates_contain_linked_items(self, api_client, auth_token):
        """Test that GET weekly updates includes linked_items in response"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        response = api_client.get(f"{BASE_URL}/api/pulse/updates/weekly?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "updates" in data
        
        # Check structure of updates
        for update in data["updates"]:
            # Should have achievement_items field (new format)
            if "achievement_items" in update:
                for item in update["achievement_items"]:
                    assert "text" in item, "Each achievement_item should have 'text'"
                    # linked_item can be null or an object
                    if item.get("linked_item"):
                        assert "item_type" in item["linked_item"]
                        assert "item_id" in item["linked_item"]
                        assert "item_name" in item["linked_item"]
        
        print(f"Weekly updates response structure is correct, {len(data['updates'])} updates found")
    
    def test_posts_from_daily_update_contain_linked_items(self, api_client, auth_token):
        """Test that auto-generated posts from daily updates have linked_items field"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # Get daily_update type posts
        response = api_client.get(f"{BASE_URL}/api/pulse/posts?post_type=daily_update&limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check if any posts have linked_items
        for post in data.get("posts", []):
            if post.get("linked_items"):
                assert isinstance(post["linked_items"], list)
                for item in post["linked_items"]:
                    assert "item_type" in item
                    assert "item_id" in item
                    assert "item_name" in item
                print(f"Found daily_update post with {len(post['linked_items'])} linked items")
        
        print(f"Checked {len(data.get('posts', []))} daily_update posts")
    
    def test_posts_from_weekly_update_contain_linked_items(self, api_client, auth_token):
        """Test that auto-generated posts from weekly updates have linked_items field"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # Get weekly_update type posts
        response = api_client.get(f"{BASE_URL}/api/pulse/posts?post_type=weekly_update&limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check if any posts have linked_items
        for post in data.get("posts", []):
            if post.get("linked_items"):
                assert isinstance(post["linked_items"], list)
                for item in post["linked_items"]:
                    assert "item_type" in item
                    assert "item_id" in item
                    assert "item_name" in item
                print(f"Found weekly_update post with {len(post['linked_items'])} linked items")
        
        print(f"Checked {len(data.get('posts', []))} weekly_update posts")


# ===================== FIXTURES =====================

@pytest.fixture(scope="class")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="class")
def auth_token(api_client):
    """Get authentication token for superadmin"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "superadmin@sevora.com",
        "password": "superadmin123"
    })
    
    if response.status_code == 200:
        token = response.json().get("access_token")
        assert token, "Token should be returned"
        return token
    else:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
