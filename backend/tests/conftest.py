"""
Shared pytest fixtures for Sevora API tests
"""
import pytest
import requests
import os

# Get BASE_URL from environment or use preview URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com').rstrip('/')

@pytest.fixture(scope="session")
def base_url():
    """Return the base API URL"""
    return BASE_URL

@pytest.fixture(scope="session")
def admin_token(base_url):
    """Get authentication token for admin user"""
    response = requests.post(
        f"{base_url}/api/auth/login",
        json={"email": "admin@sevora.com", "password": "admin123"}
    )
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return response.json()["access_token"]

@pytest.fixture(scope="session")
def marketing_token(base_url):
    """Get authentication token for marketing user"""
    response = requests.post(
        f"{base_url}/api/auth/login",
        json={"email": "marketing@sevora.com", "password": "admin123"}
    )
    if response.status_code != 200:
        pytest.skip(f"Marketing login failed: {response.text}")
    return response.json()["access_token"]

@pytest.fixture(scope="session")
def admin_headers(admin_token):
    """Get headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }

@pytest.fixture(scope="session")
def marketing_headers(marketing_token):
    """Get headers with marketing auth token"""
    return {
        "Authorization": f"Bearer {marketing_token}",
        "Content-Type": "application/json"
    }

@pytest.fixture(scope="session")
def test_influencer_id():
    """Known test influencer ID from seed data"""
    return "3519a431-aa8f-427a-80ab-6e5f1db966fb"
