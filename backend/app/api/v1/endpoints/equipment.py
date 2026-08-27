from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, and_, desc
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timedelta, timezone

from app.core.database import get_db
from app.models.equipment import Equipment, EquipmentMaintenanceLog, EquipmentCalibrationLog
from app.models.user import User
from app.schemas.equipment import (
    EquipmentCreate, EquipmentUpdate, EquipmentResponse,
    EquipmentMaintenanceLogCreate, EquipmentMaintenanceLogUpdate, EquipmentMaintenanceLogResponse,
    EquipmentCalibrationLogCreate, EquipmentCalibrationLogUpdate, EquipmentCalibrationLogResponse,
    EquipmentStatsResponse, AIPredictMaintenanceRequest, AIPredictMaintenanceResponse,
    AIEvaluateCalibrationRequest, AIEvaluateCalibrationResponse
)

router = APIRouter()


# ==================== HELPER: AUTO-SEED IF EMPTY ====================
def seed_default_equipments_if_empty(db: Session):
    existing = db.scalars(select(Equipment)).first()
    if existing:
        return

    today = date.today()
    admin_user = db.scalars(select(User).order_by(User.created_at.asc())).first()
    admin_id = admin_user.user_id if admin_user else None

    # 1. Danh mục 6 thiết bị chế biến & đo lường mẫu
    eq1 = Equipment(
        equipment_code="EQ-STER-01",
        equipment_name="Nồi tiệt trùng cao áp Retort (CCP 2 - Gia nhiệt)",
        category="PROCESSING",
        model="DTS-1200 Autoclave",
        serial_number="RT-2024-9982",
        manufacturer="DTS Food Machinery Inc.",
        installation_location="Phân xưởng Chế biến Nhiệt - Dây chuyền 1",
        installation_date=today - timedelta(days=720),
        criticality_level="HIGH_CCP",
        status="OPERATIONAL",
        calibration_frequency_months=6,
        last_calibration_date=today - timedelta(days=60),
        next_calibration_due=today + timedelta(days=120),
        calibration_status="VALID",
        maintenance_frequency_days=30,
        last_maintenance_date=today - timedelta(days=10),
        next_maintenance_due=today + timedelta(days=20),
        managed_by=admin_id,
        specifications={
            "power_kw": 45.0,
            "max_pressure_bar": 4.0,
            "temperature_range_c": "80°C - 135°C",
            "capacity": "1200 lít / mẻ",
            "associated_ccp": "CCP 2 - Tiệt trùng nhiệt độ cao",
        },
        notes="Thiết bị kiểm soát CCP sống còn. Yêu cầu kiểm định áp kế và cảm biến nhiệt RTD định kỳ 6 tháng.",
    )

    eq2 = Equipment(
        equipment_code="EQ-MET-01",
        equipment_name="Máy dò kim loại băng tải tự động (CCP 3)",
        category="MEASURING",
        model="Mettler Toledo Profile Advantage",
        serial_number="MT-PA-7712",
        manufacturer="Mettler Toledo Inc.",
        installation_location="Khu vực Đóng gói Bao bì Cuối dây chuyền",
        installation_date=today - timedelta(days=500),
        criticality_level="HIGH_CCP",
        status="OPERATIONAL",
        calibration_frequency_months=12,
        last_calibration_date=today - timedelta(days=200),
        next_calibration_due=today + timedelta(days=165),
        calibration_status="VALID",
        maintenance_frequency_days=15,
        last_maintenance_date=today - timedelta(days=5),
        next_maintenance_due=today + timedelta(days=10),
        managed_by=admin_id,
        specifications={
            "belt_speed_m_min": 25.0,
            "sensitivity_fe": "1.2 mm",
            "sensitivity_non_fe": "1.5 mm",
            "sensitivity_sus316": "2.0 mm",
            "reject_mechanism": "Pneumatic Pusher (Tay đẩy khí nén)",
        },
        notes="Chốt chặn vật lý CCP 3. Kiểm tra độ nhạy bằng mẫu thử chuẩn mỗi 2 giờ/lần.",
    )

    eq3 = Equipment(
        equipment_code="EQ-SCALE-02",
        equipment_name="Cân phân tích điện tử 4 số lẻ",
        category="MEASURING",
        model="Sartorius Entris II Advanced",
        serial_number="ST-EN-4401",
        manufacturer="Sartorius AG Germany",
        installation_location="Phòng Thí nghiệm KCS / QA-QC",
        installation_date=today - timedelta(days=350),
        criticality_level="MEDIUM_OPRP",
        status="OPERATIONAL",
        calibration_frequency_months=12,
        last_calibration_date=today - timedelta(days=355),
        next_calibration_due=today + timedelta(days=10),  # Sắp hết hạn < 15 ngày!
        calibration_status="EXPIRING_SOON",
        maintenance_frequency_days=90,
        last_maintenance_date=today - timedelta(days=80),
        next_maintenance_due=today + timedelta(days=10),
        managed_by=admin_id,
        specifications={
            "max_capacity_g": 220.0,
            "readability_mg": 0.1,
            "repeatability_mg": 0.1,
            "calibration_weight_class": "F1 Standard Weight",
        },
        notes="Dùng để cân mẫu vi sinh và phụ gia thực phẩm tỷ lệ nhỏ. Sắp đến hạn hiệu chuẩn QUATEST.",
    )

    eq4 = Equipment(
        equipment_code="EQ-IQF-01",
        equipment_name="Hệ thống hầm cấp đông siêu tốc IQF",
        category="STORAGE",
        model="Mycom IQF Tunnel Freezer 500kg/h",
        serial_number="MY-IQF-3321",
        manufacturer="Mayekawa Manufacturing Co., Ltd.",
        installation_location="Phân xưởng Cấp đông & Trữ lạnh",
        installation_date=today - timedelta(days=800),
        criticality_level="MEDIUM_OPRP",
        status="OPERATIONAL",
        calibration_frequency_months=12,
        last_calibration_date=today - timedelta(days=150),
        next_calibration_due=today + timedelta(days=215),
        calibration_status="VALID",
        maintenance_frequency_days=30,
        last_maintenance_date=today - timedelta(days=25),
        next_maintenance_due=today + timedelta(days=5),
        managed_by=admin_id,
        specifications={
            "cooling_capacity": "500 kg/h",
            "evaporator_temp_c": -40.0,
            "refrigerant": "R404A / NH3 Safe System",
            "defrost_cycle": "Hot Gas Defrosting",
        },
        notes="Duy trì nhiệt độ tâm sản phẩm <= -18°C. Bắt buộc kiểm tra rò rỉ môi chất lạnh định kỳ.",
    )

    eq5 = Equipment(
        equipment_code="EQ-BRIX-01",
        equipment_name="Khúc xạ kế đo độ ngọt Brix điện tử cầm tay",
        category="MEASURING",
        model="Atago PAL-1 Pocket Refractometer",
        serial_number="AT-PAL-8831",
        manufacturer="Atago Co., Ltd. Japan",
        installation_location="Khu vực Tiếp nhận & Pha chế Siro",
        installation_date=today - timedelta(days=400),
        criticality_level="LOW_PRP",
        status="CALIBRATION_OVERDUE",
        calibration_frequency_months=6,
        last_calibration_date=today - timedelta(days=200),
        next_calibration_due=today - timedelta(days=20),  # ĐÃ QUÁ HẠN 20 NGÀY!
        calibration_status="EXPIRED",
        maintenance_frequency_days=180,
        last_maintenance_date=today - timedelta(days=150),
        next_maintenance_due=today + timedelta(days=30),
        managed_by=admin_id,
        specifications={
            "range_brix": "0.0 - 53.0%",
            "resolution_brix": 0.1,
            "accuracy_brix": "+/- 0.2%",
            "temperature_compensation": "10 - 100°C ATC",
        },
        notes="ĐÃ QUÁ HẠN HIỆU CHUẨN. Cần dán nhãn tạm ngừng sử dụng hoặc liên hệ QUATEST hiệu chuẩn khẩn cấp.",
    )

    eq6 = Equipment(
        equipment_code="EQ-VAC-02",
        equipment_name="Máy đóng gói hút chân không 2 buồng",
        category="PROCESSING",
        model="Multivac C500 Double Chamber",
        serial_number="MV-C500-1120",
        manufacturer="Multivac Group Germany",
        installation_location="Khu vực Bao gói Sơ chế 2",
        installation_date=today - timedelta(days=600),
        criticality_level="MEDIUM_OPRP",
        status="MAINTENANCE",
        calibration_frequency_months=12,
        last_calibration_date=today - timedelta(days=180),
        next_calibration_due=today + timedelta(days=185),
        calibration_status="VALID",
        maintenance_frequency_days=30,
        last_maintenance_date=today - timedelta(days=32),
        next_maintenance_due=today - timedelta(days=2),
        managed_by=admin_id,
        specifications={
            "vacuum_pump_capacity_m3h": 160.0,
            "sealing_bar_length_mm": 650,
            "cycle_time_sec": "15 - 25 giây/mẻ",
        },
        notes="Đang bảo dưỡng định kỳ thay dầu bơm hút chân không thực phẩm Busch VM100.",
    )

    db.add_all([eq1, eq2, eq3, eq4, eq5, eq6])
    db.flush()

    # 2. Nhật ký bảo trì mẫu chuẩn ISO 22000 (Có chứng nhận Dầu nhờn NSF H1 & Vệ sinh hiện trường)
    maint1 = EquipmentMaintenanceLog(
        equipment_id=eq1.equipment_id,
        maintenance_code="MAINT-2026-081",
        maintenance_type="PREVENTIVE",
        maintenance_date=today - timedelta(days=10),
        performed_by=admin_id,
        performer_name="Nguyễn Văn Kỹ Thuật (Tổ Trưởng Cơ Điện)",
        tasks_performed=[
            {"task": "Kiểm tra độ kín gioăng cửa nồi tiệt trùng", "result": "PASS"},
            {"task": "Hiệu chỉnh van an toàn áp suất hơi 3.5 bar", "result": "PASS"},
            {"task": "Bôi trơn khớp bản lề bằng mỡ chịu nhiệt an toàn thực phẩm NSF H1", "result": "PASS"},
            {"task": "Kiểm tra đầu đo nhiệt độ RTD PT100", "result": "PASS"},
        ],
        parts_replaced=[
            {"part": "Gioăng silicon chịu nhiệt 150°C", "qty": 1, "unit": "Bộ"},
        ],
        food_grade_lubricant_used=True,
        hygiene_sanitation_after_maint=True,
        cost=1500000.0,
        result_status="SUCCESS",
        notes="Bảo dưỡng định kỳ 30 ngày. Đã vệ sinh khử trùng toàn bộ buồng tiệt trùng và bàn giao cho Trưởng ca sản xuất.",
    )

    maint2 = EquipmentMaintenanceLog(
        equipment_id=eq2.equipment_id,
        maintenance_code="MAINT-2026-082",
        maintenance_type="PREVENTIVE",
        maintenance_date=today - timedelta(days=5),
        performed_by=admin_id,
        performer_name="Trần Đình Máy (KTV Bảo trì Dây chuyền)",
        tasks_performed=[
            {"task": "Vệ sinh cảm biến quang học & băng tải PU", "result": "PASS"},
            {"task": "Thử nghiệm kích hoạt bộ đẩy khí nén loại bỏ sản phẩm lỗi", "result": "PASS"},
            {"task": "Kiểm tra độ căng dây curoa động cơ truyền động", "result": "PASS"},
        ],
        parts_replaced=[],
        food_grade_lubricant_used=True,
        hygiene_sanitation_after_maint=True,
        cost=350000.0,
        result_status="SUCCESS",
        notes="Bảo dưỡng 15 ngày một lần. Cơ cấu đẩy phế phẩm hoạt động dứt khoát.",
    )

    # 3. Biên bản hiệu chuẩn mẫu (QUATEST 3 / VILAS)
    cal1 = EquipmentCalibrationLog(
        equipment_id=eq1.equipment_id,
        calibration_code="CAL-2026-0042",
        calibration_type="EXTERNAL",
        calibration_date=today - timedelta(days=60),
        expiry_date=today + timedelta(days=120),
        agency_name="Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng 3 (QUATEST 3)",
        certificate_number="HC-QT3-2026-9812",
        standard_applied="ISO/IEC 17025:2017 & ĐLVN 138:2004",
        measured_deviation=0.08,
        allowable_tolerance=0.50,
        is_passed=True,
        status="PASSED",
        certificate_file_url="https://wcert.vn/cert/HC-QT3-2026-9812.pdf",
        calibrated_by=admin_id,
        calibrator_name="Chuyên viên Kiểm định QUATEST 3 - Lê Quốc Đo",
        notes="Hiệu chuẩn nhiệt độ tại các điểm 100°C, 121°C và 130°C. Sai số tối đa +0.08°C nằm trong ngưỡng cho phép (+/-0.5°C). Đạt chuẩn an toàn tiệt trùng.",
    )

    cal2 = EquipmentCalibrationLog(
        equipment_id=eq3.equipment_id,
        calibration_code="CAL-2025-0118",
        calibration_type="EXTERNAL",
        calibration_date=today - timedelta(days=355),
        expiry_date=today + timedelta(days=10),
        agency_name="Viện Đo lường Việt Nam (VMI)",
        certificate_number="VMI-CAL-2025-441",
        standard_applied="ĐLVN 16:2009 Cân phân tích",
        measured_deviation=0.0002,
        allowable_tolerance=0.0005,
        is_passed=True,
        status="PASSED",
        certificate_file_url="https://wcert.vn/cert/VMI-CAL-2025-441.pdf",
        calibrated_by=admin_id,
        calibrator_name="KTV Viện Đo Lường",
        notes="Cân đạt cấp chính xác I. Chuẩn bị liên hệ gia hạn kiểm định năm 2026.",
    )

    db.add_all([maint1, maint2, cal1, cal2])
    db.commit()


