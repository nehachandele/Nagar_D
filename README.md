# 🏛️ Nagar Drishti (नगर दृष्टि)
### AI-Powered Civic Issue Management & Spatial Analytics Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL PostGIS](https://img.shields.io/badge/GIS-PostGIS-336791.svg?logo=postgresql&logoColor=white)](https://postgis.net/)
[![YOLOv8](https://img.shields.io/badge/AI-YOLOv8-FF6F00.svg)](https://github.com/ultralytics/ultralytics)
[![React](https://img.shields.io/badge/Web-React%20%2B%20Vite-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org/)
[![React Native](https://img.shields.io/badge/Mobile-React%20Native-45B8AC.svg?logo=react&logoColor=black)](https://reactnative.dev/)

---

## 📖 Overview
**Nagar Drishti** is an enterprise-grade civic complaint reporting, automated artificial intelligence classification, geospatial duplicate detection, and municipal governance resolution platform.

Combines **React Native Mobile + Camera + Real-time GPS + Edge AI + PostGIS Spatial Indexing + Visual Embedding Similarity** to:
1. Automatically detect civic damage category (Potholes, Road Damage, Garbage, Water Leakage, Streetlight fault, Encroachment) directly from the citizen's camera stream.
2. Calculate a combined **Multi-Modal Duplicate Score** ($S_{dup} = w_{img} \cdot S_{img} + w_{geo} \cdot S_{geo}$) to link redundant complaints without losing civic audit trails.
3. Dynamically route complaints to municipal departments (Roads, Sanitation, Water, Electricity, Town Planning).
4. Provide authorities with GIS heatmap analytics, SLA monitoring, and explainable multi-criteria priority scoring:
$$\text{Priority Score} = 0.5 \times \text{Severity} + 0.3 \times \text{Frequency} + 0.2 \times \text{Location Risk}$$

---

## 👥 Team Responsibilities & Viva Allocation

| Team Member | Domain Focus | Primary Modules & Tech Stack | Viva Key Topics |
| :--- | :--- | :--- | :--- |
| **Member 1** | **Mobile + Citizen Experience** | • React Native / Expo, TypeScript<br>• Camera & Image Capture<br>• GPS & Geolocation capture<br>• Complaint Tracking & Timelines<br>• Nearby Issues Feed & Offline cache | Mobile state management, Camera permissions, Geolocation accuracy, API synchronization |
| **Member 2** | **Backend + Database + GIS** | • FastAPI (Python 3.10+)<br>• PostgreSQL + PostGIS<br>• JWT Authentication & RBAC<br>• Spatial queries (Haversine & PostGIS ST_DWithin)<br>• Complaint Lifecycle & SLA Engine | Relational ER design, Spatial indexing (GiST), REST contract design, Query optimization |
| **Member 3** | **AI + Web Dashboard + Analytics** | • YOLOv8 Civic Defect Model<br>• Image Embeddings & Cosine Search (pgvector)<br>• React (Vite) Authority Dashboard<br>• Leaflet / Mapbox GIS Heatmaps<br>• Prioritization & Analytics charts | Model evaluation metrics (mAP, Precision, Recall), Deduplication math, Vector embeddings |

---

## 📂 Repository Structure

```
nagar-drishti/
│
├── mobile/                     # React Native citizen application
│   ├── App.tsx                 # Root application component
│   ├── package.json            # Mobile dependencies (React Native, Expo, Navigation)
│   └── src/
│       ├── navigation/         # Auth & Main Tab Navigation
│       ├── screens/            # Citizen Home, Report Issue, Tracking, Profile, Nearby
│       ├── components/         # AI Confidence Meter, Category Card, Status Badge
│       └── api/                # Backend API integration client
│
├── web/                        # React Authority & Municipal Dashboard
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx             # Live Queue Table, GIS Spatial Tab, KPI Metrics
│       ├── index.css           # Modern civic theme styles
│       └── services/           # Authority API client
│
├── backend/                    # FastAPI High-Performance Backend
│   ├── app/
│   │   ├── api/                # API routes: auth, users, complaints, ai, analytics
│   │   ├── models/             # SQLAlchemy ORM (Users, Complaints, Departments, Audit)
│   │   ├── schemas/            # Pydantic v2 validation models
│   │   ├── services/           # Auth, AI inference, Duplicate detection, Priority
│   │   ├── database.py         # DB connection (PostgreSQL + PostGIS & SQLite dual mode)
│   │   └── main.py             # App entry point, OpenAPI metadata, CORS
│   ├── tests/                  # Pytest unit and integration test suite
│   ├── uploads/                # Media storage for complaint photos
│   ├── Dockerfile
│   └── requirements.txt
│
├── ai/                         # Computer Vision & Machine Learning Subsystem
│   ├── dataset/
│   │   └── dataset.yaml        # YOLOv8 7-class configuration
│   ├── inference/              # Classification & visual feature extraction
│   └── training/               # Model training pipelines with metric reporting
│
├── database/                   # Database Schemas & Migrations
│   ├── schema/
│   │   └── init.sql            # PostGIS + pgvector table schemas & spatial indexes
│   └── seed/
│       └── seed_data.py        # Mock departments, authority accounts, sample complaints
│
├── docs/                       # Technical Documentation & Viva Reference
│   ├── architecture/           # System diagrams, ER diagrams, data pipelines
│   ├── api/                    # Complete OpenAPI & JSON contract specification
│   ├── research/               # Duplicate detection formula and research notes
│   └── github_issues_plan.md   # Complete 20-issue tracking backlog (#1 - #20)
│
├── .gitignore
├── .env.example
├── docker-compose.yml
├── LICENSE
└── README.md
```

---

## 🌿 Git Branch Strategy

```
main (Production / Stable Demo)
  │
  └── develop (Integration Branch)
        │
        ├── feature/mobile-report-issue      (Member 1)
        ├── feature/backend-complaints       (Member 2)
        ├── feature/yolo-training            (Member 3)
        ├── feature/admin-dashboard          (Member 3)
        └── feature/duplicate-detection      (Member 2 & 3)
```

---

## 🚀 Quickstart Guide

### 1. Launch Backend Locally
```bash
# Seed initial departments, users & sample complaints
python database/seed/seed_data.py

# Start FastAPI server on port 8000
uvicorn backend.app.main:app --reload --port 8000
```
- **Interactive Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

### 2. Launch React Native Mobile App
```bash
cd mobile
npm install
npm start
# Press 'a' for Android, 'i' for iOS, or 'w' for Web
```

### 3. Launch Authority Web Dashboard
```bash
cd web
npm install
npm run dev
# Open http://localhost:5173
```

---

## 🔐 Default Demo Accounts (Pre-Seeded)

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Municipal Admin** | `admin@nagardrishti.gov.in` | `Admin@123` | Full access (departments, analytics, officer assignments) |
| **Roads Officer** | `officer.roads@nagardrishti.gov.in` | `Officer@123` | Department complaints, status updates, timeline updates |
| **Sanitation Officer** | `officer.waste@nagardrishti.gov.in` | `Officer@123` | Sanitation/Garbage resolution queue |
| **Citizen User** | `citizen@example.com` | `Citizen@123` | Mobile filing, GPS tracking, personal complaint history |
