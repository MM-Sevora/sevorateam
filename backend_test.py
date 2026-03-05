#!/usr/bin/env python3
import requests
import sys
import json
from datetime import datetime

class SocialFlowAPITester:
    def __init__(self, base_url="https://649cf975-0367-4c76-b217-a276379b79b2.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.platform_id = None
        self.post_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        req_headers = {'Content-Type': 'application/json'}
        if headers:
            req_headers.update(headers)
        if self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=req_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=req_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_register(self):
        """Test user registration with new test user credentials"""
        test_user = {
            "name": "Test User 2", 
            "email": "test2@socialflow.com",
            "password": "testpass123"
        }
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            200,
            data=test_user
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user = response.get('user', {})
            print(f"   Token received: {self.token[:20]}...")
        return success

    def test_login(self):
        """Test user login with new test user credentials"""
        login_data = {
            "email": "test2@socialflow.com",
            "password": "testpass123"
        }
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data=login_data
        )
        if success and 'token' in response:
            self.token = response['token']
            self.user = response.get('user', {})
            print(f"   Login successful, token: {self.token[:20]}...")
        return success

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "api/auth/me",
            200
        )
        return success

    def test_dashboard_metrics(self):
        """Test dashboard metrics"""
        success, response = self.run_test(
            "Dashboard Metrics",
            "GET",
            "api/dashboard/metrics",
            200
        )
        if success:
            print(f"   Metrics data keys: {list(response.keys())}")
        return success

    def test_dashboard_summary(self):
        """Test dashboard summary"""
        success, response = self.run_test(
            "Dashboard Summary",
            "GET",
            "api/dashboard/summary",
            200
        )
        if success:
            print(f"   Summary data: {response}")
        return success

    def test_get_platforms(self):
        """Test get platforms list"""
        success, response = self.run_test(
            "Get Platforms List",
            "GET",
            "api/platforms",
            200
        )
        print(f"   Connected platforms: {len(response)}")
        return success

    def test_connect_platform(self):
        """Test connect platform"""
        platform_data = {
            "platform": "instagram",
            "page_name": "Test Instagram Page",
            "page_url": "https://instagram.com/testpage"
        }
        success, response = self.run_test(
            "Connect Platform",
            "POST",
            "api/platforms/connect",
            200,
            data=platform_data
        )
        if success and 'platform_id' in response:
            self.platform_id = response['platform_id']
            print(f"   Platform connected with ID: {self.platform_id}")
        return success

    def test_disconnect_platform(self):
        """Test disconnect platform"""
        if not self.platform_id:
            print("❌ No platform ID available for disconnect test")
            return False
        
        success, response = self.run_test(
            "Disconnect Platform",
            "DELETE",
            f"api/platforms/{self.platform_id}",
            200
        )
        return success

    def test_create_post(self):
        """Test create post"""
        post_data = {
            "platform": "instagram",
            "content": "This is a test post from SocialFlow AI testing suite!",
            "image_url": "",
            "scheduled_at": "",
            "status": "draft"
        }
        success, response = self.run_test(
            "Create Post",
            "POST",
            "api/posts",
            200,
            data=post_data
        )
        if success and 'post_id' in response:
            self.post_id = response['post_id']
            print(f"   Post created with ID: {self.post_id}")
        return success

    def test_get_posts(self):
        """Test get posts"""
        success, response = self.run_test(
            "Get Posts List",
            "GET",
            "api/posts",
            200
        )
        if success:
            print(f"   Found {len(response)} posts")
        return success

    def test_publish_post(self):
        """Test publish post"""
        if not self.post_id:
            print("❌ No post ID available for publish test")
            return False
        
        success, response = self.run_test(
            "Publish Post",
            "POST",
            f"api/posts/{self.post_id}/publish",
            200
        )
        if success:
            print(f"   Post published with metrics: {response.get('metrics', {})}")
        return success

    def test_delete_post(self):
        """Test delete post"""
        if not self.post_id:
            print("❌ No post ID available for delete test")
            return False
        
        success, response = self.run_test(
            "Delete Post",
            "DELETE",
            f"api/posts/{self.post_id}",
            200
        )
        return success

    # ===== OAuth Platform Integration Tests =====

    def test_oauth_init(self):
        """Test OAuth initialization"""
        oauth_data = {
            "platform": "facebook",
            "page_name": "MyBrand"
        }
        success, response = self.run_test(
            "OAuth Init",
            "POST",
            "api/platforms/oauth/init",
            200,
            data=oauth_data
        )
        if success:
            print(f"   OAuth URL: {response.get('oauth_url', 'N/A')}")
            print(f"   Scopes: {response.get('scopes', [])}")
        return success

    def test_oauth_callback(self):
        """Test OAuth callback (simulated)"""
        oauth_data = {
            "platform": "facebook", 
            "page_name": "MyBrand"
        }
        success, response = self.run_test(
            "OAuth Callback",
            "POST",
            "api/platforms/oauth/callback",
            200,
            data=oauth_data
        )
        if success and 'platform_id' in response:
            self.platform_id = response['platform_id']
            print(f"   Platform connected via OAuth with ID: {self.platform_id}")
        return success

    def test_platform_insights(self):
        """Test platform insights"""
        if not self.platform_id:
            print("❌ No platform ID available for insights test")
            return False
        
        success, response = self.run_test(
            "Platform Insights",
            "GET",
            f"api/platforms/{self.platform_id}/insights",
            200
        )
        if success:
            print(f"   Platform: {response.get('platform')}")
            print(f"   Followers: {response.get('overview', {}).get('followers', 'N/A')}")
        return success

    def test_post_to_platform(self):
        """Test posting to connected platform"""
        if not self.platform_id:
            print("❌ No platform ID available for post-to-platform test")
            return False
        
        post_data = {
            "platform": "facebook",  # Required field
            "content": "Test post via platform integration!",
            "image_url": ""
        }
        success, response = self.run_test(
            "Post to Platform",
            "POST",
            f"api/platforms/{self.platform_id}/post",
            200,
            data=post_data
        )
        if success:
            print(f"   Posted with external ID: {response.get('external_post_id')}")
            print(f"   Post URL: {response.get('post_url')}")
        return success

    # ===== AI Avatar Tests =====

    def test_create_avatar(self):
        """Test avatar creation"""
        avatar_data = {
            "name": "BrandBot",
            "brand_voice": "Professional and witty",
            "tone": "professional",
            "industry": "Technology", 
            "target_audience": "Tech professionals",
            "style_keywords": ["modern", "clean", "professional"]
        }
        success, response = self.run_test(
            "Create Avatar",
            "POST",
            "api/avatar",
            200,
            data=avatar_data
        )
        if success:
            print(f"   Avatar created: {response.get('name')}")
            print(f"   Tone: {response.get('tone')}")
        return success

    def test_get_avatar(self):
        """Test get avatar"""
        success, response = self.run_test(
            "Get Avatar",
            "GET",
            "api/avatar",
            200
        )
        if success:
            print(f"   Avatar found: {response.get('name', 'None')}")
        return success

    def test_update_avatar(self):
        """Test avatar update"""
        update_data = {
            "brand_voice": "Updated: Professional, witty and engaging",
            "target_audience": "Young tech professionals"
        }
        success, response = self.run_test(
            "Update Avatar",
            "PUT", 
            "api/avatar",
            200,
            data=update_data
        )
        if success:
            print(f"   Avatar updated successfully")
        return success

    def test_get_avatar_chat_history(self):
        """Test get avatar chat history (should be empty initially)"""
        success, response = self.run_test(
            "Avatar Chat History",
            "GET",
            "api/avatar/chat/history",
            200
        )
        if success:
            print(f"   Chat history entries: {len(response)}")
        return success

    # ===== Content Performance Predictor Tests =====

    def test_get_best_times(self):
        """Test get best posting times"""
        success, response = self.run_test(
            "Best Posting Times",
            "GET",
            "api/predict/best-times/instagram",
            200
        )
        if success:
            print(f"   Platform: {response.get('platform')}")
            print(f"   Top time: {response.get('recommendation', 'N/A')}")
            print(f"   Analysis period: {response.get('analysis_period')}")
        return success

