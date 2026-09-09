from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import uuid


# ==================== 1. QUALITY OBJECTIVES SCHEMAS (Clause 6.2) ====================
class QualityObjectiveBase(BaseModel):
    objective_code: str = Field(..., description="Mã mục tiêu (e.g. OBJ-2026-01)")
    metric_name: str = Field(..., description="Tên chỉ tiêu chất lượng & ATTP")
    clause_reference: str = Field(default="6.2", description="Điều khoản ISO liên quan")
    department: str = Field(default="Toàn nhà máy", description="Phòng ban / Phân xưởng")
    target_year: int = Field(default=2026, description="Năm mục tiêu")
    target_value: float = Field(..., description="Chỉ tiêu kế hoạch")
    actual_value: float = Field(default=0.0, description="Giá trị thực tế đạt được")
    unit: str = Field(default="%", description="Đơn vị tính")
    status: str = Field(default="ON_TRACK", description="Trạng thái (ON_TRACK, ACHIEVED, AT_RISK, OFF_TRACK)")
    action_plan: Optional[str] = Field(None, description="Kế hoạch hành động để đạt mục tiêu")
    responsible_person: str = Field(default="Trưởng Ban ISO", description="Người chịu trách nhiệm")


class QualityObjectiveCreate(QualityObjectiveBase):
    pass


class QualityObjectiveUpdate(BaseModel):
    metric_name: Optional[str] = None
    clause_reference: Optional[str] = None
    department: Optional[str] = None
    target_year: Optional[int] = None
    target_value: Optional[float] = None
    actual_value: Optional[float] = None
    unit: Optional[str] = None
    status: Optional[str] = None
    action_plan: Optional[str] = None
    responsible_person: Optional[str] = None


class QualityObjectiveResponse(QualityObjectiveBase):
    objective_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== 2. MANAGEMENT REVIEW SCHEMAS (Clause 9.3) ====================
class ManagementReviewBase(BaseModel):
    review_code: str = Field(..., description="Mã kỳ họp (e.g. MR-2026-Q1)")
    title: str = Field(..., description="Tiêu đề cuộc họp xem xét lãnh đạo")
    meeting_date: date = Field(default_factory=date.today, description="Ngày họp")
    chairperson_name: str = Field(default="Tổng Giám Đốc Trần Văn Hùng", description="Chủ trì cuộc họp")
    secretary_name: str = Field(default="Trưởng Ban ISO Nguyễn Văn An", description="Thư ký cuộc họp")
    participants: List[Dict[str, Any]] = Field(default_factory=list, description="Danh sách thành viên tham gia")
    scope_and_inputs: Dict[str, Any] = Field(default_factory=dict, description="6 nhóm đầu vào xem xét theo ISO 9.3.2")
    meeting_minutes: str = Field(..., description="Nội dung biên bản chi tiết")
    decisions_and_actions: List[Dict[str, Any]] = Field(default_factory=list, description="Nghị quyết & Quyết định hành động theo ISO 9.3.3")
    status: str = Field(default="DRAFT", description="Trạng thái biên bản (DRAFT, CONCLUDED, APPROVED)")


class ManagementReviewCreate(ManagementReviewBase):
    pass


class ManagementReviewUpdate(BaseModel):
    title: Optional[str] = None
    meeting_date: Optional[date] = None
    chairperson_name: Optional[str] = None
    secretary_name: Optional[str] = None
    participants: Optional[List[Dict[str, Any]]] = None
    scope_and_inputs: Optional[Dict[str, Any]] = None
    meeting_minutes: Optional[str] = None
    decisions_and_actions: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None


class ManagementReviewResponse(ManagementReviewBase):
    review_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== 3. EXECUTIVE OVERVIEW STATS SCHEMAS ====================
class ExecutiveAlertItem(BaseModel):
    alert_id: str
    category: str  # CAPA, CCP, CALIBRATION, SUPPLIER, QUARANTINE, HEALTH, AUDIT
    severity: str  # CRITICAL, WARNING, INFO
    title: str
    description: str
    action_url: str
    timestamp: str


