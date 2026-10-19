import React, { useEffect, useState, useRef } from "react";
import {
  subscribePrintPreview,
  closePrintPreview,
  type PrintPreviewRequest,
} from "@/lib/printPreviewState";
import { exportElementToPdf, detectDocumentOrientation } from "@/lib/pdfExporter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileDown, Printer, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { escapeHtmlText, sanitizeCss, sanitizePrintableHtml } from "@/lib/sanitizeHtml";

export function UniversalPrintPreviewModal() {
  const [request, setRequest] = useState<PrintPreviewRequest>({
    isOpen: false,
    htmlContent: "",
    filename: "tai_lieu_iso22000.pdf",
    orientation: "portrait",
    title: "Xem trước tài liệu ISO 22000",
  });
  const [isExporting, setIsExporting] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const paperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribePrintPreview((newState) => {
      setRequest(newState);
      if (newState.isOpen) {
        // Tự động điều chỉnh tỉ lệ zoom phù hợp màn hình khi mở
        const isLandscape =
          newState.orientation === "landscape" ||
          detectDocumentOrientation(newState.htmlContent) === "landscape";
        if (typeof window !== "undefined") {
          const screenW = window.innerWidth;
          if (isLandscape && screenW < 1300) {
            setZoomScale(Math.max(0.65, Math.min(1, (screenW - 120) / 1150)));
          } else if (!isLandscape && screenW < 900) {
            setZoomScale(Math.max(0.7, Math.min(1, (screenW - 80) / 820)));
          } else {
            setZoomScale(1);
          }
        }
      }
    });
    return unsubscribe;
  }, []);

  if (!request.isOpen) return null;

  const orientation = request.orientation || detectDocumentOrientation(request.htmlContent);
  const isLandscape = orientation === "landscape";
  const targetWidthPx = isLandscape ? 1123 : 794;
  const targetMinHeightPx = isLandscape ? 794 : 1123;

  // Trích xuất nội dung body và style từ HTML
  const safeRequestHtml = sanitizePrintableHtml(request.htmlContent);
  let processedHtml = safeRequestHtml;
  let customStyles = "";

  const styleMatches = safeRequestHtml.match(/<style\b[^>]*>([\s\S]*?)<\/style>/gi);
  if (styleMatches) {
    customStyles = sanitizeCss(
      styleMatches.map((s) => s.replace(/<\/?style\b[^>]*>/gi, "")).join("\n"),
    );
  }

  const bodyMatch = safeRequestHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    processedHtml = bodyMatch[1];
  } else {
    // Nếu không có thẻ body, loại bỏ các thẻ html/head/meta cơ bản
    processedHtml = processedHtml
      .replace(/<!DOCTYPE[^>]*>/gi, "")
      .replace(/<html\b[^>]*>/gi, "")
      .replace(/<\/html>/gi, "")
      .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "");
  }

  const handleExportPdf = async () => {
    if (!paperRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading("Đang kết xuất PDF theo bản xem trước...");

    try {
      // Tạm thời đặt scale về 1 để html2canvas chụp đúng độ phân giải A4
      const currentScale = zoomScale;
      setZoomScale(1);
      await new Promise((resolve) => setTimeout(resolve, 80));

      await exportElementToPdf(paperRef.current, request.filename, orientation);

      setZoomScale(currentScale);
      toast.dismiss(toastId);
      toast.success("Xuất file PDF thành công! Bản in sắc nét đã tải về máy.");
      closePrintPreview();
    } catch (err) {
      console.error("Lỗi xuất PDF từ preview:", err);
      toast.dismiss(toastId);
      toast.error("Không thể xuất file PDF. Đang mở bản in trình duyệt...");
      handleNativePrint();
    } finally {
      setIsExporting(false);
    }
  };

  const handleNativePrint = () => {
    if (!paperRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printTitle = escapeHtmlText(request.title || "In Tài Liệu ISO 22000");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${printTitle}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 ${orientation}; margin: 10mm 12mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.35; color: #000; background: #fff; margin: 0; padding: 0; }
          table { width: 100%; border-collapse: collapse; }
          ${customStyles}
        </style>
      </head>
      <body>
        ${paperRef.current.innerHTML}
        <script>
          window.onload = function() {
            window.focus();
            window.print();
            window.close();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={request.isOpen} onOpenChange={(open) => !open && closePrintPreview()}>
      <DialogContent className="max-w-[96vw] xl:max-w-[1300px] max-h-[95vh] p-0 overflow-hidden flex flex-col bg-slate-900 text-slate-100 border-slate-700 shadow-2xl">
        {/* Header Modal */}
        <DialogHeader className="p-4 sm:px-6 bg-slate-950 border-b border-slate-800 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-base shrink-0">
              ISO
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-black text-white line-clamp-1">
                Xem Trước Bản In & Xuất PDF: {request.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-medium">
                <span>
                  Khổ giấy:{" "}
                  <strong className="text-emerald-400 font-semibold">
                    {isLandscape ? "A4 Ngang (Landscape)" : "A4 Dọc (Portrait)"}
                  </strong>
                </span>
                <span>•</span>
                <span className="font-mono text-slate-400 truncate max-w-[280px]">
                  {request.filename}
                </span>
              </div>
            </div>
          </div>

          {/* Zoom controls & Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-slate-400 text-xs">
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.max(0.4, prev - 0.1))}
                className="p-1 hover:text-white transition rounded"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="w-11 text-center font-mono text-[11px]">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.min(1.4, prev + 0.1))}
                className="p-1 hover:text-white transition rounded"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1)}
                className="p-1 hover:text-white transition rounded ml-0.5"
                title="Khôi phục 100%"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNativePrint}
              className="hidden sm:inline-flex bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 text-xs gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Trực Tiếp</span>
            </Button>

            <Button
              size="sm"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-md transition"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExporting ? "Đang xuất PDF..." : "Xuất File PDF"}</span>
            </Button>

            <button
              type="button"
              onClick={closePrintPreview}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Khung cuộn xem trước tài liệu A4 */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-900/95 flex justify-center items-start">
          <div
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out",
            }}
            className="shrink-0"
          >
            {/* Tờ giấy in A4 chuẩn ISO */}
            <div
              ref={paperRef}
              id="universal-print-preview-sheet"
              style={{
                width: `${targetWidthPx}px`,
                minHeight: `${targetMinHeightPx}px`,
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
                color: "#0f172a",
                padding: "12mm 15mm",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
                borderRadius: "2px",
                overflow: "hidden",
                position: "relative",
              }}
              className="font-serif select-text"
            >
              <style dangerouslySetInnerHTML={{ __html: customStyles }} />
              <div
                className="iso-preview-inner"
                dangerouslySetInnerHTML={{ __html: processedHtml }}
              />
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <DialogFooter className="p-3 sm:px-6 bg-slate-950 border-t border-slate-800 flex flex-row items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Bản in chuẩn ISO 22000:2018 • Định dạng PDF A4 chất lượng cao (300 DPI)</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={closePrintPreview}
              className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Đóng
            </Button>
            <Button
              size="sm"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-md"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExporting ? "Đang xuất..." : "Xuất File PDF"}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
