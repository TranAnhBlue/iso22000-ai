import uuid
from typing import Optional, List, Any
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.core.database import Base


# ==================== 1. EMERGENCY CONTACTS (DANH BẠ KHẨN CẤP) ====================
class EmergencyContact(Base):
    """
    Danh bạ ứng phó khẩn cấp Nội bộ & Ngoại vi (ISO 22000:2018 Clause 8.4)
    """
    __tablename__ = "emergency_contacts"

    contact_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # Tên cá nhân / Cơ quan
    organization_or_role: Mapped[str] = mapped_column(String(255), nullable=False)  # Chức vụ / Đơn vị
    phone: Mapped[str] = mapped_column(String(50), nullable=False)  # Số điện thoại chính / Hotline
    phone_alt: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # Số phụ
    email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    contact_type: Mapped[str] = mapped_column(String(30), default="INTERNAL", nullable=False)  # INTERNAL (Nội bộ), EXTERNAL (Cơ quan bên ngoài)
    priority_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # Thứ tự ưu tiên gọi
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ==================== 2. EMERGENCY PROCEDURES (KỊCH BẢN & QUY TRÌNH ỨNG PHÓ) ====================
class EmergencyProcedure(Base):
    """
    Quy trình & Kịch bản ứng phó sự cố khẩn cấp (ISO 22000:2018 Clause 8.4)
    Đúng 7+2 nhóm kịch bản theo tài liệu '01 QUY TRÌNH ỨNG PHÓ TÌNH HUỐNG KHẨN CẤP'
    Kèm ma trận đánh giá rủi ro Likelihood × Severity = Risk Score
    """
    __tablename__ = "emergency_procedures"

    procedure_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    procedure_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # EP-01, EP-02...
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # 7+2 Nhóm kịch bản chuẩn xác theo tài liệu gốc
    scenario_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # FIRE_EXPLOSION: Cháy, nổ
    # CHEMICAL_SPILL: Tràn đổ hóa chất
    # WATER_OUTAGE: Mất nước (gián đoạn cấp nước)
    # POWER_OUTAGE: Mất điện (gián đoạn cấp điện)
    # CHILLER_BREAKDOWN: Hỏng máy lạnh (gián đoạn hệ thống làm lạnh)
    # STEAM_OUTAGE: Gián đoạn nguồn hơi cấp
    # BIOTERRORISM_SABOTAGE: Khủng bố sinh học, hóa học / Phá hoại an ninh thực phẩm (Food Defense)
    # WORK_ACCIDENT: Tai nạn lao động nghiêm trọng
    # NATURAL_DISASTER_EPIDEMIC: Thiên tai, lũ lụt, dịch bệnh

    # Ma trận chấm điểm rủi ro L × S = R theo tài liệu gốc
    likelihood: Mapped[int] = mapped_column(Integer, default=2, nullable=False)  # 1-5 (Hiếm khi -> Rất thường xuyên)
    severity: Mapped[int] = mapped_column(Integer, default=3, nullable=False)  # 1-5 (Nhẹ -> Nghiêm trọng / Thảm họa)
    risk_score: Mapped[int] = mapped_column(Integer, default=6, nullable=False)  # L × S (1-25)
    risk_level: Mapped[str] = mapped_column(String(30), default="MEDIUM", nullable=False)  # LOW (1-4), MEDIUM (5-9), HIGH (10-15), CRITICAL (16-25)

    immediate_actions: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)  # [{step: 1, action: "...", responsible: "...", deadline_minutes: 5}]
    responsible_team: Mapped[str] = mapped_column(String(100), default="Đội Ứng phó Khẩn cấp & PCCC", nullable=False)
    equipment_needed: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, UNDER_REVIEW, OBSOLETE
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ==================== 3. EMERGENCY DRILLS & INCIDENTS (NHẬT KÝ DIỄN TẬP & SỰ CỐ) ====================
class EmergencyDrill(Base):
    """
    Hồ sơ diễn tập định kỳ & Báo cáo xử lý sự cố thực tế (ISO 22000:2018 Clause 8.4.c)
    """
    __tablename__ = "emergency_drills"

    drill_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drill_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # DRL-2026-01
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    record_type: Mapped[str] = mapped_column(String(30), default="PLANNED_DRILL", nullable=False)  # PLANNED_DRILL, ACTUAL_INCIDENT
    scenario_type: Mapped[str] = mapped_column(String(50), nullable=False)
    drill_date: Mapped[date] = mapped_column(Date, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    participants_count: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    drill_leader: Mapped[str] = mapped_column(String(100), nullable=False)  # Chỉ huy diễn tập / Chỉ huy hiện trường
    scenario_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    response_time_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Thời gian phản ứng kiểm soát
    evaluation_result: Mapped[str] = mapped_column(String(30), default="SATISFACTORY", nullable=False)  # EXCELLENT, SATISFACTORY, NEEDS_IMPROVEMENT
    corrective_actions_needed: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Yêu cầu cải tiến CAPA sau diễn tập
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