def sync_equipment_calibration_state(eq: Equipment, db: Session):
    """Tự động đồng bộ ngày hiệu chuẩn gần nhất, hạn kế tiếp và trạng thái tem theo lịch sử kiểm định mới nhất"""
    latest_cal = db.scalar(
        select(EquipmentCalibrationLog)
        .where(EquipmentCalibrationLog.equipment_id == eq.equipment_id)
        .order_by(EquipmentCalibrationLog.calibration_date.desc(), EquipmentCalibrationLog.created_at.desc())
    )
    today = date.today()
    if latest_cal:
        eq.last_calibration_date = latest_cal.calibration_date
        eq.next_calibration_due = latest_cal.expiry_date
        if latest_cal.is_passed:
            days_left = (latest_cal.expiry_date - today).days
            if days_left < 0:
                eq.calibration_status = "EXPIRED"
                eq.status = "CALIBRATION_OVERDUE"
            elif days_left <= 15:
                eq.calibration_status = "EXPIRING_SOON"
                if eq.status == "CALIBRATION_OVERDUE":
                    eq.status = "OPERATIONAL"
            else:
                eq.calibration_status = "VALID"
                if eq.status == "CALIBRATION_OVERDUE":
                    eq.status = "OPERATIONAL"
        else:
            eq.calibration_status = "EXPIRED"
            eq.status = "CALIBRATION_OVERDUE"
    else:
        if eq.last_calibration_date and not eq.next_calibration_due:
            freq_m = eq.calibration_frequency_months or 12
            eq.next_calibration_due = eq.last_calibration_date + timedelta(days=freq_m * 30)


