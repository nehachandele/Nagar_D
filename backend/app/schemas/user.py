from datetime import datetime
from typing import Optional, List, Generic, TypeVar
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None
    role: str = "citizen"
    department_id: Optional[int] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    """Admin-level user update (can change role, department, active status)."""
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None

class ProfileUpdate(BaseModel):
    """Self-service profile update for authenticated users."""
    full_name: Optional[str] = Field(None, max_length=150)
    phone_number: Optional[str] = Field(None, max_length=20)

class PasswordChange(BaseModel):
    """Change password (requires current password verification)."""
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=72)

class PasswordResetRequest(BaseModel):
    """Request a password reset token by email."""
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    """Confirm password reset using token."""
    token: str
    new_password: str = Field(..., min_length=6, max_length=72)

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class PaginatedUserResponse(BaseModel):
    """Paginated list of users with metadata."""
    items: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
