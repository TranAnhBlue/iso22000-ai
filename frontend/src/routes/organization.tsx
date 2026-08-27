import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { CrudTable, Pill, type CrudField } from "@/components/CrudTable";
import { Users, Shield, RefreshCw, ChevronLeft, ChevronRight, Building2, UserCheck } from "lucide-react";
import api from "@/lib/api";

export const Route = createFileRoute("/organization")({
  head: () => ({
    meta: [
      { title: "Tổ chức & Người dùng – WCERT FSMS" },
      { name: "description", content: "Quản lý phòng ban, nhân sự và phân quyền RBAC trong hệ thống ATTP ISO 22000." },
    ],
  }),
  component: () => (
    <AppShell module="organization">
      <Org />
    </AppShell>
  ),
});

const STANDARD_ROLES = [
  "Quản trị hệ thống",
  "Ban Giám đốc",
  "Ban QLCL & ATTP",
  "Phòng Sản xuất",
  "Phòng Hành chính - Kế toán",
  "Phòng Kinh doanh & Kho",
  "Phòng Thiết bị",
  "Cán bộ nhân viên",
  "Người dùng chưa phân quyền",
];

function Org() {
  const [activeTab, setActiveTab] = useState<"users" | "depts">("users");
  const [depts, setDepts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, userRes] = await Promise.all([
        api.get("/organization/departments"),
        api.get("/organization/users"),
      ]);
      setDepts(deptRes.data);
      setUsers(userRes.data);
    } catch (err) {
      console.error("Lỗi tải dữ liệu tổ chức:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalUsers = users.length;
  const deptNames = useMemo(() => {
    const list = depts.map((d) => d.name);
    return list.length > 0 ? list : STANDARD_ROLES.slice(0, 7);
  }, [depts]);

  // Cấu hình Fields cho Phòng ban (Bỏ Trưởng đơn vị, Số CBCNV lấy tự động từ DB)
  const deptFields: CrudField[] = [
    { key: "name", label: "Tên phòng ban", required: true },
    {
      key: "count",
      label: "Số CBCNV trực thuộc",
      render: (v: number) => (
        <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 font-semibold text-foreground">
          {v || 0} thành viên
        </span>
      ),
    },
  ];

  // Cấu hình Fields cho Người dùng
  const userFields: CrudField[] = [
    { key: "name", label: "Họ và tên", required: true },
    { key: "username", label: "Tên đăng nhập", required: true },
    { key: "dept", label: "Phòng ban", type: "select", options: deptNames },
    { key: "role", label: "Vai trò (Role)", type: "select", options: STANDARD_ROLES },
    { key: "email", label: "Email" },
    { key: "phone", label: "Số điện thoại" },
    {
      key: "status",
      label: "Trạng thái",
      type: "select",
      options: ["Hoạt động", "Khoá"],
      render: (v: string) => (
        <Pill
          value={v}
          tone={v === "Hoạt động" ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"}
        />
      ),
    },
  ];

  const totalPages = Math.ceil(users.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, currentPage, pageSize]);

  // Handlers Phòng ban
  const handleCreateDept = async (row: Record<string, any>) => {
    try {
      const res = await api.post("/organization/departments", {
        name: row.name,
      });
      setDepts((prev) => [res.data, ...prev]);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Không thể tạo phòng ban");
    }
  };

  const handleUpdateDept = async (id: string, patch: Record<string, any>) => {
    try {
      const res = await api.put(`/organization/departments/${id}`, patch);
      setDepts((prev) => prev.map((d) => (d.id === id ? res.data : d)));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Không thể cập nhật phòng ban");
    }
  };

  const handleDeleteDept = async (id: string) => {
    try {
      await api.delete(`/organization/departments/${id}`);
      setDepts((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Không thể xoá phòng ban");
    }
  };

  // Handlers Người dùng
  const handleCreateUser = async (row: Record<string, any>) => {
    try {
      const res = await api.post("/organization/users", {
        name: row.name,
        username: row.username,
        password: "password123",
        dept: row.dept || deptNames[0],
        role_code: row.role || "user",
        email: row.email,
        phone: row.phone,
        status: row.status || "Hoạt động",
      });
      setUsers((prev) => [res.data, ...prev]);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Không thể tạo người dùng");
    }
  };

  const handleUpdateUser = async (id: string, patch: Record<string, any>) => {
    try {
      const res = await api.put(`/organization/users/${id}`, {
        name: patch.name,
        dept: patch.dept,
        role_code: patch.role,
        email: patch.email,
        phone: patch.phone,
        status: patch.status,
      });
      setUsers((prev) => prev.map((u) => (u.id === id ? res.data : u)));
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Không thể cập nhật người dùng");
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await api.delete(`/organization/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Không thể xoá người dùng");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Quản lý tổ chức & người dùng"
          description="RBAC theo vai trò · 2FA/MFA · Audit log · Mã hoá dữ liệu (TLS, at rest)."
        />
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border bg-card px-3.5 py-2 text-sm font-medium shadow-sm hover:bg-muted"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} />
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi icon={<Users className="h-5 w-5" />} v={String(totalUsers)} l="Nhân sự" />
        <Kpi icon={<Building2 className="h-5 w-5" />} v={String(depts.length)} l="Phòng ban" />
        <Kpi icon={<UserCheck className="h-5 w-5" />} v={String(users.filter((u) => u.status === "Hoạt động").length)} l="Đang hoạt động" />
        <Kpi icon={<Shield className="h-5 w-5" />} v="100%" l="Hành động được audit" />
      </div>

      {/* 2 Tabs chuyển đổi */}
      <div className="border-b overflow-x-auto no-scrollbar">
        <div className="flex space-x-1 sm:space-x-4 min-w-max pb-1">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            Danh sách Người dùng ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("depts")}
            className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === "depts"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            Danh sách Phòng ban ({depts.length})
          </button>
        </div>
      </div>

      {activeTab === "users" ? (
        <div className="space-y-4">
          <CrudTable
            title="Tài khoản người dùng"
            fields={userFields}
            rows={paginatedUsers}
            onCreate={handleCreateUser}
            onUpdate={handleUpdateUser}
            onDelete={handleDeleteUser}
            addLabel="Thêm người dùng"
          />

          {/* Phân trang */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-xl border bg-card p-3 sm:flex-row">
            <div className="text-xs text-muted-foreground">
              Hiển thị <b>{(currentPage - 1) * pageSize + 1}</b> -{" "}
              <b>{Math.min(currentPage * pageSize, users.length)}</b> trên <b>{users.length}</b> tài khoản
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Số dòng/trang:</span>
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>

              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="grid h-8 w-8 place-items-center rounded-md border bg-background hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="grid h-8 w-8 place-items-center rounded-md border bg-background hover:bg-muted disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <CrudTable
            title="Phòng ban & Cơ cấu tổ chức"
            fields={deptFields}
            rows={depts}
            onCreate={handleCreateDept}
            onUpdate={handleUpdateDept}
            onDelete={handleDeleteDept}
            addLabel="Thêm phòng ban"
          />
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, v, l }: { icon: React.ReactNode; v: string; l: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="mt-3 text-2xl font-bold">{v}</div>
      <div className="text-sm text-muted-foreground">{l}</div>
    </div>
  );
}