def sync_equipment_maintenance_state(eq: Equipment, db: Session):
    """Tự động đồng bộ ngày bảo trì gần nhất và hạn kế tiếp theo lịch sử PM mới nhất"""
    latest_maint = db.scalar(
        select(EquipmentMaintenanceLog)
        .where(EquipmentMaintenanceLog.equipment_id == eq.equipment_id)
        .order_by(EquipmentMaintenanceLog.maintenance_date.desc(), EquipmentMaintenanceLog.created_at.desc())
    )
    if latest_maint:
        eq.last_maintenance_date = latest_maint.maintenance_date
        freq_d = eq.maintenance_frequency_days or 30
        eq.next_maintenance_due = latest_maint.maintenance_date + timedelta(days=freq_d)
        if eq.status == "MAINTENANCE":
            eq.status = "OPERATIONAL"
    else:
        if eq.last_maintenance_date and not eq.next_maintenance_due:
            freq_d = eq.maintenance_frequency_days or 30
            eq.next_maintenance_due = eq.last_maintenance_date + timedelta(days=freq_d)


# ==================== 1. KPI STATS ENDPOINT ====================
@router.get("/stats", response_model=EquipmentStatsResponse)
def get_equipment_stats(db: Session = Depends(get_db)):
    seed_default_equipments_if_empty(db)

    today = date.today()
    equipments = db.scalars(select(Equipment)).unique().all()
    total_equipments = len(equipments)

    operational_count = 0
    under_maintenance_count = 0
    calibration_valid_count = 0
    calibration_expiring_soon_count = 0
    calibration_overdue_count = 0
    pm_due_this_month = 0

    for eq in equipments:
        sync_equipment_calibration_state(eq, db)
        sync_equipment_maintenance_state(eq, db)

        if eq.status == "OPERATIONAL":
            operational_count += 1
        elif eq.status == "MAINTENANCE":
            under_maintenance_count += 1

        if eq.next_calibration_due:
            days_left = (eq.next_calibration_due - today).days
            if days_left < 0:
                calibration_overdue_count += 1
            elif days_left <= 15:
                calibration_expiring_soon_count += 1
            else:
                calibration_valid_count += 1
        else:
            calibration_valid_count += 1

        if eq.next_maintenance_due:
            if 0 <= (eq.next_maintenance_due - today).days <= 30:
                pm_due_this_month += 1

    db.commit()

    compliance_rate = (
        round((calibration_valid_count / total_equipments) * 100.0, 1)
        if total_equipments > 0
        else 100.0
    )

    maint_count_year = db.scalar(select(func.count(EquipmentMaintenanceLog.maintenance_id))) or 0
    cal_count_year = db.scalar(select(func.count(EquipmentCalibrationLog.calibration_id))) or 0

    return EquipmentStatsResponse(
        total_equipments=total_equipments,
        operational_count=operational_count,
        under_maintenance_count=under_maintenance_count,
        calibration_valid_count=calibration_valid_count,
        calibration_expiring_soon_count=calibration_expiring_soon_count,
        calibration_overdue_count=calibration_overdue_count,
        calibration_compliance_rate=compliance_rate,
        preventive_maintenance_due_this_month=pm_due_this_month,
        total_maintenance_logs_year=maint_count_year,
        total_calibration_logs_year=cal_count_year,
    )


