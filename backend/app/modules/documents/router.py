from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import date
from app.core.database import get_db
from app.core.dependencies import require_roles
from app.modules.documents.models import Document, DocumentApproval
from app.modules.auth.models import User
from app.modules.documents.schemas import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentApproveRequest,
    DocumentApprovalResponse,
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

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document_by_id(document_id: UUID, db: Session = Depends(get_db)):
    """Lấy chi tiết 1 tài liệu"""
    doc = db.query(Document).filter(Document.document_id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    return DocumentResponse.model_validate(doc)

@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    doc_in: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "doc_controller", "management")),
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
    is_approver = "admin" in user_roles or any(r in ["qa", "fst_leader", "fs_team_leader", "management", "manager"] for r in user_roles)

    target_status = (doc_in.status or "DRAFT").upper()
    approved_by_id = None
    effective_date_val = None

    # Khóa quyền APPROVED / EFFECTIVE: Chỉ người có quyền duyệt mới được tạo ở trạng thái APPROVED
    if target_status in ["APPROVED", "EFFECTIVE"]:
        if not is_approver:
            target_status = "DRAFT"
        else:
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
    )
    db.add(new_doc)
    db.flush()

    # Ghi nhận lịch sử khởi tạo
    approval_rec = DocumentApproval(
        document_id=new_doc.document_id,
        version=new_doc.current_version,
        action="APPROVED" if target_status == "APPROVED" else "CREATED",
        previous_status=None,
        new_status=new_doc.status,
        performed_by=current_user.user_id,
        performed_by_name=current_user.full_name or current_user.username,
        comments="Khởi tạo tài liệu" if target_status != "APPROVED" else "Khởi tạo và phê duyệt hiệu lực ban hành",
    )
    db.add(approval_rec)
    db.commit()
    db.refresh(new_doc)

    return DocumentResponse.model_validate(new_doc)

@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: UUID,
    doc_in: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "doc_controller", "management")),
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
                doc.effective_date = doc_in.effective_date or date.today()
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

    # Lưu lịch sử phê duyệt / phiên bản
    approval_rec = DocumentApproval(
        document_id=doc.document_id,
        version=doc.current_version,
        action=action_type,
        previous_status=prev_status,
        new_status=doc.status,
        performed_by=current_user.user_id,
        performed_by_name=current_user.full_name or current_user.username,
        comments=doc_in.approval_note or (f"Cập nhật tài liệu phiên bản {doc.current_version}" if action_type != "APPROVED" else "Phê duyệt hiệu lực ban hành"),
    )
    db.add(approval_rec)
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
    doc.effective_date = payload.effective_date or date.today()

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
