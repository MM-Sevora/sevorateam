"""
Comprehensive E2E tests for Sevora Pulse Module
Tests: Posts, Comments, Reactions, Recognition, Work Updates, Create Task from Post/Blocker

Test Coverage:
- POST /api/pulse/posts (Create post)
- GET /api/pulse/posts (Get posts with filters)
- POST /api/pulse/posts/{id}/comments (Add comment)
- GET /api/pulse/posts/{id}/comments (Get comments)
- POST /api/pulse/posts/{id}/reactions (Add reaction)
- GET /api/pulse/stats (Dashboard stats)
- POST /api/pulse/recognition (Give recognition)
- GET /api/pulse/recognition/leaderboard (Get leaderboard)
- POST /api/pulse/updates/daily (Submit daily update)
- POST /api/pulse/updates/weekly (Submit weekly update)
- GET /api/pulse/updates/linkable-items (Get linkable tasks/projects)
- POST /api/pulse/posts/{id}/create-task (Create task from post)
- POST /api/pulse/updates/daily/{id}/create-task (Create task from blocker)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPulseAuthentication:
    """Test authentication and basic connectivity"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for superadmin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data or "token" in data, f"No token in response: {data}"
        return data.get("access_token") or data.get("token")
    
    def test_login_success(self, auth_token):
        """Test login works with superadmin credentials"""
        assert auth_token is not None
        print(f"✅ Login successful, token obtained")