# ==================== 2. EQUIPMENT CRUD ====================
@router.get("/equipments", response_model=List[EquipmentResponse])
def get_equipments(
    category: Optional[str] = None,
    criticality: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_default_equipments_if_empty(db)

    stmt = select(Equipment)
    if category and category != "ALL":
        stmt = stmt.where(Equipment.category == category)
    if criticality and criticality != "ALL":
        stmt = stmt.where(Equipment.criticality_level == criticality)
    if status and status != "ALL":
        stmt = stmt.where(Equipment.status == status)
    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Equipment.equipment_code.ilike(term),
                Equipment.equipment_name.ilike(term),
                Equipment.model.ilike(term),
                Equipment.installation_location.ilike(term),
                Equipment.manufacturer.ilike(term),
            )
        )

    stmt = stmt.order_by(Equipment.criticality_level.asc(), Equipment.equipment_code.asc())
    equipments = db.scalars(stmt).unique().all()
    today = date.today()

    results = []
    for eq in equipments:
        sync_equipment_calibration_state(eq, db)
        sync_equipment_maintenance_state(eq, db)

        days_cal = (eq.next_calibration_due - today).days if eq.next_calibration_due else None
        days_maint = (eq.next_maintenance_due - today).days if eq.next_maintenance_due else None

        manager_name = eq.manager.full_name if eq.manager else None
        total_m = len(eq.maintenance_logs) if eq.maintenance_logs else 0
        total_c = len(eq.calibration_logs) if eq.calibration_logs else 0

        item = EquipmentResponse(
            equipment_id=eq.equipment_id,
            equipment_code=eq.equipment_code,
            equipment_name=eq.equipment_name,
            category=eq.category or "PROCESSING",
            model=eq.model,
            serial_number=eq.serial_number,
            manufacturer=eq.manufacturer,
            installation_location=eq.installation_location,
            installation_date=eq.installation_date,
            criticality_level=eq.criticality_level or "MEDIUM_OPRP",
            status=eq.status or "OPERATIONAL",
            calibration_frequency_months=eq.calibration_frequency_months or 12,
            last_calibration_date=eq.last_calibration_date,
            next_calibration_due=eq.next_calibration_due,
            calibration_status=eq.calibration_status or "VALID",
            maintenance_frequency_days=eq.maintenance_frequency_days or 30,
            last_maintenance_date=eq.last_maintenance_date,
            next_maintenance_due=eq.next_maintenance_due,
            managed_by=eq.managed_by,
            specifications=eq.specifications,
            notes=eq.notes,
            manager_name=manager_name,
            days_until_calibration=days_cal,
            days_until_maintenance=days_maint,
            total_maintenance_logs=total_m,
            total_calibration_logs=total_c,
            created_at=eq.created_at,
        )
        results.append(item)

    db.commit()
    return results


@router.post("/equipments", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
def create_equipment(payload: EquipmentCreate, db: Session = Depends(get_db)):
    dup = db.scalar(select(Equipment).where(Equipment.equipment_code == payload.equipment_code))
    if dup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã thiết bị '{payload.equipment_code}' đã tồn tại trong hệ thống!",
        )

    # Tự động tính next_calibration_due và next_maintenance_due nếu chưa có
    next_cal = payload.next_calibration_due
    if not next_cal and payload.last_calibration_date:
        freq_m = payload.calibration_frequency_months or 12
        next_cal = payload.last_calibration_date + timedelta(days=freq_m * 30)

    next_maint = payload.next_maintenance_due
    if not next_maint and payload.last_maintenance_date:
        freq_d = payload.maintenance_frequency_days or 30
        next_maint = payload.last_maintenance_date + timedelta(days=freq_d)

    eq = Equipment(
        equipment_code=payload.equipment_code,
        equipment_name=payload.equipment_name,
        category=payload.category,
        model=payload.model,
        serial_number=payload.serial_number,
        manufacturer=payload.manufacturer,
        installation_location=payload.installation_location,
        installation_date=payload.installation_date,
        criticality_level=payload.criticality_level,
        status=payload.status,
        calibration_frequency_months=payload.calibration_frequency_months,
        last_calibration_date=payload.last_calibration_date,
        next_calibration_due=next_cal,
        calibration_status=payload.calibration_status,
        maintenance_frequency_days=payload.maintenance_frequency_days,
        last_maintenance_date=payload.last_maintenance_date,
        next_maintenance_due=next_maint,
        managed_by=payload.managed_by,
        specifications=payload.specifications,
        notes=payload.notes,
    )
    db.add(eq)
    db.commit()
    db.refresh(eq)

    return EquipmentResponse(
        equipment_id=eq.equipment_id,
        equipment_code=eq.equipment_code,
        equipment_name=eq.equipment_name,
        category=eq.category,
        model=eq.model,
        serial_number=eq.serial_number,
        manufacturer=eq.manufacturer,
        installation_location=eq.installation_location,
        installation_date=eq.installation_date,
        criticality_level=eq.criticality_level,
        status=eq.status,
        calibration_frequency_months=eq.calibration_frequency_months,
        last_calibration_date=eq.last_calibration_date,
        next_calibration_due=eq.next_calibration_due,
        calibration_status=eq.calibration_status,
        maintenance_frequency_days=eq.maintenance_frequency_days,
        last_maintenance_date=eq.last_maintenance_date,
        next_maintenance_due=eq.next_maintenance_due,
        managed_by=eq.managed_by,
        specifications=eq.specifications,
        notes=eq.notes,
        manager_name=None,
        days_until_calibration=None,
        days_until_maintenance=None,
        total_maintenance_logs=0,
        total_calibration_logs=0,
        created_at=eq.created_at,
    )


