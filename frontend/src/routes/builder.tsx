import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import {
  Layers,
  Plus,
  FileText,
  Workflow,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  Play,
  RotateCcw,
  Sliders,
  Calendar,
  Clock,
  User,
  Hash,
  Download,
  ListFilter,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { FormBuilder } from "@/components/builder/FormBuilder";
import { DynamicFormRenderer } from "@/components/builder/DynamicFormRenderer";
import { WorkflowBuilder } from "@/components/builder/WorkflowBuilder";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  FormTemplateData,
  WorkflowNodeData,
  WorkflowTemplateData,
} from "@/components/builder/types";
import { useModuleAccess } from "@/lib/rbac";
import { EmptyState } from "@/components/EmptyState";
import { ModuleGuideModal } from "@/components/ModuleGuideModal";
import { WorkflowGuideModal } from "@/components/WorkflowGuideModal";

export const Route = createFileRoute("/builder")({
  component: BuilderManagementPage,
});

function BuilderManagementPage() {
  const { canEdit, isAdmin } = useModuleAccess();
  const [activeTab, setActiveTab] = useState<"FORMS" | "WORKFLOWS" | "SUBMISSIONS" | "INSTANCES">(
    "FORMS",
  );
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showWfGuide, setShowWfGuide] = useState(false);

  // Forms state
  const [forms, setForms] = useState<FormTemplateData[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [searchForm, setSearchForm] = useState<string>("");
  const [editingForm, setEditingForm] = useState<FormTemplateData | null>(null);
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [testingForm, setTestingForm] = useState<FormTemplateData | null>(null);

  // Workflows state
  const [workflows, setWorkflows] = useState<WorkflowTemplateData[]>([]);
  const [selectedWfModule, setSelectedWfModule] = useState<string>("ALL");
  const [searchWf, setSearchWf] = useState<string>("");
  const [editingWf, setEditingWf] = useState<WorkflowTemplateData | null>(null);
  const [isCreatingWf, setIsCreatingWf] = useState(false);

  // Submissions state
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [viewingSubmission, setViewingSubmission] = useState<any | null>(null);
  const [instances, setInstances] = useState<any[]>([]);
  const [pendingInstanceAction, setPendingInstanceAction] = useState<{
    instanceId: string;
    action: "ADVANCE" | "APPROVE" | "REJECT";
    title: string;
  } | null>(null);
  const [instanceComments, setInstanceComments] = useState("");
  const [instanceActionSaving, setInstanceActionSaving] = useState(false);

  // Deleting confirmation states
  const [deletingFormItem, setDeletingFormItem] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [deletingWfItem, setDeletingWfItem] = useState<{ id: string; title: string } | null>(null);

  // Fetch Forms
  const fetchForms = async () => {
    setLoading(true);
    try {
      const res = await api.get("/builders/forms");
      setForms(res.data);
    } catch (err: any) {
      console.error("Lỗi tải biểu mẫu:", err);
      toast.error("Không thể tải danh sách biểu mẫu!");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Workflows
  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await api.get("/builders/workflows");
      setWorkflows(res.data);
    } catch (err: any) {
      console.error("Lỗi tải quy trình:", err);
      toast.error("Không thể tải danh sách quy trình!");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Submissions
  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await api.get("/builders/submissions");
      setSubmissions(res.data);
    } catch (err: any) {
      console.error("Lỗi tải lịch sử điền:", err);
      toast.error("Không thể tải lịch sử nộp dữ liệu!");
    } finally {
      setLoading(false);
    }
  };

  const fetchInstances = async () => {
    try {
      const res = await api.get("/builders/instances");
      setInstances(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể tải phiên thực thi quy trình.");
    }
  };

  useEffect(() => {
    fetchForms();
    fetchWorkflows();
    fetchSubmissions();
    fetchInstances();
  }, []);

  // Save Form Template
  const handleSaveForm = async (formData: FormTemplateData) => {
    try {
      if (formData.template_id) {
        await api.put(`/builders/forms/${formData.template_id}`, formData);
        toast.success("Cập nhật biểu mẫu thành công!");
      } else {
        await api.post("/builders/forms", formData);
        toast.success("Tạo biểu mẫu mới thành công!");
      }
      setEditingForm(null);
      setIsCreatingForm(false);
      await fetchForms();
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || err.message);
    }
  };

  const handleApproveForm = async (form: FormTemplateData) => {
    if (!form.template_id) return;
    try {
      await api.post(`/builders/forms/${form.template_id}/approve`);
      toast.success(`Đã phê duyệt biểu mẫu "${form.title}".`);
      await fetchForms();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể phê duyệt biểu mẫu.");
    }
  };

  // Delete Form
  const executeDeleteForm = async (templateId: string, title?: string) => {
    try {
      await api.delete(`/builders/forms/${templateId}`);
      toast.success(`Đã xóa biểu mẫu "${title || ""}" thành công!`);
      await fetchForms();
    } catch (err: any) {
      toast.error("Lỗi khi xóa biểu mẫu: " + (err.response?.data?.detail || err.message));
    }
  };

  const getApiErrorMessage = (err: any): string => {
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
    if (detail && typeof detail === "object") {
      return detail.message || detail.msg || JSON.stringify(detail);
    }
    return err?.message || "Không thể kết nối máy chủ.";
  };

  const normalizeWorkflowForSave = (workflow: WorkflowTemplateData) => ({
    module: workflow.module.trim().toUpperCase(),
    code: workflow.code.trim(),
    title: workflow.title.trim(),
    description: workflow.description?.trim() || undefined,
    version: workflow.version.trim() || "1.0",
    // Sửa định nghĩa workflow tạo một bản nháp cần được phê duyệt lại.
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
  });

  // Save Workflow Template
  const handleSaveWorkflow = async (wfData: WorkflowTemplateData) => {
    try {
      const payload = normalizeWorkflowForSave(wfData);
      if (wfData.workflow_id) {
        await api.put(`/builders/workflows/${wfData.workflow_id}`, payload);
        toast.success(
          "Đã cập nhật quy trình ở trạng thái Bản nháp; cần phê duyệt lại trước khi áp dụng.",
        );
      } else {
        await api.post("/builders/workflows", payload);
        toast.success("Đã tạo quy trình ở trạng thái Bản nháp; cần phê duyệt trước khi áp dụng.");
      }
      setEditingWf(null);
      setIsCreatingWf(false);
      await fetchWorkflows();
    } catch (err: any) {
      throw new Error(getApiErrorMessage(err));
    }
  };

  const handleApproveWorkflow = async (workflow: WorkflowTemplateData) => {
    if (!workflow.workflow_id) return;
    try {
      await api.post(`/builders/workflows/${workflow.workflow_id}/approve`);
      toast.success(`Đã phê duyệt quy trình "${workflow.title}".`);
      await fetchWorkflows();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể phê duyệt quy trình.");
    }
  };

  const handleStartWorkflow = async (workflow: WorkflowTemplateData) => {
    if (!workflow.workflow_id) return;
    try {
      await api.post(`/builders/workflows/${workflow.workflow_id}/instances`, {
        workflow_id: workflow.workflow_id,
        reference_type: workflow.module,
      });
      toast.success(`Đã khởi tạo phiên thực thi "${workflow.title}".`);
      await fetchInstances();
      setActiveTab("INSTANCES");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể khởi tạo quy trình.");
    }
  };

  const openInstanceAction = (
    instanceId: string,
    action: "ADVANCE" | "APPROVE" | "REJECT",
    title: string,
  ) => {
    setInstanceComments("");
    setPendingInstanceAction({ instanceId, action, title });
  };

  const handleInstanceAction = async () => {
    if (!pendingInstanceAction) return;
    if (pendingInstanceAction.action === "REJECT" && !instanceComments.trim()) {
      toast.error("Phải nhập lý do từ chối để lưu vào hồ sơ quy trình.");
      return;
    }
    setInstanceActionSaving(true);
    try {
      await api.post(`/builders/instances/${pendingInstanceAction.instanceId}/action`, {
        action: pendingInstanceAction.action,
        comments: instanceComments.trim() || undefined,
      });
      toast.success(
        pendingInstanceAction.action === "REJECT"
          ? "Đã từ chối phiên quy trình."
          : "Đã cập nhật bước quy trình.",
      );
      await fetchInstances();
      setPendingInstanceAction(null);
    } catch (err: any) {
      toast.error(
        err.response?.data?.detail || "Bạn không có quyền hoặc phiên không thể chuyển bước.",
      );
    } finally {
      setInstanceActionSaving(false);
    }
  };

  const exportInstanceHistory = (instance: any) => {
    const rows = [
      ["Quy trình", instance.workflow_title || instance.workflow_code || ""],
      ["Mã quy trình", instance.workflow_code || ""],
      ["Trạng thái", instance.status || ""],
      [],
      ["Thời gian", "Hành động", "Từ bước", "Đến bước", "Người xử lý", "Ghi chú"],
      ...(instance.history || []).map((entry: any) => [
        entry.action_at ? new Date(entry.action_at).toLocaleString("vi-VN") : "",
        entry.action || "",
        entry.from_node_label || entry.node_label || "",
        entry.to_node_label || "",
        entry.action_by || "",
        entry.comments || "",
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `workflow-history-${instance.workflow_code || instance.instance_id}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // Delete Workflow
  const executeDeleteWorkflow = async (wfId: string, title?: string) => {
    try {
      await api.delete(`/builders/workflows/${wfId}`);
      toast.success(`Đã xóa quy trình "${title || ""}" thành công!`);
      await fetchWorkflows();
    } catch (err: any) {
      toast.error("Lỗi khi xóa quy trình: " + (err.response?.data?.detail || err.message));
    }
  };

  // Submit test form data
  const handleTestSubmit = async (formData: Record<string, any>) => {
    if (!testingForm?.template_id) return;
    try {
      await api.post("/builders/submissions", {
        template_id: testingForm.template_id,
        submitted_by_name: "Chuyên viên QA/QC (Thử nghiệm)",
        form_data: formData,
        status: "COMPLETED",
      });
      toast.success("Đã lưu kết quả điền phiếu thành công!");
      setTestingForm(null);
      await fetchSubmissions();
      setActiveTab("SUBMISSIONS");
    } catch (err: any) {
      toast.error("Lỗi khi gửi kết quả: " + (err.response?.data?.detail || err.message));
    }
  };

  // Filtered forms
  const filteredForms = forms.filter((f) => {
    const matchMod = selectedModule === "ALL" || f.module === selectedModule;
    const matchSearch =
      !searchForm.trim() ||
      f.title.toLowerCase().includes(searchForm.toLowerCase()) ||
      f.code.toLowerCase().includes(searchForm.toLowerCase());
    return matchMod && matchSearch;
  });

  // Filtered workflows
  const filteredWorkflows = workflows.filter((w) => {
    const matchMod = selectedWfModule === "ALL" || w.module === selectedWfModule;
    const matchSearch =
      !searchWf.trim() ||
      w.title.toLowerCase().includes(searchWf.toLowerCase()) ||
      w.code.toLowerCase().includes(searchWf.toLowerCase());
    return matchMod && matchSearch;
  });

  return (
    <AppShell module="builder">
      <div className="space-y-6 pb-12 font-sans">
        {/* Page Header */}
        <PageHeader
          title="Trung Tâm Quản Lý Biểu Mẫu & Quy Trình Động"
          description="Tùy biến linh hoạt mọi biểu mẫu checklist kiểm tra, phiếu nghiệm thu IQC, nhật ký đo đạc CCP và thiết kế lưu đồ công đoạn tuần tự theo chuẩn ISO 22000:2018."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowGuide(true)}
                className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Hướng Dẫn Nghiệp Vụ
              </Button>
            </div>
          }
        />

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-3">
          <button
            onClick={() => setActiveTab("FORMS")}
            className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "FORMS"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Biểu Mẫu Tùy Chỉnh
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {forms.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("INSTANCES")}
            className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "INSTANCES"
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Clock className="w-4 h-4" />
            Phiên Thực Thi
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 font-bold">
              {instances.filter((item) => item.status === "IN_PROGRESS").length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("WORKFLOWS")}
            className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "WORKFLOWS"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Workflow className="w-4 h-4" />
            Lưu Đồ & Quy Trình
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
              {workflows.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("SUBMISSIONS")}
            className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "SUBMISSIONS"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Lịch Sử Phiếu Đã Nộp
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
              {submissions.length}
            </span>
          </button>
        </div>

        {/* TAB 1: FORM STUDIO */}
        {activeTab === "FORMS" && (
          <div className="space-y-6">
            {/* Action & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchForm}
                    onChange={(e) => setSearchForm(e.target.value)}
                    placeholder="Tìm theo tên hoặc mã..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none font-medium"
                >
                  <option value="ALL">Tất cả phân hệ</option>
                  <option value="HACCP">HACCP & Điểm CCP</option>
                  <option value="PRP">PRP / GMP / SSOP</option>
                  <option value="IQC">IQC Nguyên liệu</option>
                  <option value="SUPPLIER_AUDIT">Đánh giá NCC</option>
                  <option value="EQUIPMENT">Thiết bị & Bảo trì</option>
                  <option value="CAPA">CAPA Sự cố</option>
                  <option value="INTERNAL_AUDIT">Đánh giá nội bộ</option>
                </select>
              </div>

              {canEdit && (
                <Button
                  onClick={() => {
                    setEditingForm(null);
                    setIsCreatingForm(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 flex items-center gap-2 shadow-sm w-full sm:w-auto justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Tạo Biểu Mẫu Mới
                </Button>
              )}
            </div>

            {/* Forms Grid List */}
            {filteredForms.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Chưa có biểu mẫu nào"
                description="Hệ thống chưa có biểu mẫu tùy chỉnh nào. Bạn có thể tạo biểu mẫu mới để bắt đầu số hóa quy trình kiểm tra."
                actionLabel={canEdit ? "Tạo Biểu Mẫu Mới" : undefined}
                onAction={
                  canEdit
                    ? () => {
                        setEditingForm(null);
                        setIsCreatingForm(true);
                      }
                    : undefined
                }
                onGuide={() => setShowGuide(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredForms.map((f) => (
                  <div
                    key={f.template_id || f.code}
                    className="bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-5 shadow-sm hover:shadow-md flex flex-col justify-between transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono">
                          {f.code}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {f.module}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm mt-3 group-hover:text-emerald-700 transition-colors">
                        {f.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {f.description || "Chưa có mô tả cho biểu mẫu này."}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>{f.fields?.length || 0} trường dữ liệu</span>
                        <span className="font-mono text-[11px]">v{f.version || "1.0"}</span>
                      </div>
                      <div className="mt-2 text-[11px] font-semibold">
                        {f.is_approved && f.status === "ACTIVE" ? (
                          <span className="text-emerald-700">● Đã phê duyệt, đang hiệu lực</span>
                        ) : (
                          <span className="text-amber-700">● Bản nháp, chờ phê duyệt</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={!f.is_approved || f.status !== "ACTIVE"}
                        onClick={() => setTestingForm(f)}
                        className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-none"
                      >
                        <Play className="w-3.5 h-3.5 text-emerald-700" />
                        {f.is_approved && f.status === "ACTIVE"
                          ? "Điền Thử Phiếu"
                          : "Chờ Phê Duyệt"}
                      </Button>

                      {canEdit && f.template_id && !f.is_approved && (
                        <button
                          onClick={() => handleApproveForm(f)}
                          className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title="Phê duyệt biểu mẫu"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditingForm(f);
                            setIsCreatingForm(false);
                          }}
                          className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                          title="Chỉnh sửa cấu trúc"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canEdit && f.template_id && (
                        <button
                          onClick={() =>
                            setDeletingFormItem({ id: f.template_id!, title: f.title })
                          }
                          className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:text-rose-800 hover:bg-rose-100 transition-colors"
                          title="Xóa biểu mẫu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WORKFLOW STUDIO */}
        {activeTab === "WORKFLOWS" && (
          <div className="space-y-6">
            {/* Action & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchWf}
                    onChange={(e) => setSearchWf(e.target.value)}
                    placeholder="Tìm quy trình..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <select
                  value={selectedWfModule}
                  onChange={(e) => setSelectedWfModule(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none font-medium"
                >
                  <option value="ALL">Tất cả phân hệ</option>
                  <option value="HACCP_FLOW">Lưu đồ HACCP</option>
                  <option value="DOC_APPROVAL">Phê duyệt SOP</option>
                  <option value="SUPPLIER_APPROVAL">Đánh giá NCC</option>
                  <option value="CAPA_FLOW">Quy trình CAPA</option>
                  <option value="AUDIT_FLOW">Đánh giá nội bộ</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowWfGuide(true)}
                  className="border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 font-bold text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-sm justify-center flex-1 sm:flex-none"
                >
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Hướng Dẫn Quy Trình
                </Button>

                {canEdit && (
                  <Button
                    onClick={() => {
                      setEditingWf(null);
                      setIsCreatingWf(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 flex items-center gap-2 shadow-sm justify-center flex-1 sm:flex-none"
                  >
                    <Plus className="w-4 h-4" />
                    Tạo Quy Trình Mới
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Guidance Tip Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50 border border-blue-200 text-xs text-blue-900 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0">
                  <Workflow className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold">
                    Quy Chuẩn Thiết Kế Lưu Đồ & Luồng Phê Duyệt FSMS:
                  </span>{" "}
                  Sử dụng 4 loại khối chuẩn hóa (Công đoạn sản xuất, Điểm rẽ nhánh, Điểm kiểm soát
                  CCP/oPRP và Phê duyệt đa cấp). Đảm bảo sơ đồ có tính tuần tự liên tục và có thể
                  thẩm tra xác nhận tại hiện trường nhà máy.
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowWfGuide(true)}
                className="shrink-0 bg-white border-blue-300 text-blue-800 hover:bg-blue-100 text-xs font-bold"
              >
                Xem Hướng Dẫn Chi Tiết
              </Button>
            </div>

            {/* Workflows Grid List */}
            {filteredWorkflows.length === 0 ? (
              <EmptyState
                icon={Workflow}
                title="Chưa có quy trình nào"
                description="Hệ thống chưa có lưu đồ quy trình nào. Hãy tạo quy trình mới để thiết lập các công đoạn và điểm kiểm soát."
                actionLabel={canEdit ? "Tạo Lưu Đồ Quy Trình Mới" : undefined}
                onAction={
                  canEdit
                    ? () => {
                        setEditingWf(null);
                        setIsCreatingWf(true);
                      }
                    : undefined
                }
                onGuide={() => setShowGuide(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredWorkflows.map((w) => {
                  const ccpCount = w.nodes.filter((n) => n.is_ccp || n.type === "ccp_check").length;

                  return (
                    <div
                      key={w.workflow_id || w.code}
                      className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-sm hover:shadow-md flex flex-col justify-between transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                            {w.code}
                          </span>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                            {w.module}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 mt-3 group-hover:text-blue-700 transition-colors line-clamp-2">
                          {w.title}
                        </h3>

                        {w.description && (
                          <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                            {w.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                          <div className="flex items-center gap-1 font-semibold text-slate-700">
                            <Workflow className="w-3.5 h-3.5 text-blue-600" />
                            <span>{w.nodes.length} bước</span>
                          </div>
                          {ccpCount > 0 && (
                            <>
                              <div>•</div>
                              <div className="text-rose-700 font-bold flex items-center gap-1">
                                <span>★ {ccpCount} CCP</span>
                              </div>
                            </>
                          )}
                          <div>•</div>
                          <div>Ver {w.version}</div>
                        </div>
                        <div className="mt-2 text-[11px] font-semibold">
                          {w.is_approved && w.status === "ACTIVE" ? (
                            <span className="text-emerald-700">● Đã phê duyệt, đang hiệu lực</span>
                          ) : (
                            <span className="text-amber-700">● Bản nháp, chờ phê duyệt</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-100">
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingWf(w);
                            setIsCreatingWf(false);
                          }}
                          className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-none"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-700" />
                          {canEdit ? "Xem & Sửa Sơ Đồ" : "Xem Sơ Đồ Quy Trình"}
                        </Button>

                        {w.workflow_id && w.is_approved && w.status === "ACTIVE" && (
                          <button
                            onClick={() => handleStartWorkflow(w)}
                            className="p-2 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                            title="Khởi tạo phiên thực thi"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canEdit && w.workflow_id && !w.is_approved && (
                          <button
                            onClick={() => handleApproveWorkflow(w)}
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Phê duyệt quy trình"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canEdit && w.workflow_id && (
                          <button
                            onClick={() =>
                              setDeletingWfItem({ id: w.workflow_id!, title: w.title })
                            }
                            className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:text-rose-800 hover:bg-rose-100 transition-colors"
                            title="Xóa quy trình"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUBMISSIONS HISTORY */}
        {activeTab === "SUBMISSIONS" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-600 font-medium">
                Toàn bộ dữ liệu checklist, phiếu kiểm tra và đo đạc CCP được nộp từ biểu mẫu động.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSubmissions}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Làm mới
              </Button>
            </div>

            {submissions.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Chưa có bản ghi nộp dữ liệu"
                description="Toàn bộ lịch sử checklist, phiếu kiểm tra và đo đạc CCP được nộp từ biểu mẫu động sẽ hiển thị tại đây."
                actionLabel="Điền Thử Phiếu Tại Tab Biểu Mẫu"
                onAction={() => setActiveTab("FORMS")}
                onGuide={() => setShowGuide(true)}
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Mã & Tên Biểu Mẫu</th>
                        <th className="p-3.5">Người Nộp</th>
                        <th className="p-3.5">Thời Gian</th>
                        <th className="p-3.5">Điểm Tuân Thủ</th>
                        <th className="p-3.5">Trạng Thái</th>
                        <th className="p-3.5 text-right">Chi Tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {submissions.map((sub) => (
                        <tr key={sub.submission_id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">
                              {sub.template_title || "Phiếu giám sát"}
                            </div>
                            <div className="font-mono text-[11px] text-emerald-700 font-bold">
                              {sub.template_code}
                            </div>
                          </td>
                          <td className="p-3.5 font-medium text-slate-800">
                            {sub.submitted_by_name || "QC Ca"}
                          </td>
                          <td className="p-3.5 text-slate-500">
                            {sub.created_at
                              ? new Date(sub.created_at).toLocaleString("vi-VN")
                              : "Hôm nay"}
                          </td>
                          <td className="p-3.5">
                            {sub.score !== null && sub.score !== undefined ? (
                              <span className="font-bold text-amber-800 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-300">
                                {sub.score}%
                              </span>
                            ) : (
                              <span className="text-slate-400">Không tính điểm</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {sub.status || "COMPLETED"}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingSubmission(sub)}
                              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Xem Dữ Liệu
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "INSTANCES" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <div className="text-sm font-bold text-slate-900">Phiên thực thi quy trình</div>
                <div className="text-xs text-slate-500 mt-1">
                  Các thao tác được backend kiểm tra theo vai trò của bước hiện tại.
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={fetchInstances} className="text-xs">
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Làm mới
              </Button>
            </div>
            {instances.length === 0 ? (
              <EmptyState
                icon={Workflow}
                title="Chưa có phiên thực thi"
                description="Chọn một quy trình đã phê duyệt và bấm nút phát để khởi tạo."
                onAction={() => setActiveTab("WORKFLOWS")}
                actionLabel="Xem quy trình"
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {instances.map((instance) => {
                  const workflow = workflows.find(
                    (item) => item.workflow_id === instance.workflow_id,
                  );
                  const snapshotNodes = Array.isArray(instance.workflow_snapshot?.nodes)
                    ? instance.workflow_snapshot.nodes
                    : workflow?.nodes || [];
                  const currentNode = snapshotNodes.find(
                    (node: any) => node.id === instance.current_node_id,
                  );
                  const isClosed = ["COMPLETED", "REJECTED", "CANCELLED"].includes(instance.status);
                  const isApproval = currentNode?.type === "approval";
                  return (
                    <div
                      key={instance.instance_id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900">
                            {instance.workflow_title || workflow?.title || "Quy trình"}
                          </div>
                          <div className="text-[11px] font-mono text-violet-700 mt-1">
                            {instance.workflow_code || workflow?.code}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold ${isClosed ? "bg-slate-100 text-slate-700" : "bg-violet-100 text-violet-800"}`}
                        >
                          {instance.status}
                        </span>
                      </div>
                      <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div className="text-slate-500">Bước hiện tại</div>
                        <div className="font-bold text-slate-900 mt-1">
                          {currentNode?.label || instance.current_node_id}
                        </div>
                        {currentNode?.role && (
                          <div className="text-slate-500 mt-1">Phụ trách: {currentNode.role}</div>
                        )}
                      </div>
                      <div className="mt-3 text-[11px] text-slate-500">
                        Khởi tạo:{" "}
                        {instance.created_at
                          ? new Date(instance.created_at).toLocaleString("vi-VN")
                          : "-"}
                      </div>
                      {!isClosed && (
                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              openInstanceAction(
                                instance.instance_id,
                                isApproval ? "APPROVE" : "ADVANCE",
                                instance.workflow_title || workflow?.title || "Quy trình",
                              )
                            }
                            className="flex-1 bg-violet-600 hover:bg-violet-700 text-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />{" "}
                            {isApproval ? "Phê duyệt" : "Chuyển bước"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              openInstanceAction(
                                instance.instance_id,
                                "REJECT",
                                instance.workflow_title || workflow?.title || "Quy trình",
                              )
                            }
                            className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs"
                          >
                            Từ chối
                          </Button>
                        </div>
                      )}
                      {instance.history?.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            Nhật ký xử lý
                          </div>
                          {instance.history
                            .slice(-3)
                            .reverse()
                            .map((entry: any, index: number) => (
                              <div
                                key={`${entry.action_at}-${index}`}
                                className="text-[11px] text-slate-600"
                              >
                                <span className="font-bold text-violet-700">{entry.action}</span> ·{" "}
                                {entry.action_by || "Hệ thống"}
                                {entry.comments ? ` — ${entry.comments}` : ""}
                              </div>
                            ))}
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => exportInstanceHistory(instance)}
                        className="mt-2 h-7 px-2 text-[11px] text-slate-600"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" /> Xuất lịch sử CSV
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL: FORM BUILDER (CREATE / EDIT) */}
        {(isCreatingForm || editingForm) && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-6xl h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
              <FormBuilder
                initialData={editingForm || undefined}
                onSave={handleSaveForm}
                onCancel={() => {
                  setEditingForm(null);
                  setIsCreatingForm(false);
                }}
              />
            </div>
          </div>
        )}

        {/* MODAL: WORKFLOW BUILDER (CREATE / EDIT) */}
        {(isCreatingWf || editingWf) && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-6xl h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
              <WorkflowBuilder
                initialData={editingWf || undefined}
                onSave={handleSaveWorkflow}
                onCancel={() => {
                  setEditingWf(null);
                  setIsCreatingWf(false);
                }}
              />
            </div>
          </div>
        )}

        {/* MODAL: TEST FORM RENDERER */}
        {testingForm && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
              <DynamicFormRenderer
                template={testingForm}
                onSubmit={handleTestSubmit}
                onCancel={() => setTestingForm(null)}
              />
            </div>
          </div>
        )}

        {/* MODAL: VIEW SUBMISSION DETAILS */}
        {viewingSubmission &&
          (() => {
            const matchedForm = forms.find(
              (f) =>
                f.template_id === viewingSubmission.template_id ||
                f.code === viewingSubmission.template_code,
            );

            return (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Chi Tiết Dữ Liệu Đã Ghi Nhận
                      </h3>
                      <div className="text-xs text-emerald-700 font-mono font-bold mt-0.5">
                        {viewingSubmission.template_code} • {viewingSubmission.template_title}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewingSubmission(null)}
                      className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      Đóng
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-800">
                    <div>
                      Người nộp:{" "}
                      <span className="font-bold text-slate-900">
                        {viewingSubmission.submitted_by_name || "QC Ca"}
                      </span>
                    </div>
                    <div>
                      Thời gian:{" "}
                      <span className="font-bold text-slate-900">
                        {new Date(viewingSubmission.created_at).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    {viewingSubmission.score !== null && (
                      <div>
                        Điểm tuân thủ:{" "}
                        <span className="font-bold text-amber-700">{viewingSubmission.score}%</span>
                      </div>
                    )}
                    <div>
                      Trạng thái:{" "}
                      <span className="font-bold text-emerald-700">{viewingSubmission.status}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Nội dung kết quả kiểm tra:
                    </div>
                    {Object.entries(viewingSubmission.form_data || {}).map(([k, v], idx) => {
                      const fieldDef = matchedForm?.fields.find((f) => f.name === k || f.id === k);
                      const displayLabel = fieldDef?.label || k;
                      const fieldType = fieldDef?.type;
                      const unit = fieldDef?.unit;

                      return (
                        <div
                          key={k}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-slate-500 text-[11px]">
                            <span className="font-semibold text-slate-700">
                              {idx + 1}. {displayLabel}
                            </span>
                            <span className="font-mono text-slate-400 text-[10px]">[{k}]</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                            <span className="text-slate-500 font-medium">Kết quả:</span>
                            <span className="font-bold text-slate-900">
                              {typeof v === "boolean" ? (
                                v ? (
                                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                                    ✓ ĐẠT / CÓ
                                  </span>
                                ) : (
                                  <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded font-bold">
                                    ✗ KHÔNG ĐẠT / KHÔNG
                                  </span>
                                )
                              ) : fieldType === "RATING" ? (
                                <span className="text-amber-700 font-black">{String(v)} / 5 ★</span>
                              ) : (
                                <span>
                                  {String(v)}{" "}
                                  {unit ? (
                                    <span className="text-slate-500 text-[11px] font-normal">
                                      {unit}
                                    </span>
                                  ) : (
                                    ""
                                  )}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

        <Dialog
          open={Boolean(pendingInstanceAction)}
          onOpenChange={(open) => !open && !instanceActionSaving && setPendingInstanceAction(null)}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {pendingInstanceAction?.action === "REJECT"
                  ? "Từ chối bước quy trình"
                  : "Xác nhận xử lý workflow"}
              </DialogTitle>
              <DialogDescription>
                {pendingInstanceAction?.title}. Thao tác sẽ được ghi vào lịch sử phê duyệt cùng tài
                khoản và thời gian thực hiện.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                {pendingInstanceAction?.action === "REJECT" ? "Lý do từ chối *" : "Ghi chú xử lý"}
              </label>
              <textarea
                value={instanceComments}
                onChange={(event) => setInstanceComments(event.target.value)}
                rows={4}
                placeholder={
                  pendingInstanceAction?.action === "REJECT"
                    ? "Nêu rõ lý do, hành động cần khắc phục hoặc bước cần quay lại..."
                    : "Ghi chú xử lý (không bắt buộc)..."
                }
                className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPendingInstanceAction(null)}
                disabled={instanceActionSaving}
              >
                Hủy
              </Button>
              <Button
                onClick={handleInstanceAction}
                disabled={instanceActionSaving}
                className={
                  pendingInstanceAction?.action === "REJECT"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-violet-600 hover:bg-violet-700"
                }
              >
                {instanceActionSaving
                  ? "Đang lưu..."
                  : pendingInstanceAction?.action === "REJECT"
                    ? "Xác nhận từ chối"
                    : "Xác nhận xử lý"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Xác Nhận Xóa Biểu Mẫu */}
        <ConfirmDialog
          isOpen={!!deletingFormItem}
          onClose={() => setDeletingFormItem(null)}
          onConfirm={() => {
            if (deletingFormItem) {
              executeDeleteForm(deletingFormItem.id, deletingFormItem.title);
              setDeletingFormItem(null);
            }
          }}
          title="Xác nhận xóa biểu mẫu"
          description={`Bạn có chắc chắn muốn xóa biểu mẫu "${deletingFormItem?.title}" khỏi hệ thống không? Dữ liệu cấu hình biểu mẫu sẽ bị xóa vĩnh viễn.`}
          confirmLabel="Xóa biểu mẫu"
          variant="destructive"
        />

        {/* Modal Xác Nhận Xóa Quy Trình */}
        <ConfirmDialog
          isOpen={!!deletingWfItem}
          onClose={() => setDeletingWfItem(null)}
          onConfirm={() => {
            if (deletingWfItem) {
              executeDeleteWorkflow(deletingWfItem.id, deletingWfItem.title);
              setDeletingWfItem(null);
            }
          }}
          title="Xác nhận xóa quy trình phê duyệt"
          description={`Bạn có chắc chắn muốn xóa quy trình "${deletingWfItem?.title}" khỏi hệ thống lưu đồ không?`}
          confirmLabel="Xóa quy trình"
          variant="destructive"
        />
        {/* Module Guide Modal */}
        <ModuleGuideModal module="builder" isOpen={showGuide} onClose={() => setShowGuide(false)} />
        {/* Workflow Guide Modal */}
        <WorkflowGuideModal isOpen={showWfGuide} onClose={() => setShowWfGuide(false)} />
      </div>
    </AppShell>
  );
}
