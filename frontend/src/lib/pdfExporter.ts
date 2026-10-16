import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string = "tai_lieu_iso22000.pdf"
): Promise<void> {
  const safeFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;

  // Lưu lại style gốc để hoàn trả sau khi chụp
  const originalWidth = element.style.width;
  const originalMaxWidth = element.style.maxWidth;
  element.style.width = "794px"; // 210mm chuẩn ở 96 DPI
  element.style.maxWidth = "794px";

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // 2x độ phân giải cho bản in sắc nét 300 DPI
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      allowTaint: true,
      onclone: (clonedDoc) => {
        // Tìm element tương ứng trong tài liệu đã clone
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

        // 3. Ẩn tất cả các nút công cụ có class no-print
        clonedElement.querySelectorAll(".no-print").forEach((el) => {
          (el as HTMLElement).style.display = "none";
        });
      },
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let page = 0;

    // Trang 1
    pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;

    // Tự động phân trang chuẩn xác nếu văn bản dài hơn 1 trang A4
    while (heightLeft > 5) {
      page++;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, -page * pdfHeight, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;
    }

    pdf.save(safeFilename);
  } finally {
    element.style.width = originalWidth;
    element.style.maxWidth = originalMaxWidth;
  }
}

/**
 * Xuất trực tiếp từ chuỗi HTML bằng cách tạo container ẩn
 */
export async function exportHtmlStringToPdf(
  htmlContent: string,
  filename: string = "tai_lieu_iso22000.pdf"
): Promise<void> {
  if (typeof window === "undefined") return;

  const container = document.createElement("div");
  container.id = "iso-offscreen-pdf-container";
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.backgroundColor = "#ffffff";
  container.style.zIndex = "-1000";
  container.innerHTML = htmlContent;

  document.body.appendChild(container);

  try {
    // Đợi một frame để hình ảnh / phông chữ render hoàn chỉnh
    await new Promise((resolve) => setTimeout(resolve, 150));
    await exportElementToPdf(container, filename);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
