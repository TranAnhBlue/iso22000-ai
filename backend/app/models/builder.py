import uuid
from typing import Optional, List, Any
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, Numeric, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.user import User

# ==================== 1. DYNAMIC FORM TEMPLATE ====================
class DynamicFormTemplate(Base):
    __tablename__ = "dynamic_form_templates"

    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module: Mapped[str] = mapped_column(String(50), nullable=False)  # HACCP, PRP, IQC, SUPPLIER_AUDIT, EQUIPMENT, CAPA, INTERNAL_AUDIT, GENERAL
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # FORM-CCP-01, FORM-GMP-01, FORM-IQC-01
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    
    # JSON schema of form fields: [{id, name, label, type, required, options, min_val, max_val, unit, default_value, placeholder}]
    fields: Mapped[Any] = mapped_column(JSONB, nullable=False)
    
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, DRAFT, ARCHIVED
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    author: Mapped[Optional[User]] = relationship("User", foreign_keys=[created_by], lazy="joined")
    submissions: Mapped[List["DynamicFormSubmission"]] = relationship("DynamicFormSubmission", back_populates="template", cascade="all, delete-orphan")


# ==================== 2. DYNAMIC FORM SUBMISSION ====================
class DynamicFormSubmission(Base):
    __tablename__ = "dynamic_form_submissions"

    submission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dynamic_form_templates.template_id", ondelete="CASCADE"), nullable=False)
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Associated batch_number, ccp_id, eq_id, etc.
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # BATCH, CCP, EQUIPMENT, SUPPLIER, AUDIT
    submitted_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    submitted_by_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Form input values submitted: {field_id: value, ...}
    form_data: Mapped[Any] = mapped_column(JSONB, nullable=False)
    score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)  # Score or compliance % if graded
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED", nullable=False)  # COMPLETED, PENDING_REVIEW, REJECTED
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    template: Mapped["DynamicFormTemplate"] = relationship("DynamicFormTemplate", back_populates="submissions", lazy="joined")
    submitter: Mapped[Optional[User]] = relationship("User", foreign_keys=[submitted_by], lazy="joined")


# ==================== 3. DYNAMIC WORKFLOW TEMPLATE ====================
class DynamicWorkflowTemplate(Base):
    __tablename__ = "dynamic_workflow_templates"

    workflow_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module: Mapped[str] = mapped_column(String(50), nullable=False)  # HACCP_FLOW, DOC_APPROVAL, SUPPLIER_APPROVAL, CAPA_FLOW, AUDIT_FLOW, GENERAL
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)  # WF-HACCP-01, WF-SOP-01, WF-CAPA-01
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    
    # Workflow Nodes: [{id, type, label, role, description, conditions, is_ccp, step_number}]
    nodes: Mapped[Any] = mapped_column(JSONB, nullable=False)
    
    # Workflow Edges: [{id, source, target, label, condition}]
    edges: Mapped[Any] = mapped_column(JSONB, nullable=False)
    
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, DRAFT, ARCHIVED
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    author: Mapped[Optional[User]] = relationship("User", foreign_keys=[created_by], lazy="joined")
    instances: Mapped[List["WorkflowInstance"]] = relationship("WorkflowInstance", back_populates="workflow", cascade="all, delete-orphan")


# ==================== 4. WORKFLOW INSTANCE (RUNNING WORKFLOW EXECUTION) ====================
class WorkflowInstance(Base):
    __tablename__ = "workflow_instances"

    instance_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("dynamic_workflow_templates.workflow_id", ondelete="CASCADE"), nullable=False)
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Associated doc_code, nc_id, batch_number
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    current_node_id: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Execution history: [{node_id, action, action_by, action_at, comments}]
    history: Mapped[Any] = mapped_column(JSONB, default=list, nullable=False)
    
    status: Mapped[str] = mapped_column(String(30), default="IN_PROGRESS", nullable=False)  # IN_PROGRESS, COMPLETED, REJECTED, CANCELLED
    started_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workflow: Mapped["DynamicWorkflowTemplate"] = relationship("DynamicWorkflowTemplate", back_populates="instances", lazy="joined")
    initiator: Mapped[Optional[User]] = relationship("User", foreign_keys=[started_by], lazy="joined")
