import uuid
from typing import List, Optional, Any, Dict
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func, and_, or_

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.demo_data import demo_seed_enabled
from app.modules.builder.models import (
    DynamicFormTemplate,
    DynamicFormSubmission,
    DynamicWorkflowTemplate,
    WorkflowInstance,
)
from app.modules.auth.models import User
from app.modules.builder.schemas import (
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
    WorkflowNode,
    WorkflowEdge,
    validate_workflow_structure,
)

router = APIRouter(tags=["Dynamic Form & Workflow Builders"])

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
        is_approved=bool(getattr(t, "is_approved", True)),
        approved_by_name=getattr(t, "approved_by_name", "Quản trị hệ thống"),
        approved_at=getattr(t, "approved_at", None),
        change_history=list(getattr(t, "change_history", []) or []),
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
        is_approved=bool(getattr(w, "is_approved", True)),
        approved_by_name=getattr(w, "approved_by_name", "Quản trị hệ thống"),
        approved_at=getattr(w, "approved_at", None),
        change_history=list(getattr(w, "change_history", []) or []),
        created_by=getattr(w, "created_by", None),
        created_at=getattr(w, "created_at", None),
        updated_at=getattr(w, "updated_at", None),
        instance_count=inst_count,
    )


def format_instance_out(inst: Any) -> WorkflowInstanceResponse:
    wf = getattr(inst, "workflow", None)
    return WorkflowInstanceResponse(
        instance_id=inst.instance_id,
        workflow_id=inst.workflow_id,
        reference_id=inst.reference_id,
        reference_type=inst.reference_type,
        current_node_id=str(inst.current_node_id),
        history=list(inst.history or []),
        status=str(inst.status),
        started_by=inst.started_by,
        created_at=inst.created_at,
        updated_at=inst.updated_at,
        workflow_title=str(wf.title) if wf else None,
        workflow_code=str(wf.code) if wf else None,
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
def create_form_template(payload: DynamicFormTemplateCreate, db: Session = Depends(get_db), _user: User = Depends(require_roles("admin", "qa", "fst_leader"))):
    code_val = payload.code.strip()
    existing = db.scalar(select(DynamicFormTemplate).where(DynamicFormTemplate.code == code_val))
    if existing:
        existing.module = payload.module.strip()
        existing.title = payload.title.strip()
        existing.description = payload.description.strip() if payload.description else None
        existing.version = payload.version.strip()
        existing.fields = [f.model_dump() for f in payload.fields]
        existing.status = payload.status
        if payload.status == "DRAFT":
            existing.is_approved = False
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
        is_approved=(payload.status != "DRAFT"),
        created_by=_user.user_id,
    )
    db.add(new_t)
    db.commit()
    db.refresh(new_t)
    return format_form_out(new_t)

@router.put("/forms/{template_id}", response_model=DynamicFormTemplateResponse)
def update_form_template(template_id: UUID, payload: DynamicFormTemplateUpdate, db: Session = Depends(get_db), _user: User = Depends(require_roles("admin", "qa", "fst_leader"))):
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

    # Ghi nhận audit trail lịch sử thay đổi phiên bản / trường biểu mẫu
    hist = list(t.change_history or [])
    hist.append({
        "action": "UPDATE_TEMPLATE",
        "version_before": t.version,
        "version_after": payload.version or t.version,
        "modified_at": datetime.now().isoformat(),
        "modified_by": _user.full_name,
        "fields_changed": payload.fields is not None,
    })
    t.change_history = hist

    db.commit()
    db.refresh(t)
    return format_form_out(t)

