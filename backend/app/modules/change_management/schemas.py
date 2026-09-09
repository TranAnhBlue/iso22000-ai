from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
import uuid

class ChangeRequestBase(BaseModel):
    title: str
    change_type: str  # PRODUCT_NEW, EQUIPMENT_NEW, REGULATION_UPDATE, PROCESS_CHANGE, SUPPLIER_CHANGE, RAW_MATERIAL_CHANGE, OTHER
    description: str
    reason: str
    impact_assessment: Dict[str, Any]  # {affects_haccp_plan: bool, affects_prp: bool, affected_document_ids: list, food_safety_impact_level: "LOW"|"MEDIUM"|"HIGH"}
    proposed_by_name: str
    proposed_date: Optional[date] = None
    review_status: Optional[str] = "DRAFT"
    approved_by_name: Optional[str] = None
    approval_date: Optional[date] = None
    implementation_plan: Optional[str] = None
    implementation_date: Optional[date] = None
    verification_result: Optional[str] = None
    verified_by_name: Optional[str] = None
    related_ccp_ids: Optional[List[Any]] = None
    related_document_ids: Optional[List[Any]] = None

class ChangeRequestCreate(ChangeRequestBase):
    change_code: Optional[str] = None  # If omitted, auto-generated CR-YYYY-XXX

class ChangeRequestUpdate(BaseModel):
    title: Optional[str] = None
    change_type: Optional[str] = None
    description: Optional[str] = None
    reason: Optional[str] = None
    impact_assessment: Optional[Dict[str, Any]] = None
    proposed_by_name: Optional[str] = None
    proposed_date: Optional[date] = None
    review_status: Optional[str] = None
    approved_by_name: Optional[str] = None
    approval_date: Optional[date] = None
    implementation_plan: Optional[str] = None
    implementation_date: Optional[date] = None
    verification_result: Optional[str] = None
    verified_by_name: Optional[str] = None
    related_ccp_ids: Optional[List[Any]] = None
    related_document_ids: Optional[List[Any]] = None

class ChangeRequestStatusUpdate(BaseModel):
    status: str  # DRAFT, UNDER_REVIEW, APPROVED, REJECTED, IMPLEMENTED
    actor_name: Optional[str] = None
    note: Optional[str] = None

class ChangeRequestResponse(ChangeRequestBase):
    change_id: uuid.UUID
    change_code: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ChangeRequestStats(BaseModel):
    total: int
    draft: int
    under_review: int
    approved: int
    implemented: int
    high_impact: int
