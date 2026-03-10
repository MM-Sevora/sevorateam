"""
Comprehensive Backend Tests for Buying & Sourcing Module
Tests: Dashboard, Brands, Suppliers, Manufacturers, AI Discovery, Email Campaigns, Calendar follow-ups
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access_token in response"
    return data["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestSourcingDashboard:
    """Test Sourcing Dashboard endpoint"""
    
    def test_get_dashboard(self, api_client):
        """Test sourcing dashboard returns stats"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/dashboard")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Verify dashboard structure
        assert "brands" in data, "Missing brands stats"
        assert "suppliers" in data, "Missing suppliers stats"
        assert "manufacturers" in data, "Missing manufacturers stats"
        
        # Verify brands stats structure
        assert "total" in data["brands"], "Missing brands total"
        assert "by_stage" in data["brands"], "Missing brands by_stage"
        
        print(f"Dashboard stats: Brands={data['brands']['total']}, Suppliers={data['suppliers']['total']}, Manufacturers={data['manufacturers']['total']}")


class TestBrandsAPI:
    """Test Brands CRUD and pipeline operations"""
    
    def test_list_brands(self, api_client):
        """Test listing brands"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/brands")
        assert response.status_code == 200, f"List brands failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Brands response should be a list"
        print(f"Found {len(data)} brands")
    
    def test_list_brands_paginated(self, api_client):
        """Test paginated brands listing"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/brands/paginated?page=1&page_size=10")
        assert response.status_code == 200, f"Paginated brands failed: {response.text}"
        data = response.json()
        
        assert "brands" in data, "Missing brands key in paginated response"
        assert "total" in data, "Missing total in paginated response"
        assert "page" in data, "Missing page in paginated response"
        assert "total_pages" in data, "Missing total_pages in paginated response"
        print(f"Paginated: {data['total']} total brands, page {data['page']} of {data['total_pages']}")
    
    def test_create_brand(self, api_client):
        """Test creating a brand"""
        brand_data = {
            "name": "TEST_BrandCreation_" + datetime.now().strftime("%H%M%S"),
            "city": "Mumbai",
            "segment": "Affordable Luxury",
            "division": "Apparel",
            "categories": ["Western", "Casual Wear"],
            "genders": ["Women"],
            "email": "test@testbrand.com"
        }
        
        response = api_client.post(f"{BASE_URL}/api/sourcing/brands", json=brand_data)
        assert response.status_code == 200, f"Create brand failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Created brand should have ID"
        assert data["name"] == brand_data["name"], "Brand name mismatch"
        assert data["city"] == brand_data["city"], "Brand city mismatch"
        assert data["pipeline_stage"] == "Discovery", "New brand should be in Discovery stage"
        
        # Cleanup - delete the test brand
        brand_id = data["id"]
        delete_response = api_client.delete(f"{BASE_URL}/api/sourcing/brands/{brand_id}")
        assert delete_response.status_code == 200, f"Cleanup failed: {delete_response.text}"
        print(f"Created and deleted test brand: {brand_data['name']}")
    
    def test_get_brand_substages(self, api_client):
        """Test getting pipeline substages"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/brands/substages")
        assert response.status_code == 200, f"Get substages failed: {response.text}"
        data = response.json()
        
        assert "Discovery" in data, "Missing Discovery stage substages"
        assert "Contacted" in data, "Missing Contacted stage substages"
        assert isinstance(data["Discovery"], list), "Substages should be list"
        print(f"Pipeline stages: {list(data.keys())}")
    
    def test_brand_crud_flow(self, api_client):
        """Test full brand CRUD with follow-up date"""
        # CREATE
        brand_data = {
            "name": "TEST_CRUDFlow_" + datetime.now().strftime("%H%M%S"),
            "city": "Delhi",
            "segment": "Premium",
            "division": "Apparel"
        }
        create_response = api_client.post(f"{BASE_URL}/api/sourcing/brands", json=brand_data)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        brand = create_response.json()
        brand_id = brand["id"]
        
        # READ
        get_response = api_client.get(f"{BASE_URL}/api/sourcing/brands/{brand_id}")
        assert get_response.status_code == 200, f"Get failed: {get_response.text}"
        fetched = get_response.json()
        assert fetched["name"] == brand_data["name"]
        
        # UPDATE with follow_up_date
        follow_up_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        update_response = api_client.put(f"{BASE_URL}/api/sourcing/brands/{brand_id}", json={
            "pipeline_stage": "Contacted",
            "follow_up_date": follow_up_date
        })
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        assert updated["pipeline_stage"] == "Contacted", "Pipeline stage not updated"
        assert updated["follow_up_date"] == follow_up_date, "Follow-up date not set"
        
        # DELETE
        delete_response = api_client.delete(f"{BASE_URL}/api/sourcing/brands/{brand_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deleted
        verify_response = api_client.get(f"{BASE_URL}/api/sourcing/brands/{brand_id}")
        assert verify_response.status_code == 404, "Brand should be deleted"
        print(f"Brand CRUD flow completed successfully with follow-up date")


class TestSuppliersAPI:
    """Test Suppliers CRUD operations"""
    
    def test_list_suppliers(self, api_client):
        """Test listing suppliers"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/suppliers")
        assert response.status_code == 200, f"List suppliers failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Suppliers response should be a list"
        print(f"Found {len(data)} suppliers")
    
    def test_get_supplier_metadata(self, api_client):
        """Test getting supplier metadata"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/suppliers/metadata")
        assert response.status_code == 200, f"Get metadata failed: {response.text}"
        data = response.json()
        
        assert "cities" in data, "Missing cities in metadata"
        assert "types" in data, "Missing types in metadata"
        assert "pipeline_stages" in data, "Missing pipeline_stages"
        print(f"Supplier metadata: {len(data.get('cities', []))} cities, {len(data.get('types', []))} types")
    
    def test_supplier_crud_with_follow_up(self, api_client):
        """Test supplier CRUD with follow-up date"""
        # CREATE
        supplier_data = {
            "name": "TEST_Supplier_" + datetime.now().strftime("%H%M%S"),
            "city": "Surat",
            "supplier_type": "Fabric",
            "country": "India"
        }
        create_response = api_client.post(f"{BASE_URL}/api/sourcing/suppliers", json=supplier_data)
        assert create_response.status_code == 200, f"Create supplier failed: {create_response.text}"
        supplier = create_response.json()
        supplier_id = supplier["id"]
        assert supplier["pipeline_stage"] == "Discovery", "New supplier should be in Discovery"
        assert supplier.get("follow_up_date") is None, "New supplier should have no follow_up_date"
        
        # UPDATE with follow_up_date
        follow_up_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        update_response = api_client.put(f"{BASE_URL}/api/sourcing/suppliers/{supplier_id}", json={
            "pipeline_stage": "Sampling",
            "follow_up_date": follow_up_date
        })
        assert update_response.status_code == 200, f"Update supplier failed: {update_response.text}"
        updated = update_response.json()
        assert updated["follow_up_date"] == follow_up_date, "Follow-up date not set on supplier"
        assert updated["pipeline_stage"] == "Sampling", "Pipeline stage not updated"
        
        # Verify with GET
        get_response = api_client.get(f"{BASE_URL}/api/sourcing/suppliers/{supplier_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["follow_up_date"] == follow_up_date, "Follow-up date not persisted"
        
        # DELETE
        delete_response = api_client.delete(f"{BASE_URL}/api/sourcing/suppliers/{supplier_id}")
        assert delete_response.status_code == 200, f"Delete supplier failed: {delete_response.text}"
        print(f"Supplier CRUD with follow-up date completed successfully")
    
    def test_supplier_analytics(self, api_client):
        """Test supplier analytics endpoint"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/suppliers/analytics/summary")
        assert response.status_code == 200, f"Supplier analytics failed: {response.text}"
        data = response.json()
        
        assert "total" in data, "Missing total in analytics"
        assert "active" in data, "Missing active in analytics"
        print(f"Supplier analytics: total={data['total']}, active={data['active']}")


