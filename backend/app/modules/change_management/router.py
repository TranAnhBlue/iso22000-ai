from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
import uuid
from datetime import datetime, date

from app.core.database import get_db
from app.modules.change_management.models import ChangeRequest
from app.modules.change_management.schemas import (
    ChangeRequestCreate,
    ChangeRequestUpdate,
    ChangeRequestStatusUpdate,
    ChangeRequestResponse,
    ChangeRequestStats,
)

router = APIRouter(tags=["Change Management (Clause 6.3)"])

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

@router.get("/requests/{change_id}", response_model=ChangeRequestResponse)
def get_change_request_by_id(change_id: uuid.UUID, db: Session = Depends(get_db)):
    cr = db.query(ChangeRequest).filter(ChangeRequest.change_id == change_id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu thay đổi")
    return format_change_request(cr)

@router.post("/requests", response_model=ChangeRequestResponse)
def create_change_request(payload: ChangeRequestCreate, db: Session = Depends(get_db)):
    code = payload.change_code
    if not code:
        year = payload.proposed_date.year if payload.proposed_date else datetime.now().year
        count = db.query(ChangeRequest).count() + 1
        code = f"CR-{year}-{count:03d}"

    cr = ChangeRequest(
        change_code=code,
        title=payload.title,
        change_type=payload.change_type,
        description=payload.description,
        reason=payload.reason,
        impact_assessment=payload.impact_assessment,
        proposed_by_name=payload.proposed_by_name,
        proposed_date=payload.proposed_date or date.today(),
        review_status=payload.review_status or "DRAFT",
        approved_by_name=payload.approved_by_name,
        approval_date=payload.approval_date,
        implementation_plan=payload.implementation_plan,
        implementation_date=payload.implementation_date,
        verification_result=payload.verification_result,
        verified_by_name=payload.verified_by_name,
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
):
    cr = db.query(ChangeRequest).filter(ChangeRequest.change_id == change_id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu thay đổi")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cr, field, value)

    db.commit()
    db.refresh(cr)
    return format_change_request(cr)

@router.patch("/requests/{change_id}/status", response_model=ChangeRequestResponse)
def update_change_request_status(
    change_id: uuid.UUID,
    payload: ChangeRequestStatusUpdate,
    db: Session = Depends(get_db),
):
    cr = db.query(ChangeRequest).filter(ChangeRequest.change_id == change_id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu thay đổi")

    cr.review_status = payload.status
    if payload.status == "APPROVED":
        cr.approved_by_name = payload.actor_name or "Ban Giám Đốc / QA Manager"
        cr.approval_date = date.today()
    elif payload.status == "IMPLEMENTED":
        cr.implementation_date = date.today()
        if payload.actor_name:
            cr.verified_by_name = payload.actor_name

    db.commit()
    db.refresh(cr)
    return format_change_request(cr)

@router.delete("/requests/{change_id}")
def delete_change_request(change_id: uuid.UUID, db: Session = Depends(get_db)):
    cr = db.query(ChangeRequest).filter(ChangeRequest.change_id == change_id).first()
    if not cr:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu yêu cầu thay đổi")
    db.delete(cr)
    db.commit()
    return {"message": "Đã xóa phiếu yêu cầu thay đổi thành công"}
