from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date
from app.core.database import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse

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
    count = db.query(Document).count()
    admin_user = db.query(User).filter(User.username == "admin").first()
    admin_id = admin_user.user_id if admin_user else None

    if count == 0:
        for item in SEED_DOCUMENTS:
            doc = Document(
                doc_code=str(item["doc_code"]),
                doc_title=str(item["doc_title"]),
                doc_type=str(item["doc_type"]),
                department=str(item.get("department") or "Ban QLCL & ATTP"),
                standard=str(item.get("standard") or "ISO 22000:2018"),
                current_version=str(item["current_version"]),
                status=str(item["status"]),
                effective_date=item.get("effective_date"),
                file_url=str(item.get("file_url") or ""),
                approved_by=admin_id
            )
            db.add(doc)
        db.commit()
    else:
        # Cập nhật bổ sung department/standard nếu trước đó chưa có
        existing_docs = db.query(Document).filter(Document.department.is_(None)).all()
        if existing_docs:
            for doc in existing_docs:
                matching_seed = next((s for s in SEED_DOCUMENTS if s["doc_code"] == doc.doc_code), None)
                if matching_seed:
                    dept_val = str(matching_seed.get("department") or "Ban QLCL & ATTP")
                    std_val = str(matching_seed.get("standard") or "ISO 22000:2018")
                    doc.department = dept_val
                    doc.standard = std_val
                else:
                    doc.department = "Ban QLCL & ATTP"
                    doc.standard = "ISO 22000:2018"
            db.commit()

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

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document_by_id(document_id: UUID, db: Session = Depends(get_db)):
    """Lấy chi tiết 1 tài liệu"""
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    return DocumentResponse.model_validate(doc)

@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(doc_in: DocumentCreate, db: Session = Depends(get_db)):
    """Tạo mới tài liệu / SOP"""
    existing = db.query(Document).filter(Document.doc_code == doc_in.doc_code).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Mã tài liệu '{doc_in.doc_code}' đã tồn tại trong hệ thống."
        )

    new_doc = Document(
        doc_code=doc_in.doc_code,
        doc_title=doc_in.doc_title,
        doc_type=doc_in.doc_type,
        department=doc_in.department,
        standard=doc_in.standard or "ISO 22000:2018",
        current_version=doc_in.current_version,
        status=doc_in.status,
        content=doc_in.content,
        file_url=doc_in.file_url,
        approved_by=doc_in.approved_by,
        effective_date=doc_in.effective_date
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return DocumentResponse.model_validate(new_doc)

@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: UUID,
    doc_in: DocumentUpdate,
    db: Session = Depends(get_db)
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

    if doc_in.doc_title is not None:
        doc.doc_title = doc_in.doc_title
    if doc_in.doc_type is not None:
        doc.doc_type = doc_in.doc_type
    if doc_in.department is not None:
        doc.department = doc_in.department
    if doc_in.standard is not None:
        doc.standard = doc_in.standard
    if doc_in.current_version is not None:
        doc.current_version = doc_in.current_version
    if doc_in.status is not None:
        doc.status = doc_in.status
    if doc_in.content is not None:
        doc.content = doc_in.content
    if doc_in.file_url is not None:
        doc.file_url = doc_in.file_url
    if doc_in.approved_by is not None:
        doc.approved_by = doc_in.approved_by
    if doc_in.effective_date is not None:
        doc.effective_date = doc_in.effective_date

    db.commit()
    db.refresh(doc)

    return DocumentResponse.model_validate(doc)

@router.delete("/{document_id}")
def delete_document(document_id: UUID, db: Session = Depends(get_db)):
    """Xoá tài liệu"""
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    db.delete(doc)
    db.commit()
    return {"message": f"Đã xoá tài liệu '{doc.doc_code}' thành công"}
