import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GitFork,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Send,
  Check,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  User,
  ExternalLink,
  BookOpen,
  Info,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type {
  DocumentItem,
  DocumentRevision,
  DocumentChangeRequest,
} from "@/lib/documentConstants";
import { REVISION_STATUS_CONFIG } from "@/lib/documentConstants";
import { sanitizePrintableHtml } from "@/lib/sanitizeHtml";
import { cleanTextToHtml } from "@/lib/documentContentHelper";

interface DocumentRevisionsModalProps {
  open: boolean;
  doc: DocumentItem | null;
  onClose: () => void;
  onDocumentUpdated?: () => void;
  canEdit: boolean;
  isManagement: boolean;
  isAdmin: boolean;
  changeRequests?: DocumentChangeRequest[];
  initialChangeRequest?: DocumentChangeRequest | null;
}

export const DocumentRevisionsModal: React.FC<DocumentRevisionsModalProps> = ({
  open,
  doc,
  onClose,
  onDocumentUpdated,
  canEdit,
  isManagement,
  isAdmin,
  changeRequests = [],
  initialChangeRequest = null,
}) => {
  const [revisions, setRevisions] = useState<DocumentRevision[]>([]);
  const [loading, setLoading] = useState(false);

  // Form tạo revision mới
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    version: "",
    change_description: "",
    drafter_name: "",
    reviewer_name: "",
    change_request_id: "",
    inherit_content: true,
  });

  // Xem chi tiết / Toàn văn nội dung revision
  const [viewingRevision, setViewingRevision] = useState<DocumentRevision | null>(null);

  // Sửa nội dung bản nháp revision
  const [editingRevision, setEditingRevision] = useState<DocumentRevision | null>(null);
  const [editForm, setEditForm] = useState({
    version: "",
    change_description: "",
    drafter_name: "",
    reviewer_name: "",
    content: "",
  });

  // Modal Trình duyệt (Submit)
  const [submittingRev, setSubmittingRev] = useState<DocumentRevision | null>(null);
  const [submitComment, setSubmitComment] = useState("");

  // Modal Phê duyệt (Approve)
  const [approvingRev, setApprovingRev] = useState<DocumentRevision | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);

  // Modal Từ chối (Reject)
  const [rejectingRev, setRejectingRev] = useState<DocumentRevision | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Tải danh sách bản sửa đổi khi mở modal
  const fetchRevisions = async () => {
    if (!doc?.document_id) return;
    setLoading(true);
    try {
      const res = await api.get(`/documents/${doc.document_id}/revisions`);
      setRevisions(res.data || []);
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách bản sửa đổi:", err);
      toast.error(err.response?.data?.detail || "Không thể tải danh sách bản sửa đổi tài liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && doc?.document_id) {
      fetchRevisions();
      // Gợi ý phiên bản tiếp theo (VD: 1.0 -> 1.1)
      const currentVer = doc.current_version || "1.0";
      const parts = currentVer.split(".");
      let nextVer = "1.1";
      if (parts.length === 2) {
        const major = parseInt(parts[0], 10) || 1;
        const minor = parseInt(parts[1], 10) || 0;
        nextVer = `${major}.${minor + 1}`;
      } else {
        nextVer = `${currentVer}.1`;
      }

      // Lấy tên người dùng hiện tại
      let defaultDrafter = "";
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const u = JSON.parse(userStr);
          defaultDrafter = u.full_name || u.username || "";
        }
      } catch (e) {
        // ignore
      }

      setFormData({
        version: nextVer,
        change_description: initialChangeRequest?.reason
          ? `Sửa đổi theo phiếu ${initialChangeRequest.request_code}: ${initialChangeRequest.reason}`
          : "",
        drafter_name: defaultDrafter,
        reviewer_name: "",
        change_request_id: initialChangeRequest?.request_id || "",
        inherit_content: true,
      });

      if (initialChangeRequest) {
        setIsCreating(true);
      } else {
        setIsCreating(false);
      }
    }
  }, [open, doc?.document_id, initialChangeRequest]);

  // Kiểm tra xem hiện có bản nháp nào đang ở trạng thái DRAFT hoặc UNDER_REVIEW không
  const activeDraft = useMemo(() => {
    return revisions.find((r) => r.status === "DRAFT" || r.status === "UNDER_REVIEW");
  }, [revisions]);

  // Các phiếu thay đổi liên quan đến tài liệu này đã được duyệt
  const approvedChangeRequestsForDoc = useMemo(() => {
    if (!doc?.document_id) return [];
    return changeRequests.filter(
      (cr) =>
        cr.status === "APPROVED" &&
        (cr.document_id === doc.document_id || cr.doc_code === doc.doc_code),
    );
  }, [changeRequests, doc?.document_id, doc?.doc_code]);

  // Xử lý tạo bản sửa đổi mới
  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc?.document_id) return;
    if (!formData.change_description.trim() || formData.change_description.trim().length < 5) {
      toast.error(
        "Vui lòng nhập lý do và nội dung tóm tắt sửa đổi (tối thiểu 5 ký tự) theo ISO 22000 Điều khoản 7.5.2",
      );
      return;
    }

    try {
      const payload: any = {
        version: formData.version.trim() || undefined,
        change_description: formData.change_description.trim(),
        drafter_name: formData.drafter_name.trim() || undefined,
        reviewer_name: formData.reviewer_name.trim() || undefined,
        change_request_id: formData.change_request_id || undefined,
        content: formData.inherit_content ? doc.content : undefined,
      };

      const res = await api.post(`/documents/${doc.document_id}/revisions`, payload);
      toast.success(
        `Đã tạo bản thảo sửa đổi ${res.data.version} (${res.data.revision_code}) thành công!`,
      );
      setIsCreating(false);
      await fetchRevisions();
    } catch (err: any) {
      console.error("Lỗi khi tạo bản sửa đổi:", err);
      toast.error(err.response?.data?.detail || "Không thể tạo bản sửa đổi mới");
    }
  };

  // Mở form chỉnh sửa bản nháp
  const handleOpenEditRevision = (rev: DocumentRevision) => {
    setEditingRevision(rev);
    setEditForm({
      version: rev.version,
      change_description: rev.change_description,
      drafter_name: rev.drafter_name,
      reviewer_name: rev.reviewer_name || "",
      content: rev.content || "",
    });
  };

  // Lưu chỉnh sửa bản nháp
  const handleSaveEditRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRevision) return;

    try {
      await api.put(`/documents/revisions/${editingRevision.revision_id}`, {
        version: editForm.version.trim() || undefined,
        change_description: editForm.change_description.trim() || undefined,
        drafter_name: editForm.drafter_name.trim() || undefined,
        reviewer_name: editForm.reviewer_name.trim() || undefined,
        content: editForm.content,
      });

      toast.success("Cập nhật bản thảo sửa đổi thành công!");
      setEditingRevision(null);
      await fetchRevisions();
    } catch (err: any) {
      console.error("Lỗi khi cập nhật bản sửa đổi:", err);
      toast.error(err.response?.data?.detail || "Không thể cập nhật bản sửa đổi");
    }
  };

  // Trình duyệt bản nháp
  const handleConfirmSubmit = async () => {
    if (!submittingRev) return;
    try {
      await api.post(`/documents/revisions/${submittingRev.revision_id}/submit`, {
        comments: submitComment.trim() || undefined,
      });
      toast.success(
        `Đã trình duyệt bản sửa đổi ${submittingRev.version} (${submittingRev.revision_code}) lên cấp thẩm quyền!`,
      );
      setSubmittingRev(null);
      setSubmitComment("");
      await fetchRevisions();
    } catch (err: any) {
      console.error("Lỗi khi trình duyệt:", err);
      toast.error(err.response?.data?.detail || "Không thể trình duyệt bản sửa đổi");
    }
  };

  // Phê duyệt ban hành bản sửa đổi
  const handleConfirmApprove = async () => {
    if (!approvingRev) return;
    try {
      const res = await api.post(`/documents/revisions/${approvingRev.revision_id}/approve`, {
        approval_notes: approvalNotes.trim() || undefined,
        effective_date: effectiveDate || undefined,
      });
      toast.success(
        `Phê duyệt ban hành thành công phiên bản ${res.data.version}! Tài liệu chính thức đã được cập nhật và thông báo phân phối BM02-KSTL đã được phát hành tự động.`,
        { duration: 6000 },
      );
      setApprovingRev(null);
      setApprovalNotes("");
      await fetchRevisions();
      if (onDocumentUpdated) {
        onDocumentUpdated();
      }
    } catch (err: any) {
      console.error("Lỗi khi phê duyệt:", err);
      toast.error(err.response?.data?.detail || "Không thể phê duyệt bản sửa đổi");
    }
  };

  // Từ chối phê duyệt bản sửa đổi
  const handleConfirmReject = async () => {
    if (!rejectingRev) return;
    if (!rejectionReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối bản sửa đổi.");
      return;
    }
    try {
      await api.post(`/documents/revisions/${rejectingRev.revision_id}/reject`, {
        rejection_reason: rejectionReason.trim(),
      });
      toast.info("Đã từ chối bản sửa đổi và gửi phản hồi cho người soạn thảo.");
      setRejectingRev(null);
      setRejectionReason("");
      await fetchRevisions();
    } catch (err: any) {
      console.error("Lỗi khi từ chối duyệt:", err);
      toast.error(err.response?.data?.detail || "Không thể từ chối bản sửa đổi");
    }
  };

  // Xóa bản nháp
  const handleDeleteDraft = async (rev: DocumentRevision) => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa bản thảo sửa đổi ${rev.version} (${rev.revision_code})? Thao tác này không thể hoàn tác.`,
      )
    ) {
      return;
    }
    try {
      await api.delete(`/documents/revisions/${rev.revision_id}`);
      toast.success("Đã xóa bản thảo sửa đổi thành công.");
      await fetchRevisions();
    } catch (err: any) {
      console.error("Lỗi khi xóa bản thảo:", err);
      toast.error(err.response?.data?.detail || "Không thể xóa bản thảo sửa đổi");
    }
  };

  if (!doc) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <div className="space-y-1">
                <DialogTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                  <GitFork className="h-5 w-5" />
                  Kiểm Soát Phiên Bản & Bản Sửa Đổi (ISO 22000 Cl. 7.5)
                </DialogTitle>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-foreground">{doc.doc_code}</span>
                  <span>•</span>
                  <span className="font-medium text-foreground">{doc.doc_title}</span>
                  <span>•</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-300">
                    Bản hiệu lực: v{doc.current_version}
                  </span>
                  {doc.effective_date && (
                    <span className="text-[11px] text-muted-foreground">
                      (Hiệu lực: {doc.effective_date})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchRevisions}
                  disabled={loading}
                  className="h-8 gap-1.5 text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  Làm mới
                </Button>
                {canEdit && !isCreating && (
                  <Button
                    size="sm"
                    onClick={() => setIsCreating(true)}
                    disabled={!!activeDraft}
                    title={
                      activeDraft
                        ? "Đang có bản sửa đổi đang được xử lý. ISO 22000 không cho phép tạo nhiều bản nháp song song."
                        : "Tạo bản thảo sửa đổi mới"
                    }
                    className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Soạn bản sửa đổi mới
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Hướng dẫn tuân thủ chuẩn ISO 22000 Điều khoản 7.5 */}
          <div className="rounded-xl border border-sky-200 bg-sky-500/5 p-3 text-xs text-sky-800 dark:border-sky-800 dark:text-sky-200 flex items-start gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold">
                Quy tắc kiểm soát tài liệu chuẩn ISO 22000:2018 (Clause 7.5 & QT-KSTL An Giang):
              </div>
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                Tài liệu đang hiệu lực được bảo toàn nguyên vẹn trong suốt quá trình soạn thảo. Mọi
                sửa đổi được thực hiện trên <b>Bản sửa đổi (Revision)</b> độc lập. Sau khi được thẩm
                định chuyên môn và Ban Giám Đốc/Trưởng ban QLCL phê duyệt, bản sửa đổi mới chính
                thức có hiệu lực, các bản cũ tự động chuyển sang trạng thái{" "}
                <b>Đã thay thế (SUPERSEDED)</b> và hệ thống tự động sinh thông báo phân phối{" "}
                <b>BM02-KSTL</b>.
              </p>
            </div>
          </div>

          {/* Cảnh báo nếu đang có bản nháp đang xử lý */}
          {activeDraft && (
            <div className="rounded-xl border border-amber-200 bg-amber-500/10 p-3 text-xs text-amber-800 dark:border-amber-800 dark:text-amber-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  Đang có bản sửa đổi <b>v{activeDraft.version}</b> ({activeDraft.revision_code}) ở
                  trạng thái{" "}
                  <b className="uppercase">
                    {REVISION_STATUS_CONFIG[activeDraft.status]?.label || activeDraft.status}
                  </b>
                  . Hãy hoàn tất hoặc xóa bản nháp này trước khi tạo bản mới.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenEditRevision(activeDraft)}
                className="h-7 text-xs border-amber-400 text-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 shrink-0"
              >
                Mở xử lý ngay
              </Button>
            </div>
          )}

          {/* Form Tạo Bản Sửa Đổi Mới */}
          {isCreating && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="text-sm font-bold text-primary flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Soạn Thảo Bản Sửa Đổi Mới (Draft Revision)
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsCreating(false)}
                  className="h-7 text-xs"
                >
                  Đóng
                </Button>
              </div>

              <form onSubmit={handleCreateRevision} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">
                      Phiên bản mới dự kiến <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={formData.version}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, version: e.target.value }))
                      }
                      placeholder="VD: 1.1 hoặc 2.0"
                      className="mt-1 h-8 text-xs font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">
                      Người soạn thảo <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={formData.drafter_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          drafter_name: e.target.value,
                        }))
                      }
                      placeholder="Họ tên người soạn thảo"
                      className="mt-1 h-8 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">
                      Người soát xét / thẩm định chuyên môn
                    </Label>
                    <Input
                      value={formData.reviewer_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          reviewer_name: e.target.value,
                        }))
                      }
                      placeholder="Trưởng bộ phận / Kỹ sư QA"
                      className="mt-1 h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Liên kết phiếu yêu cầu thay đổi BM01-KSTL */}
                <div>
                  <Label className="text-xs font-semibold">
                    Liên kết Phiếu Yêu Cầu Xem Xét Tài Liệu (BM01-KSTL)
                  </Label>
                  <select
                    value={formData.change_request_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        change_request_id: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">-- Không liên kết phiếu BM01 --</option>
                    {approvedChangeRequestsForDoc.map((cr) => (
                      <option key={cr.request_id} value={cr.request_id}>
                        {cr.request_code} – {cr.reason} ({cr.requested_by_name} - {cr.request_date})
                      </option>
                    ))}
                  </select>
                  {approvedChangeRequestsForDoc.length === 0 && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Không có phiếu yêu cầu BM01-KSTL nào đã được duyệt cho tài liệu này. Bản sửa
                      đổi sẽ được tạo độc lập.
                    </div>
                  )}
                </div>

                {/* Tóm tắt lý do & nội dung sửa đổi theo ISO 7.5.2 */}
                <div>
                  <Label className="text-xs font-semibold">
                    Lý do & Nội dung sửa đổi (ISO 22000 Điều khoản 7.5.2){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    rows={3}
                    value={formData.change_description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        change_description: e.target.value,
                      }))
                    }
                    placeholder="Mô tả cụ thể điều khoản, nội dung hoặc thông số kỹ thuật được thay đổi và lý do sửa đổi..."
                    className="mt-1 text-xs"
                    required
                  />
                </div>

                {/* Tùy chọn kế thừa nội dung hiện tại */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="inherit_content"
                    checked={formData.inherit_content}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        inherit_content: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  <label
                    htmlFor="inherit_content"
                    className="text-xs text-foreground cursor-pointer select-none"
                  >
                    Kế thừa toàn bộ nội dung từ phiên bản hiện tại <b>v{doc.current_version}</b> vào
                    bản thảo sửa đổi (khuyến nghị để dễ chỉnh sửa)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreating(false)}
                    className="h-8 text-xs"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 text-xs bg-primary text-primary-foreground font-semibold"
                  >
                    Tạo bản thảo sửa đổi
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Danh Sách Các Bản Sửa Đổi */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Lịch sử các phiên bản sửa đổi ({revisions.length})</span>
              <span>Sắp xếp theo thứ tự thời gian</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                <span>Đang tải lịch sử các bản sửa đổi...</span>
              </div>
            ) : revisions.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <div className="font-semibold text-foreground">
                  Chưa có bản sửa đổi nào được lập
                </div>
                <p className="mt-1 text-muted-foreground">
                  Tài liệu đang áp dụng phiên bản gốc ban đầu (v{doc.current_version}). Khi cần sửa
                  đổi quy trình, hãy nhấn "Soạn bản sửa đổi mới".
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {revisions.map((rev) => {
                  const statusCfg = REVISION_STATUS_CONFIG[rev.status] || {
                    label: rev.status,
                    color: "text-muted-foreground",
                    bg: "bg-muted",
                    badge: "bg-muted text-muted-foreground",
                  };

                  return (
                    <div
                      key={rev.revision_id}
                      className={`rounded-xl border p-4 transition shadow-sm ${
                        rev.status === "EFFECTIVE"
                          ? "border-emerald-300 bg-emerald-500/5 dark:border-emerald-800"
                          : rev.status === "UNDER_REVIEW"
                            ? "border-amber-300 bg-amber-500/5 dark:border-amber-800"
                            : rev.status === "DRAFT"
                              ? "border-blue-200 bg-blue-500/5 dark:border-blue-800"
                              : "border-border bg-card"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-sm text-foreground">
                              {rev.revision_code}
                            </span>
                            <span className="font-bold text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                              v{rev.version}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.badge}`}
                            >
                              {statusCfg.label}
                            </span>
                            {rev.change_request_id && (
                              <span className="text-[10px] rounded px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                                Theo phiếu BM01-KSTL
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 pt-1">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Soạn thảo: <b>{rev.drafter_name}</b>
                            </span>
                            {rev.reviewer_name && (
                              <span className="flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                Thẩm định: <b>{rev.reviewer_name}</b>
                              </span>
                            )}
                            {rev.approver_name && (
                              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                                <Check className="h-3 w-3" />
                                Phê duyệt: <b>{rev.approver_name}</b>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Thao tác trên từng bản sửa đổi */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Nút Xem Nội Dung Toàn Văn */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingRevision(rev)}
                            className="h-7 text-xs gap-1"
                            title="Xem chi tiết toàn văn bản sửa đổi"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Toàn văn
                          </Button>

                          {/* Thao tác khi là DRAFT hoặc REJECTED */}
                          {(rev.status === "DRAFT" || rev.status === "REJECTED") && canEdit && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditRevision(rev)}
                                className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Sửa nháp
                              </Button>

                              <Button
                                size="sm"
                                onClick={() => {
                                  setSubmittingRev(rev);
                                  setSubmitComment("");
                                }}
                                className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                              >
                                <Send className="h-3.5 w-3.5" />
                                Trình duyệt
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteDraft(rev)}
                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                title="Xóa bản nháp"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}

                          {/* Thao tác khi là UNDER_REVIEW */}
                          {rev.status === "UNDER_REVIEW" && (isManagement || isAdmin) && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setApprovingRev(rev);
                                  setApprovalNotes("");
                                  setEffectiveDate(new Date().toISOString().split("T")[0]);
                                }}
                                className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Phê duyệt ban hành
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRejectingRev(rev);
                                  setRejectionReason("");
                                }}
                                className="h-7 text-xs gap-1 border-rose-300 text-rose-700 hover:bg-rose-50"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Từ chối
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Lý do & Nội dung sửa đổi */}
                      <div className="mt-3 rounded-lg bg-muted/40 p-2.5 text-xs text-foreground">
                        <div className="font-semibold text-muted-foreground text-[11px] mb-0.5">
                          Lý do & Nội dung sửa đổi (ISO 7.5.2):
                        </div>
                        <div className="whitespace-pre-wrap">{rev.change_description}</div>
                      </div>

                      {/* Ghi chú phê duyệt / từ chối nếu có */}
                      {rev.approval_notes && (
                        <div className="mt-2 text-[11.5px] text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5">
                          <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" />
                          <span>
                            <b>Ghi chú phê duyệt:</b> {rev.approval_notes}
                            {rev.effective_date && ` (Ngày hiệu lực: ${rev.effective_date})`}
                          </span>
                        </div>
                      )}

                      {/* Timeline ngày tháng */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground border-t pt-2">
                        {rev.created_at && (
                          <span>
                            Khởi tạo: {new Date(rev.created_at).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                        {rev.effective_date && (
                          <span className="text-emerald-700 font-medium">
                            Chính thức hiệu lực: {rev.effective_date}
                          </span>
                        )}
                        {rev.superseded_date && (
                          <span className="text-rose-700 font-medium">
                            Bị thay thế ngày: {rev.superseded_date}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Xem Toàn Văn Bản Sửa Đổi */}
      <Dialog open={!!viewingRevision} onOpenChange={(v) => !v && setViewingRevision(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Chi Tiết Bản Sửa Đổi: {viewingRevision?.revision_code} (v{viewingRevision?.version})
            </DialogTitle>
          </DialogHeader>

          {viewingRevision && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Tài liệu:</span> <b>{doc.doc_code}</b> –{" "}
                    {doc.doc_title}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Trạng thái bản sửa đổi:</span>{" "}
                    <b>
                      {REVISION_STATUS_CONFIG[viewingRevision.status]?.label ||
                        viewingRevision.status}
                    </b>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Người soạn thảo:</span>{" "}
                    <b>{viewingRevision.drafter_name}</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Người soát xét:</span>{" "}
                    <b>{viewingRevision.reviewer_name || "—"}</b>
                  </div>
                </div>

                <div className="border-t pt-2">
                  <div className="text-muted-foreground font-semibold mb-0.5">
                    Lý do & Tóm tắt sửa đổi:
                  </div>
                  <div className="whitespace-pre-wrap">{viewingRevision.change_description}</div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  Toàn văn nội dung bản sửa đổi:
                </Label>
                {viewingRevision.content ? (
                  <div
                    className="rounded-lg border p-4 bg-card text-xs text-foreground leading-relaxed overflow-y-auto max-h-[50vh] prose prose-sm dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: sanitizePrintableHtml(cleanTextToHtml(viewingRevision.content)),
                    }}
                  />
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                    Chưa có nội dung văn bản cho bản sửa đổi này.
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewingRevision(null)}
              className="text-xs"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Chỉnh Sửa Bản Nháp Revision */}
      <Dialog open={!!editingRevision} onOpenChange={(v) => !v && setEditingRevision(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-primary">
              <Pencil className="h-5 w-5" />
              Chỉnh Sửa Bản Thảo Sửa Đổi: {editingRevision?.revision_code}
            </DialogTitle>
          </DialogHeader>

          {editingRevision && (
            <form onSubmit={handleSaveEditRevision} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Phiên bản</Label>
                  <Input
                    value={editForm.version}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, version: e.target.value }))}
                    className="mt-1 h-8 text-xs font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Người soạn thảo</Label>
                  <Input
                    value={editForm.drafter_name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, drafter_name: e.target.value }))
                    }
                    className="mt-1 h-8 text-xs"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Người soát xét</Label>
                  <Input
                    value={editForm.reviewer_name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, reviewer_name: e.target.value }))
                    }
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Lý do & Nội dung sửa đổi (ISO 7.5.2)
                </Label>
                <Textarea
                  rows={2}
                  value={editForm.change_description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      change_description: e.target.value,
                    }))
                  }
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Nội dung quy trình sửa đổi (Toàn văn)
                </Label>
                <Textarea
                  rows={12}
                  value={editForm.content}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Nhập hoặc dán nội dung quy trình/hướng dẫn sửa đổi..."
                  className="mt-1 text-xs font-mono"
                />
                <div className="text-[11px] text-muted-foreground mt-1">
                  Mẹo: Bản sửa đổi độc lập này không ảnh hưởng đến văn bản đang hiệu lực cho đến khi
                  được duyệt chính thức.
                </div>
              </div>

              <DialogFooter className="border-t pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingRevision(null)}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs bg-primary text-primary-foreground font-semibold"
                >
                  Lưu thay đổi bản thảo
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Trình Duyệt */}
      <Dialog open={!!submittingRev} onOpenChange={(v) => !v && setSubmittingRev(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-700">
              <Send className="h-5 w-5" />
              Trình Duyệt Bản Sửa Đổi
            </DialogTitle>
          </DialogHeader>

          {submittingRev && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Bạn đang trình duyệt bản sửa đổi{" "}
                <b>
                  {submittingRev.revision_code} (v{submittingRev.version})
                </b>{" "}
                lên cấp có thẩm quyền để soát xét và phê duyệt theo quy trình ISO 22000.
              </p>

              <div>
                <Label className="text-xs font-semibold">Ý kiến / Ghi chú trình duyệt</Label>
                <Textarea
                  rows={3}
                  value={submitComment}
                  onChange={(e) => setSubmitComment(e.target.value)}
                  placeholder="VD: Kính trình Trưởng ban QLCL và Ban Giám Đốc xem xét phê duyệt bản sửa đổi..."
                  className="mt-1 text-xs"
                />
              </div>

              <DialogFooter className="border-t pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSubmittingRev(null)}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmSubmit}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  Xác nhận trình duyệt
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Phê Duyệt Bản Sửa Đổi */}
      <Dialog open={!!approvingRev} onOpenChange={(v) => !v && setApprovingRev(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-700">
              <Check className="h-5 w-5" />
              Phê Duyệt Ban Hành Bản Sửa Đổi
            </DialogTitle>
          </DialogHeader>

          {approvingRev && (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:text-emerald-200">
                <div className="font-bold mb-1">
                  Xác nhận ban hành phiên bản v{approvingRev.version}:
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11.5px]">
                  <li>
                    Tài liệu chính thức sẽ được nâng lên phiên bản <b>v{approvingRev.version}</b>.
                  </li>
                  <li>
                    Các phiên bản cũ sẽ tự động được chuyển sang trạng thái{" "}
                    <b>Đã thay thế (SUPERSEDED)</b>.
                  </li>
                  <li>
                    Hệ thống tự động phát hành Thông báo thay đổi & Phân phối <b>BM02-KSTL</b> tới
                    các bộ phận liên quan để thu hồi bản cũ.
                  </li>
                </ul>
              </div>

              <div>
                <Label className="text-xs font-semibold">Ngày có hiệu lực</Label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="mt-1 h-8 text-xs font-semibold"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Ghi chú phê duyệt của Ban Giám Đốc / QLCL
                </Label>
                <Textarea
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Đồng ý ban hành áp dụng chính thức trong toàn công ty..."
                  className="mt-1 text-xs"
                />
              </div>

              <DialogFooter className="border-t pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setApprovingRev(null)}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmApprove}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Ký duyệt & Ban hành
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Từ Chối Duyệt */}
      <Dialog open={!!rejectingRev} onOpenChange={(v) => !v && setRejectingRev(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-700">
              <XCircle className="h-5 w-5" />
              Từ Chối Bản Sửa Đổi
            </DialogTitle>
          </DialogHeader>

          {rejectingRev && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Nhập lý do từ chối bản sửa đổi <b>{rejectingRev.revision_code}</b> để người soạn
                thảo nắm thông tin và hoàn thiện lại:
              </p>

              <div>
                <Label className="text-xs font-semibold">
                  Lý do từ chối <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Nêu rõ lý do (VD: Cần bổ sung thêm thông số nhiệt độ kiểm soát CCP-01...)"
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <DialogFooter className="border-t pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectingRev(null)}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmReject}
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  Xác nhận từ chối
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
