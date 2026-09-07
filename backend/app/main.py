from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
import app.models  # ensure models are loaded
from app.api.v1.endpoints import auth, organization, documents, purchasing, haccp, equipment, inventory, traceability, capa, builder, audits, dashboard, emergency

from sqlalchemy import text

def run_migration_sql(sql_query: str):
    try:
        with engine.begin() as conn:
            conn.execute(text(sql_query))
    except Exception as err:
        pass

try:
    Base.metadata.create_all(bind=engine)
    
    # List of migration statements
    migration_statements = [
        # Documents columns migration
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS department VARCHAR(100);",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS standard VARCHAR(100);",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS content TEXT;",

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
        """
    ]

    for stmt in migration_statements:
        run_migration_sql(stmt)
except Exception as e:
    print(f"Database tables create_all note: {e}")

app = FastAPI(
    title="WCERT ISO 22000:2018 FSMS API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(organization.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(purchasing.router, prefix="/api/v1")
app.include_router(haccp.router, prefix="/api/v1")
app.include_router(equipment.router, prefix="/api/v1/equipment", tags=["Equipment & Maintenance"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Warehouse & Inventory FEFO"])
app.include_router(traceability.router, prefix="/api/v1/traceability", tags=["Traceability & Mock Recall"])
app.include_router(capa.router, prefix="/api/v1/capa", tags=["CAPA & Non-Conformance"])
app.include_router(audits.router, prefix="/api/v1/audits", tags=["Internal Audit, Training & Health"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Executive Dashboard & Management Review"])
app.include_router(emergency.router, prefix="/api/v1/emergency", tags=["Emergency Preparedness & Response (Clause 8.4)"])
app.include_router(builder.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "WCERT ISO 22000 Backend API is running"}