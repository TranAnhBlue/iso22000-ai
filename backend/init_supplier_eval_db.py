from app.core.database import SessionLocal, engine, Base
from app.models.purchasing import Supplier, SupplierEvaluationPlan, SupplierEvaluation
from datetime import date, datetime
import uuid

def init_supplier_eval_tables():
    print("Creating tables for SupplierEvaluationPlan and SupplierEvaluation...")
    Base.metadata.create_all(bind=engine, tables=[SupplierEvaluationPlan.__table__, SupplierEvaluation.__table__])
    db = SessionLocal()

    try:
        # Check existing suppliers or create sample ones
        suppliers = db.query(Supplier).all()
        print(f"Current suppliers in DB: {len(suppliers)}")

        supp_agri = None
        supp_aqua = None
        supp_pack = None

        for s in suppliers:
            c = (s.category or "").lower()
            name = (s.supplier_name or "").lower()
            if "thủy" in c or "cá" in name or "hải sản" in name or "aqua" in c:
                supp_aqua = s
            elif "nông sản" in c or "rau" in name or "củ" in name or "tươi" in c:
                supp_agri = s
            elif "bao bì" in c or "phụ gia" in c or "khô" in c or "bao bì" in name:
                supp_pack = s

        # Fallback if any not found
        if not supp_agri and len(suppliers) > 0:
            supp_agri = suppliers[0]
        if not supp_aqua and len(suppliers) > 1:
            supp_aqua = suppliers[1]
        elif not supp_aqua and len(suppliers) > 0:
            supp_aqua = suppliers[0]
        if not supp_pack and len(suppliers) > 2:
            supp_pack = suppliers[2]
        elif not supp_pack and len(suppliers) > 0:
            supp_pack = suppliers[0]

        # 1. Seed Plan
        plan = db.query(SupplierEvaluationPlan).filter(SupplierEvaluationPlan.plan_code == "KHĐG-2026-01").first()
        if not plan:
            print("Seeding supplier_evaluation_plans...")
            plan = SupplierEvaluationPlan(
                plan_code="KHĐG-2026-01",
                year=2026,
                title="Kế hoạch Đánh giá Năng lực Nhà cung ứng Định kỳ Năm 2026",
                department="Phòng Đảm Bảo Chất Lượng (QA/QC)",
                scope="Toàn bộ nhà cung cấp nguyên liệu tươi sống (nông sản, thủy sản), phụ gia thực phẩm và bao bì tiếp xúc trực tiếp",
                approved_by="Trần Anh Đức - Giám Đốc Nhà Máy",
                approval_status="APPROVED",
                created_at=datetime(2026, 1, 10, 8, 0)
            )
            db.add(plan)
            db.commit()
            db.refresh(plan)

        # 2. Seed Evaluations
        if db.query(SupplierEvaluation).count() == 0:
            print("Seeding supplier_evaluations...")

            # BM03: Nông sản tươi
            e1 = SupplierEvaluation(
                evaluation_code="ĐGNCC-2026-001",
                plan_id=plan.id,
                supplier_id=supp_agri.supplier_id if supp_agri else uuid.uuid4(),
                criteria_type="AGRI_FRESH",
                evaluation_date=date(2026, 8, 15),
                evaluator_name="Nguyễn Văn An (QA Lead)",
                audit_type="ON_SITE",
                criteria_scores=[
                    {
                        "id": "af_1",
                        "name": "Nguồn nước tưới & Đất canh tác",
                        "max_score": 25,
                        "description": "Vùng trồng không bị ô nhiễm kim loại nặng, nguồn nước tưới có kết quả xét nghiệm vi sinh đạt chuẩn.",
                        "score": 25,
                        "pass_fail": "PASS",
                        "notes": "Đất và nước tưới kiểm nghiệm âm tính kim loại nặng và vi sinh gây bệnh (QCVN 08-MT:2015)."
                    },
                    {
                        "id": "af_2",
                        "name": "Quản lý Phân bón & Thuốc BVTV",
                        "max_score": 30,
                        "description": "Sử dụng phân bón và thuốc BVTV trong danh mục cho phép, tuân thủ thời gian cách ly (PHI).",
                        "score": 28,
                        "pass_fail": "PASS",
                        "notes": "Có ghi chép nhật ký đồng ruộng chi tiết, cách ly 14-21 ngày."
                    },
                    {
                        "id": "af_3",
                        "name": "Thu hoạch, Đóng gói & Vận chuyển",
                        "max_score": 25,
                        "description": "Dụng cụ thu hoạch sạch sẽ, đóng sọt bạt che chắn tránh dập nát, không lẫn hóa chất độc hại.",
                        "score": 24,
                        "pass_fail": "PASS",
                        "notes": "Sọt nhựa sạch, có lót giấy xốp giảm va đập khi xe chạy."
                    },
                    {
                        "id": "af_4",
                        "name": "Hồ sơ Pháp lý & Chứng nhận ATTP",
                        "max_score": 20,
                        "description": "Có Giấy chứng nhận đủ điều kiện ATTP hoặc chứng chỉ VietGAP/GlobalGAP còn hiệu lực.",
                        "score": 20,
                        "pass_fail": "PASS",
                        "notes": "Chứng chỉ VietGAP Trồng trọt số TCVN 11892-1:2017 còn hiệu lực đến 11/2027."
                    }
                ],
                total_score=97.0,
                grade="A",
                conclusion="APPROVED",
                corrective_actions="Duy trì phương thức sơ chế hiện tại, tiếp tục gửi mẫu nước định kỳ mỗi 6 tháng.",
                approved_by="Trần Anh Đức - Giám Đốc Nhà Máy",
                created_at=datetime(2026, 8, 16, 9, 30)
            )

            # Bộ tiêu chí bổ sung (Do dự án tự xây dựng) — Thủy hải sản tươi sống
            e2 = SupplierEvaluation(
                evaluation_code="ĐGNCC-2026-002",
                plan_id=plan.id,
                supplier_id=supp_aqua.supplier_id if supp_aqua else uuid.uuid4(),
                criteria_type="AQUA_ANIMAL_FRESH",
                evaluation_date=date(2026, 8, 20),
                evaluator_name="Lê Hoàng Nam (Chuyên viên HACCP)",
                audit_type="ON_SITE",
                criteria_scores=[
                    {
                        "id": "ts_1",
                        "name": "Mã số Vùng nuôi & Nhật ký ao",
                        "max_score": 25,
                        "description": "Có mã số nhận diện cơ sở nuôi thủy sản theo Luật Thủy sản, có nhật ký thức ăn và con giống.",
                        "score": 25,
                        "pass_fail": "PASS",
                        "notes": "Mã vùng nuôi AG-CATA-008, dữ liệu truy xuất qua hệ thống quản lý ao điện tử."
                    },
                    {
                        "id": "ts_2",
                        "name": "Kiểm soát Kháng sinh cấm & Hóa chất",
                        "max_score": 30,
                        "description": "Cam kết và kiểm nghiệm không tồn dư kháng sinh cấm (Chloramphenicol, Ciprofloxacin, Enrofloxacin).",
                        "score": 29,
                        "pass_fail": "PASS",
                        "notes": "100% các mẻ kiểm tra trước thu hoạch âm tính chất cấm."
                    },
                    {
                        "id": "ts_3",
                        "name": "Bảo quản Lạnh & Vận chuyển xe bồn/ướp đá",
                        "max_score": 25,
                        "description": "Sử dụng đá lạnh từ nước sạch VSATTP, tỉ lệ ướp đá đảm bảo nhiệt độ cá duy trì 0 - 4°C.",
                        "score": 24,
                        "pass_fail": "PASS",
                        "notes": "Xe tải bồn có máy tạo oxy, nhiệt độ nước 18-20°C, cá sống khỏe mạnh khi đến nhà máy."
                    },
                    {
                        "id": "ts_4",
                        "name": "Chứng nhận Chuẩn Nuôi & ATTP",
                        "max_score": 20,
                        "description": "Đạt chứng nhận VietGAP thủy sản / ASC / BAP / Giấy chứng nhận cơ sở đủ điều kiện ATTP.",
                        "score": 20,
                        "pass_fail": "PASS",
                        "notes": "Đạt chứng nhận ASC (Aquaculture Stewardship Council) chuẩn xuất khẩu EU/Mỹ."
                    }
                ],
                total_score=98.0,
                grade="A",
                conclusion="APPROVED",
                corrective_actions="Không có điểm không phù hợp. Tiếp tục duy trì chứng chỉ ASC.",
                approved_by="Trần Anh Đức - Giám Đốc Nhà Máy",
                created_at=datetime(2026, 8, 21, 14, 0)
            )

            # BM04: Khô, phụ gia & bao bì
            e3 = SupplierEvaluation(
                evaluation_code="ĐGNCC-2026-003",
                plan_id=plan.id,
                supplier_id=supp_pack.supplier_id if supp_pack else uuid.uuid4(),
                criteria_type="PROCESSED_DRY_PACKAGING",
                evaluation_date=date(2026, 8, 25),
                evaluator_name="Nguyễn Văn An (QA Lead)",
                audit_type="PERIODIC",
                criteria_scores=[
                    {
                        "id": "dp_1",
                        "name": "Hồ sơ Công bố Hợp quy & Tự công bố",
                        "max_score": 25,
                        "description": "Có Bản tự công bố sản phẩm hoặc Giấy tiếp nhận đăng ký bản công bố hợp quy theo NĐ 15/2018.",
                        "score": 25,
                        "pass_fail": "PASS",
                        "notes": "Hồ sơ tự công bố số 01/TANTIEN/2025 còn hiệu lực đầy đủ."
                    },
                    {
                        "id": "dp_2",
                        "name": "Phiếu Thử nghiệm Định kỳ (COA)",
                        "max_score": 30,
                        "description": "Phiếu kết quả thử nghiệm định kỳ vi sinh, kim loại nặng, thôi nhiễm thôi độc bao bì tiếp xúc thực phẩm.",
                        "score": 26,
                        "pass_fail": "PASS",
                        "notes": "COA kiểm nghiệm thôi nhiễm chì và cadmi tại Quatest 3 đạt chuẩn QCVN 12-1:2011/BYT."
                    },
                    {
                        "id": "dp_3",
                        "name": "Điều kiện Kho tàng & Chống Côn trùng",
                        "max_score": 25,
                        "description": "Kho bảo quản nguyên liệu/bao bì khô ráo, kê pallet cách tường cách sàn 20cm, bẫy đèn côn trùng.",
                        "score": 20,
                        "pass_fail": "PASS",
                        "notes": "Khu vực kho nguyên liệu hạt nhựa cần bổ sung thêm 1 đèn bẫy côn trùng tại cửa ra vào số 2."
                    },
                    {
                        "id": "dp_4",
                        "name": "Tem nhãn & Cảnh báo Dị nguyên (Allergen)",
                        "max_score": 20,
                        "description": "Ghi nhãn hàng hóa đúng Nghị định 43/2017 & 111/2021, thông tin hướng dẫn bảo quản, ngày sản xuất.",
                        "score": 18,
                        "pass_fail": "PASS",
                        "notes": "Tem nhãn thùng carton đạt chuẩn, cần ghi rõ mã lô sản xuất trên từng bó màng."
                    }
                ],
                total_score=89.0,
                grade="A",
                conclusion="APPROVED",
                corrective_actions="Yêu cầu lắp bổ sung đèn bẫy côn trùng tại cửa kho số 2 trước ngày 30/09/2026.",
                approved_by="Trần Anh Đức - Giám Đốc Nhà Máy",
                created_at=datetime(2026, 8, 26, 11, 0)
            )

            db.add_all([e1, e2, e3])
            db.commit()
            print("Seeded 3 realistic evaluations successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error initializing supplier evaluation tables: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    init_supplier_eval_tables()
