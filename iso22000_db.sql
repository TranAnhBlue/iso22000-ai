-- ============================================================================
-- WCERT ISO 22000:2018 - FOOD SAFETY MANAGEMENT SYSTEM (FSMS)
-- CƠ SỞ DỮ LIỆU POSTGRESQL CHUẨN HÓA TOÀN DIỆN (49 BẢNG NGHIỆP VỤ)
-- ============================================================================

-- 1. Bật các extension cần thiết cho UUID và mã hóa mật khẩu
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. PHÂN HỆ: RBAC & NGƯỜI DÙNG
-- ============================================================================

-- Bảng: departments
CREATE TABLE IF NOT EXISTS departments (
	dept_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	dept_code VARCHAR(50) NOT NULL, 
	dept_name VARCHAR(100) NOT NULL, 
	description TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (dept_id), 
	UNIQUE (dept_code), 
	UNIQUE (dept_name)
);

-- Bảng: roles
CREATE TABLE IF NOT EXISTS roles (
	role_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	role_code VARCHAR(50) NOT NULL, 
	role_name VARCHAR(100) NOT NULL, 
	description TEXT, 
	PRIMARY KEY (role_id), 
	UNIQUE (role_code)
);

-- Bảng: users
CREATE TABLE IF NOT EXISTS users (
	user_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	username VARCHAR(50) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	full_name VARCHAR(100) NOT NULL, 
	department VARCHAR(100), 
	email VARCHAR(100), 
	phone VARCHAR(20), 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (user_id), 
	UNIQUE (username)
);

-- Bảng: user_roles
CREATE TABLE IF NOT EXISTS user_roles (
	user_id UUID NOT NULL, 
	role_id UUID NOT NULL, 
	PRIMARY KEY (user_id, role_id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id) ON DELETE CASCADE, 
	FOREIGN KEY(role_id) REFERENCES roles (role_id) ON DELETE CASCADE
);

-- ============================================================================
-- 3. PHÂN HỆ: HỆ THỐNG TÀI LIỆU VĂN BẢN (DMS)
-- ============================================================================

-- Bảng: documents
CREATE TABLE IF NOT EXISTS documents (
	document_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	doc_code VARCHAR(50) NOT NULL, 
	doc_title VARCHAR(255) NOT NULL, 
	doc_type VARCHAR(50) NOT NULL, 
	current_version VARCHAR(20) NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	department VARCHAR(100), 
	standard VARCHAR(100), 
	content TEXT, 
	file_url TEXT, 
	approved_by UUID, 
	effective_date DATE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (document_id), 
	UNIQUE (doc_code), 
	FOREIGN KEY(approved_by) REFERENCES users (user_id)
);

-- ============================================================================
-- 4. PHÂN HỆ: QUẢN LÝ THAY ĐỔI HỆ THỐNG FSMS
-- ============================================================================

-- Bảng: change_requests
CREATE TABLE IF NOT EXISTS change_requests (
	change_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	change_code VARCHAR(50) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	change_type VARCHAR(50) NOT NULL, 
	description TEXT NOT NULL, 
	reason TEXT NOT NULL, 
	impact_assessment JSONB NOT NULL, 
	proposed_by_name VARCHAR(100) NOT NULL, 
	proposed_date DATE NOT NULL, 
	review_status VARCHAR(30) NOT NULL, 
	approved_by_name VARCHAR(100), 
	approval_date DATE, 
	implementation_plan TEXT, 
	implementation_date DATE, 
	verification_result TEXT, 
	verified_by_name VARCHAR(100), 
	related_ccp_ids JSONB, 
	related_document_ids JSONB, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (change_id), 
	UNIQUE (change_code)
);

-- ============================================================================
-- 5. PHÂN HỆ: SỰ KHÔNG PHÙ HỢP (NC) & HÀNH ĐỘNG KHẮC PHỤC (CAPA)
-- ============================================================================

-- Bảng: non_conformances
CREATE TABLE IF NOT EXISTS non_conformances (
	nc_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	nc_number VARCHAR(50) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	source VARCHAR(50) NOT NULL, 
	severity VARCHAR(20) NOT NULL, 
	occurred_date DATE NOT NULL, 
	occurred_location VARCHAR(150), 
	description TEXT NOT NULL, 
	immediate_action TEXT, 
	affected_lot_number VARCHAR(100), 
	affected_quantity VARCHAR(100), 
	reported_by UUID, 
	reported_by_name VARCHAR(150), 
	status VARCHAR(30), 
	created_at TIMESTAMP WITH TIME ZONE, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (nc_id), 
	UNIQUE (nc_number), 
	FOREIGN KEY(reported_by) REFERENCES users (user_id)
);

-- Bảng: capa_records
CREATE TABLE IF NOT EXISTS capa_records (
	capa_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	capa_number VARCHAR(50) NOT NULL, 
	nc_id UUID NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	root_cause_method VARCHAR(50), 
	root_cause_analysis JSONB, 
	root_cause_summary TEXT, 
	corrective_action TEXT NOT NULL, 
	preventive_action TEXT, 
	assigned_to UUID, 
	assigned_to_name VARCHAR(150), 
	assigned_dept VARCHAR(150), 
	target_date DATE NOT NULL, 
	completed_date DATE, 
	verified_by UUID, 
	verified_by_name VARCHAR(150), 
	verification_date DATE, 
	verification_result TEXT, 
	verification_status VARCHAR(30), 
	status VARCHAR(30), 
	evidence_urls JSONB, 
	created_at TIMESTAMP WITH TIME ZONE, 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (capa_id), 
	UNIQUE (capa_number), 
	FOREIGN KEY(nc_id) REFERENCES non_conformances (nc_id) ON DELETE CASCADE, 
	FOREIGN KEY(assigned_to) REFERENCES users (user_id), 
	FOREIGN KEY(verified_by) REFERENCES users (user_id)
);

