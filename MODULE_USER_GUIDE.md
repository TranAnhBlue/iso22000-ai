# Hướng dẫn sử dụng các phân hệ FSMS ISO 22000

Tài liệu này hướng dẫn người dùng vận hành các phân hệ của hệ thống quản lý an toàn thực phẩm. Dữ liệu chỉ được coi là hồ sơ kiểm soát sau khi người có thẩm quyền kiểm tra, phê duyệt và phát hành theo quy định nội bộ.

## 1. Quy tắc sử dụng chung

1. Đăng nhập bằng tài khoản được cấp; không dùng chung tài khoản hoặc chia sẻ token đăng nhập.
2. Kiểm tra đúng đơn vị, lô hàng, ngày phát sinh và người thực hiện trước khi bấm Lưu. Mã hồ sơ, mã lô và mã tài liệu phải duy nhất.
3. Không xóa dữ liệu đã là bằng chứng ISO. Với hồ sơ đã phê duyệt/tiêu hủy, dùng luồng điều chỉnh, thu hồi hoặc CAPA thay vì sửa trực tiếp.
4. Các cảnh báo `401 Unauthorized` nghĩa là phiên đăng nhập hết hạn hoặc không có JWT. Đăng nhập lại; không yêu cầu mở quyền công khai cho API nghiệp vụ.
5. Các vai trò thường dùng: Quản trị, Ban lãnh đạo, QA/QC, Đội ATTP, Sản xuất, Kho, Mua hàng, Bảo trì, Nhân sự và Người xem. Nút không hiện hoặc trả về `403` nghĩa là vai trò chưa có quyền.
6. **Ngưỡng và KPI không được suy ra từ dữ liệu mẫu.** Giới hạn CCP/PRP, tiêu chí PASS/FAIL, hạn thẩm tra CAPA, thời gian/tỷ lệ mục tiêu diễn tập thu hồi phải lấy từ hồ sơ HACCP, yêu cầu pháp luật, khách hàng và phê duyệt nội bộ của doanh nghiệp. Giá trị trong UAT chỉ phục vụ kiểm thử luồng.
7. Ngưỡng kiểm nước/đá được quản lý bằng **Bộ ngưỡng** trên API, không lấy từ mã nguồn. Trước khi go-live, QA/Đội ATTP phải đối chiếu, lập/hiệu chỉnh và kích hoạt một bộ ngưỡng `ACTIVE`; mỗi phiếu nước sẽ lưu ID bộ ngưỡng đã áp dụng để phục vụ truy vết.

## 2. Đăng nhập và phân quyền

### Xác thực và tài khoản

1. Mở hệ thống, nhập tên đăng nhập và mật khẩu.
2. Sau khi vào hệ thống, kiểm tra tên người dùng, phòng ban và vai trò ở thanh điều hướng.
3. Đổi mật khẩu khi được yêu cầu; báo quản trị ngay khi phát hiện tài khoản lạ.

### Quản lý tổ chức và RBAC

Quản trị vào **Tổ chức** để tạo phòng ban, tạo tài khoản và gán vai trò. Không xóa phòng ban đang còn người dùng hoặc hồ sơ liên quan. Đội ATTP được quản lý riêng với quyết định thành lập, vai trò trong đội, năng lực và thời hạn hiệu lực.

## 3. Dashboard, mục tiêu và xem xét lãnh đạo

**Dành cho:** Ban lãnh đạo, QA, Đội trưởng ATTP.

1. Mở **Dashboard** để xem KPI, cảnh báo CCP/CAPA, lô sắp hết hạn, thiết bị đến hạn và tài liệu chờ duyệt.
2. Với cảnh báo, mở liên kết phân hệ nguồn; không đóng cảnh báo trước khi hồ sơ gốc được xử lý.
3. Vào **Mục tiêu chất lượng** để lập KPI có mã, năm áp dụng, chỉ tiêu, giá trị mục tiêu, người phụ trách và trạng thái.
4. Vào **Xem xét lãnh đạo** để tạo biên bản MRM, nhập đầu vào (audit, khách hàng, CCP/PRP, CAPA, NCC, nguồn lực), quyết định, người phụ trách và hạn hoàn thành.
5. Chỉ Ban lãnh đạo/Đội ATTP phê duyệt MRM. Sau `APPROVED`, biên bản bị khóa; theo dõi đầu ra bằng chức năng hành động MRM.