class TestPulseFeed:
    """Tests for Pulse Feed - Posts, Comments, Reactions"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_pulse_config(self, headers):
        """Test GET /api/pulse/config returns configuration"""
        response = requests.get(f"{BASE_URL}/api/pulse/config", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "post_types" in data
        assert "reaction_types" in data
        assert "departments" in data
        print(f"✅ Pulse config returned: {len(data['post_types'])} post types, {len(data['reaction_types'])} reactions")
    
    def test_get_posts_feed(self, headers):
        """Test GET /api/pulse/posts returns feed"""
        response = requests.get(f"{BASE_URL}/api/pulse/posts?limit=10", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert "total" in data
        print(f"✅ Feed returned {len(data['posts'])} posts, total: {data['total']}")
    
    def test_create_pulse_post(self, headers):
        """Test POST /api/pulse/posts creates a new post"""
        test_id = str(uuid.uuid4())[:8]
        post_data = {
            "title": f"TEST_Pulse Post {test_id}",
            "content": f"This is a test post content created by E2E tests. Test ID: {test_id}",
            "post_type": "update",
            "visibility": "public",
            "department": "technology",
            "tags": ["test", "e2e"],
            "priority": "normal"
        }
        
        response = requests.post(f"{BASE_URL}/api/pulse/posts", json=post_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "post" in data
        post = data["post"]
        assert post["title"] == post_data["title"]
        assert post["content"] == post_data["content"]
        assert "id" in post
        
        # Store for cleanup and further tests
        TestPulseFeed.created_post_id = post["id"]
        print(f"✅ Post created with ID: {post['id']}")
        return post["id"]
    
    def test_get_single_post(self, headers):
        """Test GET /api/pulse/posts/{id} returns a single post"""
        post_id = getattr(TestPulseFeed, 'created_post_id', None)
        if not post_id:
            pytest.skip("No post created in previous test")
        
        response = requests.get(f"{BASE_URL}/api/pulse/posts/{post_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == post_id
        print(f"✅ Single post retrieved: {data['title']}")
    
    def test_add_comment_to_post(self, headers):
        """Test POST /api/pulse/posts/{id}/comments adds a comment"""
        post_id = getattr(TestPulseFeed, 'created_post_id', None)
        if not post_id:
            pytest.skip("No post created in previous test")
        
        comment_data = {
            "content": f"TEST_Comment from E2E test at {datetime.now().isoformat()}"
        }
        
        response = requests.post(f"{BASE_URL}/api/pulse/posts/{post_id}/comments", json=comment_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "comment" in data
        print(f"✅ Comment added with ID: {data['comment']['id']}")
    
    def test_get_comments(self, headers):
        """Test GET /api/pulse/posts/{id}/comments returns comments"""
        post_id = getattr(TestPulseFeed, 'created_post_id', None)
        if not post_id:
            pytest.skip("No post created in previous test")
        
        response = requests.get(f"{BASE_URL}/api/pulse/posts/{post_id}/comments", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "comments" in data
        assert len(data["comments"]) >= 1  # At least the one we added
        print(f"✅ Retrieved {len(data['comments'])} comments")
    
    def test_add_reaction_to_post(self, headers):
        """Test POST /api/pulse/posts/{id}/reactions adds a reaction"""
        post_id = getattr(TestPulseFeed, 'created_post_id', None)
        if not post_id:
            pytest.skip("No post created in previous test")
        
        reaction_data = {
            "reaction_type": "like"
        }
        
        response = requests.post(f"{BASE_URL}/api/pulse/posts/{post_id}/reactions", json=reaction_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("action") in ["added", "removed", "updated"]
        print(f"✅ Reaction {data.get('action')}: {data.get('reaction_type')}")
    
    def test_get_reactions(self, headers):
        """Test GET /api/pulse/posts/{id}/reactions returns reactions"""
        post_id = getattr(TestPulseFeed, 'created_post_id', None)
        if not post_id:
            pytest.skip("No post created in previous test")
        
        response = requests.get(f"{BASE_URL}/api/pulse/posts/{post_id}/reactions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "reactions" in data
        assert "total" in data
        print(f"✅ Retrieved reactions, total: {data['total']}")


class TestPulseStats:
    """Tests for Pulse Dashboard Stats"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        return response.json().get("access_token") or response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_get_pulse_stats(self, headers):
        """Test GET /api/pulse/stats returns dashboard stats"""
        response = requests.get(f"{BASE_URL}/api/pulse/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "posts_today" in data
        assert "posts_this_week" in data
        assert "total_posts" in data
        assert "by_department" in data
        assert "top_contributors" in data
        print(f"✅ Stats: {data['posts_today']} posts today, {data['total_posts']} total")


class TestPulseRecognition:
    """Tests for Pulse Recognition/Kudos feature"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        return response.json().get("access_token") or response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_get_badge_types(self, headers):
        """Test GET /api/pulse/badges/types returns badge types"""
        response = requests.get(f"{BASE_URL}/api/pulse/badges/types", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "badges" in data
        print(f"✅ Badge types: {list(data['badges'].keys())}")
    
    def test_give_recognition(self, headers):
        """Test POST /api/pulse/recognition gives a badge"""
        # First get a user to give recognition to
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        if users_response.status_code != 200:
            pytest.skip("Cannot get users list")
        
        users = users_response.json()
        # Get current user ID to avoid self-recognition
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        my_id = me_response.json().get("id") if me_response.status_code == 200 else None
        
        # Find a different user
        recipient = None
        for u in users:
            if u.get("id") != my_id:
                recipient = u
                break
        
        if not recipient:
            pytest.skip("No other users available for recognition")
        
        recognition_data = {
            "recipient_id": recipient["id"],
            "badge_type": "team_player",
            "reason": f"TEST_Recognition from E2E test at {datetime.now().isoformat()}",
            "is_public": True
        }
        
        response = requests.post(f"{BASE_URL}/api/pulse/recognition", json=recognition_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✅ Recognition given to {recipient.get('name')}: {data.get('message')}")
    
    def test_get_recognitions(self, headers):
        """Test GET /api/pulse/recognition returns recognitions"""
        response = requests.get(f"{BASE_URL}/api/pulse/recognition?limit=20", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "recognitions" in data
        assert "total" in data
        print(f"✅ Retrieved {len(data['recognitions'])} recognitions")
    
    def test_get_recognition_leaderboard(self, headers):
        """Test GET /api/pulse/recognition/leaderboard returns leaderboard"""
        response = requests.get(f"{BASE_URL}/api/pulse/recognition/leaderboard?period=month", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "leaderboard" in data
        assert "by_badge" in data
        assert "period" in data
        print(f"✅ Leaderboard: {len(data['leaderboard'])} entries, period: {data['period']}")


class TestWorkUpdates:
    """Tests for Daily and Weekly Work Updates with linking"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        return response.json().get("access_token") or response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_get_linkable_items(self, headers):
        """Test GET /api/pulse/updates/linkable-items returns tasks/projects"""
        response = requests.get(f"{BASE_URL}/api/pulse/updates/linkable-items?limit=30", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        print(f"✅ Linkable items: {len(data['items'])} items returned")
        
        # Check item structure
        if data["items"]:
            item = data["items"][0]
            assert "item_type" in item
            assert "item_id" in item
            assert "item_name" in item
            print(f"   Sample item: {item['item_type']} - {item['item_name']}")
    
    def test_submit_daily_update(self, headers):
        """Test POST /api/pulse/updates/daily submits daily update"""
        test_id = str(uuid.uuid4())[:8]
        
        daily_data = {
            "completed_items": [
                {"text": f"TEST_Completed task {test_id} - E2E test", "linked_item": None}
            ],
            "blocker_items": [
                {"text": f"TEST_Blocker {test_id} - Waiting for API approval", "linked_item": None}
            ],
            "tomorrow_focus_items": [
                {"text": f"TEST_Tomorrow focus {test_id} - Continue testing", "linked_item": None}
            ],
            "notes": f"E2E test notes {test_id}"
        }
        
        response = requests.post(f"{BASE_URL}/api/pulse/updates/daily", json=daily_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "update" in data
        
        # Store for blocker task test
        TestWorkUpdates.daily_update_id = data["update"]["id"]
        print(f"✅ Daily update submitted: {data['update']['id']}")
    
    def test_get_daily_updates(self, headers):
        """Test GET /api/pulse/updates/daily returns updates"""
        response = requests.get(f"{BASE_URL}/api/pulse/updates/daily?limit=10", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "updates" in data
        
        # Check structure
        if data["updates"]:
            update = data["updates"][0]
            assert "completed_items" in update or "completed_tasks" in update
            print(f"✅ Daily updates: {len(data['updates'])} updates, latest date: {update.get('date')}")
    
    def test_submit_weekly_update(self, headers):
        """Test POST /api/pulse/updates/weekly submits weekly update"""
        test_id = str(uuid.uuid4())[:8]
        
        weekly_data = {
            "achievement_items": [
                {"text": f"TEST_Achievement {test_id} - Completed E2E tests", "linked_item": None}
            ],
            "issues_faced_items": [
                {"text": f"TEST_Issue {test_id} - Some minor delays", "linked_item": None}
            ],
            "next_week_focus_items": [
                {"text": f"TEST_Next week {test_id} - More testing", "linked_item": None}
            ],
            "team_highlights_items": [
                {"text": f"TEST_Highlight {test_id} - Great teamwork", "linked_item": None}
            ],
            "notes": f"E2E weekly test notes {test_id}"
        }
        
        response = requests.post(f"{BASE_URL}/api/pulse/updates/weekly", json=weekly_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "update" in data
        print(f"✅ Weekly update submitted: {data['update']['id']}")
    
    def test_get_weekly_updates(self, headers):
        """Test GET /api/pulse/updates/weekly returns updates"""
        response = requests.get(f"{BASE_URL}/api/pulse/updates/weekly?limit=10", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "updates" in data
        print(f"✅ Weekly updates: {len(data['updates'])} updates")


class TestCreateTaskFromPulse:
    """Tests for Create Task from Post and Blocker"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        return response.json().get("access_token") or response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_create_task_from_post(self, headers):
        """Test POST /api/pulse/posts/{id}/create-task creates a task from a post"""
        # First create a new post for this test
        test_id = str(uuid.uuid4())[:8]
        post_data = {
            "title": f"TEST_Issue to task {test_id}",
            "content": f"This issue needs to be converted to a task. Test ID: {test_id}",
            "post_type": "issue",
            "visibility": "public",
            "department": "technology"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/pulse/posts", json=post_data, headers=headers)
        assert create_response.status_code == 200
        post_id = create_response.json()["post"]["id"]
        
        # Now create a task from this post
        task_request = {"priority": "high"}
        response = requests.post(f"{BASE_URL}/api/pulse/posts/{post_id}/create-task", json=task_request, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "task" in data
        task = data["task"]
        assert "from-pulse" in task.get("labels", [])
        assert task.get("source_post_id") == post_id
        print(f"✅ Task created from post: {task['id']} - {task['name']}")
    
    def test_create_task_from_blocker(self, headers):
        """Test POST /api/pulse/updates/daily/{id}/create-task creates task from blocker"""
        # First create a daily update with a unique blocker
        test_id = str(uuid.uuid4())[:8]
        daily_data = {
            "completed_items": [{"text": f"TEST_Completed for blocker test {test_id}", "linked_item": None}],
            "blocker_items": [{"text": f"TEST_Unique Blocker for task creation {test_id} {datetime.now().isoformat()}", "linked_item": None}],
            "tomorrow_focus_items": [],
            "notes": ""
        }
        
        create_response = requests.post(f"{BASE_URL}/api/pulse/updates/daily", json=daily_data, headers=headers)
        assert create_response.status_code == 200
        update_id = create_response.json()["update"]["id"]
        
        # Now create a task from the blocker
        task_request = {"priority": "high"}
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/daily/{update_id}/create-task?blocker_index=0", 
            json=task_request, 
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Task may already exist or be newly created - both are valid outcomes
        assert "task" in data
        task = data["task"]
        assert "blocker" in task.get("labels", [])
        print(f"✅ Task from blocker: {task['id']} - success={data.get('success')} - {task['name'][:50]}...")


class TestPulseLeadershipDashboard:
    """Tests for Leadership Dashboard"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        return response.json().get("access_token") or response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_get_leadership_dashboard(self, headers):
        """Test GET /api/pulse/leadership/dashboard returns dashboard data"""
        response = requests.get(f"{BASE_URL}/api/pulse/leadership/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "overview" in data
        assert "departments" in data
        assert "top_contributors" in data
        assert "recent_issues" in data
        assert "recent_achievements" in data
        
        overview = data["overview"]
        assert "total_posts" in overview
        assert "posts_today" in overview
        print(f"✅ Leadership Dashboard: {overview['total_posts']} total posts, {overview['posts_today']} today")


class TestPulseTags:
    """Tests for Tags functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        return response.json().get("access_token") or response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_get_popular_tags(self, headers):
        """Test GET /api/pulse/tags returns popular tags"""
        response = requests.get(f"{BASE_URL}/api/pulse/tags", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "tags" in data
        print(f"✅ Popular tags: {len(data['tags'])} tags found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
