export interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  min_val?: number;
  max_val?: number;
  unit?: string;
  default_value?: any;
  help_text?: string;
}

export interface FormTemplateData {
  template_id?: string;
  module: string;
  code: string;
  title: string;
  description?: string;
  version: string;
  fields: FormField[];
  status: string;
}

export interface WorkflowNodeData {
  id: string;
  type: string; // 'process', 'ccp_check', 'approval', 'decision', 'notification', 'end'
  label: string;
  role?: string;
  description?: string;
  is_ccp?: boolean;
  step_number?: number;
}

export interface WorkflowEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface WorkflowTemplateData {
  workflow_id?: string;
  module: string;
  code: string;
  title: string;
  description?: string;
  version: string;
  nodes: WorkflowNodeData[];
  edges: WorkflowEdgeData[];
  status: string;
}
