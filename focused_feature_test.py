#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class SevoraFocusedTester:
    def __init__(self):
        # Use the public endpoint from frontend .env
        self.base_url = "https://sevora-hub.preview.emergentagent.com/api"
        self.admin_token = None
        self.marketing_token = None
        self.sales_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []
        
        # Credentials from review request
        self.admin_creds = {"email": "admin@sevora.com", "password": "admin123"}
        self.marketing_creds = {"email": "marketing@sevora.com", "password": "admin123"}
        self.sales_creds = {"email": "sales@sevora.com", "password": "admin123"}

    def log_test(self, test_name: str, success: bool, response_status: int = None, error: str = None, response_data: Any = None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {error}")
            self.failed_tests.append({
                "test": test_name,
                "error": error,
                "status": response_status
            })
        
        self.test_results.append({
            "name": test_name,
            "passed": success,
            "status_code": response_status,
            "error": error,
            "response": str(response_data)[:200] if response_data else None
        })

    def make_request(self, method: str, endpoint: str, data: dict = None, token: str = None) -> tuple:
        """Make HTTP request to API"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            return response.status_code, response_data
        except requests.exceptions.RequestException as e:
            return 0, str(e)

    def login_users(self):
        """Login all test users"""
        # Admin login
        status, data = self.make_request('POST', 'auth/login', self.admin_creds)
        if status == 200 and 'access_token' in data:
            self.admin_token = data['access_token']
            print("✅ Admin login successful")
        else:
            print(f"❌ Admin login failed: {data}")
            return False
            
        # Marketing login
        status, data = self.make_request('POST', 'auth/login', self.marketing_creds)
        if status == 200 and 'access_token' in data:
            self.marketing_token = data['access_token']
            print("✅ Marketing login successful")
        else:
            print(f"❌ Marketing login failed: {data}")
            
        # Sales login
        status, data = self.make_request('POST', 'auth/login', self.sales_creds)
        if status == 200 and 'access_token' in data:
            self.sales_token = data['access_token']
            print("✅ Sales login successful")
        else:
            print(f"❌ Sales login failed: {data}")
            
        return True

    def test_seed_data_populated(self):
        """Test if seed data is populated correctly"""
        if not self.admin_token:
            self.log_test("Seed Data Check", False, None, "No admin token")
            return False
        
        # Check influencers count
        status, data = self.make_request('GET', 'marketing/influencers', token=self.admin_token)
        influencers_success = status == 200 and isinstance(data, list) and len(data) > 0
        self.log_test("Seed Data - Influencers Count", influencers_success, status, 
                     None if influencers_success else f"Expected influencers, got: {data}")
        
        # Check leads count
        status, data = self.make_request('GET', 'sales/leads', token=self.admin_token)
        leads_success = status == 200 and isinstance(data, list) and len(data) > 0
        self.log_test("Seed Data - Leads Count", leads_success, status, 
                     None if leads_success else f"Expected leads, got: {data}")
        
        # Check content count  
        status, data = self.make_request('GET', 'social/content', token=self.admin_token)
        content_success = status == 200 and isinstance(data, list) and len(data) > 0
        self.log_test("Seed Data - Content Count", content_success, status, 
                     None if content_success else f"Expected content, got: {data}")
        
        return influencers_success and leads_success and content_success

    def test_ai_caption_generation(self):
        """Test AI caption generation endpoint"""
        if not self.admin_token:
            self.log_test("AI Caption Generation", False, None, "No admin token")
            return False
        
        caption_data = {
            "topic": "fashion trends",
            "platform": "instagram",
            "tone": "engaging"
        }
        
        status, data = self.make_request('POST', 'ai/caption', caption_data, token=self.admin_token)
        success = status == 200 and isinstance(data, dict)
        
        # Check if it's using the real AI service or placeholder
        if success:
            if 'success' in data and data.get('success') == False:
                success = False
                error_msg = f"AI service error: {data.get('error', 'Unknown error')}"
            else:
                # Even placeholder response should have basic structure
                has_caption = 'caption' in data or 'text' in data
                success = success and has_caption
                error_msg = None if has_caption else "Response missing caption/text field"
        else:
            error_msg = f"AI caption request failed: {data}"
        
        self.log_test("AI Caption Generation", success, status, error_msg, data)
        return success

    def test_collaboration_features(self):
        """Test collaboration comments and @mentions"""
        if not self.admin_token:
            self.log_test("Collaboration Features", False, None, "No admin token")
            return False
        
        # First get a lead or influencer ID to comment on
        status, leads_data = self.make_request('GET', 'sales/leads', token=self.admin_token)
        if status != 200 or not leads_data:
            self.log_test("Collaboration - Get Entity for Comment", False, status, "No leads found")
            return False
        
        lead_id = leads_data[0]['id'] if leads_data else None
        if not lead_id:
            self.log_test("Collaboration - Get Entity ID", False, None, "No lead ID available")
            return False
        
        # Test adding a comment with @mention
        comment_data = {
            "entity_type": "lead",
            "entity_id": lead_id,
            "text": "Following up on this lead. @marketing please check the campaign source."
        }
        
        status, data = self.make_request('POST', 'collaboration/comments', comment_data, token=self.admin_token)
        comment_success = status == 200 and isinstance(data, dict) and 'id' in data
        self.log_test("Collaboration - Add Comment with @mention", comment_success, status, 
                     None if comment_success else f"Comment creation failed: {data}", data)
        
        # Test retrieving comments
        status, data = self.make_request('GET', f'collaboration/comments/lead/{lead_id}', token=self.admin_token)
        get_comments_success = status == 200 and isinstance(data, list)
        self.log_test("Collaboration - Get Comments", get_comments_success, status, 
                     None if get_comments_success else f"Get comments failed: {data}")
        
        return comment_success and get_comments_success

    def test_activity_feed(self):
        """Test activity feed endpoint"""
        if not self.admin_token:
            self.log_test("Activity Feed", False, None, "No admin token")
            return False
        
        status, data = self.make_request('GET', 'collaboration/activity-feed', token=self.admin_token)
        success = status == 200 and isinstance(data, list)
        
        self.log_test("Activity Feed Endpoint", success, status, 
                     None if success else f"Activity feed failed: {data}", data)
        return success

    def test_notifications(self):
        """Test notifications endpoint"""
        if not self.admin_token:
            self.log_test("Notifications", False, None, "No admin token")
            return False
        
        # Test getting notifications
        status, data = self.make_request('GET', 'collaboration/notifications', token=self.admin_token)
        get_success = status == 200 and isinstance(data, list)
        self.log_test("Notifications - Get List", get_success, status, 
                     None if get_success else f"Get notifications failed: {data}")
        
        # Test mark all as read
        status, data = self.make_request('PUT', 'collaboration/notifications/read-all', token=self.admin_token)
        mark_success = status == 200 and isinstance(data, dict)
        self.log_test("Notifications - Mark All Read", mark_success, status, 
                     None if mark_success else f"Mark all read failed: {data}")
        
        return get_success and mark_success

    def test_department_specific_access(self):
        """Test department-specific user access"""
        # Test marketing user accessing marketing endpoints
        if self.marketing_token:
            status, data = self.make_request('GET', 'marketing/dashboard', token=self.marketing_token)
            marketing_success = status == 200
            self.log_test("Marketing User - Marketing Access", marketing_success, status, 
                         None if marketing_success else f"Marketing access failed: {data}")
        else:
            self.log_test("Marketing User - Marketing Access", False, None, "No marketing token")
            marketing_success = False
        
        # Test sales user accessing sales endpoints
        if self.sales_token:
            status, data = self.make_request('GET', 'sales/dashboard', token=self.sales_token)
            sales_success = status == 200
            self.log_test("Sales User - Sales Access", sales_success, status, 
                         None if sales_success else f"Sales access failed: {data}")
        else:
            self.log_test("Sales User - Sales Access", False, None, "No sales token")
            sales_success = False
        
        return marketing_success and sales_success

    def run_focused_tests(self):
        """Run focused tests on missing features"""
        print("🎯 Starting Sevora Team Focused Feature Tests...")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Login all users
        if not self.login_users():
            print("❌ Could not login users, aborting tests")
            return False
        
        print("\n🔍 Testing Missing Features...")
        
        # Test seed data
        self.test_seed_data_populated()
        
        # Test AI features
        self.test_ai_caption_generation()
        
        # Test collaboration features
        self.test_collaboration_features()
        
        # Test activity feed
        self.test_activity_feed()
        
        # Test notifications
        self.test_notifications()
        
        # Test department access
        self.test_department_specific_access()
        
        # Print results
        print("\n" + "=" * 60)
        print("📊 FOCUSED TEST RESULTS")
        print("=" * 60)
        print(f"✅ Tests Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests Failed: {len(self.failed_tests)}/{self.tests_run}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.failed_tests:
            print("\n🚨 FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"   {i}. {test['test']}")
                print(f"      Error: {test['error']}")
                if test['status']:
                    print(f"      Status: {test['status']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.failed_tests,
            "success_rate": success_rate,
            "detailed_results": self.test_results
        }

def main():
    """Main function to run focused tests"""
    print("🔥 Sevora Team Focused Feature Testing")
    print("Testing AI generation, collaboration, activity feed, and notifications")
    
    tester = SevoraFocusedTester()
    results = tester.run_focused_tests()
    
    if results:
        # Save results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = f"/app/test_reports/focused_test_results_{timestamp}.json"
        
        try:
            import os
            os.makedirs(os.path.dirname(results_file), exist_ok=True)
            with open(results_file, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"\n💾 Test results saved to: {results_file}")
        except Exception as e:
            print(f"\n⚠️  Could not save results file: {e}")
        
        # Return appropriate exit code
        if results['success_rate'] >= 80:
            print("\n🎉 Focused tests completed successfully!")
            return 0
        else:
            print("\n💥 Critical issues found in focused tests!")
            return 1
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())