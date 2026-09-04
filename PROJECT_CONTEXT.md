# WCERT – Hệ Thống Quản Lý An Toàn Thực Phẩm (FSMS – ISO 22000:2018 AI Hub)

## 📌 Tổng quan Dự án
Hệ thống chuyển đổi số toàn diện quy trình Quản lý An toàn Thực phẩm theo tiêu chuẩn quốc tế **ISO 22000:2018**, tích hợp **Trợ lý Trí tuệ Nhân tạo (AI Assistant)** nhằm tối ưu hoá việc giám sát CCP, phân tích mối nguy HACCP, quản lý CAPA, truy xuất nguồn gốc và kiểm soát tài liệu.

---

## 🛠️ Kiến trúc Công nghệ & Cấu trúc Dự án

### 1. Backend (FastAPI - Python 3.14+)
- **Framework:** FastAPI (RESTful API, OpenAPI/Swagger Docs tại `/docs`)
- **ORM & Database Driver:** SQLAlchemy 2.0 (Mapped Column Type-Safe), asyncpg / psycopg2
- **Database:** PostgreSQL 16+ (Hỗ trợ UUID extension `uuid-ossp`, JSONB)
- **Xác thực & Bảo mật:** OAuth2 Password Bearer, JWT Token (`python-jose`), `passlib` (bcrypt)
- **Kiến trúc Layered Clean Architecture:**
  - `backend/app/core/`: Cấu hình hệ thống, kết nối cơ sở dữ liệu (`database.py`), bảo mật & mã hóa JWT (`security.py`).
  - `backend/app/models/`: Định nghĩa SQLAlchemy ORM Models (`user.py`, `document.py`, `purchasing.py`, `haccp.py`,...).
  - `backend/app/schemas/`: Định nghĩa Pydantic v2 validation schemas (`auth.py`, `organization.py`, `document.py`, `purchasing.py`, `haccp.py`,...).
  - `backend/app/api/v1/endpoints/`: Định nghĩa các API endpoints theo từng phân hệ (`auth.py`, `organization.py`, `documents.py`, `purchasing.py`, `haccp.py`).
  - `backend/app/main.py`: Entrypoint cấu hình CORS, Auto Database Migration & Router Registration.

### 2. Frontend (TanStack Start / React 19)
- **Framework:** React 19 + TanStack Start (SSR + CSR) / TanStack Router + Vite
- **UI & Styling:** Tailwind CSS v4, Radix UI Primitives, Lucide React Icons, Sonner (Toasts)
- **State & Data Fetching:** TanStack Query v5, Axios với Auth Interceptor
- **RBAC Client:** `lib/rbac.tsx` phân quyền theo vai trò người dùng (Admin, Ban Giám đốc, QA/QC, Sản xuất, Mua hàng, Bảo trì, Kho, Đánh giá viên).

---

## 🗄️ Chi tiết Cơ sở Dữ liệu & Bảng Schema (`iso22000_db.sql`)

Cơ sở dữ liệu được chuẩn hóa cho toàn bộ 10 luồng nghiệp vụ ISO 22000:
1. **Phân quyền động (Dynamic RBAC), Phòng Ban & Người dùng:**
   - `departments`: `dept_id` (UUID PK), `dept_code` (Unique), `dept_name` (Unique), `description`, `created_at`. Gồm 7 phòng ban chuẩn: *Ban Giám đốc, Ban QLCL & ATTP, Phòng Sản xuất, Phòng Kinh doanh & Kho, Phòng Thiết bị, Phòng Hành chính - Kế toán, Quản trị hệ thống*.
   - `roles`: `role_id` (UUID PK), `role_code` (Unique), `role_name`, `description`. Gồm 8 vai trò nghiệp vụ: *admin, management, qa_qc_manager, production, sales_logistics, maintenance, hr_accounting, staff* (+ user).
   - `permissions`: `permission_id` (UUID PK), `permission_code` (Unique), `module`, `description`.
   - `role_permissions`: Bảng liên kết nhiều - nhiều giữa `roles` và `permissions`.
   - `users`: `user_id` (UUID PK), `username`, `password_hash`, `full_name`, `department`, `email`, `phone`, `is_active`, `created_at`.
   - `user_roles`: Bảng liên kết nhiều - nhiều giữa `users` và `roles`.
2. **Audit Logs, Tệp đính kèm & Thông báo:**
   - `file_attachments`: Quản lý lưu trữ tệp số hóa của hệ thống.
   - `audit_logs`: Ghi vết lịch sử thao tác dữ liệu.
   - `notifications`: Cảnh báo và thông báo nội bộ.
3. **Kiểm soát Tài liệu (DMS - Luồng 7 - Phase 2):**
   - `documents`: `document_id` (UUID PK), `doc_code` (Unique), `doc_title`, `doc_type` (POLICY, MANUAL, SOP, WI, FORM, RECORD), `department`, `standard` (Default 'ISO 22000:2018'), `current_version`, `status` (DRAFT, APPROVED, PENDING_APPROVAL, OBSOLETE), `file_url`, `approved_by` (FK `users`), `effective_date`, `created_at`.
4. **Nhà cung cấp & IQC Nguyên liệu (Luồng 1 - Phase 3):** 
   - `suppliers`: `supplier_id` (UUID PK), `supplier_code` (Unique), `supplier_name`, `contact_info` (JSONB), `category`, `certifications` (JSONB), `rating_score`, `status`, `risk_level`, `evaluation_notes`, `evaluation_date`, `created_at`.
   - `material_lots`: `material_lot_id` (UUID PK), `lot_number` (Unique), `supplier_id` (FK `suppliers`), `material_name`, `material_category`, `received_date`, `mfg_date`, `exp_date`, `quantity`, `unit`, `storage_condition`, `coa_file_url`, `status`, `created_by` (FK `users`), `created_at`.
   - `iqc_inspections`: `inspection_id` (UUID PK), `inspection_code` (Unique), `material_lot_id` (FK `material_lots`), `inspector_id` (FK `users`), `sensory_check`, `packaging_check`, `temperature_c`, `moisture_content`, `mycotoxin_check`, `allergen_check`, `coa_compliance`, `inspection_details` (JSONB), `status`, `notes`, `inspected_at`.
5. **Kế hoạch HACCP, Giám sát CCP & Chương trình Tiên quyết PRP (Luồng 2 - Phase 4):**
   - `process_steps`: `step_id` (UUID PK), `step_number`, `step_name`, `product_line`, `description`, `is_ccp_or_oprp`, `created_at`.
   - `hazard_analyses`: `hazard_id` (UUID PK), `step_id` (FK `process_steps`), `hazard_type`, `hazard_name`, `potential_consequence`, `likelihood`, `severity`, `risk_score`, `is_significant`, `control_measure`, `q1`, `q2`, `q3`, `q4`, `classification` (CCP, OPRP, PRP, NOT_SIGNIFICANT), `notes`, `created_at`.
   - `ccp_definitions`: `ccp_id` (UUID PK), `ccp_code` (Unique), `name`, `process_step_id` (FK `process_steps`), `hazard_description`, `critical_limit` (JSONB: `{param, min_val, max_val, unit, condition_text}`), `monitoring_frequency`, `monitoring_method`, `corrective_action_plan`, `responsible_role`, `status`, `created_at`.
   - `ccp_monitoring_logs`: `log_id` (UUID PK), `ccp_id` (FK `ccp_definitions`), `batch_number`, `checked_by` (FK `users`), `test_time`, `measured_value`, `unit`, `measured_details` (JSONB), `is_critical_limit_exceeded`, `status` (NORMAL, WARNING, CRITICAL), `deviation_action`, `verification_status`, `verified_by` (FK `users`), `notes`, `created_at`.
   - `prp_programs`: `program_id` (UUID PK), `program_code` (Unique), `program_name`, `group` (GMP, SSOP, 5S, PEST_CONTROL, WATER_SAFETY), `scope`, `frequency`, `responsible_dept`, `status`, `description`, `created_at`.
   - `prp_checklist_logs`: `check_id` (UUID PK), `program_id` (FK `prp_programs`), `shift_name`, `check_date`, `check_time`, `checked_by` (FK `users`), `items_checked` (JSONB), `compliance_rate`, `status` (COMPLIANT, ACTION_REQUIRED, NON_COMPLIANT), `finding_notes`, `corrective_action`, `created_at`.
