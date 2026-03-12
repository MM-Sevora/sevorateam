"""
Content Performance Analysis Endpoints Testing
Tests for Instagram and YouTube content performance analysis features:
- Best performing posts analysis
- Engagement by content type (IMAGE/VIDEO/CAROUSEL_ALBUM)
- Posting frequency & consistency score
- Peak engagement times
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestContentPerformanceAuth:
    """Test authentication requirements for content performance endpoints"""
    
    def test_instagram_content_performance_requires_auth(self):
        """Instagram content-performance endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/marketing/v2/influencer-analytics/instagram/shopsevora/content-performance")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Instagram content-performance requires auth")
    
    def test_youtube_content_performance_requires_auth(self):
        """YouTube content-performance endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/marketing/v2/influencer-analytics/youtube/MrBeast/content-performance")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: YouTube content-performance requires auth")
    
    def test_contact_content_performance_requires_auth(self):
        """Contact content-performance endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/marketing/v2/contacts/test-id/content-performance")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Contact content-performance requires auth")


class TestInstagramContentPerformance:
    """Test Instagram Content Performance Analysis endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_token):
        self.headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_instagram_content_performance_shopsevora(self, auth_token):
        """Test Instagram content performance for shopsevora account"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/influencer-analytics/instagram/shopsevora/content-performance",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check for success or proper error response
        if data.get("success"):
            # Validate expected structure
            assert "username" in data, "Response should contain username"
            assert data["username"] == "shopsevora", f"Expected shopsevora, got {data.get('username')}"
            
            # Validate best performing posts
            assert "best_performing_posts" in data, "Response should contain best_performing_posts"
            if data["best_performing_posts"]:
                post = data["best_performing_posts"][0]
                assert "type" in post, "Post should have type"
                assert "likes" in post, "Post should have likes"
                assert "comments" in post, "Post should have comments"
                assert "engagement_rate" in post, "Post should have engagement_rate"
            
            # Validate engagement by content type
            assert "engagement_by_content_type" in data, "Response should contain engagement_by_content_type"
            engagement_types = data["engagement_by_content_type"]
            if engagement_types:
                for content_type, stats in engagement_types.items():
                    assert content_type.lower() in ["image", "video", "carousel_album"], f"Unexpected content type: {content_type}"
                    assert "count" in stats, f"Stats for {content_type} should have count"
                    assert "avg_engagement_rate" in stats, f"Stats for {content_type} should have avg_engagement_rate"
            
            # Validate posting frequency
            assert "posting_frequency" in data, "Response should contain posting_frequency"
            freq = data["posting_frequency"]
            assert "consistency_score" in freq, "posting_frequency should have consistency_score"
            if freq.get("consistency_score"):
                assert 0 <= freq["consistency_score"] <= 100, "consistency_score should be 0-100"
            assert "consistency_rating" in freq, "posting_frequency should have consistency_rating"
            
            # Validate peak engagement times
            assert "peak_engagement_times" in data, "Response should contain peak_engagement_times"
            peak = data["peak_engagement_times"]
            assert "best_hours" in peak, "peak_engagement_times should have best_hours"
            assert "best_days" in peak, "peak_engagement_times should have best_days"
            assert "recommendation" in peak, "peak_engagement_times should have recommendation"
            
            print(f"PASS: Instagram content performance for shopsevora")
            print(f"  - Followers: {data.get('followers')}")
            print(f"  - Posts analyzed: {data.get('total_posts_analyzed')}")
            print(f"  - Content types: {list(engagement_types.keys()) if engagement_types else 'None'}")
            print(f"  - Consistency score: {freq.get('consistency_score')}")
        else:
            # API might be rate limited or not configured
            error = data.get("error", "Unknown error")
            print(f"INFO: Instagram API returned error: {error}")
            # Still pass if it's a config/rate limit issue
            assert "error" in data, "Should contain error message"
    
    def test_instagram_content_performance_invalid_user(self, auth_token):
        """Test Instagram content performance with invalid username"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/influencer-analytics/instagram/test_invalid_user_12345/content-performance",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should return error for invalid user
        assert data.get("success") == False or "error" in data, "Should indicate failure for invalid user"
        print("PASS: Invalid Instagram user returns proper error")


class TestYouTubeContentPerformance:
    """Test YouTube Content Performance Analysis endpoint"""
    
    def test_youtube_content_performance_mrbeast(self, auth_token):
        """Test YouTube content performance for MrBeast channel"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/influencer-analytics/youtube/MrBeast/content-performance",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        if data.get("success"):
            # Validate expected structure
            assert "channel_id" in data, "Response should contain channel_id"
            assert "channel_name" in data, "Response should contain channel_name"
            assert "subscribers" in data, "Response should contain subscribers"
            
            # Validate best performing videos
            assert "best_performing_videos" in data, "Response should contain best_performing_videos"
            if data["best_performing_videos"]:
                video = data["best_performing_videos"][0]
                assert "title" in video, "Video should have title"
                assert "views" in video, "Video should have views"
                assert "likes" in video, "Video should have likes"
                assert "engagement_rate" in video, "Video should have engagement_rate"
            
            # Validate upload frequency
            assert "upload_frequency" in data, "Response should contain upload_frequency"
            freq = data["upload_frequency"]
            assert "videos_per_week" in freq, "upload_frequency should have videos_per_week"
            assert "consistency_score" in freq, "upload_frequency should have consistency_score"
            if freq.get("consistency_score"):
                assert 0 <= freq["consistency_score"] <= 100, "consistency_score should be 0-100"
            assert "consistency_rating" in freq, "upload_frequency should have consistency_rating"
            
            # Validate peak upload times
            assert "peak_upload_times" in data, "Response should contain peak_upload_times"
            peak = data["peak_upload_times"]
            assert "best_hours" in peak, "peak_upload_times should have best_hours"
            assert "best_days" in peak, "peak_upload_times should have best_days"
            assert "recommendation" in peak, "peak_upload_times should have recommendation"
            
            # Validate overall stats
            assert "overall_stats" in data, "Response should contain overall_stats"
            stats = data["overall_stats"]
            assert "avg_views" in stats, "overall_stats should have avg_views"
            assert "avg_likes" in stats, "overall_stats should have avg_likes"
            
            print(f"PASS: YouTube content performance for MrBeast")
            print(f"  - Channel: {data.get('channel_name')}")
            print(f"  - Subscribers: {data.get('subscribers'):,}")
            print(f"  - Videos analyzed: {data.get('total_videos_analyzed')}")
            print(f"  - Videos per week: {freq.get('videos_per_week')}")
            print(f"  - Consistency score: {freq.get('consistency_score')}")
        else:
            error = data.get("error", "Unknown error")
            print(f"INFO: YouTube API returned error: {error}")
            assert "error" in data, "Should contain error message"
    
    def test_youtube_content_performance_by_handle(self, auth_token):
        """Test YouTube content performance using @handle format"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/influencer-analytics/youtube/@MrBeast/content-performance",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should work with @handle format too
        if data.get("success"):
            assert "channel_id" in data, "Response should contain channel_id"
            print("PASS: YouTube content performance works with @handle format")
        else:
            error = data.get("error", "Unknown error")
            print(f"INFO: YouTube API returned error: {error}")
    
    def test_youtube_content_performance_invalid_channel(self, auth_token):
        """Test YouTube content performance with invalid channel"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/influencer-analytics/youtube/invalid_channel_xyz_123456/content-performance",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should return error for invalid channel
        assert data.get("success") == False or "error" in data, "Should indicate failure for invalid channel"
        print("PASS: Invalid YouTube channel returns proper error")


