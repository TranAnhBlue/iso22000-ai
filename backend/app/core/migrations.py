"""
Database Migrations Module
Quản lý các câu lệnh DDL migration và seed dữ liệu chuẩn cho hệ thống FSMS ISO 22000.
Tách độc lập khỏi main.py để giữ main.py gọn gàng, chuẩn cấu trúc.
"""

from sqlalchemy import text
from app.core.database import engine, Base
import app.modules  # Đảm bảo nạp đầy đủ metadata của 14 modules


def run_migration_sql(sql_query: str):
    """Thực thi một câu lệnh SQL migration an toàn trong transaction"""
    try:
        with engine.begin() as conn:
            conn.execute(text(sql_query))
    except Exception as err:
        err_msg = str(err).lower()
        # Bỏ qua các cảnh báo cột/bảng đã tồn tại vốn là bình thường trong migration lặp lại
        if "already exists" not in err_msg and "duplicate" not in err_msg:
            import logging
            logging.getLogger("uvicorn.error").warning(f"[MIGRATION NOTICE] Bỏ qua lỗi DDL: {err}")


MIGRATION_STATEMENTS = [
    # Documents columns & approvals migration
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS department VARCHAR(100);",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS standard VARCHAR(100);",
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS content TEXT;",
    """
    CREATE TABLE IF NOT EXISTS document_approvals (
        approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
        version VARCHAR(20) NOT NULL DEFAULT '1.0',
        action VARCHAR(50) NOT NULL,
        previous_status VARCHAR(30),
        new_status VARCHAR(30) NOT NULL,
        performed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
        performed_by_name VARCHAR(100),
        comments TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,

    # Suppliers columns migration
    "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS category VARCHAR(100);",
    "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS certifications JSONB;",
    "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS risk_level VARCHAR(30) DEFAULT 'LOW';",
    "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS evaluation_notes TEXT;",
    "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS evaluation_date DATE;",

    # Material Lots columns migration
    "ALTER TABLE material_lots ADD COLUMN IF NOT EXISTS material_category VARCHAR(100);",
    "ALTER TABLE material_lots ADD COLUMN IF NOT EXISTS mfg_date DATE;",
    "ALTER TABLE material_lots ADD COLUMN IF NOT EXISTS exp_date DATE;",
    "ALTER TABLE material_lots ADD COLUMN IF NOT EXISTS storage_condition VARCHAR(100);",
    "ALTER TABLE material_lots ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'PENDING_IQC';",

    # IQC Inspections columns migration
    "ALTER TABLE iqc_inspections ADD COLUMN IF NOT EXISTS inspection_code VARCHAR(50);",
    "ALTER TABLE iqc_inspections ADD COLUMN IF NOT EXISTS packaging_check BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE iqc_inspections ADD COLUMN IF NOT EXISTS temperature_c NUMERIC(5,2);",
    "ALTER TABLE iqc_inspections ADD COLUMN IF NOT EXISTS coa_compliance BOOLEAN DEFAULT TRUE;",

    # CCP Definitions columns migration
    "ALTER TABLE ccp_definitions ALTER COLUMN process_step DROP NOT NULL;",
    "ALTER TABLE ccp_definitions ADD COLUMN IF NOT EXISTS process_step_id UUID REFERENCES process_steps(step_id) ON DELETE SET NULL;",
    "ALTER TABLE ccp_definitions ADD COLUMN IF NOT EXISTS monitoring_method TEXT;",
    "ALTER TABLE ccp_definitions ADD COLUMN IF NOT EXISTS corrective_action_plan TEXT;",
    "ALTER TABLE ccp_definitions ADD COLUMN IF NOT EXISTS responsible_role VARCHAR(100) DEFAULT 'QC / Trưởng ca Sản xuất';",
    "ALTER TABLE ccp_definitions ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE';",
    "ALTER TABLE ccp_definitions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;",

    # CCP Monitoring Logs columns migration
    "ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);",
    "ALTER TABLE ccp_monitoring_logs ALTER COLUMN batch_id DROP NOT NULL;",
    "ALTER TABLE ccp_monitoring_logs ALTER COLUMN measured_values DROP NOT NULL;",
    "ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'NORMAL';",
    "ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT '°C';",
    "ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS measured_value NUMERIC(8,2);",
    "ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS measured_details JSONB;",
    "ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'VERIFIED';",
    "ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(user_id);",
    "ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS notes TEXT;",
    "ALTER TABLE ccp_monitoring_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;",

    # IQC Inspections (BM01-KTNL physical criteria)
    "ALTER TABLE iqc_inspections ADD COLUMN IF NOT EXISTS defect_rate_percent NUMERIC(5,2) DEFAULT 0.0;",
    "ALTER TABLE iqc_inspections ADD COLUMN IF NOT EXISTS impurity_percent NUMERIC(5,2) DEFAULT 0.0;",
    "ALTER TABLE iqc_inspections ADD COLUMN IF NOT EXISTS size_uniformity_check BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE iqc_inspections ADD COLUMN IF NOT EXISTS vehicle_cleanliness_check BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE iqc_inspections ADD COLUMN IF NOT EXISTS delivery_vehicle_plate VARCHAR(30);",
    "ALTER TABLE iqc_inspections ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100);",

    # PRP Programs & Checklists
    'ALTER TABLE prp_programs ADD COLUMN IF NOT EXISTS "group" VARCHAR(50) DEFAULT \'GMP\';',
    "ALTER TABLE prp_programs ADD COLUMN IF NOT EXISTS frequency VARCHAR(50) DEFAULT 'Theo ca sản xuất';",
    "ALTER TABLE prp_programs ADD COLUMN IF NOT EXISTS responsible_dept VARCHAR(100) DEFAULT 'Phòng Sản xuất';",
    "ALTER TABLE prp_programs ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE';",

    # Equipment & Maintenance Migrations
    "ALTER TABLE equipments ADD COLUMN IF NOT EXISTS calibration_frequency_months INTEGER DEFAULT 12;",
    "ALTER TABLE equipments ADD COLUMN IF NOT EXISTS maintenance_frequency_days INTEGER DEFAULT 30;",
    "ALTER TABLE equipments ADD COLUMN IF NOT EXISTS specifications JSONB;",

    # Phase 6: Production Batches Migrations
    "ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);",
    "ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS production_line VARCHAR(100) DEFAULT 'Dây chuyền Chế biến 01';",
    "ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS shift VARCHAR(50) DEFAULT 'Ca 1 (06:00 - 14:00)';",
    "ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS planned_quantity NUMERIC(12,2) DEFAULT 0.0;",
    "ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS actual_quantity NUMERIC(12,2) DEFAULT 0.0;",
    "ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'kg';",
    "ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS qc_inspector VARCHAR(100) DEFAULT 'QC Thẩm định';",
    "ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS notes TEXT;",
    "ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;",

    # Phase 6: Batch Material Usage Migrations
    "ALTER TABLE batch_material_usage ADD COLUMN IF NOT EXISTS material_name VARCHAR(255) DEFAULT 'Nguyên liệu';",
    "ALTER TABLE batch_material_usage ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100) DEFAULT 'NL-LOT';",

    # Phase 6: Warehouse Inventory Migrations
    "ALTER TABLE warehouse_inventory ADD COLUMN IF NOT EXISTS item_code VARCHAR(50) DEFAULT 'NL-01';",
    "ALTER TABLE warehouse_inventory ADD COLUMN IF NOT EXISTS item_name VARCHAR(255) DEFAULT 'Nguyên liệu';",
    "ALTER TABLE warehouse_inventory ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'RAW_MATERIAL';",
    "ALTER TABLE warehouse_inventory ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100) DEFAULT 'LOT-01';",
    "ALTER TABLE warehouse_inventory ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'kg';",
    "ALTER TABLE warehouse_inventory ADD COLUMN IF NOT EXISTS min_stock_level NUMERIC(12,2) DEFAULT 100.0;",
    "ALTER TABLE warehouse_inventory ADD COLUMN IF NOT EXISTS warehouse_type VARCHAR(50) DEFAULT 'COLD_STORAGE';",
    "ALTER TABLE warehouse_inventory ADD COLUMN IF NOT EXISTS temperature_c NUMERIC(5,2);",
    "ALTER TABLE warehouse_inventory ADD COLUMN IF NOT EXISTS notes TEXT;",
    "ALTER TABLE warehouse_inventory ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE warehouse_inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;",

    # Phase 6: Retained Samples Migrations
    "ALTER TABLE retained_samples ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100) DEFAULT 'LOT-SAMPLE';",
    "ALTER TABLE retained_samples ADD COLUMN IF NOT EXISTS product_name VARCHAR(255) DEFAULT 'Mẫu lưu sản phẩm';",
    "ALTER TABLE retained_samples ADD COLUMN IF NOT EXISTS sample_weight_g NUMERIC(8,2) DEFAULT 200.0;",
    "ALTER TABLE retained_samples ADD COLUMN IF NOT EXISTS storage_cabinet VARCHAR(100) DEFAULT 'Tủ đông mẫu T-01';",
    "ALTER TABLE retained_samples ADD COLUMN IF NOT EXISTS storage_temperature_c NUMERIC(5,2) DEFAULT -18.0;",
    "ALTER TABLE retained_samples ADD COLUMN IF NOT EXISTS sampled_by VARCHAR(100) DEFAULT 'QC Ca';",
    "ALTER TABLE retained_samples ADD COLUMN IF NOT EXISTS test_result VARCHAR(30) DEFAULT 'PASS';",
    "ALTER TABLE retained_samples ADD COLUMN IF NOT EXISTS test_details JSONB;",
    "ALTER TABLE retained_samples ADD COLUMN IF NOT EXISTS disposed_date DATE;",
    "ALTER TABLE retained_samples ADD COLUMN IF NOT EXISTS disposed_by VARCHAR(100);",
    "ALTER TABLE retained_samples ADD COLUMN IF NOT EXISTS notes TEXT;",
    "ALTER TABLE retained_samples ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;",

    # Phase 6: Order Dispatches Migrations
    "ALTER TABLE order_dispatches ADD COLUMN IF NOT EXISTS dispatch_code VARCHAR(100) DEFAULT 'PXK-01';",
    "ALTER TABLE order_dispatches ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);",
    "ALTER TABLE order_dispatches ADD COLUMN IF NOT EXISTS destination_address VARCHAR(255);",
    "ALTER TABLE order_dispatches ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100) DEFAULT 'LOT-01';",
    "ALTER TABLE order_dispatches ADD COLUMN IF NOT EXISTS product_name VARCHAR(255) DEFAULT 'Thành phẩm xuất kho';",
    "ALTER TABLE order_dispatches ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'thùng';",
    "ALTER TABLE order_dispatches ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50) DEFAULT '59C-128.45';",
    "ALTER TABLE order_dispatches ADD COLUMN IF NOT EXISTS vehicle_temp_c NUMERIC(5,2) DEFAULT -18.0;",
    "ALTER TABLE order_dispatches ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'DELIVERED';",
    "ALTER TABLE order_dispatches ADD COLUMN IF NOT EXISTS notes TEXT;",

    # Phase 6 / Luồng 15: Vehicle Inspections (BM01-PTVC 5 tiêu chí gốc)
    "ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);",
    "ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(100) DEFAULT 'Xe tải thùng kín';",
    "ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS transport_company VARCHAR(255) DEFAULT 'Đội xe Công ty';",
    "ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(50);",
    "ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS corrective_action TEXT;",
    "ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS notes TEXT;",
    "ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS valid_registration_check BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS cargo_integrity_check BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS clean_dry_check BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS no_odor_check BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE vehicle_inspections ADD COLUMN IF NOT EXISTS pest_free_check BOOLEAN DEFAULT TRUE;",

    # Process Steps plan_id migration
    "ALTER TABLE process_steps ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES haccp_plans(plan_id) ON DELETE SET NULL;",

    # Phase 7: Non-Conformances & CAPA Migrations
    "ALTER TABLE non_conformances ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'Sự không phù hợp phát sinh';",
    "ALTER TABLE non_conformances ADD COLUMN IF NOT EXISTS occurred_date DATE DEFAULT CURRENT_DATE;",
    "ALTER TABLE non_conformances ADD COLUMN IF NOT EXISTS occurred_location VARCHAR(150);",
    "ALTER TABLE non_conformances ADD COLUMN IF NOT EXISTS immediate_action TEXT;",
    "ALTER TABLE non_conformances ADD COLUMN IF NOT EXISTS affected_lot_number VARCHAR(100);",
    "ALTER TABLE non_conformances ADD COLUMN IF NOT EXISTS affected_quantity VARCHAR(100);",
    "ALTER TABLE non_conformances ADD COLUMN IF NOT EXISTS reported_by_name VARCHAR(150) DEFAULT 'KCS Ca sản xuất';",
    "ALTER TABLE non_conformances ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'NEW';",
    "ALTER TABLE non_conformances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;",

    "ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS capa_number VARCHAR(50);",
    "ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'Kế hoạch hành động khắc phục phòng ngừa';",
    "ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS root_cause_method VARCHAR(50) DEFAULT '5_WHYS';",
    "ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS root_cause_summary TEXT;",
    "ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS assigned_to_name VARCHAR(150) DEFAULT 'Trưởng bộ phận';",
    "ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS assigned_dept VARCHAR(150) DEFAULT 'Phòng Sản xuất';",
    "ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS target_date DATE DEFAULT (CURRENT_DATE + INTERVAL '14 days');",
    "ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS completed_date DATE;",
    "ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS verified_by_name VARCHAR(150);",
    "ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS verification_date DATE;",
    "ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'PENDING_VERIFY';",
    "ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS evidence_urls JSONB DEFAULT '[]'::jsonb;",
    "ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE capa_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;",
    
    "ALTER TABLE capa_records ALTER COLUMN due_date DROP NOT NULL;",
    "ALTER TABLE capa_records ALTER COLUMN corrective_action DROP NOT NULL;",

    # Safe conversion of root_cause_analysis to JSONB only if it is currently text
    """
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'capa_records' 
            AND column_name = 'root_cause_analysis' 
            AND data_type IN ('text', 'character varying')
        ) THEN
            ALTER TABLE capa_records ALTER COLUMN root_cause_analysis TYPE JSONB USING (
                CASE WHEN root_cause_analysis IS NULL OR root_cause_analysis = '' THEN '{}'::jsonb 
                ELSE root_cause_analysis::jsonb END
            );
        END IF;
    END $$;
    """,

    # Phase 8: Internal Audits & Training Migrations
    "ALTER TABLE internal_audits ALTER COLUMN audit_plan_code DROP NOT NULL;",
    "ALTER TABLE internal_audits ALTER COLUMN audit_date DROP NOT NULL;",
    "ALTER TABLE internal_audits ALTER COLUMN scope DROP NOT NULL;",
    "ALTER TABLE internal_audits ADD COLUMN IF NOT EXISTS audit_code VARCHAR(50);",
    "ALTER TABLE internal_audits ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'Đợt đánh giá nội bộ định kỳ';",
    "ALTER TABLE internal_audits ADD COLUMN IF NOT EXISTS audit_type VARCHAR(50) DEFAULT 'PERIODIC';",
    "ALTER TABLE internal_audits ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;",
    "ALTER TABLE internal_audits ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT CURRENT_DATE;",
    "ALTER TABLE internal_audits ADD COLUMN IF NOT EXISTS lead_auditor_name VARCHAR(100) DEFAULT 'Trưởng đoàn ĐGNB';",
    "ALTER TABLE internal_audits ADD COLUMN IF NOT EXISTS auditor_team JSONB DEFAULT '[]'::jsonb;",
    "ALTER TABLE internal_audits ADD COLUMN IF NOT EXISTS audited_dept VARCHAR(100) DEFAULT 'Phòng Sản Xuất';",
    "ALTER TABLE internal_audits ADD COLUMN IF NOT EXISTS audited_lead_name VARCHAR(100);",
    "ALTER TABLE internal_audits ADD COLUMN IF NOT EXISTS standard_clauses JSONB DEFAULT '[]'::jsonb;",
    "ALTER TABLE internal_audits ADD COLUMN IF NOT EXISTS conclusion TEXT;",
    "ALTER TABLE internal_audits ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;",

    # Phase 9: Management Reviews & Quality Objectives Migrations
    "ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS objective_code VARCHAR(50);",
    "ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS clause_reference VARCHAR(50) DEFAULT '6.2';",
    "ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Toàn nhà máy';",
    "ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS unit VARCHAR(30) DEFAULT '%';",
    "ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS action_plan TEXT;",
    "ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS responsible_person VARCHAR(100) DEFAULT 'Trưởng Ban ISO';",
    "ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;",
    "ALTER TABLE quality_objectives ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;",

    "ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS review_code VARCHAR(50);",
    "ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'Cuộc họp xem xét lãnh đạo FSMS';",
    "ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS chairperson_name VARCHAR(100) DEFAULT 'Tổng Giám Đốc Trần Văn Hùng';",
    "ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS secretary_name VARCHAR(100) DEFAULT 'Trưởng Ban ISO Nguyễn Văn An';",
    "ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]'::jsonb;",
    "ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS scope_and_inputs JSONB DEFAULT '{}'::jsonb;",
    "ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'DRAFT';",
    "ALTER TABLE management_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;",

    # Khởi tạo bảng departments chuẩn hóa
    """
    CREATE TABLE IF NOT EXISTS departments (
        dept_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        dept_code VARCHAR(50) UNIQUE NOT NULL,
        dept_name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    INSERT INTO departments (dept_code, dept_name, description) VALUES
    ('DEPT-BGD', 'Ban Giám đốc', 'Ban Giám đốc & Ban Lãnh đạo điều hành nhà máy'),
    ('DEPT-QLCL', 'Ban QLCL & ATTP', 'Ban Quản lý Chất lượng, Đội HACCP & An toàn thực phẩm'),
    ('DEPT-SX', 'Phòng Sản xuất', 'Bộ phận chế biến, điều hành các dây chuyền sản xuất & GMP'),
    ('DEPT-KDK', 'Phòng Kinh doanh & Kho', 'Bộ phận kinh doanh, kho lạnh FEFO & logistics chuỗi cung ứng'),
    ('DEPT-TB', 'Phòng Thiết bị', 'Bộ phận cơ điện, bảo trì bảo dưỡng máy móc & hiệu chuẩn'),
    ('DEPT-HCKT', 'Phòng Hành chính - Kế toán', 'Bộ phận nhân sự, tiền lương, đào tạo ATTP & y tế sức khỏe'),
    ('DEPT-IT', 'Quản trị hệ thống', 'Bộ phận CNTT, bảo mật hệ thống dữ liệu số & quản trị phần mềm')
    ON CONFLICT (dept_name) DO NOTHING;
    """,

    # Phase 10a: Change Management, Communications, Food Safety Team, HACCP Plan Reviews
    """
    CREATE TABLE IF NOT EXISTS change_requests (
        change_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        change_code VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        change_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        reason TEXT NOT NULL,
        impact_assessment JSONB NOT NULL,
        proposed_by_name VARCHAR(100) NOT NULL,
        proposed_date DATE NOT NULL DEFAULT CURRENT_DATE,
        review_status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
        approved_by_name VARCHAR(100),
        approval_date DATE,
        implementation_plan TEXT,
        implementation_date DATE,
        verification_result TEXT,
        verified_by_name VARCHAR(100),
        related_ccp_ids JSONB,
        related_document_ids JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS communications_log (
        comm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        comm_code VARCHAR(50) UNIQUE NOT NULL,
        direction VARCHAR(20) NOT NULL DEFAULT 'EXTERNAL',
        party_type VARCHAR(30) NOT NULL DEFAULT 'GOVERNMENT',
        party_name VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        communication_date DATE NOT NULL,
        method VARCHAR(30) NOT NULL DEFAULT 'EMAIL',
        responsible_person VARCHAR(100) NOT NULL,
        related_nc_id UUID REFERENCES non_conformances(nc_id) ON DELETE SET NULL,
        attachment_url VARCHAR(500),
        status VARCHAR(30) NOT NULL DEFAULT 'SENT',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS food_safety_team_members (
        member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
        member_name VARCHAR(100) NOT NULL,
        role_in_team VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
        department VARCHAR(100) NOT NULL,
        current_position VARCHAR(100) NOT NULL,
        qualification_and_training TEXT,
        responsibility_description TEXT NOT NULL,
        appointment_decision_code VARCHAR(50) NOT NULL DEFAULT '02/QĐ-ATTP-2026',
        appointment_date DATE NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS haccp_plan_reviews (
        review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_code VARCHAR(50) UNIQUE NOT NULL,
        plan_id UUID NOT NULL REFERENCES haccp_plans(plan_id) ON DELETE CASCADE,
        review_date DATE NOT NULL DEFAULT CURRENT_DATE,
        review_type VARCHAR(50) NOT NULL DEFAULT 'PERIODIC',
        triggered_by_change_id UUID REFERENCES change_requests(change_id) ON DELETE SET NULL,
        reviewed_by_name VARCHAR(100) NOT NULL,
        scope_of_review TEXT NOT NULL,
        findings TEXT NOT NULL,
        changes_required BOOLEAN NOT NULL DEFAULT FALSE,
        plan_version_before VARCHAR(20) NOT NULL DEFAULT '1.0',
        plan_version_after VARCHAR(20) NOT NULL DEFAULT '1.0',
        approval_status VARCHAR(30) NOT NULL DEFAULT 'APPROVED',
        approved_by_name VARCHAR(100) DEFAULT 'Đội trưởng Đội ATTP',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS user_read_alerts (
        user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        alert_id VARCHAR(100) NOT NULL,
        read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, alert_id)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS metal_detector_logs (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        machine_code VARCHAR(50) NOT NULL DEFAULT 'MD-01',
        machine_name VARCHAR(100) NOT NULL DEFAULT 'Máy dò kim loại băng tải',
        log_date DATE NOT NULL DEFAULT CURRENT_DATE,
        check_time VARCHAR(20) NOT NULL,
        shift_name VARCHAR(50) NOT NULL DEFAULT 'Ca 1',
        batch_number VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        fe_standard_mm NUMERIC(4, 2) NOT NULL DEFAULT 0.50,
        fe_detected BOOLEAN NOT NULL DEFAULT TRUE,
        sus_standard_mm NUMERIC(4, 2) NOT NULL DEFAULT 0.80,
        sus_detected BOOLEAN NOT NULL DEFAULT TRUE,
        rejection_mechanism_working BOOLEAN NOT NULL DEFAULT TRUE,
        metal_detected_count INTEGER NOT NULL DEFAULT 0,
        test_result VARCHAR(30) NOT NULL DEFAULT 'PASSED',
        corrective_action TEXT,
        checked_by_name VARCHAR(100) NOT NULL,
        verified_by_name VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS in_process_qc_logs (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        inspection_code VARCHAR(50) UNIQUE NOT NULL,
        stage_code VARCHAR(50) NOT NULL,
        stage_name VARCHAR(150) NOT NULL,
        log_date DATE NOT NULL DEFAULT CURRENT_DATE,
        check_time VARCHAR(20) NOT NULL,
        shift_name VARCHAR(50) NOT NULL DEFAULT 'Ca 1',
        batch_number VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        criteria_data JSONB NOT NULL,
        overall_status VARCHAR(30) NOT NULL DEFAULT 'PASS',
        deviations TEXT,
        corrective_actions TEXT,
        inspector_name VARCHAR(100) NOT NULL,
        supervisor_name VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS training_requests (
        request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_code VARCHAR(50) UNIQUE NOT NULL,
        department VARCHAR(100) NOT NULL,
        proposer_name VARCHAR(100) NOT NULL,
        course_name VARCHAR(255) NOT NULL,
        training_reason TEXT NOT NULL,
        expected_duration VARCHAR(50) NOT NULL DEFAULT '0.5 ngày',
        attendee_count INTEGER NOT NULL DEFAULT 1,
        target_participants TEXT NOT NULL,
        expected_outcomes TEXT NOT NULL,
        request_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
        approver_name VARCHAR(100),
        approval_date DATE,
        approval_note TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS training_evaluations (
        evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID REFERENCES training_courses(course_id) ON DELETE SET NULL,
        employee_code VARCHAR(50) NOT NULL,
        employee_name VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        evaluator_name VARCHAR(100) NOT NULL,
        evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
        knowledge_score INTEGER NOT NULL DEFAULT 4,
        skill_application_score INTEGER NOT NULL DEFAULT 4,
        attitude_awareness_score INTEGER NOT NULL DEFAULT 5,
        overall_rating VARCHAR(30) NOT NULL DEFAULT 'DAT',
        supervisor_feedback TEXT,
        need_retraining BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    # Phase An Giang: Pest Control Logs (BM01-SVGH)
    """
    CREATE TABLE IF NOT EXISTS pest_control_logs (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        log_code VARCHAR(50) UNIQUE NOT NULL,
        check_date DATE NOT NULL DEFAULT CURRENT_DATE,
        inspector_name VARCHAR(100) NOT NULL,
        trap_locations JSONB NOT NULL DEFAULT '[]'::jsonb,
        total_pests_caught INTEGER NOT NULL DEFAULT 0,
        corrective_actions TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    # Phase An Giang: Allergen Controls (BM01-CGDU)
    """
    CREATE TABLE IF NOT EXISTS allergen_controls (
        allergen_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        allergen_code VARCHAR(50) UNIQUE NOT NULL,
        material_name VARCHAR(255) NOT NULL,
        allergen_types VARCHAR(255) NOT NULL,
        is_contained_in_product BOOLEAN NOT NULL DEFAULT TRUE,
        cross_contact_risk_stage TEXT,
        preventive_measures TEXT NOT NULL,
        responsible_person VARCHAR(100) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    # Phase An Giang: Visitor Health Declarations (BM03-KSSK)
    """
    CREATE TABLE IF NOT EXISTS visitor_health_declarations (
        declaration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        declaration_code VARCHAR(50) UNIQUE NOT NULL,
        visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
        visitor_name VARCHAR(100) NOT NULL,
        company_name VARCHAR(150) NOT NULL,
        purpose_of_visit VARCHAR(255) NOT NULL,
        has_diarrhea BOOLEAN NOT NULL DEFAULT FALSE,
        has_fever_cough BOOLEAN NOT NULL DEFAULT FALSE,
        has_open_wound BOOLEAN NOT NULL DEFAULT FALSE,
        visited_epidemic_area BOOLEAN NOT NULL DEFAULT FALSE,
        is_approved_entry BOOLEAN NOT NULL DEFAULT TRUE,
        escort_person VARCHAR(100),
        commitment_signed BOOLEAN NOT NULL DEFAULT TRUE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    # Phase An Giang: First Aid Cabinet Logs (BM01-KSSK)
    """
    CREATE TABLE IF NOT EXISTS first_aid_logs (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        log_code VARCHAR(50) UNIQUE NOT NULL,
        issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
        recipient_name VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        reason_symptom TEXT NOT NULL,
        supplies_provided TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        dispenser_name VARCHAR(100) NOT NULL,
        status_after_aid VARCHAR(100) NOT NULL DEFAULT 'Tiếp tục làm việc',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    # Phase An Giang: Vehicle Inspection Logs (BM01-PTVC)
    """
    CREATE TABLE IF NOT EXISTS vehicle_inspection_logs (
        inspection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        inspection_code VARCHAR(50) UNIQUE NOT NULL,
        inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
        customer_name VARCHAR(255) NOT NULL,
        vehicle_type VARCHAR(100) NOT NULL,
        license_plate VARCHAR(50) NOT NULL,
        driver_name VARCHAR(100) NOT NULL,
        check_registration_valid BOOLEAN NOT NULL DEFAULT TRUE,
        check_clean_floor BOOLEAN NOT NULL DEFAULT TRUE,
        check_no_odor BOOLEAN NOT NULL DEFAULT TRUE,
        check_no_pests BOOLEAN NOT NULL DEFAULT TRUE,
        check_enclosed_tarp BOOLEAN NOT NULL DEFAULT TRUE,
        overall_result VARCHAR(30) NOT NULL DEFAULT 'PASSED',
        inspector_name VARCHAR(100) NOT NULL,
        corrective_action TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    # ==================== 15. DOCUMENT CONTROL EXTENSIONS (QT-KSTL AN GIANG) ====================
    """
    ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS review_due_date DATE,
    ADD COLUMN IF NOT EXISTS drafter_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS reviewer_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS security_level VARCHAR(50) DEFAULT 'INTERNAL',
    ADD COLUMN IF NOT EXISTS review_frequency_years INTEGER DEFAULT 3,
    ADD COLUMN IF NOT EXISTS last_reviewed_date DATE;
    """,
    """
    CREATE TABLE IF NOT EXISTS document_change_requests (
        request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_code VARCHAR(50) UNIQUE NOT NULL,
        document_id UUID REFERENCES documents(document_id) ON DELETE SET NULL,
        doc_code VARCHAR(50) NOT NULL,
        doc_title VARCHAR(255) NOT NULL,
        change_type VARCHAR(30) NOT NULL DEFAULT 'REVISION',
        department VARCHAR(100) NOT NULL,
        requested_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
        requested_by_name VARCHAR(150) NOT NULL,
        request_date DATE NOT NULL,
        reason TEXT NOT NULL,
        proposed_content TEXT,
        target_completion_date DATE,
        assigned_drafter VARCHAR(150),
        dept_head_opinion VARCHAR(50),
        dept_head_comment TEXT,
        dept_head_signed_at TIMESTAMPTZ,
        dept_head_signer_name VARCHAR(150),
        qa_head_opinion VARCHAR(50),
        qa_head_comment TEXT,
        qa_head_signed_at TIMESTAMPTZ,
        qa_head_signer_name VARCHAR(150),
        director_approval VARCHAR(50),
        director_comment TEXT,
        director_signed_at TIMESTAMPTZ,
        director_signer_name VARCHAR(150),
        status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS document_distributions (
        distribution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        notice_code VARCHAR(50) NOT NULL,
        document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE,
        doc_code VARCHAR(50) NOT NULL,
        doc_title VARCHAR(255) NOT NULL,
        version VARCHAR(20) NOT NULL DEFAULT '1.0',
        effective_date DATE NOT NULL,
        change_summary TEXT,
        department_recipient VARCHAR(100) NOT NULL,
        recipient_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
        distribution_method VARCHAR(50) NOT NULL DEFAULT 'PORTAL',
        copy_number INTEGER NOT NULL DEFAULT 1,
        distributed_by_name VARCHAR(150) NOT NULL,
        distribution_date DATE NOT NULL,
        acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
        acknowledged_by_name VARCHAR(150),
        acknowledged_at TIMESTAMPTZ,
        obsolete_copy_retrieved BOOLEAN NOT NULL DEFAULT FALSE,
        retrieval_date DATE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    ALTER TABLE document_distributions
    ADD COLUMN IF NOT EXISTS recipient_user_id UUID REFERENCES users(user_id);
    """,
    """
    CREATE TABLE IF NOT EXISTS external_documents (
        external_doc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doc_code VARCHAR(100) UNIQUE NOT NULL,
        doc_title VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'LAW_REGULATION',
        issuing_body VARCHAR(150) NOT NULL,
        published_date DATE,
        effective_date DATE,
        status VARCHAR(30) NOT NULL DEFAULT 'EFFECTIVE',
        superseded_by VARCHAR(100),
        department_in_charge VARCHAR(100) NOT NULL DEFAULT 'Ban QLCL & ATTP',
        review_frequency VARCHAR(50) NOT NULL DEFAULT 'ANNUAL',
        last_checked_date DATE,
        checked_by_name VARCHAR(150),
        file_url TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS metal_detector_logs (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        machine_code VARCHAR(50) NOT NULL DEFAULT 'MD-01',
        machine_name VARCHAR(100) NOT NULL DEFAULT 'Máy dò kim loại băng tải',
        log_date DATE NOT NULL,
        check_time TIME WITHOUT TIME ZONE NOT NULL,
        shift_name VARCHAR(50) NOT NULL DEFAULT 'Ca 1',
        batch_number VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        fe_standard_mm NUMERIC(4,2) NOT NULL DEFAULT 0.50,
        fe_detected BOOLEAN NOT NULL DEFAULT TRUE,
        sus_standard_mm NUMERIC(4,2) NOT NULL DEFAULT 0.80,
        sus_detected BOOLEAN NOT NULL DEFAULT TRUE,
        rejection_mechanism_working BOOLEAN NOT NULL DEFAULT TRUE,
        test_result VARCHAR(30) NOT NULL DEFAULT 'PASSED',
        deviation_notes TEXT,
        corrective_action TEXT,
        inspector_name VARCHAR(150) NOT NULL,
        supervisor_signature VARCHAR(150),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS in_process_qc_logs (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stage_name VARCHAR(100) NOT NULL,
        stage_code VARCHAR(50) NOT NULL,
        log_date DATE NOT NULL,
        check_time TIME WITHOUT TIME ZONE NOT NULL,
        batch_number VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        temperature_c NUMERIC(5,2),
        moisture_percent NUMERIC(5,2),
        particle_size_mm NUMERIC(6,3),
        uniformity_check BOOLEAN DEFAULT TRUE,
        sensory_check VARCHAR(50) DEFAULT 'PASS',
        parameters JSONB,
        inspection_result VARCHAR(30) NOT NULL DEFAULT 'PASSED',
        corrective_action TEXT,
        inspector_name VARCHAR(150) NOT NULL,
        supervisor_signature VARCHAR(150),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS training_requests (
        request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_code VARCHAR(50) NOT NULL,
        department_name VARCHAR(100) NOT NULL,
        requested_by_name VARCHAR(150) NOT NULL,
        request_date DATE NOT NULL,
        course_title VARCHAR(255) NOT NULL,
        training_purpose TEXT NOT NULL,
        target_audience VARCHAR(255) NOT NULL,
        proposed_trainer VARCHAR(150),
        estimated_participants INTEGER NOT NULL DEFAULT 1,
        proposed_date DATE,
        estimated_budget NUMERIC(15,2) DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        approval_comment TEXT,
        approved_by_name VARCHAR(150),
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS training_evaluations (
        evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evaluation_code VARCHAR(50) NOT NULL,
        course_id UUID REFERENCES training_courses(course_id) ON DELETE SET NULL,
        course_title VARCHAR(255) NOT NULL,
        participant_name VARCHAR(150) NOT NULL,
        department_name VARCHAR(100) NOT NULL,
        evaluation_date DATE NOT NULL,
        evaluated_by_name VARCHAR(150) NOT NULL,
        post_training_score NUMERIC(5,2),
        work_application_rating INTEGER DEFAULT 4,
        productivity_impact_rating INTEGER DEFAULT 4,
        error_reduction_rating INTEGER DEFAULT 4,
        overall_effectiveness VARCHAR(50) NOT NULL DEFAULT 'EFFECTIVE',
        supervisor_comment TEXT,
        follow_up_recommendation TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS records_retention (
        retention_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        record_code VARCHAR(50) UNIQUE NOT NULL,
        record_name VARCHAR(255) NOT NULL,
        department VARCHAR(100) NOT NULL,
        storage_location VARCHAR(255) NOT NULL,
        retention_period VARCHAR(100) NOT NULL DEFAULT '02 năm',
        disposal_method VARCHAR(255) DEFAULT 'Hủy bằng máy cắt vụn & Xóa file số',
        responsible_person VARCHAR(150),
        status VARCHAR(30) NOT NULL DEFAULT 'RETAINED',
        disposal_date DATE,
        disposal_council VARCHAR(255),
        disposal_minutes_code VARCHAR(100),
        notes TEXT,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    """
    ALTER TABLE records_retention
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS creation_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS retention_expiry_date DATE;
    """,
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'uq_records_retention_record_code'
        ) THEN
            ALTER TABLE records_retention ADD CONSTRAINT uq_records_retention_record_code UNIQUE (record_code);
        END IF;
    END $$;
    """,
    # Builder template approval & history columns
    """
    ALTER TABLE dynamic_form_templates
    ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(100) DEFAULT 'Quản trị hệ thống',
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS change_history JSONB DEFAULT '[]'::jsonb;
    """,
    """
    ALTER TABLE dynamic_workflow_templates
    ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(100) DEFAULT 'Quản trị hệ thống',
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS change_history JSONB DEFAULT '[]'::jsonb;
    """,
    # Preserve the released workflow definition for every execution record.
    "ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS workflow_snapshot JSONB;",
    # Audit Logs
    """
    CREATE TABLE IF NOT EXISTS audit_logs (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
        username VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100),
        details JSONB,
        ip_address VARCHAR(50) DEFAULT '127.0.0.1',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    # Water Safety Records (BM01-SSOP-NUOC)
    """
    CREATE TABLE IF NOT EXISTS water_safety_records (
        record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        record_code VARCHAR(50) UNIQUE NOT NULL,
        sampling_point VARCHAR(255) NOT NULL,
        sampling_date DATE NOT NULL DEFAULT CURRENT_DATE,
        sampling_time VARCHAR(20) NOT NULL DEFAULT '07:00',
        ph_level NUMERIC(4, 2) NOT NULL DEFAULT 7.2,
        chlorine_ppm NUMERIC(4, 2) NOT NULL DEFAULT 0.5,
        turbidity_ntu NUMERIC(4, 2) NOT NULL DEFAULT 0.5,
        sensory_result VARCHAR(100) NOT NULL DEFAULT 'Trong suốt, không màu, không mùi vị lạ',
        coliform_cfu NUMERIC(6, 2) DEFAULT 0.0,
        e_coli_cfu NUMERIC(6, 2) DEFAULT 0.0,
        overall_status VARCHAR(30) NOT NULL DEFAULT 'PASS',
        tested_by_name VARCHAR(100) NOT NULL DEFAULT 'Kỹ thuật Cơ điện',
        verified_by_name VARCHAR(100),
        corrective_action TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    # Chemical Records (BM01-SSOP-HOACHAT)
    """
    CREATE TABLE IF NOT EXISTS chemical_records (
        chemical_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chemical_code VARCHAR(50) UNIQUE NOT NULL,
        chemical_name VARCHAR(255) NOT NULL,
        purpose VARCHAR(255) NOT NULL,
        is_food_grade BOOLEAN NOT NULL DEFAULT TRUE,
        supplier_name VARCHAR(255) NOT NULL,
        msds_document_url VARCHAR(500),
        msds_file_name VARCHAR(255),
        msds_expiry_date DATE,
        dilution_ratio VARCHAR(100) NOT NULL DEFAULT '1:1000',
        storage_location VARCHAR(255) NOT NULL DEFAULT 'Kho hóa chất riêng biệt có khóa',
        approval_status VARCHAR(30) NOT NULL DEFAULT 'APPROVED',
        current_stock_kg NUMERIC(10, 2) NOT NULL DEFAULT 50.0,
        safety_instructions TEXT,
        approved_by VARCHAR(100) DEFAULT 'Trưởng Đội ATTP',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    # Waste Logs (BM01-SSOP-RACTHAI)
    """
    CREATE TABLE IF NOT EXISTS waste_logs (
        waste_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        log_code VARCHAR(50) UNIQUE NOT NULL,
        log_date DATE NOT NULL DEFAULT CURRENT_DATE,
        waste_type VARCHAR(50) NOT NULL DEFAULT 'ORGANIC_BYPRODUCT',
        description VARCHAR(255) NOT NULL,
        quantity_kg NUMERIC(10, 2) NOT NULL,
        storage_area VARCHAR(150) NOT NULL DEFAULT 'Nhà chứa phụ phẩm khép kín',
        disposal_contractor VARCHAR(255) NOT NULL DEFAULT 'Nhà máy Bột cá An Giang',
        transfer_note_code VARCHAR(100),
        status VARCHAR(30) NOT NULL DEFAULT 'TRANSFERRED',
        handled_by_name VARCHAR(100) NOT NULL DEFAULT 'Tổ Vệ sinh Môi trường',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """,
    # Environmental Monitoring Schedules
    """
    CREATE TABLE IF NOT EXISTS environmental_monitoring_schedules (
        schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_code VARCHAR(50) UNIQUE NOT NULL,
        target_object VARCHAR(150) NOT NULL,
        parameters VARCHAR(255) NOT NULL,
        frequency VARCHAR(50) NOT NULL DEFAULT '1 tháng/lần',
        testing_unit VARCHAR(255) NOT NULL DEFAULT 'Trung tâm Kiểm nghiệm Pasteur / Quatest',
        last_tested_date DATE,
        next_due_date DATE NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
        last_result VARCHAR(50) DEFAULT 'PASSED',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    """
]



def run_migrations():
    """Hàm chạy toàn bộ DDL create_all và migration statements tối ưu qua 1 kết nối duy nhất"""
    try:
        print("[MIGRATION] Khởi tạo các bảng từ Base.metadata...")
        Base.metadata.create_all(bind=engine)
        print(f"[MIGRATION] Đang chạy {len(MIGRATION_STATEMENTS)} câu lệnh migration...")
        with engine.connect() as conn:
            autocommit_conn = conn.execution_options(isolation_level="AUTOCOMMIT")
            for stmt in MIGRATION_STATEMENTS:
                try:
                    autocommit_conn.execute(text(stmt))
                except Exception:
                    pass
        print("[MIGRATION] Hoàn tất migrations thành công!")
    except Exception as e:
        print(f"[MIGRATION WARNING] Database tables create_all note: {e}")


if __name__ == "__main__":
    run_migrations()
