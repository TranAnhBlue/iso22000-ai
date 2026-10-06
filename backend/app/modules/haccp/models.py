import uuid
from typing import Optional, List, Any
from datetime import datetime, date, time
from sqlalchemy import String, DateTime, Date, Time, ForeignKey, Text, Numeric, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.modules.auth.models import User

# ==================== 0. HACCP PLAN (KẾ HOẠCH HACCP TỔNG THỂ) ====================
class HACCPPlan(Base):
    __tablename__ = "haccp_plans"

    plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # HACCP-2026-CB01
    plan_name: Mapped[str] = mapped_column(String(255), nullable=False)  # Kế hoạch HACCP Chế biến Chả cá Ba Sa
    product_line: Mapped[str] = mapped_column(String(100), default="Chế biến Thủy hải sản", nullable=False)
    version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    team_leader: Mapped[str] = mapped_column(String(100), default="Trưởng ban HACCP / QA", nullable=False)
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), default="Giám đốc Nhà máy", nullable=True)
    effective_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    scope_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, DRAFT, ARCHIVED
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    steps: Mapped[List["ProcessStep"]] = relationship("ProcessStep", back_populates="haccp_plan", cascade="all, delete-orphan")
    reviews: Mapped[List["HACCPPlanReview"]] = relationship("HACCPPlanReview", back_populates="haccp_plan", cascade="all, delete-orphan")


# ==================== 1. PROCESS STEPS (LƯU ĐỒ CÔNG ĐOẠN) ====================
class ProcessStep(Base):
    __tablename__ = "process_steps"

    step_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("haccp_plans.plan_id", ondelete="SET NULL"), nullable=True)
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    step_name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_line: Mapped[str] = mapped_column(String(100), default="Chế biến Thủy hải sản", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_ccp_or_oprp: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    haccp_plan: Mapped[Optional["HACCPPlan"]] = relationship("HACCPPlan", back_populates="steps", lazy="joined")
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


# ==================== 7. HACCP PLAN REVIEWS (THẨM TRA & CẬP NHẬT KẾ HOẠCH HACCP TỔNG THỂ) ====================
class HACCPPlanReview(Base):
    """
    Điều khoản 8.6 & 8.8 ISO 22000:2018 - Cập nhật thông tin ban đầu, tài liệu PRP & Kế hoạch kiểm soát mối nguy
    Thẩm tra định kỳ hoặc khi có thay đổi (Change Request) để đánh giá lại mối nguy và hiệu lực kiểm soát
    """
    __tablename__ = "haccp_plan_reviews"

    review_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # HPR-2026-001
    plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("haccp_plans.plan_id", ondelete="CASCADE"), nullable=False)
    review_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    review_type: Mapped[str] = mapped_column(String(50), default="PERIODIC", nullable=False)  # PERIODIC, TRIGGERED_BY_CHANGE, POST_INCIDENT
    triggered_by_change_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("change_requests.change_id", ondelete="SET NULL"), nullable=True)
    reviewed_by_name: Mapped[str] = mapped_column(String(100), nullable=False)
    scope_of_review: Mapped[str] = mapped_column(Text, nullable=False)  # Rà soát lưu đồ công đoạn, mối nguy sinh học/hóa học, CCP
    findings: Mapped[str] = mapped_column(Text, nullable=False)  # Kết quả đánh giá
    changes_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    plan_version_before: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    plan_version_after: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    approval_status: Mapped[str] = mapped_column(String(30), default="APPROVED", nullable=False)  # APPROVED, REVISION_REQUIRED
    approved_by_name: Mapped[Optional[str]] = mapped_column(String(100), default="Đội trưởng Đội ATTP", nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    haccp_plan: Mapped["HACCPPlan"] = relationship("HACCPPlan", back_populates="reviews", lazy="joined")


# ==================== 8. METAL DETECTOR LOGS (BM06-KSQT NHẬT KÝ KIỂM TRA MÁY DÒ KIM LOẠI) ====================
class MetalDetectorLog(Base):
    """
    Biểu mẫu BM06-KSQT - Kiểm tra máy dò kim loại trước & trong ca sản xuất (2h/lần)
    Kiểm tra thanh mẫu Sắt Fe (0.5mm), Inox SUS 304 (0.8mm) và cơ cấu loại bỏ.
    """
    __tablename__ = "metal_detector_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    machine_code: Mapped[str] = mapped_column(String(50), default="MD-01", nullable=False)
    machine_name: Mapped[str] = mapped_column(String(100), default="Máy dò kim loại băng tải", nullable=False)
    log_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    check_time: Mapped[str] = mapped_column(String(20), nullable=False)  # 07:00, 09:00, 11:00...
    shift_name: Mapped[str] = mapped_column(String(50), default="Ca 1", nullable=False)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Test mẫu thử chuẩn
    fe_standard_mm: Mapped[float] = mapped_column(Numeric(4, 2), default=0.50, nullable=False)  # Thỏi chuẩn Sắt Fe 0.5mm
    fe_detected: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sus_standard_mm: Mapped[float] = mapped_column(Numeric(4, 2), default=0.80, nullable=False)  # Thỏi chuẩn SUS 304 0.8mm
    sus_detected: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    rejection_mechanism_working: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)  # Cần gạt/dừng băng tải/còi báo

    # Số lượng sản phẩm có kim loại phát hiện trong ca
    metal_detected_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    test_result: Mapped[str] = mapped_column(String(30), default="PASSED", nullable=False)  # PASSED, FAILED
    corrective_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    checked_by_name: Mapped[str] = mapped_column(String(100), nullable=False)
    verified_by_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ==================== 9. IN-PROCESS QC LOGS (BM01 - BM05 KSQT KIỂM SOÁT CÔNG ĐOẠN CHẾ BIẾN) ====================
