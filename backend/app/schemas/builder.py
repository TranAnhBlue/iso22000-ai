from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

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
class WorkflowNode(BaseModel):
    id: str = Field(..., description="Node ID, e.g. node_1")
    type: str = Field(default="process", description="process, ccp_check, approval, decision, notification, end")
    label: str = Field(..., description="Tên bước công đoạn / hành động")
    role: Optional[str] = Field(default="QC / Trưởng ca", description="Vai trò phụ trách")
    description: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None
    is_ccp: Optional[bool] = False
    step_number: Optional[int] = 1

class WorkflowEdge(BaseModel):
    id: str = Field(..., description="Edge ID, e.g. edge_1_2")
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    label: Optional[str] = None
    condition: Optional[str] = None

class DynamicWorkflowTemplateBase(BaseModel):
    module: str = Field(..., max_length=50, description="HACCP_FLOW, DOC_APPROVAL, SUPPLIER_APPROVAL, CAPA_FLOW, AUDIT_FLOW, GENERAL")
    code: str = Field(..., max_length=50, description="Mã quy trình, ví dụ: WF-HACCP-01")
    title: str = Field(..., max_length=255, description="Tên quy trình / Sơ đồ luồng")
    description: Optional[str] = None
    version: str = Field(default="1.0", max_length=20)
    nodes: List[WorkflowNode] = Field(default_factory=list)
    edges: List[WorkflowEdge] = Field(default_factory=list)
    status: str = Field(default="ACTIVE", max_length=30)

class DynamicWorkflowTemplateCreate(DynamicWorkflowTemplateBase):
    pass

class DynamicWorkflowTemplateUpdate(BaseModel):
    module: Optional[str] = None
    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    nodes: Optional[List[WorkflowNode]] = None
    edges: Optional[List[WorkflowEdge]] = None
    status: Optional[str] = None

class DynamicWorkflowTemplateResponse(DynamicWorkflowTemplateBase):
    workflow_id: UUID
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
