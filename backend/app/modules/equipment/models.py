from sqlalchemy import Column, String, Boolean, Text, Date, DateTime, Numeric, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from app.core.database import Base


class Equipment(Base):
    __tablename__ = "equipments"

    equipment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_code = Column(String(50), unique=True, nullable=False)
    equipment_name = Column(String(255), nullable=False)
    category = Column(String(50), default="PROCESSING")  # MEASURING, PROCESSING, STORAGE, UTILITY
    model = Column(String(100), nullable=True)
    serial_number = Column(String(100), nullable=True)
    manufacturer = Column(String(150), nullable=True)
    installation_location = Column(String(150), nullable=True)  # Xưởng chế biến 1, Phòng Lab KCS, Kho lạnh...
    installation_date = Column(Date, nullable=True)
    criticality_level = Column(String(30), default="MEDIUM_OPRP")  # HIGH_CCP, MEDIUM_OPRP, LOW_PRP
    status = Column(String(30), default="OPERATIONAL")  # OPERATIONAL, MAINTENANCE, CALIBRATION_OVERDUE, DECOMMISSIONED

    # Quản lý hiệu chuẩn (Calibration)
    calibration_frequency_months = Column(Integer, default=12)  # Chu kỳ 6 hoặc 12 tháng
    last_calibration_date = Column(Date, nullable=True)
    next_calibration_due = Column(Date, nullable=True)
    calibration_status = Column(String(30), default="VALID")  # VALID, EXPIRING_SOON, EXPIRED

    # Quản lý bảo trì (Maintenance)
    maintenance_frequency_days = Column(Integer, default=30)  # Chu kỳ bảo trì định kỳ PM (ngày)
    last_maintenance_date = Column(Date, nullable=True)
    next_maintenance_due = Column(Date, nullable=True)

    managed_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    specifications = Column(JSONB, nullable=True)  # {power_kw, capacity, temp_range_c, tolerance, ...}
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    manager = relationship("User", foreign_keys=[managed_by])
    maintenance_logs = relationship("EquipmentMaintenanceLog", back_populates="equipment", cascade="all, delete-orphan", order_by="desc(EquipmentMaintenanceLog.maintenance_date)")
    calibration_logs = relationship("EquipmentCalibrationLog", back_populates="equipment", cascade="all, delete-orphan", order_by="desc(EquipmentCalibrationLog.calibration_date)")


class EquipmentMaintenanceLog(Base):
    __tablename__ = "equipment_maintenance_logs"

    maintenance_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("equipments.equipment_id", ondelete="CASCADE"), nullable=False)
    maintenance_code = Column(String(50), unique=True, nullable=False)
    maintenance_type = Column(String(50), default="PREVENTIVE")  # PREVENTIVE, CORRECTIVE, LUBRICATION, OVERHAUL
    maintenance_date = Column(Date, nullable=False)
    performed_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    performer_name = Column(String(150), nullable=True)  # Tên KTV hoặc Nhà thầu ngoài
    tasks_performed = Column(JSONB, nullable=True)  # [{"task": "Thay dầu máy", "status": "PASS"}]
    parts_replaced = Column(JSONB, nullable=True)  # [{"part": "Gioăng cao su chịu nhiệt", "qty": 2}]
    
    # Tiêu chuẩn ISO 22000 về an toàn thực phẩm
    food_grade_lubricant_used = Column(Boolean, default=True)  # Sử dụng dầu mỡ bôi trơn an toàn thực phẩm NSF H1
    hygiene_sanitation_after_maint = Column(Boolean, default=True)  # Đã vệ sinh & khử trùng trả lại hiện trường sản xuất
    
    cost = Column(Numeric(12, 2), nullable=True, default=0.0)
    result_status = Column(String(30), default="SUCCESS")  # SUCCESS, NEED_FOLLOWUP, FAILED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    equipment = relationship("Equipment", back_populates="maintenance_logs")
    performer = relationship("User", foreign_keys=[performed_by])


class EquipmentCalibrationLog(Base):
    __tablename__ = "equipment_calibration_logs"

    calibration_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    equipment_id = Column(UUID(as_uuid=True), ForeignKey("equipments.equipment_id", ondelete="CASCADE"), nullable=False)
    calibration_code = Column(String(50), unique=True, nullable=False)
    calibration_type = Column(String(50), default="EXTERNAL")  # INTERNAL (Nội bộ), EXTERNAL (QUATEST / VILAS)
    calibration_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)
    agency_name = Column(String(255), nullable=True)  # Trung tâm Đo lường QUATEST 3, Viện Đo lường VMI...
    certificate_number = Column(String(100), nullable=True)  # Số tem hoặc số giấy chứng nhận hiệu chuẩn
    standard_applied = Column(String(100), default="ISO/IEC 17025 / TCVN")
    measured_deviation = Column(Numeric(8, 4), nullable=True)  # Sai số đo đạc thực tế
    allowable_tolerance = Column(Numeric(8, 4), nullable=True)  # Dung sai sai số cho phép
    is_passed = Column(Boolean, default=True)
    status = Column(String(30), default="PASSED")  # PASSED, FAILED, ADJUSTED
    certificate_file_url = Column(String(500), nullable=True)
    calibrated_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=True)
    calibrator_name = Column(String(150), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    equipment = relationship("Equipment", back_populates="calibration_logs")
    calibrator = relationship("User", foreign_keys=[calibrated_by])
