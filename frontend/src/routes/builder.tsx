import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import {
  Layers,
  Plus,
  FileText,
  Workflow,
  Sparkles,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { FormBuilder } from "@/components/builder/FormBuilder";
import { DynamicFormRenderer } from "@/components/builder/DynamicFormRenderer";
import { WorkflowBuilder } from "@/components/builder/WorkflowBuilder";
import type { FormTemplateData, WorkflowTemplateData } from "@/components/builder/types";

export const Route = createFileRoute("/builder")({
  component: BuilderManagementPage,
});

function BuilderManagementPage() {
  const [activeTab, setActiveTab] = useState<"FORMS" | "WORKFLOWS" | "SUBMISSIONS">("FORMS");
  const [loading, setLoading] = useState(false);

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
      console.error("Lỗi tải lịch sử nộp:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
    fetchWorkflows();
    fetchSubmissions();
  }, []);

  // Seed default templates
  const handleSeedDefaults = async () => {
    setLoading(true);
    try {
      const res = await api.post("/builders/seed-defaults");
      toast.success(res.data.message || "Đã nạp mẫu biểu mẫu và quy trình chuẩn ISO!");
      await fetchForms();
      await fetchWorkflows();
    } catch (err: any) {
      toast.error("Lỗi khi nạp mẫu chuẩn ISO: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Save Form Template
  const handleSaveForm = async (templateData: FormTemplateData) => {
    try {
      if (templateData.template_id) {
        await api.put(`/builders/forms/${templateData.template_id}`, templateData);
        toast.success("Cập nhật biểu mẫu thành công!");
      } else {
        await api.post("/builders/forms", templateData);
        toast.success("Tạo biểu mẫu mới thành công!");
      }
      setEditingForm(null);
      setIsCreatingForm(false);
      await fetchForms();
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || err.message);
    }
  };

  // Delete Form
  const handleDeleteForm = async (templateId: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa biểu mẫu '${title}'?`)) return;
    try {
      await api.delete(`/builders/forms/${templateId}`);
      toast.success("Đã xóa biểu mẫu thành công!");
      await fetchForms();
    } catch (err: any) {
      toast.error("Lỗi khi xóa biểu mẫu: " + (err.response?.data?.detail || err.message));
    }
  };

  // Save Workflow Template
  const handleSaveWorkflow = async (wfData: WorkflowTemplateData) => {
    try {
      if (wfData.workflow_id) {
        await api.put(`/builders/workflows/${wfData.workflow_id}`, wfData);
        toast.success("Cập nhật quy trình thành công!");
      } else {
        await api.post("/builders/workflows", wfData);
        toast.success("Tạo quy trình mới thành công!");
      }
      setEditingWf(null);
      setIsCreatingWf(false);
      await fetchWorkflows();
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || err.message);
    }
  };

  // Delete Workflow
  const handleDeleteWorkflow = async (wfId: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa quy trình '${title}'?`)) return;
    try {
      await api.delete(`/builders/workflows/${wfId}`);
      toast.success("Đã xóa quy trình thành công!");
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
                onClick={handleSeedDefaults}
                disabled={loading}
                className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Nạp Mẫu Biểu Mẫu Chuẩn ISO
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
            </div>

            {/* Forms Grid List */}
            {filteredForms.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3 shadow-sm">
                <FileText className="w-10 h-10 mx-auto text-slate-400" />
                <div className="text-sm font-bold text-slate-700">Chưa có biểu mẫu nào phù hợp</div>
                <p className="text-xs max-w-sm mx-auto text-slate-500">
                  Bạn có thể bấm "Nạp Mẫu Biểu Mẫu Chuẩn ISO" ở góc trên hoặc "Tạo Biểu Mẫu Mới".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredForms.map((f) => (
                  <div
                    key={f.template_id || f.code}
                    className="bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-5 shadow-sm hover:shadow-md flex flex-col justify-between transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {f.code}
                        </span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                          {f.module}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 mt-3 group-hover:text-emerald-700 transition-colors line-clamp-2">
                        {f.title}
                      </h3>

                      {f.description && (
                        <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                          {f.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                        <div className="flex items-center gap-1 font-semibold text-slate-700">
                          <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{f.fields.length} trường</span>
                        </div>
                        <div>•</div>
                        <div>Ver {f.version}</div>
                        <div>•</div>
                        <div className="text-emerald-700 font-bold">{f.status}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        onClick={() => setTestingForm(f)}
                        className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-none"
                      >
                        <Play className="w-3.5 h-3.5 text-emerald-700" />
                        Điền Thử Phiếu
                      </Button>

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

                      {f.template_id && (
                        <button
                          onClick={() => handleDeleteForm(f.template_id!, f.title)}
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
                  <option value="HACCP_FLOW">Lưu đồ HACCP (ISO 8.5.1)</option>
                  <option value="DOC_APPROVAL">Phê duyệt SOP (ISO 7.5)</option>
                  <option value="SUPPLIER_APPROVAL">Đánh giá NCC</option>
                  <option value="CAPA_FLOW">Quy trình CAPA (ISO 8.9 & 10.1)</option>
                  <option value="AUDIT_FLOW">Đánh giá nội bộ</option>
                </select>
              </div>

              <Button
                onClick={() => {
                  setEditingWf(null);
                  setIsCreatingWf(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 flex items-center gap-2 shadow-sm w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                Tạo Lưu Đồ Quy Trình Mới
              </Button>
            </div>

            {/* Workflows Grid List */}
            {filteredWorkflows.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3 shadow-sm">
                <Workflow className="w-10 h-10 mx-auto text-slate-400" />
                <div className="text-sm font-bold text-slate-700">Chưa có quy trình nào phù hợp</div>
              </div>
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
                          Xem & Sửa Sơ Đồ
                        </Button>

                        {w.workflow_id && (
                          <button
                            onClick={() => handleDeleteWorkflow(w.workflow_id!, w.title)}
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
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-500 shadow-sm">
                Chưa có bản ghi nộp dữ liệu nào. Hãy thử bấm "Điền Thử Phiếu" ở Tab Biểu Mẫu!
              </div>
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
                            {sub.created_at ? new Date(sub.created_at).toLocaleString("vi-VN") : "Hôm nay"}
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
        {viewingSubmission && (() => {
          const matchedForm = forms.find(
            (f) =>
              f.template_id === viewingSubmission.template_id ||
              f.code === viewingSubmission.template_code
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
                    Người nộp: <span className="font-bold text-slate-900">{viewingSubmission.submitted_by_name || "QC Ca"}</span>
                  </div>
                  <div>
                    Thời gian: <span className="font-bold text-slate-900">{new Date(viewingSubmission.created_at).toLocaleString("vi-VN")}</span>
                  </div>
                  {viewingSubmission.score !== null && (
                    <div>
                      Điểm tuân thủ: <span className="font-bold text-amber-700">{viewingSubmission.score}%</span>
                    </div>
                  )}
                  <div>
                    Trạng thái: <span className="font-bold text-emerald-700">{viewingSubmission.status}</span>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Nội dung kết quả kiểm tra:
                  </div>
                  {Object.entries(viewingSubmission.form_data || {}).map(([k, v], idx) => {
                    const fieldDef = matchedForm?.fields.find(
                      (f) => f.name === k || f.id === k
                    );
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
                          <span className="font-mono text-slate-400 text-[10px]">
                            [{k}]
                          </span>
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
                              <span className="text-amber-700 font-black">
                                {String(v)} / 5 ★
                              </span>
                            ) : (
                              <span>
                                {String(v)} {unit ? <span className="text-slate-500 text-[11px] font-normal">{unit}</span> : ""}
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
      </div>
    </AppShell>
  );
}
