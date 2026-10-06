import { useState, useMemo } from "react";
import {
  Archive,
  Plus,
  Search,
  RefreshCw,
  Printer,
  Trash2,
  Edit,
  Clock,
  ShieldCheck,
  AlertTriangle,
  FolderArchive,
  Flame,
  CheckCircle2,
  FileText,
  Lock,
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
import { RecordRetention } from "@/routes/documents";
import { generateRecordRetentionMasterListHtml } from "./dmsPrintHelpers";
import { DEPARTMENTS } from "@/routes/documents";

interface RecordsRetentionTabProps {
  retentionRecords: RecordRetention[];
  loading: boolean;
  onRefresh: () => void;
  canEdit: boolean;
  isManagement: boolean;
}

export function RecordsRetentionTab({
  retentionRecords,
  loading,
  onRefresh,
  canEdit,
  isManagement,
}: RecordsRetentionTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordRetention | null>(null);
  const [disposingRecord, setDisposingRecord] = useState<RecordRetention | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    record_code: "",
    record_name: "",
    department: "Ban QLCL & ATTP",
    storage_location: "Tủ hồ sơ QA & Server sao lưu định kỳ",
    retention_period: "03 năm",
    disposal_method: "Hủy bằng máy cắt vụn & Xóa file số",
    responsible_person: "Trưởng Bộ phận QLCL",
    status: "RETAINED",
    notes: "",
  });

  // Disposal modal state
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().split("T")[0]);
  const [disposalCouncil, setDisposalCouncil] = useState(
    "Hội đồng gồm: Đại diện QA, Quản đốc, Hành chính",
  );
  const [disposalMinutesCode, setDisposalMinutesCode] = useState(
    `BBTH-${new Date().getFullYear()}-01`,
  );
  const [confirmExpired, setConfirmExpired] = useState(false);

  // KPIs
  const stats = useMemo(() => {
    const total = retentionRecords.length;
    const retained = retentionRecords.filter((r) => r.status === "RETAINED").length;
    const readyForDisposal = retentionRecords.filter(
      (r) => r.status === "READY_FOR_DISPOSAL",
    ).length;
    const disposed = retentionRecords.filter((r) => r.status === "DISPOSED").length;
    return { total, retained, readyForDisposal, disposed };
  }, [retentionRecords]);

  // Filtered List
  const filteredList = useMemo(() => {
    return retentionRecords.filter((r) => {
      const matchSearch =
        r.record_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.record_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.storage_location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDept = selectedDept === "ALL" || r.department === selectedDept;
      const matchStatus = selectedStatus === "ALL" || r.status === selectedStatus;

      return matchSearch && matchDept && matchStatus;
    });
  }, [retentionRecords, searchQuery, selectedDept, selectedStatus]);

  // Mở Form Thêm Mới
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setFormData({
      record_code: "",
      record_name: "",
      department: "Ban QLCL & ATTP",
      storage_location: "Tủ hồ sơ QA & Server sao lưu định kỳ",
      retention_period: "03 năm",
      disposal_method: "Hủy bằng máy cắt vụn & Xóa file số",
      responsible_person: "Trưởng Bộ phận QLCL",
      status: "RETAINED",
      notes: "",
    });
    setIsFormOpen(true);
  };

  // Mở Form Sửa
  const handleOpenEdit = (rec: RecordRetention) => {
    setEditingRecord(rec);
    setFormData({
      record_code: rec.record_code,
      record_name: rec.record_name,
      department: rec.department,
      storage_location: rec.storage_location,
      retention_period: rec.retention_period,
      disposal_method: rec.disposal_method || "Hủy bằng máy cắt vụn",
      responsible_person: rec.responsible_person || "Trưởng Bộ phận",
      status: rec.status,
      notes: rec.notes || "",
    });
    setIsFormOpen(true);
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.record_code || !formData.record_name) {
      toast.error("Vui lòng điền mã biểu mẫu và tên hồ sơ");
      return;
    }

    try {
      if (editingRecord) {
        await api.put(`/documents/retention/${editingRecord.retention_id}`, formData);
        toast.success(`Đã cập nhật hồ sơ ${formData.record_code}`);
      } else {
        await api.post("/documents/retention", formData);
        toast.success(`Đã thêm mới hồ sơ ${formData.record_code}`);
      }
      setIsFormOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Lỗi khi lưu danh mục lưu trữ hồ sơ");
    }
  };

  // Thực hiện Tiêu hủy (Disposal)
  const handleConfirmDisposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disposingRecord) return;
    if (disposingRecord.status !== "READY_FOR_DISPOSAL" && !confirmExpired) {
      toast.error(
        "Vui lòng tích chọn xác nhận hồ sơ đã hết hạn bảo quản hoặc có quyết định tiêu hủy (BM02-KSHS).",
      );
      return;
    }
    if (!disposalMinutesCode.trim() || !disposalCouncil.trim()) {
      toast.error("Vui lòng nhập đầy đủ Số biên bản và Hội đồng tiêu hủy theo BM02-KSHS.");
      return;
    }

    try {
      await api.put(`/documents/retention/${disposingRecord.retention_id}/dispose`, {
        disposal_date: disposalDate,
        disposal_council: disposalCouncil.trim(),
        disposal_minutes_code: disposalMinutesCode.trim(),
        confirm_expired: confirmExpired || disposingRecord.status === "READY_FOR_DISPOSAL",
      });
      toast.success(`Đã hoàn tất thủ tục tiêu hủy hồ sơ ${disposingRecord.record_code}`);
      setDisposingRecord(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi tiêu hủy hồ sơ");
    }
  };

  // Chuyển hồ sơ sang Chờ tiêu hủy (BM02-KSHS)
  const handleMarkReadyForDisposal = async (rec: RecordRetention) => {
    if (
      !confirm(
        `Lập đề xuất chuyển hồ sơ "${rec.record_code} - ${rec.record_name}" sang trạng thái Chờ tiêu hủy (BM02-KSHS)?`,
      )
    )
      return;
    try {
      await api.put(`/documents/retention/${rec.retention_id}`, {
        status: "READY_FOR_DISPOSAL",
      });
      toast.success(`Đã chuyển hồ sơ ${rec.record_code} sang Chờ tiêu hủy`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể cập nhật trạng thái");
    }
  };

  // Hủy theo dõi hồ sơ (Soft-delete lưu vết)
  const handleDelete = async (id: string, code: string) => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn hủy theo dõi hồ sơ ${code} khỏi danh mục lưu trữ? Hệ thống sẽ lưu vết hủy theo chuẩn ISO 22000.`,
      )
    )
      return;
    try {
      await api.delete(`/documents/retention/${id}`);
      toast.success(`Đã hủy theo dõi hồ sơ ${code} (Lưu vết thành công)`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa hồ sơ lưu trữ này");
    }
  };

  // In danh mục BM05
  const handlePrintMasterList = () => {
    const html = generateRecordRetentionMasterListHtml(filteredList);
    printHtml(html);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Danh Mục Hồ Sơ Lưu Trữ (BM01-KSHS) & Tiêu Hủy (BM02-KSHS)
            </h2>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Mục 7.5.3 ISO 22000 & QT-KSHS
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Quy định địa điểm, thời hạn bảo quản và hình thức tiêu hủy các bằng chứng thực thi hệ
            thống Quản lý An toàn thực phẩm (hồ sơ CCP, OPRP, kiểm tra xuất xưởng...).
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
            In Danh Mục BM01-KSHS
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

          {canEdit && (
            <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 text-xs shadow-sm">
              <Plus className="h-4 w-4" />
              Thêm hồ sơ lưu trữ (BM01-KSHS)
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-3.5 shadow-sm">
          <div className="text-xs text-muted-foreground">Tổng số loại hồ sơ kiểm soát</div>
          <div className="mt-1.5 text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-[11px] text-muted-foreground">
            Biểu mẫu hồ sơ có quy định lưu trữ
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Đang trong thời hạn lưu trữ
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-700">{stats.retained}</div>
          <div className="text-[11px] text-emerald-600/80">Đảm bảo truy xuất nguồn gốc</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Sẵn sàng / Chờ tiêu hủy
          </div>
          <div className="mt-1.5 text-2xl font-bold text-amber-700">{stats.readyForDisposal}</div>
          <div className="text-[11px] text-amber-600/80">Đã hết thời hạn quy định</div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
            Đã tiêu hủy có biên bản
          </div>
          <div className="mt-1.5 text-2xl font-bold text-blue-700">{stats.disposed}</div>
          <div className="text-[11px] text-blue-600/80">Đúng quy trình BM02-KSHS</div>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm mã biểu mẫu, tên hồ sơ, nơi lưu..."
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
            <option value="ALL">Tất cả Bộ phận phụ trách</option>
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
            <option value="ALL">Tất cả Tình trạng Lưu trữ</option>
            <option value="RETAINED">Đang lưu trữ</option>
            <option value="READY_FOR_DISPOSAL">Chờ tiêu hủy</option>
            <option value="DISPOSED">Đã tiêu hủy</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          Hiển thị <b>{filteredList.length}</b> / {retentionRecords.length} hồ sơ
        </div>
      </div>

      {/* Bảng Danh mục BM05 */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
              <tr>
                <th className="w-12 px-3 py-3 text-center">STT</th>
                <th className="w-28 px-3 py-3">Mã biểu mẫu</th>
                <th className="px-3 py-3">Tên hồ sơ ghi chép</th>
                <th className="w-36 px-3 py-3">Bộ phận lưu</th>
                <th className="w-44 px-3 py-3">Nơi lưu trữ</th>
                <th className="w-28 px-3 py-3 text-center">Thời gian lưu</th>
                <th className="w-36 px-3 py-3">Phương thức hủy</th>
                <th className="w-28 px-3 py-3 text-center">Tình trạng</th>
                <th className="w-28 px-3 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    <RefreshCw className="inline-block h-4 w-4 animate-spin text-primary mr-2" />
                    Đang tải danh mục BM01-KSHS...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    Không có hồ sơ lưu trữ nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredList.map((rec, idx) => (
                  <tr key={rec.retention_id} className="hover:bg-muted/30 transition">
                    <td className="px-3 py-3 text-center text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <span className="font-mono font-bold text-primary">{rec.record_code}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-foreground">{rec.record_name}</div>
                      {rec.responsible_person && (
                        <div className="text-[11px] text-muted-foreground">
                          Chịu trách nhiệm: {rec.responsible_person}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-medium text-foreground">{rec.department}</td>
                    <td className="px-3 py-3 text-muted-foreground">{rec.storage_location}</td>
                    <td className="px-3 py-3 text-center font-bold text-foreground">
                      {rec.retention_period}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-[11px]">
                      {rec.disposal_method}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold border ${
                          rec.status === "RETAINED"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                            : rec.status === "READY_FOR_DISPOSAL"
                              ? "bg-amber-500/10 text-amber-700 border-amber-300"
                              : "bg-blue-500/10 text-blue-700 border-blue-300"
                        }`}
                      >
                        {rec.status === "RETAINED"
                          ? "Đang lưu trữ"
                          : rec.status === "READY_FOR_DISPOSAL"
                            ? "Chờ tiêu hủy"
                            : "Đã tiêu hủy"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && rec.status === "RETAINED" && (
                          <button
                            onClick={() => handleMarkReadyForDisposal(rec)}
                            title="Lập danh mục đề xuất tiêu hủy (chuyển sang Chờ tiêu hủy BM02-KSHS)"
                            className="rounded p-1.5 text-amber-600 hover:bg-amber-500/10 transition"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {canEdit && rec.status !== "DISPOSED" && (
                          <button
                            onClick={() => {
                              setDisposingRecord(rec);
                              setDisposalDate(new Date().toISOString().split("T")[0]);
                              setDisposalMinutesCode(
                                `BBTH-${new Date().getFullYear()}-${rec.record_code.replace(/[^A-Za-z0-9]/g, "").slice(-4) || "01"}`,
                              );
                              setConfirmExpired(rec.status === "READY_FOR_DISPOSAL");
                            }}
                            title="Lập phiếu & Biên bản tiêu hủy hồ sơ (BM02-KSHS)"
                            className="rounded p-1.5 text-rose-600 hover:bg-rose-500/10 transition"
                          >
                            <Flame className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {rec.status === "DISPOSED" ? (
                          <span
                            className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground font-medium"
                            title={`Đã tiêu hủy ngày ${rec.disposal_date || ""} (BB: ${rec.disposal_minutes_code || ""}). Dữ liệu đã khóa để lưu vết.`}
                          >
                            <Lock className="h-3 w-3 text-muted-foreground" />
                            Đã khóa
                          </span>
                        ) : (
                          <>
                            {canEdit && (
                              <button
                                onClick={() => handleOpenEdit(rec)}
                                title="Chỉnh sửa hồ sơ"
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {canEdit && (
                              <button
                                onClick={() => handleDelete(rec.retention_id, rec.record_code)}
                                title="Hủy theo dõi hồ sơ (Soft-delete lưu vết ISO 22000)"
                                className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </>
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

      {/* Modal Thêm Mới / Sửa BM01-KSHS */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Archive className="h-5 w-5 text-primary" />
              {editingRecord
                ? "Cập Nhật Hồ Sơ Lưu Trữ (BM01-KSHS)"
                : "Thêm Mới Hồ Sơ Lưu Trữ (BM01-KSHS)"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">
                  Mã biểu mẫu / Hồ sơ <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={formData.record_code}
                  onChange={(e) => setFormData({ ...formData, record_code: e.target.value })}
                  placeholder="Ví dụ: BM01-KSQT"
                  required
                  className="font-mono text-xs"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold">
                  Tên hồ sơ ghi chép <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={formData.record_name}
                  onChange={(e) => setFormData({ ...formData, record_name: e.target.value })}
                  placeholder="Ví dụ: Nhật ký kiểm tra công đoạn sơ chế"
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Bộ phận quản lý hồ sơ</Label>
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
                <Label className="text-xs font-semibold">Thời hạn lưu trữ</Label>
                <Input
                  value={formData.retention_period}
                  onChange={(e) => setFormData({ ...formData, retention_period: e.target.value })}
                  placeholder="Ví dụ: 03 năm, Hạn sử dụng + 1 năm..."
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Nơi lưu trữ</Label>
                <Input
                  value={formData.storage_location}
                  onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                  placeholder="Ví dụ: Tủ hồ sơ QA số 02, Server backup"
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Người chịu trách nhiệm</Label>
                <Input
                  value={formData.responsible_person}
                  onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                  placeholder="Ví dụ: Trưởng Bộ phận QA"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Phương thức tiêu hủy khi hết hạn</Label>
                <Input
                  value={formData.disposal_method}
                  onChange={(e) => setFormData({ ...formData, disposal_method: e.target.value })}
                  placeholder="Ví dụ: Cắt vụn, Xóa vĩnh viễn file số..."
                  className="text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Tình trạng lưu trữ</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="RETAINED">Đang lưu trữ (Trong thời hạn bảo quản)</option>
                  <option value="READY_FOR_DISPOSAL">Chờ tiêu hủy (Đã hết thời hạn lưu trữ)</option>
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  * Trạng thái "Đã tiêu hủy" chỉ được cấp sau khi lập và ký Biên bản tiêu hủy
                  BM02-KSHS.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Ghi chú bổ sung</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Ghi chú quy cách đóng gói cặp hồ sơ, lưu ý khi truy xuất..."
                className="w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" size="sm" className="gap-1.5">
                {editingRecord ? "Cập Nhật Hồ Sơ" : "Thêm Vào Danh Mục BM01-KSHS"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Tiêu Hủy Hồ Sơ (BM02-KSHS) */}
      {disposingRecord && (
        <Dialog open={Boolean(disposingRecord)} onOpenChange={() => setDisposingRecord(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Flame className="h-5 w-5 text-rose-600" />
                Thực Hiện Tiêu Hủy Hồ Sơ (BM02-KSHS)
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleConfirmDisposal} className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                <div>
                  <b>Mã biểu mẫu:</b>{" "}
                  <span className="font-mono font-bold text-primary">
                    {disposingRecord.record_code}
                  </span>
                </div>
                <div>
                  <b>Tên hồ sơ:</b> {disposingRecord.record_name}
                </div>
                <div>
                  <b>Bộ phận:</b> {disposingRecord.department}
                </div>
                <div>
                  <b>Thời hạn lưu:</b> {disposingRecord.retention_period}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Số biên bản tiêu hủy <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={disposalMinutesCode}
                  onChange={(e) => setDisposalMinutesCode(e.target.value)}
                  required
                  className="font-mono text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Ngày thực hiện tiêu hủy <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={disposalDate}
                  onChange={(e) => setDisposalDate(e.target.value)}
                  required
                  className="text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Thành phần Hội đồng tiêu hủy / Chứng kiến
                </Label>
                <Input
                  value={disposalCouncil}
                  onChange={(e) => setDisposalCouncil(e.target.value)}
                  required
                  className="text-xs mt-1"
                />
              </div>

              <div className="flex items-start gap-2 rounded border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-900">
                <input
                  type="checkbox"
                  id="confirm-expired-checkbox"
                  checked={confirmExpired}
                  onChange={(e) => setConfirmExpired(e.target.checked)}
                  className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                />
                <label
                  htmlFor="confirm-expired-checkbox"
                  className="text-xs cursor-pointer font-medium leading-relaxed"
                >
                  Xác nhận hồ sơ đã hết hạn lưu trữ hoặc có văn bản chấp thuận tiêu hủy của Ban Giám
                  Đốc theo quy trình BM02-KSHS <span className="text-rose-600 font-bold">*</span>
                </label>
              </div>

              <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                Lưu ý: Toàn bộ thông tin biên bản và lịch sử hồ sơ sau khi tiêu hủy sẽ được khóa
                vĩnh viễn để phục vụ thanh tra, đánh giá chứng nhận ISO 22000.
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDisposingRecord(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Xác Nhận Tiêu Hủy
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
