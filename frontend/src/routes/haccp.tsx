import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState, useMemo } from "react";
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
  Workflow,
  Eye,
  GitBranch,
  Save,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import logoImg from "@/assets/logo.png";
import { WorkflowBuilder, type WorkflowTemplateData } from "@/components/builder/WorkflowBuilder";
import { DynamicFormRenderer } from "@/components/builder/DynamicFormRenderer";
import type { FormTemplateData } from "@/components/builder/FormBuilder";

export const Route = createFileRoute("/haccp")({
  head: () => ({
    meta: [
      { title: "Kế hoạch HACCP & Giám sát CCP – WCERT ISO 22000" },
      {
        name: "description",
        content:
          "Quản lý kế hoạch HACCP, lưu đồ quy trình công đoạn, ma trận phân tích mối nguy, điểm kiểm soát tới hạn (CCP/oPRP) và giám sát đo đạc thời gian thực theo tiêu chuẩn ISO 22000:2018 Điều khoản 8.5.",
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
interface HACCPPlan {
  plan_id: string;
  plan_code: string;
  plan_name: string;
  product_line: string;
  version: string;
  team_leader: string;
  approved_by?: string;
  effective_date?: string;
  scope_description?: string;
  status: string; // ACTIVE, DRAFT, ARCHIVED
  step_count?: number;
  ccp_count?: number;
  created_at?: string;
}

interface ProcessStep {
  step_id: string;
  plan_id?: string;
  step_number: number;
  step_name: string;
  product_line: string;
  description?: string;
  is_ccp_or_oprp: boolean;
  hazard_count: number;
  plan_name?: string;
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
  const [activeTab, setActiveTab] = useState<"flowchart" | "ccp_plan" | "hazards" | "logs" | "ai">("flowchart");

  // Data states
  const [stats, setStats] = useState<HACCPStats | null>(null);
  const [plans, setPlans] = useState<HACCPPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("ALL");
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

  // HACCP Plan Modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<HACCPPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    plan_code: "",
    plan_name: "",
    product_line: "Chế biến Thủy hải sản",
    version: "1.0",
    team_leader: "Nguyễn Văn An (Trưởng ban HACCP / QA)",
    approved_by: "Lê Hoàng Quân (Giám đốc Nhà máy)",
    scope_description: "",
    status: "ACTIVE",
  });

  // Step Modal
  const [showStepModal, setShowStepModal] = useState(false);
  const [editingStep, setEditingStep] = useState<ProcessStep | null>(null);
  const [stepForm, setStepForm] = useState({
    plan_id: "",
    step_number: 1,
    step_name: "",
    product_line: "Chế biến Thủy hải sản",
    description: "",
    is_ccp_or_oprp: false,
  });

  // Workflow Studio Modal
  const [showWorkflowStudio, setShowWorkflowStudio] = useState(false);

  // CCP Modal
  const [showCCPModal, setShowCCPModal] = useState(false);
  const [editingCCP, setEditingCCP] = useState<CCPDefinition | null>(null);
  const [ccpModalPlanId, setCcpModalPlanId] = useState<string>("");
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

  // Hazard Modal
  const [showHazardModal, setShowHazardModal] = useState(false);
  const [editingHazard, setEditingHazard] = useState<HazardAnalysis | null>(null);
  const [hazardModalPlanId, setHazardModalPlanId] = useState<string>("");
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

  // Log Modal
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

  // Dynamic Form Monitor Modal
  const [showDynamicFormLog, setShowDynamicFormLog] = useState(false);
  const [formTemplateCCP, setFormTemplateCCP] = useState<FormTemplateData | null>(null);

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
      const [sRes, plRes, stRes, hzRes, ccpRes, lgRes] = await Promise.all([
        api.get("/haccp/stats"),
        api.get("/haccp/plans"),
        api.get("/haccp/process-steps"),
        api.get("/haccp/hazards"),
        api.get("/haccp/ccp-definitions"),
        api.get("/haccp/ccp-logs"),
      ]);
      setStats(sRes.data);
      setPlans(plRes.data);
      if (plRes.data.length > 0 && selectedPlanId === "ALL") {
        // keep as ALL or select first
      }
      setSteps(stRes.data);
      setHazards(hzRes.data);
      setCcps(ccpRes.data);
      setLogs(lgRes.data);
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể tải dữ liệu HACCP: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered steps by selected plan
  const filteredSteps = useMemo(() => {
    if (selectedPlanId === "ALL") return steps;
    return steps.filter((s) => s.plan_id === selectedPlanId);
  }, [steps, selectedPlanId]);

  // Selected Plan Object
  const currentPlan = useMemo(() => {
    if (selectedPlanId === "ALL") return plans[0] || null;
    return plans.find((p) => p.plan_id === selectedPlanId) || plans[0] || null;
  }, [plans, selectedPlanId]);

  // Filtered CCPs
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

  // Filtered Hazards
  const filteredHazards = useMemo(() => {
    return hazards.filter((h) => {
      const matchType = hzTypeFilter === "ALL" || h.hazard_type === hzTypeFilter;
      const matchClass = hzClassFilter === "ALL" || h.classification === hzClassFilter;
      return matchType && matchClass;
    });
  }, [hazards, hzTypeFilter, hzClassFilter]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchCcp = logCcpFilter === "ALL" || l.ccp_id === logCcpFilter;
      const matchStat = logStatusFilter === "ALL" || l.status === logStatusFilter;
      return matchCcp && matchStat;
    });
  }, [logs, logCcpFilter, logStatusFilter]);

  // ==================== ACTIONS: HACCP PLANS ====================
  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      plan_code: `HACCP-2026-P0${plans.length + 1}`,
      plan_name: "Kế hoạch HACCP Dây chuyền Chế biến Mới",
      product_line: "Chế biến Thủy hải sản",
      version: "1.0",
      team_leader: "Trưởng ban HACCP / QA",
      approved_by: "Giám đốc Nhà máy",
      scope_description: "Áp dụng cho toàn bộ dây chuyền sản xuất từ khâu tiếp nhận nguyên liệu đến lưu kho thành phẩm.",
      status: "ACTIVE",
    });
    setShowPlanModal(true);
  };

  const handleOpenEditPlan = (plan: HACCPPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      plan_code: plan.plan_code,
      plan_name: plan.plan_name,
      product_line: plan.product_line,
      version: plan.version,
      team_leader: plan.team_leader,
      approved_by: plan.approved_by || "Giám đốc Nhà máy",
      scope_description: plan.scope_description || "",
      status: plan.status,
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.plan_code.trim() || !planForm.plan_name.trim()) {
      toast.error("Vui lòng nhập đầy đủ mã và tên Kế hoạch HACCP!");
      return;
    }
    try {
      if (editingPlan) {
        await api.put(`/haccp/plans/${editingPlan.plan_id}`, planForm);
        toast.success(`Đã cập nhật Kế hoạch HACCP '${planForm.plan_code}' thành công!`);
      } else {
        const res = await api.post("/haccp/plans", planForm);
        toast.success(`Đã tạo mới Kế hoạch HACCP '${planForm.plan_code}' thành công!`);
        setSelectedPlanId(res.data.plan_id);
      }
      setShowPlanModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu Kế hoạch HACCP");
    }
  };

  // ==================== ACTIONS: PROCESS STEPS ====================
  const handleOpenCreateStep = () => {
    setEditingStep(null);
    setStepForm({
      plan_id: currentPlan?.plan_id || (plans[0]?.plan_id || ""),
      step_number: filteredSteps.length + 1,
      step_name: "",
      product_line: currentPlan?.product_line || "Chế biến Thủy hải sản",
      description: "",
      is_ccp_or_oprp: false,
    });
    setShowStepModal(true);
  };

  const handleOpenEditStep = (step: ProcessStep) => {
    setEditingStep(step);
    setStepForm({
      plan_id: step.plan_id || currentPlan?.plan_id || "",
      step_number: step.step_number,
      step_name: step.step_name,
      product_line: step.product_line,
      description: step.description || "",
      is_ccp_or_oprp: step.is_ccp_or_oprp,
    });
    setShowStepModal(true);
  };

  const handleSaveStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepForm.step_name.trim()) {
      toast.error("Vui lòng nhập tên công đoạn sản xuất!");
      return;
    }
    try {
      if (editingStep) {
        await api.put(`/haccp/process-steps/${editingStep.step_id}`, stepForm);
        toast.success(`Đã cập nhật công đoạn '${stepForm.step_name}' thành công!`);
      } else {
        await api.post("/haccp/process-steps", stepForm);
        toast.success(`Đã thêm công đoạn '${stepForm.step_name}' vào lưu đồ!`);
      }
      setShowStepModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu bước công đoạn");
    }
  };

  const handleDeleteStep = async (step: ProcessStep) => {
    if (!confirm(`Bạn có chắc muốn xóa công đoạn '${step.step_number}. ${step.step_name}' khỏi lưu đồ?`)) return;
    try {
      await api.delete(`/haccp/process-steps/${step.step_id}`);
      toast.success("Đã xóa công đoạn thành công!");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi xóa công đoạn");
    }
  };

  // Convert Steps to Workflow Template for Workflow Builder
  const currentWorkflowData: WorkflowTemplateData = useMemo(() => {
    const nodes = filteredSteps.map((s) => ({
      id: s.step_id,
      type: s.is_ccp_or_oprp ? "ccp_check" : "process",
      label: `${s.step_number}. ${s.step_name}`,
      role: s.is_ccp_or_oprp ? "QC Ca & Trưởng ca" : "Tổ Sản xuất",
      description: s.description || "Công đoạn theo quy trình chế biến",
      is_ccp: s.is_ccp_or_oprp,
      step_number: s.step_number,
    }));

    const edges = [];
    for (let i = 0; i < filteredSteps.length - 1; i++) {
      edges.push({
        id: `e_${filteredSteps[i].step_id}_${filteredSteps[i + 1].step_id}`,
        source: filteredSteps[i].step_id,
        target: filteredSteps[i + 1].step_id,
        label: filteredSteps[i].is_ccp_or_oprp ? "Kiểm soát CCP Đạt" : "Chuyển tiếp",
      });
    }

    return {
      module: "HACCP_FLOW",
      code: currentPlan?.plan_code ? `WF-${currentPlan.plan_code}` : "WF-HACCP-FLOW",
      title: currentPlan ? `Lưu Đồ: ${currentPlan.plan_name}` : "Lưu Đồ Quy Trình Công Đoạn HACCP",
      description: currentPlan?.scope_description || "Lưu đồ công đoạn sản xuất tuần tự ISO 8.5.1",
      version: currentPlan?.version || "1.0",
      nodes,
      edges,
      status: "ACTIVE",
    };
  }, [filteredSteps, currentPlan]);

  // ==================== ACTIONS: CCP ====================
  const handleOpenCreateCCP = () => {
    setEditingCCP(null);
    const initialPlanId = selectedPlanId !== "ALL" ? selectedPlanId : (plans[0]?.plan_id || "");
    setCcpModalPlanId(initialPlanId);
    const planSteps = steps.filter((s) => s.plan_id === initialPlanId);
    setCcpForm({
      ccp_code: `CCP ${ccps.length + 1}`,
      name: "",
      process_step_id: planSteps.length > 0 ? planSteps[0].step_id : (steps[0]?.step_id || ""),
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
    const linkedStep = steps.find((s) => s.step_id === ccp.process_step_id);
    const planId = linkedStep?.plan_id || (selectedPlanId !== "ALL" ? selectedPlanId : (plans[0]?.plan_id || ""));
    setCcpModalPlanId(planId);
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

  // Open Dynamic Form Log
  const handleOpenDynamicFormLog = async () => {
    try {
      const res = await api.get("/builders/forms");
      const found = res.data.find((f: any) => f.code === "FORM-CCP-MONITOR");
      if (found) {
        setFormTemplateCCP(found);
      } else {
        // Fallback default form
        setFormTemplateCCP({
          module: "HACCP",
          code: "FORM-CCP-MONITOR",
          title: "Phiếu Giám Sát Điểm Kiểm Soát Tới Hạn CCP (Form Tùy Biến)",
          version: "1.1",
          fields: [
            { id: "batch", name: "batch_number", label: "Mã Lô Sản Xuất", type: "TEXT", required: true, default_value: "LOT-2026-B01" },
            { id: "temp", name: "measured_temp", label: "Nhiệt độ đo tâm (°C - Giới hạn ≥ 85.0°C)", type: "NUMBER", required: true, unit: "°C", default_value: 85.5 },
            { id: "time", name: "holding_time", label: "Thời gian giữ nhiệt (Phút)", type: "NUMBER", required: true, unit: "phút", default_value: 15 },
            { id: "is_pass", name: "is_pass", label: "Kết luận: Đạt Giới Hạn Tới Hạn?", type: "YESNO", required: true, default_value: true },
            { id: "notes", name: "notes", label: "Ghi chú & Hành động khắc phục", type: "TEXT", required: false },
          ],
          status: "ACTIVE",
        });
      }
      setShowDynamicFormLog(true);
    } catch (err) {
      toast.error("Không thể tải biểu mẫu CCP");
    }
  };

  // ==================== ACTIONS: HAZARDS ====================
  const handleOpenCreateHazard = () => {
    setEditingHazard(null);
    const initialPlanId = selectedPlanId !== "ALL" ? selectedPlanId : (plans[0]?.plan_id || "");
    setHazardModalPlanId(initialPlanId);
    const planSteps = steps.filter((s) => s.plan_id === initialPlanId);
    setHazardForm({
      step_id: planSteps.length > 0 ? planSteps[0].step_id : (steps[0]?.step_id || ""),
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

  const handleOpenEditHazard = (h: HazardAnalysis) => {
    setEditingHazard(h);
    const linkedStep = steps.find((s) => s.step_id === h.step_id);
    const planId = linkedStep?.plan_id || (selectedPlanId !== "ALL" ? selectedPlanId : (plans[0]?.plan_id || ""));
    setHazardModalPlanId(planId);
    setHazardForm({
      step_id: h.step_id,
      hazard_type: h.hazard_type,
      hazard_name: h.hazard_name,
      potential_consequence: h.potential_consequence || "",
      likelihood: h.likelihood,
      severity: h.severity,
      is_significant: h.is_significant,
      control_measure: h.control_measure,
      q1: h.q1 || "YES",
      q2: h.q2 || "NO",
      q3: h.q3 || "YES",
      q4: h.q4 || "NO",
      classification: h.classification,
      notes: h.notes || "",
    });
    setShowHazardModal(true);
  };

  const handleSaveHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const risk = hazardForm.likelihood * hazardForm.severity;
      const isSig = risk >= 4;

      const payload = {
        ...hazardForm,
        risk_score: risk,
        is_significant: isSig,
      };

      if (editingHazard) {
        await api.put(`/haccp/hazards/${editingHazard.hazard_id}`, payload);
        toast.success(`Đã cập nhật phân tích mối nguy thành công`);
      } else {
        await api.post("/haccp/hazards", payload);
        toast.success(`Đã thêm mối nguy vào ma trận thành công`);
      }
      setShowHazardModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu mối nguy");
    }
  };

  const handleDeleteHazard = async (h: HazardAnalysis) => {
    if (!confirm(`Bạn có chắc muốn xóa mối nguy '${h.hazard_name}'?`)) return;
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
    if (score >= 6) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">Cao ({score})</span>;
    if (score >= 3) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">Vừa ({score})</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">Thấp ({score})</span>;
  };

  const getClassBadge = (cls: string) => {
    if (cls === "CCP") return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-sm">★ CCP</span>;
    if (cls === "OPRP") return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">oPRP</span>;
    if (cls === "PRP") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">PRP</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-slate-600 bg-slate-100">K.Ý nghĩa</span>;
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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> CẢNH BÁO
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> BÌNH THƯỜNG
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Page Header */}
      <PageHeader
        title="Quản Lý Kế Hoạch HACCP, Mối Nguy & Giám Sát CCP"
        description="Hệ thống xây dựng Kế hoạch HACCP, lưu đồ công đoạn tuần tự, ma trận phân tích mối nguy Codex Q1-Q4 và giám sát đo đạc thời gian thực theo tiêu chuẩn ISO 22000:2018 Điều khoản 8.5."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrintPlanModal(true)}
              className="text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> In Kế Hoạch HACCP
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrintLogModal(true)}
              className="text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" /> In Nhật Ký Đo Đạc
            </Button>
            <Button
              size="sm"
              onClick={() => handleOpenCreateLog()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
            >
              <Thermometer className="h-3.5 w-3.5 mr-1.5" /> Ghi Nhận Đo Đạc CCP
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Điểm Kiểm Soát CCP / oPRP
            </span>
            <div className="p-2 bg-rose-100 rounded-lg text-rose-600 border border-rose-200">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats?.total_ccps ?? 4}</span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
              {stats?.active_ccps ?? 4} Hoạt động 100%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Bao quát toàn bộ lưu đồ chế biến</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Đo Đạc Trong Ngưỡng
            </span>
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 border border-emerald-200">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-700">{stats?.in_limit_percentage ?? 100}%</span>
            <span className="text-xs font-semibold text-slate-500">
              ({stats?.normal_logs_count ?? 5}/{stats?.total_logs_today ?? 6} mẻ)
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Đạt chỉ tiêu an toàn thực phẩm</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cảnh Báo Sát Ngưỡng
            </span>
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600 border border-amber-200">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-700">{stats?.warning_logs_count ?? 1}</span>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
              Tiệm cận ±5%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Đã căn chỉnh thông số vận hành</p>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Vi Phạm Tới Hạn (24h)
            </span>
            <div className={`p-2 rounded-lg ${(stats?.critical_breaches_count ?? 0) > 0 ? "bg-rose-100 text-rose-600 border border-rose-200" : "bg-emerald-100 text-emerald-600 border border-emerald-200"}`}>
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${(stats?.critical_breaches_count ?? 0) > 0 ? "text-rose-600" : "text-slate-900"}`}>
              {stats?.critical_breaches_count ?? 0}
            </span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
              0 Lô Cách Ly
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Hệ thống an toàn tuyệt đối</p>
        </div>
      </div>

      {/* 5 TABS NAVIGATION */}
      <div className="border-b border-slate-200 overflow-x-auto no-scrollbar">
        <div className="flex space-x-3 min-w-max pb-1">
          <button
            onClick={() => setActiveTab("flowchart")}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "flowchart"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Workflow className="h-4 w-4 shrink-0" />
            Kế Hoạch HACCP & Lưu Đồ Công Đoạn ({filteredSteps.length})
          </button>

          <button
            onClick={() => setActiveTab("ccp_plan")}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "ccp_plan"
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Flame className="h-4 w-4 shrink-0" />
            Kế Hoạch Kiểm Soát CCP & oPRP ({ccps.length})
          </button>

          <button
            onClick={() => setActiveTab("hazards")}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "hazards"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            Bảng Phân Tích Mối Nguy ({hazards.length})
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "logs"
                ? "border-amber-600 text-amber-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Clock className="h-4 w-4 shrink-0" />
            Nhật Ký Giám Sát Realtime ({logs.length})
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "ai"
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-slate-500 hover:text-purple-700"
            }`}
          >
            <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
            Trợ Lý AI Chuyên Gia HACCP
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: KẾ HOẠCH HACCP & LƯU ĐỒ CÔNG ĐOẠN ==================== */}
      {activeTab === "flowchart" && (
        <div className="space-y-6">
          {/* Plan Selector & Control Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Kế Hoạch HACCP Hiện Tại:
                </span>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none min-w-[280px]"
                >
                  <option value="ALL">Tất cả kế hoạch ({plans.length})</option>
                  {plans.map((p) => (
                    <option key={p.plan_id} value={p.plan_id}>
                      {p.plan_code} - {p.plan_name} (Ver {p.version})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleOpenCreatePlan}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tạo Kế Hoạch HACCP Mới
                </Button>

                {currentPlan && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEditPlan(currentPlan)}
                    className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    Sửa Hồ Sơ Kế Hoạch
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowWorkflowStudio(true)}
                  className="border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5"
                >
                  <Workflow className="w-3.5 h-3.5 text-blue-600" />
                  Bộ Thiết Kế Lưu Đồ (Studio)
                </Button>
              </div>
            </div>

            {/* Plan Info Card */}
            {currentPlan && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <div>
                  <span className="text-slate-500 font-semibold">Mã kế hoạch:</span>
                  <div className="font-mono font-bold text-emerald-700 mt-0.5">{currentPlan.plan_code}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Dây chuyền áp dụng:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{currentPlan.product_line}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Trưởng ban HACCP:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{currentPlan.team_leader}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Ngày ban hành & Phiên bản:</span>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {currentPlan.effective_date || "15/01/2026"} (Ver {currentPlan.version})
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Flowchart Diagram Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-emerald-600" />
                  Sơ Đồ Lưu Đồ Quy Trình Công Đoạn Tuần Tự (ISO 22000 Điều khoản 8.5.1)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lưu đồ thể hiện toàn bộ các bước sản xuất từ tiếp nhận đến thành phẩm và vị trí các điểm kiểm soát tới hạn CCP.
                </p>
              </div>

              <Button
                size="sm"
                onClick={handleOpenCreateStep}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm Công Đoạn
              </Button>
            </div>

            {/* Visual Flow Pipeline */}
            <div className="max-w-2xl mx-auto space-y-3 py-2">
              {filteredSteps.map((step, idx) => (
                <React.Fragment key={step.step_id}>
                  {/* Step Card */}
                  <div
                    className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                      step.is_ccp_or_oprp
                        ? "bg-rose-50 border-rose-300 shadow-sm hover:border-rose-400"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                          step.is_ccp_or_oprp ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
                        }`}
                      >
                        {step.step_number}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">{step.step_name}</h4>
                          {step.is_ccp_or_oprp && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 animate-pulse">
                              <Flame className="w-3 h-3" /> ★ ĐIỂM KIỂM SOÁT TỚI HẠN (CCP)
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                            {step.hazard_count} mối nguy
                          </span>
                        </div>

                        {step.description && (
                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenEditStep(step)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                        title="Chỉnh sửa công đoạn"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStep(step)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:text-rose-800 hover:bg-rose-100 transition-colors"
                        title="Xóa công đoạn"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Flow Arrow */}
                  {idx < filteredSteps.length - 1 && (
                    <div className="flex flex-col items-center my-0.5">
                      <div className="w-0.5 h-3 bg-slate-300" />
                      <div className="px-3 py-0.5 rounded-full bg-white border border-slate-300 text-[10px] font-bold text-slate-600 flex items-center gap-1 font-mono shadow-sm">
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                        <span>{step.is_ccp_or_oprp ? "Kiểm soát CCP Đạt" : "Chuyển tiếp"}</span>
                      </div>
                      <div className="w-0.5 h-3 bg-slate-300" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: KẾ HOẠCH CCP & OPRP MATRIX ==================== */}
      {activeTab === "ccp_plan" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm mã CCP, tên điểm kiểm soát..."
                className="pl-9 text-sm bg-white border-slate-300 text-slate-900"
                value={ccpSearch}
                onChange={(e) => setCcpSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-slate-800 focus:outline-none"
                value={ccpStatusFilter}
                onChange={(e) => setCcpStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="INACTIVE">Tạm dừng (INACTIVE)</option>
              </select>
              <Button onClick={handleOpenCreateCCP} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> Thêm Điểm CCP Mới
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCCPs.map((ccp) => {
              const cl = ccp.critical_limit || {};
              const isOprp = ccp.ccp_code.startsWith("oPRP");
              return (
                <div key={ccp.ccp_id} className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-3 py-1 rounded-lg text-sm font-black tracking-wider text-white ${isOprp ? "bg-amber-600" : "bg-rose-600"}`}>
                        {ccp.ccp_code}
                      </span>
                      <div>
                        <h4 className="font-bold text-base text-slate-900">{ccp.name}</h4>
                        <p className="text-xs text-slate-500">Công đoạn: {ccp.step_name || "Chưa gán công đoạn"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditCCP(ccp)} className="h-8 w-8 text-slate-500 hover:text-slate-900">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCCP(ccp)} className="h-8 w-8 text-slate-500 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Hazard Description */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <span className="font-bold text-rose-700 uppercase text-[10px] tracking-wider block mb-1">Mối nguy cần kiểm soát:</span>
                    <p className="text-slate-700 leading-relaxed">{ccp.hazard_description}</p>
                  </div>

                  {/* Critical Limit */}
                  <div className="bg-rose-50 border border-rose-300 p-3.5 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-rose-600" /> Giới Hạn Tới Hạn (Critical Limit):
                      </span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200">
                        {cl.param || "Thông số kỹ thuật"}
                      </span>
                    </div>
                    <p className="text-slate-900 font-black text-sm pt-1">
                      {cl.condition_text || `${cl.min_val ? ">= " + cl.min_val : ""} ${cl.max_val ? "<= " + cl.max_val : ""} ${cl.unit || ""}`}
                    </p>
                  </div>

                  {/* Monitoring & Action details */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-700 pt-1">
                    <div>
                      <span className="text-slate-500 block text-[11px] font-semibold">Tần suất & Phương pháp:</span>
                      <span className="font-bold text-slate-800">{ccp.monitoring_frequency}</span>
                      <p className="text-[11px] text-slate-500 truncate">{ccp.monitoring_method}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px] font-semibold">Người phụ trách:</span>
                      <span className="font-bold text-emerald-700">{ccp.responsible_role}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      size="sm"
                      onClick={() => handleOpenCreateLog(ccp)}
                      className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold py-1.5 shadow-none"
                    >
                      <Thermometer className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> Ghi Nhật Ký Đo Đạc Cho {ccp.ccp_code}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: HAZARDS ANALYSIS ==================== */}
      {activeTab === "hazards" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 focus:outline-none font-medium"
                value={hzTypeFilter}
                onChange={(e) => setHzTypeFilter(e.target.value)}
              >
                <option value="ALL">Tất cả loại mối nguy</option>
                <option value="BIOLOGICAL">Sinh học (Biological)</option>
                <option value="CHEMICAL">Hóa học (Chemical)</option>
                <option value="PHYSICAL">Vật lý (Physical)</option>
                <option value="ALLERGEN">Dị nguyên (Allergen)</option>
              </select>

              <select
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 focus:outline-none font-medium"
                value={hzClassFilter}
                onChange={(e) => setHzClassFilter(e.target.value)}
              >
                <option value="ALL">Tất cả phân loại</option>
                <option value="CCP">Điểm CCP</option>
                <option value="OPRP">Chương trình oPRP</option>
                <option value="PRP">Chương trình PRP/GMP</option>
              </select>
            </div>

            <Button onClick={handleOpenCreateHazard} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Thêm Mối Nguy Mới
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Công đoạn</th>
                    <th className="p-3.5">Mối nguy cụ thể</th>
                    <th className="p-3.5">Loại</th>
                    <th className="p-3.5 text-center">Ma trận rủi ro</th>
                    <th className="p-3.5">Biện pháp kiểm soát</th>
                    <th className="p-3.5 text-center">Codex Q1-Q4</th>
                    <th className="p-3.5 text-center">Phân loại</th>
                    <th className="p-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHazards.map((h) => (
                    <tr key={h.hazard_id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">
                        {h.step_number ? `${h.step_number}. ` : ""}{h.step_name || "Công đoạn"}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 max-w-xs">{h.hazard_name}</div>
                        {h.potential_consequence && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{h.potential_consequence}</div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-700">{h.hazard_type}</td>
                      <td className="p-3.5 text-center">
                        {getRiskBadge(h.risk_score)}
                        <div className="text-[10px] text-slate-500 mt-0.5">K:{h.likelihood} × N:{h.severity}</div>
                      </td>
                      <td className="p-3.5 text-slate-700 max-w-xs">{h.control_measure}</td>
                      <td className="p-3.5 text-center font-mono text-[11px] text-slate-600 font-bold">
                        {h.q1 || "-"}/{h.q2 || "-"}/{h.q3 || "-"}/{h.q4 || "-"}
                      </td>
                      <td className="p-3.5 text-center">{getClassBadge(h.classification)}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenEditHazard(h)} className="p-1 text-slate-500 hover:text-slate-900">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDeleteHazard(h)} className="p-1 text-slate-500 hover:text-rose-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: REALTIME LOGS ==================== */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 focus:outline-none font-medium"
                value={logCcpFilter}
                onChange={(e) => setLogCcpFilter(e.target.value)}
              >
                <option value="ALL">Tất cả điểm CCP ({ccps.length})</option>
                {ccps.map((c) => (
                  <option key={c.ccp_id} value={c.ccp_id}>
                    {c.ccp_code} - {c.name}
                  </option>
                ))}
              </select>

              <select
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-white text-slate-800 focus:outline-none font-medium"
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="NORMAL">Bình thường (NORMAL)</option>
                <option value="WARNING">Cảnh báo sát ngưỡng (WARNING)</option>
                <option value="CRITICAL">Vi phạm giới hạn (CRITICAL)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenDynamicFormLog}
                className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                Mở Phiếu Form Động
              </Button>

              <Button onClick={() => handleOpenCreateLog()} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm">
                <Plus className="h-4 w-4 mr-1.5" /> Ghi Nhật Ký Đo Nhanh
              </Button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Mã CCP</th>
                    <th className="p-3.5">Mã Lô Hàng</th>
                    <th className="p-3.5">Thời Gian Đo</th>
                    <th className="p-3.5">Giá Trị Đo Thực Tế</th>
                    <th className="p-3.5">Giới Hạn Tới Hạn</th>
                    <th className="p-3.5 text-center">Trạng Thái</th>
                    <th className="p-3.5">Người Giám Sát</th>
                    <th className="p-3.5">Ghi Chú / Khắc Phục</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((l) => (
                    <tr key={l.log_id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <span className="font-bold text-rose-700">{l.ccp_code}</span>
                        <div className="text-[11px] text-slate-500">{l.ccp_name}</div>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">{l.batch_number}</td>
                      <td className="p-3.5 text-slate-500">{l.test_time || "Hôm nay"}</td>
                      <td className="p-3.5 font-mono font-black text-sm text-slate-900">
                        {l.measured_value} {l.unit}
                      </td>
                      <td className="p-3.5 text-slate-600">{l.critical_limit_text || "Tiêu chuẩn"}</td>
                      <td className="p-3.5 text-center">{getLogStatusBadge(l.status, l.is_critical_limit_exceeded)}</td>
                      <td className="p-3.5 text-slate-700 font-medium">{l.inspector_name || "QC Ca"}</td>
                      <td className="p-3.5 text-slate-600 max-w-xs">{l.deviation_action || l.notes || "Bình thường"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: AI ASSISTANT ==================== */}
      {activeTab === "ai" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Hazard Suggester */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-xl text-purple-700 border border-purple-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Trợ Lý AI Gợi Ý Mối Nguy Theo Công Đoạn</h3>
                <p className="text-xs text-slate-500">Tự động phân tích tác nhân vi sinh, hóa học và phân loại CCP/oPRP theo Codex.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs font-bold text-slate-700">Chọn công đoạn mẫu hoặc nhập mới:</Label>
                <select
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
                  onChange={(e) => {
                    const found = AI_STEP_PRESETS.find((p) => p.step_name === e.target.value);
                    if (found) {
                      setAiStepName(found.step_name);
                      setAiProductLine(found.product_line);
                    }
                  }}
                >
                  {AI_STEP_PRESETS.map((p) => (
                    <option key={p.step_name} value={p.step_name}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Tên công đoạn:</Label>
                <Input
                  value={aiStepName}
                  onChange={(e) => setAiStepName(e.target.value)}
                  className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Dây chuyền sản phẩm:</Label>
                <Input
                  value={aiProductLine}
                  onChange={(e) => setAiProductLine(e.target.value)}
                  className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-semibold"
                />
              </div>

              <Button
                onClick={() => handleRunAIHazardSuggest()}
                disabled={aiLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 shadow-sm"
              >
                {aiLoading ? "Đang phân tích..." : "Chạy AI Phân Tích Mối Nguy & Gợi Ý CCP"}
              </Button>
            </div>

            {aiHazardResults && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                  Kết quả phân tích từ Trợ Lý AI:
                </div>
                {aiHazardResults.hazards?.map((item: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-start justify-between">
                      <span className="font-bold text-slate-900">{item.hazard_name}</span>
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[10px] font-bold border border-rose-200">
                        {item.recommended_classification}
                      </span>
                    </div>
                    <p className="text-slate-600">{item.control_measure}</p>
                    <Button
                      size="sm"
                      onClick={() => handleApplyAIHazard(item)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-3 font-bold"
                    >
                      + Thêm vào Kế Hoạch HACCP
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Deviation Advisory */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 rounded-xl text-rose-700 border border-rose-200">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">AI Xử Lý Sự Cố Vi Phạm CCP Khẩn Cấp</h3>
                <p className="text-xs text-slate-500">Tư vấn phương án cô lập lô hàng, biệt trữ kho và hành động khắc phục CAPA theo ISO 8.9.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs font-bold text-slate-700">Chọn kịch bản sự cố mẫu:</Label>
                <select
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
                  onChange={(e) => {
                    const found = AI_DEVIATION_PRESETS.find((p) => p.title === e.target.value);
                    if (found) setAiDevPreset(found);
                  }}
                >
                  {AI_DEVIATION_PRESETS.map((p) => (
                    <option key={p.title} value={p.title}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
                <div>Điểm kiểm soát: <span className="font-bold text-rose-700">{aiDevPreset.ccp_code}</span></div>
                <div>Lô hàng sự cố: <span className="font-mono font-bold text-slate-900">{aiDevPreset.batch_number}</span></div>
                <div>Giá trị vi phạm: <span className="font-bold text-rose-700">{aiDevPreset.measured_value}{aiDevPreset.unit}</span> ({aiDevPreset.critical_limit_text})</div>
                <p className="text-slate-600 mt-1">{aiDevPreset.description}</p>
              </div>

              <Button
                onClick={() => handleRunAIDeviation()}
                disabled={aiDevLoading}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 shadow-sm"
              >
                {aiDevLoading ? "Đang tạo quy trình xử lý khẩn cấp..." : "Chạy AI Lập Phương Án Khắc Phục"}
              </Button>
            </div>

            {aiDevResults && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                  Khuyến nghị hành động khẩn cấp từ AI:
                </div>
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-2 leading-relaxed">
                  <div className="font-bold text-slate-900">1. Hành động cô lập tức thời:</div>
                  <p className="text-slate-700">{aiDevResults.immediate_action}</p>
                  <div className="font-bold text-slate-900 pt-1">2. Biện pháp xử lý lô sản phẩm:</div>
                  <p className="text-slate-700">{aiDevResults.product_disposition}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ==================== MODAL: HACCP PLAN (CREATE / EDIT) ==================== */}
      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingPlan ? "Chỉnh Sửa Kế Hoạch HACCP" : "Tạo Kế Hoạch HACCP Mới"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePlan} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-slate-700 font-bold">Mã Kế Hoạch *</Label>
              <Input
                value={planForm.plan_code}
                onChange={(e) => setPlanForm({ ...planForm, plan_code: e.target.value })}
                placeholder="VD: HACCP-2026-CB01"
                className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-mono font-bold"
              />
            </div>
            <div>
              <Label className="text-slate-700 font-bold">Tên Kế Hoạch HACCP *</Label>
              <Input
                value={planForm.plan_name}
                onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })}
                placeholder="VD: Kế hoạch HACCP Chế biến Chả cá Ba Sa"
                className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-slate-700 font-semibold">Dây chuyền sản phẩm</Label>
                <Input
                  value={planForm.product_line}
                  onChange={(e) => setPlanForm({ ...planForm, product_line: e.target.value })}
                  className="mt-1 text-xs bg-white border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Phiên bản</Label>
                <Input
                  value={planForm.version}
                  onChange={(e) => setPlanForm({ ...planForm, version: e.target.value })}
                  className="mt-1 text-xs bg-white border-slate-300 text-slate-900"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-700 font-semibold">Trưởng ban HACCP / QA</Label>
              <Input
                value={planForm.team_leader}
                onChange={(e) => setPlanForm({ ...planForm, team_leader: e.target.value })}
                className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-medium"
              />
            </div>
            <div>
              <Label className="text-slate-700 font-semibold">Mô tả phạm vi áp dụng</Label>
              <textarea
                rows={2}
                value={planForm.scope_description}
                onChange={(e) => setPlanForm({ ...planForm, scope_description: e.target.value })}
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPlanModal(false)} className="border-slate-300 text-slate-700">
                Hủy
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Lưu Kế Hoạch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: PROCESS STEP ==================== */}
      <Dialog open={showStepModal} onOpenChange={setShowStepModal}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingStep ? "Chỉnh Sửa Công Đoạn" : "Thêm Công Đoạn Vào Lưu Đồ"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStep} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-slate-700 font-bold">Thứ tự *</Label>
                <Input
                  type="number"
                  value={stepForm.step_number}
                  onChange={(e) => setStepForm({ ...stepForm, step_number: parseInt(e.target.value) || 1 })}
                  className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-bold"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-slate-700 font-semibold">Kế hoạch HACCP</Label>
                <select
                  value={stepForm.plan_id}
                  onChange={(e) => setStepForm({ ...stepForm, plan_id: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-medium"
                >
                  {plans.map((p) => (
                    <option key={p.plan_id} value={p.plan_id}>
                      {p.plan_code} - {p.plan_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-bold">Tên Công Đoạn *</Label>
              <Input
                value={stepForm.step_name}
                onChange={(e) => setStepForm({ ...stepForm, step_name: e.target.value })}
                placeholder="VD: Thanh trùng gia nhiệt"
                className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-semibold"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-200">
              <div>
                <div className="font-bold text-rose-800 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-600" />
                  Điểm kiểm soát tới hạn (CCP/oPRP)
                </div>
                <div className="text-[10px] text-rose-600">Đánh dấu bước này là CCP</div>
              </div>
              <input
                type="checkbox"
                checked={stepForm.is_ccp_or_oprp}
                onChange={(e) => setStepForm({ ...stepForm, is_ccp_or_oprp: e.target.checked })}
                className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
              />
            </div>

            <div>
              <Label className="text-slate-700 font-semibold">Mô tả thao tác / Yêu cầu kỹ thuật</Label>
              <textarea
                rows={3}
                value={stepForm.description}
                onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })}
                placeholder="Yêu cầu thông số nhiệt độ, áp suất hoặc bao gói..."
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowStepModal(false)} className="border-slate-300 text-slate-700">
                Hủy
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Lưu Công Đoạn
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: WORKFLOW STUDIO INTEGRATION ==================== */}
      {showWorkflowStudio && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <WorkflowBuilder
              initialData={currentWorkflowData}
              onSave={async (wf) => {
                try {
                  await api.post("/builders/workflows", wf);
                  toast.success("Đã lưu sơ đồ lưu đồ quy trình vào hệ thống!");
                  setShowWorkflowStudio(false);
                } catch (err: any) {
                  toast.error("Lỗi khi lưu: " + (err.response?.data?.detail || err.message));
                }
              }}
              onCancel={() => setShowWorkflowStudio(false)}
            />
          </div>
        </div>
      )}

      {/* ==================== MODAL: CCP MODAL ==================== */}
      <Dialog open={showCCPModal} onOpenChange={setShowCCPModal}>
        <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingCCP ? "Chỉnh Sửa Điểm Kiểm Soát Tới Hạn" : "Thiết Lập Điểm CCP / oPRP Mới"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCCP} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-slate-700 font-bold">Thuộc Kế Hoạch HACCP *</Label>
              <select
                value={ccpModalPlanId}
                onChange={(e) => {
                  const newPlanId = e.target.value;
                  setCcpModalPlanId(newPlanId);
                  const planSteps = steps.filter((s) => s.plan_id === newPlanId);
                  setCcpForm((prev) => ({
                    ...prev,
                    process_step_id: planSteps[0]?.step_id || "",
                  }));
                }}
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold focus:border-emerald-600 focus:outline-none"
              >
                {plans.map((p) => (
                  <option key={p.plan_id} value={p.plan_id}>
                    {p.plan_code} - {p.plan_name} ({p.product_line})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Mã Điểm *</Label>
                <Input
                  value={ccpForm.ccp_code}
                  onChange={(e) => setCcpForm({ ...ccpForm, ccp_code: e.target.value })}
                  placeholder="VD: CCP 1 hoặc oPRP 1"
                  className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-bold"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Công đoạn gắn liền *</Label>
                <select
                  value={ccpForm.process_step_id}
                  onChange={(e) => setCcpForm({ ...ccpForm, process_step_id: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-medium focus:border-emerald-600 focus:outline-none"
                >
                  <option value="">Chọn công đoạn...</option>
                  {steps
                    .filter((s) => !ccpModalPlanId || s.plan_id === ccpModalPlanId)
                    .map((s) => (
                      <option key={s.step_id} value={s.step_id}>
                        {s.step_number}. {s.step_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-bold">Tên Điểm Kiểm Soát *</Label>
              <Input
                value={ccpForm.name}
                onChange={(e) => setCcpForm({ ...ccpForm, name: e.target.value })}
                placeholder="VD: Thanh trùng gia nhiệt diệt vi sinh"
                className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-semibold"
              />
            </div>

            <div>
              <Label className="text-slate-700 font-semibold">Mối nguy cần kiểm soát *</Label>
              <textarea
                rows={2}
                value={ccpForm.hazard_description}
                onChange={(e) => setCcpForm({ ...ccpForm, hazard_description: e.target.value })}
                placeholder="Sự tồn tại của vi sinh vật gây bệnh Salmonella..."
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
              />
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <span className="font-bold text-rose-800 uppercase text-[11px] block">Cấu hình Giới hạn tới hạn (Critical Limit):</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-slate-700 text-[11px] font-semibold">Tối thiểu</Label>
                  <Input
                    type="number"
                    step="any"
                    value={ccpForm.min_val}
                    onChange={(e) => setCcpForm({ ...ccpForm, min_val: e.target.value })}
                    placeholder="VD: 75.0"
                    className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-bold font-mono"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 text-[11px] font-semibold">Tối đa</Label>
                  <Input
                    type="number"
                    step="any"
                    value={ccpForm.max_val}
                    onChange={(e) => setCcpForm({ ...ccpForm, max_val: e.target.value })}
                    placeholder="VD: 95.0"
                    className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-bold font-mono"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 text-[11px] font-semibold">Đơn vị</Label>
                  <Input
                    value={ccpForm.unit}
                    onChange={(e) => setCcpForm({ ...ccpForm, unit: e.target.value })}
                    placeholder="°C, mm, ppm"
                    className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-bold font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-semibold">Tần suất giám sát</Label>
                <Input
                  value={ccpForm.monitoring_frequency}
                  onChange={(e) => setCcpForm({ ...ccpForm, monitoring_frequency: e.target.value })}
                  placeholder="Mỗi mẻ / Liên tục"
                  className="mt-1 text-xs bg-white border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Người phụ trách</Label>
                <Input
                  value={ccpForm.responsible_role}
                  onChange={(e) => setCcpForm({ ...ccpForm, responsible_role: e.target.value })}
                  placeholder="QC Công đoạn"
                  className="mt-1 text-xs bg-white border-slate-300 text-slate-900"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCCPModal(false)} className="border-slate-300 text-slate-700">
                Hủy
              </Button>
              <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                Lưu Điểm CCP
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: HAZARD ==================== */}
      <Dialog open={showHazardModal} onOpenChange={setShowHazardModal}>
        <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingHazard ? "Chỉnh Sửa Mối Nguy" : "Thêm Mối Nguy Mới"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveHazard} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-slate-700 font-bold">Thuộc Kế Hoạch HACCP *</Label>
              <select
                value={hazardModalPlanId}
                onChange={(e) => {
                  const newPlanId = e.target.value;
                  setHazardModalPlanId(newPlanId);
                  const planSteps = steps.filter((s) => s.plan_id === newPlanId);
                  setHazardForm((prev) => ({
                    ...prev,
                    step_id: planSteps[0]?.step_id || "",
                  }));
                }}
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-semibold focus:border-emerald-600 focus:outline-none"
              >
                {plans.map((p) => (
                  <option key={p.plan_id} value={p.plan_id}>
                    {p.plan_code} - {p.plan_name} ({p.product_line})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Công đoạn *</Label>
                <select
                  value={hazardForm.step_id}
                  onChange={(e) => setHazardForm({ ...hazardForm, step_id: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-medium focus:border-emerald-600 focus:outline-none"
                >
                  {steps
                    .filter((s) => !hazardModalPlanId || s.plan_id === hazardModalPlanId)
                    .map((s) => (
                      <option key={s.step_id} value={s.step_id}>
                        {s.step_number}. {s.step_name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Loại mối nguy</Label>
                <select
                  value={hazardForm.hazard_type}
                  onChange={(e) => setHazardForm({ ...hazardForm, hazard_type: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-medium focus:border-emerald-600 focus:outline-none"
                >
                  <option value="BIOLOGICAL">Sinh học (Biological)</option>
                  <option value="CHEMICAL">Hóa học (Chemical)</option>
                  <option value="PHYSICAL">Vật lý (Physical)</option>
                  <option value="ALLERGEN">Dị nguyên (Allergen)</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-bold">Tác nhân mối nguy cụ thể *</Label>
              <Input
                value={hazardForm.hazard_name}
                onChange={(e) => setHazardForm({ ...hazardForm, hazard_name: e.target.value })}
                placeholder="VD: Vi khuẩn Salmonella sống sót do gia nhiệt không đủ"
                className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <Label className="text-slate-700 font-semibold">Khả năng xảy ra (1-3)</Label>
                <select
                  value={hazardForm.likelihood}
                  onChange={(e) => setHazardForm({ ...hazardForm, likelihood: parseInt(e.target.value) || 2 })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900"
                >
                  <option value={1}>1 - Thấp</option>
                  <option value={2}>2 - Vừa</option>
                  <option value={3}>3 - Cao</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Mức độ nghiêm trọng (1-3)</Label>
                <select
                  value={hazardForm.severity}
                  onChange={(e) => setHazardForm({ ...hazardForm, severity: parseInt(e.target.value) || 2 })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-900"
                >
                  <option value={1}>1 - Thấp</option>
                  <option value={2}>2 - Vừa</option>
                  <option value={3}>3 - Cao</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-semibold">Biện pháp kiểm soát *</Label>
              <textarea
                rows={2}
                value={hazardForm.control_measure}
                onChange={(e) => setHazardForm({ ...hazardForm, control_measure: e.target.value })}
                placeholder="Duy trì nhiệt độ tâm >= 75°C trong >= 15 giây..."
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Phân loại kết luận</Label>
                <select
                  value={hazardForm.classification}
                  onChange={(e) => setHazardForm({ ...hazardForm, classification: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded p-2 text-xs text-slate-900 font-bold"
                >
                  <option value="CCP">Điểm CCP</option>
                  <option value="OPRP">Chương trình oPRP</option>
                  <option value="PRP">Chương trình PRP/GMP</option>
                  <option value="NOT_SIGNIFICANT">Không đáng kể</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowHazardModal(false)} className="border-slate-300 text-slate-700">
                Hủy
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                Lưu Mối Nguy
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: FAST LOG ==================== */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-emerald-600" />
              Ghi Nhật Ký Đo Đạc CCP
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveLog} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-slate-700 font-bold">Chọn Điểm Kiểm Soát CCP *</Label>
              <select
                value={logForm.ccp_id}
                onChange={(e) => {
                  const target = ccps.find((c) => c.ccp_id === e.target.value);
                  if (target) {
                    setSelectedCCPForLog(target);
                    setLogForm({ ...logForm, ccp_id: target.ccp_id, unit: target.critical_limit?.unit || "°C" });
                  }
                }}
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-bold"
              >
                {ccps.map((c) => (
                  <option key={c.ccp_id} value={c.ccp_id}>
                    {c.ccp_code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-slate-700 font-semibold">Mã Lô / Mẻ Sản Xuất *</Label>
              <Input
                value={logForm.batch_number}
                onChange={(e) => setLogForm({ ...logForm, batch_number: e.target.value })}
                className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Giá trị đo thực tế *</Label>
                <Input
                  type="number"
                  step="any"
                  value={logForm.measured_value}
                  onChange={(e) => setLogForm({ ...logForm, measured_value: e.target.value })}
                  className="mt-1 text-sm bg-white border-slate-300 text-slate-900 font-mono font-black"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Đơn vị</Label>
                <Input
                  disabled
                  value={logForm.unit}
                  className="mt-1 text-xs bg-slate-100 border-slate-300 text-slate-600 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-semibold">Hành động khắc phục (nếu vượt ngưỡng)</Label>
              <Input
                value={logForm.deviation_action}
                onChange={(e) => setLogForm({ ...logForm, deviation_action: e.target.value })}
                placeholder="Gia nhiệt bổ sung..."
                className="mt-1 text-xs bg-white border-slate-300 text-slate-900"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowLogModal(false)} className="border-slate-300 text-slate-700">
                Hủy
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Xác Nhận Lưu Nhật Ký
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: DYNAMIC FORM CCP MONITOR ==================== */}
      {showDynamicFormLog && formTemplateCCP && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Phiếu Giám Sát CCP (Biểu Mẫu Tùy Biến)
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDynamicFormLog(false)}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Đóng
              </Button>
            </div>

            <DynamicFormRenderer
              template={formTemplateCCP}
              onSubmit={async (formData) => {
                try {
                  await api.post("/builders/submissions", {
                    template_id: formTemplateCCP.template_id || "00000000-0000-0000-0000-000000000000",
                    submitted_by_name: "QC Ca Sản Xuất",
                    form_data: formData,
                    status: "COMPLETED",
                  });
                  toast.success("Đã ghi nhận phiếu giám sát CCP vào cơ sở dữ liệu!");
                  setShowDynamicFormLog(false);
                } catch (err: any) {
                  toast.error("Lỗi khi gửi phiếu: " + (err.response?.data?.detail || err.message));
                }
              }}
            />
          </div>
        </div>
      )}

      {/* ==================== PRINT MODALS ==================== */}
      {showPrintPlanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white text-slate-900 p-8 rounded-2xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="Logo" className="h-12 w-auto" />
                <div>
                  <h2 className="text-lg font-black uppercase text-slate-900">BẢNG KẾ HOẠCH KIỂM SOÁT MỐI NGUY & ĐIỂM CCP (HACCP PLAN)</h2>
                  <p className="text-xs text-slate-500">Tiêu chuẩn ISO 22000:2018 Điều khoản 8.5.4 • Mã hồ sơ: BM-HACCP-01</p>
                </div>
              </div>
              <Button size="sm" onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold">
                <Printer className="w-3.5 h-3.5 mr-1" /> In Bản Cứng
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>Kế hoạch: <strong className="text-slate-900">{currentPlan?.plan_name || "Chế biến Cá Ngừ"}</strong></div>
              <div>Mã hiệu: <strong className="text-slate-900">{currentPlan?.plan_code || "HACCP-2026-01"} (Ver {currentPlan?.version || "2.1"})</strong></div>
              <div>Trưởng ban HACCP: <strong className="text-slate-900">{currentPlan?.team_leader || "Nguyễn Văn An"}</strong></div>
              <div>Người phê duyệt: <strong className="text-slate-900">{currentPlan?.approved_by || "Lê Hoàng Quân (Giám đốc)"}</strong></div>
            </div>

            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                <tr>
                  <th className="p-2 border-r border-slate-300">Mã CCP</th>
                  <th className="p-2 border-r border-slate-300">Công đoạn</th>
                  <th className="p-2 border-r border-slate-300">Mối nguy cần kiểm soát</th>
                  <th className="p-2 border-r border-slate-300">Giới hạn tới hạn</th>
                  <th className="p-2 border-r border-slate-300">Giám sát</th>
                  <th className="p-2 border-r border-slate-300">Hành động khắc phục</th>
                  <th className="p-2">Phụ trách</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ccps.map((c) => (
                  <tr key={c.ccp_id}>
                    <td className="p-2 font-bold border-r border-slate-300 text-rose-700">{c.ccp_code}</td>
                    <td className="p-2 border-r border-slate-300">{c.step_name}</td>
                    <td className="p-2 border-r border-slate-300">{c.hazard_description}</td>
                    <td className="p-2 font-bold border-r border-slate-300 text-slate-900">{c.critical_limit?.condition_text || "Đạt chuẩn"}</td>
                    <td className="p-2 border-r border-slate-300">{c.monitoring_frequency} ({c.monitoring_method})</td>
                    <td className="p-2 border-r border-slate-300">{c.corrective_action_plan}</td>
                    <td className="p-2 font-semibold text-emerald-700">{c.responsible_role}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-4">
              <Button variant="outline" size="sm" onClick={() => setShowPrintPlanModal(false)} className="text-xs border-slate-300 text-slate-700">
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPrintLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white text-slate-900 p-8 rounded-2xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-black uppercase text-slate-900">NHẬT KÝ THEO DÕI ĐO ĐẠC ĐIỂM KIỂM SOÁT TỚI HẠN CCP</h2>
                <p className="text-xs text-slate-500">Biểu mẫu BM-CCP-LOG-01 • Nhà máy WCERT</p>
              </div>
              <Button size="sm" onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold">
                <Printer className="w-3.5 h-3.5 mr-1" /> In Nhật Ký
              </Button>
            </div>

            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                <tr>
                  <th className="p-2 border-r border-slate-300">Mã CCP</th>
                  <th className="p-2 border-r border-slate-300">Lô Hàng</th>
                  <th className="p-2 border-r border-slate-300">Thời Gian</th>
                  <th className="p-2 border-r border-slate-300">Giá Trị Đo</th>
                  <th className="p-2 border-r border-slate-300">Giới Hạn Tới Hạn</th>
                  <th className="p-2 border-r border-slate-300">Kết Luận</th>
                  <th className="p-2">Người Giám Sát</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((l) => (
                  <tr key={l.log_id}>
                    <td className="p-2 font-bold border-r border-slate-300 text-rose-700">{l.ccp_code}</td>
                    <td className="p-2 font-mono font-bold border-r border-slate-300 text-slate-900">{l.batch_number}</td>
                    <td className="p-2 border-r border-slate-300 text-slate-600">{l.test_time || "Hôm nay"}</td>
                    <td className="p-2 font-bold border-r border-slate-300 text-slate-900">{l.measured_value} {l.unit}</td>
                    <td className="p-2 border-r border-slate-300">{l.critical_limit_text || "Tiêu chuẩn"}</td>
                    <td className="p-2 font-bold border-r border-slate-300">{l.status}</td>
                    <td className="p-2 font-medium text-slate-800">{l.inspector_name || "QC Ca"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-4">
              <Button variant="outline" size="sm" onClick={() => setShowPrintLogModal(false)} className="text-xs border-slate-300 text-slate-700">
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
