import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";
import { useModuleAccess } from "@/lib/rbac";
import { printHtml } from "@/lib/print";
import {
  Siren,
  Phone,
  PhoneCall,
  ShieldAlert,
  Flame,
  AlertTriangle,
  FileCheck2,
  Printer,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  UserCheck,
  Zap,
  Droplets,
  Wind,
  Biohazard,
  Activity,
  HeartPulse,
  RefreshCw,
  Eye,
  X,
  Calendar,
  BookOpen,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ModuleGuideModal } from "@/components/ModuleGuideModal";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Ứng phó khẩn cấp – WCERT FSMS" },
      { name: "description", content: "Chuẩn bị và ứng phó tình huống khẩn cấp, sự cố an toàn thực phẩm." },
    ],
  }),
  component: () => (
    <AppShell module="emergency">
      <EmergencyPage />
    </AppShell>
  ),
});

interface EmergencyContactItem {
  id?: string | number;
  contact_id?: string;
  contact_type: "INTERNAL" | "EXTERNAL";
  name: string;
  role_title?: string;
  organization_or_role?: string;
  department?: string;
  phone?: string;
  phone_primary?: string;
  phone_secondary?: string;
  phone_alt?: string;
  email?: string;
  location?: string;
  address?: string;
  priority_level?: number;
  priority_order?: number;
  is_active?: boolean;
  notes?: string;
}

interface EmergencyProcedureItem {
  id?: string | number;
  procedure_id?: string;
  code?: string;
  procedure_code?: string;
  title: string;
  scenario_type: string;
  description?: string;
  likelihood: number;
  severity: number;
  risk_score: number;
  risk_level?: string;
  immediate_actions?: any[];
  food_safety_controls?: string;
  responsible_role?: string;
  responsible_team?: string;
  assembly_point?: string;
  equipment_needed?: string;
  status: string;
  revision?: number;
  version?: string;
  review_date?: string;
}

interface EmergencyDrillItem {
  id?: string | number;
  drill_id?: string;
  drill_code: string;
  drill_type?: "DRILL" | "ACTUAL_INCIDENT" | string;
  record_type?: string;
  title: string;
  scenario_type: string;
  drill_date: string;
  location: string;
  participants_count: number;
  lead_evaluator?: string;
  drill_leader?: string;
  duration_minutes: number;
  response_time_minutes?: number;
  scenario_description?: string;
  evaluation_result: "PASS" | "NEEDS_IMPROVEMENT" | "FAIL" | "SATISFACTORY" | "EXCELLENT" | string;
  findings?: string;
  corrective_actions?: string;
  corrective_actions_needed?: string;
  capa_id?: number;
  status?: string;
  notes?: string;
}

