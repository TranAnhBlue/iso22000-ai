import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Save,
  FileDown,
  Download,
  Copy,
  Check,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Table as TableIcon,
  Minus,
  Undo,
  Redo,
  Eraser,
  Sparkles,
  FileText,
  ShieldCheck,
  X,
  FileCheck,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { LOGO_BASE64 } from "@/assets/logoBase64";
import type { DocumentItem } from "@/lib/documentConstants";
import {
  htmlToCleanText,
  cleanTextToHtml,
  ISO_TEMPLATES,
  generateCleanWordDocHtml,
} from "@/lib/documentContentHelper";
import { exportElementToPdf } from "@/lib/pdfExporter";
import { sanitizePrintableHtml } from "@/lib/sanitizeHtml";

interface WordDocumentEditorModalProps {
  open: boolean;
  doc: DocumentItem | null;
  initialContent?: string;
  onClose: () => void;
  onSave: (updatedDoc: DocumentItem, cleanContent: string) => Promise<void>;
  onExportPDF?: (updatedDoc: DocumentItem, htmlContent: string) => void;
  departments?: string[];
}

export const WordDocumentEditorModal: React.FC<WordDocumentEditorModalProps> = ({
  open,
  doc,
  initialContent = "",
  onClose,
  onSave,
  departments = [
    "Ban QLCL & ATTP",
    "Phòng Sản xuất",
    "Bộ phận Kho & Logistic",
    "Phòng Kỹ thuật & Bảo trì",
    "Phòng Mua hàng & Cung ứng",
    "Phòng R&D",
    "Ban Giám đốc & HSE",
  ],
}) => {
  // Local draft state cho toàn bộ thuộc tính văn bản
  const [draftDoc, setDraftDoc] = useState<DocumentItem>(
    () =>
      doc || {
        document_id: "",
        doc_code: "",
        doc_title: "",
        doc_type: "Quy trình",
        current_version: "1.0",
        status: "DRAFT",
        department: "Ban QLCL & ATTP",
        standard: "ISO 22000:2018",
        content: "",
        file_url: "",
        effective_date: null,
        review_due_date: null,
        last_reviewed_date: null,
        review_frequency_years: 3,
        drafter_name: "",
        reviewer_name: "",
        security_level: "INTERNAL",
      },
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [wordCount, setWordCount] = useState({ words: 0, chars: 0 });
  const [isDirty, setIsDirty] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  // Khởi tạo nội dung vào editor khi mở modal
  useEffect(() => {
    if (!open || !doc) return;
    setDraftDoc({ ...doc });
    setIsDirty(false);

    // Chuyển đổi nội dung đầu vào: nếu là plain text thì parse sang HTML đẹp
    const rawContent = initialContent || doc.content || "";
    const htmlContent = sanitizePrintableHtml(cleanTextToHtml(rawContent));

    // Đặt nội dung vào contentEditable
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = htmlContent;
        updateCounts();
      }
    }, 50);
  }, [open, doc, initialContent]);

  // Đếm từ và ký tự
  const updateCounts = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    setWordCount({ words, chars });
  };

  const handleContentInput = () => {
    setIsDirty(true);
    updateCounts();
  };

  // Các lệnh định dạng văn bản (Rich text formatting via standard execCommand)
  const formatDoc = (cmd: string, val: string | undefined = undefined) => {
    if (typeof document === "undefined") return;
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    setIsDirty(true);
    updateCounts();
  };

  // Chèn bảng mẫu 3x3 chuẩn ISO
  const insertTable = () => {
    editorRef.current?.focus();
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; border: 1.5pt solid #0f172a;">
        <thead>
          <tr style="background-color: #f1f5f9; font-weight: bold;">
            <th style="border: 1px solid #0f172a; padding: 6px 8px; text-align: center; width: 10%;">STT</th>
            <th style="border: 1px solid #0f172a; padding: 6px 8px; text-align: left; width: 45%;">Nội dung kiểm soát / Tiêu chí</th>
            <th style="border: 1px solid #0f172a; padding: 6px 8px; text-align: left; width: 45%;">Yêu cầu kỹ thuật & Biện pháp</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #0f172a; padding: 6px 8px; text-align: center;">1</td>
            <td style="border: 1px solid #0f172a; padding: 6px 8px;">Chuẩn bị nguyên liệu & bao bì</td>
            <td style="border: 1px solid #0f172a; padding: 6px 8px;">Kiểm tra ngoại quan, tem nhãn, hạn sử dụng</td>
          </tr>
          <tr>
            <td style="border: 1px solid #0f172a; padding: 6px 8px; text-align: center;">2</td>
            <td style="border: 1px solid #0f172a; padding: 6px 8px;">Vận hành thiết bị công đoạn</td>
            <td style="border: 1px solid #0f172a; padding: 6px 8px;">Đảm bảo nhiệt độ, áp suất đúng thông số</td>
          </tr>
        </tbody>
      </table>
      <p><br/></p>
    `;
    document.execCommand("insertHTML", false, tableHtml);
    setIsDirty(true);
    updateCounts();
  };

  // Nạp khung mẫu chuẩn ISO 22000 và đồng bộ cả Phân cấp + Mã hiệu
  const loadIsoTemplate = (type: "SOP" | "FORM" | "POLICY") => {
    let newDocType = draftDoc.doc_type;
    let newDocCode = draftDoc.doc_code;
    let newTitle = draftDoc.doc_title;
    let templateHtml = "";

    if (type === "POLICY") {
      newDocType = "POLICY";
      if (
        !newTitle ||
        newTitle === "Tài liệu ISO 22000" ||
        newTitle.includes("Quy trình") ||
        newTitle.includes("Biểu mẫu")
      ) {
        newTitle = "Chính sách An toàn Thực phẩm & Cam kết Lãnh đạo";
      }
      if (newDocCode.startsWith("SOP-") || newDocCode.startsWith("FORM-")) {
        newDocCode = newDocCode.replace(/^(SOP|FORM)-/, "POL-");
      }
      templateHtml = ISO_TEMPLATES.POLICY.html;
    } else if (type === "FORM") {
      newDocType = "FORM";
      if (
        !newTitle ||
        newTitle === "Tài liệu ISO 22000" ||
        newTitle.includes("Chính sách") ||
        newTitle.includes("Quy trình")
      ) {
        newTitle = "Biểu mẫu Nhật ký Giám sát Thông số Vận hành ATTP";
      }
      if (newDocCode.startsWith("SOP-") || newDocCode.startsWith("POL-")) {
        newDocCode = newDocCode.replace(/^(SOP|POL)-/, "FORM-");
      }
      templateHtml = ISO_TEMPLATES.FORM.html;
    } else {
      newDocType = "SOP";
      if (
        !newTitle ||
        newTitle === "Tài liệu ISO 22000" ||
        newTitle.includes("Chính sách") ||
        newTitle.includes("Biểu mẫu")
      ) {
        newTitle = "Quy trình Vận hành Chuẩn & Kiểm soát An toàn Thực phẩm";
      }
      if (newDocCode.startsWith("FORM-") || newDocCode.startsWith("POL-")) {
        newDocCode = newDocCode.replace(/^(FORM|POL)-/, "SOP-");
      }
      templateHtml = ISO_TEMPLATES.SOP.html;
    }

    setDraftDoc((prev) => ({
      ...prev,
      doc_type: newDocType,
      doc_code: newDocCode,
      doc_title: newTitle,
    }));

    if (editorRef.current) {
      editorRef.current.innerHTML = templateHtml;
      setIsDirty(true);
      updateCounts();
      toast.success(
        `Đã nạp khung ${type === "POLICY" ? "Chính sách" : type === "FORM" ? "Biểu mẫu" : "Quy trình SOP"} chuẩn ISO 22000!`,
      );
    }
  };

  // Lưu văn bản trực tiếp (Lưu văn bản sạch vào DB/Form, không lưu code HTML)
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const editorHtml = editorRef.current?.innerHTML || "";
      const cleanContent = htmlToCleanText(editorHtml);

      await onSave(draftDoc, cleanContent);
      setIsDirty(false);
      toast.success("Đã lưu nội dung văn bản sạch và đồng bộ dữ liệu thành công!");
    } catch (err) {
      console.error(err);
      toast.error("Không thể lưu văn bản");
    } finally {
      setIsSaving(false);
    }
  };

  // Xuất trực tiếp file PDF tải về máy (KHÔNG bật hộp thoại In của trình duyệt)
  const handleExportPDF = async () => {
    if (!paperRef.current) {
      toast.error("Không tìm thấy trang tài liệu để xuất PDF");
      return;
    }

    setIsExportingPdf(true);
    const toastId = toast.loading("Đang kết xuất và tạo tệp PDF A4 sắc nét...");

    try {
      const filename = `${draftDoc.doc_code || "TAI-LIEU"}_${(draftDoc.doc_title || "ISO22000").replace(/[/\\?%*:|"<>]/g, "_")}.pdf`;
      await exportElementToPdf(paperRef.current, filename);
      toast.success(`Đã xuất và tải tệp ${filename} thành công!`, { id: toastId });
    } catch (err) {
      console.error("Lỗi xuất PDF:", err);
      toast.error("Không thể xuất file PDF. Vui lòng thử lại.", { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Tải file Word (.doc) tương thích 100% với Microsoft Word / WPS Office (Offline có logo, bảng đẹp)
  const handleDownloadDoc = () => {
    const editorHtml = editorRef.current?.innerHTML || "";
    const cleanWordHtml = generateCleanWordDocHtml(draftDoc, editorHtml);

    const blob = new Blob(["\ufeff", cleanWordHtml], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${draftDoc.doc_code || "TAI-LIEU"}_${(draftDoc.doc_title || "SOP").replace(/[/\\?%*:|"<>]/g, "_")}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Đã tải tệp Word (.doc) chuẩn hóa thành công (tương thích Word/WPS offline)!");
  };

  // Copy nội dung thuần sạch (không có code HTML)
  const handleCopy = () => {
    const editorHtml = editorRef.current?.innerHTML || "";
    const cleanText = htmlToCleanText(editorHtml);
    navigator.clipboard.writeText(cleanText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success("Đã sao chép nội dung văn bản sạch (không chứa code) vào clipboard!");
  };

  // Phím tắt bàn phím tiện lợi (Ctrl+S, Ctrl+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        handleExportPDF();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
  }, [draftDoc]);

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-[96vw] w-[1300px] h-[95vh] p-0 flex flex-col bg-slate-900 border-slate-800 text-slate-100 overflow-hidden shadow-2xl z-[60] [&>button:last-child]:hidden [&>button.absolute]:hidden">
        <style>{`
          .word-editor-body:empty:before {
            content: attr(data-placeholder);
            color: #94a3b8;
            pointer-events: none;
            font-style: italic;
            display: block;
          }
          .word-editor-body h1, .word-editor-body h2, .word-editor-body h3, .word-editor-body h4 {
            color: #0f172a;
            font-weight: 700;
            margin-top: 14px;
            margin-bottom: 6px;
          }
          .word-editor-body h2 {
            font-size: 13px;
          }
          .word-editor-body h3 {
            font-size: 12px;
          }
          .word-editor-body p {
            margin-top: 0;
            margin-bottom: 8px;
            line-height: 1.65;
            color: #1e293b;
          }
          .word-editor-body ul, .word-editor-body ol {
            margin-top: 4px;
            margin-bottom: 10px;
            padding-left: 22px;
          }
          .word-editor-body ul {
            list-style-type: disc;
          }
          .word-editor-body ol {
            list-style-type: decimal;
          }
          .word-editor-body li {
            margin-bottom: 4px;
            color: #1e293b;
          }
          .word-editor-body table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 11px;
          }
          .word-editor-body th, .word-editor-body td {
            border: 1px solid #0f172a;
            padding: 6px 8px;
            color: #0f172a;
          }
          .word-editor-body th {
            background-color: #f1f5f9;
            font-weight: bold;
          }
        `}</style>

        {/* ================= 1. THANH TIÊU ĐỀ TRÊN CÙNG (WORD/DOCS TITLEBAR) ================= */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-600 text-white font-black text-sm shadow">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                  {draftDoc.doc_code || "SOP-FSMS-01"}
                </span>
                <h2 className="text-sm font-bold text-slate-100 truncate max-w-md">
                  {draftDoc.doc_title || "Tài liệu ISO 22000"}
                </h2>
                {isDirty && (
                  <span className="text-[10px] text-amber-400 font-medium bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded animate-pulse">
                    Có thay đổi chưa lưu
                  </span>
                )}
              </div>
              <p className="text-[10.5px] text-slate-400">
                Trình soạn thảo văn bản trực tiếp (Google Docs / MS Word Clone) • Chuẩn hóa ISO
                22000:2018
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-semibold px-3"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Đang lưu..." : "Lưu văn bản"}
            </Button>

            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md font-semibold px-3"
              title="Xuất file PDF trực tiếp tải về máy tính (không mở bảng in)"
            >
              <FileDown className="h-3.5 w-3.5" />
              {isExportingPdf ? "Đang tạo PDF..." : "Xuất file PDF"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadDoc}
              className="h-8 gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700 transition"
              title="Tải tệp Word (.doc) mở bằng Microsoft Word offline chuẩn form"
            >
              <Download className="h-3.5 w-3.5" />
              Tải .doc
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-8 gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700 transition"
              title="Sao chép toàn bộ nội dung sạch không chứa thẻ code"
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {isCopied ? "Đã copy" : "Copy"}
            </Button>

            <button
              onClick={onClose}
              title="Đóng trình soạn thảo"
              aria-label="Đóng"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition ml-1 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ================= 2. THANH CÔNG CỤ SOẠN THẢO RI-BÔNG (WORD FORMATTING RIBBON) ================= */}
        <div className="flex items-center gap-1 px-4 py-1.5 bg-slate-900 border-b border-slate-800 text-xs shrink-0 flex-wrap overflow-x-auto">
          {/* Nhóm Undo / Redo */}
          <div className="flex items-center border-r border-slate-800 pr-1 mr-1 gap-0.5">
            <button
              type="button"
              onClick={() => formatDoc("undo")}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Hoàn tác (Ctrl+Z)"
            >
              <Undo className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatDoc("redo")}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Làm lại (Ctrl+Y)"
            >
              <Redo className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Nhóm Heading / Đoạn văn */}
          <div className="flex items-center border-r border-slate-800 pr-1 mr-1 gap-1">
            <button
              type="button"
              onClick={() => formatDoc("formatBlock", "<p>")}
              className="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white font-medium"
              title="Đoạn văn thường"
            >
              Văn bản
            </button>
            <button
              type="button"
              onClick={() => formatDoc("formatBlock", "<h2>")}
              className="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white font-bold flex items-center gap-0.5"
              title="Tiêu đề mục lớn (H2)"
            >
              <Heading1 className="h-3 w-3" />
              Mục lớn
            </button>
            <button
              type="button"
              onClick={() => formatDoc("formatBlock", "<h3>")}
              className="px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white font-semibold flex items-center gap-0.5"
              title="Tiêu đề mục nhỏ (H3)"
            >
              <Heading2 className="h-3 w-3" />
              Mục con
            </button>
          </div>

          {/* Nhóm Định dạng chữ (B, I, U, S) */}
          <div className="flex items-center border-r border-slate-800 pr-1 mr-1 gap-0.5">
            <button
              type="button"
              onClick={() => formatDoc("bold")}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-white font-black"
              title="In đậm (Ctrl+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatDoc("italic")}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-white"
              title="In nghiêng (Ctrl+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatDoc("underline")}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-white"
              title="Gạch chân (Ctrl+U)"
            >
              <Underline className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatDoc("strikeThrough")}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-white"
              title="Gạch ngang"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Nhóm Căn lề */}
          <div className="flex items-center border-r border-slate-800 pr-1 mr-1 gap-0.5">
            <button
              type="button"
              onClick={() => formatDoc("justifyLeft")}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Căn trái"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatDoc("justifyCenter")}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Căn giữa"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatDoc("justifyRight")}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Căn phải"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatDoc("justifyFull")}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Căn đều hai bên"
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Nhóm Danh sách */}
          <div className="flex items-center border-r border-slate-800 pr-1 mr-1 gap-0.5">
            <button
              type="button"
              onClick={() => formatDoc("insertOrderedList")}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Danh sách số (1, 2, 3...)"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatDoc("insertUnorderedList")}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Danh sách dấu chấm (•)"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Nhóm Chèn bảng & Xóa định dạng */}
          <div className="flex items-center border-r border-slate-800 pr-1 mr-1 gap-1">
            <button
              type="button"
              onClick={insertTable}
              className="px-2 py-1 rounded hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-1 font-medium"
              title="Chèn bảng theo dõi"
            >
              <TableIcon className="h-3.5 w-3.5" />
              Bảng
            </button>
            <button
              type="button"
              onClick={() => formatDoc("insertHorizontalRule")}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Đường phân cách"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => formatDoc("removeFormat")}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Xóa định dạng"
            >
              <Eraser className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Nhóm Nạp mẫu nhanh */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => loadIsoTemplate("SOP")}
              className="px-2.5 py-1 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 flex items-center gap-1 font-medium transition"
              title="Nạp cấu trúc Quy trình vận hành chuẩn SOP"
            >
              <Sparkles className="h-3 w-3" />
              Mẫu Quy trình (SOP)
            </button>
            <button
              type="button"
              onClick={() => loadIsoTemplate("FORM")}
              className="px-2.5 py-1 rounded bg-blue-950/70 hover:bg-blue-900 border border-blue-800 text-blue-300 flex items-center gap-1 font-medium transition"
              title="Nạp biểu mẫu nhật ký giám sát thông số"
            >
              <FileCheck className="h-3 w-3" />
              Mẫu Biểu mẫu
            </button>
            <button
              type="button"
              onClick={() => loadIsoTemplate("POLICY")}
              className="px-2.5 py-1 rounded bg-purple-950/70 hover:bg-purple-900 border border-purple-800 text-purple-300 flex items-center gap-1 font-medium transition"
              title="Nạp chính sách an toàn thực phẩm"
            >
              <BookOpen className="h-3 w-3" />
              Chính sách
            </button>
            <button
              type="button"
              onClick={() => {
                if (editorRef.current) {
                  editorRef.current.innerHTML = "<p><br/></p>";
                  setIsDirty(true);
                  updateCounts();
                  toast.info("Đã xóa trắng nội dung văn bản");
                }
              }}
              className="px-2 py-1 rounded hover:bg-rose-950/80 border border-rose-900/50 text-rose-300 transition"
              title="Xóa toàn bộ văn bản để gõ mới từ đầu"
            >
              Xóa trắng
            </button>
          </div>
        </div>

        {/* ================= 3. KHÔNG GIAN LÀM VIỆC A4 (GOOGLE DOCS / WORD PAGE CANVAS) ================= */}
        <div className="flex-1 overflow-y-auto bg-slate-900/90 p-4 sm:p-8 flex justify-center items-start">
          <div
            ref={paperRef}
            id="iso-printable-document"
            style={{
              backgroundColor: "#ffffff",
              color: "#0f172a",
              minHeight: "1123px",
              maxWidth: "794px",
              width: "100%",
            }}
            className="bg-white text-slate-900 shadow-2xl rounded-sm p-8 sm:p-12 font-sans border border-slate-300 flex flex-col relative transition-all"
          >
            {/* Gợi ý chế độ Word */}
            <div className="no-print absolute -top-3 right-4 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              Chế độ chỉnh sửa trực tiếp (Word Clone) — Nhấp vào bất kỳ đâu để sửa
            </div>

            {/* BẢNG HEADER CHUẨN ISO 22000 (TẤT CẢ Ô ĐỀU SỬA TRỰC TIẾP ĐƯỢC) */}
            <table
              className="w-full border-2 border-slate-900 text-xs mb-5 border-collapse"
              style={{ borderCollapse: "collapse", border: "2px solid #0f172a" }}
            >
              <tbody>
                <tr>
                  {/* Ô Logo & Thương hiệu */}
                  <td
                    className="w-1/4 border border-slate-900 p-2.5 text-center align-middle bg-slate-50"
                    style={{ border: "1px solid #0f172a", backgroundColor: "#f8fafc" }}
                  >
                    <img
                      src={LOGO_BASE64}
                      alt="WCERT FSMS Logo"
                      className="h-10 w-auto mx-auto object-contain mb-1"
                      style={{ maxHeight: "42px", margin: "0 auto 3px", display: "block" }}
                    />
                    <div className="font-black text-emerald-700 text-xs tracking-wider">
                      WCERT FSMS
                    </div>
                    <div className="text-[9px] text-slate-600 uppercase font-bold mt-0.5">
                      ISO 22000:2018
                    </div>
                  </td>

                  {/* Ô Tiêu đề chính (Sửa trực tiếp) */}
                  <td
                    className="w-2/4 border border-slate-900 p-3 text-center align-middle"
                    style={{ border: "1px solid #0f172a" }}
                  >
                    <div className="text-[10px] font-bold uppercase text-slate-600 mb-1">
                      HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM
                    </div>
                    <input
                      type="text"
                      value={draftDoc.doc_title}
                      onChange={(e) => {
                        setDraftDoc({ ...draftDoc, doc_title: e.target.value });
                        setIsDirty(true);
                      }}
                      placeholder="NHẬP TIÊU ĐỀ TÀI LIỆU..."
                      className="w-full text-center text-sm font-black uppercase text-slate-950 bg-transparent border border-dashed border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-emerald-50/20 rounded py-1 px-1 outline-none transition"
                      title="Nhấp vào để chỉnh sửa tiêu đề văn bản"
                    />
                  </td>

                  {/* Ô Metadata (Mã số, Cấp, Phiên bản, Ngày - Sửa trực tiếp) */}
                  <td
                    className="w-1/4 border border-slate-900 p-2.5 text-[10.5px] space-y-1 bg-slate-50"
                    style={{ border: "1px solid #0f172a", backgroundColor: "#f8fafc" }}
                  >
                    <div className="flex items-center gap-1">
                      <b className="shrink-0 text-slate-800">Mã hiệu:</b>
                      <input
                        type="text"
                        value={draftDoc.doc_code}
                        onChange={(e) => {
                          setDraftDoc({ ...draftDoc, doc_code: e.target.value });
                          setIsDirty(true);
                        }}
                        className="font-mono font-bold text-slate-900 bg-transparent border border-dashed border-transparent hover:border-slate-300 focus:border-emerald-500 rounded px-1 w-full outline-none"
                        placeholder="Mã tài liệu"
                        title="Nhấp vào để sửa mã tài liệu"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <b className="shrink-0 text-slate-800">Phân cấp:</b>
                      <select
                        value={draftDoc.doc_type}
                        onChange={(e) => {
                          setDraftDoc({ ...draftDoc, doc_type: e.target.value });
                          setIsDirty(true);
                        }}
                        className="bg-transparent text-slate-900 border border-dashed border-transparent hover:border-slate-300 focus:border-emerald-500 rounded px-1 w-full outline-none cursor-pointer"
                        title="Chọn loại phân cấp tài liệu"
                      >
                        <option value="POLICY">Cấp 1 — Chính sách</option>
                        <option value="MANUAL">Cấp 2 — Sổ tay FSMS</option>
                        <option value="SOP">Cấp 3 — Quy trình (SOP)</option>
                        <option value="WI">Cấp 4 — Hướng dẫn (WI)</option>
                        <option value="FORM">Cấp 5 — Biểu mẫu</option>
                        <option value="RECORD">Cấp 5 — Hồ sơ lưu</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <b className="shrink-0 text-slate-800">Lần ban hành:</b>
                      <input
                        type="text"
                        value={draftDoc.current_version}
                        onChange={(e) => {
                          setDraftDoc({ ...draftDoc, current_version: e.target.value });
                          setIsDirty(true);
                        }}
                        className="text-slate-900 bg-transparent border border-dashed border-transparent hover:border-slate-300 focus:border-emerald-500 rounded px-1 w-16 outline-none"
                        placeholder="1.0"
                        title="Nhấp vào để sửa phiên bản"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <b className="shrink-0 text-slate-800">Ngày hiệu lực:</b>
                      <input
                        type="date"
                        value={draftDoc.effective_date || ""}
                        onChange={(e) => {
                          setDraftDoc({ ...draftDoc, effective_date: e.target.value });
                          setIsDirty(true);
                        }}
                        className="text-slate-900 bg-transparent border border-dashed border-transparent hover:border-slate-300 focus:border-emerald-500 rounded px-1 outline-none text-[10px]"
                        title="Nhấp vào để sửa ngày hiệu lực"
                      />
                    </div>

                    <div className="text-slate-800">
                      <b>Trang:</b> 1 / 1
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* DÒNG PHÒNG BAN & TIÊU CHUẨN (SỬA TRỰC TIẾP) */}
            <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-2.5 mb-6 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 shrink-0">Đơn vị chủ quản:</span>
                <input
                  type="text"
                  value={draftDoc.department || ""}
                  onChange={(e) => {
                    setDraftDoc({ ...draftDoc, department: e.target.value });
                    setIsDirty(true);
                  }}
                  list="departments-list"
                  placeholder="Ban QLCL & ATTP"
                  className="font-semibold text-slate-900 bg-transparent border border-dashed border-transparent hover:border-slate-300 focus:border-emerald-500 rounded px-1.5 w-full outline-none"
                  title="Nhấp vào để sửa đơn vị chủ quản"
                />
                <datalist id="departments-list">
                  {departments.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>

              <div className="flex items-center justify-end gap-1.5 text-right">
                <span className="font-bold text-slate-700 shrink-0">Tiêu chuẩn áp dụng:</span>
                <input
                  type="text"
                  value={draftDoc.standard || ""}
                  onChange={(e) => {
                    setDraftDoc({ ...draftDoc, standard: e.target.value });
                    setIsDirty(true);
                  }}
                  placeholder="ISO 22000:2018"
                  className="font-semibold text-slate-900 bg-transparent border border-dashed border-transparent hover:border-slate-300 focus:border-emerald-500 rounded px-1.5 text-right outline-none w-48"
                  title="Nhấp vào để sửa tiêu chuẩn áp dụng"
                />
              </div>
            </div>

            {/* VÙNG SOẠN THẢO VĂN BẢN CHÍNH (CONTENT-EDITABLE WORD BODY) */}
            <div className="flex-1 flex flex-col mb-8">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleContentInput}
                className="word-editor-body flex-1 text-xs leading-relaxed text-slate-800 font-normal min-h-[420px] p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 rounded transition"
                data-placeholder="Nhấp vào đây để bắt đầu gõ hoặc dán nội dung văn bản (như Microsoft Word / Google Docs)... Bôi đen để in đậm, tạo tiêu đề, danh sách, chèn bảng..."
              />
            </div>

            {/* BẢNG KÝ DUYỆT 3 CỘT (SỬA TRỰC TIẾP TÊN VÀ CHỨC DANH) */}
            <div className="mt-8 pt-6 border-t-2 border-slate-900">
              <div className="text-center text-xs font-bold uppercase tracking-wider mb-6 text-slate-700">
                TRÁCH NHIỆM PHÊ DUYỆT THÔNG TIN DẠNG VĂN BẢN
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-xs">
                {/* Người soạn thảo */}
                <div className="space-y-10">
                  <div>
                    <div className="font-bold uppercase text-slate-900">NGƯỜI SOẠN THẢO</div>
                    <div className="text-[10px] text-slate-500 italic">(Ký & ghi rõ họ tên)</div>
                  </div>
                  <div className="pt-6 border-t border-dashed border-slate-400 mx-2">
                    <input
                      type="text"
                      value={draftDoc.drafter_name || "Cán bộ ISO / QA"}
                      onChange={(e) => {
                        setDraftDoc({ ...draftDoc, drafter_name: e.target.value });
                        setIsDirty(true);
                      }}
                      className="text-center font-semibold text-slate-800 bg-transparent border border-dashed border-transparent hover:border-slate-300 focus:border-emerald-500 rounded px-1 w-full outline-none text-xs"
                      title="Nhấp vào để sửa tên người soạn thảo"
                    />
                  </div>
                </div>

                {/* Người thẩm tra */}
                <div className="space-y-10">
                  <div>
                    <div className="font-bold uppercase text-slate-900">NGƯỜI THẨM TRA</div>
                    <div className="text-[10px] text-slate-500 italic">
                      (Trưởng Ban ATTP / Trưởng phòng)
                    </div>
                  </div>
                  <div className="pt-6 border-t border-dashed border-slate-400 mx-2">
                    <input
                      type="text"
                      value={draftDoc.reviewer_name || "Trưởng ban QLCL & ATTP"}
                      onChange={(e) => {
                        setDraftDoc({ ...draftDoc, reviewer_name: e.target.value });
                        setIsDirty(true);
                      }}
                      className="text-center font-semibold text-slate-800 bg-transparent border border-dashed border-transparent hover:border-slate-300 focus:border-emerald-500 rounded px-1 w-full outline-none text-xs"
                      title="Nhấp vào để sửa tên người thẩm tra"
                    />
                  </div>
                </div>

                {/* Người phê duyệt */}
                <div className="space-y-10">
                  <div>
                    <div className="font-bold uppercase text-slate-900">NGƯỜI PHÊ DUYỆT</div>
                    <div className="text-[10px] text-slate-500 italic">
                      (Tổng Giám đốc / Đại diện LĐ)
                    </div>
                  </div>
                  <div className="pt-6 border-t border-dashed border-slate-400 mx-2">
                    <input
                      type="text"
                      value={
                        draftDoc.status === "APPROVED"
                          ? "ĐÃ PHÊ DUYỆT (BAN GIÁM ĐỐC)"
                          : "BẢN THẢO (DRAFT)"
                      }
                      onChange={(e) => {
                        setDraftDoc({ ...draftDoc, status: e.target.value });
                        setIsDirty(true);
                      }}
                      className="text-center font-bold text-emerald-700 bg-transparent border border-dashed border-transparent hover:border-slate-300 focus:border-emerald-500 rounded px-1 w-full outline-none text-xs"
                      title="Nhấp vào để sửa trạng thái phê duyệt"
                    />
                  </div>
                </div>
              </div>

              {/* Dấu số chứng nhận */}
              <div className="mt-8 pt-4 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>WCERT FSMS CERTIFIED • ISO 22000:2018 SYSTEM COMPLIANT</span>
                </div>
                <div>Mã xác thực tài liệu điện tử: FSMS-{draftDoc.doc_code}-2026</div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 4. THANH TRẠNG THÁI ĐÁY (WORD STATUS BAR) ================= */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span>
              Trang: <b>1 / 1 (A4 Chuẩn)</b>
            </span>
            <span>
              Số từ: <b>{wordCount.words}</b>
            </span>
            <span>
              Ký tự: <b>{wordCount.chars}</b>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              💡 Phím tắt: <b>Ctrl + S</b> (Lưu) • <b>Ctrl + P</b> (Xuất PDF) • <b>Ctrl + B</b> (In
              đậm)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              {isDirty ? "Chưa lưu thay đổi" : "Tài liệu đồng bộ sẵn sàng"}
            </span>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <Save className="h-3 w-3 mr-1" />
              Lưu ngay
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
