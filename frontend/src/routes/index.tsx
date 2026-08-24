import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { ShieldCheck, Sparkles, Leaf, Lock, User, Mail, Building, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSession, setSession } from "@/lib/auth";
import api from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WCERT – Hệ thống Quản lý ATTP theo ISO 22000:2018" },
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

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const navigate = useNavigate();

  // 1. Chặn quay lại trang login nếu đã có phiên
  useEffect(() => {
    const session = getSession();
    if (session) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [navigate]);

  // 2. Tải danh sách phòng ban động từ DB (Role table)
  useEffect(() => {
    api.get<DepartmentOption[]>("/auth/departments")
      .then((res) => {
        setDepartments(res.data);
        if (res.data.length > 0) {
          setDepartment(res.data[0].role_name);
        }
      })
      .catch((err) => {
        console.error("Không thể tải danh sách phòng ban từ DB:", err);
      });
  }, []);

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.post("/auth/login", { username, password });
        const data = res.data;
        setSession(
          {
            role: data.role,
            name: data.full_name,
            loggedAt: new Date().toISOString(),
            userId: data.user_id,
            username: data.username,
            department: data.department,
          },
          data.access_token
        );
        navigate({ to: "/dashboard", replace: true });
      } else {
        const res = await api.post("/auth/register", {
          username,
          password,
          full_name: fullName,
          department: department || (departments[0]?.role_name ?? "Ban QLCL & ATTP"),
          email: email || undefined,
          phone: phone || undefined,
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
          },
          data.access_token
        );
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Đã xảy ra lỗi, vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-teal-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-primary">WCERT FSMS</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            ISO 22000:2018 · HACCP · GMP · SSOP
          </div>
        </header>

        <section className="mt-10 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> AI-Powered FSMS
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Hệ thống Quản lý <span className="text-primary">An toàn Thực phẩm</span>
              <br /> theo tiêu chuẩn ISO 22000:2018
            </h1>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Số hoá toàn bộ PRP, HACCP, CAPA, tài liệu & đào tạo. Trợ lý AI giúp soạn SOP, phân tích mối nguy,
              gợi ý hành động khắc phục và phát hiện rủi ro lặp lại.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Feature icon={<Leaf className="h-4 w-4" />} text="An toàn thực phẩm" />
              <Feature icon={<ShieldCheck className="h-4 w-4" />} text="Tuân thủ ISO 22000:2018" />
              <Feature icon={<Sparkles className="h-4 w-4" />} text="Trợ lý AI thông minh" />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight">
                {isLogin ? "Đăng nhập hệ thống" : "Đăng ký tài khoản mới"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLogin
                  ? "Nhập tài khoản để đăng nhập vào phân hệ làm việc của bạn."
                  : "Tài khoản mới sẽ được chuyển đến Quản trị viên để kích hoạt phân quyền."}
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Họ và tên</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        required
                        placeholder="Nguyễn Văn A"
                        className="pl-9"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="department">Phòng ban / Đơn vị</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <select
                          id="department"
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                        >
                          {departments.map((dept) => (
                            <option key={dept.role_code} value={dept.role_name}>
                              {dept.role_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Số điện thoại</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          placeholder="0987..."
                          className="pl-9"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@company.vn"
                        className="pl-9"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="username">Tên đăng nhập</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    required
                    placeholder="Tên tài khoản"
                    className="pl-9"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Đăng ký tài khoản"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrorMsg("");
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  {isLogin ? "Đăng ký ngay" : "Đăng nhập ngay"}
                </button>
              </div>
            </form>
          </div>
        </section>

        <footer className="mt-16 border-t pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} WCERT — Food Safety Management System.
        </footer>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-foreground">
      <span className="text-primary">{icon}</span>
      {text}
    </span>
  );
}