import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { canView, clearSession, getSession, roleLabel, setSession, type ModuleKey, type Session } from "@/lib/auth";
import { ModuleAccessProvider } from "@/lib/rbac";
import logoImg from "@/assets/logo.png";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FileText,
  ShieldAlert,
  ClipboardCheck,
  Users,
  GraduationCap,
  Wrench,
  Package,
  ShoppingCart,
  AlertTriangle,
  LogOut,
  Lock,
  Sparkles,
  Bell,
  RefreshCw,
  Menu,
  X,
  QrCode,
  Layers,
  CheckCircle2,
  ChevronRight,
  Flame,
  Clock,
  UserCheck,
  Building2,
  Phone,
} from "lucide-react";
import { AIChatWidget } from "@/components/ai/AIChatWidget";

interface RoleQuickLink {
  to: string;
  label: string;
  sublabel: string;
  icon: any;
  tone: string;
}

function getRoleQuickLinks(role: string): RoleQuickLink[] {
  const r = (role || "").toLowerCase();
  // 1. Ban Giám Đốc (Management / Executive)
  if (["management", "executive"].includes(r)) {
    return [
      { to: "/dashboard", label: "Trung tâm điều hành & Xem xét lãnh đạo", sublabel: "Báo cáo KPI & Đánh giá toàn diện FSMS (Điều 9.3)", icon: LayoutDashboard, tone: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/60" },
      { to: "/documents", label: "Phê duyệt tài liệu & SOPs cấp cao", sublabel: "Sổ tay ATTP, Chính sách chất lượng (Điều 7.5)", icon: FileText, tone: "text-blue-600 bg-blue-50 hover:bg-blue-100/80 border-blue-200/60" },
      { to: "/audits", label: "Kế hoạch ĐGNB & Báo cáo kết luận", sublabel: "Giám sát hiệu lực toàn diện hệ thống (Điều 9.2)", icon: GraduationCap, tone: "text-purple-600 bg-purple-50 hover:bg-purple-100/80 border-purple-200/60" },
      { to: "/traceability", label: "Kích hoạt lệnh thu hồi sản phẩm", sublabel: "Quản lý tình huống khẩn cấp & Thu hồi (Điều 8.9.5)", icon: QrCode, tone: "text-rose-600 bg-rose-50 hover:bg-rose-100/80 border-rose-200/60" },
    ];
  }
  // 2. Quản Trị Hệ Thống (Admin)
  if (["admin"].includes(r)) {
    return [
      { to: "/organization", label: "Cơ cấu tổ chức & Quản lý người dùng", sublabel: "Phân quyền RBAC, phòng ban & tài khoản (Điều 5.3)", icon: Building2, tone: "text-purple-600 bg-purple-50 hover:bg-purple-100/80 border-purple-200/60" },
      { to: "/builder", label: "Trình thiết kế biểu mẫu & Lưu đồ", sublabel: "Tùy biến Form điện tử & Workflow hệ thống", icon: Layers, tone: "text-amber-600 bg-amber-50 hover:bg-amber-100/80 border-amber-200/60" },
      { to: "/dashboard", label: "Tổng quan dữ liệu & Giám sát hệ thống", sublabel: "Bảng điều hành quản trị tập trung", icon: LayoutDashboard, tone: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/60" },
      { to: "/documents", label: "Quản trị danh mục tài liệu & SOPs", sublabel: "Phân cấp & lưu trữ hồ sơ tài liệu (Điều 7.5)", icon: FileText, tone: "text-blue-600 bg-blue-50 hover:bg-blue-100/80 border-blue-200/60" },
    ];
  }
  // 3. Ban QLCL & ATTP / Đội Trưởng HACCP (QA/QC)
  if (["qa_qc_manager", "iso_manager"].includes(r)) {
    return [
      { to: "/haccp", label: "Kế hoạch HACCP & Điểm kiểm soát CCP", sublabel: "Phân tích mối nguy & Giám sát tới hạn (Điều 8.5)", icon: ShieldAlert, tone: "text-rose-600 bg-rose-50 hover:bg-rose-100/80 border-rose-200/60" },
      { to: "/capa", label: "Xử lý sự cố & Phê duyệt CAPA", sublabel: "Khắc phục & Ngăn ngừa nguyên nhân gốc (Điều 10.2)", icon: AlertTriangle, tone: "text-amber-600 bg-amber-50 hover:bg-amber-100/80 border-amber-200/60" },
      { to: "/audits", label: "Đánh giá nội bộ & Khóa đào tạo ATTP", sublabel: "Kế hoạch ĐGNB & Năng lực nhân sự (Điều 9.2)", icon: GraduationCap, tone: "text-blue-600 bg-blue-50 hover:bg-blue-100/80 border-blue-200/60" },
      { to: "/purchasing", label: "Đánh giá nhà cung cấp ASL & IQC", sublabel: "Kiểm định nguyên vật liệu tiếp nhận (Điều 7.1.6)", icon: ShoppingCart, tone: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/60" },
    ];
  }
  // 4. Phòng Sản Xuất
  if (["production"].includes(r)) {
    return [
      { to: "/haccp", label: "Ghi nhận đo đạc điểm CCP theo ca", sublabel: "Nhập thông số giám sát nhiệt độ, thời gian (Điều 8.5)", icon: Flame, tone: "text-rose-600 bg-rose-50 hover:bg-rose-100/80 border-rose-200/60" },
      { to: "/prp", label: "Checklist vệ sinh nhà xưởng PRP/GMP", sublabel: "Vệ sinh thiết bị, cá nhân & nhà xưởng (Điều 8.2)", icon: ClipboardCheck, tone: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/60" },
      { to: "/inventory", label: "Quản lý mẻ sản xuất & Biệt trữ", sublabel: "Theo dõi tiến độ sản xuất & khóa lô khi có sự cố", icon: Package, tone: "text-blue-600 bg-blue-50 hover:bg-blue-100/80 border-blue-200/60" },
      { to: "/capa", label: "Báo cáo sự không phù hợp NC", sublabel: "Khai báo sự cố phát sinh tại dây chuyền (Điều 10.2)", icon: AlertTriangle, tone: "text-amber-600 bg-amber-50 hover:bg-amber-100/80 border-amber-200/60" },
    ];
  }
  // 5. Phòng Cơ Điện & Thiết Bị
  if (["maintenance", "equipment"].includes(r)) {
    return [
      { to: "/equipment", label: "Danh mục máy móc & Lịch bảo trì", sublabel: "Kế hoạch bảo dưỡng định kỳ 30 ngày (Điều 7.1.3)", icon: Wrench, tone: "text-amber-600 bg-amber-50 hover:bg-amber-100/80 border-amber-200/60" },
      { to: "/equipment", label: "Lịch hiệu chuẩn thiết bị đo lường", sublabel: "Kiểm định nhiệt kế, cân, cảm biến CCP (Điều 7.1.5)", icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/60" },
      { to: "/documents", label: "Quy trình vận hành chuẩn máy móc (SOP)", sublabel: "Hướng dẫn bảo dưỡng & an toàn cơ điện", icon: FileText, tone: "text-blue-600 bg-blue-50 hover:bg-blue-100/80 border-blue-200/60" },
    ];
  }
  // 6. Phòng Kinh Doanh & Kho
  if (["sales_logistics", "sales", "warehouse"].includes(r)) {
    return [
      { to: "/inventory", label: "Xuất - Nhập kho & Tồn kho FEFO", sublabel: "Kiểm soát hạn dùng & nhiệt độ kho lạnh (Điều 8.2.4)", icon: Package, tone: "text-blue-600 bg-blue-50 hover:bg-blue-100/80 border-blue-200/60" },
      { to: "/inventory", label: "Quản lý mẫu lưu đối chứng 24h/48h", sublabel: "Lưu giữ mẫu phục vụ kiểm nghiệm & truy xuất", icon: CheckCircle2, tone: "text-purple-600 bg-purple-50 hover:bg-purple-100/80 border-purple-200/60" },
      { to: "/traceability", label: "Truy xuất nguồn gốc 1 chạm", sublabel: "Tra cứu chuỗi cung ứng & mô phỏng thu hồi (Điều 8.3)", icon: QrCode, tone: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/60" },
      { to: "/purchasing", label: "Tiếp nhận nguyên vật liệu IQC", sublabel: "Kiểm tra COA & biên bản giao nhận", icon: ShoppingCart, tone: "text-amber-600 bg-amber-50 hover:bg-amber-100/80 border-amber-200/60" },
    ];
  }
  // 7. Phòng Hành Chính - Kế Toán
  if (["hr_accounting", "admin_acct"].includes(r)) {
    return [
      { to: "/audits", label: "Hồ sơ đào tạo & Sát hạch ATTP", sublabel: "Chứng chỉ nhân sự & đánh giá năng lực (Điều 7.2)", icon: GraduationCap, tone: "text-blue-600 bg-blue-50 hover:bg-blue-100/80 border-blue-200/60" },
      { to: "/audits", label: "Khai báo sức khỏe nhân sự đầu ca", sublabel: "Kiểm soát dịch bệnh & đình chỉ ca nhiễm khuẩn (Điều 8.2)", icon: UserCheck, tone: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/60" },
      { to: "/organization", label: "Cơ cấu tổ chức & Nhân sự", sublabel: "Sơ đồ phòng ban & danh sách người dùng (Điều 5.3)", icon: Building2, tone: "text-purple-600 bg-purple-50 hover:bg-purple-100/80 border-purple-200/60" },
    ];
  }
  // 8. Cán Bộ Nhân Viên (Staff) / Người dùng mới (User)
  return [
    { to: "/documents", label: "Tra cứu tài liệu & SOPs ban hành", sublabel: "Xem chính sách, quy trình áp dụng tại vị trí (Điều 7.5)", icon: FileText, tone: "text-blue-600 bg-blue-50 hover:bg-blue-100/80 border-blue-200/60" },
    { to: "/capa", label: "Báo cáo sự không phù hợp NC", sublabel: "Đề xuất cải tiến & phản ánh sự cố ATTP (Điều 10.2)", icon: AlertTriangle, tone: "text-amber-600 bg-amber-50 hover:bg-amber-100/80 border-amber-200/60" },
    { to: "/audits", label: "Khai báo sức khỏe ca làm việc", sublabel: "Khai báo thân nhiệt & tình trạng sức khỏe cá nhân (Điều 8.2)", icon: UserCheck, tone: "text-emerald-600 bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/60" },
  ];
}

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" as ModuleKey },
  { to: "/organization", label: "Tổ chức & Người dùng", icon: Users, module: "organization" as ModuleKey },
  { to: "/documents", label: "Tài liệu & Hồ sơ", icon: FileText, module: "documents" as ModuleKey },
  { to: "/audits", label: "Đánh giá nội bộ & Đào tạo", icon: GraduationCap, module: "audits" as ModuleKey },
  { to: "/haccp", label: "HACCP & Mối nguy", icon: ShieldAlert, module: "haccp" as ModuleKey },
  { to: "/prp", label: "PRP / GMP / SSOP", icon: ClipboardCheck, module: "prp" as ModuleKey },
  { to: "/capa", label: "CAPA & Không phù hợp", icon: AlertTriangle, module: "capa" as ModuleKey },
  { to: "/equipment", label: "Thiết bị & Bảo trì", icon: Wrench, module: "equipment" as ModuleKey },
  { to: "/inventory", label: "Kho & Tồn kho FEFO", icon: Package, module: "inventory" as ModuleKey },
  { to: "/traceability", label: "Truy xuất 1 Chạm", icon: QrCode, module: "traceability" as ModuleKey },
  { to: "/purchasing", label: "Nhà cung cấp & IQC", icon: ShoppingCart, module: "purchasing" as ModuleKey },
  { to: "/builder", label: "Biểu mẫu & Lưu đồ", icon: Layers, module: "builder" as ModuleKey },
] as const;

interface ExecutiveAlert {
  alert_id: string;
  category: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  description: string;
  action_url: string;
  timestamp: string;
}

export function AppShell({ children, module }: { children: ReactNode; module?: ModuleKey }) {
  const [session, setS] = useState<Session | null>(null);
  const [checking, setChecking] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alerts, setAlerts] = useState<ExecutiveAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const s = getSession();
    if (!s) {
      navigate({ to: "/" });
      return;
    }
    setS(s);

    // Tự động đồng bộ chính xác dữ liệu từ CSDL (SĐT, phòng ban, vai trò thực tế)
    if (s.userId) {
      api.get(`/auth/me?user_id=${s.userId}`)
        .then((res) => {
          const data = res.data;
          const updatedSession: Session = {
            ...s,
            role: data.role,
            name: data.full_name,
            department: data.department,
            username: data.username,
            phone: data.phone || undefined,
          };
          setSession(updatedSession, data.access_token);
          setS(updatedSession);
        })
        .catch((err) => {
          console.warn("Could not sync session from /auth/me:", err);
        });
    }
  }, [navigate]);

  // Tải danh sách thông báo cảnh báo thời gian thực từ CSDL theo vai trò (Role-specific)
  useEffect(() => {
    if (!session) return;
    const fetchAlerts = async () => {
      try {
        const res = await api.get<ExecutiveAlert[]>(`/dashboard/executive-alerts?role=${encodeURIComponent(session.role)}`);
        if (Array.isArray(res.data)) {
          setAlerts(res.data);
          setUnreadCount(res.data.length);
        }
      } catch {
        // Fallback default alerts nếu backend khởi động lần đầu
        const fallbackAlerts: ExecutiveAlert[] = [
          {
            alert_id: "NC-MOCK-1",
            category: "CAPA",
            severity: "CRITICAL",
            title: "Sự cố NC-2026-003: Dị vật kim loại phát hiện tại Line Đóng gói",
            description: "Cần thẩm tra nguyên nhân gốc rễ 5-Why và hành động khắc phục CAPA.",
            action_url: "/capa",
            timestamp: "Hôm nay",
          },
          {
            alert_id: "CCP-MOCK-2",
            category: "CCP",
            severity: "WARNING",
            title: "Giám sát CCP-02: Nhiệt độ thanh trùng tiệt khuẩn tiệm cận ngưỡng 85°C",
            description: "Cảnh báo ca sản xuất kiểm tra cảm biến nhiệt độ lò hấp.",
            action_url: "/haccp",
            timestamp: "10 phút trước",
          },
          {
            alert_id: "AUDIT-MOCK-3",
            category: "AUDIT",
            severity: "INFO",
            title: "Kế hoạch ĐGNB Định kỳ Q1/2026 sắp diễn ra tại Phân xưởng Chế biến",
            description: "Đoàn đánh giá nội bộ chuẩn bị danh mục kiểm tra Checklist Điều 9.2.",
            action_url: "/audits",
            timestamp: "Hôm qua",
          },
        ];
        setAlerts(fallbackAlerts);
        setUnreadCount(fallbackAlerts.length);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 45000); // Tự động làm mới mỗi 45s
    return () => clearInterval(interval);
  }, [session]);

  // Đóng mobile drawer khi chuyển trang
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Đang tải phiên làm việc...
      </div>
    );
  }

  const logout = () => {
    clearSession();
    toast.success("Đã đăng xuất khỏi hệ thống thành công!");
    navigate({ to: "/" });
  };

  const handleMarkAllRead = () => {
    setUnreadCount(0);
    toast.success("Đã đánh dấu tất cả thông báo là đã đọc.");
  };

  // Hàm kiểm tra lại phân quyền từ backend
  const handleCheckRoleUpdate = async () => {
    if (!session.userId) return;
    setChecking(true);
    try {
      const res = await api.get(`/auth/me?user_id=${session.userId}`);
      const data = res.data;
      const updatedSession: Session = {
        ...session,
        role: data.role,
        name: data.full_name,
        department: data.department,
        username: data.username,
        phone: data.phone || session.phone || "0912.888.999",
      };
      setSession(updatedSession, data.access_token);
      setS(updatedSession);
      toast.success("Đã đồng bộ phân quyền mới nhất từ hệ thống!");
      window.location.reload();
    } catch (err) {
      console.error("Lỗi khi kiểm tra phân quyền:", err);
      toast.error("Không thể kết nối đến máy chủ xác thực.");
    } finally {
      setChecking(false);
    }
  };

  // Lấy ký tự viết tắt đại diện cho avatar
  const getAvatarInitials = (name?: string, role?: string) => {
    if (name && name.trim().length > 0) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return (role || "US").slice(0, 2).toUpperCase();
  };

  // MÀN HÌNH CHẶN KHI TÀI KHOẢN CHƯA ĐƯỢC PHÂN QUYỀN (ROLE = user)
  if (session.role === "user") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 sm:p-6 text-center">
        <div className="max-w-md rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 text-amber-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight">Tài khoản chưa được phân quyền</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Xin chào <b>{session.name}</b>, tài khoản của bạn đã được tạo thành công nhưng chưa được gán vai trò phòng ban cụ thể trong hệ thống.
          </p>
          <div className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            Vui lòng liên hệ <b>Quản trị viên (Admin)</b> để được cấp quyền vào các phân hệ nghiệp vụ.
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={handleCheckRoleUpdate} disabled={checking} className="w-full gap-2">
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Đang kiểm tra..." : "Kiểm tra lại quyền (hoặc F5)"}
            </Button>
            <Button variant="outline" onClick={logout} className="w-full gap-2">
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const allowed = NAV.filter((item) => canView(session.role, item.module));
  const denied = module ? !canView(session.role, module) : false;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* SIDEBAR DESKTOP */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <img src={logoImg} alt="WCERT" className="h-10 w-auto object-contain" />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-primary leading-tight">WCERT</span>
            <span className="text-[10px] text-muted-foreground font-medium">ISO 22000:2018</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {allowed.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="rounded-lg bg-primary/5 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5 shrink-0" /> AI Assistant
            </div>
            <p className="mt-1 text-muted-foreground">
              Trợ lý AI sẵn sàng hỗ trợ nghiệp vụ ISO 22000.
            </p>
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER OVERLAY & SIDEBAR */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Slide-out Panel */}
          <aside className="fixed inset-y-0 left-0 z-50 flex w-4/5 max-w-xs flex-col border-r bg-sidebar shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <div className="flex items-center gap-2.5">
                <img src={logoImg} alt="WCERT" className="h-9 w-auto object-contain" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold tracking-tight text-primary leading-tight">WCERT</span>
                  <span className="text-[10px] text-muted-foreground font-medium">ISO 22000:2018</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                aria-label="Đóng menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User badge on mobile drawer */}
            <div className="border-b bg-muted/40 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                  {getAvatarInitials(session.name, session.role)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-foreground truncate">{session.name}</div>
                  <div className="text-xs font-semibold text-emerald-700 truncate">{roleLabel(session.role)}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{session.department || "Ban QLCL & ATTP"}</div>
                  <div className="text-[11px] text-emerald-700 font-mono font-medium flex items-center gap-1 mt-0.5">
                    <Phone className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                    <span>{session.phone && session.phone.trim() ? session.phone : "Chưa cập nhật"}</span>
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {allowed.map((item) => {
                const active = pathname === item.to;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t p-3 space-y-2">
              <button
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" /> Đăng xuất
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-background/95 px-4 sm:px-6 backdrop-blur">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-foreground hover:bg-muted lg:hidden"
              aria-label="Mở menu điều hướng"
            >
              <Menu className="h-5 w-5" />
            </button>
            <img src={logoImg} alt="WCERT" className="h-8 w-auto object-contain lg:hidden shrink-0" />
            <div className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <h1 className="text-xs sm:text-sm font-bold md:text-base truncate text-slate-800">
                WCERT
              </h1>
              <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[11px] font-semibold">
                <CheckCircle2 className="h-3 w-3" /> ISO 22000:2018
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* NOTIFICATION POPOVER */}
            <Popover open={notifPopoverOpen} onOpenChange={setNotifPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="relative rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  aria-label="Thông báo cảnh báo"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>

              <PopoverContent align="end" sideOffset={8} className="w-80 sm:w-96 p-0 shadow-2xl border-slate-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Thông Báo & Cảnh Báo ({alerts.length})
                    </span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
                    >
                      Đã đọc tất cả
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                      <div className="mx-auto w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-slate-700">Không có cảnh báo mới nào cho vai trò của bạn</p>
                      <p className="text-[11px] text-slate-400">Tất cả các chỉ số CCP, CAPA và hồ sơ ATTP đang vận hành an toàn.</p>
                    </div>
                  ) : (
                    alerts.map((a) => (
                      <Link
                        key={a.alert_id}
                        to={a.action_url || "/dashboard"}
                        onClick={() => setNotifPopoverOpen(false)}
                        className="block p-3.5 hover:bg-slate-50 transition-colors group text-left"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 shrink-0">
                            {a.severity === "CRITICAL" ? (
                              <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
                                <Flame className="w-3.5 h-3.5" />
                              </div>
                            ) : a.severity === "WARNING" ? (
                              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                                <ClipboardCheck className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  a.severity === "CRITICAL"
                                    ? "bg-rose-100 text-rose-700"
                                    : a.severity === "WARNING"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {a.category}
                              </span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> {a.timestamp}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 line-clamp-1">
                              {a.title}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                              {a.description}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>

                <div className="border-t border-slate-100 bg-slate-50/50 p-2.5 text-center">
                  <Link
                    to="/dashboard"
                    onClick={() => setNotifPopoverOpen(false)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                  >
                    Xem Trung Tâm Điều Hành Chi Tiết <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </PopoverContent>
            </Popover>

            {/* USER PROFILE POPOVER */}
            <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-slate-100 transition-all text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  aria-label="Tài khoản người dùng"
                >
                  <div className="relative">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold flex items-center justify-center text-xs shadow-sm ring-2 ring-emerald-500/20">
                      {getAvatarInitials(session.name, session.role)}
                    </div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>

                  <div className="hidden sm:flex flex-col min-w-0 max-w-[170px] text-left">
                    <div className="text-xs font-bold text-slate-800 truncate leading-tight">
                      {session.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded truncate">
                        {roleLabel(session.role)}
                      </span>
                    </div>
                  </div>
                </button>
              </PopoverTrigger>

              <PopoverContent align="end" sideOffset={8} className="w-80 sm:w-96 p-0 shadow-2xl border-slate-200 rounded-2xl overflow-hidden">
                {/* User Info Header with Phone */}
                <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-sm ring-2 ring-white/30 shadow-md shrink-0">
                      {getAvatarInitials(session.name, session.role)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white truncate">{session.name}</div>
                      <div className="text-xs text-slate-300 font-mono truncate">
                        @{session.username || session.userId || "admin"}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-700/80 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Vai trò:</span>
                      <span className="font-semibold text-emerald-400">{roleLabel(session.role)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Phòng ban:</span>
                      <span className="font-semibold text-slate-200 truncate max-w-[190px]">
                        {session.department || "Ban QLCL & ATTP"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-slate-400">Số điện thoại:</span>
                      <span className="font-semibold text-emerald-300 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                        {session.phone && session.phone.trim() ? session.phone : "Chưa cập nhật"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Role-Specific Quick Action Tabs / Links */}
                <div className="px-3 pt-3 pb-1 border-b border-slate-100 bg-slate-50/70">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span>Lối tắt chuyên môn</span>
                    <span className="text-emerald-700 font-semibold truncate max-w-[150px]">{roleLabel(session.role)}</span>
                  </div>
                </div>

                <div className="p-2 space-y-1 text-xs max-h-56 overflow-y-auto">
                  {getRoleQuickLinks(session.role).map((link, idx) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={idx}
                        to={link.to}
                        onClick={() => setUserPopoverOpen(false)}
                        className="w-full flex items-start gap-2.5 p-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition text-left group border border-transparent hover:border-slate-200"
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 border ${link.tone}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 group-hover:text-emerald-700 text-xs truncate">
                            {link.label}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {link.sublabel}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* System Actions List */}
                <div className="p-2 border-t border-slate-100 bg-slate-50/40 space-y-1 text-xs">
                  <button
                    onClick={() => {
                      setUserPopoverOpen(false);
                      handleCheckRoleUpdate();
                    }}
                    disabled={checking}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium transition"
                  >
                    <RefreshCw className={`w-4 h-4 text-emerald-600 ${checking ? "animate-spin" : ""}`} />
                    {checking ? "Đang đồng bộ..." : "Kiểm tra / Đồng bộ quyền từ CSDL (F5)"}
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={() => {
                      setUserPopoverOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất khỏi hệ thống
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-6 max-w-full overflow-x-hidden">
          {denied ? (
            <div className="mx-auto mt-10 max-w-md rounded-2xl border bg-card p-6 sm:p-8 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Không có quyền truy cập</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Vai trò <b>{roleLabel(session.role)}</b> không được phép truy cập module này. Vui lòng liên hệ Quản trị hệ thống.
              </p>
            </div>
          ) : (
            <ModuleAccessProvider role={session.role} module={module ?? null}>
              {children}
            </ModuleAccessProvider>
          )}
        </main>
      </div>

      <AIChatWidget />
    </div>
  );
}
