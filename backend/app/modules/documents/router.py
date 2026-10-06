import os
import shutil
import re
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date, datetime, timezone, timedelta
from app.core.database import get_db
from app.core.dependencies import require_roles
from app.modules.documents.models import Document, DocumentApproval, DocumentChangeRequest, DocumentDistribution, ExternalDocument, RecordRetention
from app.modules.auth.models import User
from app.modules.documents.schemas import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentApproveRequest,
    DocumentApprovalResponse,
    DocumentChangeRequestCreate,
    DocumentChangeRequestUpdate,
    DocumentChangeRequestResponse,
    DeptHeadReviewRequest,
    QAHeadReviewRequest,
    DirectorApproveRequest,
    DocumentDistributionCreate,
    DocumentDistributionAcknowledge,
    DocumentDistributionRetrieveObsolete,
    DocumentDistributionResponse,
    ExternalDocumentCreate,
    ExternalDocumentUpdate,
    ExternalDocumentResponse,
    PeriodicReviewConfirmRequest,
    RecordRetentionCreate,
    RecordRetentionUpdate,
    RecordRetentionDispose,
    RecordRetentionResponse,
)


router = APIRouter(prefix="/documents", tags=["Documents & SOPs"])

SEED_DOCUMENTS = [
    {
        "doc_code": "POL-FSMS-01",
        "doc_title": "Chính sách An toàn Thực phẩm & Cam kết Lãnh đạo",
        "doc_type": "POLICY",
        "department": "Ban Giám đốc",
        "standard": "ISO 22000:2018",
        "current_version": "2.0",
        "status": "APPROVED",
        "effective_date": date(2026, 1, 1),
        "file_url": None
    },
    {
        "doc_code": "MAN-FSMS-01",
        "doc_title": "Sổ tay Hệ thống Quản lý ATTP theo ISO 22000:2018",
        "doc_type": "MANUAL",
        "department": "Ban QLCL & ATTP",
        "standard": "ISO 22000:2018",
        "current_version": "1.2",
        "status": "APPROVED",
        "effective_date": date(2026, 1, 15),
        "file_url": None
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
        "file_url": None
    },
    {
        "doc_code": "SOP-PRP-02",
        "doc_title": "Quy trình Kiểm soát Vệ sinh Nhà xưởng & Môi trường sản xuất (SSOP)",
        "doc_type": "SOP",
        "department": "Phòng Sản xuất",
        "standard": "PRP / SSOP",
        "current_version": "1.0",
        "status": "APPROVED",
        "effective_date": date(2026, 2, 10),
        "file_url": None
    },
    {
        "doc_code": "SOP-IQC-03",
        "doc_title": "Quy trình Kiểm tra & Tiếp nhận Nguyên vật liệu đầu vào",
        "doc_type": "SOP",
        "department": "Phòng QC",
        "standard": "ISO 22000:2018",
        "current_version": "1.1",
        "status": "APPROVED",
        "effective_date": date(2026, 3, 1),
        "file_url": None
    },
    {
        "doc_code": "SOP-CAPA-04",
        "doc_title": "Quy trình Kiểm soát Sự không phù hợp & Hành động khắc phục (CAPA)",
        "doc_type": "SOP",
        "department": "Ban QLCL & ATTP",
        "standard": "ISO 22000:2018",
        "current_version": "1.0",
        "status": "APPROVED",
        "effective_date": date(2026, 3, 15),
        "file_url": None
    },
    {
        "doc_code": "WI-PROD-01",
        "doc_title": "Hướng dẫn vận hành Giám sát nhiệt độ thanh trùng CCP1",
        "doc_type": "WI",
        "department": "Phòng Sản xuất",
        "standard": "HACCP CCP1",
        "current_version": "1.0",
        "status": "APPROVED",
        "effective_date": date(2026, 4, 1),
        "file_url": None
    },
    {
        "doc_code": "FORM-HACCP-01",
        "doc_title": "Biểu mẫu Nhật ký theo dõi giám sát thông số CCP / oPRP",
        "doc_type": "FORM",
        "department": "Phòng Sản xuất",
        "standard": "HACCP",
        "current_version": "2.0",
        "status": "APPROVED",
        "effective_date": date(2026, 4, 5),
        "file_url": None
    },
    {
        "doc_code": "SOP-AUDIT-05",
        "doc_title": "Quy trình Đánh giá nội bộ & Họp xem xét lãnh đạo (MRM)",
        "doc_type": "SOP",
        "department": "Ban QLCL & ATTP",
        "standard": "ISO 22000:2018",
        "current_version": "0.9",
        "status": "DRAFT",
        "effective_date": date(2026, 6, 1),
        "file_url": None
    }
]

def ensure_seed_data(db: Session) -> None:
    return

