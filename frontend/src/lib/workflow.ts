import type { WorkflowNodeData, WorkflowTemplateData } from "@/components/builder/types";

export function normalizeWorkflowForSave(workflow: WorkflowTemplateData) {
  return {
    module: workflow.module.trim().toUpperCase(),
    code: workflow.code.trim(),
    title: workflow.title.trim(),
    description: workflow.description?.trim() || undefined,
    version: workflow.version.trim() || "1.0",
    status: "DRAFT",
    nodes: workflow.nodes.map((node, index) => {
      const legacyConditions = (node as WorkflowNodeData & { conditions?: unknown }).conditions;
      return {
        id: String(node.id || "").trim(),
        type: String(node.type || "process")
          .trim()
          .toLowerCase(),
        label: String(node.label || "").trim(),
        role: node.role?.trim() || undefined,
        description: node.description?.trim() || undefined,
        ...(legacyConditions &&
        typeof legacyConditions === "object" &&
        !Array.isArray(legacyConditions)
          ? { conditions: legacyConditions }
          : {}),
        is_ccp: Boolean(node.is_ccp),
        step_number: index + 1,
      };
    }),
    edges: workflow.edges.map((edge) => ({
      id: String(edge.id || "").trim(),
      source: String(edge.source || "").trim(),
      target: String(edge.target || "").trim(),
      label: edge.label?.trim() || undefined,
      condition: edge.condition?.trim() || undefined,
    })),
  };
}

export function workflowErrorMessage(err: any): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item: any) => {
        const path = Array.isArray(item?.loc)
          ? item.loc.filter((part: unknown) => part !== "body").join(".")
          : "";
        return `${path ? `${path}: ` : ""}${item?.msg || "Dữ liệu không hợp lệ"}`;
      })
      .join("; ");
  }
  if (detail && typeof detail === "object")
    return detail.message || detail.msg || JSON.stringify(detail);
  return err?.message || "Không thể kết nối máy chủ.";
}
