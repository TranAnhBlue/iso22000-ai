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
  - `backend/app/models/`: Định nghĩa SQLAlchemy ORM Models (`user.py`, `document.py`, `purchasing.py`,...).
  - `backend/app/schemas/`: Định nghĩa Pydantic v2 validation schemas (`auth.py`, `organization.py`, `document.py`, `purchasing.py`,...).
  - `backend/app/api/v1/endpoints/`: Định nghĩa các API endpoints theo từng phân hệ (`auth.py`, `organization.py`, `documents.py`, `purchasing.py`).
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
5. **Kho & Quản lý Lô FEFO, Truy xuất Nguồn gốc (Luồng 3 & 4):** `materials`, `batches`, `finished_products`, `traceability_logs`.
6. **Thiết bị, Bảo trì & Hiệu chuẩn (Luồng 2):** `equipments`, `maintenance_logs`, `calibration_logs`.
7. **Chương trình Tiên quyết PRP / GMP / SSOP (Luồng 2):** `prp_programs`, `prp_checklists`, `prp_inspections`.
8. **HACCP & Giám sát Mối nguy CCP (Luồng 2):** `process_steps`, `hazard_analyses`, `ccp_definitions`, `ccp_monitoring_logs`.
9. **Sự không phù hợp & CAPA (Luồng 5):** `non_conformances`, `capa_actions`.
10. **Đánh giá nội bộ & Đào tạo nhân sự (Luồng 6):** `internal_audits`, `audit_findings`, `training_programs`, `training_records`.

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
| `GET` | `/api/v1/organization/users` | Không có | Lấy toàn bộ danh sách người dùng trong hệ thống kèm thông tin vai trò, phòng ban, trạng thái hoạt động. Sắp xếp theo ngày tạo mới nhất. |
| `POST` | `/api/v1/organization/users` | `UserCreate` (`name`, `username`, `password`, `dept`, `role_code`, `email`, `phone`, `status`) | Tạo mới người dùng, mã hóa mật khẩu, kiểm tra trùng lặp `username`, tự động liên kết vai trò `Role` tương ứng. |
| `PUT` | `/api/v1/organization/users/{user_id}` | `user_id`, `UserUpdate` | Cập nhật thông tin họ tên, phòng ban, email, số điện thoại, trạng thái hoạt động hoặc thay đổi quyền/vai trò người dùng. |
| `DELETE` | `/api/v1/organization/users/{user_id}` | `user_id` | Xóa tài khoản người dùng khỏi hệ thống. |
| `GET` | `/api/v1/organization/departments` | Không có | Lấy danh sách phòng ban kèm truy vấn đếm (`func.count`) số lượng thành viên thực tế của từng phòng ban. |
| `POST` | `/api/v1/organization/departments` | `DepartmentCreate` (`name`, `role_code`, `description`) | Thêm mới phòng ban vào bảng `roles`. |
| `PUT` | `/api/v1/organization/departments/{dept_id}` | `dept_id`, `DepartmentUpdate` | Cập nhật tên phòng ban và mô tả chức năng. |
| `DELETE` | `/api/v1/organization/departments/{dept_id}` | `dept_id` | Xóa phòng ban khỏi hệ thống. |

---

