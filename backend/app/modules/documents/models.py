import uuid
from typing import Optional
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.modules.auth.models import User

class Document(Base):
    __tablename__ = "documents"

    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doc_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    doc_title: Mapped[str] = mapped_column(String(255), nullable=False)
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)  # POLICY, MANUAL, SOP, WI, FORM, RECORD
    current_version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="DRAFT", nullable=False)  # DRAFT, PENDING_APPROVAL, APPROVED, OBSOLETE
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Ban QLCL, Sản xuất, QC, Mua hàng...
    standard: Mapped[Optional[str]] = mapped_column(String(100), default="ISO 22000:2018", nullable=True)  # ISO 22000, HACCP, PRP...
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Toàn văn quy trình SOP / Nội dung văn bản
    file_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    effective_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    review_due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)  # Hạn soát xét định kỳ 3 năm (BM05-KSTL)
    last_reviewed_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    review_frequency_years: Mapped[int] = mapped_column(default=3, nullable=False)
    drafter_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)  # Người soạn thảo
    reviewer_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)  # Người soát xét / thẩm định chuyên môn
    security_level: Mapped[str] = mapped_column(String(50), default="INTERNAL", nullable=False)  # INTERNAL, CONFIDENTIAL, PUBLIC
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    approver: Mapped[Optional[User]] = relationship("User", foreign_keys=[approved_by], lazy="joined")
    approvals: Mapped[list["DocumentApproval"]] = relationship("DocumentApproval", back_populates="document", cascade="all, delete-orphan", order_by="desc(DocumentApproval.created_at)")
    distributions: Mapped[list["DocumentDistribution"]] = relationship("DocumentDistribution", back_populates="document", cascade="all, delete-orphan", order_by="desc(DocumentDistribution.distribution_date)")

    @property
    def approver_name(self) -> Optional[str]:
        return self.approver.full_name if self.approver else None
class DocumentApproval(Base):
    __tablename__ = "document_approvals"

    approval_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # CREATED, UPDATED, SUBMITTED, APPROVED, REJECTED, OBSOLETED
    previous_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    performed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    performed_by_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document: Mapped["Document"] = relationship("Document", back_populates="approvals")
    performer: Mapped[Optional[User]] = relationship("User", foreign_keys=[performed_by], lazy="joined")


class DocumentChangeRequest(Base):
    """
    BM01-KSTL: Phiếu yêu cầu xem xét tài liệu (Soạn mới, sửa đổi, ngưng áp dụng)
    Phân cấp phê duyệt: Đơn vị yêu cầu -> Trưởng QLCL -> Ban Giám Đốc
    """
    __tablename__ = "document_change_requests"

    request_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="SET NULL"), nullable=True)
    doc_code: Mapped[str] = mapped_column(String(50), nullable=False)
    doc_title: Mapped[str] = mapped_column(String(255), nullable=False)
    change_type: Mapped[str] = mapped_column(String(30), default="REVISION", nullable=False)  # NEW, REVISION, OBSOLETE, OTHER
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    requested_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    requested_by_name: Mapped[str] = mapped_column(String(150), nullable=False)
    request_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    proposed_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    target_completion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    assigned_drafter: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # Xem xét của Trưởng đơn vị
    dept_head_opinion: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # AGREE, DISAGREE
    dept_head_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dept_head_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    dept_head_signer_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # Xem xét của Trưởng ban QLCL & ATTP
    qa_head_opinion: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # AGREE, DISAGREE
    qa_head_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    qa_head_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    qa_head_signer_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # Phê duyệt của Ban Giám Đốc (nếu tài liệu cấp 1, 2, 3)
    director_approval: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # APPROVED, REJECTED
    director_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    director_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    director_signer_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    status: Mapped[str] = mapped_column(String(30), default="SUBMITTED", nullable=False)  # DRAFT, SUBMITTED, DEPT_REVIEWED, QA_REVIEWED, APPROVED, REJECTED, COMPLETED
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    document: Mapped[Optional["Document"]] = relationship("Document", foreign_keys=[document_id])


