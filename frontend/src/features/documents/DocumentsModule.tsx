import React, { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { printHtml } from "@/lib/print";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  Printer,
  FileDown,
  Download,
  GitFork,
} from "lucide-react";
import api from "@/lib/api";
import logoImg from "@/assets/logo.png";
import { WorkflowBuilder, type WorkflowTemplateData } from "@/components/builder/WorkflowBuilder";
import { useModuleAccess } from "@/lib/rbac";

// Định nghĩa Cấu trúc Dữ liệu Tài liệu
export interface DocumentItem {
  id?: string; // mapped from document_id
  document_id: string;
  doc_code: string;
  doc_title: string;
  doc_type: string; // POLICY, MANUAL, SOP, WI, FORM, RECORD
  department?: string | null;
  standard?: string | null;
  current_version: string;
  status: string; // APPROVED, PENDING_APPROVAL, DRAFT, OBSOLETE
  content?: string | null;
  file_url?: string | null;
  approved_by?: string | null;
  approver_name?: string | null;
  effective_date?: string | null;
  created_at?: string | null;
}

import { useDepartments, DEFAULT_DEPARTMENTS } from "@/lib/departments";

// Danh sách phòng ban chuẩn hóa từ CSDL
export const DEPARTMENTS = DEFAULT_DEPARTMENTS;

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
  const { canEdit, isManagement, isAdmin } = useModuleAccess();
  const { departments } = useDepartments();
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

  // Modal Xuất / Xem trước PDF
  const [exportingDoc, setExportingDoc] = useState<DocumentItem | null>(null);
  const [exportContent, setExportContent] = useState<string>("");
  const [isCopiedExport, setIsCopiedExport] = useState(false);

  // Workflow Builder State
  const [showSopWorkflowModal, setShowSopWorkflowModal] = useState(false);
  const [sopWorkflowTemplate, setSopWorkflowTemplate] = useState<WorkflowTemplateData | null>(null);
  const [deletingDocItem, setDeletingDocItem] = useState<{ id: string; code: string; title: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    doc_code: "",
    doc_title: "",
    doc_type: "SOP",
    department: "Ban QLCL & ATTP",
    standard: "ISO 22000:2018",
    current_version: "1.0",
    status: "DRAFT",
    content: "",
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

  // Tự động mở tài liệu chuẩn ISO PDF nếu URL có query param ?view= hoặc ?code=
  useEffect(() => {
    if (typeof window !== "undefined" && documents.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const viewCode = params.get("view") || params.get("code");
      if (viewCode) {
        const targetDoc = documents.find(
          (d) =>
            d.doc_code.toUpperCase() === viewCode.toUpperCase() ||
            d.document_id === viewCode
        );
        if (targetDoc) {
          handleOpenExportPDF(targetDoc);
        }
      }
    }
  }, [documents]);

  // Tìm kiếm khi submit form
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments();
  };

  // Mở Form Thêm Mới
  const handleOpenCreate = () => {
    setEditingDoc(null);
    const targetType = selectedType !== "ALL" ? selectedType : "SOP";
    const prefixMap: Record<string, string> = {
      POLICY: "POL-FSMS",
      MANUAL: "MAN-FSMS",
      SOP: "SOP-FSMS",
      WI: "WI-FSMS",
      FORM: "FORM-FSMS",
      RECORD: "REC-FSMS",
    };
    const prefix = prefixMap[targetType] || "DOC-FSMS";
    const countForType = documents.filter((d) => d.doc_type === targetType).length + 1;
    const docCode = `${prefix}-${String(countForType).padStart(2, "0")}`;
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";

    setFormData({
      doc_code: docCode,
      doc_title: "",
      doc_type: targetType,
      department: "Ban QLCL & ATTP",
      standard: "ISO 22000:2018",
      current_version: "1.0",
      status: "DRAFT",
      content: "",
      file_url: `${origin}/documents?view=${docCode}`,
      effective_date: new Date().toISOString().split("T")[0],
    });
    setIsCreateOpen(true);
  };

  // Mở Form Chỉnh Sửa
  const handleOpenEdit = (doc: DocumentItem) => {
    setEditingDoc(doc);
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";
    const defaultLink = doc.file_url || `${origin}/documents?view=${doc.doc_code}`;

    setFormData({
      doc_code: doc.doc_code,
      doc_title: doc.doc_title,
      doc_type: doc.doc_type,
      department: doc.department || "Ban QLCL & ATTP",
      standard: doc.standard || "ISO 22000:2018",
      current_version: doc.current_version,
      status: doc.status,
      content: doc.content || getDocumentContent(doc),
      file_url: defaultLink,
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
          content: formData.content || null,
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
          content: formData.content || null,
          file_url: formData.file_url || null,
          effective_date: formData.effective_date || null,
        });
        const created = { ...res.data, id: res.data.document_id };
        setDocuments((prev) => [created, ...prev]);
        toast.success(`Đã tạo tài liệu mới "${formData.doc_code}" thành công!`);
      }
      setIsCreateOpen(false);
      setEditingDoc(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể lưu thông tin tài liệu");
    }
  };

  // Xoá tài liệu thực tế
  const executeDeleteDocument = async (id: string, code: string) => {
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d.document_id !== id));
      toast.success(`Đã xoá tài liệu [${code}] thành công!`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể xoá tài liệu");
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
      toast.success(`Đã phê duyệt hiệu lực cho tài liệu [${doc.doc_code}]!`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể phê duyệt tài liệu");
    }
  };

  // ==================== WORKFLOW HANDLERS ====================
  const handleOpenSopWorkflow = async () => {
    try {
      const res = await api.get("/builders/workflows");
      const found = res.data.find((w: any) => w.code === "WF-SOP-APPROVAL" || w.module === "DOCUMENTS");
      if (found) {
        setSopWorkflowTemplate(found);
      } else {
        setSopWorkflowTemplate({
          module: "DOCUMENTS",
          code: "WF-SOP-APPROVAL",
          title: "Quy Trình Soạn Thảo & Phê Duyệt Tài Liệu / SOP Đa Cấp (ISO 7.5)",
          description: "Quy trình 4 bước kiểm soát thông tin dạng văn bản: Soạn thảo -> Thẩm tra QA -> Ký duyệt Ban Giám Đốc -> Ban hành và phân phối.",
          version: "1.0",
          nodes: [
            { id: "doc_1", type: "process", label: "1. Soạn thảo Dự thảo Tài liệu / SOP", role: "Trưởng Bộ Phận / Soạn thảo", description: "Viết nội dung quy trình, xác định phạm vi và biểu mẫu kèm theo.", is_ccp: false, step_number: 1 },
            { id: "doc_2", type: "approval", label: "2. Thẩm tra Kỹ thuật & Tuân thủ ISO", role: "Ban QLCL & ATTP (QA Lead)", description: "Kiểm tra sự phù hợp với ISO 22000, HACCP và quy chuẩn pháp lý.", is_ccp: false, step_number: 2 },
            { id: "doc_3", type: "approval", label: "3. Phê duyệt & Ký Ban hành", role: "Đại diện Lãnh đạo / Ban Giám Đốc", description: "Ký duyệt hiệu lực chính thức và xác định ngày bắt đầu áp dụng.", is_ccp: false, step_number: 3 },
            { id: "doc_4", type: "process", label: "4. Phân phối có Kiểm soát & Đào tạo", role: "Thư ký ISO & Trưởng ca", description: "Cập nhật Danh mục tài liệu hiệu lực, thu hồi bản cũ và phổ biến cho nhân viên.", is_ccp: false, step_number: 4 },
          ],
          edges: [
            { id: "ed1_2", source: "doc_1", target: "doc_2", label: "Gửi thẩm tra" },
            { id: "ed2_3", source: "doc_2", target: "doc_3", label: "QA Đạt chuẩn" },
            { id: "ed3_4", source: "doc_3", target: "doc_4", label: "BGĐ Ký duyệt" },
          ],
          status: "ACTIVE",
        });
      }
      setShowSopWorkflowModal(true);
    } catch (err) {
      toast.error("Không thể tải lưu đồ phê duyệt SOP");
    }
  };

  // Áp dụng mẫu gợi ý AI vào form tạo tài liệu (Tự động tránh trùng mã để không bị lỗi 400)
  const handleApplyAITemplate = (tpl: typeof AI_SOP_TEMPLATES[0]) => {
    let candidateCode = tpl.code;
    const existingCodes = new Set(documents.map((d) => d.doc_code.toUpperCase()));
    if (existingCodes.has(candidateCode.toUpperCase())) {
      let suffix = 2;
      const basePrefix = tpl.code.replace(/-\d+$/, "");
      while (existingCodes.has(`${basePrefix}-${String(suffix).padStart(2, "0")}`.toUpperCase())) {
        suffix++;
      }
      candidateCode = `${basePrefix}-${String(suffix).padStart(2, "0")}`;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";
    setFormData({
      doc_code: candidateCode,
      doc_title: tpl.title,
      doc_type: tpl.type,
      department: tpl.department,
      standard: tpl.standard,
      current_version: tpl.version,
      status: "DRAFT",
      content: tpl.content,
      file_url: `${origin}/documents?view=${candidateCode}`,
      effective_date: new Date().toISOString().split("T")[0],
    });
    setIsAIAssistantOpen(false);
    setEditingDoc(null);
    setIsCreateOpen(true);
  };

  // Lấy nội dung văn bản chuẩn ISO 22000 phục vụ in/xuất PDF
  const getDocumentContent = (doc: DocumentItem): string => {
    if (doc.content && doc.content.trim()) return doc.content;
    const matched = AI_SOP_TEMPLATES.find((t) => t.code === doc.doc_code);
    if (matched) return matched.content;

    if (doc.doc_type === "POLICY") {
      return `1. CAM KẾT CỦA BAN LÃNH ĐẠO:
Ban Tổng Giám đốc cam kết thiết lập, duy trì và cải tiến liên tục Hệ thống Quản lý An toàn Thực phẩm theo tiêu chuẩn Quốc tế ISO 22000:2018.

2. MỤC TIÊU AN TOÀN THỰC PHẨM CỐT LÕI:
- 100% sản phẩm sản xuất và phân phối đạt yêu cầu nghiêm ngặt về an toàn vi sinh, hóa học và vật lý.
- 100% nhân sự được đào tạo, sát hạch định kỳ về kiến thức ATTP, HACCP và vệ sinh thực hành tốt.
- Không để xảy ra bất kỳ sự cố ngộ độc thực phẩm hay thu hồi sản phẩm loại 1 nào.

3. TRUYỀN THÔNG VÀ THẨM TRA HIỆU LỰC:
Chính sách này được niêm yết công khai tại tất cả các khu vực sản xuất, được truyền đạt tới từng nhân viên và định kỳ đánh giá tính phù hợp trong các cuộc họp Xem xét của Lãnh đạo (MRM).`;
    }

    if (doc.doc_type === "MANUAL") {
      return `1. GIỚI THIỆU HỆ THỐNG FSMS:
Sổ tay này mô tả cơ chế vận hành, cơ cấu tổ chức và các biện pháp kiểm soát mối nguy toàn diện theo tiêu chuẩn ISO 22000:2018.

2. PHẠM VI ÁP DỤNG & CÁC BÊN LIÊN QUAN:
- Phạm vi: Toàn bộ quá trình tiếp nhận nguyên liệu, bảo quản kho, sơ chế, chế biến, bao gói và giao hàng.
- Bối cảnh: Đảm bảo tuân thủ Luật An toàn Thực phẩm, quy chuẩn kỹ thuật quốc gia và yêu cầu từ đối tác quốc tế.

3. CHU TRÌNH PDCA & KIỂM SOÁT MỐI NGUY:
- Plan (Lập kế hoạch): Phân tích mối nguy, xác định CCP/oPRP và giới hạn tới hạn.
- Do (Thực hiện): Vận hành nghiêm ngặt quy trình và ghi chép nhật ký giám sát.
- Check (Kiểm tra): Đánh giá nội bộ định kỳ và thẩm tra xác nhận giá trị sử dụng.
- Act (Cải tiến): Thực hiện hành động khắc phục CAPA và nâng cao hiệu suất hệ thống.`;
    }

    if (doc.doc_type === "FORM" || doc.doc_type === "RECORD") {
      return `1. MỤC ĐÍCH BIỂU MẪU:
Ghi nhận và lưu trữ chính xác thông số vận hành thực tế tại các công đoạn kiểm soát nhằm phục vụ công tác thẩm tra và truy xuất nguồn gốc một chạm.

2. QUY ĐỊNH GHI CHÉP & LƯU HỒ SƠ:
- Người trực tiếp thực hiện phải ghi chép ngay tại thời điểm giám sát/kiểm tra.
- Không tẩy xóa; trường hợp có sai sót phải gạch ngang, ký nháy xác nhận và ghi lại số liệu đúng.
- Hồ sơ được lưu trữ an toàn tại phòng ban phụ trách tối thiểu 02 năm kể từ ngày phát sinh.

3. NỘI DUNG THEO DÕI & ĐỐI SOÁT:
[STT] | [Thời gian] | [Mã Lô/Vị trí] | [Thông số đo thực tế] | [Ngưỡng tới hạn (CL)] | [Đánh giá Đạt/Không đạt] | [Chữ ký KTV]`;
    }

    return `1. MỤC ĐÍCH:
Quy định trình tự và các bước thao tác chuẩn cho: ${doc.doc_title}, nhằm bảo đảm an toàn vệ sinh thực phẩm và tuân thủ yêu cầu của Điều khoản 7.5 & 8.2 ISO 22000:2018.

2. PHẠM VI ÁP DỤNG:
Áp dụng cho toàn thể cán bộ, nhân viên thuộc ${doc.department || "Ban QLCL & ATTP"} và các bộ phận vận hành liên quan.

3. TRÁCH NHIỆM THỰC HIỆN:
- Ban Giám đốc: Phê duyệt quy trình và đảm bảo cung cấp đầy đủ nguồn lực triển khai.
- Trưởng bộ phận: Phổ biến, hướng dẫn và giám sát việc thực hiện đúng quy trình.
- Nhân viên thực hiện: Tuân thủ nghiêm ngặt các bước hướng dẫn và ghi chép biểu mẫu đầy đủ.

4. NỘI DUNG THỰC HIỆN CHI TIẾT:
4.1 Chuẩn bị: Kiểm tra tình trạng vệ sinh trang thiết bị, phương tiện đo và bảo hộ lao động.
4.2 Thao tác chuẩn: Tiến hành theo đúng trình tự kỹ thuật và thông số quy định.
4.3 Giám sát & Ghi nhận: Theo dõi liên tục các chỉ số kiểm soát và đối chiếu tiêu chuẩn.
4.4 Xử lý bất thường: Khi phát hiện sai lệch, lập tức cô lập sản phẩm và báo cáo Đội trưởng ATTP/QC.

5. BIỂU MẪU & HỒ SƠ LƯU KÈM:
- Biểu mẫu kiểm soát thông số công đoạn
- Báo cáo sự không phù hợp & phiếu CAPA (khi có phát sinh sự cố)`;
  };

  // Mở Modal Xem trước & Xuất PDF
  const handleOpenExportPDF = (doc: DocumentItem, customContent?: string) => {
    setExportingDoc(doc);
    setExportContent(customContent || getDocumentContent(doc));
  };

  // In / Xuất PDF trực tiếp qua hidden iframe sạch sẽ 100% không bị trắng trang
  const handlePrintPDF = () => {
    if (!exportingDoc) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <title>${exportingDoc.doc_code} - ${exportingDoc.doc_title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 11.5px;
            line-height: 1.6;
            color: #0f172a;
            margin: 0;
            padding: 0;
            background: #ffffff;
          }
          .header-table {
            width: 100%;
            border: 2px solid #0f172a;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          .header-table td {
            border: 1px solid #0f172a;
            padding: 8px 10px;
            vertical-align: middle;
          }
          .logo-box {
            width: 25%;
            text-align: center;
            background-color: #f8fafc;
          }
          .logo-title {
            font-size: 15px;
            font-weight: 900;
            color: #047857;
            letter-spacing: 0.5px;
          }
          .logo-sub {
            font-size: 9.5px;
            color: #475569;
            font-weight: 700;
            text-transform: uppercase;
          }
          .title-box {
            width: 50%;
            text-align: center;
          }
          .title-main {
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            text-transform: uppercase;
            margin-top: 3px;
          }
          .meta-box {
            width: 25%;
            font-size: 10px;
            background-color: #f8fafc;
            line-height: 1.4;
          }
          .meta-grid {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 6px;
            margin-bottom: 14px;
            font-size: 11px;
          }
          .content-body {
            font-size: 11.5px;
            white-space: pre-wrap;
            line-height: 1.7;
            color: #1e293b;
            margin-bottom: 25px;
          }
          .signatures-container {
            margin-top: 30px;
            padding-top: 12px;
            border-top: 2px solid #0f172a;
            page-break-inside: avoid;
          }
          .sig-header {
            text-align: center;
            font-size: 10.5px;
            font-weight: bold;
            text-transform: uppercase;
            color: #475569;
            margin-bottom: 20px;
          }
          .sig-table {
            width: 100%;
            text-align: center;
            font-size: 11px;
          }
          .sig-col {
            width: 33.33%;
            vertical-align: top;
          }
          .sig-title {
            font-weight: bold;
            text-transform: uppercase;
            color: #0f172a;
          }
          .sig-sub {
            font-size: 9px;
            color: #64748b;
            font-style: italic;
            margin-top: 2px;
          }
          .sig-space {
            height: 45px;
          }
          .sig-name {
            font-weight: 600;
            color: #1e293b;
            border-top: 1px dashed #94a3b8;
            display: inline-block;
            padding-top: 4px;
            min-width: 130px;
          }
          .approved-stamp {
            color: #047857;
            font-weight: bold;
          }
          .footer-cert {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="logo-box">
              <img src="/logo.png" alt="WCERT FSMS Logo" style="max-height: 42px; width: auto; object-fit: contain; margin: 0 auto 4px; display: block;" />
              <div class="logo-title">WCERT FSMS</div>
              <div class="logo-sub">ISO 22000:2018</div>
            </td>
            <td class="title-box">
              <div style="font-size: 9.5px; font-weight: bold; color: #475569; text-transform: uppercase;">
                HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM
              </div>
              <div class="title-main">${exportingDoc.doc_title}</div>
            </td>
            <td class="meta-box">
              <div><b>Mã số:</b> ${exportingDoc.doc_code}</div>
              <div><b>Phân cấp:</b> ${DOC_TYPES[exportingDoc.doc_type]?.label || exportingDoc.doc_type}</div>
              <div><b>Lần ban hành:</b> v${exportingDoc.current_version}</div>
              <div><b>Ngày hiệu lực:</b> ${exportingDoc.effective_date || "2026-08-25"}</div>
              <div><b>Trang:</b> 1 / 1</div>
            </td>
          </tr>
        </table>

        <div class="meta-grid">
          <div><b>Đơn vị chủ quản:</b> ${exportingDoc.department || "Ban QLCL & ATTP"}</div>
          <div><b>Tiêu chuẩn áp dụng:</b> ${exportingDoc.standard || "ISO 22000:2018"}</div>
        </div>

        <div class="content-body">${exportContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>

        <div class="signatures-container">
          <div class="sig-header">TRÁCH NHIỆM PHÊ DUYỆT THÔNG TIN DẠNG VĂN BẢN (ĐIỀU KHOẢN 7.5 ISO 22000)</div>
          <table class="sig-table">
            <tr>
              <td class="sig-col">
                <div class="sig-title">NGƯỜI SOẠN THẢO</div>
                <div class="sig-sub">(Ký & ghi rõ họ tên)</div>
                <div class="sig-space"></div>
                <div class="sig-name">Cán bộ ISO / QA</div>
              </td>
              <td class="sig-col">
                <div class="sig-title">NGƯỜI THẨM TRA</div>
                <div class="sig-sub">(Trưởng Ban ATTP)</div>
                <div class="sig-space"></div>
                <div class="sig-name">Trưởng ban QLCL & ATTP</div>
              </td>
              <td class="sig-col">
                <div class="sig-title">NGƯỜI PHÊ DUYỆT</div>
                <div class="sig-sub">(Tổng Giám đốc)</div>
                <div class="sig-space"></div>
                <div class="sig-name approved-stamp">${exportingDoc.status === "APPROVED" ? "ĐÃ PHÊ DUYỆT (BGĐ)" : "BẢN THẢO (DRAFT)"}</div>
              </td>
            </tr>
          </table>

          <div class="footer-cert">
            <div><b>WCERT FSMS CERTIFIED</b> • ISO 22000:2018 SYSTEM COMPLIANT</div>
            <div>Mã xác thực tài liệu điện tử: FSMS-${exportingDoc.doc_code}-2026</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printHtml(htmlContent);
  };

  // Tải file văn bản (.txt / .doc)
  const handleDownloadDoc = () => {
    if (!exportingDoc) return;
    const docData = `================================================================================
HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM (FSMS - ISO 22000:2018)
CÔNG TY CỔ PHẦN CHỨNG NHẬN WCERT TOÀN CẦU
================================================================================
MÃ TÀI LIỆU    : ${exportingDoc.doc_code}
TIÊU ĐỀ        : ${exportingDoc.doc_title}
PHÂN CẤP       : ${DOC_TYPES[exportingDoc.doc_type]?.label || exportingDoc.doc_type}
PHÒNG BAN      : ${exportingDoc.department || "Ban QLCL & ATTP"}
TIÊU CHUẨN     : ${exportingDoc.standard || "ISO 22000:2018"}
PHIÊN BẢN      : v${exportingDoc.current_version}
TRẠNG THÁI     : ${STATUS_CONFIG[exportingDoc.status]?.label || exportingDoc.status}
NGÀY HIỆU LỰC  : ${exportingDoc.effective_date || new Date().toISOString().split("T")[0]}
NGƯỜI PHÊ DUYỆT: ${exportingDoc.approver_name || "Ban Giám đốc"}
================================================================================

NỘI DUNG TÀI LIỆU:

${exportContent}

================================================================================
KÝ DUYỆT VĂN BẢN (ĐIỀU KHOẢN 7.5 ISO 22000:2018):
- Người soạn thảo : ................................... Ngày: ....................
- Người thẩm tra  : ................................... Ngày: ....................
- Người phê duyệt : ................................... Ngày: ....................
================================================================================
`;
    const blob = new Blob([docData], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportingDoc.doc_code}_${exportingDoc.doc_title.replace(/[/\\?%*:|"<>]/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
            onClick={handleOpenSopWorkflow}
            className="gap-1.5 border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold"
          >
            <GitFork className="h-3.5 w-3.5 text-purple-600" />
            Lưu Đồ Phê Duyệt SOP (Workflow)
          </Button>

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

          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAIAssistantOpen(true)}
              className="gap-1.5 border-primary/30 bg-primary/5 text-xs text-primary hover:bg-primary/10"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Trợ lý AI soạn thảo SOP
            </Button>
          )}

          {canEdit && (
            <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 text-xs">
              <Plus className="h-4 w-4" />
              Tạo tài liệu mới
            </Button>
          )}
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
                {departments.map((d) => (
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
                <th className="px-4 py-3">Tên tài liệu</th>
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
                          <button
                            onClick={() => handleOpenExportPDF(doc)}
                            className="font-mono font-bold text-primary hover:underline hover:text-primary/80 transition text-left"
                            title="Xem văn bản & Xuất PDF"
                          >
                            {doc.doc_code}
                          </button>
                          <button
                            onClick={() => {
                              if (doc.file_url && doc.file_url.startsWith("http") && !doc.file_url.includes("google.com/document/create")) {
                                window.open(doc.file_url, "_blank");
                              } else {
                                handleOpenExportPDF(doc);
                              }
                            }}
                            title={doc.file_url ? "Mở tệp đính kèm / Xem văn bản" : "Xem văn bản chuẩn ISO"}
                            className="text-muted-foreground hover:text-primary transition p-0.5 rounded"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleOpenExportPDF(doc)}
                          className="font-medium text-foreground hover:text-primary transition text-left block"
                          title="Xem văn bản & Xuất PDF"
                        >
                          {doc.doc_title}
                        </button>
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
                          {/* Nút Xuất PDF / In văn bản */}
                          <button
                            onClick={() => handleOpenExportPDF(doc)}
                            title="Xuất file PDF / Xem văn bản chuẩn ISO"
                            className="rounded p-1.5 text-primary hover:bg-primary/10 transition"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                          </button>

                          {/* Nút Xem chi tiết */}
                          <button
                            onClick={() => setViewingDoc(doc)}
                            title="Xem chi tiết & Đánh giá tuân thủ"
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Nút Duyệt nhanh nếu chưa duyệt (Chỉ BGĐ hoặc Admin) */}
                          {doc.status !== "APPROVED" && (isManagement || isAdmin) && (
                            <button
                              onClick={() => handleQuickApprove(doc)}
                              title="Phê duyệt nhanh tài liệu (Ban Giám Đốc)"
                              className="rounded p-1.5 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 transition"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Nút Chỉnh sửa */}
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(doc)}
                              title="Chỉnh sửa tài liệu"
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Nút Xóa */}
                          {canEdit && (
                            <button
                              onClick={() => setDeletingDocItem({ id: doc.document_id, code: doc.doc_code, title: doc.doc_title })}
                              title="Xóa tài liệu"
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
              {editingDoc ? `Chỉnh sửa tài liệu: ${editingDoc.doc_code}` : "Tạo mới tài liệu ISO 22000"}
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
                  onChange={(e) => {
                    const newType = e.target.value;
                    if (!editingDoc) {
                      const prefixMap: Record<string, string> = {
                        POLICY: "POL-FSMS",
                        MANUAL: "MAN-FSMS",
                        SOP: "SOP-FSMS",
                        WI: "WI-FSMS",
                        FORM: "FORM-FSMS",
                        RECORD: "REC-FSMS",
                      };
                      const prefix = prefixMap[newType] || "DOC-FSMS";
                      const countForType = documents.filter((d) => d.doc_type === newType).length + 1;
                      setFormData({
                        ...formData,
                        doc_type: newType,
                        doc_code: `${prefix}-${String(countForType).padStart(2, "0")}`,
                      });
                    } else {
                      setFormData({ ...formData, doc_type: newType });
                    }
                  }}
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
                  Tên tài liệu <span className="text-destructive">*</span>
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
                  {departments.map((dept) => (
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

              {/* Link Docs ở trên */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                    <LinkIcon className="h-3.5 w-3.5" />
                    Đường dẫn tài liệu điện tử (Link Docs / PDF)
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenExportPDF(
                        {
                          document_id: editingDoc?.document_id || "preview",
                          doc_code: formData.doc_code || "SOP-FSMS-01",
                          doc_title: formData.doc_title || "Tài liệu ISO 22000",
                          doc_type: formData.doc_type,
                          department: formData.department,
                          standard: formData.standard,
                          current_version: formData.current_version,
                          status: formData.status,
                          effective_date: formData.effective_date,
                        },
                        formData.content
                      );
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 transition"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Bấm vào Link Docs để mở Form PDF
                  </button>
                </div>
                <Input
                  placeholder="https://.../documents?view=SOP-01"
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  className="h-9 text-xs font-mono bg-muted/20"
                />
                <p className="text-[10.5px] text-muted-foreground">
                  🔗 Link truy cập nhanh trực tiếp vào giao diện Form văn bản chuẩn ISO 22000 & In PDF.
                </p>
              </div>

              {/* Nội dung văn bản ở dưới */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Nội dung văn bản gốc (Toàn văn Quy trình / SOP) <span className="text-primary font-normal">• Nguồn dữ liệu xuất PDF</span>
                  </Label>
                  <span className="text-[10.5px] text-muted-foreground">Lưu trữ trực tiếp trong CSDL</span>
                </div>
                <textarea
                  rows={8}
                  placeholder="Nhập hoặc chỉnh sửa toàn văn quy trình (Mục đích, Phạm vi, Trách nhiệm, Nội dung thực hiện, Biểu mẫu lưu kèm)..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs leading-relaxed shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                />
                <p className="text-[11px] text-muted-foreground">
                  💡 Mọi thay đổi nội dung ở đây sẽ được đồng bộ ngay lập tức khi mở <b>Link Docs ở trên</b> hoặc xuất file PDF.
                </p>
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

                {/* Tệp đính kèm & Văn bản điện tử */}
                <div className="rounded-xl border bg-primary/5 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-primary">
                    <span className="flex items-center gap-1.5">
                      <FolderOpen className="h-3.5 w-3.5" />
                      Văn bản điện tử & Tệp đính kèm
                    </span>
                    <Button
                      size="sm"
                      onClick={() => {
                        setViewingDoc(null);
                        handleOpenExportPDF(viewingDoc);
                      }}
                      className="gap-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Xem Văn bản & Xuất PDF
                    </Button>
                  </div>

                  {viewingDoc.file_url && !viewingDoc.file_url.includes("google.com/document/create") ? (
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
                          <span>Mở tệp ngoài</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-2 text-center text-xs text-muted-foreground">
                      Tài liệu đã được tích hợp toàn văn và sẵn sàng xuất bản in chuẩn ISO 22000.
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

                <DialogFooter className="gap-2 pt-1 flex-wrap sm:flex-nowrap">
                  <Button size="sm" variant="outline" onClick={() => setViewingDoc(null)}>
                    Đóng
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const docToExport = viewingDoc;
                      handleOpenExportPDF(docToExport);
                    }}
                    className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Xem & Xuất PDF
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

          <DialogFooter className="gap-2 flex-wrap sm:flex-nowrap">
            <Button variant="outline" size="sm" onClick={() => setIsAIAssistantOpen(false)}>
              Đóng
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                handleOpenExportPDF(
                  {
                    document_id: "ai-preview",
                    doc_code: selectedAITemplate.code,
                    doc_title: selectedAITemplate.title,
                    doc_type: selectedAITemplate.type,
                    department: selectedAITemplate.department,
                    standard: selectedAITemplate.standard,
                    current_version: selectedAITemplate.version,
                    status: "DRAFT",
                    effective_date: new Date().toISOString().split("T")[0],
                  },
                  selectedAITemplate.content
                );
              }}
              className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            >
              <Printer className="h-3.5 w-3.5" />
              Xuất PDF Bản thảo
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

      {/* Modal Xem trước & Xuất PDF chuẩn ISO 22000 */}
      <Dialog open={!!exportingDoc} onOpenChange={() => setExportingDoc(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0">
          {exportingDoc && (
            <div className="flex flex-col">
              {/* Header điều khiển (Không in ra) */}
              <div className="no-print flex items-center justify-between border-b bg-muted/40 p-4 sticky top-0 z-10 bg-background/95 backdrop-blur">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Printer className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Xuất văn bản & In PDF Tiêu chuẩn ISO 22000
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Mã tài liệu: <span className="font-mono font-semibold text-primary">{exportingDoc.doc_code}</span> — {DOC_TYPES[exportingDoc.doc_type]?.label || exportingDoc.doc_type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(exportContent);
                      setIsCopiedExport(true);
                      setTimeout(() => setIsCopiedExport(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium shadow-sm hover:bg-muted transition"
                  >
                    {isCopiedExport ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Đã copy</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy nội dung</span>
                      </>
                    )}
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadDoc}
                    className="gap-1.5 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Tải file (.txt)
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePrintPDF}
                    className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    In / Lưu file PDF
                  </Button>
                </div>
              </div>

              {/* Khung tài liệu A4 chuẩn in ấn (Printable Document) */}
              <div className="p-4 sm:p-6 bg-slate-100 dark:bg-slate-900/50 flex justify-center">
                <div
                  id="iso-printable-document"
                  className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-lg rounded-sm p-8 font-sans border border-slate-200"
                >
                  {/* Bảng Header Form ISO 22000 tiêu chuẩn */}
                  <table className="w-full border-2 border-slate-900 text-xs mb-6 border-collapse">
                    <tbody>
                      <tr>
                        <td className="w-1/4 border border-slate-900 p-2.5 text-center align-middle bg-slate-50">
                          <img src={logoImg} alt="WCERT FSMS Logo" className="h-9 w-auto mx-auto object-contain mb-1" />
                          <div className="font-black text-emerald-700 text-xs tracking-wider">WCERT FSMS</div>
                          <div className="text-[9px] text-slate-600 uppercase font-bold mt-0.5">ISO 22000:2018</div>
                        </td>
                        <td className="w-2/4 border border-slate-900 p-3 text-center align-middle">
                          <div className="text-[10px] font-bold uppercase text-slate-600">
                            HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM
                          </div>
                          <div className="text-sm font-black uppercase text-slate-950 mt-1">
                            {exportingDoc.doc_title}
                          </div>
                        </td>
                        <td className="w-1/4 border border-slate-900 p-2.5 text-[10.5px] space-y-0.5 bg-slate-50">
                          <div><b>Mã hiệu:</b> <span className="font-mono">{exportingDoc.doc_code}</span></div>
                          <div><b>Phân cấp:</b> {DOC_TYPES[exportingDoc.doc_type]?.label}</div>
                          <div><b>Lần ban hành:</b> v{exportingDoc.current_version}</div>
                          <div><b>Ngày hiệu lực:</b> {exportingDoc.effective_date || "2026-08-25"}</div>
                          <div><b>Trang:</b> 1 / 1</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Thông tin metadata phòng ban & tiêu chuẩn */}
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-3 mb-5 text-xs">
                    <div>
                      <span className="font-bold text-slate-700">Đơn vị chủ quản: </span>
                      <span className="font-semibold text-slate-900">{exportingDoc.department || "Ban QLCL & ATTP"}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-700">Tiêu chuẩn áp dụng: </span>
                      <span className="font-semibold text-slate-900">{exportingDoc.standard || "ISO 22000:2018"}</span>
                    </div>
                  </div>

                  {/* Nội dung chi tiết quy trình */}
                  <div className="space-y-4 text-xs leading-relaxed text-slate-800 font-normal">
                    <div className="whitespace-pre-wrap font-sans text-xs leading-6">
                      {exportContent}
                    </div>
                  </div>

                  {/* Khung 3 Chữ ký Phê duyệt Ban hành theo Điều khoản 7.5 */}
                  <div className="mt-12 pt-6 border-t-2 border-slate-900">
                    <div className="text-center text-xs font-bold uppercase tracking-wider mb-6 text-slate-700">
                      TRÁCH NHIỆM PHÊ DUYỆT THÔNG TIN DẠNG VĂN BẢN (ĐIỀU KHOẢN 7.5 ISO 22000)
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center text-xs">
                      <div className="space-y-12">
                        <div>
                          <div className="font-bold uppercase text-slate-900">NGƯỜI SOẠN THẢO</div>
                          <div className="text-[10px] text-slate-500 italic">(Ký & ghi rõ họ tên)</div>
                        </div>
                        <div className="font-semibold text-slate-800 pt-8 border-t border-dashed border-slate-400 mx-4">
                          Cán bộ ISO / QA
                        </div>
                      </div>

                      <div className="space-y-12">
                        <div>
                          <div className="font-bold uppercase text-slate-900">NGƯỜI THẨM TRA</div>
                          <div className="text-[10px] text-slate-500 italic">(Trưởng Ban ATTP / Trưởng phòng)</div>
                        </div>
                        <div className="font-semibold text-slate-800 pt-8 border-t border-dashed border-slate-400 mx-4">
                          Trưởng ban QLCL & ATTP
                        </div>
                      </div>

                      <div className="space-y-12">
                        <div>
                          <div className="font-bold uppercase text-slate-900">NGƯỜI PHÊ DUYỆT</div>
                          <div className="text-[10px] text-slate-500 italic">(Tổng Giám đốc / Đại diện LĐ)</div>
                        </div>
                        <div className="font-semibold text-emerald-700 font-bold pt-8 border-t border-dashed border-slate-400 mx-4">
                          {exportingDoc.status === "APPROVED" ? "ĐÃ PHÊ DUYỆT (BAN GIÁM ĐỐC)" : "BẢN THẢO (DRAFT)"}
                        </div>
                      </div>
                    </div>

                    {/* Dấu số chứng nhận */}
                    <div className="mt-8 pt-4 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>WCERT FSMS CERTIFIED • ISO 22000:2018 SYSTEM COMPLIANT</span>
                      </div>
                      <div>Mã xác thực tài liệu điện tử: FSMS-{exportingDoc.doc_code}-2026</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer điều khiển dưới */}
              <div className="no-print p-4 border-t bg-muted/20 flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setExportingDoc(null)}>
                  Đóng cửa sổ
                </Button>
                <Button size="sm" onClick={handlePrintPDF} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Printer className="h-3.5 w-3.5" />
                  In / Xuất file PDF ngay
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CSS cho In ấn & Xuất PDF A4 sắc nét */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #iso-printable-document, #iso-printable-document * {
            visibility: visible !important;
          }
          #iso-printable-document {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 15mm 20mm !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            z-index: 9999999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      {/* ==================== MODAL: WORKFLOW BUILDER - SOP APPROVAL FLOW ==================== */}
      {showSopWorkflowModal && sopWorkflowTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <WorkflowBuilder
              initialData={sopWorkflowTemplate}
              onSave={async (wf) => {
                try {
                  await api.post("/builders/workflows", wf);
                  toast.success("Đã lưu lưu đồ quy trình phê duyệt SOP thành công!");
                  setShowSopWorkflowModal(false);
                } catch (err: any) {
                  toast.error("Lỗi khi lưu quy trình: " + (err.response?.data?.detail || err.message));
                }
              }}
              onCancel={() => setShowSopWorkflowModal(false)}
            />
          </div>
        </div>
      )}
      {/* Modal Xác Nhận Xóa Tài Liệu */}
      <ConfirmDialog
        isOpen={!!deletingDocItem}
        onClose={() => setDeletingDocItem(null)}
        onConfirm={() => {
          if (deletingDocItem) {
            executeDeleteDocument(deletingDocItem.id, deletingDocItem.code);
            setDeletingDocItem(null);
          }
        }}
        title="Xác nhận xóa tài liệu"
        description={`Bạn có chắc chắn muốn xoá tài liệu [${deletingDocItem?.code}] - "${deletingDocItem?.title}" không? Hành động này sẽ loại bỏ tài liệu khỏi hệ thống FSMS và không thể hoàn tác.`}
        confirmLabel="Xóa tài liệu"
        variant="destructive"
      />
    </div>
  );
}

export { DocumentsPage, DocumentsPage as DocumentsModule };
export default DocumentsPage;