### 3. Phân hệ Kiểm soát Tài liệu & SOP (`/api/v1/documents`) — [documents.py](file:///c:/Users/admin/Documents/GitHub/iso22000-ai/backend/app/api/v1/endpoints/documents.py)
| Phương thức | Endpoint | Tham số / Payload | Mô tả & Xử lý Nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/documents` | Query: `q`, `doc_type`, `status_filter`, `department` | Lấy danh sách tài liệu SOP, Chính sách, Hướng dẫn công việc kèm bộ lọc đa tiêu chí. Tự động seed tài liệu ISO chuẩn nếu bảng rỗng. |
| `POST` | `/api/v1/documents` | `DocumentCreate` | Tạo mới tài liệu số hoá kèm phiên bản ban đầu `0.1` hoặc `1.0`. |
| `GET` | `/api/v1/documents/{id}` | `document_id` (UUID) | Lấy chi tiết thông tin tài liệu. |
| `PUT` | `/api/v1/documents/{id}` | `document_id`, `DocumentUpdate` | Cập nhật thông tin, thay đổi phiên bản hoặc đường dẫn tệp tài liệu. |
| `DELETE` | `/api/v1/documents/{id}` | `document_id` (UUID) | Xóa tài liệu khỏi hệ thống. |
| `POST` | `/api/v1/documents/{id}/approve` | `document_id` (UUID) | Phê duyệt nhanh tài liệu 1 chạm, chuyển trạng thái thành `APPROVED` và ghi nhận người duyệt. |

---

### 4. Phân hệ Mua hàng, Nhà cung cấp & Kiểm định IQC (`/api/v1/purchasing`) — [purchasing.py](file:///c:/Users/admin/Documents/GitHub/iso22000-ai/backend/app/api/v1/endpoints/purchasing.py)
| Phương thức | Endpoint | Tham số / Payload | Mô tả & Xử lý Nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/purchasing/stats` | Không có | Thống kê tổng quan KPI: Tổng NCC, NCC ASL Đạt chuẩn, Lô nguyên liệu tiếp nhận, Tỷ lệ kiểm định IQC Đạt (%), Cảnh báo rủi ro & Lô cách ly. |
| `GET` | `/api/v1/purchasing/suppliers` | Query: `q`, `category`, `status_filter`, `risk_level` | Lấy danh bạ NCC (ASL), tự động tính số lượng lô đã giao dịch và tỷ lệ đạt IQC của từng NCC. Nạp sẵn 6 NCC mẫu tiêu chuẩn. |
| `POST` | `/api/v1/purchasing/suppliers` | `SupplierCreate` | Thêm mới NCC vào Danh bạ NCC được phê duyệt (ASL). Kiểm tra tính duy nhất của `supplier_code`. |
| `GET` | `/api/v1/purchasing/suppliers/{id}` | `supplier_id` (UUID) | Lấy chi tiết hồ sơ pháp lý, chứng chỉ ATTP, điểm đánh giá và lịch sử giao hàng của NCC. |
| `PUT` | `/api/v1/purchasing/suppliers/{id}` | `supplier_id`, `SupplierUpdate` | Cập nhật thông tin NCC, điều chỉnh điểm đánh giá hoặc trạng thái phê duyệt. |
| `DELETE`| `/api/v1/purchasing/suppliers/{id}` | `supplier_id` (UUID) | Xóa NCC khỏi hệ thống (cascade xóa lô & biên bản liên quan). |
| `GET` | `/api/v1/purchasing/lots` | Query: `q`, `supplier_id`, `status_filter`, `category` | Danh sách lô nguyên vật liệu tiếp nhận với số lô, hạn sử dụng FEFO, điều kiện bảo quản và trạng thái IQC. |
| `POST` | `/api/v1/purchasing/lots` | `MaterialLotCreate` | Tiếp nhận lô nguyên vật liệu mới, gán trạng thái mặc định `PENDING_IQC`. |
| `GET` | `/api/v1/purchasing/lots/{id}` | `lot_id` (UUID) | Lấy chi tiết thông tin lô nguyên liệu và kết quả kiểm định IQC mới nhất. |
| `PUT` | `/api/v1/purchasing/lots/{id}` | `lot_id`, `MaterialLotUpdate` | Cập nhật thông tin lô nguyên liệu, số lượng hoặc cập nhật tệp COA. |
| `DELETE`| `/api/v1/purchasing/lots/{id}` | `lot_id` (UUID) | Xóa lô nguyên liệu khỏi kho tiếp nhận. |
| `GET` | `/api/v1/purchasing/inspections` | Query: `q`, `status_filter`, `material_lot_id` | Danh sách biên bản kiểm định IQC kèm kết quả cảm quan, độ ẩm, nhiệt độ xe giao hàng, độc tố vi nấm và COA. |
| `POST` | `/api/v1/purchasing/inspections` | `IQCInspectionCreate` | Lập biên bản kiểm định IQC; tự động đồng bộ trạng thái Lô (`APPROVED`/`REJECTED`/`QUARANTINE`) và tự động cập nhật điểm tín nhiệm của NCC (`+0.5` hoặc `-5.0`). |
| `GET` | `/api/v1/purchasing/inspections/{id}` | `inspection_id` (UUID) | Chi tiết biên bản kiểm định IQC. |
| `PUT` | `/api/v1/purchasing/inspections/{id}` | `inspection_id`, `IQCInspectionUpdate` | Cập nhật kết quả kiểm định IQC và tự động đồng bộ lại trạng thái lô nguyên liệu. |
| `DELETE`| `/api/v1/purchasing/inspections/{id}` | `inspection_id` (UUID) | Xóa biên bản IQC. |
| `POST` | `/api/v1/purchasing/ai/analyze-coa` | `AICoAAnalysisRequest` (`material_name`, `sample_type`, `coa_text`) | Trợ lý AI Thẩm định Phiếu COA: Đối chiếu tự động các chỉ tiêu vi sinh (Salmonella, E.coli), kim loại nặng (Pb, Cd), độc tố Aflatoxin, độ ẩm theo QCVN/Codex/ISO 22000. |
| `POST` | `/api/v1/purchasing/ai/evaluate-supplier`| `AISupplierEvaluationRequest` (`supplier_id`) | Trợ lý AI Đánh giá Hiệu suất NCC: Phân tích lịch sử IQC, tỷ lệ lỗi, chứng chỉ sở hữu để tính điểm đề xuất và đưa ra khuyến nghị kiểm soát. |

