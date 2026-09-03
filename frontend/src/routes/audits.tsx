import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, AIBadge } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  GraduationCap,
  ClipboardCheck,
  HeartPulse,
  Thermometer,
  Stethoscope,
  BookOpen,
  UserCheck,
  UserX,
  FileCheck,
  ListOrdered,
  Send,
  Eye,
  Trash2,
  Edit,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import logoImg from "/logo.png";
import { printHtml } from "@/lib/print";
import { WorkflowBuilder, type WorkflowTemplateData } from "@/components/builder/WorkflowBuilder";
import { useDepartments } from "@/lib/departments";

export const Route = createFileRoute("/audits")({
  head: () => ({
    meta: [
      { title: "Đánh Giá Nội Bộ, Đào Tạo & Khai Báo Sức Khỏe – WCERT ISO 22000:2018" },
      { name: "description", content: "Hệ thống quản lý đánh giá nội bộ (Điều 9.2), ma trận đào tạo nhân sự (Điều 7.2) và sổ khai báo sức khỏe ca (Điều 8.2 PRP) chuẩn ISO 22000:2018." },
      { property: "og:title", content: "Đánh Giá Nội Bộ, Đào Tạo & Khai Báo Sức Khỏe – WCERT ISO 22000:2018" },
      { property: "og:description", content: "Số hóa quy trình ĐGNB, đào tạo sát hạch nhân sự và kiểm soát vệ sinh sức khỏe công nhân trước ca với Trợ lý AI." },
    ],
  }),
  component: () => (
    <AppShell module="audits">
      <AuditManagementPage />
    </AppShell>
  ),
});

// ==================== INTERFACES ====================
interface InternalAudit {
  audit_id: string;
  audit_code: string;
  title: string;
  audit_type: "PERIODIC" | "UNANNOUNCED" | "FOLLOW_UP" | "PRE_CERTIFICATION";
  start_date: string;
  end_date: string;
  lead_auditor_name: string;
  lead_auditor_id?: string;
  auditor_team?: { name: string; role: string; dept: string }[];
  audited_dept: string;
  audited_lead_name?: string;
  scope: string;
  standard_clauses?: string[];
  findings_summary?: string;
  conclusion?: string;
  status: "PLANNED" | "IN_PROGRESS" | "REPORTING" | "COMPLETED" | "CLOSED";
  created_at?: string;
  total_findings?: number;
  conformity_count?: number;
  major_nc_count?: number;
  minor_nc_count?: number;
  ofi_count?: number;
}

interface AuditFinding {
  finding_id: string;
  audit_id: string;
  clause_number: string;
  clause_title: string;
  department: string;
  question: string;
  evidence_reviewed?: string;
  result: "CONFORMITY" | "MAJOR_NC" | "MINOR_NC" | "OFI";
  finding_notes?: string;
  linked_nc_id?: string;
  nc_number?: string;
  nc_status?: string;
  created_at?: string;
}

interface TrainingCourse {
  course_id: string;
  course_code: string;
  title: string;
  category: "ISO_AWARENESS" | "HACCP_CCP" | "FOOD_HYGIENE_GMP" | "ALLERGEN_CONTROL" | "EQUIPMENT_OPERATION" | "EMERGENCY_RECALL";
  trainer_name: string;
  training_type: "INTERNAL" | "EXTERNAL";
  schedule_date: string;
  duration_hours: number;
  target_dept: string;
  content_summary?: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  created_at?: string;
  total_participants?: number;
  passed_participants?: number;
  avg_score?: number;
}

interface TrainingParticipant {
  participant_id: string;
  course_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  position?: string;
  attendance_status: "ATTENDED" | "ABSENT" | "EXCUSED";
  pre_test_score?: number;
  post_test_score?: number;
  evaluation_result: "PASSED" | "FAILED" | "RE_TRAINING_REQUIRED";
  certificate_issued: boolean;
  notes?: string;
  created_at?: string;
}

interface HealthDeclaration {
  declaration_id: string;
  employee_code: string;
  employee_name: string;
  department: string;
  shift_date: string;
  shift_name: string;
  symptoms: {
    fever?: boolean;
    cough?: boolean;
    diarrhea?: boolean;
    vomiting?: boolean;
    open_wound?: boolean;
    skin_infection?: boolean;
  };
  body_temperature: number;
  personal_hygiene_check: {
    nails_trimmed?: boolean;
    jewelry_removed?: boolean;
    clean_uniform?: boolean;
  };
  cleared_for_shift: "CLEARED" | "RESTRICTED" | "SUSPENDED";
  supervisor_name: string;
  notes?: string;
  created_at?: string;
}

interface AuditStats {
  total_audits: number;
  completed_audits: number;
  in_progress_audits: number;
  planned_audits: number;
  total_findings: number;
  major_nc_count: number;
  minor_nc_count: number;
  ofi_count: number;
  conformity_rate: number;
  total_courses: number;
  completed_courses: number;
  total_learners: number;
  passed_rate: number;
  total_health_declarations: number;
  today_cleared_count: number;
  today_suspended_count: number;
}

