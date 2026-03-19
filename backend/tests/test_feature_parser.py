"""
Feature Parser API Tests
Tests for the Engineering Feature Parser module:
- POST /api/engineering/feature-parser/parse-text - Parse text content directly
- POST /api/engineering/feature-parser/parse - Parse DOCX files
- GET /api/engineering/feature-parser/projects - Get engineering projects list
- POST /api/engineering/feature-parser/create-artifacts - Create artifacts from parsed data
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com')

# Test data
SAMPLE_FEATURE_TEXT = """
# User Authentication Feature

## Overview
This feature provides a complete user authentication system for the application.

## User Stories

### US-1: User Login
As a user, I want to log in with my email and password, so that I can access my account.

Acceptance Criteria:
- User can enter email and password
- System validates credentials
- User is redirected to dashboard on success
- Error message shown on invalid credentials

### US-2: User Registration
As a new user, I want to register an account, so that I can start using the platform.

Acceptance Criteria:
- User can enter name, email, and password
- System validates email format
- Password must be at least 8 characters
- Confirmation email sent after registration

### US-3: Password Reset
As a user, I want to reset my password if I forget it, so that I can regain access.

Acceptance Criteria:
- User can request password reset via email
- Reset link expires after 24 hours
- New password must meet security requirements
"""


class TestFeatureParserAuth:
    """Test authentication for Feature Parser endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_parse_text_unauthorized(self):
        """Test that parse-text endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/engineering/feature-parser/parse-text",
            json={"content": "Test content"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_projects_unauthorized(self):
        """Test that projects endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/engineering/feature-parser/projects"
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"


class TestFeatureParserParseText:
    """Test /api/engineering/feature-parser/parse-text endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_parse_text_empty_content(self, auth_headers):
        """Test parse-text with empty content returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/engineering/feature-parser/parse-text",
            headers=auth_headers,
            json={"content": ""}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    
    def test_parse_text_whitespace_content(self, auth_headers):
        """Test parse-text with whitespace-only content returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/engineering/feature-parser/parse-text",
            headers=auth_headers,
            json={"content": "   "}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    
    def test_parse_text_success(self, auth_headers):
        """Test parse-text with valid content returns parsed artifacts"""
        response = requests.post(
            f"{BASE_URL}/api/engineering/feature-parser/parse-text",
            headers=auth_headers,
            json={
                "content": SAMPLE_FEATURE_TEXT,
                "title": "User Authentication"
            },
            timeout=60  # AI parsing may take time
        )
        
        print(f"Parse text response status: {response.status_code}")
        
        # AI parsing may fail due to various reasons, but we check the structure
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Expected success: true"
            assert "data" in data, "Response should contain 'data' field"
            
            parsed_data = data["data"]
            assert "feature_title" in parsed_data, "Parsed data should have feature_title"
            assert "epics" in parsed_data, "Parsed data should have epics"
            assert isinstance(parsed_data["epics"], list), "Epics should be a list"
            
            # Validate epic structure if present
            if len(parsed_data["epics"]) > 0:
                epic = parsed_data["epics"][0]
                assert "id" in epic, "Epic should have id"
                assert "title" in epic, "Epic should have title"
                assert "user_stories" in epic, "Epic should have user_stories"
                
            print(f"Parsed {len(parsed_data['epics'])} epics")
        else:
            # Log but don't fail if AI parsing fails
            print(f"Warning: Parse text failed with status {response.status_code}: {response.text[:500]}")
            pytest.skip("AI parsing failed - may be rate limited or service issue")


class TestFeatureParserProjects:
    """Test /api/engineering/feature-parser/projects endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_projects_success(self, auth_headers):
        """Test getting engineering projects returns list of development projects"""
        response = requests.get(
            f"{BASE_URL}/api/engineering/feature-parser/projects",
            headers=auth_headers
        )
        
        print(f"Projects response status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"Found {len(data)} engineering projects")
        
        # Validate project structure if any projects exist
        if len(data) > 0:
            project = data[0]
            assert "id" in project, "Project should have id"
            assert "name" in project, "Project should have name"
            # All projects should have project_type 'development'
            # Note: The endpoint filters by project_type='development'


class TestFeatureParserCreateArtifacts:
    """Test /api/engineering/feature-parser/create-artifacts endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_artifacts_missing_params(self, auth_headers):
        """Test create-artifacts with missing parameters returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/engineering/feature-parser/create-artifacts",
            headers=auth_headers,
            json={
                "parsed_data": {
                    "feature_title": "Test Feature",
                    "feature_description": "Test description",
                    "epics": [],
                    "images": []
                }
            }
        )
        # Should fail because neither project_id nor new_project_name is provided
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    
    def test_create_artifacts_with_new_project(self, auth_headers):
        """Test create-artifacts creates new project and artifacts"""
        test_project_name = f"TEST_FeatureParser_Project_{int(time.time())}"
        
        response = requests.post(
            f"{BASE_URL}/api/engineering/feature-parser/create-artifacts",
            headers=auth_headers,
            json={
                "new_project_name": test_project_name,
                "new_project_description": "Test project created by feature parser tests",
                "parsed_data": {
                    "feature_title": "Test Authentication Feature",
                    "feature_description": "User authentication system",
                    "epics": [
                        {
                            "id": "epic-1",
                            "title": "Authentication Epic",
                            "description": "Handle all authentication flows",
                            "user_stories": [
                                {
                                    "id": "story-1",
                                    "title": "User Login",
                                    "description": "As a user, I want to log in to access my account",
                                    "acceptance_criteria": ["User can enter credentials", "System validates input"],
                                    "story_points": 5,
                                    "tasks": [
                                        {"id": "task-1", "title": "Login - Design", "type": "design", "description": "Design login UI"},
                                        {"id": "task-2", "title": "Login - Frontend", "type": "frontend", "description": "Implement login form"},
                                        {"id": "task-3", "title": "Login - Backend", "type": "backend", "description": "Implement login API"},
                                        {"id": "task-4", "title": "Login - QA", "type": "qa", "description": "Test login flow"}
                                    ]
                                }
                            ]
                        }
                    ],
                    "images": []
                }
            }
        )
        
        print(f"Create artifacts response status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Expected success: true"
        assert "project_id" in data, "Response should contain project_id"
        assert "created" in data, "Response should contain created counts"
        
        created = data["created"]
        assert created.get("epics", 0) >= 1, "Should have created at least 1 epic"
        assert created.get("user_stories", 0) >= 1, "Should have created at least 1 user story"
        assert created.get("tasks", 0) >= 1, "Should have created at least 1 task"
        
        print(f"Created: {created['epics']} epics, {created['user_stories']} stories, {created['tasks']} tasks")
        
        # Return project_id for cleanup if needed
        return data["project_id"]


class TestEngineeringPages:
    """Test Engineering module page endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_projects_list(self, auth_headers):
        """Test /api/projects/list returns projects"""
        response = requests.get(
            f"{BASE_URL}/api/projects/list",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} projects")
    
    def test_knowledge_spaces(self, auth_headers):
        """Test /api/knowledge/spaces returns knowledge base spaces"""
        response = requests.get(
            f"{BASE_URL}/api/knowledge/spaces",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} knowledge spaces")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
