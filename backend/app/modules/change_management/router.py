from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
import uuid
from datetime import datetime, date

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.modules.auth.models import User
from app.modules.change_management.models import ChangeRequest
from app.modules.change_management.schemas import (
    ChangeRequestCreate,
    ChangeRequestUpdate,
    ChangeRequestStatusUpdate,
    ChangeRequestResponse,
    ChangeRequestStats,
)

router = APIRouter(tags=["Change Management"])

def format_change_request(cr: ChangeRequest) -> ChangeRequestResponse:
    return ChangeRequestResponse.model_validate(cr)

@router.get("/stats", response_model=ChangeRequestStats)
def get_change_request_stats(db: Session = Depends(get_db)):
    total = db.query(ChangeRequest).count()
    draft = db.query(ChangeRequest).filter(ChangeRequest.review_status == "DRAFT").count()
    under_review = db.query(ChangeRequest).filter(ChangeRequest.review_status == "UNDER_REVIEW").count()
    approved = db.query(ChangeRequest).filter(ChangeRequest.review_status == "APPROVED").count()
    implemented = db.query(ChangeRequest).filter(ChangeRequest.review_status == "IMPLEMENTED").count()
    
    # High impact count from JSONB
    high_impact = 0
    all_crs = db.query(ChangeRequest.impact_assessment).all()
    for (ia,) in all_crs:
        if isinstance(ia, dict) and ia.get("food_safety_impact_level") == "HIGH":
            high_impact += 1

    return ChangeRequestStats(
        total=total,
        draft=draft,
        under_review=under_review,
        approved=approved,
        implemented=implemented,
        high_impact=high_impact,
    )

@router.get("/requests", response_model=List[ChangeRequestResponse])
def get_change_requests(
    change_type: Optional[str] = None,
    review_status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(ChangeRequest)
    if change_type and change_type != "ALL":
        query = query.filter(ChangeRequest.change_type == change_type)
    if review_status and review_status != "ALL":
        query = query.filter(ChangeRequest.review_status == review_status)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (ChangeRequest.change_code.ilike(s))
            | (ChangeRequest.title.ilike(s))
            | (ChangeRequest.proposed_by_name.ilike(s))
        )
    crs = query.order_by(desc(ChangeRequest.created_at)).all()
    return [format_change_request(cr) for cr in crs]

def check_user_has_roles(user: User, allowed_roles: List[str]) -> bool:
    user_roles = [str(r.role_code).lower().strip() for r in user.roles]
    if user.department:
        user_roles.append(str(user.department).lower().strip())
    if "admin" in user_roles:
        return True
    allowed_lower = [r.lower().strip() for r in allowed_roles]
    for ur in user_roles:
        for al in allowed_lower:
            if ur == al or al in ur or ur in al:
                return True
    return False

VALID_TRANSITIONS = {
    "DRAFT": ["UNDER_REVIEW"],
    "UNDER_REVIEW": ["APPROVED", "REJECTED", "DRAFT"],
    "APPROVED": ["IMPLEMENTED", "UNDER_REVIEW"],
    "REJECTED": ["DRAFT"],
    "IMPLEMENTED": [],
}

ROLE_REQUIREMENTS_PER_STATUS = {
    "UNDER_REVIEW": ["admin", "qa", "fst_leader", "fs_team_leader", "management", "manager", "production", "technical", "maintenance", "warehouse"],
    "APPROVED": ["admin", "qa", "fst_leader", "fs_team_leader", "management", "manager"],
    "REJECTED": ["admin", "qa", "fst_leader", "fs_team_leader", "management", "manager"],
    "IMPLEMENTED": ["admin", "qa", "fst_leader", "fs_team_leader", "technical", "production"],
    "DRAFT": ["admin", "qa", "fst_leader", "fs_team_leader", "management", "manager"],
}

