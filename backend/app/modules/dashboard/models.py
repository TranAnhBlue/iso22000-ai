import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Text, Boolean, Integer, Float, Date, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class QualityObjective(Base):
    """
    Mục Tiêu Chất Lượng & An Toàn Thực Phẩm (ISO 22000:2018 Clause 6.2)
    Theo dõi chỉ tiêu định lượng hàng năm theo từng phòng ban và phân xưởng.
    """
    __tablename__ = "quality_objectives"

    objective_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    objective_code = Column(String(50), unique=True, nullable=False, index=True)
    metric_name = Column(String(255), nullable=False)
    clause_reference = Column(String(50), default="6.2", nullable=False)
    department = Column(String(100), default="Toàn nhà máy", nullable=False)
    target_year = Column(Integer, default=2026, nullable=False)
    target_value = Column(Float, nullable=False)
    actual_value = Column(Float, default=0.0, nullable=False)
    unit = Column(String(30), default="%", nullable=False)
    status = Column(String(30), default="ON_TRACK", nullable=False)  # ON_TRACK, ACHIEVED, AT_RISK, OFF_TRACK
    action_plan = Column(Text, nullable=True)
    responsible_person = Column(String(100), default="Trưởng Ban ISO", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ManagementReview(Base):
    """
    Họp Xem Xét Của Lãnh Đạo Về Hệ Thống FSMS (ISO 22000:2018 Clause 9.3)
    Lưu trữ biên bản họp, 6 nhóm đầu vào (9.3.2 Inputs) và nghị quyết đầu ra (9.3.3 Outputs).
    """
    __tablename__ = "management_reviews"

    review_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_code = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    meeting_date = Column(Date, default=date.today, nullable=False)
    chairperson_name = Column(String(100), default="Tổng Giám Đốc Trần Văn Hùng", nullable=False)
    secretary_name = Column(String(100), default="Trưởng Ban ISO Nguyễn Văn An", nullable=False)
    participants = Column(JSON, default=list, nullable=False)  # [{name, role, dept, attendance}]
    
    # 6 Nhóm Đầu Vào Xem Xét (ISO 22000 Clause 9.3.2)
    # { audit_summary, customer_feedback, ccp_prp_performance, capa_effectiveness, supplier_status, resource_adequacy }
    scope_and_inputs = Column(JSON, default=dict, nullable=False)
    
    meeting_minutes = Column(Text, nullable=False)
    
    # Nghị Quyết & Quyết Định Đầu Ra (ISO 22000 Clause 9.3.3)
    # [{ action_id, decision_text, assigned_to, deadline, resources_allocated, status }]
    decisions_and_actions = Column(JSON, default=list, nullable=False)
    
    status = Column(String(30), default="DRAFT", nullable=False)  # DRAFT, CONCLUDED, APPROVED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