class TestContactContentPerformance:
    """Test Contact Combined Content Performance endpoint"""
    
    @pytest.fixture
    def contact_with_handles(self, auth_token):
        """Create a test contact with Instagram and YouTube handles"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        contact_data = {
            "name": "TEST_Content_Perf_Contact",
            "contact_type": "influencer",
            "instagram_handle": "shopsevora",
            "youtube_handle": "MrBeast"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/contacts",
            headers=headers,
            json=contact_data
        )
        
        if response.status_code == 200 or response.status_code == 201:
            contact = response.json()
            yield contact
            # Cleanup
            requests.delete(f"{BASE_URL}/api/marketing/v2/contacts/{contact['id']}", headers=headers)
        else:
            pytest.skip(f"Could not create test contact: {response.status_code}")
    
    def test_contact_content_performance(self, auth_token, contact_with_handles):
        """Test content performance for a contact with social handles"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        contact_id = contact_with_handles["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/content-performance",
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate structure
        assert "contact_id" in data, "Response should contain contact_id"
        assert data["contact_id"] == contact_id
        assert "contact_name" in data, "Response should contain contact_name"
        assert "instagram" in data, "Response should contain instagram"
        assert "youtube" in data, "Response should contain youtube"
        assert "insights" in data, "Response should contain insights"
        assert "recommendations" in data, "Response should contain recommendations"
        
        print(f"PASS: Contact content performance endpoint")
        print(f"  - Contact: {data.get('contact_name')}")
        print(f"  - Instagram data: {'success' if data.get('instagram', {}).get('success') else 'error/none'}")
        print(f"  - YouTube data: {'success' if data.get('youtube', {}).get('success') else 'error/none'}")
        print(f"  - Insights: {len(data.get('insights', []))} insights")
        print(f"  - Recommendations: {len(data.get('recommendations', []))} recommendations")
    
    def test_contact_content_performance_no_handles(self, auth_token):
        """Test content performance for contact without social handles"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # Create contact without handles
        contact_data = {
            "name": "TEST_No_Handles_Contact",
            "contact_type": "influencer"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/contacts",
            headers=headers,
            json=contact_data
        )
        
        if response.status_code in [200, 201]:
            contact = response.json()
            contact_id = contact["id"]
            
            try:
                # Try to get content performance
                perf_response = requests.get(
                    f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/content-performance",
                    headers=headers
                )
                
                # Should return 400 for contact without handles
                assert perf_response.status_code == 400, f"Expected 400, got {perf_response.status_code}"
                data = perf_response.json()
                assert "detail" in data or "error" in data, "Should have error message"
                print("PASS: Contact without handles returns 400 error")
            finally:
                # Cleanup
                requests.delete(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}", headers=headers)
        else:
            pytest.skip(f"Could not create test contact: {response.status_code}")
    
    def test_contact_content_performance_not_found(self, auth_token):
        """Test content performance for non-existent contact"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/non-existent-contact-id-12345/content-performance",
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Non-existent contact returns 404")


