from app.core.database import SessionLocal, engine, Base
from app.modules.inventory.models import VehicleInspection, DisposalRecord
from datetime import date, datetime

def init_logistics_tables():
    print("Creating tables for VehicleInspection and DisposalRecord...")
    Base.metadata.create_all(bind=engine, tables=[VehicleInspection.__table__, DisposalRecord.__table__])
    db = SessionLocal()

    try:
        # Cập nhật hoặc bổ sung seed data nếu bảng chưa có
        if db.query(VehicleInspection).count() == 0:
            print("Seeding vehicle_inspections (BM01-PTVC)...")
            v1 = VehicleInspection(
                inspection_code="PTVC-2026-001",
                inspection_date=datetime(2026, 9, 2, 7, 30),
                vehicle_plate="67C-184.29",
                driver_name="Nguyễn Văn Tài",
                driver_phone="0918.234.567",
                transport_company="Công ty TNHH Vận Tải Lạnh Mekong",
                valid_registration_check=True,
                cargo_integrity_check=True,
                clean_dry_check=True,
                no_odor_check=True,
                pest_free_check=True,
                inspection_result="PASS",
                inspector_name="Lê Hoàng Nam - KCS Xuất hàng",
                notes="Xe còn hạn đăng kiểm, thùng xe sạch sẽ, khô ráo, không mùi lạ, đủ điều kiện xếp hàng."
            )
            v2 = VehicleInspection(
                inspection_code="PTVC-2026-002",
                inspection_date=datetime(2026, 9, 4, 13, 15),
                vehicle_plate="67C-239.81",
                driver_name="Trần Quốc Huy",
                driver_phone="0903.882.119",
                transport_company="Đội xe Giao nhận Nội bộ",
                valid_registration_check=True,
                cargo_integrity_check=True,
                clean_dry_check=True,
                no_odor_check=True,
                pest_free_check=True,
                inspection_result="PASS",
                inspector_name="Lê Hoàng Nam - KCS Xuất hàng",
                notes="Thùng xe kín khít, không han gỉ, không có côn trùng, đủ điều kiện bốc xếp."
            )
            v3 = VehicleInspection(
                inspection_code="PTVC-2026-003",
                inspection_date=datetime(2026, 9, 5, 10, 0),
                vehicle_plate="51D-921.04",
                driver_name="Phạm Hùng Cường",
                driver_phone="0933.112.445",
                transport_company="Vận tải Việt Nhật Logistics",
                valid_registration_check=False,
                cargo_integrity_check=True,
                clean_dry_check=True,
                no_odor_check=False,
                pest_free_check=True,
                inspection_result="FAIL",
                inspector_name="Lê Hoàng Nam - KCS Xuất hàng",
                notes="Xe quá hạn đăng kiểm lưu hành và sàn xe có mùi xăng dầu lạ. Từ chối bốc xếp hàng theo quy định BM01-PTVC."
            )
            db.add_all([v1, v2, v3])
            db.commit()
            print("Seeded 3 vehicle inspections.")

        if db.query(DisposalRecord).count() == 0:
            print("Seeding disposal_records (BM02-HỦY HÀNG)...")
            d1 = DisposalRecord(
                record_code="BBHH-2026-001",
                disposal_date=date(2026, 8, 20),
                batch_number="BATCH-202607-B08",
                product_name="Cá tra phi lê cắt khúc tẩm gia vị",
                quantity=120.0,
                unit="kg",
                reason="Lô hàng lưu kho đệm vượt quá thời gian cho phép trong đợt bảo trì máy lạnh; chỉ số TPC vi sinh vật hiếu khí vượt giới hạn tiêu chuẩn cơ sở TCCS 03.",
                disposal_method="Hấp nhiệt tiệt trùng và chuyển giao cho Công ty Xử lý Môi trường Xanh An Giang chôn lấp hợp vệ sinh.",
                disposal_location="Bãi xử lý rác thải công nghiệp tập trung Tỉnh An Giang",
                witness_council="1. Ông Lê Hoàng Nam (Phòng Kinh doanh & Kho - Đơn vị thực hiện hủy)\n2. Bà Nguyễn Thị Cẩm Tú (Phòng Quản lý Chất lượng - P.QLCL)\n3. Ông Trần Hữu Nghĩa (Phòng Sản xuất - Đơn vị đề xuất hủy)",
                status="DISPOSED",
                approved_by="Phòng Quản lý Chất lượng (P.QLCL)",
                notes="Đã lập biên bản niêm phong và ghi hình bằng chứng tiêu hủy lưu trữ hồ sơ FSMS 2 năm."
            )
            d2 = DisposalRecord(
                record_code="BBHH-2026-002",
                disposal_date=date(2026, 9, 3),
                batch_number="LOT-BB-202608-03",
                product_name="Túi PA/PE hút chân không 500g in sẵn",
                quantity=350.0,
                unit="cái",
                reason="Màng ghép bị lỗi đường dán nhiệt không kín khí, phát hiện xì chân không trong quá trình test bảo quản thử nghiệm.",
                disposal_method="Cắt hủy vụn cơ học và bàn giao cho cơ sở tái chế hạt nhựa có giấy phép.",
                disposal_location="Khu phế liệu Nhà máy",
                witness_council="1. Ông Lê Hoàng Nam (Phòng Kinh doanh & Kho - Đơn vị thực hiện hủy)\n2. Bà Nguyễn Thị Cẩm Tú (Phòng Quản lý Chất lượng - P.QLCL)\n3. Ông Phan Đình Trọng (Bộ phận Bao bì Vật tư - Đơn vị đề xuất hủy)",
                status="DISPOSED",
                approved_by="Phòng Quản lý Chất lượng (P.QLCL)",
                notes="Đã lập biên bản khiếu nại nhà cung cấp bao bì bù trừ công nợ."
            )
            db.add_all([d1, d2])
            db.commit()
            print("Seeded 2 disposal records.")

        print("Logistics tables initialized successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    init_logistics_tables()