-- ============================================================================
-- 6. PHÂN HỆ: TỔ CHỨC & BỐI CẢNH DOANH NGHIỆP
-- ============================================================================

-- Bảng: interested_parties
CREATE TABLE IF NOT EXISTS interested_parties (
	id SERIAL NOT NULL, 
	party_name VARCHAR(255) NOT NULL, 
	party_type VARCHAR(50) NOT NULL, 
	needs_and_expectations TEXT NOT NULL, 
	statutory_requirements TEXT, 
	monitoring_method TEXT, 
	review_frequency VARCHAR(100), 
	responsible_role VARCHAR(150), 
	status VARCHAR(50), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id)
);

-- Bảng: context_risks
CREATE TABLE IF NOT EXISTS context_risks (
	id SERIAL NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	issue_category VARCHAR(50) NOT NULL, 
	issue_description TEXT NOT NULL, 
	interested_party_id INTEGER, 
	risk_description TEXT NOT NULL, 
	opportunity_description TEXT, 
	likelihood INTEGER NOT NULL, 
	severity INTEGER NOT NULL, 
	risk_score INTEGER NOT NULL, 
	treatment_strategy VARCHAR(50), 
	action_plan TEXT NOT NULL, 
	responsible_role VARCHAR(150), 
	target_date DATE, 
	status VARCHAR(50), 
	residual_likelihood INTEGER, 
	residual_severity INTEGER, 
	residual_risk_score INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(interested_party_id) REFERENCES interested_parties (id) ON DELETE SET NULL
);

-- Bảng: food_safety_team_members
CREATE TABLE IF NOT EXISTS food_safety_team_members (
	member_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	user_id UUID, 
	member_name VARCHAR(100) NOT NULL, 
	role_in_team VARCHAR(50) NOT NULL, 
	department VARCHAR(100) NOT NULL, 
	current_position VARCHAR(100) NOT NULL, 
	qualification_and_training TEXT, 
	responsibility_description TEXT NOT NULL, 
	appointment_decision_code VARCHAR(50) NOT NULL, 
	appointment_date DATE NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (member_id), 
	FOREIGN KEY(user_id) REFERENCES users (user_id) ON DELETE SET NULL
);

-- Bảng: communications_log
CREATE TABLE IF NOT EXISTS communications_log (
	comm_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	comm_code VARCHAR(50) NOT NULL, 
	direction VARCHAR(20) NOT NULL, 
	party_type VARCHAR(30) NOT NULL, 
	party_name VARCHAR(255) NOT NULL, 
	subject VARCHAR(255) NOT NULL, 
	content TEXT NOT NULL, 
	communication_date DATE NOT NULL, 
	method VARCHAR(30) NOT NULL, 
	responsible_person VARCHAR(100) NOT NULL, 
	related_nc_id UUID, 
	attachment_url VARCHAR(500), 
	status VARCHAR(30) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (comm_id), 
	FOREIGN KEY(related_nc_id) REFERENCES non_conformances (nc_id) ON DELETE SET NULL
);

-- ============================================================================
-- 7. PHÂN HỆ: QUẢN LÝ MUA HÀNG, ĐÁNH GIÁ NHÀ CUNG CẤP & KIỂM TRA IQC
-- ============================================================================

-- Bảng: suppliers
CREATE TABLE IF NOT EXISTS suppliers (
	supplier_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	supplier_code VARCHAR(50) NOT NULL, 
	supplier_name VARCHAR(255) NOT NULL, 
	contact_info JSONB, 
	category VARCHAR(100), 
	certifications JSONB, 
	rating_score NUMERIC(5, 2) NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	risk_level VARCHAR(30), 
	evaluation_notes TEXT, 
	evaluation_date DATE, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (supplier_id), 
	UNIQUE (supplier_code)
);

-- Bảng: material_lots
CREATE TABLE IF NOT EXISTS material_lots (
	material_lot_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	lot_number VARCHAR(100) NOT NULL, 
	supplier_id UUID, 
	material_name VARCHAR(255) NOT NULL, 
	material_category VARCHAR(100), 
	received_date DATE NOT NULL, 
	mfg_date DATE, 
	exp_date DATE, 
	quantity NUMERIC(12, 2) NOT NULL, 
	unit VARCHAR(20) NOT NULL, 
	storage_condition VARCHAR(100), 
	coa_file_url TEXT, 
	status VARCHAR(30) NOT NULL, 
	created_by UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (material_lot_id), 
	UNIQUE (lot_number), 
	FOREIGN KEY(supplier_id) REFERENCES suppliers (supplier_id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by) REFERENCES users (user_id) ON DELETE SET NULL
);

