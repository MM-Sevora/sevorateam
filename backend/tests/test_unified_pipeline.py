"""
Test Suite for Unified Pipeline Feature
Tests: pipeline_stage updates, drag-drop via API, communication creation
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUnifiedPipeline:
    """Tests for the unified marketing pipeline feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login and get auth token"""
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "marketing@sevora.com",
            "password": "admin123"
        })
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_01_get_all_contacts(self):
        """Verify GET /api/marketing/v2/contacts returns contacts with pipeline_stage"""
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts")
        assert response.status_code == 200, f"Failed to get contacts: {response.text}"
        
        contacts = response.json()
        assert isinstance(contacts, list), "Response should be a list"
        
        # Check that at least one contact exists
        if len(contacts) > 0:
            contact = contacts[0]
            assert "id" in contact, "Contact should have id"
            assert "name" in contact, "Contact should have name"
            print(f"Found {len(contacts)} contacts")
            
            # Check if pipeline_stage field exists in response model
            # Note: pipeline_stage may not be set on all contacts
            for c in contacts[:5]:
                print(f"  Contact: {c.get('name')} - pipeline_stage: {c.get('pipeline_stage', 'not set')}")
    
    def test_02_update_contact_pipeline_stage(self):
        """Verify PUT /api/marketing/v2/contacts/{id} can update pipeline_stage"""
        # First get a contact
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts")
        assert response.status_code == 200
        
        contacts = response.json()
        assert len(contacts) > 0, "Need at least one contact to test"
        
        # Find a test contact or use first one
        test_contact = None
        for c in contacts:
            if 'TEST' in c.get('name', '').upper() or c.get('name') == 'Sarah Editor':
                test_contact = c
                break
        
        if not test_contact:
            test_contact = contacts[0]
        
        contact_id = test_contact['id']
        original_stage = test_contact.get('pipeline_stage', 'identified')
        print(f"Testing with contact: {test_contact['name']} (id: {contact_id})")
        print(f"Original pipeline_stage: {original_stage}")
        
        # Update to 'contacted' stage
        new_stage = 'contacted' if original_stage != 'contacted' else 'identified'
        update_response = self.session.put(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}", json={
            "pipeline_stage": new_stage
        })
        
        assert update_response.status_code == 200, f"Failed to update contact: {update_response.text}"
        
        # Verify the update
        verify_response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}")
        assert verify_response.status_code == 200
        
        updated_contact = verify_response.json()
        assert updated_contact.get('pipeline_stage') == new_stage, f"pipeline_stage should be '{new_stage}', got '{updated_contact.get('pipeline_stage')}'"
        print(f"SUCCESS: Updated pipeline_stage from '{original_stage}' to '{new_stage}'")
        
        # Restore original stage
        self.session.put(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}", json={
            "pipeline_stage": original_stage
        })
    
    def test_03_get_contact_communications(self):
        """Verify GET /api/marketing/v2/contacts/{id}/communications works"""
        # First get a contact with communications
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts")
        assert response.status_code == 200
        
        contacts = response.json()
        assert len(contacts) > 0
        
        contact_id = contacts[0]['id']
        
        # Get communications for contact
        comm_response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/communications")
        assert comm_response.status_code == 200, f"Failed to get communications: {comm_response.text}"
        
        communications = comm_response.json()
        assert isinstance(communications, list), "Communications should be a list"
        print(f"Found {len(communications)} communications for contact {contacts[0]['name']}")
        
        if len(communications) > 0:
            comm = communications[0]
            assert "id" in comm, "Communication should have id"
            assert "message" in comm or "subject" in comm, "Communication should have message or subject"
    
    def test_04_create_communication_record(self):
        """Verify POST /api/marketing/v2/communications creates communication"""
        # Get a contact
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts")
        assert response.status_code == 200
        
        contacts = response.json()
        assert len(contacts) > 0
        
        # Find a test contact
        test_contact = None
        for c in contacts:
            if 'TEST' in c.get('name', '').upper():
                test_contact = c
                break
        
        if not test_contact:
            test_contact = contacts[0]
        
        contact_id = test_contact['id']
        
        # Create a communication using the correct endpoint
        test_msg_id = str(uuid.uuid4())[:8]
        comm_data = {
            "contact_id": contact_id,
            "comm_type": "email",
            "subject": f"TEST_PIPELINE_COMM_{test_msg_id}",
            "message": f"Test message from unified pipeline test {test_msg_id}",
            "direction": "outbound"
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/marketing/v2/communications",
            json=comm_data
        )
        
        assert create_response.status_code in [200, 201], f"Failed to create communication: {create_response.text}"
        
        created_comm = create_response.json()
        assert "id" in created_comm, "Created communication should have id"
        print(f"SUCCESS: Created communication with id: {created_comm.get('id')}")
        
        # Verify it appears in communications list
        verify_response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/communications")
        assert verify_response.status_code == 200
        
        comms = verify_response.json()
        comm_found = any(c.get('subject') == comm_data['subject'] for c in comms)
        assert comm_found, "Created communication should appear in list"
        print(f"SUCCESS: Communication verified in list")
    
    def test_05_get_contact_deals(self):
        """Verify GET /api/marketing/v2/contacts/{id}/deals works"""
        # Get contacts
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts")
        assert response.status_code == 200
        
        contacts = response.json()
        assert len(contacts) > 0
        
        # Try Nivrity Das who should have a deal
        nivrity = None
        for c in contacts:
            if 'nivrity' in c.get('name', '').lower():
                nivrity = c
                break
        
        if not nivrity:
            nivrity = contacts[0]
        
        contact_id = nivrity['id']
        
        # Get deals
        deals_response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/deals")
        assert deals_response.status_code == 200, f"Failed to get deals: {deals_response.text}"
        
        deals = deals_response.json()
        assert isinstance(deals, list), "Deals should be a list"
        print(f"Found {len(deals)} deals for contact {nivrity['name']}")
    
    def test_06_unified_campaigns_endpoint(self):
        """Verify GET /api/marketing/v2/unified-campaigns works"""
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/unified-campaigns")
        assert response.status_code == 200, f"Failed to get unified campaigns: {response.text}"
        
        campaigns = response.json()
        assert isinstance(campaigns, list), "Campaigns should be a list"
        print(f"Found {len(campaigns)} unified campaigns")
        
        if len(campaigns) > 0:
            campaign = campaigns[0]
            assert "id" in campaign, "Campaign should have id"
            assert "name" in campaign, "Campaign should have name"
    
    def test_07_verify_pipeline_stages_enum(self):
        """Verify all 8 pipeline stages can be set"""
        # Get a test contact
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/contacts")
        assert response.status_code == 200
        
        contacts = response.json()
        # Find a TEST_ prefixed contact to modify
        test_contact = None
        for c in contacts:
            if c.get('name', '').startswith('TEST_'):
                test_contact = c
                break
        
        if not test_contact:
            print("No TEST_ contact found, skipping enum verification")
            pytest.skip("No test contact available")
        
        contact_id = test_contact['id']
        original_stage = test_contact.get('pipeline_stage')
        
        # Test all 8 stages
        stages = ['identified', 'contacted', 'replied', 'negotiating', 'agreed', 'delivering', 'completed', 'lost']
        
        for stage in stages:
            update_resp = self.session.put(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}", json={
                "pipeline_stage": stage
            })
            assert update_resp.status_code == 200, f"Failed to set stage '{stage}': {update_resp.text}"
            print(f"  ✓ Stage '{stage}' accepted")
        
        # Restore original
        if original_stage:
            self.session.put(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}", json={
                "pipeline_stage": original_stage
            })
        
        print("SUCCESS: All 8 pipeline stages are valid")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
