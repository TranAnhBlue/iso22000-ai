import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GitCompare,
  Plus,
  Search,
  Filter,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Calendar,
  User,
  Building2,
  TrendingUp,
  X,
  Edit,
  Trash2,
  Check,
  Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { printHtml } from "@/lib/print";

export const Route = createFileRoute("/change-management")({
  head: () => ({
    meta: [
      { title: "Quản Lý Hoạch Định Sự Thay Đổi – WCERT ISO 22000:2018" },
      { name: "description", content: "Hệ thống quản lý và đánh giá tác động của mọi sự thay đổi tới kế hoạch HACCP, PRP và an toàn thực phẩm theo ISO 22000:2018 Điều khoản 6.3." },
    ],
  }),
  component: () => (
    <AppShell module="change_management">
      <ChangeManagementPage />
    </AppShell>
  ),
});

interface ChangeRequestItem {
  change_id: string;
  change_code: string;
  title: string;
  change_type: string;
  description: string;
  reason: string;
  impact_assessment: {
    affects_haccp_plan?: boolean;
    affects_prp?: boolean;
    affected_document_ids?: string[];
    food_safety_impact_level?: "LOW" | "MEDIUM" | "HIGH";
  };
  proposed_by_name: string;
  proposed_date: string;
  review_status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "IMPLEMENTED";
  approved_by_name?: string;
  approval_date?: string;
  implementation_plan?: string;
  implementation_date?: string;
  verification_result?: string;
  verified_by_name?: string;
  related_ccp_ids?: string[];
  related_document_ids?: string[];
  created_at?: string;
}

interface ChangeStats {
  total: number;
  draft: number;
  under_review: number;
  approved: number;
  implemented: number;
  high_impact: number;
}

