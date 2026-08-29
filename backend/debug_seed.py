from app.core.database import SessionLocal
from app.models.audit import InternalAudit, AuditFinding, TrainingCourse, TrainingParticipantRecord, HealthDeclarationRecord
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

db = SessionLocal()
try:
    print("Checking audits...")
    audits = db.query(InternalAudit).all()
    for aud in audits:
        f_count = db.query(AuditFinding).filter(AuditFinding.audit_id == aud.audit_id).count()
        print(f"Audit {aud.audit_code} ({aud.title}) has {f_count} findings.")
        if f_count == 0:
            f1 = AuditFinding(
                audit_id=aud.audit_id,
                clause_number="4.1",
                clause_title="Bối cảnh tổ chức & Nhu cầu các bên quan tâm",
                department="Toàn bộ nhà máy",
                question="Hồ sơ phân tích bối cảnh nội bộ và bên ngoài (SWOT/PESTEL) có được định kỳ cập nhật không?",
                evidence_reviewed="Sổ tay bối cảnh tổ chức và biên bản rà soát hàng quý.",
                result="CONFORMITY",
                finding_notes="Hồ sơ phân tích SWOT và ma trận bên quan tâm được cập nhật đầy đủ.",
            )
            f2 = AuditFinding(
                audit_id=aud.audit_id,
                clause_number="5.2",
                clause_title="Chính sách An toàn Thực phẩm & Mục tiêu Chất lượng",
                department="Ban Giám Đốc & QA",
                question="Chính sách ATTP có được truyền thông và niêm yết tại các vị trí dễ thấy trong xưởng không?",
                evidence_reviewed="Bảng tin xưởng sản xuất và khu vực tiếp nhận khách.",
                result="CONFORMITY",
                finding_notes="Chính sách ATTP được truyền thông và niêm yết tại 5 phân xưởng chính.",
            )
            f3 = AuditFinding(
                audit_id=aud.audit_id,
                clause_number="8.4",
                clause_title="Kế hoạch Ứng phó Tình huống Khẩn cấp & Sự cố",
                department="Phòng Bảo Trì & QA",
                question="Kế hoạch ứng phó sự cố cúp điện đột xuất và cháy nổ có được diễn tập định kỳ trong 12 tháng qua không?",
                evidence_reviewed="Nhật ký diễn tập PCCC và ứng phó sự cố kho lạnh.",
                result="MINOR_NC",
                finding_notes="Kế hoạch ứng phó cúp điện đột xuất chưa được diễn tập định kỳ trong 12 tháng qua.",
            )
            f4 = AuditFinding(
                audit_id=aud.audit_id,
                clause_number="9.3",
                clause_title="Xem xét của Lãnh đạo (Management Review)",
                department="Ban Giám Đốc",
                question="Biên bản họp xem xét lãnh đạo có đầy đủ nội dung theo yêu cầu ISO 22000 Điều khoản 9.3 không?",
                evidence_reviewed="Biên bản họp MR-2026-01 ngày 15/01/2026.",
                result="CONFORMITY",
                finding_notes="Biên bản họp xem xét lãnh đạo hàng quý có chữ ký đầy đủ của Ban Giám đốc.",
            )
            db.add_all([f1, f2, f3, f4])
            db.commit()
            print(f"Added 4 findings to {aud.audit_code}")

    print("\nChecking training courses...")
    courses = db.query(TrainingCourse).all()
    for c in courses:
        p_count = db.query(TrainingParticipantRecord).filter(TrainingParticipantRecord.course_id == c.course_id).count()
        print(f"Course {c.course_code} ({c.title}) has {p_count} participants.")
        if p_count == 0:
            p1 = TrainingParticipantRecord(
                course_id=c.course_id,
                employee_code="NV-0301",
                employee_name="Vũ Thị Mai",
                department="Kho Nguyên Liệu",
                position="Thủ kho",
                attendance_status="ATTENDED",
                pre_test_score=60.0,
                post_test_score=90.0,
                evaluation_result="PASSED",
                certificate_issued=True,
                notes="Nắm vững bảng phân nhóm 8 dị nguyên bắt buộc ghi nhãn.",
            )
            p2 = TrainingParticipantRecord(
                course_id=c.course_id,
                employee_code="NV-0304",
                employee_name="Nguyễn Văn Hùng",
                department="Phòng Thu Mua",
                position="Chuyên viên mua hàng",
                attendance_status="ATTENDED",
                pre_test_score=50.0,
                post_test_score=88.0,
                evaluation_result="PASSED",
                certificate_issued=True,
            )
            p3 = TrainingParticipantRecord(
                course_id=c.course_id,
                employee_code="NV-0308",
                employee_name="Đặng Quốc Bảo",
                department="Phòng KCS Tiếp Nhận",
                position="KCS Tiếp nhận NVL",
                attendance_status="ATTENDED",
                pre_test_score=70.0,
                post_test_score=95.0,
                evaluation_result="PASSED",
                certificate_issued=True,
            )
            db.add_all([p1, p2, p3])
            db.commit()
            print(f"Added 3 participants to {c.course_code}")

    print("\nAll audits and courses now have complete data!")
finally:
    db.close()
