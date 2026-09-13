import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base
from app.models import Department, User, Complaint, ComplaintStatusHistory

from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.departments import router as departments_router
from app.api.v1.complaints import router as complaints_router
from app.api.v1.ai import router as ai_router
from app.api.v1.analytics import router as analytics_router

# Initialize Database Schema if using SQLite / tables not created
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise AI-Powered Civic Complaint Management, Geospatial Duplicate Detection & Municipal Workflow Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists and mount static route
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Mount API Routers
api_v1_prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(users_router, prefix=api_v1_prefix)
app.include_router(departments_router, prefix=api_v1_prefix)
app.include_router(complaints_router, prefix=api_v1_prefix)
app.include_router(ai_router, prefix=api_v1_prefix)
app.include_router(analytics_router, prefix=api_v1_prefix)

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": "Nagar Drishti Backend API",
        "environment": settings.ENVIRONMENT,
        "ai_mock_mode": settings.USE_MOCK_AI_IN_DEV,
    }

@app.get("/", tags=["System"])
def root():
    return {
        "message": "Welcome to Nagar Drishti API",
        "documentation": "/docs",
        "health": "/health"
    }