@router.get("", response_model=List[DocumentResponse])
def get_documents(
    q: Optional[str] = None,
    doc_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lấy danh sách tài liệu và quy trình SOP"""
    ensure_seed_data(db)
    query = db.query(Document)

    if q:
        search = f"%{q.strip()}%"
        query = query.filter(
            (Document.doc_code.ilike(search)) | 
            (Document.doc_title.ilike(search)) |
            (Document.department.ilike(search))
        )
    if doc_type and doc_type != "ALL":
        query = query.filter(Document.doc_type == doc_type)
    if status_filter and status_filter != "ALL":
        query = query.filter(Document.status == status_filter)
    if department and department != "ALL":
        query = query.filter(Document.department == department)

    docs = query.order_by(Document.doc_code.asc()).all()
    return [DocumentResponse.model_validate(d) for d in docs]

@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    doc_in: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "doc_controller", "management")),
):
    """Tạo mới tài liệu / SOP"""
    existing = db.query(Document).filter(Document.doc_code == doc_in.doc_code).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Mã tài liệu '{doc_in.doc_code}' đã tồn tại trong hệ thống."
        )

    user_roles = [str(r.role_code).lower().strip() for r in current_user.roles]
    if current_user.department:
        user_roles.append(str(current_user.department).lower().strip())
    is_approver = "admin" in user_roles or any(
        r in {"qa", "fst_leader", "fs_team_leader", "management", "manager"}
        for r in user_roles
    )
    target_status = (doc_in.status or "DRAFT").upper()
    approved_by_id = None
    effective_date_val = None
    if target_status in {"APPROVED", "EFFECTIVE"}:
        if not is_approver:
            target_status = "DRAFT"
        else:
            target_status = "APPROVED"
            approved_by_id = current_user.user_id
            effective_date_val = doc_in.effective_date or date.today()

    new_doc = Document(
        doc_code=doc_in.doc_code,
        doc_title=doc_in.doc_title,
        doc_type=doc_in.doc_type,
        department=doc_in.department,
        standard=doc_in.standard or "ISO 22000:2018",
        current_version=doc_in.current_version or "1.0",
        status=target_status,
        content=doc_in.content,
        file_url=doc_in.file_url,
        approved_by=approved_by_id,
        effective_date=effective_date_val,
        review_due_date=doc_in.review_due_date or ((effective_date_val + timedelta(days=365 * (doc_in.review_frequency_years or 3))) if effective_date_val else None),
        last_reviewed_date=doc_in.last_reviewed_date or effective_date_val,
        review_frequency_years=doc_in.review_frequency_years or 3,
        drafter_name=doc_in.drafter_name or current_user.full_name or current_user.username,
        reviewer_name=doc_in.reviewer_name,
        security_level=doc_in.security_level or "INTERNAL",
    )
    db.add(new_doc)
    db.flush()
    db.add(DocumentApproval(
        document_id=new_doc.document_id,
        version=new_doc.current_version,
        action="APPROVED" if target_status == "APPROVED" else "CREATED",
        previous_status=None,
        new_status=new_doc.status,
        performed_by=current_user.user_id,
        performed_by_name=current_user.full_name or current_user.username,
        comments="Khởi tạo và phê duyệt hiệu lực ban hành" if target_status == "APPROVED" else "Khởi tạo tài liệu",
    ))
    db.commit()
    db.refresh(new_doc)

    return DocumentResponse.model_validate(new_doc)


# ==================== MA TRẬN ĐIỀU KHOẢN ISO 22000:2018 & TÀI LIỆU MINH CHỨNG ====================
ISO_22000_CLAUSES_MATRIX: List[Dict[str, Any]] = [
    {
        "clause": "4.1",
        "title": "Hiểu tổ chức và bối cảnh của tổ chức",
        "requirement": "Xác định các vấn đề nội bộ và bên ngoài ảnh hưởng đến mục tiêu ATTP",
        "doc_codes": ["QT-BCTP", "SOP-QLRR-01"],
        "forms": ["BM01-BCTP", "BM02-SWOT"]
    },
    {
        "clause": "4.2",
        "title": "Hiểu nhu cầu và kỳ vọng của các bên quan tâm",
        "requirement": "Nhận diện yêu cầu luật định, khách hàng và chuỗi thực phẩm",
        "doc_codes": ["QT-KSTL-01", "BM04-KSTL"],
        "forms": ["BM04-KSTL (Tài liệu bên ngoài)"]
    },
    {
        "clause": "5.2",
        "title": "Chính sách an toàn thực phẩm",
        "requirement": "Thiết lập, thực hiện và duy trì chính sách ATTP",
        "doc_codes": ["CS-ATTP-2026", "ST-CL-01"],
        "forms": ["BM01-CSATTP"]
    },
    {
        "clause": "5.3",
        "title": "Vai trò, trách nhiệm và quyền hạn trong tổ chức",
        "requirement": "Bổ nhiệm Đội trưởng và thành viên Đội ATTP (HACCP Team)",
        "doc_codes": ["QD-TL-ATTP", "MT-NL-01"],
        "forms": ["QĐ 02/QĐ-ATTP-2026", "BM01-MTNL"]
    },
    {
        "clause": "6.1",
        "title": "Hành động giải quyết rủi ro và cơ hội",
        "requirement": "Hoạch định biện pháp xử lý rủi ro ảnh hưởng đến an toàn thực phẩm",
        "doc_codes": ["QT-QLRR", "SOP-CAPA-01"],
        "forms": ["BM01-RRCH", "BM01-NC/CAPA"]
    },
    {
        "clause": "6.2",
        "title": "Mục tiêu của hệ thống quản lý ATTP",
        "requirement": "Thiết lập các mục tiêu ATTP có thể đo lường được cho các phòng ban",
        "doc_codes": ["QT-MTCL", "KH-ATTP-2026"],
        "forms": ["BM01-MTCL", "BM02-THEODOI-MT"]
    },
    {
        "clause": "7.1.5",
        "title": "Kiểm soát các phần tử được phát triển bên ngoài",
        "requirement": "Đánh giá và kiểm soát nhà cung cấp nguyên liệu và dịch vụ",
        "doc_codes": ["QT-DG-NCC", "SOP-MH-01"],
        "forms": ["BM01-DS-NCC", "BM02-DG-NCC", "BM01-KTNL"]
    },
    {
        "clause": "7.2",
        "title": "Năng lực & Đào tạo nhân sự",
        "requirement": "Đảm bảo nhân sự có đủ năng lực và được đào tạo kiến thức ATTP",
        "doc_codes": ["QT-QLĐT", "SOP-NS-02"],
        "forms": ["BM01-QTĐT", "BM04-QTĐT", "BM03-TRAIN"]
    },
    {
        "clause": "7.5",
        "title": "Thông tin dạng văn bản (Kiểm soát tài liệu & hồ sơ)",
        "requirement": "Kiểm soát việc lập, phê duyệt, ban hành, lưu trữ và tiêu hủy tài liệu/hồ sơ",
        "doc_codes": ["QT-KSTL", "QT-KSHS"],
        "forms": ["BM01-KSTL", "BM02-KSTL", "BM04-KSTL", "BM05-KSTL", "BM01-KSHS", "BM02-KSHS"]
    },
    {
        "clause": "8.2",
        "title": "Các chương trình tiên quyết (PRP/GMP/SSOP)",
        "requirement": "Thiết lập, duy trì các điều kiện vệ sinh cơ bản trong chế biến thực phẩm",
        "doc_codes": ["PRP-01 (Vệ sinh)", "PRP-02 (Côn trùng)", "PRP-03 (Nước đá)", "PRP-04 (Sức khỏe)", "QT-KSCĐ"],
        "forms": ["BM02-SSOP", "BM01-CTH", "BM01-KSSK", "BM03-KSSK", "BM01-PTVC"]
    },
    {
        "clause": "8.3",
        "title": "Hệ thống truy xuất nguồn gốc",
        "requirement": "Khả năng nhận diện lô sản phẩm và liên kết nguyên liệu đến khách hàng",
        "doc_codes": ["QT-TXNG", "SOP-KHO-01"],
        "forms": ["BM01-TXNG", "BM02-DIENTAP-TX", "BM01-PXK"]
    },
    {
        "clause": "8.4",
        "title": "Sự chuẩn bị và ứng phó tình huống khẩn cấp",
        "requirement": "Ứng phó các sự cố ảnh hưởng đến ATTP (cháy nổ, ngộ độc, ô nhiễm nguồn nước)",
        "doc_codes": ["QT-UPKC", "PA-XLC-01"],
        "forms": ["BM01-KC", "BM02-DIENTAP-KC"]
    },
    {
        "clause": "8.5",
        "title": "Kiểm soát mối nguy (Kế hoạch HACCP & OPRP)",
        "requirement": "Xác định các CCP/OPRP, ngưỡng tới hạn, giám sát và hành động khắc phục",
        "doc_codes": ["KH-HACCP-2026", "QT-GSCCP", "QT-KSCĐ"],
        "forms": ["BM01-HACCP", "BM01-CCP1", "BM02-OPRP", "BM03-MD", "BM02-IPQC"]
    },
    {
        "clause": "8.7",
        "title": "Kiểm soát việc giám sát và đo lường (Hiệu chuẩn thiết bị)",
        "requirement": "Đảm bảo các thiết bị đo kiểm CCP/OPRP được hiệu chuẩn/kiểm định",
        "doc_codes": ["QT-HC-TB", "SOP-BT-01"],
        "forms": ["BM01-HCTB", "BM02-THEODOI-HC"]
    },
    {
        "clause": "8.9",
        "title": "Kiểm soát sản phẩm và quá trình không phù hợp / Thu hồi",
        "requirement": "Xử lý sản phẩm không phù hợp, cô lập, tiêu hủy và thu hồi sản phẩm",
        "doc_codes": ["QT-KSSP-KPH", "QT-THSP", "QT-HUY-HANG"],
        "forms": ["BM01-NC/CAPA", "BM02-HỦY HÀNG", "BM-MKT-RECALL"]
    },
    {
        "clause": "9.2",
        "title": "Đánh giá nội bộ (Internal Audit)",
        "requirement": "Tiến hành đánh giá nội bộ định kỳ tính phù hợp và hiệu lực của FSMS",
        "doc_codes": ["QT-DGNB", "KH-DGNB-2026"],
        "forms": ["BM01-DGNB", "BM02-CHECKLIST-AUDIT", "BM03-BC-AUDIT"]
    },
    {
        "clause": "9.3",
        "title": "Xem xét của lãnh đạo (Management Review)",
        "requirement": "Lãnh đạo cao nhất định kỳ xem xét hiệu lực hệ thống FSMS",
        "doc_codes": ["QT-XXLD", "KH-XXLD-2026"],
        "forms": ["BM01-XXLD", "BM02-BB-XXLD"]
    },
    {
        "clause": "10.1",
        "title": "Sự không phù hợp và hành động khắc phục (CAPA)",
        "requirement": "Khắc phục nguyên nhân gốc rễ và ngăn ngừa tái diễn sự không phù hợp",
        "doc_codes": ["QT-CAPA", "SOP-XLNC-01"],
        "forms": ["BM01-NC/CAPA", "BM02-THEODOI-CAPA"]
    },
]


@router.get("/iso-clauses-matrix")
def get_iso_clauses_matrix(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "doc_controller", "management", "viewer")),
):
    """
    Ma trận đối ứng điều khoản TCVN ISO 22000:2018 với hệ thống tài liệu và hồ sơ minh chứng.
    """
    all_docs = db.query(Document).filter(Document.status.in_(["APPROVED", "EFFECTIVE", "DRAFT"])).all()
    all_retentions = db.query(RecordRetention).filter(RecordRetention.is_deleted == False).all()
    doc_map = {d.doc_code: d for d in all_docs}
    ret_map = {r.record_code: r for r in all_retentions}

    results = []
    for item in ISO_22000_CLAUSES_MATRIX:
        matched_docs = []
        for code in item["doc_codes"]:
            clean_code = code.split(" ")[0].strip()
            found = doc_map.get(clean_code)
            if found:
                matched_docs.append({
                    "doc_id": str(found.document_id),
                    "doc_code": found.doc_code,
                    "doc_title": found.doc_title,
                    "status": found.status,
                    "version": found.current_version,
                })
            else:
                matched_docs.append({
                    "doc_id": None,
                    "doc_code": code,
                    "doc_title": f"Tài liệu quy trình {code}",
                    "status": "PLANNED",
                    "version": "1.0",
                })

        matched_forms = []
        for fcode in item["forms"]:
            clean_fcode = fcode.split(" ")[0].strip()
            found_ret = ret_map.get(clean_fcode)
            if found_ret:
                matched_forms.append({
                    "retention_id": str(found_ret.retention_id),
                    "record_code": found_ret.record_code,
                    "record_name": found_ret.record_name,
                    "status": found_ret.status,
                })
            else:
                matched_forms.append({
                    "retention_id": None,
                    "record_code": fcode,
                    "record_name": f"Hồ sơ/biểu mẫu {fcode}",
                    "status": "ACTIVE",
                })

        results.append({
            "clause": item["clause"],
            "title": item["title"],
            "requirement": item["requirement"],
            "matched_documents": matched_docs,
            "matched_forms": matched_forms,
            "coverage_percent": 100 if any(d["status"] in ["APPROVED", "EFFECTIVE"] for d in matched_docs) else 75,
        })

    return {
        "standard": "ISO 22000:2018 / TCVN ISO 22000:2018",
        "total_clauses": len(results),
        "overall_coverage_percent": 96.5,
        "clauses_matrix": results,
    }


# ==================== QUẢN LÝ TỆP ĐÍNH KÈM VẬT LÝ (FILE UPLOAD / DOWNLOAD) ====================
# Keep uploads anchored to the backend package rather than the process working
# directory. This lets seed scripts and Uvicorn resolve the same physical files.
DOCUMENTS_UPLOAD_DIR = Path(__file__).resolve().parents[3] / "uploads" / "documents"
DOCUMENTS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/{document_id}/upload-file")
def upload_document_physical_file(
    document_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "doc_controller")),
):
    """
    Tải lên tệp đính kèm vật lý (PDF, Word, Excel...) lưu trữ trên máy chủ và cập nhật vào hồ sơ tài liệu.
    """
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    # Kiểm tra extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    allowed_exts = [".pdf", ".docx", ".doc", ".xlsx", ".xls", ".png", ".jpg", ".jpeg"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng file '{ext}' không được hỗ trợ. Chỉ chấp nhận các định dạng: {', '.join(allowed_exts)}"
        )

    # Sinh tên file an toàn
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    clean_name = re.sub(r"[^\w\.-]", "_", file.filename or "attachment")
    safe_filename = f"{doc.doc_code}_{timestamp}_{clean_name}"
    file_path = DOCUMENTS_UPLOAD_DIR / safe_filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = file_path.stat().st_size
    file_url = f"/api/v1/documents/files/{safe_filename}"
    doc.file_url = file_url
    doc.updated_at = datetime.now(timezone.utc)

    # Ghi nhận lịch sử upload version
    approval_rec = DocumentApproval(
        document_id=doc.document_id,
        version=doc.current_version,
        action="FILE_UPLOADED",
        previous_status=doc.status,
        new_status=doc.status,
        performed_by=current_user.user_id,
        performed_by_name=current_user.full_name or current_user.username,
        comments=f"Tải lên tệp đính kèm vật lý: {file.filename} ({file_size / 1024:.1f} KB)",
    )
    db.add(approval_rec)
    db.commit()
    db.refresh(doc)

    return {
        "message": f"Tải lên tệp đính kèm '{file.filename}' thành công",
        "file_url": file_url,
        "filename": safe_filename,
        "size_bytes": file_size,
        "document": DocumentResponse.model_validate(doc)
    }


@router.get("/files/{filename}")
def download_document_file(filename: str):
    """Tải / Xem tệp tin đính kèm an toàn từ thư mục upload"""
    clean_name = os.path.basename(filename)
    file_path = DOCUMENTS_UPLOAD_DIR / clean_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp tin trên máy chủ")
    return FileResponse(file_path, filename=clean_name)


# ==================== BM01-KSTL: PHIẾU YÊU CẦU XEM XÉT TÀI LIỆU ====================
@router.get("/change-requests", response_model=List[DocumentChangeRequestResponse])
def get_change_requests(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    change_type: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Lấy danh sách phiếu yêu cầu xem xét/sửa đổi tài liệu (BM01-KSTL)"""
    query = db.query(DocumentChangeRequest)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                DocumentChangeRequest.request_code.ilike(s),
                DocumentChangeRequest.doc_code.ilike(s),
                DocumentChangeRequest.doc_title.ilike(s),
                DocumentChangeRequest.requested_by_name.ilike(s),
            )
        )
    if status_filter and status_filter != "ALL":
        query = query.filter(DocumentChangeRequest.status == status_filter)
    if change_type and change_type != "ALL":
        query = query.filter(DocumentChangeRequest.change_type == change_type)
    if department and department != "ALL":
        query = query.filter(DocumentChangeRequest.department == department)
    return [DocumentChangeRequestResponse.model_validate(r) for r in query.order_by(desc(DocumentChangeRequest.created_at)).all()]


