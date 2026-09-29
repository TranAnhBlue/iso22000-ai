from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator

# ==================== 1. FORM BUILDER SCHEMAS ====================
class FormFieldDefinition(BaseModel):
    id: str = Field(..., description="Unique field identifier, e.g., field_temp_1")
    name: str = Field(..., description="Field code / variable name")
    label: str = Field(..., description="Display label in Vietnamese")
    type: str = Field(..., description="TEXT, NUMBER, SELECT, MULTISELECT, RADIO, CHECKBOX, RATING, DATE, TIME, YESNO, SIGNATURE, PHOTO")
    placeholder: Optional[str] = None
    required: bool = False
    options: Optional[List[str]] = None  # Dropdown / radio / checkbox options
    min_val: Optional[float] = None
    max_val: Optional[float] = None
    unit: Optional[str] = None
    default_value: Optional[Any] = None
    help_text: Optional[str] = None

class DynamicFormTemplateBase(BaseModel):
    module: str = Field(..., max_length=50, description="HACCP, PRP, IQC, SUPPLIER_AUDIT, EQUIPMENT, CAPA, INTERNAL_AUDIT, GENERAL")
    code: str = Field(..., max_length=50, description="Mã biểu mẫu, ví dụ: FORM-GMP-01")
    title: str = Field(..., max_length=255, description="Tên biểu mẫu")
    description: Optional[str] = None
    version: str = Field(default="1.0", max_length=20)
    fields: List[FormFieldDefinition] = Field(default_factory=list)
    status: str = Field(default="ACTIVE", max_length=30)

class DynamicFormTemplateCreate(DynamicFormTemplateBase):
    pass

class DynamicFormTemplateUpdate(BaseModel):
    module: Optional[str] = None
    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    fields: Optional[List[FormFieldDefinition]] = None
    status: Optional[str] = None

class DynamicFormTemplateResponse(DynamicFormTemplateBase):
    template_id: UUID
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    submission_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# ==================== 2. FORM SUBMISSION SCHEMAS ====================
from typing import Union

class DynamicFormSubmissionCreate(BaseModel):
    template_id: Union[UUID, str]
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    submitted_by_name: Optional[str] = "QC Ca"
    form_data: Dict[str, Any] = Field(..., description="Key-value pairs of user input responses")
    score: Optional[float] = None
    status: str = Field(default="COMPLETED", max_length=30)

class DynamicFormSubmissionResponse(BaseModel):
    submission_id: UUID
    template_id: UUID
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    submitted_by: Optional[UUID] = None
    submitted_by_name: Optional[str] = None
    form_data: Dict[str, Any]
    score: Optional[float] = None
    status: str
    created_at: Optional[datetime] = None
    template_title: Optional[str] = None
    template_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== 3. WORKFLOW BUILDER SCHEMAS ====================
VALID_NODE_TYPES = {
    "process", "ccp_check", "oprp_check", "approval", "decision", 
    "notification", "end", "start", "custom"
}

VALID_WORKFLOW_STATUSES = {
    "ACTIVE", "DRAFT", "ARCHIVED", "INACTIVE"
}

VALID_WORKFLOW_MODULES = {
    "HACCP_FLOW", "DOC_APPROVAL", "SUPPLIER_APPROVAL", "CAPA_FLOW", 
    "AUDIT_FLOW", "INTERNAL_AUDIT", "GENERAL", "AUDITS", "HACCP", 
    "DOCUMENTS", "PURCHASING", "CAPA", "EQUIPMENT", "EMERGENCY", "CHANGE_MANAGEMENT"
}

def validate_workflow_structure(
    nodes: List["WorkflowNode"],
    edges: List["WorkflowEdge"],
    module: Optional[str] = None,
    status: Optional[str] = None,
):
    if module is not None and module.strip().upper() not in VALID_WORKFLOW_MODULES:
        raise ValueError(f"Module '{module}' không hợp lệ. Phải thuộc một trong các module FSMS: {', '.join(sorted(VALID_WORKFLOW_MODULES))}")

    if status is not None and status.strip().upper() not in VALID_WORKFLOW_STATUSES:
        raise ValueError(f"Trạng thái workflow '{status}' không hợp lệ. Các trạng thái cho phép: {', '.join(sorted(VALID_WORKFLOW_STATUSES))}")

    if not nodes:
        raise ValueError("Quy trình phải chứa ít nhất 1 node công đoạn.")

    node_ids = set()
    for idx, node in enumerate(nodes):
        if not node.id or not str(node.id).strip():
            raise ValueError(f"Node tại vị trí {idx + 1} không có ID hợp lệ.")
        node_id_clean = str(node.id).strip()
        if node_id_clean in node_ids:
            raise ValueError(f"Trùng lặp node ID: '{node_id_clean}'. Mỗi bước công đoạn phải có mã duy nhất.")
        node_ids.add(node_id_clean)

        if not node.label or not str(node.label).strip():
            raise ValueError(f"Node '{node_id_clean}' chưa có tên bước công đoạn (label).")

        if node.type:
            node_type_clean = str(node.type).strip().lower()
            if node_type_clean not in VALID_NODE_TYPES:
                raise ValueError(f"Loại node '{node.type}' tại bước '{node_id_clean}' không hợp lệ. Các loại cho phép: {', '.join(sorted(VALID_NODE_TYPES))}")

        if node.step_number is not None and node.step_number < 1:
            raise ValueError(f"Số thứ tự bước (step_number) của node '{node_id_clean}' phải là số nguyên dương (>= 1).")

        if node.role is not None and not str(node.role).strip():
            raise ValueError(f"Vai trò phụ trách (role) của node '{node_id_clean}' không được để trống.")

    edge_ids = set()
    edge_pairs = set()
    for idx, edge in enumerate(edges):
        if not edge.id or not str(edge.id).strip():
            raise ValueError(f"Đường liên kết tại vị trí {idx + 1} không có ID hợp lệ.")
        edge_id_clean = str(edge.id).strip()
        if edge_id_clean in edge_ids:
            raise ValueError(f"Trùng lặp mã liên kết (edge ID): '{edge_id_clean}'.")
        edge_ids.add(edge_id_clean)

        src = str(edge.source).strip()
        tgt = str(edge.target).strip()

        if src not in node_ids:
            raise ValueError(f"Liên kết '{edge_id_clean}' có điểm bắt đầu (source='{src}') không tồn tại trong danh sách node.")
        if tgt not in node_ids:
            raise ValueError(f"Liên kết '{edge_id_clean}' có điểm kết thúc (target='{tgt}') không tồn tại trong danh sách node.")

        if src == tgt:
            raise ValueError(f"Liên kết '{edge_id_clean}' không hợp lệ: Node '{src}' không được tự trỏ đến chính nó (self-loop).")

        pair = (src, tgt)
        if pair in edge_pairs:
            raise ValueError(f"Đã tồn tại đường liên kết từ node '{src}' tới node '{tgt}'. Không được khai báo trùng lặp.")
        edge_pairs.add(pair)


