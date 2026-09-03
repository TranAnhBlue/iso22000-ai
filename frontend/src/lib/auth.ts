export type Role =
  | "user"
  | "admin"
  | "management"
  | "executive"
  | "qa_qc_manager"
  | "iso_manager"
  | "production"
  | "hr_accounting"
  | "admin_acct"
  | "sales_logistics"
  | "sales"
  | "maintenance"
  | "equipment"
  | "staff";

export interface RoleInfo {
  id: string;
  name: string;
  description: string;
  department: string;
}

export const ROLES: RoleInfo[] = [
  { id: "admin", name: "Quản trị hệ thống", description: "Toàn quyền cấu hình, RBAC, audit log", department: "Quản trị hệ thống" },
  { id: "management", name: "Ban Giám đốc", description: "Phê duyệt tài liệu, xem xét lãnh đạo", department: "Ban Giám đốc" },
  { id: "qa_qc_manager", name: "Ban QLCL & ATTP", description: "Quản lý HACCP, PRP, CAPA, đánh giá nội bộ", department: "Ban QLCL & ATTP" },
  { id: "production", name: "Phòng Sản xuất", description: "Thực hiện GMP, ghi nhận CCP, biểu mẫu sản xuất", department: "Phòng Sản xuất" },
  { id: "hr_accounting", name: "Phòng Hành chính - Kế toán", description: "Quản lý nhân sự, đào tạo, hợp đồng", department: "Phòng Hành chính - Kế toán" },
  { id: "sales_logistics", name: "Phòng Kinh doanh & Kho", description: "Quản lý khách hàng, kho FEFO, truy xuất", department: "Phòng Kinh doanh & Kho" },
  { id: "maintenance", name: "Phòng Thiết bị", description: "Bảo trì, hiệu chuẩn thiết bị", department: "Phòng Thiết bị" },
  { id: "staff", name: "Cán bộ nhân viên", description: "Tra cứu tài liệu, đào tạo, báo cáo NC", department: "Toàn công ty" },
];

const SESSION_KEY = "wcert.session";
const TOKEN_KEY = "wcert.token";

