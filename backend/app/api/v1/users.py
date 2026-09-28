import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserResponse, UserUpdate, ProfileUpdate, PasswordChange,
    PaginatedUserResponse,
)
from app.api.deps import get_current_user, require_role
from app.services.auth_service import verify_password, get_password_hash

router = APIRouter(prefix="/users", tags=["Users"])


# ─── LIST USERS (paginated, officer/admin only) ───────────────────────
@router.get("", response_model=PaginatedUserResponse)
def list_users(
    role: Optional[str] = Query(None, description="Filter by role: citizen, officer, admin"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _officer=Depends(require_role(["officer", "admin"])),
):
    """List all users with pagination, search, and role filtering."""
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(search_term)) | (User.email.ilike(search_term))
        )

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    items = (
        query.order_by(User.created_at.desc())
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


# ─── GET USER BY ID (officer/admin only) ──────────────────────────────
@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _officer=Depends(require_role(["officer", "admin"])),
):
    """Retrieve a specific user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ─── UPDATE OWN PROFILE (self-service) ────────────────────────────────
@router.patch("/me/profile", response_model=UserResponse)
def update_own_profile(
    update_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Citizens/officers can update their own name and phone number."""
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name
    if update_data.phone_number is not None:
        current_user.phone_number = update_data.phone_number

    db.commit()
    db.refresh(current_user)
    return current_user


# ─── CHANGE OWN PASSWORD ──────────────────────────────────────────────
@router.post("/me/change-password", status_code=status.HTTP_200_OK)
def change_own_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change password — requires current password for verification."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully."}


# ─── ADMIN: UPDATE ANY USER ───────────────────────────────────────────
@router.patch("/{user_id}", response_model=UserResponse)
def admin_update_user(
    user_id: int,
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
):
    """Admin can update any user's role, department, active status, etc."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check email uniqueness if changing email
    if update_data.email is not None and update_data.email != user.email:
        existing = db.query(User).filter(User.email == update_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists.",
            )
        user.email = update_data.email

    if update_data.full_name is not None:
        user.full_name = update_data.full_name
    if update_data.phone_number is not None:
        user.phone_number = update_data.phone_number
    if update_data.role is not None:
        user.role = update_data.role
    if update_data.department_id is not None:
        user.department_id = update_data.department_id
    if update_data.is_active is not None:
        user.is_active = update_data.is_active

    db.commit()
    db.refresh(user)
    return user


# ─── ADMIN: DEACTIVATE USER (soft delete) ─────────────────────────────
@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"])),
):
    """
    Soft-delete: deactivates the user account so they cannot log in.
    Does not hard-delete to preserve FK integrity in complaints/audit logs.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own admin account.",
        )

    user.is_active = False
    db.commit()
    return {"message": f"User '{user.full_name}' (ID: {user.id}) has been deactivated."}
