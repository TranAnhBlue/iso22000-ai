# WCERT – Hệ Thống Quản Lý An Toàn Thực Phẩm (FSMS – ISO 22000:2018 AI Hub)

## 📌 Tổng quan Dự án
Hệ thống chuyển đổi số toàn diện quy trình Quản lý An toàn Thực phẩm theo tiêu chuẩn quốc tế **ISO 22000:2018**, tích hợp **Trợ lý Trí tuệ Nhân tạo (AI Assistant)** nhằm tối ưu hoá việc giám sát CCP, phân tích mối nguy HACCP, quản lý CAPA, truy xuất nguồn gốc và kiểm soát tài liệu.

---

## 🛠️ Kiến trúc Công nghệ & Cấu trúc Dự án

### 1. Backend (FastAPI - Python 3.14+)
- **Framework:** FastAPI (RESTful API, OpenAPI/Swagger Docs)
- **ORM & Database Driver:** SQLAlchemy 2.0 (Mapped Column Type-Safe), asyncpg / psycopg2
- **Database:** PostgreSQL 16+ (Hỗ trợ UUID extension `uuid-ossp`, JSONB)
- **Xác thực & Bảo mật:** OAuth2 Password Bearer, JWT Token (`python-jose`), `passlib` (bcrypt)
- **Kiến trúc Layered Clean Architecture:**
  - `backend/app/core/`: Cấu hình hệ thống, kết nối cơ sở dữ liệu (`database.py`), bảo mật & mã hóa JWT (`security.py`).
  - `backend/app/models/`: Định nghĩa SQLAlchemy ORM Models (`user.py`, `document.py`,...).
  - `backend/app/schemas/`: Định nghĩa Pydantic v2 validation schemas (`auth.py`, `organization.py`, `document.py`,...).
  - `backend/app/api/v1/endpoints/`: Định nghĩa các API endpoints theo từng phân hệ (`auth.py`, `organization.py`, `documents.py`).
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
3. **Kiểm soát Tài liệu (DMS - Luồng 7):**
   - `documents`: `document_id` (UUID PK), `doc_code` (Unique), `doc_title`, `doc_type` (POLICY, MANUAL, SOP, WI, FORM, RECORD), `department`, `standard` (Default 'ISO 22000:2018'), `current_version`, `status` (DRAFT, APPROVED, PENDING_APPROVAL, OBSOLETE), `file_url`, `approved_by` (FK `users`), `effective_date`, `created_at`.
4. **Nhà cung cấp & IQC Nguyên liệu (Luồng 1):** `suppliers`, `purchase_orders`, `incoming_inspections`.
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
| `POST` | `/api/v1/auth/register` | `UserRegister` (`username`, `password`, `full_name`, `department`, `email`, `phone`) | Tạo tài khoản mới, mã hóa mật khẩu, tự động liên kết phòng ban/role đăng ký. Tài khoản mới có trạng thái chờ kích hoạt nếu cần. |
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
| `GET` | `/api/v1/documents` | Query: `q` (tìm kiếm), `doc_type` (phân loại), `status_filter` (trạng thái), `department` (phòng ban) | - Tự động nạp dữ liệu mẫu chuẩn ISO 22000 nếu bảng trống.<br>- Lọc đa chiều theo từ khóa (tìm kiếm trong `doc_code`, `doc_title`, `department`), lọc theo cấp độ tài liệu (POLICY, MANUAL, SOP, WI, FORM, RECORD), lọc theo trạng thái và phòng ban.<br>- Sắp xếp theo ngày tạo mới nhất. |
| `POST` | `/api/v1/documents` | `DocumentCreate` (`doc_code`, `doc_title`, `doc_type`, `department`, `standard`, `current_version`, `status`, `file_url`, `effective_date`) | - Kiểm tra tính duy nhất của Mã tài liệu `doc_code`.<br>- Lưu tài liệu mới vào cơ sở dữ liệu với phiên bản ban hành và tệp đính kèm. |
| `GET` | `/api/v1/documents/{document_id}` | `document_id` (UUID) | Lấy thông tin chi tiết của một tài liệu cụ thể. |
| `PUT` | `/api/v1/documents/{document_id}` | `document_id`, `DocumentUpdate` | - Chỉnh sửa thông tin tài liệu.<br>- Hỗ trợ nâng cấp phiên bản (`current_version`).<br>- Hỗ trợ phê duyệt nhanh (Chuyển trạng thái sang `APPROVED` và cập nhật ngày hiệu lực). |
| `DELETE` | `/api/v1/documents/{document_id}` | `document_id` (UUID) | Xóa tài liệu khỏi hệ thống cơ sở dữ liệu. |

