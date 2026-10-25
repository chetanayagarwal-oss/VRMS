"""
backend/tests/test_api.py
─────────────────────────
Integration tests for FastAPI endpoints:
- GET  /gigs
- POST /negotiations
- GET  /negotiations/{id}
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


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


def test_post_negotiations_success():
    # Fetch first gig ID
    gigs = client.get("/gigs").json()
    gig_id = gigs[0]["id"]

    req_payload = {
        "gig_id": gig_id,
        "user_id": "test-user-1",
        "min_budget": 1500.0,
        "max_budget": 2200.0,
    }

    response = client.post("/negotiations", json=req_payload)
    assert response.status_code == 201
    data = response.json()
    assert "negotiation_id" in data
    assert data["gig_id"] == gig_id
    assert data["status"] == "pending"


def test_get_negotiation_result():
    gigs = client.get("/gigs").json()
    gig_id = gigs[0]["id"]

    create_resp = client.post("/negotiations", json={
        "gig_id": gig_id,
        "user_id": "test-user-2",
        "min_budget": 1000.0,
        "max_budget": 2000.0,
    }).json()

    neg_id = create_resp["negotiation_id"]

    # Direct fetch of result triggers sync execution if not yet streamed
    result_resp = client.get(f"/negotiations/{neg_id}")
    assert result_resp.status_code == 200
    res_data = result_resp.json()
    assert res_data["negotiation_id"] == neg_id
    assert res_data["status"] in ["agreed", "no_deal"]
