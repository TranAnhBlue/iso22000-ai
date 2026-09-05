import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleInfo, setSession } from "@/lib/auth";
import api from "@/lib/api";
import { useNavigate } from "@tanstack/react-router";
import { Lock, User, Mail, Phone } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useDepartments } from "@/lib/departments";

interface AuthModalProps {
  role: RoleInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ role, isOpen, onClose }: AuthModalProps) {
  const { departments } = useDepartments();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  if (!role) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.post("/auth/login", {
          username,
          password,
          role_code: role.id,
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

        onClose();
        navigate({ to: "/dashboard" });
      } else {
        const res = await api.post("/auth/register", {
          username,
          password,
          full_name: fullName,
          role_code: role.id,
          department: department || role.department,
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

        onClose();
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Đã xảy ra lỗi, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 text-left">
          <img src={logoImg} alt="WCERT" className="h-10 w-auto object-contain" />
          <div>
            <DialogTitle className="text-xl">
              {isLogin ? "Đăng nhập" : "Đăng ký tài khoản"}
            </DialogTitle>
            <DialogDescription>
              Vai trò: <span className="font-semibold text-primary">{role.name}</span>
            </DialogDescription>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
                  <Label htmlFor="department">Phòng ban</Label>
                  <select
                    id="department"
                    value={department || role.department || departments[0]}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
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
                placeholder="username"
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
            {loading ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Tạo tài khoản"}
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg("");
              }}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? "Đăng ký ngay" : "Đăng nhập ngay"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
