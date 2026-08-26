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
    material_lot_id UUID REFERENCES material_lots(material_lot_id),
    inspector_id UUID REFERENCES users(user_id),
    sensory_check BOOLEAN DEFAULT TRUE,
    moisture_content NUMERIC(5,2),
    mycotoxin_check BOOLEAN DEFAULT TRUE,
    allergen_check BOOLEAN DEFAULT FALSE,
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

-- Nạp sẵn 8 Vai trò (Roles) chuẩn vào hệ thống
INSERT INTO roles (role_code, role_name, description) VALUES
('ADMIN', 'Quản trị hệ thống', 'Toàn quyền cấu hình, RBAC, audit log'),
('MANAGEMENT', 'Ban Giám đốc', 'Phê duyệt tài liệu, xem xét lãnh đạo, duyệt thu hồi'),
('QA_QC_MANAGER', 'Ban QLCL & ATTP', 'Quản lý HACCP, PRP, CAPA, đánh giá nội bộ'),
('PRODUCTION', 'Phòng Sản xuất', 'Thực hiện GMP, ghi nhận CCP, tạo mẻ sản xuất'),
('HR_ACCOUNTING', 'Phòng Hành chính - Kế toán', 'Quản lý nhân sự, đào tạo, hồ sơ sức khỏe'),
('SALES_LOGISTICS', 'Phòng Kinh doanh & Kho', 'Quản lý kho FEFO, giao hàng, truy xuất nguồn gốc'),
('MAINTENANCE', 'Phòng Thiết bị', 'Bảo trì máy móc, hiệu chuẩn thiết bị đo'),
('STAFF', 'Cán bộ nhân viên', 'Tra cứu quy trình, xem lịch đào tạo, báo cáo NC');

-- Thêm role 'user' (Tài khoản người dùng cơ bản/chờ phân quyền)
INSERT INTO roles (role_code, role_name, description)
VALUES ('user', 'Người dùng chưa phân quyền', 'Tài khoản mới đăng ký, chờ quản trị viên cấp quyền')
ON CONFLICT (role_code) DO NOTHING;

-- Đảm bảo đã có role admin và user
INSERT INTO roles (role_code, role_name, description)
VALUES 
('admin', 'Quản trị hệ thống', 'Toàn quyền cấu hình, RBAC, audit log'),
('user', 'Người dùng chưa phân quyền', 'Tài khoản mới, chờ quản trị viên cấp quyền')
ON CONFLICT (role_code) DO NOTHING;

-- Tạo tài khoản admin mặc định (password: 123456)
INSERT INTO users (user_id, username, password_hash, full_name, department, email, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6FeE6.gJ2I5v.cE8.',
    'Quản trị viên hệ thống',
    'Phòng CNTT & Hệ thống',
    'admin@wcert.vn',
    TRUE
)
ON CONFLICT (username) DO NOTHING;

-- Gán quyền admin cho tài khoản admin
INSERT INTO user_roles (user_id, role_id)
SELECT 'a0000000-0000-0000-0000-000000000001', role_id 
FROM roles WHERE role_code = 'admin'
ON CONFLICT DO NOTHING;