## 4. DMS, kiểm soát hồ sơ và tài liệu ngoài

**Dành cho:** Document Controller, QA, Ban lãnh đạo.

1. Vào **Tài liệu**, tìm theo mã, loại, phòng ban hoặc trạng thái.
2. Tạo tài liệu với mã, tên, loại (Policy/Manual/SOP/WI/Form), phiên bản, phòng ban, hạn soát xét và mức bảo mật.
3. Đính kèm file gốc bằng chức năng tải tệp. Chỉ tải định dạng được hệ thống cho phép.
4. Khi cần thay đổi, lập **Phiếu yêu cầu xem xét**; thực hiện lần lượt xem xét trưởng đơn vị, QA và phê duyệt lãnh đạo.
5. Phát hành tài liệu qua **Phân phối**, chỉ định phòng ban/người nhận và theo dõi xác nhận nhận tài liệu, thu hồi bản lỗi thời.
6. Khai báo luật, tiêu chuẩn và tài liệu khách hàng trong **Tài liệu ngoài**, đặt chu kỳ rà soát.
7. Vào **Lưu giữ hồ sơ** để lập danh mục thời hạn lưu. Khi đến hạn, chỉ sử dụng luồng tiêu hủy có hội đồng, mã biên bản và xác nhận quá hạn; không chuyển thẳng sang `DISPOSED`.

**Lưu ý tài liệu An Giang:** 96 file nguồn được nhập với mã `AG-*` và trạng thái `PENDING_APPROVAL`. QA cần kiểm tra nội dung, phiên bản, ngày hiệu lực rồi phát hành từng tài liệu áp dụng.

## 5. Bối cảnh, rủi ro và quản lý thay đổi

### Bối cảnh tổ chức

1. Khai báo bên quan tâm: nhu cầu, yêu cầu luật định, cách theo dõi và tần suất xem xét.
2. Lập rủi ro/bối cảnh với khả năng, mức độ, biện pháp, người chịu trách nhiệm và ngày hoàn thành.
3. Sau khi hành động xong, dùng chức năng đánh giá hiệu lực; cập nhật rủi ro còn lại thay vì đóng khi chưa có bằng chứng.
4. Ghi nhận truyền thông nội bộ/bên ngoài khi liên quan chính sách hoặc thay đổi ATTP.

### Quản lý thay đổi

1. Tạo phiếu thay đổi cho thay đổi 4M, nhà cung cấp, công thức, thiết bị hoặc phương pháp.
2. Nêu lý do, phạm vi, đánh giá ảnh hưởng HACCP/PRP/tài liệu/đào tạo và kế hoạch giảm thiểu.
3. Chỉ triển khai sau khi được duyệt. Khi hoàn tất, ghi nhận thẩm tra hiệu lực; nếu không hiệu lực, mở CAPA hoặc thay đổi mới.

## 6. Mua hàng, nhà cung cấp và IQC

**Dành cho:** Mua hàng, QC, Kho.

1. Tạo **Nhà cung cấp** với nhóm hàng, chứng nhận, mức rủi ro và trạng thái ASL.
2. Lập **Kế hoạch đánh giá NCC** theo năm, chọn mẫu tiêu chí đúng nhóm nguyên liệu và phân công đánh giá viên.
3. Tạo phiếu đánh giá NCC; nhập điểm từng tiêu chí để hệ thống xếp hạng A/B/C/D. NCC chưa đạt không được tự ý dùng cho lô mới.
4. Khi nhận hàng, tạo **Lô nguyên liệu** ở trạng thái chờ IQC.
5. Lập **IQC**: kiểm tra giấy tờ/COA, cảm quan, điều kiện vận chuyển, chỉ tiêu áp dụng và kết luận. Kết quả phải đồng bộ lô thành `APPROVED`, `REJECTED` hoặc `QUARANTINE`.

## 7. HACCP, CCP, IPQC và PRP

### Kế hoạch HACCP và CCP

