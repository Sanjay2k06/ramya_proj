import pytest
import os
import sys

# Ensure backend path is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from security.auth_helpers import hash_password, verify_password

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_password_hashing():
    pwd = "ForensicSecurityPassword2026!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_auth_registration_and_login(client):
    # Register new user
    reg_resp = client.post("/api/v1/auth/register", json={
        "username": "tester_analyst",
        "email": "tester@forensics.local",
        "password": "StrongPassword2026!",
        "role": "analyst"
    })
    assert reg_resp.status_code in (201, 409)  # 201 or 409 if already seeded

    # Login
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "tester_analyst",
        "password": "StrongPassword2026!"
    })
    assert login_resp.status_code == 200
    data = login_resp.get_json()
    assert "token" in data
    assert data["user"]["username"] == "tester_analyst"

    # Test me endpoint
    token = data["token"]
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.get_json()["user"]["username"] == "tester_analyst"

def test_auth_invalid_credentials(client):
    resp = client.post("/api/v1/auth/login", json={
        "username": "nonexistent_analyst",
        "password": "wrongpassword"
    })
    assert resp.status_code == 401