@router.post("/forms/{template_id}/approve", response_model=DynamicFormTemplateResponse)
def approve_form_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader"))
):
    """Phê duyệt chính thức biểu mẫu trước khi cho phép người dùng nhập liệu (ISO 22000 Điều 7.5.3)"""
    t = db.get(DynamicFormTemplate, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Không tìm thấy biểu mẫu")
    t.is_approved = True
    t.status = "ACTIVE"
    t.approved_by_name = current_user.full_name
    t.approved_at = datetime.now()
    hist = list(t.change_history or [])
    hist.append({
        "action": "APPROVE_TEMPLATE",
        "version": t.version,
        "approved_by": current_user.full_name,
        "approved_at": datetime.now().isoformat(),
    })
    t.change_history = hist
    db.commit()
    db.refresh(t)
    return format_form_out(t)

@router.delete("/forms/{template_id}", status_code=status.HTTP_200_OK)
def delete_form_template(template_id: UUID, db: Session = Depends(get_db), _user: User = Depends(require_roles("admin", "qa", "fst_leader"))):
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
                score=float(getattr(s, "score", 0.0) or 0.0) if getattr(s, "score", None) is not None else None,
                status=str(s.status),
                created_at=getattr(s, "created_at", None),
                template_title=str(t.title) if t and getattr(t, "title", None) else None,
                template_code=str(t.code) if t and getattr(t, "code", None) else None,
            )
        )
    return out

@router.post("/submissions", response_model=DynamicFormSubmissionResponse, status_code=status.HTTP_201_CREATED)
def submit_form_data(payload: DynamicFormSubmissionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
            is_approved=True,
        )
        db.add(t)
        db.commit()
        db.refresh(t)
    else:
        # Chặn nhập liệu nếu mẫu chưa được phê duyệt hoặc đang là DRAFT
        if t.status == "DRAFT" or not getattr(t, "is_approved", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Biểu mẫu '{t.title}' đang ở trạng thái DRAFT hoặc chưa được phê duyệt. Vui lòng phê duyệt trước khi nhập liệu."
            )

    new_sub = DynamicFormSubmission(
        template_id=t.template_id,
        reference_id=payload.reference_id,
        reference_type=payload.reference_type,
        submitted_by=current_user.user_id,
        submitted_by_name=payload.submitted_by_name or current_user.full_name or "Nhân viên",
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
        score=float(getattr(new_sub, "score", 0.0) or 0.0) if getattr(new_sub, "score", None) is not None else None,
        status=str(new_sub.status),
        created_at=getattr(new_sub, "created_at", None),
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
def create_workflow_template(payload: DynamicWorkflowTemplateCreate, db: Session = Depends(get_db), _user: User = Depends(require_roles("admin", "qa", "fst_leader"))):
    code_val = payload.code.strip()
    existing = None

    if payload.workflow_id:
        try:
            target_uuid = UUID(str(payload.workflow_id))
            existing = db.get(DynamicWorkflowTemplate, target_uuid)
        except Exception:
            existing = None

    if not existing:
        existing = db.scalar(select(DynamicWorkflowTemplate).where(DynamicWorkflowTemplate.code == code_val))

    if existing:
        existing.module = payload.module.strip()
        existing.code = code_val
        existing.title = payload.title.strip()
        existing.description = payload.description.strip() if payload.description else None
        existing.version = payload.version.strip()
        existing.nodes = [n.model_dump() for n in payload.nodes]
        existing.edges = [e.model_dump() for e in payload.edges]
        existing.status = payload.status
        if payload.status == "DRAFT":
            existing.is_approved = False
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
        is_approved=(payload.status != "DRAFT"),
        created_by=_user.user_id,
    )
    db.add(new_w)
    db.commit()
    db.refresh(new_w)
    return format_wf_out(new_w)

