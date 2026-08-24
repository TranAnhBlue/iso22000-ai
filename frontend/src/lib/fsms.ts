import { newId, type Row } from "@/lib/crud-store";

/* ---------------- HACCP ---------------- */

export type HazardType = "Sinh học" | "Hóa học" | "Vật lý";

export interface Hazard {
  id: string;
  type: HazardType;
  desc: string;
  likelihood: number; // 1-5
  severity: number; // 1-5
  control: string;
  significant: boolean;
}

export interface CCP {
  limit: string;
  method: string;
  frequency: string;
  corrective: string;
}

export interface Step {
  id: string;
  name: string;
  hazards: Hazard[];
  ccp?: CCP | null;
}

export type PlanStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface Plan extends Row {
  name: string;
  scope: string;
  version: string;
  product: string;
  status: PlanStatus;
  createdAt: string;
  steps: Step[];
}

export const riskScore = (h: Pick<Hazard, "likelihood" | "severity">) => h.likelihood * h.severity;

export const riskTone = (s: number) =>
  s >= 15 ? "bg-rose-500/10 text-rose-700" : s >= 8 ? "bg-amber-500/10 text-amber-700" : "bg-emerald-500/10 text-emerald-700";

export const planStatusLabel: Record<PlanStatus, string> = {
  DRAFT: "NHÁP",
  ACTIVE: "ĐANG ÁP DỤNG",
  ARCHIVED: "LƯU TRỮ",
};

