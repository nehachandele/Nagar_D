from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import Token, LoginRequest, RegisterRequest
from app.schemas.user import UserResponse, PasswordResetRequest, PasswordResetConfirm
from app.services.auth_service import (
    verify_password, get_password_hash, create_access_token,
    create_password_reset_token, verify_password_reset_token,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address is already registered."
        )

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone_number=user_in.phone_number,
        role=user_in.role or "citizen",
        department_id=user_in.department_id,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
    }

@router.post("/login", response_model=Token)
def login_json(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is deactivated.")

    token = create_access_token(subject=user.id, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
    }

@router.post("/login/form", response_model=Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )
    token = create_access_token(subject=user.id, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
    }

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


# ─── PASSWORD RESET FLOW ──────────────────────────────────────────────

@router.post("/password-reset/request", status_code=status.HTTP_200_OK)
def request_password_reset(
    payload: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    """
    Request a password reset token.
    In production, this token would be emailed to the user.
    For development, the token is returned directly in the response.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Return success even if user not found to prevent email enumeration
        return {
            "message": "If a user with that email exists, a reset token has been generated.",
            "reset_token": None,
        }

    token = create_password_reset_token(user.email)

    # In production: send email with token/link here
    # For dev/demo: return token directly
    return {
        "message": "Password reset token generated. In production, this would be emailed.",
        "reset_token": token,
    }


@router.post("/password-reset/confirm", status_code=status.HTTP_200_OK)
def confirm_password_reset(
    payload: PasswordResetConfirm,
    db: Session = Depends(get_db),
):
    """
    Confirm password reset using the token received via email (or API in dev).
    Sets a new password for the user.
    """
    email = verify_password_reset_token(payload.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token.",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()

    return {"message": "Password has been reset successfully. You can now log in with your new password."}

