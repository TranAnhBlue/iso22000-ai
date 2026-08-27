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
1. **Phân quyền động (Dynamic RBAC) & Người dùng:**
   - `roles`: `role_id` (UUID PK), `role_code` (Unique), `role_name`, `description`.
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
6. **Kho & Quản lý Lô FEFO, Truy xuất Nguồn gốc (Luồng 3 & 4):** `materials`, `batches`, `finished_products`, `traceability_logs`.
7. **Thiết bị, Bảo trì & Hiệu chuẩn (Luồng 2):** `equipments`, `maintenance_logs`, `calibration_logs`.
8. **Sự không phù hợp & CAPA (Luồng 5):** `non_conformances`, `capa_actions`.
9. **Đánh giá nội bộ & Đào tạo nhân sự (Luồng 6):** `internal_audits`, `audit_findings`, `training_programs`, `training_records`.

---

## 📡 Danh mục Chi tiết Backend API & Mô tả Xử lý

### 1. Phân hệ Xác thực (`/api/v1/auth`) — [auth.py](file:///c:/Users/admin/Documents/GitHub/iso22000-ai/backend/app/api/v1/endpoints/auth.py)
| Phương thức | Endpoint | Tham số / Payload | Mô tả & Xử lý Nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | `OAuth2PasswordRequestForm` (`username`, `password`) | Xác thực tài khoản, kiểm tra mật khẩu bcrypt, kiểm tra trạng thái hoạt động (`is_active`). Trả về JWT Access Token kèm thông tin user và danh sách vai trò (`roles`). |
| `POST` | `/api/v1/auth/register` | `UserRegister` (`username`, `password`, `full_name`, `department`, `email`, `phone`) | Tạo tài khoản mới, mã hóa mật khẩu, tự động liên kết phòng ban/role đăng ký. |
| `GET` | `/api/v1/auth/me` | Header `Authorization: Bearer <token>` | Lấy thông tin tài khoản hiện tại từ Token, cập nhật quyền hạn realtime cho Frontend. |
| `GET` | `/api/v1/auth/departments` | Không có | Lấy danh sách các phòng ban/vai trò có sẵn từ bảng `roles` để hiển thị trong form đăng ký. |

---