1. Tạo kế hoạch HACCP theo sản phẩm/dây chuyền, sau đó lập lưu đồ công đoạn.
2. Tại từng công đoạn, phân tích mối nguy sinh học, hóa học, vật lý và dị nguyên; ghi biện pháp kiểm soát và kết luận CCP/oPRP.
3. Khai báo CCP với giới hạn tới hạn, phương pháp/tần suất đo, người chịu trách nhiệm và hành động sai lệch.
4. Khi ghi nhật ký CCP, chọn đúng CCP và mẻ sản xuất, nhập giá trị đo và hành động xử lý nếu lệch.
5. Nếu vượt giới hạn, hệ thống phải đánh dấu sai lệch, khóa mẻ/lô sang `HOLD` khi có liên kết và tạo NC. Không tự giải phóng lô trước khi QA xử lý.
6. Thẩm tra và phê duyệt kế hoạch HACCP; mọi thay đổi phiên bản phải có hồ sơ thẩm tra.

### Kiểm soát quá trình và PRP

1. Ghi nhật ký IPQC theo công đoạn; ghi máy dò kim loại theo ca/mẻ và xử lý kết quả không đạt.
2. Dùng PRP checklist cho vệ sinh, GMP, SSOP, 5S và kiểm soát dịch hại. Mục không đạt phải có hành động và người phụ trách.
3. Dùng các nhật ký chuyên biệt: nước/đá, hóa chất/MSDS, chất thải, lịch quan trắc, kiểm soát dị nguyên, khách/nhân viên và sơ cứu.
4. Trước khi lập phiếu đầu tiên, QA/Đội ATTP tạo hoặc rà soát **Bộ ngưỡng nước/đá** trên API `POST /api/v1/haccp/water-limit-profiles`, rồi kích hoạt đúng một bộ có `status: ACTIVE`. Chỉ Admin/QA/Đội ATTP được tạo hoặc cập nhật cấu hình. Khi kích hoạt bộ mới, bộ `ACTIVE` cũ được chuyển `RETIRED`.
5. Phiếu nước sẽ tự `FAIL` khi pH, clo, độ đục, Coliform hoặc E. coli vượt bộ ngưỡng `ACTIVE`. Hệ thống lưu `limit_profile_id` cùng phiếu để kết quả cũ không bị diễn giải lại theo ngưỡng mới. Nếu chưa có bộ `ACTIVE`, hệ thống chặn tạo phiếu và yêu cầu QA/Quản trị cấu hình trước.

## 8. Thiết bị, hiệu chuẩn và phương tiện

1. Tạo hồ sơ thiết bị với mã, vị trí, tình trạng, chu kỳ bảo trì và hiệu chuẩn.
2. Lập nhật ký bảo trì: thời điểm, công việc, vật tư, người thực hiện, kết quả và thời hạn kế tiếp.
3. Lập hiệu chuẩn cho thiết bị đo; gắn chứng thư, ngày hiệu lực/hết hạn và đánh giá kết quả.
4. Theo dõi thiết bị liên quan CCP trong danh sách riêng. Thiết bị quá hạn hiệu chuẩn không được dùng làm bằng chứng đo CCP.
5. Kiểm tra phương tiện trước vận chuyển; nếu một điều kiện bắt buộc không đạt, kết quả phải là `REJECTED/FAIL` và xử lý trước khi giao hàng.

## 9. Kho, mẫu lưu, truy xuất và thu hồi

1. Tạo lô sản xuất và tồn kho, khai báo hạn dùng, vị trí, điều kiện bảo quản và trạng thái.
2. Khi xuất hàng, dùng FEFO; không xuất lô `HOLD`, hết hạn hoặc bị thu hồi.
3. Ghi mẫu lưu với mã mẫu, lô/mẻ, thời gian, điều kiện lưu, hạn lưu và kết quả thử nghiệm.
4. Dùng **Truy xuất ngược** từ thành phẩm về mẻ/lô nguyên liệu/NCC; dùng **truy xuất xuôi** để xác định điểm giao và khách hàng ảnh hưởng.
5. Khi diễn tập thu hồi, kiểm tra thời gian truy xuất, tỷ lệ xác định lô, mẫu thông báo và bằng chứng cách ly. Dùng chức năng quarantine để khóa mẻ nghi ngờ.
6. Hủy hàng/mẫu chỉ theo biên bản, mã hồ sơ và người có thẩm quyền.

### Phiếu kết quả truy xuất: xem, in và điều chỉnh dữ liệu

