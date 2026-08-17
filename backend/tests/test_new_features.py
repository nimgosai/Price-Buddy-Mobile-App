"""
Backend API tests for Iteration 3 features:
- GET /api/reports/spend
- POST /api/quotes/request
- GET /api/support/resources
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
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# --- Reports / Spend ---
class TestReportsSpend:
    def test_reports_spend_shape(self, session, auth_headers):
        r = session.get(f"{API}/reports/spend", headers=auth_headers, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        body = r.json()
        assert isinstance(body, dict)
        # required fields
        for k in ("total_annual_spend", "by_utility", "by_site", "contracts"):
            assert k in body, f"Missing field: {k}"
        assert isinstance(body["by_utility"], list)
        assert isinstance(body["by_site"], list)
        assert isinstance(body["contracts"], list)
        # Test account has no spend → 0
        assert body["total_annual_spend"] in (0, 0.0)

    def test_reports_spend_requires_auth(self, session):
        r = session.get(f"{API}/reports/spend", timeout=30)
        assert r.status_code in (401, 403)


# --- Quotes ---
class TestQuotesRequest:
    def test_quote_request_success(self, session, auth_headers):
        payload = {
            "utility_type": "electricity",
            "message": "TEST_from_pytest — please ignore",
            "contract_id": None,
            "property_id": None,
        }
        r = session.post(f"{API}/quotes/request", headers=auth_headers, json=payload, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        body = r.json()
        assert "quote_request_id" in body
        assert isinstance(body["quote_request_id"], str) and len(body["quote_request_id"]) > 0

    def test_quote_request_gas(self, session, auth_headers):
        payload = {"utility_type": "gas", "message": "TEST_gas", "contract_id": None, "property_id": None}
        r = session.post(f"{API}/quotes/request", headers=auth_headers, json=payload, timeout=30)
        assert r.status_code == 200
        assert "quote_request_id" in r.json()

    def test_quote_request_requires_auth(self, session):
        r = session.post(f"{API}/quotes/request", json={"utility_type": "electricity"}, timeout=30)
        assert r.status_code in (401, 403)


# --- Support resources ---
class TestSupportResources:
    def test_support_resources_shape(self, session, auth_headers):
        r = session.get(f"{API}/support/resources", headers=auth_headers, timeout=30)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"
        body = r.json()
        assert isinstance(body, dict)
        assert "resources" in body
        assert isinstance(body["resources"], list)
        # If populated, check article shape
        if body["resources"]:
            item = body["resources"][0]
            assert "title" in item
            assert "description" in item


# --- Property utilities (Site detail) ---
class TestSiteDetail:
    def test_site_utilities_bogus_id(self, session, auth_headers):
        # Test account has no properties; a bogus id should return 4xx (not crash)
        r = session.get(f"{API}/properties/bogus-nonexistent-id/utilities", headers=auth_headers, timeout=30)
        assert r.status_code in (200, 400, 401, 403, 404, 422), f"Unexpected: {r.status_code} {r.text[:200]}"
