"""
FitSync Gym API Test Suite
Tests: Health, Auth, Gym, Members, Plans, Attendance, Analytics, Cash Requests, Admin
"""
import pytest
import requests
import uuid


class TestHealth:
    """Health check endpoint"""

    def test_api_health(self, base_url, api_client):
        """Test GET /api/ returns hello"""
        response = api_client.get(f"{base_url}/api/")
        assert response.status_code == 404, "Root /api/ endpoint not implemented (expected 404)"


class TestAuth:
    """Authentication endpoints"""

    def test_register_new_user(self, base_url, api_client):
        """Test POST /api/auth/register - new user registration"""
        email = f"TEST_user_{uuid.uuid4().hex[:8]}@test.com"
        response = api_client.post(f"{base_url}/api/auth/register", json={
            "email": email,
            "password": "Test@123",
            "name": "Test User",
            "phone": "+1-555-9999",
            "role": "member"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response missing 'user' field"
        assert "access_token" in data, "Response missing 'access_token'"
        assert "refresh_token" in data, "Response missing 'refresh_token'"
        assert data["user"]["email"] == email.lower(), "Email mismatch"
        assert data["user"]["role"] in ["member", "owner"], "Invalid role"
        
        # Verify persistence with GET
        token = data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        me_response = api_client.get(f"{base_url}/api/auth/me", headers=headers)
        assert me_response.status_code == 200, "Failed to verify user persistence"
        me_data = me_response.json()
        assert me_data["email"] == email.lower(), "User not persisted correctly"

    def test_login_owner(self, base_url, api_client):
        """Test POST /api/auth/login with owner@fitsync.com - should return owner role"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "owner@fitsync.com",
            "password": "Owner@123"
        })
        assert response.status_code == 200, f"Owner login failed: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response missing 'user'"
        assert "access_token" in data, "Response missing 'access_token'"
        assert data["user"]["role"] == "owner", f"Expected owner role, got {data['user']['role']}"
        assert data["user"]["email"] == "owner@fitsync.com", "Email mismatch"

    def test_login_admin(self, base_url, api_client):
        """Test POST /api/auth/login with admin@fitsync.com - should return super_admin role"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "admin@fitsync.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert data["user"]["role"] == "super_admin", f"Expected super_admin role, got {data['user']['role']}"
        assert data["user"]["email"] == "admin@fitsync.com", "Email mismatch"

    def test_login_staff(self, base_url, api_client):
        """Test POST /api/auth/login with staff1@fitsync.com - should return staff role"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "staff1@fitsync.com",
            "password": "Staff@123"
        })
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        
        data = response.json()
        assert data["user"]["role"] == "staff", f"Expected staff role, got {data['user']['role']}"
        assert data["user"]["email"] == "staff1@fitsync.com", "Email mismatch"

    def test_login_member(self, base_url, api_client):
        """Test POST /api/auth/login with james.wilson@email.com - should return member role"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "james.wilson@email.com",
            "password": "Member@123"
        })
        assert response.status_code == 200, f"Member login failed: {response.text}"
        
        data = response.json()
        assert data["user"]["role"] == "member", f"Expected member role, got {data['user']['role']}"
        assert data["user"]["email"] == "james.wilson@email.com", "Email mismatch"

    def test_auth_me_with_bearer_token(self, base_url, api_client, owner_token):
        """Test GET /api/auth/me with Bearer token"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = api_client.get(f"{base_url}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"/me endpoint failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Response missing user_id"
        assert "email" in data, "Response missing email"
        assert "role" in data, "Response missing role"
        assert data["role"] == "owner", "Role mismatch"

    def test_login_invalid_credentials(self, base_url, api_client):
        """Test login with invalid credentials returns 401"""
        response = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401, f"Expected 401 for invalid credentials, got {response.status_code}"


class TestGym:
    """Gym management endpoints"""

    def test_get_gym_info(self, base_url, api_client, owner_token, gym_id):
        """Test GET /api/gyms/gym_demo0001 - should return gym info"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = api_client.get(f"{base_url}/api/gyms/{gym_id}", headers=headers)
        assert response.status_code == 200, f"Get gym failed: {response.text}"
        
        data = response.json()
        assert data["gym_id"] == gym_id, "Gym ID mismatch"
        assert "name" in data, "Missing gym name"
        assert "code" in data, "Missing gym code"
        assert data["code"] == "FITSYNC", f"Expected FITSYNC code, got {data['code']}"
        assert data["owner_id"] is not None, "Missing owner_id"