class TestManufacturersAPI:
    """Test Manufacturers CRUD operations"""
    
    def test_list_manufacturers(self, api_client):
        """Test listing manufacturers"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/manufacturers")
        assert response.status_code == 200, f"List manufacturers failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Manufacturers response should be a list"
        print(f"Found {len(data)} manufacturers")
    
    def test_get_manufacturer_metadata(self, api_client):
        """Test getting manufacturer metadata"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/manufacturers/metadata")
        assert response.status_code == 200, f"Get metadata failed: {response.text}"
        data = response.json()
        
        assert "pipeline_stages" in data, "Missing pipeline_stages"
        print(f"Manufacturer metadata loaded with {len(data.get('pipeline_stages', []))} stages")
    
    def test_manufacturer_crud_with_follow_up(self, api_client):
        """Test manufacturer CRUD with follow-up date"""
        # CREATE
        mfg_data = {
            "name": "TEST_Manufacturer_" + datetime.now().strftime("%H%M%S"),
            "city": "Tirupur",
            "manufacturer_type": "Garment",
            "country": "India"
        }
        create_response = api_client.post(f"{BASE_URL}/api/sourcing/manufacturers", json=mfg_data)
        assert create_response.status_code == 200, f"Create manufacturer failed: {create_response.text}"
        mfg = create_response.json()
        mfg_id = mfg["id"]
        assert mfg["pipeline_stage"] == "Discovery", "New manufacturer should be in Discovery"
        assert mfg.get("follow_up_date") is None, "New manufacturer should have no follow_up_date"
        
        # UPDATE with follow_up_date
        follow_up_date = (datetime.now() + timedelta(days=21)).strftime("%Y-%m-%d")
        update_response = api_client.put(f"{BASE_URL}/api/sourcing/manufacturers/{mfg_id}", json={
            "pipeline_stage": "Factory Visit",
            "follow_up_date": follow_up_date
        })
        assert update_response.status_code == 200, f"Update manufacturer failed: {update_response.text}"
        updated = update_response.json()
        assert updated["follow_up_date"] == follow_up_date, "Follow-up date not set on manufacturer"
        assert updated["pipeline_stage"] == "Factory Visit", "Pipeline stage not updated"
        
        # Verify with GET
        get_response = api_client.get(f"{BASE_URL}/api/sourcing/manufacturers/{mfg_id}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["follow_up_date"] == follow_up_date, "Follow-up date not persisted"
        
        # DELETE
        delete_response = api_client.delete(f"{BASE_URL}/api/sourcing/manufacturers/{mfg_id}")
        assert delete_response.status_code == 200, f"Delete manufacturer failed: {delete_response.text}"
        print(f"Manufacturer CRUD with follow-up date completed successfully")
    
    def test_manufacturer_analytics(self, api_client):
        """Test manufacturer analytics endpoint"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/manufacturers/analytics/summary")
        assert response.status_code == 200, f"Manufacturer analytics failed: {response.text}"
        data = response.json()
        
        assert "total" in data, "Missing total in analytics"
        assert "active" in data, "Missing active in analytics"
        print(f"Manufacturer analytics: total={data['total']}, active={data['active']}")


class TestAIDiscoveryAPI:
    """Test AI Discovery endpoints"""
    
    def test_discovery_status(self, api_client):
        """Test AI discovery service status"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/discovery/status")
        assert response.status_code == 200, f"Discovery status failed: {response.text}"
        data = response.json()
        
        assert "configured" in data, "Missing configured status"
        print(f"AI Discovery configured: {data.get('configured')}, mode: {data.get('mode', 'N/A')}")
    
    def test_discovery_options(self, api_client):
        """Test getting discovery options"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/discovery/options")
        assert response.status_code == 200, f"Discovery options failed: {response.text}"
        data = response.json()
        
        assert "categories" in data, "Missing categories"
        assert "cities" in data, "Missing cities"
        assert "segments" in data, "Missing segments"
        print(f"Discovery options: {len(data.get('categories', []))} categories, {len(data.get('cities', []))} cities")
    
    def test_discovery_history(self, api_client):
        """Test getting discovery history"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/discovery/history")
        assert response.status_code == 200, f"Discovery history failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "History should be a list"
        print(f"Discovery history: {len(data)} jobs")


