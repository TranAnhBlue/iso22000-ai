import {
  exportHtmlStringToPdf,
  exportElementToPdf,
  detectDocumentOrientation,
} from "./pdfExporter";
import { openPrintPreview } from "./printPreviewState";
import { toast } from "sonner";
import { sanitizePrintableHtml } from "./sanitizeHtml";

export { exportElementToPdf, exportHtmlStringToPdf, detectDocumentOrientation };

/**
 * Xuất tài liệu chuẩn hóa HTML sang file PDF (chuẩn A4 ISO 22000:2018).
 * Mặc định: Mở Modal Xem Trước (Print Preview Modal) để người dùng kiểm tra hình thức, logo, viền bảng
 * trước khi nhấn [Xuất File PDF].
 *
 * Nếu truyền vào một phần tử HTMLElement (như khi đang ở trong modal preview riêng),
 * hàm sẽ xuất trực tiếp phần tử đó ra file PDF mà không mở thêm modal.
 */
export async function printHtml(
  contentOrElement: string | HTMLElement,
  filename?: string,
  overrideOrientation?: "portrait" | "landscape",
  options?: { direct?: boolean },
): Promise<void> {
  if (typeof window === "undefined") return;

  const resolvedOrientation = detectDocumentOrientation(contentOrElement, overrideOrientation);

  // 1. Trường hợp truyền vào trực tiếp một HTMLElement (ví dụ từ dialog preview)
  if (typeof contentOrElement !== "string" && contentOrElement instanceof HTMLElement) {
    const toastId = toast.loading("Đang kết xuất và tải file PDF...");
    try {
      await exportElementToPdf(
        contentOrElement,
        filename || "tai_lieu_iso22000.pdf",
        resolvedOrientation,
      );
      toast.dismiss(toastId);
      toast.success("Xuất file PDF thành công! File đã được tải về máy của bạn.");
    } catch (err) {
      console.error("Lỗi xuất PDF từ element:", err);
      toast.dismiss(toastId);
      toast.error("Không thể xuất file PDF trực tiếp.");
    }
    return;
  }

  const htmlContent = sanitizePrintableHtml(contentOrElement as string);

  // 2. Nếu có cờ direct: true -> xuất ngay lập tức mà không mở modal preview
  if (options?.direct) {
    const toastId = toast.loading("Đang kết xuất và tải file PDF...");
    try {
      await exportHtmlStringToPdf(
        htmlContent,
        filename || "tai_lieu_iso22000.pdf",
        resolvedOrientation,
      );
      toast.dismiss(toastId);
      toast.success("Xuất file PDF thành công! File đã được tải về máy của bạn.");
    } catch (err) {
      console.error("Lỗi xuất PDF trực tiếp:", err);
      toast.dismiss(toastId);
      toast.error("Không thể xuất file PDF. Đang mở bản xem trước tài liệu...");
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(htmlContent);
        win.document.close();
        win.focus();
      }
    }
    return;
  }

  // 3. MẶC ĐỊNH: Mở Modal Xem Trước (Print Preview Modal) chuẩn A4
  // Trích xuất tiêu đề từ thẻ <title> nếu có
  let docTitle = "Tài liệu ISO 22000";
  const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    docTitle = titleMatch[1].trim();
  } else if (filename) {
    docTitle = filename.replace(/\.pdf$/i, "").replace(/[_]/g, " ");
  }

  openPrintPreview({
    htmlContent,
    filename: filename || "tai_lieu_iso22000.pdf",
    orientation: resolvedOrientation,
    title: docTitle,
  });
}