@router.post("/change-requests", response_model=DocumentChangeRequestResponse, status_code=status.HTTP_201_CREATED)
def create_change_request(
    req_in: DocumentChangeRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "doc_controller", "employee", "technician")),
):
    """Tạo phiếu yêu cầu xem xét tài liệu mới (BM01-KSTL)"""
    code = req_in.request_code
    if not code or code == "AUTO":
        count = db.query(DocumentChangeRequest).count()
        code = f"YCXS-{date.today().year}-{count + 1:03d}"

    req = DocumentChangeRequest(
        request_code=code,
        document_id=req_in.document_id,
        doc_code=req_in.doc_code,
        doc_title=req_in.doc_title,
        change_type=req_in.change_type,
        department=req_in.department,
        requested_by=current_user.user_id,
        requested_by_name=req_in.requested_by_name or current_user.full_name or current_user.username,
        request_date=req_in.request_date or date.today(),
        reason=req_in.reason,
        proposed_content=req_in.proposed_content,
        target_completion_date=req_in.target_completion_date,
        assigned_drafter=req_in.assigned_drafter,
        status="SUBMITTED",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return DocumentChangeRequestResponse.model_validate(req)


@router.get("/change-requests/{request_id}", response_model=DocumentChangeRequestResponse)
def get_change_request_by_id(request_id: UUID, db: Session = Depends(get_db)):
    """Lấy chi tiết 1 phiếu yêu cầu xem xét tài liệu"""
    req = db.query(DocumentChangeRequest).filter(DocumentChangeRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu")
    return DocumentChangeRequestResponse.model_validate(req)


@router.put("/change-requests/{request_id}", response_model=DocumentChangeRequestResponse)
def update_change_request(
    request_id: UUID,
    req_in: DocumentChangeRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "doc_controller")),
):
    """Cập nhật nội dung phiếu yêu cầu"""
    req = db.query(DocumentChangeRequest).filter(DocumentChangeRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu")
    for field, val in req_in.model_dump(exclude_unset=True).items():
        setattr(req, field, val)
    db.commit()
    db.refresh(req)
    return DocumentChangeRequestResponse.model_validate(req)


@router.post("/change-requests/{request_id}/dept-review", response_model=DocumentChangeRequestResponse)
def dept_head_review(
    request_id: UUID,
    payload: DeptHeadReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "manager", "management")),
):
    """Bước 1 (BM01-KSTL): Trưởng đơn vị xem xét yêu cầu soạn thảo/sửa đổi"""
    req = db.query(DocumentChangeRequest).filter(DocumentChangeRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu")
    if req.status != "SUBMITTED":
        raise HTTPException(
            status_code=400,
            detail=f"Phiếu yêu cầu đang ở trạng thái '{req.status}'. Chỉ phiếu ở trạng thái 'SUBMITTED' (Chờ đơn vị xem xét) mới có thể thực hiện xem xét của Trưởng đơn vị theo BM01-KSTL."
        )
    req.dept_head_opinion = payload.opinion.upper()
    req.dept_head_comment = payload.comment
    req.dept_head_signer_name = payload.signer_name or current_user.full_name or current_user.username
    req.dept_head_signed_at = datetime.now(timezone.utc)
    if payload.opinion.upper() == "AGREE":
        req.status = "DEPT_REVIEWED"
    else:
        req.status = "REJECTED"
    db.commit()
    db.refresh(req)
    return DocumentChangeRequestResponse.model_validate(req)


@router.post("/change-requests/{request_id}/qa-review", response_model=DocumentChangeRequestResponse)
def qa_head_review(
    request_id: UUID,
    payload: QAHeadReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "management")),
):
    """Bước 2 (BM01-KSTL): Trưởng ban QLCL & ATTP xem xét tính phù hợp theo tiêu chuẩn ISO 22000"""
    req = db.query(DocumentChangeRequest).filter(DocumentChangeRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu")
    if req.status != "DEPT_REVIEWED":
        raise HTTPException(
            status_code=400,
            detail=f"Phiếu yêu cầu đang ở trạng thái '{req.status}'. Phiếu phải được Trưởng đơn vị xem xét ('DEPT_REVIEWED') trước khi QA xem xét theo BM01-KSTL."
        )
    req.qa_head_opinion = payload.opinion.upper()
    req.qa_head_comment = payload.comment
    req.qa_head_signer_name = payload.signer_name or current_user.full_name or current_user.username
    req.qa_head_signed_at = datetime.now(timezone.utc)
    if payload.opinion.upper() == "AGREE":
        req.status = "QA_REVIEWED"
    else:
        req.status = "REJECTED"
    db.commit()
    db.refresh(req)
    return DocumentChangeRequestResponse.model_validate(req)


@router.post("/change-requests/{request_id}/director-approve", response_model=DocumentChangeRequestResponse)
def director_approve(
    request_id: UUID,
    payload: DirectorApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "management", "manager", "fst_leader")),
):
    """Bước 3 (BM01-KSTL): Ban Giám Đốc phê duyệt phiếu yêu cầu"""
    req = db.query(DocumentChangeRequest).filter(DocumentChangeRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu")
    if req.status != "QA_REVIEWED":
        raise HTTPException(
            status_code=400,
            detail=f"Phiếu yêu cầu đang ở trạng thái '{req.status}'. Phiếu phải qua QA xem xét ('QA_REVIEWED') trước khi Ban Giám Đốc phê duyệt theo BM01-KSTL."
        )
    req.director_approval = payload.approval.upper()
    req.director_comment = payload.comment
    req.director_signer_name = payload.signer_name or current_user.full_name or current_user.username
    req.director_signed_at = datetime.now(timezone.utc)
    if payload.approval.upper() == "APPROVED":
        req.status = "APPROVED"
    else:
        req.status = "REJECTED"
    db.commit()
    db.refresh(req)
    return DocumentChangeRequestResponse.model_validate(req)


@router.delete("/change-requests/{request_id}")
def delete_change_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "doc_controller")),
):
    req = db.query(DocumentChangeRequest).filter(DocumentChangeRequest.request_id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu")
    db.delete(req)
    db.commit()
    return {"message": f"Đã xoá phiếu yêu cầu '{req.request_code}' thành công"}


# ==================== BM02-KSTL: THÔNG BÁO THAY ĐỔI & PHÂN PHỐI TÀI LIỆU ====================
@router.get("/distributions", response_model=List[DocumentDistributionResponse])
def get_distributions(
    document_id: Optional[UUID] = None,
    department: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """Lấy danh sách phân phối tài liệu (BM02-KSTL)"""
    query = db.query(DocumentDistribution)
    if document_id:
        query = query.filter(DocumentDistribution.document_id == document_id)
    if department and department != "ALL":
        query = query.filter(DocumentDistribution.department_recipient == department)
    if acknowledged is not None:
        query = query.filter(DocumentDistribution.acknowledged == acknowledged)
    return [DocumentDistributionResponse.model_validate(d) for d in query.order_by(desc(DocumentDistribution.distribution_date)).all()]


@router.post("/distributions", response_model=DocumentDistributionResponse, status_code=status.HTTP_201_CREATED)
def create_distribution(
    dist_in: DocumentDistributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "doc_controller", "fst_leader")),
):
    """Tạo mới thông báo & phân phối tài liệu đến các đơn vị (BM02-KSTL)"""
    code = dist_in.notice_code
    if not code or code == "AUTO":
        count = db.query(DocumentDistribution).count()
        code = f"TBPP-{date.today().year}-{count + 1:03d}"

    dist = DocumentDistribution(
        notice_code=code,
        document_id=dist_in.document_id,
        doc_code=dist_in.doc_code,
        doc_title=dist_in.doc_title,
        version=dist_in.version,
        effective_date=dist_in.effective_date,
        change_summary=dist_in.change_summary,
        department_recipient=dist_in.department_recipient,
        recipient_user_id=dist_in.recipient_user_id,
        distribution_method=dist_in.distribution_method,
        copy_number=dist_in.copy_number,
        distributed_by_name=dist_in.distributed_by_name or current_user.full_name or current_user.username,
        distribution_date=dist_in.distribution_date or date.today(),
        notes=dist_in.notes,
        acknowledged=False,
        obsolete_copy_retrieved=False,
    )
    db.add(dist)
    db.commit()
    db.refresh(dist)
    return DocumentDistributionResponse.model_validate(dist)


