import uuid
from typing import List, Optional, Any
from datetime import datetime, date, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, or_

from app.core.database import get_db
from app.models.emergency import EmergencyContact, EmergencyProcedure, EmergencyDrill
from app.schemas.emergency import (
    EmergencyContactCreate,
    EmergencyContactUpdate,
    EmergencyContactResponse,
    EmergencyProcedureCreate,
    EmergencyProcedureUpdate,
    EmergencyProcedureResponse,
    EmergencyDrillCreate,
    EmergencyDrillUpdate,
    EmergencyDrillResponse,
    EmergencyStatsResponse,
)

router = APIRouter()


# ==================== SEED DATA HELPER ====================
def seed_emergency_data_if_empty(db: Session):
    if db.query(EmergencyContact).first() is not None:
        return

    # 1. Seed Contacts
    contacts_seed = [
        # Internal Contacts
        EmergencyContact(
            name="Nguyễn Văn An",
            organization_or_role="Trưởng Ban QLCL & Đội trưởng HACCP",
            phone="0918.234.567",
            phone_alt="02963.852.111 (Ext: 102)",
            email="an.nguyen@wcert.vn",
            contact_type="INTERNAL",
            priority_order=1,
            notes="Phụ trách điều hành ứng phó sự cố ATTP, thu hồi sản phẩm khẩn cấp."
        ),
        EmergencyContact(
            name="Lê Minh Trí",
            organization_or_role="Chỉ huy Đội PCCC & Cứu nạn cơ sở",
            phone="0909.112.334",
            phone_alt="02963.852.111 (Ext: 105)",
            email="tri.le@wcert.vn",
            contact_type="INTERNAL",
            priority_order=2,
            notes="Chỉ huy trực tiếp khi xảy ra hỏa hoạn, nổ, tràn hóa chất tại phân xưởng."
        ),
        EmergencyContact(
            name="Trần Văn Hùng",
            organization_or_role="Tổng Giám Đốc điều hành",
            phone="0988.776.655",
            email="hung.tran@wcert.vn",
            contact_type="INTERNAL",
            priority_order=3,
            notes="Phê duyệt kích hoạt lệnh ứng phó cấp cao và phát ngôn truyền thông."
        ),
        EmergencyContact(
            name="Phạm Quốc Bảo",
            organization_or_role="Trưởng phòng Thiết bị & Cơ điện",
            phone="0913.998.877",
            phone_alt="02963.852.111 (Ext: 108)",
            email="bao.pham@wcert.vn",
            contact_type="INTERNAL",
            priority_order=4,
            notes="Phụ trách xử lý sự cố mất điện, mất nước, hỏng máy lạnh, áp suất lò hơi."
        ),
        EmergencyContact(
            name="Võ Thị Mai",
            organization_or_role="Cán bộ Y tế & Sơ cấp cứu",
            phone="0939.445.566",
            email="mai.vo@wcert.vn",
            contact_type="INTERNAL",
            priority_order=5,
            notes="Cấp cứu tại chỗ, phối hợp chuyển viện khi có tai nạn lao động hoặc ngộ độc."
        ),
        # External Contacts
        EmergencyContact(
            name="Cảnh sát PCCC & Cứu nạn Cứu hộ (114)",
            organization_or_role="Đội Cảnh sát PCCC & CNCH Công an tỉnh An Giang",
            phone="114",
            phone_alt="02963.852.114",
            contact_type="EXTERNAL",
            priority_order=1,
            address="Đường Trần Hưng Đạo, P. Mỹ Bình, TP. Long Xuyên, An Giang",
            notes="Báo cháy, nổ, cứu hộ tai nạn sập đổ hoặc hóa chất độc hại quy mô lớn."
        ),
        EmergencyContact(
            name="Cấp cứu Y tế 115 & Bệnh viện Đa khoa",
            organization_or_role="Trung tâm Cấp cứu 115 - Bệnh viện Đa khoa Trung tâm An Giang",
            phone="115",
            phone_alt="02963.852.862",
            contact_type="EXTERNAL",
            priority_order=2,
            address="Số 60 Ung Văn Khiêm, TP. Long Xuyên, An Giang",
            notes="Cấp cứu nạn nhân tai nạn lao động, nghi ngờ ngộ độc thực phẩm diện rộng."
        ),
        EmergencyContact(
            name="Chi cục An toàn Vệ sinh Thực phẩm tỉnh An Giang",
            organization_or_role="Cơ quan quản lý nhà nước về ATTP (Sở Y tế An Giang)",
            phone="02963.956.789",
            email="chicucattp@angiang.gov.vn",
            contact_type="EXTERNAL",
            priority_order=3,
            address="Số 12 Lê Triệu Kiết, P. Mỹ Bình, TP. Long Xuyên, An Giang",
            notes="Báo cáo khẩn cấp khi phát hiện sự cố an toàn thực phẩm nghiêm trọng hoặc thu hồi sản phẩm."
        ),
        EmergencyContact(
            name="Công ty Điện lực An Giang (PC An Giang)",
            organization_or_role="Tổng đài CSKH Điện lực Miền Nam",
            phone="1900.1006",
            phone_alt="02962.210.222",
            contact_type="EXTERNAL",
            priority_order=4,
            notes="Báo sự cố mất điện lưới, đứt đường dây trung thế hoặc chạm chập trạm biến áp."
        ),
        EmergencyContact(
            name="Công ty Cổ phần Điện Nước An Giang",
            organization_or_role="Xí nghiệp Cấp nước Long Xuyên",
            phone="02963.841.258",
            contact_type="EXTERNAL",
            priority_order=5,
            notes="Báo sự cố gián đoạn nguồn cấp nước sạch sản xuất hoặc sự cố vỡ đường ống."
        ),
        EmergencyContact(
            name="Sở Tài nguyên và Môi trường tỉnh An Giang",
            organization_or_role="Chi cục Bảo vệ Môi trường",
            phone="02963.854.123",
            contact_type="EXTERNAL",
            priority_order=6,
            address="Số 01 Lý Thường Kiệt, TP. Long Xuyên, An Giang",
            notes="Báo cáo sự cố tràn đổ hóa chất, ô nhiễm nguồn tiếp nhận hoặc xả thải khẩn cấp."
        ),
    ]

    for c in contacts_seed:
        db.add(c)

    # 2. Seed Procedures (7+2 Official Scenarios from Document)
    procedures_seed = [
        EmergencyProcedure(
            procedure_code="EP-01",
            title="Quy trình Ứng phó Sự cố Cháy, Nổ trong Nhà xưởng & Kho tàng",
            scenario_type="FIRE_EXPLOSION",
            likelihood=2,
            severity=5,
            risk_score=10,
            risk_level="HIGH",
            responsible_team="Đội PCCC cơ sở & Ban Giám đốc",
            equipment_needed="Hệ thống báo cháy tự động, bình bột ABC 8kg, bình khí CO2 5kg, họng nước vách tường, máy bơm cứu hỏa diezen dự phòng.",
            version="1.2",
            status="ACTIVE",
            immediate_actions=[
                {"step": 1, "action": "Người phát hiện nhấn chuông báo động khẩn cấp và hô to 'Cháy!'", "responsible": "Nhân viên phát hiện", "deadline_minutes": 1},
                {"step": 2, "action": "Cúp cầu dao điện khu vực bị cháy và cô lập van cấp khí/dầu", "responsible": "Tổ Điện vận hành", "deadline_minutes": 2},
                {"step": 3, "action": "Đội PCCC cơ sở dùng bình cứu hỏa tại chỗ khống chế ngọn lửa ban đầu", "responsible": "Đội PCCC cơ sở", "deadline_minutes": 3},
                {"step": 4, "action": "Nếu đám cháy ngoài tầm kiểm soát, lập tức gọi 114 và sơ tán toàn bộ nhân sự theo sơ đồ thoát hiểm", "responsible": "Chỉ huy PCCC", "deadline_minutes": 5},
                {"step": 5, "action": "Niêm phong cách ly các lô thực phẩm có nguy cơ nhiễm khói, muội than, hóa chất dập lửa để QA thẩm định", "responsible": "Ban QLCL (QA)", "deadline_minutes": 30}
            ]
        ),
        EmergencyProcedure(
            procedure_code="EP-02",
            title="Quy trình Ứng phó Tràn Đổ Hóa Chất Tẩy Rửa & Khử Trùng",
            scenario_type="CHEMICAL_SPILL",
            likelihood=2,
            severity=4,
            risk_score=8,
            risk_level="MEDIUM",
            responsible_team="Tổ Vệ sinh CIP & An toàn môi trường",
            equipment_needed="Bộ kit chống tràn hóa chất (Spill kit), cát khô/chất thấm hút, đồ bảo hộ chống ăn mòn (găng tay nitrile, ủng cao su, mặt nạ phòng độc)",
            version="1.0",
            status="ACTIVE",
            immediate_actions=[
                {"step": 1, "action": "Cô lập khu vực tràn đổ hóa chất, treo biển cảnh báo nguy hiểm cấm người qua lại", "responsible": "Nhân viên khu vực", "deadline_minutes": 2},
                {"step": 2, "action": "Mang trang bị bảo hộ chuyên dụng (găng tay, ủng, kính, mặt nạ chống độc)", "responsible": "Đội ứng phó hóa chất", "deadline_minutes": 5},
                {"step": 3, "action": "Dùng cát khô hoặc phao hút quây chặn dòng chảy, ngăn không cho hóa chất chảy vào cống thoát nước chung", "responsible": "Đội ứng phó", "deadline_minutes": 10},
                {"step": 4, "action": "Thu gom hóa chất thấm hút vào thùng chứa nguy hại có nắp đậy kín để xử lý theo quy chế môi trường", "responsible": "Bộ phận môi trường", "deadline_minutes": 30},
                {"step": 5, "action": "Thẩm tra toàn bộ nguyên liệu, bán thành phẩm trong bán kính 10m xem có nguy cơ nhiễm chéo hơi độc hay không", "responsible": "QA Inspector", "deadline_minutes": 45}
            ]
        ),
        EmergencyProcedure(
            procedure_code="EP-03",
            title="Quy trình Xử lý Gián Đoạn Nguồn Cấp Nước Sạch Sản Xuất (Mất Nước)",
            scenario_type="WATER_OUTAGE",
            likelihood=3,
            severity=4,
            risk_score=12,
            risk_level="HIGH",
            responsible_team="Bộ phận Cơ điện & Ban QLCL (QA)",
            equipment_needed="Bể chứa nước ngầm dự phòng 200m3, trạm bơm tăng áp tự động, đồng hồ đo áp lực nước, bộ test nhanh clo dư và pH",
            version="1.1",
            status="ACTIVE",
            immediate_actions=[
                {"step": 1, "action": "Kích hoạt chuyển đổi hệ thống van sang bể nước ngầm dự phòng đã qua kiểm định an toàn", "responsible": "Kỹ thuật cấp thoát nước", "deadline_minutes": 5},
                {"step": 2, "action": "Liên hệ ngay Công ty Điện Nước An Giang (02963.841.258) xác minh thời gian dự kiến khôi phục nguồn cấp", "responsible": "Tổ hành chính", "deadline_minutes": 10},
                {"step": 3, "action": "Nếu lượng nước dự phòng chỉ còn đủ cho < 2 giờ sản xuất, thông báo Quản đốc tạm ngừng các công đoạn rửa nguyên liệu chính", "responsible": "Trưởng ban QA", "deadline_minutes": 30},
                {"step": 4, "action": "Khi có nước trở lại, bắt buộc xả bỏ 5m3 nước đầu đường ống và test nhanh nồng độ clo dư (0.2 - 0.5 mg/l) trước khi cho phép dùng lại", "responsible": "QC Lab", "deadline_minutes": 15}
            ]
        ),
        EmergencyProcedure(
            procedure_code="EP-04",
            title="Quy trình Ứng phó Sự Cố Mất Nguồn Điện Lưới (Mất Điện)",
            scenario_type="POWER_OUTAGE",
            likelihood=3,
            severity=4,
            risk_score=12,
            risk_level="HIGH",
            responsible_team="Bộ phận Cơ điện & Trưởng ca sản xuất",
            equipment_needed="Máy phát điện công nghiệp dự phòng 500kVA, tủ ATS chuyển mạch tự động, hệ thống đèn chiếu sáng sự cố (Emergency Light) 2 giờ",
            version="1.1",
            status="ACTIVE",
            immediate_actions=[
                {"step": 1, "action": "Kiểm tra tủ ATS tự động khởi động máy phát điện trong vòng 15 giây. Nếu ATS không kích hoạt, chuyển sang chế độ nổ tay", "responsible": "Kỹ thuật trực điện", "deadline_minutes": 1},
                {"step": 2, "action": "Ưu tiên cấp tải khẩn cấp cho: Kho lạnh bảo quản (-18°C), Hầm cấp đông IQF, và Phòng kiểm nghiệm QC", "responsible": "Tổ Điện", "deadline_minutes": 3},
                {"step": 3, "action": "Kiểm tra tình trạng bán thành phẩm đang dang dở trên dây chuyền (chả cá, trà, bánh mì) để che đậy chống nhiễm vi sinh", "responsible": "Trưởng ca sản xuất", "deadline_minutes": 5},
                {"step": 4, "action": "Ghi nhận nhật ký đo nhiệt độ kho lạnh mỗi 30 phút trong suốt thời gian mất điện lưới", "responsible": "Thủ kho lạnh", "deadline_minutes": 30}
            ]
        ),
        EmergencyProcedure(
            procedure_code="EP-05",
            title="Quy trình Xử lý Hỏng Máy Lạnh & Gián Đoạn Hệ Thống Làm Lạnh Kho",
            scenario_type="CHILLER_BREAKDOWN",
            likelihood=2,
            severity=5,
            risk_score=10,
            risk_level="HIGH",
            responsible_team="Tổ Cơ điện lạnh & Quản lý Kho",
            equipment_needed="Cụm máy nén lạnh dự phòng (Standby Compressor), đá vảy thực phẩm dự phòng, bạt cách nhiệt giữ nhiệt độ kho",
            version="1.0",
            status="ACTIVE",
            immediate_actions=[
                {"step": 1, "action": "Khởi động cụm máy nén lạnh dự phòng Standby B hoặc chuyển tải sang dàn bay hơi phụ", "responsible": "Kỹ sư điện lạnh", "deadline_minutes": 10},
                {"step": 2, "action": "Lập tức đóng kín toàn bộ cửa kho lạnh, buông rèm nhựa cách nhiệt, nghiêm cấm mở cửa không cần thiết", "responsible": "Thủ kho", "deadline_minutes": 5},
                {"step": 3, "action": "Nếu nhiệt độ kho tăng lên quá -12°C (nguy cơ vượt ngưỡng tới hạn), kích hoạt phương án di chuyển hàng sang kho đối tác dự phòng", "responsible": "Ban QLCL & Kho", "deadline_minutes": 60},
                {"step": 4, "action": "Gắn cờ cách ly (HOLD) toàn bộ lô hàng bị ảnh hưởng nhiệt độ để QC kiểm định chỉ tiêu vi sinh và histamine trước khi giải tỏa", "responsible": "QA Lead", "deadline_minutes": 120}
            ]
        ),
        EmergencyProcedure(
            procedure_code="EP-06",
            title="Quy trình Ứng phó Sự Cố Gián Đoạn Nguồn Hơi Cấp (Nồi Hơi / Lò Hơi)",
            scenario_type="STEAM_OUTAGE",
            likelihood=2,
            severity=4,
            risk_score=8,
            risk_level="MEDIUM",
            responsible_team="Tổ Vận hành Lò hơi & QC Phân xưởng",
            equipment_needed="Đồng hồ áp kế kiểm định, van an toàn xả áp, đường ống bypass hơi nước, bộ kiểm tra chất lượng nước cấp lò hơi",
            version="1.0",
            status="ACTIVE",
            immediate_actions=[
                {"step": 1, "action": "Kiểm tra áp suất nồi hơi và cô lập van hơi cấp vào các nồi tiệt trùng/hấp để tránh sụt áp đột ngột", "responsible": "Công nhân lò hơi", "deadline_minutes": 3},
                {"step": 2, "action": "Đối với các mẻ sản phẩm đang trong chu trình thanh trùng CCP: Ghi nhận thời gian gián đoạn và nhiệt độ thực tế của mẻ", "responsible": "QC Giám sát CCP", "deadline_minutes": 5},
                {"step": 3, "action": "Cách ly toàn bộ mẻ sản phẩm chưa hoàn thành đủ nhiệt độ - thời gian chuẩn theo kế hoạch HACCP", "responsible": "Đội HACCP", "deadline_minutes": 15},
                {"step": 4, "action": "Thực hiện hành động khắc phục: Hấp lại mẻ nếu quy trình cho phép hoặc chuyển xử lý hủy nếu vi phạm an toàn thực phẩm", "responsible": "Trưởng ca & QA", "deadline_minutes": 60}
            ]
        ),
        EmergencyProcedure(
            procedure_code="EP-07",
            title="Quy trình Phòng Vệ Thực Phẩm & Ứng Phó Phá Hoại, Khủng Bố Sinh/Hóa Học (Food Defense)",
            scenario_type="BIOTERRORISM_SABOTAGE",
            likelihood=1,
            severity=5,
            risk_score=5,
            risk_level="MEDIUM",
            responsible_team="Ban An ninh, Giám đốc & Ban QLCL",
            equipment_needed="Hệ thống camera an ninh CCTV 24/7, thẻ từ kiểm soát ra vào các khu vực nhạy cảm (bể nước, kho hóa chất, phòng trộn gia vị)",
            version="1.0",
            status="ACTIVE",
            immediate_actions=[
                {"step": 1, "action": "Lập tức phong tỏa khu vực nghi vấn bị đầu độc hoặc phá hoại; dừng hoạt động dây chuyền liên quan", "responsible": "Đội Bảo vệ & Quản đốc", "deadline_minutes": 5},
                {"step": 2, "action": "Báo cáo ngay cho Ban Giám đốc và Đội trưởng Đội Phòng vệ thực phẩm / HACCP", "responsible": "Quản đốc xưởng", "deadline_minutes": 10},
                {"step": 3, "action": "Khóa biệt trữ toàn bộ nguyên liệu, thành phẩm sản xuất trong khung giờ nghi vấn; trích xuất dữ liệu camera an ninh", "responsible": "QA Lead & IT", "deadline_minutes": 30},
                {"step": 4, "action": "Trình báo cơ quan công an địa phương và Chi cục ATTP để điều tra giám định mẫu hóa chất/vi sinh vật", "responsible": "Ban Giám đốc", "deadline_minutes": 60}
            ]
        ),
        EmergencyProcedure(
            procedure_code="EP-08",
            title="Quy trình Sơ Cấp Cứu & Xử Lý Tai Nạn Lao Động Nghiêm Trọng Trong Ca",
            scenario_type="WORK_ACCIDENT",
            likelihood=2,
            severity=4,
            risk_score=8,
            risk_level="MEDIUM",
            responsible_team="Tổ Sơ cấp cứu Y tế & An toàn lao động (HSE)",
            equipment_needed="Tủ thuốc cấp cứu, cáng cứu thương, nẹp cố định xương, băng vô trùng, dung dịch sát khuẩn",
            version="1.0",
            status="ACTIVE",
            immediate_actions=[
                {"step": 1, "action": "Ngắt nguồn máy móc gây tai nạn (nhấn nút dừng khẩn cấp E-Stop)", "responsible": "Công nhân đứng máy", "deadline_minutes": 1},
                {"step": 2, "action": "Cán bộ y tế tiến hành sơ cứu cầm máu, cố định vết thương tại chỗ", "responsible": "Cán bộ Y tế", "deadline_minutes": 3},
                {"step": 3, "action": "Gọi xe cấp cứu 115 hoặc dùng xe công ty chuyển nạn nhân đến Bệnh viện Đa khoa gần nhất", "responsible": "Tổ Hành chính", "deadline_minutes": 10},
                {"step": 4, "action": "Kiểm tra thu gom toàn bộ dị vật, máu hoặc dịch cơ thể tại hiện trường máy móc; vệ sinh khử trùng CIP toàn diện trước khi tái vận hành", "responsible": "QA & QC", "deadline_minutes": 45}
            ]
        ),
        EmergencyProcedure(
            procedure_code="EP-09",
            title="Quy trình Phòng Chống Thiên Tai, Bão Lũ & Kiểm Soát Dịch Bệnh Lây Nhiễm",
            scenario_type="NATURAL_DISASTER_EPIDEMIC",
            likelihood=2,
            severity=4,
            risk_score=8,
            risk_level="MEDIUM",
            responsible_team="Ban Chỉ huy Phòng chống thiên tai & Y tế",
            equipment_needed="Bao cát chống tràn lũ ngập, máy bơm chìm thoát nước, bạt che mái kho, máy đo thân nhiệt hồng ngoại, dung dịch khử khuẩn cồn 70%",
            version="1.0",
            status="ACTIVE",
            immediate_actions=[
                {"step": 1, "action": "Kê cao toàn bộ pallet hàng hóa trong kho tối thiểu 30cm so với mặt sàn khu vực trũng", "responsible": "Thủ kho", "deadline_minutes": 30},
                {"step": 2, "action": "Gia cố mái tôn nhà xưởng, che chắn cửa thông gió chống nước mưa và côn trùng xâm nhập", "responsible": "Đội bảo trì", "deadline_minutes": 60},
                {"step": 3, "action": "Khi có dịch bệnh truyền nhiễm: Thiết lập chốt kiểm dịch đo thân nhiệt, sát khuẩn tay 100% người vào xưởng", "responsible": "Y tế & Bảo vệ", "deadline_minutes": 15},
                {"step": 4, "action": "Tăng cường tần suất phun khử trùng tiêu độc toàn bộ khuôn viên nhà máy", "responsible": "Tổ vệ sinh môi trường", "deadline_minutes": 120}
            ]
        )
    ]

    for p in procedures_seed:
        db.add(p)

    # 3. Seed Drills
    today = date.today()
    drills_seed = [
        EmergencyDrill(
            drill_code="DRL-2026-01",
            title="Diễn tập Phương án PCCC & Cứu nạn Thoát hiểm Định kỳ Quý 1/2026",
            record_type="PLANNED_DRILL",
            scenario_type="FIRE_EXPLOSION",
            drill_date=today - timedelta(days=45),
            location="Phân xưởng Chế biến Cá tra & Kho Lạnh Trung tâm",
            participants_count=48,
            drill_leader="Lê Minh Trí (Chỉ huy PCCC) & Cán bộ Đội Cảnh sát PCCC 114",
            scenario_description="Giả định chập điện tại tủ điều khiển máy nén lạnh phát sinh cháy lớn, khói mù mịt lan sang khu chế biến. Toàn bộ công nhân sơ tán trong 3 phút, đội PCCC dùng 6 bình bột dập tắt trong 4 phút.",
            response_time_minutes=4,
            evaluation_result="EXCELLENT",
            corrective_actions_needed="Bổ sung thêm 2 đèn chiếu sáng sự cố tại lối thoát hiểm phía Tây kho lạnh.",
            notes="Có sự phối hợp giám sát và cấp giấy chứng nhận diễn tập của Cảnh sát PCCC tỉnh An Giang."
        ),
        EmergencyDrill(
            drill_code="DRL-2026-02",
            title="Diễn tập Giả định Sự cố Mất Điện Lưới & Kiểm Soát Nhiệt Độ Kho Lạnh",
            record_type="PLANNED_DRILL",
            scenario_type="POWER_OUTAGE",
            drill_date=today - timedelta(days=15),
            location="Trạm Biến áp 1000kVA & Kho Bảo Quản Đông Lạnh",
            participants_count=12,
            drill_leader="Phạm Quốc Bảo (Trưởng phòng Thiết bị)",
            scenario_description="Giả định cắt điện lưới đột ngột lúc 09:30. Tủ ATS tự khởi động máy phát 500kVA sau 12 giây. Kiểm tra cấp điện đầy đủ cho hệ thống làm lạnh, nhiệt độ kho duy trì ổn định ở -19°C.",
            response_time_minutes=1,
            evaluation_result="SATISFACTORY",
            corrective_actions_needed="Bảo dưỡng ắc quy đề của máy phát điện dự phòng trước mùa mưa bão.",
            notes="Hoàn thành tốt mục tiêu duy trì chuỗi lạnh ISO 22000."
        ),
        EmergencyDrill(
            drill_code="INC-2026-01",
            title="Báo cáo Xử lý Sự cố Thực tế: Bể Ống Cấp Nước Sạch Phân Xưởng Sơ Chế",
            record_type="ACTUAL_INCIDENT",
            scenario_type="WATER_OUTAGE",
            drill_date=today - timedelta(days=5),
            location="Đường ống PVC D90 nhánh cấp xưởng sơ chế 01",
            participants_count=8,
            drill_leader="Phạm Quốc Bảo (Kỹ thuật) & Nguyễn Văn An (QA)",
            scenario_description="Lúc 14:15 phát hiện đường ống nước rửa bị nứt vỡ do xe nâng va quẹt nhẹ. Nước cấp bị rò rỉ làm giảm áp lực. Tổ kỹ thuật khóa van phân đoạn trong 3 phút, chuyển dùng nước từ bồn trung gian và hàn nối xong sau 25 phút.",
            response_time_minutes=28,
            evaluation_result="SATISFACTORY",
            corrective_actions_needed="Lắp thêm khung thép bảo vệ chống va chạm quanh các trụ đường ống nước trong xưởng (Phiếu CAPA-2026-008).",
            notes="Sự cố được xử lý nhanh, không làm nhiễm bẩn nguyên liệu và không ảnh hưởng đến chất lượng mẻ hàng."
        )
    ]

    for d in drills_seed:
        db.add(d)

    db.commit()


