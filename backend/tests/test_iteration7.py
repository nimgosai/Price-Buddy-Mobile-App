"""Backend sanity tests for iteration 7:
- POST /api/auth/confirm-device {token:'bad'} -> 4xx invalid
- GET  /api/share/badtoken                  -> 4xx invalid
- POST /api/auth/reset-password {token:'bad', new_password:'X'} -> 4xx graceful
- POST /api/auth/forgot-password {email}    -> 200
- Regression: /api/login for shared account   -> 200
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://utility-contract-hub.emergent.host").rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# -------- confirm-device (invalid path only — valid tokens are emailed) --------
class TestConfirmDevice:
    def test_confirm_device_bad_token_returns_4xx(self, api):
        r = api.post(
            f"{BASE_URL}/api/auth/confirm-device",
            json={"token": "bad"},
            timeout=20,
        )
        assert 400 <= r.status_code < 500, f"expected 4xx got {r.status_code} body={r.text}"
        # Should be a JSON body with a message/detail
        try:
            body = r.json()
        except Exception:
            pytest.fail(f"expected JSON body, got: {r.text}")
        # some FastAPI apps use "detail", others "message"
        msg = str(body.get("detail") or body.get("message") or body).lower()
        assert "invalid" in msg or "expired" in msg or "not found" in msg or "confirm" in msg, msg


# -------- share (public, invalid token) --------
class TestShare:
    def test_share_bad_token_returns_4xx(self, api):
        r = api.get(f"{BASE_URL}/api/share/badtoken", timeout=20)
        assert 400 <= r.status_code < 500, f"expected 4xx got {r.status_code} body={r.text}"
        try:
            body = r.json()
        except Exception:
            pytest.fail(f"expected JSON body, got: {r.text}")
        msg = str(body.get("detail") or body.get("message") or body).lower()
        assert "invalid" in msg or "expired" in msg or "not found" in msg or "share" in msg, msg

    def test_share_bad_token_is_public_no_auth_required(self, api):
        # No Authorization header sent; still 4xx (invalid token), not 401
        r = api.get(f"{BASE_URL}/api/share/badtoken", timeout=20)
        assert r.status_code != 401, "share view must be PUBLIC — 401 breaks public access"


# -------- reset-password (invalid token graceful failure) --------
class TestResetPassword:
    def test_reset_password_bad_token_returns_4xx(self, api):
        r = api.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"token": "bad", "new_password": "X"},
            timeout=20,
        )
        assert 400 <= r.status_code < 500, f"expected 4xx got {r.status_code} body={r.text}"
        try:
            body = r.json()
        except Exception:
            pytest.fail(f"expected JSON body, got: {r.text}")
        msg = str(body.get("detail") or body.get("message") or body).lower()
        assert "invalid" in msg or "expired" in msg or "password" in msg or "not found" in msg, msg


# -------- forgot-password (always returns 200 — no user enumeration) --------
class TestForgotPassword:
    def test_forgot_password_returns_200(self, api):
        # Even with a possibly non-existent email, spec expects 200 (privacy-safe)
        r = api.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "e2e_test_1786703401@example.com"},
            timeout=20,
        )
        assert r.status_code == 200, r.text

    def test_forgot_password_unknown_email_still_200(self, api):
        r = api.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "does-not-exist-999999@example.com"},
            timeout=20,
        )
        # Per spec — 200 regardless (do not leak existence)
        assert r.status_code == 200, r.text


# -------- regression: shared account login --------
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
