import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import (
    APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
)
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.complaint import Complaint
from app.models.audit_log import ComplaintStatusHistory
from app.models.department import Department
from app.models.user import User
from app.schemas.complaint import (
    ComplaintResponse, ComplaintCreate, ComplaintUpdate, NearbyComplaintResponse
)
from app.api.deps import get_current_user, require_role
from app.services.duplicate_service import find_potential_duplicate
from app.services.priority_service import calculate_priority_score
from app.services.ai_service import classify_image, generate_embedding, CATEGORY_TO_DEPARTMENT
from app.utils.geo import calculate_haversine_distance
from app.config import settings

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def get_or_route_department(db: Session, category: str) -> Optional[int]:
    dept_name = CATEGORY_TO_DEPARTMENT.get(category, "Road Infrastructure")
    dept = db.query(Department).filter(Department.name.ilike(f"%{dept_name}%")).first()
    return dept.id if dept else None

@router.post("/json", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def create_complaint_json(
    complaint_in: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Filing endpoint for mobile JSON payloads."""
    # Deduplication check
    dup_id, dup_score, is_dup = find_potential_duplicate(
        db=db,
        latitude=complaint_in.latitude,
        longitude=complaint_in.longitude,
        category=complaint_in.category,
    )

    # Priority score calculation
    priority = calculate_priority_score(
        db=db,
        latitude=complaint_in.latitude,
        longitude=complaint_in.longitude,
        severity=complaint_in.severity or "medium",
    )

    # Department auto-assignment
    dept_id = get_or_route_department(db, complaint_in.category)

    complaint = Complaint(
        title=complaint_in.title,
        description=complaint_in.description,
        category=complaint_in.category,
        severity=complaint_in.severity or "medium",
        status="reported",
        image_url=complaint_in.image_url,
        latitude=complaint_in.latitude,
        longitude=complaint_in.longitude,
        address=complaint_in.address,
        citizen_id=current_user.id,
        department_id=dept_id,
        ai_category=complaint_in.ai_category,
        ai_confidence=complaint_in.ai_confidence,
        is_ai_verified=complaint_in.is_ai_verified or False,
        duplicate_of_id=dup_id,
        duplicate_score=dup_score,
        is_potential_duplicate=is_dup,
        priority_score=priority,
    )

    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Initial audit log
    audit = ComplaintStatusHistory(
        complaint_id=complaint.id,
        previous_status=None,
        new_status="reported",
        changed_by_id=current_user.id,
        comment="Complaint registered by citizen with GPS geotag."
    )
    db.add(audit)
    db.commit()
    db.refresh(complaint)
    return complaint

@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint_multipart(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form(...),
    severity: Optional[str] = Form("medium"),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Filing endpoint for mobile app multipart/form-data with photo upload."""
    saved_url = None
    embedding = None
    ai_cat = None
    ai_conf = None

    if file:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        file_ext = os.path.splitext(file.filename)[1] or ".jpg"
        filename = f"{uuid.uuid4()}{file_ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)

        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)
        saved_url = f"/uploads/{filename}"

        # Run AI & Generate Embedding
        ai_res = classify_image(contents)
        ai_cat = ai_res["predicted_category"]
        ai_conf = ai_res["confidence"]
        embedding = generate_embedding(contents)

    # Deduplication check
    dup_id, dup_score, is_dup = find_potential_duplicate(
        db=db,
        latitude=latitude,
        longitude=longitude,
        category=category,
        new_embedding=embedding,
    )

    priority = calculate_priority_score(
        db=db,
        latitude=latitude,
        longitude=longitude,
        severity=severity or "medium",
    )

    dept_id = get_or_route_department(db, category)

    complaint = Complaint(
        title=title,
        description=description,
        category=category,
        severity=severity or "medium",
        status="reported",
        image_url=saved_url,
        latitude=latitude,
        longitude=longitude,
        address=address,
        citizen_id=current_user.id,
        department_id=dept_id,
        ai_category=ai_cat,
        ai_confidence=ai_conf,
        is_ai_verified=True if ai_conf and ai_conf >= 0.8 else False,
        duplicate_of_id=dup_id,
        duplicate_score=dup_score,
        is_potential_duplicate=is_dup,
        priority_score=priority,
        image_embedding=embedding,
    )

    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Initial history record
    audit = ComplaintStatusHistory(
        complaint_id=complaint.id,
        previous_status=None,
        new_status="reported",
        changed_by_id=current_user.id,
        comment="Complaint filed with photo and verified GPS."
    )
    db.add(audit)
    db.commit()
    db.refresh(complaint)
    return complaint

@router.get("/my", response_model=List[ComplaintResponse])
def get_my_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all complaints lodged by current authenticated citizen."""
    return (
        db.query(Complaint)
        .filter(Complaint.citizen_id == current_user.id)
        .order_by(Complaint.created_at.desc())
        .all()
    )

@router.get("/nearby", response_model=List[NearbyComplaintResponse])
def get_nearby_complaints(
    lat: float = Query(..., description="Current Latitude"),
    lng: float = Query(..., description="Current Longitude"),
    radius: float = Query(1000.0, description="Radius in meters"),
    db: Session = Depends(get_db),
):
    """Spatial query returning complaints in vicinity with exact distances."""
    all_active = (
        db.query(Complaint)
        .filter(Complaint.status.notin_(["rejected"]))
        .all()
    )

    results = []
    for c in all_active:
        dist = calculate_haversine_distance(lat, lng, c.latitude, c.longitude)
        if dist <= radius:
            results.append({"complaint": c, "distance_meters": round(dist, 1)})

    results.sort(key=lambda x: x["distance_meters"])
    return results

@router.get("", response_model=List[ComplaintResponse])
def list_complaints(
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    department_id: Optional[int] = None,
    severity: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List complaints with flexible filters for Authority Dashboard."""
    query = db.query(Complaint)
    if category:
        query = query.filter(Complaint.category == category)
    if status_filter:
        query = query.filter(Complaint.status == status_filter)
    if department_id:
        query = query.filter(Complaint.department_id == department_id)
    if severity:
        query = query.filter(Complaint.severity == severity)

    return query.order_by(Complaint.priority_score.desc(), Complaint.created_at.desc()).offset(offset).limit(limit).all()

@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

@router.patch("/{complaint_id}/status", response_model=ComplaintResponse)
def update_complaint_status(
    complaint_id: int,
    status_update: ComplaintUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["officer", "admin"]))
):
    """Update status (reported -> assigned -> in_progress -> resolved)."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    prev = complaint.status
    if status_update.status:
        complaint.status = status_update.status
        if status_update.status == "resolved":
            complaint.resolved_at = datetime.utcnow()

    if status_update.department_id:
        complaint.department_id = status_update.department_id
    if status_update.assigned_officer_id:
        complaint.assigned_officer_id = status_update.assigned_officer_id
    if status_update.severity:
        complaint.severity = status_update.severity

    # Append to timeline
    audit = ComplaintStatusHistory(
        complaint_id=complaint.id,
        previous_status=prev,
        new_status=complaint.status,
        changed_by_id=current_user.id,
        comment=status_update.comment or f"Status transitioned from {prev} to {complaint.status}"
    )
    db.add(audit)
    db.commit()
    db.refresh(complaint)
    return complaint