### 2. Phân hệ Tổ chức & Phân quyền (`/api/v1/organization`) — [organization.py](file:///c:/Users/admin/Documents/GitHub/iso22000-ai/backend/app/api/v1/endpoints/organization.py)
| Phương thức | Endpoint | Tham số / Payload | Mô tả & Xử lý Nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/organization/users` | Không có | Lấy danh sách người dùng kèm vai trò, phòng ban. |
| `POST` | `/api/v1/organization/users` | `UserCreate` | Tạo mới người dùng, mã hóa mật khẩu, gán vai trò tương ứng. |
| `PUT` | `/api/v1/organization/users/{user_id}` | `user_id`, `UserUpdate` | Cập nhật thông tin họ tên, phòng ban, trạng thái hoạt động. |
| `DELETE` | `/api/v1/organization/users/{user_id}` | `user_id` | Xóa tài khoản người dùng khỏi hệ thống. |
| `GET` | `/api/v1/organization/departments` | Không có | Lấy danh sách phòng ban kèm đếm số lượng thành viên thực tế. |
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
| `GET` | `/api/v1/haccp/hazards` | Query: `step_id`, `hazard_type`, `classification`, `q` | Lấy danh sách phân tích mối nguy (Sinh học, Hóa học, Vật lý, Dị nguyên) kèm điểm rủi ro $L \times S$ và Cây quyết định Codex Q1-Q4. |
| `POST` | `/api/v1/haccp/hazards` | `HazardAnalysisCreate` | Thêm mới mối nguy; tự động tính toán $Risk = Likelihood \times Severity$ và cập nhật cờ `is_ccp_or_oprp` cho công đoạn liên kết. |
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
  - **Tab 2: Bảng Phân Tích Mối Nguy (Hazard Analysis Matrix):** Phân tích 4 nhóm mối nguy, ma trận rủi ro $Risk = Likelihood \times Severity$, Cây quyết định Codex Q1-Q4 và phân loại kết luận.
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

### 🗓️ Hôm nay (Giai đoạn DMS, Purchasing, HACCP & PRP)
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
  - **Tối ưu hóa Trải nghiệm In Ấn & Xuất PDF chuẩn ISO 22000:**
    - Thay thế toàn bộ việc mở popup tab trắng `about:blank` bằng **Modal Xem Trước Trực Quan In-App** đẹp mắt với Header có **Logo chính thức WCERT (`/logo.png`)**, thông tin tổ chức, mã biểu mẫu ISO, bảng thông số định dạng chuẩn A4 và khối chữ ký 2 bên/3 bên.
    - Xây dựng helper `printHtml` in ngầm qua hidden iframe mượt mà, người dùng không bị chuyển trang full-screen khi nhấn nút in hoặc lưu PDF.
  - Kiểm thử toàn bộ 15/15 API Endpoints đạt `200 OK`, TypeScript `npx tsc --noEmit` đạt **0 lỗi (Zero Errors)**.

---

## 🎯 Lộ trình Thực hiện Tiếp theo (Roadmap & Next Milestones)

- [x] **Phase 1: Phân quyền RBAC & Quản lý Tổ chức** (`/organization`) — *Đã hoàn thành*
- [x] **Phase 2: Luồng 7 — Kiểm soát Tài liệu & SOP** (`/documents`) — *Đã hoàn thành*
- [x] **Phase 3: Luồng 1 — Mua hàng & IQC Nhà cung ứng** (`/purchasing`) — *Đã hoàn thành*
- [x] **Phase 4: Luồng 2 — Kế hoạch HACCP, Giám sát CCP & Vệ sinh PRP** (`/haccp`, `/prp`) — *Đã hoàn thành*
- [x] **Phase 5: Luồng 2 — Thiết bị, Hiệu chuẩn & Bảo trì** (`/equipment`) — *Đã hoàn thành*
- [x] **Phase 6: Luồng 3 & 4 — Quản lý Kho, Lưu mẫu & Truy xuất nguồn gốc 1 chạm** (`/inventory`, `/traceability`) — *Đã hoàn thành*
  - **Kho FEFO & Lưu Mẫu (`/inventory`):** Quản lý xuất nhập tồn tự động tính toán thứ tự ưu tiên FEFO (`EXPIRED`, `CRITICAL_NEAR_EXPIRY`, `NEAR_EXPIRY`, `GOOD`), bản đồ ma trận vị trí kệ/ô kho lạnh (Kho đông $\le -18^\circ\text{C}$, Kho mát $0-4^\circ\text{C}$, Kho khô $\le 25^\circ\text{C}$), quản lý mẫu lưu nghiệm thức (HSD + 30 ngày) và mẻ sản xuất/phiếu xuất kho.
  - **Truy xuất Nguồn gốc 1 Chạm (`/traceability`):**
    - *Truy xuất ngược (Backward):* Sơ đồ Cây phả hệ 4 tầng: `NCC/Nguyên liệu IQC` $\rightarrow$ `Mẻ SX & CCP` $\rightarrow$ `Tồn kho & Mẫu lưu` $\rightarrow$ `Đơn xuất & Khách hàng`.
    - *Truy xuất xuôi (Forward & Mock Recall):* Quét toàn bộ mẻ đã dùng nguyên liệu sự cố, kích hoạt nút khóa biệt trữ tồn kho và danh sách khách hàng cần thu hồi khẩn trong 2 giờ.
    - *In Biểu mẫu ISO BM-TX-01:* Biên bản Truy xuất nguồn gốc có Logo WCERT chuẩn đẹp, in trực tiếp trong trang.
- [ ] **Phase 7 [BƯỚC KẾ TIẾP]: Luồng 5 — Sự không phù hợp & Hành động khắc phục CAPA** (`/capa`)
- [ ] **Phase 8: Luồng 6 — Đào tạo nhân sự, Đánh giá nội bộ & Khai báo sức khỏe** (`/audits`)
- [ ] **Phase 9: Luồng 8 — Dashboard điều hành, Báo cáo & Trợ lý AI tích hợp** (`/dashboard`)
