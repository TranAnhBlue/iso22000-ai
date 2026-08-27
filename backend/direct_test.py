import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.core.database import engine, Base, SessionLocal
from sqlalchemy import text
import app.models
from app.models.haccp import HACCPPlan, ProcessStep
from app.models.builder import DynamicFormTemplate, DynamicWorkflowTemplate
from app.api.v1.endpoints.builder import seed_default_builders, format_form_out, format_wf_out
from app.api.v1.endpoints.haccp import seed_haccp_data_if_empty, format_plan_out, format_step_out

print("1. Running DDL Migrations...")
with engine.connect() as conn:
    conn.execute(text("CREATE TABLE IF NOT EXISTS haccp_plans (plan_id UUID PRIMARY KEY, plan_code VARCHAR(50) UNIQUE NOT NULL, plan_name VARCHAR(255) NOT NULL, product_line VARCHAR(100) NOT NULL DEFAULT 'Chế biến Thủy hải sản', version VARCHAR(20) NOT NULL DEFAULT '1.0', team_leader VARCHAR(100) NOT NULL DEFAULT 'Trưởng ban HACCP / QA', approved_by VARCHAR(100) DEFAULT 'Giám đốc Nhà máy', effective_date DATE NOT NULL DEFAULT CURRENT_DATE, scope_description TEXT, status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);"))
    conn.execute(text("ALTER TABLE process_steps ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES haccp_plans(plan_id) ON DELETE SET NULL;"))
    conn.commit()

print("2. Creating any remaining tables via Base.metadata...")
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    print("\n=== 3. SEED BUILDERS ===")
    res_b = seed_default_builders(db)
    print("Seed Builders Result:", res_b)

    # Let's ensure default HACCP Plan exists
    p = db.query(HACCPPlan).first()
    if not p:
        from datetime import date
        p = HACCPPlan(
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
        db.add(p)
        db.commit()
        db.refresh(p)
        print("Created default HACCP Plan:", p.plan_code)

    # Link any unlinked process steps to this plan
    unlinked_steps = db.query(ProcessStep).filter(ProcessStep.plan_id == None).all()
    if unlinked_steps:
        for s in unlinked_steps:
            s.plan_id = p.plan_id
        db.commit()
        print(f"Linked {len(unlinked_steps)} steps to plan {p.plan_code}")

    print("\n=== 4. QUERY FORMS ===")
    forms = db.query(DynamicFormTemplate).all()
    print(f"Found {len(forms)} form templates:")
    for f in forms:
        out = format_form_out(f)
        print(f"  - [{out.module}] {out.code}: {out.title} ({len(out.fields)} fields)")

    print("\n=== 5. QUERY WORKFLOWS ===")
    workflows = db.query(DynamicWorkflowTemplate).all()
    print(f"Found {len(workflows)} workflow templates:")
    for w in workflows:
        out = format_wf_out(w)
        print(f"  - [{out.module}] {out.code}: {out.title} ({len(out.nodes)} nodes, {len(out.edges)} edges)")

    print("\n=== 6. QUERY HACCP PLANS ===")
    plans = db.query(HACCPPlan).all()
    print(f"Found {len(plans)} HACCP plans:")
    for p in plans:
        out = format_plan_out(p)
        print(f"  - {out.plan_code}: {out.plan_name} (Ver {out.version}, Steps: {out.step_count}, CCPs: {out.ccp_count})")

    print("\n=== 7. QUERY PROCESS STEPS ===")
    steps = db.query(ProcessStep).order_by(ProcessStep.step_number).all()
    print(f"Found {len(steps)} Process steps:")
    for s in steps:
        out = format_step_out(s)
        print(f"  - Step {out.step_number}: {out.step_name} [CCP: {out.is_ccp_or_oprp}] -> Plan: {out.plan_name}")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
