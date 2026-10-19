import { sanitizePrintableHtml } from "./sanitizeHtml";

/**
 * Tự động phát hiện hướng in (Landscape hoặc Portrait) từ mã HTML hoặc phần tử DOM
 */
export function detectDocumentOrientation(
  contentOrElement: string | HTMLElement,
  overrideOrientation?: "portrait" | "landscape",
): "portrait" | "landscape" {
  if (overrideOrientation) return overrideOrientation;

  const html =
    typeof contentOrElement === "string"
      ? contentOrElement
      : contentOrElement.innerHTML || contentOrElement.outerHTML || "";

  // 1. Kiểm tra khai báo @page trong CSS
  if (
    /size:\s*(?:A4\s+)?landscape/i.test(html) ||
    /orientation:\s*landscape/i.test(html) ||
    /@page\s+landscape/i.test(html)
  ) {
    return "landscape";
  }

  // 2. Kiểm tra class hoặc id liên quan đến landscape
  if (
    /class=["'][^"']*\blandscape\b[^"']*["']/i.test(html) ||
    /id=["'][^"']*\blandscape\b[^"']*["']/i.test(html)
  ) {
    return "landscape";
  }

  // 3. Kiểm tra số lượng cột bảng (Nếu có bảng từ 7 cột trở lên -> chuẩn ISO luôn in ngang Landscape)
  const trMatches = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi);
  if (trMatches) {
    for (const tr of trMatches) {
      const thCount = (tr.match(/<th\b/gi) || []).length;
      if (thCount >= 7) {
        return "landscape";
      }
    }
  }

  return "portrait";
}

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string = "tai_lieu_iso22000.pdf",
  overrideOrientation?: "portrait" | "landscape",
): Promise<void> {
  const safeFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const orientation = detectDocumentOrientation(element, overrideOrientation);
  const isLandscape = orientation === "landscape";

  // Kích thước chuẩn A4 tại 96 DPI:
  // - Landscape: 297mm x 210mm -> 1123px x 794px
  // - Portrait:  210mm x 297mm -> 794px x 1123px
  const targetWidthPx = isLandscape ? 1123 : 794;
  const targetMinHeightPx = isLandscape ? 794 : 1123;
  const pdfWidthMm = isLandscape ? 297 : 210;
  const pdfHeightMm = isLandscape ? 210 : 297;

  // Lưu lại style gốc để hoàn trả sau khi chụp
  const originalWidth = element.style.width;
  const originalMaxWidth = element.style.maxWidth;
  const originalMinHeight = element.style.minHeight;
  const originalBoxSizing = element.style.boxSizing;
  const originalOverflow = element.style.overflow;
  const originalPadding = element.style.padding;

  element.style.width = `${targetWidthPx}px`;
  element.style.maxWidth = `${targetWidthPx}px`;
  element.style.minHeight = `${targetMinHeightPx}px`;
  element.style.boxSizing = "border-box";
  element.style.overflow = "hidden";

  // Đảm bảo có lề trang chuẩn nếu phần tử chưa có padding
  const computedStyle = window.getComputedStyle(element);
  const currentPaddingLeft = parseFloat(computedStyle.paddingLeft || "0");
  if (currentPaddingLeft < 10) {
    element.style.padding = "12mm 15mm";
  }

  try {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas-pro"),
    ]);

    const canvas = await html2canvas(element, {
      scale: 2, // 2x độ phân giải cho bản in sắc nét 300 DPI
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      allowTaint: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: targetWidthPx + 60,
      onclone: (clonedDoc) => {
        // Áp dụng luật CSS chống tràn bảng (overflow protection)
        const antiOverflowStyle = clonedDoc.createElement("style");
        antiOverflowStyle.textContent = `
          * { box-sizing: border-box !important; }
          table { table-layout: fixed !important; width: 100% !important; max-width: 100% !important; border-collapse: collapse !important; }
          th, td { word-break: break-word !important; overflow-wrap: break-word !important; }
          img { max-width: 100% !important; object-fit: contain !important; }
        `;
        clonedDoc.head.appendChild(antiOverflowStyle);

        const clonedElement = clonedDoc.getElementById(element.id) || clonedDoc.body;

        // 1. Chuyển đổi các thẻ <input> thành văn bản in thuần để bản PDF không bị viền form
        clonedElement.querySelectorAll("input").forEach((inp) => {
          const span = clonedDoc.createElement("span");
          span.textContent = (inp as HTMLInputElement).value || "";
          span.className = inp.className;
          span.style.cssText = (inp as HTMLInputElement).style.cssText;
          span.style.border = "none";
          span.style.background = "transparent";
          span.style.display = "inline-block";
          inp.replaceWith(span);
        });

        // 2. Chuyển đổi các thẻ <select> thành văn bản in thuần
        clonedElement.querySelectorAll("select").forEach((sel) => {
          const selectEl = sel as HTMLSelectElement;
          const selectedText =
            selectEl.options[selectEl.selectedIndex]?.text || selectEl.value || "";
          const span = clonedDoc.createElement("span");
          span.textContent = selectedText;
          span.className = selectEl.className;
          span.style.cssText = selectEl.style.cssText;
          span.style.border = "none";
          span.style.background = "transparent";
          span.style.display = "inline-block";
          selectEl.replaceWith(span);
        });

        // 3. Ẩn tất cả các nút công cụ có class no-print hoặc print:hidden
        clonedElement.querySelectorAll(".no-print, .print\\:hidden, button").forEach((el) => {
          (el as HTMLElement).style.display = "none";
        });
      },
    });

    // Dùng định dạng PNG để giữ độ tương phản cao, nét chữ và viền bảng đen rõ ràng
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const imgWidth = pdfWidthMm;
    const imgHeight = (canvas.height * pdfWidthMm) / canvas.width;

    // Nếu văn bản chỉ chênh lệch nhẹ với 1 trang (trong khoảng 8%), căn chỉnh vừa vặn trong đúng 1 trang
    if (imgHeight <= pdfHeightMm * 1.08) {
      pdf.addImage(
        imgData,
        "PNG",
        0,
        0,
        imgWidth,
        Math.min(imgHeight, pdfHeightMm),
        undefined,
        "FAST",
      );
    } else {
      let heightLeft = imgHeight;
      let page = 0;

      // Trang 1
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeightMm;

      // Tự động phân trang chuẩn xác nếu văn bản dài hơn 1 trang A4
      while (heightLeft > 5) {
        page++;
        pdf.addPage();
        pdf.addImage(
          imgData,
          "PNG",
          0,
          -page * pdfHeightMm,
          imgWidth,
          imgHeight,
          undefined,
          "FAST",
        );
        heightLeft -= pdfHeightMm;
      }
    }

    pdf.save(safeFilename);
  } finally {
    element.style.width = originalWidth;
    element.style.maxWidth = originalMaxWidth;
    element.style.minHeight = originalMinHeight;
    element.style.boxSizing = originalBoxSizing;
    element.style.overflow = originalOverflow;
    element.style.padding = originalPadding;
  }
}