@router.get("/equipments/{equipment_id}", response_model=EquipmentResponse)
def get_equipment_detail(equipment_id: UUID, db: Session = Depends(get_db)):
    eq = db.get(Equipment, equipment_id)
    if not eq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thiết bị")

    today = date.today()
    days_cal = (eq.next_calibration_due - today).days if eq.next_calibration_due else None
    days_maint = (eq.next_maintenance_due - today).days if eq.next_maintenance_due else None

    return EquipmentResponse(
        equipment_id=eq.equipment_id,
        equipment_code=eq.equipment_code,
        equipment_name=eq.equipment_name,
        category=eq.category or "PROCESSING",
        model=eq.model,
        serial_number=eq.serial_number,
        manufacturer=eq.manufacturer,
        installation_location=eq.installation_location,
        installation_date=eq.installation_date,
        criticality_level=eq.criticality_level or "MEDIUM_OPRP",
        status=eq.status or "OPERATIONAL",
        calibration_frequency_months=eq.calibration_frequency_months or 12,
        last_calibration_date=eq.last_calibration_date,
        next_calibration_due=eq.next_calibration_due,
        calibration_status=eq.calibration_status or "VALID",
        maintenance_frequency_days=eq.maintenance_frequency_days or 30,
        last_maintenance_date=eq.last_maintenance_date,
        next_maintenance_due=eq.next_maintenance_due,
        managed_by=eq.managed_by,
        specifications=eq.specifications,
        notes=eq.notes,
        manager_name=eq.manager.full_name if eq.manager else None,
        days_until_calibration=days_cal,
        days_until_maintenance=days_maint,
        total_maintenance_logs=len(eq.maintenance_logs) if eq.maintenance_logs else 0,
        total_calibration_logs=len(eq.calibration_logs) if eq.calibration_logs else 0,
        created_at=eq.created_at,
    )


@router.put("/equipments/{equipment_id}", response_model=EquipmentResponse)
def update_equipment(equipment_id: UUID, payload: EquipmentUpdate, db: Session = Depends(get_db)):
    eq = db.get(Equipment, equipment_id)
    if not eq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thiết bị")

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(eq, field, val)

    db.commit()
    db.refresh(eq)

    today = date.today()
    days_cal = (eq.next_calibration_due - today).days if eq.next_calibration_due else None
    days_maint = (eq.next_maintenance_due - today).days if eq.next_maintenance_due else None

    return EquipmentResponse(
        equipment_id=eq.equipment_id,
        equipment_code=eq.equipment_code,
        equipment_name=eq.equipment_name,
        category=eq.category or "PROCESSING",
        model=eq.model,
        serial_number=eq.serial_number,
        manufacturer=eq.manufacturer,
        installation_location=eq.installation_location,
        installation_date=eq.installation_date,
        criticality_level=eq.criticality_level or "MEDIUM_OPRP",
        status=eq.status or "OPERATIONAL",
        calibration_frequency_months=eq.calibration_frequency_months or 12,
        last_calibration_date=eq.last_calibration_date,
        next_calibration_due=eq.next_calibration_due,
        calibration_status=eq.calibration_status or "VALID",
        maintenance_frequency_days=eq.maintenance_frequency_days or 30,
        last_maintenance_date=eq.last_maintenance_date,
        next_maintenance_due=eq.next_maintenance_due,
        managed_by=eq.managed_by,
        specifications=eq.specifications,
        notes=eq.notes,
        manager_name=eq.manager.full_name if eq.manager else None,
        days_until_calibration=days_cal,
        days_until_maintenance=days_maint,
        total_maintenance_logs=len(eq.maintenance_logs) if eq.maintenance_logs else 0,
        total_calibration_logs=len(eq.calibration_logs) if eq.calibration_logs else 0,
        created_at=eq.created_at,
    )