@router.put("/workflows/{workflow_id}", response_model=DynamicWorkflowTemplateResponse)
def update_workflow_template(workflow_id: UUID, payload: DynamicWorkflowTemplateUpdate, db: Session = Depends(get_db), _user: User = Depends(require_roles("admin", "qa", "fst_leader"))):
    w = db.get(DynamicWorkflowTemplate, workflow_id)
    if not w:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình workflow cần cập nhật")

    if payload.code and payload.code.strip() != w.code:
        dup = db.scalar(select(DynamicWorkflowTemplate).where(and_(DynamicWorkflowTemplate.code == payload.code.strip(), DynamicWorkflowTemplate.workflow_id != workflow_id)))
        if dup:
            raise HTTPException(status_code=400, detail=f"Mã quy trình '{payload.code}' đã bị trùng")
        w.code = payload.code.strip()

    # Thẩm định tính toàn vẹn của đồ thị khi hợp nhất dữ liệu mới với dữ liệu hiện có
    if payload.nodes is not None:
        merged_nodes = payload.nodes
    else:
        existing_nodes = w.nodes or []
        merged_nodes = [WorkflowNode.model_validate(n) for n in existing_nodes]

    if payload.edges is not None:
        merged_edges = payload.edges
    else:
        existing_edges = w.edges or []
        merged_edges = [WorkflowEdge.model_validate(e) for e in existing_edges]

    module_val = str(payload.module if payload.module is not None else w.module)
    status_val = str(payload.status if payload.status is not None else w.status)

    try:
        validate_workflow_structure(
            nodes=merged_nodes,
            edges=merged_edges,
            module=module_val,
            status=status_val,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

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

    # Ghi nhận audit trail thay đổi luồng quy trình
    wf_hist = list(w.change_history or [])
    wf_hist.append({
        "action": "UPDATE_WORKFLOW",
        "version_before": w.version,
        "version_after": payload.version or w.version,
        "modified_at": datetime.now().isoformat(),
        "modified_by": _user.full_name,
        "nodes_changed": payload.nodes is not None,
        "edges_changed": payload.edges is not None,
    })
    w.change_history = wf_hist

    db.commit()
    db.refresh(w)
    return format_wf_out(w)

@router.post("/workflows/{workflow_id}/approve", response_model=DynamicWorkflowTemplateResponse)
def approve_workflow_template(
    workflow_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "qa", "fst_leader", "fs_team_leader"))
):
    """Phê duyệt chính thức sơ đồ lưu đồ quy trình trước khi ban hành (ISO 22000 Điều 8.5.1.2)"""
    w = db.get(DynamicWorkflowTemplate, workflow_id)
    if not w:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình workflow")
    w.is_approved = True
    w.status = "ACTIVE"
    w.approved_by_name = current_user.full_name
    w.approved_at = datetime.now()
    wf_hist = list(w.change_history or [])
    wf_hist.append({
        "action": "APPROVE_WORKFLOW",
        "version": w.version,
        "approved_by": current_user.full_name,
        "approved_at": datetime.now().isoformat(),
    })
    w.change_history = wf_hist
    db.commit()
    db.refresh(w)
    return format_wf_out(w)

@router.delete("/workflows/{workflow_id}", status_code=status.HTTP_200_OK)
def delete_workflow_template(workflow_id: UUID, db: Session = Depends(get_db), _user: User = Depends(require_roles("admin", "qa", "fst_leader"))):
    w = db.get(DynamicWorkflowTemplate, workflow_id)
    if not w:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình cần xóa")
    db.delete(w)
    db.commit()
    return {"message": "Đã xóa quy trình thành công", "workflow_id": workflow_id}


