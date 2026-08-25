import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
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
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Eye,
  Pencil,
  Trash2,
  FileCheck,
  BookOpen,
  Check,
  FileSpreadsheet,
  FileCode,
  Calendar,
  Building2,
  Copy,
  ShieldCheck,
  Award,
  Link as LinkIcon,
  XCircle,
  FolderOpen,
} from "lucide-react";
import api from "@/lib/api";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Tài liệu & SOPs – WCERT ISO 22000" },
      {
        name: "description",
        content: "Quản lý hệ thống tài liệu ISO 22000:2018 5 cấp: Chính sách, Sổ tay, SOP, Hướng dẫn công việc và Biểu mẫu.",
      },
    ],
  }),
  component: () => (
    <AppShell module="documents">
      <DocumentsPage />
    </AppShell>
  ),
});

// Định nghĩa Cấu trúc Dữ liệu Tài liệu
export interface DocumentItem {
  id: string; // mapped from document_id
  document_id: string;
  doc_code: string;
  doc_title: string;
  doc_type: string; // POLICY, MANUAL, SOP, WI, FORM, RECORD
  department?: string | null;
  standard?: string | null;
  current_version: string;
  status: string; // APPROVED, PENDING_APPROVAL, DRAFT, OBSOLETE
  file_url?: string | null;
  approved_by?: string | null;
  approver_name?: string | null;
  effective_date?: string | null;
  created_at?: string | null;
}

// Danh sách phòng ban chuẩn hóa
export const DEPARTMENTS = [
  "Ban Giám đốc",
  "Ban QLCL & ATTP",
  "Phòng Sản xuất",
  "Phòng QC",
  "Phòng Mua hàng",
  "Phòng Kỹ thuật & Thiết bị",
  "Phòng Kho & Vận chuyển",
  "Phòng Hành chính - Kế toán",
  "Phòng Kinh doanh",
];

// Danh sách tiêu chuẩn ATTP
export const STANDARDS = [
  "ISO 22000:2018",
  "HACCP Codex",
  "PRP / SSOP",
  "FSSC 22000",
  "ISO 9001:2015",
  "VietGAP / GlobalGAP",
];

// Cấu hình 5 cấp tài liệu ISO 22000:2018
export const DOC_TYPES: Record<
  string,
  { label: string; level: string; color: string; bg: string; icon: any }
> = {
  POLICY: {
    label: "Chính sách",
    level: "Cấp 1",
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-500/10 border-purple-200 dark:border-purple-800",
    icon: BookOpen,
  },
  MANUAL: {
    label: "Sổ tay",
    level: "Cấp 2",
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-500/10 border-blue-200 dark:border-blue-800",
    icon: FileText,
  },
  SOP: {
    label: "Quy trình (SOP)",
    level: "Cấp 3",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800",
    icon: FileCheck,
  },
  WI: {
    label: "Hướng dẫn (WI)",
    level: "Cấp 4",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10 border-amber-200 dark:border-amber-800",
    icon: FileCode,
  },
  FORM: {
    label: "Biểu mẫu",
    level: "Cấp 5",
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-500/10 border-sky-200 dark:border-sky-800",
    icon: FileSpreadsheet,
  },
  RECORD: {
    label: "Hồ sơ",
    level: "Hồ sơ",
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-500/10 border-slate-200 dark:border-slate-800",
    icon: FileText,
  },
};

// Cấu hình trạng thái tài liệu
export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  APPROVED: {
    label: "Đã phê duyệt",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  PENDING_APPROVAL: {
    label: "Chờ phê duyệt",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10 border-amber-200 dark:border-amber-800",
    icon: Clock,
  },
  DRAFT: {
    label: "Bản thảo",
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-500/10 border-slate-200 dark:border-slate-800",
    icon: Clock,
  },
  OBSOLETE: {
    label: "Hết hiệu lực",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500/10 border-rose-200 dark:border-rose-800",
    icon: AlertTriangle,
  },
};

