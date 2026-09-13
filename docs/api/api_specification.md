# Nagar Drishti REST API Contract Specification
Base URL: `http://localhost:8000/api/v1`

---

## 1. Authentication (`/auth`)

### POST `/auth/register`
Creates a citizen or officer account.
- **Request Body**:
```json
{
  "email": "citizen@example.com",
  "password": "SecurePassword@123",
  "full_name": "Aarav Sharma",
  "phone_number": "+91 98230 11223",
  "role": "citizen"
}
```
- **Response `201 Created`**:
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user_id": 4,
  "email": "citizen@example.com",
  "role": "citizen",
  "full_name": "Aarav Sharma"
}
```

### POST `/auth/login`
- **Request Body**:
```json
{
  "email": "citizen@example.com",
  "password": "SecurePassword@123"
}
```
- **Response `200 OK`**:
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user_id": 4,
  "email": "citizen@example.com",
  "role": "citizen",
  "full_name": "Aarav Sharma"
}
```

### GET `/auth/me`
Requires `Authorization: Bearer <token>`
- **Response `200 OK`**:
```json
{
  "id": 4,
  "email": "citizen@example.com",
  "full_name": "Aarav Sharma",
  "phone_number": "+91 98230 11223",
  "role": "citizen",
  "department_id": null,
  "is_active": true,
  "created_at": "2026-09-13T10:00:00Z"
}
```

---

## 2. Complaints (`/complaints`)

### POST `/complaints/json`
Primary mobile filing endpoint. Requires `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "title": "Large pothole on main road causing accidents",
  "description": "Around 15 inches deep near Shivaji Nagar depot",
  "category": "Pothole",
  "severity": "high",
  "latitude": 18.5314,
  "longitude": 73.8446,
  "address": "Shivaji Nagar Bus Depot, JM Road, Pune",
  "image_url": "https://example.com/uploads/photo.jpg",
  "ai_category": "Pothole",
  "ai_confidence": 0.94,
  "is_ai_verified": true
}
```
- **Response `201 Created`**:
```json
{
  "id": 1024,
  "title": "Large pothole on main road causing accidents",
  "description": "Around 15 inches deep near Shivaji Nagar depot",
  "category": "Pothole",
  "severity": "high",
  "status": "reported",
  "image_url": "https://example.com/uploads/photo.jpg",
  "latitude": 18.5314,
  "longitude": 73.8446,
  "address": "Shivaji Nagar Bus Depot, JM Road, Pune",
  "citizen_id": 4,
  "department_id": 1,
  "ai_category": "Pothole",
  "ai_confidence": 0.94,
  "is_ai_verified": true,
  "duplicate_of_id": null,
  "duplicate_score": 0.0,
  "is_potential_duplicate": false,
  "priority_score": 82.0,
  "created_at": "2026-09-13T10:05:00Z",
  "updated_at": "2026-09-13T10:05:00Z"
}
```

### GET `/complaints/nearby`
Spatial query.
- **Parameters**: `lat=18.5204&lng=73.8567&radius=1000`
- **Response `200 OK`**:
```json
[
  {
    "complaint": {
      "id": 1024,
      "title": "Large pothole on main road",
      "category": "Pothole",
      "status": "reported",
      "latitude": 18.5210,
      "longitude": 73.8570
    },
    "distance_meters": 72.4
  }
]
```

### GET `/complaints/my`
Retrieves citizen's complaint submission history with chronological status timeline.
- **Response `200 OK`**: List of ComplaintResponse objects.

---

## 3. AI Inference (`/ai`)

### POST `/ai/classify`
Multipart form data containing `file` image.
- **Response `200 OK`**:
```json
{
  "predicted_category": "Pothole",
  "confidence": 0.93,
  "is_confident": true,
  "detections": [
    {
      "x_min": 120.0,
      "y_min": 180.0,
      "x_max": 450.0,
      "y_max": 420.0,
      "confidence": 0.93,
      "class_name": "Pothole"
    }
  ],
  "suggested_department": "Road Infrastructure",
  "estimated_severity": "high"
}
```