# ==================== 1. KPI STATS ENDPOINT ====================
@router.get("/stats", response_model=EmergencyStatsResponse)
def get_emergency_stats(db: Session = Depends(get_db)):
    seed_emergency_data_if_empty(db)

    total_c = db.query(EmergencyContact).filter(EmergencyContact.is_active == True).count()
    internal_c = db.query(EmergencyContact).filter(EmergencyContact.is_active == True, EmergencyContact.contact_type == "INTERNAL").count()
    external_c = db.query(EmergencyContact).filter(EmergencyContact.is_active == True, EmergencyContact.contact_type == "EXTERNAL").count()
    
    total_p = db.query(EmergencyProcedure).filter(EmergencyProcedure.status == "ACTIVE").count()
    high_risk_p = db.query(EmergencyProcedure).filter(EmergencyProcedure.risk_level.in_(["HIGH", "CRITICAL"])).count()

    curr_year = date.today().year
    drills_this_year = db.query(EmergencyDrill).filter(func.extract('year', EmergencyDrill.drill_date) == curr_year).count()

    latest_drill = db.query(EmergencyDrill).order_by(desc(EmergencyDrill.drill_date)).first()
    last_d = latest_drill.drill_date if latest_drill else None

    return EmergencyStatsResponse(
        total_contacts=total_c,
        internal_contacts=internal_c,
        external_contacts=external_c,
        total_procedures=total_p,
        high_risk_scenarios=high_risk_p,
        total_drills_this_year=drills_this_year,
        last_drill_date=last_d
    )