-- Bảng: iqc_inspections
CREATE TABLE IF NOT EXISTS iqc_inspections (
	inspection_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	inspection_code VARCHAR(50) NOT NULL, 
	material_lot_id UUID, 
	inspector_id UUID, 
	sensory_check BOOLEAN NOT NULL, 
	packaging_check BOOLEAN NOT NULL, 
	temperature_c NUMERIC(5, 2), 
	moisture_content NUMERIC(5, 2), 
	mycotoxin_check BOOLEAN NOT NULL, 
	allergen_check BOOLEAN NOT NULL, 
	coa_compliance BOOLEAN NOT NULL, 
	defect_rate_percent NUMERIC(5, 2), 
	impurity_percent NUMERIC(5, 2), 
	size_uniformity_check BOOLEAN NOT NULL, 
	vehicle_cleanliness_check BOOLEAN NOT NULL, 
	delivery_vehicle_plate VARCHAR(30), 
	driver_name VARCHAR(100), 
	inspection_details JSONB, 
	status VARCHAR(30) NOT NULL, 
	notes TEXT, 
	inspected_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (inspection_id), 
	UNIQUE (inspection_code), 
	FOREIGN KEY(material_lot_id) REFERENCES material_lots (material_lot_id) ON DELETE CASCADE, 
	FOREIGN KEY(inspector_id) REFERENCES users (user_id) ON DELETE SET NULL
);

-- Bảng: supplier_evaluation_plans
CREATE TABLE IF NOT EXISTS supplier_evaluation_plans (
	id SERIAL NOT NULL, 
	plan_code VARCHAR(50) NOT NULL, 
	year INTEGER NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	department VARCHAR(100) NOT NULL, 
	scope TEXT, 
	approved_by VARCHAR(100), 
	approval_status VARCHAR(30) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (plan_code)
);

-- Bảng: supplier_evaluations
CREATE TABLE IF NOT EXISTS supplier_evaluations (
	id SERIAL NOT NULL, 
	evaluation_code VARCHAR(50) NOT NULL, 
	plan_id INTEGER, 
	supplier_id UUID NOT NULL, 
	criteria_type VARCHAR(50) NOT NULL, 
	evaluation_date DATE NOT NULL, 
	evaluator_name VARCHAR(100) NOT NULL, 
	audit_type VARCHAR(50) NOT NULL, 
	criteria_scores JSONB NOT NULL, 
	total_score NUMERIC(5, 2) NOT NULL, 
	grade VARCHAR(10) NOT NULL, 
	conclusion VARCHAR(50) NOT NULL, 
	corrective_actions TEXT, 
	approved_by VARCHAR(100), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	UNIQUE (evaluation_code), 
	FOREIGN KEY(plan_id) REFERENCES supplier_evaluation_plans (id) ON DELETE SET NULL, 
	FOREIGN KEY(supplier_id) REFERENCES suppliers (supplier_id) ON DELETE CASCADE
);

-- ============================================================================
-- 8. PHÂN HỆ: KẾ HOẠCH HACCP, LƯU ĐỒ CÔNG ĐOẠN & ĐIỂM KIỂM SOÁT TỚI HẠN CCP
-- ============================================================================

-- Bảng: haccp_plans
CREATE TABLE IF NOT EXISTS haccp_plans (
	plan_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	plan_code VARCHAR(50) NOT NULL, 
	plan_name VARCHAR(255) NOT NULL, 
	product_line VARCHAR(100) NOT NULL, 
	version VARCHAR(20) NOT NULL, 
	team_leader VARCHAR(100) NOT NULL, 
	approved_by VARCHAR(100), 
	effective_date DATE NOT NULL, 
	scope_description TEXT, 
	status VARCHAR(30) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (plan_id), 
	UNIQUE (plan_code)
);

-- Bảng: process_steps
CREATE TABLE IF NOT EXISTS process_steps (
	step_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	plan_id UUID, 
	step_number INTEGER NOT NULL, 
	step_name VARCHAR(255) NOT NULL, 
	product_line VARCHAR(100) NOT NULL, 
	description TEXT, 
	is_ccp_or_oprp BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (step_id), 
	FOREIGN KEY(plan_id) REFERENCES haccp_plans (plan_id) ON DELETE SET NULL
);

-- Bảng: hazard_analyses
CREATE TABLE IF NOT EXISTS hazard_analyses (
	hazard_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	step_id UUID NOT NULL, 
	hazard_type VARCHAR(50) NOT NULL, 
	hazard_name VARCHAR(255) NOT NULL, 
	potential_consequence TEXT, 
	likelihood INTEGER NOT NULL, 
	severity INTEGER NOT NULL, 
	risk_score INTEGER NOT NULL, 
	is_significant BOOLEAN NOT NULL, 
	control_measure TEXT NOT NULL, 
	q1 VARCHAR(20), 
	q2 VARCHAR(20), 
	q3 VARCHAR(20), 
	q4 VARCHAR(20), 
	classification VARCHAR(30) NOT NULL, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (hazard_id), 
	FOREIGN KEY(step_id) REFERENCES process_steps (step_id) ON DELETE CASCADE
);

-- Bảng: ccp_definitions
CREATE TABLE IF NOT EXISTS ccp_definitions (
	ccp_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	ccp_code VARCHAR(50) NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	process_step_id UUID, 
	hazard_description TEXT NOT NULL, 
	critical_limit JSONB NOT NULL, 
	monitoring_frequency VARCHAR(100) NOT NULL, 
	monitoring_method TEXT NOT NULL, 
	corrective_action_plan TEXT NOT NULL, 
	responsible_role VARCHAR(100) NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (ccp_id), 
	UNIQUE (ccp_code), 
	FOREIGN KEY(process_step_id) REFERENCES process_steps (step_id) ON DELETE SET NULL
);