@router.delete("/equipments/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_equipment(equipment_id: UUID, db: Session = Depends(get_db)):
    eq = db.get(Equipment, equipment_id)
    if not eq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thiết bị")
    db.delete(eq)
    db.commit()
    return None


# ==================== 3. MAINTENANCE LOG CRUD ====================
@router.get("/maintenance-logs", response_model=List[EquipmentMaintenanceLogResponse])
def get_maintenance_logs(
    equipment_id: Optional[UUID] = None,
    maint_type: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    stmt = select(EquipmentMaintenanceLog)
    if equipment_id:
        stmt = stmt.where(EquipmentMaintenanceLog.equipment_id == equipment_id)
    if maint_type and maint_type != "ALL":
        stmt = stmt.where(EquipmentMaintenanceLog.maintenance_type == maint_type)
    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.join(Equipment).where(
            or_(
                EquipmentMaintenanceLog.maintenance_code.ilike(term),
                EquipmentMaintenanceLog.performer_name.ilike(term),
                Equipment.equipment_name.ilike(term),
                Equipment.equipment_code.ilike(term),
            )
        )

    stmt = stmt.order_by(EquipmentMaintenanceLog.maintenance_date.desc(), EquipmentMaintenanceLog.created_at.desc())
    logs = db.scalars(stmt).unique().all()

    results = []
    for m in logs:
        eq = m.equipment
        results.append(
            EquipmentMaintenanceLogResponse(
                maintenance_id=m.maintenance_id,
                equipment_id=m.equipment_id,
                maintenance_code=m.maintenance_code,
                maintenance_type=m.maintenance_type,
                maintenance_date=m.maintenance_date,
                performed_by=m.performed_by,
                performer_name=m.performer_name,
                tasks_performed=m.tasks_performed or [],
                parts_replaced=m.parts_replaced or [],
                food_grade_lubricant_used=m.food_grade_lubricant_used,
                hygiene_sanitation_after_maint=m.hygiene_sanitation_after_maint,
                cost=float(m.cost) if m.cost is not None else 0.0,
                result_status=m.result_status,
                notes=m.notes,
                equipment_code=eq.equipment_code if eq else None,
                equipment_name=eq.equipment_name if eq else None,
                installation_location=eq.installation_location if eq else None,
                performer_display_name=m.performer.full_name if m.performer else m.performer_name,
                created_at=m.created_at,
            )
        )
    return results


@router.post("/maintenance-logs", response_model=EquipmentMaintenanceLogResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_log(payload: EquipmentMaintenanceLogCreate, db: Session = Depends(get_db)):
    eq = db.get(Equipment, payload.equipment_id)
    if not eq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thiết bị tương ứng")

    dup = db.scalar(select(EquipmentMaintenanceLog).where(EquipmentMaintenanceLog.maintenance_code == payload.maintenance_code))
    if dup:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Mã phiếu bảo trì '{payload.maintenance_code}' đã tồn tại!")

    log = EquipmentMaintenanceLog(
        equipment_id=payload.equipment_id,
        maintenance_code=payload.maintenance_code,
        maintenance_type=payload.maintenance_type,
        maintenance_date=payload.maintenance_date,
        performed_by=payload.performed_by,
        performer_name=payload.performer_name,
        tasks_performed=payload.tasks_performed,
        parts_replaced=payload.parts_replaced,
        food_grade_lubricant_used=payload.food_grade_lubricant_used,
        hygiene_sanitation_after_maint=payload.hygiene_sanitation_after_maint,
        cost=payload.cost or 0.0,
        result_status=payload.result_status,
        notes=payload.notes,
    )
    db.add(log)
    db.flush()

    # Tự động đồng bộ sang hồ sơ lý lịch thiết bị
    sync_equipment_maintenance_state(eq, db)

    db.commit()
    db.refresh(log)

    return EquipmentMaintenanceLogResponse(
        maintenance_id=log.maintenance_id,
        equipment_id=log.equipment_id,
        maintenance_code=log.maintenance_code,
        maintenance_type=log.maintenance_type,
        maintenance_date=log.maintenance_date,
        performed_by=log.performed_by,
        performer_name=log.performer_name,
        tasks_performed=log.tasks_performed or [],
        parts_replaced=log.parts_replaced or [],
        food_grade_lubricant_used=log.food_grade_lubricant_used,
        hygiene_sanitation_after_maint=log.hygiene_sanitation_after_maint,
        cost=float(log.cost) if log.cost is not None else 0.0,
        result_status=log.result_status,
        notes=log.notes,
        equipment_code=eq.equipment_code,
        equipment_name=eq.equipment_name,
        installation_location=eq.installation_location,
        performer_display_name=log.performer.full_name if log.performer else log.performer_name,
        created_at=log.created_at,
    )


@router.put("/maintenance-logs/{maintenance_id}", response_model=EquipmentMaintenanceLogResponse)
def update_maintenance_log(maintenance_id: UUID, payload: EquipmentMaintenanceLogUpdate, db: Session = Depends(get_db)):
    log = db.get(EquipmentMaintenanceLog, maintenance_id)
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiếu bảo trì")

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(log, k, v)

    db.flush()
    eq = log.equipment
    if eq:
        sync_equipment_maintenance_state(eq, db)

    db.commit()
    db.refresh(log)

    return EquipmentMaintenanceLogResponse(
        maintenance_id=log.maintenance_id,
        equipment_id=log.equipment_id,
        maintenance_code=log.maintenance_code,
        maintenance_type=log.maintenance_type,
        maintenance_date=log.maintenance_date,
        performed_by=log.performed_by,
        performer_name=log.performer_name,
        tasks_performed=log.tasks_performed or [],
        parts_replaced=log.parts_replaced or [],
        food_grade_lubricant_used=log.food_grade_lubricant_used,
        hygiene_sanitation_after_maint=log.hygiene_sanitation_after_maint,
        cost=float(log.cost) if log.cost is not None else 0.0,
        result_status=log.result_status,
        notes=log.notes,
        equipment_code=eq.equipment_code if eq else None,
        equipment_name=eq.equipment_name if eq else None,
        installation_location=eq.installation_location if eq else None,
        performer_display_name=log.performer.full_name if log.performer else log.performer_name,
        created_at=log.created_at,
    )


@router.delete("/maintenance-logs/{maintenance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance_log(maintenance_id: UUID, db: Session = Depends(get_db)):
    log = db.get(EquipmentMaintenanceLog, maintenance_id)
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiếu bảo trì")
    eq = log.equipment
    db.delete(log)
    db.flush()
    if eq:
        sync_equipment_maintenance_state(eq, db)
    db.commit()
    return None


# ==================== 4. CALIBRATION LOG CRUD ====================
@router.get("/calibration-logs", response_model=List[EquipmentCalibrationLogResponse])
def get_calibration_logs(
    equipment_id: Optional[UUID] = None,
    cal_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    stmt = select(EquipmentCalibrationLog)
    if equipment_id:
        stmt = stmt.where(EquipmentCalibrationLog.equipment_id == equipment_id)
    if cal_type and cal_type != "ALL":
        stmt = stmt.where(EquipmentCalibrationLog.calibration_type == cal_type)
    if status_filter and status_filter != "ALL":
        stmt = stmt.where(EquipmentCalibrationLog.status == status_filter)
    if q and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.join(Equipment).where(
            or_(
                EquipmentCalibrationLog.calibration_code.ilike(term),
                EquipmentCalibrationLog.certificate_number.ilike(term),
                EquipmentCalibrationLog.agency_name.ilike(term),
                Equipment.equipment_name.ilike(term),
                Equipment.equipment_code.ilike(term),
            )
        )

    stmt = stmt.order_by(EquipmentCalibrationLog.calibration_date.desc(), EquipmentCalibrationLog.created_at.desc())
    logs = db.scalars(stmt).unique().all()

    results = []
    for c in logs:
        eq = c.equipment
        results.append(
            EquipmentCalibrationLogResponse(
                calibration_id=c.calibration_id,
                equipment_id=c.equipment_id,
                calibration_code=c.calibration_code,
                calibration_type=c.calibration_type,
                calibration_date=c.calibration_date,
                expiry_date=c.expiry_date,
                agency_name=c.agency_name,
                certificate_number=c.certificate_number,
                standard_applied=c.standard_applied,
                measured_deviation=float(c.measured_deviation) if c.measured_deviation is not None else None,
                allowable_tolerance=float(c.allowable_tolerance) if c.allowable_tolerance is not None else None,
                is_passed=c.is_passed,
                status=c.status,
                certificate_file_url=c.certificate_file_url,
                calibrated_by=c.calibrated_by,
                calibrator_name=c.calibrator_name,
                notes=c.notes,
                equipment_code=eq.equipment_code if eq else None,
                equipment_name=eq.equipment_name if eq else None,
                installation_location=eq.installation_location if eq else None,
                calibrator_display_name=c.calibrator.full_name if c.calibrator else c.calibrator_name,
                created_at=c.created_at,
            )
        )
    return results


@router.post("/calibration-logs", response_model=EquipmentCalibrationLogResponse, status_code=status.HTTP_201_CREATED)
def create_calibration_log(payload: EquipmentCalibrationLogCreate, db: Session = Depends(get_db)):
    eq = db.get(Equipment, payload.equipment_id)
    if not eq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thiết bị tương ứng")

    dup = db.scalar(select(EquipmentCalibrationLog).where(EquipmentCalibrationLog.calibration_code == payload.calibration_code))
    if dup:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Mã phiếu hiệu chuẩn '{payload.calibration_code}' đã tồn tại!")

    # Tự động thẩm tra sai số so với dung sai cho phép
    is_passed = payload.is_passed
    if payload.measured_deviation is not None and payload.allowable_tolerance is not None:
        is_passed = abs(payload.measured_deviation) <= abs(payload.allowable_tolerance)

    cal_status = payload.status
    if not is_passed:
        cal_status = "FAILED"

    log = EquipmentCalibrationLog(
        equipment_id=payload.equipment_id,
        calibration_code=payload.calibration_code,
        calibration_type=payload.calibration_type,
        calibration_date=payload.calibration_date,
        expiry_date=payload.expiry_date,
        agency_name=payload.agency_name,
        certificate_number=payload.certificate_number,
        standard_applied=payload.standard_applied,
        measured_deviation=payload.measured_deviation,
        allowable_tolerance=payload.allowable_tolerance,
        is_passed=is_passed,
        status=cal_status,
        certificate_file_url=payload.certificate_file_url,
        calibrated_by=payload.calibrated_by,
        calibrator_name=payload.calibrator_name,
        notes=payload.notes,
    )
    db.add(log)
    db.flush()

    # Tự động đồng bộ sang hồ sơ lý lịch thiết bị
    sync_equipment_calibration_state(eq, db)

    db.commit()
    db.refresh(log)

    return EquipmentCalibrationLogResponse(
        calibration_id=log.calibration_id,
        equipment_id=log.equipment_id,
        calibration_code=log.calibration_code,
        calibration_type=log.calibration_type,
        calibration_date=log.calibration_date,
        expiry_date=log.expiry_date,
        agency_name=log.agency_name,
        certificate_number=log.certificate_number,
        standard_applied=log.standard_applied,
        measured_deviation=float(log.measured_deviation) if log.measured_deviation is not None else None,
        allowable_tolerance=float(log.allowable_tolerance) if log.allowable_tolerance is not None else None,
        is_passed=log.is_passed,
        status=log.status,
        certificate_file_url=log.certificate_file_url,
        calibrated_by=log.calibrated_by,
        calibrator_name=log.calibrator_name,
        notes=log.notes,
        equipment_code=eq.equipment_code,
        equipment_name=eq.equipment_name,
        installation_location=eq.installation_location,
        calibrator_display_name=log.calibrator.full_name if log.calibrator else log.calibrator_name,
        created_at=log.created_at,
    )


@router.put("/calibration-logs/{calibration_id}", response_model=EquipmentCalibrationLogResponse)
def update_calibration_log(calibration_id: UUID, payload: EquipmentCalibrationLogUpdate, db: Session = Depends(get_db)):
    log = db.get(EquipmentCalibrationLog, calibration_id)
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiếu hiệu chuẩn")

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(log, k, v)

    # Thẩm tra lại is_passed nếu có thay đổi sai số
    if log.measured_deviation is not None and log.allowable_tolerance is not None:
        log.is_passed = abs(log.measured_deviation) <= abs(log.allowable_tolerance)
        if not log.is_passed:
            log.status = "FAILED"

    db.flush()
    eq = log.equipment
    if eq:
        sync_equipment_calibration_state(eq, db)

    db.commit()
    db.refresh(log)

    return EquipmentCalibrationLogResponse(
        calibration_id=log.calibration_id,
        equipment_id=log.equipment_id,
        calibration_code=log.calibration_code,
        calibration_type=log.calibration_type,
        calibration_date=log.calibration_date,
        expiry_date=log.expiry_date,
        agency_name=log.agency_name,
        certificate_number=log.certificate_number,
        standard_applied=log.standard_applied,
        measured_deviation=float(log.measured_deviation) if log.measured_deviation is not None else None,
        allowable_tolerance=float(log.allowable_tolerance) if log.allowable_tolerance is not None else None,
        is_passed=log.is_passed,
        status=log.status,
        certificate_file_url=log.certificate_file_url,
        calibrated_by=log.calibrated_by,
        calibrator_name=log.calibrator_name,
        notes=log.notes,
        equipment_code=eq.equipment_code if eq else None,
        equipment_name=eq.equipment_name if eq else None,
        installation_location=eq.installation_location if eq else None,
        calibrator_display_name=log.calibrator.full_name if log.calibrator else log.calibrator_name,
        created_at=log.created_at,
    )


@router.delete("/calibration-logs/{calibration_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_calibration_log(calibration_id: UUID, db: Session = Depends(get_db)):
    log = db.get(EquipmentCalibrationLog, calibration_id)
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiếu hiệu chuẩn")
    db.delete(log)
    db.commit()
    return None


# ==================== 5. AI ASSISTANT ENDPOINTS ====================
@router.post("/ai/predict-maintenance", response_model=AIPredictMaintenanceResponse)
def ai_predict_maintenance(payload: AIPredictMaintenanceRequest):
    # Thuật toán dự báo hỏng hóc & lập kế hoạch PM theo chu kỳ
    health = 92
    risk = "THẤP"
    action = "Tiếp tục vận hành và duy trì chu kỳ bảo trì phòng ngừa định kỳ 30 ngày."
    next_pm = (date.today() + timedelta(days=14)).strftime("%d/%m/%Y")

    if payload.sensor_vibration_level == "Rung mạnh" or (payload.current_temperature_c and payload.current_temperature_c > 90):
        health = 58
        risk = "CẤP BÁCH"
        action = "Dừng máy kiểm tra khẩn cấp: Rung động hoặc nhiệt độ động cơ vượt ngưỡng an toàn. Nguy cơ mài mòn ổ bi và ô nhiễm mạt kim loại."
        next_pm = date.today().strftime("%d/%m/%Y")
    elif payload.sensor_vibration_level == "Hơi rung" or (payload.operating_hours_estimate and payload.operating_hours_estimate > 2000):
        health = 74
        risk = "TRUNG BÌNH"
        action = "Lên lịch kiểm tra bổ sung trong 3 ngày tới: Thay dầu nhờn thực phẩm NSF H1 và căng chỉnh độ đồng trục dây curoa."
        next_pm = (date.today() + timedelta(days=3)).strftime("%d/%m/%Y")

    tasks = [
        "Kiểm tra độ rơ của trục quay và độ mòn ổ bi bạc đạn",
        "Bổ sung dầu mỡ bôi trơn an toàn thực phẩm chuẩn NSF H1",
        "Vệ sinh cảm biến quang học, công tắc hành trình và bảng điều khiển PLC",
        "Khử trùng toàn bộ bề mặt tiếp xúc thực phẩm bằng dung dịch Clorin 100-200 ppm",
    ]

    return AIPredictMaintenanceResponse(
        equipment_code=payload.equipment_code,
        health_score=health,
        estimated_failure_risk=risk,
        recommended_action=action,
        recommended_next_pm_date=next_pm,
        tasks_to_inspect=tasks,
        food_safety_risk_impact="Nếu máy bị mòn hỏng ổ bi có thể làm rơi mạt kim loại vào thực phẩm (Mối nguy Vật lý) hoặc rò rỉ dầu máy không an toàn (Mối nguy Hóa học).",
        iso_compliance_note="Tuân thủ ISO 22000:2018 Mục 8.2 & PRP ISO/TS 22002-1 Mục 8.3 (Bảo trì dự phòng & sử dụng mỡ bôi trơn cấp thực phẩm).",
    )


@router.post("/ai/evaluate-calibration", response_model=AIEvaluateCalibrationResponse)
def ai_evaluate_calibration(payload: AIEvaluateCalibrationRequest):
    dev = abs(payload.measured_deviation)
    tol = abs(payload.allowable_tolerance)

    if dev <= tol:
        return AIEvaluateCalibrationResponse(
            is_acceptable=True,
            risk_level="AN TOÀN",
            deviation_analysis=f"Sai số đo đạc thực tế ({payload.measured_deviation} {payload.unit}) nằm trong dung sai cho phép (+/-{payload.allowable_tolerance} {payload.unit}). Thiết bị đạt độ chính xác đo lường.",
            impact_on_past_batches="Các lô sản xuất trong chu kỳ trước không bị ảnh hưởng bởi sai số đo đạc.",
            suggested_capa_action="Cấp tem hiệu chuẩn 'ĐẠT' và gia hạn chu kỳ kiểm định kế tiếp.",
            product_isolation_required=False,
            iso_clause_reference="ISO 22000:2018 Điều khoản 7.1.5.2 (Kiểm soát thiết bị theo dõi và đo lường).",
        )
    else:
        return AIEvaluateCalibrationResponse(
            is_acceptable=False,
            risk_level="KHÔNG PHÙ HỢP (NGHIÊM TRỌNG)",
            deviation_analysis=f"CẢNH BÁO: Sai số đo đạc ({payload.measured_deviation} {payload.unit}) VƯỢT QUÁ dung sai cho phép (+/-{payload.allowable_tolerance} {payload.unit}). Giá trị đo không còn đáng tin cậy!",
            impact_on_past_batches=f"Cần truy xuất ngay các lô sản xuất liên quan đến công đoạn '{payload.related_ccp_step}' từ ngày hiệu chuẩn gần nhất. Nguy cơ thông số CCP thực tế bị thiếu nhiệt/chưa đủ thời gian diệt khuẩn.",
            suggested_capa_action="1. Dán nhãn NGƯNG SỬ DỤNG ngay trên thiết bị. 2. Họp Ban ATTP thẩm tra tính hợp lệ của các kết quả đo trước đó. 3. Cô lập các lô thành phẩm nghi ngờ để kiểm nghiệm lại vi sinh.",
            product_isolation_required=True,
            iso_clause_reference="ISO 22000:2018 Điều khoản 7.1.5.2 (Đánh giá lại tính hợp lệ của kết quả đo trước đó khi thiết bị không đạt chuẩn).",
        )
