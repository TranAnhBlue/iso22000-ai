from pydantic import BaseModel, ConfigDict, Field, field_validator
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
    review_due_date: Optional[date] = None
    last_reviewed_date: Optional[date] = None
    review_frequency_years: int = 3
    drafter_name: Optional[str] = None
    reviewer_name: Optional[str] = None
    security_level: str = "INTERNAL"

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
    review_due_date: Optional[date] = None
    last_reviewed_date: Optional[date] = None
    review_frequency_years: Optional[int] = None
    drafter_name: Optional[str] = None
    reviewer_name: Optional[str] = None
    security_level: Optional[str] = None
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


# ==================== BM01-KSTL: PHIẾU YÊU CẦU XEM XÉT TÀI LIỆU ====================
class DocumentChangeRequestBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    request_code: Optional[str] = "AUTO"
    document_id: Optional[UUID] = None
    doc_code: str
    doc_title: str
    change_type: str = "REVISION"  # NEW, REVISION, OBSOLETE, OTHER
    department: str
    requested_by_name: Optional[str] = None
    request_date: Optional[date] = None
    reason: str
    proposed_content: Optional[str] = None
    target_completion_date: Optional[date] = None
    assigned_drafter: Optional[str] = None

class DocumentChangeRequestCreate(DocumentChangeRequestBase):
    pass

class DocumentChangeRequestUpdate(BaseModel):
    doc_title: Optional[str] = None
    change_type: Optional[str] = None
    department: Optional[str] = None
    reason: Optional[str] = None
    proposed_content: Optional[str] = None
    target_completion_date: Optional[date] = None
    assigned_drafter: Optional[str] = None
    status: Optional[str] = None

class DeptHeadReviewRequest(BaseModel):
    opinion: str  # AGREE, DISAGREE
    comment: Optional[str] = None
    signer_name: str

class QAHeadReviewRequest(BaseModel):
    opinion: str  # AGREE, DISAGREE
    comment: Optional[str] = None
    signer_name: str

class DirectorApproveRequest(BaseModel):
    approval: str  # APPROVED, REJECTED
    comment: Optional[str] = None
    signer_name: str

class DocumentChangeRequestResponse(DocumentChangeRequestBase):
    request_id: UUID
    requested_by: Optional[UUID] = None
    dept_head_opinion: Optional[str] = None
    dept_head_comment: Optional[str] = None
    dept_head_signed_at: Optional[datetime] = None
    dept_head_signer_name: Optional[str] = None
    qa_head_opinion: Optional[str] = None
    qa_head_comment: Optional[str] = None
    qa_head_signed_at: Optional[datetime] = None
    qa_head_signer_name: Optional[str] = None
    director_approval: Optional[str] = None
    director_comment: Optional[str] = None
    director_signed_at: Optional[datetime] = None
    director_signer_name: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ==================== BM02-KSTL: THÔNG BÁO THAY ĐỔI & PHÂN PHỐI ====================
class DocumentDistributionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    notice_code: Optional[str] = "AUTO"
    document_id: UUID
    doc_code: str
    doc_title: str
    version: str = "1.0"
    effective_date: date
    change_summary: Optional[str] = None
    department_recipient: str
    recipient_user_id: Optional[UUID] = None
    distribution_method: str = "PORTAL"  # PORTAL, HARDCOPY_CONTROLLED
    copy_number: int = 1
    distributed_by_name: Optional[str] = None
    distribution_date: Optional[date] = None
    notes: Optional[str] = None

class DocumentDistributionCreate(DocumentDistributionBase):
    pass

class DocumentDistributionAcknowledge(BaseModel):
    acknowledged_by_name: Optional[str] = None

class DocumentDistributionRetrieveObsolete(BaseModel):
    retrieval_date: Optional[date] = None
    notes: Optional[str] = None

class DocumentDistributionResponse(DocumentDistributionBase):
    distribution_id: UUID
    acknowledged: bool
    acknowledged_by_name: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    obsolete_copy_retrieved: bool
    retrieval_date: Optional[date] = None
    created_at: Optional[datetime] = None


# ==================== BM04-KSTL: TÀI LIỆU NGUỒN GỐC BÊN NGOÀI ====================
class ExternalDocumentBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    doc_code: str
    doc_title: str
    category: str = "LAW_REGULATION"  # LAW_REGULATION, STANDARD_TCVN_ISO, TECHNICAL_SPEC_CUSTOMER, INDUSTRY_GUIDELINE
    issuing_body: str
    published_date: Optional[date] = None
    effective_date: Optional[date] = None
    status: str = "EFFECTIVE"  # EFFECTIVE, EXPIRED, SUPERSEDED
    superseded_by: Optional[str] = None
    department_in_charge: str = "Ban QLCL & ATTP"
    review_frequency: str = "ANNUAL"
    last_checked_date: Optional[date] = None
    checked_by_name: Optional[str] = None
    file_url: Optional[str] = None
    notes: Optional[str] = None

class ExternalDocumentCreate(ExternalDocumentBase):
    pass

