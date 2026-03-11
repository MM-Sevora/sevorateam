"""
Test Social Inbox & Auto-Reply Module - Phase 2
Tests for:
- Unified Inbox (items CRUD, filters, status, reply, bulk actions)
- Inbox Statistics 
- Mentions tracking
- Auto-Reply Rules (CRUD, toggle)
- Reply Suggestions
"""

import pytest
import requests
import os
from datetime import datetime
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"


class TestSocialInboxAutoReply:
    """Test class for Social Inbox and Auto-Reply APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Authenticate and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    # ============= INBOX ITEMS TESTS =============
    
    def test_get_inbox_items(self):
        """GET /api/social/inbox/items - Returns list of inbox items"""
        response = self.session.get(f"{BASE_URL}/api/social/inbox/items")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should contain 'items' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["items"], list), "Items should be a list"
        print(f"GET /api/social/inbox/items - PASS (found {len(data['items'])} items)")
    
    def test_get_inbox_items_with_platform_filter(self):
        """GET /api/social/inbox/items?platform=linkedin - Filter by platform"""
        response = self.session.get(f"{BASE_URL}/api/social/inbox/items?platform=linkedin")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        for item in data["items"]:
            assert item["platform"] == "linkedin", "Filtered items should be from linkedin"
        print(f"GET /api/social/inbox/items?platform=linkedin - PASS")
    
    def test_get_inbox_items_with_status_filter(self):
        """GET /api/social/inbox/items?status=unread - Filter by status"""
        response = self.session.get(f"{BASE_URL}/api/social/inbox/items?status=unread")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        for item in data["items"]:
            assert item["status"] == "unread", "Filtered items should be unread"
        print(f"GET /api/social/inbox/items?status=unread - PASS")
    
    def test_create_inbox_item(self):
        """POST /api/social/inbox/items - Creates a new inbox item"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "platform": "twitter",
            "message_type": "comment",
            "author_name": f"TEST_User_{unique_id}",
            "author_handle": f"@test_user_{unique_id}",
            "content": f"TEST This is a test comment {unique_id}",
            "sentiment": "positive"
        }
        
        response = self.session.post(f"{BASE_URL}/api/social/inbox/items", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "item_id" in data, "Response should contain item_id"
        assert data["platform"] == "twitter", "Platform should match"
        assert data["author_name"] == payload["author_name"], "Author name should match"
        assert data["status"] == "unread", "New items should be unread"
        
        # Store for cleanup
        self.created_item_id = data["item_id"]
        print(f"POST /api/social/inbox/items - PASS (created item_id: {data['item_id'][:8]}...)")
        return data["item_id"]
    
    def test_get_single_inbox_item(self):
        """GET /api/social/inbox/items/{item_id} - Get specific item"""
        # First create an item
        unique_id = str(uuid.uuid4())[:8]
        create_resp = self.session.post(f"{BASE_URL}/api/social/inbox/items", json={
            "platform": "linkedin",
            "message_type": "direct_message",
            "author_name": f"TEST_SingleGet_{unique_id}",
            "content": f"TEST Single item test {unique_id}",
            "sentiment": "neutral"
        })
        item_id = create_resp.json()["item_id"]
        
        # Get the item
        response = self.session.get(f"{BASE_URL}/api/social/inbox/items/{item_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["item_id"] == item_id, "Item ID should match"
        print(f"GET /api/social/inbox/items/{{item_id}} - PASS")
    
    def test_update_item_status(self):
        """PUT /api/social/inbox/items/{id}/status - Update item status"""
        # Create an item first
        unique_id = str(uuid.uuid4())[:8]
        create_resp = self.session.post(f"{BASE_URL}/api/social/inbox/items", json={
            "platform": "instagram",
            "message_type": "comment",
            "author_name": f"TEST_StatusUpdate_{unique_id}",
            "content": f"TEST Status update test {unique_id}",
            "sentiment": "positive"
        })
        item_id = create_resp.json()["item_id"]
        
        # Update status to read
        response = self.session.put(f"{BASE_URL}/api/social/inbox/items/{item_id}/status?status=read")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "read", "Status should be updated to read"
        
        # Verify by fetching
        verify_resp = self.session.get(f"{BASE_URL}/api/social/inbox/items/{item_id}")
        assert verify_resp.json()["status"] == "read", "Status should persist as read"
        print(f"PUT /api/social/inbox/items/{{id}}/status - PASS")
    
    def test_update_item_status_invalid(self):
        """PUT /api/social/inbox/items/{id}/status - Invalid status returns 400"""
        # Create an item first
        unique_id = str(uuid.uuid4())[:8]
        create_resp = self.session.post(f"{BASE_URL}/api/social/inbox/items", json={
            "platform": "facebook",
            "message_type": "review",
            "author_name": f"TEST_InvalidStatus_{unique_id}",
            "content": "TEST Invalid status test",
            "sentiment": "neutral"
        })
        item_id = create_resp.json()["item_id"]
        
        # Try invalid status
        response = self.session.put(f"{BASE_URL}/api/social/inbox/items/{item_id}/status?status=invalid_status")
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        print(f"PUT invalid status - PASS (returned 400 as expected)")
    
    def test_reply_to_item(self):
        """POST /api/social/inbox/items/{id}/reply - Send reply to item"""
        # Create an item first
        unique_id = str(uuid.uuid4())[:8]
        create_resp = self.session.post(f"{BASE_URL}/api/social/inbox/items", json={
            "platform": "twitter",
            "message_type": "mention",
            "author_name": f"TEST_ReplyTest_{unique_id}",
            "content": f"TEST @sevora great product! {unique_id}",
            "sentiment": "positive"
        })
        item_id = create_resp.json()["item_id"]
        
        # Send reply
        reply_payload = {
            "content": f"Thank you for the kind words! {unique_id}",
            "auto_generated": False
        }
        response = self.session.post(f"{BASE_URL}/api/social/inbox/items/{item_id}/reply", json=reply_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "reply_id" in data, "Response should contain reply_id"
        assert data["content"] == reply_payload["content"], "Reply content should match"
        
        # Verify item status changed to replied
        verify_resp = self.session.get(f"{BASE_URL}/api/social/inbox/items/{item_id}")
        assert verify_resp.json()["status"] == "replied", "Item status should be 'replied'"
        assert verify_resp.json()["reply_content"] == reply_payload["content"], "Reply content should be stored"
        print(f"POST /api/social/inbox/items/{{id}}/reply - PASS")
    
    def test_bulk_action_mark_read(self):
        """POST /api/social/inbox/items/bulk-action - Bulk mark as read"""
        # Create items
        item_ids = []
        for i in range(2):
            unique_id = str(uuid.uuid4())[:8]
            resp = self.session.post(f"{BASE_URL}/api/social/inbox/items", json={
                "platform": "linkedin",
                "message_type": "comment",
                "author_name": f"TEST_BulkRead_{unique_id}",
                "content": f"TEST Bulk read test {unique_id}",
                "sentiment": "neutral"
            })
            item_ids.append(resp.json()["item_id"])
        
        # Bulk mark as read - both item_ids and action in JSON body
        response = self.session.post(
            f"{BASE_URL}/api/social/inbox/items/bulk-action", 
            json={"item_ids": item_ids, "action": "mark_read"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "Updated" in data["message"], "Should confirm update"
        print(f"POST /api/social/inbox/items/bulk-action mark_read - PASS")
    
    def test_bulk_action_archive(self):
        """POST /api/social/inbox/items/bulk-action - Bulk archive"""
        # Create items
        item_ids = []
        for i in range(2):
            unique_id = str(uuid.uuid4())[:8]
            resp = self.session.post(f"{BASE_URL}/api/social/inbox/items", json={
                "platform": "instagram",
                "message_type": "comment",
                "author_name": f"TEST_BulkArchive_{unique_id}",
                "content": f"TEST Bulk archive test {unique_id}",
                "sentiment": "positive"
            })
            item_ids.append(resp.json()["item_id"])
        
        # Bulk archive - both item_ids and action in JSON body
        response = self.session.post(
            f"{BASE_URL}/api/social/inbox/items/bulk-action",
            json={"item_ids": item_ids, "action": "archive"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"POST /api/social/inbox/items/bulk-action archive - PASS")
    
    def test_bulk_action_delete(self):
        """POST /api/social/inbox/items/bulk-action - Bulk delete"""
        # Create items
        item_ids = []
        for i in range(2):
            unique_id = str(uuid.uuid4())[:8]
            resp = self.session.post(f"{BASE_URL}/api/social/inbox/items", json={
                "platform": "facebook",
                "message_type": "review",
                "author_name": f"TEST_BulkDelete_{unique_id}",
                "content": f"TEST Bulk delete test {unique_id}",
                "sentiment": "neutral"
            })
            item_ids.append(resp.json()["item_id"])
        
        # Bulk delete - both item_ids and action in JSON body
        response = self.session.post(
            f"{BASE_URL}/api/social/inbox/items/bulk-action",
            json={"item_ids": item_ids, "action": "delete"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "Deleted" in data["message"], "Should confirm deletion"
        
        # Verify deleted
        for item_id in item_ids:
            verify_resp = self.session.get(f"{BASE_URL}/api/social/inbox/items/{item_id}")
            assert verify_resp.status_code == 404, "Deleted items should return 404"
        print(f"POST /api/social/inbox/items/bulk-action delete - PASS")
    
    # ============= INBOX STATS TESTS =============
    
    def test_get_inbox_stats(self):
        """GET /api/social/inbox/stats - Returns inbox statistics"""
        response = self.session.get(f"{BASE_URL}/api/social/inbox/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total" in data, "Stats should contain 'total'"
        assert "unread" in data, "Stats should contain 'unread'"
        assert "replied" in data, "Stats should contain 'replied'"
        assert "by_platform" in data, "Stats should contain 'by_platform' breakdown"
        assert "by_type" in data, "Stats should contain 'by_type' breakdown"
        print(f"GET /api/social/inbox/stats - PASS (total: {data['total']}, unread: {data['unread']})")
    
    # ============= MENTIONS TESTS =============
    
    def test_get_mentions(self):
        """GET /api/social/inbox/mentions - Returns mention items"""
        response = self.session.get(f"{BASE_URL}/api/social/inbox/mentions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "mentions" in data, "Response should contain 'mentions' key"
        assert "total" in data, "Response should contain 'total' key"
        
        # All items should be of type 'mention'
        for mention in data["mentions"]:
            assert mention["message_type"] == "mention", "All items should be mentions"
        print(f"GET /api/social/inbox/mentions - PASS (found {len(data['mentions'])} mentions)")
    
    def test_get_mentions_with_filter(self):
        """GET /api/social/inbox/mentions?platform=twitter - Filter mentions by platform"""
        response = self.session.get(f"{BASE_URL}/api/social/inbox/mentions?platform=twitter")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        for mention in data["mentions"]:
            assert mention["platform"] == "twitter", "Filtered mentions should be from twitter"
        print(f"GET /api/social/inbox/mentions?platform=twitter - PASS")
    
    # ============= AUTO-REPLY RULES TESTS =============
    
    def test_get_auto_reply_rules(self):
        """GET /api/social/auto-reply/rules - Returns list of rules"""
        response = self.session.get(f"{BASE_URL}/api/social/auto-reply/rules")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of rules"
        print(f"GET /api/social/auto-reply/rules - PASS (found {len(data)} rules)")
    
    def test_create_auto_reply_rule(self):
        """POST /api/social/auto-reply/rules - Creates new rule"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"TEST_Rule_{unique_id}",
            "description": "Test auto-reply rule",
            "is_active": True,
            "priority": 5,
            "platforms": ["twitter"],
            "message_types": ["comment"],
            "conditions": [
                {"field": "content", "operator": "contains", "value": "test_keyword"}
            ],
            "action": "reply",
            "reply_template": "Thank you for your message, {author_name}!"
        }
        
        response = self.session.post(f"{BASE_URL}/api/social/auto-reply/rules", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "rule_id" in data, "Response should contain rule_id"
        assert data["name"] == payload["name"], "Name should match"
        assert data["action"] == "reply", "Action should be reply"
        assert data["is_active"] == True, "Rule should be active"
        
        # Store for cleanup
        self.created_rule_id = data["rule_id"]
        print(f"POST /api/social/auto-reply/rules - PASS (created rule_id: {data['rule_id'][:8]}...)")
        return data["rule_id"]
    
    def test_get_single_rule(self):
        """GET /api/social/auto-reply/rules/{rule_id} - Get specific rule"""
        # Create a rule first
        unique_id = str(uuid.uuid4())[:8]
        create_resp = self.session.post(f"{BASE_URL}/api/social/auto-reply/rules", json={
            "name": f"TEST_SingleRule_{unique_id}",
            "conditions": [{"field": "content", "operator": "contains", "value": "test"}],
            "action": "tag",
            "tags": ["test-tag"]
        })
        rule_id = create_resp.json()["rule_id"]
        
        # Get the rule
        response = self.session.get(f"{BASE_URL}/api/social/auto-reply/rules/{rule_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["rule_id"] == rule_id, "Rule ID should match"
        print(f"GET /api/social/auto-reply/rules/{{rule_id}} - PASS")
    
    def test_update_auto_reply_rule(self):
        """PUT /api/social/auto-reply/rules/{rule_id} - Updates rule"""
        # Create a rule first
        unique_id = str(uuid.uuid4())[:8]
        create_resp = self.session.post(f"{BASE_URL}/api/social/auto-reply/rules", json={
            "name": f"TEST_UpdateRule_{unique_id}",
            "conditions": [{"field": "content", "operator": "contains", "value": "original"}],
            "action": "archive"
        })
        rule_id = create_resp.json()["rule_id"]
        
        # Update the rule
        update_payload = {
            "name": f"TEST_UpdatedRule_{unique_id}",
            "priority": 99,
            "is_active": False
        }
        response = self.session.put(f"{BASE_URL}/api/social/auto-reply/rules/{rule_id}", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == update_payload["name"], "Name should be updated"
        assert data["priority"] == 99, "Priority should be updated"
        assert data["is_active"] == False, "Active status should be updated"
        print(f"PUT /api/social/auto-reply/rules/{{rule_id}} - PASS")
    
    def test_delete_auto_reply_rule(self):
        """DELETE /api/social/auto-reply/rules/{rule_id} - Deletes rule"""
        # Create a rule first
        unique_id = str(uuid.uuid4())[:8]
        create_resp = self.session.post(f"{BASE_URL}/api/social/auto-reply/rules", json={
            "name": f"TEST_DeleteRule_{unique_id}",
            "conditions": [{"field": "content", "operator": "contains", "value": "delete"}],
            "action": "escalate"
        })
        rule_id = create_resp.json()["rule_id"]
        
        # Delete the rule
        response = self.session.delete(f"{BASE_URL}/api/social/auto-reply/rules/{rule_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify deleted
        verify_resp = self.session.get(f"{BASE_URL}/api/social/auto-reply/rules/{rule_id}")
        assert verify_resp.status_code == 404, "Deleted rule should return 404"
        print(f"DELETE /api/social/auto-reply/rules/{{rule_id}} - PASS")
    
    def test_toggle_rule(self):
        """PUT /api/social/auto-reply/rules/{rule_id}/toggle - Toggle rule active status"""
        # Create a rule first (active by default)
        unique_id = str(uuid.uuid4())[:8]
        create_resp = self.session.post(f"{BASE_URL}/api/social/auto-reply/rules", json={
            "name": f"TEST_ToggleRule_{unique_id}",
            "is_active": True,
            "conditions": [{"field": "content", "operator": "contains", "value": "toggle"}],
            "action": "reply",
            "reply_template": "Toggled!"
        })
        rule_id = create_resp.json()["rule_id"]
        
        # Toggle (should become inactive)
        response = self.session.put(f"{BASE_URL}/api/social/auto-reply/rules/{rule_id}/toggle")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["is_active"] == False, "Rule should be toggled to inactive"
        
        # Toggle again (should become active)
        response2 = self.session.put(f"{BASE_URL}/api/social/auto-reply/rules/{rule_id}/toggle")
        assert response2.json()["is_active"] == True, "Rule should be toggled back to active"
        print(f"PUT /api/social/auto-reply/rules/{{rule_id}}/toggle - PASS")
    
    # ============= REPLY SUGGESTIONS TESTS =============
    
    def test_get_reply_suggestions(self):
        """GET /api/social/auto-reply/suggestions/{item_id} - Returns reply suggestions"""
        # Create an inbox item first
        unique_id = str(uuid.uuid4())[:8]
        create_resp = self.session.post(f"{BASE_URL}/api/social/inbox/items", json={
            "platform": "twitter",
            "message_type": "comment",
            "author_name": f"TEST_Suggestions_{unique_id}",
            "content": "Thank you for the great service!",
            "sentiment": "positive"
        })
        item_id = create_resp.json()["item_id"]
        
        # Get suggestions
        response = self.session.get(f"{BASE_URL}/api/social/auto-reply/suggestions/{item_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "item_id" in data, "Response should contain item_id"
        assert "suggestions" in data, "Response should contain suggestions"
        assert "sentiment" in data, "Response should contain sentiment"
        assert isinstance(data["suggestions"], list), "Suggestions should be a list"
        
        # Check suggestion structure
        if len(data["suggestions"]) > 0:
            suggestion = data["suggestions"][0]
            assert "type" in suggestion, "Suggestion should have type"
            assert "content" in suggestion, "Suggestion should have content"
        print(f"GET /api/social/auto-reply/suggestions/{{item_id}} - PASS (found {len(data['suggestions'])} suggestions)")
    
    def test_get_reply_suggestions_invalid_item(self):
        """GET /api/social/auto-reply/suggestions/{item_id} - Invalid item returns 404"""
        response = self.session.get(f"{BASE_URL}/api/social/auto-reply/suggestions/invalid-item-id")
        assert response.status_code == 404, f"Expected 404 for invalid item, got {response.status_code}"
        print(f"GET suggestions for invalid item - PASS (returned 404 as expected)")
    
    # ============= SEED DATA TESTS =============
    
    def test_seed_demo_data(self):
        """POST /api/social/inbox/seed-demo - Seeds demo inbox data"""
        response = self.session.post(f"{BASE_URL}/api/social/inbox/seed-demo")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "count" in data, "Response should contain count"
        print(f"POST /api/social/inbox/seed-demo - PASS (created {data['count']} items)")
    
    def test_seed_default_rules(self):
        """POST /api/social/auto-reply/seed-defaults - Seeds default auto-reply rules"""
        response = self.session.post(f"{BASE_URL}/api/social/auto-reply/seed-defaults")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "count" in data, "Response should contain count"
        print(f"POST /api/social/auto-reply/seed-defaults - PASS (created {data['count']} rules)")
    
    # ============= CLEANUP =============
    
    @pytest.fixture(scope="class", autouse=True)
    def cleanup_test_data(self):
        """Cleanup TEST_ prefixed data after test class completes"""
        yield
        # Cleanup is handled by individual tests with unique IDs
        # For production, would add API to delete TEST_ prefixed items


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
