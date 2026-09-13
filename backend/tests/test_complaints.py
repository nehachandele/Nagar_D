import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token():
    email = f"citizen_{uuid.uuid4().hex[:6]}@example.com"
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password@123",
        "full_name": "Complaint Tester",
        "role": "citizen"
    })
    return reg.json()["access_token"]

def test_create_and_fetch_complaint():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Complaint via JSON
    payload = {
        "title": "Severe pothole near college gate",
        "description": "Around 30cm deep hole",
        "category": "Pothole",
        "severity": "high",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "address": "College Gate Road, Pune"
    }

    res = client.post("/api/v1/complaints/json", json=payload, headers=headers)
    assert res.status_code == 201
    comp = res.json()
    assert comp["title"] == payload["title"]
    assert comp["status"] == "reported"
    assert comp["priority_score"] > 0
    comp_id = comp["id"]

    # 2. Get by ID
    get_res = client.get(f"/api/v1/complaints/{comp_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == comp_id

    # 3. Get Nearby
    nearby_res = client.get(f"/api/v1/complaints/nearby?lat=18.5204&lng=73.8567&radius=500")
    assert nearby_res.status_code == 200
    items = nearby_res.json()
    assert len(items) >= 1
    assert items[0]["complaint"]["id"] == comp_id

def test_duplicate_detection_linking():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # First complaint
    c1_res = client.post("/api/v1/complaints/json", json={
        "title": "Pothole near junction",
        "category": "Pothole",
        "severity": "high",
        "latitude": 18.5210,
        "longitude": 73.8570,
        "address": "Junction Point"
    }, headers=headers)
    c1 = c1_res.json()

    # Second complaint right next to it (10 meters away, same category)
    c2_res = client.post("/api/v1/complaints/json", json={
        "title": "Another report of pothole",
        "category": "Pothole",
        "severity": "high",
        "latitude": 18.52108,
        "longitude": 73.85705,
        "address": "Junction Point"
    }, headers=headers)
    c2 = c2_res.json()

    # Second complaint should detect potential duplicate and link c1
    assert c2["is_potential_duplicate"] == True
    assert c2["duplicate_of_id"] == c1["id"]
    assert c2["duplicate_score"] >= 0.8
