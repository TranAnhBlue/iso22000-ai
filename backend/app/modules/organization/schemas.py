from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any, Union
from datetime import date, datetime
import uuid

# Schema Người dùng
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    username: str
    dept: str
    role_code: str
    role: str
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str

class UserCreate(BaseModel):
    name: str
    username: str
    password: str = "123456"
    dept: str
    role_code: str
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str = "Hoạt động"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    dept: Optional[str] = None
    role_code: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None

# Schema Phòng ban
class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    role_code: str
    count: int = 0
    head: str = ""
    description: Optional[str] = None

class DepartmentCreate(BaseModel):
    name: str
    head: Optional[str] = "Chưa bổ nhiệm"
    role_code: Optional[str] = None
    description: Optional[str] = None

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    head: Optional[str] = None
    description: Optional[str] = None

# ==================== CÁC BÊN QUAN TÂM (CLAUSE 4.2) ====================
class InterestedPartyBase(BaseModel):
    party_name: str
    party_type: str = "EXTERNAL"  # INTERNAL | EXTERNAL
    needs_and_expectations: str
    statutory_requirements: Optional[str] = None
    monitoring_method: Optional[str] = None
    review_frequency: Optional[str] = "Hàng năm"
    responsible_role: Optional[str] = "Ban QLCL & ATTP"
    status: Optional[str] = "ACTIVE"

class InterestedPartyCreate(InterestedPartyBase):
    pass

class InterestedPartyUpdate(BaseModel):
    party_name: Optional[str] = None
    party_type: Optional[str] = None
    needs_and_expectations: Optional[str] = None
    statutory_requirements: Optional[str] = None
    monitoring_method: Optional[str] = None
    review_frequency: Optional[str] = None
    responsible_role: Optional[str] = None
    status: Optional[str] = None

class InterestedPartyResponse(InterestedPartyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# ==================== RỦI RO & CƠ HỘI BỐI CẢNH (CLAUSE 4.1 & 6.1) ====================
class ContextRiskBase(BaseModel):
    code: str
    issue_category: str = "EXTERNAL"  # INTERNAL | EXTERNAL
    issue_description: str
    interested_party_id: Optional[int] = None
    risk_description: str
    opportunity_description: Optional[str] = None
    likelihood: int = 2
    severity: int = 3
    treatment_strategy: str = "MITIGATE"  # MITIGATE | ACCEPT | AVOID | TRANSFER
    action_plan: str
    responsible_role: Optional[str] = "Ban QLCL & ATTP"
    target_date: Optional[str] = None
    status: Optional[str] = "TREATING"  # IDENTIFIED | TREATING | CONTROLLED | CLOSED
    residual_likelihood: Optional[int] = None
    residual_severity: Optional[int] = None

class ContextRiskCreate(ContextRiskBase):
    pass

class ContextRiskUpdate(BaseModel):
    code: Optional[str] = None
    issue_category: Optional[str] = None
    issue_description: Optional[str] = None
    interested_party_id: Optional[int] = None
    risk_description: Optional[str] = None
    opportunity_description: Optional[str] = None
    likelihood: Optional[int] = None
    severity: Optional[int] = None
    treatment_strategy: Optional[str] = None
    action_plan: Optional[str] = None
    responsible_role: Optional[str] = None
    target_date: Optional[str] = None
    status: Optional[str] = None
    residual_likelihood: Optional[int] = None
    residual_severity: Optional[int] = None

class ContextRiskResponse(ContextRiskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    risk_score: int
    residual_risk_score: Optional[int] = None
    party_name: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class ContextStatsResponse(BaseModel):
    total_parties: int
    internal_parties: int
    external_parties: int
    total_risks: int
    high_risks: int
    controlled_risks: int

# ==================== TRAO ĐỔI THÔNG TIN (CLAUSE 7.4) ====================
class CommunicationLogBase(BaseModel):
    direction: str = "EXTERNAL"  # INTERNAL | EXTERNAL
    party_type: str = "GOVERNMENT"  # GOVERNMENT | CUSTOMER | SUPPLIER | EMPLOYEE | MEDIA | OTHER
    party_name: str
    subject: str
    content: str
    communication_date: date
    method: str = "EMAIL"  # EMAIL | PHONE | MEETING | LETTER | OFFICIAL_DISPATCH | OTHER
    responsible_person: str
    related_nc_id: Optional[uuid.UUID] = None
    attachment_url: Optional[str] = None
    status: str = "SENT"  # SENT | RECEIVED | ACKNOWLEDGED

class CommunicationLogCreate(CommunicationLogBase):
    comm_code: Optional[str] = None

class CommunicationLogUpdate(BaseModel):
    direction: Optional[str] = None
    party_type: Optional[str] = None
    party_name: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None
    communication_date: Optional[date] = None
    method: Optional[str] = None
    responsible_person: Optional[str] = None
    related_nc_id: Optional[uuid.UUID] = None
    attachment_url: Optional[str] = None
    status: Optional[str] = None

class CommunicationLogResponse(CommunicationLogBase):
    model_config = ConfigDict(from_attributes=True)

    comm_id: uuid.UUID
    comm_code: str
    created_at: Optional[datetime] = None

# ==================== ĐỘI AN TOÀN THỰC PHẨM (CLAUSE 5.3 & QĐ 02) ====================
class FoodSafetyTeamMemberBase(BaseModel):
    member_name: Optional[str] = None
    role_in_team: Optional[str] = "MEMBER"  # TEAM_LEADER | VICE_LEADER | SECRETARY | MEMBER
    department: Optional[str] = None
    current_position: Optional[str] = None
    qualification_and_training: Optional[str] = None
    responsibility_description: Optional[str] = None
    appointment_decision_code: Optional[str] = "02/QĐ-ATTP-2026"
    appointment_date: Optional[Union[date, str]] = None
    status: Optional[str] = "ACTIVE"
    user_id: Optional[uuid.UUID] = None

    # Alternate fields mapped for frontend convenience
    full_name: Optional[str] = None
    role: Optional[str] = None
    job_title: Optional[str] = None
    qualification: Optional[str] = None
    responsibilities: Optional[str] = None
    decision_number: Optional[str] = None
    decision_date: Optional[Union[date, str]] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class FoodSafetyTeamMemberCreate(FoodSafetyTeamMemberBase):
    pass

class FoodSafetyTeamMemberUpdate(BaseModel):
    member_name: Optional[str] = None
    role_in_team: Optional[str] = None
    department: Optional[str] = None
    current_position: Optional[str] = None
    qualification_and_training: Optional[str] = None
    responsibility_description: Optional[str] = None
    appointment_decision_code: Optional[str] = None
    appointment_date: Optional[Union[date, str]] = None
    status: Optional[str] = None
    user_id: Optional[uuid.UUID] = None

    full_name: Optional[str] = None
    role: Optional[str] = None
    job_title: Optional[str] = None
    qualification: Optional[str] = None
    responsibilities: Optional[str] = None
    decision_number: Optional[str] = None
    decision_date: Optional[Union[date, str]] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class FoodSafetyTeamMemberResponse(FoodSafetyTeamMemberBase):
    model_config = ConfigDict(from_attributes=True)

    member_id: uuid.UUID
    id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None

