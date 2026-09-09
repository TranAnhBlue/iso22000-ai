import uuid
from typing import Optional, List, Any
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, ForeignKey, Text, Numeric, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.modules.auth.models import User

# ==================== 1. PRODUCTION BATCHES (MẺ SẢN XUẤT) ====================
class ProductionBatch(Base):
    __tablename__ = "production_batches"

    batch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)  # LOT-202608-B01
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)  # Chả cá Ba Sa Thượng Hạng 500g
    product_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # SP-CC500
    production_line: Mapped[Optional[str]] = mapped_column(String(100), default="Dây chuyền Chế biến 01", nullable=True)
    shift: Mapped[Optional[str]] = mapped_column(String(50), default="Ca 1 (06:00 - 14:00)", nullable=True)
    planned_quantity: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    actual_quantity: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="kg", nullable=False)  # kg, thùng, gói, cái
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="COMPLETED", nullable=False)  # PLANNED, IN_PROGRESS, COMPLETED, HOLD, CANCELLED
    qc_inspector: Mapped[Optional[str]] = mapped_column(String(100), default="QC Thẩm định", nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    creator: Mapped[Optional[User]] = relationship("User", foreign_keys=[created_by], lazy="joined")
    material_usages: Mapped[List["BatchMaterialUsage"]] = relationship("BatchMaterialUsage", back_populates="batch", cascade="all, delete-orphan")
    inventory_items: Mapped[List["WarehouseInventory"]] = relationship("WarehouseInventory", back_populates="batch", cascade="all, delete-orphan")
    retained_samples: Mapped[List["RetainedSample"]] = relationship("RetainedSample", back_populates="batch", cascade="all, delete-orphan")
    dispatches: Mapped[List["OrderDispatch"]] = relationship("OrderDispatch", back_populates="batch", cascade="all, delete-orphan")


# ==================== 2. BATCH MATERIAL USAGE (NGUYÊN LIỆU SỬ DỤNG TRONG MẺ) ====================
class BatchMaterialUsage(Base):
    __tablename__ = "batch_material_usage"

    usage_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    batch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("production_batches.batch_id", ondelete="CASCADE"), nullable=False)
    material_lot_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("material_lots.material_lot_id", ondelete="SET NULL"), nullable=True)
    material_name: Mapped[str] = mapped_column(String(255), nullable=False)
    lot_number: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity_used: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="kg", nullable=False)
    recorded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    batch: Mapped[Optional[ProductionBatch]] = relationship("ProductionBatch", back_populates="material_usages")


# ==================== 3. WAREHOUSE INVENTORY (TỒN KHO FEFO) ====================
class WarehouseInventory(Base):
    __tablename__ = "warehouse_inventory"

    inventory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_code: Mapped[str] = mapped_column(String(50), nullable=False)  # NL-01, TP-CC500, BB-01
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="RAW_MATERIAL", nullable=False)  # RAW_MATERIAL, ADDITIVE, PACKAGING, FINISHED_GOOD
    lot_number: Mapped[str] = mapped_column(String(100), nullable=False)  # Mã lô nguyên liệu hoặc mã mẻ thành phẩm
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("production_batches.batch_id", ondelete="SET NULL"), nullable=True)
    qr_code: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)  # QR/Barcode nhận diện
    
    quantity: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)  # kg, bao, thùng, cái
    min_stock_level: Mapped[float] = mapped_column(Numeric(12, 2), default=100.0, nullable=False)  # Định mức an toàn tối thiểu
    
    mfg_date: Mapped[date] = mapped_column(Date, nullable=False)
    exp_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    warehouse_type: Mapped[str] = mapped_column(String(50), default="COLD_STORAGE", nullable=False)  # COLD_STORAGE (≤-18°C), CHILL_STORAGE (0-4°C), DRY_STORAGE (≤25°C)
    location_bin: Mapped[str] = mapped_column(String(50), nullable=False)  # Kệ A1-02, Kệ B2-04, Ô C1-01
    temperature_c: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)  # Nhiệt độ hiện tại của khu vực kho
    
    status: Mapped[str] = mapped_column(String(30), default="AVAILABLE", nullable=False)  # AVAILABLE, QUARANTINE, RESERVED, EXPIRED, DISPOSED
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    batch: Mapped[Optional[ProductionBatch]] = relationship("ProductionBatch", back_populates="inventory_items", lazy="joined")


# ==================== 4. RETAINED SAMPLES (MẪU LƯU ĐỐI CHỨNG THEO CA/MẺ) ====================
class RetainedSample(Base):
    __tablename__ = "retained_samples"

    sample_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sample_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)  # ML-202608-01
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("production_batches.batch_id", ondelete="SET NULL"), nullable=True)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    sample_weight_g: Mapped[float] = mapped_column(Numeric(8, 2), default=200.0, nullable=False)  # Khối lượng mẫu lưu (gam)
    storage_cabinet: Mapped[str] = mapped_column(String(100), default="Tủ đông mẫu T-01", nullable=False)  # T-01, T-02, T-03
    storage_location: Mapped[Optional[str]] = mapped_column(String(100), default="Tủ đông mẫu T-01", nullable=True)
    storage_temperature_c: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), default=-18.0, nullable=True)
    
    sample_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)  # Ngày hết hạn lưu đối chứng (HSD + 30 ngày)
    
    sampled_by: Mapped[str] = mapped_column(String(100), default="Nhân viên QC Ca", nullable=False)
    test_result: Mapped[str] = mapped_column(String(30), default="PASS", nullable=False)  # PASS (Đạt), FAIL (Không đạt), TESTING (Đang kiểm nghiệm), PENDING (Chưa kiểm)
    test_details: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)  # {e_coli: "Âm tính", salmonella: "Âm tính", sensory: "Đạt"}
    
    status: Mapped[str] = mapped_column(String(30), default="STORED", nullable=False)  # STORED (Đang lưu), TESTED (Đã kiểm), DISPOSED (Đã hủy mẫu), SEIZED (Niêm phong)
    disposed_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    disposed_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())

    batch: Mapped[Optional[ProductionBatch]] = relationship("ProductionBatch", back_populates="retained_samples", lazy="joined")


