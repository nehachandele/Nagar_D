import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.department import Department
from app.models.user import User
from app.models.complaint import Complaint
from app.schemas.department import (
    DepartmentResponse, DepartmentCreate, DepartmentUpdate,
    PaginatedDepartmentResponse,
)
from app.api.deps import require_role

router = APIRouter(prefix="/departments", tags=["Departments"])


# ─── LIST DEPARTMENTS (paginated) ─────────────────────────────────────
@router.get("", response_model=PaginatedDepartmentResponse)
def get_departments(
    search: Optional[str] = Query(None, description="Search by name or code"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List all departments with optional search and pagination."""
    query = db.query(Department)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Department.name.ilike(search_term)) | (Department.code.ilike(search_term))
        )

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    items = (
        query.order_by(Department.name.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# ─── GET DEPARTMENT BY ID ─────────────────────────────────────────────
@router.get("/{dept_id}", response_model=DepartmentResponse)
def get_department(dept_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific department by ID."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")
    return dept


# ─── CREATE DEPARTMENT (admin only) ───────────────────────────────────
@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_in: DepartmentCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    """Create a new municipal department."""
    existing = db.query(Department).filter(
        (Department.name == dept_in.name) | (Department.code == dept_in.code)
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A department with this name or code already exists.",
        )

    dept = Department(**dept_in.dict())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


# ─── UPDATE DEPARTMENT (admin only) ───────────────────────────────────
@router.patch("/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: int,
    update_data: DepartmentUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    """Update an existing department's details."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    # Check uniqueness if name or code is being changed
    if update_data.name is not None and update_data.name != dept.name:
        conflict = db.query(Department).filter(Department.name == update_data.name).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Department name already taken.")
        dept.name = update_data.name

    if update_data.code is not None and update_data.code != dept.code:
        conflict = db.query(Department).filter(Department.code == update_data.code).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Department code already taken.")
        dept.code = update_data.code

    if update_data.description is not None:
        dept.description = update_data.description
    if update_data.contact_email is not None:
        dept.contact_email = update_data.contact_email

    db.commit()
    db.refresh(dept)
    return dept


# ─── DELETE DEPARTMENT (admin only) ───────────────────────────────────
@router.delete("/{dept_id}", status_code=status.HTTP_200_OK)
def delete_department(
    dept_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    """
    Delete a department. Fails if it still has assigned users or complaints.
    Reassign them first before deleting.
    """
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    # Safety check: prevent deleting departments with active references
    user_count = db.query(User).filter(User.department_id == dept_id).count()
    complaint_count = db.query(Complaint).filter(Complaint.department_id == dept_id).count()

    if user_count > 0 or complaint_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot delete department '{dept.name}': "
                f"{user_count} user(s) and {complaint_count} complaint(s) still assigned. "
                f"Reassign them before deleting."
            ),
        )

    db.delete(dept)
    db.commit()
    return {"message": f"Department '{dept.name}' (code: {dept.code}) deleted successfully."}
