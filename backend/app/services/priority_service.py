from sqlalchemy.orm import Session
from app.models.complaint import Complaint
from app.utils.geo import calculate_haversine_distance

SEVERITY_WEIGHTS = {
    "critical": 100.0,
    "high": 80.0,
    "medium": 50.0,
    "low": 25.0
}

def calculate_priority_score(
    db: Session,
    latitude: float,
    longitude: float,
    severity: str = "medium",
    cluster_radius: float = 200.0
) -> float:
    """
    Calculates explainable municipal priority score:
      Priority = (Severity * 0.5) + (Frequency * 0.3) + (LocationRisk * 0.2)
    Scale: 0 - 100
    """
    # 1. Severity component (0 - 100)
    sev_score = SEVERITY_WEIGHTS.get(severity.lower(), 50.0)

    # 2. Frequency component: count active issues in 200m radius
    recent_issues = (
        db.query(Complaint)
        .filter(Complaint.status.notin_(["resolved", "rejected"]))
        .all()
    )
    cluster_count = sum(
        1 for issue in recent_issues
        if calculate_haversine_distance(latitude, longitude, issue.latitude, issue.longitude) <= cluster_radius
    )
    # Normalize: 1 issue = 20, 5+ issues = 100
    freq_score = min(100.0, max(20.0, cluster_count * 20.0))

    # 3. Location Risk component (heuristic: central municipal wards have higher risk)
    # Default baseline risk
    loc_risk = 60.0

    priority = round((sev_score * 0.5) + (freq_score * 0.3) + (loc_risk * 0.2), 1)
    return min(100.0, max(0.0, priority))
