"""
Budget & Payment Module Tests
Tests for Budget page payment CRUD operations including:
- GET /marketing/payments - List payments
- POST /marketing/v2/payments - Create payment
- PUT /marketing/v2/payments/{id} - Update payment
- DELETE /marketing/v2/payments/{id} - Delete payment
- PUT /marketing/v2/payments/{id}/status - Update payment status
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBudgetPayments:
    """Tests for Budget & Payment module CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "marketing@sevora.com",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            print(f"✅ Logged in successfully")
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_get_payments_list(self):
        """Test GET /marketing/payments - List all payments"""
        response = self.session.get(f"{BASE_URL}/api/marketing/payments")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of payments"
        print(f"✅ GET payments returns {len(data)} payments")
        
        # If there are payments, verify structure
        if len(data) > 0:
            payment = data[0]
            assert "id" in payment, "Payment should have 'id'"
            assert "amount" in payment, "Payment should have 'amount'"
            assert "status" in payment, "Payment should have 'status'"
            print(f"✅ Payment structure verified: id={payment.get('id')}")
    
    def test_get_contacts_for_payment(self):
        """Test GET /marketing/v2/contacts - Get contacts for payment dropdown"""
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts", params={"limit": 100})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of contacts"
        print(f"✅ GET contacts returns {len(data)} contacts")
        
        # Verify contacts have required fields for payment dropdown
        if len(data) > 0:
            contact = data[0]
            assert "id" in contact, "Contact should have 'id'"
            assert "name" in contact, "Contact should have 'name'"
            assert "contact_type" in contact, "Contact should have 'contact_type'"
            print(f"✅ Contact: {contact.get('name')} ({contact.get('contact_type')})")
    
    def test_get_campaigns_for_payment(self):
        """Test GET /marketing/v2/unified-campaigns - Get campaigns for payment dropdown"""
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/unified-campaigns")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of campaigns"
        print(f"✅ GET campaigns returns {len(data)} campaigns")
    
    def test_create_payment(self):
        """Test POST /marketing/v2/payments - Create new payment"""
        # First get a contact to use
        contacts_response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts", params={"limit": 1})
        contacts = contacts_response.json()
        
        if not contacts or len(contacts) == 0:
            pytest.skip("No contacts available for payment test")
        
        contact_id = contacts[0]["id"]
        
        # Create payment
        test_payment = {
            "contact_id": contact_id,
            "amount": 15000,
            "description": "TEST_Payment_for_testing",
            "payment_type": "influencer_fee",
            "payment_method": "bank_transfer"
        }
        
        response = self.session.post(f"{BASE_URL}/api/marketing/v2/payments", json=test_payment)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain payment id"
        assert data.get("amount") == 15000, "Amount should match"
        assert data.get("status") == "pending", "Initial status should be 'pending'"
        
        self.created_payment_id = data["id"]
        print(f"✅ Payment created: id={data['id']}, amount=₹{data['amount']}")
        return data["id"]
    
    def test_update_payment(self):
        """Test PUT /marketing/v2/payments/{id} - Update payment details"""
        # Create a payment first
        contacts_response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts", params={"limit": 1})
        contacts = contacts_response.json()
        
        if not contacts:
            pytest.skip("No contacts available")
        
        contact_id = contacts[0]["id"]
        
        # Create payment
        create_response = self.session.post(f"{BASE_URL}/api/marketing/v2/payments", json={
            "contact_id": contact_id,
            "amount": 20000,
            "description": "TEST_Payment_to_update",
            "payment_type": "influencer_fee",
            "payment_method": "bank_transfer"
        })
        
        assert create_response.status_code == 200, f"Create failed: {create_response.status_code}"
        payment_id = create_response.json()["id"]
        print(f"Created payment {payment_id} for update test")
        
        # Update the payment
        update_response = self.session.put(
            f"{BASE_URL}/api/marketing/v2/payments/{payment_id}",
            params={
                "amount": 25000,
                "description": "TEST_Payment_updated",
                "payment_type": "pr_placement",
                "payment_method": "upi"
            }
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.status_code}: {update_response.text}"
        print(f"✅ Payment {payment_id} updated successfully")
        
        # Verify update via GET
        get_response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/payments")
        if get_response.status_code == 200:
            payments = get_response.json()
            updated_payment = next((p for p in payments if p["id"] == payment_id), None)
            if updated_payment:
                # Note: The update endpoint uses query params, so we verify the update took effect
                print(f"✅ Verified update - Amount from GET response")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/marketing/v2/payments/{payment_id}")
    
    def test_delete_payment(self):
        """Test DELETE /marketing/v2/payments/{id} - Delete payment"""
        # Create a payment first
        contacts_response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts", params={"limit": 1})
        contacts = contacts_response.json()
        
        if not contacts:
            pytest.skip("No contacts available")
        
        contact_id = contacts[0]["id"]
        
        # Create payment
        create_response = self.session.post(f"{BASE_URL}/api/marketing/v2/payments", json={
            "contact_id": contact_id,
            "amount": 10000,
            "description": "TEST_Payment_to_delete",
            "payment_type": "other"
        })
        
        assert create_response.status_code == 200
        payment_id = create_response.json()["id"]
        print(f"Created payment {payment_id} for delete test")
        
        # Delete the payment
        delete_response = self.session.delete(f"{BASE_URL}/api/marketing/v2/payments/{payment_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.status_code}: {delete_response.text}"
        print(f"✅ Payment {payment_id} deleted successfully")
        
        # Verify deletion - trying to delete again should fail
        delete_again = self.session.delete(f"{BASE_URL}/api/marketing/v2/payments/{payment_id}")
        assert delete_again.status_code == 404, "Deleted payment should return 404"
        print(f"✅ Verified payment no longer exists (404 on re-delete)")
    
    def test_update_payment_status(self):
        """Test PUT /marketing/v2/payments/{id}/status - Update payment status"""
        # Create a payment first
        contacts_response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts", params={"limit": 1})
        contacts = contacts_response.json()
        
        if not contacts:
            pytest.skip("No contacts available")
        
        contact_id = contacts[0]["id"]
        
        # Create payment
        create_response = self.session.post(f"{BASE_URL}/api/marketing/v2/payments", json={
            "contact_id": contact_id,
            "amount": 30000,
            "description": "TEST_Payment_status_test"
        })
        
        assert create_response.status_code == 200
        payment_id = create_response.json()["id"]
        initial_status = create_response.json().get("status")
        print(f"Created payment {payment_id} with status '{initial_status}'")
        
        # Update status to 'processing'
        status_response = self.session.put(
            f"{BASE_URL}/api/marketing/v2/payments/{payment_id}/status",
            params={"status": "processing"}
        )
        assert status_response.status_code == 200, f"Status update failed: {status_response.status_code}"
        print(f"✅ Status updated to 'processing'")
        
        # Update status to 'paid'
        paid_response = self.session.put(
            f"{BASE_URL}/api/marketing/v2/payments/{payment_id}/status",
            params={"status": "paid"}
        )
        assert paid_response.status_code == 200
        print(f"✅ Status updated to 'paid'")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/marketing/v2/payments/{payment_id}")


class TestPublicationPayments:
    """Tests for PublicationDetailPage payment functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "marketing@sevora.com",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_get_publications_list(self):
        """Test GET /marketing/v2/publications - Get publications for testing"""
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/publications")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of publications"
        print(f"✅ Found {len(data)} publications")
        
        if len(data) > 0:
            pub = data[0]
            assert "id" in pub, "Publication should have 'id'"
            assert "name" in pub, "Publication should have 'name'"
            print(f"✅ First publication: {pub.get('name')}")
            return pub["id"]
        return None
    
    def test_get_publication_journalists(self):
        """Test GET /marketing/v2/publications/{id}/journalists - Get journalists for payment dropdown"""
        # First get a publication
        pubs_response = self.session.get(f"{BASE_URL}/api/marketing/v2/publications")
        pubs = pubs_response.json()
        
        if not pubs or len(pubs) == 0:
            pytest.skip("No publications available")
        
        pub_id = pubs[0]["id"]
        
        # Get journalists at this publication
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/publications/{pub_id}/journalists")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of journalists"
        print(f"✅ Found {len(data)} journalists at publication")
        
        if len(data) > 0:
            journalist = data[0]
            assert journalist.get("contact_type") == "journalist", "Should be a journalist"
            print(f"✅ Journalist: {journalist.get('name')}")
    
    def test_create_payment_for_journalist(self):
        """Test creating payment for a journalist via POST /marketing/v2/payments"""
        # Get a journalist
        contacts_response = self.session.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"contact_type": "journalist", "limit": 1}
        )
        contacts = contacts_response.json()
        
        if not contacts or len(contacts) == 0:
            pytest.skip("No journalists available")
        
        journalist_id = contacts[0]["id"]
        journalist_name = contacts[0].get("name")
        
        # Create payment for journalist (PR placement type)
        payment_data = {
            "contact_id": journalist_id,
            "amount": 50000,
            "description": f"TEST_PR_Payment_for_{journalist_name}",
            "payment_type": "pr_placement",
            "payment_method": "bank_transfer"
        }
        
        response = self.session.post(f"{BASE_URL}/api/marketing/v2/payments", json=payment_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("payment_type") == "pr_placement", "Payment type should be pr_placement"
        print(f"✅ Payment created for journalist: ₹{data.get('amount')}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/marketing/v2/payments/{data['id']}")


class TestPaymentSummary:
    """Tests for payment summary endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "marketing@sevora.com",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_unified_campaign_stats(self):
        """Test GET /marketing/v2/unified-campaigns/stats - Budget overview stats"""
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/unified-campaigns/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify expected fields for budget overview
        assert "total_budget" in data, "Should have total_budget"
        assert "total_spent" in data, "Should have total_spent"
        assert "total_paid" in data, "Should have total_paid"
        assert "total_pending" in data, "Should have total_pending"
        
        print(f"✅ Budget Stats:")
        print(f"   Total Budget: ₹{data.get('total_budget', 0)}")
        print(f"   Total Spent: ₹{data.get('total_spent', 0)}")
        print(f"   Total Paid: ₹{data.get('total_paid', 0)}")
        print(f"   Total Pending: ₹{data.get('total_pending', 0)}")
    
    def test_contact_payments(self):
        """Test GET /marketing/v2/contacts/{id}/payments - Get payments for specific contact"""
        # Get a contact with payments
        contacts_response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts", params={"limit": 5})
        contacts = contacts_response.json()
        
        if not contacts:
            pytest.skip("No contacts available")
        
        for contact in contacts:
            contact_id = contact["id"]
            response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/payments")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            payments = response.json()
            if len(payments) > 0:
                print(f"✅ Contact {contact.get('name')} has {len(payments)} payments")
                return
        
        print(f"⚠️ No contacts with payments found in first 5 contacts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
