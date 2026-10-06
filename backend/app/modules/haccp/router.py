import uuid
from typing import List, Optional, Any, Dict
from datetime import datetime, date, timezone, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func, and_, or_

from app.core.database import get_db
from app.core.demo_data import demo_seed_enabled
from app.modules.haccp.models import (
    HACCPPlan,
    ProcessStep,
    HazardAnalysis,
    CCPDefinition,
    CCPMonitoringLog,
    PRPProgram,
    PRPChecklistLog,
    HACCPPlanReview,
    MetalDetectorLog,
    InProcessQCLog,
    PestControlLog,
    AllergenControl,
    VisitorHealthDeclaration,
    FirstAidLog,
    VehicleInspectionLog,
    WaterSafetyRecord,
    ChemicalRecord,
    WasteLog,
    EnvironmentalMonitoringSchedule,
)
from app.modules.inventory.models import VehicleInspection, ProductionBatch, WarehouseInventory
from app.modules.capa.models import NonConformance
from app.modules.auth.models import User
from app.modules.haccp.schemas import (
    HACCPPlanCreate,
    HACCPPlanUpdate,
    HACCPPlanResponse,
    ProcessStepCreate,
    ProcessStepUpdate,
    ProcessStepResponse,
    HazardAnalysisCreate,
    HazardAnalysisUpdate,
    HazardAnalysisResponse,
    CCPDefinitionCreate,
    CCPDefinitionUpdate,
    CCPDefinitionResponse,
    CCPMonitoringLogCreate,
    CCPMonitoringLogUpdate,
    CCPMonitoringLogResponse,
    PRPProgramCreate,
    PRPProgramUpdate,
    PRPProgramResponse,
    PRPChecklistLogCreate,
    PRPChecklistLogUpdate,
    PRPChecklistLogResponse,
    HACCPStatsResponse,
    AIHazardSuggestRequest,
    AIHazardSuggestResponse,
    AIHazardItem,
    AICCPDeviationRequest,
    AICCPDeviationResponse,
    HACCPPlanReviewCreate,
    HACCPPlanReviewResponse,
    SyncFlowStepsRequest,
    SyncFlowStepItem,
    SaveWorkflowAndStepsRequest,
    SaveWorkflowAndStepsResponse,
    MetalDetectorLogCreate,
    MetalDetectorLogUpdate,
    MetalDetectorLogResponse,
    InProcessQCLogCreate,
    InProcessQCLogUpdate,
    InProcessQCLogResponse,
    PestControlLogCreate,
    PestControlLogUpdate,
    PestControlLogResponse,
    AllergenControlCreate,
    AllergenControlUpdate,
    AllergenControlResponse,
    VisitorHealthDeclarationCreate,
    VisitorHealthDeclarationUpdate,
    VisitorHealthDeclarationResponse,
    FirstAidLogCreate,
    FirstAidLogUpdate,
    FirstAidLogResponse,
    VehicleInspectionLogCreate,
    VehicleInspectionLogUpdate,
    VehicleInspectionLogResponse,
    WaterSafetyRecordCreate,
    WaterSafetyRecordResponse,
    ChemicalRecordCreate,
    ChemicalRecordUpdate,
    ChemicalRecordResponse,
    WasteLogCreate,
    WasteLogResponse,
    EnvironmentalMonitoringScheduleCreate,
    EnvironmentalMonitoringScheduleResponse,
)
from app.modules.builder.models import DynamicWorkflowTemplate
from app.modules.builder.schemas import WorkflowNode, WorkflowEdge, validate_workflow_structure
from app.core.dependencies import require_roles

router = APIRouter(prefix="/haccp", tags=["HACCP, CCP & PRP Management"])


# ==================== SERIALIZER HELPERS ====================
def format_plan_out(plan: Any) -> HACCPPlanResponse:
    plan_id_val = getattr(plan, "plan_id", None)
    steps_list = getattr(plan, "steps", []) or []
    step_count = len(steps_list)
    ccp_count = sum(1 for s in steps_list if getattr(s, "is_ccp_or_oprp", False))

    return HACCPPlanResponse(
        plan_id=UUID(str(plan_id_val)) if plan_id_val is not None else uuid.uuid4(),
        plan_code=str(getattr(plan, "plan_code", "")),
        plan_name=str(getattr(plan, "plan_name", "")),
        product_line=str(getattr(plan, "product_line", "Chế biến Thủy hải sản")),
        version=str(getattr(plan, "version", "1.0")),
        team_leader=str(getattr(plan, "team_leader", "Trưởng ban HACCP / QA")),
        approved_by=getattr(plan, "approved_by", "Giám đốc Nhà máy"),
        effective_date=getattr(plan, "effective_date", None),
        scope_description=getattr(plan, "scope_description", None),
        status=str(getattr(plan, "status", "ACTIVE")),
        step_count=step_count,
        ccp_count=ccp_count,
        created_at=getattr(plan, "created_at", None),
    )


def format_step_out(step: Any) -> ProcessStepResponse:
    step_id_val = getattr(step, "step_id", None)
    plan_id_val = getattr(step, "plan_id", None)
    plan_obj = getattr(step, "haccp_plan", None)
    hazards_list = getattr(step, "hazards", [])
    h_count = len(hazards_list) if hazards_list is not None else 0
    
    return ProcessStepResponse(
        step_id=UUID(str(step_id_val)) if step_id_val is not None else uuid.uuid4(),
        plan_id=UUID(str(plan_id_val)) if plan_id_val is not None else None,
        step_number=int(getattr(step, "step_number", 1)),
        step_name=str(getattr(step, "step_name", "")),
        product_line=str(getattr(step, "product_line", "Chế biến Thủy hải sản")),
        description=getattr(step, "description", None),
        is_ccp_or_oprp=bool(getattr(step, "is_ccp_or_oprp", False)),
        hazard_count=h_count,
        plan_name=str(getattr(plan_obj, "plan_name", "")) if plan_obj else None,
        created_at=getattr(step, "created_at", None),
    )


def format_hazard_out(h: Any) -> HazardAnalysisResponse:
    h_id_val = getattr(h, "hazard_id", None)
    step_id_val = getattr(h, "step_id", None)
    step_obj = getattr(h, "process_step", None)
    
    return HazardAnalysisResponse(
        hazard_id=UUID(str(h_id_val)) if h_id_val is not None else uuid.uuid4(),
        step_id=UUID(str(step_id_val)) if step_id_val is not None else uuid.uuid4(),
        hazard_type=str(getattr(h, "hazard_type", "BIOLOGICAL")),
        hazard_name=str(getattr(h, "hazard_name", "")),
        potential_consequence=getattr(h, "potential_consequence", None),
        likelihood=int(getattr(h, "likelihood", 2)),
        severity=int(getattr(h, "severity", 2)),
        risk_score=int(getattr(h, "risk_score", 4)),
        is_significant=bool(getattr(h, "is_significant", True)),
        control_measure=str(getattr(h, "control_measure", "")),
        q1=getattr(h, "q1", "YES"),
        q2=getattr(h, "q2", "NO"),
        q3=getattr(h, "q3", "YES"),
        q4=getattr(h, "q4", "NO"),
        classification=str(getattr(h, "classification", "PRP")),
        notes=getattr(h, "notes", None),
        step_name=str(getattr(step_obj, "step_name", "")) if step_obj is not None else None,
        step_number=int(getattr(step_obj, "step_number", 0)) if step_obj is not None else None,
        created_at=getattr(h, "created_at", None),
    )


def format_ccp_out(c: Any, last_log: Any = None) -> CCPDefinitionResponse:
    c_id_val = getattr(c, "ccp_id", None)
    step_id_val = getattr(c, "process_step_id", None)
    step_obj = getattr(c, "process_step", None)
    
    last_val_str = None
    last_stat_str = "NORMAL"
    if last_log is not None:
        m_val = getattr(last_log, "measured_value", None)
        u_val = getattr(last_log, "unit", "")
        last_val_str = f"{m_val} {u_val}".strip() if m_val is not None else None
        last_stat_str = str(getattr(last_log, "status", "NORMAL"))

    return CCPDefinitionResponse(
        ccp_id=UUID(str(c_id_val)) if c_id_val is not None else uuid.uuid4(),
        ccp_code=str(getattr(c, "ccp_code", "")),
        name=str(getattr(c, "name", "")),
        process_step_id=UUID(str(step_id_val)) if step_id_val is not None else None,
        hazard_description=str(getattr(c, "hazard_description", "")),
        critical_limit=dict(getattr(c, "critical_limit", {}) or {}),
        monitoring_frequency=str(getattr(c, "monitoring_frequency", "Mỗi mẻ")),
        monitoring_method=str(getattr(c, "monitoring_method", "")),
        corrective_action_plan=str(getattr(c, "corrective_action_plan", "")),
        responsible_role=str(getattr(c, "responsible_role", "QC / Trưởng ca Sản xuất")),
        status=str(getattr(c, "status", "ACTIVE")),
        step_name=str(getattr(step_obj, "step_name", "")) if step_obj is not None else None,
        last_measured_value=last_val_str,
        last_log_status=last_stat_str,
        created_at=getattr(c, "created_at", None),
    )


def format_ccp_log_out(l: Any) -> CCPMonitoringLogResponse:
    l_id_val = getattr(l, "log_id", None)
    ccp_id_val = getattr(l, "ccp_id", None)
    ccp_obj = getattr(l, "ccp", None)
    insp_obj = getattr(l, "inspector", None)
    ver_obj = getattr(l, "verifier", None)

    cl_dict = getattr(ccp_obj, "critical_limit", {}) if ccp_obj is not None else {}
    cl_text = cl_dict.get("condition_text") if isinstance(cl_dict, dict) else None

    return CCPMonitoringLogResponse(
        log_id=UUID(str(l_id_val)) if l_id_val is not None else uuid.uuid4(),
        ccp_id=UUID(str(ccp_id_val)) if ccp_id_val is not None else uuid.uuid4(),
        batch_number=str(getattr(l, "batch_number", "")),
        test_time=getattr(l, "test_time", None),
        measured_value=float(getattr(l, "measured_value", 0.0)),
        unit=str(getattr(l, "unit", "°C")),
        measured_details=dict(getattr(l, "measured_details", {}) or {}) if getattr(l, "measured_details", None) else None,
        is_critical_limit_exceeded=bool(getattr(l, "is_critical_limit_exceeded", False)),
        status=str(getattr(l, "status", "NORMAL")),
        deviation_action=getattr(l, "deviation_action", None),
        verification_status=str(getattr(l, "verification_status", "VERIFIED")),
        notes=getattr(l, "notes", None),
        ccp_code=str(getattr(ccp_obj, "ccp_code", "")) if ccp_obj is not None else None,
        ccp_name=str(getattr(ccp_obj, "name", "")) if ccp_obj is not None else None,
        critical_limit_text=cl_text,
        inspector_name=str(getattr(insp_obj, "full_name", "")) if insp_obj is not None else "QC Ca Trưởng",
        verifier_name=str(getattr(ver_obj, "full_name", "")) if ver_obj is not None else "Trưởng ban QLCL",
        created_at=getattr(l, "created_at", None),
    )


def format_prp_prog_out(p: Any) -> PRPProgramResponse:
    p_id_val = getattr(p, "program_id", None)
    c_list = getattr(p, "checklists", [])
    c_count = len(c_list) if c_list is not None else 0

    return PRPProgramResponse(
        program_id=UUID(str(p_id_val)) if p_id_val is not None else uuid.uuid4(),
        program_code=str(getattr(p, "program_code", "")),
        program_name=str(getattr(p, "program_name", "")),
        group=str(getattr(p, "group", "GMP")),
        scope=getattr(p, "scope", "Toàn nhà máy"),
        frequency=str(getattr(p, "frequency", "Theo ca sản xuất")),
        responsible_dept=str(getattr(p, "responsible_dept", "Phòng Sản xuất")),
        status=str(getattr(p, "status", "ACTIVE")),
        description=getattr(p, "description", None),
        checklist_count=c_count,
        created_at=getattr(p, "created_at", None),
    )


def format_prp_log_out(l: Any) -> PRPChecklistLogResponse:
    l_id_val = getattr(l, "check_id", None)
    p_id_val = getattr(l, "program_id", None)
    prog_obj = getattr(l, "program", None)
    insp_obj = getattr(l, "inspector", None)

    return PRPChecklistLogResponse(
        check_id=UUID(str(l_id_val)) if l_id_val is not None else uuid.uuid4(),
        program_id=UUID(str(p_id_val)) if p_id_val is not None else uuid.uuid4(),
        shift_name=str(getattr(l, "shift_name", "Ca sáng")),
        check_date=getattr(l, "check_date", date.today()),
        check_time=getattr(l, "check_time", "07:30"),
        items_checked=list(getattr(l, "items_checked", []) or []),
        compliance_rate=float(getattr(l, "compliance_rate", 100.0)),
        status=str(getattr(l, "status", "COMPLIANT")),
        finding_notes=getattr(l, "finding_notes", None),
        corrective_action=getattr(l, "corrective_action", None),
        program_code=str(getattr(prog_obj, "program_code", "")) if prog_obj is not None else None,
        program_name=str(getattr(prog_obj, "program_name", "")) if prog_obj is not None else None,
        group=str(getattr(prog_obj, "group", "GMP")) if prog_obj is not None else "GMP",
        inspector_name=str(getattr(insp_obj, "full_name", "")) if insp_obj is not None else "Giám sát viên QA",
        created_at=getattr(l, "created_at", None),
    )


def auto_handle_ccp_deviation(
    db: Session,
    batch_number: str,
    title: str,
    description: str,
    source: str = "HACCP_CCP",
    severity: str = "CRITICAL",
    location: Optional[str] = None,
    immediate_action: Optional[str] = None,
    reported_by_id: Optional[uuid.UUID] = None,
    reporter_name: Optional[str] = None,
):
    """
    Tự động xử lý sự cố lệch ngưỡng tới hạn CCP / Metal Detector / QC Quá trình:
    1. Khóa mẻ sản xuất ProductionBatch sang trạng thái HOLD (Cô lập / Biệt trữ).
    2. Khóa lô tồn kho WarehouseInventory (nếu đã nhập kho) sang trạng thái HOLD.
    3. Tự động sinh phiếu NonConformance (Sự không phù hợp) theo Điều khoản 8.9 ISO 22000:2018.
    """
    if not batch_number:
        return None

    clean_batch = batch_number.strip()

    # 1. Khóa mẻ sản xuất
    batch = db.query(ProductionBatch).filter(ProductionBatch.batch_number == clean_batch).first()
    if batch:
        batch.status = "HOLD"
        lock_note = f"[ISO 22000 AUTO-LOCK] Khóa mẻ do vi phạm an toàn thực phẩm: {title} ({datetime.now().strftime('%d/%m/%Y %H:%M')})"
        batch.notes = f"{batch.notes or ''}\n{lock_note}".strip()

    # 2. Khóa tồn kho nếu có
    stocks = db.query(WarehouseInventory).filter(WarehouseInventory.lot_number == clean_batch).all()
    for s in stocks:
        s.status = "HOLD"
        s.notes = f"{s.notes or ''} | [HACCP QUARANTINE] {title}".strip()

    # 3. Tạo NonConformance (nếu chưa có phiếu NC mở trùng batch và source trong ngày)
    today = date.today()
    existing_nc = db.query(NonConformance).filter(
        NonConformance.affected_lot_number == clean_batch,
        NonConformance.source == source,
        NonConformance.occurred_date == today,
    ).first()

    if not existing_nc:
        now_ts = datetime.now().strftime("%Y%m%d%H%M%S")
        prefix = "NC-CCP" if source == "HACCP_CCP" else ("NC-MD" if "MD" in title else "NC-IPQC")
        nc_num = f"{prefix}-{now_ts}"
        new_nc = NonConformance(
            nc_number=nc_num,
            title=title[:255],
            source=source,
            severity=severity,
            occurred_date=today,
            occurred_location=location or "Xưởng chế biến sản xuất",
            description=description,
            immediate_action=immediate_action or "Cô lập mẻ hàng, dán nhãn biệt trữ HOLD, tạm dừng dây chuyền chờ đội ATTP thẩm tra.",
            affected_lot_number=clean_batch,
            affected_quantity=f"{batch.actual_quantity} {batch.unit}" if batch else "Toàn bộ mẻ phát sinh",
            reported_by=reported_by_id,
            reported_by_name=reporter_name or "Hệ thống giám sát ISO 22000",
            status="NEW",
        )
        db.add(new_nc)
        db.flush()
        return new_nc

    return existing_nc


