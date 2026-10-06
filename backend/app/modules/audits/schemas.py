from pydantic import BaseModel, Field, computed_field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
import uuid

# ==================== INTERNAL AUDITS ====================
class InternalAuditBase(BaseModel):
    audit_code: str
    title: str
    audit_type: str = "PERIODIC"
    start_date: date
    end_date: date
    lead_auditor_name: str = "Trưởng đoàn ĐGNB"
    lead_auditor_id: Optional[uuid.UUID] = None
    auditor_team: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    audited_dept: str
    audited_lead_name: Optional[str] = None
    scope: str
    standard_clauses: Optional[List[str]] = Field(default_factory=list)
    findings_summary: Optional[str] = None
    conclusion: Optional[str] = None
    status: str = "PLANNED"

class InternalAuditCreate(InternalAuditBase):
    pass

class InternalAuditUpdate(BaseModel):
    title: Optional[str] = None
    audit_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    lead_auditor_name: Optional[str] = None
    auditor_team: Optional[List[Dict[str, Any]]] = None
    audited_dept: Optional[str] = None
    audited_lead_name: Optional[str] = None
    scope: Optional[str] = None
    standard_clauses: Optional[List[str]] = None
    findings_summary: Optional[str] = None
    conclusion: Optional[str] = None
    status: Optional[str] = None

class InternalAuditOut(InternalAuditBase):
    audit_id: uuid.UUID
    created_at: Optional[datetime] = None
    total_findings: int = 0
    conformity_count: int = 0
    major_nc_count: int = 0
    minor_nc_count: int = 0
    ofi_count: int = 0

    class Config:
        from_attributes = True


# ==================== AUDIT FINDINGS ====================
class AuditFindingBase(BaseModel):
    audit_id: uuid.UUID
    clause_number: str
    clause_title: str
    department: str
    question: str
    evidence_reviewed: Optional[str] = None
    result: str = "CONFORMITY"
    finding_notes: Optional[str] = None
    linked_nc_id: Optional[uuid.UUID] = None

class AuditFindingCreate(AuditFindingBase):
    pass

class AuditFindingUpdate(BaseModel):
    clause_number: Optional[str] = None
    clause_title: Optional[str] = None
    department: Optional[str] = None
    question: Optional[str] = None
    evidence_reviewed: Optional[str] = None
    result: Optional[str] = None
    finding_notes: Optional[str] = None
    linked_nc_id: Optional[uuid.UUID] = None

class AuditFindingOut(AuditFindingBase):
    finding_id: uuid.UUID
    created_at: Optional[datetime] = None
    nc_number: Optional[str] = None
    nc_status: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== TRAINING COURSES ====================
class TrainingCourseBase(BaseModel):
    course_code: str
    title: str
    category: str = "HACCP_CCP"
    trainer_name: str
    training_type: str = "INTERNAL"
    schedule_date: date
    duration_hours: float = 4.0
    target_dept: str = "Phòng Sản Xuất & QA"
    content_summary: Optional[str] = None
    status: str = "PLANNED"

class TrainingCourseCreate(TrainingCourseBase):
    pass

class TrainingCourseUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    trainer_name: Optional[str] = None
    training_type: Optional[str] = None
    schedule_date: Optional[date] = None
    duration_hours: Optional[float] = None
    target_dept: Optional[str] = None
    content_summary: Optional[str] = None
    status: Optional[str] = None

class TrainingCourseOut(TrainingCourseBase):
    course_id: uuid.UUID
    created_at: Optional[datetime] = None
    total_participants: int = 0
    passed_participants: int = 0
    avg_score: float = 0.0

    class Config:
        from_attributes = True


# ==================== TRAINING PARTICIPANTS ====================
class TrainingParticipantBase(BaseModel):
    course_id: uuid.UUID
    employee_code: str
    employee_name: str
    department: str
    position: Optional[str] = None
    attendance_status: str = "ATTENDED"
    pre_test_score: Optional[float] = None
    post_test_score: Optional[float] = None
    evaluation_result: str = "PASSED"
    certificate_issued: bool = True
    notes: Optional[str] = None

class TrainingParticipantCreate(TrainingParticipantBase):
    pass

class TrainingParticipantUpdate(BaseModel):
    attendance_status: Optional[str] = None
    pre_test_score: Optional[float] = None
    post_test_score: Optional[float] = None
    evaluation_result: Optional[str] = None
    certificate_issued: Optional[bool] = None
    notes: Optional[str] = None

class TrainingParticipantOut(TrainingParticipantBase):
    participant_id: uuid.UUID
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== TRAINING REQUESTS (BM01-QTĐT) ====================
class TrainingRequestBase(BaseModel):
    request_code: Optional[str] = None
    department: str
    proposer_name: str
    course_name: str
    training_reason: str
    expected_duration: str = "0.5 ngày"
    attendee_count: int = 1
    target_participants: str
    expected_outcomes: str
    request_date: date = Field(default_factory=date.today)
    status: str = "SUBMITTED"  # SUBMITTED, APPROVED, REJECTED, COMPLETED
    approver_name: Optional[str] = None
    approval_date: Optional[date] = None
    approval_note: Optional[str] = None

