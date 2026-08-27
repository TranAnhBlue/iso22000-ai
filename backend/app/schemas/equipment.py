from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import date, datetime


# ==================== 1. EQUIPMENT SCHEMAS ====================
class EquipmentBase(BaseModel):
    equipment_code: str = Field(..., min_length=2, max_length=50, description="Mã số thiết bị, ví dụ EQ-STER-01")
    equipment_name: str = Field(..., min_length=2, max_length=200, description="Tên thiết bị")
    category: str = Field("PROCESSING", description="MEASURING, PROCESSING, STORAGE, UTILITY")
    model: Optional[str] = None
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    installation_location: Optional[str] = Field(None, description="Vị trí lắp đặt xưởng")
    installation_date: Optional[date] = None
    criticality_level: str = Field("MEDIUM_OPRP", description="HIGH_CCP, MEDIUM_OPRP, LOW_PRP")
    status: str = Field("OPERATIONAL", description="OPERATIONAL, MAINTENANCE, CALIBRATION_OVERDUE, DECOMMISSIONED")
    calibration_frequency_months: int = Field(12, ge=1, le=120, description="Chu kỳ hiệu chuẩn theo tháng")
    last_calibration_date: Optional[date] = None
    next_calibration_due: Optional[date] = None
    calibration_status: str = Field("VALID", description="VALID, EXPIRING_SOON, EXPIRED")
    maintenance_frequency_days: int = Field(30, ge=1, le=1825, description="Chu kỳ bảo trì theo ngày")
    last_maintenance_date: Optional[date] = None
    next_maintenance_due: Optional[date] = None
    managed_by: Optional[UUID] = None
    specifications: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

    @field_validator(
        "installation_date",
        "last_calibration_date",
        "next_calibration_due",
        "last_maintenance_date",
        "next_maintenance_due",
        "managed_by",
        "model",
        "serial_number",
        "manufacturer",
        "installation_location",
        "notes",
        mode="before"
    )
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

    @field_validator("equipment_code", "equipment_name", mode="before")
    @classmethod
    def validate_strings(cls, v, info):
        if not v or (isinstance(v, str) and not v.strip()):
            field_label = "Mã thiết bị" if info.field_name == "equipment_code" else "Tên thiết bị"
            raise ValueError(f"{field_label} là bắt buộc và không được để trống")
        return v.strip()

    @model_validator(mode="after")
    def validate_dates(self):
        if self.last_calibration_date and self.next_calibration_due:
            if self.next_calibration_due < self.last_calibration_date:
                raise ValueError("Hạn hiệu chuẩn kế tiếp phải lớn hơn hoặc bằng Ngày hiệu chuẩn gần nhất")
        if self.last_maintenance_date and self.next_maintenance_due:
            if self.next_maintenance_due < self.last_maintenance_date:
                raise ValueError("Hạn bảo trì kế tiếp phải lớn hơn hoặc bằng Ngày bảo dưỡng gần nhất")
        return self


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    equipment_code: Optional[str] = None
    equipment_name: Optional[str] = None
    category: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    manufacturer: Optional[str] = None
    installation_location: Optional[str] = None
    installation_date: Optional[date] = None
    criticality_level: Optional[str] = None
    status: Optional[str] = None
    calibration_frequency_months: Optional[int] = Field(None, ge=1, le=120)
    last_calibration_date: Optional[date] = None
    next_calibration_due: Optional[date] = None
    calibration_status: Optional[str] = None
    maintenance_frequency_days: Optional[int] = Field(None, ge=1, le=1825)
    last_maintenance_date: Optional[date] = None
    next_maintenance_due: Optional[date] = None
    managed_by: Optional[UUID] = None
    specifications: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

    @field_validator(
        "installation_date",
        "last_calibration_date",
        "next_calibration_due",
        "last_maintenance_date",
        "next_maintenance_due",
        "managed_by",
        "model",
        "serial_number",
        "manufacturer",
        "installation_location",
        "notes",
        mode="before"
    )
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

    @model_validator(mode="after")
    def validate_dates(self):
        if self.last_calibration_date and self.next_calibration_due:
            if self.next_calibration_due < self.last_calibration_date:
                raise ValueError("Hạn hiệu chuẩn kế tiếp phải lớn hơn hoặc bằng Ngày hiệu chuẩn gần nhất")
        if self.last_maintenance_date and self.next_maintenance_due:
            if self.next_maintenance_due < self.last_maintenance_date:
                raise ValueError("Hạn bảo trì kế tiếp phải lớn hơn hoặc bằng Ngày bảo dưỡng gần nhất")
        return self


