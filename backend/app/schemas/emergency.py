import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from uuid import UUID


# ==================== EMERGENCY CONTACT SCHEMAS ====================
class EmergencyContactBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    organization_or_role: str
    phone: str
    phone_alt: Optional[str] = None
    email: Optional[str] = None
    contact_type: str = "INTERNAL"  # INTERNAL, EXTERNAL
    priority_order: int = 1
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True

class EmergencyContactCreate(EmergencyContactBase):
    pass

class EmergencyContactUpdate(BaseModel):
    name: Optional[str] = None
    organization_or_role: Optional[str] = None
    phone: Optional[str] = None
    phone_alt: Optional[str] = None
    email: Optional[str] = None
    contact_type: Optional[str] = None
    priority_order: Optional[int] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class EmergencyContactResponse(EmergencyContactBase):
    contact_id: UUID
    created_at: Optional[datetime] = None


# ==================== EMERGENCY PROCEDURE SCHEMAS ====================
class EmergencyProcedureBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    procedure_code: str
    title: str
    scenario_type: str
    likelihood: int = 2
    severity: int = 3
    risk_score: int = 6
    risk_level: str = "MEDIUM"
    immediate_actions: Optional[List[Dict[str, Any]]] = None
    responsible_team: str = "Đội Ứng phó Khẩn cấp & PCCC"
    equipment_needed: Optional[str] = None
    version: str = "1.0"
    status: str = "ACTIVE"

class EmergencyProcedureCreate(EmergencyProcedureBase):
    pass

class EmergencyProcedureUpdate(BaseModel):
    procedure_code: Optional[str] = None
    title: Optional[str] = None
    scenario_type: Optional[str] = None
    likelihood: Optional[int] = None
    severity: Optional[int] = None
    risk_score: Optional[int] = None
    risk_level: Optional[str] = None
    immediate_actions: Optional[List[Dict[str, Any]]] = None
    responsible_team: Optional[str] = None
    equipment_needed: Optional[str] = None
    version: Optional[str] = None
    status: Optional[str] = None

class EmergencyProcedureResponse(EmergencyProcedureBase):
    procedure_id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ==================== EMERGENCY DRILL SCHEMAS ====================
class EmergencyDrillBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    drill_code: str
    title: str
    record_type: str = "PLANNED_DRILL"  # PLANNED_DRILL, ACTUAL_INCIDENT
    scenario_type: str
    drill_date: date
    location: str
    participants_count: int = 10
    drill_leader: str
    scenario_description: Optional[str] = None
    response_time_minutes: Optional[int] = None
    evaluation_result: str = "SATISFACTORY"  # EXCELLENT, SATISFACTORY, NEEDS_IMPROVEMENT
    corrective_actions_needed: Optional[str] = None
    notes: Optional[str] = None

class EmergencyDrillCreate(EmergencyDrillBase):
    pass

class EmergencyDrillUpdate(BaseModel):
    drill_code: Optional[str] = None
    title: Optional[str] = None
    record_type: Optional[str] = None
    scenario_type: Optional[str] = None
    drill_date: Optional[date] = None
    location: Optional[str] = None
    participants_count: Optional[int] = None
    drill_leader: Optional[str] = None
    scenario_description: Optional[str] = None
    response_time_minutes: Optional[int] = None
    evaluation_result: Optional[str] = None
    corrective_actions_needed: Optional[str] = None
    notes: Optional[str] = None

class EmergencyDrillResponse(EmergencyDrillBase):
    drill_id: UUID
    created_at: Optional[datetime] = None


# ==================== STATS SCHEMA ====================
class EmergencyStatsResponse(BaseModel):
    total_contacts: int
    internal_contacts: int
    external_contacts: int
    total_procedures: int
    high_risk_scenarios: int
    total_drills_this_year: int
    last_drill_date: Optional[date] = None
