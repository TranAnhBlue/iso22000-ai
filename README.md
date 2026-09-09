# WCERT – Hệ Thống Quản Lý An Toàn Thực Phẩm (FSMS – ISO 22000:2018 AI Hub)

Hệ thống chuyển đổi số toàn diện quy trình Quản lý An toàn Thực phẩm theo tiêu chuẩn quốc tế **ISO 22000:2018**, tích hợp **Trợ lý Trí tuệ Nhân tạo (AI Assistant)** nhằm tối ưu hoá việc giám sát CCP, phân tích mối nguy HACCP, quản lý CAPA, truy xuất nguồn gốc và kiểm soát tài liệu.

---

## 🛠️ Kiến trúc Công nghệ

### 1. Backend
- **Ngôn ngữ & Framework:** Python 3.12+ / FastAPI
- **Cơ sở dữ liệu:** PostgreSQL 16+ (Hỗ trợ extension `uuid-ossp`, `JSONB`)
- **ORM & Driver:** SQLAlchemy 2.0, `psycopg2-binary`
- **Xác thực & Bảo mật:** OAuth2 Password Bearer, JWT Token (`python-jose`), `passlib` / SHA-256
- **API Documentation:** Swagger UI tại `http://127.0.0.1:8000/docs`

### 2. Frontend
- **Framework:** React 19 + TanStack Start (SSR + CSR) / TanStack Router + Vite
- **UI & Styling:** Tailwind CSS v4, Radix UI Primitives, Lucide React, Sonner Toast
- **State Management:** TanStack Query v5, Axios Interceptors
- **URL Mặc định:** `http://127.0.0.1:8080/`

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### Yêu cầu tiên quyết
1. **Node.js** v20+ và **npm**
2. **PostgreSQL** 15+ đang chạy trên cổng mặc định `5432`
3. **Python** 3.11+ (hoặc dùng `uv` để tự động quản lý phiên bản Python)

---

### Bước 1: Khởi động Cơ sở Dữ liệu (PostgreSQL)
Đảm bảo PostgreSQL đang chạy trên cổng 5432. Cấu hình kết nối nằm trong file `backend/.env`:
```env
PROJECT_NAME="ISO22000 AI Platform"
DATABASE_URL=postgresql://postgres:giabao@localhost:5432/iso22000_db
SECRET_KEY=NbXmCrBZPY6QJnGnGHg5ZpritsX13zMtecXVt5s2Z_E
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
```
> *Lưu ý: Thay đổi username/password trong `DATABASE_URL` nếu bạn cấu hình tài khoản PostgreSQL khác.*

Nếu cơ sở dữ liệu `iso22000_db` chưa có, tạo mới và nạp schema:
```bash
# Tạo database
createdb -U postgres iso22000_db

# Nạp bảng và cấu trúc mẫu ban đầu
psql -U postgres -d iso22000_db -f iso22000_db.sql
```

---

### Bước 2: Cài đặt & Khởi chạy Backend (FastAPI)

<<<<<<< Updated upstream
=======
Hệ thống được tổ chức khoa học theo cấu trúc bậc cao (High-Level Structure - HLS) của tiêu chuẩn ISO:

### 1. Dashboard Điều Hành & Quản Trị (`/dashboard`)
* **Tổng quan điều hành:** Đo lường chỉ số sức khỏe hệ thống FSMS (0 - 100%), nhãn trạng thái (*Xuất sắc, Tốt, Cảnh báo, Nguy cấp*).
* **Radar 7 Trụ cột ISO:** Đánh giá độ trưởng thành của từng khối: *Bối cảnh, Kế hoạch HACCP, Nguồn lực, Vận hành PRP, Đánh giá, Cải tiến CAPA, Chuỗi cung ứng*.
* **Họp xem xét của Lãnh đạo:** Tự động tổng hợp dữ liệu toàn nhà máy phục vụ kỳ họp định kỳ theo Điều khoản 9.3.

