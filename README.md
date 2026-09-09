# WCERT FSMS AI PLATFORM
### Hệ Thống Số Hóa Quản Lý An Toàn Thực Phẩm Toàn Diện Chuẩn Quốc Tế ISO 22000:2018 Tích Hợp Trí Tuệ Nhân Tạo (AI)

[![ISO 22000:2018](https://img.shields.io/badge/Standard-ISO_22000:2018-059669.svg?style=for-the-badge&logo=shield)](https://www.iso.org/standard/65464.html)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115+-009688.svg?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB.svg?style=for-the-badge&logo=python)](https://www.python.org)
[![React](https://img.shields.io/badge/Frontend-React_19_|_TanStack-61DAFB.svg?style=for-the-badge&logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v4-38B2AC.svg?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16+_Supabase-336791.svg?style=for-the-badge&logo=postgresql)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-Proprietary_WCERT-blue.svg?style=for-the-badge)](./LICENSE)

---

## 📑 MỤC LỤC
1. [Giới Thiệu Tổng Quan](#-giới-thiệu-tổng-quan)
2. [Điểm Nổi Bật & Tính Năng Độc Quyền](#-điểm-nổi-bật--tính-năng-độc-quyền)
3. [Bản Đồ 14 Phân Hệ Nghiệp Vụ Chuẩn ISO 22000:2018](#-bản-đồ-14-phân-hệ-nghiệp-vụ-chuẩn-iso-220002018)
4. [Kiến Trúc Công Nghệ (Tech Stack)](#-kiến-trúc-công-nghệ-tech-stack)
5. [Cấu Trúc Thư Mục Dự Án (Project Structure)](#-cấu-trúc-thư-mục-dự-án-project-structure)
6. [Hướng Dẫn Cài Đặt & Khởi Chạy Nhanh](#-hướng-dẫn-cài-đặt--khởi-chạy-nhanh)
7. [Tài Khoản Trải Nghiệm Mẫu & Ma Trận Phân Quyền (RBAC)](#-tài-khoản-trải-nghiệm-mẫu--ma-trận-phân-quyền-rbac)
8. [Tài Liệu API & Hướng Dẫn Sử Dụng](#-tài-liệu-api--hướng-dẫn-sử-dụng)

---

## 🌟 GIỚI THIỆU TỔNG QUAN

**WCERT FSMS AI Platform** là giải pháp phần mềm chuyên biệt cấp doanh nghiệp (Enterprise SaaS), được thiết kế để chuyển đổi số toàn diện Hệ thống Quản lý An toàn Thực phẩm (Food Safety Management System - FSMS) theo tiêu chuẩn quốc tế **ISO 22000:2018** và hướng dẫn thực hành của **CODEX Alimentarius (HACCP 7 nguyên tắc & 12 bước)**.

Hệ thống giúp các doanh nghiệp sản xuất, chế biến thực phẩm - thủy hải sản - đồ uống:
* **Loại bỏ 100% hồ sơ giấy tờ cồng kềnh**, chuyển dịch sang nhật ký số theo ca thời gian thực.
* **Ngăn ngừa rủi ro vượt ngưỡng tới hạn CCP** ngay lập tức thông qua thuật toán giám sát trực tiếp.
* **Đáp ứng chuẩn truy xuất nguồn gốc "Một bước trước - Một bước sau"** trong thời gian tối đa **4 giờ** theo quy định quốc tế.
* **Tự động hóa báo cáo thẩm tra và xem xét của lãnh đạo**, sẵn sàng cho các kỳ đánh giá chứng nhận ISO / BRC / FSSC 22000.

👉 **Tài liệu tham khảo chuyên sâu:**
* [📘 Sổ Tay Hướng Dẫn Sử Dụng Chi Tiết Cho Người Dùng (USER_GUIDE.md)](./USER_GUIDE.md)
* [☁️ Hướng Dẫn Cấu Hình & Triển Khai Cơ Sở Dữ Liệu Cloud (DEPLOY_DATABASE.md)](./DEPLOY_DATABASE.md)

---

## 🚀 ĐIỂM NỔI BẬT & TÍNH NĂNG ĐỘC QUYỀN

```
                        KIẾN TRÚC TRỤ CỘT WCERT FSMS AI PLATFORM
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │ 🤖 TRỢ LÝ TRÍ TUỆ NHÂN TẠO (AI ASSISTANT FOR FSMS)                                     │
 │  • Phân tích nguyên nhân gốc rễ tự động 5-Whys & Biểu đồ xương cá Ishikawa 5M          │
 │  • Dự báo xác suất đỗ đánh giá chứng nhận ISO 22000 (Certification Readiness Score)   │
 │  • Tự động sinh Checklist kiểm tra nội bộ theo từng điều khoản ISO                     │
 │  • Nhận diện rủi ro sức khỏe công nhân & đánh giá chỉ tiêu an toàn phiếu kiểm nghiệm COA│
 ├────────────────────────────────────────────────────────────────────────────────────────┤
 │ ⚡ GIÁM SÁT CCP / oPRP THỜI GIAN THỰC (REAL-TIME CCP ENGINE)                           │
 │  • Nhận diện sớm sai lệch nhiệt độ, áp suất, thời gian, kim loại tiệm cận ngưỡng ±5%   │
 │  • Tự động khóa dây chuyền & sinh phiếu Sự không phù hợp (NC) khi vi phạm ngưỡng tới hạn│
 ├────────────────────────────────────────────────────────────────────────────────────────┤
 │ 🔍 TRUY XUẤT NGUỒN GỐC 4 TẦNG & DIỄN TẬP THU HỒI (TRACEABILITY & MOCK RECALL)           │
 │  • Truy vết ngược: Lô thành phẩm ➔ Ca sản xuất ➔ Đo đạc CCP ➔ Lô IQC ➔ Nhà cung cấp    │
 │  • Truy vết xuôi: Lô phụ gia nhiễm khuẩn ➔ Mẻ thành phẩm liên đới ➔ Khách hàng phân phối│
 │  • Mô phỏng thu hồi nhanh trong 4 giờ đạt tỷ lệ thành công ≥ 98%                       │
 ├────────────────────────────────────────────────────────────────────────────────────────┤
 │ 🎨 STUDIO THIẾT KẾ ĐỘNG NO-CODE (WORKFLOW & FORM STUDIO)                               │
 │  • Thiết kế lưu đồ công nghệ tuần tự ISO 8.5.1 với cơ chế tự động đôn số thứ tự        │
 │  • Kéo-thả tạo biểu mẫu kiểm tra GMP/SSOP tùy biến không cần viết code                 │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏢 BẢN ĐỒ 14 PHÂN HỆ NGHIỆP VỤ CHUẨN ISO 22000:2018

Hệ thống được tổ chức khoa học theo cấu trúc bậc cao (High-Level Structure - HLS) của tiêu chuẩn ISO:

### 1. Dashboard Điều Hành & Quản Trị (`/dashboard` - Clause 9.1 & 9.3)
* **Tổng quan điều hành:** Đo lường chỉ số sức khỏe hệ thống FSMS (0 - 100%), nhãn trạng thái (*Xuất sắc, Tốt, Cảnh báo, Nguy cấp*).
* **Radar 7 Trụ cột ISO:** Đánh giá độ trưởng thành của từng khối: *Bối cảnh, Kế hoạch HACCP, Nguồn lực, Vận hành PRP, Đánh giá, Cải tiến CAPA, Chuỗi cung ứng*.
* **Họp xem xét của Lãnh đạo:** Tự động tổng hợp dữ liệu toàn nhà máy phục vụ kỳ họp định kỳ theo Điều khoản 9.3.

### 2. Bối Cảnh Tổ Chức & Đội ATTP (`/organization` - Clause 4 & 5)
* **Đội An toàn thực phẩm (5.3):** Quản lý quyết định bổ nhiệm Đội trưởng, Đội phó và thành viên đa chức năng kèm hồ sơ năng lực.
* **Bên liên quan & Kỳ vọng (4.2):** Kiểm soát yêu cầu luật định (Chi cục ATTP, Cục Thú y, Bộ Y tế) và khách hàng.
* **Ma trận rủi ro SWOT (4.1 & 6.1):** Phân tích điểm mạnh, điểm yếu, cơ hội, nguy cơ và kế hoạch xử lý rủi ro bối cảnh.

### 3. Hệ Thống Tài Liệu & SOP Điện Tử (`/documents` - Clause 7.5)
* **Phân cấp 4 tầng tài liệu:** Cấp 1 (Sổ tay ATTP), Cấp 2 (Quy trình SOP), Cấp 3 (Hướng dẫn công việc WI), Cấp 4 (Biểu mẫu Form).
* **Quy trình ký duyệt trực tuyến 3 bước:** Soạn thảo $\rightarrow$ Thẩm tra QA $\rightarrow$ Ký duyệt Giám đốc Nhà máy.
* **Kiểm soát phiên bản:** Cấp mã QR truy xuất bản có kiểm soát, lưu trữ audit trail và thu hồi bản lỗi thời.

### 4. Chương Trình Tiên Quyết PRP / GMP / SSOP (`/prp` - Clause 8.2)
* **Chương trình kiểm soát vệ sinh:** Nguồn nước sản xuất, bề mặt tiếp xúc thực phẩm, bẫy côn trùng chuột bọ, bảo hộ lao động.
* **Checklist đầu ca điện tử:** Chấm điểm Pass/Fail tự động, bắt buộc nhập hành động khắc phục khi phát hiện lỗi vệ sinh.

### 5. Kế Hoạch HACCP & Giám Sát CCP / oPRP (`/haccp` - Clause 8.5)
* **Lưu đồ công đoạn tuần tự (8.5.1):** Tích hợp **Bộ Thiết Kế Lưu Đồ (Studio)**; cho phép thêm, sửa, xóa bất kỳ công đoạn nào với cơ chế **tự động đôn số thứ tự tuần tự (1, 2, 3...)** và đồng bộ 2 chiều vào cơ sở dữ liệu.
* **Bảng phân tích mối nguy (8.5.2):** Đánh giá 4 nhóm mối nguy (*Sinh học, Hóa học, Vật lý, Dị nguyên*); xác định điểm kiểm soát CCP hoặc oPRP.
* **Kế hoạch kiểm soát CCP (8.5.4):** Thiết lập ngưỡng tới hạn Min/Max, đơn vị đo, thời gian duy trì và người phụ trách.
* **Nhật ký giám sát Real-time:** Nhập thông số từng mẻ, cảnh báo vàng khi sát ngưỡng $\pm 5\%$, cảnh báo đỏ khi vi phạm tới hạn.

### 6. Quản Lý Nhà Cung Cấp & Nghiệm Thu IQC (`/purchasing` - Clause 7.1.6)
* **Danh mục NCC được phê duyệt:** Quản lý hạn chứng chỉ an toàn (VietGAP, GlobalGAP, HACCP) và kế hoạch đánh giá định kỳ.
* **Nghiệm thu đầu vào (IQC):** Đo nhiệt độ thùng xe lạnh ($\le 4^\circ\text{C}$ đối với hàng tươi, $\le -18^\circ\text{C}$ đối với hàng đông), kiểm tra cảm quan và đính kèm COA.

### 7. Quản Lý Kho Lạnh & Nguyên Tắc FEFO (`/inventory` - Clause 8.2)
* **Quản lý vị trí kho:** Kho lạnh 1, Kho lạnh 2, Kho bao bì khô, kiểm soát nhiệt độ bảo quản.
* **Thuật toán FEFO (First Expired, First Out):** Tự động tính số ngày còn lại đến hạn sử dụng, cảnh báo ưu tiên xuất trước đối với các lô cận hạn.
* **Quản lý mẫu lưu đối chứng:** Lưu vết mẫu lưu từng lô thành phẩm phục vụ tái kiểm định.

### 8. Truy Xuất Nguồn Gốc & Diễn Tập Thu Hồi (`/traceability` - Clause 8.3 & 8.9.5)
* **Truy xuất ngược (Backward):** Tra cứu từ mã lô thành phẩm ra toàn bộ chuỗi thông số chế biến, nhiệt độ CCP, lô nguyên liệu và NCC ban đầu.
* **Truy xuất xuôi (Forward):** Khi phát hiện nguyên liệu lỗi, tìm kiếm ngay các mẻ thành phẩm liên đới và danh sách khách hàng đã nhận hàng.
* **Diễn tập thu hồi giả định (Mock Recall):** Đánh giá tỷ lệ thu hồi thành công trong khung thời gian chuẩn 4 giờ.

### 9. Thiết Bị, Bảo Trì & Hiệu Chuẩn Đo Lường (`/equipment` - Clause 7.1.3 & 7.1.5)
* **Lý lịch máy & Thiết bị trọng yếu CCP:** Nồi tiệt trùng cao áp, máy dò kim loại, tủ cấp đông siêu tốc IQF.
* **Lịch bảo trì phòng ngừa:** Kế hoạch bảo dưỡng ngăn ngừa sự cố đột xuất.
* **Quản lý hiệu chuẩn (Calibration):** Lưu trữ chứng chỉ kiểm định (QUATEST), tính ngày đến hạn và cảnh báo thiết bị sắp quá hạn hiệu chuẩn.

### 10. Đánh Giá Nội Bộ, Đào Tạo & Sức Khỏe (`/audits` - Clause 9.2, 7.2 & 8.2)
* **Đánh giá nội bộ (Internal Audit):** Lập kế hoạch đánh giá định kỳ, phân công đánh giá chéo và chuyển đổi phát hiện lỗi sang phiếu CAPA.
* **Đào tạo & Sát hạch ATTP:** Ngân hàng đề thi trắc nghiệm nhận thức an toàn thực phẩm, theo dõi cấp chứng chỉ nhân viên.
* **Khai báo y tế đầu ca:** Phát hiện và cách ly công nhân có triệu chứng bệnh truyền nhiễm, vết thương hở khỏi khu vực chế biến mở.

### 11. Sự Không Phù Hợp & Hành Động Khắc Phục CAPA (`/capa` - Clause 8.9 & 10.1)
* **Biên bản NC:** Ghi nhận sự cố, niêm phong cô lập lô hàng không phù hợp tức thời.
* **Quy trình 5 bước CAPA:** Trợ lý AI phân tích 5-Whys & biểu đồ Ishikawa $\rightarrow$ Lập kế hoạch khắc phục $\rightarrow$ Thẩm tra lại sau 30 ngày để đóng phiếu.

### 12. Tình Huống Khẩn Cấp & Khủng Hoảng (`/emergency` - Clause 8.4)
* **Danh bạ khẩn cấp một chạm:** Gọi nhanh PCCC, cấp cứu 115, Trung tâm y tế dự phòng, Đội ứng phó sự cố nhà máy.
* **Kịch bản ứng phó sự cố:** 9 quy trình xử lý mất điện kho lạnh, rò rỉ khí gas NH3, ô nhiễm nguồn nước.
* **Biên bản diễn tập:** Lưu trữ kết quả diễn tập PCCC và diễn tập ứng phó thực địa định kỳ.

### 13. Quản Lý Sự Thay Đổi Có Kiểm Soát (`/change-management` - Clause 6.3)
* **Đề xuất thay đổi (Change Request):** Thay đổi công thức sản phẩm, nguyên vật liệu mới, thiết bị mới.
* **Đánh giá tác động an toàn thực phẩm:** Phân tích ảnh hưởng đến Kế hoạch HACCP, chương trình PRP và cập nhật tài liệu SOP liên quan.

### 14. Trung Tâm Thiết Kế Động No-Code (`/builder` - Form & Workflow Studio)
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
│   │       ├── change_management/     # Đề xuất & phê duyệt thay đổi (Clause 6.3)
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
```bash
cd backend

# 1. Kích hoạt môi trường ảo Python
source venv/bin/activate

# (Tùy chọn) Cài đặt thư viện nếu chạy lần đầu
pip install -r requirements.txt

# 2. Khởi chạy máy chủ Backend Uvicorn với chế độ tự động reload
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

* **Trạng thái sẵn sàng:** Máy chủ khởi động tại `http://127.0.0.1:8000`.
* **Tài liệu Swagger UI:** Truy cập trực tiếp tại `http://127.0.0.1:8000/docs`.

---

### Bước 2: Khởi Động Frontend (React / Vite)

Mở cửa sổ Terminal thứ hai:
```bash
cd frontend

# 1. Cài đặt dependencies nếu chạy lần đầu
npm install

# 2. Khởi chạy máy chủ phát triển Vite Dev Server
npm run dev -- --host 127.0.0.1 --port 8080
```

* **Ứng dụng Web chính thức:** Mở trình duyệt tại `http://127.0.0.1:8080` (hoặc `http://localhost:8080`).

---

## 👥 TÀI KHOẢN TRẢI NGHIỆM MẪU & MA TRẬN PHÂN QUYỀN (RBAC)

Hệ thống đã cấu hình sẵn 4 tài khoản theo từng vai trò nghiệp vụ. Bạn có thể **bấm chọn trực tiếp thẻ vai trò** tại màn hình đăng nhập để tự động điền tài khoản:

| Vai trò | Tài khoản | Mật khẩu mặc định | Phân quyền & Nhiệm vụ chính |
| :--- | :---: | :---: | :--- |
| **Quản trị hệ thống (Admin)** | `admin` | `123456` hoặc `admin123` | Toàn quyền cấu hình người dùng, phân quyền RBAC, thiết kế Form & Workflow Studio. |
| **Ban QLCL / Đội ATTP (QA/QC)** | `qa` | `123456` hoặc `qa123` | Quản trị Kế hoạch HACCP, duyệt ngưỡng CCP, kiểm tra IQC, thẩm tra CAPA, đánh giá nội bộ. |
| **Phòng Sản xuất (Production)** | `production` | `123456` hoặc `prod123` | Ghi nhật ký đo đạc thông số CCP theo ca, theo dõi kho xuất FEFO, báo cáo sự cố máy. |
| **Phòng Cơ điện & Bảo trì** | `maintenance` | `123456` hoặc `maint123` | Quản lý thiết bị máy móc, lập lịch bảo trì phòng ngừa, ghi nhận chứng chỉ kiểm định hiệu chuẩn. |

---

## 📚 TÀI LIỆU API & HƯỚNG DẪN SỬ DỤNG

* **Swagger OpenAPI Documentation:** `http://127.0.0.1:8000/docs` — Trình kiểm thử API tương tác trực tiếp trên trình duyệt.
* **ReDoc Interactive Specs:** `http://127.0.0.1:8000/redoc` — Tài liệu cấu trúc API chi tiết chuẩn OpenAPI 3.1.
* **Cẩm nang vận hành chi tiết:** Xem file [USER_GUIDE.md](./USER_GUIDE.md) để xem hướng dẫn từng bước vận hành thực tế tại nhà máy sản xuất.

---

## 🛡️ TIÊU CHUẨN TUÂN THỦ

Hệ thống WCERT FSMS được xây dựng tuân thủ nghiêm ngặt các tiêu chuẩn và quy chuẩn quốc tế:
* **ISO 22000:2018:** Food safety management systems — Requirements for any organization in the food chain.
* **CODEX Alimentarius (CXC 1-1969 Rev. 2020):** General Principles of Food Hygiene & HACCP System.
* **Quy chuẩn Việt Nam:** Luật An toàn Thực phẩm số 55/2010/QH12 & Nghị định số 15/2018/NĐ-CP của Chính phủ.

---

**WCERT FSMS AI Platform** — *Số hóa quy trình, đảm bảo an toàn thực phẩm từ trang trại đến bàn ăn!*