---

## 💻 Danh mục Chi tiết Giao diện & Component Đã Thực Hiện

### 1. Phân hệ Quản lý Tài liệu ISO (`frontend/src/routes/documents.tsx`)
- **Kết nối API Toàn diện:** Thay thế toàn bộ mock dữ liệu bằng gọi API CRUD thực tế đến `/api/v1/documents`.
- **Phân loại 5 Cấp theo Tiêu chuẩn ISO 22000:2018:**
  - `POLICY` (Cấp 1): Chính sách ATTP & Cam kết lãnh đạo.
  - `MANUAL` (Cấp 2): Sổ tay Hệ thống FSMS.
  - `SOP` (Cấp 3): Quy trình tác nghiệp chuẩn.
  - `WI` (Cấp 4): Hướng dẫn công việc cụ thể tại xưởng.
  - `FORM` & `RECORD` (Cấp 5): Biểu mẫu kiểm soát & Hồ sơ ghi chép.
- **Thẻ Thống kê & Thanh Lọc 2 Tầng (Responsive Filter Toolbar):**
  - Đếm số lượng thực tế theo từng cấp độ và tỷ lệ tài liệu đã phê duyệt.
  - Tầng trên: Tab chuyển nhanh theo cấp độ tài liệu, hỗ trợ cuộn ngang linh hoạt.
  - Tầng dưới: Bộ chọn Phòng ban, Bộ chọn Trạng thái (`APPROVED`, `PENDING_APPROVAL`, `DRAFT`, `OBSOLETE`), Ô tìm kiếm tức thì.
- **Phê duyệt 1 chạm (1-Click Quick Approve):** Cho phép người có thẩm quyền phê duyệt trực tiếp tài liệu từ danh sách.
- **Trợ lý AI Soạn thảo SOP & Điền Form Tự động:**
  - Cung cấp dàn ý chuẩn ISO 22000: *Kiểm soát Dị nguyên (Allergen), Giám sát CCP Thanh trùng, Truy xuất & Thu hồi khẩn cấp, SSOP Vệ sinh nhà xưởng*.
  - Nút "Điền vào Form tạo tài liệu" tự động điền mã, tiêu đề, phân cấp và liên kết lưu thẳng vào database.
- **Modal Chi tiết & Kiểm tra Tuân thủ Điều khoản 7.5:**
  - Trực quan hóa tiến độ tuân thủ điều khoản ISO 22000:2018 Clause 7.5 dạng Progress Bar.
  - Kiểm tra thực tế (Dynamic Verification) theo từng dòng đơn:
    - `7.5.2a Nhận diện & Tiêu đề`: Kiểm tra Mã & Tiêu đề văn bản.
    - `7.5.2a Phòng ban phụ trách`: Kiểm tra phân bổ phòng ban.
    - `7.5.2b Phiên bản hiện hành`: Kiểm tra kiểm soát phiên bản.
    - `7.5.2c Xem xét & Phê duyệt`: Đánh giá trạng thái phê duyệt.
    - `7.5.3 Ngày có hiệu lực`: Xác thực ngày áp dụng.
    - `7.5.3 Tệp văn bản đính kèm`: Kiểm tra liên kết tệp số hóa.
  - Card hiển thị liên kết tệp đính kèm an toàn chống tràn chữ, tích hợp nút sao chép URL và nút mở tệp.

### 2. Trợ lý AI Thông minh (`frontend/src/components/AIChatWidget.tsx`)
- **Thiết kế 3 Trạng thái Tương tác Mượt mà:**
  - `Closed`: Nút tròn thu nhỏ ở góc phải (`h-12 w-12`) với hiệu ứng gradient, viền sáng và chấm xanh báo trạng thái trực tuyến.
  - `Minimized`: Thanh capsule thanh lịch nằm sát đáy màn hình, hiển thị tiêu đề và nút mở rộng/đóng nhanh.
  - `Open / Expanded`: Cửa sổ chat hoàn chỉnh hoặc chế độ phóng to toàn màn hình (`Maximize2`/`Minimize2`).