// Các mẫu gợi ý AI cho ISO 22000
const AI_SOP_TEMPLATES = [
  {
    topic: "Kiểm soát Dị nguyên (Allergen Management)",
    code: "SOP-ALLERGEN-01",
    title: "Quy trình Kiểm soát Chất gây dị ứng và Ngăn ngừa Nhiễm chéo",
    type: "SOP",
    department: "Ban QLCL & ATTP",
    standard: "ISO 22000:2018",
    version: "1.0",
    summary:
      "Quy định biện pháp nhận diện 8 nhóm chất gây dị ứng chính, phân luồng sản xuất, vệ sinh làm sạch chuyển đổi dòng và dán nhãn cảnh báo tuân thủ điều khoản 8.2 ISO 22000.",
    content: `1. MỤC ĐÍCH:
Ngăn ngừa sự nhiễm chéo chất gây dị ứng vào sản phẩm không chứa dị nguyên trong toàn bộ chuỗi chế biến thực phẩm.

2. PHẠM VI ÁP DỤNG:
Áp dụng tại kho nguyên liệu, khu vực sơ chế, chế biến, bao gói và vệ sinh máy móc thiết bị.

3. TRÁCH NHIỆM:
- Đội trưởng ATTP: Thẩm tra và cập nhật ma trận dị nguyên.
- Trưởng ca sản xuất: Giám sát việc tuân thủ quy định phân luồng nguyên liệu.
- Nhân viên QC: Kiểm tra test kit dị nguyên sau mỗi lần vệ sinh chuyển line.

4. CÁC BƯỚC THỰC HIỆN:
4.1 Tiếp nhận & Gắn nhãn: Gắn nhãn màu vàng 'DỊ NGUYÊN' cho bột đậu nành, trứng, sữa, gluten.
4.2 Lưu trữ: Xếp nguyên liệu dị nguyên ở tầng dưới cùng hoặc khu vực ngăn cách riêng.
4.3 Lịch sản xuất: Ưu tiên chạy sản phẩm không chứa dị nguyên trước, sản phẩm chứa dị nguyên chạy cuối ca.
4.4 Vệ sinh chuyển dòng: Thực hiện quy trình CIP/COP triệt để và test nhanh protein bề mặt.

5. BIỂU MẪU LƯU TRỮ:
- BM-ALLERGEN-01: Ma trận kiểm soát chất gây dị ứng
- BM-QC-TEST: Biên bản test dị nguyên bề mặt thiết bị`,
  },
  {
    topic: "Giám sát Thanh trùng CCP (Pasteurization)",
    code: "WI-PROD-PASTEUR-02",
    title: "Hướng dẫn Vận hành và Giám sát Thông số Thanh trùng CCP1",
    type: "WI",
    department: "Phòng Sản xuất",
    standard: "HACCP CCP1",
    version: "2.0",
    summary:
      "Hướng dẫn chi tiết cài đặt nhiệt độ ≥ 85°C trong 15 giây, kiểm tra cảm biến định kỳ và hành động xử lý khi nhiệt độ giảm dưới ngưỡng tới hạn.",
    content: `1. MỤC TIÊU CCP1:
Tiêu diệt vi sinh vật gây bệnh (Salmonella, Listeria monocytogenes) trong dung dịch sữa/nước sốt.

2. GIỚI HẠN TỚI HẠN (CL):
Nhiệt độ tâm sản phẩm ≥ 85.0°C. Thời gian lưu giữ ≥ 15 giây.

3. GIÁM SÁT ĐỊNH KỲ:
- Tự động: Hệ thống SCADA ghi nhận liên tục mỗi 5 giây.
- Thủ công: Kiểm tra hiển thị nhiệt kế mỗi 30 phút/lần và ghi nhận vào sổ nhật ký.

4. HÀNH ĐỘNG KHẮC PHỤC KHI LỆCH NGƯỠNG:
- Van hồi lưu tự động kích hoạt đẩy sản phẩm chưa đạt về bồn chờ.
- Dừng đóng gói, khoanh vùng lô sản phẩm trong 15 phút gần nhất để tái thanh trùng.
- Báo cáo ngay cho Đội trưởng ATTP và lập biên bản sự cố.`,
  },
  {
    topic: "Truy xuất Nguồn gốc & Thu hồi (Traceability & Recall)",
    code: "SOP-TRACE-01",
    title: "Quy trình Truy xuất Nguồn gốc Một bước trước - Một bước sau và Diễn tập Thu hồi",
    type: "SOP",
    department: "Ban QLCL & ATTP",
    standard: "ISO 22000:2018",
    version: "1.2",
    summary:
      "Thiết lập quy trình mã hóa lô, tra cứu nguyên liệu đầu vào, thành phẩm phân phối và kịch bản diễn tập thu hồi trong vòng 4 giờ theo ISO 22000.",
    content: `1. NGUYÊN TẮC TRUY XUẤT:
Đảm bảo truy xuất 'Một bước trước - Một bước sau' trong vòng tối đa 04 giờ từ khi nhận cảnh báo.

2. QUY TẮC ĐÁNH MÃ LÔ:
- Nguyên liệu: [Mã NCC] - [Ngày nhập] - [Số thứ tự lô]
- Thành phẩm: [Mã SP] - [Ngày SX] - [Ca SX] - [Hạn SD]

3. KỊCH BẢN THU HỒI KHẨN CẤP:
- Cấp 1: Thu hồi nghiêm trọng (nguy cơ ảnh hưởng trực tiếp sức khỏe người tiêu dùng).
- Cấp 2: Thu hồi kỹ thuật / nhãn mác.
- Đội thu hồi do Giám đốc làm Trưởng ban, liên hệ khách hàng và cơ quan quản lý an toàn thực phẩm.`,
  },
  {
    topic: "Kiểm soát Vệ sinh Nhà xưởng SSOP",
    code: "SOP-SSOP-03",
    title: "Quy trình Vệ sinh, Khử trùng Nhà xưởng và Môi trường Sản xuất (SSOP)",
    type: "SOP",
    department: "Phòng Sản xuất",
    standard: "PRP / SSOP",
    version: "1.0",
    summary:
      "Tiêu chuẩn 8 lĩnh vực SSOP cốt lõi: nguồn nước, bề mặt tiếp xúc, nhiễm chéo, vệ sinh cá nhân, hóa chất, động vật gây hại và chất thải.",
    content: `1. PHẠM VI SSOP:
Bao gồm 8 chuyên đề vệ sinh chuẩn hóa theo Codex và ISO 22000:2018.

2. HÓA CHẤT & NỒNG ĐỘ:
- Tẩy rửa ban đầu: Xà phòng thực phẩm 1 - 2%.
- Khử trùng bề mặt: Dung dịch Clo hoạt tính 100 - 150 ppm (ngâm 10 phút) hoặc cồn 70 độ.

3. TẦN SUẤT KIỂM TRA:
- Trước ca: Kiểm tra cảm quan & test ATP bề mặt.
- Trong ca: Lau dọn liên tục rác thải và sàn ướt.
- Cuối ca: Tổng vệ sinh toàn bộ line sản xuất.`,
  },
];

