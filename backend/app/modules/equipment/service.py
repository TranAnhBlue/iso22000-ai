from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, and_, desc
from datetime import date, datetime, timedelta, timezone
from typing import Optional, List
from uuid import UUID

from app.modules.equipment.models import Equipment, EquipmentMaintenanceLog, EquipmentCalibrationLog
from app.modules.auth.models import User
from app.modules.equipment.schemas import (
    AIPredictMaintenanceRequest,
    AIPredictMaintenanceResponse,
    AIEvaluateCalibrationRequest,
    AIEvaluateCalibrationResponse,
    EquipmentStatsResponse,
)


def seed_default_equipments_if_empty(db: Session):
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
        equipment_code="EQ-DET-01",
        equipment_name="Máy dò kim loại băng tải (CCP 1 - Sàng lọc)",
        category="PROCESSING",
        model="LOMA IQ4 Metal Detector",
        serial_number="LM-2023-4411",
        manufacturer="Loma Systems UK",
        installation_location="Cuối dây chuyền đóng gói số 2",
        installation_date=today - timedelta(days=500),
        criticality_level="HIGH_CCP",
        status="OPERATIONAL",
        calibration_frequency_months=6,
        last_calibration_date=today - timedelta(days=175),
        next_calibration_due=today + timedelta(days=5),
        calibration_status="EXPIRING_SOON",
        maintenance_frequency_days=15,
        last_maintenance_date=today - timedelta(days=14),
        next_maintenance_due=today + timedelta(days=1),
        managed_by=admin_id,
        specifications={
            "sensitivity_fe_mm": 1.2,
            "sensitivity_non_fe_mm": 1.5,
            "sensitivity_ss_mm": 2.0,
            "belt_speed_m_min": 18.0,
            "associated_ccp": "CCP 1 - Dò tìm tạp chất kim loại",
        },
        notes="Sắp đến hạn kiểm định định kỳ 6 tháng. Thử mẫu test card Fe 1.2mm, Non-Fe 1.5mm mỗi ca 2 tiếng một lần.",
    )

    eq3 = Equipment(
        equipment_code="EQ-THERM-05",
        equipment_name="Nhiệt kế điện tử chuẩn hiện số KCS (OPRP 1)",
        category="MEASURING",
        model="Testo 104-IR Food Thermometer",
        serial_number="TS-998234",
        manufacturer="Testo SE & Co. KGaA Germany",
        installation_location="Phòng Lab KCS - Bàn kiểm nghiệm vi sinh",
        installation_date=today - timedelta(days=360),
        criticality_level="MEDIUM_OPRP",
        status="OPERATIONAL",
        calibration_frequency_months=12,
        last_calibration_date=today - timedelta(days=400),
        next_calibration_due=today - timedelta(days=35),
        calibration_status="EXPIRED",
        maintenance_frequency_days=90,
        last_maintenance_date=today - timedelta(days=80),
        next_maintenance_due=today + timedelta(days=10),
        managed_by=admin_id,
        specifications={
            "range_c": "-50°C đến +250°C",
            "accuracy_c": "±0.5°C (-30.0 đến +99.9°C)",
            "resolution_c": "0.1°C",
            "waterproof": "IP65",
        },
        notes="ĐÃ QUÁ HẠN HIỆU CHUẨN! Cần thu hồi gửi QUATEST 3 kiểm định lại ngay.",
    )

    eq4 = Equipment(
        equipment_code="EQ-FREEZE-02",
        equipment_name="Kho bảo quản lạnh nguyên liệu tươi (-18°C đến -22°C)",
        category="STORAGE",
        model="Bitzer Industrial Rack Unit",
        serial_number="BZ-COLD-002",
        manufacturer="Bitzer Kältemaschinenbau GmbH",
        installation_location="Khu vực kho nguyên liệu Đông lạnh - Cửa A3",
        installation_date=today - timedelta(days=900),
        criticality_level="MEDIUM_OPRP",
        status="OPERATIONAL",
        calibration_frequency_months=12,
        last_calibration_date=today - timedelta(days=120),
        next_calibration_due=today + timedelta(days=245),
        calibration_status="VALID",
        maintenance_frequency_days=30,
        last_maintenance_date=today - timedelta(days=25),
        next_maintenance_due=today + timedelta(days=5),
        managed_by=admin_id,
        specifications={
            "capacity_tons": 50.0,
            "refrigerant": "R404A (Eco-friendly)",
            "setpoint_c": -20.0,
            "monitoring": "Cảm biến IoT tự động ghi log 15 phút/lần",
        },
        notes="Bảo dưỡng quạt dàn bay hơi và xả tuyết tự động định kỳ.",
    )

    eq5 = Equipment(
        equipment_code="EQ-SCALE-03",
        equipment_name="Cân phân tích điện tử vi lượng phòng thí nghiệm (0.1mg)",
        category="MEASURING",
        model="Mettler Toledo ME204",
        serial_number="MT-88392-VN",
        manufacturer="Mettler Toledo Switzerland",
        installation_location="Phòng Lab KCS - Bàn đá chống rung",
        installation_date=today - timedelta(days=450),
        criticality_level="MEDIUM_OPRP",
        status="OPERATIONAL",
        calibration_frequency_months=12,
        last_calibration_date=today - timedelta(days=90),
        next_calibration_due=today + timedelta(days=275),
        calibration_status="VALID",
        maintenance_frequency_days=180,
        last_maintenance_date=today - timedelta(days=90),
        next_maintenance_due=today + timedelta(days=90),
        managed_by=admin_id,
        specifications={
            "max_weight_g": 220.0,
            "readability_mg": 0.1,
            "calibration_weight_class": "E2 Standard Weight",
        },
        notes="Dùng cân mẫu kiểm nghiệm chất lượng NVL và phụ gia thực phẩm chuẩn.",
    )

    eq6 = Equipment(
        equipment_code="EQ-BOILER-01",
        equipment_name="Lò hơi đốt gas công nghiệp cấp nhiệt hấp tiệt trùng",
        category="UTILITY",
        model="Miura Steam Boiler EX-1000",
        serial_number="MR-BOIL-991",
        manufacturer="Miura Boiler Japan",
        installation_location="Khu nhà phụ trợ cơ điện Utility - Trạm sinh hơi",
        installation_date=today - timedelta(days=1200),
        criticality_level="LOW_PRP",
        status="MAINTENANCE",
        calibration_frequency_months=12,
        last_calibration_date=today - timedelta(days=150),
        next_calibration_due=today + timedelta(days=215),
        calibration_status="VALID",
        maintenance_frequency_days=60,
        last_maintenance_date=today - timedelta(days=65),
        next_maintenance_due=today - timedelta(days=5),
        managed_by=admin_id,
        specifications={
            "steam_output_kg_h": 1000,
            "operating_pressure_bar": 7.0,
            "fuel": "LPG Gas sạch",
            "water_softener_included": True,
        },
        notes="Đang bảo trì định kỳ: Tẩy cặn lò hơi và kiểm tra van an toàn chịu áp.",
    )

    db.add_all([eq1, eq2, eq3, eq4, eq5, eq6])
    db.flush()

    # 2. Tạo lịch sử bảo trì mẫu
    maint1 = EquipmentMaintenanceLog(
        equipment_id=eq1.equipment_id,
        maintenance_code="MAINT-2026-001",
        maintenance_type="PREVENTIVE",
        maintenance_date=today - timedelta(days=10),
        performed_by=admin_id,
        performer_name="Nguyễn Văn Hùng (Kỹ sư cơ điện)",
        tasks_performed=[
            {"task": "Vệ sinh béc phun và đường ống cấp hơi", "status": "PASS"},
            {"task": "Kiểm tra gioăng silicon cửa nồi tiệt trùng Retort", "status": "PASS"},
            {"task": "Thử nghiệm van xả áp an toàn", "status": "PASS"},
        ],
        parts_replaced=[
            {"part": "Gioăng silicon chịu nhiệt 150°C", "qty": 1, "unit": "chiếc"}
        ],
        food_grade_lubricant_used=True,
        hygiene_sanitation_after_maint=True,
        cost=1500000.0,
        result_status="SUCCESS",
        notes="Bảo dưỡng định kỳ 30 ngày hoàn tất tốt. Đã khử trùng bề mặt buồng tiệt trùng bằng Clorin 200ppm trước khi bàn giao cho xưởng sản xuất.",
    )

    maint2 = EquipmentMaintenanceLog(
        equipment_id=eq2.equipment_id,
        maintenance_code="MAINT-2026-002",
        maintenance_type="PREVENTIVE",
        maintenance_date=today - timedelta(days=14),
        performed_by=admin_id,
        performer_name="Trần Đình Nam (Tổ trưởng cơ khí)",
        tasks_performed=[
            {"task": "Vệ sinh cảm biến từ trường đầu dò", "status": "PASS"},
            {"task": "Căng chỉnh độ võng dây băng tải thực phẩm", "status": "PASS"},
            {"task": "Kiểm tra cánh tay gạt phế phẩm khí nén", "status": "PASS"},
        ],
        parts_replaced=[],
        food_grade_lubricant_used=True,
        hygiene_sanitation_after_maint=True,
        cost=350000.0,
        result_status="SUCCESS",
        notes="Cơ cấu gạt tự động hoạt động nhạy, độ trễ < 0.2s.",
    )

    # 3. Tạo phiếu hiệu chuẩn mẫu
    cal1 = EquipmentCalibrationLog(
        equipment_id=eq1.equipment_id,
        calibration_code="CAL-2025-089",
        calibration_type="EXTERNAL",
        calibration_date=today - timedelta(days=60),
        expiry_date=today + timedelta(days=120),
        agency_name="Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng 3 (QUATEST 3)",
        certificate_number="QT3-2025-TEMP-9912",
        standard_applied="ISO/IEC 17025:2017 & ĐLVN 138:2004",
        measured_deviation=0.15,
        allowable_tolerance=0.50,
        is_passed=True,
        status="PASSED",
        certificate_file_url="https://drive.google.com/sample/quatest3_cal_retort_01.pdf",
        calibrated_by=admin_id,
        calibrator_name="Đoàn kiểm định viên QUATEST 3",
        notes="Cảm biến nhiệt độ RTD PT100 đạt sai số cho phép ±0.5°C tại điểm chuẩn 121.0°C.",
    )

    cal2 = EquipmentCalibrationLog(
        equipment_id=eq3.equipment_id,
        calibration_code="CAL-2025-012",
        calibration_type="EXTERNAL",
        calibration_date=today - timedelta(days=400),
        expiry_date=today - timedelta(days=35),
        agency_name="Viện Đo lường Việt Nam (VMI)",
        certificate_number="VMI-CAL-THERM-4411",
        standard_applied="ISO/IEC 17025 / TCVN",
        measured_deviation=0.65,
        allowable_tolerance=0.50,
        is_passed=False,
        status="FAILED",
        certificate_file_url=None,
        calibrated_by=admin_id,
        calibrator_name="KCS Nội bộ đối chiếu nguồn chuẩn",
        notes="Thiết bị có sai số vượt ngưỡng +0.65°C tại dải đo 75°C. Đã dán tem CẢNH BÁO QUÁ HẠN.",
    )

    db.add_all([maint1, maint2, cal1, cal2])
    db.commit()