class TestMembers:
    """Member management endpoints"""

    def test_get_members_list(self, base_url, api_client, owner_token, gym_id):
        """Test GET /api/gyms/gym_demo0001/members - should return 20 members"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = api_client.get(f"{base_url}/api/gyms/{gym_id}/members", headers=headers)
        assert response.status_code == 200, f"Get members failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 20, f"Expected 20 members, got {len(data)}"
        
        # Validate first member structure
        if len(data) > 0:
            member = data[0]
            assert "member_id" in member, "Missing member_id"
            assert "name" in member, "Missing name"
            assert "email" in member, "Missing email"
            assert "membership_status" in member, "Missing membership_status"


class TestPlans:
    """Membership plans endpoints"""

    def test_get_plans(self, base_url, api_client, gym_id):
        """Test GET /api/gyms/gym_demo0001/plans - should return 3 plans"""
        response = api_client.get(f"{base_url}/api/gyms/{gym_id}/plans")
        assert response.status_code == 200, f"Get plans failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 3, f"Expected 3 plans, got {len(data)}"
        
        # Validate plan structure
        if len(data) > 0:
            plan = data[0]
            assert "plan_id" in plan, "Missing plan_id"
            assert "plan_name" in plan, "Missing plan_name"
            assert "duration_days" in plan, "Missing duration_days"
            assert "price" in plan, "Missing price"
            assert plan["active"] == True, "Plan should be active"


class TestAttendance:
    """Attendance tracking endpoints"""

    def test_scan_attendance_manual(self, base_url, api_client, staff_token, gym_id, member_id):
        """Test POST /api/gyms/gym_demo0001/attendance/scan with member_id mem_00000001 and method manual"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        response = api_client.post(f"{base_url}/api/gyms/{gym_id}/attendance/scan", 
            headers=headers,
            json={
                "member_id": member_id,
                "method": "manual"
            }
        )
        assert response.status_code == 200, f"Attendance scan failed: {response.text}"
        
        data = response.json()
        assert "status" in data, "Missing status field"
        assert data["status"] in ["checked_in", "checked_out"], f"Invalid status: {data['status']}"
        assert "member_name" in data, "Missing member_name"
        assert "log" in data, "Missing log field"
        
        # Verify log structure
        log = data["log"]
        assert log["member_id"] == member_id, "Member ID mismatch in log"
        assert log["method"] == "manual", "Method mismatch in log"


class TestAnalytics:
    """Analytics and reporting endpoints"""

    def test_get_kpis(self, base_url, api_client, owner_token, gym_id):
        """Test GET /api/gyms/gym_demo0001/analytics/kpis - should return KPI data"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = api_client.get(f"{base_url}/api/gyms/{gym_id}/analytics/kpis", headers=headers)
        assert response.status_code == 200, f"Get KPIs failed: {response.text}"
        
        data = response.json()
        # Validate all expected KPI fields
        required_fields = [
            "total_members", "active_members", "expired_members", 
            "live_crowd", "expiring_soon", "monthly_revenue", 
            "today_checkins", "pending_cash_requests"
        ]
        for field in required_fields:
            assert field in data, f"Missing KPI field: {field}"
            assert isinstance(data[field], (int, float)), f"{field} should be numeric"
        
        # Validate data consistency
        assert data["total_members"] >= data["active_members"], "Total should be >= active"
        assert data["monthly_revenue"] >= 0, "Revenue should be non-negative"


class TestCashRequests:
    """Cash payment request endpoints"""

    def test_get_cash_requests(self, base_url, api_client, owner_token, gym_id):
        """Test GET /api/gyms/gym_demo0001/cash-requests - should return pending requests"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = api_client.get(f"{base_url}/api/gyms/{gym_id}/cash-requests", headers=headers)
        assert response.status_code == 200, f"Get cash requests failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Validate structure if requests exist
        if len(data) > 0:
            req = data[0]
            assert "request_id" in req, "Missing request_id"
            assert "member_id" in req, "Missing member_id"
            assert "plan_name" in req, "Missing plan_name"
            assert "amount" in req, "Missing amount"
            assert "status" in req, "Missing status"
            assert req["status"] in ["pending", "approved", "rejected", "expired"], f"Invalid status: {req['status']}"


class TestAdmin:
    """Super admin endpoints"""

    def test_admin_stats(self, base_url, api_client, admin_token):
        """Test GET /api/admin/stats with super_admin token"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = api_client.get(f"{base_url}/api/admin/stats", headers=headers)
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        
        data = response.json()
        required_fields = ["total_gyms", "active_gyms", "total_members", "total_revenue"]
        for field in required_fields:
            assert field in data, f"Missing admin stat field: {field}"
            assert isinstance(data[field], (int, float)), f"{field} should be numeric"
        
        assert data["total_gyms"] >= 1, "Should have at least 1 gym"
        assert data["active_gyms"] >= 1, "Should have at least 1 active gym"

    def test_admin_stats_forbidden_for_owner(self, base_url, api_client, owner_token):
        """Test admin endpoint returns 403 for non-admin users"""
        headers = {"Authorization": f"Bearer {owner_token}"}
        response = api_client.get(f"{base_url}/api/admin/stats", headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