# ==================== 2. CONTACTS ENDPOINTS ====================
@router.get("/contacts", response_model=List[EmergencyContactResponse])
def get_emergency_contacts(
    contact_type: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_emergency_data_if_empty(db)
    query = db.query(EmergencyContact).filter(EmergencyContact.is_active == True)

    if contact_type and contact_type != "ALL":
        query = query.filter(EmergencyContact.contact_type == contact_type)

    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                EmergencyContact.name.ilike(search),
                EmergencyContact.organization_or_role.ilike(search),
                EmergencyContact.phone.ilike(search),
                EmergencyContact.notes.ilike(search)
            )
        )

    contacts = query.order_by(asc(EmergencyContact.priority_order), asc(EmergencyContact.name)).all()
    return contacts


@router.post("/contacts", response_model=EmergencyContactResponse, status_code=status.HTTP_201_CREATED)
def create_emergency_contact(contact_in: EmergencyContactCreate, db: Session = Depends(get_db)):
    contact = EmergencyContact(**contact_in.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.put("/contacts/{contact_id}", response_model=EmergencyContactResponse)
def update_emergency_contact(contact_id: UUID, contact_in: EmergencyContactUpdate, db: Session = Depends(get_db)):
    contact = db.query(EmergencyContact).filter(EmergencyContact.contact_id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh bạ khẩn cấp.")

    update_data = contact_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(contact, field, val)

    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/contacts/{contact_id}")
def delete_emergency_contact(contact_id: UUID, db: Session = Depends(get_db)):
    contact = db.query(EmergencyContact).filter(EmergencyContact.contact_id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh bạ.")

    db.delete(contact)
    db.commit()
    return {"message": "Đã xóa liên hệ khỏi danh bạ khẩn cấp."}


# ==================== 3. PROCEDURES ENDPOINTS ====================
@router.get("/procedures", response_model=List[EmergencyProcedureResponse])
def get_emergency_procedures(
    scenario_type: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_emergency_data_if_empty(db)
    query = db.query(EmergencyProcedure)

    if scenario_type and scenario_type != "ALL":
        query = query.filter(EmergencyProcedure.scenario_type == scenario_type)

    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                EmergencyProcedure.procedure_code.ilike(search),
                EmergencyProcedure.title.ilike(search),
                EmergencyProcedure.responsible_team.ilike(search)
            )
        )

    procedures = query.order_by(desc(EmergencyProcedure.risk_score), asc(EmergencyProcedure.procedure_code)).all()
    return procedures


@router.post("/procedures", response_model=EmergencyProcedureResponse, status_code=status.HTTP_201_CREATED)
def create_emergency_procedure(proc_in: EmergencyProcedureCreate, db: Session = Depends(get_db)):
    code_str = proc_in.procedure_code.strip()
    existing = db.query(EmergencyProcedure).filter(EmergencyProcedure.procedure_code == code_str).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã quy trình khẩn cấp '{code_str}' đã tồn tại.")

    data = proc_in.model_dump()
    # Tự động tính toán Risk Score & Level nếu chưa có
    l = data.get("likelihood", 2)
    s = data.get("severity", 3)
    score = l * s
    data["risk_score"] = score
    if score >= 16:
        data["risk_level"] = "CRITICAL"
    elif score >= 10:
        data["risk_level"] = "HIGH"
    elif score >= 5:
        data["risk_level"] = "MEDIUM"
    else:
        data["risk_level"] = "LOW"

    proc = EmergencyProcedure(**data)
    db.add(proc)
    db.commit()
    db.refresh(proc)
    return proc


@router.put("/procedures/{procedure_id}", response_model=EmergencyProcedureResponse)
def update_emergency_procedure(procedure_id: UUID, proc_in: EmergencyProcedureUpdate, db: Session = Depends(get_db)):
    proc = db.query(EmergencyProcedure).filter(EmergencyProcedure.procedure_id == procedure_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình khẩn cấp.")

    update_data = proc_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(proc, field, val)

    # Cập nhật điểm rủi ro L x S
    proc.risk_score = proc.likelihood * proc.severity
    if proc.risk_score >= 16:
        proc.risk_level = "CRITICAL"
    elif proc.risk_score >= 10:
        proc.risk_level = "HIGH"
    elif proc.risk_score >= 5:
        proc.risk_level = "MEDIUM"
    else:
        proc.risk_level = "LOW"

    db.commit()
    db.refresh(proc)
    return proc


@router.delete("/procedures/{procedure_id}")
def delete_emergency_procedure(procedure_id: UUID, db: Session = Depends(get_db)):
    proc = db.query(EmergencyProcedure).filter(EmergencyProcedure.procedure_id == procedure_id).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình.")

    db.delete(proc)
    db.commit()
    return {"message": "Đã xóa quy trình khẩn cấp."}


# ==================== 4. DRILLS ENDPOINTS ====================
@router.get("/drills", response_model=List[EmergencyDrillResponse])
def get_emergency_drills(
    record_type: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    seed_emergency_data_if_empty(db)
    query = db.query(EmergencyDrill)

    if record_type and record_type != "ALL":
        query = query.filter(EmergencyDrill.record_type == record_type)

    if q and q.strip():
        search = f"%{q.strip()}%"
        query = query.filter(
            or_(
                EmergencyDrill.drill_code.ilike(search),
                EmergencyDrill.title.ilike(search),
                EmergencyDrill.drill_leader.ilike(search),
                EmergencyDrill.location.ilike(search)
            )
        )

    drills = query.order_by(desc(EmergencyDrill.drill_date)).all()
    return drills


@router.post("/drills", response_model=EmergencyDrillResponse, status_code=status.HTTP_201_CREATED)
def create_emergency_drill(drill_in: EmergencyDrillCreate, db: Session = Depends(get_db)):
    code_str = drill_in.drill_code.strip()
    existing = db.query(EmergencyDrill).filter(EmergencyDrill.drill_code == code_str).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã hồ sơ diễn tập '{code_str}' đã tồn tại.")

    drill = EmergencyDrill(**drill_in.model_dump())
    db.add(drill)
    db.commit()
    db.refresh(drill)
    return drill


@router.put("/drills/{drill_id}", response_model=EmergencyDrillResponse)
def update_emergency_drill(drill_id: UUID, drill_in: EmergencyDrillUpdate, db: Session = Depends(get_db)):
    drill = db.query(EmergencyDrill).filter(EmergencyDrill.drill_id == drill_id).first()
    if not drill:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ diễn tập.")

    update_data = drill_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(drill, field, val)

    db.commit()
    db.refresh(drill)
    return drill


@router.delete("/drills/{drill_id}")
def delete_emergency_drill(drill_id: UUID, db: Session = Depends(get_db)):
    drill = db.query(EmergencyDrill).filter(EmergencyDrill.drill_id == drill_id).first()
    if not drill:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ diễn tập.")

    db.delete(drill)
    db.commit()
    return {"message": "Đã xóa hồ sơ diễn tập sự cố."}