- **Tính năng Hỗ trợ Nghiệp vụ:**
  - Gợi ý câu hỏi nhanh theo ngữ cảnh ISO 22000 (SOP, CCP, CAPA, Audit).
  - Khả năng Reset đoạn hội thoại và Sao chép câu trả lời AI chỉ với 1 click.
  - Hiệu ứng AI Typing Indicator sinh động.

---

## 📈 Lịch sử Phát triển & Nhật ký Công việc (Work History)

### 🗓️ Hôm qua (Giai đoạn Thiết lập Nền tảng & RBAC)
- Thiết kế hoàn chỉnh 342 dòng SQL trong `iso22000_db.sql` bao quát 10 phân hệ nghiệp vụ ISO 22000:2018.
- Xây dựng tầng Core Backend: Kết nối database PostgreSQL, cấu hình JWT Auth & Bcrypt password hash.
- Hoàn thiện phân hệ Đăng nhập, Đăng ký và Quản trị Tổ chức (`/api/v1/auth`, `/api/v1/organization`).
- Xây dựng AppShell, Sidebar điều hướng động theo RBAC và giao diện khung cho 10 phân hệ.
- Tích hợp bộ nhận diện thương hiệu WCERT (Logo, Favicon, Meta).

### 🗓️ Hôm nay (Giai đoạn DMS & Chuẩn hóa Hệ thống)
- **Hoàn thiện Phân hệ Kiểm soát Tài liệu & SOP (Luồng 7 DMS):**
  - Xây dựng Model `Document` và Pydantic Schema `DocumentResponse`, `DocumentCreate`, `DocumentUpdate`.
  - Viết toàn bộ API CRUD tại `/api/v1/documents` hỗ trợ lọc theo cấp độ, phòng ban, trạng thái và tìm kiếm.
  - Nối API Backend vào giao diện `frontend/src/routes/documents.tsx`, hỗ trợ phân loại 5 cấp ISO.
  - Tích hợp Trợ lý AI Soạn thảo SOP và cơ chế điền tự động vào Form.
  - Xây dựng Checklist kiểm tra tuân thủ Điều khoản ISO 22000:2018 Clause 7.5 định dạng 1 dòng/tiêu chí.
- **Tối ưu & Tinh chỉnh Giao diện:**
  - Nâng cấp `AIChatWidget` hỗ trợ 3 trạng thái (Closed, Minimized, Fullscreen) tránh che khuất thông tin màn hình.
  - Sửa lỗi tràn link tệp đính kèm trong Modal Chi tiết tài liệu.
  - Tách bộ lọc `documents.tsx` thành 2 hàng ngăn ngừa tình trạng rớt dòng thẻ tab.
- **Sửa Lỗi Type Check Backend:**
  - Sửa toàn bộ lỗi ép kiểu Pyrefly/Pyright trong `documents.py` và `organization.py`.
  - Khởi tạo các helper serialization an toàn dữ liệu `format_user_out` và `format_dept_out`.
  - Đồng bộ các cột `department` và `standard` vào PostgreSQL schema và startup migration.

---

## 🎯 Lộ trình Thực hiện Tiếp theo (Roadmap & Next Milestones)

- [x] **Phase 1: Phân quyền RBAC & Quản lý Tổ chức** (`/organization`) — *Đã hoàn thành*
- [x] **Phase 2: Luồng 7 — Kiểm soát Tài liệu & SOP** (`/documents`) — *Đã hoàn thành*
- [ ] **Phase 3 [BƯỚC KẾ TIẾP]: Luồng 1 — Mua hàng & IQC Nhà cung ứng** (`/purchasing`)
- [ ] **Phase 4: Luồng 2 — Kế hoạch HACCP, Giám sát CCP & Vệ sinh PRP** (`/haccp`, `/prp`)
- [ ] **Phase 5: Luồng 2 — Thiết bị, Hiệu chuẩn & Bảo trì** (`/equipment`)
- [ ] **Phase 6: Luồng 3 & 4 — Quản lý Kho FEFO & Truy xuất nguồn gốc 1 chạm** (`/inventory`)
- [ ] **Phase 7: Luồng 5 — Sự không phù hợp & Hành động khắc phục CAPA** (`/capa`)
- [ ] **Phase 8: Luồng 6 — Đào tạo nhân sự, Đánh giá nội bộ & Khai báo sức khỏe** (`/audits`)
- [ ] **Phase 9: Luồng 8 — Dashboard điều hành, Báo cáo & Trợ lý AI tích hợp** (`/dashboard`)
