"""
Seed dữ liệu mẫu thực tế chuẩn hóa từ Hệ thống tài liệu ISO 22000 An Giang
- Phụ lục 1: Nhu cầu & mong đợi của các bên quan tâm (Interested Parties)
- Phụ lục 2 & 4: Sổ đánh giá rủi ro & cơ hội bối cảnh (Context Risks)
- Thư mục 14: Kế hoạch đào tạo, Phiếu đề xuất đào tạo (BM01), Đánh giá sau đào tạo (BM04)
- Thư mục 09: Nhật ký kiểm tra máy dò kim loại (BM06-KSQT) & Kiểm soát công đoạn chế biến (BM01-05 KSQT)
"""

import uuid
from datetime import date, datetime, timedelta
from dotenv import load_dotenv
load_dotenv(".env")

from app.core.database import SessionLocal
from app.modules.organization.models import InterestedParty, ContextRisk
from app.modules.audits.models import TrainingCourse, TrainingParticipantRecord, TrainingRequest, TrainingEvaluation
from app.modules.haccp.models import MetalDetectorLog, InProcessQCLog


def seed_all():
    db = SessionLocal()
    print("=== BẮT ĐẦU SEED DỮ LIỆU AN GIANG ===")

    # 1. SEED INTERESTED PARTIES (PHỤ LỤC 1)
    if db.query(InterestedParty).count() == 0:
        parties_data = [
            {
                "party_name": "Người lao động (CBCNV Công ty)",
                "party_type": "INTERNAL",
                "needs_and_expectations": "Môi trường làm việc an toàn, đảm bảo vệ sinh; được đào tạo kiến thức chuyên môn, ATTP và trang bị đầy đủ bảo hộ lao động; chính sách lương thưởng phúc lợi rõ ràng.",
                "statutory_requirements": "Luật An toàn vệ sinh lao động, Thông tư 14/2013/TT-BYT về khám sức khỏe định kỳ.",
                "monitoring_method": "Khảo sát ý kiến nhân viên, kiểm tra sức khỏe hàng năm, giám sát vệ sinh ca.",
                "review_frequency": "Hàng năm",
                "responsible_role": "Phòng Hành chính - Nhân sự",
                "status": "ACTIVE",
            },
            {
                "party_name": "Khách hàng & Người tiêu dùng",
                "party_type": "EXTERNAL",
                "needs_and_expectations": "Sản phẩm đồng nhất về chất lượng, an toàn thực phẩm, không chứa kim loại/dị vật/dư lượng độc hại; giao hàng đúng tiến độ; thông tin ghi nhãn và hạn dùng minh bạch.",
                "statutory_requirements": "Luật An toàn thực phẩm số 55/2010/QH12, Nghị định 15/2018/NĐ-CP, Nghị định 43/2017/NĐ-CP về nhãn hàng hóa.",
                "monitoring_method": "Khảo sát mức độ hài lòng khách hàng, đường dây nóng hotline, giải quyết khiếu nại.",
                "review_frequency": "Định kỳ 6 tháng",
                "responsible_role": "Phòng Kinh doanh & Ban QLCL",
                "status": "ACTIVE",
            },
            {
                "party_name": "Nhà cung cấp Nguyên vật liệu & Bao bì",
                "party_type": "EXTERNAL",
                "needs_and_expectations": "Hợp đồng mua hàng rõ ràng, thanh toán đúng hạn; tiêu chuẩn kỹ thuật nguyên vật liệu (tiêu chuẩn củ dong, nông sản tươi, màng nilon) minh bạch, ổn định đơn hàng.",
                "statutory_requirements": "Hợp đồng thương mại, cam kết an toàn thực phẩm, chứng nhận VietGAP / Giấy chứng nhận cơ sở đủ điều kiện ATTP.",
                "monitoring_method": "Đánh giá nhà cung cấp định kỳ theo Quy trình Mua hàng (QT-QTMH), kiểm tra chất lượng từng lô hàng (BM01-KTNL).",
                "review_frequency": "Hàng năm / Mỗi lô nhập",
                "responsible_role": "Phòng Cung ứng vật tư & QC",
                "status": "ACTIVE",
            },
            {
                "party_name": "Cơ quan Quản lý Nhà nước (Chi cục ATVSTP, Quản lý thị trường)",
                "party_type": "EXTERNAL",
                "needs_and_expectations": "Tuân thủ nghiêm ngặt các quy định pháp luật về điều kiện cơ sở sản xuất, kiểm nghiệm định kỳ, tự công bố sản phẩm và báo cáo định kỳ về an toàn thực phẩm.",
                "statutory_requirements": "Nghị định 15/2018/NĐ-CP, Quy chuẩn QCVN về nguồn nước, vi sinh vật, kim loại nặng, phụ gia thực phẩm.",
                "monitoring_method": "Rà soát cập nhật văn bản pháp luật, tiếp đoàn thanh tra kiểm tra, lưu trữ hồ sơ tự công bố sản phẩm.",
                "review_frequency": "Hàng quý",
                "responsible_role": "Ban Giám đốc & Ban QLCL & ATTP",
                "status": "ACTIVE",
            },
            {
                "party_name": "Tổ chức Chứng nhận Hệ thống (ISO 22000)",
                "party_type": "EXTERNAL",
                "needs_and_expectations": "Duy trì tính hiệu lực và liên tục của Hệ thống quản lý ATTP theo tiêu chuẩn ISO 22000:2018; thực hiện đánh giá nội bộ và xem xét của lãnh đạo đầy đủ.",
                "statutory_requirements": "Tiêu chuẩn quốc gia TCVN ISO 22000:2018, quy tắc chứng nhận.",
                "monitoring_method": "Đánh giá nội bộ định kỳ, báo cáo xem xét lãnh đạo, phối hợp đánh giá giám sát hàng năm.",
                "review_frequency": "Hàng năm",
                "responsible_role": "Đội trưởng Đội ATTP / Ban ISO",
                "status": "ACTIVE",
            },
        ]
        created_parties = []
        for p in parties_data:
            party = InterestedParty(**p)
            db.add(party)
            created_parties.append(party)
        db.commit()
        print(f"✓ Đã nạp {len(created_parties)} bên quan tâm từ Phụ lục 1 An Giang.")
    else:
        print("✓ Bảng interested_parties đã có dữ liệu, bỏ qua seed mới.")

    # 2. SEED CONTEXT RISKS (PHỤ LỤC 2 & 4)
    if db.query(ContextRisk).count() == 0:
        risks_data = [
            {
                "code": "CR-01",
                "issue_category": "INTERNAL",
                "issue_description": "Tổn thất kiến thức chuyên môn của người lao động (kiến thức tổ chức) khi nhân viên nghỉ việc hoặc thuyên chuyển công tác.",
                "risk_description": "Công nhân mới chưa nắm vững điểm kiểm soát tới hạn CCP, quy chế vệ sinh hoặc kỹ thuật máy móc dẫn đến sai sót sản xuất.",
                "opportunity_description": "Chuẩn hóa tài liệu đào tạo nội bộ, quy trình thao tác chuẩn SOP và chính sách đãi ngộ giữ chân nhân sự cốt cán.",
                "likelihood": 3,
                "severity": 3,
                "risk_score": 9,
                "treatment_strategy": "MITIGATE",
                "action_plan": "Xây dựng hệ thống bài giảng đào tạo chuyên môn từng vị trí; áp dụng kèm cặp 1-1; thiết lập quy chế đánh giá thi đua khen thưởng hàng tháng.",
                "responsible_role": "Phòng Hành chính - Nhân sự",
                "target_date": date.today() + timedelta(days=90),
                "status": "CONTROLLED",
                "residual_likelihood": 1,
                "residual_severity": 2,
                "residual_risk_score": 2,
            },
            {
                "code": "CR-02",
                "issue_category": "INTERNAL",
                "issue_description": "Sức khỏe nhân viên trực tiếp sản xuất không đảm bảo (mắc bệnh truyền nhiễm, đường ruột, vết thương hở).",
                "risk_description": "Nguy cơ lây nhiễm vi sinh vật gây bệnh (Salmonella, E. coli, Staph. aureus) trực tiếp vào nguyên liệu và thành phẩm thực phẩm.",
                "opportunity_description": "Nâng cao ý thức tự giác khai báo sức khỏe của người lao động và đảm bảo môi trường chế biến an toàn tuyệt đối.",
                "likelihood": 2,
                "severity": 4,
                "risk_score": 8,
                "treatment_strategy": "MITIGATE",
                "action_plan": "Thực hiện khám sức khỏe định kỳ theo Thông tư 14; kiểm tra thân nhiệt và triệu chứng đầu ca; thuyên chuyển tạm thời công nhân bị ốm sang khu vực gián tiếp.",
                "responsible_role": "Giám sát Vệ sinh & Đội ATTP",
                "target_date": date.today() + timedelta(days=30),
                "status": "CONTROLLED",
                "residual_likelihood": 1,
                "residual_severity": 2,
                "residual_risk_score": 2,
            },
            {
                "code": "CR-03",
                "issue_category": "INTERNAL",
                "issue_description": "Sự phá hoại từ con người, mất an ninh nhà xưởng hoặc ô nhiễm có chủ đích (Food Defense).",
                "risk_description": "Người không có thẩm quyền hoặc khách tham quan tiếp cận khu vực sản phẩm hở, gây ô nhiễm vật lý hoặc sinh học.",
                "opportunity_description": "Thiết lập phân vùng an ninh kiểm soát ra vào chặt chẽ bằng thẻ từ và camera giám sát.",
                "likelihood": 1,
                "severity": 5,
                "risk_score": 5,
                "treatment_strategy": "MITIGATE",
                "action_plan": "Ban hành nội quy vào xưởng; lắp đặt khóa/chốt an toàn khu vực bột hở; yêu cầu khách tham quan khai báo sức khỏe và mặc đầy đủ BHLĐ.",
                "responsible_role": "Bảo vệ & Quản lý Nhà máy",
                "target_date": date.today() + timedelta(days=60),
                "status": "CONTROLLED",
                "residual_likelihood": 1,
                "residual_severity": 2,
                "residual_risk_score": 2,
            },
            {
                "code": "CR-04",
                "issue_category": "EXTERNAL",
                "issue_description": "Biến động chất lượng nguyên vật liệu nông sản từ nhà cung cấp (củ dong, phụ gia, bao bì).",
                "risk_description": "Nguyên liệu củ dong có lẫn đất cát, thối hỏng hoặc có dư lượng thuốc BVTV vượt ngưỡng quy định.",
                "opportunity_description": "Xây dựng vùng liên kết nguyên liệu đạt chuẩn VietGAP, sàng lọc danh mục nhà cung cấp uy tín dài hạn.",
                "likelihood": 3,
                "severity": 4,
                "risk_score": 12,
                "treatment_strategy": "MITIGATE",
                "action_plan": "Đánh giá nhà cung ứng định kỳ; kiểm tra 100% nguyên liệu đầu vào theo BM01-KTNL; kiên quyết từ chối lô hàng không đạt cảm quan hoặc thiếu giấy tờ cam kết.",
                "responsible_role": "Phòng Cung ứng vật tư & QC",
                "target_date": date.today() + timedelta(days=45),
                "status": "TREATING",
                "residual_likelihood": 2,
                "residual_severity": 2,
                "residual_risk_score": 4,
            },
            {
                "code": "CR-05",
                "issue_category": "INTERNAL",
                "issue_description": "Thiết bị đo lường (nhiệt kế, ẩm kế, cân định lượng, máy dò kim loại) bị sai số hoặc hết hạn kiểm định/hiệu chuẩn.",
                "risk_description": "Không phát hiện được khi thông số sấy, độ ẩm vượt ngưỡng hoặc máy dò kim loại không phát hiện được mảnh kim loại rơi vào sản phẩm.",
                "opportunity_description": "Thiết lập quy trình kiểm chuẩn định kỳ mỗi ca và kế hoạch hiệu chuẩn ngoại chuẩn xác.",
                "likelihood": 2,
                "severity": 5,
                "risk_score": 10,
                "treatment_strategy": "MITIGATE",
                "action_plan": "Thực hiện thử thanh mẫu Fe 0.5mm và SUS 0.8mm trên máy dò kim loại mỗi 2h/lần (BM06-KSQT); dán tem hiệu chuẩn đầy đủ; kiểm định cân đóng bao định kỳ.",
                "responsible_role": "Phòng Thiết bị & Kỹ thuật",
                "target_date": date.today() + timedelta(days=30),
                "status": "CONTROLLED",
                "residual_likelihood": 1,
                "residual_severity": 2,
                "residual_risk_score": 2,
            },
            {
                "code": "CR-06",
                "issue_category": "EXTERNAL",
                "issue_description": "Thay đổi quy định luật định hoặc cơ quan chức năng ban hành tiêu chuẩn kỹ thuật an toàn mới.",
                "risk_description": "Công ty không cập nhật kịp thời nhãn mác, chỉ tiêu kiểm nghiệm hoặc hồ sơ tự công bố, bị xử phạt vi phạm hành chính.",
                "opportunity_description": "Tạo vị trí chuyên trách theo dõi pháp lý ATTP và nâng cao uy tín thương hiệu.",
                "likelihood": 2,
                "severity": 3,
                "risk_score": 6,
                "treatment_strategy": "MITIGATE",
                "action_plan": "Rà soát định kỳ hàng quý danh mục văn bản luật liên quan đến ngành thực phẩm chế biến; điều chỉnh quy trình sản xuất và bao bì nhãn mác trước khi áp dụng bắt buộc.",
                "responsible_role": "Ban QLCL & Pháp chế",
                "target_date": date.today() + timedelta(days=120),
                "status": "CONTROLLED",
                "residual_likelihood": 1,
                "residual_severity": 2,
                "residual_risk_score": 2,
            },
        ]
        for r in risks_data:
            risk = ContextRisk(**r)
            db.add(risk)
        db.commit()
        print(f"✓ Đã nạp {len(risks_data)} rủi ro bối cảnh từ Phụ lục 2 An Giang.")
    else:
        print("✓ Bảng context_risks đã có dữ liệu, bỏ qua seed mới.")

    # 3. SEED TRAINING COURSES & REQUESTS & EVALUATIONS (THƯ MỤC 14)
    existing_courses = db.query(TrainingCourse).count()
    if existing_courses <= 1:
        courses_data = [
            {
                "course_code": "ĐT-2026-001",
                "title": "Đào tạo tìm hiểu về các điểm kiểm soát tới hạn (CCP) & Kế hoạch HACCP",
                "category": "HACCP_CCP",
                "trainer_name": "Trưởng ban HACCP / QA",
                "training_type": "INTERNAL",
                "schedule_date": date.today() - timedelta(days=15),
                "duration_hours": 4.0,
                "target_dept": "Phòng Sản xuất & QC",
                "content_summary": "Nắm vững nguyên lý xác định CCP; các giới hạn tới hạn nhiệt độ, độ ẩm; quy trình xử lý và ghi chép nhật ký khi vượt ngưỡng.",
                "status": "COMPLETED",
            },
            {
                "course_code": "ĐT-2026-002",
                "title": "Quy định vệ sinh cá nhân, rửa tay và trang bị BHLĐ vào khu vực sản xuất",
                "category": "FOOD_HYGIENE_GMP",
                "trainer_name": "Cán bộ Giám sát Vệ sinh",
                "training_type": "INTERNAL",
                "schedule_date": date.today() - timedelta(days=7),
                "duration_hours": 2.0,
                "target_dept": "Toàn thể Công nhân Nhà máy",
                "content_summary": "Thực hành 6 bước rửa tay theo hướng dẫn; tháo bỏ trang sức; mang trang phục bảo hộ sạch sẽ; quy định kiểm soát sức khỏe.",
                "status": "COMPLETED",
            },
            {
                "course_code": "ĐT-2026-003",
                "title": "Quy trình vận hành, bảo dưỡng & thử mẫu máy dò kim loại định kỳ (BM06-KSQT)",
                "category": "EQUIPMENT_OPERATION",
                "trainer_name": "Kỹ sư Trưởng phòng Thiết bị",
                "training_type": "INTERNAL",
                "schedule_date": date.today() + timedelta(days=10),
                "duration_hours": 3.0,
                "target_dept": "Tổ vận hành máy & QC đóng gói",
                "content_summary": "Cách sử dụng thanh mẫu Fe 0.5mm và SUS 0.8mm; xử lý khi phát hiện kim loại trong bao miến; vệ sinh đầu dò.",
                "status": "PLANNED",
            },
        ]
        created_courses = []
        for cd in courses_data:
            # Check if course_code exists
            if not db.query(TrainingCourse).filter(TrainingCourse.course_code == cd["course_code"]).first():
                c = TrainingCourse(**cd)
                db.add(c)
                created_courses.append(c)
        db.commit()
        print(f"✓ Đã nạp {len(created_courses)} khóa học đào tạo mẫu từ Thư mục 14.")

        # Thêm học viên cho khóa 1
        c1 = db.query(TrainingCourse).filter(TrainingCourse.course_code == "ĐT-2026-001").first()
        if c1 and db.query(TrainingParticipantRecord).filter(TrainingParticipantRecord.course_id == c1.course_id).count() == 0:
            participants = [
                {"employee_code": "NV-001", "employee_name": "Nguyễn Văn Hùng", "department": "Phòng Sản xuất", "position": "Tổ trưởng ca", "attendance_status": "ATTENDED", "pre_test_score": 65.0, "post_test_score": 95.0, "evaluation_result": "PASSED", "certificate_issued": True},
                {"employee_code": "NV-002", "employee_name": "Trần Thị Mai", "department": "Phòng Sản xuất", "position": "Công nhân sấy miến", "attendance_status": "ATTENDED", "pre_test_score": 50.0, "post_test_score": 85.0, "evaluation_result": "PASSED", "certificate_issued": True},
                {"employee_code": "NV-003", "employee_name": "Lê Hoàng Phúc", "department": "Ban QLCL & QC", "position": "Nhân viên QC", "attendance_status": "ATTENDED", "pre_test_score": 80.0, "post_test_score": 100.0, "evaluation_result": "PASSED", "certificate_issued": True},
            ]
            for p in participants:
                part = TrainingParticipantRecord(course_id=c1.course_id, **p)
                db.add(part)
            db.commit()
            print("✓ Đã nạp danh sách học viên mẫu cho khóa ĐT-2026-001.")

    # Seed Training Requests (BM01)
    if db.query(TrainingRequest).count() == 0:
        req = TrainingRequest(
            request_code="YCDT-2026-001",
            department="Phòng Sản xuất",
            proposer_name="Nguyễn Văn Hùng",
            course_name="Đào tạo tìm hiểu về các điểm CCP trong chế biến nông sản",
            training_reason="Công nhân mới tuyển vào phân xưởng sấy và sơ chế chưa nắm rõ quy trình theo dõi nhiệt độ CCP.",
            expected_duration="0.5 ngày",
            attendee_count=5,
            target_participants="Công nhân mới và trưởng ca sản xuất",
            expected_outcomes="Nắm vững các điểm CCP, cách đọc đồng hồ nhiệt ẩm kế và ghi chép nhật ký chuẩn xác.",
            request_date=date.today() - timedelta(days=20),
            status="APPROVED",
            approver_name="Ban Giám Đốc",
            approval_date=date.today() - timedelta(days=18),
            approval_note="Đồng ý tổ chức đào tạo nội bộ vào tuần 3 của tháng.",
        )
        db.add(req)
        db.commit()
        print("✓ Đã nạp Phiếu yêu cầu đào tạo mẫu (BM01-QTĐT).")

    # Seed Training Evaluation (BM04)
    if db.query(TrainingEvaluation).count() == 0:
        c1 = db.query(TrainingCourse).filter(TrainingCourse.course_code == "ĐT-2026-001").first()
        ev = TrainingEvaluation(
            course_id=c1.course_id if c1 else None,
            employee_code="NV-002",
            employee_name="Trần Thị Mai",
            department="Phòng Sản xuất",
            evaluator_name="Nguyễn Văn Hùng (Quản lý Sản xuất)",
            evaluation_date=date.today(),
            knowledge_score=5,
            skill_application_score=4,
            attitude_awareness_score=5,
            overall_rating="DAT",
            supervisor_feedback="Nhân sự đã vận hành thành thạo lò sấy, kiểm tra độ ẩm định kỳ mỗi 2h đúng chuẩn BM02-KSQT, không để xảy ra sai sót.",
            need_retraining=False,
        )
        db.add(ev)
        db.commit()
        print("✓ Đã nạp Phiếu đánh giá hiệu quả sau đào tạo mẫu (BM04-QTĐT).")

    # 4. SEED METAL DETECTOR LOGS (BM06-KSQT) & IN-PROCESS QC LOGS (BM01-05 KSQT)
    if db.query(MetalDetectorLog).count() == 0:
        times = ["07:00 (Đầu ca)", "09:00", "11:00", "13:00", "15:00"]
        for idx, t in enumerate(times):
            md_log = MetalDetectorLog(
                machine_code="MD-01",
                machine_name="Máy dò kim loại băng tải phân xưởng đóng gói",
                log_date=date.today(),
                check_time=t,
                shift_name="Ca 1",
                batch_number=f"MD-20260930-{idx+1:02d}",
                product_name="Miến dong sợi cao cấp 500g",
                fe_standard_mm=0.50,
                fe_detected=True,
                sus_standard_mm=0.80,
                sus_detected=True,
                rejection_mechanism_working=True,
                metal_detected_count=0,
                test_result="PASSED",
                checked_by_name="Lê Hoàng Phúc (QC)",
                verified_by_name="Nguyễn Văn Hùng (QLSX)",
                notes="Thanh mẫu đặt tại trung tâm khung dò và hai mép băng tải đều kích hoạt còi báo và cần gạt chuẩn xác.",
            )
            db.add(md_log)
        db.commit()
        print("✓ Đã nạp 5 lượt kiểm tra máy dò kim loại mẫu (BM06-KSQT).")

    if db.query(InProcessQCLog).count() == 0:
        ipqc_samples = [
            {
                "inspection_code": "IPQC-2026-001",
                "stage_code": "WASH_CUT",
                "stage_name": "Sơ chế, cắt thái định lượng (BM01-KSQT)",
                "log_date": date.today(),
                "check_time": "08:00",
                "shift_name": "Ca 1",
                "batch_number": "LOT-CD-20260930",
                "product_name": "Củ dong nguyên liệu",
                "criteria_data": {
                    "root_removal": "Hoàn toàn sạch gốc rễ",
                    "wash_water": "Nước trong, không cặn bùn",
                    "foreign_matter": "Không phát hiện ốc, sỏi, tạp chất lạ",
                    "cutting_size_mm": 1.5,
                    "machine_hygiene": "Đạt chuẩn vệ sinh trước ca"
                },
                "overall_status": "PASS",
                "inspector_name": "Lê Hoàng Phúc (QC)",
                "supervisor_name": "Nguyễn Văn Hùng (QLSX)",
            },
            {
                "inspection_code": "IPQC-2026-002",
                "stage_code": "DRY_COOL",
                "stage_name": "Sấy và làm nguội miến (BM02-KSQT)",
                "log_date": date.today(),
                "check_time": "10:00",
                "shift_name": "Ca 1",
                "batch_number": "LOT-MD-20260930",
                "product_name": "Bán thành phẩm miến sau sấy",
                "criteria_data": {
                    "drying_temperature_c": 68.5,
                    "target_temp_range": "55 - 80 °C",
                    "moisture_percent": 7.8,
                    "target_moisture_range": "4.0 - 10.0 %",
                    "color_uniformity": "Màu ngả xám đồng đều, không cháy sém"
                },
                "overall_status": "PASS",
                "inspector_name": "Lê Hoàng Phúc (QC)",
                "supervisor_name": "Nguyễn Văn Hùng (QLSX)",
            },
            {
                "inspection_code": "IPQC-2026-003",
                "stage_code": "FINISHED_PRODUCT",
                "stage_name": "Kiểm tra chất lượng thành phẩm đóng gói (BM05-KSQT)",
                "log_date": date.today(),
                "check_time": "14:00",
                "shift_name": "Ca 1",
                "batch_number": "LOT-TP-20260930",
                "product_name": "Miến dong đóng túi 500g",
                "criteria_data": {
                    "package_weight_g": 502.5,
                    "sealing_integrity": "Đường hàn nhiệt kín tuyệt đối, không xì mép",
                    "label_info": "Đầy đủ NSX, HSD 18 tháng, mã QR truy xuất",
                    "sensory_test": "Sợi dai, không dính bết, mùi thơm tự nhiên",
                    "moisture_percent": 8.0
                },
                "overall_status": "PASS",
                "inspector_name": "Lê Hoàng Phúc (QC)",
                "supervisor_name": "Nguyễn Văn Hùng (QLSX)",
            },
        ]
        for ipqc in ipqc_samples:
            log = InProcessQCLog(**ipqc)
            db.add(log)
        db.commit()
        print("✓ Đã nạp 3 lượt kiểm soát công đoạn sản xuất mẫu (BM01-05 KSQT).")

    db.close()
    print("=== HOÀN TẤT SEED DỮ LIỆU AN GIANG THÀNH CÔNG! ===")


if __name__ == "__main__":
    seed_all()
