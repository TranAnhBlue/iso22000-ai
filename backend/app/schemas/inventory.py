import uuid
from typing import Optional, List, Any
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# ==================== 1. WAREHOUSE INVENTORY SCHEMAS ====================
class WarehouseInventoryBase(BaseModel):
    item_code: str = Field(..., min_length=2, max_length=50, description="Mã nguyên vật liệu hoặc thành phẩm")
    item_name: str = Field(..., min_length=2, max_length=255, description="Tên mặt hàng")
    category: str = Field("RAW_MATERIAL", description="RAW_MATERIAL, ADDITIVE, PACKAGING, FINISHED_GOOD")
    lot_number: str = Field(..., min_length=2, max_length=100, description="Mã số lô hàng")
    batch_id: Optional[uuid.UUID] = None
    qr_code: Optional[str] = Field(None, max_length=255, description="Mã QR hoặc Barcode")
    
    quantity: float = Field(..., gt=0, description="Số lượng tồn kho thực tế")
    unit: str = Field(..., min_length=1, max_length=20, description="Đơn vị tính: kg, bao, thùng, cái")
    min_stock_level: float = Field(100.0, ge=0, description="Mức tồn tối thiểu an toàn")
    
    mfg_date: date = Field(..., description="Ngày sản xuất")
    exp_date: date = Field(..., description="Hạn sử dụng")
    
    warehouse_type: str = Field("COLD_STORAGE", description="COLD_STORAGE, CHILL_STORAGE, DRY_STORAGE")
    location_bin: str = Field(..., min_length=2, max_length=50, description="Vị trí kệ/ô kho: Kệ A1-02")
    temperature_c: Optional[float] = Field(None, description="Nhiệt độ hiện tại của kho")
    
    status: str = Field("AVAILABLE", description="AVAILABLE, QUARANTINE, RESERVED, EXPIRED, DISPOSED")
    notes: Optional[str] = None

    @field_validator("item_code", "item_name", "lot_number", "unit", "location_bin")
    @classmethod
    def check_non_empty_strings(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Trường thông tin không được để trống!")
        return v.strip()

    @model_validator(mode="after")
    def validate_expiry_dates(self):
        if self.exp_date and self.mfg_date and self.exp_date < self.mfg_date:
            raise ValueError("Hạn sử dụng (EXP) không được nhỏ hơn ngày sản xuất (MFG)!")
        return self


class WarehouseInventoryCreate(WarehouseInventoryBase):
    pass


class WarehouseInventoryUpdate(BaseModel):
    item_code: Optional[str] = Field(None, min_length=2, max_length=50)
    item_name: Optional[str] = Field(None, min_length=2, max_length=255)
    category: Optional[str] = None
    lot_number: Optional[str] = Field(None, min_length=2, max_length=100)
    batch_id: Optional[uuid.UUID] = None
    qr_code: Optional[str] = None
    quantity: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = None
    min_stock_level: Optional[float] = Field(None, ge=0)
    mfg_date: Optional[date] = None
    exp_date: Optional[date] = None
    warehouse_type: Optional[str] = None
    location_bin: Optional[str] = None
    temperature_c: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("mfg_date", "exp_date", mode="before")
    @classmethod
    def convert_empty_dates(cls, v: Any) -> Any:
        if v == "" or v is None:
            return None
        return v


class WarehouseInventoryResponse(WarehouseInventoryBase):
    model_config = ConfigDict(from_attributes=True)

    inventory_id: uuid.UUID
    days_to_expiry: int = 0
    fefo_status: str = "GOOD"  # EXPIRED, CRITICAL_NEAR_EXPIRY (<=7d), NEAR_EXPIRY (<=30d), GOOD
    fefo_priority_rank: int = 1
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ==================== 2. RETAINED SAMPLES SCHEMAS ====================
class RetainedSampleBase(BaseModel):
    sample_code: str = Field(..., min_length=2, max_length=100, description="Mã mẫu lưu: ML-202608-01")
    batch_id: Optional[uuid.UUID] = None
    batch_number: str = Field(..., min_length=2, max_length=100, description="Mã mẻ/lô sản xuất tương ứng")
    product_name: str = Field(..., min_length=2, max_length=255, description="Tên sản phẩm mẫu")
    
    sample_weight_g: float = Field(200.0, gt=0, description="Khối lượng mẫu lưu (gam)")
    storage_cabinet: str = Field("Tủ đông mẫu T-01", min_length=2, max_length=100, description="Vị trí tủ lưu")
    storage_temperature_c: Optional[float] = Field(-18.0, description="Nhiệt độ bảo quản mẫu")
    
    sample_date: date = Field(..., description="Ngày lấy mẫu đối chứng")
    expiry_date: date = Field(..., description="Thời hạn lưu bắt buộc (HSD + 30 ngày)")
    
    sampled_by: str = Field("Nhân viên QC Ca", min_length=2, max_length=100, description="Người lấy mẫu")
    test_result: str = Field("PASS", description="PASS, FAIL, TESTING, PENDING")
    test_details: Optional[Any] = None
    
    status: str = Field("STORED", description="STORED, TESTED, DISPOSED, SEIZED")
    disposed_date: Optional[date] = None
    disposed_by: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("sample_code", "batch_number", "product_name", "storage_cabinet", "sampled_by")
    @classmethod
    def check_non_empty_strings(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Trường thông tin không được để trống!")
        return v.strip()

    @field_validator("disposed_date", mode="before")
    @classmethod
    def convert_empty_date(cls, v: Any) -> Any:
        if v == "" or v is None:
            return None
        return v

    @model_validator(mode="after")
    def validate_sample_dates(self):
        if self.expiry_date and self.sample_date and self.expiry_date < self.sample_date:
            raise ValueError("Thời hạn lưu mẫu không được nhỏ hơn ngày lấy mẫu!")
        return self


class RetainedSampleCreate(RetainedSampleBase):
    pass


class RetainedSampleUpdate(BaseModel):
    sample_code: Optional[str] = None
    batch_id: Optional[uuid.UUID] = None
    batch_number: Optional[str] = None
    product_name: Optional[str] = None
    sample_weight_g: Optional[float] = Field(None, gt=0)
    storage_cabinet: Optional[str] = None
    storage_temperature_c: Optional[float] = None
    sample_date: Optional[date] = None
    expiry_date: Optional[date] = None
    sampled_by: Optional[str] = None
    test_result: Optional[str] = None
    test_details: Optional[Any] = None
    status: Optional[str] = None
    disposed_date: Optional[date] = None
    disposed_by: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("sample_date", "expiry_date", "disposed_date", mode="before")
    @classmethod
    def convert_empty_dates(cls, v: Any) -> Any:
        if v == "" or v is None:
            return None
        return v


class RetainedSampleResponse(RetainedSampleBase):
    model_config = ConfigDict(from_attributes=True)

    sample_id: uuid.UUID
    days_remaining: int = 0
    is_expired_storage: bool = False
    created_at: Optional[datetime] = None


# ==================== 3. PRODUCTION BATCH & USAGE SCHEMAS ====================
class BatchMaterialUsageItem(BaseModel):
    material_lot_id: Optional[uuid.UUID] = None
    material_name: str = Field(..., min_length=2, max_length=255)
    lot_number: str = Field(..., min_length=2, max_length=100)
    quantity_used: float = Field(..., gt=0)
    unit: str = Field("kg", max_length=20)


class ProductionBatchBase(BaseModel):
    batch_number: str = Field(..., min_length=2, max_length=100, description="Mã mẻ sản xuất: LOT-202608-B01")
    product_name: str = Field(..., min_length=2, max_length=255, description="Tên sản phẩm chế biến")
    product_code: Optional[str] = Field(None, max_length=50)
    production_line: Optional[str] = Field("Dây chuyền Chế biến 01", max_length=100)
    shift: Optional[str] = Field("Ca 1 (06:00 - 14:00)", max_length=50)
    planned_quantity: float = Field(..., ge=0, description="Số lượng kế hoạch")
    actual_quantity: float = Field(..., ge=0, description="Số lượng thực tế")
    unit: str = Field("kg", max_length=20)
    start_time: datetime = Field(..., description="Thời điểm bắt đầu mẻ")
    end_time: Optional[datetime] = None
    status: str = Field("COMPLETED", description="PLANNED, IN_PROGRESS, COMPLETED, HOLD, CANCELLED")
    qc_inspector: Optional[str] = Field("QC Thẩm định", max_length=100)
    notes: Optional[str] = None
    materials: Optional[List[BatchMaterialUsageItem]] = []

    @field_validator("batch_number", "product_name", "unit")
    @classmethod
    def check_non_empty_strings(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Trường thông tin không được để trống!")
        return v.strip()


class ProductionBatchCreate(ProductionBatchBase):
    pass


class ProductionBatchUpdate(BaseModel):
    batch_number: Optional[str] = None
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    production_line: Optional[str] = None
    shift: Optional[str] = None
    planned_quantity: Optional[float] = Field(None, ge=0)
    actual_quantity: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None
    qc_inspector: Optional[str] = None
    notes: Optional[str] = None
    materials: Optional[List[BatchMaterialUsageItem]] = None


class BatchMaterialUsageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    usage_id: uuid.UUID
    material_lot_id: Optional[uuid.UUID] = None
    material_name: str
    lot_number: str
    quantity_used: float
    unit: str
    supplier_name: Optional[str] = None
    recorded_at: Optional[datetime] = None


class ProductionBatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    batch_id: uuid.UUID
    batch_number: str
    product_name: str
    product_code: Optional[str] = None
    production_line: Optional[str] = None
    shift: Optional[str] = None
    planned_quantity: float
    actual_quantity: float
    unit: str
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str
    qc_inspector: Optional[str] = None
    notes: Optional[str] = None
    material_usages: List[BatchMaterialUsageResponse] = []
    ccp_logs_count: int = 0
    created_at: Optional[datetime] = None


# ==================== 4. ORDER DISPATCH SCHEMAS ====================
class OrderDispatchBase(BaseModel):
    dispatch_code: str = Field(..., min_length=2, max_length=100, description="Mã phiếu xuất kho: PXK-2026-0801")
    order_number: str = Field(..., min_length=2, max_length=100, description="Mã đơn hàng: SO-2026-0045")
    customer_name: str = Field(..., min_length=2, max_length=255, description="Tên khách hàng / đại lý")
    customer_phone: Optional[str] = Field(None, max_length=50)
    destination_address: Optional[str] = Field(None, max_length=255)
    
    batch_id: Optional[uuid.UUID] = None
    batch_number: str = Field(..., min_length=2, max_length=100, description="Mã lô sản phẩm xuất")
    product_name: str = Field(..., min_length=2, max_length=255, description="Tên sản phẩm xuất kho")
    
    quantity_dispatched: float = Field(..., gt=0, description="Số lượng xuất")
    unit: str = Field("thùng", min_length=1, max_length=20)
    
    vehicle_number: Optional[str] = Field("59C-128.45", max_length=50)
    vehicle_temp_c: Optional[float] = Field(-18.0, description="Nhiệt độ thùng xe giao hàng")
    vehicle_check_status: bool = Field(True, description="Kiểm tra vệ sinh và thùng xe đạt yêu cầu")
    
    status: str = Field("DELIVERED", description="PREPARING, SHIPPED, DELIVERED, RETURNED, RECALLED")
    notes: Optional[str] = None

    @field_validator("dispatch_code", "order_number", "customer_name", "batch_number", "product_name")
    @classmethod
    def check_non_empty_strings(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Trường thông tin không được để trống!")
        return v.strip()


class OrderDispatchCreate(OrderDispatchBase):
    pass


class OrderDispatchUpdate(BaseModel):
    dispatch_code: Optional[str] = None
    order_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    destination_address: Optional[str] = None
    batch_id: Optional[uuid.UUID] = None
    batch_number: Optional[str] = None
    product_name: Optional[str] = None
    quantity_dispatched: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_temp_c: Optional[float] = None
    vehicle_check_status: Optional[bool] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class OrderDispatchResponse(OrderDispatchBase):
    model_config = ConfigDict(from_attributes=True)

    dispatch_id: uuid.UUID
    dispatched_at: Optional[datetime] = None
    dispatcher_name: Optional[str] = None


# ==================== 5. TRACEABILITY TREE & MOCK RECALL SCHEMAS ====================
class TraceabilitySupplierNode(BaseModel):
    supplier_code: str
    supplier_name: str
    rating_score: float
    certifications: Optional[Any] = None
    lot_number: str
    material_name: str
    received_date: Optional[date] = None
    iqc_status: str
    iqc_inspector: Optional[str] = None
    coa_file_url: Optional[str] = None


class TraceabilityCCPNode(BaseModel):
    ccp_code: str
    ccp_name: str
    process_step: Optional[str] = None
    measured_value: float
    unit: str
    critical_limit: Any
    is_critical_limit_exceeded: bool
    status: str
    test_time: Optional[datetime] = None
    checked_by_name: Optional[str] = None


class TraceabilitySampleNode(BaseModel):
    sample_code: str
    storage_cabinet: str
    sample_date: date
    expiry_date: date
    test_result: str
    status: str


class TraceabilityCustomerNode(BaseModel):
    dispatch_code: str
    order_number: str
    customer_name: str
    customer_phone: Optional[str] = None
    destination_address: Optional[str] = None
    quantity_dispatched: float
    unit: str
    vehicle_number: Optional[str] = None
    vehicle_temp_c: Optional[float] = None
    status: str
    dispatched_at: Optional[datetime] = None


class TraceabilityTreeResponse(BaseModel):
    query_target: str  # Mã Lô thành phẩm hoặc Mã phiếu xuất đã tra cứu
    trace_type: str = "BACKWARD"  # BACKWARD hoặc FORWARD
    found: bool = True
    message: str = "Truy xuất thành công"
    
    # 1. Thông tin thành phẩm / Mẻ sản xuất
    batch_info: Optional[ProductionBatchResponse] = None
    
    # 2. Tầng Nguyên liệu & Nhà cung ứng
    suppliers_and_materials: List[TraceabilitySupplierNode] = []
    
    # 3. Tầng Giám sát CCP / oPRP
    ccp_monitoring_records: List[TraceabilityCCPNode] = []
    
    # 4. Tầng Mẫu lưu nghiệm thức
    retained_samples: List[TraceabilitySampleNode] = []
    
    # 5. Tầng Tồn kho hiện tại
    warehouse_stock: List[WarehouseInventoryResponse] = []
    
    # 6. Tầng Khách hàng & Phân phối
    customers_dispatched: List[TraceabilityCustomerNode] = []
    
    # Tổng kết chỉ số ISO
    compliance_summary: dict = {
        "iso_clause": "ISO 22000:2018 Điều khoản 8.5.2 & 8.7",
        "is_safe_to_release": True,
        "ccp_compliant": True,
        "iqc_compliant": True,
        "sample_secured": True,
        "total_dispatched_qty": 0.0,
        "total_in_stock_qty": 0.0,
    }


class MockRecallResponse(BaseModel):
    material_lot_number: str
    material_name: str
    supplier_name: Optional[str] = None
    affected_batches: List[str] = []
    total_affected_production_qty: float = 0.0
    stock_in_warehouse: List[WarehouseInventoryResponse] = []
    quarantine_action_taken: bool = False
    affected_customers: List[TraceabilityCustomerNode] = []
    total_units_in_market: float = 0.0
    recall_risk_level: str = "HIGH"  # CRITICAL, HIGH, MEDIUM, LOW
    iso_recall_time_est_minutes: int = 15  # Thời gian hoàn thành truy xuất thu hồi (chuẩn ISO < 120 phút)