const CHANGE_TYPES: Record<string, { label: string; color: string }> = {
  PRODUCT_NEW: { label: "Sản phẩm mới", color: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  EQUIPMENT_NEW: { label: "Thiết bị / Máy móc mới", color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  REGULATION_UPDATE: { label: "Quy định / Luật ATTP mới", color: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  PROCESS_CHANGE: { label: "Thay đổi quy trình chế biến", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  SUPPLIER_CHANGE: { label: "Thay đổi nhà cung ứng", color: "bg-sky-500/10 text-sky-700 border-sky-500/20" },
  RAW_MATERIAL_CHANGE: { label: "Thay đổi nguyên liệu / bao bì", color: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20" },
  OTHER: { label: "Thay đổi khác", color: "bg-slate-500/10 text-slate-700 border-slate-500/20" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Dự thảo", color: "bg-slate-500/10 text-slate-700 border-slate-500/20", icon: Clock },
  UNDER_REVIEW: { label: "Đang đánh giá", color: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: AlertTriangle },
  APPROVED: { label: "Đã phê duyệt", color: "bg-blue-500/10 text-blue-700 border-blue-500/20", icon: CheckCircle2 },
  IMPLEMENTED: { label: "Đã triển khai & Thẩm tra", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: ShieldCheck },
  REJECTED: { label: "Từ chối", color: "bg-rose-500/10 text-rose-700 border-rose-500/20", icon: X },
};

function ChangeManagementPage() {
  const [requests, setRequests] = useState<ChangeRequestItem[]>([]);
  const [stats, setStats] = useState<ChangeStats>({
    total: 0,
    draft: 0,
    under_review: 0,
    approved: 0,
    implemented: 0,
    high_impact: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCR, setSelectedCR] = useState<ChangeRequestItem | null>(null);

  // Form
  const [formData, setFormData] = useState({
    title: "",
    change_type: "EQUIPMENT_NEW",
    description: "",
    reason: "",
    affects_haccp_plan: false,
    affects_prp: false,
    food_safety_impact_level: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    affected_docs: "",
    proposed_by_name: "Lê Hoàng Nam (QA Lead)",
    proposed_date: new Date().toISOString().split("T")[0],
    implementation_plan: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resReqs, resStats] = await Promise.all([
        api.get("/change-management/requests"),
        api.get("/change-management/stats"),
      ]);
      setRequests(resReqs.data || []);
      setStats(resStats.data || { total: 0, draft: 0, under_review: 0, approved: 0, implemented: 0, high_impact: 0 });
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể tải danh sách phiếu thay đổi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchSearch =
        search === "" ||
        r.change_code.toLowerCase().includes(search.toLowerCase()) ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.proposed_by_name.toLowerCase().includes(search.toLowerCase());

      const matchType = typeFilter === "ALL" || r.change_type === typeFilter;
      const matchStatus = statusFilter === "ALL" || r.review_status === statusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [requests, search, typeFilter, statusFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        change_type: formData.change_type,
        description: formData.description,
        reason: formData.reason,
        impact_assessment: {
          affects_haccp_plan: formData.affects_haccp_plan,
          affects_prp: formData.affects_prp,
          affected_document_ids: formData.affected_docs
            ? formData.affected_docs.split(",").map((s) => s.trim())
            : [],
          food_safety_impact_level: formData.food_safety_impact_level,
        },
        proposed_by_name: formData.proposed_by_name,
        proposed_date: formData.proposed_date,
        implementation_plan: formData.implementation_plan,
        review_status: "DRAFT",
      };

      await api.post("/change-management/requests", payload);
      toast.success("Đã lập phiếu yêu cầu thay đổi mới thành công");
      setCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Lỗi khi lưu phiếu yêu cầu thay đổi");
    }
  };

  const handleUpdateStatus = async (
    change_id: string,
    nextStatus: string,
    actorName: string,
    note?: string
  ) => {
    try {
      await api.patch(`/change-management/requests/${change_id}/status`, {
        status: nextStatus,
        actor_name: actorName,
        note,
      });
      toast.success(`Đã cập nhật trạng thái sang: ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`);
      if (selectedCR && selectedCR.change_id === change_id) {
        setSelectedCR((prev) => (prev ? { ...prev, review_status: nextStatus as any } : null));
      }
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Lỗi khi cập nhật trạng thái");
    }
  };

  const handleDelete = async (change_id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phiếu yêu cầu thay đổi này?")) return;
    try {
      await api.delete(`/change-management/requests/${change_id}`);
      toast.success("Đã xóa phiếu thay đổi thành công");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể xóa phiếu thay đổi");
    }
  };

  // IN BIỂU MẪU BM-CHANGE-01 (ISO 22000 Clause 6.3)
  const handlePrint = (r: ChangeRequestItem) => {
    const html = `
      <div style="font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #111; max-width: 800px; margin: 0 auto; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #333; padding: 8px;">
              <strong style="font-size: 13pt; color: #047857;">WCERT FOOD</strong><br/>
              <span style="font-size: 9pt;">HỆ THỐNG FSMS ISO 22000</span>
            </td>
            <td style="width: 50%; text-align: center; border: 1px solid #333; padding: 8px;">
              <strong style="font-size: 13pt; text-transform: uppercase;">PHIẾU YÊU CẦU & ĐÁNH GIÁ SỰ THAY ĐỔI</strong><br/>
              <span style="font-size: 10pt; font-weight: bold;">(Căn cứ Điều khoản 6.3 Tiêu chuẩn ISO 22000:2018)</span>
            </td>
            <td style="width: 25%; border: 1px solid #333; padding: 8px; font-size: 9.5pt;">
              Biểu mẫu: <strong>BM-CHANGE-01</strong><br/>
              Mã phiếu: <strong>${r.change_code}</strong><br/>
              Ngày lập: <strong>${r.proposed_date}</strong>
            </td>
          </tr>
        </table>

        <div style="margin-bottom: 14px;">
          <h3 style="margin: 0 0 6px 0; font-size: 12pt; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 3px;">
            1. THÔNG TIN YÊU CẦU THAY ĐỔI
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 4px;" border="1">
            <tr>
              <td style="padding: 6px; width: 25%; background-color: #f8fafc;"><strong>Tên thay đổi:</strong></td>
              <td style="padding: 6px; font-weight: bold; font-size: 12pt;">${r.title}</td>
            </tr>
            <tr>
              <td style="padding: 6px; background-color: #f8fafc;"><strong>Loại hình thay đổi:</strong></td>
              <td style="padding: 6px;">${CHANGE_TYPES[r.change_type]?.label || r.change_type}</td>
            </tr>
            <tr>
              <td style="padding: 6px; background-color: #f8fafc;"><strong>Người đề xuất:</strong></td>
              <td style="padding: 6px;">${r.proposed_by_name} (Ngày: ${r.proposed_date})</td>
            </tr>
            <tr>
              <td style="padding: 6px; background-color: #f8fafc;"><strong>Mô tả chi tiết:</strong></td>
              <td style="padding: 6px; white-space: pre-line;">${r.description}</td>
            </tr>
            <tr>
              <td style="padding: 6px; background-color: #f8fafc;"><strong>Lý do cần thay đổi:</strong></td>
              <td style="padding: 6px; white-space: pre-line;">${r.reason}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 14px;">
          <h3 style="margin: 0 0 6px 0; font-size: 12pt; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 3px;">
            2. ĐÁNH GIÁ TÁC ĐỘNG ĐỐI VỚI HỆ THỐNG ATTP (HACCP & PRP)
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 4px;" border="1">
            <tr>
              <td style="padding: 6px; width: 35%; background-color: #f8fafc;">Ảnh hưởng Kế hoạch HACCP / CCP:</td>
              <td style="padding: 6px; font-weight: bold; color: ${r.impact_assessment?.affects_haccp_plan ? '#b91c1c' : '#047857'};">
                ${r.impact_assessment?.affects_haccp_plan ? "CÓ (Bắt buộc rà soát lại mối nguy và Cây quyết định Codex)" : "KHÔNG"}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px; background-color: #f8fafc;">Ảnh hưởng Chương trình tiên quyết PRP:</td>
              <td style="padding: 6px; font-weight: bold; color: ${r.impact_assessment?.affects_prp ? '#b91c1c' : '#047857'};">
                ${r.impact_assessment?.affects_prp ? "CÓ (Cần cập nhật SOP vệ sinh/bảo trì liên quan)" : "KHÔNG"}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px; background-color: #f8fafc;">Mức độ tác động an toàn thực phẩm:</td>
              <td style="padding: 6px; font-weight: bold;">
                ${
                  r.impact_assessment?.food_safety_impact_level === "HIGH"
                    ? "MỨC CAO (Nguy cơ phát sinh mối nguy mới vượt ngưỡng chấp nhận)"
                    : r.impact_assessment?.food_safety_impact_level === "MEDIUM"
                    ? "MỨC VỪA (Cần kiểm soát qua chương trình PRP)"
                    : "MỨC THẤP (Không tác động trực tiếp tới chất lượng sản phẩm)"
                }
              </td>
            </tr>
            <tr>
              <td style="padding: 6px; background-color: #f8fafc;">Tài liệu / Biểu mẫu cần sửa đổi:</td>
              <td style="padding: 6px;">${r.impact_assessment?.affected_document_ids?.join(", ") || "Không yêu cầu sửa đổi tài liệu"}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 14px;">
          <h3 style="margin: 0 0 6px 0; font-size: 12pt; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 3px;">
            3. KẾ HOẠCH TRIỂN KHAI & THẨM TRA HIỆU LỰC
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 4px;" border="1">
            <tr>
              <td style="padding: 6px; width: 25%; background-color: #f8fafc;"><strong>Kế hoạch thực hiện:</strong></td>
              <td style="padding: 6px; white-space: pre-line;">${r.implementation_plan || "Chưa thiết lập kế hoạch"}</td>
            </tr>
            <tr>
              <td style="padding: 6px; background-color: #f8fafc;"><strong>Ngày hoàn tất:</strong></td>
              <td style="padding: 6px;">${r.implementation_date || "Đang thực hiện"}</td>
            </tr>
            <tr>
              <td style="padding: 6px; background-color: #f8fafc;"><strong>Kết quả thẩm tra:</strong></td>
              <td style="padding: 6px; font-weight: bold; color: #047857; white-space: pre-line;">
                ${r.verification_result || "Chờ thẩm tra sau triển khai"}
              </td>
            </tr>
            <tr>
              <td style="padding: 6px; background-color: #f8fafc;"><strong>Người thẩm tra:</strong></td>
              <td style="padding: 6px;">${r.verified_by_name || "Chưa chỉ định"}</td>
            </tr>
          </table>
        </div>

        <div style="margin-top: 25px; padding: 8px 12px; border: 1px solid #047857; background-color: #f0fdf4; font-size: 9.5pt;">
          <strong>KẾT LUẬN PHÊ DUYỆT:</strong> ${r.review_status === "APPROVED" || r.review_status === "IMPLEMENTED" ? "Chấp thuận triển khai theo phương án đã hoạch định. Yêu cầu các bộ phận phối hợp thực hiện nghiêm túc." : "Đang trong tiến trình xem xét đánh giá tác động."}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 30px; text-align: center;">
          <tr>
            <td style="width: 33.3%; vertical-align: top;">
              <strong style="text-transform: uppercase;">NGƯỜI ĐỀ XUẤT</strong><br/>
              <span style="font-size: 9pt; font-style: italic;">(Ký & ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <strong>${r.proposed_by_name}</strong>
            </td>
            <td style="width: 33.3%; vertical-align: top;">
              <strong style="text-transform: uppercase;">ĐỘI TRƯỞNG ĐỘI ATTP</strong><br/>
              <span style="font-size: 9pt; font-style: italic;">(Thẩm định đánh giá tác động)</span>
              <div style="height: 60px;"></div>
              <strong>${r.approved_by_name || "Lê Hoàng Nam"}</strong>
            </td>
            <td style="width: 33.3%; vertical-align: top;">
              <strong style="text-transform: uppercase;">GIÁM ĐỐC NHÀ MÁY</strong><br/>
              <span style="font-size: 9pt; font-style: italic;">(Phê duyệt thực hiện)</span>
              <div style="height: 60px;"></div>
              <strong>Trần Anh Đức</strong>
            </td>
          </tr>
        </table>
      </div>
    `;
    printHtml(html);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <PageHeader
        title="Quản Lý Hoạch Định Sự Thay Đổi"
        description="Đánh giá và kiểm soát tác động của mọi sự thay đổi tới kế hoạch HACCP, PRP và an toàn thực phẩm theo ISO 22000:2018 Điều khoản 6.3"
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="gap-1.5 bg-primary text-primary-foreground shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Lập Phiếu Thay Đổi (BM-CHANGE-01)</span>
            </Button>
          </div>
        }
      />

      {/* KPI STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Tổng Số Phiếu Thay Đổi</span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <GitCompare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <span>Tuân thủ Điều khoản 6.3</span>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Đang Đánh Giá Tác Động</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.under_review}</div>
          <div className="mt-1 text-xs text-amber-700/80">Cần rà soát HACCP & PRP</div>
        </div>

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Đã Phê Duyệt Phương Án</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.approved}</div>
          <div className="mt-1 text-xs text-blue-700/80">Chuẩn bị nguồn lực triển khai</div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Đã Triển Khai & Thẩm Tra</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{stats.implemented}</div>
          <div className="mt-1 text-xs text-emerald-700/80">Hiệu lực hệ thống được đảm bảo</div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã phiếu, tiêu đề hoặc người đề xuất..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">Tất cả loại thay đổi</option>
            {Object.entries(CHANGE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Mã Phiếu & Ngày</th>
              <th className="px-4 py-3">Tiêu Đề & Phân Loại</th>
              <th className="px-4 py-3">Đánh Giá Tác Động ATTP</th>
              <th className="px-4 py-3">Người Đề Xuất</th>
              <th className="px-4 py-3">Trạng Thái</th>
              <th className="px-4 py-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                  Đang tải dữ liệu phiếu thay đổi...
                </td>
              </tr>
            ) : filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs">
                  Không tìm thấy phiếu yêu cầu thay đổi nào.
                </td>
              </tr>
            ) : (
              filteredRequests.map((r) => {
                const typeObj = CHANGE_TYPES[r.change_type] || CHANGE_TYPES.OTHER;
                const statusObj = STATUS_CONFIG[r.review_status] || STATUS_CONFIG.DRAFT;
                const StatusIcon = statusObj.icon;

                return (
                  <tr key={r.change_id} className="transition-colors hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="font-mono font-bold text-primary text-xs">{r.change_code}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{r.proposed_date}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground text-xs max-w-sm line-clamp-1">{r.title}</div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeObj.color}`}>
                        {typeObj.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.impact_assessment?.food_safety_impact_level === "HIGH"
                              ? "bg-rose-500/10 text-rose-700 border border-rose-500/20"
                              : r.impact_assessment?.food_safety_impact_level === "MEDIUM"
                              ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                          }`}
                        >
                          Tác động: {r.impact_assessment?.food_safety_impact_level || "MEDIUM"}
                        </span>
                        {r.impact_assessment?.affects_haccp_plan && (
                          <span className="bg-purple-500/10 text-purple-700 border border-purple-500/20 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            Ảnh hưởng HACCP
                          </span>
                        )}
                        {r.impact_assessment?.affects_prp && (
                          <span className="bg-sky-500/10 text-sky-700 border border-sky-500/20 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            Ảnh hưởng PRP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      <div className="font-medium text-foreground">{r.proposed_by_name}</div>
                      {r.approved_by_name && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Duyệt: {r.approved_by_name}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusObj.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusObj.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCR(r);
                            setDetailModalOpen(true);
                          }}
                          className="h-8 px-2 text-xs"
                          title="Xem chi tiết & Quản lý quy trình"
                        >
                          Chi tiết
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrint(r)}
                          className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="In biểu mẫu BM-CHANGE-01"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(r.change_id)}
                          className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          title="Xóa phiếu"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* MODAL: CREATE CHANGE REQUEST */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-primary" />
                  Lập Phiếu Yêu Cầu Thay Đổi (BM-CHANGE-01)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Đánh giá có hệ thống mọi thay đổi theo Điều khoản 6.3 Tiêu chuẩn ISO 22000:2018
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label>Tiêu đề yêu cầu thay đổi *</Label>
                <Input
                  required
                  placeholder="Ví dụ: Lắp đặt máy dò kim loại băng tải mới tại CCP 2"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Loại hình thay đổi *</Label>
                  <select
                    value={formData.change_type}
                    onChange={(e) => setFormData({ ...formData, change_type: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    {Object.entries(CHANGE_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Mức độ tác động an toàn thực phẩm *</Label>
                  <select
                    value={formData.food_safety_impact_level}
                    onChange={(e) => setFormData({ ...formData, food_safety_impact_level: e.target.value as any })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold"
                  >
                    <option value="LOW">Mức Thấp (Không ảnh hưởng chất lượng sản phẩm)</option>
                    <option value="MEDIUM">Mức Vừa (Cần kiểm soát qua chương trình PRP)</option>
                    <option value="HIGH">Mức Cao (Nguy cơ ảnh hưởng CCP / Kế hoạch HACCP)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Mô tả chi tiết nội dung thay đổi *</Label>
                <Textarea
                  required
                  rows={3}
                  placeholder="Mô tả hiện trạng và phương án kỹ thuật mới cần áp dụng..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Lý do cần thay đổi *</Label>
                <Textarea
                  required
                  rows={2}
                  placeholder="Yêu cầu từ khách hàng, nâng cao năng suất, khắc phục sự cố hỏng hóc..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="text-xs"
                />
              </div>

              {/* IMPACT ASSESSMENT */}
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3.5 space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                  Đánh Giá Tác Động Đối Với Kế Hoạch Kiểm Soát Mối Nguy (HACCP / PRP)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer border rounded-md p-2 bg-background">
                    <input
                      type="checkbox"
                      checked={formData.affects_haccp_plan}
                      onChange={(e) => setFormData({ ...formData, affects_haccp_plan: e.target.checked })}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="font-medium text-foreground">Ảnh hưởng Kế hoạch HACCP / CCP</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer border rounded-md p-2 bg-background">
                    <input
                      type="checkbox"
                      checked={formData.affects_prp}
                      onChange={(e) => setFormData({ ...formData, affects_prp: e.target.checked })}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="font-medium text-foreground">Ảnh hưởng Chương trình PRP</span>
                  </label>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Tài liệu / SOP cần cập nhật (phân cách bằng dấu phẩy):</Label>
                  <Input
                    placeholder="VD: HACCP-2026-CB01, SOP-CCP-02, BM-KTNL-01"
                    value={formData.affected_docs}
                    onChange={(e) => setFormData({ ...formData, affected_docs: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Người đề xuất *</Label>
                  <Input
                    required
                    value={formData.proposed_by_name}
                    onChange={(e) => setFormData({ ...formData, proposed_by_name: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ngày đề xuất *</Label>
                  <Input
                    type="date"
                    required
                    value={formData.proposed_date}
                    onChange={(e) => setFormData({ ...formData, proposed_date: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Kế hoạch triển khai dự kiến</Label>
                <Textarea
                  rows={2}
                  placeholder="Các bước triển khai, thời gian thử nghiệm, phân công trách nhiệm..."
                  value={formData.implementation_plan}
                  onChange={(e) => setFormData({ ...formData, implementation_plan: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateModalOpen(false)}
                  className="text-xs"
                >
                  Hủy bỏ
                </Button>
                <Button type="submit" size="sm" className="text-xs bg-primary text-primary-foreground">
                  Lưu Phiếu Yêu Cầu
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL & WORKFLOW ACTIONS */}
      {detailModalOpen && selectedCR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{selectedCR.change_code}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_CONFIG[selectedCR.review_status]?.color}`}>
                    {STATUS_CONFIG[selectedCR.review_status]?.label}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground mt-1">{selectedCR.title}</h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3 border rounded-lg p-3 bg-muted/10">
                <div>
                  <span className="text-muted-foreground">Loại hình thay đổi:</span>
                  <div className="font-semibold text-foreground mt-0.5">
                    {CHANGE_TYPES[selectedCR.change_type]?.label || selectedCR.change_type}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Mức độ tác động ATTP:</span>
                  <div className="font-bold text-foreground mt-0.5">
                    {selectedCR.impact_assessment?.food_safety_impact_level || "MEDIUM"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Người đề xuất:</span>
                  <div className="font-medium text-foreground mt-0.5">{selectedCR.proposed_by_name} ({selectedCR.proposed_date})</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Người phê duyệt:</span>
                  <div className="font-medium text-foreground mt-0.5">
                    {selectedCR.approved_by_name ? `${selectedCR.approved_by_name} (${selectedCR.approval_date})` : "Chưa phê duyệt"}
                  </div>
                </div>
              </div>

              <div>
                <span className="font-bold text-foreground">Mô tả thay đổi:</span>
                <p className="text-muted-foreground mt-1 p-2.5 rounded-md border bg-background whitespace-pre-line">
                  {selectedCR.description}
                </p>
              </div>

              <div>
                <span className="font-bold text-foreground">Lý do thay đổi:</span>
                <p className="text-muted-foreground mt-1 p-2.5 rounded-md border bg-background whitespace-pre-line">
                  {selectedCR.reason}
                </p>
              </div>

              {/* WORKFLOW ACTION BAR */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Quy Trình Xử Lý & Chuyển Trạng Thái (Clause 6.3 Workflow)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCR.review_status === "DRAFT" && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedCR.change_id, "UNDER_REVIEW", "Ban Thẩm Định ATTP")}
                      className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <ArrowRight className="h-3.5 w-3.5 mr-1" />
                      Gửi Xem Xét & Đánh Giá Tác Động
                    </Button>
                  )}

                  {selectedCR.review_status === "UNDER_REVIEW" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedCR.change_id, "APPROVED", "Lê Hoàng Nam (Đội trưởng Đội ATTP)")}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Phê Duyệt Phương Án
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUpdateStatus(selectedCR.change_id, "REJECTED", "Ban Giám Đốc", "Không đáp ứng tiêu chuẩn ATTP")}
                        className="text-xs"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Từ Chối
                      </Button>
                    </>
                  )}

                  {selectedCR.review_status === "APPROVED" && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedCR.change_id, "IMPLEMENTED", "Lê Hoàng Nam (QA)", "Đã thẩm tra nghiệm thu đạt chuẩn.")}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                      Xác Nhận Đã Triển Khai & Thẩm Tra Hiệu Quả
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePrint(selectedCR)}
                    className="text-xs"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    In Phiếu BM-CHANGE-01
                  </Button>
                </div>
              </div>

              {selectedCR.verification_result && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-50/20 p-3 space-y-1">
                  <span className="font-bold text-emerald-800 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Kết quả thẩm tra sau triển khai ({selectedCR.verified_by_name}):
                  </span>
                  <p className="text-emerald-700 text-xs">{selectedCR.verification_result}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
