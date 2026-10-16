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
  ChevronUp,
  LayoutGrid,
  Table,
  ClipboardCheck,
} from "lucide-react";
import api from "@/lib/api";
import { normalizeWorkflowForSave, workflowErrorMessage } from "@/lib/workflow";
import { toast } from "sonner";
import logoImg from "@/assets/logo.png";
import { WorkflowBuilder, type WorkflowTemplateData } from "@/components/builder/WorkflowBuilder";
import { DynamicFormRenderer } from "@/components/builder/DynamicFormRenderer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { FormTemplateData } from "@/components/builder/FormBuilder";
import { printHtml } from "@/lib/print";
import { EmptyState } from "@/components/EmptyState";
import { ModuleGuideModal } from "@/components/ModuleGuideModal";
import { WorkflowGuideModal } from "@/components/WorkflowGuideModal";

export const Route = createFileRoute("/haccp")({
  head: () => ({
    meta: [
      { title: "Kế hoạch HACCP & Giám sát CCP – WCERT ISO 22000" },
      {
        name: "description",
        content:
          "Quản lý kế hoạch HACCP, lưu đồ quy trình công đoạn, ma trận phân tích mối nguy, điểm kiểm soát tới hạn (CCP/oPRP) và giám sát đo đạc thời gian thực theo tiêu chuẩn FSMS.",
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
interface HACCPPlanReview {
  id: number;
  review_code: string;
  plan_id: string;
  review_date: string;
  review_type: "PERIODIC" | "POST_CHANGE" | "INCIDENT_TRIGGERED" | "ANNUAL";
  change_request_id?: number;
  scope_and_objective: string;
  reviewers: string;
  ccp_audit_summary?: string;
  prp_audit_summary?: string;
  hazard_analysis_validity: boolean;
  monitoring_records_adequate: boolean;
  corrective_actions_effective: boolean;
  findings?: string;
  required_actions?: string;
  conclusion: "COMPLIANT" | "NEEDS_UPDATE" | "CRITICAL_DEFICIENCY";
  approved_by?: string;
  approval_date?: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  notes?: string;
  plan_name?: string;
  change_request_code?: string;
  created_at?: string;
}

interface HACCPPlan {
  id?: string;
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
  plan_code?: string;
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
  plan_id?: string;
  plan_code?: string;
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

export interface MetalDetectorLog {
  log_id: string;
  machine_code: string;
  machine_name: string;
  log_date: string;
  check_time: string;
  shift_name: string;
  batch_number: string;
  product_name: string;
  fe_standard_mm: number;
  fe_detected: boolean;
  sus_standard_mm: number;
  sus_detected: boolean;
  rejection_mechanism_working: boolean;
  metal_detected_count: number;
  test_result: string;
  corrective_action?: string;
  checked_by_name: string;
  verified_by_name?: string;
  notes?: string;
  created_at?: string;
}

export interface InProcessQCLog {
  log_id: string;
  inspection_code: string;
  stage_code: string;
  stage_name: string;
  log_date: string;
  check_time: string;
  shift_name: string;
  batch_number: string;
  product_name: string;
  criteria_data: Record<string, any>;
  overall_status: string;
  deviations?: string;
  corrective_actions?: string;
  inspector_name: string;
  supervisor_name?: string;
  notes?: string;
  created_at?: string;
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
    description:
      "Nồi hấp bị sụt áp suất hơi do rò rỉ van cấp nhiệt, nhiệt độ tâm chỉ đạt 71.5°C trong 10 giây.",
  },
  {
    title: "Sự cố 2: Máy dò kim loại không phát hiện que thử chuẩn Fe 1.5mm",
    ccp_code: "CCP 3",
    measured_value: 2.2,
    unit: "mm",
    batch_number: "LOT-2026-DEV02",
    critical_limit_text: "Fe <= 1.5mm; Non-Fe <= 2.0mm; SUS <= 2.5mm",
    description:
      "Kiểm tra đầu ca máy dò kim loại không phát tín hiệu còi báo khi que thử Fe 1.5mm đi qua cổng.",
  },
  {
    title: "Sự cố 3: Nhiệt độ tâm sau ra đông IQF chỉ đạt -14.2°C (Yêu cầu <= -18.0°C)",
    ccp_code: "oPRP 1",
    measured_value: -14.2,
    unit: "°C",
    batch_number: "LOT-2026-DEV03",
    critical_limit_text: "Nhiệt độ tâm sau IQF <= -18.0°C",
    description:
      "Băng chuyền chạy quá tải, nhiệt độ tâm cá fillet khi ra khỏi hầm cấp đông chỉ đạt -14.2°C.",
  },
];

// ==================== MAIN COMPONENT ====================
function HACCPModule() {
  const [activeTab, setActiveTab] = useState<
    "flowchart" | "ccp_plan" | "hazards" | "logs" | "reviews" | "ipqc" | "ai"
  >("flowchart");
  const [showGuide, setShowGuide] = useState(false);
  const [showWfGuide, setShowWfGuide] = useState(false);

  // Data states
  const [stats, setStats] = useState<HACCPStats | null>(null);
  const [plans, setPlans] = useState<HACCPPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("ALL");
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [hazards, setHazards] = useState<HazardAnalysis[]>([]);
  const [ccps, setCcps] = useState<CCPDefinition[]>([]);
  const [logs, setLogs] = useState<CCPMonitoringLog[]>([]);
  const [reviews, setReviews] = useState<HACCPPlanReview[]>([]);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [metalDetectorLogs, setMetalDetectorLogs] = useState<MetalDetectorLog[]>([]);
  const [inProcessLogs, setInProcessLogs] = useState<InProcessQCLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // IPQC Filters & Modals
  const [ipqcSubTab, setIpqcSubTab] = useState<"metal_detector" | "process_stages">(
    "metal_detector",
  );
  const [mdSearch, setMdSearch] = useState("");
  const [mdResultFilter, setMdResultFilter] = useState("ALL");
  const [stageSearch, setStageSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [stageStatusFilter, setStageStatusFilter] = useState("ALL");

  const [showMDModal, setShowMDModal] = useState(false);
  const [editingMDLog, setEditingMDLog] = useState<MetalDetectorLog | null>(null);
  const [mdForm, setMdForm] = useState({
    machine_code: "MD-01",
    machine_name: "Máy dò kim loại băng tải tự động Sesotec",
    log_date: new Date().toISOString().split("T")[0],
    check_time: "08:00",
    shift_name: "Ca 1",
    batch_number: "",
    product_name: "Gạo lứt đỏ sấy ăn liền 250g",
    fe_standard_mm: 0.5,
    fe_detected: true,
    sus_standard_mm: 0.8,
    sus_detected: true,
    rejection_mechanism_working: true,
    metal_detected_count: 0,
    corrective_action: "",
    checked_by_name: "Nguyễn Văn Kiểm",
    verified_by_name: "Trần Thị QA",
    notes: "",
  });

  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStageLog, setEditingStageLog] = useState<InProcessQCLog | null>(null);
  const [stageForm, setStageForm] = useState({
    inspection_code: "",
    stage_code: "DRYING_COOLING",
    stage_name: "Công đoạn sấy & làm nguội",
    log_date: new Date().toISOString().split("T")[0],
    check_time: "09:30",
    shift_name: "Ca 1",
    batch_number: "",
    product_name: "Gạo lứt đỏ sấy ăn liền",
    criteria_data_str: JSON.stringify(
      {
        drying_temp_c: 85,
        drying_time_min: 45,
        moisture_percent: 11.5,
        cooling_temp_c: 28,
        appearance: "Hạt nở đều, giòn rụm, màu nâu đỏ tự nhiên",
      },
      null,
      2,
    ),
    overall_status: "PASSED",
    deviations: "",
    corrective_actions: "",
    inspector_name: "Nguyễn Văn Kiểm",
    supervisor_name: "Trần Thị QA",
    notes: "",
  });

  // Reviews Filters & Modal
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewFilterType, setReviewFilterType] = useState<string>("ALL");
  const [reviewFilterConclusion, setReviewFilterConclusion] = useState<string>("ALL");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<HACCPPlanReview | null>(null);
  const [reviewForm, setReviewForm] = useState<any>({
    review_code: "",
    plan_id: "",
    review_date: new Date().toISOString().split("T")[0],
    review_type: "PERIODIC",
    change_request_id: "",
    scope_and_objective:
      "Thẩm tra định kỳ toàn diện kế hoạch HACCP, tính đầy đủ của hồ sơ giám sát CCP và hiệu lực phân tích mối nguy.",
    reviewers: "Nguyễn Văn An (Trưởng ban HACCP), Trần Thị Mai (QA)",
    ccp_audit_summary: "Đạt yêu cầu kiểm soát giới hạn tới hạn.",
    prp_audit_summary: "Các chương trình tiên quyết duy trì vệ sinh tốt.",
    hazard_analysis_validity: true,
    monitoring_records_adequate: true,
    corrective_actions_effective: true,
    findings: "Hệ thống vận hành ổn định, không phát hiện khiếm khuyết lớn.",
    required_actions: "Tiếp tục duy trì kế hoạch giám sát hiện hành.",
    conclusion: "COMPLIANT",
    approved_by: "Lê Hoàng Quân (Giám đốc Nhà máy)",
    approval_date: new Date().toISOString().split("T")[0],
    status: "APPROVED",
    notes: "",
  });

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

  // Deleting Confirmation States
  const [deletingPlan, setDeletingPlan] = useState<HACCPPlan | null>(null);
  const [deletingStep, setDeletingStep] = useState<ProcessStep | null>(null);
  const [deletingCCP, setDeletingCCP] = useState<CCPDefinition | null>(null);
  const [deletingHazard, setDeletingHazard] = useState<HazardAnalysis | null>(null);

  // Plans directory filters, view mode & flowchart accordion states
  const [planSearch, setPlanSearch] = useState("");
  const [planStatusFilter, setPlanStatusFilter] = useState("ALL");
  const [planViewMode, setPlanViewMode] = useState<"grid" | "table">("grid");
  const [collapsedPlanIds, setCollapsedPlanIds] = useState<Set<string>>(new Set());

  const toggleCollapsePlan = (planId: string) => {
    setCollapsedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  const collapseAllPlans = () => {
    setCollapsedPlanIds(new Set(plans.map((p) => p.plan_id)));
  };

  const expandAllPlans = () => {
    setCollapsedPlanIds(new Set());
  };

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
      const [sRes, plRes, stRes, hzRes, ccpRes, lgRes, revRes, crRes, mdRes, ipqcRes] =
        await Promise.all([
          api.get("/haccp/stats"),
          api.get("/haccp/plans"),
          api.get("/haccp/process-steps"),
          api.get("/haccp/hazards"),
          api.get("/haccp/ccp-definitions"),
          api.get("/haccp/ccp-logs"),
          api.get("/haccp/reviews"),
          api.get("/change-management/requests"),
          api.get("/haccp/metal-detector-logs"),
          api.get("/haccp/in-process-qc-logs"),
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
      setReviews(revRes.data);
      setChangeRequests(crRes.data);
      setMetalDetectorLogs(mdRes.data);
      setInProcessLogs(ipqcRes.data);
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể tải dữ liệu HACCP: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // HANDLERS THẨM TRA ĐỊNH KỲ KẾ HOẠCH HACCP & OPRP
  const openNewReview = () => {
    setEditingReview(null);
    const codeNum = reviews.length + 1;
    const defaultPlan = plans[0]?.plan_id || "";
    setReviewForm({
      review_code: `HACCP-REV-2026-${String(codeNum).padStart(3, "0")}`,
      plan_id: selectedPlanId !== "ALL" ? selectedPlanId : defaultPlan,
      review_date: new Date().toISOString().split("T")[0],
      review_type: "PERIODIC",
      change_request_id: "",
      scope_and_objective:
        "Thẩm tra định kỳ toàn diện kế hoạch HACCP, tính đầy đủ của hồ sơ giám sát CCP và hiệu lực phân tích mối nguy.",
      reviewers: "Nguyễn Văn An (Trưởng ban HACCP), Trần Thị Mai (QA)",
      ccp_audit_summary: "Đạt yêu cầu kiểm soát giới hạn tới hạn.",
      prp_audit_summary: "Các chương trình tiên quyết duy trì vệ sinh tốt.",
      hazard_analysis_validity: true,
      monitoring_records_adequate: true,
      corrective_actions_effective: true,
      findings: "Hệ thống vận hành ổn định, không phát hiện khiếm khuyết lớn.",
      required_actions: "Tiếp tục duy trì kế hoạch giám sát hiện hành.",
      conclusion: "COMPLIANT",
      approved_by: "Lê Hoàng Quân (Giám đốc Nhà máy)",
      approval_date: new Date().toISOString().split("T")[0],
      status: "APPROVED",
      notes: "",
    });
    setReviewModalOpen(true);
  };

  const openEditReview = (r: HACCPPlanReview) => {
    setEditingReview(r);
    setReviewForm({
      review_code: r.review_code,
      plan_id: r.plan_id,
      review_date: r.review_date,
      review_type: r.review_type,
      change_request_id: r.change_request_id ? String(r.change_request_id) : "",
      scope_and_objective: r.scope_and_objective,
      reviewers: r.reviewers,
      ccp_audit_summary: r.ccp_audit_summary || "",
      prp_audit_summary: r.prp_audit_summary || "",
      hazard_analysis_validity: r.hazard_analysis_validity,
      monitoring_records_adequate: r.monitoring_records_adequate,
      corrective_actions_effective: r.corrective_actions_effective,
      findings: r.findings || "",
      required_actions: r.required_actions || "",
      conclusion: r.conclusion,
      approved_by: r.approved_by || "",
      approval_date: r.approval_date || "",
      status: r.status,
      notes: r.notes || "",
    });
    setReviewModalOpen(true);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...reviewForm,
        change_request_id: reviewForm.change_request_id
          ? Number(reviewForm.change_request_id)
          : null,
        approval_date: reviewForm.approval_date || null,
      };
      if (editingReview) {
        await api.put(`/haccp/reviews/${editingReview.id}`, payload);
        toast.success("Đã cập nhật biên bản thẩm tra HACCP");
      } else {
        await api.post("/haccp/reviews", payload);
        toast.success("Đã tạo đợt thẩm tra HACCP mới");
      }
      setReviewModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu biên bản thẩm tra");
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa biên bản thẩm tra này?")) return;
    try {
      await api.delete(`/haccp/reviews/${id}`);
      toast.success("Đã xóa đợt thẩm tra");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa");
    }
  };

  // IN BIÊN BẢN THẨM TRA KẾ HOẠCH HACCP & OPRP (BM-HACCP-REV-01)
  const handlePrintHACCPReview = (rev: HACCPPlanReview) => {
    const p = plans.find((pl) => pl.plan_id === rev.plan_id);
    const cr = changeRequests.find((c) => c.id === rev.change_request_id);
    const html = `
      <div style="font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.45; color: #111; padding: 25px 30px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #333; padding: 6px;">
              <strong style="font-size: 13pt; color: #047857;">WCERT FOOD</strong><br/>
              <span style="font-size: 9pt;">HỆ THỐNG FSMS ISO 22000</span>
            </td>
            <td style="width: 50%; text-align: center; border: 1px solid #333; padding: 6px;">
              <strong style="font-size: 13pt; text-transform: uppercase;">BIÊN BẢN THẨM TRA KẾ HOẠCH HACCP & OPRP</strong><br/>
              <span style="font-size: 10pt; font-weight: bold;">(Căn cứ Điều 8.6 & 8.8 Tiêu chuẩn ISO 22000:2018)</span>
            </td>
            <td style="width: 25%; border: 1px solid #333; padding: 6px; font-size: 9pt;">
              Biểu mẫu: <strong>BM-HACCP-REV-01</strong><br/>
              Số phiếu: <strong>${rev.review_code}</strong><br/>
              Ngày lập: <strong>${rev.review_date}</strong>
            </td>
          </tr>
        </table>

        <div style="border: 1px solid #333; padding: 10px; margin-bottom: 15px; font-size: 10.5pt; background-color: #f8fafc;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 50%; padding: 3px 0;"><strong>Kế hoạch HACCP:</strong> ${p ? `${p.plan_name} (${p.plan_code})` : rev.plan_id}</td>
              <td style="width: 50%; padding: 3px 0;"><strong>Loại thẩm tra:</strong> ${
                rev.review_type === "PERIODIC"
                  ? "Thẩm tra định kỳ 6 tháng"
                  : rev.review_type === "POST_CHANGE"
                    ? "Thẩm tra sau thay đổi"
                    : rev.review_type === "INCIDENT_TRIGGERED"
                      ? "Thẩm tra sau sự cố CCP/NC"
                      : "Thẩm tra thường niên"
              }</td>
            </tr>
            <tr>
              <td style="padding: 3px 0;"><strong>Đoàn thẩm tra / Thành viên:</strong> ${rev.reviewers}</td>
              <td style="padding: 3px 0;"><strong>Yêu cầu thay đổi liên kết:</strong> ${
                cr ? `${cr.change_code} - ${cr.title}` : rev.change_request_code || "Không có"
              }</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 3px 0;"><strong>Mục đích & Phạm vi thẩm tra:</strong> ${rev.scope_and_objective}</td>
            </tr>
          </table>
        </div>

        <h4 style="margin: 10px 0 6px 0; font-size: 11pt; text-transform: uppercase;">1. ĐÁNH GIÁ 3 NỘI DUNG TRỌNG TÂM CỦA KẾ HOẠCH</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10.5pt;" border="1" cellpadding="6">
          <tr style="background-color: #f1f5f9; font-weight: bold; text-align: center;">
            <th style="width: 10%;">STT</th>
            <th style="width: 60%;">Tiêu chí thẩm tra theo ISO 22000 Điều 8.6 & 8.8</th>
            <th style="width: 30%;">Kết quả đánh giá</th>
          </tr>
          <tr>
            <td style="text-align: center;">1.1</td>
            <td><strong>Hiệu lực của Phân tích mối nguy (Hazard Analysis):</strong><br/><span style="font-size: 9.5pt; color: #475569;">Các mối nguy sinh học, hóa học, vật lý và chất gây dị ứng đã được nhận diện đầy đủ và ngưỡng chấp nhận còn giá trị.</span></td>
            <td style="text-align: center; font-weight: bold; color: ${rev.hazard_analysis_validity ? "#047857" : "#b91c1c"};">
              ${rev.hazard_analysis_validity ? "✅ ĐẠT HIỆU LỰC" : "❌ KHÔNG ĐẠT - CẦN ĐIỀU CHỈNH"}
            </td>
          </tr>
          <tr>
            <td style="text-align: center;">1.2</td>
            <td><strong>Tính đầy đủ & tin cậy của Hồ sơ giám sát CCP/OPRP:</strong><br/><span style="font-size: 9.5pt; color: #475569;">Nhật ký đo đạc nhiệt độ, áp suất, thời gian, tần suất giám sát được nhân viên ghi chép trung thực, đúng quy định.</span></td>
            <td style="text-align: center; font-weight: bold; color: ${rev.monitoring_records_adequate ? "#047857" : "#b91c1c"};">
              ${rev.monitoring_records_adequate ? "✅ ĐẦY ĐỦ & PHÙ HỢP" : "❌ THIẾU HỒ SƠ / KHÔNG ĐẠT"}
            </td>
          </tr>
          <tr>
            <td style="text-align: center;">1.3</td>
            <td><strong>Hiệu quả của Hành động khắc phục khi có vi phạm giới hạn tới hạn:</strong><br/><span style="font-size: 9.5pt; color: #475569;">Mọi sự cố vượt ngưỡng CCP đều được cô lập lô hàng, điều tra nguyên nhân gốc và thực hiện CAPA triệt để.</span></td>
            <td style="text-align: center; font-weight: bold; color: ${rev.corrective_actions_effective ? "#047857" : "#b91c1c"};">
              ${rev.corrective_actions_effective ? "✅ HIỆU QUẢ TRIỆT ĐỂ" : "❌ CHƯA HIỆU QUẢ"}
            </td>
          </tr>
        </table>

        <h4 style="margin: 10px 0 6px 0; font-size: 11pt; text-transform: uppercase;">2. TÓM TẮT PHÁT HIỆN & ĐIỀU CHỈNH YÊU CẦU</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10.5pt;" border="1" cellpadding="6">
          <tr>
            <td style="width: 35%; vertical-align: top; background-color: #f8fafc;"><strong>Thẩm tra CCP:</strong></td>
            <td>${rev.ccp_audit_summary || "Đạt yêu cầu kiểm soát giới hạn tới hạn."}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; background-color: #f8fafc;"><strong>Thẩm tra PRP/OPRP:</strong></td>
            <td>${rev.prp_audit_summary || "Các chương trình tiên quyết duy trì vệ sinh tốt."}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; background-color: #f8fafc;"><strong>Phát hiện trong kỳ thẩm tra:</strong></td>
            <td>${rev.findings || "Hệ thống vận hành ổn định, không phát hiện khiếm khuyết lớn."}</td>
          </tr>
          <tr>
            <td style="vertical-align: top; background-color: #f8fafc;"><strong>Hành động yêu cầu thực hiện:</strong></td>
            <td>${rev.required_actions || "Tiếp tục duy trì kế hoạch giám sát hiện hành."}</td>
          </tr>
        </table>

        <div style="border: 2px solid ${
          rev.conclusion === "COMPLIANT"
            ? "#047857"
            : rev.conclusion === "NEEDS_UPDATE"
              ? "#d97706"
              : "#b91c1c"
        }; padding: 12px; border-radius: 4px; margin-bottom: 20px; text-align: center;">
          <strong style="font-size: 12pt; text-transform: uppercase;">KẾT LUẬN THẨM TRA: </strong>
          <span style="font-size: 12pt; font-weight: bold; color: ${
            rev.conclusion === "COMPLIANT"
              ? "#047857"
              : rev.conclusion === "NEEDS_UPDATE"
                ? "#d97706"
                : "#b91c1c"
          };">
            ${
              rev.conclusion === "COMPLIANT"
                ? "KẾ HOẠCH HACCP & OPRP HOÀN TOÀN PHÙ HỢP & CÓ HIỆU LỰC"
                : rev.conclusion === "NEEDS_UPDATE"
                  ? "CẦN CẬP NHẬT / SỬA ĐỔI BỔ SUNG KẾ HOẠCH (KÍCH HOẠT ĐIỀU 6.3)"
                  : "KHIẾM KHUYẾT NGHIÊM TRỌNG - ĐÌNH CHỈ / TÁI THẨM ĐỊNH TOÀN DIỆN"
            }
          </span>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 30px; text-align: center; font-size: 11pt;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <strong>TRƯỞNG ĐOÀN THẨM TRA / ĐỘI TRƯỞNG HACCP</strong><br/>
              <span style="font-size: 10pt; font-style: italic;">(Ký & ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <strong>${rev.reviewers.split(",")[0] || "Đội Trưởng HACCP"}</strong>
            </td>
            <td style="width: 50%; vertical-align: top;">
              <strong>BAN GIÁM ĐỐC PHÊ DUYỆT</strong><br/>
              <span style="font-size: 10pt; font-style: italic;">(Ký, đóng dấu và ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <strong>${rev.approved_by || "Lê Hoàng Quân (Giám đốc Nhà máy)"}</strong>
            </td>
          </tr>
        </table>
      </div>
    `;
    printHtml(html);
  };

  const handlePrintHaccpPlan = () => {
    const p = currentPlan;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HACCP Plan - ${p?.plan_code || "BM-HACCP-01"}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 10mm 12mm; }
          body { font-family: "Times New Roman", Times, serif; font-size: 10pt; line-height: 1.35; color: #000; background: #fff; margin: 0; padding: 10px; }
          .header-tbl { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1.5px solid #000; }
          .header-tbl td { padding: 6px 10px; vertical-align: middle; border: 1px solid #000; }
          .title { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 0; }
          .sub { text-align: center; font-size: 9pt; font-style: italic; margin-top: 2px; }
          .meta-tbl { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9.5pt; border: 1px solid #000; }
          .meta-tbl td { padding: 5px 8px; border: 1px solid #000; }
          .plan-tbl { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9.5pt; }
          .plan-tbl th, .plan-tbl td { border: 1px solid #000; padding: 6px; }
          .plan-tbl th { background-color: #f1f5f9; text-align: center; font-weight: bold; }
          .sig-tbl { width: 100%; border-collapse: collapse; margin-top: 25px; text-align: center; font-size: 10pt; page-break-inside: avoid; }
          .sig-tbl td { width: 50%; vertical-align: top; }
          .footer-note { margin-top: 20px; font-size: 8pt; text-align: center; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 6px; }
        </style>
      </head>
      <body>
        <table class="header-tbl">
          <tr>
            <td style="width: 25%; text-align: center;">
              <strong style="font-size: 11pt; color: #047857;">WCERT FSMS</strong><br/>
              <span style="font-size: 8pt;">ISO 22000:2018 Standard</span>
            </td>
            <td style="width: 50%; text-align: center;">
              <h2 class="title">BẢNG KẾ HOẠCH KIỂM SOÁT MỐI NGUY & ĐIỂM CCP</h2>
              <div class="sub">(HACCP PLAN - ĐIỀU KHOẢN 8.5.4)</div>
            </td>
            <td style="width: 25%; font-size: 8.5pt;">
              Biểu mẫu: <strong>BM-HACCP-01</strong><br/>
              Mã kế hoạch: <strong>${p?.plan_code || "HACCP-2026-01"}</strong><br/>
              Phiên bản: <strong>Ver ${p?.version || "2.1"}</strong>
            </td>
          </tr>
        </table>

        <table class="meta-tbl">
          <tr>
            <td style="width: 50%;"><strong>Tên Kế hoạch / Sản phẩm:</strong> ${p?.plan_name || "Chế biến Cá Ngừ"}</td>
            <td style="width: 50%;"><strong>Phạm vi áp dụng:</strong> Toàn bộ dây chuyền sản xuất & đóng gói</td>
          </tr>
          <tr>
            <td><strong>Đội trưởng Đội HACCP:</strong> ${p?.team_leader || "Nguyễn Văn An"}</td>
            <td><strong>Lãnh đạo Phê duyệt:</strong> ${p?.approved_by || "Lê Hoàng Quân (Giám đốc)"}</td>
          </tr>
        </table>

        <table class="plan-tbl">
          <thead>
            <tr>
              <th style="width: 8%;">Mã CCP</th>
              <th style="width: 14%;">Công đoạn</th>
              <th style="width: 18%;">Mối nguy kiểm soát</th>
              <th style="width: 16%;">Giới hạn tới hạn (CL)</th>
              <th style="width: 18%;">Thủ tục Giám sát</th>
              <th style="width: 16%;">Hành động Khắc phục</th>
              <th style="width: 10%;">Trách nhiệm</th>
            </tr>
          </thead>
          <tbody>
            ${ccps
              .map(
                (c) => `
              <tr>
                <td style="text-align: center; font-weight: bold; color: #b91c1c;">${c.ccp_code}</td>
                <td><strong>${c.step_name}</strong></td>
                <td>${c.hazard_description}</td>
                <td><strong>${c.critical_limit?.condition_text || "Đạt chuẩn"}</strong></td>
                <td>${c.monitoring_frequency || "Liên tục"} (${c.monitoring_method || "Đo đạc kiểm tra"})</td>
                <td>${c.corrective_action_plan || "Cô lập lô, điều chỉnh thiết bị"}</td>
                <td style="text-align: center;">${c.responsible_role || "KCS / QC Ca"}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div style="border: 1px dashed #047857; background: #f0fdf4; padding: 8px 12px; border-radius: 4px; font-size: 9pt; color: #166534; margin-bottom: 15px;">
          <strong>✓ THẨM ĐỊNH KHOA HỌC (VALIDATION STUDY):</strong> Giới hạn tới hạn và các biện pháp kiểm soát trên đã được thẩm định dựa trên nghiên cứu khoa học, quy chuẩn kỹ thuật quốc gia QCVN và Codex CAC/RCP 1-1969 trước khi áp dụng vào thực tế sản xuất.
        </div>

        <table class="sig-tbl">
          <tr>
            <td>
              <strong>ĐỘI TRƯỞNG HACCP</strong><br/>
              <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
              <strong>${p?.team_leader || "Nguyễn Văn An"}</strong>
            </td>
            <td>
              <strong>GIÁM ĐỐC NHÀ MÁY PHÊ DUYỆT</strong><br/>
              <i>(Ký tên & đóng dấu)</i><br/><br/><br/><br/>
              <strong>${p?.approved_by || "Lê Hoàng Quân"}</strong>
            </td>
          </tr>
        </table>

        <div class="footer-note">
          WCERT FSMS • HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM THEO TIÊU CHUẨN QUỐC TẾ ISO 22000:2018
        </div>
      </body>
      </html>
    `;
    printHtml(html);
  };

  const handlePrintCCPLogs = () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nhật Ký Giám Sát CCP - BM-CCP-LOG-01</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 10mm 12mm; }
          body { font-family: "Times New Roman", Times, serif; font-size: 10pt; line-height: 1.35; color: #000; background: #fff; margin: 0; padding: 10px; }
          .header-tbl { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1.5px solid #000; }
          .header-tbl td { padding: 6px 10px; vertical-align: middle; border: 1px solid #000; }
          .title { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 0; }
          .sub { text-align: center; font-size: 9pt; font-style: italic; margin-top: 2px; }
          .log-tbl { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9.5pt; }
          .log-tbl th, .log-tbl td { border: 1px solid #000; padding: 6px; }
          .log-tbl th { background-color: #f1f5f9; text-align: center; font-weight: bold; }
          .sig-tbl { width: 100%; border-collapse: collapse; margin-top: 25px; text-align: center; font-size: 10pt; page-break-inside: avoid; }
          .sig-tbl td { width: 50%; vertical-align: top; }
          .footer-note { margin-top: 20px; font-size: 8pt; text-align: center; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 6px; }
        </style>
      </head>
      <body>
        <table class="header-tbl">
          <tr>
            <td style="width: 25%; text-align: center;">
              <strong style="font-size: 11pt; color: #047857;">WCERT FSMS</strong><br/>
              <span style="font-size: 8pt;">ISO 22000:2018 Standard</span>
            </td>
            <td style="width: 50%; text-align: center;">
              <h2 class="title">NHẬT KÝ GIÁM SÁT ĐIỂM KIỂM SOÁT TỚI HẠN CCP</h2>
              <div class="sub">(THEO DÕI THÔNG SỐ ĐO ĐẠC THEO CA VẬN HÀNH)</div>
            </td>
            <td style="width: 25%; font-size: 8.5pt;">
              Biểu mẫu: <strong>BM-CCP-LOG-01</strong><br/>
              Ngày in: <strong>${new Date().toLocaleDateString("vi-VN")}</strong><br/>
              Số bản ghi: <strong>${logs.length} bản ghi</strong>
            </td>
          </tr>
        </table>

        <table class="log-tbl">
          <thead>
            <tr>
              <th style="width: 10%;">Mã CCP</th>
              <th style="width: 15%;">Số Lô Hàng (Lot #)</th>
              <th style="width: 15%;">Thời Gian Đo</th>
              <th style="width: 15%;">Giá Trị Đo Thực Tế</th>
              <th style="width: 18%;">Giới Hạn Tới Hạn (CL)</th>
              <th style="width: 12%;">Kết Luận</th>
              <th style="width: 15%;">Người Giám Sát</th>
            </tr>
          </thead>
          <tbody>
            ${logs
              .map(
                (l) => `
              <tr>
                <td style="text-align: center; font-weight: bold; color: #b91c1c;">${l.ccp_code}</td>
                <td style="font-family: monospace; font-weight: bold;">${l.batch_number}</td>
                <td style="text-align: center;">${l.test_time || "Hôm nay"}</td>
                <td style="text-align: center; font-weight: bold;">${l.measured_value} ${l.unit}</td>
                <td>${l.critical_limit_text || "Tiêu chuẩn"}</td>
                <td style="text-align: center; font-weight: bold; color: ${l.status === "PASS" || l.status === "PASSED" ? "#047857" : "#b91c1c"};">
                  ${l.status === "PASS" || l.status === "PASSED" ? "✓ ĐẠT" : "✕ KHÔNG ĐẠT"}
                </td>
                <td>${l.inspector_name || "QC Ca"}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <table class="sig-tbl">
          <tr>
            <td>
              <strong>NHÂN VIÊN GIÁM SÁT CCP (QC/KCS)</strong><br/>
              <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
              <strong>QC Trưởng Ca Sản Xuất</strong>
            </td>
            <td>
              <strong>TRƯỞNG BAN HACCP / QUẢN ĐỐC XƯỞNG</strong><br/>
              <i>(Ký duyệt kiểm tra cuối ca)</i><br/><br/><br/><br/>
              <strong>${currentPlan?.team_leader || "Đội Trưởng HACCP"}</strong>
            </td>
          </tr>
        </table>

        <div class="footer-note">
          WCERT FSMS • HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM THEO TIÊU CHUẨN QUỐC TẾ ISO 22000:2018
        </div>
      </body>
      </html>
    `;
    printHtml(html);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Plans for Directory
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchQ =
        !planSearch ||
        p.plan_code.toLowerCase().includes(planSearch.toLowerCase()) ||
        p.plan_name.toLowerCase().includes(planSearch.toLowerCase()) ||
        p.product_line.toLowerCase().includes(planSearch.toLowerCase()) ||
        p.team_leader.toLowerCase().includes(planSearch.toLowerCase());
      const matchStat = planStatusFilter === "ALL" || p.status === planStatusFilter;
      return matchQ && matchStat;
    });
  }, [plans, planSearch, planStatusFilter]);

  // Filtered steps by selected plan
  const filteredSteps = useMemo(() => {
    const list = selectedPlanId === "ALL" ? steps : steps.filter((s) => s.plan_id === selectedPlanId);
    return [...list].sort((a, b) => (a.step_number || 0) - (b.step_number || 0));
  }, [steps, selectedPlanId]);

  // Selected Plan Object (null if viewing ALL plans)
  const currentPlan = useMemo(() => {
    if (selectedPlanId === "ALL") return null;
    return plans.find((p) => p.plan_id === selectedPlanId) || null;
  }, [plans, selectedPlanId]);

  // Filtered CCPs
  const filteredCCPs = useMemo(() => {
    const planStepIds =
      selectedPlanId !== "ALL"
        ? new Set(steps.filter((s) => s.plan_id === selectedPlanId).map((s) => s.step_id))
        : null;

    return ccps.filter((c) => {
      if (selectedPlanId !== "ALL") {
        const matchesDirect = c.plan_id === selectedPlanId;
        const matchesStep = c.process_step_id ? planStepIds?.has(c.process_step_id) : false;
        if (!matchesDirect && !matchesStep) return false;
      }
      const matchQ =
        !ccpSearch ||
        c.ccp_code.toLowerCase().includes(ccpSearch.toLowerCase()) ||
        c.name.toLowerCase().includes(ccpSearch.toLowerCase()) ||
        (c.step_name && c.step_name.toLowerCase().includes(ccpSearch.toLowerCase()));
      const matchStat = ccpStatusFilter === "ALL" || c.status === ccpStatusFilter;
      return matchQ && matchStat;
    });
  }, [ccps, ccpSearch, ccpStatusFilter, selectedPlanId, steps]);

  // Filtered Hazards
  const filteredHazards = useMemo(() => {
    const planStepIds =
      selectedPlanId !== "ALL"
        ? new Set(steps.filter((s) => s.plan_id === selectedPlanId).map((s) => s.step_id))
        : null;

    return hazards.filter((h) => {
      if (selectedPlanId !== "ALL" && !planStepIds?.has(h.step_id)) return false;
      const matchType = hzTypeFilter === "ALL" || h.hazard_type === hzTypeFilter;
      const matchClass = hzClassFilter === "ALL" || h.classification === hzClassFilter;
      return matchType && matchClass;
    });
  }, [hazards, hzTypeFilter, hzClassFilter, selectedPlanId, steps]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchCcp = logCcpFilter === "ALL" || l.ccp_id === logCcpFilter;
      const matchStat = logStatusFilter === "ALL" || l.status === logStatusFilter;
      return matchCcp && matchStat;
    });
  }, [logs, logCcpFilter, logStatusFilter]);

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchType = reviewFilterType === "ALL" || r.review_type === reviewFilterType;
      const matchConclusion =
        reviewFilterConclusion === "ALL" || r.conclusion === reviewFilterConclusion;
      const matchSearch =
        !reviewSearch.trim() ||
        r.review_code.toLowerCase().includes(reviewSearch.toLowerCase()) ||
        (r.scope_and_objective || "").toLowerCase().includes(reviewSearch.toLowerCase()) ||
        (r.reviewers || "").toLowerCase().includes(reviewSearch.toLowerCase()) ||
        (r.findings || "").toLowerCase().includes(reviewSearch.toLowerCase());
      return matchType && matchConclusion && matchSearch;
    });
  }, [reviews, reviewFilterType, reviewFilterConclusion, reviewSearch]);

  // Filtered Metal Detector Logs
  const filteredMDLogs = useMemo(() => {
    return metalDetectorLogs.filter((l) => {
      const matchSearch =
        !mdSearch.trim() ||
        l.machine_code.toLowerCase().includes(mdSearch.toLowerCase()) ||
        l.machine_name.toLowerCase().includes(mdSearch.toLowerCase()) ||
        l.batch_number.toLowerCase().includes(mdSearch.toLowerCase()) ||
        l.product_name.toLowerCase().includes(mdSearch.toLowerCase()) ||
        l.checked_by_name.toLowerCase().includes(mdSearch.toLowerCase());
      const matchResult = mdResultFilter === "ALL" || l.test_result === mdResultFilter;
      return matchSearch && matchResult;
    });
  }, [metalDetectorLogs, mdSearch, mdResultFilter]);

  // Filtered Stage QC Logs
  const filteredStageLogs = useMemo(() => {
    return inProcessLogs.filter((l) => {
      const matchSearch =
        !stageSearch.trim() ||
        l.inspection_code.toLowerCase().includes(stageSearch.toLowerCase()) ||
        l.stage_name.toLowerCase().includes(stageSearch.toLowerCase()) ||
        l.batch_number.toLowerCase().includes(stageSearch.toLowerCase()) ||
        l.product_name.toLowerCase().includes(stageSearch.toLowerCase()) ||
        l.inspector_name.toLowerCase().includes(stageSearch.toLowerCase());
      const matchStage = stageFilter === "ALL" || l.stage_code === stageFilter;
      const matchStatus = stageStatusFilter === "ALL" || l.overall_status === stageStatusFilter;
      return matchSearch && matchStage && matchStatus;
    });
  }, [inProcessLogs, stageSearch, stageFilter, stageStatusFilter]);

  // ==================== ACTIONS: IPQC - METAL DETECTOR LOGS ====================
  const handleOpenCreateMDLog = () => {
    setEditingMDLog(null);
    setMdForm({
      machine_code: "MD-01",
      machine_name: "Máy dò kim loại băng tải tự động Sesotec",
      log_date: new Date().toISOString().split("T")[0],
      check_time: new Date().toTimeString().slice(0, 5),
      shift_name: "Ca 1",
      batch_number: `LOT-2026-B0${Math.floor(Math.random() * 8 + 1)}`,
      product_name: "Gạo lứt đỏ sấy ăn liền 250g",
      fe_standard_mm: 0.5,
      fe_detected: true,
      sus_standard_mm: 0.8,
      sus_detected: true,
      rejection_mechanism_working: true,
      metal_detected_count: 0,
      corrective_action: "",
      checked_by_name: "Nguyễn Văn Kiểm",
      verified_by_name: "Trần Thị QA",
      notes: "Kiểm tra đầu ca đạt yêu cầu",
    });
    setShowMDModal(true);
  };

  const handleOpenEditMDLog = (log: MetalDetectorLog) => {
    setEditingMDLog(log);
    setMdForm({
      machine_code: log.machine_code,
      machine_name: log.machine_name,
      log_date: log.log_date,
      check_time: log.check_time,
      shift_name: log.shift_name,
      batch_number: log.batch_number,
      product_name: log.product_name,
      fe_standard_mm: log.fe_standard_mm,
      fe_detected: log.fe_detected,
      sus_standard_mm: log.sus_standard_mm,
      sus_detected: log.sus_detected,
      rejection_mechanism_working: log.rejection_mechanism_working,
      metal_detected_count: log.metal_detected_count,
      corrective_action: log.corrective_action || "",
      checked_by_name: log.checked_by_name,
      verified_by_name: log.verified_by_name || "",
      notes: log.notes || "",
    });
    setShowMDModal(true);
  };

  const handleSaveMDLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMDLog) {
        await api.put(`/haccp/metal-detector-logs/${editingMDLog.log_id}`, mdForm);
        toast.success("Cập nhật nhật ký kiểm tra máy dò kim loại thành công!");
      } else {
        await api.post("/haccp/metal-detector-logs", mdForm);
        toast.success("Thêm nhật ký kiểm tra máy dò kim loại thành công!");
      }
      setShowMDModal(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi lưu nhật ký máy dò: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteMDLog = async (logId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhật ký kiểm tra máy dò này?")) return;
    try {
      await api.delete(`/haccp/metal-detector-logs/${logId}`);
      toast.success("Đã xóa nhật ký máy dò kim loại!");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi khi xóa nhật ký: " + (err.response?.data?.detail || err.message));
    }
  };

  const handlePrintMDLog = (log: MetalDetectorLog) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BM06-KSQT: Nhật Ký Kiểm Tra Máy Dò Kim Loại - ${log.batch_number}</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; color: #1e293b; line-height: 1.4; margin: 0; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .header-table td { border: 1px solid #334155; padding: 8px; vertical-align: middle; }
          .logo-box { width: 90px; text-align: center; }
          .title-box { text-align: center; font-weight: bold; }
          .title-box h2 { margin: 0; font-size: 16px; text-transform: uppercase; color: #0f172a; }
          .title-box p { margin: 4px 0 0 0; font-size: 11px; font-weight: normal; color: #475569; }
          .code-box { width: 170px; font-size: 11px; }
          .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .info-grid td { padding: 5px 8px; font-size: 12px; }
          .data-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
          .data-table th, .data-table td { border: 1px solid #334155; padding: 8px; text-align: center; font-size: 12px; }
          .data-table th { background-color: #f1f5f9; font-weight: bold; }
          .status-pass { color: #047857; font-weight: bold; }
          .status-fail { color: #b91c1c; font-weight: bold; }
          .sig-table { width: 100%; border-collapse: collapse; margin-top: 25px; }
          .sig-table td { text-align: center; width: 50%; vertical-align: top; }
          .footer-note { margin-top: 20px; font-size: 10px; text-align: center; color: #64748b; font-style: italic; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="logo-box">
              <img src="${logoImg}" alt="Logo" style="height: 50px; object-fit: contain;" />
            </td>
            <td class="title-box">
              <h2>HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM ISO 22000 / HACCP</h2>
              <p>QUY TRÌNH KIỂM SOÁT QUÁ TRÌNH (BM06-KSQT)</p>
              <h3 style="margin: 6px 0 0 0; font-size: 14px; color: #1e3a8a;">NHẬT KÝ KIỂM TRA MÁY DÒ KIM LOẠI (CCP)</h3>
            </td>
            <td class="code-box">
              <b>Mã hiệu:</b> BM06-KSQT<br/>
              <b>Lần ban hành:</b> 01<br/>
              <b>Ngày ban hành:</b> 15/06/2024<br/>
              <b>Trang:</b> 1/1
            </td>
          </tr>
        </table>

        <table class="info-grid">
          <tr>
            <td width="33%"><b>Thiết bị:</b> ${log.machine_name} (${log.machine_code})</td>
            <td width="33%"><b>Ngày kiểm tra:</b> ${log.log_date} | ${log.check_time}</td>
            <td width="34%"><b>Ca sản xuất:</b> ${log.shift_name}</td>
          </tr>
          <tr>
            <td><b>Số lô (Lot/Batch):</b> ${log.batch_number}</td>
            <td colspan="2"><b>Tên sản phẩm:</b> ${log.product_name}</td>
          </tr>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th rowspan="2">Thông số kiểm tra</th>
              <th colspan="2">Thanh thử chuẩn (Test Piece)</th>
              <th rowspan="2">Cơ cấu loại bỏ sản phẩm</th>
              <th rowspan="2">Số lần phát hiện kim loại thực tế</th>
              <th rowspan="2">Kết luận</th>
              <th rowspan="2">Hành động khắc phục (nếu có)</th>
            </tr>
            <tr>
              <th>Fe (Sắt) Ø ${log.fe_standard_mm} mm</th>
              <th>SUS (Inox) Ø ${log.sus_standard_mm} mm</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Thử nghiệm độ nhạy máy dò</b></td>
              <td class="${log.fe_detected ? "status-pass" : "status-fail"}">
                ${log.fe_detected ? "✓ ĐÃ PHÁT HIỆN" : "✗ KHÔNG PHÁT HIỆN"}
              </td>
              <td class="${log.sus_detected ? "status-pass" : "status-fail"}">
                ${log.sus_detected ? "✓ ĐÃ PHÁT HIỆN" : "✗ KHÔNG PHÁT HIỆN"}
              </td>
              <td class="${log.rejection_mechanism_working ? "status-pass" : "status-fail"}">
                ${log.rejection_mechanism_working ? "✓ HOẠT ĐỘNG TỐT" : "✗ KHÔNG HOẠT ĐỘNG"}
              </td>
              <td><b>${log.metal_detected_count}</b> lần</td>
              <td class="${log.test_result === "PASSED" ? "status-pass" : "status-fail"}">
                ${log.test_result === "PASSED" ? "ĐẠT TIÊU CHUẨN" : "KHÔNG ĐẠT"}
              </td>
              <td>${log.corrective_action || "Không có sự cố"}</td>
            </tr>
          </tbody>
        </table>

        <div style="font-size: 11px; margin-bottom: 10px;">
          <b>Ghi chú:</b> ${log.notes || "Máy dò vận hành ổn định, không có can thiệp bất thường."}
        </div>

        <table class="sig-table">
          <tr>
            <td>
              <b>NGƯỜI KIỂM TRA (QC/VẬN HÀNH)</b><br/>
              <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
              <b>${log.checked_by_name}</b>
            </td>
            <td>
              <b>TRƯỞNG CA / TRƯỞNG BAN HACCP</b><br/>
              <i>(Xác nhận & ký duyệt)</i><br/><br/><br/><br/>
              <b>${log.verified_by_name || "Trần Thị QA"}</b>
            </td>
          </tr>
        </table>

        <div class="footer-note">
          Hồ sơ kiểm soát quá trình theo tiêu chuẩn ISO 22000:2018 - Điểm CCP Dò kim loại - Lưu trữ tối thiểu 2 năm.
        </div>
      </body>
      </html>
    `;
    printHtml(html);
  };

  // ==================== ACTIONS: IPQC - STAGE QC LOGS ====================
  const handleOpenCreateStageLog = () => {
    setEditingStageLog(null);
    setStageForm({
      inspection_code: `IPQC-2026-${String(inProcessLogs.length + 1).padStart(3, "0")}`,
      stage_code: "DRYING_COOLING",
      stage_name: "Công đoạn sấy & làm nguội",
      log_date: new Date().toISOString().split("T")[0],
      check_time: new Date().toTimeString().slice(0, 5),
      shift_name: "Ca 1",
      batch_number: `LOT-2026-B0${Math.floor(Math.random() * 8 + 1)}`,
      product_name: "Gạo lứt đỏ sấy ăn liền",
      criteria_data_str: JSON.stringify(
        {
          drying_temp_c: 85,
          drying_time_min: 45,
          moisture_percent: 11.5,
          cooling_temp_c: 28,
          appearance: "Hạt nở đều, giòn rụm, màu nâu đỏ tự nhiên",
        },
        null,
        2,
      ),
      overall_status: "PASSED",
      deviations: "",
      corrective_actions: "",
      inspector_name: "Nguyễn Văn Kiểm",
      supervisor_name: "Trần Thị QA",
      notes: "Các thông số đều nằm trong dải kiểm soát cho phép",
    });
    setShowStageModal(true);
  };

  const handleOpenEditStageLog = (log: InProcessQCLog) => {
    setEditingStageLog(log);
    setStageForm({
      inspection_code: log.inspection_code,
      stage_code: log.stage_code,
      stage_name: log.stage_name,
      log_date: log.log_date,
      check_time: log.check_time,
      shift_name: log.shift_name,
      batch_number: log.batch_number,
      product_name: log.product_name,
      criteria_data_str: JSON.stringify(log.criteria_data || {}, null, 2),
      overall_status: log.overall_status,
      deviations: log.deviations || "",
      corrective_actions: log.corrective_actions || "",
      inspector_name: log.inspector_name,
      supervisor_name: log.supervisor_name || "",
      notes: log.notes || "",
    });
    setShowStageModal(true);
  };

  const handleSaveStageLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let parsedCriteria = {};
      try {
        parsedCriteria = JSON.parse(stageForm.criteria_data_str);
      } catch (e) {
        toast.error("Dữ liệu thông số kỹ thuật (JSON) không hợp lệ!");
        return;
      }

      const payload = {
        inspection_code: stageForm.inspection_code,
        stage_code: stageForm.stage_code,
        stage_name: stageForm.stage_name,
        log_date: stageForm.log_date,
        check_time: stageForm.check_time,
        shift_name: stageForm.shift_name,
        batch_number: stageForm.batch_number,
        product_name: stageForm.product_name,
        criteria_data: parsedCriteria,
        overall_status: stageForm.overall_status,
        deviations: stageForm.deviations,
        corrective_actions: stageForm.corrective_actions,
        inspector_name: stageForm.inspector_name,
        supervisor_name: stageForm.supervisor_name,
        notes: stageForm.notes,
      };

      if (editingStageLog) {
        await api.put(`/haccp/in-process-qc-logs/${editingStageLog.log_id}`, payload);
        toast.success("Cập nhật phiếu kiểm soát công đoạn thành công!");
      } else {
        await api.post("/haccp/in-process-qc-logs", payload);
        toast.success("Thêm phiếu kiểm soát công đoạn thành công!");
      }
      setShowStageModal(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi lưu phiếu kiểm soát: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteStageLog = async (logId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phiếu kiểm soát công đoạn này?")) return;
    try {
      await api.delete(`/haccp/in-process-qc-logs/${logId}`);
      toast.success("Đã xóa phiếu kiểm soát công đoạn!");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi khi xóa phiếu: " + (err.response?.data?.detail || err.message));
    }
  };

  const handlePrintStageLog = (log: InProcessQCLog) => {
    const criteriaRows = Object.entries(log.criteria_data || {})
      .map(
        ([key, val]) => `
      <tr>
        <td style="font-weight: 600; text-align: left; padding: 6px 10px;">${key}</td>
        <td style="font-weight: bold; color: #0284c7; padding: 6px 10px;">${typeof val === "boolean" ? (val ? "ĐẠT (YES)" : "KHÔNG (NO)") : val}</td>
      </tr>
    `,
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu Kiểm Soát Quá Trình - ${log.inspection_code}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; color: #1e293b; line-height: 1.5; margin: 0; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .header-table td { border: 1px solid #334155; padding: 8px; vertical-align: middle; }
          .logo-box { width: 90px; text-align: center; }
          .title-box { text-align: center; font-weight: bold; }
          .title-box h2 { margin: 0; font-size: 15px; text-transform: uppercase; color: #0f172a; }
          .title-box p { margin: 4px 0 0 0; font-size: 11px; font-weight: normal; color: #475569; }
          .code-box { width: 170px; font-size: 11px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .info-table td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; }
          .param-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
          .param-table th, .param-table td { border: 1px solid #334155; padding: 6px 8px; text-align: center; font-size: 12px; }
          .param-table th { background-color: #f1f5f9; }
          .status-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; }
          .status-passed { background: #dcfce7; color: #15803d; }
          .status-failed { background: #fee2e2; color: #b91c1c; }
          .status-warning { background: #fef3c7; color: #b45309; }
          .sig-table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          .sig-table td { text-align: center; width: 50%; vertical-align: top; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="logo-box">
              <img src="${logoImg}" alt="Logo" style="height: 50px; object-fit: contain;" />
            </td>
            <td class="title-box">
              <h2>HỆ THỐNG QUẢN LÝ CHẤT LƯỢNG & AN TOÀN THỰC PHẨM</h2>
              <p>QUY TRÌNH KIỂM SOÁT QUÁ TRÌNH SẢN XUẤT (IPQC)</p>
              <h3 style="margin: 6px 0 0 0; font-size: 14px; color: #0284c7;">PHIẾU KIỂM SOÁT CÔNG ĐOẠN CHẾ BIẾN</h3>
            </td>
            <td class="code-box">
              <b>Mã phiếu:</b> ${log.inspection_code}<br/>
              <b>Công đoạn:</b> ${log.stage_code}<br/>
              <b>Ngày:</b> ${log.log_date}<br/>
              <b>Trang:</b> 1/1
            </td>
          </tr>
        </table>

        <table class="info-table">
          <tr>
            <td width="50%"><b>Tên công đoạn:</b> ${log.stage_name}</td>
            <td width="50%"><b>Thời gian kiểm tra:</b> ${log.check_time} | ${log.shift_name}</td>
          </tr>
          <tr>
            <td><b>Số lô / Mẻ (Batch):</b> ${log.batch_number}</td>
            <td><b>Sản phẩm:</b> ${log.product_name}</td>
          </tr>
          <tr>
            <td><b>Trạng thái kiểm tra:</b> <span class="status-badge status-${log.overall_status.toLowerCase()}">${log.overall_status}</span></td>
            <td><b>Người phụ trách giám sát:</b> ${log.supervisor_name || "Trần Thị QA"}</td>
          </tr>
        </table>

        <h4 style="margin: 15px 0 5px 0; font-size: 13px; text-transform: uppercase;">1. Các thông số kỹ thuật công đoạn đo kiểm thực tế</h4>
        <table class="param-table">
          <thead>
            <tr>
              <th width="50%">Chỉ tiêu / Thông số kiểm tra</th>
              <th width="50%">Giá trị đo thực tế</th>
            </tr>
          </thead>
          <tbody>
            ${criteriaRows || '<tr><td colspan="2">Không có thông số đo</td></tr>'}
          </tbody>
        </table>

        <h4 style="margin: 15px 0 5px 0; font-size: 13px; text-transform: uppercase;">2. Sai lệch & Hành động khắc phục</h4>
        <div style="border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 12px; margin-bottom: 10px; background-color: #f8fafc;">
          <p style="margin: 0 0 4px 0;"><b>Sai lệch ghi nhận:</b> ${log.deviations || "Không phát hiện sai lệch so với tiêu chuẩn."}</p>
          <p style="margin: 0 0 4px 0;"><b>Hành động khắc phục (CAPA):</b> ${log.corrective_actions || "Duy trì chế độ vận hành chuẩn."}</p>
          <p style="margin: 0;"><b>Ghi chú thêm:</b> ${log.notes || "Công đoạn đáp ứng yêu cầu chất lượng."}</p>
        </div>

        <table class="sig-table">
          <tr>
            <td>
              <b>KCS / NHÂN VIÊN KIỂM SOÁT (IPQC)</b><br/>
              <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
              <b>${log.inspector_name}</b>
            </td>
            <td>
              <b>QUẢN ĐỐC / TRƯỞNG CA SẢN XUẤT</b><br/>
              <i>(Xác nhận & ký duyệt)</i><br/><br/><br/><br/>
              <b>${log.supervisor_name || "Trần Thị QA"}</b>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    printHtml(html);
  };

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
      scope_description:
        "Áp dụng cho toàn bộ dây chuyền sản xuất từ khâu tiếp nhận nguyên liệu đến lưu kho thành phẩm.",
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

  const executeDeletePlan = async (plan: HACCPPlan) => {
    try {
      await api.delete(`/haccp/plans/${plan.plan_id}`);
      toast.success(`Đã xóa kế hoạch HACCP '${plan.plan_name}' thành công!`);
      if (selectedPlanId === plan.plan_id) {
        setSelectedPlanId("ALL");
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi xóa kế hoạch HACCP");
    }
  };

  // ==================== ACTIONS: PROCESS STEPS ====================
  const handleOpenCreateStep = (targetPlanId?: string) => {
    setEditingStep(null);
    const chosenPlanId =
      targetPlanId ||
      (selectedPlanId !== "ALL" ? selectedPlanId : plans[0]?.plan_id || "");
    const targetPlan = plans.find((p) => p.plan_id === chosenPlanId) || plans[0] || null;
    const planSteps = steps.filter((s) => s.plan_id === chosenPlanId);

    setStepForm({
      plan_id: chosenPlanId,
      step_number: planSteps.length + 1,
      step_name: "",
      product_line: targetPlan?.product_line || "Chế biến Thủy hải sản",
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

  const executeDeleteStep = async (step: ProcessStep) => {
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
      description:
        currentPlan?.scope_description || "Lưu đồ công đoạn sản xuất tuần tự theo chuẩn FSMS",
      version: currentPlan?.version || "1.0",
      nodes,
      edges,
      status: "ACTIVE",
    };
  }, [filteredSteps, currentPlan]);

  // ==================== ACTIONS: CCP ====================
  const handleOpenCreateCCP = () => {
    setEditingCCP(null);
    const initialPlanId = selectedPlanId !== "ALL" ? selectedPlanId : plans[0]?.plan_id || "";
    setCcpModalPlanId(initialPlanId);
    const planSteps = steps.filter((s) => s.plan_id === initialPlanId);
    setCcpForm({
      ccp_code: `CCP ${ccps.length + 1}`,
      name: "",
      process_step_id: planSteps.length > 0 ? planSteps[0].step_id : steps[0]?.step_id || "",
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
    const planId =
      linkedStep?.plan_id || (selectedPlanId !== "ALL" ? selectedPlanId : plans[0]?.plan_id || "");
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
        condition_text:
          ccpForm.condition_text ||
          `${ccpForm.param_name}: ${ccpForm.min_val || ""} ${ccpForm.unit}`,
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

  const executeDeleteCCP = async (ccp: CCPDefinition) => {
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
        toast.error(
          `CẢNH BÁO VI PHẠM: Giá trị ${saved.measured_value}${saved.unit} vượt ngoài giới hạn tới hạn!`,
        );
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
            {
              id: "batch",
              name: "batch_number",
              label: "Mã Lô Sản Xuất",
              type: "TEXT",
              required: true,
              default_value: "LOT-2026-B01",
            },
            {
              id: "temp",
              name: "measured_temp",
              label: "Nhiệt độ đo tâm (°C - Giới hạn ≥ 85.0°C)",
              type: "NUMBER",
              required: true,
              unit: "°C",
              default_value: 85.5,
            },
            {
              id: "time",
              name: "holding_time",
              label: "Thời gian giữ nhiệt (Phút)",
              type: "NUMBER",
              required: true,
              unit: "phút",
              default_value: 15,
            },
            {
              id: "is_pass",
              name: "is_pass",
              label: "Kết luận: Đạt Giới Hạn Tới Hạn?",
              type: "YESNO",
              required: true,
              default_value: true,
            },
            {
              id: "notes",
              name: "notes",
              label: "Ghi chú & Hành động khắc phục",
              type: "TEXT",
              required: false,
            },
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
    const initialPlanId = selectedPlanId !== "ALL" ? selectedPlanId : plans[0]?.plan_id || "";
    setHazardModalPlanId(initialPlanId);
    const planSteps = steps.filter((s) => s.plan_id === initialPlanId);
    setHazardForm({
      step_id: planSteps.length > 0 ? planSteps[0].step_id : steps[0]?.step_id || "",
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
    const planId =
      linkedStep?.plan_id || (selectedPlanId !== "ALL" ? selectedPlanId : plans[0]?.plan_id || "");
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

  const executeDeleteHazard = async (h: HazardAnalysis) => {
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
      toast.error(
        "Lỗi khi chạy AI phân tích mối nguy: " + (err.response?.data?.detail || err.message),
      );
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
    if (score >= 6)
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          Cao ({score})
        </span>
      );
    if (score >= 3)
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          Vừa ({score})
        </span>
      );
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
        Thấp ({score})
      </span>
    );
  };

  const getClassBadge = (cls: string) => {
    if (cls === "CCP")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-sm">
          ★ CCP
        </span>
      );
    if (cls === "OPRP")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">
          oPRP
        </span>
      );
    if (cls === "PRP")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
          PRP
        </span>
      );
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-slate-600 bg-slate-100">
        K.Ý nghĩa
      </span>
    );
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
        description="Hệ thống xây dựng Kế hoạch HACCP, lưu đồ công đoạn tuần tự, ma trận phân tích mối nguy Codex Q1-Q4 và giám sát đo đạc thời gian thực."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(true)}
              className="text-xs border border-emerald-400/80 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 font-bold shadow-sm transition-all duration-150"
            >
              <BookOpen className="h-3.5 w-3.5 mr-1.5 transition-colors" /> Hướng Dẫn Nghiệp Vụ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrintPlanModal(true)}
              className="text-xs border border-slate-300 bg-white text-slate-800 hover:bg-slate-900 hover:text-white hover:border-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 font-semibold shadow-sm transition-all duration-150"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5 transition-colors" /> In Kế Hoạch HACCP
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrintLogModal(true)}
              className="text-xs border border-slate-300 bg-white text-slate-800 hover:bg-slate-900 hover:text-white hover:border-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 font-semibold shadow-sm transition-all duration-150"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5 transition-colors" /> In Nhật Ký Đo Đạc
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
            <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
              {stats?.active_ccps ?? 4} Hoạt động 100%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-700 font-medium">Bao quát toàn bộ lưu đồ chế biến</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Đo Đạc Trong Ngưỡng
            </span>
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 border border-emerald-200">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-700">
              {stats?.in_limit_percentage ?? 100}%
            </span>
            <span className="text-xs font-bold text-slate-700">
              ({stats?.normal_logs_count ?? 5}/{stats?.total_logs_today ?? 6} mẻ)
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-700 font-medium">Đạt chỉ tiêu an toàn thực phẩm</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Cảnh Báo Sát Ngưỡng
            </span>
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 border border-amber-200">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-700">
              {stats?.warning_logs_count ?? 1}
            </span>
            <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              Tiệm cận ±5%
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-700 font-medium">Đã căn chỉnh thông số vận hành</p>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              Vi Phạm Tới Hạn (24h)
            </span>
            <div
              className={`p-2 rounded-lg ${(stats?.critical_breaches_count ?? 0) > 0 ? "bg-rose-100 text-rose-600 border border-rose-200" : "bg-emerald-100 text-emerald-600 border border-emerald-200"}`}
            >
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-black ${(stats?.critical_breaches_count ?? 0) > 0 ? "text-rose-600" : "text-slate-900"}`}
            >
              {stats?.critical_breaches_count ?? 0}
            </span>
            <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
              0 Lô Cách Ly
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-700 font-medium">Hệ thống an toàn tuyệt đối</p>
        </div>
      </div>

      {/* MODERN CONSOLIDATED TABS NAVIGATION - NO HORIZONTAL CUT-OFF */}
      <div className="space-y-3">
        <div className="bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-1.5 sm:gap-2 shadow-xs">
          {/* Nhóm 1: Kế Hoạch & Thiết Kế HACCP */}
          <button
            onClick={() => {
              if (activeTab !== "flowchart" && activeTab !== "ccp_plan" && activeTab !== "hazards") {
                setActiveTab("flowchart");
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "flowchart" || activeTab === "ccp_plan" || activeTab === "hazards"
                ? "bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-black"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-800/60"
            }`}
          >
            <Workflow className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Kế Hoạch & Phân Tích Mối Nguy</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === "flowchart" || activeTab === "ccp_plan" || activeTab === "hazards"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
              }`}
            >
              {filteredSteps.length + hazards.length + ccps.length}
            </span>
          </button>

          {/* Nhóm 2: Giám Sát Vận Hành (CCP & IPQC) */}
          <button
            onClick={() => {
              if (activeTab !== "logs" && activeTab !== "ipqc") {
                setActiveTab("logs");
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "logs" || activeTab === "ipqc"
                ? "bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-black"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-800/60"
            }`}
          >
            <Clock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Giám Sát Vận Hành (CCP & IPQC)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === "logs" || activeTab === "ipqc"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
              }`}
            >
              {logs.length + metalDetectorLogs.length + inProcessLogs.length}
            </span>
          </button>

          {/* Nhóm 3: Thẩm Tra Kế Hoạch */}
          <button
            onClick={() => setActiveTab("reviews")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "reviews"
                ? "bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-400 shadow-sm border border-slate-200/80 dark:border-slate-700 font-black"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-800/60"
            }`}
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-teal-600" />
            <span>Thẩm Tra Kế Hoạch</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === "reviews"
                  ? "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
              }`}
            >
              {reviews.length}
            </span>
          </button>

          {/* Nhóm 4: Trợ Lý AI Chuyên Gia HACCP */}
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "ai"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm font-black"
                : "text-purple-700 dark:text-purple-400 hover:bg-purple-100/60 dark:hover:bg-purple-950/40"
            }`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Trợ Lý AI HACCP</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-extrabold ${activeTab === "ai" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300"}`}>
              AI Pro
            </span>
          </button>
        </div>

        {/* SUB-TABS: Khi đang ở Nhóm Kế Hoạch & Mối Nguy */}
        {(activeTab === "flowchart" || activeTab === "ccp_plan" || activeTab === "hazards") && (
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 w-fit">
            <button
              onClick={() => setActiveTab("flowchart")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "flowchart"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Workflow className="h-3.5 w-3.5" />
              <span>1. Kế Hoạch & Lưu Đồ Công Đoạn ({filteredSteps.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("hazards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "hazards"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>2. Bảng Phân Tích Mối Nguy ({hazards.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("ccp_plan")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ccp_plan"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              <span>3. Kế Hoạch Kiểm Soát CCP & oPRP ({ccps.length})</span>
            </button>
          </div>
        )}

        {/* SUB-TABS: Khi đang ở Nhóm Giám Sát Vận Hành */}
        {(activeTab === "logs" || activeTab === "ipqc") && (
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 w-fit">
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "logs"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>1. Nhật Ký Giám Sát CCP Thời Gian Thực ({logs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("ipqc")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ipqc"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <ScanLine className="h-3.5 w-3.5" />
              <span>2. Kiểm Soát Quá Trình (IPQC) & Máy Dò ({metalDetectorLogs.length + inProcessLogs.length})</span>
            </button>
          </div>
        )}
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
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditPlan(currentPlan)}
                      className="border border-slate-300 bg-white text-slate-800 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all duration-150 group"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                      Sửa Hồ Sơ Kế Hoạch
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePrintHaccpPlan}
                      className="border border-slate-300 bg-white text-slate-800 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all duration-150 group"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                      In Kế Hoạch
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeletingPlan(currentPlan)}
                      className="border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white hover:border-rose-600 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all duration-150 group"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500 group-hover:text-white transition-colors" />
                      Xóa Kế Hoạch
                    </Button>
                  </>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowWorkflowStudio(true)}
                  className="border border-blue-400/80 bg-blue-50 text-blue-800 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all duration-150 group"
                >
                  <Workflow className="w-3.5 h-3.5 text-blue-600 group-hover:text-white transition-colors" />
                  Bộ Thiết Kế Lưu Đồ (Studio)
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowWfGuide(true)}
                  className="border border-indigo-400/80 bg-indigo-50 text-indigo-800 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all duration-150 group"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 group-hover:text-white transition-colors" />
                  Hướng Dẫn Lưu Đồ HACCP
                </Button>
              </div>
            </div>

            {/* Khi chọn Tất cả kế hoạch: Hiển thị danh sách đầy đủ tất cả các kế hoạch HACCP */}
            {selectedPlanId === "ALL" && (
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Danh Mục Tất Cả Kế Hoạch HACCP ({filteredPlans.length}/{plans.length})
                  </div>

                  {/* Search, Filter & View Toggle */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[200px]">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <Input
                        value={planSearch}
                        onChange={(e) => setPlanSearch(e.target.value)}
                        placeholder="Tìm mã, tên, dây chuyền..."
                        className="pl-8 h-8 text-xs bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 font-medium"
                      />
                    </div>

                    <select
                      value={planStatusFilter}
                      onChange={(e) => setPlanStatusFilter(e.target.value)}
                      className="h-8 bg-white border border-slate-300 rounded-lg px-2.5 text-xs font-bold text-slate-800"
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="APPROVED">Đã phê duyệt (APPROVED)</option>
                      <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                      <option value="DRAFT">Bản thảo (DRAFT)</option>
                    </select>

                    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                      <button
                        type="button"
                        onClick={() => setPlanViewMode("grid")}
                        className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                          planViewMode === "grid"
                            ? "bg-white text-emerald-700 shadow-xs font-bold"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        title="Dạng lưới thẻ"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Thẻ</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanViewMode("table")}
                        className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                          planViewMode === "table"
                            ? "bg-white text-emerald-700 shadow-xs font-bold"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                        title="Dạng bảng dữ liệu chuẩn (phù hợp nhiều kế hoạch)"
                      >
                        <Table className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Bảng</span>
                      </button>
                    </div>
                  </div>
                </div>

                {filteredPlans.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50">
                    {plans.length === 0
                      ? 'Chưa có kế hoạch HACCP nào. Nhấp "+ Tạo Kế Hoạch HACCP Mới" để bắt đầu.'
                      : "Không tìm thấy kế hoạch HACCP nào khớp với điều kiện tìm kiếm."}
                  </div>
                ) : planViewMode === "grid" ? (
                  /* DẠNG 1: LƯỚI THẺ (GRID CARDS) */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPlans.map((p) => {
                      const pSteps = steps.filter((s) => s.plan_id === p.plan_id);
                      const pCcps = pSteps.filter((s) => s.is_ccp_or_oprp);
                      return (
                        <div
                          key={p.plan_id}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    {p.plan_code}
                                  </span>
                                  <span className="text-xs font-bold text-slate-700">
                                    Ver {p.version}
                                  </span>
                                  <span
                                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                      p.status === "APPROVED"
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                        : p.status === "ACTIVE"
                                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                                        : "bg-amber-100 text-amber-800 border border-amber-300"
                                    }`}
                                  >
                                    {p.status}
                                  </span>
                                </div>
                                <h4 className="font-black text-sm text-slate-900 mt-1.5">
                                  {p.plan_name}
                                </h4>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenEditPlan(p)}
                                  className="h-7 w-7 p-0 text-slate-700 hover:text-slate-900 hover:bg-slate-200"
                                  title="Sửa kế hoạch"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeletingPlan(p)}
                                  className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-100"
                                  title="Xóa kế hoạch"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-100/70 p-2.5 rounded-lg border border-slate-200 mt-3">
                              <div>
                                <span className="text-slate-700 font-bold block text-[11px]">Dây chuyền:</span>
                                <span className="font-black text-slate-900 truncate block">
                                  {p.product_line}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-700 font-bold block text-[11px]">Trưởng ban HACCP:</span>
                                <span className="font-black text-slate-900 truncate block">
                                  {p.team_leader}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-700 font-bold block text-[11px]">Ngày ban hành:</span>
                                <span className="font-bold text-slate-900 block">
                                  {p.effective_date || "15/01/2026"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-700 font-bold block text-[11px]">Quy mô kiểm soát:</span>
                                <span className="font-black text-emerald-800 block">
                                  {pSteps.length} công đoạn • {pCcps.length} CCP
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                            <span className="text-xs text-slate-700 font-medium truncate">
                              {p.scope_description || "Kế hoạch kiểm soát HACCP chuẩn"}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCreateStep(p.plan_id)}
                                className="h-7 px-2.5 text-[11px] border-emerald-400 text-emerald-800 hover:bg-emerald-50 font-bold"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Thêm Công Đoạn
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setSelectedPlanId(p.plan_id)}
                                className="h-7 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              >
                                Xem Lưu Đồ
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* DẠNG 2: BẢNG DỮ LIỆU CHUẨN ISO (DATA TABLE - TỐI ƯU KHI CÓ NHIỀU KẾ HOẠCH) */
                  <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-slate-900 font-black">
                          <th className="py-2.5 px-3">Mã Kế Hoạch</th>
                          <th className="py-2.5 px-3">Tên Kế Hoạch & Phạm Vi</th>
                          <th className="py-2.5 px-3">Dây Chuyền</th>
                          <th className="py-2.5 px-3">Trưởng Ban</th>
                          <th className="py-2.5 px-3 text-center">Quy Mô</th>
                          <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                          <th className="py-2.5 px-3 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        {filteredPlans.map((p) => {
                          const pSteps = steps.filter((s) => s.plan_id === p.plan_id);
                          const pCcps = pSteps.filter((s) => s.is_ccp_or_oprp);
                          return (
                            <tr key={p.plan_id} className="hover:bg-slate-50/90 transition-colors">
                              <td className="py-3 px-3">
                                <div className="font-mono font-black text-emerald-800">{p.plan_code}</div>
                                <div className="text-[11px] text-slate-600 font-bold">Ver {p.version}</div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-black text-slate-900">{p.plan_name}</div>
                                <div className="text-[11px] text-slate-700 font-medium truncate max-w-xs">
                                  {p.scope_description || "Kế hoạch kiểm soát an toàn"}
                                </div>
                              </td>
                              <td className="py-3 px-3 font-bold text-slate-900">{p.product_line}</td>
                              <td className="py-3 px-3 text-slate-800 font-medium">{p.team_leader}</td>
                              <td className="py-3 px-3 text-center">
                                <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-900 font-black text-[11px] border border-emerald-300">
                                  {pSteps.length} bước • {pCcps.length} CCP
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                    p.status === "APPROVED"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : p.status === "ACTIVE"
                                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                                      : "bg-amber-100 text-amber-800 border border-amber-300"
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenCreateStep(p.plan_id)}
                                    className="h-7 px-2 text-[11px] border-emerald-400 text-emerald-800 hover:bg-emerald-50 font-bold"
                                    title="Thêm công đoạn cho kế hoạch này"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedPlanId(p.plan_id)}
                                    className="h-7 px-2.5 text-[11px] bg-slate-900 hover:bg-slate-800 text-white font-bold"
                                  >
                                    Xem Lưu Đồ
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenEditPlan(p)}
                                    className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                                    title="Sửa kế hoạch"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeletingPlan(p)}
                                    className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-100"
                                    title="Xóa kế hoạch"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Khi chọn một kế hoạch cụ thể: Hiển thị thẻ thông tin kế hoạch đó */}
            {currentPlan && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      Đang xem chi tiết:
                    </span>
                    <span className="font-black text-xs text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      {currentPlan.plan_code} - {currentPlan.plan_name}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedPlanId("ALL")}
                    className="text-xs text-slate-700 hover:text-slate-900 font-bold flex items-center gap-1 h-7 px-2"
                  >
                    ← Quay lại xem tất cả kế hoạch
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
                  <div>
                    <span className="text-slate-700 font-bold">Mã kế hoạch:</span>
                    <div className="font-mono font-black text-emerald-800 mt-0.5">
                      {currentPlan.plan_code}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-700 font-bold">Dây chuyền áp dụng:</span>
                    <div className="font-black text-slate-900 mt-0.5">{currentPlan.product_line}</div>
                  </div>
                  <div>
                    <span className="text-slate-700 font-bold">Trưởng ban HACCP:</span>
                    <div className="font-black text-slate-900 mt-0.5">{currentPlan.team_leader}</div>
                  </div>
                  <div>
                    <span className="text-slate-700 font-bold">Ngày ban hành & Phiên bản:</span>
                    <div className="font-black text-slate-900 mt-0.5">
                      {currentPlan.effective_date || "15/01/2026"} (Ver {currentPlan.version})
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Flowchart Diagram Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-emerald-600" />
                  Sơ Đồ Lưu Đồ Quy Trình Công Đoạn Tuần Tự
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedPlanId === "ALL"
                    ? "Hiển thị lưu đồ tuần tự theo từng kế hoạch HACCP từ tiếp nhận đến thành phẩm và vị trí các điểm kiểm soát tới hạn CCP."
                    : `Lưu đồ công đoạn sản xuất cho kế hoạch [${currentPlan?.plan_code}] ${currentPlan?.plan_name || ""}.`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedPlanId === "ALL" && plans.length > 1 && (
                  <div className="flex items-center gap-1.5 mr-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={collapseAllPlans}
                      className="border-slate-200 text-slate-600 hover:bg-slate-100 text-xs h-8"
                      title="Thu gọn tất cả lưu đồ để nhìn tổng quan"
                    >
                      Thu Gọn Tất Cả
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={expandAllPlans}
                      className="border-slate-200 text-slate-600 hover:bg-slate-100 text-xs h-8"
                      title="Mở rộng toàn bộ lưu đồ"
                    >
                      Mở Rộng Tất Cả
                    </Button>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowWfGuide(true)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 h-8"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  Nguyên Tắc Lưu Đồ
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenCreateStep(currentPlan?.plan_id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm h-8"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm Công Đoạn
                </Button>
              </div>
            </div>

            {/* Quick Jump Chips when viewing ALL plans */}
            {selectedPlanId === "ALL" && plans.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                <span className="text-xs font-black text-slate-800 shrink-0 uppercase tracking-wider flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5 text-emerald-600" />
                  Nhảy Nhanh Đến Dây Chuyền:
                </span>
                {plans.map((p) => {
                  const pSteps = steps.filter((s) => s.plan_id === p.plan_id);
                  const isCollapsed = collapsedPlanIds.has(p.plan_id);
                  return (
                    <button
                      key={p.plan_id}
                      type="button"
                      onClick={() => {
                        if (isCollapsed) toggleCollapsePlan(p.plan_id);
                        const el = document.getElementById(`plan-flowchart-${p.plan_id}`);
                        el?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 bg-white border-slate-300 text-slate-800 hover:border-emerald-500 hover:text-emerald-900 hover:bg-emerald-50/70 shadow-xs"
                    >
                      <span className="font-mono font-black text-[11px] bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded border border-emerald-300">
                        {p.plan_code}
                      </span>
                      <span className="truncate max-w-[150px] font-bold text-slate-900">{p.plan_name}</span>
                      <span className="text-[11px] text-emerald-900 font-black bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                        {pSteps.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Inline Guidance Tip Banner */}
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50/70 to-blue-50 border border-blue-300 text-xs text-blue-950 font-medium shadow-sm">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  <strong className="font-black text-blue-900">Hướng Dẫn Chuẩn Hóa Lưu Đồ Công Đoạn:</strong> Đảm bảo tính tuần tự liên
                  tục từ tiếp nhận đến xuất kho, xác định đầy đủ thông số kỹ thuật (nhiệt độ, thời
                  gian, thiết bị) và đánh dấu nổi bật các điểm kiểm soát tới hạn CCP/oPRP.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowWfGuide(true)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
              >
                Xem Hướng Dẫn
              </button>
            </div>

            {/* Visual Flow Pipeline */}
            {selectedPlanId === "ALL" ? (
              <div className="space-y-8 py-2">
                {plans.length === 0 ? (
                  <EmptyState
                    icon={GitBranch}
                    title="Chưa có kế hoạch HACCP nào"
                    description="Hãy bắt đầu tạo kế hoạch HACCP và thiết lập các bước công nghệ trong dây chuyền sản xuất."
                    actionLabel="+ Tạo Kế Hoạch HACCP Mới"
                    onAction={handleOpenCreatePlan}
                    onGuide={() => setShowGuide(true)}
                  />
                ) : (
                  plans.map((plan) => {
                    const planSteps = steps
                      .filter((s) => s.plan_id === plan.plan_id)
                      .sort((a, b) => (a.step_number || 0) - (b.step_number || 0));
                    const planCcps = planSteps.filter((s) => s.is_ccp_or_oprp);
                    const isPlanCollapsed = collapsedPlanIds.has(plan.plan_id);

                    return (
                      <div
                        key={plan.plan_id}
                        id={`plan-flowchart-${plan.plan_id}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5 space-y-4 scroll-mt-24 transition-all"
                      >
                        {/* Plan Sub-header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-emerald-700 text-white shadow-sm">
                              {plan.plan_code}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-black text-slate-900">
                                  {plan.plan_name}
                                </h4>
                                <span className="text-xs text-slate-700 font-bold">
                                  (Dây chuyền: {plan.product_line})
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-700 font-bold">
                                <span className="text-emerald-800">
                                  {planSteps.length} công đoạn
                                </span>
                                <span>•</span>
                                <span className="text-rose-700">
                                  {planCcps.length} CCP/oPRP
                                </span>
                                <span>•</span>
                                <span>Ver {plan.version}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleCollapsePlan(plan.plan_id)}
                              className="text-xs h-8 text-slate-700 hover:text-slate-900 font-bold flex items-center gap-1"
                              title={isPlanCollapsed ? "Mở rộng lưu đồ chi tiết" : "Thu gọn lưu đồ"}
                            >
                              {isPlanCollapsed ? (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                                  Mở Rộng ({planSteps.length})
                                </>
                              ) : (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                                  Thu Gọn
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedPlanId(plan.plan_id)}
                              className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                            >
                              Chỉ Xem Kế Hoạch Này
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleOpenCreateStep(plan.plan_id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 flex items-center gap-1.5 shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Thêm Công Đoạn
                            </Button>
                          </div>
                        </div>

                        {/* Plan Steps Sequence or Collapsed Banner */}
                        {isPlanCollapsed ? (
                          <div
                            onClick={() => toggleCollapsePlan(plan.plan_id)}
                            className="p-3.5 text-center rounded-xl bg-slate-100/90 border border-slate-300 text-xs text-slate-800 font-bold hover:bg-emerald-50/80 hover:text-emerald-900 hover:border-emerald-300 cursor-pointer transition flex items-center justify-center gap-2 shadow-xs group"
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-700 transition" />
                            <span>
                              Đang thu gọn lưu đồ ({planSteps.length} công đoạn, {planCcps.length} CCP) — <strong className="underline text-emerald-800">Nhấp để mở rộng sơ đồ chi tiết</strong>
                            </span>
                          </div>
                        ) : planSteps.length === 0 ? (
                          <div className="p-6 text-center rounded-xl bg-white border border-dashed border-slate-300 space-y-2">
                            <GitBranch className="w-8 h-8 text-slate-300 mx-auto" />
                            <div className="text-xs font-bold text-slate-800">
                              Kế hoạch [{plan.plan_code}] chưa có công đoạn lưu đồ nào
                            </div>
                            <p className="text-xs text-slate-600 max-w-md mx-auto">
                              Bổ sung các bước công nghệ cho dây chuyền "{plan.product_line}" để hoàn thiện lưu đồ quy trình sản xuất.
                            </p>
                            <Button
                              size="sm"
                              onClick={() => handleOpenCreateStep(plan.plan_id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold mt-2 shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Thêm Công Đoạn Cho {plan.plan_code}
                            </Button>
                          </div>
                        ) : (
                          <div className="max-w-2xl mx-auto space-y-3 py-1">
                            {planSteps.map((step, idx) => (
                              <React.Fragment key={step.step_id}>
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
                                        step.is_ccp_or_oprp
                                          ? "bg-rose-600 text-white"
                                          : "bg-emerald-600 text-white"
                                      }`}
                                    >
                                      {step.step_number}
                                    </div>

                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="text-sm font-black text-slate-900">
                                          {step.step_name}
                                        </h4>
                                        {step.is_ccp_or_oprp && (
                                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 animate-pulse">
                                            <Flame className="w-3 h-3" /> ★ ĐIỂM KIỂM SOÁT TỚI HẠN (CCP)
                                          </span>
                                        )}
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/90 text-slate-900 font-black border border-slate-300">
                                          {step.hazard_count} mối nguy
                                        </span>
                                      </div>

                                      {step.description && (
                                        <p className="text-xs text-slate-800 font-medium mt-1.5 leading-relaxed bg-slate-100/80 p-2.5 rounded-lg border border-slate-300">
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
                                      onClick={() => setDeletingStep(step)}
                                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:text-rose-800 hover:bg-rose-100 transition-colors"
                                      title="Xóa công đoạn"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {idx < planSteps.length - 1 && (
                                  <div className="flex flex-col items-center my-0.5">
                                    <div className="w-0.5 h-3 bg-slate-300" />
                                    <div className="px-3 py-0.5 rounded-full bg-white border border-slate-300 text-[10px] font-black text-slate-800 flex items-center gap-1 font-mono shadow-xs">
                                      <ChevronDown className="w-3 h-3 text-slate-600" />
                                      <span>
                                        {step.is_ccp_or_oprp ? "Kiểm soát CCP Đạt" : "Chuyển tiếp"}
                                      </span>
                                    </div>
                                    <div className="w-0.5 h-3 bg-slate-300" />
                                  </div>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Kiểm tra có công đoạn mồ côi (không thuộc kế hoạch nào) */}
                {(() => {
                  const orphanSteps = steps.filter(
                    (s) => !plans.some((p) => p.plan_id === s.plan_id)
                  );
                  if (orphanSteps.length === 0) return null;
                  return (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-amber-200">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-amber-600 text-white">
                            Chưa phân loại
                          </span>
                          <h4 className="text-sm font-bold text-slate-900">
                            Các Công Đoạn Chưa Gán Kế Hoạch ({orphanSteps.length})
                          </h4>
                        </div>
                      </div>
                      <div className="max-w-2xl mx-auto space-y-3 py-1">
                        {orphanSteps.map((step, idx) => (
                          <React.Fragment key={step.step_id}>
                            <div className="p-4 rounded-2xl border bg-white border-amber-200 shadow-sm flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3.5">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 bg-slate-500 text-white">
                                  {step.step_number}
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">{step.step_name}</h4>
                                  {step.description && (
                                    <p className="text-xs text-slate-600 mt-1">{step.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleOpenEditStep(step)}
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingStep(step)}
                                  className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:text-rose-800"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Khi chọn 1 kế hoạch cụ thể */
              filteredSteps.length === 0 ? (
                <EmptyState
                  icon={GitBranch}
                  title={`Kế hoạch [${currentPlan?.plan_code || ""}] chưa có công đoạn nào`}
                  description="Hãy bắt đầu thiết lập các bước công nghệ trong dây chuyền sản xuất từ khâu tiếp nhận nguyên liệu đến bảo quản thành phẩm."
                  actionLabel="+ Thêm Công Đoạn Đầu Tiên"
                  onAction={() => handleOpenCreateStep(currentPlan?.plan_id)}
                  onGuide={() => setShowGuide(true)}
                />
              ) : (
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
                              step.is_ccp_or_oprp
                                ? "bg-rose-600 text-white"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            {step.step_number}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-slate-900">{step.step_name}</h4>
                              {step.is_ccp_or_oprp && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 animate-pulse">
                                  <Flame className="w-3 h-3" /> ★ ĐIỂM KIỂM SOÁT TỚI HẠN (CCP)
                                </span>
                              )}
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200/90 text-slate-900 font-black border border-slate-300">
                                {step.hazard_count} mối nguy
                              </span>
                            </div>

                            {step.description && (
                              <p className="text-xs text-slate-800 font-medium mt-1.5 leading-relaxed bg-slate-100/80 p-2.5 rounded-lg border border-slate-300">
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
                            onClick={() => setDeletingStep(step)}
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
                          <div className="px-3 py-0.5 rounded-full bg-white border border-slate-300 text-[10px] font-black text-slate-800 flex items-center gap-1 font-mono shadow-xs">
                            <ChevronDown className="w-3 h-3 text-slate-600" />
                            <span>{step.is_ccp_or_oprp ? "Kiểm soát CCP Đạt" : "Chuyển tiếp"}</span>
                          </div>
                          <div className="w-0.5 h-3 bg-slate-300" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )
            )}
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
              <Button
                onClick={handleOpenCreateCCP}
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" /> Thêm Điểm CCP Mới
              </Button>
            </div>
          </div>

          {filteredCCPs.length === 0 ? (
            <EmptyState
              icon={Flame}
              title="Chưa có điểm kiểm soát tới hạn CCP / oPRP"
              description="Dựa trên kết quả đánh giá cây quyết định phân tích mối nguy Codex, hãy thiết lập các điểm kiểm soát tới hạn CCP kèm giới hạn tới hạn cụ thể."
              actionLabel="+ Thêm Điểm CCP Mới"
              onAction={handleOpenCreateCCP}
              onGuide={() => setShowGuide(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCCPs.map((ccp) => {
                const cl = ccp.critical_limit || {};
                const isOprp = ccp.ccp_code.startsWith("oPRP");
                return (
                  <div
                    key={ccp.ccp_id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-3 py-1 rounded-lg text-sm font-black tracking-wider text-white ${isOprp ? "bg-amber-600" : "bg-rose-600"}`}
                        >
                          {ccp.ccp_code}
                        </span>
                        <div>
                          <h4 className="font-bold text-base text-slate-900">{ccp.name}</h4>
                          <p className="text-xs text-slate-500">
                            Công đoạn: {ccp.step_name || "Chưa gán công đoạn"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditCCP(ccp)}
                          className="h-8 w-8 text-slate-500 hover:text-slate-900"
                          title="Chỉnh sửa điểm CCP"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingCCP(ccp)}
                          className="h-8 w-8 text-slate-500 hover:text-rose-600"
                          title="Xóa điểm CCP"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Hazard Description */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                      <span className="font-bold text-rose-700 uppercase text-[10px] tracking-wider block mb-1">
                        Mối nguy cần kiểm soát:
                      </span>
                      <p className="text-slate-700 leading-relaxed">{ccp.hazard_description}</p>
                    </div>

                    {/* Critical Limit */}
                    <div className="bg-rose-50 border border-rose-300 p-3.5 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Flame className="h-3.5 w-3.5 text-rose-600" /> Giới Hạn Tới Hạn (Critical
                          Limit):
                        </span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200">
                          {cl.param || "Thông số kỹ thuật"}
                        </span>
                      </div>
                      <p className="text-slate-900 font-black text-sm pt-1">
                        {cl.condition_text ||
                          `${cl.min_val ? ">= " + cl.min_val : ""} ${cl.max_val ? "<= " + cl.max_val : ""} ${cl.unit || ""}`}
                      </p>
                    </div>

                    {/* Monitoring & Action details */}
                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-700 pt-1">
                      <div>
                        <span className="text-slate-500 block text-[11px] font-semibold">
                          Tần suất & Phương pháp:
                        </span>
                        <span className="font-bold text-slate-800">{ccp.monitoring_frequency}</span>
                        <p className="text-[11px] text-slate-500 truncate">
                          {ccp.monitoring_method}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px] font-semibold">
                          Người phụ trách:
                        </span>
                        <span className="font-bold text-emerald-700">{ccp.responsible_role}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <Button
                        size="sm"
                        onClick={() => handleOpenCreateLog(ccp)}
                        className="w-full bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 hover:border-emerald-600 border border-emerald-300 text-xs font-bold py-1.5 shadow-none group transition-all"
                      >
                        <Thermometer className="h-3.5 w-3.5 mr-1.5 text-emerald-600 group-hover:text-white transition-colors" /> Ghi Nhật Ký
                        Đo Đạc Cho {ccp.ccp_code}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

            <Button
              onClick={handleOpenCreateHazard}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" /> Thêm Mối Nguy Mới
            </Button>
          </div>

          {filteredHazards.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="Chưa có phân tích mối nguy nào"
              description="Thực hiện nhận diện các mối nguy sinh học, hóa học, vật lý và dị nguyên cho từng công đoạn kèm đánh giá cây quyết định Codex Q1-Q4."
              actionLabel="+ Thêm Mối Nguy Mới"
              onAction={handleOpenCreateHazard}
              onGuide={() => setShowGuide(true)}
            />
          ) : (
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
                          {h.step_number ? `${h.step_number}. ` : ""}
                          {h.step_name || "Công đoạn"}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 max-w-xs">{h.hazard_name}</div>
                          {h.potential_consequence && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {h.potential_consequence}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">{h.hazard_type}</td>
                        <td className="p-3.5 text-center">
                          {getRiskBadge(h.risk_score)}
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            K:{h.likelihood} × N:{h.severity}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-700 max-w-xs">{h.control_measure}</td>
                        <td className="p-3.5 text-center font-mono text-[11px] text-slate-600 font-bold">
                          {h.q1 || "-"}/{h.q2 || "-"}/{h.q3 || "-"}/{h.q4 || "-"}
                        </td>
                        <td className="p-3.5 text-center">{getClassBadge(h.classification)}</td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditHazard(h)}
                              className="p-1 text-slate-500 hover:text-slate-900"
                              title="Chỉnh sửa mối nguy"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingHazard(h)}
                              className="p-1 text-slate-500 hover:text-rose-600"
                              title="Xóa mối nguy"
                            >
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
          )}
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
                className="border border-emerald-400/80 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all duration-150"
              >
                <Sliders className="w-3.5 h-3.5 transition-colors" />
                Mở Phiếu Form Động
              </Button>

              <Button
                onClick={() => handleOpenCreateLog()}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Ghi Nhật Ký Đo Nhanh
              </Button>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <EmptyState
              icon={Thermometer}
              title="Chưa có nhật ký giám sát đo đạc CCP nào"
              description="Thực hiện ghi nhận định kỳ các thông số giám sát (nhiệt độ, áp suất, thời gian, kích thước lưới sàng...) để kiểm soát điểm tới hạn CCP."
              actionLabel="+ Ghi Nhật Ký Đo Đạc"
              onAction={() => handleOpenCreateLog()}
              onGuide={() => setShowGuide(true)}
            />
          ) : (
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
                        <td className="p-3.5 font-mono font-bold text-slate-900">
                          {l.batch_number}
                        </td>
                        <td className="p-3.5 text-slate-500">{l.test_time || "Hôm nay"}</td>
                        <td className="p-3.5 font-mono font-black text-sm text-slate-900">
                          {l.measured_value} {l.unit}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {l.critical_limit_text || "Tiêu chuẩn"}
                        </td>
                        <td className="p-3.5 text-center">
                          {getLogStatusBadge(l.status, l.is_critical_limit_exceeded)}
                        </td>
                        <td className="p-3.5 text-slate-700 font-medium">
                          {l.inspector_name || "QC Ca"}
                        </td>
                        <td className="p-3.5 text-slate-600 max-w-xs">
                          {l.deviation_action || l.notes || "Bình thường"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                <h3 className="text-base font-bold text-slate-900">
                  Trợ Lý AI Gợi Ý Mối Nguy Theo Công Đoạn
                </h3>
                <p className="text-xs text-slate-500">
                  Tự động phân tích tác nhân vi sinh, hóa học và phân loại CCP/oPRP theo Codex.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs font-bold text-slate-700">
                  Chọn công đoạn mẫu hoặc nhập mới:
                </Label>
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
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                  >
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
                <h3 className="text-base font-bold text-slate-900">
                  AI Xử Lý Sự Cố Vi Phạm CCP Khẩn Cấp
                </h3>
                <p className="text-xs text-slate-500">
                  Tư vấn phương án cô lập lô hàng, biệt trữ kho và hành động khắc phục CAPA theo ISO
                  8.9.
                </p>
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
                <div>
                  Điểm kiểm soát:{" "}
                  <span className="font-bold text-rose-700">{aiDevPreset.ccp_code}</span>
                </div>
                <div>
                  Lô hàng sự cố:{" "}
                  <span className="font-mono font-bold text-slate-900">
                    {aiDevPreset.batch_number}
                  </span>
                </div>
                <div>
                  Giá trị vi phạm:{" "}
                  <span className="font-bold text-rose-700">
                    {aiDevPreset.measured_value}
                    {aiDevPreset.unit}
                  </span>{" "}
                  ({aiDevPreset.critical_limit_text})
                </div>
                <p className="text-slate-600 mt-1">{aiDevPreset.description}</p>
              </div>

              <Button
                onClick={() => handleRunAIDeviation()}
                disabled={aiDevLoading}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 shadow-sm"
              >
                {aiDevLoading
                  ? "Đang tạo quy trình xử lý khẩn cấp..."
                  : "Chạy AI Lập Phương Án Khắc Phục"}
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
                  <div className="font-bold text-slate-900 pt-1">
                    2. Biện pháp xử lý lô sản phẩm:
                  </div>
                  <p className="text-slate-700">{aiDevResults.product_disposition}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 6: THẨM TRA ĐỊNH KỲ KẾ HOẠCH HACCP & OPRP ==================== */}
      {activeTab === "reviews" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  Thẩm Tra Hiệu Lực Kế Hoạch HACCP & OPRP
                  <span className="text-[10px] font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                    ISO 22000:2018
                  </span>
                </h3>
                <p className="text-xs text-slate-200 mt-1 max-w-2xl leading-relaxed">
                  Đánh giá toàn diện định kỳ hoặc sau thay đổi đối với phân tích mối nguy, hồ sơ
                  giám sát CCP/OPRP, hiệu lực CAPA và năng lực duy trì an toàn thực phẩm của nhà
                  máy.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={openNewReview}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Lập Đợt Thẩm Tra Mới
              </Button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  placeholder="Tìm theo mã, phạm vi, người thẩm tra, kết quả..."
                  className="pl-9 text-xs bg-slate-50 border-slate-200 text-slate-800"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Loại thẩm tra:</span>
                <select
                  value={reviewFilterType}
                  onChange={(e) => setReviewFilterType(e.target.value)}
                  className="h-9 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Tất cả loại hình</option>
                  <option value="PERIODIC">Định kỳ (Periodic)</option>
                  <option value="POST_CHANGE">Sau thay đổi</option>
                  <option value="INCIDENT_TRIGGERED">Sau sự cố (Incident)</option>
                  <option value="ANNUAL">Định kỳ thường niên (Annual)</option>
                </select>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Kết luận:</span>
                <select
                  value={reviewFilterConclusion}
                  onChange={(e) => setReviewFilterConclusion(e.target.value)}
                  className="h-9 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Tất cả kết luận</option>
                  <option value="COMPLIANT">Hiệu lực (Đạt)</option>
                  <option value="NEEDS_UPDATE">Cần cập nhật</option>
                  <option value="CRITICAL_DEFICIENCY">Khiếm khuyết lớn</option>
                </select>
              </div>
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              Tổng số đợt:{" "}
              <span className="text-slate-900 font-bold">{filteredReviews.length}</span>
            </div>
          </div>

          {/* Table */}
          {reviews.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Chưa có đợt thẩm tra kế hoạch HACCP nào"
              description="Thực hiện đánh giá toàn diện định kỳ hoặc sau thay đổi đối với phân tích mối nguy, hồ sơ giám sát CCP/OPRP và hiệu lực CAPA."
              actionLabel="+ Lập Đợt Thẩm Tra Mới"
              onAction={openNewReview}
              onGuide={() => setShowGuide(true)}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5">Mã & Kế hoạch</th>
                      <th className="p-3.5">Ngày & Loại Thẩm Tra</th>
                      <th className="p-3.5">Phạm vi & Đoàn thẩm tra</th>
                      <th className="p-3.5 text-center">3 Trụ Cột Thẩm Tra</th>
                      <th className="p-3.5 text-center">Kết Luận</th>
                      <th className="p-3.5">Phê Duyệt</th>
                      <th className="p-3.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReviews.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                          Chưa có đợt thẩm tra kế hoạch HACCP nào phù hợp điều kiện lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredReviews.map((rev) => {
                        const linkedPlan = plans.find(
                          (p) => p.plan_id === rev.plan_id || p.id === rev.plan_id,
                        );
                        const linkedCR = changeRequests.find(
                          (cr) => cr.id === rev.change_request_id,
                        );
                        return (
                          <tr key={rev.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3.5">
                              <div className="font-mono font-bold text-slate-900">
                                {rev.review_code}
                              </div>
                              <div className="text-[11px] text-slate-600 mt-0.5 font-medium">
                                {linkedPlan ? linkedPlan.plan_name : "Kế hoạch toàn bộ"}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="font-semibold text-slate-800">{rev.review_date}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {rev.review_type === "PERIODIC" && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    Định kỳ
                                  </span>
                                )}
                                {rev.review_type === "POST_CHANGE" && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                    Sau thay đổi
                                  </span>
                                )}
                                {rev.review_type === "INCIDENT_TRIGGERED" && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    Sau sự cố
                                  </span>
                                )}
                                {rev.review_type === "ANNUAL" && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                    Thường niên
                                  </span>
                                )}
                                {linkedCR && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    MCR: {linkedCR.request_code}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 max-w-xs">
                              <div className="text-slate-800 line-clamp-2 leading-relaxed font-medium">
                                {rev.scope_and_objective}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-1">
                                <span className="font-semibold">Đoàn:</span> {rev.reviewers}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="flex flex-col gap-1 items-center">
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className="text-slate-500">Mối nguy:</span>
                                  {rev.hazard_analysis_validity ? (
                                    <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                                      <Check className="w-3 h-3" /> Đạt
                                    </span>
                                  ) : (
                                    <span className="font-bold text-rose-600 flex items-center gap-0.5">
                                      <XCircle className="w-3 h-3" /> Cần sửa
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className="text-slate-500">Hồ sơ CCP:</span>
                                  {rev.monitoring_records_adequate ? (
                                    <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                                      <Check className="w-3 h-3" /> Đầy đủ
                                    </span>
                                  ) : (
                                    <span className="font-bold text-rose-600 flex items-center gap-0.5">
                                      <XCircle className="w-3 h-3" /> Thiếu
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  <span className="text-slate-500">Hiệu lực CAPA:</span>
                                  {rev.corrective_actions_effective ? (
                                    <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                                      <Check className="w-3 h-3" /> Tốt
                                    </span>
                                  ) : (
                                    <span className="font-bold text-rose-600 flex items-center gap-0.5">
                                      <XCircle className="w-3 h-3" /> Tồn tại
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 text-center">
                              {rev.conclusion === "COMPLIANT" && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Hiệu Lực (Đạt)
                                </span>
                              )}
                              {rev.conclusion === "NEEDS_UPDATE" && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Cần Cập Nhật
                                </span>
                              )}
                              {rev.conclusion === "CRITICAL_DEFICIENCY" && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Khiếm Khuyết Lớn
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-[11px]">
                              <div className="font-semibold text-slate-800">
                                {rev.approved_by || "Chưa duyệt"}
                              </div>
                              <div className="text-slate-500">{rev.approval_date || "-"}</div>
                              <div className="mt-0.5">
                                <span
                                  className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    rev.status === "APPROVED"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {rev.status}
                                </span>
                              </div>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrintHACCPReview(rev)}
                                  title="In biên bản thẩm tra HACCP (BM-HACCP-REV-01)"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditReview(rev)}
                                  title="Chỉnh sửa biên bản"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteReview(rev.id)}
                                  title="Xóa biên bản"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 7: KIỂM SOÁT QUÁ TRÌNH (IPQC) & MÁY DÒ KIM LOẠI ==================== */}
      {activeTab === "ipqc" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-indigo-300 shadow-inner">
                <ScanLine className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  Kiểm Soát Quá Trình (IPQC) & Máy Dò Kim Loại
                  <span className="text-[10px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                    Thư mục 09 An Giang
                  </span>
                </h3>
                <p className="text-xs text-slate-200 mt-1 max-w-2xl leading-relaxed">
                  Giám sát điểm kiểm soát CCP máy dò kim loại với thanh chuẩn Fe 0.5mm, SUS 0.8mm
                  (BM06-KSQT) và kiểm soát chất lượng các công đoạn chế biến (BM01-05 KSQT).
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                onClick={handleOpenCreateMDLog}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Ghi Nhật Ký Máy Dò (BM06)
              </Button>
              <Button
                onClick={handleOpenCreateStageLog}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Ghi Phiếu Công Đoạn (IPQC)
              </Button>
            </div>
          </div>

          {/* Sub-Tabs Switcher */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setIpqcSubTab("metal_detector")}
              className={`pb-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                ipqcSubTab === "metal_detector"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Cpu className="w-4 h-4" />
              BM06-KSQT: Nhật Ký Máy Dò Kim Loại ({metalDetectorLogs.length})
            </button>
            <button
              onClick={() => setIpqcSubTab("process_stages")}
              className={`pb-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                ipqcSubTab === "process_stages"
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Layers className="w-4 h-4" />
              BM01-05: Kiểm Soát Công Đoạn Chế Biến ({inProcessLogs.length})
            </button>
          </div>

          {/* SUB-TAB 1: METAL DETECTOR LOGS */}
          {ipqcSubTab === "metal_detector" && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <Input
                      value={mdSearch}
                      onChange={(e) => setMdSearch(e.target.value)}
                      placeholder="Tìm mã máy, số lô, sản phẩm, người kiểm..."
                      className="pl-9 text-xs bg-slate-50 border-slate-200 text-slate-800"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Kết quả:</span>
                    <select
                      value={mdResultFilter}
                      onChange={(e) => setMdResultFilter(e.target.value)}
                      className="h-9 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ALL">Tất cả kết quả</option>
                      <option value="PASSED">Đạt chuẩn (Passed)</option>
                      <option value="FAILED">Không đạt (Failed)</option>
                    </select>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-semibold">
                  Hiển thị{" "}
                  <span className="text-indigo-600 font-bold">{filteredMDLogs.length}</span> bản ghi
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold text-[11px]">
                        <th className="p-3.5">Thiết Bị & Thời Gian</th>
                        <th className="p-3.5">Số Lô & Sản Phẩm</th>
                        <th className="p-3.5 text-center">Thanh Chuẩn Fe (0.5mm)</th>
                        <th className="p-3.5 text-center">Thanh Chuẩn SUS (0.8mm)</th>
                        <th className="p-3.5 text-center">Cơ Cấu Loại Bỏ</th>
                        <th className="p-3.5 text-center">Kim Loại Phát Hiện</th>
                        <th className="p-3.5 text-center">Kết Luận</th>
                        <th className="p-3.5">Người Kiểm Tra</th>
                        <th className="p-3.5 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMDLogs.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-12 text-slate-400 italic">
                            Chưa có nhật ký kiểm tra máy dò kim loại nào phù hợp bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        filteredMDLogs.map((log) => (
                          <tr key={log.log_id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                                {log.machine_name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                {log.machine_code} • {log.log_date} {log.check_time} (
                                {log.shift_name})
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="font-semibold text-slate-800">{log.product_name}</div>
                              <div className="text-[11px] font-mono text-indigo-700 font-bold mt-0.5">
                                Lô: {log.batch_number}
                              </div>
                            </td>
                            <td className="p-3.5 text-center">
                              {log.fe_detected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Đạt (Ø{log.fe_standard_mm}mm)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  Không đạt
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              {log.sus_detected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Đạt (Ø{log.sus_standard_mm}mm)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  Không đạt
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              {log.rejection_mechanism_working ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  <Check className="w-3 h-3 text-blue-600" />
                                  Hoạt động tốt
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  Hỏng hóc
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center font-bold font-mono">
                              {log.metal_detected_count > 0 ? (
                                <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  {log.metal_detected_count} lần
                                </span>
                              ) : (
                                <span className="text-slate-500">0 lần</span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              {log.test_result === "PASSED" ? (
                                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  PASSED
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                                  FAILED
                                </span>
                              )}
                            </td>
                            <td className="p-3.5">
                              <div className="font-semibold text-slate-800">
                                {log.checked_by_name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Duyệt: {log.verified_by_name || "-"}
                              </div>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrintMDLog(log)}
                                  title="In nhật ký BM06-KSQT"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenEditMDLog(log)}
                                  title="Sửa nhật ký"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteMDLog(log.log_id)}
                                  title="Xóa nhật ký"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: PROCESS STAGE QC LOGS (BM01-05) */}
          {ipqcSubTab === "process_stages" && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <Input
                      value={stageSearch}
                      onChange={(e) => setStageSearch(e.target.value)}
                      placeholder="Tìm mã phiếu, công đoạn, mẻ, KCS..."
                      className="pl-9 text-xs bg-slate-50 border-slate-200 text-slate-800"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Công đoạn:</span>
                    <select
                      value={stageFilter}
                      onChange={(e) => setStageFilter(e.target.value)}
                      className="h-9 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">Tất cả công đoạn (BM01-05)</option>
                      <option value="PREPARATION">BM01: Sơ chế, rửa & thái</option>
                      <option value="DRYING_COOLING">BM02: Sấy & làm nguội</option>
                      <option value="GRINDING_SIEVING">BM03: Nghiền & rây sàng</option>
                      <option value="GELATINIZATION">BM04: Nấu chín / Hồ hóa</option>
                      <option value="PACKAGING">BM05: Đóng gói & niêm phong</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Trạng thái:</span>
                    <select
                      value={stageStatusFilter}
                      onChange={(e) => setStageStatusFilter(e.target.value)}
                      className="h-9 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="PASSED">Đạt (Passed)</option>
                      <option value="WARNING">Cảnh báo (Warning)</option>
                      <option value="FAILED">Không đạt (Failed)</option>
                    </select>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-semibold">
                  Hiển thị{" "}
                  <span className="text-blue-600 font-bold">{filteredStageLogs.length}</span> bản
                  ghi
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold text-[11px]">
                        <th className="p-3.5">Mã Phiếu & Công Đoạn</th>
                        <th className="p-3.5">Lô Mẻ & Sản Phẩm</th>
                        <th className="p-3.5">Thông Số Kỹ Thuật Thực Tế</th>
                        <th className="p-3.5 text-center">Trạng Thái</th>
                        <th className="p-3.5">Ghi Nhận Sai Lệch</th>
                        <th className="p-3.5">Người Giám Sát</th>
                        <th className="p-3.5 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStageLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-slate-400 italic">
                            Chưa có phiếu kiểm soát công đoạn nào phù hợp bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        filteredStageLogs.map((log) => (
                          <tr key={log.log_id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900 font-mono text-blue-700">
                                {log.inspection_code}
                              </div>
                              <div className="font-semibold text-slate-800 mt-0.5">
                                {log.stage_name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {log.log_date} {log.check_time} ({log.shift_name})
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="font-semibold text-slate-800">{log.product_name}</div>
                              <div className="text-[11px] font-mono text-slate-600 font-bold mt-0.5">
                                Lô: {log.batch_number}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="flex flex-wrap gap-1 max-w-sm">
                                {Object.entries(log.criteria_data || {}).map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-700 font-medium"
                                  >
                                    <b>{k}:</b> {String(v)}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3.5 text-center">
                              {log.overall_status === "PASSED" ? (
                                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  PASSED
                                </span>
                              ) : log.overall_status === "WARNING" ? (
                                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                                  WARNING
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                                  FAILED
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 max-w-xs">
                              {log.deviations ? (
                                <div className="text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 text-[11px]">
                                  {log.deviations}
                                </div>
                              ) : (
                                <div className="text-slate-400 italic text-[11px]">
                                  Không có sai lệch
                                </div>
                              )}
                            </td>
                            <td className="p-3.5">
                              <div className="font-semibold text-slate-800">
                                {log.inspector_name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Giám sát: {log.supervisor_name || "-"}
                              </div>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrintStageLog(log)}
                                  title="In phiếu kiểm soát công đoạn"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenEditStageLog(log)}
                                  title="Sửa phiếu"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteStageLog(log.log_id)}
                                  title="Xóa phiếu"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== MODAL: METAL DETECTOR LOG (BM06-KSQT) ==================== */}
      <Dialog open={showMDModal} onOpenChange={setShowMDModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-900 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" />
              {editingMDLog
                ? "Cập Nhật Nhật Ký Kiểm Tra Máy Dò Kim Loại (BM06)"
                : "Ghi Nhật Ký Kiểm Tra Máy Dò Kim Loại Mới (BM06)"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveMDLog} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Mã Thiết Bị *</Label>
                <Input
                  value={mdForm.machine_code}
                  onChange={(e) => setMdForm({ ...mdForm, machine_code: e.target.value })}
                  placeholder="VD: MD-01"
                  className="mt-1 text-xs bg-white border-slate-300 font-mono font-bold"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Tên Máy Dò Kim Loại *</Label>
                <Input
                  value={mdForm.machine_name}
                  onChange={(e) => setMdForm({ ...mdForm, machine_name: e.target.value })}
                  placeholder="VD: Máy dò kim loại Sesotec băng tải"
                  className="mt-1 text-xs bg-white border-slate-300 font-semibold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Ngày Kiểm Tra *</Label>
                <Input
                  type="date"
                  value={mdForm.log_date}
                  onChange={(e) => setMdForm({ ...mdForm, log_date: e.target.value })}
                  className="mt-1 text-xs bg-white border-slate-300"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Giờ Kiểm Tra *</Label>
                <Input
                  type="time"
                  value={mdForm.check_time}
                  onChange={(e) => setMdForm({ ...mdForm, check_time: e.target.value })}
                  className="mt-1 text-xs bg-white border-slate-300"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Ca Sản Xuất *</Label>
                <select
                  value={mdForm.shift_name}
                  onChange={(e) => setMdForm({ ...mdForm, shift_name: e.target.value })}
                  className="w-full mt-1 h-9 px-3 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Ca 1">Ca 1 (06:00 - 14:00)</option>
                  <option value="Ca 2">Ca 2 (14:00 - 22:00)</option>
                  <option value="Ca 3">Ca 3 (22:00 - 06:00)</option>
                  <option value="Ca Hành chính">Ca Hành chính</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Số Lô Hàng (Batch/Lot) *</Label>
                <Input
                  value={mdForm.batch_number}
                  onChange={(e) => setMdForm({ ...mdForm, batch_number: e.target.value })}
                  placeholder="VD: LOT-2026-B01"
                  className="mt-1 text-xs bg-white border-slate-300 font-mono font-bold"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Tên Sản Phẩm *</Label>
                <Input
                  value={mdForm.product_name}
                  onChange={(e) => setMdForm({ ...mdForm, product_name: e.target.value })}
                  placeholder="VD: Gạo lứt đỏ sấy ăn liền 250g"
                  className="mt-1 text-xs bg-white border-slate-300 font-semibold"
                  required
                />
              </div>
            </div>

            {/* Test Piece Sensitivity Check (An Giang standard) */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
              <span className="font-bold text-indigo-900 uppercase text-[11px] block flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                Kiểm Thử Độ Nhạy Với Thanh Thử Chuẩn (Test Pieces) & Cơ Cấu Loại Bỏ
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2.5 bg-white border border-indigo-100 rounded-lg">
                  <div>
                    <div className="font-bold text-slate-800">Thanh thử Fe (Kim loại sắt)</div>
                    <div className="text-[11px] text-slate-500">
                      Đường kính chuẩn: Ø {mdForm.fe_standard_mm} mm
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-xs">
                    <input
                      type="checkbox"
                      checked={mdForm.fe_detected}
                      onChange={(e) => setMdForm({ ...mdForm, fe_detected: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    Đã phát hiện
                  </label>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white border border-indigo-100 rounded-lg">
                  <div>
                    <div className="font-bold text-slate-800">Thanh thử SUS (Kim loại Inox)</div>
                    <div className="text-[11px] text-slate-500">
                      Đường kính chuẩn: Ø {mdForm.sus_standard_mm} mm
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-xs">
                    <input
                      type="checkbox"
                      checked={mdForm.sus_detected}
                      onChange={(e) => setMdForm({ ...mdForm, sus_detected: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    Đã phát hiện
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-white border border-indigo-100 rounded-lg">
                <div>
                  <div className="font-bold text-slate-800">
                    Cơ cấu gạt / thổi khí loại bỏ sản phẩm nhiễm kim loại
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Hệ thống cơ khí tự động đẩy sản phẩm lỗi ra thùng chứa cách ly
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-xs">
                  <input
                    type="checkbox"
                    checked={mdForm.rejection_mechanism_working}
                    onChange={(e) =>
                      setMdForm({ ...mdForm, rejection_mechanism_working: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  Hoạt động bình thường
                </label>
              </div>

              <div>
                <Label className="text-slate-700 font-bold">
                  Số Lần Phát Hiện Kim Loại Thực Tế Trong Ca
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={mdForm.metal_detected_count}
                  onChange={(e) =>
                    setMdForm({ ...mdForm, metal_detected_count: parseInt(e.target.value) || 0 })
                  }
                  className="mt-1 text-xs bg-white border-slate-300 font-mono font-bold w-32"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-bold">
                Hành Động Khắc Phục (Nếu máy dò không phát hiện hoặc cơ cấu hỏng)
              </Label>
              <Input
                value={mdForm.corrective_action}
                onChange={(e) => setMdForm({ ...mdForm, corrective_action: e.target.value })}
                placeholder="VD: Dừng dây chuyền, hiệu chuẩn lại độ nhạy, cách ly toàn bộ sản phẩm từ lần test trước..."
                className="mt-1 text-xs bg-white border-slate-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Người Kiểm Tra (QC/Vận hành) *</Label>
                <Input
                  value={mdForm.checked_by_name}
                  onChange={(e) => setMdForm({ ...mdForm, checked_by_name: e.target.value })}
                  placeholder="VD: Nguyễn Văn Kiểm"
                  className="mt-1 text-xs bg-white border-slate-300 font-semibold"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Người Xác Nhận / Trưởng Ca</Label>
                <Input
                  value={mdForm.verified_by_name}
                  onChange={(e) => setMdForm({ ...mdForm, verified_by_name: e.target.value })}
                  placeholder="VD: Trần Thị QA"
                  className="mt-1 text-xs bg-white border-slate-300 font-semibold"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-bold">Ghi Chú Vận Hành</Label>
              <textarea
                rows={2}
                value={mdForm.notes}
                onChange={(e) => setMdForm({ ...mdForm, notes: e.target.value })}
                placeholder="Ghi chú thêm về điều kiện môi trường, nhiệt độ buồng máy..."
                className="w-full mt-1 bg-white border border-slate-300 rounded-md p-2 text-xs text-slate-800"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMDModal(false)}
                className="text-xs"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                {editingMDLog ? "Lưu Cập Nhật" : "Lưu Nhật Ký Máy Dò"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: IN-PROCESS STAGE QC LOG ==================== */}
      <Dialog open={showStageModal} onOpenChange={setShowStageModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-900 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              {editingStageLog
                ? "Cập Nhật Phiếu Kiểm Soát Quá Trình (IPQC)"
                : "Ghi Phiếu Kiểm Soát Quá Trình Mới (IPQC)"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveStageLog} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Mã Phiếu Kiểm Soát *</Label>
                <Input
                  value={stageForm.inspection_code}
                  onChange={(e) => setStageForm({ ...stageForm, inspection_code: e.target.value })}
                  placeholder="VD: IPQC-2026-001"
                  className="mt-1 text-xs bg-white border-slate-300 font-mono font-bold"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Công Đoạn Chế Biến *</Label>
                <select
                  value={stageForm.stage_code}
                  onChange={(e) => {
                    const code = e.target.value;
                    let name = "Công đoạn chế biến";
                    let sampleCriteria = {};
                    if (code === "PREPARATION") {
                      name = "Công đoạn sơ chế, rửa & thái";
                      sampleCriteria = {
                        wash_water_chlorine_ppm: 50,
                        wash_water_temp_c: 18,
                        cutting_size_mm: 5,
                      };
                    } else if (code === "DRYING_COOLING") {
                      name = "Công đoạn sấy & làm nguội";
                      sampleCriteria = {
                        drying_temp_c: 85,
                        drying_time_min: 45,
                        moisture_percent: 11.5,
                        cooling_temp_c: 28,
                      };
                    } else if (code === "GRINDING_SIEVING") {
                      name = "Công đoạn nghiền & rây sàng";
                      sampleCriteria = {
                        sieve_mesh_mesh: 80,
                        fineness_percent: 98.5,
                        magnetic_trap_ok: true,
                      };
                    } else if (code === "GELATINIZATION") {
                      name = "Công đoạn nấu chín / Hồ hóa";
                      sampleCriteria = {
                        cooking_temp_c: 98,
                        cooking_time_min: 25,
                        brix_degree: 16.5,
                        ph_level: 6.2,
                      };
                    } else if (code === "PACKAGING") {
                      name = "Công đoạn đóng gói & niêm phong";
                      sampleCriteria = {
                        sealing_temp_c: 165,
                        seal_leak_test: "PASSED",
                        net_weight_g: 250,
                        label_ok: true,
                      };
                    }
                    setStageForm({
                      ...stageForm,
                      stage_code: code,
                      stage_name: name,
                      criteria_data_str: JSON.stringify(sampleCriteria, null, 2),
                    });
                  }}
                  className="w-full mt-1 h-9 px-3 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PREPARATION">BM01: Sơ chế, rửa & thái</option>
                  <option value="DRYING_COOLING">BM02: Sấy & làm nguội</option>
                  <option value="GRINDING_SIEVING">BM03: Nghiền & rây sàng</option>
                  <option value="GELATINIZATION">BM04: Nấu chín / Hồ hóa</option>
                  <option value="PACKAGING">BM05: Đóng gói & niêm phong</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-bold">Tên Công Đoạn Chi Tiết</Label>
              <Input
                value={stageForm.stage_name}
                onChange={(e) => setStageForm({ ...stageForm, stage_name: e.target.value })}
                className="mt-1 text-xs bg-white border-slate-300 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Ngày Kiểm Tra *</Label>
                <Input
                  type="date"
                  value={stageForm.log_date}
                  onChange={(e) => setStageForm({ ...stageForm, log_date: e.target.value })}
                  className="mt-1 text-xs bg-white border-slate-300"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Giờ Kiểm Tra *</Label>
                <Input
                  type="time"
                  value={stageForm.check_time}
                  onChange={(e) => setStageForm({ ...stageForm, check_time: e.target.value })}
                  className="mt-1 text-xs bg-white border-slate-300"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Ca Sản Xuất *</Label>
                <select
                  value={stageForm.shift_name}
                  onChange={(e) => setStageForm({ ...stageForm, shift_name: e.target.value })}
                  className="w-full mt-1 h-9 px-3 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Ca 1">Ca 1</option>
                  <option value="Ca 2">Ca 2</option>
                  <option value="Ca 3">Ca 3</option>
                  <option value="Ca Hành chính">Ca Hành chính</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Số Lô Hàng / Mẻ (Batch) *</Label>
                <Input
                  value={stageForm.batch_number}
                  onChange={(e) => setStageForm({ ...stageForm, batch_number: e.target.value })}
                  placeholder="VD: LOT-2026-B01"
                  className="mt-1 text-xs bg-white border-slate-300 font-mono font-bold"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Tên Sản Phẩm *</Label>
                <Input
                  value={stageForm.product_name}
                  onChange={(e) => setStageForm({ ...stageForm, product_name: e.target.value })}
                  placeholder="VD: Bột gạo lứt dinh dưỡng"
                  className="mt-1 text-xs bg-white border-slate-300 font-semibold"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-slate-700 font-bold">
                  Thông Số Kỹ Thuật Công Đoạn Đo Kiểm (JSON)
                </Label>
                <span className="text-[10px] text-slate-500">
                  Định dạng JSON chứa các cặp chỉ tiêu & giá trị đo
                </span>
              </div>
              <textarea
                rows={4}
                value={stageForm.criteria_data_str}
                onChange={(e) => setStageForm({ ...stageForm, criteria_data_str: e.target.value })}
                className="w-full bg-slate-900 text-emerald-400 font-mono p-2.5 rounded-lg text-xs border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Trạng Thái Kết Luận *</Label>
                <select
                  value={stageForm.overall_status}
                  onChange={(e) => setStageForm({ ...stageForm, overall_status: e.target.value })}
                  className="w-full mt-1 h-9 px-3 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PASSED">PASSED (Đạt tiêu chuẩn)</option>
                  <option value="WARNING">WARNING (Cảnh báo sát ngưỡng)</option>
                  <option value="FAILED">FAILED (Không đạt chuẩn)</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Nhân Viên Kiểm Soát (KCS/IPQC) *</Label>
                <Input
                  value={stageForm.inspector_name}
                  onChange={(e) => setStageForm({ ...stageForm, inspector_name: e.target.value })}
                  placeholder="VD: Nguyễn Văn Kiểm"
                  className="mt-1 text-xs bg-white border-slate-300 font-semibold"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Quản Đốc / Trưởng Ca</Label>
                <Input
                  value={stageForm.supervisor_name}
                  onChange={(e) => setStageForm({ ...stageForm, supervisor_name: e.target.value })}
                  placeholder="VD: Trần Thị QA"
                  className="mt-1 text-xs bg-white border-slate-300 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Sai Lệch Ghi Nhận (Nếu có)</Label>
                <textarea
                  rows={2}
                  value={stageForm.deviations}
                  onChange={(e) => setStageForm({ ...stageForm, deviations: e.target.value })}
                  placeholder="Mô tả sai lệch về nhiệt độ, độ ẩm hoặc ngoại quan..."
                  className="w-full mt-1 bg-white border border-slate-300 rounded-md p-2 text-xs text-slate-800"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Hành Động Khắc Phục (CAPA)</Label>
                <textarea
                  rows={2}
                  value={stageForm.corrective_actions}
                  onChange={(e) =>
                    setStageForm({ ...stageForm, corrective_actions: e.target.value })
                  }
                  placeholder="Biện pháp xử lý ngay: điều chỉnh van gia nhiệt, sấy lại mẻ..."
                  className="w-full mt-1 bg-white border border-slate-300 rounded-md p-2 text-xs text-slate-800"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowStageModal(false)}
                className="text-xs"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                {editingStageLog ? "Lưu Cập Nhật" : "Lưu Phiếu IPQC"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: HACCP PLAN REVIEW ==================== */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-900 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              {editingReview
                ? "Cập Nhật Biên Bản Thẩm Tra Kế Hoạch HACCP"
                : "Lập Biên Bản Thẩm Tra Kế Hoạch HACCP Mới"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveReview} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Mã Biên Bản Thẩm Tra *</Label>
                <Input
                  value={reviewForm.review_code}
                  onChange={(e) => setReviewForm({ ...reviewForm, review_code: e.target.value })}
                  placeholder="VD: REV-HACCP-2026-001"
                  className="mt-1 text-xs bg-white border-slate-300 font-mono font-bold"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Kế Hoạch HACCP Thẩm Tra *</Label>
                <select
                  value={reviewForm.plan_id}
                  onChange={(e) => setReviewForm({ ...reviewForm, plan_id: e.target.value })}
                  className="w-full mt-1 h-9 px-3 py-1 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Chọn Kế hoạch HACCP --</option>
                  {plans.map((p) => {
                    const pid = p.plan_id || p.id || "";
                    return (
                      <option key={pid} value={pid}>
                        {p.plan_code} - {p.plan_name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Ngày Thẩm Tra *</Label>
                <Input
                  type="date"
                  value={reviewForm.review_date}
                  onChange={(e) => setReviewForm({ ...reviewForm, review_date: e.target.value })}
                  className="mt-1 text-xs bg-white border-slate-300"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Loại Hình Thẩm Tra *</Label>
                <select
                  value={reviewForm.review_type}
                  onChange={(e) => setReviewForm({ ...reviewForm, review_type: e.target.value })}
                  className="w-full mt-1 h-9 px-3 py-1 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="PERIODIC">Định kỳ định thời (Periodic)</option>
                  <option value="POST_CHANGE">Sau khi có thay đổi công nghệ / quy trình</option>
                  <option value="INCIDENT_TRIGGERED">Sau sự cố / Sự sai lệch nghiêm trọng</option>
                  <option value="ANNUAL">Đánh giá tổng thể thường niên</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">
                  Liên kết Yêu cầu thay đổi (MCR)
                </Label>
                <select
                  value={reviewForm.change_request_id || ""}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, change_request_id: e.target.value })
                  }
                  className="w-full mt-1 h-9 px-3 py-1 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Không liên kết thay đổi --</option>
                  {changeRequests.map((cr) => (
                    <option key={cr.id} value={cr.id}>
                      {cr.request_code}: {cr.title} ({cr.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Mục Đích & Phạm Vi Thẩm Tra *</Label>
                <textarea
                  rows={2}
                  value={reviewForm.scope_and_objective}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, scope_and_objective: e.target.value })
                  }
                  placeholder="Mục đích, phạm vi dây chuyền hoặc công đoạn được thẩm tra..."
                  className="w-full mt-1 bg-white border border-slate-300 rounded-md p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">
                  Thành Phần Đoàn / Người Thẩm Tra *
                </Label>
                <textarea
                  rows={2}
                  value={reviewForm.reviewers}
                  onChange={(e) => setReviewForm({ ...reviewForm, reviewers: e.target.value })}
                  placeholder="Họ tên, chức danh các thành viên đoàn thẩm tra..."
                  className="w-full mt-1 bg-white border border-slate-300 rounded-md p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {/* 3 Verification Pillars */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-bold text-slate-800 text-xs">
                Đánh giá 3 Trụ Cột Thẩm Tra Theo ISO 22000:2018 Điều 8.6 & 8.8:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={reviewForm.hazard_analysis_validity}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, hazard_analysis_validity: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-[11px] font-medium text-slate-800">
                    Phân tích mối nguy & Biện pháp kiểm soát còn hiệu lực
                  </span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={reviewForm.monitoring_records_adequate}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        monitoring_records_adequate: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-[11px] font-medium text-slate-800">
                    Hồ sơ giám sát CCP & OPRP đầy đủ, trung thực
                  </span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={reviewForm.corrective_actions_effective}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        corrective_actions_effective: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-[11px] font-medium text-slate-800">
                    Các hành động khắc phục (CAPA) đã thực hiện hiệu quả
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-semibold">
                  Tóm Tắt Thẩm Tra Giám Sát CCP
                </Label>
                <textarea
                  rows={2}
                  value={reviewForm.ccp_audit_summary || ""}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, ccp_audit_summary: e.target.value })
                  }
                  placeholder="Ghi nhận về việc kiểm soát ngưỡng tới hạn, tần suất giám sát..."
                  className="w-full mt-1 bg-white border border-slate-300 rounded-md p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Tóm Tắt Thẩm Tra PRP / OPRP</Label>
                <textarea
                  rows={2}
                  value={reviewForm.prp_audit_summary || ""}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, prp_audit_summary: e.target.value })
                  }
                  placeholder="Ghi nhận về vệ sinh nhà xưởng, nước đá, bảo hộ lao động..."
                  className="w-full mt-1 bg-white border border-slate-300 rounded-md p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Phát Hiện & Điểm Chưa Phù Hợp *</Label>
                <textarea
                  rows={2}
                  value={reviewForm.findings || ""}
                  onChange={(e) => setReviewForm({ ...reviewForm, findings: e.target.value })}
                  placeholder="Các điểm phù hợp và các khiếm khuyết phát hiện..."
                  className="w-full mt-1 bg-white border border-slate-300 rounded-md p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">
                  Hành Động Cần Thực Hiện / Khắc Phục *
                </Label>
                <textarea
                  rows={2}
                  value={reviewForm.required_actions || ""}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, required_actions: e.target.value })
                  }
                  placeholder="Yêu cầu sửa đổi kế hoạch, bổ sung huấn luyện, hiệu chuẩn lại..."
                  className="w-full mt-1 bg-white border border-slate-300 rounded-md p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-slate-700 font-bold">Kết Luận Thẩm Tra *</Label>
                <select
                  value={reviewForm.conclusion}
                  onChange={(e) => setReviewForm({ ...reviewForm, conclusion: e.target.value })}
                  className="w-full mt-1 h-9 px-3 py-1 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="COMPLIANT">Hiệu Lực (Đạt)</option>
                  <option value="NEEDS_UPDATE">Cần Cập Nhật</option>
                  <option value="CRITICAL_DEFICIENCY">Khiếm Khuyết Lớn</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Người Phê Duyệt</Label>
                <Input
                  value={reviewForm.approved_by || ""}
                  onChange={(e) => setReviewForm({ ...reviewForm, approved_by: e.target.value })}
                  placeholder="Lê Hoàng Quân (Giám đốc)"
                  className="mt-1 text-xs bg-white border-slate-300"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-semibold">Ngày Phê Duyệt</Label>
                <Input
                  type="date"
                  value={reviewForm.approval_date || ""}
                  onChange={(e) => setReviewForm({ ...reviewForm, approval_date: e.target.value })}
                  className="mt-1 text-xs bg-white border-slate-300"
                />
              </div>
              <div>
                <Label className="text-slate-700 font-bold">Trạng Thái Hồ Sơ *</Label>
                <select
                  value={reviewForm.status}
                  onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                  className="w-full mt-1 h-9 px-3 py-1 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="DRAFT">DRAFT (Dự thảo)</option>
                  <option value="PENDING_APPROVAL">PENDING_APPROVAL (Chờ duyệt)</option>
                  <option value="APPROVED">APPROVED (Đã duyệt)</option>
                  <option value="REJECTED">REJECTED (Bác bỏ)</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-slate-700 font-semibold">Ghi Chú Bổ Sung</Label>
              <textarea
                rows={1}
                value={reviewForm.notes || ""}
                onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                className="w-full mt-1 bg-white border border-slate-300 rounded-md p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewModalOpen(false)}
                className="text-xs"
              >
                Hủy Bỏ
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                {editingReview ? "Cập Nhật Hồ Sơ Thẩm Tra" : "Lưu Biên Bản Thẩm Tra"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPlanModal(false)}
                className="border-slate-300 text-slate-700"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
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
                  onChange={(e) =>
                    setStepForm({ ...stepForm, step_number: parseInt(e.target.value) || 1 })
                  }
                  className="mt-1 text-xs bg-white border-slate-300 text-slate-900 font-bold"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-slate-700 font-semibold">Kế hoạch HACCP</Label>
                <select
                  value={stepForm.plan_id}
                  onChange={(e) => {
                    const newPlanId = e.target.value;
                    const planSteps = steps.filter((s) => s.plan_id === newPlanId);
                    const targetPlan = plans.find((p) => p.plan_id === newPlanId);
                    setStepForm({
                      ...stepForm,
                      plan_id: newPlanId,
                      step_number: editingStep ? stepForm.step_number : planSteps.length + 1,
                      product_line: targetPlan?.product_line || stepForm.product_line,
                    });
                  }}
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
              <Label className="text-slate-700 font-semibold">
                Mô tả thao tác / Yêu cầu kỹ thuật
              </Label>
              <textarea
                rows={3}
                value={stepForm.description}
                onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })}
                placeholder="Yêu cầu thông số nhiệt độ, áp suất hoặc bao gói..."
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowStepModal(false)}
                className="border-slate-300 text-slate-700"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
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
                  const targetPlanId =
                    selectedPlanId !== "ALL"
                      ? selectedPlanId
                      : currentPlan?.plan_id || plans[0]?.plan_id;
                  if (targetPlanId) {
                    const stepPayload = wf.nodes.map((n, idx) => ({
                      step_id: n.id && n.id.length === 36 ? n.id : undefined,
                      step_number: idx + 1,
                      step_name: n.label.replace(/^\d+[.:-]\s*/, ""),
                      description: n.description || "",
                      is_ccp_or_oprp: !!n.is_ccp,
                      product_line: currentPlan?.product_line || "Chế biến Thủy hải sản",
                    }));
                    // Giao dịch nguyên tử ở backend: Lưu workflow và đồng bộ công đoạn trong 1 request duy nhất
                    await api.post(`/haccp/plans/${targetPlanId}/save-workflow-and-steps`, {
                      workflow: normalizeWorkflowForSave(wf),
                      steps: stepPayload,
                    });
                  } else {
                    await api.post("/builders/workflows", normalizeWorkflowForSave(wf));
                  }

                  toast.success("Đã lưu lưu đồ và đồng bộ danh mục công đoạn HACCP thành công!");
                  setShowWorkflowStudio(false);
                  await fetchData();
                } catch (err: any) {
                  const msg = workflowErrorMessage(err);
                  throw new Error(msg);
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
              <span className="font-bold text-rose-800 uppercase text-[11px] block">
                Cấu hình Giới hạn tới hạn (Critical Limit):
              </span>
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCCPModal(false)}
                className="border-slate-300 text-slate-700"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
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
                  onChange={(e) =>
                    setHazardForm({ ...hazardForm, likelihood: parseInt(e.target.value) || 2 })
                  }
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
                  onChange={(e) =>
                    setHazardForm({ ...hazardForm, severity: parseInt(e.target.value) || 2 })
                  }
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowHazardModal(false)}
                className="border-slate-300 text-slate-700"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
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
                    setLogForm({
                      ...logForm,
                      ccp_id: target.ccp_id,
                      unit: target.critical_limit?.unit || "°C",
                    });
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
              <Label className="text-slate-700 font-semibold">
                Hành động khắc phục (nếu vượt ngưỡng)
              </Label>
              <Input
                value={logForm.deviation_action}
                onChange={(e) => setLogForm({ ...logForm, deviation_action: e.target.value })}
                placeholder="Gia nhiệt bổ sung..."
                className="mt-1 text-xs bg-white border-slate-300 text-slate-900"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLogModal(false)}
                className="border-slate-300 text-slate-700"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
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
              key={`${formTemplateCCP.template_id || "ccp-form"}-${showDynamicFormLog}`}
              template={formTemplateCCP}
              initialValues={{
                batch_number: "LOT-2026-B01",
                retort_number: "Nồi Retort #01",
                core_temperature_c: 85.5,
                measured_temp: 85.5,
                holding_time_min: 15,
                holding_time: 15,
                pressure_bar: 1.8,
                is_limit_pass: true,
                is_pass: true,
              }}
              onSubmit={async (formData) => {
                try {
                  // 1. Lưu vào Form Builder Submissions
                  await api.post("/builders/submissions", {
                    template_id:
                      formTemplateCCP.template_id || "00000000-0000-0000-0000-000000000000",
                    submitted_by_name: "Nguyễn Văn An (Trưởng ca Sản xuất & QC)",
                    form_data: formData,
                    status: "COMPLETED",
                  });

                  // 2. Tự động ghi nhận log vào bảng Giám Sát CCP (ccp_monitoring_logs)
                  const targetCcp =
                    ccps.find(
                      (c) =>
                        c.ccp_code === "CCP 1" ||
                        (c.name && c.name.toLowerCase().includes("thanh trùng")),
                    ) || ccps[0];
                  if (targetCcp) {
                    const tempVal = parseFloat(
                      formData["core_temperature_c"] ||
                        formData["measured_temp"] ||
                        formData["measured_value"] ||
                        85.5,
                    );
                    const isPass =
                      formData["is_limit_pass"] !== false &&
                      formData["is_pass"] !== false &&
                      String(formData["is_limit_pass"]).toLowerCase() !== "false";

                    const logPayload = {
                      ccp_id: targetCcp.ccp_id,
                      batch_number: String(formData["batch_number"] || "LOT-2026-B01").trim(),
                      measured_value: isNaN(tempVal) ? 85.5 : tempVal,
                      unit: "°C",
                      deviation_action: !isPass
                        ? "Biệt trữ lô hàng, tái gia nhiệt lại hoặc xử lý theo quy trình ứng phó sai lệch CCP"
                        : null,
                      notes: String(
                        formData["notes"] ||
                          formData["qc_signature"] ||
                          `Ghi nhận qua phiếu kiểm soát CCP động ${formTemplateCCP.code}`,
                      ),
                    };

                    const res = await api.post("/haccp/ccp-logs", logPayload);
                    const saved = res.data;
                    if (saved.status === "CRITICAL") {
                      toast.error(
                        `CẢNH BÁO VI PHẠM: Giá trị ${saved.measured_value}${saved.unit} vượt ngoài giới hạn tới hạn!`,
                      );
                    } else if (saved.status === "WARNING") {
                      toast.warning(
                        `LƯU Ý: Giá trị ${saved.measured_value}${saved.unit} sát ngưỡng tới hạn.`,
                      );
                    } else {
                      toast.success(
                        `Đã ghi nhận nhật ký đo CCP [${targetCcp.ccp_code}] thành công!`,
                      );
                    }
                  } else {
                    toast.success("Đã ghi nhận phiếu giám sát CCP vào cơ sở dữ liệu!");
                  }

                  setShowDynamicFormLog(false);
                  await fetchData();
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
                  <h2 className="text-lg font-black uppercase text-slate-900">
                    BẢNG KẾ HOẠCH KIỂM SOÁT MỐI NGUY & ĐIỂM CCP (HACCP PLAN)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Tiêu chuẩn ISO 22000:2018 Điều khoản 8.5.4 • Mã hồ sơ: BM-HACCP-01
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handlePrintHaccpPlan}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> In Bản Cứng
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                Kế hoạch:{" "}
                <strong className="text-slate-900">
                  {currentPlan?.plan_name || "Chế biến Cá Ngừ"}
                </strong>
              </div>
              <div>
                Mã hiệu:{" "}
                <strong className="text-slate-900">
                  {currentPlan?.plan_code || "HACCP-2026-01"} (Ver {currentPlan?.version || "2.1"})
                </strong>
              </div>
              <div>
                Trưởng ban HACCP:{" "}
                <strong className="text-slate-900">
                  {currentPlan?.team_leader || "Nguyễn Văn An"}
                </strong>
              </div>
              <div>
                Người phê duyệt:{" "}
                <strong className="text-slate-900">
                  {currentPlan?.approved_by || "Lê Hoàng Quân (Giám đốc)"}
                </strong>
              </div>
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
                    <td className="p-2 font-bold border-r border-slate-300 text-rose-700">
                      {c.ccp_code}
                    </td>
                    <td className="p-2 border-r border-slate-300">{c.step_name}</td>
                    <td className="p-2 border-r border-slate-300">{c.hazard_description}</td>
                    <td className="p-2 font-bold border-r border-slate-300 text-slate-900">
                      {c.critical_limit?.condition_text || "Đạt chuẩn"}
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      {c.monitoring_frequency} ({c.monitoring_method})
                    </td>
                    <td className="p-2 border-r border-slate-300">{c.corrective_action_plan}</td>
                    <td className="p-2 font-semibold text-emerald-700">{c.responsible_role}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrintPlanModal(false)}
                className="text-xs border-slate-300 text-slate-700"
              >
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
                <h2 className="text-lg font-black uppercase text-slate-900">
                  NHẬT KÝ THEO DÕI ĐO ĐẠC ĐIỂM KIỂM SOÁT TỚI HẠN CCP
                </h2>
                <p className="text-xs text-slate-500">Biểu mẫu BM-CCP-LOG-01 • Nhà máy WCERT</p>
              </div>
              <Button
                size="sm"
                onClick={handlePrintCCPLogs}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
              >
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
                    <td className="p-2 font-bold border-r border-slate-300 text-rose-700">
                      {l.ccp_code}
                    </td>
                    <td className="p-2 font-mono font-bold border-r border-slate-300 text-slate-900">
                      {l.batch_number}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-slate-600">
                      {l.test_time || "Hôm nay"}
                    </td>
                    <td className="p-2 font-bold border-r border-slate-300 text-slate-900">
                      {l.measured_value} {l.unit}
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      {l.critical_limit_text || "Tiêu chuẩn"}
                    </td>
                    <td className="p-2 font-bold border-r border-slate-300">{l.status}</td>
                    <td className="p-2 font-medium text-slate-800">
                      {l.inspector_name || "QC Ca"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrintLogModal(false)}
                className="text-xs border-slate-300 text-slate-700"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Xóa Kế Hoạch HACCP */}
      <ConfirmDialog
        isOpen={!!deletingPlan}
        onClose={() => setDeletingPlan(null)}
        onConfirm={() => {
          if (deletingPlan) {
            executeDeletePlan(deletingPlan);
            setDeletingPlan(null);
          }
        }}
        title="Xác nhận xóa kế hoạch HACCP"
        description={`Bạn có chắc chắn muốn xóa kế hoạch HACCP [${deletingPlan?.plan_code}] - "${deletingPlan?.plan_name}" không? Toàn bộ các công đoạn và điểm kiểm soát liên kết sẽ bị ảnh hưởng.`}
        confirmLabel="Xóa kế hoạch"
        variant="destructive"
      />

      {/* Modal Xác Nhận Xóa Công Đoạn Lưu Đồ */}
      <ConfirmDialog
        isOpen={!!deletingStep}
        onClose={() => setDeletingStep(null)}
        onConfirm={() => {
          if (deletingStep) {
            executeDeleteStep(deletingStep);
            setDeletingStep(null);
          }
        }}
        title="Xác nhận xóa công đoạn lưu đồ"
        description={`Bạn có chắc chắn muốn xóa công đoạn '${deletingStep?.step_number}. ${deletingStep?.step_name}' khỏi lưu đồ HACCP không?`}
        confirmLabel="Xóa công đoạn"
        variant="destructive"
      />

      {/* Modal Xác Nhận Xóa Điểm CCP / oPRP */}
      <ConfirmDialog
        isOpen={!!deletingCCP}
        onClose={() => setDeletingCCP(null)}
        onConfirm={() => {
          if (deletingCCP) {
            executeDeleteCCP(deletingCCP);
            setDeletingCCP(null);
          }
        }}
        title="Xác nhận xóa điểm kiểm soát tới hạn"
        description={`Bạn có chắc chắn muốn xóa điểm kiểm soát [${deletingCCP?.ccp_code}] - "${deletingCCP?.name}" khỏi kế hoạch HACCP không?`}
        confirmLabel="Xóa điểm CCP"
        variant="destructive"
      />

      {/* Modal Xác Nhận Xóa Mối Nguy */}
      <ConfirmDialog
        isOpen={!!deletingHazard}
        onClose={() => setDeletingHazard(null)}
        onConfirm={() => {
          if (deletingHazard) {
            executeDeleteHazard(deletingHazard);
            setDeletingHazard(null);
          }
        }}
        title="Xác nhận xóa phân tích mối nguy"
        description={`Bạn có chắc chắn muốn xóa mối nguy "${deletingHazard?.hazard_name}" khỏi ma trận đánh giá không?`}
        confirmLabel="Xóa mối nguy"
        variant="destructive"
      />

      {/* Module Guide Modal */}
      <ModuleGuideModal module="haccp" isOpen={showGuide} onClose={() => setShowGuide(false)} />

      {/* Workflow & Flowchart Guide Modal */}
      <WorkflowGuideModal isOpen={showWfGuide} onClose={() => setShowWfGuide(false)} />
    </div>
  );
}