function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [selectedAITemplate, setSelectedAITemplate] = useState(AI_SOP_TEMPLATES[0]);
  const [isCopiedUrl, setIsCopiedUrl] = useState(false);
  const [isCopiedAI, setIsCopiedAI] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    doc_code: "",
    doc_title: "",
    doc_type: "SOP",
    department: "Ban QLCL & ATTP",
    standard: "ISO 22000:2018",
    current_version: "1.0",
    status: "DRAFT",
    file_url: "",
    effective_date: new Date().toISOString().split("T")[0],
  });

  // Tải danh sách tài liệu từ Backend API
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/documents", {
        params: {
          q: searchQuery.trim() || undefined,
          doc_type: selectedType !== "ALL" ? selectedType : undefined,
          status_filter: selectedStatus !== "ALL" ? selectedStatus : undefined,
          department: selectedDept !== "ALL" ? selectedDept : undefined,
        },
      });

      // Chuẩn hoá document_id -> id
      const mapped = (res.data || []).map((d: any) => ({
        ...d,
        id: d.document_id,
        department: d.department || "Ban QLCL & ATTP",
        standard: d.standard || "ISO 22000:2018",
      }));
      setDocuments(mapped);
    } catch (err: any) {
      console.error("Lỗi khi tải tài liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedType, selectedStatus, selectedDept]);

  // Tìm kiếm khi submit form
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments();
  };

  // Mở Form Thêm Mới
  const handleOpenCreate = () => {
    setEditingDoc(null);
    setFormData({
      doc_code: `SOP-FSMS-0${documents.length + 1}`,
      doc_title: "",
      doc_type: "SOP",
      department: "Ban QLCL & ATTP",
      standard: "ISO 22000:2018",
      current_version: "1.0",
      status: "DRAFT",
      file_url: "",
      effective_date: new Date().toISOString().split("T")[0],
    });
    setIsCreateOpen(true);
  };

  // Mở Form Chỉnh Sửa
  const handleOpenEdit = (doc: DocumentItem) => {
    setEditingDoc(doc);
    setFormData({
      doc_code: doc.doc_code,
      doc_title: doc.doc_title,
      doc_type: doc.doc_type,
      department: doc.department || "Ban QLCL & ATTP",
      standard: doc.standard || "ISO 22000:2018",
      current_version: doc.current_version,
      status: doc.status,
      file_url: doc.file_url || "",
      effective_date: doc.effective_date || new Date().toISOString().split("T")[0],
    });
    setIsCreateOpen(true);
  };

  // Lưu Form Thêm / Sửa
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDoc) {
        // Cập nhật
        const res = await api.put(`/documents/${editingDoc.document_id}`, {
          doc_code: formData.doc_code,
          doc_title: formData.doc_title,
          doc_type: formData.doc_type,
          department: formData.department,
          standard: formData.standard,
          current_version: formData.current_version,
          status: formData.status,
          file_url: formData.file_url || null,
          effective_date: formData.effective_date || null,
        });
        const updated = { ...res.data, id: res.data.document_id };
        setDocuments((prev) =>
          prev.map((d) => (d.document_id === editingDoc.document_id ? updated : d))
        );
      } else {
        // Tạo mới
        const res = await api.post("/documents", {
          doc_code: formData.doc_code,
          doc_title: formData.doc_title,
          doc_type: formData.doc_type,
          department: formData.department,
          standard: formData.standard,
          current_version: formData.current_version,
          status: formData.status,
          file_url: formData.file_url || null,
          effective_date: formData.effective_date || null,
        });
        const created = { ...res.data, id: res.data.document_id };
        setDocuments((prev) => [created, ...prev]);
      }
      setIsCreateOpen(false);
      setEditingDoc(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Không thể lưu thông tin tài liệu");
    }
  };

  // Xoá tài liệu
  const handleDeleteDocument = async (id: string, code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xoá tài liệu [${code}] không?`)) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d.document_id !== id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Không thể xoá tài liệu");
    }
  };

  // Duyệt nhanh tài liệu
  const handleQuickApprove = async (doc: DocumentItem) => {
    try {
      const res = await api.put(`/documents/${doc.document_id}`, {
        status: "APPROVED",
        effective_date: new Date().toISOString().split("T")[0],
      });
      const updated = { ...res.data, id: res.data.document_id };
      setDocuments((prev) =>
        prev.map((d) => (d.document_id === doc.document_id ? updated : d))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Không thể phê duyệt tài liệu");
    }
  };

  // Áp dụng mẫu gợi ý AI vào form tạo tài liệu
  const handleApplyAITemplate = (tpl: typeof AI_SOP_TEMPLATES[0]) => {
    setFormData({
      doc_code: tpl.code,
      doc_title: tpl.title,
      doc_type: tpl.type,
      department: tpl.department,
      standard: tpl.standard,
      current_version: tpl.version,
      status: "DRAFT",
      file_url: `https://docs.google.com/document/d/${tpl.code.toLowerCase()}/view`,
      effective_date: new Date().toISOString().split("T")[0],
    });
    setIsAIAssistantOpen(false);
    setEditingDoc(null);
    setIsCreateOpen(true);
  };

  // Thống kê nhanh theo cấp
  const counts = useMemo(() => {
    const total = documents.length;
    const policy = documents.filter((d) => d.doc_type === "POLICY").length;
    const manual = documents.filter((d) => d.doc_type === "MANUAL").length;
    const sop = documents.filter((d) => d.doc_type === "SOP").length;
    const wi = documents.filter((d) => d.doc_type === "WI").length;
    const form = documents.filter((d) => d.doc_type === "FORM").length;
    const record = documents.filter((d) => d.doc_type === "RECORD").length;
    const approved = documents.filter((d) => d.status === "APPROVED").length;
    const pending = documents.filter((d) => d.status === "PENDING_APPROVAL").length;
    const draft = documents.filter((d) => d.status === "DRAFT").length;
    return { total, policy, manual, sop, wi, form, record, approved, pending, draft };
  }, [documents]);

  // Đánh giá Tuân thủ ISO 22000:2018 (Mục 7.5) ĐỘNG theo dữ liệu thực tế
  const evaluateCompliance = (doc: DocumentItem) => {
    const checks = [
      {
        title: "Nhận diện & Tiêu đề",
        clause: "Mục 7.5.2a",
        passed: Boolean(doc.doc_code && doc.doc_title),
        desc: doc.doc_code && doc.doc_title
          ? `Mã [${doc.doc_code}] & tiêu đề rõ ràng`
          : "Thiếu mã hiệu hoặc tiêu đề",
      },
      {
        title: "Phòng ban phụ trách",
        clause: "Mục 7.5.2a",
        passed: Boolean(doc.department),
        desc: doc.department ? doc.department : "Chưa phân bổ phòng ban",
      },
      {
        title: "Phiên bản hiện hành",
        clause: "Mục 7.5.2b",
        passed: Boolean(doc.current_version),
        desc: `Phiên bản v${doc.current_version || "1.0"}`,
      },
      {
        title: "Xem xét & Phê duyệt",
        clause: "Mục 7.5.2c",
        passed: doc.status === "APPROVED",
        desc: doc.status === "APPROVED"
          ? `Đã phê duyệt (${doc.approver_name || "Ban ATTP"})`
          : doc.status === "PENDING_APPROVAL"
          ? "Đang chờ ký duyệt"
          : "Bản thảo chưa duyệt",
      },
      {
        title: "Ngày có hiệu lực",
        clause: "Mục 7.5.3",
        passed: Boolean(doc.effective_date),
        desc: doc.effective_date ? `Áp dụng: ${doc.effective_date}` : "Chưa đặt ngày hiệu lực",
      },
      {
        title: "Tệp văn bản đính kèm",
        clause: "Mục 7.5.3",
        passed: Boolean(doc.file_url && doc.file_url.trim().length > 0),
        desc: doc.file_url ? "Đã liên kết tệp số hóa" : "Chưa đính kèm tệp gốc",
      },
    ];

    const passedCount = checks.filter((c) => c.passed).length;
    const percentage = Math.round((passedCount / checks.length) * 100);

    return { checks, passedCount, total: checks.length, percentage };
  };

  return (
    <div className="space-y-6">
      {/* Header và Nút hành động */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Hệ thống Tài liệu & Quy trình (SOP)"
          description="Quản lý tài liệu 5 cấp theo ISO 22000:2018 (Mục 7.5). Kết nối cơ sở dữ liệu thực tế, kiểm tra tuân thủ động và trợ lý AI."
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocuments}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            Làm mới
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAIAssistantOpen(true)}
            className="gap-1.5 border-primary/30 bg-primary/5 text-xs text-primary hover:bg-primary/10"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Trợ lý AI soạn thảo SOP
          </Button>

          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            Tạo tài liệu mới
          </Button>
        </div>
      </div>

      {/* Thẻ Thống kê 5 Cấp Tài liệu */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          {
            level: "Cấp 1",
            title: "Chính sách",
            count: counts.policy,
            code: "POLICY",
            tone: "border-purple-200 bg-purple-500/5 text-purple-700 dark:text-purple-300",
            badge: "bg-purple-500/10 text-purple-700",
          },
          {
            level: "Cấp 2",
            title: "Sổ tay FSMS",
            count: counts.manual,
            code: "MANUAL",
            tone: "border-blue-200 bg-blue-500/5 text-blue-700 dark:text-blue-300",
            badge: "bg-blue-500/10 text-blue-700",
          },
          {
            level: "Cấp 3",
            title: "Quy trình (SOP)",
            count: counts.sop,
            code: "SOP",
            tone: "border-emerald-200 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
            badge: "bg-emerald-500/10 text-emerald-700",
          },
          {
            level: "Cấp 4",
            title: "Hướng dẫn (WI)",
            count: counts.wi,
            code: "WI",
            tone: "border-amber-200 bg-amber-500/5 text-amber-700 dark:text-amber-300",
            badge: "bg-amber-500/10 text-amber-700",
          },
          {
            level: "Cấp 5",
            title: "Biểu mẫu (FORM)",
            count: counts.form,
            code: "FORM",
            tone: "border-sky-200 bg-sky-500/5 text-sky-700 dark:text-sky-300",
            badge: "bg-sky-500/10 text-sky-700",
          },
          {
            level: "Tổng hợp",
            title: "Đã phê duyệt",
            count: `${counts.approved}/${counts.total}`,
            code: "APPROVED",
            tone: "border-emerald-200 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
            badge: "bg-emerald-600 text-white font-bold",
          },
        ].map((item) => (
          <div
            key={item.title}
            onClick={() => {
              if (item.code === "APPROVED") {
                setSelectedStatus(selectedStatus === "APPROVED" ? "ALL" : "APPROVED");
              } else {
                setSelectedType(selectedType === item.code ? "ALL" : item.code);
              }
            }}
            className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-sm ${item.tone} ${
              selectedType === item.code || (item.code === "APPROVED" && selectedStatus === "APPROVED")
                ? "ring-2 ring-primary ring-offset-1"
                : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.badge}`}>
                {item.level}
              </span>
              <span className="text-xs text-muted-foreground">ISO 22000</span>
            </div>
            <div className="mt-2.5 text-2xl font-bold">{item.count}</div>
            <div className="text-xs font-medium text-muted-foreground">{item.title}</div>
          </div>
        ))}
      </div>

      {/* Bộ lọc & Tìm kiếm - Bố cục mượt mà 1 hàng responsive */}
      <div className="space-y-3 rounded-2xl border bg-card p-3.5 shadow-sm">
        {/* Hàng 1: Tabs phân loại cấp */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: "ALL", label: "Tất cả Cấp" },
            { id: "POLICY", label: "Chính sách (Cấp 1)" },
            { id: "MANUAL", label: "Sổ tay (Cấp 2)" },
            { id: "SOP", label: "Quy trình SOP (Cấp 3)" },
            { id: "WI", label: "Hướng dẫn WI (Cấp 4)" },
            { id: "FORM", label: "Biểu mẫu (Cấp 5)" },
            { id: "RECORD", label: "Hồ sơ" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                selectedType === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Hàng 2: Lọc Phòng ban, Trạng thái và Ô tìm kiếm */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Lọc theo Phòng ban */}
            <div className="flex items-center gap-1 text-xs">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">Tất cả Phòng ban</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc trạng thái */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="APPROVED">Đã phê duyệt</option>
              <option value="PENDING_APPROVAL">Chờ phê duyệt</option>
              <option value="DRAFT">Bản thảo</option>
              <option value="OBSOLETE">Hết hiệu lực</option>
            </select>
          </div>

          {/* Ô tìm kiếm */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Mã, tên tài liệu, phòng ban..."
              className="h-8 pl-8 text-xs"
            />
          </form>
        </div>
      </div>

      {/* Bảng Danh sách Tài liệu */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-3 text-center">STT</th>
                <th className="w-32 px-4 py-3">Mã tài liệu</th>
                <th className="px-4 py-3">Tên tài liệu / SOP</th>
                <th className="w-28 px-4 py-3">Phân cấp</th>
                <th className="w-36 px-4 py-3">Phòng ban</th>
                <th className="w-20 px-4 py-3 text-center">Phiên bản</th>
                <th className="w-32 px-4 py-3">Trạng thái</th>
                <th className="w-28 px-4 py-3">Ngày hiệu lực</th>
                <th className="w-36 px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      <span>Đang tải dữ liệu tài liệu từ máy chủ...</span>
                    </div>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground/50" />
                      <p className="font-medium">Không tìm thấy tài liệu phù hợp</p>
                      <p className="text-[11px]">Hãy thử tìm kiếm với từ khóa khác hoặc tạo tài liệu mới.</p>
                      <Button size="sm" variant="outline" onClick={handleOpenCreate} className="mt-2 gap-1.5 text-xs">
                        <Plus className="h-3.5 w-3.5" /> Tạo tài liệu ngay
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc, idx) => {
                  const typeCfg = DOC_TYPES[doc.doc_type] || DOC_TYPES.RECORD;
                  const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.DRAFT;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <tr key={doc.document_id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 text-center font-medium text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        <div className="flex items-center gap-1.5">
                          <span>{doc.doc_code}</span>
                          {doc.file_url && (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              title="Mở tệp tài liệu đính kèm"
                              className="text-muted-foreground hover:text-primary transition"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{doc.doc_title}</div>
                        {doc.standard && (
                          <div className="text-[10px] text-muted-foreground">
                            Tiêu chuẩn: <span className="font-medium text-foreground/80">{doc.standard}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${typeCfg.bg} ${typeCfg.color}`}
                        >
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-medium">
                        {doc.department || "Ban QLCL & ATTP"}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-foreground">
                        v{doc.current_version}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.bg} ${statusCfg.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {doc.effective_date ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground/70" />
                            {doc.effective_date}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {/* Nút Xem chi tiết */}
                          <button
                            onClick={() => setViewingDoc(doc)}
                            title="Xem chi tiết & Đánh giá tuân thủ"
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Nút Duyệt nhanh nếu chưa duyệt */}
                          {doc.status !== "APPROVED" && (
                            <button
                              onClick={() => handleQuickApprove(doc)}
                              title="Phê duyệt nhanh tài liệu"
                              className="rounded p-1.5 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 transition"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Nút Chỉnh sửa */}
                          <button
                            onClick={() => handleOpenEdit(doc)}
                            title="Chỉnh sửa tài liệu"
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {/* Nút Xóa */}
                          <button
                            onClick={() => handleDeleteDocument(doc.document_id, doc.doc_code)}
                            title="Xóa tài liệu"
                            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer bảng */}
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <div>
            Hiển thị <b>{documents.length}</b> tài liệu
          </div>
          <div className="text-[11px]">
            Hệ thống quản lý thông tin dạng văn bản theo ISO 22000:2018 (Mục 7.5)
          </div>
        </div>
      </div>

      {/* Modal Thêm / Chỉnh Sửa Tài Liệu */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setEditingDoc(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingDoc ? `Chỉnh sửa tài liệu: ${editingDoc.doc_code}` : "Tạo mới tài liệu & SOP ISO 22000"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Mã tài liệu <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  placeholder="Ví dụ: SOP-HACCP-01"
                  value={formData.doc_code}
                  onChange={(e) => setFormData({ ...formData, doc_code: e.target.value })}
                  className="h-9 text-xs font-medium uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Phân cấp tài liệu <span className="text-destructive">*</span>
                </Label>
                <select
                  value={formData.doc_type}
                  onChange={(e) => setFormData({ ...formData, doc_type: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="POLICY">Cấp 1 — Chính sách (POLICY)</option>
                  <option value="MANUAL">Cấp 2 — Sổ tay (MANUAL)</option>
                  <option value="SOP">Cấp 3 — Quy trình (SOP)</option>
                  <option value="WI">Cấp 4 — Hướng dẫn công việc (WI)</option>
                  <option value="FORM">Cấp 5 — Biểu mẫu (FORM)</option>
                  <option value="RECORD">Hồ sơ ghi chép (RECORD)</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">
                  Tên tài liệu / SOP <span className="text-destructive">*</span>
                </Label>
                <Input
                  required
                  placeholder="Ví dụ: Quy trình Phân tích mối nguy & Thiết lập Điểm kiểm soát tới hạn (CCP)"
                  value={formData.doc_title}
                  onChange={(e) => setFormData({ ...formData, doc_title: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Phòng ban phụ trách <span className="text-destructive">*</span>
                </Label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Tiêu chuẩn áp dụng</Label>
                <select
                  value={formData.standard}
                  onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {STANDARDS.map((std) => (
                    <option key={std} value={std}>
                      {std}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Phiên bản</Label>
                <Input
                  placeholder="1.0"
                  value={formData.current_version}
                  onChange={(e) => setFormData({ ...formData, current_version: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Trạng thái phê duyệt</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="DRAFT">Bản thảo (DRAFT)</option>
                  <option value="PENDING_APPROVAL">Chờ phê duyệt (PENDING_APPROVAL)</option>
                  <option value="APPROVED">Đã phê duyệt (APPROVED)</option>
                  <option value="OBSOLETE">Hết hiệu lực (OBSOLETE)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Ngày có hiệu lực</Label>
                <Input
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Đường dẫn tệp đính kèm (URL Google Drive / Sheets / Docs / PDF)</Label>
                <Input
                  placeholder="https://docs.google.com/document/d/.../edit"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" size="sm">
                {editingDoc ? "Lưu thay đổi" : "Tạo tài liệu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Xem Chi Tiết & Đánh Giá Tuân Thủ ISO 22000 (Mục 7.5) */}
      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {viewingDoc && (() => {
            const comp = evaluateCompliance(viewingDoc);
            const typeInfo = DOC_TYPES[viewingDoc.doc_type] || DOC_TYPES.RECORD;
            const statusInfo = STATUS_CONFIG[viewingDoc.status] || STATUS_CONFIG.DRAFT;
            const StatusIcon = statusInfo.icon;

            return (
              <div className="space-y-3.5">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded border px-2 py-0.5 text-xs font-semibold ${typeInfo.bg} ${typeInfo.color}`}
                      >
                        {typeInfo.label}
                      </span>
                      <DialogTitle className="text-base font-bold text-foreground">
                        {viewingDoc.doc_code}
                      </DialogTitle>
                    </div>
                  </div>
                </DialogHeader>

                {/* Tiêu đề & Thông tin cơ bản */}
                <div className="rounded-xl border bg-muted/20 p-3 space-y-1.5">
                  <div className="text-[11px] font-medium text-muted-foreground">Tên tài liệu:</div>
                  <div className="text-sm font-bold text-foreground leading-snug">
                    {viewingDoc.doc_title}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-[11px] font-medium border text-muted-foreground">
                      <Building2 className="h-3 w-3 text-primary" />
                      Phòng ban: <b className="text-foreground">{viewingDoc.department || "Ban QLCL & ATTP"}</b>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-[11px] font-medium border text-muted-foreground">
                      <Award className="h-3 w-3 text-primary" />
                      Tiêu chuẩn: <b className="text-foreground">{viewingDoc.standard || "ISO 22000:2018"}</b>
                    </span>
                  </div>
                </div>

                {/* Bảng Metadata 4 ô */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border bg-card p-2">
                    <div className="text-[10.5px] text-muted-foreground">Phiên bản hiện tại</div>
                    <div className="mt-0.5 font-bold text-foreground">v{viewingDoc.current_version}</div>
                  </div>

                  <div className="rounded-lg border bg-card p-2">
                    <div className="text-[10.5px] text-muted-foreground">Trạng thái phê duyệt</div>
                    <div className="mt-0.5 font-bold">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${statusInfo.bg} ${statusInfo.color}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-2">
                    <div className="text-[10.5px] text-muted-foreground">Ngày có hiệu lực</div>
                    <div className="mt-0.5 font-semibold text-foreground">
                      {viewingDoc.effective_date || "Chưa thiết lập"}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-2">
                    <div className="text-[10.5px] text-muted-foreground">Người phê duyệt</div>
                    <div className="mt-0.5 font-semibold text-foreground">
                      {viewingDoc.approver_name || "Quản trị viên FSMS"}
                    </div>
                  </div>
                </div>

                {/* Tệp đính kèm - KHÔNG BỊ TRÀN LINK */}
                <div className="rounded-xl border bg-primary/5 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-primary">
                    <span className="flex items-center gap-1.5">
                      <FolderOpen className="h-3.5 w-3.5" />
                      Tệp văn bản đính kèm
                    </span>
                  </div>

                  {viewingDoc.file_url ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2 shadow-sm">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <LinkIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate text-xs font-mono text-muted-foreground" title={viewingDoc.file_url}>
                          {viewingDoc.file_url}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            if (viewingDoc.file_url) {
                              navigator.clipboard.writeText(viewingDoc.file_url);
                              setIsCopiedUrl(true);
                              setTimeout(() => setIsCopiedUrl(false), 2000);
                            }
                          }}
                          title="Copy đường dẫn tệp"
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                        >
                          {isCopiedUrl ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <a
                          href={viewingDoc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 transition"
                        >
                          <span>Mở tệp</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-2 text-center text-xs text-muted-foreground">
                      Chưa có tệp đính kèm. Nhấn <b>Chỉnh sửa</b> để thêm link Google Drive/Docs/PDF.
                    </div>
                  )}
                </div>

                {/* ĐÁNH GIÁ TUÂN THỦ ISO 22000 (MỤC 7.5) - DỮ LIỆU ĐƯỢC ĐẶT TRÊN CÙNG 1 DÒNG */}
                <div className="rounded-xl border border-border/80 bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Kiểm tra Tuân thủ ISO 22000:2018 (Mục 7.5)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-foreground">
                        {comp.passedCount}/{comp.total} Đạt ({comp.percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Thanh Progress */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all duration-500 ${
                        comp.percentage === 100
                          ? "bg-emerald-500"
                          : comp.percentage >= 70
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${comp.percentage}%` }}
                    />
                  </div>

                  {/* Danh sách tiêu chí kiểm tra - MỖI TIÊU CHÍ TRÊN 1 DÒNG DUY NHẤT */}
                  <div className="space-y-1 pt-1">
                    {comp.checks.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                        {c.passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        )}
                        <div className="flex-1 truncate text-[11.5px] leading-none">
                          <span className={`font-semibold ${c.passed ? "text-foreground" : "text-amber-700 dark:text-amber-400"}`}>
                            {c.title} ({c.clause}):
                          </span>{" "}
                          <span className="text-muted-foreground">{c.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setViewingDoc(null)}>
                    Đóng
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const docToEdit = viewingDoc;
                      setViewingDoc(null);
                      handleOpenEdit(docToEdit);
                    }}
                  >
                    Chỉnh sửa tài liệu
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal Trợ lý AI Soạn thảo SOP ISO 22000 */}
      <Dialog open={isAIAssistantOpen} onOpenChange={setIsAIAssistantOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-1.5 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold">
                Trợ lý AI Soạn thảo SOP & Tài liệu Chuẩn ISO 22000
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-1 text-xs">
            {/* Lựa chọn mẫu nhanh */}
            <div>
              <Label className="text-xs font-semibold">Chọn chủ đề mẫu theo tiêu chuẩn ISO 22000 / HACCP:</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {AI_SOP_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.code}
                    onClick={() => setSelectedAITemplate(tpl)}
                    className={`rounded-lg border p-2 text-left transition ${
                      selectedAITemplate.code === tpl.code
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <div className="text-[10px] font-bold text-primary">{tpl.code}</div>
                    <div className="line-clamp-2 mt-0.5 text-[11px] font-medium leading-tight">
                      {tpl.topic}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chi tiết nội dung bản thảo AI tạo */}
            <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {selectedAITemplate.code}
                  </span>
                  <h4 className="mt-1 font-semibold text-foreground">{selectedAITemplate.title}</h4>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedAITemplate.content);
                    setIsCopiedAI(true);
                    setTimeout(() => setIsCopiedAI(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 text-[11px] font-medium shadow-sm hover:bg-muted"
                >
                  {isCopiedAI ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600">Đã copy</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy nội dung</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] italic text-muted-foreground">{selectedAITemplate.summary}</p>

              <div className="max-h-56 overflow-y-auto rounded-lg border bg-background p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                {selectedAITemplate.content}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAIAssistantOpen(false)}>
              Đóng
            </Button>
            <Button
              size="sm"
              onClick={() => handleApplyAITemplate(selectedAITemplate)}
              className="gap-1.5"
            >
              <FileCheck className="h-3.5 w-3.5" />
              Điền vào Form tạo tài liệu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