---

## 💻 Danh mục Chi tiết Giao diện & Component Đã Thực Hiện

### 1. Phân hệ Quản lý Tài liệu ISO (`frontend/src/routes/documents.tsx`)
- **Kết nối API Toàn diện:** Thay thế toàn bộ mock dữ liệu bằng gọi API CRUD thực tế đến `/api/v1/documents`.
- **Phân loại 5 Cấp theo Tiêu chuẩn ISO 22000:2018:** POLICY, MANUAL, SOP, WI, FORM & RECORD.
- **Thẻ Thống kê & Thanh Lọc 2 Tầng (Responsive Filter Toolbar).**
- **Phê duyệt 1 chạm (1-Click Quick Approve).**
- **Trợ lý AI Soạn thảo SOP & Điền Form Tự động.**
- **Modal Chi tiết & Kiểm tra Tuân thủ Điều khoản 7.5.**

### 2. Phân hệ Mua hàng, Nhà cung cấp & Kiểm định IQC (`frontend/src/routes/purchasing.tsx`)
- **Thanh Thống kê 4 Chỉ số KPI Trực quan:**
  - Tổng số Nhà cung cấp & Tỷ lệ Đạt chuẩn (ASL).
  - Lô nguyên liệu tiếp nhận & Số lượng lô chờ kiểm định IQC.
  - Tỷ lệ Kiểm định IQC Đạt (%) & Tỷ lệ hồ sơ COA hợp lệ.
  - Cảnh báo Rủi ro Nhà cung cấp & Lô hàng bị cách ly / từ chối.
