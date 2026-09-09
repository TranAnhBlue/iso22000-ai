import sys
from app.core.database import SessionLocal, engine, Base
from app.modules.organization.models import InterestedParty, ContextRisk
from datetime import date

def init_context_tables():
    print("Creating tables for InterestedParty and ContextRisk...")
    Base.metadata.create_all(bind=engine, tables=[InterestedParty.__table__, ContextRisk.__table__])
    db = SessionLocal()

    try:
        if db.query(InterestedParty).count() == 0:
            print("Seeding interested_parties...")
            p1 = InterestedParty(
                party_name="Cơ quan Quản lý Nhà nước (Cục ATTP - Bộ Y tế, Chi cục ATTP Tỉnh An Giang)",
                party_type="EXTERNAL",
                needs_and_expectations="Tuân thủ nghiêm ngặt Luật ATTP số 55/2010/QH12; công bố hợp quy/tự công bố chất lượng; lưu giữ đầy đủ hồ sơ nguồn gốc nguyên liệu tối thiểu 2 năm.",
                statutory_requirements="Luật ATTP 55/2010, Nghị định 15/2018/NĐ-CP, Thông tư 38/2018/TT-BNNPTNT, QCVN 01-1:2018/BYT.",
                monitoring_method="Kiểm tra liên ngành định kỳ hàng năm; giám sát đột xuất; nộp báo cáo định kỳ tự công bố và quan trắc môi trường.",
                review_frequency="6 tháng/lần",
                responsible_role="Ban QLCL & ATTP",
                status="ACTIVE"
            )
            p2 = InterestedParty(
                party_name="Khách hàng B2B & Chuỗi siêu thị lớn (Co.opmart, WinCommerce, Khách hàng xuất khẩu)",
                party_type="EXTERNAL",
                needs_and_expectations="Chứng nhận ISO 22000:2018 còn hiệu lực; cung cấp phiếu kết quả thử nghiệm COA từng lô hàng; không tồn dư hoạt chất cấm; giao hàng đúng tiến độ.",
                statutory_requirements="Quy chuẩn kỹ thuật theo thỏa thuận hợp đồng thương mại; TCVN 11892-1:2017 (VietGAP trồng trọt).",
                monitoring_method="Đánh giá định kỳ bên thứ hai của khách hàng; gửi mẫu đối chứng kiểm nghiệm độc lập; khảo sát chỉ số hài lòng khách hàng (CSI).",
                review_frequency="Hàng năm",
                responsible_role="Phòng Kinh doanh & Kho",
                status="ACTIVE"
            )
            p3 = InterestedParty(
                party_name="Người tiêu dùng cuối cùng (End-Consumers)",
                party_type="EXTERNAL",
                needs_and_expectations="Sản phẩm dinh dưỡng, an toàn tuyệt đối, không gây ngộ độc thực phẩm; ghi nhãn minh bạch thông tin thành phần, hạn dùng và cảnh báo dị ứng rõ ràng.",
                statutory_requirements="Nghị định 43/2017/NĐ-CP & Nghị định 111/2021/NĐ-CP về ghi nhãn hàng hóa.",
                monitoring_method="Tổng đài Hotline chăm sóc khách hàng 24/7; khảo sát thị trường định kỳ; quản trị kênh khiếu nại chất lượng sản phẩm.",
                review_frequency="Hàng quý",
                responsible_role="Ban QLCL & ATTP",
                status="ACTIVE"
            )
            p4 = InterestedParty(
                party_name="Nhà cung cấp nông sản & nguyên vật liệu tươi, bao bì tiếp xúc trực tiếp",
                party_type="EXTERNAL",
                needs_and_expectations="Hợp đồng thu mua dài hạn, cam kết tiêu chuẩn kỹ thuật tiếp nhận IQC rõ ràng; thanh toán đúng kỳ hạn; hướng dẫn kỹ thuật kiểm soát vùng trồng/vùng nuôi.",
                statutory_requirements="Cam kết không sử dụng thuốc BVTV/kháng sinh cấm; sổ nhật ký canh tác theo dõi thời gian cách ly.",
                monitoring_method="Đánh giá nhà cung ứng định kỳ theo BM02/BM03 (6 tháng/lần); kiểm tra xác suất thực địa tại vùng trồng/vùng nuôi.",
                review_frequency="6 tháng/lần",
                responsible_role="Ban QLCL & ATTP (Chủ trì) - Phòng Thu Mua",
                status="ACTIVE"
            )
            p5 = InterestedParty(
                party_name="Ban Giám đốc & Hội đồng Quản trị Công ty",
                party_type="INTERNAL",
                needs_and_expectations="Hệ thống FSMS vận hành hiệu lực, đạt tỷ lệ lỗi dưới 0.2%, không xảy ra sự cố thu hồi sản phẩm; bảo toàn uy tín thương hiệu và tối ưu hóa chi phí chất lượng.",
                statutory_requirements="Điều lệ hoạt động công ty; Mục tiêu chất lượng và cam kết an toàn thực phẩm hàng năm.",
                monitoring_method="Cuộc họp Xem xét của Lãnh đạo định kỳ (Điều 9.3); Báo cáo giao ban sản xuất - chất lượng hàng tuần.",
                review_frequency="Hàng năm",
                responsible_role="Ban Giám Đốc",
                status="ACTIVE"
            )
            p6 = InterestedParty(
                party_name="Cán bộ công nhân viên trực tiếp sản xuất tại các phân xưởng",
                party_type="INTERNAL",
                needs_and_expectations="Môi trường làm việc đảm bảo vệ sinh an toàn lao động; được trang bị đầy đủ BHLĐ, khẩu trang, găng tay vô trùng; được đào tạo nghiệp vụ và hiểu rõ trách nhiệm ATTP.",
                statutory_requirements="Bộ luật Lao động 2019; Quy định khám sức khỏe định kỳ và cấp thẻ xanh xác nhận kiến thức ATTP.",
                monitoring_method="Kiểm tra khai báo sức khỏe đầu ca làm việc; sát hạch đánh giá kiến thức sau đào tạo; đối thoại định kỳ.",
                review_frequency="Hàng quý",
                responsible_role="Phòng Hành chính - Kế toán & Ban ATTP",
                status="ACTIVE"
            )

            db.add_all([p1, p2, p3, p4, p5, p6])
            db.commit()
            print("Seeded 6 interested parties.")

        if db.query(ContextRisk).count() == 0:
            print("Seeding context_risks...")
            parties = {p.party_name: p.id for p in db.query(InterestedParty).all()}

            r1 = ContextRisk(
                code="CR-01",
                issue_category="EXTERNAL",
                issue_description="Biến đổi khí hậu, hạn hán và xâm nhập mặn bất thường tại khu vực Đồng bằng Sông Cửu Long ảnh hưởng nguồn cung nông sản.",
                interested_party_id=parties.get("Nhà cung cấp nông sản & nguyên vật liệu tươi, bao bì tiếp xúc trực tiếp"),
                risk_description="Sâu bệnh bùng phát dẫn đến nông dân lạm dụng thuốc BVTV vượt ngưỡng dư lượng tối đa cho phép (MRLs).",
                opportunity_description="Phát triển mạng lưới liên kết bao tiêu nông nghiệp công nghệ cao và truy xuất mã số vùng trồng đạt chuẩn VietGAP.",
                likelihood=3,
                severity=4,
                risk_score=12,
                treatment_strategy="MITIGATE",
                action_plan="Tăng cường tần suất lấy mẫu test nhanh dư lượng hoạt chất cấm tại khâu IQC tiếp nhận; định kỳ gửi mẫu phân tích sắc ký khí/khối phổ (GC-MS) tại Quatest 3.",
                responsible_role="Ban QLCL & ATTP",
                target_date=date(2026, 12, 31),
                status="TREATING",
                residual_likelihood=1,
                residual_severity=3,
                residual_risk_score=3
            )
            r2 = ContextRisk(
                code="CR-02",
                issue_category="EXTERNAL",
                issue_description="Các thị trường xuất khẩu siết chặt quy chuẩn rào cản kỹ thuật và bổ sung danh mục vi chất, chất gây dị ứng mới.",
                interested_party_id=parties.get("Khách hàng B2B & Chuỗi siêu thị lớn (Co.opmart, WinCommerce, Khách hàng xuất khẩu)"),
                risk_description="Nguy cơ lô hàng bị cảnh báo tại cửa khẩu hoặc bị từ chối thông quan do chưa cập nhật kịp thời tiêu chuẩn thị trường nhập khẩu.",
                opportunity_description="Nâng tầm tiêu chuẩn sản xuất đáp ứng chuẩn khắt khe nhất thế giới (BRCGS/FSSC 22000), mở rộng thị phần xuất khẩu.",
                likelihood=2,
                severity=5,
                risk_score=10,
                treatment_strategy="MITIGATE",
                action_plan="Định kỳ hàng tháng chuyên viên ISO tra cứu cập nhật thông báo SPS của WTO; rà soát hồ sơ công bố và thiết kế lại nhãn phụ trước khi xuất xưởng 15 ngày.",
                responsible_role="Ban QLCL & ATTP (phối hợp Kinh doanh)",
                target_date=date(2026, 11, 30),
                status="TREATING",
                residual_likelihood=1,
                residual_severity=3,
                residual_risk_score=3
            )
            r3 = ContextRisk(
                code="CR-03",
                issue_category="INTERNAL",
                issue_description="Tỷ lệ biến động công nhân thời vụ vào mùa cao điểm sản xuất đạt mức 25% - 30%.",
                interested_party_id=parties.get("Cán bộ công nhân viên trực tiếp sản xuất tại các phân xưởng"),
                risk_description="Công nhân mới chưa thuần thục thao tác vệ sinh cá nhân GMP, có thể làm lây nhiễm chéo vi sinh vật (Salmonella, E. coli) vào thực phẩm chín.",
                opportunity_description="Chuẩn hóa bộ video hướng dẫn trực quan 3 phút tại cửa thay đồ và áp dụng hệ thống phân ca có người hướng dẫn kèm cặp.",
                likelihood=4,
                severity=4,
                risk_score=16,
                treatment_strategy="MITIGATE",
                action_plan="Bắt buộc kiểm tra sức khỏe và hoàn thành sát hạch thực hành vệ sinh đạt 100% trước khi cấp thẻ vào xưởng; bố trí Trưởng ca giám sát trực tiếp 1-1 trong tuần đầu.",
                responsible_role="Phòng Sản xuất & Ban QLCL",
                target_date=date(2026, 10, 15),
                status="TREATING",
                residual_likelihood=2,
                residual_severity=2,
                residual_risk_score=4
            )
            r4 = ContextRisk(
                code="CR-04",
                issue_category="INTERNAL",
                issue_description="Dây chuyền máy chiên và băng tải làm nguội vận hành liên tục 3 ca gây hao mòn cơ khí.",
                interested_party_id=parties.get("Ban Giám đốc & Hội đồng Quản trị Công ty"),
                risk_description="Rò rỉ dầu nhờn máy móc tiếp xúc sản phẩm hoặc bong tróc mạt kim loại mắt xích lẫn vào thành phẩm.",
                opportunity_description="Nâng cấp toàn bộ hệ thống bôi trơn sang chuẩn thực phẩm Food-Grade NSF H1 và lắp đặt máy dò kim loại đa tần số độ nhạy cao.",
                likelihood=2,
                severity=5,
                risk_score=10,
                treatment_strategy="MITIGATE",
                action_plan="Kiểm tra xác nhận thiết bị dò kim loại CCP mỗi 2 giờ với thanh mẫu chuẩn Fe 1.2mm, Non-Fe 1.5mm, Sus 2.0mm; bảo dưỡng thay mỡ bôi trơn NSF H1 mỗi 30 ngày.",
                responsible_role="Phòng Thiết bị (phối hợp QA/QC)",
                target_date=date(2026, 9, 30),
                status="CONTROLLED",
                residual_likelihood=1,
                residual_severity=2,
                residual_risk_score=2
            )
            r5 = ContextRisk(
                code="CR-05",
                issue_category="EXTERNAL",
                issue_description="Biến động nguồn cung và rủi ro gián đoạn chuỗi cung ứng bao bì màng ghép phức hợp nhôm.",
                interested_party_id=parties.get("Nhà cung cấp nông sản & nguyên vật liệu tươi, bao bì tiếp xúc trực tiếp"),
                risk_description="Thiếu hụt bao bì đạt chuẩn làm dồn ứ bán thành phẩm tại kho đệm, tăng nguy cơ suy giảm chất lượng cảm quan.",
                opportunity_description="Đa dạng hóa tối thiểu 3 nhà cung ứng bao bì đạt chuẩn ISO 22000 trong danh mục ASL phê duyệt.",
                likelihood=2,
                severity=3,
                risk_score=6,
                treatment_strategy="ACCEPT",
                action_plan="Thiết lập mức tồn kho an toàn bao bì tối thiểu 45 ngày sản xuất; định kỳ đánh giá năng lực nhà cung cấp dự phòng.",
                responsible_role="Phòng Kinh doanh & Kho (Thu mua)",
                target_date=date(2026, 12, 15),
                status="CONTROLLED",
                residual_likelihood=1,
                residual_severity=2,
                residual_risk_score=2
            )

            db.add_all([r1, r2, r3, r4, r5])
            db.commit()
            print("Seeded 5 context risks.")

        print("Context tables initialized and seeded successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    init_context_tables()
