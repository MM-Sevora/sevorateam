"""
Sevora Pulse Phase 2 - Backend API Tests
Features: Leadership Dashboard, Department Walls, Recognition Badges, Work Updates
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"


class TestPulsePhase2Setup:
    """Setup and auth tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Auth headers for API calls"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestLeadershipDashboard(TestPulsePhase2Setup):
    """Leadership Dashboard API Tests"""
    
    def test_get_leadership_dashboard(self, auth_headers):
        """GET /pulse/leadership/dashboard - Returns dashboard overview"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/leadership/dashboard",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "overview" in data, "Missing overview"
        assert "departments" in data, "Missing departments"
        assert "top_contributors" in data, "Missing top_contributors"
        assert "recent_issues" in data, "Missing recent_issues"
        assert "recent_achievements" in data, "Missing recent_achievements"
        
        # Verify overview fields
        overview = data["overview"]
        assert "total_posts" in overview
        assert "posts_today" in overview
        assert "posts_this_week" in overview
        assert "total_recognitions" in overview
        print(f"Leadership Dashboard: {overview['total_posts']} total posts, {overview['posts_today']} today")


class TestDepartmentWalls(TestPulsePhase2Setup):
    """Department Walls API Tests"""
    
    DEPARTMENTS = ['marketing', 'buying', 'warehouse', 'technology', 'operations', 'finance', 'hr', 'sales', 'leadership']
    
    def test_get_department_feed_marketing(self, auth_headers):
        """GET /pulse/departments/marketing/feed - Returns marketing department posts"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/departments/marketing/feed?limit=30",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "department" in data
        assert data["department"] == "marketing"
        assert "posts" in data
        assert "total" in data
        print(f"Marketing department: {data['total']} posts")
    
    def test_get_department_feed_technology(self, auth_headers):
        """GET /pulse/departments/technology/feed - Returns technology department posts"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/departments/technology/feed?limit=30",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["department"] == "technology"
        print(f"Technology department: {data['total']} posts")
    
    def test_get_department_feed_invalid(self, auth_headers):
        """GET /pulse/departments/invalid/feed - Returns 400 for invalid department"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/departments/invalid_dept/feed",
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestRecognitionBadges(TestPulsePhase2Setup):
    """Recognition (Peer-to-Peer) Badge Tests"""
    
    def test_get_badge_types(self, auth_headers):
        """GET /pulse/badges/types - Returns available badge types"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/badges/types",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "badges" in data
        badges = data["badges"]
        
        # Verify required badge types
        required_badges = ["team_player", "problem_solver", "innovation", "execution_champion", "mentor", "customer_hero"]
        for badge in required_badges:
            assert badge in badges, f"Missing badge type: {badge}"
        print(f"Badge types available: {list(badges.keys())}")
    
    def test_get_recognition_list(self, auth_headers):
        """GET /pulse/recognition - Returns list of recognitions"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/recognition?limit=50",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "recognitions" in data
        assert "total" in data
        print(f"Recognitions found: {data['total']}")
    
    def test_get_recognition_leaderboard(self, auth_headers):
        """GET /pulse/recognition/leaderboard - Returns badge leaderboard"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/recognition/leaderboard?period=month",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "leaderboard" in data
        assert "by_badge" in data
        assert "period" in data
        assert data["period"] == "month"
        print(f"Leaderboard entries: {len(data['leaderboard'])}")
    
    def test_get_employees_for_recognition(self, auth_headers):
        """GET /admin/users - Returns employee list for recognition selection"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of users"
        print(f"Employees available for recognition: {len(data)}")
    
    def test_give_recognition_badge(self, auth_headers):
        """POST /pulse/recognition - Give a badge to an employee"""
        # First get a user to recognize
        users_response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=auth_headers
        )
        users = users_response.json()
        
        # Find a user that is not the superadmin
        recipient = None
        for user in users:
            if user.get("email") != TEST_EMAIL:
                recipient = user
                break
        
        if recipient is None:
            pytest.skip("No other user available for recognition test")
        
        # Give recognition
        response = requests.post(
            f"{BASE_URL}/api/pulse/recognition",
            headers=auth_headers,
            json={
                "recipient_id": recipient["id"],
                "badge_type": "team_player",
                "reason": "TEST_RECOGNITION: Great collaboration on the project",
                "is_public": True
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "recognition" in data
        print(f"Badge awarded to: {recipient.get('name')}")
    
    def test_give_recognition_to_self_fails(self, auth_headers):
        """POST /pulse/recognition - Cannot give badge to self"""
        # Get current user's ID
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=auth_headers
        )
        me = me_response.json()
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/recognition",
            headers=auth_headers,
            json={
                "recipient_id": me["id"],
                "badge_type": "innovation",
                "reason": "Testing self-recognition",
                "is_public": True
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestWorkUpdates(TestPulsePhase2Setup):
    """Daily and Weekly Work Updates Tests"""
    
    def test_submit_daily_update(self, auth_headers):
        """POST /pulse/updates/daily - Submit daily work update"""
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/daily",
            headers=auth_headers,
            json={
                "completed_tasks": ["TEST_TASK: Completed backend API tests", "TEST_TASK: Reviewed code changes"],
                "blockers": ["Waiting for design approval"],
                "tomorrow_focus": ["Frontend testing", "Documentation"],
                "notes": "Good progress on Phase 2 features"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "update" in data
        print(f"Daily update submitted: {data['update'].get('date')}")
    
    def test_get_daily_updates(self, auth_headers):
        """GET /pulse/updates/daily - Get daily updates list"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/updates/daily",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "updates" in data
        print(f"Daily updates found: {len(data['updates'])}")
    
    def test_get_daily_updates_by_department(self, auth_headers):
        """GET /pulse/updates/daily?department=technology - Filter by department"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/updates/daily?department=technology",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "updates" in data
    
    def test_submit_weekly_update(self, auth_headers):
        """POST /pulse/updates/weekly - Submit weekly work update"""
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/weekly",
            headers=auth_headers,
            json={
                "achievements": ["TEST_WEEKLY: Completed Pulse Phase 2 development", "Deployed new features to production"],
                "issues_faced": ["Minor API performance issues"],
                "next_week_focus": ["UI polish", "User feedback integration"],
                "team_highlights": ["Team collaboration was excellent"],
                "notes": "Strong week overall"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "update" in data
        print(f"Weekly update submitted: {data['update'].get('week_start')}")
    
    def test_get_weekly_updates(self, auth_headers):
        """GET /pulse/updates/weekly - Get weekly updates list"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/updates/weekly",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "updates" in data
        print(f"Weekly updates found: {len(data['updates'])}")


class TestPulseConfig(TestPulsePhase2Setup):
    """Pulse Configuration Tests"""
    
    def test_get_pulse_config(self, auth_headers):
        """GET /pulse/config - Returns Pulse configuration"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/config",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "post_types" in data
        assert "reaction_types" in data
        assert "departments" in data
        assert "visibility_options" in data
        print(f"Config loaded: {len(data['post_types'])} post types, {len(data['departments'])} departments")


class TestPulseStats(TestPulsePhase2Setup):
    """Pulse Stats Tests"""
    
    def test_get_pulse_stats(self, auth_headers):
        """GET /pulse/stats - Returns overall Pulse statistics"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/stats",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "posts_today" in data
        assert "posts_this_week" in data
        assert "total_posts" in data
        assert "by_department" in data
        assert "by_type" in data
        print(f"Stats: {data['total_posts']} total, {data['posts_today']} today")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
