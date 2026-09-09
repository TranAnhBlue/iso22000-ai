import uuid
from typing import Optional, Any
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.core.database import Base

class ChangeRequest(Base):
    __tablename__ = "change_requests"

    change_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    change_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # CR-2026-001
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    change_type: Mapped[str] = mapped_column(String(50), nullable=False)  # PRODUCT_NEW, EQUIPMENT_NEW, REGULATION_UPDATE, PROCESS_CHANGE, SUPPLIER_CHANGE, RAW_MATERIAL_CHANGE, OTHER
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Đánh giá tác động ATTP (JSONB: affects_haccp_plan: bool, affects_prp: bool, affected_document_ids: list, food_safety_impact_level: LOW/MEDIUM/HIGH)
    impact_assessment: Mapped[Any] = mapped_column(JSONB, nullable=False)
    
    proposed_by_name: Mapped[str] = mapped_column(String(100), nullable=False)
    proposed_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    
    review_status: Mapped[str] = mapped_column(String(30), default="DRAFT", nullable=False)  # DRAFT, UNDER_REVIEW, APPROVED, REJECTED, IMPLEMENTED
    approved_by_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    approval_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    implementation_plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    implementation_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    verification_result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_by_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    related_ccp_ids: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    related_document_ids: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