@router.get("/requests/{change_id}", response_model=ChangeRequestResponse)
def get_change_request_by_id(change_id: uuid.UUID, db: Session = Depends(get_db)):
    cr = db.query(ChangeRequest).filter(ChangeRequest.change_id == change_id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu thay đổi")
    return format_change_request(cr)

@router.post("/requests", response_model=ChangeRequestResponse, status_code=status.HTTP_201_CREATED)
def create_change_request(
    payload: ChangeRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "management", "manager", "production", "technical", "maintenance", "warehouse")),
):
    code = payload.change_code
    if not code:
        year = payload.proposed_date.year if payload.proposed_date else datetime.now().year
        count = db.query(ChangeRequest).count() + 1
        code = f"CR-{year}-{count:03d}"

    actor_display = payload.proposed_by_name or current_user.full_name or current_user.username

    cr = ChangeRequest(
        change_code=code,
        title=payload.title,
        change_type=payload.change_type,
        description=payload.description,
        reason=payload.reason,
        impact_assessment=payload.impact_assessment,
        proposed_by_name=actor_display,
        proposed_date=payload.proposed_date or date.today(),
        review_status="DRAFT",
        approved_by_name=None,
        approval_date=None,
        implementation_plan=payload.implementation_plan,
        implementation_date=None,
        verification_result=None,
        verified_by_name=None,
        related_ccp_ids=payload.related_ccp_ids or [],
        related_document_ids=payload.related_document_ids or [],
    )
    db.add(cr)
    db.commit()
    db.refresh(cr)
    return format_change_request(cr)

@router.put("/requests/{change_id}", response_model=ChangeRequestResponse)
def update_change_request(
    change_id: uuid.UUID,
    payload: ChangeRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "management", "manager")),
):
    cr = db.query(ChangeRequest).filter(ChangeRequest.change_id == change_id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu thay đổi")

    update_data = payload.model_dump(exclude_unset=True)
    # Khóa việc sửa status hoặc thông tin phê duyệt nhảy cóc qua PUT thông thường
    for forbidden_field in [
        "review_status",
        "approved_by_name",
        "approval_date",
        "verified_by_name",
        "implementation_date",
    ]:
        if forbidden_field in update_data:
            update_data.pop(forbidden_field)

    for field, value in update_data.items():
        setattr(cr, field, value)

    db.commit()
    db.refresh(cr)
    return format_change_request(cr)

@router.patch("/requests/{change_id}/status", response_model=ChangeRequestResponse)
def update_change_request_status(
    change_id: uuid.UUID,
    payload: ChangeRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "management", "manager", "production", "technical")),
):
    cr = db.query(ChangeRequest).filter(ChangeRequest.change_id == change_id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu thay đổi")

    current_status = cr.review_status or "DRAFT"
    target_status = payload.status

    if target_status == current_status:
        return format_change_request(cr)

    allowed_next = VALID_TRANSITIONS.get(current_status, [])
    if target_status not in allowed_next:
        raise HTTPException(
            status_code=400,
            detail=f"Chuyển đổi trạng thái không hợp lệ: không thể chuyển từ '{current_status}' sang '{target_status}'. Luồng chuẩn: DRAFT -> UNDER_REVIEW -> APPROVED -> IMPLEMENTED.",
        )

    required_roles = ROLE_REQUIREMENTS_PER_STATUS.get(target_status, [])
    if required_roles and not check_user_has_roles(current_user, required_roles):
        raise HTTPException(
            status_code=403,
            detail=f"Bạn không có quyền chuyển trạng thái sang '{target_status}'. Yêu cầu vai trò: {', '.join(required_roles)}.",
        )

    actor_display = current_user.full_name or current_user.username
    cr.review_status = target_status

    if target_status == "APPROVED":
        cr.approved_by_name = actor_display
        cr.approval_date = date.today()
        if payload.note:
            cr.verification_result = payload.note
    elif target_status == "REJECTED":
        cr.approved_by_name = actor_display
        cr.approval_date = date.today()
        if payload.note:
            cr.verification_result = f"Từ chối phê duyệt: {payload.note}"
    elif target_status == "IMPLEMENTED":
        cr.implementation_date = date.today()
        cr.verified_by_name = actor_display
        if payload.note:
            cr.verification_result = payload.note

    db.commit()
    db.refresh(cr)
    return format_change_request(cr)

@router.delete("/requests/{change_id}")
def delete_change_request(
    change_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader", "management")),
):
    cr = db.query(ChangeRequest).filter(ChangeRequest.change_id == change_id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu thay đổi")
    db.delete(cr)
    db.commit()
    return {"message": "Đã xóa phiếu yêu cầu thay đổi thành công"}
