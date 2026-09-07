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
