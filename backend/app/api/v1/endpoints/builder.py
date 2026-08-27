import uuid
from typing import List, Optional, Any, Dict
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func, and_, or_

from app.core.database import get_db
from app.models.builder import (
    DynamicFormTemplate,
    DynamicFormSubmission,
    DynamicWorkflowTemplate,
    WorkflowInstance,
)
from app.models.user import User
from app.schemas.builder import (
    DynamicFormTemplateCreate,
    DynamicFormTemplateUpdate,
    DynamicFormTemplateResponse,
    DynamicFormSubmissionCreate,
    DynamicFormSubmissionResponse,
    DynamicWorkflowTemplateCreate,
    DynamicWorkflowTemplateUpdate,
    DynamicWorkflowTemplateResponse,
    WorkflowInstanceCreate,
    WorkflowInstanceAction,
    WorkflowInstanceResponse,
)

router = APIRouter(prefix="/builders", tags=["Dynamic Form & Workflow Builders"])

# ==================== HELPERS ====================
def format_form_out(t: Any) -> DynamicFormTemplateResponse:
    t_id = getattr(t, "template_id", None)
    subs = getattr(t, "submissions", [])
    sub_count = len(subs) if subs is not None else 0

    return DynamicFormTemplateResponse(
        template_id=UUID(str(t_id)) if t_id is not None else uuid.uuid4(),
        module=str(getattr(t, "module", "GENERAL")),
        code=str(getattr(t, "code", "")),
        title=str(getattr(t, "title", "")),
        description=getattr(t, "description", None),
        version=str(getattr(t, "version", "1.0")),
        fields=getattr(t, "fields", []),
        status=str(getattr(t, "status", "ACTIVE")),
        created_by=getattr(t, "created_by", None),
        created_at=getattr(t, "created_at", None),
        updated_at=getattr(t, "updated_at", None),
        submission_count=sub_count,
    )

def format_wf_out(w: Any) -> DynamicWorkflowTemplateResponse:
    w_id = getattr(w, "workflow_id", None)
    insts = getattr(w, "instances", [])
    inst_count = len(insts) if insts is not None else 0

    return DynamicWorkflowTemplateResponse(
        workflow_id=UUID(str(w_id)) if w_id is not None else uuid.uuid4(),
        module=str(getattr(w, "module", "GENERAL")),
        code=str(getattr(w, "code", "")),
        title=str(getattr(w, "title", "")),
        description=getattr(w, "description", None),
        version=str(getattr(w, "version", "1.0")),
        nodes=getattr(w, "nodes", []),
        edges=getattr(w, "edges", []),
        status=str(getattr(w, "status", "ACTIVE")),
        created_by=getattr(w, "created_by", None),
        created_at=getattr(w, "created_at", None),
        updated_at=getattr(w, "updated_at", None),
        instance_count=inst_count,
    )

# ==================== 1. FORM TEMPLATES CRUD ====================
@router.get("/forms", response_model=List[DynamicFormTemplateResponse])
def get_form_templates(
    module: Optional[str] = Query(None, description="Filter by module: HACCP, PRP, IQC, etc."),
    db: Session = Depends(get_db),
):
    query = select(DynamicFormTemplate).order_by(desc(DynamicFormTemplate.created_at))
    if module and module != "ALL":
        query = query.where(DynamicFormTemplate.module == module)
    results = db.scalars(query).unique().all()
    return [format_form_out(t) for t in results]

