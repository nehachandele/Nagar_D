import os
import math
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
    ComplaintResponse, ComplaintCreate, ComplaintUpdate, ComplaintEditByUser,
    NearbyComplaintResponse, StatusHistoryResponse, PaginatedComplaintResponse,
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


# ═══════════════════════════════════════════════════════════════════════
# CREATE OPERATIONS
# ═══════════════════════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════════════════════
# READ OPERATIONS
# ═══════════════════════════════════════════════════════════════════════

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

@router.get("", response_model=PaginatedComplaintResponse)
def list_complaints(
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    department_id: Optional[int] = None,
    severity: Optional[str] = None,
    citizen_id: Optional[int] = None,
    assigned_officer_id: Optional[int] = None,
    is_duplicate: Optional[bool] = None,
    search: Optional[str] = Query(None, description="Search in title or description"),
    sort_by: Optional[str] = Query("priority", description="Sort by: priority, date, severity"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List complaints with flexible filters, search, and pagination for Authority Dashboard."""
    query = db.query(Complaint)

    if category:
        query = query.filter(Complaint.category == category)
    if status_filter:
        query = query.filter(Complaint.status == status_filter)
    if department_id:
        query = query.filter(Complaint.department_id == department_id)
    if severity:
        query = query.filter(Complaint.severity == severity)
    if citizen_id:
        query = query.filter(Complaint.citizen_id == citizen_id)
    if assigned_officer_id:
        query = query.filter(Complaint.assigned_officer_id == assigned_officer_id)
    if is_duplicate is not None:
        query = query.filter(Complaint.is_potential_duplicate == is_duplicate)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Complaint.title.ilike(search_term)) | (Complaint.description.ilike(search_term))
        )

    # Sorting
    if sort_by == "date":
        query = query.order_by(Complaint.created_at.desc())
    elif sort_by == "severity":
        query = query.order_by(Complaint.severity.desc(), Complaint.created_at.desc())
    else:  # default: priority
        query = query.order_by(Complaint.priority_score.desc(), Complaint.created_at.desc())

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }

@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    """Get a specific complaint by ID with full details and status history."""
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint

@router.get("/{complaint_id}/history", response_model=List[StatusHistoryResponse])
def get_complaint_history(
    complaint_id: int,
    db: Session = Depends(get_db),
):
    """
    Dedicated endpoint returning the complete status transition timeline
    for a specific complaint, ordered chronologically (newest first).
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    history = (
        db.query(ComplaintStatusHistory)
        .filter(ComplaintStatusHistory.complaint_id == complaint_id)
        .order_by(ComplaintStatusHistory.created_at.desc())
        .all()
    )
    return history


# ═══════════════════════════════════════════════════════════════════════
# UPDATE OPERATIONS
# ═══════════════════════════════════════════════════════════════════════

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


@router.put("/{complaint_id}", response_model=ComplaintResponse)
def edit_complaint(
    complaint_id: int,
    edit_data: ComplaintEditByUser,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Citizen self-edit: update complaint details.
    Only allowed while the complaint is still in 'reported' status.
    Only the citizen who filed it can edit.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Ownership check
    if complaint.citizen_id != current_user.id and current_user.role not in ("officer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own complaints.",
        )

    # Status check: only editable while still in 'reported' status
    if complaint.status != "reported" and current_user.role not in ("officer", "admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Complaint is in '{complaint.status}' status and can no longer be edited by citizens. "
                   f"Only complaints in 'reported' status can be modified.",
        )

    # Apply edits
    if edit_data.title is not None:
        complaint.title = edit_data.title
    if edit_data.description is not None:
        complaint.description = edit_data.description
    if edit_data.category is not None:
        complaint.category = edit_data.category
        # Re-route department on category change
        complaint.department_id = get_or_route_department(db, edit_data.category)
    if edit_data.severity is not None:
        complaint.severity = edit_data.severity
    if edit_data.address is not None:
        complaint.address = edit_data.address
    if edit_data.latitude is not None:
        complaint.latitude = edit_data.latitude
    if edit_data.longitude is not None:
        complaint.longitude = edit_data.longitude

    # Re-calculate priority if location or severity changed
    if any([edit_data.latitude, edit_data.longitude, edit_data.severity]):
        complaint.priority_score = calculate_priority_score(
            db=db,
            latitude=complaint.latitude,
            longitude=complaint.longitude,
            severity=complaint.severity,
        )

    complaint.updated_at = datetime.utcnow()

    # Audit trail for edit
    audit = ComplaintStatusHistory(
        complaint_id=complaint.id,
        previous_status=complaint.status,
        new_status=complaint.status,
        changed_by_id=current_user.id,
        comment="Complaint details updated by citizen.",
    )
    db.add(audit)
    db.commit()
    db.refresh(complaint)
    return complaint


# ═══════════════════════════════════════════════════════════════════════
# DELETE OPERATIONS
# ═══════════════════════════════════════════════════════════════════════

@router.delete("/{complaint_id}", status_code=status.HTTP_200_OK)
def withdraw_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Withdraw/delete a complaint.
    - Citizens can withdraw their own complaints only if status is 'reported'.
    - Officers/Admins can reject any complaint (soft transition to 'rejected').
    - Admins can hard-delete any complaint.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Admin hard delete
    if current_user.role == "admin":
        # Delete all related status history first
        db.query(ComplaintStatusHistory).filter(
            ComplaintStatusHistory.complaint_id == complaint_id
        ).delete()
        db.delete(complaint)
        db.commit()
        return {"message": f"Complaint #{complaint_id} permanently deleted by admin."}

    # Officer can reject
    if current_user.role == "officer":
        prev = complaint.status
        complaint.status = "rejected"
        audit = ComplaintStatusHistory(
            complaint_id=complaint.id,
            previous_status=prev,
            new_status="rejected",
            changed_by_id=current_user.id,
            comment="Complaint rejected by officer.",
        )
        db.add(audit)
        db.commit()
        return {"message": f"Complaint #{complaint_id} has been rejected."}

    # Citizen can only withdraw their own complaints in 'reported' status
    if complaint.citizen_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only withdraw your own complaints.",
        )
    if complaint.status != "reported":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot withdraw complaint in '{complaint.status}' status. "
                   f"Only complaints in 'reported' status can be withdrawn.",
        )

    prev = complaint.status
    complaint.status = "withdrawn"
    audit = ComplaintStatusHistory(
        complaint_id=complaint.id,
        previous_status=prev,
        new_status="withdrawn",
        changed_by_id=current_user.id,
        comment="Complaint withdrawn by citizen.",
    )
    db.add(audit)
    db.commit()
    return {"message": f"Complaint #{complaint_id} has been withdrawn."}