### 2. Bối Cảnh Tổ Chức & Đội ATTP (`/organization`)
* **Đội An toàn thực phẩm (5.3):** Quản lý quyết định bổ nhiệm Đội trưởng, Đội phó và thành viên đa chức năng kèm hồ sơ năng lực.
* **Bên liên quan & Kỳ vọng (4.2):** Kiểm soát yêu cầu luật định (Chi cục ATTP, Cục Thú y, Bộ Y tế) và khách hàng.
* **Ma trận rủi ro SWOT (4.1 & 6.1):** Phân tích điểm mạnh, điểm yếu, cơ hội, nguy cơ và kế hoạch xử lý rủi ro bối cảnh.

### 3. Hệ Thống Tài Liệu & SOP Điện Tử (`/documents`)
* **Phân cấp 4 tầng tài liệu:** Cấp 1 (Sổ tay ATTP), Cấp 2 (Quy trình SOP), Cấp 3 (Hướng dẫn công việc WI), Cấp 4 (Biểu mẫu Form).
* **Quy trình ký duyệt trực tuyến 3 bước:** Soạn thảo ➔ Thẩm tra QA ➔ Ký duyệt Giám đốc Nhà máy.
* **Kiểm soát phiên bản:** Cấp mã QR truy xuất bản có kiểm soát, lưu trữ audit trail và thu hồi bản lỗi thời.

### 4. Chương Trình Tiên Quyết PRP / GMP / SSOP (`/prp`)
* **Chương trình kiểm soát vệ sinh:** Nguồn nước sản xuất, bề mặt tiếp xúc thực phẩm, bẫy côn trùng chuột bọ, bảo hộ lao động.
* **Checklist đầu ca điện tử:** Chấm điểm Pass/Fail tự động, bắt buộc nhập hành động khắc phục khi phát hiện lỗi vệ sinh.

### 5. Kế Hoạch HACCP & Giám Sát CCP / oPRP (`/haccp`)
* **Lưu đồ công đoạn tuần tự (8.5.1):** Tích hợp **Bộ Thiết Kế Lưu Đồ (Studio)**; cho phép thêm, sửa, xóa bất kỳ công đoạn nào với cơ chế **tự động đôn số thứ tự tuần tự (1, 2, 3...)** và đồng bộ 2 chiều vào cơ sở dữ liệu.
* **Bảng phân tích mối nguy (8.5.2):** Đánh giá 4 nhóm mối nguy (*Sinh học, Hóa học, Vật lý, Dị nguyên*); xác định điểm kiểm soát CCP hoặc oPRP.
* **Kế hoạch kiểm soát CCP (8.5.4):** Thiết lập ngưỡng tới hạn Min/Max, đơn vị đo, thời gian duy trì và người phụ trách.
* **Nhật ký giám sát Real-time:** Nhập thông số từng mẻ, cảnh báo vàng khi sát ngưỡng ±5%, cảnh báo đỏ khi vi phạm tới hạn.

### 6. Quản Lý Nhà Cung Cấp & Nghiệm Thu IQC (`/purchasing`)
* **Danh mục NCC được phê duyệt:** Quản lý hạn chứng chỉ an toàn (VietGAP, GlobalGAP, HACCP) và kế hoạch đánh giá định kỳ.
* **Nghiệm thu đầu vào (IQC):** Đo nhiệt độ thùng xe lạnh (≤ 4°C đối với hàng tươi, ≤ -18°C đối với hàng đông), kiểm tra cảm quan và đính kèm COA.

### 7. Quản Lý Kho Lạnh & Nguyên Tắc FEFO (`/inventory`)
* **Quản lý vị trí kho:** Kho lạnh 1, Kho lạnh 2, Kho bao bì khô, kiểm soát nhiệt độ bảo quản.
* **Thuật toán FEFO (First Expired, First Out):** Tự động tính số ngày còn lại đến hạn sử dụng, cảnh báo ưu tiên xuất trước đối với các lô cận hạn.
* **Quản lý mẫu lưu đối chứng:** Lưu vết mẫu lưu từng lô thành phẩm phục vụ tái kiểm định.

