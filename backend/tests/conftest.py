import pytest
import requests
import os

@pytest.fixture(scope="session")
def base_url():
    """Get base URL from environment"""
    url = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
    if not url:
        pytest.fail("EXPO_PUBLIC_BACKEND_URL not set in environment")
    return url.rstrip('/')

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def owner_token(base_url, api_client):
    """Get owner auth token"""
    response = api_client.post(f"{base_url}/api/auth/login", json={
        "email": "owner@fitsync.com",
        "password": "Owner@123"
    })
    if response.status_code != 200:
        pytest.skip(f"Owner login failed: {response.status_code}")
    return response.json()["access_token"]

@pytest.fixture(scope="session")
def admin_token(base_url, api_client):
    """Get super admin auth token"""
    response = api_client.post(f"{base_url}/api/auth/login", json={
        "email": "admin@fitsync.com",
        "password": "Admin@123"
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code}")
    return response.json()["access_token"]

@pytest.fixture(scope="session")
def staff_token(base_url, api_client):
    """Get staff auth token"""
    response = api_client.post(f"{base_url}/api/auth/login", json={
        "email": "staff1@fitsync.com",
        "password": "Staff@123"
    })
    if response.status_code != 200:
        pytest.skip(f"Staff login failed: {response.status_code}")
    return response.json()["access_token"]

@pytest.fixture(scope="session")
def member_token(base_url, api_client):
    """Get member auth token"""
    response = api_client.post(f"{base_url}/api/auth/login", json={
        "email": "james.wilson@email.com",
        "password": "Member@123"
    })
    if response.status_code != 200:
        pytest.skip(f"Member login failed: {response.status_code}")
    return response.json()["access_token"]

@pytest.fixture(scope="session")
def gym_id():
    """Demo gym ID from seed data"""
    return "gym_demo0001"

@pytest.fixture(scope="session")
def member_id():
    """Demo member ID from seed data"""
    return "mem_00000001"