def main():
    print("🚀 Starting SocialFlow AI Backend Testing...")
    print("=" * 60)
    
    tester = SocialFlowAPITester()

    # Test sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("User Registration", tester.test_register),
        ("User Login", tester.test_login), 
        ("Get Current User", tester.test_get_me),
        ("Dashboard Metrics", tester.test_dashboard_metrics),
        ("Dashboard Summary", tester.test_dashboard_summary),
        ("Get Platforms", tester.test_get_platforms),
        ("Connect Platform", tester.test_connect_platform),
        # OAuth Platform Integration Tests
        ("OAuth Init", tester.test_oauth_init),
        ("OAuth Callback", tester.test_oauth_callback),
        ("Platform Insights", tester.test_platform_insights),
        ("Post to Platform", tester.test_post_to_platform),
        # AI Avatar Tests (CRUD only, skipping AI generation)
        ("Create Avatar", tester.test_create_avatar), 
        ("Get Avatar", tester.test_get_avatar),
        ("Update Avatar", tester.test_update_avatar),
        ("Avatar Chat History", tester.test_get_avatar_chat_history),
        # Performance Predictor Tests (non-AI endpoints only)
        ("Best Posting Times", tester.test_get_best_times),
        # Original Post Tests
        ("Create Post", tester.test_create_post),
        ("Get Posts", tester.test_get_posts),
        ("Publish Post", tester.test_publish_post),
        ("Delete Post", tester.test_delete_post),
        ("Disconnect Platform", tester.test_disconnect_platform),
    ]

    passed_tests = []
    failed_tests = []

    for test_name, test_func in tests:
        try:
            success = test_func()
            if success:
                passed_tests.append(test_name)
            else:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)

    # Print final results
    print("\n" + "=" * 60)
    print("📊 FINAL TEST RESULTS")
    print("=" * 60)
    print(f"✅ Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"❌ Tests failed: {tester.tests_run - tester.tests_passed}/{tester.tests_run}")
    
    if passed_tests:
        print(f"\n✅ PASSED TESTS ({len(passed_tests)}):")
        for test in passed_tests:
            print(f"   • {test}")
    
    if failed_tests:
        print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   • {test}")

    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())