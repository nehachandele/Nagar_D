import json
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
)
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import relationship
from app.database import Base
from app.config import settings

is_postgres = not settings.DATABASE_URL.startswith("sqlite")

if is_postgres:
    try:
        from geoalchemy2 import Geometry
        PointGeometryType = Geometry(geometry_type="POINT", srid=4326)
    except ImportError:
        PointGeometryType = Text
    try:
        from pgvector.sqlalchemy import Vector
        EmbeddingVectorType = Vector(512)
    except ImportError:
        EmbeddingVectorType = Text
else:
    class VectorFallback(TypeDecorator):
        impl = Text
        cache_ok = True

        def process_bind_param(self, value, dialect):
            if value is not None and isinstance(value, (list, tuple)):
                return json.dumps(value)
            return value

        def process_result_value(self, value, dialect):
            if value is not None and isinstance(value, str):
                try:
                    return json.loads(value)
                except Exception:
                    return value
            return value

    PointGeometryType = Text
    EmbeddingVectorType = VectorFallback

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, index=True) 
    severity = Column(String(20), default="medium")
    status = Column(String(30), default="reported", index=True)
    image_url = Column(String(500), nullable=True)
    
    # Coordinates & GIS
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location = Column(PointGeometryType, nullable=True)
    address = Column(Text, nullable=True)

    # Citizen & Municipal Officer Associations
    citizen_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_officer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # AI Detection Subsystem fields
    ai_category = Column(String(50), nullable=True)
    ai_confidence = Column(Float, nullable=True)
    is_ai_verified = Column(Boolean, default=False)

    # Deduplication Subsystem fields
    duplicate_of_id = Column(Integer, ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True)
    duplicate_score = Column(Float, default=0.0)
    is_potential_duplicate = Column(Boolean, default=False)

    # Priority Subsystem score (0 to 100)
    priority_score = Column(Float, default=50.0)

    # Visual Feature Embeddings (512-dim)
    image_embedding = Column(EmbeddingVectorType, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    citizen = relationship("User", back_populates="complaints", foreign_keys=[citizen_id])
    department = relationship("Department", back_populates="complaints")
    assigned_officer = relationship("User", back_populates="assigned_complaints", foreign_keys=[assigned_officer_id])
    
    status_history = relationship(
        "ComplaintStatusHistory", 
        back_populates="complaint", 
        cascade="all, delete-orphan",
        order_by="desc(ComplaintStatusHistory.created_at)"
    )
    duplicates = relationship("Complaint", backref="original_complaint", remote_side=[id])
