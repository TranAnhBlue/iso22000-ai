import { useState, useMemo } from "react";
import {
  CalendarClock,
  Search,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileCheck,
  FileEdit,
  ArrowRight,
  Send,
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
import { PeriodicReviewItem } from "@/routes/documents";
import { generatePeriodicReviewHtml } from "./dmsPrintHelpers";
import { DEPARTMENTS } from "@/routes/documents";

interface PeriodicReviewTabProps {
  periodicReviews: PeriodicReviewItem[];
  loading: boolean;
  onRefresh: () => void;
  canEdit: boolean;
  isManagement: boolean;
  onCreateChangeRequestForDoc?: (doc: PeriodicReviewItem) => void;
}

export function PeriodicReviewTab({
  periodicReviews,
  loading,
  onRefresh,
  canEdit,
  isManagement,
  onCreateChangeRequestForDoc,
}: PeriodicReviewTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modal Confirm Unaltered
  const [confirmingDoc, setConfirmingDoc] = useState<PeriodicReviewItem | null>(null);
  const [signerName, setSignerName] = useState("Trần Anh (Đội trưởng FSMS)");
  const [confirmComment, setConfirmComment] = useState(
    "Xác nhận nội dung tài liệu vẫn phù hợp sau chu kỳ 3 năm, không có sửa đổi (BM05-KSTL).",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // KPIs
  const stats = useMemo(() => {
    const total = periodicReviews.length;
    const valid = periodicReviews.filter((r) => r.review_status === "VALID").length;
    const dueSoon = periodicReviews.filter((r) => r.review_status === "DUE_SOON").length;
    const overdue = periodicReviews.filter((r) => r.review_status === "OVERDUE").length;
    return { total, valid, dueSoon, overdue };
  }, [periodicReviews]);

  // Filtered List
  const filteredList = useMemo(() => {
    return periodicReviews.filter((r) => {
      const matchSearch =
        r.doc_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.doc_title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDept = selectedDept === "ALL" || r.department === selectedDept;
      const matchStatus = selectedStatus === "ALL" || r.review_status === selectedStatus;

      return matchSearch && matchDept && matchStatus;
    });
  }, [periodicReviews, searchQuery, selectedDept, selectedStatus]);

  // Xác nhận tài liệu không thay đổi
  const handleConfirmUnaltered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingDoc) return;

    if (!signerName.trim()) {
      toast.error("Vui lòng nhập họ tên người xác nhận");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/documents/${confirmingDoc.document_id}/confirm-unaltered`, {
        signer_name: signerName.trim(),
        comment: confirmComment.trim(),
      });
      toast.success(
        `Đã gia hạn chu kỳ 3 năm cho tài liệu ${confirmingDoc.doc_code} theo BM05-KSTL!`,
      );
      setConfirmingDoc(null);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Lỗi khi xác nhận soát xét định kỳ");
    } finally {
      setIsSubmitting(false);
    }
  };

  // In Sổ BM05-KSTL
  const handlePrintMasterList = () => {
    const html = generatePeriodicReviewHtml(filteredList);
    printHtml(html);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Sổ Theo Dõi Soát Xét Tài Liệu Định Kỳ 3 Năm (BM05-KSTL)
            </h2>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Mục 7.5.3 ISO 22000:2018
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Theo Quy trình Kiểm soát Tài liệu QT-01-KSTL: Định kỳ 03 năm kể từ ngày ban hành, các
            tài liệu phải được đơn vị chủ quản soát xét lại. Nếu không có thay đổi, ghi nhận xác
            nhận BM05 để tiếp tục hiệu lực. Nếu có thay đổi, khởi tạo Phiếu đề xuất xem xét BM01.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintMasterList}
            className="gap-1.5 text-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            In Sổ BM05-KSTL
          </Button>

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
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-3.5 shadow-sm">
          <div className="text-xs text-muted-foreground">Tổng tài liệu theo dõi chu kỳ 3 năm</div>
          <div className="mt-1.5 text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-[11px] text-muted-foreground">Đã phê duyệt và đang có hiệu lực</div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Thời hạn an toàn (&gt; 60 ngày)
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-700">{stats.valid}</div>
          <div className="text-[11px] text-emerald-600/80">Tuân thủ hoàn toàn quy chuẩn</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Sắp đến hạn soát xét (&le; 60 ngày)
          </div>
          <div className="mt-1.5 text-2xl font-bold text-amber-700">{stats.dueSoon}</div>
          <div className="text-[11px] text-amber-600/80">Cần lên kế hoạch rà soát nội bộ</div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-rose-700 dark:text-rose-300">
            Quá hạn chu kỳ 3 năm
          </div>
          <div className="mt-1.5 text-2xl font-bold text-rose-700">{stats.overdue}</div>
          <div className="text-[11px] text-rose-600/80">Cảnh báo điểm không phù hợp (NC)</div>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm theo mã tài liệu, tên quy trình..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">Tất cả Phòng ban phụ trách</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">Tất cả Trạng thái chu kỳ</option>
            <option value="OVERDUE">Quá hạn soát xét</option>
            <option value="DUE_SOON">Sắp đến hạn (&le; 60 ngày)</option>
            <option value="VALID">Đang còn hiệu lực</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          Hiển thị <b>{filteredList.length}</b> / {periodicReviews.length} tài liệu
        </div>
      </div>

      {/* Bảng Danh mục BM05-KSTL */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
              <tr>
                <th className="w-12 px-3 py-3 text-center">STT</th>
                <th className="w-28 px-3 py-3">Mã tài liệu</th>
                <th className="px-3 py-3">Tên quy trình / Hướng dẫn</th>
                <th className="w-24 px-3 py-3 text-center">Phiên bản</th>
                <th className="w-36 px-3 py-3">Bộ phận quản lý</th>
                <th className="w-28 px-3 py-3 text-center">Ngày ban hành</th>
                <th className="w-28 px-3 py-3 text-center">Soát xét gần nhất</th>
                <th className="w-28 px-3 py-3 text-center">Hạn soát xét tới</th>
                <th className="w-32 px-3 py-3 text-center">Tình trạng chu kỳ</th>
                <th className="w-40 px-3 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-muted-foreground">
                    <RefreshCw className="inline-block h-4 w-4 animate-spin text-primary mr-2" />
                    Đang tính toán tiến độ soát xét 3 năm...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    Không tìm thấy tài liệu nào trong danh mục soát xét định kỳ.
                  </td>
                </tr>
              ) : (
                filteredList.map((doc, idx) => {
                  const isOverdue = doc.review_status === "OVERDUE";
                  const isDueSoon = doc.review_status === "DUE_SOON";

                  return (
                    <tr
                      key={doc.document_id}
                      className={`hover:bg-muted/30 transition ${
                        isOverdue
                          ? "bg-rose-50/30 dark:bg-rose-950/10"
                          : isDueSoon
                            ? "bg-amber-50/20 dark:bg-amber-950/10"
                            : ""
                      }`}
                    >
                      <td className="px-3 py-3 text-center text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <span className="font-mono font-bold text-primary">{doc.doc_code}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-foreground">{doc.doc_title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Phân loại: {doc.doc_type} | Chu kỳ: {doc.review_frequency_years} năm
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-mono font-semibold">
                        v{doc.current_version}
                      </td>
                      <td className="px-3 py-3 font-medium text-foreground">{doc.department}</td>
                      <td className="px-3 py-3 text-center text-muted-foreground">
                        {doc.effective_date || "—"}
                      </td>
                      <td className="px-3 py-3 text-center text-muted-foreground">
                        {doc.last_reviewed_date || doc.effective_date || "—"}
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-foreground">
                        {doc.review_due_date || "—"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 rounded border border-rose-300 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400">
                            <AlertTriangle className="h-3 w-3" />
                            Quá hạn {Math.abs(doc.days_remaining || 0)} ngày
                          </span>
                        ) : isDueSoon ? (
                          <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            <Clock className="h-3 w-3" />
                            Còn {doc.days_remaining} ngày
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Còn {doc.days_remaining} ngày
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              onClick={() => {
                                setConfirmingDoc(doc);
                                setConfirmComment(
                                  `Xác nhận quy trình ${doc.doc_code} vẫn phù hợp mục tiêu ATTP và thực tế sản xuất sau chu kỳ 3 năm, không cần sửa đổi (BM05-KSTL).`,
                                );
                              }}
                              title="Xác nhận không đổi & gia hạn 3 năm (BM05)"
                              className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 transition"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              Xác nhận BM05
                            </button>
                          )}

                          {onCreateChangeRequestForDoc && (
                            <button
                              onClick={() => onCreateChangeRequestForDoc(doc)}
                              title="Có thay đổi -> Khởi tạo Phiếu BM01"
                              className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/5 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition"
                            >
                              <FileEdit className="h-3 w-3" />
                              Tạo BM01
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

      {/* Modal Xác Nhận Không Đổi Sau Soát Xét 3 Năm (BM05) */}
      {confirmingDoc && (
        <Dialog open={Boolean(confirmingDoc)} onOpenChange={() => setConfirmingDoc(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Xác Nhận Tài Liệu Không Thay Đổi (BM05-KSTL)
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleConfirmUnaltered} className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mã tài liệu:</span>
                  <span className="font-mono font-bold text-primary">{confirmingDoc.doc_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tên tài liệu:</span>
                  <span className="font-semibold text-foreground text-right">
                    {confirmingDoc.doc_title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phiên bản hiện hành:</span>
                  <span className="font-mono font-bold">v{confirmingDoc.current_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hạn soát xét tới hiện tại:</span>
                  <span className="font-semibold">{confirmingDoc.review_due_date || "—"}</span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Họ tên & chức danh người xác nhận <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Ví dụ: Trần Anh (Đội trưởng FSMS)"
                  required
                  className="text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Nội dung / Ý kiến xác nhận soát xét định kỳ{" "}
                  <span className="text-rose-500">*</span>
                </Label>
                <textarea
                  value={confirmComment}
                  onChange={(e) => setConfirmComment(e.target.value)}
                  rows={3}
                  required
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring mt-1"
                />
              </div>

              <div className="rounded border border-emerald-200 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                Hiệu lực sau khi xác nhận: Hệ thống sẽ tự động cập nhật ngày soát xét gần nhất =
                ngày hôm nay, tự động gia hạn thêm chu kỳ 03 năm tiếp theo và ghi nhận lịch sử theo
                đúng quy định điều 7.5.3 ISO 22000.
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmingDoc(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isSubmitting ? "Đang xử lý..." : "Xác Nhận & Gia Hạn 3 Năm"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