1. Tại **Truy xuất 1 chạm**, nhập mã mẻ, mã phiếu xuất hoặc mã QR; hệ thống ghép dữ liệu theo chuỗi: lô nguyên liệu/IQC → mẻ sản xuất → giám sát CCP/oPRP → tồn kho, mẫu lưu → phiếu xuất/khách hàng.
2. Nút **In Phiếu kết quả truy xuất** chỉ tạo bản tổng hợp tại thời điểm tra cứu. Phiếu này là **chỉ đọc**, không phải màn hình nhập liệu và không có chữ ký phê duyệt điện tử thay cho quy trình ký duyệt nội bộ.
3. Không sửa trực tiếp phiếu tổng hợp. Điều chỉnh tại hồ sơ nguồn theo đúng trách nhiệm: NCC, lô nguyên liệu và IQC ở **Nhà cung cấp & IQC**; mẻ sản xuất và tồn kho/mẫu lưu/phiếu xuất ở **Kho & Tồn kho FEFO**; nhật ký CCP/oPRP ở **HACCP & Mối nguy**.
4. Người có quyền sửa phải sửa trước khi hồ sơ được phê duyệt/phát hành. Với hồ sơ đã chốt hoặc đã dùng làm bằng chứng đánh giá, lập phiếu điều chỉnh, NC/CAPA hoặc quản lý thay đổi; giữ lại lịch sử và lý do, không ghi đè tùy tiện.
5. Sau khi hồ sơ nguồn được điều chỉnh hợp lệ, chạy truy xuất lại và in phiếu mới. Phiếu cũ chỉ phản ánh dữ liệu tại thời điểm đã in.

## 10. Liên kết giữa các trang và phân hệ

Hệ thống vận hành theo một chuỗi dữ liệu; trang **Truy xuất 1 chạm** là nơi tổng hợp, không phải nơi nhập lại dữ liệu.

| Từ trang/phân hệ | Dữ liệu chuyển sang | Phân hệ nhận / mục đích |
| --- | --- | --- |
| Tổ chức & Người dùng | Phòng ban, vai trò, Đội ATTP, người chịu trách nhiệm | Toàn bộ phân hệ dùng để phân quyền, giao việc và xác định người lập/kiểm tra. |
| Tài liệu & Hồ sơ | SOP, WI, biểu mẫu, phiên bản hiệu lực | HACCP, PRP, audit, đào tạo và Builder chỉ áp dụng hướng dẫn/biểu mẫu đã phát hành. |
| Nhà cung cấp & IQC | NCC đạt chuẩn, lô nguyên liệu, COA, kết quả IQC | Kho tạo/nhận lô; mẻ sản xuất chỉ nên dùng lô đã được chấp nhận. |
| HACCP & Mối nguy | Kế hoạch HACCP, CCP/oPRP, giới hạn tới hạn, nhật ký đo | Gắn với mẻ sản xuất; vi phạm tạo cảnh báo, NC/CAPA và có thể đưa lô sang HOLD. |
| PRP / GMP / SSOP | Checklist điều kiện nền, vệ sinh, nước, dị nguyên, dịch hại | Là bằng chứng điều kiện vận hành, là đầu vào audit, CAPA và xem xét lãnh đạo. |
| Thiết bị & Bảo trì | Tình trạng, hiệu chuẩn, chứng thư thiết bị | Thiết bị đo dùng cho CCP/IPQC phải còn hiệu lực; quá hạn cần xử lý trước khi dùng kết quả đo. |
| Kho & Tồn kho FEFO | Mẻ sản xuất, sử dụng lô nguyên liệu, tồn kho, mẫu lưu, phiếu xuất | Đầu vào chính của truy xuất; FEFO/HOLD/quarantine kiểm soát việc xuất hàng. |
| Truy xuất 1 chạm | Chuỗi lô, kết quả CCP/IQC, mẫu lưu, điểm giao hàng | Phục vụ điều tra sự cố, diễn tập/thu hồi; có thể yêu cầu biệt trữ tồn kho. |
| CAPA & Không phù hợp | Sự cố, nguyên nhân, hành động, bằng chứng hiệu lực | Nhận đầu vào từ CCP/PRP/audit/thu hồi/thiết bị; kết quả có thể dẫn tới thay đổi tài liệu hoặc đào tạo. |
| Đánh giá nội bộ & Đào tạo | Phát hiện audit, năng lực và bằng chứng đào tạo | Phát hiện chuyển NC/CAPA; nhu cầu đào tạo phát sinh từ thay đổi, CAPA hoặc đánh giá năng lực. |
| Ứng phó khẩn cấp | Sự cố/diễn tập, liên lạc, kết quả | Khi có thu hồi/sự cố ATTP, dùng Truy xuất để xác định phạm vi, sau đó tạo NC/CAPA và xem xét hiệu lực. |
| Quản lý thay đổi & Builder | Đánh giá ảnh hưởng, biểu mẫu điện tử, workflow phê duyệt | Thay đổi ảnh hưởng HACCP/PRP/tài liệu/đào tạo phải được duyệt trước; Builder chỉ phát hành biểu mẫu/quy trình sau phê duyệt. |

