"""
Master Seed Module for WCERT ISO 22000 FSMS System
Đồng bộ toàn diện dữ liệu nhân sự, vai trò, đội ATTP, bối cảnh, và các phân hệ nghiệp vụ.
Đảm bảo toàn bộ người dùng và dữ liệu liên kết hoạt động chuẩn xác 100%.
"""

from datetime import date, datetime
import uuid
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash

from app.modules.auth.models import User, Role, Department
from app.modules.organization.models import FoodSafetyTeamMember, InterestedParty, ContextRisk, CommunicationLog
from app.modules.change_management.models import ChangeRequest
from app.modules.purchasing.models import Supplier, MaterialLot, IQCInspection
from app.modules.builder.router import seed_default_builders
from app.modules.haccp.router import seed_haccp_data_if_empty
from app.modules.purchasing.router import seed_purchasing_data_if_empty
from app.modules.equipment.router import seed_default_equipments_if_empty
from app.modules.emergency.router import seed_emergency_data_if_empty
from app.modules.dashboard.router import seed_default_dashboard_data
from app.modules.audits.router import seed_default_audits
from app.modules.capa.router import seed_capa_defaults


def seed_all_system_data(db: Session):
    print("[MASTER_SEED] Bắt đầu đồng bộ cơ sở dữ liệu...")

    # 1. ROLES
    roles_def = [
        ("admin", "Quản trị hệ thống", "Toàn quyền quản trị hệ thống và cấu hình FSMS"),
        ("qa", "Ban Quản lý Chất lượng", "Quản lý kế hoạch HACCP, CCP, PRP, thẩm tra CAPA, audit"),
        ("production", "Phòng Sản xuất", "Ghi nhận đo đạc CCP theo ca, quản lý mẻ sản xuất"),
        ("maintenance", "Phòng Cơ điện & Bảo trì", "Quản lý thiết bị đo, bảo trì và hiệu chuẩn"),
        ("warehouse", "Kho Vận & Logistics", "Quản lý kho lạnh FEFO, PTVC, xuất nhập kho"),
        ("purchasing", "Phòng Mua Hàng", "Quản lý nhà cung ứng, đánh giá NCC, lô nguyên liệu"),
    ]
    roles_map = {}
    for code, name, desc in roles_def:
        r = db.query(Role).filter((Role.role_code == code) | (Role.role_code == code.upper())).first()
        if not r:
            r = Role(role_code=code, role_name=name, description=desc)
            db.add(r)
            db.commit()
            db.refresh(r)
        roles_map[code] = r

    # 2. DEPARTMENTS
    depts_def = [
        ("BGD", "Ban Giám Đốc", "Ban Lãnh Đạo điều hành Nhà máy"),
        ("QA", "Ban Quản lý Chất lượng (QA/QC)", "Phòng Đảm bảo chất lượng & ATTP"),
        ("PROD", "Phòng Sản xuất & Chế biến", "Các phân xưởng chế biến thủy hải sản"),
        ("MAINT", "Phòng Cơ điện & Bảo trì", "Kỹ thuật thiết bị máy móc và dây chuyền"),
        ("WH", "Bộ phận Kho Vận & Logistics", "Kho lạnh, kho mát, kho bao bì và xe giao nhận"),
        ("PUR", "Phòng Mua Hàng & Cung Ứng", "Thu mua nguyên liệu cá, phụ gia, vật tư"),
        ("HSE", "Phòng Y tế & An toàn Lao động", "Kiểm tra sức khỏe công nhân, bảo hộ và PCCC"),
    ]
    for code, name, desc in depts_def:
        d = db.query(Department).filter(Department.dept_code == code).first()
        if not d:
            d = Department(dept_code=code, dept_name=name, description=desc)
            db.add(d)
    db.commit()

    # 3. CANONICAL USERS
    pwd_hash = get_password_hash("123456")
    users_def = [
        {
            "username": "admin",
            "full_name": "Trần Anh Bảo",
            "department": "Ban Giám Đốc",
            "email": "admin@wcert.vn",
            "phone": "0912.888.999",
            "role": "admin",
        },
        {
            "username": "qa",
            "full_name": "Lê Hoàng Nam",
            "department": "Ban Quản lý Chất lượng (QA/QC)",
            "email": "nam.le@wcert.vn",
            "phone": "0908.111.222",
            "role": "qa",
        },
        {
            "username": "production",
            "full_name": "Nguyễn Văn An",
            "department": "Phòng Sản xuất & Chế biến",
            "email": "an.nguyen@wcert.vn",
            "phone": "0903.333.444",
            "role": "production",
        },
        {
            "username": "maintenance",
            "full_name": "Phạm Hùng Cường",
            "department": "Phòng Cơ điện & Bảo trì",
            "email": "cuong.pham@wcert.vn",
            "phone": "0909.555.666",
            "role": "maintenance",
        },
        {
            "username": "tranthimai",
            "full_name": "Trần Thị Mai",
            "department": "Ban Quản lý Chất lượng (QA/QC)",
            "email": "mai.tran@wcert.vn",
            "phone": "0918.777.888",
            "role": "qa",
        },
        {
            "username": "warehouse",
            "full_name": "Nguyễn Văn Tài",
            "department": "Bộ phận Kho Vận & Logistics",
            "email": "tai.nguyen@wcert.vn",
            "phone": "0938.999.000",
            "role": "warehouse",
        },
        {
            "username": "purchasing",
            "full_name": "Vũ Thị Lan",
            "department": "Phòng Mua Hàng & Cung Ứng",
            "email": "lan.vu@wcert.vn",
            "phone": "0988.222.333",
            "role": "purchasing",
        },
        {
            "username": "health_qc",
            "full_name": "Nguyễn Thị Hoa",
            "department": "Phòng Y tế & An toàn Lao động",
            "email": "hoa.nguyen@wcert.vn",
            "phone": "0977.444.555",
            "role": "qa",
        },
    ]

    users_map = {}
    for u_data in users_def:
        u = db.query(User).filter(User.username == u_data["username"]).first()
        if not u:
            u = User(
                username=u_data["username"],
                password_hash=pwd_hash,
                full_name=u_data["full_name"],
                department=u_data["department"],
                email=u_data["email"],
                phone=u_data["phone"],
                is_active=True,
            )
            role_obj = roles_map.get(u_data["role"])
            if role_obj:
                u.roles.append(role_obj)
            db.add(u)
            db.commit()
            db.refresh(u)
        else:
            # Đảm bảo full_name và department đồng bộ
            u.full_name = u_data["full_name"]
            u.department = u_data["department"]
            u.email = u_data["email"]
            u.phone = u_data["phone"]
            if not u.roles and u_data["role"] in roles_map:
                u.roles.append(roles_map[u_data["role"]])
            db.commit()
            db.refresh(u)
        users_map[u_data["username"]] = u
    print(f"[MASTER_SEED] Đã đồng bộ {len(users_map)} người dùng hệ thống.")

    # 4. FOOD SAFETY TEAM MEMBERS (Liên kết chặt chẽ với Users)
    team_def = [
        {
            "username": "qa",
            "name": "Lê Hoàng Nam",
            "role": "TEAM_LEADER",
            "dept": "Ban Quản lý Chất lượng (QA/QC)",
            "pos": "Trưởng phòng Đảm bảo Chất lượng (QA) / Đội trưởng Đội ATTP",
            "qual": "Kỹ sư Công nghệ Thực phẩm (ĐH Bách Khoa); Lead Auditor ISO 22000:2018; HACCP Nâng cao.",
            "resp": "Chỉ đạo toàn diện hệ thống FSMS; phê duyệt kế hoạch HACCP, thẩm tra CCP, PRP và báo cáo Ban Giám Đốc.",
        },
        {
            "username": "production",
            "name": "Nguyễn Văn An",
            "role": "VICE_LEADER",
            "dept": "Phòng Sản xuất & Chế biến",
            "pos": "Trưởng phòng Sản xuất / Đội phó Đội ATTP",
            "qual": "Kỹ sư Chế biến Thủy sản; Chứng chỉ HACCP Codex; 10 năm kinh nghiệm điều hành xưởng.",
            "resp": "Phụ trách tổ chức sản xuất tuân thủ lưu đồ công đoạn; giám sát đo đạc CCP và xử lý sự cố trong ca.",
        },
        {
            "username": "tranthimai",
            "name": "Trần Thị Mai",
            "role": "SECRETARY",
            "dept": "Ban Quản lý Chất lượng (QA/QC)",
            "pos": "Chuyên viên Kiểm soát Tài liệu & HACCP / Thư ký Đội ATTP",
            "qual": "Cử nhân Công nghệ Sinh học; Đánh giá viên nội bộ ISO 22000:2018.",
            "resp": "Quản lý hệ thống tài liệu DMS; lập biên bản họp; theo dõi tiến độ CAPA và hồ sơ đào tạo.",
        },
        {
            "username": "maintenance",
            "name": "Phạm Hùng Cường",
            "role": "MEMBER",
            "dept": "Phòng Cơ điện & Bảo trì",
            "pos": "Kỹ sư trưởng Cơ điện / Trưởng phòng Bảo trì",
            "qual": "Kỹ sư Cơ điện tử; Chứng chỉ an toàn áp lực nồi hơi và hiệu chuẩn thiết bị đo.",
            "resp": "Bảo trì phòng ngừa dây chuyền máy móc; kiểm soát định kỳ và hiệu chuẩn thiết bị đo nhiệt độ, áp suất, máy dò kim loại.",
        },
        {
            "username": "warehouse",
            "name": "Nguyễn Văn Tài",
            "role": "MEMBER",
            "dept": "Bộ phận Kho Vận & Logistics",
            "pos": "Thủ kho Lạnh & Logistics / Phụ trách PTVC",
            "qual": "Cử nhân Quản trị Chuỗi cung ứng; Chứng chỉ an toàn kho lạnh công nghiệp.",
            "resp": "Quản lý xuất nhập kho theo nguyên tắc FEFO; kiểm soát nhiệt độ kho lạnh và kiểm tra vệ sinh xe vận chuyển PTVC.",
        },
        {
            "username": "purchasing",
            "name": "Vũ Thị Lan",
            "role": "MEMBER",
            "dept": "Phòng Mua Hàng & Cung Ứng",
            "pos": "Trưởng phòng Thu Mua & Cung Ứng",
            "qual": "Cử nhân Kinh tế Quốc tế; Đào tạo đánh giá nhà cung cấp chuỗi thực phẩm.",
            "resp": "Khảo sát và đánh giá năng lực nhà cung cấp; kiểm soát hợp đồng và chứng nhận ATTP của nguồn nguyên liệu đầu vào.",
        },
    ]

    for m_data in team_def:
        m = db.query(FoodSafetyTeamMember).filter(FoodSafetyTeamMember.member_name == m_data["name"]).first()
        u_obj = users_map.get(m_data["username"])
        u_id = u_obj.user_id if u_obj else None

        if not m:
            m = FoodSafetyTeamMember(
                user_id=u_id,
                member_name=m_data["name"],
                role_in_team=m_data["role"],
                department=m_data["dept"],
                current_position=m_data["pos"],
                qualification_and_training=m_data["qual"],
                responsibility_description=m_data["resp"],
                appointment_decision_code="02/QĐ-ATTP-2026",
                appointment_date=date(2026, 1, 10),
                status="ACTIVE",
            )
            db.add(m)
        else:
            m.user_id = u_id
            m.department = m_data["dept"]
            m.current_position = m_data["pos"]
            m.qualification_and_training = m_data["qual"]
            m.responsibility_description = m_data["resp"]
    db.commit()
    print("[MASTER_SEED] Đã đồng bộ Đội An Toàn Thực Phẩm (Food Safety Team).")

    # 5. INTERESTED PARTIES & CONTEXT RISKS
    if db.query(InterestedParty).count() == 0:
        p1 = InterestedParty(
            party_name="Cơ quan Quản lý Nhà nước (Cục ATTP - Bộ Y tế, Chi cục Quản lý Chất lượng)",
            party_type="EXTERNAL",
            needs_and_expectations="Tuân thủ nghiêm ngặt Luật ATTP số 55/2010/QH12; tự công bố chất lượng; lưu trữ hồ sơ truy xuất nguồn gốc.",
            statutory_requirements="Nghị định 15/2018/NĐ-CP, Thông tư 38/2018/TT-BNNPTNT, QCVN 01-1:2018/BYT.",
            monitoring_method="Kiểm tra liên ngành định kỳ hàng năm; nộp báo cáo tự công bố và quan trắc môi trường.",
            review_frequency="6 tháng/lần",
            responsible_role="Lê Hoàng Nam (QA Lead)",
            status="ACTIVE",
        )
        p2 = InterestedParty(
            party_name="Khách hàng B2B & Chuỗi siêu thị lớn (Co.opmart, WinCommerce, Khách hàng xuất khẩu EU/Mỹ)",
            party_type="EXTERNAL",
            needs_and_expectations="Chứng nhận ISO 22000:2018 còn hiệu lực; cung cấp phiếu COA từng lô; không nhiễm Salmonella/Listeria.",
            statutory_requirements="Quy chuẩn kỹ thuật theo hợp đồng; tiêu chuẩn HACCP Codex.",
            monitoring_method="Đánh giá định kỳ bên thứ hai; gửi mẫu kiểm nghiệm độc lập; khảo sát CSI.",
            review_frequency="Hàng năm",
            responsible_role="Lê Hoàng Nam (QA Lead) - Vũ Thị Lan (Thu Mua)",
            status="ACTIVE",
        )
        p3 = InterestedParty(
            party_name="Nhà cung cấp nông sản, thủy sản tươi sống và phụ gia",
            party_type="EXTERNAL",
            needs_and_expectations="Hợp đồng thu mua ổn định, tiêu chuẩn kỹ thuật tiếp nhận rõ ràng; thanh toán đúng kỳ hạn.",
            statutory_requirements="Cam kết không dùng kháng sinh/hóa chất cấm; nhật ký nuôi trồng cách ly an toàn.",
            monitoring_method="Đánh giá định kỳ theo BM-NCC-01 (6 tháng/lần); kiểm tra xác suất ao nuôi/vùng trồng.",
            review_frequency="6 tháng/lần",
            responsible_role="Vũ Thị Lan (Trưởng phòng Mua Hàng)",
            status="ACTIVE",
        )
        db.add_all([p1, p2, p3])
        db.commit()

        if db.query(ContextRisk).count() == 0:
            r1 = ContextRisk(
                code="CR-01",
                issue_category="EXTERNAL",
                issue_description="Biến đổi thời tiết bất thường làm biến động nhiệt độ vận chuyển nguyên liệu thủy sản tươi.",
                interested_party_id=p3.id,
                risk_description="Vi sinh vật phát triển làm suy giảm độ tươi hoặc phát sinh Histamine trong cá ngừ.",
                opportunity_description="Áp dụng quy trình IQC nghiêm ngặt với xe thùng lạnh có data-logger theo dõi nhiệt độ liên tục.",
                likelihood=3,
                severity=4,
                risk_score=12,
                treatment_strategy="MITIGATE",
                action_plan="Yêu cầu xe lạnh giao hàng duy trì nhiệt độ ≤ -18°C với hàng đông lạnh, ≤ 4°C với hàng tươi. Kiểm tra 100% khi nhận hàng.",
                responsible_role="Lê Hoàng Nam (QA Lead)",
                target_date=date(2026, 12, 31),
                status="TREATING",
                residual_likelihood=1,
                residual_severity=2,
                residual_risk_score=2,
            )
            db.add(r1)
            db.commit()
        print("[MASTER_SEED] Đã đồng bộ Bối cảnh & Rủi ro (Clause 4 & 6).")

    # 6. CHANGE REQUESTS (Clause 6.3)
    if db.query(ChangeRequest).count() == 0:
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
            proposed_by_name="Nguyễn Văn An (Trưởng phòng Sản xuất)",
            proposed_date=date(2026, 8, 10),
            review_status="APPROVED",
            approved_by_name="Lê Hoàng Nam (Đội trưởng Đội ATTP)",
            approval_date=date(2026, 8, 14),
            implementation_plan="1. Kiểm tra COA và kiểm nghiệm di thôi độc tính.\n2. Chạy thử nghiệm 500 gói pilot.\n3. Đánh giá độ kín mép dán.",
            implementation_date=date(2026, 9, 1),
            verification_result="Kết quả kiểm tra thôi nhiễm đạt QCVN 12-1:2011/BYT. Cho phép áp dụng sản xuất đại trà.",
            verified_by_name="Lê Hoàng Nam (QA Lead)",
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
            implementation_plan="1. Lắp đặt và kết nối nguồn điện UPS.\n2. Hiệu chuẩn mẫu chuẩn Fe 1.0mm, Non-Fe 1.5mm, SS 2.0mm.\n3. Đào tạo QC vận hành.",
            implementation_date=date(2026, 8, 28),
            verification_result="Đã nghiệm thu IQ/OQ/PQ đạt chuẩn. Máy dừng băng tải và còi hú chính xác 100% qua 50 lần thử nghiệm.",
            verified_by_name="Lê Hoàng Nam (Trưởng ban QA)",
            created_at=datetime(2026, 8, 18, 14, 30)
        )
        cr3 = ChangeRequest(
            change_code="CR-2026-003",
            title="Thay đổi nhà cung cấp phụ gia giữ ẩm Sodium Tripolyphosphate (STPP)",
            change_type="SUPPLIER_CHANGE",
            description="Bổ sung Công ty TNHH Hóa Chất Thực Phẩm Á Châu vào danh mục nhà cung cấp thay thế.",
            reason="Nhà cung cấp cũ tăng giá 25% và thời gian giao hàng kéo dài gây nguy cơ gián đoạn sản xuất.",
            impact_assessment={
                "affects_haccp_plan": False,
                "affects_prp": True,
                "affected_document_ids": ["ASL-2026", "BM04-KHO-PHUGIA"],
                "food_safety_impact_level": "LOW"
            },
            proposed_by_name="Vũ Thị Lan (Trưởng phòng Mua Hàng)",
            proposed_date=date(2026, 9, 2),
            review_status="UNDER_REVIEW",
            approved_by_name=None,
            approval_date=None,
            implementation_plan="Đang gửi mẫu đi kiểm nghiệm kim loại nặng tại Trung tâm QUATEST 3.",
            created_at=datetime(2026, 9, 2, 10, 15)
        )
        db.add_all([cr1, cr2, cr3])
        db.commit()
        print("[MASTER_SEED] Đã đồng bộ Quản lý Thay đổi (Clause 6.3).")

    # 7. SUPPLIERS & INITIAL LOTS (Nếu chưa có)
    if db.query(Supplier).count() == 0:
        s1 = Supplier(
            supplier_code="NCC-TS-001",
            supplier_name="Công ty CP Thủy Hải Sản Biển Đông",
            contact_info={"contact_person": "Nguyễn Văn Tuấn", "phone": "0918.123.456", "email": "tuan@biendongseafood.vn", "address": "Cảng cá Vũng Tàu, BR-VT"},
            category="THỦY HẢI SẢN TƯƠI SỐNG",
            certifications=["HACCP CODEX", "ISO 22000:2018", "HALAL"],
            rating_score=95.0,
            risk_level="LOW",
            status="APPROVED",
            evaluation_date=date(2026, 7, 1),
            evaluation_notes="Đối tác chiến lược cung cấp cá ngừ vây vàng và cá cờ đạt chuẩn ISO 22000.",
        )
        s2 = Supplier(
            supplier_code="NCC-PG-002",
            supplier_name="Công ty TNHH Phụ Gia Thực Phẩm Miền Nam",
            contact_info={"contact_person": "Lê Thị Thu", "phone": "0903.789.012", "email": "thu@namfoodadditives.com", "address": "KCN Tân Tạo, Bình Tân, TP.HCM"},
            category="PHỤ GIA & GIA VỊ",
            certifications=["ISO 22000:2018", "FSSC 22000"],
            rating_score=91.5,
            risk_level="LOW",
            status="APPROVED",
            evaluation_date=date(2026, 6, 15),
            evaluation_notes="Hồ sơ tự công bố và phiếu COA từng lô đầy đủ.",
        )
        s3 = Supplier(
            supplier_code="NCC-BB-003",
            supplier_name="Công ty Bao Bì Màng Ghép Hoàng Gia",
            contact_info={"contact_person": "Trần Đình Trọng", "phone": "0989.456.789", "email": "trong@hoanggiapack.vn", "address": "KCN Sóng Thần, Dĩ An, Bình Dương"},
            category="BAO BÌ TIẾP XÚC TRỰC TIẾP",
            certifications=["ISO 9001:2015", "HACCP"],
            rating_score=78.0,
            risk_level="MEDIUM",
            status="APPROVED",
            evaluation_date=date(2026, 8, 1),
            evaluation_notes="Đã thẩm tra kiểm nghiệm thôi nhiễm chì và cadimi đạt QCVN.",
        )
        s4 = Supplier(
            supplier_code="NCC-DX-004",
            supplier_name="Cơ Sở Nước Đá Tinh Khiết Sông Tiền",
            contact_info={"contact_person": "Võ Văn Sang", "phone": "0939.112.233", "email": "sang@songtienice.vn", "address": "TP. Mỹ Tho, Tiền Giang"},
            category="NƯỚC ĐÁ BẢO QUẢN",
            certifications=["VSATTP Cấp Tỉnh"],
            rating_score=68.0,
            risk_level="HIGH",
            status="WARNING",
            evaluation_date=date(2026, 8, 20),
            evaluation_notes="Đánh giá BM-NCC-01: Chưa có chứng chỉ ISO/HACCP, kết quả thử nghiệm Clo dư đạt nhưng cần khắc phục hồ sơ nguồn nước.",
        )
        db.add_all([s1, s2, s3, s4])
        db.commit()
        print("[MASTER_SEED] Đã đồng bộ Danh mục Nhà cung cấp.")

    # 8. MODULE SEEDERS (Gọi các hàm chuyên biệt)
    seed_default_builders(db)
    seed_haccp_data_if_empty(db)
    seed_purchasing_data_if_empty(db)
    seed_default_equipments_if_empty(db)
    seed_emergency_data_if_empty(db)
    seed_default_dashboard_data(db)
    seed_default_audits(db)
    seed_capa_defaults(db)

    print("[MASTER_SEED] ✅ ĐỒNG BỘ TOÀN BỘ CƠ SỞ DỮ LIỆU THÀNH CÔNG 100%!")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_all_system_data(db)
    finally:
        db.close()
