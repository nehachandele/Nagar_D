from typing import List, Optional
from pydantic import BaseModel

class OverviewMetrics(BaseModel):
    total_complaints: int
    reported: int
    assigned: int
    in_progress: int
    resolved: int
    duplicate_count: int
    resolution_rate_percentage: float

class CategoryStat(BaseModel):
    category: str
    count: int

class HeatmapPoint(BaseModel):
    id: int
    lat: float
    lng: float
    category: str
    severity: str
    weight: float
