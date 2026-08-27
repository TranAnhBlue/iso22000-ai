import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, AIBadge } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Flame,
  GitFork,
  BrainCircuit,
  Award,
  Layers,
  X,
  Calendar,
  Building2,
  User,
  Check,
  TrendingUp,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { WorkflowBuilder, type WorkflowTemplateData } from "@/components/builder/WorkflowBuilder";

export const Route = createFileRoute("/capa")({
  head: () => ({
    meta: [
      { title: "CAPA & Xử Lý Sự Không Phù Hợp – WCERT ISO 22000:2018" },
      { name: "description", content: "Hệ thống quản lý sự không phù hợp (NC), phân tích 5-Why, sơ đồ xương cá Ishikawa và thẩm tra hiệu lực CAPA theo ISO 22000 Điều khoản 8.9 & 10.1." },
      { property: "og:title", content: "CAPA & Xử Lý Sự Không Phù Hợp – WCERT ISO 22000:2018" },
      { property: "og:description", content: "Quy trình 5 bước CAPA chuẩn ISO 22000 với Trợ lý AI phân tích nguyên nhân gốc rễ và thẩm tra sau 30 ngày." },
    ],
  }),
  component: () => (
    <AppShell module="capa">
      <CAPAManagementPage />
    </AppShell>
  ),
});

// ==================== INTERFACES ====================
interface NonConformance {
  nc_id: string;
  nc_number: string;
  title: string;
  source: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  occurred_date: string;
  occurred_location?: string;
  description: string;
  immediate_action?: string;
  affected_lot_number?: string;
  affected_quantity?: string;
  reported_by_name?: string;
  status: "NEW" | "INVESTIGATING" | "ACTION_REQUIRED" | "UNDER_REVIEW" | "CLOSED" | "REJECTED";
  created_at?: string;
  capa_count?: number;
}

interface CAPARecord {
  capa_id: string;
  capa_number: string;
  nc_id: string;
  title: string;
  root_cause_method: "5_WHYS" | "FISHBONE_5M" | "OTHER";
  root_cause_analysis?: any;
  root_cause_summary?: string;
  corrective_action: string;
  preventive_action?: string;
  assigned_to_name?: string;
  assigned_dept?: string;
  target_date: string;
  completed_date?: string;
  verified_by_name?: string;
  verification_date?: string;
  verification_result?: string;
  verification_status: "PENDING_VERIFY" | "EFFECTIVE" | "INEFFECTIVE";
  status: "DRAFT" | "IN_PROGRESS" | "PENDING_VERIFICATION" | "COMPLETED" | "OVERDUE";
  evidence_urls?: string[];
  nc_number?: string;
  nc_title?: string;
  nc_severity?: string;
  created_at?: string;
}

interface CAPAStats {
  total_ncs: number;
  critical_ncs: number;
  open_ncs: number;
  closed_ncs: number;
  total_capas: number;
  in_progress_capas: number;
  pending_verify_capas: number;
  completed_capas: number;
  overdue_capas: number;
  effectiveness_rate: number;
}

