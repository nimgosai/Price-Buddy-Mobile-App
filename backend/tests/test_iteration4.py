"""Iteration 4 - Contract Editing (change-requests), Bill History (scans), Usage Trends (reports/spend)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://utility-contract-hub.emergent.host").rstrip("/")
EMAIL = "e2e_test_1786703401@example.com"
PASSWORD = "Password123!"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/login", json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# --- Contract Editing / change-requests ---

class TestChangeRequests:
    created_id = None

    def test_post_change_request_update_contract(self, headers):
        payload = {
            "message": "TEST_iter4 Please update this contract:\nSupplier -> British Gas Updated",
            "request_type": "update_contract",
            "contract_id": "demo-123",
            "property_id": None,
        }
        r = requests.post(f"{BASE_URL}/api/change-requests", json=payload, headers=headers, timeout=20)
        assert r.status_code == 200, f"POST /api/change-requests failed: {r.status_code} {r.text}"
        data = r.json()
        # Expected {ok, change_request}
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        cr = data.get("change_request") or data.get("request") or data
        assert cr, "No change_request in response"
        rid = cr.get("id") or cr.get("_id") or data.get("id")
        TestChangeRequests.created_id = rid
        print(f"Created change_request id: {rid}")

    def test_get_change_requests_includes_new(self, headers):
        r = requests.get(f"{BASE_URL}/api/change-requests", headers=headers, timeout=20)
        assert r.status_code == 200, f"GET /api/change-requests failed: {r.status_code} {r.text}"
        data = r.json()
        arr = data if isinstance(data, list) else (data.get("items") or data.get("change_requests") or [])
        assert isinstance(arr, list), f"Expected list, got {type(arr)}"
        # our TEST_ message should exist
        found = any(("TEST_iter4" in (it.get("message") or "")) for it in arr)
        assert found, f"Newly-created change_request not found in list. Count={len(arr)}"

    def test_change_requests_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/change-requests", json={"message": "x", "request_type": "update_contract"}, timeout=20)
        assert r.status_code in (401, 403), f"Expected 401/403 unauth, got {r.status_code}"


# --- Bill History / scans ---

class TestScans:
    def test_get_scans_returns_list(self, headers):
        r = requests.get(f"{BASE_URL}/api/scans", headers=headers, timeout=20)
        assert r.status_code == 200, f"GET /api/scans failed: {r.status_code} {r.text}"
        data = r.json()
        # Accept list or {items:[]}
        arr = data if isinstance(data, list) else (data.get("items") or data.get("scans") or [])
        assert isinstance(arr, list), f"Expected list, got {type(arr)}"
        print(f"Scans count for test account: {len(arr)} (expected 0)")


# --- Usage Trends / reports/spend ---

class TestReportsSpend:
    def test_get_reports_spend(self, headers):
        r = requests.get(f"{BASE_URL}/api/reports/spend", headers=headers, timeout=20)
        assert r.status_code == 200, f"GET /api/reports/spend failed: {r.status_code} {r.text}"
        data = r.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        assert "total_annual_spend" in data
        # Monthly may be absent for this account
        has_monthly = any(k in data for k in ("by_month", "monthly", "spend_by_month", "monthly_spend"))
        print(f"reports/spend total={data.get('total_annual_spend')} has_monthly={has_monthly}")
