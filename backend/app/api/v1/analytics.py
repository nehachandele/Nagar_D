from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.complaint import Complaint
from app.models.department import Department
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics & GIS"])


@router.get("/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    """Dashboard overview with key metrics."""
    total = db.query(Complaint).count()
    reported = db.query(Complaint).filter(Complaint.status == "reported").count()
    assigned = db.query(Complaint).filter(Complaint.status == "assigned").count()
    in_progress = db.query(Complaint).filter(Complaint.status == "in_progress").count()
    resolved = db.query(Complaint).filter(Complaint.status == "resolved").count()
    rejected = db.query(Complaint).filter(Complaint.status == "rejected").count()
    withdrawn = db.query(Complaint).filter(Complaint.status == "withdrawn").count()
    duplicates = db.query(Complaint).filter(Complaint.is_potential_duplicate == True).count()

    res_rate = round((resolved / total * 100), 1) if total > 0 else 0.0

    # Average resolution time for resolved complaints
    resolved_complaints = (
        db.query(Complaint)
        .filter(Complaint.status == "resolved", Complaint.resolved_at.isnot(None))
        .all()
    )
    if resolved_complaints:
        total_hours = sum(
            (c.resolved_at - c.created_at).total_seconds() / 3600
            for c in resolved_complaints
        )
        avg_resolution_hours = round(total_hours / len(resolved_complaints), 1)
    else:
        avg_resolution_hours = 0.0

    # Total users by role
    total_citizens = db.query(User).filter(User.role == "citizen").count()
    total_officers = db.query(User).filter(User.role == "officer").count()

    return {
        "total_complaints": total,
        "reported": reported,
        "assigned": assigned,
        "in_progress": in_progress,
        "resolved": resolved,
        "rejected": rejected,
        "withdrawn": withdrawn,
        "duplicate_count": duplicates,
        "resolution_rate_percentage": res_rate,
        "avg_resolution_hours": avg_resolution_hours,
        "total_citizens": total_citizens,
        "total_officers": total_officers,
    }


@router.get("/by-category")
def get_category_breakdown(db: Session = Depends(get_db)):
    """Complaint counts grouped by category."""
    stats = (
        db.query(Complaint.category, func.count(Complaint.id))
        .group_by(Complaint.category)
        .all()
    )
    return [{"category": cat, "count": count} for cat, count in stats]


@router.get("/by-status")
def get_status_breakdown(db: Session = Depends(get_db)):
    """Complaint counts grouped by status."""
    stats = (
        db.query(Complaint.status, func.count(Complaint.id))
        .group_by(Complaint.status)
        .all()
    )
    return [{"status": s, "count": count} for s, count in stats]


@router.get("/by-severity")
def get_severity_breakdown(db: Session = Depends(get_db)):
    """Complaint counts grouped by severity."""
    stats = (
        db.query(Complaint.severity, func.count(Complaint.id))
        .group_by(Complaint.severity)
        .all()
    )
    return [{"severity": sev, "count": count} for sev, count in stats]


@router.get("/by-department")
def get_department_breakdown(db: Session = Depends(get_db)):
    """Complaint counts grouped by department with department names."""
    stats = (
        db.query(
            Department.name,
            Department.code,
            func.count(Complaint.id),
        )
        .join(Complaint, Complaint.department_id == Department.id, isouter=True)
        .group_by(Department.id, Department.name, Department.code)
        .all()
    )
    return [
        {"department": name, "code": code, "count": count}
        for name, code, count in stats
    ]


@router.get("/trends")
def get_daily_trends(
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    db: Session = Depends(get_db),
):
    """
    Daily complaint filing trends for the last N days.
    Returns an array of { date, filed_count, resolved_count }.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)

    # All complaints since cutoff
    complaints = (
        db.query(Complaint)
        .filter(Complaint.created_at >= cutoff)
        .all()
    )

    # Build day-by-day map
    day_map: Dict[str, Dict[str, int]] = {}
    for i in range(days):
        day = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
        day_map[day] = {"filed": 0, "resolved": 0}

    for c in complaints:
        filed_day = c.created_at.strftime("%Y-%m-%d")
        if filed_day in day_map:
            day_map[filed_day]["filed"] += 1
        if c.resolved_at:
            res_day = c.resolved_at.strftime("%Y-%m-%d")
            if res_day in day_map:
                day_map[res_day]["resolved"] += 1

    results = [
        {"date": day, "filed_count": data["filed"], "resolved_count": data["resolved"]}
        for day, data in sorted(day_map.items())
    ]
    return results


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


@router.get("/officer-workload")
def get_officer_workload(db: Session = Depends(get_db)):
    """
    Officer workload distribution: counts of assigned/active complaints per officer.
    """
    officers = db.query(User).filter(User.role == "officer").all()
    result = []
    for officer in officers:
        active = (
            db.query(Complaint)
            .filter(
                Complaint.assigned_officer_id == officer.id,
                Complaint.status.in_(["assigned", "in_progress"]),
            )
            .count()
        )
        total = (
            db.query(Complaint)
            .filter(Complaint.assigned_officer_id == officer.id)
            .count()
        )
        resolved = (
            db.query(Complaint)
            .filter(
                Complaint.assigned_officer_id == officer.id,
                Complaint.status == "resolved",
            )
            .count()
        )
        result.append({
            "officer_id": officer.id,
            "officer_name": officer.full_name,
            "department_id": officer.department_id,
            "active_complaints": active,
            "total_assigned": total,
            "resolved": resolved,
        })
    return result