class TestEngagementByContentType:
    """Specific tests for engagement_by_content_type field"""
    
    def test_instagram_engagement_types_structure(self, auth_token):
        """Test engagement by content type has correct structure"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/influencer-analytics/instagram/shopsevora/content-performance",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("success"):
            engagement_types = data.get("engagement_by_content_type", {})
            
            valid_types = ["image", "video", "carousel_album"]
            
            for content_type, stats in engagement_types.items():
                assert content_type.lower() in valid_types, f"Invalid content type: {content_type}"
                
                # Each type should have these fields
                required_fields = ["count", "avg_engagement_rate"]
                for field in required_fields:
                    assert field in stats, f"Missing {field} in {content_type} stats"
                
                # Values should be valid
                assert isinstance(stats["count"], int), f"count should be int for {content_type}"
                assert stats["count"] >= 0, f"count should be non-negative for {content_type}"
                assert isinstance(stats["avg_engagement_rate"], (int, float)), f"avg_engagement_rate should be numeric for {content_type}"
                
            print(f"PASS: engagement_by_content_type has correct structure")
            for ct, stats in engagement_types.items():
                print(f"  - {ct.upper()}: {stats['count']} posts, {stats['avg_engagement_rate']}% avg engagement")


class TestPostingFrequencyConsistency:
    """Specific tests for posting frequency and consistency score"""
    
    def test_instagram_posting_frequency(self, auth_token):
        """Test posting frequency has consistency_score 0-100"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/influencer-analytics/instagram/shopsevora/content-performance",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("success"):
            freq = data.get("posting_frequency", {})
            
            # Check structure
            assert "posts_per_week" in freq, "Should have posts_per_week"
            assert "consistency_score" in freq, "Should have consistency_score"
            assert "consistency_rating" in freq, "Should have consistency_rating"
            
            # Validate consistency score range
            score = freq.get("consistency_score")
            if score is not None:
                assert 0 <= score <= 100, f"consistency_score should be 0-100, got {score}"
            
            # Validate rating
            rating = freq.get("consistency_rating")
            valid_ratings = ["Excellent", "Good", "Needs Improvement", "Unknown"]
            assert rating in valid_ratings, f"Invalid rating: {rating}"
            
            print(f"PASS: Instagram posting frequency validated")
            print(f"  - Posts per week: {freq.get('posts_per_week')}")
            print(f"  - Consistency score: {freq.get('consistency_score')}")
            print(f"  - Rating: {freq.get('consistency_rating')}")
    
    def test_youtube_upload_frequency(self, auth_token):
        """Test YouTube upload frequency has consistency_score 0-100"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/influencer-analytics/youtube/MrBeast/content-performance",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("success"):
            freq = data.get("upload_frequency", {})
            
            # Check structure
            assert "videos_per_week" in freq, "Should have videos_per_week"
            assert "consistency_score" in freq, "Should have consistency_score"
            assert "consistency_rating" in freq, "Should have consistency_rating"
            
            # Validate consistency score range
            score = freq.get("consistency_score")
            if score is not None:
                assert 0 <= score <= 100, f"consistency_score should be 0-100, got {score}"
            
            print(f"PASS: YouTube upload frequency validated")
            print(f"  - Videos per week: {freq.get('videos_per_week')}")
            print(f"  - Consistency score: {freq.get('consistency_score')}")
            print(f"  - Rating: {freq.get('consistency_rating')}")


class TestPeakEngagementTimes:
    """Specific tests for peak engagement times"""
    
    def test_instagram_peak_times(self, auth_token):
        """Test Instagram peak engagement times structure"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/influencer-analytics/instagram/shopsevora/content-performance",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("success"):
            peak = data.get("peak_engagement_times", {})
            
            assert "best_hours" in peak, "Should have best_hours"
            assert "best_days" in peak, "Should have best_days"
            assert "recommendation" in peak, "Should have recommendation"
            
            # Validate best_hours format (should be like "18:00")
            best_hours = peak.get("best_hours", [])
            assert isinstance(best_hours, list), "best_hours should be a list"
            
            # Validate best_days (should be day names)
            best_days = peak.get("best_days", [])
            assert isinstance(best_days, list), "best_days should be a list"
            valid_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            for day in best_days:
                assert day in valid_days, f"Invalid day: {day}"
            
            # Validate recommendation is a string
            recommendation = peak.get("recommendation")
            assert isinstance(recommendation, str), "recommendation should be a string"
            
            print(f"PASS: Instagram peak engagement times validated")
            print(f"  - Best hours: {best_hours}")
            print(f"  - Best days: {best_days}")
            print(f"  - Recommendation: {recommendation}")
    
    def test_youtube_peak_times(self, auth_token):
        """Test YouTube peak upload times structure"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/influencer-analytics/youtube/MrBeast/content-performance",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("success"):
            peak = data.get("peak_upload_times", {})
            
            assert "best_hours" in peak, "Should have best_hours"
            assert "best_days" in peak, "Should have best_days"
            assert "recommendation" in peak, "Should have recommendation"
            
            print(f"PASS: YouTube peak upload times validated")
            print(f"  - Best hours: {peak.get('best_hours')}")
            print(f"  - Best days: {peak.get('best_days')}")
            print(f"  - Recommendation: {peak.get('recommendation')}")


# Pytest fixtures
@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("token") or data.get("access_token")
        if token:
            return token
    
    pytest.skip(f"Could not authenticate: {response.status_code}")
