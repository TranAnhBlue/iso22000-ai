from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

# ==================== 1. PROCESS STEP SCHEMAS ====================
class ProcessStepBase(BaseModel):
    step_number: int = Field(..., ge=1, description="Số thứ tự công đoạn trong lưu đồ")
    step_name: str = Field(..., max_length=255, description="Tên công đoạn sản xuất")
    product_line: str = Field(default="Chế biến Thủy hải sản", max_length=100)
    description: Optional[str] = None
    is_ccp_or_oprp: bool = Field(default=False, description="Được xác định là CCP hoặc oPRP")

class ProcessStepCreate(ProcessStepBase):
    pass

class ProcessStepUpdate(BaseModel):
    step_number: Optional[int] = None
    step_name: Optional[str] = None
    product_line: Optional[str] = None
    description: Optional[str] = None
    is_ccp_or_oprp: Optional[bool] = None

class ProcessStepResponse(ProcessStepBase):
    step_id: UUID
    hazard_count: int = 0
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== 2. HAZARD ANALYSIS SCHEMAS ====================
class HazardAnalysisBase(BaseModel):
    step_id: UUID
    hazard_type: str = Field(..., description="BIOLOGICAL (Sinh học) / CHEMICAL (Hóa học) / PHYSICAL (Vật lý) / ALLERGEN (Dị nguyên)")
    hazard_name: str = Field(..., max_length=255, description="Tên tác nhân mối nguy cụ thể")
    potential_consequence: Optional[str] = None
    likelihood: int = Field(default=2, ge=1, le=3, description="Khả năng xảy ra (1: Thấp, 2: Vừa, 3: Cao)")
    severity: int = Field(default=2, ge=1, le=3, description="Mức độ nghiêm trọng (1: Thấp, 2: Vừa, 3: Cao)")
    risk_score: Optional[int] = Field(default=4, ge=1, le=9)
    is_significant: bool = Field(default=True, description="Mối nguy có ý nghĩa an toàn thực phẩm?")
    control_measure: str = Field(..., description="Biện pháp kiểm soát đề xuất")
    
    # Cây quyết định Codex
    q1: Optional[str] = Field(default="YES", description="Q1: Có biện pháp kiểm soát?")
    q2: Optional[str] = Field(default="NO", description="Q2: Bước này có loại trừ/giảm thiểu mối nguy?")
    q3: Optional[str] = Field(default="YES", description="Q3: Nguy cơ nhiễm bẩn vượt mức chấp nhận?")
    q4: Optional[str] = Field(default="NO", description="Q4: Bước tiếp theo có loại trừ được?")
    
    classification: str = Field(default="PRP", description="Phân loại: CCP, OPRP, PRP, NOT_SIGNIFICANT")
    notes: Optional[str] = None

class HazardAnalysisCreate(HazardAnalysisBase):
    pass

class HazardAnalysisUpdate(BaseModel):
    step_id: Optional[UUID] = None
    hazard_type: Optional[str] = None
    hazard_name: Optional[str] = None
    potential_consequence: Optional[str] = None
    likelihood: Optional[int] = None
    severity: Optional[int] = None
    risk_score: Optional[int] = None
    is_significant: Optional[bool] = None
    control_measure: Optional[str] = None
    q1: Optional[str] = None
    q2: Optional[str] = None
    q3: Optional[str] = None
    q4: Optional[str] = None
    classification: Optional[str] = None
    notes: Optional[str] = None

class HazardAnalysisResponse(HazardAnalysisBase):
    hazard_id: UUID
    step_name: Optional[str] = None
    step_number: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== 3. CCP DEFINITION SCHEMAS ====================