# ==================== 5. ORDER DISPATCHES (XUẤT KHO GIAO NHẬN HÀNG HÓA) ====================
class OrderDispatch(Base):
    __tablename__ = "order_dispatches"

    dispatch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dispatch_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)  # PXK-2026-0801
    order_number: Mapped[str] = mapped_column(String(100), nullable=False)  # SO-2026-0045
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)  # Siêu thị Co.opmart / Đại lý Miền Nam
    customer_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    destination_address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("production_batches.batch_id", ondelete="SET NULL"), nullable=True)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    quantity_dispatched: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="thùng", nullable=False)
    
    vehicle_number: Mapped[Optional[str]] = mapped_column(String(50), default="59C-128.45", nullable=True)
    vehicle_temp_c: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), default=-18.0, nullable=True)
    vehicle_check_status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)  # Kiểm tra thùng xe sạch sẽ, đủ lạnh
    
    status: Mapped[str] = mapped_column(String(30), default="DELIVERED", nullable=False)  # PREPARING, SHIPPED, DELIVERED, RETURNED, RECALLED
    dispatched_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    dispatched_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    batch: Mapped[Optional[ProductionBatch]] = relationship("ProductionBatch", back_populates="dispatches", lazy="joined")
    dispatcher: Mapped[Optional[User]] = relationship("User", foreign_keys=[dispatched_by], lazy="joined")


# ==================== 6. VEHICLE INSPECTIONS (BM01-PTVC: KIỂM TRA PHƯƠNG TIỆN VẬN CHUYỂN) ====================
class VehicleInspection(Base):
    """
    Luồng 15 - Biểu mẫu BM01-PTVC: Kiểm tra phương tiện vận chuyển trước khi bốc xếp hàng
    Chuẩn hóa theo đúng 5 tiêu chí kỹ thuật gốc (dạng Đạt / Không đạt)
    """
    __tablename__ = "vehicle_inspections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    inspection_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)  # PTVC-2026-001
    inspection_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    order_dispatch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("order_dispatches.dispatch_id", ondelete="SET NULL"), nullable=True)
    
    vehicle_plate: Mapped[str] = mapped_column(String(50), nullable=False)  # 67C-123.45
    driver_name: Mapped[str] = mapped_column(String(100), nullable=False)
    driver_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    transport_company: Mapped[Optional[str]] = mapped_column(String(255), default="Đội xe Công ty", nullable=True)
    
    # 5 TIÊU CHÍ NGUYÊN BẢN THEO BIỂU MẪU BM01-PTVC
    valid_registration_check: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)  # 1. Xe còn niên hạn sử dụng / được đăng kiểm cho phép lưu hành
    cargo_integrity_check: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)     # 2. Kết cấu thùng chứa bền, kín, không thủng rách, không vật sắc nhọn
    clean_dry_check: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)           # 3. Sạch sẽ, khô ráo, không han gỉ, phù hợp loại hàng hóa
    no_odor_check: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)             # 4. Không mùi lạ (hóa chất, xăng dầu, phân bón...)
    pest_free_check: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)           # 5. Không mốc, không côn trùng/động vật gây hại
    
    inspection_result: Mapped[str] = mapped_column(String(30), default="PASS", nullable=False)  # PASS, FAIL
    inspector_name: Mapped[str] = mapped_column(String(100), default="Thủ kho xuất hàng", nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ==================== 7. DISPOSAL RECORDS (BM02-HỦY HÀNG: BIÊN BẢN HỦY THỰC PHẨM KHÔNG PHÙ HỢP) ====================
class DisposalRecord(Base):
    """
    Luồng 16 - Biểu mẫu BM02-HỦY HÀNG: Biên bản tiêu hủy thực phẩm / lô hàng không phù hợp
    Hội đồng 3 bên chứng kiến: Đơn vị thực hiện hủy hàng, Phòng Quản lý Chất lượng (P.QLCL), Phòng ban đề xuất hủy hàng
    """
    __tablename__ = "disposal_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    record_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)  # BBHH-2026-001
    disposal_date: Mapped[date] = mapped_column(Date, nullable=False)
    batch_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("production_batches.batch_id", ondelete="SET NULL"), nullable=True)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    quantity: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), default="kg", nullable=False)
    # Ghi chú mở rộng phần mềm FSMS: Lý do & Phương pháp hủy (thực tế form gốc gộp trong cột Ghi chú)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    disposal_method: Mapped[str] = mapped_column(String(100), default="Tiêu hủy nhiệt và chôn lấp hợp vệ sinh", nullable=False)
    disposal_location: Mapped[Optional[str]] = mapped_column(String(255), default="Khu xử lý chất thải Nhà máy", nullable=True)
    witness_council: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 3 đại diện: Đơn vị thực hiện, P.QLCL, Phòng đề xuất
    
    status: Mapped[str] = mapped_column(String(50), default="DISPOSED", nullable=False)  # PENDING_APPROVAL, APPROVED, DISPOSED
    approved_by: Mapped[Optional[str]] = mapped_column(String(100), default="Phòng Quản lý Chất lượng (P.QLCL)", nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), server_default=func.now())


