import { useState, useMemo } from "react";
import {
  Share2,
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
  FileCheck,
  Undo2,
  Send,
  ShieldAlert,
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
import { DocumentItem, DocumentDistribution } from "@/routes/documents";
import { generateDistributionNoticeHtml } from "./dmsPrintHelpers";
import { DEPARTMENTS } from "@/routes/documents";

interface DistributionsTabProps {
  distributions: DocumentDistribution[];
  loading: boolean;
  onRefresh: () => void;
  internalDocs: DocumentItem[];
  canEdit: boolean;
  isManagement: boolean;
}

export function DistributionsTab({
  distributions,
  loading,
  onRefresh,
  internalDocs,
  canEdit,
  isManagement,
}: DistributionsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedAck, setSelectedAck] = useState("ALL");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [acknowledgingDist, setAcknowledgingDist] = useState<DocumentDistribution | null>(null);
  const [retrievingDist, setRetrievingDist] = useState<DocumentDistribution | null>(null);

  // Form State Tạo BM02
  const [formData, setFormData] = useState({
    notice_code: `TBPH-${new Date().getFullYear()}-${String(distributions.length + 1).padStart(3, "0")}`,
    document_id: "",
    doc_code: "",
    doc_title: "",
    version: "1.0",
    department_recipient: "Ban QLCL & ATTP",
    distribution_method: "PORTAL",
    copy_number: 1,
    distribution_date: new Date().toISOString().split("T")[0],
    distributed_by_name: "Cán bộ Kiểm soát Tài liệu",
    effective_date: new Date().toISOString().split("T")[0],
    change_summary: "",
  });

  // Ack & Retrieval States
  const [ackSignerName, setAckSignerName] = useState("");
  const [retrievalDate, setRetrievalDate] = useState(new Date().toISOString().split("T")[0]);
  const [retrievalNotes, setRetrievalNotes] = useState("Đã thu hồi bản cũ và đóng dấu 'HẾT HIỆU LỰC'");

  // KPIs
  const stats = useMemo(() => {
    const total = distributions.length;
    const acknowledged = distributions.filter((d) => d.acknowledged).length;
    const pendingAck = distributions.filter((d) => !d.acknowledged).length;
    const pendingRetrieval = distributions.filter((d) => !d.obsolete_copy_retrieved).length;
    return { total, acknowledged, pendingAck, pendingRetrieval };
  }, [distributions]);

  // Filtered List
  const filteredList = useMemo(() => {
    return distributions.filter((d) => {
      const matchSearch =
        d.notice_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.doc_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.doc_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.department_recipient.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDept = selectedDept === "ALL" || d.department_recipient === selectedDept;
      const matchAck =
        selectedAck === "ALL" ? true :
        selectedAck === "ACKED" ? d.acknowledged :
        !d.acknowledged;

      return matchSearch && matchDept && matchAck;
    });
  }, [distributions, searchQuery, selectedDept, selectedAck]);

  // Mở Form Tạo Mới
  const handleOpenCreate = () => {
    setFormData({
      notice_code: `TBPH-${new Date().getFullYear()}-${String(distributions.length + 1).padStart(3, "0")}`,
      document_id: "",
      doc_code: "",
      doc_title: "",
      version: "1.0",
      department_recipient: "Ban QLCL & ATTP",
      distribution_method: "PORTAL",
      copy_number: 1,
      distribution_date: new Date().toISOString().split("T")[0],
      distributed_by_name: "Cán bộ Kiểm soát Tài liệu",
      effective_date: new Date().toISOString().split("T")[0],
      change_summary: "",
    });
    setIsCreateOpen(true);
  };

  // Chọn tài liệu để tự động điền mã, tiêu đề, version
  const handleSelectDoc = (docId: string) => {
    const found = internalDocs.find((d) => d.document_id === docId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        document_id: found.document_id,
        doc_code: found.doc_code,
        doc_title: found.doc_title,
        version: found.current_version || "1.0",
        effective_date: found.effective_date || prev.effective_date,
      }));
    }
  };

  // Submit tạo BM02
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doc_title || !formData.doc_code) {
      toast.error("Vui lòng chọn hoặc nhập tài liệu cần phân phối");
      return;
    }

    try {
      await api.post("/documents/distributions", {
        notice_code: formData.notice_code,
        document_id: formData.document_id || null,
        doc_code: formData.doc_code,
        doc_title: formData.doc_title,
        version: formData.version,
        department_recipient: formData.department_recipient,
        distribution_method: formData.distribution_method,
        copy_number: Number(formData.copy_number) || 1,
        distribution_date: formData.distribution_date,
        distributed_by_name: formData.distributed_by_name,
        effective_date: formData.effective_date,
        change_summary: formData.change_summary || null,
      });

      toast.success(`Đã phát hành thông báo phân phối ${formData.notice_code}`);
      setIsCreateOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Lỗi khi tạo thông báo phân phối");
    }
  };

  // Ký nhận phân phối
  const handleConfirmAck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledgingDist) return;

    try {
      await api.put(`/documents/distributions/${acknowledgingDist.distribution_id}/acknowledge`, {
        acknowledged_by_name: ackSignerName || "Đại diện Phòng ban tiếp nhận",
      });
      toast.success("Đã xác nhận ký nhận tài liệu thành công!");
      setAcknowledgingDist(null);
      setAckSignerName("");
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi xác nhận ký nhận");
    }
  };

  // Xác nhận thu hồi bản cũ
  const handleConfirmRetrieval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retrievingDist) return;

    try {
      await api.put(`/documents/distributions/${retrievingDist.distribution_id}/retrieve-obsolete`, {
        retrieval_date: retrievalDate,
        notes: retrievalNotes,
      });
      toast.success("Đã ghi nhận thu hồi tài liệu hết hiệu lực!");
      setRetrievingDist(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi ghi nhận thu hồi");
    }
  };

  // In BM02
  const handlePrintDist = (dist: DocumentDistribution) => {
    const html = generateDistributionNoticeHtml(dist);
    printHtml(html);
  };

  // Xóa BM02
  const handleDeleteDist = async (id: string, code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bản ghi phân phối ${code}?`)) return;
    try {
      await api.delete(`/documents/distributions/${id}`);
      toast.success(`Đã xóa bản ghi ${code}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa bản ghi phân phối");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Thông Báo Phân Phối & Thu Hồi Tài Liệu (BM02-KSTL)
            </h2>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Mục 7.5.3 ISO 22000
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Quản lý việc chuyển giao tài liệu có kiểm soát tới các đơn vị sử dụng, ghi nhận ký nhận điện tử/bản in và thu hồi tiêu hủy các phiên bản lỗi thời.
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
              Phát hành thông báo (BM02)
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-3.5 shadow-sm">
          <div className="text-xs text-muted-foreground">Tổng lượt phân phối</div>
          <div className="mt-1.5 text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-[11px] text-muted-foreground">Văn bản đã ban hành tới các đơn vị</div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Đã tiếp nhận & ký nhận</div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-700">{stats.acknowledged}</div>
          <div className="text-[11px] text-emerald-600/80">Đơn vị đã xác nhận tiếp nhận áp dụng</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Chưa ký nhận</div>
          <div className="mt-1.5 text-2xl font-bold text-amber-700">{stats.pendingAck}</div>
          <div className="text-[11px] text-amber-600/80">Cần nhắc nhở đơn vị ký xác nhận</div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-rose-700 dark:text-rose-300">Chưa thu hồi bản cũ</div>
          <div className="mt-1.5 text-2xl font-bold text-rose-700">{stats.pendingRetrieval}</div>
          <div className="text-[11px] text-rose-600/80">Rủi ro sử dụng tài liệu lỗi thời</div>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm mã thông báo, mã tài liệu, tên..."
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
            <option value="ALL">Tất cả Phòng ban nhận</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={selectedAck}
            onChange={(e) => setSelectedAck(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">Tất cả Tình trạng Ký nhận</option>
            <option value="ACKED">Đã ký nhận</option>
            <option value="PENDING">Chưa ký nhận</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          Hiển thị <b>{filteredList.length}</b> / {distributions.length} thông báo
        </div>
      </div>

      {/* Bảng Danh sách Phân phối */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
              <tr>
                <th className="w-12 px-3 py-3 text-center">STT</th>
                <th className="w-28 px-3 py-3">Mã thông báo</th>
                <th className="px-3 py-3">Tài liệu phân phối</th>
                <th className="w-20 px-3 py-3 text-center">Phiên bản</th>
                <th className="w-36 px-3 py-3">Đơn vị nhận</th>
                <th className="w-28 px-3 py-3">Hình thức</th>
                <th className="w-28 px-3 py-3 text-center">Ngày phát hành</th>
                <th className="w-36 px-3 py-3 text-center">Ký nhận</th>
                <th className="w-36 px-3 py-3 text-center">Thu hồi bản cũ</th>
                <th className="w-24 px-3 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-muted-foreground">
                    <RefreshCw className="inline-block h-4 w-4 animate-spin text-primary mr-2" />
                    Đang tải dữ liệu sổ phân phối...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    Không có thông báo phân phối tài liệu nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredList.map((dist, idx) => (
                  <tr key={dist.distribution_id} className="hover:bg-muted/30 transition">
                    <td className="px-3 py-3 text-center text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <span className="font-mono font-bold text-primary">{dist.notice_code}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-foreground">{dist.doc_title}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{dist.doc_code}</div>
                    </td>
                    <td className="px-3 py-3 text-center font-bold">v{dist.version}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground">{dist.department_recipient}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium border ${
                        dist.distribution_method === "PORTAL" ? "bg-blue-500/10 text-blue-700 border-blue-200" : "bg-purple-500/10 text-purple-700 border-purple-200"
                      }`}>
                        {dist.distribution_method === "PORTAL" ? "Portal điện tử" : `Bản in (SL: ${dist.copy_number})`}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-muted-foreground">{dist.distribution_date}</td>

                    {/* Trạng thái Ký nhận */}
                    <td className="px-3 py-3 text-center">
                      {dist.acknowledged ? (
                        <div className="text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="inline-block h-3.5 w-3.5 text-emerald-600 mr-1" />
                          {dist.acknowledged_by_name || "Đã ký nhận"}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAcknowledgingDist(dist);
                            setAckSignerName("");
                          }}
                          className="h-7 text-[10px] px-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                          <FileCheck className="h-3 w-3 mr-1" />
                          Ký nhận
                        </Button>
                      )}
                    </td>

                    {/* Trạng thái Thu hồi bản cũ */}
                    <td className="px-3 py-3 text-center">
                      {dist.obsolete_copy_retrieved ? (
                        <div className="text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="inline-block h-3.5 w-3.5 text-emerald-600 mr-1" />
                          Đã thu hồi ({dist.retrieval_date || "Xong"})
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRetrievingDist(dist);
                            setRetrievalDate(new Date().toISOString().split("T")[0]);
                          }}
                          className="h-7 text-[10px] px-2 border-rose-300 text-rose-700 hover:bg-rose-50"
                        >
                          <Undo2 className="h-3 w-3 mr-1" />
                          Thu hồi bản cũ
                        </Button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePrintDist(dist)}
                          title="In Thông báo BM02-KSTL"
                          className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>

                        {canEdit && (
                          <button
                            onClick={() => handleDeleteDist(dist.distribution_id, dist.notice_code)}
                            title="Xóa phân phối"
                            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Phát Hành Thông Báo BM02 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Phát Hành Thông Báo Phân Phối Tài Liệu (BM02-KSTL)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Mã số thông báo</Label>
                <Input
                  value={formData.notice_code}
                  onChange={(e) => setFormData({ ...formData, notice_code: e.target.value })}
                  required
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Ngày phát hành</Label>
                <Input
                  type="date"
                  value={formData.distribution_date}
                  onChange={(e) => setFormData({ ...formData, distribution_date: e.target.value })}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Chọn tài liệu phân phối từ Hệ thống</Label>
              <select
                value={formData.document_id}
                onChange={(e) => handleSelectDoc(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">-- Chọn tài liệu đã ban hành --</option>
                {internalDocs.map((doc) => (
                  <option key={doc.document_id} value={doc.document_id}>
                    [{doc.doc_code}] {doc.doc_title} (v{doc.current_version})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Mã hiệu tài liệu <span className="text-rose-500">*</span></Label>
                <Input
                  value={formData.doc_code}
                  onChange={(e) => setFormData({ ...formData, doc_code: e.target.value })}
                  required
                  className="font-mono text-xs"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold">Tên tài liệu / Quy trình <span className="text-rose-500">*</span></Label>
                <Input
                  value={formData.doc_title}
                  onChange={(e) => setFormData({ ...formData, doc_title: e.target.value })}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Phiên bản ban hành</Label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Ngày bắt đầu hiệu lực</Label>
                <Input
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Người phát hành (Doc Controller)</Label>
                <Input
                  value={formData.distributed_by_name}
                  onChange={(e) => setFormData({ ...formData, distributed_by_name: e.target.value })}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label className="text-xs font-semibold">Đơn vị nhận tài liệu</Label>
                <select
                  value={formData.department_recipient}
                  onChange={(e) => setFormData({ ...formData, department_recipient: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1">
                <Label className="text-xs font-semibold">Hình thức phân phối</Label>
                <select
                  value={formData.distribution_method}
                  onChange={(e) => setFormData({ ...formData, distribution_method: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="PORTAL">Bản điện tử (Portal ISO)</option>
                  <option value="HARDCOPY">Bản in có dấu KIỂM SOÁT</option>
                </select>
              </div>

              <div className="col-span-1">
                <Label className="text-xs font-semibold">Số lượng bản sao (Copy No.)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.copy_number}
                  onChange={(e) => setFormData({ ...formData, copy_number: parseInt(e.target.value) || 1 })}
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Tóm tắt nội dung thay đổi chính</Label>
              <textarea
                value={formData.change_summary}
                onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
                rows={3}
                placeholder="Ghi rõ tóm tắt các điểm thay đổi chính so với phiên bản trước..."
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Hủy bỏ
              </Button>
              <Button type="submit" size="sm" className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Phát Hành Phân Phối (BM02)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Ký Nhận Tiếp Nhận Tài Liệu */}
      {acknowledgingDist && (
        <Dialog open={Boolean(acknowledgingDist)} onOpenChange={() => setAcknowledgingDist(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Xác Nhận Ký Nhận Tài Liệu
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleConfirmAck} className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                <div><b>Mã thông báo:</b> <span className="font-mono font-bold text-primary">{acknowledgingDist.notice_code}</span></div>
                <div><b>Tài liệu:</b> [{acknowledgingDist.doc_code}] {acknowledgingDist.doc_title} (v{acknowledgingDist.version})</div>
                <div><b>Đơn vị nhận:</b> {acknowledgingDist.department_recipient}</div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Họ tên cán bộ đại diện ký nhận <span className="text-rose-500">*</span></Label>
                <Input
                  value={ackSignerName}
                  onChange={(e) => setAckSignerName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn Trưởng (Trưởng Bộ phận)"
                  required
                  className="text-xs mt-1"
                />
              </div>

              <div className="rounded border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                Lưu ý: Bằng việc ký nhận, đơn vị cam kết phổ biến và huấn luyện cho toàn bộ nhân sự liên quan áp dụng đúng quy trình đã ban hành.
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setAcknowledgingDist(null)}>
                  Hủy
                </Button>
                <Button type="submit" size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  <Check className="h-3.5 w-3.5" />
                  Xác Nhận Ký Nhận
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Thu Hồi Tài Liệu Lỗi Thời */}
      {retrievingDist && (
        <Dialog open={Boolean(retrievingDist)} onOpenChange={() => setRetrievingDist(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                Ghi Nhận Thu Hồi Tài Liệu Lỗi Thời
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleConfirmRetrieval} className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                <div><b>Mã thông báo:</b> <span className="font-mono font-bold text-primary">{retrievingDist.notice_code}</span></div>
                <div><b>Tài liệu:</b> [{retrievingDist.doc_code}] {retrievingDist.doc_title}</div>
                <div><b>Đơn vị:</b> {retrievingDist.department_recipient}</div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Ngày hoàn tất thu hồi</Label>
                <Input
                  type="date"
                  value={retrievalDate}
                  onChange={(e) => setRetrievalDate(e.target.value)}
                  required
                  className="text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Ghi chú & Phương thức xử lý</Label>
                <Input
                  value={retrievalNotes}
                  onChange={(e) => setRetrievalNotes(e.target.value)}
                  placeholder="Ví dụ: Đã thu hồi bản in cũ và đóng dấu HẾT HIỆU LỰC"
                  className="text-xs mt-1"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setRetrievingDist(null)}>
                  Hủy
                </Button>
                <Button type="submit" size="sm" className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white">
                  <Check className="h-3.5 w-3.5" />
                  Xác Nhận Đã Thu Hồi
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
