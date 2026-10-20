import uuid
from typing import Optional, List
from datetime import datetime, date
from sqlalchemy import Integer, String, Text, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.core.database import Base

class InterestedParty(Base):
    """
    Điều khoản 4.2 ISO 22000:2018 - Nhu cầu và mong đợi của các bên quan tâm
    (Căn cứ biểu mẫu Phụ lục 1: Bảng theo dõi bối cảnh nội bộ và bên ngoài)
    """
    __tablename__ = "interested_parties"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    party_name: Mapped[str] = mapped_column(String(255), nullable=False)
    party_type: Mapped[str] = mapped_column(String(50), nullable=False, default="EXTERNAL")
    needs_and_expectations: Mapped[str] = mapped_column(Text, nullable=False)
    statutory_requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    monitoring_method: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    review_frequency: Mapped[Optional[str]] = mapped_column(String(100), default="Hàng năm")
    responsible_role: Mapped[Optional[str]] = mapped_column(String(150), default="Ban QLCL & ATTP")
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE")
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    context_risks: Mapped[List["ContextRisk"]] = relationship("ContextRisk", back_populates="interested_party")


class ContextRisk(Base):
    """
    Điều khoản 4.1 & 6.1 ISO 22000:2018 - Bối cảnh tổ chức và Hành động giải quyết rủi ro & cơ hội
    (Căn cứ Phụ lục 2 & 4: Phiếu xác định, đánh giá rủi ro và cơ hội hệ thống ATTP)
    Ma trận rủi ro: L (1-5) x S (1-5) = R (1-25)
    """
    __tablename__ = "context_risks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    issue_category: Mapped[str] = mapped_column(String(50), nullable=False, default="EXTERNAL")
    issue_description: Mapped[str] = mapped_column(Text, nullable=False)
    interested_party_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("interested_parties.id", ondelete="SET NULL"), nullable=True)
    risk_description: Mapped[str] = mapped_column(Text, nullable=False)
    opportunity_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    likelihood: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    severity: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=6)
    treatment_strategy: Mapped[Optional[str]] = mapped_column(String(50), default="MITIGATE")
    action_plan: Mapped[str] = mapped_column(Text, nullable=False)
    responsible_role: Mapped[Optional[str]] = mapped_column(String(150), default="Ban QLCL & ATTP")
    target_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="TREATING")
    residual_likelihood: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    residual_severity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    residual_risk_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    interested_party: Mapped[Optional["InterestedParty"]] = relationship("InterestedParty", back_populates="context_risks")


class CommunicationLog(Base):
    """
    Điều khoản 7.4 ISO 22000:2018 - Trao đổi thông tin ATTP (Nội bộ & Bên ngoài)
    Theo dõi truyền thông với Cơ quan nhà nước, Khách hàng, NCC, Người tiêu dùng và nội bộ nhân viên
    """
    __tablename__ = "communications_log"

    comm_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comm_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    direction: Mapped[str] = mapped_column(String(20), nullable=False, default="EXTERNAL")
    party_type: Mapped[str] = mapped_column(String(30), nullable=False, default="GOVERNMENT")
    party_name: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    communication_date: Mapped[date] = mapped_column(Date, nullable=False)
    method: Mapped[str] = mapped_column(String(30), nullable=False, default="EMAIL")
    responsible_person: Mapped[str] = mapped_column(String(100), nullable=False)
    related_nc_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("non_conformances.nc_id", ondelete="SET NULL"), nullable=True)
    attachment_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="SENT")
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FoodSafetyTeamMember(Base):
    """
    Điều khoản 5.3 ISO 22000:2018 - Đội an toàn thực phẩm & Trách nhiệm quyền hạn
    Căn cứ Quyết định thành lập Đội ATTP số 02/QĐ-ATTP của Ban Giám Đốc
    """
    __tablename__ = "food_safety_team_members"

    member_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    member_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role_in_team: Mapped[str] = mapped_column(String(50), nullable=False, default="MEMBER")
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    current_position: Mapped[str] = mapped_column(String(100), nullable=False)
    qualification_and_training: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    responsibility_description: Mapped[str] = mapped_column(Text, nullable=False)
    appointment_decision_code: Mapped[str] = mapped_column(String(50), default="02/QĐ-ATTP-2026", nullable=False)
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