- **Hệ thống 4 Tabs Nghiệp vụ Chuyên sâu:**
  - **Tab 1: Danh bạ Nhà cung cấp (Approved Supplier List - ASL & AI Rating):** Quản lý hồ sơ NCC, ngành hàng, danh mục chứng nhận ATTP (ISO 22000, HACCP, FSSC 22000, Halal, BRC...), thanh tiến độ điểm AI Rating, cấp độ rủi ro (Low/Medium/High) và trạng thái phê duyệt.
  - **Tab 2: Tiếp nhận Lô Nguyên liệu (Material Lots & FEFO):** Quản lý số lô, hạn dùng (cảnh báo FEFO hết hạn), điều kiện bảo quản (kho lạnh ≤ -18°C, kho mát 0-4°C, kho khô...), liên kết tệp COA và trạng thái duyệt IQC.
  - **Tab 3: Kiểm định Chất lượng Tiếp nhận (IQC Inspections):** Quản lý biên bản nghiệm thu cảm quan, quy cách bao bì, nhiệt độ xe giao hàng (°C), độ ẩm (%), độc tố vi nấm (Aflatoxin), nhãn dị nguyên và đối chiếu COA.
  - **Tab 4: Trợ lý AI Thẩm định COA (AI COA Smart Inspector):** Cung cấp 5 bộ mẫu chỉ tiêu thử nghiệm (Thủy sản đông lạnh, Bột mì, Gia vị, Bao bì màng ghép PE/PA, Hóa chất khử trùng). AI tự động kiểm tra đối chiếu QCVN 8-1, QCVN 8-2, QCVN 12-1 và tích hợp nút 1-click chuyển kết quả phân tích sang Biên bản IQC.
- **In ấn & Xuất Biểu mẫu Chuẩn ISO 22000:2018:**
  - **In Phiếu Kiểm tra & Nghiệm thu Chất lượng Tiếp nhận (IQC Sheet - BM-IQC-01):** Bao gồm logo WCERT, bảng chỉ tiêu kiểm nghiệm, kết luận và 3 chữ ký chính thức (Đại diện NCC, Thủ kho tiếp nhận, KCS/QC Lead).
  - **In Danh bạ Nhà cung cấp được Phê duyệt (Approved Supplier List - ASL - BM-ASL-01):** Bảng tổng hợp NCC theo Điều khoản 7.1.6 với chữ ký Trưởng phòng Mua hàng, Trưởng ban QLCL và Tổng Giám đốc.
- **AI Đánh giá Năng lực Nhà cung ứng (AI Supplier Risk Breakdown Modal):** Phân tích điểm mạnh, rủi ro và khuyến nghị hành động khắc phục.

### 3. Trợ lý AI Thông minh (`frontend/src/components/AIChatWidget.tsx`)
- **Thiết kế 3 Trạng thái Tương tác Mượt mà:** Closed, Minimized, Open/Fullscreen.
- **Tính năng Hỗ trợ Nghiệp vụ:** Gợi ý câu hỏi nhanh ISO 22000, Reset hội thoại, Sao chép câu trả lời, Typing indicator.

---

## 📈 Lịch sử Phát triển & Nhật ký Công việc (Work History)

### 🗓️ Hôm qua (Giai đoạn Thiết lập Nền tảng & RBAC)
- Thiết kế hoàn chỉnh 342 dòng SQL trong `iso22000_db.sql` bao quát 10 phân hệ nghiệp vụ ISO 22000:2018.
- Xây dựng tầng Core Backend: Kết nối database PostgreSQL, cấu hình JWT Auth & Bcrypt password hash.
- Hoàn thiện phân hệ Đăng nhập, Đăng ký và Quản trị Tổ chức (`/api/v1/auth`, `/api/v1/organization`).
- Xây dựng AppShell, Sidebar điều hướng động theo RBAC và giao diện khung cho 10 phân hệ.
- Tích hợp bộ nhận diện thương hiệu WCERT (Logo, Favicon, Meta).

### 🗓️ Hôm nay (Giai đoạn DMS, Mua hàng & Kiểm soát IQC)
- **Hoàn thiện Phân hệ Kiểm soát Tài liệu & SOP (Luồng 7 DMS - Phase 2):**
  - Xây dựng Model `Document`, API CRUD `/api/v1/documents`, Checklist Điều khoản 7.5 và Trợ lý AI Soạn thảo SOP.
