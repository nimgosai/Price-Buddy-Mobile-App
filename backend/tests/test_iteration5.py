"""Iteration 5 backend tests - Password Reset, Sign-Up, Multi-Quote, News"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://utility-contract-hub.emergent.host").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Password reset ----------
def test_forgot_password_returns_ok(session):
    r = session.post(f"{API}/auth/forgot-password", json={"email": "e2e_test_1786703401@example.com"})
    assert r.status_code == 200, r.text
    body = r.json()
    # spec: always ok
    assert body.get("ok") is True or "ok" in body or body.get("status") == "ok"


def test_forgot_password_unknown_email_also_ok(session):
    r = session.post(f"{API}/auth/forgot-password", json={"email": "nope_xyz_zzz@example.com"})
    assert r.status_code == 200, r.text


def test_reset_password_bogus_token_graceful_4xx(session):
    r = session.post(f"{API}/auth/reset-password", json={"token": "bogus", "new_password": "X" * 10})
    assert 400 <= r.status_code < 500, f"expected 4xx got {r.status_code}: {r.text}"


# ---------- Sign-Up ----------
@pytest.fixture(scope="module")
def signup_user(session):
    ts = int(time.time())
    payload = {
        "email": f"e2e_signup_{ts}@example.com",
        "password": "Password123!",
        "full_name": "E2E Test",
        "company_name": "Iter5 Ltd",
        "business_type": "limited_company",
    }
    r = session.post(f"{API}/register", json=payload)
    assert r.status_code in (200, 201), r.text
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == payload["email"]
    return {"payload": payload, "token": data["token"], "user": data["user"]}


def test_register_returns_token_and_user(signup_user):
    assert signup_user["token"]
    assert signup_user["user"]["email"].endswith("@example.com")


def test_register_me_authenticated(session, signup_user):
    r = session.get(f"{API}/me", headers={"Authorization": f"Bearer {signup_user['token']}"})
    assert r.status_code == 200, r.text
    assert r.json()["email"] == signup_user["payload"]["email"]


# ---------- Multi-Quote ----------
def test_quotes_multi_electric_water(session, signup_user):
    body = {
        "selected_services": ["electric", "water"],
        "contact": {"name": "E2E Test", "email": signup_user["payload"]["email"], "phone": "07123456789"},
        "address": {"line1": "1 Test Street", "city": "London", "postcode": "SW1A 1AA"},
        "energy_meters": [{"utility": "electric", "meter_number": "1234567890123"}],
        "water_supplier": "Thames Water",
    }
    r = session.post(
        f"{API}/quotes/multi",
        json=body,
        headers={"Authorization": f"Bearer {signup_user['token']}"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "quote_request_id" in data and data["quote_request_id"]


# ---------- News ----------
def test_news_public(session):
    r = session.get(f"{API}/news")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "news" in data
    assert isinstance(data["news"], list)
