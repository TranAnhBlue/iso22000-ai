import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  Sparkles,
  Leaf,
  Lock,
  User,
  Mail,
  Building,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  QrCode,
  Flame,
  FileText,
  KeyRound,
  ArrowRight,
  Boxes,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSession, setSession, getDefaultRouteForRole } from "@/lib/auth";
import { useDepartments } from "@/lib/departments";
import api from "@/lib/api";
import logoImg from "@/assets/logo.png";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WCERT FSMS – Hệ Thống Quản Lý ATTP Theo Chuẩn ISO 22000:2018" },
      { name: "description", content: "Nền tảng số hoá quản lý An toàn thực phẩm theo ISO 22000:2018 với trợ lý AI." },
    ],
  }),
  component: LoginPage,
});

interface DepartmentOption {
  role_code: string;
  role_name: string;
  description: string;
}

const DEMO_ACCOUNTS = [
  { label: "Admin", user: "admin", pass: "admin123", role: "Quản trị hệ thống", tone: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" },
  { label: "Ban QLCL", user: "qa", pass: "qa123", role: "Ban QLCL & ATTP", tone: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
  { label: "Sản Xuất", user: "production", pass: "prod123", role: "Phòng Sản xuất", tone: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
  { label: "Thiết Bị", user: "maintenance", pass: "maint123", role: "Phòng Thiết bị", tone: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
];

function LoginPage() {
  const { departments } = useDepartments();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // 1. Chặn quay lại trang login nếu đã có phiên và chuyển về đúng trang theo vai trò
  useEffect(() => {
    const session = getSession();
    if (session) {
      const target = getDefaultRouteForRole(session.role);
      navigate({ to: target as any, replace: true });
    }
  }, [navigate]);

  // Form states
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleFillDemo = (user: string, pass: string) => {
    setIsLogin(true);
    setUsername(user);
    setPassword(pass);
    setErrorMsg("");
    toast.info(`Đã điền tài khoản mẫu [${user}]`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.post("/auth/login", { username: username.trim(), password });
        const data = res.data;
        setSession(
          {
            role: data.role,
            name: data.full_name,
            loggedAt: new Date().toISOString(),
            userId: data.user_id,
            username: data.username,
            department: data.department,
            phone: data.phone || undefined,
          },
          data.access_token
        );
        toast.success(`Đăng nhập thành công! Chào mừng ${data.full_name}`);
        const target = getDefaultRouteForRole(data.role);
        navigate({ to: target as any, replace: true });
      } else {
        const res = await api.post("/auth/register", {
          username: username.trim(),
          password,
          full_name: fullName.trim(),
          department: department || (departments[0] ?? "Ban QLCL & ATTP"),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        });
        const data = res.data;
        setSession(
          {
            role: data.role,
            name: data.full_name,
            loggedAt: new Date().toISOString(),
            userId: data.user_id,
            username: data.username,
            department: data.department,
            phone: data.phone || phone.trim() || undefined,
          },
          data.access_token
        );
        toast.success(`Tạo tài khoản thành công! Chào mừng ${data.full_name}`);
        const target = getDefaultRouteForRole(data.role);
        navigate({ to: target as any, replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Đã xảy ra lỗi, vui lòng kiểm tra lại thông tin đăng nhập.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-50/80 via-slate-50 to-teal-50/50 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* TOP BRAND HEADER */}
      <div className="w-full border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img src={logoImg} alt="WCERT Logo" className="h-10 w-auto object-contain" />
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-emerald-800 leading-tight">
                WCERT FSMS
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                Hệ Thống Quản Trị An Toàn Thực Phẩm ISO 22000:2018
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> ISO 22000:2018
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/80 text-blue-800 border border-blue-200">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Tiêu Chuẩn HACCP
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 text-amber-800 border border-amber-200">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" /> Trí Tuệ Nhân Tạo AI
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* LEFT COLUMN: HERO INTRO & VALUE PROPOSITIONS (7 COLS) */}
          <div className="lg:col-span-7 space-y-6 lg:pr-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3.5 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-xs">
              <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
              NỀN TẢNG SỐ HÓA ATTP & TRÍ TUỆ NHÂN TẠO CHUYÊN SÂU
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Hệ Thống Quản Lý{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                  An Toàn Thực Phẩm
                </span>{" "}
                Chuẩn ISO 22000:2018
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl pt-1">
                Số hóa toàn diện 12 phân hệ nghiệp vụ Quản lý chất lượng & ATTP. Tích hợp Trợ lý AI
                soạn thảo quy trình SOP, phân tích mối nguy HACCP, tự động tìm nguyên nhân gốc rễ 5-Why / Ishikawa và truy xuất nguồn gốc tức thì.
              </p>
            </div>

            {/* 3 CORE HIGHLIGHT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-2">
                <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                  <Flame className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold text-slate-900">Giám Sát CCP Trực Tiếp</div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  Thiết lập giới hạn tới hạn, cảnh báo vượt ngưỡng thời gian thực.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-2">
                <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                  <QrCode className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold text-slate-900">Truy Xuất 1-Chạm</div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  Liên kết chuỗi cung ứng từ Nhà cung cấp → Sản xuất → Kho FEFO.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold text-slate-900">Cố Vấn AI Chuyên Sâu</div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  Dự báo sẵn sàng đánh giá, gợi ý mục tiêu chất lượng SMART.
                </div>
              </div>
            </div>

            {/* TRUST STATS BAR */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white shadow-xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400">100%</div>
                <div className="text-[10px] sm:text-xs text-slate-300 font-medium">Chuẩn ISO 22000</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-teal-300">12</div>
                <div className="text-[10px] sm:text-xs text-slate-300 font-medium">Phân Hệ Nghiệp Vụ</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-amber-400">&lt; 1 Giây</div>
                <div className="text-[10px] sm:text-xs text-slate-300 font-medium">Truy Xuất Lô Hàng</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-rose-400">24/7</div>
                <div className="text-[10px] sm:text-xs text-slate-300 font-medium">Cảnh Báo Khẩn Cấp</div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LOGIN / REGISTER CARD (5 COLS) */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-xl shadow-2xl p-6 sm:p-8 lg:p-10 space-y-6">
              {/* Card Header & Toggle */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                      {isLogin ? "Đăng nhập hệ thống" : "Đăng ký tài khoản mới"}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {isLogin
                        ? "Vui lòng nhập thông tin xác thực để truy cập phân hệ làm việc."
                        : "Điền thông tin và chọn phòng ban để yêu cầu kích hoạt quyền."}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
                    <KeyRound className="w-6 h-6" />
                  </div>
                </div>

                {/* Tabs Switcher */}
                <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setErrorMsg("");
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      isLogin
                        ? "bg-white text-emerald-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Đăng Nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setErrorMsg("");
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      !isLogin
                        ? "bg-white text-emerald-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Đăng Ký Mới
                  </button>
                </div>
              </div>

              {/* Error Message Box */}
              {errorMsg && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-medium text-rose-700 flex items-start gap-2.5 animate-in fade-in">
                  <span className="font-bold">⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* FORM */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-xs font-semibold text-slate-700">
                        Họ và tên <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="fullName"
                          required
                          placeholder="Ví dụ: Nguyễn Văn An"
                          className="pl-10 h-11 text-xs sm:text-sm rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="department" className="text-xs font-semibold text-slate-700">
                          Phòng ban trực thuộc <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative">
                          <Building className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                          <select
                            id="department"
                            className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-1 pl-10 text-xs sm:text-sm font-medium shadow-xs transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            value={department || departments[0]}
                            onChange={(e) => setDepartment(e.target.value)}
                          >
                            {departments.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
                          Số điện thoại liên hệ
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                          <Input
                            id="phone"
                            placeholder="0987 654 321"
                            className="pl-10 h-11 text-xs sm:text-sm rounded-xl border-slate-300 focus:border-emerald-500"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                        Địa chỉ Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="ten.nguyen@company.vn"
                          className="pl-10 h-11 text-xs sm:text-sm rounded-xl border-slate-300 focus:border-emerald-500"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-semibold text-slate-700">
                    Tên đăng nhập <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="username"
                      required
                      placeholder="Nhập username (ví dụ: admin, qa)"
                      className="pl-10 h-11 text-xs sm:text-sm rounded-xl border-slate-300 focus:border-emerald-500"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Mật khẩu bảo mật <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Nhập mật khẩu"
                      className="pl-10 pr-10 h-11 text-xs sm:text-sm rounded-xl border-slate-300 focus:border-emerald-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 sm:h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/25 transition-all mt-2"
                >
                  {loading ? (
                    "Đang xử lý dữ liệu..."
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {isLogin ? "Đăng Nhập Vào Hệ Thống" : "Hoàn Tất Đăng Ký Tài Khoản"}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>

              {/* QUICK DEMO CREDENTIALS BAR */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
                  ⚡ Chọn Tài Khoản Trải Nghiệm Mẫu:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.user}
                      type="button"
                      onClick={() => handleFillDemo(acc.user, acc.pass)}
                      className={`px-2.5 py-1.5 rounded-lg border text-left text-xs font-medium transition-all ${acc.tone}`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>{acc.label}</span>
                        <span className="text-[10px] font-mono opacity-70">@{acc.user}</span>
                      </div>
                      <div className="text-[10px] opacity-80 truncate">{acc.role}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-200/60 bg-white/60 backdrop-blur-xs py-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} WCERT — Food Safety Management System. Bảo lưu mọi quyền.</span>
          <span className="text-[11px] text-slate-400 font-mono">Phiên bản: v2.4.0 (ISO 22000:2018 Standard)</span>
        </div>
      </footer>
    </div>
  );
}