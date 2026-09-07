import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { CrudTable, Pill, type CrudField } from "@/components/CrudTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Shield,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  UserCheck,
  Globe,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Search,
  Printer,
  CheckCircle2,
  X,
  Target,
  FileSpreadsheet,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { DEFAULT_DEPARTMENTS } from "@/lib/departments";
import { useModuleAccess } from "@/lib/rbac";
import { printHtml } from "@/lib/print";

export const Route = createFileRoute("/organization")({
  head: () => ({
    meta: [
      { title: "Bối cảnh & Tổ chức (Điều 4 & 6.1) – WCERT FSMS" },
      { name: "description", content: "Quản lý bối cảnh tổ chức, các bên quan tâm, rủi ro FSMS và phân quyền nhân sự theo ISO 22000:2018." },
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
  "Phòng Kinh doanh & Kho",
  "Phòng Thiết bị",
  "Phòng Hành chính - Kế toán",
  "Cán bộ nhân viên",
  "Người dùng chưa phân quyền",
];

interface InterestedPartyItem {
  id: number;
  party_name: string;
  party_type: "INTERNAL" | "EXTERNAL";
  needs_and_expectations: string;
  statutory_requirements?: string;
  monitoring_method?: string;
  review_frequency?: string;
  responsible_role?: string;
  status: string;
}

interface ContextRiskItem {
  id: number;
  code: string;
  issue_category: "INTERNAL" | "EXTERNAL";
  issue_description: string;
  interested_party_id?: number;
  party_name?: string;
  risk_description: string;
  opportunity_description?: string;
  likelihood: number;
  severity: number;
  risk_score: number;
  treatment_strategy: "MITIGATE" | "ACCEPT" | "AVOID" | "TRANSFER";
  action_plan: string;
  responsible_role?: string;
  target_date?: string;
  status: "IDENTIFIED" | "TREATING" | "CONTROLLED" | "CLOSED";
  residual_likelihood?: number;
  residual_severity?: number;
  residual_risk_score?: number;
}

function getContextRiskBadge(score: number) {
  if (score >= 12) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">Rất cao ({score})</span>;
  }
  if (score >= 6) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">Trung bình ({score})</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">Thấp ({score})</span>;
}

function Org() {
  const { canEdit } = useModuleAccess();
  const [activeTab, setActiveTab] = useState<"users" | "depts" | "parties" | "risks">("users");
  const [depts, setDepts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [parties, setParties] = useState<InterestedPartyItem[]>([]);
  const [risks, setRisks] = useState<ContextRiskItem[]>([]);
  const [contextStats, setContextStats] = useState<any>({
    total_parties: 0,
    internal_parties: 0,
    external_parties: 0,
    total_risks: 0,
    high_risks: 0,
    controlled_risks: 0,
  });
  const [loading, setLoading] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [partyTypeFilter, setPartyTypeFilter] = useState<"ALL" | "INTERNAL" | "EXTERNAL">("ALL");
  const [riskCategoryFilter, setRiskCategoryFilter] = useState<"ALL" | "INTERNAL" | "EXTERNAL">("ALL");

  // Modals
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<InterestedPartyItem | null>(null);
  const [partyForm, setPartyForm] = useState<any>({
    party_name: "",
    party_type: "EXTERNAL",
    needs_and_expectations: "",
    statutory_requirements: "",
    monitoring_method: "",
    review_frequency: "6 tháng/lần",
    responsible_role: "Ban QLCL & ATTP",
    status: "ACTIVE",
  });

  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<ContextRiskItem | null>(null);
  const [riskForm, setRiskForm] = useState<any>({
    code: "",
    issue_category: "EXTERNAL",
    issue_description: "",
    interested_party_id: "",
    risk_description: "",
    opportunity_description: "",
    likelihood: 2,
    severity: 3,
    treatment_strategy: "MITIGATE",
    action_plan: "",
    responsible_role: "Ban QLCL & ATTP",
    target_date: "",
    status: "TREATING",
    residual_likelihood: 1,
    residual_severity: 2,
  });

  // Phân trang User
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, userRes, partiesRes, risksRes, statsRes] = await Promise.all([
        api.get("/organization/departments"),
        api.get("/organization/users"),
        api.get("/organization/interested-parties"),
        api.get("/organization/context-risks"),
        api.get("/organization/context-stats"),
      ]);
      setDepts(deptRes.data);
      setUsers(userRes.data);
      setParties(partiesRes.data);
      setRisks(risksRes.data);
      setContextStats(statsRes.data);
    } catch (err) {
      console.error("Lỗi tải dữ liệu tổ chức:", err);
      toast.error("Không thể tải toàn bộ dữ liệu tổ chức & bối cảnh");
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
    return list.length > 0 ? list : DEFAULT_DEPARTMENTS;
  }, [depts]);

  // Cấu hình Fields cho Phòng ban
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
      await api.post("/organization/departments", row);
      toast.success("Đã thêm phòng ban mới");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi tạo phòng ban");
    }
  };

  const handleUpdateDept = async (id: string, patch: Record<string, any>) => {
    try {
      await api.put(`/organization/departments/${id}`, patch);
      toast.success("Đã cập nhật thông tin phòng ban");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi cập nhật");
    }
  };

  const handleDeleteDept = async (id: string) => {
    try {
      await api.delete(`/organization/departments/${id}`);
      toast.success("Đã xoá phòng ban");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi xoá");
    }
  };

  // Handlers Người dùng
  const handleCreateUser = async (row: Record<string, any>) => {
    try {
      await api.post("/organization/users", {
        ...row,
        role_code: row.role,
      });
      toast.success("Đã tạo tài khoản người dùng");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi tạo tài khoản");
    }
  };

  const handleUpdateUser = async (id: string, patch: Record<string, any>) => {
    try {
      await api.put(`/organization/users/${id}`, {
        ...patch,
        role_code: patch.role,
      });
      toast.success("Đã cập nhật người dùng");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi cập nhật");
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await api.delete(`/organization/users/${id}`);
      toast.success("Đã xoá tài khoản");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi xoá tài khoản");
    }
  };

  // HANDLERS CÁC BÊN QUAN TÂM
  const openNewParty = () => {
    setEditingParty(null);
    setPartyForm({
      party_name: "",
      party_type: "EXTERNAL",
      needs_and_expectations: "",
      statutory_requirements: "",
      monitoring_method: "",
      review_frequency: "6 tháng/lần",
      responsible_role: "Ban QLCL & ATTP",
      status: "ACTIVE",
    });
    setPartyModalOpen(true);
  };

  const openEditParty = (p: InterestedPartyItem) => {
    setEditingParty(p);
    setPartyForm({
      party_name: p.party_name,
      party_type: p.party_type,
      needs_and_expectations: p.needs_and_expectations,
      statutory_requirements: p.statutory_requirements || "",
      monitoring_method: p.monitoring_method || "",
      review_frequency: p.review_frequency || "Hàng năm",
      responsible_role: p.responsible_role || "Ban QLCL & ATTP",
      status: p.status,
    });
    setPartyModalOpen(true);
  };

  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingParty) {
        await api.put(`/organization/interested-parties/${editingParty.id}`, partyForm);
        toast.success("Đã cập nhật thông tin bên quan tâm");
      } else {
        await api.post("/organization/interested-parties", partyForm);
        toast.success("Đã thêm bên quan tâm mới");
      }
      setPartyModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu bên quan tâm");
    }
  };

  const handleDeleteParty = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bên quan tâm này?")) return;
    try {
      await api.delete(`/organization/interested-parties/${id}`);
      toast.success("Đã xóa bên quan tâm");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa");
    }
  };

  // HANDLERS RỦI RO BỐI CẢNH
  const openNewRisk = () => {
    setEditingRisk(null);
    setRiskForm({
      code: `CR-${String(risks.length + 1).padStart(2, "0")}`,
      issue_category: "EXTERNAL",
      issue_description: "",
      interested_party_id: parties.length > 0 ? String(parties[0].id) : "",
      risk_description: "",
      opportunity_description: "",
      likelihood: 2,
      severity: 3,
      treatment_strategy: "MITIGATE",
      action_plan: "",
      responsible_role: "Ban QLCL & ATTP",
      target_date: "",
      status: "TREATING",
      residual_likelihood: 1,
      residual_severity: 2,
    });
    setRiskModalOpen(true);
  };

  const openEditRisk = (r: ContextRiskItem) => {
    setEditingRisk(r);
    setRiskForm({
      code: r.code,
      issue_category: r.issue_category,
      issue_description: r.issue_description,
      interested_party_id: r.interested_party_id ? String(r.interested_party_id) : "",
      risk_description: r.risk_description,
      opportunity_description: r.opportunity_description || "",
      likelihood: r.likelihood,
      severity: r.severity,
      treatment_strategy: r.treatment_strategy,
      action_plan: r.action_plan,
      responsible_role: r.responsible_role || "",
      target_date: r.target_date || "",
      status: r.status,
      residual_likelihood: r.residual_likelihood || 1,
      residual_severity: r.residual_severity || 2,
    });
    setRiskModalOpen(true);
  };

  const handleSaveRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...riskForm,
        interested_party_id: riskForm.interested_party_id ? Number(riskForm.interested_party_id) : null,
        likelihood: Number(riskForm.likelihood),
        severity: Number(riskForm.severity),
        residual_likelihood: Number(riskForm.residual_likelihood),
        residual_severity: Number(riskForm.residual_severity),
        target_date: riskForm.target_date || null,
      };

      if (editingRisk) {
        await api.put(`/organization/context-risks/${editingRisk.id}`, payload);
        toast.success("Đã cập nhật rủi ro bối cảnh");
      } else {
        await api.post("/organization/context-risks", payload);
        toast.success("Đã ghi nhận rủi ro bối cảnh mới");
      }
      setRiskModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu rủi ro bối cảnh");
    }
  };

  const handleDeleteRisk = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa rủi ro này?")) return;
    try {
      await api.delete(`/organization/context-risks/${id}`);
      toast.success("Đã xóa rủi ro bối cảnh");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa");
    }
  };

  // IN PHỤ LỤC 1: BẢNG THEO DÕI BỐI CẢNH VÀ CÁC BÊN QUAN TÂM
  const handlePrintParties = () => {
    const html = `
      <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; color: #111; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #333; padding: 6px;">
              <strong style="font-size: 13pt; color: #047857;">WCERT FOOD</strong><br/>
              <span style="font-size: 9pt;">HỆ THỐNG FSMS ISO 22000</span>
            </td>
            <td style="width: 50%; text-align: center; border: 1px solid #333; padding: 6px;">
              <strong style="font-size: 13pt; text-transform: uppercase;">BẢNG THEO DÕI BỐI CẢNH VÀ CÁC BÊN QUAN TÂM</strong><br/>
              <span style="font-size: 10pt; font-weight: bold;">(Căn cứ Điều 4.1 & 4.2 Tiêu chuẩn ISO 22000:2018)</span>
            </td>
            <td style="width: 25%; border: 1px solid #333; padding: 6px; font-size: 9pt;">
              Biểu mẫu: <strong>BM-CTX-01</strong><br/>
              Lần ban hành: <strong>02</strong><br/>
              Ngày áp dụng: <strong>01/01/2026</strong>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 15pt; text-transform: uppercase;">
            PHỤ LỤC 1: DANH MỤC CÁC BÊN QUAN TÂM & NHU CẦU KỲ VỌNG AN TOÀN THỰC PHẨM
          </h2>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 10.5pt;" border="1">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: center;">
              <th style="padding: 6px; width: 5%;">STT</th>
              <th style="padding: 6px; width: 22%;">Bên quan tâm</th>
              <th style="padding: 6px; width: 10%;">Phân loại</th>
              <th style="padding: 6px; width: 25%;">Nhu cầu & Kỳ vọng ATTP</th>
              <th style="padding: 6px; width: 18%;">Yêu cầu luật định liên quan</th>
              <th style="padding: 6px; width: 12%;">Phương pháp & Tần suất</th>
              <th style="padding: 6px; width: 8%;">Phụ trách</th>
            </tr>
          </thead>
          <tbody>
            ${parties
              .map(
                (p, idx) => `
              <tr>
                <td style="text-align: center; padding: 6px;">${idx + 1}</td>
                <td style="padding: 6px;"><strong>${p.party_name}</strong></td>
                <td style="text-align: center; padding: 6px;">${p.party_type === "INTERNAL" ? "Nội bộ" : "Bên ngoài"}</td>
                <td style="padding: 6px;">${p.needs_and_expectations}</td>
                <td style="padding: 6px;">${p.statutory_requirements || "--"}</td>
                <td style="padding: 6px;">${p.monitoring_method || "--"} (${p.review_frequency})</td>
                <td style="text-align: center; padding: 6px;">${p.responsible_role}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-top: 30px; text-align: center;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <strong>NGƯỜI SOẠN THẢO / TRƯỞNG BAN ATTP</strong><br/>
              <span style="font-size: 10pt; font-style: italic;">(Ký & ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <strong>Ban QLCL & ATTP</strong>
            </td>
            <td style="width: 50%; vertical-align: top;">
              <strong>BAN GIÁM ĐỐC PHÊ DUYỆT</strong><br/>
              <span style="font-size: 10pt; font-style: italic;">(Ký, đóng dấu)</span>
              <div style="height: 60px;"></div>
              <strong>Tổng Giám Đốc</strong>
            </td>
          </tr>
        </table>
      </div>
    `;
    printHtml(html);
  };

  // IN PHỤ LỤC 2 & 4: PHIẾU XÁC ĐỊNH VÀ ĐÁNH GIÁ RỦI RO BỐI CẢNH
  const handlePrintRisks = () => {
    const html = `
      <div style="font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.35; color: #111; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #333; padding: 6px;">
              <strong style="font-size: 13pt; color: #047857;">WCERT FOOD</strong><br/>
              <span style="font-size: 9pt;">HỆ THỐNG FSMS ISO 22000</span>
            </td>
            <td style="width: 50%; text-align: center; border: 1px solid #333; padding: 6px;">
              <strong style="font-size: 13pt; text-transform: uppercase;">PHIẾU XÁC ĐỊNH VÀ ĐÁNH GIÁ RỦI RO BỐI CẢNH</strong><br/>
              <span style="font-size: 10pt; font-weight: bold;">(Căn cứ Điều 6.1 & 4.1 Tiêu chuẩn ISO 22000:2018)</span>
            </td>
            <td style="width: 25%; border: 1px solid #333; padding: 6px; font-size: 9pt;">
              Biểu mẫu: <strong>BM-CTX-02</strong><br/>
              Lần ban hành: <strong>02</strong><br/>
              Ngày áp dụng: <strong>01/01/2026</strong>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 15pt; text-transform: uppercase;">
            PHỤ LỤC 2 & 4: MA TRẬN RỦI RO BỐI CẢNH & KẾ HOẠCH HÀNH ĐỘNG KIỂM SOÁT
          </h2>
          <div style="font-size: 10pt; font-style: italic; margin-top: 4px;">
            Ma trận: Khả năng xảy ra (L: 1-5) x Mức độ nghiêm trọng (S: 1-5) = Điểm rủi ro (R: 1-25)
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 9.5pt;" border="1">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: center;">
              <th style="padding: 5px; width: 6%;">Mã số</th>
              <th style="padding: 5px; width: 8%;">Bối cảnh</th>
              <th style="padding: 5px; width: 18%;">Vấn đề bối cảnh & Rủi ro ATTP</th>
              <th style="padding: 5px; width: 14%;">Cơ hội cải tiến</th>
              <th style="padding: 5px; width: 7%;">L x S = R</th>
              <th style="padding: 5px; width: 9%;">Chiến lược</th>
              <th style="padding: 5px; width: 22%;">Kế hoạch hành động kiểm soát</th>
              <th style="padding: 5px; width: 8%;">Rủi ro dư</th>
              <th style="padding: 5px; width: 8%;">Thời hạn</th>
            </tr>
          </thead>
          <tbody>
            ${risks
              .map(
                (r) => `
              <tr>
                <td style="text-align: center; padding: 5px; font-weight: bold;">${r.code}</td>
                <td style="text-align: center; padding: 5px;">${r.issue_category === "INTERNAL" ? "Nội bộ" : "Bên ngoài"}</td>
                <td style="padding: 5px;">
                  <div style="font-weight: bold;">${r.issue_description}</div>
                  <div style="color: #b91c1c; margin-top: 2px;">R: ${r.risk_description}</div>
                </td>
                <td style="padding: 5px; color: #047857;">${r.opportunity_description || "--"}</td>
                <td style="text-align: center; padding: 5px; font-weight: bold;">
                  ${r.likelihood} x ${r.severity} = <span style="color: ${r.risk_score >= 12 ? "#b91c1c" : "#111"};">${r.risk_score}</span>
                </td>
                <td style="text-align: center; padding: 5px;">${r.treatment_strategy}</td>
                <td style="padding: 5px;">${r.action_plan}</td>
                <td style="text-align: center; padding: 5px; font-weight: bold; color: #047857;">
                  ${r.residual_risk_score ? `${r.residual_likelihood}x${r.residual_severity}=${r.residual_risk_score}` : "--"}
                </td>
                <td style="text-align: center; padding: 5px;">${r.target_date || "--"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-top: 25px; text-align: center;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <strong>TRƯỞNG ĐOÀN ĐÁNH GIÁ RỦI RO</strong><br/>
              <span style="font-size: 10pt; font-style: italic;">(Ký & ghi rõ họ tên)</span>
              <div style="height: 55px;"></div>
              <strong>Đội Trưởng HACCP / Ban QLCL</strong>
            </td>
            <td style="width: 50%; vertical-align: top;">
              <strong>TỔNG GIÁM ĐỐC PHÊ DUYỆT</strong><br/>
              <span style="font-size: 10pt; font-style: italic;">(Ký, đóng dấu)</span>
              <div style="height: 55px;"></div>
              <strong>Ban Giám Đốc</strong>
            </td>
          </tr>
        </table>
      </div>
    `;
    printHtml(html);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bối cảnh tổ chức & Quản lý rủi ro (Điều 4 & 6.1)"
        description="Xác định bối cảnh nội bộ/bên ngoài, giám sát nhu cầu các bên quan tâm (4.2) và ma trận rủi ro hệ thống FSMS (6.1)."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            {activeTab === "parties" && (
              <>
                <Button variant="outline" size="sm" onClick={handlePrintParties} className="gap-1.5 text-slate-700">
                  <Printer className="h-4 w-4" /> In Phụ lục 1 (BM-01)
                </Button>
                {canEdit && (
                  <Button size="sm" onClick={openNewParty} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4" /> Thêm bên quan tâm
                  </Button>
                )}
              </>
            )}
            {activeTab === "risks" && (
              <>
                <Button variant="outline" size="sm" onClick={handlePrintRisks} className="gap-1.5 text-slate-700">
                  <Printer className="h-4 w-4" /> In Ma trận rủi ro (BM-02)
                </Button>
                {canEdit && (
                  <Button size="sm" onClick={openNewRisk} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4" /> Ghi nhận rủi ro bối cảnh
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi
          icon={<Users className="h-5 w-5" />}
          v={String(totalUsers)}
          l="Nhân sự hệ thống"
          sub={`${users.filter((u) => u.status === "Hoạt động").length} đang hoạt động`}
        />
        <Kpi
          icon={<Building2 className="h-5 w-5" />}
          v={String(depts.length)}
          l="Phòng ban xưởng"
          sub="Đồng bộ cơ cấu tổ chức"
        />
        <Kpi
          icon={<Globe className="h-5 w-5" />}
          v={String(contextStats.total_parties)}
          l="Các bên quan tâm (4.2)"
          sub={`${contextStats.internal_parties} nội bộ · ${contextStats.external_parties} bên ngoài`}
        />
        <Kpi
          icon={<AlertTriangle className="h-5 w-5" />}
          v={String(contextStats.total_risks)}
          l="Rủi ro bối cảnh FSMS"
          sub={`${contextStats.high_risks} rủi ro cao · ${contextStats.controlled_risks} đã kiểm soát`}
        />
      </div>

      {/* 4 Tabs chuyển đổi */}
      <div className="border-b overflow-x-auto no-scrollbar">
        <div className="flex space-x-1 sm:space-x-4 min-w-max pb-1">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === "users"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            Tài khoản & Phân quyền ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("depts")}
            className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === "depts"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            Phòng ban & Cơ cấu ({depts.length})
          </button>
          <button
            onClick={() => setActiveTab("parties")}
            className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === "parties"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="h-4 w-4 shrink-0" />
            Bên quan tâm - Điều 4.2 ({parties.length})
          </button>
          <button
            onClick={() => setActiveTab("risks")}
            className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === "risks"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Target className="h-4 w-4 shrink-0" />
            Rủi ro bối cảnh - Điều 6.1 ({risks.length})
          </button>
        </div>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <CrudTable
            title="Tài khoản người dùng & Phân quyền RBAC"
            fields={userFields}
            rows={paginatedUsers}
            onCreate={handleCreateUser}
            onUpdate={handleUpdateUser}
            onDelete={handleDeleteUser}
            addLabel="Thêm người dùng"
            canEdit={canEdit}
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
      )}

      {/* TAB 2: DEPARTMENTS */}
      {activeTab === "depts" && (
        <div className="space-y-4">
          <CrudTable
            title="Phòng ban & Cơ cấu tổ chức"
            fields={deptFields}
            rows={depts}
            onCreate={handleCreateDept}
            onUpdate={handleUpdateDept}
            onDelete={handleDeleteDept}
            addLabel="Thêm phòng ban"
            canEdit={canEdit}
          />
        </div>
      )}

      {/* TAB 3: INTERESTED PARTIES (CLAUSE 4.2) */}
      {activeTab === "parties" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm bên quan tâm, yêu cầu luật định..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Button
                variant={partyTypeFilter === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setPartyTypeFilter("ALL")}
                className={partyTypeFilter === "ALL" ? "bg-emerald-600" : ""}
              >
                Tất cả ({parties.length})
              </Button>
              <Button
                variant={partyTypeFilter === "INTERNAL" ? "default" : "outline"}
                size="sm"
                onClick={() => setPartyTypeFilter("INTERNAL")}
                className={partyTypeFilter === "INTERNAL" ? "bg-emerald-600" : ""}
              >
                Nội bộ ({parties.filter((p) => p.party_type === "INTERNAL").length})
              </Button>
              <Button
                variant={partyTypeFilter === "EXTERNAL" ? "default" : "outline"}
                size="sm"
                onClick={() => setPartyTypeFilter("EXTERNAL")}
                className={partyTypeFilter === "EXTERNAL" ? "bg-emerald-600" : ""}
              >
                Bên ngoài ({parties.filter((p) => p.party_type === "EXTERNAL").length})
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Tên bên quan tâm</th>
                  <th className="py-3 px-4">Phân loại</th>
                  <th className="py-3 px-4">Nhu cầu & Kỳ vọng ATTP</th>
                  <th className="py-3 px-4">Yêu cầu luật định liên quan</th>
                  <th className="py-3 px-4">Phương pháp & Tần suất</th>
                  <th className="py-3 px-4">Phụ trách</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parties
                  .filter((p) => {
                    const matchesType = partyTypeFilter === "ALL" || p.party_type === partyTypeFilter;
                    const q = searchQuery.toLowerCase();
                    const matchesQ =
                      !searchQuery ||
                      p.party_name.toLowerCase().includes(q) ||
                      p.needs_and_expectations.toLowerCase().includes(q) ||
                      (p.statutory_requirements && p.statutory_requirements.toLowerCase().includes(q));
                    return matchesType && matchesQ;
                  })
                  .map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900 max-w-xs">{p.party_name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                            p.party_type === "INTERNAL"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {p.party_type === "INTERNAL" ? "Nội bộ" : "Bên ngoài"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 max-w-sm">{p.needs_and_expectations}</td>
                      <td className="py-3 px-4 text-xs text-slate-600 font-mono max-w-xs">
                        {p.statutory_requirements || "--"}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <div>{p.monitoring_method || "--"}</div>
                        <span className="text-[11px] font-semibold text-emerald-700">({p.review_frequency})</span>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-700">{p.responsible_role}</td>
                      <td className="py-3 px-4 text-right">
                        {canEdit && (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={() => openEditParty(p)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => handleDeleteParty(p.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CONTEXT RISKS (CLAUSE 4.1 & 6.1) */}
      {activeTab === "risks" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm mã rủi ro, vấn đề bối cảnh, kế hoạch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Button
                variant={riskCategoryFilter === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setRiskCategoryFilter("ALL")}
                className={riskCategoryFilter === "ALL" ? "bg-emerald-600" : ""}
              >
                Tất cả ({risks.length})
              </Button>
              <Button
                variant={riskCategoryFilter === "INTERNAL" ? "default" : "outline"}
                size="sm"
                onClick={() => setRiskCategoryFilter("INTERNAL")}
                className={riskCategoryFilter === "INTERNAL" ? "bg-emerald-600" : ""}
              >
                Bối cảnh nội bộ ({risks.filter((r) => r.issue_category === "INTERNAL").length})
              </Button>
              <Button
                variant={riskCategoryFilter === "EXTERNAL" ? "default" : "outline"}
                size="sm"
                onClick={() => setRiskCategoryFilter("EXTERNAL")}
                className={riskCategoryFilter === "EXTERNAL" ? "bg-emerald-600" : ""}
              >
                Bối cảnh bên ngoài ({risks.filter((r) => r.issue_category === "EXTERNAL").length})
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Mã</th>
                  <th className="py-3 px-3">Bối cảnh</th>
                  <th className="py-3 px-3">Vấn đề & Rủi ro ATTP</th>
                  <th className="py-3 px-3">Cơ hội cải tiến</th>
                  <th className="py-3 px-3 text-center">Ma trận (L x S)</th>
                  <th className="py-3 px-3">Chiến lược</th>
                  <th className="py-3 px-3">Kế hoạch hành động kiểm soát</th>
                  <th className="py-3 px-3 text-center">Rủi ro dư</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {risks
                  .filter((r) => {
                    const matchesCat = riskCategoryFilter === "ALL" || r.issue_category === riskCategoryFilter;
                    const q = searchQuery.toLowerCase();
                    const matchesQ =
                      !searchQuery ||
                      r.code.toLowerCase().includes(q) ||
                      r.issue_description.toLowerCase().includes(q) ||
                      r.risk_description.toLowerCase().includes(q) ||
                      r.action_plan.toLowerCase().includes(q);
                    return matchesCat && matchesQ;
                  })
                  .map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">{r.code}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.issue_category === "INTERNAL"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          {r.issue_category === "INTERNAL" ? "Nội bộ" : "Bên ngoài"}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-semibold text-slate-900 text-xs">{r.issue_description}</div>
                        <div className="text-xs text-rose-700 mt-0.5">Rủi ro: {r.risk_description}</div>
                      </td>
                      <td className="py-3 px-3 text-xs text-emerald-800 max-w-xs">{r.opportunity_description || "--"}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="text-xs font-semibold">
                          {r.likelihood} × {r.severity}
                        </div>
                        <div className="mt-0.5">{getContextRiskBadge(r.risk_score)}</div>
                      </td>
                      <td className="py-3 px-3 text-xs font-bold text-slate-700">{r.treatment_strategy}</td>
                      <td className="py-3 px-3 text-xs text-slate-700 max-w-sm">
                        <div>{r.action_plan}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Hạn: <strong>{r.target_date || "--"}</strong> · Phụ trách: <strong>{r.responsible_role}</strong>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-xs">
                        {r.residual_risk_score ? (
                          <span className="font-bold text-emerald-700">
                            {r.residual_likelihood}×{r.residual_severity} = {r.residual_risk_score}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {canEdit && (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={() => openEditRisk(r)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => handleDeleteRisk(r.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT INTERESTED PARTY */}
      {partyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {editingParty ? "Cập nhật bên quan tâm (Điều 4.2)" : "Thêm bên quan tâm mới"}
              </h3>
              <button onClick={() => setPartyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParty} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phân loại bối cảnh *</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={partyForm.party_type}
                    onChange={(e) => setPartyForm({ ...partyForm, party_type: e.target.value })}
                  >
                    <option value="EXTERNAL">Bên ngoài (Cơ quan, Khách hàng, NCC...)</option>
                    <option value="INTERNAL">Nội bộ (BGĐ, CBCNV, Cổ đông...)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tần suất rà soát</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={partyForm.review_frequency}
                    onChange={(e) => setPartyForm({ ...partyForm, review_frequency: e.target.value })}
                  >
                    <option value="Hàng quý">Hàng quý</option>
                    <option value="6 tháng/lần">6 tháng/lần</option>
                    <option value="Hàng năm">Hàng năm</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên bên quan tâm *</label>
                <Input
                  required
                  placeholder="Ví dụ: Cơ quan quản lý ATTP, Chuỗi bán lẻ..."
                  value={partyForm.party_name}
                  onChange={(e) => setPartyForm({ ...partyForm, party_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nhu cầu và mong đợi về ATTP *</label>
                <textarea
                  required
                  rows={3}
                  className="w-full border rounded-md p-2 text-xs"
                  placeholder="Yêu cầu chất lượng, hồ sơ chứng nhận, thời gian giao hàng..."
                  value={partyForm.needs_and_expectations}
                  onChange={(e) => setPartyForm({ ...partyForm, needs_and_expectations: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Yêu cầu luật định & quy chuẩn liên quan</label>
                <Input
                  placeholder="Luật ATTP 55/2010, Nghị định 15/2018, QCVN..."
                  value={partyForm.statutory_requirements}
                  onChange={(e) => setPartyForm({ ...partyForm, statutory_requirements: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phương pháp theo dõi</label>
                  <Input
                    placeholder="Kiểm tra định kỳ, khảo sát..."
                    value={partyForm.monitoring_method}
                    onChange={(e) => setPartyForm({ ...partyForm, monitoring_method: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bộ phận phụ trách</label>
                  <Input
                    placeholder="Ban QLCL & ATTP"
                    value={partyForm.responsible_role}
                    onChange={(e) => setPartyForm({ ...partyForm, responsible_role: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setPartyModalOpen(false)}>
                  Hủy bỏ
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Lưu thông tin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT CONTEXT RISK */}
      {riskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {editingRisk ? "Cập nhật rủi ro bối cảnh" : "Ghi nhận rủi ro & cơ hội bối cảnh mới (Điều 6.1)"}
              </h3>
              <button onClick={() => setRiskModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRisk} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã rủi ro *</label>
                  <Input
                    required
                    placeholder="CR-01"
                    value={riskForm.code}
                    onChange={(e) => setRiskForm({ ...riskForm, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bối cảnh phát sinh</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={riskForm.issue_category}
                    onChange={(e) => setRiskForm({ ...riskForm, issue_category: e.target.value })}
                  >
                    <option value="EXTERNAL">Bối cảnh bên ngoài</option>
                    <option value="INTERNAL">Bối cảnh nội bộ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chiến lược xử lý</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={riskForm.treatment_strategy}
                    onChange={(e) => setRiskForm({ ...riskForm, treatment_strategy: e.target.value })}
                  >
                    <option value="MITIGATE">Giảm thiểu (Mitigate)</option>
                    <option value="ACCEPT">Chấp nhận (Accept)</option>
                    <option value="AVOID">Né tránh (Avoid)</option>
                    <option value="TRANSFER">Chuyển giao (Transfer)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vấn đề bối cảnh (Issue) *</label>
                <Input
                  required
                  placeholder="Ví dụ: Hạn mặn ảnh hưởng nguồn cung nông sản tươi..."
                  value={riskForm.issue_description}
                  onChange={(e) => setRiskForm({ ...riskForm, issue_description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nguy cơ/Rủi ro ATTP *</label>
                  <textarea
                    required
                    rows={2}
                    className="w-full border rounded-md p-2 text-xs"
                    placeholder="Dư lượng hoạt chất BVTV vượt ngưỡng MRLs..."
                    value={riskForm.risk_description}
                    onChange={(e) => setRiskForm({ ...riskForm, risk_description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cơ hội cải tiến (Opportunity)</label>
                  <textarea
                    rows={2}
                    className="w-full border rounded-md p-2 text-xs"
                    placeholder="Xây dựng vùng trồng bao tiêu công nghệ cao..."
                    value={riskForm.opportunity_description}
                    onChange={(e) => setRiskForm({ ...riskForm, opportunity_description: e.target.value })}
                  />
                </div>
              </div>

              {/* Ma trận L x S */}
              <div className="p-3 bg-slate-50 border rounded-lg">
                <div className="text-xs font-bold text-slate-700 mb-2">Đánh giá ma trận rủi ro ban đầu (L × S):</div>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Khả năng (L: 1-5)</label>
                    <select
                      className="w-full border rounded p-1.5 bg-white text-xs"
                      value={riskForm.likelihood}
                      onChange={(e) => setRiskForm({ ...riskForm, likelihood: Number(e.target.value) })}
                    >
                      <option value={1}>1 - Hiếm khi</option>
                      <option value={2}>2 - Ít khi</option>
                      <option value={3}>3 - Thỉnh thoảng</option>
                      <option value={4}>4 - Thường xuyên</option>
                      <option value={5}>5 - Rất thường xuyên</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Mức độ nghiêm trọng (S: 1-5)</label>
                    <select
                      className="w-full border rounded p-1.5 bg-white text-xs"
                      value={riskForm.severity}
                      onChange={(e) => setRiskForm({ ...riskForm, severity: Number(e.target.value) })}
                    >
                      <option value={1}>1 - Rất nhỏ</option>
                      <option value={2}>2 - Nhỏ</option>
                      <option value={3}>3 - Trung bình</option>
                      <option value={4}>4 - Lớn</option>
                      <option value={5}>5 - Rất nghiêm trọng</option>
                    </select>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] text-slate-500 font-medium">Điểm rủi ro (R = L × S):</div>
                    <div className="mt-1">{getContextRiskBadge(riskForm.likelihood * riskForm.severity)}</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kế hoạch hành động ứng phó & kiểm soát *</label>
                <textarea
                  required
                  rows={3}
                  className="w-full border rounded-md p-2 text-xs"
                  placeholder="Tăng cường test nhanh IQC, ký cam kết kỹ thuật vùng trồng..."
                  value={riskForm.action_plan}
                  onChange={(e) => setRiskForm({ ...riskForm, action_plan: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Người / Bộ phận phụ trách</label>
                  <Input
                    value={riskForm.responsible_role}
                    onChange={(e) => setRiskForm({ ...riskForm, responsible_role: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thời hạn hoàn thành</label>
                  <Input
                    type="date"
                    value={riskForm.target_date}
                    onChange={(e) => setRiskForm({ ...riskForm, target_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                <div>
                  <label className="block text-[11px] text-emerald-800 mb-1 font-semibold">Khả năng sau xử lý</label>
                  <select
                    className="w-full border rounded p-1.5 bg-white text-xs"
                    value={riskForm.residual_likelihood}
                    onChange={(e) => setRiskForm({ ...riskForm, residual_likelihood: Number(e.target.value) })}
                  >
                    <option value={1}>1 - Hiếm khi</option>
                    <option value={2}>2 - Ít khi</option>
                    <option value={3}>3 - Thỉnh thoảng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-emerald-800 mb-1 font-semibold">Mức độ sau xử lý</label>
                  <select
                    className="w-full border rounded p-1.5 bg-white text-xs"
                    value={riskForm.residual_severity}
                    onChange={(e) => setRiskForm({ ...riskForm, residual_severity: Number(e.target.value) })}
                  >
                    <option value={1}>1 - Rất nhỏ</option>
                    <option value={2}>2 - Nhỏ</option>
                    <option value={3}>3 - Trung bình</option>
                  </select>
                </div>
                <div className="text-center pt-2">
                  <div className="text-[11px] text-emerald-800 font-semibold">Rủi ro còn lại:</div>
                  <div className="font-bold text-emerald-700 mt-1">
                    {riskForm.residual_likelihood * riskForm.residual_severity} điểm
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setRiskModalOpen(false)}>
                  Hủy bỏ
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Lưu rủi ro
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, v, l, sub }: { icon: React.ReactNode; v: string; l: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600">{icon}</div>
        <div className="text-2xl font-bold text-slate-800">{v}</div>
      </div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-600">{l}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}