class DocumentDistribution(Base):
    """
    BM02-KSTL: Thông báo thay đổi & Sổ phân phối tài liệu
    Theo dõi phân phối bản in có dấu kiểm soát hoặc bản điện tử đến các phòng ban và xác nhận thu hồi bản cũ.
    """
    __tablename__ = "document_distributions"

    distribution_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    notice_code: Mapped[str] = mapped_column(String(50), nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    doc_code: Mapped[str] = mapped_column(String(50), nullable=False)
    doc_title: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[str] = mapped_column(String(20), default="1.0", nullable=False)
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    change_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    department_recipient: Mapped[str] = mapped_column(String(100), nullable=False)  # Phòng Sản xuất, Phòng QC, Kho, Cơ điện, Ban Giám Đốc...
    recipient_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    distribution_method: Mapped[str] = mapped_column(String(50), default="PORTAL", nullable=False)  # PORTAL, HARDCOPY_CONTROLLED
    copy_number: Mapped[int] = mapped_column(default=1, nullable=False)
    distributed_by_name: Mapped[str] = mapped_column(String(150), nullable=False)
    distribution_date: Mapped[date] = mapped_column(Date, nullable=False)

    acknowledged: Mapped[bool] = mapped_column(default=False, nullable=False)
    acknowledged_by_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    obsolete_copy_retrieved: Mapped[bool] = mapped_column(default=False, nullable=False)  # Thu hồi / hủy bản cũ hoặc đóng dấu HẾT HIỆU LỰC
    retrieval_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document: Mapped["Document"] = relationship("Document", back_populates="distributions")


class ExternalDocument(Base):
    """
    BM04-KSTL: Danh mục tài liệu có nguồn gốc bên ngoài (Luật, Nghị định, TCVN, ISO, Tiêu chuẩn khách hàng)
    """
    __tablename__ = "external_documents"

    external_doc_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doc_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)  # Luật 55/2010/QH12, NĐ 15/2018/NĐ-CP, TCVN ISO 22000:2018...
    doc_title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="LAW_REGULATION", nullable=False)  # LAW_REGULATION, STANDARD_TCVN_ISO, TECHNICAL_SPEC_CUSTOMER, INDUSTRY_GUIDELINE
    issuing_body: Mapped[str] = mapped_column(String(150), nullable=False)  # Quốc hội, Chính phủ, Bộ Y tế, Bộ NN&PTNT, Tổ chức ISO...
    published_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    effective_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="EFFECTIVE", nullable=False)  # EFFECTIVE, EXPIRED, SUPERSEDED
    superseded_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    department_in_charge: Mapped[str] = mapped_column(String(100), default="Ban QLCL & ATTP", nullable=False)
    review_frequency: Mapped[str] = mapped_column(String(50), default="ANNUAL", nullable=False)  # QUARTERLY, SEMI_ANNUAL, ANNUAL
    last_checked_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    checked_by_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    file_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RecordRetention(Base):
    """
    BM01/BM02-KSHS: Danh mục hồ sơ lưu trữ & Phiếu đề nghị tiêu hủy hồ sơ (QT-KSHS An Giang)
    Quy định thời hạn bảo quản, địa điểm lưu và hình thức tiêu hủy các hồ sơ bằng chứng FSMS ISO 22000.
    """
    __tablename__ = "records_retention"

    retention_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)  # Mã biểu mẫu / hồ sơ ghi chép (BM01-KSHS)
    record_name: Mapped[str] = mapped_column(String(255), nullable=False)  # Tên loại hồ sơ
    department: Mapped[str] = mapped_column(String(100), nullable=False)  # Đơn vị lưu giữ
    storage_location: Mapped[str] = mapped_column(String(255), nullable=False)  # Nơi lưu giữ (tủ hồ sơ, kệ, server)
    creation_date: Mapped[date] = mapped_column(Date, default=date.today, nullable=False)  # Ngày phát sinh hồ sơ
    retention_period: Mapped[str] = mapped_column(String(100), default="02 năm", nullable=False)  # Thời hạn lưu trữ
    retention_expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)  # Ngày hết hạn lưu trữ (tự động tính)
    disposal_method: Mapped[Optional[str]] = mapped_column(String(255), default="Hủy bằng máy cắt vụn & Xóa file số", nullable=True)
    responsible_person: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)  # Người chịu trách nhiệm giữ
    status: Mapped[str] = mapped_column(String(30), default="RETAINED", nullable=False)  # RETAINED, READY_FOR_DISPOSAL, DISPOSED
    disposal_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    disposal_council: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Hội đồng tiêu hủy / chứng kiến
    disposal_minutes_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Mã biên bản tiêu hủy BM02-KSHS
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
