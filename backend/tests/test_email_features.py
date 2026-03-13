"""
Test Email Features API - Templates and Signatures CRUD Operations
Phase 1 of Mail Inbox Features for Marketing Operations Platform.

Tests cover:
1. Email Templates CRUD - GET, POST, PUT, DELETE
2. Email Signatures CRUD - GET, POST, PUT, DELETE
3. Signature is_default flag behavior (setting one as default unsets others)
4. Data persistence verification (Create->GET pattern)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"


class TestEmailFeaturesAuth:
    """Test authentication for email features"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Return headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestEmailTemplatesCRUD(TestEmailFeaturesAuth):
    """Test Email Templates CRUD operations"""
    
    # Track created template IDs for cleanup
    created_template_ids = []
    
    def test_get_templates_empty_or_existing(self, auth_headers):
        """GET /api/email-features/templates - should return list"""
        response = requests.get(
            f"{BASE_URL}/api/email-features/templates",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Templates should be a list"
        print(f"PASS: GET templates returned {len(data)} template(s)")
    
    def test_create_template_success(self, auth_headers):
        """POST /api/email-features/templates - create new template"""
        template_data = {
            "name": f"TEST_Template_{uuid.uuid4().hex[:8]}",
            "subject": "Test Subject for Collaboration",
            "body": "<p>This is a test template body with <b>HTML</b> content.</p>",
            "category": "test_category"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/email-features/templates",
            json=template_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create template failed: {response.text}"
        data = response.json()
        
        # Data assertions
        assert "id" in data, "Response should contain id"
        assert data["name"] == template_data["name"], "Name mismatch"
        assert data["subject"] == template_data["subject"], "Subject mismatch"
        assert data["body"] == template_data["body"], "Body mismatch"
        assert data["category"] == template_data["category"], "Category mismatch"
        assert "created_at" in data, "Should have created_at"
        assert "updated_at" in data, "Should have updated_at"
        
        # Track for cleanup
        self.created_template_ids.append(data["id"])
        print(f"PASS: Created template with ID: {data['id']}")
        
        return data["id"]
    
    def test_create_template_with_default_category(self, auth_headers):
        """POST /api/email-features/templates - create with default category"""
        template_data = {
            "name": f"TEST_DefaultCat_{uuid.uuid4().hex[:8]}",
            "subject": "Default Category Test",
            "body": "<p>Testing default category value</p>"
            # No category provided - should default to "general"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/email-features/templates",
            json=template_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Default category should be "general"
        assert data.get("category") == "general", f"Expected 'general' category, got: {data.get('category')}"
        
        self.created_template_ids.append(data["id"])
        print(f"PASS: Created template with default category 'general'")
    
    def test_create_template_and_verify_persistence(self, auth_headers):
        """Create template and verify it's persisted via GET"""
        template_data = {
            "name": f"TEST_Persistence_{uuid.uuid4().hex[:8]}",
            "subject": "Persistence Test Subject",
            "body": "<p>Testing database persistence</p>",
            "category": "persistence_test"
        }
        
        # CREATE
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/templates",
            json=template_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created = create_response.json()
        template_id = created["id"]
        self.created_template_ids.append(template_id)
        
        # GET all templates and verify the created one exists
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/templates",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        templates = get_response.json()
        
        # Find our template
        found_template = next((t for t in templates if t["id"] == template_id), None)
        assert found_template is not None, f"Created template {template_id} not found in GET response"
        assert found_template["name"] == template_data["name"]
        assert found_template["subject"] == template_data["subject"]
        
        print(f"PASS: Template {template_id} persisted and verified via GET")
    
    def test_update_template_success(self, auth_headers):
        """PUT /api/email-features/templates/{id} - update template"""
        # First create a template
        create_data = {
            "name": f"TEST_Update_{uuid.uuid4().hex[:8]}",
            "subject": "Original Subject",
            "body": "<p>Original body</p>",
            "category": "original"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/templates",
            json=create_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created = create_response.json()
        template_id = created["id"]
        self.created_template_ids.append(template_id)
        
        # UPDATE
        update_data = {
            "name": f"TEST_Updated_{uuid.uuid4().hex[:8]}",
            "subject": "Updated Subject",
            "body": "<p>Updated body content</p>",
            "category": "updated"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/email-features/templates/{template_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        
        # Verify updates
        assert updated["name"] == update_data["name"], "Name not updated"
        assert updated["subject"] == update_data["subject"], "Subject not updated"
        assert updated["body"] == update_data["body"], "Body not updated"
        assert updated["category"] == update_data["category"], "Category not updated"
        
        print(f"PASS: Template {template_id} updated successfully")
    
    def test_update_template_and_verify_persistence(self, auth_headers):
        """Update template and verify changes persisted via GET"""
        # Create
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/templates",
            json={
                "name": f"TEST_UpdatePersist_{uuid.uuid4().hex[:8]}",
                "subject": "Before Update",
                "body": "<p>Before</p>",
                "category": "before"
            },
            headers=auth_headers
        )
        created = create_response.json()
        template_id = created["id"]
        self.created_template_ids.append(template_id)
        
        # Update
        new_subject = f"After Update {uuid.uuid4().hex[:8]}"
        requests.put(
            f"{BASE_URL}/api/email-features/templates/{template_id}",
            json={
                "name": f"TEST_Updated_{uuid.uuid4().hex[:8]}",
                "subject": new_subject,
                "body": "<p>After</p>",
                "category": "after"
            },
            headers=auth_headers
        )
        
        # Verify via GET
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/templates",
            headers=auth_headers
        )
        templates = get_response.json()
        found = next((t for t in templates if t["id"] == template_id), None)
        
        assert found is not None, "Updated template not found"
        assert found["subject"] == new_subject, "Update not persisted"
        
        print(f"PASS: Template update persisted and verified")
    
    def test_update_nonexistent_template_returns_404(self, auth_headers):
        """PUT /api/email-features/templates/{id} - 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        
        response = requests.put(
            f"{BASE_URL}/api/email-features/templates/{fake_id}",
            json={
                "name": "Test",
                "subject": "Test",
                "body": "Test"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: Non-existent template returns 404")
    
    def test_delete_template_success(self, auth_headers):
        """DELETE /api/email-features/templates/{id} - delete template"""
        # Create template to delete
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/templates",
            json={
                "name": f"TEST_Delete_{uuid.uuid4().hex[:8]}",
                "subject": "To be deleted",
                "body": "<p>Delete me</p>"
            },
            headers=auth_headers
        )
        created = create_response.json()
        template_id = created["id"]
        
        # DELETE
        delete_response = requests.delete(
            f"{BASE_URL}/api/email-features/templates/{template_id}",
            headers=auth_headers
        )
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion via GET
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/templates",
            headers=auth_headers
        )
        templates = get_response.json()
        found = next((t for t in templates if t["id"] == template_id), None)
        
        assert found is None, f"Deleted template {template_id} still exists"
        print(f"PASS: Template {template_id} deleted and verified")
    
    def test_delete_nonexistent_template_returns_404(self, auth_headers):
        """DELETE /api/email-features/templates/{id} - 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        
        response = requests.delete(
            f"{BASE_URL}/api/email-features/templates/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: Delete non-existent template returns 404")
    
    def test_get_templates_by_category(self, auth_headers):
        """GET /api/email-features/templates?category=x - filter by category"""
        # Create template with specific category
        unique_category = f"unique_cat_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/templates",
            json={
                "name": f"TEST_Category_{uuid.uuid4().hex[:8]}",
                "subject": "Category filter test",
                "body": "<p>Category test</p>",
                "category": unique_category
            },
            headers=auth_headers
        )
        created = create_response.json()
        self.created_template_ids.append(created["id"])
        
        # GET with category filter
        response = requests.get(
            f"{BASE_URL}/api/email-features/templates?category={unique_category}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        templates = response.json()
        
        # All returned templates should have the specified category
        for template in templates:
            assert template["category"] == unique_category
        
        # Our template should be in the results
        assert any(t["id"] == created["id"] for t in templates)
        
        print(f"PASS: Category filter working correctly")
    
    @pytest.fixture(scope="class", autouse=True)
    def cleanup_templates(self, auth_headers, request):
        """Cleanup created test templates after all tests"""
        yield
        # Cleanup
        for template_id in self.created_template_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/email-features/templates/{template_id}",
                    headers=auth_headers
                )
            except:
                pass


class TestEmailSignaturesCRUD(TestEmailFeaturesAuth):
    """Test Email Signatures CRUD operations"""
    
    # Track created signature IDs for cleanup
    created_signature_ids = []
    
    def test_get_signatures_empty_or_existing(self, auth_headers):
        """GET /api/email-features/signatures - should return list"""
        response = requests.get(
            f"{BASE_URL}/api/email-features/signatures",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Signatures should be a list"
        print(f"PASS: GET signatures returned {len(data)} signature(s)")
    
    def test_create_signature_success(self, auth_headers):
        """POST /api/email-features/signatures - create new signature"""
        signature_data = {
            "name": f"TEST_Signature_{uuid.uuid4().hex[:8]}",
            "content": "<p>Best regards,<br>Test User<br>Test Company</p>",
            "is_default": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/email-features/signatures",
            json=signature_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create signature failed: {response.text}"
        data = response.json()
        
        # Data assertions
        assert "id" in data, "Response should contain id"
        assert data["name"] == signature_data["name"], "Name mismatch"
        assert data["content"] == signature_data["content"], "Content mismatch"
        assert data["is_default"] == signature_data["is_default"], "is_default mismatch"
        assert "created_at" in data, "Should have created_at"
        assert "updated_at" in data, "Should have updated_at"
        
        self.created_signature_ids.append(data["id"])
        print(f"PASS: Created signature with ID: {data['id']}")
    
    def test_create_signature_and_verify_persistence(self, auth_headers):
        """Create signature and verify it's persisted via GET"""
        signature_data = {
            "name": f"TEST_SigPersist_{uuid.uuid4().hex[:8]}",
            "content": "<p>Persistence test signature</p>",
            "is_default": False
        }
        
        # CREATE
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/signatures",
            json=signature_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created = create_response.json()
        signature_id = created["id"]
        self.created_signature_ids.append(signature_id)
        
        # GET all signatures and verify
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/signatures",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        signatures = get_response.json()
        
        found = next((s for s in signatures if s["id"] == signature_id), None)
        assert found is not None, f"Created signature {signature_id} not found"
        assert found["name"] == signature_data["name"]
        assert found["content"] == signature_data["content"]
        
        print(f"PASS: Signature {signature_id} persisted and verified")
    
    def test_create_default_signature_unsets_others(self, auth_headers):
        """Creating a default signature should unset other defaults"""
        # Create first default signature
        sig1_data = {
            "name": f"TEST_DefaultSig1_{uuid.uuid4().hex[:8]}",
            "content": "<p>First default signature</p>",
            "is_default": True
        }
        
        response1 = requests.post(
            f"{BASE_URL}/api/email-features/signatures",
            json=sig1_data,
            headers=auth_headers
        )
        assert response1.status_code == 200
        sig1 = response1.json()
        self.created_signature_ids.append(sig1["id"])
        assert sig1["is_default"] == True, "First signature should be default"
        
        # Create second default signature
        sig2_data = {
            "name": f"TEST_DefaultSig2_{uuid.uuid4().hex[:8]}",
            "content": "<p>Second default signature</p>",
            "is_default": True
        }
        
        response2 = requests.post(
            f"{BASE_URL}/api/email-features/signatures",
            json=sig2_data,
            headers=auth_headers
        )
        assert response2.status_code == 200
        sig2 = response2.json()
        self.created_signature_ids.append(sig2["id"])
        assert sig2["is_default"] == True, "Second signature should be default"
        
        # GET all signatures and verify only sig2 is default
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/signatures",
            headers=auth_headers
        )
        signatures = get_response.json()
        
        sig1_current = next((s for s in signatures if s["id"] == sig1["id"]), None)
        sig2_current = next((s for s in signatures if s["id"] == sig2["id"]), None)
        
        assert sig1_current["is_default"] == False, "First signature should no longer be default"
        assert sig2_current["is_default"] == True, "Second signature should be default"
        
        print("PASS: Creating new default signature correctly unsets previous defaults")
    
    def test_update_signature_success(self, auth_headers):
        """PUT /api/email-features/signatures/{id} - update signature"""
        # Create signature
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/signatures",
            json={
                "name": f"TEST_UpdateSig_{uuid.uuid4().hex[:8]}",
                "content": "<p>Original content</p>",
                "is_default": False
            },
            headers=auth_headers
        )
        created = create_response.json()
        signature_id = created["id"]
        self.created_signature_ids.append(signature_id)
        
        # UPDATE
        update_data = {
            "name": f"TEST_UpdatedSig_{uuid.uuid4().hex[:8]}",
            "content": "<p>Updated content</p>",
            "is_default": False
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/email-features/signatures/{signature_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        
        assert updated["name"] == update_data["name"], "Name not updated"
        assert updated["content"] == update_data["content"], "Content not updated"
        
        print(f"PASS: Signature {signature_id} updated successfully")
    
    def test_update_signature_to_default_unsets_others(self, auth_headers):
        """Updating a signature to default should unset other defaults"""
        # Create two non-default signatures
        sig1_response = requests.post(
            f"{BASE_URL}/api/email-features/signatures",
            json={
                "name": f"TEST_UpdateDefault1_{uuid.uuid4().hex[:8]}",
                "content": "<p>Sig 1</p>",
                "is_default": True
            },
            headers=auth_headers
        )
        sig1 = sig1_response.json()
        self.created_signature_ids.append(sig1["id"])
        
        sig2_response = requests.post(
            f"{BASE_URL}/api/email-features/signatures",
            json={
                "name": f"TEST_UpdateDefault2_{uuid.uuid4().hex[:8]}",
                "content": "<p>Sig 2</p>",
                "is_default": False
            },
            headers=auth_headers
        )
        sig2 = sig2_response.json()
        self.created_signature_ids.append(sig2["id"])
        
        # Update sig2 to be default
        update_response = requests.put(
            f"{BASE_URL}/api/email-features/signatures/{sig2['id']}",
            json={
                "name": sig2["name"],
                "content": sig2["content"],
                "is_default": True
            },
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Verify sig1 is no longer default
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/signatures",
            headers=auth_headers
        )
        signatures = get_response.json()
        
        sig1_current = next((s for s in signatures if s["id"] == sig1["id"]), None)
        sig2_current = next((s for s in signatures if s["id"] == sig2["id"]), None)
        
        assert sig1_current["is_default"] == False, "Sig1 should no longer be default"
        assert sig2_current["is_default"] == True, "Sig2 should now be default"
        
        print("PASS: Updating signature to default correctly unsets others")
    
    def test_update_nonexistent_signature_returns_404(self, auth_headers):
        """PUT /api/email-features/signatures/{id} - 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        
        response = requests.put(
            f"{BASE_URL}/api/email-features/signatures/{fake_id}",
            json={
                "name": "Test",
                "content": "Test",
                "is_default": False
            },
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: Non-existent signature returns 404")
    
    def test_delete_signature_success(self, auth_headers):
        """DELETE /api/email-features/signatures/{id} - delete signature"""
        # Create signature to delete
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/signatures",
            json={
                "name": f"TEST_DeleteSig_{uuid.uuid4().hex[:8]}",
                "content": "<p>Delete me</p>",
                "is_default": False
            },
            headers=auth_headers
        )
        created = create_response.json()
        signature_id = created["id"]
        
        # DELETE
        delete_response = requests.delete(
            f"{BASE_URL}/api/email-features/signatures/{signature_id}",
            headers=auth_headers
        )
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion via GET
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/signatures",
            headers=auth_headers
        )
        signatures = get_response.json()
        found = next((s for s in signatures if s["id"] == signature_id), None)
        
        assert found is None, f"Deleted signature {signature_id} still exists"
        print(f"PASS: Signature {signature_id} deleted and verified")
    
    def test_delete_nonexistent_signature_returns_404(self, auth_headers):
        """DELETE /api/email-features/signatures/{id} - 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        
        response = requests.delete(
            f"{BASE_URL}/api/email-features/signatures/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: Delete non-existent signature returns 404")
    
    def test_signature_with_html_content(self, auth_headers):
        """Test signature with complex HTML content"""
        complex_html = """
        <div style="font-family: Arial, sans-serif;">
            <p><strong>John Doe</strong></p>
            <p>Senior Marketing Manager</p>
            <p>Sevora Inc.</p>
            <p>Phone: <a href="tel:+1234567890">+1 234 567 890</a></p>
            <p>Email: <a href="mailto:john@sevora.com">john@sevora.com</a></p>
            <hr>
            <img src="https://example.com/logo.png" alt="Company Logo" width="100">
        </div>
        """
        
        response = requests.post(
            f"{BASE_URL}/api/email-features/signatures",
            json={
                "name": f"TEST_HTMLSig_{uuid.uuid4().hex[:8]}",
                "content": complex_html,
                "is_default": False
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Verify HTML content is preserved
        assert complex_html.strip() in data["content"] or data["content"].strip() == complex_html.strip()
        
        self.created_signature_ids.append(data["id"])
        print("PASS: Complex HTML signature content preserved")
    
    @pytest.fixture(scope="class", autouse=True)
    def cleanup_signatures(self, auth_headers, request):
        """Cleanup created test signatures after all tests"""
        yield
        # Cleanup
        for signature_id in self.created_signature_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/email-features/signatures/{signature_id}",
                    headers=auth_headers
                )
            except:
                pass


class TestEmailFeaturesUnauthorized:
    """Test that endpoints require authentication"""
    
    def test_get_templates_unauthorized(self):
        """GET /api/email-features/templates without token should fail"""
        response = requests.get(f"{BASE_URL}/api/email-features/templates")
        # Should return 401 or 403
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("PASS: Templates endpoint requires authentication")
    
    def test_get_signatures_unauthorized(self):
        """GET /api/email-features/signatures without token should fail"""
        response = requests.get(f"{BASE_URL}/api/email-features/signatures")
        # Should return 401 or 403
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("PASS: Signatures endpoint requires authentication")
    
    def test_create_template_unauthorized(self):
        """POST /api/email-features/templates without token should fail"""
        response = requests.post(
            f"{BASE_URL}/api/email-features/templates",
            json={"name": "Test", "subject": "Test", "body": "Test"}
        )
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("PASS: Create template requires authentication")
    
    def test_create_signature_unauthorized(self):
        """POST /api/email-features/signatures without token should fail"""
        response = requests.post(
            f"{BASE_URL}/api/email-features/signatures",
            json={"name": "Test", "content": "Test", "is_default": False}
        )
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("PASS: Create signature requires authentication")


class TestEmailFeaturesValidation:
    """Test input validation for email features"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Return headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_template_missing_required_fields(self, auth_headers):
        """POST /api/email-features/templates with missing fields should fail"""
        # Missing name
        response = requests.post(
            f"{BASE_URL}/api/email-features/templates",
            json={"subject": "Test", "body": "Test"},
            headers=auth_headers
        )
        assert response.status_code == 422, f"Expected 422 for missing name, got {response.status_code}"
        
        # Missing subject
        response = requests.post(
            f"{BASE_URL}/api/email-features/templates",
            json={"name": "Test", "body": "Test"},
            headers=auth_headers
        )
        assert response.status_code == 422, f"Expected 422 for missing subject, got {response.status_code}"
        
        # Missing body
        response = requests.post(
            f"{BASE_URL}/api/email-features/templates",
            json={"name": "Test", "subject": "Test"},
            headers=auth_headers
        )
        assert response.status_code == 422, f"Expected 422 for missing body, got {response.status_code}"
        
        print("PASS: Template creation validates required fields")
    
    def test_create_signature_missing_required_fields(self, auth_headers):
        """POST /api/email-features/signatures with missing fields should fail"""
        # Missing name
        response = requests.post(
            f"{BASE_URL}/api/email-features/signatures",
            json={"content": "Test"},
            headers=auth_headers
        )
        assert response.status_code == 422, f"Expected 422 for missing name, got {response.status_code}"
        
        # Missing content
        response = requests.post(
            f"{BASE_URL}/api/email-features/signatures",
            json={"name": "Test"},
            headers=auth_headers
        )
        assert response.status_code == 422, f"Expected 422 for missing content, got {response.status_code}"
        
        print("PASS: Signature creation validates required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