export const planStatusTone: Record<PlanStatus, string> = {
  DRAFT: "bg-slate-500/10 text-slate-700",
  ACTIVE: "bg-emerald-500/10 text-emerald-700",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export const PLAN_SEED: Plan[] = [
  {
    id: "HP-001",
    name: "Dây chuyền Sữa tươi tiệt trùng UHT",
    scope: "Sản xuất",
    version: "v1.0",
    product: "Sữa tươi tiệt trùng UHT 1L",
    status: "ACTIVE",
    createdAt: "20/05/2026",
    steps: [
      {
        id: "S1",
        name: "1. Tiếp nhận sữa nguyên liệu",
        hazards: [
          {
            id: "H1",
            type: "Sinh học",
            desc: "Vi sinh vật gây bệnh (Salmonella, E.coli) trong sữa tươi",
            likelihood: 3,
            severity: 4,
            control: "Kiểm tra chứng thư từng lô, test nhanh kháng sinh & tổng vi khuẩn hiếu khí",
            significant: true,
          },
          {
            id: "H2",
            type: "Hóa học",
            desc: "Tồn dư kháng sinh vượt ngưỡng",
            likelihood: 2,
            severity: 4,
            control: "Test kit kháng sinh mỗi xe bồn",
            significant: false,
          },
        ],
        ccp: null,
      },
      {
        id: "S2",
        name: "2. Làm lạnh & bảo quản",
        hazards: [
          {
            id: "H3",
            type: "Sinh học",
            desc: "Vi sinh vật phát triển do nhiệt độ bảo quản cao",
            likelihood: 3,
            severity: 3,
            control: "Duy trì bồn lạnh ≤ 4°C, ghi nhật ký 2h/lần",
            significant: false,
          },
        ],
        ccp: null,
      },
      {
        id: "S3",
        name: "3. Tiệt trùng UHT",
        hazards: [
          {
            id: "H4",
            type: "Sinh học",
            desc: "Vi sinh vật sống sót do gia nhiệt không đủ",
            likelihood: 4,
            severity: 5,
            control: "Kiểm soát nhiệt độ – thời gian tiệt trùng, van hồi lưu tự động",
            significant: true,
          },
        ],
        ccp: {
          limit: "Nhiệt độ ≥ 137°C trong ≥ 4 giây",
          method: "Cảm biến nhiệt tự động + đồng hồ ghi",
          frequency: "Liên tục, đọc số mỗi 30 phút",
          corrective: "Hồi lưu sản phẩm, cô lập lô, kiểm tra van & hiệu chuẩn cảm biến",
        },
      },
      {
        id: "S4",
        name: "4. Chiết rót vô trùng",
        hazards: [
          {
            id: "H5",
            type: "Vật lý",
            desc: "Mảnh kim loại/nhựa từ thiết bị chiết rót",
            likelihood: 2,
            severity: 4,
            control: "Máy dò kim loại cuối chuyền",
            significant: true,
          },
        ],
        ccp: {
          limit: "Không phát hiện mảnh kim loại Fe ≥ 2.0mm",
          method: "Máy dò kim loại 100% sản phẩm",
          frequency: "Kiểm chuẩn máy mỗi 2 giờ",
          corrective: "Loại bỏ sản phẩm, cô lập lô từ lần kiểm chuẩn đạt gần nhất",
        },
      },
    ],
  },
  {
    id: "HP-002",
    name: "Dây chuyền Sữa chua ăn",
    scope: "Sản xuất",
    version: "v1.0",
    product: "Sữa chua có đường 100g",
    status: "DRAFT",
    createdAt: "02/06/2026",
    steps: [],
  },
];

export interface MonitoringLog {
  id: string;
  stepId: string;
  stepName: string;
  limit: string;
  value: string;
  result: "PASS" | "DEVIATION" | "";
  note: string;
  ncId?: string;
}

export interface HaccpSchedule extends Row {
  planId: string;
  planName: string;
  date: string;
  status: "Bản nháp" | "Hoàn thành";
  logs: MonitoringLog[];
}

export const HACCP_SCHEDULE_SEED: HaccpSchedule[] = [
  {
    id: "SCH-001",
    planId: "HP-001",
    planName: "Dây chuyền Sữa tươi tiệt trùng UHT",
    date: "20/05/2026",
    status: "Bản nháp",
    logs: [],
  },
];

/* ---------------- PRP ---------------- */

export type AnswerType = "BOOLEAN" | "SELECT" | "NUMBER" | "TEXT";

export interface ChecklistItem {
  id: string;
  question: string;
  type: AnswerType;
  standard: string;
  critical: boolean;
}

export interface PrpProgram extends Row {
  code: string;
  name: string;
  category: string;
  items: ChecklistItem[];
}

export const PRP_SEED: PrpProgram[] = [
  {
    id: "PRP-001",
    code: "SSOP-01",
    name: "Kiểm soát vệ sinh cá nhân",
    category: "Vệ sinh & Nhân sự",
    items: [
      {
        id: "Q1",
        question:
          "100% nhân viên và khách tham quan có tuân thủ quy trình thay bảo hộ lao động (mũ bọc tóc, quần áo sạch, giày/ủng chuyên dụng) trước khi vào khu vực sản xuất không?",
        type: "BOOLEAN",
        standard: "Đạt = 100% tuân thủ",
        critical: true,
      },
      {
        id: "Q2",
        question:
          "Công ty có kiểm tra và ghi chép tình trạng sức khỏe đầu ca của nhân viên (không có vết thương hở, không mắc bệnh truyền nhiễm) không?",
        type: "BOOLEAN",
        standard: "Có hồ sơ đầy đủ mỗi ca",
        critical: true,
      },
      {
        id: "Q3",
        question:
          "Các bồn rửa tay tại lối vào có đầy đủ nước sạch, xà phòng, dung dịch khử trùng và khăn lau tay dùng một lần không?",
        type: "BOOLEAN",
        standard: "Đầy đủ tại 100% vị trí",
        critical: false,
      },
      {
        id: "Q4",
        question:
          "Nhân viên có tuân thủ quy định không đeo trang sức và không mang đồ ăn thức uống cá nhân vào phân xưởng không?",
        type: "BOOLEAN",
        standard: "Không phát hiện vi phạm",
        critical: false,
      },
    ],
  },
  {
    id: "PRP-002",
    code: "GMP-02",
    name: "Kiểm soát nhà xưởng & thiết bị",
    category: "Cơ sở hạ tầng",
    items: [
      { id: "Q1", question: "Trần, tường, sàn khu sản xuất có nguyên vẹn, không bong tróc không?", type: "BOOLEAN", standard: "Không có hư hỏng", critical: false },
      { id: "Q2", question: "Nhiệt độ khu chiết rót đo được là bao nhiêu (°C)?", type: "NUMBER", standard: "≤ 22°C", critical: false },
    ],
  },
  {
    id: "PRP-003",
    code: "SSOP-05",
    name: "Kiểm soát côn trùng & động vật gây hại",
    category: "Vệ sinh môi trường",
    items: [
      { id: "Q1", question: "Bẫy côn trùng có được kiểm tra và ghi chép theo tần suất quy định không?", type: "BOOLEAN", standard: "100% bẫy được kiểm tra hàng tuần", critical: false },
    ],
  },
];

export interface AuditAnswer {
  itemId: string;
  question: string;
  critical: boolean;
  result: "PASS" | "FAIL" | "";
  obs: string;
  ncId?: string;
}

export interface PrpSchedule extends Row {
  programId: string;
  programName: string;
  date: string;
  auditor: string;
  status: "Đã lập lịch" | "Hoàn thành";
  answers: AuditAnswer[];
  score: number | null;
}

export const PRP_SCHEDULE_SEED: PrpSchedule[] = [
  {
    id: "PA-001",
    programId: "PRP-001",
    programName: "Kiểm soát vệ sinh cá nhân",
    date: "18/06/2026",
    auditor: "Trần Thị B",
    status: "Đã lập lịch",
    answers: [],
    score: null,
  },
];

/* ---------------- CAPA ---------------- */

export type NCSource = "HACCP_MONITORING" | "PRP_AUDIT" | "CUSTOMER_COMPLAINT" | "INTERNAL_AUDIT";

export const NC_SOURCE_LABEL: Record<NCSource, string> = {
  HACCP_MONITORING: "Giám sát HACCP",
  PRP_AUDIT: "Đánh giá PRP",
  CUSTOMER_COMPLAINT: "Khiếu nại khách hàng",
  INTERNAL_AUDIT: "Đánh giá nội bộ",
};

export interface NC extends Row {
  date: string;
  source: NCSource;
  ref: string;
  content: string;
  severity: "Thấp" | "Trung bình" | "Cao";
  status: "OPEN" | "CAPA" | "CLOSED";
  capaId?: string;
}

export const NC_SEED: NC[] = [
  {
    id: "NC-2026-0007",
    date: "20/05/2026",
    source: "HACCP_MONITORING",
    ref: "HP-001 / CCP Tiệt trùng UHT",
    content: "Nhiệt độ tiệt trùng đo được 132°C (< giới hạn 137°C) tại ca chiều, lặp lại lần 2 trong tuần.",
    severity: "Cao",
    status: "CAPA",
    capaId: "CAPA-2026-0013",
  },
  {
    id: "NC-2026-0008",
    date: "12/06/2026",
    source: "PRP_AUDIT",
    ref: "SSOP-01 / Vệ sinh cá nhân",
    content: "Khách tham quan không thay bảo hộ đầy đủ trước khi vào khu chiết rót.",
    severity: "Cao",
    status: "OPEN",
  },
  {
    id: "NC-2026-0009",
    date: "25/06/2026",
    source: "CUSTOMER_COMPLAINT",
    ref: "Lô SX 2606-A",
    content: "Khách hàng phản ánh hộp sữa bị phồng nhẹ trước hạn sử dụng.",
    severity: "Trung bình",
    status: "OPEN",
  },
];

export type CapaStatus = "OPEN" | "IN_PROGRESS" | "VERIFYING" | "CLOSED";

export const CAPA_STATUS_LABEL: Record<CapaStatus, string> = {
  OPEN: "Đang mở",
  IN_PROGRESS: "Đang xử lý",
  VERIFYING: "Đang xác minh",
  CLOSED: "Đã đóng",
};

export interface Capa extends Row {
  ncId: string;
  title: string;
  rootCause: string;
  method: string;
  action: string;
  preventive: string;
  owner: string;
  due: string;
  progress: number;
  evidence: string;
  verifyNote: string;
  status: CapaStatus;
}

export const CAPA_SEED: Capa[] = [
  {
    id: "CAPA-2026-0013",
    ncId: "NC-2026-0007",
    title: "Sai lệch nhiệt độ tiệt trùng UHT",
    rootCause: "Van điều tiết hơi của lò UHT bị kẹt do cặn, cảm biến nhiệt quá hạn hiệu chuẩn.",
    method: "5 Whys",
    action: "Thay van điều tiết hơi, hiệu chuẩn lại cảm biến nhiệt CCP2.",
    preventive: "Đưa van vào danh mục bảo trì phòng ngừa 3 tháng/lần; cảnh báo hạn hiệu chuẩn tự động.",
    owner: "Phòng Thiết bị",
    due: "30/06/2026",
    progress: 60,
    evidence: "",
    verifyNote: "",
    status: "IN_PROGRESS",
  },
];

export function nextCode(prefix: string, rows: Row[]) {
  const year = new Date().getFullYear();
  const n = rows.length + 1;
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

export { newId };
