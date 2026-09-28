from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ComplaintBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    category: str = Field(..., description="Pothole, Garbage, Road Damage, Water Leakage, Broken Streetlight, Encroachment, Other")
    severity: Optional[str] = "medium"
    latitude: float
    longitude: float
    address: Optional[str] = None
    image_url: Optional[str] = None

class ComplaintCreate(ComplaintBase):
    ai_category: Optional[str] = None
    ai_confidence: Optional[float] = None
    is_ai_verified: Optional[bool] = False

class ComplaintUpdate(BaseModel):
    """Officer/Admin status transition and reassignment."""
    status: Optional[str] = None
    department_id: Optional[int] = None
    assigned_officer_id: Optional[int] = None
    severity: Optional[str] = None
    comment: Optional[str] = None

class ComplaintEditByUser(BaseModel):
    """Citizen self-edit — allowed only while status is 'reported'."""
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class StatusHistoryResponse(BaseModel):
    id: int
    previous_status: Optional[str] = None
    new_status: str
    changed_by_id: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ComplaintResponse(ComplaintBase):
    id: int
    status: str
    citizen_id: int
    department_id: Optional[int] = None
    assigned_officer_id: Optional[int] = None
    ai_category: Optional[str] = None
    ai_confidence: Optional[float] = None
    is_ai_verified: bool
    duplicate_of_id: Optional[int] = None
    duplicate_score: float
    is_potential_duplicate: bool
    priority_score: float
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    status_history: Optional[List[StatusHistoryResponse]] = []

    class Config:
        from_attributes = True

class NearbyComplaintResponse(BaseModel):
    complaint: ComplaintResponse
    distance_meters: float

class PaginatedComplaintResponse(BaseModel):
    """Paginated list of complaints with metadata."""
    items: List[ComplaintResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