export interface Session {
  role: string;
  name: string;
  loggedAt: string;
  userId?: string;
  username?: string;
  department?: string;
  phone?: string;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session, token?: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function roleLabel(r: string): string {
  const normalized = r.toLowerCase();
  const found = ROLES.find((x) => x.id.toLowerCase() === normalized);
  return found?.name ?? r;
}

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
  | "builder";

export type Access = "none" | "view" | "edit";

const ALL_EDIT: Record<ModuleKey, Access> = {
  dashboard: "edit",
  organization: "edit",
  documents: "edit",
  audits: "edit",
  haccp: "edit",
  prp: "edit",
  capa: "edit",
  equipment: "edit",
  inventory: "edit",
  traceability: "edit",
  purchasing: "edit",
  builder: "edit",
};

const ALL_VIEW: Record<ModuleKey, Access> = {
  dashboard: "view",
  organization: "view",
  documents: "view",
  audits: "view",
  haccp: "view",
  prp: "view",
  capa: "view",
  equipment: "view",
  inventory: "view",
  traceability: "view",
  purchasing: "view",
  builder: "view",
};

const ALL_NONE: Record<ModuleKey, Access> = {
  dashboard: "none",
  organization: "none",
  documents: "none",
  audits: "none",
  haccp: "none",
  prp: "none",
  capa: "none",
  equipment: "none",
  inventory: "none",
  traceability: "none",
  purchasing: "none",
  builder: "none",
};

// MA TRẬN PHÂN QUYỀN CHUẨN ISO 22000:2018 & BẢO MẬT THEO ĐÚNG NGHIỆP VỤ BAN/PHÒNG
export const PERMISSIONS: Record<string, Record<ModuleKey, Access>> = {
  // 0. Người dùng chưa phân quyền
  user: ALL_NONE,

  // 1. Quản trị hệ thống (Toàn quyền 12 module)
  admin: ALL_EDIT,

  // 2. Ban Giám Đốc (Xem xét lãnh đạo Điều 9.3, phê duyệt tài liệu cấp cao Điều 7.5, kích hoạt thu hồi khẩn cấp Điều 8.9.5)
  management: {
    dashboard: "edit",      // Điều 9.3: Xem xét của lãnh đạo & KPI Mục tiêu chất lượng Điều 6.2
    organization: "view",   // Điều 5.3: Xem cơ cấu tổ chức & nhân sự
    documents: "edit",      // Điều 7.5: Phê duyệt ban hành Sổ tay ATTP, Chính sách chất lượng
    audits: "view",         // Điều 9.2: Xem báo cáo kết luận ĐGNB toàn nhà máy
    haccp: "view",          // Điều 8.5: Xem kế hoạch HACCP & Điểm CCP
    prp: "view",            // Điều 8.2: Xem chương trình tiên quyết PRP
    capa: "view",           // Điều 10.2: Xem báo cáo sự cố & khắc phục CAPA
    equipment: "view",      // Điều 7.1.3: Xem tình trạng máy móc thiết bị
    inventory: "view",      // Điều 8.2.4: Xem tình trạng kho hàng & mẫu lưu
    traceability: "edit",   // Điều 8.9.5: Ký duyệt Lệnh thu hồi sản phẩm khẩn cấp
    purchasing: "view",     // Điều 7.1.6: Xem danh bạ nhà cung cấp ASL
    builder: "none",        // Không can thiệp cấu hình builder
  },
  executive: {
    dashboard: "edit",
    organization: "view",
    documents: "edit",
    audits: "view",
    haccp: "view",
    prp: "view",
    capa: "view",
    equipment: "view",
    inventory: "view",
    traceability: "edit",
    purchasing: "view",
    builder: "none",
  },

  // 3. Ban QLCL & ATTP / Đội Trưởng HACCP (Chuyên môn kỹ thuật ATTP, HACCP, PRP, CAPA, ĐGNB, NCC)
  qa_qc_manager: {
    dashboard: "view",      // Xem dashboard chất lượng & cảnh báo
    organization: "view",   // Xem cơ cấu tổ chức
    documents: "edit",      // Soạn thảo & quản lý hệ thống SOP 5 cấp
    audits: "edit",         // Lập kế hoạch ĐGNB & quản lý đào tạo
    haccp: "edit",          // Phân tích mối nguy & thiết lập điểm CCP
    prp: "edit",            // Thiết lập chương trình PRP & thẩm tra vệ sinh
    capa: "edit",           // Phê duyệt CAPA & điều tra nguyên nhân gốc
    equipment: "view",      // Thẩm tra sai số kiểm định thiết bị đo CCP
    inventory: "view",      // Kiểm tra mẫu lưu đối chứng 24h/48h
    traceability: "edit",   // Diễn tập thu hồi sản phẩm 4h
    purchasing: "edit",     // Thẩm định nhà cung cấp ASL & kiểm định IQC
    builder: "view",        // Xem biểu mẫu hệ thống
  },
  iso_manager: {
    dashboard: "view",
    organization: "view",
    documents: "edit",
    audits: "edit",
    haccp: "edit",
    prp: "edit",
    capa: "edit",
    equipment: "view",
    inventory: "view",
    traceability: "edit",
    purchasing: "edit",
    builder: "view",
  },

  // 4. Phòng Sản Xuất (Chế biến, ghi chép đo đạc CCP, vệ sinh GMP, quản lý mẻ sản xuất)
  production: {
    dashboard: "none",      // Bảo mật: Không xem dashboard chiến lược/tài chính của BGĐ
    organization: "none",   // Không xem tổ chức nhân sự
    documents: "view",      // Tra cứu SOP vận hành chế biến
    audits: "view",         // Khai báo sức khỏe đầu ca của công nhân
    haccp: "edit",          // Ghi nhận nhật ký đo đạc điểm CCP theo ca
    prp: "edit",            // Thực hiện checklist vệ sinh nhà xưởng PRP/GMP
    capa: "edit",           // Báo cáo sự không phù hợp NC tại chuyền
    equipment: "view",      // Xem máy móc phân xưởng & báo hỏng máy
    inventory: "edit",      // Quản lý mẻ sản xuất & biệt trữ lô lỗi
    traceability: "view",   // Tra cứu mã mẻ sản xuất
    purchasing: "none",     // Không truy cập thu mua
    builder: "none",        // Không truy cập builder
  },

  // 5. Phòng Cơ Điện & Thiết Bị (Bảo trì máy móc, kiểm định & hiệu chuẩn thiết bị đo)
  maintenance: {
    dashboard: "none",      // Bảo mật: Không xem dashboard chiến lược
    organization: "none",
    documents: "view",      // Xem SOP an toàn cơ điện & hướng dẫn máy
    audits: "none",
    haccp: "none",          // Không truy cập hồ sơ HACCP
    prp: "view",            // Xem yêu cầu bảo dưỡng phòng ngừa PRP
    capa: "edit",           // Thực hiện hành động khắc phục sự cố thiết bị
    equipment: "edit",      // Lập hồ sơ thiết bị, bảo trì 30 ngày & hiệu chuẩn
    inventory: "none",
    traceability: "none",
    purchasing: "none",
    builder: "none",
  },
  equipment: {
    dashboard: "none",
    organization: "none",
    documents: "view",
    audits: "none",
    haccp: "none",
    prp: "view",
    capa: "edit",
    equipment: "edit",
    inventory: "none",
    traceability: "none",
    purchasing: "none",
    builder: "none",
  },

  // 6. Phòng Kinh Doanh & Kho (Xuất nhập tồn FEFO, mẫu lưu đối chứng, truy xuất 1 chạm)
  sales_logistics: {
    dashboard: "none",      // Bảo mật: Không xem dashboard chiến lược
    organization: "none",
    documents: "view",      // Xem SOP kho bãi & vận chuyển
    audits: "none",
    haccp: "none",
    prp: "view",            // Xem quy định vệ sinh kho
    capa: "edit",           // Báo cáo sự cố kho & hỏng hóc bảo quản
    equipment: "none",
    inventory: "edit",      // Quản lý xuất/nhập/tồn FEFO & tủ mẫu lưu
    traceability: "edit",   // Tra cứu chuỗi cung ứng & phiếu xuất kho
    purchasing: "view",     // Xem thông tin tiếp nhận vật tư & phiếu IQC
    builder: "none",
  },
  sales: {
    dashboard: "none",
    organization: "none",
    documents: "view",
    audits: "none",
    haccp: "none",
    prp: "view",
    capa: "edit",
    equipment: "none",
    inventory: "edit",
    traceability: "edit",
    purchasing: "view",
    builder: "none",
  },
  warehouse: {
    dashboard: "none",
    organization: "none",
    documents: "view",
    audits: "none",
    haccp: "none",
    prp: "view",
    capa: "edit",
    equipment: "none",
    inventory: "edit",
    traceability: "edit",
    purchasing: "view",
    builder: "none",
  },

  // 7. Phòng Hành Chính - Kế Toán (Hồ sơ đào tạo nhân sự, khám sức khỏe & khai báo y tế)
  hr_accounting: {
    dashboard: "none",      // Bảo mật: Không xem dashboard kỹ thuật/chất lượng
    organization: "edit",   // Quản lý cơ cấu nhân sự & phòng ban
    documents: "view",      // Xem quy chế & chính sách công ty
    audits: "edit",         // Quản lý chứng chỉ đào tạo ATTP & hồ sơ sức khỏe
    haccp: "none",
    prp: "none",
    capa: "none",
    equipment: "none",
    inventory: "none",
    traceability: "none",
    purchasing: "none",
    builder: "none",
  },
  admin_acct: {
    dashboard: "none",
    organization: "edit",
    documents: "view",
    audits: "edit",
    haccp: "none",
    prp: "none",
    capa: "none",
    equipment: "none",
    inventory: "none",
    traceability: "none",
    purchasing: "none",
    builder: "none",
  },

  // 8. Cán Bộ Nhân Viên (Chỉ tra cứu quy trình SOP vị trí, báo cáo NC, khai báo sức khỏe ca)
  staff: {
    dashboard: "none",      // BẢO MẬT: Chặn hoàn toàn dashboard của Ban Giám Đốc/Admin
    organization: "none",   // Chặn
    documents: "view",      // Tra cứu SOP/WI được phân bổ
    audits: "view",         // Khai báo sức khỏe đầu ca của chính mình
    haccp: "none",          // Chặn
    prp: "none",            // Chặn
    capa: "edit",           // Báo cáo sự không phù hợp NC khi phát hiện sự cố
    equipment: "none",      // Chặn
    inventory: "none",      // Chặn
    traceability: "none",   // Chặn
    purchasing: "none",     // Chặn
    builder: "none",        // Chặn
  },
};

export function getDefaultRouteForRole(role: string | undefined): string {
  if (!role) return "/";
  const r = role.toLowerCase();
  switch (r) {
    case "admin":
    case "management":
    case "executive":
    case "qa_qc_manager":
    case "iso_manager":
      return "/dashboard";
    case "production":
      return "/haccp";
    case "maintenance":
    case "equipment":
      return "/equipment";
    case "sales_logistics":
    case "sales":
    case "warehouse":
      return "/inventory";
    case "hr_accounting":
    case "admin_acct":
      return "/audits";
    case "staff":
      return "/documents";
    default:
      return "/documents";
  }
}

export function accessFor(role: string | undefined, module: ModuleKey): Access {
  if (!role) return "none";
  const normalized = role.toLowerCase();
  return PERMISSIONS[normalized]?.[module] ?? "none";
}

export function canView(role: string | undefined, module: ModuleKey) {
  return accessFor(role, module) !== "none";
}

export function canEdit(role: string | undefined, module: ModuleKey) {
  return accessFor(role, module) === "edit";
}