class CCPDefinitionBase(BaseModel):
    ccp_code: str = Field(..., max_length=50, description="Mã hiệu CCP (Ví dụ: CCP 1, CCP 2, oPRP 1)")
    name: str = Field(..., max_length=255, description="Tên điểm kiểm soát tới hạn")
    process_step_id: Optional[UUID] = None
    hazard_description: str = Field(..., description="Mô tả mối nguy cần kiểm soát tại điểm này")
    critical_limit: Dict[str, Any] = Field(..., description="Cấu hình giới hạn tới hạn: {param, min, max, unit, condition_text}")
    monitoring_frequency: str = Field(default="Mỗi mẻ", max_length=100)
    monitoring_method: str = Field(..., description="Phương pháp và thiết bị giám sát")
    corrective_action_plan: str = Field(..., description="Kế hoạch hành động khắc phục khi vượt ngưỡng")
    responsible_role: str = Field(default="QC / Trưởng ca Sản xuất", max_length=100)
    status: str = Field(default="ACTIVE", description="ACTIVE, INACTIVE, REVIEWING")

class CCPDefinitionCreate(CCPDefinitionBase):
    pass

class CCPDefinitionUpdate(BaseModel):
    ccp_code: Optional[str] = None
    name: Optional[str] = None
    process_step_id: Optional[UUID] = None
    hazard_description: Optional[str] = None
    critical_limit: Optional[Dict[str, Any]] = None
    monitoring_frequency: Optional[str] = None
    monitoring_method: Optional[str] = None
    corrective_action_plan: Optional[str] = None
    responsible_role: Optional[str] = None
    status: Optional[str] = None

class CCPDefinitionResponse(CCPDefinitionBase):
    ccp_id: UUID
    step_name: Optional[str] = None
    last_measured_value: Optional[str] = None
    last_log_status: Optional[str] = "NORMAL"
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== 4. CCP MONITORING LOG SCHEMAS ====================
class CCPMonitoringLogBase(BaseModel):
    ccp_id: UUID
    batch_number: str = Field(..., max_length=100, description="Mã số mẻ/lô sản xuất")
    test_time: Optional[datetime] = None
    measured_value: float = Field(..., description="Giá trị đo thực tế (ví dụ: 78.4, 1.4, -21.0)")
    unit: str = Field(default="°C", max_length=20)
    measured_details: Optional[Dict[str, Any]] = None
    is_critical_limit_exceeded: bool = Field(default=False)
    status: str = Field(default="NORMAL", description="NORMAL, WARNING, CRITICAL")
    deviation_action: Optional[str] = None
    verification_status: str = Field(default="VERIFIED", description="PENDING, VERIFIED, REJECTED")
    notes: Optional[str] = None

class CCPMonitoringLogCreate(CCPMonitoringLogBase):
    checked_by: Optional[UUID] = None
    verified_by: Optional[UUID] = None

class CCPMonitoringLogUpdate(BaseModel):
    batch_number: Optional[str] = None
    measured_value: Optional[float] = None
    unit: Optional[str] = None
    measured_details: Optional[Dict[str, Any]] = None
    is_critical_limit_exceeded: Optional[bool] = None
    status: Optional[str] = None
    deviation_action: Optional[str] = None
    verification_status: Optional[str] = None
    notes: Optional[str] = None

class CCPMonitoringLogResponse(CCPMonitoringLogBase):
    log_id: UUID
    ccp_code: Optional[str] = None
    ccp_name: Optional[str] = None
    critical_limit_text: Optional[str] = None
    inspector_name: Optional[str] = None
    verifier_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== 5. PRP PROGRAM SCHEMAS ====================
class PRPProgramBase(BaseModel):
    program_code: str = Field(..., max_length=50, description="Mã chương trình (GMP-01, SSOP-01...)")
    program_name: str = Field(..., max_length=255, description="Tên chương trình tiên quyết")
    group: str = Field(default="GMP", max_length=50, description="GMP, SSOP, 5S, PEST_CONTROL, WATER_SAFETY")
    scope: Optional[str] = Field(default="Toàn nhà máy")
    frequency: str = Field(default="Theo ca sản xuất", max_length=50)
    responsible_dept: str = Field(default="Phòng Sản xuất", max_length=100)
    status: str = Field(default="ACTIVE", description="ACTIVE, INACTIVE")
    description: Optional[str] = None

