import dotenv
dotenv.load_dotenv(".env")
import hashlib
import shutil
from datetime import date, datetime, timezone, timedelta
from pathlib import Path
from app.core.database import SessionLocal
from app.modules.documents.models import Document, DocumentChangeRequest, DocumentDistribution, ExternalDocument


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DOCUMENT_ROOT = PROJECT_ROOT / "Hệ thống tài liệu ISO 22000 (Mẫu) An Giang"
DOCUMENTS_UPLOAD_DIR = PROJECT_ROOT / "backend" / "uploads" / "documents"
SUPPORTED_SOURCE_EXTENSIONS = {".doc", ".docx", ".xls", ".xlsx", ".pdf"}


def classify_source_document(relative_path: Path) -> tuple[str, str]:
    """Map an original An Giang file to DMS metadata without altering its content."""
    path = str(relative_path).lower()
    filename = relative_path.stem.lower()
    if "quyet dinh" in path or "quyết định" in path:
        return "DECISION", "Ban Giám đốc"
    if relative_path.suffix.lower() in {".xls", ".xlsx"}:
        return "FORM", "Ban QLCL & ATTP"
    if "chính sách" in filename or "chinh sach" in filename or "muc tieu" in filename or "mục tiêu" in filename:
        return "POLICY", "Ban Giám đốc"
    if "sổ tay" in path or "so tay" in path:
        return "MANUAL", "Ban QLCL & ATTP"
    if filename.startswith(("bm", "phụ lục", "phu luc", "biểu mẫu", "bieu mau")) or "phiếu" in filename or "phieu" in filename:
        return "FORM", "Ban QLCL & ATTP"
    if "hướng dẫn" in path or "huong dan" in path or "quy định" in path or "quy dinh" in path:
        return "WI", "Ban QLCL & ATTP"
    return "SOP", "Ban QLCL & ATTP"


def sync_an_giang_source_documents(db) -> tuple[int, int]:
    """Register every original source file and copy it to the DMS download area.

    Imported originals are deliberately PENDING_APPROVAL: a source template is
    evidence for review, not an automatically approved controlled document.
    """
    if not SOURCE_DOCUMENT_ROOT.is_dir():
        print(f"[SEED DMS] Không tìm thấy thư mục nguồn: {SOURCE_DOCUMENT_ROOT}")
        return 0, 0

    DOCUMENTS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    created = updated = 0
    source_files = sorted(
        path for path in SOURCE_DOCUMENT_ROOT.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_SOURCE_EXTENSIONS
    )
    for source_path in source_files:
        relative_path = source_path.relative_to(SOURCE_DOCUMENT_ROOT)
        digest = hashlib.sha256(relative_path.as_posix().encode("utf-8")).hexdigest()[:12].upper()
        doc_code = f"AG-{digest}"
        target_name = f"angiang_{digest}{source_path.suffix.lower()}"
        target_path = DOCUMENTS_UPLOAD_DIR / target_name
        if not target_path.exists() or source_path.stat().st_mtime > target_path.stat().st_mtime:
            shutil.copy2(source_path, target_path)

        doc_type, department = classify_source_document(relative_path)
        provenance = f"Nguồn gốc An Giang: {relative_path.as_posix()}"
        values = {
            "doc_title": source_path.stem[:255],
            "doc_type": doc_type,
            "department": department,
            "standard": "ISO 22000:2018 / Tài liệu mẫu An Giang",
            "current_version": "SOURCE",
            "status": "PENDING_APPROVAL",
            "content": provenance,
            "file_url": f"/api/v1/documents/files/{target_name}",
            "security_level": "INTERNAL",
        }
        existing = db.query(Document).filter(Document.doc_code == doc_code).first()
        if existing:
            for key, value in values.items():
                setattr(existing, key, value)
            updated += 1
        else:
            db.add(Document(doc_code=doc_code, **values))
            created += 1
    db.commit()
    return created, updated