// ==================== MAIN COMPONENT ====================
function CAPAManagementPage() {
  const [activeTab, setActiveTab] = useState<"ncs" | "capas" | "ai_studio" | "verification">("ncs");
  const [stats, setStats] = useState<CAPAStats>({
    total_ncs: 0,
    critical_ncs: 0,
    open_ncs: 0,
    closed_ncs: 0,
    total_capas: 0,
    in_progress_capas: 0,
    pending_verify_capas: 0,
    completed_capas: 0,
    overdue_capas: 0,
    effectiveness_rate: 100.0,
  });

  const [ncs, setNcs] = useState<NonConformance[]>([]);
  const [capas, setCapas] = useState<CAPARecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [showNCModal, setShowNCModal] = useState(false);
  const [editingNC, setEditingNC] = useState<NonConformance | null>(null);

  const [showCAPAModal, setShowCAPAModal] = useState(false);
  const [editingCAPA, setEditingCAPA] = useState<CAPARecord | null>(null);
  const [selectedNCForCAPA, setSelectedNCForCAPA] = useState<NonConformance | null>(null);

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyingCAPA, setVerifyingCAPA] = useState<CAPARecord | null>(null);
  const [verificationForm, setVerificationForm] = useState({
    verified_by_name: "Trưởng Ban QLCL & ATTP",
    verification_result: "",
    verification_status: "EFFECTIVE",
  });

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printingCAPA, setPrintingCAPA] = useState<CAPARecord | null>(null);

  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [workflowTemplate, setWorkflowTemplate] = useState<WorkflowTemplateData | null>(null);

  // AI Studio State
  const [aiSelectedNCId, setAiSelectedNCId] = useState<string>("");
  const [aiCustomTitle, setAiCustomTitle] = useState("");
  const [aiCustomDesc, setAiCustomDesc] = useState("");
  const [aiMethod, setAiMethod] = useState<"5_WHYS" | "FISHBONE_5M">("5_WHYS");
  const [ai5WhyResult, setAi5WhyResult] = useState<any>(null);
  const [aiFishboneResult, setAiFishboneResult] = useState<any>(null);
  const [aiSuggestResult, setAiSuggestResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Load Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, ncsRes, capasRes] = await Promise.all([
        api.get("/capa/stats"),
        api.get("/capa/ncs"),
        api.get("/capa/records"),
      ]);
      setStats(statsRes.data);
      setNcs(ncsRes.data);
      setCapas(capasRes.data);
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu CAPA:", err);
      toast.error("Không thể tải danh sách sự cố & CAPA: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered lists
  const filteredNCs = ncs.filter((n) => {
    const matchSearch =
      !searchQuery ||
      n.nc_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.affected_lot_number && n.affected_lot_number.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchSource = sourceFilter === "ALL" || n.source === sourceFilter;
    const matchSeverity = severityFilter === "ALL" || n.severity === severityFilter;
    const matchStatus = statusFilter === "ALL" || n.status === statusFilter;
    return matchSearch && matchSource && matchSeverity && matchStatus;
  });

  // Open Workflow Studio
  const handleOpenWorkflow = async () => {
    try {
      const res = await api.get("/builders/workflows");
      const found = res.data.find((w: any) => w.code === "WF-CAPA-5STEPS" || w.module === "CAPA");
      if (found) {
        setWorkflowTemplate(found);
      } else {
        setWorkflowTemplate({
          module: "CAPA",
          code: "WF-CAPA-5STEPS",
          title: "Quy Trình Xử Lý Sự Không Phù Hợp & Khắc Phục CAPA (ISO 8.9 & 10.1)",
          description: "Chu trình 5 bước xử lý triệt để sự không phù hợp: Nhận diện & Báo cáo -> Cách ly sản phẩm -> Phân tích 5-Why -> Triển khai khắc phục -> Thẩm tra hiệu lực.",
          version: "1.0",
          nodes: [
            { id: "c_1", type: "process", label: "1. Nhận diện & Lập Báo cáo NC", role: "Người phát hiện / QC", description: "Ghi nhận sự cố phát sinh tại hiện trường sản xuất hoặc kho.", is_ccp: false, step_number: 1 },
            { id: "c_2", type: "approval", label: "2. Cô lập Lô hàng & Khắc phục tức thì", role: "Trưởng ca & Đội trưởng ATTP", description: "Dán nhãn biệt trữ cách ly lô hàng nghi ngờ, ngăn ngừa xuất xưởng.", is_ccp: false, step_number: 2 },
            { id: "c_3", type: "process", label: "3. Phân tích Nguyên nhân Gốc rễ (5-Why)", role: "Tổ Công tác Điều tra CAPA", description: "Họp tìm nguyên nhân cốt lõi (Con người, Thiết bị, Phương pháp, Môi trường).", is_ccp: false, step_number: 3 },
            { id: "c_4", type: "process", label: "4. Lập & Triển khai Biện pháp Khắc phục", role: "Bộ phận liên quan", description: "Thực hiện hành động sửa chữa và phòng ngừa tái diễn.", is_ccp: false, step_number: 4 },
            { id: "c_5", type: "approval", label: "5. Thẩm tra Hiệu lực & Đóng phiếu CAPA", role: "Ban QLCL & ATTP (QA Lead)", description: "Đánh giá lại sau 30 ngày, xác nhận lỗi không tái diễn và đóng NC.", is_ccp: false, step_number: 5 },
          ],
          edges: [
            { id: "ec1_2", source: "c_1", target: "c_2", label: "Báo cáo NC" },
            { id: "ec2_3", source: "c_2", target: "c_3", label: "Đã cô lập" },
            { id: "ec3_4", source: "c_3", target: "c_4", label: "Xác định Root Cause" },
            { id: "ec4_5", source: "c_4", target: "c_5", label: "Hoàn tất khắc phục" },
          ],
          status: "ACTIVE",
        });
      }
      setShowWorkflowModal(true);
    } catch (err) {
      toast.error("Không thể tải lưu đồ quy trình CAPA");
    }
  };

  // Seed sample data
  const handleSeedDefaults = async () => {
    try {
      const res = await api.post("/capa/seed-defaults");
      toast.success(res.data.message || "Đã nạp 5 kịch bản mẫu thành công!");
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi nạp dữ liệu mẫu: " + (err.response?.data?.detail || err.message));
    }
  };

  // Run AI Analysis
  const handleRunAIAnalysis = async () => {
    let targetTitle = aiCustomTitle.trim();
    let targetDesc = aiCustomDesc.trim();
    let targetSource = "HACCP_CCP";

    if (aiSelectedNCId) {
      const selected = ncs.find((n) => n.nc_id === aiSelectedNCId);
      if (selected) {
        targetTitle = selected.title;
        targetDesc = selected.description;
        targetSource = selected.source;
      }
    }

    if (!targetTitle) {
      toast.error("Vui lòng chọn 1 Sự cố NC hoặc nhập tiêu đề sự cố");
      return;
    }

    try {
      setAiLoading(true);
      if (aiMethod === "5_WHYS") {
        const res = await api.post("/capa/ai/analyze-5why", {
          nc_title: targetTitle,
          description: targetDesc || targetTitle,
          source: targetSource,
        });
        setAi5WhyResult(res.data);
      } else {
        const res = await api.post("/capa/ai/analyze-fishbone", {
          nc_title: targetTitle,
          description: targetDesc || targetTitle,
        });
        setAiFishboneResult(res.data);
      }

      // Also get suggested actions
      const actRes = await api.post("/capa/ai/suggest-actions", {
        nc_title: targetTitle,
        root_cause: targetTitle,
      });
      setAiSuggestResult(actRes.data);
      toast.success("Trợ lý AI đã hoàn tất phân tích nguyên nhân gốc rễ!");
    } catch (err: any) {
      toast.error("Lỗi phân tích AI: " + (err.response?.data?.detail || err.message));
    } finally {
      setAiLoading(false);
    }
  };

  // Save new / edit NC
  const handleSaveNC = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      nc_number: fd.get("nc_number") as string,
      title: fd.get("title") as string,
      source: fd.get("source") as string,
      severity: fd.get("severity") as string,
      occurred_date: fd.get("occurred_date") as string,
      occurred_location: (fd.get("occurred_location") as string) || null,
      description: fd.get("description") as string,
      immediate_action: (fd.get("immediate_action") as string) || null,
      affected_lot_number: (fd.get("affected_lot_number") as string) || null,
      affected_quantity: (fd.get("affected_quantity") as string) || null,
      reported_by_name: (fd.get("reported_by_name") as string) || "KCS Ca sản xuất",
      status: (fd.get("status") as string) || "NEW",
    };

    try {
      if (editingNC) {
        await api.put(`/capa/ncs/${editingNC.nc_id}`, payload);
        toast.success("Đã cập nhật sự không phù hợp thành công!");
      } else {
        await api.post("/capa/ncs", payload);
        toast.success("Đã ghi nhận sự không phù hợp mới thành công!");
      }
      setShowNCModal(false);
      setEditingNC(null);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi lưu NC: " + (err.response?.data?.detail || err.message));
    }
  };

  // Save new / edit CAPA
  const handleSaveCAPA = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      capa_number: fd.get("capa_number") as string,
      nc_id: (fd.get("nc_id") as string) || (selectedNCForCAPA?.nc_id as string) || (editingCAPA?.nc_id as string),
      title: fd.get("title") as string,
      root_cause_method: fd.get("root_cause_method") as string,
      root_cause_summary: (fd.get("root_cause_summary") as string) || null,
      corrective_action: fd.get("corrective_action") as string,
      preventive_action: (fd.get("preventive_action") as string) || null,
      assigned_to_name: (fd.get("assigned_to_name") as string) || "Trưởng bộ phận",
      assigned_dept: (fd.get("assigned_dept") as string) || "Phòng Sản xuất",
      target_date: fd.get("target_date") as string,
      status: (fd.get("status") as string) || "IN_PROGRESS",
    };

    try {
      if (editingCAPA) {
        await api.put(`/capa/records/${editingCAPA.capa_id}`, payload);
        toast.success("Đã cập nhật kế hoạch CAPA thành công!");
      } else {
        await api.post("/capa/records", payload);
        toast.success("Đã khởi tạo kế hoạch CAPA thành công!");
      }
      setShowCAPAModal(false);
      setEditingCAPA(null);
      setSelectedNCForCAPA(null);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi lưu CAPA: " + (err.response?.data?.detail || err.message));
    }
  };

  // Submit Verification
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingCAPA) return;

    if (!verificationForm.verification_result.trim()) {
      toast.error("Vui lòng nhập nội dung kết luận thẩm tra hiệu lực");
      return;
    }

    try {
      await api.post(`/capa/records/${verifyingCAPA.capa_id}/verify`, verificationForm);
      toast.success(
        verificationForm.verification_status === "EFFECTIVE"
          ? "Đã thẩm tra đạt hiệu lực và đóng hồ sơ thành công!"
          : "Đã ghi nhận không hiệu lực, tái mở yêu cầu khắc phục!"
      );
      setShowVerifyModal(false);
      setVerifyingCAPA(null);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi thẩm tra CAPA: " + (err.response?.data?.detail || err.message));
    }
  };

  // Helper colors & labels
  const getSeverityBadge = (s: string) => {
    switch (s) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
            <Flame className="h-3.5 w-3.5 text-rose-600 shrink-0" />
            Nghiêm Trọng (Critical)
          </span>
        );
      case "MAJOR":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            Nặng (Major)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300 shadow-xs">
            <ShieldAlert className="h-3.5 w-3.5 text-sky-600 shrink-0" />
            Nhẹ (Minor)
          </span>
        );
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "NEW":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">Mới Phát Hiện</span>;
      case "ACTION_REQUIRED":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">Cần Khắc Phục</span>;
      case "INVESTIGATING":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">Đang Điều Tra</span>;
      case "UNDER_REVIEW":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">Đang Thẩm Định</span>;
      case "CLOSED":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Đã Đóng Hồ Sơ</span>;
      case "REJECTED":
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">Từ Chối</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">{s}</span>;
    }
  };

  const getSourceLabel = (src: string) => {
    switch (src) {
      case "HACCP_CCP": return "Điểm tới hạn HACCP/CCP";
      case "PRP_GMP": return "Chương trình Tiên quyết PRP/GMP";
      case "IQC_INCOMING": return "Kiểm tra nguyên liệu IQC";
      case "INTERNAL_AUDIT": return "Đánh giá nội bộ kỳ 1";
      case "CUSTOMER_COMPLAINT": return "Khiếu nại khách hàng";
      case "EQUIPMENT_FAIL": return "Sự cố thiết bị";
      default: return src;
    }
  };

  return (
    <div className="space-y-6">
      {/* ==================== HEADER ==================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Sự Không Phù Hợp & Khắc Phục (CAPA)
            </h1>
            <span className="px-3 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full">
              ISO 22000:2018 (8.9 & 10.1)
            </span>
          </div>
          <p className="text-slate-600 text-sm mt-1.5 font-normal">
            Ghi nhận NC hiện trường, cô lập tức thì, truy vết nguyên nhân gốc rễ 5-Why/Fishbone và thẩm tra hiệu lực sau 30 ngày.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenWorkflow}
            className="border-purple-300 text-purple-800 bg-purple-50 hover:bg-purple-100 flex items-center gap-2 font-semibold text-sm h-10 px-4 shadow-xs"
          >
            <GitFork className="h-4 w-4 text-purple-600" />
            <span>Lưu Đồ Quy Trình CAPA (5 Bước)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedDefaults}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 text-sm h-10 px-3.5"
          >
            <RefreshCw className="h-4 w-4 text-slate-500" />
            <span>Nạp 5 Ca Mẫu</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingNC(null);
              setShowNCModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 font-bold text-sm h-10 px-4 shadow-md transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Báo Cáo Sự Cố (NC Mới)</span>
          </Button>
        </div>
      </div>

      <AIBadge>
        <b>Trợ lý AI CAPA Studio:</b> Tự động truy vết nguyên nhân gốc rễ bằng phương pháp <b>5-Why</b> hoặc <b>Sơ đồ xương cá Ishikawa 5M+1E</b> · Đề xuất hành động khắc phục tức thì (8.9.2), ngăn ngừa tái diễn (8.9.3) và thiết lập cơ chế thẩm tra sau 30 ngày.
      </AIBadge>

      {/* ==================== 4 KPI STATS CARDS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng NC */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Sự Cố Không Phù Hợp</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.total_ncs}</h3>
            <div className="flex items-center gap-2 mt-2 text-xs font-medium">
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{stats.open_ncs} Đang mở</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{stats.closed_ncs} Đã đóng</span>
            </div>
          </div>
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <AlertTriangle className="h-7 w-7" />
          </div>
        </div>

        {/* KPI 2: Sự cố Nghiêm trọng (Critical) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sự Cố Nghiêm Trọng (CCP)</p>
            <h3 className="text-3xl font-black text-rose-600 mt-1">{stats.critical_ncs}</h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              <Flame className="h-3.5 w-3.5 text-rose-600" />
              <span>Yêu cầu cô lập & báo cáo khẩn</span>
            </div>
          </div>
          <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
            <ShieldAlert className="h-7 w-7" />
          </div>
        </div>

        {/* KPI 3: Kế hoạch CAPA Đang Xử Lý */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kế Hoạch CAPA Đang Xử Lý</p>
            <h3 className="text-3xl font-black text-amber-600 mt-1">{stats.in_progress_capas + stats.pending_verify_capas}</h3>
            <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              <span>{stats.pending_verify_capas} Chờ thẩm tra 30 ngày</span>
            </div>
          </div>
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
            <Clock className="h-7 w-7" />
          </div>
        </div>

        {/* KPI 4: Tỷ Lệ Hiệu Lực Sau 30 Ngày */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tỷ Lệ Thẩm Tra Đạt Hiệu Lực</p>
            <h3 className="text-3xl font-black text-emerald-600 mt-1">{stats.effectiveness_rate}%</h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>{stats.completed_capas} Kế hoạch hoàn tất đóng NC</span>
            </div>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <Award className="h-7 w-7" />
          </div>
        </div>
      </div>

      {/* ==================== 4 TABS NAVIGATION ==================== */}
      <div className="border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-3 flex flex-wrap gap-2 shadow-xs">
        <button
          onClick={() => setActiveTab("ncs")}
          className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "ncs"
              ? "border-emerald-600 text-emerald-800 bg-emerald-50/70 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>1. Danh Sách Sự Cố NC ({ncs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("capas")}
          className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "capas"
              ? "border-emerald-600 text-emerald-800 bg-emerald-50/70 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <FileText className="h-4 w-4 text-blue-500" />
          <span>2. Quản Lý Kế Hoạch CAPA ({capas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ai_studio")}
          className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "ai_studio"
              ? "border-emerald-600 text-emerald-800 bg-emerald-50/70 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <BrainCircuit className="h-4 w-4 text-purple-600" />
          <span>3. AI 5-Why & Fishbone Studio</span>
          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-purple-200 text-purple-800 rounded-full">AI</span>
        </button>

        <button
          onClick={() => setActiveTab("verification")}
          className={`px-5 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "verification"
              ? "border-emerald-600 text-emerald-800 bg-emerald-50/70 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>4. Thẩm Tra 30 Ngày & Đóng Hồ Sơ ({capas.filter((c) => c.status === "PENDING_VERIFICATION").length})</span>
        </button>
      </div>

      {/* ==================== TAB 1: NON-CONFORMANCES (NC) ==================== */}
      {activeTab === "ncs" && (
        <div className="bg-white rounded-b-2xl border border-slate-200 border-t-0 p-6 space-y-5">
          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm mã NC, tiêu đề sự cố, số lô hàng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white text-sm h-10 border-slate-300 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="h-10 px-3.5 text-sm font-medium bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Tất cả nguồn phát sinh</option>
                <option value="HACCP_CCP">Điểm tới hạn CCP</option>
                <option value="PRP_GMP">Chương trình PRP/GMP</option>
                <option value="IQC_INCOMING">Nguyên liệu đầu vào IQC</option>
                <option value="INTERNAL_AUDIT">Đánh giá nội bộ</option>
                <option value="CUSTOMER_COMPLAINT">Khiếu nại khách hàng</option>
                <option value="EQUIPMENT_FAIL">Sự cố thiết bị</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="h-10 px-3.5 text-sm font-medium bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Tất cả mức độ</option>
                <option value="CRITICAL">Nghiêm trọng (Critical)</option>
                <option value="MAJOR">Nặng (Major)</option>
                <option value="MINOR">Nhẹ (Minor)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3.5 text-sm font-medium bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="NEW">Mới phát hiện</option>
                <option value="ACTION_REQUIRED">Cần khắc phục</option>
                <option value="INVESTIGATING">Đang điều tra</option>
                <option value="CLOSED">Đã đóng hồ sơ</option>
              </select>
            </div>
          </div>

          {/* NC Table */}
          {loading ? (
            <div className="text-center py-16 text-slate-500 text-sm font-medium">Đang tải danh sách sự không phù hợp...</div>
          ) : filteredNCs.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2.5 opacity-60" />
              <p className="text-slate-800 font-bold text-base">Không tìm thấy sự không phù hợp nào</p>
              <p className="text-slate-500 text-sm mt-1">Hệ thống đang vận hành an toàn hoặc chưa có dữ liệu lọc phù hợp.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
              <table className="w-full text-left text-sm border-collapse min-w-[1300px]">
                <thead className="bg-slate-100 text-slate-800 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-4 min-w-[140px]">Mã Phiếu NC</th>
                    <th className="py-4 px-4 min-w-[280px]">Tiêu Đề & Vị Trí Xảy Ra</th>
                    <th className="py-4 px-4 min-w-[200px]">Nguồn Phát Sinh</th>
                    <th className="py-4 px-4 min-w-[170px]">Mức Độ Rủi Ro</th>
                    <th className="py-4 px-4 min-w-[340px]">Khắc Phục Tức Thì (ISO 8.9.2)</th>
                    <th className="py-4 px-4 min-w-[180px]">Lô Hàng Ảnh Hưởng</th>
                    <th className="py-4 px-4 min-w-[150px]">Trạng Thái</th>
                    <th className="py-4 px-4 text-right min-w-[220px]">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredNCs.map((nc) => (
                    <tr key={nc.nc_id} className="hover:bg-slate-50 transition-colors">
                      {/* Mã phiếu & ngày */}
                      <td className="py-4 px-4 align-top">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-xs inline-block shadow-xs">
                          {nc.nc_number}
                        </span>
                        <div className="text-xs text-slate-500 font-medium mt-1.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{nc.occurred_date}</span>
                        </div>
                      </td>

                      {/* Tiêu đề & vị trí */}
                      <td className="py-4 px-4 align-top">
                        <p className="font-bold text-slate-900 text-sm leading-snug">{nc.title}</p>
                        {nc.occurred_location && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{nc.occurred_location}</span>
                          </div>
                        )}
                      </td>

                      {/* Nguồn */}
                      <td className="py-4 px-4 align-top">
                        <span className="font-bold text-slate-800 text-xs block">{getSourceLabel(nc.source)}</span>
                        <div className="text-xs text-slate-500 mt-1">
                          Bởi: <span className="font-semibold text-slate-700">{nc.reported_by_name}</span>
                        </div>
                      </td>

                      {/* Mức độ */}
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        {getSeverityBadge(nc.severity)}
                      </td>

                      {/* Khắc phục tức thì (Full text, không bị cắt chữ) */}
                      <td className="py-4 px-4 align-top">
                        <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 text-xs text-slate-800 leading-relaxed font-medium shadow-2xs">
                          {nc.immediate_action || "Chưa ghi nhận biện pháp tức thì"}
                        </div>
                      </td>

                      {/* Lô hàng */}
                      <td className="py-4 px-4 align-top">
                        {nc.affected_lot_number ? (
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs inline-block">
                              {nc.affected_lot_number}
                            </span>
                            {nc.affected_quantity && (
                              <div className="text-xs text-slate-600 font-semibold">{nc.affected_quantity}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Không có</span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-4 px-4 align-top whitespace-nowrap">
                        {getStatusBadge(nc.status)}
                      </td>

                      {/* Thao tác */}
                      <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedNCForCAPA(nc);
                              setEditingCAPA(null);
                              setShowCAPAModal(true);
                            }}
                            className="h-8 text-xs px-2.5 text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 font-bold flex items-center gap-1 shadow-xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Tạo CAPA</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAiSelectedNCId(nc.nc_id);
                              setActiveTab("ai_studio");
                            }}
                            className="h-8 text-xs px-2.5 text-purple-700 hover:bg-purple-100 font-bold flex items-center gap-1"
                            title="Phân tích AI 5-Why"
                          >
                            <BrainCircuit className="h-3.5 w-3.5" />
                            <span>AI Studio</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingNC(nc);
                              setShowNCModal(true);
                            }}
                            className="h-8 text-xs px-2 text-slate-700 hover:bg-slate-200 font-semibold"
                          >
                            Sửa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: CAPA RECORDS ==================== */}
      {activeTab === "capas" && (
        <div className="bg-white rounded-b-2xl border border-slate-200 border-t-0 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">Hồ Sơ Hành Động Khắc Phục & Phòng Ngừa (CAPA Records)</h3>
            <span className="text-xs font-semibold text-slate-500">Tổng cộng {capas.length} kế hoạch CAPA</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {capas.map((c) => (
              <div
                key={c.capa_id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm p-6 space-y-4 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                          {c.capa_number}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">• NC: {c.nc_number || "NC-2026"}</span>
                        {c.verification_status === "EFFECTIVE" && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Đạt Hiệu Lực
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-base mt-2 leading-snug">{c.title}</h4>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                      c.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                      c.status === "PENDING_VERIFICATION" ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {c.status === "COMPLETED" ? "Hoàn Thành" : c.status === "PENDING_VERIFICATION" ? "Chờ Thẩm Tra 30 Ngày" : "Đang Triển Khai"}
                    </span>
                  </div>

                  {/* Root Cause Summary */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600 font-bold">
                      <span className="flex items-center gap-1.5">
                        <BrainCircuit className="h-4 w-4 text-purple-600" />
                        Nguyên nhân cốt lõi ({c.root_cause_method === "5_WHYS" ? "5-Why" : "Ishikawa 5M"}):
                      </span>
                    </div>
                    <p className="text-slate-900 font-medium leading-relaxed">{c.root_cause_summary || "Đang phân tích"}</p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                        <Check className="h-4 w-4 text-emerald-600" />
                        Hành động khắc phục (Corrective Action):
                      </span>
                      <p className="text-slate-800 mt-1 pl-5 text-xs leading-relaxed font-medium bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                        {c.corrective_action}
                      </p>
                    </div>

                    {c.preventive_action && (
                      <div>
                        <span className="font-bold text-blue-800 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                          <ShieldCheck className="h-4 w-4 text-blue-600" />
                          Biện pháp phòng ngừa (Preventive Action):
                        </span>
                        <p className="text-slate-800 mt-1 pl-5 text-xs leading-relaxed font-medium bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                          {c.preventive_action}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Info */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-3 font-medium">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <b>{c.assigned_to_name}</b> ({c.assigned_dept})
                    </span>
                    <span className="flex items-center gap-1 text-slate-700 font-bold">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      Hạn: {c.target_date}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPrintingCAPA(c);
                        setShowPrintModal(true);
                      }}
                      className="h-8 text-xs px-3 text-slate-700 border-slate-300 hover:bg-slate-100 font-bold flex items-center gap-1.5"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-500" />
                      <span>In BM-CAPA-01</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCAPA(c);
                        setShowCAPAModal(true);
                      }}
                      className="h-8 text-xs px-3 text-slate-700 hover:bg-slate-100 font-medium"
                    >
                      Sửa
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: AI 5-WHY & FISHBONE STUDIO ==================== */}
      {activeTab === "ai_studio" && (
        <div className="bg-white rounded-b-2xl border border-slate-200 border-t-0 p-6 space-y-6">
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 p-6 rounded-2xl border border-purple-200 space-y-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-md">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Trợ Lý AI Phân Tích Nguyên Nhân Gốc Rễ (Root Cause Studio)</h3>
                <p className="text-slate-600 text-sm mt-0.5">
                  Áp dụng các kỹ thuật chất lượng ISO 22000: 5-Whys liên hoàn & Sơ đồ xương cá Ishikawa 5M+1E để tìm điểm nghẽn hệ thống.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Chọn NC có sẵn */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">1. Chọn Sự Cố Không Phù Hợp (NC):</label>
                <select
                  value={aiSelectedNCId}
                  onChange={(e) => {
                    setAiSelectedNCId(e.target.value);
                    const sel = ncs.find((n) => n.nc_id === e.target.value);
                    if (sel) {
                      setAiCustomTitle(sel.title);
                      setAiCustomDesc(sel.description);
                    }
                  }}
                  className="w-full text-xs h-10 bg-white border border-purple-300 rounded-lg px-3 text-slate-800 font-medium focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Chọn sự cố từ danh sách --</option>
                  {ncs.map((n) => (
                    <option key={n.nc_id} value={n.nc_id}>
                      [{n.nc_number}] {n.title.substring(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              {/* Hoặc nhập tiêu đề */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Hoặc Nhập Tiêu Đề Sự Cố Tùy Chỉnh:</label>
                <Input
                  placeholder="Ví dụ: Nhiệt độ nồi hấp thanh trùng bị tụt..."
                  value={aiCustomTitle}
                  onChange={(e) => {
                    setAiCustomTitle(e.target.value);
                    setAiSelectedNCId("");
                  }}
                  className="text-xs h-10 bg-white border-purple-300 font-medium"
                />
              </div>

              {/* Chọn phương pháp */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">2. Phương Pháp Phân Tích:</label>
                <div className="flex items-center gap-2">
                  <select
                    value={aiMethod}
                    onChange={(e) => setAiMethod(e.target.value as any)}
                    className="w-full text-xs h-10 bg-white border border-purple-300 rounded-lg px-3 text-slate-800 font-bold focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="5_WHYS">5-Why Analysis (Truy vết 5 bước)</option>
                    <option value="FISHBONE_5M">Sơ đồ xương cá Ishikawa (5M+1E)</option>
                  </select>

                  <Button
                    onClick={handleRunAIAnalysis}
                    disabled={aiLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm h-10 px-5 shrink-0 font-bold shadow-md flex items-center gap-1.5"
                  >
                    {aiLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    <span>{aiLoading ? "Đang Phân Tích..." : "Chạy AI"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Result View: 5-Whys */}
          {aiMethod === "5_WHYS" && ai5WhyResult && (
            <div className="space-y-4">
              <div className="border border-purple-200 rounded-2xl bg-white p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-purple-600" />
                    Chuỗi Phân Tích 5-Why (Truy vết nguyên nhân sâu xa)
                  </h4>
                  <span className="text-xs text-purple-800 font-bold bg-purple-100 px-3 py-1 rounded-full border border-purple-300">
                    5 Cấp Độ Câu Hỏi
                  </span>
                </div>

                <div className="space-y-3">
                  {ai5WhyResult.whys.map((w: any) => (
                    <div
                      key={w.level}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 flex items-start gap-3.5 transition-colors"
                    >
                      <span className="h-7 w-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {w.level}
                      </span>
                      <div className="space-y-1.5 text-xs w-full">
                        <p className="font-bold text-slate-900 text-sm">{w.question}</p>
                        <p className="text-slate-800 text-xs leading-relaxed pl-3 border-l-2 border-purple-400 bg-white p-2.5 rounded font-medium">
                          {w.answer}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Root cause conclusion box */}
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
                  <h5 className="font-bold text-purple-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-purple-700" />
                    Kết Luận Nguyên Nhân Cốt Lõi (Root Cause):
                  </h5>
                  <p className="text-sm font-bold text-purple-950 leading-relaxed">
                    {ai5WhyResult.root_cause_conclusion}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* AI Result View: Fishbone 5M+1E */}
          {aiMethod === "FISHBONE_5M" && aiFishboneResult && (
            <div className="border border-indigo-200 rounded-2xl bg-white p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-600" />
                    Sơ Đồ Xương Cá Ishikawa 5M+1E (Cause and Effect Diagram)
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Vấn đề: {aiFishboneResult.problem_statement}</p>
                </div>
                <span className="text-xs text-indigo-800 font-bold bg-indigo-100 px-3 py-1 rounded-full border border-indigo-300">
                  6 Chi Nhánh Đa Chiều
                </span>
              </div>

              {/* 6 Grid Fishbone Branches */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Man */}
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2 text-xs">
                  <span className="font-bold text-rose-800 flex items-center gap-1.5 text-sm">
                    <User className="h-4 w-4 text-rose-600" /> 1. Con người (Man)
                  </span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-800 font-medium">
                    {aiFishboneResult.man.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* 2. Machine */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2 text-xs">
                  <span className="font-bold text-blue-800 flex items-center gap-1.5 text-sm">
                    <Building2 className="h-4 w-4 text-blue-600" /> 2. Máy móc (Machine)
                  </span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-800 font-medium">
                    {aiFishboneResult.machine.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* 3. Material */}
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2 text-xs">
                  <span className="font-bold text-amber-800 flex items-center gap-1.5 text-sm">
                    <FileText className="h-4 w-4 text-amber-600" /> 3. Nguyên vật liệu (Material)
                  </span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-800 font-medium">
                    {aiFishboneResult.material.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* 4. Method */}
                <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-2 text-xs">
                  <span className="font-bold text-purple-800 flex items-center gap-1.5 text-sm">
                    <BrainCircuit className="h-4 w-4 text-purple-600" /> 4. Phương pháp (Method)
                  </span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-800 font-medium">
                    {aiFishboneResult.method.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* 5. Measurement */}
                <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 space-y-2 text-xs">
                  <span className="font-bold text-teal-800 flex items-center gap-1.5 text-sm">
                    <TrendingUp className="h-4 w-4 text-teal-600" /> 5. Đo lường (Measurement)
                  </span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-800 font-medium">
                    {aiFishboneResult.measurement.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* 6. Environment */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2 text-xs">
                  <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-sm">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> 6. Môi trường (Environment)
                  </span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-800 font-medium">
                    {aiFishboneResult.environment.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1.5">
                <h5 className="font-bold text-indigo-900 text-xs uppercase tracking-wide">Nguyên nhân cốt lõi xác định & Đề xuất CAPA:</h5>
                <p className="text-sm font-bold text-indigo-950">{aiFishboneResult.primary_root_cause}</p>
                <p className="text-xs text-indigo-800 mt-1 font-medium">{aiFishboneResult.suggested_capa}</p>
              </div>
            </div>
          )}

          {/* AI Suggested Actions Card */}
          {aiSuggestResult && (
            <div className="border border-emerald-200 rounded-2xl bg-white p-6 space-y-4 shadow-sm">
              <h4 className="font-extrabold text-emerald-900 text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Đề Xuất Hành Động Khắc Phục & Phòng Ngừa Chuẩn ISO 22000:2018
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* 1. Containment */}
                <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200 space-y-2">
                  <span className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" /> Khắc phục tức thì (8.9.2)
                  </span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-800 font-medium">
                    {aiSuggestResult.immediate_containment.map((act: string, idx: number) => (
                      <li key={idx}>{act}</li>
                    ))}
                  </ul>
                </div>

                {/* 2. Corrective */}
                <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 space-y-2">
                  <span className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Hành động khắc phục (8.9.3)
                  </span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-800 font-medium">
                    {aiSuggestResult.corrective_actions.map((act: string, idx: number) => (
                      <li key={idx}>{act}</li>
                    ))}
                  </ul>
                </div>

                {/* 3. Preventive */}
                <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-200 space-y-2">
                  <span className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-blue-600" /> Phòng ngừa tái diễn (10.1)
                  </span>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-800 font-medium">
                    {aiSuggestResult.preventive_actions.map((act: string, idx: number) => (
                      <li key={idx}>{act}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">Kế hoạch thẩm tra sau 30 ngày: </span>
                  <span className="text-slate-600 font-medium">{aiSuggestResult.verification_method_30days}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 4: 30-DAY VERIFICATION & CLOSURE ==================== */}
      {activeTab === "verification" && (
        <div className="bg-white rounded-b-2xl border border-slate-200 border-t-0 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Thẩm Tra Hiệu Lực Sau 15 - 30 Ngày & Đóng Hồ Sơ NC</h3>
              <p className="text-slate-600 text-sm mt-0.5">
                Theo ISO 22000 Điều khoản 10.1: Phải xem xét và thẩm tra bằng chứng thực tế xác nhận sự cố không còn tái diễn trước khi chính thức đóng phiếu.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {capas
              .filter((c) => c.status === "PENDING_VERIFICATION" || c.verification_status === "PENDING_VERIFY" || c.status === "COMPLETED")
              .map((c) => (
                <div
                  key={c.capa_id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-2 text-xs max-w-2xl">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 text-xs">
                        {c.capa_number}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{c.title}</span>
                    </div>
                    <p className="text-slate-800 text-xs font-medium leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <b>Hành động khắc phục:</b> {c.corrective_action}
                    </p>
                    <div className="flex items-center gap-3 text-slate-500 text-xs font-medium">
                      <span>Người phụ trách: <b className="text-slate-700">{c.assigned_to_name}</b></span>
                      <span>•</span>
                      <span>Ngày hoàn tất: <b className="text-slate-700">{c.completed_date || "Đang thực hiện"}</b></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {c.verification_status === "EFFECTIVE" ? (
                      <div className="text-right text-xs">
                        <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-300">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Đã Thẩm Tra Đạt Hiệu Lực
                        </span>
                        <div className="text-xs text-slate-500 mt-1 font-medium">Bởi: {c.verified_by_name} ({c.verification_date})</div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setVerifyingCAPA(c);
                          setVerificationForm({
                            verified_by_name: "Trưởng Ban QLCL & ATTP",
                            verification_result: `Đã thẩm tra sau 30 ngày kể từ khi hoàn tất khắc phục: Kiểm tra ngẫu nhiên các lô sản xuất và hồ sơ nhật ký đo đạc không phát sinh lỗi tương tự; 100% nhân sự tuân thủ quy chuẩn.`,
                            verification_status: "EFFECTIVE",
                          });
                          setShowVerifyModal(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Thẩm Tra 30 Ngày & Đóng NC</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ==================== MODAL 1: CREATE / EDIT NON-CONFORMANCE ==================== */}
      {showNCModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                {editingNC ? "Chỉnh Sửa Sự Không Phù Hợp" : "Báo Cáo Sự Không Phù Hợp Mới (NC Report)"}
              </h3>
              <button onClick={() => setShowNCModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNC} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã Phiếu NC *</label>
                  <Input
                    name="nc_number"
                    defaultValue={editingNC?.nc_number || `NC-2026-${String(ncs.length + 1).padStart(3, "0")}`}
                    required
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày Phát Sinh *</label>
                  <Input
                    type="date"
                    name="occurred_date"
                    defaultValue={editingNC?.occurred_date || new Date().toISOString().split("T")[0]}
                    required
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu Đề Sự Không Phù Hợp *</label>
                <Input
                  name="title"
                  defaultValue={editingNC?.title || ""}
                  placeholder="Ví dụ: Nhiệt độ thanh trùng CCP1 giảm xuống 82.5°C..."
                  required
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nguồn Phát Sinh</label>
                  <select
                    name="source"
                    defaultValue={editingNC?.source || "HACCP_CCP"}
                    className="w-full text-xs h-9 bg-white border border-slate-200 rounded-lg px-2.5"
                  >
                    <option value="HACCP_CCP">Điểm tới hạn CCP</option>
                    <option value="PRP_GMP">Chương trình PRP/GMP</option>
                    <option value="IQC_INCOMING">Nguyên liệu đầu vào IQC</option>
                    <option value="INTERNAL_AUDIT">Đánh giá nội bộ</option>
                    <option value="CUSTOMER_COMPLAINT">Khiếu nại khách hàng</option>
                    <option value="EQUIPMENT_FAIL">Sự cố thiết bị</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức Độ Nghiêm Trọng</label>
                  <select
                    name="severity"
                    defaultValue={editingNC?.severity || "MAJOR"}
                    className="w-full text-xs h-9 bg-white border border-slate-200 rounded-lg px-2.5 font-bold"
                  >
                    <option value="CRITICAL">Nghiêm trọng (Critical - Dừng chuyền)</option>
                    <option value="MAJOR">Nặng (Major)</option>
                    <option value="MINOR">Nhẹ (Minor)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vị Trí / Dây Chuyền</label>
                  <Input
                    name="occurred_location"
                    defaultValue={editingNC?.occurred_location || "Xưởng Chế Biến 1"}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô Tả Chi Tiết Sự Không Phù Hợp *</label>
                <Textarea
                  name="description"
                  defaultValue={editingNC?.description || ""}
                  rows={3}
                  placeholder="Mô tả cụ thể thông số đo, hiện tượng sai khác so với tiêu chuẩn..."
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Biện Pháp Khắc Phục / Cô Lập Tức Thì (ISO 8.9.2) *
                </label>
                <Textarea
                  name="immediate_action"
                  defaultValue={editingNC?.immediate_action || ""}
                  rows={2}
                  placeholder="Ví dụ: Lập tức dừng chuyền, dán nhãn CÁCH LY BIỆT TRỮ toàn bộ 1.200 kg mẻ sản xuất..."
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã Số Lô Hàng Bị Ảnh Hưởng</label>
                  <Input
                    name="affected_lot_number"
                    defaultValue={editingNC?.affected_lot_number || ""}
                    placeholder="LOT-20260627-01"
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số Lượng / Khối Lượng Bị Ảnh Hưởng</label>
                  <Input
                    name="affected_quantity"
                    defaultValue={editingNC?.affected_quantity || ""}
                    placeholder="Ví dụ: 1,200 kg (50 thùng)"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người Báo Cáo / KCS</label>
                  <Input
                    name="reported_by_name"
                    defaultValue={editingNC?.reported_by_name || "Trần Văn An (QC Lead)"}
                    className="text-xs h-9"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trạng Thái Xử Lý</label>
                  <select
                    name="status"
                    defaultValue={editingNC?.status || "NEW"}
                    className="w-full text-xs h-9 bg-white border border-slate-200 rounded-lg px-2.5 font-semibold"
                  >
                    <option value="NEW">Mới phát hiện</option>
                    <option value="ACTION_REQUIRED">Cần khởi tạo CAPA</option>
                    <option value="INVESTIGATING">Đang điều tra</option>
                    <option value="CLOSED">Đã đóng hồ sơ</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 -mx-6 -mb-6">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNCModal(false)}>
                  Hủy / Đóng
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {editingNC ? "Lưu Cập Nhật" : "Tạo Báo Cáo NC"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: CREATE / EDIT CAPA RECORD ==================== */}
      {showCAPAModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                {editingCAPA ? "Chỉnh Sửa Kế Hoạch CAPA" : "Khởi Tạo Kế Hoạch Khắc Phục & Phòng Ngừa (CAPA)"}
              </h3>
              <button onClick={() => setShowCAPAModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCAPA} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã Phiếu CAPA *</label>
                  <Input
                    name="capa_number"
                    defaultValue={editingCAPA?.capa_number || `CAPA-2026-${String(capas.length + 1).padStart(3, "0")}`}
                    required
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sự Cố NC Liên Kết *</label>
                  <select
                    name="nc_id"
                    defaultValue={editingCAPA?.nc_id || selectedNCForCAPA?.nc_id || (ncs[0]?.nc_id ?? "")}
                    className="w-full text-xs h-9 bg-white border border-slate-200 rounded-lg px-2.5 font-medium"
                  >
                    {ncs.map((n) => (
                      <option key={n.nc_id} value={n.nc_id}>
                        [{n.nc_number}] {n.title.substring(0, 45)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu Đề Kế Hoạch CAPA *</label>
                <Input
                  name="title"
                  defaultValue={editingCAPA?.title || `Khắc phục sự cố ${selectedNCForCAPA?.title || ""}`}
                  required
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phương Pháp Phân Tích Root Cause</label>
                  <select
                    name="root_cause_method"
                    defaultValue={editingCAPA?.root_cause_method || "5_WHYS"}
                    className="w-full text-xs h-9 bg-white border border-slate-200 rounded-lg px-2.5 font-semibold"
                  >
                    <option value="5_WHYS">5-Why Analysis</option>
                    <option value="FISHBONE_5M">Sơ đồ xương cá Ishikawa (5M+1E)</option>
                    <option value="OTHER">Phương pháp khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hạn Chót Hoàn Thành *</label>
                  <Input
                    type="date"
                    name="target_date"
                    defaultValue={editingCAPA?.target_date || new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]}
                    required
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tóm Tắt Nguyên Nhân Gốc Rễ Đã Xác Định</label>
                <Textarea
                  name="root_cause_summary"
                  defaultValue={editingCAPA?.root_cause_summary || ""}
                  rows={2}
                  placeholder="Ghi nhận nguyên nhân sâu xa cốt lõi tìm được từ 5-Why hoặc Fishbone..."
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Hành Động Khắc Phục Nguyên Nhân Cốt Lõi (Corrective Action) *
                </label>
                <Textarea
                  name="corrective_action"
                  defaultValue={editingCAPA?.corrective_action || ""}
                  rows={2}
                  placeholder="Các biện pháp kỹ thuật, sửa chữa, thay thế, điều chỉnh để loại bỏ nguyên nhân..."
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Biện Pháp Phòng Ngừa Tái Diễn (Preventive Action)
                </label>
                <Textarea
                  name="preventive_action"
                  defaultValue={editingCAPA?.preventive_action || ""}
                  rows={2}
                  placeholder="Sửa đổi SOP, lắp đặt thêm bẫy cảnh báo, tái đào tạo định kỳ để không lặp lại..."
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người Chịu Trách Nhiệm</label>
                  <Input
                    name="assigned_to_name"
                    defaultValue={editingCAPA?.assigned_to_name || "Nguyễn Văn Hùng"}
                    className="text-xs h-9"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phòng Ban Phụ Trách</label>
                  <Input
                    name="assigned_dept"
                    defaultValue={editingCAPA?.assigned_dept || "Phòng Cơ Điện & Thiết Bị"}
                    className="text-xs h-9"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trạng Thái</label>
                  <select
                    name="status"
                    defaultValue={editingCAPA?.status || "IN_PROGRESS"}
                    className="w-full text-xs h-9 bg-white border border-slate-200 rounded-lg px-2.5 font-semibold"
                  >
                    <option value="IN_PROGRESS">Đang triển khai</option>
                    <option value="PENDING_VERIFICATION">Chờ thẩm tra 30 ngày</option>
                    <option value="COMPLETED">Đã hoàn thành</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 -mx-6 -mb-6">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCAPAModal(false)}>
                  Hủy / Đóng
                </Button>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {editingCAPA ? "Lưu Cập Nhật" : "Khởi Tạo CAPA"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 3: 30-DAY VERIFICATION ==================== */}
      {showVerifyModal && verifyingCAPA && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
              <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                Thẩm Tra Hiệu Lực CAPA Sau 30 Ngày (ISO 10.1)
              </h3>
              <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVerification} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 text-sm">
                  {verifyingCAPA.capa_number}: {verifyingCAPA.title}
                </div>
                <div className="text-slate-600 font-medium">Người thực hiện: {verifyingCAPA.assigned_to_name}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Đánh Giá Viên / Người Thẩm Tra *</label>
                <Input
                  value={verificationForm.verified_by_name}
                  onChange={(e) => setVerificationForm({ ...verificationForm, verified_by_name: e.target.value })}
                  required
                  className="text-xs h-9 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Kết Quả Thẩm Tra Hiệu Lực *</label>
                <select
                  value={verificationForm.verification_status}
                  onChange={(e) => setVerificationForm({ ...verificationForm, verification_status: e.target.value })}
                  className="w-full text-xs h-9 bg-white border border-slate-200 rounded-lg px-2.5 font-bold text-emerald-800"
                >
                  <option value="EFFECTIVE">✅ ĐẠT HIỆU LỰC (Sự cố không tái diễn - Đóng NC)</option>
                  <option value="INEFFECTIVE">❌ KHÔNG HIỆU LỰC (Còn tái diễn - Yêu cầu phân tích lại)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Nội Dung Bằng Chứng Thẩm Tra *</label>
                <Textarea
                  value={verificationForm.verification_result}
                  onChange={(e) => setVerificationForm({ ...verificationForm, verification_result: e.target.value })}
                  rows={4}
                  required
                  placeholder="Ghi nhận số liệu kiểm tra ngẫu nhiên, kết quả test vi sinh, phỏng vấn nhân viên..."
                  className="text-xs font-medium"
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 -mx-6 -mb-6">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowVerifyModal(false)}>
                  Hủy
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  Xác Nhận Thẩm Tra & Đóng NC
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 4: IN BIỂU MẪU CHUẨN ISO BM-CAPA-01 ==================== */}
      {showPrintModal && printingCAPA && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Xem Trước Biểu Mẫu Chuẩn ISO: BM-CAPA-01 ({printingCAPA.capa_number})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 h-8 px-3"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>In Biểu Mẫu</span>
                </Button>
                <button onClick={() => setShowPrintModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* A4 Document Paper Preview */}
            <div className="p-8 overflow-y-auto bg-slate-100 flex justify-center">
              <div className="w-full max-w-3xl bg-white p-8 shadow-md border border-slate-300 rounded-sm text-slate-900 text-xs space-y-6 font-sans">
                {/* ISO Form Header */}
                <div className="border-2 border-slate-800 p-4">
                  <div className="grid grid-cols-4 items-center divide-x-2 divide-slate-800 text-center">
                    <div className="col-span-1 p-2 font-bold text-emerald-700 text-sm">
                      WCERT FSMS
                      <div className="text-[10px] text-slate-500 font-normal">ISO 22000:2018</div>
                    </div>
                    <div className="col-span-2 p-2">
                      <h2 className="font-extrabold text-sm uppercase tracking-wide">
                        PHIẾU XỬ LÝ SỰ KHÔNG PHÙ HỢP & CAPA
                      </h2>
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        (Tuân thủ Điều khoản 8.9 & 10.1 - ISO 22000:2018)
                      </div>
                    </div>
                    <div className="col-span-1 p-2 text-[10px] text-left space-y-0.5 pl-3">
                      <div><b>Mã BM:</b> BM-CAPA-01</div>
                      <div><b>Lần BH:</b> 02/2026</div>
                      <div><b>Mã Phiếu:</b> {printingCAPA.capa_number}</div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Non-Conformance Info */}
                <div className="space-y-2 border border-slate-400 p-3.5 rounded">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] bg-slate-100 p-1.5 -m-3.5 mb-2 border-b border-slate-400">
                    I. THÔNG TIN SỰ KHÔNG PHÙ HỢP (NON-CONFORMANCE DETAILS)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><b>Tiêu đề sự cố:</b> {printingCAPA.title}</div>
                    <div><b>Mã sự cố NC:</b> {printingCAPA.nc_number || "NC-2026"}</div>
                    <div><b>Bộ phận chịu trách nhiệm:</b> {printingCAPA.assigned_dept}</div>
                    <div><b>Người phụ trách:</b> {printingCAPA.assigned_to_name}</div>
                  </div>
                </div>

                {/* Section 2: Root Cause Analysis */}
                <div className="space-y-2 border border-slate-400 p-3.5 rounded">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] bg-slate-100 p-1.5 -m-3.5 mb-2 border-b border-slate-400">
                    II. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS - 8.9.3)
                  </h4>
                  <div className="text-[11px] space-y-1.5">
                    <div><b>Phương pháp áp dụng:</b> {printingCAPA.root_cause_method === "5_WHYS" ? "5-Why Analysis" : "Ishikawa Fishbone Diagram 5M"}</div>
                    <div>
                      <b>Kết luận nguyên nhân cốt lõi:</b>
                      <p className="p-2 bg-slate-50 border border-slate-200 rounded mt-1 text-slate-800 leading-relaxed font-medium">
                        {printingCAPA.root_cause_summary || "Đã phân tích và xác định điểm nghẽn quy trình."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Actions Plan */}
                <div className="space-y-2 border border-slate-400 p-3.5 rounded">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] bg-slate-100 p-1.5 -m-3.5 mb-2 border-b border-slate-400">
                    III. KẾ HOẠCH KHẮC PHỤC & PHÒNG NGỪA (CORRECTIVE & PREVENTIVE ACTIONS)
                  </h4>
                  <div className="text-[11px] space-y-2">
                    <div>
                      <b>1. Hành động khắc phục nguyên nhân (Corrective Action):</b>
                      <p className="p-2 bg-slate-50 border border-slate-200 rounded mt-1 leading-relaxed font-medium">{printingCAPA.corrective_action}</p>
                    </div>
                    {printingCAPA.preventive_action && (
                      <div>
                        <b>2. Biện pháp phòng ngừa tái diễn (Preventive Action):</b>
                        <p className="p-2 bg-slate-50 border border-slate-200 rounded mt-1 leading-relaxed font-medium">{printingCAPA.preventive_action}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1 font-semibold">
                      <div>Hạn hoàn thành: {printingCAPA.target_date}</div>
                      <div>Ngày thực tế hoàn tất: {printingCAPA.completed_date || "Đang thực hiện"}</div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Verification */}
                <div className="space-y-2 border border-slate-400 p-3.5 rounded">
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] bg-slate-100 p-1.5 -m-3.5 mb-2 border-b border-slate-400">
                    IV. THẨM TRA HIỆU LỰC SAU 30 NGÀY & KẾT LUẬN ĐÓNG PHIẾU (VERIFICATION - 10.1)
                  </h4>
                  <div className="text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div><b>Người thẩm tra:</b> {printingCAPA.verified_by_name || "Trưởng Ban QLCL & ATTP"}</div>
                      <div><b>Ngày thẩm tra:</b> {printingCAPA.verification_date || "Sau 30 ngày"}</div>
                    </div>
                    <div>
                      <b>Kết luận hiệu lực: </b>
                      <span className="font-bold text-emerald-700">
                        {printingCAPA.verification_status === "EFFECTIVE" ? "✅ ĐẠT HIỆU LỰC (EFFECTIVE)" : "⏳ Đang theo dõi chu kỳ 30 ngày"}
                      </span>
                    </div>
                    <p className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-800 leading-relaxed font-medium">
                      {printingCAPA.verification_result || "Đoàn đánh giá nội bộ sẽ tái thẩm tra số liệu tại hiện trường sau 30 ngày vận hành ổn định."}
                    </p>
                  </div>
                </div>

                {/* Section 5: 3 Signatures Block */}
                <div className="grid grid-cols-3 text-center pt-6 text-[11px]">
                  <div className="space-y-12">
                    <p className="font-bold uppercase">Người Lập Báo Cáo</p>
                    <p className="font-semibold text-slate-700">{printingCAPA.assigned_to_name || "Trần Văn An"}</p>
                  </div>

                  <div className="space-y-12">
                    <p className="font-bold uppercase">Trưởng Bộ Phận Phụ Trách</p>
                    <p className="font-semibold text-slate-700">Nguyễn Văn Hùng</p>
                  </div>

                  <div className="space-y-12">
                    <p className="font-bold uppercase text-emerald-800">Trưởng Ban QLCL / ĐDLĐ</p>
                    <p className="font-semibold text-emerald-900">Phạm Quốc Bảo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 5: WORKFLOW BUILDER - CAPA 5 STEPS ==================== */}
      {showWorkflowModal && workflowTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <WorkflowBuilder
              initialData={workflowTemplate}
              onSave={async (wf) => {
                try {
                  await api.post("/builders/workflows", wf);
                  toast.success("Đã lưu lưu đồ quy trình CAPA 5 bước thành công!");
                  setShowWorkflowModal(false);
                } catch (err: any) {
                  toast.error("Lỗi khi lưu quy trình: " + (err.response?.data?.detail || err.message));
                }
              }}
              onCancel={() => setShowWorkflowModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
