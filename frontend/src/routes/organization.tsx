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
  MessageSquare,
  ShieldCheck,
  Award,
  Phone,
  BookOpen,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { DEFAULT_DEPARTMENTS } from "@/lib/departments";
import { useModuleAccess } from "@/lib/rbac";
import { printHtml } from "@/lib/print";
import { EmptyState } from "@/components/EmptyState";
import { ModuleGuideModal } from "@/components/ModuleGuideModal";

export const Route = createFileRoute("/organization")({
  head: () => ({
    meta: [
      { title: "Bối cảnh, Tổ chức & Trao đổi thông tin – WCERT FSMS" },
      { name: "description", content: "Quản lý bối cảnh tổ chức, Đội ATTP, các bên quan tâm, rủi ro FSMS và sổ nhật ký trao đổi thông tin ATTP." },
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

interface CommunicationLogItem {
  id: number;
  comm_code: string;
  direction: "INTERNAL" | "EXTERNAL";
  party_type: "CUSTOMER" | "SUPPLIER" | "AUTHORITY" | "EMPLOYEE" | "COMMUNITY" | "OTHER";
  party_name: string;
  contact_person?: string;
  contact_info?: string;
  subject: string;
  content: string;
  method: "EMAIL" | "MEETING" | "DISPATCH" | "HOTLINE" | "INSPECTION" | "NOTICE" | "OTHER";
  comm_date: string;
  responsible_person: string;
  response_content?: string;
  response_date?: string;
  action_required: boolean;
  action_details?: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  notes?: string;
  created_at?: string;
}

interface FoodSafetyTeamMemberItem {
  id: any;
  user_id?: any;
  full_name: string;
  role: string;
  department: string;
  job_title: string;
  decision_number: string;
  decision_date: string;
  qualification?: string;
  responsibilities?: string;
  phone?: string;
  email?: string;
  status: "ACTIVE" | "INACTIVE" | string;
  created_at?: string;
}

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
  const [activeTab, setActiveTab] = useState<"users" | "depts" | "parties" | "risks" | "communications" | "food_safety_team">("users");
  const [depts, setDepts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [parties, setParties] = useState<InterestedPartyItem[]>([]);
  const [risks, setRisks] = useState<ContextRiskItem[]>([]);
  const [communications, setCommunications] = useState<CommunicationLogItem[]>([]);
  const [fstMembers, setFstMembers] = useState<FoodSafetyTeamMemberItem[]>([]);
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

  // Communications Filter & Modals
  const [commSearch, setCommSearch] = useState("");
  const [commDirectionFilter, setCommDirectionFilter] = useState<"ALL" | "INTERNAL" | "EXTERNAL">("ALL");
  const [commStatusFilter, setCommStatusFilter] = useState<"ALL" | "OPEN" | "IN_PROGRESS" | "CLOSED">("ALL");
  const [commModalOpen, setCommModalOpen] = useState(false);
  const [editingComm, setEditingComm] = useState<CommunicationLogItem | null>(null);
  const [commForm, setCommForm] = useState<any>({
    comm_code: "",
    direction: "EXTERNAL",
    party_type: "CUSTOMER",
    party_name: "",
    contact_person: "",
    contact_info: "",
    subject: "",
    content: "",
    method: "EMAIL",
    comm_date: new Date().toISOString().split("T")[0],
    responsible_person: "Ban QLCL & ATTP",
    response_content: "",
    response_date: "",
    action_required: false,
    action_details: "",
    status: "OPEN",
    notes: "",
  });

  // Food Safety Team Filter & Modals
  const [showGuide, setShowGuide] = useState(false);
  const [fstSearch, setFstSearch] = useState("");
  const [fstRoleFilter, setFstRoleFilter] = useState<"ALL" | "Đội trưởng" | "Đội phó" | "Thư ký" | "Đội viên">("ALL");
  const [fstModalOpen, setFstModalOpen] = useState(false);
  const [editingFst, setEditingFst] = useState<FoodSafetyTeamMemberItem | null>(null);
  const [fstForm, setFstForm] = useState<any>({
    full_name: "",
    role: "Đội viên",
    department: "Phòng QLCL & ATTP",
    job_title: "Chuyên viên QLCL",
    decision_number: "02/QĐ-ATTP-2026",
    decision_date: "2026-01-15",
    qualification: "Kỹ sư Công nghệ Thực phẩm",
    responsibilities: "",
    phone: "",
    email: "",
    status: "ACTIVE",
  });

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
      const [deptRes, userRes, partiesRes, risksRes, statsRes, commRes, fstRes] = await Promise.all([
        api.get("/organization/departments"),
        api.get("/organization/users"),
        api.get("/organization/interested-parties"),
        api.get("/organization/context-risks"),
        api.get("/organization/context-stats"),
        api.get("/organization/communications"),
        api.get("/organization/food-safety-team"),
      ]);
      setDepts(deptRes.data);
      setUsers(userRes.data);
      setParties(partiesRes.data);
      setRisks(risksRes.data);
      setContextStats(statsRes.data);
      setCommunications(commRes.data);

      const roleMap: Record<string, string> = {
        TEAM_LEADER: "Đội trưởng",
        VICE_LEADER: "Đội phó",
        SECRETARY: "Thư ký",
        MEMBER: "Đội viên",
      };
      const normalizedFst = (fstRes.data || []).map((m: any) => {
        const rawRole = m.role_in_team || m.role || "Đội viên";
        const roleLabel = roleMap[rawRole] || rawRole;
        return {
          ...m,
          id: m.member_id || m.id,
          full_name: m.member_name || m.full_name || "",
          role: roleLabel,
          department: m.department || "",
          job_title: m.current_position || m.job_title || "",
          qualification: m.qualification_and_training || m.qualification || "",
          responsibilities: m.responsibility_description || m.responsibilities || "",
          decision_number: m.appointment_decision_code || m.decision_number || "02/QĐ-ATTP-2026",
          decision_date: m.appointment_date || m.decision_date || "",
          phone: m.phone || "",
          email: m.email || "",
          status: m.status || "ACTIVE",
        };
      });
      setFstMembers(normalizedFst);
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
      hideInForm: true,
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

  // HANDLERS TRAO ĐỔI THÔNG TIN ATTP
  const openNewComm = () => {
    setEditingComm(null);
    const codeNum = communications.length + 1;
    setCommForm({
      comm_code: `COMM-2026-${String(codeNum).padStart(3, "0")}`,
      direction: "EXTERNAL",
      party_type: "CUSTOMER",
      party_name: "",
      contact_person: "",
      contact_info: "",
      subject: "",
      content: "",
      method: "EMAIL",
      comm_date: new Date().toISOString().split("T")[0],
      responsible_person: "Ban QLCL & ATTP",
      response_content: "",
      response_date: "",
      action_required: false,
      action_details: "",
      status: "OPEN",
      notes: "",
    });
    setCommModalOpen(true);
  };

  const openEditComm = (c: CommunicationLogItem) => {
    setEditingComm(c);
    setCommForm({
      comm_code: c.comm_code,
      direction: c.direction,
      party_type: c.party_type,
      party_name: c.party_name,
      contact_person: c.contact_person || "",
      contact_info: c.contact_info || "",
      subject: c.subject,
      content: c.content,
      method: c.method,
      comm_date: c.comm_date,
      responsible_person: c.responsible_person,
      response_content: c.response_content || "",
      response_date: c.response_date || "",
      action_required: c.action_required,
      action_details: c.action_details || "",
      status: c.status,
      notes: c.notes || "",
    });
    setCommModalOpen(true);
  };

  const handleSaveComm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...commForm,
        response_date: commForm.response_date || null,
      };
      if (editingComm) {
        await api.put(`/organization/communications/${editingComm.id}`, payload);
        toast.success("Đã cập nhật trao đổi thông tin");
      } else {
        await api.post("/organization/communications", payload);
        toast.success("Đã tạo nhật ký trao đổi thông tin mới");
      }
      setCommModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu thông tin trao đổi");
    }
  };

  const handleDeleteComm = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bản ghi trao đổi thông tin này?")) return;
    try {
      await api.delete(`/organization/communications/${id}`);
      toast.success("Đã xóa nhật ký trao đổi thông tin");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa");
    }
  };

  // HANDLERS ĐỘI AN TOÀN THỰC PHẨM (QĐ 02)
  const openNewFst = () => {
    setEditingFst(null);
    setFstForm({
      full_name: "",
      role: "Đội viên",
      department: "Phòng QLCL & ATTP",
      job_title: "Chuyên viên QLCL",
      decision_number: "02/QĐ-ATTP-2026",
      decision_date: "2026-01-15",
      qualification: "Kỹ sư Công nghệ Thực phẩm",
      responsibilities: "",
      phone: "",
      email: "",
      status: "ACTIVE",
    });
    setFstModalOpen(true);
  };

  const openEditFst = (m: FoodSafetyTeamMemberItem) => {
    setEditingFst(m);
    setFstForm({
      full_name: m.full_name,
      role: m.role,
      department: m.department,
      job_title: m.job_title,
      decision_number: m.decision_number,
      decision_date: m.decision_date,
      qualification: m.qualification || "",
      responsibilities: m.responsibilities || "",
      phone: m.phone || "",
      email: m.email || "",
      status: m.status,
    });
    setFstModalOpen(true);
  };

  const handleSaveFst = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        member_name: fstForm.full_name,
        full_name: fstForm.full_name,
        role_in_team:
          fstForm.role === "Đội trưởng"
            ? "TEAM_LEADER"
            : fstForm.role === "Đội phó"
            ? "VICE_LEADER"
            : fstForm.role === "Thư ký"
            ? "SECRETARY"
            : "MEMBER",
        role: fstForm.role,
        department: fstForm.department,
        current_position: fstForm.job_title,
        job_title: fstForm.job_title,
        qualification_and_training: fstForm.qualification,
        qualification: fstForm.qualification,
        responsibility_description: fstForm.responsibilities,
        responsibilities: fstForm.responsibilities,
        appointment_decision_code: fstForm.decision_number,
        decision_number: fstForm.decision_number,
        appointment_date: fstForm.decision_date,
        decision_date: fstForm.decision_date,
        phone: fstForm.phone,
        email: fstForm.email,
        status: fstForm.status,
      };

      if (editingFst) {
        await api.put(`/organization/food-safety-team/${editingFst.id}`, payload);
        toast.success("Đã cập nhật thành viên Đội ATTP");
      } else {
        await api.post("/organization/food-safety-team", payload);
        toast.success("Đã bổ nhiệm thành viên Đội ATTP mới");
      }
      setFstModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu thành viên Đội ATTP");
    }
  };

  const handleDeleteFst = async (id: any) => {
    if (!confirm("Bạn có chắc chắn muốn xóa thành viên này khỏi Đội ATTP?")) return;
    try {
      await api.delete(`/organization/food-safety-team/${id}`);
      toast.success("Đã xóa thành viên Đội ATTP");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa");
    }
  };

  // IN QUYẾT ĐỊNH THÀNH LẬP ĐỘI ATTP (THEO TÀI LIỆU GỐC QĐ 02 - BM-FST-01)
  const handlePrintFSTDecision = () => {
    const activeMembers = fstMembers.filter((m) => m.status === "ACTIVE");
    const html = `
      <div style="font-family: 'Times New Roman', Times, serif; color: #111; line-height: 1.45; padding: 25px 35px;">
        <table style="width: 100%; border-collapse: collapse; text-align: center; margin-bottom: 20px;">
          <tr>
            <td style="width: 45%; vertical-align: top;">
              <strong>CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI TIẾN ANH</strong><br/>
              <span style="font-size: 11pt;">Số: 02/QĐ-ATTP-2026</span>
            </td>
            <td style="width: 55%; vertical-align: top;">
              <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
              <strong>Độc lập - Tự do - Hạnh phúc</strong><br/>
              <div style="margin: 3px auto; width: 140px; border-bottom: 1px solid #111;"></div>
              <span style="font-size: 10.5pt; font-style: italic;">TP. Long Xuyên, ngày 15 tháng 01 năm 2026</span>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 15pt; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase;">QUYẾT ĐỊNH</h2>
          <h3 style="font-size: 13pt; font-weight: bold; margin: 0;">V/v Thành lập & Phân công nhiệm vụ Đội An toàn thực phẩm</h3>
          <p style="font-style: italic; font-size: 11pt; margin-top: 4px;">(Theo yêu cầu tiêu chuẩn TCVN ISO 22000:2018 - Điều khoản 5.3)</p>
        </div>

        <div style="font-size: 11pt; text-align: justify; margin-bottom: 15px;">
          <p style="margin: 4px 0;"><strong>GIÁM ĐỐC CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI TIẾN ANH</strong></p>
          <p style="margin: 4px 0;"><em>- Căn cứ vào Điều lệ tổ chức và hoạt động của Công ty TNHH SX TM Tiến Anh;</em></p>
          <p style="margin: 4px 0;"><em>- Căn cứ yêu cầu của tiêu chuẩn Hệ thống quản lý an toàn thực phẩm ISO 22000:2018;</em></p>
          <p style="margin: 4px 0;"><em>- Xét năng lực chuyên môn của cán bộ, nhân viên và đề nghị của Trưởng ban QLCL;</em></p>
        </div>

        <div style="text-align: center; font-weight: bold; font-size: 12pt; margin: 12px 0;">QUYẾT ĐỊNH:</div>

        <div style="font-size: 11pt; text-align: justify;">
          <p style="margin: 6px 0;"><strong>Điều 1.</strong> Thành lập <strong>Đội An toàn thực phẩm (Food Safety Team)</strong> của Công ty gồm các Ông/Bà có tên trong danh sách sau:</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10.5pt;" border="1" cellpadding="6">
          <thead>
            <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
              <th style="width: 6%;">STT</th>
              <th style="width: 22%;">Họ và tên</th>
              <th style="width: 16%;">Chức danh trong Đội</th>
              <th style="width: 22%;">Chức vụ / Phòng ban</th>
              <th style="width: 34%;">Nhiệm vụ phân công chính</th>
            </tr>
          </thead>
          <tbody>
            ${activeMembers
              .map(
                (m, idx) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td style="font-weight: bold;">${m.full_name}</td>
                <td style="text-align: center; font-weight: bold; color: ${
                  m.role === "Đội trưởng" ? "#b91c1c" : m.role === "Thư ký" ? "#6b21a8" : "#047857"
                };">
                  ${m.role}
                </td>
                <td>${m.job_title} - ${m.department}</td>
                <td>${m.responsibilities || "--"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div style="font-size: 11pt; text-align: justify; margin-top: 14px;">
          <p style="margin: 6px 0;"><strong>Điều 2. Trách nhiệm và quyền hạn của Đội An toàn thực phẩm:</strong></p>
          <p style="margin: 3px 0 3px 15px;">1. Quản lý, thiết lập, thực hiện, duy trì và cập nhật Hệ thống Quản lý An toàn thực phẩm ISO 22000:2018.</p>
          <p style="margin: 3px 0 3px 15px;">2. Tổ chức phân tích mối nguy, nhận diện và thẩm tra các điểm kiểm soát tới hạn (CCP) và các chương trình tiên quyết (PRP/OPRP).</p>
          <p style="margin: 3px 0 3px 15px;">3. Đội trưởng Đội ATTP có trách nhiệm báo cáo trực tiếp cho Giám đốc về hiệu lực và tính phù hợp của hệ thống FSMS.</p>
          <p style="margin: 6px 0;"><strong>Điều 3.</strong> Quyết định này có hiệu lực kể từ ngày ký. Các phòng ban chức năng và các Ông/Bà có tên tại Điều 1 chịu trách nhiệm thi hành quyết định này.</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 11pt;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <strong><em>Nơi nhận:</em></strong><br/>
              <span style="font-size: 10pt;">- Như Điều 3;</span><br/>
              <span style="font-size: 10pt;">- Ban Giám Đốc (để b/c);</span><br/>
              <span style="font-size: 10pt;">- Lưu: VP, QLCL.</span>
            </td>
            <td style="width: 50%; text-align: center; vertical-align: top;">
              <strong>TỔNG GIÁM ĐỐC</strong><br/>
              <span style="font-size: 10pt; font-style: italic;">(Ký, đóng dấu và ghi rõ họ tên)</span>
              <div style="height: 65px;"></div>
              <strong>NGUYỄN VĂN AN</strong>
            </td>
          </tr>
        </table>
      </div>
    `;
    printHtml(html);
  };

  // IN SỔ NHẬT KÝ TRAO ĐỔI THÔNG TIN ATTP (BM-COMM-01)
  const handlePrintCommunications = () => {
    const html = `
      <div style="font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #111; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #333; padding: 6px;">
              <strong style="font-size: 13pt; color: #047857;">WCERT FOOD</strong><br/>
              <span style="font-size: 9pt;">HỆ THỐNG FSMS ISO 22000</span>
            </td>
            <td style="width: 50%; text-align: center; border: 1px solid #333; padding: 6px;">
              <strong style="font-size: 13pt; text-transform: uppercase;">SỔ NHẬT KÝ TRAO ĐỔI THÔNG TIN ATTP</strong><br/>
              <span style="font-size: 10pt; font-weight: bold;">(Căn cứ Điều 7.4 Tiêu chuẩn ISO 22000:2018)</span>
            </td>
            <td style="width: 25%; border: 1px solid #333; padding: 6px; font-size: 9pt;">
              Biểu mẫu: <strong>BM-COMM-01</strong><br/>
              Lần ban hành: <strong>01</strong><br/>
              Ngày áp dụng: <strong>01/01/2026</strong>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 10pt;" border="1" cellpadding="5">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: center; font-weight: bold;">
              <th style="width: 5%;">STT</th>
              <th style="width: 11%;">Mã / Ngày</th>
              <th style="width: 10%;">Hướng / Đối tượng</th>
              <th style="width: 15%;">Tên đối tác / Liên hệ</th>
              <th style="width: 25%;">Chủ đề & Nội dung trao đổi</th>
              <th style="width: 10%;">Hình thức</th>
              <th style="width: 16%;">Phản hồi / Hành động khắc phục</th>
              <th style="width: 8%;">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${communications
              .map(
                (c, idx) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td style="text-align: center;">
                  <strong>${c.comm_code}</strong><br/>
                  <span style="color: #64748b; font-size: 9pt;">${c.comm_date}</span>
                </td>
                <td style="text-align: center;">
                  <strong>${c.direction === "INTERNAL" ? "Nội bộ" : "Bên ngoài"}</strong><br/>
                  <span style="font-size: 8.5pt;">(${c.party_type})</span>
                </td>
                <td>
                  <strong>${c.party_name}</strong><br/>
                  <span style="font-size: 8.5pt; color: #475569;">${c.contact_person || ""} ${c.contact_info || ""}</span>
                </td>
                <td>
                  <strong>${c.subject}</strong>
                  <div style="font-size: 9pt; color: #334155; margin-top: 2px;">${c.content}</div>
                </td>
                <td style="text-align: center;">${c.method}</td>
                <td>
                  ${c.response_content ? `<div style="color: #047857;"><strong>Phản hồi:</strong> ${c.response_content}</div>` : "--"}
                  ${c.action_required ? `<div style="color: #b91c1c; margin-top: 2px;"><strong>Cần xử lý:</strong> ${c.action_details || "Có"}</div>` : ""}
                </td>
                <td style="text-align: center; font-weight: bold;">
                  ${c.status === "CLOSED" ? "<span style='color: #047857;'>Đã đóng</span>" : c.status === "IN_PROGRESS" ? "<span style='color: #d97706;'>Đang xử lý</span>" : "<span style='color: #2563eb;'>Mở</span>"}
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-top: 25px; text-align: center;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <strong>NGƯỜI LẬP SỔ / PHỤ TRÁCH</strong><br/>
              <span style="font-size: 10pt; font-style: italic;">(Ký & ghi rõ họ tên)</span>
              <div style="height: 55px;"></div>
              <strong>Ban QLCL & ATTP</strong>
            </td>
            <td style="width: 50%; vertical-align: top;">
              <strong>ĐỘI TRƯỞNG ĐỘI ATTP PHÊ DUYỆT</strong><br/>
              <span style="font-size: 10pt; font-style: italic;">(Ký & ghi rõ họ tên)</span>
              <div style="height: 55px;"></div>
              <strong>Đội Trưởng FS Team</strong>
            </td>
          </tr>
        </table>
      </div>
    `;
    printHtml(html);
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
        title="Bối cảnh, Tổ chức & Trao đổi thông tin"
        description="Quản lý bối cảnh tổ chức, Đội ATTP, các bên quan tâm, rủi ro FSMS và sổ nhật ký trao đổi thông tin ATTP."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(true)}
              className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50"
            >
              <BookOpen className="h-4 w-4" />
              Hướng Dẫn Nghiệp Vụ
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            {activeTab === "food_safety_team" && (
              <>
                <Button variant="outline" size="sm" onClick={handlePrintFSTDecision} className="gap-1.5 text-slate-700">
                  <Printer className="h-4 w-4" /> In Quyết định Đội ATTP (BM-FST-01)
                </Button>
                {canEdit && (
                  <Button size="sm" onClick={openNewFst} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4" /> Thêm thành viên Đội ATTP
                  </Button>
                )}
              </>
            )}
            {activeTab === "communications" && (
              <>
                <Button variant="outline" size="sm" onClick={handlePrintCommunications} className="gap-1.5 text-slate-700">
                  <Printer className="h-4 w-4" /> In Sổ nhật ký (BM-COMM-01)
                </Button>
                {canEdit && (
                  <Button size="sm" onClick={openNewComm} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4" /> Thêm trao đổi thông tin
                  </Button>
                )}
              </>
            )}
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
          icon={<ShieldCheck className="h-5 w-5" />}
          v={String(fstMembers.filter((m) => m.status === "ACTIVE").length)}
          l="Đội ATTP"
          sub={`QĐ 02/QĐ-ATTP-2026 · ${fstMembers.filter((m) => m.role === "Đội trưởng").length} Đội trưởng`}
        />
        <Kpi
          icon={<Globe className="h-5 w-5" />}
          v={String(contextStats.total_parties)}
          l="Các bên quan tâm"
          sub={`${contextStats.internal_parties} nội bộ · ${contextStats.external_parties} bên ngoài`}
        />
        <Kpi
          icon={<MessageSquare className="h-5 w-5" />}
          v={String(communications.length)}
          l="Trao đổi thông tin"
          sub={`${communications.filter((c) => c.status === "OPEN").length} đang mở · ${communications.filter((c) => c.action_required).length} cần xử lý`}
        />
      </div>

      {/* 6 Tabs chuyển đổi */}
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
            Tài khoản & Phân quyền
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
            Phòng ban & Cơ cấu
          </button>
          <button
            onClick={() => setActiveTab("food_safety_team")}
            className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === "food_safety_team"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Đội ATTP
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
            Bên quan tâm
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
            Rủi ro bối cảnh
          </button>
          <button
            onClick={() => setActiveTab("communications")}
            className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === "communications"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            Trao đổi thông tin
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

      {/* TAB: FOOD SAFETY TEAM (QĐ 02) */}
      {activeTab === "food_safety_team" && (
        <div className="space-y-4">
          {/* Decision header banner */}
          <div className="rounded-xl border border-emerald-200 bg-linear-to-r from-emerald-50 via-teal-50 to-white p-4 shadow-xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white uppercase">
                    QĐ 02/QĐ-ATTP-2026
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Ban hành: 15/01/2026 · Hiệu lực thi hành</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Đội An Toàn Thực Phẩm FSMS (Food Safety Team)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Căn cứ Quyết định số 02 của Ban Giám Đốc. Đội gồm 3 nhóm vai trò chính thức: <b>Đội trưởng</b>, <b>Thư ký</b>, và <b>Đội viên</b>.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handlePrintFSTDecision} className="gap-1.5 text-slate-700 bg-white">
                  <Printer className="h-4 w-4" /> In Quyết định (BM-FST-01)
                </Button>
                {canEdit && (
                  <Button size="sm" onClick={openNewFst} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="h-4 w-4" /> Thêm thành viên
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm thành viên, chức danh, nhiệm vụ..."
                value={fstSearch}
                onChange={(e) => setFstSearch(e.target.value)}
                className="pl-9 h-9 bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {(["ALL", "Đội trưởng", "Đội phó", "Thư ký", "Đội viên"] as const).map((r) => (
                <Button
                  key={r}
                  variant={fstRoleFilter === r ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFstRoleFilter(r)}
                  className={fstRoleFilter === r ? "bg-emerald-600 text-white" : ""}
                >
                  {r === "ALL" ? "Tất cả" : r}
                </Button>
              ))}
            </div>
          </div>

          {fstMembers.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Chưa có thành viên Đội ATTP nào"
              description="Hệ thống chưa ghi nhận danh sách thành viên Đội An toàn thực phẩm theo Quyết định số 02. Hãy bắt đầu bổ nhiệm Đội trưởng và các thành viên phụ trách."
              actionLabel="+ Thêm thành viên Đội ATTP"
              onAction={openNewFst}
              onOpenGuide={() => setShowGuide(true)}
            />
          ) : (
            /* Members Table */
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4 text-center">Vai trò trong Đội</th>
                    <th className="py-3 px-4">Chức vụ & Phòng ban</th>
                    <th className="py-3 px-4">Trình độ / Năng lực</th>
                    <th className="py-3 px-4">Phân công nhiệm vụ chính</th>
                    <th className="py-3 px-4">Liên hệ</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fstMembers
                    .filter((m) => {
                      const matchSearch =
                        !fstSearch ||
                        m.full_name.toLowerCase().includes(fstSearch.toLowerCase()) ||
                        m.department.toLowerCase().includes(fstSearch.toLowerCase()) ||
                        (m.responsibilities && m.responsibilities.toLowerCase().includes(fstSearch.toLowerCase()));
                      const matchRole = fstRoleFilter === "ALL" || m.role === fstRoleFilter;
                      return matchSearch && matchRole;
                    })
                    .map((m, idx) => (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 text-center text-xs text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{m.full_name}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              m.role === "Đội trưởng"
                                ? "bg-rose-100 text-rose-800 border-rose-200"
                                : m.role === "Đội phó"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : m.role === "Thư ký"
                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                : "bg-blue-100 text-blue-800 border-blue-200"
                            }`}
                          >
                            {m.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{m.job_title}</div>
                          <div className="text-xs text-slate-500">{m.department}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">{m.qualification || "--"}</td>
                        <td className="py-3 px-4 text-xs text-slate-700 max-w-xs">{m.responsibilities || "--"}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {m.phone && <div>📞 {m.phone}</div>}
                          {m.email && <div>✉️ {m.email}</div>}
                          {!m.phone && !m.email && "--"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              m.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {m.status === "ACTIVE" ? "Đang công tác" : "Miễn nhiệm"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canEdit && (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={() => openEditFst(m)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => handleDeleteFst(m.id)}>
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
          )}
        </div>
      )}

      {/* TAB 4: INTERESTED PARTIES */}
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
                className={partyTypeFilter === "ALL" ? "bg-emerald-600 text-white" : ""}
              >
                Tất cả
              </Button>
              <Button
                variant={partyTypeFilter === "INTERNAL" ? "default" : "outline"}
                size="sm"
                onClick={() => setPartyTypeFilter("INTERNAL")}
                className={partyTypeFilter === "INTERNAL" ? "bg-emerald-600 text-white" : ""}
              >
                Nội bộ
              </Button>
              <Button
                variant={partyTypeFilter === "EXTERNAL" ? "default" : "outline"}
                size="sm"
                onClick={() => setPartyTypeFilter("EXTERNAL")}
                className={partyTypeFilter === "EXTERNAL" ? "bg-emerald-600 text-white" : ""}
              >
                Bên ngoài
              </Button>
            </div>
          </div>

          {parties.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="Chưa có bên quan tâm nào"
              description="Chưa xác định danh sách các bên quan tâm nội bộ và bên ngoài (khách hàng, cơ quan nhà nước, nhà cung cấp) cùng kỳ vọng và luật định tương ứng."
              actionLabel="+ Thêm bên quan tâm mới"
              onAction={openNewParty}
              onOpenGuide={() => setShowGuide(true)}
            />
          ) : (
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
          )}
        </div>
      )}

      {/* TAB 5: CONTEXT RISKS */}
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
                className={riskCategoryFilter === "ALL" ? "bg-emerald-600 text-white" : ""}
              >
                Tất cả
              </Button>
              <Button
                variant={riskCategoryFilter === "INTERNAL" ? "default" : "outline"}
                size="sm"
                onClick={() => setRiskCategoryFilter("INTERNAL")}
                className={riskCategoryFilter === "INTERNAL" ? "bg-emerald-600 text-white" : ""}
              >
                Bối cảnh nội bộ
              </Button>
              <Button
                variant={riskCategoryFilter === "EXTERNAL" ? "default" : "outline"}
                size="sm"
                onClick={() => setRiskCategoryFilter("EXTERNAL")}
                className={riskCategoryFilter === "EXTERNAL" ? "bg-emerald-600 text-white" : ""}
              >
                Bối cảnh bên ngoài
              </Button>
            </div>
          </div>

          {risks.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Chưa có rủi ro & cơ hội bối cảnh nào"
              description="Chưa có bảng đánh giá rủi ro và cơ hội từ bối cảnh hoạt động. Hãy lập ma trận rủi ro L x S và kế hoạch hành động kiểm soát tương ứng."
              actionLabel="+ Ghi nhận rủi ro bối cảnh"
              onAction={openNewRisk}
              onOpenGuide={() => setShowGuide(true)}
            />
          ) : (
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
          )}
        </div>
      )}

      {/* TAB 6: COMMUNICATIONS LOG */}
      {activeTab === "communications" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm mã, chủ đề, đối tác, nội dung..."
                value={commSearch}
                onChange={(e) => setCommSearch(e.target.value)}
                className="pl-9 h-9 bg-white"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <div className="flex items-center gap-1 border-r pr-2">
                {(["ALL", "INTERNAL", "EXTERNAL"] as const).map((d) => (
                  <Button
                    key={d}
                    variant={commDirectionFilter === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCommDirectionFilter(d)}
                    className={commDirectionFilter === d ? "bg-emerald-600 text-white" : ""}
                  >
                    {d === "ALL" ? "Tất cả hướng" : d === "INTERNAL" ? "Nội bộ" : "Bên ngoài"}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {(["ALL", "OPEN", "IN_PROGRESS", "CLOSED"] as const).map((s) => (
                  <Button
                    key={s}
                    variant={commStatusFilter === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCommStatusFilter(s)}
                    className={commStatusFilter === s ? "bg-emerald-600 text-white" : ""}
                  >
                    {s === "ALL" ? "Mọi trạng thái" : s === "OPEN" ? "Mở" : s === "IN_PROGRESS" ? "Đang xử lý" : "Đã đóng"}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {communications.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="Chưa có nhật ký trao đổi thông tin nào"
              description="Chưa ghi nhận nội dung trao đổi thông tin ATTP nội bộ hoặc bên ngoài. Hãy lập nhật ký lưu vết các thông tin trao đổi quan trọng."
              actionLabel="+ Thêm trao đổi thông tin"
              onAction={openNewComm}
              onOpenGuide={() => setShowGuide(true)}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4">Mã & Ngày</th>
                    <th className="py-3 px-4 text-center">Hướng / Phân loại</th>
                    <th className="py-3 px-4">Tên đối tác & Liên hệ</th>
                    <th className="py-3 px-4">Chủ đề & Nội dung</th>
                    <th className="py-3 px-4 text-center">Hình thức</th>
                    <th className="py-3 px-4">Phản hồi / Hành động</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {communications
                    .filter((c) => {
                      const q = commSearch.toLowerCase();
                      const matchQ =
                        !commSearch ||
                        c.comm_code.toLowerCase().includes(q) ||
                        c.subject.toLowerCase().includes(q) ||
                        c.party_name.toLowerCase().includes(q) ||
                        c.content.toLowerCase().includes(q) ||
                        (c.contact_person && c.contact_person.toLowerCase().includes(q));
                      const matchDir = commDirectionFilter === "ALL" || c.direction === commDirectionFilter;
                      const matchStatus = commStatusFilter === "ALL" || c.status === commStatusFilter;
                      return matchQ && matchDir && matchStatus;
                    })
                    .map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 text-center text-xs text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900 text-xs">{c.comm_code}</div>
                          <div className="text-xs text-slate-500">{c.comm_date}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              c.direction === "INTERNAL"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            }`}
                          >
                            {c.direction === "INTERNAL" ? "Nội bộ" : "Bên ngoài"}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5 uppercase font-medium">{c.party_type}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{c.party_name}</div>
                          {(c.contact_person || c.contact_info) && (
                            <div className="text-xs text-slate-500">
                              {c.contact_person} {c.contact_info ? `(${c.contact_info})` : ""}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-medium text-slate-900 text-xs">{c.subject}</div>
                          <div className="text-xs text-slate-600 line-clamp-2 mt-0.5">{c.content}</div>
                        </td>
                        <td className="py-3 px-4 text-center text-xs font-medium text-slate-700">
                          <span className="inline-block bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {c.method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs max-w-xs">
                          {c.response_content ? (
                            <div className="text-emerald-700">
                              <span className="font-semibold">Phản hồi:</span> {c.response_content}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chưa phản hồi</span>
                          )}
                          {c.action_required && (
                            <div className="mt-1 text-rose-700 font-semibold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 inline" />
                              {c.action_details || "Cần xử lý"}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              c.status === "CLOSED"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : c.status === "IN_PROGRESS"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                            }`}
                          >
                            {c.status === "CLOSED" ? "Đã đóng" : c.status === "IN_PROGRESS" ? "Đang xử lý" : "Mở"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canEdit && (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={() => openEditComm(c)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => handleDeleteComm(c.id)}>
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
          )}
        </div>
      )}

      {/* MODAL: ADD/EDIT INTERESTED PARTY */}
      {partyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {editingParty ? "Cập nhật bên quan tâm" : "Thêm bên quan tâm mới"}
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
                {editingRisk ? "Cập nhật rủi ro bối cảnh" : "Ghi nhận rủi ro & cơ hội bối cảnh mới"}
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

      {/* MODAL: ADD/EDIT COMMUNICATIONS LOG */}
      {commModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {editingComm ? "Cập nhật trao đổi thông tin ATTP" : "Ghi nhận trao đổi thông tin ATTP mới"}
              </h3>
              <button onClick={() => setCommModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveComm} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã theo dõi *</label>
                  <Input
                    required
                    value={commForm.comm_code}
                    onChange={(e) => setCommForm({ ...commForm, comm_code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hướng thông tin *</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={commForm.direction}
                    onChange={(e) => setCommForm({ ...commForm, direction: e.target.value })}
                  >
                    <option value="EXTERNAL">Bên ngoài (External)</option>
                    <option value="INTERNAL">Nội bộ (Internal)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phân loại đối tượng *</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={commForm.party_type}
                    onChange={(e) => setCommForm({ ...commForm, party_type: e.target.value })}
                  >
                    <option value="CUSTOMER">Khách hàng (Customer)</option>
                    <option value="SUPPLIER">Nhà cung cấp (Supplier)</option>
                    <option value="AUTHORITY">Cơ quan thẩm quyền (Authority)</option>
                    <option value="EMPLOYEE">Cán bộ công nhân viên (Employee)</option>
                    <option value="COMMUNITY">Cộng đồng dân cư (Community)</option>
                    <option value="OTHER">Khác (Other)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tên cơ quan / Đối tác / Cá nhân *</label>
                  <Input
                    required
                    placeholder="Chi cục ATVSTP, Khách hàng..."
                    value={commForm.party_name}
                    onChange={(e) => setCommForm({ ...commForm, party_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Người / Thông tin liên hệ</label>
                  <Input
                    placeholder="SĐT, Email, Người đại diện..."
                    value={commForm.contact_person}
                    onChange={(e) => setCommForm({ ...commForm, contact_person: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chủ đề trao đổi *</label>
                <Input
                  required
                  placeholder="Kế hoạch thanh tra, phản hồi chất lượng, cảnh báo thu hồi..."
                  value={commForm.subject}
                  onChange={(e) => setCommForm({ ...commForm, subject: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung chi tiết *</label>
                <textarea
                  required
                  rows={3}
                  className="w-full border rounded-md p-2 text-xs"
                  placeholder="Nội dung cụ thể cuộc gọi, công văn, email hoặc biên bản làm việc..."
                  value={commForm.content}
                  onChange={(e) => setCommForm({ ...commForm, content: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hình thức tiếp nhận/gửi *</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={commForm.method}
                    onChange={(e) => setCommForm({ ...commForm, method: e.target.value })}
                  >
                    <option value="EMAIL">Email</option>
                    <option value="DISPATCH">Công văn / Văn bản</option>
                    <option value="MEETING">Họp trực tiếp</option>
                    <option value="HOTLINE">Hotline / Điện thoại</option>
                    <option value="INSPECTION">Đoàn thanh kiểm tra</option>
                    <option value="NOTICE">Thông báo nội bộ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày phát sinh *</label>
                  <Input
                    type="date"
                    required
                    value={commForm.comm_date}
                    onChange={(e) => setCommForm({ ...commForm, comm_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Người/Bộ phận phụ trách *</label>
                  <Input
                    required
                    value={commForm.responsible_person}
                    onChange={(e) => setCommForm({ ...commForm, responsible_person: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border rounded-lg space-y-3">
                <div className="font-semibold text-xs text-slate-700">Phản hồi & Hành động xử lý:</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung phản hồi / Giải quyết</label>
                    <textarea
                      rows={2}
                      className="w-full border rounded-md p-2 text-xs bg-white"
                      placeholder="Nội dung đã phản hồi hoặc xử lý cho đối tác..."
                      value={commForm.response_content}
                      onChange={(e) => setCommForm({ ...commForm, response_content: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày phản hồi</label>
                    <Input
                      type="date"
                      value={commForm.response_date}
                      onChange={(e) => setCommForm({ ...commForm, response_date: e.target.value })}
                      className="bg-white"
                    />
                    <div className="mt-3">
                      <label className="flex items-center gap-2 text-xs font-semibold text-rose-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={commForm.action_required}
                          onChange={(e) => setCommForm({ ...commForm, action_required: e.target.checked })}
                          className="rounded border-slate-300 text-rose-600 h-4 w-4"
                        />
                        Cần hành động khắc phục/CAPA
                      </label>
                    </div>
                  </div>
                </div>

                {commForm.action_required && (
                  <div>
                    <label className="block text-xs font-semibold text-rose-800 mb-1">Chi tiết hành động yêu cầu:</label>
                    <Input
                      placeholder="Mô tả hành động cần thực hiện, liên kết CAPA..."
                      value={commForm.action_details}
                      onChange={(e) => setCommForm({ ...commForm, action_details: e.target.value })}
                      className="bg-white border-rose-200"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái hồ sơ *</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={commForm.status}
                    onChange={(e) => setCommForm({ ...commForm, status: e.target.value })}
                  >
                    <option value="OPEN">Mở (Open - Đang chờ xử lý)</option>
                    <option value="IN_PROGRESS">Đang xử lý (In Progress)</option>
                    <option value="CLOSED">Đã đóng (Closed - Hoàn tất)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú thêm</label>
                  <Input
                    placeholder="Ghi chú hồ sơ lưu trữ..."
                    value={commForm.notes}
                    onChange={(e) => setCommForm({ ...commForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setCommModalOpen(false)}>
                  Hủy bỏ
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Lưu nhật ký
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT FOOD SAFETY TEAM MEMBER */}
      {fstModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {editingFst ? "Cập nhật thành viên Đội ATTP" : "Bổ nhiệm thành viên Đội ATTP"}
                </h3>
                <p className="text-xs text-slate-500">Căn cứ Quyết định 02/QĐ-ATTP-2026</p>
              </div>
              <button onClick={() => setFstModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFst} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên *</label>
                <Input
                  required
                  placeholder="Ví dụ: Trần Minh Hoàng"
                  value={fstForm.full_name}
                  onChange={(e) => setFstForm({ ...fstForm, full_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vai trò trong Đội (QĐ 02) *</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm font-semibold"
                    value={fstForm.role}
                    onChange={(e) => setFstForm({ ...fstForm, role: e.target.value })}
                  >
                    <option value="Đội trưởng">Đội trưởng (Team Leader)</option>
                    <option value="Đội phó">Đội phó (Vice Leader)</option>
                    <option value="Thư ký">Thư ký (Team Secretary)</option>
                    <option value="Đội viên">Đội viên (Team Member)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái bổ nhiệm *</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={fstForm.status}
                    onChange={(e) => setFstForm({ ...fstForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">Đang công tác (Active)</option>
                    <option value="INACTIVE">Miễn nhiệm (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phòng ban công tác *</label>
                  <Input
                    required
                    placeholder="Phòng QLCL, Phòng Sản xuất..."
                    value={fstForm.department}
                    onChange={(e) => setFstForm({ ...fstForm, department: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chức vụ chuyên môn *</label>
                  <Input
                    required
                    placeholder="Trưởng phòng, Kỹ sư, Giám sát..."
                    value={fstForm.job_title}
                    onChange={(e) => setFstForm({ ...fstForm, job_title: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số quyết định</label>
                  <Input
                    value={fstForm.decision_number}
                    onChange={(e) => setFstForm({ ...fstForm, decision_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày quyết định</label>
                  <Input
                    type="date"
                    value={fstForm.decision_date}
                    onChange={(e) => setFstForm({ ...fstForm, decision_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trình độ chuyên môn & Đào tạo ATTP</label>
                <Input
                  placeholder="Kỹ sư CNSH, Chứng chỉ HACCP/ISO 22000 Lead Auditor..."
                  value={fstForm.qualification}
                  onChange={(e) => setFstForm({ ...fstForm, qualification: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nhiệm vụ phân công trong Đội ATTP</label>
                <textarea
                  rows={3}
                  className="w-full border rounded-md p-2 text-xs"
                  placeholder="Chịu trách nhiệm phân tích mối nguy, giám sát điểm CCP, thẩm tra kế hoạch PRP..."
                  value={fstForm.responsibilities}
                  onChange={(e) => setFstForm({ ...fstForm, responsibilities: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <Input
                    placeholder="0908 xxx xxx"
                    value={fstForm.phone}
                    onChange={(e) => setFstForm({ ...fstForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <Input
                    type="email"
                    placeholder="email@company.com"
                    value={fstForm.email}
                    onChange={(e) => setFstForm({ ...fstForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setFstModalOpen(false)}>
                  Hủy bỏ
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Lưu thành viên
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ModuleGuideModal
        module="organization"
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />
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