6. **Kho FEFO, Lưu Mẫu & Truy Xuất Nguồn Gốc (Luồng 3 & 4 - Phase 6):**
   - `materials`, `batches`, `finished_products`, `traceability_logs`.
   - Sơ đồ phả hệ cây truy vết ngược/xuôi (Backward/Forward Traceability 4 tầng), mã QR ma trận RFC thực tế, kho biệt trữ an toàn.
7. **Thiết Bị, Bảo Trì & Hiệu Chuẩn (Luồng 2 - Phase 5):**
   - `equipments`: `equipment_id` (UUID PK), `equipment_code`, `equipment_name`, `category`, `location`, `status`, `specs` (JSONB).
   - `equipment_maintenance_logs`: `log_id` (UUID PK), `equipment_id` (FK), `maintenance_type`, `food_grade_lube_used` (NSF H1), `sanitation_post_maintenance`, `performed_by`.
   - `equipment_calibration_logs`: `log_id` (UUID PK), `equipment_id` (FK), `calibration_agency` (QUATEST/VILAS), `certificate_number`, `calibration_result`, `valid_until`.
8. **Sự Không Phù Hợp & Hành Động Khắc Phục CAPA (Luồng 5 - Phase 7):**
   - `non_conformances`: `nc_id` (UUID PK), `nc_number` (Unique), `title`, `source` (AUDIT, CCP_DEVIATION, CUSTOMER_COMPLAINT, IQC, STORAGE, QC_INSPECTION), `severity` (CRITICAL, MAJOR, MINOR), `occurred_date`, `occurred_location`, `description`, `immediate_action` (ISO 8.9.2), `affected_lot_number`, `affected_quantity`, `reported_by_name`, `status` (OPEN, INVESTIGATING, CAPA_CREATED, CLOSED).
   - `capa_records`: `capa_id` (UUID PK), `nc_id` (FK `non_conformances.nc_id`), `capa_number` (Unique), `title`, `root_cause_method` (5_WHYS, FISHBONE_5M), `root_cause_analysis` (JSONB), `root_cause_summary`, `corrective_action` (ISO 8.9.3), `preventive_action` (ISO 10.1), `assigned_to_name`, `assigned_dept`, `target_date`, `completed_date`, `verified_by_name`, `verification_date`, `verification_result`, `verification_status` (PENDING_VERIFY, EFFECTIVE, INEFFECTIVE), `status` (IN_PROGRESS, IMPLEMENTED, VERIFIED, CLOSED).
9. **Studio Biểu Mẫu Động & Lưu Đồ Quy Trình Phê Duyệt (`/builder`):**
   - `form_templates`: `template_id` (UUID PK), `template_code` (Unique), `title`, `module`, `fields` (JSONB), `version`, `is_active`.
   - `form_submissions`: `submission_id` (UUID PK), `template_id` (FK), `submitted_by_name`, `form_data` (JSONB), `status`.
   - `workflows`: `workflow_id` (UUID PK), `workflow_code` (Unique), `name`, `module`, `nodes` (JSONB), `edges` (JSONB), `version`, `status`.
10. **Đánh Giá Nội Bộ & Đào Tạo Nhân Sự (Luồng 6 - Phase 8):**
    - `internal_audits`, `audit_findings`, `audit_checklists`, `training_courses`, `training_records`, `health_declarations`.

---

## 📡 Danh mục Chi tiết Backend API & Mô tả Xử lý

### 1. Phân hệ Xác thực (`/api/v1/auth`) — [auth.py](file:///c:/Users/admin/Documents/GitHub/iso22000-ai/backend/app/api/v1/endpoints/auth.py)
| Phương thức | Endpoint | Tham số / Payload | Mô tả & Xử lý Nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | `OAuth2PasswordRequestForm` (`username`, `password`) | Xác thực tài khoản, kiểm tra mật khẩu bcrypt, kiểm tra trạng thái hoạt động (`is_active`). Trả về JWT Access Token kèm thông tin user và danh sách vai trò (`roles`). |
| `POST` | `/api/v1/auth/register` | `UserRegister` (`username`, `password`, `full_name`, `department`, `email`, `phone`) | Tạo tài khoản mới, mã hóa mật khẩu, tự động liên kết phòng ban/role đăng ký. |
| `GET` | `/api/v1/auth/me` | Header `Authorization: Bearer <token>` | Lấy thông tin tài khoản hiện tại từ Token, cập nhật quyền hạn realtime cho Frontend. |
| `GET` | `/api/v1/auth/departments` | Không có | Lấy danh sách 7 phòng ban chuẩn mực trực tiếp từ bảng cơ sở dữ liệu `departments` để hiển thị trong form đăng ký và các dropdown phân công trách nhiệm. |

---

### 2. Phân hệ Tổ chức & Phân quyền (`/api/v1/organization`) — [organization.py](file:///Users/na/Documents/GitHub/iso22000-ai/backend/app/api/v1/endpoints/organization.py)
| Phương thức | Endpoint | Tham số / Payload | Mô tả & Xử lý Nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/organization/users` | Không có | Lấy danh sách người dùng kèm vai trò, phòng ban. |
| `POST` | `/api/v1/organization/users` | `UserCreate` | Tạo mới người dùng, mã hóa mật khẩu, gán vai trò tương ứng. |
| `PUT` | `/api/v1/organization/users/{user_id}` | `user_id`, `UserUpdate` | Cập nhật thông tin họ tên, phòng ban, trạng thái hoạt động. |
| `DELETE` | `/api/v1/organization/users/{user_id}` | `user_id` | Xóa tài khoản người dùng khỏi hệ thống. |
| `GET` | `/api/v1/organization/departments` | Không có | Lấy danh sách phòng ban từ bảng `departments` kèm đếm số lượng nhân sự thực tế theo từng phòng ban (`SELECT count(*) FROM users`). |
| `POST` | `/api/v1/organization/departments` | `DepartmentCreate` | Thêm mới phòng ban. |
| `PUT` | `/api/v1/organization/departments/{dept_id}` | `dept_id`, `DepartmentUpdate` | Cập nhật tên phòng ban và mô tả. |
| `DELETE` | `/api/v1/organization/departments/{dept_id}` | `dept_id` | Xóa phòng ban khỏi hệ thống. |

---

### 3. Phân hệ Kiểm soát Tài liệu & SOP (`/api/v1/documents`) — [documents.py](file:///c:/Users/admin/Documents/GitHub/iso22000-ai/backend/app/api/v1/endpoints/documents.py)
| Phương thức | Endpoint | Tham số / Payload | Mô tả & Xử lý Nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/documents` | Query: `q`, `doc_type`, `status_filter`, `department` | Lấy danh sách tài liệu SOP, Chính sách, Hướng dẫn công việc kèm bộ lọc. Tự động seed tài liệu ISO chuẩn nếu bảng rỗng. |
| `POST` | `/api/v1/documents` | `DocumentCreate` | Tạo mới tài liệu số hoá kèm phiên bản ban đầu `0.1` hoặc `1.0`. |
| `GET` | `/api/v1/documents/{id}` | `document_id` (UUID) | Lấy chi tiết thông tin tài liệu. |
| `PUT` | `/api/v1/documents/{id}` | `document_id`, `DocumentUpdate` | Cập nhật thông tin, thay đổi phiên bản hoặc đường dẫn tệp tài liệu. |
| `DELETE` | `/api/v1/documents/{id}` | `document_id` (UUID) | Xóa tài liệu khỏi hệ thống. |
| `POST` | `/api/v1/documents/{id}/approve` | `document_id` (UUID) | Phê duyệt nhanh tài liệu 1 chạm, chuyển trạng thái thành `APPROVED`. |

