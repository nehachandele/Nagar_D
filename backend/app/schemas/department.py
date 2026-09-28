from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class DepartmentBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    contact_email: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    """Update department details (admin only)."""
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None

class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class PaginatedDepartmentResponse(BaseModel):
    """Paginated list of departments with metadata."""
    items: List[DepartmentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