### 8. Truy Xuất Nguồn Gốc & Diễn Tập Thu Hồi (`/traceability`)
* **Truy xuất ngược (Backward):** Tra cứu từ mã lô thành phẩm ra toàn bộ chuỗi thông số chế biến, nhiệt độ CCP, lô nguyên liệu và NCC ban đầu.
* **Truy xuất xuôi (Forward):** Khi phát hiện nguyên liệu lỗi, tìm kiếm ngay các mẻ thành phẩm liên đới và danh sách khách hàng đã nhận hàng.
* **Diễn tập thu hồi giả định (Mock Recall):** Đánh giá tỷ lệ thu hồi thành công trong khung thời gian chuẩn 4 giờ.

### 9. Thiết Bị, Bảo Trì & Hiệu Chuẩn Đo Lường (`/equipment`)
* **Lý lịch máy & Thiết bị trọng yếu CCP:** Nồi tiệt trùng cao áp, máy dò kim loại, tủ cấp đông siêu tốc IQF.
* **Lịch bảo trì phòng ngừa:** Kế hoạch bảo dưỡng ngăn ngừa sự cố đột xuất.
* **Quản lý hiệu chuẩn (Calibration):** Lưu trữ chứng chỉ kiểm định (QUATEST), tính ngày đến hạn và cảnh báo thiết bị sắp quá hạn hiệu chuẩn.

### 10. Đánh Giá Nội Bộ, Đào Tạo & Sức Khỏe (`/audits`)
* **Đánh giá nội bộ (Internal Audit):** Lập kế hoạch đánh giá định kỳ, phân công đánh giá chéo và chuyển đổi phát hiện lỗi sang phiếu CAPA.
* **Đào tạo & Sát hạch ATTP:** Ngân hàng đề thi trắc nghiệm nhận thức an toàn thực phẩm, theo dõi cấp chứng chỉ nhân viên.
* **Khai báo y tế đầu ca:** Phát hiện và cách ly công nhân có triệu chứng bệnh truyền nhiễm, vết thương hở khỏi khu vực chế biến mở.

### 11. Sự Không Phù Hợp & Hành Động Khắc Phục CAPA (`/capa`)
* **Biên bản NC:** Ghi nhận sự cố, niêm phong cô lập lô hàng không phù hợp tức thời.
* **Quy trình 5 bước CAPA:** Trợ lý AI phân tích 5-Whys & biểu đồ Ishikawa ➔ Lập kế hoạch khắc phục ➔ Thẩm tra lại sau 30 ngày để đóng phiếu.

### 12. Tình Huống Khẩn Cấp & Khủng Hoảng (`/emergency`)
* **Danh bạ khẩn cấp một chạm:** Gọi nhanh PCCC, cấp cứu 115, Trung tâm y tế dự phòng, Đội ứng phó sự cố nhà máy.
* **Kịch bản ứng phó sự cố:** 9 quy trình xử lý mất điện kho lạnh, rò rỉ khí gas NH3, ô nhiễm nguồn nước.
* **Biên bản diễn tập:** Lưu trữ kết quả diễn tập PCCC và diễn tập ứng phó thực địa định kỳ.

### 13. Quản Lý Sự Thay Đổi Có Kiểm Soát (`/change-management`)
* **Đề xuất thay đổi (Change Request):** Thay đổi công thức sản phẩm, nguyên vật liệu mới, thiết bị mới.
* **Đánh giá tác động an toàn thực phẩm:** Phân tích ảnh hưởng đến Kế hoạch HACCP, chương trình PRP và cập nhật tài liệu SOP liên quan.

### 14. Trung Tâm Thiết Kế Động No-Code (`/builder`)
* **Form Builder:** Trình thiết kế biểu mẫu kéo thả linh hoạt (Text, Number, Dropdown, Checkbox, Rating, Ảnh chụp, Chữ ký số).
* **Workflow Studio:** Vẽ lưu đồ quy trình động, gắn cờ điểm kiểm soát CCP/oPRP, phân vai trò thực hiện.
* **Submissions:** Trung tâm quản lý toàn bộ dữ liệu điền phiếu của các bộ phận trong nhà máy.