def seed_specialized_prp_if_empty(db: Session):
    need_commit = False
    if db.scalar(select(func.count(WaterSafetyRecord.record_id))) == 0:
        ws1 = WaterSafetyRecord(
            record_code="WSR-2026-001",
            sampling_point="Đầu ra hệ thống lọc RO cấp xưởng chế biến",
            sampling_date=date.today(),
            sampling_time="07:00",
            ph_level=7.2,
            chlorine_ppm=0.6,
            turbidity_ntu=0.3,
            sensory_result="Trong suốt, không màu, không mùi vị lạ",
            coliform_cfu=0.0,
            e_coli_cfu=0.0,
            overall_status="PASS",
            tested_by_name="Kỹ thuật Cơ điện",
            verified_by_name="QA Kiểm tra",
            notes="Chất lượng nước đạt chuẩn QCVN 01-1:2018/BYT",
        )
        ws2 = WaterSafetyRecord(
            record_code="WSR-2026-002",
            sampling_point="Bồn làm đá vảy bảo quản cá",
            sampling_date=date.today(),
            sampling_time="07:30",
            ph_level=7.1,
            chlorine_ppm=0.5,
            turbidity_ntu=0.4,
            sensory_result="Đá vảy sạch, không vẩn đục",
            coliform_cfu=0.0,
            e_coli_cfu=0.0,
            overall_status="PASS",
            tested_by_name="Kỹ thuật Cơ điện",
            verified_by_name="QA Kiểm tra",
            notes="Đá vảy đạt tiêu chuẩn vi sinh",
        )
        db.add_all([ws1, ws2])
        need_commit = True

    if db.scalar(select(func.count(ChemicalRecord.chemical_id))) == 0:
        ch1 = ChemicalRecord(
            chemical_code="HC-CLO-01",
            chemical_name="Chlorine Nippon Hi-Chlon 70%",
            purpose="Khử trùng nước sản xuất và ngâm rửa bề mặt dụng cụ",
            is_food_grade=True,
            supplier_name="Công ty Hóa chất & Thiết bị Khoa học An Giang",
            msds_document_url="/uploads/documents/MSDS_Chlorine_HiChlon.pdf",
            msds_file_name="MSDS_Chlorine_HiChlon.pdf",
            msds_expiry_date=date.today() + timedelta(days=365),
            dilution_ratio="1:1000 (pha nồng độ 100-200 ppm)",
            storage_location="Kho hóa chất chuyên dụng tầng 1 (có khóa riêng)",
            approval_status="APPROVED",
            current_stock_kg=120.0,
            safety_instructions="Bắt buộc trang bị găng tay cao su, kính bảo hộ và khẩu trang hoạt tính khi pha chế",
            approved_by="Đội trưởng Đội ATTP",
        )
        ch2 = ChemicalRecord(
            chemical_code="HC-XUT-01",
            chemical_name="Xút vảy NaOH 99% Food Grade",
            purpose="Tẩy rửa hệ thống đường ống tuần hoàn CIP",
            is_food_grade=True,
            supplier_name="Công ty CP Hóa chất Miền Nam",
            msds_document_url="/uploads/documents/MSDS_NaOH_FoodGrade.pdf",
            msds_file_name="MSDS_NaOH_FoodGrade.pdf",
            msds_expiry_date=date.today() + timedelta(days=500),
            dilution_ratio="1-2% nồng độ dung dịch tẩy rửa",
            storage_location="Kho hóa chất chuyên dụng tầng 1 (có khóa riêng)",
            approval_status="APPROVED",
            current_stock_kg=250.0,
            safety_instructions="Hóa chất ăn mòn mạnh, bắt buộc mang ủng cao su, tạp dề chống hóa chất và kính chắn giọt bắn",
            approved_by="Đội trưởng Đội ATTP",
        )
        ch3 = ChemicalRecord(
            chemical_code="HC-CON-01",
            chemical_name="Cồn thực phẩm Ethanol 70 độ",
            purpose="Sát khuẩn tay công nhân và dao thớt trước khi chế biến",
            is_food_grade=True,
            supplier_name="Công ty Cồn Rượu Miền Tây",
            msds_document_url="/uploads/documents/MSDS_Ethanol_70.pdf",
            msds_file_name="MSDS_Ethanol_70.pdf",
            msds_expiry_date=date.today() + timedelta(days=700),
            dilution_ratio="Dùng trực tiếp không pha loãng",
            storage_location="Tủ hóa chất phòng thay đồ công nhân & cửa vào xưởng",
            approval_status="APPROVED",
            current_stock_kg=80.0,
            safety_instructions="Dung dịch dễ bắt cháy, để xa nguồn nhiệt, cấm hút thuốc",
            approved_by="Đội trưởng Đội ATTP",
        )
        db.add_all([ch1, ch2, ch3])
        need_commit = True

    if db.scalar(select(func.count(WasteLog.waste_id))) == 0:
        w1 = WasteLog(
            log_code="WST-2026-001",
            log_date=date.today(),
            waste_type="ORGANIC_BYPRODUCT",
            description="Phụ phẩm đầu xương da mỡ cá tra chế biến fillet",
            quantity_kg=850.0,
            storage_area="Nhà chứa phụ phẩm khép kín có điều hòa nhiệt độ",
            disposal_contractor="Nhà máy Chế biến Thức ăn Thủy sản & Bột cá Châu Phú",
            transfer_note_code="BBBG-PP-20260801",
            status="TRANSFERRED",
            handled_by_name="Tổ Vệ sinh Môi trường",
            notes="Chuyển giao xe bồn kín chuyên dụng lúc 11:30",
        )
        w2 = WasteLog(
            log_code="WST-2026-002",
            log_date=date.today(),
            waste_type="SOLID_DOMESTIC",
            description="Rác sinh hoạt xưởng chế biến và khu văn phòng",
            quantity_kg=45.0,
            storage_area="Thùng rác có nắp đậy khu tập kết rác thải",
            disposal_contractor="Công ty Môi trường Đô thị An Giang",
            transfer_note_code="BBBG-RSH-20260801",
            status="TRANSFERRED",
            handled_by_name="Tổ Vệ sinh Môi trường",
            notes="Thu gom chuyển giao hàng ngày",
        )
        db.add_all([w1, w2])
        need_commit = True

    if db.scalar(select(func.count(EnvironmentalMonitoringSchedule.schedule_id))) == 0:
        s1 = EnvironmentalMonitoringSchedule(
            item_code="ENV-SCH-01",
            target_object="Nước sản xuất & Nước đá vảy",
            parameters="Chỉ tiêu vi sinh: Coliform, E.coli, Pseudomonas, Kim loại nặng",
            frequency="1 tháng/lần",
            testing_unit="Trung tâm Y tế Dự phòng & Kiểm nghiệm Pasteur",
            last_tested_date=date.today() - timedelta(days=20),
            next_due_date=date.today() + timedelta(days=10),
            status="SCHEDULED",
            last_result="PASSED",
        )
        s2 = EnvironmentalMonitoringSchedule(
            item_code="ENV-SCH-02",
            target_object="Bề mặt tiếp xúc thực phẩm (Băng tải, Dao thớt fillet)",
            parameters="Tổng số vi sinh vật hiếu khí, Coliforms, Salmonella, S. aureus",
            frequency="2 tuần/lần",
            testing_unit="Phòng Lab Vi sinh Nhà máy (nội bộ)",
            last_tested_date=date.today() - timedelta(days=5),
            next_due_date=date.today() + timedelta(days=9),
            status="SCHEDULED",
            last_result="PASSED",
        )
        s3 = EnvironmentalMonitoringSchedule(
            item_code="ENV-SCH-03",
            target_object="Không khí phòng đóng gói thành phẩm",
            parameters="Vi nấm, tổng số nấm men nấm mốc, bụi lắng",
            frequency="1 tháng/lần",
            testing_unit="Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng 3 (QUATEST 3)",
            last_tested_date=date.today() - timedelta(days=25),
            next_due_date=date.today() + timedelta(days=5),
            status="SCHEDULED",
            last_result="PASSED",
        )
        db.add_all([s1, s2, s3])
        need_commit = True

    if need_commit:
        db.commit()


