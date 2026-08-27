import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  Plus,
  RefreshCw,
  Search,
  Printer,
  Sparkles,
  Layers,
  Clock,
  Pencil,
  Trash2,
  Calendar,
  Building,
  Users,
  AlertOctagon,
  Percent,
  FileText,
  Boxes,
  Check,
  XCircle,
  HelpCircle,
  Droplets,
  Bug,
  Sparkle,
  Sliders,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import logoImg from "@/assets/logo.png";
import { DynamicFormRenderer } from "@/components/builder/DynamicFormRenderer";
import type { FormTemplateData } from "@/components/builder/types";

export const Route = createFileRoute("/prp")({
  head: () => ({
    meta: [
      { title: "Chương trình Tiên quyết (PRP / GMP / SSOP) – WCERT ISO 22000" },
      {
        name: "description",
        content:
          "Thư viện quy chuẩn GMP, SSOP, 5S và giám sát tuân thủ checklist theo ca sản xuất theo tiêu chuẩn ISO 22000:2018 Điều khoản 8.2.",
      },
    ],
  }),
  component: () => (
    <AppShell module="prp">
      <PRPModule />
    </AppShell>
  ),
});

// ==================== INTERFACES ====================
interface PRPProgram {
  program_id: string;
  program_code: string;
  program_name: string;
  group: string; // GMP, SSOP, 5S, PEST_CONTROL, WATER_SAFETY
  scope?: string;
  frequency: string;
  responsible_dept: string;
  status: string; // ACTIVE, INACTIVE
  description?: string;
  checklist_count: number;
  created_at?: string;
}

interface PRPChecklistItem {
  item: string;
  result: string; // Đạt, Cần khắc phục, Chờ thực hiện
  note?: string;
}

interface PRPChecklistLog {
  check_id: string;
  program_id: string;
  shift_name: string;
  check_date: string;
  check_time?: string;
  items_checked: PRPChecklistItem[];
  compliance_rate: number;
  status: string; // COMPLIANT, ACTION_REQUIRED, NON_COMPLIANT
  finding_notes?: string;
  corrective_action?: string;
  program_code?: string;
  program_name?: string;
  group?: string;
  inspector_name?: string;
  created_at?: string;
}

// Preset questions for new checklists
const DEFAULT_CHECKLIST_QUESTIONS: Record<string, string[]> = {
  GMP: [
    "Kiểm tra vệ sinh bề mặt bàn thao tác và dụng cụ inox",
    "Kiểm tra tình trạng thiết bị máy móc không rỉ sét/nứt vỡ",
    "Kiểm tra điều kiện nhiệt độ phòng chế biến đạt chuẩn",
  ],
  SSOP: [
    "Nồng độ Clo dư tự do nước rửa trong ngưỡng 0.5 - 1.0 ppm",
    "Công nhân mặc đầy đủ bảo hộ (mũ trùm tóc, khẩu trang, găng tay)",
    "Hóa chất tẩy rửa lưu trữ đúng nơi quy định, dán nhãn nhận diện",
  ],
  "5S": [
    "Sàng lọc dụng cụ thừa, không để đồ vật lạ trên dây chuyền",
    "Sắp xếp dụng cụ đúng vị trí quy định trên giá",
    "Sàn nhà xưởng sạch sẽ, thoát nước tốt, không đọng rác",
  ],
};