---

## 🛠️ KIẾN TRÚC CÔNG NGHỆ (TECH STACK)

| Tầng kiến trúc | Công nghệ áp dụng | Phiên bản | Vai trò & Mục đích |
| :--- | :--- | :---: | :--- |
| **Backend Core** | Python / FastAPI | 3.12+ / 0.115+ | RESTful API hiệu năng cao, bất đồng bộ (Async/Await), tự động sinh OpenAPI spec |
| **ORM & DB Access** | SQLAlchemy / Psycopg2 | 2.0+ | Quản lý mô hình dữ liệu quan hệ, quan hệ 1-N / N-N, hỗ trợ kiểu JSONB & UUID |
| **Cơ sở dữ liệu** | PostgreSQL (Supabase / Local) | 16+ | Lưu trữ dữ liệu quan hệ mạnh mẽ, ACID, chỉ mục JSONB cho biểu mẫu động |
| **Xác thực & Bảo mật** | OAuth2 Bearer / JWT / Passlib | 2.0+ | Phân quyền truy cập 4 vai trò (RBAC), mã hóa mật khẩu PBKDF2/SHA-256 |
| **Frontend Framework** | React 19 / TanStack Router | 19.0 / 1.100+ | Xây dựng giao diện Single Page Application (SPA), định tuyến hiện đại type-safe |
| **State & Fetching** | TanStack Query v5 / Axios | 5.0+ | Quản lý Server State, đồng bộ dữ liệu nền không cần reload trang |
| **Giao diện & UI** | Tailwind CSS v4 / Radix UI | v4.0 / Latest | Hệ thống Design System thẩm mỹ cao, Glassmorphism, Micro-animations, Mobile-friendly |
| **Icon & Thông báo** | Lucide React / Sonner | Latest | Bộ biểu tượng chuẩn công nghiệp, thông báo toast trạng thái trực quan |

---

## 📂 CẤU TRÚC THƯ MỤC DỰ ÁN (PROJECT STRUCTURE)