class RadarPillars(BaseModel):
    context_leadership: float  # Điều khoản 4 & 5 (0-100%)
    planning_haccp: float      # Điều khoản 6 & 8.5 (0-100%)
    support_training: float    # Điều khoản 7 (0-100%)
    operation_prp: float       # Điều khoản 8 (0-100%)
    performance_audit: float   # Điều khoản 9 (0-100%)
    improvement_capa: float    # Điều khoản 10 (0-100%)
    supply_traceability: float # Chuỗi cung ứng & Kho (0-100%)


class ExecutiveOverviewStatsResponse(BaseModel):
    # Chỉ số sức khỏe tổng thể (FSMS Health Score Index 0-100%)
    overall_health_score: float
    health_level: str  # EXCELLENT, GOOD, AT_RISK, CRITICAL
    
    # 8 Phân Hệ Thống Kê Chi Tiết
    documents: Dict[str, Any]
    purchasing_iqc: Dict[str, Any]
    haccp_ccp: Dict[str, Any]
    prp_hygiene: Dict[str, Any]
    equipment_calibration: Dict[str, Any]
    inventory_traceability: Dict[str, Any]
    capa_nc: Dict[str, Any]
    audit_training_health: Dict[str, Any]

    # Ma trận 7 Trụ Cột Radar
    radar_pillars: RadarPillars
    
    # Xu Hướng Mối Nguy 6 Tháng
    hazard_trends: Dict[str, Any]
    
    # Mục Tiêu Chất Lượng Tóm Tắt
    objectives_summary: Dict[str, Any]
    
    # Cảnh Báo Khẩn Cấp
    total_active_alerts: int
    critical_alerts_count: int


# ==================== 4. EXECUTIVE AI ASSISTANTS SCHEMAS ====================
class AuditReadinessForecastRequest(BaseModel):
    target_standard: str = Field(default="ISO 22000:2018", description="Tiêu chuẩn đánh giá")
    audit_scope: Optional[str] = Field(default="Toàn bộ nhà máy chế biến thực phẩm", description="Phạm vi đánh giá")


class AuditReadinessForecastResponse(BaseModel):
    readiness_percentage: float
    confidence_level: str
    overall_assessment: str
    top_critical_risks: List[Dict[str, Any]]
    strengths_identified: List[str]
    immediate_remediation_plan: List[Dict[str, Any]]
    forecast_generated_at: str


class ManagementReviewReportRequest(BaseModel):
    review_period: str = Field(default="Quý 1/2026", description="Kỳ xem xét (e.g. Quý 1/2026 hoặc Năm 2026)")
    focus_areas: Optional[List[str]] = Field(default_factory=list, description="Trọng tâm xem xét")


class ManagementReviewReportResponse(BaseModel):
    report_title: str
    period: str
    executive_summary: str
    inputs_review_synthesis: Dict[str, Any]  # 6 nhóm đầu vào
    outputs_decisions_recommendations: List[Dict[str, Any]]  # Quyết định đầu ra
    resource_allocation_advice: str
    policy_revision_needed: bool
    full_markdown_report: str


class FSMSInsightsQueryRequest(BaseModel):
    question: str = Field(..., description="Câu hỏi của lãnh đạo / QA Manager")
    focus_module: Optional[str] = Field(default="ALL", description="Phân hệ trọng tâm")


class FSMSInsightsQueryResponse(BaseModel):
    question: str
    answer: str
    data_citations: List[Dict[str, Any]]
    suggested_actions: List[str]
    confidence_score: float


class SuggestQualityObjectivesRequest(BaseModel):
    target_year: int = Field(default=2026, description="Năm đề xuất mục tiêu")
    company_priority: Optional[str] = Field(default="Nâng cao tỷ lệ tuân thủ CCP và giảm thiểu khiếu nại dị nguyên", description="Định hướng chiến lược")


class SuggestQualityObjectivesResponse(BaseModel):
    target_year: int
    suggested_objectives: List[Dict[str, Any]]
    rationale: str
