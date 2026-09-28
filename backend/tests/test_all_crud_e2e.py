"""
End-to-end test for all new database operations.
Tests every CRUD endpoint added to the Nagar Drishti backend.
"""
import httpx
import sys

BASE = "http://localhost:8000/api/v1"
PASS = 0
FAIL = 0

def test(label, response, expected_status=200):
    global PASS, FAIL
    ok = response.status_code == expected_status
    status = "PASS" if ok else "FAIL"
    if ok:
        PASS += 1
    else:
        FAIL += 1
    print(f"  [{status}] {label} -> {response.status_code} (expected {expected_status})")
    if not ok:
        print(f"         Body: {response.text[:300]}")
    return ok

client = httpx.Client(timeout=15)

# ═══════════════════════════════════════════════════════════════════════
print("\n═══ 1. AUTH: Register & Login ═══")
# ═══════════════════════════════════════════════════════════════════════

# Register a test citizen
r = client.post(f"{BASE}/auth/register", json={
    "email": "testcitizen@test.com",
    "password": "Test@123",
    "full_name": "Test Citizen",
    "phone_number": "+91 99999 00000"
})
test("Register citizen", r, 201)
citizen_token = r.json().get("access_token")
citizen_headers = {"Authorization": f"Bearer {citizen_token}"}

# Login existing admin
r = client.post(f"{BASE}/auth/login", json={
    "email": "admin@nagardrishti.gov.in",
    "password": "Admin@123"
})
test("Login admin", r, 200)
admin_token = r.json().get("access_token")
admin_headers = {"Authorization": f"Bearer {admin_token}"}

# Login existing officer
r = client.post(f"{BASE}/auth/login", json={
    "email": "officer.roads@nagardrishti.gov.in",
    "password": "Officer@123"
})
test("Login officer", r, 200)
officer_token = r.json().get("access_token")
officer_headers = {"Authorization": f"Bearer {officer_token}"}

# Get current user
r = client.get(f"{BASE}/auth/me", headers=citizen_headers)
test("Get /auth/me", r, 200)
citizen_id = r.json().get("id")


# ═══════════════════════════════════════════════════════════════════════
print("\n═══ 2. AUTH: Password Reset Flow ═══")
# ═══════════════════════════════════════════════════════════════════════

r = client.post(f"{BASE}/auth/password-reset/request", json={
    "email": "testcitizen@test.com"
})
test("Request password reset", r, 200)
reset_token = r.json().get("reset_token")

if reset_token:
    r = client.post(f"{BASE}/auth/password-reset/confirm", json={
        "token": reset_token,
        "new_password": "NewPass@123"
    })
    test("Confirm password reset", r, 200)

    # Login with new password
    r = client.post(f"{BASE}/auth/login", json={
        "email": "testcitizen@test.com",
        "password": "NewPass@123"
    })
    test("Login with new password", r, 200)
    citizen_token = r.json().get("access_token")
    citizen_headers = {"Authorization": f"Bearer {citizen_token}"}


# ═══════════════════════════════════════════════════════════════════════
print("\n═══ 3. USERS: Profile & Management ═══")
# ═══════════════════════════════════════════════════════════════════════

# Update own profile
r = client.patch(f"{BASE}/users/me/profile", json={
    "full_name": "Test Citizen Updated",
    "phone_number": "+91 88888 11111"
}, headers=citizen_headers)
test("Update own profile", r, 200)

# Change password
r = client.post(f"{BASE}/users/me/change-password", json={
    "current_password": "NewPass@123",
    "new_password": "Final@123"
}, headers=citizen_headers)
test("Change password", r, 200)

# Login with changed password
r = client.post(f"{BASE}/auth/login", json={
    "email": "testcitizen@test.com",
    "password": "Final@123"
})
test("Login after password change", r, 200)
citizen_token = r.json().get("access_token")
citizen_headers = {"Authorization": f"Bearer {citizen_token}"}

# Admin: List users with pagination
r = client.get(f"{BASE}/users?page=1&page_size=5", headers=admin_headers)
test("List users (paginated)", r, 200)
data = r.json()
assert "items" in data and "total" in data and "total_pages" in data, "Pagination missing"
print(f"         -> total={data['total']}, page={data['page']}, pages={data['total_pages']}")

# Admin: List users with search
r = client.get(f"{BASE}/users?search=Test", headers=admin_headers)
test("List users (search)", r, 200)