class WorkflowNode(BaseModel):
    id: str = Field(..., description="Node ID, e.g. node_1")
    type: str = Field(default="process", description="process, ccp_check, oprp_check, approval, decision, notification, end, start")
    label: str = Field(..., description="Tên bước công đoạn / hành động")
    role: Optional[str] = Field(default="QC / Trưởng ca", description="Vai trò phụ trách")
    description: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None
    is_ccp: Optional[bool] = False
    step_number: Optional[int] = 1

    model_config = ConfigDict(extra="ignore")

class WorkflowEdge(BaseModel):
    id: str = Field(..., description="Edge ID, e.g. edge_1_2")
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    label: Optional[str] = None
    condition: Optional[str] = None

    model_config = ConfigDict(extra="ignore")

class DynamicWorkflowTemplateBase(BaseModel):
    workflow_id: Optional[Union[UUID, str]] = None
    module: str = Field(..., max_length=50, description="HACCP_FLOW, DOC_APPROVAL, SUPPLIER_APPROVAL, CAPA_FLOW, AUDIT_FLOW, GENERAL")
    code: str = Field(..., max_length=50, description="Mã quy trình, ví dụ: WF-HACCP-01")
    title: str = Field(..., max_length=255, description="Tên quy trình / Sơ đồ luồng")
    description: Optional[str] = None
    version: str = Field(default="1.0", max_length=20)
    nodes: List[WorkflowNode] = Field(default_factory=list)
    edges: List[WorkflowEdge] = Field(default_factory=list)
    status: str = Field(default="ACTIVE", max_length=30)

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="after")
    def validate_workflow_graph(self):
        validate_workflow_structure(self.nodes, self.edges, self.module, self.status)
        return self

class DynamicWorkflowTemplateCreate(DynamicWorkflowTemplateBase):
    model_config = ConfigDict(extra="ignore")

class DynamicWorkflowTemplateUpdate(BaseModel):
    module: Optional[str] = None
    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    nodes: Optional[List[WorkflowNode]] = None
    edges: Optional[List[WorkflowEdge]] = None
    status: Optional[str] = None

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="after")
    def validate_update_graph(self):
        if self.status is not None and self.status.strip().upper() not in VALID_WORKFLOW_STATUSES:
            raise ValueError(f"Trạng thái workflow '{self.status}' không hợp lệ. Các trạng thái cho phép: {', '.join(sorted(VALID_WORKFLOW_STATUSES))}")
        if self.module is not None and self.module.strip().upper() not in VALID_WORKFLOW_MODULES:
            raise ValueError(f"Module '{self.module}' không hợp lệ. Phải thuộc một trong các module FSMS: {', '.join(sorted(VALID_WORKFLOW_MODULES))}")
        if self.nodes is not None and self.edges is not None:
            validate_workflow_structure(self.nodes, self.edges, self.module, self.status)
        return self

class DynamicWorkflowTemplateResponse(DynamicWorkflowTemplateBase):
    workflow_id: Optional[Union[UUID, str]] = None
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    instance_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# ==================== 4. WORKFLOW INSTANCE SCHEMAS ====================
class WorkflowInstanceCreate(BaseModel):
    workflow_id: UUID
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    initial_node_id: Optional[str] = None

class WorkflowInstanceAction(BaseModel):
    action: str = Field(..., description="APPROVE, REJECT, ADVANCE, COMPLETE")
    next_node_id: Optional[str] = None
    comments: Optional[str] = None

class WorkflowInstanceResponse(BaseModel):
    instance_id: UUID
    workflow_id: UUID
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    current_node_id: str
    history: List[Dict[str, Any]] = []
    status: str
    started_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    workflow_title: Optional[str] = None
    workflow_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
