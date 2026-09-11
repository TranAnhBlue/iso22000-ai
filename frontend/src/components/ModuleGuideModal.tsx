import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  Lightbulb,
  ShieldCheck,
  Workflow,
  Plus,
  ArrowRight,
} from "lucide-react";

export type ModuleKey =
  | "dashboard"
  | "organization"
  | "documents"
  | "audits"
  | "haccp"
  | "prp"
  | "capa"
  | "equipment"
  | "inventory"
  | "traceability"
  | "purchasing"
  | "emergency"
  | "change-management"
  | "builder";

interface GuideContent {
  title: string;
  badge: string;
  objective: string;
  steps: Array<{ title: string; desc: string }>;
  forms: string[];
  auditTips: string[];
}

const MODULE_GUIDES: Record<ModuleKey, GuideContent> = {
  dashboard: {
    title: "Trung Tâm Điều Hành FSMS",
    badge: "Quản Trị Chiến Lược",
    objective:
      "Cung cấp cái nhìn toàn diện thời gian thực về tình trạng vận hành Hệ thống Quản lý An toàn Thực phẩm (FSMS), tích hợp dữ liệu từ 8 phân hệ cốt lõi để Ban Lãnh Đạo đưa ra các quyết định kịp thời.",
    steps: [
      {
        title: "Bước 1: Giám sát Chỉ số Tuân thủ FSMS",
        desc: "Theo dõi tỷ lệ tuân thủ tổng thể và các chỉ số thành phần (CCP, PRP, Hiệu chuẩn, Đào tạo, CAPA).",
      },
      {
        title: "Bước 2: Thiết lập & Đánh giá Mục tiêu Chất lượng",
        desc: "Tạo mới các mục tiêu định lượng theo năm cho từng phòng ban và cập nhật tiến độ định kỳ hàng quý.",
      },
      {
        title: "Bước 3: Tổ chức Xem xét của Lãnh đạo",
        desc: "Lập biên bản cuộc họp xem xét lãnh đạo tối thiểu 1 lần/năm, ghi nhận các đầu vào đánh giá và quyết định phân bổ nguồn lực.",
      },
    ],
    forms: [
      "Biên bản họp Xem xét của Lãnh đạo (BM-BGD-01)",
      "Bảng theo dõi Mục tiêu Chất lượng & ATTP (BM-MTCL-01)",
      "Báo cáo Chỉ số Sức khỏe Hệ thống FSMS",
    ],
    auditTips: [
      "Chuyên gia đánh giá luôn kiểm tra bằng chứng Ban Giám Đốc cam kết nguồn lực và xem xét định kỳ kết quả đánh giá nội bộ, phản hồi khách hàng.",
      "Các mục tiêu chất lượng phải đo lường được (SMART), không đặt mục tiêu chung chung.",
    ],
  },
  organization: {
    title: "Bối Cảnh Tổ Chức & Đội An Toàn Thực Phẩm",
    badge: "Hoạch Định Hệ Thống",
    objective:
      "Xác định bối cảnh nội bộ/bên ngoài, các bên quan tâm và kỳ vọng của họ, nhận diện rủi ro chiến lược và thành lập Đội An Toàn Thực Phẩm (Food Safety Team) có đủ năng lực.",
    steps: [
      {
        title: "Bước 1: Thành lập Đội ATTP",
        desc: "Quyết định bổ nhiệm Đội trưởng, Đội phó và thành viên đa chức năng (QA, Sản xuất, Cơ điện, Mua hàng, Kho).",
      },
      {
        title: "Bước 2: Nhận diện Các Bên Quan Tâm",
        desc: "Khai báo các bên liên quan (Cơ quan nhà nước, Khách hàng B2B, Người tiêu dùng, Nhà cung cấp) và yêu cầu luật định tương ứng.",
      },
      {
        title: "Bước 3: Đánh giá Rủi ro & Cơ hội Bối cảnh",
        desc: "Chấm điểm xác suất (Likelihood) × Mức độ nghiêm trọng (Severity) và xây dựng kế hoạch ứng phó.",
      },
    ],
    forms: [
      "Quyết định Bổ nhiệm Đội ATTP (QĐ-ATTP)",
      "Bảng Phân tích Ma trận Các Bên Quan Tâm (BM-CQTT-01)",
      "Sổ Đăng ký Rủi ro & Cơ hội Bối cảnh Nhà máy (BM-RR-01)",
    ],
    auditTips: [
      "Hồ sơ năng lực của Đội ATTP phải có chứng chỉ đào tạo ISO 22000 / HACCP và bằng chứng cập nhật kiến thức định kỳ.",
      "Rủi ro bối cảnh cần được rà soát lại khi có biến động thị trường hoặc quy định pháp luật mới.",
    ],
  },
  documents: {
    title: "Hệ Thống Thông Tin Dạng Văn Bản",
    badge: "Hỗ Trợ & Kiểm Soát",
    objective:
      "Thiết lập và duy trì hệ thống tài liệu, quy trình SOP, biểu mẫu ghi chép đáp ứng yêu cầu kiểm soát tài liệu lỗi thời và phân phối đúng nơi sử dụng.",
    steps: [
      {
        title: "Bước 1: Đăng ký Danh mục Tài liệu",
        desc: "Nhập mã tài liệu, tên quy trình SOP, phòng ban ban hành, ngày hiệu lực và số lần soát xét.",
      },
      {
        title: "Bước 2: Phê duyệt & Ban hành",
        desc: "Chuyển tài liệu qua luồng thẩm định kỹ thuật và phê duyệt bởi người có thẩm quyền trước khi ban hành.",
      },
      {
        title: "Bước 3: Thu hồi & Lưu trữ",
        desc: "Khi có phiên bản mới, đánh dấu tài liệu cũ là 'Lỗi thời / Hết hiệu lực' và đảm bảo tại hiện trường chỉ dùng bản mới nhất.",
      },
    ],
    forms: [
      "Danh mục Tài liệu Nội bộ & Bên ngoài (Sổ chủ tài liệu)",
      "Quy trình Kiểm soát Thông tin Dạng Văn bản (SOP-DOC-01)",
      "Phiếu Đề nghị Soát xét / Ban hành Tài liệu mới",
    ],
    auditTips: [
      "Lỗi thường gặp nhất khi audit: Tại chuyền sản xuất công nhân vẫn dùng biểu mẫu cũ chưa cập nhật.",
      "Tất cả tài liệu bên ngoài (tiêu chuẩn Codex, TCVN, thông tư) phải có dấu kiểm soát ngày cập nhật.",
    ],
  },
  audits: {
    title: "Đánh Giá Nội Bộ & Đào Tạo Nhân Sự",
    badge: "Đánh Giá Hiệu Năng",
    objective:
      "Lập kế hoạch đánh giá nội bộ định kỳ để kiểm tra mức độ phù hợp và hiệu lực của FSMS, đồng thời quản lý sát hạch đào tạo nhân sự và kiểm soát sức khỏe người thao tác.",
    steps: [
      {
        title: "Bước 1: Lập Chương trình Đánh giá Nội bộ",
        desc: "Xác định mục tiêu, phạm vi đánh giá, chỉ định Trưởng đoàn và các đánh giá viên độc lập với khu vực được đánh giá.",
      },
      {
        title: "Bước 2: Ghi nhận Phát hiện Đánh giá (Audit Findings)",
        desc: "Ghi nhận sự phù hợp, điểm không phù hợp (NC) hoặc điểm khuyến nghị cải tiến (OFI) theo checklist.",
      },
      {
        title: "Bước 3: Quản lý Đào tạo & Khai báo Sức khỏe",
        desc: "Tổ chức khóa đào tạo vệ sinh ATTP, lưu kết quả kiểm tra sát hạch và giám sát khai báo triệu chứng bệnh trước mỗi ca.",
      },
    ],
    forms: [
      "Kế hoạch Đánh giá Nội bộ Hàng năm (BM-DGNB-01)",
      "Checklist Câu hỏi Đánh giá Từng Phân xưởng",
      "Báo cáo Kết quả Đánh giá Nội bộ & Danh mục NC",
      "Hồ sơ Khám sức khỏe & Khai báo Y tế Đầu ca",
    ],
    auditTips: [
      "Đánh giá viên nội bộ KHÔNG được tự đánh giá công việc của phòng ban mình.",
      "Mọi phát hiện NC từ cuộc đánh giá nội bộ phải được liên kết sang hệ thống CAPA để giải quyết dứt điểm.",
    ],
  },
  haccp: {
    title: "Kế Hoạch HACCP & Kiểm Soát Mối Nguy",
    badge: "Vận Hành Cốt Lõi",
    objective:
      "Xây dựng lưu đồ công đoạn, tiến hành phân tích mối nguy (Sinh học, Hóa học, Vật lý, Dị nguyên), áp dụng Cây quyết định Codex để xác định Điểm kiểm soát tới hạn (CCP) và Chương trình tiên quyết vận hành (oPRP).",
    steps: [
      {
        title: "Bước 1: Xây dựng Lưu đồ Quy trình (Flowchart)",
        desc: "Tạo các công đoạn sản xuất tuần tự từ tiếp nhận nguyên liệu, sơ chế, chế biến đến đóng gói và xuất kho.",
      },
      {
        title: "Bước 2: Phân tích Mối nguy & Cây Quyết định",
        desc: "Xác định mối nguy tiềm ẩn ở từng bước, đánh giá rủi ro và trả lời bộ câu hỏi Q1 - Q4 Codex để phân loại CCP / oPRP.",
      },
      {
        title: "Bước 3: Thiết lập Ngưỡng tới hạn & Giám sát theo Ca",
        desc: "Cấu hình giới hạn tới hạn (nhiệt độ, thời gian, kích thước mẫu kim loại) và nhập dữ liệu đo đạc thực tế theo từng mẻ.",
      },
    ],
    forms: [
      "Bảng Kế hoạch HACCP Tổng thể (HACCP Plan)",
      "Bảng Phân tích Mối nguy & Cây Quyết định Codex",
      "Nhật ký Giám sát Điểm Kiểm soát Tới hạn (BM-CCP-01)",
      "Biên bản Xử lý Sai lệch Ngưỡng Tới hạn",
    ],
    auditTips: [
      "Ngưỡng tới hạn (Critical Limit) bắt buộc phải có tài liệu căn cứ khoa học thẩm định (Validation Study).",
      "Khi CCP vượt ngưỡng, phải có ngay hành động cô lập mẻ hàng và tiến hành hiệu chỉnh thiết bị.",
    ],
  },
  prp: {
    title: "Chương Trình Tiên Quyết PRP / GMP / SSOP",
    badge: "Vệ Sinh Cơ Sở",
    objective:
      "Duy trì các điều kiện vệ sinh môi trường cơ bản trong toàn bộ chuỗi chế biến thực phẩm: vệ sinh cá nhân, phòng ngừa lây nhiễm chéo, kiểm soát động vật gây hại, chất lượng nguồn nước và vệ sinh bề mặt tiếp xúc thực phẩm.",
    steps: [
      {
        title: "Bước 1: Thiết lập Chương trình PRP",
        desc: "Khai báo các chương trình GMP (Quy phạm sản xuất), SSOP (Quy phạm vệ sinh chuẩn), Kiểm soát côn trùng, Nguồn nước.",
      },
      {
        title: "Bước 2: Phân công Checklist Giám sát Theo Ca",
        desc: "Xây dựng danh mục các câu hỏi kiểm tra trực quan tại hiện trường trước khi bắt đầu ca sản xuất.",
      },
      {
        title: "Bước 3: Ghi nhận & Xử lý Điểm Chưa Tuân Thủ",
        desc: "Nhập kết quả kiểm tra ca (Đạt / Không đạt), tự động tính toán tỷ lệ tuân thủ và yêu cầu vệ sinh lại ngay nếu phát hiện tồn tại.",
      },
    ],
    forms: [
      "Sổ Tay Quy Phạm Vệ sinh Chuẩn (SSOP-01 đến SSOP-10)",
      "Checklist Giám sát Vệ sinh Nhà xưởng Hàng ca (BM-VS-01)",
      "Nhật ký Kiểm soát Côn trùng & Bẫy bả Động vật gây hại",
      "Hồ sơ Thử nghiệm Mẫu nước Sinh hoạt & Nước đá Định kỳ",
    ],
    auditTips: [
      "Chuyên gia đánh giá sẽ trực tiếp xuống nhà xưởng soi rọi cống rãnh, góc tường và bẫy đèn côn trùng xem có khớp với ghi chép.",
      "Hóa chất tẩy rửa khử trùng phải có trong danh mục được phép dùng cho thực phẩm và bảo quản tách biệt.",
    ],
  },
  capa: {
    title: "Sự Không Phù Hợp & Hành Động Khắc Phục (CAPA)",
    badge: "Cải Tiến Liên Tục",
    objective:
      "Quản lý toàn bộ vòng đời xử lý sự cố an toàn thực phẩm: từ ghi nhận sự không phù hợp (NC), cô lập lô hàng, phân tích nguyên nhân gốc rễ (5-Why / Fishbone) đến xây dựng hành động khắc phục và thẩm tra hiệu lực.",
    steps: [
      {
        title: "Bước 1: Ghi nhận Sự không phù hợp (NC)",
        desc: "Mô tả sự cố, nguồn gốc phát sinh (CCP vượt ngưỡng, khiếu nại khách hàng, audit nội bộ) và thực hiện ngay hành động cô lập tức thì.",
      },
      {
        title: "Bước 2: Phân tích Nguyên nhân Gốc rễ (5-Why)",
        desc: "Sử dụng công cụ AI hoặc họp hội đồng QA để tìm ra nguyên nhân sâu xa nhất, không chỉ giải quyết bề nổi.",
      },
      {
        title: "Bước 3: Lập Biện pháp Khắc phục & Thẩm tra Hiệu lực",
        desc: "Phân công người thực hiện, thời hạn hoàn thành và tiến hành tái đánh giá sau 30-60 ngày để xác nhận lỗi không tái diễn.",
      },
    ],
    forms: [
      "Phiếu Báo cáo Sự Không Phù Hợp (BM-NC-01)",
      "Phiếu Yêu cầu Hành động Khắc phục & Phòng ngừa (BM-CAPA-01)",
      "Báo cáo Phân tích Nguyên nhân Gốc rễ 5-Why",
      "Biên bản Thẩm tra Hiệu lực CAPA Sau 30 Ngày",
    ],
    auditTips: [
      "Không bao giờ ghi nguyên nhân gốc rễ là 'Do sơ suất của công nhân'. Phải chỉ ra thiếu sót về đào tạo, quy trình hay thiết bị.",
      "Một CAPA chỉ được đóng (Closed) khi có chữ ký thẩm tra bằng chứng của Trưởng ban QA.",
    ],
  },
  equipment: {
    title: "Kiểm Soát Thiết Bị & Bảo Trì, Hiệu Chuẩn",
    badge: "Hỗ Trợ Cơ Sở Vật Chất",
    objective:
      "Quản lý hồ sơ lý lịch máy móc thiết bị chế biến và đo lường (nhiệt kế, cân, máy dò kim loại, khúc xạ kế), lập kế hoạch bảo trì phòng ngừa (PM) và theo dõi hạn hiệu chuẩn kiểm định.",
    steps: [
      {
        title: "Bước 1: Khai báo Danh mục Thiết bị",
        desc: "Nhập mã máy, tên thiết bị, phân loại (Đo lường / Chế biến / Kho lạnh), vị trí lắp đặt và chu kỳ hiệu chuẩn.",
      },
      {
        title: "Bước 2: Ghi nhận Nhật ký Bảo trì Phòng ngừa",
        desc: "Ghi nhận công việc bảo trì định kỳ, phụ tùng thay thế và xác nhận bắt buộc dùng mỡ an toàn thực phẩm NSF H1.",
      },
      {
        title: "Bước 3: Quản lý Hồ sơ Hiệu chuẩn / Kiểm định",
        desc: "Cập nhật ngày hiệu chuẩn, cơ quan hiệu chuẩn (QUATEST, VILAS), số tem/giấy chứng nhận và theo dõi cảnh báo cận hạn.",
      },
    ],
    forms: [
      "Sổ Lý lịch Máy & Thiết bị Đo lường (BM-TB-01)",
      "Kế hoạch Bảo trì Phòng ngừa Thiết bị Hàng năm",
      "Nhật ký Bảo trì & Xác nhận Vệ sinh Sau sửa chữa",
      "Hồ sơ Giấy Chứng nhận Hiệu chuẩn & Dung sai Đo",
    ],
    auditTips: [
      "Dầu mỡ bôi trơn máy tiếp xúc trên dây chuyền bắt buộc phải có chứng chỉ NSF H1 (Food Grade).",
      "Nếu thiết bị đo lường CCP bị quá hạn hiệu chuẩn, toàn bộ mẻ sản xuất trong giai đoạn đó sẽ bị nghi ngờ chất lượng.",
    ],
  },
  inventory: {
    title: "Quản Lý Kho Vận & Tồn Kho FEFO",
    badge: "Chuỗi Cung Ứng & Truy Xuất",
    objective:
      "Kiểm soát xuất nhập tồn kho nguyên liệu, phụ gia, bao bì và thành phẩm theo nguyên tắc Hết hạn trước - Xuất trước (FEFO), quản lý mẫu lưu đối chứng, mẻ sản xuất, kiểm tra xe vận chuyển và biên bản hủy hàng.",
    steps: [
      {
        title: "Bước 1: Nhập kho Lô hàng & Gán Nhãn QR",
        desc: "Nhập thông tin lô hàng, số lượng, ngày sản xuất, hạn sử dụng và vị trí kệ bin để hệ thống tự động xếp hạng ưu tiên FEFO.",
      },
      {
        title: "Bước 2: Quản lý Mẫu lưu Nghiệm thức",
        desc: "Lưu mẫu đối chứng theo từng mẻ sản xuất trong tủ đông/mát với thời gian lưu = Hạn sử dụng + 30 ngày.",
      },
      {
        title: "Bước 3: Kiểm tra Phương tiện Vận chuyển (PTVC)",
        desc: "Kiểm tra 5 tiêu chí kỹ thuật thùng xe trước khi bốc hàng (nhiệt độ, sạch sẽ, không mùi lạ, không côn trùng).",
      },
    ],
    forms: [
      "Thẻ Kho & Báo cáo Tồn kho FEFO Thời gian thực",
      "Sổ Theo dõi Mẫu lưu Đối chứng (BM-ML-01)",
      "Biên bản Kiểm tra Phương tiện Vận chuyển (BM01-PTVC)",
      "Biên bản Tiêu hủy Thực phẩm Không phù hợp (BM02-HỦY)",
    ],
    auditTips: [
      "Hệ thống kho phải chứng minh được các lô cận hạn được cảnh báo và xuất trước mẻ có hạn xa hơn.",
      "Tủ lưu mẫu đối chứng phải khóa và có bảng theo dõi nhiệt độ 2 lần/ngày.",
    ],
  },
  traceability: {
    title: "Truy Xuất Nguồn Gốc 1 Chạm",
    badge: "Ứng Phó Sự Cố",
    objective:
      "Thực hiện truy xuất ngược dòng từ mẻ thành phẩm/phiếu xuất về tận nhà cung ứng nguyên liệu chỉ trong vài giây, và diễn tập giả lập thu hồi sản phẩm (Mock Recall) đáp ứng thời gian vàng dưới 2 giờ.",
    steps: [
      {
        title: "Bước 1: Nhập Mã Truy vết",
        desc: "Quét mã QR trên bao bì hoặc nhập mã mẻ (LOT-2026-B01) / mã phiếu xuất kho để khởi động sơ đồ cây truy xuất.",
      },
      {
        title: "Bước 2: Xem Cây Phả Hệ Chuỗi Cung Ứng",
        desc: "Khám phá liên kết từ: Nhà cung ứng $\\rightarrow$ Lô nguyên liệu $\\rightarrow$ Công đoạn CCP $\\rightarrow$ Mẫu lưu $\\rightarrow$ Khách hàng nhận hàng.",
      },
      {
        title: "Bước 3: Thực hiện Diễn tập Thu hồi (Mock Recall)",
        desc: "Kích hoạt chức năng tính toán cân bằng vật chất (Mass Balance), xác định lượng hàng đã giao và xuất báo cáo thu hồi tự động.",
      },
    ],
    forms: [
      "Sơ đồ Cây Truy xuất Nguồn gốc 1 Chạm",
      "Báo cáo Thẩm tra Diễn tập Thu hồi (Mock Recall Report)",
      "Bảng Cân bằng Vật chất (Mass Balance Sheet)",
    ],
    auditTips: [
      "Tiêu chuẩn ISO 22000 yêu cầu nhà máy phải diễn tập thu hồi tối thiểu 1 lần/năm với thời gian truy vết hoàn tất ≤ 2 giờ.",
      "Tỷ lệ cân bằng vật chất giữa nguyên liệu đầu vào và sản phẩm đầu ra phải đạt độ tin cậy trên 98%.",
    ],
  },
  purchasing: {
    title: "Đánh Giá Nhà Cung Cấp & Mua Hàng",
    badge: "Đầu Vào Chuỗi Cung Ứng",
    objective:
      "Kiểm soát nghiêm ngặt nguồn cung cấp nguyên liệu, hóa chất, bao bì tiếp xúc trực tiếp: khảo sát năng lực nhà cung cấp (BM-NCC-01), lập Danh mục nhà cung cấp được phê duyệt (ASL) và kiểm tra tiếp nhận nguyên liệu (IQC).",
    steps: [
      {
        title: "Bước 1: Khảo sát & Đánh giá Nhà cung cấp",
        desc: "Nhập thông tin nhà cung cấp, kiểm tra chứng chỉ ATTP (ISO 22000, HACCP, VietGAP) và chấm điểm tiêu chí BM-NCC-01.",
      },
      {
        title: "Bước 2: Phê duyệt Danh mục Nhà cung cấp (ASL)",
        desc: "Phân hạng nhà cung cấp theo mức độ rủi ro (Hạng A, B, C) để quyết định tần suất đánh giá lại.",
      },
      {
        title: "Bước 3: Kiểm tra Nhận hàng Đầu vào (IQC)",
        desc: "Kiểm tra cảm quan, nhiệt độ xe giao, chứng nhận xuất xứ COA của từng lô nguyên liệu trước khi nhập kho.",
      },
    ],
    forms: [
      "Bảng Đánh giá Nhà Cung Cấp (BM-NCC-01)",
      "Danh mục Nhà Cung Cấp Được Phê Duyệt (ASL Hàng năm)",
      "Phiếu Kiểm tra Tiếp nhận Nguyên liệu Đầu vào (BM-IQC-01)",
    ],
    auditTips: [
      "Chỉ được mua hàng từ các đơn vị nằm trong Danh mục ASL đã được Giám đốc / Trưởng ban QA phê duyệt.",
      "Mỗi lô hàng nhập phải lưu kèm bản sao COA kiểm nghiệm vi sinh / kim loại nặng của nhà cung cấp.",
    ],
  },
  emergency: {
    title: "Ứng Phó Tình Huống Khẩn Cấp & Sự Cố",
    badge: "Quản Trị Rủi Ro Đột Xuất",
    objective:
      "Chuẩn bị sẵn sàng kịch bản đối phó cho 7+2 nhóm tình huống khẩn cấp có thể ảnh hưởng đến an toàn thực phẩm (cháy nổ, mất điện, mất nước, hỏng kho lạnh, ô nhiễm hóa chất, khủng bố sinh học) và tổ chức diễn tập định kỳ.",
    steps: [
      {
        title: "Bước 1: Thiết lập Danh bạ Đầu mối Khẩn cấp",
        desc: "Khai báo hotline chỉ huy nội bộ (Trưởng ban ATTP, Đội PCCC) và cơ quan cứu viện ngoại vi (Cảnh sát PCCC, Bệnh viện, Điện lực).",
      },
      {
        title: "Bước 2: Xây dựng Kịch bản Ứng phó Chi tiết",
        desc: "Xác định hành động cần làm ngay trong 5 phút đầu, phương tiện cần chuẩn bị và quy trình cô lập thực phẩm.",
      },
      {
        title: "Bước 3: Ghi nhận Diễn tập Định kỳ & Sự cố Thực tế",
        desc: "Ghi nhận kết quả diễn tập hàng năm, đo thời gian phản ứng và lập yêu cầu cải tiến CAPA sau diễn tập.",
      },
    ],
    forms: [
      "Sổ Danh bạ Liên lạc Khẩn cấp 24/7 (Nội bộ & Ngoại viện)",
      "Quy trình Kịch bản Ứng phó 7+2 Nhóm Sự cố Khẩn cấp",
      "Biên bản Đánh giá Diễn tập Phương án Khẩn cấp (BM-DT-01)",
    ],
    auditTips: [
      "Kiểm tra xác suất gọi vào các số điện thoại trong danh bạ khẩn cấp xem có người tiếp nhận 24/7 không.",
      "Tất cả kịch bản phải nêu rõ cách xử lý đối với thực phẩm đang nằm trên chuyền tại thời điểm xảy ra sự cố.",
    ],
  },
  "change-management": {
    title: "Quản Lý Thay Đổi",
    badge: "Kiểm Soát Rủi Ro",
    objective:
      "Kiểm soát các thay đổi về nguyên liệu, công thức, thiết bị, nhà xưởng hoặc quy định pháp lý để đảm bảo không làm phát sinh mối nguy mới và duy trì tính toàn vẹn của hệ thống FSMS.",
    steps: [
      {
        title: "Bước 1: Lập Đề Xuất Thay Đổi (CR)",
        desc: "Nêu rõ lý do thay đổi, nội dung thay đổi và phòng ban khởi xướng.",
      },
      {
        title: "Bước 2: Đánh giá Tác động An toàn Thực phẩm",
        desc: "Đội ATTP họp đánh giá: Thay đổi này có ảnh hưởng đến Kế hoạch HACCP, Chương trình PRP hay tài liệu nào không?",
      },
      {
        title: "Bước 3: Phê duyệt & Thẩm tra Sau Thực hiện",
        desc: "Chạy thử nghiệm mẻ pilot, kiểm nghiệm sản phẩm và Trưởng ban QA nghiệm thu trước khi áp dụng đại trà.",
      },
    ],
    forms: [
      "Phiếu Đề Xuất & Phê Duyệt Thay Đổi (BM-CR-01)",
      "Biên bản Đánh giá Tác động HACCP / PRP khi Thay đổi",
      "Báo cáo Nghiệm thu Chạy thử Pilot Sau Thay đổi",
    ],
    auditTips: [
      "Khi thay đổi nhà cung cấp phụ gia hoặc thay máy mới tại điểm CCP, bắt buộc phải có phiếu Change Request đã ký duyệt.",
      "Phải chứng minh tài liệu liên quan (SOP, bản vẽ) đã được cập nhật phiên bản tương ứng.",
    ],
  },
  builder: {
    title: "Bộ Công Cụ Biểu Mẫu & Lưu Đồ Động",
    badge: "Tùy Biến Số Hóa",
    objective:
      "Cho phép chuyên viên QA/HACCP tự tạo các biểu mẫu kiểm tra số hóa (Form Builder) và thiết lập các lưu đồ phê duyệt điện tử (Workflow Builder) theo đặc thù từng dây chuyền nhà máy.",
    steps: [
      {
        title: "Bước 1: Thiết kế Mẫu biểu Động (Form)",
        desc: "Kéo thả các trường dữ liệu: văn bản, số đo đạc kèm dung sai, checklist đạt/không đạt, ảnh chụp hiện trường.",
      },
      {
        title: "Bước 2: Cấu hình Quy trình Duyệt (Workflow)",
        desc: "Thiết lập các bước duyệt tuần tự hoặc song song (Người lập $\\rightarrow$ Trưởng ca $\\rightarrow$ QA Lead $\\rightarrow$ Giám đốc).",
      },
      {
        title: "Bước 3: Triển khai Ghi chép & Phê duyệt Online",
        desc: "Công nhân thao tác trên máy tính bảng hoặc máy tính, hệ thống tự động lưu vết và đóng dấu thời gian.",
      },
    ],
    forms: [
      "Mẫu Biểu Mẫu Động (Form Template JSON)",
      "Lưu Đồ Phê Duyệt Điện Tử (Workflow Definition)",
      "Nhật Ký Dữ Liệu Nộp (Form Submissions)",
    ],
    auditTips: [
      "Hệ thống số hóa phải có cơ chế phân quyền rõ ràng, không cho phép công nhân tự sửa dữ liệu đo đạc sau khi đã nộp ca.",
      "Lịch sử phê duyệt điện tử (Audit Trail) có giá trị pháp lý tương đương chữ ký tay.",
    ],
  },
};