# Admin: List users by role
r = client.get(f"{BASE}/users?role=citizen", headers=admin_headers)
test("List users (role filter)", r, 200)

# Admin: Get specific user
r = client.get(f"{BASE}/users/{citizen_id}", headers=admin_headers)
test("Get user by ID", r, 200)

# Admin: Update user
r = client.patch(f"{BASE}/users/{citizen_id}", json={
    "full_name": "Admin Modified Name"
}, headers=admin_headers)
test("Admin update user", r, 200)

# Admin: Deactivate user (soft delete)
# First create a throw-away user to deactivate
r = client.post(f"{BASE}/auth/register", json={
    "email": "throwaway@test.com",
    "password": "Test@123",
    "full_name": "Throwaway User",
})
throwaway_id = r.json().get("user_id")
r = client.delete(f"{BASE}/users/{throwaway_id}", headers=admin_headers)
test("Deactivate user (soft delete)", r, 200)

# Verify deactivated user can't login
r = client.post(f"{BASE}/auth/login", json={
    "email": "throwaway@test.com",
    "password": "Test@123"
})
test("Deactivated user login blocked", r, 400)


# ═══════════════════════════════════════════════════════════════════════
print("\n═══ 4. DEPARTMENTS: Full CRUD ═══")
# ═══════════════════════════════════════════════════════════════════════

# List departments (paginated)
r = client.get(f"{BASE}/departments?page=1&page_size=10")
test("List departments (paginated)", r, 200)
data = r.json()
print(f"         -> total={data['total']}, items={len(data['items'])}")

# Get department by ID
r = client.get(f"{BASE}/departments/1")
test("Get department by ID", r, 200)

# Create department
r = client.post(f"{BASE}/departments", json={
    "name": "Parks & Green Spaces",
    "code": "PARKS",
    "description": "Maintenance of public parks and green areas.",
    "contact_email": "parks@nagardrishti.gov.in"
}, headers=admin_headers)
test("Create department", r, 201)
new_dept_id = r.json().get("id")

# Update department
r = client.patch(f"{BASE}/departments/{new_dept_id}", json={
    "description": "Updated: Maintenance of public parks, playgrounds, and gardens."
}, headers=admin_headers)
test("Update department", r, 200)

# Delete department (should work since no users/complaints assigned)
r = client.delete(f"{BASE}/departments/{new_dept_id}", headers=admin_headers)
test("Delete department", r, 200)

# Try deleting a department with users (should fail with 409)
r = client.delete(f"{BASE}/departments/1", headers=admin_headers)
test("Delete dept with refs (409)", r, 409)


# ═══════════════════════════════════════════════════════════════════════
print("\n═══ 5. COMPLAINTS: Full CRUD ═══")
# ═══════════════════════════════════════════════════════════════════════

# Create complaint (JSON)
r = client.post(f"{BASE}/complaints/json", json={
    "title": "Test: Broken pavement near MG Road",
    "description": "The pavement has cracked badly near the bus stop.",
    "category": "Road Damage",
    "severity": "high",
    "latitude": 18.5204,
    "longitude": 73.8567,
    "address": "MG Road Bus Stop, Pune"
}, headers=citizen_headers)
test("Create complaint (JSON)", r, 201)
new_complaint_id = r.json().get("id")

# List complaints (paginated with filters)
r = client.get(f"{BASE}/complaints?page=1&page_size=5&sort_by=priority")
test("List complaints (paginated)", r, 200)
data = r.json()
assert "items" in data and "total_pages" in data
print(f"         -> total={data['total']}, page={data['page']}, pages={data['total_pages']}")

# Search complaints
r = client.get(f"{BASE}/complaints?search=Broken")
test("Search complaints", r, 200)

# Filter by status
r = client.get(f"{BASE}/complaints?status=reported")
test("Filter by status", r, 200)

# Get my complaints
r = client.get(f"{BASE}/complaints/my", headers=citizen_headers)
test("Get my complaints", r, 200)

# Get complaint by ID
r = client.get(f"{BASE}/complaints/{new_complaint_id}")
test("Get complaint by ID", r, 200)

# Get complaint history (dedicated endpoint)
r = client.get(f"{BASE}/complaints/{new_complaint_id}/history")
test("Get complaint history", r, 200)
history = r.json()
print(f"         -> {len(history)} history entries")

