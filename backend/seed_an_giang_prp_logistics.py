import os
import uuid
from datetime import date, datetime
import dotenv
from sqlalchemy.orm import Session

dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
from app.core.database import SessionLocal
from app.modules.haccp.models import (
    PestControlLog,
    AllergenControl,
    VisitorHealthDeclaration,
    FirstAidLog,
    VehicleInspectionLog,
)

def seed_prp_and_logistics_data():
    db: Session = SessionLocal()
    try:
        print("[SEED] Bắt đầu nạp dữ liệu chuẩn hồ sơ An Giang (PRP & Logistics)...")

        # 1. PEST CONTROL LOGS (BM01-SVGH)
        existing_pcl = db.query(PestControlLog).first()
        if not existing_pcl:
            traps_data_1 = [
                {"trap_number": "01", "location": "Cổng bảo vệ & Hàng rào phía Đông", "trap_type": "Bẫy chuột hộp bả", "status": "Tốt", "bait_status": "Còn mồi", "pests_caught": 0, "notes": ""},
                {"trap_number": "02", "location": "Hàng rào giáp khu lưu giữ rác thải", "trap_type": "Bẫy chuột hộp bả", "status": "Tốt", "bait_status": "Còn mồi", "pests_caught": 1, "notes": "Bắt 1 chuột cống, đã xử lý tiêu hủy và rải vôi bột"},
                {"trap_number": "03", "location": "Phía ngoài cửa kho nguyên liệu nông sản", "trap_type": "Bẫy lồng chuột", "status": "Tốt", "bait_status": "Còn mồi", "pests_caught": 0, "notes": ""},
                {"trap_number": "04", "location": "Cửa ra vào khu sơ chế rửa thái", "trap_type": "Đèn bắt côn trùng keo", "status": "Tốt", "bait_status": "Tấm dính mới", "pests_caught": 8, "notes": "Dính 8 thiêu thân nhỏ"},
                {"trap_number": "05", "location": "Hành lang phòng đệm xưởng sản xuất", "trap_type": "Đèn bắt côn trùng keo", "status": "Tốt", "bait_status": "Tấm dính tốt", "pests_caught": 2, "notes": ""},
                {"trap_number": "06", "location": "Cửa kho sấy & làm nguội", "trap_type": "Bẫy keo chuột", "status": "Tốt", "bait_status": "Keo tốt", "pests_caught": 0, "notes": ""},
                {"trap_number": "07", "location": "Khu vực nghiền và sàng lọc bột", "trap_type": "Đèn bắt côn trùng keo", "status": "Tốt", "bait_status": "Tấm dính tốt", "pests_caught": 3, "notes": ""},
                {"trap_number": "08", "location": "Cửa kho bao bì & phụ liệu", "trap_type": "Bẫy chuột hộp bả", "status": "Tốt", "bait_status": "Còn mồi", "pests_caught": 0, "notes": ""},
                {"trap_number": "09", "location": "Cửa xuất hàng kho thành phẩm", "trap_type": "Bẫy keo chuột", "status": "Tốt", "bait_status": "Keo tốt", "pests_caught": 0, "notes": ""},
                {"trap_number": "10", "location": "Khu phụ trợ lò hơi - máy nén khí", "trap_type": "Bẫy lồng chuột", "status": "Tốt", "bait_status": "Còn mồi", "pests_caught": 0, "notes": ""},
            ]
            pcl1 = PestControlLog(
                log_code="PCL-20260922-01",
                check_date=date(2026, 9, 22),
                inspector_name="Trần Văn Minh",
                trap_locations=traps_data_1,
                total_pests_caught=11,
                corrective_actions="Tiêu hủy xác chuột tại bẫy số 02 theo đúng quy chuẩn môi trường; vệ sinh và thay tấm keo dính đèn côn trùng số 04.",
                status="COMPLETED"
            )

            traps_data_2 = [
                {"trap_number": "01", "location": "Cổng bảo vệ & Hàng rào phía Đông", "trap_type": "Bẫy chuột hộp bả", "status": "Tốt", "bait_status": "Còn mồi", "pests_caught": 0, "notes": ""},
                {"trap_number": "02", "location": "Hàng rào giáp khu lưu giữ rác thải", "trap_type": "Bẫy chuột hộp bả", "status": "Tốt", "bait_status": "Còn mồi", "pests_caught": 0, "notes": "Mồi mới thay"},
                {"trap_number": "03", "location": "Phía ngoài cửa kho nguyên liệu nông sản", "trap_type": "Bẫy lồng chuột", "status": "Tốt", "bait_status": "Còn mồi", "pests_caught": 0, "notes": ""},
                {"trap_number": "04", "location": "Cửa ra vào khu sơ chế rửa thái", "trap_type": "Đèn bắt côn trùng keo", "status": "Tốt", "bait_status": "Tấm dính tốt", "pests_caught": 3, "notes": "3 côn trùng nhỏ"},
                {"trap_number": "05", "location": "Hành lang phòng đệm xưởng sản xuất", "trap_type": "Đèn bắt côn trùng keo", "status": "Tốt", "bait_status": "Tấm dính tốt", "pests_caught": 1, "notes": ""},
                {"trap_number": "06", "location": "Cửa kho sấy & làm nguội", "trap_type": "Bẫy keo chuột", "status": "Tốt", "bait_status": "Keo tốt", "pests_caught": 0, "notes": ""},
                {"trap_number": "07", "location": "Khu vực nghiền và sàng lọc bột", "trap_type": "Đèn bắt côn trùng keo", "status": "Tốt", "bait_status": "Tấm dính tốt", "pests_caught": 0, "notes": ""},
                {"trap_number": "08", "location": "Cửa kho bao bì & phụ liệu", "trap_type": "Bẫy chuột hộp bả", "status": "Tốt", "bait_status": "Còn mồi", "pests_caught": 0, "notes": ""},
                {"trap_number": "09", "location": "Cửa xuất hàng kho thành phẩm", "trap_type": "Bẫy keo chuột", "status": "Tốt", "bait_status": "Keo tốt", "pests_caught": 0, "notes": ""},
                {"trap_number": "10", "location": "Khu phụ trợ lò hơi - máy nén khí", "trap_type": "Bẫy lồng chuột", "status": "Tốt", "bait_status": "Còn mồi", "pests_caught": 0, "notes": ""},
            ]
            pcl2 = PestControlLog(
                log_code="PCL-20260929-01",
                check_date=date(2026, 9, 29),
                inspector_name="Trần Văn Minh",
                trap_locations=traps_data_2,
                total_pests_caught=4,
                corrective_actions="Hệ thống bẫy hoạt động ổn định, không phát hiện chuột trong khu vực xưởng.",
                status="COMPLETED"
            )
            db.add_all([pcl1, pcl2])
            print("  -> Đã tạo 2 nhật ký kiểm tra bẫy côn trùng & chuột (BM01-SVGH).")

        # 2. ALLERGEN CONTROLS (BM01-CGDU)
        existing_alg = db.query(AllergenControl).first()
        if not existing_alg:
            alg1 = AllergenControl(
                allergen_code="ALG-001",
                material_name="Bột đạm đậu nành (Soy Protein Isolate)",
                allergen_types="Đậu nành (Soybeans)",
                is_contained_in_product=True,
                cross_contact_risk_stage="Công đoạn định lượng, phối trộn và cối nghiền tinh",
                preventive_measures="Dán nhãn tem màu vàng cảnh báo dị nguyên; bố trí thùng chứa và muỗng xúc riêng biệt; rửa sạch và lau cồn dây chuyền trước khi chuyển sang mẻ không chứa đậu nành.",
                responsible_person="Lê Văn Long (Tổ trưởng Pha chế)",
                status="ACTIVE"
            )
            alg2 = AllergenControl(
                allergen_code="ALG-002",
                material_name="Bột mì thượng hạng làm bánh",
                allergen_types="Gluten lúa mì (Cereals containing gluten)",
                is_contained_in_product=True,
                cross_contact_risk_stage="Công đoạn cân trộn bột khô phát tán bụi",
                preventive_measures="Trộn trong buồng kín có quạt hút bụi màng lọc HEPA; công nhân mặc trang phục BHLĐ chuyên dụng và thay đồ trước khi qua phòng đóng gói miến.",
                responsible_person="Nguyễn Hoàng Nam (Phó phòng SX)",
                status="ACTIVE"
            )
            alg3 = AllergenControl(
                allergen_code="ALG-003",
                material_name="Mè trắng rang thơm (Hạt vừng)",
                allergen_types="Mè / Vừng (Sesame seeds)",
                is_contained_in_product=False,
                cross_contact_risk_stage="Kho phụ liệu và đóng gói phụ kiện",
                preventive_measures="Bảo quản trong thùng nhựa kín đậy nắp, có khóa seal; tuyệt đối không mở bao bì trong khu vực chế biến mở.",
                responsible_person="Võ Thị Lệ (Thủ kho phụ liệu)",
                status="ACTIVE"
            )
            alg4 = AllergenControl(
                allergen_code="ALG-004",
                material_name="Bột tôm nguyên chất sấy thăng hoa",
                allergen_types="Hải sản giáp xác (Crustaceans)",
                is_contained_in_product=True,
                cross_contact_risk_stage="Máy trộn gia vị và phễu đóng gói tự động",
                preventive_measures="Chỉ sản xuất vào cuối ca làm việc; thực hiện tổng vệ sinh CIP ướt và kiểm tra test swab dị nguyên âm tính trước khi khởi động ca mới.",
                responsible_person="Huỳnh Quốc Bảo (KTV QA)",
                status="ACTIVE"
            )
            db.add_all([alg1, alg2, alg3, alg4])
            print("  -> Đã tạo 4 danh mục kiểm soát chất gây dị ứng (BM01-CGDU).")

        # 3. VISITOR HEALTH DECLARATIONS (BM03-KSSK)
        existing_vhd = db.query(VisitorHealthDeclaration).first()
        if not existing_vhd:
            vhd1 = VisitorHealthDeclaration(
                declaration_code="VHD-20260925-01",
                visit_date=date(2026, 9, 25),
                visitor_name="Nguyễn Văn Thành",
                company_name="Công ty Cổ phần Đo lường & Hiệu chuẩn Mekong",
                purpose_of_visit="Hiệu chuẩn định kỳ cân điện tử phân tích và khúc xạ đo brix",
                has_diarrhea=False,
                has_fever_cough=False,
                has_open_wound=False,
                visited_epidemic_area=False,
                is_approved_entry=True,
                escort_person="Lê Hoàng Nam (KTV Thiết bị)",
                commitment_signed=True,
                notes="Đã trang bị mũ trùm tóc, khẩu trang, áo blouse và bọc giày phòng sạch trước khi vào xưởng."
            )
            vhd2 = VisitorHealthDeclaration(
                declaration_code="VHD-20260928-01",
                visit_date=date(2026, 9, 28),
                visitor_name="Trần Thị Thu Hà",
                company_name="Chi cục An toàn Vệ sinh Thực phẩm Tỉnh An Giang",
                purpose_of_visit="Kiểm tra thẩm định điều kiện cơ sở đủ điều kiện ATTP định kỳ năm 2026",
                has_diarrhea=False,
                has_fever_cough=False,
                has_open_wound=False,
                visited_epidemic_area=False,
                is_approved_entry=True,
                escort_person="Nguyễn Văn An (Trưởng Ban ISO & QA)",
                commitment_signed=True,
                notes="Thực hiện đầy đủ quy trình rửa tay sát khuẩn 6 bước và sấy tay trước khi qua cửa vô trùng."
            )
            vhd3 = VisitorHealthDeclaration(
                declaration_code="VHD-20260929-01",
                visit_date=date(2026, 9, 29),
                visitor_name="Lê Minh Tuấn",
                company_name="Công ty Cơ khí Chế tạo Máy Hải Nam",
                purpose_of_visit="Khảo sát lắp đặt băng tải làm nguội tự động",
                has_diarrhea=False,
                has_fever_cough=True,  # Có sốt nhẹ
                has_open_wound=True,   # Có vết xước hở
                visited_epidemic_area=False,
                is_approved_entry=False, # Không đủ điều kiện vào khu sản xuất mở
                escort_person="Phạm Văn Dũng (Tổ trưởng Cơ điện)",
                commitment_signed=True,
                notes="Khách có triệu chứng sốt và vết thương hở chưa băng chống thấm. Đã từ chối vào khu chế biến thực phẩm; chỉ làm việc tại phòng họp ngoài khu vực sản xuất."
            )
            db.add_all([vhd1, vhd2, vhd3])
            print("  -> Đã tạo 3 phiếu khai báo y tế khách tham quan / nhà thầu (BM03-KSSK).")

        # 4. FIRST AID CABINET LOGS (BM01-KSSK)
        existing_fal = db.query(FirstAidLog).first()
        if not existing_fal:
            fal1 = FirstAidLog(
                log_code="FAL-20260924-01",
                issue_date=date(2026, 9, 24),
                recipient_name="Phạm Thị Mai",
                department="Tổ Sơ chế rửa thái",
                reason_symptom="Vô ý đứt nhẹ mu ngón trỏ tay trái khi gọt vỏ nông sản",
                supplies_provided="Dung dịch cồn đỏ Povidine 10%, 02 miếng băng dán cá nhân Urgo chống thấm nước",
                quantity=2,
                dispenser_name="Trần Kim Oanh (Y tá kiêm KTV QA)",
                status_after_aid="Vết thương nhỏ đã cầm máu và băng kín chống thấm, đeo thêm găng tay cao su y tế, tiếp tục làm việc bình thường.",
                notes="Nhắc nhở công nhân chú ý thao tác cầm dao gọt củ đúng kỹ thuật."
            )
            fal2 = FirstAidLog(
                log_code="FAL-20260927-01",
                issue_date=date(2026, 9, 27),
                recipient_name="Lê Văn Hùng",
                department="Tổ Sấy & Lò hơi",
                reason_symptom="Hoa mắt, mệt mỏi do làm việc tại khu vực nhiệt độ cao phòng sấy",
                supplies_provided="01 gói bột bù nước điện giải Oresol pha 200ml nước ấm, 01 viên sủi Vitamin C",
                quantity=2,
                dispenser_name="Trần Kim Oanh (Y tá kiêm KTV QA)",
                status_after_aid="Nghỉ ngơi tại phòng y tế thoáng mát 30 phút, thân nhiệt ổn định 36.6°C, hồi phục tốt.",
                notes="Đã kiểm tra hệ thống quạt thông gió buồng sấy hoạt động bình thường."
            )
            fal3 = FirstAidLog(
                log_code="FAL-20260929-01",
                issue_date=date(2026, 9, 29),
                recipient_name="Đặng Quốc Tuấn",
                department="Kho Thành phẩm",
                reason_symptom="Trầy xước nhẹ cẳng tay do cấn cạnh pallet gỗ",
                supplies_provided="Nước muối sinh lý NaCl 0.9%, gạc tiệt trùng và băng cuộn y tế",
                quantity=1,
                dispenser_name="Huỳnh Quốc Bảo (KTV QA)",
                status_after_aid="Đã sát khuẩn và băng ép nhẹ, tiếp tục vận hành xe nâng hàng.",
                notes="Kiểm tra lại toàn bộ pallet gỗ trong kho, loại bỏ các pallet nứt toác có dằm nhọn."
            )
            db.add_all([fal1, fal2, fal3])
            print("  -> Đã tạo 3 nhật ký cấp phát tủ thuốc y tế sơ cứu xưởng (BM01-KSSK).")

        # 5. VEHICLE INSPECTION LOGS (BM01-PTVC)
        existing_vic = db.query(VehicleInspectionLog).first()
        if not existing_vic:
            vic1 = VehicleInspectionLog(
                inspection_code="VIC-20260926-01",
                inspection_date=date(2026, 9, 26),
                customer_name="Công ty Cổ phần Bích Chi - Đồng Tháp",
                vehicle_type="Xe tải thùng kín 5 tấn",
                license_plate="67C-089.45",
                driver_name="Huỳnh Văn Lợi",
                check_registration_valid=True,
                check_clean_floor=True,
                check_no_odor=True,
                check_no_pests=True,
                check_enclosed_tarp=True,
                overall_result="PASSED",
                inspector_name="Trần Văn Minh (Thủ kho)",
                corrective_action="Không cần khắc phục. Cho phép bốc 150 thùng miến dong khô xuất kho."
            )
            vic2 = VehicleInspectionLog(
                inspection_code="VIC-20260928-01",
                inspection_date=date(2026, 9, 28),
                customer_name="Hệ thống Siêu thị Co.opmart Long Xuyên",
                vehicle_type="Xe tải thùng lạnh 2.5 tấn",
                license_plate="67C-145.22",
                driver_name="Võ Quốc Tuấn",
                check_registration_valid=True,
                check_clean_floor=True,
                check_no_odor=True,
                check_no_pests=True,
                check_enclosed_tarp=True,
                overall_result="PASSED",
                inspector_name="Trần Văn Minh (Thủ kho)",
                corrective_action="Nhiệt độ thùng lạnh đạt 18°C, sàn xe khô ráo sạch sẽ. Đủ điều kiện xếp hàng."
            )
            vic3 = VehicleInspectionLog(
                inspection_code="VIC-20260929-01",
                inspection_date=date(2026, 9, 29),
                customer_name="Đại lý Nông sản Vĩnh Long",
                vehicle_type="Xe tải thùng bạt 8 tấn",
                license_plate="65C-032.18",
                driver_name="Nguyễn Thanh Phong",
                check_registration_valid=True,
                check_clean_floor=False, # Sàn có vết dầu
                check_no_odor=False,     # Có mùi dầu nhớt
                check_no_pests=True,
                check_enclosed_tarp=False,# Bạt rách
                overall_result="REJECTED",
                inspector_name="Trần Văn Minh (Thủ kho)",
                corrective_action="Từ chối bốc hàng lên xe. Yêu cầu tài xế dùng xà phòng tẩy sạch vết dầu nhớt trên sàn và thay bạt che mới kín chống nước mưa trước khi quay lại bốc hàng."
            )
            db.add_all([vic1, vic2, vic3])
            print("  -> Đã tạo 3 biên bản kiểm tra phương tiện vận chuyển trước xuất hàng (BM01-PTVC).")

        db.commit()
        print("[SEED] Hoàn tất nạp dữ liệu An Giang thành công!")
    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR]: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_prp_and_logistics_data()
