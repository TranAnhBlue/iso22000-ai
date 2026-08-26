import uuid
from typing import Optional
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.user import User

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
    file_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    effective_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    approver: Mapped[Optional[User]] = relationship("User", foreign_keys=[approved_by], lazy="joined")

    @property
    def approver_name(self) -> Optional[str]:
        return self.approver.full_name if self.approver else None