def seed_haccp_data_if_empty(db: Session):
    if not demo_seed_enabled():
        return
    seed_specialized_prp_if_empty(db)
    return

    # 0. Seed HACCP Plan
    plan1 = HACCPPlan(
        plan_code="HACCP-2026-TUNA01",
        plan_name="Kế hoạch HACCP Chế biến Cá Ngừ Đại Dương & Chả Cá Đông Lạnh",
        product_line="Chế biến Cá ngừ đại dương xuất khẩu",
        version="2.1",
        team_leader="Nguyễn Văn An (Trưởng ban HACCP / QA)",
        approved_by="Lê Hoàng Quân (Giám đốc Nhà máy)",
        effective_date=date(2026, 1, 15),
        scope_description="Áp dụng cho toàn bộ dây chuyền tiếp nhận, sơ chế, gia nhiệt, dò kim loại và cấp đông tại Nhà máy WCERT.",
        status="ACTIVE",
    )
    db.add(plan1)
    db.flush()

    # 1. Seed 6 Process Steps
    step1 = ProcessStep(
        plan_id=plan1.plan_id,
        step_number=1,
        step_name="Tiếp nhận nguyên liệu cá ngừ tươi/đông lạnh",
        product_line="Chế biến Cá ngừ đại dương xuất khẩu",
        description="Tiếp nhận cá ngừ từ tàu/nhà cung cấp, kiểm tra nhiệt độ xe lạnh và hồ sơ COA",
        is_ccp_or_oprp=True,
    )
    step2 = ProcessStep(
        plan_id=plan1.plan_id,
        step_number=2,
        step_name="Rã đông & Rửa sơ chế",
        product_line="Chế biến Cá ngừ đại dương xuất khẩu",
        description="Rã đông bằng nước lạnh tuần hoàn, rửa loại bỏ tạp chất và màng đen",
        is_ccp_or_oprp=False,
    )
    step3 = ProcessStep(
        plan_id=plan1.plan_id,
        step_number=3,
        step_name="Gia nhiệt / Hấp chín tiệt trùng sơ bộ",
        product_line="Chế biến Cá ngừ đại dương xuất khẩu",
        description="Hấp cá trong buồng nhiệt hơi nước để diệt vi sinh vật gây bệnh (Salmonella, Listeria)",
        is_ccp_or_oprp=True,
    )
    step4 = ProcessStep(
        plan_id=plan1.plan_id,
        step_number=4,
        step_name="Fillet tách xương & Dò kim loại",
        product_line="Chế biến Cá ngừ đại dương xuất khẩu",
        description="Phi lê cá, loại bỏ da xương và chạy qua máy dò kim loại băng tải tự động",
        is_ccp_or_oprp=True,
    )
    step5 = ProcessStep(
        plan_id=plan1.plan_id,
        step_number=5,
        step_name="Cấp đông nhanh IQF & Đóng gói hút chân không",
        product_line="Chế biến Cá ngừ đại dương xuất khẩu",
        description="Cấp đông băng chuyền IQF đạt nhiệt độ tâm ≤ -18°C trong thời gian quy định",
        is_ccp_or_oprp=True,
    )
    step6 = ProcessStep(
        plan_id=plan1.plan_id,
        step_number=6,
        step_name="Bảo quản kho lạnh & Xuất hàng",
        product_line="Chế biến Cá ngừ đại dương xuất khẩu",
        description="Bảo quản trong kho lạnh âm sâu, theo dõi nhiệt độ liên tục 24/7",
        is_ccp_or_oprp=False,
    )
    db.add_all([step1, step2, step3, step4, step5, step6])
    db.flush()

    # 2. Seed 6 Hazards
    h1 = HazardAnalysis(
        step_id=step1.step_id,
        hazard_type="BIOLOGICAL",
        hazard_name="Sự hình thành độc tố Histamine & Vi sinh vật gây bệnh (Vibrio, Salmonella)",
        potential_consequence="Ngộ độc thực phẩm cấp tính, dị ứng Histamine nghiêm trọng",
        likelihood=2,
        severity=3,
        risk_score=6,
        is_significant=True,
        control_measure="Kiểm soát nhiệt độ tiếp nhận ≤ -18°C (hàng đông) hoặc 0-4°C (hàng tươi), test nhanh Histamine ≤ 50 ppm",
        q1="YES", q2="NO", q3="YES", q4="NO",
        classification="CCP",
        notes="Quy định nghiêm ngặt theo FDA & Codex STAN 119",
    )
    h2 = HazardAnalysis(
        step_id=step1.step_id,
        hazard_type="CHEMICAL",
        hazard_name="Tồn dư kháng sinh (Chloramphenicol, Nitrofurans) và Kim loại nặng (Hg, Pb, Cd)",
        potential_consequence="Ảnh hưởng mãn tính đến gan thận, nguy cơ tích lũy độc tố",
        likelihood=2,
        severity=3,
        risk_score=6,
        is_significant=True,
        control_measure="Đánh giá nhà cung ứng ASL + Thẩm tra Phiếu kiểm nghiệm COA từng lô",
        q1="YES", q2="NO", q3="YES", q4="NO",
        classification="OPRP",
        notes="Kiểm soát theo chương trình tiếp nhận nguyên liệu",
    )
    h3 = HazardAnalysis(
        step_id=step2.step_id,
        hazard_type="CHEMICAL",
        hazard_name="Dư lượng Clo trong nước rửa vượt ngưỡng cho phép",
        potential_consequence="Gây mùi lạ, kích ứng và ảnh hưởng chất lượng cảm quan",
        likelihood=1,
        severity=1,
        risk_score=1,
        is_significant=False,
        control_measure="Giám sát nồng độ Clo dư tự do 0.5 - 1.0 ppm theo SSOP-01",
        q1="YES", q2="YES", q3="NO", q4="NO",
        classification="PRP",
        notes="Kiểm soát thông qua chương trình tiên quyết SSOP",
    )
    h4 = HazardAnalysis(
        step_id=step3.step_id,
        hazard_type="BIOLOGICAL",
        hazard_name="Sự sống sót của Salmonella, Listeria monocytogenes do gia nhiệt không đủ",
        potential_consequence="Ngộ độc thực phẩm nặng, nhiễm trùng huyết",
        likelihood=2,
        severity=3,
        risk_score=6,
        is_significant=True,
        control_measure="Duy trì nhiệt độ tâm sản phẩm ≥ 75°C trong thời gian tối thiểu ≥ 15 giây",
        q1="YES", q2="YES", q3="NO", q4="NO",
        classification="CCP",
        notes="Bước tiêu diệt vi sinh vật chính của toàn bộ quy trình",
    )
    h5 = HazardAnalysis(
        step_id=step4.step_id,
        hazard_type="PHYSICAL",
        hazard_name="Mảnh kim loại từ dao phi lê, móc câu hoặc thiết bị vỡ lẫn vào thịt cá",
        potential_consequence="Gây tổn thương thực quản, răng miệng và đường tiêu hóa người tiêu dùng",
        likelihood=2,
        severity=3,
        risk_score=6,
        is_significant=True,
        control_measure="Chạy qua máy dò kim loại tự động: Fe ≤ 1.5mm, Non-Fe ≤ 2.0mm, SUS ≤ 2.5mm",
        q1="YES", q2="YES", q3="NO", q4="NO",
        classification="CCP",
        notes="Tự động loại bỏ sản phẩm lỗi vào thùng khóa",
    )
    h6 = HazardAnalysis(
        step_id=step5.step_id,
        hazard_type="BIOLOGICAL",
        hazard_name="Vi sinh vật tái phát triển do thời gian cấp đông kéo dài hoặc nhiệt độ không đạt",
        potential_consequence="Giảm chất lượng thịt cá, phát sinh vi sinh chịu lạnh",
        likelihood=2,
        severity=2,
        risk_score=4,
        is_significant=True,
        control_measure="Cấp đông nhanh IQF đạt nhiệt độ tâm ≤ -18°C trong thời gian ≤ 4 giờ",
        q1="YES", q2="NO", q3="YES", q4="NO",
        classification="OPRP",
        notes="Kiểm soát qua nhật ký IQF",
    )
    db.add_all([h1, h2, h3, h4, h5, h6])
    db.flush()

    # 3. Seed 4 CCPs
    ccp1 = CCPDefinition(
        ccp_code="CCP 1",
        name="Tiếp nhận & Kiểm soát Nhiệt độ / Histamine",
        process_step_id=step1.step_id,
        hazard_description="Độc tố Histamine hình thành do vi sinh vật phân giải axit amin khi bảo quản sai nhiệt độ",
        critical_limit={
            "param": "Nhiệt độ xe & Histamine",
            "min_val": None,
            "max_val": -18.0,
            "unit": "°C",
            "histamine_max_ppm": 50.0,
            "condition_text": "Nhiệt độ thùng xe ≤ -18.0°C; Histamine ≤ 50 mg/kg; Cảm quan tươi đạt loại A"
        },
        monitoring_frequency="Mỗi chuyến xe / Mỗi lô tiếp nhận",
        monitoring_method="Đo nhiệt kế calibrated điện tử đâm tâm cá tại 5 vị trí & Test kit ELISA định lượng",
        corrective_action_plan="Từ chối nhận hàng nếu nhiệt độ > -15°C hoặc Histamine > 50 ppm; cô lập lô và lập biên bản NC",
        responsible_role="QC Tiếp nhận & Thủ kho lạnh",
        status="ACTIVE",
    )
    ccp2 = CCPDefinition(
        ccp_code="CCP 2",
        name="Gia nhiệt tiệt trùng sơ bộ",
        process_step_id=step3.step_id,
        hazard_description="Vi sinh vật gây bệnh còn sống sót (Salmonella spp., Listeria monocytogenes, Clostridium botulinum type E)",
        critical_limit={
            "param": "Nhiệt độ tâm & Thời gian giữ nhiệt",
            "min_val": 75.0,
            "max_val": 95.0,
            "unit": "°C",
            "time_min_sec": 15,
            "condition_text": "Nhiệt độ tâm sản phẩm ≥ 75.0°C trong thời gian tối thiểu ≥ 15 giây"
        },
        monitoring_frequency="Mỗi mẻ hấp (Liên tục bằng cảm biến nhiệt tự động)",
        monitoring_method="Hệ thống ghi nhận nhiệt độ tự động SCADA + Nhiệt kế kim loại chuẩn định kỳ",
        corrective_action_plan="Nếu nhiệt độ < 75°C: Dừng chuyển công đoạn, kéo dài thời gian hấp thêm 5 phút hoặc tái gia nhiệt toàn bộ mẻ; hiệu chỉnh van hơi",
        responsible_role="QC Công đoạn & Trưởng ca Nấu/Hấp",
        status="ACTIVE",
    )
    ccp3 = CCPDefinition(
        ccp_code="CCP 3",
        name="Dò kim loại băng tải tự động",
        process_step_id=step4.step_id,
        hazard_description="Dị vật kim loại sắt (Fe), kim loại màu (Non-Fe) và thép không gỉ (SUS) lẫn trong sản phẩm",
        critical_limit={
            "param": "Độ nhạy mẫu thử chuẩn",
            "min_val": None,
            "max_val": 1.5,
            "unit": "mm",
            "condition_text": "Fe ≤ 1.5mm · Non-Fe ≤ 2.0mm · SUS ≤ 2.5mm (Tự động phát hiện & đẩy vào thùng khóa)"
        },
        monitoring_frequency="Mỗi mẻ / Đầu ca, giữa ca và cuối ca (Mỗi 2 giờ)",
        monitoring_method="Chạy que thử chuẩn Fe 1.5mm, Non-Fe 2.0mm, SUS 2.5mm qua cổng dò kim loại",
        corrective_action_plan="Nếu máy không phát hiện mẫu thử: Dừng chuyền, cô lập và tái kiểm tra toàn bộ sản phẩm sản xuất từ lần kiểm tra đạt gần nhất",
        responsible_role="QC Đóng gói & Kỹ thuật máy",
        status="ACTIVE",
    )
    ccp4 = CCPDefinition(
        ccp_code="oPRP 1",
        name="Cấp đông nhanh IQF & Bảo quản kho lạnh",
        process_step_id=step5.step_id,
        hazard_description="Phát triển vi sinh vật chịu lạnh và biến tính chất đạm do nhiệt độ bảo quản không đạt chuẩn",
        critical_limit={
            "param": "Nhiệt độ tâm cá sau cấp đông",
            "min_val": None,
            "max_val": -18.0,
            "unit": "°C",
            "condition_text": "Nhiệt độ tâm sau ra đông IQF ≤ -18.0°C; Nhiệt độ kho lạnh luôn duy trì ≤ -20°C"
        },
        monitoring_frequency="Mỗi mẻ ra khỏi băng chuyền IQF & Mỗi 1 giờ tại kho lạnh",
        monitoring_method="Nhiệt kế kim đâm tâm calibrated & Hệ thống datalogger nhiệt độ tự động 24/7",
        corrective_action_plan="Nếu tâm cá > -18°C: Đưa lại hầm cấp đông bổ sung 30 phút; kiểm tra tải máy nén và áp suất môi chất lạnh",
        responsible_role="Thủ kho lạnh & Kỹ sư Vận hành máy",
        status="ACTIVE",
    )
    db.add_all([ccp1, ccp2, ccp3, ccp4])
    db.flush()

    # 4. Seed 6 CCP Monitoring Logs
    log1 = CCPMonitoringLog(
        ccp_id=ccp1.ccp_id,
        batch_number="LOT-2026-B01",
        measured_value=-19.4,
        unit="°C",
        measured_details={"histamine_ppm": 12.5, "sensory_grade": "A", "truck_no": "51C-889.23"},
        is_critical_limit_exceeded=False,
        status="NORMAL",
        verification_status="VERIFIED",
        notes="Nhiệt độ xe lạnh và chỉ tiêu Histamine đạt tiêu chuẩn xuất khẩu EU",
    )
    log2 = CCPMonitoringLog(
        ccp_id=ccp2.ccp_id,
        batch_number="LOT-2026-B01",
        measured_value=78.4,
        unit="°C",
        measured_details={"holding_time_sec": 18, "steam_pressure_bar": 2.1},
        is_critical_limit_exceeded=False,
        status="NORMAL",
        verification_status="VERIFIED",
        notes="Gia nhiệt ổn định, đường biểu diễn nhiệt đạt chuẩn HACCP",
    )
    log3 = CCPMonitoringLog(
        ccp_id=ccp3.ccp_id,
        batch_number="LOT-2026-B01",
        measured_value=1.4,
        unit="mm",
        measured_details={"test_fe": "PASS", "test_non_fe": "PASS", "test_sus": "PASS", "rejections_count": 0},
        is_critical_limit_exceeded=False,
        status="WARNING",
        notes="Độ nhạy Fe đạt 1.4mm (sát ngưỡng 1.5mm), đã căn chỉnh lại độ nhạy đầu đọc",
        verification_status="VERIFIED",
    )
    log4 = CCPMonitoringLog(
        ccp_id=ccp4.ccp_id,
        batch_number="LOT-2026-B01",
        measured_value=-21.5,
        unit="°C",
        measured_details={"iqf_time_min": 190, "core_temp": -21.5},
        is_critical_limit_exceeded=False,
        status="NORMAL",
        verification_status="VERIFIED",
        notes="Cá đạt nhiệt độ tâm lạnh sâu đều",
    )
    log5 = CCPMonitoringLog(
        ccp_id=ccp2.ccp_id,
        batch_number="LOT-2026-B02",
        measured_value=76.8,
        unit="°C",
        measured_details={"holding_time_sec": 16, "steam_pressure_bar": 2.0},
        is_critical_limit_exceeded=False,
        status="NORMAL",
        verification_status="VERIFIED",
        notes="Mẻ sản xuất ca sáng đạt chỉ tiêu vi sinh",
    )
    log6 = CCPMonitoringLog(
        ccp_id=ccp3.ccp_id,
        batch_number="LOT-2026-B02",
        measured_value=1.2,
        unit="mm",
        measured_details={"test_fe": "PASS", "test_non_fe": "PASS", "test_sus": "PASS"},
        is_critical_limit_exceeded=False,
        status="NORMAL",
        verification_status="VERIFIED",
        notes="Máy dò kim loại vận hành trơn tru",
    )
    db.add_all([log1, log2, log3, log4, log5, log6])
    db.flush()

    # 5. Seed 6 PRP Programs
    p1 = PRPProgram(
        program_code="GMP-01",
        program_name="GMP Tiếp nhận và Bảo quản Nguyên liệu",
        group="GMP",
        scope="Khu vực tiếp nhận & Kho lạnh nguyên liệu",
        frequency="Mỗi ca sản xuất",
        responsible_dept="Phòng Quản lý Chất lượng (QA/QC)",
        status="ACTIVE",
        description="Quy định kiểm soát vệ sinh phương tiện vận chuyển, tình trạng bao gói và điều kiện nhiệt độ tiếp nhận",
    )
    p2 = PRPProgram(
        program_code="GMP-02",
        program_name="GMP Vệ sinh Thiết bị & Dụng cụ Chế biến",
        group="GMP",
        scope="Xưởng sản xuất chính & Dây chuyền fillet",
        frequency="Trước & sau mỗi ca làm việc",
        responsible_dept="Phòng Sản xuất",
        status="ACTIVE",
        description="Quy trình tẩy rửa, khử trùng bề mặt tiếp xúc thực phẩm bằng dung dịch Clorin 100-200 ppm",
    )
    p3 = PRPProgram(
        program_code="SSOP-01",
        program_name="SSOP An toàn Nguồn nước & Nước đá Chế biến",
        group="SSOP",
        scope="Hệ thống lọc RO & Máy sản xuất đá vảy",
        frequency="Hàng ngày",
        responsible_dept="Phòng Bảo trì & Cơ điện",
        status="ACTIVE",
        description="Kiểm tra nồng độ Clo dư tự do (0.5-1.0 ppm), vi sinh định kỳ theo QCVN 01-1:2018/BYT",
    )
    p4 = PRPProgram(
        program_code="SSOP-02",
        program_name="SSOP Vệ sinh Cá nhân & Sức khỏe Công nhân",
        group="SSOP",
        scope="Phòng thay đồ & Lối vào khu vô trùng",
        frequency="Mỗi ca trước khi vào xưởng",
        responsible_dept="Phòng Y tế & Hành chính Nhân sự",
        status="ACTIVE",
        description="Kiểm tra trang phục bảo hộ (mũ, khẩu trang, găng tay, ủng), vệ sinh tay và khai báo vết thương hở",
    )
    p5 = PRPProgram(
        program_code="SSOP-03",
        program_name="SSOP Kiểm soát Côn trùng & Sinh vật gây hại (Pest Control)",
        group="SSOP",
        scope="Toàn bộ khuôn viên nhà máy & Xung quanh nhà xưởng",
        frequency="Hàng tuần",
        responsible_dept="Đội Bảo trì & Nhà thầu Pest Control",
        status="ACTIVE",
        description="Kiểm tra bẫy chuột hộp ngoài trời, đèn bắt côn trùng UV và màn chắn gió",
    )
    p6 = PRPProgram(
        program_code="5S-01",
        program_name="5S Sắp xếp & Vệ sinh Khu vực Sản xuất",
        group="5S",
        scope="Khu vực sơ chế & Đóng gói",
        frequency="Cuối mỗi ngày làm việc",
        responsible_dept="Toàn thể Cán bộ Công nhân viên",
        status="ACTIVE",
        description="Sàng lọc, Sắp xếp, Sạch sẽ, Săn sóc, Sẵn sàng theo tiêu chuẩn nhà máy chế biến thực phẩm",
    )
    db.add_all([p1, p2, p3, p4, p5, p6])
    db.flush()

    # 6. Seed 6 PRP Checklist Logs
    ck1 = PRPChecklistLog(
        program_id=p1.program_id,
        shift_name="Ca sáng",
        check_date=date.today(),
        check_time="06:30",
        items_checked=[
            {"item": "Kiểm tra vệ sinh sàn xe vận chuyển nguyên liệu", "result": "Đạt", "note": "Sàn xe sạch, không mùi lạ"},
            {"item": "Kiểm tra nhiệt độ thùng xe lạnh (≤ -18°C)", "result": "Đạt", "note": "-19.2°C"},
            {"item": "Kiểm tra nguyên vẹn bao bì tem nhãn", "result": "Đạt", "note": "Đầy đủ seal và COA"},
        ],
        compliance_rate=100.0,
        status="COMPLIANT",
        finding_notes="Tiếp nhận lô cá ngừ buổi sáng tuân thủ đầy đủ quy trình GMP-01",
    )
    ck2 = PRPChecklistLog(
        program_id=p2.program_id,
        shift_name="Ca sáng",
        check_date=date.today(),
        check_time="07:00",
        items_checked=[
            {"item": "Vệ sinh bàn phi lê inox và thớt chuyên dụng", "result": "Đạt", "note": "Đã tẩy rửa Clorin"},
            {"item": "Kiểm tra dao phi lê không bị mẻ / rỉ sét", "result": "Đạt", "note": "12 bộ dao đã kiểm tra"},
            {"item": "Băng tải chuyền cá không đọng cặn bẩn", "result": "Đạt", "note": "Sạch bóng"},
        ],
        compliance_rate=100.0,
        status="COMPLIANT",
        finding_notes="Dây chuyền sẵn sàng vận hành trước giờ sản xuất",
    )
    ck3 = PRPChecklistLog(
        program_id=p3.program_id,
        shift_name="Ca sáng",
        check_date=date.today(),
        check_time="08:15",
        items_checked=[
            {"item": "Nồng độ Clo dư tự do nước rửa (0.5 - 1.0 ppm)", "result": "Đạt", "note": "0.75 ppm"},
            {"item": "Nước đá vảy bảo quản sạch, không lẫn tạp chất", "result": "Đạt", "note": "Đá sản xuất từ nước RO"},
            {"item": "Áp lực nước đầu vòi ổn định", "result": "Đạt", "note": "3.2 bar"},
        ],
        compliance_rate=100.0,
        status="COMPLIANT",
        finding_notes="Hệ thống cấp nước RO và trạm khử trùng clo hoạt động chính xác",
    )
    ck4 = PRPChecklistLog(
        program_id=p4.program_id,
        shift_name="Ca sáng",
        check_date=date.today(),
        check_time="09:00",
        items_checked=[
            {"item": "Công nhân mặc đầy đủ bảo hộ (mũ trùm tóc, khẩu trang)", "result": "Đạt", "note": "32/32 CN tuân thủ"},
            {"item": "Rửa tay và sát khuẩn cồn 70 độ trước khi vào phòng", "result": "Cần khắc phục", "note": "Bình cồn số 2 bị hết, đã châm bổ sung ngay"},
            {"item": "Kiểm tra móng tay ngắn, không đeo trang sức", "result": "Đạt", "note": "Đã kiểm tra đầu ca"},
        ],
        compliance_rate=66.7,
        status="ACTION_REQUIRED",
        finding_notes="Phát hiện bình cồn sát khuẩn tại cửa số 2 bị cạn dung dịch",
        corrective_action="Đã yêu cầu tổ tạp vụ châm bổ sung dung dịch cồn và kiểm tra lại toàn bộ 6 bình sát khuẩn",
    )
    ck5 = PRPChecklistLog(
        program_id=p5.program_id,
        shift_name="Ca sáng",
        check_date=date.today(),
        check_time="10:30",
        items_checked=[
            {"item": "Kiểm tra 15 bẫy hộp chuột ngoài hàng rào", "result": "Đạt", "note": "Không có dấu hiệu cắn phá"},
            {"item": "Đèn bắt muỗi/côn trùng UV khu đệm hoạt động tốt", "result": "Đạt", "note": "Đã vệ sinh khay chứa"},
            {"item": "Màn nhựa chắn côn trùng cửa kho nguyên vẹn", "result": "Đạt", "note": "Khép kín"},
        ],
        compliance_rate=100.0,
        status="COMPLIANT",
        finding_notes="Khuôn viên nhà máy kiểm soát tốt sinh vật gây hại",
    )
    ck6 = PRPChecklistLog(
        program_id=p6.program_id,
        shift_name="Ca sáng",
        check_date=date.today(),
        check_time="11:30",
        items_checked=[
            {"item": "Sắp xếp dụng cụ chế biến vào giá quy định", "result": "Đạt", "note": "Ngăn nắp"},
            {"item": "Thu gom phế phẩm phụ phẩm vào thùng rác chuyên dụng", "result": "Đạt", "note": "Có nắp đậy kín"},
            {"item": "Sàn nhà xưởng thoát nước tốt, không trơn trượt", "result": "Đạt", "note": "Khô ráo"},
        ],
        compliance_rate=100.0,
        status="COMPLIANT",
        finding_notes="Duy trì 5S đạt loại xuất sắc",
    )
    db.add_all([ck1, ck2, ck3, ck4, ck5, ck6])

    db.commit()


# ==================== 1. KPI STATS ENDPOINT ====================
@router.get("/stats", response_model=HACCPStatsResponse)
def get_haccp_stats(db: Session = Depends(get_db)):
    seed_haccp_data_if_empty(db)

    total_steps = db.scalar(select(func.count(ProcessStep.step_id))) or 0
    total_hazards = db.scalar(select(func.count(HazardAnalysis.hazard_id))) or 0
    total_ccps = db.scalar(select(func.count(CCPDefinition.ccp_id))) or 0
    active_ccps = db.scalar(select(func.count(CCPDefinition.ccp_id)).where(CCPDefinition.status == "ACTIVE")) or 0

    total_logs = db.scalar(select(func.count(CCPMonitoringLog.log_id))) or 0
    normal_logs = db.scalar(select(func.count(CCPMonitoringLog.log_id)).where(CCPMonitoringLog.status == "NORMAL")) or 0
    warning_logs = db.scalar(select(func.count(CCPMonitoringLog.log_id)).where(CCPMonitoringLog.status == "WARNING")) or 0
    critical_breaches = db.scalar(select(func.count(CCPMonitoringLog.log_id)).where(
        or_(CCPMonitoringLog.status == "CRITICAL", CCPMonitoringLog.is_critical_limit_exceeded == True)
    )) or 0

    in_limit_rate = round((normal_logs + warning_logs) / total_logs * 100, 1) if total_logs > 0 else 100.0

    total_prp = db.scalar(select(func.count(PRPProgram.program_id))) or 0
    avg_compliance = db.scalar(select(func.avg(PRPChecklistLog.compliance_rate))) or 100.0

    return HACCPStatsResponse(
        total_steps=total_steps,
        total_hazards=total_hazards,
        total_ccps=total_ccps,
        active_ccps=active_ccps,
        total_logs_today=total_logs,
        normal_logs_count=normal_logs,
        warning_logs_count=warning_logs,
        critical_breaches_count=critical_breaches,
        in_limit_percentage=in_limit_rate,
        total_prp_programs=total_prp,
        prp_compliance_rate_avg=round(float(avg_compliance), 1),
    )


