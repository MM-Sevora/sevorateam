import requests
import sys
from datetime import datetime
import json
import uuid

class SevoraCRMTester:
    def __init__(self, base_url="https://style-leads.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, status, details=""):
        """Log test results"""
        self.tests_run += 1
        if status:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED")
        else:
            print(f"❌ {name}: FAILED - {details}")
        
        self.test_results.append({
            "test": name,
            "status": "PASSED" if status else "FAILED",
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True)
                    return True, response_data
                except:
                    self.log_test(name, True)
                    return True, {}
            else:
                try:
                    error_details = response.json()
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {error_details}")
                except:
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, _ = self.run_test("Health Check", "GET", "health", 200)
        return success

    def test_register_user(self):
        """Test user registration"""
        test_email = f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@sevora.com"
        user_data = {
            "name": "Test User",
            "email": test_email,
            "password": "TestPass123!",
            "role": "admin",
            "phone": "+919876543210"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_data = response['user']
            return True
        return False

    def test_login_user(self):
        """Test user login"""
        if not self.user_data:
            return False
            
        login_data = {
            "email": self.user_data['email'],
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_get_user_profile(self):
        """Test get current user"""
        success, _ = self.run_test("Get User Profile", "GET", "auth/me", 200)
        return success

    def test_create_lead(self):
        """Test lead creation"""
        lead_data = {
            "name": "Test Customer",
            "phone": "+919876543210", 
            "email": "customer@test.com",
            "source": "Website",
            "occasion": "Wedding",
            "city": "Mumbai",
            "notes": "Test lead for automation"
        }
        
        success, response = self.run_test(
            "Create Lead",
            "POST",
            "leads", 
            200,
            data=lead_data
        )
        
        if success and 'id' in response:
            self.lead_id = response['id']
            return True
        return False

    def test_get_leads(self):
        """Test get all leads"""
        success, response = self.run_test("Get All Leads", "GET", "leads", 200)
        return success and isinstance(response, list)

    def test_get_single_lead(self):
        """Test get single lead"""
        if hasattr(self, 'lead_id'):
            success, _ = self.run_test("Get Single Lead", "GET", f"leads/{self.lead_id}", 200)
            return success
        return False

    def test_update_lead(self):
        """Test update lead"""
        if hasattr(self, 'lead_id'):
            update_data = {
                "stage": "Contacted",
                "notes": "Updated by automation test"
            }
            success, _ = self.run_test("Update Lead", "PUT", f"leads/{self.lead_id}", 200, data=update_data)
            return success
        return False

    def test_create_customer(self):
        """Test customer creation"""
        customer_data = {
            "name": "Test Customer Profile",
            "phone": "+919876543210",
            "email": "customer@test.com", 
            "city": "Delhi",
            "budget_min": 50000,
            "budget_max": 200000,
            "preferred_styles": ["Traditional", "Contemporary"],
            "occasion_type": "Wedding"
        }
        
        success, response = self.run_test(
            "Create Customer",
            "POST",
            "customers",
            200,
            data=customer_data
        )
        
        if success and 'id' in response:
            self.customer_id = response['id']
            return True
        return False

    def test_get_customers(self):
        """Test get all customers"""
        success, response = self.run_test("Get All Customers", "GET", "customers", 200)
        return success and isinstance(response, list)

    def test_create_qr_code(self):
        """Test QR code creation"""
        qr_data = {
            "name": "Test Event QR",
            "source_type": "Event", 
            "campaign": "Test Campaign",
            "location": "Mumbai Mall"
        }
        
        success, response = self.run_test(
            "Create QR Code",
            "POST",
            "qrcodes",
            200,
            data=qr_data
        )
        
        if success and 'id' in response:
            self.qr_id = response['id']
            return True
        return False

    def test_get_qr_codes(self):
        """Test get all QR codes"""
        success, response = self.run_test("Get All QR Codes", "GET", "qrcodes", 200)
        return success and isinstance(response, list)

    def test_create_wedding_plan(self):
        """Test wedding plan creation"""
        if hasattr(self, 'customer_id'):
            wedding_data = {
                "customer_id": self.customer_id,
                "wedding_date": "2024-12-31",
                "wedding_location": "Mumbai", 
                "role": "Bride",
                "events": ["Wedding", "Reception"],
                "outfit_plans": [
                    {
                        "event": "Wedding",
                        "category": "Lehenga",
                        "budget": 150000,
                        "style_preference": "Heavy embroidery"
                    }
                ],
                "notes": "Test wedding plan"
            }
            
            success, response = self.run_test(
                "Create Wedding Plan",
                "POST", 
                "wedding-plans",
                200,
                data=wedding_data
            )
            
            if success and 'id' in response:
                self.wedding_plan_id = response['id']
                return True
        return False

    def test_get_wedding_plans(self):
        """Test get all wedding plans"""
        success, response = self.run_test("Get All Wedding Plans", "GET", "wedding-plans", 200)
        return success and isinstance(response, list)

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)
        
        if success:
            # Verify expected fields exist
            required_fields = ['total_leads', 'conversion_rate', 'total_customers']
            for field in required_fields:
                if field not in response:
                    self.log_test("Dashboard Stats Fields", False, f"Missing field: {field}")
                    return False
            return True
        return False

    def test_channel_performance(self):
        """Test channel performance analytics"""
        success, response = self.run_test("Channel Performance", "GET", "dashboard/channel-performance", 200)
        return success and isinstance(response, list)

    def test_stylist_performance(self):
        """Test stylist performance analytics"""
        success, response = self.run_test("Stylist Performance", "GET", "dashboard/stylist-performance", 200)
        return success and isinstance(response, list)

    def test_public_lead_capture(self):
        """Test public lead capture (no auth required)"""
        lead_data = {
            "name": "Public Test Lead",
            "phone": "+919876543210",
            "source": "Website",
            "occasion": "Wedding"
        }
        
        # Remove auth token for this test
        old_token = self.token
        self.token = None
        
        success, _ = self.run_test(
            "Public Lead Capture",
            "POST",
            "public/lead", 
            200,
            data=lead_data
        )
        
        # Restore token
        self.token = old_token
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Sevora CRM API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test sequence - order matters for dependencies
        test_sequence = [
            ("Health Check", self.test_health_check),
            ("User Registration", self.test_register_user), 
            ("User Login", self.test_login_user),
            ("Get User Profile", self.test_get_user_profile),
            ("Create Lead", self.test_create_lead),
            ("Get All Leads", self.test_get_leads),
            ("Get Single Lead", self.test_get_single_lead),
            ("Update Lead", self.test_update_lead),
            ("Create Customer", self.test_create_customer),
            ("Get All Customers", self.test_get_customers),
            ("Create QR Code", self.test_create_qr_code),
            ("Get All QR Codes", self.test_get_qr_codes),
            ("Create Wedding Plan", self.test_create_wedding_plan),
            ("Get All Wedding Plans", self.test_get_wedding_plans),
            ("Dashboard Stats", self.test_dashboard_stats),
            ("Channel Performance", self.test_channel_performance),
            ("Stylist Performance", self.test_stylist_performance),
            ("Public Lead Capture", self.test_public_lead_capture),
        ]
        
        for test_name, test_func in test_sequence:
            try:
                test_func()
            except Exception as e:
                self.log_test(test_name, False, f"Exception: {str(e)}")
        
        # Print final summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print(f"✅ Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Failed: {self.tests_run - self.tests_passed}/{self.tests_run}")
        print(f"📈 Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if result['status'] == 'FAILED':
                    print(f"  • {result['test']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SevoraCRMTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())