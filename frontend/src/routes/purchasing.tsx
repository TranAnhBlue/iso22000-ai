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
  Building2,
  Package,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Eye,
  Pencil,
  Trash2,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Thermometer,
  Droplets,
  Layers,
  FileSpreadsheet,
  Printer,
  Award,
  Link as LinkIcon,
  ChevronRight,
  TrendingUp,
  Boxes,
  FileText,
  Copy,
  Check,
  Clock,
  XCircle,
  Percent,
  GitFork,
  Sliders,
  ClipboardList,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import logoImg from "@/assets/logo.png";
import { DynamicFormRenderer } from "@/components/builder/DynamicFormRenderer";
import { WorkflowBuilder, type WorkflowTemplateData } from "@/components/builder/WorkflowBuilder";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { FormTemplateData } from "@/components/builder/types";
import { printHtml } from "@/lib/print";

export const Route = createFileRoute("/purchasing")({
  head: () => ({
    meta: [
      { title: "Nhà Cung Cấp & Kiểm Định Tiếp Nhận IQC – WCERT ISO 22000" },
      {
        name: "description",
        content:
          "Kiểm soát các quá trình, sản phẩm hoặc dịch vụ do bên ngoài cung cấp (ASL), tiếp nhận lô nguyên liệu (FEFO) và thẩm định COA/IQC theo tiêu chuẩn ISO 22000:2018 Điều khoản 7.1.6.",
      },
    ],
  }),
  component: () => (
    <AppShell module="purchasing">
      <PurchasingPage />
    </AppShell>
  ),
});

// ==================== INTERFACES ====================
export interface SupplierItem {
  supplier_id: string;
  supplier_code: string;
  supplier_name: string;
  category: string;
  contact_info?: {
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
    tax_code?: string;
  } | null;
  certifications: string[];
  rating_score: number;
  status: "APPROVED" | "WARNING" | "SUSPENDED" | "PENDING_EVALUATION" | string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | string;
  evaluation_notes?: string | null;
  evaluation_date?: string | null;
  created_at?: string | null;
  lots_count?: number;
  iqc_pass_rate?: number;
}

export interface MaterialLotItem {
  material_lot_id: string;
  lot_number: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_code?: string | null;
  material_name: string;
  material_category?: string | null;
  received_date: string;
  mfg_date?: string | null;
  exp_date?: string | null;
  quantity: number;
  unit: string;
  storage_condition?: string | null;
  coa_file_url?: string | null;
  status: "PENDING_IQC" | "APPROVED" | "REJECTED" | "QUARANTINE" | string;
  created_by?: string | null;
  creator_name?: string | null;
  created_at?: string | null;
  iqc_status?: string | null;
  inspection_id?: string | null;
}

export interface IQCInspectionItem {
  inspection_id: string;
  inspection_code: string;
  material_lot_id: string;
  inspector_id?: string | null;
  sensory_check: boolean;
  packaging_check: boolean;
  temperature_c?: number | null;
  moisture_content?: number | null;
  mycotoxin_check: boolean;
  allergen_check: boolean;
  coa_compliance: boolean;
  defect_rate_percent?: number | null;
  impurity_percent?: number | null;
  size_uniformity_check: boolean;
  vehicle_cleanliness_check: boolean;
  delivery_vehicle_plate?: string | null;
  driver_name?: string | null;
  inspection_details?: any;
  status: "PASSED" | "REJECTED" | "CONDITIONAL" | "PENDING" | string;
  notes?: string | null;
  lot_number?: string | null;
  material_name?: string | null;
  supplier_name?: string | null;
  inspector_name?: string | null;
  inspected_at?: string | null;
}

export interface PurchasingStats {
  total_suppliers: number;
  approved_suppliers: number;
  warning_suppliers: number;
  suspended_suppliers: number;
  total_lots_received: number;
  pending_iqc_lots: number;
  iqc_pass_rate_percentage: number;
  total_inspections: number;
  rejected_inspections: number;
}

export interface SupplierEvaluationPlanItem {
  id: number;
  plan_code: string;
  year: number;
  title: string;
  department: string;
  scope?: string | null;
  approved_by?: string | null;
  approval_status: string;
  created_at?: string | null;
  evaluations_count?: number;
}

export interface SupplierEvaluationCriterion {
  id: string;
  name: string;
  max_score: number;
  description: string;
  score: number;
  pass_fail: "PASS" | "FAIL" | string;
  notes?: string;
}

export interface SupplierEvaluationItem {
  id: number;
  evaluation_code: string;
  plan_id?: number | null;
  supplier_id: string;
  criteria_type: "AGRI_FRESH" | "AQUA_ANIMAL_FRESH" | "PROCESSED_DRY_PACKAGING" | string;
  evaluation_date: string;
  evaluator_name: string;
  audit_type: string;
  criteria_scores: SupplierEvaluationCriterion[];
  total_score: number;
  grade: "A" | "B" | "C" | "D" | string;
  conclusion: "APPROVED" | "CONDITIONAL" | "DISQUALIFIED" | string;
  corrective_actions?: string | null;
  approved_by?: string | null;
  created_at?: string | null;
  supplier_name?: string | null;
  supplier_code?: string | null;
  plan_code?: string | null;
}

// ==================== CONSTANTS & OPTIONS ====================
export const SUPPLIER_CATEGORIES = [
  "Nguyên liệu tươi sống",
  "Bột mì & Tinh bột",
  "Phụ gia & Gia vị",
  "Bao bì trực tiếp",
  "Hóa chất CIP & Khử trùng",
  "Dầu ăn & Chất béo thực vật",
  "Vật tư & Thiết bị",
];

export const CERTIFICATION_OPTIONS = [
  "ISO 22000:2018",
  "HACCP Codex",
  "FSSC 22000",
  "BRC Food Grade A",
  "VietGAP",
  "Halal",
  "ISO 9001:2015",
  "Chứng nhận NSF Hóa chất TP",
];

export const STORAGE_CONDITIONS = [
  "Kho lạnh ≤ -18°C",
  "Kho mát 0-4°C",
  "Kho mát 18-22°C",
  "Kho thường ≤ 25°C, khô ráo",
  "Kho bao bì tiêu chuẩn",
  "Kho hóa chất chuyên dụng",
];

export const SUPPLIER_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  APPROVED: {
    label: "Đạt chuẩn (ASL)",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800",
  },
  WARNING: {
    label: "Cảnh báo rủi ro",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10 border-amber-200 dark:border-amber-800",
  },
  SUSPENDED: {
    label: "Ngừng hợp tác",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500/10 border-rose-200 dark:border-rose-800",
  },
  PENDING_EVALUATION: {
    label: "Chờ đánh giá",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-500/10 border-blue-200 dark:border-blue-800",
  },
};

export const LOT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  APPROVED: {
    label: "Đã duyệt nhập kho",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800",
  },
  PENDING_IQC: {
    label: "Chờ kiểm định IQC",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10 border-amber-200 dark:border-amber-800",
  },
  QUARANTINE: {
    label: "Cách ly theo dõi",
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-500/10 border-purple-200 dark:border-purple-800",
  },
  REJECTED: {
    label: "Từ chối / Trả hàng",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500/10 border-rose-200 dark:border-rose-800",
  },
};

export const IQC_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  PASSED: {
    label: "Đạt chuẩn tiếp nhận",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  CONDITIONAL: {
    label: "Nhập có điều kiện / Cách ly",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10 border-amber-200 dark:border-amber-800",
    icon: AlertTriangle,
  },
  REJECTED: {
    label: "Không đạt / Trả hàng",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500/10 border-rose-200 dark:border-rose-800",
    icon: XCircle,
  },
};

// AI Templates for COA Simulation
const AI_COA_TEMPLATES = [
  {
    type: "SEAFOOD",
    title: "Cá ngừ đại dương fillet cấp đông IQF",
    supplier: "Công ty Cổ phần Thủy hải sản Biển Đông",
    lot_code: "LOT-2026-SEAFOOD-001",
    desc: "Kiểm tra nhiệt độ xe đông lạnh, chỉ tiêu vi sinh Salmonella, E.coli, histamine và kim loại nặng (Pb, Cd).",
  },
  {
    type: "FLOUR",
    title: "Bột mì cao cấp số 11 (Protein 11.5%)",
    supplier: "Công ty Bột mì Bình Đông & Ngũ cốc Đại Nam",
    lot_code: "LOT-2026-FLOUR-002",
    desc: "Kiểm tra độ ẩm (≤ 13.8%), độc tố vi nấm Aflatoxin B1/tổng, chỉ số Gluten và dị nguyên.",
  },
  {
    type: "SPICE",
    title: "Hương liệu & Bột gia vị mặn tự nhiên",
    supplier: "Công ty TNHH Hương liệu & Gia vị Sài Gòn",
    lot_code: "LOT-2026-SPICE-003",
    desc: "Kiểm tra cảm quan, độ ẩm, độ mịn, kim loại nặng và chứng chỉ không biến đổi gen (Non-GMO).",
  },
  {
    type: "PACKAGING",
    title: "Màng bao bì hút chân không PA/PE 5 lớp",
    supplier: "Tổng công ty Bao bì Màng ghép Phú Mỹ",
    lot_code: "LOT-2026-PACK-004",
    desc: "Kiểm tra độ thôi nhiễm chì/cadmi (QCVN 12-1), độ bền kéo đứt và sự nguyên vẹn cuộn màng.",
  },
  {
    type: "CHEMICAL",
    title: "Dung dịch Khử trùng Chlorin Diocide ClO2 5%",
    supplier: "Công ty CP Hóa chất Tẩy rửa Tân An Lành",
    lot_code: "LOT-2026-CHEM-005",
    desc: "Kiểm tra nồng độ hoạt chất, phiếu an toàn hóa chất MSDS và chứng nhận an toàn thực phẩm NSF.",
  },
];