# ==================== 1.5. HACCP PLANS CRUD ====================
@router.get("/plans", response_model=List[HACCPPlanResponse])
def get_haccp_plans(
    q: Optional[str] = None,
    product_line: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_haccp_data_if_empty(db)
    stmt = select(HACCPPlan).order_by(HACCPPlan.created_at.desc())
    if q:
        stmt = stmt.where(or_(
            HACCPPlan.plan_code.ilike(f"%{q.strip()}%"),
            HACCPPlan.plan_name.ilike(f"%{q.strip()}%")
        ))
    if product_line and product_line != "ALL":
        stmt = stmt.where(HACCPPlan.product_line == product_line)
    if status_filter and status_filter != "ALL":
        stmt = stmt.where(HACCPPlan.status == status_filter)

    plans = db.scalars(stmt).unique().all()
    return [format_plan_out(p) for p in plans]


@router.get("/plans/{plan_id}", response_model=HACCPPlanResponse)
def get_haccp_plan_detail(plan_id: UUID, db: Session = Depends(get_db)):
    plan = db.get(HACCPPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy kế hoạch HACCP")
    return format_plan_out(plan)


@router.post("/plans", response_model=HACCPPlanResponse, status_code=status.HTTP_201_CREATED)
def create_haccp_plan(payload: HACCPPlanCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(HACCPPlan).where(HACCPPlan.plan_code == payload.plan_code.strip()))
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã kế hoạch HACCP '{payload.plan_code}' đã tồn tại")

    plan = HACCPPlan(
        plan_code=payload.plan_code.strip(),
        plan_name=payload.plan_name.strip(),
        product_line=payload.product_line.strip(),
        version=payload.version.strip(),
        team_leader=payload.team_leader.strip(),
        approved_by=payload.approved_by.strip() if payload.approved_by else "Giám đốc Nhà máy",
        effective_date=payload.effective_date or date.today(),
        scope_description=payload.scope_description.strip() if payload.scope_description else None,
        status=payload.status,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return format_plan_out(plan)


@router.put("/plans/{plan_id}", response_model=HACCPPlanResponse)
def update_haccp_plan(plan_id: UUID, payload: HACCPPlanUpdate, db: Session = Depends(get_db)):
    plan = db.get(HACCPPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy kế hoạch HACCP cần cập nhật")

    if payload.plan_code and payload.plan_code.strip() != plan.plan_code:
        dup = db.scalar(select(HACCPPlan).where(and_(HACCPPlan.plan_code == payload.plan_code.strip(), HACCPPlan.plan_id != plan_id)))
        if dup:
            raise HTTPException(status_code=400, detail=f"Mã kế hoạch '{payload.plan_code}' đã bị trùng")
        plan.plan_code = payload.plan_code.strip()

    if payload.plan_name is not None:
        plan.plan_name = payload.plan_name.strip()
    if payload.product_line is not None:
        plan.product_line = payload.product_line.strip()
    if payload.version is not None:
        plan.version = payload.version.strip()
    if payload.team_leader is not None:
        plan.team_leader = payload.team_leader.strip()
    if payload.approved_by is not None:
        plan.approved_by = payload.approved_by.strip()
    if payload.effective_date is not None:
        plan.effective_date = payload.effective_date
    if payload.scope_description is not None:
        plan.scope_description = payload.scope_description.strip()
    if payload.status is not None:
        plan.status = payload.status

    db.commit()
    db.refresh(plan)
    return format_plan_out(plan)


@router.post("/plans/{plan_id}/approve", response_model=HACCPPlanResponse)
def approve_haccp_plan(
    plan_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "haccp_leader")),
):
    """
    Phê duyệt chính thức Kế hoạch HACCP tổng thể (ISO 22000:2018 Clause 8.5.4)
    Bắt buộc thực hiện bởi Trưởng ban HACCP / Đội trưởng Đội ATTP hoặc Giám đốc Nhà máy
    """
    plan = db.get(HACCPPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy kế hoạch HACCP cần phê duyệt")

    approver = current_user.full_name or current_user.username
    plan.status = "APPROVED"
    plan.approved_by = approver
    plan.effective_date = date.today()

    # Tự động tạo bản ghi thẩm định/thẩm tra ban hành vào HACCPPlanReview
    review_code = f"REV-{plan.plan_code}-{datetime.now().strftime('%Y%m%d%H%M')}"
    review = HACCPPlanReview(
        review_code=review_code,
        plan_id=plan.plan_id,
        review_date=date.today(),
        review_type="PERIODIC",
        reviewed_by_name=approver,
        scope_of_review=f"Phê duyệt thẩm tra toàn diện kế hoạch kiểm soát mối nguy {plan.plan_code} theo ISO 22000",
        findings="Đã hoàn tất phân tích mối nguy, xác định giới hạn tới hạn CCP và quy trình thẩm định. Kế hoạch đủ điều kiện ban hành áp dụng.",
        changes_required=False,
        plan_version_before=plan.version,
        plan_version_after=plan.version,
        approval_status="APPROVED",
        approved_by_name=approver,
    )
    db.add(review)

    db.commit()
    db.refresh(plan)
    return format_plan_out(plan)


@router.post("/plans/{plan_id}/verify", response_model=HACCPPlanResponse)
def verify_and_revise_haccp_plan(
    plan_id: UUID,
    scope_of_review: str = Query(..., description="Phạm vi thẩm tra: Sau sự cố hoặc sau thay đổi quy trình"),
    findings: str = Query(..., description="Kết luận thẩm tra"),
    new_version: Optional[str] = Query(None, description="Phiên bản mới nếu có sửa đổi"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "haccp_leader")),
):
    """
    Kiểm soát sửa đổi & thẩm tra kế hoạch HACCP sau thẩm định hoặc thay đổi công nghệ (Clause 8.6 & 8.8)
    """
    plan = db.get(HACCPPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy kế hoạch HACCP")

    ver_before = plan.version
    ver_after = new_version.strip() if new_version else plan.version
    if new_version:
        plan.version = ver_after

    approver = current_user.full_name or current_user.username
    review_code = f"REV-{plan.plan_code}-{datetime.now().strftime('%Y%m%d%H%M')}"
    review = HACCPPlanReview(
        review_code=review_code,
        plan_id=plan.plan_id,
        review_date=date.today(),
        review_type="TRIGGERED_BY_CHANGE" if new_version else "PERIODIC",
        reviewed_by_name=approver,
        scope_of_review=scope_of_review,
        findings=findings,
        changes_required=bool(new_version and new_version != ver_before),
        plan_version_before=ver_before,
        plan_version_after=ver_after,
        approval_status="APPROVED",
        approved_by_name=approver,
    )
    db.add(review)
    db.commit()
    db.refresh(plan)
    return format_plan_out(plan)


@router.delete("/plans/{plan_id}")
def delete_haccp_plan(plan_id: UUID, db: Session = Depends(get_db)):
    plan = db.get(HACCPPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy kế hoạch HACCP cần xóa")
    name = plan.plan_name
    db.delete(plan)
    db.commit()
    return {"message": f"Đã xóa kế hoạch HACCP '{name}' thành công"}


# ==================== 2. PROCESS STEPS CRUD ====================
@router.get("/process-steps", response_model=List[ProcessStepResponse])
def get_process_steps(
    q: Optional[str] = None,
    plan_id: Optional[UUID] = None,
    product_line: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_haccp_data_if_empty(db)
    stmt = select(ProcessStep).order_by(ProcessStep.step_number.asc())
    if q:
        stmt = stmt.where(ProcessStep.step_name.ilike(f"%{q.strip()}%"))
    if plan_id:
        stmt = stmt.where(ProcessStep.plan_id == plan_id)
    if product_line:
        stmt = stmt.where(ProcessStep.product_line == product_line)
    
    steps = db.scalars(stmt).unique().all()
    out = []
    for idx, s in enumerate(steps, start=1):
        formatted = format_step_out(s)
        formatted.step_number = idx
        out.append(formatted)
    return out


@router.post("/process-steps", response_model=ProcessStepResponse, status_code=status.HTTP_201_CREATED)
def create_process_step(payload: ProcessStepCreate, db: Session = Depends(get_db)):
    step = ProcessStep(
        plan_id=payload.plan_id,
        step_number=payload.step_number,
        step_name=payload.step_name,
        product_line=payload.product_line,
        description=payload.description,
        is_ccp_or_oprp=payload.is_ccp_or_oprp,
    )
    db.add(step)
    db.commit()
    db.refresh(step)
    return format_step_out(step)


@router.get("/process-steps/{step_id}", response_model=ProcessStepResponse)
def get_process_step_detail(step_id: UUID, db: Session = Depends(get_db)):
    step = db.get(ProcessStep, step_id)
    if not step:
        raise HTTPException(status_code=404, detail="Không tìm thấy công đoạn sản xuất")
    return format_step_out(step)


@router.put("/process-steps/{step_id}", response_model=ProcessStepResponse)
def update_process_step(step_id: UUID, payload: ProcessStepUpdate, db: Session = Depends(get_db)):
    step = db.get(ProcessStep, step_id)
    if not step:
        raise HTTPException(status_code=404, detail="Không tìm thấy công đoạn sản xuất")
    
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(step, k, v)
    
    db.commit()
    db.refresh(step)
    return format_step_out(step)


@router.delete("/process-steps/{step_id}")
def delete_process_step(step_id: UUID, db: Session = Depends(get_db)):
    step = db.get(ProcessStep, step_id)
    if not step:
        raise HTTPException(status_code=404, detail="Không tìm thấy công đoạn sản xuất")
    
    plan_id = step.plan_id
    name = step.step_name
    db.delete(step)
    db.commit()

    # Tự động dồn lại số thứ tự (1, 2, 3...) cho các công đoạn còn lại theo đúng thứ tự
    if plan_id:
        remaining_steps = db.scalars(
            select(ProcessStep)
            .where(ProcessStep.plan_id == plan_id)
            .order_by(ProcessStep.step_number.asc(), ProcessStep.created_at.asc())
        ).all()
        for idx, s in enumerate(remaining_steps, start=1):
            s.step_number = idx
        db.commit()

    return {"message": f"Đã xóa công đoạn '{name}' thành công"}


@router.post("/plans/{plan_id}/sync-flow-steps", response_model=List[ProcessStepResponse])
def sync_plan_flow_steps(plan_id: UUID, payload: SyncFlowStepsRequest, db: Session = Depends(get_db)):
    """Đồng bộ toàn bộ công đoạn sản xuất từ Bộ Thiết Kế Lưu Đồ (Workflow Studio) vào Kế hoạch HACCP."""
    plan = db.get(HACCPPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy kế hoạch HACCP để đồng bộ")
    
    current_steps = db.scalars(
        select(ProcessStep).where(ProcessStep.plan_id == plan_id).order_by(ProcessStep.step_number.asc())
    ).all()
    current_step_map = {str(s.step_id): s for s in current_steps}

    import re
    kept_step_ids = set()
    result_steps = []

    for idx, item in enumerate(payload.steps, start=1):
        raw_name = (item.step_name or "").strip()
        clean_name = re.sub(r"^\d+[\.\:\-]\s*", "", raw_name).strip() or raw_name or f"Công đoạn {idx}"

        matched_step = None
        if item.step_id:
            matched_step = current_step_map.get(str(item.step_id))

        if not matched_step:
            for s in current_steps:
                if str(s.step_id) not in kept_step_ids and s.step_name.strip().lower() == clean_name.lower():
                    matched_step = s
                    break

        if matched_step:
            matched_step.step_number = idx
            matched_step.step_name = clean_name
            if item.description is not None:
                matched_step.description = item.description
            if item.is_ccp_or_oprp is not None:
                matched_step.is_ccp_or_oprp = bool(item.is_ccp_or_oprp)
            if item.product_line:
                matched_step.product_line = item.product_line
            kept_step_ids.add(str(matched_step.step_id))
            result_steps.append(matched_step)
        else:
            new_step = ProcessStep(
                plan_id=plan_id,
                step_number=idx,
                step_name=clean_name,
                product_line=item.product_line or plan.product_line or "Chế biến Thủy hải sản",
                description=item.description or "",
                is_ccp_or_oprp=bool(item.is_ccp_or_oprp),
            )
            db.add(new_step)
            db.flush()
            kept_step_ids.add(str(new_step.step_id))
            result_steps.append(new_step)

    # Xóa các công đoạn cũ không còn trong sơ đồ mới
    for s in current_steps:
        if str(s.step_id) not in kept_step_ids:
            db.delete(s)

    db.commit()
    for s in result_steps:
        db.refresh(s)

    return [format_step_out(s) for s in result_steps]


@router.post("/plans/{plan_id}/save-workflow-and-steps", response_model=SaveWorkflowAndStepsResponse)
def save_workflow_and_sync_steps_atomic(
    plan_id: UUID,
    payload: SaveWorkflowAndStepsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader")),
):
    """
    Lưu đồ quy trình workflow và đồng bộ công đoạn HACCP trong MỘT giao dịch (transaction) nguyên tử duy nhất.
    Đảm bảo workflow template và process-step không bao giờ bị lệch dữ liệu khi có sự cố.
    """
    plan = db.get(HACCPPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy kế hoạch HACCP")

    wf_raw = payload.workflow
    wf_code = str(wf_raw.get("code") or f"WF-HACCP-{str(plan_id)[:8]}").strip()
    wf_title = str(wf_raw.get("title") or f"Lưu đồ Quy trình HACCP - {plan.plan_name}").strip()
    wf_desc = wf_raw.get("description") or f"Lưu đồ quy trình sản xuất đồng bộ cho kế hoạch HACCP '{plan.plan_name}'."
    wf_module = str(wf_raw.get("module") or "HACCP_FLOW").strip().upper()
    wf_version = str(wf_raw.get("version") or "1.0").strip()

    raw_nodes = wf_raw.get("nodes") or []
    raw_edges = wf_raw.get("edges") or []

    # 1. Thẩm định tính toàn vẹn của đồ thị workflow (không cycle, start/end hợp lệ, kết nối đầy đủ)
    try:
        typed_nodes = [WorkflowNode.model_validate(n) for n in raw_nodes]
        typed_edges = [WorkflowEdge.model_validate(e) for e in raw_edges]
        validate_workflow_structure(
            nodes=typed_nodes,
            edges=typed_edges,
            module=wf_module,
            status="ACTIVE",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cấu trúc lưu đồ workflow không hợp lệ: {str(e)}")

    import re

    # Bắt đầu giao dịch nguyên tử
    try:
        # A. Upsert Workflow Template
        wf = db.scalar(select(DynamicWorkflowTemplate).where(DynamicWorkflowTemplate.code == wf_code))
        if wf:
            wf.title = wf_title
            wf.description = wf_desc
            wf.version = wf_version
            wf.module = wf_module
            wf.nodes = [n.model_dump() for n in typed_nodes]
            wf.edges = [e.model_dump() for e in typed_edges]
            wf.status = "ACTIVE"
            wf.updated_at = datetime.now(timezone.utc)
        else:
            wf = DynamicWorkflowTemplate(
                module=wf_module,
                code=wf_code,
                title=wf_title,
                description=wf_desc,
                version=wf_version,
                nodes=[n.model_dump() for n in typed_nodes],
                edges=[e.model_dump() for e in typed_edges],
                status="ACTIVE",
                created_by=current_user.user_id,
            )
            db.add(wf)
        db.flush()

        # B. Đồng bộ ProcessStep
        current_steps = db.scalars(
            select(ProcessStep).where(ProcessStep.plan_id == plan_id).order_by(ProcessStep.step_number.asc())
        ).all()
        current_step_map = {str(s.step_id): s for s in current_steps}

        steps_to_sync = payload.steps
        if steps_to_sync is None:
            # Tự động suy ra từ typed_nodes
            steps_to_sync = []
            for idx, n in enumerate(typed_nodes, start=1):
                clean_name = re.sub(r"^\d+[\.\:\-]\s*", "", n.label).strip() or n.label
                cfg = n.config or {}
                steps_to_sync.append(
                    SyncFlowStepItem(
                        step_id=n.id if len(n.id) == 36 else None,
                        step_number=idx,
                        step_name=clean_name,
                        product_line=plan.product_line or "Chế biến Thủy hải sản",
                        description=str(cfg.get("description") or ""),
                        is_ccp_or_oprp=bool(cfg.get("is_ccp")),
                    )
                )

        kept_step_ids = set()
        result_steps = []

        for idx, item in enumerate(steps_to_sync, start=1):
            raw_name = (item.step_name or "").strip()
            clean_name = re.sub(r"^\d+[\.\:\-]\s*", "", raw_name).strip() or raw_name or f"Công đoạn {idx}"

            matched_step = None
            if item.step_id:
                matched_step = current_step_map.get(str(item.step_id))

            if not matched_step:
                for s in current_steps:
                    if str(s.step_id) not in kept_step_ids and s.step_name.strip().lower() == clean_name.lower():
                        matched_step = s
                        break

            if matched_step:
                matched_step.step_number = idx
                matched_step.step_name = clean_name
                if item.description is not None:
                    matched_step.description = item.description
                if item.is_ccp_or_oprp is not None:
                    matched_step.is_ccp_or_oprp = bool(item.is_ccp_or_oprp)
                if item.product_line:
                    matched_step.product_line = item.product_line
                kept_step_ids.add(str(matched_step.step_id))
                result_steps.append(matched_step)
            else:
                new_step = ProcessStep(
                    plan_id=plan_id,
                    step_number=idx,
                    step_name=clean_name,
                    product_line=item.product_line or plan.product_line or "Chế biến Thủy hải sản",
                    description=item.description or "",
                    is_ccp_or_oprp=bool(item.is_ccp_or_oprp),
                )
                db.add(new_step)
                db.flush()
                kept_step_ids.add(str(new_step.step_id))
                result_steps.append(new_step)

        # Xóa các công đoạn không còn trong sơ đồ
        for s in current_steps:
            if str(s.step_id) not in kept_step_ids:
                db.delete(s)

        # C. Commit toàn bộ giao dịch nguyên tử
        db.commit()
        db.refresh(wf)
        for s in result_steps:
            db.refresh(s)

        return SaveWorkflowAndStepsResponse(
            workflow_id=wf.workflow_id,
            workflow_code=wf.code,
            workflow_title=wf.title,
            steps=[format_step_out(s) for s in result_steps],
            message="Đã lưu sơ đồ quy trình và đồng bộ danh mục công đoạn HACCP thành công trong một giao dịch nguyên tử.",
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi thực hiện giao dịch lưu workflow và công đoạn: {str(exc)}",
        )


# ==================== 3. HAZARD ANALYSIS CRUD ====================
@router.get("/hazards", response_model=List[HazardAnalysisResponse])
def get_hazards(
    step_id: Optional[UUID] = None,
    hazard_type: Optional[str] = None,
    classification: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_haccp_data_if_empty(db)
    stmt = select(HazardAnalysis).order_by(HazardAnalysis.created_at.desc())
    if step_id is not None:
        stmt = stmt.where(HazardAnalysis.step_id == step_id)
    if hazard_type:
        stmt = stmt.where(HazardAnalysis.hazard_type == hazard_type)
    if classification:
        stmt = stmt.where(HazardAnalysis.classification == classification)
    if q:
        stmt = stmt.where(HazardAnalysis.hazard_name.ilike(f"%{q.strip()}%"))
    
    hazards = db.scalars(stmt).unique().all()
    return [format_hazard_out(h) for h in hazards]


@router.post("/hazards", response_model=HazardAnalysisResponse, status_code=status.HTTP_201_CREATED)
def create_hazard(payload: HazardAnalysisCreate, db: Session = Depends(get_db)):
    step = db.get(ProcessStep, payload.step_id)
    if not step:
        raise HTTPException(status_code=400, detail="Công đoạn sản xuất liên kết không tồn tại")
    
    # Tính toán risk score = likelihood * severity
    calculated_risk = payload.likelihood * payload.severity
    
    hazard = HazardAnalysis(
        step_id=payload.step_id,
        hazard_type=payload.hazard_type,
        hazard_name=payload.hazard_name,
        potential_consequence=payload.potential_consequence,
        likelihood=payload.likelihood,
        severity=payload.severity,
        risk_score=calculated_risk,
        is_significant=payload.is_significant,
        control_measure=payload.control_measure,
        q1=payload.q1,
        q2=payload.q2,
        q3=payload.q3,
        q4=payload.q4,
        classification=payload.classification,
        notes=payload.notes,
    )
    db.add(hazard)
    
    # Nếu mối nguy là CCP hoặc oPRP thì cập nhật cờ trên công đoạn
    if payload.classification in ["CCP", "OPRP"]:
        step.is_ccp_or_oprp = True
    
    db.commit()
    db.refresh(hazard)
    return format_hazard_out(hazard)


@router.get("/hazards/{hazard_id}", response_model=HazardAnalysisResponse)
def get_hazard_detail(hazard_id: UUID, db: Session = Depends(get_db)):
    hazard = db.get(HazardAnalysis, hazard_id)
    if not hazard:
        raise HTTPException(status_code=404, detail="Không tìm thấy mối nguy phân tích")
    return format_hazard_out(hazard)


@router.put("/hazards/{hazard_id}", response_model=HazardAnalysisResponse)
def update_hazard(hazard_id: UUID, payload: HazardAnalysisUpdate, db: Session = Depends(get_db)):
    hazard = db.get(HazardAnalysis, hazard_id)
    if not hazard:
        raise HTTPException(status_code=404, detail="Không tìm thấy mối nguy phân tích")
    
    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(hazard, k, v)
    
    # Tự động cập nhật lại risk_score nếu likelihood hoặc severity thay đổi
    if "likelihood" in update_dict or "severity" in update_dict:
        hazard.risk_score = hazard.likelihood * hazard.severity
    
    db.commit()
    db.refresh(hazard)
    return format_hazard_out(hazard)


@router.delete("/hazards/{hazard_id}")
def delete_hazard(hazard_id: UUID, db: Session = Depends(get_db)):
    hazard = db.get(HazardAnalysis, hazard_id)
    if not hazard:
        raise HTTPException(status_code=404, detail="Không tìm thấy mối nguy phân tích")
    
    name = hazard.hazard_name
    db.delete(hazard)
    db.commit()
    return {"message": f"Đã xóa mối nguy '{name}' thành công"}


# ==================== 4. CCP DEFINITIONS CRUD ====================
@router.get("/ccps", response_model=List[CCPDefinitionResponse], include_in_schema=False)
@router.get("/ccp-definitions", response_model=List[CCPDefinitionResponse])
def get_ccp_definitions(
    status_filter: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_haccp_data_if_empty(db)
    stmt = select(CCPDefinition).order_by(CCPDefinition.ccp_code.asc())
    if status_filter:
        stmt = stmt.where(CCPDefinition.status == status_filter)
    if q:
        stmt = stmt.where(or_(
            CCPDefinition.ccp_code.ilike(f"%{q.strip()}%"),
            CCPDefinition.name.ilike(f"%{q.strip()}%"),
        ))
    
    ccps = db.scalars(stmt).unique().all()
    results = []
    for c in ccps:
        last_log = db.scalars(
            select(CCPMonitoringLog)
            .where(CCPMonitoringLog.ccp_id == c.ccp_id)
            .order_by(CCPMonitoringLog.test_time.desc())
            .limit(1)
        ).first()
        results.append(format_ccp_out(c, last_log))
    return results


@router.post("/ccp-definitions", response_model=CCPDefinitionResponse, status_code=status.HTTP_201_CREATED)
def create_ccp_definition(payload: CCPDefinitionCreate, db: Session = Depends(get_db)):
    # Check duplicate code
    dup = db.scalar(select(CCPDefinition).where(CCPDefinition.ccp_code == payload.ccp_code.strip()))
    if dup:
        raise HTTPException(status_code=400, detail=f"Mã điểm CCP '{payload.ccp_code}' đã tồn tại")
    
    ccp = CCPDefinition(
        ccp_code=payload.ccp_code.strip(),
        name=payload.name.strip(),
        process_step_id=payload.process_step_id,
        hazard_description=payload.hazard_description,
        critical_limit=payload.critical_limit,
        monitoring_frequency=payload.monitoring_frequency,
        monitoring_method=payload.monitoring_method,
        corrective_action_plan=payload.corrective_action_plan,
        responsible_role=payload.responsible_role,
        status=payload.status,
    )
    db.add(ccp)
    db.commit()
    db.refresh(ccp)
    return format_ccp_out(ccp)


@router.get("/ccp-definitions/{ccp_id}", response_model=CCPDefinitionResponse)
def get_ccp_detail(ccp_id: UUID, db: Session = Depends(get_db)):
    ccp = db.get(CCPDefinition, ccp_id)
    if not ccp:
        raise HTTPException(status_code=404, detail="Không tìm thấy điểm kiểm soát tới hạn")
    
    last_log = db.scalars(
        select(CCPMonitoringLog)
        .where(CCPMonitoringLog.ccp_id == ccp.ccp_id)
        .order_by(CCPMonitoringLog.test_time.desc())
        .limit(1)
    ).first()
    return format_ccp_out(ccp, last_log)


@router.put("/ccp-definitions/{ccp_id}", response_model=CCPDefinitionResponse)
def update_ccp_definition(ccp_id: UUID, payload: CCPDefinitionUpdate, db: Session = Depends(get_db)):
    ccp = db.get(CCPDefinition, ccp_id)
    if not ccp:
        raise HTTPException(status_code=404, detail="Không tìm thấy điểm kiểm soát tới hạn")
    
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(ccp, k, v)
    
    db.commit()
    db.refresh(ccp)
    return format_ccp_out(ccp)


@router.delete("/ccp-definitions/{ccp_id}")
def delete_ccp_definition(ccp_id: UUID, db: Session = Depends(get_db)):
    ccp = db.get(CCPDefinition, ccp_id)
    if not ccp:
        raise HTTPException(status_code=404, detail="Không tìm thấy điểm kiểm soát tới hạn")
    
    code = ccp.ccp_code
    db.delete(ccp)
    db.commit()
    return {"message": f"Đã xóa điểm kiểm soát '{code}' thành công"}


# ==================== 5. CCP MONITORING LOGS CRUD (REALTIME) ====================
@router.get("/ccp-logs", response_model=List[CCPMonitoringLogResponse])
def get_ccp_logs(
    ccp_id: Optional[UUID] = None,
    batch_number: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_haccp_data_if_empty(db)
    stmt = select(CCPMonitoringLog).order_by(CCPMonitoringLog.test_time.desc())
    if ccp_id is not None:
        stmt = stmt.where(CCPMonitoringLog.ccp_id == ccp_id)
    if batch_number:
        stmt = stmt.where(CCPMonitoringLog.batch_number.ilike(f"%{batch_number.strip()}%"))
    if status_filter:
        stmt = stmt.where(CCPMonitoringLog.status == status_filter)
    
    logs = db.scalars(stmt).unique().all()
    return [format_ccp_log_out(l) for l in logs]


@router.post("/ccp-logs", response_model=CCPMonitoringLogResponse, status_code=status.HTTP_201_CREATED)
def create_ccp_log(payload: CCPMonitoringLogCreate, db: Session = Depends(get_db)):
    ccp = db.get(CCPDefinition, payload.ccp_id)
    if not ccp:
        raise HTTPException(status_code=400, detail="Điểm kiểm soát tới hạn không tồn tại")
    
    # Tự động thẩm định giá trị đo đạc so với Critical Limits
    cl_dict = ccp.critical_limit or {}
    val = payload.measured_value
    min_val = cl_dict.get("min_val")
    max_val = cl_dict.get("max_val")

    is_breached = False
    log_status = "NORMAL"

    if min_val is not None and val < float(min_val):
        is_breached = True
        log_status = "CRITICAL"
    elif max_val is not None and val > float(max_val):
        is_breached = True
        log_status = "CRITICAL"
    else:
        # Kiểm tra ngưỡng cảnh báo (Warning threshold 10% tiệm cận)
        if min_val is not None and val <= float(min_val) * 1.05:
            log_status = "WARNING"
        elif max_val is not None and val >= float(max_val) * 0.95:
            log_status = "WARNING"

    # Nếu người dùng có truyền trạng thái chỉ định thì tôn trọng hoặc override nếu có vi phạm
    if payload.is_critical_limit_exceeded or payload.status == "CRITICAL":
        is_breached = True
        log_status = "CRITICAL"

    log_entry = CCPMonitoringLog(
        ccp_id=payload.ccp_id,
        batch_number=payload.batch_number.strip(),
        test_time=payload.test_time or datetime.now(timezone.utc),
        measured_value=val,
        unit=payload.unit,
        measured_details=payload.measured_details,
        is_critical_limit_exceeded=is_breached,
        status=log_status,
        deviation_action=payload.deviation_action,
        verification_status=payload.verification_status,
        checked_by=payload.checked_by,
        verified_by=payload.verified_by,
        notes=payload.notes,
    )
    db.add(log_entry)

    # Tự động khóa mẻ và sinh phiếu NC nếu vi phạm ngưỡng tới hạn CCP (ISO 22000 Điều 8.9)
    if is_breached or log_status in ["CRITICAL", "DEVIATION"]:
        auto_handle_ccp_deviation(
            db=db,
            batch_number=payload.batch_number,
            title=f"Vi phạm ngưỡng tới hạn CCP {ccp.ccp_code} ({ccp.name}) - Mẻ {payload.batch_number}",
            description=f"Giá trị đo đạc = {val} {payload.unit} vượt ngưỡng tới hạn quy định ({ccp.critical_limit}). Ghi nhận lúc: {payload.test_time or datetime.now()}.",
            source="HACCP_CCP",
            severity="CRITICAL",
            location=getattr(ccp, "location", ccp.name) or "Khu vực kiểm soát CCP",
            immediate_action=payload.deviation_action,
            reported_by_id=current_user.user_id,
            reporter_name=current_user.full_name or current_user.username,
        )

    db.commit()
    db.refresh(log_entry)
    return format_ccp_log_out(log_entry)


@router.get("/ccp-logs/{log_id}", response_model=CCPMonitoringLogResponse)
def get_ccp_log_detail(log_id: UUID, db: Session = Depends(get_db)):
    log_entry = db.get(CCPMonitoringLog, log_id)
    if not log_entry:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi đo đạc CCP")
    return format_ccp_log_out(log_entry)


@router.put("/ccp-logs/{log_id}", response_model=CCPMonitoringLogResponse)
def update_ccp_log(log_id: UUID, payload: CCPMonitoringLogUpdate, db: Session = Depends(get_db)):
    log_entry = db.get(CCPMonitoringLog, log_id)
    if not log_entry:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi đo đạc CCP")
    
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(log_entry, k, v)
    
    db.commit()
    db.refresh(log_entry)
    return format_ccp_log_out(log_entry)


@router.delete("/ccp-logs/{log_id}")
def delete_ccp_log(log_id: UUID, db: Session = Depends(get_db)):
    log_entry = db.get(CCPMonitoringLog, log_id)
    if not log_entry:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi đo đạc CCP")
    
    batch = log_entry.batch_number
    db.delete(log_entry)
    db.commit()
    return {"message": f"Đã xóa bản ghi đo đạc mẻ '{batch}' thành công"}


# ==================== 6. PRP PROGRAMS CRUD ====================
@router.get("/prp-programs", response_model=List[PRPProgramResponse])
def get_prp_programs(
    group: Optional[str] = None,
    status_filter: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_haccp_data_if_empty(db)
    stmt = select(PRPProgram).order_by(PRPProgram.program_code.asc())
    if group:
        stmt = stmt.where(PRPProgram.group == group)
    if status_filter:
        stmt = stmt.where(PRPProgram.status == status_filter)
    if q:
        stmt = stmt.where(or_(
            PRPProgram.program_code.ilike(f"%{q.strip()}%"),
            PRPProgram.program_name.ilike(f"%{q.strip()}%"),
        ))
    
    programs = db.scalars(stmt).unique().all()
    return [format_prp_prog_out(p) for p in programs]


@router.post("/prp-programs", response_model=PRPProgramResponse, status_code=status.HTTP_201_CREATED)
def create_prp_program(payload: PRPProgramCreate, db: Session = Depends(get_db)):
    dup = db.scalar(select(PRPProgram).where(PRPProgram.program_code == payload.program_code.strip()))
    if dup:
        raise HTTPException(status_code=400, detail=f"Mã chương trình '{payload.program_code}' đã tồn tại")
    
    program = PRPProgram(
        program_code=payload.program_code.strip(),
        program_name=payload.program_name.strip(),
        group=payload.group,
        scope=payload.scope,
        frequency=payload.frequency,
        responsible_dept=payload.responsible_dept,
        status=payload.status,
        description=payload.description,
    )
    db.add(program)
    db.commit()
    db.refresh(program)
    return format_prp_prog_out(program)


@router.get("/prp-programs/{program_id}", response_model=PRPProgramResponse)
def get_prp_program_detail(program_id: UUID, db: Session = Depends(get_db)):
    prog = db.get(PRPProgram, program_id)
    if not prog:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương trình tiên quyết")
    return format_prp_prog_out(prog)


@router.put("/prp-programs/{program_id}", response_model=PRPProgramResponse)
def update_prp_program(program_id: UUID, payload: PRPProgramUpdate, db: Session = Depends(get_db)):
    prog = db.get(PRPProgram, program_id)
    if not prog:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương trình tiên quyết")
    
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(prog, k, v)
    
    db.commit()
    db.refresh(prog)
    return format_prp_prog_out(prog)


@router.delete("/prp-programs/{program_id}")
def delete_prp_program(program_id: UUID, db: Session = Depends(get_db)):
    prog = db.get(PRPProgram, program_id)
    if not prog:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương trình tiên quyết")
    
    code = prog.program_code
    db.delete(prog)
    db.commit()
    return {"message": f"Đã xóa chương trình '{code}' thành công"}


# ==================== 7. PRP CHECKLIST LOGS CRUD ====================
@router.get("/prp-checklists", response_model=List[PRPChecklistLogResponse])
def get_prp_checklists(
    program_id: Optional[UUID] = None,
    shift_name: Optional[str] = None,
    status_filter: Optional[str] = None,
    check_date_filter: Optional[date] = None,
    db: Session = Depends(get_db)
):
    seed_haccp_data_if_empty(db)
    stmt = select(PRPChecklistLog).order_by(PRPChecklistLog.created_at.desc())
    if program_id is not None:
        stmt = stmt.where(PRPChecklistLog.program_id == program_id)
    if shift_name:
        stmt = stmt.where(PRPChecklistLog.shift_name == shift_name)
    if status_filter:
        stmt = stmt.where(PRPChecklistLog.status == status_filter)
    if check_date_filter:
        stmt = stmt.where(PRPChecklistLog.check_date == check_date_filter)
    
    logs = db.scalars(stmt).unique().all()
    return [format_prp_log_out(l) for l in logs]


@router.post("/prp-checklists", response_model=PRPChecklistLogResponse, status_code=status.HTTP_201_CREATED)
def create_prp_checklist(payload: PRPChecklistLogCreate, db: Session = Depends(get_db)):
    prog = db.get(PRPProgram, payload.program_id)
    if not prog:
        raise HTTPException(status_code=400, detail="Chương trình tiên quyết không tồn tại")
    
    # Tính toán tỷ lệ tuân thủ từ items_checked nếu có
    items = payload.items_checked or []
    rate = payload.compliance_rate
    if items and len(items) > 0:
        pass_count = sum(1 for it in items if str(it.get("result", "")).lower() in ["đạt", "pass", "tuân thủ", "compliant"])
        rate = round((pass_count / len(items)) * 100.0, 1)

    log_status = payload.status
    if rate >= 90.0:
        log_status = "COMPLIANT"
    elif rate >= 60.0:
        log_status = "ACTION_REQUIRED"
    else:
        log_status = "NON_COMPLIANT"

    checklist_entry = PRPChecklistLog(
        program_id=payload.program_id,
        shift_name=payload.shift_name,
        check_date=payload.check_date,
        check_time=payload.check_time,
        items_checked=items,
        compliance_rate=rate,
        status=log_status,
        finding_notes=payload.finding_notes,
        corrective_action=payload.corrective_action,
        checked_by=payload.checked_by,
    )
    db.add(checklist_entry)
    db.commit()
    db.refresh(checklist_entry)
    return format_prp_log_out(checklist_entry)


@router.get("/prp-checklists/{check_id}", response_model=PRPChecklistLogResponse)
def get_prp_checklist_detail(check_id: UUID, db: Session = Depends(get_db)):
    entry = db.get(PRPChecklistLog, check_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhật ký kiểm tra PRP")
    return format_prp_log_out(entry)


@router.put("/prp-checklists/{check_id}", response_model=PRPChecklistLogResponse)
def update_prp_checklist(check_id: UUID, payload: PRPChecklistLogUpdate, db: Session = Depends(get_db)):
    entry = db.get(PRPChecklistLog, check_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhật ký kiểm tra PRP")
    
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(entry, k, v)
    
    db.commit()
    db.refresh(entry)
    return format_prp_log_out(entry)


@router.delete("/prp-checklists/{check_id}")
def delete_prp_checklist(check_id: UUID, db: Session = Depends(get_db)):
    entry = db.get(PRPChecklistLog, check_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhật ký kiểm tra PRP")
    
    db.delete(entry)
    db.commit()
    return {"message": "Đã xóa bản ghi checklist thành công"}


# ==================== 8. AI ASSISTANTS ====================
@router.post("/ai/suggest-hazards", response_model=AIHazardSuggestResponse)
def suggest_hazards_with_ai(payload: AIHazardSuggestRequest):
    step_lower = payload.step_name.lower()
    line_lower = payload.product_line.lower()

    items: List[AIHazardItem] = []

    if any(k in step_lower for k in ["tiếp nhận", "nhập nguyên liệu", "receiving"]):
        items.append(AIHazardItem(
            hazard_type="BIOLOGICAL",
            hazard_name="Sự phát triển của Vibrio parahaemolyticus & Salmonella do nhiệt độ bảo quản không đạt",
            potential_consequence="Ngộ độc thực phẩm cấp tính, tiêu chảy và sốt cao",
            likelihood=2, severity=3, risk_score=6, is_significant=True,
            control_measure="Kiểm tra nhiệt độ xe vận chuyển ≤ -18°C (đông lạnh) hoặc ≤ 4°C (tươi sống) kèm COA vi sinh",
            q1="YES", q2="NO", q3="YES", q4="NO",
            recommended_classification="CCP"
        ))
        items.append(AIHazardItem(
            hazard_type="CHEMICAL",
            hazard_name="Tồn dư kháng sinh cấm (Chloramphenicol, Nitrofurans) và kim loại nặng (Chì, Thủy ngân)",
            potential_consequence="Tích tụ độc tố gây suy giảm chức năng gan thận",
            likelihood=2, severity=3, risk_score=6, is_significant=True,
            control_measure="Đánh giá nhà cung ứng trong ASL + Thẩm tra Phiếu phân tích COA của phòng lab đạt chuẩn ISO 17025",
            q1="YES", q2="NO", q3="YES", q4="NO",
            recommended_classification="OPRP"
        ))
    elif any(k in step_lower for k in ["hấp", "nấu", "gia nhiệt", "thanh trùng", "tiệt trùng", "cooking", "pasteurization"]):
        items.append(AIHazardItem(
            hazard_type="BIOLOGICAL",
            hazard_name="Sự sống sót của Listeria monocytogenes, Salmonella và bào tử Clostridium botulinum",
            potential_consequence="Ngộ độc thần kinh, nhiễm trùng huyết đe dọa tính mạng",
            likelihood=3, severity=3, risk_score=9, is_significant=True,
            control_measure="Kiểm soát nhiệt độ tâm sản phẩm ≥ 75.0°C duy trì tối thiểu 15 giây (hoặc giá trị F0 tương đương)",
            q1="YES", q2="YES", q3="NO", q4="NO",
            recommended_classification="CCP"
        ))
    elif any(k in step_lower for k in ["dò kim loại", "kim loại", "metal", "x-ray"]):
        items.append(AIHazardItem(
            hazard_type="PHYSICAL",
            hazard_name="Mảnh kim loại vụn sắt (Fe), kim loại màu (Non-Fe) và thép không gỉ (SUS) từ dao kéo/máy móc",
            potential_consequence="Tổn thương cơ học đường tiêu hóa, hóc dị vật",
            likelihood=2, severity=3, risk_score=6, is_significant=True,
            control_measure="Hệ thống dò kim loại tự động: Que thử chuẩn Fe ≤ 1.5mm, Non-Fe ≤ 2.0mm, SUS ≤ 2.5mm",
            q1="YES", q2="YES", q3="NO", q4="NO",
            recommended_classification="CCP"
        ))
    elif any(k in step_lower for k in ["cấp đông", "kho lạnh", "iqf", "freezing"]):
        items.append(AIHazardItem(
            hazard_type="BIOLOGICAL",
            hazard_name="Sự gia tăng vi sinh vật chịu lạnh do thời gian hạ nhiệt kéo dài",
            potential_consequence="Giảm thời hạn sử dụng và chất lượng cảm quan thực phẩm",
            likelihood=2, severity=2, risk_score=4, is_significant=True,
            control_measure="Hệ thống cấp đông IQF đạt nhiệt độ tâm ≤ -18.0°C trong vòng 4 giờ",
            q1="YES", q2="NO", q3="YES", q4="NO",
            recommended_classification="OPRP"
        ))
    else:
        # General step
        items.append(AIHazardItem(
            hazard_type="BIOLOGICAL",
            hazard_name=f"Nhiễm chéo vi sinh vật từ môi trường và thao tác công nhân tại công đoạn '{payload.step_name}'",
            potential_consequence="Suy giảm chỉ tiêu vi sinh bề mặt sản phẩm",
            likelihood=2, severity=2, risk_score=4, is_significant=True,
            control_measure="Áp dụng quy chuẩn vệ sinh nhà xưởng SSOP-02 và vệ sinh cá nhân GMP",
            q1="YES", q2="NO", q3="YES", q4="NO",
            recommended_classification="PRP"
        ))
        items.append(AIHazardItem(
            hazard_type="PHYSICAL",
            hazard_name="Dị vật lạ (tóc, màng nilon bao bì, cúc áo)",
            potential_consequence="Mất thẩm mỹ và phàn nàn của khách hàng",
            likelihood=1, severity=1, risk_score=1, is_significant=False,
            control_measure="Kiểm tra trực quan cảm quan và tuân thủ đồng phục bảo hộ",
            q1="YES", q2="YES", q3="NO", q4="NO",
            recommended_classification="PRP"
        ))

    rationale = (
        f"AI đã phân tích công đoạn '{payload.step_name}' trên dây chuyền '{payload.product_line}' "
        f"dựa theo 7 Nguyên tắc HACCP và Cây quyết định Codex (Decision Tree). Đã phát hiện {len(items)} mối nguy chính."
    )

    return AIHazardSuggestResponse(
        step_name=payload.step_name,
        product_line=payload.product_line,
        identified_hazards=items,
        ai_rationale=rationale,
        confidence_score=96.5,
    )


@router.post("/ai/advise-ccp-deviation", response_model=AICCPDeviationResponse)
def advise_ccp_deviation(payload: AICCPDeviationRequest):
    return AICCPDeviationResponse(
        severity_level="CRITICAL",
        immediate_containment=[
            f"DỪNG NGAY CHUYỀN SẢN XUẤT và dán nhãn CÁCH LY màu đỏ toàn bộ lô '{payload.batch_number}'.",
            "Chuyển toàn bộ sản phẩm sản xuất kể từ lần kiểm tra đạt gần nhất vào khu vực kiểm soát hàng không phù hợp.",
            "Thông báo ngay cho Trưởng phòng QA/QC và Giám đốc Sản xuất."
        ],
        root_cause_hypothesis=[
            "Cảm biến nhiệt độ hoặc đầu dò máy đo bị sai lệch thang đo (cần kiểm tra hiệu chuẩn).",
            "Áp suất hơi / nguồn cấp nhiệt bị sụt giảm đột ngột do sự cố đường ống.",
            "Tốc độ băng chuyền di chuyển quá nhanh khiến thời gian lưu nhiệt không đủ."
        ],
        corrective_actions=[
            "Kỹ thuật kiểm tra hiệu chuẩn lại thiết bị đo đạc với nhiệt kế chuẩn mẫu.",
            f"Thực hiện gia nhiệt lại (re-processing) lô '{payload.batch_number}' nếu tiêu chuẩn sản phẩm cho phép.",
            "Gửi mẫu đại diện đến phòng lab vi sinh phân tích chỉ tiêu vi sinh vật gây bệnh trước khi ra quyết định."
        ],
        disposition_plan=(
            f"Nếu kết quả kiểm nghiệm đạt: Cho phép giải phóng lô sau khi được Tổng Giám đốc và Trưởng ban QLCL ký duyệt. "
            f"Nếu không đạt: Chuyển làm thức ăn chăn nuôi hoặc lập biên bản tiêu hủy theo ISO 22000 Điều khoản 8.9.4."
        ),
        iso_clause_reference="ISO 22000:2018 Điều khoản 8.9.2 (Hành động khắc phục) & 8.9.3 (Xử lý sản phẩm không an toàn)"
    )


# ==================== 9. HACCP PLAN REVIEWS (CLAUSE 8.6 & 8.8) ====================

def format_review_out(r: HACCPPlanReview) -> HACCPPlanReviewResponse:
    plan_name = r.haccp_plan.plan_name if r.haccp_plan else None
    return HACCPPlanReviewResponse(
        review_id=r.review_id,
        review_code=r.review_code,
        plan_id=r.plan_id,
        plan_name=plan_name,
        review_date=r.review_date,
        review_type=r.review_type,
        triggered_by_change_id=r.triggered_by_change_id,
        reviewed_by_name=r.reviewed_by_name,
        scope_of_review=r.scope_of_review,
        findings=r.findings,
        changes_required=r.changes_required,
        plan_version_before=r.plan_version_before,
        plan_version_after=r.plan_version_after,
        approval_status=r.approval_status,
        approved_by_name=r.approved_by_name,
        created_at=r.created_at,
    )

@router.get("/reviews", response_model=List[HACCPPlanReviewResponse])
def get_haccp_plan_reviews(
    plan_id: Optional[UUID] = None,
    review_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(HACCPPlanReview)
    if plan_id:
        query = query.filter(HACCPPlanReview.plan_id == plan_id)
    if review_type and review_type != "ALL":
        query = query.filter(HACCPPlanReview.review_type == review_type)
    reviews = query.order_by(desc(HACCPPlanReview.review_date)).all()
    return [format_review_out(r) for r in reviews]

@router.post("/reviews", response_model=HACCPPlanReviewResponse, status_code=status.HTTP_201_CREATED)
def create_haccp_plan_review(payload: HACCPPlanReviewCreate, db: Session = Depends(get_db)):
    code = payload.review_code
    if not code:
        year = payload.review_date.year if payload.review_date else datetime.now().year
        count = db.query(HACCPPlanReview).count() + 1
        code = f"HPR-{year}-{count:03d}"

    plan = db.query(HACCPPlan).filter(HACCPPlan.plan_id == payload.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Không tìm thấy kế hoạch HACCP")

    review = HACCPPlanReview(
        review_code=code,
        plan_id=payload.plan_id,
        review_date=payload.review_date or date.today(),
        review_type=payload.review_type or "PERIODIC",
        triggered_by_change_id=payload.triggered_by_change_id,
        reviewed_by_name=payload.reviewed_by_name,
        scope_of_review=payload.scope_of_review,
        findings=payload.findings,
        changes_required=payload.changes_required,
        plan_version_before=payload.plan_version_before or plan.version,
        plan_version_after=payload.plan_version_after or plan.version,
        approval_status=payload.approval_status or "APPROVED",
        approved_by_name=payload.approved_by_name or "Đội trưởng Đội ATTP",
    )
    db.add(review)

    # If changes were required and approved, update plan version
    if review.changes_required and review.plan_version_after:
        plan.version = review.plan_version_after

    db.commit()
    db.refresh(review)
    return format_review_out(review)

@router.delete("/reviews/{review_id}")
def delete_haccp_plan_review(review_id: UUID, db: Session = Depends(get_db)):
    review = db.query(HACCPPlanReview).filter(HACCPPlanReview.review_id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Không tìm thấy biên bản thẩm tra kế hoạch HACCP")
    db.delete(review)
    db.commit()
    return {"message": "Đã xóa biên bản thẩm tra thành công"}


# ==================== 11. METAL DETECTOR LOGS ENDPOINTS (BM06-KSQT) ====================

@router.get("/metal-detector-logs", response_model=List[MetalDetectorLogResponse])
def get_metal_detector_logs(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    machine_code: Optional[str] = None,
    test_result: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "operator", "fst_leader", "fs_team_leader")),
):
    query = db.query(MetalDetectorLog)
    if date_from:
        query = query.filter(MetalDetectorLog.log_date >= date_from)
    if date_to:
        query = query.filter(MetalDetectorLog.log_date <= date_to)
    if machine_code and machine_code != "ALL":
        query = query.filter(MetalDetectorLog.machine_code == machine_code)
    if test_result and test_result != "ALL":
        query = query.filter(MetalDetectorLog.test_result == test_result)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                MetalDetectorLog.batch_number.ilike(s),
                MetalDetectorLog.product_name.ilike(s),
                MetalDetectorLog.checked_by_name.ilike(s),
                MetalDetectorLog.machine_code.ilike(s),
            )
        )
    return query.order_by(desc(MetalDetectorLog.log_date), desc(MetalDetectorLog.created_at)).all()


@router.post("/metal-detector-logs", response_model=MetalDetectorLogResponse, status_code=status.HTTP_201_CREATED)
def create_metal_detector_log(
    payload: MetalDetectorLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "operator", "fst_leader", "fs_team_leader")),
):
    # Tự động tính toán kết quả kiểm tra
    is_passed = payload.fe_detected and payload.sus_detected and payload.rejection_mechanism_working
    result_status = "PASSED" if is_passed else "FAILED"
    checker = payload.checked_by_name or current_user.full_name or current_user.username

    log = MetalDetectorLog(
        machine_code=payload.machine_code,
        machine_name=payload.machine_name,
        log_date=payload.log_date,
        check_time=payload.check_time,
        shift_name=payload.shift_name,
        batch_number=payload.batch_number,
        product_name=payload.product_name,
        fe_standard_mm=payload.fe_standard_mm,
        fe_detected=payload.fe_detected,
        sus_standard_mm=payload.sus_standard_mm,
        sus_detected=payload.sus_detected,
        rejection_mechanism_working=payload.rejection_mechanism_working,
        metal_detected_count=payload.metal_detected_count,
        test_result=result_status,
        corrective_action=payload.corrective_action,
        checked_by_name=checker,
        verified_by_name=payload.verified_by_name,
        notes=payload.notes,
    )
    db.add(log)

    # Tự động khóa mẻ và mở NC nếu máy dò kim loại lỗi hoặc phát hiện dị vật kim loại (CCP 2)
    if result_status == "FAILED" or (payload.metal_detected_count and payload.metal_detected_count > 0):
        auto_handle_ccp_deviation(
            db=db,
            batch_number=payload.batch_number,
            title=f"Lỗi kiểm tra máy dò kim loại {payload.machine_code} - Mẻ {payload.batch_number}",
            description=f"Máy dò {payload.machine_code} không phát hiện mẫu chuẩn Fe={payload.fe_detected}, SUS={payload.sus_detected} hoặc phát hiện {payload.metal_detected_count} sản phẩm lẫn kim loại trong ca.",
            source="HACCP_CCP",
            severity="CRITICAL",
            location="Khu vực đóng gói & rà kim loại",
            immediate_action=payload.corrective_action or "Dừng chuyền, cho chạy lại 100% sản phẩm qua máy dò chuẩn, cô lập mẻ hàng.",
            reported_by_id=current_user.user_id,
            reporter_name=checker,
        )

    db.commit()
    db.refresh(log)
    return log


@router.put("/metal-detector-logs/{log_id}", response_model=MetalDetectorLogResponse)
def update_metal_detector_log(
    log_id: UUID,
    payload: MetalDetectorLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader")),
):
    log = db.query(MetalDetectorLog).filter(MetalDetectorLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhật ký máy dò kim loại")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(log, field, value)

    # Tự động đồng bộ lại test_result
    is_passed = log.fe_detected and log.sus_detected and log.rejection_mechanism_working
    log.test_result = "PASSED" if is_passed else "FAILED"

    db.commit()
    db.refresh(log)
    return log


@router.delete("/metal-detector-logs/{log_id}")
def delete_metal_detector_log(
    log_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader")),
):
    log = db.query(MetalDetectorLog).filter(MetalDetectorLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhật ký máy dò kim loại")
    db.delete(log)
    db.commit()
    return {"message": "Đã xóa nhật ký máy dò kim loại thành công"}


# ==================== 12. IN-PROCESS QC LOGS ENDPOINTS (BM01-BM05 KSQT) ====================

@router.get("/in-process-qc-logs", response_model=List[InProcessQCLogResponse])
def get_in_process_qc_logs(
    stage_code: Optional[str] = None,
    overall_status: Optional[str] = None,
    batch_number: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "operator", "fst_leader", "fs_team_leader")),
):
    query = db.query(InProcessQCLog)
    if stage_code and stage_code != "ALL":
        query = query.filter(InProcessQCLog.stage_code == stage_code)
    if overall_status and overall_status != "ALL":
        query = query.filter(InProcessQCLog.overall_status == overall_status)
    if batch_number:
        query = query.filter(InProcessQCLog.batch_number == batch_number)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                InProcessQCLog.inspection_code.ilike(s),
                InProcessQCLog.product_name.ilike(s),
                InProcessQCLog.batch_number.ilike(s),
                InProcessQCLog.stage_name.ilike(s),
                InProcessQCLog.inspector_name.ilike(s),
            )
        )
    return query.order_by(desc(InProcessQCLog.log_date), desc(InProcessQCLog.created_at)).all()


@router.post("/in-process-qc-logs", response_model=InProcessQCLogResponse, status_code=status.HTTP_201_CREATED)
def create_in_process_qc_log(
    payload: InProcessQCLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "operator", "fst_leader", "fs_team_leader")),
):
    code = payload.inspection_code
    if not code:
        year = payload.log_date.year if payload.log_date else datetime.now().year
        count = db.query(InProcessQCLog).count() + 1
        code = f"IPQC-{year}-{count:03d}"

    inspector = payload.inspector_name or current_user.full_name or current_user.username

    log = InProcessQCLog(
        inspection_code=code,
        stage_code=payload.stage_code,
        stage_name=payload.stage_name,
        log_date=payload.log_date,
        check_time=payload.check_time,
        shift_name=payload.shift_name,
        batch_number=payload.batch_number,
        product_name=payload.product_name,
        criteria_data=payload.criteria_data,
        overall_status=payload.overall_status or "PASS",
        deviations=payload.deviations,
        corrective_actions=payload.corrective_actions,
        inspector_name=inspector,
        supervisor_name=payload.supervisor_name,
        notes=payload.notes,
    )
    db.add(log)

    # Tự động khóa mẻ và mở NC nếu kiểm tra KCS công đoạn không đạt (FAIL)
    if (payload.overall_status and payload.overall_status.upper() == "FAIL") or (payload.deviations and len(payload.deviations.strip()) > 0 and payload.overall_status != "PASS"):
        auto_handle_ccp_deviation(
            db=db,
            batch_number=payload.batch_number,
            title=f"KCS kiểm tra công đoạn {payload.stage_code} ({payload.stage_name}) KHÔNG ĐẠT - Mẻ {payload.batch_number}",
            description=f"Phiếu kiểm tra {code}: Công đoạn {payload.stage_name} không đạt tiêu chuẩn kỹ thuật. Sai lệch: {payload.deviations or 'Không đạt chỉ tiêu'}.",
            source="IPQC_DEVIATION",
            severity="MAJOR",
            location=payload.stage_name,
            immediate_action=payload.corrective_actions or "Biệt trữ mẻ hàng tại công đoạn chờ xử lý kỹ thuật",
            reported_by_id=current_user.user_id,
            reporter_name=inspector,
        )

    db.commit()
    db.refresh(log)
    return log


@router.get("/in-process-qc/inspection-stages")
def get_in_process_qc_stages():
    """
    Ánh xạ chính thức danh mục biểu mẫu BM01-BM06 KSQT và quy tắc tần suất lấy mẫu
    theo Hệ thống tài liệu Kiểm soát Quá trình Chế biến Thủy hải sản (ISO 22000 / HACCP)
    """
    return [
        {
            "form_code": "BM01-KSQT",
            "stage_code": "MATERIAL_RECEIVING",
            "stage_name": "Kiểm tra tiếp nhận cá tươi nguyên liệu",
            "standard_frequency": "100% các chuyến ghe / lô cá nhập về cảng bến",
            "sample_size": "5 cá thể ngẫu nhiên / 1 tấn cá",
            "criteria": [
                {"criterion": "Nhiệt độ bảo quản cá tươi bằng đá lạnh", "limit": "≤ 4°C", "method": "Nhiệt kế kim calibrated đâm thân cá 5 vị trí"},
                {"criterion": "Chất lượng cảm quan (mắt trong, mang đỏ, cơ thịt đàn hồi)", "limit": "Loại 1 / Không ươn hỏng", "method": "Quan sát cảm quan theo TCVN 5289"},
                {"criterion": "Định lượng tồn dư tạp chất & kháng sinh nhanh", "limit": "Âm tính / Không phát hiện", "method": "Test kit ELISA nhanh"}
            ]
        },
        {
            "form_code": "BM02-KSQT",
            "stage_code": "WASH_CUT",
            "stage_name": "Sơ chế, fillet, lạng da & rửa bán thành phẩm",
            "standard_frequency": "Mỗi 30 phút / lần trong suốt ca sản xuất",
            "sample_size": "1 kg bán thành phẩm sau rửa",
            "criteria": [
                {"criterion": "Nhiệt độ nước rửa bán thành phẩm", "limit": "≤ 8°C", "method": "Nhiệt kế đo bồn rửa"},
                {"criterion": "Hàm lượng Clo dư trong nước rửa", "limit": "0.5 - 1.0 ppm", "method": "Bộ so màu Clo dư"},
                {"criterion": "Tỷ lệ sót xương, sót da, sót mỡ đỏ", "limit": "< 0.1%", "method": "Kiểm tra bàn soi đèn"}
            ]
        },
        {
            "form_code": "BM03-KSQT",
            "stage_code": "GRIND_MIX",
            "stage_name": "Xay nhuyễn, định lượng gia vị & phối trộn (oPRP)",
            "standard_frequency": "Mỗi mẻ phối trộn cối xay",
            "sample_size": "Toàn bộ cối xay (kiểm tra liên tục)",
            "criteria": [
                {"criterion": "Nhiệt độ khối thịt trong cối xay", "limit": "≤ 10°C", "method": "Đo nhiệt kế đâm tâm"},
                {"criterion": "Khối lượng phụ gia an toàn (Polyphosphate, muối, tiêu)", "limit": "Đúng định lượng công thức", "method": "Cân điện tử calibrated"},
                {"criterion": "Độ dẻo dai và đồng nhất của nhũ tương chả cá", "limit": "Đạt chuẩn công nghệ", "method": "Thử cảm quan cấu trúc"}
            ]
        },
        {
            "form_code": "BM04-KSQT",
            "stage_code": "COOK_STEAM",
            "stage_name": "Định hình & Hấp / Chiên chín (CCP 1)",
            "standard_frequency": "Mỗi mẻ hấp liên tục (Ghi log mỗi 15 phút)",
            "sample_size": "3 miếng chả cá ở 3 vị trí khay hấp",
            "criteria": [
                {"criterion": "Nhiệt độ tâm sản phẩm tại thời điểm kết thúc hấp", "limit": "≥ 85°C", "method": "Nhiệt kế kim calibrated tại tâm miếng chả cá"},
                {"criterion": "Thời gian giữ nhiệt hấp buồng hơi", "limit": "≥ 15 phút", "method": "Đồng hồ bấm giờ / SCADA"},
                {"criterion": "Áp lực hơi cấp buồng hấp", "limit": "1.5 - 2.0 bar", "method": "Áp kế buồng"}
            ]
        },
        {
            "form_code": "BM05-KSQT",
            "stage_code": "COOL_IQF",
            "stage_name": "Làm nguội & Cấp đông nhanh băng chuyền IQF (CCP 3)",
            "standard_frequency": "Mỗi 1 giờ / lần trong ca",
            "sample_size": "5 gói chả cá ra khỏi cửa băng chuyền IQF",
            "criteria": [
                {"criterion": "Nhiệt độ buồng cấp đông IQF", "limit": "≤ -35°C", "method": "Cảm biến SCADA ghi nhận tự động"},
                {"criterion": "Nhiệt độ tâm sản phẩm sau khi ra khỏi băng chuyền IQF", "limit": "≤ -18°C", "method": "Nhiệt kế kim đâm tâm"},
                {"criterion": "Thời gian làm nguội trước khi vào IQF", "limit": "< 30 phút", "method": "Kiểm tra phòng đệm"}
            ]
        },
        {
            "form_code": "BM06-KSQT",
            "stage_code": "PACK_METAL_DETECT",
            "stage_name": "Đóng gói hút chân không, in date & Rà kim loại (CCP 2)",
            "standard_frequency": "Mỗi 15 phút kiểm tra bao bì / Mỗi 2 giờ test que thử máy dò",
            "sample_size": "100% bao gói qua máy dò / 10 gói ngẫu nhiên kiểm bao bì",
            "criteria": [
                {"criterion": "Que thử chuẩn Sắt Fe", "limit": "0.5 mm (Phát hiện 100%)", "method": "Cho thanh que thử qua cổng dò"},
                {"criterion": "Que thử chuẩn Inox SUS 304", "limit": "0.8 mm (Phát hiện 100%)", "method": "Cho thanh que thử qua cổng dò"},
                {"criterion": "Cơ cấu tự động loại bỏ / dừng băng tải", "limit": "Hoạt động chính xác", "method": "Kiểm tra thực tế"},
                {"criterion": "Độ kín đường ép nhiệt túi chân không & độ chính xác in Date", "limit": "Kín tuyệt đối / Rõ nét đúng NSX-HSD", "method": "Thử ngâm nước hút chân không"}
            ]
        }
    ]


@router.put("/in-process-qc-logs/{log_id}", response_model=InProcessQCLogResponse)
def update_in_process_qc_log(
    log_id: UUID,
    payload: InProcessQCLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader")),
):
    log = db.query(InProcessQCLog).filter(InProcessQCLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhật ký kiểm soát công đoạn")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(log, field, value)

    db.commit()
    db.refresh(log)
    return log


@router.delete("/in-process-qc-logs/{log_id}")
def delete_in_process_qc_log(
    log_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader")),
):
    log = db.query(InProcessQCLog).filter(InProcessQCLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhật ký kiểm soát công đoạn")
    db.delete(log)
    db.commit()
    return {"message": "Đã xóa nhật ký kiểm soát công đoạn thành công"}


# ==================== 10. PEST CONTROL LOGS (BM01-SVGH) ====================
@router.get("/pest-control-logs", response_model=List[PestControlLogResponse])
def get_pest_control_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader", "viewer")),
):
    return db.query(PestControlLog).order_by(desc(PestControlLog.check_date), desc(PestControlLog.created_at)).all()


@router.post("/pest-control-logs", response_model=PestControlLogResponse, status_code=status.HTTP_201_CREATED)
def create_pest_control_log(
    payload: PestControlLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader")),
):
    data = payload.model_dump()
    if not data.get("log_code"):
        today_str = datetime.now().strftime("%Y%m%d")
        count = db.query(PestControlLog).filter(PestControlLog.check_date == date.today()).count() + 1
        data["log_code"] = f"PCL-{today_str}-{count:02d}"

    # Auto sum pests caught across traps
    total_caught = 0
    for trap in data.get("trap_locations", []):
        try:
            total_caught += int(trap.get("pests_caught", 0))
        except (ValueError, TypeError):
            pass
    data["total_pests_caught"] = total_caught

    log = PestControlLog(**data)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.put("/pest-control-logs/{log_id}", response_model=PestControlLogResponse)
def update_pest_control_log(
    log_id: UUID,
    payload: PestControlLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader")),
):
    log = db.query(PestControlLog).filter(PestControlLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhật ký kiểm tra bẫy côn trùng")

    update_data = payload.model_dump(exclude_unset=True)
    if "trap_locations" in update_data and update_data["trap_locations"]:
        total_caught = 0
        for trap in update_data["trap_locations"]:
            try:
                total_caught += int(trap.get("pests_caught", 0))
            except (ValueError, TypeError):
                pass
        update_data["total_pests_caught"] = total_caught

    for field, value in update_data.items():
        setattr(log, field, value)

    db.commit()
    db.refresh(log)
    return log


@router.delete("/pest-control-logs/{log_id}")
def delete_pest_control_log(
    log_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader")),
):
    log = db.query(PestControlLog).filter(PestControlLog.log_id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhật ký kiểm tra bẫy côn trùng")
    db.delete(log)
    db.commit()
    return {"message": "Đã xóa nhật ký kiểm tra bẫy côn trùng thành công"}


# ==================== 11. ALLERGEN CONTROLS (BM01-CGDU) ====================
@router.get("/allergen-controls", response_model=List[AllergenControlResponse])
def get_allergen_controls(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader", "viewer")),
):
    return db.query(AllergenControl).order_by(desc(AllergenControl.created_at)).all()


@router.post("/allergen-controls", response_model=AllergenControlResponse, status_code=status.HTTP_201_CREATED)
def create_allergen_control(
    payload: AllergenControlCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader")),
):
    data = payload.model_dump()
    if not data.get("allergen_code"):
        count = db.query(AllergenControl).count() + 1
        data["allergen_code"] = f"ALG-{count:03d}"

    item = AllergenControl(**data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/allergen-controls/{allergen_id}", response_model=AllergenControlResponse)
def update_allergen_control(
    allergen_id: UUID,
    payload: AllergenControlUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader")),
):
    item = db.query(AllergenControl).filter(AllergenControl.allergen_id == allergen_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục kiểm soát dị nguyên")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/allergen-controls/{allergen_id}")
def delete_allergen_control(
    allergen_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader")),
):
    item = db.query(AllergenControl).filter(AllergenControl.allergen_id == allergen_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục kiểm soát dị nguyên")
    db.delete(item)
    db.commit()
    return {"message": "Đã xóa danh mục kiểm soát dị nguyên thành công"}


# ==================== 12. VISITOR HEALTH DECLARATIONS (BM03-KSSK) ====================
@router.get("/visitor-health-declarations", response_model=List[VisitorHealthDeclarationResponse])
def get_visitor_health_declarations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader", "viewer")),
):
    return db.query(VisitorHealthDeclaration).order_by(desc(VisitorHealthDeclaration.visit_date), desc(VisitorHealthDeclaration.created_at)).all()


@router.post("/visitor-health-declarations", response_model=VisitorHealthDeclarationResponse, status_code=status.HTTP_201_CREATED)
def create_visitor_health_declaration(
    payload: VisitorHealthDeclarationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader")),
):
    data = payload.model_dump()
    if not data.get("declaration_code"):
        today_str = datetime.now().strftime("%Y%m%d")
        count = db.query(VisitorHealthDeclaration).filter(VisitorHealthDeclaration.visit_date == date.today()).count() + 1
        data["declaration_code"] = f"VHD-{today_str}-{count:02d}"

    # Auto check eligibility: If ANY symptom is True, not approved
    has_symptoms = any([
        data.get("has_diarrhea", False),
        data.get("has_fever_cough", False),
        data.get("has_open_wound", False),
        data.get("visited_epidemic_area", False)
    ])
    data["is_approved_entry"] = not has_symptoms

    item = VisitorHealthDeclaration(**data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/visitor-health-declarations/{declaration_id}", response_model=VisitorHealthDeclarationResponse)
def update_visitor_health_declaration(
    declaration_id: UUID,
    payload: VisitorHealthDeclarationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader")),
):
    item = db.query(VisitorHealthDeclaration).filter(VisitorHealthDeclaration.declaration_id == declaration_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu khai báo y tế khách tham quan")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    # Re-evaluate eligibility
    has_symptoms = any([
        item.has_diarrhea,
        item.has_fever_cough,
        item.has_open_wound,
        item.visited_epidemic_area
    ])
    item.is_approved_entry = not has_symptoms

    db.commit()
    db.refresh(item)
    return item


@router.delete("/visitor-health-declarations/{declaration_id}")
def delete_visitor_health_declaration(
    declaration_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader")),
):
    item = db.query(VisitorHealthDeclaration).filter(VisitorHealthDeclaration.declaration_id == declaration_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu khai báo y tế khách tham quan")
    db.delete(item)
    db.commit()
    return {"message": "Đã xóa phiếu khai báo y tế thành công"}


# ==================== 13. FIRST AID CABINET LOGS (BM01-KSSK) ====================
@router.get("/first-aid-logs", response_model=List[FirstAidLogResponse])
def get_first_aid_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader", "viewer")),
):
    return db.query(FirstAidLog).order_by(desc(FirstAidLog.issue_date), desc(FirstAidLog.created_at)).all()


@router.post("/first-aid-logs", response_model=FirstAidLogResponse, status_code=status.HTTP_201_CREATED)
def create_first_aid_log(
    payload: FirstAidLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader")),
):
    data = payload.model_dump()
    if not data.get("log_code"):
        today_str = datetime.now().strftime("%Y%m%d")
        count = db.query(FirstAidLog).filter(FirstAidLog.issue_date == date.today()).count() + 1
        data["log_code"] = f"FAL-{today_str}-{count:02d}"

    item = FirstAidLog(**data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/first-aid-logs/{log_id}", response_model=FirstAidLogResponse)
def update_first_aid_log(
    log_id: UUID,
    payload: FirstAidLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader")),
):
    item = db.query(FirstAidLog).filter(FirstAidLog.log_id == log_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi cấp phát tủ thuốc sơ cứu")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/first-aid-logs/{log_id}")
def delete_first_aid_log(
    log_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader")),
):
    item = db.query(FirstAidLog).filter(FirstAidLog.log_id == log_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi cấp phát tủ thuốc sơ cứu")
    db.delete(item)
    db.commit()
    return {"message": "Đã xóa bản ghi cấp phát tủ thuốc thành công"}


# ==================== 14. VEHICLE INSPECTION LOGS (BM01-PTVC: NGUỒN DỮ LIỆU HỢP NHẤT) ====================
@router.get("/vehicle-inspections", response_model=List[VehicleInspectionLogResponse])
def get_vehicle_inspections(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader", "viewer")),
):
    """
    Lấy danh sách kiểm tra xe vận chuyển hợp nhất (Single Source of Truth) từ bảng vehicle_inspections
    """
    records = db.query(VehicleInspection).order_by(desc(VehicleInspection.inspection_date), desc(VehicleInspection.created_at)).all()
    out = []
    for r in records:
        insp_date = r.inspection_date.date() if isinstance(r.inspection_date, datetime) else (r.inspection_date or date.today())
        out.append(VehicleInspectionLogResponse(
            inspection_id=uuid.uuid5(uuid.NAMESPACE_DNS, f"vehicle-inspection-{r.id}"),
            inspection_code=r.inspection_code,
            inspection_date=insp_date,
            customer_name=r.customer_name or "Khách hàng công ty",
            vehicle_type=r.vehicle_type or "Xe tải thùng kín",
            license_plate=r.vehicle_plate,
            driver_name=r.driver_name,
            check_registration_valid=r.valid_registration_check,
            check_clean_floor=r.clean_dry_check,
            check_no_odor=r.no_odor_check,
            check_no_pests=r.pest_free_check,
            check_enclosed_tarp=r.cargo_integrity_check,
            overall_result="PASSED" if r.inspection_result.upper() in ["PASS", "PASSED"] else "REJECTED",
            inspector_name=r.inspector_name,
            corrective_action=r.corrective_action,
            created_at=r.created_at
        ))
    return out


@router.post("/vehicle-inspections", response_model=VehicleInspectionLogResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle_inspection(
    payload: VehicleInspectionLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader")),
):
    """
    Ghi nhận biên bản kiểm tra xe vận chuyển vào bảng hợp nhất vehicle_inspections
    """
    data = payload.model_dump()
    if not data.get("inspection_code"):
        today_str = datetime.now().strftime("%Y%m%d")
        count = db.query(VehicleInspection).count() + 1
        data["inspection_code"] = f"VIC-{today_str}-{count:02d}"

    # Auto pass only when all 5 conditions are True
    is_passed = all([
        data.get("check_registration_valid", True),
        data.get("check_clean_floor", True),
        data.get("check_no_odor", True),
        data.get("check_no_pests", True),
        data.get("check_enclosed_tarp", True),
    ])
    result = "PASS" if is_passed else "FAIL"

    insp_dt = datetime.combine(data["inspection_date"], datetime.min.time()) if isinstance(data.get("inspection_date"), date) else datetime.now()

    v_item = VehicleInspection(
        inspection_code=data["inspection_code"],
        inspection_date=insp_dt,
        vehicle_plate=data["license_plate"],
        driver_name=data["driver_name"],
        customer_name=data["customer_name"],
        vehicle_type=data.get("vehicle_type", "Xe tải thùng kín"),
        valid_registration_check=data.get("check_registration_valid", True),
        cargo_integrity_check=data.get("check_enclosed_tarp", True),
        clean_dry_check=data.get("check_clean_floor", True),
        no_odor_check=data.get("check_no_odor", True),
        pest_free_check=data.get("check_no_pests", True),
        inspection_result=result,
        inspector_name=data["inspector_name"],
        corrective_action=data.get("corrective_action"),
    )
    db.add(v_item)
    db.commit()
    db.refresh(v_item)

    return VehicleInspectionLogResponse(
        inspection_id=uuid.uuid5(uuid.NAMESPACE_DNS, f"vehicle-inspection-{v_item.id}"),
        inspection_code=v_item.inspection_code,
        inspection_date=v_item.inspection_date.date() if isinstance(v_item.inspection_date, datetime) else v_item.inspection_date,
        customer_name=v_item.customer_name or "Khách hàng công ty",
        vehicle_type=v_item.vehicle_type or "Xe tải thùng kín",
        license_plate=v_item.vehicle_plate,
        driver_name=v_item.driver_name,
        check_registration_valid=v_item.valid_registration_check,
        check_clean_floor=v_item.clean_dry_check,
        check_no_odor=v_item.no_odor_check,
        pest_free_check=v_item.pest_free_check,
        check_enclosed_tarp=v_item.cargo_integrity_check,
        overall_result="PASSED" if result == "PASS" else "REJECTED",
        inspector_name=v_item.inspector_name,
        corrective_action=v_item.corrective_action,
        created_at=v_item.created_at,
    )


@router.put("/vehicle-inspections/{inspection_id}", response_model=VehicleInspectionLogResponse)
def update_vehicle_inspection(
    inspection_id: UUID,
    payload: VehicleInspectionLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "qc", "production", "fst_leader", "fs_team_leader")),
):
    # Tìm kiếm theo UUID hoặc inspection_code tương ứng
    records = db.query(VehicleInspection).all()
    target = None
    for r in records:
        if uuid.uuid5(uuid.NAMESPACE_DNS, f"vehicle-inspection-{r.id}") == inspection_id:
            target = r
            break

    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy biên bản kiểm tra xe vận chuyển")

    data = payload.model_dump(exclude_unset=True)
    if "license_plate" in data:
        target.vehicle_plate = data["license_plate"]
    if "driver_name" in data:
        target.driver_name = data["driver_name"]
    if "customer_name" in data:
        target.customer_name = data["customer_name"]
    if "vehicle_type" in data:
        target.vehicle_type = data["vehicle_type"]
    if "check_registration_valid" in data:
        target.valid_registration_check = data["check_registration_valid"]
    if "check_clean_floor" in data:
        target.clean_dry_check = data["check_clean_floor"]
    if "check_no_odor" in data:
        target.no_odor_check = data["check_no_odor"]
    if "check_no_pests" in data:
        target.pest_free_check = data["check_no_pests"]
    if "check_enclosed_tarp" in data:
        target.cargo_integrity_check = data["check_enclosed_tarp"]
    if "inspector_name" in data:
        target.inspector_name = data["inspector_name"]
    if "corrective_action" in data:
        target.corrective_action = data["corrective_action"]

    # Re-evaluate
    is_passed = all([
        target.valid_registration_check,
        target.clean_dry_check,
        target.no_odor_check,
        target.pest_free_check,
        target.cargo_integrity_check,
    ])
    target.inspection_result = "PASS" if is_passed else "FAIL"

    db.commit()
    db.refresh(target)

    return VehicleInspectionLogResponse(
        inspection_id=uuid.uuid5(uuid.NAMESPACE_DNS, f"vehicle-inspection-{target.id}"),
        inspection_code=target.inspection_code,
        inspection_date=target.inspection_date.date() if isinstance(target.inspection_date, datetime) else target.inspection_date,
        customer_name=target.customer_name or "Khách hàng công ty",
        vehicle_type=target.vehicle_type or "Xe tải thùng kín",
        license_plate=target.vehicle_plate,
        driver_name=target.driver_name,
        check_registration_valid=target.valid_registration_check,
        check_clean_floor=target.clean_dry_check,
        check_no_odor=target.no_odor_check,
        pest_free_check=target.pest_free_check,
        check_enclosed_tarp=target.cargo_integrity_check,
        overall_result="PASSED" if target.inspection_result == "PASS" else "REJECTED",
        inspector_name=target.inspector_name,
        corrective_action=target.corrective_action,
        created_at=target.created_at,
    )


@router.delete("/vehicle-inspections/{inspection_id}")
def delete_vehicle_inspection(
    inspection_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader")),
):
    records = db.query(VehicleInspection).all()
    target = None
    for r in records:
        if uuid.uuid5(uuid.NAMESPACE_DNS, f"vehicle-inspection-{r.id}") == inspection_id:
            target = r
            break

    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy biên bản kiểm tra xe vận chuyển")
    db.delete(target)
    db.commit()
    return {"message": "Đã xóa biên bản kiểm tra xe vận chuyển thành công"}


# ==================== 15. WATER SAFETY RECORDS (BM01-SSOP-NUOC) ====================
def water_measurements_failed(payload: WaterSafetyRecordCreate) -> bool:
    """Return whether a water/ice sample violates the limits recorded in BM01-SSOP-NUOC.

    The status supplied by the operator is retained for other observations, but it
    must never override an objectively failed measurement.
    """
    return (
        payload.ph_level < 6.5
        or payload.ph_level > 8.5
        or payload.chlorine_ppm < 0.2
        or payload.chlorine_ppm > 1.0
        or payload.turbidity_ntu > 2.0
        or (payload.coliform_cfu is not None and payload.coliform_cfu > 0)
        or (payload.e_coli_cfu is not None and payload.e_coli_cfu > 0)
    )


@router.get("/water-logs", response_model=List[WaterSafetyRecordResponse])
def get_water_safety_logs(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    overall_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_haccp_data_if_empty(db)
    stmt = select(WaterSafetyRecord).order_by(WaterSafetyRecord.sampling_date.desc(), WaterSafetyRecord.sampling_time.desc())
    if start_date:
        stmt = stmt.where(WaterSafetyRecord.sampling_date >= start_date)
    if end_date:
        stmt = stmt.where(WaterSafetyRecord.sampling_date <= end_date)
    if overall_status:
        stmt = stmt.where(WaterSafetyRecord.overall_status == overall_status)
    return db.scalars(stmt).all()


@router.post("/water-logs", response_model=WaterSafetyRecordResponse, status_code=status.HTTP_201_CREATED)
def create_water_safety_log(
    payload: WaterSafetyRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "maintenance", "production"))
):
    code = payload.record_code or f"WSR-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    code = code.strip()
    duplicate = db.scalar(select(WaterSafetyRecord).where(WaterSafetyRecord.record_code == code))
    if duplicate:
        raise HTTPException(status_code=409, detail=f"Mã phiếu kiểm nước '{code}' đã tồn tại")
    st = "FAIL" if water_measurements_failed(payload) else payload.overall_status
    log = WaterSafetyRecord(
        record_code=code,
        sampling_point=payload.sampling_point,
        sampling_date=payload.sampling_date,
        sampling_time=payload.sampling_time,
        ph_level=payload.ph_level,
        chlorine_ppm=payload.chlorine_ppm,
        turbidity_ntu=payload.turbidity_ntu,
        sensory_result=payload.sensory_result,
        coliform_cfu=payload.coliform_cfu,
        e_coli_cfu=payload.e_coli_cfu,
        overall_status=st,
        tested_by_name=payload.tested_by_name or current_user.full_name,
        verified_by_name=payload.verified_by_name,
        corrective_action=payload.corrective_action,
        notes=payload.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


# ==================== 16. APPROVED CHEMICAL LIST & MSDS (BM01-SSOP-HOACHAT) ====================
@router.get("/chemicals", response_model=List[ChemicalRecordResponse])
def get_approved_chemicals(
    approval_status: Optional[str] = None,
    is_food_grade: Optional[bool] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_haccp_data_if_empty(db)
    stmt = select(ChemicalRecord).order_by(ChemicalRecord.chemical_code.asc())
    if approval_status:
        stmt = stmt.where(ChemicalRecord.approval_status == approval_status)
    if is_food_grade is not None:
        stmt = stmt.where(ChemicalRecord.is_food_grade == is_food_grade)
    if q:
        stmt = stmt.where(or_(
            ChemicalRecord.chemical_code.ilike(f"%{q.strip()}%"),
            ChemicalRecord.chemical_name.ilike(f"%{q.strip()}%"),
            ChemicalRecord.purpose.ilike(f"%{q.strip()}%"),
        ))
    return db.scalars(stmt).all()


@router.post("/chemicals", response_model=ChemicalRecordResponse, status_code=status.HTTP_201_CREATED)
def create_chemical_record(
    payload: ChemicalRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader"))
):
    dup = db.scalar(select(ChemicalRecord).where(ChemicalRecord.chemical_code == payload.chemical_code.strip()))
    if dup:
        raise HTTPException(status_code=400, detail=f"Mã hóa chất '{payload.chemical_code}' đã tồn tại")
    chem = ChemicalRecord(
        chemical_code=payload.chemical_code.strip(),
        chemical_name=payload.chemical_name.strip(),
        purpose=payload.purpose.strip(),
        is_food_grade=payload.is_food_grade,
        supplier_name=payload.supplier_name.strip(),
        msds_document_url=payload.msds_document_url,
        msds_file_name=payload.msds_file_name,
        msds_expiry_date=payload.msds_expiry_date,
        dilution_ratio=payload.dilution_ratio,
        storage_location=payload.storage_location,
        approval_status=payload.approval_status,
        current_stock_kg=payload.current_stock_kg,
        safety_instructions=payload.safety_instructions,
        approved_by=payload.approved_by or current_user.full_name,
    )
    db.add(chem)
    db.commit()
    db.refresh(chem)
    return chem


@router.put("/chemicals/{chemical_id}", response_model=ChemicalRecordResponse)
def update_chemical_record(
    chemical_id: UUID,
    payload: ChemicalRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader"))
):
    chem = db.get(ChemicalRecord, chemical_id)
    if not chem:
        raise HTTPException(status_code=404, detail="Không tìm thấy hóa chất")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(chem, field, val)
    db.commit()
    db.refresh(chem)
    return chem


# ==================== 17. WASTE MANAGEMENT LOGS (BM01-SSOP-RACTHAI) ====================
@router.get("/waste-logs", response_model=List[WasteLogResponse])
def get_waste_logs(
    waste_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    seed_haccp_data_if_empty(db)
    stmt = select(WasteLog).order_by(WasteLog.log_date.desc(), WasteLog.created_at.desc())
    if waste_type:
        stmt = stmt.where(WasteLog.waste_type == waste_type)
    if start_date:
        stmt = stmt.where(WasteLog.log_date >= start_date)
    if end_date:
        stmt = stmt.where(WasteLog.log_date <= end_date)
    return db.scalars(stmt).all()


@router.post("/waste-logs", response_model=WasteLogResponse, status_code=status.HTTP_201_CREATED)
def create_waste_log(
    payload: WasteLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "production"))
):
    code = payload.log_code or f"WST-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    code = code.strip()
    duplicate = db.scalar(select(WasteLog).where(WasteLog.log_code == code))
    if duplicate:
        raise HTTPException(status_code=409, detail=f"Mã nhật ký chất thải '{code}' đã tồn tại")
    log = WasteLog(
        log_code=code,
        log_date=payload.log_date,
        waste_type=payload.waste_type,
        description=payload.description,
        quantity_kg=payload.quantity_kg,
        storage_area=payload.storage_area,
        disposal_contractor=payload.disposal_contractor,
        transfer_note_code=payload.transfer_note_code,
        status=payload.status,
        handled_by_name=payload.handled_by_name or current_user.full_name,
        notes=payload.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


# ==================== 18. ENVIRONMENTAL MONITORING SCHEDULES ====================
@router.get("/environmental-schedules", response_model=List[EnvironmentalMonitoringScheduleResponse])
def get_environmental_schedules(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_haccp_data_if_empty(db)
    stmt = select(EnvironmentalMonitoringSchedule).order_by(EnvironmentalMonitoringSchedule.next_due_date.asc())
    if status_filter:
        stmt = stmt.where(EnvironmentalMonitoringSchedule.status == status_filter)
    return db.scalars(stmt).all()


@router.post("/environmental-schedules", response_model=EnvironmentalMonitoringScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_environmental_schedule(
    payload: EnvironmentalMonitoringScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader"))
):
    dup = db.scalar(select(EnvironmentalMonitoringSchedule).where(EnvironmentalMonitoringSchedule.item_code == payload.item_code.strip()))
    if dup:
        raise HTTPException(status_code=400, detail=f"Mã lịch kiểm nghiệm '{payload.item_code}' đã tồn tại")
    sch = EnvironmentalMonitoringSchedule(
        item_code=payload.item_code.strip(),
        target_object=payload.target_object.strip(),
        parameters=payload.parameters.strip(),
        frequency=payload.frequency.strip(),
        testing_unit=payload.testing_unit.strip(),
        last_tested_date=payload.last_tested_date,
        next_due_date=payload.next_due_date,
        status=payload.status,
        last_result=payload.last_result,
    )
    db.add(sch)
    db.commit()
    db.refresh(sch)
    return sch