/**
 * Xuất trực tiếp từ chuỗi HTML bằng cách tạo container ẩn với hướng in tự động
 */
export async function exportHtmlStringToPdf(
  htmlContent: string,
  filename: string = "tai_lieu_iso22000.pdf",
  overrideOrientation?: "portrait" | "landscape",
): Promise<void> {
  if (typeof window === "undefined") return;

  // Tự động lấy tên file từ thẻ <title> nếu có
  let resolvedFilename = filename;
  const titleMatch = htmlContent.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1] && (!filename || filename === "tai_lieu_iso22000.pdf")) {
    resolvedFilename = `${titleMatch[1].trim().replace(/[/\\?%*:|"<>]/g, "_")}.pdf`;
  }

  const orientation = detectDocumentOrientation(htmlContent, overrideOrientation);
  const isLandscape = orientation === "landscape";
  const targetWidthPx = isLandscape ? 1123 : 794;
  const targetMinHeightPx = isLandscape ? 794 : 1123;

  const container = document.createElement("div");
  container.id = "iso-offscreen-pdf-container";
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${targetWidthPx}px`;
  container.style.maxWidth = `${targetWidthPx}px`;
  container.style.minHeight = `${targetMinHeightPx}px`;
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#000000";
  container.style.zIndex = "-9999";
  container.style.boxSizing = "border-box";
  container.style.margin = "0";
  container.style.padding = "12mm 15mm";
  container.style.overflow = "hidden";
  container.innerHTML = sanitizePrintableHtml(htmlContent);

  document.body.appendChild(container);

  try {
    // Đợi render hoàn chỉnh phông chữ và hình ảnh
    await new Promise((resolve) => setTimeout(resolve, 250));
    await exportElementToPdf(container, resolvedFilename, orientation);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