@router.get("/forms/{template_id}", response_model=DynamicFormTemplateResponse)
def get_form_template_by_id(template_id: UUID, db: Session = Depends(get_db)):
    t = db.get(DynamicFormTemplate, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu biểu mẫu")
    return format_form_out(t)

@router.post("/forms", response_model=DynamicFormTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_form_template(payload: DynamicFormTemplateCreate, db: Session = Depends(get_db)):
    code_val = payload.code.strip()
    existing = db.scalar(select(DynamicFormTemplate).where(DynamicFormTemplate.code == code_val))
    if existing:
        existing.module = payload.module.strip()
        existing.title = payload.title.strip()
        existing.description = payload.description.strip() if payload.description else None
        existing.version = payload.version.strip()
        existing.fields = [f.model_dump() for f in payload.fields]
        existing.status = payload.status
        db.commit()
        db.refresh(existing)
        return format_form_out(existing)

    new_t = DynamicFormTemplate(
        module=payload.module.strip(),
        code=code_val,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        version=payload.version.strip(),
        fields=[f.model_dump() for f in payload.fields],
        status=payload.status,
    )
    db.add(new_t)
    db.commit()
    db.refresh(new_t)
    return format_form_out(new_t)

@router.put("/forms/{template_id}", response_model=DynamicFormTemplateResponse)
def update_form_template(template_id: UUID, payload: DynamicFormTemplateUpdate, db: Session = Depends(get_db)):
    t = db.get(DynamicFormTemplate, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Không tìm thấy biểu mẫu cần cập nhật")

    if payload.code and payload.code.strip() != t.code:
        dup = db.scalar(select(DynamicFormTemplate).where(and_(DynamicFormTemplate.code == payload.code.strip(), DynamicFormTemplate.template_id != template_id)))
        if dup:
            raise HTTPException(status_code=400, detail=f"Mã biểu mẫu '{payload.code}' đã bị trùng")
        t.code = payload.code.strip()

    if payload.module is not None:
        t.module = payload.module.strip()
    if payload.title is not None:
        t.title = payload.title.strip()
    if payload.description is not None:
        t.description = payload.description.strip()
    if payload.version is not None:
        t.version = payload.version.strip()
    if payload.fields is not None:
        t.fields = [f.model_dump() for f in payload.fields]
    if payload.status is not None:
        t.status = payload.status

    db.commit()
    db.refresh(t)
    return format_form_out(t)

@router.delete("/forms/{template_id}", status_code=status.HTTP_200_OK)
def delete_form_template(template_id: UUID, db: Session = Depends(get_db)):
    t = db.get(DynamicFormTemplate, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Không tìm thấy biểu mẫu cần xóa")
    db.delete(t)
    db.commit()
    return {"message": "Đã xóa biểu mẫu thành công", "template_id": template_id}

# ==================== 2. FORM SUBMISSIONS ====================
@router.get("/submissions", response_model=List[DynamicFormSubmissionResponse])
def get_form_submissions(
    template_id: Optional[UUID] = Query(None),
    reference_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = select(DynamicFormSubmission).order_by(desc(DynamicFormSubmission.created_at))
    if template_id:
        query = query.where(DynamicFormSubmission.template_id == template_id)
    if reference_id:
        query = query.where(DynamicFormSubmission.reference_id == reference_id)
    subs = db.scalars(query).unique().all()
    
    out = []
    for s in subs:
        t = getattr(s, "template", None)
        out.append(
            DynamicFormSubmissionResponse(
                submission_id=str(s.submission_id),
                template_id=str(s.template_id),
                reference_id=str(s.reference_id) if s.reference_id else None,
                reference_type=str(s.reference_type) if s.reference_type else None,
                submitted_by=str(s.submitted_by) if s.submitted_by else None,
                submitted_by_name=str(s.submitted_by_name) if s.submitted_by_name else None,
                form_data=dict(s.form_data or {}),
                score=float(s.score) if s.score is not None else None,
                status=str(s.status),
                created_at=s.created_at,
                template_title=str(t.title) if t and getattr(t, "title", None) else None,
                template_code=str(t.code) if t and getattr(t, "code", None) else None,
            )
        )
    return out

@router.post("/submissions", response_model=DynamicFormSubmissionResponse, status_code=status.HTTP_201_CREATED)
def submit_form_data(payload: DynamicFormSubmissionCreate, db: Session = Depends(get_db)):
    t = None
    target_tid = payload.template_id
    try:
        if isinstance(target_tid, str):
            try:
                val_uuid = UUID(target_tid)
                t = db.get(DynamicFormTemplate, val_uuid)
            except ValueError:
                t = db.scalar(select(DynamicFormTemplate).where(DynamicFormTemplate.code == target_tid.strip()))
        else:
            t = db.get(DynamicFormTemplate, target_tid)
    except Exception:
        t = db.scalar(select(DynamicFormTemplate).where(DynamicFormTemplate.code == str(target_tid).strip()))

    if not t:
        # Tự tạo mẫu nếu chưa có
        t = DynamicFormTemplate(
            module="GENERAL",
            code=str(target_tid),
            title=f"Biểu Mẫu {target_tid}",
            fields=[],
            status="ACTIVE",
        )
        db.add(t)
        db.commit()
        db.refresh(t)

    new_sub = DynamicFormSubmission(
        template_id=t.template_id,
        reference_id=payload.reference_id,
        reference_type=payload.reference_type,
        submitted_by_name=payload.submitted_by_name or "QC Ca",
        form_data=payload.form_data,
        score=payload.score,
        status=payload.status,
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    return DynamicFormSubmissionResponse(
        submission_id=str(new_sub.submission_id),
        template_id=str(new_sub.template_id),
        reference_id=str(new_sub.reference_id) if new_sub.reference_id else None,
        reference_type=str(new_sub.reference_type) if new_sub.reference_type else None,
        submitted_by=str(new_sub.submitted_by) if new_sub.submitted_by else None,
        submitted_by_name=str(new_sub.submitted_by_name) if new_sub.submitted_by_name else None,
        form_data=dict(new_sub.form_data or {}),
        score=float(new_sub.score) if new_sub.score is not None else None,
        status=str(new_sub.status),
        created_at=new_sub.created_at,
        template_title=str(t.title),
        template_code=str(t.code),
    )

# ==================== 3. WORKFLOW TEMPLATES CRUD ====================
@router.get("/workflows", response_model=List[DynamicWorkflowTemplateResponse])
def get_workflow_templates(
    module: Optional[str] = Query(None, description="Filter by module: HACCP_FLOW, DOC_APPROVAL, etc."),
    db: Session = Depends(get_db),
):
    query = select(DynamicWorkflowTemplate).order_by(desc(DynamicWorkflowTemplate.created_at))
    if module and module != "ALL":
        query = query.where(DynamicWorkflowTemplate.module == module)
    results = db.scalars(query).unique().all()
    return [format_wf_out(w) for w in results]

@router.get("/workflows/{workflow_id}", response_model=DynamicWorkflowTemplateResponse)
def get_workflow_template_by_id(workflow_id: UUID, db: Session = Depends(get_db)):
    w = db.get(DynamicWorkflowTemplate, workflow_id)
    if not w:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình workflow")
    return format_wf_out(w)

@router.post("/workflows", response_model=DynamicWorkflowTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_workflow_template(payload: DynamicWorkflowTemplateCreate, db: Session = Depends(get_db)):
    code_val = payload.code.strip()
    existing = db.scalar(select(DynamicWorkflowTemplate).where(DynamicWorkflowTemplate.code == code_val))
    if existing:
        existing.module = payload.module.strip()
        existing.title = payload.title.strip()
        existing.description = payload.description.strip() if payload.description else None
        existing.version = payload.version.strip()
        existing.nodes = [n.model_dump() for n in payload.nodes]
        existing.edges = [e.model_dump() for e in payload.edges]
        existing.status = payload.status
        db.commit()
        db.refresh(existing)
        return format_wf_out(existing)

    new_w = DynamicWorkflowTemplate(
        module=payload.module.strip(),
        code=code_val,
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        version=payload.version.strip(),
        nodes=[n.model_dump() for n in payload.nodes],
        edges=[e.model_dump() for e in payload.edges],
        status=payload.status,
    )
    db.add(new_w)
    db.commit()
    db.refresh(new_w)
    return format_wf_out(new_w)

@router.put("/workflows/{workflow_id}", response_model=DynamicWorkflowTemplateResponse)
def update_workflow_template(workflow_id: UUID, payload: DynamicWorkflowTemplateUpdate, db: Session = Depends(get_db)):
    w = db.get(DynamicWorkflowTemplate, workflow_id)
    if not w:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình workflow cần cập nhật")

    if payload.code and payload.code.strip() != w.code:
        dup = db.scalar(select(DynamicWorkflowTemplate).where(and_(DynamicWorkflowTemplate.code == payload.code.strip(), DynamicWorkflowTemplate.workflow_id != workflow_id)))
        if dup:
            raise HTTPException(status_code=400, detail=f"Mã quy trình '{payload.code}' đã bị trùng")
        w.code = payload.code.strip()

    if payload.module is not None:
        w.module = payload.module.strip()
    if payload.title is not None:
        w.title = payload.title.strip()
    if payload.description is not None:
        w.description = payload.description.strip()
    if payload.version is not None:
        w.version = payload.version.strip()
    if payload.nodes is not None:
        w.nodes = [n.model_dump() for n in payload.nodes]
    if payload.edges is not None:
        w.edges = [e.model_dump() for e in payload.edges]
    if payload.status is not None:
        w.status = payload.status

    db.commit()
    db.refresh(w)
    return format_wf_out(w)

@router.delete("/workflows/{workflow_id}", status_code=status.HTTP_200_OK)
def delete_workflow_template(workflow_id: UUID, db: Session = Depends(get_db)):
    w = db.get(DynamicWorkflowTemplate, workflow_id)
    if not w:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình cần xóa")
    db.delete(w)
    db.commit()
    return {"message": "Đã xóa quy trình thành công", "workflow_id": workflow_id}

# ==================== 4. SEED DEFAULTS (BIỂU MẪU & QUY TRÌNH MẪU CHUẨN ISO) ====================
@router.post("/seed-defaults", status_code=status.HTTP_200_OK)
def seed_default_builders(db: Session = Depends(get_db)):
    """Tự động nạp các biểu mẫu và quy trình mẫu chuẩn ISO 22000:2018 cho toàn bộ các phân hệ."""
    
    # 1. Mẫu Form GMP-01 (Checklist Vệ sinh Nhà xưởng)
    f_gmp = db.scalar(select(DynamicFormTemplate).where(DynamicFormTemplate.code == "FORM-GMP-01"))
    if not f_gmp:
        f_gmp = DynamicFormTemplate(
            module="PRP",
            code="FORM-GMP-01",
            title="Phiếu Kiểm Tra Vệ Sinh Nhà Xưởng & Thiết Bị (GMP-01)",
            description="Biểu mẫu đánh giá tuân thủ điều kiện vệ sinh nhà xưởng trước ca sản xuất theo ISO 22000:2018 Điều khoản 8.2.",
            version="2.0",
            fields=[
                {"id": "shift", "name": "shift_name", "label": "Ca sản xuất", "type": "SELECT", "required": True, "options": ["Ca 1 (06:00 - 14:00)", "Ca 2 (14:00 - 22:00)", "Ca 3 (22:00 - 06:00)"]},
                {"id": "inspector", "name": "inspector_name", "label": "Người kiểm tra", "type": "TEXT", "required": True, "default_value": "Nguyễn Văn An (QC)"},
                {"id": "floor_clean", "name": "floor_clean", "label": "1. Tình trạng sàn, rãnh thoát nước sạch sẽ, không đọng rác?", "type": "YESNO", "required": True},
                {"id": "belt_disinfect", "name": "belt_disinfect", "label": "2. Băng tải và bề mặt tiếp xúc thực phẩm đã khử trùng cồn 70°?", "type": "YESNO", "required": True},
                {"id": "ppe_compliance", "name": "ppe_compliance", "label": "3. 100% công nhân mang đầy đủ bảo hộ (khẩu trang, nón, ủng, găng tay)?", "type": "YESNO", "required": True},
                {"id": "temp_room", "name": "temp_room", "label": "4. Nhiệt độ phòng sơ chế (°C)", "type": "NUMBER", "required": True, "min_val": 0, "max_val": 25, "unit": "°C", "default_value": 16.5},
                {"id": "pest_trace", "name": "pest_trace", "label": "5. Có phát hiện dấu vết côn trùng, gặm nhấm không?", "type": "YESNO", "required": True},
                {"id": "overall_score", "name": "overall_score", "label": "Đánh giá chung độ tuân thủ (1 - 5 sao)", "type": "RATING", "required": True, "default_value": 5},
                {"id": "note", "name": "note", "label": "Ghi chú & Hành động khắc phục (nếu có)", "type": "TEXT", "required": False},
            ],
            status="ACTIVE"
        )
        db.add(f_gmp)

    # 2. Mẫu Form CCP-MONITOR (Đo đạc CCP Thanh trùng)
    f_ccp = db.scalar(select(DynamicFormTemplate).where(DynamicFormTemplate.code == "FORM-CCP-MONITOR"))
    if not f_ccp:
        f_ccp = DynamicFormTemplate(
            module="HACCP",
            code="FORM-CCP-MONITOR",
            title="Phiếu Giám Sát Điểm Kiểm Soát Tới Hạn CCP 1 (Thanh Trùng)",
            description="Biểu mẫu đo đạc thông số nhiệt độ tâm và thời gian gia nhiệt nồi Retort theo ISO 22000:2018 Điều khoản 8.5.4.",
            version="1.1",
            fields=[
                {"id": "batch_no", "name": "batch_number", "label": "Mã Lô / Mẻ Sản Xuất", "type": "TEXT", "required": True, "default_value": "LOT-2026-B01"},
                {"id": "retort_no", "name": "retort_number", "label": "Số hiệu Nồi Thanh Trùng", "type": "SELECT", "required": True, "options": ["Nồi Retort #01", "Nồi Retort #02", "Nồi Retort #03"]},
                {"id": "core_temp", "name": "core_temperature_c", "label": "Nhiệt độ tâm thực tế (°C - Giới hạn tới hạn ≥ 85.0°C)", "type": "NUMBER", "required": True, "min_val": 50, "max_val": 130, "unit": "°C", "default_value": 85.5},
                {"id": "holding_time", "name": "holding_time_min", "label": "Thời gian giữ nhiệt (Phút - Giới hạn ≥ 15 phút)", "type": "NUMBER", "required": True, "min_val": 1, "max_val": 60, "unit": "phút", "default_value": 15},
                {"id": "pressure_bar", "name": "pressure_bar", "label": "Áp suất nồi (Bar)", "type": "NUMBER", "required": False, "unit": "Bar", "default_value": 1.8},
                {"id": "is_limit_pass", "name": "is_limit_pass", "label": "Kết luận: Đạt giới hạn tới hạn ATTP?", "type": "YESNO", "required": True, "default_value": True},
                {"id": "qc_sign", "name": "qc_signature", "label": "Chữ ký xác nhận của KCS / QC", "type": "SIGNATURE", "required": False},
            ],
            status="ACTIVE"
        )
        db.add(f_ccp)

    # 3. Mẫu Form IQC-01 (Nghiệm thu Nguyên liệu Cá tra Fillet)
    f_iqc = db.scalar(select(DynamicFormTemplate).where(DynamicFormTemplate.code == "FORM-IQC-01"))
    if not f_iqc:
        f_iqc = DynamicFormTemplate(
            module="IQC",
            code="FORM-IQC-01",
            title="Phiếu Nghiệm Thu Nguyên Liệu Thủy Sản Đầu Vào (IQC-01)",
            description="Đánh giá chất lượng cảm quan, nhiệt độ xe đông lạnh và phiếu COA nhà cung cấp theo ISO 22000 Điều khoản 8.2.",
            version="1.0",
            fields=[
                {"id": "supplier", "name": "supplier_name", "label": "Nhà cung cấp", "type": "TEXT", "required": True, "default_value": "Công ty TNHH Thủy sản Sông Hậu"},
                {"id": "lot_no", "name": "material_lot", "label": "Mã Lô Nguyên Liệu", "type": "TEXT", "required": True, "default_value": "NL-2026-CA01"},
                {"id": "truck_temp", "name": "truck_temperature_c", "label": "Nhiệt độ thùng xe giao hàng (°C - Yêu cầu ≤ -18°C)", "type": "NUMBER", "required": True, "unit": "°C", "default_value": -18.2},
                {"id": "sensory_color", "name": "sensory_color", "label": "Cảm quan màu sắc thịt cá trắng tự nhiên, đàn hồi tốt?", "type": "YESNO", "required": True},
                {"id": "coa_attached", "name": "coa_attached", "label": "Có đầy đủ Phiếu kiểm nghiệm COA (Âm tính kháng sinh, vi sinh)?", "type": "YESNO", "required": True},
                {"id": "verdict", "name": "iqc_verdict", "label": "Kết luận tiếp nhận", "type": "SELECT", "required": True, "options": ["CHẤP NHẬN NHẬP KHO", "BIỆT TRỮ CHỜ XÉT NGHIỆM", "TỪ CHỐI / TRẢ HÀNG"]},
            ],
            status="ACTIVE"
        )
        db.add(f_iqc)

    # 4. Mẫu Form VENDOR-AUDIT (Đánh giá Nhà cung cấp)
    f_vendor = db.scalar(select(DynamicFormTemplate).where(DynamicFormTemplate.code == "FORM-VENDOR-01"))
    if not f_vendor:
        f_vendor = DynamicFormTemplate(
            module="SUPPLIER_AUDIT",
            code="FORM-VENDOR-01",
            title="Bảng Đánh Giá Năng Lực & ATTP Nhà Cung Cấp (BM-NCC-01)",
            description="Đánh giá định kỳ hàng năm điều kiện nhà xưởng và chứng chỉ ISO 22000/HACCP của đối tác.",
            version="1.0",
            fields=[
                {"id": "v_name", "name": "vendor_name", "label": "Tên đối tác / Nhà cung cấp", "type": "TEXT", "required": True},
                {"id": "cert_iso", "name": "has_iso_cert", "label": "Đã có chứng nhận ISO 22000 / HACCP còn hiệu lực?", "type": "YESNO", "required": True},
                {"id": "quality_score", "name": "quality_score", "label": "Điểm chất lượng hàng hóa giao trong năm (Thang 1-100)", "type": "NUMBER", "min_val": 0, "max_val": 100, "required": True, "default_value": 95},
                {"id": "delivery_ontime", "name": "delivery_ontime_rate", "label": "Tỷ lệ giao hàng đúng hẹn (%)", "type": "NUMBER", "min_val": 0, "max_val": 100, "unit": "%", "required": True, "default_value": 98},
                {"id": "final_ranking", "name": "final_ranking", "label": "Xếp loại nhà cung cấp", "type": "SELECT", "required": True, "options": ["Loại A - Ưu tiên hàng đầu", "Loại B - Đạt yêu cầu", "Loại C - Cần khắc phục", "Loại D - Loại khỏi danh bạ"]},
            ],
            status="ACTIVE"
        )
        db.add(f_vendor)

    # 5. Mẫu Workflow HACCP_FLOW (Lưu đồ Quy trình Chế biến Chả Cá Ba Sa)
    wf_haccp = db.scalar(select(DynamicWorkflowTemplate).where(DynamicWorkflowTemplate.code == "WF-HACCP-CHACA"))
    if not wf_haccp:
        wf_haccp = DynamicWorkflowTemplate(
            module="HACCP_FLOW",
            code="WF-HACCP-CHACA",
            title="Lưu Đồ Quy Trình Chế Biến Chả Cá Ba Sa Đông Lạnh (ISO 8.5.1)",
            description="Quy trình 7 công đoạn chế biến tiêu chuẩn với 2 điểm kiểm soát tới hạn CCP (Thanh trùng nhiệt và Dò kim loại).",
            version="2.0",
            nodes=[
                {"id": "step_1", "type": "process", "label": "1. Tiếp nhận & Kiểm tra IQC Nguyên Liệu", "role": "QC Tiếp nhận", "description": "Kiểm tra nhiệt độ xe lạnh ≤ -18°C và giấy kiểm nghiệm COA", "is_ccp": False, "step_number": 1},
                {"id": "step_2", "type": "process", "label": "2. Rã đông & Rửa sơ chế", "role": "Tổ Sơ chế", "description": "Rã đông nước tuần hoàn, nhiệt độ nước ≤ 15°C", "is_ccp": False, "step_number": 2},
                {"id": "step_3", "type": "process", "label": "3. Xay nhuyễn & Phối trộn Gia vị", "role": "Tổ Phối trộn", "description": "Bổ sung gia vị và phụ gia theo đúng định lượng cấp phép", "is_ccp": False, "step_number": 3},
                {"id": "step_4", "type": "ccp_check", "label": "4. Thanh Trùng Gia Nhiệt (CCP 1)", "role": "Trưởng ca Sản xuất & QC", "description": "Nhiệt độ tâm ≥ 85.0°C duy trì ≥ 15 phút nhằm tiêu diệt Salmonella & Vi sinh vật gây bệnh", "is_ccp": True, "step_number": 4},
                {"id": "step_5", "type": "process", "label": "5. Làm nguội & Đóng gói chân không", "role": "Tổ Đóng gói", "description": "Bao bì PA/PE an toàn thực phẩm, hút chân không kín", "is_ccp": False, "step_number": 5},
                {"id": "step_6", "type": "ccp_check", "label": "6. Dò Kim Loại Sau Đóng Gói (CCP 2)", "role": "KCS Máy Dò", "description": "Loại trừ 100% dị vật kim loại: Fe 1.2mm, Non-Fe 1.5mm, SUS 2.0mm", "is_ccp": True, "step_number": 6},
                {"id": "step_7", "type": "process", "label": "7. Cấp đông IQF & Lưu Kho Lạnh", "role": "Thủ kho Lạnh", "description": "Cấp đông nhanh -35°C và lưu kho bảo quản ≤ -18°C theo chuẩn FEFO", "is_ccp": False, "step_number": 7},
            ],
            edges=[
                {"id": "e1_2", "source": "step_1", "target": "step_2", "label": "IQC Đạt"},
                {"id": "e2_3", "source": "step_2", "target": "step_3", "label": "Đạt độ tươi"},
                {"id": "e3_4", "source": "step_3", "target": "step_4", "label": "Định hình"},
                {"id": "e4_5", "source": "step_4", "target": "step_5", "label": "CCP1 Đạt ≥85°C"},
                {"id": "e5_6", "source": "step_5", "target": "step_6", "label": "Kín mép bao"},
                {"id": "e6_7", "source": "step_6", "target": "step_7", "label": "CCP2 Không dị vật"},
            ],
            status="ACTIVE"
        )
        db.add(wf_haccp)

    # 6. Mẫu Workflow DOC_APPROVAL (Luồng Phê duyệt Tài liệu SOP Đa Cấp)
    wf_doc = db.scalar(select(DynamicWorkflowTemplate).where(DynamicWorkflowTemplate.code == "WF-SOP-APPROVAL"))
    if not wf_doc:
        wf_doc = DynamicWorkflowTemplate(
            module="DOC_APPROVAL",
            code="WF-SOP-APPROVAL",
            title="Quy Trình Phê Duyệt & Ban Hành Tài Liệu SOP Đa Cấp (ISO 7.5)",
            description="Luồng 4 bước phê duyệt từ người soạn thảo đến Trưởng ban ISO và Giám đốc Nhà máy.",
            version="1.0",
            nodes=[
                {"id": "wfd_1", "type": "process", "label": "1. Soạn thảo Dự thảo SOP", "role": "Người soạn thảo (QA/QC)", "description": "Soạn tài liệu theo biểu mẫu chuẩn ISO", "step_number": 1},
                {"id": "wfd_2", "type": "approval", "label": "2. Thẩm tra Kỹ thuật & Sự phù hợp", "role": "Trưởng ban ISO / QA Manager", "description": "Đối chiếu với các điều khoản ISO 22000", "step_number": 2},
                {"id": "wfd_3", "type": "approval", "label": "3. Phê duyệt Ban hành Chính thức", "role": "Giám đốc Nhà máy", "description": "Ký duyệt ban hành và cấp hiệu lực", "step_number": 3},
                {"id": "wfd_4", "type": "process", "label": "4. Phân phối & Đào tạo Nhân viên", "role": "Ban Thư ký ISO", "description": "Phát hành bản có kiểm soát tới các phòng ban", "step_number": 4},
            ],
            edges=[
                {"id": "ed_1_2", "source": "wfd_1", "target": "wfd_2", "label": "Gửi thẩm tra"},
                {"id": "ed_2_3", "source": "wfd_2", "target": "wfd_3", "label": "Đạt thẩm tra"},
                {"id": "ed_3_4", "source": "wfd_3", "target": "wfd_4", "label": "Đã ký duyệt"},
            ],
            status="ACTIVE"
        )
        db.add(wf_doc)

    # 7. Mẫu Workflow CAPA_FLOW (Quy trình Xử lý Sự không phù hợp 5 Bước)
    wf_capa = db.scalar(select(DynamicWorkflowTemplate).where(DynamicWorkflowTemplate.code == "WF-CAPA-5STEPS"))
    if not wf_capa:
        wf_capa = DynamicWorkflowTemplate(
            module="CAPA_FLOW",
            code="WF-CAPA-5STEPS",
            title="Quy Trình Xử Lý Sự Không Phù Hợp & Hành Động Khắc Phục CAPA (ISO 8.9 & 10.1)",
            description="Quy trình 5 bước xử lý từ ghi nhận sự cố, cô lập khẩn cấp, phân tích 5 Whys đến thẩm tra hiệu lực.",
            version="1.0",
            nodes=[
                {"id": "wfc_1", "type": "process", "label": "1. Ghi nhận Sự cố NC", "role": "Mọi nhân viên / QC", "description": "Ghi nhận nguồn phát sinh và mức độ nghiêm trọng", "step_number": 1},
                {"id": "wfc_2", "type": "process", "label": "2. Biệt trữ & Cô lập Lô hàng", "role": "QC / Thủ kho", "description": "Khóa xuất kho và niêm phong hiện trường", "step_number": 2},
                {"id": "wfc_3", "type": "process", "label": "3. Phân tích Nguyên nhân 5 Whys", "role": "Ban ATTP & Trưởng ca", "description": "Tìm nguyên nhân gốc rễ và cơ chế phòng ngừa", "step_number": 3},
                {"id": "wfc_4", "type": "process", "label": "4. Thực thi Hành động Khắc phục", "role": "Đơn vị liên đới", "description": "Triển khai biện pháp trong thời hạn cam kết", "step_number": 4},
                {"id": "wfc_5", "type": "approval", "label": "5. Thẩm tra Hiệu lực CAPA (30 ngày)", "role": "Trưởng ban ISO", "description": "Đánh giá sự không tái diễn và đóng phiếu CAPA", "step_number": 5},
            ],
            edges=[
                {"id": "ec_1_2", "source": "wfc_1", "target": "wfc_2", "label": "Khẩn cấp"},
                {"id": "ec_2_3", "source": "wfc_2", "target": "wfc_3", "label": "Đã cô lập"},
                {"id": "ec_3_4", "source": "wfc_3", "target": "wfc_4", "label": "Có giải pháp"},
                {"id": "ec_4_5", "source": "wfc_4", "target": "wfc_5", "label": "Sau 30 ngày"},
            ],
            status="ACTIVE"
        )
        db.add(wf_capa)

    db.commit()
    return {"message": "Đã khởi tạo thành công 4 Biểu mẫu Động và 3 Quy trình Mẫu chuẩn ISO 22000:2018!"}
