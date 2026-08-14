"""
Backend API tests for Utility Contract Hub (live external backend).
Covers: login, /me, dashboard/overview, renewals/urgent, my/audits-in-progress.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://utility-contract-hub.emergent.host").rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "e2e_test_1786703401@example.com"
PASSWORD = "Password123!"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    r = session.post(f"{API}/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data, f"No token in response: {data}"
    assert "user" in data
    assert data["user"].get("email", "").lower() == EMAIL.lower()
    return data["token"]


# --- Auth ---
class TestAuth:
    def test_login_success(self, session):
        r = session.post(f"{API}/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body.get("token"), str) and len(body["token"]) > 10
        assert body.get("user", {}).get("email", "").lower() == EMAIL.lower()

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/login", json={"email": EMAIL, "password": "wrong_password_xyz"}, timeout=30)
        assert r.status_code in (400, 401, 403), f"Expected auth error, got {r.status_code}"

    def test_login_missing_fields(self, session):
        r = session.post(f"{API}/login", json={"email": EMAIL}, timeout=30)
        assert r.status_code in (400, 422)

    def test_me_requires_auth(self, session):
        r = session.get(f"{API}/me", timeout=30)
        assert r.status_code in (401, 403)

    def test_me_with_token(self, session, auth_token):
        r = session.get(f"{API}/me", headers={"Authorization": f"Bearer {auth_token}"}, timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert body.get("email", "").lower() == EMAIL.lower()
        assert "id" in body


# --- Dashboard endpoints ---
class TestDashboardEndpoints:
    def test_dashboard_overview(self, session, auth_token):
        r = session.get(f"{API}/dashboard/overview", headers={"Authorization": f"Bearer {auth_token}"}, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        body = r.json()
        # Expected structure per frontend Overview type
        assert "total_contracts" in body
        assert isinstance(body.get("properties", []), list)
        # Test account has no contracts (empty state)
        assert body.get("total_contracts", 0) == 0

    def test_renewals_urgent(self, session, auth_token):
        r = session.get(f"{API}/renewals/urgent", headers={"Authorization": f"Bearer {auth_token}"}, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        body = r.json()
        # Frontend expects { items: [...] }
        assert isinstance(body, dict)
        assert "items" in body
        assert isinstance(body["items"], list)

    def test_audits_in_progress(self, session, auth_token):
        r = session.get(f"{API}/my/audits-in-progress", headers={"Authorization": f"Bearer {auth_token}"}, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        body = r.json()
        # Frontend expects array
        assert isinstance(body, list)

    def test_dashboard_requires_auth(self, session):
        r = session.get(f"{API}/dashboard/overview", timeout=30)
        assert r.status_code in (401, 403)
