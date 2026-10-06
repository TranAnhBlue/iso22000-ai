/**
 * dmsPrintHelpers.ts
 * Các mẫu in HTML chuẩn ISO 22000:2018 cho Quy trình Kiểm soát Tài liệu (QT-01-KSTL An Giang):
 * - BM01-KSTL: Phiếu yêu cầu xem xét tài liệu
 * - BM02-KSTL: Thông báo thay đổi & Sổ phân phối tài liệu
 * - BM03-KSTL: Danh mục tài liệu nội bộ
 * - BM04-KSTL: Danh mục tài liệu nguồn gốc bên ngoài
 * - BM05-KSTL: Kế hoạch & Báo cáo soát xét tài liệu định kỳ 3 năm
 */

import {
  DocumentItem,
  DocumentChangeRequest,
  DocumentDistribution,
  ExternalDocument,
  PeriodicReviewItem,
  RecordRetention,
} from "@/routes/documents";

const PRINT_CSS = `
  <style>
    @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
    @page landscape { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 13px; line-height: 1.4; color: #111; margin: 0; padding: 0; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .header-table td { border: 1px solid #000; padding: 6px 10px; vertical-align: middle; }
    .company-title { font-weight: bold; font-size: 11px; text-transform: uppercase; }
    .form-title { font-weight: bold; font-size: 15px; text-align: center; text-transform: uppercase; }
    .meta-text { font-size: 11px; line-height: 1.3; }
    .section-title { font-weight: bold; font-size: 13px; margin: 12px 0 6px 0; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 2px; }
    .content-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
    .content-table th, .content-table td { border: 1px solid #000; padding: 6px 8px; font-size: 12px; }
    .content-table th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
    .sign-table { width: 100%; border-collapse: collapse; margin-top: 25px; page-break-inside: avoid; }
    .sign-table td { border: none; text-align: center; vertical-align: top; padding: 10px; width: 33.33%; }
    .sign-title { font-weight: bold; text-transform: uppercase; font-size: 12px; margin-bottom: 5px; }
    .sign-role { font-style: italic; font-size: 11px; color: #555; }
    .sign-space { height: 70px; }
    .sign-name { font-weight: bold; font-size: 13px; }
    .badge { display: inline-block; padding: 2px 6px; font-size: 11px; border-radius: 3px; font-weight: bold; border: 1px solid #666; }
    .landscape-table { page: landscape; }
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
          <td style="width: 25%; text-align: center;">
            <div class="company-title">CÔNG TY TNHH MTV TM-DV AN GIANG</div>
            <div style="font-size: 10px; margin-top: 4px;">HỆ THỐNG FSMS - ISO 22000:2018</div>
          </td>
          <td style="width: 50%; text-align: center;">
            <div class="form-title">PHIẾU YÊU CẦU XEM XÉT TÀI LIỆU</div>
            <div style="font-size: 11px; margin-top: 4px;">(DOCUMENT CHANGE REQUEST)</div>
          </td>
          <td style="width: 25%;">
            <div class="meta-text"><b>Mã số:</b> BM01-KSTL</div>
            <div class="meta-text"><b>Lần BH:</b> 01</div>
            <div class="meta-text"><b>Ngày BH:</b> 01/06/2023</div>
            <div class="meta-text"><b>Trang:</b> 1/1</div>
          </td>
        </tr>
      </table>

      <div style="margin-bottom: 12px; font-size: 13px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; padding: 4px 0;"><b>Mã phiếu yêu cầu:</b> <span style="font-family: monospace; font-weight: bold; font-size: 14px;">${cr.request_code}</span></td>
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
          <td style="width: 25%; font-weight: bold; background-color: #f9f9f9;">Mã hiệu tài liệu</td>
          <td style="width: 25%; font-family: monospace; font-weight: bold;">${cr.doc_code || "Chưa có (Soạn mới)"}</td>
          <td style="width: 25%; font-weight: bold; background-color: #f9f9f9;">Hình thức yêu cầu</td>
          <td style="width: 25%; font-weight: bold; color: #1e40af;">${changeTypeLabel}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f9f9f9;">Tên tài liệu</td>
          <td colspan="3" style="font-weight: bold; font-size: 13px;">${cr.doc_title}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; background-color: #f9f9f9;">Thời hạn mong muốn hoàn thành</td>
          <td>${cr.target_completion_date || "Theo tiến độ kế hoạch"}</td>
          <td style="font-weight: bold; background-color: #f9f9f9;">Cán bộ được phân công soạn thảo</td>
          <td>${cr.assigned_drafter || cr.requested_by_name}</td>
        </tr>
      </table>

      <div class="section-title">2. LÝ DO VÀ SỰ CẦN THIẾT PHẢI SOẠN MỚI / SỬA ĐỔI</div>
      <div style="border: 1px solid #000; padding: 10px; min-height: 70px; margin-bottom: 12px; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${cr.reason}</div>

      <div class="section-title">3. TÓM TẮT NỘI DUNG DỰ KIẾN SOẠN THẢO / SỬA ĐỔI</div>
      <div style="border: 1px solid #000; padding: 10px; min-height: 80px; margin-bottom: 15px; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${cr.proposed_content || "Đính kèm bản thảo chi tiết."}</div>

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
          <tr style="height: 120px; vertical-align: top;">
            <td>
              <div style="font-weight: bold; margin-bottom: 4px;">
                Ý kiến: ${cr.dept_head_opinion === "AGREE" ? "☑ ĐỒNG Ý" : cr.dept_head_opinion === "DISAGREE" ? "☒ KHÔNG ĐỒNG Ý" : "☐ Đang chờ ý kiến"}
              </div>
              <div style="font-size: 11px; margin-top: 4px;"><b>Nhận xét:</b> ${cr.dept_head_comment || "---"}</div>
              <div style="margin-top: 35px; text-align: center;">
                <div style="font-weight: bold;">${cr.dept_head_signer_name || ""}</div>
                <div style="font-size: 10px; color: #555;">${cr.dept_head_signed_at ? new Date(cr.dept_head_signed_at).toLocaleDateString("vi-VN") : ""}</div>
              </div>
            </td>
            <td>
              <div style="font-weight: bold; margin-bottom: 4px;">
                Ý kiến: ${cr.qa_head_opinion === "AGREE" ? "☑ ĐỒNG Ý" : cr.qa_head_opinion === "DISAGREE" ? "☒ KHÔNG ĐỒNG Ý" : "☐ Đang chờ xem xét"}
              </div>
              <div style="font-size: 11px; margin-top: 4px;"><b>Nhận xét:</b> ${cr.qa_head_comment || "---"}</div>
              <div style="margin-top: 35px; text-align: center;">
                <div style="font-weight: bold;">${cr.qa_head_signer_name || ""}</div>
                <div style="font-size: 10px; color: #555;">${cr.qa_head_signed_at ? new Date(cr.qa_head_signed_at).toLocaleDateString("vi-VN") : ""}</div>
              </div>
            </td>
            <td>
              <div style="font-weight: bold; margin-bottom: 4px;">
                Phê duyệt: ${cr.director_approval === "APPROVED" ? "☑ PHÊ DUYỆT" : cr.director_approval === "REJECTED" ? "☒ TỪ CHỐI" : "☐ Đang chờ phê duyệt"}
              </div>
              <div style="font-size: 11px; margin-top: 4px;"><b>Chỉ đạo:</b> ${cr.director_comment || "---"}</div>
              <div style="margin-top: 35px; text-align: center;">
                <div style="font-weight: bold;">${cr.director_signer_name || ""}</div>
                <div style="font-size: 10px; color: #555;">${cr.director_signed_at ? new Date(cr.director_signed_at).toLocaleDateString("vi-VN") : ""}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 15px; font-size: 11px; font-style: italic; color: #555; text-align: right;">
        In từ Hệ thống Phần mềm Quản lý ISO 22000:2018 - Ngày in: ${new Date().toLocaleDateString("vi-VN")}
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
          <td style="width: 25%; text-align: center;">
            <div class="company-title">CÔNG TY TNHH MTV TM-DV AN GIANG</div>
            <div style="font-size: 10px; margin-top: 4px;">HỆ THỐNG FSMS - ISO 22000:2018</div>
          </td>
          <td style="width: 50%; text-align: center;">
            <div class="form-title">THÔNG BÁO THAY ĐỔI & PHÂN PHỐI TÀI LIỆU</div>
            <div style="font-size: 11px; margin-top: 4px;">(DOCUMENT DISTRIBUTION NOTICE)</div>
          </td>
          <td style="width: 25%;">
            <div class="meta-text"><b>Mã số:</b> BM02-KSTL</div>
            <div class="meta-text"><b>Lần BH:</b> 01</div>
            <div class="meta-text"><b>Ngày BH:</b> 01/06/2023</div>
            <div class="meta-text"><b>Trang:</b> 1/1</div>
          </td>
        </tr>
      </table>

      <div style="margin-bottom: 12px; font-size: 13px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; padding: 4px 0;"><b>Mã thông báo:</b> <span style="font-family: monospace; font-weight: bold; font-size: 14px;">${dist.notice_code}</span></td>
            <td style="width: 50%; padding: 4px 0;"><b>Ngày phát hành:</b> ${dist.distribution_date}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><b>Cán bộ phân phối (Doc Controller):</b> ${dist.distributed_by_name}</td>
            <td style="padding: 4px 0;"><b>Nơi nhận (Đơn vị áp dụng):</b> <span style="font-weight: bold;">${dist.department_recipient}</span></td>
          </tr>
        </table>
      </div>

      <div class="section-title">1. DANH MỤC VĂN BẢN PHÂN PHỐI</div>
      <table class="content-table">
        <thead>
          <tr>
            <th style="width: 15%;">Mã hiệu</th>
            <th style="width: 40%;">Tên tài liệu / quy trình</th>
            <th style="width: 10%;">Phiên bản</th>
            <th style="width: 15%;">Ngày hiệu lực</th>
            <th style="width: 20%;">Hình thức phân phối</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-family: monospace; font-weight: bold; text-align: center;">${dist.doc_code}</td>
            <td style="font-weight: bold;">${dist.doc_title}</td>
            <td style="text-align: center; font-weight: bold;">v${dist.version}</td>
            <td style="text-align: center;">${dist.effective_date}</td>
            <td style="text-align: center;">${methodText} (SL: ${dist.copy_number})</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">2. TÓM TẮT NỘI DUNG SỬA ĐỔI / THAY THẾ CHÍNH</div>
      <div style="border: 1px solid #000; padding: 10px; min-height: 80px; margin-bottom: 15px; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${dist.change_summary || "Ban hành áp dụng theo quyết định của Ban Tổng Giám đốc."}</div>

      <div class="section-title">3. XÁC NHẬN KÝ NHẬN & THU HỒI TÀI LIỆU HẾT HIỆU LỰC</div>
      <table class="content-table">
        <thead>
          <tr>
            <th style="width: 50%;">KÝ NHẬN CỦA ĐƠN VỊ SỬ DỤNG</th>
            <th style="width: 50%;">THU HỒI TÀI LIỆU LỖI THỜI / HẾT HIỆU LỰC</th>
          </tr>
        </thead>
        <tbody>
          <tr style="height: 130px; vertical-align: top;">
            <td>
              <p style="margin: 0 0 6px 0;">Đơn vị đã tiếp nhận đầy đủ tài liệu, phổ biến cho toàn thể CBCNV có liên quan và cam kết tuân thủ nghiêm ngặt.</p>
              <div style="margin-top: 10px;">
                <b>Tình trạng:</b> ${dist.acknowledged ? "☑ ĐÃ TIẾP NHẬN & KÝ DUYỆT" : "☐ CHƯA KÝ NHẬN"}
              </div>
              <div style="margin-top: 25px; text-align: center;">
                <div style="font-weight: bold;">${dist.acknowledged_by_name || "...................................................."}</div>
                <div style="font-size: 10px; color: #555;">${dist.acknowledged_at ? new Date(dist.acknowledged_at).toLocaleDateString("vi-VN") : "Ngày: ...... / ...... / 202..."}</div>
              </div>
            </td>
            <td>
              <p style="margin: 0 0 6px 0;">Tất cả các bản in/tài liệu phiên bản cũ trước đó phải được thu hồi và đóng dấu <b>"HẾT HIỆU LỰC" (OBSOLETE)</b> để tránh vô tình sử dụng.</p>
              <div style="margin-top: 10px;">
                <b>Tình trạng thu hồi:</b> ${dist.obsolete_copy_retrieved ? "☑ ĐÃ THU HỒI & ĐÓNG DẤU" : "☐ CHƯA THU HỒI"}
              </div>
              <div style="margin-top: 4px; font-size: 11px;"><b>Ghi chú:</b> ${dist.notes || "---"}</div>
              <div style="margin-top: 25px; text-align: center;">
                <div style="font-weight: bold;">Cán bộ kiểm soát tài liệu</div>
                <div style="font-size: 10px; color: #555;">${dist.retrieval_date || "Ngày: ...... / ...... / 202..."}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 15px; font-size: 11px; font-style: italic; color: #555; text-align: right;">
        In từ Hệ thống Phần mềm Quản lý ISO 22000:2018 - Ngày in: ${new Date().toLocaleDateString("vi-VN")}
      </div>
    </body>
    </html>
  `;
}

