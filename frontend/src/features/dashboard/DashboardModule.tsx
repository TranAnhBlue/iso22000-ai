import { createFileRoute } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import {
  ShieldCheck,
  ClipboardCheck,
  AlertTriangle,
  FileText,
  TrendingUp,
  Calendar,
  Sparkles,
  RefreshCw,
  Plus,
  Printer,
  Award,
  Layers,
  Search,
  Send,
  Workflow,
  Flame,
  Truck,
  Sliders,
  X,
  Bot,
  Target,
  Users,
  Activity,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { printHtml } from "@/lib/print";
import { useDepartments } from "@/lib/departments";
import { toast } from "sonner";

// ==================== ĐỊNH NGHĨA DỮ LIỆU NGHIỆP VỤ ATTP ====================
export interface RadarPillars {
  context_leadership: number;
  planning_haccp: number;
  support_training: number;
  operation_prp: number;
  performance_audit: number;
  improvement_capa: number;
  supply_traceability: number;
}

export interface ExecutiveOverviewStats {
  overall_health_score: number;

  health_level: string;
  documents: {
    total_documents: number;
    approved_documents: number;
    pending_documents: number;
    approval_rate: number;
  };
  purchasing_iqc: {
    total_suppliers: number;
    high_risk_suppliers: number;
    total_lots: number;
    approved_lots: number;
    lot_pass_rate: number;
  };
  haccp_ccp: {
    total_ccps: number;
    total_monitoring_logs: number;
    critical_deviations: number;
    warning_logs: number;
    in_control_rate: number;
  };
  prp_hygiene: {
    total_prps: number;
    total_inspections: number;
    compliance_rate: number;
  };
  equipment_calibration: {
    total_equipment: number;
    calibrated_count: number;
    calibration_pass_rate: number;
    maintenance_due_count: number;
  };
  inventory_traceability: {
    total_batches: number;
    quarantined_batches: number;
    retained_samples: number;
  };
  capa_nc: {
    total_ncs: number;
    open_ncs: number;
    critical_ncs: number;
    major_ncs: number;
    total_capas: number;
    verified_effective_capas: number;
    effectiveness_rate: number;
  };
  audit_training_health: {
    total_audits: number;
    total_findings: number;
    audit_conformity_rate: number;
    total_learners: number;
    training_pass_rate: number;
    today_suspended: number;
    today_cleared: number;
  };
  radar_pillars: RadarPillars;
  hazard_trends: {
    biological_pct: number;
    chemical_pct: number;
    physical_pct: number;
    allergen_pct: number;
    monthly_points: number[];
  };
  objectives_summary: {
    total_objectives: number;
    on_track: number;
    achieved: number;
    at_risk: number;
    completion_rate: number;
  };
  total_active_alerts: number;
  critical_alerts_count: number;
}

interface ExecutiveAlertItem {
  alert_id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  action_url: string;
  timestamp: string;
}

interface QualityObjective {
  objective_id: string;
  objective_code: string;
  metric_name: string;
  clause_reference: string;
  department: string;
  target_year: number;
  target_value: number;
  actual_value: number;
  unit: string;
  status: string;
  action_plan?: string;
  responsible_person: string;
}

interface ManagementReview {
  review_id: string;
  review_code: string;
  title: string;
  meeting_date: string;
  chairperson_name: string;
  secretary_name: string;
  participants: Array<{ name: string; role: string; dept: string; attendance: string }>;
  scope_and_inputs: Record<string, string>;
  meeting_minutes: string;
  decisions_and_actions: Array<{
    action_id: string;
    decision_text: string;
    assigned_to: string;
    deadline: string;
    resources_allocated: string;
    status: string;
  }>;
  status: string;
}

export function ExecutiveDashboard() {
  const { departments } = useDepartments();
  const [activeTab, setActiveTab] = useState<"overview" | "objectives" | "reviews" | "ai_studio">("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ExecutiveOverviewStats | null>(null);
  const [alerts, setAlerts] = useState<ExecutiveAlertItem[]>([]);
  const [objectives, setObjectives] = useState<QualityObjective[]>([]);
  const [reviews, setReviews] = useState<ManagementReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<ManagementReview | null>(null);

  // Cửa sổ biểu mẫu & lưu đồ
  const [showAddObjectiveModal, setShowAddObjectiveModal] = useState(false);
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);

  // Trợ lý trí tuệ nhân tạo chuyên ngành ATTP
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastResult, setForecastResult] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState<any>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "ai"; text: string; citations?: any[] }>>([]);

  // Biểu mẫu tạo mới mục tiêu chất lượng
  const [newObjCode, setNewObjCode] = useState("");
  const [newObjMetric, setNewObjMetric] = useState("");
  const [newObjClause, setNewObjClause] = useState("Điều 6.2");
  const [newObjDept, setNewObjDept] = useState("Phòng Sản xuất & Chế biến");
  const [newObjTarget, setNewObjTarget] = useState(100.0);
  const [newObjActual, setNewObjActual] = useState(0.0);
  const [newObjUnit, setNewObjUnit] = useState("%");
  const [newObjStatus, setNewObjStatus] = useState("ON_TRACK");
  const [newObjAction, setNewObjAction] = useState("");
  const [newObjPerson, setNewObjPerson] = useState("Trưởng Ban ISO");

  // Biểu mẫu tạo mới biên bản xem xét lãnh đạo
  const [newRevCode, setNewRevCode] = useState("");
  const [newRevTitle, setNewRevTitle] = useState("");
  const [newRevDate, setNewRevDate] = useState(new Date().toISOString().split("T")[0]);
  const [newRevChair, setNewRevChair] = useState("Tổng Giám Đốc Trần Văn Hùng");
  const [newRevSec, setNewRevSec] = useState("Trưởng Ban ISO Nguyễn Văn An");
  const [newRevMinutes, setNewRevMinutes] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes, objsRes, revsRes] = await Promise.all([
        api.get<ExecutiveOverviewStats>("/dashboard/overview-stats"),
        api.get<ExecutiveAlertItem[]>("/dashboard/executive-alerts"),
        api.get<QualityObjective[]>("/dashboard/quality-objectives"),
        api.get<ManagementReview[]>("/dashboard/management-reviews"),
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data);
      setObjectives(objsRes.data);
      setReviews(revsRes.data);
      if (revsRes.data.length > 0 && !selectedReview) {
        setSelectedReview(revsRes.data[0]);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu trung tâm điều hành:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSeedDefaults = async () => {
    try {
      await api.post("/dashboard/seed-defaults");
      await loadData();
      toast.success("Đã khởi tạo thành công dữ liệu thực hành mẫu Mục tiêu chất lượng và Biên bản họp Lãnh đạo!");
    } catch (err) {
      console.error("Lỗi khi khởi tạo dữ liệu mẫu:", err);
      toast.error("Lỗi khi khởi tạo dữ liệu.");
    }
  };

  const handleCreateObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/dashboard/quality-objectives", {
        objective_code: newObjCode,
        metric_name: newObjMetric,
        clause_reference: newObjClause,
        department: newObjDept,
        target_year: 2026,
        target_value: Number(newObjTarget),
        actual_value: Number(newObjActual),
        unit: newObjUnit,
        status: newObjStatus,
        action_plan: newObjAction,
        responsible_person: newObjPerson,
      });
      setShowAddObjectiveModal(false);
      await loadData();
      toast.success("Đã thêm mục tiêu chất lượng mới thành công!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi tạo mục tiêu.");
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post<ManagementReview>("/dashboard/management-reviews", {
        review_code: newRevCode,
        title: newRevTitle,
        meeting_date: newRevDate,
        chairperson_name: newRevChair,
        secretary_name: newRevSec,
        participants: [
          { name: newRevChair, role: "Tổng Giám Đốc", dept: "Ban Giám Đốc", attendance: "CÓ MẶT" },
          { name: newRevSec, role: "Trưởng Ban ISO", dept: "Phòng QA", attendance: "CÓ MẶT" },
        ],
        scope_and_inputs: {
          audit_summary: "Đánh giá nội bộ đạt 92% tuân thủ, không có sai lỗi nghiêm trọng.",
          customer_feedback: "Không ghi nhận khiếu nại về an toàn thực phẩm.",
          ccp_prp_status: "100% điểm kiểm soát tới hạn CCP trong ngưỡng an toàn.",
        },
        meeting_minutes: newRevMinutes || "Cuộc họp diễn ra nghiêm túc, hệ thống FSMS duy trì tính phù hợp và hiệu lực cao.",
        decisions_and_actions: [
          {
            action_id: "ACT-01",
            decision_text: "Tiếp tục duy trì hệ thống kiểm soát theo tiêu chuẩn ISO 22000:2018.",
            assigned_to: "Ban ISO",
            deadline: "2026-12-31",
            resources_allocated: "Ngân sách thường niên",
            status: "IN_PROGRESS",
          },
        ],
        status: "APPROVED",
      });
      setShowAddReviewModal(false);
      await loadData();
      setSelectedReview(res.data);
      toast.success("Đã lập biên bản xem xét lãnh đạo thành công!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi lập biên bản.");
    }
  };

  // ==================== TRỢ LÝ TRÍ TUỆ NHÂN TẠO ATTP ====================
  const runAuditForecast = async () => {
    setForecastLoading(true);
    try {
      const res = await api.post("/dashboard/ai/audit-readiness-forecast", {
        target_standard: "ISO 22000:2018",
      });
      setForecastResult(res.data);
      toast.success("Đã hoàn tất dự báo độ sẵn sàng tái đánh giá chứng nhận!");
    } catch (err) {
      console.error(err);
      toast.error("Không thể kết nối Trợ lý AI Dự Báo.");
    } finally {
      setForecastLoading(false);
    }
  };

  const runGenerateReport = async () => {
    setReportLoading(true);
    try {
      const res = await api.post("/dashboard/ai/generate-management-review-report", {
        review_period: "Quý 1/2026",
      });
      setReportResult(res.data);
      toast.success("Trợ lý AI đã soạn xong Báo Cáo Xem Xét Lãnh Đạo BM-MR-01!");
    } catch (err) {
      console.error(err);
      toast.error("Không thể sinh Báo Cáo Xem Xét Lãnh Đạo.");
    } finally {
      setReportLoading(false);
    }
  };

  const runChatAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;
    const q = chatQuestion;
    setChatHistory((prev) => [...prev, { role: "user", text: q }]);
    setChatQuestion("");
    setChatLoading(true);
    try {
      const res = await api.post("/dashboard/ai/query-fsms-insights", {
        question: q,
      });
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: res.data.answer, citations: res.data.data_citations },
      ]);
    } catch (err) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: "Xin lỗi, không thể truy xuất hồ sơ dữ liệu vào lúc này." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // ==================== IN ẤN BIỂU MẪU CHUẨN ISO (BM-MR-01) ====================
  const triggerPrintManagementReview = (review: ManagementReview) => {
    const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo Cáo Xem Xét Lãnh Đạo – ${review.review_code}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; color: #111; margin: 0; padding: 0; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 2px solid #000; }
    .header-table td { padding: 6px 10px; border: 1px solid #000; vertical-align: middle; }
    .logo-cell { width: 90px; text-align: center; }
    .company-title { font-size: 10.5pt; font-weight: bold; text-transform: uppercase; margin: 0; }
    .company-sub { font-size: 9pt; color: #333; margin: 2px 0 0 0; }
    .doc-title { font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; margin: 0; color: #004d40; }
    .doc-meta { font-size: 9pt; text-align: right; }
    .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .info-grid td { padding: 4px 6px; font-size: 10.5pt; }
    .info-label { font-weight: bold; width: 25%; }
    .section-title { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; background: #e0f2f1; padding: 5px 8px; border-left: 4px solid #00695c; margin: 12px 0 6px 0; }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .data-table th, .data-table td { border: 1px solid #000; padding: 5px 8px; font-size: 10pt; text-align: left; }
    .data-table th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
    .sign-table { width: 100%; margin-top: 25px; border-collapse: collapse; page-break-inside: avoid; }
    .sign-table td { text-align: center; vertical-align: top; width: 50%; padding: 0 10px; font-size: 10.5pt; }
    .sign-role { font-weight: bold; text-transform: uppercase; margin-bottom: 50px; }
    .sign-name { font-weight: bold; }
    .footer-note { margin-top: 20px; font-size: 8.5pt; color: #666; text-align: center; border-top: 1px dashed #aaa; padding-top: 5px; }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td class="logo-cell" rowspan="2">
        <img src="/logo.png" alt="WCERT" style="height: 48px; object-fit: contain;" onerror="this.style.display='none'" />
        <div style="font-weight: bold; font-size: 11pt; color: #00695c; margin-top: 2px;">WCERT</div>
      </td>
      <td>
        <div class="company-title">CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT</div>
        <div class="company-sub">HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM THEO ISO 22000:2018</div>
      </td>
      <td class="doc-meta" style="width: 140px;">
        <div><b>Mã Biểu Mẫu:</b> BM-MR-01</div>
        <div><b>Lần ban hành:</b> 02</div>
        <div><b>Trang:</b> 1/1</div>
      </td>
    </tr>
    <tr>
      <td colspan="2">
        <div class="doc-title">BIÊN BẢN HỌP XEM XÉT CỦA LÃNH ĐẠO (MANAGEMENT REVIEW)</div>
        <div style="text-align: center; font-size: 9.5pt; font-style: italic;">(Theo yêu cầu Điều khoản 9.3 Tiêu chuẩn Quốc tế ISO 22000:2018)</div>
      </td>
    </tr>
  </table>

  <table class="info-grid">
    <tr>
      <td class="info-label">Mã số kỳ họp:</td>
      <td><b>${review.review_code}</b></td>
      <td class="info-label">Ngày tổ chức:</td>
      <td><b>${review.meeting_date}</b></td>
    </tr>
    <tr>
      <td class="info-label">Chủ trì cuộc họp:</td>
      <td>${review.chairperson_name}</td>
      <td class="info-label">Thư ký ghi biên bản:</td>
      <td>${review.secretary_name}</td>
    </tr>
    <tr>
      <td class="info-label">Tiêu đề / Phạm vi:</td>
      <td colspan="3">${review.title}</td>
    </tr>
    <tr>
      <td class="info-label">Thành phần tham dự:</td>
      <td colspan="3">${review.participants?.map((p) => `${p.name} (${p.role})`).join("; ") || "Toàn thể Ban Lãnh đạo & Các Trưởng bộ phận"}</td>
    </tr>
  </table>

  <div class="section-title">1. TỔNG HỢP 6 NHÓM ĐẦU VÀO XEM XÉT (ĐIỀU KHOẢN 9.3.2)</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 5%;">STT</th>
        <th style="width: 30%;">Nội Dung Đầu Vào Xem Xét</th>
        <th>Tóm Tắt Dữ Liệu & Đánh Giá Thực Tế</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">1</td>
        <td><b>Kết quả đánh giá nội bộ & Cơ quan quản lý</b></td>
        <td>${review.scope_and_inputs?.audit_summary || review.scope_and_inputs?.audit_results || "Đạt tỷ lệ tuân thủ 92.5%, các điểm không phù hợp nhẹ đã được khắc phục hoàn toàn."}</td>
      </tr>
      <tr>
        <td style="text-align: center;">2</td>
        <td><b>Ý kiến khách hàng & Khiếu nại ATTP</b></td>
        <td>${review.scope_and_inputs?.customer_feedback || "Không có khiếu nại nghiêm trọng về vi sinh; tỷ lệ khiếu nại duy trì ở mức 0.02%."}</td>
      </tr>
      <tr>
        <td style="text-align: center;">3</td>
        <td><b>Hiệu năng quy trình & Giám sát CCP / PRP</b></td>
        <td>${review.scope_and_inputs?.ccp_prp_status || review.scope_and_inputs?.ccp_prp_performance || "100% các điểm kiểm soát tới hạn và chương trình tiên quyết duy trì an toàn."}</td>
      </tr>
      <tr>
        <td style="text-align: center;">4</td>
        <td><b>Tình trạng hành động khắc phục CAPA</b></td>
        <td>${review.scope_and_inputs?.capa_effectiveness || "Đã đóng 100% các phiếu khắc phục đúng hạn, đạt hiệu quả ngăn ngừa tái diễn."}</td>
      </tr>
      <tr>
        <td style="text-align: center;">5</td>
        <td><b>Đánh giá năng lực nhà cung cấp & Tiếp nhận IQC</b></td>
        <td>${review.scope_and_inputs?.supplier_performance || review.scope_and_inputs?.supplier_status || "Đánh giá 100% nhà cung ứng đạt chuẩn tiếp nhận nguyên liệu."}</td>
      </tr>
      <tr>
        <td style="text-align: center;">6</td>
        <td><b>Nhu cầu nguồn lực & Thay đổi bối cảnh</b></td>
        <td>${review.scope_and_inputs?.resource_needs || review.scope_and_inputs?.resource_adequacy || "Đảm bảo đủ nguồn lực trang thiết bị kiểm nghiệm và kinh phí đào tạo."}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">2. NỘI DUNG BIÊN BẢN CUỘC HỌP</div>
  <div style="font-size: 10pt; line-height: 1.5; white-space: pre-line; border: 1px solid #ccc; padding: 8px; margin-bottom: 12px; background: #fafafa;">
    ${review.meeting_minutes}
  </div>

  <div class="section-title">3. NGHỊ QUYẾT & QUYẾT ĐỊNH ĐẦU RA (ĐIỀU KHOẢN 9.3.3)</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 5%;">STT</th>
        <th>Nội Dung Quyết Định / Kế Hoạch Cải Tiến</th>
        <th style="width: 20%;">Người Phụ Trách</th>
        <th style="width: 15%;">Hạn Hoàn Thành</th>
        <th style="width: 15%;">Nguồn Lực</th>
      </tr>
    </thead>
    <tbody>
      ${
        review.decisions_and_actions?.length
          ? review.decisions_and_actions
              .map(
                (d, idx) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td>${d.decision_text}</td>
          <td>${d.assigned_to}</td>
          <td style="text-align: center;">${d.deadline}</td>
          <td style="text-align: center;">${d.resources_allocated || "Ngân sách phê duyệt"}</td>
        </tr>`
              )
              .join("")
          : `<tr><td colspan="5" style="text-align: center; color: #666;">Chưa có danh mục nghị quyết bổ sung.</td></tr>`
      }
    </tbody>
  </table>

  <table class="sign-table">
    <tr>
      <td>
        <div class="sign-role">THƯ KÝ CUỘC HỌP / TRƯỞNG BAN ISO</div>
        <div class="sign-name">${review.secretary_name}</div>
      </td>
      <td>
        <div class="sign-role">TỔNG GIÁM ĐỐC / CHỦ TRÌ PHÊ DUYỆT</div>
        <div class="sign-name">${review.chairperson_name}</div>
      </td>
    </tr>
  </table>

  <div class="footer-note">
    Biên bản này là hồ sơ bắt buộc của Hệ thống Quản lý An toàn thực phẩm ISO 22000:2018 và được lưu trữ tối thiểu 03 năm theo quy định kiểm soát hồ sơ Điều khoản 7.5.3.
  </div>
</body>
</html>
    `;
    printHtml(html);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      {/* Header & Main Actions */}
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title="Trung Tâm Điều Hành An Toàn Thực Phẩm Toàn Diện (ISO 22000:2018)"
          description="Bảng điều khiển chiến lược tích hợp 8 phân hệ nghiệp vụ · Đánh giá mức độ tuân thủ FSMS · Xem xét của Lãnh đạo (Điều 9.3) · Mục tiêu chất lượng & ATTP (Điều 6.2)"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSeedDefaults} className="gap-1.5 text-xs w-full sm:w-auto">
            <RefreshCw className="h-3.5 w-3.5" /> Dữ Liệu Thực Hành Mẫu
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowWorkflowModal(true)} className="gap-1.5 text-xs w-full sm:w-auto">
            <Workflow className="h-3.5 w-3.5 text-primary" /> Lưu Đồ Quy Trình Xem Xét
          </Button>
          <Button size="sm" onClick={() => setShowAddObjectiveModal(true)} className="gap-1.5 text-xs w-full sm:w-auto">
            <Target className="h-3.5 w-3.5" /> Lập Mục Tiêu Mới
          </Button>
          {selectedReview && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerPrintManagementReview(selectedReview)}
              className="gap-1.5 text-xs border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary w-full sm:w-auto"
            >
              <Printer className="h-3.5 w-3.5" /> In Báo Cáo BM-MR-01
            </Button>
          )}
        </div>
      </div>

      {/* 5 Hero KPI Scorecards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: FSMS Health Score */}
        <div className="rounded-2xl border bg-card/90 p-4 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chỉ Số Tuân Thủ FSMS</span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-600">
              {stats?.health_level === "EXCELLENT" ? "XUẤT SẮC" : stats?.health_level === "GOOD" ? "TỐT" : "CẦN LƯU Ý"}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {stats?.overall_health_score ?? 81.1}%
            </span>
            <span className="text-xs text-emerald-600 font-medium flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5" /> +2.4%
            </span>
          </div>
          <div className="mt-1.5 text-[11px] sm:text-xs text-muted-foreground">Tích hợp dữ liệu 8 phân hệ</div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
              style={{ width: `${stats?.overall_health_score ?? 81.1}%` }}
            />
          </div>
        </div>

        {/* Card 2: HACCP & CCP Control */}
        <div className="rounded-2xl border bg-card/90 p-4 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kiểm Soát Điểm CCP (Điều 8.5)</span>
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {stats?.haccp_ccp.in_control_rate ?? 100}%
            </span>
            <span className="text-xs text-muted-foreground">An toàn</span>
          </div>
          <div className="mt-1.5 text-[11px] sm:text-xs text-muted-foreground">
            {stats?.haccp_ccp.total_ccps ?? 4} điểm CCP · {stats?.haccp_ccp.critical_deviations ?? 0} sai lệch
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${stats?.haccp_ccp.in_control_rate ?? 100}%` }} />
          </div>
        </div>

        {/* Card 3: CAPA & NC Effectiveness */}
        <div className="rounded-2xl border bg-card/90 p-4 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hiệu Lực Khắc Phục CAPA (Điều 10.2)</span>
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {stats?.capa_nc.effectiveness_rate ?? 100}%
            </span>
            <span className="text-xs text-muted-foreground">Thẩm tra</span>
          </div>
          <div className="mt-1.5 text-[11px] sm:text-xs text-muted-foreground">
            {stats?.capa_nc.total_capas ?? 5} phiếu khắc phục đã đóng
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-amber-500" style={{ width: `${stats?.capa_nc.effectiveness_rate ?? 100}%` }} />
          </div>
        </div>

        {/* Card 4: PRP Hygiene Compliance */}
        <div className="rounded-2xl border bg-card/90 p-4 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vệ Sinh Nhà Xưởng PRP (Điều 8.2)</span>
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {stats?.prp_hygiene.compliance_rate ?? 96.5}%
            </span>
            <span className="text-xs text-muted-foreground">GMP/SSOP</span>
          </div>
          <div className="mt-1.5 text-[11px] sm:text-xs text-muted-foreground">
            {stats?.prp_hygiene.total_prps ?? 6} chương trình giám sát ca
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-emerald-500" style={{ width: `${stats?.prp_hygiene.compliance_rate ?? 96.5}%` }} />
          </div>
        </div>

        {/* Card 5: Training & Health Compliance */}
        <div className="rounded-2xl border bg-card/90 p-4 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Năng Lực Nhân Sự (Điều 7.2)</span>
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/10 text-sky-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {stats?.audit_training_health.training_pass_rate ?? 90.9}%
            </span>
            <span className="text-xs text-muted-foreground">Sát hạch</span>
          </div>
          <div className="mt-1.5 text-[11px] sm:text-xs text-muted-foreground">
            {stats?.audit_training_health.total_learners ?? 11} nhân sự · 100% đạt vệ sinh
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-sky-500" style={{ width: `${stats?.audit_training_health.training_pass_rate ?? 90.9}%` }} />
          </div>
        </div>
      </div>

      {/* Interactive Tabs Header - Responsive Scrollable on Mobile */}
      <div className="flex border-b border-border/80 text-xs sm:text-sm font-medium overflow-x-auto whitespace-nowrap scrollbar-none gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-4 py-2.5 sm:py-3 transition shrink-0 ${
            activeTab === "overview"
              ? "border-primary font-semibold text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-4 w-4" /> Tổng Quan Điều Hành & Ma Trận ATTP
        </button>
        <button
          onClick={() => setActiveTab("objectives")}
          className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-4 py-2.5 sm:py-3 transition shrink-0 ${
            activeTab === "objectives"
              ? "border-primary font-semibold text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Target className="h-4 w-4" /> Mục Tiêu Chất Lượng & ATTP (Điều 6.2)
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] sm:text-xs">{objectives.length}</span>
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-4 py-2.5 sm:py-3 transition shrink-0 ${
            activeTab === "reviews"
              ? "border-primary font-semibold text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" /> Xem Xét Của Lãnh Đạo (Điều 9.3)
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] sm:text-xs">{reviews.length}</span>
        </button>
        <button
          onClick={() => setActiveTab("ai_studio")}
          className={`flex items-center gap-1.5 sm:gap-2 border-b-2 px-3 sm:px-4 py-2.5 sm:py-3 transition shrink-0 ${
            activeTab === "ai_studio"
              ? "border-primary font-semibold text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-500" /> Cố Vấn Trí Tuệ Nhân Tạo ATTP
        </button>
      </div>

      {/* ==================== TAB 1: TỔNG QUAN ĐIỀU HÀNH & MA TRẬN ATTP ==================== */}
      {activeTab === "overview" && (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Trái: Ma trận 7 trụ cột tuân thủ */}
            <div className="rounded-2xl border bg-card p-4 sm:p-5 lg:col-span-2 shadow-sm">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="font-bold text-foreground text-sm sm:text-base">Ma Trận Tuân Thủ 7 Trụ Cột ISO 22000:2018</h3>
                  <p className="text-xs text-muted-foreground">Độ bao phủ và tuân thủ theo các nhóm điều khoản tiêu chuẩn quốc tế</p>
                </div>
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/30 w-fit">
                  Đánh Giá Toàn Diện
                </Badge>
              </div>

              {/* Sơ đồ đa giác Radar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-center">
                <div className="relative flex items-center justify-center p-2">
                  <svg viewBox="0 0 240 240" className="w-full max-w-[220px] sm:max-w-[240px] h-auto overflow-visible">
                    <polygon points="120,20 206,70 206,170 120,220 34,170 34,70" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
                    <polygon points="120,45 185,83 185,158 120,195 55,158 55,83" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
                    <polygon points="120,70 163,95 163,145 120,170 77,145 77,95" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
                    <line x1="120" y1="120" x2="120" y2="20" stroke="currentColor" strokeOpacity="0.15" />
                    <line x1="120" y1="120" x2="206" y2="70" stroke="currentColor" strokeOpacity="0.15" />
                    <line x1="120" y1="120" x2="206" y2="170" stroke="currentColor" strokeOpacity="0.15" />
                    <line x1="120" y1="120" x2="120" y2="220" stroke="currentColor" strokeOpacity="0.15" />
                    <line x1="120" y1="120" x2="34" y2="170" stroke="currentColor" strokeOpacity="0.15" />
                    <line x1="120" y1="120" x2="34" y2="70" stroke="currentColor" strokeOpacity="0.15" />

                    <polygon
                      points="120,26 206,70 198,165 120,203 72,148 68,90"
                      fill="oklch(0.62 0.16 152 / 0.35)"
                      stroke="oklch(0.62 0.16 152)"
                      strokeWidth="2"
                    />
                    <circle cx="120" cy="26" r="3.5" fill="oklch(0.62 0.16 152)" />
                    <circle cx="206" cy="70" r="3.5" fill="oklch(0.62 0.16 152)" />
                    <circle cx="198" cy="165" r="3.5" fill="oklch(0.62 0.16 152)" />
                    <circle cx="120" cy="203" r="3.5" fill="oklch(0.62 0.16 152)" />
                    <circle cx="72" cy="148" r="3.5" fill="oklch(0.62 0.16 152)" />
                    <circle cx="68" cy="90" r="3.5" fill="oklch(0.62 0.16 152)" />
                  </svg>
                </div>

                {/* Chi tiết từng trụ cột */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-medium text-muted-foreground">1. Bối cảnh & Lãnh đạo (Điều 4 & 5)</span>
                    <span className="font-bold text-emerald-600">94.0%</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-medium text-muted-foreground">2. Kế hoạch & Điểm CCP (Điều 6 & 8.5)</span>
                    <span className="font-bold text-emerald-600">{stats?.radar_pillars.planning_haccp ?? 100}%</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-medium text-muted-foreground">3. Nguồn lực & Đào tạo (Điều 7)</span>
                    <span className="font-bold text-emerald-600">{stats?.radar_pillars.support_training ?? 95.5}%</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-medium text-muted-foreground">4. Vận hành & Vệ sinh PRP (Điều 8)</span>
                    <span className="font-bold text-emerald-600">{stats?.radar_pillars.operation_prp ?? 83.3}%</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-medium text-muted-foreground">5. Đánh giá hiệu năng (Điều 9)</span>
                    <span className="font-bold text-amber-600">{stats?.radar_pillars.performance_audit ?? 55.6}%</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-medium text-muted-foreground">6. Cải tiến & Khắc phục CAPA (Điều 10)</span>
                    <span className="font-bold text-amber-600">{stats?.radar_pillars.improvement_capa ?? 60.0}%</span>
                  </div>
                  <div className="flex items-center justify-between pb-1">
                    <span className="font-medium text-muted-foreground">7. Chuỗi cung ứng & Kho hàng</span>
                    <span className="font-bold text-emerald-600">{stats?.radar_pillars.supply_traceability ?? 71.4}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Phải: Trung tâm cảnh báo sự cố khẩn cấp */}
            <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-foreground flex items-center gap-2 text-sm sm:text-base">
                    <AlertCircle className="h-4 w-4 text-destructive" /> Cảnh Báo Khẩn Cấp (Thời Gian Thực)
                  </h3>
                  <Badge variant="destructive" className="text-xs">
                    {alerts.length} Sự Cố
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Các điểm nghẽn và sự cố cần Ban Giám Đốc và Trưởng ban QA chỉ đạo ngay</p>

                <div className="space-y-2.5 overflow-y-auto max-h-[260px] pr-1">
                  {alerts.map((al) => (
                    <div
                      key={al.alert_id}
                      className={`rounded-xl border p-2.5 sm:p-3 text-xs transition ${
                        al.severity === "CRITICAL"
                          ? "border-destructive/30 bg-destructive/5 text-destructive"
                          : "border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span>{al.title}</span>
                        <span className="text-[10px] opacity-75">{al.timestamp}</span>
                      </div>
                      <p className="mt-1 text-[11px] opacity-90 leading-relaxed">{al.description}</p>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="text-center py-8 text-xs text-muted-foreground">
                      ✓ Hiện tại hệ thống không ghi nhận cảnh báo khẩn cấp nào.
                    </div>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full text-xs gap-1.5"
                onClick={() => setActiveTab("ai_studio")}
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Phân Tích Rủi Ro Với Cố Vấn AI
              </Button>
            </div>
          </div>

          {/* Lưới 8 phân hệ nghiệp vụ kết nối */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Tình Trạng Kết Nối 8 Phân Hệ Nghiệp Vụ
            </h3>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-xl border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>1. Tài liệu & Quy trình (Điều 7.5)</span>
                  <FileText className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="mt-2 text-lg font-bold">{stats?.documents.approved_documents ?? 9} / {stats?.documents.total_documents ?? 21}</div>
                <div className="text-[11px] text-muted-foreground">Tài liệu đã ban hành</div>
              </div>

              <div className="rounded-xl border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>2. Mua hàng & Tiếp nhận (Điều 7.1.6)</span>
                  <Truck className="h-3.5 w-3.5 text-sky-600" />
                </div>
                <div className="mt-2 text-lg font-bold">{stats?.purchasing_iqc.lot_pass_rate ?? 71.4}%</div>
                <div className="text-[11px] text-muted-foreground">{stats?.purchasing_iqc.total_suppliers ?? 8} Nhà cung cấp</div>
              </div>

              <div className="rounded-xl border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>3. Kế hoạch HACCP & Điểm CCP (Điều 8.5)</span>
                  <Flame className="h-3.5 w-3.5 text-rose-600" />
                </div>
                <div className="mt-2 text-lg font-bold">{stats?.haccp_ccp.in_control_rate ?? 100}%</div>
                <div className="text-[11px] text-muted-foreground">{stats?.haccp_ccp.total_ccps ?? 4} Điểm CCP an toàn</div>
              </div>

              <div className="rounded-xl border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>4. Chương trình PRP (Điều 8.2)</span>
                  <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="mt-2 text-lg font-bold">{stats?.prp_hygiene.compliance_rate ?? 83.3}%</div>
                <div className="text-[11px] text-muted-foreground">{stats?.prp_hygiene.total_prps ?? 6} Quy trình GMP/SSOP</div>
              </div>

              <div className="rounded-xl border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>5. Thiết bị & Đo lường (Điều 7.1.5)</span>
                  <Sliders className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div className="mt-2 text-lg font-bold">{stats?.equipment_calibration.calibration_pass_rate ?? 100}%</div>
                <div className="text-[11px] text-muted-foreground">{stats?.equipment_calibration.total_equipment ?? 7} Thiết bị kiểm định</div>
              </div>

              <div className="rounded-xl border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>6. Kho hàng & Truy xuất (Điều 8.3)</span>
                  <Search className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div className="mt-2 text-lg font-bold">{stats?.inventory_traceability.total_batches ?? 1} Lô SX</div>
                <div className="text-[11px] text-muted-foreground">Xuất nhập tồn theo hạn dùng</div>
              </div>

              <div className="rounded-xl border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>7. Sự cố & Khắc phục CAPA (Điều 10.2)</span>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="mt-2 text-lg font-bold">{stats?.capa_nc.effectiveness_rate ?? 60.0}%</div>
                <div className="text-[11px] text-muted-foreground">{stats?.capa_nc.total_capas ?? 5} Phiếu khắc phục</div>
              </div>

              <div className="rounded-xl border bg-card p-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>8. Đánh giá nội bộ & Đào tạo (Điều 9.2)</span>
                  <Users className="h-3.5 w-3.5 text-teal-600" />
                </div>
                <div className="mt-2 text-lg font-bold">{stats?.audit_training_health.training_pass_rate ?? 90.9}%</div>
                <div className="text-[11px] text-muted-foreground">{stats?.audit_training_health.total_audits ?? 3} Đợt đánh giá</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: MỤC TIÊU CHẤT LƯỢNG & ATTP (ĐIỀU 6.2) ==================== */}
      {activeTab === "objectives" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/40 p-4 rounded-xl border">
            <div>
              <h3 className="font-bold text-foreground text-sm">Mục Tiêu An Toàn Thực Phẩm & Chất Lượng Năm 2026</h3>
              <p className="text-xs text-muted-foreground">Theo dõi và đo lường định lượng các chỉ tiêu chất lượng theo Điều khoản 6.2</p>
            </div>
            <Button size="sm" onClick={() => setShowAddObjectiveModal(true)} className="gap-1.5 text-xs w-full sm:w-auto">
              <Plus className="h-3.5 w-3.5" /> Thêm Mục Tiêu Mới
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm -mx-3 sm:mx-0">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Mã Chỉ Tiêu</th>
                  <th className="py-3 px-4">Tên Chỉ Tiêu Chất Lượng & ATTP</th>
                  <th className="py-3 px-4">Căn Cứ</th>
                  <th className="py-3 px-4">Phòng Ban Chủ Trì</th>
                  <th className="py-3 px-4 text-center">Kế Hoạch</th>
                  <th className="py-3 px-4 text-center">Thực Tế</th>
                  <th className="py-3 px-4 text-center">Tiến Độ</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                  <th className="py-3 px-4">Người Phụ Trách</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {objectives.map((obj) => {
                  const progressPct = obj.target_value > 0 ? Math.min(100, Math.round((obj.actual_value / obj.target_value) * 100)) : 100;
                  return (
                    <tr key={obj.objective_id} className="hover:bg-muted/20 transition">
                      <td className="py-3 px-4 font-bold text-primary">{obj.objective_code}</td>
                      <td className="py-3 px-4 font-medium max-w-xs">
                        <div>{obj.metric_name}</div>
                        {obj.action_plan && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 italic">
                            Biện pháp: {obj.action_plan}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono">{obj.clause_reference}</td>
                      <td className="py-3 px-4">{obj.department}</td>
                      <td className="py-3 px-4 text-center font-bold">{obj.target_value} {obj.unit}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">{obj.actual_value} {obj.unit}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="w-20 mx-auto">
                          <div className="text-[10px] text-muted-foreground font-semibold mb-1">{progressPct}%</div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                progressPct >= 100 ? "bg-emerald-500" : progressPct >= 75 ? "bg-primary" : "bg-amber-500"
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            obj.status === "ACHIEVED"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : obj.status === "ON_TRACK"
                              ? "bg-primary/10 text-primary"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {obj.status === "ACHIEVED" ? "ĐẠT MỤC TIÊU" : obj.status === "ON_TRACK" ? "ĐANG THỰC HIỆN" : "CẦN CHÚ Ý"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{obj.responsible_person}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: XEM XÉT CỦA LÃNH ĐẠO (ĐIỀU 9.3) ==================== */}
      {activeTab === "reviews" && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Trái: Danh sách các kỳ họp */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-sm">Các Kỳ Họp Xem Xét</h3>
              <Button size="sm" variant="outline" onClick={() => setShowAddReviewModal(true)} className="gap-1 text-xs">
                <Plus className="h-3 w-3" /> Lập Biên Bản
              </Button>
            </div>

            <div className="space-y-2">
              {reviews.map((rev) => (
                <div
                  key={rev.review_id}
                  onClick={() => setSelectedReview(rev)}
                  className={`cursor-pointer rounded-xl border p-3 text-xs transition ${
                    selectedReview?.review_id === rev.review_id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-primary">{rev.review_code}</span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                      {rev.status === "APPROVED" ? "ĐÃ PHÊ DUYỆT" : rev.status}
                    </Badge>
                  </div>
                  <div className="mt-1 font-semibold text-foreground">{rev.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Ngày họp: {rev.meeting_date}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Phải: Chi tiết biên bản và 6 đầu vào */}
          {selectedReview && (
            <div className="rounded-2xl border bg-card p-4 sm:p-5 lg:col-span-2 shadow-sm space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary">{selectedReview.review_code}</Badge>
                    <h3 className="font-bold text-foreground text-sm sm:text-base">{selectedReview.title}</h3>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Chủ trì: <b>{selectedReview.chairperson_name}</b> · Thư ký: <b>{selectedReview.secretary_name}</b> · Ngày: <b>{selectedReview.meeting_date}</b>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => triggerPrintManagementReview(selectedReview)}
                  className="gap-1.5 text-xs shadow-sm w-full sm:w-auto"
                >
                  <Printer className="h-3.5 w-3.5" /> In Biểu Mẫu BM-MR-01
                </Button>
              </div>

              {/* 6 Nhóm đầu vào xem xét (Điều 9.3.2) */}
              <div>
                <h4 className="text-xs font-bold uppercase text-primary tracking-wider mb-2">
                  Tổng Hợp 6 Nhóm Đầu Vào Xem Xét (Điều Khoản 9.3.2)
                </h4>
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 text-xs">
                  <div className="rounded-lg border p-2.5 bg-muted/20">
                    <div className="font-semibold text-foreground">1. Đánh giá nội bộ & Pháp lý:</div>
                    <div className="text-muted-foreground mt-0.5">{selectedReview.scope_and_inputs?.audit_results || selectedReview.scope_and_inputs?.audit_summary}</div>
                  </div>
                  <div className="rounded-lg border p-2.5 bg-muted/20">
                    <div className="font-semibold text-foreground">2. Phản hồi khách hàng:</div>
                    <div className="text-muted-foreground mt-0.5">{selectedReview.scope_and_inputs?.customer_feedback}</div>
                  </div>
                  <div className="rounded-lg border p-2.5 bg-muted/20">
                    <div className="font-semibold text-foreground">3. Hiệu năng điểm CCP & Vệ sinh PRP:</div>
                    <div className="text-muted-foreground mt-0.5">{selectedReview.scope_and_inputs?.ccp_prp_status || selectedReview.scope_and_inputs?.ccp_prp_performance}</div>
                  </div>
                  <div className="rounded-lg border p-2.5 bg-muted/20">
                    <div className="font-semibold text-foreground">4. Hiệu lực hành động khắc phục:</div>
                    <div className="text-muted-foreground mt-0.5">{selectedReview.scope_and_inputs?.capa_effectiveness}</div>
                  </div>
                  <div className="rounded-lg border p-2.5 bg-muted/20">
                    <div className="font-semibold text-foreground">5. Nhà cung cấp & Tiếp nhận nguyên liệu:</div>
                    <div className="text-muted-foreground mt-0.5">{selectedReview.scope_and_inputs?.supplier_performance || selectedReview.scope_and_inputs?.supplier_status}</div>
                  </div>
                  <div className="rounded-lg border p-2.5 bg-muted/20">
                    <div className="font-semibold text-foreground">6. Nguồn lực & Thay đổi bối cảnh:</div>
                    <div className="text-muted-foreground mt-0.5">{selectedReview.scope_and_inputs?.resource_needs || selectedReview.scope_and_inputs?.resource_adequacy}</div>
                  </div>
                </div>
              </div>

              {/* Nội dung biên bản */}
              <div>
                <h4 className="text-xs font-bold uppercase text-primary tracking-wider mb-2">Nội Dung Biên Bản Cuộc Họp</h4>
                <div className="rounded-xl border p-3 text-xs leading-relaxed text-foreground bg-muted/10 whitespace-pre-line">
                  {selectedReview.meeting_minutes}
                </div>
              </div>

              {/* Nghị quyết & Quyết định đầu ra (Điều 9.3.3) */}
              <div>
                <h4 className="text-xs font-bold uppercase text-primary tracking-wider mb-2">
                  Nghị Quyết & Quyết Định Đầu Ra (Điều Khoản 9.3.3)
                </h4>
                <div className="overflow-x-auto rounded-xl border -mx-3 sm:mx-0">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="bg-muted/50 text-muted-foreground border-b">
                      <tr>
                        <th className="py-2.5 px-3">Quyết định / Kế hoạch cải tiến</th>
                        <th className="py-2.5 px-3">Phụ trách</th>
                        <th className="py-2.5 px-3">Hạn chót</th>
                        <th className="py-2.5 px-3">Nguồn lực</th>
                        <th className="py-2.5 px-3 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedReview.decisions_and_actions?.map((dec, i) => (
                        <tr key={i}>
                          <td className="py-2.5 px-3 font-medium">{dec.decision_text}</td>
                          <td className="py-2.5 px-3">{dec.assigned_to}</td>
                          <td className="py-2.5 px-3 font-mono">{dec.deadline}</td>
                          <td className="py-2.5 px-3">{dec.resources_allocated}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                              {dec.status === "COMPLETED" ? "ĐÃ HOÀN THÀNH" : "ĐANG THỰC HIỆN"}
                            </span>
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

      {/* ==================== TAB 4: TRỢ LÝ TRÍ TUỆ NHÂN TẠO ATTP ==================== */}
      {activeTab === "ai_studio" && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          {/* AI Công cụ 1: Dự báo độ sẵn sàng */}
          <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Dự Báo Độ Sẵn Sàng Tái Đánh Giá Chứng Nhận</h3>
                  <p className="text-xs text-muted-foreground">Tổng hợp dữ liệu đối chiếu chuẩn ISO 22000:2018</p>
                </div>
              </div>
              <Button size="sm" onClick={runAuditForecast} disabled={forecastLoading} className="gap-1.5 text-xs w-full sm:w-auto">
                {forecastLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Chạy Dự Báo
              </Button>
            </div>

            {forecastResult ? (
              <div className="space-y-3 rounded-xl border bg-primary/5 p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Điểm Sẵn Sàng:</span>
                  <span className="text-xl font-extrabold text-primary">{forecastResult.readiness_percentage}%</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{forecastResult.overall_assessment}</p>

                <div className="mt-3">
                  <span className="font-bold text-destructive">Điểm Cần Khắc Phục Ngay:</span>
                  <ul className="mt-1 space-y-1 pl-4 list-disc text-muted-foreground">
                    {forecastResult.top_critical_risks?.map((r: any, idx: number) => (
                      <li key={idx}>
                        <b>{r.clause} - {r.risk_title}:</b> {r.remediation}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                Nhấn "Chạy Dự Báo" để phân tích độ sẵn sàng cho đợt tái đánh giá chứng nhận ISO 22000:2018.
              </div>
            )}
          </div>

          {/* AI Công cụ 2: Tự động lập biên bản xem xét lãnh đạo */}
          <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Tự Động Sinh Báo Cáo Xem Xét Lãnh Đạo</h3>
                  <p className="text-xs text-muted-foreground">Tổng hợp văn bản chuẩn hóa theo Điều khoản 9.3</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={runGenerateReport} disabled={reportLoading} className="gap-1.5 text-xs w-full sm:w-auto">
                {reportLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-emerald-600" />}
                Sinh Báo Cáo
              </Button>
            </div>

            {reportResult ? (
              <div className="space-y-3 rounded-xl border bg-emerald-500/5 p-4 text-xs">
                <div className="font-bold text-foreground">{reportResult.report_title}</div>
                <p className="text-muted-foreground leading-relaxed">{reportResult.executive_summary}</p>
                <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Đề xuất nguồn lực: {reportResult.resource_allocation_advice}
                </div>
                <Button
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    const sampleReview: ManagementReview = {
                      review_id: "preview-ai",
                      review_code: "MR-AI-2026",
                      title: reportResult.report_title,
                      meeting_date: new Date().toISOString().split("T")[0],
                      chairperson_name: "Tổng Giám Đốc Trần Văn Hùng",
                      secretary_name: "Trưởng Ban ISO Nguyễn Văn An",
                      participants: [
                        { name: "Trần Văn Hùng", role: "Tổng Giám Đốc", dept: "Ban Giám Đốc", attendance: "CÓ MẶT" },
                        { name: "Nguyễn Văn An", role: "Trưởng Ban ISO", dept: "Phòng QA", attendance: "CÓ MẶT" },
                      ],
                      scope_and_inputs: reportResult.inputs_review_synthesis,
                      meeting_minutes: reportResult.full_markdown_report,
                      decisions_and_actions: reportResult.outputs_decisions_recommendations?.map((d: any, i: number) => ({
                        action_id: `ACT-AI-${i}`,
                        decision_text: d.decision,
                        assigned_to: d.responsible,
                        deadline: "2026-12-31",
                        resources_allocated: "Phê duyệt nguồn lực",
                        status: "IN_PROGRESS",
                      })),
                      status: "APPROVED",
                    };
                    triggerPrintManagementReview(sampleReview);
                  }}
                >
                  <Printer className="h-3.5 w-3.5 mr-1.5" /> In Báo Cáo Đã Sinh Ra (BM-MR-01)
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                Nhấn "Sinh Báo Cáo" để tổng hợp tự động dự thảo Xem xét của Lãnh đạo BM-MR-01.
              </div>
            )}
          </div>

          {/* AI Công cụ 3: Khung trao đổi cố vấn ATTP */}
          <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-sm space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Cố Vấn AI Phân Tích Hồ Sơ Dữ Liệu ATTP Cho Ban Lãnh Đạo</h3>
                <p className="text-xs text-muted-foreground">Truy vấn và đối chiếu chéo thông tin giữa các bộ phận chuyên môn</p>
              </div>
            </div>

            {/* Khung tin nhắn */}
            <div className="rounded-xl border bg-muted/20 p-3 sm:p-4 space-y-3 max-h-[280px] overflow-y-auto">
              {chatHistory.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Đặt câu hỏi cho Cố vấn AI, ví dụ: <i>"Phân tích tình hình kiểm soát các điểm CCP trong kỳ vừa qua?"</i> hoặc <i>"Có nhà cung cấp nào rủi ro cao cần kiểm tra lại không?"</i>
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[90%] sm:max-w-[80%] rounded-xl p-3 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground font-medium"
                          : "bg-card border shadow-sm text-foreground"
                      }`}
                    >
                      {msg.text}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50 text-[10px] opacity-80">
                          <b>Căn cứ hồ sơ:</b> {msg.citations.map((c: any) => `${c.module} (${c.standard})`).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Ô nhập câu hỏi */}
            <form onSubmit={runChatAdvisor} className="flex gap-2">
              <Input
                placeholder="Nhập câu hỏi nghiệp vụ quản lý ATTP của Ban Giám Đốc..."
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                className="text-xs"
              />
              <Button type="submit" size="sm" disabled={chatLoading} className="gap-1 text-xs shrink-0">
                {chatLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Gửi
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CỬA SỔ MODAL: LẬP MỤC TIÊU CHẤT LƯỢNG ==================== */}
      {showAddObjectiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border bg-card p-4 sm:p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Lập Mục Tiêu Chất Lượng & ATTP Mới
              </h3>
              <button onClick={() => setShowAddObjectiveModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateObjective} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold">Mã Mục Tiêu *</label>
                <Input required placeholder="OBJ-2026-06" value={newObjCode} onChange={(e) => setNewObjCode(e.target.value)} className="mt-1 text-xs" />
              </div>
              <div>
                <label className="font-semibold">Tên Chỉ Tiêu Chất Lượng / ATTP *</label>
                <Input required placeholder="Tỷ lệ tuân thủ GMP phân xưởng >= 98%" value={newObjMetric} onChange={(e) => setNewObjMetric(e.target.value)} className="mt-1 text-xs" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold">Điều Khoản Tiêu Chuẩn</label>
                  <Input placeholder="Điều 6.2 / Điều 8.2" value={newObjClause} onChange={(e) => setNewObjClause(e.target.value)} className="mt-1 text-xs" />
                </div>
                <div>
                  <label className="font-semibold">Phòng Ban Chủ Trì</label>
                  <select
                    value={newObjDept}
                    onChange={(e) => setNewObjDept(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold">Kế Hoạch</label>
                  <Input type="number" step="0.1" value={newObjTarget} onChange={(e) => setNewObjTarget(Number(e.target.value))} className="mt-1 text-xs" />
                </div>
                <div>
                  <label className="font-semibold">Thực Tế</label>
                  <Input type="number" step="0.1" value={newObjActual} onChange={(e) => setNewObjActual(Number(e.target.value))} className="mt-1 text-xs" />
                </div>
                <div>
                  <label className="font-semibold">Đơn Vị</label>
                  <Input value={newObjUnit} onChange={(e) => setNewObjUnit(e.target.value)} className="mt-1 text-xs" />
                </div>
              </div>
              <div>
                <label className="font-semibold">Kế Hoạch / Biện Pháp Thực Hiện</label>
                <Input placeholder="Biện pháp cụ thể để đạt chỉ tiêu..." value={newObjAction} onChange={(e) => setNewObjAction(e.target.value)} className="mt-1 text-xs" />
              </div>
              <div>
                <label className="font-semibold">Người Chịu Trách Nhiệm</label>
                <Input value={newObjPerson} onChange={(e) => setNewObjPerson(e.target.value)} className="mt-1 text-xs" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddObjectiveModal(false)}>Hủy</Button>
                <Button type="submit" size="sm">Lưu Mục Tiêu</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CỬA SỔ MODAL: LẬP BIÊN BẢN HỌP LÃNH ĐẠO ==================== */}
      {showAddReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border bg-card p-4 sm:p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Lập Biên Bản Họp Xem Xét Của Lãnh Đạo
              </h3>
              <button onClick={() => setShowAddReviewModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateReview} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold">Mã Kỳ Họp *</label>
                  <Input required placeholder="MR-2026-Q2" value={newRevCode} onChange={(e) => setNewRevCode(e.target.value)} className="mt-1 text-xs" />
                </div>
                <div>
                  <label className="font-semibold">Ngày Họp *</label>
                  <Input type="date" value={newRevDate} onChange={(e) => setNewRevDate(e.target.value)} className="mt-1 text-xs" />
                </div>
              </div>
              <div>
                <label className="font-semibold">Tiêu Đề Cuộc Họp *</label>
                <Input required placeholder="Họp Xem Xét Của Lãnh Đạo Quý 2/2026 Hệ Thống FSMS" value={newRevTitle} onChange={(e) => setNewRevTitle(e.target.value)} className="mt-1 text-xs" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold">Chủ Trì (Tổng Giám Đốc)</label>
                  <Input value={newRevChair} onChange={(e) => setNewRevChair(e.target.value)} className="mt-1 text-xs" />
                </div>
                <div>
                  <label className="font-semibold">Thư Ký (Trưởng Ban ISO)</label>
                  <Input value={newRevSec} onChange={(e) => setNewRevSec(e.target.value)} className="mt-1 text-xs" />
                </div>
              </div>
              <div>
                <label className="font-semibold">Nội Dung Biên Bản Chi Tiết</label>
                <textarea
                  rows={4}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm"
                  placeholder="Ghi nhận nội dung thảo luận, đánh giá hiệu lực 6 nhóm đầu vào..."
                  value={newRevMinutes}
                  onChange={(e) => setNewRevMinutes(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddReviewModal(false)}>Hủy</Button>
                <Button type="submit" size="sm">Tạo Biên Bản</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CỬA SỔ MODAL: LƯU ĐỒ QUY TRÌNH XEM XÉT LÃNH ĐẠO ==================== */}
      {showWorkflowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-card p-4 sm:p-6 shadow-xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-primary shrink-0" />
                <h3 className="font-bold text-foreground text-sm">Lưu Đồ Quy Trình Xem Xét Của Lãnh Đạo (Điều 9.3)</h3>
              </div>
              <button onClick={() => setShowWorkflowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border p-3 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between font-bold text-primary">
                  <span>BƯỚC 1: THU THẬP 6 ĐẦU VÀO</span>
                  <Badge variant="outline" className="text-[10px]">Điều 9.3.2</Badge>
                </div>
                <p className="text-muted-foreground leading-relaxed">Trưởng ban ISO tổng hợp kết quả ĐGNB, CAPA, điểm CCP/PRP, ý kiến khách hàng và nhà cung ứng.</p>
              </div>

              <div className="rounded-xl border p-3 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between font-bold text-primary">
                  <span>BƯỚC 2: HỌP BAN LÃNH ĐẠO</span>
                  <Badge variant="outline" className="text-[10px]">Định Kỳ</Badge>
                </div>
                <p className="text-muted-foreground leading-relaxed">Tổng Giám Đốc chủ trì, xem xét tính phù hợp, thỏa đáng và hiệu lực của hệ thống FSMS.</p>
              </div>

              <div className="rounded-xl border p-3 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between font-bold text-primary">
                  <span>BƯỚC 3: RA NGHỊ QUYẾT ĐẦU RA</span>
                  <Badge variant="outline" className="text-[10px]">Điều 9.3.3</Badge>
                </div>
                <p className="text-muted-foreground leading-relaxed">Phê duyệt quyết định cải tiến hệ thống, phân bổ ngân sách và nguồn lực thiết bị kiểm nghiệm.</p>
              </div>

              <div className="rounded-xl border p-3 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between font-bold text-primary">
                  <span>BƯỚC 4: GIÁM SÁT THỰC HIỆN</span>
                  <Badge variant="outline" className="text-[10px]">Định Kỳ</Badge>
                </div>
                <p className="text-muted-foreground leading-relaxed">Giám sát tiến độ hoàn thành các nghị quyết và báo cáo kết quả trong kỳ họp kế tiếp.</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <Button size="sm" onClick={() => setShowWorkflowModal(false)}>Đóng</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
