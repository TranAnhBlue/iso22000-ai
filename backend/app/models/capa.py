from sqlalchemy import Column, String, Boolean, Text, Date, DateTime, Numeric, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from app.core.database import Base


class NonConformance(Base):
    __tablename__ = "non_conformances"

    nc_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nc_number = Column(String(50), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    source = Column(String(50), nullable=False, default="HACCP_CCP")  # HACCP_CCP, PRP_GMP, IQC_INCOMING, INTERNAL_AUDIT, CUSTOMER_COMPLAINT, EQUIPMENT_FAIL
    severity = Column(String(20), nullable=False, default="MAJOR")  # CRITICAL, MAJOR, MINOR
    occurred_date = Column(Date, nullable=False)
    occurred_location = Column(String(150), nullable=True)  # Dây chuyền chiết rót, Kho đông lạnh, Bếp nấu...
    description = Column(Text, nullable=False)
    
    # Khắc phục tức thì (Corrections theo ISO 22000 Điều khoản 8.9.2)
    immediate_action = Column(Text, nullable=True)  # Cô lập lô hàng, Dán thẻ đỏ biệt trữ, Tạm ngưng dây chuyền
    affected_lot_number = Column(String(100), nullable=True)
    affected_quantity = Column(String(100), nullable=True)  # Ví dụ: "1,200 kg", "500 thùng"
    
    reported_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    reported_by_name = Column(String(150), nullable=True)  # Tên người phát hiện / KCS
    status = Column(String(30), default="NEW")  # NEW, INVESTIGATING, ACTION_REQUIRED, UNDER_REVIEW, CLOSED, REJECTED
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    reporter = relationship("User", foreign_keys=[reported_by])
    capa_records = relationship("CAPARecord", back_populates="non_conformance", cascade="all, delete-orphan", order_by="desc(CAPARecord.created_at)")


class CAPARecord(Base):
    __tablename__ = "capa_records"

    capa_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    capa_number = Column(String(50), unique=True, nullable=False)
    nc_id = Column(UUID(as_uuid=True), ForeignKey("non_conformances.nc_id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    
    # Phân tích nguyên nhân gốc rễ (Root Cause Analysis - ISO 22000 Điều khoản 8.9.3)
    root_cause_method = Column(String(50), default="5_WHYS")  # 5_WHYS, FISHBONE_5M, OTHER
    root_cause_analysis = Column(JSONB, nullable=True)  # {"whys": [...]} hoặc {"man": [], "machine": [], "material": [], "method": [], "measurement": [], "environment": []}
    root_cause_summary = Column(Text, nullable=True)
    
    # Biện pháp khắc phục & Phòng ngừa (ISO 22000 Điều khoản 10.1 & 10.2)
    corrective_action = Column(Text, nullable=False)  # Hành động khắc phục loại bỏ nguyên nhân cốt lõi
    preventive_action = Column(Text, nullable=True)   # Biện pháp phòng ngừa ngăn ngừa tái diễn
    
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    assigned_to_name = Column(String(150), nullable=True)  # Tên người/bộ phận chịu trách nhiệm
    assigned_dept = Column(String(150), nullable=True)     # Phòng Sản xuất, Phòng Cơ điện, Phòng QC...
    
    target_date = Column(Date, nullable=False)            # Hạn chót hoàn thành khắc phục
    completed_date = Column(Date, nullable=True)          # Ngày thực tế hoàn thành
    
    # Thẩm tra hiệu lực sau 30 ngày (Verification of Effectiveness)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    verified_by_name = Column(String(150), nullable=True)  # Trưởng ban ISO / Trưởng ban QLCL
    verification_date = Column(Date, nullable=True)
    verification_result = Column(Text, nullable=True)
    verification_status = Column(String(30), default="PENDING_VERIFY")  # PENDING_VERIFY, EFFECTIVE, INEFFECTIVE
    
    status = Column(String(30), default="IN_PROGRESS")  # DRAFT, IN_PROGRESS, PENDING_VERIFICATION, COMPLETED, OVERDUE
    evidence_urls = Column(JSONB, nullable=True)        # Danh sách link ảnh/file tài liệu minh chứng
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    non_conformance = relationship("NonConformance", back_populates="capa_records")
    assignee = relationship("User", foreign_keys=[assigned_to])
    verifier = relationship("User", foreign_keys=[verified_by])