---

### 4. Phân hệ Mua hàng, Nhà cung cấp & Kiểm định IQC (`/api/v1/purchasing`) — [purchasing.py](file:///c:/Users/admin/Documents/GitHub/iso22000-ai/backend/app/api/v1/endpoints/purchasing.py)
| Phương thức | Endpoint | Tham số / Payload | Mô tả & Xử lý Nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/purchasing/stats` | Không có | Thống kê tổng quan KPI: Tổng NCC, NCC ASL Đạt chuẩn, Lô nguyên liệu tiếp nhận, Tỷ lệ IQC Đạt (%). |
| `GET` | `/api/v1/purchasing/suppliers` | Query: `q`, `category`, `status_filter`, `risk_level` | Lấy danh bạ NCC (ASL), tự động tính số lượng lô và tỷ lệ đạt IQC của từng NCC. Nạp sẵn 6 NCC mẫu. |
| `POST` | `/api/v1/purchasing/suppliers` | `SupplierCreate` | Thêm mới NCC vào Danh bạ NCC được phê duyệt (ASL). |
| `GET` | `/api/v1/purchasing/suppliers/{id}` | `supplier_id` (UUID) | Lấy chi tiết hồ sơ pháp lý, chứng chỉ ATTP, điểm đánh giá và lịch sử giao hàng của NCC. |
| `PUT` | `/api/v1/purchasing/suppliers/{id}` | `supplier_id`, `SupplierUpdate` | Cập nhật thông tin NCC, điều chỉnh điểm đánh giá hoặc trạng thái phê duyệt. |
| `DELETE`| `/api/v1/purchasing/suppliers/{id}` | `supplier_id` (UUID) | Xóa NCC khỏi hệ thống (cascade xóa lô & biên bản liên quan). |
| `GET` | `/api/v1/purchasing/lots` | Query: `q`, `supplier_id`, `status_filter`, `category` | Danh sách lô nguyên vật liệu tiếp nhận với số lô, hạn sử dụng FEFO, điều kiện bảo quản và trạng thái IQC. |
| `POST` | `/api/v1/purchasing/lots` | `MaterialLotCreate` | Tiếp nhận lô nguyên vật liệu mới, gán trạng thái mặc định `PENDING_IQC`. |
| `GET` | `/api/v1/purchasing/lots/{id}` | `lot_id` (UUID) | Lấy chi tiết thông tin lô nguyên liệu và kết quả kiểm định IQC mới nhất. |
| `PUT` | `/api/v1/purchasing/lots/{id}` | `lot_id`, `MaterialLotUpdate` | Cập nhật thông tin lô nguyên liệu, số lượng hoặc cập nhật tệp COA. |
| `DELETE`| `/api/v1/purchasing/lots/{id}` | `lot_id` (UUID) | Xóa lô nguyên liệu khỏi kho tiếp nhận. |
| `GET` | `/api/v1/purchasing/inspections` | Query: `q`, `status_filter`, `material_lot_id` | Danh sách biên bản kiểm định IQC kèm kết quả cảm quan, độ ẩm, nhiệt độ xe, độc tố vi nấm và COA. |
| `POST` | `/api/v1/purchasing/inspections` | `IQCInspectionCreate` | Lập biên bản kiểm định IQC; tự động đồng bộ trạng thái Lô (`APPROVED`/`REJECTED`/`QUARANTINE`) và tự động cập nhật điểm tín nhiệm của NCC. |
| `GET` | `/api/v1/purchasing/inspections/{id}` | `inspection_id` (UUID) | Chi tiết biên bản kiểm định IQC. |
| `PUT` | `/api/v1/purchasing/inspections/{id}` | `inspection_id`, `IQCInspectionUpdate` | Cập nhật kết quả kiểm định IQC và tự động đồng bộ lại trạng thái lô nguyên liệu. |
| `DELETE`| `/api/v1/purchasing/inspections/{id}` | `inspection_id` (UUID) | Xóa biên bản IQC. |
| `POST` | `/api/v1/purchasing/ai/analyze-coa` | `AICoAAnalysisRequest` (`material_name`, `sample_type`, `coa_text`) | Trợ lý AI Thẩm định Phiếu COA: Đối chiếu tự động các chỉ tiêu vi sinh (Salmonella, E.coli), kim loại nặng (Pb, Cd), độc tố Aflatoxin theo QCVN/Codex. |
| `POST` | `/api/v1/purchasing/ai/evaluate-supplier`| `AISupplierEvaluationRequest` (`supplier_id`) | Trợ lý AI Đánh giá Hiệu suất NCC: Phân tích lịch sử IQC, tỷ lệ lỗi để tính điểm đề xuất và khuyến nghị kiểm soát. |

---

### 5. Phân hệ Kế hoạch HACCP, Giám sát CCP & Vệ sinh PRP (`/api/v1/haccp`) — [haccp.py](file:///c:/Users/admin/Documents/GitHub/iso22000-ai/backend/app/api/v1/endpoints/haccp.py)
| Phương thức | Endpoint | Tham số / Payload | Mô tả & Xử lý Nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/haccp/stats` | Không có | Thống kê tổng quan KPI HACCP & PRP: Tổng công đoạn, mối nguy, điểm CCP hoạt động, tỷ lệ đo đạc trong ngưỡng (%), cảnh báo sát ngưỡng, tỷ lệ tuân thủ PRP theo ca. Nạp sẵn seed data mẫu chuẩn nếu database rỗng. |
| `GET` | `/api/v1/haccp/process-steps` | Query: `q`, `product_line` | Lấy danh sách các công đoạn sản xuất trong lưu đồ quy trình kèm đếm số lượng mối nguy. |
| `POST` | `/api/v1/haccp/process-steps` | `ProcessStepCreate` | Thêm mới công đoạn vào lưu đồ quy trình sản xuất. |
| `GET` | `/api/v1/haccp/process-steps/{id}` | `step_id` (UUID) | Lấy chi tiết công đoạn sản xuất. |
| `PUT` | `/api/v1/haccp/process-steps/{id}` | `step_id`, `ProcessStepUpdate` | Cập nhật thông tin công đoạn sản xuất. |
| `DELETE`| `/api/v1/haccp/process-steps/{id}` | `step_id` (UUID) | Xóa công đoạn khỏi lưu đồ (cascade xóa các mối nguy liên quan). |
| `GET` | `/api/v1/haccp/hazards` | Query: `step_id`, `hazard_type`, `classification`, `q` | Lấy danh sách phân tích mối nguy (Sinh học, Hóa học, Vật lý, Dị nguyên) kèm điểm rủi ro L × S và Cây quyết định Codex Q1-Q4. |
| `POST` | `/api/v1/haccp/hazards` | `HazardAnalysisCreate` | Thêm mới mối nguy; tự động tính toán Risk = Likelihood × Severity và cập nhật cờ `is_ccp_or_oprp` cho công đoạn liên kết. |
| `GET` | `/api/v1/haccp/hazards/{id}` | `hazard_id` (UUID) | Lấy chi tiết mối nguy phân tích. |
| `PUT` | `/api/v1/haccp/hazards/{id}` | `hazard_id`, `HazardAnalysisUpdate` | Cập nhật mối nguy và tự động tính lại điểm rủi ro. |
| `DELETE`| `/api/v1/haccp/hazards/{id}` | `hazard_id` (UUID) | Xóa mối nguy khỏi bảng phân tích. |
| `GET` | `/api/v1/haccp/ccp-definitions` | Query: `status_filter`, `q` | Lấy danh sách điểm kiểm soát tới hạn CCP / oPRP kèm giá trị đo gần nhất và trạng thái vận hành. |
| `POST` | `/api/v1/haccp/ccp-definitions` | `CCPDefinitionCreate` | Khai báo điểm kiểm soát tới hạn CCP / oPRP mới kèm cấu hình Critical Limit (Min, Max, Unit, Condition). |
| `GET` | `/api/v1/haccp/ccp-definitions/{id}` | `ccp_id` (UUID) | Lấy chi tiết điểm kiểm soát tới hạn. |
| `PUT` | `/api/v1/haccp/ccp-definitions/{id}` | `ccp_id`, `CCPDefinitionUpdate` | Cập nhật thông số giới hạn tới hạn hoặc kế hoạch hành động khắc phục của CCP. |
| `DELETE`| `/api/v1/haccp/ccp-definitions/{id}` | `ccp_id` (UUID) | Xóa điểm kiểm soát tới hạn khỏi hệ thống. |
| `GET` | `/api/v1/haccp/ccp-logs` | Query: `ccp_id`, `batch_number`, `status_filter` | Danh sách nhật ký đo đạc thông số CCP theo ca/mẻ sản xuất. |
| `POST` | `/api/v1/haccp/ccp-logs` | `CCPMonitoringLogCreate` | Ghi nhận kết quả đo đạc CCP; tự động đối chiếu giá trị đo với Critical Limits để phát hiện vi phạm (`CRITICAL`), cảnh báo sát ngưỡng (`WARNING`), hoặc trong ngưỡng (`NORMAL`). |
| `GET` | `/api/v1/haccp/ccp-logs/{id}` | `log_id` (UUID) | Lấy chi tiết bản ghi đo đạc CCP. |
| `PUT` | `/api/v1/haccp/ccp-logs/{id}` | `log_id`, `CCPMonitoringLogUpdate` | Cập nhật bản ghi đo đạc CCP hoặc cập nhật biên bản xử lý sự cố. |
| `DELETE`| `/api/v1/haccp/ccp-logs/{id}` | `log_id` (UUID) | Xóa bản ghi đo đạc CCP. |
| `GET` | `/api/v1/haccp/prp-programs` | Query: `group`, `status_filter`, `q` | Lấy danh mục chương trình tiên quyết GMP / SSOP / 5S / Kiểm soát dịch hại. |
| `POST` | `/api/v1/haccp/prp-programs` | `PRPProgramCreate` | Thêm mới chương trình tiên quyết vào thư viện quy chuẩn nhà máy. |
| `PUT` | `/api/v1/haccp/prp-programs/{id}` | `program_id`, `PRPProgramUpdate` | Cập nhật thông tin chương trình tiên quyết. |
| `DELETE`| `/api/v1/haccp/prp-programs/{id}` | `program_id` (UUID) | Xóa chương trình tiên quyết khỏi hệ thống. |
| `GET` | `/api/v1/haccp/prp-checklists` | Query: `program_id`, `shift_name`, `status_filter`, `check_date_filter` | Danh sách nhật ký checklist kiểm tra PRP theo ca. |
| `POST` | `/api/v1/haccp/prp-checklists` | `PRPChecklistLogCreate` | Tạo mới bản ghi checklist giám sát theo ca; tự động tính toán tỷ lệ % tuân thủ và phân loại trạng thái (`COMPLIANT` / `ACTION_REQUIRED` / `NON_COMPLIANT`). |
| `DELETE`| `/api/v1/haccp/prp-checklists/{id}` | `check_id` (UUID) | Xóa bản ghi checklist. |
| `POST` | `/api/v1/haccp/ai/suggest-hazards` | `AIHazardSuggestRequest` (`step_name`, `product_line`) | Trợ lý AI Phân tích Mối nguy: Tự động phát hiện các mối nguy sinh học, hóa học, vật lý theo 7 nguyên tắc HACCP và cây quyết định Codex. |
| `POST` | `/api/v1/haccp/ai/advise-ccp-deviation` | `AICCPDeviationRequest` (`ccp_code`, `measured_value`, `unit`, `batch_number`, `critical_limit_text`) | Trợ lý AI Xử lý Sự cố Sai lệch CCP: Tư vấn các bước cô lập lô sản xuất tức thì, giả định nguyên nhân gốc rễ và kế hoạch xử lý sản phẩm không an toàn theo ISO 22000 Clause 8.9.2. |