class InProcessQCLog(Base):
    """
    Biểu mẫu BM01-KSQT đến BM05-KSQT - Kiểm soát quá trình sản xuất từng công đoạn:
    Rửa thái định lượng, Sấy làm nguội, Nghiền sàng lọc bã, Hồ hóa tách màu, Kiểm tra thành phẩm
    """
    __tablename__ = "in_process_qc_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # IPQC-2026-001
    stage_code: Mapped[str] = mapped_column(String(50), nullable=False)  # WASH_CUT, DRY_COOL, GRIND_SIEVE, GELATINIZE, FINISHED_PRODUCT
    stage_name: Mapped[str] = mapped_column(String(150), nullable=False)
    log_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    check_time: Mapped[str] = mapped_column(String(20), nullable=False)  # 08:30, 10:30...
    shift_name: Mapped[str] = mapped_column(String(50), default="Ca 1", nullable=False)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Chỉ tiêu kiểm tra động theo công đoạn (nhiệt độ sấy, độ ẩm, kích thước thái, cảm quan...)
    criteria_data: Mapped[Any] = mapped_column(JSONB, nullable=False)

    overall_status: Mapped[str] = mapped_column(String(30), default="PASS", nullable=False)  # PASS, WARNING, FAIL
    deviations: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    corrective_actions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    inspector_name: Mapped[str] = mapped_column(String(100), nullable=False)
    supervisor_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ==================== 10. PEST CONTROL LOGS (BM01-SVGH) ====================
class PestControlLog(Base):
    """
    Thư mục 07 An Giang: Báo cáo kiểm tra bẫy chuột, bẫy côn trùng & đèn diệt côn trùng (BM01-SVGH)
    """
    __tablename__ = "pest_control_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    log_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # PCL-2026-001
    check_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    inspector_name: Mapped[str] = mapped_column(String(100), nullable=False)
    trap_locations: Mapped[Any] = mapped_column(JSONB, nullable=False)  # [{trap_number, location, trap_type, status, bait_status, pests_caught, notes}]
    total_pests_caught: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    corrective_actions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED", nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ==================== 11. ALLERGEN CONTROLS (BM01-CGDU) ====================
class AllergenControl(Base):
    """
    Thư mục 07 An Giang: Danh mục nhận diện và kiểm soát chất gây dị ứng (BM01-CGDU)
    """
    __tablename__ = "allergen_controls"

    allergen_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    allergen_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # ALG-2026-001
    material_name: Mapped[str] = mapped_column(String(255), nullable=False)
    allergen_types: Mapped[str] = mapped_column(String(255), nullable=False)  # Đậu nành, Gluten lúa mì...
    is_contained_in_product: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    cross_contact_risk_stage: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    preventive_measures: Mapped[str] = mapped_column(Text, nullable=False)
    responsible_person: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ==================== 12. VISITOR HEALTH DECLARATIONS (BM03-KSSK) ====================