/**
 * 3. In Danh Mục Tài Liệu Nguồn Gốc Bên Ngoài (BM04-KSTL)
 */
export function generateExternalDocsHtml(docs: ExternalDocument[]): string {
  const rows = docs
    .map((d, index) => {
      const categoryName =
        d.category === "LAW_REGULATION"
          ? "Văn bản QPPL / Nghị định"
          : d.category === "STANDARD_TCVN_ISO"
            ? "Tiêu chuẩn ISO / TCVN / Codex"
            : d.category === "TECHNICAL_SPEC_CUSTOMER"
              ? "Tiêu chuẩn Kỹ thuật / Khách hàng"
              : "Hướng dẫn ngành";

      const statusBadge =
        d.status === "EFFECTIVE"
          ? "<span style='color: green; font-weight: bold;'>Còn hiệu lực</span>"
          : d.status === "SUPERSEDED"
            ? `<span style='color: red; font-weight: bold;'>Đã thay thế (bởi ${d.superseded_by || "VB mới"})</span>`
            : "<span style='color: gray; font-weight: bold;'>Hết hiệu lực</span>";

      return `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td style="font-family: monospace; font-weight: bold;">${d.doc_code}</td>
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

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Danh Mục Tài Liệu Nguồn Gốc Bên Ngoài - BM04-KSTL</title>
      ${PRINT_CSS}
      <style>
        @page { size: A4 landscape; margin: 10mm; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 25%; text-align: center;">
            <div class="company-title">CÔNG TY TNHH MTV TM-DV AN GIANG</div>
            <div style="font-size: 10px; margin-top: 4px;">HỆ THỐNG FSMS - ISO 22000:2018</div>
          </td>
          <td style="width: 50%; text-align: center;">
            <div class="form-title">DANH MỤC TÀI LIỆU NGUỒN GỐC BÊN NGOÀI</div>
            <div style="font-size: 11px; margin-top: 4px;">(EXTERNAL DOCUMENTS REGISTER - ISO 22000:2018 Mục 7.5.3.2)</div>
          </td>
          <td style="width: 25%;">
            <div class="meta-text"><b>Mã số:</b> BM04-KSTL</div>
            <div class="meta-text"><b>Lần BH:</b> 01</div>
            <div class="meta-text"><b>Ngày BH:</b> 01/06/2023</div>
            <div class="meta-text"><b>Trang:</b> 1/1</div>
          </td>
        </tr>
      </table>

      <table class="content-table">
        <thead>
          <tr>
            <th style="width: 3%;">STT</th>
            <th style="width: 14%;">Mã hiệu văn bản</th>
            <th style="width: 27%;">Tên văn bản / Tiêu chuẩn quy chuẩn</th>
            <th style="width: 14%;">Phân loại</th>
            <th style="width: 14%;">Cơ quan ban hành</th>
            <th style="width: 8%;">Ngày hiệu lực</th>
            <th style="width: 8%;">Tình trạng</th>
            <th style="width: 12%;">Đơn vị theo dõi</th>
            <th style="width: 8%;">Rà soát gần nhất</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <table class="sign-table">
        <tr>
          <td>
            <div class="sign-title">NGƯỜI LẬP DANH MỤC</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Nguyễn Văn Đạt (Kỹ sư QA)</div>
          </td>
          <td></td>
          <td>
            <div class="sign-title">TRƯỞNG BAN QLCL & ATTP</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Trần Anh (Đội trưởng FSMS)</div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export const generateExternalDocMasterListHtml = generateExternalDocsHtml;

/**
 * 4. In Kế Hoạch & Báo Cáo Soát Xét Định Kỳ 3 Năm (BM05-KSTL)
 */

export function generatePeriodicReviewsHtml(reviews: PeriodicReviewItem[]): string {
  const rows = reviews
    .map((r, index) => {
      const statusText =
        r.review_status === "OVERDUE"
          ? "<span style='color: red; font-weight: bold;'>QUÁ HẠN SOÁT XÉT</span>"
          : r.review_status === "DUE_SOON"
            ? `<span style='color: orange; font-weight: bold;'>SẮP ĐẾN HẠN (Còn ${r.days_remaining} ngày)</span>`
            : "<span style='color: green; font-weight: bold;'>CÒN HIỆU LỰC</span>";

      return `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td style="font-family: monospace; font-weight: bold;">${r.doc_code}</td>
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

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Kế Hoạch & Báo Cáo Soát Xét Tài Liệu Định Kỳ 3 Năm - BM05-KSTL</title>
      ${PRINT_CSS}
      <style>
        @page { size: A4 landscape; margin: 10mm; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 25%; text-align: center;">
            <div class="company-title">CÔNG TY TNHH MTV TM-DV AN GIANG</div>
            <div style="font-size: 10px; margin-top: 4px;">HỆ THỐNG FSMS - ISO 22000:2018</div>
          </td>
          <td style="width: 50%; text-align: center;">
            <div class="form-title">KẾ HOẠCH & BÁO CÁO SOÁT XÉT TÀI LIỆU ĐỊNH KỲ 3 NĂM</div>
            <div style="font-size: 11px; margin-top: 4px;">(3-YEAR DOCUMENT PERIODIC REVIEW SCHEDULE - ISO 22000:2018)</div>
          </td>
          <td style="width: 25%;">
            <div class="meta-text"><b>Mã số:</b> BM05-KSTL</div>
            <div class="meta-text"><b>Lần BH:</b> 01</div>
            <div class="meta-text"><b>Ngày BH:</b> 01/06/2023</div>
            <div class="meta-text"><b>Trang:</b> 1/1</div>
          </td>
        </tr>
      </table>

      <div style="margin-bottom: 8px; font-size: 12px; font-style: italic;">
        * Căn cứ Mục 7.5.3 ISO 22000:2018 và Quy trình Kiểm soát Tài liệu QT-01-KSTL: Định kỳ 03 năm kể từ ngày có hiệu lực, các tài liệu phải được các đơn vị liên quan soát xét lại. Nếu không có thay đổi, lập xác nhận BM05 để tiếp tục duy trì hiệu lực thêm chu kỳ 3 năm tiếp theo.
      </div>

      <table class="content-table">
        <thead>
          <tr>
            <th style="width: 3%;">STT</th>
            <th style="width: 13%;">Mã tài liệu</th>
            <th style="width: 28%;">Tên tài liệu / Quy trình</th>
            <th style="width: 8%;">Phân loại</th>
            <th style="width: 14%;">Đơn vị phụ trách</th>
            <th style="width: 6%;">Phiên bản</th>
            <th style="width: 9%;">Ngày ban hành</th>
            <th style="width: 9%;">Soát xét gần nhất</th>
            <th style="width: 9%;">Hạn soát xét tiếp theo</th>
            <th style="width: 11%;">Tình trạng</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <table class="sign-table">
        <tr>
          <td>
            <div class="sign-title">NGƯỜI LẬP KẾ HOẠCH</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Nguyễn Văn Đạt (Kỹ sư QA)</div>
          </td>
          <td>
            <div class="sign-title">TRƯỞNG BAN QLCL & ATTP</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Trần Anh (Đội trưởng FSMS)</div>
          </td>
          <td>
            <div class="sign-title">TỔNG GIÁM ĐỐC PHÊ DUYỆT</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Lê Hoàng Phúc (Tổng Giám Đốc)</div>
          </td>
        </tr>
      </table>
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
      <td style="font-family: monospace; font-weight: bold;">${d.doc_code}</td>
      <td style="font-weight: bold;">${d.doc_title}</td>
      <td style="text-align: center;">${d.doc_type}</td>
      <td>${d.department || "Ban QLCL"}</td>
      <td style="text-align: center; font-weight: bold;">v${d.current_version}</td>
      <td style="text-align: center;">${d.effective_date || "---"}</td>
      <td style="text-align: center;">${d.status === "APPROVED" ? "Đã ban hành" : "Dự thảo"}</td>
      <td style="text-align: center;">${d.security_level || "INTERNAL"}</td>
      <td style="text-align: center;">${d.review_due_date || "---"}</td>
    </tr>
  `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Danh Mục Tài Liệu Nội Bộ - BM03-KSTL</title>
      ${PRINT_CSS}
      <style>
        @page { size: A4 landscape; margin: 10mm; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 25%; text-align: center;">
            <div class="company-title">CÔNG TY TNHH MTV TM-DV AN GIANG</div>
            <div style="font-size: 10px; margin-top: 4px;">HỆ THỐNG FSMS - ISO 22000:2018</div>
          </td>
          <td style="width: 50%; text-align: center;">
            <div class="form-title">DANH MỤC TÀI LIỆU NỘI BỘ HỆ THỐNG FSMS</div>
            <div style="font-size: 11px; margin-top: 4px;">(INTERNAL MASTER DOCUMENT LIST - ISO 22000:2018)</div>
          </td>
          <td style="width: 25%;">
            <div class="meta-text"><b>Mã số:</b> BM03-KSTL</div>
            <div class="meta-text"><b>Lần BH:</b> 01</div>
            <div class="meta-text"><b>Ngày BH:</b> 01/06/2023</div>
            <div class="meta-text"><b>Trang:</b> 1/1</div>
          </td>
        </tr>
      </table>

      <table class="content-table">
        <thead>
          <tr>
            <th style="width: 3%;">STT</th>
            <th style="width: 14%;">Mã hiệu</th>
            <th style="width: 30%;">Tên tài liệu / Quy trình</th>
            <th style="width: 7%;">Cấp</th>
            <th style="width: 14%;">Đơn vị soạn thảo</th>
            <th style="width: 6%;">Phiên bản</th>
            <th style="width: 8%;">Ngày hiệu lực</th>
            <th style="width: 8%;">Tình trạng</th>
            <th style="width: 6%;">Bảo mật</th>
            <th style="width: 9%;">Hạn soát xét 3 năm</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <table class="sign-table">
        <tr>
          <td>
            <div class="sign-title">NGƯỜI LẬP BIỂU</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Nguyễn Văn Đạt (Doc Controller)</div>
          </td>
          <td></td>
          <td>
            <div class="sign-title">TRƯỞNG BAN QLCL & ATTP</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Trần Anh (Đội trưởng FSMS)</div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * 6. In Danh Mục Hồ Sơ Lưu Trữ (BM01-KSHS An Giang - QT-KSHS)
 */
export function generateRecordRetentionMasterListHtml(records: RecordRetention[]): string {
  const rows = records
    .map(
      (r, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td style="font-family: monospace; font-weight: bold;">${r.record_code}</td>
      <td style="font-weight: bold;">${r.record_name}</td>
      <td>${r.department}</td>
      <td>${r.storage_location}</td>
      <td style="text-align: center; font-weight: bold;">${r.retention_period}</td>
      <td>${r.responsible_person || "Trưởng Đơn vị"}</td>
      <td style="font-size: 11px;">${r.disposal_method || "Máy cắt vụn & Xóa số"}</td>
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
      <td style="font-size: 11px;">${r.notes || (r.disposal_minutes_code ? `BB: ${r.disposal_minutes_code}` : "")}</td>
    </tr>
  `,
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Danh Mục Hồ Sơ Lưu Trữ - BM01-KSHS</title>
      ${PRINT_CSS}
      <style>
        @page { size: A4 landscape; margin: 10mm; }
      </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td style="width: 25%; text-align: center;">
            <div class="company-title">CÔNG TY TNHH MTV TM-DV AN GIANG</div>
            <div style="font-size: 10px; margin-top: 4px;">HỆ THỐNG FSMS - ISO 22000:2018</div>
          </td>
          <td style="width: 50%; text-align: center;">
            <div class="form-title">DANH MỤC HỒ SƠ LƯU TRỮ VÀ TIÊU HỦY</div>
            <div style="font-size: 11px; margin-top: 4px;">(RECORDS RETENTION MASTER LIST - QT-KSHS AN GIANG)</div>
          </td>
          <td style="width: 25%;">
            <div class="meta-text"><b>Mã số:</b> BM01-KSHS</div>
            <div class="meta-text"><b>Lần BH:</b> 01</div>
            <div class="meta-text"><b>Ngày BH:</b> 01/06/2023</div>
            <div class="meta-text"><b>Trang:</b> 1/1</div>
          </td>
        </tr>
      </table>

      <table class="content-table">
        <thead>
          <tr>
            <th style="width: 3%;">STT</th>
            <th style="width: 11%;">Số hiệu</th>
            <th style="width: 23%;">Tên hồ sơ ghi chép</th>
            <th style="width: 13%;">Đơn vị lưu</th>
            <th style="width: 15%;">Vị trí / Nơi lưu</th>
            <th style="width: 9%;">Thời gian lưu</th>
            <th style="width: 10%;">Người giữ</th>
            <th style="width: 10%;">Phương pháp hủy</th>
            <th style="width: 8%;">Tình trạng</th>
            <th style="width: 8%;">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <table class="sign-table">
        <tr>
          <td>
            <div class="sign-title">NGƯỜI LẬP BIỂU</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Cán bộ Quản lý hồ sơ</div>
          </td>
          <td>
            <div class="sign-title">TRƯỞNG BỘ PHẬN / ĐƠN VỊ</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Trưởng đơn vị liên quan</div>
          </td>
          <td>
            <div class="sign-title">BAN GIÁM ĐỐC / ĐỘI TRƯỞNG FSMS</div>
            <div class="sign-role">(Ký & ghi rõ họ tên)</div>
            <div class="sign-space"></div>
            <div class="sign-name">Phê duyệt hệ thống</div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
