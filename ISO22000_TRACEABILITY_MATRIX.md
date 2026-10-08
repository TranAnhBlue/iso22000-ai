# Ma trận truy vết tài liệu An Giang và hệ thống FSMS

Tài liệu này đối chiếu bộ tài liệu mẫu An Giang trong thư mục `Hệ thống tài liệu ISO 22000 (Mẫu) An Giang` với chức năng hiện có. Mục tiêu là hỗ trợ UAT và xác định phạm vi cần xác nhận tại doanh nghiệp; không thay thế việc phê duyệt quy trình, biểu mẫu và giới hạn kiểm soát do doanh nghiệp ban hành.

## Quy ước trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| Có chức năng | Có model, API và giao diện hoặc API vận hành tương ứng. |
| Cần UAT | Đã có chức năng nhưng phải xác nhận bằng dữ liệu/quy trình thực tế. |
| Cần cấu hình | Doanh nghiệp phải nạp tài liệu, giới hạn, danh mục hoặc người có thẩm quyền thật. |
| Khoảng trống | Chưa xác nhận đầy đủ hoặc chưa có cơ chế chuyên biệt; không được tuyên bố tuân thủ tuyệt đối. |

## Ma trận đối chiếu

| Tài liệu An Giang | Yêu cầu nghiệp vụ cần kiểm soát | Phân hệ/API | Trạng thái | Điểm cần xác nhận UAT |
|---|---|---|---|---|
| 00, 01 Sổ tay, chính sách, mục tiêu, quyết định | Chính sách, mục tiêu, đội ATTP, xem xét lãnh đạo | Dashboard, Organization | Có chức năng / Cần UAT | Người phê duyệt, chu kỳ MRM, KPI và bằng chứng họp. |
| 02 Kiểm soát tài liệu | Bản thảo, xem xét, phê duyệt, phát hành, thu hồi | Documents | Có chức năng / Cần UAT | Phân quyền Document Controller; danh sách phân phối; hiệu lực tài liệu. |
| 03 Kiểm soát hồ sơ | Nhận diện, thời hạn lưu, bảo quản, tiêu hủy có kiểm soát | Documents Retention, Inventory retained samples | Có chức năng / Cần UAT | Không xóa vật lý mẫu lưu; kiểm tra thời hạn và biên bản tiêu hủy. |
| 04 Đánh giá nội bộ và xử lý lỗi | Chương trình audit, finding, NC, CAPA, theo dõi hiệu lực | Audits, CAPA | Có chức năng / Cần UAT | Tính độc lập auditor, đóng finding/CAPA chỉ sau xác minh. |
| 05 Hoạch định và quản lý rủi ro | Bên quan tâm, rủi ro, xử lý và đánh giá hiệu lực | Organization, Change Management | Có chức năng / Cần UAT | Ma trận L×S, mức chấp nhận rủi ro và chủ sở hữu rủi ro. |
| 06 Kiểm soát sự không phù hợp | Phiếu CAR, correction, nguyên nhân, khắc phục, phòng ngừa | CAPA | Có chức năng / Cần UAT | Quy tắc severity, bằng chứng hiệu lực và thời hạn đóng. |
| 07 PRP | GMP, SSOP, vệ sinh, nước, hóa chất, dị nguyên, côn trùng | PRP/HACCP | Có chức năng / Cần UAT | Giới hạn thực tế nước/đá, tần suất và hành động khi không đạt. |
| 08 Kế hoạch HACCP | Lưu đồ, phân tích mối nguy, CCP/oPRP, giám sát, thẩm tra | HACCP | Có chức năng / Cần UAT | Thẩm định lưu đồ tại hiện trường và critical limits theo sản phẩm. |
| 09 Kiểm soát chất lượng quá trình | IQC, IPQC, máy dò kim loại, thành phẩm | Purchasing, HACCP | Có chức năng / Cần UAT | Chỉ tiêu, cỡ mẫu, tần suất và tiêu chí chấp nhận của từng công đoạn. |
| 11 Nhập xuất kho | Nhập/xuất, FEFO, lô, tồn kho, lưu mẫu | Inventory, Traceability | Có chức năng / Cần UAT | Không xuất lô HOLD/quá hạn; kiểm tra đối chiếu tồn thực tế. |
| 12 Mua hàng và đánh giá NCC | ASL, tiêu chí đánh giá, IQC và phê duyệt NCC | Purchasing | Có chức năng / Cần UAT | Bộ tiêu chí đúng nhóm hàng, ngưỡng xếp hạng và chu kỳ đánh giá. |
| 13 Ứng phó tình huống khẩn cấp | Kịch bản, liên hệ, diễn tập, sự cố, hành động sau diễn tập | Emergency, CAPA | Có chức năng / Cần UAT | Danh bạ thật, thời gian phản ứng, liên kết NC/CAPA khi diễn tập không đạt. |
| 14 Đào tạo | Nhu cầu, kế hoạch, tham dự, đánh giá sau đào tạo | Audits Training | Có chức năng / Cần UAT | Tiêu chí năng lực theo vị trí và hiệu lực đào tạo. |
| 15 Quản lý thiết bị SX và phương tiện | Bảo trì, hiệu chuẩn, kiểm tra xe | Equipment, Inventory | Có chức năng / Cần UAT | Danh mục thiết bị đo CCP, chu kỳ hiệu chuẩn, chứng thư, 5 tiêu chí xe. |
| 16 Hướng dẫn công việc | Hướng dẫn thao tác theo công đoạn | Documents, Builder | Cần cấu hình | Nạp WI đã duyệt, liên kết WI với SOP/CCP/công đoạn. |

