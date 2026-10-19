/**
 * dmsPrintHelpers.ts
 * Các mẫu in HTML chuẩn ISO 22000:2018 cho Quy trình Kiểm soát Tài liệu (QT-01-KSTL):
 * - BM01-KSTL: Phiếu yêu cầu xem xét tài liệu
 * - BM02-KSTL: Thông báo thay đổi & Sổ phân phối tài liệu
 * - BM03-KSTL: Danh mục tài liệu nội bộ
 * - BM04-KSTL: Danh mục tài liệu nguồn gốc bên ngoài
 * - BM05-KSTL: Kế hoạch & Báo cáo soát xét tài liệu định kỳ 3 năm
 * - BM01-KSHS: Danh mục hồ sơ lưu trữ và tiêu hủy
 */

import type {
  DocumentItem,
  DocumentChangeRequest,
  DocumentDistribution,
  ExternalDocument,
  PeriodicReviewItem,
  RecordRetention,
} from "@/lib/documentConstants";
import { LOGO_BASE64 } from "@/assets/logoBase64";

const PRINT_CSS = `
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    @page landscape { size: A4 landscape; margin: 10mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 10pt; line-height: 1.35; color: #0f172a; margin: 0; padding: 10px; background: #fff; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1.5px solid #1e293b; }
    .header-table td { border: 1px solid #1e293b; padding: 6px 10px; vertical-align: middle; }
    .company-title { font-weight: 800; font-size: 11px; text-transform: uppercase; color: #0f172a; line-height: 1.25; }
    .company-sub { font-size: 9px; color: #475569; margin-top: 2px; }
    .form-title { font-weight: 900; font-size: 13.5pt; text-align: center; text-transform: uppercase; color: #0f172a; margin: 0; }
    .form-sub { font-size: 8.5pt; text-align: center; font-style: italic; color: #475569; margin-top: 3px; }
    .meta-text { font-size: 8.5pt; line-height: 1.4; color: #1e293b; }
    .section-title { font-weight: bold; font-size: 10pt; margin: 12px 0 6px 0; text-transform: uppercase; border-bottom: 1px solid #334155; padding-bottom: 3px; color: #0f172a; }
    .content-table { width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 8px; margin-bottom: 12px; }
    .content-table th, .content-table td { border: 1px solid #334155; padding: 5px 6px; font-size: 8.5pt; word-break: break-word; overflow-wrap: break-word; }
    .content-table th { background-color: #f1f5f9; text-align: center; font-weight: bold; color: #0f172a; }
    .sign-table { width: 100%; border-collapse: collapse; margin-top: 25px; page-break-inside: avoid; text-align: center; }
    .sign-table td { border: none; vertical-align: top; padding: 6px 10px; }
    .sign-title { font-weight: bold; text-transform: uppercase; font-size: 9.5pt; color: #0f172a; margin-bottom: 3px; }
    .sign-role { font-style: italic; font-size: 8.5pt; color: #475569; }
    .sign-space { height: 60px; }
    .sign-name { font-weight: bold; font-size: 10pt; color: #0f172a; }
    .badge { display: inline-block; padding: 2px 6px; font-size: 8pt; border-radius: 3px; font-weight: bold; border: 1px solid #666; }
    .footer-note { margin-top: 15px; font-size: 8pt; text-align: center; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 6px; }
  </style>
`;

/**
 * 1. In Phiếu Yêu Cầu Xem Xét Tài Liệu (BM01-KSTL)
 */
