import uuid
from typing import Optional, List, Any
from datetime import datetime, date, time
from sqlalchemy import String, DateTime, Date, Time, ForeignKey, Text, Numeric, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.user import User

# ==================== 1. PROCESS STEPS (LƯU ĐỒ CÔNG ĐOẠN) ====================
class ProcessStep(Base):
    __tablename__ = "process_steps"

    step_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    step_name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_line: Mapped[str] = mapped_column(String(100), default="Chế biến Thủy hải sản", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_ccp_or_oprp: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    hazards: Mapped[List["HazardAnalysis"]] = relationship("HazardAnalysis", back_populates="process_step", cascade="all, delete-orphan")
    ccp_definitions: Mapped[List["CCPDefinition"]] = relationship("CCPDefinition", back_populates="process_step", cascade="all, delete-orphan")


# ==================== 2. HAZARD ANALYSIS (PHÂN TÍCH MỐI NGUY & CÂY QUYẾT ĐỊNH) ====================
class HazardAnalysis(Base):
    __tablename__ = "hazard_analyses"

    hazard_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    step_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("process_steps.step_id", ondelete="CASCADE"), nullable=False)
    hazard_type: Mapped[str] = mapped_column(String(50), nullable=False)  # BIOLOGICAL (Sinh học), CHEMICAL (Hóa học), PHYSICAL (Vật lý), ALLERGEN (Dị nguyên)
    hazard_name: Mapped[str] = mapped_column(String(255), nullable=False)
    potential_consequence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    likelihood: Mapped[int] = mapped_column(Integer, default=2, nullable=False)  # 1: Thấp (T), 2: Vừa (V), 3: Cao (C)
    severity: Mapped[int] = mapped_column(Integer, default=2, nullable=False)    # 1: Thấp (T), 2: Vừa (V), 3: Cao (C)
    risk_score: Mapped[int] = mapped_column(Integer, default=4, nullable=False)  # Likelihood * Severity (1 - 9)
    is_significant: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    control_measure: Mapped[str] = mapped_column(Text, nullable=False)  # Biện pháp kiểm soát
    
    # Cây quyết định Codex (Decision Tree Q1 - Q4)
    q1: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Có biện pháp kiểm soát tại bước này? (YES/NO)
    q2: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Bước này có loại trừ hoặc giảm thiểu mối nguy? (YES/NO)
    q3: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Có nguy cơ nhiễm bẩn vượt mức chấp nhận? (YES/NO)
    q4: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # Bước tiếp theo có loại trừ được mối nguy? (YES/NO)
    
    classification: Mapped[str] = mapped_column(String(30), default="PRP", nullable=False)  # CCP, OPRP, PRP, NOT_SIGNIFICANT
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    process_step: Mapped["ProcessStep"] = relationship("ProcessStep", back_populates="hazards", lazy="joined")


