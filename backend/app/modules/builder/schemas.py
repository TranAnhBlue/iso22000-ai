from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator

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
    # A new controlled document must be reviewed before it can be used.
    status: str = Field(default="DRAFT", max_length=30)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.strip().upper()
        if normalized not in {"DRAFT", "ACTIVE", "ARCHIVED", "INACTIVE"}:
            raise ValueError("Trạng thái biểu mẫu chỉ có thể là DRAFT, ACTIVE, ARCHIVED hoặc INACTIVE.")
        return normalized

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

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        normalized = value.strip().upper()
        if normalized not in {"DRAFT", "ACTIVE", "ARCHIVED", "INACTIVE"}:
            raise ValueError("Trạng thái biểu mẫu chỉ có thể là DRAFT, ACTIVE, ARCHIVED hoặc INACTIVE.")
        return normalized

class DynamicFormTemplateResponse(DynamicFormTemplateBase):
    template_id: UUID
    is_approved: bool = True
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    change_history: Optional[List[Any]] = []
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

    node_ids: set[str] = set()
    for idx, node in enumerate(nodes):
        if not node.id or not node.id.strip():
            raise ValueError(f"Node tại vị trí {idx + 1} không có ID hợp lệ.")
        node_id_clean = node.id.strip()
        if node_id_clean in node_ids:
            raise ValueError(f"Trùng lặp node ID: '{node_id_clean}'. Mỗi bước công đoạn phải có mã duy nhất.")
        node_ids.add(node_id_clean)

        if not node.label or not node.label.strip():
            raise ValueError(f"Node '{node_id_clean}' chưa có tên bước công đoạn (label).")

        if node.type:
            node_type_clean = node.type.strip().lower()
            if node_type_clean not in VALID_NODE_TYPES:
                raise ValueError(f"Loại node '{node.type}' tại bước '{node_id_clean}' không hợp lệ. Các loại cho phép: {', '.join(sorted(VALID_NODE_TYPES))}")

        if node.step_number is not None and node.step_number < 1:
            raise ValueError(f"Số thứ tự bước (step_number) của node '{node_id_clean}' phải là số nguyên dương (>= 1).")

        if node.role is not None and not node.role.strip():
            raise ValueError(f"Vai trò phụ trách (role) của node '{node_id_clean}' không được để trống.")

    edge_ids: set[str] = set()
    edge_pairs: set[tuple[str, str]] = set()
    adj: Dict[str, List[str]] = {nid: [] for nid in node_ids}

    for idx, edge in enumerate(edges):
        if not edge.id or not edge.id.strip():
            raise ValueError(f"Đường liên kết tại vị trí {idx + 1} không có ID hợp lệ.")
        edge_id_clean = edge.id.strip()
        if edge_id_clean in edge_ids:
            raise ValueError(f"Trùng lặp mã liên kết (edge ID): '{edge_id_clean}'.")
        edge_ids.add(edge_id_clean)

        src = edge.source.strip()
        tgt = edge.target.strip()

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
        adj[src].append(tgt)

    # 1. Kiểm tra chu trình có hướng (Directed cycle detection via DFS coloring)
    visited_state: Dict[str, int] = {}  # 0: unvisited, 1: visiting, 2: visited
    def dfs_cycle(u: str, path: List[str]) -> Optional[List[str]]:
        visited_state[u] = 1
        for v in adj.get(u, []):
            if visited_state.get(v, 0) == 1:
                idx = path.index(v) if v in path else 0
                return path[idx:] + [v]
            elif visited_state.get(v, 0) == 0:
                cycle_found = dfs_cycle(v, path + [v])
                if cycle_found:
                    return cycle_found
        visited_state[u] = 2
        return None

    for nid in node_ids:
        if visited_state.get(nid, 0) == 0:
            cycle = dfs_cycle(nid, [nid])
            if cycle:
                cycle_str = " -> ".join(cycle)
                raise ValueError(f"Quy trình bị vòng lặp vô hạn (cycle: {cycle_str}). Các bước phê duyệt/công đoạn phải tiến triển một chiều đến kết thúc.")

    # 2. Kiểm tra tính toàn vẹn điểm bắt đầu (Start) và kết thúc (End) khi quy trình có liên kết
    if len(nodes) >= 2 and edges:
        start_nodes = [n for n in nodes if (n.type or "").strip().lower() in ["start", "startnode"]]
        end_nodes = [n for n in nodes if (n.type or "").strip().lower() in ["end", "endnode"]]

        if start_nodes:
            start_ids = {n.id.strip() for n in start_nodes}
        else:
            in_degrees = {nid: 0 for nid in node_ids}
            for edge in edges:
                in_degrees[edge.target.strip()] = in_degrees.get(edge.target.strip(), 0) + 1
            start_ids = {nid for nid, deg in in_degrees.items() if deg == 0}

        if end_nodes:
            end_ids = {n.id.strip() for n in end_nodes}
        else:
            end_ids = {nid for nid, tgts in adj.items() if len(tgts) == 0}

        if not start_ids:
            raise ValueError("Quy trình không có điểm bắt đầu (start node) hợp lệ.")
        if not end_ids:
            raise ValueError("Quy trình không có điểm kết thúc (end node) hợp lệ.")

        # Kiểm tra tính tới được (reachability): Từ ít nhất một điểm bắt đầu phải đến được điểm kết thúc
        reachable_nodes: set[str] = set()
        queue = list(start_ids)
        visited_nodes = set(queue)
        while queue:
            curr = queue.pop(0)
            reachable_nodes.add(curr)
            for nxt in adj.get(curr, []):
                if nxt not in visited_nodes:
                    visited_nodes.add(nxt)
                    queue.append(nxt)

        if not (end_ids & reachable_nodes):
            raise ValueError("Không tìm thấy đường đi hoàn chỉnh từ điểm bắt đầu (start) đến điểm kết thúc (end). Quy trình không thể hoàn tất.")



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
    status: str = Field(default="DRAFT", max_length=30)

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
    is_approved: bool = True
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime] = None
    change_history: Optional[List[Any]] = []
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

ALLOWED_WORKFLOW_ACTIONS = {"APPROVE", "REJECT", "ADVANCE", "COMPLETE"}

class WorkflowInstanceAction(BaseModel):
    action: str = Field(..., description="APPROVE, REJECT, ADVANCE, COMPLETE")
    next_node_id: Optional[str] = None
    comments: Optional[str] = None

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        act = v.strip().upper()
        if act not in ALLOWED_WORKFLOW_ACTIONS:
            raise ValueError(f"Hành động '{v}' không hợp lệ. Phải thuộc một trong các hành động: {', '.join(sorted(ALLOWED_WORKFLOW_ACTIONS))}")
        return act

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
    workflow_snapshot: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)