---

## 💻 Danh mục Chi tiết Giao diện & Component Đã Thực Hiện

### 1. Phân hệ Quản lý Tài liệu ISO (`frontend/src/routes/documents.tsx`)
- Kết nối API CRUD `/api/v1/documents`, phân loại 5 cấp POLICY/MANUAL/SOP/WI/FORM, Trợ lý AI Soạn thảo SOP, phê duyệt nhanh 1 chạm.

### 2. Phân hệ Mua hàng & IQC (`frontend/src/routes/purchasing.tsx`)
- Quản lý danh bạ NCC (ASL), Lô nguyên liệu (FEFO), Biên bản IQC, Trợ lý AI COA, In Phiếu IQC (BM-IQC-01) & In Danh bạ ASL (BM-ASL-01).

### 3. Phân hệ Kế hoạch HACCP & Giám sát CCP Realtime (`frontend/src/routes/haccp.tsx`)
- **Thanh Thống kê 4 Chỉ số KPI Trực quan:**
  - CCP & oPRP Đang Giám Sát (100% Hoạt động).
  - Tỷ lệ Đo Đạc Trong Ngưỡng (%).
  - Số lượng Cảnh báo Sát Ngưỡng (±5% Critical Limit).
  - Số lượng Vi phạm Tới hạn trong 24h & Số lô cách ly.
