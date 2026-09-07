import uuid
from typing import Optional, List, Any
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey, Text, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.user import User

class Supplier(Base):
    __tablename__ = "suppliers"

    supplier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supplier_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    supplier_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_info: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)  # phone, email, address, contact_person, tax_code
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Nguyên liệu tươi sống, Phụ gia & Gia vị, Bao bì trực tiếp...
    certifications: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)  # ["ISO 22000:2018", "HACCP Codex", "VietGAP", "Halal"]
    rating_score: Mapped[float] = mapped_column(Numeric(5, 2), default=100.0, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="APPROVED", nullable=False)  # APPROVED, WARNING, SUSPENDED, PENDING_EVALUATION
    risk_level: Mapped[Optional[str]] = mapped_column(String(30), default="LOW", nullable=True)  # LOW, MEDIUM, HIGH
    evaluation_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evaluation_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lots: Mapped[List["MaterialLot"]] = relationship("MaterialLot", back_populates="supplier", cascade="all, delete-orphan")
    evaluations: Mapped[List["SupplierEvaluation"]] = relationship("SupplierEvaluation", back_populates="supplier", cascade="all, delete-orphan")


class MaterialLot(Base):
    __tablename__ = "material_lots"

    material_lot_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lot_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    supplier_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.supplier_id", ondelete="SET NULL"), nullable=True)
    material_name: Mapped[str] = mapped_column(String(255), nullable=False)
    material_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    received_date: Mapped[date] = mapped_column(Date, nullable=False)
    mfg_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    exp_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    quantity: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)  # kg, tấn, lít, thùng, bao...
    storage_condition: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Kho lạnh ≤ -18°C, Kho mát 0-4°C, Kho thường ≤ 25°C
    coa_file_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="PENDING_IQC", nullable=False)  # PENDING_IQC, APPROVED, REJECTED, QUARANTINE
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    supplier: Mapped[Optional[Supplier]] = relationship("Supplier", back_populates="lots", lazy="joined")
    creator: Mapped[Optional[User]] = relationship("User", foreign_keys=[created_by], lazy="joined")
    inspections: Mapped[List["IQCInspection"]] = relationship("IQCInspection", back_populates="material_lot", cascade="all, delete-orphan")

    @property
    def supplier_name(self) -> Optional[str]:
        return self.supplier.supplier_name if self.supplier else None

    @property
    def supplier_code(self) -> Optional[str]:
        return self.supplier.supplier_code if self.supplier else None

    @property
    def creator_name(self) -> Optional[str]:
        return self.creator.full_name if self.creator else None


class IQCInspection(Base):
    __tablename__ = "iqc_inspections"

    inspection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    material_lot_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("material_lots.material_lot_id", ondelete="CASCADE"), nullable=True)
    inspector_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    sensory_check: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)  # Cảm quan: màu sắc, mùi vị, trạng thái
    packaging_check: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)  # Quy cách bao bì, tem nhãn nguyên vẹn
    temperature_c: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)  # Nhiệt độ xe giao / nhận (°C)
    moisture_content: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)  # Độ ẩm (%)
    mycotoxin_check: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)  # Độc tố vi nấm (Aflatoxin)
    allergen_check: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)  # Kiểm soát nhãn dị nguyên
    coa_compliance: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)  # Chỉ tiêu trên COA đạt yêu cầu
    
    # Chỉ tiêu tiếp nhận thực tế tại hiện trường (BM01-KTNL)
    defect_rate_percent: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), default=0.0, nullable=True)  # Tỷ lệ hư hỏng, dập nát, ươn, úa lá (%)
    impurity_percent: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), default=0.0, nullable=True)  # Tạp chất vật lý: cát sạn, cành que, dị vật (%)
    size_uniformity_check: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)  # Quy cách cỡ / kích thước / trọng lượng chuẩn
    vehicle_cleanliness_check: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)  # Vệ sinh thùng xe đạt yêu cầu, không mùi lạ, bạt che kín
    delivery_vehicle_plate: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)  # Biển số xe giao hàng (VD: 67C-128.45)
    driver_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Họ tên tài xế giao nhận
    
    inspection_details: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)  # Chi tiết vi sinh, kim loại nặng, cảm quan
    status: Mapped[str] = mapped_column(String(30), default="PASSED", nullable=False)  # PASSED, REJECTED, CONDITIONAL, PENDING
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    inspected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    material_lot: Mapped[Optional[MaterialLot]] = relationship("MaterialLot", back_populates="inspections", lazy="joined")
    inspector: Mapped[Optional[User]] = relationship("User", foreign_keys=[inspector_id], lazy="joined")

    @property
    def lot_number(self) -> Optional[str]:
        return self.material_lot.lot_number if self.material_lot else None

    @property
    def material_name(self) -> Optional[str]:
        return self.material_lot.material_name if self.material_lot else None

    @property
    def supplier_name(self) -> Optional[str]:
        if self.material_lot and self.material_lot.supplier:
            return self.material_lot.supplier.supplier_name
        return None

    @property
    def inspector_name(self) -> Optional[str]:
        return self.inspector.full_name if self.inspector else None


class SupplierEvaluationPlan(Base):
    __tablename__ = "supplier_evaluation_plans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plan_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    year: Mapped[int] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(100), default="Phòng Đảm Bảo Chất Lượng (QA)", nullable=False)
    scope: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    approval_status: Mapped[str] = mapped_column(String(30), default="APPROVED", nullable=False)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    evaluations: Mapped[List["SupplierEvaluation"]] = relationship("SupplierEvaluation", back_populates="plan")


class SupplierEvaluation(Base):
    __tablename__ = "supplier_evaluations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    evaluation_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    plan_id: Mapped[Optional[int]] = mapped_column(ForeignKey("supplier_evaluation_plans.id", ondelete="SET NULL"), nullable=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.supplier_id", ondelete="CASCADE"), nullable=False)
    criteria_type: Mapped[str] = mapped_column(String(50), nullable=False)  # AGRI_FRESH, AQUA_ANIMAL_FRESH, PROCESSED_DRY_PACKAGING
    evaluation_date: Mapped[date] = mapped_column(Date, nullable=False)
    evaluator_name: Mapped[str] = mapped_column(String(100), nullable=False)
    audit_type: Mapped[str] = mapped_column(String(50), default="PERIODIC", nullable=False)  # PERIODIC, ON_SITE, UNANNOUNCED, DOCUMENTARY
    criteria_scores: Mapped[Any] = mapped_column(JSONB, nullable=False)  # List of criteria with scores & observations
    total_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)  # 0 - 100
    grade: Mapped[str] = mapped_column(String(10), nullable=False)  # A, B, C, D
    conclusion: Mapped[str] = mapped_column(String(50), nullable=False)  # APPROVED, CONDITIONAL, DISQUALIFIED
    corrective_actions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    supplier: Mapped[Supplier] = relationship("Supplier", back_populates="evaluations", lazy="joined")
    plan: Mapped[Optional[SupplierEvaluationPlan]] = relationship("SupplierEvaluationPlan", back_populates="evaluations", lazy="joined")

    @property
    def supplier_name(self) -> Optional[str]:
        return self.supplier.supplier_name if self.supplier else None

    @property
    def supplier_code(self) -> Optional[str]:
        return self.supplier.supplier_code if self.supplier else None

    @property
    def plan_code(self) -> Optional[str]:
        return self.plan.plan_code if self.plan else None