def calculate_equipment_stats(db: Session) -> EquipmentStatsResponse:
    today = date.today()
    this_month_start = today.replace(day=1)
    if today.month == 12:
        next_month_start = today.replace(year=today.year + 1, month=1, day=1)
    else:
        next_month_start = today.replace(month=today.month + 1, day=1)

    all_eq = db.scalars(select(Equipment)).all()
    total_eq = len(all_eq)

    op_cnt = 0
    maint_cnt = 0
    valid_cal = 0
    exp_soon_cal = 0
    overdue_cal = 0
    pm_due_month = 0

    for eq in all_eq:
        if eq.status == "OPERATIONAL":
            op_cnt += 1
        elif eq.status in ("MAINTENANCE", "UNDER_MAINTENANCE"):
            maint_cnt += 1

        if eq.next_calibration_due:
            diff = (eq.next_calibration_due - today).days
            if diff < 0:
                overdue_cal += 1
            elif diff <= 30:
                exp_soon_cal += 1
            else:
                valid_cal += 1
        else:
            valid_cal += 1

        if eq.next_maintenance_due and this_month_start <= eq.next_maintenance_due < next_month_start:
            pm_due_month += 1

    cal_rate = 100.0
    if total_eq > 0:
        cal_rate = round(((total_eq - overdue_cal) / total_eq) * 100.0, 1)

    year_start = today.replace(month=1, day=1)
    total_maint_year = db.scalar(
        select(func.count(EquipmentMaintenanceLog.maintenance_id)).where(EquipmentMaintenanceLog.maintenance_date >= year_start)
    ) or 0
    total_cal_year = db.scalar(
        select(func.count(EquipmentCalibrationLog.calibration_id)).where(EquipmentCalibrationLog.calibration_date >= year_start)
    ) or 0

    return EquipmentStatsResponse(
        total_equipments=total_eq,
        operational_count=op_cnt,
        under_maintenance_count=maint_cnt,
        calibration_valid_count=valid_cal,
        calibration_expiring_soon_count=exp_soon_cal,
        calibration_overdue_count=overdue_cal,
        calibration_compliance_rate=cal_rate,
        preventive_maintenance_due_this_month=pm_due_month,
        total_maintenance_logs_year=total_maint_year,
        total_calibration_logs_year=total_cal_year,
    )