export function generateChangeRequestHtml(cr: DocumentChangeRequest): string {
  const changeTypeLabel =
    cr.change_type === "NEW"
      ? "Soạn thảo mới"
      : cr.change_type === "REVISION"
        ? "Sửa đổi / Bổ sung"
        : cr.change_type === "OBSOLETE"
          ? "Ngưng áp dụng (Hủy bỏ)"
          : "Yêu cầu khác";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Phiếu Yêu Cầu Xem Xét Tài Liệu - ${cr.request_code}</title>
      ${PRINT_CSS}
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 30%; text-align: left; padding: 6px 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${LOGO_BASE64}" style="height: 44px; width: auto; object-fit: contain;" alt="Logo" />
              <div>
                <div class="company-title">CÔNG TY CP CHẾ BIẾN THỰC PHẨM WCERT</div>
                <div class="company-sub">Ban Quản lý CL & ATTP (FSMS)</div>
              </div>
            </div>
          </td>
          <td style="width: 45%; text-align: center;">
            <h1 class="form-title">PHIẾU YÊU CẦU XEM XÉT TÀI LIỆU</h1>
            <div class="form-sub">(DOCUMENT CHANGE REQUEST - ISO 22000:2018)</div>
          </td>
          <td style="width: 25%;">
            <div class="meta-text"><b>Mã số:</b> BM01-KSTL</div>
            <div class="meta-text"><b>Lần BH:</b> 01</div>
            <div class="meta-text"><b>Ngày BH:</b> 01/06/2023</div>
            <div class="meta-text"><b>Trang:</b> 1/1</div>
          </td>
        </tr>
      </table>

      <div style="margin-bottom: 12px; font-size: 10pt;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; padding: 4px 0;"><b>Mã phiếu yêu cầu:</b> <span style="font-family: monospace; font-weight: bold; font-size: 11pt; color: #1e40af;">${cr.request_code}</span></td>
            <td style="width: 50%; padding: 4px 0;"><b>Ngày gửi yêu cầu:</b> ${cr.request_date}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><b>Người đề xuất:</b> ${cr.requested_by_name}</td>
            <td style="padding: 4px 0;"><b>Đơn vị / Phòng ban:</b> ${cr.department}</td>
          </tr>
        </table>
      </div>

      <div class="section-title">1. THÔNG TIN TÀI LIỆU ĐỀ NGHỊ XEM XÉT</div>
      <table class="content-table">
        <tr>
          <td style="width: 25%; font-weight: bold; background-color: #f8fafc;">Mã hiệu tài liệu</td>
          <td style="width: 25%; font-family: monospace; font-weight: bold; color: #1e40af;">${cr.doc_code || "Chưa có (Soạn mới)"}</td>
          <td style="width: 25%; font-weight: bold; background-color: #f8fafc;">Hình thức yêu cầu</td>
          <td style="width: 25%; font-weight: bold; color: #1e40af;">${changeTypeLabel}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f8fafc;">Tên tài liệu</td>
          <td colspan="3" style="font-weight: bold;">${cr.doc_title}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f8fafc;">Thời hạn mong muốn</td>
          <td>${cr.target_completion_date || "Theo tiến độ kế hoạch"}</td>
          <td style="font-weight: bold; background-color: #f8fafc;">Cán bộ soạn thảo</td>
          <td>${cr.assigned_drafter || cr.requested_by_name}</td>
        </tr>
      </table>

      <div class="section-title">2. LÝ DO VÀ SỰ CẦN THIẾT PHẢI SOẠN MỚI / SỬA ĐỔI</div>
      <div style="border: 1px solid #334155; padding: 8px 10px; min-height: 55px; margin-bottom: 10px; font-size: 9.5pt; line-height: 1.45; white-space: pre-wrap; background: #fafafa;">${cr.reason}</div>

      <div class="section-title">3. TÓM TẮT NỘI DUNG DỰ KIẾN SOẠN THẢO / SỬA ĐỔI</div>
      <div style="border: 1px solid #334155; padding: 8px 10px; min-height: 65px; margin-bottom: 12px; font-size: 9.5pt; line-height: 1.45; white-space: pre-wrap; background: #fafafa;">${cr.proposed_content || "Đính kèm bản thảo chi tiết."}</div>

      <div class="section-title">4. Ý KIẾN VÀ KÝ DUYỆT CỦA CÁC CẤP QUẢN LÝ</div>
      <table class="content-table">
        <thead>
          <tr>
            <th style="width: 33%;">1. TRƯỞNG BỘ PHẬN ĐỀ XUẤT</th>
            <th style="width: 33%;">2. TRƯỞNG BAN QLCL & ATTP</th>
            <th style="width: 34%;">3. TỔNG GIÁM ĐỐC PHÊ DUYỆT</th>
          </tr>
        </thead>
        <tbody>
          <tr style="height: 110px; vertical-align: top;">
            <td>
              <div style="font-weight: bold; margin-bottom: 4px;">
                Ý kiến: ${cr.dept_head_opinion === "AGREE" ? "☑ ĐỒNG Ý" : cr.dept_head_opinion === "DISAGREE" ? "☒ KHÔNG ĐỒNG Ý" : "☐ Đang chờ ý kiến"}
              </div>
              <div style="font-size: 8.5pt; margin-top: 4px;"><b>Nhận xét:</b> ${cr.dept_head_comment || "---"}</div>
              <div style="margin-top: 30px; text-align: center;">
                <div style="font-weight: bold;">${cr.dept_head_signer_name || ""}</div>
                <div style="font-size: 8pt; color: #555;">${cr.dept_head_signed_at ? new Date(cr.dept_head_signed_at).toLocaleDateString("vi-VN") : ""}</div>
              </div>
            </td>
            <td>
              <div style="font-weight: bold; margin-bottom: 4px;">
                Ý kiến: ${cr.qa_head_opinion === "AGREE" ? "☑ ĐỒNG Ý" : cr.qa_head_opinion === "DISAGREE" ? "☒ KHÔNG ĐỒNG Ý" : "☐ Đang chờ xem xét"}
              </div>
              <div style="font-size: 8.5pt; margin-top: 4px;"><b>Nhận xét:</b> ${cr.qa_head_comment || "---"}</div>
              <div style="margin-top: 30px; text-align: center;">
                <div style="font-weight: bold;">${cr.qa_head_signer_name || ""}</div>
                <div style="font-size: 8pt; color: #555;">${cr.qa_head_signed_at ? new Date(cr.qa_head_signed_at).toLocaleDateString("vi-VN") : ""}</div>
              </div>
            </td>
            <td>
              <div style="font-weight: bold; margin-bottom: 4px;">
                Phê duyệt: ${cr.director_approval === "APPROVED" ? "☑ PHÊ DUYỆT" : cr.director_approval === "REJECTED" ? "☒ TỪ CHỐI" : "☐ Đang chờ phê duyệt"}
              </div>
              <div style="font-size: 8.5pt; margin-top: 4px;"><b>Chỉ đạo:</b> ${cr.director_comment || "---"}</div>
              <div style="margin-top: 30px; text-align: center;">
                <div style="font-weight: bold;">${cr.director_signer_name || ""}</div>
                <div style="font-size: 8pt; color: #555;">${cr.director_signed_at ? new Date(cr.director_signed_at).toLocaleDateString("vi-VN") : ""}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="footer-note">
        WCERT FSMS • HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM ISO 22000:2018 (BM01-KSTL)
      </div>
    </body>
    </html>
  `;
}

/**
 * 2. In Thông Báo Thay Đổi & Sổ Phân Phối Tài Liệu (BM02-KSTL)
 */
export function generateDistributionNoticeHtml(dist: DocumentDistribution): string {
  const methodText =
    dist.distribution_method === "PORTAL"
      ? "Bản điện tử (Phần mềm Portal)"
      : "Bản in giấy có dấu kiểm soát (Hardcopy)";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Thông Báo Thay Đổi & Phân Phối Tài Liệu - ${dist.notice_code}</title>
      ${PRINT_CSS}
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 30%; text-align: left; padding: 6px 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${LOGO_BASE64}" style="height: 44px; width: auto; object-fit: contain;" alt="Logo" />
              <div>
                <div class="company-title">CÔNG TY CP CHẾ BIẾN THỰC PHẨM WCERT</div>
                <div class="company-sub">Ban Quản lý CL & ATTP (FSMS)</div>
              </div>
            </div>
          </td>
          <td style="width: 45%; text-align: center;">
            <h1 class="form-title">THÔNG BÁO THAY ĐỔI & PHÂN PHỐI TÀI LIỆU</h1>
            <div class="form-sub">(DOCUMENT DISTRIBUTION NOTICE)</div>
          </td>
          <td style="width: 25%;">
            <div class="meta-text"><b>Mã số:</b> BM02-KSTL</div>
            <div class="meta-text"><b>Lần BH:</b> 01</div>
            <div class="meta-text"><b>Ngày BH:</b> 01/06/2023</div>
            <div class="meta-text"><b>Trang:</b> 1/1</div>
          </td>
        </tr>
      </table>

      <div style="margin-bottom: 12px; font-size: 10pt;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; padding: 4px 0;"><b>Mã thông báo:</b> <span style="font-family: monospace; font-weight: bold; font-size: 11pt; color: #1e40af;">${dist.notice_code}</span></td>
            <td style="width: 50%; padding: 4px 0;"><b>Ngày phát hành:</b> ${dist.distribution_date}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><b>Cán bộ phân phối (Doc Controller):</b> ${dist.distributed_by_name}</td>
            <td style="padding: 4px 0;"><b>Nơi nhận (Đơn vị áp dụng):</b> <span style="font-weight: bold; color: #047857;">${dist.department_recipient}</span></td>
          </tr>
        </table>
      </div>

      <div class="section-title">1. DANH MỤC VĂN BẢN PHÂN PHỐI</div>
      <table class="content-table">
        <thead>
          <tr>
            <th style="width: 15%;">Mã hiệu</th>
            <th style="width: 40%;">Tên tài liệu / quy trình</th>
            <th style="width: 12%;">Phiên bản</th>
            <th style="width: 15%;">Ngày hiệu lực</th>
            <th style="width: 18%;">Hình thức phân phối</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-family: monospace; font-weight: bold; text-align: center; color: #1e40af;">${dist.doc_code}</td>
            <td style="font-weight: bold;">${dist.doc_title}</td>
            <td style="text-align: center; font-weight: bold;">v${dist.version}</td>
            <td style="text-align: center;">${dist.effective_date}</td>
            <td style="text-align: center;">${methodText} (SL: ${dist.copy_number})</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">2. HƯỚNG DẪN XỬ LÝ PHIÊN BẢN CŨ HẾT HIỆU LỰC</div>
      <div style="border: 1px solid #334155; padding: 8px 10px; font-size: 9pt; line-height: 1.45; background-color: #f8fafc; margin-bottom: 12px;">
        ${
          dist.superseded_action === "RETRIEVE_AND_DESTROY"
            ? "<b>Hành động bắt buộc:</b> Thu hồi toàn bộ bản in cũ (Hardcopy) giao nộp lại Ban QLCL để hủy bỏ theo biên bản. Tuyệt đối không lưu hành song song bản cũ."
            : dist.superseded_action === "STAMP_OBSOLETE"
              ? "<b>Hành động bắt buộc:</b> Đóng dấu 'HẾT HIỆU LỰC' đỏ lên trang đầu của bản in cũ và chỉ giữ lại 01 bản tham khảo nếu cần thiết."
              : "<b>Tài liệu ban hành lần đầu:</b> Không có phiên bản cũ cần thu hồi. Yêu cầu phổ biến áp dụng ngay."
        }
      </div>

      <div class="section-title">3. XÁC NHẬN GIAO NHẬN TÀI LIỆU</div>
      <table class="content-table">
        <thead>
          <tr>
            <th style="width: 50%;">ĐẠI DIỆN ĐƠN VỊ TIẾP NHẬN</th>
            <th style="width: 50%;">CÁN BỘ KIỂM SOÁT TÀI LIỆU (GIAO)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="height: 100px; vertical-align: top;">
            <td>
              <div>Xác nhận đã nhận đủ số lượng tài liệu và cam kết đào tạo nội bộ.</div>
              <div style="font-size: 8.5pt; margin-top: 4px;"><b>Người nhận:</b> ${dist.recipient_name || dist.acknowledged_by_name || dist.department_recipient}</div>
              <div style="margin-top: 25px; text-align: center;">
                <div style="font-weight: bold;">${dist.recipient_name || dist.acknowledged_by_name || dist.department_recipient}</div>
                <div style="font-size: 8pt; color: #555;">${dist.received_date || dist.acknowledged_at || "Ngày: ...... / ...... / 202..."}</div>
              </div>
            </td>
            <td>
              <div>Đã bàn giao và cập nhật Sổ theo dõi phân phối tài liệu nội bộ.</div>
              <div style="font-size: 8.5pt; margin-top: 4px;"><b>Doc Controller:</b> ${dist.distributed_by_name}</div>
              <div style="margin-top: 25px; text-align: center;">
                <div style="font-weight: bold;">${dist.distributed_by_name}</div>
                <div style="font-size: 8pt; color: #555;">${dist.distribution_date}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="footer-note">
        WCERT FSMS • HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM ISO 22000:2018 (BM02-KSTL)
      </div>
    </body>
    </html>
  `;
}