-- Bảng: ccp_monitoring_logs
CREATE TABLE IF NOT EXISTS ccp_monitoring_logs (
	log_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	ccp_id UUID NOT NULL, 
	batch_number VARCHAR(100) NOT NULL, 
	checked_by UUID, 
	test_time TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	measured_value NUMERIC(8, 2) NOT NULL, 
	unit VARCHAR(20) NOT NULL, 
	measured_details JSONB, 
	is_critical_limit_exceeded BOOLEAN NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	deviation_action TEXT, 
	verification_status VARCHAR(30) NOT NULL, 
	verified_by UUID, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (log_id), 
	FOREIGN KEY(ccp_id) REFERENCES ccp_definitions (ccp_id) ON DELETE CASCADE, 
	FOREIGN KEY(checked_by) REFERENCES users (user_id) ON DELETE SET NULL, 
	FOREIGN KEY(verified_by) REFERENCES users (user_id) ON DELETE SET NULL
);

-- Bảng: haccp_plan_reviews
CREATE TABLE IF NOT EXISTS haccp_plan_reviews (
	review_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	review_code VARCHAR(50) NOT NULL, 
	plan_id UUID NOT NULL, 
	review_date DATE NOT NULL, 
	review_type VARCHAR(50) NOT NULL, 
	triggered_by_change_id UUID, 
	reviewed_by_name VARCHAR(100) NOT NULL, 
	scope_of_review TEXT NOT NULL, 
	findings TEXT NOT NULL, 
	changes_required BOOLEAN NOT NULL, 
	plan_version_before VARCHAR(20) NOT NULL, 
	plan_version_after VARCHAR(20) NOT NULL, 
	approval_status VARCHAR(30) NOT NULL, 
	approved_by_name VARCHAR(100), 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (review_id), 
	UNIQUE (review_code), 
	FOREIGN KEY(plan_id) REFERENCES haccp_plans (plan_id) ON DELETE CASCADE, 
	FOREIGN KEY(triggered_by_change_id) REFERENCES change_requests (change_id) ON DELETE SET NULL
);

-- ============================================================================
-- 9. PHÂN HỆ: CHƯƠNG TRÌNH TIÊN QUYẾT PRP & CHECKLIST GIÁM SÁT
-- ============================================================================

-- Bảng: prp_programs
CREATE TABLE IF NOT EXISTS prp_programs (
	program_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	program_code VARCHAR(50) NOT NULL, 
	program_name VARCHAR(255) NOT NULL, 
	"group" VARCHAR(50) NOT NULL, 
	scope VARCHAR(255), 
	frequency VARCHAR(50) NOT NULL, 
	responsible_dept VARCHAR(100) NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	description TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (program_id), 
	UNIQUE (program_code)
);

-- Bảng: prp_checklist_logs
CREATE TABLE IF NOT EXISTS prp_checklist_logs (
	check_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	program_id UUID NOT NULL, 
	shift_name VARCHAR(50) NOT NULL, 
	check_date DATE NOT NULL, 
	check_time VARCHAR(20), 
	checked_by UUID, 
	items_checked JSONB NOT NULL, 
	compliance_rate NUMERIC(5, 2) NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	finding_notes TEXT, 
	corrective_action TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (check_id), 
	FOREIGN KEY(program_id) REFERENCES prp_programs (program_id) ON DELETE CASCADE, 
	FOREIGN KEY(checked_by) REFERENCES users (user_id) ON DELETE SET NULL
);

-- ============================================================================
-- 10. PHÂN HỆ: QUẢN LÝ THIẾT BỊ, BẢO TRÌ PHÒNG NGỪA & HIỆU CHUẨN
-- ============================================================================

-- Bảng: equipments
CREATE TABLE IF NOT EXISTS equipments (
	equipment_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	equipment_code VARCHAR(50) NOT NULL, 
	equipment_name VARCHAR(255) NOT NULL, 
	category VARCHAR(50), 
	model VARCHAR(100), 
	serial_number VARCHAR(100), 
	manufacturer VARCHAR(150), 
	installation_location VARCHAR(150), 
	installation_date DATE, 
	criticality_level VARCHAR(30), 
	status VARCHAR(30), 
	calibration_frequency_months INTEGER, 
	last_calibration_date DATE, 
	next_calibration_due DATE, 
	calibration_status VARCHAR(30), 
	maintenance_frequency_days INTEGER, 
	last_maintenance_date DATE, 
	next_maintenance_due DATE, 
	managed_by UUID, 
	specifications JSONB, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (equipment_id), 
	UNIQUE (equipment_code), 
	FOREIGN KEY(managed_by) REFERENCES users (user_id)
);

-- Bảng: equipment_calibration_logs
CREATE TABLE IF NOT EXISTS equipment_calibration_logs (
	calibration_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	equipment_id UUID NOT NULL, 
	calibration_code VARCHAR(50) NOT NULL, 
	calibration_type VARCHAR(50), 
	calibration_date DATE NOT NULL, 
	expiry_date DATE NOT NULL, 
	agency_name VARCHAR(255), 
	certificate_number VARCHAR(100), 
	standard_applied VARCHAR(100), 
	measured_deviation NUMERIC(8, 4), 
	allowable_tolerance NUMERIC(8, 4), 
	is_passed BOOLEAN, 
	status VARCHAR(30), 
	certificate_file_url VARCHAR(500), 
	calibrated_by UUID, 
	calibrator_name VARCHAR(150), 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (calibration_id), 
	FOREIGN KEY(equipment_id) REFERENCES equipments (equipment_id) ON DELETE CASCADE, 
	UNIQUE (calibration_code), 
	FOREIGN KEY(calibrated_by) REFERENCES users (user_id)
);