# Citizen: Edit own complaint
r = client.put(f"{BASE}/complaints/{new_complaint_id}", json={
    "title": "Updated: Severely broken pavement near MG Road",
    "description": "Updated description with more details about the damage.",
    "severity": "critical"
}, headers=citizen_headers)
test("Citizen edit complaint", r, 200)

# Officer: Update status
r = client.patch(f"{BASE}/complaints/{new_complaint_id}/status", json={
    "status": "assigned",
    "comment": "Assigned to road maintenance division."
}, headers=officer_headers)
test("Officer update status", r, 200)

# Citizen should NOT be able to edit after assignment
r = client.put(f"{BASE}/complaints/{new_complaint_id}", json={
    "title": "Should not be allowed"
}, headers=citizen_headers)
test("Citizen edit after assignment (blocked)", r, 400)

# Officer: Move to in_progress
r = client.patch(f"{BASE}/complaints/{new_complaint_id}/status", json={
    "status": "in_progress",
    "comment": "Repair crew dispatched."
}, headers=officer_headers)
test("Officer -> in_progress", r, 200)

# Officer: Resolve
r = client.patch(f"{BASE}/complaints/{new_complaint_id}/status", json={
    "status": "resolved",
    "comment": "Pavement repaired successfully."
}, headers=officer_headers)
test("Officer -> resolved", r, 200)

# Check history again (should have multiple entries now)
r = client.get(f"{BASE}/complaints/{new_complaint_id}/history")
test("History after transitions", r, 200)
print(f"         -> {len(r.json())} history entries after full lifecycle")

# Create another complaint for withdraw test
r = client.post(f"{BASE}/complaints/json", json={
    "title": "Test: Withdraw this complaint",
    "description": "This will be withdrawn.",
    "category": "Pothole",
    "severity": "low",
    "latitude": 18.52,
    "longitude": 73.85,
}, headers=citizen_headers)
withdraw_id = r.json().get("id")

# Citizen: Withdraw complaint
r = client.delete(f"{BASE}/complaints/{withdraw_id}", headers=citizen_headers)
test("Citizen withdraw complaint", r, 200)

# Admin: Hard delete
r = client.post(f"{BASE}/complaints/json", json={
    "title": "Test: Admin will delete this",
    "description": "For admin delete test.",
    "category": "Other",
    "severity": "low",
    "latitude": 18.53,
    "longitude": 73.84,
}, headers=citizen_headers)
delete_id = r.json().get("id")

r = client.delete(f"{BASE}/complaints/{delete_id}", headers=admin_headers)
test("Admin hard delete complaint", r, 200)

# Verify deleted
r = client.get(f"{BASE}/complaints/{delete_id}")
test("Verify hard delete (404)", r, 404)


# ═══════════════════════════════════════════════════════════════════════
print("\n═══ 6. ANALYTICS: All Endpoints ═══")
# ═══════════════════════════════════════════════════════════════════════

r = client.get(f"{BASE}/analytics/overview")
test("Analytics overview", r, 200)
print(f"         -> {r.json()}")

r = client.get(f"{BASE}/analytics/by-category")
test("Analytics by-category", r, 200)

r = client.get(f"{BASE}/analytics/by-status")
test("Analytics by-status", r, 200)

r = client.get(f"{BASE}/analytics/by-severity")
test("Analytics by-severity", r, 200)

r = client.get(f"{BASE}/analytics/by-department")
test("Analytics by-department", r, 200)

r = client.get(f"{BASE}/analytics/trends?days=7")
test("Analytics trends (7 days)", r, 200)

r = client.get(f"{BASE}/analytics/heatmap")
test("Analytics heatmap", r, 200)

r = client.get(f"{BASE}/analytics/officer-workload")
test("Analytics officer workload", r, 200)


# ═══════════════════════════════════════════════════════════════════════
print("\n═══ 7. NEARBY (Spatial Query) ═══")
# ═══════════════════════════════════════════════════════════════════════

r = client.get(f"{BASE}/complaints/nearby?lat=18.52&lng=73.85&radius=5000")
test("Nearby complaints", r, 200)
print(f"         -> {len(r.json())} complaints within 5km")


# ═══════════════════════════════════════════════════════════════════════
print(f"\n{'='*60}")
print(f"  RESULTS: {PASS} PASSED, {FAIL} FAILED out of {PASS+FAIL} tests")
print(f"{'='*60}")

if FAIL > 0:
    sys.exit(1)
