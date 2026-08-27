from typing import List, Optional
from uuid import UUID
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, or_, desc, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.capa import NonConformance, CAPARecord
from app.schemas.capa import (
    NonConformanceCreate,
    NonConformanceUpdate,
    NonConformanceResponse,
    CAPARecordCreate,
    CAPARecordUpdate,
    CAPAVerifyRequest,
    CAPARecordResponse,
    CAPAStatsResponse,
    AI5WhyRequest,
    AI5WhyResponse,
    AIFishboneRequest,
    AIFishboneResponse,
    AISuggestActionsRequest,
    AISuggestActionsResponse,
)

router = APIRouter()


# ==================== HELPER FORMATTERS ====================
def format_nc_out(nc: NonConformance) -> NonConformanceResponse:
    capa_count = len(nc.capa_records) if nc.capa_records else 0
    return NonConformanceResponse(
        nc_id=nc.nc_id,
        nc_number=nc.nc_number,
        title=nc.title,
        source=nc.source,
        severity=nc.severity,
        occurred_date=nc.occurred_date,
        occurred_location=nc.occurred_location,
        description=nc.description,
        immediate_action=nc.immediate_action,
        affected_lot_number=nc.affected_lot_number,
        affected_quantity=nc.affected_quantity,
        reported_by=nc.reported_by,
        reported_by_name=nc.reported_by_name or "KCS Ca sản xuất",
        status=nc.status,
        created_at=nc.created_at,
        updated_at=nc.updated_at,
        capa_count=capa_count,
    )


def format_capa_out(c: CAPARecord) -> CAPARecordResponse:
    nc = getattr(c, "non_conformance", None)
    return CAPARecordResponse(
        capa_id=c.capa_id,
        capa_number=c.capa_number,
        nc_id=c.nc_id,
        title=c.title,
        root_cause_method=c.root_cause_method,
        root_cause_analysis=c.root_cause_analysis,
        root_cause_summary=c.root_cause_summary,
        corrective_action=c.corrective_action,
        preventive_action=c.preventive_action,
        assigned_to=c.assigned_to,
        assigned_to_name=c.assigned_to_name or "Trưởng bộ phận",
        assigned_dept=c.assigned_dept or "Phòng Sản xuất",
        target_date=c.target_date,
        completed_date=c.completed_date,
        verified_by=c.verified_by,
        verified_by_name=c.verified_by_name,
        verification_date=c.verification_date,
        verification_result=c.verification_result,
        verification_status=c.verification_status,
        status=c.status,
        evidence_urls=c.evidence_urls or [],
        created_at=c.created_at,
        updated_at=c.updated_at,
        nc_number=nc.nc_number if nc else None,
        nc_title=nc.title if nc else None,
        nc_severity=nc.severity if nc else None,
    )


# ==================== 1. STATS ====================
@router.get("/stats", response_model=CAPAStatsResponse)
def get_capa_stats(db: Session = Depends(get_db)):
    ncs = db.scalars(select(NonConformance)).all()
    capas = db.scalars(select(CAPARecord)).all()

    total_ncs = len(ncs)
    critical_ncs = sum(1 for n in ncs if n.severity == "CRITICAL")
    open_ncs = sum(1 for n in ncs if n.status not in ["CLOSED", "REJECTED"])
    closed_ncs = sum(1 for n in ncs if n.status == "CLOSED")

    total_capas = len(capas)
    in_progress_capas = sum(1 for c in capas if c.status in ["IN_PROGRESS", "DRAFT"])
    pending_verify = sum(1 for c in capas if c.status == "PENDING_VERIFICATION")
    completed_capas = sum(1 for c in capas if c.status == "COMPLETED")
    
    today = date.today()
    overdue_capas = sum(
        1 for c in capas 
        if c.status not in ["COMPLETED", "CLOSED"] and c.target_date < today
    )

    verified_capas = [c for c in capas if c.verification_status in ["EFFECTIVE", "INEFFECTIVE"]]
    effective_count = sum(1 for c in verified_capas if c.verification_status == "EFFECTIVE")
    effectiveness_rate = (
        round((effective_count / len(verified_capas)) * 100, 1) 
        if len(verified_capas) > 0 else 100.0
    )

    return CAPAStatsResponse(
        total_ncs=total_ncs,
        critical_ncs=critical_ncs,
        open_ncs=open_ncs,
        closed_ncs=closed_ncs,
        total_capas=total_capas,
        in_progress_capas=in_progress_capas,
        pending_verify_capas=pending_verify,
        completed_capas=completed_capas,
        overdue_capas=overdue_capas,
        effectiveness_rate=effectiveness_rate,
    )