def predict_maintenance(payload: AIPredictMaintenanceRequest) -> AIPredictMaintenanceResponse:
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


def evaluate_calibration(payload: AIEvaluateCalibrationRequest) -> AIEvaluateCalibrationResponse:
    dev = abs(payload.measured_deviation)
    tol = abs(payload.allowable_tolerance)

    if dev <= tol:
        return AIEvaluateCalibrationResponse(
            equipment_code=payload.equipment_code,
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
            equipment_code=payload.equipment_code,
            is_acceptable=False,
            risk_level="KHÔNG PHÙ HỢP (NGHIÊM TRỌNG)",
            deviation_analysis=f"CẢNH BÁO: Sai số đo đạc ({payload.measured_deviation} {payload.unit}) VƯỢT QUÁ dung sai cho phép (+/-{payload.allowable_tolerance} {payload.unit}). Giá trị đo không còn đáng tin cậy!",
            impact_on_past_batches=f"Cần truy xuất ngay các lô sản xuất liên quan đến công đoạn '{payload.related_ccp_step}' từ ngày hiệu chuẩn gần nhất. Nguy cơ thông số CCP thực tế bị thiếu nhiệt/chưa đủ thời gian diệt khuẩn.",
            suggested_capa_action="1. Dán nhãn NGƯNG SỬ DỤNG ngay trên thiết bị. 2. Họp Ban ATTP thẩm tra tính hợp lệ của các kết quả đo trước đó. 3. Cô lập các lô thành phẩm nghi ngờ để kiểm nghiệm lại vi sinh.",
            product_isolation_required=True,
            iso_clause_reference="ISO 22000:2018 Điều khoản 7.1.5.2 (Đánh giá lại tính hợp lệ của kết quả đo trước đó khi thiết bị không đạt chuẩn).",
        )
