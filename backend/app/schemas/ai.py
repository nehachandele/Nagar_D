from typing import List
from pydantic import BaseModel

class BoundingBox(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    confidence: float
    class_name: str

class AIClassificationResponse(BaseModel):
    predicted_category: str
    confidence: float
    is_confident: bool
    detections: List[BoundingBox] = []
    suggested_department: str
    estimated_severity: str

class AIEmbeddingResponse(BaseModel):
    embedding_dimension: int
    vector: List[float]