-- Bảng: equipment_maintenance_logs
CREATE TABLE IF NOT EXISTS equipment_maintenance_logs (
	maintenance_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	equipment_id UUID NOT NULL, 
	maintenance_code VARCHAR(50) NOT NULL, 
	maintenance_type VARCHAR(50), 
	maintenance_date DATE NOT NULL, 
	performed_by UUID, 
	performer_name VARCHAR(150), 
	tasks_performed JSONB, 
	parts_replaced JSONB, 
	food_grade_lubricant_used BOOLEAN, 
	hygiene_sanitation_after_maint BOOLEAN, 
	cost NUMERIC(12, 2), 
	result_status VARCHAR(30), 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (maintenance_id), 
	FOREIGN KEY(equipment_id) REFERENCES equipments (equipment_id) ON DELETE CASCADE, 
	UNIQUE (maintenance_code), 
	FOREIGN KEY(performed_by) REFERENCES users (user_id)
);

-- ============================================================================
-- 11. PHÂN HỆ: QUẢN LÝ SẢN XUẤT, KHO THÔNG MINH FEFO & MẪU LƯU ĐỐI CHỨNG
-- ============================================================================

-- Bảng: production_batches
CREATE TABLE IF NOT EXISTS production_batches (
	batch_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	batch_number VARCHAR(100) NOT NULL, 
	product_name VARCHAR(255) NOT NULL, 
	product_code VARCHAR(50), 
	production_line VARCHAR(100), 
	shift VARCHAR(50), 
	planned_quantity NUMERIC(12, 2) NOT NULL, 
	actual_quantity NUMERIC(12, 2) NOT NULL, 
	unit VARCHAR(20) NOT NULL, 
	start_time TIMESTAMP WITH TIME ZONE NOT NULL, 
	end_time TIMESTAMP WITH TIME ZONE, 
	status VARCHAR(30) NOT NULL, 
	qc_inspector VARCHAR(100), 
	notes TEXT, 
	created_by UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (batch_id), 
	UNIQUE (batch_number), 
	FOREIGN KEY(created_by) REFERENCES users (user_id) ON DELETE SET NULL
);

-- Bảng: batch_material_usage
CREATE TABLE IF NOT EXISTS batch_material_usage (
	usage_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	batch_id UUID NOT NULL, 
	material_lot_id UUID, 
	material_name VARCHAR(255) NOT NULL, 
	lot_number VARCHAR(100) NOT NULL, 
	quantity_used NUMERIC(12, 2) NOT NULL, 
	unit VARCHAR(20) NOT NULL, 
	recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (usage_id), 
	FOREIGN KEY(batch_id) REFERENCES production_batches (batch_id) ON DELETE CASCADE, 
	FOREIGN KEY(material_lot_id) REFERENCES material_lots (material_lot_id) ON DELETE SET NULL
);

-- Bảng: warehouse_inventory
CREATE TABLE IF NOT EXISTS warehouse_inventory (
	inventory_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	item_code VARCHAR(50) NOT NULL, 
	item_name VARCHAR(255) NOT NULL, 
	category VARCHAR(50) NOT NULL, 
	lot_number VARCHAR(100) NOT NULL, 
	batch_id UUID, 
	qr_code VARCHAR(255) NOT NULL, 
	quantity NUMERIC(12, 2) NOT NULL, 
	unit VARCHAR(20) NOT NULL, 
	min_stock_level NUMERIC(12, 2) NOT NULL, 
	mfg_date DATE NOT NULL, 
	exp_date DATE NOT NULL, 
	warehouse_type VARCHAR(50) NOT NULL, 
	location_bin VARCHAR(50) NOT NULL, 
	temperature_c NUMERIC(5, 2), 
	status VARCHAR(30) NOT NULL, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (inventory_id), 
	FOREIGN KEY(batch_id) REFERENCES production_batches (batch_id) ON DELETE SET NULL, 
	UNIQUE (qr_code)
);

-- Bảng: order_dispatches
CREATE TABLE IF NOT EXISTS order_dispatches (
	dispatch_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	dispatch_code VARCHAR(100) NOT NULL, 
	order_number VARCHAR(100) NOT NULL, 
	customer_name VARCHAR(255) NOT NULL, 
	customer_phone VARCHAR(50), 
	destination_address VARCHAR(255), 
	batch_id UUID, 
	batch_number VARCHAR(100) NOT NULL, 
	product_name VARCHAR(255) NOT NULL, 
	quantity_dispatched NUMERIC(12, 2) NOT NULL, 
	unit VARCHAR(20) NOT NULL, 
	vehicle_number VARCHAR(50), 
	vehicle_temp_c NUMERIC(5, 2), 
	vehicle_check_status BOOLEAN NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	dispatched_by UUID, 
	dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	notes TEXT, 
	PRIMARY KEY (dispatch_id), 
	UNIQUE (dispatch_code), 
	FOREIGN KEY(batch_id) REFERENCES production_batches (batch_id) ON DELETE SET NULL, 
	FOREIGN KEY(dispatched_by) REFERENCES users (user_id) ON DELETE SET NULL
);

-- Bảng: vehicle_inspections
CREATE TABLE IF NOT EXISTS vehicle_inspections (
	id SERIAL NOT NULL, 
	inspection_code VARCHAR(50) NOT NULL, 
	inspection_date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	order_dispatch_id UUID, 
	vehicle_plate VARCHAR(50) NOT NULL, 
	driver_name VARCHAR(100) NOT NULL, 
	driver_phone VARCHAR(50), 
	transport_company VARCHAR(255), 
	valid_registration_check BOOLEAN NOT NULL, 
	cargo_integrity_check BOOLEAN NOT NULL, 
	clean_dry_check BOOLEAN NOT NULL, 
	no_odor_check BOOLEAN NOT NULL, 
	pest_free_check BOOLEAN NOT NULL, 
	inspection_result VARCHAR(30) NOT NULL, 
	inspector_name VARCHAR(100) NOT NULL, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(order_dispatch_id) REFERENCES order_dispatches (dispatch_id) ON DELETE SET NULL
);