```
iso22000-ai/
├── README.md                          # Tài liệu tổng quan dự án (File này)
├── USER_GUIDE.md                      # Sổ tay vận hành full tính năng cho người dùng
├── DEPLOY_DATABASE.md                 # Hướng dẫn kết nối & deploy Cloud PostgreSQL
├── backend/                           # Phân hệ Backend (FastAPI Python)
│   ├── .env                           # Cấu hình môi trường (DATABASE_URL, SECRET_KEY)
│   ├── requirements.txt               # Danh sách thư viện Python phụ thuộc
│   ├── app/
│   │   ├── main.py                    # Điểm khởi động ứng dụng FastAPI & tích hợp Routers
│   │   ├── core/
│   │   │   ├── database.py            # Khởi tạo SQLAlchemy Engine & SessionLocal
│   │   │   ├── migrations.py          # Script tự động đồng bộ schema DDL khi startup
│   │   │   └── security.py            # Xử lý JWT Token, Hash mật khẩu & RBAC Guards
│   │   └── modules/                   # 14 Phân hệ nghiệp vụ độc lập (Domain-Driven)
│   │       ├── auth/                  # Đăng nhập, tài khoản & vai trò
│   │       ├── organization/          # Bối cảnh, SWOT, Bên liên quan, Đội ATTP
│   │       ├── documents/             # Sổ tay, SOP, Hướng dẫn WI, Phê duyệt đa cấp
│   │       ├── purchasing/            # Nhà cung cấp, Tiếp nhận lô hàng & IQC
│   │       ├── haccp/                 # Kế hoạch HACCP, Lưu đồ 8.5.1, Mối nguy, Giám sát CCP
│   │       ├── change_management/     # Đề xuất & phê duyệt thay đổi
│   │       ├── equipment/             # Thiết bị, Bảo dưỡng & Hiệu chuẩn đo lường
│   │       ├── inventory/             # Kho lạnh, Tồn kho FEFO, Mẫu lưu đối chứng
│   │       ├── traceability/          # Cây truy xuất ngược/xuôi 4 tầng & Thu hồi giả định
│   │       ├── capa/                  # Báo cáo NC, Cô lập lô hàng & Quy trình 5 bước CAPA
│   │       ├── audits/                # Đánh giá nội bộ, Đào tạo sát hạch & Sức khỏe đầu ca
│   │       ├── dashboard/             # KPI điều hành, Biểu đồ Radar, Báo cáo xem xét lãnh đạo
│   │       ├── emergency/             # Danh bạ khẩn cấp, Kịch bản ứng phó sự cố
│   │       └── builder/               # Bộ thiết kế Form Builder & Workflow Studio động
│   └── venv/                          # Python Virtual Environment
│
└── frontend/                          # Phân hệ Frontend (React 19 / TanStack)
    ├── package.json                   # Cấu hình npm scripts & dependencies
    ├── vite.config.ts                 # Cấu hình Vite Dev Server & Path aliases (@/)
    ├── tailwind.config.js             # Cấu hình hệ màu Design System Tailwind
    └── src/
        ├── routes/                    # Các trang màn hình tương ứng 14 modules
        │   ├── index.tsx              # Màn hình Đăng nhập & Quick Role Switcher
        │   ├── dashboard.tsx          # Trang Dashboard điều hành
        │   ├── organization.tsx       # Trang Bối cảnh & Đội ATTP
        │   ├── documents.tsx          # Trang Quản lý Hồ sơ & SOP
        │   ├── prp.tsx                # Trang Chương trình tiên quyết PRP/GMP
        │   ├── haccp.tsx              # Trang Kế hoạch HACCP & Studio Lưu đồ
        │   ├── purchasing.tsx         # Trang Nhà cung cấp & Nghiệm thu IQC
        │   ├── inventory.tsx          # Trang Kho lạnh & Quy tắc FEFO
        │   ├── traceability.tsx       # Trang Truy xuất nguồn gốc & Thu hồi
        │   ├── equipment.tsx          # Trang Thiết bị & Hiệu chuẩn
        │   ├── audits.tsx             # Trang Đánh giá nội bộ & Sức khỏe
        │   ├── capa.tsx               # Trang Sự không phù hợp & CAPA
        │   ├── emergency.tsx          # Trang Ứng phó tình huống khẩn cấp
        │   ├── change-management.tsx  # Trang Quản lý sự thay đổi
        │   └── builder.tsx            # Trang Trung tâm Studio No-Code
        ├── components/
        │   ├── builder/               # Component WorkflowBuilder & FormBuilder
        │   ├── ui/                    # Thư viện UI Atoms (Button, Dialog, Badge, Input...)
        │   └── AppShell.tsx           # Layout khung chuẩn (Sidebar, Header, Breadcrumbs)
        └── lib/
            ├── api.ts                 # Cấu hình Axios Client & Interceptors
            ├── auth.ts                # Context quản lý phiên đăng nhập & RBAC
            └── departments.ts         # Khai báo dữ liệu phòng ban chuẩn
```

---

## ⚡ HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY NHANH

### Yêu Cầu Tiên Quyết
* **Node.js:** Phiên bản 20.x trở lên và **npm** 10.x trở lên.
* **Python:** Phiên bản 3.11 hoặc 3.12 trở lên.
* **Cơ sở dữ liệu:** PostgreSQL 15+ (Mặc định dự án đã kết nối sẵn với Cloud Database Supabase dùng chung).

---

### Bước 1: Khởi Động Backend (FastAPI)

Mở cửa sổ Terminal thứ nhất:
>>>>>>> Stashed changes
```bash
cd backend

# 1. Tạo môi trường ảo (khuyến nghị dùng uv hoặc python3.12 venv)
python3 -m venv venv
source venv/bin/activate

# 2. Cài đặt các thư viện phụ thuộc
pip install -r requirements.txt

# 3. Chạy server phát triển (Uvicorn)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- **Backend API:** `http://127.0.0.1:8000`
- **Swagger Docs:** `http://127.0.0.1:8000/docs`