## Kiểm soát đã tăng cường

1. Form và Workflow chỉ được sử dụng sau phê duyệt; chỉnh sửa nội dung sẽ đưa về `DRAFT`.
2. Người soạn không tự phê duyệt Form/Workflow.
3. Workflow instance lưu snapshot phiên bản để bảo toàn luồng/hồ sơ khi mẫu bị sửa.
4. Tệp DMS và chứng thư hiệu chuẩn lưu private trên Supabase Storage, tải qua backend có JWT.
5. Mẫu lưu không được xóa vật lý; tiêu hủy chỉ sau hạn lưu, bởi QA/Admin, với người/ngày/lý do và trạng thái `DISPOSED`.

## Khoảng trống cần xử lý trước chứng nhận

1. Chưa có bằng chứng rằng mọi critical limit, cỡ mẫu, chu kỳ và biểu mẫu số hóa đã được doanh nghiệp thẩm định/phê duyệt theo từng sản phẩm.
2. Cần phân quyền chi tiết hơn theo đơn vị/cơ sở nếu triển khai đa nhà máy.
3. Cần bổ sung SLA, nhắc hạn và escalation theo quy định nội bộ cho CAPA, tài liệu, hiệu chuẩn và workflow.
4. Cần thực hiện UAT có chữ ký và chạy diễn tập truy xuất/thu hồi bằng dữ liệu thật trước go-live.
5. AI chỉ là công cụ hỗ trợ; QA/Đội ATTP phải thẩm định và chịu trách nhiệm với mọi kết luận ATTP.

## Điều kiện nghiệm thu tối thiểu

- Toàn bộ case Critical trong `UAT_TEST_CASES.md` PASS có bằng chứng.
- Không có API nghiệp vụ không yêu cầu JWT, không có secret trong Git/frontend/log.
- Không xóa vật lý hồ sơ đã phát sinh hoặc đã phê duyệt.
- Tài liệu An Giang được nạp/đối chiếu và người có thẩm quyền quyết định tài liệu nào áp dụng.
- Critical limit, hành động khắc phục, người chịu trách nhiệm và chu kỳ kiểm soát được cấu hình theo sản phẩm/cơ sở thực tế.