class TestEmailCampaignsAPI:
    """Test Email Campaigns endpoints"""
    
    def test_campaigns_status(self, api_client):
        """Test email service status"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/campaigns/status")
        assert response.status_code == 200, f"Campaigns status failed: {response.text}"
        data = response.json()
        
        assert "configured" in data, "Missing configured status"
        print(f"Email service configured: {data.get('configured')}, provider: {data.get('provider', 'N/A')}")
    
    def test_list_campaigns(self, api_client):
        """Test listing campaigns"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/campaigns")
        assert response.status_code == 200, f"List campaigns failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Campaigns should be a list"
        print(f"Found {len(data)} campaigns")
    
    def test_list_templates(self, api_client):
        """Test listing email templates"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/templates")
        assert response.status_code == 200, f"List templates failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Templates should be a list"
        print(f"Found {len(data)} email templates")
    
    def test_recent_outreach_logs(self, api_client):
        """Test getting recent outreach logs"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/campaigns/logs/recent?limit=10")
        assert response.status_code == 200, f"Recent logs failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Logs should be a list"
        print(f"Found {len(data)} recent outreach logs")
    
    def test_single_email_validation(self, api_client):
        """Test that single email requires all fields"""
        # Missing required fields
        response = api_client.post(f"{BASE_URL}/api/sourcing/campaigns/send-single", json={
            "to_email": "test@test.com"
            # Missing subject and content
        })
        # Should fail validation
        assert response.status_code in [400, 422], f"Should reject incomplete email: {response.status_code}"
        print("Single email validation working correctly")


class TestSamplesAPI:
    """Test Samples endpoint"""
    
    def test_list_samples(self, api_client):
        """Test listing samples"""
        response = api_client.get(f"{BASE_URL}/api/sourcing/samples")
        assert response.status_code == 200, f"List samples failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Samples should be a list"
        print(f"Found {len(data)} samples")


