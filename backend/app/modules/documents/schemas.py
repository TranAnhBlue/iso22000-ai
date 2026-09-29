from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, date
from uuid import UUID

class DocumentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    doc_code: str
    doc_title: str
    doc_type: str
    current_version: str = "1.0"
    status: str = "DRAFT"
    department: Optional[str] = None
    standard: Optional[str] = "ISO 22000:2018"
    content: Optional[str] = None
    file_url: Optional[str] = None
    effective_date: Optional[date] = None

class DocumentCreate(DocumentBase):
    approved_by: Optional[UUID] = None

class DocumentUpdate(BaseModel):
    doc_code: Optional[str] = None
    doc_title: Optional[str] = None
    doc_type: Optional[str] = None
    current_version: Optional[str] = None
    status: Optional[str] = None
    department: Optional[str] = None
    standard: Optional[str] = None
    content: Optional[str] = None
    file_url: Optional[str] = None
    approved_by: Optional[UUID] = None
    effective_date: Optional[date] = None
    approval_note: Optional[str] = None

class DocumentApproveRequest(BaseModel):
    effective_date: Optional[date] = None
    approval_note: Optional[str] = None

class DocumentApprovalResponse(BaseModel):
    approval_id: UUID
    document_id: UUID
    version: str
    action: str
    previous_status: Optional[str] = None
    new_status: str
    performed_by: Optional[UUID] = None
    performed_by_name: Optional[str] = None
    comments: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class DocumentResponse(DocumentBase):
    document_id: UUID
    approved_by: Optional[UUID] = None
    approver_name: Optional[str] = None
    created_at: Optional[datetime] = None
