-- 1. Bật extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Phân quyền động (Dynamic RBAC)
CREATE TABLE roles (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE permissions (
    permission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permission_code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(role_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 3. File attachments, Audit logs & Notifications
CREATE TABLE file_attachments (
    attachment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    uploaded_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    link_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Luồng 7: Kiểm soát tài liệu (DMS)
CREATE TABLE documents (
    document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_code VARCHAR(50) UNIQUE NOT NULL,
    doc_title VARCHAR(255) NOT NULL,
    doc_type VARCHAR(50) NOT NULL,
    department VARCHAR(100),
    standard VARCHAR(100) DEFAULT 'ISO 22000:2018',
    current_version VARCHAR(20) DEFAULT '1.0' NOT NULL,
    status VARCHAR(30) DEFAULT 'DRAFT',
    content TEXT,
    file_url TEXT,
    approved_by UUID REFERENCES users(user_id),
    effective_date DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Luồng 1: Nhà cung cấp & Nguyên liệu (IQC)
CREATE TABLE suppliers (
    supplier_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    contact_info JSONB,
    rating_score NUMERIC(5,2) DEFAULT 100.0,
    status VARCHAR(30) DEFAULT 'APPROVED',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE material_lots (
    material_lot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lot_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(supplier_id),
    material_name VARCHAR(255) NOT NULL,
    received_date DATE NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    coa_file_url TEXT,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE iqc_inspections (
    inspection_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_code VARCHAR(50) UNIQUE NOT NULL,
    material_lot_id UUID REFERENCES material_lots(material_lot_id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    sensory_check BOOLEAN DEFAULT TRUE,
    packaging_check BOOLEAN DEFAULT TRUE,
    temperature_c NUMERIC(5,2),
    moisture_content NUMERIC(5,2),
    mycotoxin_check BOOLEAN DEFAULT TRUE,
    allergen_check BOOLEAN DEFAULT FALSE,
    coa_compliance BOOLEAN DEFAULT TRUE,
    defect_rate_percent NUMERIC(5,2) DEFAULT 0.0,
    impurity_percent NUMERIC(5,2) DEFAULT 0.0,
    size_uniformity_check BOOLEAN DEFAULT TRUE,
    vehicle_cleanliness_check BOOLEAN DEFAULT TRUE,
    delivery_vehicle_plate VARCHAR(30),
    driver_name VARCHAR(100),
    inspection_details JSONB,
    status VARCHAR(30) NOT NULL,
    notes TEXT,
    inspected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Luồng 2: Sản xuất & Giám sát CCP/OPRP
CREATE TABLE ccp_definitions (
    ccp_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ccp_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    process_step VARCHAR(100) NOT NULL,
    hazard_description TEXT NOT NULL,
    critical_limit JSONB NOT NULL,
    monitoring_frequency VARCHAR(100) NOT NULL
);

CREATE TABLE production_batches (
    batch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'IN_PROGRESS',
    created_by UUID REFERENCES users(user_id)
);

CREATE TABLE batch_material_usage (
    usage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES production_batches(batch_id),
    material_lot_id UUID REFERENCES material_lots(material_lot_id),
    quantity_used NUMERIC(12,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ccp_monitoring_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES production_batches(batch_id),
    ccp_id UUID REFERENCES ccp_definitions(ccp_id),
    checked_by UUID REFERENCES users(user_id),
    test_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    measured_values JSONB NOT NULL,
    is_critical_limit_exceeded BOOLEAN DEFAULT FALSE,
    deviation_action TEXT
);

CREATE TABLE equipment_maintenance (
    equipment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_code VARCHAR(50) UNIQUE NOT NULL,
    equipment_name VARCHAR(255) NOT NULL,
    calibration_due_date DATE,
    calibration_status VARCHAR(30) DEFAULT 'VALID',
    last_maintenance_date DATE,
    managed_by UUID REFERENCES users(user_id),
    notes TEXT
);

-- 7. Luồng 3 & 4: Kho, Truy xuất & Giao nhận
CREATE TABLE warehouse_inventory (
    inventory_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES production_batches(batch_id),
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    mfg_date DATE NOT NULL,
    exp_date DATE NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    location_bin VARCHAR(50) NOT NULL,
    status VARCHAR(30) DEFAULT 'AVAILABLE'
);

CREATE TABLE retained_samples (
    sample_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES production_batches(batch_id),
    sample_code VARCHAR(100) UNIQUE NOT NULL,
    storage_location VARCHAR(100) NOT NULL,
    sample_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'STORED'
);

CREATE TABLE order_dispatches (
    dispatch_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    batch_id UUID REFERENCES production_batches(batch_id),
    quantity_dispatched NUMERIC(12,2) NOT NULL,
    vehicle_check_status BOOLEAN DEFAULT TRUE,
    dispatched_by UUID REFERENCES users(user_id),
    dispatched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Luồng 5: Sự KPH, CAPA & Audit nội bộ
CREATE TABLE non_conformances (
    nc_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nc_number VARCHAR(50) UNIQUE NOT NULL,
    source VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    related_batch_id UUID REFERENCES production_batches(batch_id),
    reported_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE capa_records (
    capa_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nc_id UUID REFERENCES non_conformances(nc_id),
    root_cause_analysis TEXT,
    corrective_action TEXT NOT NULL,
    preventive_action TEXT,
    assigned_to UUID REFERENCES users(user_id),
    due_date DATE NOT NULL,
    completion_date DATE,
    verified_by UUID REFERENCES users(user_id),
    verification_result TEXT,
    status VARCHAR(30) DEFAULT 'OPEN'
);

CREATE TABLE internal_audits (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_plan_code VARCHAR(50) UNIQUE NOT NULL,
    audit_date DATE NOT NULL,
    lead_auditor_id UUID REFERENCES users(user_id),
    scope TEXT NOT NULL,
    findings_summary TEXT,
    status VARCHAR(30) DEFAULT 'PLANNED'
);

CREATE TABLE prp_inspection_items (
    item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID REFERENCES internal_audits(audit_id),
    category VARCHAR(100) NOT NULL,
    checklist_question TEXT NOT NULL,
    is_compliant BOOLEAN DEFAULT TRUE,
    finding_note TEXT
);

-- 9. Luồng 6: Đào tạo & Khai báo sức khỏe
CREATE TABLE training_records (
    training_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_name VARCHAR(255) NOT NULL,
    trainer VARCHAR(100),
    training_date DATE NOT NULL,
    participants JSONB NOT NULL,
    managed_by UUID REFERENCES users(user_id),
    assessment_result VARCHAR(50)
);

CREATE TABLE health_declarations (
    declaration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id),
    shift_date DATE NOT NULL,
    has_infectious_disease BOOLEAN DEFAULT FALSE,
    has_open_wound BOOLEAN DEFAULT FALSE,
    is_cleared_for_shift BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Luồng 8: Xem xét lãnh đạo & Mục tiêu chất lượng
CREATE TABLE quality_objectives (
    objective_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_year INT NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    target_value NUMERIC(10,2) NOT NULL,
    actual_value NUMERIC(10,2),
    responsible_user_id UUID REFERENCES users(user_id),
    status VARCHAR(30) DEFAULT 'ON_TRACK'
);

CREATE TABLE management_reviews (
    review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_date DATE NOT NULL,
    chairperson_id UUID REFERENCES users(user_id),
    meeting_minutes TEXT NOT NULL,
    decisions_and_actions JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Bổ sung: Kế hoạch HACCP (HACCP Plans) & Quy trình công đoạn
CREATE TABLE IF NOT EXISTS haccp_plans (
    plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_code VARCHAR(50) UNIQUE NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    product_line VARCHAR(100) DEFAULT 'Chế biến Thủy hải sản' NOT NULL,
    version VARCHAR(20) DEFAULT '1.0' NOT NULL,
    team_leader VARCHAR(100) DEFAULT 'Trưởng ban HACCP / QA' NOT NULL,
    approved_by VARCHAR(100) DEFAULT 'Giám đốc Nhà máy',
    effective_date DATE DEFAULT CURRENT_DATE,
    scope_description TEXT,
    status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS process_steps (
    step_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES haccp_plans(plan_id) ON DELETE SET NULL,
    step_number INT NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    product_line VARCHAR(100) DEFAULT 'Chế biến Thủy hải sản' NOT NULL,
    description TEXT,
    is_ccp_or_oprp BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. Bổ sung: Trình tạo Biểu mẫu Động (Dynamic Form Builder) & Kết quả Gửi mẫu
CREATE TABLE IF NOT EXISTS dynamic_form_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL, -- HACCP, PRP, IQC, SUPPLIER_AUDIT, EQUIPMENT, CAPA, INTERNAL_AUDIT, GENERAL
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0' NOT NULL,
    fields JSONB NOT NULL,
    status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dynamic_form_submissions (
    submission_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES dynamic_form_templates(template_id) ON DELETE CASCADE,
    reference_id VARCHAR(100),
    reference_type VARCHAR(50),
    submitted_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    submitted_by_name VARCHAR(100),
    form_data JSONB NOT NULL,
    score NUMERIC(5,2),
    status VARCHAR(30) DEFAULT 'COMPLETED' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. Bổ sung: Trình thiết kế Quy trình Động (Dynamic Workflow Builder) & Tiến trình Thực thi
CREATE TABLE IF NOT EXISTS dynamic_workflow_templates (
    workflow_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL, -- HACCP_FLOW, DOC_APPROVAL, SUPPLIER_APPROVAL, CAPA_FLOW, AUDIT_FLOW, GENERAL
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0' NOT NULL,
    nodes JSONB NOT NULL,
    edges JSONB NOT NULL,
    status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_instances (
    instance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES dynamic_workflow_templates(workflow_id) ON DELETE CASCADE,
    reference_id VARCHAR(100),
    reference_type VARCHAR(50),
    current_node_id VARCHAR(50) NOT NULL,
    history JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(30) DEFAULT 'IN_PROGRESS' NOT NULL,
    started_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Bảng Danh Mục Phòng Ban Chuẩn Hóa (Departments)
CREATE TABLE IF NOT EXISTS departments (
    dept_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dept_code VARCHAR(50) UNIQUE NOT NULL,
    dept_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Nạp sẵn 7 Phòng ban Chuẩn hóa của Nhà máy chế biến thực phẩm ISO 22000:2018
INSERT INTO departments (dept_code, dept_name, description) VALUES
('DEPT-BGD', 'Ban Giám đốc', 'Ban Giám đốc & Ban Lãnh đạo điều hành nhà máy'),
('DEPT-QLCL', 'Ban QLCL & ATTP', 'Ban Quản lý Chất lượng, Đội HACCP & An toàn thực phẩm'),
('DEPT-SX', 'Phòng Sản xuất', 'Bộ phận chế biến, điều hành các dây chuyền sản xuất & GMP'),
('DEPT-KDK', 'Phòng Kinh doanh & Kho', 'Bộ phận kinh doanh, kho lạnh FEFO & logistics chuỗi cung ứng'),
('DEPT-TB', 'Phòng Thiết bị', 'Bộ phận cơ điện, bảo trì bảo dưỡng máy móc & hiệu chuẩn'),
('DEPT-HCKT', 'Phòng Hành chính - Kế toán', 'Bộ phận nhân sự, tiền lương, đào tạo ATTP & y tế sức khỏe'),
('DEPT-IT', 'Quản trị hệ thống', 'Bộ phận CNTT, bảo mật hệ thống dữ liệu số & quản trị phần mềm')
ON CONFLICT (dept_name) DO NOTHING;

-- Nạp sẵn 8 Vai trò (Roles) chuẩn vào hệ thống
INSERT INTO roles (role_code, role_name, description) VALUES
('admin', 'Quản trị hệ thống', 'Toàn quyền cấu hình, RBAC, audit log'),
('management', 'Ban Giám đốc', 'Phê duyệt tài liệu, xem xét lãnh đạo, duyệt thu hồi'),
('qa_qc_manager', 'Ban QLCL & ATTP', 'Quản lý HACCP, PRP, CAPA, đánh giá nội bộ'),
('production', 'Phòng Sản xuất', 'Thực hiện GMP, ghi nhận CCP, tạo mẻ sản xuất'),
('hr_accounting', 'Phòng Hành chính - Kế toán', 'Quản lý nhân sự, đào tạo, hồ sơ sức khỏe'),
('sales_logistics', 'Phòng Kinh doanh & Kho', 'Quản lý kho FEFO, giao hàng, truy xuất nguồn gốc'),
('maintenance', 'Phòng Thiết bị', 'Bảo trì máy móc, hiệu chuẩn thiết bị đo'),
('staff', 'Cán bộ nhân viên', 'Tra cứu quy trình, xem lịch đào tạo, báo cáo NC'),
('user', 'Người dùng chưa phân quyền', 'Tài khoản mới đăng ký, chờ quản trị viên cấp quyền')
ON CONFLICT (role_code) DO NOTHING;

-- Tạo tài khoản admin mặc định (password: 123456)
INSERT INTO users (user_id, username, password_hash, full_name, department, email, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6FeE6.gJ2I5v.cE8.',
    'Quản trị viên hệ thống',
    'Quản trị hệ thống',
    'admin@wcert.vn',
    TRUE
)
ON CONFLICT (username) DO NOTHING;

-- Gán quyền admin cho tài khoản admin
INSERT INTO user_roles (user_id, role_id)
SELECT 'a0000000-0000-0000-0000-000000000001', role_id 
FROM roles WHERE role_code = 'admin'
ON CONFLICT DO NOTHING;

-- 11. Luồng 13: Chuẩn bị & Ứng phó tình huống khẩn cấp (ISO 22000:2018 Clause 8.4)
CREATE TABLE IF NOT EXISTS emergency_contacts (
    contact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    organization_or_role VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    phone_alt VARCHAR(50),
    email VARCHAR(100),
    contact_type VARCHAR(30) DEFAULT 'INTERNAL' NOT NULL,
    priority_order INTEGER DEFAULT 1 NOT NULL,
    address VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_procedures (
    procedure_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    procedure_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    scenario_type VARCHAR(50) NOT NULL,
    likelihood INTEGER DEFAULT 2 NOT NULL,
    severity INTEGER DEFAULT 3 NOT NULL,
    risk_score INTEGER DEFAULT 6 NOT NULL,
    risk_level VARCHAR(30) DEFAULT 'MEDIUM' NOT NULL,
    immediate_actions JSONB,
    responsible_team VARCHAR(100) DEFAULT 'Đội Ứng phó Khẩn cấp & PCCC' NOT NULL,
    equipment_needed TEXT,
    version VARCHAR(20) DEFAULT '1.0' NOT NULL,
    status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_drills (
    drill_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drill_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    record_type VARCHAR(30) DEFAULT 'PLANNED_DRILL' NOT NULL,
    scenario_type VARCHAR(50) NOT NULL,
    drill_date DATE NOT NULL,
    location VARCHAR(255) NOT NULL,
    participants_count INTEGER DEFAULT 10 NOT NULL,
    drill_leader VARCHAR(100) NOT NULL,
    scenario_description TEXT,
    response_time_minutes INTEGER,
    evaluation_result VARCHAR(30) DEFAULT 'SATISFACTORY' NOT NULL,
    corrective_actions_needed TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 17. Bối cảnh tổ chức & Quản lý rủi ro (Điều 4 & 6.1 ISO 22000:2018)
CREATE TABLE IF NOT EXISTS interested_parties (
    id SERIAL PRIMARY KEY,
    party_name VARCHAR(255) NOT NULL,
    party_type VARCHAR(50) DEFAULT 'EXTERNAL' NOT NULL,
    needs_and_expectations TEXT NOT NULL,
    statutory_requirements TEXT,
    monitoring_method TEXT,
    review_frequency VARCHAR(100) DEFAULT 'Hàng năm',
    responsible_role VARCHAR(150) DEFAULT 'Ban QLCL & ATTP',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS context_risks (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    issue_category VARCHAR(50) DEFAULT 'EXTERNAL' NOT NULL,
    issue_description TEXT NOT NULL,
    interested_party_id INTEGER REFERENCES interested_parties(id) ON DELETE SET NULL,
    risk_description TEXT NOT NULL,
    opportunity_description TEXT,
    likelihood INTEGER DEFAULT 2 NOT NULL,
    severity INTEGER DEFAULT 3 NOT NULL,
    risk_score INTEGER DEFAULT 6 NOT NULL,
    treatment_strategy VARCHAR(50) DEFAULT 'MITIGATE' NOT NULL,
    action_plan TEXT NOT NULL,
    responsible_role VARCHAR(150) DEFAULT 'Ban QLCL & ATTP',
    target_date DATE,
    status VARCHAR(50) DEFAULT 'TREATING' NOT NULL,
    residual_likelihood INTEGER,
    residual_severity INTEGER,
    residual_risk_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 18. Logistics & Kiểm soát Kho (BM01-PTVC & BM02-HỦY HÀNG)
CREATE TABLE IF NOT EXISTS vehicle_inspections (
    id SERIAL PRIMARY KEY,
    inspection_code VARCHAR(50) UNIQUE NOT NULL,
    inspection_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    order_dispatch_id UUID REFERENCES order_dispatches(dispatch_id) ON DELETE SET NULL,
    vehicle_plate VARCHAR(50) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    driver_phone VARCHAR(50),
    transport_company VARCHAR(255) DEFAULT 'Đội xe Công ty',
    valid_registration_check BOOLEAN DEFAULT TRUE NOT NULL,
    cargo_integrity_check BOOLEAN DEFAULT TRUE NOT NULL,
    clean_dry_check BOOLEAN DEFAULT TRUE NOT NULL,
    no_odor_check BOOLEAN DEFAULT TRUE NOT NULL,
    pest_free_check BOOLEAN DEFAULT TRUE NOT NULL,
    inspection_result VARCHAR(30) DEFAULT 'PASS' NOT NULL,
    inspector_name VARCHAR(100) DEFAULT 'Thủ kho xuất hàng' NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disposal_records (
    id SERIAL PRIMARY KEY,
    record_code VARCHAR(50) UNIQUE NOT NULL,
    disposal_date DATE NOT NULL,
    batch_id UUID REFERENCES production_batches(batch_id) ON DELETE SET NULL,
    batch_number VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'kg' NOT NULL,
    reason TEXT NOT NULL,
    disposal_method VARCHAR(100) DEFAULT 'Tiêu hủy nhiệt và chôn lấp hợp vệ sinh' NOT NULL,
    disposal_location VARCHAR(255) DEFAULT 'Khu xử lý chất thải Nhà máy',
    witness_council TEXT DEFAULT '1. Đơn vị thực hiện hủy hàng; 2. Phòng Quản lý Chất lượng (P.QLCL); 3. Phòng ban đề xuất hủy hàng',
    status VARCHAR(50) DEFAULT 'DISPOSED' NOT NULL,
    approved_by VARCHAR(100) DEFAULT 'Giám Đốc Nhà Máy',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 19. Đánh Giá Nhà Cung Cấp Nâng Cao (BM02-KHĐGNCC, BM03, BM03-TS, BM04)
CREATE TABLE IF NOT EXISTS supplier_evaluation_plans (
    id SERIAL PRIMARY KEY,
    plan_code VARCHAR(50) UNIQUE NOT NULL,
    year INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100) DEFAULT 'Phòng Đảm Bảo Chất Lượng (QA)' NOT NULL,
    scope TEXT,
    approved_by VARCHAR(100),
    approval_status VARCHAR(30) DEFAULT 'APPROVED' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_evaluations (
    id SERIAL PRIMARY KEY,
    evaluation_code VARCHAR(50) UNIQUE NOT NULL,
    plan_id INT REFERENCES supplier_evaluation_plans(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(supplier_id) ON DELETE CASCADE NOT NULL,
    criteria_type VARCHAR(50) NOT NULL,
    evaluation_date DATE NOT NULL,
    evaluator_name VARCHAR(100) NOT NULL,
    audit_type VARCHAR(50) DEFAULT 'PERIODIC' NOT NULL,
    criteria_scores JSONB NOT NULL,
    total_score NUMERIC(5, 2) NOT NULL,
    grade VARCHAR(10) NOT NULL,
    conclusion VARCHAR(50) NOT NULL,
    corrective_actions TEXT,
    approved_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);