# ==================== 2. NON-CONFORMANCES (NC) ====================
@router.get("/ncs", response_model=List[NonConformanceResponse])
def get_non_conformances(
    source: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = select(NonConformance).order_by(desc(NonConformance.created_at))
    if source and source != "ALL":
        query = query.where(NonConformance.source == source)
    if severity and severity != "ALL":
        query = query.where(NonConformance.severity == severity)
    if status and status != "ALL":
        query = query.where(NonConformance.status == status)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.where(
            or_(
                NonConformance.nc_number.ilike(term),
                NonConformance.title.ilike(term),
                NonConformance.description.ilike(term),
                NonConformance.affected_lot_number.ilike(term),
            )
        )
    ncs = db.scalars(query).all()
    return [format_nc_out(n) for n in ncs]


@router.post("/ncs", response_model=NonConformanceResponse, status_code=status.HTTP_201_CREATED)
def create_non_conformance(payload: NonConformanceCreate, db: Session = Depends(get_db)):
    # Check duplicate NC number
    existing = db.scalar(select(NonConformance).where(NonConformance.nc_number == payload.nc_number.strip()))
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã phiếu NC '{payload.nc_number}' đã tồn tại")

    new_nc = NonConformance(
        nc_number=payload.nc_number.strip(),
        title=payload.title.strip(),
        source=payload.source,
        severity=payload.severity,
        occurred_date=payload.occurred_date,
        occurred_location=payload.occurred_location,
        description=payload.description.strip(),
        immediate_action=payload.immediate_action.strip() if payload.immediate_action else None,
        affected_lot_number=payload.affected_lot_number.strip() if payload.affected_lot_number else None,
        affected_quantity=payload.affected_quantity.strip() if payload.affected_quantity else None,
        reported_by=payload.reported_by,
        reported_by_name=payload.reported_by_name or "KCS Ca sản xuất",
        status=payload.status,
    )
    db.add(new_nc)
    db.commit()
    db.refresh(new_nc)
    return format_nc_out(new_nc)


@router.get("/ncs/{nc_id}", response_model=NonConformanceResponse)
def get_non_conformance_by_id(nc_id: UUID, db: Session = Depends(get_db)):
    nc = db.get(NonConformance, nc_id)
    if not nc:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi sự không phù hợp")
    return format_nc_out(nc)


@router.put("/ncs/{nc_id}", response_model=NonConformanceResponse)
def update_non_conformance(nc_id: UUID, payload: NonConformanceUpdate, db: Session = Depends(get_db)):
    nc = db.get(NonConformance, nc_id)
    if not nc:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi sự không phù hợp")

    if payload.title is not None:
        nc.title = payload.title.strip()
    if payload.source is not None:
        nc.source = payload.source
    if payload.severity is not None:
        nc.severity = payload.severity
    if payload.occurred_date is not None:
        nc.occurred_date = payload.occurred_date
    if payload.occurred_location is not None:
        nc.occurred_location = payload.occurred_location
    if payload.description is not None:
        nc.description = payload.description.strip()
    if payload.immediate_action is not None:
        nc.immediate_action = payload.immediate_action.strip()
    if payload.affected_lot_number is not None:
        nc.affected_lot_number = payload.affected_lot_number.strip()
    if payload.affected_quantity is not None:
        nc.affected_quantity = payload.affected_quantity.strip()
    if payload.reported_by_name is not None:
        nc.reported_by_name = payload.reported_by_name.strip()
    if payload.status is not None:
        nc.status = payload.status

    db.commit()
    db.refresh(nc)
    return format_nc_out(nc)


@router.delete("/ncs/{nc_id}", status_code=status.HTTP_200_OK)
def delete_non_conformance(nc_id: UUID, db: Session = Depends(get_db)):
    nc = db.get(NonConformance, nc_id)
    if not nc:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi sự không phù hợp")
    db.delete(nc)
    db.commit()
    return {"message": "Đã xóa sự không phù hợp thành công", "nc_id": str(nc_id)}


# ==================== 3. CAPA RECORDS ====================
@router.get("/records", response_model=List[CAPARecordResponse])
def get_capa_records(
    status: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None),
    nc_id: Optional[UUID] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = select(CAPARecord).order_by(desc(CAPARecord.created_at))
    if status and status != "ALL":
        query = query.where(CAPARecord.status == status)
    if verification_status and verification_status != "ALL":
        query = query.where(CAPARecord.verification_status == verification_status)
    if nc_id:
        query = query.where(CAPARecord.nc_id == nc_id)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.where(
            or_(
                CAPARecord.capa_number.ilike(term),
                CAPARecord.title.ilike(term),
                CAPARecord.corrective_action.ilike(term),
                CAPARecord.assigned_to_name.ilike(term),
            )
        )
    capas = db.scalars(query).all()
    return [format_capa_out(c) for c in capas]


@router.post("/records", response_model=CAPARecordResponse, status_code=status.HTTP_201_CREATED)
def create_capa_record(payload: CAPARecordCreate, db: Session = Depends(get_db)):
    # Verify NC exists
    nc = db.get(NonConformance, payload.nc_id)
    if not nc:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự cố NC liên kết")

    existing = db.scalar(select(CAPARecord).where(CAPARecord.capa_number == payload.capa_number.strip()))
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã phiếu CAPA '{payload.capa_number}' đã tồn tại")

    new_capa = CAPARecord(
        capa_number=payload.capa_number.strip(),
        nc_id=payload.nc_id,
        title=payload.title.strip(),
        root_cause_method=payload.root_cause_method,
        root_cause_analysis=payload.root_cause_analysis,
        root_cause_summary=payload.root_cause_summary,
        corrective_action=payload.corrective_action.strip(),
        preventive_action=payload.preventive_action.strip() if payload.preventive_action else None,
        assigned_to=payload.assigned_to,
        assigned_to_name=payload.assigned_to_name,
        assigned_dept=payload.assigned_dept,
        target_date=payload.target_date,
        completed_date=payload.completed_date,
        verification_status=payload.verification_status,
        status=payload.status,
        evidence_urls=payload.evidence_urls or [],
    )
    db.add(new_capa)

    # Cập nhật trạng thái NC sang ACTION_REQUIRED nếu đang là NEW
    if nc.status == "NEW":
        nc.status = "ACTION_REQUIRED"

    db.commit()
    db.refresh(new_capa)
    return format_capa_out(new_capa)


@router.get("/records/{capa_id}", response_model=CAPARecordResponse)
def get_capa_record_by_id(capa_id: UUID, db: Session = Depends(get_db)):
    c = db.get(CAPARecord, capa_id)
    if not c:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ CAPA")
    return format_capa_out(c)


@router.put("/records/{capa_id}", response_model=CAPARecordResponse)
def update_capa_record(capa_id: UUID, payload: CAPARecordUpdate, db: Session = Depends(get_db)):
    c = db.get(CAPARecord, capa_id)
    if not c:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ CAPA")

    if payload.title is not None:
        c.title = payload.title.strip()
    if payload.root_cause_method is not None:
        c.root_cause_method = payload.root_cause_method
    if payload.root_cause_analysis is not None:
        c.root_cause_analysis = payload.root_cause_analysis
    if payload.root_cause_summary is not None:
        c.root_cause_summary = payload.root_cause_summary
    if payload.corrective_action is not None:
        c.corrective_action = payload.corrective_action.strip()
    if payload.preventive_action is not None:
        c.preventive_action = payload.preventive_action.strip()
    if payload.assigned_to_name is not None:
        c.assigned_to_name = payload.assigned_to_name.strip()
    if payload.assigned_dept is not None:
        c.assigned_dept = payload.assigned_dept.strip()
    if payload.target_date is not None:
        c.target_date = payload.target_date
    if payload.completed_date is not None:
        c.completed_date = payload.completed_date
    if payload.status is not None:
        c.status = payload.status
    if payload.evidence_urls is not None:
        c.evidence_urls = payload.evidence_urls

    db.commit()
    db.refresh(c)
    return format_capa_out(c)


@router.post("/records/{capa_id}/verify", response_model=CAPARecordResponse)
def verify_capa_record(capa_id: UUID, payload: CAPAVerifyRequest, db: Session = Depends(get_db)):
    c = db.get(CAPARecord, capa_id)
    if not c:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ CAPA")

    today = date.today()
    c.verified_by_name = payload.verified_by_name
    c.verification_date = today
    c.verification_result = payload.verification_result.strip()
    c.verification_status = payload.verification_status

    if payload.verification_status == "EFFECTIVE":
        c.status = "COMPLETED"
        if not c.completed_date:
            c.completed_date = today
        # Đóng luôn NC liên quan nếu tất cả CAPA của NC đó đã hoàn thành
        nc = c.non_conformance
        if nc:
            other_open = db.scalar(
                select(func.count(CAPARecord.capa_id)).where(
                    and_(
                        CAPARecord.nc_id == nc.nc_id,
                        CAPARecord.capa_id != c.capa_id,
                        CAPARecord.status != "COMPLETED",
                    )
                )
            )
            if not other_open or other_open == 0:
                nc.status = "CLOSED"
    else:
        c.status = "IN_PROGRESS"  # Tái mở yêu cầu xử lý lại

    db.commit()
    db.refresh(c)
    return format_capa_out(c)


@router.delete("/records/{capa_id}", status_code=status.HTTP_200_OK)
def delete_capa_record(capa_id: UUID, db: Session = Depends(get_db)):
    c = db.get(CAPARecord, capa_id)
    if not c:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ CAPA")
    db.delete(c)
    db.commit()
    return {"message": "Đã xóa hồ sơ CAPA thành công", "capa_id": str(capa_id)}


# ==================== 4. AI ASSISTANTS ====================
@router.post("/ai/analyze-5why", response_model=AI5WhyResponse)
def ai_analyze_5why(req: AI5WhyRequest):
    """
    AI Phân tích 5-Whys tự động truy vết nguyên nhân gốc rễ theo chuẩn ISO 22000:2018.
    """
    title = req.nc_title.lower()
    desc = req.description.lower()

    if "nhiệt độ" in title or "thanh trùng" in title or "ccp1" in title or "kho lạnh" in title:
        whys = [
            {"level": 1, "question": "Tại sao nhiệt độ thanh trùng bị giảm xuống dưới 85°C?", "answer": "Do áp lực hơi nóng cung cấp cho buồng nhiệt bị sụt giảm trong 12 phút."},
            {"level": 2, "question": "Tại sao áp lực hơi nóng bị sụt giảm?", "answer": "Do van điều áp khí hơi tự động (Pneumatic Valve) phản hồi trễ và bị kẹt hành trình."},
            {"level": 3, "question": "Tại sao van điều áp bị kẹt hành trình?", "answer": "Do lớp cặn khoáng vôi hóa bám dày ở màng đệm cao su và ti van chưa được tẩy rửa."},
            {"level": 4, "question": "Tại sao van chưa được tẩy rửa định kỳ?", "answer": "Kế hoạch bảo trì phòng ngừa (PM) thiết bị cấp nhiệt bị hoãn 2 tuần do thiếu phụ tùng thay thế."},
            {"level": 5, "question": "Tại sao thiếu phụ tùng thay thế và kế hoạch bị hoãn mà không có biện pháp bù đắp?", "answer": "Chưa có quy định về danh mục phụ tùng tới hạn (Critical Spare Parts) cho điểm CCP và cơ chế cảnh báo vượt chu kỳ bảo trì."}
        ]
        root_cause = "Thiếu cơ chế quản lý phụ tùng dự phòng tới hạn cho điểm CCP và kiểm soát nghiêm ngặt lịch bảo dưỡng định kỳ van điều áp hơi."
        corr = "Tháo rã vệ sinh tẩy cặn, thay mới màng đệm van điều áp ngay; chạy test nhiệt độ không tải 30 phút đạt 88°C trước khi tái vận hành."
        prev = "Bổ sung van điều áp vào danh mục phụ tùng thiết yếu (Stock min 2 bộ); cài đặt cảnh báo khóa chuyền tự động trên SCADA khi bảo trì trễ quá 48h."
    elif "kim loại" in title or "dò kim loại" in title or "dị vật" in title:
        whys = [
            {"level": 1, "question": "Tại sao phát hiện mảnh kim loại Fe 2.0mm trong sản phẩm?", "answer": "Do có mảnh vụn kim loại rơi vào phễu phối trộn trước khi định hình."},
            {"level": 2, "question": "Tại sao mảnh vụn kim loại rơi vào phễu?", "answer": "Lưới lọc inox 304 tại cửa xả máy xay nghiền thịt bị nứt gãy một góc nhỏ."},
            {"level": 3, "question": "Tại sao lưới lọc inox bị nứt gãy?", "answer": "Do hiện tượng mỏi kim loại sau hơn 1.800 giờ vận hành liên tục dưới tải trọng lớn."},
            {"level": 4, "question": "Tại sao không phát hiện lưới lọc bị nứt sớm hơn?", "answer": "Quy trình kiểm tra lưới lọc đầu ca chỉ quan sát bằng mắt thường mà không tháo rời rà soát chi tiết."},
            {"level": 5, "question": "Tại sao quy trình kiểm tra đầu ca chưa chặt chẽ?", "answer": "Biểu mẫu checklist PRP-GMP chưa có mục tháo rời kiểm tra độ nguyên vẹn của toàn bộ lưới rây và bẫy nam châm."}
        ]
        root_cause = "Quy trình kiểm tra lưới rây trước ca thiếu bước kiểm tra cơ học định kỳ và máy xay chưa được trang bị bẫy nam châm bảo vệ đa tầng."
        corr = "Thay mới toàn bộ cụm lưới lọc Inox 316L dày 2.5mm; quét máy dò kim loại toàn bộ lô hàng nghi ngờ 1.500 kg để cô lập 100% sản phẩm lỗi."
        prev = "Lắp đặt thêm bẫy nam châm từ tính 12.000 Gauss tại đầu vào phễu; bổ sung quy định kiểm tra chụp ảnh lưới rây 2 lần/ngày vào checklist GMP."
    elif "vệ sinh" in title or "công nhân" in title or "bảo hộ" in title or "prp" in title:
        whys = [
            {"level": 1, "question": "Tại sao công nhân không mang bảo hộ đúng quy chuẩn trong xưởng?", "answer": "Công nhân mới chưa trang bị khẩu trang đạt chuẩn và còn đeo nhẫn kim loại khi sơ chế."},
            {"level": 2, "question": "Tại sao công nhân mới vào xưởng khi chưa đủ bảo hộ?", "answer": "Tổ trưởng sản xuất cho phép vào chuyền gấp do thiếu hụt nhân lực ca sáng."},
            {"level": 3, "question": "Tại sao tổ trưởng cho phép vào chuyền khi chưa đủ điều kiện?", "answer": "Chưa có trạm kiểm soát an toàn vệ sinh (Hygiene Gate) bắt buộc trước cửa xưởng."},
            {"level": 4, "question": "Tại sao công nhân chưa nắm rõ quy định cấm đeo trang sức?", "answer": "Buổi đào tạo nhập môn ATTP ISO 22000 bị rút ngắn từ 4 tiếng xuống 30 phút."},
            {"level": 5, "question": "Tại sao quy trình đào tạo bị rút ngắn mà vẫn được duyệt vào làm?", "answer": "Hệ thống quản lý nhân sự thiếu cổng kiểm soát đánh giá sát hạch năng lực trước khi cấp thẻ vào xưởng."}
        ]
        root_cause = "Thiếu cổng kiểm soát vệ sinh bắt buộc (Hygiene Barrier) và quy trình sát hạch năng lực ATTP trước ca cho lao động thời vụ."
        corr = "Yêu cầu công nhân lập tức rời xưởng, tháo bỏ toàn bộ trang sức, thay bảo hộ chuẩn và sát trùng tay lại 100%."
        prev = "Thiết lập quy định 'No Pass, No Entry': Chỉ nhân viên có chứng nhận đạt kiểm tra ATTP mới được kích hoạt thẻ từ mở cửa xưởng sản xuất."
    else:
        whys = [
            {"level": 1, "question": f"Tại sao phát sinh sự cố '{req.nc_title}'?", "answer": f"Do điều kiện vận hành tại hiện trường không đáp ứng đúng thông số quy định: {req.description[:100]}..."},
            {"level": 2, "question": "Tại sao thông số vận hành không được kiểm soát đúng?", "answer": "Cán bộ phụ trách không thực hiện đo đạc đối chiếu với giới hạn chuẩn định kỳ theo ca."},
            {"level": 3, "question": "Tại sao việc đo đạc đối chiếu không được thực hiện?", "answer": "Thiếu biểu mẫu giám sát chuẩn hóa và thiết bị đo bị lệch thang chuẩn chưa hiệu chuẩn lại."},
            {"level": 4, "question": "Tại sao thiết bị đo bị lệch mà không được phát hiện?", "answer": "Chưa có lịch kiểm định hiệu chuẩn định kỳ tại phòng thí nghiệm được công nhận VILAS."},
            {"level": 5, "question": "Tại sao hệ thống quản lý đo lường chưa được chuẩn hóa?", "answer": "Chưa hoàn thiện ma trận phân tích rủi ro thiết bị và thiếu quy trình kiểm soát thông tin dạng văn bản theo ISO 7.1.5 & 7.5."}
        ]
        root_cause = "Quy trình kiểm soát thông số vận hành chưa đồng bộ với kế hoạch hiệu chuẩn thiết bị đo và thiếu cơ chế cảnh báo sai lệch tự động."
        corr = "Tiến hành rà soát, đo kiểm tra lại toàn bộ thông số thực tế; hiệu chuẩn lại phương tiện đo lường và cô lập sản phẩm nghi ngờ."
        prev = "Ban hành hướng dẫn công việc (WI) chi tiết hóa từng bước kiểm tra và áp dụng nhật ký số hóa cảnh báo sai lệch realtime."

    return AI5WhyResponse(
        problem_statement=f"Sự không phù hợp: {req.nc_title}",
        whys=whys,
        root_cause_conclusion=root_cause,
        suggested_corrective_action=corr,
        suggested_preventive_action=prev,
    )


@router.post("/ai/analyze-fishbone", response_model=AIFishboneResponse)
def ai_analyze_fishbone(req: AIFishboneRequest):
    """
    AI Phân tích Sơ đồ Xương cá Ishikawa 5M+1E đa chiều.
    """
    title = req.nc_title.lower()
    
    return AIFishboneResponse(
        problem_statement=req.nc_title,
        man=[
            "Ý thức tuân thủ quy trình của công nhân ca mới chưa cao",
            "Thiếu đào tạo chuyên sâu về nhận diện rủi ro ATTP",
            "KCS ca trực chưa thực hiện giám sát tần suất 30 phút/lần"
        ],
        machine=[
            "Cảm biến nhiệt độ / áp suất có dấu hiệu trôi dạt thông số",
            "Hao mòn cơ khí tự nhiên sau chu kỳ vận hành cường độ cao",
            "Van điều khiển tự động phản hồi trễ do thiếu bôi trơn dầu mỡ NSF H1"
        ],
        material=[
            "Nguyên liệu đầu vào có sự biến thiên về kích thước và độ ẩm",
            "Bao bì tiếp xúc trực tiếp có độ dày không đồng đều",
            "Chứng chỉ COA nhà cung cấp chưa được thẩm định độc lập"
        ],
        method=[
            "Hướng dẫn công việc (SOP/WI) chưa chi tiết hóa thao tác cô lập",
            "Chưa quy định rõ ngưỡng hành động (Action Limits) trước khi chạm tới hạn (CL)",
            "Kế hoạch phân công kiểm tra chéo giữa các tổ chưa rõ ràng"
        ],
        measurement=[
            "Dụng cụ đo chưa được dán tem hiệu chuẩn QUATEST/VILAS còn hạn",
            "Phương pháp lấy mẫu chưa đại diện cho toàn bộ mẻ sản xuất",
            "Chưa có thiết bị ghi nhận dữ liệu tự động (Datalogger)"
        ],
        environment=[
            "Độ ẩm không khí trong xưởng cao vào mùa mưa gây đọng sương",
            "Nhiệt độ phòng sơ chế chưa duy trì liên tục dưới 18°C",
            "Ánh sáng tại khu vực kiểm tra cảm quan chưa đạt 540 Lux"
        ],
        primary_root_cause="Sự kết hợp giữa thiết bị điều khiển bị trôi dạt thông số và quy trình giám sát phòng ngừa chưa thiết lập ngưỡng cảnh báo sớm.",
        suggested_capa="1. Hiệu chuẩn và bảo trì toàn diện thiết bị liên quan. 2. Cập nhật SOP bổ sung ngưỡng Action Limit. 3. Tái đào tạo 100% nhân sự vận hành chuyền."
    )


@router.post("/ai/suggest-actions", response_model=AISuggestActionsResponse)
def ai_suggest_actions(req: AISuggestActionsRequest):
    """
    AI Đề xuất Hành động Khắc phục & Phòng ngừa theo tiêu chuẩn ISO 22000:2018.
    """
    return AISuggestActionsResponse(
        immediate_containment=[
            "Lập tức dừng công đoạn và dán thẻ đỏ CÁCH LY / BIỆT TRỮ cho toàn bộ sản phẩm phát sinh trong ca.",
            "Lấy mẫu ngẫu nhiên đại diện gửi phòng KCS để test lại chỉ tiêu vi sinh và hóa lý khẩn cấp.",
            "Ghi nhận nhật ký sự cố vào sổ giao ban và báo cáo Đội trưởng Đội An toàn Thực phẩm."
        ],
        corrective_actions=[
            f"Xử lý dứt điểm nguyên nhân cốt lõi: {req.root_cause}",
            "Tiến hành sửa chữa, hiệu chuẩn và kiểm tra chạy thử thiết bị/công đoạn đạt thông số chuẩn.",
            "Thẩm định lại chất lượng lô hàng bị cách ly: chỉ giải phóng khi có văn bản phê duyệt của Trưởng ban QLCL."
        ],
        preventive_actions=[
            "Cập nhật lại Bảng Phân Tích Mối Nguy HACCP và Kế hoạch Kiểm Soát OPRP/CCP tương ứng.",
            "Rà soát sửa đổi Quy trình thao tác chuẩn (SOP) và hướng dẫn công việc (WI).",
            "Tổ chức khóa đào tạo lại (Refresher Training) cho toàn thể công nhân và kỹ thuật viên liên quan."
        ],
        verification_method_30days="Đoàn Đánh giá Nội bộ tiến hành thẩm tra ngẫu nhiên 3 lần trong vòng 30 ngày: kiểm tra nhật ký đo đạc, phỏng vấn nhân viên vận hành và đối chiếu kết quả kiểm nghiệm vi sinh không có sự cố tái diễn.",
        iso_standard_clauses=[
            "ISO 22000:2018 Điều khoản 8.9.2 (Hành động khắc phục tức thì - Corrections)",
            "ISO 22000:2018 Điều khoản 8.9.3 (Hành động khắc phục nguyên nhân - Corrective actions)",
            "ISO 22000:2018 Điều khoản 8.9.4 (Xử lý sản phẩm tiềm ẩn không an toàn)",
            "ISO 22000:2018 Điều khoản 10.1 (Sự không phù hợp và hành động khắc phục)"
        ]
    )


# ==================== 5. SEED DEFAULTS ====================
@router.post("/seed-defaults", status_code=status.HTTP_201_CREATED)
def seed_capa_defaults(db: Session = Depends(get_db)):
    """
    Tự động nạp 5 kịch bản sự cố NC & CAPA mẫu thực tế chuẩn nhà máy thủy sản/thực phẩm.
    """
    existing_count = db.scalar(select(func.count(NonConformance.nc_id)))
    if existing_count and existing_count > 0:
        return {"message": f"Hệ thống đã có sẵn {existing_count} bản ghi sự cố NC", "seeded": 0}

    sample_ncs = [
        {
            "nc_number": "NC-2026-001",
            "title": "Nhiệt độ nồi thanh trùng Retort CCP1 giảm xuống 82.5°C (CL ≥ 85.0°C)",
            "source": "HACCP_CCP",
            "severity": "CRITICAL",
            "occurred_date": date(2026, 6, 15),
            "occurred_location": "Xưởng Chế Biến 1 - Nồi Tiệt Trùng Retort 01",
            "description": "Trong quá trình thanh trùng mẻ sốt chả cá LOT-20260615-88, nhiệt độ kế SCADA ghi nhận nhiệt độ tụt xuống 82.5°C trong khoảng thời gian 8 phút do áp lực hơi cấp bị sụt.",
            "immediate_action": "1. Lập tức bấm nút dừng xuất xưởng mẻ sốt. 2. Dán nhãn CÁCH LY - BIỆT TRỮ 1.200 hũ sốt tại ô kho lạnh K2. 3. Kỹ thuật viên chuyển nồi hấp sang chế độ gia nhiệt lại.",
            "affected_lot_number": "LOT-20260615-88",
            "affected_quantity": "1,200 hũ (600 kg)",
            "reported_by_name": "Trần Văn An (QC Lead)",
            "status": "ACTION_REQUIRED",
            "capa": {
                "capa_number": "CAPA-2026-001",
                "title": "Khắc phục triệt để sự cố van điều áp hơi và kiểm soát nhiệt độ nồi Retort CCP1",
                "root_cause_method": "5_WHYS",
                "root_cause_analysis": {
                    "whys": [
                        {"level": 1, "question": "Tại sao nhiệt độ giảm dưới 85°C?", "answer": "Áp lực hơi cấp buồng nhiệt bị giảm trong 8 phút."},
                        {"level": 2, "question": "Tại sao áp lực hơi bị giảm?", "answer": "Van điều áp hơi tự động bị kẹt hành trình mở chỉ được 40%."},
                        {"level": 3, "question": "Tại sao van bị kẹt hành trình?", "answer": "Cặn vôi khoáng bám dày ở màng đệm cao su ti van."},
                        {"level": 4, "question": "Tại sao không được tẩy cặn định kỳ?", "answer": "Lịch bảo trì định kỳ PM bị hoãn do thiếu màng đệm cao su dự phòng."},
                        {"level": 5, "question": "Tại sao thiếu phụ tùng dự phòng?", "answer": "Chưa có quy định tồn kho tối thiểu cho linh kiện điểm CCP."}
                    ]
                },
                "root_cause_summary": "Thiếu cơ chế quản lý phụ tùng dự phòng thiết yếu cho điểm kiểm soát tới hạn CCP1 và van điều áp hơi bị hoãn bảo trì.",
                "corrective_action": "Tháo rã tẩy cặn và thay mới màng van điều áp hơi; gia nhiệt thanh trùng lại mẻ hàng LOT-20260615-88 ở 88°C trong 20 phút và test kiểm nghiệm vi sinh đạt chuẩn.",
                "preventive_action": "Bổ sung van điều áp vào danh mục linh kiện an toàn bắt buộc (Stock min 2 bộ); cài đặt cảnh báo khóa chuyền trên SCADA khi bảo trì trễ quá 48h.",
                "assigned_to_name": "Nguyễn Văn Hùng (Trưởng phòng Cơ Điện)",
                "assigned_dept": "Phòng Cơ điện & Thiết bị",
                "target_date": date(2026, 6, 25),
                "completed_date": date(2026, 6, 22),
                "verified_by_name": "Phạm Quốc Bảo (Trưởng Ban QLCL)",
                "verification_date": date(2026, 7, 22),
                "verification_result": "Đã thẩm tra sau 30 ngày: Nồi Retort 01 vận hành ổn định 100% mẻ đạt nhiệt độ 86.5°C - 88.0°C; phụ tùng dự phòng đã được nhập kho đủ 2 bộ.",
                "verification_status": "EFFECTIVE",
                "status": "COMPLETED",
                "evidence_urls": ["https://iso22000.wcert.vn/capa/evidence-retort-valve.jpg"]
            }
        },
        {
            "nc_number": "NC-2026-002",
            "title": "Máy dò kim loại CCP2 phát hiện mạt kim loại Fe 2.0mm trong mẻ chả cá đóng gói",
            "source": "HACCP_CCP",
            "severity": "CRITICAL",
            "occurred_date": date(2026, 6, 18),
            "occurred_location": "Xưởng Đóng Gói Thành Phẩm - Băng Chuyền Dò Kim Loại 02",
            "description": "Cần gạt tự động máy dò kim loại kích hoạt loại bỏ 3 gói chả cá chiên. KCS kiểm tra bằng que test xác định có mạt kim loại Fe 2.0mm bên trong khối chả.",
            "immediate_action": "1. Dừng ngay máy định hình chả cá. 2. Biệt trữ toàn bộ 800 kg chả cá sản xuất trong khoảng 09:00 - 10:30. 3. Kiểm tra rà soát toàn bộ cụm dao cắt và cối xay.",
            "affected_lot_number": "LOT-20260618-42",
            "affected_quantity": "800 kg (1,600 gói)",
            "reported_by_name": "Lê Thị Mai (KCS Đóng gói)",
            "status": "ACTION_REQUIRED",
            "capa": {
                "capa_number": "CAPA-2026-002",
                "title": "Thay mới lưới lọc máy xay Inox 316L và lắp đặt bẫy nam châm từ tính 12000 Gauss",
                "root_cause_method": "FISHBONE_5M",
                "root_cause_analysis": {
                    "man": ["Công nhân vệ sinh không kiểm tra độ mòn dao xay đầu ca"],
                    "machine": ["Lưới rây máy xay thịt bị nứt gãy 1 góc do mỏi kim loại sau 1.800h chạy"],
                    "material": ["Thịt cá basa đông lạnh có lẫn dăm xương cứng làm tăng tải ma sát"],
                    "method": ["Checklist GMP trước ca chỉ nhìn bằng mắt mà không tháo rời rây lọc"],
                    "measurement": ["Máy dò kim loại phát hiện chính xác mẫu Fe 2.0mm"],
                    "environment": ["Độ rung bàn máy cao làm lỏng bulong giữ cụm dao"]
                },
                "root_cause_summary": "Lưới rây máy xay bị nứt gãy do mỏi kim loại và chưa có bẫy nam châm chặn dăm kim loại trước khi vào cối xay.",
                "corrective_action": "Thay cụm lưới rây mới Inox 316L dày 3mm; chạy quét lại toàn bộ 800 kg chả cá qua máy dò kim loại nhạy 1.0mm loại bỏ triệt để 5 gói lỗi còn lại.",
                "preventive_action": "Lắp đặt bổ sung bẫy nam châm vĩnh cửu 12.000 Gauss tại phễu nạp cá; quy định tháo rời kiểm tra lưới rây bằng kính lúp 2 lần/ngày.",
                "assigned_to_name": "Vũ Đình Trọng (Quản đốc Phân xưởng)",
                "assigned_dept": "Phòng Sản xuất",
                "target_date": date(2026, 6, 28),
                "completed_date": date(2026, 6, 26),
                "verified_by_name": "Phạm Quốc Bảo (Trưởng Ban QLCL)",
                "verification_date": date(2026, 7, 26),
                "verification_result": "Đã nghiệm thu bẫy nam châm hoạt động tốt; 100% mẻ sản xuất trong 30 ngày qua không ghi nhận bất kỳ mẫu dị vật kim loại nào.",
                "verification_status": "EFFECTIVE",
                "status": "COMPLETED",
                "evidence_urls": ["https://iso22000.wcert.vn/capa/evidence-magnet-trap.jpg"]
            }
        },
        {
            "nc_number": "NC-2026-003",
            "title": "Công nhân thời vụ không đội mũ trùm tóc và đeo trang sức trong khu vực phi lê",
            "source": "PRP_GMP",
            "severity": "MAJOR",
            "occurred_date": date(2026, 6, 20),
            "occurred_location": "Xưởng Sơ Chế Phi Lê Basa - Bàn Chế Biến Số 3",
            "description": "Trong đợt kiểm tra vệ sinh đột xuất PRP-GMP, giám sát viên phát hiện 4 công nhân mới mang hoa tai kim loại và tóc bị lộ ra ngoài mũ bảo hộ.",
            "immediate_action": "Yêu cầu 4 công nhân lập tức rời khỏi bàn sơ chế, tháo toàn bộ trang sức gửi tủ đồ cá nhân, thay mũ trùm kín tóc và sát khuẩn tay lại.",
            "affected_lot_number": "LOT-20260620-11",
            "affected_quantity": "350 kg cá phi lê",
            "reported_by_name": "Đặng Thị Thảo (Giám sát PRP)",
            "status": "ACTION_REQUIRED",
            "capa": {
                "capa_number": "CAPA-2026-003",
                "title": "Tái đào tạo quy chuẩn vệ sinh cá nhân GMP và siết chặt kiểm soát cửa vào xưởng",
                "root_cause_method": "5_WHYS",
                "root_cause_analysis": {
                    "whys": [
                        {"level": 1, "question": "Tại sao công nhân vi phạm mang trang sức?", "answer": "Công nhân mới chưa nắm được quy định cấm tuyệt đối trang sức."},
                        {"level": 2, "question": "Tại sao công nhân chưa nắm quy định?", "answer": "Thời lượng khóa đào tạo nhập môn ATTP bị rút ngắn do cần tuyển gấp."},
                        {"level": 3, "question": "Tại sao vào được xưởng khi vi phạm?", "answer": "Bảo vệ cửa xưởng chỉ kiểm tra thẻ từ mà không rà soát bảo hộ."},
                        {"level": 4, "question": "Tại sao tổ trưởng không phát hiện?", "answer": "Tổ trưởng bận phân chia chỉ tiêu cá đầu ca nên bỏ qua bước điểm danh vệ sinh."},
                        {"level": 5, "question": "Tại sao thiếu quy trình kiểm soát đầu ca?", "answer": "Chưa áp dụng bảng kiểm tra vệ sinh 1 phút trước ca (One-minute Hygiene Check)."}
                    ]
                },
                "root_cause_summary": "Quy trình kiểm soát vệ sinh cá nhân trước ca chưa nghiêm ngặt và công nhân thời vụ chưa được sát hạch đầy đủ kiến thức GMP.",
                "corrective_action": "Tổ chức khóa đào tạo lại 4 tiếng về quy chuẩn GMP cho 100% lao động thời vụ; kiểm tra cảm quan lô cá 350 kg không phát hiện dị vật sợi tóc.",
                "preventive_action": "Thiết lập trạm kiểm soát vệ sinh bắt buộc (Hygiene Barrier) trước cửa xưởng với gương soi toàn thân và bảng hình ảnh 'Chuẩn - Sai' trực quan.",
                "assigned_to_name": "Trần Thị Bích (Trưởng phòng Hành chính Nhân sự)",
                "assigned_dept": "Phòng HCNS & Đào tạo",
                "target_date": date(2026, 6, 30),
                "completed_date": date(2026, 6, 28),
                "verified_by_name": "Trần Văn An (QC Lead)",
                "verification_date": None,
                "verification_result": None,
                "verification_status": "PENDING_VERIFY",
                "status": "PENDING_VERIFICATION",
                "evidence_urls": ["https://iso22000.wcert.vn/capa/evidence-hygiene-mirror.jpg"]
            }
        },
        {
            "nc_number": "NC-2026-004",
            "title": "Nhà cung cấp Bao bì Phú Mỹ giao lô túi PA/PE có tỷ lệ xì mối hàn 4.5% (Tiêu chuẩn ≤ 0.5%)",
            "source": "IQC_INCOMING",
            "severity": "MAJOR",
            "occurred_date": date(2026, 6, 22),
            "occurred_location": "Kho Nguyên Phụ Liệu - Bàn Kiểm Tra IQC",
            "description": "Kiểm tra nghiệm thu IQC lô 50.000 túi hút chân không LOT-BB-20260622 phát hiện 225/5.000 túi mẫu bị hở mép dán nhiệt khi test áp lực ngâm nước.",
            "immediate_action": "Lập biên bản từ chối nhận hàng IQC, dán thẻ đỏ CÁCH LY BIỆT TRỮ toàn bộ 50.000 túi và gửi công văn cảnh báo NCC.",
            "affected_lot_number": "LOT-BB-20260622",
            "affected_quantity": "50,000 túi (25 thùng)",
            "reported_by_name": "Hoàng Văn Em (QC IQC)",
            "status": "ACTION_REQUIRED",
            "capa": {
                "capa_number": "CAPA-2026-004",
                "title": "Yêu cầu Nhà cung cấp Phú Mỹ thu hồi lô túi lỗi và nâng cấp máy hàn mép nhiệt",
                "root_cause_method": "5_WHYS",
                "root_cause_analysis": {
                    "whys": [
                        {"level": 1, "question": "Tại sao túi bao bì bị hở mép dán?", "answer": "Mối hàn nhiệt của nhà cung cấp không đạt lực kết dính."},
                        {"level": 2, "question": "Tại sao mối hàn không đạt lực?", "answer": "Nhiệt độ thanh hàn của máy làm túi NCC bị dao động ±15°C."},
                        {"level": 3, "question": "Tại sao nhiệt độ thanh hàn dao động?", "answer": "Thanh gia nhiệt điện trở của NCC bị nứt làm giảm công suất."},
                        {"level": 4, "question": "Tại sao NCC không phát hiện trước khi giao?", "answer": "KCS của NCC bỏ qua bước test áp suất chân không định kỳ."},
                        {"level": 5, "question": "Tại sao hệ thống chất lượng NCC bị buông lỏng?", "answer": "NCC chưa duy trì nghiêm ngặt chứng chỉ ISO 9001/ISO 22000 định kỳ."}
                    ]
                },
                "root_cause_summary": "Thiết bị ép nhiệt của nhà cung cấp bị hỏng thanh gia nhiệt và quy trình kiểm tra xuất xưởng của đối tác không đạt yêu cầu.",
                "corrective_action": "Trả lại toàn bộ 50.000 túi bao bì lỗi cho nhà cung cấp; yêu cầu NCC cấp bù lô mới đạt 100% test chân không trong 48h.",
                "preventive_action": "Hạ bậc xếp hạng NCC Phú Mỹ xuống Hạng B (Giám sát chặt); đoàn đánh giá ISO công ty sẽ thực địa nhà máy NCC trước khi duyệt đơn hàng mới.",
                "assigned_to_name": "Nguyễn Thị Hương (Trưởng phòng Mua hàng)",
                "assigned_dept": "Phòng Mua hàng",
                "target_date": date(2026, 7, 5),
                "completed_date": date(2026, 7, 2),
                "verified_by_name": "Hoàng Văn Em (QC IQC)",
                "verification_date": None,
                "verification_result": None,
                "verification_status": "PENDING_VERIFY",
                "status": "IN_PROGRESS",
                "evidence_urls": []
            }
        },
        {
            "nc_number": "NC-2026-005",
            "title": "Ghi chép nhật ký giám sát kho lạnh bảo quản bị tẩy xóa số liệu nhiệt độ",
            "source": "INTERNAL_AUDIT",
            "severity": "MINOR",
            "occurred_date": date(2026, 6, 24),
            "occurred_location": "Văn Phòng Thủ Kho - Kho Đông Lạnh Âm Sâu -25°C",
            "description": "Đánh giá nội bộ kỳ 1 phát hiện sổ theo dõi nhiệt độ kho ngày 10-12/06 có 3 vị trí bị gạch đè số liệu nhiệt độ mà không có chữ ký nháy xác nhận.",
            "immediate_action": "Đối soát lại với dữ liệu trích xuất từ Datalogger tự động điện tử để xác nhận nhiệt độ thực tế của kho luôn duy trì -22.4°C đến -24.8°C (Đạt yêu cầu).",
            "affected_lot_number": "N/A",
            "affected_quantity": "Hồ sơ lưu trữ sổ sách",
            "reported_by_name": "Lê Văn Cường (Chuyên viên Đánh giá Nội bộ)",
            "status": "CLOSED",
            "capa": {
                "capa_number": "CAPA-2026-005",
                "title": "Chuyển đổi số hóa nhật ký kho lạnh sang Datalogger tự động và tái đào tạo SOP ghi chép",
                "root_cause_method": "5_WHYS",
                "root_cause_analysis": {
                    "whys": [
                        {"level": 1, "question": "Tại sao thủ kho ghi chép bị tẩy xóa?", "answer": "Thủ kho viết nhầm số đo của ca trước rồi đè số mới lên."},
                        {"level": 2, "question": "Tại sao không gạch ngang ký nháy theo quy định?", "answer": "Thủ kho chưa nắm vững quy tắc kiểm soát hồ sơ theo Điều khoản 7.5."},
                        {"level": 3, "question": "Tại sao vẫn dùng sổ tay giấy thủ công?", "answer": "Chưa kết nối dữ liệu Datalogger trực tiếp lên phần mềm hệ thống."},
                        {"level": 4, "question": "Tại sao chưa kết nối hệ thống?", "answer": "Phần mềm kho trước đây chưa có tính năng lưu biểu mẫu điện tử."},
                        {"level": 5, "question": "Tại sao chưa nâng cấp phần mềm?", "answer": "Đang trong lộ trình chuyển đổi số toàn diện theo Phase 6 & 7."}
                    ]
                },
                "root_cause_summary": "Thủ kho thao tác ghi chép thủ công sai quy chuẩn ISO 7.5 và hệ thống chưa đồng bộ tự động dữ liệu cảm biến kho lạnh.",
                "corrective_action": "Đối chiếu và in biểu đồ nhiệt độ điện tử đính kèm sổ sách; thủ kho ký cam kết thực hiện đúng quy chuẩn ghi chép hồ sơ.",
                "preventive_action": "Chính thức áp dụng biểu mẫu số hóa tự động đồng bộ từ cảm biến nhiệt độ Datalogger SCADA lên hệ thống phần mềm ISO 22000 AI.",
                "assigned_to_name": "Đặng Văn Lâm (Thủ kho trưởng)",
                "assigned_dept": "Phòng Kho vận & Logistics",
                "target_date": date(2026, 6, 27),
                "completed_date": date(2026, 6, 26),
                "verified_by_name": "Lê Văn Cường (Đánh giá viên ISO)",
                "verification_date": date(2026, 7, 26),
                "verification_result": "Đã kiểm tra hồ sơ số hóa tháng 7: 100% dữ liệu nhiệt độ được ghi nhận tự động, không còn phát sinh sổ ghi tay tẩy xóa.",
                "verification_status": "EFFECTIVE",
                "status": "COMPLETED",
                "evidence_urls": []
            }
        }
    ]

    seeded_nc = 0
    seeded_capa = 0
    for item in sample_ncs:
        capa_data = item.pop("capa")
        nc_obj = NonConformance(**item)
        db.add(nc_obj)
        db.flush()
        seeded_nc += 1

        if capa_data:
            capa_obj = CAPARecord(nc_id=nc_obj.nc_id, **capa_data)
            db.add(capa_obj)
            seeded_capa += 1

    db.commit()
    return {
        "message": f"Đã nạp thành công {seeded_nc} Sự cố Không Phù Hợp (NC) và {seeded_capa} Kế hoạch CAPA mẫu thực tế!",
        "seeded_ncs": seeded_nc,
        "seeded_capas": seeded_capa
    }