class VisitorHealthDeclaration(Base):
    """
    Thư mục 07 An Giang: Phiếu kê khai sức khỏe khách vào khu vực sản xuất (BM03-KSSK)
    """
    __tablename__ = "visitor_health_declarations"

    declaration_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    declaration_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # VHD-2026-001
    visit_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    visitor_name: Mapped[str] = mapped_column(String(100), nullable=False)
    company_name: Mapped[str] = mapped_column(String(150), nullable=False)
    purpose_of_visit: Mapped[str] = mapped_column(String(255), nullable=False)
    has_diarrhea: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_fever_cough: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_open_wound: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    visited_epidemic_area: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_approved_entry: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    escort_person: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    commitment_signed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ==================== 13. FIRST AID CABINET LOGS (BM01-KSSK) ====================
class FirstAidLog(Base):
    """
    Thư mục 07 An Giang: Sổ theo dõi cấp phát thuốc và dụng cụ y tế sơ cứu xưởng (BM01-KSSK)
    """
    __tablename__ = "first_aid_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    log_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # FAL-2026-001
    issue_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    recipient_name: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    reason_symptom: Mapped[str] = mapped_column(Text, nullable=False)
    supplies_provided: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    dispenser_name: Mapped[str] = mapped_column(String(100), nullable=False)
    status_after_aid: Mapped[str] = mapped_column(Text, default="Tiếp tục làm việc", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ==================== 14. VEHICLE INSPECTION LOGS (BM01-PTVC) ====================
class VehicleInspectionLog(Base):
    """
    Thư mục 15 An Giang: Bảng kiểm tra phương tiện vận chuyển thành phẩm (BM01-PTVC)
    """
    __tablename__ = "vehicle_inspection_logs"

    inspection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # VIC-2026-001
    inspection_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(100), nullable=False)
    license_plate: Mapped[str] = mapped_column(String(50), nullable=False)
    driver_name: Mapped[str] = mapped_column(String(100), nullable=False)
    check_registration_valid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    check_clean_floor: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    check_no_odor: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    check_no_pests: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    check_enclosed_tarp: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    overall_result: Mapped[str] = mapped_column(String(30), default="PASSED", nullable=False)  # PASSED, REJECTED
    inspector_name: Mapped[str] = mapped_column(String(100), nullable=False)
    corrective_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ==================== 15. WATER SAFETY RECORDS (BM01-SSOP-NUOC) ====================
class WaterSafetyRecord(Base):
    """
    Thư mục 07 An Giang - SSOP Nguồn nước & Đá vảy: Sổ theo dõi kiểm tra chất lượng nguồn nước sản xuất
    Kiểm tra chỉ tiêu nhanh tại hiện trường: pH (6.5-8.5), Clo dư (0.2-1.0 ppm), Độ đục (<=2 NTU), Cảm quan, Vi sinh
    """
    __tablename__ = "water_safety_records"

    record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # WSR-2026-001
    sampling_point: Mapped[str] = mapped_column(String(255), nullable=False)  # Bồn chứa ngầm, Đầu ra RO, Vòi chế biến, Bồn làm đá vảy
    sampling_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    sampling_time: Mapped[str] = mapped_column(String(20), default="07:00", nullable=False)
    ph_level: Mapped[float] = mapped_column(Numeric(4, 2), default=7.2, nullable=False)  # Chuẩn QCVN 01-1:2018/BYT: 6.5 - 8.5
    chlorine_ppm: Mapped[float] = mapped_column(Numeric(4, 2), default=0.5, nullable=False)  # Chuẩn: 0.2 - 1.0 mg/L
    turbidity_ntu: Mapped[float] = mapped_column(Numeric(4, 2), default=0.5, nullable=False)  # Chuẩn: <= 2 NTU
    sensory_result: Mapped[str] = mapped_column(String(100), default="Trong suốt, không màu, không mùi vị lạ", nullable=False)
    coliform_cfu: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), default=0.0, nullable=True)
    e_coli_cfu: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), default=0.0, nullable=True)
    overall_status: Mapped[str] = mapped_column(String(30), default="PASS", nullable=False)  # PASS, FAIL
    tested_by_name: Mapped[str] = mapped_column(String(100), default="Kỹ thuật Cơ điện", nullable=False)
    verified_by_name: Mapped[Optional[str]] = mapped_column(String(100), default="QA Kiểm tra", nullable=True)
    corrective_action: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ==================== 16. APPROVED CHEMICAL LIST & MSDS (BM01-SSOP-HOACHAT) ====================