- **Hệ thống 4 Tabs Nghiệp vụ Chuyên sâu:**
  - **Tab 1: Kế hoạch CCP & oPRP:** Danh sách điểm CCP với Critical Limits, tần suất, người phụ trách, giá trị đo gần nhất kèm status badge (NORMAL/WARNING/CRITICAL).
  - **Tab 2: Bảng Phân Tích Mối Nguy (Hazard Analysis Matrix):** Phân tích 4 nhóm mối nguy, ma trận rủi ro Risk = Likelihood × Severity, Cây quyết định Codex Q1-Q4 và phân loại kết luận.
  - **Tab 3: Nhật Ký Giám Sát CCP Realtime:** Form ghi nhận đo đạc theo ca/mẻ sản xuất, tự động cảnh báo đỏ khi vi phạm ngưỡng tới hạn.
  - **Tab 4: Trợ Lý AI HACCP & Khắc Phục Sai Lệch:** AI Hazard Matrix Generator (4 công đoạn mẫu) & AI CCP Deviation Advisor (tư vấn cô lập mẻ sản xuất theo ISO 22000 Điều khoản 8.9.2).
- **In ấn & Xuất Biểu mẫu Chuẩn ISO 22000:2018:**
  - **In Bảng Kế hoạch HACCP Tổng thể (BM-HACCP-01):** Bao gồm logo WCERT, bảng chỉ tiêu kiểm soát tới hạn và 3 chữ ký (Trưởng đội HACCP, Trưởng ban QLCL, Tổng Giám đốc).
  - **In Phiếu Nhật ký Giám sát CCP (BM-CCP-02):** Bảng ghi nhận đo đạc theo ca mẻ kèm chữ ký QC và Trưởng ca sản xuất.

### 4. Phân hệ Chương trình Tiên quyết PRP / GMP / SSOP (`frontend/src/routes/prp.tsx`)
- **4 Thẻ KPI:** Tổng chương trình PRP, Tỷ lệ tuân thủ trung bình (%), Checklist đã hoàn thành, Hạng mục cần khắc phục.
- **2 Tabs Nghiệp vụ:** Thư viện Chương trình Tiên quyết (GMP/SSOP/5S/Pest Control) & Checklist Giám Sát Theo Ca (tự động tính tỷ lệ tuân thủ %).
- **In ấn Biểu mẫu:** **Bảng Đánh Giá Tuân Thủ PRP (BM-PRP-01)** chuẩn ISO 22000 Điều khoản 8.2.

---

## 📈 Lịch sử Phát triển & Nhật ký Công việc (Work History)

### 🗓️ Hôm qua (Giai đoạn Thiết lập Nền tảng & RBAC)
- Thiết kế hoàn chỉnh 342 dòng SQL trong `iso22000_db.sql` bao quát 10 phân hệ nghiệp vụ ISO 22000:2018.
- Xây dựng tầng Core Backend: Kết nối database PostgreSQL, cấu hình JWT Auth & Bcrypt password hash.
- Hoàn thiện phân hệ Đăng nhập, Đăng ký và Quản trị Tổ chức (`/api/v1/auth`, `/api/v1/organization`).
- Xây dựng AppShell, Sidebar điều hướng động theo RBAC và giao diện khung cho 10 phân hệ.
- Tích hợp bộ nhận diện thương hiệu WCERT (Logo, Favicon, Meta).

### 🗓️ Hôm nay (Giai đoạn DMS, Purchasing, HACCP, PRP, Equipment, Inventory, Traceability & CAPA)
- **Hoàn thiện Phân hệ Kiểm soát Tài liệu & SOP (Luồng 7 DMS - Phase 2):**
  - Xây dựng Model `Document`, API CRUD `/api/v1/documents`, Checklist Điều khoản 7.5 và Trợ lý AI Soạn thảo SOP.
- **Hoàn thiện Phân hệ Mua hàng, Nhà cung cấp & IQC Tiếp nhận (Luồng 1 - Phase 3):**
  - Xây dựng ORM Models `Supplier`, `MaterialLot`, `IQCInspection` trong `purchasing.py`.
  - Xây dựng hệ thống 18 Endpoints RESTful tại `/api/v1/purchasing` cho Supplier, Lot, IQC, KPI Stats, AI COA Analyzer và AI Supplier Evaluation.
- **Hoàn thiện Phân hệ Thiết bị, Hiệu chuẩn & Bảo trì máy móc (Luồng 2 - Phase 5):**
  - Xây dựng 3 ORM Models: `Equipment`, `EquipmentMaintenanceLog`, `EquipmentCalibrationLog` trong `equipment.py`.
  - Xây dựng hệ thống 15 Endpoints RESTful tại `/api/v1/equipment` hỗ trợ CRUD thiết bị, nhật ký bảo trì phòng ngừa (PM), biên bản kiểm định đo lường (QUATEST/VILAS) và 2 Trợ lý AI (Dự báo hỏng hóc & Thẩm định sai số lệch chuẩn ISO 7.1.5.2).
  - Tự động nạp dữ liệu mẫu 6 máy móc công nghiệp (Nồi tiệt trùng cao áp Retort, Máy dò kim loại, Cân phân tích KCS, Cấp đông IQF, Khúc xạ kế Brix, Máy hút chân không Multivac).
  - Kiểm soát bắt buộc tiêu chuẩn an toàn thực phẩm: **Dầu mỡ bôi trơn NSF H1** và **Vệ sinh khử trùng hiện trường sau bảo trì**.
  - Tái cấu trúc toàn diện `frontend/src/routes/equipment.tsx` với 4 thẻ KPI, 4 Tabs nghiệp vụ, 2 Biểu mẫu In chuẩn **BM-TB-01** (Phiếu lý lịch thiết bị) & **BM-HC-02** (Biên bản hiệu chuẩn).
- **Hoàn thiện Phân hệ Kho FEFO, Lưu Mẫu & Truy Xuất Nguồn Gốc 1 Chạm (Luồng 3 & 4 - Phase 6):**
  - Quản lý xuất nhập tồn tự động sắp xếp theo thứ tự ưu tiên FEFO, bản đồ ma trận ô/kệ kho lạnh, quản lý mẫu lưu nghiệm thức và mẻ sản xuất.
  - Sơ đồ Cây Phả Hệ Truy Vết 4 Tầng (Backward & Forward Traceability), sinh mã QR ma trận chuẩn RFC bằng thư viện `qrcode`, lệnh khóa biệt trữ tồn kho khẩn cấp và in Biểu mẫu ISO BM-TX-01.
- **Hoàn thiện Phân hệ Sự Không Phù Hợp & Hành Động Khắc Phục CAPA (Luồng 5 - Phase 7):**
  - Xây dựng 2 ORM Models `NonConformance` và `CAPARecord` trong `backend/app/models/capa.py`.
  - Cung cấp 12+ API RESTful tại `/api/v1/capa` cho CRUD NC, CRUD CAPA, thẩm tra sau 30 ngày, thống kê KPI và 3 Trợ lý AI (AI 5-Why, AI Fishbone 5M+1E, AI Suggest Actions).
  - Giao diện `frontend/src/routes/capa.tsx` trực quan: Bảng sự cố NC không cắt chữ thông tin quan trọng, thẻ kế hoạch CAPA, Studio AI phân tích nguyên nhân gốc rễ, tab thẩm tra 30 ngày và in ấn BM-CAPA-01.
