from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import date, datetime
from pydantic import BaseModel, Field, ConfigDict


# ==================== 1. NON-CONFORMANCE SCHEMAS ====================
class NonConformanceBase(BaseModel):
    nc_number: str = Field(..., max_length=50, description="Mã phiếu NC, ví dụ: NC-2026-001")
    title: str = Field(..., max_length=255, description="Tiêu đề sự cố không phù hợp")
    source: str = Field(default="HACCP_CCP", description="HACCP_CCP, PRP_GMP, IQC_INCOMING, INTERNAL_AUDIT, CUSTOMER_COMPLAINT, EQUIPMENT_FAIL")
    severity: str = Field(default="MAJOR", description="CRITICAL, MAJOR, MINOR")
    occurred_date: date = Field(..., description="Ngày phát sinh sự cố")
    occurred_location: Optional[str] = Field(None, max_length=150, description="Khu vực/Dây chuyền phát sinh")
    description: str = Field(..., description="Mô tả chi tiết sự không phù hợp")
    immediate_action: Optional[str] = Field(None, description="Biện pháp khắc phục / cô lập tức thì (8.9.2)")
    affected_lot_number: Optional[str] = Field(None, max_length=100, description="Mã số lô hàng bị ảnh hưởng")
    affected_quantity: Optional[str] = Field(None, max_length=100, description="Khối lượng/số lượng lô bị ảnh hưởng")
    reported_by: Optional[UUID] = None
    reported_by_name: Optional[str] = Field("KCS Ca sản xuất", max_length=150)
    status: str = Field(default="NEW", description="NEW, INVESTIGATING, ACTION_REQUIRED, UNDER_REVIEW, CLOSED, REJECTED")


class NonConformanceCreate(NonConformanceBase):
    pass


class NonConformanceUpdate(BaseModel):
    title: Optional[str] = None
    source: Optional[str] = None
    severity: Optional[str] = None
    occurred_date: Optional[date] = None
    occurred_location: Optional[str] = None
    description: Optional[str] = None
    immediate_action: Optional[str] = None
    affected_lot_number: Optional[str] = None
    affected_quantity: Optional[str] = None
    reported_by_name: Optional[str] = None
    status: Optional[str] = None


class NonConformanceResponse(NonConformanceBase):
    nc_id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    capa_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# ==================== 2. CAPA RECORD SCHEMAS ====================
class WhyItem(BaseModel):
    level: int = Field(..., description="1 to 5")
    question: str
    answer: str


class FishboneItem(BaseModel):
    category: str = Field(..., description="MAN, MACHINE, MATERIAL, METHOD, MEASUREMENT, ENVIRONMENT")
    causes: List[str] = Field(default_factory=list)


class CAPARecordBase(BaseModel):
    capa_number: str = Field(..., max_length=50, description="Mã phiếu CAPA, ví dụ: CAPA-2026-001")
    nc_id: UUID = Field(..., description="ID sự cố NC liên kết")
    title: str = Field(..., max_length=255, description="Tiêu đề kế hoạch CAPA")
    root_cause_method: str = Field(default="5_WHYS", description="5_WHYS, FISHBONE_5M, OTHER")
    root_cause_analysis: Optional[Dict[str, Any]] = None  # 5-Whys list or Fishbone object
    root_cause_summary: Optional[str] = None
    corrective_action: str = Field(..., description="Hành động khắc phục nguyên nhân cốt lõi")
    preventive_action: Optional[str] = Field(None, description="Biện pháp phòng ngừa tái diễn")
    assigned_to: Optional[UUID] = None
    assigned_to_name: Optional[str] = Field("Trưởng bộ phận", max_length=150)
    assigned_dept: Optional[str] = Field("Phòng Sản xuất", max_length=150)
    target_date: date = Field(..., description="Hạn chót hoàn thành")
    completed_date: Optional[date] = None
    verified_by: Optional[UUID] = None
    verified_by_name: Optional[str] = None
    verification_date: Optional[date] = None
    verification_result: Optional[str] = None
    verification_status: str = Field(default="PENDING_VERIFY", description="PENDING_VERIFY, EFFECTIVE, INEFFECTIVE")
    status: str = Field(default="IN_PROGRESS", description="DRAFT, IN_PROGRESS, PENDING_VERIFICATION, COMPLETED, OVERDUE")
    evidence_urls: Optional[List[str]] = Field(default_factory=list)


class CAPARecordCreate(CAPARecordBase):
    pass


class CAPARecordUpdate(BaseModel):
    title: Optional[str] = None
    root_cause_method: Optional[str] = None
    root_cause_analysis: Optional[Dict[str, Any]] = None
    root_cause_summary: Optional[str] = None
    corrective_action: Optional[str] = None
    preventive_action: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_dept: Optional[str] = None
    target_date: Optional[date] = None
    completed_date: Optional[date] = None
    status: Optional[str] = None
    evidence_urls: Optional[List[str]] = None


class CAPAVerifyRequest(BaseModel):
    verified_by_name: str = Field("Trưởng Ban QLCL & ATTP", max_length=150)
    verification_result: str = Field(..., description="Nội dung kết luận thẩm tra hiệu lực sau 30 ngày")
    verification_status: str = Field(default="EFFECTIVE", description="EFFECTIVE (Hiệu lực), INEFFECTIVE (Không hiệu lực - cần tái mở CAPA)")


class CAPARecordResponse(CAPARecordBase):
    capa_id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    nc_number: Optional[str] = None
    nc_title: Optional[str] = None
    nc_severity: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== 3. STATS SCHEMAS ====================
class CAPAStatsResponse(BaseModel):
    total_ncs: int = 0
    critical_ncs: int = 0
    open_ncs: int = 0
    closed_ncs: int = 0
    total_capas: int = 0
    in_progress_capas: int = 0
    pending_verify_capas: int = 0
    completed_capas: int = 0
    overdue_capas: int = 0
    effectiveness_rate: float = 100.0


# ==================== 4. AI ASSISTANT SCHEMAS ====================
class AI5WhyRequest(BaseModel):
    nc_title: str
    description: str
    source: Optional[str] = "HACCP_CCP"
    affected_lot: Optional[str] = None


class AI5WhyResponse(BaseModel):
    problem_statement: str
    whys: List[Dict[str, Any]]  # [{"level": 1, "question": "...", "answer": "..."}]
    root_cause_conclusion: str
    suggested_corrective_action: str
    suggested_preventive_action: str


class AIFishboneRequest(BaseModel):
    nc_title: str
    description: str


class AIFishboneResponse(BaseModel):
    problem_statement: str
    man: List[str]
    machine: List[str]
    material: List[str]
    method: List[str]
    measurement: List[str]
    environment: List[str]
    primary_root_cause: str
    suggested_capa: str


class AISuggestActionsRequest(BaseModel):
    nc_title: str
    root_cause: str
    severity: Optional[str] = "MAJOR"


class AISuggestActionsResponse(BaseModel):
    immediate_containment: List[str]
    corrective_actions: List[str]
    preventive_actions: List[str]
    verification_method_30days: str
    iso_standard_clauses: List[str]
