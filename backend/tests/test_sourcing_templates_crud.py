"""
Sourcing Module - Email Templates CRUD Tests
Tests for: POST, GET, PUT, DELETE /api/sourcing/templates
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com').rstrip('/')


class TestSourcingTemplatesCRUD:
    """Template CRUD endpoint tests for Sourcing module"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json()["access_token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    @pytest.fixture(scope="class")
    def created_template_id(self, auth_headers):
        """Create a test template and return its ID for use in other tests"""
        unique_name = f"TEST_Template_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": unique_name,
            "type": "introduction",
            "subject": "Test Subject {{company_name}}",
            "content": "Hello {{founder_name}}, this is a test template for {{brand_name}}.",
            "variables": ["founder_name", "company_name", "brand_name"]
        }
        response = requests.post(f"{BASE_URL}/api/sourcing/templates", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create test template: {response.text}"
        template = response.json()
        yield template["id"]
        # Cleanup after all tests in class
        requests.delete(f"{BASE_URL}/api/sourcing/templates/{template['id']}", headers=auth_headers)

    # ==================
    # LIST TEMPLATES TEST
    # ==================
    def test_list_templates(self, auth_headers):
        """Test GET /api/sourcing/templates - List all templates"""
        response = requests.get(f"{BASE_URL}/api/sourcing/templates", headers=auth_headers)
        
        assert response.status_code == 200, f"List templates failed: {response.text}"
        data = response.json()
        
        # Data assertions - should be a list
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one template"
        
        # Verify structure of first template
        first_template = data[0]
        assert "id" in first_template, "Template should have id"
        assert "name" in first_template, "Template should have name"
        assert "type" in first_template, "Template should have type"
        assert "content" in first_template, "Template should have content"
        print(f"PASS: Listed {len(data)} templates")

    def test_list_templates_with_type_filter(self, auth_headers):
        """Test GET /api/sourcing/templates?type=email - Filter by type"""
        response = requests.get(f"{BASE_URL}/api/sourcing/templates?type=email", headers=auth_headers)
        
        assert response.status_code == 200, f"Filter templates failed: {response.text}"
        data = response.json()
        
        # All returned templates should be of type 'email'
        for template in data:
            assert template["type"] == "email", f"Template {template['name']} has wrong type {template['type']}"
        print(f"PASS: Filtered to {len(data)} email templates")

    def test_list_templates_with_search(self, auth_headers, created_template_id):
        """Test GET /api/sourcing/templates?search=TEST - Search by name"""
        response = requests.get(f"{BASE_URL}/api/sourcing/templates?search=TEST_Template", headers=auth_headers)
        
        assert response.status_code == 200, f"Search templates failed: {response.text}"
        data = response.json()
        
        # Should find at least our test template
        assert len(data) >= 1, "Should find at least one test template"
        print(f"PASS: Search found {len(data)} templates")

    # ==================
    # CREATE TEMPLATE TEST
    # ==================
    def test_create_template(self, auth_headers):
        """Test POST /api/sourcing/templates - Create new template"""
        unique_name = f"TEST_NewTemplate_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": unique_name,
            "type": "follow_up",
            "subject": "Following up on our conversation - {{company_name}}",
            "content": "Hi {{founder_name}},\n\nI wanted to follow up on my previous email about {{brand_name}}.\n\nBest regards,\n{{sender_name}}",
            "variables": ["founder_name", "company_name", "brand_name", "sender_name"]
        }
        
        response = requests.post(f"{BASE_URL}/api/sourcing/templates", json=payload, headers=auth_headers)
        
        assert response.status_code == 200, f"Create template failed: {response.text}"
        data = response.json()
        
        # Data assertions
        assert "id" in data, "Created template should have id"
        assert data["name"] == unique_name, "Name should match"
        assert data["type"] == "follow_up", "Type should match"
        assert data["subject"] == payload["subject"], "Subject should match"
        assert data["content"] == payload["content"], "Content should match"
        assert data["variables"] == payload["variables"], "Variables should match"
        assert "created_at" in data, "Should have created_at"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/sourcing/templates/{data['id']}", headers=auth_headers)
        print(f"PASS: Created template with id {data['id']}")

    def test_create_template_minimal(self, auth_headers):
        """Test POST /api/sourcing/templates - Create with minimal fields"""
        unique_name = f"TEST_MinimalTemplate_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": unique_name,
            "content": "Simple content without variables"
        }
        
        response = requests.post(f"{BASE_URL}/api/sourcing/templates", json=payload, headers=auth_headers)
        
        assert response.status_code == 200, f"Create minimal template failed: {response.text}"
        data = response.json()
        
        # Data assertions - defaults should be applied
        assert data["name"] == unique_name
        assert data["type"] == "email", "Default type should be 'email'"
        assert data["content"] == payload["content"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/sourcing/templates/{data['id']}", headers=auth_headers)
        print(f"PASS: Created minimal template with default type")

    # ==================
    # GET SINGLE TEMPLATE TEST
    # ==================
    def test_get_template_by_id(self, auth_headers, created_template_id):
        """Test GET /api/sourcing/templates/{id} - Get single template"""
        response = requests.get(f"{BASE_URL}/api/sourcing/templates/{created_template_id}", headers=auth_headers)
        
        assert response.status_code == 200, f"Get template failed: {response.text}"
        data = response.json()
        
        # Data assertions
        assert data["id"] == created_template_id, "ID should match"
        assert "name" in data, "Should have name"
        assert "type" in data, "Should have type"
        assert "content" in data, "Should have content"
        print(f"PASS: Retrieved template {data['name']}")

    def test_get_template_not_found(self, auth_headers):
        """Test GET /api/sourcing/templates/{id} - Template not found returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/sourcing/templates/{fake_id}", headers=auth_headers)
        
        assert response.status_code == 404, f"Expected 404 for non-existent template, got {response.status_code}"
        print("PASS: Non-existent template returns 404")

    # ==================
    # UPDATE TEMPLATE TEST
    # ==================
    def test_update_template(self, auth_headers, created_template_id):
        """Test PUT /api/sourcing/templates/{id} - Update template"""
        update_payload = {
            "name": f"TEST_Updated_{uuid.uuid4().hex[:8]}",
            "subject": "Updated Subject Line",
            "content": "Updated content with {{new_variable}}"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/sourcing/templates/{created_template_id}",
            json=update_payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Update template failed: {response.text}"
        data = response.json()
        
        # Data assertions
        assert data["name"] == update_payload["name"], "Name should be updated"
        assert data["subject"] == update_payload["subject"], "Subject should be updated"
        assert data["content"] == update_payload["content"], "Content should be updated"
        assert "updated_at" in data, "Should have updated_at"
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/sourcing/templates/{created_template_id}", headers=auth_headers)
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == update_payload["name"], "Update should persist"
        print(f"PASS: Updated and verified template")

    def test_update_template_partial(self, auth_headers, created_template_id):
        """Test PUT /api/sourcing/templates/{id} - Partial update (only subject)"""
        # Get current state
        get_response = requests.get(f"{BASE_URL}/api/sourcing/templates/{created_template_id}", headers=auth_headers)
        original = get_response.json()
        
        # Update only subject
        update_payload = {"subject": "Only Subject Changed"}
        response = requests.put(
            f"{BASE_URL}/api/sourcing/templates/{created_template_id}",
            json=update_payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Partial update failed: {response.text}"
        data = response.json()
        
        # Subject should change, other fields should remain
        assert data["subject"] == "Only Subject Changed", "Subject should be updated"
        assert data["content"] == original["content"], "Content should remain unchanged"
        print("PASS: Partial update works correctly")

    def test_update_template_not_found(self, auth_headers):
        """Test PUT /api/sourcing/templates/{id} - Update non-existent template returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/sourcing/templates/{fake_id}",
            json={"name": "Test"},
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Update non-existent template returns 404")

    # ==================
    # DELETE TEMPLATE TEST
    # ==================
    def test_delete_template(self, auth_headers):
        """Test DELETE /api/sourcing/templates/{id} - Delete template"""
        # First create a template to delete
        unique_name = f"TEST_ToDelete_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/sourcing/templates",
            json={"name": unique_name, "content": "To be deleted"},
            headers=auth_headers
        )
        assert create_response.status_code == 200
        template_id = create_response.json()["id"]
        
        # Delete the template
        delete_response = requests.delete(f"{BASE_URL}/api/sourcing/templates/{template_id}", headers=auth_headers)
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        data = delete_response.json()
        assert data["success"] == True, "Delete should return success=True"
        
        # Verify template no longer exists
        get_response = requests.get(f"{BASE_URL}/api/sourcing/templates/{template_id}", headers=auth_headers)
        assert get_response.status_code == 404, "Deleted template should return 404"
        print("PASS: Delete template and verified removal")

    def test_delete_template_not_found(self, auth_headers):
        """Test DELETE /api/sourcing/templates/{id} - Delete non-existent template returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/sourcing/templates/{fake_id}", headers=auth_headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Delete non-existent template returns 404")

    # ==================
    # TEMPLATE TYPES ENDPOINT TEST
    # ==================
    def test_get_template_types(self, auth_headers):
        """Test GET /api/sourcing/templates/types - Get available template types"""
        response = requests.get(f"{BASE_URL}/api/sourcing/templates/types", headers=auth_headers)
        
        assert response.status_code == 200, f"Get types failed: {response.text}"
        data = response.json()
        
        # Data assertions
        assert "types" in data, "Response should have types key"
        assert isinstance(data["types"], list), "Types should be a list"
        
        # Check expected types exist
        expected_types = ["email", "whatsapp", "follow_up", "introduction", "partnership", "sample_request"]
        for expected in expected_types:
            assert expected in data["types"], f"Missing type: {expected}"
        print(f"PASS: Got {len(data['types'])} template types")


class TestTemplatesCategoryFiltering:
    """Tests for template category filtering functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json()["access_token"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def test_filter_by_whatsapp_type(self, auth_headers):
        """Test filtering templates by WhatsApp type"""
        response = requests.get(f"{BASE_URL}/api/sourcing/templates?type=whatsapp", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        for template in data:
            assert template["type"] == "whatsapp"
        print(f"PASS: Found {len(data)} WhatsApp templates")

    def test_filter_by_introduction_type(self, auth_headers):
        """Test filtering templates by introduction type"""
        response = requests.get(f"{BASE_URL}/api/sourcing/templates?type=introduction", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        for template in data:
            assert template["type"] == "introduction"
        print(f"PASS: Found {len(data)} introduction templates")

    def test_verify_category_counts(self, auth_headers):
        """Test that all templates have valid types and verify counts match"""
        # Get all templates
        response = requests.get(f"{BASE_URL}/api/sourcing/templates", headers=auth_headers)
        assert response.status_code == 200
        all_templates = response.json()
        
        # Count by type
        type_counts = {}
        for template in all_templates:
            t = template.get("type", "email")
            type_counts[t] = type_counts.get(t, 0) + 1
        
        print(f"Template counts by type: {type_counts}")
        print(f"Total templates: {len(all_templates)}")
        
        # Verify each filtered count matches
        for template_type, expected_count in type_counts.items():
            filtered_response = requests.get(f"{BASE_URL}/api/sourcing/templates?type={template_type}", headers=auth_headers)
            assert filtered_response.status_code == 200
            filtered_count = len(filtered_response.json())
            assert filtered_count == expected_count, f"Type {template_type}: expected {expected_count}, got {filtered_count}"
        
        print("PASS: All category counts verified")
