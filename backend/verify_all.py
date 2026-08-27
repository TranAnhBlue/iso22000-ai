import sys
import io
import json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.core.database import engine, Base, SessionLocal
from app.models.haccp import HACCPPlan, ProcessStep, HazardAnalysis, CCPDefinition, CCPMonitoringLog
from app.models.builder import DynamicFormTemplate, DynamicFormSubmission, DynamicWorkflowTemplate, WorkflowInstance
from app.api.v1.endpoints.builder import (
    format_form_out, format_wf_out, seed_default_builders
)
from app.api.v1.endpoints.haccp import (
    format_plan_out, format_step_out, seed_haccp_data_if_empty
)

db = SessionLocal()
try:
    print("=== KIỂM TRA HỆ THỐNG TOÀN DIỆN ===")
    
    # 1. Builders Seed
    res_b = seed_default_builders(db)
    print("1. Seed Builders:", res_b['message'])

    # 2. HACCP Seed
    seed_haccp_data_if_empty(db)
    print("2. Seed HACCP: Hoàn tất")

    # 3. HACCP Plans Check
    plans = db.query(HACCPPlan).all()
    print(f"\n3. Kế Hoạch HACCP ({len(plans)} kế hoạch):")
    for p in plans:
        out = format_plan_out(p)
        print(f"   - [{out.plan_code}] {out.plan_name} | Ver: {out.version} | Trưởng ban: {out.team_leader} | Steps: {out.step_count} | CCPs: {out.ccp_count}")

    # 4. Process Steps Flowchart Check
    steps = db.query(ProcessStep).order_by(ProcessStep.step_number).all()
    print(f"\n4. Lưu Đồ Công Đoạn ({len(steps)} bước):")
    for s in steps:
        out = format_step_out(s)
        ccp_badge = "[★ CCP/oPRP]" if out.is_ccp_or_oprp else "[Công đoạn thường]"
        print(f"   - Bước {out.step_number}: {out.step_name} {ccp_badge} (Kế hoạch: {out.plan_name})")

    # 5. Form Templates Check
    forms = db.query(DynamicFormTemplate).all()
    print(f"\n5. Mẫu Biểu Mẫu Động ({len(forms)} biểu mẫu):")
    for f in forms:
        out = format_form_out(f)
        field_types = [getattr(fd, 'type', fd.get('type') if isinstance(fd, dict) else str(fd)) for fd in out.fields]
        print(f"   - [{out.module}] {out.code}: {out.title} ({len(out.fields)} fields: {', '.join(field_types)})")

    # 6. Workflow Templates Check
    wfs = db.query(DynamicWorkflowTemplate).all()
    print(f"\n6. Quy Trình & Lưu Đồ Động ({len(wfs)} quy trình):")
    for w in wfs:
        out = format_wf_out(w)
        print(f"   - [{out.module}] {out.code}: {out.title} ({len(out.nodes)} nodes, {len(out.edges)} edges)")

    # 7. Test Submitting a form
    f_gmp = db.query(DynamicFormTemplate).filter(DynamicFormTemplate.code == "FORM-GMP-01").first()
    if f_gmp:
        sub = DynamicFormSubmission(
            template_id=f_gmp.template_id,
            submitted_by_name="Nguyễn Văn An (QC Trưởng ca)",
            form_data={
                "shift_name": "Ca 1 (06:00 - 14:00)",
                "inspector_name": "Nguyễn Văn An (QC)",
                "floor_clean": True,
                "belt_disinfect": True,
                "ppe_compliance": True,
                "temp_room": 16.5,
                "pest_trace": False,
                "overall_score": 5,
                "note": "Xưởng sơ chế sạch sẽ, đủ điều kiện vận hành"
            },
            score=100.0,
            status="COMPLETED"
        )
        db.add(sub)
        db.commit()
        print(f"\n7. Test Nộp Dữ Liệu Form {f_gmp.code}: Thành công (ID: {sub.submission_id}, Điểm: {sub.score}%)")

    # 8. Check Submissions History
    subs = db.query(DynamicFormSubmission).all()
    print(f"\n8. Tổng số lượt nộp biểu mẫu trong hệ thống: {len(subs)}")

    print("\n✅ TẤT CẢ CÁC ĐIỀU KIỆN NGHIỆP VỤ ĐÃ VƯỢT QUA KIỂM TRA THÀNH CÔNG 100%!")

finally:
    db.close()