class TrainingRequestCreate(TrainingRequestBase):
    pass

class TrainingRequestUpdate(BaseModel):
    department: Optional[str] = None
    proposer_name: Optional[str] = None
    course_name: Optional[str] = None
    training_reason: Optional[str] = None
    expected_duration: Optional[str] = None
    attendee_count: Optional[int] = None
    target_participants: Optional[str] = None
    expected_outcomes: Optional[str] = None
    request_date: Optional[date] = None
    status: Optional[str] = None
    approver_name: Optional[str] = None
    approval_date: Optional[date] = None
    approval_note: Optional[str] = None

class TrainingRequestOut(TrainingRequestBase):
    request_id: uuid.UUID
    created_at: Optional[datetime] = None

    @computed_field
    @property
    def target_audience_description(self) -> str:
        return self.target_participants

    @computed_field
    @property
    def requested_by_name(self) -> str:
        return self.proposer_name

    @computed_field
    @property
    def proposed_training_topics(self) -> str:
        return self.course_name

    class Config:
        from_attributes = True


# ==================== TRAINING EVALUATIONS (BM04-QTĐT) ====================
class TrainingEvaluationBase(BaseModel):
    course_id: Optional[uuid.UUID] = None
    employee_code: str
    employee_name: str
    department: str
    evaluator_name: Optional[str] = None
    evaluation_date: date = Field(default_factory=date.today)
    knowledge_score: int = Field(default=4, ge=1, le=5)
    skill_application_score: int = Field(default=4, ge=1, le=5)
    attitude_awareness_score: int = Field(default=5, ge=1, le=5)
    overall_rating: str = "DAT"  # DAT, KHONG_DAT, XUAT_SAC
    supervisor_feedback: Optional[str] = None
    need_retraining: bool = False

class TrainingEvaluationCreate(TrainingEvaluationBase):
    pass

class TrainingEvaluationUpdate(BaseModel):
    course_id: Optional[uuid.UUID] = None
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    department: Optional[str] = None
    evaluator_name: Optional[str] = None
    evaluation_date: Optional[date] = None
    knowledge_score: Optional[int] = None
    skill_application_score: Optional[int] = None
    attitude_awareness_score: Optional[int] = None
    overall_rating: Optional[str] = None
    supervisor_feedback: Optional[str] = None
    need_retraining: Optional[bool] = None

class TrainingEvaluationOut(TrainingEvaluationBase):
    evaluation_id: uuid.UUID
    course_title: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True



# ==================== HEALTH DECLARATIONS ====================
class HealthDeclarationBase(BaseModel):
    employee_code: str
    employee_name: str
    department: str
    shift_date: date
    shift_name: str = "Ca Sáng"
    symptoms: Dict[str, Any] = Field(default_factory=lambda: {
        "fever": False,
        "cough": False,
        "diarrhea": False,
        "vomiting": False,
        "open_wound": False,
        "skin_infection": False
    })
    body_temperature: float = 36.5
    personal_hygiene_check: Dict[str, Any] = Field(default_factory=lambda: {
        "nails_trimmed": True,
        "jewelry_removed": True,
        "clean_uniform": True
    })
    cleared_for_shift: str = "CLEARED"  # CLEARED, RESTRICTED, SUSPENDED
    supervisor_name: str = "Giám Sát Vệ Sinh Ca"
    notes: Optional[str] = None

class HealthDeclarationCreate(HealthDeclarationBase):
    pass

class HealthDeclarationUpdate(BaseModel):
    symptoms: Optional[Dict[str, Any]] = None
    body_temperature: Optional[float] = None
    personal_hygiene_check: Optional[Dict[str, Any]] = None
    cleared_for_shift: Optional[str] = None
    supervisor_name: Optional[str] = None
    notes: Optional[str] = None

class HealthDeclarationOut(HealthDeclarationBase):
    declaration_id: uuid.UUID
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== STATS & AI SCHEMAS ====================
class AuditStatsOut(BaseModel):
    total_audits: int
    completed_audits: int
    in_progress_audits: int
    planned_audits: int
    total_findings: int
    major_nc_count: int
    minor_nc_count: int
    ofi_count: int
    conformity_rate: float
    total_courses: int
    completed_courses: int
    total_learners: int
    passed_rate: float
    total_health_declarations: int
    today_cleared_count: int
    today_suspended_count: int

class AIChecklistRequest(BaseModel):
    clause_or_dept: str
    custom_context: Optional[str] = None

class AIEvaluateFindingRequest(BaseModel):
    finding_text: str
    clause_number: Optional[str] = None
    dept: Optional[str] = None

class AIQuizRequest(BaseModel):
    topic: str
    num_questions: int = 5
    difficulty: str = "MEDIUM"

class AIHealthRiskRequest(BaseModel):
    department: Optional[str] = None
    date_filter: Optional[date] = None
