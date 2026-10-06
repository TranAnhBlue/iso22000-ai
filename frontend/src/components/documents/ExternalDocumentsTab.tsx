import { useState, useMemo } from "react";
import {
  Globe,
  Plus,
  Search,
  RefreshCw,
  Printer,
  Trash2,
  Edit,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Building,
  Calendar,
  FileSpreadsheet,
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
import { ExternalDocument } from "@/routes/documents";
import { generateExternalDocMasterListHtml } from "./dmsPrintHelpers";
import { DEPARTMENTS } from "@/routes/documents";

interface ExternalDocumentsTabProps {
  externalDocs: ExternalDocument[];
  loading: boolean;
  onRefresh: () => void;
  canEdit: boolean;
  isManagement: boolean;
}

const DOC_TYPES: Record<string, string> = {
  LAW: "Luật / Đạo luật",
  DECREE: "Nghị định Chính phủ",
  CIRCULAR: "Thông tư Bộ ngành",
  STANDARD_QCVN: "Quy chuẩn QCVN / TCVN / Codex",
  CUSTOMER_REQ: "Yêu cầu Khách hàng",
  OTHER: "Tài liệu / Cẩm nang bên ngoài khác",
};

export function ExternalDocumentsTab({
  externalDocs,
  loading,
  onRefresh,
  canEdit,
  isManagement,
}: ExternalDocumentsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedDept, setSelectedDept] = useState("ALL");

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ExternalDocument | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    doc_code: "",
    doc_title: "",
    issuing_body: "Bộ Y tế",
    doc_type: "CIRCULAR",
    issue_date: "",
    effective_date: "",
    managing_department: "Ban QLCL & ATTP",
    storage_location: "Tủ hồ sơ QA & Thư mục số Server",
    status: "ACTIVE",
    attachment_url: "",
    notes: "",
  });

  // KPIs
  const stats = useMemo(() => {
    const total = externalDocs.length;
    const active = externalDocs.filter((d) => d.status === "ACTIVE").length;
    const qcvn = externalDocs.filter((d) => d.doc_type === "STANDARD_QCVN").length;
    const laws = externalDocs.filter((d) =>
      ["LAW", "DECREE", "CIRCULAR"].includes(d.doc_type),
    ).length;
    return { total, active, qcvn, laws };
  }, [externalDocs]);

  // Filtered List
  const filteredList = useMemo(() => {
    return externalDocs.filter((d) => {
      const matchSearch =
        d.doc_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.doc_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.issuing_body.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType = selectedType === "ALL" || d.doc_type === selectedType;
      const matchStatus = selectedStatus === "ALL" || d.status === selectedStatus;
      const matchDept = selectedDept === "ALL" || d.managing_department === selectedDept;

      return matchSearch && matchType && matchStatus && matchDept;
    });
  }, [externalDocs, searchQuery, selectedType, selectedStatus, selectedDept]);

  // Mở Form Thêm mới
  const handleOpenCreate = () => {
    setEditingDoc(null);
    setFormData({
      doc_code: "",
      doc_title: "",
      issuing_body: "Bộ Y tế",
      doc_type: "CIRCULAR",
      issue_date: "",
      effective_date: new Date().toISOString().split("T")[0],
      managing_department: "Ban QLCL & ATTP",
      storage_location: "Tủ hồ sơ QA & Thư mục số Server",
      status: "ACTIVE",
      attachment_url: "",
      notes: "",
    });
    setIsFormOpen(true);
  };

  // Mở Form Sửa
  const handleOpenEdit = (doc: ExternalDocument) => {
    setEditingDoc(doc);
    setFormData({
      doc_code: doc.doc_code,
      doc_title: doc.doc_title,
      issuing_body: doc.issuing_body,
      doc_type: doc.doc_type,
      issue_date: doc.issue_date || "",
      effective_date: doc.effective_date || "",
      managing_department: doc.managing_department || "Ban QLCL & ATTP",
      storage_location: doc.storage_location || "",
      status: doc.status,
      attachment_url: doc.attachment_url || "",
      notes: doc.notes || "",
    });
    setIsFormOpen(true);
  };

  // Lưu Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doc_code || !formData.doc_title || !formData.issuing_body) {
      toast.error("Vui lòng điền đầy đủ các thông tin bắt buộc");
      return;
    }

    try {
      if (editingDoc) {
        await api.put(`/documents/external/${editingDoc.external_doc_id}`, formData);
        toast.success(`Đã cập nhật văn bản ${formData.doc_code}`);
      } else {
        await api.post("/documents/external", formData);
        toast.success(`Đã thêm mới văn bản ${formData.doc_code}`);
      }
      setIsFormOpen(false);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Lỗi khi lưu tài liệu bên ngoài");
    }
  };

  // Xóa văn bản
  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa văn bản bên ngoài ${code}?`)) return;
    try {
      await api.delete(`/documents/external/${id}`);
      toast.success(`Đã xóa văn bản ${code}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xóa văn bản này");
    }
  };

  // In danh mục BM04
  const handlePrintMasterList = () => {
    const html = generateExternalDocMasterListHtml(filteredList);
    printHtml(html);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Danh Mục Tài Liệu Bên Ngoài (BM04-KSTL)
            </h2>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Mục 7.5.3 ISO 22000
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Theo dõi tính hiệu lực của các văn bản pháp luật, Nghị định, Thông tư, Quy chuẩn QCVN,
            Tiêu chuẩn TCVN và Yêu cầu khách hàng liên quan đến ATTP.
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
            In Sổ BM04-KSTL
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
              Thêm văn bản (BM04)
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-3.5 shadow-sm">
          <div className="text-xs text-muted-foreground">Tổng số tài liệu bên ngoài</div>
          <div className="mt-1.5 text-2xl font-bold text-foreground">{stats.total}</div>
          <div className="text-[11px] text-muted-foreground">Văn bản có trong sổ theo dõi</div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Đang có hiệu lực thi hành
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-700">{stats.active}</div>
          <div className="text-[11px] text-emerald-600/80">Áp dụng vào kiểm soát ATTP</div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
            Luật & Thông tư quản lý
          </div>
          <div className="mt-1.5 text-2xl font-bold text-blue-700">{stats.laws}</div>
          <div className="text-[11px] text-blue-600/80">Bộ Y tế, NN&PTNT, Công Thương</div>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-500/5 p-3.5 shadow-sm">
          <div className="text-xs font-medium text-purple-700 dark:text-purple-300">
            Tiêu chuẩn & Quy chuẩn Kỹ thuật
          </div>
          <div className="mt-1.5 text-2xl font-bold text-purple-700">{stats.qcvn}</div>
          <div className="text-[11px] text-purple-600/80">QCVN, TCVN, CODEX Quốc tế</div>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm mã số, số hiệu, tên văn bản..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">Tất cả Phân loại</option>
            {Object.entries(DOC_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">Tất cả Hiệu lực</option>
            <option value="ACTIVE">Đang hiệu lực</option>
            <option value="SUPERSEDED">Hết hiệu lực (Bị thay thế)</option>
            <option value="UNDER_REVIEW">Đang rà soát</option>
          </select>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">Tất cả Bộ phận theo dõi</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-muted-foreground">
          Hiển thị <b>{filteredList.length}</b> / {externalDocs.length} văn bản
        </div>
      </div>

      {/* Bảng Danh mục BM04 */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
              <tr>
                <th className="w-12 px-3 py-3 text-center">STT</th>
                <th className="w-36 px-3 py-3">Mã / Số hiệu văn bản</th>
                <th className="px-3 py-3">Tên văn bản / Tiêu chuẩn</th>
                <th className="w-36 px-3 py-3">Cơ quan ban hành</th>
                <th className="w-32 px-3 py-3">Phân loại</th>
                <th className="w-24 px-3 py-3 text-center">Ngày hiệu lực</th>
                <th className="w-32 px-3 py-3">Bộ phận quản lý</th>
                <th className="w-24 px-3 py-3 text-center">Hiệu lực</th>
                <th className="w-20 px-3 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    <RefreshCw className="inline-block h-4 w-4 animate-spin text-primary mr-2" />
                    Đang tải danh mục BM04-KSTL...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    Không có tài liệu bên ngoài nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredList.map((doc, idx) => (
                  <tr key={doc.external_doc_id} className="hover:bg-muted/30 transition">
                    <td className="px-3 py-3 text-center text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <span className="font-mono font-bold text-primary">{doc.doc_code}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-foreground">{doc.doc_title}</div>
                      {doc.notes && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1">
                          {doc.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-medium text-foreground">{doc.issuing_body}</td>
                    <td className="px-3 py-3">
                      <span className="inline-block rounded px-2 py-0.5 text-[10px] font-medium border bg-muted/50 text-muted-foreground">
                        {DOC_TYPES[doc.doc_type] || doc.doc_type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-muted-foreground">
                      {doc.effective_date || "---"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground">{doc.managing_department}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {doc.storage_location}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold border ${
                          doc.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                            : doc.status === "SUPERSEDED"
                              ? "bg-rose-500/10 text-rose-700 border-rose-300"
                              : "bg-amber-500/10 text-amber-700 border-amber-300"
                        }`}
                      >
                        {doc.status === "ACTIVE"
                          ? "Đang hiệu lực"
                          : doc.status === "SUPERSEDED"
                            ? "Hết hiệu lực"
                            : "Đang rà soát"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEdit(doc)}
                            title="Chỉnh sửa văn bản"
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {canEdit && (
                          <button
                            onClick={() => handleDelete(doc.external_doc_id, doc.doc_code)}
                            title="Xóa văn bản"
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

      {/* Modal Thêm Mới / Sửa BM04 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              {editingDoc
                ? "Cập Nhật Văn Bản Bên Ngoài (BM04-KSTL)"
                : "Thêm Mới Văn Bản Bên Ngoài (BM04-KSTL)"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">
                  Số hiệu / Mã văn bản <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={formData.doc_code}
                  onChange={(e) => setFormData({ ...formData, doc_code: e.target.value })}
                  placeholder="Ví dụ: 55/2010/QH12"
                  required
                  className="font-mono text-xs"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold">
                  Cơ quan / Tổ chức ban hành <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={formData.issuing_body}
                  onChange={(e) => setFormData({ ...formData, issuing_body: e.target.value })}
                  placeholder="Ví dụ: Quốc Hội, Bộ Y tế, Ban Codex..."
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">
                Tên gọi / Tiêu đề văn bản <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={formData.doc_title}
                onChange={(e) => setFormData({ ...formData, doc_title: e.target.value })}
                placeholder="Ví dụ: Luật An toàn thực phẩm số 55/2010/QH12"
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Phân loại văn bản</Label>
                <select
                  value={formData.doc_type}
                  onChange={(e) => setFormData({ ...formData, doc_type: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {Object.entries(DOC_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Tình trạng hiệu lực</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ACTIVE">Đang có hiệu lực thi hành</option>
                  <option value="SUPERSEDED">Hết hiệu lực (Đã bị thay thế)</option>
                  <option value="UNDER_REVIEW">Đang trong diện rà soát cập nhật</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Ngày ban hành</Label>
                <Input
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Ngày bắt đầu hiệu lực</Label>
                <Input
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Bộ phận phụ trách theo dõi</Label>
                <select
                  value={formData.managing_department}
                  onChange={(e) =>
                    setFormData({ ...formData, managing_department: e.target.value })
                  }
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
                <Label className="text-xs font-semibold">Nơi lưu trữ (Bản cứng / File số)</Label>
                <Input
                  value={formData.storage_location}
                  onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                  placeholder="Ví dụ: Tủ hồ sơ QA số 01, Server lưu trữ"
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Ghi chú & Phạm vi áp dụng</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Ghi rõ phạm vi kiểm soát áp dụng trong chuỗi sản xuất..."
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
                {editingDoc ? "Cập Nhật Văn Bản" : "Thêm Vào Sổ BM04"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
