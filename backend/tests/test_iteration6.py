"""Backend sanity tests for iteration 6 (splash/landing/push-primer/help/privacy/terms)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://utility-contract-hub.emergent.host").rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def new_user(api):
    """Register a fresh account for this run and return token+user."""
    email = f"e2e_signup2_{int(time.time())}@example.com"
    r = api.post(
        f"{BASE_URL}/api/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": "E2E Two",
            "company_name": "E2E Two Ltd",
            "business_type": "limited_company",
        },
        timeout=20,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == email
    return {"email": email, "token": data["token"], "user": data["user"]}


# -------- Register --------
class TestRegister:
    def test_register_returns_token_and_user(self, new_user):
        assert new_user["token"]
        assert new_user["user"]["id"]
        # defaults per spec
        assert new_user["user"]["push_notifications_enabled"] is False


# -------- Preferences (push primer target) --------
class TestPreferences:
    def test_put_preferences_enables_push(self, api, new_user):
        r = api.put(
            f"{BASE_URL}/api/me/preferences",
            json={"email_notifications_enabled": True, "push_notifications_enabled": True},
            headers={"Authorization": f"Bearer {new_user['token']}"},
            timeout=20,
        )
        assert r.status_code == 200, r.text

        # GET /me to verify persistence
        me = api.get(
            f"{BASE_URL}/api/me",
            headers={"Authorization": f"Bearer {new_user['token']}"},
            timeout=20,
        )
        assert me.status_code == 200
        body = me.json()
        assert body.get("push_notifications_enabled") is True
        assert body.get("email_notifications_enabled") is True

    def test_put_preferences_disable_push(self, api, new_user):
        r = api.put(
            f"{BASE_URL}/api/me/preferences",
            json={"email_notifications_enabled": True, "push_notifications_enabled": False},
            headers={"Authorization": f"Bearer {new_user['token']}"},
            timeout=20,
        )
        assert r.status_code == 200
        me = api.get(
            f"{BASE_URL}/api/me",
            headers={"Authorization": f"Bearer {new_user['token']}"},
            timeout=20,
        ).json()
        assert me.get("push_notifications_enabled") is False


# -------- Regression login (shared test account) --------
class TestLoginRegression:
    def test_shared_login_still_works(self, api):
        r = api.post(
            f"{BASE_URL}/api/login",
            json={"email": "e2e_test_1786703401@example.com", "password": "Password123!"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and "user" in data
