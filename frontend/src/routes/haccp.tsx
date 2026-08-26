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
  Activity,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Thermometer,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  RefreshCw,
  Sparkles,
  Printer,
  FileSpreadsheet,
  Layers,
  FileText,
  AlertOctagon,
  Clock,
  ChevronRight,
  TrendingUp,
  Percent,
  Check,
  XCircle,
  Copy,
  ScanLine,
  Sliders,
  Cpu,
  ArrowRight,
  ShieldX,
  Lock,
  Boxes,
  HelpCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import logoImg from "@/assets/logo.png";

export const Route = createFileRoute("/haccp")({
  head: () => ({
    meta: [
      { title: "Kế hoạch HACCP & Giám sát CCP – WCERT ISO 22000" },
      {
        name: "description",
        content:
          "Quản lý lưu đồ quy trình, ma trận phân tích mối nguy, điểm kiểm soát tới hạn (CCP/oPRP) và giám sát đo đạc thời gian thực theo tiêu chuẩn ISO 22000:2018 Điều khoản 8.5.",
      },
    ],
  }),
  component: () => (
    <AppShell module="haccp">
      <HACCPModule />
    </AppShell>
  ),
});

// ==================== INTERFACES ====================
interface ProcessStep {
  step_id: string;
  step_number: number;
  step_name: string;
  product_line: string;
  description?: string;
  is_ccp_or_oprp: boolean;
  hazard_count: number;
  created_at?: string;
}

interface HazardAnalysis {
  hazard_id: string;
  step_id: string;
  hazard_type: string; // BIOLOGICAL, CHEMICAL, PHYSICAL, ALLERGEN
  hazard_name: string;
  potential_consequence?: string;
  likelihood: number; // 1, 2, 3
  severity: number; // 1, 2, 3
  risk_score: number; // 1 - 9
  is_significant: boolean;
  control_measure: string;
  q1?: string;
  q2?: string;
  q3?: string;
  q4?: string;
  classification: string; // CCP, OPRP, PRP, NOT_SIGNIFICANT
  notes?: string;
  step_name?: string;
  step_number?: number;
  created_at?: string;
}

interface CCPDefinition {
  ccp_id: string;
  ccp_code: string;
  name: string;
  process_step_id?: string;
  hazard_description: string;
  critical_limit: {
    param?: string;
    min_val?: number;
    max_val?: number;
    unit?: string;
    time_min_sec?: number;
    histamine_max_ppm?: number;
    condition_text?: string;
  };
  monitoring_frequency: string;
  monitoring_method: string;
  corrective_action_plan: string;
  responsible_role: string;
  status: string; // ACTIVE, INACTIVE, REVIEWING
  step_name?: string;
  last_measured_value?: string;
  last_log_status?: string;
  created_at?: string;
}

interface CCPMonitoringLog {
  log_id: string;
  ccp_id: string;
  batch_number: string;
  test_time?: string;
  measured_value: number;
  unit: string;
  measured_details?: any;
  is_critical_limit_exceeded: boolean;
  status: string; // NORMAL, WARNING, CRITICAL
  deviation_action?: string;
  verification_status: string; // PENDING, VERIFIED, REJECTED
  notes?: string;
  ccp_code?: string;
  ccp_name?: string;
  critical_limit_text?: string;
  inspector_name?: string;
  verifier_name?: string;
  created_at?: string;
}

interface HACCPStats {
  total_steps: number;
  total_hazards: number;
  total_ccps: number;
  active_ccps: number;
  total_logs_today: number;
  normal_logs_count: number;
  warning_logs_count: number;
  critical_breaches_count: number;
  in_limit_percentage: number;
  total_prp_programs: number;
  prp_compliance_rate_avg: number;
}

interface AIHazardItem {
  hazard_type: string;
  hazard_name: string;
  potential_consequence: string;
  likelihood: number;
  severity: number;
  risk_score: number;
  is_significant: boolean;
  control_measure: string;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  recommended_classification: string;
}

// Preset samples for AI tools
const AI_STEP_PRESETS = [
  {
    title: "1. Hấp / Nấu gia nhiệt cá ngừ tiệt trùng",
    step_name: "Hấp chín tiệt trùng sơ bộ cá ngừ",
    product_line: "Chế biến Cá ngừ đại dương đóng hộp",
    description: "Hấp cá trong buồng nhiệt hơi nước để diệt vi sinh vật gây bệnh",
  },
  {
    title: "2. Dò kim loại đóng gói thành phẩm",
    step_name: "Dò kim loại băng tải tự động",
    product_line: "Chế biến Thực phẩm đông lạnh & Đóng gói",
    description: "Chạy thành phẩm qua cổng dò kim loại tự động trước khi đóng thùng carton",
  },
  {
    title: "3. Chiết rót vô trùng & Đóng nắp tự động",
    step_name: "Chiết rót vô trùng UHT",
    product_line: "Chế biến Nước ép trái cây tiệt trùng",
    description: "Chiết rót sản phẩm đã tiệt trùng UHT vào hộp giấy vô trùng",
  },
  {
    title: "4. Cấp đông nhanh IQF & Bảo quản kho lạnh",
    step_name: "Cấp đông băng chuyền IQF",
    product_line: "Chế biến Thủy hải sản xuất khẩu",
    description: "Cấp đông nhanh đạt tâm sản phẩm <= -18°C trong thời gian quy định",
  },
];

const AI_DEVIATION_PRESETS = [
  {
    title: "Sự cố 1: Nhiệt độ hấp cá ngừ chỉ đạt 71.5°C (Yêu cầu >= 75.0°C)",
    ccp_code: "CCP 2",
    measured_value: 71.5,
    unit: "°C",
    batch_number: "LOT-2026-DEV01",
    critical_limit_text: "Nhiệt độ tâm sản phẩm >= 75.0°C trong thời gian >= 15 giây",
    description: "Nồi hấp bị sụt áp suất hơi do rò rỉ van cấp nhiệt, nhiệt độ tâm chỉ đạt 71.5°C trong 10 giây.",
  },
  {
    title: "Sự cố 2: Máy dò kim loại không phát hiện que thử chuẩn Fe 1.5mm",
    ccp_code: "CCP 3",
    measured_value: 2.2,
    unit: "mm",
    batch_number: "LOT-2026-DEV02",
    critical_limit_text: "Fe <= 1.5mm; Non-Fe <= 2.0mm; SUS <= 2.5mm",
    description: "Kiểm tra đầu ca máy dò kim loại không phát tín hiệu còi báo khi que thử Fe 1.5mm đi qua cổng.",
  },
  {
    title: "Sự cố 3: Nhiệt độ tâm sau ra đông IQF chỉ đạt -14.2°C (Yêu cầu <= -18.0°C)",
    ccp_code: "oPRP 1",
    measured_value: -14.2,
    unit: "°C",
    batch_number: "LOT-2026-DEV03",
    critical_limit_text: "Nhiệt độ tâm sau IQF <= -18.0°C",
    description: "Băng chuyền chạy quá tải, nhiệt độ tâm cá fillet khi ra khỏi hầm cấp đông chỉ đạt -14.2°C.",
  },
];

