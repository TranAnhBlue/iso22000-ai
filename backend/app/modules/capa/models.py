from datetime import date, datetime, timezone
from typing import Any, List, Optional
import uuid

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.auth.models import User


class NonConformance(Base):
    __tablename__ = "non_conformances"

    nc_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nc_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="HACCP_CCP")  # HACCP_CCP, PRP_GMP, IQC_INCOMING, INTERNAL_AUDIT, CUSTOMER_COMPLAINT, EQUIPMENT_FAIL
    severity: Mapped[str] = mapped_column(String(20), nullable=False, default="MAJOR")  # CRITICAL, MAJOR, MINOR
    occurred_date: Mapped[date] = mapped_column(Date, nullable=False)
    occurred_location: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)  # Dây chuyền chiết rót, Kho đông lạnh, Bếp nấu...
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Khắc phục tức thì (Corrections theo ISO 22000 Điều khoản 8.9.2)
    immediate_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Cô lập lô hàng, Dán thẻ đỏ biệt trữ, Tạm ngưng dây chuyền
    affected_lot_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    affected_quantity: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Ví dụ: "1,200 kg", "500 thùng"
    
    reported_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    reported_by_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)  # Tên người phát hiện / KCS
    status: Mapped[str] = mapped_column(String(30), default="NEW")  # NEW, INVESTIGATING, ACTION_REQUIRED, UNDER_REVIEW, CLOSED, REJECTED
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    reporter: Mapped[Optional[User]] = relationship("User", foreign_keys=[reported_by])
    capa_records: Mapped[List["CAPARecord"]] = relationship("CAPARecord", back_populates="non_conformance", cascade="all, delete-orphan", order_by="desc(CAPARecord.created_at)")


class CAPARecord(Base):
    __tablename__ = "capa_records"

    capa_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    capa_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nc_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("non_conformances.nc_id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Phân tích nguyên nhân gốc rễ (Root Cause Analysis - ISO 22000 Điều khoản 8.9.3)
    root_cause_method: Mapped[str] = mapped_column(String(50), default="5_WHYS")  # 5_WHYS, FISHBONE_5M, OTHER
    root_cause_analysis: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)  # {"whys": [...]} hoặc {"man": [], "machine": [], "material": [], "method": [], "measurement": [], "environment": []}
    root_cause_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Biện pháp khắc phục & Phòng ngừa (ISO 22000 Điều khoản 10.1 & 10.2)
    corrective_action: Mapped[str] = mapped_column(Text, nullable=False)  # Hành động khắc phục loại bỏ nguyên nhân cốt lõi
    preventive_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)   # Biện pháp phòng ngừa ngăn ngừa tái diễn
    
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    assigned_to_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)  # Tên người/bộ phận chịu trách nhiệm
    assigned_dept: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)     # Phòng Sản xuất, Phòng Cơ điện, Phòng QC...
    
    target_date: Mapped[date] = mapped_column(Date, nullable=False)            # Hạn chót hoàn thành khắc phục
    completed_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)          # Ngày thực tế hoàn thành

    # QT-SKPH: review by QLCL/ATTP, approval by management before implementation.
    review_status: Mapped[str] = mapped_column(String(30), default="DRAFT")  # DRAFT, PENDING_REVIEW, REVIEWED, APPROVED, REJECTED
    reviewed_by_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    review_comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    approval_comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Thẩm tra hiệu lực theo kỳ hạn đã được doanh nghiệp phê duyệt.
    verified_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    verified_by_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)  # Trưởng ban ISO / Trưởng ban QLCL
    verification_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    verification_result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verification_status: Mapped[str] = mapped_column(String(30), default="PENDING_VERIFY")  # PENDING_VERIFY, EFFECTIVE, INEFFECTIVE
    
    status: Mapped[str] = mapped_column(String(30), default="DRAFT")  # DRAFT, IN_PROGRESS, PENDING_VERIFICATION, COMPLETED, OVERDUE
    evidence_urls: Mapped[Optional[List[str]]] = mapped_column(JSONB, nullable=True)        # Danh sách link ảnh/file tài liệu minh chứng
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    non_conformance: Mapped[Optional[NonConformance]] = relationship("NonConformance", back_populates="capa_records")
    assignee: Mapped[Optional[User]] = relationship("User", foreign_keys=[assigned_to])
    verifier: Mapped[Optional[User]] = relationship("User", foreign_keys=[verified_by])
