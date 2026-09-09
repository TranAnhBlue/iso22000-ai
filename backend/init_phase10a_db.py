import uuid
from datetime import date, datetime
from app.core.database import SessionLocal, engine, Base
from app.modules.change_management.models import ChangeRequest
from app.modules.organization.models import CommunicationLog, FoodSafetyTeamMember
from app.modules.haccp.models import HACCPPlan, HACCPPlanReview
from app.modules.auth.models import User

def init_phase10a_tables():
    print("Creating Phase 10a tables...")
    Base.metadata.create_all(bind=engine, tables=[
        ChangeRequest.__table__,
        CommunicationLog.__table__,
        FoodSafetyTeamMember.__table__,
        HACCPPlanReview.__table__,
    ])
    
    db = SessionLocal()
    try:
        # 1. Seed Change Requests
        cr_count = db.query(ChangeRequest).count()
        cr1 = None
        cr2 = None
        cr3 = None
        if cr_count == 0:
            print("Seeding change_requests (Clause 6.3)...")
            cr1 = ChangeRequest(
                change_code="CR-2026-001",
                title="Thay đổi bao bì màng nhôm đa lớp sang màng phức hợp tái sinh sinh học",
                change_type="RAW_MATERIAL_CHANGE",
                description="Chuyển đổi vật liệu bao bì tiếp xúc trực tiếp sang màng phức hợp thân thiện môi trường để đáp ứng tiêu chuẩn xuất khẩu EU.",
                reason="Yêu cầu từ đối tác bán lẻ EU và định hướng phát triển bền vững của nhà máy.",
                impact_assessment={
                    "affects_haccp_plan": False,
                    "affects_prp": True,
                    "affected_document_ids": ["DOC-SOP-PACK-01", "BM-KTNL-01"],
                    "food_safety_impact_level": "MEDIUM"
                },
                proposed_by_name="Trần Quốc Huy (Quản đốc Sản xuất)",
                proposed_date=date(2026, 8, 10),
                review_status="APPROVED",
                approved_by_name="Lê Hoàng Nam (Đội trưởng Đội ATTP)",
                approval_date=date(2026, 8, 14),
                implementation_plan="1. Kiểm tra COA và kiểm nghiệm di thôi độc tính bao bì mới.\n2. Chạy thử nghiệm đóng gói 500 gói mẻ pilot.\n3. Đánh giá độ bền mối hàn nhiệt và kín khí.",
                implementation_date=date(2026, 9, 1),
                verification_result="Kết quả kiểm tra di thôi chì, cadimi và độ thôi nhiễm toàn phần đạt QCVN 12-1:2011/BYT. Cho phép áp dụng sản xuất đại trà.",
                verified_by_name="Nguyễn Văn An (QA Lead)",
                created_at=datetime(2026, 8, 10, 9, 0)
            )

            cr2 = ChangeRequest(
                change_code="CR-2026-002",
                title="Lắp đặt máy dò kim loại băng tải độ nhạy cao Mettler Toledo thay thế máy cũ",
                change_type="EQUIPMENT_NEW",
                description="Đầu tư máy dò kim loại đa tần số Model Profile Advantage thay thế máy cũ đã sử dụng 8 năm tại công đoạn CCP 2 đóng gói cuối chuyền.",
                reason="Máy cũ thường xuyên bị trôi điểm zero và độ nhạy suy giảm đối với mẻ cá fillet có độ ẩm cao.",
                impact_assessment={
                    "affects_haccp_plan": True,
                    "affects_prp": False,
                    "affected_document_ids": ["HACCP-2026-CB01", "SOP-CCP-02"],
                    "food_safety_impact_level": "HIGH"
                },
                proposed_by_name="Phạm Hùng Cường (Kỹ sư Cơ điện)",
                proposed_date=date(2026, 8, 18),
                review_status="IMPLEMENTED",
                approved_by_name="Lê Hoàng Nam (Đội trưởng Đội ATTP)",
                approval_date=date(2026, 8, 20),
                implementation_plan="1. Lắp đặt cơ khí và kết nối nguồn điện ổn định qua UPS.\n2. Hiệu chuẩn độ nhạy bằng mẫu thẻ chuẩn Fe 1.0mm, Non-Fe 1.5mm, SS 2.0mm.\n3. Đào tạo nhân viên QC vận hành và ghi nhật ký kiểm tra mỗi 30 phút.",
                implementation_date=date(2026, 8, 28),
                verification_result="Đã nghiệm thu IQ/OQ/PQ đạt chuẩn. Máy tự động dừng băng tải và còi hú chính xác 100% qua 50 lần thả thẻ mẫu thử nghiệm.",
                verified_by_name="Lê Hoàng Nam (Trưởng ban QA)",
                created_at=datetime(2026, 8, 18, 14, 30)
            )

            cr3 = ChangeRequest(
                change_code="CR-2026-003",
                title="Thay đổi nhà cung cấp phụ gia giữ ẩm Sodium Tripolyphosphate (STPP)",
                change_type="SUPPLIER_CHANGE",
                description="Bổ sung Công ty TNHH Hóa Chất Thực Phẩm Á Châu (Thái Lan) vào danh mục nhà cung cấp thay thế cho đơn vị cũ.",
                reason="Nhà cung cấp cũ tăng giá 25% và thời gian giao hàng kéo dài gây nguy cơ đứt gãy nguồn cung.",
                impact_assessment={
                    "affects_haccp_plan": False,
                    "affects_prp": True,
                    "affected_document_ids": ["ASL-2026", "BM04-KHO-PHUGIA"],
                    "food_safety_impact_level": "LOW"
                },
                proposed_by_name="Trần Thị Mai (Thu mua nguyên liệu)",
                proposed_date=date(2026, 9, 2),
                review_status="UNDER_REVIEW",
                approved_by_name=None,
                approval_date=None,
                implementation_plan="Đang gửi mẫu nguyên liệu đi xét nghiệm kim loại nặng (As, Pb, Cd) tại Trung tâm QUATEST 3.",
                created_at=datetime(2026, 9, 2, 10, 15)
            )

            db.add_all([cr1, cr2, cr3])
            db.commit()
            print("Seeded 3 change requests.")
        else:
            cr2 = db.query(ChangeRequest).filter(ChangeRequest.change_code == "CR-2026-002").first()

        # 2. Seed Communications Log (Clause 7.4)
        if db.query(CommunicationLog).count() == 0:
            print("Seeding communications_log (Clause 7.4)...")
            c1 = CommunicationLog(
                comm_code="COMM-2026-001",
                direction="EXTERNAL",
                party_type="GOVERNMENT",
                party_name="Chi cục Quản lý Chất lượng & Bảo vệ Nguồn lợi Thủy sản An Giang",
                subject="Báo cáo định kỳ quý II/2026 về kết quả kiểm soát dư lượng kháng sinh vùng nguyên liệu",
                content="Gửi báo cáo tổng hợp 120 mẫu test nhanh kháng sinh cấm và kết quả kiểm nghiệm ngoại quan cá tra nguyên liệu.",
                communication_date=date(2026, 7, 15),
                method="LETTER",
                responsible_person="Lê Hoàng Nam - Trưởng ban QA",
                status="SENT"
            )
            c2 = CommunicationLog(
                comm_code="COMM-2026-002",
                direction="EXTERNAL",
                party_type="CUSTOMER",
                party_name="Tập đoàn Bán lẻ Aeon Mall Việt Nam (Bộ phận Kiểm định Chất lượng)",
                subject="Phản hồi và cung cấp hồ sơ COA kim loại nặng & vi sinh mẻ chả cá đóng gói",
                content="Gửi kèm phiếu kiểm nghiệm vi sinh vật chỉ thị (E. coli, Salmonella, L. monocytogenes) số QUATEST-26-881.",
                communication_date=date(2026, 8, 5),
                method="EMAIL",
                responsible_person="Lê Hoàng Nam - Trưởng ban QA",
                status="ACKNOWLEDGED"
            )
            c3 = CommunicationLog(
                comm_code="COMM-2026-003",
                direction="INTERNAL",
                party_type="EMPLOYEE",
                party_name="Toàn thể Cán bộ công nhân viên Phân xưởng Chế biến & Kho",
                subject="Thông báo triệu tập cuộc họp rà soát kế hoạch HACCP toàn nhà máy quý III/2026",
                content="Thông báo lịch họp vào 14h00 ngày 25/08/2026 tại Phòng họp 1 để thẩm tra các thay đổi thiết bị và lưu đồ.",
                communication_date=date(2026, 8, 20),
                method="MEETING",
                responsible_person="Trần Thị Mai - Thư ký Đội ATTP",
                status="ACKNOWLEDGED"
            )
            c4 = CommunicationLog(
                comm_code="COMM-2026-004",
                direction="EXTERNAL",
                party_type="SUPPLIER",
                party_name="Công ty TNHH Bao Bì Nhựa Tân Tiến",
                subject="Công văn yêu cầu cập nhật bản Tự công bố hợp quy và cam kết không chứa chì trong mực in",
                content="Yêu cầu gửi bản tự công bố sản phẩm bao bì màng nhôm mới theo Nghị định 15/2018/NĐ-CP trước ngày 15/09/2026.",
                communication_date=date(2026, 8, 28),
                method="OFFICIAL_DISPATCH",
                responsible_person="Nguyễn Văn Tài - Thủ kho & Logistics",
                status="SENT"
            )
            c5 = CommunicationLog(
                comm_code="COMM-2026-005",
                direction="EXTERNAL",
                party_type="MEDIA",
                party_name="Cổng thông tin Hiệp hội Chế biến & Xuất khẩu Thủy sản VASEP",
                subject="Thông cáo báo chí: Nhà máy duy trì chứng nhận ISO 22000:2018 năm thứ 3 liên tiếp",
                content="Cung cấp thông tin xác thực về kết quả đánh giá giám sát định kỳ năm 2026 không có điểm không phù hợp nặng.",
                communication_date=date(2026, 9, 3),
                method="EMAIL",
                responsible_person="Ban Giám Đốc Nhà Máy",
                status="ACKNOWLEDGED"
            )
            db.add_all([c1, c2, c3, c4, c5])
            db.commit()
            print("Seeded 5 communications logs.")

        # 3. Seed Food Safety Team (Clause 5.3 & QĐ 02)
        if db.query(FoodSafetyTeamMember).count() == 0:
            print("Seeding food_safety_team_members (Clause 5.3 & QĐ 02)...")
            user_qa = db.query(User).filter(User.username == "qa_manager").first()
            user_admin = db.query(User).filter(User.username == "admin").first()

            m1 = FoodSafetyTeamMember(
                user_id=user_qa.user_id if user_qa else None,
                member_name="Lê Hoàng Nam",
                role_in_team="TEAM_LEADER",
                department="Ban Quản lý Chất lượng (QA/QC)",
                current_position="Trưởng phòng Đảm bảo Chất lượng (QA)",
                qualification_and_training="Kỹ sư Công nghệ Thực phẩm (ĐH Bách Khoa TP.HCM); Chứng chỉ Lead Auditor ISO 22000:2018; Đào tạo HACCP nâng cao 2024.",
                responsibility_description="Chỉ đạo toàn diện hệ thống FSMS; tổ chức các cuộc họp rà soát; trực tiếp thẩm tra hồ sơ CCP, PRP; báo cáo định kỳ cho Giám đốc Nhà máy.",
                appointment_decision_code="02/QĐ-ATTP-2026",
                appointment_date=date(2026, 1, 10),
                status="ACTIVE"
            )
            m2 = FoodSafetyTeamMember(
                user_id=None,
                member_name="Trần Thị Mai",
                role_in_team="SECRETARY",
                department="Ban Quản lý Chất lượng (QA/QC)",
                current_position="Chuyên viên Kiểm soát Tài liệu & HACCP",
                qualification_and_training="Cử nhân Công nghệ Sinh học; Chứng chỉ Đánh giá viên nội bộ ISO 22000:2018.",
                responsibility_description="Quản lý hệ thống tài liệu và biểu mẫu; lập biên bản các cuộc họp của Đội; theo dõi tiến độ thực hiện CAPA và đào tạo.",
                appointment_decision_code="02/QĐ-ATTP-2026",
                appointment_date=date(2026, 1, 10),
                status="ACTIVE"
            )
            m3 = FoodSafetyTeamMember(
                user_id=None,
                member_name="Trần Quốc Huy",
                role_in_team="MEMBER",
                department="Phòng Sản xuất",
                current_position="Quản đốc Phân xưởng Chế biến Thủy sản",
                qualification_and_training="Kỹ sư Chế biến Thủy sản; 10 năm kinh nghiệm vận hành dây chuyền fillet đông lạnh; Chứng nhận đào tạo SSOP/GMP 2025.",
                responsibility_description="Chịu trách nhiệm tuân thủ quy trình GMP, SSOP trong toàn xưởng; giám sát nhân viên thao tác đúng quy định vệ sinh tại chuyền.",
                appointment_decision_code="02/QĐ-ATTP-2026",
                appointment_date=date(2026, 1, 10),
                status="ACTIVE"
            )
            m4 = FoodSafetyTeamMember(
                user_id=None,
                member_name="Phạm Hùng Cường",
                role_in_team="MEMBER",
                department="Phòng Thiết bị - Cơ điện",
                current_position="Kỹ sư Trưởng Cơ điện & Bảo trì",
                qualification_and_training="Kỹ sư Cơ điện tử; Chứng chỉ an toàn áp lực nồi hơi và vận hành hệ thống lạnh NH3 công nghiệp.",
                responsibility_description="Kiểm soát bảo trì phòng ngừa thiết bị; quản lý hiệu chuẩn nhiệt kế, áp kế và máy dò kim loại; kiểm soát dầu bôi trơn thực phẩm H1.",
                appointment_decision_code="02/QĐ-ATTP-2026",
                appointment_date=date(2026, 1, 10),
                status="ACTIVE"
            )
            m5 = FoodSafetyTeamMember(
                user_id=None,
                member_name="Nguyễn Văn Tài",
                role_in_team="MEMBER",
                department="Phòng Kinh doanh & Kho Vận",
                current_position="Trưởng kho Lạnh & Logistics",
                qualification_and_training="Cử nhân Quản trị Logistics; Chứng nhận thực hành tốt bảo quản kho lạnh thực phẩm (GSP).",
                responsibility_description="Kiểm soát điều kiện nhiệt độ kho đông âm sâu ≤ -18°C; tuân thủ nguyên tắc xuất nhập hàng FEFO và kiểm tra xe vận chuyển BM01-PTVC.",
                appointment_decision_code="02/QĐ-ATTP-2026",
                appointment_date=date(2026, 1, 10),
                status="ACTIVE"
            )
            db.add_all([m1, m2, m3, m4, m5])
            db.commit()
            print("Seeded 5 food safety team members.")

        # 4. Seed HACCP Plan Reviews (Clause 8.6 & 8.8)
        if db.query(HACCPPlanReview).count() == 0:
            print("Seeding haccp_plan_reviews (Clause 8.6 & 8.8)...")
            plan = db.query(HACCPPlan).first()
            if plan:
                r1 = HACCPPlanReview(
                    review_code="HPR-2026-001",
                    plan_id=plan.plan_id,
                    review_date=date(2026, 6, 25),
                    review_type="PERIODIC",
                    triggered_by_change_id=None,
                    reviewed_by_name="Lê Hoàng Nam (Đội trưởng Đội ATTP)",
                    scope_of_review="Rà soát định kỳ 6 tháng toàn bộ 10 công đoạn trong lưu đồ chế biến, phân tích lại mối nguy sinh học/hóa học/vật lý và 2 điểm CCP.",
                    findings="Toàn bộ 2 điểm kiểm soát tới hạn (CCP 1: Gia nhiệt thanh trùng & CCP 2: Dò kim loại) vận hành ổn định. Tỷ lệ tuân thủ giới hạn tới hạn đạt 99.4%. Không phát sinh mối nguy mới.",
                    changes_required=False,
                    plan_version_before=plan.version,
                    plan_version_after=plan.version,
                    approval_status="APPROVED",
                    approved_by_name="Lê Hoàng Nam (Đội trưởng Đội ATTP)",
                    created_at=datetime(2026, 6, 25, 15, 0)
                )

                r2 = HACCPPlanReview(
                    review_code="HPR-2026-002",
                    plan_id=plan.plan_id,
                    review_date=date(2026, 8, 25),
                    review_type="TRIGGERED_BY_CHANGE",
                    triggered_by_change_id=cr2.change_id if cr2 else None,
                    reviewed_by_name="Lê Hoàng Nam (Đội trưởng Đội ATTP)",
                    scope_of_review="Cập nhật kế hoạch HACCP do thay thế máy dò kim loại mới (theo phiếu yêu cầu thay đổi CR-2026-002).",
                    findings="Nâng cao ngưỡng kiểm soát giới hạn tới hạn tại CCP 2: Thẻ mẫu chuẩn thử nghiệm nâng từ (Fe 1.5mm / Non-Fe 2.0mm / SS 2.5mm) lên mức siêu nhạy (Fe 1.0mm / Non-Fe 1.5mm / SS 2.0mm). Nâng phiên bản kế hoạch HACCP từ 1.0 lên 1.1.",
                    changes_required=True,
                    plan_version_before="1.0",
                    plan_version_after="1.1",
                    approval_status="APPROVED",
                    approved_by_name="Lê Hoàng Nam (Đội trưởng Đội ATTP)",
                    created_at=datetime(2026, 8, 25, 16, 30)
                )
                db.add_all([r1, r2])
                plan.version = "1.1"
                db.commit()
                print("Seeded 2 HACCP plan reviews.")
            else:
                print("No HACCP plan found to attach review.")

        print("Phase 10a seed completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    init_phase10a_tables()
