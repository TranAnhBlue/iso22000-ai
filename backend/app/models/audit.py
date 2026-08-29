import uuid
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Text, Boolean, Integer, Numeric, Date, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class InternalAudit(Base):
    __tablename__ = "internal_audits"

    audit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()")
    )
    audit_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    audit_type: Mapped[str] = mapped_column(String(50), default="PERIODIC", nullable=False)  # PERIODIC, UNANNOUNCED, FOLLOW_UP, PRE_CERTIFICATION
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    lead_auditor_name: Mapped[str] = mapped_column(String(100), nullable=False, default="Trưởng đoàn ĐGNB")
    lead_auditor_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    auditor_team: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONB, default=list, nullable=True)  # [{"name": "...", "role": "Auditor", "dept": "QA"}]
    audited_dept: Mapped[str] = mapped_column(String(100), nullable=False)  # Phòng Sản Xuất, Phòng Kỹ Thuật, Kho, QA/QC
    audited_lead_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    scope: Mapped[str] = mapped_column(Text, nullable=False)
    standard_clauses: Mapped[Optional[List[str]]] = mapped_column(JSONB, default=list, nullable=True)  # ["Clause 4", "Clause 8.2", "Clause 8.5"]
    findings_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conclusion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PLANNED", nullable=False)  # PLANNED, IN_PROGRESS, REPORTING, COMPLETED, CLOSED
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))

    # Relationships
    findings: Mapped[List["AuditFinding"]] = relationship("AuditFinding", back_populates="audit", cascade="all, delete-orphan")


class AuditFinding(Base):
    __tablename__ = "audit_findings"

    finding_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()")
    )
    audit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("internal_audits.audit_id", ondelete="CASCADE"), nullable=False)
    clause_number: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "8.2.4", "8.5.1", "7.1.5"
    clause_title: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_reviewed: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result: Mapped[str] = mapped_column(String(50), default="CONFORMITY", nullable=False)  # CONFORMITY, MAJOR_NC, MINOR_NC, OFI
    finding_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    linked_nc_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("non_conformances.nc_id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))

    # Relationships
    audit: Mapped["InternalAudit"] = relationship("InternalAudit", back_populates="findings")


class TrainingCourse(Base):
    __tablename__ = "training_courses"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()")
    )
    course_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="HACCP_CCP", nullable=False)  # ISO_AWARENESS, HACCP_CCP, FOOD_HYGIENE_GMP, ALLERGEN_CONTROL, EQUIPMENT_OPERATION, EMERGENCY_RECALL
    trainer_name: Mapped[str] = mapped_column(String(100), nullable=False)
    training_type: Mapped[str] = mapped_column(String(50), default="INTERNAL", nullable=False)  # INTERNAL, EXTERNAL
    schedule_date: Mapped[date] = mapped_column(Date, nullable=False)
    duration_hours: Mapped[float] = mapped_column(Numeric(4, 1), default=4.0, nullable=False)
    target_dept: Mapped[str] = mapped_column(String(100), nullable=False, default="Phòng Sản Xuất & QA")
    content_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="PLANNED", nullable=False)  # PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))

    # Relationships
    participants: Mapped[List["TrainingParticipantRecord"]] = relationship("TrainingParticipantRecord", back_populates="course", cascade="all, delete-orphan")


class TrainingParticipantRecord(Base):
    __tablename__ = "training_participant_records"

    participant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()")
    )
    course_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("training_courses.course_id", ondelete="CASCADE"), nullable=False)
    employee_code: Mapped[str] = mapped_column(String(50), nullable=False)
    employee_name: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    position: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    attendance_status: Mapped[str] = mapped_column(String(50), default="ATTENDED", nullable=False)  # ATTENDED, ABSENT, EXCUSED
    pre_test_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 1), nullable=True)  # Thang 100
    post_test_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 1), nullable=True)  # Thang 100
    evaluation_result: Mapped[str] = mapped_column(String(50), default="PASSED", nullable=False)  # PASSED, FAILED, RE_TRAINING_REQUIRED
    certificate_issued: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))

    # Relationships
    course: Mapped["TrainingCourse"] = relationship("TrainingCourse", back_populates="participants")


class HealthDeclarationRecord(Base):
    __tablename__ = "health_declaration_records"

    declaration_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("uuid_generate_v4()")
    )
    employee_code: Mapped[str] = mapped_column(String(50), nullable=False)
    employee_name: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    shift_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    shift_name: Mapped[str] = mapped_column(String(50), nullable=False, default="Ca Sáng")  # Ca Sáng, Ca Chiều, Ca Đêm
    symptoms: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)  # {"fever": false, "cough": false, "diarrhea": false, "vomiting": false, "open_wound": false, "skin_infection": false}
    body_temperature: Mapped[float] = mapped_column(Numeric(4, 1), default=36.5, nullable=False)  # °C
    personal_hygiene_check: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)  # {"nails_trimmed": true, "jewelry_removed": true, "clean_uniform": true}
    cleared_for_shift: Mapped[str] = mapped_column(String(50), default="CLEARED", nullable=False)  # CLEARED, RESTRICTED, SUSPENDED
    supervisor_name: Mapped[str] = mapped_column(String(100), nullable=False, default="Giám Sát Vệ Sinh Ca")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))
