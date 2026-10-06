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
  BookOpen,
  HeartPulse,
  Activity,
  FileSpreadsheet,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDepartments } from "@/lib/departments";
import logoImg from "@/assets/logo.png";
import { DynamicFormRenderer } from "@/components/builder/DynamicFormRenderer";
import type { FormTemplateData } from "@/components/builder/types";
import { printHtml } from "@/lib/print";
import { EmptyState } from "@/components/EmptyState";
import { ModuleGuideModal } from "@/components/ModuleGuideModal";

export const Route = createFileRoute("/prp")({
  head: () => ({
    meta: [
      { title: "Chương trình Tiên quyết (PRP / GMP / SSOP) – WCERT ISO 22000" },
      {
        name: "description",
        content:
          "Thư viện quy chuẩn GMP, SSOP, 5S, kiểm soát côn trùng bẫy chuột BM01-SVGH, dị nguyên BM01-CGDU, y tế khách BM03-KSSK và tủ thuốc sơ cứu BM01-KSSK theo hồ sơ An Giang ISO 22000.",
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

// Thư mục 07 An Giang: Bẫy chuột & côn trùng (BM01-SVGH)
interface PestControlTrap {
  trap_number: string;
  location: string;
  trap_type: string;
  status: string;
  bait_status: string;
  pests_caught: number;
  notes?: string;
}

interface PestControlLog {
  log_id: string;
  log_code: string;
  check_date: string;
  inspector_name: string;
  trap_locations: PestControlTrap[];
  total_pests_caught: number;
  corrective_actions?: string;
  status: string;
  created_at?: string;
}

// Thư mục 07 An Giang: Kiểm soát chất gây dị ứng (BM01-CGDU)
interface AllergenControl {
  allergen_id: string;
  allergen_code: string;
  material_name: string;
  allergen_types: string;
  is_contained_in_product: boolean;
  cross_contact_risk_stage?: string;
  preventive_measures: string;
  responsible_person: string;
  status: string;
  created_at?: string;
}

// Thư mục 07 An Giang: Kê khai y tế khách tham quan / nhà thầu (BM03-KSSK)
interface VisitorHealthDeclaration {
  declaration_id: string;
  declaration_code: string;
  visit_date: string;
  visitor_name: string;
  company_name: string;
  purpose_of_visit: string;
  has_diarrhea: boolean;
  has_fever_cough: boolean;
  has_open_wound: boolean;
  visited_epidemic_area: boolean;
  is_approved_entry: boolean;
  escort_person?: string;
  commitment_signed: boolean;
  notes?: string;
  created_at?: string;
}

// Thư mục 07 An Giang: Sổ theo dõi cấp phát thuốc sơ cứu xưởng (BM01-KSSK)
interface FirstAidLog {
  log_id: string;
  log_code: string;
  issue_date: string;
  recipient_name: string;
  department: string;
  reason_symptom: string;
  supplies_provided: string;
  quantity: number;
  dispenser_name: string;
  status_after_aid: string;
  notes?: string;
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
  const { departments } = useDepartments();
  const [activeTab, setActiveTab] = useState<
    "programs" | "checklists" | "pest_control" | "allergens" | "visitor_health" | "first_aid"
  >("programs");

  // Data states
  const [programs, setPrograms] = useState<PRPProgram[]>([]);
  const [checklists, setChecklists] = useState<PRPChecklistLog[]>([]);
  const [pestLogs, setPestLogs] = useState<PestControlLog[]>([]);
  const [allergens, setAllergens] = useState<AllergenControl[]>([]);
  const [visitorDeclarations, setVisitorDeclarations] = useState<VisitorHealthDeclaration[]>([]);
  const [firstAidLogs, setFirstAidLogs] = useState<FirstAidLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showGuide, setShowGuide] = useState(false);

  // Filters
  const [progSearch, setProgSearch] = useState("");
  const [progGroupFilter, setProgGroupFilter] = useState("ALL");
  const [progStatusFilter, setProgStatusFilter] = useState("ALL");

  const [ckProgFilter, setCkProgFilter] = useState("ALL");
  const [ckShiftFilter, setCkShiftFilter] = useState("ALL");
  const [ckStatusFilter, setCkStatusFilter] = useState("ALL");

  const [pestSearch, setPestSearch] = useState("");
  const [allergenSearch, setAllergenSearch] = useState("");
  const [visitorSearch, setVisitorSearch] = useState("");
  const [firstAidSearch, setFirstAidSearch] = useState("");

  // Modals & Forms
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

  // Pest Control Form (BM01-SVGH)
  const [showPestModal, setShowPestModal] = useState(false);
  const [editingPestLog, setEditingPestLog] = useState<PestControlLog | null>(null);
  const [pestForm, setPestForm] = useState({
    check_date: new Date().toISOString().split("T")[0],
    inspector_name: "Trần Văn Minh",
    corrective_actions: "",
    status: "COMPLETED",
    traps: [
      {
        trap_number: "01",
        location: "Cổng bảo vệ & Hàng rào phía Đông",
        trap_type: "Bẫy chuột hộp bả",
        status: "Tốt",
        bait_status: "Còn mồi",
        pests_caught: 0,
        notes: "",
      },
      {
        trap_number: "02",
        location: "Hàng rào giáp khu lưu giữ rác thải",
        trap_type: "Bẫy chuột hộp bả",
        status: "Tốt",
        bait_status: "Còn mồi",
        pests_caught: 0,
        notes: "",
      },
      {
        trap_number: "03",
        location: "Phía ngoài cửa kho nguyên liệu nông sản",
        trap_type: "Bẫy lồng chuột",
        status: "Tốt",
        bait_status: "Còn mồi",
        pests_caught: 0,
        notes: "",
      },
      {
        trap_number: "04",
        location: "Cửa ra vào khu sơ chế rửa thái",
        trap_type: "Đèn bắt côn trùng keo",
        status: "Tốt",
        bait_status: "Tấm dính tốt",
        pests_caught: 0,
        notes: "",
      },
      {
        trap_number: "05",
        location: "Hành lang phòng đệm xưởng sản xuất",
        trap_type: "Đèn bắt côn trùng keo",
        status: "Tốt",
        bait_status: "Tấm dính tốt",
        pests_caught: 0,
        notes: "",
      },
      {
        trap_number: "06",
        location: "Cửa kho sấy & làm nguội",
        trap_type: "Bẫy keo chuột",
        status: "Tốt",
        bait_status: "Keo tốt",
        pests_caught: 0,
        notes: "",
      },
      {
        trap_number: "07",
        location: "Khu vực nghiền và sàng lọc bột",
        trap_type: "Đèn bắt côn trùng keo",
        status: "Tốt",
        bait_status: "Tấm dính tốt",
        pests_caught: 0,
        notes: "",
      },
      {
        trap_number: "08",
        location: "Cửa kho bao bì & phụ liệu",
        trap_type: "Bẫy chuột hộp bả",
        status: "Tốt",
        bait_status: "Còn mồi",
        pests_caught: 0,
        notes: "",
      },
      {
        trap_number: "09",
        location: "Cửa xuất hàng kho thành phẩm",
        trap_type: "Bẫy keo chuột",
        status: "Tốt",
        bait_status: "Keo tốt",
        pests_caught: 0,
        notes: "",
      },
      {
        trap_number: "10",
        location: "Khu phụ trợ lò hơi - máy nén khí",
        trap_type: "Bẫy lồng chuột",
        status: "Tốt",
        bait_status: "Còn mồi",
        pests_caught: 0,
        notes: "",
      },
    ],
  });

  // Allergen Form (BM01-CGDU)
  const [showAllergenModal, setShowAllergenModal] = useState(false);
  const [editingAllergen, setEditingAllergen] = useState<AllergenControl | null>(null);
  const [allergenForm, setAllergenForm] = useState({
    material_name: "",
    allergen_types: "Đậu nành (Soybeans)",
    is_contained_in_product: true,
    cross_contact_risk_stage: "",
    preventive_measures: "",
    responsible_person: "Huỳnh Quốc Bảo (KTV QA)",
    status: "ACTIVE",
  });

  // Visitor Form (BM03-KSSK)
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<VisitorHealthDeclaration | null>(null);
  const [visitorForm, setVisitorForm] = useState({
    visit_date: new Date().toISOString().split("T")[0],
    visitor_name: "",
    company_name: "",
    purpose_of_visit: "",
    has_diarrhea: false,
    has_fever_cough: false,
    has_open_wound: false,
    visited_epidemic_area: false,
    escort_person: "Nguyễn Văn An (Trưởng Ban ISO)",
    commitment_signed: true,
    notes: "",
  });

  // First Aid Form (BM01-KSSK)
  const [showFirstAidModal, setShowFirstAidModal] = useState(false);
  const [editingFirstAid, setEditingFirstAid] = useState<FirstAidLog | null>(null);
  const [firstAidForm, setFirstAidForm] = useState({
    issue_date: new Date().toISOString().split("T")[0],
    recipient_name: "",
    department: "Tổ Sơ chế rửa thái",
    reason_symptom: "",
    supplies_provided: "Băng dán cá nhân Urgo, dung dịch cồn đỏ Povidine",
    quantity: 1,
    dispenser_name: "Trần Kim Oanh (Y tá kiêm KTV QA)",
    status_after_aid:
      "Vết thương đã cầm máu và băng kín chống thấm, tiếp tục làm việc bình thường.",
    notes: "",
  });

  const [showPrintModal, setShowPrintModal] = useState(false);

  // Dynamic Form States
  const [showDynamicGmpModal, setShowDynamicGmpModal] = useState(false);
  const [gmpFormTemplate, setGmpFormTemplate] = useState<FormTemplateData | null>(null);
  const [selectedProgramForForm, setSelectedProgramForForm] = useState<PRPProgram | null>(null);

  // Deleting Confirmation States
  const [deletingProg, setDeletingProg] = useState<PRPProgram | null>(null);
  const [deletingChecklist, setDeletingChecklist] = useState<PRPChecklistLog | null>(null);
  const [deletingPestLog, setDeletingPestLog] = useState<PestControlLog | null>(null);
  const [deletingAllergen, setDeletingAllergen] = useState<AllergenControl | null>(null);
  const [deletingVisitor, setDeletingVisitor] = useState<VisitorHealthDeclaration | null>(null);
  const [deletingFirstAid, setDeletingFirstAid] = useState<FirstAidLog | null>(null);

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, cRes, pestRes, algRes, visRes, faRes] = await Promise.allSettled([
        api.get("/haccp/prp-programs"),
        api.get("/haccp/prp-checklists"),
        api.get("/haccp/pest-control-logs"),
        api.get("/haccp/allergen-controls"),
        api.get("/haccp/visitor-health-declarations"),
        api.get("/haccp/first-aid-logs"),
      ]);
      if (pRes.status === "fulfilled") setPrograms(pRes.value.data);
      if (cRes.status === "fulfilled") setChecklists(cRes.value.data);
      if (pestRes.status === "fulfilled") setPestLogs(pestRes.value.data);
      if (algRes.status === "fulfilled") setAllergens(algRes.value.data);
      if (visRes.status === "fulfilled") setVisitorDeclarations(visRes.value.data);
      if (faRes.status === "fulfilled") setFirstAidLogs(faRes.value.data);
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

  const filteredPestLogs = useMemo(() => {
    return pestLogs.filter((p) => {
      return (
        !pestSearch ||
        p.log_code.toLowerCase().includes(pestSearch.toLowerCase()) ||
        p.inspector_name.toLowerCase().includes(pestSearch.toLowerCase()) ||
        (p.corrective_actions &&
          p.corrective_actions.toLowerCase().includes(pestSearch.toLowerCase()))
      );
    });
  }, [pestLogs, pestSearch]);

  const filteredAllergens = useMemo(() => {
    return allergens.filter((a) => {
      return (
        !allergenSearch ||
        a.allergen_code.toLowerCase().includes(allergenSearch.toLowerCase()) ||
        a.material_name.toLowerCase().includes(allergenSearch.toLowerCase()) ||
        a.allergen_types.toLowerCase().includes(allergenSearch.toLowerCase()) ||
        a.responsible_person.toLowerCase().includes(allergenSearch.toLowerCase())
      );
    });
  }, [allergens, allergenSearch]);

  const filteredVisitors = useMemo(() => {
    return visitorDeclarations.filter((v) => {
      return (
        !visitorSearch ||
        v.declaration_code.toLowerCase().includes(visitorSearch.toLowerCase()) ||
        v.visitor_name.toLowerCase().includes(visitorSearch.toLowerCase()) ||
        v.company_name.toLowerCase().includes(visitorSearch.toLowerCase()) ||
        v.purpose_of_visit.toLowerCase().includes(visitorSearch.toLowerCase())
      );
    });
  }, [visitorDeclarations, visitorSearch]);

  const filteredFirstAid = useMemo(() => {
    return firstAidLogs.filter((f) => {
      return (
        !firstAidSearch ||
        f.log_code.toLowerCase().includes(firstAidSearch.toLowerCase()) ||
        f.recipient_name.toLowerCase().includes(firstAidSearch.toLowerCase()) ||
        f.department.toLowerCase().includes(firstAidSearch.toLowerCase()) ||
        f.reason_symptom.toLowerCase().includes(firstAidSearch.toLowerCase()) ||
        f.supplies_provided.toLowerCase().includes(firstAidSearch.toLowerCase())
      );
    });
  }, [firstAidLogs, firstAidSearch]);

  // Statistics
  const avgCompliance = useMemo(() => {
    if (checklists.length === 0) return 100.0;
    const sum = checklists.reduce((acc, curr) => acc + curr.compliance_rate, 0);
    return Math.round((sum / checklists.length) * 10) / 10;
  }, [checklists]);

  const actionRequiredCount = useMemo(() => {
    return checklists.filter((c) => c.status !== "COMPLIANT").length;
  }, [checklists]);

  // ==================== ACTIONS: PEST CONTROL (BM01-SVGH) ====================
  const handleOpenCreatePestLog = () => {
    setEditingPestLog(null);
    setPestForm({
      check_date: new Date().toISOString().split("T")[0],
      inspector_name: "Trần Văn Minh",
      corrective_actions: "",
      status: "COMPLETED",
      traps: [
        {
          trap_number: "01",
          location: "Cổng bảo vệ & Hàng rào phía Đông",
          trap_type: "Bẫy chuột hộp bả",
          status: "Tốt",
          bait_status: "Còn mồi",
          pests_caught: 0,
          notes: "",
        },
        {
          trap_number: "02",
          location: "Hàng rào giáp khu lưu giữ rác thải",
          trap_type: "Bẫy chuột hộp bả",
          status: "Tốt",
          bait_status: "Còn mồi",
          pests_caught: 0,
          notes: "",
        },
        {
          trap_number: "03",
          location: "Phía ngoài cửa kho nguyên liệu nông sản",
          trap_type: "Bẫy lồng chuột",
          status: "Tốt",
          bait_status: "Còn mồi",
          pests_caught: 0,
          notes: "",
        },
        {
          trap_number: "04",
          location: "Cửa ra vào khu sơ chế rửa thái",
          trap_type: "Đèn bắt côn trùng keo",
          status: "Tốt",
          bait_status: "Tấm dính tốt",
          pests_caught: 0,
          notes: "",
        },
        {
          trap_number: "05",
          location: "Hành lang phòng đệm xưởng sản xuất",
          trap_type: "Đèn bắt côn trùng keo",
          status: "Tốt",
          bait_status: "Tấm dính tốt",
          pests_caught: 0,
          notes: "",
        },
        {
          trap_number: "06",
          location: "Cửa kho sấy & làm nguội",
          trap_type: "Bẫy keo chuột",
          status: "Tốt",
          bait_status: "Keo tốt",
          pests_caught: 0,
          notes: "",
        },
        {
          trap_number: "07",
          location: "Khu vực nghiền và sàng lọc bột",
          trap_type: "Đèn bắt côn trùng keo",
          status: "Tốt",
          bait_status: "Tấm dính tốt",
          pests_caught: 0,
          notes: "",
        },
        {
          trap_number: "08",
          location: "Cửa kho bao bì & phụ liệu",
          trap_type: "Bẫy chuột hộp bả",
          status: "Tốt",
          bait_status: "Còn mồi",
          pests_caught: 0,
          notes: "",
        },
        {
          trap_number: "09",
          location: "Cửa xuất hàng kho thành phẩm",
          trap_type: "Bẫy keo chuột",
          status: "Tốt",
          bait_status: "Keo tốt",
          pests_caught: 0,
          notes: "",
        },
        {
          trap_number: "10",
          location: "Khu phụ trợ lò hơi - máy nén khí",
          trap_type: "Bẫy lồng chuột",
          status: "Tốt",
          bait_status: "Còn mồi",
          pests_caught: 0,
          notes: "",
        },
      ],
    });
    setShowPestModal(true);
  };

  const handleOpenEditPestLog = (item: PestControlLog) => {
    setEditingPestLog(item);
    setPestForm({
      check_date: item.check_date,
      inspector_name: item.inspector_name,
      corrective_actions: item.corrective_actions || "",
      status: item.status,
      traps:
        Array.isArray(item.trap_locations) && item.trap_locations.length > 0
          ? item.trap_locations
          : [],
    });
    setShowPestModal(true);
  };

  const handleSavePestLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        check_date: pestForm.check_date,
        inspector_name: pestForm.inspector_name,
        trap_locations: pestForm.traps,
        corrective_actions: pestForm.corrective_actions || null,
        status: pestForm.status,
      };

      if (editingPestLog) {
        await api.put(`/haccp/pest-control-logs/${editingPestLog.log_id}`, payload);
        toast.success("Cập nhật nhật ký bẫy chuột & côn trùng thành công!");
      } else {
        await api.post("/haccp/pest-control-logs", payload);
        toast.success("Lập báo cáo kiểm tra bẫy côn trùng thành công!");
      }
      setShowPestModal(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi lưu nhật ký bẫy côn trùng: " + (err.response?.data?.detail || err.message));
    }
  };

  const executeDeletePestLog = async (item: PestControlLog) => {
    try {
      await api.delete(`/haccp/pest-control-logs/${item.log_id}`);
      toast.success("Đã xóa báo cáo kiểm tra bẫy côn trùng!");
      fetchData();
    } catch (err: any) {
      toast.error("Không thể xóa: " + (err.response?.data?.detail || err.message));
    }
  };

  const handlePrintPestLog = (log: PestControlLog) => {
    const html = `
      <div style="font-family: 'Times New Roman', Times, serif; font-size: 13px; color: #111; line-height: 1.4; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #333; padding: 8px;">
              <div style="font-weight: bold; font-size: 14px;">AN GIANG FOOD</div>
              <div style="font-size: 11px; margin-top: 4px;">ISO 22000:2018 / HACCP</div>
            </td>
            <td style="width: 50%; text-align: center; border: 1px solid #333; padding: 8px;">
              <h2 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">BÁO CÁO KIỂM TRA BẪY CHUỘT, CÔN TRÙNG & ĐÈN BẮT MUỖI</h2>
              <div style="font-style: italic; font-size: 12px; margin-top: 4px;">(Kèm theo Quy trình Kiểm soát Sinh vật gây hại QT-SVGH)</div>
            </td>
            <td style="width: 25%; font-size: 11px; border: 1px solid #333; padding: 8px;">
              <div><strong>Mã biểu mẫu:</strong> BM01-SVGH</div>
              <div><strong>Lần ban hành:</strong> 02</div>
              <div><strong>Mã phiếu:</strong> ${log.log_code}</div>
              <div><strong>Ngày kiểm:</strong> ${log.check_date}</div>
            </td>
          </tr>
        </table>

        <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
          <div><strong>Người kiểm tra:</strong> ${log.inspector_name}</div>
          <div><strong>Tổng số sinh vật bắt được:</strong> <span style="font-weight: bold; color: #b91c1c;">${log.total_pests_caught}</span> con</div>
          <div><strong>Trạng thái:</strong> ${log.status === "COMPLETED" ? "ĐÃ HOÀN TẤT" : log.status}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
          <thead>
            <tr style="background: #f1f5f9; text-align: center;">
              <th style="border: 1px solid #333; padding: 6px; width: 40px;">STT</th>
              <th style="border: 1px solid #333; padding: 6px;">Vị trí đặt bẫy / đèn</th>
              <th style="border: 1px solid #333; padding: 6px; width: 140px;">Loại bẫy / Thiết bị</th>
              <th style="border: 1px solid #333; padding: 6px; width: 80px;">Tình trạng bẫy</th>
              <th style="border: 1px solid #333; padding: 6px; width: 80px;">Tình trạng mồi / keo</th>
              <th style="border: 1px solid #333; padding: 6px; width: 70px;">Bắt được</th>
              <th style="border: 1px solid #333; padding: 6px;">Ghi chú / Hành động tại chỗ</th>
            </tr>
          </thead>
          <tbody>
            ${(log.trap_locations || [])
              .map(
                (t, idx) => `
              <tr>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${t.trap_number || idx + 1}</td>
                <td style="border: 1px solid #333; padding: 6px;">${t.location}</td>
                <td style="border: 1px solid #333; padding: 6px;">${t.trap_type}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${t.status}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${t.bait_status}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold; ${t.pests_caught > 0 ? "color: red;" : ""}">${t.pests_caught}</td>
                <td style="border: 1px solid #333; padding: 6px;">${t.notes || ""}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <div style="border: 1px solid #333; padding: 10px; margin-bottom: 30px; background: #fafafa;">
          <strong>Biện pháp khắc phục / Hành động phòng ngừa:</strong>
          <p style="margin: 6px 0 0 0;">${log.corrective_actions || "Hệ thống bẫy hoạt động bình thường, không phát hiện vi phạm quy chuẩn an toàn sinh học."}</p>
        </div>

        <table style="width: 100%; text-align: center; border: none;">
          <tr>
            <td style="width: 50%;">
              <strong>NGƯỜI KIỂM TRA</strong><br/>
              <span style="font-size: 11px; font-style: italic;">(Ký và ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <strong>${log.inspector_name}</strong>
            </td>
            <td style="width: 50%;">
              <strong>TRƯỞNG BAN ISO / QA DUYỆT</strong><br/>
              <span style="font-size: 11px; font-style: italic;">(Ký và ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <strong>Nguyễn Văn An</strong>
            </td>
          </tr>
        </table>
      </div>
    `;
    printHtml(html);
  };

  // ==================== ACTIONS: ALLERGENS (BM01-CGDU) ====================
  const handleOpenCreateAllergen = () => {
    setEditingAllergen(null);
    setAllergenForm({
      material_name: "",
      allergen_types: "Đậu nành (Soybeans)",
      is_contained_in_product: true,
      cross_contact_risk_stage: "",
      preventive_measures: "",
      responsible_person: "Huỳnh Quốc Bảo (KTV QA)",
      status: "ACTIVE",
    });
    setShowAllergenModal(true);
  };

  const handleOpenEditAllergen = (item: AllergenControl) => {
    setEditingAllergen(item);
    setAllergenForm({
      material_name: item.material_name,
      allergen_types: item.allergen_types,
      is_contained_in_product: item.is_contained_in_product,
      cross_contact_risk_stage: item.cross_contact_risk_stage || "",
      preventive_measures: item.preventive_measures,
      responsible_person: item.responsible_person,
      status: item.status,
    });
    setShowAllergenModal(true);
  };

  const handleSaveAllergen = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...allergenForm,
        cross_contact_risk_stage: allergenForm.cross_contact_risk_stage || null,
      };

      if (editingAllergen) {
        await api.put(`/haccp/allergen-controls/${editingAllergen.allergen_id}`, payload);
        toast.success("Cập nhật danh mục dị nguyên thành công!");
      } else {
        await api.post("/haccp/allergen-controls", payload);
        toast.success("Thêm mới kiểm soát chất gây dị ứng thành công!");
      }
      setShowAllergenModal(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi lưu dị nguyên: " + (err.response?.data?.detail || err.message));
    }
  };

  const executeDeleteAllergen = async (item: AllergenControl) => {
    try {
      await api.delete(`/haccp/allergen-controls/${item.allergen_id}`);
      toast.success("Đã xóa chất gây dị ứng!");
      fetchData();
    } catch (err: any) {
      toast.error("Không thể xóa: " + (err.response?.data?.detail || err.message));
    }
  };

  const handlePrintAllergens = () => {
    const html = `
      <div style="font-family: 'Times New Roman', Times, serif; font-size: 13px; color: #111; line-height: 1.4; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #333; padding: 8px;">
              <div style="font-weight: bold; font-size: 14px;">AN GIANG FOOD</div>
              <div style="font-size: 11px; margin-top: 4px;">ISO 22000:2018 / PRP</div>
            </td>
            <td style="width: 50%; text-align: center; border: 1px solid #333; padding: 8px;">
              <h2 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">DANH MỤC NHẬN DIỆN VÀ KIỂM SOÁT CHẤT GÂY DỊ ỨNG (ALLERGENS)</h2>
              <div style="font-style: italic; font-size: 12px; margin-top: 4px;">(Kèm theo Quy trình Kiểm soát Chất gây Dị ứng QT-CGDU)</div>
            </td>
            <td style="width: 25%; font-size: 11px; border: 1px solid #333; padding: 8px;">
              <div><strong>Mã biểu mẫu:</strong> BM01-CGDU</div>
              <div><strong>Lần ban hành:</strong> 01</div>
              <div><strong>Ngày in:</strong> ${new Date().toLocaleDateString("vi-VN")}</div>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
          <thead>
            <tr style="background: #f1f5f9; text-align: center;">
              <th style="border: 1px solid #333; padding: 6px; width: 40px;">STT</th>
              <th style="border: 1px solid #333; padding: 6px; width: 80px;">Mã</th>
              <th style="border: 1px solid #333; padding: 6px;">Tên nguyên liệu / Bán thành phẩm</th>
              <th style="border: 1px solid #333; padding: 6px; width: 140px;">Nhóm chất gây dị ứng</th>
              <th style="border: 1px solid #333; padding: 6px; width: 80px;">Có trong SP</th>
              <th style="border: 1px solid #333; padding: 6px;">Công đoạn nguy cơ lây nhiễm chéo</th>
              <th style="border: 1px solid #333; padding: 6px;">Biện pháp kiểm soát & Ngăn ngừa</th>
              <th style="border: 1px solid #333; padding: 6px; width: 110px;">Phụ trách</th>
            </tr>
          </thead>
          <tbody>
            ${allergens
              .map(
                (a, idx) => `
              <tr>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #333; padding: 6px; font-weight: bold; text-align: center;">${a.allergen_code}</td>
                <td style="border: 1px solid #333; padding: 6px; font-weight: 600;">${a.material_name}</td>
                <td style="border: 1px solid #333; padding: 6px; color: #b45309; font-weight: bold;">${a.allergen_types}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${a.is_contained_in_product ? "CÓ" : "KHÔNG"}</td>
                <td style="border: 1px solid #333; padding: 6px;">${a.cross_contact_risk_stage || "-"}</td>
                <td style="border: 1px solid #333; padding: 6px;">${a.preventive_measures}</td>
                <td style="border: 1px solid #333; padding: 6px;">${a.responsible_person}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <table style="width: 100%; text-align: center; border: none;">
          <tr>
            <td style="width: 50%;">
              <strong>NGƯỜI LẬP DANH MỤC</strong><br/>
              <span style="font-size: 11px; font-style: italic;">(Ký và ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <strong>Huỳnh Quốc Bảo</strong>
            </td>
            <td style="width: 50%;">
              <strong>ĐỘI TRƯỞNG ĐỘI ATTP DUYỆT</strong><br/>
              <span style="font-size: 11px; font-style: italic;">(Ký và ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <strong>Nguyễn Văn An</strong>
            </td>
          </tr>
        </table>
      </div>
    `;
    printHtml(html);
  };

  // ==================== ACTIONS: VISITOR HEALTH (BM03-KSSK) ====================
  const handleOpenCreateVisitor = () => {
    setEditingVisitor(null);
    setVisitorForm({
      visit_date: new Date().toISOString().split("T")[0],
      visitor_name: "",
      company_name: "",
      purpose_of_visit: "",
      has_diarrhea: false,
      has_fever_cough: false,
      has_open_wound: false,
      visited_epidemic_area: false,
      escort_person: "Nguyễn Văn An (Trưởng Ban ISO)",
      commitment_signed: true,
      notes: "",
    });
    setShowVisitorModal(true);
  };

  const handleOpenEditVisitor = (item: VisitorHealthDeclaration) => {
    setEditingVisitor(item);
    setVisitorForm({
      visit_date: item.visit_date,
      visitor_name: item.visitor_name,
      company_name: item.company_name,
      purpose_of_visit: item.purpose_of_visit,
      has_diarrhea: item.has_diarrhea,
      has_fever_cough: item.has_fever_cough,
      has_open_wound: item.has_open_wound,
      visited_epidemic_area: item.visited_epidemic_area,
      escort_person: item.escort_person || "",
      commitment_signed: item.commitment_signed,
      notes: item.notes || "",
    });
    setShowVisitorModal(true);
  };

  const handleSaveVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...visitorForm,
        escort_person: visitorForm.escort_person || null,
        notes: visitorForm.notes || null,
      };

      if (editingVisitor) {
        await api.put(
          `/haccp/visitor-health-declarations/${editingVisitor.declaration_id}`,
          payload,
        );
        toast.success("Cập nhật phiếu khai báo y tế thành công!");
      } else {
        await api.post("/haccp/visitor-health-declarations", payload);
        toast.success("Lập phiếu khai báo y tế khách thành công!");
      }
      setShowVisitorModal(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi lưu phiếu khai báo: " + (err.response?.data?.detail || err.message));
    }
  };

  const executeDeleteVisitor = async (item: VisitorHealthDeclaration) => {
    try {
      await api.delete(`/haccp/visitor-health-declarations/${item.declaration_id}`);
      toast.success("Đã xóa phiếu khai báo y tế!");
      fetchData();
    } catch (err: any) {
      toast.error("Không thể xóa: " + (err.response?.data?.detail || err.message));
    }
  };

  const handlePrintVisitor = (v: VisitorHealthDeclaration) => {
    const html = `
      <div style="font-family: 'Times New Roman', Times, serif; font-size: 13px; color: #111; line-height: 1.5; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #333; padding: 8px;">
              <div style="font-weight: bold; font-size: 14px;">AN GIANG FOOD</div>
              <div style="font-size: 11px; margin-top: 4px;">ISO 22000:2018 / PRP</div>
            </td>
            <td style="width: 50%; text-align: center; border: 1px solid #333; padding: 8px;">
              <h2 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">PHIẾU KÊ KHAI SỨC KHỎE KHÁCH VÀO KHU VỰC SẢN XUẤT</h2>
              <div style="font-style: italic; font-size: 12px; margin-top: 4px;">(Ban hành kèm theo Quy trình Kiểm soát Sức khỏe QT-KSSK)</div>
            </td>
            <td style="width: 25%; font-size: 11px; border: 1px solid #333; padding: 8px;">
              <div><strong>Mã biểu mẫu:</strong> BM03-KSSK</div>
              <div><strong>Mã phiếu:</strong> ${v.declaration_code}</div>
              <div><strong>Ngày thăm:</strong> ${v.visit_date}</div>
            </td>
          </tr>
        </table>

        <p style="font-style: italic; margin-bottom: 16px;">
          Chào mừng Quý khách đến thăm Công ty chúng tôi! Vì lý do đảm bảo vệ sinh an toàn thực phẩm và phòng ngừa nguy cơ lây nhiễm chéo vào thực phẩm, xin Quý khách vui lòng điền các thông tin dưới đây:
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 6px 0; width: 50%;"><strong>1. Họ và tên khách:</strong> ${v.visitor_name}</td>
            <td style="padding: 6px 0; width: 50%;"><strong>2. Cơ quan / Đơn vị:</strong> ${v.company_name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;" colspan="2"><strong>3. Mục đích vào khu vực sản xuất:</strong> ${v.purpose_of_visit}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;" colspan="2"><strong>4. Người tiếp đón / Bảo lãnh:</strong> ${v.escort_person || "Ban ISO / KTV QA"}</td>
          </tr>
        </table>

        <div style="font-weight: bold; margin-bottom: 8px;">5. Tình trạng sức khỏe hiện tại (Đánh dấu X vào ô thích hợp):</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #333; padding: 6px; width: 40px; text-align: center;">STT</th>
              <th style="border: 1px solid #333; padding: 6px;">Nội dung triệu chứng / Yếu tố dịch tễ</th>
              <th style="border: 1px solid #333; padding: 6px; width: 80px; text-align: center;">Có</th>
              <th style="border: 1px solid #333; padding: 6px; width: 80px; text-align: center;">Không</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #333; padding: 6px; text-align: center;">1</td>
              <td style="border: 1px solid #333; padding: 6px;">Quý khách có đang bị tiêu chảy, đau bụng hoặc rối loạn tiêu hóa?</td>
              <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold;">${v.has_diarrhea ? "X" : ""}</td>
              <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold;">${!v.has_diarrhea ? "X" : ""}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #333; padding: 6px; text-align: center;">2</td>
              <td style="border: 1px solid #333; padding: 6px;">Quý khách có bị sốt, cảm cúm, ho nhiều hoặc viêm đường hô hấp?</td>
              <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold;">${v.has_fever_cough ? "X" : ""}</td>
              <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold;">${!v.has_fever_cough ? "X" : ""}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #333; padding: 6px; text-align: center;">3</td>
              <td style="border: 1px solid #333; padding: 6px;">Quý khách có vết thương hở, vết bỏng hoặc bệnh ngoài da chưa băng kín chống thấm?</td>
              <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold;">${v.has_open_wound ? "X" : ""}</td>
              <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold;">${!v.has_open_wound ? "X" : ""}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #333; padding: 6px; text-align: center;">4</td>
              <td style="border: 1px solid #333; padding: 6px;">Trong 14 ngày qua, Quý khách có tiếp xúc với người bệnh truyền nhiễm nguy hiểm?</td>
              <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold;">${v.visited_epidemic_area ? "X" : ""}</td>
              <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold;">${!v.visited_epidemic_area ? "X" : ""}</td>
            </tr>
          </tbody>
        </table>

        <div style="border: 2px solid #333; padding: 12px; margin-bottom: 20px; background: ${v.is_approved_entry ? "#f0fdf4" : "#fef2f2"};">
          <div style="font-weight: bold; font-size: 14px;">KẾT LUẬN CỦA BỘ PHẬN KIỂM SOÁT AN TOÀN VỆ SINH:</div>
          <div style="margin-top: 6px; font-size: 13px;">
            ${v.is_approved_entry ? "<strong>[X] ĐỦ ĐIỀU KIỆN VÀO KHU VỰC SẢN XUẤT</strong> (Yêu cầu trang bị đầy đủ bảo hộ, rửa tay sát khuẩn 6 bước)" : "<strong style='color: red;'>[X] TỪ CHỐI CHO PHÉP VÀO KHU VỰC SẢN XUẤT</strong> (Do có triệu chứng bệnh truyền nhiễm / vết thương hở)"}
          </div>
          ${v.notes ? `<div style="margin-top: 4px; font-style: italic;">Ghi chú: ${v.notes}</div>` : ""}
        </div>

        <p style="font-size: 12px; margin-bottom: 25px;">
          <strong>Cam kết của khách:</strong> Tôi xin cam đoan các thông tin kê khai trên là hoàn toàn chính xác. Tôi cam kết tuân thủ nghiêm ngặt mọi nội quy an toàn thực phẩm, mang đầy đủ trang phục bảo hộ và sự hướng dẫn của cán bộ công ty trong suốt thời gian có mặt tại xưởng.
        </p>

        <table style="width: 100%; text-align: center; border: none;">
          <tr>
            <td style="width: 50%;">
              <strong>KHÁCH THĂM QUAN</strong><br/>
              <span style="font-size: 11px; font-style: italic;">(Ký và ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <strong>${v.visitor_name}</strong>
            </td>
            <td style="width: 50%;">
              <strong>NGƯỜI TIẾP ĐÓN / KTV BẢO LÃNH</strong><br/>
              <span style="font-size: 11px; font-style: italic;">(Ký và ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <strong>${v.escort_person || "Nguyễn Văn An"}</strong>
            </td>
          </tr>
        </table>
      </div>
    `;
    printHtml(html);
  };

  // ==================== ACTIONS: FIRST AID (BM01-KSSK) ====================
  const handleOpenCreateFirstAid = () => {
    setEditingFirstAid(null);
    setFirstAidForm({
      issue_date: new Date().toISOString().split("T")[0],
      recipient_name: "",
      department: "Tổ Sơ chế rửa thái",
      reason_symptom: "",
      supplies_provided: "Băng dán cá nhân Urgo, dung dịch cồn đỏ Povidine",
      quantity: 1,
      dispenser_name: "Trần Kim Oanh (Y tá kiêm KTV QA)",
      status_after_aid:
        "Vết thương đã cầm máu và băng kín chống thấm, tiếp tục làm việc bình thường.",
      notes: "",
    });
    setShowFirstAidModal(true);
  };

  const handleOpenEditFirstAid = (item: FirstAidLog) => {
    setEditingFirstAid(item);
    setFirstAidForm({
      issue_date: item.issue_date,
      recipient_name: item.recipient_name,
      department: item.department,
      reason_symptom: item.reason_symptom,
      supplies_provided: item.supplies_provided,
      quantity: item.quantity,
      dispenser_name: item.dispenser_name,
      status_after_aid: item.status_after_aid,
      notes: item.notes || "",
    });
    setShowFirstAidModal(true);
  };

  const handleSaveFirstAid = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...firstAidForm,
        notes: firstAidForm.notes || null,
      };

      if (editingFirstAid) {
        await api.put(`/haccp/first-aid-logs/${editingFirstAid.log_id}`, payload);
        toast.success("Cập nhật bản ghi cấp phát thuốc sơ cứu thành công!");
      } else {
        await api.post("/haccp/first-aid-logs", payload);
        toast.success("Ghi sổ cấp phát thuốc sơ cứu thành công!");
      }
      setShowFirstAidModal(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi lưu sổ cấp thuốc: " + (err.response?.data?.detail || err.message));
    }
  };

  const executeDeleteFirstAid = async (item: FirstAidLog) => {
    try {
      await api.delete(`/haccp/first-aid-logs/${item.log_id}`);
      toast.success("Đã xóa bản ghi cấp phát tủ thuốc!");
      fetchData();
    } catch (err: any) {
      toast.error("Không thể xóa: " + (err.response?.data?.detail || err.message));
    }
  };

  const handlePrintFirstAid = (f: FirstAidLog) => {
    const html = `
      <div style="font-family: 'Times New Roman', Times, serif; font-size: 13px; color: #111; line-height: 1.5; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #333; padding: 8px;">
              <div style="font-weight: bold; font-size: 14px;">AN GIANG FOOD</div>
              <div style="font-size: 11px; margin-top: 4px;">ISO 22000:2018 / PRP</div>
            </td>
            <td style="width: 50%; text-align: center; border: 1px solid #333; padding: 8px;">
              <h2 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">SỔ THEO DÕI CẤP PHÁT THUỐC VÀ DỤNG CỤ Y TẾ SƠ CỨU XƯỞNG</h2>
              <div style="font-style: italic; font-size: 12px; margin-top: 4px;">(Theo dõi Tủ thuốc Sơ cứu Hiện trường BM01-KSSK)</div>
            </td>
            <td style="width: 25%; font-size: 11px; border: 1px solid #333; padding: 8px;">
              <div><strong>Mã biểu mẫu:</strong> BM01-KSSK</div>
              <div><strong>Mã phiếu:</strong> ${f.log_code}</div>
              <div><strong>Ngày cấp:</strong> ${f.issue_date}</div>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 6px 0; width: 50%;"><strong>Họ và tên người nhận thuốc:</strong> ${f.recipient_name}</td>
            <td style="padding: 6px 0; width: 50%;"><strong>Bộ phận / Dây chuyền:</strong> ${f.department}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;" colspan="2"><strong>Lý do / Triệu chứng tai nạn:</strong> ${f.reason_symptom}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;" colspan="2"><strong>Thuốc và dụng cụ y tế đã cấp phát:</strong> ${f.supplies_provided} (Số lượng: ${f.quantity})</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;" colspan="2"><strong>Người cấp phát thuốc:</strong> ${f.dispenser_name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;" colspan="2"><strong>Tình trạng người bệnh sau sơ cứu:</strong> ${f.status_after_aid}</td>
          </tr>
          ${f.notes ? `<tr><td style="padding: 6px 0;" colspan="2"><strong>Ghi chú:</strong> ${f.notes}</td></tr>` : ""}
        </table>

        <div style="margin-top: 40px;">
          <table style="width: 100%; text-align: center; border: none;">
            <tr>
              <td style="width: 50%;">
                <strong>NGƯỜI NHẬN THUỐC</strong><br/>
                <span style="font-size: 11px; font-style: italic;">(Ký và ghi rõ họ tên)</span>
                <div style="height: 60px;"></div>
                <strong>${f.recipient_name}</strong>
              </td>
              <td style="width: 50%;">
                <strong>CÁN BỘ PHỤ TRÁCH TỦ THUỐC</strong><br/>
                <span style="font-size: 11px; font-style: italic;">(Ký và ghi rõ họ tên)</span>
                <div style="height: 60px;"></div>
                <strong>${f.dispenser_name}</strong>
              </td>
            </tr>
          </table>
        </div>
      </div>
    `;
    printHtml(html);
  };

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

  const executeDeleteProg = async (p: PRPProgram) => {
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
        toast.warning(
          `Checklist có hạng mục cần khắc phục! Tỷ lệ tuân thủ: ${saved.compliance_rate}%`,
        );
      }
      setShowCheckModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu checklist");
    }
  };

  const executeDeleteChecklist = async (c: PRPChecklistLog) => {
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
          description:
            "Giám sát tình trạng vệ sinh bề mặt tiếp xúc thực phẩm, bảo hộ lao động và hệ thống thoát sàn trước ca sản xuất.",
          version: "1.0",
          fields: [
            {
              id: "g_shift",
              name: "shift_name",
              label: "Ca Sản Xuất",
              type: "SELECT",
              options: ["Ca 1 (06:00 - 14:00)", "Ca 2 (14:00 - 22:00)", "Ca 3 (22:00 - 06:00)"],
              required: true,
              default_value: "Ca 1 (06:00 - 14:00)",
            },
            {
              id: "g_area",
              name: "area_checked",
              label: "Khu Vực / Dây Chuyền Giám Sát",
              type: "TEXT",
              required: true,
              default_value: program ? program.program_name : "Khu vực sơ chế & chế biến chính",
            },
            {
              id: "g_surface",
              name: "surface_clean",
              label: "Bề mặt bàn chế biến, dao, thớt đã khử trùng bằng Chlorine 200ppm?",
              type: "YESNO",
              required: true,
              default_value: true,
            },
            {
              id: "g_ppe",
              name: "ppe_compliance",
              label: "100% công nhân mang đầy đủ mũ trùm, khẩu trang, găng tay và ủng?",
              type: "YESNO",
              required: true,
              default_value: true,
            },
            {
              id: "g_drain",
              name: "drain_clean",
              label: "Hệ thống thoát sàn và rãnh thu gom phế thải thông thoáng, không ứ đọng?",
              type: "YESNO",
              required: true,
              default_value: true,
            },
            {
              id: "g_pest",
              name: "no_pest_activity",
              label: "Bẫy côn trùng, đèn diệt ruồi hoạt động tốt, không có dấu vết dịch hại?",
              type: "YESNO",
              required: true,
              default_value: true,
            },
            {
              id: "g_score",
              name: "compliance_score",
              label: "Đánh giá mức độ tuân thủ (Thang điểm 1-5 sao)",
              type: "RATING",
              required: true,
              default_value: 5,
            },
            {
              id: "g_notes",
              name: "finding_notes",
              label: "Ghi chú bất thường (nếu có)",
              type: "TEXT",
              required: false,
              default_value: "Mọi tiêu chuẩn vệ sinh đều đạt yêu cầu trước khi bắt đầu ca.",
            },
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
      const progId = selectedProgramForForm
        ? selectedProgramForForm.program_id
        : programs[0]?.program_id || "PRP-01";
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
          {
            item: "Vệ sinh bề mặt bàn chế biến & dụng cụ",
            result: surfacePass ? "Đạt" : "Không đạt",
          },
          { item: "Trang phục bảo hộ công nhân", result: ppePass ? "Đạt" : "Không đạt" },
          { item: "Thoát sàn & rãnh thu gom", result: drainPass ? "Đạt" : "Không đạt" },
          { item: "Kiểm soát dịch hại & bẫy côn trùng", result: pestPass ? "Đạt" : "Không đạt" },
        ],
        compliance_rate: compRate,
        status:
          compRate === 100 ? "COMPLIANT" : compRate >= 75 ? "ACTION_REQUIRED" : "NON_COMPLIANT",
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
    if (group === "GMP")
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 border border-blue-200">
          GMP
        </span>
      );
    if (group === "SSOP")
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200">
          SSOP
        </span>
      );
    if (group === "5S")
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-700 border border-purple-200">
          5S
        </span>
      );
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        {group}
      </span>
    );
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
          description="Thư viện quy chuẩn thực hành sản xuất tốt (GMP), quy trình vệ sinh chuẩn (SSOP), 5S và giám sát checklist theo ca sản xuất theo ISO 22000:2018."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGuide(true)}
            className="border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1.5 font-bold text-xs"
          >
            <BookOpen className="h-4 w-4 text-emerald-600" />
            <span>Hướng Dẫn Nghiệp Vụ</span>
          </Button>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrintModal(true)}
            className="border-primary/30 text-primary hover:bg-primary/5"
          >
            <Printer className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">In Bảng Đánh Giá PRP (BM-PRP-01)</span>
            <span className="sm:hidden">In BM-PRP-01</span>
          </Button>
          <Button
            size="sm"
            onClick={() => handleOpenCreateChecklist()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Thực hiện Checklist Ca
          </Button>
        </div>
      </div>

      {/* ==================== 4 KPI CARDS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card rounded-xl border p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Chương trình PRP / GMP / SSOP
            </span>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {programs.length}
            </span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              100% Hoạt động
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Bao phủ toàn bộ quy chuẩn nhà máy</p>
        </div>

        <div className="bg-card rounded-xl border p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tỷ lệ Tuân thủ Trung bình
            </span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {avgCompliance}%
            </span>
            <span className="text-xs font-medium text-muted-foreground">Đạt chuẩn ISO</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Đánh giá trên toàn bộ ca kiểm tra</p>
        </div>

        <div className="bg-card rounded-xl border p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Checklist Đã Hoàn Thành
            </span>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {checklists.length}
            </span>
            <span className="text-xs font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
              Ca sáng & Chiều
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Đầy đủ chữ ký & ảnh hiện trường</p>
        </div>

        <div className="bg-card rounded-xl border p-3.5 sm:p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hạng mục Cần Khắc Phục
            </span>
            <div
              className={`p-2 rounded-lg ${actionRequiredCount > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-extrabold ${actionRequiredCount > 0 ? "text-amber-600" : "text-foreground"}`}
            >
              {actionRequiredCount}
            </span>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              Đã xử lý bổ sung
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Không có lỗi nghiêm trọng</p>
        </div>
      </div>

      {/* ==================== 6 TABS NAVIGATION ==================== */}
      <div className="border-b overflow-x-auto no-scrollbar">
        <div className="flex space-x-1 sm:space-x-4 min-w-max pb-1">
          <button
            onClick={() => setActiveTab("programs")}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "programs"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            Thư viện Quy chuẩn PRP ({programs.length})
          </button>
          <button
            onClick={() => setActiveTab("checklists")}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "checklists"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardCheck className="h-4 w-4" />
            Checklist Giám Sát Theo Ca ({checklists.length})
          </button>
          <button
            onClick={() => setActiveTab("pest_control")}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "pest_control"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bug className="h-4 w-4 text-emerald-600" />
            Kiểm Soát Bẫy Chuột & Côn Trùng (BM01-SVGH) ({pestLogs.length})
          </button>
          <button
            onClick={() => setActiveTab("allergens")}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "allergens"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            Chất Gây Dị Ứng (BM01-CGDU) ({allergens.length})
          </button>
          <button
            onClick={() => setActiveTab("visitor_health")}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "visitor_health"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCheck className="h-4 w-4 text-blue-600" />
            Kê Khai Y Tế Khách (BM03-KSSK) ({visitorDeclarations.length})
          </button>
          <button
            onClick={() => setActiveTab("first_aid")}
            className={`pb-2.5 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeTab === "first_aid"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <HeartPulse className="h-4 w-4 text-rose-600" />
            Tủ Thuốc Sơ Cứu Xưởng (BM01-KSSK) ({firstAidLogs.length})
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: PRP PROGRAMS ==================== */}
      {activeTab === "programs" &&
        (programs.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Chưa có chương trình tiên quyết (PRP / GMP / SSOP) nào"
            description="Khởi tạo thư viện các chương trình thực hành sản xuất tốt GMP, kiểm soát vệ sinh chuẩn SSOP và 5S cho nhà máy."
            actionLabel="+ Thêm Chương Trình Mới"
            onAction={handleOpenCreateProg}
            onGuide={() => setShowGuide(true)}
          />
        ) : (
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
                <Button
                  onClick={handleOpenCreateProg}
                  size="sm"
                  className="bg-primary text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" /> Thêm chương trình mới
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPrograms.map((p) => (
                <div
                  key={p.program_id}
                  className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-all space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                        {p.program_code}
                      </span>
                      {getGroupBadge(p.group)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditProg(p)}
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingProg(p)}
                        className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                        title="Xóa chương trình"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-foreground">{p.program_name}</h4>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {p.description}
                      </p>
                    )}
                  </div>

                  <div className="bg-muted/40 p-2.5 rounded-lg border text-xs space-y-1">
                    <p>
                      <span className="text-muted-foreground">Phạm vi:</span>{" "}
                      <span className="font-medium text-foreground">
                        {p.scope || "Toàn nhà máy"}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Tần suất:</span>{" "}
                      <span className="font-medium text-foreground">{p.frequency}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Phụ trách:</span>{" "}
                      <span className="font-medium text-foreground">{p.responsible_dept}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between text-xs gap-1.5">
                    <span className="text-muted-foreground">{p.checklist_count} lượt kiểm</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenGmpDynamicForm(p)}
                        className="text-xs h-7 border-sky-300 text-sky-700 hover:bg-sky-50"
                      >
                        <Sliders className="h-3 w-3 mr-1" /> Form Động
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCreateChecklist(p)}
                        className="text-xs h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Checklist
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      {/* ==================== TAB 2: CHECKLISTS ==================== */}
      {activeTab === "checklists" &&
        (checklists.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Chưa có nhật ký checklist giám sát ca nào"
            description="Thực hiện kiểm tra tuân thủ các quy định GMP, SSOP và 5S theo từng ca sản xuất trong ngày."
            actionLabel="+ Thực Hiện Checklist Ca Mới"
            onAction={() => handleOpenCreateChecklist()}
            onGuide={() => setShowGuide(true)}
          />
        ) : (
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
              <Button
                onClick={() => handleOpenCreateChecklist()}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" /> Thực hiện Checklist mới
              </Button>
            </div>

            <div className="space-y-3">
              {filteredChecklists.map((c) => (
                <div key={c.check_id} className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-primary">
                        [{c.program_code}]
                      </span>
                      <h4 className="font-bold text-sm text-foreground">{c.program_name}</h4>
                      <span className="text-xs px-2 py-0.5 bg-muted rounded font-medium">
                        {c.shift_name} ({c.check_time || "07:30"})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                        Tuân thủ: {c.compliance_rate}%
                      </span>
                      {getStatusBadge(c.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingChecklist(c)}
                        className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                        title="Xóa bản ghi checklist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    {c.items_checked.map((it, idx) => (
                      <div
                        key={idx}
                        className="bg-muted/30 p-2.5 rounded-lg border flex items-start justify-between gap-2"
                      >
                        <div>
                          <p className="font-medium text-foreground">{it.item}</p>
                          {it.note && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                              {it.note}
                            </p>
                          )}
                        </div>
                        <span
                          className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${it.result === "Đạt" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                        >
                          {it.result}
                        </span>
                      </div>
                    ))}
                  </div>

                  {(c.finding_notes || c.corrective_action) && (
                    <div className="p-2.5 bg-amber-500/5 rounded-lg border border-amber-200 text-xs space-y-1">
                      {c.finding_notes && (
                        <p>
                          <span className="font-bold text-amber-800">Ghi nhận:</span>{" "}
                          {c.finding_notes}
                        </p>
                      )}
                      {c.corrective_action && (
                        <p>
                          <span className="font-bold text-emerald-800">Khắc phục:</span>{" "}
                          {c.corrective_action}
                        </p>
                      )}
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
        ))}

      {/* ==================== TAB 3: PEST CONTROL (BM01-SVGH) ==================== */}
      {activeTab === "pest_control" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo mã phiếu, người kiểm tra, biện pháp khắc phục..."
                  value={pestSearch}
                  onChange={(e) => setPestSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <Button
              onClick={handleOpenCreatePestLog}
              size="sm"
              className="gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <Plus className="h-4 w-4" />
              Lập Báo Cáo Kiểm Tra Bẫy (BM01-SVGH)
            </Button>
          </div>

          {filteredPestLogs.length === 0 ? (
            <EmptyState
              icon={Bug}
              title="Chưa có nhật ký kiểm tra bẫy côn trùng / chuột nào"
              description="Theo quy trình kiểm soát sinh vật gây hại BM01-SVGH, định kỳ hàng tuần cần kiểm tra toàn bộ bẫy hộp bả, bẫy keo và đèn diệt ruồi."
              actionLabel="+ Lập Báo Cáo Kiểm Tra Mới"
              onAction={handleOpenCreatePestLog}
              onGuide={() => setShowGuide(true)}
            />
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <Bug className="h-4 w-4 text-emerald-600" />
                    Sổ Kiểm Tra Bẫy Chuột, Côn Trùng & Đèn Bắt Muỗi (BM01-SVGH)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hồ sơ Thư mục 07 An Giang — Giám sát 10 vị trí bẫy ngoại vi và đèn keo nội vi
                    xưởng chế biến.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Tổng đợt kiểm tra: {pestLogs.length}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 font-semibold text-rose-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> Tổng sinh vật bắt được:{" "}
                    {pestLogs.reduce((acc, curr) => acc + (curr.total_pests_caught || 0), 0)} con
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[11px] font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Mã Phiếu & Ngày Kiểm</th>
                      <th className="py-2.5 px-3">Người Kiểm Tra</th>
                      <th className="py-2.5 px-3 text-center">Vị Trí Đã Kiểm Tra</th>
                      <th className="py-2.5 px-3 text-center">Tổng Bắt Được</th>
                      <th className="py-2.5 px-3">Biện Pháp Khắc Phục / Đánh Giá</th>
                      <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                      <th className="py-2.5 px-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPestLogs.map((log) => (
                      <tr key={log.log_id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          <div className="font-mono text-primary font-bold">{log.log_code}</div>
                          <div className="text-[11px] text-muted-foreground">{log.check_date}</div>
                        </td>
                        <td className="py-2.5 px-3 font-medium">{log.inspector_name}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            {log.trap_locations?.length || 0} vị trí bẫy
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${log.total_pests_caught > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}
                          >
                            {log.total_pests_caught} con
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs max-w-xs text-muted-foreground truncate">
                          {log.corrective_actions ||
                            "Bẫy sạch, mồi tốt, không có phát hiện bất thường."}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {log.status === "COMPLETED" ? "Đã kiểm tra" : log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                              onClick={() => handlePrintPestLog(log)}
                              title="In phiếu BM01-SVGH"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEditPestLog(log)}
                              title="Sửa bản ghi"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => setDeletingPestLog(log)}
                              title="Xóa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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

      {/* ==================== TAB 4: ALLERGENS (BM01-CGDU) ==================== */}
      {activeTab === "allergens" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo mã, tên nguyên liệu, nhóm chất gây dị ứng, người phụ trách..."
                  value={allergenSearch}
                  onChange={(e) => setAllergenSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintAllergens}
                className="gap-2 border-primary/30 text-primary hover:bg-primary/5 font-semibold"
              >
                <Printer className="h-4 w-4" />
                In Danh Mục (BM01-CGDU)
              </Button>
              <Button
                onClick={handleOpenCreateAllergen}
                size="sm"
                className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                <Plus className="h-4 w-4" />
                Thêm Chất Dị Ứng (BM01-CGDU)
              </Button>
            </div>
          </div>

          {filteredAllergens.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="Chưa có danh mục chất gây dị ứng nào"
              description="Theo quy trình kiểm soát chất gây dị ứng BM01-CGDU, nhà máy cần lập danh mục nhận diện các thành phần dị nguyên và quy chuẩn ngăn ngừa lây nhiễm chéo."
              actionLabel="+ Thêm Chất Gây Dị Ứng Mới"
              onAction={handleOpenCreateAllergen}
              onGuide={() => setShowGuide(true)}
            />
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    Danh Mục Nhận Diện & Kiểm Soát Chất Gây Dị Ứng (BM01-CGDU)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hồ sơ Thư mục 07 An Giang — Kiểm soát dị nguyên trong nguyên liệu, bao bì và quy
                    trình vệ sinh ngăn ngừa lây nhiễm chéo.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-700">
                    Tổng số dị nguyên: {allergens.length}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 font-semibold text-blue-700">
                    Có trong thành phẩm: {allergens.filter((a) => a.is_contained_in_product).length}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[11px] font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Mã & Nguyên Liệu</th>
                      <th className="py-2.5 px-3">Nhóm Chất Gây Dị Ứng</th>
                      <th className="py-2.5 px-3 text-center">Có Trong SP</th>
                      <th className="py-2.5 px-3">Công Đoạn Nguy Cơ Lây Nhiễm Chéo</th>
                      <th className="py-2.5 px-3">Biện Pháp Kiểm Soát & Vệ Sinh</th>
                      <th className="py-2.5 px-3">Người Phụ Trách</th>
                      <th className="py-2.5 px-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAllergens.map((alg) => (
                      <tr key={alg.allergen_id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          <div className="font-mono text-primary font-bold">
                            {alg.allergen_code}
                          </div>
                          <div className="text-xs text-foreground font-semibold">
                            {alg.material_name}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-800">
                            {alg.allergen_types}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${alg.is_contained_in_product ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"}`}
                          >
                            {alg.is_contained_in_product ? "CÓ" : "KHÔNG"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground max-w-xs">
                          {alg.cross_contact_risk_stage || "Không có nguy cơ lây chéo"}
                        </td>
                        <td className="py-2.5 px-3 text-xs max-w-sm">{alg.preventive_measures}</td>
                        <td className="py-2.5 px-3 text-xs font-medium">
                          {alg.responsible_person}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEditAllergen(alg)}
                              title="Sửa"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => setDeletingAllergen(alg)}
                              title="Xóa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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

      {/* ==================== TAB 5: VISITOR HEALTH (BM03-KSSK) ==================== */}
      {activeTab === "visitor_health" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo mã phiếu, tên khách, đơn vị công tác, mục đích..."
                  value={visitorSearch}
                  onChange={(e) => setVisitorSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <Button
              onClick={handleOpenCreateVisitor}
              size="sm"
              className="gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <Plus className="h-4 w-4" />
              Lập Phiếu Kê Khai Mới (BM03-KSSK)
            </Button>
          </div>

          {filteredVisitors.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="Chưa có phiếu kê khai y tế khách tham quan nào"
              description="Theo quy trình kiểm soát sức khỏe BM03-KSSK, mọi khách tham quan và nhà thầu trước khi vào xưởng sản xuất phải kê khai y tế để ngăn ngừa dịch bệnh truyền nhiễm."
              actionLabel="+ Lập Phiếu Kê Khai Y Tế Mới"
              onAction={handleOpenCreateVisitor}
              onGuide={() => setShowGuide(true)}
            />
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-600" />
                    Phiếu Kê Khai Sức Khỏe Khách Vào Khu Vực Sản Xuất (BM03-KSSK)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hồ sơ Thư mục 07 An Giang — Sàng lọc 4 nhóm triệu chứng bệnh truyền nhiễm và vết
                    thương hở trước khi vào xưởng.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Đủ điều kiện:{" "}
                    {visitorDeclarations.filter((v) => v.is_approved_entry).length}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 font-semibold text-rose-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> Từ chối:{" "}
                    {visitorDeclarations.filter((v) => !v.is_approved_entry).length}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[11px] font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Mã Phiếu & Ngày Đến</th>
                      <th className="py-2.5 px-3">Khách Tham Quan & Cơ Quan</th>
                      <th className="py-2.5 px-3">Mục Đích Thăm</th>
                      <th className="py-2.5 px-3 text-center">4 Nhóm Triệu Chứng Dịch Tễ</th>
                      <th className="py-2.5 px-3 text-center">Kết Luận Xét Duyệt</th>
                      <th className="py-2.5 px-3">Người Bảo Lãnh</th>
                      <th className="py-2.5 px-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredVisitors.map((v) => {
                      const hasSymptom =
                        v.has_diarrhea ||
                        v.has_fever_cough ||
                        v.has_open_wound ||
                        v.visited_epidemic_area;
                      return (
                        <tr key={v.declaration_id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-foreground">
                            <div className="font-mono text-primary font-bold">
                              {v.declaration_code}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{v.visit_date}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-foreground">{v.visitor_name}</div>
                            <div className="text-xs text-muted-foreground">{v.company_name}</div>
                          </td>
                          <td className="py-2.5 px-3 text-xs max-w-xs text-muted-foreground truncate">
                            {v.purpose_of_visit}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {!hasSymptom ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" /> Không có triệu chứng
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-700">
                                <AlertTriangle className="h-3 w-3" /> Có nguy cơ dịch tễ
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {v.is_approved_entry ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                ĐỦ ĐIỀU KIỆN
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                                TỪ CHỐI VÀO XƯỞNG
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-xs font-medium">
                            {v.escort_person || "Ban ISO / KTV QA"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                                onClick={() => handlePrintVisitor(v)}
                                title="In phiếu BM03-KSSK"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenEditVisitor(v)}
                                title="Sửa"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => setDeletingVisitor(v)}
                                title="Xóa"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 6: FIRST AID LOG (BM01-KSSK) ==================== */}
      {activeTab === "first_aid" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo mã phiếu, tên người nhận, bộ phận, triệu chứng, tên thuốc..."
                  value={firstAidSearch}
                  onChange={(e) => setFirstAidSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <Button
              onClick={handleOpenCreateFirstAid}
              size="sm"
              className="gap-2 shrink-0 bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              <Plus className="h-4 w-4" />
              Ghi Sổ Cấp Phát Thuốc (BM01-KSSK)
            </Button>
          </div>

          {filteredFirstAid.length === 0 ? (
            <EmptyState
              icon={HeartPulse}
              title="Chưa có bản ghi cấp phát tủ thuốc sơ cứu nào"
              description="Theo quy trình kiểm soát sức khỏe BM01-KSSK, mọi trường hợp cấp phát thuốc, bông băng cồn đỏ tại tủ thuốc hiện trường cần được ghi nhật ký đầy đủ."
              actionLabel="+ Ghi Bản Ghi Cấp Phát Mới"
              onAction={handleOpenCreateFirstAid}
              onGuide={() => setShowGuide(true)}
            />
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-rose-600" />
                    Sổ Theo Dõi Cấp Phát Thuốc & Dụng Cụ Y Tế Sơ Cứu Xưởng (BM01-KSSK)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hồ sơ Thư mục 07 An Giang — Nhật ký sử dụng thuốc và vật tư tủ thuốc sơ cứu hiện
                    trường nhà xưởng.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 font-semibold text-blue-700">
                    Tổng lượt cấp phát: {firstAidLogs.length}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Tiếp tục làm việc:{" "}
                    {
                      firstAidLogs.filter(
                        (f) =>
                          f.status_after_aid.includes("làm việc") ||
                          f.status_after_aid.includes("hồi phục"),
                      ).length
                    }
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[11px] font-bold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Mã Phiếu & Ngày Cấp</th>
                      <th className="py-2.5 px-3">Người Nhận & Bộ Phận</th>
                      <th className="py-2.5 px-3">Lý Do / Triệu Chứng Tai Nạn</th>
                      <th className="py-2.5 px-3">Thuốc & Vật Tư Cấp</th>
                      <th className="py-2.5 px-3 text-center">Số Lượng</th>
                      <th className="py-2.5 px-3">Người Cấp Phát</th>
                      <th className="py-2.5 px-3">Tình Trạng Sau Sơ Cứu</th>
                      <th className="py-2.5 px-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredFirstAid.map((fa) => (
                      <tr key={fa.log_id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          <div className="font-mono text-primary font-bold">{fa.log_code}</div>
                          <div className="text-[11px] text-muted-foreground">{fa.issue_date}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-foreground">{fa.recipient_name}</div>
                          <div className="text-xs text-muted-foreground">{fa.department}</div>
                        </td>
                        <td className="py-2.5 px-3 text-xs max-w-xs text-muted-foreground">
                          {fa.reason_symptom}
                        </td>
                        <td className="py-2.5 px-3 text-xs font-semibold text-rose-800">
                          {fa.supplies_provided}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">{fa.quantity}</td>
                        <td className="py-2.5 px-3 text-xs font-medium">{fa.dispenser_name}</td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground max-w-xs truncate">
                          {fa.status_after_aid}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                              onClick={() => handlePrintFirstAid(fa)}
                              title="In phiếu BM01-KSSK"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEditFirstAid(fa)}
                              title="Sửa"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => setDeletingFirstAid(fa)}
                              title="Xóa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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

      {/* ==================== MODAL: ADD / EDIT PROGRAM ==================== */}
      <Dialog open={showProgModal} onOpenChange={setShowProgModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProg ? "Chỉnh sửa Chương trình PRP" : "Thêm mới Chương trình Tiên quyết"}
            </DialogTitle>
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
              <select
                className="w-full border rounded-md px-3 py-2 text-xs bg-background font-semibold"
                value={progForm.responsible_dept}
                onChange={(e) => setProgForm({ ...progForm, responsible_dept: e.target.value })}
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
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
                <Label className="text-xs font-bold text-primary">
                  Danh sách Hạng mục Kiểm tra:
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCheckForm({
                      ...checkForm,
                      items: [
                        ...checkForm.items,
                        { item: "Hạng mục kiểm tra mới", result: "Đạt", note: "" },
                      ],
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

          <div
            id="printable-prp"
            className="bg-white text-slate-900 p-8 rounded-lg border font-sans text-xs space-y-6"
          >
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="WCERT Logo" className="h-14 w-auto object-contain" />
                <div>
                  <h2 className="font-extrabold text-base tracking-tight text-slate-900">
                    CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT
                  </h2>
                  <p className="text-[11px] text-slate-600">
                    Ban Quản lý Chất lượng & An toàn Thực phẩm (FSMS)
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <p className="font-bold text-slate-900 text-sm">BIỂU MẪU: BM-PRP-01</p>
                <p>Tiêu chuẩn: ISO 22000:2018</p>
                <p>Ngày in: {new Date().toLocaleDateString("vi-VN")}</p>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-lg font-black text-slate-900 uppercase">
                BẢNG TỔNG HỢP KIỂM TRA TUÂN THỦ PRP / GMP / SSOP
              </h1>
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
                    <td className="border border-slate-300 p-2 text-center font-bold text-blue-700">
                      {p.program_code}
                    </td>
                    <td className="border border-slate-300 p-2 font-semibold">{p.program_name}</td>
                    <td className="border border-slate-300 p-2 text-center font-bold">{p.group}</td>
                    <td className="border border-slate-300 p-2">{p.scope || "Toàn nhà máy"}</td>
                    <td className="border border-slate-300 p-2 text-center">{p.frequency}</td>
                    <td className="border border-slate-300 p-2 text-center">
                      {p.responsible_dept}
                    </td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-emerald-700">
                      ĐẠT CHUẨN
                    </td>
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
            <Button
              onClick={() => {
                const el = document.getElementById("printable-prp");
                if (el) printHtml(el.innerHTML);
                else window.print();
              }}
              className="bg-primary text-primary-foreground"
            >
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

      {/* Modal Xác Nhận Xóa Chương Trình PRP */}
      <ConfirmDialog
        isOpen={!!deletingProg}
        onClose={() => setDeletingProg(null)}
        onConfirm={() => {
          if (deletingProg) {
            executeDeleteProg(deletingProg);
            setDeletingProg(null);
          }
        }}
        title="Xác nhận xóa chương trình tiên quyết"
        description={`Bạn có chắc chắn muốn xóa chương trình '${deletingProg?.program_code} - ${deletingProg?.program_name}' khỏi hệ thống PRP/GMP không?`}
        confirmLabel="Xóa chương trình"
        variant="destructive"
      />

      {/* Modal Xác Nhận Xóa Checklist */}
      <ConfirmDialog
        isOpen={!!deletingChecklist}
        onClose={() => setDeletingChecklist(null)}
        onConfirm={() => {
          if (deletingChecklist) {
            executeDeleteChecklist(deletingChecklist);
            setDeletingChecklist(null);
          }
        }}
        title="Xác nhận xóa bản ghi checklist"
        description={`Bạn có chắc chắn muốn xóa bản ghi checklist của chương trình [${deletingChecklist?.program_code}] ngày ${deletingChecklist?.check_date} (${deletingChecklist?.shift_name}) không?`}
        confirmLabel="Xóa bản ghi"
        variant="destructive"
      />

      {/* ==================== MODAL: ADD / EDIT PEST CONTROL (BM01-SVGH) ==================== */}
      <Dialog open={showPestModal} onOpenChange={setShowPestModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Bug className="h-5 w-5 text-emerald-600" />
              {editingPestLog
                ? "Cập Nhật Báo Cáo Kiểm Tra Bẫy Côn Trùng"
                : "Lập Báo Cáo Kiểm Tra Bẫy Chuột & Côn Trùng (BM01-SVGH)"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePestLog} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ngày kiểm tra *</Label>
                <Input
                  type="date"
                  required
                  value={pestForm.check_date}
                  onChange={(e) => setPestForm({ ...pestForm, check_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Người kiểm tra *</Label>
                <Input
                  required
                  placeholder="Họ tên KTV"
                  value={pestForm.inspector_name}
                  onChange={(e) => setPestForm({ ...pestForm, inspector_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Trạng thái báo cáo *</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background text-foreground"
                  value={pestForm.status}
                  onChange={(e) => setPestForm({ ...pestForm, status: e.target.value })}
                >
                  <option value="COMPLETED">ĐÃ HOÀN TẤT KIỂM TRA</option>
                  <option value="IN_PROGRESS">ĐANG THỰC HIỆN</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Danh sách vị trí bẫy & đèn bắt côn trùng ({pestForm.traps.length} vị trí)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() =>
                    setPestForm({
                      ...pestForm,
                      traps: [
                        ...pestForm.traps,
                        {
                          trap_number: String(pestForm.traps.length + 1).padStart(2, "0"),
                          location: "",
                          trap_type: "Bẫy chuột hộp bả",
                          status: "Tốt",
                          bait_status: "Còn mồi",
                          pests_caught: 0,
                          notes: "",
                        },
                      ],
                    })
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Thêm vị trí bẫy
                </Button>
              </div>

              <div className="border rounded-lg overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-muted/50 sticky top-0 border-b">
                    <tr>
                      <th className="p-2 text-center w-12">Số</th>
                      <th className="p-2 text-left">Vị trí đặt bẫy</th>
                      <th className="p-2 text-left w-36">Loại bẫy / Thiết bị</th>
                      <th className="p-2 text-left w-24">Tình trạng</th>
                      <th className="p-2 text-left w-24">Mồi / Keo</th>
                      <th className="p-2 text-center w-20">Bắt được</th>
                      <th className="p-2 text-center w-10">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pestForm.traps.map((trap, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-1 text-center font-bold">{trap.trap_number}</td>
                        <td className="p-1">
                          <Input
                            className="h-7 text-xs"
                            value={trap.location}
                            onChange={(e) => {
                              const next = [...pestForm.traps];
                              next[idx].location = e.target.value;
                              setPestForm({ ...pestForm, traps: next });
                            }}
                            placeholder="Vị trí đặt bẫy"
                          />
                        </td>
                        <td className="p-1">
                          <select
                            className="w-full h-7 border rounded px-1 text-xs bg-background"
                            value={trap.trap_type}
                            onChange={(e) => {
                              const next = [...pestForm.traps];
                              next[idx].trap_type = e.target.value;
                              setPestForm({ ...pestForm, traps: next });
                            }}
                          >
                            <option value="Bẫy chuột hộp bả">Bẫy chuột hộp bả</option>
                            <option value="Bẫy keo chuột">Bẫy keo chuột</option>
                            <option value="Bẫy lồng chuột">Bẫy lồng chuột</option>
                            <option value="Đèn bắt côn trùng keo">Đèn bắt côn trùng keo</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <select
                            className="w-full h-7 border rounded px-1 text-xs bg-background"
                            value={trap.status}
                            onChange={(e) => {
                              const next = [...pestForm.traps];
                              next[idx].status = e.target.value;
                              setPestForm({ ...pestForm, traps: next });
                            }}
                          >
                            <option value="Tốt">Tốt</option>
                            <option value="Hỏng">Hỏng</option>
                            <option value="Cần thay">Cần thay</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <select
                            className="w-full h-7 border rounded px-1 text-xs bg-background"
                            value={trap.bait_status}
                            onChange={(e) => {
                              const next = [...pestForm.traps];
                              next[idx].bait_status = e.target.value;
                              setPestForm({ ...pestForm, traps: next });
                            }}
                          >
                            <option value="Còn mồi">Còn mồi</option>
                            <option value="Hết mồi">Hết mồi</option>
                            <option value="Tấm dính tốt">Tấm dính tốt</option>
                            <option value="Keo tốt">Keo tốt</option>
                            <option value="Bụi bẩn cần thay">Bụi bẩn cần thay</option>
                          </select>
                        </td>
                        <td className="p-1 text-center">
                          <Input
                            type="number"
                            min="0"
                            className="h-7 text-xs text-center font-bold"
                            value={trap.pests_caught}
                            onChange={(e) => {
                              const next = [...pestForm.traps];
                              next[idx].pests_caught = parseInt(e.target.value) || 0;
                              setPestForm({ ...pestForm, traps: next });
                            }}
                          />
                        </td>
                        <td className="p-1 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-rose-500"
                            onClick={() => {
                              const next = pestForm.traps.filter((_, i) => i !== idx);
                              setPestForm({ ...pestForm, traps: next });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Biện pháp khắc phục / Hành động phòng ngừa</Label>
              <Textarea
                rows={2}
                placeholder="Ghi nhận xử lý đối với bẫy hỏng hoặc phát hiện sinh vật gây hại..."
                value={pestForm.corrective_actions}
                onChange={(e) => setPestForm({ ...pestForm, corrective_actions: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPestModal(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Lưu Báo Cáo BM01-SVGH
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: ADD / EDIT ALLERGEN (BM01-CGDU) ==================== */}
      <Dialog open={showAllergenModal} onOpenChange={setShowAllergenModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              {editingAllergen
                ? "Cập Nhật Chất Gây Dị Ứng"
                : "Thêm Mới Chất Gây Dị Ứng (BM01-CGDU)"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAllergen} className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Tên nguyên liệu / Bán thành phẩm *</Label>
              <Input
                required
                placeholder="VD: Bột mì đa dụng cao cấp, Dầu đậu nành tinh luyện"
                value={allergenForm.material_name}
                onChange={(e) =>
                  setAllergenForm({ ...allergenForm, material_name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nhóm chất gây dị ứng *</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background text-foreground"
                  value={allergenForm.allergen_types}
                  onChange={(e) =>
                    setAllergenForm({ ...allergenForm, allergen_types: e.target.value })
                  }
                >
                  <option value="Đậu nành (Soybeans)">Đậu nành (Soybeans)</option>
                  <option value="Gluten (Lúa mì)">Gluten (Lúa mì)</option>
                  <option value="Trứng (Egg / Albumin)">Trứng (Egg / Albumin)</option>
                  <option value="Sữa (Milk / Casein / Lactose)">
                    Sữa (Milk / Casein / Lactose)
                  </option>
                  <option value="Đậu phộng (Peanuts)">Đậu phộng (Peanuts)</option>
                  <option value="Hạt cây (Tree nuts)">Hạt cây (Tree nuts)</option>
                  <option value="Hải sản / Giáp xác (Crustaceans)">
                    Hải sản / Giáp xác (Crustaceans)
                  </option>
                  <option value="Sulfite & SO2 (>10ppm)">Sulfite & SO2 (&gt;10ppm)</option>
                </select>
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-muted/30">
                  <input
                    type="checkbox"
                    checked={allergenForm.is_contained_in_product}
                    onChange={(e) =>
                      setAllergenForm({
                        ...allergenForm,
                        is_contained_in_product: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary"
                  />
                  <span className="font-semibold text-xs">Thành phần có trong SP</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Công đoạn có nguy cơ lây nhiễm chéo</Label>
              <Input
                placeholder="VD: Cân đong phối trộn nguyên liệu, Khu vực nghiền và sàng lọc"
                value={allergenForm.cross_contact_risk_stage}
                onChange={(e) =>
                  setAllergenForm({ ...allergenForm, cross_contact_risk_stage: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Biện pháp kiểm soát & Ngăn ngừa *</Label>
              <Textarea
                rows={3}
                required
                placeholder="VD: Lưu trữ kho riêng biệt có biển báo màu vàng; vệ sinh thiết bị bằng quy trình 4 bước trước khi chuyển ca..."
                value={allergenForm.preventive_measures}
                onChange={(e) =>
                  setAllergenForm({ ...allergenForm, preventive_measures: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Người phụ trách giám sát *</Label>
                <Input
                  required
                  placeholder="Họ tên KTV QA / Tổ trưởng"
                  value={allergenForm.responsible_person}
                  onChange={(e) =>
                    setAllergenForm({ ...allergenForm, responsible_person: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Trạng thái *</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background text-foreground"
                  value={allergenForm.status}
                  onChange={(e) => setAllergenForm({ ...allergenForm, status: e.target.value })}
                >
                  <option value="ACTIVE">HOẠT ĐỘNG (Đang kiểm soát)</option>
                  <option value="INACTIVE">TẠM DỪNG</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAllergenModal(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                Lưu Danh Mục Dị Nguyên
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: ADD / EDIT VISITOR DECLARATION (BM03-KSSK) ==================== */}
      <Dialog open={showVisitorModal} onOpenChange={setShowVisitorModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserCheck className="h-5 w-5 text-blue-600" />
              {editingVisitor
                ? "Cập Nhật Phiếu Kê Khai Y Tế"
                : "Phiếu Kê Khai Sức Khỏe Khách (BM03-KSSK)"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveVisitor} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ngày đến thăm *</Label>
                <Input
                  type="date"
                  required
                  value={visitorForm.visit_date}
                  onChange={(e) => setVisitorForm({ ...visitorForm, visit_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Họ và tên khách *</Label>
                <Input
                  required
                  placeholder="Họ và tên khách"
                  value={visitorForm.visitor_name}
                  onChange={(e) => setVisitorForm({ ...visitorForm, visitor_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cơ quan / Đơn vị công tác *</Label>
                <Input
                  required
                  placeholder="Công ty, tổ chức..."
                  value={visitorForm.company_name}
                  onChange={(e) => setVisitorForm({ ...visitorForm, company_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Người tiếp đón / Bảo lãnh *</Label>
                <Input
                  required
                  placeholder="Cán bộ công ty"
                  value={visitorForm.escort_person}
                  onChange={(e) =>
                    setVisitorForm({ ...visitorForm, escort_person: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Mục đích vào khu vực sản xuất *</Label>
              <Input
                required
                placeholder="VD: Kiểm tra thiết bị định kỳ, Đánh giá nhà cung ứng..."
                value={visitorForm.purpose_of_visit}
                onChange={(e) =>
                  setVisitorForm({ ...visitorForm, purpose_of_visit: e.target.value })
                }
              />
            </div>

            <div className="p-3 border rounded-lg bg-amber-500/5 space-y-2.5">
              <Label className="text-xs font-bold text-foreground">
                Sàng lọc 4 nhóm triệu chứng sức khỏe:
              </Label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visitorForm.has_diarrhea}
                  onChange={(e) =>
                    setVisitorForm({ ...visitorForm, has_diarrhea: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-rose-600"
                />
                <span className="text-xs">Đang bị tiêu chảy, đau bụng hoặc rối loạn tiêu hóa</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visitorForm.has_fever_cough}
                  onChange={(e) =>
                    setVisitorForm({ ...visitorForm, has_fever_cough: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-rose-600"
                />
                <span className="text-xs">Đang bị sốt, cảm cúm, ho hoặc viêm đường hô hấp</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visitorForm.has_open_wound}
                  onChange={(e) =>
                    setVisitorForm({ ...visitorForm, has_open_wound: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-rose-600"
                />
                <span className="text-xs">
                  Có vết thương hở, vết bỏng hoặc bệnh ngoài da chưa băng kín
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visitorForm.visited_epidemic_area}
                  onChange={(e) =>
                    setVisitorForm({ ...visitorForm, visited_epidemic_area: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-rose-600"
                />
                <span className="text-xs">
                  Trong 14 ngày qua có tiếp xúc người mắc bệnh truyền nhiễm
                </span>
              </label>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visitorForm.commitment_signed}
                  onChange={(e) =>
                    setVisitorForm({ ...visitorForm, commitment_signed: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
                <span className="text-xs font-semibold">
                  Khách đã ký cam kết tuân thủ nội quy ATTP
                </span>
              </label>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ghi chú bổ sung</Label>
              <Input
                placeholder="Ghi chú thêm về thiết bị mang vào, yêu cầu bảo hộ..."
                value={visitorForm.notes}
                onChange={(e) => setVisitorForm({ ...visitorForm, notes: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowVisitorModal(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Lưu Phiếu Kê Khai BM03-KSSK
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: ADD / EDIT FIRST AID LOG (BM01-KSSK) ==================== */}
      <Dialog open={showFirstAidModal} onOpenChange={setShowFirstAidModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <HeartPulse className="h-5 w-5 text-rose-600" />
              {editingFirstAid
                ? "Cập Nhật Bản Ghi Cấp Phát Thuốc"
                : "Ghi Sổ Cấp Phát Thuốc Sơ Cứu Xưởng (BM01-KSSK)"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveFirstAid} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ngày cấp phát *</Label>
                <Input
                  type="date"
                  required
                  value={firstAidForm.issue_date}
                  onChange={(e) => setFirstAidForm({ ...firstAidForm, issue_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Người nhận thuốc *</Label>
                <Input
                  required
                  placeholder="Họ tên công nhân"
                  value={firstAidForm.recipient_name}
                  onChange={(e) =>
                    setFirstAidForm({ ...firstAidForm, recipient_name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Bộ phận / Dây chuyền *</Label>
                <Input
                  required
                  placeholder="Tổ Sơ chế, Tổ Sấy..."
                  value={firstAidForm.department}
                  onChange={(e) => setFirstAidForm({ ...firstAidForm, department: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Người cấp phát thuốc *</Label>
                <Input
                  required
                  placeholder="Y tá / KTV phụ trách"
                  value={firstAidForm.dispenser_name}
                  onChange={(e) =>
                    setFirstAidForm({ ...firstAidForm, dispenser_name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Lý do / Triệu chứng tai nạn *</Label>
              <Input
                required
                placeholder="VD: Trầy xước ngón tay khi vệ sinh dao cắt, Choáng váng do nắng nóng..."
                value={firstAidForm.reason_symptom}
                onChange={(e) =>
                  setFirstAidForm({ ...firstAidForm, reason_symptom: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Thuốc & Vật tư y tế đã cấp *</Label>
                <Input
                  required
                  placeholder="Băng dán Urgo, cồn đỏ Povidine, Oresol..."
                  value={firstAidForm.supplies_provided}
                  onChange={(e) =>
                    setFirstAidForm({ ...firstAidForm, supplies_provided: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Số lượng *</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={firstAidForm.quantity}
                  onChange={(e) =>
                    setFirstAidForm({ ...firstAidForm, quantity: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tình trạng sau sơ cứu *</Label>
              <Input
                required
                placeholder="Vết thương đã cầm máu, băng kín chống thấm, tiếp tục làm việc bình thường..."
                value={firstAidForm.status_after_aid}
                onChange={(e) =>
                  setFirstAidForm({ ...firstAidForm, status_after_aid: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ghi chú bổ sung</Label>
              <Input
                placeholder="Ghi chú thêm nếu cần theo dõi..."
                value={firstAidForm.notes}
                onChange={(e) => setFirstAidForm({ ...firstAidForm, notes: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFirstAidModal(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                Lưu Sổ Cấp Thuốc BM01-KSSK
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Xác Nhận Xóa Báo Cáo Bẫy Côn Trùng */}
      <ConfirmDialog
        isOpen={!!deletingPestLog}
        onClose={() => setDeletingPestLog(null)}
        onConfirm={() => {
          if (deletingPestLog) {
            executeDeletePestLog(deletingPestLog);
            setDeletingPestLog(null);
          }
        }}
        title="Xác nhận xóa báo cáo kiểm tra bẫy côn trùng"
        description={`Bạn có chắc chắn muốn xóa phiếu kiểm tra [${deletingPestLog?.log_code}] ngày ${deletingPestLog?.check_date} không?`}
        confirmLabel="Xóa báo cáo"
        variant="destructive"
      />

      {/* Modal Xác Nhận Xóa Dị Nguyên */}
      <ConfirmDialog
        isOpen={!!deletingAllergen}
        onClose={() => setDeletingAllergen(null)}
        onConfirm={() => {
          if (deletingAllergen) {
            executeDeleteAllergen(deletingAllergen);
            setDeletingAllergen(null);
          }
        }}
        title="Xác nhận xóa chất gây dị ứng"
        description={`Bạn có chắc chắn muốn xóa chất gây dị ứng [${deletingAllergen?.allergen_code} - ${deletingAllergen?.material_name}] khỏi danh mục không?`}
        confirmLabel="Xóa dị nguyên"
        variant="destructive"
      />

      {/* Modal Xác Nhận Xóa Khai Báo Y Tế */}
      <ConfirmDialog
        isOpen={!!deletingVisitor}
        onClose={() => setDeletingVisitor(null)}
        onConfirm={() => {
          if (deletingVisitor) {
            executeDeleteVisitor(deletingVisitor);
            setDeletingVisitor(null);
          }
        }}
        title="Xác nhận xóa phiếu kê khai y tế"
        description={`Bạn có chắc chắn muốn xóa phiếu kê khai [${deletingVisitor?.declaration_code}] của khách ${deletingVisitor?.visitor_name} không?`}
        confirmLabel="Xóa phiếu"
        variant="destructive"
      />

      {/* Modal Xác Nhận Xóa Bản Ghi Cấp Thuốc */}
      <ConfirmDialog
        isOpen={!!deletingFirstAid}
        onClose={() => setDeletingFirstAid(null)}
        onConfirm={() => {
          if (deletingFirstAid) {
            executeDeleteFirstAid(deletingFirstAid);
            setDeletingFirstAid(null);
          }
        }}
        title="Xác nhận xóa bản ghi cấp phát thuốc"
        description={`Bạn có chắc chắn muốn xóa bản ghi cấp phát [${deletingFirstAid?.log_code}] cho ${deletingFirstAid?.recipient_name} không?`}
        confirmLabel="Xóa bản ghi"
        variant="destructive"
      />

      {/* Module Guide Modal */}
      <ModuleGuideModal module="prp" isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}
