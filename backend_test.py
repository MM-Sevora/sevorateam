#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class SevoraAPITester:
    def __init__(self):
        # Use the public endpoint from frontend .env
        self.base_url = "https://sevora-hub.preview.emergentagent.com/api"
        self.token = None
        self.admin_token = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []
        
        # Test credentials
        self.admin_creds = {
            "email": "admin@sevora.com", 
            "password": "admin123"
        }
        
        # Test data
        self.test_user_data = {
            "name": f"Test User {datetime.now().strftime('%H%M%S')}",
            "email": f"testuser{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "testpass123",
            "department": "sales",
            "role": "viewer"
        }

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
            "response": response_data[:200] if isinstance(response_data, str) else str(response_data)[:200] if response_data else None
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
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            return response.status_code, response_data
        except requests.exceptions.RequestException as e:
            return 0, str(e)

    def test_health_check(self):
        """Test API health endpoint"""
        status, data = self.make_request('GET', 'health')
        success = status == 200 and isinstance(data, dict) and data.get('status') == 'healthy'
        self.log_test("Health Check", success, status, None if success else f"Expected healthy status, got: {data}")
        return success

    def test_user_registration(self):
        """Test user registration"""
        status, data = self.make_request('POST', 'auth/register', self.test_user_data)
        success = status == 200 and 'access_token' in data and 'user' in data
        if success:
            self.token = data['access_token']
            self.test_user_id = data['user']['id']
        self.log_test("User Registration", success, status, 
                     None if success else f"Registration failed: {data}", data)
        return success

    def test_admin_login(self):
        """Test admin login"""
        status, data = self.make_request('POST', 'auth/login', self.admin_creds)
        success = status == 200 and 'access_token' in data and 'user' in data
        if success:
            self.admin_token = data['access_token']
            # Verify admin has access to all departments
            user = data['user']
            expected_departments = ['marketing', 'sales', 'social']
            has_all_depts = all(dept in user.get('departments', []) for dept in expected_departments)
            success = success and has_all_depts
            if not has_all_depts:
                self.log_test("Admin Login (Department Check)", False, status, 
                             f"Admin missing departments. Has: {user.get('departments', [])}, Expected: {expected_departments}")
        self.log_test("Admin Login", success, status, 
                     None if success else f"Admin login failed: {data}", data)
        return success

    def test_user_login(self):
        """Test user login with credentials"""
        login_data = {
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        }
        status, data = self.make_request('POST', 'auth/login', login_data)
        success = status == 200 and 'access_token' in data
        self.log_test("User Login", success, status, 
                     None if success else f"User login failed: {data}", data)
        return success

    def test_get_user_profile(self):
        """Test getting user profile"""
        if not self.token:
            self.log_test("Get User Profile", False, None, "No token available")
            return False
        
        status, data = self.make_request('GET', 'auth/me', token=self.token)
        success = status == 200 and 'email' in data and 'role' in data
        self.log_test("Get User Profile", success, status, 
                     None if success else f"Profile fetch failed: {data}", data)
        return success

    def test_unified_dashboard(self):
        """Test unified dashboard endpoint"""
        if not self.admin_token:
            self.log_test("Unified Dashboard", False, None, "No admin token available")
            return False
        
        status, data = self.make_request('GET', 'dashboard/unified', token=self.admin_token)
        success = status == 200 and 'stats' in data and 'user' in data
        if success:
            # Verify admin can see all department stats
            stats = data['stats']
            expected_depts = ['marketing', 'sales', 'social']
            has_all_stats = all(dept in stats for dept in expected_depts)
            success = success and has_all_stats
        self.log_test("Unified Dashboard", success, status, 
                     None if success else f"Dashboard failed: {data}", data)
        return success

    def test_marketing_endpoints(self):
        """Test Marketing module endpoints"""
        if not self.admin_token:
            self.log_test("Marketing Endpoints", False, None, "No admin token available")
            return False
        
        # Test marketing dashboard
        status, data = self.make_request('GET', 'marketing/dashboard', token=self.admin_token)
        success = status == 200 and isinstance(data, dict)
        self.log_test("Marketing Dashboard", success, status, 
                     None if success else f"Marketing dashboard failed: {data}", data)
        
        # Test influencers list
        status, data = self.make_request('GET', 'marketing/influencers', token=self.admin_token)
        success = status == 200 and isinstance(data, list)
        self.log_test("Marketing - Get Influencers", success, status, 
                     None if success else f"Get influencers failed: {data}", data)
        
        # Test creating influencer
        influencer_data = {
            "name": "Test Influencer",
            "city": "Mumbai",
            "country": "India",
            "industry": "fashion",
            "tier": "micro",
            "followers": 10000,
            "engagement_rate": 3.5,
            "instagram_handle": "test_influencer_123"
        }
        status, data = self.make_request('POST', 'marketing/influencers', influencer_data, token=self.admin_token)
        success = status == 200 and 'id' in data
        influencer_id = data.get('id') if success else None
        self.log_test("Marketing - Create Influencer", success, status, 
                     None if success else f"Create influencer failed: {data}", data)
        
        # Test campaigns list
        status, data = self.make_request('GET', 'marketing/campaigns', token=self.admin_token)
        success = status == 200 and isinstance(data, list)
        self.log_test("Marketing - Get Campaigns", success, status, 
                     None if success else f"Get campaigns failed: {data}", data)
        
        return influencer_id is not None

    def test_sales_endpoints(self):
        """Test Sales module endpoints"""
        if not self.admin_token:
            self.log_test("Sales Endpoints", False, None, "No admin token available")
            return False
        
        # Test sales dashboard
        status, data = self.make_request('GET', 'sales/dashboard', token=self.admin_token)
        success = status == 200 and isinstance(data, dict)
        self.log_test("Sales Dashboard", success, status, 
                     None if success else f"Sales dashboard failed: {data}", data)
        
        # Test leads list
        status, data = self.make_request('GET', 'sales/leads', token=self.admin_token)
        success = status == 200 and isinstance(data, list)
        self.log_test("Sales - Get Leads", success, status, 
                     None if success else f"Get leads failed: {data}", data)
        
        # Test creating lead
        lead_data = {
            "name": "Test Customer",
            "phone": "+919876543210",
            "email": "testcustomer@test.com",
            "source": "Website",
            "city": "Delhi",
            "occasion": "Wedding"
        }
        status, data = self.make_request('POST', 'sales/leads', lead_data, token=self.admin_token)
        success = status == 200 and 'id' in data
        lead_id = data.get('id') if success else None
        self.log_test("Sales - Create Lead", success, status, 
                     None if success else f"Create lead failed: {data}", data)
        
        # Test customers list
        status, data = self.make_request('GET', 'sales/customers', token=self.admin_token)
        success = status == 200 and isinstance(data, list)
        self.log_test("Sales - Get Customers", success, status, 
                     None if success else f"Get customers failed: {data}", data)
        
        # Test pipeline
        status, data = self.make_request('GET', 'sales/pipeline', token=self.admin_token)
        success = status == 200 and isinstance(data, dict)
        self.log_test("Sales - Get Pipeline", success, status, 
                     None if success else f"Get pipeline failed: {data}", data)
        
        return lead_id is not None

    def test_social_endpoints(self):
        """Test Social module endpoints"""
        if not self.admin_token:
            self.log_test("Social Endpoints", False, None, "No admin token available")
            return False
        
        # Test social dashboard
        status, data = self.make_request('GET', 'social/dashboard', token=self.admin_token)
        success = status == 200 and isinstance(data, dict)
        self.log_test("Social Dashboard", success, status, 
                     None if success else f"Social dashboard failed: {data}", data)
        
        # Test content list
        status, data = self.make_request('GET', 'social/content', token=self.admin_token)
        success = status == 200 and isinstance(data, list)
        self.log_test("Social - Get Content", success, status, 
                     None if success else f"Get content failed: {data}", data)
        
        # Test creating content
        content_data = {
            "title": "Test Post",
            "content_type": "image",
            "platform": "instagram",
            "caption": "Test caption for social media post",
            "hashtags": ["#test", "#sevora"]
        }
        status, data = self.make_request('POST', 'social/content', content_data, token=self.admin_token)
        success = status == 200 and 'id' in data
        content_id = data.get('id') if success else None
        self.log_test("Social - Create Content", success, status, 
                     None if success else f"Create content failed: {data}", data)
        
        return content_id is not None

    def test_role_based_access(self):
        """Test role-based access control"""
        if not self.token:  # Regular user token
            self.log_test("Role Based Access", False, None, "No user token available")
            return False
        
        # Test that regular user cannot access admin endpoints
        status, data = self.make_request('GET', 'admin/users', token=self.token)
        success = status == 403  # Should be forbidden
        self.log_test("Role Based Access - Admin Endpoint Blocked", success, status, 
                     None if success else f"Expected 403, got {status}: {data}")
        
        # Test that regular user can access their profile
        status, data = self.make_request('GET', 'auth/me', token=self.token)
        success = status == 200
        self.log_test("Role Based Access - User Profile Access", success, status, 
                     None if success else f"User profile access failed: {data}")
        
        return True

    def test_invalid_token_access(self):
        """Test API behavior with invalid tokens"""
        # Test with invalid token
        status, data = self.make_request('GET', 'auth/me', token="invalid_token_123")
        success = status == 401  # Should be unauthorized
        self.log_test("Invalid Token Access", success, status, 
                     None if success else f"Expected 401, got {status}: {data}")
        return success

    def run_all_tests(self):
        """Run all test cases"""
        print("🚀 Starting Sevora Team API Tests...")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Core authentication tests
        self.test_health_check()
        self.test_user_registration()
        self.test_user_login()
        self.test_get_user_profile()
        self.test_admin_login()
        
        # Dashboard and unified tests
        self.test_unified_dashboard()
        
        # Department-specific tests
        self.test_marketing_endpoints()
        self.test_sales_endpoints()
        self.test_social_endpoints()
        
        # Security tests
        self.test_role_based_access()
        self.test_invalid_token_access()
        
        # Print results
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS")
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
    """Main function to run tests"""
    print("🔥 Sevora Team API Testing Suite")
    print("Testing unified platform with role-based access control")
    
    tester = SevoraAPITester()
    results = tester.run_all_tests()
    
    # Save results to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = f"/app/test_reports/backend_test_results_{timestamp}.json"
    
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
        print("\n🎉 Tests completed successfully!")
        return 0
    else:
        print("\n💥 Critical issues found - tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())