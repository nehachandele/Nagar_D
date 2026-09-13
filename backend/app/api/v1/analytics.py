from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.complaint import Complaint
from app.models.department import Department

router = APIRouter(prefix="/analytics", tags=["Analytics & GIS"])

@router.get("/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    total = db.query(Complaint).count()
    reported = db.query(Complaint).filter(Complaint.status == "reported").count()
    assigned = db.query(Complaint).filter(Complaint.status == "assigned").count()
    in_progress = db.query(Complaint).filter(Complaint.status == "in_progress").count()
    resolved = db.query(Complaint).filter(Complaint.status == "resolved").count()
    duplicates = db.query(Complaint).filter(Complaint.is_potential_duplicate == True).count()

    res_rate = round((resolved / total * 100), 1) if total > 0 else 0.0

    return {
        "total_complaints": total,
        "reported": reported,
        "assigned": assigned,
        "in_progress": in_progress,
        "resolved": resolved,
        "duplicate_count": duplicates,
        "resolution_rate_percentage": res_rate,
    }

@router.get("/by-category")
def get_category_breakdown(db: Session = Depends(get_db)):
    stats = (
        db.query(Complaint.category, func.count(Complaint.id))
        .group_by(Complaint.category)
        .all()
    )
    return [{"category": cat, "count": count} for cat, count in stats]

@router.get("/heatmap")
def get_heatmap_points(db: Session = Depends(get_db)):
    """
    Returns array of points for GIS heatmap visualization:
    [{ lat, lng, weight: priority_score / 100 }]
    """
    complaints = db.query(Complaint).filter(Complaint.status != "resolved").all()
    points = []
    for c in complaints:
        weight = round(c.priority_score / 100.0, 2)
        points.append({
            "id": c.id,
            "lat": c.latitude,
            "lng": c.longitude,
            "category": c.category,
            "severity": c.severity,
            "weight": weight
        })
    return points