function PurchasingPage() {
  const [activeTab, setActiveTab] = useState<
    "suppliers" | "lots" | "inspections" | "eval_plans" | "evaluations" | "ai_coa"
  >("suppliers");

  // Data States
  const [stats, setStats] = useState<PurchasingStats | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [lots, setLots] = useState<MaterialLotItem[]>([]);
  const [inspections, setInspections] = useState<IQCInspectionItem[]>([]);
  const [evaluationPlans, setEvaluationPlans] = useState<SupplierEvaluationPlanItem[]>([]);
  const [evaluations, setEvaluations] = useState<SupplierEvaluationItem[]>([]);
  const [criteriaTemplates, setCriteriaTemplates] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Filters for Plans and Evaluations
  const [planSearch, setPlanSearch] = useState("");
  const [evalSearch, setEvalSearch] = useState("");
  const [evalTypeFilter, setEvalTypeFilter] = useState("ALL");
  const [evalConclusionFilter, setEvalConclusionFilter] = useState("ALL");

  // Modals States
  const [isCreateSupplierOpen, setIsCreateSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<SupplierItem | null>(null);

  const [isCreateLotOpen, setIsCreateLotOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<MaterialLotItem | null>(null);
  const [viewingLot, setViewingLot] = useState<MaterialLotItem | null>(null);

  const [isCreateInspectionOpen, setIsCreateInspectionOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<IQCInspectionItem | null>(null);
  const [viewingInspection, setViewingInspection] = useState<IQCInspectionItem | null>(null);

  // Modals for Plans and Evaluations
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SupplierEvaluationPlanItem | null>(null);
  const [planForm, setPlanForm] = useState({
    plan_code: "",
    year: new Date().getFullYear(),
    title: `Kế hoạch Đánh giá Năng lực Nhà cung ứng Năm ${new Date().getFullYear()}`,
    department: "Phòng Đảm Bảo Chất Lượng (QA/QC)",
    scope: "Toàn bộ nhà cung cấp nguyên liệu tươi sống, phụ gia thực phẩm và bao bì tiếp xúc trực tiếp",
    approved_by: "Giám Đốc Nhà Máy",
    approval_status: "APPROVED",
  });

  const [isCreateEvalOpen, setIsCreateEvalOpen] = useState(false);
  const [editingEval, setEditingEval] = useState<SupplierEvaluationItem | null>(null);
  const [evalForm, setEvalForm] = useState<any>({
    evaluation_code: "",
    plan_id: null,
    supplier_id: "",
    criteria_type: "AGRI_FRESH",
    evaluation_date: new Date().toISOString().split("T")[0],
    evaluator_name: "Chuyên viên QA/QC",
    audit_type: "ON_SITE",
    criteria_scores: [] as SupplierEvaluationCriterion[],
    total_score: 100,
    grade: "A",
    conclusion: "APPROVED",
    corrective_actions: "",
    approved_by: "Giám Đốc Nhà Máy",
  });

  const [isPrintIqcOpen, setIsPrintIqcOpen] = useState(false);
  const [isPrintAslOpen, setIsPrintAslOpen] = useState(false);
  const [aiEvalSupplier, setAiEvalSupplier] = useState<any | null>(null);

  // AI COA State
  const [selectedCoaTemplate, setSelectedCoaTemplate] = useState("SEAFOOD");
  const [coaAiResult, setCoaAiResult] = useState<any | null>(null);
  const [isCoaAnalyzing, setIsCoaAnalyzing] = useState(false);

  // Deleting Confirmation States
  const [deletingSupplierItem, setDeletingSupplierItem] = useState<{ id: string; name: string } | null>(null);
  const [deletingLotItem, setDeletingLotItem] = useState<{ id: string; code: string } | null>(null);
  const [deletingInspectionItem, setDeletingInspectionItem] = useState<{ id: string; code: string } | null>(null);
  const [deletingPlanItem, setDeletingPlanItem] = useState<{ id: number; code: string } | null>(null);
  const [deletingEvalItem, setDeletingEvalItem] = useState<{ id: number; code: string } | null>(null);

  // Form States
  const [supplierForm, setSupplierForm] = useState({
    supplier_code: "",
    supplier_name: "",
    category: "Nguyên liệu tươi sống",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    tax_code: "",
    certifications: [] as string[],
    rating_score: 95,
    status: "APPROVED",
    risk_level: "LOW",
    evaluation_notes: "",
  });

  const [lotForm, setLotForm] = useState({
    lot_number: "",
    supplier_id: "",
    material_name: "",
    material_category: "Nguyên liệu tươi sống",
    received_date: new Date().toISOString().split("T")[0],
    mfg_date: "",
    exp_date: "",
    quantity: 1000,
    unit: "kg",
    storage_condition: "Kho lạnh ≤ -18°C",
    coa_file_url: "",
    status: "PENDING_IQC",
  });

  const [inspectionForm, setInspectionForm] = useState({
    inspection_code: "",
    material_lot_id: "",
    sensory_check: true,
    packaging_check: true,
    temperature_c: -18.0,
    moisture_content: 0.0,
    mycotoxin_check: true,
    allergen_check: false,
    coa_compliance: true,
    defect_rate_percent: 0.0,
    impurity_percent: 0.0,
    size_uniformity_check: true,
    vehicle_cleanliness_check: true,
    delivery_vehicle_plate: "",
    driver_name: "",
    status: "PASSED",
    notes: "",
  });

  // Dynamic Form States
  const [showDynamicVendorModal, setShowDynamicVendorModal] = useState(false);
  const [vendorFormTemplate, setVendorFormTemplate] = useState<FormTemplateData | null>(null);
  const [selectedSupplierForForm, setSelectedSupplierForForm] = useState<SupplierItem | null>(null);

  const [showDynamicIqcModal, setShowDynamicIqcModal] = useState(false);
  const [iqcFormTemplate, setIqcFormTemplate] = useState<FormTemplateData | null>(null);
  const [selectedLotForForm, setSelectedLotForForm] = useState<MaterialLotItem | null>(null);

  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [workflowTemplate, setWorkflowTemplate] = useState<WorkflowTemplateData | null>(null);

  // Fetch Stats & Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, supRes, lotsRes, inspRes, plansRes, evalsRes, tmplRes] = await Promise.allSettled([
        api.get("/purchasing/stats"),
        api.get("/purchasing/suppliers"),
        api.get("/purchasing/lots"),
        api.get("/purchasing/inspections"),
        api.get("/purchasing/evaluation-plans"),
        api.get("/purchasing/evaluations"),
        api.get("/purchasing/evaluation-criteria-templates"),
      ]);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (supRes.status === "fulfilled") setSuppliers(supRes.value.data);
      if (lotsRes.status === "fulfilled") setLots(lotsRes.value.data);
      if (inspRes.status === "fulfilled") setInspections(inspRes.value.data);
      if (plansRes.status === "fulfilled") setEvaluationPlans(plansRes.value.data);
      if (evalsRes.status === "fulfilled") setEvaluations(evalsRes.value.data);
      if (tmplRes.status === "fulfilled") setCriteriaTemplates(tmplRes.value.data);
    } catch (err: any) {
      toast.error("Không thể kết nối đến cơ sở dữ liệu Mua hàng & IQC.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchQuery =
        s.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.supplier_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat =
        selectedCategory === "ALL" || s.category === selectedCategory;
      const matchStatus =
        selectedStatus === "ALL" || s.status === selectedStatus;
      return matchQuery && matchCat && matchStatus;
    });
  }, [suppliers, searchQuery, selectedCategory, selectedStatus]);

  // Filtered Lots
  const filteredLots = useMemo(() => {
    return lots.filter((l) => {
      const matchQuery =
        l.lot_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.supplier_name &&
          l.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat =
        selectedCategory === "ALL" || l.material_category === selectedCategory;
      const matchStatus =
        selectedStatus === "ALL" || l.status === selectedStatus;
      return matchQuery && matchCat && matchStatus;
    });
  }, [lots, searchQuery, selectedCategory, selectedStatus]);

  // Filtered Inspections
  const filteredInspections = useMemo(() => {
    return inspections.filter((i) => {
      const matchQuery =
        i.inspection_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.lot_number &&
          i.lot_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (i.material_name &&
          i.material_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (i.supplier_name &&
          i.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus =
        selectedStatus === "ALL" || i.status === selectedStatus;
      return matchQuery && matchStatus;
    });
  }, [inspections, searchQuery, selectedStatus]);

  // Filtered Evaluation Plans
  const filteredPlans = useMemo(() => {
    return evaluationPlans.filter((p) => {
      const matchQuery =
        planSearch === "" ||
        p.plan_code.toLowerCase().includes(planSearch.toLowerCase()) ||
        p.title.toLowerCase().includes(planSearch.toLowerCase()) ||
        p.department.toLowerCase().includes(planSearch.toLowerCase());
      return matchQuery;
    });
  }, [evaluationPlans, planSearch]);

  // Filtered Supplier Evaluations
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((e) => {
      const matchQuery =
        evalSearch === "" ||
        e.evaluation_code.toLowerCase().includes(evalSearch.toLowerCase()) ||
        (e.supplier_name && e.supplier_name.toLowerCase().includes(evalSearch.toLowerCase())) ||
        (e.supplier_code && e.supplier_code.toLowerCase().includes(evalSearch.toLowerCase())) ||
        e.evaluator_name.toLowerCase().includes(evalSearch.toLowerCase());
      const matchType = evalTypeFilter === "ALL" || e.criteria_type === evalTypeFilter;
      const matchConclusion = evalConclusionFilter === "ALL" || e.conclusion === evalConclusionFilter;
      return matchQuery && matchType && matchConclusion;
    });
  }, [evaluations, evalSearch, evalTypeFilter, evalConclusionFilter]);

  // ==================== SUPPLIER HANDLERS ====================
  const handleOpenCreateSupplier = () => {
    const nextNum = suppliers.length + 1;
    const padded = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    setSupplierForm({
      supplier_code: `NCC-${padded}`,
      supplier_name: "",
      category: "Nguyên liệu tươi sống",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      tax_code: "",
      certifications: ["ISO 22000:2018", "HACCP Codex"],
      rating_score: 95.0,
      status: "APPROVED",
      risk_level: "LOW",
      evaluation_notes: "Đạt yêu cầu đánh giá hồ sơ năng lực ban đầu.",
    });
    setEditingSupplier(null);
    setIsCreateSupplierOpen(true);
  };

  const handleOpenEditSupplier = (s: SupplierItem) => {
    setEditingSupplier(s);
    setSupplierForm({
      supplier_code: s.supplier_code,
      supplier_name: s.supplier_name,
      category: s.category || "Nguyên liệu tươi sống",
      contact_person: s.contact_info?.contact_person || "",
      phone: s.contact_info?.phone || "",
      email: s.contact_info?.email || "",
      address: s.contact_info?.address || "",
      tax_code: s.contact_info?.tax_code || "",
      certifications: s.certifications || [],
      rating_score: s.rating_score,
      status: s.status,
      risk_level: s.risk_level || "LOW",
      evaluation_notes: s.evaluation_notes || "",
    });
    setIsCreateSupplierOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.supplier_name.trim()) {
      toast.error("Vui lòng nhập tên nhà cung cấp.");
      return;
    }
    const payload = {
      supplier_code: supplierForm.supplier_code,
      supplier_name: supplierForm.supplier_name,
      category: supplierForm.category,
      contact_info: {
        contact_person: supplierForm.contact_person,
        phone: supplierForm.phone,
        email: supplierForm.email,
        address: supplierForm.address,
        tax_code: supplierForm.tax_code,
      },
      certifications: supplierForm.certifications,
      rating_score: Number(supplierForm.rating_score),
      status: supplierForm.status,
      risk_level: supplierForm.risk_level,
      evaluation_notes: supplierForm.evaluation_notes,
    };

    try {
      if (editingSupplier) {
        await api.put(`/purchasing/suppliers/${editingSupplier.supplier_id}`, payload);
        toast.success("Cập nhật thông tin Nhà cung cấp thành công!");
      } else {
        await api.post("/purchasing/suppliers", payload);
        toast.success("Thêm mới Nhà cung cấp vào Danh bạ ASL thành công!");
      }
      setIsCreateSupplierOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi lưu Nhà cung cấp.");
    }
  };

  const executeDeleteSupplier = async (id: string, name: string) => {
    try {
      await api.delete(`/purchasing/suppliers/${id}`);
      toast.success(`Đã xóa nhà cung cấp "${name}".`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa nhà cung cấp.");
    }
  };

  const handleAiEvaluateSupplier = async (s: SupplierItem) => {
    try {
      toast.info(`Đang kích hoạt AI đánh giá hiệu suất của ${s.supplier_name}...`);
      const res = await api.post("/purchasing/ai/evaluate-supplier", {
        supplier_id: s.supplier_id,
      });
      setAiEvalSupplier(res.data);
      fetchData();
    } catch (err: any) {
      toast.error("Không thể đánh giá AI lúc này.");
    }
  };

  // ==================== DYNAMIC FORM & WORKFLOW HANDLERS ====================
  const handleOpenVendorDynamicForm = async (supplier: SupplierItem) => {
    setSelectedSupplierForForm(supplier);
    try {
      const res = await api.get("/builders/forms");
      const found = res.data.find((f: any) => f.code === "FORM-VENDOR-01");
      if (found) {
        setVendorFormTemplate(found);
      } else {
        setVendorFormTemplate({
          module: "SUPPLIER_AUDIT",
          code: "FORM-VENDOR-01",
          title: "Bảng Đánh Giá Năng Lực & ATTP Nhà Cung Cấp (BM-NCC-01)",
          description: "Đánh giá định kỳ hàng năm điều kiện nhà xưởng và chứng chỉ ISO 22000/HACCP của đối tác.",
          version: "1.0",
          fields: [
            { id: "v_name", name: "supplier_name", label: "Tên đối tác / Nhà cung cấp", type: "TEXT", required: true, default_value: supplier.supplier_name },
            { id: "v_iso", name: "has_iso_cert", label: "Đã có chứng nhận ISO 22000 / HACCP còn hiệu lực?", type: "YESNO", required: true, default_value: true },
            { id: "v_score", name: "quality_score", label: "Điểm chất lượng hàng hóa giao trong năm (Thang 1-100)", type: "NUMBER", required: true, min_val: 0, max_val: 100, default_value: supplier.rating_score || 95 },
            { id: "v_delivery", name: "ontime_delivery_rate", label: "Tỷ lệ giao hàng đúng hẹn (%)", type: "NUMBER", required: true, unit: "%", min_val: 0, max_val: 100, default_value: 98 },
            { id: "v_ranking", name: "supplier_ranking", label: "Xếp loại nhà cung cấp", type: "SELECT", options: ["Hạng A (Ưu tiên)", "Hạng B (Đạt chuẩn)", "Hạng C (Cần khắc phục)", "Hạng D (Đình chỉ)"], required: true, default_value: "Hạng A (Ưu tiên)" },
            { id: "v_notes", name: "audit_notes", label: "Ghi chú & Kiến nghị hành động", type: "TEXT", required: false, default_value: "Đạt yêu cầu thẩm định định kỳ." },
          ],
          status: "ACTIVE",
        });
      }
      setShowDynamicVendorModal(true);
    } catch (err) {
      toast.error("Không thể tải biểu mẫu đánh giá NCC");
    }
  };

  const handleSaveVendorDynamicForm = async (vals: Record<string, any>) => {
    if (!selectedSupplierForForm) return;
    try {
      // 1. Phân tích kết quả đánh giá từ biểu mẫu động
      const hasIso = vals["has_iso_cert"] !== false && String(vals["has_iso_cert"]).toLowerCase() !== "false";
      const ranking = String(vals["final_ranking"] || vals["supplier_ranking"] || "");
      const score = Number(vals["quality_score"] || selectedSupplierForForm.rating_score || 0);

      let newStatus = "APPROVED";
      let newRisk = "LOW";

      // Nếu không có chứng nhận ISO hoặc xếp Loại D (đình chỉ) hoặc điểm < 50 => Đình chỉ hợp tác (SUSPENDED)
      if (!hasIso || ranking.includes("Loại D") || ranking.includes("Hạng D") || ranking.includes("Đình chỉ") || ranking.includes("Loại khỏi") || score < 50) {
        newStatus = "SUSPENDED";
        newRisk = "HIGH";
      } else if (ranking.includes("Loại C") || ranking.includes("Hạng C") || ranking.includes("khắc phục") || score < 75) {
        newStatus = "WARNING";
        newRisk = "MEDIUM";
      } else {
        newStatus = "APPROVED";
        newRisk = "LOW";
      }

      const note = vals["audit_notes"] || (
        newStatus === "SUSPENDED" 
          ? "Đình chỉ: Không đạt thẩm định định kỳ ATTP / Thiếu chứng nhận ISO còn hiệu lực" 
          : newStatus === "WARNING" 
          ? "Cảnh báo: Cần khắc phục các điểm không phù hợp trước đợt giao hàng tiếp theo" 
          : "Đạt chuẩn thẩm định năng lực & ATTP định kỳ"
      );
      const today = new Date().toISOString().split("T")[0];

      // 2. Lưu kết quả submission vào Form Builder
      await api.post("/builders/submissions", {
        template_id: vendorFormTemplate?.template_id || "FORM-VENDOR-01",
        reference_id: selectedSupplierForForm.supplier_id,
        reference_type: "SUPPLIER",
        submitted_by_name: "Lê Hoàng Nam (Trưởng ban QA/QC)",
        form_data: vals,
        status: "COMPLETED",
      });

      // 3. Cập nhật trực tiếp trạng thái & điểm đánh giá của Nhà cung ứng vào CSDL
      await api.put(`/purchasing/suppliers/${selectedSupplierForForm.supplier_id}`, {
        status: newStatus,
        risk_level: newRisk,
        rating_score: score || selectedSupplierForForm.rating_score,
        evaluation_notes: note,
        evaluation_date: today,
      });

      const statusLabel = newStatus === "APPROVED" ? "ĐẠT CHUẨN (APPROVED)" : newStatus === "WARNING" ? "CẢNH BÁO (WARNING)" : "ĐÌNH CHỈ / KHÔNG ĐẠT (SUSPENDED)";
      toast.success(`Đã cập nhật trạng thái NCC "${selectedSupplierForForm.supplier_name}" -> ${statusLabel}!`);
      setShowDynamicVendorModal(false);
      await fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi lưu kết quả đánh giá: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleOpenIqcDynamicForm = async (lot: MaterialLotItem) => {
    setSelectedLotForForm(lot);
    try {
      const res = await api.get("/builders/forms");
      const found = res.data.find((f: any) => f.code === "FORM-IQC-01");
      if (found) {
        setIqcFormTemplate(found);
      } else {
        setIqcFormTemplate({
          module: "IQC",
          code: "FORM-IQC-01",
          title: "Phiếu Nghiệm Thu Nguyên Liệu Thủy Sản Đầu Vào (IQC-01)",
          description: "Đánh giá chất lượng cảm quan, nhiệt độ xe đông lạnh và phiếu COA nhà cung cấp theo ISO 22000 Điều khoản 8.2.",
          version: "1.0",
          fields: [
            { id: "f_lot", name: "lot_number", label: "Số Lô Nguyên Liệu", type: "TEXT", required: true, default_value: lot.lot_number },
            { id: "f_material", name: "material_name", label: "Tên Nguyên Liệu", type: "TEXT", required: true, default_value: lot.material_name },
            { id: "f_temp", name: "temp_delivery", label: "Nhiệt độ thùng xe lúc giao nhận (°C - Yêu cầu ≤ -18°C)", type: "NUMBER", required: true, unit: "°C", default_value: -19.2 },
            { id: "f_sensory", name: "sensory_pass", label: "Cảm quan đạt độ tươi sống, không ươn hỏng, không mùi lạ?", type: "YESNO", required: true, default_value: true },
            { id: "f_coa", name: "has_coa", label: "Hồ sơ COA & kiểm dịch đầy đủ hợp lệ?", type: "YESNO", required: true, default_value: true },
            { id: "f_decision", name: "qc_decision", label: "Kết luận IQC Tiếp nhận", type: "SELECT", options: ["CHẤP NHẬN NHẬP KHO (PASS)", "CÁCH LY / BIỆT TRỮ (QUARANTINE)", "TỪ CHỐI NHẬN HÀNG (REJECT)"], required: true, default_value: "CHẤP NHẬN NHẬP KHO (PASS)" },
          ],
          status: "ACTIVE",
        });
      }
      setShowDynamicIqcModal(true);
    } catch (err) {
      toast.error("Không thể tải biểu mẫu IQC");
    }
  };

  const handleSaveIqcDynamicForm = async (vals: Record<string, any>) => {
    if (!selectedLotForForm) return;
    try {
      await api.post("/builders/submissions", {
        template_id: iqcFormTemplate?.template_id || "FORM-IQC-01",
        reference_id: selectedLotForForm.material_lot_id,
        reference_type: "MATERIAL_LOT",
        submitted_by_name: "QC Tiếp Nhận IQC",
        form_data: vals,
        status: "COMPLETED",
      });
      // Cập nhật trạng thái lô hàng
      const decision = vals["qc_decision"] || vals["decision"];
      let newStatus = "APPROVED";
      if (String(decision).includes("REJECT")) newStatus = "REJECTED";
      else if (String(decision).includes("QUARANTINE")) newStatus = "QUARANTINE";

      await api.put(`/purchasing/lots/${selectedLotForForm.material_lot_id}`, {
        ...selectedLotForForm,
        status: newStatus,
      });

      toast.success(`Đã lưu biên bản nghiệm thu IQC cho lô "${selectedLotForForm.lot_number}" thành công!`);
      setShowDynamicIqcModal(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi lưu kết quả IQC: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleOpenSupplierWorkflow = async () => {
    try {
      const res = await api.get("/builders/workflows");
      const found = res.data.find((w: any) => w.code === "WF-SUPPLIER-AUDIT" || w.module === "SUPPLIER_AUDIT");
      if (found) {
        setWorkflowTemplate(found);
      } else {
        setWorkflowTemplate({
          module: "SUPPLIER_AUDIT",
          code: "WF-SUPPLIER-AUDIT",
          title: "Quy Trình Thẩm Định & Phê Duyệt Nhà Cung Cấp ASL (ISO 7.1.6)",
          description: "Quy trình 4 bước thẩm định hồ sơ pháp lý, đánh giá thực địa và cấp mã ASL chính thức.",
          version: "1.0",
          nodes: [
            { id: "wf_1", type: "process", label: "1. Tiếp nhận Hồ sơ Năng lực & Pháp lý", role: "Phòng Mua hàng", description: "Thu thập ĐKKD, Chứng chỉ ATTP (ISO 22000/HACCP) và bảng giá.", is_ccp: false, step_number: 1 },
            { id: "wf_2", type: "approval", label: "2. Thẩm tra Kỹ thuật & Thử nghiệm mẫu", role: "Phòng QC & QA", description: "Test mẫu thử nghiệm vi sinh, kim loại nặng và dư lượng kháng sinh.", is_ccp: false, step_number: 2 },
            { id: "wf_3", type: "approval", label: "3. Đánh giá Thực địa Nhà xưởng", role: "Đoàn Đánh giá ISO", description: "Kiểm tra thực tế điều kiện vệ sinh, nhà xưởng và kho lạnh của đối tác.", is_ccp: false, step_number: 3 },
            { id: "wf_4", type: "process", label: "4. Phê duyệt & Cấp mã Danh bạ ASL", role: "Ban Giám Đốc", description: "Ký quyết định công nhận nhà cung cấp chính thức và đưa vào ASL.", is_ccp: false, step_number: 4 },
          ],
          edges: [
            { id: "e1_2", source: "wf_1", target: "wf_2", label: "Hồ sơ hợp lệ" },
            { id: "e2_3", source: "wf_2", target: "wf_3", label: "Mẫu thử Đạt" },
            { id: "e3_4", source: "wf_3", target: "wf_4", label: "Hiện trường Đạt" },
          ],
          status: "ACTIVE",
        });
      }
      setShowWorkflowModal(true);
    } catch (err) {
      toast.error("Không thể tải quy trình NCC");
    }
  };

  // ==================== LOT HANDLERS ====================
  const handleOpenCreateLot = (prefillSupplierId?: string) => {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
    const rand = Math.floor(100 + Math.random() * 900);
    setLotForm({
      lot_number: `LOT-${dateStr}-${rand}`,
      supplier_id: prefillSupplierId || (suppliers[0]?.supplier_id ?? ""),
      material_name: "",
      material_category: "Nguyên liệu tươi sống",
      received_date: today.toISOString().split("T")[0],
      mfg_date: today.toISOString().split("T")[0],
      exp_date: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      quantity: 1000,
      unit: "kg",
      storage_condition: "Kho lạnh ≤ -18°C",
      coa_file_url: "https://iso22000.wcert.vn/coa/COA-SAMPLE.pdf",
      status: "PENDING_IQC",
    });
    setEditingLot(null);
    setIsCreateLotOpen(true);
  };

  const handleOpenEditLot = (lot: MaterialLotItem) => {
    setEditingLot(lot);
    setLotForm({
      lot_number: lot.lot_number,
      supplier_id: lot.supplier_id || "",
      material_name: lot.material_name,
      material_category: lot.material_category || "Nguyên liệu tươi sống",
      received_date: lot.received_date,
      mfg_date: lot.mfg_date || "",
      exp_date: lot.exp_date || "",
      quantity: lot.quantity,
      unit: lot.unit,
      storage_condition: lot.storage_condition || "Kho thường ≤ 25°C",
      coa_file_url: lot.coa_file_url || "",
      status: lot.status,
    });
    setIsCreateLotOpen(true);
  };

  const handleSaveLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotForm.material_name.trim()) {
      toast.error("Vui lòng nhập tên nguyên vật liệu.");
      return;
    }
    const payload = {
      lot_number: lotForm.lot_number,
      supplier_id: lotForm.supplier_id || null,
      material_name: lotForm.material_name,
      material_category: lotForm.material_category,
      received_date: lotForm.received_date,
      mfg_date: lotForm.mfg_date || null,
      exp_date: lotForm.exp_date || null,
      quantity: Number(lotForm.quantity),
      unit: lotForm.unit,
      storage_condition: lotForm.storage_condition,
      coa_file_url: lotForm.coa_file_url || null,
      status: lotForm.status,
    };

    try {
      if (editingLot) {
        await api.put(`/purchasing/lots/${editingLot.material_lot_id}`, payload);
        toast.success("Cập nhật lô nguyên vật liệu thành công!");
      } else {
        await api.post("/purchasing/lots", payload);
        toast.success("Tiếp nhận Lô nguyên vật liệu mới thành công!");
      }
      setIsCreateLotOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi lưu Lô nguyên liệu.");
    }
  };

  const executeDeleteLot = async (id: string, code: string) => {
    try {
      await api.delete(`/purchasing/lots/${id}`);
      toast.success(`Đã xóa lô nguyên liệu "${code}".`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa lô.");
    }
  };

  // ==================== INSPECTION HANDLERS ====================
  const handleOpenCreateInspection = (prefillLot?: MaterialLotItem) => {
    const today = new Date();
    const year = today.getFullYear();
    const count = inspections.length + 1;
    const padded = count < 10 ? `00${count}` : count < 100 ? `0${count}` : `${count}`;

    const targetLot = prefillLot || lots[0];
    setInspectionForm({
      inspection_code: `IQC-${year}-${padded}`,
      material_lot_id: targetLot ? targetLot.material_lot_id : "",
      sensory_check: true,
      packaging_check: true,
      temperature_c: targetLot?.storage_condition?.includes("lạnh") ? -19.0 : 25.0,
      moisture_content: targetLot?.material_category?.includes("Bột") ? 13.0 : 0.0,
      mycotoxin_check: true,
      allergen_check: false,
      coa_compliance: true,
      defect_rate_percent: 0.0,
      impurity_percent: 0.0,
      size_uniformity_check: true,
      vehicle_cleanliness_check: true,
      delivery_vehicle_plate: "67C-182.45",
      driver_name: "Nguyễn Văn Tuấn",
      status: "PASSED",
      notes: "Ngoại quan nguyên vẹn, màu sắc tự nhiên, phiếu COA hợp lệ theo chuẩn ISO 22000.",
    });
    setEditingInspection(null);
    setIsCreateInspectionOpen(true);
  };

  const handleOpenEditInspection = (insp: IQCInspectionItem) => {
    setEditingInspection(insp);
    setInspectionForm({
      inspection_code: insp.inspection_code,
      material_lot_id: insp.material_lot_id,
      sensory_check: insp.sensory_check,
      packaging_check: insp.packaging_check,
      temperature_c: insp.temperature_c ?? 25.0,
      moisture_content: insp.moisture_content ?? 0.0,
      mycotoxin_check: insp.mycotoxin_check,
      allergen_check: insp.allergen_check,
      coa_compliance: insp.coa_compliance,
      defect_rate_percent: insp.defect_rate_percent ?? 0.0,
      impurity_percent: insp.impurity_percent ?? 0.0,
      size_uniformity_check: insp.size_uniformity_check ?? true,
      vehicle_cleanliness_check: insp.vehicle_cleanliness_check ?? true,
      delivery_vehicle_plate: insp.delivery_vehicle_plate || "",
      driver_name: insp.driver_name || "",
      status: insp.status,
      notes: insp.notes || "",
    });
    setIsCreateInspectionOpen(true);
  };

  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionForm.material_lot_id) {
      toast.error("Vui lòng chọn Lô nguyên vật liệu để kiểm định.");
      return;
    }
    const payload = {
      inspection_code: inspectionForm.inspection_code,
      material_lot_id: inspectionForm.material_lot_id,
      sensory_check: inspectionForm.sensory_check,
      packaging_check: inspectionForm.packaging_check,
      temperature_c: Number(inspectionForm.temperature_c),
      moisture_content: Number(inspectionForm.moisture_content),
      mycotoxin_check: inspectionForm.mycotoxin_check,
      allergen_check: inspectionForm.allergen_check,
      coa_compliance: inspectionForm.coa_compliance,
      defect_rate_percent: Number(inspectionForm.defect_rate_percent) || 0.0,
      impurity_percent: Number(inspectionForm.impurity_percent) || 0.0,
      size_uniformity_check: inspectionForm.size_uniformity_check,
      vehicle_cleanliness_check: inspectionForm.vehicle_cleanliness_check,
      delivery_vehicle_plate: inspectionForm.delivery_vehicle_plate,
      driver_name: inspectionForm.driver_name,
      status: inspectionForm.status,
      notes: inspectionForm.notes,
    };

    try {
      if (editingInspection) {
        await api.put(`/purchasing/inspections/${editingInspection.inspection_id}`, payload);
        toast.success("Cập nhật biên bản kiểm định IQC thành công!");
      } else {
        await api.post("/purchasing/inspections", payload);
        toast.success("Lập biên bản IQC và đồng bộ trạng thái Lô thành công!");
      }
      setIsCreateInspectionOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi lưu Biên bản IQC.");
    }
  };

  const executeDeleteInspection = async (id: string, code: string) => {
    try {
      await api.delete(`/purchasing/inspections/${id}`);
      toast.success(`Đã xóa biên bản IQC "${code}".`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa biên bản.");
    }
  };

  // ==================== AI COA ANALYZER ====================
  const handleAnalyzeCoa = async (sampleType: string) => {
    setIsCoaAnalyzing(true);
    setSelectedCoaTemplate(sampleType);
    const tmpl = AI_COA_TEMPLATES.find((t) => t.type === sampleType);
    try {
      const res = await api.post("/purchasing/ai/analyze-coa", {
        material_name: tmpl?.title || "Nguyên liệu thử nghiệm",
        sample_type: sampleType,
      });
      setCoaAiResult(res.data);
      toast.success(`AI đã thẩm định xong COA của "${tmpl?.title}"!`);
    } catch (err: any) {
      toast.error("Không thể phân tích COA lúc này.");
    } finally {
      setIsCoaAnalyzing(false);
    }
  };

  const handleApplyCoaToInspection = () => {
    if (!coaAiResult) return;
    const tmpl = AI_COA_TEMPLATES.find((t) => t.type === selectedCoaTemplate);
    const matchedLot = lots.find((l) =>
      l.material_name.toLowerCase().includes(tmpl?.title.toLowerCase().substring(0, 10) || "")
    ) || lots[0];

    handleOpenCreateInspection(matchedLot);
    setInspectionForm((prev) => ({
      ...prev,
      material_lot_id: matchedLot ? matchedLot.material_lot_id : "",
      status: coaAiResult.suggested_iqc_status,
      notes: `[AI COA Thẩm định]: ${coaAiResult.summary} (Tham chiếu: ${coaAiResult.iso_standard_reference})`,
    }));
    setActiveTab("inspections");
    toast.success("Đã tự động điền dữ liệu thẩm định AI vào Biên bản IQC!");
  };

  // ==================== EVALUATION PLAN & EVALUATION HANDLERS ====================
  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanForm({
      plan_code: `KHĐG-2026-${String(evaluationPlans.length + 1).padStart(2, "0")}`,
      year: new Date().getFullYear(),
      title: `Kế hoạch Đánh giá Năng lực Nhà cung ứng Năm ${new Date().getFullYear()}`,
      department: "Phòng Đảm Bảo Chất Lượng (QA/QC)",
      scope: "Toàn bộ nhà cung cấp nguyên liệu tươi sống, phụ gia thực phẩm và bao bì tiếp xúc trực tiếp",
      approved_by: "Giám Đốc Nhà Máy",
      approval_status: "APPROVED",
    });
    setIsCreatePlanOpen(true);
  };

  const openEditPlan = (plan: SupplierEvaluationPlanItem) => {
    setEditingPlan(plan);
    setPlanForm({
      plan_code: plan.plan_code,
      year: plan.year,
      title: plan.title,
      department: plan.department,
      scope: plan.scope || "",
      approved_by: plan.approved_by || "",
      approval_status: plan.approval_status,
    });
    setIsCreatePlanOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await api.put(`/purchasing/evaluation-plans/${editingPlan.id}`, planForm);
        toast.success(`Đã cập nhật kế hoạch đánh giá [${planForm.plan_code}]`);
      } else {
        await api.post("/purchasing/evaluation-plans", planForm);
        toast.success(`Đã tạo kế hoạch đánh giá mới [${planForm.plan_code}]`);
      }
      setIsCreatePlanOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi lưu kế hoạch: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeletePlan = async (id: number) => {
    try {
      await api.delete(`/purchasing/evaluation-plans/${id}`);
      toast.success("Đã xóa kế hoạch đánh giá thành công.");
      fetchData();
    } catch (err: any) {
      toast.error("Không thể xóa kế hoạch: " + (err.response?.data?.detail || err.message));
    }
  };

  const openNewEval = () => {
    setEditingEval(null);
    const defaultType = "AGRI_FRESH";
    const tmplCriteria = criteriaTemplates?.[defaultType]?.criteria || [];
    const scores = tmplCriteria.map((c: any) => ({
      id: c.id,
      name: c.name,
      max_score: c.max_score,
      description: c.description,
      score: c.max_score,
      pass_fail: "PASS",
      notes: c.notes || "",
    }));
    const total = scores.reduce((sum: number, c: any) => sum + Number(c.score), 0);

    setEvalForm({
      evaluation_code: `ĐGNCC-2026-${String(evaluations.length + 1).padStart(3, "0")}`,
      plan_id: evaluationPlans.length > 0 ? evaluationPlans[0].id : null,
      supplier_id: suppliers.length > 0 ? suppliers[0].supplier_id : "",
      criteria_type: defaultType,
      evaluation_date: new Date().toISOString().split("T")[0],
      evaluator_name: "Chuyên viên QA/QC",
      audit_type: "ON_SITE",
      criteria_scores: scores,
      total_score: total,
      grade: total >= 85 ? "A" : total >= 70 ? "B" : total >= 50 ? "C" : "D",
      conclusion: total >= 70 ? "APPROVED" : total >= 50 ? "CONDITIONAL" : "DISQUALIFIED",
      corrective_actions: "",
      approved_by: "Giám Đốc Nhà Máy",
    });
    setIsCreateEvalOpen(true);
  };

  const openEditEval = (ev: SupplierEvaluationItem) => {
    setEditingEval(ev);
    setEvalForm({
      evaluation_code: ev.evaluation_code,
      plan_id: ev.plan_id ?? null,
      supplier_id: ev.supplier_id,
      criteria_type: ev.criteria_type,
      evaluation_date: ev.evaluation_date,
      evaluator_name: ev.evaluator_name,
      audit_type: ev.audit_type,
      criteria_scores: ev.criteria_scores || [],
      total_score: ev.total_score,
      grade: ev.grade,
      conclusion: ev.conclusion,
      corrective_actions: ev.corrective_actions || "",
      approved_by: ev.approved_by || "",
    });
    setIsCreateEvalOpen(true);
  };

  const handleCriteriaTypeChange = (newType: string) => {
    const tmplCriteria = criteriaTemplates?.[newType]?.criteria || [];
    const scores = tmplCriteria.map((c: any) => ({
      id: c.id,
      name: c.name,
      max_score: c.max_score,
      description: c.description,
      score: c.max_score,
      pass_fail: "PASS",
      notes: c.notes || "",
    }));
    const total = scores.reduce((sum: number, c: any) => sum + Number(c.score), 0);
    setEvalForm({
      ...evalForm,
      criteria_type: newType,
      criteria_scores: scores,
      total_score: total,
      grade: total >= 85 ? "A" : total >= 70 ? "B" : total >= 50 ? "C" : "D",
      conclusion: total >= 70 ? "APPROVED" : total >= 50 ? "CONDITIONAL" : "DISQUALIFIED",
    });
  };

  const handleCriteriaScoreChange = (index: number, newScore: number, notes?: string) => {
    const updated = [...evalForm.criteria_scores];
    const item = updated[index];
    const scoreVal = Math.min(Math.max(0, newScore), item.max_score);
    updated[index] = {
      ...item,
      score: scoreVal,
      pass_fail: scoreVal >= item.max_score * 0.7 ? "PASS" : "FAIL",
      notes: notes !== undefined ? notes : item.notes,
    };
    const total = updated.reduce((sum: number, c: any) => sum + Number(c.score), 0);
    const grade = total >= 85 ? "A" : total >= 70 ? "B" : total >= 50 ? "C" : "D";
    const conclusion = total >= 70 ? "APPROVED" : total >= 50 ? "CONDITIONAL" : "DISQUALIFIED";
    setEvalForm({
      ...evalForm,
      criteria_scores: updated,
      total_score: total,
      grade,
      conclusion,
    });
  };

  const handleSaveEval = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...evalForm,
        plan_id: evalForm.plan_id ? Number(evalForm.plan_id) : null,
        total_score: Number(evalForm.total_score),
      };
      if (editingEval) {
        await api.put(`/purchasing/evaluations/${editingEval.id}`, payload);
        toast.success(`Đã cập nhật phiếu đánh giá [${payload.evaluation_code}]`);
      } else {
        await api.post("/purchasing/evaluations", payload);
        toast.success(`Đã lập phiếu đánh giá nhà cung cấp [${payload.evaluation_code}]`);
      }
      setIsCreateEvalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi lưu phiếu đánh giá: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteEval = async (id: number) => {
    try {
      await api.delete(`/purchasing/evaluations/${id}`);
      toast.success("Đã xóa phiếu đánh giá thành công.");
      fetchData();
    } catch (err: any) {
      toast.error("Không thể xóa phiếu đánh giá: " + (err.response?.data?.detail || err.message));
    }
  };

  // ==================== ISO PRINT TEMPLATES (BM02, BM03, BM03-TS, BM04) ====================
  const handlePrintEvaluationPlan = (plan: SupplierEvaluationPlanItem) => {
    const planEvals = evaluations.filter((e) => e.plan_id === plan.id);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Kế Hoạch Đánh Giá Nhà Cung Cấp Năm ${plan.year} - ${plan.plan_code}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 20mm; }
          body { font-family: 'Times New Roman', serif; color: #111; line-height: 1.4; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
          .logo { font-size: 18px; font-weight: bold; text-transform: uppercase; color: #047857; }
          .sub-logo { font-size: 10px; color: #555; }
          .form-meta { text-align: right; font-size: 11px; }
          .title { text-align: center; font-size: 17px; font-weight: bold; text-transform: uppercase; margin: 15px 0 5px 0; }
          .sub-title { text-align: center; font-size: 12px; font-style: italic; margin-bottom: 15px; }
          .info-box { margin-bottom: 15px; border: 1px solid #ccc; padding: 10px; background: #fafafa; border-radius: 4px; }
          .info-row { display: flex; margin-bottom: 6px; }
          .info-label { font-weight: bold; width: 180px; }
          .info-val { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; text-align: left; }
          th { background: #e5e7eb; font-weight: bold; text-align: center; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .signature-section { margin-top: 35px; display: flex; justify-content: space-between; }
          .sign-box { width: 45%; text-align: center; }
          .sign-title { font-weight: bold; text-transform: uppercase; font-size: 12px; margin-bottom: 50px; }
          .sign-name { font-weight: bold; text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">NHÀ MÁY CHẾ BIẾN THỰC PHẨM MEKONG FOODS</div>
            <div class="sub-logo">Hệ Thống Quản Lý An Toàn Thực Phẩm ISO 22000:2018</div>
          </div>
          <div class="form-meta">
            <div><strong>Mã biểu mẫu:</strong> BM02-KHĐGNCC</div>
            <div><strong>Mã số tài liệu:</strong> BM-NCC-02</div>
            <div><strong>Lần ban hành:</strong> 03 | <strong>Ngày:</strong> 01/01/2026</div>
          </div>
        </div>

        <div class="title">KẾ HOẠCH ĐÁNH GIÁ NĂNG LỰC NHÀ CUNG CẤP HÀNG NĂM</div>
        <div class="sub-title">(Theo quy định Điều khoản 7.1.6 ISO 22000:2018 — Đánh giá & Phê duyệt nhà cung ứng)</div>

        <div class="info-box">
          <div class="info-row"><span class="info-label">Mã số kế hoạch:</span><span class="info-val"><strong>${plan.plan_code}</strong></span></div>
          <div class="info-row"><span class="info-label">Năm thực hiện:</span><span class="info-val">${plan.year}</span></div>
          <div class="info-row"><span class="info-label">Đơn vị chủ trì:</span><span class="info-val">${plan.department}</span></div>
          <div class="info-row"><span class="info-label">Phạm vi đánh giá:</span><span class="info-val">${plan.scope || "Toàn bộ nhà cung cấp nguyên liệu tươi sống, phụ gia và bao bì tiếp xúc trực tiếp"}</span></div>
          <div class="info-row"><span class="info-label">Tình trạng phê duyệt:</span><span class="info-val"><strong>${plan.approval_status === "APPROVED" ? "ĐÃ PHÊ DUYỆT BỞI BAN GIÁM ĐỐC" : plan.approval_status}</strong></span></div>
        </div>

        <div style="font-weight: bold; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; font-size: 12px;">
          DANH SÁCH NHÀ CUNG CẤP ĐƯỢC LÊN LỊCH ĐÁNH GIÁ TRONG NĂM (${planEvals.length} ĐƠN VỊ):
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px;">STT</th>
              <th style="width: 90px;">Mã NCC</th>
              <th>Tên Nhà Cung Cấp</th>
              <th style="width: 130px;">Bộ Tiêu Chí Áp Dụng</th>
              <th style="width: 85px;">Hình Thức</th>
              <th style="width: 80px;">Thời Gian</th>
              <th style="width: 70px;">Điểm Số</th>
              <th style="width: 90px;">Kết Luận</th>
            </tr>
          </thead>
          <tbody>
            ${
              planEvals.length === 0
                ? `<tr><td colspan="8" class="text-center" style="padding: 15px; color: #777;">Chưa có phiếu đánh giá nào được gán vào kế hoạch này.</td></tr>`
                : planEvals
                    .map(
                      (e, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td class="text-center"><strong>${e.supplier_code || "NCC"}</strong></td>
                <td><strong>${e.supplier_name || "Nhà cung cấp"}</strong></td>
                <td class="text-center">
                  ${
                    e.criteria_type === "AGRI_FRESH"
                      ? "BM03 (Nông sản tươi)"
                      : e.criteria_type === "AQUA_ANIMAL_FRESH"
                      ? "TC Bổ sung (Thủy sản tươi)"
                      : "BM04 (Khô, phụ gia, bao bì)"
                  }
                </td>
                <td class="text-center">${e.audit_type === "ON_SITE" ? "Tại cơ sở" : e.audit_type === "PERIODIC" ? "Định kỳ" : e.audit_type}</td>
                <td class="text-center">${e.evaluation_date}</td>
                <td class="text-center"><strong>${e.total_score}</strong>/100</td>
                <td class="text-center" style="font-weight: bold; color: ${e.conclusion === "APPROVED" ? "#047857" : e.conclusion === "CONDITIONAL" ? "#b45309" : "#b91c1c"};">
                  ${e.conclusion === "APPROVED" ? "DUY TRÌ (ĐẠT)" : e.conclusion === "CONDITIONAL" ? "CẦN CAPA" : "LOẠI BỎ"}
                </td>
              </tr>
            `
                    )
                    .join("")
            }
          </tbody>
        </table>

        <div class="signature-section">
          <div class="sign-box">
            <div class="sign-title">NGƯỜI LẬP KẾ HOẠCH (QA/QC)</div>
            <div class="sign-name">Trưởng Phòng Đảm Bảo Chất Lượng</div>
          </div>
          <div class="sign-box">
            <div class="sign-title">PHÊ DUYỆT BAN GIÁM ĐỐC</div>
            <div class="sign-name">${plan.approved_by || "Giám Đốc Nhà Máy"}</div>
          </div>
        </div>
      </body>
      </html>
    `;
    printHtml(html);
  };

  const handlePrintEvaluation = (ev: SupplierEvaluationItem) => {
    const isAgri = ev.criteria_type === "AGRI_FRESH";
    const isAqua = ev.criteria_type === "AQUA_ANIMAL_FRESH";
    const formCode = isAgri ? "BM03" : isAqua ? "TC-BS-TS (Bộ tiêu chí bổ sung)" : "BM04";
    const formTitle = isAgri
      ? "PHIẾU ĐÁNH GIÁ NHÀ CUNG CẤP NÔNG SẢN TƯƠI SỐNG (BM03)"
      : isAqua
      ? "PHIẾU ĐÁNH GIÁ NHÀ CUNG CẤP THỦY HẢI SẢN TƯƠI SỐNG (BỘ TIÊU CHÍ BỔ SUNG)"
      : "PHIẾU ĐÁNH GIÁ NHÀ CUNG CẤP NGUYÊN LIỆU KHÔ, PHỤ GIA & BAO BÌ (BM04)";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Phiếu Đánh Giá Nhà Cung Cấp - ${ev.evaluation_code}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 20mm; }
          body { font-family: 'Times New Roman', serif; color: #111; line-height: 1.4; font-size: 13px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
          .logo { font-size: 18px; font-weight: bold; text-transform: uppercase; color: #047857; }
          .sub-logo { font-size: 10px; color: #555; }
          .form-meta { text-align: right; font-size: 11px; }
          .title { text-align: center; font-size: 16px; font-weight: bold; text-transform: uppercase; margin: 12px 0 4px 0; }
          .sub-title { text-align: center; font-size: 12px; font-style: italic; margin-bottom: 15px; }
          .info-box { margin-bottom: 15px; border: 1px solid #ccc; padding: 10px; background: #fafafa; border-radius: 4px; }
          .info-row { display: flex; margin-bottom: 5px; }
          .info-label { font-weight: bold; width: 190px; }
          .info-val { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12px; }
          th { background: #e5e7eb; font-weight: bold; text-align: center; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .result-summary { margin-top: 15px; border: 1px solid #047857; background: #ecfdf5; padding: 10px; border-radius: 4px; }
          .signature-section { margin-top: 30px; display: flex; justify-content: space-between; }
          .sign-box { width: 30%; text-align: center; }
          .sign-title { font-weight: bold; text-transform: uppercase; font-size: 11px; margin-bottom: 45px; }
          .sign-name { font-weight: bold; text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">NHÀ MÁY CHẾ BIẾN THỰC PHẨM MEKONG FOODS</div>
            <div class="sub-logo">Hệ Thống Quản Lý An Toàn Thực Phẩm ISO 22000:2018</div>
          </div>
          <div class="form-meta">
            <div><strong>Mã biểu mẫu:</strong> ${formCode}</div>
            <div><strong>Số phiếu:</strong> ${ev.evaluation_code}</div>
            <div><strong>Lần soát xét:</strong> 02 | <strong>ISO Clause:</strong> 7.1.6</div>
          </div>
        </div>

        <div class="title">${formTitle}</div>
        <div class="sub-title">(Ban hành kèm theo Quy trình Thẩm định & Đánh giá Nhà cung cấp ISO 22000)</div>

        <div class="info-box">
          <div class="info-row"><span class="info-label">Tên Nhà cung cấp:</span><span class="info-val"><strong>${ev.supplier_name || "Nhà cung cấp"} (${ev.supplier_code || "NCC"})</strong></span></div>
          <div class="info-row"><span class="info-label">Mã kế hoạch liên kết:</span><span class="info-val">${ev.plan_code || "Đánh giá định kỳ"}</span></div>
          <div class="info-row"><span class="info-label">Ngày đánh giá thực tế:</span><span class="info-val">${ev.evaluation_date}</span></div>
          <div class="info-row"><span class="info-label">Hình thức đánh giá:</span><span class="info-val">${ev.audit_type === "ON_SITE" ? "Đánh giá trực tiếp tại cơ sở sản xuất / vùng nuôi" : ev.audit_type === "PERIODIC" ? "Định kỳ xem xét hồ sơ năng lực & COA" : ev.audit_type}</span></div>
          <div class="info-row"><span class="info-label">Trưởng đoàn đánh giá:</span><span class="info-val">${ev.evaluator_name}</span></div>
        </div>

        <div style="font-weight: bold; text-transform: uppercase; font-size: 12px; margin-bottom: 5px;">
          BẢNG ĐIỂM CHI TIẾT CÁC HẠNG MỤC TIÊU CHUẨN AN TOÀN THỰC PHẨM:
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">STT</th>
              <th style="width: 170px;">Hạng Mục Tiêu Chí</th>
              <th>Nội Dung Yêu Cầu & Phương Pháp Thẩm Tra</th>
              <th style="width: 60px;">Điểm Tối Đa</th>
              <th style="width: 60px;">Điểm Đạt</th>
              <th style="width: 65px;">Kết Quả</th>
              <th style="width: 160px;">Ghi Nhận Tại Hiện Trường</th>
            </tr>
          </thead>
          <tbody>
            ${
              (ev.criteria_scores || []).map((c, i) => `
                <tr>
                  <td class="text-center">${i + 1}</td>
                  <td><strong>${c.name}</strong></td>
                  <td style="font-size: 11px;">${c.description}</td>
                  <td class="text-center">${c.max_score}</td>
                  <td class="text-center"><strong>${c.score}</strong></td>
                  <td class="text-center" style="font-weight: bold; color: ${c.pass_fail === "PASS" ? "#047857" : "#b91c1c"};">${c.pass_fail}</td>
                  <td style="font-size: 11px; font-style: italic;">${c.notes || "Đạt yêu cầu."}</td>
                </tr>
              `).join("")
            }
          </tbody>
          <tfoot>
            <tr style="background: #f3f4f6; font-weight: bold;">
              <td colspan="3" class="text-right">TỔNG ĐIỂM ĐÁNH GIÁ:</td>
              <td class="text-center">100</td>
              <td class="text-center" style="font-size: 14px; color: #047857;">${ev.total_score}</td>
              <td class="text-center">Hạng ${ev.grade}</td>
              <td>${ev.conclusion === "APPROVED" ? "Phê duyệt duy trì" : ev.conclusion === "CONDITIONAL" ? "Cần khắc phục" : "Đình chỉ"}</td>
            </tr>
          </tfoot>
        </table>

        <div class="result-summary">
          <div><strong>Xếp hạng:</strong> Hạng ${ev.grade} (Thang điểm: A ≥ 85 | B: 70-84 | C: 50-69 | D < 50)</div>
          <div><strong>Kết luận của Đoàn đánh giá:</strong> 
            <span style="font-weight: bold; text-transform: uppercase; color: ${ev.conclusion === "APPROVED" ? "#047857" : ev.conclusion === "CONDITIONAL" ? "#b45309" : "#b91c1c"};">
              ${ev.conclusion === "APPROVED" ? "ĐẠT — ĐƯỢC PHÊ DUYỆT DUY TRÌ TRONG DANH BẠ NHÀ CUNG CẤP (ASL)" : ev.conclusion === "CONDITIONAL" ? "CẦN KHẮC PHỤC (CAPA) TRONG VÒNG 30 NGÀY" : "KHÔNG ĐẠT — ĐÌNH CHỈ GIAO DỊCH VÀ LOẠI KHỎI ASL"}
            </span>
          </div>
          ${ev.corrective_actions ? `<div style="margin-top: 4px;"><strong>Kiến nghị & Hành động khắc phục:</strong> ${ev.corrective_actions}</div>` : ""}
        </div>

        <div class="signature-section">
          <div class="sign-box">
            <div class="sign-title">ĐẠI DIỆN NHÀ CUNG CẤP</div>
            <div class="sign-name">Ký, ghi rõ họ tên</div>
          </div>
          <div class="sign-box">
            <div class="sign-title">TRƯỞNG ĐOÀN ĐÁNH GIÁ</div>
            <div class="sign-name">${ev.evaluator_name}</div>
          </div>
          <div class="sign-box">
            <div class="sign-title">GIÁM ĐỐC PHÊ DUYỆT</div>
            <div class="sign-name">${ev.approved_by || "Giám Đốc Nhà Máy"}</div>
          </div>
        </div>
      </body>
      </html>
    `;
    printHtml(html);
  };

  return (
    <div className="space-y-6">
      {/* HEADER & QUICK ACTIONS */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <PageHeader
          title="Đánh Giá Nhà Cung Cấp & Tiếp Nhận Kiểm Định IQC"
          description="Kiểm soát các quá trình, sản phẩm hoặc dịch vụ do bên ngoài cung cấp (ASL), tiếp nhận lô nguyên liệu (FEFO) và thẩm định COA theo ISO 22000:2018 Điều khoản 7.1.6."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSupplierWorkflow}
            className="border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 flex items-center gap-1.5 font-semibold text-xs"
          >
            <GitFork className="h-4 w-4 text-purple-600" />
            <span>Quy Trình Phê Duyệt ASL (Workflow)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrintAslOpen(true)}
            className="flex items-center gap-1.5 border-primary/20 text-primary hover:bg-primary/5"
          >
            <Printer className="h-4 w-4" />
            <span>In Danh bạ ASL</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenCreateLot()}
            className="flex items-center gap-1.5"
          >
            <Boxes className="h-4 w-4 text-sky-600" />
            <span>Nhận Lô mới</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenCreateInspection()}
            className="flex items-center gap-1.5"
          >
            <FileCheck className="h-4 w-4 text-emerald-600" />
            <span>Lập Phiếu IQC</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateSupplier}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm Nhà cung cấp</span>
          </Button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card to-card/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nhà cung cấp (ASL)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {stats?.approved_suppliers ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">
              / {stats?.total_suppliers ?? 0} đối tác
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>
              {stats?.total_suppliers
                ? Math.round(
                    ((stats.approved_suppliers || 0) / stats.total_suppliers) * 100
                  )
                : 100}
              % Đạt chuẩn ISO 22000
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card to-card/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lô nguyên liệu tiếp nhận
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {stats?.total_lots_received ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">lô nhập kho</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{stats?.pending_iqc_lots ?? 0} lô đang chờ kiểm định IQC</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card to-card/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tỷ lệ đạt chuẩn IQC
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600">
              {stats?.iqc_pass_rate_percentage ?? 100}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({stats?.total_inspections ?? 0} biên bản)
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span>Đối chiếu 100% Phiếu COA đầu vào</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card to-card/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cảnh báo & Cách ly
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600">
              {(stats?.warning_suppliers ?? 0) + (stats?.rejected_inspections ?? 0)}
            </span>
            <span className="text-xs text-muted-foreground">sự vụ cần giám sát</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>{stats?.warning_suppliers ?? 0} NCC cần thẩm tra lại</span>
          </div>
        </div>
      </div>

      {/* 4 NAVIGATION TABS */}
      <div className="border-b border-border overflow-x-auto no-scrollbar pb-2">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => {
              setActiveTab("suppliers");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition-all ${
              activeTab === "suppliers"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span>Danh bạ Nhà cung cấp (ASL)</span>
            <span
              className={`ml-1 rounded-full px-1.5 py-0.5 text-[11px] ${
                activeTab === "suppliers"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {suppliers.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("lots");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition-all ${
              activeTab === "lots"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Boxes className="h-4 w-4 shrink-0" />
            <span>Lô Nguyên vật liệu (FEFO)</span>
            <span
              className={`ml-1 rounded-full px-1.5 py-0.5 text-[11px] ${
                activeTab === "lots"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {lots.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("inspections");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition-all ${
              activeTab === "inspections"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <FileCheck className="h-4 w-4 shrink-0" />
            <span>Biên bản Kiểm định (IQC)</span>
            <span
              className={`ml-1 rounded-full px-1.5 py-0.5 text-[11px] ${
                activeTab === "inspections"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {inspections.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("eval_plans");
              setPlanSearch("");
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition-all ${
              activeTab === "eval_plans"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Kế Hoạch ĐG Hàng Năm (BM02)</span>
            <span
              className={`ml-1 rounded-full px-1.5 py-0.5 text-[11px] ${
                activeTab === "eval_plans"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {evaluationPlans.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("evaluations");
              setEvalSearch("");
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition-all ${
              activeTab === "evaluations"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Award className="h-4 w-4 shrink-0" />
            <span>Phiếu Đánh Giá NCC (BM03/04)</span>
            <span
              className={`ml-1 rounded-full px-1.5 py-0.5 text-[11px] ${
                activeTab === "evaluations"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {evaluations.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("ai_coa");
              if (!coaAiResult) handleAnalyzeCoa("SEAFOOD");
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition-all ${
              activeTab === "ai_coa"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
                : "text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/30"
            }`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Trợ lý AI Thẩm định COA</span>
            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              AI Tool
            </span>
          </button>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      {activeTab !== "ai_coa" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            {activeTab === "eval_plans" ? (
              <Input
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                placeholder="Tìm kiếm mã kế hoạch, tiêu đề, phòng ban chủ trì..."
                className="pl-9"
              />
            ) : activeTab === "evaluations" ? (
              <Input
                value={evalSearch}
                onChange={(e) => setEvalSearch(e.target.value)}
                placeholder="Tìm kiếm mã phiếu ĐG, tên nhà cung cấp, chuyên viên..."
                className="pl-9"
              />
            ) : (
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === "suppliers"
                    ? "Tìm kiếm mã NCC, tên nhà cung cấp, ngành hàng..."
                    : activeTab === "lots"
                    ? "Tìm kiếm số lô, tên nguyên liệu, nhà cung cấp..."
                    : "Tìm kiếm mã phiếu IQC, số lô, người kiểm..."
                }
                className="pl-9"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "eval_plans" && (
              <Button
                onClick={openNewPlan}
                size="sm"
                className="h-9 gap-1.5 bg-primary text-primary-foreground shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Tạo Kế Hoạch BM02</span>
              </Button>
            )}

            {activeTab === "evaluations" && (
              <>
                <select
                  value={evalTypeFilter}
                  onChange={(e) => setEvalTypeFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">Tất cả bộ tiêu chí</option>
                  <option value="AGRI_FRESH">BM03 - Nông sản tươi (Biểu mẫu gốc)</option>
                  <option value="AQUA_ANIMAL_FRESH">Bộ tiêu chí bổ sung — Thủy hải sản tươi (Tự xây dựng)</option>
                  <option value="PROCESSED_DRY_PACKAGING">BM04 - Khô, phụ gia, bao bì (Biểu mẫu gốc)</option>
                </select>

                <select
                  value={evalConclusionFilter}
                  onChange={(e) => setEvalConclusionFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">Tất cả kết luận</option>
                  <option value="APPROVED">Đạt chuẩn (Phê duyệt ASL)</option>
                  <option value="CONDITIONAL">Có điều kiện (Cần khắc phục)</option>
                  <option value="DISQUALIFIED">Không đạt chuẩn (Loại bỏ)</option>
                </select>

                <Button
                  onClick={openNewEval}
                  size="sm"
                  className="h-9 gap-1.5 bg-primary text-primary-foreground shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Lập Phiếu Đánh Giá Mới</span>
                </Button>
              </>
            )}

            {activeTab !== "eval_plans" && activeTab !== "evaluations" && (
              <>
                {activeTab !== "inspections" && (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="ALL">Tất cả ngành hàng</option>
                    {SUPPLIER_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  {activeTab === "suppliers" && (
                    <>
                      <option value="APPROVED">Đạt chuẩn (ASL)</option>
                      <option value="WARNING">Cảnh báo</option>
                      <option value="SUSPENDED">Ngừng hợp tác</option>
                    </>
                  )}
                  {activeTab === "lots" && (
                    <>
                      <option value="APPROVED">Đã duyệt nhập kho</option>
                      <option value="PENDING_IQC">Chờ kiểm định IQC</option>
                      <option value="QUARANTINE">Cách ly theo dõi</option>
                      <option value="REJECTED">Từ chối / Trả hàng</option>
                    </>
                  )}
                  {activeTab === "inspections" && (
                    <>
                      <option value="PASSED">Đạt chuẩn tiếp nhận</option>
                      <option value="CONDITIONAL">Nhập có điều kiện / Cách ly</option>
                      <option value="REJECTED">Không đạt / Trả hàng</option>
                    </>
                  )}
                </select>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="h-9 px-2.5"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      )}

      {/* ==================== TAB 1: SUPPLIERS LIST ==================== */}
      {activeTab === "suppliers" && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Mã NCC</th>
                  <th className="px-4 py-3">Nhà cung cấp & Liên hệ</th>
                  <th className="px-4 py-3">Ngành hàng</th>
                  <th className="px-4 py-3">Chứng chỉ ATTP</th>
                  <th className="px-4 py-3">Điểm AI & Rủi ro</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Không tìm thấy nhà cung cấp nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((s) => {
                    const statusCfg =
                      SUPPLIER_STATUS_CONFIG[s.status] || SUPPLIER_STATUS_CONFIG.APPROVED;
                    return (
                      <tr
                        key={s.supplier_id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-primary">
                          {s.supplier_code}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {s.supplier_name}
                          </div>
                          {s.contact_info && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {s.contact_info.contact_person || s.contact_info.phone || ""}
                              {s.contact_info.email ? ` • ${s.contact_info.email}` : ""}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                            {s.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {s.certifications && s.certifications.length > 0 ? (
                              s.certifications.map((c, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300"
                                >
                                  <Award className="h-3 w-3" />
                                  {c}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                Chưa cập nhật
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  s.rating_score >= 85
                                    ? "bg-emerald-500"
                                    : s.rating_score >= 70
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, s.rating_score))}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs font-bold">
                              {s.rating_score}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            Rủi ro:{" "}
                            <span
                              className={`font-semibold ${
                                s.risk_level === "HIGH"
                                  ? "text-rose-600"
                                  : s.risk_level === "MEDIUM"
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }`}
                            >
                              {s.risk_level === "HIGH"
                                ? "Cao"
                                : s.risk_level === "MEDIUM"
                                ? "Trung bình"
                                : "Thấp"}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}
                          >
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Xem chi tiết & Lô hàng"
                              onClick={() => setViewingSupplier(s)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title="Đánh giá bằng Form Động (BM-NCC-01)"
                              onClick={() => handleOpenVendorDynamicForm(s)}
                              className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            >
                              <Sliders className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title="AI Đánh giá lại rủi ro"
                              onClick={() => handleAiEvaluateSupplier(s)}
                              className="h-8 w-8 p-0 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title="Chỉnh sửa"
                              onClick={() => handleOpenEditSupplier(s)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title="Xóa"
                              onClick={() =>
                                setDeletingSupplierItem({ id: s.supplier_id, name: s.supplier_name })
                              }
                              className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* ==================== TAB 2: MATERIAL LOTS LIST ==================== */}
      {activeTab === "lots" && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Số Lô (Lot No.)</th>
                  <th className="px-4 py-3">Tên Nguyên liệu</th>
                  <th className="px-4 py-3">Nhà cung cấp</th>
                  <th className="px-4 py-3">Ngày nhận & Hạn dùng (FEFO)</th>
                  <th className="px-4 py-3">Số lượng</th>
                  <th className="px-4 py-3">Bảo quản & COA</th>
                  <th className="px-4 py-3">Trạng thái IQC</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLots.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Không tìm thấy lô nguyên liệu nào.
                    </td>
                  </tr>
                ) : (
                  filteredLots.map((lot) => {
                    const statusCfg =
                      LOT_STATUS_CONFIG[lot.status] || LOT_STATUS_CONFIG.PENDING_IQC;
                    return (
                      <tr
                        key={lot.material_lot_id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-primary">
                          {lot.lot_number}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {lot.material_name}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {lot.material_category || "Nguyên liệu"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {lot.supplier_name || "Chưa gán NCC"}
                          </div>
                          {lot.supplier_code && (
                            <span className="font-mono text-xs text-muted-foreground">
                              {lot.supplier_code}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-foreground">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Nhận: {lot.received_date}</span>
                          </div>
                          {lot.exp_date && (
                            <div className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                              HSD: {lot.exp_date}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-medium">
                          {lot.quantity.toLocaleString("vi-VN")} {lot.unit}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-muted-foreground">
                            {lot.storage_condition}
                          </div>
                          {lot.coa_file_url ? (
                            <a
                              href={lot.coa_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                            >
                              <FileText className="h-3 w-3" />
                              <span>Phiếu COA</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              Chưa đính kèm COA
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}
                          >
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              title="Nghiệm thu IQC bằng Form Động (FORM-IQC-01)"
                              onClick={() => handleOpenIqcDynamicForm(lot)}
                              className="h-8 gap-1 border-sky-500/30 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300 font-semibold text-xs"
                            >
                              <Sliders className="h-3.5 w-3.5" />
                              <span>Form IQC</span>
                            </Button>

                            {lot.status === "PENDING_IQC" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCreateInspection(lot)}
                                className="h-8 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                              >
                                <FileCheck className="h-3.5 w-3.5" />
                                <span>IQC</span>
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              title="Xem chi tiết"
                              onClick={() => setViewingLot(lot)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title="Chỉnh sửa"
                              onClick={() => handleOpenEditLot(lot)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title="Xóa lô"
                              onClick={() =>
                                setDeletingLotItem({
                                  id: lot.material_lot_id,
                                  code: lot.lot_number,
                                })
                              }
                              className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* ==================== TAB 3: IQC INSPECTIONS LIST ==================== */}
      {activeTab === "inspections" && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Mã phiếu IQC</th>
                  <th className="px-4 py-3">Lô & Nguyên liệu</th>
                  <th className="px-4 py-3">Nhà cung cấp</th>
                  <th className="px-4 py-3">Chỉ tiêu kiểm tra nhanh</th>
                  <th className="px-4 py-3">Nhiệt độ / Độ ẩm</th>
                  <th className="px-4 py-3">Kết luận IQC</th>
                  <th className="px-4 py-3">Người kiểm & Ngày</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredInspections.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Không tìm thấy biên bản kiểm tra IQC nào.
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((insp) => {
                    const statusCfg =
                      IQC_STATUS_CONFIG[insp.status] || IQC_STATUS_CONFIG.PASSED;
                    const StatusIcon = statusCfg.icon;
                    return (
                      <tr
                        key={insp.inspection_id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-primary">
                          {insp.inspection_code}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">
                            {insp.material_name || "Nguyên liệu"}
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">
                            Lô: {insp.lot_number}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {insp.supplier_name || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                insp.sensory_check
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "bg-rose-500/10 text-rose-700"
                              }`}
                            >
                              Cảm quan: {insp.sensory_check ? "Đạt" : "Không đạt"}
                            </span>
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                insp.packaging_check
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "bg-rose-500/10 text-rose-700"
                              }`}
                            >
                              Bao bì: {insp.packaging_check ? "Đạt" : "Hỏng"}
                            </span>
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                insp.coa_compliance
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "bg-rose-500/10 text-rose-700"
                              }`}
                            >
                              COA: {insp.coa_compliance ? "Khớp" : "Lệch"}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {insp.temperature_c !== null && insp.temperature_c !== undefined && (
                            <div className="flex items-center gap-1 text-xs text-foreground">
                              <Thermometer className="h-3 w-3 text-sky-600" />
                              <span>{insp.temperature_c} °C</span>
                            </div>
                          )}
                          {insp.moisture_content !== null && insp.moisture_content !== undefined && insp.moisture_content > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Droplets className="h-3 w-3 text-blue-500" />
                              <span>Độ ẩm: {insp.moisture_content}%</span>
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="text-xs font-medium text-foreground">
                            {insp.inspector_name || "QC Inspector"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {insp.inspected_at
                              ? new Date(insp.inspected_at).toLocaleDateString("vi-VN")
                              : ""}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="In Phiếu Kiểm nghiệm IQC"
                              onClick={() => {
                                setViewingInspection(insp);
                                setIsPrintIqcOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title="Xem chi tiết"
                              onClick={() => setViewingInspection(insp)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title="Chỉnh sửa"
                              onClick={() => handleOpenEditInspection(insp)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title="Xóa biên bản"
                              onClick={() =>
                                setDeletingInspectionItem({
                                  id: insp.inspection_id,
                                  code: insp.inspection_code,
                                })
                              }
                              className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* ==================== TAB 4: AI COA SMART INSPECTOR ==================== */}
      {activeTab === "ai_coa" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-card to-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Trợ lý AI Thẩm định Phiếu Kiểm nghiệm COA (Certificate of Analysis)</span>
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  Tự động Đối chiếu Chỉ tiêu COA theo Quy chuẩn QCVN & ISO 22000:2018
                </h3>
                <p className="text-xs text-muted-foreground max-w-3xl">
                  AI phân tích các thông số vi sinh vật (Salmonella, E.coli), độc tố vi nấm (Aflatoxin), kim loại nặng (Chì, Cadmi, Thủy ngân), độ ẩm và nhãn dị nguyên để đưa ra kết luận chấp nhận/từ chối ngay tức thì.
                </p>
              </div>

              {coaAiResult && (
                <Button
                  onClick={handleApplyCoaToInspection}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:from-purple-700 hover:to-indigo-700"
                >
                  <FileCheck className="h-4 w-4" />
                  <span>Áp dụng vào Biên bản IQC</span>
                </Button>
              )}
            </div>

            {/* Template Buttons */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-purple-500/10 pt-4">
              <span className="text-xs font-semibold text-muted-foreground mr-1">
                Mẫu nguyên liệu thử nghiệm:
              </span>
              {AI_COA_TEMPLATES.map((tmpl) => (
                <Button
                  key={tmpl.type}
                  variant={selectedCoaTemplate === tmpl.type ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAnalyzeCoa(tmpl.type)}
                  disabled={isCoaAnalyzing}
                  className={`text-xs ${
                    selectedCoaTemplate === tmpl.type
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950/30"
                  }`}
                >
                  {tmpl.title.split("(")[0]}
                </Button>
              ))}
            </div>
          </div>

          {/* AI Result Card */}
          {coaAiResult && (
            <div className="space-y-6">
              {/* Summary Banner */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-xs font-medium text-muted-foreground">
                    Nguyên liệu phân tích
                  </div>
                  <div className="mt-1 font-bold text-foreground">
                    {coaAiResult.material_name}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Quy chuẩn:{" "}
                    <span className="font-semibold text-primary">
                      {coaAiResult.iso_standard_reference}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-xs font-medium text-muted-foreground">
                    Kết luận Thẩm định AI
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${
                        coaAiResult.overall_status === "PASSED"
                          ? "bg-emerald-500/10 border-emerald-300 text-emerald-700 dark:text-emerald-300"
                          : coaAiResult.overall_status === "REVIEW_REQUIRED"
                          ? "bg-amber-500/10 border-amber-300 text-amber-700 dark:text-amber-300"
                          : "bg-rose-500/10 border-rose-300 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {coaAiResult.overall_status === "PASSED" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ĐẠT TIÊU CHUẨN TIẾP NHẬN
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          CẦN XEM XÉT / CÁCH LY
                        </>
                      )}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Độ tin cậy AI:{" "}
                    <span className="font-bold text-emerald-600">
                      {coaAiResult.confidence_score}%
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="text-xs font-medium text-muted-foreground">
                    Đề xuất Hành động KCS
                  </div>
                  <div className="mt-1 text-xs font-medium text-foreground">
                    {coaAiResult.recommended_actions?.[0] || "Lưu hồ sơ kiểm soát."}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground italic">
                    {coaAiResult.summary}
                  </div>
                </div>
              </div>

              {/* Detailed Parameter Table */}
              <div className="rounded-xl border border-border bg-card shadow-sm">
                <div className="border-b border-border bg-muted/40 px-4 py-3">
                  <h4 className="font-semibold text-foreground text-sm">
                    Bảng Đối chiếu Chi tiết Từng Chỉ tiêu Kiểm nghiệm COA
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Chỉ tiêu kiểm nghiệm</th>
                        <th className="px-4 py-3">Giá trị trên COA NCC</th>
                        <th className="px-4 py-3">Giới hạn Quy chuẩn (QCVN/Codex)</th>
                        <th className="px-4 py-3">Đánh giá</th>
                        <th className="px-4 py-3">Ghi chú & Rủi ro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {coaAiResult.parameters.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium text-foreground">
                            {p.name}
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-primary">
                            {p.tested_value}
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground text-xs">
                            {p.standard_limit}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                p.risk_level === "SAFE"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : p.risk_level === "WARNING"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                              }`}
                            >
                              {p.is_compliant ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              {p.risk_level === "SAFE"
                                ? "Đạt"
                                : p.risk_level === "WARNING"
                                ? "Cảnh báo"
                                : "Vi phạm"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {p.notes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 4: EVALUATION PLANS (BM02-KHĐGNCC) ==================== */}
      {activeTab === "eval_plans" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/20">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Kế Hoạch Đánh Giá Năng Lực Nhà Cung Cấp Hàng Năm (BM02-KHĐGNCC)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Quy định lập lịch định kỳ và đột xuất đánh giá nhà cung ứng theo ISO 22000:2018 Điều khoản 7.1.6
                </p>
              </div>
              <Button
                onClick={openNewPlan}
                size="sm"
                className="gap-1.5 bg-primary text-primary-foreground text-xs shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm Kế Hoạch Năm</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Mã Kế Hoạch</th>
                    <th className="px-4 py-3">Năm & Tiêu Đề</th>
                    <th className="px-4 py-3">Phòng Ban Chủ Trì</th>
                    <th className="px-4 py-3">Phạm Vi Đánh Giá</th>
                    <th className="px-4 py-3">Số NCC Đã ĐG</th>
                    <th className="px-4 py-3">Trạng Thái Phê Duyệt</th>
                    <th className="px-4 py-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPlans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Calendar className="h-8 w-8 text-muted-foreground/50" />
                          <p className="text-sm">Không tìm thấy kế hoạch đánh giá nào phù hợp.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={openNewPlan}
                            className="mt-2 text-xs"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Lập Kế Hoạch BM02 Đầu Tiên
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPlans.map((plan) => {
                      const countEvals = evaluations.filter((e) => e.plan_id === plan.id).length;
                      return (
                        <tr key={plan.id} className="transition-colors hover:bg-muted/30">
                          <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-primary">
                            {plan.plan_code}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{plan.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Năm thực hiện: <span className="font-semibold">{plan.year}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {plan.department}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                            {plan.scope || "Toàn bộ nhà cung cấp trong danh bạ ASL"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                              {countEvals} đánh giá
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {plan.approval_status === "APPROVED" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                Đã phê duyệt ({plan.approved_by || "BGĐ"})
                              </span>
                            ) : plan.approval_status === "PENDING" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                <Clock className="h-3 w-3" />
                                Chờ duyệt
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                                <XCircle className="h-3 w-3" />
                                Từ chối
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePrintEvaluationPlan(plan)}
                                title="In Kế Hoạch ĐG (BM02-KHĐGNCC)"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditPlan(plan)}
                                title="Chỉnh sửa Kế Hoạch"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingPlanItem({ id: plan.id, code: plan.plan_code })}
                                title="Xóa Kế Hoạch"
                                className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 className="h-4 w-4" />
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
        </div>
      )}

      {/* ==================== TAB 5: SUPPLIER EVALUATIONS (BM03 / BM03-TS / BM04) ==================== */}
      {activeTab === "evaluations" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/20">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600" />
                  Hồ Sơ Đánh Giá Năng Lực Nhà Cung Ứng (BM03, TC Bổ Sung TS, BM04)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Thang điểm 100 điểm: Nông sản tươi (BM03 gốc), Thủy hải sản tươi (Bộ tiêu chí bổ sung do dự án tự xây dựng), Khô/Bao bì (BM04 gốc)
                </p>
              </div>
              <Button
                onClick={openNewEval}
                size="sm"
                className="gap-1.5 bg-primary text-primary-foreground text-xs shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Lập Phiếu Đánh Giá Mới</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Mã Phiếu & Ngày</th>
                    <th className="px-4 py-3">Nhà Cung Cấp</th>
                    <th className="px-4 py-3">Bộ Tiêu Chí (Biểu Mẫu)</th>
                    <th className="px-4 py-3">Hình Thức ĐG</th>
                    <th className="px-4 py-3">Điểm / Hạng</th>
                    <th className="px-4 py-3">Kết Luận Phê Duyệt</th>
                    <th className="px-4 py-3">Chuyên Viên ĐG</th>
                    <th className="px-4 py-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredEvaluations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Award className="h-8 w-8 text-muted-foreground/50" />
                          <p className="text-sm">Không tìm thấy biên bản đánh giá nhà cung cấp nào.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={openNewEval}
                            className="mt-2 text-xs"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Lập Phiếu Đánh Giá Đầu Tiên
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEvaluations.map((ev) => {
                      const criteriaBadge =
                        ev.criteria_type === "AGRI_FRESH"
                          ? { label: "BM03: Nông sản tươi", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" }
                          : ev.criteria_type === "AQUA_ANIMAL_FRESH"
                          ? { label: "TC Bổ sung: Thủy sản tươi", color: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20" }
                          : { label: "BM04: Khô, phụ gia, bao bì", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20" };

                      const conclusionBadge =
                        ev.conclusion === "APPROVED"
                          ? { label: "ĐẠT CHUẨN (ASL)", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" }
                          : ev.conclusion === "CONDITIONAL"
                          ? { label: "CÓ ĐIỀU KIỆN", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300" }
                          : { label: "KHÔNG ĐẠT (LOẠI)", color: "bg-rose-500/10 text-rose-700 dark:text-rose-300" };

                      return (
                        <tr key={ev.id} className="transition-colors hover:bg-muted/30">
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="font-mono font-medium text-primary">{ev.evaluation_code}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{ev.evaluation_date}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{ev.supplier_name}</div>
                            <div className="font-mono text-xs text-muted-foreground">{ev.supplier_code}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${criteriaBadge.color}`}>
                              {criteriaBadge.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                            {ev.audit_type === "ON_SITE"
                              ? "Hiện trường (On-site)"
                              : ev.audit_type === "DESK_AUDIT"
                              ? "Hồ sơ (Desk)"
                              : "Bên thứ ba"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-foreground">{ev.total_score}</span>
                              <span className="text-xs text-muted-foreground">/ 100</span>
                              <span
                                className={`ml-1 rounded px-1.5 py-0.5 text-xs font-bold ${
                                  ev.grade === "A"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : ev.grade === "B"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                    : ev.grade === "C"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                    : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                }`}
                              >
                                Hạng {ev.grade}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${conclusionBadge.color}`}>
                              {ev.conclusion === "APPROVED" ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : ev.conclusion === "CONDITIONAL" ? (
                                <AlertTriangle className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              {conclusionBadge.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                            <div>{ev.evaluator_name}</div>
                            {ev.approved_by && (
                              <div className="text-[11px] text-muted-foreground/80">Duyệt: {ev.approved_by}</div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePrintEvaluation(ev)}
                                title="In Phiếu ĐG (BM03/04)"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditEval(ev)}
                                title="Chỉnh sửa Phiếu ĐG"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingEvalItem({ id: ev.id, code: ev.evaluation_code })}
                                title="Xóa Phiếu ĐG"
                                className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 className="h-4 w-4" />
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
        </div>
      )}
      <Dialog open={isCreateSupplierOpen} onOpenChange={setIsCreateSupplierOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier
                ? `Chỉnh sửa Nhà cung cấp: ${editingSupplier.supplier_code}`
                : "Thêm mới Nhà cung cấp vào Danh bạ (ASL)"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSupplier} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Mã Nhà cung cấp *</Label>
                <Input
                  value={supplierForm.supplier_code}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, supplier_code: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Phân loại Ngành hàng *</Label>
                <select
                  value={supplierForm.category}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, category: e.target.value })
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {SUPPLIER_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tên đầy đủ Doanh nghiệp / Nhà cung cấp *</Label>
              <Input
                value={supplierForm.supplier_name}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, supplier_name: e.target.value })
                }
                placeholder="VD: Công ty Cổ phần Thủy sản Biển Đông"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Người liên hệ</Label>
                <Input
                  value={supplierForm.contact_person}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, contact_person: e.target.value })
                  }
                  placeholder="Họ tên đại diện"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Số điện thoại</Label>
                <Input
                  value={supplierForm.phone}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, phone: e.target.value })
                  }
                  placeholder="0912.xxx.xxx"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email liên hệ</Label>
                <Input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, email: e.target.value })
                  }
                  placeholder="ncc@domain.vn"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Địa chỉ nhà máy / Kho hàng</Label>
                <Input
                  value={supplierForm.address}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, address: e.target.value })
                  }
                  placeholder="Khu công nghiệp / Địa chỉ..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mã số thuế</Label>
                <Input
                  value={supplierForm.tax_code}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, tax_code: e.target.value })
                  }
                  placeholder="Mã số thuế doanh nghiệp"
                />
              </div>
            </div>

            {/* Certifications Checkboxes */}
            <div className="space-y-2">
              <Label>Chứng chỉ An toàn Thực phẩm sở hữu</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CERTIFICATION_OPTIONS.map((cert) => {
                  const isChecked = supplierForm.certifications.includes(cert);
                  return (
                    <label
                      key={cert}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs font-medium transition-colors ${
                        isChecked
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSupplierForm({
                              ...supplierForm,
                              certifications: [...supplierForm.certifications, cert],
                            });
                          } else {
                            setSupplierForm({
                              ...supplierForm,
                              certifications: supplierForm.certifications.filter(
                                (c) => c !== cert
                              ),
                            });
                          }
                        }}
                        className="rounded border-input"
                      />
                      <span>{cert}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Điểm đánh giá ban đầu (0 - 100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={supplierForm.rating_score}
                  onChange={(e) =>
                    setSupplierForm({
                      ...supplierForm,
                      rating_score: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <select
                  value={supplierForm.status}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, status: e.target.value })
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="APPROVED">Đạt chuẩn (APPROVED)</option>
                  <option value="WARNING">Cảnh báo (WARNING)</option>
                  <option value="SUSPENDED">Ngừng hợp tác (SUSPENDED)</option>
                  <option value="PENDING_EVALUATION">Chờ đánh giá</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Mức độ rủi ro</Label>
                <select
                  value={supplierForm.risk_level}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, risk_level: e.target.value })
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="LOW">Thấp (LOW)</option>
                  <option value="MEDIUM">Trung bình (MEDIUM)</option>
                  <option value="HIGH">Cao (HIGH)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Ghi chú thẩm tra năng lực</Label>
              <textarea
                value={supplierForm.evaluation_notes}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, evaluation_notes: e.target.value })
                }
                rows={2}
                className="w-full rounded-md border border-input bg-background p-2 text-sm"
                placeholder="Ghi nhận hồ sơ năng lực, kết quả audit thực tế tại xưởng NCC..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateSupplierOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button type="submit">
                {editingSupplier ? "Lưu thay đổi" : "Lưu vào Danh bạ ASL"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: CREATE/EDIT MATERIAL LOT ==================== */}
      <Dialog open={isCreateLotOpen} onOpenChange={setIsCreateLotOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLot
                ? `Cập nhật Lô nguyên liệu: ${editingLot.lot_number}`
                : "Tiếp nhận Lô Nguyên vật liệu mới vào Kho"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveLot} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Mã số Lô (Lot Number) *</Label>
                <Input
                  value={lotForm.lot_number}
                  onChange={(e) =>
                    setLotForm({ ...lotForm, lot_number: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Nhà cung cấp xuất hàng *</Label>
                <select
                  value={lotForm.supplier_id}
                  onChange={(e) =>
                    setLotForm({ ...lotForm, supplier_id: e.target.value })
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  <option value="">-- Chọn Nhà cung cấp --</option>
                  {suppliers.map((s) => (
                    <option key={s.supplier_id} value={s.supplier_id}>
                      [{s.supplier_code}] {s.supplier_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tên Nguyên vật liệu tiếp nhận *</Label>
                <Input
                  value={lotForm.material_name}
                  onChange={(e) =>
                    setLotForm({ ...lotForm, material_name: e.target.value })
                  }
                  placeholder="VD: Cá ngừ fillet đông lạnh, Bột mì..."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Phân loại</Label>
                <select
                  value={lotForm.material_category}
                  onChange={(e) =>
                    setLotForm({ ...lotForm, material_category: e.target.value })
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {SUPPLIER_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Ngày tiếp nhận *</Label>
                <Input
                  type="date"
                  value={lotForm.received_date}
                  onChange={(e) =>
                    setLotForm({ ...lotForm, received_date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ngày sản xuất (MFG)</Label>
                <Input
                  type="date"
                  value={lotForm.mfg_date}
                  onChange={(e) =>
                    setLotForm({ ...lotForm, mfg_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hạn sử dụng (EXP - FEFO)</Label>
                <Input
                  type="date"
                  value={lotForm.exp_date}
                  onChange={(e) =>
                    setLotForm({ ...lotForm, exp_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Số lượng tiếp nhận *</Label>
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={lotForm.quantity}
                  onChange={(e) =>
                    setLotForm({ ...lotForm, quantity: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Đơn vị tính *</Label>
                <Input
                  value={lotForm.unit}
                  onChange={(e) =>
                    setLotForm({ ...lotForm, unit: e.target.value })
                  }
                  placeholder="kg, tấn, lít, bao..."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Điều kiện bảo quản</Label>
                <select
                  value={lotForm.storage_condition}
                  onChange={(e) =>
                    setLotForm({ ...lotForm, storage_condition: e.target.value })
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {STORAGE_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Link Tệp Phiếu Kiểm nghiệm COA đính kèm</Label>
              <Input
                value={lotForm.coa_file_url}
                onChange={(e) =>
                  setLotForm({ ...lotForm, coa_file_url: e.target.value })
                }
                placeholder="https://iso22000.wcert.vn/coa/COA-xxxx.pdf"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateLotOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button type="submit">
                {editingLot ? "Lưu thay đổi" : "Lưu Lô Nguyên liệu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: CREATE/EDIT IQC INSPECTION ==================== */}
      <Dialog open={isCreateInspectionOpen} onOpenChange={setIsCreateInspectionOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingInspection
                ? `Cập nhật Biên bản IQC: ${editingInspection.inspection_code}`
                : "Lập Biên bản Kiểm định Tiếp nhận Nguyên liệu (IQC Sheet)"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveInspection} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Mã Biên bản IQC *</Label>
                <Input
                  value={inspectionForm.inspection_code}
                  onChange={(e) =>
                    setInspectionForm({
                      ...inspectionForm,
                      inspection_code: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Chọn Lô nguyên liệu cần kiểm định *</Label>
                <select
                  value={inspectionForm.material_lot_id}
                  onChange={(e) =>
                    setInspectionForm({
                      ...inspectionForm,
                      material_lot_id: e.target.value,
                    })
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  <option value="">-- Chọn Lô nguyên liệu --</option>
                  {lots.map((l) => (
                    <option key={l.material_lot_id} value={l.material_lot_id}>
                      [{l.lot_number}] {l.material_name} ({l.supplier_name || "N/A"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checklist Tiêu chuẩn ISO 22000 */}
            <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">
                Checklist Kiểm tra Chất lượng Tiếp nhận (IQC Checklist)
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={inspectionForm.sensory_check}
                    onChange={(e) =>
                      setInspectionForm({
                        ...inspectionForm,
                        sensory_check: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span>1. Cảm quan (Màu, Mùi, Vị, Trạng thái)</span>
                </label>

                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={inspectionForm.packaging_check}
                    onChange={(e) =>
                      setInspectionForm({
                        ...inspectionForm,
                        packaging_check: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span>2. Ngoại quan Bao bì & Tem nhãn nguyên vẹn</span>
                </label>

                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={inspectionForm.coa_compliance}
                    onChange={(e) =>
                      setInspectionForm({
                        ...inspectionForm,
                        coa_compliance: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span>3. Đối chiếu Phiếu COA của NCC Đạt</span>
                </label>

                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={inspectionForm.mycotoxin_check}
                    onChange={(e) =>
                      setInspectionForm({
                        ...inspectionForm,
                        mycotoxin_check: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span>4. Kiểm soát Độc tố Vi nấm (Aflatoxin)</span>
                </label>

                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={inspectionForm.allergen_check}
                    onChange={(e) =>
                      setInspectionForm({
                        ...inspectionForm,
                        allergen_check: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span>5. Dán nhãn Cảnh báo Dị nguyên (Allergen)</span>
                </label>

                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={inspectionForm.size_uniformity_check}
                    onChange={(e) =>
                      setInspectionForm({
                        ...inspectionForm,
                        size_uniformity_check: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span>6. Quy cách cỡ / kích thước / trọng lượng chuẩn</span>
                </label>

                <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={inspectionForm.vehicle_cleanliness_check}
                    onChange={(e) =>
                      setInspectionForm({
                        ...inspectionForm,
                        vehicle_cleanliness_check: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span>7. Vệ sinh thùng xe giao hàng (Sạch sẽ, không mùi lạ, bạt che kín)</span>
                </label>
              </div>
            </div>

            {/* Chỉ tiêu Định lượng & Phương tiện giao hàng */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Nhiệt độ xe nhận (°C)</Label>
                <Input
                  type="number"
                  step={0.1}
                  value={inspectionForm.temperature_c}
                  onChange={(e) =>
                    setInspectionForm({
                      ...inspectionForm,
                      temperature_c: Number(e.target.value),
                    })
                  }
                  placeholder="VD: -19.5"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Độ ẩm đo được (%)</Label>
                <Input
                  type="number"
                  step={0.1}
                  value={inspectionForm.moisture_content}
                  onChange={(e) =>
                    setInspectionForm({
                      ...inspectionForm,
                      moisture_content: Number(e.target.value),
                    })
                  }
                  placeholder="VD: 13.1"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tỷ lệ hư hỏng / dập nát / úa (%)</Label>
                <Input
                  type="number"
                  step={0.1}
                  min={0}
                  max={100}
                  value={inspectionForm.defect_rate_percent}
                  onChange={(e) =>
                    setInspectionForm({
                      ...inspectionForm,
                      defect_rate_percent: Number(e.target.value),
                    })
                  }
                  placeholder="Chuẩn ≤ 2.0%"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tạp chất vật lý lạ (%)</Label>
                <Input
                  type="number"
                  step={0.01}
                  min={0}
                  max={100}
                  value={inspectionForm.impurity_percent}
                  onChange={(e) =>
                    setInspectionForm({
                      ...inspectionForm,
                      impurity_percent: Number(e.target.value),
                    })
                  }
                  placeholder="Chuẩn ≤ 0.1%"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Biển số xe giao hàng</Label>
                <Input
                  value={inspectionForm.delivery_vehicle_plate}
                  onChange={(e) =>
                    setInspectionForm({
                      ...inspectionForm,
                      delivery_vehicle_plate: e.target.value,
                    })
                  }
                  placeholder="VD: 67C-128.45"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tên tài xế giao nhận</Label>
                <Input
                  value={inspectionForm.driver_name}
                  onChange={(e) =>
                    setInspectionForm({
                      ...inspectionForm,
                      driver_name: e.target.value,
                    })
                  }
                  placeholder="VD: Nguyễn Văn Tuấn"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <Label>Kết luận Kiểm định IQC *</Label>
                <select
                  value={inspectionForm.status}
                  onChange={(e) =>
                    setInspectionForm({ ...inspectionForm, status: e.target.value })
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm font-semibold"
                >
                  <option value="PASSED">ĐẠT CHUẨN (PASSED) — Chấp nhận nhập kho</option>
                  <option value="CONDITIONAL">CÁCH LY / CÓ ĐIỀU KIỆN — Tạm giữ chờ thẩm định thêm</option>
                  <option value="REJECTED">TỪ CHỐI / TRẢ HÀNG (REJECTED) — Vi phạm tiêu chuẩn ATTP</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Ghi chú chi tiết kết quả kiểm định & Hành động xử lý</Label>
              <textarea
                value={inspectionForm.notes}
                onChange={(e) =>
                  setInspectionForm({ ...inspectionForm, notes: e.target.value })
                }
                rows={3}
                className="w-full rounded-md border border-input bg-background p-2 text-sm"
                placeholder="Ghi nhận các thông số kiểm tra, tình trạng xe giao hàng, lý do cách ly hoặc chấp nhận..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateInspectionOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                {editingInspection ? "Lưu thay đổi" : "Lập Biên bản & Cập nhật Lô"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: VIEW SUPPLIER DETAILS ==================== */}
      <Dialog
        open={!!viewingSupplier}
        onOpenChange={(open) => !open && setViewingSupplier(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewingSupplier && (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span>Hồ sơ Nhà cung cấp: {viewingSupplier.supplier_name}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 rounded-xl border border-border/80 bg-muted/20 p-4">
                <div>
                  <div className="text-xs text-muted-foreground">Mã NCC</div>
                  <div className="font-mono font-bold text-primary">
                    {viewingSupplier.supplier_code}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Ngành hàng</div>
                  <div className="font-semibold text-foreground">
                    {viewingSupplier.category}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Điểm AI Rating</div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">
                      {viewingSupplier.rating_score} / 100
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        viewingSupplier.risk_level === "HIGH"
                          ? "text-rose-600"
                          : viewingSupplier.risk_level === "MEDIUM"
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      (Rủi ro {viewingSupplier.risk_level})
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Trạng thái ASL</div>
                  <div className="font-semibold text-emerald-600">
                    {viewingSupplier.status}
                  </div>
                </div>
              </div>

              {/* Contact Card */}
              {viewingSupplier.contact_info && (
                <div className="space-y-2 rounded-xl border border-border p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Thông tin Liên hệ & Pháp lý
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Người đại diện:</span>{" "}
                      <b>{viewingSupplier.contact_info.contact_person || "N/A"}</b>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Điện thoại:</span>{" "}
                      <b>{viewingSupplier.contact_info.phone || "N/A"}</b>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>{" "}
                      <b>{viewingSupplier.contact_info.email || "N/A"}</b>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mã số thuế:</span>{" "}
                      <b>{viewingSupplier.contact_info.tax_code || "N/A"}</b>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Địa chỉ xưởng:</span>{" "}
                      <b>{viewingSupplier.contact_info.address || "N/A"}</b>
                    </div>
                  </div>
                </div>
              )}

              {/* Certifications */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Chứng chỉ An toàn Thực phẩm
                </div>
                <div className="flex flex-wrap gap-2">
                  {viewingSupplier.certifications?.map((c, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                    >
                      <Award className="h-3.5 w-3.5" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {viewingSupplier.evaluation_notes && (
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  <b>Ghi chú đánh giá:</b> {viewingSupplier.evaluation_notes}
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleAiEvaluateSupplier(viewingSupplier)}
                  className="gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>AI Đánh giá lại</span>
                </Button>
                <Button onClick={() => setViewingSupplier(null)}>Đóng</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: VIEW LOT DETAILS ==================== */}
      <Dialog open={!!viewingLot} onOpenChange={(open) => !open && setViewingLot(null)}>
        <DialogContent className="max-w-lg">
          {viewingLot && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-sky-600" />
                  <span>Chi tiết Lô nguyên liệu: {viewingLot.lot_number}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Nguyên liệu:</span>
                    <div className="font-bold text-foreground">
                      {viewingLot.material_name}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Nhà cung cấp:</span>
                    <div className="font-semibold text-foreground">
                      {viewingLot.supplier_name || "N/A"}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Số lượng:</span>
                    <div className="font-mono font-bold text-foreground">
                      {viewingLot.quantity.toLocaleString("vi-VN")} {viewingLot.unit}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Bảo quản:</span>
                    <div className="font-semibold text-foreground">
                      {viewingLot.storage_condition}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Ngày tiếp nhận:</span>{" "}
                    <b>{viewingLot.received_date}</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hạn sử dụng:</span>{" "}
                    <b className="text-amber-600">{viewingLot.exp_date || "N/A"}</b>
                  </div>
                </div>

                {viewingLot.coa_file_url && (
                  <div className="rounded border border-primary/20 bg-primary/5 p-2 text-xs flex items-center justify-between">
                    <span className="font-medium text-primary">
                      Phiếu kiểm nghiệm COA:
                    </span>
                    <a
                      href={viewingLot.coa_file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                    >
                      <span>Mở tệp</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => setViewingLot(null)}>Đóng</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: PRINT IQC INSPECTION SHEET ==================== */}
      <Dialog open={isPrintIqcOpen} onOpenChange={setIsPrintIqcOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewingInspection && (
            <div className="space-y-6 print:p-6" id="iqc-print-area">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-primary pb-4">
                <div className="flex items-center gap-3">
                  <img src={logoImg} alt="WCERT" className="h-10 w-auto" />
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM ISO 22000:2018
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Biểu mẫu BM-IQC-01 • Ban Quản lý Chất lượng & ATTP
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs font-bold text-primary">
                  {viewingInspection.inspection_code}
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-xl font-bold uppercase tracking-wider text-foreground">
                  BIÊN BẢN KIỂM TRA & NGHIỆM THU CHẤT LƯỢNG TIẾP NHẬN (IQC)
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Căn cứ Quy trình Tiếp nhận & Kiểm soát Nguyên vật liệu Đầu vào (SOP-IQC-03)
                </p>
              </div>

              {/* Thông tin Lô hàng & Phương tiện giao nhận */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Tên nguyên vật liệu:</span>{" "}
                  <b className="text-foreground">{viewingInspection.material_name}</b>
                </div>
                <div>
                  <span className="text-muted-foreground">Số Lô (Lot Number):</span>{" "}
                  <b className="font-mono text-foreground">{viewingInspection.lot_number}</b>
                </div>
                <div>
                  <span className="text-muted-foreground">Nhà cung cấp:</span>{" "}
                  <b className="text-foreground">{viewingInspection.supplier_name}</b>
                </div>
                <div>
                  <span className="text-muted-foreground">Biển số xe giao:</span>{" "}
                  <b className="font-mono text-foreground">{viewingInspection.delivery_vehicle_plate || "Xe giao tại xưởng"}</b>
                </div>
                <div>
                  <span className="text-muted-foreground">Tài xế giao nhận:</span>{" "}
                  <b className="text-foreground">{viewingInspection.driver_name || "N/A"}</b>
                </div>
                <div>
                  <span className="text-muted-foreground">Thời gian kiểm tra:</span>{" "}
                  <b className="text-foreground">
                    {viewingInspection.inspected_at
                      ? new Date(viewingInspection.inspected_at).toLocaleString("vi-VN")
                      : ""}
                  </b>
                </div>
              </div>

              {/* Bảng Chỉ tiêu Nghiệm thu BM01-KTNL Thực Tế */}
              <div className="rounded border border-border overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted/60 font-semibold uppercase">
                    <tr>
                      <th className="p-2">Hạng mục kiểm tra</th>
                      <th className="p-2">Tiêu chuẩn nghiệm thu ISO 22000</th>
                      <th className="p-2">Kết quả thực tế</th>
                      <th className="p-2">Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="p-2 font-medium">1. Cảm quan & Ngoại quan</td>
                      <td className="p-2">Màu sắc, mùi vị đặc trưng tự nhiên, không ươn thối/mốc</td>
                      <td className="p-2 font-semibold">
                        {viewingInspection.sensory_check ? "Đạt cảm quan chuẩn" : "Không đạt cảm quan"}
                      </td>
                      <td className={`p-2 font-bold ${viewingInspection.sensory_check ? "text-emerald-600" : "text-rose-600"}`}>
                        {viewingInspection.sensory_check ? "ĐẠT" : "K.ĐẠT"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">2. Quy cách bao bì & Tem nhãn</td>
                      <td className="p-2">Nguyên vẹn, không rách vỡ, có nhãn mác, NSX & HSD rõ ràng</td>
                      <td className="p-2 font-semibold">
                        {viewingInspection.packaging_check ? "Bao bì nguyên vẹn" : "Rách hỏng / Mất nhãn"}
                      </td>
                      <td className={`p-2 font-bold ${viewingInspection.packaging_check ? "text-emerald-600" : "text-rose-600"}`}>
                        {viewingInspection.packaging_check ? "ĐẠT" : "K.ĐẠT"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">3. Quy cách cỡ & Kích thước đồng đều</td>
                      <td className="p-2">Đạt chuẩn size/khối lượng theo hợp đồng mua hàng</td>
                      <td className="p-2 font-semibold">
                        {viewingInspection.size_uniformity_check ? "Đồng đều đạt chuẩn" : "Lệch quy cách size"}
                      </td>
                      <td className={`p-2 font-bold ${viewingInspection.size_uniformity_check ? "text-emerald-600" : "text-rose-600"}`}>
                        {viewingInspection.size_uniformity_check ? "ĐẠT" : "K.ĐẠT"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">4. Tỷ lệ dập nát, ươn hỏng, úa lá (%)</td>
                      <td className="p-2">Mức tối đa cho phép ≤ 2.0% tổng khối lượng</td>
                      <td className="p-2 font-mono font-semibold">
                        {viewingInspection.defect_rate_percent !== null ? `${viewingInspection.defect_rate_percent}%` : "0.0%"}
                      </td>
                      <td className={`p-2 font-bold ${(viewingInspection.defect_rate_percent || 0) <= 2.0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {(viewingInspection.defect_rate_percent || 0) <= 2.0 ? "ĐẠT" : "K.ĐẠT"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">5. Tạp chất vật lý lạ (cát sạn, que cọng)</td>
                      <td className="p-2">Không có dị vật nguy hiểm, tạp chất ≤ 0.1%</td>
                      <td className="p-2 font-mono font-semibold">
                        {viewingInspection.impurity_percent !== null ? `${viewingInspection.impurity_percent}%` : "0.0%"}
                      </td>
                      <td className={`p-2 font-bold ${(viewingInspection.impurity_percent || 0) <= 0.1 ? "text-emerald-600" : "text-rose-600"}`}>
                        {(viewingInspection.impurity_percent || 0) <= 0.1 ? "ĐẠT" : "K.ĐẠT"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">6. Nhiệt độ giao hàng xe lạnh</td>
                      <td className="p-2">Kho đông ≤ -18°C / Kho mát 0-4°C / Thường ≤ 25°C</td>
                      <td className="p-2 font-mono font-bold">
                        {viewingInspection.temperature_c !== null
                          ? `${viewingInspection.temperature_c} °C`
                          : "N/A"}
                      </td>
                      <td className="p-2 text-emerald-600 font-bold">ĐẠT</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">7. Vệ sinh thùng xe giao hàng</td>
                      <td className="p-2">Thùng xe sạch sẽ, không mùi lạ, bạt che kín, không côn trùng</td>
                      <td className="p-2 font-semibold">
                        {viewingInspection.vehicle_cleanliness_check ? "Sạch sẽ, đạt vệ sinh" : "Thùng xe ô nhiễm/mùi"}
                      </td>
                      <td className={`p-2 font-bold ${viewingInspection.vehicle_cleanliness_check ? "text-emerald-600" : "text-rose-600"}`}>
                        {viewingInspection.vehicle_cleanliness_check ? "ĐẠT" : "K.ĐẠT"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">8. Độ ẩm & Độc tố vi nấm (Aflatoxin)</td>
                      <td className="p-2">Aflatoxin âm tính, độ ẩm đúng quy chuẩn tiêu chuẩn</td>
                      <td className="p-2">
                        {viewingInspection.moisture_content
                          ? `Độ ẩm ${viewingInspection.moisture_content}% • Vi nấm Âm tính`
                          : "Đạt chuẩn an toàn"}
                      </td>
                      <td className="p-2 text-emerald-600 font-bold">ĐẠT</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">9. Đối chiếu Phiếu kiểm nghiệm COA</td>
                      <td className="p-2">100% chỉ tiêu vi sinh & kim loại nặng trùng khớp quy chuẩn</td>
                      <td className="p-2 font-semibold">
                        {viewingInspection.coa_compliance ? "Trùng khớp COA đạt chuẩn" : "Không khớp COA"}
                      </td>
                      <td className={`p-2 font-bold ${viewingInspection.coa_compliance ? "text-emerald-600" : "text-rose-600"}`}>
                        {viewingInspection.coa_compliance ? "ĐẠT" : "K.ĐẠT"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Kết luận */}
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  KẾT LUẬN KIỂM ĐỊNH:{" "}
                  {viewingInspection.status === "PASSED"
                    ? "CHẤP NHẬN TIẾP NHẬN & NHẬP KHO CHÍNH THỨC"
                    : viewingInspection.status === "CONDITIONAL"
                    ? "TẠM CÁCH LY THEO DÕI / TÁI KIỂM"
                    : "TỪ CHỐI TIẾP NHẬN & TRẢ HÀNG VỀ NHÀ CUNG CẤP"}
                </span>
                <p className="text-muted-foreground mt-1">
                  Ghi chú: {viewingInspection.notes || "Không có ghi chú thêm."}
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
                <div>
                  <div className="font-bold">ĐẠI DIỆN NHÀ CUNG CẤP</div>
                  <div className="text-muted-foreground text-[10px]">(Ký & ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                  <div className="font-medium text-foreground">Người giao hàng</div>
                </div>
                <div>
                  <div className="font-bold">THỦ KHO TIẾP NHẬN</div>
                  <div className="text-muted-foreground text-[10px]">(Ký & ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                  <div className="font-medium text-foreground">Thủ kho nguyên liệu</div>
                </div>
                <div>
                  <div className="font-bold">KCS / NHÂN VIÊN QC KIỂM ĐỊNH</div>
                  <div className="text-muted-foreground text-[10px]">(Ký & ghi rõ họ tên)</div>
                  <div className="h-16"></div>
                  <div className="font-bold text-primary">
                    {viewingInspection.inspector_name || "Trần Văn An (QC Lead)"}
                  </div>
                </div>
              </div>

              <DialogFooter className="print:hidden">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span>In Phiếu này</span>
                </Button>
                <Button onClick={() => setIsPrintIqcOpen(false)}>Đóng</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: PRINT APPROVED SUPPLIER LIST (ASL) ==================== */}
      <Dialog open={isPrintAslOpen} onOpenChange={setIsPrintAslOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-6 print:p-6" id="asl-print-area">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-primary pb-4">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="WCERT" className="h-10 w-auto" />
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM ISO 22000:2018
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Biểu mẫu BM-ASL-01 • Điều khoản 7.1.6 Kiểm soát quá trình thuê ngoài
                  </p>
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-mono font-bold text-primary">ASL-2026-V1.0</div>
                <div className="text-muted-foreground">
                  Hiệu lực: {new Date().toLocaleDateString("vi-VN")}
                </div>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold uppercase tracking-wider text-foreground">
                DANH BẠ NHÀ CUNG CẤP ĐƯỢC PHÊ DUYỆT (APPROVED SUPPLIER LIST - ASL)
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Kỳ đánh giá: Năm 2026 • Ban Giám đốc & Phòng Mua hàng - Ban QLCL phê duyệt
              </p>
            </div>

            {/* ASL Table */}
            <div className="rounded border border-border overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-muted/60 font-semibold uppercase">
                  <tr>
                    <th className="p-2">STT</th>
                    <th className="p-2">Mã NCC</th>
                    <th className="p-2">Tên Nhà cung ứng</th>
                    <th className="p-2">Ngành hàng</th>
                    <th className="p-2">Chứng nhận ATTP</th>
                    <th className="p-2">Điểm AI</th>
                    <th className="p-2">Rủi ro</th>
                    <th className="p-2">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {suppliers.map((s, idx) => (
                    <tr key={s.supplier_id}>
                      <td className="p-2 font-mono">{idx + 1}</td>
                      <td className="p-2 font-mono font-bold text-primary">
                        {s.supplier_code}
                      </td>
                      <td className="p-2 font-medium">{s.supplier_name}</td>
                      <td className="p-2">{s.category}</td>
                      <td className="p-2 font-medium text-blue-600">
                        {s.certifications?.join(", ") || "Chưa có"}
                      </td>
                      <td className="p-2 font-bold">{s.rating_score}</td>
                      <td className="p-2">{s.risk_level}</td>
                      <td className="p-2 font-bold text-emerald-600">
                        {s.status === "APPROVED" ? "ĐẠT CHUẨN" : s.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
              <div>
                <div className="font-bold">TRƯỞNG PHÒNG MUA HÀNG</div>
                <div className="text-muted-foreground text-[10px]">(Lập danh bạ)</div>
                <div className="h-16"></div>
                <div className="font-medium text-foreground">Phạm Minh Đức</div>
              </div>
              <div>
                <div className="font-bold">TRƯỞNG BAN QLCL & ATTP</div>
                <div className="text-muted-foreground text-[10px]">(Thẩm tra năng lực)</div>
                <div className="h-16"></div>
                <div className="font-medium text-foreground">Nguyễn Hoàng Sơn</div>
              </div>
              <div>
                <div className="font-bold">TỔNG GIÁM ĐỐC / ĐẠI DIỆN LÃNH ĐẠO</div>
                <div className="text-muted-foreground text-[10px]">(Phê duyệt ban hành)</div>
                <div className="h-16"></div>
                <div className="font-bold text-primary">Vũ Thị Mai Hoa</div>
              </div>
            </div>

            <DialogFooter className="print:hidden">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="gap-1.5"
              >
                <Printer className="h-4 w-4" />
                <span>In Danh bạ ASL</span>
              </Button>
              <Button onClick={() => setIsPrintAslOpen(false)}>Đóng</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: AI SUPPLIER EVALUATION ==================== */}
      <Dialog open={!!aiEvalSupplier} onOpenChange={(open) => !open && setAiEvalSupplier(null)}>
        <DialogContent className="max-w-lg">
          {aiEvalSupplier && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                  <Sparkles className="h-5 w-5" />
                  <span>AI Đánh giá Năng lực: {aiEvalSupplier.supplier_name}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Điểm đề xuất mới:</span>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {aiEvalSupplier.recommended_score} / 100
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Mức độ rủi ro:</span>
                  <div
                    className={`text-lg font-bold ${
                      aiEvalSupplier.risk_level === "LOW"
                        ? "text-emerald-600"
                        : aiEvalSupplier.risk_level === "MEDIUM"
                        ? "text-amber-600"
                        : "text-rose-600"
                    }`}
                  >
                    RỦI RO {aiEvalSupplier.risk_level}
                  </div>
                </div>
              </div>

              {/* Strengths */}
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Điểm mạnh ghi nhận:
                </div>
                <ul className="list-inside list-disc text-xs text-muted-foreground space-y-0.5">
                  {aiEvalSupplier.strengths?.map((s: string, idx: number) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Rủi ro tiềm ẩn cần kiểm soát:
                </div>
                <ul className="list-inside list-disc text-xs text-muted-foreground space-y-0.5">
                  {aiEvalSupplier.risks?.map((r: string, idx: number) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">
                  Khuyến nghị hành động tiếp theo:
                </div>
                <ul className="list-inside list-disc text-xs text-muted-foreground space-y-0.5">
                  {aiEvalSupplier.recommendations?.map((rec: string, idx: number) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>

              <DialogFooter>
                <Button onClick={() => setAiEvalSupplier(null)}>Đã hiểu</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: DYNAMIC FORM - SUPPLIER AUDIT (BM-NCC-01) ==================== */}
      {showDynamicVendorModal && vendorFormTemplate && selectedSupplierForForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl">
            <DynamicFormRenderer
              key={`${selectedSupplierForForm.supplier_id}-${showDynamicVendorModal}`}
              template={vendorFormTemplate}
              initialValues={{
                vendor_name: selectedSupplierForForm.supplier_name,
                supplier_name: selectedSupplierForForm.supplier_name,
                has_iso_cert: selectedSupplierForForm.status !== "WARNING" && selectedSupplierForForm.status !== "SUSPENDED" && selectedSupplierForForm.status !== "REJECTED",
                quality_score: selectedSupplierForForm.rating_score || 95,
                delivery_ontime_rate: 98,
                ontime_delivery_rate: 98,
                final_ranking: selectedSupplierForForm.status === "WARNING" ? "Loại C - Cần khắc phục" : selectedSupplierForForm.status === "SUSPENDED" || selectedSupplierForForm.status === "REJECTED" ? "Loại D - Loại khỏi danh bạ" : "Loại A - Ưu tiên hàng đầu",
                supplier_ranking: selectedSupplierForForm.status === "WARNING" ? "Hạng C (Cần khắc phục)" : selectedSupplierForForm.status === "SUSPENDED" || selectedSupplierForForm.status === "REJECTED" ? "Hạng D (Đình chỉ)" : "Hạng A (Ưu tiên)",
                audit_notes: selectedSupplierForForm.evaluation_notes || "",
              }}
              onSubmit={handleSaveVendorDynamicForm}
              onCancel={() => setShowDynamicVendorModal(false)}
            />
          </div>
        </div>
      )}

      {/* ==================== MODAL: DYNAMIC FORM - IQC INSPECTION (FORM-IQC-01) ==================== */}
      {showDynamicIqcModal && iqcFormTemplate && selectedLotForForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl">
            <DynamicFormRenderer
              key={`${selectedLotForForm.material_lot_id}-${showDynamicIqcModal}`}
              template={iqcFormTemplate}
              initialValues={{
                lot_number: selectedLotForForm.lot_number,
                material_lot: selectedLotForForm.lot_number,
                material_name: selectedLotForForm.material_name,
                supplier_name: selectedLotForForm.supplier_name || "Nhà cung cấp uy tín",
                temp_delivery: -19.2,
                truck_temperature_c: -19.2,
                sensory_pass: true,
                sensory_color: true,
                has_coa: true,
                coa_attached: true,
                qc_decision: "CHẤP NHẬN NHẬP KHO (PASS)",
                iqc_verdict: "CHẤP NHẬN NHẬP KHO",
              }}
              onSubmit={handleSaveIqcDynamicForm}
              onCancel={() => setShowDynamicIqcModal(false)}
            />
          </div>
        </div>
      )}

      {/* ==================== MODAL: WORKFLOW BUILDER - SUPPLIER AUDIT FLOW ==================== */}
      {showWorkflowModal && workflowTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <WorkflowBuilder
              initialData={workflowTemplate}
              onSave={async (wf) => {
                try {
                  await api.post("/builders/workflows", wf);
                  toast.success("Đã lưu quy trình thẩm định nhà cung cấp thành công!");
                  setShowWorkflowModal(false);
                } catch (err: any) {
                  const msg = err.response?.data?.detail || err.message;
                  toast.error("Lỗi khi lưu quy trình: " + msg);
                  throw new Error(msg);
                }
              }}
              onCancel={() => setShowWorkflowModal(false)}
            />
          </div>
        </div>
      )}
      {/* Modal Xác Nhận Xóa Nhà Cung Cấp */}
      <ConfirmDialog
        isOpen={!!deletingSupplierItem}
        onClose={() => setDeletingSupplierItem(null)}
        onConfirm={() => {
          if (deletingSupplierItem) {
            executeDeleteSupplier(deletingSupplierItem.id, deletingSupplierItem.name);
            setDeletingSupplierItem(null);
          }
        }}
        title="Xác nhận xóa Nhà cung cấp"
        description={`Bạn có chắc chắn muốn xóa Nhà cung cấp "${deletingSupplierItem?.name}" khỏi Danh bạ ASL không? Dữ liệu lịch sử đánh giá liên quan sẽ bị ảnh hưởng.`}
        confirmLabel="Xóa Nhà cung cấp"
        variant="destructive"
      />

      {/* Modal Xác Nhận Xóa Lô Nguyên Liệu */}
      <ConfirmDialog
        isOpen={!!deletingLotItem}
        onClose={() => setDeletingLotItem(null)}
        onConfirm={() => {
          if (deletingLotItem) {
            executeDeleteLot(deletingLotItem.id, deletingLotItem.code);
            setDeletingLotItem(null);
          }
        }}
        title="Xác nhận xóa Lô nguyên vật liệu"
        description={`Bạn có chắc chắn muốn xóa Lô nguyên liệu "${deletingLotItem?.code}" khỏi hệ thống tiếp nhận?`}
        confirmLabel="Xóa Lô"
        variant="destructive"
      />

      {/* ==================== DIALOG: CREATE/EDIT EVALUATION PLAN (BM02-KHĐGNCC) ==================== */}
      <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan
                ? `Chỉnh sửa Kế hoạch đánh giá: ${editingPlan.plan_code}`
                : "Tạo Kế hoạch đánh giá NCC hàng năm (BM02-KHĐGNCC)"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePlan} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Mã số kế hoạch *</Label>
                <Input
                  value={planForm.plan_code}
                  onChange={(e) => setPlanForm({ ...planForm, plan_code: e.target.value })}
                  placeholder="KHĐG-2026-01"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Năm áp dụng *</Label>
                <Input
                  type="number"
                  value={planForm.year}
                  onChange={(e) => setPlanForm({ ...planForm, year: parseInt(e.target.value) || new Date().getFullYear() })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tiêu đề kế hoạch *</Label>
              <Input
                value={planForm.title}
                onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                placeholder="VD: Kế hoạch Đánh giá Năng lực Nhà cung ứng Năm 2026"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Phòng ban chủ trì *</Label>
                <Input
                  value={planForm.department}
                  onChange={(e) => setPlanForm({ ...planForm, department: e.target.value })}
                  placeholder="Phòng Đảm Bảo Chất Lượng (QA/QC)"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Người phê duyệt (BGĐ)</Label>
                <Input
                  value={planForm.approved_by}
                  onChange={(e) => setPlanForm({ ...planForm, approved_by: e.target.value })}
                  placeholder="Giám Đốc Nhà Máy"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Phạm vi đánh giá</Label>
              <textarea
                value={planForm.scope}
                onChange={(e) => setPlanForm({ ...planForm, scope: e.target.value })}
                rows={2}
                placeholder="Phạm vi đối tượng nhà cung ứng áp dụng..."
                className="w-full rounded-md border border-input bg-background p-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Trạng thái phê duyệt</Label>
              <select
                value={planForm.approval_status}
                onChange={(e) => setPlanForm({ ...planForm, approval_status: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="APPROVED">Đã phê duyệt (Hiệu lực thi hành)</option>
                <option value="PENDING">Chờ Ban Giám Đốc phê duyệt</option>
                <option value="REJECTED">Từ chối / Cần chỉnh sửa lại</option>
              </select>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreatePlanOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                {editingPlan ? "Lưu thay đổi" : "Tạo kế hoạch BM02"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: CREATE/EDIT SUPPLIER EVALUATION (BM03 / BM03-TS / BM04) ==================== */}
      <Dialog open={isCreateEvalOpen} onOpenChange={setIsCreateEvalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEval
                ? `Chỉnh sửa Phiếu đánh giá NCC: ${editingEval.evaluation_code}`
                : "Lập Phiếu Đánh Giá Năng Lực Nhà Cung Cấp Mới"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEval} className="space-y-4 py-2">
            {/* Row 1: Code, Plan, Supplier */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Mã số phiếu ĐG *</Label>
                <Input
                  value={evalForm.evaluation_code}
                  onChange={(e) => setEvalForm({ ...evalForm, evaluation_code: e.target.value })}
                  placeholder="ĐGNCC-2026-001"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Thuộc Kế hoạch (BM02)</Label>
                <select
                  value={evalForm.plan_id || ""}
                  onChange={(e) =>
                    setEvalForm({
                      ...evalForm,
                      plan_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">-- Không thuộc kế hoạch nào --</option>
                  {evaluationPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.plan_code} - Năm {p.year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Nhà cung cấp đánh giá *</Label>
                <select
                  value={evalForm.supplier_id}
                  onChange={(e) => setEvalForm({ ...evalForm, supplier_id: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  required
                >
                  <option value="">-- Chọn nhà cung cấp --</option>
                  {suppliers.map((s) => (
                    <option key={s.supplier_id} value={s.supplier_id}>
                      {s.supplier_code} - {s.supplier_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Criteria Type, Date, Audit Type, Evaluator */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Bộ Tiêu Chí Áp Dụng *</Label>
                <select
                  value={evalForm.criteria_type}
                  onChange={(e) => handleCriteriaTypeChange(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
                >
                  <option value="AGRI_FRESH">BM03: Nông sản tươi sống (Biểu mẫu gốc)</option>
                  <option value="AQUA_ANIMAL_FRESH">Bộ TC Bổ sung: Thủy hải sản tươi sống (Do dự án tự xây dựng)</option>
                  <option value="PROCESSED_DRY_PACKAGING">BM04: Khô, phụ gia, bao bì (Biểu mẫu gốc)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Ngày đánh giá *</Label>
                <Input
                  type="date"
                  value={evalForm.evaluation_date}
                  onChange={(e) => setEvalForm({ ...evalForm, evaluation_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Hình thức đánh giá *</Label>
                <select
                  value={evalForm.audit_type}
                  onChange={(e) => setEvalForm({ ...evalForm, audit_type: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ON_SITE">Tại chỗ hiện trường (On-site)</option>
                  <option value="DESK_AUDIT">Hồ sơ năng lực & COA (Desk)</option>
                  <option value="THIRD_PARTY">Đánh giá bên thứ ba</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Chuyên viên đánh giá *</Label>
                <Input
                  value={evalForm.evaluator_name}
                  onChange={(e) => setEvalForm({ ...evalForm, evaluator_name: e.target.value })}
                  placeholder="Họ tên chuyên viên QA/QC"
                  required
                />
              </div>
            </div>

            {/* Dynamic Criteria Scoring Matrix */}
            <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <div className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Chi tiết bảng chấm điểm tiêu chí ({evalForm.criteria_scores?.length || 0} tiêu chí - Thang điểm 100)
                </div>
                <div className="text-xs text-muted-foreground">
                  Chuẩn ISO 22000 Điều khoản 7.1.6
                </div>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {evalForm.criteria_scores?.map((crit: any, idx: number) => (
                  <div
                    key={crit.id || idx}
                    className="flex flex-col gap-2 rounded-md border border-border/60 bg-background p-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">
                        {idx + 1}. {crit.name}
                      </div>
                      <div className="text-muted-foreground mt-0.5 text-[11px]">
                        {crit.description}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-[11px] text-muted-foreground whitespace-nowrap">
                          Điểm (Max {crit.max_score}):
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={crit.max_score}
                          step={0.5}
                          value={crit.score}
                          onChange={(e) =>
                            handleCriteriaScoreChange(idx, parseFloat(e.target.value) || 0)
                          }
                          className="h-8 w-16 text-center font-bold"
                        />
                      </div>

                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold ${
                          crit.score >= crit.max_score * 0.7
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {crit.score >= crit.max_score * 0.7 ? "ĐẠT" : "K.ĐẠT"}
                      </span>

                      <Input
                        value={crit.notes || ""}
                        onChange={(e) =>
                          handleCriteriaScoreChange(idx, crit.score, e.target.value)
                        }
                        placeholder="Ghi chú thực tế..."
                        className="h-8 w-44 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Score & Rating Banner */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Tổng điểm đánh giá</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-primary">{evalForm.total_score}</span>
                  <span className="text-xs text-muted-foreground">/ 100 điểm</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Xếp hạng năng lực</span>
                <div>
                  <span
                    className={`inline-block rounded px-2.5 py-0.5 text-sm font-bold ${
                      evalForm.grade === "A"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : evalForm.grade === "B"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        : evalForm.grade === "C"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    Hạng {evalForm.grade} ({evalForm.grade === "A" ? "Xuất sắc" : evalForm.grade === "B" ? "Khá" : evalForm.grade === "C" ? "Trung bình" : "Không đạt"})
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Kết luận phê duyệt ASL</span>
                <div>
                  <span
                    className={`inline-block rounded px-2.5 py-0.5 text-sm font-bold ${
                      evalForm.conclusion === "APPROVED"
                        ? "bg-emerald-600 text-white"
                        : evalForm.conclusion === "CONDITIONAL"
                        ? "bg-amber-500 text-white"
                        : "bg-rose-600 text-white"
                    }`}
                  >
                    {evalForm.conclusion === "APPROVED"
                      ? "ĐẠT CHUẨN (DUYỆT ASL)"
                      : evalForm.conclusion === "CONDITIONAL"
                      ? "CÓ ĐIỀU KIỆN (KHẮC PHỤC)"
                      : "KHÔNG ĐẠT (LOẠI BỎ)"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Hành động khắc phục / Yêu cầu đối với NCC</Label>
                <textarea
                  value={evalForm.corrective_actions || ""}
                  onChange={(e) => setEvalForm({ ...evalForm, corrective_actions: e.target.value })}
                  rows={2}
                  placeholder="Ghi chú các điểm không phù hợp cần nhà cung cấp gửi báo cáo CAPA..."
                  className="w-full rounded-md border border-input bg-background p-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Đại diện Ban Giám Đốc phê duyệt</Label>
                <Input
                  value={evalForm.approved_by || ""}
                  onChange={(e) => setEvalForm({ ...evalForm, approved_by: e.target.value })}
                  placeholder="Giám Đốc Nhà Máy"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateEvalOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                {editingEval ? "Lưu thay đổi phiếu ĐG" : "Hoàn tất & Cập nhật NCC"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Xác Nhận Xóa Kế Hoạch Đánh Giá */}
      <ConfirmDialog
        isOpen={!!deletingPlanItem}
        onClose={() => setDeletingPlanItem(null)}
        onConfirm={() => {
          if (deletingPlanItem) {
            handleDeletePlan(deletingPlanItem.id);
            setDeletingPlanItem(null);
          }
        }}
        title="Xác nhận xóa Kế hoạch đánh giá NCC"
        description={`Bạn có chắc chắn muốn xóa Kế hoạch "${deletingPlanItem?.code}" không?`}
        confirmLabel="Xóa Kế hoạch"
        variant="destructive"
      />

      {/* Modal Xác Nhận Xóa Phiếu Đánh Giá NCC */}
      <ConfirmDialog
        isOpen={!!deletingEvalItem}
        onClose={() => setDeletingEvalItem(null)}
        onConfirm={() => {
          if (deletingEvalItem) {
            handleDeleteEval(deletingEvalItem.id);
            setDeletingEvalItem(null);
          }
        }}
        title="Xác nhận xóa Phiếu đánh giá NCC"
        description={`Bạn có chắc chắn muốn xóa Phiếu đánh giá "${deletingEvalItem?.code}" không?`}
        confirmLabel="Xóa Phiếu"
        variant="destructive"
      />
    </div>
  );
}
