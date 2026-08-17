"""Iteration 8 backend sanity — Contracts Overview + Onboarding invalid token.

Runs against the live external backend.
"""
import os
import pytest
import requests

BASE_URL = "https://utility-contract-hub.emergent.host"
EMAIL = "e2e_test_1786703401@example.com"
PASSWORD = "Password123!"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def token(session):
    r = session.post(f"{BASE_URL}/api/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data
    return data["token"]


# Contracts Overview: authenticated dashboard overview supplies all_contracts
class TestDashboardOverview:
    def test_dashboard_overview_returns_all_contracts_array(self, session, token):
        r = session.get(
            f"{BASE_URL}/api/dashboard/overview",
            headers={"Authorization": f"Bearer {token}"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        # Contract array must be present (empty for test account)
        assert "all_contracts" in data, f"missing all_contracts: {list(data.keys())}"
        assert isinstance(data["all_contracts"], list)
        # Test account has no contracts
        assert data.get("total_contracts", 0) == 0

    def test_dashboard_overview_requires_auth(self, session):
        r = session.get(f"{BASE_URL}/api/dashboard/overview", timeout=30)
        assert r.status_code in (401, 403)


# Onboarding invalid token: PUBLIC endpoint returns 404 gracefully (no 401)
class TestOnboardingInvalidToken:
    def test_invalid_token_returns_404(self, session):
        r = requests.get(f"{BASE_URL}/api/onboarding/badtoken", timeout=30)
        assert r.status_code == 404, f"expected 404 got {r.status_code}: {r.text}"

    def test_invalid_token_is_public_no_auth_required(self, session):
        # Confirm it's not an auth wall — should be 404, not 401
        r = requests.get(f"{BASE_URL}/api/onboarding/definitely-invalid-xyz", timeout=30)
        assert r.status_code != 401
        assert r.status_code == 404


# Regression: shared account login continues to work
class TestLoginRegression:
    def test_login_success(self, session):
        r = session.post(
            f"{BASE_URL}/api/login",
            json={"email": EMAIL, "password": PASSWORD},
            timeout=30,
        )
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and "user" in data
        assert data["user"]["email"] == EMAIL