// ==================== MAIN COMPONENT ====================
function AuditManagementPage() {
  const { departments } = useDepartments();
  const [activeTab, setActiveTab] = useState<"audits" | "training" | "health" | "ai_studio">("audits");
  const [stats, setStats] = useState<AuditStats>({
    total_audits: 0,
    completed_audits: 0,
    in_progress_audits: 0,
    planned_audits: 0,
    total_findings: 0,
    major_nc_count: 0,
    minor_nc_count: 0,
    ofi_count: 0,
    conformity_rate: 100.0,
    total_courses: 0,
    completed_courses: 0,
    total_learners: 0,
    passed_rate: 100.0,
    total_health_declarations: 0,
    today_cleared_count: 0,
    today_suspended_count: 0,
  });

  const [audits, setAudits] = useState<InternalAudit[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<InternalAudit | null>(null);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);
  const [participants, setParticipants] = useState<TrainingParticipant[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthDeclaration[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [auditTypeFilter, setAuditTypeFilter] = useState("ALL");
  const [auditStatusFilter, setAuditStatusFilter] = useState("ALL");
  const [courseCatFilter, setCourseCatFilter] = useState("ALL");
  const [healthStatusFilter, setHealthStatusFilter] = useState("ALL");

  // Modals
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [editingAudit, setEditingAudit] = useState<InternalAudit | null>(null);
  const [auditForm, setAuditForm] = useState({
    audit_code: "",
    title: "",
    audit_type: "PERIODIC",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    lead_auditor_name: "ThS. Nguyễn Văn An (Lead Auditor)",
    audited_dept: "Phòng Sản Xuất & Chế Biến",
    audited_lead_name: "Quản Đốc Xưởng",
    scope: "Toàn bộ chu trình từ tiếp nhận nguyên liệu đến lưu kho thành phẩm.",
    findings_summary: "",
    conclusion: "",
    status: "PLANNED",
  });

  const [showFindingModal, setShowFindingModal] = useState(false);
  const [findingForm, setFindingForm] = useState({
    clause_number: "8.2.4",
    clause_title: "Bố trí mặt bằng & Kiểm soát vệ sinh PRP",
    department: "Xưởng Sơ Chế",
    question: "Tình trạng bề mặt bàn chế biến có sạch sẽ và khử trùng đúng tần suất không?",
    evidence_reviewed: "Biên bản kiểm tra đầu ca và mẫu test nhanh vi sinh bề mặt.",
    result: "CONFORMITY",
    finding_notes: "",
  });

  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    course_code: "",
    title: "",
    category: "HACCP_CCP",
    trainer_name: "ThS. Nguyễn Văn An",
    training_type: "INTERNAL",
    schedule_date: new Date().toISOString().split("T")[0],
    duration_hours: 4.0,
    target_dept: "Phòng Sản Xuất & QA",
    content_summary: "",
    status: "PLANNED",
  });

  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [participantForm, setParticipantForm] = useState({
    employee_code: "NV-0101",
    employee_name: "Nguyễn Văn A",
    department: "Xưởng Chế Biến",
    position: "Công nhân vận hành",
    attendance_status: "ATTENDED",
    pre_test_score: 50.0,
    post_test_score: 85.0,
    evaluation_result: "PASSED",
    certificate_issued: true,
    notes: "",
  });

  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthForm, setHealthForm] = useState({
    employee_code: "NV-0102",
    employee_name: "Phạm Văn Dũng",
    department: "Xưởng Sản Xuất",
    shift_date: new Date().toISOString().split("T")[0],
    shift_name: "Ca Sáng",
    body_temperature: 36.5,
    symptoms: {
      fever: false,
      cough: false,
      diarrhea: false,
      vomiting: false,
      open_wound: false,
      skin_infection: false,
    },
    personal_hygiene_check: {
      nails_trimmed: true,
      jewelry_removed: true,
      clean_uniform: true,
    },
    cleared_for_shift: "CLEARED",
    supervisor_name: "Y tế Ca: Nguyễn Thị Lan",
    notes: "",
  });

  // Print Modals
  const [showPrintAuditModal, setShowPrintAuditModal] = useState(false);
  const [showPrintTrainModal, setShowPrintTrainModal] = useState(false);
  const [showPrintHealthModal, setShowPrintHealthModal] = useState(false);

  // Workflow Modal
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [workflowTemplate, setWorkflowTemplate] = useState<WorkflowTemplateData | null>(null);

  // AI Studio State
  const [aiTopic, setAiTopic] = useState("8.5 HACCP");
  const [aiChecklistResult, setAiChecklistResult] = useState<any>(null);
  const [aiFindingText, setAiFindingText] = useState("");
  const [aiEvalResult, setAiEvalResult] = useState<any>(null);
  const [aiQuizTopic, setAiQuizTopic] = useState("HACCP & 7 Nguyên Tắc");
  const [aiQuizResult, setAiQuizResult] = useState<any>(null);
  const [aiHealthRiskResult, setAiHealthRiskResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Load Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, auditsRes, coursesRes, healthRes] = await Promise.all([
        api.get("/audits/stats"),
        api.get("/audits/audits"),
        api.get("/audits/training/courses"),
        api.get("/audits/health-declarations"),
      ]);
      setStats(statsRes.data);
      setAudits(auditsRes.data);
      setCourses(coursesRes.data);
      setHealthLogs(healthRes.data);

      if (auditsRes.data.length > 0 && !selectedAudit) {
        setSelectedAudit(auditsRes.data[0]);
        loadFindings(auditsRes.data[0].audit_id);
      }
      if (coursesRes.data.length > 0 && !selectedCourse) {
        setSelectedCourse(coursesRes.data[0]);
        loadParticipants(coursesRes.data[0].course_id);
      }
    } catch (err: any) {
      console.error("Lỗi tải dữ liệu Audits:", err);
      toast.error("Không thể tải danh sách ĐGNB & Đào tạo: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadFindings = async (auditId: string) => {
    try {
      const res = await api.get(`/audits/audits/${auditId}/findings`);
      setFindings(res.data);
    } catch (err: any) {
      toast.error("Không thể tải bảng kiểm checklist: " + (err.response?.data?.detail || err.message));
    }
  };

  const loadParticipants = async (courseId: string) => {
    try {
      const res = await api.get(`/audits/training/courses/${courseId}/participants`);
      setParticipants(res.data);
    } catch (err: any) {
      toast.error("Không thể tải danh sách học viên: " + (err.response?.data?.detail || err.message));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered lists
  const filteredAudits = audits.filter((a) => {
    const matchSearch = !searchQuery || a.audit_code.toLowerCase().includes(searchQuery.toLowerCase()) || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.audited_dept.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = auditTypeFilter === "ALL" || a.audit_type === auditTypeFilter;
    const matchStatus = auditStatusFilter === "ALL" || a.status === auditStatusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const filteredCourses = courses.filter((c) => {
    const matchSearch = !searchQuery || c.course_code.toLowerCase().includes(searchQuery.toLowerCase()) || c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = courseCatFilter === "ALL" || c.category === courseCatFilter;
    return matchSearch && matchCat;
  });

  const filteredHealth = healthLogs.filter((h) => {
    const matchSearch = !searchQuery || h.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) || h.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) || h.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = healthStatusFilter === "ALL" || h.cleared_for_shift === healthStatusFilter;
    return matchSearch && matchStatus;
  });

  // Seed sample data
  const handleSeedDefaults = async () => {
    try {
      const res = await api.post("/audits/seed-defaults");
      toast.success(res.data.message || "Đã nạp dữ liệu mẫu ĐGNB & Đào tạo thành công!");
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi nạp dữ liệu mẫu: " + (err.response?.data?.detail || err.message));
    }
  };

  // Convert Finding to NC
  const handleConvertToNC = async (findingId: string) => {
    try {
      const res = await api.post(`/audits/findings/${findingId}/convert-to-nc`);
      toast.success(res.data.message || "Đã chuyển đổi phát hiện thành công sang Phiếu NC!");
      if (selectedAudit) loadFindings(selectedAudit.audit_id);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi chuyển đổi NC: " + (err.response?.data?.detail || err.message));
    }
  };

  // Open Workflow Studio
  const handleOpenWorkflow = async () => {
    setWorkflowTemplate({
      module: "INTERNAL_AUDIT",
      code: "WF-AUDIT-4STEPS",
      title: "Quy Trình 4 Bước Đánh Giá Nội Bộ ISO 22000:2018 (Điều 9.2)",
      description: "Quy trình chuẩn mực đánh giá độc lập: Lập kế hoạch & Chuẩn bị Checklist -> Đánh giá tại hiện trường -> Lập báo cáo phát hiện -> Thẩm tra khắc phục CAPA.",
      version: "1.0",
      nodes: [
        { id: "a_1", type: "process", label: "1. Lập Kế Hoạch & Soạn Checklist", role: "Trưởng đoàn ĐGNB", description: "Xác định phạm vi, chuẩn mực áp dụng và phân công đánh giá chéo.", is_ccp: false, step_number: 1 },
        { id: "a_2", type: "process", label: "2. Thực Hiện Đánh Giá Tại Chỗ", role: "Đoàn ĐGNB & Đại diện Phòng ban", description: "Phỏng vấn nhân sự, kiểm tra hồ sơ ghi chép và quan sát hiện trường sản xuất.", is_ccp: false, step_number: 2 },
        { id: "a_3", type: "approval", label: "3. Họp Tổng Kết & Báo Cáo Phát Hiện", role: "Trưởng ban ISO & Ban Giám Đốc", description: "Thống nhất phân loại lỗi (Conformity / Major NC / Minor NC / OFI) và ký biên bản.", is_ccp: false, step_number: 3 },
        { id: "a_4", type: "process", label: "4. Theo Dõi & Thẩm Tra Khắc Phục CAPA", role: "QA Lead / Auditor", description: "Giám sát các hành động khắc phục phòng ngừa 10.1 và đóng hồ sơ sau 30 ngày.", is_ccp: false, step_number: 4 },
      ],
      edges: [
        { id: "ea1_2", source: "a_1", target: "a_2", label: "Triển khai đánh giá" },
        { id: "ea2_3", source: "a_2", target: "a_3", label: "Lập danh mục phát hiện" },
        { id: "ea3_4", source: "a_3", target: "a_4", label: "Phê duyệt & Chuyển CAPA" },
      ],
      status: "ACTIVE",
    });
    setShowWorkflowModal(true);
  };

  // AI Actions
  const handleGenerateChecklist = async () => {
    try {
      setAiLoading(true);
      const res = await api.post("/audits/ai/generate-checklist", { clause_or_dept: aiTopic });
      setAiChecklistResult(res.data);
      toast.success("AI đã sinh danh mục câu hỏi checklist thành công!");
    } catch (err: any) {
      toast.error("Lỗi AI Checklist: " + (err.response?.data?.detail || err.message));
    } finally {
      setAiLoading(false);
    }
  };

  const handleEvaluateFinding = async () => {
    if (!aiFindingText.trim()) {
      toast.error("Vui lòng nhập mô tả phát hiện hiện trường!");
      return;
    }
    try {
      setAiLoading(true);
      const res = await api.post("/audits/ai/evaluate-finding", { finding_text: aiFindingText });
      setAiEvalResult(res.data);
      toast.success("AI đã thẩm định và phân loại phát hiện thành công!");
    } catch (err: any) {
      toast.error("Lỗi AI Thẩm định: " + (err.response?.data?.detail || err.message));
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    try {
      setAiLoading(true);
      const res = await api.post("/audits/ai/generate-quiz", { topic: aiQuizTopic });
      setAiQuizResult(res.data);
      toast.success("AI đã sinh bộ đề thi trắc nghiệm thành công!");
    } catch (err: any) {
      toast.error("Lỗi AI Quiz: " + (err.response?.data?.detail || err.message));
    } finally {
      setAiLoading(false);
    }
  };

  const handleScanHealthRisk = async () => {
    try {
      setAiLoading(true);
      const res = await api.post("/audits/ai/scan-health-risk", {});
      setAiHealthRiskResult(res.data);
      toast.success("AI đã quét phân tích rủi ro dịch tễ thành công!");
    } catch (err: any) {
      toast.error("Lỗi AI Scan: " + (err.response?.data?.detail || err.message));
    } finally {
      setAiLoading(false);
    }
  };

  // ==================== TRIGGER PRINT FUNCTIONS ====================
  const triggerPrintAuditReport = (audit: InternalAudit, list: AuditFinding[]) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const rowsHtml = list.length === 0
      ? `<tr><td colspan="5" style="text-align: center; padding: 14px; font-weight: bold; color: #047857; background: #f0fdf4;">✓ Toàn bộ các tiêu chí đánh giá trong phạm vi đều đạt chuẩn tuân thủ (100% Conformity) - Không ghi nhận điểm không phù hợp (No NC).</td></tr>`
      : list.map((f, idx) => `
        <tr>
          <td style="text-align: center; font-family: monospace; font-weight: bold;">${idx + 1}</td>
          <td style="text-align: center; font-weight: bold; font-family: monospace;">Điều ${f.clause_number}</td>
          <td><b>${f.clause_title}</b><br/><span style="color: #334155;">${f.question}</span></td>
          <td style="text-align: center; font-weight: 800; font-size: 11px;">
            ${f.result === "MAJOR_NC" ? '<span style="color: #b91c1c; background: #fee2e2; padding: 3px 8px; border-radius: 4px; border: 1px solid #fca5a5;">MAJOR NC</span>' :
              f.result === "MINOR_NC" ? '<span style="color: #b45309; background: #fef3c7; padding: 3px 8px; border-radius: 4px; border: 1px solid #fcd34d;">MINOR NC</span>' :
              f.result === "OFI" ? '<span style="color: #1d4ed8; background: #dbeafe; padding: 3px 8px; border-radius: 4px; border: 1px solid #93c5fd;">OFI</span>' :
              '<span style="color: #047857; background: #d1fae5; padding: 3px 8px; border-radius: 4px; border: 1px solid #6ee7b7;">PHÙ HỢP</span>'}
          </td>
          <td style="font-size: 11px; line-height: 1.4;">
            ${f.finding_notes ? `<b>Sai lệch:</b> ${f.finding_notes}<br/>` : ''}
            ${f.evidence_reviewed ? `<span style="color: #64748b;"><b>Bằng chứng:</b> ${f.evidence_reviewed}</span>` : '--'}
          </td>
        </tr>
      `).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BM-AUDIT-01 - Báo Cáo ĐGNB [${audit.audit_code}]</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { font-family: 'Times New Roman', Times, serif; padding: 8px; color: #111; line-height: 1.45; font-size: 13px; background: #fff; }
          .header-table { width: 100%; border: 2px solid #0f172a; border-collapse: collapse; margin-bottom: 14px; }
          .header-table td { border: 1px solid #0f172a; padding: 8px 10px; vertical-align: middle; }
          .logo-box { width: 25%; text-align: center; background-color: #f8fafc; }
          .logo-title { font-size: 13px; font-weight: 900; color: #047857; letter-spacing: 0.5px; }
          .logo-sub { font-size: 9.5px; color: #475569; font-weight: 700; text-transform: uppercase; }
          .title-box { width: 50%; text-align: center; }
          .title-main { font-size: 14px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-top: 3px; }
          .meta-box { width: 25%; font-size: 10.5px; background-color: #f8fafc; line-height: 1.4; }
          .doc-title { text-align: center; margin-bottom: 14px; }
          .doc-title h2 { margin: 0; font-size: 16px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
          .doc-title p { margin: 4px 0 0; font-size: 12px; color: #475569; font-style: italic; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px; }
          table.data-table th, table.data-table td { border: 1px solid #0f172a; padding: 6px 8px; text-align: left; vertical-align: middle; }
          table.data-table th { background-color: #f1f5f9; font-weight: bold; text-align: center; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px; background-color: #f8fafc; }
          .info-table td { border: 1px solid #cbd5e1; padding: 6px 10px; }
          .sig-box { display: flex; justify-content: space-between; margin-top: 24px; page-break-inside: avoid; }
          .sig-col { width: 32%; text-align: center; font-size: 11.5px; line-height: 1.35; }
          .footer-note { margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 6px; font-size: 9.5px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="logo-box">
              <img src="${origin}/logo.png" style="height: 48px; width: auto; object-contain; margin-bottom: 2px;" /><br/>
              <span class="logo-title">WCERT FSMS</span><br/>
              <span class="logo-sub">Food Safety Management</span>
            </td>
            <td class="title-box">
              <div style="font-size: 11px; font-weight: bold; color: #334155;">CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT</div>
              <div class="title-main">BÁO CÁO ĐÁNH GIÁ NỘI BỘ FSMS</div>
              <div style="font-size: 11px; font-style: italic; color: #475569; margin-top: 2px;">Tiêu chuẩn ISO 22000:2018 (Điều khoản 9.2)</div>
            </td>
            <td class="meta-box">
              <b>Mã Biểu Mẫu:</b> BM-AUDIT-01<br/>
              <b>Mã Đợt ĐG:</b> <span style="font-weight: bold; color: #1e40af;">${audit.audit_code}</span><br/>
              <b>Ngày ban hành:</b> ${audit.start_date}<br/>
              <b>Lần ban hành:</b> 01 / 2026
            </td>
          </tr>
        </table>

        <div class="doc-title">
          <h2>BÁO CÁO TỔNG KẾT ĐÁNH GIÁ NỘI BỘ HỆ THỐNG FSMS</h2>
          <p>${audit.title}</p>
        </div>

        <table class="info-table">
          <tr>
            <td style="width: 50%;"><b>Phòng ban được đánh giá:</b> ${audit.audited_dept}</td>
            <td style="width: 50%;"><b>Trưởng đoàn đánh giá:</b> ${audit.lead_auditor_name}</td>
          </tr>
          <tr>
            <td><b>Thời gian thực hiện:</b> ${audit.start_date} ~ ${audit.end_date}</td>
            <td><b>Loại hình đánh giá:</b> ${audit.audit_type === "PERIODIC" ? "Định kỳ theo kế hoạch" : audit.audit_type === "UNANNOUNCED" ? "Đột xuất" : audit.audit_type === "PRE_CERTIFICATION" ? "Tiền chứng nhận (Pre-Audit)" : "Tái kiểm tra khắc phục"}</td>
          </tr>
          <tr>
            <td colspan="2"><b>Phạm vi đánh giá:</b> ${audit.scope || "Toàn bộ chu trình từ tiếp nhận nguyên liệu, chế biến đến lưu kho thành phẩm."}</td>
          </tr>
        </table>

        <div style="font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 6px; color: #0f172a;">
          DANH MỤC PHÁT HIỆN & BẢNG KIỂM CHECKLIST ĐIỀU KHOẢN ISO:
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35px;">STT</th>
              <th style="width: 75px;">Điều khoản</th>
              <th>Nội dung câu hỏi / Chuẩn mực kiểm tra</th>
              <th style="width: 95px;">Kết luận</th>
              <th style="width: 180px;">Ghi nhận sai lệch & Bằng chứng</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="sig-box">
          <div class="sig-col">
             <b>ĐẠI DIỆN PHÒNG BAN</b><br/>
             <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
             <b>${audit.audited_lead_name || "Quản Đốc Phân Xưởng"}</b><br/>
             <span style="font-size: 10px; color: #64748b;">Đại diện bên được đánh giá</span>
          </div>
          <div class="sig-col">
             <b>TRƯỞNG ĐOÀN ĐÁNH GIÁ</b><br/>
             <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
             <b>${audit.lead_auditor_name}</b><br/>
             <span style="font-size: 10px; color: #64748b;">Lead Auditor</span>
          </div>
          <div class="sig-col">
             <b>TRƯỞNG BAN ISO / BAN GIÁM ĐỐC</b><br/>
             <i>(Ký duyệt xác nhận)</i><br/><br/><br/><br/>
             <b>Ban Giám Đốc WCERT</b><br/>
             <span style="font-size: 10px; color: #64748b;">Phê duyệt Báo cáo ĐGNB</span>
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

  const triggerPrintTrainingRecord = (course: TrainingCourse, list: TrainingParticipant[]) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const rowsHtml = list.length === 0
      ? `<tr><td colspan="8" style="text-align: center; padding: 14px; color: #475569; font-style: italic; background: #f8fafc;">(Khóa đào tạo đang trong giai đoạn tiếp nhận đăng ký học viên - Chưa ghi nhận điểm sát hạch)</td></tr>`
      : list.map((p, idx) => `
        <tr>
          <td style="text-align: center; font-family: monospace;">${idx + 1}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold;">${p.employee_code}</td>
          <td style="font-weight: bold;">${p.employee_name}</td>
          <td>${p.department}</td>
          <td style="text-align: center; font-family: monospace;">${p.pre_test_score !== null ? `${p.pre_test_score}đ` : '--'}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; color: #7e22ce;">${p.post_test_score !== null ? `${p.post_test_score}đ` : '--'}</td>
          <td style="text-align: center; font-weight: bold;">
            ${p.evaluation_result === "PASSED" ? '<span style="color: #047857; background: #d1fae5; padding: 2px 6px; border-radius: 4px;">ĐẠT</span>' : '<span style="color: #b91c1c; background: #fee2e2; padding: 2px 6px; border-radius: 4px;">CHƯA ĐẠT</span>'}
          </td>
          <td style="text-align: center;">${p.certificate_issued ? '<span style="color: #047857; font-weight: bold;">✓ ĐÃ CẤP</span>' : '<span style="color: #94a3b8;">Chưa</span>'}</td>
        </tr>
      `).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BM-TRAIN-02 - Biên Bản Đào Tạo [${course.course_code}]</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { font-family: 'Times New Roman', Times, serif; padding: 8px; color: #111; line-height: 1.45; font-size: 13px; background: #fff; }
          .header-table { width: 100%; border: 2px solid #0f172a; border-collapse: collapse; margin-bottom: 14px; }
          .header-table td { border: 1px solid #0f172a; padding: 8px 10px; vertical-align: middle; }
          .logo-box { width: 25%; text-align: center; background-color: #f8fafc; }
          .logo-title { font-size: 13px; font-weight: 900; color: #7e22ce; letter-spacing: 0.5px; }
          .logo-sub { font-size: 9.5px; color: #475569; font-weight: 700; text-transform: uppercase; }
          .title-box { width: 50%; text-align: center; }
          .title-main { font-size: 14px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-top: 3px; }
          .meta-box { width: 25%; font-size: 10.5px; background-color: #f8fafc; line-height: 1.4; }
          .doc-title { text-align: center; margin-bottom: 14px; }
          .doc-title h2 { margin: 0; font-size: 16px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
          .doc-title p { margin: 4px 0 0; font-size: 12px; color: #475569; font-style: italic; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px; }
          table.data-table th, table.data-table td { border: 1px solid #0f172a; padding: 6px 8px; text-align: left; vertical-align: middle; }
          table.data-table th { background-color: #f1f5f9; font-weight: bold; text-align: center; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px; background-color: #f8fafc; }
          .info-table td { border: 1px solid #cbd5e1; padding: 6px 10px; }
          .sig-box { display: flex; justify-content: space-between; margin-top: 24px; page-break-inside: avoid; }
          .sig-col { width: 48%; text-align: center; font-size: 12px; line-height: 1.35; }
          .footer-note { margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 6px; font-size: 9.5px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="logo-box">
              <img src="${origin}/logo.png" style="height: 48px; width: auto; object-contain; margin-bottom: 2px;" /><br/>
              <span class="logo-title">WCERT FSMS</span><br/>
              <span class="logo-sub">Human Resource & Training</span>
            </td>
            <td class="title-box">
              <div style="font-size: 11px; font-weight: bold; color: #334155;">CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT</div>
              <div class="title-main">BIÊN BẢN ĐÁNH GIÁ ĐÀO TẠO NĂNG LỰC</div>
              <div style="font-size: 11px; font-style: italic; color: #475569; margin-top: 2px;">Tiêu chuẩn ISO 22000:2018 (Điều khoản 7.2 & 7.3)</div>
            </td>
            <td class="meta-box">
              <b>Mã Biểu Mẫu:</b> BM-TRAIN-02<br/>
              <b>Mã Khóa:</b> <span style="font-weight: bold; color: #7e22ce;">${course.course_code}</span><br/>
              <b>Ngày tổ chức:</b> ${course.schedule_date}<br/>
              <b>Thời lượng:</b> ${course.duration_hours} Giờ
            </td>
          </tr>
        </table>

        <div class="doc-title">
          <h2>BIÊN BẢN TỔNG KẾT & ĐÁNH GIÁ KẾT QUẢ ĐÀO TẠO NĂNG LỰC</h2>
          <p>${course.title}</p>
        </div>

        <table class="info-table">
          <tr>
            <td style="width: 50%;"><b>Giảng viên / Đơn vị đào tạo:</b> ${course.trainer_name}</td>
            <td style="width: 50%;"><b>Hình thức đào tạo:</b> ${course.training_type === "INTERNAL" ? "Đào tạo nội bộ" : "Chuyên gia bên ngoài"}</td>
          </tr>
          <tr>
            <td><b>Đối tượng tham gia:</b> ${course.target_dept}</td>
            <td><b>Tổng số học viên:</b> ${list.length} Người</td>
          </tr>
          <tr>
            <td colspan="2"><b>Nội dung tóm tắt:</b> ${course.content_summary || "Đào tạo lý thuyết kết hợp thực hành và sát hạch trắc nghiệm cuối khóa."}</td>
          </tr>
        </table>

        <div style="font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 6px; color: #0f172a;">
          DANH SÁCH HỌC VIÊN & KẾT QUẢ SÁT HẠCH NĂNG LỰC:
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35px;">STT</th>
              <th style="width: 75px;">Mã NV</th>
              <th>Họ và tên học viên</th>
              <th style="width: 140px;">Bộ phận</th>
              <th style="width: 65px;">Pre-Test</th>
              <th style="width: 65px;">Post-Test</th>
              <th style="width: 80px;">Kết quả</th>
              <th style="width: 80px;">Chứng chỉ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="sig-box">
          <div class="sig-col">
             <b>GIẢNG VIÊN / NGƯỜI ĐÀO TẠO</b><br/>
             <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
             <b>${course.trainer_name}</b><br/>
             <span style="font-size: 10px; color: #64748b;">Xác nhận kết quả sát hạch</span>
          </div>
          <div class="sig-col">
             <b>TRƯỞNG PHÒNG NHÂN SỰ & QA</b><br/>
             <i>(Ký duyệt lưu hồ sơ)</i><br/><br/><br/><br/>
             <b>Phòng Nhân Sự & QA Lead</b><br/>
             <span style="font-size: 10px; color: #64748b;">Phê duyệt cấp chứng chỉ</span>
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

  const triggerPrintHealthLog = (logs: HealthDeclaration[]) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const rowsHtml = logs.length === 0
      ? `<tr><td colspan="9" style="text-align: center; padding: 14px; color: #475569; font-style: italic;">Chưa có bản ghi khai báo sức khỏe nào.</td></tr>`
      : logs.map((h, idx) => `
        <tr>
          <td style="text-align: center; font-family: monospace;">${idx + 1}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold;">${h.employee_code}</td>
          <td style="font-weight: bold;">${h.employee_name}</td>
          <td>${h.department}</td>
          <td style="text-align: center;">${h.shift_name}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold; ${h.body_temperature >= 37.8 ? 'color: #b91c1c;' : ''}">${h.body_temperature}°C</td>
          <td style="font-size: 11px;">
            ${h.symptoms?.fever ? '<span style="color: #b91c1c; font-weight: bold;">Sốt. </span>' : ''}
            ${h.symptoms?.cough ? '<span style="color: #b45309;">Ho. </span>' : ''}
            ${h.symptoms?.open_wound ? '<span style="color: #b91c1c; font-weight: bold;">Vết thương hở. </span>' : ''}
            ${h.symptoms?.diarrhea ? '<span style="color: #b91c1c; font-weight: bold;">Tiêu chảy. </span>' : ''}
            ${!h.symptoms?.fever && !h.symptoms?.cough && !h.symptoms?.open_wound && !h.symptoms?.diarrhea ? '<span style="color: #047857;">Bình thường</span>' : ''}
          </td>
          <td style="text-align: center; font-weight: bold; font-size: 11px;">
            ${h.cleared_for_shift === "CLEARED" ? '<span style="color: #047857; background: #d1fae5; padding: 2px 6px; border-radius: 4px;">ĐỦ ĐIỀU KIỆN</span>' :
              h.cleared_for_shift === "RESTRICTED" ? '<span style="color: #b45309; background: #fef3c7; padding: 2px 6px; border-radius: 4px;">HẠN CHẾ</span>' :
              '<span style="color: #b91c1c; background: #fee2e2; padding: 2px 6px; border-radius: 4px;">ĐÌNH CHỈ CA</span>'}
          </td>
          <td>${h.supervisor_name}</td>
        </tr>
      `).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BM-HEALTH-03 - Sổ Nhật Ký Khai Báo Sức Khỏe Ca</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { font-family: 'Times New Roman', Times, serif; padding: 8px; color: #111; line-height: 1.45; font-size: 13px; background: #fff; }
          .header-table { width: 100%; border: 2px solid #0f172a; border-collapse: collapse; margin-bottom: 14px; }
          .header-table td { border: 1px solid #0f172a; padding: 8px 10px; vertical-align: middle; }
          .logo-box { width: 25%; text-align: center; background-color: #f8fafc; }
          .logo-title { font-size: 13px; font-weight: 900; color: #059669; letter-spacing: 0.5px; }
          .logo-sub { font-size: 9.5px; color: #475569; font-weight: 700; text-transform: uppercase; }
          .title-box { width: 50%; text-align: center; }
          .title-main { font-size: 14px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-top: 3px; }
          .meta-box { width: 25%; font-size: 10.5px; background-color: #f8fafc; line-height: 1.4; }
          .doc-title { text-align: center; margin-bottom: 14px; }
          .doc-title h2 { margin: 0; font-size: 16px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
          .doc-title p { margin: 4px 0 0; font-size: 12px; color: #475569; font-style: italic; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11.5px; }
          table.data-table th, table.data-table td { border: 1px solid #0f172a; padding: 6px 8px; text-align: left; vertical-align: middle; }
          table.data-table th { background-color: #f1f5f9; font-weight: bold; text-align: center; }
          .sig-box { display: flex; justify-content: space-between; margin-top: 24px; page-break-inside: avoid; }
          .sig-col { width: 48%; text-align: center; font-size: 12px; line-height: 1.35; }
          .footer-note { margin-top: 24px; border-top: 1px dashed #cbd5e1; padding-top: 6px; font-size: 9.5px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="logo-box">
              <img src="${origin}/logo.png" style="height: 48px; width: auto; object-contain; margin-bottom: 2px;" /><br/>
              <span class="logo-title">WCERT FSMS</span><br/>
              <span class="logo-sub">Hygiene & Health Log</span>
            </td>
            <td class="title-box">
              <div style="font-size: 11px; font-weight: bold; color: #334155;">CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT</div>
              <div class="title-main">SỔ NHẬT KÝ SỨC KHỎE CÔNG NHÂN TRƯỚC CA</div>
              <div style="font-size: 11px; font-style: italic; color: #475569; margin-top: 2px;">Tiêu chuẩn ISO 22000:2018 Điều khoản 8.2 (PRP)</div>
            </td>
            <td class="meta-box">
              <b>Mã Biểu Mẫu:</b> BM-HEALTH-03<br/>
              <b>Ngày In:</b> ${new Date().toLocaleDateString("vi-VN")}<br/>
              <b>Tổng bản ghi:</b> ${logs.length} Ca
            </td>
          </tr>
        </table>

        <div class="doc-title">
          <h2>SỔ NHẬT KÝ KIỂM TRA SỨC KHỎE & VỆ SINH CÔNG NHÂN TRƯỚC CA</h2>
          <p>Kiểm soát phòng ngừa lây nhiễm chéo vi sinh vật vào thực phẩm</p>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 30px;">STT</th>
              <th style="width: 65px;">Mã NV</th>
              <th>Họ và tên</th>
              <th style="width: 110px;">Phòng ban</th>
              <th style="width: 60px;">Ca</th>
              <th style="width: 65px;">Thân nhiệt</th>
              <th>Triệu chứng lâm sàng</th>
              <th style="width: 90px;">Kết luận</th>
              <th style="width: 100px;">Người kiểm tra</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="sig-box">
          <div class="sig-col">
             <b>CÁN BỘ Y TẾ / GIÁM SÁT CA</b><br/>
             <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
             <b>Cán Bộ Y Tế Phân Xưởng</b><br/>
             <span style="font-size: 10px; color: #64748b;">Xác nhận đo thân nhiệt & khám lâm sàng</span>
          </div>
          <div class="sig-col">
             <b>TRƯỞNG BAN AN TOÀN THỰC PHẨM</b><br/>
             <i>(Ký duyệt xác nhận)</i><br/><br/><br/><br/>
             <b>Trưởng Ban FSMS</b><br/>
             <span style="font-size: 10px; color: #64748b;">Kiểm soát tuân thủ PRP</span>
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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* ==================== PAGE HEADER ==================== */}
      <PageHeader
        title="Đánh Giá Nội Bộ, Đào Tạo & Khai Báo Sức Khỏe"
        description="Số hóa toàn diện Chương trình Đánh giá nội bộ ISO 22000 (Điều 9.2), Ma trận đào tạo sát hạch nhân sự (Điều 7.2) và Sổ khai báo sức khỏe ca (Điều 8.2 PRP)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleSeedDefaults}
              variant="outline"
              size="sm"
              className="border-primary/30 text-primary hover:bg-primary/10 font-bold text-xs"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" /> Nạp Dữ Liệu Mẫu
            </Button>
            <Button
              onClick={handleOpenWorkflow}
              variant="outline"
              size="sm"
              className="border-indigo-300 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 font-bold text-xs"
            >
              <GitFork className="h-4 w-4 mr-1.5" /> Lưu Đồ ĐGNB (Workflow)
            </Button>
            {activeTab === "audits" && (
              <Button
                onClick={() => {
                  setEditingAudit(null);
                  setAuditForm({
                    audit_code: `IA-2026-0${audits.length + 1}`,
                    title: "Đợt đánh giá nội bộ định kỳ",
                    audit_type: "PERIODIC",
                    start_date: new Date().toISOString().split("T")[0],
                    end_date: new Date().toISOString().split("T")[0],
                    lead_auditor_name: "ThS. Nguyễn Văn An",
                    audited_dept: "Phòng Sản Xuất",
                    audited_lead_name: "Quản Đốc Xưởng",
                    scope: "Toàn bộ chu trình sản xuất từ tiếp nhận đến thành phẩm.",
                    findings_summary: "",
                    conclusion: "",
                    status: "PLANNED",
                  });
                  setShowAuditModal(true);
                }}
                size="sm"
                className="bg-primary text-primary-foreground font-bold text-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Lập Kế Hoạch ĐGNB Mới
              </Button>
            )}
            {activeTab === "training" && (
              <Button
                onClick={() => {
                  setCourseForm({
                    course_code: `TR-2026-0${courses.length + 1}`,
                    title: "Khóa đào tạo an toàn thực phẩm mới",
                    category: "HACCP_CCP",
                    trainer_name: "ThS. Nguyễn Văn An",
                    training_type: "INTERNAL",
                    schedule_date: new Date().toISOString().split("T")[0],
                    duration_hours: 4.0,
                    target_dept: "Phòng Sản Xuất & QA",
                    content_summary: "",
                    status: "PLANNED",
                  });
                  setShowCourseModal(true);
                }}
                size="sm"
                className="bg-primary text-primary-foreground font-bold text-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Thêm Khóa Đào Tạo
              </Button>
            )}
            {activeTab === "health" && (
              <Button
                onClick={() => setShowHealthModal(true)}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Khai Báo Sức Khỏe Ca
              </Button>
            )}
          </div>
        }
      />

      <AIBadge>
        <b>Trí Tuệ Nhân Tạo WCERT:</b> Tự động sinh Checklist câu hỏi ĐGNB theo điều khoản ISO 22000 · Thẩm định mức độ lỗi phát hiện (Major/Minor NC) · Sinh đề thi trắc nghiệm sát hạch nhân sự kèm đáp án · Quét phân tích rủi ro dịch tễ từ sổ sức khỏe ca.
      </AIBadge>

      {/* ==================== 4 KPI CARDS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-card rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Đánh Giá Nội Bộ (9.2)</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-200">
              <ClipboardCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats.total_audits}</span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {stats.completed_audits} Hoàn thành
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{stats.in_progress_audits} Đang đánh giá · {stats.planned_audits} Đã lên lịch</span>
          </p>
        </div>

        {/* KPI 2 */}
        <div className="bg-card rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tỷ Lệ Tuân Thủ ĐGNB</span>
            <div className={`p-2.5 rounded-xl border ${stats.conformity_rate >= 80 ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-amber-500/10 text-amber-600 border-amber-200"}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${stats.conformity_rate >= 80 ? "text-emerald-700" : "text-amber-700"}`}>
              {stats.conformity_rate}%
            </span>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              {stats.total_findings} Phát hiện
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="text-rose-600 font-bold">{stats.major_nc_count} Major NC</span> · 
            <span className="text-amber-600 font-bold">{stats.minor_nc_count} Minor NC</span> · 
            <span className="text-blue-600 font-bold">{stats.ofi_count} OFI</span>
          </p>
        </div>

        {/* KPI 3 */}
        <div className="bg-card rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Đào Tạo & Năng Lực (Điều 7.2)</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-200">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-700">{stats.passed_rate}%</span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
              {stats.total_learners} Lượt học viên
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>{stats.total_courses} Khóa đào tạo · {stats.completed_courses} Đã cấp chứng chỉ</span>
          </p>
        </div>

        {/* KPI 4 */}
        <div className="bg-card rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sức Khỏe Trước Ca (Điều 8.2)</span>
            <div className={`p-2.5 rounded-xl border ${stats.today_suspended_count > 0 ? "bg-rose-500/10 text-rose-600 border-rose-200" : "bg-emerald-500/10 text-emerald-600 border-emerald-200"}`}>
              <HeartPulse className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats.total_health_declarations}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${stats.today_suspended_count > 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
              {stats.today_suspended_count > 0 ? `${stats.today_suspended_count} Ca đình chỉ` : "100% Đạt chuẩn"}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{stats.today_cleared_count} Đủ điều kiện vào xưởng hôm nay</span>
          </p>
        </div>
      </div>

      {/* ==================== 4 TABS NAVIGATION ==================== */}
      <div className="border-b overflow-x-auto no-scrollbar">
        <div className="flex space-x-1 sm:space-x-4 min-w-max pb-1">
          <button
            onClick={() => setActiveTab("audits")}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "audits"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            1. Đánh Giá Nội Bộ ISO 22000 ({audits.length})
          </button>
          <button
            onClick={() => setActiveTab("training")}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "training"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="h-4 w-4 shrink-0" />
            2. Đào Tạo & Năng Lực ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab("health")}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "health"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <HeartPulse className="h-4 w-4 shrink-0" />
            3. Sổ Khai Báo Sức Khỏe Ca ({healthLogs.length})
          </button>
          <button
            onClick={() => setActiveTab("ai_studio")}
            className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "ai_studio"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
            4. Cố Vấn Trí Tuệ Nhân Tạo ATTP
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: INTERNAL AUDITS ==================== */}
      {activeTab === "audits" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã đợt, tên, phòng ban..."
                className="pl-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                className="border rounded-xl px-3 py-2 text-xs bg-background text-foreground font-semibold"
                value={auditTypeFilter}
                onChange={(e) => setAuditTypeFilter(e.target.value)}
              >
                <option value="ALL">Tất cả loại hình đánh giá</option>
                <option value="PERIODIC">Đánh giá định kỳ</option>
                <option value="UNANNOUNCED">Đánh giá đột xuất</option>
                <option value="PRE_CERTIFICATION">Tiền chứng nhận</option>
                <option value="FOLLOW_UP">Tái kiểm tra khắc phục</option>
              </select>

              <select
                className="border rounded-xl px-3 py-2 text-xs bg-background text-foreground font-semibold"
                value={auditStatusFilter}
                onChange={(e) => setAuditStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PLANNED">Lên kế hoạch</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
                <option value="REPORTING">Đang lập báo cáo</option>
                <option value="COMPLETED">Đã hoàn thành</option>
              </select>
            </div>
          </div>

          {/* 2-Column Layout: Audit Campaigns List (Left) & Findings Checklist (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Campaigns List */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-blue-600" />
                  Danh Sách Đợt Đánh Giá Nội Bộ ({filteredAudits.length})
                </h3>
              </div>

              {filteredAudits.map((a) => {
                const isSelected = selectedAudit?.audit_id === a.audit_id;
                return (
                  <div
                    key={a.audit_id}
                    onClick={() => {
                      setSelectedAudit(a);
                      loadFindings(a.audit_id);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-400 shadow-md ring-2 ring-blue-300/50"
                        : "bg-card hover:bg-slate-50 border-slate-200 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                            {a.audit_code}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            a.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : a.status === "IN_PROGRESS"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {a.status === "COMPLETED" ? "Đã Hoàn Thành" : a.status === "IN_PROGRESS" ? "Đang Đánh Giá" : a.status === "REPORTING" ? "Lập Báo Cáo" : "Lên Kế Hoạch"}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">{a.title}</h4>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Phòng ban:</span>
                        <span className="font-semibold text-slate-800">{a.audited_dept}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Trưởng đoàn:</span>
                        <span className="font-semibold text-slate-800">{a.lead_auditor_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Thời gian:</span>
                        <span className="font-mono text-slate-700">{a.start_date} ~ {a.end_date}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Phát hiện:</span>
                        <span className="font-bold text-slate-900">{a.total_findings || 0} Hạng mục</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Findings Checklist Details */}
            <div className="lg:col-span-7 space-y-4">
              {selectedAudit ? (
                <div className="bg-card rounded-2xl border p-5 shadow-sm space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {selectedAudit.audit_code}
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          Phòng ban: {selectedAudit.audited_dept}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900">{selectedAudit.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPrintAuditModal(true)}
                        className="text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        <Printer className="h-4 w-4 mr-1.5 text-slate-600" /> In BM-AUDIT-01
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setFindingForm({
                            clause_number: "8.2.4",
                            clause_title: "Kiểm soát vệ sinh PRP & Nhà xưởng",
                            department: selectedAudit.audited_dept,
                            question: "Tình trạng vệ sinh thiết bị và mặt sàn có đạt yêu cầu không?",
                            evidence_reviewed: "",
                            result: "CONFORMITY",
                            finding_notes: "",
                          });
                          setShowFindingModal(true);
                        }}
                        className="bg-primary text-primary-foreground font-bold text-xs"
                      >
                        <Plus className="h-4 w-4 mr-1.5" /> Ghi Nhận Phát Hiện
                      </Button>
                    </div>
                  </div>

                  {/* Findings Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <ListOrdered className="w-4 h-4 text-blue-600" /> Bảng Kiểm Checklist & Kết Quả Đánh Giá Hiện Trường ({findings.length})
                      </h4>
                    </div>

                    {findings.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed text-slate-500 space-y-2">
                        <AlertCircle className="w-8 h-8 mx-auto text-slate-400" />
                        <p className="text-xs font-semibold">Chưa có câu hỏi hoặc phát hiện nào cho đợt đánh giá này.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowFindingModal(true)}
                          className="text-xs"
                        >
                          + Thêm câu hỏi checklist đầu tiên
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {findings.map((f, idx) => (
                          <div
                            key={f.finding_id}
                            className={`p-4 rounded-xl border transition-all ${
                              f.result === "MAJOR_NC"
                                ? "bg-rose-50/70 border-rose-300"
                                : f.result === "MINOR_NC"
                                ? "bg-amber-50/70 border-amber-300"
                                : f.result === "OFI"
                                ? "bg-blue-50/70 border-blue-300"
                                : "bg-white border-slate-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                    Điều {f.clause_number}
                                  </span>
                                  <span className="text-xs font-bold text-slate-700">{f.clause_title}</span>
                                </div>
                                <p className="text-xs font-semibold text-slate-900 leading-relaxed mt-1">
                                  <b>Câu hỏi:</b> {f.question}
                                </p>
                                {f.evidence_reviewed && (
                                  <p className="text-[11px] text-slate-600">
                                    <b>Bằng chứng xem xét:</b> {f.evidence_reviewed}
                                  </p>
                                )}
                                {f.finding_notes && (
                                  <div className="mt-2 p-2.5 rounded-lg bg-white/90 border text-xs font-medium text-slate-800">
                                    <b>Ghi nhận sai lệch:</b> {f.finding_notes}
                                  </div>
                                )}
                              </div>

                              {/* Badges & Actions */}
                              <div className="text-right shrink-0 space-y-2">
                                <span className={`inline-block text-[11px] font-black px-2.5 py-1 rounded-full border ${
                                  f.result === "MAJOR_NC"
                                    ? "bg-rose-100 text-rose-800 border-rose-300"
                                    : f.result === "MINOR_NC"
                                    ? "bg-amber-100 text-amber-800 border-amber-300"
                                    : f.result === "OFI"
                                    ? "bg-blue-100 text-blue-800 border-blue-300"
                                    : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                }`}>
                                  {f.result === "MAJOR_NC" ? "MAJOR NC (NẶNG)" : f.result === "MINOR_NC" ? "MINOR NC (NHẸ)" : f.result === "OFI" ? "CƠ HỘI CẢI TIẾN" : "PHÙ HỢP (PASS)"}
                                </span>

                                {(f.result === "MAJOR_NC" || f.result === "MINOR_NC") && (
                                  <div>
                                    {f.nc_number ? (
                                      <div className="text-[11px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                        Đã tạo: {f.nc_number}
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() => handleConvertToNC(f.finding_id)}
                                        className="text-[11px] bg-rose-600 hover:bg-rose-700 text-white font-bold h-7 px-2.5 rounded-lg shadow-sm"
                                      >
                                        <Flame className="w-3 h-3 mr-1" /> Chuyển Sang CAPA
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-card rounded-2xl border p-12 text-center text-slate-500">
                  Vui lòng chọn một đợt đánh giá ở cột bên trái để xem chi tiết.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: TRAINING & COMPETENCE ==================== */}
      {activeTab === "training" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã khóa, tên khóa học..."
                className="pl-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                className="border rounded-xl px-3 py-2 text-xs bg-background text-foreground font-semibold"
                value={courseCatFilter}
                onChange={(e) => setCourseCatFilter(e.target.value)}
              >
                <option value="ALL">Tất cả chuyên đề đào tạo</option>
                <option value="HACCP_CCP">HACCP & Giám sát CCP</option>
                <option value="FOOD_HYGIENE_GMP">Vệ sinh cá nhân GMP/SSOP</option>
                <option value="ALLERGEN_CONTROL">Kiểm soát Dị nguyên</option>
                <option value="EMERGENCY_RECALL">Triệu hồi khẩn cấp</option>
                <option value="ISO_AWARENESS">Nhận thức ISO 22000</option>
              </select>
            </div>
          </div>

          {/* 2-Column Layout: Course Cards (Left) & Participants Table (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Courses List */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                Khóa Đào Tạo Hàng Năm ({filteredCourses.length})
              </h3>

              {filteredCourses.map((c) => {
                const isSelected = selectedCourse?.course_id === c.course_id;
                return (
                  <div
                    key={c.course_id}
                    onClick={() => {
                      setSelectedCourse(c);
                      loadParticipants(c.course_id);
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-purple-50/70 border-purple-400 shadow-md ring-2 ring-purple-300/50"
                        : "bg-card hover:bg-slate-50 border-slate-200 shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                            {c.course_code}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {c.training_type === "INTERNAL" ? "Đào tạo nội bộ" : "Chuyên gia bên ngoài"}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">{c.title}</h4>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Giảng viên:</span>
                        <span className="font-semibold text-slate-800">{c.trainer_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Ngày học:</span>
                        <span className="font-mono text-slate-800">{c.schedule_date} ({c.duration_hours}h)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Học viên:</span>
                        <span className="font-bold text-purple-700">{c.total_participants || 0} Người</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Điểm trung bình:</span>
                        <span className="font-bold text-emerald-700">{c.avg_score || 0}/100</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Participants List & Roster */}
            <div className="lg:col-span-7 space-y-4">
              {selectedCourse ? (
                <div className="bg-card rounded-2xl border p-5 shadow-sm space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                          {selectedCourse.course_code}
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          Đối tượng: {selectedCourse.target_dept}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900">{selectedCourse.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPrintTrainModal(true)}
                        className="text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        <Printer className="h-4 w-4 mr-1.5 text-slate-600" /> In BM-TRAIN-02
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setParticipantForm({
                            employee_code: `NV-0${participants.length + 101}`,
                            employee_name: "",
                            department: "Xưởng Sản Xuất",
                            position: "Công nhân",
                            attendance_status: "ATTENDED",
                            pre_test_score: 50.0,
                            post_test_score: 85.0,
                            evaluation_result: "PASSED",
                            certificate_issued: true,
                            notes: "",
                          });
                          setShowParticipantModal(true);
                        }}
                        className="bg-primary text-primary-foreground font-bold text-xs"
                      >
                        <Plus className="h-4 w-4 mr-1.5" /> Thêm Học Viên
                      </Button>
                    </div>
                  </div>

                  {/* Participants Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse min-w-[650px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 border-b font-bold uppercase text-[10px] tracking-wider">
                          <th className="p-3 w-12 text-center">STT</th>
                          <th className="p-3">Học viên</th>
                          <th className="p-3">Phòng ban</th>
                          <th className="p-3 text-center">Pre-Test</th>
                          <th className="p-3 text-center">Post-Test</th>
                          <th className="p-3 text-center">Kết quả</th>
                          <th className="p-3 text-center">Chứng chỉ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {participants.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400">
                              Chưa có danh sách học viên cho khóa này.
                            </td>
                          </tr>
                        ) : (
                          participants.map((p, idx) => (
                            <tr key={p.participant_id} className="hover:bg-slate-50/80">
                              <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{p.employee_name}</div>
                                <div className="text-[10px] font-mono text-slate-500">{p.employee_code} · {p.position}</div>
                              </td>
                              <td className="p-3 text-slate-700 font-medium">{p.department}</td>
                              <td className="p-3 text-center font-mono font-semibold text-slate-600">
                                {p.pre_test_score !== null ? `${p.pre_test_score}đ` : "--"}
                              </td>
                              <td className="p-3 text-center font-mono font-black text-purple-700 text-sm">
                                {p.post_test_score !== null ? `${p.post_test_score}đ` : "--"}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  p.evaluation_result === "PASSED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}>
                                  {p.evaluation_result === "PASSED" ? "ĐẠT CHUẨN" : "CẦN ĐÀO TẠO LẠI"}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {p.certificate_issued ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    <Award className="w-3 h-3 text-emerald-600" /> Đã Cấp
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Chưa cấp</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-card rounded-2xl border p-12 text-center text-slate-500">
                  Vui lòng chọn một khóa học ở cột bên trái để xem danh sách học viên.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: DAILY HEALTH DECLARATION ==================== */}
      {activeTab === "health" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã NV, tên, phòng ban..."
                className="pl-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                className="border rounded-xl px-3 py-2 text-xs bg-background text-foreground font-semibold"
                value={healthStatusFilter}
                onChange={(e) => setHealthStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả tình trạng sức khỏe</option>
                <option value="CLEARED">Đủ điều kiện vào xưởng (Cleared)</option>
                <option value="RESTRICTED">Hạn chế vị trí (Restricted)</option>
                <option value="SUSPENDED">Đình chỉ ca (Suspended)</option>
              </select>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPrintHealthModal(true)}
                className="text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <Printer className="h-4 w-4 mr-1.5 text-slate-600" /> In BM-HEALTH-03
              </Button>
            </div>
          </div>

          {/* Health Declarations Table */}
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3 w-12 text-center">STT</th>
                    <th className="p-3">Nhân sự</th>
                    <th className="p-3">Phòng ban</th>
                    <th className="p-3">Ca / Ngày</th>
                    <th className="p-3 text-center">Thân nhiệt</th>
                    <th className="p-3">Triệu chứng lây nhiễm</th>
                    <th className="p-3">Vệ sinh cá nhân</th>
                    <th className="p-3 text-center">Kết luận ca</th>
                    <th className="p-3">Người giám sát / Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHealth.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Chưa có bản ghi khai báo sức khỏe nào.
                      </td>
                    </tr>
                  ) : (
                    filteredHealth.map((h, idx) => {
                      const hasSymptom = h.symptoms && Object.values(h.symptoms).some(Boolean);
                      return (
                        <tr key={h.declaration_id} className={`hover:bg-slate-50/80 ${h.cleared_for_shift === "SUSPENDED" ? "bg-rose-50/40" : ""}`}>
                          <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{h.employee_name}</div>
                            <div className="text-[10px] font-mono text-slate-500">{h.employee_code}</div>
                          </td>
                          <td className="p-3 text-slate-700 font-medium">{h.department}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{h.shift_name}</div>
                            <div className="text-[10px] font-mono text-slate-500">{h.shift_date}</div>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              h.body_temperature >= 37.8
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : "bg-slate-100 text-slate-800"
                            }`}>
                              <Thermometer className="w-3 h-3 text-slate-500" />
                              {h.body_temperature}°C
                            </span>
                          </td>
                          <td className="p-3">
                            {hasSymptom ? (
                              <div className="space-y-0.5">
                                {h.symptoms.fever && <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded mr-1">Sốt</span>}
                                {h.symptoms.cough && <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mr-1">Ho</span>}
                                {h.symptoms.open_wound && <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded mr-1">Vết thương hở</span>}
                                {h.symptoms.diarrhea && <span className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded mr-1">Tiêu chảy</span>}
                              </div>
                            ) : (
                              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600" /> Không có triệu chứng
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-[11px] text-slate-600">
                            {h.personal_hygiene_check?.clean_uniform ? "BHLĐ Đạt · Móng ngắn" : "Cần chỉnh trang"}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full border ${
                              h.cleared_for_shift === "CLEARED"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : h.cleared_for_shift === "RESTRICTED"
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-rose-100 text-rose-800 border-rose-300"
                            }`}>
                              {h.cleared_for_shift === "CLEARED" ? "ĐỦ ĐIỀU KIỆN" : h.cleared_for_shift === "RESTRICTED" ? "HẠN CHẾ VỊ TRÍ" : "ĐÌNH CHỈ VÀO XƯỞNG"}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-700">
                            <div className="font-semibold">{h.supervisor_name}</div>
                            {h.notes && <div className="text-slate-500 text-[10px] italic">{h.notes}</div>}
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

      {/* ==================== TAB 4: AI AUDIT & TRAINING STUDIO ==================== */}
      {activeTab === "ai_studio" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Tool 1: Checklist Generator */}
            <div className="bg-card rounded-2xl border p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Sinh Checklist ĐGNB Theo Điều Khoản</h3>
                  <p className="text-xs text-muted-foreground">Tự động gợi ý bộ câu hỏi và bằng chứng cần kiểm tra theo ISO 22000.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Nhập điều khoản ISO hoặc phòng ban</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="VD: 8.5 HACCP, 8.2 PRP, Kho nguyên liệu, QC..."
                    className="text-xs"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                  />
                  <Button
                    onClick={handleGenerateChecklist}
                    disabled={aiLoading}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Sinh Câu Hỏi
                  </Button>
                </div>
              </div>

              {aiChecklistResult && (
                <div className="space-y-2.5 pt-2 border-t">
                  <h4 className="text-xs font-bold text-blue-800">Danh mục câu hỏi gợi ý ({aiChecklistResult.suggested_questions?.length}):</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {aiChecklistResult.suggested_questions?.map((q: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>Điều {q.clause} - {q.title}</span>
                          <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{q.dept}</span>
                        </div>
                        <p className="text-slate-800"><b>Hỏi:</b> {q.question}</p>
                        <p className="text-slate-500 text-[11px]"><b>Bằng chứng:</b> {q.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Tool 2: Finding Classifier */}
            <div className="bg-card rounded-2xl border p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Thẩm Định & Phân Loại Lỗi Phát Hiện</h3>
                  <p className="text-xs text-muted-foreground">Phân tích mức độ nặng/nhẹ (Major/Minor NC/OFI) từ mô tả hiện trường.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Nhập mô tả phát hiện thực tế</Label>
                <Textarea
                  placeholder="VD: Phát hiện bao bì bột mì bị rách đặt sát nền nhà, có dấu vết ẩm mốc..."
                  className="text-xs h-20"
                  value={aiFindingText}
                  onChange={(e) => setAiFindingText(e.target.value)}
                />
                <Button
                  onClick={handleEvaluateFinding}
                  disabled={aiLoading}
                  size="sm"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Thẩm Định Mức Độ Lỗi
                </Button>
              </div>

              {aiEvalResult && (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Phân loại đề xuất:</span>
                    <span className="font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                      {aiEvalResult.suggested_classification}
                    </span>
                  </div>
                  <p><b>Điều khoản vi phạm:</b> {aiEvalResult.suggested_clause}</p>
                  <p><b>Lý do mức độ:</b> {aiEvalResult.severity_reason}</p>
                  <p className="text-rose-700 font-bold"><b>Hành động khắc phục:</b> {aiEvalResult.recommended_action}</p>
                </div>
              )}
            </div>

            {/* AI Tool 3: Quiz Generator */}
            <div className="bg-card rounded-2xl border p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Sinh Đề Thi Trắc Nghiệm Sát Hạch</h3>
                  <p className="text-xs text-muted-foreground">Tự động sinh 5 câu hỏi trắc nghiệm kèm đáp án giải thích theo chuyên đề.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Chuyên đề thi sát hạch</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="VD: 7 Nguyên tắc HACCP, SSOP Vệ sinh, Dị nguyên..."
                    className="text-xs"
                    value={aiQuizTopic}
                    onChange={(e) => setAiQuizTopic(e.target.value)}
                  />
                  <Button
                    onClick={handleGenerateQuiz}
                    disabled={aiLoading}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs shrink-0 font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Tạo Đề Thi
                  </Button>
                </div>
              </div>

              {aiQuizResult && (
                <div className="space-y-2.5 pt-2 border-t">
                  <h4 className="text-xs font-bold text-purple-800">Bộ đề thi trắc nghiệm mẫu ({aiQuizResult.questions?.length} câu):</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {aiQuizResult.questions?.map((q: any) => (
                      <div key={q.id} className="p-2.5 rounded-xl bg-slate-50 border text-xs space-y-1">
                        <div className="font-bold text-slate-900">Câu {q.id}: {q.question}</div>
                        <div className="space-y-0.5 text-slate-700 pl-2">
                          {q.options.map((opt: string, i: number) => (
                            <div key={i} className={opt.startsWith(q.correct_option) ? "text-emerald-700 font-bold" : ""}>
                              {opt}
                            </div>
                          ))}
                        </div>
                        <div className="text-[10px] text-slate-500 italic pt-1">
                          Giải thích: {q.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Tool 4: Health Risk Scanner */}
            <div className="bg-card rounded-2xl border p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Quét Phân Tích Rủi Ro Sức Khỏe Ca</h3>
                  <p className="text-xs text-muted-foreground">Tự động phát hiện nguy cơ lây nhiễm vi sinh từ sổ khai báo sức khỏe.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleScanHealthRisk}
                  disabled={aiLoading}
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Quét Toàn Bộ Nhật Ký Sức Khỏe Ca
                </Button>
              </div>

              {aiHealthRiskResult && (
                <div className="p-3 rounded-xl bg-slate-50 border text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Mức độ rủi ro dịch tễ:</span>
                    <span className={`font-black px-2 py-0.5 rounded ${
                      aiHealthRiskResult.risk_level === "HIGH"
                        ? "bg-rose-100 text-rose-800"
                        : aiHealthRiskResult.risk_level === "MEDIUM"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {aiHealthRiskResult.risk_level === "HIGH" ? "NGUY CƠ CAO (CÁCH LY)" : aiHealthRiskResult.risk_level === "MEDIUM" ? "CẢNH BÁO VỪA" : "AN TOÀN"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border">
                    <div>Số ca sốt: <b className="text-rose-700">{aiHealthRiskResult.fever_count}</b></div>
                    <div>Vết thương hở: <b className="text-rose-700">{aiHealthRiskResult.open_wound_count}</b></div>
                    <div>Ca đình chỉ: <b className="text-rose-700">{aiHealthRiskResult.suspended_count}</b></div>
                    <div>Tổng số đã quét: <b>{aiHealthRiskResult.total_scanned}</b></div>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 block text-[11px]">Khuyến nghị y tế:</span>
                    {aiHealthRiskResult.recommendations?.map((r: string, i: number) => (
                      <div key={i} className="text-rose-700 font-medium text-[11px] flex items-start gap-1">
                        • {r}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD/EDIT AUDIT ==================== */}
      <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lập Kế Hoạch Đánh Giá Nội Bộ ISO 22000 (Điều 9.2)</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (editingAudit) {
                  await api.put(`/audits/audits/${editingAudit.audit_id}`, auditForm);
                  toast.success("Cập nhật đợt đánh giá thành công!");
                } else {
                  await api.post("/audits/audits", auditForm);
                  toast.success("Tạo đợt đánh giá nội bộ mới thành công!");
                }
                setShowAuditModal(false);
                fetchData();
              } catch (err: any) {
                toast.error("Lỗi: " + (err.response?.data?.detail || err.message));
              }
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mã đợt đánh giá *</Label>
                <Input
                  required
                  value={auditForm.audit_code}
                  onChange={(e) => setAuditForm({ ...auditForm, audit_code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Loại hình đánh giá</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background"
                  value={auditForm.audit_type}
                  onChange={(e) => setAuditForm({ ...auditForm, audit_type: e.target.value })}
                >
                  <option value="PERIODIC">Đánh giá định kỳ</option>
                  <option value="UNANNOUNCED">Đánh giá đột xuất</option>
                  <option value="PRE_CERTIFICATION">Tiền chứng nhận</option>
                  <option value="FOLLOW_UP">Tái kiểm tra khắc phục</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tiêu đề đợt đánh giá *</Label>
              <Input
                required
                value={auditForm.title}
                onChange={(e) => setAuditForm({ ...auditForm, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Phòng ban được đánh giá *</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background font-semibold"
                  value={auditForm.audited_dept}
                  onChange={(e) => setAuditForm({ ...auditForm, audited_dept: e.target.value })}
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Trưởng đoàn đánh giá *</Label>
                <Input
                  required
                  value={auditForm.lead_auditor_name}
                  onChange={(e) => setAuditForm({ ...auditForm, lead_auditor_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ngày bắt đầu *</Label>
                <Input
                  type="date"
                  required
                  value={auditForm.start_date}
                  onChange={(e) => setAuditForm({ ...auditForm, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ngày kết thúc *</Label>
                <Input
                  type="date"
                  required
                  value={auditForm.end_date}
                  onChange={(e) => setAuditForm({ ...auditForm, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Phạm vi đánh giá</Label>
              <Textarea
                rows={2}
                value={auditForm.scope}
                onChange={(e) => setAuditForm({ ...auditForm, scope: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAuditModal(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                Lưu Kế Hoạch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: ADD FINDING ==================== */}
      <Dialog open={showFindingModal} onOpenChange={setShowFindingModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ghi Nhận Câu Hỏi & Kết Quả Đánh Giá Hiện Trường</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedAudit) return;
              try {
                await api.post(`/audits/audits/${selectedAudit.audit_id}/findings`, {
                  ...findingForm,
                  audit_id: selectedAudit.audit_id,
                });
                toast.success("Đã lưu phát hiện đánh giá!");
                setShowFindingModal(false);
                loadFindings(selectedAudit.audit_id);
                fetchData();
              } catch (err: any) {
                toast.error("Lỗi: " + (err.response?.data?.detail || err.message));
              }
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Điều khoản ISO *</Label>
                <Input
                  required
                  placeholder="VD: 8.2.4, 8.5.4"
                  value={findingForm.clause_number}
                  onChange={(e) => setFindingForm({ ...findingForm, clause_number: e.target.value })}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Tiêu đề điều khoản *</Label>
                <Input
                  required
                  placeholder="VD: Kiểm soát lây nhiễm chéo dị nguyên"
                  value={findingForm.clause_title}
                  onChange={(e) => setFindingForm({ ...findingForm, clause_title: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nội dung câu hỏi / Chuẩn mực kiểm tra *</Label>
              <Textarea
                required
                rows={2}
                value={findingForm.question}
                onChange={(e) => setFindingForm({ ...findingForm, question: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Bằng chứng xem xét tại chỗ</Label>
              <Input
                placeholder="Hồ sơ, nhật ký, phỏng vấn, quan sát..."
                value={findingForm.evidence_reviewed}
                onChange={(e) => setFindingForm({ ...findingForm, evidence_reviewed: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Kết luận đánh giá *</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-xs bg-background font-bold"
                value={findingForm.result}
                onChange={(e) => setFindingForm({ ...findingForm, result: e.target.value })}
              >
                <option value="CONFORMITY">PHÙ HỢP (CONFORMITY - ĐẠT CHUẨN)</option>
                <option value="MINOR_NC">MINOR NC (SỰ KHÔNG PHÙ HỢP NHẸ)</option>
                <option value="MAJOR_NC">MAJOR NC (SỰ KHÔNG PHÙ HỢP NẶNG)</option>
                <option value="OFI">OFI (CƠ HỘI CẢI TIẾN)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Mô tả sai lệch chi tiết (nếu có)</Label>
              <Textarea
                rows={2}
                placeholder="Ghi rõ vị trí, bằng chứng không phù hợp..."
                value={findingForm.finding_notes}
                onChange={(e) => setFindingForm({ ...findingForm, finding_notes: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFindingModal(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-bold">
                Lưu Phát Hiện
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: ADD COURSE ==================== */}
      <Dialog open={showCourseModal} onOpenChange={setShowCourseModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm Khóa Đào Tạo Nhân Sự Mới (Điều 7.2)</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.post("/audits/training/courses", courseForm);
                toast.success("Tạo khóa đào tạo mới thành công!");
                setShowCourseModal(false);
                fetchData();
              } catch (err: any) {
                toast.error("Lỗi: " + (err.response?.data?.detail || err.message));
              }
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mã khóa học *</Label>
                <Input
                  required
                  value={courseForm.course_code}
                  onChange={(e) => setCourseForm({ ...courseForm, course_code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Chuyên đề đào tạo</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background font-semibold"
                  value={courseForm.category}
                  onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                >
                  <option value="HACCP_CCP">HACCP & Giám sát CCP</option>
                  <option value="FOOD_HYGIENE_GMP">Vệ sinh cá nhân GMP/SSOP</option>
                  <option value="ALLERGEN_CONTROL">Kiểm soát Dị nguyên</option>
                  <option value="EMERGENCY_RECALL">Triệu hồi khẩn cấp</option>
                  <option value="ISO_AWARENESS">Nhận thức ISO 22000</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tên khóa đào tạo *</Label>
              <Input
                required
                value={courseForm.title}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Giảng viên phụ trách *</Label>
                <Input
                  required
                  value={courseForm.trainer_name}
                  onChange={(e) => setCourseForm({ ...courseForm, trainer_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Đối tượng tham gia</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background font-semibold"
                  value={courseForm.target_dept}
                  onChange={(e) => setCourseForm({ ...courseForm, target_dept: e.target.value })}
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ngày tổ chức *</Label>
                <Input
                  type="date"
                  required
                  value={courseForm.schedule_date}
                  onChange={(e) => setCourseForm({ ...courseForm, schedule_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Thời lượng (giờ)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={courseForm.duration_hours}
                  onChange={(e) => setCourseForm({ ...courseForm, duration_hours: parseFloat(e.target.value) || 4.0 })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCourseModal(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-bold">
                Lưu Khóa Học
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: ADD PARTICIPANT ==================== */}
      <Dialog open={showParticipantModal} onOpenChange={setShowParticipantModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm Học Viên & Điểm Số Sát Hạch</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedCourse) return;
              try {
                const passed = participantForm.post_test_score >= 70;
                await api.post(`/audits/training/courses/${selectedCourse.course_id}/participants`, {
                  ...participantForm,
                  course_id: selectedCourse.course_id,
                  evaluation_result: passed ? "PASSED" : "FAILED",
                  certificate_issued: passed,
                });
                toast.success("Thêm học viên thành công!");
                setShowParticipantModal(false);
                loadParticipants(selectedCourse.course_id);
                fetchData();
              } catch (err: any) {
                toast.error("Lỗi: " + (err.response?.data?.detail || err.message));
              }
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mã nhân viên *</Label>
                <Input
                  required
                  value={participantForm.employee_code}
                  onChange={(e) => setParticipantForm({ ...participantForm, employee_code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Họ và tên *</Label>
                <Input
                  required
                  value={participantForm.employee_name}
                  onChange={(e) => setParticipantForm({ ...participantForm, employee_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Phòng ban</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background font-semibold"
                  value={participantForm.department}
                  onChange={(e) => setParticipantForm({ ...participantForm, department: e.target.value })}
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vị trí công việc</Label>
                <Input
                  value={participantForm.position}
                  onChange={(e) => setParticipantForm({ ...participantForm, position: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Điểm Pre-Test (Đầu vào)</Label>
                <Input
                  type="number"
                  step="1"
                  value={participantForm.pre_test_score}
                  onChange={(e) => setParticipantForm({ ...participantForm, pre_test_score: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Điểm Post-Test (Sau khóa) *</Label>
                <Input
                  type="number"
                  step="1"
                  required
                  value={participantForm.post_test_score}
                  onChange={(e) => setParticipantForm({ ...participantForm, post_test_score: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowParticipantModal(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground font-bold">
                Lưu Học Viên
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: ADD HEALTH DECLARATION ==================== */}
      <Dialog open={showHealthModal} onOpenChange={setShowHealthModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Khai Báo Sức Khỏe & Vệ Sinh Cá Nhân Trước Ca (Điều 8.2)</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.post("/audits/health-declarations", healthForm);
                toast.success("Đã ghi nhận bản khai báo sức khỏe ca!");
                setShowHealthModal(false);
                fetchData();
              } catch (err: any) {
                toast.error("Lỗi: " + (err.response?.data?.detail || err.message));
              }
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mã nhân viên *</Label>
                <Input
                  required
                  value={healthForm.employee_code}
                  onChange={(e) => setHealthForm({ ...healthForm, employee_code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Họ và tên *</Label>
                <Input
                  required
                  value={healthForm.employee_name}
                  onChange={(e) => setHealthForm({ ...healthForm, employee_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Bộ phận / Phân xưởng</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background font-semibold"
                  value={healthForm.department}
                  onChange={(e) => setHealthForm({ ...healthForm, department: e.target.value })}
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ca sản xuất</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background font-semibold"
                  value={healthForm.shift_name}
                  onChange={(e) => setHealthForm({ ...healthForm, shift_name: e.target.value })}
                >
                  <option value="Ca Sáng">Ca Sáng</option>
                  <option value="Ca Chiều">Ca Chiều</option>
                  <option value="Ca Đêm">Ca Đêm</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Thân nhiệt đo tại cửa xưởng (°C) *</Label>
              <Input
                type="number"
                step="0.1"
                required
                value={healthForm.body_temperature}
                onChange={(e) => setHealthForm({ ...healthForm, body_temperature: parseFloat(e.target.value) || 36.5 })}
              />
            </div>

            {/* Symptoms Checklist */}
            <div className="p-3 bg-slate-50 rounded-xl border space-y-2">
              <Label className="text-xs font-bold text-slate-800">Kiểm tra triệu chứng bệnh truyền nhiễm:</Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={healthForm.symptoms.fever}
                    onChange={(e) => setHealthForm({ ...healthForm, symptoms: { ...healthForm.symptoms, fever: e.target.checked } })}
                    className="rounded text-rose-600"
                  />
                  <span>Sốt (&gt;= 37.8°C)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={healthForm.symptoms.cough}
                    onChange={(e) => setHealthForm({ ...healthForm, symptoms: { ...healthForm.symptoms, cough: e.target.checked } })}
                    className="rounded text-amber-600"
                  />
                  <span>Ho, đau họng, khó thở</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={healthForm.symptoms.open_wound}
                    onChange={(e) => setHealthForm({ ...healthForm, symptoms: { ...healthForm.symptoms, open_wound: e.target.checked } })}
                    className="rounded text-rose-600"
                  />
                  <span>Vết thương hở / Đứt tay</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={healthForm.symptoms.diarrhea}
                    onChange={(e) => setHealthForm({ ...healthForm, symptoms: { ...healthForm.symptoms, diarrhea: e.target.checked } })}
                    className="rounded text-rose-600"
                  />
                  <span>Tiêu chảy / Nôn mửa</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowHealthModal(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Lưu Khai Báo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: PRINT BM-AUDIT-01 ==================== */}
      <Dialog open={showPrintAuditModal} onOpenChange={setShowPrintAuditModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Báo Cáo Kết Quả Đánh Giá Nội Bộ (BM-AUDIT-01)</DialogTitle>
          </DialogHeader>

          {selectedAudit && (
            <div id="printable-audit" className="bg-white text-slate-900 p-8 rounded-lg border font-sans text-xs space-y-6">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <img src={logoImg} alt="WCERT Logo" className="h-14 w-auto object-contain" />
                  <div>
                    <h2 className="font-extrabold text-base tracking-tight text-slate-900">CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT</h2>
                    <p className="text-[11px] text-slate-600">Ban Quản lý Chất lượng & An toàn Thực phẩm (FSMS)</p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-600">
                  <p className="font-bold text-slate-900 text-sm">BIỂU MẪU: BM-AUDIT-01</p>
                  <p>Tiêu chuẩn: ISO 22000:2018 Điều khoản 9.2</p>
                  <p>Mã đợt: <b className="text-blue-800">{selectedAudit.audit_code}</b></p>
                </div>
              </div>

              <div className="text-center space-y-1">
                <h1 className="text-lg font-black text-slate-900 uppercase">BÁO CÁO TỔNG KẾT ĐÁNH GIÁ NỘI BỘ HỆ THỐNG FSMS</h1>
                <p className="text-xs text-slate-600">{selectedAudit.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border p-3 rounded-lg bg-slate-50 text-[11px]">
                <div><b>Phòng ban được đánh giá:</b> {selectedAudit.audited_dept}</div>
                <div><b>Trưởng đoàn đánh giá:</b> {selectedAudit.lead_auditor_name}</div>
                <div><b>Thời gian đánh giá:</b> {selectedAudit.start_date} ~ {selectedAudit.end_date}</div>
                <div><b>Loại hình đánh giá:</b> {selectedAudit.audit_type}</div>
                <div className="col-span-2"><b>Phạm vi đánh giá:</b> {selectedAudit.scope}</div>
              </div>

              {/* Table of Findings */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 uppercase text-xs">Danh mục Phát hiện & Bảng kiểm Checklist:</h3>
                <table className="w-full border-collapse border border-slate-400 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold text-center">
                      <th className="border border-slate-400 p-2 w-12">STT</th>
                      <th className="border border-slate-400 p-2 w-24">Điều khoản</th>
                      <th className="border border-slate-400 p-2">Nội dung câu hỏi / Chuẩn mực</th>
                      <th className="border border-slate-400 p-2 w-28">Kết luận</th>
                      <th className="border border-slate-400 p-2">Ghi nhận sai lệch & Bằng chứng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="border border-slate-300 p-4 text-center font-bold text-emerald-700 bg-emerald-50">
                          ✓ Toàn bộ các tiêu chí đánh giá trong phạm vi đều đạt chuẩn tuân thủ (100% Conformity) - Không ghi nhận điểm không phù hợp (No NC).
                        </td>
                      </tr>
                    ) : (
                      findings.map((f, idx) => (
                        <tr key={f.finding_id} className="border-b border-slate-300">
                          <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold font-mono">Điều {f.clause_number}</td>
                          <td className="border border-slate-300 p-2">
                            <b>{f.clause_title}</b>
                            <p className="text-slate-600 mt-0.5">{f.question}</p>
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-bold">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                              f.result === "MAJOR_NC" ? "bg-rose-100 text-rose-800 border border-rose-200" :
                              f.result === "MINOR_NC" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                              f.result === "OFI" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                              "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}>
                              {f.result === "MAJOR_NC" ? "MAJOR NC" : f.result === "MINOR_NC" ? "MINOR NC" : f.result === "OFI" ? "OFI" : "PHÙ HỢP"}
                            </span>
                          </td>
                          <td className="border border-slate-300 p-2">
                            {f.finding_notes ? <p className="font-semibold text-slate-800">{f.finding_notes}</p> : null}
                            {f.evidence_reviewed ? <p className="text-slate-500 text-[10px]">Bằng chứng: {f.evidence_reviewed}</p> : "--"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs">
                <div className="space-y-12">
                  <p className="font-bold text-slate-900">ĐẠI DIỆN PHÒNG BAN</p>
                  <p className="font-semibold text-slate-700">(Ký & ghi rõ họ tên)</p>
                </div>
                <div className="space-y-12">
                  <p className="font-bold text-slate-900">TRƯỞNG ĐOÀN ĐÁNH GIÁ</p>
                  <p className="font-semibold text-slate-700">{selectedAudit.lead_auditor_name}</p>
                </div>
                <div className="space-y-12">
                  <p className="font-bold text-slate-900">TRƯỞNG BAN ISO / BAN GIÁM ĐỐC</p>
                  <p className="font-semibold text-slate-700">(Ký & đóng dấu)</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setShowPrintAuditModal(false)}>
              Đóng
            </Button>
            <Button
              onClick={() => selectedAudit && triggerPrintAuditReport(selectedAudit, findings)}
              className="bg-primary text-primary-foreground font-bold"
            >
              <Printer className="h-4 w-4 mr-1.5" /> In Biểu Mẫu (A4 PDF)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: PRINT BM-TRAIN-02 ==================== */}
      <Dialog open={showPrintTrainModal} onOpenChange={setShowPrintTrainModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Biên Bản Đánh Giá Hiệu Quả Đào Tạo Nhân Sự (BM-TRAIN-02)</DialogTitle>
          </DialogHeader>

          {selectedCourse && (
            <div id="printable-train" className="bg-white text-slate-900 p-8 rounded-lg border font-sans text-xs space-y-6">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <img src={logoImg} alt="WCERT Logo" className="h-14 w-auto object-contain" />
                  <div>
                    <h2 className="font-extrabold text-base tracking-tight text-slate-900">CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT</h2>
                    <p className="text-[11px] text-slate-600">Phòng Nhân sự & Ban Quản lý Chất lượng (FSMS)</p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-600">
                  <p className="font-bold text-slate-900 text-sm">BIỂU MẪU: BM-TRAIN-02</p>
                  <p>Tiêu chuẩn: ISO 22000:2018 Điều khoản 7.2</p>
                  <p>Mã khóa: <b className="text-purple-800">{selectedCourse.course_code}</b></p>
                </div>
              </div>

              <div className="text-center space-y-1">
                <h1 className="text-lg font-black text-slate-900 uppercase">BIÊN BẢN TỔNG KẾT & ĐÁNH GIÁ KẾT QUẢ ĐÀO TẠO NĂNG LỰC</h1>
                <p className="text-xs text-slate-600">{selectedCourse.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border p-3 rounded-lg bg-slate-50 text-[11px]">
                <div><b>Giảng viên / Đơn vị đào tạo:</b> {selectedCourse.trainer_name}</div>
                <div><b>Thời gian tổ chức:</b> {selectedCourse.schedule_date} ({selectedCourse.duration_hours} giờ)</div>
                <div><b>Đối tượng tham gia:</b> {selectedCourse.target_dept}</div>
                <div><b>Hình thức đào tạo:</b> {selectedCourse.training_type === "INTERNAL" ? "Đào tạo nội bộ" : "Chuyên gia bên ngoài"}</div>
              </div>

              {/* Table of Participants */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 uppercase text-xs">Danh Sách Học Viên & Kết Quả Sát Hạch:</h3>
                <table className="w-full border-collapse border border-slate-400 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 font-bold text-center">
                      <th className="border border-slate-400 p-2 w-12">STT</th>
                      <th className="border border-slate-400 p-2 w-20">Mã NV</th>
                      <th className="border border-slate-400 p-2">Họ và tên</th>
                      <th className="border border-slate-400 p-2 w-32">Bộ phận</th>
                      <th className="border border-slate-400 p-2 w-20">Pre-Test</th>
                      <th className="border border-slate-400 p-2 w-20">Post-Test</th>
                      <th className="border border-slate-400 p-2 w-24">Kết quả</th>
                      <th className="border border-slate-400 p-2 w-24">Chứng chỉ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="border border-slate-300 p-4 text-center text-slate-500 italic bg-slate-50">
                          (Khóa đào tạo đang trong giai đoạn tiếp nhận đăng ký học viên - Chưa ghi nhận điểm sát hạch)
                        </td>
                      </tr>
                    ) : (
                      participants.map((p, idx) => (
                        <tr key={p.participant_id} className="border-b border-slate-300">
                          <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono font-bold">{p.employee_code}</td>
                          <td className="border border-slate-300 p-2 font-bold">{p.employee_name}</td>
                          <td className="border border-slate-300 p-2">{p.department}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{p.pre_test_score !== null ? `${p.pre_test_score}đ` : '--'}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono font-bold text-purple-800">{p.post_test_score !== null ? `${p.post_test_score}đ` : '--'}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${p.evaluation_result === "PASSED" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-rose-100 text-rose-800 border border-rose-200"}`}>
                              {p.evaluation_result === "PASSED" ? "ĐẠT" : "CHƯA ĐẠT"}
                            </span>
                          </td>
                          <td className="border border-slate-300 p-2 text-center">
                            {p.certificate_issued ? <span className="text-emerald-700 font-bold">✓ ĐÃ CẤP</span> : <span className="text-slate-400">CHƯA</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                <div className="space-y-12">
                  <p className="font-bold text-slate-900">GIẢNG VIÊN / NGƯỜI ĐÀO TẠO</p>
                  <p className="font-semibold text-slate-700">{selectedCourse.trainer_name}</p>
                </div>
                <div className="space-y-12">
                  <p className="font-bold text-slate-900">TRƯỞNG PHÒNG NHÂN SỰ & QA</p>
                  <p className="font-semibold text-slate-700">(Ký & xác nhận)</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setShowPrintTrainModal(false)}>
              Đóng
            </Button>
            <Button
              onClick={() => selectedCourse && triggerPrintTrainingRecord(selectedCourse, participants)}
              className="bg-primary text-primary-foreground font-bold"
            >
              <Printer className="h-4 w-4 mr-1.5" /> In Biểu Mẫu (A4 PDF)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: PRINT BM-HEALTH-03 ==================== */}
      <Dialog open={showPrintHealthModal} onOpenChange={setShowPrintHealthModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>Sổ Nhật Ký Khai Báo Sức Khỏe & Vệ Sinh Cá Nhân (BM-HEALTH-03)</DialogTitle>
          </DialogHeader>

          <div id="printable-health" className="bg-white text-slate-900 p-8 rounded-lg border font-sans text-xs space-y-6">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="WCERT Logo" className="h-14 w-auto object-contain" />
                <div>
                  <h2 className="font-extrabold text-base tracking-tight text-slate-900">CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT</h2>
                  <p className="text-[11px] text-slate-600">Bộ phận Y tế Nhà máy & Ban Quản lý Chất lượng (FSMS)</p>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <p className="font-bold text-slate-900 text-sm">BIỂU MẪU: BM-HEALTH-03</p>
                <p>Tiêu chuẩn: ISO 22000:2018 Điều khoản 8.2 (PRP)</p>
                <p>Ngày in: {new Date().toLocaleDateString("vi-VN")}</p>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-lg font-black text-slate-900 uppercase">SỔ NHẬT KÝ KIỂM TRA SỨC KHỎE & VỆ SINH CÔNG NHÂN TRƯỚC CA</h1>
              <p className="text-xs text-slate-600">Kiểm soát phòng ngừa lây nhiễm chéo vi sinh vật vào thực phẩm</p>
            </div>

            {/* Table of Health Declarations */}
            <table className="w-full border-collapse border border-slate-400 text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 font-bold text-center">
                  <th className="border border-slate-400 p-2 w-10">STT</th>
                  <th className="border border-slate-400 p-2 w-16">Mã NV</th>
                  <th className="border border-slate-400 p-2">Họ và tên</th>
                  <th className="border border-slate-400 p-2 w-28">Bộ phận</th>
                  <th className="border border-slate-400 p-2 w-16">Ca</th>
                  <th className="border border-slate-400 p-2 w-16">Thân nhiệt</th>
                  <th className="border border-slate-400 p-2">Triệu chứng lâm sàng</th>
                  <th className="border border-slate-400 p-2 w-28">Kết luận</th>
                  <th className="border border-slate-400 p-2 w-24">Người kiểm tra</th>
                </tr>
              </thead>
              <tbody>
                {healthLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="border border-slate-300 p-4 text-center text-slate-500 italic bg-slate-50">
                      Chưa có bản ghi khai báo sức khỏe nào.
                    </td>
                  </tr>
                ) : (
                  healthLogs.map((h, idx) => (
                    <tr key={h.declaration_id} className="border-b border-slate-300">
                      <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono font-bold">{h.employee_code}</td>
                      <td className="border border-slate-300 p-2 font-bold">{h.employee_name}</td>
                      <td className="border border-slate-300 p-2">{h.department}</td>
                      <td className="border border-slate-300 p-2 text-center">{h.shift_name}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono font-bold">{h.body_temperature}°C</td>
                      <td className="border border-slate-300 p-2">
                        {h.symptoms?.fever ? <span className="text-rose-600 font-bold">Sốt. </span> : ""}
                        {h.symptoms?.cough ? <span className="text-amber-600">Ho. </span> : ""}
                        {h.symptoms?.open_wound ? <span className="text-rose-600 font-bold">Vết thương hở. </span> : ""}
                        {h.symptoms?.diarrhea ? <span className="text-rose-600 font-bold">Tiêu chảy. </span> : ""}
                        {!h.symptoms?.fever && !h.symptoms?.cough && !h.symptoms?.open_wound && !h.symptoms?.diarrhea ? <span className="text-emerald-700">Bình thường</span> : ""}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-bold">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${
                          h.cleared_for_shift === "CLEARED" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          h.cleared_for_shift === "RESTRICTED" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                          "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}>
                          {h.cleared_for_shift === "CLEARED" ? "ĐỦ ĐIỀU KIỆN" : h.cleared_for_shift === "RESTRICTED" ? "HẠN CHẾ" : "ĐÌNH CHỈ CA"}
                        </span>
                      </td>
                      <td className="border border-slate-300 p-2 text-center">{h.supervisor_name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
              <div className="space-y-12">
                <p className="font-bold text-slate-900">CÁN BỘ Y TẾ / GIÁM SÁT CA</p>
                <p className="font-semibold text-slate-700">(Ký & ghi rõ họ tên)</p>
              </div>
              <div className="space-y-12">
                <p className="font-bold text-slate-900">TRƯỞNG BAN AN TOÀN THỰC PHẨM</p>
                <p className="font-semibold text-slate-700">(Ký & xác nhận)</p>
              </div>
            </div>
          </div>

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setShowPrintHealthModal(false)}>
              Đóng
            </Button>
            <Button
              onClick={() => triggerPrintHealthLog(healthLogs)}
              className="bg-primary text-primary-foreground font-bold"
            >
              <Printer className="h-4 w-4 mr-1.5" /> In Biểu Mẫu (A4 PDF)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: WORKFLOW STUDIO ==================== */}
      {showWorkflowModal && workflowTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-[88vh] bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b shrink-0">
              <div className="flex items-center gap-2">
                <GitFork className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">{workflowTemplate.title}</h3>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowWorkflowModal(false)}
                className="text-xs"
              >
                Đóng
              </Button>
            </div>
            <div className="flex-1 overflow-hidden pt-3">
              <WorkflowBuilder
                initialData={workflowTemplate}
                onSave={() => setShowWorkflowModal(false)}
                onCancel={() => setShowWorkflowModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditManagementPage;