# ==================== 4. WORKFLOW EXECUTION ENGINE (INSTANCES) ====================
@router.post("/workflows/{workflow_id}/instances", response_model=WorkflowInstanceResponse, status_code=status.HTTP_201_CREATED)
def start_workflow_instance(
    workflow_id: UUID,
    payload: WorkflowInstanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Khởi tạo một phiên thực thi quy trình từ Workflow Template."""
    wf = db.get(DynamicWorkflowTemplate, workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Không tìm thấy quy trình workflow")

    nodes = wf.nodes or []
    if not nodes:
        raise HTTPException(status_code=400, detail="Quy trình không có bước công đoạn nào")

    # Xác định node bắt đầu
    start_node = None
    if payload.initial_node_id:
        start_node = next((n for n in nodes if n.get("id") == payload.initial_node_id), None)
    if not start_node:
        start_node = next((n for n in nodes if n.get("type") == "start"), nodes[0])

    curr_node_id = str(start_node.get("id"))
    history_entry = {
        "node_id": curr_node_id,
        "node_label": start_node.get("label", curr_node_id),
        "action": "START",
        "action_by": current_user.full_name or "Nhân viên",
        "action_by_id": str(current_user.user_id),
        "action_at": datetime.now(timezone.utc).isoformat(),
        "comments": "Khởi tạo luồng quy trình thực thi",
    }

    inst = WorkflowInstance(
        workflow_id=workflow_id,
        reference_id=payload.reference_id,
        reference_type=payload.reference_type,
        current_node_id=curr_node_id,
        status="IN_PROGRESS",
        started_by=current_user.user_id,
        history=[history_entry],
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)
    return format_instance_out(inst)

@router.get("/workflows/{workflow_id}/instances", response_model=List[WorkflowInstanceResponse])
def get_workflow_instances(workflow_id: UUID, db: Session = Depends(get_db)):
    """Lấy danh sách các phiên thực thi của một Workflow Template."""
    instances = db.query(WorkflowInstance).filter(WorkflowInstance.workflow_id == workflow_id).order_by(desc(WorkflowInstance.created_at)).all()
    return [format_instance_out(i) for i in instances]

@router.get("/instances", response_model=List[WorkflowInstanceResponse])
def list_all_instances(
    status_filter: Optional[str] = Query(None, alias="status"),
    reference_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Tra cứu tất cả các phiên thực thi quy trình đang chạy trên toàn hệ thống."""
    query = db.query(WorkflowInstance)
    if status_filter:
        query = query.filter(WorkflowInstance.status == status_filter.upper())
    if reference_id:
        query = query.filter(WorkflowInstance.reference_id == reference_id)
    instances = query.order_by(desc(WorkflowInstance.created_at)).all()
    return [format_instance_out(i) for i in instances]

@router.get("/instances/{instance_id}", response_model=WorkflowInstanceResponse)
def get_single_instance(instance_id: UUID, db: Session = Depends(get_db)):
    """Lấy chi tiết một phiên thực thi quy trình bao gồm toàn bộ nhật ký phê duyệt."""
    inst = db.get(WorkflowInstance, instance_id)
    if not inst:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên thực thi quy trình")
    return format_instance_out(inst)

def check_user_workflow_permission(
    user: User,
    node: Optional[Dict[str, Any]],
    inst: WorkflowInstance,
    is_start_node: bool = False,
) -> tuple[bool, str]:
    """
    Kiểm tra xem user có quyền thực hiện hành động trên node hiện tại của workflow hay không.
    Trả về (is_allowed, reason_if_denied).
    """
    user_roles = [str(r.role_code).lower().strip() for r in (user.roles or [])]
    user_role_names = [str(r.role_name).lower().strip() for r in (user.roles or [])]
    user_dept = str(user.department or "").lower().strip()

    # 1. Superuser / Admin bypass
    if "admin" in user_roles:
        return True, ""

    if not node:
        if inst.started_by and str(inst.started_by) == str(user.user_id):
            return True, ""
        return False, "Node hiện tại không tồn tại trong cấu hình quy trình."

    # 2. Khởi tạo quy trình (start node) cho phép người tạo phiên thực thi
    if is_start_node and inst.started_by and str(inst.started_by) == str(user.user_id):
        return True, ""

    required_role = str(node.get("role") or "").strip().lower()
    required_dept = str(node.get("department") or "").strip().lower()

    # Nếu node không yêu cầu vai trò hoặc áp dụng chung cho mọi nhân viên
    if not required_role and not required_dept:
        return True, ""

    if any(kw in required_role for kw in ["mọi nhân viên", "all", "any", "tất cả"]):
        return True, ""

    # 3. Kiểm tra vai trò
    role_matched = False
    if required_role:
        for ur in user_roles:
            if ur in required_role or required_role in ur:
                role_matched = True
                break
        if not role_matched:
            for urn in user_role_names:
                if urn in required_role or required_role in urn:
                    role_matched = True
                    break
        if not role_matched:
            synonyms = {
                "qc": ["qc", "kcs", "kiểm tra", "giám sát", "tiếp nhận"],
                "qa": ["qa", "qlcl", "quản lý chất lượng", "đảm bảo chất lượng", "iso"],
                "prod": ["sản xuất", "trưởng ca", "tổ trưởng", "operator", "vận hành", "sơ chế", "đóng gói", "phối trộn"],
                "warehouse": ["kho", "thủ kho", "vật tư", "logistics"],
                "fst_leader": ["fst", "attp", "đội trưởng", "an toàn thực phẩm"],
                "management": ["giám đốc", "ban giám đốc", "lãnh đạo", "director", "manager"],
                "auditor": ["đánh giá", "auditor", "kiểm toán viên"],
            }
            for user_r in user_roles:
                for syn_key, syn_words in synonyms.items():
                    if user_r == syn_key or syn_key in user_r:
                        if any(w in required_role for w in syn_words):
                            role_matched = True
                            break
                    if role_matched:
                        break
                if role_matched:
                    break
    else:
        role_matched = True

    # 4. Kiểm tra phòng ban
    dept_matched = False
    if required_dept:
        if user_dept and (user_dept in required_dept or required_dept in user_dept):
            dept_matched = True
    else:
        dept_matched = True

    if required_role and required_dept:
        if role_matched and dept_matched:
            return True, ""
        return False, f"Yêu cầu vai trò '{node.get('role')}' thuộc bộ phận '{node.get('department')}'."
    elif required_role:
        if role_matched:
            return True, ""
        return False, f"Yêu cầu vai trò '{node.get('role')}'. Vai trò hiện tại của bạn không khớp."
    elif required_dept:
        if dept_matched:
            return True, ""
        return False, f"Yêu cầu bộ phận '{node.get('department')}'. Bạn thuộc bộ phận '{user.department or 'chưa xác định'}'."

    return True, ""


@router.post("/instances/{instance_id}/action", response_model=WorkflowInstanceResponse)
def advance_workflow_instance(
    instance_id: UUID,
    payload: WorkflowInstanceAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Thực hiện hành động chuyển bước, phê duyệt hoặc từ chối trong quy trình.
    action: APPROVE, REJECT, ADVANCE, COMPLETE
    Bảo vệ nghiêm ngặt:
    - Kiểm tra role của user trên node hiện tại.
    - Kiểm tra next_node_id phải là edge đi ra từ node hiện tại.
    - Ngăn chặn nhảy bước hoặc tự COMPLETE trái phép.
    """
    inst = db.get(WorkflowInstance, instance_id)
    if not inst:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên thực thi quy trình")

    if inst.status in ["COMPLETED", "CANCELLED", "REJECTED"]:
        raise HTTPException(status_code=400, detail=f"Phiên thực thi đã kết thúc với trạng thái: {inst.status}")

    wf = inst.workflow
    nodes = list(wf.nodes or []) if wf and isinstance(wf.nodes, list) else []
    edges = list(wf.edges or []) if wf and isinstance(wf.edges, list) else []

    current_node = next((n for n in nodes if str(n.get("id")) == str(inst.current_node_id)), None)
    curr_label = current_node.get("label", inst.current_node_id) if current_node else str(inst.current_node_id)
    is_start = bool(current_node and (current_node.get("type") == "start" or (nodes and str(current_node.get("id")) == str(nodes[0].get("id")))))
    is_end = bool(current_node and current_node.get("type") == "end")

    # 1. Kiểm tra vai trò của người dùng trên node hiện tại
    can_act, reason = check_user_workflow_permission(current_user, current_node, inst, is_start_node=is_start)
    if not can_act:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Quyền truy cập bị từ chối: {reason}",
        )

    # 2. Kiểm tra action thuộc APPROVE | REJECT | ADVANCE | COMPLETE
    action_type = payload.action.upper().strip()
    ALLOWED_ACTIONS = {"APPROVE", "REJECT", "ADVANCE", "COMPLETE"}
    if action_type not in ALLOWED_ACTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Hành động '{payload.action}' không hợp lệ. Chỉ chấp nhận: {', '.join(sorted(ALLOWED_ACTIONS))}",
        )

    user_roles = [str(r.role_code).lower().strip() for r in (current_user.roles or [])]
    is_admin = "admin" in user_roles

    # 3. Kiểm tra liên kết đi ra (outgoing edges) từ node hiện tại
    outgoing_edges = [e for e in edges if str(e.get("source")) == str(inst.current_node_id)]
    allowed_target_ids = {str(e.get("target")) for e in outgoing_edges if e.get("target")}

    next_node_id = str(payload.next_node_id).strip() if payload.next_node_id else None

    if action_type in ["APPROVE", "ADVANCE"]:
        if next_node_id:
            if next_node_id not in allowed_target_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Không thể chuyển tới bước '{next_node_id}'. Đây không phải liên kết đi ra hợp lệ từ bước hiện tại '{curr_label}'. Các bước hợp lệ: {', '.join(sorted(allowed_target_ids)) if allowed_target_ids else 'Không có'}",
                )
        else:
            if outgoing_edges:
                next_node_id = str(outgoing_edges[0].get("target"))
            elif is_end:
                next_node_id = None
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Không có bước tiếp theo hợp lệ từ bước hiện tại '{curr_label}'.",
                )

    elif action_type == "REJECT":
        if next_node_id:
            raw_history = inst.history if isinstance(inst.history, list) else []
            history_nodes = {str(h.get("from_node_id")) for h in raw_history if h.get("from_node_id")}
            if next_node_id not in allowed_target_ids and next_node_id not in history_nodes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Không thể chuyển tới bước '{next_node_id}' khi từ chối. Bước này không nằm trong luồng liên kết đi ra hoặc lịch sử các bước trước đó.",
                )

    elif action_type == "COMPLETE":
        has_end_target = any(
            str(e.get("target")) in {str(n.get("id")) for n in nodes if n.get("type") == "end"}
            for e in outgoing_edges
        )
        if not (is_end or is_admin or (next_node_id and next_node_id in allowed_target_ids and any(str(n.get("id")) == next_node_id and n.get("type") == "end" for n in nodes)) or has_end_target):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Không thể tự hoàn tất (COMPLETE) quy trình từ bước '{curr_label}'. Bạn phải thực hiện tuần tự qua các bước công đoạn và chỉ hoàn tất khi kết thúc luồng quy trình.",
            )
        if not next_node_id and has_end_target:
            end_edges = [e for e in outgoing_edges if any(str(n.get("id")) == str(e.get("target")) and n.get("type") == "end" for n in nodes)]
            if end_edges:
                next_node_id = str(end_edges[0].get("target"))

    # 4. Xác định trạng thái mới
    new_status = inst.status
    if action_type == "COMPLETE" or is_end or (next_node_id and any(str(n.get("id")) == next_node_id and n.get("type") == "end" for n in nodes)):
        new_status = "COMPLETED"
    elif action_type == "REJECT" and not next_node_id:
        new_status = "REJECTED"

    next_node = next((n for n in nodes if str(n.get("id")) == str(next_node_id)), None) if next_node_id else None

    # 5. Ghi nhận lịch sử chuyển bước
    hist_entry = {
        "from_node_id": inst.current_node_id,
        "from_node_label": curr_label,
        "to_node_id": next_node_id,
        "to_node_label": next_node.get("label") if next_node else ("Hoàn tất quy trình" if new_status == "COMPLETED" else "Kết thúc từ chối"),
        "action": action_type,
        "action_by": current_user.full_name or "Nhân viên",
        "action_by_id": str(current_user.user_id),
        "action_at": datetime.now(timezone.utc).isoformat(),
        "comments": payload.comments or f"Hành động {action_type}",
    }

    current_history = list(inst.history) if isinstance(inst.history, list) else []
    current_history.append(hist_entry)

    inst.history = current_history
    if next_node_id:
        inst.current_node_id = next_node_id
    inst.status = new_status
    inst.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(inst)
    return format_instance_out(inst)

# ==================== 4. SEED DEFAULTS (BIỂU MẪU & QUY TRÌNH MẪU CHUẨN ISO) ====================
@router.post("/seed-defaults", status_code=status.HTTP_200_OK)
def seed_default_builders(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("admin")),
):
    """Tự động nạp các biểu mẫu và quy trình mẫu chuẩn ISO 22000:2018 cho toàn bộ các phân hệ."""
    if not demo_seed_enabled():
        raise HTTPException(status_code=404, detail="Demo data seeding is disabled")
    
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

    # 8. Mẫu Workflow AUDIT_FLOW (Quy trình 4 Bước Đánh Giá Nội Bộ)
    wf_audit = db.scalar(select(DynamicWorkflowTemplate).where(DynamicWorkflowTemplate.code == "WF-AUDIT-4STEPS"))
    if not wf_audit:
        wf_audit = DynamicWorkflowTemplate(
            module="INTERNAL_AUDIT",
            code="WF-AUDIT-4STEPS",
            title="Quy Trình 4 Bước Đánh Giá Nội Bộ",
            description="Quy trình chuẩn mực đánh giá độc lập: Lập kế hoạch & Chuẩn bị Checklist -> Đánh giá tại hiện trường -> Lập báo cáo phát hiện -> Thẩm tra khắc phục CAPA.",
            version="1.0",
            nodes=[
                {"id": "a_1", "type": "process", "label": "1. Lập Kế Hoạch & Soạn Checklist", "role": "Ban QLCL & ATTP", "description": "Xác định phạm vi, chuẩn mực áp dụng và phân công đánh giá chéo.", "is_ccp": False, "step_number": 1},
                {"id": "a_2", "type": "process", "label": "2. Thực Hiện Đánh Giá Tại Chỗ", "role": "Ban QLCL & ATTP", "description": "Phỏng vấn nhân sự, kiểm tra hồ sơ ghi chép và quan sát hiện trường sản xuất.", "is_ccp": False, "step_number": 2},
                {"id": "a_3", "type": "approval", "label": "3. Họp Tổng Kết & Báo Cáo Phát Hiện", "role": "Ban Giám đốc", "description": "Thống nhất phân loại lỗi (Conformity / Major NC / Minor NC / OFI) và ký biên bản.", "is_ccp": False, "step_number": 3},
                {"id": "a_4", "type": "process", "label": "4. Theo Dõi & Thẩm Tra Khắc Phục CAPA", "role": "Ban QLCL & ATTP", "description": "Giám sát các hành động khắc phục phòng ngừa và đóng hồ sơ sau 30 ngày.", "is_ccp": False, "step_number": 4},
            ],
            edges=[
                {"id": "ea1_2", "source": "a_1", "target": "a_2", "label": "Triển khai đánh giá"},
                {"id": "ea2_3", "source": "a_2", "target": "a_3", "label": "Lập danh mục phát hiện"},
                {"id": "ea3_4", "source": "a_3", "target": "a_4", "label": "Phê duyệt & Chuyển CAPA"},
            ],
            status="ACTIVE"
        )
        db.add(wf_audit)

    db.commit()
    return {"message": "Đã khởi tạo thành công 4 Biểu mẫu Động và 4 Quy trình Mẫu chuẩn ISO 22000:2018!"}
