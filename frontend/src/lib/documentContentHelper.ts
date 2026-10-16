import { LOGO_BASE64 } from "@/assets/logoBase64";
import type { DocumentItem } from "@/lib/documentConstants";

/**
 * Chuyển đổi mã HTML phong phú (Rich Text) từ editor thành văn bản thuần sạch 100%,
 * dễ đọc, không còn thẻ HTML / css inline, chuẩn cho người dùng đọc và lưu cơ sở dữ liệu.
 */
export function htmlToCleanText(html: string): string {
  if (!html) return "";

  // Tạo DOM ảo để bóc tách thẻ có cấu trúc
  if (typeof document !== "undefined") {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // Xử lý tiêu đề H1, H2, H3, H4
    tempDiv.querySelectorAll("h1, h2, h3, h4").forEach((el) => {
      const headingText = (el.textContent || "").trim();
      el.replaceWith(document.createTextNode(`\n\n${headingText}\n`));
    });

    // Xử lý bảng table thành định dạng bảng text dễ đọc STT | Nội dung | ...
    tempDiv.querySelectorAll("table").forEach((table) => {
      const rows: string[] = [];
      table.querySelectorAll("tr").forEach((tr) => {
        const cells: string[] = [];
        tr.querySelectorAll("th, td").forEach((cell) => {
          cells.push((cell.textContent || "").trim());
        });
        if (cells.length > 0) {
          rows.push(cells.join(" | "));
        }
      });
      const tableText = rows.length > 0 ? `\n\n${rows.join("\n")}\n\n` : "";
      table.replaceWith(document.createTextNode(tableText));
    });

    // Xử lý danh sách li
    tempDiv.querySelectorAll("li").forEach((li) => {
      const liText = (li.textContent || "").trim();
      li.replaceWith(document.createTextNode(`\n- ${liText}`));
    });

    // Xử lý xuống dòng <p>, <div>, <br>
    tempDiv.querySelectorAll("p, div").forEach((p) => {
      const pText = (p.textContent || "").trim();
      if (pText) {
        p.replaceWith(document.createTextNode(`\n${pText}\n`));
      } else {
        p.replaceWith(document.createTextNode("\n"));
      }
    });

    tempDiv.querySelectorAll("br").forEach((br) => {
      br.replaceWith(document.createTextNode("\n"));
    });

    let raw = tempDiv.textContent || "";
    // Làm sạch khoảng trắng và dòng trống liên tiếp
    raw = raw
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return raw;
  }

  // Fallback regex nếu chạy ở môi trường server không có document
  return html
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "\n\n$1\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "\n- $1")
    .replace(/<tr[^>]*>(.*?)<\/tr>/gi, "$1\n")
    .replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi, " $1 | ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Chuyển đổi văn bản sạch hoặc plain text thành HTML chuẩn trực quan để hiển thị trong Word Editor
 */
export function cleanTextToHtml(text: string): string {
  if (!text) return "<p><br/></p>";

  // Nếu chuỗi đã chứa mã HTML có định dạng (như <table hoặc <h2>), trả về trực tiếp
  if (text.includes("<table") || (text.includes("<h2>") && text.includes("<p>"))) {
    return text;
  }

  const lines = text.split("\n");
  const htmlParts: string[] = [];
  let inList = false;
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length > 0) {
      let tHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; border: 1.5pt solid #0f172a;">
          <thead>
            <tr style="background-color: #f1f5f9; font-weight: bold;">
      `;
      const firstRow = tableRows[0];
      firstRow.forEach((cell) => {
        tHtml += `<th style="border: 1px solid #0f172a; padding: 6px 8px; text-align: center;">${cell}</th>`;
      });
      tHtml += `</tr></thead><tbody>`;

      for (let i = 1; i < tableRows.length; i++) {
        tHtml += `<tr>`;
        tableRows[i].forEach((cell) => {
          tHtml += `<td style="border: 1px solid #0f172a; padding: 6px 8px;">${cell}</td>`;
        });
        tHtml += `</tr>`;
      }
      tHtml += `</tbody></table>`;
      htmlParts.push(tHtml);
      tableRows = [];
      inTable = false;
    }
  };

  const flushList = () => {
    if (inList) {
      htmlParts.push("</ul>");
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      flushTable();
      continue;
    }

    // Kiểm tra dòng dạng bảng: "STT | Tiêu chí | Kết quả"
    if (trimmed.includes(" | ")) {
      flushList();
      inTable = true;
      const cells = trimmed.split(" | ").map((c) => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Kiểm tra dòng tiêu đề mục: "1. MỤC ĐÍCH:", "2. PHẠM VI ÁP DỤNG:", "CHÍNH SÁCH CHẤT LƯỢNG:"
    const isHeading =
      /^[0-9]+(\.[0-9]+)*\s+[A-ZÀ-Ỹ0-9\s/&()-]+:/i.test(trimmed) ||
      (/^[0-9]+\.\s+[A-ZÀ-Ỹ]/.test(trimmed) && trimmed.length < 80) ||
      (trimmed.startsWith("TRÁCH NHIỆM") && trimmed.endsWith(":"));

    if (isHeading) {
      flushList();
      htmlParts.push(
        `<h2 style="font-size: 13px; font-weight: bold; margin-top: 14px; margin-bottom: 6px; color: #0f172a;">${trimmed}</h2>`
      );
      continue;
    }

    // Kiểm tra dòng danh sách: "- nội dung" hoặc "• nội dung"
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
      if (!inList) {
        htmlParts.push('<ul style="margin: 6px 0 10px 20px; list-style-type: disc;">');
        inList = true;
      }
      const itemText = trimmed.replace(/^[-•*]\s*/, "");
      htmlParts.push(`<li style="margin-bottom: 4px;">${itemText}</li>`);
      continue;
    }

    flushList();

    // Dòng văn bản bình thường
    htmlParts.push(`<p style="margin-top: 0; margin-bottom: 8px; line-height: 1.65;">${trimmed}</p>`);
  }

  flushList();
  flushTable();

  return htmlParts.join("");
}

/**
 * Các khung mẫu chuẩn hóa ISO 22000 (cung cấp cả dạng Văn bản sạch & HTML)
 */
export const ISO_TEMPLATES = {
  SOP: {
    cleanText: `1. MỤC ĐÍCH:
Quy định trình tự và các bước thao tác chuẩn nhằm đảm bảo an toàn vệ sinh thực phẩm và tuân thủ yêu cầu Điều khoản 7.5 & 8.2 tiêu chuẩn ISO 22000:2018.

2. PHẠM VI ÁP DỤNG:
Áp dụng cho toàn thể cán bộ, nhân viên thuộc ban phòng ban phụ trách và các bộ phận vận hành liên quan trong nhà máy.

3. TRÁCH NHIỆM THỰC HIỆN:
- Ban Giám đốc: Phê duyệt quy trình và đảm bảo cung cấp đầy đủ nguồn lực triển khai.
- Trưởng bộ phận: Phổ biến, đào tạo, hướng dẫn và giám sát việc thực hiện đúng quy trình.
- Nhân viên vận hành: Tuân thủ nghiêm ngặt các bước hướng dẫn và ghi chép biểu mẫu đầy đủ.

4. NỘI DUNG THỰC HIỆN CHI TIẾT:
4.1 Công tác chuẩn bị: Kiểm tra tình trạng vệ sinh trang thiết bị, phương tiện đo và trang bị bảo hộ lao động đầy đủ trước ca làm việc.
4.2 Thao tác kỹ thuật: Tiến hành theo đúng trình tự kỹ thuật, kiểm soát thông số công đoạn theo ngưỡng quy định.
4.3 Giám sát & Ghi nhận: Theo dõi liên tục các chỉ số kiểm soát và đối chiếu tiêu chuẩn an toàn thực phẩm.
4.4 Xử lý bất thường: Khi phát hiện sai lệch, lập tức cô lập sản phẩm, đánh dấu biển cảnh báo và báo cáo ngay Đội trưởng ATTP/QC.

5. BIỂU MẪU & HỒ SƠ LƯU KÈM:
- Biểu mẫu nhật ký kiểm soát thông số công đoạn vận hành
- Phiếu báo cáo sự không phù hợp & Hành động khắc phục CAPA (khi có phát sinh sự cố)`,
    html: `
      <h2 style="font-size: 13px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; color: #0f172a;">1. MỤC ĐÍCH:</h2>
      <p style="margin-bottom: 8px;">Quy định trình tự và các bước thao tác chuẩn nhằm đảm bảo an toàn vệ sinh thực phẩm và tuân thủ yêu cầu Điều khoản 7.5 & 8.2 tiêu chuẩn ISO 22000:2018.</p>

      <h2 style="font-size: 13px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; color: #0f172a;">2. PHẠM VI ÁP DỤNG:</h2>
      <p style="margin-bottom: 8px;">Áp dụng cho toàn thể cán bộ, nhân viên thuộc ban phòng ban phụ trách và các bộ phận vận hành liên quan trong nhà máy.</p>

      <h2 style="font-size: 13px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; color: #0f172a;">3. TRÁCH NHIỆM THỰC HIỆN:</h2>
      <ul style="margin: 4px 0 10px 20px;">
        <li style="margin-bottom: 4px;"><b>Ban Giám đốc:</b> Phê duyệt quy trình và đảm bảo cung cấp đầy đủ nguồn lực triển khai.</li>
        <li style="margin-bottom: 4px;"><b>Trưởng bộ phận:</b> Phổ biến, đào tạo, hướng dẫn và giám sát việc thực hiện đúng quy trình.</li>
        <li style="margin-bottom: 4px;"><b>Nhân viên vận hành:</b> Tuân thủ nghiêm ngặt các bước hướng dẫn và ghi chép biểu mẫu đầy đủ.</li>
      </ul>

      <h2 style="font-size: 13px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; color: #0f172a;">4. NỘI DUNG THỰC HIỆN CHI TIẾT:</h2>
      <p style="margin-bottom: 6px;"><b>4.1 Công tác chuẩn bị:</b> Kiểm tra tình trạng vệ sinh trang thiết bị, phương tiện đo và trang bị bảo hộ lao động đầy đủ trước ca làm việc.</p>
      <p style="margin-bottom: 6px;"><b>4.2 Thao tác kỹ thuật:</b> Tiến hành theo đúng trình tự kỹ thuật, kiểm soát thông số công đoạn theo ngưỡng quy định.</p>
      <p style="margin-bottom: 6px;"><b>4.3 Giám sát & Ghi nhận:</b> Theo dõi liên tục các chỉ số kiểm soát và đối chiếu tiêu chuẩn an toàn thực phẩm.</p>
      <p style="margin-bottom: 6px;"><b>4.4 Xử lý bất thường:</b> Khi phát hiện sai lệch, lập tức cô lập sản phẩm, đánh dấu biển cảnh báo và báo cáo ngay Đội trưởng ATTP/QC.</p>

      <h2 style="font-size: 13px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; color: #0f172a;">5. BIỂU MẪU & HỒ SƠ LƯU KÈM:</h2>
      <ul style="margin: 4px 0 10px 20px;">
        <li style="margin-bottom: 4px;">Biểu mẫu nhật ký kiểm soát thông số công đoạn vận hành</li>
        <li style="margin-bottom: 4px;">Phiếu báo cáo sự không phù hợp & Hành động khắc phục CAPA (khi có phát sinh sự cố)</li>
      </ul>
    `,
  },

  FORM: {
    cleanText: `1. MỤC ĐÍCH BIỂU MẪU:
Ghi nhận và lưu trữ chính xác thông số vận hành thực tế tại các công đoạn kiểm soát nhằm phục vụ công tác thẩm tra và truy xuất nguồn gốc một chạm.

2. QUY ĐỊNH GHI CHÉP & LƯU HỒ SƠ:
- Người trực tiếp thực hiện phải ghi chép ngay tại thời điểm giám sát/kiểm tra.
- Không tẩy xóa; trường hợp có sai sót phải gạch ngang, ký nháy xác nhận và ghi lại số liệu đúng.
- Hồ sơ được lưu trữ an toàn tại phòng ban phụ trách tối thiểu 02 năm kể từ ngày phát sinh.

3. BẢNG THEO DÕI THÔNG SỐ VẬN HÀNH THỰC TẾ:
STT | Thời gian | Mã Lô / Vị trí | Thông số đo thực tế | Giới hạn tới hạn | Ký xác nhận
01 | 08:00 | LOT-2026-A1 | 85.5 °C | ≥ 85.0 °C | KTV 01
02 | 10:30 | LOT-2026-A1 | 86.2 °C | ≥ 85.0 °C | KTV 01
03 | 14:00 | LOT-2026-B2 | 85.8 °C | ≥ 85.0 °C | KTV 02`,
    html: `
      <h2 style="font-size: 13px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; color: #0f172a;">1. MỤC ĐÍCH BIỂU MẪU:</h2>
      <p style="margin-bottom: 8px;">Ghi nhận và lưu trữ chính xác thông số vận hành thực tế tại các công đoạn kiểm soát nhằm phục vụ công tác thẩm tra và truy xuất nguồn gốc một chạm.</p>

      <h2 style="font-size: 13px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; color: #0f172a;">2. QUY ĐỊNH GHI CHÉP & LƯU HỒ SƠ:</h2>
      <ul style="margin: 4px 0 10px 20px;">
        <li style="margin-bottom: 4px;">Người trực tiếp thực hiện phải ghi chép ngay tại thời điểm giám sát/kiểm tra.</li>
        <li style="margin-bottom: 4px;">Không tẩy xóa; trường hợp có sai sót phải gạch ngang, ký nháy xác nhận và ghi lại số liệu đúng.</li>
        <li style="margin-bottom: 4px;">Hồ sơ được lưu trữ an toàn tại phòng ban phụ trách tối thiểu 02 năm kể từ ngày phát sinh.</li>
      </ul>

      <h2 style="font-size: 13px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; color: #0f172a;">3. BẢNG THEO DÕI THÔNG SỐ VẬN HÀNH THỰC TẾ:</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; border: 1.5pt solid #0f172a;">
        <thead>
          <tr style="background-color: #f1f5f9; font-weight: bold;">
            <th style="border: 1px solid #0f172a; padding: 6px; width: 8%; text-align: center;">STT</th>
            <th style="border: 1px solid #0f172a; padding: 6px; width: 14%; text-align: center;">Thời gian</th>
            <th style="border: 1px solid #0f172a; padding: 6px; width: 22%; text-align: center;">Mã Lô / Vị trí</th>
            <th style="border: 1px solid #0f172a; padding: 6px; width: 22%; text-align: center;">Thông số đo thực tế</th>
            <th style="border: 1px solid #0f172a; padding: 6px; width: 20%; text-align: center;">Giới hạn tới hạn</th>
            <th style="border: 1px solid #0f172a; padding: 6px; width: 14%; text-align: center;">Ký xác nhận</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #0f172a; padding: 6px; text-align: center;">01</td>
            <td style="border: 1px solid #0f172a; padding: 6px; text-align: center;">08:00</td>
            <td style="border: 1px solid #0f172a; padding: 6px; text-align: center;">LOT-2026-A1</td>
            <td style="border: 1px solid #0f172a; padding: 6px; text-align: center;">85.5 °C</td>
            <td style="border: 1px solid #0f172a; padding: 6px; text-align: center;">≥ 85.0 °C</td>
            <td style="border: 1px solid #0f172a; padding: 6px; text-align: center;">KTV 01</td>
          </tr>
          <tr>
            <td style="border: 1px solid #0f172a; padding: 6px; text-align: center;">02</td>
            <td style="border: 1px solid #0f172a; padding: 6px; text-align: center;">10:30</td>
            <td style="border: 1px solid #0f172a; padding: 6px; text-align: center;">LOT-2026-A1</td>
            <td style="border: 1px solid #0f172a; padding: 6px; text-align: center;">86.2 °C</td>
            <td style="border: 1px solid #0f172a; padding: 6px; text-align: center;">≥ 85.0 °C</td>
            <td style="border: 1px solid #0f172a; padding: 6px; text-align: center;">KTV 01</td>
          </tr>
        </tbody>
      </table>
    `,
  },

  POLICY: {
    cleanText: `1. CAM KẾT CỦA BAN LÃNH ĐẠO:
Ban Tổng Giám đốc cam kết thiết lập, duy trì và cải tiến liên tục Hệ thống Quản lý An toàn Thực phẩm theo tiêu chuẩn Quốc tế ISO 22000:2018.

2. MỤC TIÊU AN TOÀN THỰC PHẨM CỐT LÕI:
- 100% sản phẩm sản xuất và phân phối đạt yêu cầu nghiêm ngặt về an toàn vi sinh, hóa học và vật lý.
- 100% nhân sự được đào tạo, sát hạch định kỳ về kiến thức ATTP, HACCP và vệ sinh thực hành tốt.
- Không để xảy ra bất kỳ sự cố ngộ độc thực phẩm hay thu hồi sản phẩm nào trên thị trường.

3. TRUYỀN THÔNG & THẨM TRA HIỆU LỰC:
Chính sách này được niêm yết công khai tại tất cả các khu vực sản xuất, được truyền đạt tới từng nhân viên và định kỳ đánh giá tính phù hợp trong cuộc họp Xem xét của Lãnh đạo (MRM).`,
    html: `
      <h2 style="font-size: 13px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; color: #0f172a;">1. CAM KẾT CỦA BAN LÃNH ĐẠO:</h2>
      <p style="margin-bottom: 8px;">Ban Tổng Giám đốc cam kết thiết lập, duy trì và cải tiến liên tục Hệ thống Quản lý An toàn Thực phẩm theo tiêu chuẩn Quốc tế ISO 22000:2018.</p>

      <h2 style="font-size: 13px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; color: #0f172a;">2. MỤC TIÊU AN TOÀN THỰC PHẨM CỐT LÕI:</h2>
      <ul style="margin: 4px 0 10px 20px;">
        <li style="margin-bottom: 4px;">100% sản phẩm sản xuất và phân phối đạt yêu cầu nghiêm ngặt về an toàn vi sinh, hóa học và vật lý.</li>
        <li style="margin-bottom: 4px;">100% nhân sự được đào tạo, sát hạch định kỳ về kiến thức ATTP, HACCP và vệ sinh thực hành tốt.</li>
        <li style="margin-bottom: 4px;">Không để xảy ra bất kỳ sự cố ngộ độc thực phẩm hay thu hồi sản phẩm nào trên thị trường.</li>
      </ul>

      <h2 style="font-size: 13px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; color: #0f172a;">3. TRUYỀN THÔNG & THẨM TRA HIỆU LỰC:</h2>
      <p style="margin-bottom: 8px;">Chính sách này được niêm yết công khai tại tất cả các khu vực sản xuất, được truyền đạt tới từng nhân viên và định kỳ đánh giá tính phù hợp trong cuộc họp Xem xét của Lãnh đạo (MRM).</p>
    `,
  },
};

/**
 * Tạo file Word (.doc) chuẩn hóa Microsoft Office MSO HTML,
 * Tích hợp Base64 logo offline (không bị lỗi [x] Th trong Word),
 * Bảng biểu viền đôi chuẩn A4, tương thích 100% Word 2013-2024, Word 365, WPS Office.
 */
export function generateCleanWordDocHtml(doc: DocumentItem, contentHtml: string): string {
  return `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${doc.doc_code} - ${doc.doc_title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 595.3pt 841.9pt; /* A4 */
      margin: 20mm 20mm 20mm 20mm;
      mso-header-margin: 35.4pt;
      mso-footer-margin: 35.4pt;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
    }
    body {
      font-family: Arial, "Times New Roman", sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #000000;
    }
    table.mso-header {
      width: 100%;
      border: 1.5pt solid #000000;
      border-collapse: collapse;
      margin-bottom: 15pt;
    }
    table.mso-header td {
      border: 1.0pt solid #000000;
      padding: 6pt 8pt;
      vertical-align: middle;
    }
    .logo-title {
      font-size: 13pt;
      font-weight: bold;
      color: #047857;
      text-align: center;
      margin-top: 2pt;
    }
    .logo-sub {
      font-size: 8pt;
      color: #475569;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
    }
    .doc-title-main {
      font-size: 12pt;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      color: #000000;
    }
    .meta-cell {
      font-size: 9pt;
      line-height: 1.35;
    }
    .meta-sub-bar {
      width: 100%;
      border-bottom: 1.0pt solid #000000;
      padding-bottom: 4pt;
      margin-bottom: 14pt;
      font-size: 10pt;
    }
    .content-area {
      font-size: 11pt;
      line-height: 1.5;
      margin-bottom: 25pt;
    }
    .content-area h2 {
      font-size: 11.5pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 4pt;
      color: #000000;
    }
    .content-area p {
      margin-top: 0;
      margin-bottom: 6pt;
    }
    .content-area table {
      width: 100%;
      border-collapse: collapse;
      margin: 10pt 0;
      border: 1.0pt solid #000000;
    }
    .content-area th, .content-area td {
      border: 1.0pt solid #000000;
      padding: 5pt 7pt;
      font-size: 10pt;
    }
    .content-area th {
      background-color: #f1f5f9;
      font-weight: bold;
    }
    table.sig-table {
      width: 100%;
      border-collapse: collapse;
      border: none;
      margin-top: 25pt;
    }
    table.sig-table td {
      border: none;
      text-align: center;
      vertical-align: top;
      width: 33.33%;
      padding: 4pt;
    }
    .sig-role {
      font-weight: bold;
      font-size: 10.5pt;
      text-transform: uppercase;
    }
    .sig-sub {
      font-size: 8.5pt;
      color: #555555;
      font-style: italic;
    }
    .sig-space {
      height: 40pt;
    }
    .sig-name {
      font-weight: bold;
      font-size: 10pt;
      border-top: 1.0pt dashed #666666;
      display: inline-block;
      padding-top: 4pt;
      min-width: 120pt;
    }
    .footer-stamp {
      margin-top: 20pt;
      border-top: 1.0pt solid #cccccc;
      padding-top: 6pt;
      font-size: 8pt;
      color: #666666;
    }
  </style>
</head>
<body>
  <div class="Section1">
    <!-- Header Table chuẩn ISO 22000 -->
    <table class="mso-header" border="1">
      <tr>
        <td width="26%" align="center" style="background-color: #f8fafc;">
          <img src="${LOGO_BASE64}" width="110" height="60" style="width: 110px; height: auto; display: block; margin: 0 auto 3px;" alt="WCERT FSMS Logo" />
          <div class="logo-title">WCERT FSMS</div>
          <div class="logo-sub">ISO 22000:2018</div>
        </td>
        <td width="48%" align="center">
          <div style="font-size: 8.5pt; font-weight: bold; color: #475569; text-transform: uppercase; margin-bottom: 3pt;">
            HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM
          </div>
          <div class="doc-title-main">
            ${doc.doc_title || "TÀI LIỆU TIÊU CHUẨN ISO 22000"}
          </div>
        </td>
        <td width="26%" class="meta-cell" style="background-color: #f8fafc;">
          <div><b>Mã hiệu:</b> ${doc.doc_code}</div>
          <div><b>Phân cấp:</b> ${doc.doc_type}</div>
          <div><b>Lần ban hành:</b> v${doc.current_version}</div>
          <div><b>Ngày hiệu lực:</b> ${doc.effective_date || "2026-08-25"}</div>
          <div><b>Trang:</b> 1 / 1</div>
        </td>
      </tr>
    </table>

    <table class="meta-sub-bar" border="0" style="width: 100%;">
      <tr>
        <td style="text-align: left; font-size: 10pt;">
          <b>Đơn vị chủ quản:</b> ${doc.department || "Ban QLCL & ATTP"}
        </td>
        <td style="text-align: right; font-size: 10pt;">
          <b>Tiêu chuẩn áp dụng:</b> ${doc.standard || "ISO 22000:2018"}
        </td>
      </tr>
    </table>

    <!-- Nội dung toàn văn -->
    <div class="content-area">
      ${contentHtml}
    </div>

    <!-- Bảng Ký Duyệt Chuẩn Doanh Nghiệp -->
    <div style="page-break-inside: avoid;">
      <div style="text-align: center; font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-top: 20pt; margin-bottom: 12pt; color: #333333;">
        TRÁCH NHIỆM PHÊ DUYỆT THÔNG TIN DẠNG VĂN BẢN
      </div>
      <table class="sig-table">
        <tr>
          <td>
            <div class="sig-role">NGƯỜI SOẠN THẢO</div>
            <div class="sig-sub">(Ký & ghi rõ họ tên)</div>
            <div class="sig-space"></div>
            <div class="sig-name">${doc.drafter_name || "Cán bộ ISO / QA"}</div>
          </td>
          <td>
            <div class="sig-role">NGƯỜI THẨM TRA</div>
            <div class="sig-sub">(Trưởng Ban ATTP / Trưởng phòng)</div>
            <div class="sig-space"></div>
            <div class="sig-name">${doc.reviewer_name || "Trưởng ban QLCL & ATTP"}</div>
          </td>
          <td>
            <div class="sig-role">NGƯỜI PHÊ DUYỆT</div>
            <div class="sig-sub">(Tổng Giám đốc / Đại diện LĐ)</div>
            <div class="sig-space"></div>
            <div class="sig-name" style="color: #047857;">
              ${doc.status === "APPROVED" ? "ĐÃ PHÊ DUYỆT (BGĐ)" : "BẢN THẢO (DRAFT)"}
            </div>
          </td>
        </tr>
      </table>

      <table class="footer-stamp" style="width: 100%;">
        <tr>
          <td style="text-align: left;">
            <b>WCERT FSMS CERTIFIED</b> • ISO 22000:2018 SYSTEM COMPLIANT
          </td>
          <td style="text-align: right;">
            Mã xác thực tài liệu điện tử: FSMS-${doc.doc_code}-2026
          </td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>
  `.trim();
}
