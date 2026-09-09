import uuid
from sqlalchemy import Column, Integer, String, Text, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class InterestedParty(Base):
    """
    Điều khoản 4.2 ISO 22000:2018 - Nhu cầu và mong đợi của các bên quan tâm
    (Căn cứ biểu mẫu Phụ lục 1: Bảng theo dõi bối cảnh nội bộ và bên ngoài)
    """
    __tablename__ = "interested_parties"

    id = Column(Integer, primary_key=True, index=True)
    party_name = Column(String(255), nullable=False, comment="Tên bên quan tâm")
    party_type = Column(String(50), nullable=False, default="EXTERNAL", comment="INTERNAL | EXTERNAL")
    needs_and_expectations = Column(Text, nullable=False, comment="Nhu cầu và kỳ vọng về ATTP")
    statutory_requirements = Column(Text, nullable=True, comment="Yêu cầu luật định chế định liên quan")
    monitoring_method = Column(Text, nullable=True, comment="Phương pháp theo dõi & rà soát")
    review_frequency = Column(String(100), default="Hàng năm", comment="Tần suất rà soát")
    responsible_role = Column(String(150), default="Ban QLCL & ATTP", comment="Vị trí/bộ phận phụ trách")
    status = Column(String(50), default="ACTIVE", comment="ACTIVE | INACTIVE")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    context_risks = relationship("ContextRisk", back_populates="interested_party")


class ContextRisk(Base):
    """
    Điều khoản 4.1 & 6.1 ISO 22000:2018 - Bối cảnh tổ chức và Hành động giải quyết rủi ro & cơ hội
    (Căn cứ Phụ lục 2 & 4: Phiếu xác định, đánh giá rủi ro và cơ hội hệ thống ATTP)
    Ma trận rủi ro: L (1-5) x S (1-5) = R (1-25)
    """
    __tablename__ = "context_risks"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False, comment="Mã rủi ro CR-01")
    issue_category = Column(String(50), nullable=False, default="EXTERNAL", comment="INTERNAL | EXTERNAL")
    issue_description = Column(Text, nullable=False, comment="Vấn đề bối cảnh (công nghệ, pháp lý, văn hóa ATTP...)")
    interested_party_id = Column(Integer, ForeignKey("interested_parties.id", ondelete="SET NULL"), nullable=True)
    risk_description = Column(Text, nullable=False, comment="Nguy cơ/Rủi ro đối với FSMS và mục tiêu ATTP")
    opportunity_description = Column(Text, nullable=True, comment="Cơ hội cải tiến nếu xử lý tốt")
    likelihood = Column(Integer, nullable=False, default=2, comment="Khả năng 1-5")
    severity = Column(Integer, nullable=False, default=3, comment="Mức độ nghiêm trọng 1-5")
    risk_score = Column(Integer, nullable=False, default=6, comment="Điểm rủi ro L x S")
    treatment_strategy = Column(String(50), default="MITIGATE", comment="MITIGATE | ACCEPT | AVOID | TRANSFER")
    action_plan = Column(Text, nullable=False, comment="Kế hoạch hành động ứng phó & kiểm soát")
    responsible_role = Column(String(150), default="Ban QLCL & ATTP", comment="Người/Bộ phận phụ trách")
    target_date = Column(Date, nullable=True, comment="Thời hạn hoàn thành")
    status = Column(String(50), default="TREATING", comment="IDENTIFIED | TREATING | CONTROLLED | CLOSED")
    residual_likelihood = Column(Integer, nullable=True, comment="Khả năng sau xử lý 1-5")
    residual_severity = Column(Integer, nullable=True, comment="Mức độ sau xử lý 1-5")
    residual_risk_score = Column(Integer, nullable=True, comment="Điểm rủi ro còn lại")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    interested_party = relationship("InterestedParty", back_populates="context_risks")


class CommunicationLog(Base):
    """
    Điều khoản 7.4 ISO 22000:2018 - Trao đổi thông tin ATTP (Nội bộ & Bên ngoài)
    Theo dõi truyền thông với Cơ quan nhà nước, Khách hàng, NCC, Người tiêu dùng và nội bộ nhân viên
    """
    __tablename__ = "communications_log"

    comm_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comm_code = Column(String(50), unique=True, index=True, nullable=False)  # COMM-2026-001
    direction = Column(String(20), nullable=False, default="EXTERNAL")  # INTERNAL, EXTERNAL
    party_type = Column(String(30), nullable=False, default="GOVERNMENT")  # GOVERNMENT, CUSTOMER, SUPPLIER, EMPLOYEE, MEDIA, OTHER
    party_name = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    communication_date = Column(Date, nullable=False)
    method = Column(String(30), nullable=False, default="EMAIL")  # EMAIL, PHONE, MEETING, LETTER, OFFICIAL_DISPATCH, OTHER
    responsible_person = Column(String(100), nullable=False)
    related_nc_id = Column(UUID(as_uuid=True), ForeignKey("non_conformances.nc_id", ondelete="SET NULL"), nullable=True)
    attachment_url = Column(String(500), nullable=True)
    status = Column(String(30), nullable=False, default="SENT")  # SENT, RECEIVED, ACKNOWLEDGED
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FoodSafetyTeamMember(Base):
    """
    Điều khoản 5.3 ISO 22000:2018 - Đội an toàn thực phẩm & Trách nhiệm quyền hạn
    Căn cứ Quyết định thành lập Đội ATTP số 02/QĐ-ATTP của Ban Giám Đốc
    """
    __tablename__ = "food_safety_team_members"

    member_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    member_name = Column(String(100), nullable=False)
    role_in_team = Column(String(50), nullable=False, default="MEMBER")  # TEAM_LEADER, SECRETARY, MEMBER
    department = Column(String(100), nullable=False)
    current_position = Column(String(100), nullable=False)  # Chức vụ hiện tại
    qualification_and_training = Column(Text, nullable=True)  # Trình độ, tập huấn ISO 22000/HACCP
    responsibility_description = Column(Text, nullable=False)  # Nhiệm vụ cụ thể theo Điều 3 QĐ 02
    appointment_decision_code = Column(String(50), default="02/QĐ-ATTP-2026", nullable=False)
    appointment_date = Column(Date, nullable=False)
    status = Column(String(30), default="ACTIVE", nullable=False)  # ACTIVE, INACTIVE
    created_at = Column(DateTime(timezone=True), server_default=func.now())