interface ModuleGuideModalProps {
  module: ModuleKey;
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

export function ModuleGuideModal({
  module,
  open,
  isOpen,
  onOpenChange,
  onClose,
  onAction,
  actionLabel,
}: ModuleGuideModalProps) {
  const guide = MODULE_GUIDES[module];
  const isModalOpen = open ?? isOpen ?? false;
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    if (!val && onClose) onClose();
  };

  if (!guide) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0 rounded-2xl border border-border shadow-2xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white relative overflow-hidden rounded-t-2xl">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <BookOpen className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-none font-medium px-2.5 py-0.5 text-xs">
                {guide.badge}
              </Badge>
              <span className="text-white/80 text-xs flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> ISO 22000:2018 Standard
              </span>
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-emerald-200 shrink-0" />
              <span>Hướng Dẫn Vận Hành: {guide.title}</span>
            </DialogTitle>
            <DialogDescription className="text-white/90 text-sm mt-2 max-w-2xl leading-relaxed">
              {guide.objective}
            </DialogDescription>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Quy trình thực hiện từng bước */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
              <Workflow className="w-4 h-4 text-primary" />
              <span>Quy Trình Các Bước Vận Hành Chuẩn</span>
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              {guide.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border/80 bg-muted/40 p-4 transition-all hover:bg-muted/70 hover:border-primary/40"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <h5 className="font-semibold text-sm text-foreground line-clamp-1">
                      {step.title}
                    </h5>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Hồ sơ biểu mẫu & Mẹo đánh giá */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Cột 1: Hồ sơ biểu mẫu */}
            <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Hồ Sơ & Biểu Mẫu Cần Lập</span>
              </h4>
              <ul className="space-y-2">
                {guide.forms.map((form, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-muted-foreground flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{form}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cột 2: Lưu ý khi đánh giá audit */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Lưu Ý Khi Thanh Tra & Đánh Giá</span>
              </h4>
              <ul className="space-y-2">
                {guide.auditTips.map((tip, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-muted-foreground flex items-start gap-2"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-muted/30 border-t border-border px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            className="text-muted-foreground hover:text-foreground h-9 px-4 rounded-xl cursor-pointer"
          >
            Đóng hướng dẫn
          </Button>

          {onAction && actionLabel && (
            <Button
              onClick={() => {
                handleOpenChange(false);
                onAction();
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-9 px-4 rounded-xl shadow-md shadow-primary/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{actionLabel}</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
