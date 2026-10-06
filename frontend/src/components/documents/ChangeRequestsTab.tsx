import { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  Trash2,
  Check,
  Building2,
  Eye,
  Send,
  XCircle,
  FileCheck2,
} from "lucide-react";
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
import { toast } from "sonner";
import api from "@/lib/api";
import { printHtml } from "@/lib/print";
import { DocumentItem, DocumentChangeRequest } from "@/routes/documents";
import { generateChangeRequestHtml } from "./dmsPrintHelpers";
import { DEPARTMENTS } from "@/routes/documents";

interface ChangeRequestsTabProps {
  changeRequests: DocumentChangeRequest[];
  loading: boolean;
  onRefresh: () => void;
  internalDocs: DocumentItem[];
  canEdit: boolean;
  isManagement: boolean;
}

export function ChangeRequestsTab({
  changeRequests,
  loading,
  onRefresh,
  internalDocs,
  canEdit,
  isManagement,
}: ChangeRequestsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingCR, setViewingCR] = useState<DocumentChangeRequest | null>(null);
  const [reviewingCR, setReviewingCR] = useState<{
    cr: DocumentChangeRequest;
    step: "DEPT" | "QA" | "DIRECTOR";
  } | null>(null);

  // Form State Tạo BM01
  const [formData, setFormData] = useState({
    request_code: `YCXS-${new Date().getFullYear()}-${String(changeRequests.length + 1).padStart(3, "0")}`,
    document_id: "",
    doc_code: "",
    doc_title: "",
    change_type: "REVISION",
    department: "Ban QLCL & ATTP",
    requested_by_name: "",
    request_date: new Date().toISOString().split("T")[0],
    reason: "",
    proposed_content: "",
    target_completion_date: "",
    assigned_drafter: "",
  });

  // Form State Ký Duyệt
  const [reviewForm, setReviewForm] = useState({
    opinion: "AGREE",
    comment: "",
    signerName: "",
  });

  // KPIs
  const stats = useMemo(() => {
    const total = changeRequests.length;
    const pendingDept = changeRequests.filter((c) => c.status === "SUBMITTED").length;
    const pendingQA = changeRequests.filter((c) => c.status === "DEPT_REVIEWED").length;
    const approved = changeRequests.filter((c) => c.status === "APPROVED").length;
    const rejected = changeRequests.filter((c) => c.status === "REJECTED").length;
    return { total, pendingDept, pendingQA, approved, rejected };
  }, [changeRequests]);

  // Filtered List
  const filteredList = useMemo(() => {
    return changeRequests.filter((c) => {
      const matchSearch =
        c.request_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.doc_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.doc_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.requested_by_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = selectedStatus === "ALL" || c.status === selectedStatus;
      const matchType = selectedType === "ALL" || c.change_type === selectedType;

      return matchSearch && matchStatus && matchType;
    });
  }, [changeRequests, searchQuery, selectedStatus, selectedType]);

  // Mở Form Thêm Mới
  const handleOpenCreate = () => {
    setFormData({
      request_code: `YCXS-${new Date().getFullYear()}-${String(changeRequests.length + 1).padStart(3, "0")}`,
      document_id: "",
      doc_code: "",
      doc_title: "",
      change_type: "REVISION",
      department: "Ban QLCL & ATTP",
      requested_by_name: "",
      request_date: new Date().toISOString().split("T")[0],
      reason: "",
      proposed_content: "",
      target_completion_date: "",
      assigned_drafter: "",
    });
    setIsCreateOpen(true);
  };

  // Chọn tài liệu có sẵn để điền tự động
  const handleSelectExistingDoc = (docId: string) => {
    const found = internalDocs.find((d) => d.document_id === docId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        document_id: found.document_id,
        doc_code: found.doc_code,
        doc_title: found.doc_title,
        department: found.department || prev.department,
        assigned_drafter: found.drafter_name || prev.assigned_drafter,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        document_id: "",
        doc_code: "",
        doc_title: "",
      }));
    }
  };

  // Submit tạo BM01
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doc_title || !formData.reason || !formData.requested_by_name) {
      toast.error(
        "Vui lòng điền đầy đủ các thông tin bắt buộc (Tên tài liệu, Người đề xuất, Lý do)",
      );
      return;
    }

    try {
      await api.post("/documents/change-requests", {
        request_code: formData.request_code,
        document_id: formData.document_id || null,
        doc_code: formData.doc_code,
        doc_title: formData.doc_title,
        change_type: formData.change_type,
        department: formData.department,
        requested_by_name: formData.requested_by_name,
        request_date: formData.request_date,
        reason: formData.reason,
        proposed_content: formData.proposed_content || null,
        target_completion_date: formData.target_completion_date || null,
        assigned_drafter: formData.assigned_drafter || null,
      });

      toast.success(`Đã tạo Phiếu yêu cầu ${formData.request_code} thành công!`);
      setIsCreateOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Lỗi khi tạo phiếu yêu cầu xem xét tài liệu");
    }
  };

  // Mở Dialog Ký Duyệt
  const handleOpenReview = (cr: DocumentChangeRequest, step: "DEPT" | "QA" | "DIRECTOR") => {
    setReviewingCR({ cr, step });
    setReviewForm({
      opinion: step === "DIRECTOR" ? "APPROVED" : "AGREE",
      comment: "",
      signerName:
        step === "DEPT"
          ? "Trưởng Bộ Phận"
          : step === "QA"
            ? "Trưởng Ban QLCL & ATTP"
            : "Tổng Giám Đốc",
    });
  };

  // Gửi ký duyệt
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingCR) return;

    const { cr, step } = reviewingCR;
    try {
      if (step === "DEPT") {
        await api.put(`/documents/change-requests/${cr.request_id}/dept-review`, {
          opinion: reviewForm.opinion,
          comment: reviewForm.comment || null,
          signer_name: reviewForm.signerName || "Trưởng Bộ Phận",
        });
        toast.success("Trưởng đơn vị đã hoàn tất xem xét và ký duyệt!");
      } else if (step === "QA") {
        await api.put(`/documents/change-requests/${cr.request_id}/qa-review`, {
          opinion: reviewForm.opinion,
          comment: reviewForm.comment || null,
          signer_name: reviewForm.signerName || "Trưởng Ban QLCL & ATTP",
        });
        toast.success("Trưởng Ban QLCL đã hoàn tất thẩm tra và ký duyệt!");
      } else {
        await api.put(`/documents/change-requests/${cr.request_id}/director-approve`, {
          approval: reviewForm.opinion,
          comment: reviewForm.comment || null,
          signer_name: reviewForm.signerName || "Tổng Giám Đốc",
        });
        toast.success("Ban Giám Đốc đã hoàn tất phê duyệt!");
      }

      setReviewingCR(null);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Lỗi khi ghi nhận phê duyệt");
    }
  };

  // In BM01
  const handlePrintCR = (cr: DocumentChangeRequest) => {
    const html = generateChangeRequestHtml(cr);
    printHtml(html);
  };

  // Xóa CR
  const handleDeleteCR = async (id: string, code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa phiếu yêu cầu ${code}?`)) return;
    try {
      await api.delete(`/documents/change-requests/${id}`);
      toast.success(`Đã xóa phiếu ${code}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa phiếu yêu cầu này");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Phiếu Yêu Cầu Xem Xét Tài Liệu (BM01-KSTL)
            </h2>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              QT-01-KSTL
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Quy trình đề xuất Soạn mới, Sửa đổi bổ sung hoặc Hủy bỏ tài liệu/SOP theo chu trình 3
            cấp kiểm soát (Trưởng Đơn Vị ➔ Trưởng Ban QLCL ➔ Tổng Giám Đốc).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            Làm mới
          </Button>

          {canEdit && (
            <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 text-xs shadow-sm">
              <Plus className="h-4 w-4" />
              Lập phiếu đề xuất (BM01)
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-3.5 shadow-sm">
          <div className="text-xs text-muted-foreground">Tổng phiếu yêu cầu</div>
          <div className="mt-1.5 text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-[11px] text-muted-foreground">Đã ghi nhận trong hệ thống</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Chờ Đơn vị xem xét
          </div>
          <div className="mt-1.5 text-2xl font-bold text-amber-700">{stats.pendingDept}</div>
          <div className="text-[11px] text-amber-600/80">Bước 1: Trưởng phòng ban</div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
            Chờ Ban QLCL xem xét
          </div>
          <div className="mt-1.5 text-2xl font-bold text-blue-700">{stats.pendingQA}</div>
          <div className="text-[11px] text-blue-600/80">Bước 2: Trưởng ban QA / FSMS</div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Đã phê duyệt ban hành
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-700">{stats.approved}</div>
          <div className="text-[11px] text-emerald-600/80">Bước 3: Tổng Giám Đốc</div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-rose-700 dark:text-rose-300">
            Từ chối / Yêu cầu sửa lại
          </div>
          <div className="mt-1.5 text-2xl font-bold text-rose-700">{stats.rejected}</div>
          <div className="text-[11px] text-rose-600/80">Không đạt tiêu chí</div>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm mã phiếu, mã tài liệu, tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">Tất cả Trạng thái</option>
            <option value="SUBMITTED">Đang gửi - Chờ Đơn vị xem xét</option>
            <option value="DEPT_REVIEWED">Đơn vị đã duyệt - Chờ QA</option>
            <option value="QA_REVIEWED">QA đã duyệt - Chờ Ban Giám Đốc</option>
            <option value="APPROVED">Đã phê duyệt ban hành</option>
            <option value="REJECTED">Bị từ chối</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">Tất cả Loại yêu cầu</option>
            <option value="REVISION">Sửa đổi / Bổ sung</option>
            <option value="NEW">Soạn thảo mới</option>
            <option value="OBSOLETE">Hủy bỏ / Ngưng áp dụng</option>
            <option value="OTHER">Yêu cầu khác</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          Hiển thị <b>{filteredList.length}</b> / {changeRequests.length} phiếu yêu cầu
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
              <tr>
                <th className="w-12 px-3 py-3 text-center">STT</th>
                <th className="w-28 px-3 py-3">Mã phiếu</th>
                <th className="px-3 py-3">Tài liệu liên quan</th>
                <th className="w-28 px-3 py-3">Loại yêu cầu</th>
                <th className="w-36 px-3 py-3">Bộ phận đề xuất</th>
                <th className="w-24 px-3 py-3 text-center">Ngày gửi</th>
                <th className="w-44 px-3 py-3 text-center">Tiến độ ký duyệt (3 Cấp)</th>
                <th className="w-28 px-3 py-3 text-center">Trạng thái</th>
                <th className="w-36 px-3 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    <RefreshCw className="inline-block h-4 w-4 animate-spin text-primary mr-2" />
                    Đang tải danh sách phiếu yêu cầu...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    Không có phiếu yêu cầu xem xét tài liệu nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredList.map((cr, idx) => {
                  const typeBadge =
                    cr.change_type === "NEW"
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                      : cr.change_type === "REVISION"
                        ? "bg-blue-500/10 text-blue-700 border-blue-300"
                        : cr.change_type === "OBSOLETE"
                          ? "bg-rose-500/10 text-rose-700 border-rose-300"
                          : "bg-gray-500/10 text-gray-700 border-gray-300";

                  const statusConfig: Record<string, { label: string; badge: string }> = {
                    SUBMITTED: {
                      label: "Chờ Đơn vị",
                      badge: "bg-amber-500/10 text-amber-700 border-amber-300",
                    },
                    DEPT_REVIEWED: {
                      label: "Chờ Ban QA",
                      badge: "bg-blue-500/10 text-blue-700 border-blue-300",
                    },
                    QA_REVIEWED: {
                      label: "Chờ BGĐ duyệt",
                      badge: "bg-purple-500/10 text-purple-700 border-purple-300",
                    },
                    APPROVED: {
                      label: "Đã phê duyệt",
                      badge: "bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold",
                    },
                    REJECTED: {
                      label: "Từ chối",
                      badge: "bg-rose-500/10 text-rose-700 border-rose-300 font-bold",
                    },
                  };

                  return (
                    <tr key={cr.request_id} className="hover:bg-muted/30 transition">
                      <td className="px-3 py-3 text-center text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <span className="font-mono font-bold text-primary">{cr.request_code}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-foreground">{cr.doc_title}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {cr.doc_code || "(Soạn thảo văn bản mới)"}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold border ${typeBadge}`}
                        >
                          {cr.change_type === "NEW"
                            ? "Soạn mới"
                            : cr.change_type === "REVISION"
                              ? "Sửa đổi"
                              : cr.change_type === "OBSOLETE"
                                ? "Hủy bỏ"
                                : "Khác"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-foreground">{cr.department}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {cr.requested_by_name}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-muted-foreground">
                        {cr.request_date}
                      </td>
                      <td className="px-3 py-3">
                        {/* 3 Step Indicator */}
                        <div className="flex items-center justify-center gap-1.5 text-[10px]">
                          {/* Step 1: Dept */}
                          <div
                            title={`1. Trưởng Bộ Phận: ${cr.dept_head_opinion || "Đang chờ"}`}
                            className={`flex items-center justify-center h-6 px-1.5 rounded border ${
                              cr.dept_head_opinion === "AGREE"
                                ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-bold"
                                : cr.dept_head_opinion === "DISAGREE"
                                  ? "bg-rose-50 border-rose-300 text-rose-700"
                                  : "bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            1.ĐV{" "}
                            {cr.dept_head_opinion === "AGREE"
                              ? "✓"
                              : cr.dept_head_opinion === "DISAGREE"
                                ? "✗"
                                : "..."}
                          </div>
                          ➔{/* Step 2: QA */}
                          <div
                            title={`2. Ban QLCL: ${cr.qa_head_opinion || "Đang chờ"}`}
                            className={`flex items-center justify-center h-6 px-1.5 rounded border ${
                              cr.qa_head_opinion === "AGREE"
                                ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-bold"
                                : cr.qa_head_opinion === "DISAGREE"
                                  ? "bg-rose-50 border-rose-300 text-rose-700"
                                  : "bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            2.QA{" "}
                            {cr.qa_head_opinion === "AGREE"
                              ? "✓"
                              : cr.qa_head_opinion === "DISAGREE"
                                ? "✗"
                                : "..."}
                          </div>
                          ➔{/* Step 3: Director */}
                          <div
                            title={`3. Tổng Giám Đốc: ${cr.director_approval || "Đang chờ"}`}
                            className={`flex items-center justify-center h-6 px-1.5 rounded border ${
                              cr.director_approval === "APPROVED"
                                ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-bold"
                                : cr.director_approval === "REJECTED"
                                  ? "bg-rose-50 border-rose-300 text-rose-700"
                                  : "bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            3.BGĐ{" "}
                            {cr.director_approval === "APPROVED"
                              ? "✓"
                              : cr.director_approval === "REJECTED"
                                ? "✗"
                                : "..."}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium border ${statusConfig[cr.status]?.badge || "bg-muted text-muted-foreground"}`}
                        >
                          {statusConfig[cr.status]?.label || cr.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handlePrintCR(cr)}
                            title="In Phiếu BM01-KSTL"
                            className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => setViewingCR(cr)}
                            title="Xem chi tiết phiếu"
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Quick Review Buttons */}
                          {cr.status === "SUBMITTED" && (canEdit || isManagement) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReview(cr, "DEPT")}
                              className="h-7 text-[10px] px-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                            >
                              ĐV Ký
                            </Button>
                          )}

                          {cr.status === "DEPT_REVIEWED" && (canEdit || isManagement) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReview(cr, "QA")}
                              className="h-7 text-[10px] px-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              QA Ký
                            </Button>
                          )}

                          {cr.status === "QA_REVIEWED" && isManagement && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReview(cr, "DIRECTOR")}
                              className="h-7 text-[10px] px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-bold"
                            >
                              BGĐ Duyệt
                            </Button>
                          )}

                          {cr.status === "SUBMITTED" && canEdit && (
                            <button
                              onClick={() => handleDeleteCR(cr.request_id, cr.request_code)}
                              title="Xóa phiếu"
                              className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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

      {/* Modal Lập Phiếu Yêu Cầu BM01 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Lập Phiếu Yêu Cầu Xem Xét Tài Liệu (BM01-KSTL)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Mã phiếu yêu cầu</Label>
                <Input
                  value={formData.request_code}
                  onChange={(e) => setFormData({ ...formData, request_code: e.target.value })}
                  required
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Ngày gửi đề xuất</Label>
                <Input
                  type="date"
                  value={formData.request_date}
                  onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Hình thức yêu cầu</Label>
                <select
                  value={formData.change_type}
                  onChange={(e) => setFormData({ ...formData, change_type: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="REVISION">Sửa đổi / Bổ sung tài liệu hiện có</option>
                  <option value="NEW">Soạn thảo tài liệu / quy trình mới</option>
                  <option value="OBSOLETE">Hủy bỏ / Ngưng áp dụng tài liệu cũ</option>
                  <option value="OTHER">Yêu cầu khác</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Chọn tài liệu hệ thống (nếu sửa đổi)
                </Label>
                <select
                  value={formData.document_id}
                  onChange={(e) => handleSelectExistingDoc(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">-- Nhập thủ công (hoặc soạn mới) --</option>
                  {internalDocs.map((doc) => (
                    <option key={doc.document_id} value={doc.document_id}>
                      [{doc.doc_code}] {doc.doc_title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label className="text-xs font-semibold">Mã hiệu tài liệu</Label>
                <Input
                  value={formData.doc_code}
                  onChange={(e) => setFormData({ ...formData, doc_code: e.target.value })}
                  placeholder="Ví dụ: SOP-FSMS-01"
                  className="font-mono text-xs"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold">
                  Tên tài liệu / Quy trình <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={formData.doc_title}
                  onChange={(e) => setFormData({ ...formData, doc_title: e.target.value })}
                  placeholder="Ví dụ: Quy trình Kiểm soát Tài liệu và Hồ sơ"
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Đơn vị / Phòng ban đề xuất</Label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Họ tên người đề xuất <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={formData.requested_by_name}
                  onChange={(e) => setFormData({ ...formData, requested_by_name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn A (Kỹ sư QA)"
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">
                Lý do và sự cần thiết phải sửa đổi / soạn mới{" "}
                <span className="text-rose-500">*</span>
              </Label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                required
                placeholder="Nêu rõ nguyên nhân: Thay đổi quy định pháp luật, phát hiện điểm không phù hợp sau đánh giá, thay đổi dây chuyền công nghệ..."
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">
                Tóm tắt nội dung dự kiến soạn thảo / sửa đổi
              </Label>
              <textarea
                value={formData.proposed_content}
                onChange={(e) => setFormData({ ...formData, proposed_content: e.target.value })}
                rows={3}
                placeholder="Ghi rõ điều khoản hoặc mục cần sửa đổi, nội dung mới đề xuất thay thế..."
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Thời hạn mong muốn hoàn thành</Label>
                <Input
                  type="date"
                  value={formData.target_completion_date}
                  onChange={(e) =>
                    setFormData({ ...formData, target_completion_date: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Cán bộ được phân công soạn thảo</Label>
                <Input
                  value={formData.assigned_drafter}
                  onChange={(e) => setFormData({ ...formData, assigned_drafter: e.target.value })}
                  placeholder="Ví dụ: Cán bộ chuyên trách"
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button type="submit" size="sm" className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Gửi Phiếu Yêu Cầu (BM01)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Ký Duyệt 3 Bước */}
      {reviewingCR && (
        <Dialog open={Boolean(reviewingCR)} onOpenChange={() => setReviewingCR(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-primary" />
                {reviewingCR.step === "DEPT"
                  ? "Bước 1: Trưởng Đơn Vị Xem Xét"
                  : reviewingCR.step === "QA"
                    ? "Bước 2: Trưởng Ban QLCL Xem Xét"
                    : "Bước 3: Tổng Giám Đốc Phê Duyệt"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                <div>
                  <b>Mã phiếu:</b>{" "}
                  <span className="font-mono text-primary font-bold">
                    {reviewingCR.cr.request_code}
                  </span>
                </div>
                <div>
                  <b>Tài liệu:</b> {reviewingCR.cr.doc_title} (
                  {reviewingCR.cr.doc_code || "Soạn mới"})
                </div>
                <div>
                  <b>Lý do đề xuất:</b> {reviewingCR.cr.reason}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Quyết định ý kiến</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="opinion"
                      value={reviewingCR.step === "DIRECTOR" ? "APPROVED" : "AGREE"}
                      checked={
                        reviewForm.opinion ===
                        (reviewingCR.step === "DIRECTOR" ? "APPROVED" : "AGREE")
                      }
                      onChange={(e) => setReviewForm({ ...reviewForm, opinion: e.target.value })}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-emerald-700 font-semibold">
                      {reviewingCR.step === "DIRECTOR"
                        ? "☑ Phê duyệt ban hành"
                        : "☑ Đồng ý đề xuất"}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="opinion"
                      value={reviewingCR.step === "DIRECTOR" ? "REJECTED" : "DISAGREE"}
                      checked={
                        reviewForm.opinion ===
                        (reviewingCR.step === "DIRECTOR" ? "REJECTED" : "DISAGREE")
                      }
                      onChange={(e) => setReviewForm({ ...reviewForm, opinion: e.target.value })}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-rose-700 font-semibold">
                      {reviewingCR.step === "DIRECTOR" ? "☒ Từ chối phê duyệt" : "☒ Không đồng ý"}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Nhận xét / Góp ý / Chỉ đạo</Label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  rows={3}
                  placeholder="Ghi nhận xét đánh giá sự phù hợp hoặc lý do từ chối..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Họ tên người ký duyệt</Label>
                <Input
                  value={reviewForm.signerName}
                  onChange={(e) => setReviewForm({ ...reviewForm, signerName: e.target.value })}
                  required
                  className="text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewingCR(null)}
                >
                  Hủy
                </Button>
                <Button type="submit" size="sm" className="gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Xác Nhận Ký Duyệt
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Xem Chi Tiết CR */}
      {viewingCR && (
        <Dialog open={Boolean(viewingCR)} onOpenChange={() => setViewingCR(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Chi Tiết Phiếu Yêu Cầu: {viewingCR.request_code}
                </DialogTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePrintCR(viewingCR)}
                  className="gap-1.5 text-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  In biểu mẫu BM01
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 border rounded-lg p-3 bg-muted/20">
                <div>
                  <b>Mã tài liệu:</b>{" "}
                  <span className="font-mono font-bold">{viewingCR.doc_code || "(Soạn mới)"}</span>
                </div>
                <div>
                  <b>Ngày gửi:</b> {viewingCR.request_date}
                </div>
                <div>
                  <b>Tên tài liệu:</b> {viewingCR.doc_title}
                </div>
                <div>
                  <b>Loại đề xuất:</b> {viewingCR.change_type}
                </div>
                <div>
                  <b>Bộ phận đề xuất:</b> {viewingCR.department}
                </div>
                <div>
                  <b>Người đề xuất:</b> {viewingCR.requested_by_name}
                </div>
                <div>
                  <b>Hạn hoàn thành:</b> {viewingCR.target_completion_date || "---"}
                </div>
                <div>
                  <b>Cán bộ soạn thảo:</b> {viewingCR.assigned_drafter || "---"}
                </div>
              </div>

              <div>
                <div className="font-semibold text-foreground mb-1">Lý do đề xuất:</div>
                <div className="p-3 bg-muted/40 rounded border whitespace-pre-wrap">
                  {viewingCR.reason}
                </div>
              </div>

              <div>
                <div className="font-semibold text-foreground mb-1">Dự kiến nội dung sửa đổi:</div>
                <div className="p-3 bg-muted/40 rounded border whitespace-pre-wrap">
                  {viewingCR.proposed_content || "Đính kèm bản thảo chi tiết."}
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-card space-y-3">
                <div className="font-bold text-foreground uppercase border-b pb-1">
                  Trạng thái Ký duyệt 3 Cấp:
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="border rounded p-2 bg-muted/20">
                    <div className="font-semibold">1. Trưởng Bộ Phận</div>
                    <div className="my-1 font-bold text-emerald-700">
                      {viewingCR.dept_head_opinion || "Đang chờ"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {viewingCR.dept_head_signer_name || "---"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {viewingCR.dept_head_comment}
                    </div>
                  </div>

                  <div className="border rounded p-2 bg-muted/20">
                    <div className="font-semibold">2. Trưởng Ban QLCL</div>
                    <div className="my-1 font-bold text-blue-700">
                      {viewingCR.qa_head_opinion || "Đang chờ"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {viewingCR.qa_head_signer_name || "---"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {viewingCR.qa_head_comment}
                    </div>
                  </div>

                  <div className="border rounded p-2 bg-muted/20">
                    <div className="font-semibold">3. Tổng Giám Đốc</div>
                    <div className="my-1 font-bold text-purple-700">
                      {viewingCR.director_approval || "Đang chờ"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {viewingCR.director_signer_name || "---"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {viewingCR.director_comment}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" onClick={() => setViewingCR(null)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