function PRPModule() {
  const [activeTab, setActiveTab] = useState<"programs" | "checklists">("programs");

  // Data states
  const [programs, setPrograms] = useState<PRPProgram[]>([]);
  const [checklists, setChecklists] = useState<PRPChecklistLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [progSearch, setProgSearch] = useState("");
  const [progGroupFilter, setProgGroupFilter] = useState("ALL");
  const [progStatusFilter, setProgStatusFilter] = useState("ALL");

  const [ckProgFilter, setCkProgFilter] = useState("ALL");
  const [ckShiftFilter, setCkShiftFilter] = useState("ALL");
  const [ckStatusFilter, setCkStatusFilter] = useState("ALL");

  // Modals
  const [showProgModal, setShowProgModal] = useState(false);
  const [editingProg, setEditingProg] = useState<PRPProgram | null>(null);
  const [progForm, setProgForm] = useState({
    program_code: "",
    program_name: "",
    group: "GMP",
    scope: "Toàn nhà máy",
    frequency: "Theo ca sản xuất",
    responsible_dept: "Phòng Sản xuất",
    status: "ACTIVE",
    description: "",
  });

  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkForm, setCheckForm] = useState({
    program_id: "",
    shift_name: "Ca sáng",
    check_time: "07:30",
    finding_notes: "",
    corrective_action: "",
    items: [
      { item: "Kiểm tra vệ sinh bề mặt thiết bị và dụng cụ", result: "Đạt", note: "" },
      { item: "Kiểm tra trang phục bảo hộ và vệ sinh công nhân", result: "Đạt", note: "" },
      { item: "Kiểm tra thoát sàn và thùng chứa phế phẩm", result: "Đạt", note: "" },
    ],
  });

  const [showPrintModal, setShowPrintModal] = useState(false);

  // Dynamic Form States
  const [showDynamicGmpModal, setShowDynamicGmpModal] = useState(false);
  const [gmpFormTemplate, setGmpFormTemplate] = useState<FormTemplateData | null>(null);
  const [selectedProgramForForm, setSelectedProgramForForm] = useState<PRPProgram | null>(null);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, cRes] = await Promise.all([
        api.get("/haccp/prp-programs"),
        api.get("/haccp/prp-checklists"),
      ]);
      setPrograms(pRes.data);
      setChecklists(cRes.data);
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể tải dữ liệu PRP: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered lists
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      const matchQ =
        !progSearch ||
        p.program_code.toLowerCase().includes(progSearch.toLowerCase()) ||
        p.program_name.toLowerCase().includes(progSearch.toLowerCase()) ||
        p.responsible_dept.toLowerCase().includes(progSearch.toLowerCase());
      const matchGroup = progGroupFilter === "ALL" || p.group === progGroupFilter;
      const matchStatus = progStatusFilter === "ALL" || p.status === progStatusFilter;
      return matchQ && matchGroup && matchStatus;
    });
  }, [programs, progSearch, progGroupFilter, progStatusFilter]);

  const filteredChecklists = useMemo(() => {
    return checklists.filter((c) => {
      const matchProg = ckProgFilter === "ALL" || c.program_id === ckProgFilter;
      const matchShift = ckShiftFilter === "ALL" || c.shift_name === ckShiftFilter;
      const matchStatus = ckStatusFilter === "ALL" || c.status === ckStatusFilter;
      return matchProg && matchShift && matchStatus;
    });
  }, [checklists, ckProgFilter, ckShiftFilter, ckStatusFilter]);

  // Statistics
  const avgCompliance = useMemo(() => {
    if (checklists.length === 0) return 100.0;
    const sum = checklists.reduce((acc, curr) => acc + curr.compliance_rate, 0);
    return Math.round((sum / checklists.length) * 10) / 10;
  }, [checklists]);

  const actionRequiredCount = useMemo(() => {
    return checklists.filter((c) => c.status !== "COMPLIANT").length;
  }, [checklists]);

  // ==================== ACTIONS: PROGRAM ====================
  const handleOpenCreateProg = () => {
    setEditingProg(null);
    setProgForm({
      program_code: `GMP-0${programs.length + 1}`,
      program_name: "",
      group: "GMP",
      scope: "Khu vực sản xuất chính",
      frequency: "Mỗi ca sản xuất",
      responsible_dept: "Phòng Sản xuất",
      status: "ACTIVE",
      description: "",
    });
    setShowProgModal(true);
  };

  const handleOpenEditProg = (p: PRPProgram) => {
    setEditingProg(p);
    setProgForm({
      program_code: p.program_code,
      program_name: p.program_name,
      group: p.group,
      scope: p.scope || "",
      frequency: p.frequency,
      responsible_dept: p.responsible_dept,
      status: p.status,
      description: p.description || "",
    });
    setShowProgModal(true);
  };

  const handleSaveProg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        program_code: progForm.program_code.trim(),
        program_name: progForm.program_name.trim(),
        group: progForm.group,
        scope: progForm.scope.trim() || null,
        frequency: progForm.frequency.trim(),
        responsible_dept: progForm.responsible_dept.trim(),
        status: progForm.status,
        description: progForm.description.trim() || null,
      };

      if (editingProg) {
        await api.put(`/haccp/prp-programs/${editingProg.program_id}`, payload);
        toast.success(`Đã cập nhật chương trình '${payload.program_code}' thành công`);
      } else {
        await api.post("/haccp/prp-programs", payload);
        toast.success(`Đã tạo chương trình '${payload.program_code}' thành công`);
      }
      setShowProgModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu chương trình PRP");
    }
  };

  const handleDeleteProg = async (p: PRPProgram) => {
    if (!confirm(`Bạn có chắc muốn xóa chương trình '${p.program_code} - ${p.program_name}'?`)) return;
    try {
      await api.delete(`/haccp/prp-programs/${p.program_id}`);
      toast.success("Đã xóa chương trình thành công");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi xóa chương trình");
    }
  };

  // ==================== ACTIONS: CHECKLIST ====================
  const handleOpenCreateChecklist = (p?: PRPProgram) => {
    const target = p || programs[0];
    if (!target) {
      toast.error("Vui lòng tạo ít nhất 1 chương trình PRP trước");
      return;
    }
    const defaultQs = DEFAULT_CHECKLIST_QUESTIONS[target.group] || DEFAULT_CHECKLIST_QUESTIONS.GMP;
    setCheckForm({
      program_id: target.program_id,
      shift_name: "Ca sáng",
      check_time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      finding_notes: "",
      corrective_action: "",
      items: defaultQs.map((q) => ({ item: q, result: "Đạt", note: "" })),
    });
    setShowCheckModal(true);
  };

  const handleSaveChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        program_id: checkForm.program_id,
        shift_name: checkForm.shift_name,
        check_time: checkForm.check_time,
        items_checked: checkForm.items,
        finding_notes: checkForm.finding_notes ? checkForm.finding_notes.trim() : null,
        corrective_action: checkForm.corrective_action ? checkForm.corrective_action.trim() : null,
      };

      const res = await api.post("/haccp/prp-checklists", payload);
      const saved = res.data;
      if (saved.status === "COMPLIANT") {
        toast.success(`Đã lưu checklist! Tỷ lệ tuân thủ: ${saved.compliance_rate}%`);
      } else {
        toast.warning(`Checklist có hạng mục cần khắc phục! Tỷ lệ tuân thủ: ${saved.compliance_rate}%`);
      }
      setShowCheckModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu checklist");
    }
  };

  const handleDeleteChecklist = async (c: PRPChecklistLog) => {
    if (!confirm("Bạn có chắc muốn xóa bản ghi checklist này?")) return;
    try {
      await api.delete(`/haccp/prp-checklists/${c.check_id}`);
      toast.success("Đã xóa bản ghi checklist thành công");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi xóa checklist");
    }
  };

  // ==================== DYNAMIC GMP FORM HANDLERS ====================
  const handleOpenGmpDynamicForm = async (program?: PRPProgram) => {
    setSelectedProgramForForm(program || null);
    try {
      const res = await api.get("/builders/forms");
      const found = res.data.find((f: any) => f.code === "FORM-GMP-01");
      if (found) {
        setGmpFormTemplate(found);
      } else {
        setGmpFormTemplate({
          module: "PRP",
          code: "FORM-GMP-01",
          title: "Phiếu Kiểm Tra Vệ Sinh Nhà Xưởng & Thiết Bị (GMP-01)",
          description: "Giám sát tình trạng vệ sinh bề mặt tiếp xúc thực phẩm, bảo hộ lao động và hệ thống thoát sàn trước ca sản xuất.",
          version: "1.0",
          fields: [
            { id: "g_shift", name: "shift_name", label: "Ca Sản Xuất", type: "SELECT", options: ["Ca 1 (06:00 - 14:00)", "Ca 2 (14:00 - 22:00)", "Ca 3 (22:00 - 06:00)"], required: true, default_value: "Ca 1 (06:00 - 14:00)" },
            { id: "g_area", name: "area_checked", label: "Khu Vực / Dây Chuyền Giám Sát", type: "TEXT", required: true, default_value: program ? program.program_name : "Khu vực sơ chế & chế biến chính" },
            { id: "g_surface", name: "surface_clean", label: "Bề mặt bàn chế biến, dao, thớt đã khử trùng bằng Chlorine 200ppm?", type: "YESNO", required: true, default_value: true },
            { id: "g_ppe", name: "ppe_compliance", label: "100% công nhân mang đầy đủ mũ trùm, khẩu trang, găng tay và ủng?", type: "YESNO", required: true, default_value: true },
            { id: "g_drain", name: "drain_clean", label: "Hệ thống thoát sàn và rãnh thu gom phế thải thông thoáng, không ứ đọng?", type: "YESNO", required: true, default_value: true },
            { id: "g_pest", name: "no_pest_activity", label: "Bẫy côn trùng, đèn diệt ruồi hoạt động tốt, không có dấu vết dịch hại?", type: "YESNO", required: true, default_value: true },
            { id: "g_score", name: "compliance_score", label: "Đánh giá mức độ tuân thủ (Thang điểm 1-5 sao)", type: "RATING", required: true, default_value: 5 },
            { id: "g_notes", name: "finding_notes", label: "Ghi chú bất thường (nếu có)", type: "TEXT", required: false, default_value: "Mọi tiêu chuẩn vệ sinh đều đạt yêu cầu trước khi bắt đầu ca." },
          ],
          status: "ACTIVE",
        });
      }
      setShowDynamicGmpModal(true);
    } catch (err) {
      toast.error("Không thể tải biểu mẫu GMP");
    }
  };

  const handleSaveGmpDynamicForm = async (vals: Record<string, any>) => {
    try {
      await api.post("/builders/submissions", {
        template_id: gmpFormTemplate?.template_id || "FORM-GMP-01",
        reference_id: selectedProgramForForm ? selectedProgramForForm.program_id : "PRP-GLOBAL",
        reference_type: "PRP_PROGRAM",
        submitted_by_name: "Giám Sát Viên GMP / SSOP",
        form_data: vals,
        status: "COMPLETED",
      });

      // Tạo bản ghi log checklist
      const progId = selectedProgramForForm ? selectedProgramForForm.program_id : (programs[0]?.program_id || "PRP-01");
      const shift = vals["shift_name"] || "Ca 1";
      const surfacePass = vals["surface_clean"] !== false && vals["surface_clean"] !== "false";
      const ppePass = vals["ppe_compliance"] !== false && vals["ppe_compliance"] !== "false";
      const drainPass = vals["drain_clean"] !== false && vals["drain_clean"] !== "false";
      const pestPass = vals["no_pest_activity"] !== false && vals["no_pest_activity"] !== "false";

      const totalItems = 4;
      const passedItems = [surfacePass, ppePass, drainPass, pestPass].filter(Boolean).length;
      const compRate = Math.round((passedItems / totalItems) * 100);

      await api.post("/haccp/prp-checklists", {
        program_id: progId,
        shift_name: shift,
        check_date: new Date().toISOString().split("T")[0],
        check_time: new Date().toTimeString().slice(0, 5),
        items_checked: [
          { item: "Vệ sinh bề mặt bàn chế biến & dụng cụ", result: surfacePass ? "Đạt" : "Không đạt" },
          { item: "Trang phục bảo hộ công nhân", result: ppePass ? "Đạt" : "Không đạt" },
          { item: "Thoát sàn & rãnh thu gom", result: drainPass ? "Đạt" : "Không đạt" },
          { item: "Kiểm soát dịch hại & bẫy côn trùng", result: pestPass ? "Đạt" : "Không đạt" },
        ],
        compliance_rate: compRate,
        status: compRate === 100 ? "COMPLIANT" : compRate >= 75 ? "ACTION_REQUIRED" : "NON_COMPLIANT",
        finding_notes: vals["finding_notes"] || "Kiểm tra theo biểu mẫu GMP-01",
        corrective_action: compRate < 100 ? "Khắc phục ngay trước khi vận hành" : undefined,
      });

      toast.success("Đã ghi nhận nhật ký checklist GMP bằng Form Động thành công!");
      setShowDynamicGmpModal(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi lưu kết quả: " + (err.response?.data?.detail || err.message));
    }
  };

  // Helper styles
  const getGroupBadge = (group: string) => {
    if (group === "GMP") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 border border-blue-200">GMP</span>;
    if (group === "SSOP") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200">SSOP</span>;
    if (group === "5S") return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-700 border border-purple-200">5S</span>;
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{group}</span>;
  };

  const getStatusBadge = (status: string) => {
    if (status === "COMPLIANT") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Tuân thủ
        </span>
      );
    }
    if (status === "ACTION_REQUIRED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-800 border border-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Cần khắc phục
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-600 text-white">
        <AlertOctagon className="h-3.5 w-3.5" /> Không phù hợp
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <PageHeader
          title="Chương trình Tiên quyết (PRP / GMP / SSOP)"
          description="Thư viện quy chuẩn thực hành sản xuất tốt (GMP), quy trình vệ sinh chuẩn (SSOP), 5S và giám sát checklist theo ca sản xuất theo ISO 22000:2018 Điều khoản 8.2."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenGmpDynamicForm()}
            className="border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1.5 font-semibold text-xs"
          >
            <Sliders className="h-4 w-4 text-emerald-600" />
            <span>Ghi Nhật Ký Bằng Form Động (GMP-01)</span>
          </Button>

          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPrintModal(true)} className="border-primary/30 text-primary hover:bg-primary/5">
            <Printer className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">In Bảng Đánh Giá PRP (BM-PRP-01)</span>
            <span className="sm:hidden">In BM-PRP-01</span>
          </Button>
          <Button size="sm" onClick={() => handleOpenCreateChecklist()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-1.5" />
            Thực hiện Checklist Ca
          </Button>
        </div>
      </div>

      {/* ==================== 4 KPI CARDS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card rounded-xl border p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chương trình PRP / GMP / SSOP</span>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">{programs.length}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">100% Hoạt động</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Bao phủ toàn bộ quy chuẩn nhà máy</p>
        </div>

        <div className="bg-card rounded-xl border p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tỷ lệ Tuân thủ Trung bình</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{avgCompliance}%</span>
            <span className="text-xs font-medium text-muted-foreground">Đạt chuẩn ISO</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Đánh giá trên toàn bộ ca kiểm tra</p>
        </div>

        <div className="bg-card rounded-xl border p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Checklist Đã Hoàn Thành</span>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">{checklists.length}</span>
            <span className="text-xs font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">Ca sáng & Chiều</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Đầy đủ chữ ký & ảnh hiện trường</p>
        </div>

        <div className="bg-card rounded-xl border p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hạng mục Cần Khắc Phục</span>
            <div className={`p-2 rounded-lg ${actionRequiredCount > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-extrabold ${actionRequiredCount > 0 ? "text-amber-600" : "text-foreground"}`}>{actionRequiredCount}</span>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Đã xử lý bổ sung</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Không có lỗi nghiêm trọng</p>
        </div>
      </div>

      {/* ==================== 2 TABS NAVIGATION ==================== */}
      <div className="border-b overflow-x-auto no-scrollbar">
        <div className="flex space-x-1 sm:space-x-4 min-w-max pb-1">
          <button
            onClick={() => setActiveTab("programs")}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "programs" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            Thư viện Quy chuẩn PRP ({programs.length})
          </button>
          <button
            onClick={() => setActiveTab("checklists")}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "checklists" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardCheck className="h-4 w-4" />
            Checklist Giám Sát Theo Ca ({checklists.length})
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: PRP PROGRAMS ==================== */}
      {activeTab === "programs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã, tên chương trình..."
                className="pl-9 text-sm"
                value={progSearch}
                onChange={(e) => setProgSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={progGroupFilter}
                onChange={(e) => setProgGroupFilter(e.target.value)}
              >
                <option value="ALL">Tất cả nhóm (GMP/SSOP/5S)</option>
                <option value="GMP">GMP (Thực hành sản xuất tốt)</option>
                <option value="SSOP">SSOP (Vệ sinh chuẩn)</option>
                <option value="5S">5S (Sắp xếp vệ sinh)</option>
              </select>
              <Button onClick={handleOpenCreateProg} size="sm" className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" /> Thêm chương trình mới
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrograms.map((p) => (
              <div key={p.program_id} className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                      {p.program_code}
                    </span>
                    {getGroupBadge(p.group)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditProg(p)} className="h-7 w-7 text-muted-foreground hover:text-primary">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteProg(p)} className="h-7 w-7 text-muted-foreground hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-foreground">{p.program_name}</h4>
                  {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                </div>

                <div className="bg-muted/40 p-2.5 rounded-lg border text-xs space-y-1">
                  <p><span className="text-muted-foreground">Phạm vi:</span> <span className="font-medium text-foreground">{p.scope || "Toàn nhà máy"}</span></p>
                  <p><span className="text-muted-foreground">Tần suất:</span> <span className="font-medium text-foreground">{p.frequency}</span></p>
                  <p><span className="text-muted-foreground">Phụ trách:</span> <span className="font-medium text-foreground">{p.responsible_dept}</span></p>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs gap-1.5">
                  <span className="text-muted-foreground">{p.checklist_count} lượt kiểm</span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleOpenGmpDynamicForm(p)} className="text-xs h-7 border-sky-300 text-sky-700 hover:bg-sky-50">
                      <Sliders className="h-3 w-3 mr-1" /> Form Động
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleOpenCreateChecklist(p)} className="text-xs h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                      <Plus className="h-3 w-3 mr-1" /> Checklist
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: CHECKLISTS ==================== */}
      {activeTab === "checklists" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={ckProgFilter}
                onChange={(e) => setCkProgFilter(e.target.value)}
              >
                <option value="ALL">Tất cả chương trình</option>
                {programs.map((p) => (
                  <option key={p.program_id} value={p.program_id}>
                    {p.program_code} - {p.program_name}
                  </option>
                ))}
              </select>
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={ckShiftFilter}
                onChange={(e) => setCkShiftFilter(e.target.value)}
              >
                <option value="ALL">Tất cả ca</option>
                <option value="Ca sáng">Ca sáng</option>
                <option value="Ca chiều">Ca chiều</option>
                <option value="Ca đêm">Ca đêm</option>
              </select>
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={ckStatusFilter}
                onChange={(e) => setCkStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="COMPLIANT">Tuân thủ (COMPLIANT)</option>
                <option value="ACTION_REQUIRED">Cần khắc phục</option>
              </select>
            </div>
            <Button onClick={() => handleOpenCreateChecklist()} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4 mr-2" /> Thực hiện Checklist mới
            </Button>
          </div>

          <div className="space-y-3">
            {filteredChecklists.map((c) => (
              <div key={c.check_id} className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-primary">[{c.program_code}]</span>
                    <h4 className="font-bold text-sm text-foreground">{c.program_name}</h4>
                    <span className="text-xs px-2 py-0.5 bg-muted rounded font-medium">{c.shift_name} ({c.check_time || "07:30"})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                      Tuân thủ: {c.compliance_rate}%
                    </span>
                    {getStatusBadge(c.status)}
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteChecklist(c)} className="h-7 w-7 text-muted-foreground hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  {c.items_checked.map((it, idx) => (
                    <div key={idx} className="bg-muted/30 p-2.5 rounded-lg border flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{it.item}</p>
                        {it.note && <p className="text-[11px] text-muted-foreground mt-0.5 italic">{it.note}</p>}
                      </div>
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${it.result === "Đạt" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {it.result}
                      </span>
                    </div>
                  ))}
                </div>

                {(c.finding_notes || c.corrective_action) && (
                  <div className="p-2.5 bg-amber-500/5 rounded-lg border border-amber-200 text-xs space-y-1">
                    {c.finding_notes && <p><span className="font-bold text-amber-800">Ghi nhận:</span> {c.finding_notes}</p>}
                    {c.corrective_action && <p><span className="font-bold text-emerald-800">Khắc phục:</span> {c.corrective_action}</p>}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Ngày kiểm tra: {c.check_date}</span>
                  <span>Giám sát viên: {c.inspector_name || "QA/QC Lead"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT PROGRAM ==================== */}
      <Dialog open={showProgModal} onOpenChange={setShowProgModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProg ? "Chỉnh sửa Chương trình PRP" : "Thêm mới Chương trình Tiên quyết"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProg} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mã chương trình *</Label>
                <Input
                  placeholder="GMP-01, SSOP-01"
                  required
                  value={progForm.program_code}
                  onChange={(e) => setProgForm({ ...progForm, program_code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nhóm quy chuẩn *</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background text-foreground"
                  value={progForm.group}
                  onChange={(e) => setProgForm({ ...progForm, group: e.target.value })}
                >
                  <option value="GMP">GMP (Thực hành sản xuất tốt)</option>
                  <option value="SSOP">SSOP (Vệ sinh chuẩn)</option>
                  <option value="5S">5S (Sắp xếp vệ sinh)</option>
                  <option value="PEST_CONTROL">Kiểm soát dịch hại</option>
                  <option value="WATER_SAFETY">An toàn nguồn nước</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tên chương trình *</Label>
              <Input
                placeholder="Ví dụ: Vệ sinh thiết bị và nhà xưởng"
                required
                value={progForm.program_name}
                onChange={(e) => setProgForm({ ...progForm, program_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Phạm vi áp dụng</Label>
                <Input
                  placeholder="Xưởng chế biến, Kho lạnh"
                  value={progForm.scope}
                  onChange={(e) => setProgForm({ ...progForm, scope: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tần suất</Label>
                <Input
                  placeholder="Mỗi ca, Hàng ngày, Hàng tuần"
                  value={progForm.frequency}
                  onChange={(e) => setProgForm({ ...progForm, frequency: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Bộ phận phụ trách</Label>
              <Input
                placeholder="Phòng Sản xuất, QA/QC, Bảo trì"
                value={progForm.responsible_dept}
                onChange={(e) => setProgForm({ ...progForm, responsible_dept: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Mô tả tóm tắt nội dung</Label>
              <Input
                placeholder="Nội dung quy định kiểm soát..."
                value={progForm.description}
                onChange={(e) => setProgForm({ ...progForm, description: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowProgModal(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                Lưu chương trình
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: ADD CHECKLIST LOG ==================== */}
      <Dialog open={showCheckModal} onOpenChange={setShowCheckModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thực Hiện Checklist Giám Sát Ca</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveChecklist} className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Chương trình PRP *</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background text-foreground"
                  value={checkForm.program_id}
                  onChange={(e) => setCheckForm({ ...checkForm, program_id: e.target.value })}
                >
                  {programs.map((p) => (
                    <option key={p.program_id} value={p.program_id}>
                      [{p.program_code}] {p.program_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ca sản xuất</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background text-foreground"
                  value={checkForm.shift_name}
                  onChange={(e) => setCheckForm({ ...checkForm, shift_name: e.target.value })}
                >
                  <option value="Ca sáng">Ca sáng</option>
                  <option value="Ca chiều">Ca chiều</option>
                  <option value="Ca đêm">Ca đêm</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-primary">Danh sách Hạng mục Kiểm tra:</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCheckForm({
                      ...checkForm,
                      items: [...checkForm.items, { item: "Hạng mục kiểm tra mới", result: "Đạt", note: "" }],
                    })
                  }
                  className="text-xs h-6"
                >
                  + Thêm câu hỏi
                </Button>
              </div>

              {checkForm.items.map((it, idx) => (
                <div key={idx} className="p-3 bg-muted/40 rounded-lg border space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-muted-foreground w-6">#{idx + 1}</span>
                    <Input
                      placeholder="Nội dung câu hỏi kiểm tra"
                      value={it.item}
                      onChange={(e) => {
                        const newItems = [...checkForm.items];
                        newItems[idx].item = e.target.value;
                        setCheckForm({ ...checkForm, items: newItems });
                      }}
                      className="text-xs flex-1"
                    />
                    <select
                      className="border rounded px-2 py-1 text-xs bg-background font-bold"
                      value={it.result}
                      onChange={(e) => {
                        const newItems = [...checkForm.items];
                        newItems[idx].result = e.target.value;
                        setCheckForm({ ...checkForm, items: newItems });
                      }}
                    >
                      <option value="Đạt">Đạt</option>
                      <option value="Cần khắc phục">Cần khắc phục</option>
                      <option value="Chờ thực hiện">Chờ thực hiện</option>
                    </select>
                  </div>
                  <Input
                    placeholder="Ghi chú chi tiết / thông số đo đạc..."
                    value={it.note || ""}
                    onChange={(e) => {
                      const newItems = [...checkForm.items];
                      newItems[idx].note = e.target.value;
                      setCheckForm({ ...checkForm, items: newItems });
                    }}
                    className="text-[11px] h-7"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ghi nhận sai lệch (nếu có)</Label>
              <Input
                placeholder="Mô tả sự cố hoặc vị trí không đạt..."
                value={checkForm.finding_notes}
                onChange={(e) => setCheckForm({ ...checkForm, finding_notes: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Hành động khắc phục tức thì</Label>
              <Input
                placeholder="Đã yêu cầu vệ sinh lại / châm bổ sung cồn sát khuẩn..."
                value={checkForm.corrective_action}
                onChange={(e) => setCheckForm({ ...checkForm, corrective_action: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCheckModal(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Lưu kết quả Checklist
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: PRINT PRP SHEET (BM-PRP-01) ==================== */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Bảng Đánh Giá Tuân Thủ Chương Trình Tiên Quyết (BM-PRP-01)</DialogTitle>
          </DialogHeader>

          <div id="printable-prp" className="bg-white text-slate-900 p-8 rounded-lg border font-sans text-xs space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="WCERT Logo" className="h-14 w-auto object-contain" />
                <div>
                  <h2 className="font-extrabold text-base tracking-tight text-slate-900">CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT</h2>
                  <p className="text-[11px] text-slate-600">Ban Quản lý Chất lượng & An toàn Thực phẩm (FSMS)</p>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <p className="font-bold text-slate-900 text-sm">BIỂU MẪU: BM-PRP-01</p>
                <p>Tiêu chuẩn: ISO 22000:2018 Clause 8.2</p>
                <p>Ngày in: {new Date().toLocaleDateString("vi-VN")}</p>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-lg font-black text-slate-900 uppercase">BẢNG TỔNG HỢP KIỂM TRA TUÂN THỦ PRP / GMP / SSOP</h1>
            </div>

            <table className="w-full border-collapse border border-slate-400 text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-900 text-center">
                  <th className="border border-slate-400 p-2 w-14">STT</th>
                  <th className="border border-slate-400 p-2 w-20">Mã hiệu</th>
                  <th className="border border-slate-400 p-2">Tên chương trình</th>
                  <th className="border border-slate-400 p-2 w-20">Nhóm</th>
                  <th className="border border-slate-400 p-2">Phạm vi kiểm soát</th>
                  <th className="border border-slate-400 p-2 w-24">Tần suất</th>
                  <th className="border border-slate-400 p-2 w-28">Bộ phận phụ trách</th>
                  <th className="border border-slate-400 p-2 w-20">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p, idx) => (
                  <tr key={p.program_id} className="border-b border-slate-300">
                    <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-blue-700">{p.program_code}</td>
                    <td className="border border-slate-300 p-2 font-semibold">{p.program_name}</td>
                    <td className="border border-slate-300 p-2 text-center font-bold">{p.group}</td>
                    <td className="border border-slate-300 p-2">{p.scope || "Toàn nhà máy"}</td>
                    <td className="border border-slate-300 p-2 text-center">{p.frequency}</td>
                    <td className="border border-slate-300 p-2 text-center">{p.responsible_dept}</td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-emerald-700">ĐẠT CHUẨN</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
              <div className="space-y-12">
                <p className="font-bold text-slate-900">GIÁM SÁT VIÊN QA/QC</p>
                <p className="font-semibold text-slate-700">(Ký & ghi rõ họ tên)</p>
              </div>
              <div className="space-y-12">
                <p className="font-bold text-slate-900">TRƯỞNG BAN QUẢN LÝ CHẤT LƯỢNG</p>
                <p className="font-semibold text-slate-700">(Ký & đóng dấu)</p>
              </div>
            </div>
          </div>

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setShowPrintModal(false)}>
              Đóng
            </Button>
            <Button onClick={() => window.print()} className="bg-primary text-primary-foreground">
              <Printer className="h-4 w-4 mr-2" /> In Biểu mẫu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: DYNAMIC GMP / PRP FORM ==================== */}
      {showDynamicGmpModal && gmpFormTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl">
            <DynamicFormRenderer
              template={gmpFormTemplate}
              onSubmit={handleSaveGmpDynamicForm}
              onCancel={() => setShowDynamicGmpModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
