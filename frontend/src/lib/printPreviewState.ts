/**
 * printPreviewState.ts
 * Quản lý trạng thái hiển thị Modal Xem trước (Print Preview Modal) cho toàn hệ thống FSMS.
 * Mọi thao tác xuất/in tài liệu đều mở modal xem trước để người dùng kiểm tra trước khi tải PDF.
 */

export interface PrintPreviewRequest {
  isOpen: boolean;
  htmlContent: string;
  filename: string;
  orientation?: "portrait" | "landscape";
  title?: string;
}

type Listener = (state: PrintPreviewRequest) => void;

let currentState: PrintPreviewRequest = {
  isOpen: false,
  htmlContent: "",
  filename: "tai_lieu_iso22000.pdf",
  orientation: "portrait",
  title: "Xem trước tài liệu ISO 22000",
};

const listeners = new Set<Listener>();

export function openPrintPreview(request: {
  htmlContent: string;
  filename?: string;
  orientation?: "portrait" | "landscape";
  title?: string;
}) {
  currentState = {
    isOpen: true,
    htmlContent: request.htmlContent,
    filename: request.filename || "tai_lieu_iso22000.pdf",
    orientation: request.orientation || "portrait",
    title: request.title || "Xem trước tài liệu ISO 22000",
  };
  listeners.forEach((fn) => fn(currentState));
}

export function closePrintPreview() {
  currentState = { ...currentState, isOpen: false };
  listeners.forEach((fn) => fn(currentState));
}

export function subscribePrintPreview(fn: Listener): () => void {
  listeners.add(fn);
  fn(currentState);
  return () => {
    listeners.delete(fn);
  };
}

export function getPrintPreviewState(): PrintPreviewRequest {
  return currentState;
}