-- Bảng: retained_samples
CREATE TABLE IF NOT EXISTS retained_samples (
	sample_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	sample_code VARCHAR(100) NOT NULL, 
	batch_id UUID, 
	batch_number VARCHAR(100) NOT NULL, 
	product_name VARCHAR(255) NOT NULL, 
	sample_weight_g NUMERIC(8, 2) NOT NULL, 
	storage_cabinet VARCHAR(100) NOT NULL, 
	storage_location VARCHAR(100), 
	storage_temperature_c NUMERIC(5, 2), 
	sample_date DATE NOT NULL, 
	expiry_date DATE NOT NULL, 
	sampled_by VARCHAR(100) NOT NULL, 
	test_result VARCHAR(30) NOT NULL, 
	test_details JSONB, 
	status VARCHAR(30) NOT NULL, 
	disposed_date DATE, 
	disposed_by VARCHAR(100), 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (sample_id), 
	UNIQUE (sample_code), 
	FOREIGN KEY(batch_id) REFERENCES production_batches (batch_id) ON DELETE SET NULL
);

-- Bảng: disposal_records
CREATE TABLE IF NOT EXISTS disposal_records (
	id SERIAL NOT NULL, 
	record_code VARCHAR(50) NOT NULL, 
	disposal_date DATE NOT NULL, 
	batch_id UUID, 
	batch_number VARCHAR(100) NOT NULL, 
	product_name VARCHAR(255) NOT NULL, 
	quantity NUMERIC(12, 2) NOT NULL, 
	unit VARCHAR(50) NOT NULL, 
	reason TEXT NOT NULL, 
	disposal_method VARCHAR(100) NOT NULL, 
	disposal_location VARCHAR(255), 
	witness_council TEXT, 
	status VARCHAR(50) NOT NULL, 
	approved_by VARCHAR(100), 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id), 
	FOREIGN KEY(batch_id) REFERENCES production_batches (batch_id) ON DELETE SET NULL
);

-- ============================================================================
-- 12. PHÂN HỆ: ĐÁNH GIÁ NỘI BỘ, ĐÀO TẠO NHÂN SỰ & HỒ SƠ SỨC KHỎE
-- ============================================================================

-- Bảng: training_courses
CREATE TABLE IF NOT EXISTS training_courses (
	course_id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	course_code VARCHAR(50) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	category VARCHAR(50) NOT NULL, 
	trainer_name VARCHAR(100) NOT NULL, 
	training_type VARCHAR(50) NOT NULL, 
	schedule_date DATE NOT NULL, 
	duration_hours NUMERIC(4, 1) NOT NULL, 
	target_dept VARCHAR(100) NOT NULL, 
	content_summary TEXT, 
	status VARCHAR(50) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
	PRIMARY KEY (course_id)
);

-- Bảng: training_participant_records
CREATE TABLE IF NOT EXISTS training_participant_records (
	participant_id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	course_id UUID NOT NULL, 
	employee_code VARCHAR(50) NOT NULL, 
	employee_name VARCHAR(100) NOT NULL, 
	department VARCHAR(100) NOT NULL, 
	position VARCHAR(100), 
	attendance_status VARCHAR(50) NOT NULL, 
	pre_test_score NUMERIC(5, 1), 
	post_test_score NUMERIC(5, 1), 
	evaluation_result VARCHAR(50) NOT NULL, 
	certificate_issued BOOLEAN NOT NULL, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
	PRIMARY KEY (participant_id), 
	FOREIGN KEY(course_id) REFERENCES training_courses (course_id) ON DELETE CASCADE
);

-- Bảng: health_declaration_records
CREATE TABLE IF NOT EXISTS health_declaration_records (
	declaration_id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	employee_code VARCHAR(50) NOT NULL, 
	employee_name VARCHAR(100) NOT NULL, 
	department VARCHAR(100) NOT NULL, 
	shift_date DATE NOT NULL, 
	shift_name VARCHAR(50) NOT NULL, 
	symptoms JSONB NOT NULL, 
	body_temperature NUMERIC(4, 1) NOT NULL, 
	personal_hygiene_check JSONB NOT NULL, 
	cleared_for_shift VARCHAR(50) NOT NULL, 
	supervisor_name VARCHAR(100) NOT NULL, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
	PRIMARY KEY (declaration_id)
);

-- Bảng: internal_audits
CREATE TABLE IF NOT EXISTS internal_audits (
	audit_id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	audit_code VARCHAR(50) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	audit_type VARCHAR(50) NOT NULL, 
	start_date DATE NOT NULL, 
	end_date DATE NOT NULL, 
	lead_auditor_name VARCHAR(100) NOT NULL, 
	lead_auditor_id UUID, 
	auditor_team JSONB, 
	audited_dept VARCHAR(100) NOT NULL, 
	audited_lead_name VARCHAR(100), 
	scope TEXT NOT NULL, 
	standard_clauses JSONB, 
	findings_summary TEXT, 
	conclusion TEXT, 
	status VARCHAR(50) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
	PRIMARY KEY (audit_id), 
	FOREIGN KEY(lead_auditor_id) REFERENCES users (user_id) ON DELETE SET NULL
);