class TestCalendarFollowUps:
    """Test calendar follow-up aggregation"""
    
    def test_follow_ups_from_all_entities(self, api_client):
        """Test that follow-ups can be retrieved from brands, suppliers, manufacturers"""
        # Fetch brands with follow_up_date
        brands_response = api_client.get(f"{BASE_URL}/api/sourcing/brands?limit=100")
        assert brands_response.status_code == 200
        brands = brands_response.json()
        brands_with_followup = [b for b in brands if b.get("follow_up_date")]
        
        # Fetch suppliers with follow_up_date
        suppliers_response = api_client.get(f"{BASE_URL}/api/sourcing/suppliers?limit=100")
        assert suppliers_response.status_code == 200
        suppliers = suppliers_response.json()
        suppliers_with_followup = [s for s in suppliers if s.get("follow_up_date")]
        
        # Fetch manufacturers with follow_up_date
        mfg_response = api_client.get(f"{BASE_URL}/api/sourcing/manufacturers?limit=100")
        assert mfg_response.status_code == 200
        manufacturers = mfg_response.json()
        mfg_with_followup = [m for m in manufacturers if m.get("follow_up_date")]
        
        print(f"Follow-ups: {len(brands_with_followup)} brands, {len(suppliers_with_followup)} suppliers, {len(mfg_with_followup)} manufacturers")
        
        # Total follow-ups that calendar page would show
        total_followups = len(brands_with_followup) + len(suppliers_with_followup) + len(mfg_with_followup)
        print(f"Total follow-ups for calendar: {total_followups}")


class TestBrandNotes:
    """Test Brand Notes functionality"""
    
    def test_brand_notes_crud(self, api_client):
        """Test creating and fetching brand notes"""
        # First create a brand
        brand_data = {
            "name": "TEST_NotesBrand_" + datetime.now().strftime("%H%M%S"),
            "city": "Bangalore",
            "segment": "Bridge to Luxury"
        }
        create_response = api_client.post(f"{BASE_URL}/api/sourcing/brands", json=brand_data)
        assert create_response.status_code == 200
        brand_id = create_response.json()["id"]
        
        # Create a note
        note_response = api_client.post(f"{BASE_URL}/api/sourcing/brands/{brand_id}/notes", json={
            "note": "Test note content - follow up next week"
        })
        assert note_response.status_code == 200, f"Create note failed: {note_response.text}"
        note = note_response.json()
        assert "id" in note, "Note should have ID"
        assert note["note"] == "Test note content - follow up next week"
        
        # Get notes
        get_notes_response = api_client.get(f"{BASE_URL}/api/sourcing/brands/{brand_id}/notes")
        assert get_notes_response.status_code == 200
        notes = get_notes_response.json()
        assert len(notes) >= 1, "Should have at least one note"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/sourcing/brands/{brand_id}")
        print("Brand notes CRUD completed successfully")


class TestBrandContacts:
    """Test Brand Contacts functionality"""
    
    def test_brand_contacts_crud(self, api_client):
        """Test creating and fetching brand contacts"""
        # First create a brand
        brand_data = {
            "name": "TEST_ContactsBrand_" + datetime.now().strftime("%H%M%S"),
            "city": "Chennai",
            "segment": "Premium"
        }
        create_response = api_client.post(f"{BASE_URL}/api/sourcing/brands", json=brand_data)
        assert create_response.status_code == 200
        brand_id = create_response.json()["id"]
        
        # Create a contact
        contact_response = api_client.post(f"{BASE_URL}/api/sourcing/brands/{brand_id}/contacts", json={
            "name": "Test Contact",
            "designation": "Founder",
            "email": "contact@test.com",
            "phone": "+91 9876543210",
            "is_primary": True
        })
        assert contact_response.status_code == 200, f"Create contact failed: {contact_response.text}"
        contact = contact_response.json()
        assert "id" in contact, "Contact should have ID"
        assert contact["name"] == "Test Contact"
        assert contact["is_primary"] == True
        
        # Get contacts
        get_contacts_response = api_client.get(f"{BASE_URL}/api/sourcing/brands/{brand_id}/contacts")
        assert get_contacts_response.status_code == 200
        contacts = get_contacts_response.json()
        assert len(contacts) >= 1, "Should have at least one contact"
        
        # Delete contact
        contact_id = contact["id"]
        delete_contact_response = api_client.delete(f"{BASE_URL}/api/sourcing/brands/contacts/{contact_id}")
        assert delete_contact_response.status_code == 200
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/sourcing/brands/{brand_id}")
        print("Brand contacts CRUD completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