# ==================== 3. CCP DEFINITION (ĐỊNH NGHĨA ĐIỂM KIỂM SOÁT TỚI HẠN) ====================
class CCPDefinition(Base):
    __tablename__ = "ccp_definitions"

    ccp_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ccp_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # CCP 1, CCP 2, oPRP 1...
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    process_step_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("process_steps.step_id", ondelete="SET NULL"), nullable=True)
    hazard_description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Cấu hình giới hạn tới hạn (Critical Limit JSONB: param_name, min_val, max_val, unit, condition_text)
    critical_limit: Mapped[Any] = mapped_column(JSONB, nullable=False)
    
    monitoring_frequency: Mapped[str] = mapped_column(String(100), nullable=False)  # Liên tục, Mỗi mẻ, Mỗi 30 phút, Mỗi ca
    monitoring_method: Mapped[str] = mapped_column(Text, nullable=False)  # Cảm biến nhiệt tự động, Dò kim loại băng tải, Test strip
    corrective_action_plan: Mapped[Text] = mapped_column(Text, nullable=False)  # Kế hoạch hành động khắc phục khi vượt ngưỡng
    responsible_role: Mapped[str] = mapped_column(String(100), default="QC / Trưởng ca Sản xuất", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, INACTIVE, REVIEWING
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    process_step: Mapped[Optional[ProcessStep]] = relationship("ProcessStep", back_populates="ccp_definitions", lazy="joined")
    monitoring_logs: Mapped[List["CCPMonitoringLog"]] = relationship("CCPMonitoringLog", back_populates="ccp", cascade="all, delete-orphan")


# ==================== 4. CCP MONITORING LOGS (NHẬT KÝ ĐO ĐẠC CCP REALTIME) ====================
class CCPMonitoringLog(Base):
    __tablename__ = "ccp_monitoring_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ccp_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ccp_definitions.ccp_id", ondelete="CASCADE"), nullable=False)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)  # Lô / mẻ sản xuất: LOT-2026-B01
    checked_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    test_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Giá trị đo đạc (Numeric/Float hoặc string cho kết quả PASS/FAIL)
    measured_value: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="°C", nullable=False)
    measured_details: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)  # {time_sec: 17, feeder_speed: 1.2, fe_status: 'PASS'}
    
    is_critical_limit_exceeded: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="NORMAL", nullable=False)  # NORMAL, WARNING, CRITICAL
    deviation_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Biện pháp cô lập/khắc phục đã thực hiện
    verification_status: Mapped[str] = mapped_column(String(30), default="VERIFIED", nullable=False)  # PENDING, VERIFIED, REJECTED
    verified_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ccp: Mapped["CCPDefinition"] = relationship("CCPDefinition", back_populates="monitoring_logs", lazy="joined")
    inspector: Mapped[Optional[User]] = relationship("User", foreign_keys=[checked_by], lazy="joined")
    verifier: Mapped[Optional[User]] = relationship("User", foreign_keys=[verified_by], lazy="joined")


# ==================== 5. PRP PROGRAMS (CHƯƠNG TRÌNH TIÊN QUYẾT GMP / SSOP / 5S) ====================
class PRPProgram(Base):
    __tablename__ = "prp_programs"

    program_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # GMP-01, SSOP-01, 5S-01
    program_name: Mapped[str] = mapped_column(String(255), nullable=False)
    group: Mapped[str] = mapped_column(String(50), default="GMP", nullable=False)  # GMP, SSOP, 5S, PEST_CONTROL, WATER_SAFETY
    scope: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Toàn nhà máy, Khu sơ chế, Kho lạnh
    frequency: Mapped[str] = mapped_column(String(50), default="Theo ca sản xuất", nullable=False)  # Hàng ngày, Mỗi ca, Hàng tuần
    responsible_dept: Mapped[str] = mapped_column(String(100), default="Phòng Sản xuất", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, INACTIVE
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    checklists: Mapped[List["PRPChecklistLog"]] = relationship("PRPChecklistLog", back_populates="program", cascade="all, delete-orphan")


# ==================== 6. PRP CHECKLIST LOGS (NHẬT KÝ GIÁM SÁT THEO CA) ====================
class PRPChecklistLog(Base):
    __tablename__ = "prp_checklist_logs"

    check_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prp_programs.program_id", ondelete="CASCADE"), nullable=False)
    shift_name: Mapped[str] = mapped_column(String(50), default="Ca sáng", nullable=False)  # Ca sáng, Ca chiều, Ca đêm
    check_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    check_time: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # 07:30, 14:00
    checked_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    
    # Danh sách các câu hỏi kiểm tra & kết quả: [{item: "Vệ sinh băng tải", result: "Đạt", note: ""}, ...]
    items_checked: Mapped[Any] = mapped_column(JSONB, nullable=False)
    compliance_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=100.0, nullable=False)  # Tỷ lệ % tuân thủ
    status: Mapped[str] = mapped_column(String(30), default="COMPLIANT", nullable=False)  # COMPLIANT (Tuân thủ), ACTION_REQUIRED (Cần khắc phục), NON_COMPLIANT (Không phù hợp)
    finding_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    corrective_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    program: Mapped["PRPProgram"] = relationship("PRPProgram", back_populates="checklists", lazy="joined")
    inspector: Mapped[Optional[User]] = relationship("User", foreign_keys=[checked_by], lazy="joined")