-- Bảng: audit_findings
CREATE TABLE IF NOT EXISTS audit_findings (
	finding_id UUID DEFAULT uuid_generate_v4() NOT NULL, 
	audit_id UUID NOT NULL, 
	clause_number VARCHAR(50) NOT NULL, 
	clause_title VARCHAR(255) NOT NULL, 
	department VARCHAR(100) NOT NULL, 
	question TEXT NOT NULL, 
	evidence_reviewed TEXT, 
	result VARCHAR(50) NOT NULL, 
	finding_notes TEXT, 
	linked_nc_id UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, 
	PRIMARY KEY (finding_id), 
	FOREIGN KEY(audit_id) REFERENCES internal_audits (audit_id) ON DELETE CASCADE, 
	FOREIGN KEY(linked_nc_id) REFERENCES non_conformances (nc_id) ON DELETE SET NULL
);

-- ============================================================================
-- 13. PHÂN HỆ: DASHBOARD ĐIỀU HÀNH, MỤC TIÊU & XEM XÉT LÃNH ĐẠO
-- ============================================================================

-- Bảng: quality_objectives
CREATE TABLE IF NOT EXISTS quality_objectives (
	objective_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	objective_code VARCHAR(50) NOT NULL, 
	metric_name VARCHAR(255) NOT NULL, 
	clause_reference VARCHAR(50) NOT NULL, 
	department VARCHAR(100) NOT NULL, 
	target_year INTEGER NOT NULL, 
	target_value FLOAT NOT NULL, 
	actual_value FLOAT NOT NULL, 
	unit VARCHAR(30) NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	action_plan TEXT, 
	responsible_person VARCHAR(100) NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (objective_id)
);

-- Bảng: management_reviews
CREATE TABLE IF NOT EXISTS management_reviews (
	review_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	review_code VARCHAR(50) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	meeting_date DATE NOT NULL, 
	chairperson_name VARCHAR(100) NOT NULL, 
	secretary_name VARCHAR(100) NOT NULL, 
	participants JSON NOT NULL, 
	scope_and_inputs JSON NOT NULL, 
	meeting_minutes TEXT NOT NULL, 
	decisions_and_actions JSON NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	PRIMARY KEY (review_id)
);

-- ============================================================================
-- 14. PHÂN HỆ: CHUẨN BỊ & ỨNG PHÓ TÌNH HUỐNG KHẨN CẤP
-- ============================================================================

-- Bảng: emergency_contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
	contact_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	name VARCHAR(255) NOT NULL, 
	organization_or_role VARCHAR(255) NOT NULL, 
	phone VARCHAR(50) NOT NULL, 
	phone_alt VARCHAR(50), 
	email VARCHAR(100), 
	contact_type VARCHAR(30) NOT NULL, 
	priority_order INTEGER NOT NULL, 
	address VARCHAR(255), 
	notes TEXT, 
	is_active BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (contact_id)
);

-- Bảng: emergency_procedures
CREATE TABLE IF NOT EXISTS emergency_procedures (
	procedure_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	procedure_code VARCHAR(50) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	scenario_type VARCHAR(50) NOT NULL, 
	likelihood INTEGER NOT NULL, 
	severity INTEGER NOT NULL, 
	risk_score INTEGER NOT NULL, 
	risk_level VARCHAR(30) NOT NULL, 
	immediate_actions JSONB, 
	responsible_team VARCHAR(100) NOT NULL, 
	equipment_needed TEXT, 
	version VARCHAR(20) NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (procedure_id), 
	UNIQUE (procedure_code)
);

-- Bảng: emergency_drills
CREATE TABLE IF NOT EXISTS emergency_drills (
	drill_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	drill_code VARCHAR(50) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	record_type VARCHAR(30) NOT NULL, 
	scenario_type VARCHAR(50) NOT NULL, 
	drill_date DATE NOT NULL, 
	location VARCHAR(255) NOT NULL, 
	participants_count INTEGER NOT NULL, 
	drill_leader VARCHAR(100) NOT NULL, 
	scenario_description TEXT, 
	response_time_minutes INTEGER, 
	evaluation_result VARCHAR(30) NOT NULL, 
	corrective_actions_needed TEXT, 
	notes TEXT, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (drill_id), 
	UNIQUE (drill_code)
);

-- ============================================================================
-- 15. PHÂN HỆ: THIẾT KẾ BIỂU MẪU ĐỘNG & LƯU ĐỒ QUY TRÌNH DUYỆT
-- ============================================================================

-- Bảng: dynamic_form_templates
CREATE TABLE IF NOT EXISTS dynamic_form_templates (
	template_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	module VARCHAR(50) NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	description TEXT, 
	version VARCHAR(20) NOT NULL, 
	fields JSONB NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	created_by UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (template_id), 
	UNIQUE (code), 
	FOREIGN KEY(created_by) REFERENCES users (user_id) ON DELETE SET NULL
);

-- Bảng: dynamic_workflow_templates
CREATE TABLE IF NOT EXISTS dynamic_workflow_templates (
	workflow_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	module VARCHAR(50) NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	description TEXT, 
	version VARCHAR(20) NOT NULL, 
	nodes JSONB NOT NULL, 
	edges JSONB NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	created_by UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (workflow_id), 
	UNIQUE (code), 
	FOREIGN KEY(created_by) REFERENCES users (user_id) ON DELETE SET NULL
);