- **Hoàn thiện Phân hệ Đào Tạo Nhân Sự, Đánh Giá Nội Bộ & Khai Báo Sức Khỏe (Luồng 6 - Phase 8):**
  - Xây dựng 5 ORM Models: `InternalAudit`, `AuditFinding`, `TrainingCourse`, `TrainingParticipantRecord`, `HealthDeclarationRecord` trong `backend/app/models/audit.py`.
  - Xây dựng 17+ Endpoints RESTful tại `/api/v1/audits` hỗ trợ ĐGNB (Clause 9.2), Đào tạo năng lực (Clause 7.2), Khai báo sức khỏe ca (Clause 8.2 PRP) và 4 Trợ lý AI.
  - Tích hợp tính năng **Chuyển đổi 1 chạm phát hiện NC sang Phiếu CAPA** (`non_conformances`).
  - Giao diện `frontend/src/routes/audits.tsx` hiện đại: 4 Thẻ KPI, 4 Tabs nghiệp vụ, 3 Biểu mẫu In Chuẩn ISO A4 (**BM-AUDIT-01**, **BM-TRAIN-02**, **BM-HEALTH-03**) và Lưu đồ Quy trình ĐGNB 4 bước (`WF-AUDIT-4STEPS`).
- **Tối ưu hóa Trực quan & Độ Tin Cậy Biểu Mẫu Động (Dynamic Form & Workflow Studio):**
  - Chuẩn hóa `DynamicFormRenderer.tsx`: Header ghim đỉnh (Sticky Top) luôn hiển thị đầy đủ mã hiệu, phiên bản, điểm tuân thủ và nút Đóng `[X]`; Thân form cuộn mượt mà; Footer ghim đáy (Sticky Bottom).
  - Sửa lớp bọc Modal trong `prp.tsx`, `purchasing.tsx`, `haccp.tsx` để không bị đẩy lệch Header trên mọi màn hình.
- **Tối ưu hóa Trải nghiệm In Ấn & Xuất PDF chuẩn ISO 22000:**
  - Thay thế toàn bộ việc mở popup tab trắng `about:blank` bằng **Modal Xem Trước Trực Quan In-App** đẹp mắt với Header có **Logo chính thức WCERT (`/logo.png`)**, thông tin tổ chức, mã biểu mẫu ISO, bảng thông số định dạng chuẩn A4 và khối chữ ký 2 bên/3 bên.
  - Xây dựng helper `printHtml` in ngầm qua hidden iframe mượt mà, người dùng không bị chuyển trang full-screen khi nhấn nút in hoặc lưu PDF.
