import uuid
from typing import List, Optional, Any, Dict
from datetime import datetime, date, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func, and_, or_

from app.core.database import get_db
from app.models.haccp import (
    HACCPPlan,
    ProcessStep,
    HazardAnalysis,
    CCPDefinition,
    CCPMonitoringLog,
    PRPProgram,
    PRPChecklistLog,
)
from app.models.user import User
from app.schemas.haccp import (
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
)

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


# ==================== AUTO SEEDING FUNCTION ====================
def seed_haccp_data_if_empty(db: Session):
    has_steps = db.scalar(select(func.count(ProcessStep.step_id)))
    if has_steps and has_steps > 0:
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
    return [format_step_out(s) for s in steps]


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
    
    name = step.step_name
    db.delete(step)
    db.commit()
    return {"message": f"Đã xóa công đoạn '{name}' thành công"}


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
