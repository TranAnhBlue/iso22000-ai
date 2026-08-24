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
  | "purchasing";

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
  purchasing: "edit",
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
  purchasing: "view",
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
  purchasing: "none",
};

// MA TRẬN PHÂN QUYỀN ĐỒNG BỘ CẢ CHỮ HOA VÀ CHỮ THƯỜNG
export const PERMISSIONS: Record<string, Record<ModuleKey, Access>> = {
  user: ALL_NONE,
  admin: ALL_EDIT,
  // Ban Giám Đốc
  management: { ...ALL_VIEW, documents: "edit", organization: "view" },
  executive: { ...ALL_VIEW, documents: "edit", organization: "view" },
  // QA/QC ISO
  qa_qc_manager: { ...ALL_EDIT, organization: "view" },
  iso_manager: { ...ALL_EDIT, organization: "view" },
  // Sản xuất
  production: {
    ...ALL_VIEW,
    organization: "none",
    purchasing: "none",
    haccp: "edit",
    prp: "edit",
    capa: "edit",
    inventory: "edit",
  },
  // Hành chính - Kế toán
  hr_accounting: {
    ...ALL_VIEW,
    haccp: "none",
    prp: "none",
    organization: "edit",
    audits: "edit",
    documents: "view",
  },
  admin_acct: {
    ...ALL_VIEW,
    haccp: "none",
    prp: "none",
    organization: "edit",
    audits: "edit",
    documents: "view",
  },
  // Kinh doanh & Kho
  sales_logistics: {
    ...ALL_VIEW,
    organization: "none",
    haccp: "none",
    prp: "none",
    equipment: "none",
    inventory: "edit",
    purchasing: "edit",
  },
  sales: {
    ...ALL_VIEW,
    organization: "none",
    haccp: "none",
    prp: "none",
    equipment: "none",
    inventory: "edit",
    purchasing: "edit",
  },
  // Thiết bị
  maintenance: {
    ...ALL_VIEW,
    organization: "none",
    purchasing: "view",
    haccp: "none",
    equipment: "edit",
  },
  equipment: {
    ...ALL_VIEW,
    organization: "none",
    purchasing: "view",
    haccp: "none",
    equipment: "edit",
  },
  // Cán bộ nhân viên
  staff: {
    dashboard: "view",
    organization: "none",
    documents: "view",
    audits: "view",
    haccp: "none",
    prp: "view",
    capa: "edit",
    equipment: "none",
    inventory: "view",
    purchasing: "none",
  },
};

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