// ==================== MAIN COMPONENT ====================
function HACCPModule() {
  const [activeTab, setActiveTab] = useState<"plan" | "hazards" | "logs" | "ai">("plan");

  // Data states
  const [stats, setStats] = useState<HACCPStats | null>(null);
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [hazards, setHazards] = useState<HazardAnalysis[]>([]);
  const [ccps, setCcps] = useState<CCPDefinition[]>([]);
  const [logs, setLogs] = useState<CCPMonitoringLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [ccpSearch, setCcpSearch] = useState("");
  const [ccpStatusFilter, setCcpStatusFilter] = useState("ALL");
  const [hzTypeFilter, setHzTypeFilter] = useState("ALL");
  const [hzClassFilter, setHzClassFilter] = useState("ALL");
  const [logCcpFilter, setLogCcpFilter] = useState("ALL");
  const [logStatusFilter, setLogStatusFilter] = useState("ALL");

  // Modals
  const [showCCPModal, setShowCCPModal] = useState(false);
  const [editingCCP, setEditingCCP] = useState<CCPDefinition | null>(null);
  const [ccpForm, setCcpForm] = useState({
    ccp_code: "",
    name: "",
    process_step_id: "",
    hazard_description: "",
    param_name: "Nhiệt độ tâm",
    min_val: "",
    max_val: "",
    unit: "°C",
    time_min_sec: "",
    condition_text: "",
    monitoring_frequency: "Mỗi mẻ",
    monitoring_method: "",
    corrective_action_plan: "",
    responsible_role: "QC / Trưởng ca Sản xuất",
    status: "ACTIVE",
  });

  const [showHazardModal, setShowHazardModal] = useState(false);
  const [editingHazard, setEditingHazard] = useState<HazardAnalysis | null>(null);
  const [hazardForm, setHazardForm] = useState({
    step_id: "",
    hazard_type: "BIOLOGICAL",
    hazard_name: "",
    potential_consequence: "",
    likelihood: 2,
    severity: 2,
    is_significant: true,
    control_measure: "",
    q1: "YES",
    q2: "NO",
    q3: "YES",
    q4: "NO",
    classification: "PRP",
    notes: "",
  });

  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedCCPForLog, setSelectedCCPForLog] = useState<CCPDefinition | null>(null);
  const [logForm, setLogForm] = useState({
    ccp_id: "",
    batch_number: "LOT-2026-B0" + Math.floor(Math.random() * 8 + 1),
    measured_value: "",
    unit: "°C",
    deviation_action: "",
    notes: "",
  });

  const [showPrintPlanModal, setShowPrintPlanModal] = useState(false);
  const [showPrintLogModal, setShowPrintLogModal] = useState(false);

  // AI states
  const [aiStepName, setAiStepName] = useState(AI_STEP_PRESETS[0].step_name);
  const [aiProductLine, setAiProductLine] = useState(AI_STEP_PRESETS[0].product_line);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHazardResults, setAiHazardResults] = useState<any | null>(null);

  const [aiDevPreset, setAiDevPreset] = useState(AI_DEVIATION_PRESETS[0]);
  const [aiDevLoading, setAiDevLoading] = useState(false);
  const [aiDevResults, setAiDevResults] = useState<any | null>(null);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [sRes, stRes, hzRes, ccpRes, lgRes] = await Promise.all([
        api.get("/haccp/stats"),
        api.get("/haccp/process-steps"),
        api.get("/haccp/hazards"),
        api.get("/haccp/ccp-definitions"),
        api.get("/haccp/ccp-logs"),
      ]);
      setStats(sRes.data);
      setSteps(stRes.data);
      setHazards(hzRes.data);
      setCcps(ccpRes.data);
      setLogs(lgRes.data);
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể tải dữ liệu HACCP & CCP: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered lists
  const filteredCCPs = useMemo(() => {
    return ccps.filter((c) => {
      const matchQ =
        !ccpSearch ||
        c.ccp_code.toLowerCase().includes(ccpSearch.toLowerCase()) ||
        c.name.toLowerCase().includes(ccpSearch.toLowerCase()) ||
        (c.step_name && c.step_name.toLowerCase().includes(ccpSearch.toLowerCase()));
      const matchStat = ccpStatusFilter === "ALL" || c.status === ccpStatusFilter;
      return matchQ && matchStat;
    });
  }, [ccps, ccpSearch, ccpStatusFilter]);

  const filteredHazards = useMemo(() => {
    return hazards.filter((h) => {
      const matchType = hzTypeFilter === "ALL" || h.hazard_type === hzTypeFilter;
      const matchClass = hzClassFilter === "ALL" || h.classification === hzClassFilter;
      return matchType && matchClass;
    });
  }, [hazards, hzTypeFilter, hzClassFilter]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchCcp = logCcpFilter === "ALL" || l.ccp_id === logCcpFilter;
      const matchStat = logStatusFilter === "ALL" || l.status === logStatusFilter;
      return matchCcp && matchStat;
    });
  }, [logs, logCcpFilter, logStatusFilter]);

  // ==================== ACTIONS: CCP ====================
  const handleOpenCreateCCP = () => {
    setEditingCCP(null);
    setCcpForm({
      ccp_code: `CCP ${ccps.length + 1}`,
      name: "",
      process_step_id: steps.length > 0 ? steps[0].step_id : "",
      hazard_description: "",
      param_name: "Nhiệt độ tâm",
      min_val: "75.0",
      max_val: "95.0",
      unit: "°C",
      time_min_sec: "15",
      condition_text: "Nhiệt độ tâm >= 75°C trong >= 15s",
      monitoring_frequency: "Mỗi mẻ",
      monitoring_method: "Nhiệt kế điện tử đâm tâm calibrated",
      corrective_action_plan: "Gia nhiệt bổ sung hoặc tái chế xử lý lại",
      responsible_role: "QC Công đoạn & Trưởng ca",
      status: "ACTIVE",
    });
    setShowCCPModal(true);
  };

  const handleOpenEditCCP = (ccp: CCPDefinition) => {
    setEditingCCP(ccp);
    const cl = ccp.critical_limit || {};
    setCcpForm({
      ccp_code: ccp.ccp_code,
      name: ccp.name,
      process_step_id: ccp.process_step_id || "",
      hazard_description: ccp.hazard_description,
      param_name: cl.param || "Nhiệt độ tâm",
      min_val: cl.min_val !== undefined && cl.min_val !== null ? String(cl.min_val) : "",
      max_val: cl.max_val !== undefined && cl.max_val !== null ? String(cl.max_val) : "",
      unit: cl.unit || "°C",
      time_min_sec: cl.time_min_sec !== undefined ? String(cl.time_min_sec) : "",
      condition_text: cl.condition_text || "",
      monitoring_frequency: ccp.monitoring_frequency,
      monitoring_method: ccp.monitoring_method,
      corrective_action_plan: ccp.corrective_action_plan,
      responsible_role: ccp.responsible_role,
      status: ccp.status,
    });
    setShowCCPModal(true);
  };

  const handleSaveCCP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const clObj: any = {
        param: ccpForm.param_name,
        min_val: ccpForm.min_val ? parseFloat(ccpForm.min_val) : null,
        max_val: ccpForm.max_val ? parseFloat(ccpForm.max_val) : null,
        unit: ccpForm.unit,
        condition_text: ccpForm.condition_text || `${ccpForm.param_name}: ${ccpForm.min_val || ""} ${ccpForm.unit}`,
      };
      if (ccpForm.time_min_sec) {
        clObj.time_min_sec = parseInt(ccpForm.time_min_sec);
      }

      const payload: any = {
        ccp_code: ccpForm.ccp_code.trim(),
        name: ccpForm.name.trim(),
        process_step_id: ccpForm.process_step_id || null,
        hazard_description: ccpForm.hazard_description.trim(),
        critical_limit: clObj,
        monitoring_frequency: ccpForm.monitoring_frequency,
        monitoring_method: ccpForm.monitoring_method,
        corrective_action_plan: ccpForm.corrective_action_plan,
        responsible_role: ccpForm.responsible_role,
        status: ccpForm.status,
      };

      if (editingCCP) {
        await api.put(`/haccp/ccp-definitions/${editingCCP.ccp_id}`, payload);
        toast.success(`Đã cập nhật điểm kiểm soát '${payload.ccp_code}' thành công`);
      } else {
        await api.post("/haccp/ccp-definitions", payload);
        toast.success(`Đã tạo điểm kiểm soát '${payload.ccp_code}' thành công`);
      }
      setShowCCPModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu điểm CCP");
    }
  };

  const handleDeleteCCP = async (ccp: CCPDefinition) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa điểm kiểm soát '${ccp.ccp_code} - ${ccp.name}'?`)) return;
    try {
      await api.delete(`/haccp/ccp-definitions/${ccp.ccp_id}`);
      toast.success("Đã xóa điểm kiểm soát thành công");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi xóa điểm CCP");
    }
  };

  // ==================== ACTIONS: LOGS ====================
  const handleOpenCreateLog = (ccp?: CCPDefinition) => {
    const target = ccp || ccps[0];
    if (!target) {
      toast.error("Vui lòng tạo ít nhất 1 điểm CCP trước khi ghi nhận đo đạc");
      return;
    }
    setSelectedCCPForLog(target);
    const cl = target.critical_limit || {};
    let defaultVal = "78.4";
    if (cl.unit === "mm") defaultVal = "1.4";
    else if (cl.unit === "°C" && (cl.max_val || 0) < 0) defaultVal = "-20.5";

    setLogForm({
      ccp_id: target.ccp_id,
      batch_number: "LOT-2026-B0" + Math.floor(Math.random() * 8 + 1),
      measured_value: defaultVal,
      unit: cl.unit || "°C",
      deviation_action: "",
      notes: "Ghi nhận kiểm tra theo ca",
    });
    setShowLogModal(true);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logForm.measured_value) {
      toast.error("Vui lòng nhập giá trị đo thực tế");
      return;
    }

    try {
      const payload = {
        ccp_id: logForm.ccp_id,
        batch_number: logForm.batch_number.trim(),
        measured_value: parseFloat(logForm.measured_value),
        unit: logForm.unit,
        deviation_action: logForm.deviation_action ? logForm.deviation_action.trim() : null,
        notes: logForm.notes ? logForm.notes.trim() : null,
      };

      const res = await api.post("/haccp/ccp-logs", payload);
      const saved = res.data;

      if (saved.status === "CRITICAL") {
        toast.error(`CẢNH BÁO VI PHẠM: Giá trị ${saved.measured_value}${saved.unit} vượt ngoài giới hạn tới hạn!`);
      } else if (saved.status === "WARNING") {
        toast.warning(`LƯU Ý: Giá trị ${saved.measured_value}${saved.unit} sát ngưỡng tới hạn.`);
      } else {
        toast.success("Đã ghi nhận đo đạc thành công (Trong giới hạn an toàn)");
      }
      setShowLogModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu kết quả đo");
    }
  };

  // ==================== ACTIONS: HAZARDS ====================
  const handleOpenCreateHazard = () => {
    setEditingHazard(null);
    setHazardForm({
      step_id: steps.length > 0 ? steps[0].step_id : "",
      hazard_type: "BIOLOGICAL",
      hazard_name: "",
      potential_consequence: "",
      likelihood: 2,
      severity: 2,
      is_significant: true,
      control_measure: "",
      q1: "YES",
      q2: "NO",
      q3: "YES",
      q4: "NO",
      classification: "PRP",
      notes: "",
    });
    setShowHazardModal(true);
  };

  const handleSaveHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        step_id: hazardForm.step_id,
        hazard_type: hazardForm.hazard_type,
        hazard_name: hazardForm.hazard_name.trim(),
        potential_consequence: hazardForm.potential_consequence.trim() || null,
        likelihood: hazardForm.likelihood,
        severity: hazardForm.severity,
        risk_score: hazardForm.likelihood * hazardForm.severity,
        is_significant: hazardForm.is_significant,
        control_measure: hazardForm.control_measure.trim(),
        q1: hazardForm.q1,
        q2: hazardForm.q2,
        q3: hazardForm.q3,
        q4: hazardForm.q4,
        classification: hazardForm.classification,
        notes: hazardForm.notes ? hazardForm.notes.trim() : null,
      };

      if (editingHazard) {
        await api.put(`/haccp/hazards/${editingHazard.hazard_id}`, payload);
        toast.success("Đã cập nhật mối nguy thành công");
      } else {
        await api.post("/haccp/hazards", payload);
        toast.success("Đã thêm mối nguy vào Bảng phân tích HACCP");
      }
      setShowHazardModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu mối nguy");
    }
  };

  const handleDeleteHazard = async (h: HazardAnalysis) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa mối nguy '${h.hazard_name}'?`)) return;
    try {
      await api.delete(`/haccp/hazards/${h.hazard_id}`);
      toast.success("Đã xóa mối nguy thành công");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi xóa mối nguy");
    }
  };

  // ==================== ACTIONS: AI ASSISTANTS ====================
  const handleRunAIHazardSuggest = async (stepName?: string, prodLine?: string) => {
    const sName = stepName || aiStepName;
    const pLine = prodLine || aiProductLine;
    try {
      setAiLoading(true);
      const res = await api.post("/haccp/ai/suggest-hazards", {
        step_name: sName,
        product_line: pLine,
      });
      setAiHazardResults(res.data);
      toast.success("Trợ lý AI đã phân tích ma trận mối nguy thành công!");
    } catch (err: any) {
      toast.error("Lỗi khi chạy AI phân tích mối nguy: " + (err.response?.data?.detail || err.message));
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAIHazard = async (item: AIHazardItem) => {
    if (steps.length === 0) {
      toast.error("Chưa có công đoạn nào trong hệ thống");
      return;
    }
    try {
      const payload = {
        step_id: steps[0].step_id,
        hazard_type: item.hazard_type,
        hazard_name: item.hazard_name,
        potential_consequence: item.potential_consequence,
        likelihood: item.likelihood,
        severity: item.severity,
        risk_score: item.risk_score,
        is_significant: item.is_significant,
        control_measure: item.control_measure,
        q1: item.q1,
        q2: item.q2,
        q3: item.q3,
        q4: item.q4,
        classification: item.recommended_classification,
      };
      await api.post("/haccp/hazards", payload);
      toast.success(`Đã thêm mối nguy '${item.hazard_name}' vào Kế hoạch HACCP!`);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi thêm: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleRunAIDeviation = async (preset?: any) => {
    const target = preset || aiDevPreset;
    try {
      setAiDevLoading(true);
      const res = await api.post("/haccp/ai/advise-ccp-deviation", {
        ccp_code: target.ccp_code,
        measured_value: target.measured_value,
        unit: target.unit,
        batch_number: target.batch_number,
        critical_limit_text: target.critical_limit_text,
        deviation_description: target.description,
      });
      setAiDevResults(res.data);
      toast.success("Trợ lý AI đã hoàn tất kế hoạch cô lập và xử lý sự cố CCP!");
    } catch (err: any) {
      toast.error("Lỗi khi chạy AI xử lý sai lệch: " + (err.response?.data?.detail || err.message));
    } finally {
      setAiDevLoading(false);
    }
  };

  // Helper colors
  const getRiskBadge = (score: number) => {
    if (score >= 6) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-500/10 text-rose-700 border border-rose-200">Cao ({score})</span>;
    if (score >= 3) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-700 border border-amber-200">Vừa ({score})</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-200">Thấp ({score})</span>;
  };

  const getClassBadge = (cls: string) => {
    if (cls === "CCP") return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-sm">CCP</span>;
    if (cls === "OPRP") return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">oPRP</span>;
    if (cls === "PRP") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">PRP</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-muted-foreground bg-muted">K.Ý nghĩa</span>;
  };

  const getLogStatusBadge = (s: string, exceeded: boolean) => {
    if (exceeded || s === "CRITICAL") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-600 text-white animate-pulse">
          <AlertOctagon className="h-3.5 w-3.5" /> VƯỢT GIỚI HẠN
        </span>
      );
    }
    if (s === "WARNING") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-800 border border-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Sát ngưỡng
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-800 border border-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Trong giới hạn
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <PageHeader
          title="Kế hoạch HACCP & Giám sát CCP Realtime"
          description="Thiết lập lưu đồ sản xuất, ma trận phân tích mối nguy 7 nguyên tắc, điểm kiểm soát tới hạn (CCP/oPRP) và giám sát thời gian thực theo tiêu chuẩn ISO 22000:2018 Điều khoản 8.5."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPrintPlanModal(true)} className="border-primary/30 text-primary hover:bg-primary/5">
            <Printer className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">In Kế hoạch HACCP (BM-HACCP-01)</span>
            <span className="sm:hidden">In BM-HACCP-01</span>
          </Button>
          <Button size="sm" onClick={() => handleOpenCreateLog()} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Ghi nhận Đo đạc
          </Button>
        </div>
      </div>

      {/* ==================== 4 KPI CARDS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: CCP Monitoring */}
        <div className="bg-card rounded-xl border p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CCP / oPRP Đang Giám Sát</span>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">{stats?.total_ccps ?? 4}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {stats?.active_ccps ?? 4} Hoạt động 100%
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Bao quát toàn bộ lưu đồ chế biến</p>
        </div>

        {/* Card 2: In-Limit Percentage */}
        <div className="bg-card rounded-xl border p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Đo Đạc Trong Ngưỡng</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{stats?.in_limit_percentage ?? 100}%</span>
            <span className="text-xs font-medium text-muted-foreground">({stats?.normal_logs_count ?? 5}/{stats?.total_logs_today ?? 6} mẻ)</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Đạt chỉ tiêu kiểm soát tới hạn</p>
        </div>

        {/* Card 3: Warnings */}
        <div className="bg-card rounded-xl border p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cảnh Báo Sát Ngưỡng</span>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">{stats?.warning_logs_count ?? 1}</span>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Tiệm cận ±5%</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Đã căn chỉnh thông số vận hành</p>
        </div>

        {/* Card 4: Critical Breaches */}
        <div className="bg-card rounded-xl border p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vi Phạm Tới Hạn (24h)</span>
            <div className={`p-2 rounded-lg ${(stats?.critical_breaches_count ?? 0) > 0 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-extrabold ${(stats?.critical_breaches_count ?? 0) > 0 ? "text-rose-600" : "text-foreground"}`}>
              {stats?.critical_breaches_count ?? 0}
            </span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">0 Lô Cách Ly</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Hệ thống an toàn tuyệt đối</p>
        </div>
      </div>

      {/* ==================== 4 TABS NAVIGATION ==================== */}
      <div className="border-b overflow-x-auto no-scrollbar">
        <div className="flex space-x-1 sm:space-x-4 min-w-max pb-1">
          <button
            onClick={() => setActiveTab("plan")}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "plan" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-4 w-4 shrink-0" />
            Kế hoạch CCP & oPRP ({ccps.length})
          </button>
          <button
            onClick={() => setActiveTab("hazards")}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "hazards" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            Bảng Phân Tích Mối Nguy ({hazards.length})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "logs" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-4 w-4 shrink-0" />
            Nhật Ký Giám Sát Realtime ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "ai" ? "border-purple-600 text-purple-600" : "border-transparent text-muted-foreground hover:text-purple-600"
            }`}
          >
            <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
            Trợ Lý AI HACCP & Khắc Phục
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: CCP & OPRP PLAN ==================== */}
      {activeTab === "plan" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã CCP, tên điểm kiểm soát..."
                className="pl-9 text-sm"
                value={ccpSearch}
                onChange={(e) => setCcpSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={ccpStatusFilter}
                onChange={(e) => setCcpStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="INACTIVE">Tạm dừng (INACTIVE)</option>
              </select>
              <Button onClick={handleOpenCreateCCP} size="sm" className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" /> Thêm điểm CCP mới
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCCPs.map((ccp) => {
              const cl = ccp.critical_limit || {};
              const isOprp = ccp.ccp_code.startsWith("oPRP");
              return (
                <div key={ccp.ccp_id} className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-3 py-1 rounded-lg text-sm font-black tracking-wider text-white ${isOprp ? "bg-amber-600" : "bg-rose-600"}`}>
                        {ccp.ccp_code}
                      </span>
                      <div>
                        <h4 className="font-bold text-base text-foreground">{ccp.name}</h4>
                        <p className="text-xs text-muted-foreground">Công đoạn: {ccp.step_name || "Chưa gán công đoạn"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditCCP(ccp)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCCP(ccp)} className="h-8 w-8 text-muted-foreground hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted/40 p-3 rounded-lg border text-xs space-y-2">
                    <div>
                      <span className="font-bold text-rose-700 dark:text-rose-400">⚡ Giới Hạn Tới Hạn (Critical Limit):</span>
                      <p className="font-medium text-foreground mt-0.5">{cl.condition_text || `${cl.param}: ${cl.min_val || ""} - ${cl.max_val || ""} ${cl.unit || ""}`}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-muted-foreground">Mối nguy cần kiểm soát:</span>
                      <p className="text-foreground">{ccp.hazard_description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Tần suất giám sát:</span>
                      <p className="font-semibold text-foreground">{ccp.monitoring_frequency}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Người phụ trách:</span>
                      <p className="font-semibold text-foreground">{ccp.responsible_role}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted-foreground mr-1">Đo gần nhất:</span>
                      {ccp.last_measured_value ? (
                        <span className="font-bold text-foreground">{ccp.last_measured_value}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Chưa có</span>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleOpenCreateLog(ccp)} className="text-xs h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                      <Plus className="h-3 w-3 mr-1" /> Nhập kết quả đo
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: HAZARD ANALYSIS MATRIX ==================== */}
      {activeTab === "hazards" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={hzTypeFilter}
                onChange={(e) => setHzTypeFilter(e.target.value)}
              >
                <option value="ALL">Tất cả loại mối nguy</option>
                <option value="BIOLOGICAL">Sinh học (BIOLOGICAL)</option>
                <option value="CHEMICAL">Hóa học (CHEMICAL)</option>
                <option value="PHYSICAL">Vật lý (PHYSICAL)</option>
                <option value="ALLERGEN">Dị nguyên (ALLERGEN)</option>
              </select>
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={hzClassFilter}
                onChange={(e) => setHzClassFilter(e.target.value)}
              >
                <option value="ALL">Tất cả phân loại</option>
                <option value="CCP">Điểm kiểm soát tới hạn (CCP)</option>
                <option value="OPRP">Chương trình tiên quyết vận hành (oPRP)</option>
                <option value="PRP">Chương trình tiên quyết (PRP)</option>
              </select>
            </div>
            <Button onClick={handleOpenCreateHazard} size="sm" className="bg-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> Thêm mối nguy phân tích
            </Button>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b text-muted-foreground font-semibold">
                    <th className="p-3 w-12 text-center">STT</th>
                    <th className="p-3">Công đoạn</th>
                    <th className="p-3">Mối nguy & Tác nhân</th>
                    <th className="p-3">Loại</th>
                    <th className="p-3 text-center">Tần suất (L)</th>
                    <th className="p-3 text-center">Nghiêm trọng (S)</th>
                    <th className="p-3 text-center">Rủi ro (L×S)</th>
                    <th className="p-3">Biện pháp kiểm soát</th>
                    <th className="p-3 text-center">Codex Q1-Q4</th>
                    <th className="p-3 text-center">Kết luận</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredHazards.map((h, idx) => (
                    <tr key={h.hazard_id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-center text-muted-foreground font-mono">{idx + 1}</td>
                      <td className="p-3 font-semibold text-foreground max-w-[150px]">
                        <span className="text-primary font-bold mr-1">#{h.step_number || 1}</span>
                        {h.step_name || "Công đoạn"}
                      </td>
                      <td className="p-3 max-w-[220px]">
                        <p className="font-bold text-foreground">{h.hazard_name}</p>
                        {h.potential_consequence && <p className="text-[11px] text-muted-foreground line-clamp-1">{h.potential_consequence}</p>}
                      </td>
                      <td className="p-3 font-medium text-foreground">{h.hazard_type}</td>
                      <td className="p-3 text-center font-bold">{h.likelihood}</td>
                      <td className="p-3 text-center font-bold">{h.severity}</td>
                      <td className="p-3 text-center">{getRiskBadge(h.risk_score)}</td>
                      <td className="p-3 text-foreground max-w-[200px]">{h.control_measure}</td>
                      <td className="p-3 text-center font-mono text-[11px] text-muted-foreground">
                        {h.q1}/{h.q2}/{h.q3}/{h.q4}
                      </td>
                      <td className="p-3 text-center">{getClassBadge(h.classification)}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteHazard(h)} className="h-7 w-7 text-muted-foreground hover:text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: REAL-TIME MONITORING LOGS ==================== */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={logCcpFilter}
                onChange={(e) => setLogCcpFilter(e.target.value)}
              >
                <option value="ALL">Tất cả điểm CCP</option>
                {ccps.map((c) => (
                  <option key={c.ccp_id} value={c.ccp_id}>
                    {c.ccp_code} - {c.name}
                  </option>
                ))}
              </select>
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả kết quả</option>
                <option value="NORMAL">Trong giới hạn (NORMAL)</option>
                <option value="WARNING">Cảnh báo (WARNING)</option>
                <option value="CRITICAL">Vượt giới hạn (CRITICAL)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPrintLogModal(true)}>
                <Printer className="h-4 w-4 mr-2" /> In Nhật ký CCP (BM-CCP-02)
              </Button>
              <Button onClick={() => handleOpenCreateLog()} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-4 w-4 mr-2" /> Ghi nhận đo mới
              </Button>
            </div>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60 border-b text-muted-foreground font-semibold">
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Điểm CCP</th>
                    <th className="p-3">Mã Lô/Mẻ</th>
                    <th className="p-3">Giới hạn tới hạn</th>
                    <th className="p-3 text-center">Giá trị đo thực tế</th>
                    <th className="p-3 text-center">Trạng thái</th>
                    <th className="p-3">Hành động khắc phục (nếu có)</th>
                    <th className="p-3">Người kiểm tra</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map((l) => (
                    <tr key={l.log_id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground font-mono">
                        {l.test_time ? new Date(l.test_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Vừa đo"}
                      </td>
                      <td className="p-3 font-bold text-foreground">
                        <span className="text-primary mr-1">[{l.ccp_code}]</span>
                        {l.ccp_name}
                      </td>
                      <td className="p-3 font-mono font-bold text-foreground">{l.batch_number}</td>
                      <td className="p-3 text-muted-foreground max-w-[200px]">{l.critical_limit_text || "Theo tiêu chuẩn"}</td>
                      <td className="p-3 text-center font-extrabold text-sm text-foreground">
                        {l.measured_value} {l.unit}
                      </td>
                      <td className="p-3 text-center">{getLogStatusBadge(l.status, l.is_critical_limit_exceeded)}</td>
                      <td className="p-3 text-foreground max-w-[220px]">
                        {l.deviation_action ? (
                          <span className="text-rose-700 font-medium">{l.deviation_action}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Không có sai lệch</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{l.inspector_name || "QC Ca Trưởng"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: AI HACCP ASSISTANTS ==================== */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tool 1: AI Hazard Matrix Generator */}
            <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Trợ Lý AI Phân Tích Mối Nguy HACCP</h3>
                  <p className="text-xs text-muted-foreground">Tự động sinh ma trận rủi ro & Cây quyết định Codex theo công đoạn</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Chọn công đoạn mẫu có sẵn:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AI_STEP_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setAiStepName(p.step_name);
                        setAiProductLine(p.product_line);
                        handleRunAIHazardSuggest(p.step_name, p.product_line);
                      }}
                      className="text-left p-2.5 rounded-lg border text-xs hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all"
                    >
                      <p className="font-bold text-foreground">{p.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{p.product_line}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-semibold">Tên công đoạn tùy biến:</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ví dụ: Rửa khử trùng rau củ, Hấp bánh mì..."
                      className="text-sm"
                      value={aiStepName}
                      onChange={(e) => setAiStepName(e.target.value)}
                    />
                    <Button onClick={() => handleRunAIHazardSuggest()} disabled={aiLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
                      {aiLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                      Phân tích AI
                    </Button>
                  </div>
                </div>
              </div>

              {/* AI Results */}
              {aiHazardResults && (
                <div className="mt-4 p-4 rounded-xl bg-purple-500/5 border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-700">Độ tin cậy AI: {aiHazardResults.confidence_score}%</span>
                    <span className="text-muted-foreground">{aiHazardResults.product_line}</span>
                  </div>
                  <p className="text-xs text-foreground italic bg-background/80 p-2.5 rounded border">{aiHazardResults.ai_rationale}</p>
                  <div className="space-y-2">
                    {aiHazardResults.identified_hazards.map((item: AIHazardItem, idx: number) => (
                      <div key={idx} className="bg-background p-3 rounded-lg border text-xs space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{item.hazard_name}</span>
                          {getClassBadge(item.recommended_classification)}
                        </div>
                        <p className="text-muted-foreground">Biện pháp: {item.control_measure}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Likelihood: {item.likelihood} · Severity: {item.severity} · Risk: {item.risk_score}
                          </span>
                          <Button size="sm" variant="outline" onClick={() => handleApplyAIHazard(item)} className="text-[11px] h-6 text-purple-700 hover:bg-purple-50">
                            + Thêm vào Kế hoạch
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tool 2: AI CCP Deviation Containment Advisor */}
            <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
                  <AlertOctagon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Trợ Lý AI Xử Lý Sự Cố Sai Lệch CCP</h3>
                  <p className="text-xs text-muted-foreground">Tư vấn cô lập lô hàng & Hành động khắc phục theo ISO 22000 Điều khoản 8.9.2</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Chọn tình huống sự cố mẫu:</Label>
                <div className="space-y-2">
                  {AI_DEVIATION_PRESETS.map((dev, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setAiDevPreset(dev);
                        handleRunAIDeviation(dev);
                      }}
                      className="w-full text-left p-2.5 rounded-lg border text-xs hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all"
                    >
                      <p className="font-bold text-rose-700 dark:text-rose-400">{dev.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{dev.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Deviation Results */}
              {aiDevResults && (
                <div className="mt-4 p-4 rounded-xl bg-rose-500/5 border border-rose-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between font-bold text-rose-700">
                    <span>MỨC ĐỘ: {aiDevResults.severity_level}</span>
                    <span className="text-[11px] font-normal text-muted-foreground">{aiDevResults.iso_clause_reference}</span>
                  </div>

                  <div>
                    <span className="font-bold text-rose-800">1. Biện pháp cô lập tức thì (Containment):</span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-foreground">
                      {aiDevResults.immediate_containment.map((c: string, idx: number) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="font-bold text-foreground">2. Giả định nguyên nhân gốc rễ (Root Cause):</span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-muted-foreground">
                      {aiDevResults.root_cause_hypothesis.map((r: string, idx: number) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="font-bold text-foreground">3. Kế hoạch xử lý sản phẩm không an toàn (Disposition):</span>
                    <p className="mt-1 text-foreground bg-background p-2 rounded border">{aiDevResults.disposition_plan}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT CCP ==================== */}
      <Dialog open={showCCPModal} onOpenChange={setShowCCPModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCCP ? "Chỉnh sửa Điểm Kiểm Soát Tới Hạn" : "Khai báo Điểm Kiểm Soát Tới Hạn (CCP / oPRP)"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCCP} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mã hiệu CCP *</Label>
                <Input
                  placeholder="Ví dụ: CCP 1, CCP 2, oPRP 1"
                  required
                  value={ccpForm.ccp_code}
                  onChange={(e) => setCcpForm({ ...ccpForm, ccp_code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tên điểm kiểm soát *</Label>
                <Input
                  placeholder="Ví dụ: Gia nhiệt tiệt trùng"
                  required
                  value={ccpForm.name}
                  onChange={(e) => setCcpForm({ ...ccpForm, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Công đoạn sản xuất liên kết</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background text-foreground"
                  value={ccpForm.process_step_id}
                  onChange={(e) => setCcpForm({ ...ccpForm, process_step_id: e.target.value })}
                >
                  {steps.map((st) => (
                    <option key={st.step_id} value={st.step_id}>
                      Bước {st.step_number}: {st.step_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tần suất giám sát</Label>
                <Input
                  placeholder="Mỗi mẻ, Liên tục, Mỗi 2 giờ"
                  value={ccpForm.monitoring_frequency}
                  onChange={(e) => setCcpForm({ ...ccpForm, monitoring_frequency: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Mối nguy cần kiểm soát *</Label>
              <Input
                placeholder="Mô tả mối nguy sinh học / hóa học / vật lý"
                required
                value={ccpForm.hazard_description}
                onChange={(e) => setCcpForm({ ...ccpForm, hazard_description: e.target.value })}
              />
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border space-y-3">
              <span className="font-bold text-primary text-xs">Cấu hình Giới hạn tới hạn (Critical Limit):</span>
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1 col-span-2">
                  <Label className="text-[11px]">Thông số đo</Label>
                  <Input
                    placeholder="Nhiệt độ tâm, Kích thước kim loại"
                    value={ccpForm.param_name}
                    onChange={(e) => setCcpForm({ ...ccpForm, param_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Ngưỡng Min</Label>
                  <Input
                    placeholder="75.0"
                    type="number"
                    step="0.1"
                    value={ccpForm.min_val}
                    onChange={(e) => setCcpForm({ ...ccpForm, min_val: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Ngưỡng Max</Label>
                  <Input
                    placeholder="95.0"
                    type="number"
                    step="0.1"
                    value={ccpForm.max_val}
                    onChange={(e) => setCcpForm({ ...ccpForm, max_val: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Mô tả điều kiện tới hạn hiển thị:</Label>
                <Input
                  placeholder="Ví dụ: Nhiệt độ tâm >= 75.0°C trong thời gian >= 15 giây"
                  value={ccpForm.condition_text}
                  onChange={(e) => setCcpForm({ ...ccpForm, condition_text: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Phương pháp & Thiết bị đo đạc *</Label>
              <Input
                placeholder="Cảm biến nhiệt SCADA, máy dò kim loại que chuẩn"
                required
                value={ccpForm.monitoring_method}
                onChange={(e) => setCcpForm({ ...ccpForm, monitoring_method: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Kế hoạch hành động khắc phục khi vượt ngưỡng *</Label>
              <Input
                placeholder="Dừng chuyền, dán nhãn cách ly mẻ, gia nhiệt bổ sung..."
                required
                value={ccpForm.corrective_action_plan}
                onChange={(e) => setCcpForm({ ...ccpForm, corrective_action_plan: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCCPModal(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                {editingCCP ? "Lưu thay đổi" : "Tạo điểm CCP"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: ADD REALTIME CCP LOG ==================== */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ghi nhận Đo đạc Điểm Kiểm Soát CCP</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveLog} className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Chọn Điểm CCP *</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-xs bg-background text-foreground"
                value={logForm.ccp_id}
                onChange={(e) => {
                  const target = ccps.find((c) => c.ccp_id === e.target.value);
                  setSelectedCCPForLog(target || null);
                  setLogForm({
                    ...logForm,
                    ccp_id: e.target.value,
                    unit: target?.critical_limit?.unit || "°C",
                  });
                }}
              >
                {ccps.map((c) => (
                  <option key={c.ccp_id} value={c.ccp_id}>
                    {c.ccp_code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCCPForLog && (
              <div className="p-3 bg-muted/40 rounded-lg border text-xs">
                <span className="font-bold text-rose-700">Giới hạn tới hạn:</span>
                <p className="font-medium text-foreground">{selectedCCPForLog.critical_limit?.condition_text || "Theo quy định"}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mã mẻ / Lô sản xuất *</Label>
                <Input
                  placeholder="LOT-2026-B01"
                  required
                  value={logForm.batch_number}
                  onChange={(e) => setLogForm({ ...logForm, batch_number: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Giá trị đo thực tế * ({logForm.unit})</Label>
                <Input
                  placeholder="78.4"
                  type="number"
                  step="0.01"
                  required
                  value={logForm.measured_value}
                  onChange={(e) => setLogForm({ ...logForm, measured_value: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Hành động khắc phục (nếu vượt ngưỡng)</Label>
              <Input
                placeholder="Nhập hành động cô lập mẻ nếu có sự cố..."
                value={logForm.deviation_action}
                onChange={(e) => setLogForm({ ...logForm, deviation_action: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ghi chú kiểm tra</Label>
              <Input
                placeholder="Tình trạng máy móc, áp suất..."
                value={logForm.notes}
                onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowLogModal(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Lưu kết quả đo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: ADD / EDIT HAZARD ==================== */}
      <Dialog open={showHazardModal} onOpenChange={setShowHazardModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingHazard ? "Chỉnh sửa Mối Nguy" : "Thêm Mối Nguy Phân Tích (7 Nguyên Tắc HACCP)"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveHazard} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Công đoạn sản xuất *</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background text-foreground"
                  value={hazardForm.step_id}
                  onChange={(e) => setHazardForm({ ...hazardForm, step_id: e.target.value })}
                >
                  {steps.map((st) => (
                    <option key={st.step_id} value={st.step_id}>
                      Bước {st.step_number}: {st.step_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Loại mối nguy *</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background text-foreground"
                  value={hazardForm.hazard_type}
                  onChange={(e) => setHazardForm({ ...hazardForm, hazard_type: e.target.value })}
                >
                  <option value="BIOLOGICAL">Sinh học (BIOLOGICAL)</option>
                  <option value="CHEMICAL">Hóa học (CHEMICAL)</option>
                  <option value="PHYSICAL">Vật lý (PHYSICAL)</option>
                  <option value="ALLERGEN">Dị nguyên (ALLERGEN)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tên mối nguy & tác nhân cụ thể *</Label>
              <Input
                placeholder="Ví dụ: Salmonella, Vi khuẩn Listeria, Mảnh kim loại vụn"
                required
                value={hazardForm.hazard_name}
                onChange={(e) => setHazardForm({ ...hazardForm, hazard_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Khả năng xảy ra (Likelihood 1-3)</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background text-foreground font-bold"
                  value={hazardForm.likelihood}
                  onChange={(e) => setHazardForm({ ...hazardForm, likelihood: parseInt(e.target.value) })}
                >
                  <option value={1}>1: Thấp (T)</option>
                  <option value={2}>2: Vừa (V)</option>
                  <option value={3}>3: Cao (C)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mức độ nghiêm trọng (Severity 1-3)</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background text-foreground font-bold"
                  value={hazardForm.severity}
                  onChange={(e) => setHazardForm({ ...hazardForm, severity: parseInt(e.target.value) })}
                >
                  <option value={1}>1: Thấp (T)</option>
                  <option value={2}>2: Vừa (V)</option>
                  <option value={3}>3: Cao (C)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Điểm rủi ro (L × S)</Label>
                <div className="h-9 border rounded-md flex items-center justify-center font-black text-sm bg-muted/40">
                  {hazardForm.likelihood * hazardForm.severity}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Biện pháp kiểm soát đề xuất *</Label>
              <Input
                placeholder="Kiểm soát nhiệt độ tâm >= 75°C trong 15s"
                required
                value={hazardForm.control_measure}
                onChange={(e) => setHazardForm({ ...hazardForm, control_measure: e.target.value })}
              />
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border space-y-2">
              <span className="font-bold text-primary text-xs">Cây Quyết Định Codex (Decision Tree):</span>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-[10px]">Q1: Có kiểm soát?</Label>
                  <select
                    className="w-full border rounded px-2 py-1 text-xs bg-background"
                    value={hazardForm.q1}
                    onChange={(e) => setHazardForm({ ...hazardForm, q1: e.target.value })}
                  >
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[10px]">Q2: Loại trừ tại đây?</Label>
                  <select
                    className="w-full border rounded px-2 py-1 text-xs bg-background"
                    value={hazardForm.q2}
                    onChange={(e) => setHazardForm({ ...hazardForm, q2: e.target.value })}
                  >
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[10px]">Q3: Nguy cơ nhiễm?</Label>
                  <select
                    className="w-full border rounded px-2 py-1 text-xs bg-background"
                    value={hazardForm.q3}
                    onChange={(e) => setHazardForm({ ...hazardForm, q3: e.target.value })}
                  >
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[10px]">Q4: Bước sau loại trừ?</Label>
                  <select
                    className="w-full border rounded px-2 py-1 text-xs bg-background"
                    value={hazardForm.q4}
                    onChange={(e) => setHazardForm({ ...hazardForm, q4: e.target.value })}
                  >
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Kết luận phân loại *</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-xs bg-background text-foreground font-bold"
                value={hazardForm.classification}
                onChange={(e) => setHazardForm({ ...hazardForm, classification: e.target.value })}
              >
                <option value="CCP">Điểm kiểm soát tới hạn (CCP)</option>
                <option value="OPRP">Chương trình tiên quyết vận hành (oPRP)</option>
                <option value="PRP">Chương trình tiên quyết (PRP)</option>
                <option value="NOT_SIGNIFICANT">Không có ý nghĩa (NOT_SIGNIFICANT)</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowHazardModal(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                Lưu mối nguy
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: PRINT HACCP PLAN (BM-HACCP-01) ==================== */}
      <Dialog open={showPrintPlanModal} onOpenChange={setShowPrintPlanModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Bảng Kế Hoạch HACCP Tổng Thể (BM-HACCP-01)</DialogTitle>
          </DialogHeader>

          <div id="printable-haccp-plan" className="bg-white text-slate-900 p-8 rounded-lg border font-sans text-xs space-y-6">
            {/* Header Document */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="WCERT Logo" className="h-14 w-auto object-contain" />
                <div>
                  <h2 className="font-extrabold text-base tracking-tight text-slate-900">CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT</h2>
                  <p className="text-[11px] text-slate-600">Hệ thống Quản lý An toàn Thực phẩm theo ISO 22000:2018</p>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <p className="font-bold text-slate-900 text-sm">BIỂU MẪU: BM-HACCP-01</p>
                <p>Ban hành: Lần 03 / Ngày: 26/08/2026</p>
                <p>Tiêu chuẩn: ISO 22000:2018 Clause 8.5</p>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-lg font-black text-slate-900 uppercase">KẾ HOẠCH KIỂM SOÁT MỐI NGUY HACCP & oPRP</h1>
              <p className="text-xs text-slate-600 italic">Dây chuyền sản xuất: Chế biến Cá ngừ đại dương xuất khẩu EU/US</p>
            </div>

            {/* Main HACCP Table */}
            <table className="w-full border-collapse border border-slate-400 text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-900 text-center">
                  <th className="border border-slate-400 p-2 w-16">Mã hiệu</th>
                  <th className="border border-slate-400 p-2 w-32">Công đoạn</th>
                  <th className="border border-slate-400 p-2">Mối nguy có ý nghĩa</th>
                  <th className="border border-slate-400 p-2">Giới hạn tới hạn (Critical Limit)</th>
                  <th className="border border-slate-400 p-2 w-28">Tần suất & Cách đo</th>
                  <th className="border border-slate-400 p-2">Hành động khắc phục</th>
                  <th className="border border-slate-400 p-2 w-24">Người giám sát</th>
                </tr>
              </thead>
              <tbody>
                {ccps.map((c) => {
                  const cl = c.critical_limit || {};
                  return (
                    <tr key={c.ccp_id} className="border-b border-slate-300">
                      <td className="border border-slate-300 p-2 font-black text-center text-rose-700">{c.ccp_code}</td>
                      <td className="border border-slate-300 p-2 font-semibold">{c.step_name || c.name}</td>
                      <td className="border border-slate-300 p-2">{c.hazard_description}</td>
                      <td className="border border-slate-300 p-2 font-bold text-slate-900">{cl.condition_text || "Theo quy định"}</td>
                      <td className="border border-slate-300 p-2 text-center">
                        {c.monitoring_frequency}
                        <div className="text-[10px] text-slate-500 mt-0.5">{c.monitoring_method}</div>
                      </td>
                      <td className="border border-slate-300 p-2">{c.corrective_action_plan}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium">{c.responsible_role}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs">
              <div className="space-y-12">
                <p className="font-bold text-slate-900">TRƯỞNG ĐỘI HACCP</p>
                <p className="font-semibold text-slate-700">(Ký & ghi rõ họ tên)</p>
              </div>
              <div className="space-y-12">
                <p className="font-bold text-slate-900">TRƯỞNG BAN QLCL (QA/QC)</p>
                <p className="font-semibold text-slate-700">(Ký & ghi rõ họ tên)</p>
              </div>
              <div className="space-y-12">
                <p className="font-bold text-slate-900">TỔNG GIÁM ĐỐC PHÊ DUYỆT</p>
                <p className="font-semibold text-slate-700">(Ký, đóng dấu)</p>
              </div>
            </div>
          </div>

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setShowPrintPlanModal(false)}>
              Đóng
            </Button>
            <Button onClick={() => window.print()} className="bg-primary text-primary-foreground">
              <Printer className="h-4 w-4 mr-2" /> In Biểu mẫu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: PRINT CCP LOG SHEET (BM-CCP-02) ==================== */}
      <Dialog open={showPrintLogModal} onOpenChange={setShowPrintLogModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Phiếu Nhật Ký Giám Sát CCP (BM-CCP-02)</DialogTitle>
          </DialogHeader>

          <div id="printable-ccp-log" className="bg-white text-slate-900 p-8 rounded-lg border font-sans text-xs space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="WCERT Logo" className="h-14 w-auto object-contain" />
                <div>
                  <h2 className="font-extrabold text-base tracking-tight text-slate-900">CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT</h2>
                  <p className="text-[11px] text-slate-600">Phòng Quản lý Chất lượng (QA/QC) & Bộ phận Sản xuất</p>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <p className="font-bold text-slate-900 text-sm">BIỂU MẪU: BM-CCP-02</p>
                <p>Ngày ghi nhận: {new Date().toLocaleDateString("vi-VN")}</p>
                <p>Ca sản xuất: Ca sáng (06:00 - 14:00)</p>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-lg font-black text-slate-900 uppercase">NHẬT KÝ THEO DÕI ĐIỂM KIỂM SOÁT TỚI HẠN (CCP)</h1>
            </div>

            <table className="w-full border-collapse border border-slate-400 text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-900 text-center">
                  <th className="border border-slate-400 p-2 w-16">Giờ đo</th>
                  <th className="border border-slate-400 p-2 w-20">Điểm CCP</th>
                  <th className="border border-slate-400 p-2 w-28">Mã mẻ/Lô</th>
                  <th className="border border-slate-400 p-2">Giới hạn tới hạn</th>
                  <th className="border border-slate-400 p-2 w-24">Giá trị đo</th>
                  <th className="border border-slate-400 p-2 w-24">Kết quả</th>
                  <th className="border border-slate-400 p-2">Hành động khắc phục</th>
                  <th className="border border-slate-400 p-2 w-24">KCS kiểm tra</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.log_id} className="border-b border-slate-300">
                    <td className="border border-slate-300 p-2 text-center font-mono">
                      {l.test_time ? new Date(l.test_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "07:30"}
                    </td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-rose-700">{l.ccp_code}</td>
                    <td className="border border-slate-300 p-2 font-mono font-bold text-center">{l.batch_number}</td>
                    <td className="border border-slate-300 p-2">{l.critical_limit_text || "Theo tiêu chuẩn"}</td>
                    <td className="border border-slate-300 p-2 text-center font-black">
                      {l.measured_value} {l.unit}
                    </td>
                    <td className="border border-slate-300 p-2 text-center font-bold">
                      {l.is_critical_limit_exceeded ? (
                        <span className="text-rose-700">VI PHẠM</span>
                      ) : (
                        <span className="text-emerald-700">ĐẠT</span>
                      )}
                    </td>
                    <td className="border border-slate-300 p-2">{l.deviation_action || "Không có sai lệch"}</td>
                    <td className="border border-slate-300 p-2 text-center">{l.inspector_name || "QC Ca"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
              <div className="space-y-12">
                <p className="font-bold text-slate-900">NGƯỜI GHI NHẬT KÝ (QC/KCS)</p>
                <p className="font-semibold text-slate-700">(Ký & ghi rõ họ tên)</p>
              </div>
              <div className="space-y-12">
                <p className="font-bold text-slate-900">TRƯỞNG CA SẢN XUẤT / QA THẨM TRA</p>
                <p className="font-semibold text-slate-700">(Ký & ghi rõ họ tên)</p>
              </div>
            </div>
          </div>

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setShowPrintLogModal(false)}>
              Đóng
            </Button>
            <Button onClick={() => window.print()} className="bg-primary text-primary-foreground">
              <Printer className="h-4 w-4 mr-2" /> In Biểu mẫu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