- **Hoàn thiện Phân hệ Mua hàng, Nhà cung cấp & IQC Tiếp nhận (Luồng 1 - Phase 3):**
  - Xây dựng ORM Models `Supplier`, `MaterialLot`, `IQCInspection` trong `purchasing.py`.
  - Xây dựng hệ thống 18 Endpoints RESTful tại `/api/v1/purchasing` cho Supplier, Lot, IQC, KPI Stats, AI COA Analyzer và AI Supplier Evaluation.
  - Tự động nạp sẵn dữ liệu mẫu thực tế chuẩn nhà máy chế biến thực phẩm ISO 22000.
  - Nâng cấp toàn diện giao diện `frontend/src/routes/purchasing.tsx` với 4 Tabs nghiệp vụ, 4 thẻ KPI, Trợ lý AI Thẩm định COA, Modal In Biên bản IQC và Modal In Danh bạ NCC (ASL).
  - Tinh chỉnh an toàn kiểu dữ liệu (None-Safety, SQLAlchemy Mapped types, Pyrefly & Pylance), kiểm tra toàn bộ 18/18 API test case đạt `200 OK`.
  - Khắc phục toàn bộ cảnh báo TypeScript (`npx tsc --noEmit` đạt 0 lỗi).

---

## 🎯 Lộ trình Thực hiện Tiếp theo (Roadmap & Next Milestones)

- [x] **Phase 1: Phân quyền RBAC & Quản lý Tổ chức** (`/organization`) — *Đã hoàn thành*
- [x] **Phase 2: Luồng 7 — Kiểm soát Tài liệu & SOP** (`/documents`) — *Đã hoàn thành*
- [x] **Phase 3: Luồng 1 — Mua hàng & IQC Nhà cung ứng** (`/purchasing`) — *Đã hoàn thành*
- [ ] **Phase 4 [BƯỚC KẾ TIẾP]: Luồng 2 — Kế hoạch HACCP, Giám sát CCP & Vệ sinh PRP** (`/haccp`, `/prp`)
  - **Mục đích:** Thiết lập lưu đồ sản xuất, bảng phân tích mối nguy sinh học/hóa học/vật lý, xác định CCP/oPRP theo cây quyết định ISO 22000:2018 Clause 8.5; giám sát nhật ký đo đạc CCP theo thời gian thực; quản lý các chương trình tiên quyết PRP (SSOP/GMP).
  - **Dự kiến Backend:** Models `ProcessStep`, `HazardAnalysis`, `CCPDefinition`, `CCPMonitoringLog`, `PRPProgram`, `PRPChecklist`; các API CRUD, cảnh báo vượt ngưỡng tới hạn (Critical Limits) và AI phân tích mối nguy.
  - **Dự kiến Frontend:** Bảng ma trận HACCP, biểu đồ nhiệt giám sát CCP thời gian thực, bảng kiểm tra checklist PRP vệ sinh nhà xưởng hàng ngày.
- [ ] **Phase 5: Luồng 2 — Thiết bị, Hiệu chuẩn & Bảo trì** (`/equipment`)
- [ ] **Phase 6: Luồng 3 & 4 — Quản lý Kho FEFO & Truy xuất nguồn gốc 1 chạm** (`/inventory`)
- [ ] **Phase 7: Luồng 5 — Sự không phù hợp & Hành động khắc phục CAPA** (`/capa`)
- [ ] **Phase 8: Luồng 6 — Đào tạo nhân sự, Đánh giá nội bộ & Khai báo sức khỏe** (`/audits`)
- [ ] **Phase 9: Luồng 8 — Dashboard điều hành, Báo cáo & Trợ lý AI tích hợp** (`/dashboard`)