---

### Bước 3: Cài đặt & Khởi chạy Frontend (React / Vite)

Mở một cửa sổ Terminal mới:
```bash
cd frontend

# 1. Cài đặt dependencies
npm install

# 2. Khởi chạy Vite Dev Server
npm run dev -- --host 127.0.0.1 --port 8080
```
- **Ứng dụng Web:** `http://127.0.0.1:8080/`

---

## 🔑 Tài Khoản Trải Nghiệm Mẫu

Hệ thống đã cấu hình sẵn 4 tài khoản theo từng vai trò (có thể bấm nhanh trực tiếp trên giao diện Đăng nhập):

| Vai trò | Tên đăng nhập | Mật khẩu | Phân quyền & Mô tả |
| :--- | :--- | :--- | :--- |
| **Quản trị hệ thống** | `admin` | `123456` hoặc `admin123` | Toàn quyền cấu hình, quản lý người dùng, phân quyền RBAC |
| **Ban QLCL & ATTP** | `qa` | `123456` hoặc `qa123` | Quản lý kế hoạch HACCP, giám sát CCP, PRP, thẩm tra CAPA |
| **Phòng Sản xuất** | `production` | `123456` hoặc `prod123` | Ghi nhận đo đạc CCP theo ca, quản lý mẻ sản xuất |
| **Phòng Thiết bị** | `maintenance` | `123456` hoặc `maint123` | Quản lý thiết bị đo, nhật ký bảo trì & hiệu chuẩn máy móc |

---

## 📂 Các Phân Hệ Chức Năng Chính

1. **Dashboard Điều Hành (`/dashboard`):** Tổng quan điểm số tuân thủ FSMS, biểu đồ Radar 7 trụ cột ISO, cảnh báo rủi ro tức thời.
2. **Kế Hoạch HACCP & Giám Sát CCP (`/haccp`):** Quản lý lưu đồ công đoạn chế biến, phân tích mối nguy sinh học/hóa học/vật lý, giám sát giới hạn tới hạn thời gian thực.
3. **Chương Trình Tiên Quyết PRP (`/prp`):** Check-list kiểm tra vệ sinh nhà xưởng GMP, SSOP theo từng ca làm việc.
4. **Kiểm Soát Sự Không Phù Hợp & CAPA (`/capa`):** Phân tích nguyên nhân gốc rễ bằng AI (Phương pháp 5-Whys và Sơ đồ xương cá Ishikawa 5M), theo dõi hành động khắc phục/phòng ngừa.
5. **Kiểm Soát Tài Liệu DMS (`/documents`):** Quản lý Sổ tay chất lượng, Quy trình chuẩn (SOP), Hướng dẫn công việc (WI), hỗ trợ xuất bản và in ấn chuẩn hóa.
6. **Nhà Cung Cấp & Kiểm Nghiệm Đầu Vào IQC (`/purchasing`):** Đánh giá nhà cung cấp, kiểm soát lô nguyên liệu và phiếu kiểm nghiệm ngoại quan/vi sinh.
7. **Kho Lạnh FEFO & Truy Xuất Nguồn Gốc (`/inventory`, `/traceability`):** Xuất nhập kho nguyên tắc FEFO, sơ đồ phả hệ truy vết ngược/xuôi 4 tầng, mã QR ma trận RFC và kịch bản thu hồi giả định (Mock Recall).
8. **Đánh Giá Nội Bộ, Đào Tạo & Sức Khỏe (`/audits`):** Quản lý các đợt audit định kỳ, ngân hàng câu hỏi trắc nghiệm AI và phiếu khai báo y tế đầu ca.
9. **Studio Biểu Mẫu & Quy Trình Động (`/builder`):** Trình thiết kế biểu mẫu động kéo-thả và vẽ lưu đồ phê duyệt nhiều cấp.