- **Chuẩn Hóa & Đồng Bộ Toàn Diện Danh Mục Phòng Ban Từ Cơ Sở Dữ Liệu (ISO 22000 Standardized Departments):**
  - **Xóa bỏ triệt để phân mảnh và trùng lặp danh sách phòng ban:** Trước đây danh sách phòng ban trong hệ thống bị trộn lẫn giữa các vai trò (`roles`), danh sách tĩnh hardcode cũ (16+ mục không đồng nhất như "Ban Giám Đốc" vs "Ban Giám đốc", "Phòng Cơ điện & Thiết bị" vs "Phòng Thiết bị", "Tổ Sản xuất / QC",...).
  - **Tạo Bảng CSDL Chuyên Biệt `departments`:**
    - Cấu trúc: `dept_id` (UUID PK), `dept_code` (Unique), `dept_name` (Unique), `description`, `created_at`.
    - Định nghĩa ORM model `Department` tại [backend/app/models/user.py](file:///Users/na/Documents/GitHub/iso22000-ai/backend/app/models/user.py).
    - Cập nhật file cơ sở dữ liệu [iso22000_db.sql](file:///Users/na/Documents/GitHub/iso22000-ai/iso22000_db.sql).
    - Cấu hình startup migration trong [backend/app/main.py](file:///Users/na/Documents/GitHub/iso22000-ai/backend/app/main.py) tự động kiểm tra, tạo bảng và nạp seed data chuẩn nếu chưa tồn tại.
  - **Chuẩn Hóa 7 Phòng Ban Chính Thức Khớp 100% Hồ Sơ Tiêu Chuẩn ISO 22000:**
    1. `Ban Giám đốc` (`DEPT-BGD`): Lãnh đạo cao nhất, phê duyệt chính sách và xem xét quản lý.
    2. `Ban QLCL & ATTP` (`DEPT-QLCL`): Đội trưởng HACCP, QA/QC, thẩm định kiểm soát an toàn thực phẩm.
    3. `Phòng Sản xuất` (`DEPT-SX`): Vận hành dây chuyền chế biến, giám sát CCP/oPRP theo ca.
    4. `Phòng Kinh doanh & Kho` (`DEPT-KDK`): Tiếp nhận đơn hàng, quản lý kho FEFO, xuất nhập nguyên phụ liệu và thành phẩm.
    5. `Phòng Thiết bị` (`DEPT-TB`): Bảo trì máy móc, hiệu chuẩn thiết bị đo lường kiểm soát mối nguy.
    6. `Phòng Hành chính - Kế toán` (`DEPT-HCKT`): Nhân sự, quản lý hồ sơ đào tạo và sức khỏe công nhân viên.
    7. `Quản trị hệ thống` (`DEPT-IT`): Quản trị hạ tầng, phân quyền truy cập và bảo mật số hóa.
  - **Làm Sạch Bảng `roles` & Tài Khoản `admin`:**
    - Loại bỏ role trùng lặp `ADMIN`, chuẩn hóa các mã vai trò `role_code` về chữ thường (`admin`, `management`, `qa_qc_manager`, `production`, `sales_logistics`, `maintenance`, `hr_accounting`, `staff`, `user`).
    - Cập nhật tài khoản `admin` thuộc phòng ban chuẩn: `"Quản trị hệ thống"`.
  - **Backend API Đồng Bộ Hoàn Toàn Từ Bảng `departments`:**
    - `/api/v1/organization/departments`: Trả về danh sách 7 phòng ban từ bảng `Department` kèm đếm số lượng người dùng thực tế (`count`).
    - `/api/v1/auth/departments`: Trả về danh sách 7 phòng ban chuẩn phục vụ form Đăng ký tài khoản và các dropdown hệ thống.
  - **Frontend Tinh Gọn & Tự Động Hóa Truy Vấn (`lib/departments.ts` & UI Components):**
    - Loại bỏ hoàn toàn cơ chế merge mảng tĩnh cũ `[...names, ...DEFAULT_DEPARTMENTS]` gây nhân bản.
    - Hook `useDepartments()` gọi trực tiếp API `/organization/departments` hoặc `/auth/departments` và nhận đúng 7 phòng ban từ CSDL.
    - Cập nhật toàn bộ các component:
      - `WorkflowBuilder.tsx`: Nhãn "Phòng ban phụ trách", role mặc định "Phòng Sản xuất", node bước quy trình gán đúng các phòng ban chuẩn.
      - `organization.tsx`: Quản lý danh mục phòng ban và phân bổ người dùng.
      - `audits.tsx`: Dropdown chọn phòng ban được đánh giá, phòng ban phụ trách quy trình ĐGNB 4 bước.
      - `capa.tsx`: Dropdown phòng ban chịu trách nhiệm khắc phục sự cố NC.
- Toàn bộ kiểm thử Backend API đạt `200 OK`, TypeScript `npx tsc --noEmit` đạt **0 lỗi (Zero Errors)**.

### 🔍 Kết Quả Kiểm Tra Chuyên Sâu Các Phân Hệ Cốt Lõi:
1. **Luồng Phân Quyền (Dynamic RBAC Matrix & Router Guards):**
   - **Định nghĩa 8 Vai trò chuẩn nghiệp vụ ISO:** `admin` (Toàn quyền), `management`/`executive` (Ban Giám đốc), `qa_qc_manager`/`iso_manager` (Ban QLCL & Đội trưởng HACCP), `production` (Sản xuất), `sales_logistics`/`sales`/`warehouse` (Kinh doanh & Kho), `maintenance`/`equipment` (Cơ điện & Thiết bị), `hr_accounting`/`admin_acct` (Hành chính - Kế toán), `staff`/`user` (Nhân viên / Người dùng mới).
   - **Ma trận 3 mức truy cập (`edit` / `view` / `none`):** Cấu hình chặt chẽ tại `frontend/src/lib/auth.ts` trên 12 phân hệ (`dashboard`, `organization`, `documents`, `audits`, `haccp`, `prp`, `capa`, `equipment`, `inventory`, `traceability`, `purchasing`, `builder`).
   - **Cơ chế Chặn & Điều hướng (Guards):**
     - Màn hình khóa `AppShell.tsx`: Tự động ẩn menu trái (Sidebar Desktop/Mobile) và hiển thị màn hình khóa với biểu tượng Lock khi tài khoản không có quyền (`denied = !canView(session.role, module)`).
     - Tài khoản mới đăng ký (`role: user`): Bị chặn tại màn hình chờ phân bổ phòng ban, có nút "Kiểm tra lại quyền (F5)" tự động đồng bộ từ API `/auth/me`.
     - Phân quyền nút hành động: Component `ModuleAccessProvider` cung cấp `canEdit`, `isAdmin`, `isQA`, `isProduction`... để vô hiệu hóa (disabled) hoặc ẩn các nút Thêm, Sửa, Xóa, Phê duyệt.
2. **Hệ Thống Kiểm Tra Tính Hợp Lệ Dữ Liệu (Data Validations):**
   - **Backend (Pydantic v2 Schema Constraints):**
     - Ràng buộc độ dài & bắt buộc: `max_length`, `strip_whitespace`, chuỗi định danh duy nhất (`Unique` code cho Lô, Thiết bị, NC, Biểu mẫu, Quy trình).
     - Ràng buộc số học & thang đo: `ge=1, le=3` cho Likelihood/Severity ma trận rủi ro HACCP, `min_val/max_val` cho ngưỡng tới hạn CCP (nhiệt độ, thời gian, áp suất), `rating_score` (1-100).
     - Ràng buộc cấu trúc phức tạp: Kiểm tra JSONB cho `critical_limit` (min, max, unit, condition), `measured_details`, `root_cause_analysis` (5-Whys, Fishbone 5M+1E).
   - **Frontend (Form Validations & Feedback):**
     - Bắt buộc điền các trường trọng yếu (Required fields, HTML5 constraint validation).
     - Đối chiếu thời gian thực: Cảnh báo đỏ tức thì khi thông số đo đạc vượt Critical Limit tại form CCP hoặc nhiệt độ xe đông lạnh > -18°C tại form IQC.
     - Xác nhận 2 bước: Sử dụng `ConfirmDialog` cho toàn bộ hành động xóa, hủy hoặc khóa biệt trữ tồn kho.
3. **Studio Biểu Mẫu Động (Form Builder & DynamicFormRenderer):**
   - **Kiến trúc dữ liệu:** Lưu trữ tại bảng `dynamic_form_templates` và `dynamic_form_submissions` với trường `fields: JSONB`.
   - **Thư viện trường dữ liệu đa dạng:** Hỗ trợ 9 loại trường: `TEXT`, `NUMBER`, `SELECT`, `YESNO` (Boolean 1 chạm), `DATE`, `TIME`, `RATING` (Đánh giá sao), `SIGNATURE` (Ký điện tử), `TEXTAREA`.
   - **4 Biểu mẫu Chuẩn ISO 22000 nạp sẵn:** `FORM-GMP-01` (Vệ sinh nhà xưởng), `FORM-CCP-MONITOR` (Giám sát CCP thanh trùng), `FORM-IQC-01` (Nghiệm thu cá tra fillet), `FORM-VENDOR-01` (Đánh giá năng lực NCC).
   - **Trải nghiệm Renderer:** Thiết kế dạng Drawer/Modal trượt, Header Sticky ghim thông tin mã hiệu & điểm tuân thủ, hỗ trợ tính điểm % tự động và xuất báo cáo.
4. **Studio Lưu Đồ Quy Trình (Workflow Builder & Interactive Pipeline):**
   - **Kiến trúc dữ liệu:** Lưu trữ cấu trúc đồ thị luồng (DAG) tại bảng `dynamic_workflow_templates` với `nodes: JSONB` và `edges: JSONB`.
   - **3 Loại Node chuẩn quy trình:** `process` (Bước thực thi thao tác), `ccp_check` (Điểm kiểm soát tới hạn bắt buộc xác thực), `approval` (Cổng phê duyệt quản lý/lãnh đạo).
   - **4 Quy trình Mẫu chuẩn ISO 22000:** `WF-HACCP-CHACA` (7 bước chế biến chả cá Ba Sa đông lạnh), `WF-SOP-APPROVAL` (4 bước phê duyệt tài liệu SOP), `WF-CAPA-5STEPS` (5 bước khắc phục sự cố NC), `WF-AUDIT-4STEPS` (4 bước đánh giá nội bộ).
   - **Visual Pipeline:** Trực quan hóa tiến trình bằng màu sắc, phân công trách nhiệm theo phòng ban (`role`), cho phép kiểm thử chuyển trạng thái bước quy trình (Next step) mượt mà.

---

## 🎯 Lộ trình Thực hiện Tiếp theo (Roadmap & Next Milestones)

- [x] **Phase 1: Phân quyền RBAC & Quản lý Tổ chức** (`/organization`) — *Đã hoàn thành*
- [x] **Phase 2: Luồng 7 — Kiểm soát Tài liệu & SOP** (`/documents`) — *Đã hoàn thành*
- [x] **Phase 3: Luồng 1 — Mua hàng & IQC Nhà cung ứng** (`/purchasing`) — *Đã hoàn thành*
- [x] **Phase 4: Luồng 2 — Kế hoạch HACCP, Giám sát CCP & Vệ sinh PRP** (`/haccp`, `/prp`) — *Đã nâng cấp chuẩn ISO 22000:2018*
- [x] **Dynamic Form & Workflow Studio (`/builder`):**
  - Form Builder & DynamicFormRenderer với 4 biểu mẫu chuẩn ISO (`FORM-GMP-01`, `FORM-CCP-MONITOR`, `FORM-IQC-01`, `FORM-VENDOR-01`).
  - Workflow Builder & Interactive Pipeline với 4 quy trình chuẩn (`WF-HACCP-CHACA`, `WF-SOP-APPROVAL`, `WF-CAPA-5STEPS`, `WF-AUDIT-4STEPS`).
- [x] **Phase 5: Luồng 2 — Thiết bị, Hiệu chuẩn & Bảo trì** (`/equipment`) — *Đã hoàn thành*
- [x] **Phase 6: Luồng 3 & 4 — Quản lý Kho, Lưu mẫu & Truy xuất nguồn gốc 1 chạm** (`/inventory`, `/traceability`) — *Đã hoàn thành*
- [x] **Phase 7: Luồng 5 — Sự không phù hợp & Hành động khắc phục CAPA** (`/capa`) — *Đã hoàn thành*
- [x] **Phase 8: Luồng 6 — Đào tạo nhân sự, Đánh giá nội bộ & Khai báo sức khỏe** (`/audits`) — *Đã hoàn thành*
  - **Đánh Giá Nội Bộ ISO 22000 (Clause 9.2):** Lập kế hoạch đợt đánh giá, bảng kiểm câu hỏi theo 10 điều khoản ISO, ghi nhận phát hiện (Conformity / Major NC / Minor NC / OFI), nút "Chuyển thành Phiếu NC (CAPA)" 1 chạm, in báo cáo tổng kết **BM-AUDIT-01**.
  - **Đào Tạo & Đánh Giá Năng Lực (Clause 7.2 & 7.3):** Quản lý khóa học, danh sách học viên, bảng điểm Pre/Post test, cấp chứng chỉ và in biên bản đào tạo **BM-TRAIN-02**.
  - **Sổ Khai Báo Sức Khỏe & Vệ Sinh Trước Ca (Clause 8.2 PRP):** Đo thân nhiệt, kiểm soát triệu chứng sốt/vết thương hở/tiêu chảy, tự động đình chỉ ca vào xưởng khi có nguy cơ vi sinh và in sổ nhật ký **BM-HEALTH-03**.
  - **AI Audit & Training Studio:** 4 Trợ lý AI (Checklist Generator, Finding Evaluator, Quiz Generator, Health Risk Scanner).
  - **Workflow Studio:** Lưu đồ 4 bước quy trình ĐGNB chuẩn (`WF-AUDIT-4STEPS`).
- [x] **Phase 9: Luồng 8 — Dashboard điều hành, Báo cáo Tổng thể & Trợ lý AI tích hợp** (`/dashboard`) — *Đã hoàn thành*
  - **Chỉ Số Sức Khỏe FSMS Health Score Index:** Tích hợp dữ liệu thời gian thực từ 8 phân hệ, tính điểm % tuân thủ toàn diện và phân hạng (Xuất sắc / Tốt / Cần lưu ý).
  - **Ma Trận Tuân Thủ 7 Trụ Cột ISO 22000:2018 (Radar Matrix):** Bối cảnh & Lãnh đạo (Clause 4 & 5), Kế hoạch & HACCP CCP (Clause 6 & 8.5), Hỗ trợ & Đào tạo (Clause 7), Vận hành & PRP (Clause 8), Đánh giá kết quả (Clause 9), Cải tiến & CAPA (Clause 10), Chuỗi cung ứng & Kho FEFO.
  - **Trung Tâm Cảnh Báo Khẩn Cấp Realtime (Executive Alert Hub):** Tự động phát hiện các điểm nghẽn, sự cố NC, độ lệch CCP, nhà cung ứng rủi ro, lô hàng biệt trữ và nhân sự đình chỉ ca.
  - **Mục Tiêu Chất Lượng & ATTP (Clause 6.2 Objectives Tracker):** Quản lý chỉ tiêu định lượng hàng năm theo từng phòng ban, đo lường kế hoạch vs thực tế, thanh tiến độ trực quan.
  - **Biên Bản Họp Xem Xét Của Lãnh Đạo (Clause 9.3 Management Review):** Quản lý kỳ họp, 6 nhóm đầu vào (9.3.2 Inputs), nghị quyết đầu ra (9.3.3 Outputs) và in Biểu mẫu ISO chuẩn A4 **BM-MR-01** qua `printHtml`.
  - **Studio Cố Vấn Trí Tuệ Nhân Tạo (Executive AI Studio):** 4 Trợ lý AI cao cấp (Dự báo độ sẵn sàng tái đánh giá chứng nhận, Tự động sinh báo cáo lãnh đạo BM-MR-01, Chat hỏi đáp CSDL FSMS đa chiều, Gợi ý mục tiêu SMART).
- [ ] **Phase 10: Tác Nghiệp Di Động (PWA/Mobile Adaptation), Kiểm Thử Nghiệm Thu Toàn Diện & Chuẩn Bị Triển Khai** *(CURRENT TARGET)*
  - **1. Module Tác Nghiệp Di Động / Hiện Trường (Mobile & Tablet Adaptation):**
    - [ ] **PWA Configuration (Progressive Web App):**
      - Tạo file `manifest.json` và đăng ký Service Worker trong Vite để cho phép cài đặt / thêm ứng dụng vào màn hình chính điện thoại (Add to Home Screen).
      - Đảm bảo icons ứng dụng (192x192, 512x512) và theme color chuẩn nhận diện WCERT (`#059669`).
    - [ ] **Tối ưu hóa UI Mobile cho các màn hình tác nghiệp hiện trường:**
      - **Khai báo sức khỏe & Thân nhiệt đầu ca (`/audits` - Tab Sức khỏe):** Giao diện thẻ lớn, nút chọn 1 chạm (Có/Không triệu chứng), thân thiện khi thao tác một tay trên điện thoại.
      - **Ghi nhật ký CCP Realtime (`/haccp` - Tab Giám sát ca):** Tối ưu hóa bàn phím số (number keypad), cảnh báo rung/chuông khi nhập giá trị vượt ngưỡng tới hạn.
      - **Quét mã QR Kho & Thiết bị (`/inventory`, `/equipment`):** Tích hợp camera web HTML5 / thư viện quét QR trên mobile để quét trực tiếp mã Lot và tem máy móc.
      - **Quick Report Sự cố NC (`/capa`):** Nút nổi (FAB button) báo cáo nhanh sự cố kèm tính năng chụp ảnh hiện trường từ camera điện thoại.
  - **2. Kiểm Thử Nghiệm Thu & Tối Ưu Hệ Thống (End-to-End Verification):**
    - [ ] **Kiểm tra luồng liên thông dữ liệu tự động (Cross-Module Workflow Test):**
      - *Test 1:* Tạo kiểm tra IQC thất bại tại `/purchasing` → Kiểm tra bảng `/capa` đã tự động mở phiếu NC tương ứng chưa.
      - *Test 2:* Ghi nhận giá trị CCP vi phạm tại `/haccp` → Xác nhận lô sản phẩm đã bị khóa (`LockLotFlag = True`) trong kho `/inventory` chưa.
      - *Test 3:* Chuyển phát hiện đánh giá nội bộ sang CAPA tại `/audits` → Xác nhận liên kết mã NC.
    - [ ] **Audit RBAC Permissions trên toàn bộ 8 vai trò:**
      - Đăng nhập kiểm thử lần lượt với các tài khoản: `admin`, `management`, `qa_qc_manager`, `production`, `sales_logistics`, `maintenance`, `hr_accounting`, `staff`, `user`.
      - Đảm bảo ma trận phân quyền (Edit / View / None) hoạt động chính xác trên cả Sidebar, Router Guards và các nút hành động (Thêm, Sửa, Xóa, Duyệt).
    - [ ] **Type-Check & Clean Code:**
      - Chạy `npx tsc --noEmit` phía Frontend đảm bảo 0 lỗi TypeScript.
      - Kiểm tra log Backend đảm bảo không có warning hoặc unhandled exceptions trong các serialization helpers.
  - **3. Chuẩn Bị Bàn Giao & Triển Khai:**
    - [ ] Rà soát file `iso22000_db.sql` đảm bảo chứa đầy đủ dữ liệu mẫu (Seed Data) chuẩn cho 4 doanh nghiệp chế biến thực phẩm tại An Giang (thủy sản đông lạnh, trà túi lọc thảo mộc, yến sào chưng, bánh mì ngũ cốc).
    - [ ] Hoàn thiện tài liệu tóm tắt hướng dẫn cài đặt và vận hành nhanh (Quickstart Guide).