-- Bảng: workflow_instances
CREATE TABLE IF NOT EXISTS workflow_instances (
	instance_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	workflow_id UUID NOT NULL, 
	reference_id VARCHAR(100), 
	reference_type VARCHAR(50), 
	current_node_id VARCHAR(50) NOT NULL, 
	history JSONB NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	started_by UUID, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (instance_id), 
	FOREIGN KEY(workflow_id) REFERENCES dynamic_workflow_templates (workflow_id) ON DELETE CASCADE, 
	FOREIGN KEY(started_by) REFERENCES users (user_id) ON DELETE SET NULL
);

-- Bảng: dynamic_form_submissions
CREATE TABLE IF NOT EXISTS dynamic_form_submissions (
	submission_id UUID DEFAULT gen_random_uuid() NOT NULL, 
	template_id UUID NOT NULL, 
	reference_id VARCHAR(100), 
	reference_type VARCHAR(50), 
	submitted_by UUID, 
	submitted_by_name VARCHAR(100), 
	form_data JSONB NOT NULL, 
	score NUMERIC(5, 2), 
	status VARCHAR(30) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), 
	PRIMARY KEY (submission_id), 
	FOREIGN KEY(template_id) REFERENCES dynamic_form_templates (template_id) ON DELETE CASCADE, 
	FOREIGN KEY(submitted_by) REFERENCES users (user_id) ON DELETE SET NULL
);

-- ============================================================================
-- 16. DỮ LIỆU NỀN TẢNG KHỞI TẠO HỆ THỐNG (BẢO LƯU RBAC, PHÒNG BAN & ADMIN)
-- ============================================================================

-- Danh mục 7 Phòng ban tiêu chuẩn nhà máy chế biến thực phẩm
INSERT INTO departments (dept_id, dept_code, dept_name, description) VALUES
('b0000000-0000-0000-0000-000000000001', 'DEPT-BGD', 'Ban Giám đốc', 'Ban Giám đốc & Ban Lãnh đạo điều hành nhà máy'),
('b0000000-0000-0000-0000-000000000002', 'DEPT-QLCL', 'Ban QLCL & ATTP', 'Ban Quản lý Chất lượng, Đội HACCP & An toàn thực phẩm'),
('b0000000-0000-0000-0000-000000000003', 'DEPT-SX', 'Phòng Sản xuất', 'Bộ phận chế biến, điều hành các dây chuyền sản xuất & GMP'),
('b0000000-0000-0000-0000-000000000004', 'DEPT-KDK', 'Phòng Kinh doanh & Kho', 'Bộ phận kinh doanh, kho lạnh FEFO & logistics chuỗi cung ứng'),
('b0000000-0000-0000-0000-000000000005', 'DEPT-TB', 'Phòng Thiết bị', 'Bộ phận cơ điện, bảo trì bảo dưỡng máy móc & hiệu chuẩn'),
('b0000000-0000-0000-0000-000000000006', 'DEPT-HCKT', 'Phòng Hành chính - Kế toán', 'Bộ phận nhân sự, tiền lương, đào tạo ATTP & y tế sức khỏe'),
('b0000000-0000-0000-0000-000000000007', 'DEPT-IT', 'Quản trị hệ thống', 'Bộ phận CNTT, bảo mật hệ thống dữ liệu số & quản trị phần mềm')
ON CONFLICT (dept_name) DO UPDATE SET dept_code = EXCLUDED.dept_code, description = EXCLUDED.description;

-- Danh mục 6 Vai trò hệ thống tiêu chuẩn (RBAC)
INSERT INTO roles (role_id, role_code, role_name, description) VALUES
('c0000000-0000-0000-0000-000000000001', 'admin', 'Quản trị hệ thống', 'Toàn quyền cấu hình, quản trị người dùng, RBAC, phân quyền và nhật ký hệ thống'),
('c0000000-0000-0000-0000-000000000002', 'management', 'Ban Giám đốc', 'Phê duyệt chính sách, ký duyệt xem xét lãnh đạo, thẩm tra kế hoạch thu hồi'),
('c0000000-0000-0000-0000-000000000003', 'qa_qc_manager', 'Ban QLCL & ATTP', 'Quản lý HACCP, chương trình PRP, thẩm tra hiệu lực CAPA, đánh giá nội bộ'),
('c0000000-0000-0000-0000-000000000004', 'production', 'Phòng Sản xuất', 'Thực thi GMP, giám sát đo đạc CCP theo ca, lập mẻ sản xuất'),
('c0000000-0000-0000-0000-000000000005', 'staff', 'Cán bộ nhân viên', 'Tra cứu tài liệu quy trình, thực hiện checklist vệ sinh, báo cáo sự không phù hợp'),
('c0000000-0000-0000-0000-000000000006', 'user', 'Người dùng mới', 'Tài khoản mới đăng ký, chờ phân quyền truy cập')
ON CONFLICT (role_code) DO UPDATE SET role_name = EXCLUDED.role_name, description = EXCLUDED.description;

-- Tài khoản Quản trị viên hệ thống mặc định (Tên đăng nhập: admin / Mật khẩu: 123456)
INSERT INTO users (user_id, username, password_hash, full_name, department, email, phone, is_active) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'admin',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6FeE6.gJ2I5v.cE8.',
    'Quản trị viên hệ thống',
    'Quản trị hệ thống',
    'admin@wcert.vn',
    '0901234567',
    TRUE
)
ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name, is_active = EXCLUDED.is_active;

-- Gán quyền Quản trị tối cao (admin) cho tài khoản admin
INSERT INTO user_roles (user_id, role_id)
SELECT 'a0000000-0000-0000-0000-000000000001', role_id
FROM roles WHERE role_code = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
