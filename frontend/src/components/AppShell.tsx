import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { canView, clearSession, getSession, roleLabel, setSession, type ModuleKey, type Session } from "@/lib/auth";
import { ModuleAccessProvider } from "@/lib/rbac";
import logoImg from "@/assets/logo.png";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { AIChatWidget } from "@/components/AIChatWidget";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" as ModuleKey },
  { to: "/organization", label: "Tổ chức & Người dùng", icon: Users, module: "organization" as ModuleKey },
  { to: "/documents", label: "Tài liệu & Hồ sơ", icon: FileText, module: "documents" as ModuleKey },
  { to: "/audits", label: "Đánh giá nội bộ & Đào tạo", icon: GraduationCap, module: "audits" as ModuleKey },
  { to: "/haccp", label: "HACCP & Mối nguy", icon: ShieldAlert, module: "haccp" as ModuleKey },
  { to: "/prp", label: "PRP / GMP / SSOP", icon: ClipboardCheck, module: "prp" as ModuleKey },
  { to: "/capa", label: "CAPA & Không phù hợp", icon: AlertTriangle, module: "capa" as ModuleKey },
  { to: "/equipment", label: "Thiết bị & Bảo trì", icon: Wrench, module: "equipment" as ModuleKey },
  { to: "/inventory", label: "Kho & Truy xuất", icon: Package, module: "inventory" as ModuleKey },
  { to: "/purchasing", label: "Mua hàng & NCC", icon: ShoppingCart, module: "purchasing" as ModuleKey },
] as const;

export function AppShell({ children, module }: { children: ReactNode; module?: ModuleKey }) {
  const [session, setS] = useState<Session | null>(null);
  const [checking, setChecking] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const s = getSession();
    if (!s) {
      navigate({ to: "/" });
      return;
    }
    setS(s);
  }, [navigate]);

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
    navigate({ to: "/" });
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
      };
      setSession(updatedSession, data.access_token);
      setS(updatedSession);
      window.location.reload();
    } catch (err) {
      console.error("Lỗi khi kiểm tra phân quyền:", err);
    } finally {
      setChecking(false);
    }
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
            <span className="text-sm font-bold tracking-tight text-primary leading-tight">WCERT FSMS</span>
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
                  <span className="text-sm font-bold tracking-tight text-primary leading-tight">WCERT FSMS</span>
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
            <div className="border-b bg-muted/40 p-3">
              <div className="text-xs font-semibold text-primary">{roleLabel(session.role)}</div>
              <div className="text-sm font-medium text-foreground truncate">{session.name}</div>
              {session.department && (
                <div className="text-[11px] text-muted-foreground truncate">{session.department}</div>
              )}
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
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-4 sm:px-6 backdrop-blur">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-foreground hover:bg-muted lg:hidden"
              aria-label="Mở menu điều hướng"
            >
              <Menu className="h-5 w-5" />
            </button>
            <img src={logoImg} alt="WCERT" className="h-8 w-auto object-contain lg:hidden" />
            <h1 className="text-xs sm:text-sm font-semibold md:text-base truncate">
              FSMS – ISO 22000:2018
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="relative rounded-lg p-2 hover:bg-muted" aria-label="Thông báo">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            </button>
            <div className="hidden sm:block text-right">
              <div className="text-xs sm:text-sm font-medium">{roleLabel(session.role)}</div>
              <div className="text-[11px] sm:text-xs text-muted-foreground truncate max-w-[150px]">{session.name}</div>
            </div>
            <button
              onClick={logout}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
            >
              <LogOut className="h-3.5 w-3.5" /> Đăng xuất
            </button>
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