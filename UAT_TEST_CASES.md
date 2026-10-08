# Bộ test case UAT FSMS ISO 22000

## 1. Cách dùng

Thực hiện trên môi trường UAT có dữ liệu mẫu hoặc dữ liệu thử nghiệm. Không chạy các test xóa/sửa trên hồ sơ sản xuất. Ghi Kết quả thực tế, bằng chứng ảnh/chữ ký, người test và ngày test vào cột kết quả của biên bản UAT.

| Quy ước | Giá trị |
|---|---|
| PASS | Kết quả thực tế đúng hoàn toàn với kết quả mong đợi |
| FAIL | Sai kết quả, lỗi hệ thống, sai quyền hoặc mất dữ liệu |
| BLOCKED | Không thể test vì thiếu dữ liệu, quyền hoặc môi trường |

## 2. Tiền điều kiện chung

- Có tài khoản Admin, QA/QC, Sản xuất, Kho, Mua hàng, Bảo trì và Người xem.
- Có ít nhất một nhà cung cấp, lô nguyên liệu, mẻ sản xuất, CCP, thiết bị và tài liệu thử nghiệm.
- Người test biết cách đăng nhập lại khi nhận `401`; `401` không phải lỗi nếu request không có/đã hết JWT.

## 3. Test case

| ID | Phân hệ | Vai trò | Bước thực hiện | Kết quả mong đợi |
|---|---|---|---|---|
| AUTH-01 | Xác thực | Người dùng | Đăng nhập bằng tài khoản hợp lệ. | Nhận phiên/JWT, hiển thị đúng tên và quyền. |
| AUTH-02 | Xác thực | Người dùng | Đăng nhập sai mật khẩu. | Bị từ chối; không tạo phiên. |
| AUTH-03 | Xác thực | Người dùng | Gọi dashboard khi chưa đăng nhập hoặc đã xóa token. | API trả `401`; frontend đưa người dùng về đăng nhập, không lặp request vô hạn. |
| RBAC-01 | Tổ chức/RBAC | Admin | Tạo người dùng QA, gán phòng ban và role QA. Đăng nhập lại bằng tài khoản này. | QA xem được dữ liệu nghiệp vụ phù hợp nhưng không có quyền quản trị toàn hệ thống. |
| RBAC-02 | Tổ chức/RBAC | Người xem | Thử tạo tài liệu hoặc sửa CCP. | Nút bị ẩn hoặc API trả `403`; dữ liệu không đổi. |
| ORG-01 | Bối cảnh | QA | Tạo bên quan tâm gồm nhu cầu, yêu cầu luật định, cách theo dõi và tần suất. | Bản ghi hiển thị lại đầy đủ khi lọc/tải lại. |
| ORG-02 | Rủi ro | QA | Tạo rủi ro có khả năng, mức độ, biện pháp và ngày hạn; sau đó đánh giá hiệu lực. | Điểm rủi ro và trạng thái được cập nhật; lưu lịch sử/nhận xét hiệu lực. |
| ORG-03 | Đội ATTP | Admin/QA | Thêm thành viên đội ATTP có vai trò, năng lực và số quyết định. | Thành viên xuất hiện trong danh sách, không trùng dữ liệu bắt buộc. |
| DASH-01 | Dashboard | QA | Mở dashboard với dữ liệu CAPA/thiết bị/tài liệu chờ duyệt. | Cảnh báo hiển thị không lỗi `Document.document_code`; link điều hướng đúng phân hệ. |
| DASH-02 | Mục tiêu | QA | Tạo mục tiêu có mã duy nhất, chỉ tiêu và năm áp dụng; thử tạo lại mã cũ. | Mục tiêu đầu được lưu; mã trùng bị từ chối. |
| DASH-03 | MRM | Lãnh đạo | Tạo MRM, thêm đầu vào và hành động; phê duyệt; thử sửa/xóa. | MRM `APPROVED` bị khóa sửa/xóa; theo dõi được hạn của hành động. |
| DMS-01 | Tài liệu | QA | Tạo SOP ở trạng thái bản thảo, tải file đính kèm và tải lại file. | File tải được, metadata/phiên bản đúng. |
| DMS-02 | Thay đổi tài liệu | QA/Lãnh đạo | Tạo yêu cầu sửa đổi; thực hiện review trưởng đơn vị, QA, lãnh đạo theo thứ tự. | Chỉ chuyển đúng trạng thái kế tiếp; có lịch sử người duyệt và thời điểm. |
| DMS-03 | Phân phối | Document Controller | Phân phối SOP cho một người nhận, xác nhận nhận và thu hồi bản cũ. | Ghi nhận đúng người nhận, thời điểm xác nhận và trạng thái thu hồi. |
| DMS-04 | Lưu giữ hồ sơ | QA | Tạo danh mục hồ sơ; thử đặt thẳng `DISPOSED`; sau đó tiêu hủy bằng hội đồng, mã biên bản và xác nhận hết hạn. | Chuyển thẳng bị chặn; luồng tiêu hủy hợp lệ mới thành công. |
| DMS-05 | Tài liệu An Giang | QA | Mở một tài liệu mã `AG-*`, kiểm tra link file và trạng thái. | File nguồn tải được; trạng thái ban đầu `PENDING_APPROVAL`, không tự được xem là hiệu lực. |
| CHANGE-01 | Thay đổi 4M | QA | Tạo thay đổi thiết bị/công thức, nêu ảnh hưởng HACCP và biện pháp. | Phiếu lưu được; không thể đánh dấu hoàn tất khi thiếu thông tin bắt buộc. |
| CHANGE-02 | Hiệu lực thay đổi | QA/Lãnh đạo | Duyệt, triển khai và thực hiện verify effectiveness. | Trạng thái/biên bản hiệu lực được lưu; thay đổi không hiệu lực còn hành động mở. |
| PUR-01 | NCC | Mua hàng | Tạo NCC, nhập chứng nhận và rủi ro; duyệt NCC. | NCC được lưu, trạng thái hiển thị đúng. |
| PUR-02 | Đánh giá NCC | QA/Mua hàng | Lập kế hoạch; nhập điểm tiêu chí; lưu phiếu. | Tổng điểm, xếp hạng A/B/C/D và kết luận được tính/lưu nhất quán. |
| PUR-03 | IQC đạt | QC | Tạo lô chờ IQC, lập phiếu đạt. | Lô chuyển trạng thái chấp nhận/được phép dùng theo quy tắc hệ thống. |
| PUR-04 | IQC không đạt | QC | Lập IQC không đạt hoặc cách ly. | Lô thành `REJECTED`/`QUARANTINE`; không được cấp cho sản xuất. |
| HACCP-01 | Kế hoạch/lưu đồ | QA | Tạo kế hoạch, công đoạn theo thứ tự và lưu workflow. | Lưu đồ/công đoạn hiển thị đúng thứ tự, không mất dữ liệu khi tải lại. |
| HACCP-02 | Mối nguy/CCP | QA | Tạo mối nguy B/C/P/A và CCP có critical limit. | Điểm rủi ro/kết luận và CCP được lưu đúng. |
| HACCP-03 | CCP trong ngưỡng | QC | Ghi log có giá trị trong giới hạn. | Log `NORMAL/PASS`; mẻ không bị HOLD. |
| HACCP-04 | CCP lệch ngưỡng | QC/QA | Ghi log vượt giới hạn cho mẻ có liên kết kho. | Log `CRITICAL/DEVIATION`, mẻ/lô bị HOLD và NC được tạo hoặc liên kết. |
| HACCP-05 | Phê duyệt/thẩm tra | Đội ATTP | Phê duyệt kế hoạch rồi thẩm tra với phiên bản mới. | Có bản ghi review; phiên bản và người phê duyệt đúng. |
| PRP-01 | Checklist PRP | QC/Sản xuất | Tạo checklist có một mục không đạt và hành động khắc phục. | Tỷ lệ tuân thủ được tính; trạng thái cần hành động, không thể hiện đạt giả. |
| PRP-02 | Nước/đá | QC/Bảo trì | Ghi phiếu nước pH bình thường nhưng clo 1.1 hoặc E. coli > 0. | `overall_status` tự là `FAIL`. |
| PRP-03 | Nước/chất thải trùng mã | QA | Tạo hai phiếu có cùng mã nước hoặc mã chất thải. | Lần thứ hai bị từ chối `409`; không sinh bản ghi trùng. |
| PRP-04 | Hóa chất/môi trường | QA | Thêm hóa chất có MSDS và lịch quan trắc; thử thêm mã trùng. | Bản ghi hợp lệ lưu; mã trùng bị từ chối. |
| EQ-01 | Thiết bị | Bảo trì | Tạo thiết bị, lịch bảo trì và nhật ký hoàn thành. | Lý lịch/nhật ký liên kết đúng thiết bị và hiện ở danh sách. |
| EQ-02 | Hiệu chuẩn | Bảo trì/QA | Tạo hiệu chuẩn sắp hết hạn, tải chứng thư. | Cảnh báo đến hạn hiển thị; chứng thư truy cập được. |
| EQ-03 | Phương tiện | Kho/QC | Tạo kiểm tra xe với một điều kiện không đạt. | Kết quả tự `FAIL/REJECTED`; không bị chuyển thành PASS. |
| INV-01 | Kho/FEFO | Kho | Tạo hai lô cùng hàng khác hạn dùng, mở đề xuất xuất kho. | Lô hết hạn gần hơn được ưu tiên; lô HOLD không được đề xuất xuất. |
| INV-02 | Mẫu lưu | QC | Tạo mẫu lưu, thử đặt expiry trước sample date. | Dữ liệu ngày không hợp lệ bị chặn. |
| INV-02A | Tiêu hủy mẫu lưu | QA | Thử xóa mẫu lưu; sau đó tiêu hủy mẫu đã hết hạn với lý do. | Xóa vật lý trả `409`; chỉ QA/Admin được tiêu hủy mẫu hết hạn, có người/ngày/lý do và trạng thái `DISPOSED`. |
| INV-03 | Hủy hàng | QA/Kho | Tạo biên bản hủy hàng với mã duy nhất; thử mã trùng. | Biên bản hợp lệ lưu, mã trùng bị từ chối. |
| TRACE-01 | Truy xuất ngược | QA | Chọn thành phẩm/mẻ có dữ liệu liên kết. | Hiển thị được mẻ, lô nguyên liệu, NCC và mẫu lưu nếu có. |
| TRACE-02 | Truy xuất xuôi/thu hồi | QA | Chọn lô nguyên liệu, xem điểm giao/khách ảnh hưởng, tạo quarantine. | Danh sách ảnh hưởng đúng; mẻ bị cách ly không thể xuất. |
| TRACE-03 | Diễn tập thu hồi | QA/Lãnh đạo | Mở mock recall summary và notice template. | Có thời gian ước tính, đánh giá mục tiêu và nội dung thông báo. |
| CAPA-01 | NC | QA/QC | Tạo NC với lô ảnh hưởng, mức độ và correction. | NC có mã duy nhất và trạng thái mở phù hợp. |
| CAPA-02 | CAPA hiệu lực | QA | Tạo CAPA, nhập nguyên nhân, hành động, bằng chứng; xác minh `EFFECTIVE`. | Chỉ CAPA đã xác minh hiệu lực mới đủ điều kiện đóng. |
| CAPA-03 | CAPA quá hạn | QA | Tạo CAPA có hạn quá khứ/chưa hoàn thành, mở SLA warnings. | Cảnh báo quá hạn hiển thị đúng. |
| AUD-01 | Audit/finding | Auditor | Lập audit, tạo finding và chuyển finding thành NC. | Finding liên kết audit; NC được tạo đúng nguồn. |
| AUD-02 | Đào tạo | HR/QA | Tạo yêu cầu, khóa học, học viên và đánh giá sau đào tạo. | Các bản ghi liên kết; kết quả đánh giá hiển thị ở học viên/competency. |
| AUD-03 | Sức khỏe | HR/QA | Tạo khai báo có dấu hiệu không đủ điều kiện ca. | Người lao động bị đánh dấu đình chỉ/cảnh báo theo quy tắc. |
| EMG-01 | Khẩn cấp | QA | Tạo/cập nhật liên hệ và kịch bản khẩn cấp. | Thông tin được lưu, tìm kiếm được. |
| EMG-02 | Diễn tập/sự cố | QA | Tạo `PLANNED_DRILL` không đạt; tạo `ACTUAL_INCIDENT` riêng. | Hai loại record lưu đúng; diễn tập không đạt sinh NC/CAPA. |
| BLD-01 | Form Builder | Admin/QA | Tạo template có mã, trường bắt buộc; phê duyệt; gửi submission. | Template duy nhất/được duyệt; submission lưu người gửi và dữ liệu. |
| BLD-02 | Workflow Builder | Admin/QA | Tạo workflow 2 bước, khởi tạo instance, thực hiện action bằng đúng vai trò. | Instance chỉ chuyển bước khi role hợp lệ; lịch sử action đầy đủ. |
| API-01 | Toàn hệ thống | Người dùng | Gọi endpoint nghiệp vụ bằng token hết hạn. | Nhận `401`; frontend xóa phiên cũ và yêu cầu đăng nhập lại. |
| API-02 | Toàn hệ thống | Admin | Mở OpenAPI và kiểm tra các endpoint chính của 20 module. | Route được đăng ký, schema hiển thị, endpoint bảo vệ có Bearer security. |

## 4. Tiêu chí nghiệm thu tối thiểu

- 100% test case mức Critical gồm AUTH-03, RBAC-02, DMS-04, PUR-04, HACCP-04, PRP-02, INV-01, TRACE-02, CAPA-02 và EMG-02 phải PASS.
- Không có lỗi 500 trong log khi thực hiện luồng hợp lệ.
- Mọi lỗi phân quyền phải trả `401` hoặc `403`, không trả dữ liệu nghiệp vụ.
- Những case BLOCKED phải có nguyên nhân, dữ liệu thiếu và người chịu trách nhiệm xử lý trước khi ký nghiệm thu.