class ChemicalRecord(Base):
    """
    Thư mục 07 An Giang - SSOP Hóa chất & Vệ sinh CIP: Danh mục hóa chất được phê duyệt sử dụng & quản lý MSDS
    Bao gồm hóa chất tẩy rửa tiếp xúc thực phẩm, khử trùng, xử lý nước, cồn sát khuẩn
    """
    __tablename__ = "chemical_records"

    chemical_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chemical_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # HC-CLO-01
    chemical_name: Mapped[str] = mapped_column(String(255), nullable=False)  # Chlorine Nippon 70%, Xút vảy NaOH 99% Food Grade
    purpose: Mapped[str] = mapped_column(String(255), nullable=False)  # Khử trùng bề mặt & nước, Tẩy rửa CIP đường ống
    is_food_grade: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    supplier_name: Mapped[str] = mapped_column(String(255), nullable=False)
    msds_document_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    msds_file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    msds_expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    dilution_ratio: Mapped[str] = mapped_column(String(100), default="1:1000", nullable=False)  # Tỷ lệ nồng độ pha chế chuẩn
    storage_location: Mapped[str] = mapped_column(String(255), default="Kho hóa chất riêng biệt có khóa", nullable=False)
    approval_status: Mapped[str] = mapped_column(String(30), default="APPROVED", nullable=False)  # APPROVED, SUSPENDED, EXPIRED
    current_stock_kg: Mapped[float] = mapped_column(Numeric(10, 2), default=50.0, nullable=False)
    safety_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), default="Trưởng Đội ATTP", nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ==================== 17. WASTE MANAGEMENT LOGS (BM01-SSOP-RACTHAI) ====================
class WasteLog(Base):
    """
    Thư mục 07 An Giang - SSOP Quản lý chất thải: Sổ theo dõi thu gom & chuyển giao chất thải
    Phân loại: Phụ phẩm hữu cơ (xương, đầu, da cá), Chất thải rắn sinh hoạt, Chất thải nguy hại
    """
    __tablename__ = "waste_logs"

    waste_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    log_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # WST-2026-001
    log_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)
    waste_type: Mapped[str] = mapped_column(String(50), default="ORGANIC_BYPRODUCT", nullable=False)  # ORGANIC_BYPRODUCT, SOLID_DOMESTIC, HAZARDOUS
    description: Mapped[str] = mapped_column(String(255), nullable=False)  # Phụ phẩm đầu xương da cá tra, Rác sinh hoạt xưởng, Bao bì hóa chất rỗng
    quantity_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    storage_area: Mapped[str] = mapped_column(String(150), default="Nhà chứa phụ phẩm khép kín", nullable=False)
    disposal_contractor: Mapped[str] = mapped_column(String(255), default="Nhà máy Bột cá An Giang", nullable=False)
    transfer_note_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Số biên bản bàn giao rác / chứng từ chất thải
    status: Mapped[str] = mapped_column(String(30), default="TRANSFERRED", nullable=False)  # COLLECTED, TRANSFERRED, DISPOSED
    handled_by_name: Mapped[str] = mapped_column(String(100), default="Tổ Vệ sinh Môi trường", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ==================== 18. ENVIRONMENTAL MONITORING SCHEDULES ====================
class EnvironmentalMonitoringSchedule(Base):
    """
    Kế hoạch & Lịch quan trắc, kiểm nghiệm môi trường định kỳ theo ISO 22000 & QCVN:
    Nước sản xuất, Nước đá, Không khí phòng sạch, Vi sinh bề mặt thớt/dao, Tay công nhân
    """
    __tablename__ = "environmental_monitoring_schedules"

    schedule_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # ENV-SCH-01
    target_object: Mapped[str] = mapped_column(String(150), nullable=False)  # Nước chế biến, Nước đá vảy, Bề mặt thớt cắt fillet, Không khí phòng đóng gói, Bàn tay công nhân
    parameters: Mapped[str] = mapped_column(String(255), nullable=False)  # Coliform, E.coli, Salmonella, Tổng số vi sinh vật hiếu khí
    frequency: Mapped[str] = mapped_column(String(50), default="1 tháng/lần", nullable=False)  # 1 tuần/lần, 1 tháng/lần, 6 tháng/lần
    testing_unit: Mapped[str] = mapped_column(String(255), default="Trung tâm Kiểm nghiệm Pasteur / Quatest", nullable=False)  # Phòng lab nội bộ / Đơn vị chỉ định
    last_tested_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    next_due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="SCHEDULED", nullable=False)  # SCHEDULED, COMPLETED, OVERDUE
    last_result: Mapped[Optional[str]] = mapped_column(String(50), default="PASSED", nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