const SCENARIO_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  FIRE_EXPLOSION: { label: "Cháy, nổ xưởng & kho", icon: Flame, color: "text-rose-600 bg-rose-50 border-rose-200" },
  CHEMICAL_SPILL: { label: "Tràn đổ hóa chất & rò rỉ khí gas", icon: Droplets, color: "text-amber-600 bg-amber-50 border-amber-200" },
  WATER_OUTAGE: { label: "Mất nước & nhiễm bẩn nguồn nước", icon: Droplets, color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  POWER_OUTAGE: { label: "Mất điện lưới đột ngột", icon: Zap, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  CHILLER_BREAKDOWN: { label: "Hỏng máy lạnh & tủ cấp đông", icon: Wind, color: "text-blue-600 bg-blue-50 border-blue-200" },
  STEAM_OUTAGE: { label: "Gián đoạn nguồn hơi cấp lò hơi", icon: Activity, color: "text-orange-600 bg-orange-50 border-orange-200" },
  BIOTERRORISM_SABOTAGE: { label: "Phá hoại an ninh thực phẩm - Food Defense", icon: Biohazard, color: "text-purple-600 bg-purple-50 border-purple-200" },
  WORK_ACCIDENT: { label: "Tai nạn lao động ca sản xuất", icon: HeartPulse, color: "text-red-600 bg-red-50 border-red-200" },
  NATURAL_DISASTER_EPIDEMIC: { label: "Thiên tai bão lũ & dịch bệnh", icon: AlertTriangle, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

function getRiskBadge(score: number) {
  if (score >= 15) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">Rất cao ({score})</span>;
  }
  if (score >= 8) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">Trung bình ({score})</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">Thấp ({score})</span>;
}

function EmergencyPage() {
  const { canEdit } = useModuleAccess();
  const [activeTab, setActiveTab] = useState<"contacts" | "procedures" | "drills">("contacts");
  const [loading, setLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState<any>({
    total_contacts: 0,
    internal_contacts: 0,
    external_contacts: 0,
    total_procedures: 0,
    high_risk_scenarios: 0,
    total_drills_this_year: 0,
    last_drill_date: null,
  });

  // Data collections
  const [contacts, setContacts] = useState<EmergencyContactItem[]>([]);
  const [procedures, setProcedures] = useState<EmergencyProcedureItem[]>([]);
  const [drills, setDrills] = useState<EmergencyDrillItem[]>([]);

  // Search & Filters
  const [contactFilter, setContactFilter] = useState<"ALL" | "INTERNAL" | "EXTERNAL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [drillTypeFilter, setDrillTypeFilter] = useState<"ALL" | "DRILL" | "ACTUAL_INCIDENT">("ALL");

  // Modals state
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContactItem | null>(null);
  const [contactForm, setContactForm] = useState<any>({
    contact_type: "INTERNAL",
    name: "",
    role_title: "",
    department: "",
    phone_primary: "",
    phone_secondary: "",
    email: "",
    location: "",
    priority_level: 1,
    notes: "",
  });

  const [procedureModalOpen, setProcedureModalOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<EmergencyProcedureItem | null>(null);
  const [procForm, setProcForm] = useState<any>({
    code: "",
    title: "",
    scenario_type: "FIRE_EXPLOSION",
    description: "",
    likelihood: 2,
    severity: 4,
    immediate_actions_text: "",
    food_safety_controls: "",
    responsible_role: "",
    assembly_point: "",
    equipment_needed: "",
    status: "ACTIVE",
  });

  const [drillModalOpen, setDrillModalOpen] = useState(false);
  const [editingDrill, setEditingDrill] = useState<EmergencyDrillItem | null>(null);
  const [drillForm, setDrillForm] = useState<any>({
    drill_code: "",
    drill_type: "DRILL",
    title: "",
    scenario_type: "FIRE_EXPLOSION",
    drill_date: new Date().toISOString().split("T")[0],
    location: "Xưởng chế biến chính",
    participants_count: 20,
    lead_evaluator: "",
    duration_minutes: 30,
    response_time_minutes: 5,
    scenario_description: "",
    evaluation_result: "PASS",
    findings: "",
    corrective_actions: "",
  });

  const [viewDetailModal, setViewDetailModal] = useState<any>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Fetch all initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, contactsRes, proceduresRes, drillsRes] = await Promise.all([
        api.get("/emergency/stats"),
        api.get("/emergency/contacts"),
        api.get("/emergency/procedures"),
        api.get("/emergency/drills"),
      ]);
      setStats(statsRes.data || {});
      
      const normContacts: EmergencyContactItem[] = (contactsRes.data || []).map((c: any) => ({
        ...c,
        id: c.contact_id || c.id,
        contact_id: c.contact_id || c.id,
        role_title: c.organization_or_role || c.role_title || "",
        organization_or_role: c.organization_or_role || c.role_title || "",
        phone_primary: c.phone || c.phone_primary || "",
        phone: c.phone || c.phone_primary || "",
        phone_secondary: c.phone_alt || c.phone_secondary || "",
        phone_alt: c.phone_alt || c.phone_secondary || "",
        location: c.address || c.location || "",
        address: c.address || c.location || "",
        priority_level: c.priority_order ?? c.priority_level ?? 1,
        priority_order: c.priority_order ?? c.priority_level ?? 1,
      }));
      setContacts(normContacts);

      const normProcedures: EmergencyProcedureItem[] = (proceduresRes.data || []).map((p: any) => ({
        ...p,
        id: p.procedure_id || p.id,
        procedure_id: p.procedure_id || p.id,
        code: p.procedure_code || p.code || "",
        procedure_code: p.procedure_code || p.code || "",
        responsible_role: p.responsible_team || p.responsible_role || "",
        responsible_team: p.responsible_team || p.responsible_role || "",
      }));
      setProcedures(normProcedures);

      const normDrills: EmergencyDrillItem[] = (drillsRes.data || []).map((d: any) => ({
        ...d,
        id: d.drill_id || d.id,
        drill_id: d.drill_id || d.id,
        drill_type: d.record_type === "PLANNED_DRILL" ? "DRILL" : (d.record_type || d.drill_type || "DRILL"),
        lead_evaluator: d.drill_leader || d.lead_evaluator || "",
        drill_leader: d.drill_leader || d.lead_evaluator || "",
        corrective_actions: d.corrective_actions_needed || d.corrective_actions || "",
        corrective_actions_needed: d.corrective_actions_needed || d.corrective_actions || "",
        duration_minutes: d.duration_minutes || 30,
      }));
      setDrills(normDrills);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải dữ liệu module Ứng phó khẩn cấp");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesType = contactFilter === "ALL" || c.contact_type === contactFilter;
      const q = searchQuery.toLowerCase();
      const name = (c.name || "").toLowerCase();
      const role = (c.organization_or_role || c.role_title || "").toLowerCase();
      const dept = (c.department || "").toLowerCase();
      const phone = (c.phone || c.phone_primary || "").toLowerCase();
      const matchesQuery =
        !searchQuery ||
        name.includes(q) ||
        role.includes(q) ||
        dept.includes(q) ||
        phone.includes(q);
      return matchesType && matchesQuery;
    });
  }, [contacts, contactFilter, searchQuery]);

  // Filter procedures
  const filteredProcedures = useMemo(() => {
    return procedures.filter((p) => {
      const q = searchQuery.toLowerCase();
      const code = (p.procedure_code || p.code || "").toLowerCase();
      const title = (p.title || "").toLowerCase();
      const scenario = (p.scenario_type || "").toLowerCase();
      return !searchQuery || code.includes(q) || title.includes(q) || scenario.includes(q);
    });
  }, [procedures, searchQuery]);

  // Filter drills
  const filteredDrills = useMemo(() => {
    return drills.filter((d) => {
      const currentType = d.record_type === "PLANNED_DRILL" ? "DRILL" : (d.record_type || d.drill_type || "DRILL");
      const matchesType = drillTypeFilter === "ALL" || currentType === drillTypeFilter;
      const q = searchQuery.toLowerCase();
      const code = (d.drill_code || "").toLowerCase();
      const title = (d.title || "").toLowerCase();
      const leader = (d.drill_leader || d.lead_evaluator || "").toLowerCase();
      return matchesType && (!searchQuery || code.includes(q) || title.includes(q) || leader.includes(q));
    });
  }, [drills, drillTypeFilter, searchQuery]);

  // CONTACT HANDLERS
  const openNewContact = () => {
    setEditingContact(null);
    setContactForm({
      contact_type: "INTERNAL",
      name: "",
      role_title: "",
      department: "",
      phone_primary: "",
      phone_secondary: "",
      email: "",
      location: "",
      priority_level: 1,
      notes: "",
    });
    setContactModalOpen(true);
  };

  const openEditContact = (c: EmergencyContactItem) => {
    setEditingContact(c);
    setContactForm({
      contact_type: c.contact_type,
      name: c.name,
      role_title: c.organization_or_role || c.role_title || "",
      department: c.department || "",
      phone_primary: c.phone || c.phone_primary || "",
      phone_secondary: c.phone_alt || c.phone_secondary || "",
      email: c.email || "",
      location: c.address || c.location || "",
      priority_level: c.priority_order ?? c.priority_level ?? 1,
      notes: c.notes || "",
    });
    setContactModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: contactForm.name,
        organization_or_role: contactForm.role_title,
        phone: contactForm.phone_primary,
        phone_alt: contactForm.phone_secondary || null,
        email: contactForm.email || null,
        contact_type: contactForm.contact_type,
        priority_order: Number(contactForm.priority_level),
        address: contactForm.location || null,
        notes: contactForm.notes || null,
        is_active: true,
      };

      const cId = editingContact?.contact_id || editingContact?.id;
      if (editingContact && cId) {
        await api.put(`/emergency/contacts/${cId}`, payload);
        toast.success("Đã cập nhật thông tin liên hệ khẩn cấp");
      } else {
        await api.post("/emergency/contacts", payload);
        toast.success("Đã thêm mới đầu mối liên lạc khẩn cấp");
      }
      setContactModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu đầu mối liên lạc");
    }
  };

  const handleDeleteContact = async (id: any) => {
    if (!confirm("Bạn có chắc chắn muốn xóa đầu mối liên hệ này?")) return;
    try {
      await api.delete(`/emergency/contacts/${id}`);
      toast.success("Đã xóa đầu mối liên lạc");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa");
    }
  };

  // PROCEDURE HANDLERS
  const openNewProcedure = () => {
    setEditingProcedure(null);
    setProcForm({
      code: `SOP-EP-${String(procedures.length + 1).padStart(2, "0")}`,
      title: "",
      scenario_type: "FIRE_EXPLOSION",
      description: "",
      likelihood: 2,
      severity: 4,
      immediate_actions_text: "1. Báo động khẩn cấp\n2. Cắt nguồn năng lượng\n3. Sơ tán nhân sự\n4. Cô lập khu vực",
      food_safety_controls: "Cách ly và niêm phong toàn bộ mẻ sản phẩm đang chế biến.",
      responsible_role: "Đội trưởng PCCC & An toàn ATTP",
      assembly_point: "Sân vận động trước cổng chính",
      equipment_needed: "Bình chữa cháy CO2/Bột, vòi cứu hỏa",
      status: "ACTIVE",
    });
    setProcedureModalOpen(true);
  };

  const openEditProcedure = (p: EmergencyProcedureItem) => {
    setEditingProcedure(p);
    const actionsText = (p.immediate_actions || [])
      .map((act: any, idx: number) => {
        if (typeof act === "string") return act;
        const stepNum = act.step || idx + 1;
        return `${stepNum}. ${act.action || ""}${act.responsible ? ` [${act.responsible}]` : ""}${act.deadline_minutes ? ` (${act.deadline_minutes} phút)` : ""}`;
      })
      .join("\n");

    setProcForm({
      code: p.procedure_code || p.code || "",
      title: p.title,
      scenario_type: p.scenario_type,
      description: p.description || "",
      likelihood: p.likelihood,
      severity: p.severity,
      immediate_actions_text: actionsText,
      food_safety_controls: p.food_safety_controls || "",
      responsible_role: p.responsible_team || p.responsible_role || "",
      assembly_point: p.assembly_point || "",
      equipment_needed: p.equipment_needed || "",
      status: p.status,
    });
    setProcedureModalOpen(true);
  };

  const handleSaveProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const actions = procForm.immediate_actions_text
        ? procForm.immediate_actions_text
            .split("\n")
            .map((s: string) => s.trim())
            .filter(Boolean)
            .map((s: string, idx: number) => ({
              step: idx + 1,
              action: s.replace(/^\d+[\.\)\-]\s*/, ""),
              responsible: procForm.responsible_role || "Đội ứng phó khẩn cấp",
              deadline_minutes: 5,
            }))
        : [];

      const payload = {
        procedure_code: procForm.code,
        title: procForm.title,
        scenario_type: procForm.scenario_type,
        description: procForm.description,
        likelihood: Number(procForm.likelihood),
        severity: Number(procForm.severity),
        risk_score: Number(procForm.likelihood) * Number(procForm.severity),
        immediate_actions: actions,
        responsible_team: procForm.responsible_role || "Đội ứng phó khẩn cấp",
        equipment_needed: procForm.equipment_needed || null,
        status: procForm.status || "ACTIVE",
      };

      const pId = editingProcedure?.procedure_id || editingProcedure?.id;
      if (editingProcedure && pId) {
        await api.put(`/emergency/procedures/${pId}`, payload);
        toast.success("Đã cập nhật quy trình ứng phó");
      } else {
        await api.post("/emergency/procedures", payload);
        toast.success("Đã thêm quy trình ứng phó mới");
      }
      setProcedureModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu quy trình ứng phó");
    }
  };

  const handleDeleteProcedure = async (id: any) => {
    if (!confirm("Bạn có chắc chắn muốn xóa quy trình ứng phó này?")) return;
    try {
      await api.delete(`/emergency/procedures/${id}`);
      toast.success("Đã xóa quy trình ứng phó");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa");
    }
  };

  // DRILL HANDLERS
  const openNewDrill = () => {
    setEditingDrill(null);
    const code = `BM-EMRG-${new Date().getFullYear()}-${String(drills.length + 1).padStart(3, "0")}`;
    setDrillForm({
      drill_code: code,
      drill_type: "DRILL",
      title: "",
      scenario_type: "FIRE_EXPLOSION",
      drill_date: new Date().toISOString().split("T")[0],
      location: "Phân xưởng chế biến chính",
      participants_count: 25,
      lead_evaluator: "Trần Văn An - Đội Trưởng HACCP",
      duration_minutes: 30,
      response_time_minutes: 4,
      scenario_description: "Diễn tập tình huống giả định theo định kỳ",
      evaluation_result: "PASS",
      findings: "Nhân viên phản ứng đúng quy trình, sơ tán trật tự trong 4 phút.",
      corrective_actions: "Bảo dưỡng bổ sung 2 chuông báo động khu vực đóng gói.",
    });
    setDrillModalOpen(true);
  };

  const openEditDrill = (d: EmergencyDrillItem) => {
    setEditingDrill(d);
    setDrillForm({
      drill_code: d.drill_code,
      drill_type: d.record_type === "PLANNED_DRILL" ? "DRILL" : (d.record_type || d.drill_type || "DRILL"),
      title: d.title,
      scenario_type: d.scenario_type,
      drill_date: d.drill_date,
      location: d.location,
      participants_count: d.participants_count,
      lead_evaluator: d.drill_leader || d.lead_evaluator || "",
      duration_minutes: d.duration_minutes,
      response_time_minutes: d.response_time_minutes || 0,
      scenario_description: d.scenario_description || "",
      evaluation_result: d.evaluation_result === "EXCELLENT" || d.evaluation_result === "SATISFACTORY" ? "PASS" : d.evaluation_result,
      findings: d.findings || d.notes || "",
      corrective_actions: d.corrective_actions_needed || d.corrective_actions || "",
    });
    setDrillModalOpen(true);
  };

  const handleSaveDrill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const evalResultMap: Record<string, string> = {
        PASS: "SATISFACTORY",
        EXCELLENT: "EXCELLENT",
        SATISFACTORY: "SATISFACTORY",
        NEEDS_IMPROVEMENT: "NEEDS_IMPROVEMENT",
        FAIL: "NEEDS_IMPROVEMENT",
      };

      const payload = {
        drill_code: drillForm.drill_code,
        title: drillForm.title,
        record_type: drillForm.drill_type === "ACTUAL_INCIDENT" ? "ACTUAL_INCIDENT" : "PLANNED_DRILL",
        scenario_type: drillForm.scenario_type,
        drill_date: drillForm.drill_date,
        location: drillForm.location,
        participants_count: Number(drillForm.participants_count),
        drill_leader: drillForm.lead_evaluator,
        response_time_minutes: drillForm.response_time_minutes ? Number(drillForm.response_time_minutes) : null,
        scenario_description: drillForm.scenario_description || null,
        evaluation_result: evalResultMap[drillForm.evaluation_result] || "SATISFACTORY",
        corrective_actions_needed: drillForm.corrective_actions || null,
        notes: drillForm.findings || null,
      };

      const dId = editingDrill?.drill_id || editingDrill?.id;
      if (editingDrill && dId) {
        await api.put(`/emergency/drills/${dId}`, payload);
        toast.success("Đã cập nhật biên bản diễn tập/sự cố");
      } else {
        await api.post("/emergency/drills", payload);
        toast.success("Đã ghi nhận biên bản diễn tập/sự cố thành công");
      }
      setDrillModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lưu biên bản");
    }
  };

  const handleDeleteDrill = async (id: any) => {
    if (!confirm("Bạn có chắc chắn muốn xóa biên bản này?")) return;
    try {
      await api.delete(`/emergency/drills/${id}`);
      toast.success("Đã xóa biên bản diễn tập/sự cố");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa");
    }
  };

  // PRINT BM-EMERGENCY-01
  const handlePrintDrill = (d: EmergencyDrillItem) => {
    const scenario = SCENARIO_LABELS[d.scenario_type]?.label || d.scenario_type;
    const typeLabel = d.drill_type === "DRILL" ? "DIỄN TẬP ĐỊNH KỲ" : "XỬ LÝ SỰ CỐ THỰC TẾ";
    const resultLabel =
      d.evaluation_result === "PASS"
        ? "ĐẠT YÊU CẦU"
        : d.evaluation_result === "NEEDS_IMPROVEMENT"
        ? "CẦN CẢI TIẾN THÊM"
        : "KHÔNG ĐẠT (CẦN DIỄN TẬP LẠI)";

    const html = `
      <div style="font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.5; color: #111; max-width: 800px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #333; padding: 8px;">
              <strong style="font-size: 14pt; color: #047857;">WCERT FOOD</strong><br/>
              <span style="font-size: 9pt;">HỆ THỐNG FSMS ISO 22000</span>
            </td>
            <td style="width: 50%; text-align: center; border: 1px solid #333; padding: 8px;">
              <strong style="font-size: 13pt; text-transform: uppercase;">BIÊN BẢN ĐÁNH GIÁ ỨNG PHÓ KHẨN CẤP</strong><br/>
              <span style="font-size: 10pt; font-weight: bold;">(Theo Điều khoản 8.4 ISO 22000:2018)</span>
            </td>
            <td style="width: 25%; border: 1px solid #333; padding: 8px; font-size: 10pt;">
              Mã biểu mẫu: <strong>BM-EMERGENCY-01</strong><br/>
              Lần ban hành: <strong>02</strong><br/>
              Ngày hiệu lực: <strong>01/01/2026</strong>
            </td>
          </tr>
        </table>

        <!-- Info Header -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 16pt; text-transform: uppercase; letter-spacing: 0.5px;">
            BIÊN BẢN ${typeLabel}
          </h2>
          <div style="font-style: italic; margin-top: 4px;">Mã số hồ sơ: <strong>${d.drill_code}</strong></div>
        </div>

        <!-- Section 1: Thông tin cơ bản -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr>
            <td style="padding: 6px 0; width: 50%;"><strong>1. Tên đợt tác nghiệp:</strong> ${d.title}</td>
            <td style="padding: 6px 0; width: 50%;"><strong>2. Ngày thực hiện:</strong> ${d.drill_date}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;"><strong>3. Nhóm tình huống khẩn cấp:</strong> ${scenario}</td>
            <td style="padding: 6px 0;"><strong>4. Địa điểm thực hiện:</strong> ${d.location}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;"><strong>5. Số lượng người tham gia:</strong> ${d.participants_count} người</td>
            <td style="padding: 6px 0;"><strong>6. Người chỉ huy / Trưởng đoàn ĐG:</strong> ${d.lead_evaluator}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;"><strong>7. Tổng thời gian diễn tập:</strong> ${d.duration_minutes} phút</td>
            <td style="padding: 6px 0;"><strong>8. Thời gian phản ứng tức thì:</strong> ${d.response_time_minutes || "--"} phút</td>
          </tr>
        </table>

        <!-- Section 2: Kịch bản giả định / Diễn biến sự cố -->
        <div style="margin-bottom: 14px;">
          <strong>9. Mô tả kịch bản giả định / Diễn biến tình huống:</strong>
          <div style="border: 1px solid #777; padding: 8px 12px; margin-top: 4px; min-height: 50px; background-color: #fdfdfd; font-size: 12pt;">
            ${d.scenario_description || "Không có ghi chú thêm."}
          </div>
        </div>

        <!-- Section 3: Đánh giá & Phát hiện -->
        <div style="margin-bottom: 14px;">
          <strong>10. Nhận xét & Phát hiện thực tế (Findings):</strong>
          <div style="border: 1px solid #777; padding: 8px 12px; margin-top: 4px; min-height: 60px; background-color: #fdfdfd; font-size: 12pt;">
            ${d.findings || "Thực hiện đạt yêu cầu, không phát hiện vi phạm quy chuẩn ATTP."}
          </div>
        </div>

        <!-- Section 4: Hành động khắc phục / Khuyến nghị cải tiến -->
        <div style="margin-bottom: 16px;">
          <strong>11. Hành động khắc phục / Đề xuất hoàn thiện quy trình (CAPA):</strong>
          <div style="border: 1px solid #777; padding: 8px 12px; margin-top: 4px; min-height: 50px; background-color: #fdfdfd; font-size: 12pt;">
            ${d.corrective_actions || "Duy trì định kỳ kiểm tra thiết bị và tổ chức diễn tập 6 tháng/lần."}
          </div>
        </div>

        <!-- Section 5: Kết luận -->
        <div style="margin-bottom: 24px; padding: 10px; border: 1px solid #047857; background-color: #f0fdf4;">
          <strong>12. KẾT LUẬN CHUNG:</strong> <span style="font-size: 14pt; font-weight: bold; color: #047857;">${resultLabel}</span>
          <br/>
          <span style="font-size: 10.5pt; font-style: italic;">(Căn cứ theo Điều khoản 8.4.c ISO 22000:2018 - Định kỳ thử nghiệm và rà soát hiệu lực quy trình ứng phó khẩn cấp)</span>
        </div>

        <!-- Signature Footer -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 30px; text-align: center;">
          <tr>
            <td style="width: 33%; vertical-align: top;">
              <strong>NGƯỜI LẬP BIÊN BẢN</strong><br/>
              <span style="font-size: 10pt; font-style: italic;">(Ký & ghi rõ họ tên)</span>
              <div style="height: 65px;"></div>
              <strong>${d.lead_evaluator}</strong>
            </td>
            <td style="width: 33%; vertical-align: top;">
              <strong>ĐỘI TRƯỞNG PCCC & ATTP</strong><br/>
              <span style="font-size: 10pt; font-style: italic;">(Ký & ghi rõ họ tên)</span>
              <div style="height: 65px;"></div>
              <strong>Ban QLCL & ATTP</strong>
            </td>
            <td style="width: 34%; vertical-align: top;">
              <strong>BAN GIÁM ĐỐC PHÊ DUYỆT</strong><br/>
              <span style="font-size: 10pt; font-style: italic;">(Ký, đóng dấu)</span>
              <div style="height: 65px;"></div>
              <strong>Giám Đốc Nhà Máy</strong>
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
        title="Ứng phó tình huống khẩn cấp & Sự cố"
        description="Hệ thống chuẩn bị kịch bản 7+2 nhóm rủi ro, phân công đầu mối liên lạc tức thì và kiểm soát diễn tập định kỳ theo ISO 22000:2018."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuide(true)}
              className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
            >
              <BookOpen className="h-4 w-4" /> Hướng dẫn nghiệp vụ
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            {canEdit && (
              <>
                {activeTab === "contacts" && (
                  <Button size="sm" onClick={openNewContact} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4" /> Thêm đầu mối liên hệ
                  </Button>
                )}
                {activeTab === "procedures" && (
                  <Button size="sm" onClick={openNewProcedure} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4" /> Soạn kịch bản ứng phó
                  </Button>
                )}
                {activeTab === "drills" && (
                  <Button size="sm" onClick={openNewDrill} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4" /> Ghi nhận diễn tập / sự cố
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Đầu mối khẩn cấp</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <PhoneCall className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{stats.total_contacts}</span>
            <span className="text-xs text-slate-500">
              ({stats.internal_contacts} nội bộ / {stats.external_contacts} ngoại viện)
            </span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" /> Hotline trực cấp cứu 24/7
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Kịch bản đã thiết lập</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{stats.total_procedures}</span>
            <span className="text-xs text-slate-500">quy trình SOP</span>
          </div>
          <div className="mt-2 text-xs text-blue-600 flex items-center gap-1 font-medium">
            <Activity className="h-3.5 w-3.5" /> 7 nhóm sự cố + 2 nhóm an ninh
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Kịch bản rủi ro cao</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-700">{stats.high_risk_scenarios}</span>
            <span className="text-xs text-rose-500">(Điểm L x S ≥ 15)</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 font-medium">
            <Clock className="h-3.5 w-3.5" /> Yêu cầu diễn tập 6 tháng/lần
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Diễn tập trong năm</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{stats.total_drills_this_year}</span>
            <span className="text-xs text-slate-500">lần thực hiện</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" /> Gần nhất: {stats.last_drill_date || "Chưa có"}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("contacts")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "contacts"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Phone className="h-4 w-4" /> Danh bạ liên lạc khẩn cấp ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab("procedures")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "procedures"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <ShieldAlert className="h-4 w-4" /> Kịch bản & Quy trình ứng phó ({procedures.length})
          </button>
          <button
            onClick={() => setActiveTab("drills")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "drills"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <FileCheck2 className="h-4 w-4" /> Nhật ký diễn tập & Sự cố ({drills.length})
          </button>
        </nav>
      </div>

      {/* TAB 1: CONTACTS */}
      {activeTab === "contacts" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Tìm tên, chức danh, SĐT, đơn vị..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Button
                variant={contactFilter === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setContactFilter("ALL")}
                className={contactFilter === "ALL" ? "bg-emerald-600" : ""}
              >
                Tất cả ({contacts.length})
              </Button>
              <Button
                variant={contactFilter === "INTERNAL" ? "default" : "outline"}
                size="sm"
                onClick={() => setContactFilter("INTERNAL")}
                className={contactFilter === "INTERNAL" ? "bg-emerald-600" : ""}
              >
                Đội nội bộ ({contacts.filter((c) => c.contact_type === "INTERNAL").length})
              </Button>
              <Button
                variant={contactFilter === "EXTERNAL" ? "default" : "outline"}
                size="sm"
                onClick={() => setContactFilter("EXTERNAL")}
                className={contactFilter === "EXTERNAL" ? "bg-emerald-600" : ""}
              >
                Cứu viện bên ngoài ({contacts.filter((c) => c.contact_type === "EXTERNAL").length})
              </Button>
            </div>
          </div>

          {filteredContacts.length === 0 ? (
            <EmptyState
              icon={PhoneCall}
              title="Chưa có đầu mối liên hệ khẩn cấp"
              description="Thiết lập danh bạ liên lạc đội ứng phó nội bộ nhà máy và các cơ quan cứu trợ ngoại viện (PCCC, cấp cứu 115, công an, bệnh viện)."
              actionLabel={canEdit ? "+ Thêm Đầu Mối Liên Hệ" : undefined}
              onAction={canEdit ? openNewContact : undefined}
              onOpenGuide={() => setShowGuide(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map((c, idx) => (
                <div
                  key={c.contact_id || c.id || `contact-${idx}`}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-shadow hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span
                          className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-sm uppercase mb-1.5 ${
                            c.contact_type === "INTERNAL"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {c.contact_type === "INTERNAL" ? "Nội bộ nhà máy" : "Cứu trợ ngoại vi"}
                        </span>
                        <h4 className="font-bold text-base text-slate-900">{c.name}</h4>
                        <p className="text-xs font-semibold text-emerald-700">{c.organization_or_role || c.role_title}</p>
                        {c.department && <p className="text-xs text-slate-500 mt-0.5">{c.department}</p>}
                      </div>
                      {(c.priority_order ?? c.priority_level) === 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                          Ưu tiên 1
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      {(c.address || c.location) && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{c.address || c.location}</span>
                        </div>
                      )}
                      {c.notes && (
                        <div className="text-[11px] text-slate-500 italic">
                          {c.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <a
                      href={`tel:${c.phone || c.phone_primary}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm transition-colors"
                    >
                      <PhoneCall className="h-4 w-4" />
                      <span>{c.phone || c.phone_primary}</span>
                    </a>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900" onClick={() => openEditContact(c)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-700" onClick={() => handleDeleteContact(c.contact_id || c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROCEDURES */}
      {activeTab === "procedures" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm mã kịch bản, tiêu đề, loại sự cố..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-white"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Ma trận rủi ro: <strong>Khả năng (L: 1-5)</strong> × <strong>Mức độ (S: 1-5)</strong> = <strong>Điểm rủi ro (R: 1-25)</strong>
            </div>
          </div>

          {filteredProcedures.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="Chưa có kịch bản ứng phó sự cố"
              description="Soạn thảo các quy trình thao tác chuẩn SOP ứng phó 7 nhóm sự cố ATTP và 2 nhóm rủi ro an ninh sinh học."
              actionLabel={canEdit ? "+ Soạn Kịch Bản Ứng Phó" : undefined}
              onAction={canEdit ? openNewProcedure : undefined}
              onOpenGuide={() => setShowGuide(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProcedures.map((p, idx) => {
                const meta = SCENARIO_LABELS[p.scenario_type] || {
                  label: p.scenario_type,
                  icon: AlertTriangle,
                  color: "text-slate-600 bg-slate-50 border-slate-200",
                };
                const IconComp = meta.icon;

                return (
                  <div
                    key={p.procedure_id || p.id || `proc-${idx}`}
                    className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${meta.color}`}>
                          <IconComp className="h-3.5 w-3.5 shrink-0" />
                          {meta.label}
                        </span>
                        {getRiskBadge(p.risk_score)}
                      </div>

                      <div className="mt-3">
                        <div className="text-xs font-mono font-bold text-slate-400">{p.procedure_code || p.code}</div>
                        <h4 className="font-bold text-base text-slate-900 mt-0.5">{p.title}</h4>
                        {p.description && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{p.description}</p>}
                      </div>

                      {/* Immediate Actions */}
                      {p.immediate_actions && p.immediate_actions.length > 0 && (
                        <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                            <Zap className="h-3.5 w-3.5 text-amber-500" /> Các bước hành động tức thì:
                          </span>
                          <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                            {p.immediate_actions.slice(0, 3).map((act: any, i: number) => {
                              const label = typeof act === "string" 
                                ? act 
                                : `${act.step ? `Bước ${act.step}: ` : ""}${act.action || ""}${act.responsible ? ` (${act.responsible})` : ""}`;
                              return (
                                <li key={i} className="truncate" title={typeof act === "string" ? act : act.action}>
                                  {label}
                                </li>
                              );
                            })}
                            {p.immediate_actions.length > 3 && (
                              <li className="text-slate-500 italic">+ {p.immediate_actions.length - 3} bước khác...</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Food Safety Control */}
                      {p.food_safety_controls && (
                        <div className="mt-2.5 text-xs text-emerald-800 bg-emerald-50/70 p-2 rounded border border-emerald-200">
                          <strong>Kiểm soát ATTP:</strong> {p.food_safety_controls}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span>L: <strong>{p.likelihood}</strong></span>
                        <span>S: <strong>{p.severity}</strong></span>
                        <span>Điểm: <strong>{p.risk_score}</strong></span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-slate-600 hover:text-slate-900"
                          onClick={() => setViewDetailModal(p)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Chi tiết
                        </Button>
                        {canEdit && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-blue-600 hover:text-blue-800"
                              onClick={() => openEditProcedure(p)}
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-1" /> Sửa
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-rose-600 hover:text-rose-800"
                              onClick={() => handleDeleteProcedure(p.procedure_id || p.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DRILLS & INCIDENTS */}
      {activeTab === "drills" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm mã biên bản, kịch bản, người chỉ huy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Button
                variant={drillTypeFilter === "ALL" ? "default" : "outline"}
                size="sm"
                onClick={() => setDrillTypeFilter("ALL")}
                className={drillTypeFilter === "ALL" ? "bg-emerald-600" : ""}
              >
                Tất cả ({drills.length})
              </Button>
              <Button
                variant={drillTypeFilter === "DRILL" ? "default" : "outline"}
                size="sm"
                onClick={() => setDrillTypeFilter("DRILL")}
                className={drillTypeFilter === "DRILL" ? "bg-emerald-600" : ""}
              >
                Diễn tập giả định ({drills.filter((d) => (d.record_type === "PLANNED_DRILL" || d.drill_type === "DRILL")).length})
              </Button>
              <Button
                variant={drillTypeFilter === "ACTUAL_INCIDENT" ? "default" : "outline"}
                size="sm"
                onClick={() => setDrillTypeFilter("ACTUAL_INCIDENT")}
                className={drillTypeFilter === "ACTUAL_INCIDENT" ? "bg-emerald-600" : ""}
              >
                Sự cố thực tế ({drills.filter((d) => (d.record_type === "ACTUAL_INCIDENT" || d.drill_type === "ACTUAL_INCIDENT")).length})
              </Button>
            </div>
          </div>

          {filteredDrills.length === 0 ? (
            <EmptyState
              icon={FileCheck2}
              title="Chưa có nhật ký diễn tập hoặc sự cố"
              description="Ghi nhận hồ sơ diễn tập phòng ngừa định kỳ hoặc báo cáo điều tra sự cố thực tế theo biểu mẫu BM-EMERGENCY-01."
              actionLabel={canEdit ? "+ Ghi Nhận Diễn Tập / Sự Cố" : undefined}
              onAction={canEdit ? openNewDrill : undefined}
              onOpenGuide={() => setShowGuide(true)}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Mã hồ sơ</th>
                    <th className="py-3 px-4">Loại tác nghiệp</th>
                    <th className="py-3 px-4">Tiêu đề & Nhóm tình huống</th>
                    <th className="py-3 px-4">Ngày diễn tập</th>
                    <th className="py-3 px-4">Địa điểm & Nhân lực</th>
                    <th className="py-3 px-4">TG phản ứng</th>
                    <th className="py-3 px-4 text-center">Kết quả</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDrills.map((d, idx) => {
                    const meta = SCENARIO_LABELS[d.scenario_type] || { label: d.scenario_type };
                    const isActual = d.record_type === "ACTUAL_INCIDENT" || d.drill_type === "ACTUAL_INCIDENT";
                    const result = d.evaluation_result;
                    const isPass = result === "PASS" || result === "SATISFACTORY" || result === "EXCELLENT";
                    const isNeedsImprovement = result === "NEEDS_IMPROVEMENT";

                    return (
                      <tr key={d.drill_id || d.id || `drill-${idx}`} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{d.drill_code}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                              !isActual
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {!isActual ? "Diễn tập" : "Sự cố thực tế"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{d.title}</div>
                          <div className="text-xs text-slate-500">{meta.label}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{d.drill_date}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          <div>{d.location}</div>
                          <div className="text-slate-400">{d.participants_count} người tham gia</div>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                          {d.response_time_minutes ? `${d.response_time_minutes} phút` : "--"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isPass && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {result === "EXCELLENT" ? "Xuất sắc" : "Đạt yêu cầu"}
                            </span>
                          )}
                          {isNeedsImprovement && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                              Cần cải tiến
                            </span>
                          )}
                          {!isPass && !isNeedsImprovement && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
                              Không đạt
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1 text-slate-700"
                              onClick={() => handlePrintDrill(d)}
                              title="In biên bản A4 BM-EMERGENCY-01"
                            >
                              <Printer className="h-3.5 w-3.5" /> In BM-01
                            </Button>
                            {canEdit && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs text-blue-600"
                                  onClick={() => openEditDrill(d)}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs text-rose-600"
                                  onClick={() => handleDeleteDrill(d.drill_id || d.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
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

      {/* MODAL 1: ADD/EDIT CONTACT */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {editingContact ? "Cập nhật đầu mối liên lạc" : "Thêm mới đầu mối liên lạc khẩn cấp"}
              </h3>
              <button onClick={() => setContactModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phân loại</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={contactForm.contact_type}
                    onChange={(e) => setContactForm({ ...contactForm, contact_type: e.target.value })}
                  >
                    <option value="INTERNAL">Nội bộ nhà máy</option>
                    <option value="EXTERNAL">Cứu viện bên ngoài (114, 115...)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mức ưu tiên liên lạc</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={contactForm.priority_level}
                    onChange={(e) => setContactForm({ ...contactForm, priority_level: Number(e.target.value) })}
                  >
                    <option value={1}>Ưu tiên 1 (Gọi tức thì)</option>
                    <option value={2}>Ưu tiên 2 (Báo cáo thứ cấp)</option>
                    <option value={3}>Ưu tiên 3 (Hỗ trợ mở rộng)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên cá nhân / Đơn vị tiếp nhận *</label>
                <Input
                  required
                  placeholder="Ví dụ: Đội PCCC & Cứu nạn Long Xuyên hoặc Nguyễn Văn A"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chức danh / Nhiệm vụ *</label>
                  <Input
                    required
                    placeholder="Đội trưởng PCCC / Trực ban..."
                    value={contactForm.role_title}
                    onChange={(e) => setContactForm({ ...contactForm, role_title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phòng ban / Cơ quan</label>
                  <Input
                    placeholder="Ban QLCL / Công an Tỉnh..."
                    value={contactForm.department}
                    onChange={(e) => setContactForm({ ...contactForm, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại chính (Hotline) *</label>
                  <Input
                    required
                    placeholder="114 / 0903..."
                    value={contactForm.phone_primary}
                    onChange={(e) => setContactForm({ ...contactForm, phone_primary: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại phụ</label>
                  <Input
                    placeholder="0296..."
                    value={contactForm.phone_secondary}
                    onChange={(e) => setContactForm({ ...contactForm, phone_secondary: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vị trí trực / Địa chỉ</label>
                <Input
                  placeholder="Nhà trực bảo vệ cổng chính / TP. Long Xuyên..."
                  value={contactForm.location}
                  onChange={(e) => setContactForm({ ...contactForm, location: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú thêm</label>
                <Input
                  placeholder="Thời gian ứng trực, hướng dẫn kết nối..."
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setContactModalOpen(false)}>
                  Hủy bỏ
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Lưu đầu mối
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD/EDIT PROCEDURE */}
      {procedureModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {editingProcedure ? "Cập nhật kịch bản ứng phó" : "Thiết lập kịch bản ứng phó khẩn cấp mới"}
              </h3>
              <button onClick={() => setProcedureModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProcedure} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã quy trình (Code) *</label>
                  <Input
                    required
                    placeholder="SOP-EP-01"
                    value={procForm.code}
                    onChange={(e) => setProcForm({ ...procForm, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nhóm tình huống (7+2 nhóm) *</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={procForm.scenario_type}
                    onChange={(e) => setProcForm({ ...procForm, scenario_type: e.target.value })}
                  >
                    {Object.entries(SCENARIO_LABELS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề kịch bản / Quy trình *</label>
                <Input
                  required
                  placeholder="Quy trình xử lý sự cố cháy nổ tại xưởng chế biến"
                  value={procForm.title}
                  onChange={(e) => setProcForm({ ...procForm, title: e.target.value })}
                />
              </div>

              {/* Likelihood x Severity Matrix */}
              <div className="p-3 bg-slate-50 border rounded-lg">
                <div className="text-xs font-bold text-slate-700 mb-2">Đánh giá ma trận rủi ro (Risk Matrix Scoring):</div>
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Khả năng (L: 1-5)</label>
                    <select
                      className="w-full border rounded p-1.5 bg-white text-xs"
                      value={procForm.likelihood}
                      onChange={(e) => setProcForm({ ...procForm, likelihood: Number(e.target.value) })}
                    >
                      <option value={1}>1 - Hiếm khi xảy ra</option>
                      <option value={2}>2 - Ít khi xảy ra</option>
                      <option value={3}>3 - Thỉnh thoảng</option>
                      <option value={4}>4 - Thường xuyên</option>
                      <option value={5}>5 - Rất thường xuyên</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1">Mức độ nghiêm trọng (S: 1-5)</label>
                    <select
                      className="w-full border rounded p-1.5 bg-white text-xs"
                      value={procForm.severity}
                      onChange={(e) => setProcForm({ ...procForm, severity: Number(e.target.value) })}
                    >
                      <option value={1}>1 - Không đáng kể</option>
                      <option value={2}>2 - Nhỏ, xử lý tại chỗ</option>
                      <option value={3}>3 - Trung bình, dừng chuyền</option>
                      <option value={4}>4 - Lớn, ô nhiễm mẻ hàng</option>
                      <option value={5}>5 - Thảm họa, nguy hại sức khỏe</option>
                    </select>
                  </div>
                  <div className="text-center pt-3">
                    <div className="text-[11px] text-slate-500 font-medium">Điểm rủi ro (R = L × S):</div>
                    <div className="mt-1">{getRiskBadge(procForm.likelihood * procForm.severity)}</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Các bước hành động tức thì (Mỗi bước 1 dòng) *
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full border rounded-md p-2 text-xs font-mono"
                  placeholder="1. Phát còi báo động khẩn cấp&#10;2. Cắt cầu dao điện tổng phân xưởng&#10;3. Sơ tán nhân sự theo lối thoát hiểm số 2&#10;4. Đội PCCC cơ sở tiếp cận dập lửa ban đầu"
                  value={procForm.immediate_actions_text}
                  onChange={(e) => setProcForm({ ...procForm, immediate_actions_text: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hành động kiểm soát An toàn thực phẩm (Food Safety Controls)
                </label>
                <textarea
                  rows={2}
                  className="w-full border rounded-md p-2 text-xs"
                  placeholder="Cách ly toàn bộ nguyên liệu, bán thành phẩm trong vòng bán kính 20m. Khóa kho không cho xuất hàng..."
                  value={procForm.food_safety_controls}
                  onChange={(e) => setProcForm({ ...procForm, food_safety_controls: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vai trò phụ trách chính</label>
                  <Input
                    placeholder="Đội trưởng PCCC & Trưởng ban ATTP"
                    value={procForm.responsible_role}
                    onChange={(e) => setProcForm({ ...procForm, responsible_role: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Điểm tập kết an toàn (Assembly Point)</label>
                  <Input
                    placeholder="Sân trước cổng chính nhà máy"
                    value={procForm.assembly_point}
                    onChange={(e) => setProcForm({ ...procForm, assembly_point: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setProcedureModalOpen(false)}>
                  Hủy bỏ
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Lưu kịch bản
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD/EDIT DRILL RECORD */}
      {drillModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {editingDrill ? "Cập nhật biên bản diễn tập" : "Lập biên bản diễn tập / Xử lý sự cố mới"}
              </h3>
              <button onClick={() => setDrillModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDrill} className="space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã hồ sơ biên bản *</label>
                  <Input
                    required
                    placeholder="BM-EMRG-2026-001"
                    value={drillForm.drill_code}
                    onChange={(e) => setDrillForm({ ...drillForm, drill_code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phân loại tác nghiệp</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={drillForm.drill_type}
                    onChange={(e) => setDrillForm({ ...drillForm, drill_type: e.target.value })}
                  >
                    <option value="DRILL">Diễn tập giả định định kỳ (Drill)</option>
                    <option value="ACTUAL_INCIDENT">Xử lý sự cố thực tế phát sinh (Incident)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề đợt diễn tập / sự cố *</label>
                <Input
                  required
                  placeholder="Diễn tập ứng phó cháy nổ phân xưởng chế biến Q3/2026"
                  value={drillForm.title}
                  onChange={(e) => setDrillForm({ ...drillForm, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nhóm tình huống</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={drillForm.scenario_type}
                    onChange={(e) => setDrillForm({ ...drillForm, scenario_type: e.target.value })}
                  >
                    {Object.entries(SCENARIO_LABELS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày thực hiện *</label>
                  <Input
                    type="date"
                    required
                    value={drillForm.drill_date}
                    onChange={(e) => setDrillForm({ ...drillForm, drill_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Địa điểm thực hiện</label>
                  <Input
                    value={drillForm.location}
                    onChange={(e) => setDrillForm({ ...drillForm, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số người tham gia</label>
                  <Input
                    type="number"
                    min={1}
                    value={drillForm.participants_count}
                    onChange={(e) => setDrillForm({ ...drillForm, participants_count: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Người chỉ huy / Đánh giá</label>
                  <Input
                    required
                    value={drillForm.lead_evaluator}
                    onChange={(e) => setDrillForm({ ...drillForm, lead_evaluator: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Thời gian tổng (phút)</label>
                  <Input
                    type="number"
                    value={drillForm.duration_minutes}
                    onChange={(e) => setDrillForm({ ...drillForm, duration_minutes: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">TG phản ứng tức thì (phút)</label>
                  <Input
                    type="number"
                    value={drillForm.response_time_minutes}
                    onChange={(e) => setDrillForm({ ...drillForm, response_time_minutes: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kết quả đánh giá</label>
                  <select
                    className="w-full border rounded-md p-2 bg-white text-sm"
                    value={drillForm.evaluation_result}
                    onChange={(e) => setDrillForm({ ...drillForm, evaluation_result: e.target.value })}
                  >
                    <option value="PASS">Đạt yêu cầu</option>
                    <option value="NEEDS_IMPROVEMENT">Cần cải tiến thêm</option>
                    <option value="FAIL">Không đạt (Diễn tập lại)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Diễn biến tình huống / Kịch bản giả định</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-md p-2 text-xs"
                  value={drillForm.scenario_description}
                  onChange={(e) => setDrillForm({ ...drillForm, scenario_description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nhận xét & Phát hiện thực tế (Findings)</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-md p-2 text-xs"
                  value={drillForm.findings}
                  onChange={(e) => setDrillForm({ ...drillForm, findings: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hành động khắc phục / Khuyến nghị cải tiến (CAPA)</label>
                <textarea
                  rows={2}
                  className="w-full border rounded-md p-2 text-xs"
                  value={drillForm.corrective_actions}
                  onChange={(e) => setDrillForm({ ...drillForm, corrective_actions: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setDrillModalOpen(false)}>
                  Hủy bỏ
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Lưu biên bản
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL FOR PROCEDURE */}
      {viewDetailModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-slate-400">{viewDetailModal.procedure_code || viewDetailModal.code}</span>
                <h3 className="font-bold text-lg text-slate-900">{viewDetailModal.title}</h3>
              </div>
              <button onClick={() => setViewDetailModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border">
                <div>
                  <strong>Nhóm tình huống:</strong> {SCENARIO_LABELS[viewDetailModal.scenario_type]?.label || viewDetailModal.scenario_type}
                </div>
                <div>{getRiskBadge(viewDetailModal.risk_score)}</div>
              </div>

              {viewDetailModal.description && (
                <div>
                  <strong className="text-slate-700 block mb-1">Mô tả sự cố:</strong>
                  <p className="text-slate-600 bg-slate-50 p-2.5 rounded border">{viewDetailModal.description}</p>
                </div>
              )}

              <div>
                <strong className="text-slate-700 block mb-1">Quy trình các bước hành động tức thì:</strong>
                <div className="space-y-2 bg-amber-50/60 p-3 rounded-lg border border-amber-200">
                  {(viewDetailModal.immediate_actions || []).length === 0 ? (
                    <p className="text-slate-500 italic text-xs">Chưa có bước hành động nào được khai báo.</p>
                  ) : (
                    (viewDetailModal.immediate_actions || []).map((act: any, idx: number) => {
                      if (typeof act === "string") {
                        return (
                          <div key={idx} className="text-xs text-amber-950 flex items-start gap-2 bg-white/70 p-2 rounded border border-amber-100">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <span>{act}</span>
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className="flex items-start gap-2.5 text-xs bg-white/80 p-2.5 rounded-lg border border-amber-100 shadow-2xs">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-[11px]">
                            {act.step || idx + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 leading-relaxed">{act.action}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                              {act.responsible && (
                                <span>Phụ trách: <strong className="text-slate-700">{act.responsible}</strong></span>
                              )}
                              {act.deadline_minutes && (
                                <span className="text-amber-700 font-medium">Thời hạn: <strong>{act.deadline_minutes} phút</strong></span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {viewDetailModal.food_safety_controls && (
                <div>
                  <strong className="text-slate-700 block mb-1">Kiểm soát an toàn thực phẩm:</strong>
                  <p className="text-emerald-900 bg-emerald-50 p-2.5 rounded border border-emerald-200">
                    {viewDetailModal.food_safety_controls}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t text-slate-600">
                <div><strong>Phụ trách:</strong> {viewDetailModal.responsible_team || viewDetailModal.responsible_role || "--"}</div>
                <div><strong>Điểm tập kết:</strong> {viewDetailModal.assembly_point || "--"}</div>
                <div><strong>Trang bị:</strong> {viewDetailModal.equipment_needed || "--"}</div>
                <div><strong>Trạng thái:</strong> {viewDetailModal.status}</div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <Button onClick={() => setViewDetailModal(null)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}

      {/* Module Guide Modal */}
      <ModuleGuideModal
        module="emergency"
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />
    </div>
  );
}