class EquipmentResponse(EquipmentBase):
    model_config = ConfigDict(from_attributes=True)

    equipment_id: UUID
    manager_name: Optional[str] = None
    days_until_calibration: Optional[int] = None
    days_until_maintenance: Optional[int] = None
    total_maintenance_logs: int = 0
    total_calibration_logs: int = 0
    created_at: Optional[datetime] = None


# ==================== 2. MAINTENANCE LOG SCHEMAS ====================
class EquipmentMaintenanceLogBase(BaseModel):
    equipment_id: UUID
    maintenance_code: str = Field(..., min_length=2, max_length=50, description="Mã phiếu bảo trì, ví dụ MAINT-2026-001")
    maintenance_type: str = Field("PREVENTIVE", description="PREVENTIVE, CORRECTIVE, LUBRICATION, OVERHAUL")
    maintenance_date: date
    performed_by: Optional[UUID] = None
    performer_name: Optional[str] = Field(None, max_length=100)
    tasks_performed: Optional[List[Dict[str, Any]]] = None
    parts_replaced: Optional[List[Dict[str, Any]]] = None
    food_grade_lubricant_used: bool = True
    hygiene_sanitation_after_maint: bool = True
    cost: Optional[float] = Field(0.0, ge=0)
    result_status: str = Field("SUCCESS", description="SUCCESS, NEED_FOLLOWUP, FAILED")
    notes: Optional[str] = None

    @field_validator("performer_name", "notes", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

    @field_validator("maintenance_code", mode="before")
    @classmethod
    def validate_code(cls, v):
        if not v or (isinstance(v, str) and not v.strip()):
            raise ValueError("Mã phiếu bảo trì là bắt buộc")
        return v.strip()


class EquipmentMaintenanceLogCreate(EquipmentMaintenanceLogBase):
    pass


class EquipmentMaintenanceLogUpdate(BaseModel):
    maintenance_type: Optional[str] = None
    maintenance_date: Optional[date] = None
    performed_by: Optional[UUID] = None
    performer_name: Optional[str] = None
    tasks_performed: Optional[List[Dict[str, Any]]] = None
    parts_replaced: Optional[List[Dict[str, Any]]] = None
    food_grade_lubricant_used: Optional[bool] = None
    hygiene_sanitation_after_maint: Optional[bool] = None
    cost: Optional[float] = Field(None, ge=0)
    result_status: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("performer_name", "notes", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v


class EquipmentMaintenanceLogResponse(EquipmentMaintenanceLogBase):
    model_config = ConfigDict(from_attributes=True)

    maintenance_id: UUID
    equipment_code: Optional[str] = None
    equipment_name: Optional[str] = None
    installation_location: Optional[str] = None
    performer_display_name: Optional[str] = None
    created_at: Optional[datetime] = None


# ==================== 3. CALIBRATION LOG SCHEMAS ====================
class EquipmentCalibrationLogBase(BaseModel):
    equipment_id: UUID
    calibration_code: str = Field(..., min_length=2, max_length=50, description="Mã số phiếu hiệu chuẩn, ví dụ CAL-2026-001")
    calibration_type: str = Field("EXTERNAL", description="INTERNAL, EXTERNAL")
    calibration_date: date
    expiry_date: date
    agency_name: Optional[str] = Field(None, max_length=200)
    certificate_number: Optional[str] = Field(None, max_length=100)
    standard_applied: str = Field("ISO/IEC 17025 / TCVN", max_length=100)
    measured_deviation: Optional[float] = None
    allowable_tolerance: Optional[float] = None
    is_passed: bool = True
    status: str = Field("PASSED", description="PASSED, FAILED, ADJUSTED")
    certificate_file_url: Optional[str] = None
    calibrated_by: Optional[UUID] = None
    calibrator_name: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None

    @field_validator("agency_name", "certificate_number", "calibrator_name", "certificate_file_url", "notes", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

    @field_validator("calibration_code", mode="before")
    @classmethod
    def validate_code(cls, v):
        if not v or (isinstance(v, str) and not v.strip()):
            raise ValueError("Mã số phiếu hiệu chuẩn là bắt buộc")
        return v.strip()

    @model_validator(mode="after")
    def validate_expiry(self):
        if self.expiry_date < self.calibration_date:
            raise ValueError("Ngày hết hạn kiểm định phải lớn hơn hoặc bằng Ngày hiệu chuẩn")
        return self


class EquipmentCalibrationLogCreate(EquipmentCalibrationLogBase):
    pass


class EquipmentCalibrationLogUpdate(BaseModel):
    calibration_type: Optional[str] = None
    calibration_date: Optional[date] = None
    expiry_date: Optional[date] = None
    agency_name: Optional[str] = None
    certificate_number: Optional[str] = None
    standard_applied: Optional[str] = None
    measured_deviation: Optional[float] = None
    allowable_tolerance: Optional[float] = None
    is_passed: Optional[bool] = None
    status: Optional[str] = None
    certificate_file_url: Optional[str] = None
    calibrated_by: Optional[UUID] = None
    calibrator_name: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("agency_name", "certificate_number", "calibrator_name", "certificate_file_url", "notes", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or (isinstance(v, str) and not v.strip()):
            return None
        return v

    @model_validator(mode="after")
    def validate_expiry(self):
        if self.calibration_date and self.expiry_date:
            if self.expiry_date < self.calibration_date:
                raise ValueError("Ngày hết hạn kiểm định phải lớn hơn hoặc bằng Ngày hiệu chuẩn")
        return self


class EquipmentCalibrationLogResponse(EquipmentCalibrationLogBase):
    model_config = ConfigDict(from_attributes=True)

    calibration_id: UUID
    equipment_code: Optional[str] = None
    equipment_name: Optional[str] = None
    installation_location: Optional[str] = None
    calibrator_display_name: Optional[str] = None
    created_at: Optional[datetime] = None


# ==================== 4. KPI STATS SCHEMA ====================
class EquipmentStatsResponse(BaseModel):
    total_equipments: int = 0
    operational_count: int = 0
    under_maintenance_count: int = 0
    calibration_valid_count: int = 0
    calibration_expiring_soon_count: int = 0
    calibration_overdue_count: int = 0
    calibration_compliance_rate: float = 100.0
    preventive_maintenance_due_this_month: int = 0
    total_maintenance_logs_year: int = 0
    total_calibration_logs_year: int = 0


# ==================== 5. AI ASSISTANT SCHEMAS ====================
class AIPredictMaintenanceRequest(BaseModel):
    equipment_code: str
    equipment_name: str
    operating_hours_estimate: Optional[int] = 1200
    sensor_vibration_level: Optional[str] = "Bình thường"
    current_temperature_c: Optional[float] = 78.5
    last_maint_notes: Optional[str] = None


class AIPredictMaintenanceResponse(BaseModel):
    equipment_code: str
    health_score: int
    estimated_failure_risk: str
    recommended_action: str
    recommended_next_pm_date: str
    tasks_to_inspect: List[str]
    food_safety_risk_impact: str
    iso_compliance_note: str


class AIEvaluateCalibrationRequest(BaseModel):
    equipment_code: str
    equipment_name: str
    measured_deviation: float
    allowable_tolerance: float
    unit: str = "°C"
    related_ccp_step: Optional[str] = "Gia nhiệt tiệt trùng (CCP 2)"


class AIEvaluateCalibrationResponse(BaseModel):
    equipment_code: str
    is_acceptable: bool
    risk_level: str
    deviation_analysis: str
    impact_on_past_batches: str
    suggested_capa_action: str
    iso_clause_reference: str
