import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, AIBadge } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Search,
  Plus,
  RefreshCw,
  Sparkles,
  Printer,
  Pencil,
  Trash2,
  ShieldCheck,
  Zap,
  Activity,
  Gauge,
  Sliders,
  Flame,
  Snowflake,
  Filter,
  Layers,
  FileCheck,
  Info,
  Clock,
  ExternalLink,
} from "lucide-react";
import api from "@/lib/api";
import { printHtml } from "@/lib/print";
import logoImg from "@/assets/logo.png";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: "Thiết bị, Hiệu chuẩn & Bảo trì máy móc – WCERT FSMS" },
      {
        name: "description",
        content:
          "Quản lý vòng đời thiết bị, chu kỳ hiệu chuẩn và bảo trì phòng ngừa theo ISO 22000:2018 Điều khoản 7.1.5 & 8.2.",
      },
    ],
  }),
  component: () => (
    <AppShell module="equipment">
      <EquipmentModule />
    </AppShell>
  ),
});

// Helper định dạng thông báo lỗi nghiệp vụ chi tiết
const formatError = (err: any): string => {
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: any) => {
        const field = d.loc ? d.loc.filter((x: any) => x !== "body").join(".") : "";
        return `${field ? `[${field}]: ` : ""}${d.msg || JSON.stringify(d)}`;
      })
      .join("\n");
  }
  return err.message || "Đã xảy ra lỗi không xác định";
};

// ==================== INTERFACES ====================
interface EquipmentItem {
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  category: "MEASURING" | "PROCESSING" | "STORAGE" | "UTILITY";
  model?: string;
  serial_number?: string;
  manufacturer?: string;
  installation_location?: string;
  installation_date?: string;
  criticality_level: "HIGH_CCP" | "MEDIUM_OPRP" | "LOW_PRP";
  status: "OPERATIONAL" | "MAINTENANCE" | "CALIBRATION_OVERDUE" | "DECOMMISSIONED";
  calibration_frequency_months: number;
  last_calibration_date?: string;
  next_calibration_due?: string;
  calibration_status: "VALID" | "EXPIRING_SOON" | "EXPIRED";
  maintenance_frequency_days: number;
  last_maintenance_date?: string;
  next_maintenance_due?: string;
  managed_by?: string;
  manager_name?: string;
  specifications?: Record<string, any>;
  notes?: string;
  days_until_calibration?: number;
  days_until_maintenance?: number;
  total_maintenance_logs?: number;
  total_calibration_logs?: number;
  created_at?: string;
}

interface MaintenanceLogItem {
  maintenance_id: string;
  equipment_id: string;
  maintenance_code: string;
  maintenance_type: "PREVENTIVE" | "CORRECTIVE" | "LUBRICATION" | "OVERHAUL";
  maintenance_date: string;
  performed_by?: string;
  performer_name?: string;
  performer_display_name?: string;
  tasks_performed?: Array<{ task: string; result?: string }>;
  parts_replaced?: Array<{ part: string; qty?: number; unit?: string }>;
  food_grade_lubricant_used: boolean;
  hygiene_sanitation_after_maint: boolean;
  cost?: number;
  result_status: "SUCCESS" | "NEED_FOLLOWUP" | "FAILED";
  notes?: string;
  equipment_code?: string;
  equipment_name?: string;
  installation_location?: string;
  created_at?: string;
}

interface CalibrationLogItem {
  calibration_id: string;
  equipment_id: string;
  calibration_code: string;
  calibration_type: "INTERNAL" | "EXTERNAL";
  calibration_date: string;
  expiry_date: string;
  agency_name?: string;
  certificate_number?: string;
  standard_applied?: string;
  measured_deviation?: number;
  allowable_tolerance?: number;
  is_passed: boolean;
  status: "PASSED" | "FAILED" | "ADJUSTED";
  certificate_file_url?: string;
  calibrated_by?: string;
  calibrator_name?: string;
  calibrator_display_name?: string;
  notes?: string;
  equipment_code?: string;
  equipment_name?: string;
  installation_location?: string;
  created_at?: string;
}

interface EquipmentStats {
  total_equipments: number;
  operational_count: number;
  under_maintenance_count: number;
  calibration_valid_count: number;
  calibration_expiring_soon_count: number;
  calibration_overdue_count: number;
  calibration_compliance_rate: number;
  preventive_maintenance_due_this_month: number;
  total_maintenance_logs_year: number;
  total_calibration_logs_year: number;
}

// ==================== CONFIGS ====================
const CATEGORY_MAP: Record<string, { label: string; tone: string; icon: any }> = {
  MEASURING: {
    label: "Đo lường & Kiểm định",
    tone: "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-300",
    icon: Gauge,
  },
  PROCESSING: {
    label: "Chế biến & Sản xuất",
    tone: "bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-300",
    icon: Flame,
  },
  STORAGE: {
    label: "Lưu trữ & Cấp đông",
    tone: "bg-cyan-500/10 text-cyan-700 border-cyan-200 dark:text-cyan-300",
    icon: Snowflake,
  },
  UTILITY: {
    label: "Phụ trợ & Nguồn nước",
    tone: "bg-slate-500/10 text-slate-700 border-slate-200 dark:text-slate-300",
    icon: Zap,
  },
};

const CRITICALITY_MAP: Record<string, { label: string; tone: string }> = {
  HIGH_CCP: {
    label: "Kiểm soát CCP",
    tone: "bg-rose-500/10 text-rose-700 border-rose-200 font-bold",
  },
  MEDIUM_OPRP: {
    label: "Kiểm soát oPRP",
    tone: "bg-amber-500/10 text-amber-700 border-amber-200 font-medium",
  },
  LOW_PRP: {
    label: "Nền tảng PRP",
    tone: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  },
};

const STATUS_MAP: Record<string, { label: string; tone: string }> = {
  OPERATIONAL: {
    label: "Đang hoạt động tốt",
    tone: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  },
  MAINTENANCE: {
    label: "Đang bảo trì / Sửa chữa",
    tone: "bg-amber-500/10 text-amber-700 border-amber-200",
  },
  CALIBRATION_OVERDUE: {
    label: "Quá hạn hiệu chuẩn",
    tone: "bg-rose-500/10 text-rose-700 border-rose-200",
  },
  DECOMMISSIONED: {
    label: "Ngừng sử dụng",
    tone: "bg-slate-500/10 text-slate-600 border-slate-200",
  },
};

const CALIBRATION_STATUS_MAP: Record<string, { label: string; tone: string }> = {
  VALID: {
    label: "Tem còn hiệu lực",
    tone: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  },
  EXPIRING_SOON: {
    label: "Sắp hết hạn (<15 ngày)",
    tone: "bg-amber-500/10 text-amber-700 border-amber-200 animate-pulse",
  },
  EXPIRED: {
    label: "ĐÃ QUÁ HẠN KIỂM ĐỊNH",
    tone: "bg-rose-500/10 text-rose-700 border-rose-300 font-bold",
  },
};

