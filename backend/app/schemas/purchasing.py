from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID

# ==================== SUPPLIER SCHEMAS ====================
class SupplierBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    supplier_code: str
    supplier_name: str
    contact_info: Optional[Dict[str, Any]] = None  # {phone, email, address, contact_person, tax_code}
    category: Optional[str] = "Nguyên liệu tươi sống"
    certifications: Optional[List[str]] = []
    rating_score: float = 100.0
    status: str = "APPROVED"  # APPROVED, WARNING, SUSPENDED, PENDING_EVALUATION
    risk_level: Optional[str] = "LOW"  # LOW, MEDIUM, HIGH
    evaluation_notes: Optional[str] = None
    evaluation_date: Optional[date] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    supplier_code: Optional[str] = None
    supplier_name: Optional[str] = None
    contact_info: Optional[Dict[str, Any]] = None
    category: Optional[str] = None
    certifications: Optional[List[str]] = None
    rating_score: Optional[float] = None
    status: Optional[str] = None
    risk_level: Optional[str] = None
    evaluation_notes: Optional[str] = None
    evaluation_date: Optional[date] = None

class SupplierResponse(SupplierBase):
    supplier_id: UUID
    created_at: Optional[datetime] = None
    lots_count: Optional[int] = 0
    iqc_pass_rate: Optional[float] = 100.0


# ==================== MATERIAL LOT SCHEMAS ====================
class MaterialLotBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lot_number: str
    supplier_id: Optional[UUID] = None
    material_name: str
    material_category: Optional[str] = "Nguyên liệu chính"
    received_date: date
    mfg_date: Optional[date] = None
    exp_date: Optional[date] = None
    quantity: float
    unit: str = "kg"
    storage_condition: Optional[str] = "Kho thường ≤ 25°C"
    coa_file_url: Optional[str] = None
    status: str = "PENDING_IQC"  # PENDING_IQC, APPROVED, REJECTED, QUARANTINE

class MaterialLotCreate(MaterialLotBase):
    created_by: Optional[UUID] = None

class MaterialLotUpdate(BaseModel):
    lot_number: Optional[str] = None
    supplier_id: Optional[UUID] = None
    material_name: Optional[str] = None
    material_category: Optional[str] = None
    received_date: Optional[date] = None
    mfg_date: Optional[date] = None
    exp_date: Optional[date] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    storage_condition: Optional[str] = None
    coa_file_url: Optional[str] = None
    status: Optional[str] = None
    created_by: Optional[UUID] = None

class MaterialLotResponse(MaterialLotBase):
    material_lot_id: UUID
    created_by: Optional[UUID] = None
    supplier_name: Optional[str] = None
    supplier_code: Optional[str] = None
    creator_name: Optional[str] = None
    created_at: Optional[datetime] = None
    iqc_status: Optional[str] = None
    inspection_id: Optional[UUID] = None


# ==================== IQC INSPECTION SCHEMAS ====================
class IQCInspectionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    inspection_code: str
    material_lot_id: UUID
    sensory_check: bool = True
    packaging_check: bool = True
    temperature_c: Optional[float] = None
    moisture_content: Optional[float] = None
    mycotoxin_check: bool = True
    allergen_check: bool = False
    coa_compliance: bool = True
    inspection_details: Optional[Dict[str, Any]] = None  # {micro_biology, heavy_metals, physical, sensory}
    status: str = "PASSED"  # PASSED, REJECTED, CONDITIONAL, PENDING
    notes: Optional[str] = None

class IQCInspectionCreate(IQCInspectionBase):
    inspector_id: Optional[UUID] = None

class IQCInspectionUpdate(BaseModel):
    inspection_code: Optional[str] = None
    material_lot_id: Optional[UUID] = None
    inspector_id: Optional[UUID] = None
    sensory_check: Optional[bool] = None
    packaging_check: Optional[bool] = None
    temperature_c: Optional[float] = None
    moisture_content: Optional[float] = None
    mycotoxin_check: Optional[bool] = None
    allergen_check: Optional[bool] = None
    coa_compliance: Optional[bool] = None
    inspection_details: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class IQCInspectionResponse(IQCInspectionBase):
    inspection_id: UUID
    inspector_id: Optional[UUID] = None
    lot_number: Optional[str] = None
    material_name: Optional[str] = None
    supplier_name: Optional[str] = None
    inspector_name: Optional[str] = None
    inspected_at: Optional[datetime] = None


# ==================== KPI STATS RESPONSE ====================
class PurchasingStatsResponse(BaseModel):
    total_suppliers: int
    approved_suppliers: int
    warning_suppliers: int
    suspended_suppliers: int
    total_lots_received: int
    pending_iqc_lots: int
    iqc_pass_rate_percentage: float
    total_inspections: int
    rejected_inspections: int


# ==================== AI ASSISTANT SCHEMAS ====================
class AICoAParameter(BaseModel):
    name: str
    tested_value: str
    standard_limit: str
    is_compliant: bool
    risk_level: str  # SAFE, WARNING, DANGER
    notes: Optional[str] = None

class AICoAAnalysisRequest(BaseModel):
    material_name: str
    supplier_name: Optional[str] = None
    lot_number: Optional[str] = None
    coa_text: Optional[str] = None
    sample_type: Optional[str] = "SEAFOOD"  # SEAFOOD, FLOUR, SEASONING, PACKAGING, CHEMICAL

class AICoAAnalysisResponse(BaseModel):
    material_name: str
    overall_status: str  # PASSED, FAILED, REVIEW_REQUIRED
    confidence_score: float
    summary: str
    iso_standard_reference: str
    parameters: List[AICoAParameter]
    suggested_iqc_status: str
    recommended_actions: List[str]


class AISupplierEvaluationRequest(BaseModel):
    supplier_id: UUID

class AISupplierEvaluationResponse(BaseModel):
    supplier_id: UUID
    supplier_name: str
    recommended_score: float
    recommended_status: str
    risk_level: str
    strengths: List[str]
    risks: List[str]
    recommendations: List[str]
