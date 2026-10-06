import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
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
import { EmptyState } from "@/components/EmptyState";
import { ModuleGuideModal } from "@/components/ModuleGuideModal";

export const Route = createFileRoute("/audits")({
  head: () => ({
    meta: [
      { title: "Đánh Giá Nội Bộ, Đào Tạo & Khai Báo Sức Khỏe – WCERT ISO 22000:2018" },
      { name: "description", content: "Hệ thống quản lý đánh giá nội bộ, ma trận đào tạo nhân sự và sổ khai báo sức khỏe ca chuẩn ISO 22000:2018." },
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

interface TrainingRequest {
  request_id: string;
  request_code: string;
  department: string;
  requested_by: string;
  request_date: string;
  training_topic: string;
  target_audience?: string;
  expected_participants_count: number;
  reason_and_objective: string;
  expected_timeframe?: string;
  estimated_cost: number;
  proposed_trainer?: string;
  approval_status: "PENDING" | "APPROVED" | "REJECTED";
  approved_by?: string;
  approval_date?: string;
  approval_notes?: string;
  created_at?: string;
}

interface TrainingEvaluation {
  evaluation_id: string;
  course_id?: string;
  evaluation_code: string;
  evaluation_date: string;
  evaluator_name: string;
  evaluator_position?: string;
  evaluated_employee_name: string;
  department: string;
  post_training_period: "1_MONTH" | "3_MONTHS" | "6_MONTHS";
  criteria_ratings?: Record<string, any>;
  overall_rating: number;
  is_effective: boolean;
  improvements_observed?: string;
  further_actions_needed?: string;
  reviewed_by?: string;
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
  const [showGuide, setShowGuide] = useState(false);
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

  // Training sub-tabs and records
  const [trainingSubTab, setTrainingSubTab] = useState<"courses" | "requests" | "evaluations">("courses");
  const [trainingRequests, setTrainingRequests] = useState<TrainingRequest[]>([]);
  const [trainingEvaluations, setTrainingEvaluations] = useState<TrainingEvaluation[]>([]);

  // Request Filters & Modal
  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("ALL");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<TrainingRequest | null>(null);
  const [requestForm, setRequestForm] = useState({
    request_code: "",
    department: "Phòng Quản Lý Chất Lượng (QA)",
    requested_by: "Trần Thị QA",
    request_date: new Date().toISOString().split("T")[0],
    training_topic: "Cập nhật tiêu chuẩn FSSC 22000 Version 6.0 & Giám sát dị nguyên",
    target_audience: "Đội HACCP, KCS, Trưởng ca sản xuất",
    expected_participants_count: 12,
    reason_and_objective: "Nâng cao năng lực nhận diện rủi ro chéo dị nguyên và đáp ứng yêu cầu khách hàng xuất khẩu",
    expected_timeframe: "Tháng 04/2026 (2 ngày)",
    estimated_cost: 15000000,
    proposed_trainer: "Viện Đào Tạo Tiêu Chuẩn Chất Lượng",
    approval_status: "PENDING" as "PENDING" | "APPROVED" | "REJECTED",
    approved_by: "",
    approval_notes: "",
  });

  // Evaluation Filters & Modal
  const [evalSearch, setEvalSearch] = useState("");
  const [evalEffectiveFilter, setEvalEffectiveFilter] = useState("ALL");
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<TrainingEvaluation | null>(null);
  const [evalForm, setEvalForm] = useState({
    course_id: "",
    evaluation_code: "",
    evaluation_date: new Date().toISOString().split("T")[0],
    evaluator_name: "Lê Văn Trưởng Xưởng",
    evaluator_position: "Trưởng Xưởng Chế Biến",
    evaluated_employee_name: "Nguyễn Văn Kiểm",
    department: "Tổ Sơ Chế & Rửa",
    post_training_period: "1_MONTH" as "1_MONTH" | "3_MONTHS" | "6_MONTHS",
    criteria_ratings_str: JSON.stringify({
      work_quality: 5,
      compliance_sop: 5,
      problem_handling: 4,
      hygiene_discipline: 5
    }, null, 2),
    overall_rating: 4.8,
    is_effective: true,
    improvements_observed: "Thao tác gọt vỏ, phân loại nguyên liệu chuẩn xác; tuân thủ quy định thay găng tay đúng tần suất.",
    further_actions_needed: "Duy trì giám sát chéo giữa các ca sản xuất",
    reviewed_by: "Ban Giám Đốc",
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [auditTypeFilter, setAuditTypeFilter] = useState("ALL");
  const [auditStatusFilter, setAuditStatusFilter] = useState("ALL");
  const [courseCatFilter, setCourseCatFilter] = useState("ALL");
  const [healthStatusFilter, setHealthStatusFilter] = useState("ALL");

  const filteredRequests = useMemo(() => {
    return trainingRequests.filter(req => {
      const matchSearch =
        req.request_code.toLowerCase().includes(requestSearch.toLowerCase()) ||
        req.training_topic.toLowerCase().includes(requestSearch.toLowerCase()) ||
        req.department.toLowerCase().includes(requestSearch.toLowerCase()) ||
        req.requested_by.toLowerCase().includes(requestSearch.toLowerCase());
      const matchStatus = requestStatusFilter === "ALL" || req.approval_status === requestStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [trainingRequests, requestSearch, requestStatusFilter]);

  const filteredEvaluations = useMemo(() => {
    return trainingEvaluations.filter(ev => {
      const matchSearch =
        ev.evaluation_code.toLowerCase().includes(evalSearch.toLowerCase()) ||
        ev.evaluated_employee_name.toLowerCase().includes(evalSearch.toLowerCase()) ||
        ev.department.toLowerCase().includes(evalSearch.toLowerCase()) ||
        ev.evaluator_name.toLowerCase().includes(evalSearch.toLowerCase());
      const matchEff =
        evalEffectiveFilter === "ALL" ||
        (evalEffectiveFilter === "EFFECTIVE" && ev.is_effective) ||
        (evalEffectiveFilter === "NOT_EFFECTIVE" && !ev.is_effective);
      return matchSearch && matchEff;
    });
  }, [trainingEvaluations, evalSearch, evalEffectiveFilter]);

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
      const [statsRes, auditsRes, coursesRes, healthRes, requestsRes, evaluationsRes] = await Promise.all([
        api.get("/audits/stats"),
        api.get("/audits/audits"),
        api.get("/audits/training/courses"),
        api.get("/audits/health-declarations"),
        api.get("/audits/training/requests"),
        api.get("/audits/training/evaluations"),
      ]);
      setStats(statsRes.data);
      setAudits(auditsRes.data);
      setCourses(coursesRes.data);
      setHealthLogs(healthRes.data);
      setTrainingRequests(requestsRes.data || []);
      setTrainingEvaluations(evaluationsRes.data || []);

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
    try {
      const res = await api.get("/builders/workflows");
      if (Array.isArray(res.data)) {
        const existing = res.data.find(
          (w: any) => w.code === "WF-AUDIT-4STEPS" || w.module === "INTERNAL_AUDIT"
        );
        if (existing) {
          setWorkflowTemplate(existing);
          setShowWorkflowModal(true);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not fetch remote audit workflow, fallback to default template", e);
    }

    setWorkflowTemplate({
      module: "INTERNAL_AUDIT",
      code: "WF-AUDIT-4STEPS",
      title: "Quy Trình 4 Bước Đánh Giá Nội Bộ",
      description: "Quy trình chuẩn mực đánh giá độc lập: Lập kế hoạch & Chuẩn bị Checklist -> Đánh giá tại hiện trường -> Lập báo cáo phát hiện -> Thẩm tra khắc phục CAPA.",
      version: "1.0",
      nodes: [
        { id: "a_1", type: "process", label: "1. Lập Kế Hoạch & Soạn Checklist", role: "Ban QLCL & ATTP", description: "Xác định phạm vi, chuẩn mực áp dụng và phân công đánh giá chéo.", is_ccp: false, step_number: 1 },
        { id: "a_2", type: "process", label: "2. Thực Hiện Đánh Giá Tại Chỗ", role: "Ban QLCL & ATTP", description: "Phỏng vấn nhân sự, kiểm tra hồ sơ ghi chép và quan sát hiện trường sản xuất.", is_ccp: false, step_number: 2 },
        { id: "a_3", type: "approval", label: "3. Họp Tổng Kết & Báo Cáo Phát Hiện", role: "Ban Giám đốc", description: "Thống nhất phân loại lỗi (Conformity / Major NC / Minor NC / OFI) và ký biên bản.", is_ccp: false, step_number: 3 },
        { id: "a_4", type: "process", label: "4. Theo Dõi & Thẩm Tra Khắc Phục CAPA", role: "Ban QLCL & ATTP", description: "Giám sát các hành động khắc phục phòng ngừa và đóng hồ sơ sau 30 ngày.", is_ccp: false, step_number: 4 },
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
              <div style="font-size: 11px; font-style: italic; color: #475569; margin-top: 2px;">Tiêu chuẩn ISO 22000:2018</div>
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
              <div style="font-size: 11px; font-style: italic; color: #475569; margin-top: 2px;">Tiêu chuẩn ISO 22000:2018</div>
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

  const triggerPrintTrainingRequest = (req: TrainingRequest) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BM01-QTĐT - Phiếu Đề Xuất Đào Tạo [${req.request_code}]</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Times New Roman', Times, serif; padding: 8px; color: #111; line-height: 1.5; font-size: 13px; background: #fff; }
          .header-table { width: 100%; border: 2px solid #0f172a; border-collapse: collapse; margin-bottom: 16px; }
          .header-table td { border: 1px solid #0f172a; padding: 8px 10px; vertical-align: middle; }
          .logo-box { width: 25%; text-align: center; background-color: #f8fafc; }
          .title-box { width: 50%; text-align: center; }
          .title-main { font-size: 14px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-top: 3px; }
          .meta-box { width: 25%; font-size: 11px; background-color: #f8fafc; line-height: 1.4; }
          .doc-title { text-align: center; margin-bottom: 16px; }
          .doc-title h2 { margin: 0; font-size: 16px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
          .doc-title p { margin: 4px 0 0; font-size: 12px; color: #475569; font-style: italic; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
          .info-table td { border: 1px solid #cbd5e1; padding: 8px 10px; }
          .sig-box { display: flex; justify-content: space-between; margin-top: 32px; page-break-inside: avoid; }
          .sig-col { width: 30%; text-align: center; font-size: 12px; line-height: 1.35; }
          .footer-note { margin-top: 32px; border-top: 1px dashed #cbd5e1; padding-top: 6px; font-size: 10px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="logo-box">
              <img src="${origin}/logo.png" style="height: 48px; width: auto; object-contain; margin-bottom: 2px;" /><br/>
              <span style="font-size: 13px; font-weight: 900; color: #7e22ce;">WCERT FSMS</span><br/>
              <span style="font-size: 9.5px; color: #475569; font-weight: 700;">Human Resource & Training</span>
            </td>
            <td class="title-box">
              <div style="font-size: 11px; font-weight: bold; color: #334155;">CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT</div>
              <div class="title-main">PHIẾU ĐỀ XUẤT ĐÀO TẠO</div>
              <div style="font-size: 11px; font-style: italic; color: #475569; margin-top: 2px;">Quy trình đào tạo - Thư mục 14 An Giang</div>
            </td>
            <td class="meta-box">
              <b>Mã Biểu Mẫu:</b> BM01-QTĐT<br/>
              <b>Mã Đề Xuất:</b> <span style="font-weight: bold; color: #7e22ce;">${req.request_code}</span><br/>
              <b>Ngày lập:</b> ${req.request_date}<br/>
              <b>Trạng thái:</b> <b>${req.approval_status}</b>
            </td>
          </tr>
        </table>

        <div class="doc-title">
          <h2>PHIẾU ĐỀ XUẤT ĐÀO TẠO NĂNG LỰC NHÂN SỰ</h2>
          <p>Kính gửi: Ban Giám Đốc & Phòng Hành Chính Nhân Sự</p>
        </div>

        <table class="info-table">
          <tr>
            <td style="width: 50%;"><b>Đơn vị / Bộ phận đề xuất:</b> ${req.department}</td>
            <td style="width: 50%;"><b>Người đề xuất:</b> ${req.requested_by}</td>
          </tr>
          <tr>
            <td colspan="2"><b>Chuyên đề / Nội dung đào tạo đề xuất:</b><br/>
              <div style="font-weight: bold; color: #0f172a; margin-top: 4px; font-size: 14px;">${req.training_topic}</div>
            </td>
          </tr>
          <tr>
            <td colspan="2"><b>Lý do & Mục tiêu đào tạo:</b><br/>
              <div style="margin-top: 4px; color: #334155;">${req.reason_and_objective}</div>
            </td>
          </tr>
          <tr>
            <td><b>Đối tượng tham gia:</b> ${req.target_audience || "Toàn bộ nhân sự liên quan"}</td>
            <td><b>Số lượng dự kiến:</b> ${req.expected_participants_count} Người</td>
          </tr>
          <tr>
            <td><b>Thời gian dự kiến tổ chức:</b> ${req.expected_timeframe || "Theo kế hoạch quý"}</td>
            <td><b>Chi phí ước tính:</b> ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(req.estimated_cost)}</td>
          </tr>
          <tr>
            <td colspan="2"><b>Đơn vị / Giảng viên đề xuất:</b> ${req.proposed_trainer || "Đào tạo nội bộ / Chuyên gia chỉ định"}</td>
          </tr>
          <tr>
            <td colspan="2"><b>Ý kiến phê duyệt của Lãnh đạo:</b><br/>
              <div style="margin-top: 4px; color: #047857; font-weight: bold;">
                ${req.approval_status === "APPROVED" ? `✓ ĐỒNG Ý PHÊ DUYỆT. Người duyệt: ${req.approved_by || "Ban Giám Đốc"} (Ngày: ${req.approval_date || req.request_date}). Ghi chú: ${req.approval_notes || "Tiến hành tổ chức theo quy trình."}` : req.approval_status === "REJECTED" ? `✗ KHÔNG PHÊ DUYỆT. Lý do: ${req.approval_notes || "Chưa phù hợp kế hoạch ngân sách."}` : "⏳ Đang chờ Ban Giám Đốc xem xét và phê duyệt."}
              </div>
            </td>
          </tr>
        </table>

        <div class="sig-box">
          <div class="sig-col">
            <b>NGƯỜI ĐỀ XUẤT</b><br/>
            <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
            <b>${req.requested_by}</b>
          </div>
          <div class="sig-col">
            <b>TRƯỞNG PHÒNG NHÂN SỰ</b><br/>
            <i>(Xem xét và thẩm tra)</i><br/><br/><br/><br/>
            <b>Trưởng Ban Nhân Sự</b>
          </div>
          <div class="sig-col">
            <b>BAN GIÁM ĐỐC DUYỆT</b><br/>
            <i>(Phê duyệt chi phí & kế hoạch)</i><br/><br/><br/><br/>
            <b>${req.approved_by || "Tổng Giám Đốc"}</b>
          </div>
        </div>

        <div class="footer-note">
          WCERT FSMS • HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM THEO TIÊU CHUẨN ISO 22000:2018 (BM01-QTĐT)
        </div>
      </body>
      </html>
    `;
    printHtml(htmlContent);
  };

  const triggerPrintTrainingEvaluation = (ev: TrainingEvaluation) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const periodMap: Record<string, string> = {
      "1_MONTH": "01 Tháng sau đào tạo",
      "3_MONTHS": "03 Tháng sau đào tạo",
      "6_MONTHS": "06 Tháng sau đào tạo",
    };
    const criteriaRows = ev.criteria_ratings ? Object.entries(ev.criteria_ratings).map(([k, v], idx) => `
      <tr>
        <td style="text-align: center; font-family: monospace;">${idx + 1}</td>
        <td><b>${k}</b></td>
        <td style="text-align: center; font-weight: bold; color: #7e22ce;">${v} / 5</td>
        <td>${Number(v) >= 4 ? "Đáp ứng tốt yêu cầu thực tế sản xuất" : "Cần bồi dưỡng bổ sung thêm"}</td>
      </tr>
    `).join("") : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BM04-QTĐT - Đánh Giá Chất Lượng Sau Đào Tạo [${ev.evaluation_code}]</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Times New Roman', Times, serif; padding: 8px; color: #111; line-height: 1.5; font-size: 13px; background: #fff; }
          .header-table { width: 100%; border: 2px solid #0f172a; border-collapse: collapse; margin-bottom: 16px; }
          .header-table td { border: 1px solid #0f172a; padding: 8px 10px; vertical-align: middle; }
          .logo-box { width: 25%; text-align: center; background-color: #f8fafc; }
          .title-box { width: 50%; text-align: center; }
          .title-main { font-size: 14px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-top: 3px; }
          .meta-box { width: 25%; font-size: 11px; background-color: #f8fafc; line-height: 1.4; }
          .doc-title { text-align: center; margin-bottom: 16px; }
          .doc-title h2 { margin: 0; font-size: 16px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
          .doc-title p { margin: 4px 0 0; font-size: 12px; color: #475569; font-style: italic; }
          table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
          table.data-table th, table.data-table td { border: 1px solid #0f172a; padding: 6px 8px; text-align: left; vertical-align: middle; }
          table.data-table th { background-color: #f1f5f9; font-weight: bold; text-align: center; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
          .info-table td { border: 1px solid #cbd5e1; padding: 8px 10px; }
          .sig-box { display: flex; justify-content: space-between; margin-top: 32px; page-break-inside: avoid; }
          .sig-col { width: 48%; text-align: center; font-size: 12px; line-height: 1.35; }
          .footer-note { margin-top: 32px; border-top: 1px dashed #cbd5e1; padding-top: 6px; font-size: 10px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="logo-box">
              <img src="${origin}/logo.png" style="height: 48px; width: auto; object-contain; margin-bottom: 2px;" /><br/>
              <span style="font-size: 13px; font-weight: 900; color: #7e22ce;">WCERT FSMS</span><br/>
              <span style="font-size: 9.5px; color: #475569; font-weight: 700;">Human Resource & Training</span>
            </td>
            <td class="title-box">
              <div style="font-size: 11px; font-weight: bold; color: #334155;">CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT</div>
              <div class="title-main">ĐÁNH GIÁ CHẤT LƯỢNG SAU ĐÀO TẠO</div>
              <div style="font-size: 11px; font-style: italic; color: #475569; margin-top: 2px;">Quy trình đào tạo - Thư mục 14 An Giang</div>
            </td>
            <td class="meta-box">
              <b>Mã Biểu Mẫu:</b> BM04-QTĐT<br/>
              <b>Mã Đánh Giá:</b> <span style="font-weight: bold; color: #7e22ce;">${ev.evaluation_code}</span><br/>
              <b>Ngày đánh giá:</b> ${ev.evaluation_date}<br/>
              <b>Thời điểm:</b> ${periodMap[ev.post_training_period] || ev.post_training_period}
            </td>
          </tr>
        </table>

        <div class="doc-title">
          <h2>PHIẾU ĐÁNH GIÁ HIỆU QUẢ ỨNG DỤNG SAU ĐÀO TẠO</h2>
          <p>Kiểm tra mức độ áp dụng kiến thức vào thực tế công việc sản xuất</p>
        </div>

        <table class="info-table">
          <tr>
            <td style="width: 50%;"><b>Nhân sự được đánh giá:</b> <span style="font-weight: bold; color: #0f172a;">${ev.evaluated_employee_name}</span></td>
            <td style="width: 50%;"><b>Bộ phận công tác:</b> ${ev.department}</td>
          </tr>
          <tr>
            <td><b>Người đánh giá trực tiếp:</b> ${ev.evaluator_name}</td>
            <td><b>Chức vụ người đánh giá:</b> ${ev.evaluator_position || "Quản lý trực tiếp"}</td>
          </tr>
          <tr>
            <td><b>Điểm đánh giá trung bình:</b> <span style="font-size: 15px; font-weight: bold; color: #7e22ce;">${ev.overall_rating} / 5.0</span></td>
            <td><b>Kết luận hiệu quả:</b> ${ev.is_effective ? '<span style="color: #047857; font-weight: bold; background: #d1fae5; padding: 2px 8px; border-radius: 4px;">✓ ĐẠT HIỆU QUẢ</span>' : '<span style="color: #b91c1c; font-weight: bold; background: #fee2e2; padding: 2px 8px; border-radius: 4px;">✗ CHƯA ĐẠT HIỆU QUẢ</span>'}</td>
          </tr>
        </table>

        ${criteriaRows ? `
        <div style="font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 6px; color: #0f172a;">
          CHI TIẾT ĐIỂM SỐ THEO TIÊU CHÍ:
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px;">STT</th>
              <th>Tiêu chí đánh giá thực tế</th>
              <th style="width: 100px;">Điểm số</th>
              <th>Nhận xét của người quản lý</th>
            </tr>
          </thead>
          <tbody>
            ${criteriaRows}
          </tbody>
        </table>
        ` : ''}

        <table class="info-table">
          <tr>
            <td><b>Tiến bộ & thay đổi tích cực quan sát được:</b><br/>
              <div style="margin-top: 4px; color: #047857;">${ev.improvements_observed || "Nhân viên thao tác chuẩn xác, tuân thủ nghiêm ngặt quy định ATTP."}</div>
            </td>
          </tr>
          <tr>
            <td><b>Biện pháp khắc phục / Kế hoạch tiếp theo (nếu cần):</b><br/>
              <div style="margin-top: 4px; color: #334155;">${ev.further_actions_needed || "Duy trì kiểm tra định kỳ."}</div>
            </td>
          </tr>
        </table>

        <div class="sig-box">
          <div class="sig-col">
            <b>NGƯỜI ĐÁNH GIÁ TRỰC TIẾP</b><br/>
            <i>(Ký và ghi rõ họ tên)</i><br/><br/><br/><br/>
            <b>${ev.evaluator_name}</b><br/>
            <span style="font-size: 10px; color: #64748b;">${ev.evaluator_position || "Quản lý trực tiếp"}</span>
          </div>
          <div class="sig-col">
            <b>BAN GIÁM ĐỐC / TRƯỞNG BỘ PHẬN QA</b><br/>
            <i>(Xem xét và xác nhận hồ sơ năng lực)</i><br/><br/><br/><br/>
            <b>${ev.reviewed_by || "Ban Giám Đốc"}</b><br/>
            <span style="font-size: 10px; color: #64748b;">Lưu hồ sơ đào tạo nhân sự</span>
          </div>
        </div>

        <div class="footer-note">
          WCERT FSMS • HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM THEO TIÊU CHUẨN ISO 22000:2018 (BM04-QTĐT)
        </div>
      </body>
      </html>
    `;
    printHtml(htmlContent);
  };

  // Request CRUD Handlers
  const handleOpenCreateRequest = () => {
    setEditingRequest(null);
    setRequestForm({
      request_code: `REQ-TRAIN-2026-0${trainingRequests.length + 1}`,
      department: "Phòng Quản Lý Chất Lượng (QA)",
      requested_by: "Trần Thị QA",
      request_date: new Date().toISOString().split("T")[0],
      training_topic: "Cập nhật tiêu chuẩn FSSC 22000 Version 6.0 & Giám sát dị nguyên",
      target_audience: "Đội HACCP, KCS, Trưởng ca sản xuất",
      expected_participants_count: 12,
      reason_and_objective: "Nâng cao năng lực nhận diện rủi ro chéo dị nguyên và đáp ứng yêu cầu khách hàng xuất khẩu",
      expected_timeframe: "Tháng 04/2026 (2 ngày)",
      estimated_cost: 15000000,
      proposed_trainer: "Viện Đào Tạo Tiêu Chuẩn Chất Lượng",
      approval_status: "PENDING",
      approved_by: "",
      approval_notes: "",
    });
    setShowRequestModal(true);
  };

  const handleOpenEditRequest = (req: TrainingRequest) => {
    setEditingRequest(req);
    setRequestForm({
      request_code: req.request_code,
      department: req.department,
      requested_by: req.requested_by,
      request_date: req.request_date,
      training_topic: req.training_topic,
      target_audience: req.target_audience || "",
      expected_participants_count: req.expected_participants_count,
      reason_and_objective: req.reason_and_objective,
      expected_timeframe: req.expected_timeframe || "",
      estimated_cost: req.estimated_cost,
      proposed_trainer: req.proposed_trainer || "",
      approval_status: req.approval_status,
      approved_by: req.approved_by || "",
      approval_notes: req.approval_notes || "",
    });
    setShowRequestModal(true);
  };

  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRequest) {
        const res = await api.put(`/audits/training/requests/${editingRequest.request_id}`, requestForm);
        setTrainingRequests(prev => prev.map(r => r.request_id === editingRequest.request_id ? res.data : r));
        toast.success("Cập nhật phiếu đề xuất đào tạo thành công");
      } else {
        const res = await api.post("/audits/training/requests", requestForm);
        setTrainingRequests(prev => [res.data, ...prev]);
        toast.success("Lập phiếu đề xuất đào tạo (BM01-QTĐT) thành công");
      }
      setShowRequestModal(false);
    } catch (err: any) {
      toast.error("Lỗi lưu phiếu đề xuất: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phiếu đề xuất đào tạo này?")) return;
    try {
      await api.delete(`/audits/training/requests/${requestId}`);
      setTrainingRequests(prev => prev.filter(r => r.request_id !== requestId));
      toast.success("Đã xóa phiếu đề xuất đào tạo");
    } catch (err: any) {
      toast.error("Lỗi xóa phiếu đề xuất: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleApproveRequest = async (req: TrainingRequest, newStatus: "APPROVED" | "REJECTED") => {
    const approverName = prompt("Nhập tên người phê duyệt:", "Ban Giám Đốc") || "Ban Giám Đốc";
    const notes = prompt("Ghi chú phê duyệt:", newStatus === "APPROVED" ? "Đồng ý tổ chức theo kế hoạch" : "Chưa phê duyệt đợt này") || "";
    try {
      const res = await api.put(`/audits/training/requests/${req.request_id}`, {
        approval_status: newStatus,
        approved_by: approverName,
        approval_date: new Date().toISOString().split("T")[0],
        approval_notes: notes,
      });
      setTrainingRequests(prev => prev.map(r => r.request_id === req.request_id ? res.data : r));
      toast.success(`Đã cập nhật trạng thái phiếu: ${newStatus === "APPROVED" ? "PHÊ DUYỆT" : "TỪ CHỐI"}`);
    } catch (err: any) {
      toast.error("Lỗi cập nhật trạng thái: " + (err.response?.data?.detail || err.message));
    }
  };

  // Evaluation CRUD Handlers
  const handleOpenCreateEval = () => {
    setEditingEvaluation(null);
    setEvalForm({
      course_id: courses[0]?.course_id || "",
      evaluation_code: `EVAL-TRAIN-2026-0${trainingEvaluations.length + 1}`,
      evaluation_date: new Date().toISOString().split("T")[0],
      evaluator_name: "Lê Văn Trưởng Xưởng",
      evaluator_position: "Trưởng Xưởng Chế Biến",
      evaluated_employee_name: "Nguyễn Văn Kiểm",
      department: "Tổ Sơ Chế & Rửa",
      post_training_period: "1_MONTH",
      criteria_ratings_str: JSON.stringify({
        work_quality: 5,
        compliance_sop: 5,
        problem_handling: 4,
        hygiene_discipline: 5
      }, null, 2),
      overall_rating: 4.8,
      is_effective: true,
      improvements_observed: "Thao tác gọt vỏ, phân loại nguyên liệu chuẩn xác; tuân thủ quy định thay găng tay đúng tần suất.",
      further_actions_needed: "Duy trì giám sát chéo giữa các ca sản xuất",
      reviewed_by: "Ban Giám Đốc",
    });
    setShowEvalModal(true);
  };

  const handleOpenEditEval = (ev: TrainingEvaluation) => {
    setEditingEvaluation(ev);
    setEvalForm({
      course_id: ev.course_id || "",
      evaluation_code: ev.evaluation_code,
      evaluation_date: ev.evaluation_date,
      evaluator_name: ev.evaluator_name,
      evaluator_position: ev.evaluator_position || "",
      evaluated_employee_name: ev.evaluated_employee_name,
      department: ev.department,
      post_training_period: ev.post_training_period,
      criteria_ratings_str: JSON.stringify(ev.criteria_ratings || {}, null, 2),
      overall_rating: ev.overall_rating,
      is_effective: ev.is_effective,
      improvements_observed: ev.improvements_observed || "",
      further_actions_needed: ev.further_actions_needed || "",
      reviewed_by: ev.reviewed_by || "",
    });
    setShowEvalModal(true);
  };

  const handleSaveEval = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedCriteria = {};
    try {
      parsedCriteria = JSON.parse(evalForm.criteria_ratings_str);
    } catch {
      toast.error("Định dạng JSON tiêu chí đánh giá không hợp lệ");
      return;
    }
    const payload = {
      course_id: evalForm.course_id || undefined,
      evaluation_code: evalForm.evaluation_code,
      evaluation_date: evalForm.evaluation_date,
      evaluator_name: evalForm.evaluator_name,
      evaluator_position: evalForm.evaluator_position,
      evaluated_employee_name: evalForm.evaluated_employee_name,
      department: evalForm.department,
      post_training_period: evalForm.post_training_period,
      criteria_ratings: parsedCriteria,
      overall_rating: Number(evalForm.overall_rating),
      is_effective: Boolean(evalForm.is_effective),
      improvements_observed: evalForm.improvements_observed,
      further_actions_needed: evalForm.further_actions_needed,
      reviewed_by: evalForm.reviewed_by,
    };
    try {
      if (editingEvaluation) {
        const res = await api.put(`/audits/training/evaluations/${editingEvaluation.evaluation_id}`, payload);
        setTrainingEvaluations(prev => prev.map(ev => ev.evaluation_id === editingEvaluation.evaluation_id ? res.data : ev));
        toast.success("Cập nhật đánh giá chất lượng sau đào tạo thành công");
      } else {
        const res = await api.post("/audits/training/evaluations", payload);
        setTrainingEvaluations(prev => [res.data, ...prev]);
        toast.success("Lập đánh giá chất lượng sau đào tạo (BM04-QTĐT) thành công");
      }
      setShowEvalModal(false);
    } catch (err: any) {
      toast.error("Lỗi lưu đánh giá: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteEval = async (evalId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bản ghi đánh giá sau đào tạo này?")) return;
    try {
      await api.delete(`/audits/training/evaluations/${evalId}`);
      setTrainingEvaluations(prev => prev.filter(ev => ev.evaluation_id !== evalId));
      toast.success("Đã xóa bản ghi đánh giá");
    } catch (err: any) {
      toast.error("Lỗi xóa bản ghi: " + (err.response?.data?.detail || err.message));
    }
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
        description="Số hóa toàn diện Chương trình Đánh giá nội bộ ISO 22000, Ma trận đào tạo sát hạch nhân sự và Sổ khai báo sức khỏe ca."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setShowGuide(true)}
              variant="outline"
              size="sm"
              className="border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 font-bold text-xs"
            >
              <BookOpen className="h-4 w-4 mr-1.5" /> Hướng Dẫn Nghiệp Vụ
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
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Đánh Giá Nội Bộ</span>
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
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Đào Tạo & Năng Lực</span>
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
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sức Khỏe Trước Ca</span>
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
          {audits.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Chưa có đợt đánh giá nội bộ nào"
              description="Lập kế hoạch đánh giá nội bộ định kỳ để kiểm tra sự tuân thủ các quy trình an toàn thực phẩm."
              actionLabel="+ Lập Đợt Đánh Giá Mới"
              onAction={() => {
                setEditingAudit(null);
                setAuditForm({
                  audit_code: `IA-2026-0${audits.length + 1}`,
                  title: "Đợt đánh giá nội bộ định kỳ",
                  audit_type: "PERIODIC",
                  start_date: new Date().toISOString().split("T")[0],
                  end_date: new Date().toISOString().split("T")[0],
                  lead_auditor_name: "ThS. Nguyễn Văn An",
                  audited_dept: departments[0] || "Phòng Sản Xuất & Chế Biến",
                  audited_lead_name: "Quản Đốc Xưởng",
                  scope: "Toàn bộ chu trình từ tiếp nhận nguyên liệu đến lưu kho thành phẩm.",
                  findings_summary: "",
                  conclusion: "",
                  status: "PLANNED",
                });
                setShowAuditModal(true);
              }}
              onGuide={() => setShowGuide(true)}
            />
          ) : (
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
          )}
        </div>
      )}

      {/* ==================== TAB 2: TRAINING & COMPETENCE ==================== */}
      {activeTab === "training" && (
        <div className="space-y-6">
          {/* Sub-Tabs: Courses (BM02/03) | Requests (BM01) | Evaluations (BM04) */}
          <div className="flex border-b border-slate-200 gap-2 pb-1 overflow-x-auto">
            <button
              onClick={() => setTrainingSubTab("courses")}
              className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                trainingSubTab === "courses"
                  ? "border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              BM02 & BM03: Kế Hoạch & Điểm Danh Học Viên ({courses.length})
            </button>
            <button
              onClick={() => setTrainingSubTab("requests")}
              className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                trainingSubTab === "requests"
                  ? "border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              BM01-QTĐT: Phiếu Đề Xuất Đào Tạo ({trainingRequests.length})
            </button>
            <button
              onClick={() => setTrainingSubTab("evaluations")}
              className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                trainingSubTab === "evaluations"
                  ? "border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Award className="w-4 h-4" />
              BM04-QTĐT: Đánh Giá Hiệu Quả Sau Đào Tạo ({trainingEvaluations.length})
            </button>
          </div>

          {trainingSubTab === "courses" && (
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
          {courses.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Chưa có khóa đào tạo nào"
              description="Xây dựng kế hoạch và tổ chức các khóa đào tạo ATTP, HACCP, GMP cho nhân sự định kỳ."
              actionLabel="+ Tạo Khóa Đào Tạo Mới"
              onAction={() => {
                setCourseForm({
                  course_code: `TR-2026-0${courses.length + 1}`,
                  title: "",
                  category: "HACCP_CCP",
                  trainer_name: "ThS. Nguyễn Văn An",
                  training_type: "INTERNAL",
                  schedule_date: new Date().toISOString().split("T")[0],
                  duration_hours: 4.0,
                  target_dept: departments[0] || "Phòng Sản Xuất & QA",
                  content_summary: "",
                  status: "PLANNED",
                });
                setShowCourseModal(true);
              }}
              onGuide={() => setShowGuide(true)}
            />
          ) : (
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
          )}
          </div>
          )}

          {/* ==================== SUB-TAB: TRAINING REQUESTS (BM01-QTĐT) ==================== */}
          {trainingSubTab === "requests" && (
            <div className="space-y-6">
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-sm">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm mã đề xuất, chuyên đề, bộ phận..."
                    className="pl-9 text-xs"
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <select
                    className="border rounded-xl px-3 py-2 text-xs bg-background text-foreground font-semibold"
                    value={requestStatusFilter}
                    onChange={(e) => setRequestStatusFilter(e.target.value)}
                  >
                    <option value="ALL">Tất cả trạng thái duyệt</option>
                    <option value="PENDING">Chờ phê duyệt</option>
                    <option value="APPROVED">Đã phê duyệt</option>
                    <option value="REJECTED">Từ chối duyệt</option>
                  </select>
                  <Button
                    size="sm"
                    onClick={handleOpenCreateRequest}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    + Lập Phiếu Đề Xuất (BM01)
                  </Button>
                </div>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card p-4 rounded-2xl border shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground">Tổng phiếu đề xuất</p>
                    <h3 className="text-xl font-extrabold text-foreground mt-0.5">{trainingRequests.length}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="bg-card p-4 rounded-2xl border shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-amber-600">Đang chờ phê duyệt</p>
                    <h3 className="text-xl font-extrabold text-amber-700 mt-0.5">
                      {trainingRequests.filter(r => r.approval_status === "PENDING").length}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="bg-card p-4 rounded-2xl border shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-emerald-600">Đã phê duyệt</p>
                    <h3 className="text-xl font-extrabold text-emerald-700 mt-0.5">
                      {trainingRequests.filter(r => r.approval_status === "APPROVED").length}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="bg-card p-4 rounded-2xl border shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground">Tổng dự toán kinh phí</p>
                    <h3 className="text-xl font-extrabold text-foreground mt-0.5">
                      {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
                        trainingRequests.reduce((sum, r) => sum + (r.estimated_cost || 0), 0)
                      )}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Requests Table */}
              <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Danh Sách Phiếu Đề Xuất Đào Tạo (Biểu mẫu BM01-QTĐT)</h3>
                    <p className="text-[11px] text-muted-foreground">Theo quy trình đào tạo Thư mục 14 Hệ thống ISO 22000 An Giang</p>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">Hiển thị {filteredRequests.length} phiếu</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b text-muted-foreground">
                        <th className="py-3 px-4 text-left font-bold">Mã Phiếu & Ngày Lập</th>
                        <th className="py-3 px-4 text-left font-bold">Chuyên Đề & Lý Do Đề Xuất</th>
                        <th className="py-3 px-4 text-left font-bold">Bộ Phận & Người Đề Xuất</th>
                        <th className="py-3 px-4 text-center font-bold">Số Lượng & Thời Gian</th>
                        <th className="py-3 px-4 text-right font-bold">Dự Toán Chi Phí</th>
                        <th className="py-3 px-4 text-center font-bold">Trạng Thái Duyệt</th>
                        <th className="py-3 px-4 text-right font-bold">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-muted-foreground italic">
                            Không tìm thấy phiếu đề xuất đào tạo nào phù hợp.
                          </td>
                        </tr>
                      ) : (
                        filteredRequests.map((req) => (
                          <tr key={req.request_id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-200">
                                {req.request_code}
                              </span>
                              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {req.request_date}
                              </div>
                            </td>
                            <td className="py-3 px-4 max-w-xs">
                              <p className="font-bold text-foreground text-xs">{req.training_topic}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{req.reason_and_objective}</p>
                              {req.proposed_trainer && (
                                <span className="inline-block mt-1 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                  Giảng viên: {req.proposed_trainer}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-foreground flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-muted-foreground" />
                                {req.department}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {req.requested_by}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-bold text-foreground">{req.expected_participants_count}</span>
                              <span className="text-[11px] text-muted-foreground"> người</span>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {req.expected_timeframe || "-"}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                              {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(req.estimated_cost)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {req.approval_status === "APPROVED" && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Check className="w-3 h-3" /> Đã duyệt
                                </span>
                              )}
                              {req.approval_status === "PENDING" && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                  <Clock className="w-3 h-3" /> Chờ duyệt
                                </span>
                              )}
                              {req.approval_status === "REJECTED" && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                                  <X className="w-3 h-3" /> Từ chối
                                </span>
                              )}
                              {req.approved_by && (
                                <div className="text-[10px] text-muted-foreground mt-1">Duyệt: {req.approved_by}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {req.approval_status === "PENDING" && (
                                  <>
                                    <button
                                      title="Phê duyệt phiếu"
                                      onClick={() => handleApproveRequest(req, "APPROVED")}
                                      className="p-1 rounded text-emerald-600 hover:bg-emerald-50 border border-emerald-200"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      title="Từ chối phê duyệt"
                                      onClick={() => handleApproveRequest(req, "REJECTED")}
                                      className="p-1 rounded text-rose-600 hover:bg-rose-50 border border-rose-200"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                <button
                                  title="In biểu mẫu BM01-QTĐT"
                                  onClick={() => triggerPrintTrainingRequest(req)}
                                  className="p-1 rounded text-blue-600 hover:bg-blue-50 border border-blue-200"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  title="Chỉnh sửa"
                                  onClick={() => handleOpenEditRequest(req)}
                                  className="p-1 rounded text-slate-600 hover:bg-slate-100 border border-slate-200"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  title="Xóa"
                                  onClick={() => handleDeleteRequest(req.request_id)}
                                  className="p-1 rounded text-rose-600 hover:bg-rose-50 border border-rose-200"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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

          {/* ==================== SUB-TAB: TRAINING EVALUATIONS (BM04-QTĐT) ==================== */}
          {trainingSubTab === "evaluations" && (
            <div className="space-y-6">
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-2xl border shadow-sm">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm mã ĐG, nhân viên, bộ phận, người ĐG..."
                    className="pl-9 text-xs"
                    value={evalSearch}
                    onChange={(e) => setEvalSearch(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <select
                    className="border rounded-xl px-3 py-2 text-xs bg-background text-foreground font-semibold"
                    value={evalEffectiveFilter}
                    onChange={(e) => setEvalEffectiveFilter(e.target.value)}
                  >
                    <option value="ALL">Tất cả kết luận hiệu quả</option>
                    <option value="EFFECTIVE">Đạt hiệu quả sau đào tạo</option>
                    <option value="NOT_EFFECTIVE">Chưa đạt hiệu quả</option>
                  </select>
                  <Button
                    size="sm"
                    onClick={handleOpenCreateEval}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    + Đánh Giá Sau ĐT (BM04)
                  </Button>
                </div>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card p-4 rounded-2xl border shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground">Tổng bản ghi đánh giá</p>
                    <h3 className="text-xl font-extrabold text-foreground mt-0.5">{trainingEvaluations.length}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="bg-card p-4 rounded-2xl border shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-emerald-600">Đạt hiệu quả ứng dụng</p>
                    <h3 className="text-xl font-extrabold text-emerald-700 mt-0.5">
                      {trainingEvaluations.filter(e => e.is_effective).length}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="bg-card p-4 rounded-2xl border shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-blue-600">Tỷ lệ đạt hiệu quả</p>
                    <h3 className="text-xl font-extrabold text-blue-700 mt-0.5">
                      {trainingEvaluations.length > 0
                        ? `${Math.round((trainingEvaluations.filter(e => e.is_effective).length / trainingEvaluations.length) * 100)}%`
                        : "0%"}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                </div>
                <div className="bg-card p-4 rounded-2xl border shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground">Điểm đánh giá TB</p>
                    <h3 className="text-xl font-extrabold text-purple-700 dark:text-purple-400 mt-0.5">
                      {trainingEvaluations.length > 0
                        ? (trainingEvaluations.reduce((sum, e) => sum + (e.overall_rating || 0), 0) / trainingEvaluations.length).toFixed(1)
                        : "0.0"} / 5.0
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Evaluations Table */}
              <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Bảng Đánh Giá Chất Lượng Sau Đào Tạo (Biểu mẫu BM04-QTĐT)</h3>
                    <p className="text-[11px] text-muted-foreground">Theo dõi khả năng ứng dụng thực tế sau 1 - 3 - 6 tháng tại vị trí làm việc</p>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">Hiển thị {filteredEvaluations.length} bản ghi</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b text-muted-foreground">
                        <th className="py-3 px-4 text-left font-bold">Mã ĐG & Ngày ĐG</th>
                        <th className="py-3 px-4 text-left font-bold">Nhân Sự & Bộ Phận</th>
                        <th className="py-3 px-4 text-center font-bold">Thời Điểm</th>
                        <th className="py-3 px-4 text-center font-bold">Điểm TB</th>
                        <th className="py-3 px-4 text-center font-bold">Kết Luận Hiệu Quả</th>
                        <th className="py-3 px-4 text-left font-bold">Người ĐG & Tiến Bộ Quan Sát</th>
                        <th className="py-3 px-4 text-right font-bold">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredEvaluations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-muted-foreground italic">
                            Chưa có bản ghi đánh giá chất lượng sau đào tạo nào.
                          </td>
                        </tr>
                      ) : (
                        filteredEvaluations.map((ev) => (
                          <tr key={ev.evaluation_id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded border border-purple-200">
                                {ev.evaluation_code}
                              </span>
                              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {ev.evaluation_date}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-bold text-foreground text-xs flex items-center gap-1">
                                <User className="w-3 h-3 text-muted-foreground" />
                                {ev.evaluated_employee_name}
                              </p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3 text-muted-foreground" />
                                {ev.department}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-center font-semibold">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                                {ev.post_training_period === "1_MONTH" ? "1 Tháng" : ev.post_training_period === "3_MONTHS" ? "3 Tháng" : "6 Tháng"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-sm font-extrabold text-purple-700 dark:text-purple-400">
                                {ev.overall_rating}
                              </span>
                              <span className="text-[10px] text-muted-foreground"> / 5.0</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {ev.is_effective ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Check className="w-3 h-3" /> ĐẠT HIỆU QUẢ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                                  <X className="w-3 h-3" /> CHƯA ĐẠT
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 max-w-xs">
                              <p className="font-bold text-foreground text-xs">{ev.evaluator_name}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                {ev.improvements_observed || ev.further_actions_needed || "Tuân thủ tốt quy trình"}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  title="In biểu mẫu BM04-QTĐT"
                                  onClick={() => triggerPrintTrainingEvaluation(ev)}
                                  className="p-1 rounded text-blue-600 hover:bg-blue-50 border border-blue-200"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  title="Chỉnh sửa"
                                  onClick={() => handleOpenEditEval(ev)}
                                  className="p-1 rounded text-slate-600 hover:bg-slate-100 border border-slate-200"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  title="Xóa"
                                  onClick={() => handleDeleteEval(ev.evaluation_id)}
                                  className="p-1 rounded text-rose-600 hover:bg-rose-50 border border-rose-200"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
          {healthLogs.length === 0 ? (
            <EmptyState
              icon={HeartPulse}
              title="Chưa có bản ghi khai báo sức khỏe nào"
              description="Thực hiện kiểm tra thân nhiệt, triệu chứng lâm sàng và vệ sinh cá nhân trước ca làm việc."
              actionLabel="+ Khai Báo Sức Khỏe Ca"
              onAction={() => {
                setHealthForm({
                  employee_code: `NV-0${healthLogs.length + 101}`,
                  employee_name: "",
                  department: departments[0] || "Xưởng Sản Xuất",
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
                  supervisor_name: "Y tế Ca trực",
                  notes: "",
                });
                setShowHealthModal(true);
              }}
              onGuide={() => setShowGuide(true)}
            />
          ) : (
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
          )}
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
            <DialogTitle>Lập Kế Hoạch Đánh Giá Nội Bộ ISO 22000</DialogTitle>
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
            <DialogTitle>Thêm Khóa Đào Tạo Nhân Sự Mới</DialogTitle>
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

      {/* ==================== MODAL: TRAINING REQUEST (BM01-QTĐT) ==================== */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRequest ? "Chỉnh Sửa Phiếu Đề Xuất Đào Tạo (BM01)" : "Lập Phiếu Đề Xuất Đào Tạo Mới (BM01-QTĐT)"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveRequest} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mã phiếu đề xuất *</Label>
                <Input
                  required
                  value={requestForm.request_code}
                  onChange={(e) => setRequestForm({ ...requestForm, request_code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ngày đề xuất *</Label>
                <Input
                  type="date"
                  required
                  value={requestForm.request_date}
                  onChange={(e) => setRequestForm({ ...requestForm, request_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Chuyên đề đào tạo kiến nghị *</Label>
              <Input
                required
                placeholder="VD: Kiểm soát mối nguy vật lý và vận hành máy dò kim loại"
                value={requestForm.training_topic}
                onChange={(e) => setRequestForm({ ...requestForm, training_topic: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Lý do & Mục tiêu đào tạo *</Label>
              <Textarea
                rows={2}
                required
                placeholder="Mô tả nhu cầu phát sinh, rủi ro an toàn thực phẩm cần khắc phục hoặc mục tiêu nâng cao tay nghề..."
                value={requestForm.reason_and_objective}
                onChange={(e) => setRequestForm({ ...requestForm, reason_and_objective: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Bộ phận đề xuất</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background font-semibold"
                  value={requestForm.department}
                  onChange={(e) => setRequestForm({ ...requestForm, department: e.target.value })}
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Người lập đề xuất *</Label>
                <Input
                  required
                  value={requestForm.requested_by}
                  onChange={(e) => setRequestForm({ ...requestForm, requested_by: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Đối tượng tham gia</Label>
                <Input
                  placeholder="VD: Công nhân vận hành, KTV QA"
                  value={requestForm.target_audience}
                  onChange={(e) => setRequestForm({ ...requestForm, target_audience: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Số lượng dự kiến (người)</Label>
                <Input
                  type="number"
                  min="1"
                  value={requestForm.expected_participants_count}
                  onChange={(e) => setRequestForm({ ...requestForm, expected_participants_count: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Thời gian dự kiến</Label>
                <Input
                  placeholder="VD: Tháng 03/2026"
                  value={requestForm.expected_timeframe}
                  onChange={(e) => setRequestForm({ ...requestForm, expected_timeframe: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Đơn vị / Giảng viên dự kiến</Label>
                <Input
                  placeholder="VD: Đội trưởng HACCP"
                  value={requestForm.proposed_trainer}
                  onChange={(e) => setRequestForm({ ...requestForm, proposed_trainer: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dự toán chi phí (VNĐ)</Label>
                <Input
                  type="number"
                  step="50000"
                  value={requestForm.estimated_cost}
                  onChange={(e) => setRequestForm({ ...requestForm, estimated_cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t">
              <div className="space-y-1">
                <Label className="text-xs">Trạng thái phê duyệt</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background font-semibold"
                  value={requestForm.approval_status}
                  onChange={(e) => setRequestForm({ ...requestForm, approval_status: e.target.value })}
                >
                  <option value="PENDING">Chờ phê duyệt</option>
                  <option value="APPROVED">Đã phê duyệt</option>
                  <option value="REJECTED">Từ chối duyệt</option>
                </select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Người duyệt / Ý kiến phê duyệt</Label>
                <Input
                  placeholder="VD: Giám Đốc Điều Hành - Đã duyệt triển khai theo kế hoạch"
                  value={requestForm.approved_by || ""}
                  onChange={(e) => setRequestForm({ ...requestForm, approved_by: e.target.value, approval_comments: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRequestModal(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                {editingRequest ? "Cập Nhật Phiếu" : "Lưu Phiếu Đề Xuất"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: TRAINING EVALUATION (BM04-QTĐT) ==================== */}
      <Dialog open={showEvalModal} onOpenChange={setShowEvalModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEval ? "Chỉnh Sửa Bản Đánh Giá Sau Đào Tạo (BM04)" : "Lập Đánh Giá Chất Lượng Sau Đào Tạo (BM04-QTĐT)"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEval} className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mã đánh giá *</Label>
                <Input
                  required
                  value={evalForm.evaluation_code}
                  onChange={(e) => setEvalForm({ ...evalForm, evaluation_code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ngày đánh giá *</Label>
                <Input
                  type="date"
                  required
                  value={evalForm.evaluation_date}
                  onChange={(e) => setEvalForm({ ...evalForm, evaluation_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Thời điểm đánh giá</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background font-semibold"
                  value={evalForm.post_training_period}
                  onChange={(e) => setEvalForm({ ...evalForm, post_training_period: e.target.value })}
                >
                  <option value="1_MONTH">1 Tháng sau đào tạo</option>
                  <option value="3_MONTHS">3 Tháng sau đào tạo</option>
                  <option value="6_MONTHS">6 Tháng sau đào tạo</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Khóa đào tạo liên kết (Nếu có)</Label>
              <select
                className="w-full border rounded-md px-3 py-2 text-xs bg-background font-semibold"
                value={evalForm.course_id || ""}
                onChange={(e) => setEvalForm({ ...evalForm, course_id: e.target.value ? parseInt(e.target.value) : undefined })}
              >
                <option value="">-- Chọn khóa học thực hiện --</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    [{c.course_code}] {c.title} ({c.schedule_date})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mã NV được đánh giá *</Label>
                <Input
                  required
                  value={evalForm.employee_code}
                  onChange={(e) => setEvalForm({ ...evalForm, employee_code: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Họ tên nhân viên *</Label>
                <Input
                  required
                  value={evalForm.evaluated_employee_name}
                  onChange={(e) => setEvalForm({ ...evalForm, evaluated_employee_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bộ phận</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background font-semibold"
                  value={evalForm.department}
                  onChange={(e) => setEvalForm({ ...evalForm, department: e.target.value })}
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Người đánh giá (Trưởng bộ phận) *</Label>
                <Input
                  required
                  value={evalForm.evaluator_name}
                  onChange={(e) => setEvalForm({ ...evalForm, evaluator_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Chức danh người đánh giá</Label>
                <Input
                  value={evalForm.evaluator_title}
                  onChange={(e) => setEvalForm({ ...evalForm, evaluator_title: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-100">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-purple-900 dark:text-purple-200">Điểm đánh giá tổng thể (Thang 1-5)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  required
                  value={evalForm.overall_rating}
                  onChange={(e) => {
                    const rating = parseFloat(e.target.value) || 0;
                    setEvalForm({
                      ...evalForm,
                      overall_rating: rating,
                      is_effective: rating >= 3.5,
                    });
                  }}
                />
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <Label className="text-xs font-bold text-purple-900 dark:text-purple-200">Kết luận hiệu quả ứng dụng</Label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="is_effective_check"
                    checked={evalForm.is_effective}
                    onChange={(e) => setEvalForm({ ...evalForm, is_effective: e.target.checked })}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="is_effective_check" className="text-xs font-bold text-foreground cursor-pointer">
                    {evalForm.is_effective ? "✅ ĐẠT HIỆU QUẢ SAU ĐÀO TẠO" : "❌ CHƯA ĐẠT HIỆU QUẢ"}
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Những tiến bộ cụ thể quan sát được trong công việc</Label>
              <Textarea
                rows={2}
                placeholder="VD: Thao tác đúng quy trình SOP, kiểm soát tốt mối nguy, không xảy ra sai sót..."
                value={evalForm.improvements_observed}
                onChange={(e) => setEvalForm({ ...evalForm, improvements_observed: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Biện pháp cần thực hiện thêm (nếu có)</Label>
                <Input
                  placeholder="VD: Kèm cặp thực hành thêm 1 tuần"
                  value={evalForm.further_actions_needed}
                  onChange={(e) => setEvalForm({ ...evalForm, further_actions_needed: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cấp xem xét / Ban Giám Đốc</Label>
                <Input
                  value={evalForm.reviewed_by}
                  onChange={(e) => setEvalForm({ ...evalForm, reviewed_by: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEvalModal(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                {editingEval ? "Cập Nhật Đánh Giá" : "Lưu Đánh Giá BM04"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: ADD HEALTH DECLARATION ==================== */}
      <Dialog open={showHealthModal} onOpenChange={setShowHealthModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Khai Báo Sức Khỏe & Vệ Sinh Cá Nhân Trước Ca</DialogTitle>
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
                onSave={async (wf) => {
                  try {
                    await api.post("/builders/workflows", wf);
                    setWorkflowTemplate(wf);
                    toast.success("Đã lưu lưu đồ quy trình Đánh giá nội bộ thành công!");
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
        </div>
      )}

      {/* ==================== MODAL: MODULE GUIDE ==================== */}
      <ModuleGuideModal
        module="audits"
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />
    </div>
  );
}

export default AuditManagementPage;