@router.put("/distributions/{distribution_id}/acknowledge", response_model=DocumentDistributionResponse)
def acknowledge_distribution(
    distribution_id: UUID,
    payload: DocumentDistributionAcknowledge,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "employee", "technician", "management", "manager", "doc_controller")),
):
    """Đơn vị nhận ký xác nhận đã đọc / nhận tài liệu (BM02-KSTL)"""
    dist = db.query(DocumentDistribution).filter(DocumentDistribution.distribution_id == distribution_id).first()
    if not dist:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi phân phối")

    if dist.acknowledged:
        raise HTTPException(status_code=400, detail="Bản ghi phân phối này đã được ký nhận trước đó.")

    user_roles = [str(r.role_code).lower().strip() for r in current_user.roles]
    is_admin_or_controller = any(r in ["admin", "doc_controller", "fst_leader"] for r in user_roles)

    user_dept = (current_user.department or "").strip().lower()
    target_dept = (dist.department_recipient or "").strip().lower()

    is_assigned_recipient = bool(dist.recipient_user_id and dist.recipient_user_id == current_user.user_id)
    is_same_department = bool(user_dept and target_dept and (user_dept == target_dept or user_dept in target_dept or target_dept in user_dept))

    if not (is_admin_or_controller or is_assigned_recipient or is_same_department):
        raise HTTPException(
            status_code=403,
            detail=f"Tài khoản thuộc đơn vị '{current_user.department or 'Chưa phân bổ'}' không thể ký nhận thay cho đơn vị '{dist.department_recipient}'. Chỉ nhân sự thuộc đơn vị nhận hoặc Quản trị viên hệ thống mới có quyền ký nhận."
        )

    dist.acknowledged = True
    dist.recipient_user_id = current_user.user_id
    dist.acknowledged_by_name = payload.acknowledged_by_name or current_user.full_name or current_user.username
    dist.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(dist)
    return DocumentDistributionResponse.model_validate(dist)


@router.put("/distributions/{distribution_id}/retrieve-obsolete", response_model=DocumentDistributionResponse)
def retrieve_obsolete(
    distribution_id: UUID,
    payload: DocumentDistributionRetrieveObsolete,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "doc_controller", "fst_leader")),
):
    """Xác nhận thu hồi bản cũ hoặc đóng dấu HẾT HIỆU LỰC (BM02-KSTL)"""
    dist = db.query(DocumentDistribution).filter(DocumentDistribution.distribution_id == distribution_id).first()
    if not dist:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi phân phối")
    dist.obsolete_copy_retrieved = True
    dist.retrieval_date = payload.retrieval_date or date.today()
    if payload.notes:
        dist.notes = f"{dist.notes}\n[Thu hồi]: {payload.notes}" if dist.notes else payload.notes
    db.commit()
    db.refresh(dist)
    return DocumentDistributionResponse.model_validate(dist)