// ==================== MAIN COMPONENT ====================
function EquipmentModule() {
  const [activeTab, setActiveTab] = useState<"equipments" | "calibration" | "maintenance" | "ai">("equipments");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [criticalityFilter, setCriticalityFilter] = useState("ALL");
  const [selectedEqFilterForLogs, setSelectedEqFilterForLogs] = useState<string>("ALL");

  // Dữ liệu chính
  const [stats, setStats] = useState<EquipmentStats | null>(null);
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLogItem[]>([]);
  const [calibrationLogs, setCalibrationLogs] = useState<CalibrationLogItem[]>([]);

  // Modals thao tác
  const [isEqModalOpen, setIsEqModalOpen] = useState(false);
  const [editingEq, setEditingEq] = useState<EquipmentItem | null>(null);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [isCalModalOpen, setIsCalModalOpen] = useState(false);
  const [deletingEqItem, setDeletingEqItem] = useState<{ id: string; name: string } | null>(null);

  // Modals In Ấn & Xem Trước Chuẩn ISO
  const [showPrintProfileModal, setShowPrintProfileModal] = useState(false);
  const [selectedPrintEq, setSelectedPrintEq] = useState<EquipmentItem | null>(null);

  const [showPrintCalModal, setShowPrintCalModal] = useState(false);
  const [selectedPrintCal, setSelectedPrintCal] = useState<CalibrationLogItem | null>(null);

  // Forms
  const [eqForm, setEqForm] = useState<any>({
    equipment_code: "",
    equipment_name: "",
    category: "PROCESSING",
    model: "",
    serial_number: "",
    manufacturer: "",
    installation_location: "",
    criticality_level: "MEDIUM_OPRP",
    status: "OPERATIONAL",
    calibration_frequency_months: 12,
    last_calibration_date: "",
    next_calibration_due: "",
    calibration_status: "VALID",
    maintenance_frequency_days: 30,
    last_maintenance_date: "",
    next_maintenance_due: "",
    notes: "",
  });

  const [maintForm, setMaintForm] = useState<any>({
    equipment_id: "",
    maintenance_code: "",
    maintenance_type: "PREVENTIVE",
    maintenance_date: new Date().toISOString().split("T")[0],
    performer_name: "Tổ Kỹ thuật Bảo trì",
    task_desc: "Bảo dưỡng định kỳ, kiểm tra vòng bi, siết ốc, tra mỡ thực phẩm NSF H1",
    parts_desc: "Gioăng đệm chịu nhiệt, phớt làm kín",
    food_grade_lubricant_used: true,
    hygiene_sanitation_after_maint: true,
    cost: 450000,
    result_status: "SUCCESS",
    notes: "Thiết bị vận hành êm sau bảo dưỡng.",
  });

  const [calForm, setCalForm] = useState<any>({
    equipment_id: "",
    calibration_code: "",
    calibration_type: "EXTERNAL",
    calibration_date: new Date().toISOString().split("T")[0],
    expiry_date: "",
    agency_name: "Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng 3 (QUATEST 3)",
    certificate_number: "HC-QT3-2026-",
    standard_applied: "ISO/IEC 17025:2017 & ĐLVN",
    measured_deviation: 0.04,
    allowable_tolerance: 0.5,
    is_passed: true,
    status: "PASSED",
    calibrator_name: "KTV Kiểm định QUATEST",
    notes: "Độ lệch trong giới hạn cho phép.",
  });

  // AI States
  const [aiMaintReq, setAiMaintReq] = useState({
    equipment_code: "EQ-STER-01",
    equipment_name: "Nồi tiệt trùng cao áp Retort",
    operating_hours_estimate: 1500,
    sensor_vibration_level: "Hơi rung",
    current_temperature_c: 82.5,
  });
  const [aiMaintResult, setAiMaintResult] = useState<any>(null);
  const [aiMaintLoading, setAiMaintLoading] = useState(false);

  const [aiCalReq, setAiCalReq] = useState({
    equipment_code: "EQ-STER-01",
    equipment_name: "Nồi tiệt trùng cao áp Retort",
    measured_deviation: 0.85,
    allowable_tolerance: 0.5,
    unit: "°C",
    related_ccp_step: "Gia nhiệt tiệt trùng (CCP 2)",
  });
  const [aiCalResult, setAiCalResult] = useState<any>(null);
  const [aiCalLoading, setAiCalLoading] = useState(false);

  // Fetch Data đồng bộ
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, eqRes, maintRes, calRes] = await Promise.all([
        api.get("/equipment/stats"),
        api.get("/equipment/equipments"),
        api.get("/equipment/maintenance-logs"),
        api.get("/equipment/calibration-logs"),
      ]);
      setStats(statsRes.data);
      setEquipments(eqRes.data);
      setMaintenanceLogs(maintRes.data);
      setCalibrationLogs(calRes.data);
    } catch (err) {
      console.error("Lỗi tải dữ liệu thiết bị:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Equipments
  const filteredEquipments = useMemo(() => {
    return equipments.filter((e) => {
      const matchCat = categoryFilter === "ALL" || e.category === categoryFilter;
      const matchCrit = criticalityFilter === "ALL" || e.criticality_level === criticalityFilter;
      const term = searchQuery.toLowerCase().trim();
      const matchQuery =
        !term ||
        e.equipment_code.toLowerCase().includes(term) ||
        e.equipment_name.toLowerCase().includes(term) ||
        (e.model && e.model.toLowerCase().includes(term)) ||
        (e.installation_location && e.installation_location.toLowerCase().includes(term));
      return matchCat && matchCrit && matchQuery;
    });
  }, [equipments, categoryFilter, criticalityFilter, searchQuery]);

  // Filtered Logs
  const filteredCalLogs = useMemo(() => {
    if (selectedEqFilterForLogs === "ALL") return calibrationLogs;
    return calibrationLogs.filter((c) => c.equipment_id === selectedEqFilterForLogs || c.equipment_code === selectedEqFilterForLogs);
  }, [calibrationLogs, selectedEqFilterForLogs]);

  const filteredMaintLogs = useMemo(() => {
    if (selectedEqFilterForLogs === "ALL") return maintenanceLogs;
    return maintenanceLogs.filter((m) => m.equipment_id === selectedEqFilterForLogs || m.equipment_code === selectedEqFilterForLogs);
  }, [maintenanceLogs, selectedEqFilterForLogs]);

  // Handle Create / Edit Equipment
  const handleOpenCreateEq = () => {
    setEditingEq(null);
    const codeNum = String(equipments.length + 1).padStart(2, "0");
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    // Tự động tính ngày đến hạn dự kiến theo chu kỳ
    const nextCal = new Date(today);
    nextCal.setMonth(nextCal.getMonth() + 12);
    const nextMaint = new Date(today);
    nextMaint.setDate(nextMaint.getDate() + 30);

    setEqForm({
      equipment_code: `EQ-DEV-${codeNum}`,
      equipment_name: "",
      category: "PROCESSING",
      model: "",
      serial_number: "",
      manufacturer: "",
      installation_location: "Phân xưởng Chế biến",
      criticality_level: "MEDIUM_OPRP",
      status: "OPERATIONAL",
      calibration_frequency_months: 12,
      last_calibration_date: todayStr,
      next_calibration_due: nextCal.toISOString().split("T")[0],
      calibration_status: "VALID",
      maintenance_frequency_days: 30,
      last_maintenance_date: todayStr,
      next_maintenance_due: nextMaint.toISOString().split("T")[0],
      notes: "",
    });
    setIsEqModalOpen(true);
  };

  const handleOpenEditEq = (eq: EquipmentItem) => {
    setEditingEq(eq);
    setEqForm({
      equipment_code: eq.equipment_code,
      equipment_name: eq.equipment_name,
      category: eq.category,
      model: eq.model || "",
      serial_number: eq.serial_number || "",
      manufacturer: eq.manufacturer || "",
      installation_location: eq.installation_location || "",
      criticality_level: eq.criticality_level,
      status: eq.status,
      calibration_frequency_months: eq.calibration_frequency_months || 12,
      last_calibration_date: eq.last_calibration_date || "",
      next_calibration_due: eq.next_calibration_due || "",
      calibration_status: eq.calibration_status || "VALID",
      maintenance_frequency_days: eq.maintenance_frequency_days || 30,
      last_maintenance_date: eq.last_maintenance_date || "",
      next_maintenance_due: eq.next_maintenance_due || "",
      notes: eq.notes || "",
    });
    setIsEqModalOpen(true);
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();

    // ================= VALIDATE NGHIỆP VỤ ISO 22000 =================
    const code = eqForm.equipment_code?.trim();
    if (!code || code.length < 2) {
      toast.error("Lỗi nghiệp vụ: Mã thiết bị là bắt buộc (tối thiểu 2 ký tự, ví dụ: EQ-STER-01)");
      return;
    }

    const name = eqForm.equipment_name?.trim();
    if (!name || name.length < 3) {
      toast.error("Lỗi nghiệp vụ: Tên thiết bị là bắt buộc (tối thiểu 3 ký tự, ví dụ: Nồi tiệt trùng cao áp)");
      return;
    }

    const location = eqForm.installation_location?.trim();
    if (!location || location.length < 2) {
      toast.error("Lỗi nghiệp vụ ISO 22000 (Điều khoản 7.1.5): Vị trí lắp đặt là bắt buộc để quản lý phân vùng ATTP và chống nhiễm chéo.");
      return;
    }

    const calFreq = Number(eqForm.calibration_frequency_months);
    if (!calFreq || calFreq < 1) {
      toast.error("Lỗi nghiệp vụ: Chu kỳ hiệu chuẩn quy định phải là số nguyên dương >= 1 tháng.");
      return;
    }

    const maintFreq = Number(eqForm.maintenance_frequency_days);
    if (!maintFreq || maintFreq < 1) {
      toast.error("Lỗi nghiệp vụ: Chu kỳ bảo trì PM quy định phải là số nguyên dương >= 1 ngày.");
      return;
    }

    if (eqForm.last_calibration_date && eqForm.next_calibration_due) {
      if (eqForm.next_calibration_due < eqForm.last_calibration_date) {
        toast.error("Lỗi logic ngày tháng: Hạn hiệu chuẩn kế tiếp không thể diễn ra trước Ngày hiệu chuẩn gần nhất.");
        return;
      }
    }

    if (eqForm.last_maintenance_date && eqForm.next_maintenance_due) {
      if (eqForm.next_maintenance_due < eqForm.last_maintenance_date) {
        toast.error("Lỗi logic ngày tháng: Hạn bảo trì kế tiếp không thể diễn ra trước Ngày bảo dưỡng gần nhất.");
        return;
      }
    }

    try {
      const payload = {
        equipment_code: code,
        equipment_name: name,
        category: eqForm.category,
        model: eqForm.model?.trim() || null,
        serial_number: eqForm.serial_number?.trim() || null,
        manufacturer: eqForm.manufacturer?.trim() || null,
        installation_location: location,
        installation_date: eqForm.installation_date || null,
        criticality_level: eqForm.criticality_level,
        status: eqForm.status,
        calibration_frequency_months: calFreq,
        last_calibration_date: eqForm.last_calibration_date || null,
        next_calibration_due: eqForm.next_calibration_due || null,
        calibration_status: eqForm.calibration_status || "VALID",
        maintenance_frequency_days: maintFreq,
        last_maintenance_date: eqForm.last_maintenance_date || null,
        next_maintenance_due: eqForm.next_maintenance_due || null,
        notes: eqForm.notes?.trim() || null,
      };

      if (editingEq) {
        await api.put(`/equipment/equipments/${editingEq.equipment_id}`, payload);
        toast.success(`Đã cập nhật thông tin thiết bị [${code}] thành công!`);
      } else {
        await api.post("/equipment/equipments", payload);
        toast.success(`Đã thêm thiết bị mới [${code}] vào hồ sơ máy móc thành công!`);
      }
      setIsEqModalOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(formatError(err));
    }
  };

  const executeDeleteEquipment = async (id: string, name?: string) => {
    try {
      await api.delete(`/equipment/equipments/${id}`);
      toast.success(`Đã xoá thiết bị ${name ? `"${name}"` : ""} khỏi hệ thống thành công!`);
      await fetchData();
    } catch (err: any) {
      toast.error(formatError(err));
    }
  };

  // Handle Maintenance Log
  const handleOpenCreateMaint = (eq?: EquipmentItem) => {
    const codeNum = String(maintenanceLogs.length + 1).padStart(3, "0");
    setMaintForm({
      equipment_id: eq ? eq.equipment_id : equipments[0]?.equipment_id || "",
      maintenance_code: `MAINT-2026-${codeNum}`,
      maintenance_type: "PREVENTIVE",
      maintenance_date: new Date().toISOString().split("T")[0],
      performer_name: "Tổ Cơ Điện - Phòng Kỹ Thuật",
      task_desc: "Bảo dưỡng định kỳ, tra dầu mỡ bôi trơn an toàn thực phẩm NSF H1 và hiệu chỉnh căn chỉnh trục quay.",
      parts_desc: "",
      food_grade_lubricant_used: true,
      hygiene_sanitation_after_maint: true,
      cost: 500000,
      result_status: "COMPLETED",
      notes: "Thiết bị vận hành êm, đạt tiêu chuẩn vệ sinh an toàn thực phẩm.",
    });
    setIsMaintModalOpen(true);
  };

  const handleSaveMaint = async (e: React.FormEvent) => {
    e.preventDefault();

    // ================= VALIDATE NGHIỆP VỤ BẢO TRÌ =================
    const code = maintForm.maintenance_code?.trim();
    if (!code || code.length < 2) {
      toast.error("Lỗi nghiệp vụ: Mã phiếu bảo trì là bắt buộc (ví dụ: MAINT-2026-001).");
      return;
    }
    if (!maintForm.equipment_id) {
      toast.error("Lỗi nghiệp vụ: Vui lòng chọn thiết bị thực hiện bảo dưỡng.");
      return;
    }
    if (!maintForm.maintenance_date) {
      toast.error("Lỗi nghiệp vụ: Ngày thực hiện bảo trì là bắt buộc.");
      return;
    }
    const taskDesc = maintForm.task_desc?.trim();
    if (!taskDesc || taskDesc.length < 5) {
      toast.error("Lỗi nghiệp vụ ISO 22000 (Điều khoản 8.2): Nội dung công việc bảo trì phải mô tả chi tiết tối thiểu 5 ký tự.");
      return;
    }
    const performer = maintForm.performer_name?.trim();
    if (!performer || performer.length < 2) {
      toast.error("Lỗi nghiệp vụ: Người/Đơn vị thực hiện bảo trì là bắt buộc để truy cứu trách nhiệm.");
      return;
    }

    try {
      const payload = {
        equipment_id: maintForm.equipment_id,
        maintenance_code: code,
        maintenance_type: maintForm.maintenance_type,
        maintenance_date: maintForm.maintenance_date,
        performer_name: performer,
        tasks_performed: [{ task: taskDesc, result: "PASS" }],
        parts_replaced: maintForm.parts_desc?.trim() ? [{ part: maintForm.parts_desc.trim(), qty: 1 }] : [],
        food_grade_lubricant_used: Boolean(maintForm.food_grade_lubricant_used),
        hygiene_sanitation_after_maint: Boolean(maintForm.hygiene_sanitation_after_maint),
        cost: Math.max(0, Number(maintForm.cost) || 0),
        result_status: maintForm.result_status,
        notes: maintForm.notes?.trim() || null,
      };
      await api.post("/equipment/maintenance-logs", payload);
      setIsMaintModalOpen(false);
      toast.success(`Đã lưu phiếu bảo dưỡng [${code}] thành công!`);
      await fetchData();
    } catch (err: any) {
      toast.error(formatError(err));
    }
  };

  // Handle Calibration Log
  const handleOpenCreateCal = (eq?: EquipmentItem) => {
    const codeNum = String(calibrationLogs.length + 1).padStart(3, "0");
    const targetEq = eq || equipments[0];
    const todayStr = new Date().toISOString().split("T")[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    setCalForm({
      equipment_id: targetEq?.equipment_id || "",
      calibration_code: `CAL-2026-${codeNum}`,
      calibration_type: "EXTERNAL",
      calibration_date: todayStr,
      expiry_date: nextYear.toISOString().split("T")[0],
      agency_name: "Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng 3 (QUATEST 3)",
      certificate_number: `HC-QT3-2026-${codeNum}`,
      standard_applied: "ISO/IEC 17025:2017 & ĐLVN",
      measured_deviation: 0.04,
      allowable_tolerance: 0.5,
      is_passed: true,
      status: "PASSED",
      calibrator_name: "KTV Kiểm định QUATEST",
      notes: "Độ lệch trong giới hạn cho phép.",
    });
    setIsCalModalOpen(true);
  };

  const handleSaveCal = async (e: React.FormEvent) => {
    e.preventDefault();

    // ================= VALIDATE NGHIỆP VỤ HIỆU CHUẨN ĐO LƯỜNG =================
    const code = calForm.calibration_code?.trim();
    if (!code || code.length < 2) {
      toast.error("Lỗi nghiệp vụ: Mã biên bản hiệu chuẩn là bắt buộc.");
      return;
    }
    if (!calForm.equipment_id) {
      toast.error("Lỗi nghiệp vụ: Vui lòng chọn thiết bị đo lường cần kiểm định.");
      return;
    }
    if (!calForm.calibration_date) {
      toast.error("Lỗi nghiệp vụ: Ngày hiệu chuẩn là bắt buộc.");
      return;
    }
    if (!calForm.expiry_date) {
      toast.error("Lỗi nghiệp vụ: Ngày hết hạn kiểm định (hạn tem) là bắt buộc.");
      return;
    }
    if (calForm.expiry_date < calForm.calibration_date) {
      toast.error("Lỗi logic: Ngày hết hạn kiểm định phải lớn hơn hoặc bằng Ngày hiệu chuẩn.");
      return;
    }

    const certNum = calForm.certificate_number?.trim();
    if (!certNum) {
      toast.error("Lỗi nghiệp vụ ISO 22000 (Điều khoản 7.1.5.2): Số tem kiểm định / Số giấy chứng nhận là bắt buộc để truy xuất nguồn gốc đo lường.");
      return;
    }

    const agency = calForm.agency_name?.trim();
    if (!agency) {
      toast.error("Lỗi nghiệp vụ: Đơn vị / Phòng thí nghiệm kiểm định là bắt buộc.");
      return;
    }

    const dev = Number(calForm.measured_deviation);
    if (isNaN(dev)) {
      toast.error("Lỗi dữ liệu: Sai số thực tế đo được phải là một số hợp lệ.");
      return;
    }

    const tol = Number(calForm.allowable_tolerance);
    if (isNaN(tol) || tol <= 0) {
      toast.error("Lỗi dữ liệu: Dung sai cho phép (+/-) phải là số dương lớn hơn 0.");
      return;
    }

    const passed = Math.abs(dev) <= Math.abs(tol);

    try {
      const payload = {
        equipment_id: calForm.equipment_id,
        calibration_code: code,
        calibration_type: calForm.calibration_type,
        calibration_date: calForm.calibration_date,
        expiry_date: calForm.expiry_date,
        agency_name: agency,
        certificate_number: certNum,
        standard_applied: calForm.standard_applied?.trim() || "ISO/IEC 17025:2017 & ĐLVN",
        measured_deviation: dev,
        allowable_tolerance: tol,
        is_passed: passed,
        status: passed ? "PASSED" : "FAILED",
        calibrator_name: calForm.calibrator_name?.trim() || null,
        notes: calForm.notes?.trim() || null,
      };
      await api.post("/equipment/calibration-logs", payload);
      setIsCalModalOpen(false);
      toast.success(`Đã lưu biên bản kiểm định/hiệu chuẩn [${code}] thành công!`);
      await fetchData();
    } catch (err: any) {
      toast.error(formatError(err));
    }
  };

  // Run AI Predict
  const handleRunAiMaint = async () => {
    setAiMaintLoading(true);
    try {
      const res = await api.post("/equipment/ai/predict-maintenance", aiMaintReq);
      setAiMaintResult(res.data);
      toast.success("Trợ lý AI đã phân tích xong lịch bảo dưỡng dự đoán!");
    } catch (err: any) {
      toast.error(formatError(err));
    } finally {
      setAiMaintLoading(false);
    }
  };

  // Run AI Calibration Evaluation
  const handleRunAiCal = async () => {
    setAiCalLoading(true);
    try {
      const res = await api.post("/equipment/ai/evaluate-calibration", aiCalReq);
      setAiCalResult(res.data);
      toast.success("Trợ lý AI đã đánh giá xong dung sai đo lường!");
    } catch (err: any) {
      toast.error(formatError(err));
    } finally {
      setAiCalLoading(false);
    }
  };

  // Thực hiện in qua hidden iframe
  const triggerPrintEquipmentProfile = (eq: EquipmentItem) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BM-TB-01 - Phiếu Lý Lịch Thiết Bị [${eq.equipment_code}]</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { font-family: 'Times New Roman', Times, serif; padding: 10px; color: #111; line-height: 1.45; font-size: 13px; background: #fff; }
          .header-table { width: 100%; border: 2px solid #0f172a; border-collapse: collapse; margin-bottom: 16px; }
          .header-table td { border: 1px solid #0f172a; padding: 8px 10px; vertical-align: middle; }
          .logo-box { width: 25%; text-align: center; background-color: #f8fafc; }
          .logo-title { font-size: 14px; font-weight: 900; color: #047857; letter-spacing: 0.5px; }
          .logo-sub { font-size: 9.5px; color: #475569; font-weight: 700; text-transform: uppercase; }
          .title-box { width: 50%; text-align: center; }
          .title-main { font-size: 14px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-top: 3px; }
          .meta-box { width: 25%; font-size: 10.5px; background-color: #f8fafc; line-height: 1.4; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12.5px; }
          table.data-table th, table.data-table td { border: 1px solid #0f172a; padding: 7px 10px; text-align: left; vertical-align: middle; }
          table.data-table th { background-color: #f1f5f9; font-weight: bold; }
          .meta-title { font-weight: bold; width: 28%; background-color: #f8fafc; }
          .sig-box { margin-top: 35px; display: flex; justify-content: space-between; text-align: center; page-break-inside: avoid; }
          .sig-col { width: 45%; font-size: 12px; }
          .footer-note { margin-top: 25px; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="logo-box">
              <img src="${origin}/logo.png" alt="Logo" style="max-height: 42px; width: auto; object-fit: contain; margin: 0 auto 4px; display: block;" onerror="this.style.display='none'" />
              <div class="logo-title">WCERT FSMS</div>
              <div class="logo-sub">ISO 22000:2018</div>
            </td>
            <td class="title-box">
              <div style="font-size: 9.5px; font-weight: bold; color: #475569; text-transform: uppercase;">
                HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM
              </div>
              <div class="title-main">PHIẾU LÝ LỊCH THIẾT BỊ</div>
              <div style="font-size: 10px; font-style: italic; color: #64748b; margin-top: 2px;">(Theo dõi nguồn lực đo lường & bảo trì)</div>
            </td>
            <td class="meta-box">
              <div><b>Biểu mẫu:</b> BM-TB-01</div>
              <div><b>Mã máy:</b> ${eq.equipment_code}</div>
              <div><b>Ban hành:</b> Lần 02 (2026)</div>
              <div><b>Tiêu chuẩn:</b> ISO 7.1.5 & 8.2</div>
            </td>
          </tr>
        </table>

        <table class="data-table">
          <tr>
            <td class="meta-title">Mã số thiết bị:</td>
            <td style="font-weight: bold; font-size: 13.5px; color: #047857;">${eq.equipment_code}</td>
            <td class="meta-title">Phân nhóm thiết bị:</td>
            <td><b>${CATEGORY_MAP[eq.category]?.label || eq.category}</b></td>
          </tr>
          <tr>
            <td class="meta-title">Tên thiết bị:</td>
            <td colspan="3" style="font-weight: bold; font-size: 13px;">${eq.equipment_name}</td>
          </tr>
          <tr>
            <td class="meta-title">Model / Số Serial:</td>
            <td>${eq.model || "—"} / ${eq.serial_number || "—"}</td>
            <td class="meta-title">Hãng sản xuất:</td>
            <td>${eq.manufacturer || "—"}</td>
          </tr>
          <tr>
            <td class="meta-title">Vị trí lắp đặt:</td>
            <td>${eq.installation_location || "—"}</td>
            <td class="meta-title">Mức độ trọng yếu ATTP:</td>
            <td><b>${CRITICALITY_MAP[eq.criticality_level]?.label || eq.criticality_level}</b></td>
          </tr>
          <tr>
            <td class="meta-title">Chu kỳ hiệu chuẩn quy định:</td>
            <td>${eq.calibration_frequency_months} tháng/lần (Hạn tới: <b>${eq.next_calibration_due || "—"}</b>)</td>
            <td class="meta-title">Chu kỳ bảo trì PM quy định:</td>
            <td>${eq.maintenance_frequency_days} ngày/lần (Hạn tới: <b>${eq.next_maintenance_due || "—"}</b>)</td>
          </tr>
          <tr>
            <td class="meta-title">Tình trạng tem hiệu chuẩn:</td>
            <td><b>${CALIBRATION_STATUS_MAP[eq.calibration_status]?.label || eq.calibration_status}</b></td>
            <td class="meta-title">Trạng thái vận hành:</td>
            <td><b>${STATUS_MAP[eq.status]?.label || eq.status}</b></td>
          </tr>
          <tr>
            <td class="meta-title">Lịch sử tích lũy hồ sơ:</td>
            <td colspan="3">Đã ghi nhận <b>${eq.total_calibration_logs || 0}</b> lượt hiệu chuẩn và <b>${eq.total_maintenance_logs || 0}</b> lượt bảo dưỡng phòng ngừa (PM).</td>
          </tr>
          <tr>
            <td class="meta-title">Ghi chú & Quy định ATTP:</td>
            <td colspan="3">${eq.notes || "Bắt buộc sử dụng dầu nhờn thực phẩm an toàn NSF H1 và vệ sinh khử trùng buồng máy trước khi bàn giao sản xuất."}</td>
          </tr>
        </table>

        <div style="border: 1px dashed #047857; background: #f0fdf4; padding: 10px; border-radius: 6px; margin: 15px 0; font-size: 11.5px; color: #166534;">
          <b>✓ TIÊU CHUẨN KIỂM SOÁT THIẾT BỊ CHẾ BIẾN THỰC PHẨM (ISO/TS 22002-1):</b><br/>
          Thiết bị được theo dõi định kỳ bảo trì dự phòng (PM), bôi trơn bằng mỡ an toàn thực phẩm NSF H1 và hiệu chuẩn đo lường định kỳ bởi đơn vị được công nhận ISO/IEC 17025.
        </div>

        <div class="sig-box">
          <div class="sig-col">
            <b>CÁN BỘ PHỤ TRÁCH THIẾT BỊ</b><br/>
            <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
            <b>${eq.manager_name || "Nguyễn Văn Kỹ Thuật"}</b><br/>
            <span style="font-size: 10px; color: #64748b;">Tổ Trưởng Cơ Điện & Bảo Trì</span>
          </div>
          <div class="sig-col">
            <b>TRƯỞNG BAN QLCL & ATTP (QA/QC)</b><br/>
            <i>(Ký duyệt xác nhận)</i><br/><br/><br/><br/>
            <b>Ban Quản Lý Chất Lượng</b><br/>
            <span style="font-size: 10px; color: #64748b;">Phê duyệt Hồ sơ Thiết bị</span>
          </div>
        </div>

        <div class="footer-note">
          WCERT FSMS • HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM THEO TIÊU CHUẨN QUỐC TẾ ISO 22000:2018
        </div>
      </body>
      </html>
    `;
    printHtml(htmlContent);
  };

  // Thực hiện in Biên bản Hiệu chuẩn qua hidden iframe
  const triggerPrintCalibrationCert = (cal: CalibrationLogItem) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BM-HC-02 - Biên Bản Hiệu Chuẩn [${cal.calibration_code}]</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { font-family: 'Times New Roman', Times, serif; padding: 10px; color: #111; line-height: 1.45; font-size: 13px; background: #fff; }
          .header-table { width: 100%; border: 2px solid #0f172a; border-collapse: collapse; margin-bottom: 16px; }
          .header-table td { border: 1px solid #0f172a; padding: 8px 10px; vertical-align: middle; }
          .logo-box { width: 25%; text-align: center; background-color: #f8fafc; }
          .logo-title { font-size: 14px; font-weight: 900; color: #047857; letter-spacing: 0.5px; }
          .logo-sub { font-size: 9.5px; color: #475569; font-weight: 700; text-transform: uppercase; }
          .title-box { width: 50%; text-align: center; }
          .title-main { font-size: 14px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-top: 3px; }
          .meta-box { width: 25%; font-size: 10.5px; background-color: #f8fafc; line-height: 1.4; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12.5px; }
          table.data-table th, table.data-table td { border: 1px solid #0f172a; padding: 7px 10px; text-align: left; vertical-align: middle; }
          table.data-table th { background-color: #f1f5f9; font-weight: bold; }
          .meta-title { font-weight: bold; width: 30%; background-color: #f8fafc; }
          .stamp-box { text-align: center; border: 2px dashed #047857; padding: 10px; margin: 15px 0; color: #047857; font-weight: bold; font-size: 13.5px; background: #f0fdf4; }
          .sig-box { margin-top: 35px; display: flex; justify-content: space-between; text-align: center; page-break-inside: avoid; }
          .sig-col { width: 45%; font-size: 12px; }
          .footer-note { margin-top: 25px; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="logo-box">
              <img src="${origin}/logo.png" alt="Logo" style="max-height: 42px; width: auto; object-fit: contain; margin: 0 auto 4px; display: block;" onerror="this.style.display='none'" />
              <div class="logo-title">WCERT FSMS</div>
              <div class="logo-sub">ISO 22000:2018</div>
            </td>
            <td class="title-box">
              <div style="font-size: 9.5px; font-weight: bold; color: #475569; text-transform: uppercase;">
                HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM
              </div>
              <div class="title-main">BIÊN BẢN HIỆU CHUẨN ĐO LƯỜNG</div>
              <div style="font-size: 10px; font-style: italic; color: #64748b; margin-top: 2px;">(Kiểm soát thiết bị theo dõi & đo lường ISO 7.1.5.2)</div>
            </td>
            <td class="meta-box">
              <div><b>Biểu mẫu:</b> BM-HC-02</div>
              <div><b>Mã phiếu:</b> ${cal.calibration_code}</div>
              <div><b>Ban hành:</b> Lần 02 (2026)</div>
              <div><b>Tiêu chuẩn:</b> ISO/IEC 17025</div>
            </td>
          </tr>
        </table>

        <table class="data-table">
          <tr>
            <td class="meta-title">Mã số thiết bị:</td>
            <td style="font-weight: bold; font-size: 13px; color: #047857;">${cal.equipment_code || "—"}</td>
            <td class="meta-title">Tên thiết bị:</td>
            <td style="font-weight: bold;">${cal.equipment_name || "—"}</td>
          </tr>
          <tr>
            <td class="meta-title">Hình thức hiệu chuẩn:</td>
            <td>${cal.calibration_type === "EXTERNAL" ? "Kiểm định Ngoài (QUATEST 3 / VILAS)" : "Hiệu chuẩn Nội bộ"}</td>
            <td class="meta-title">Đơn vị thực hiện:</td>
            <td><b>${cal.agency_name || "Phòng Thử nghiệm KCS"}</b></td>
          </tr>
          <tr>
            <td class="meta-title">Số tem / Giấy chứng nhận:</td>
            <td style="font-weight: bold;">${cal.certificate_number || "—"}</td>
            <td class="meta-title">Tiêu chuẩn áp dụng:</td>
            <td>${cal.standard_applied || "ISO/IEC 17025 / ĐLVN"}</td>
          </tr>
          <tr>
            <td class="meta-title">Ngày hiệu chuẩn:</td>
            <td>${cal.calibration_date}</td>
            <td class="meta-title">Ngày hết hạn kiểm định:</td>
            <td style="font-weight: bold; color: #047857; font-size: 13px;">${cal.expiry_date}</td>
          </tr>
          <tr>
            <td class="meta-title">Sai số đo đạc thực tế:</td>
            <td style="font-weight: bold; font-family: monospace;">${cal.measured_deviation !== undefined ? cal.measured_deviation : "—"}</td>
            <td class="meta-title">Dung sai cho phép (+/-):</td>
            <td style="font-family: monospace;">${cal.allowable_tolerance !== undefined ? `+/- ${cal.allowable_tolerance}` : "—"}</td>
          </tr>
          <tr>
            <td class="meta-title">Kết luận thẩm định:</td>
            <td colspan="3" style="font-weight: bold; color: ${cal.is_passed ? '#047857' : '#be123c'}; font-size: 13px;">
              ${cal.is_passed ? "✓ ĐẠT YÊU CẦU ĐỘ CHÍNH XÁC (PASSED) — TEM KIỂM ĐỊNH HỢP LỆ" : "✕ KHÔNG ĐẠT YÊU CẦU (FAILED) — DÁN NHÃN NGƯNG SỬ DỤNG"}
            </td>
          </tr>
          <tr>
            <td class="meta-title">Nhận xét & Đánh giá:</td>
            <td colspan="3">${cal.notes || "Thiết bị đo lường đáp ứng đầy đủ yêu cầu kiểm soát CCP và giám sát thông số quá trình chế biến."}</td>
          </tr>
        </table>

        <div class="stamp-box">
          ✓ ĐÃ ĐƯỢC THẨM ĐỊNH THEO CHUẨN ĐO LƯỜNG VIỆT NAM (ĐLVN / QUATEST 3 / ISO 17025)
        </div>

        <div class="sig-box">
          <div class="sig-col">
            <b>CÁN BỘ / ĐƠN VỊ HIỆU CHUẨN</b><br/>
            <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
            <b>${cal.calibrator_display_name || cal.calibrator_name || "Kiểm định viên"}</b><br/>
            <span style="font-size: 10px; color: #64748b;">Đơn vị Đo Lường Kiểm Định</span>
          </div>
          <div class="sig-col">
            <b>TRƯỞNG BAN QLCL & ATTP (QA/QC)</b><br/>
            <i>(Ký duyệt lưu hồ sơ)</i><br/><br/><br/><br/>
            <b>Ban An Toàn Thực Phẩm</b><br/>
            <span style="font-size: 10px; color: #64748b;">Thẩm tra tính hợp lệ của phép đo</span>
          </div>
        </div>

        <div class="footer-note">
          WCERT FSMS • HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM THEO TIÊU CHUẨN QUỐC TẾ ISO 22000:2018
        </div>
      </body>
      </html>
    `;
    printHtml(htmlContent);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* HEADER & TOP ACTIONS */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Quản lý Thiết bị, Hiệu chuẩn & Bảo trì máy móc"
          description="Kiểm soát vòng đời thiết bị, hạn tem hiệu chuẩn QUATEST/VILAS & bảo dưỡng phòng ngừa theo ISO 22000 Điều khoản 7.1.5 & 8.2."
        />

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="flex-1 sm:flex-initial gap-1.5 text-xs h-9 sm:h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>Làm mới</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("ai")}
            className="flex-1 sm:flex-initial gap-1.5 border-purple-500/30 bg-purple-500/5 text-xs text-purple-700 hover:bg-purple-500/10 dark:text-purple-300 h-9 sm:h-8"
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
            <span className="truncate">Trợ lý AI Bảo trì</span>
          </Button>

          <Button onClick={handleOpenCreateEq} size="sm" className="w-full sm:w-auto gap-1.5 text-xs shadow-sm h-9 sm:h-8 font-semibold">
            <Plus className="h-4 w-4" />
            Thêm thiết bị mới
          </Button>
        </div>
      </div>

      {/* 4 THẺ KPI TỔNG QUAN (RESPONSIVE: 2 COLS MOBILE, 4 COLS DESKTOP) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* KPI 1 */}
        <div className="rounded-xl sm:rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">
              Tổng số thiết bị
            </span>
            <div className="grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-lg sm:rounded-xl bg-primary/10 text-primary">
              <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold tracking-tight">
              {stats?.total_equipments || equipments.length}
            </span>
            <span className="text-[10px] sm:text-xs text-emerald-600 font-medium line-clamp-1">
              ({stats?.operational_count || 0} Đang chạy)
            </span>
          </div>
          <div className="mt-1 text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
            {stats?.under_maintenance_count || 0} máy đang bảo dưỡng
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-xl sm:rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">
              Tuân thủ Hiệu chuẩn
            </span>
            <div className="grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600">
              {stats?.calibration_compliance_rate || 100}%
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">độ chuẩn xác</span>
          </div>
          <div className="mt-1 text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
            {stats?.calibration_valid_count || 0} máy có tem hợp lệ
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-xl sm:rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">
              Cảnh báo Hạn tem
            </span>
            <div className="grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600">
              {(stats?.calibration_expiring_soon_count || 0) + (stats?.calibration_overdue_count || 0)}
            </span>
            <span className="text-[10px] sm:text-xs text-rose-600 font-semibold line-clamp-1">
              ({stats?.calibration_overdue_count || 0} Quá hạn)
            </span>
          </div>
          <div className="mt-1 text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
            {stats?.calibration_expiring_soon_count || 0} máy sắp hết hạn
          </div>
        </div>

        {/* KPI 4 */}
        <div className="rounded-xl sm:rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">
              Kế hoạch PM tháng
            </span>
            <div className="grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-lg sm:rounded-xl bg-purple-500/10 text-purple-600">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-purple-600">
              {stats?.preventive_maintenance_due_this_month || 0}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">phiếu bảo dưỡng</span>
          </div>
          <div className="mt-1 text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
            Đã làm {stats?.total_maintenance_logs_year || 0} lượt PM
          </div>
        </div>
      </div>

      {/* THANH TABS ĐIỀU HƯỚNG CHUYÊN SÂU (CUỘN NGANG MƯỢT MÀ TRÊN MOBILE) */}
      <div className="border-b overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="flex space-x-1.5 sm:space-x-2 min-w-max pb-2">
          <button
            onClick={() => setActiveTab("equipments")}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
              activeTab === "equipments"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>Hồ sơ Lý lịch</span>
            <span
              className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] sm:text-[11px] ${
                activeTab === "equipments" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {equipments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("calibration")}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
              activeTab === "calibration"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Gauge className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>Nhật ký Hiệu chuẩn</span>
            <span
              className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] sm:text-[11px] ${
                activeTab === "calibration" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {calibrationLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("maintenance")}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
              activeTab === "maintenance"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Sliders className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>Kế hoạch Bảo trì (PM)</span>
            <span
              className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] sm:text-[11px] ${
                activeTab === "maintenance" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {maintenanceLogs.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("ai");
              if (!aiMaintResult) handleRunAiMaint();
            }}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all ${
              activeTab === "ai"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
                : "text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/30"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>Trợ lý AI Bảo trì</span>
            <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
              AI Tool
            </span>
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: DANH MỤC THIẾT BỊ ==================== */}
      {activeTab === "equipments" && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS BAR */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã máy, tên thiết bị, model, vị trí..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs sm:text-sm h-9"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto rounded-lg border bg-background px-2.5 py-2 text-xs font-medium shadow-sm h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Tất cả Phân nhóm</option>
                <option value="MEASURING">Đo lường & Kiểm định</option>
                <option value="PROCESSING">Chế biến & Sản xuất</option>
                <option value="STORAGE">Lưu trữ & Cấp đông</option>
                <option value="UTILITY">Phụ trợ & Nguồn nước</option>
              </select>

              <select
                value={criticalityFilter}
                onChange={(e) => setCriticalityFilter(e.target.value)}
                className="w-full sm:w-auto rounded-lg border bg-background px-2.5 py-2 text-xs font-medium shadow-sm h-9 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Mọi Mức độ ATTP</option>
                <option value="HIGH_CCP">Kiểm soát CCP</option>
                <option value="MEDIUM_OPRP">Kiểm soát oPRP</option>
                <option value="LOW_PRP">Nền tảng PRP</option>
              </select>
            </div>
          </div>

          {/* EQUIPMENT CARDS GRID (RESPONSIVE: 1 COL MOBILE, 2 COLS TABLET, 3 COLS DESKTOP) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredEquipments.map((eq) => {
              const CatIcon = CATEGORY_MAP[eq.category]?.icon || Wrench;
              const isOverdue = eq.calibration_status === "EXPIRED";
              const isExpSoon = eq.calibration_status === "EXPIRING_SOON";

              return (
                <div
                  key={eq.equipment_id}
                  className={`rounded-2xl border bg-card p-3.5 sm:p-4 shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                    isOverdue
                      ? "border-rose-300 ring-1 ring-rose-300 dark:border-rose-800"
                      : isExpSoon
                      ? "border-amber-300 dark:border-amber-800"
                      : ""
                  }`}
                >
                  <div>
                    {/* Card Top: Badges & Code */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                          <CatIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-mono text-xs font-bold text-primary">
                            {eq.equipment_code}
                          </span>
                          <div className="text-[11px] text-muted-foreground">{eq.model || "Chưa có model"}</div>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] border shrink-0 ${
                          CRITICALITY_MAP[eq.criticality_level]?.tone || "bg-muted text-muted-foreground"
                        }`}
                      >
                        {CRITICALITY_MAP[eq.criticality_level]?.label || eq.criticality_level}
                      </span>
                    </div>

                    {/* Machine Name */}
                    <h4 className="mt-2.5 text-sm font-bold text-foreground line-clamp-2">
                      {eq.equipment_name}
                    </h4>

                    {/* Location & Specs */}
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Vị trí lắp đặt:</span>
                        <span className="font-medium text-foreground text-right">{eq.installation_location || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Hãng sản xuất:</span>
                        <span className="font-medium text-foreground text-right">{eq.manufacturer || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Trạng thái máy:</span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[10px] font-semibold border ${
                            STATUS_MAP[eq.status]?.tone || "bg-muted text-muted-foreground"
                          }`}
                        >
                          {STATUS_MAP[eq.status]?.label || eq.status}
                        </span>
                      </div>
                    </div>

                    {/* Section: Tiêu chuẩn quy định vs Thực tế hoạt động */}
                    <div className="mt-3 rounded-xl border bg-muted/30 p-2.5 space-y-2 text-xs">
                      {/* Hiệu chuẩn */}
                      <div className="border-b pb-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 font-semibold text-foreground">
                            <Gauge className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            Hiệu chuẩn:
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[10px] border ${
                              CALIBRATION_STATUS_MAP[eq.calibration_status]?.tone || "bg-muted text-muted-foreground"
                            }`}
                          >
                            {CALIBRATION_STATUS_MAP[eq.calibration_status]?.label || eq.calibration_status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Quy định tiêu chuẩn:</span>
                          <span className="font-medium text-foreground">{eq.calibration_frequency_months} tháng/lần</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Hạn kiểm định tới:</span>
                          <span className="font-bold text-foreground">{eq.next_calibration_due || "Chưa có"}</span>
                        </div>
                      </div>

                      {/* Bảo trì PM */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 font-semibold text-foreground">
                            <Calendar className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                            Bảo trì phòng ngừa (PM):
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Đã làm {eq.total_maintenance_logs || 0} đợt
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Chu kỳ định kỳ:</span>
                          <span className="font-medium text-foreground">{eq.maintenance_frequency_days} ngày/lần</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Hạn bảo dưỡng tới:</span>
                          <span className="font-bold text-foreground">{eq.next_maintenance_due || "Chưa lên lịch"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-3 pt-2.5 border-t flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex flex-wrap items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPrintEq(eq);
                          setShowPrintProfileModal(true);
                        }}
                        className="h-7 px-2 text-[11px] gap-1"
                        title="Xem và In Phiếu Lý Lịch Thiết Bị (BM-TB-01)"
                      >
                        <Printer className="h-3 w-3" />
                        In BM-TB-01
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCreateMaint(eq)}
                        className="h-7 px-2 text-[11px] gap-1 text-purple-700 hover:bg-purple-50"
                        title="Lập phiếu bảo dưỡng máy"
                      >
                        <Sliders className="h-3 w-3" />
                        Bảo trì
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCreateCal(eq)}
                        className="h-7 px-2 text-[11px] gap-1 text-blue-700 hover:bg-blue-50"
                        title="Ghi nhận tem hiệu chuẩn"
                      >
                        <Gauge className="h-3 w-3" />
                        Hiệu chuẩn
                      </Button>
                    </div>

                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => handleOpenEditEq(eq)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                        title="Sửa thông tin máy"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingEqItem({ id: eq.equipment_id, name: eq.equipment_name })}
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                        title="Xoá thiết bị"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredEquipments.length === 0 && (
            <div className="rounded-2xl border bg-card p-8 sm:p-12 text-center text-muted-foreground text-xs sm:text-sm">
              Không tìm thấy thiết bị nào phù hợp với bộ lọc tìm kiếm.
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: NHẬT KÝ HIỆU CHUẨN ==================== */}
      {activeTab === "calibration" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold tracking-tight">Hồ sơ Tem & Biên bản Hiệu chuẩn Đo lường</h3>
              <p className="text-xs text-muted-foreground">
                Quản lý các chứng nhận kiểm định từ QUATEST 3, VILAS và nội bộ theo chuẩn ISO/IEC 17025 (Sắp xếp mới nhất trước).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select
                  value={selectedEqFilterForLogs}
                  onChange={(e) => setSelectedEqFilterForLogs(e.target.value)}
                  className="w-full sm:w-auto rounded-lg border bg-background px-3 py-1.5 text-xs font-medium shadow-sm h-9"
                >
                  <option value="ALL">Tất cả thiết bị</option>
                  {equipments.map((e) => (
                    <option key={e.equipment_id} value={e.equipment_id}>
                      {e.equipment_code} - {e.equipment_name}
                    </option>
                  ))}
                </select>
              </div>

              <Button onClick={() => handleOpenCreateCal()} size="sm" className="gap-1.5 text-xs h-9">
                <Plus className="h-4 w-4" />
                Lập phiếu hiệu chuẩn mới
              </Button>
            </div>
          </div>

          {/* TABLE OF CALIBRATIONS */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="px-3.5 py-2.5 text-center w-10">STT</th>
                  <th className="px-3.5 py-2.5">Mã phiếu / Số tem</th>
                  <th className="px-3.5 py-2.5">Thiết bị đo</th>
                  <th className="px-3.5 py-2.5">Đơn vị kiểm định</th>
                  <th className="px-3.5 py-2.5 text-center">Sai số</th>
                  <th className="px-3.5 py-2.5 text-center">Dung sai (+/-)</th>
                  <th className="px-3.5 py-2.5 text-center">Hạn kiểm định</th>
                  <th className="px-3.5 py-2.5 text-center">Kết luận</th>
                  <th className="px-3.5 py-2.5 text-right">In mẫu</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCalLogs.map((c, index) => (
                  <tr key={c.calibration_id} className="hover:bg-muted/30">
                    <td className="px-3.5 py-2.5 text-center font-medium text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-mono font-bold text-primary">{c.calibration_code}</div>
                      <div className="text-[11px] text-muted-foreground">{c.certificate_number || "—"}</div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-semibold text-foreground">{c.equipment_name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{c.equipment_code}</div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="text-foreground">{c.agency_name || "Phòng KCS"}</div>
                      <div className="text-[10px] text-muted-foreground">{c.standard_applied || "ISO/IEC 17025"}</div>
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-mono font-semibold">
                      {c.measured_deviation !== undefined ? c.measured_deviation : "—"}
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-mono text-muted-foreground">
                      {c.allowable_tolerance !== undefined ? `+/- ${c.allowable_tolerance}` : "—"}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <div className="font-semibold text-foreground">{c.expiry_date}</div>
                      <div className="text-[10px] text-muted-foreground">Hiệu chuẩn: {c.calibration_date}</div>
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          c.is_passed
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                            : "bg-rose-500/10 text-rose-700 border-rose-200"
                        }`}
                      >
                        {c.is_passed ? "ĐẠT" : "LỖI"}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPrintCal(c);
                          setShowPrintCalModal(true);
                        }}
                        className="h-7 px-2 text-[11px] gap-1"
                      >
                        <Printer className="h-3 w-3" />
                        In
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCalLogs.length === 0 && (
            <div className="rounded-2xl border bg-card p-8 sm:p-12 text-center text-muted-foreground text-xs sm:text-sm">
              Không tìm thấy biên bản hiệu chuẩn nào cho thiết bị đã chọn.
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: KẾ HOẠCH BẢO TRÌ ==================== */}
      {activeTab === "maintenance" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold tracking-tight">Nhật ký Bảo trì Phòng ngừa (PM) & Sửa chữa</h3>
              <p className="text-xs text-muted-foreground">
                Ghi nhận đầu việc bảo dưỡng, kiểm soát bắt buộc dầu mỡ an toàn thực phẩm NSF H1 & vệ sinh khử trùng sau bảo trì.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select
                  value={selectedEqFilterForLogs}
                  onChange={(e) => setSelectedEqFilterForLogs(e.target.value)}
                  className="w-full sm:w-auto rounded-lg border bg-background px-3 py-1.5 text-xs font-medium shadow-sm h-9"
                >
                  <option value="ALL">Tất cả thiết bị</option>
                  {equipments.map((e) => (
                    <option key={e.equipment_id} value={e.equipment_id}>
                      {e.equipment_code} - {e.equipment_name}
                    </option>
                  ))}
                </select>
              </div>

              <Button onClick={() => handleOpenCreateMaint()} size="sm" className="gap-1.5 text-xs h-9">
                <Plus className="h-4 w-4" />
                Lập phiếu bảo trì mới
              </Button>
            </div>
          </div>

          {/* TABLE OF MAINTENANCE LOGS */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="px-3.5 py-2.5 text-center w-10">STT</th>
                  <th className="px-3.5 py-2.5">Mã phiếu / Ngày</th>
                  <th className="px-3.5 py-2.5">Thiết bị</th>
                  <th className="px-3.5 py-2.5">Loại bảo trì</th>
                  <th className="px-3.5 py-2.5">Nội dung công việc</th>
                  <th className="px-3.5 py-2.5 text-center">NSF H1</th>
                  <th className="px-3.5 py-2.5 text-center">Khử trùng</th>
                  <th className="px-3.5 py-2.5">Người thực hiện</th>
                  <th className="px-3.5 py-2.5 text-center">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMaintLogs.map((m, index) => (
                  <tr key={m.maintenance_id} className="hover:bg-muted/30">
                    <td className="px-3.5 py-2.5 text-center font-medium text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-mono font-bold text-primary">{m.maintenance_code}</div>
                      <div className="text-[11px] text-muted-foreground">{m.maintenance_date}</div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-semibold text-foreground">{m.equipment_name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{m.equipment_code}</div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200">
                        {m.maintenance_type === "PREVENTIVE" ? "Bảo trì PM" : m.maintenance_type}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 max-w-xs">
                      <div className="line-clamp-2 text-foreground">
                        {m.tasks_performed && m.tasks_performed.length > 0
                          ? m.tasks_performed.map((t) => t.task).join("; ")
                          : m.notes || "—"}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      {m.food_grade_lubricant_used ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Đạt
                        </span>
                      ) : (
                        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                          K/dùng
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      {m.hygiene_sanitation_after_maint ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="h-3 w-3" />
                          Đã KT
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Chưa
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-foreground">
                      {m.performer_display_name || m.performer_name || "—"}
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        {m.result_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredMaintLogs.length === 0 && (
            <div className="rounded-2xl border bg-card p-8 sm:p-12 text-center text-muted-foreground text-xs sm:text-sm">
              Không tìm thấy phiếu bảo trì nào cho thiết bị đã chọn.
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 4: TRỢ LÝ AI BẢO TRÌ & DỰ ĐOÁN ==================== */}
      {activeTab === "ai" && (
        <div className="space-y-4 sm:space-y-6">
          <AIBadge>
            <b>AI Kỹ thuật & Bảo trì thông minh:</b> Tự động hóa dự báo hỏng hóc máy móc theo dữ liệu cảm biến & Thẩm định rủi ro an toàn thực phẩm khi thiết bị đo lệch dung sai theo ISO 22000:2018 Điều khoản 7.1.5.2.
          </AIBadge>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* TOOL 1: AI PREDICTIVE MAINTENANCE */}
            <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2.5 border-b pb-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-purple-500/10 text-purple-600 shrink-0">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">1. AI Dự Báo Hỏng Hóc Máy Móc (Predictive PM)</h4>
                  <p className="text-xs text-muted-foreground">
                    Phân tích rung động, nhiệt độ và giờ chạy để đề xuất chu kỳ bảo trì tối ưu.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div>
                  <Label className="text-xs">Chọn thiết bị kiểm tra:</Label>
                  <select
                    value={aiMaintReq.equipment_code}
                    onChange={(e) => {
                      const sel = equipments.find((x) => x.equipment_code === e.target.value);
                      setAiMaintReq({
                        ...aiMaintReq,
                        equipment_code: e.target.value,
                        equipment_name: sel ? sel.equipment_name : "",
                      });
                    }}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-xs font-medium h-9"
                  >
                    {equipments.map((e) => (
                      <option key={e.equipment_code} value={e.equipment_code}>
                        {e.equipment_code} - {e.equipment_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-xs">Mức độ rung động cảm biến:</Label>
                    <select
                      value={aiMaintReq.sensor_vibration_level}
                      onChange={(e) => setAiMaintReq({ ...aiMaintReq, sensor_vibration_level: e.target.value })}
                      className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-xs font-medium h-9"
                    >
                      <option value="Bình thường">Bình thường</option>
                      <option value="Hơi rung">Hơi rung</option>
                      <option value="Rung mạnh">Rung mạnh (Cảnh báo)</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs">Nhiệt độ động cơ (°C):</Label>
                    <Input
                      type="number"
                      value={aiMaintReq.current_temperature_c}
                      onChange={(e) => setAiMaintReq({ ...aiMaintReq, current_temperature_c: Number(e.target.value) })}
                      className="mt-1 text-xs h-9"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleRunAiMaint}
                  disabled={aiMaintLoading}
                  className="w-full gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-xs text-white h-9 font-semibold"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${aiMaintLoading ? "animate-spin" : ""}`} />
                  Chạy AI Phân tích Sức khỏe Máy
                </Button>
              </div>

              {/* AI RESULT 1 */}
              {aiMaintResult && (
                <div className="rounded-xl border bg-purple-500/5 p-3.5 space-y-2.5 text-xs border-purple-200 dark:border-purple-900">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-purple-900 dark:text-purple-300">
                      Điểm sức khỏe máy:
                    </span>
                    <span className="text-lg font-bold text-purple-700">
                      {aiMaintResult.health_score} / 100
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mức độ rủi ro hỏng hóc:</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                        aiMaintResult.estimated_failure_risk === "CẤP BÁCH"
                          ? "bg-rose-500 text-white"
                          : aiMaintResult.estimated_failure_risk === "TRUNG BÌNH"
                          ? "bg-amber-500 text-white"
                          : "bg-emerald-500 text-white"
                      }`}
                    >
                      {aiMaintResult.estimated_failure_risk}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-foreground">Hành động khuyến nghị:</span>
                    <p className="mt-0.5 text-muted-foreground leading-relaxed">
                      {aiMaintResult.recommended_action}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-foreground">Hạng mục bắt buộc kiểm tra:</span>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5 text-muted-foreground">
                      {aiMaintResult.tasks_to_inspect.map((t: string, i: number) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t text-[11px] text-purple-700 dark:text-purple-300">
                    <b>Căn cứ ISO:</b> {aiMaintResult.iso_compliance_note}
                  </div>
                </div>
              )}
            </div>

            {/* TOOL 2: AI CALIBRATION OUT-OF-TOLERANCE EVALUATOR */}
            <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2.5 border-b pb-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
                  <Gauge className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">2. AI Thẩm Định Sai Số Hiệu Chuẩn & CAPA</h4>
                  <p className="text-xs text-muted-foreground">
                    Đánh giá tác động đến các lô sản phẩm đã xuất xưởng khi thiết bị đo lệch chuẩn (ISO 7.1.5.2).
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-xs">Sai số thực tế đo được:</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={aiCalReq.measured_deviation}
                      onChange={(e) => setAiCalReq({ ...aiCalReq, measured_deviation: Number(e.target.value) })}
                      className="mt-1 text-xs h-9"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Dung sai cho phép (+/-):</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={aiCalReq.allowable_tolerance}
                      onChange={(e) => setAiCalReq({ ...aiCalReq, allowable_tolerance: Number(e.target.value) })}
                      className="mt-1 text-xs h-9"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Công đoạn CCP / oPRP bị ảnh hưởng:</Label>
                  <Input
                    value={aiCalReq.related_ccp_step}
                    onChange={(e) => setAiCalReq({ ...aiCalReq, related_ccp_step: e.target.value })}
                    className="mt-1 text-xs h-9"
                  />
                </div>

                <Button
                  onClick={handleRunAiCal}
                  disabled={aiCalLoading}
                  className="w-full gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-xs text-white h-9 font-semibold"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${aiCalLoading ? "animate-spin" : ""}`} />
                  Thẩm Định Rủi Ro & Đề Xuất CAPA
                </Button>
              </div>

              {/* AI RESULT 2 */}
              {aiCalResult && (
                <div className="rounded-xl border bg-blue-500/5 p-3.5 space-y-2.5 text-xs border-blue-200 dark:border-blue-900">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900 dark:text-blue-300">
                      Mức độ rủi ro đo lường:
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                        aiCalResult.is_acceptable
                          ? "bg-emerald-500 text-white"
                          : "bg-rose-500 text-white animate-pulse"
                      }`}
                    >
                      {aiCalResult.risk_level}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold text-foreground">Phân tích sai số:</span>
                    <p className="mt-0.5 text-muted-foreground leading-relaxed">
                      {aiCalResult.deviation_analysis}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-foreground">Tác động đến các lô sản xuất trước:</span>
                    <p className="mt-0.5 text-muted-foreground leading-relaxed">
                      {aiCalResult.impact_on_past_batches}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-foreground">Hành động khắc phục CAPA đề xuất:</span>
                    <p className="mt-0.5 text-muted-foreground leading-relaxed">
                      {aiCalResult.suggested_capa_action}
                    </p>
                  </div>

                  <div className="pt-2 border-t text-[11px] text-blue-700 dark:text-blue-300">
                    <b>Căn cứ ISO 22000:</b> {aiCalResult.iso_clause_reference}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 1: THÊM / SỬA THIẾT BỊ (DẠNG DỌC CHUẨN, FULL RESPONSIVE) ==================== */}
      <Dialog open={isEqModalOpen} onOpenChange={setIsEqModalOpen}>
        <DialogContent className="w-full max-w-lg sm:max-w-xl max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <Wrench className="h-4 w-4" />
              </div>
              <span>{editingEq ? `Chỉnh sửa Thiết bị [${editingEq.equipment_code}]` : "Thêm Thiết Bị Mới"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEquipment} className="space-y-4 pt-2 text-xs sm:text-sm">
            {/* NHÓM 1: ĐỊNH DANH CƠ BẢN */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                <Info className="h-3.5 w-3.5" />
                <span>1. Thông tin định danh & Phân loại</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs font-semibold">Mã thiết bị (*):</Label>
                  <Input
                    required
                    value={eqForm.equipment_code}
                    onChange={(e) => setEqForm({ ...eqForm, equipment_code: e.target.value })}
                    placeholder="EQ-STER-01"
                    className="mt-1 font-mono font-bold text-primary h-9 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Phân nhóm thiết bị (*):</Label>
                  <select
                    value={eqForm.category}
                    onChange={(e) => setEqForm({ ...eqForm, category: e.target.value })}
                    className="mt-1 w-full rounded-md border bg-background px-3 h-9 text-xs sm:text-sm font-medium"
                  >
                    <option value="PROCESSING">Chế biến & Sản xuất</option>
                    <option value="MEASURING">Đo lường & Kiểm định</option>
                    <option value="STORAGE">Lưu trữ & Cấp đông</option>
                    <option value="UTILITY">Phụ trợ & Nguồn nước</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Tên thiết bị (*):</Label>
                <Input
                  required
                  value={eqForm.equipment_name}
                  onChange={(e) => setEqForm({ ...eqForm, equipment_name: e.target.value })}
                  placeholder="Nồi tiệt trùng cao áp Retort"
                  className="mt-1 h-9 text-xs sm:text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs font-semibold">Vị trí lắp đặt xưởng (*):</Label>
                  <Input
                    required
                    value={eqForm.installation_location}
                    onChange={(e) => setEqForm({ ...eqForm, installation_location: e.target.value })}
                    placeholder="Phân xưởng Chế biến 1"
                    className="mt-1 h-9 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Hãng sản xuất:</Label>
                  <Input
                    value={eqForm.manufacturer}
                    onChange={(e) => setEqForm({ ...eqForm, manufacturer: e.target.value })}
                    placeholder="DTS Machinery"
                    className="mt-1 h-9 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs text-muted-foreground">Model máy:</Label>
                  <Input
                    value={eqForm.model}
                    onChange={(e) => setEqForm({ ...eqForm, model: e.target.value })}
                    placeholder="DTS-1200"
                    className="mt-1 h-9 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Số Serial:</Label>
                  <Input
                    value={eqForm.serial_number}
                    onChange={(e) => setEqForm({ ...eqForm, serial_number: e.target.value })}
                    placeholder="RT-2024-9982"
                    className="mt-1 h-9 text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* NHÓM 2: MỨC ĐỘ ATTP & TRẠNG THÁI */}
            <div className="space-y-2.5 pt-2 border-t">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>2. Kiểm soát An toàn thực phẩm & Vận hành</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs font-semibold">Mức độ trọng yếu ATTP (*):</Label>
                  <select
                    value={eqForm.criticality_level}
                    onChange={(e) => setEqForm({ ...eqForm, criticality_level: e.target.value })}
                    className="mt-1 w-full rounded-md border bg-background px-3 h-9 text-xs sm:text-sm font-semibold"
                  >
                    <option value="HIGH_CCP">Kiểm soát CCP (Nghiêm ngặt)</option>
                    <option value="MEDIUM_OPRP">Kiểm soát oPRP (Thiết yếu)</option>
                    <option value="LOW_PRP">Nền tảng PRP</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Trạng thái máy (*):</Label>
                  <select
                    value={eqForm.status}
                    onChange={(e) => setEqForm({ ...eqForm, status: e.target.value })}
                    className="mt-1 w-full rounded-md border bg-background px-3 h-9 text-xs sm:text-sm font-medium"
                  >
                    <option value="OPERATIONAL">Đang hoạt động tốt</option>
                    <option value="MAINTENANCE">Đang bảo trì / Sửa chữa</option>
                    <option value="CALIBRATION_OVERDUE">Quá hạn hiệu chuẩn</option>
                    <option value="DECOMMISSIONED">Ngừng sử dụng</option>
                  </select>
                </div>
              </div>
            </div>

            {/* NHÓM 3: CHU KỲ & HẠN ĐỊNH KỲ (ISO 7.1.5 & 8.2) */}
            <div className="space-y-2.5 pt-2 border-t">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5" />
                <span>3. Chu kỳ Tiêu chuẩn & Kế hoạch Hạn tới</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-xs font-semibold">Chu kỳ hiệu chuẩn quy định (tháng) (*):</Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={eqForm.calibration_frequency_months}
                    onChange={(e) => {
                      const freq = Math.max(1, Number(e.target.value) || 12);
                      const baseDate = eqForm.last_calibration_date ? new Date(eqForm.last_calibration_date) : new Date();
                      baseDate.setMonth(baseDate.getMonth() + freq);
                      setEqForm({
                        ...eqForm,
                        calibration_frequency_months: freq,
                        next_calibration_due: baseDate.toISOString().split("T")[0],
                      });
                    }}
                    className="mt-1 h-9 text-xs sm:text-sm font-bold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Chu kỳ bảo trì PM quy định (ngày) (*):</Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={eqForm.maintenance_frequency_days}
                    onChange={(e) => {
                      const freq = Math.max(1, Number(e.target.value) || 30);
                      const baseDate = eqForm.last_maintenance_date ? new Date(eqForm.last_maintenance_date) : new Date();
                      baseDate.setDate(baseDate.getDate() + freq);
                      setEqForm({
                        ...eqForm,
                        maintenance_frequency_days: freq,
                        next_maintenance_due: baseDate.toISOString().split("T")[0],
                      });
                    }}
                    className="mt-1 h-9 text-xs sm:text-sm font-bold"
                  />
                </div>
              </div>

              {/* LỊCH SỬ THỰC TẾ & HẠN KẾ TIẾP */}
              <div className="rounded-xl border bg-muted/30 p-3 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-blue-600" />
                      Hiệu chuẩn gần nhất:
                    </Label>
                    <Input
                      type="date"
                      value={eqForm.last_calibration_date}
                      onChange={(e) => {
                        const dt = e.target.value;
                        const freq = Number(eqForm.calibration_frequency_months) || 12;
                        let nextDue = eqForm.next_calibration_due;
                        if (dt) {
                          const d = new Date(dt);
                          d.setMonth(d.getMonth() + freq);
                          nextDue = d.toISOString().split("T")[0];
                        }
                        setEqForm({ ...eqForm, last_calibration_date: dt, next_calibration_due: nextDue });
                      }}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                      Hạn hiệu chuẩn kế tiếp:
                    </Label>
                    <Input
                      type="date"
                      value={eqForm.next_calibration_due}
                      onChange={(e) => setEqForm({ ...eqForm, next_calibration_due: e.target.value })}
                      className="mt-1 h-8 text-xs font-bold border-blue-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-purple-600" />
                      Bảo dưỡng gần nhất:
                    </Label>
                    <Input
                      type="date"
                      value={eqForm.last_maintenance_date}
                      onChange={(e) => {
                        const dt = e.target.value;
                        const freq = Number(eqForm.maintenance_frequency_days) || 30;
                        let nextDue = eqForm.next_maintenance_due;
                        if (dt) {
                          const d = new Date(dt);
                          d.setDate(d.getDate() + freq);
                          nextDue = d.toISOString().split("T")[0];
                        }
                        setEqForm({ ...eqForm, last_maintenance_date: dt, next_maintenance_due: nextDue });
                      }}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-purple-700 dark:text-purple-400">
                      Hạn bảo dưỡng kế tiếp:
                    </Label>
                    <Input
                      type="date"
                      value={eqForm.next_maintenance_due}
                      onChange={(e) => setEqForm({ ...eqForm, next_maintenance_due: e.target.value })}
                      className="mt-1 h-8 text-xs font-bold border-purple-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* NHÓM 4: GHI CHÚ */}
            <div className="space-y-1.5 pt-2 border-t">
              <Label className="text-xs text-muted-foreground">
                Ghi chú kỹ thuật & Yêu cầu an toàn thực phẩm (Dầu mỡ NSF H1, Tiêu chuẩn ISO/TS 22002-1):
              </Label>
              <Textarea
                rows={2}
                value={eqForm.notes}
                onChange={(e) => setEqForm({ ...eqForm, notes: e.target.value })}
                placeholder="Yêu cầu sử dụng mỡ bôi trơn an toàn thực phẩm NSF H1 và khử trùng buồng máy trước khi bàn giao..."
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 border-t mt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 w-full">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEqModalOpen(false)} className="w-full sm:w-auto h-9 text-xs">
                Hủy bỏ
              </Button>
              <Button type="submit" size="sm" className="w-full sm:w-auto h-9 text-xs shadow-sm font-semibold">
                {editingEq ? "Cập nhật thiết bị" : "Lưu thiết bị"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL 2: LẬP PHIẾU BẢO TRÌ (DẠNG DỌC, RESPONSIVE) ==================== */}
      <Dialog open={isMaintModalOpen} onOpenChange={setIsMaintModalOpen}>
        <DialogContent className="w-full max-w-lg sm:max-w-xl max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-purple-500/10 text-purple-600">
                <Sliders className="h-4 w-4" />
              </div>
              <span>Lập Phiếu Bảo Trì Phòng Ngừa (PM) & Sửa Chữa</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveMaint} className="space-y-3.5 pt-2 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs font-semibold">Mã phiếu bảo trì (*):</Label>
                <Input
                  required
                  value={maintForm.maintenance_code}
                  onChange={(e) => setMaintForm({ ...maintForm, maintenance_code: e.target.value })}
                  className="mt-1 font-mono h-9 text-xs font-bold text-primary"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Ngày thực hiện (*):</Label>
                <Input
                  type="date"
                  required
                  value={maintForm.maintenance_date}
                  onChange={(e) => setMaintForm({ ...maintForm, maintenance_date: e.target.value })}
                  className="mt-1 h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Thiết bị bảo dưỡng (*):</Label>
              <select
                value={maintForm.equipment_id}
                onChange={(e) => setMaintForm({ ...maintForm, equipment_id: e.target.value })}
                className="mt-1 w-full rounded-md border bg-background px-3 h-9 text-xs sm:text-sm font-medium"
              >
                {equipments.map((e) => (
                  <option key={e.equipment_id} value={e.equipment_id}>
                    {e.equipment_code} - {e.equipment_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Nội dung công việc bảo trì (*):</Label>
              <Textarea
                required
                rows={2}
                value={maintForm.task_desc}
                onChange={(e) => setMaintForm({ ...maintForm, task_desc: e.target.value })}
                placeholder="Bảo dưỡng định kỳ, kiểm tra bạc đạn, siết ốc và tra mỡ thực phẩm..."
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs text-muted-foreground">Phụ tùng thay thế:</Label>
                <Input
                  value={maintForm.parts_desc}
                  onChange={(e) => setMaintForm({ ...maintForm, parts_desc: e.target.value })}
                  placeholder="Gioăng silicon chịu nhiệt, phớt làm kín..."
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Người thực hiện (*):</Label>
                <Input
                  required
                  value={maintForm.performer_name}
                  onChange={(e) => setMaintForm({ ...maintForm, performer_name: e.target.value })}
                  className="mt-1 h-9 text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Chi phí bảo dưỡng (VNĐ):</Label>
              <Input
                type="number"
                min="0"
                value={maintForm.cost}
                onChange={(e) => setMaintForm({ ...maintForm, cost: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            {/* CHECKBOX AN TOÀN THỰC PHẨM */}
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={maintForm.food_grade_lubricant_used}
                  onChange={(e) => setMaintForm({ ...maintForm, food_grade_lubricant_used: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className="font-semibold text-foreground">
                  Dầu mỡ bôi trơn chuẩn an toàn thực phẩm NSF H1 (ISO 22000)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={maintForm.hygiene_sanitation_after_maint}
                  onChange={(e) => setMaintForm({ ...maintForm, hygiene_sanitation_after_maint: e.target.checked })}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className="font-semibold text-foreground">
                  Đã vệ sinh, khử trùng hiện trường trước khi bàn giao
                </span>
              </label>
            </div>

            <DialogFooter className="pt-3 border-t mt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 w-full">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsMaintModalOpen(false)} className="w-full sm:w-auto h-9 text-xs">
                Hủy bỏ
              </Button>
              <Button type="submit" size="sm" className="w-full sm:w-auto h-9 text-xs shadow-sm font-semibold">
                Lưu phiếu bảo trì
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL 3: LẬP BIÊN BẢN HIỆU CHUẨN (DẠNG DỌC, RESPONSIVE) ==================== */}
      <Dialog open={isCalModalOpen} onOpenChange={setIsCalModalOpen}>
        <DialogContent className="w-full max-w-lg sm:max-w-xl max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
                <Gauge className="h-4 w-4" />
              </div>
              <span>Ghi Nhận Tem & Biên Bản Hiệu Chuẩn Đo Lường</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCal} className="space-y-3.5 pt-2 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs font-semibold">Mã biên bản (*):</Label>
                <Input
                  required
                  value={calForm.calibration_code}
                  onChange={(e) => setCalForm({ ...calForm, calibration_code: e.target.value })}
                  className="mt-1 font-mono h-9 text-xs font-bold text-primary"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Số tem / Giấy kiểm định (*):</Label>
                <Input
                  required
                  value={calForm.certificate_number}
                  onChange={(e) => setCalForm({ ...calForm, certificate_number: e.target.value })}
                  placeholder="HC-QT3-2026-001"
                  className="mt-1 h-9 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Thiết bị đo lường (*):</Label>
              <select
                value={calForm.equipment_id}
                onChange={(e) => setCalForm({ ...calForm, equipment_id: e.target.value })}
                className="mt-1 w-full rounded-md border bg-background px-3 h-9 text-xs sm:text-sm font-medium"
              >
                {equipments.map((e) => (
                  <option key={e.equipment_id} value={e.equipment_id}>
                    {e.equipment_code} - {e.equipment_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs font-semibold">Ngày hiệu chuẩn (*):</Label>
                <Input
                  type="date"
                  required
                  value={calForm.calibration_date}
                  onChange={(e) => setCalForm({ ...calForm, calibration_date: e.target.value })}
                  className="mt-1 h-9 text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Hạn kiểm định kế tiếp (*):</Label>
                <Input
                  type="date"
                  required
                  value={calForm.expiry_date}
                  onChange={(e) => setCalForm({ ...calForm, expiry_date: e.target.value })}
                  className="mt-1 h-9 text-xs sm:text-sm font-bold border-emerald-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs font-semibold">Sai số thực tế đo được (*):</Label>
                <Input
                  type="number"
                  step="0.0001"
                  required
                  value={calForm.measured_deviation}
                  onChange={(e) => setCalForm({ ...calForm, measured_deviation: e.target.value })}
                  className="mt-1 h-9 text-xs font-mono font-semibold"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Dung sai cho phép (+/-) (*):</Label>
                <Input
                  type="number"
                  step="0.0001"
                  required
                  value={calForm.allowable_tolerance}
                  onChange={(e) => setCalForm({ ...calForm, allowable_tolerance: e.target.value })}
                  className="mt-1 h-9 text-xs font-mono text-muted-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs font-semibold">Đơn vị kiểm định (*):</Label>
                <Input
                  required
                  value={calForm.agency_name}
                  onChange={(e) => setCalForm({ ...calForm, agency_name: e.target.value })}
                  placeholder="Trung tâm QUATEST 3 / VILAS"
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Kiểm định viên / Ghi chú:</Label>
                <Input
                  value={calForm.calibrator_name}
                  onChange={(e) => setCalForm({ ...calForm, calibrator_name: e.target.value })}
                  placeholder="KTV Kiểm định viên..."
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t mt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 w-full">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCalModalOpen(false)} className="w-full sm:w-auto h-9 text-xs">
                Hủy bỏ
              </Button>
              <Button type="submit" size="sm" className="w-full sm:w-auto h-9 text-xs shadow-sm font-semibold">
                Lưu biên bản hiệu chuẩn
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL 4: IN & XEM TRƯỚC PHIẾU LÝ LỊCH THIẾT BỊ (BM-TB-01) ==================== */}
      <Dialog open={showPrintProfileModal} onOpenChange={setShowPrintProfileModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base font-bold flex flex-wrap items-center justify-between gap-2 pr-6">
              <span>Xem Trước Phiếu Lý Lịch Thiết Bị (BM-TB-01)</span>
              <span className="font-mono text-xs font-normal text-muted-foreground">
                Mã: {selectedPrintEq?.equipment_code}
              </span>
            </DialogTitle>
          </DialogHeader>

          {selectedPrintEq && (
            <div className="bg-white text-slate-900 p-4 sm:p-6 rounded-xl border font-sans text-xs space-y-4 sm:space-y-5 shadow-sm overflow-x-auto">
              {/* Header Box với Logo Công ty chuẩn */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 min-w-[500px]">
                <div className="flex items-center gap-3">
                  <img src={logoImg} alt="WCERT Logo" className="h-10 sm:h-12 w-auto object-contain" />
                  <div>
                    <h2 className="font-extrabold text-xs sm:text-base tracking-tight text-slate-900">
                      CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-600">
                      Hệ thống Quản lý An toàn Thực phẩm theo Tiêu chuẩn ISO 22000:2018
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] sm:text-[11px] text-slate-600">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">BIỂU MẪU: BM-TB-01</p>
                  <p>Lần ban hành: 02 (2026)</p>
                  <p>Tiêu chuẩn: ISO 7.1.5 & 8.2</p>
                </div>
              </div>

              <div className="text-center space-y-1 min-w-[500px]">
                <h1 className="text-sm sm:text-lg font-black text-slate-900 uppercase">
                  PHIẾU LÝ LỊCH THIẾT BỊ & LỊCH SỬ BẢO TRÌ
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-600 italic">
                  (Theo dõi nguồn lực đo lường & bảo trì dự phòng định kỳ)
                </p>
              </div>

              {/* Data Table Preview */}
              <table className="w-full border-collapse border border-slate-400 text-xs min-w-[500px]">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold w-1/4">Mã số thiết bị:</td>
                    <td className="border border-slate-300 p-2 font-mono font-bold text-emerald-700">{selectedPrintEq.equipment_code}</td>
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold w-1/4">Phân nhóm thiết bị:</td>
                    <td className="border border-slate-300 p-2 font-semibold">{CATEGORY_MAP[selectedPrintEq.category]?.label || selectedPrintEq.category}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Tên thiết bị:</td>
                    <td colSpan={3} className="border border-slate-300 p-2 font-bold text-slate-900">{selectedPrintEq.equipment_name}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Model / Serial:</td>
                    <td className="border border-slate-300 p-2">{selectedPrintEq.model || "—"} / {selectedPrintEq.serial_number || "—"}</td>
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Hãng sản xuất:</td>
                    <td className="border border-slate-300 p-2">{selectedPrintEq.manufacturer || "—"}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Vị trí lắp đặt:</td>
                    <td className="border border-slate-300 p-2">{selectedPrintEq.installation_location || "—"}</td>
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Mức độ trọng yếu ATTP:</td>
                    <td className="border border-slate-300 p-2 font-bold text-rose-700">{CRITICALITY_MAP[selectedPrintEq.criticality_level]?.label || selectedPrintEq.criticality_level}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Chu kỳ hiệu chuẩn quy định:</td>
                    <td className="border border-slate-300 p-2">{selectedPrintEq.calibration_frequency_months} tháng/lần (Hạn tới: <b>{selectedPrintEq.next_calibration_due || "—"}</b>)</td>
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Chu kỳ bảo trì PM quy định:</td>
                    <td className="border border-slate-300 p-2">{selectedPrintEq.maintenance_frequency_days} ngày/lần (Hạn tới: <b>{selectedPrintEq.next_maintenance_due || "—"}</b>)</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Tình trạng tem hiệu chuẩn:</td>
                    <td className="border border-slate-300 p-2 font-semibold">{CALIBRATION_STATUS_MAP[selectedPrintEq.calibration_status]?.label || selectedPrintEq.calibration_status}</td>
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Trạng thái vận hành:</td>
                    <td className="border border-slate-300 p-2 font-semibold">{STATUS_MAP[selectedPrintEq.status]?.label || selectedPrintEq.status}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Lịch sử tích lũy hồ sơ:</td>
                    <td colSpan={3} className="border border-slate-300 p-2 font-semibold">
                      Đã thực hiện <span className="text-blue-700 font-bold">{selectedPrintEq.total_calibration_logs || 0}</span> đợt hiệu chuẩn đo lường và <span className="text-purple-700 font-bold">{selectedPrintEq.total_maintenance_logs || 0}</span> lượt bảo dưỡng phòng ngừa PM.
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Ghi chú kỹ thuật:</td>
                    <td colSpan={3} className="border border-slate-300 p-2 text-slate-700">{selectedPrintEq.notes || "Tuân thủ tiêu chuẩn bôi trơn dầu thực phẩm an toàn NSF H1."}</td>
                  </tr>
                </tbody>
              </table>

              <div className="border border-emerald-300 bg-emerald-50/70 p-3 rounded-lg text-emerald-900 text-xs leading-relaxed min-w-[500px]">
                <b>✓ TIÊU CHUẨN KIỂM SOÁT THIẾT BỊ CHẾ BIẾN THỰC PHẨM (ISO/TS 22002-1):</b><br/>
                Thiết bị được theo dõi định kỳ bảo trì dự phòng (PM), bôi trơn bằng mỡ an toàn thực phẩm NSF H1 và hiệu chuẩn đo lường định kỳ bởi đơn vị được công nhận ISO/IEC 17025.
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-4 text-center text-xs min-w-[500px]">
                <div className="space-y-8">
                  <p className="font-bold text-slate-900">CÁN BỘ PHỤ TRÁCH THIẾT BỊ</p>
                  <p className="font-semibold text-slate-700">{selectedPrintEq.manager_name || "Nguyễn Văn Kỹ Thuật"}</p>
                </div>
                <div className="space-y-8">
                  <p className="font-bold text-slate-900">TRƯỞNG BAN QLCL & ATTP (QA/QC)</p>
                  <p className="font-semibold text-slate-700">Ban Quản Lý Chất Lượng</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPrintProfileModal(false)} className="w-full sm:w-auto">
              Đóng
            </Button>
            <Button
              size="sm"
              onClick={() => selectedPrintEq && triggerPrintEquipmentProfile(selectedPrintEq)}
              className="bg-primary text-primary-foreground gap-1.5 w-full sm:w-auto"
            >
              <Printer className="h-4 w-4" />
              In Biểu Mẫu / Lưu PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL 5: IN & XEM TRƯỚC BIÊN BẢN HIỆU CHUẨN (BM-HC-02) ==================== */}
      <Dialog open={showPrintCalModal} onOpenChange={setShowPrintCalModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base font-bold flex flex-wrap items-center justify-between gap-2 pr-6">
              <span>Xem Trước Biên Bản Hiệu Chuẩn & Kiểm Định (BM-HC-02)</span>
              <span className="font-mono text-xs font-normal text-muted-foreground">
                Mã: {selectedPrintCal?.calibration_code}
              </span>
            </DialogTitle>
          </DialogHeader>

          {selectedPrintCal && (
            <div className="bg-white text-slate-900 p-4 sm:p-6 rounded-xl border font-sans text-xs space-y-4 sm:space-y-5 shadow-sm overflow-x-auto">
              {/* Header Box với Logo Công ty chuẩn */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 min-w-[500px]">
                <div className="flex items-center gap-3">
                  <img src={logoImg} alt="WCERT Logo" className="h-10 sm:h-12 w-auto object-contain" />
                  <div>
                    <h2 className="font-extrabold text-xs sm:text-base tracking-tight text-slate-900">
                      CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-slate-600">
                      Hệ thống Quản lý An toàn Thực phẩm theo Tiêu chuẩn ISO 22000:2018
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] sm:text-[11px] text-slate-600">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">BIỂU MẪU: BM-HC-02</p>
                  <p>Mã phiếu: <b>{selectedPrintCal.calibration_code}</b></p>
                  <p>Tiêu chuẩn: ISO/IEC 17025</p>
                </div>
              </div>

              <div className="text-center space-y-1 min-w-[500px]">
                <h1 className="text-sm sm:text-lg font-black text-slate-900 uppercase">
                  BIÊN BẢN HIỆU CHUẨN & KIỂM ĐỊNH ĐO LƯỜNG
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-600 italic">
                  (Kiểm soát thiết bị theo dõi & đo lường theo ISO 22000:2018 Điều khoản 7.1.5.2)
                </p>
              </div>

              {/* Data Table Preview */}
              <table className="w-full border-collapse border border-slate-400 text-xs min-w-[500px]">
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold w-1/4">Mã số thiết bị:</td>
                    <td className="border border-slate-300 p-2 font-mono font-bold text-emerald-700">{selectedPrintCal.equipment_code || "—"}</td>
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold w-1/4">Tên thiết bị:</td>
                    <td className="border border-slate-300 p-2 font-bold">{selectedPrintCal.equipment_name || "—"}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Hình thức hiệu chuẩn:</td>
                    <td className="border border-slate-300 p-2">{selectedPrintCal.calibration_type === "EXTERNAL" ? "Kiểm định Ngoài (QUATEST 3 / VILAS)" : "Hiệu chuẩn Nội bộ"}</td>
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Đơn vị thực hiện:</td>
                    <td className="border border-slate-300 p-2 font-semibold">{selectedPrintCal.agency_name || "Phòng KCS Nội bộ"}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Số tem / Giấy kiểm định:</td>
                    <td className="border border-slate-300 p-2 font-mono font-bold text-slate-900">{selectedPrintCal.certificate_number || "—"}</td>
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Tiêu chuẩn áp dụng:</td>
                    <td className="border border-slate-300 p-2">{selectedPrintCal.standard_applied || "ISO/IEC 17025"}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Ngày hiệu chuẩn:</td>
                    <td className="border border-slate-300 p-2">{selectedPrintCal.calibration_date}</td>
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Hạn kiểm định:</td>
                    <td className="border border-slate-300 p-2 font-bold text-emerald-700">{selectedPrintCal.expiry_date}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Sai số thực tế đo được:</td>
                    <td className="border border-slate-300 p-2 font-mono font-bold text-slate-900">{selectedPrintCal.measured_deviation !== undefined ? selectedPrintCal.measured_deviation : "—"}</td>
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Dung sai cho phép (+/-):</td>
                    <td className="border border-slate-300 p-2 font-mono">{selectedPrintCal.allowable_tolerance !== undefined ? `+/- ${selectedPrintCal.allowable_tolerance}` : "—"}</td>
                  </tr>
                  <tr className="border-b border-slate-300">
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Kết luận thẩm định:</td>
                    <td colSpan={3} className={`border border-slate-300 p-2 font-bold ${selectedPrintCal.is_passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {selectedPrintCal.is_passed ? "✓ ĐẠT YÊU CẦU ĐỘ CHÍNH XÁC (PASSED) — TEM KIỂM ĐỊNH HỢP LỆ" : "✕ KHÔNG ĐẠT YÊU CẦU (FAILED) — CẦN HIỆU CHỈNH LẠI"}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 border border-slate-300 p-2 font-bold">Nhận xét & Đánh giá:</td>
                    <td colSpan={3} className="border border-slate-300 p-2 text-slate-700">{selectedPrintCal.notes || "Thiết bị đo lường đáp ứng đầy đủ yêu cầu kiểm soát CCP và giám sát thông số quá trình chế biến."}</td>
                  </tr>
                </tbody>
              </table>

              <div className="border border-emerald-300 bg-emerald-50/70 p-3 rounded-lg text-emerald-900 text-xs font-bold text-center min-w-[500px]">
                ✓ ĐÃ ĐƯỢC THẨM ĐỊNH THEO CHUẨN ĐO LƯỜNG VIỆT NAM (ĐLVN / QUATEST 3 / ISO 17025)
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-4 text-center text-xs min-w-[500px]">
                <div className="space-y-8">
                  <p className="font-bold text-slate-900">CÁN BỘ / ĐƠN VỊ HIỆU CHUẨN</p>
                  <p className="font-semibold text-slate-700">{selectedPrintCal.calibrator_display_name || selectedPrintCal.calibrator_name || "Kiểm định viên"}</p>
                </div>
                <div className="space-y-8">
                  <p className="font-bold text-slate-900">TRƯỞNG BAN QLCL & ATTP (QA/QC)</p>
                  <p className="font-semibold text-slate-700">Ban An Toàn Thực Phẩm</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPrintCalModal(false)} className="w-full sm:w-auto">
              Đóng
            </Button>
            <Button
              size="sm"
              onClick={() => selectedPrintCal && triggerPrintCalibrationCert(selectedPrintCal)}
              className="bg-primary text-primary-foreground gap-1.5 w-full sm:w-auto"
            >
              <Printer className="h-4 w-4" />
              In Biểu Mẫu / Lưu PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Xác Nhận Xóa Thiết Bị */}
      <ConfirmDialog
        isOpen={!!deletingEqItem}
        onClose={() => setDeletingEqItem(null)}
        onConfirm={() => {
          if (deletingEqItem) {
            executeDeleteEquipment(deletingEqItem.id, deletingEqItem.name);
            setDeletingEqItem(null);
          }
        }}
        title="Xác nhận xóa hồ sơ thiết bị"
        description={`Bạn có chắc chắn muốn xoá thiết bị "${deletingEqItem?.name}" khỏi hệ thống hồ sơ máy móc không? Dữ liệu lịch sử bảo dưỡng và hiệu chuẩn liên quan sẽ bị ảnh hưởng.`}
        confirmLabel="Xóa thiết bị"
        variant="destructive"
      />
    </div>
  );
}