/**
 * 3. In Danh Mục Tài Liệu Nguồn Gốc Bên Ngoài (BM04-KSTL)
 */
export const generateExternalDocMasterListHtml = (docs: ExternalDocument[]): string =>
  generateExternalDocsHtml(docs);
export function generateExternalDocsHtml(docs: ExternalDocument[]): string {
  const rows = docs
    .map((d, index) => {
      const categoryName =
        d.category === "LAW_REGULATION"
          ? "Văn bản QPPL / Nghị định"
          : d.category === "STANDARD_TCVN_ISO"
            ? "Tiêu chuẩn ISO / TCVN"
            : d.category === "TECHNICAL_SPEC_CUSTOMER"
              ? "Tiêu chuẩn Kỹ thuật / Khách hàng"
              : "Hướng dẫn ngành";

      const statusBadge =
        d.status === "EFFECTIVE"
          ? "<span style='color: #047857; font-weight: bold;'>Còn hiệu lực</span>"
          : d.status === "SUPERSEDED"
            ? `<span style='color: #b91c1c; font-weight: bold;'>Đã thay thế</span>`
            : "<span style='color: #64748b; font-weight: bold;'>Hết hiệu lực</span>";

      return `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td style="font-family: monospace; font-weight: bold; color: #1e40af;">${d.doc_code}</td>
        <td style="font-weight: bold;">${d.doc_title}</td>
        <td>${categoryName}</td>
        <td>${d.issuing_body}</td>
        <td style="text-align: center;">${d.effective_date || "---"}</td>
        <td style="text-align: center;">${statusBadge}</td>
        <td>${d.department_in_charge}</td>
        <td style="text-align: center;">${d.last_checked_date || "---"}</td>
      </tr>
    `;
    })
    .join("");

  const minRows = 5;
  let emptyRows = "";
  if (docs.length < minRows) {
    for (let i = docs.length + 1; i <= minRows; i++) {
      emptyRows += `
        <tr>
          <td style="text-align: center; color: #94a3b8;">${i}</td>
          <td style="text-align: center; color: #cbd5e1;">---</td>
          <td style="color: #cbd5e1; font-style: italic;">(Dòng trống chờ cập nhật văn bản)</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
      `;
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Danh Mục Tài Liệu Nguồn Gốc Bên Ngoài - BM04-KSTL</title>
      ${PRINT_CSS}
      <style>
        @page { size: A4 landscape; margin: 10mm 12mm; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 28%; text-align: left; padding: 6px 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${LOGO_BASE64}" style="height: 46px; width: auto; object-fit: contain;" alt="Logo" />
              <div>
                <div class="company-title">CÔNG TY CP CHẾ BIẾN THỰC PHẨM WCERT</div>
                <div class="company-sub">Ban Quản lý CL & ATTP (FSMS)</div>
              </div>
            </div>
          </td>
          <td style="width: 48%; text-align: center;">
            <h1 class="form-title">DANH MỤC TÀI LIỆU NGUỒN GỐC BÊN NGOÀI</h1>
            <div class="form-sub">(EXTERNAL DOCUMENTS REGISTER - ISO 22000:2018 MỤC 7.5.3.2)</div>
          </td>
          <td style="width: 24%;">
            <div class="meta-text"><b>Mã số:</b> BM04-KSTL</div>
            <div class="meta-text"><b>Lần BH:</b> 01</div>
            <div class="meta-text"><b>Ngày BH:</b> 01/06/2023</div>
            <div class="meta-text"><b>Trang:</b> 1/1</div>
          </td>
        </tr>
      </table>

      <!-- Bảng danh mục: các cột cộng lại đúng 100% (4+14+27+13+13+8+8+7+6 = 100%) -->
      <table class="content-table">
        <thead>
          <tr>
            <th style="width: 4%;">STT</th>
            <th style="width: 14%;">Mã hiệu văn bản</th>
            <th style="width: 27%;">Tên văn bản / Tiêu chuẩn quy chuẩn</th>
            <th style="width: 13%;">Phân loại</th>
            <th style="width: 13%;">Cơ quan ban hành</th>
            <th style="width: 8%;">Ngày hiệu lực</th>
            <th style="width: 8%;">Tình trạng</th>
            <th style="width: 7%;">Đơn vị theo dõi</th>
            <th style="width: 6%;">Rà soát</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${emptyRows}
        </tbody>
      </table>

      <table class="sign-table">
        <tr>
          <td style="width: 50%;">
            <div class="sign-title">NGƯỜI LẬP BIỂU</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Cán bộ Pháp chế & Kiểm soát tài liệu</div>
          </td>
          <td style="width: 50%;">
            <div class="sign-title">TRƯỞNG BAN QLCL & ATTP</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Đội trưởng Đội ATTP (FSMS)</div>
          </td>
        </tr>
      </table>

      <div class="footer-note">
        WCERT FSMS • HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM ISO 22000:2018 (BM04-KSTL)
      </div>
    </body>
    </html>
  `;
}

/**
 * 4. In Kế Hoạch & Báo Cáo Soát Xét Tài Liệu Định Kỳ 3 Năm (BM05-KSTL)
 */
export function generatePeriodicReviewsHtml(reviews: PeriodicReviewItem[]): string {
  const rows = reviews
    .map((r, index) => {
      const statusText =
        r.review_status === "VALID" || (r.review_status as any) === "VALIDATED"
          ? "<span style='color: #047857; font-weight: bold;'>Đã xác nhận duy trì</span>"
          : r.review_status === "OVERDUE"
            ? "<span style='color: #b91c1c; font-weight: bold;'>Quá hạn soát xét</span>"
            : "<span style='color: #b45309; font-weight: bold;'>Sắp đến hạn</span>";

      return `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td style="font-family: monospace; font-weight: bold; color: #1e40af;">${r.doc_code}</td>
        <td style="font-weight: bold;">${r.doc_title}</td>
        <td style="text-align: center;">${r.doc_type}</td>
        <td>${r.department}</td>
        <td style="text-align: center; font-weight: bold;">v${r.current_version}</td>
        <td style="text-align: center;">${r.effective_date || "---"}</td>
        <td style="text-align: center;">${r.last_reviewed_date || "---"}</td>
        <td style="text-align: center; font-weight: bold;">${r.review_due_date || "---"}</td>
        <td style="text-align: center;">${statusText}</td>
      </tr>
    `;
    })
    .join("");

  const minRows = 5;
  let emptyRows = "";
  if (reviews.length < minRows) {
    for (let i = reviews.length + 1; i <= minRows; i++) {
      emptyRows += `
        <tr>
          <td style="text-align: center; color: #94a3b8;">${i}</td>
          <td style="text-align: center; color: #cbd5e1;">---</td>
          <td style="color: #cbd5e1; font-style: italic;">(Dòng trống chờ soát xét)</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
      `;
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Kế Hoạch & Báo Cáo Soát Xét Tài Liệu Định Kỳ 3 Năm - BM05-KSTL</title>
      ${PRINT_CSS}
      <style>
        @page { size: A4 landscape; margin: 10mm 12mm; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 28%; text-align: left; padding: 6px 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${LOGO_BASE64}" style="height: 46px; width: auto; object-fit: contain;" alt="Logo" />
              <div>
                <div class="company-title">CÔNG TY CP CHẾ BIẾN THỰC PHẨM WCERT</div>
                <div class="company-sub">Ban Quản lý CL & ATTP (FSMS)</div>
              </div>
            </div>
          </td>
          <td style="width: 48%; text-align: center;">
            <h1 class="form-title">KẾ HOẠCH & BÁO CÁO SOÁT XÉT TÀI LIỆU ĐỊNH KỲ 3 NĂM</h1>
            <div class="form-sub">(3-YEAR DOCUMENT PERIODIC REVIEW SCHEDULE - ISO 22000:2018)</div>
          </td>
          <td style="width: 24%;">
            <div class="meta-text"><b>Mã số:</b> BM05-KSTL</div>
            <div class="meta-text"><b>Lần BH:</b> 01</div>
            <div class="meta-text"><b>Ngày BH:</b> 01/06/2023</div>
            <div class="meta-text"><b>Trang:</b> 1/1</div>
          </td>
        </tr>
      </table>

      <div style="margin-bottom: 8px; font-size: 8.5pt; font-style: italic; color: #475569;">
        * Căn cứ Mục 7.5.3 ISO 22000:2018 và Quy trình Kiểm soát Tài liệu QT-01-KSTL: Định kỳ 03 năm kể từ ngày có hiệu lực, các tài liệu phải được các đơn vị liên quan soát xét lại. Nếu không có thay đổi, lập xác nhận BM05 để tiếp tục duy trì hiệu lực thêm chu kỳ 3 năm tiếp theo.
      </div>

      <!-- Bảng danh mục: các cột cộng lại đúng 100% (4+13+27+7+13+6+8+7+8+7 = 100%) -->
      <table class="content-table">
        <thead>
          <tr>
            <th style="width: 4%;">STT</th>
            <th style="width: 13%;">Mã tài liệu</th>
            <th style="width: 27%;">Tên tài liệu / Quy trình</th>
            <th style="width: 7%;">Cấp</th>
            <th style="width: 13%;">Đơn vị phụ trách</th>
            <th style="width: 6%;">Phiên bản</th>
            <th style="width: 8%;">Ngày ban hành</th>
            <th style="width: 7%;">Soát xét</th>
            <th style="width: 8%;">Hạn kế tiếp</th>
            <th style="width: 7%;">Tình trạng</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${emptyRows}
        </tbody>
      </table>

      <table class="sign-table">
        <tr>
          <td style="width: 33.33%;">
            <div class="sign-title">NGƯỜI LẬP KẾ HOẠCH</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Cán bộ QA / Kiểm soát TL</div>
          </td>
          <td style="width: 33.33%;">
            <div class="sign-title">TRƯỞNG BAN QLCL & ATTP</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Đội trưởng FSMS</div>
          </td>
          <td style="width: 33.34%;">
            <div class="sign-title">TỔNG GIÁM ĐỐC PHÊ DUYỆT</div>
            <div class="sign-role">(Ký & đóng dấu)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Ban Giám Đốc Phê Duyệt</div>
          </td>
        </tr>
      </table>

      <div class="footer-note">
        WCERT FSMS • HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM ISO 22000:2018 (BM05-KSTL)
      </div>
    </body>
    </html>
  `;
}

export const generatePeriodicReviewHtml = generatePeriodicReviewsHtml;

/**
 * 5. In Danh Mục Tài Liệu Nội Bộ (BM03-KSTL)
 */
export function generateMasterDocumentListHtml(docs: DocumentItem[]): string {
  const rows = docs
    .map(
      (d, index) => `
    <tr>
      <td style="text-align: center;">${index + 1}</td>
      <td style="font-family: monospace; font-weight: bold; color: #1e40af;">${d.doc_code}</td>
      <td style="font-weight: bold;">${d.doc_title}</td>
      <td style="text-align: center;">${d.doc_type}</td>
      <td>${d.department || "Ban QLCL"}</td>
      <td style="text-align: center; font-weight: bold;">v${d.current_version}</td>
      <td style="text-align: center;">${d.effective_date || "---"}</td>
      <td style="text-align: center; font-weight: bold; color: ${d.status === "APPROVED" ? "#047857" : "#b45309"};">${d.status === "APPROVED" ? "Đã ban hành" : "Dự thảo"}</td>
      <td style="text-align: center;">${d.security_level || "INTERNAL"}</td>
      <td style="text-align: center;">${d.review_due_date || "---"}</td>
    </tr>
  `,
    )
    .join("");

  const minRows = 5;
  let emptyRows = "";
  if (docs.length < minRows) {
    for (let i = docs.length + 1; i <= minRows; i++) {
      emptyRows += `
        <tr>
          <td style="text-align: center; color: #94a3b8;">${i}</td>
          <td style="text-align: center; color: #cbd5e1;">---</td>
          <td style="color: #cbd5e1; font-style: italic;">(Dòng trống chờ ghi nhận)</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
      `;
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Danh Mục Tài Liệu Nội Bộ - BM03-KSTL</title>
      ${PRINT_CSS}
      <style>
        @page { size: A4 landscape; margin: 10mm 12mm; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 28%; text-align: left; padding: 6px 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${LOGO_BASE64}" style="height: 46px; width: auto; object-fit: contain;" alt="Logo" />
              <div>
                <div class="company-title">CÔNG TY CP CHẾ BIẾN THỰC PHẨM WCERT</div>
                <div class="company-sub">Ban Quản lý CL & ATTP (FSMS)</div>
              </div>
            </div>
          </td>
          <td style="width: 48%; text-align: center;">
            <h1 class="form-title">DANH MỤC TÀI LIỆU NỘI BỘ HỆ THỐNG FSMS</h1>
            <div class="form-sub">(INTERNAL MASTER DOCUMENT LIST - ISO 22000:2018)</div>
          </td>
          <td style="width: 24%;">
            <div class="meta-text"><b>Mã số:</b> BM03-KSTL</div>
            <div class="meta-text"><b>Lần BH:</b> 01</div>
            <div class="meta-text"><b>Ngày BH:</b> 01/06/2023</div>
            <div class="meta-text"><b>Trang:</b> 1/1</div>
          </td>
        </tr>
      </table>

      <!-- Bảng danh mục: các cột cộng lại đúng 100% (4+13+26+6+14+6+8+8+7+8 = 100%) -->
      <table class="content-table">
        <thead>
          <tr>
            <th style="width: 4%;">STT</th>
            <th style="width: 13%;">Mã hiệu</th>
            <th style="width: 26%;">Tên tài liệu / Quy trình</th>
            <th style="width: 6%;">Cấp</th>
            <th style="width: 14%;">Đơn vị soạn thảo</th>
            <th style="width: 6%;">Phiên bản</th>
            <th style="width: 8%;">Ngày hiệu lực</th>
            <th style="width: 8%;">Tình trạng</th>
            <th style="width: 7%;">Bảo mật</th>
            <th style="width: 8%;">Hạn soát xét</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${emptyRows}
        </tbody>
      </table>

      <table class="sign-table">
        <tr>
          <td style="width: 50%;">
            <div class="sign-title">NGƯỜI LẬP BIỂU</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Cán bộ Quản lý tài liệu (Doc Controller)</div>
          </td>
          <td style="width: 50%;">
            <div class="sign-title">TRƯỞNG BAN QLCL & ATTP</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Đội trưởng Đội ATTP (FSMS)</div>
          </td>
        </tr>
      </table>

      <div class="footer-note">
        WCERT FSMS • HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM ISO 22000:2018 (BM03-KSTL)
      </div>
    </body>
    </html>
  `;
}

/**
 * 6. In Danh Mục Hồ Sơ Lưu Trữ (BM01-KSHS - QT-KSHS)
 */
export function generateRecordRetentionMasterListHtml(records: RecordRetention[]): string {
  const rows = records
    .map(
      (r, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td style="font-family: monospace; font-weight: bold; color: #1e40af;">${r.record_code}</td>
      <td style="font-weight: bold;">${r.record_name}</td>
      <td>${r.department}</td>
      <td>${r.storage_location}</td>
      <td style="text-align: center; font-weight: bold;">${r.retention_period}</td>
      <td>${r.responsible_person || "Trưởng Đơn vị"}</td>
      <td style="font-size: 8pt;">${r.disposal_method || "Máy cắt vụn & Xóa số"}</td>
      <td style="text-align: center;">
        <span class="badge" style="background-color: ${
          r.status === "RETAINED"
            ? "#ecfdf5; color: #047857; border-color: #a7f3d0;"
            : r.status === "READY_FOR_DISPOSAL"
              ? "#fffbeb; color: #b45309; border-color: #fde68a;"
              : "#eff6ff; color: #1d4ed8; border-color: #bfdbfe;"
        }">
          ${
            r.status === "RETAINED"
              ? "Đang lưu trữ"
              : r.status === "READY_FOR_DISPOSAL"
                ? "Chờ tiêu hủy"
                : "Đã tiêu hủy"
          }
        </span>
      </td>
    </tr>
  `,
    )
    .join("");

  const minRows = 5;
  let emptyRows = "";
  if (records.length < minRows) {
    for (let i = records.length + 1; i <= minRows; i++) {
      emptyRows += `
        <tr>
          <td style="text-align: center; color: #94a3b8;">${i}</td>
          <td style="text-align: center; color: #cbd5e1;">---</td>
          <td style="color: #cbd5e1; font-style: italic;">(Dòng trống chờ cập nhật hồ sơ)</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>
      `;
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Danh Mục Hồ Sơ Lưu Trữ - BM01-KSHS</title>
      ${PRINT_CSS}
      <style>
        @page { size: A4 landscape; margin: 10mm 12mm; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 28%; text-align: left; padding: 6px 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${LOGO_BASE64}" style="height: 46px; width: auto; object-fit: contain;" alt="Logo" />
              <div>
                <div class="company-title">CÔNG TY CP CHẾ BIẾN THỰC PHẨM WCERT</div>
                <div class="company-sub">Ban Quản lý CL & ATTP (FSMS)</div>
              </div>
            </div>
          </td>
          <td style="width: 48%; text-align: center;">
            <h1 class="form-title">DANH MỤC HỒ SƠ LƯU TRỮ VÀ TIÊU HỦY</h1>
            <div class="form-sub">(RECORDS RETENTION MASTER LIST - QT-KSHS)</div>
          </td>
          <td style="width: 24%;">
            <div class="meta-text"><b>Mã số:</b> BM01-KSHS</div>
            <div class="meta-text"><b>Lần BH:</b> 01</div>
            <div class="meta-text"><b>Ngày BH:</b> 01/06/2023</div>
            <div class="meta-text"><b>Trang:</b> 1/1</div>
          </td>
        </tr>
      </table>

      <!-- Bảng danh mục: các cột cộng lại đúng 100% (4+12+24+11+13+8+10+9+9 = 100%) -->
      <table class="content-table">
        <thead>
          <tr>
            <th style="width: 4%;">STT</th>
            <th style="width: 12%;">Số hiệu hồ sơ</th>
            <th style="width: 24%;">Tên hồ sơ ghi chép</th>
            <th style="width: 11%;">Đơn vị lưu</th>
            <th style="width: 13%;">Vị trí / Nơi lưu</th>
            <th style="width: 8%;">Thời gian</th>
            <th style="width: 10%;">Người giữ</th>
            <th style="width: 9%;">Phương pháp hủy</th>
            <th style="width: 9%;">Tình trạng</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${emptyRows}
        </tbody>
      </table>

      <table class="sign-table">
        <tr>
          <td style="width: 33.33%;">
            <div class="sign-title">NGƯỜI LẬP BIỂU</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Cán bộ Quản lý hồ sơ</div>
          </td>
          <td style="width: 33.33%;">
            <div class="sign-title">TRƯỞNG BỘ PHẬN / ĐƠN VỊ</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Trưởng đơn vị liên quan</div>
          </td>
          <td style="width: 33.34%;">
            <div class="sign-title">BAN GIÁM ĐỐC / ĐỘI TRƯỞNG FSMS</div>
            <div class="sign-role">(Ký & đóng dấu)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Phê duyệt hệ thống</div>
          </td>
        </tr>
      </table>

      <div class="footer-note">
        WCERT FSMS • HỆ THỐNG QUẢN LÝ AN TOÀN THỰC PHẨM ISO 22000:2018 (BM01-KSHS)
      </div>
    </body>
    </html>
  `;
}