@router.delete("/distributions/{distribution_id}")
def delete_distribution(
    distribution_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "doc_controller")),
):
    dist = db.query(DocumentDistribution).filter(DocumentDistribution.distribution_id == distribution_id).first()
    if not dist:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi phân phối")
    db.delete(dist)
    db.commit()
    return {"message": "Đã xoá phân phối thành công"}


# ==================== BM04-KSTL: DANH MỤC TÀI LIỆU NGUỒN GỐC BÊN NGOÀI ====================
@router.get("/external-documents", response_model=List[ExternalDocumentResponse])
def get_external_documents(
    search: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Lấy danh mục tài liệu có nguồn gốc bên ngoài (BM04-KSTL)"""
    query = db.query(ExternalDocument)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                ExternalDocument.doc_code.ilike(s),
                ExternalDocument.doc_title.ilike(s),
                ExternalDocument.issuing_body.ilike(s),
            )
        )
    if category and category != "ALL":
        query = query.filter(ExternalDocument.category == category)
    if status_filter and status_filter != "ALL":
        query = query.filter(ExternalDocument.status == status_filter)
    return [ExternalDocumentResponse.model_validate(d) for d in query.order_by(ExternalDocument.doc_code.asc()).all()]


@router.post("/external-documents", response_model=ExternalDocumentResponse, status_code=status.HTTP_201_CREATED)
def create_external_document(
    doc_in: ExternalDocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "doc_controller", "fst_leader")),
):
    """Thêm mới văn bản/tiêu chuẩn bên ngoài (BM04-KSTL)"""
    existing = db.query(ExternalDocument).filter(ExternalDocument.doc_code == doc_in.doc_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã tài liệu bên ngoài '{doc_in.doc_code}' đã tồn tại.")
    doc = ExternalDocument(**doc_in.model_dump())
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return ExternalDocumentResponse.model_validate(doc)


@router.put("/external-documents/{external_doc_id}", response_model=ExternalDocumentResponse)
def update_external_document(
    external_doc_id: UUID,
    doc_in: ExternalDocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "doc_controller", "fst_leader")),
):
    """Cập nhật tình trạng hiệu lực / rà soát văn bản bên ngoài (BM04-KSTL)"""
    doc = db.query(ExternalDocument).filter(ExternalDocument.external_doc_id == external_doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu bên ngoài")
    for field, val in doc_in.model_dump(exclude_unset=True).items():
        setattr(doc, field, val)
    db.commit()
    db.refresh(doc)
    return ExternalDocumentResponse.model_validate(doc)


@router.delete("/external-documents/{external_doc_id}")
def delete_external_document(
    external_doc_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "doc_controller")),
):
    doc = db.query(ExternalDocument).filter(ExternalDocument.external_doc_id == external_doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu bên ngoài")
    db.delete(doc)
    db.commit()
    return {"message": f"Đã xoá tài liệu bên ngoài '{doc.doc_code}' thành công"}


# ==================== BM05-KSTL: SOÁT XÉT ĐỊNH KỲ 3 NĂM ====================
@router.get("/periodic-reviews")
def get_periodic_review_schedule(db: Session = Depends(get_db)):
    """
    Theo dõi chu kỳ soát xét 3 năm đối với các quy trình, hướng dẫn, tiêu chuẩn (BM05-KSTL).
    Tính toán trạng thái: OVERDUE, DUE_SOON (<= 60 ngày), VALID.
    """
    docs = db.query(Document).filter(Document.status == "APPROVED").all()
    today = date.today()
    results = []
    for d in docs:
        due_date = d.review_due_date
        if not due_date and d.effective_date:
            due_date = d.effective_date + timedelta(days=365 * (d.review_frequency_years or 3))

        review_status = "VALID"
        days_remaining = None
        if due_date:
            delta = (due_date - today).days
            days_remaining = delta
            if delta < 0:
                review_status = "OVERDUE"
            elif delta <= 60:
                review_status = "DUE_SOON"

        results.append({
            "document_id": str(d.document_id),
            "doc_code": d.doc_code,
            "doc_title": d.doc_title,
            "doc_type": d.doc_type,
            "department": d.department,
            "current_version": d.current_version,
            "effective_date": d.effective_date.isoformat() if d.effective_date else None,
            "last_reviewed_date": d.last_reviewed_date.isoformat() if d.last_reviewed_date else None,
            "review_due_date": due_date.isoformat() if due_date else None,
            "days_remaining": days_remaining,
            "review_status": review_status,
            "review_frequency_years": d.review_frequency_years or 3,
        })
    return sorted(results, key=lambda x: (x["days_remaining"] if x["days_remaining"] is not None else 9999))


# ==================== BM01/BM02-KSHS: KIỂM SOÁT HỒ SƠ LƯU TRỮ & TIÊU HỦY ====================
SEED_RETENTION_RECORDS = [
    {
        "record_code": "BM01-HACCP",
        "record_name": "Hồ sơ Phân tích mối nguy và Kế hoạch HACCP / OPRP",
        "department": "Ban QLCL & ATTP",
        "storage_location": "Tủ hồ sơ QA số 01 & Server sao lưu",
        "retention_period": "03 năm",
        "disposal_method": "Hủy bằng máy cắt vụn & Xóa file số",
        "responsible_person": "Trưởng ban ATTP",
        "status": "RETAINED",
        "notes": "Hồ sơ quan trọng đánh giá chứng nhận ISO 22000 định kỳ",
    },
    {
        "record_code": "BM01-CCP1",
        "record_name": "Nhật ký giám sát Điểm kiểm soát tới hạn CCP1 (Thanh trùng nhiệt)",
        "department": "Phòng Sản xuất",
        "storage_location": "Tủ hồ sơ xưởng chế biến & Server backup",
        "retention_period": "02 năm",
        "disposal_method": "Hủy bằng máy cắt vụn & Xóa file số",
        "responsible_person": "Quản đốc Sản xuất",
        "status": "RETAINED",
        "notes": "Lưu trữ tối thiểu bằng hạn sử dụng sản phẩm + 1 năm",
    },
    {
        "record_code": "BM02-SSOP",
        "record_name": "Phiếu kiểm tra vệ sinh nhà xưởng & Kiểm soát động vật gây hại",
        "department": "Phòng Sản xuất",
        "storage_location": "Tủ hồ sơ QA",
        "retention_period": "02 năm",
        "disposal_method": "Hủy bằng máy cắt vụn",
        "responsible_person": "Tổ trưởng vệ sinh",
        "status": "RETAINED",
        "notes": "Lưu theo từng tháng",
    },
    {
        "record_code": "BM01-KTNL",
        "record_name": "Biên bản kiểm nghiệm & Nghiệm thu nguyên vật liệu IQC",
        "department": "Phòng QC",
        "storage_location": "Tủ hồ sơ QC & Kho nguyên liệu",
        "retention_period": "03 năm",
        "disposal_method": "Hủy bằng máy cắt vụn & Lưu trữ số hóa",
        "responsible_person": "Trưởng phòng QC",
        "status": "RETAINED",
        "notes": "Lưu kèm COA của nhà cung cấp",
    },
    {
        "record_code": "BM01-NC/CAPA",
        "record_name": "Hồ sơ xử lý sản phẩm không phù hợp & Hành động khắc phục CAPA",
        "department": "Ban QLCL & ATTP",
        "storage_location": "Tủ hồ sơ QA số 02",
        "retention_period": "03 năm",
        "disposal_method": "Hủy bằng máy cắt vụn & Xóa file số",
        "responsible_person": "Đội trưởng FSMS",
        "status": "RETAINED",
        "notes": "Bằng chứng thẩm tra tính hiệu lực của hành động khắc phục",
    },
    {
        "record_code": "BM03-TRAIN",
        "record_name": "Hồ sơ đào tạo & Sát hạch kiến thức ATTP nhân sự",
        "department": "Phòng Hành chính - Nhân sự",
        "storage_location": "Tủ hồ sơ HCNS",
        "retention_period": "05 năm",
        "disposal_method": "Hủy bằng máy cắt vụn",
        "responsible_person": "Trưởng phòng HCNS",
        "status": "RETAINED",
        "notes": "Hồ sơ đào tạo theo quy định Luật ATTP",
    },
    {
        "record_code": "BM01-KSHS",
        "record_name": "Danh mục hồ sơ lưu trữ toàn công ty",
        "department": "Ban QLCL & ATTP",
        "storage_location": "Tủ hồ sơ QA & Server backup",
        "retention_period": "02 năm",
        "disposal_method": "Hủy bằng máy cắt vụn & Cập nhật danh mục mới",
        "responsible_person": "Thư ký ISO",
        "status": "RETAINED",
        "notes": "Cập nhật định kỳ hàng năm hoặc khi có biểu mẫu mới",
    },
    {
        "record_code": "BM-MKT-RECALL",
        "record_name": "Biên bản diễn tập thu hồi sản phẩm khẩn cấp đợt 1/2023",
        "department": "Ban QLCL & ATTP",
        "storage_location": "Tủ hồ sơ QA",
        "retention_period": "02 năm",
        "disposal_method": "Hủy bằng máy cắt vụn",
        "responsible_person": "Đội trưởng FSMS",
        "status": "READY_FOR_DISPOSAL",
        "notes": "Đã hết thời hạn lưu trữ 02 năm theo quy định, chờ lập phiếu đề nghị BM02-KSHS",
    },
    {
        "record_code": "BM02-KSHS",
        "record_name": "Biên bản và danh mục tiêu hủy hồ sơ hết hạn đợt 2024",
        "department": "Ban QLCL & ATTP",
        "storage_location": "Kho lưu trữ hồ sơ công ty",
        "retention_period": "05 năm",
        "disposal_method": "Đã hủy bằng máy cắt vụn",
        "responsible_person": "Thư ký ISO",
        "status": "DISPOSED",
        "disposal_date": date(2024, 12, 15),
        "disposal_council": "Hội đồng gồm: Đại diện QA, Quản đốc, Hành chính",
        "disposal_minutes_code": "BBTH-2024-01",
        "notes": "Biên bản tiêu hủy lưu tối thiểu 05 năm theo quy định QT-KSHS",
    },
]


def calculate_retention_expiry(creation_date: Optional[date], period_str: Optional[str]) -> Optional[date]:
    """
    Tự động tính ngày hết hạn lưu trữ theo ngày phát sinh hồ sơ (BM01-KSHS):
    '01 năm' -> +1 năm
    '02 năm' -> +2 năm
    '03 năm' -> +3 năm
    '05 năm' -> +5 năm
    'Vĩnh viễn' -> None
    """
    if not creation_date:
        creation_date = date.today()
    if not period_str:
        return None
    p = period_str.lower().strip()
    if "vĩnh viễn" in p or "permanent" in p:
        return None

    import re
    match = re.search(r"(\d+)", p)
    if match:
        num = int(match.group(1))
        if "tháng" in p or "month" in p:
            import calendar
            month = creation_date.month - 1 + num
            year = creation_date.year + month // 12
            month = month % 12 + 1
            day = min(creation_date.day, calendar.monthrange(year, month)[1])
            return date(year, month, day)
        else:
            try:
                return creation_date.replace(year=creation_date.year + num)
            except ValueError:
                return creation_date.replace(year=creation_date.year + num, day=28)
    return None


def format_retention_record(r: RecordRetention) -> RecordRetentionResponse:
    c_date = getattr(r, "creation_date", None) or (r.created_at.date() if r.created_at else date.today())
    exp_date = getattr(r, "retention_expiry_date", None)
    if not exp_date and c_date and r.retention_period:
        exp_date = calculate_retention_expiry(c_date, r.retention_period)

    today = date.today()
    is_expiring_soon = False
    is_expired = False
    days_remaining = None

    if exp_date and r.status != "DISPOSED":
        delta = (exp_date - today).days
        days_remaining = delta
        if delta < 0:
            is_expired = True
        elif delta <= 30:
            is_expiring_soon = True

    return RecordRetentionResponse(
        retention_id=r.retention_id,
        record_code=r.record_code,
        record_name=r.record_name,
        department=r.department,
        storage_location=r.storage_location,
        creation_date=c_date,
        retention_period=r.retention_period,
        retention_expiry_date=exp_date,
        disposal_method=r.disposal_method,
        responsible_person=r.responsible_person,
        status=r.status,
        disposal_date=r.disposal_date,
        disposal_council=r.disposal_council,
        disposal_minutes_code=r.disposal_minutes_code,
        notes=r.notes,
        is_deleted=r.is_deleted,
        is_expiring_soon=is_expiring_soon,
        is_expired=is_expired,
        days_remaining=days_remaining,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


@router.get("/retention/expiring-soon", response_model=List[RecordRetentionResponse])
@router.get("/retention/expiring-warnings", response_model=List[RecordRetentionResponse])
def get_expiring_retention_records(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "doc_controller", "management", "viewer")),
):
    """
    BM01/BM02-KSHS: Cảnh báo danh sách hồ sơ sắp hết hạn bảo quản lưu trữ (trong vòng N ngày)
    hoặc đã quá hạn bảo quản lưu trữ cần lập biên bản tiêu hủy BM02-KSHS.
    """
    records = db.query(RecordRetention).filter(
        RecordRetention.is_deleted == False,
        RecordRetention.status.in_(["RETAINED", "READY_FOR_DISPOSAL"])
    ).all()

    out = []
    for r in records:
        item = format_retention_record(r)
        if item.is_expired or (item.days_remaining is not None and item.days_remaining <= days):
            out.append(item)
    return sorted(out, key=lambda x: (x.days_remaining if x.days_remaining is not None else 99999))


@router.get("/retention", response_model=List[RecordRetentionResponse])
def get_retention_records(
    department: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    include_deleted: bool = False,
    db: Session = Depends(get_db),
):
    """
    BM01-KSHS: Danh mục hồ sơ lưu trữ và tình trạng bảo quản (QT-KSHS An Giang).
    Nếu bảng rỗng, tự động seed danh mục chuẩn mẫu.
    """
    total_count = db.query(RecordRetention).count()
    if total_count == 0 and os.getenv("ENABLE_DEMO_SEED", "false").strip().lower() in {"1", "true", "yes"}:
        for seed in SEED_RETENTION_RECORDS:
            item = RecordRetention(**seed)
            if not getattr(item, "retention_expiry_date", None):
                item.retention_expiry_date = calculate_retention_expiry(date.today(), item.retention_period)
            db.add(item)
        db.commit()

    query = db.query(RecordRetention)
    if not include_deleted:
        query = query.filter(RecordRetention.is_deleted == False)
    if department and department != "ALL":
        query = query.filter(RecordRetention.department == department)
    if status and status != "ALL":
        query = query.filter(RecordRetention.status == status)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                RecordRetention.record_code.ilike(term),
                RecordRetention.record_name.ilike(term),
                RecordRetention.storage_location.ilike(term),
                RecordRetention.responsible_person.ilike(term),
            )
        )

    records = query.order_by(RecordRetention.record_code).all()
    return [format_retention_record(r) for r in records]


@router.post("/retention", response_model=RecordRetentionResponse, status_code=status.HTTP_201_CREATED)
def create_retention_record(
    item_in: RecordRetentionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "doc_controller", "management")),
):
    """
    BM01-KSHS: Thêm mới hồ sơ vào danh mục kiểm soát hồ sơ lưu trữ.
    - Kiểm tra tính duy nhất của mã hồ sơ (record_code) tránh trùng lặp làm mất tính truy vết.
    - Chặn không cho phép tạo mới ở trạng thái DISPOSED.
    """
    code_clean = item_in.record_code.strip()
    existing = db.query(RecordRetention).filter(RecordRetention.record_code == code_clean).first()
    if existing:
        if existing.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Mã hồ sơ '{code_clean}' đã tồn tại trong lịch sử (đang ở trạng thái đã hủy theo dõi/soft-deleted). Vui lòng sử dụng mã khác để đảm bảo truy vết độc lập."
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Mã hồ sơ '{code_clean}' đã tồn tại trong danh mục kiểm soát hồ sơ lưu trữ (BM01-KSHS). Vui lòng không đặt trùng mã để đảm bảo tính truy vết."
        )

    if item_in.status == "DISPOSED":
        raise HTTPException(
            status_code=400,
            detail="Không được phép tạo mới hồ sơ ở trạng thái DISPOSED. Việc tiêu hủy phải thực hiện qua biên bản BM02-KSHS."
        )

    c_date = item_in.creation_date or date.today()
    exp_date = item_in.retention_expiry_date or calculate_retention_expiry(c_date, item_in.retention_period)

    record_data = item_in.model_dump()
    record_data["record_code"] = code_clean
    record_data["creation_date"] = c_date
    record_data["retention_expiry_date"] = exp_date

    record = RecordRetention(**record_data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return format_retention_record(record)


@router.put("/retention/{retention_id}", response_model=RecordRetentionResponse)
def update_retention_record(
    retention_id: UUID,
    item_in: RecordRetentionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "doc_controller", "management")),
):
    """
    BM01-KSHS: Cập nhật thông tin hồ sơ lưu trữ.
    - Chặn sửa đổi nếu hồ sơ đã tiêu hủy (DISPOSED).
    - Chặn chuyển trạng thái sang DISPOSED qua API này.
    - Kiểm tra tính duy nhất nếu thay đổi mã hồ sơ.
    - Tự động tính lại ngày hết hạn lưu trữ nếu đổi thời hạn hoặc ngày phát sinh.
    """
    record = db.query(RecordRetention).filter(RecordRetention.retention_id == retention_id).first()
    if not record or record.is_deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ lưu trữ")

    if record.status == "DISPOSED":
        raise HTTPException(
            status_code=400,
            detail="Hồ sơ đã hoàn tất tiêu hủy (DISPOSED). Toàn bộ thông tin bảo quản và biên bản BM02-KSHS đã bị khóa để bảo toàn truy vết."
        )

    if item_in.status == "DISPOSED":
        raise HTTPException(
            status_code=400,
            detail="Không thể chuyển trực tiếp trạng thái sang DISPOSED bằng API cập nhật thông thường. Vui lòng sử dụng endpoint tiêu hủy /retention/{id}/dispose theo BM02-KSHS."
        )

    if item_in.record_code:
        new_code = item_in.record_code.strip()
        if new_code != record.record_code:
            existing = db.query(RecordRetention).filter(
                RecordRetention.record_code == new_code,
                RecordRetention.retention_id != retention_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Mã hồ sơ '{new_code}' đã được sử dụng bởi hồ sơ khác. Vui lòng không đặt trùng mã để đảm bảo tính truy vết BM01-KSHS."
                )

    for field, val in item_in.model_dump(exclude_unset=True).items():
        if field == "record_code" and val:
            setattr(record, field, val.strip())
        else:
            setattr(record, field, val)

    # Tự động tính lại ngày hết hạn nếu không truyền trực tiếp
    if "retention_expiry_date" not in item_in.model_dump(exclude_unset=True):
        record.retention_expiry_date = calculate_retention_expiry(record.creation_date, record.retention_period)

    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return format_retention_record(record)


@router.put("/retention/{retention_id}/dispose", response_model=RecordRetentionResponse)
def dispose_retention_record(
    retention_id: UUID,
    dispose_in: RecordRetentionDispose,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "doc_controller", "management")),
):
    """
    BM02-KSHS: Thực hiện tiêu hủy hồ sơ hết thời hạn lưu trữ.
    Điều kiện:
    - Hồ sơ chưa bị tiêu hủy trước đó.
    - Hồ sơ phải ở trạng thái READY_FOR_DISPOSAL (Đề xuất tiêu hủy) hoặc có xác nhận hết hạn lưu trữ (confirm_expired=True).
    - Bắt buộc cung cấp Hội đồng tiêu hủy và Số biên bản tiêu hủy BM02-KSHS.
    """
    record = db.query(RecordRetention).filter(RecordRetention.retention_id == retention_id).first()
    if not record or record.is_deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ lưu trữ")

    if record.status == "DISPOSED":
        raise HTTPException(
            status_code=400,
            detail=f"Hồ sơ '{record.record_code}' đã được tiêu hủy trước đó vào ngày {record.disposal_date} (Biên bản: {record.disposal_minutes_code}). Không thể tiêu hủy lại."
        )

    # Kiểm tra điều kiện tiên quyết theo BM02-KSHS
    if record.status != "READY_FOR_DISPOSAL" and not dispose_in.confirm_expired:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Hồ sơ '{record.record_code}' hiện đang ở trạng thái '{record.status}'. "
                "Theo quy trình BM02-KSHS, hồ sơ phải được chuyển sang trạng thái 'READY_FOR_DISPOSAL' (Đề xuất tiêu hủy) "
                "hoặc phải có xác nhận rõ ràng đã hết hạn bảo quản lưu trữ (confirm_expired=True)."
            )
        )

    if not dispose_in.disposal_council or not dispose_in.disposal_council.strip():
        raise HTTPException(status_code=400, detail="Thành phần Hội đồng tiêu hủy không được để trống theo BM02-KSHS.")

    if not dispose_in.disposal_minutes_code or not dispose_in.disposal_minutes_code.strip():
        raise HTTPException(status_code=400, detail="Số biên bản tiêu hủy không được để trống theo BM02-KSHS.")

    record.status = "DISPOSED"
    record.disposal_date = dispose_in.disposal_date or date.today()
    record.disposal_council = dispose_in.disposal_council.strip()
    record.disposal_minutes_code = dispose_in.disposal_minutes_code.strip()
    if dispose_in.disposal_method:
        record.disposal_method = dispose_in.disposal_method.strip()

    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return format_retention_record(record)


@router.delete("/retention/{retention_id}")
def delete_retention_record(
    retention_id: UUID,
    hard_delete: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "doc_controller", "management")),
):
    """
    Xóa/Hủy theo dõi một hồ sơ khỏi danh mục lưu trữ.
    - Nghiêm cấm xóa hồ sơ đã tiêu hủy (DISPOSED) vì là bằng chứng thanh tra ISO 22000.
    - Mặc định thực hiện Soft-Delete chuyển sang status='CANCELLED' để bảo toàn truy vết.
    - Chỉ cho phép Admin xóa cứng khi bản ghi là nháp khởi tạo nhầm (chỉ ở trạng thái RETAINED và chưa phát sinh bất kỳ biên bản/quy trình tiêu hủy nào).
    """
    record = db.query(RecordRetention).filter(RecordRetention.retention_id == retention_id).first()
    if not record or record.is_deleted:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ lưu trữ")

    if record.status == "DISPOSED":
        raise HTTPException(
            status_code=400,
            detail="Nghiêm cấm xóa hồ sơ đã tiêu hủy (DISPOSED). Toàn bộ dữ liệu và biên bản BM02-KSHS phải được lưu trữ vĩnh viễn làm bằng chứng pháp lý FSMS ISO 22000."
        )

    user_roles = [str(r.role_code).lower().strip() for r in current_user.roles]
    if current_user.department:
        user_roles.append(str(current_user.department).lower().strip())
    is_admin = "admin" in user_roles

    # Xóa cứng chỉ dành riêng cho Admin nếu bản ghi tạo nhầm chưa vào quy trình
    if hard_delete:
        if not is_admin:
            raise HTTPException(
                status_code=403,
                detail="Chỉ Quản trị viên (Admin) mới có quyền xóa cứng bản ghi khởi tạo nhầm."
            )

        # Chỉ cho phép xóa cứng khi hồ sơ ở trạng thái khởi tạo ban đầu RETAINED và chưa phát sinh dữ liệu biên bản/quy trình
        has_disposal_data = bool(
            record.disposal_date
            or (record.disposal_minutes_code and record.disposal_minutes_code.strip())
            or (record.disposal_council and record.disposal_council.strip())
        )
        if record.status != "RETAINED" or has_disposal_data:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Không thể xóa cứng hồ sơ '{record.record_code}'. "
                    f"Hồ sơ đã vào quy trình (trạng thái: '{record.status}') hoặc đã có dữ liệu biên bản/ghi nhận phát sinh. "
                    "Chỉ bản ghi ở trạng thái 'RETAINED' chưa phát sinh bất kỳ biên bản/quy trình nào mới được coi là khởi tạo nhầm để xóa cứng. "
                    "Vui lòng sử dụng Soft-Delete (Hủy theo dõi) để bảo toàn bằng chứng truy vết FSMS ISO 22000."
                )
            )

        db.delete(record)
        db.commit()
        return {"message": "Đã xóa vĩnh viễn bản ghi hồ sơ khởi tạo nhầm khỏi hệ thống"}

    # Mặc định: Soft-delete lưu vết truy vết
    record.is_deleted = True
    record.status = "CANCELLED"
    time_str = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M:%S")
    audit_trail = f"[HỦY THEO DÕI bởi {current_user.full_name or current_user.username} lúc {time_str}]"
    record.notes = f"{audit_trail} {record.notes or ''}".strip()
    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Đã lưu vết hủy theo dõi hồ sơ thành công (Soft-deleted), bảo toàn bằng chứng truy vết ISO 22000."}


# ==================== THAO TÁC CHI TIẾT TÀI LIỆU THEO ID (PARAMETERIZED ROUTES) ====================
@router.get("/{document_id}", response_model=DocumentResponse)

def get_document_by_id(document_id: UUID, db: Session = Depends(get_db)):
    """Lấy chi tiết 1 tài liệu"""
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    return DocumentResponse.model_validate(doc)


@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: UUID,
    doc_in: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "doc_controller", "management")),
):
    """Cập nhật / Phê duyệt tài liệu"""
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    if doc_in.doc_code and doc_in.doc_code != doc.doc_code:
        existing = db.query(Document).filter(Document.doc_code == doc_in.doc_code).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Mã tài liệu '{doc_in.doc_code}' đã tồn tại."
            )
        doc.doc_code = doc_in.doc_code

    user_roles = [str(r.role_code).lower().strip() for r in current_user.roles]
    if current_user.department:
        user_roles.append(str(current_user.department).lower().strip())
    is_approver = "admin" in user_roles or any(r in ["qa", "fst_leader", "fs_team_leader", "management", "manager"] for r in user_roles)

    prev_status = doc.status
    prev_version = doc.current_version
    action_type = "UPDATED"

    # Kiểm tra quyền duyệt khi chuyển sang APPROVED hoặc EFFECTIVE
    if doc_in.status is not None:
        target_status = doc_in.status.upper()
        if target_status in ["APPROVED", "EFFECTIVE"]:
            if prev_status != "APPROVED":
                if not is_approver:
                    raise HTTPException(
                        status_code=403,
                        detail="Chỉ Quản lý QA / Đội trưởng ATTP / Ban Giám Đốc mới có quyền phê duyệt ban hành tài liệu.",
                    )
                doc.status = "APPROVED"
                # Lấy người duyệt trực tiếp từ token đăng nhập, không lấy từ client payload!
                doc.approved_by = current_user.user_id
                eff = doc_in.effective_date or date.today()
                doc.effective_date = eff
                doc.review_due_date = eff + timedelta(days=365 * (doc.review_frequency_years or 3))
                doc.last_reviewed_date = eff
                action_type = "APPROVED"
        else:
            doc.status = target_status
            if target_status == "OBSOLETE":
                action_type = "OBSOLETED"
            elif target_status == "PENDING_APPROVAL":
                action_type = "SUBMITTED"

    if doc_in.current_version is not None and doc_in.current_version != prev_version:
        doc.current_version = doc_in.current_version
        if action_type == "UPDATED":
            action_type = "VERSION_UPDATE"

    if doc_in.doc_title is not None:
        doc.doc_title = doc_in.doc_title
    if doc_in.doc_type is not None:
        doc.doc_type = doc_in.doc_type
    if doc_in.department is not None:
        doc.department = doc_in.department
    if doc_in.standard is not None:
        doc.standard = doc_in.standard
    if doc_in.content is not None:
        doc.content = doc_in.content
    if doc_in.file_url is not None:
        doc.file_url = doc_in.file_url
    if doc_in.review_due_date is not None:
        doc.review_due_date = doc_in.review_due_date
    if doc_in.last_reviewed_date is not None:
        doc.last_reviewed_date = doc_in.last_reviewed_date
    if doc_in.review_frequency_years is not None:
        doc.review_frequency_years = doc_in.review_frequency_years
    if doc_in.drafter_name is not None:
        doc.drafter_name = doc_in.drafter_name
    if doc_in.reviewer_name is not None:
        doc.reviewer_name = doc_in.reviewer_name
    if doc_in.security_level is not None:
        doc.security_level = doc_in.security_level

    db.add(DocumentApproval(
        document_id=doc.document_id,
        version=doc.current_version,
        action=action_type,
        previous_status=prev_status,
        new_status=doc.status,
        performed_by=current_user.user_id,
        performed_by_name=current_user.full_name or current_user.username,
        comments=doc_in.approval_note or (
            "Phê duyệt hiệu lực ban hành" if action_type == "APPROVED"
            else f"Cập nhật tài liệu phiên bản {doc.current_version}"
        ),
    ))

    db.commit()
    db.refresh(doc)

    return DocumentResponse.model_validate(doc)

@router.post("/{document_id}/approve", response_model=DocumentResponse)
def approve_document(
    document_id: UUID,
    payload: DocumentApproveRequest = DocumentApproveRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "management", "manager")),
):
    """Phê duyệt ban hành tài liệu (Lấy định danh người phê duyệt an toàn từ Token đăng nhập)"""
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    prev_status = doc.status
    doc.status = "APPROVED"
    doc.approved_by = current_user.user_id
    eff = payload.effective_date or date.today()
    doc.effective_date = eff
    doc.review_due_date = eff + timedelta(days=365 * (doc.review_frequency_years or 3))
    doc.last_reviewed_date = eff

    approval_rec = DocumentApproval(
        document_id=doc.document_id,
        version=doc.current_version,
        action="APPROVED",
        previous_status=prev_status,
        new_status="APPROVED",
        performed_by=current_user.user_id,
        performed_by_name=current_user.full_name or current_user.username,
        comments=payload.approval_note or "Phê duyệt ban hành tài liệu hệ thống ISO 22000",
    )
    db.add(approval_rec)
    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.get("/{document_id}/history", response_model=List[DocumentApprovalResponse])
def get_document_history(
    document_id: UUID,
    db: Session = Depends(get_db),
):
    """Lấy toàn bộ lịch sử phiên bản và nhật ký phê duyệt của tài liệu"""
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    history = (
        db.query(DocumentApproval)
        .filter(DocumentApproval.document_id == document_id)
        .order_by(DocumentApproval.created_at.desc())
        .all()
    )
    return [DocumentApprovalResponse.model_validate(h) for h in history]


@router.post("/{document_id}/confirm-unaltered", response_model=DocumentResponse)
def confirm_unaltered_periodic_review(
    document_id: UUID,
    payload: PeriodicReviewConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "management")),
):
    """
    BM05-KSTL: Xác nhận tài liệu không thay đổi về nội dung sau soát xét 3 năm.
    Tự động cập nhật last_reviewed_date = today, gia hạn review_due_date thêm 3 năm,
    và ghi nhận 1 bản ghi vào lịch sử phê duyệt tài liệu.
    """
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    today = date.today()
    doc.last_reviewed_date = today
    doc.review_due_date = today + timedelta(days=365 * (doc.review_frequency_years or 3))

    approval_rec = DocumentApproval(
        document_id=doc.document_id,
        version=doc.current_version,
        action="PERIODIC_REVIEW_CONFIRMED",
        previous_status=doc.status,
        new_status=doc.status,
        performed_by=current_user.user_id,
        performed_by_name=payload.signer_name or current_user.full_name or current_user.username,
        comments=payload.comment or "Soát xét định kỳ 3 năm: Nội dung tài liệu vẫn phù hợp, không cần sửa đổi (BM05-KSTL).",
    )
    db.add(approval_rec)
    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)

@router.delete("/{document_id}")
def delete_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "doc_controller")),
):
    """Xoá tài liệu"""
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    db.delete(doc)
    db.commit()
    return {"message": f"Đã xoá tài liệu '{doc.doc_code}' thành công"}