### Luồng thao tác chuẩn cho một lô thành phẩm

1. **Mua hàng/IQC:** tạo NCC, tiếp nhận lô nguyên liệu và kết luận IQC.
2. **Sản xuất/QA:** tạo mẻ, khai báo lô nguyên liệu đã dùng và ghi CCP/oPRP/IPQC theo ca.
3. **Kho/QC:** nhập tồn thành phẩm, tạo mẫu lưu; chỉ giải phóng/xuất lô đáp ứng điều kiện.
4. **Kho/Kinh doanh:** tạo phiếu xuất gắn đúng mẻ và thông tin khách hàng/xe giao.
5. **QA hoặc người được phân quyền:** vào Truy xuất 1 chạm, quét mã để kiểm tra hoặc thực hiện thu hồi; nếu có nguy cơ, biệt trữ và mở NC/CAPA.
6. **Lãnh đạo/QA:** xem Dashboard, audit, CAPA và xem xét lãnh đạo để theo dõi hiệu lực của hành động.

## 11. NC, CAPA, audit, đào tạo và sức khỏe

### NC và CAPA

1. Lập NC với nguồn phát hiện, mức độ, mô tả, lô ảnh hưởng và hành động tức thời.
2. Tạo CAPA liên kết NC; phân tích nguyên nhân 5 Why hoặc xương cá, giao hành động, hạn hoàn thành và bằng chứng.
3. Người xác minh đánh giá hiệu lực. Chỉ đóng CAPA sau khi kết luận `EFFECTIVE`.

### Audit, đào tạo và sức khỏe

1. Lập chương trình audit, phạm vi, tiêu chí, đoàn đánh giá và ngày thực hiện.
2. Tạo phát hiện; chuyển phát hiện cần khắc phục sang NC để theo dõi thống nhất.
3. Với đào tạo: tạo yêu cầu, khóa học/kế hoạch, danh sách tham dự và đánh giá sau đào tạo; đối chiếu competency matrix khi phân công công việc.
4. Khai báo sức khỏe trước ca/khách thăm. Người bị đình chỉ không được bố trí vào khu vực có nguy cơ lây nhiễm thực phẩm.

## 12. Ứng phó khẩn cấp và Builder

### Ứng phó khẩn cấp

1. Duy trì danh bạ nội bộ/cơ quan ngoài và quy trình theo kịch bản.
2. Lập hồ sơ `PLANNED_DRILL` cho diễn tập hoặc `ACTUAL_INCIDENT` cho sự cố thật, nêu chỉ huy, thời gian phản ứng, diễn biến và kết quả.
3. Kết quả không đạt phải sinh NC/CAPA để theo dõi hành động sau diễn tập/sự cố.

### Builder biểu mẫu và workflow

1. Quản trị tạo biểu mẫu với mã duy nhất, module, các trường bắt buộc và phiên bản.
2. Phê duyệt template trước khi dùng chính thức; không chỉnh sửa trực tiếp template đã có dữ liệu thực tế nếu cần bảo toàn bằng chứng.
3. Tạo workflow với các bước, vai trò, điều kiện chuyển tiếp và người phê duyệt; kiểm tra sơ đồ không có nút rời hoặc vòng lặp sai.
4. Khởi tạo instance, thực hiện action theo đúng vai trò và kiểm tra lịch sử phê duyệt.

## 13. Kịch bản vận hành tối thiểu mỗi ngày

1. QA xem Dashboard và xử lý cảnh báo đỏ.
2. QC hoàn tất IQC, CCP/IPQC, PRP và tình trạng nước/thiết bị đo.
3. Kho đối chiếu FEFO, lô HOLD, hạn dùng và mẫu lưu.
4. Trưởng bộ phận kiểm tra NC/CAPA quá hạn, tài liệu chờ duyệt và hành động MRM.
5. Cuối ca, rà soát bản ghi thiếu người thực hiện, ngày giờ hoặc hành động khắc phục.