def seed_dms():
    db = SessionLocal()
    try:
        print("[SEED DMS] Bắt đầu nạp dữ liệu Hệ thống Quản lý Tài liệu An Giang...")

        # 1. Nạp và chuẩn hóa các tài liệu nội bộ (Bao gồm các Quy trình chủ chốt An Giang)
        an_giang_core_docs = [
            {
                "doc_code": "POL-FSMS-01",
                "doc_title": "Chính sách An toàn Thực phẩm & Cam kết Lãnh đạo",
                "doc_type": "POLICY",
                "department": "Ban Giám đốc",
                "standard": "ISO 22000:2018",
                "current_version": "2.0",
                "status": "APPROVED",
                "effective_date": date(2023, 1, 1),
                "review_due_date": date(2026, 1, 1),
                "drafter_name": "Trần Anh (Đội trưởng FSMS)",
                "reviewer_name": "Lê Hoàng Phúc (Tổng Giám Đốc)",
                "security_level": "PUBLIC",
            },
            {
                "doc_code": "MAN-FSMS-01",
                "doc_title": "Sổ tay Hệ thống Quản lý ATTP theo ISO 22000:2018",
                "doc_type": "MANUAL",
                "department": "Ban QLCL & ATTP",
                "standard": "ISO 22000:2018",
                "current_version": "1.2",
                "status": "APPROVED",
                "effective_date": date(2023, 3, 1),
                "review_due_date": date(2026, 3, 1),
                "drafter_name": "Trần Anh (Đội trưởng FSMS)",
                "reviewer_name": "Lê Hoàng Phúc (Tổng Giám Đốc)",
                "security_level": "INTERNAL",
            },
            {
                "doc_code": "QT-01-KSTL",
                "doc_title": "Quy trình Kiểm soát Tài liệu & Thông tin dạng văn bản",
                "doc_type": "SOP",
                "department": "Ban QLCL & ATTP",
                "standard": "ISO 22000:2018 (Điều 7.5)",
                "current_version": "3.0",
                "status": "APPROVED",
                "effective_date": date(2023, 5, 10),
                "review_due_date": date.today() + timedelta(days=20), # Sắp đến hạn soát xét 3 năm
                "drafter_name": "Nguyễn Văn Đạt (Kỹ sư QA)",
                "reviewer_name": "Trần Anh (Đội trưởng FSMS)",
                "security_level": "INTERNAL",
            },
            {
                "doc_code": "QT-02-KSHS",
                "doc_title": "Quy trình Kiểm soát Hồ sơ & Dữ liệu truy xuất",
                "doc_type": "SOP",
                "department": "Ban QLCL & ATTP",
                "standard": "ISO 22000:2018 (Điều 7.5.3)",
                "current_version": "2.0",
                "status": "APPROVED",
                "effective_date": date(2023, 6, 1),
                "review_due_date": date.today() + timedelta(days=35),
                "drafter_name": "Nguyễn Văn Đạt (Kỹ sư QA)",
                "reviewer_name": "Trần Anh (Đội trưởng FSMS)",
                "security_level": "INTERNAL",
            },
            {
                "doc_code": "QT-09-KSQT",
                "doc_title": "Quy trình Kiểm soát Chất lượng Quá trình Chế biến (IPQC)",
                "doc_type": "SOP",
                "department": "Phòng QC & Sản xuất",
                "standard": "HACCP / ISO 22000",
                "current_version": "2.0",
                "status": "APPROVED",
                "effective_date": date(2023, 8, 15),
                "review_due_date": date.today() - timedelta(days=15), # Đã quá hạn 3 năm cần soát xét
                "drafter_name": "Lê Văn Hùng (Chuyên viên QC)",
                "reviewer_name": "Trần Anh (Đội trưởng FSMS)",
                "security_level": "INTERNAL",
            },
            {
                "doc_code": "QT-14-QTDT",
                "doc_title": "Quy trình Đào tạo & Nâng cao Năng lực Nhân sự ATTP",
                "doc_type": "SOP",
                "department": "Phòng Nhân sự & Ban QLCL",
                "standard": "ISO 22000:2018 (Điều 7.2)",
                "current_version": "2.1",
                "status": "APPROVED",
                "effective_date": date(2023, 9, 1),
                "review_due_date": date.today() + timedelta(days=120),
                "drafter_name": "Ngô Thị Mai (Trưởng phòng Nhân sự)",
                "reviewer_name": "Trần Anh (Đội trưởng FSMS)",
                "security_level": "INTERNAL",
            },
            {
                "doc_code": "SOP-HACCP-01",
                "doc_title": "Quy trình Phân tích mối nguy & Thiết lập Điểm kiểm soát tới hạn (CCP/oPRP)",
                "doc_type": "SOP",
                "department": "Ban QLCL & ATTP",
                "standard": "HACCP / ISO 22000",
                "current_version": "2.1",
                "status": "APPROVED",
                "effective_date": date(2026, 2, 1),
                "review_due_date": date(2029, 2, 1),
                "drafter_name": "Nguyễn Văn Đạt (Kỹ sư QA)",
                "reviewer_name": "Trần Anh (Đội trưởng FSMS)",
                "security_level": "INTERNAL",
            },
        ]

        for d_info in an_giang_core_docs:
            existing = db.query(Document).filter(Document.doc_code == d_info["doc_code"]).first()
            if not existing:
                db.add(Document(**d_info))
            else:
                for k, v in d_info.items():
                    setattr(existing, k, v)
        db.commit()
        print(f"[SEED DMS] Đã cập nhật/tạo {len(an_giang_core_docs)} tài liệu nội bộ chính quy.")

        created, updated = sync_an_giang_source_documents(db)
        print(
            "[SEED DMS] Đã đồng bộ tệp nguồn An Giang vào DMS: "
            f"tạo mới {created}, cập nhật {updated}."
        )

        # 2. Thêm Danh mục tài liệu bên ngoài (BM04-KSTL)
        external_docs_data = [
            {
                "doc_code": "Luật 55/2010/QH12",
                "doc_title": "Luật An toàn Thực phẩm số 55/2010/QH12",
                "category": "LAW_REGULATION",
                "issuing_body": "Quốc hội nước CHXHCN Việt Nam",
                "published_date": date(2010, 6, 17),
                "effective_date": date(2011, 7, 1),
                "status": "EFFECTIVE",
                "department_in_charge": "Ban QLCL & ATTP",
                "review_frequency": "ANNUAL",
                "last_checked_date": date(2026, 1, 10),
                "checked_by_name": "Trần Anh (Đội trưởng FSMS)",
                "notes": "Văn bản pháp lý nền tảng cao nhất về an toàn thực phẩm tại Việt Nam.",
            },
            {
                "doc_code": "Nghị định 15/2018/NĐ-CP",
                "doc_title": "Nghị định quy định chi tiết thi hành một số điều của Luật An toàn thực phẩm",
                "category": "LAW_REGULATION",
                "issuing_body": "Chính phủ nước CHXHCN Việt Nam",
                "published_date": date(2018, 2, 2),
                "effective_date": date(2018, 2, 2),
                "status": "EFFECTIVE",
                "department_in_charge": "Ban QLCL & ATTP",
                "review_frequency": "ANNUAL",
                "last_checked_date": date(2026, 1, 10),
                "checked_by_name": "Trần Anh (Đội trưởng FSMS)",
                "notes": "Quy định tự công bố, đăng ký bản công bố, điều kiện bảo đảm ATTP và kiểm tra nhà nước.",
            },
            {
                "doc_code": "TCVN ISO 22000:2018",
                "doc_title": "Hệ thống quản lý an toàn thực phẩm - Yêu cầu đối với các tổ chức trong chuỗi thực phẩm",
                "category": "STANDARD_TCVN_ISO",
                "issuing_body": "Bộ Khoa học và Công nghệ (Tổng cục Tiêu chuẩn Đo lường Chất lượng)",
                "published_date": date(2018, 12, 28),
                "effective_date": date(2018, 12, 28),
                "status": "EFFECTIVE",
                "department_in_charge": "Ban QLCL & ATTP",
                "review_frequency": "ANNUAL",
                "last_checked_date": date(2026, 1, 10),
                "checked_by_name": "Trần Anh (Đội trưởng FSMS)",
                "notes": "Tiêu chuẩn gốc làm căn cứ xây dựng toàn bộ hệ thống quản lý FSMS của Công ty.",
            },
            {
                "doc_code": "QCVN 01-1:2018/BYT",
                "doc_title": "Quy chuẩn kỹ thuật quốc gia về chất lượng nước sạch sử dụng cho mục đích sinh hoạt",
                "category": "LAW_REGULATION",
                "issuing_body": "Bộ Y tế",
                "published_date": date(2018, 12, 14),
                "effective_date": date(2019, 6, 15),
                "status": "EFFECTIVE",
                "department_in_charge": "Phòng QC & Bộ phận Kỹ thuật",
                "review_frequency": "ANNUAL",
                "last_checked_date": date(2026, 2, 15),
                "checked_by_name": "Lê Văn Hùng (Chuyên viên QC)",
                "notes": "Tiêu chuẩn kiểm soát nguồn nước rửa nguyên liệu và chế biến thực phẩm.",
            },
            {
                "doc_code": "QCVN 8-2:2011/BYT",
                "doc_title": "Quy chuẩn kỹ thuật quốc gia đối với giới hạn ô nhiễm kim loại nặng trong thực phẩm",
                "category": "LAW_REGULATION",
                "issuing_body": "Bộ Y tế",
                "published_date": date(2011, 1, 13),
                "effective_date": date(2011, 7, 1),
                "status": "EFFECTIVE",
                "department_in_charge": "Ban QLCL & ATTP",
                "review_frequency": "ANNUAL",
                "last_checked_date": date(2026, 1, 15),
                "checked_by_name": "Trần Anh (Đội trưởng FSMS)",
                "notes": "Giới hạn Cadimi, Chì, Thủy ngân, Asen trong nông sản thực phẩm.",
            },
            {
                "doc_code": "CXC 1-1969 (Rev. 2020)",
                "doc_title": "General Principles of Food Hygiene (Codex Alimentarius - HACCP System and Guidelines for its Application)",
                "category": "STANDARD_TCVN_ISO",
                "issuing_body": "Ủy ban Tiêu chuẩn Thực phẩm Quốc tế (FAO/WHO Codex Alimentarius)",
                "published_date": date(2020, 11, 1),
                "effective_date": date(2020, 11, 1),
                "status": "EFFECTIVE",
                "department_in_charge": "Ban QLCL & ATTP",
                "review_frequency": "ANNUAL",
                "last_checked_date": date(2026, 1, 10),
                "checked_by_name": "Trần Anh (Đội trưởng FSMS)",
                "notes": "Tài liệu tham chiếu quốc tế về nguyên tắc HACCP và điều kiện tiên quyết GHP/PRP.",
            }
        ]

        for item in external_docs_data:
            existing = db.query(ExternalDocument).filter(ExternalDocument.doc_code == item["doc_code"]).first()
            if not existing:
                db.add(ExternalDocument(**item))
        db.commit()
        print(f"[SEED DMS] Đã nạp {len(external_docs_data)} tài liệu nguồn gốc bên ngoài (BM04-KSTL).")

        # 3. Thêm Phiếu yêu cầu xem xét tài liệu (BM01-KSTL)
        ref_doc = db.query(Document).filter(Document.doc_code == "SOP-HACCP-01").first()
        doc_id = ref_doc.document_id if ref_doc else None

        change_requests_data = [
            {
                "request_code": "YCXS-2026-001",
                "document_id": doc_id,
                "doc_code": "SOP-HACCP-01",
                "doc_title": "Quy trình Phân tích mối nguy & Thiết lập Điểm kiểm soát tới hạn (CCP/oPRP)",
                "change_type": "REVISION",
                "department": "Ban QLCL & ATTP",
                "requested_by_name": "Nguyễn Văn Đạt (Kỹ sư QA)",
                "request_date": date(2026, 2, 10),
                "reason": "Cập nhật bổ sung chỉ tiêu thanh thử chuẩn cho máy dò kim loại (Fe 0.5mm, SUS 0.8mm) theo hướng dẫn thực tế ISO 22000 An Giang và khách hàng xuất khẩu.",
                "proposed_content": "Bổ sung Biểu mẫu BM06-KSQT vào phụ lục quy trình, điều chỉnh tần suất kiểm tra máy dò kim loại đầu ca, giữa ca và cuối ca.",
                "target_completion_date": date(2026, 3, 1),
                "assigned_drafter": "Nguyễn Văn Đạt (Kỹ sư QA)",
                "dept_head_opinion": "AGREE",
                "dept_head_comment": "Nhất trí đề xuất. Đề nghị bổ sung thêm hướng dẫn hành động khắc phục khi phát hiện phế phẩm dính kim loại.",
                "dept_head_signed_at": datetime.now(timezone.utc),
                "dept_head_signer_name": "Trần Anh (Trưởng ban QLCL)",
                "qa_head_opinion": "AGREE",
                "qa_head_comment": "Đã đối chiếu với TCVN ISO 22000:2018 mục 8.5.2 và tài liệu kiểm soát quá trình An Giang, hoàn toàn phù hợp.",
                "qa_head_signed_at": datetime.now(timezone.utc),
                "qa_head_signer_name": "Trần Anh (Đội trưởng FSMS)",
                "director_approval": "APPROVED",
                "director_comment": "Phê duyệt triển khai ban hành bản sửa đổi 2.1.",
                "director_signed_at": datetime.now(timezone.utc),
                "director_signer_name": "Lê Hoàng Phúc (Tổng Giám Đốc)",
                "status": "APPROVED",
            },
            {
                "request_code": "YCXS-2026-002",
                "document_id": None,
                "doc_code": "SOP-IPQC-01",
                "doc_title": "Quy trình Kiểm soát Chất lượng Công đoạn Chế biến (IPQC)",
                "change_type": "NEW",
                "department": "Phòng Sản xuất",
                "requested_by_name": "Phạm Quốc Toàn (Quản đốc Sản xuất)",
                "request_date": date(2026, 2, 20),
                "reason": "Chuẩn hóa các công đoạn sơ chế rửa thái, sấy làm nguội, nghiền sàng và hồ hóa theo bộ biểu mẫu BM01-05 KSQT.",
                "proposed_content": "Xây dựng SOP mới chi tiết các thông số kỹ thuật (nhiệt độ sấy 60-70C, độ ẩm <10%, cỡ lưới sàng 100 mesh).",
                "target_completion_date": date(2026, 3, 15),
                "assigned_drafter": "Lê Văn Hùng (QC IPQC)",
                "dept_head_opinion": "AGREE",
                "dept_head_comment": "Rất cần thiết để đồng bộ giữa công nhân vận hành và QC kiểm soát.",
                "dept_head_signed_at": datetime.now(timezone.utc),
                "dept_head_signer_name": "Phạm Quốc Toàn (Trưởng phòng Sản xuất)",
                "qa_head_opinion": "AGREE",
                "qa_head_comment": "Ban QLCL ủng hộ, sẽ phối hợp rà soát ngưỡng giới hạn vận hành.",
                "qa_head_signed_at": datetime.now(timezone.utc),
                "qa_head_signer_name": "Trần Anh (Trưởng ban QLCL)",
                "status": "QA_REVIEWED",
            }
        ]

        for req in change_requests_data:
            existing = db.query(DocumentChangeRequest).filter(DocumentChangeRequest.request_code == req["request_code"]).first()
            if not existing:
                db.add(DocumentChangeRequest(**req))
        db.commit()
        print(f"[SEED DMS] Đã nạp {len(change_requests_data)} phiếu yêu cầu xem xét tài liệu (BM01-KSTL).")

        # 4. Thêm Thông báo thay đổi & Sổ phân phối tài liệu (BM02-KSTL)
        target_doc = db.query(Document).filter(Document.doc_code == "SOP-HACCP-01").first()
        if target_doc:
            distributions_data = [
                {
                    "notice_code": "TB-KSTL-2026-001",
                    "document_id": target_doc.document_id,
                    "doc_code": target_doc.doc_code,
                    "doc_title": target_doc.doc_title,
                    "version": "2.1",
                    "effective_date": date(2026, 2, 1),
                    "change_summary": "Bổ sung mẫu nhật ký kiểm tra máy dò kim loại BM06-KSQT và cập nhật thông số thanh thử chuẩn Fe 0.5mm, SUS 0.8mm.",
                    "department_recipient": "Phòng Sản xuất",
                    "distribution_method": "HARDCOPY_CONTROLLED",
                    "copy_number": 1,
                    "distributed_by_name": "Nguyễn Văn Đạt (Doc Controller)",
                    "distribution_date": date(2026, 2, 2),
                    "acknowledged": True,
                    "acknowledged_by_name": "Phạm Quốc Toàn (Quản đốc)",
                    "acknowledged_at": datetime(2026, 2, 2, 8, 30, tzinfo=timezone.utc),
                    "obsolete_copy_retrieved": True,
                    "retrieval_date": date(2026, 2, 3),
                    "notes": "Đã thu hồi bản in ver 2.0 và đóng mộc HẾT HIỆU LỰC.",
                },
                {
                    "notice_code": "TB-KSTL-2026-001",
                    "document_id": target_doc.document_id,
                    "doc_code": target_doc.doc_code,
                    "doc_title": target_doc.doc_title,
                    "version": "2.1",
                    "effective_date": date(2026, 2, 1),
                    "change_summary": "Bổ sung mẫu nhật ký kiểm tra máy dò kim loại BM06-KSQT và cập nhật thông số thanh thử chuẩn Fe 0.5mm, SUS 0.8mm.",
                    "department_recipient": "Phòng Kiểm tra Chất lượng (QC)",
                    "distribution_method": "PORTAL",
                    "copy_number": 1,
                    "distributed_by_name": "Nguyễn Văn Đạt (Doc Controller)",
                    "distribution_date": date(2026, 2, 2),
                    "acknowledged": True,
                    "acknowledged_by_name": "Lê Văn Hùng (Kỹ thuật viên QC)",
                    "acknowledged_at": datetime(2026, 2, 2, 9, 15, tzinfo=timezone.utc),
                    "obsolete_copy_retrieved": True,
                    "retrieval_date": date(2026, 2, 2),
                    "notes": "Đã cập nhật biểu mẫu điện tử trên phần mềm.",
                },
                {
                    "notice_code": "TB-KSTL-2026-001",
                    "document_id": target_doc.document_id,
                    "doc_code": target_doc.doc_code,
                    "doc_title": target_doc.doc_title,
                    "version": "2.1",
                    "effective_date": date(2026, 2, 1),
                    "change_summary": "Bổ sung mẫu nhật ký kiểm tra máy dò kim loại BM06-KSQT và cập nhật thông số thanh thử chuẩn Fe 0.5mm, SUS 0.8mm.",
                    "department_recipient": "Phòng Cơ điện - Bảo trì",
                    "distribution_method": "PORTAL",
                    "copy_number": 1,
                    "distributed_by_name": "Nguyễn Văn Đạt (Doc Controller)",
                    "distribution_date": date(2026, 2, 2),
                    "acknowledged": False,
                    "acknowledged_by_name": None,
                    "acknowledged_at": None,
                    "obsolete_copy_retrieved": False,
                    "retrieval_date": None,
                    "notes": "Đang chờ Trưởng phòng Cơ điện ký xác nhận.",
                }
            ]

            for dist in distributions_data:
                existing = db.query(DocumentDistribution).filter(
                    DocumentDistribution.notice_code == dist["notice_code"],
                    DocumentDistribution.department_recipient == dist["department_recipient"]
                ).first()
                if not existing:
                    db.add(DocumentDistribution(**dist))
            db.commit()
            print(f"[SEED DMS] Đã nạp {len(distributions_data)} bản ghi phân phối tài liệu (BM02-KSTL).")

        print("[SEED DMS] Hoàn thành nạp dữ liệu DMS thành công!")
    except Exception as e:
        db.rollback()
        print(f"[SEED DMS ERROR] {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_dms()
