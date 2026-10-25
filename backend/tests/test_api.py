"""
backend/tests/test_api.py
─────────────────────────
Comprehensive integration tests for:
- JWT Authentication (Register, Login, Refresh, Me)
- Protected negotiation and gig write endpoints (401 on missing/invalid token)
- Strict Pydantic input validation (422 on extra fields, inverted budgets, invalid values)
- Rate limiting (429 with Retry-After header)
- Public feed endpoints (GET /gigs, GET /gigs/{id})
- Structured logging & request IDs
"""

import pytest
from fastapi.testclient import TestClient
from main import app, limiter

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Reset Slowapi rate limits between tests."""
    limiter.reset()


def get_authenticated_headers(email="testuser@swipegig.io", password="StrongPassword123!"):
    """Helper to register/login and return Bearer auth header."""
    reg_resp = client.post("/auth/register", json={"email": email, "password": password})
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = client.post("/auth/login", json={"email": email, "password": password})
        token = login_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── 1. Public Gigs Feed ──────────────────────────────────────────────────────

def test_get_gigs():
    response = client.get("/gigs")
    assert response.status_code == 200
    gigs = response.json()
    assert isinstance(gigs, list)
    assert len(gigs) > 0
    first_gig = gigs[0]
    assert "id" in first_gig
    assert "title" in first_gig
    assert "budget" in first_gig
    assert response.headers.get("X-Request-ID") is not None


def test_get_gig_by_id():
    gigs = client.get("/gigs").json()
    first_id = gigs[0]["id"]
    response = client.get(f"/gigs/{first_id}")
    assert response.status_code == 200
    assert response.json()["id"] == first_id

    # 404 for missing gig
    res404 = client.get("/gigs/non-existent-gig-999")
    assert res404.status_code == 404


# ── 2. Authentication Flow ───────────────────────────────────────────────────

def test_auth_register_and_login_and_refresh():
    email = "freelancer@web3.dev"
    password = "SuperSecurePassword123!"

    # 1. Register
    reg_res = client.post("/auth/register", json={"email": email, "password": password})
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert "refresh_token" in reg_data
    assert reg_data["expires_in"] == 900  # 15 minutes

    # 2. Duplicate registration rejected
    dup_res = client.post("/auth/register", json={"email": email, "password": password})
    assert dup_res.status_code == 400

    # 3. Login
    login_res = client.post("/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    access_token = login_res.json()["access_token"]
    refresh_token = login_res.json()["refresh_token"]

    # 4. Login with bad password
    bad_login = client.post("/auth/login", json={"email": email, "password": "WrongPassword"})
    assert bad_login.status_code == 401

    # 5. Access /auth/me with Bearer token
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

    # 6. Exchange refresh token for fresh access token
    ref_res = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_res.status_code == 200
    assert "access_token" in ref_res.json()


# ── 3. Protected Endpoints (401 for Missing or Invalid Token) ─────────────────

def test_protected_endpoints_require_token():
    gigs = client.get("/gigs").json()
    gig_id = gigs[0]["id"]

    req_payload = {
        "gig_id": gig_id,
        "user_id": "test-user-anon",
        "min_budget": 1200.0,
        "max_budget": 2000.0,
    }

    # Missing token -> 401
    res_no_token = client.post("/negotiations", json=req_payload)
    assert res_no_token.status_code == 401

    # Invalid token -> 401
    res_bad_token = client.post(
        "/negotiations",
        json=req_payload,
        headers={"Authorization": "Bearer totally-invalid-token-xyz"},
    )
    assert res_bad_token.status_code == 401

    # Gig creation write endpoint requires token -> 401
    new_gig_payload = {
        "title": "Solidity Audit",
        "category": "Blockchain",
        "description": "Audit an escrow smart contract",
        "budget": 2500.0,
        "currency": "USDC",
        "timeline": "5 days",
        "skills": ["Solidity", "Security"],
    }
    assert client.post("/gigs", json=new_gig_payload).status_code == 401


# ── 4. Negotiation Flow with Authentication ──────────────────────────────────

def test_post_negotiations_success():
    headers = get_authenticated_headers("user1@swipegig.io")
    gigs = client.get("/gigs").json()
    gig_id = gigs[0]["id"]

    req_payload = {
        "gig_id": gig_id,
        "user_id": "test-user-1",
        "min_budget": 1500.0,
        "max_budget": 2200.0,
    }

    response = client.post("/negotiations", json=req_payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert "negotiation_id" in data
    assert data["gig_id"] == gig_id
    assert data["status"] == "pending"


def test_get_negotiation_result():
    headers = get_authenticated_headers("user2@swipegig.io")
    gigs = client.get("/gigs").json()
    gig_id = gigs[0]["id"]

    create_resp = client.post(
        "/negotiations",
        json={
            "gig_id": gig_id,
            "user_id": "test-user-2",
            "min_budget": 1000.0,
            "max_budget": 2000.0,
        },
        headers=headers,
    ).json()

    neg_id = create_resp["negotiation_id"]

    result_resp = client.get(f"/negotiations/{neg_id}")
    assert result_resp.status_code == 200
    res_data = result_resp.json()
    assert res_data["negotiation_id"] == neg_id
    assert res_data["status"] in ["agreed", "no_deal"]


# ── 5. Input Validation (Reject Unknown Fields & Budget Bounds) ───────────────

def test_reject_unknown_fields():
    headers = get_authenticated_headers("val-user@swipegig.io")
    gigs = client.get("/gigs").json()
    gig_id = gigs[0]["id"]

    # Unknown field "hacker_param" in body must return 422
    payload_with_extra = {
        "gig_id": gig_id,
        "user_id": "user-test",
        "min_budget": 1000.0,
        "max_budget": 2000.0,
        "hacker_param": "injection_attempt",
    }
    resp = client.post("/negotiations", json=payload_with_extra, headers=headers)
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert any("extra_forbidden" in str(d) for d in detail)


def test_reject_inverted_budget():
    headers = get_authenticated_headers("inv-user@swipegig.io")
    gigs = client.get("/gigs").json()
    gig_id = gigs[0]["id"]

    # min_budget > max_budget must return 422
    payload_inverted = {
        "gig_id": gig_id,
        "user_id": "user-test",
        "min_budget": 3000.0,
        "max_budget": 1000.0,
    }
    resp = client.post("/negotiations", json=payload_inverted, headers=headers)
    assert resp.status_code == 422


def test_reject_negative_or_zero_budget():
    headers = get_authenticated_headers("neg-user@swipegig.io")
    gigs = client.get("/gigs").json()
    gig_id = gigs[0]["id"]

    # zero or negative budget
    payload_zero = {
        "gig_id": gig_id,
        "user_id": "user-test",
        "min_budget": 0.0,
        "max_budget": 1000.0,
    }
    assert client.post("/negotiations", json=payload_zero, headers=headers).status_code == 422


# ── 6. Rate Limiting (429 with Retry-After header) ───────────────────────────

def test_rate_limiting_auth_endpoints():
    # 5 requests per minute allowed on /auth/login
    email = "ratelimit@swipegig.io"
    password = "RateLimitPassword123!"
    client.post("/auth/register", json={"email": email, "password": password})

    # Execute 5 requests
    for _ in range(5):
        resp = client.post("/auth/login", json={"email": email, "password": password})
        assert resp.status_code in [200, 429]

    # The 6th request within the minute must return 429 Too Many Requests
    exceeded_resp = client.post("/auth/login", json={"email": email, "password": password})
    assert exceeded_resp.status_code == 429
    assert "Retry-After" in exceeded_resp.headers
    retry_after = exceeded_resp.headers["Retry-After"]
    assert int(retry_after) > 0
    assert "Rate limit exceeded" in exceeded_resp.json()["detail"]