class ExternalDocumentUpdate(BaseModel):
    doc_title: Optional[str] = None
    category: Optional[str] = None
    issuing_body: Optional[str] = None
    published_date: Optional[date] = None
    effective_date: Optional[date] = None
    status: Optional[str] = None
    superseded_by: Optional[str] = None
    department_in_charge: Optional[str] = None
    review_frequency: Optional[str] = None
    last_checked_date: Optional[date] = None
    checked_by_name: Optional[str] = None
    file_url: Optional[str] = None
    notes: Optional[str] = None

class ExternalDocumentResponse(ExternalDocumentBase):
    external_doc_id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ==================== BM05-KSTL: SOÁT XÉT 3 NĂM ====================
class PeriodicReviewConfirmRequest(BaseModel):
    signer_name: str
    comment: Optional[str] = "Xác nhận nội dung tài liệu vẫn phù hợp sau chu kỳ 3 năm, không có sửa đổi (BM05-KSTL)."


# ==================== BM01/BM02-KSHS: KIỂM SOÁT HỒ SƠ LƯU TRỮ & TIÊU HỦY ====================
class RecordRetentionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    record_code: str
    record_name: str
    department: str
    storage_location: str
    creation_date: Optional[date] = Field(default_factory=date.today, description="Ngày phát sinh hồ sơ")
    retention_period: str = "02 năm"
    retention_expiry_date: Optional[date] = Field(None, description="Ngày hết hạn lưu trữ (tự động tính)")
    disposal_method: Optional[str] = "Hủy bằng máy cắt vụn & Xóa file số"
    responsible_person: Optional[str] = None
    status: str = "RETAINED"  # RETAINED, READY_FOR_DISPOSAL, DISPOSED, CANCELLED
    notes: Optional[str] = None

    @field_validator("record_code")
    @classmethod
    def validate_record_code(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Mã hồ sơ (record_code) không được để trống theo quy định BM01-KSHS.")
        return v.strip()

class RecordRetentionCreate(RecordRetentionBase):
    @field_validator("status")
    @classmethod
    def validate_create_status(cls, v: str) -> str:
        if v and v.upper() == "DISPOSED":
            raise ValueError(
                "Không được phép khởi tạo hồ sơ ở trạng thái DISPOSED. "
                "Quy trình tiêu hủy hồ sơ bắt buộc phải thực hiện thông qua biên bản tiêu hủy BM02-KSHS."
            )
        if v and v.upper() not in ["RETAINED", "READY_FOR_DISPOSAL"]:
            raise ValueError("Trạng thái hợp lệ khi tạo mới là 'RETAINED' (Đang lưu trữ) hoặc 'READY_FOR_DISPOSAL' (Đề xuất tiêu hủy).")
        return v.upper()

class RecordRetentionUpdate(BaseModel):
    record_code: Optional[str] = None
    record_name: Optional[str] = None
    department: Optional[str] = None
    storage_location: Optional[str] = None
    creation_date: Optional[date] = None
    retention_period: Optional[str] = None
    retention_expiry_date: Optional[date] = None
    disposal_method: Optional[str] = None
    responsible_person: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("record_code")
    @classmethod
    def validate_record_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not v.strip():
                raise ValueError("Mã hồ sơ (record_code) không được để trống.")
            return v.strip()
        return v

    @field_validator("status")
    @classmethod
    def validate_update_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if v.upper() == "DISPOSED":
                raise ValueError(
                    "Không thể chuyển trực tiếp sang trạng thái DISPOSED bằng API cập nhật thông thường. "
                    "Vui lòng sử dụng endpoint tiêu hủy hồ sơ /retention/{id}/dispose theo BM02-KSHS."
                )
            if v.upper() not in ["RETAINED", "READY_FOR_DISPOSAL"]:
                raise ValueError("Trạng thái hợp lệ gồm: 'RETAINED' (Đang lưu trữ) hoặc 'READY_FOR_DISPOSAL' (Đã hết hạn lưu - Chờ tiêu hủy).")
            return v.upper()
        return v

class RecordRetentionDispose(BaseModel):
    disposal_date: date = Field(default_factory=date.today, description="Ngày tiến hành tiêu hủy hồ sơ theo BM02-KSHS")
    disposal_council: str = Field(..., min_length=2, description="Hội đồng tiêu hủy / Ban giám sát theo BM02-KSHS")
    disposal_minutes_code: str = Field(..., min_length=2, description="Số biên bản tiêu hủy theo BM02-KSHS (VD: BBTH-2024-01)")
    disposal_method: Optional[str] = Field("Hủy bằng máy cắt vụn & Xóa file số", description="Hình thức tiêu hủy")
    confirm_expired: bool = Field(False, description="Xác nhận hồ sơ đã hết hạn lưu trữ hoặc có quyết định tiêu hủy hợp lệ")

class RecordRetentionResponse(RecordRetentionBase):
    retention_id: UUID
    disposal_date: Optional[date] = None
    disposal_council: Optional[str] = None
    disposal_minutes_code: Optional[str] = None
    is_deleted: bool = False
    is_expiring_soon: Optional[bool] = None  # Sắp hết hạn trong vòng 30 ngày
    is_expired: Optional[bool] = None  # Đã quá hạn lưu trữ
    days_remaining: Optional[int] = None  # Số ngày còn lại đến hạn
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