class PRPProgramCreate(PRPProgramBase):
    pass

class PRPProgramUpdate(BaseModel):
    program_code: Optional[str] = None
    program_name: Optional[str] = None
    group: Optional[str] = None
    scope: Optional[str] = None
    frequency: Optional[str] = None
    responsible_dept: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None

class PRPProgramResponse(PRPProgramBase):
    program_id: UUID
    checklist_count: int = 0
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== 6. PRP CHECKLIST LOG SCHEMAS ====================
class PRPChecklistLogBase(BaseModel):
    program_id: UUID
    shift_name: str = Field(default="Ca sáng", max_length=50)
    check_date: date = Field(default_factory=date.today)
    check_time: Optional[str] = Field(default="07:30")
    items_checked: List[Dict[str, Any]] = Field(default_factory=list, description="Danh sách câu hỏi & kết quả")
    compliance_rate: float = Field(default=100.0, ge=0.0, le=100.0)
    status: str = Field(default="COMPLIANT", description="COMPLIANT, ACTION_REQUIRED, NON_COMPLIANT")
    finding_notes: Optional[str] = None
    corrective_action: Optional[str] = None

class PRPChecklistLogCreate(PRPChecklistLogBase):
    checked_by: Optional[UUID] = None

class PRPChecklistLogUpdate(BaseModel):
    shift_name: Optional[str] = None
    check_date: Optional[date] = None
    check_time: Optional[str] = None
    items_checked: Optional[List[Dict[str, Any]]] = None
    compliance_rate: Optional[float] = None
    status: Optional[str] = None
    finding_notes: Optional[str] = None
    corrective_action: Optional[str] = None

class PRPChecklistLogResponse(PRPChecklistLogBase):
    check_id: UUID
    program_code: Optional[str] = None
    program_name: Optional[str] = None
    group: Optional[str] = None
    inspector_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== 7. KPI STATS SCHEMAS ====================
class HACCPStatsResponse(BaseModel):
    total_steps: int
    total_hazards: int
    total_ccps: int
    active_ccps: int
    total_logs_today: int
    normal_logs_count: int
    warning_logs_count: int
    critical_breaches_count: int
    in_limit_percentage: float
    total_prp_programs: int
    prp_compliance_rate_avg: float


# ==================== 8. AI ASSISTANT SCHEMAS ====================
class AIHazardItem(BaseModel):
    hazard_type: str
    hazard_name: str
    potential_consequence: str
    likelihood: int
    severity: int
    risk_score: int
    is_significant: bool
    control_measure: str
    q1: str
    q2: str
    q3: str
    q4: str
    recommended_classification: str  # CCP, OPRP, PRP

class AIHazardSuggestRequest(BaseModel):
    step_name: str
    product_line: str = "Chế biến Thủy hải sản"
    step_description: Optional[str] = None

class AIHazardSuggestResponse(BaseModel):
    step_name: str
    product_line: str
    identified_hazards: List[AIHazardItem]
    ai_rationale: str
    confidence_score: float = 95.0

class AICCPDeviationRequest(BaseModel):
    ccp_code: str
    measured_value: float
    unit: str
    batch_number: str
    critical_limit_text: str
    deviation_description: Optional[str] = None

class AICCPDeviationResponse(BaseModel):
    severity_level: str  # CRITICAL / WARNING
    immediate_containment: List[str]  # Cách ly lô, dừng chuyền...
    root_cause_hypothesis: List[str]  # Giả định nguyên nhân
    corrective_actions: List[str]  # Hành động khắc phục
    disposition_plan: str  # Kế hoạch xử lý sản phẩm không phù hợp (tái chế / hủy)
    iso_clause_reference: str = "ISO 22000:2018 Điều khoản 8.9.2 (Sự không phù hợp & Hành động khắc phục)"
