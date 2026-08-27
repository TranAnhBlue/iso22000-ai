import React, { useState, useEffect } from "react";
import {
  GitFork,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Settings,
  Eye,
  Save,
  ArrowDown,
  Layers,
  Sparkles,
  ShieldAlert,
  Flame,
  UserCheck,
  HelpCircle,
  X,
  ListOrdered,
  LayoutGrid,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { WorkflowNodeData, WorkflowEdgeData, WorkflowTemplateData } from "./types";

export type { WorkflowNodeData, WorkflowEdgeData, WorkflowTemplateData };

interface WorkflowBuilderProps {
  initialData?: WorkflowTemplateData;
  onSave: (data: WorkflowTemplateData) => Promise<void> | void;
  onCancel?: () => void;
}

const NODE_TYPES = [
  {
    type: "process",
    label: "Công đoạn sản xuất",
    color: "bg-emerald-50 border-emerald-300 text-emerald-900",
    badgeColor: "bg-emerald-600 text-white",
    desc: "Bước gia công, xử lý, rửa, sơ chế...",
  },
  {
    type: "ccp_check",
    label: "Kiểm soát CCP / oPRP",
    color: "bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-200",
    badgeColor: "bg-rose-600 text-white",
    desc: "Điểm kiểm soát tới hạn bắt buộc đo đạc",
  },
  {
    type: "approval",
    label: "Phê duyệt đa cấp",
    color: "bg-purple-50 border-purple-300 text-purple-900",
    badgeColor: "bg-purple-600 text-white",
    desc: "Ký duyệt của QA, Trưởng ban, BGĐ",
  },
  {
    type: "decision",
    label: "Rẽ nhánh điều kiện",
    color: "bg-amber-50 border-amber-300 text-amber-900",
    badgeColor: "bg-amber-600 text-white",
    desc: "Đạt -> Bước tiếp; Không đạt -> Cách ly",
  },
  {
    type: "end",
    label: "Hoàn tất / Đóng gói",
    color: "bg-blue-50 border-blue-300 text-blue-900",
    badgeColor: "bg-blue-600 text-white",
    desc: "Nhập kho thành phẩm, xuất hàng",
  },
];

const MODULE_OPTIONS = [
  { value: "HACCP_FLOW", label: "Lưu Đồ Quy Trình Công Đoạn (ISO 8.5.1)" },
  { value: "DOC_APPROVAL", label: "Quy Trình Phê Duyệt Tài Liệu SOP (ISO 7.5)" },
  { value: "CAPA_FLOW", label: "Quy Trình Xử Lý Sự Cố CAPA (ISO 8.9 & 10.1)" },
  { value: "SUPPLIER_AUDIT", label: "Quy Trình Đánh Giá Nhà Cung Cấp" },
  { value: "EQUIPMENT_MAINT", label: "Quy Trình Bảo Trì & Hiệu Chuẩn Máy" },
  { value: "INTERNAL_AUDIT", label: "Quy Trình Đánh Giá Nội Bộ ISO" },
];

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [template, setTemplate] = useState<WorkflowTemplateData>(
    initialData || {
      module: "HACCP_FLOW",
      code: `WF-HACCP-${Date.now().toString().slice(-4)}`,
      title: "Lưu Đồ Quy Trình Chế Biến Mới (ISO 8.5.1)",
      description: "Quy trình công nghệ các bước tuần tự từ tiếp nhận nguyên liệu đến thành phẩm.",
      version: "1.0",
      nodes: [
        {
          id: "node_1",
          type: "process",
          label: "1. Tiếp nhận & Kiểm tra nguyên liệu đầu vào",
          role: "QC Tiếp nhận",
          description: "Kiểm tra nhiệt độ xe lạnh (≤ 4°C), cảm quan tươi và hồ sơ COA.",
          is_ccp: true,
          step_number: 1,
        },
        {
          id: "node_2",
          type: "process",
          label: "2. Rửa sơ chế & Phân cỡ",
          role: "Tổ Sơ chế",
          description: "Rửa bằng nước sạch tuần hoàn, loại bỏ tạp chất và màng đen.",
          is_ccp: false,
          step_number: 2,
        },
        {
          id: "node_3",
          type: "ccp_check",
          label: "3. Gia nhiệt / Thanh trùng tiệt khuẩn sơ bộ",
          role: "QC & Trưởng ca",
          description: "Hấp ở nhiệt độ tâm ≥ 85°C trong 15 phút để diệt Salmonella.",
          is_ccp: true,
          step_number: 3,
        },
        {
          id: "node_4",
          type: "process",
          label: "4. Cấp đông nhanh IQF & Đóng gói hút chân không",
          role: "Tổ Đóng gói",
          description: "Cấp đông đạt nhiệt độ tâm ≤ -18°C, dán nhãn truy xuất QR.",
          is_ccp: true,
          step_number: 4,
        },
      ],
      edges: [
        { id: "e1_2", source: "node_1", target: "node_2", label: "Đạt nghiệm thu IQC" },
        { id: "e2_3", source: "node_2", target: "node_3", label: "Chuyển tiếp" },
        { id: "e3_4", source: "node_3", target: "node_4", label: "Kiểm soát CCP Đạt" },
      ],
      status: "ACTIVE",
    }
  );

  const [activeTab, setActiveTab] = useState<"VISUAL" | "EDIT_LIST">("VISUAL");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    template.nodes[0]?.id || null
  );
  const [saving, setSaving] = useState(false);

  // Tự động đồng bộ template và reset node được chọn khi initialData thay đổi
  useEffect(() => {
    if (initialData) {
      setTemplate(initialData);
      setSelectedNodeId(initialData.nodes[0]?.id || null);
    }
  }, [initialData]);

  const selectedNode = template.nodes.find((n) => n.id === selectedNodeId);

  const handleAddNode = (nodeType: string) => {
    const newStepNum = template.nodes.length + 1;
    const newId = `node_${Date.now()}`;
    const newNode: WorkflowNodeData = {
      id: newId,
      type: nodeType,
      label: `${newStepNum}. Công đoạn mới (${nodeType})`,
      role: "Tổ Sản xuất / QC",
      description: "Mô tả yêu cầu kỹ thuật và giám sát...",
      is_ccp: nodeType === "ccp_check",
      step_number: newStepNum,
    };

    setTemplate((prev) => {
      const newNodes = [...prev.nodes, newNode];
      // Tự động tạo edge nối từ node trước đó sang node mới
      const newEdges = [...prev.edges];
      if (prev.nodes.length > 0) {
        const lastNode = prev.nodes[prev.nodes.length - 1];
        newEdges.push({
          id: `e_${lastNode.id}_${newId}`,
          source: lastNode.id,
          target: newId,
          label: "Chuyển tiếp",
        });
      }
      return { ...prev, nodes: newNodes, edges: newEdges };
    });

    setSelectedNodeId(newId);
    toast.success(`Đã thêm bước công đoạn mới (${nodeType})`);
  };

  const handleUpdateNode = (id: string, updates: Partial<WorkflowNodeData>) => {
    setTemplate((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    }));
  };

  const handleDeleteNode = (id: string) => {
    setTemplate((prev) => {
      const remainingNodes = prev.nodes
        .filter((n) => n.id !== id)
        .map((n, idx) => ({ ...n, step_number: idx + 1 }));
      const remainingEdges = prev.edges.filter((e) => e.source !== id && e.target !== id);

      if (selectedNodeId === id) {
        setSelectedNodeId(remainingNodes[0]?.id || null);
      }
      return { ...prev, nodes: remainingNodes, edges: remainingEdges };
    });
    toast.info("Đã xóa công đoạn khỏi lưu đồ");
  };

  const handleMoveNode = (index: number, direction: "UP" | "DOWN") => {
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= template.nodes.length) return;

    setTemplate((prev) => {
      const newNodes = [...prev.nodes];
      const temp = newNodes[index];
      newNodes[index] = newNodes[targetIdx];
      newNodes[targetIdx] = temp;

      // Cập nhật lại step_number
      const renumberedNodes = newNodes.map((n, idx) => ({
        ...n,
        step_number: idx + 1,
      }));

      // Tái tạo lại chuỗi liên kết edges theo thứ tự mới
      const newEdges: WorkflowEdgeData[] = [];
      for (let i = 0; i < renumberedNodes.length - 1; i++) {
        newEdges.push({
          id: `e_${renumberedNodes[i].id}_${renumberedNodes[i + 1].id}`,
          source: renumberedNodes[i].id,
          target: renumberedNodes[i + 1].id,
          label: renumberedNodes[i].is_ccp ? "Kiểm soát CCP Đạt" : "Chuyển tiếp",
        });
      }

      return { ...prev, nodes: renumberedNodes, edges: newEdges };
    });
  };

  const handleSaveSubmit = async () => {
    if (!template.code.trim()) {
      toast.error("Vui lòng nhập Mã Quy trình / Lưu đồ!");
      return;
    }
    if (!template.title.trim()) {
      toast.error("Vui lòng nhập Tên Quy trình!");
      return;
    }
    if (template.nodes.length === 0) {
      toast.error("Quy trình phải có ít nhất 1 bước công đoạn!");
      return;
    }

    setSaving(true);
    try {
      await onSave(template);
      toast.success("Đã lưu Quy trình / Lưu đồ thành công!");
    } catch (e: any) {
      toast.error(`Lỗi khi lưu quy trình: ${e?.message || "Không thể kết nối máy chủ"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 border border-blue-200">
            <GitFork className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Bộ Thiết Kế Lưu Đồ & Quy Trình Động (Workflow Studio)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                ISO 22000 Clause 8.5.1
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Trực quan hóa sơ đồ lưu đồ công đoạn HACCP, các điểm CCP/oPRP và luồng phê duyệt đa cấp.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex rounded-lg bg-slate-200/70 p-1 border border-slate-300">
            <button
              onClick={() => setActiveTab("VISUAL")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "VISUAL"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Sơ Đồ Trực Quan
            </button>
            <button
              onClick={() => setActiveTab("EDIT_LIST")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "EDIT_LIST"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              Danh Sách Các Bước
            </button>
          </div>

          <Button
            onClick={handleSaveSubmit}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "Đang lưu..." : "Lưu Quy Trình"}
          </Button>

          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs px-3"
            >
              Đóng
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden bg-white">
        {/* Left Column: Metadata & Toolbox (Width: 3 cols) */}
        <div className="col-span-12 md:col-span-3 border-r border-slate-200 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
          {/* Metadata Card */}
          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              Thông Tin Quy Trình
            </h3>

            <div>
              <label className="text-xs font-semibold text-slate-700">Phân hệ quy trình</label>
              <select
                value={template.module}
                onChange={(e) => setTemplate({ ...template, module: e.target.value })}
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
              >
                {MODULE_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Mã Quy Trình *</label>
              <input
                type="text"
                value={template.code}
                onChange={(e) => setTemplate({ ...template, code: e.target.value })}
                placeholder="VD: WF-HACCP-01"
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono font-bold focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Tên Quy Trình / Lưu Đồ *</label>
              <input
                type="text"
                value={template.title}
                onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                placeholder="VD: Lưu đồ chế biến Cá ngừ"
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">Phiên bản</label>
                <input
                  type="text"
                  value={template.version}
                  onChange={(e) => setTemplate({ ...template, version: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Trạng thái</label>
                <select
                  value={template.status}
                  onChange={(e) => setTemplate({ ...template, status: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                >
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="DRAFT">Bản nháp</option>
                  <option value="ARCHIVED">Lưu trữ</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Mô tả phạm vi áp dụng</label>
              <textarea
                rows={2}
                value={template.description || ""}
                onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                placeholder="Áp dụng cho dây chuyền..."
                className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* Add Step Toolbox */}
          <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Thêm Nút Bước Quy Trình
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {NODE_TYPES.map((nt) => (
                <button
                  key={nt.type}
                  onClick={() => handleAddNode(nt.type)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-left transition-all group"
                >
                  <div className={`p-1 rounded text-xs font-bold shrink-0 ${nt.badgeColor}`}>
                    +
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-800 truncate">
                      {nt.label}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{nt.desc}</div>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Column: Visual Canvas OR Editable Steps List (Width: 6 cols) */}
        <div className="col-span-12 md:col-span-6 border-r border-slate-200 p-6 overflow-y-auto space-y-4 bg-slate-100/50">
          {activeTab === "VISUAL" ? (
            /* VISUAL FLOWCHART CANVAS */
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white text-slate-700 border border-slate-300 shadow-sm">
                  Sơ Đồ Lưu Đồ Công Đoạn Tuần Tự ({template.nodes.length} bước)
                </span>
              </div>

              {template.nodes.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-white">
                  Chưa có bước công đoạn nào. Hãy chọn loại nút ở cột bên trái để thêm!
                </div>
              ) : (
                <div className="space-y-3 max-w-xl mx-auto">
                  {template.nodes.map((node, idx) => {
                    const isSelected = node.id === selectedNodeId;
                    const nodeTypeInfo = NODE_TYPES.find((t) => t.type === node.type) || NODE_TYPES[0];

                    return (
                      <React.Fragment key={node.id}>
                        {/* Node Card Box */}
                        <div
                          onClick={() => setSelectedNodeId(node.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer relative shadow-sm ${
                            isSelected
                              ? "bg-white border-blue-500 shadow-md ring-2 ring-blue-400"
                              : node.is_ccp
                              ? "bg-rose-50/70 border-rose-300 hover:border-rose-400"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                  node.is_ccp
                                    ? "bg-rose-600 text-white shadow-sm"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                {idx + 1}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900">
                                  {node.label}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                  <span>Phụ trách:</span>
                                  <span className="font-semibold text-slate-700">{node.role || "Tổ SX / QC"}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {node.is_ccp && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold tracking-wider animate-pulse flex items-center gap-1">
                                  <Flame className="w-3 h-3" /> ★ ĐIỂM CCP
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNode(node.id);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Xóa bước này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {node.description && (
                            <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                              {node.description}
                            </div>
                          )}
                        </div>

                        {/* Connection Arrow ↓ */}
                        {idx < template.nodes.length - 1 && (
                          <div className="flex flex-col items-center justify-center my-1 py-1">
                            <div className="w-0.5 h-3 bg-slate-300"></div>
                            <div className="text-[10px] font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-300 shadow-sm flex items-center gap-1">
                              <ArrowDown className="w-3 h-3 text-slate-400" />
                              {template.edges.find((e) => e.source === node.id)?.label ||
                                (node.is_ccp ? "Kiểm soát CCP Đạt" : "Chuyển tiếp")}
                            </div>
                            <div className="w-0.5 h-3 bg-slate-300"></div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* EDITABLE STEPS LIST / TABLE VIEW */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white text-slate-700 border border-slate-300 shadow-sm">
                  Danh Sách Chi Tiết Các Bước Công Đoạn ({template.nodes.length} bước)
                </span>
                <span className="text-xs text-slate-500 font-medium">Chỉnh sửa trực tiếp hoặc sắp xếp thứ tự</span>
              </div>

              {template.nodes.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-white">
                  Chưa có bước công đoạn nào. Hãy thêm bước ở cột bên trái!
                </div>
              ) : (
                <div className="space-y-3">
                  {template.nodes.map((node, idx) => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                        selectedNodeId === node.id
                          ? "border-emerald-500 ring-2 ring-emerald-300 shadow-md"
                          : "border-slate-200 hover:border-slate-300 shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center border border-slate-300">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{node.label}</span>
                        </div>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            disabled={idx === 0}
                            onClick={() => handleMoveNode(idx, "UP")}
                            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30"
                            title="Di chuyển lên"
                          >
                            <MoveUp className="w-4 h-4" />
                          </button>
                          <button
                            disabled={idx === template.nodes.length - 1}
                            onClick={() => handleMoveNode(idx, "DOWN")}
                            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30"
                            title="Di chuyển xuống"
                          >
                            <MoveDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteNode(node.id)}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            title="Xóa bước"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500">Tên bước</label>
                          <input
                            type="text"
                            value={node.label}
                            onChange={(e) => handleUpdateNode(node.id, { label: e.target.value })}
                            className="w-full mt-0.5 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500">Vai trò phụ trách</label>
                          <input
                            type="text"
                            value={node.role || ""}
                            onChange={(e) => handleUpdateNode(node.id, { role: e.target.value })}
                            className="w-full mt-0.5 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900"
                          />
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!node.is_ccp}
                            onChange={(e) => handleUpdateNode(node.id, { is_ccp: e.target.checked })}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                          />
                          <span className={node.is_ccp ? "font-bold text-rose-700" : "text-slate-600"}>
                            Điểm Kiểm Soát Tới Hạn (CCP)
                          </span>
                        </label>

                        <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                          ID: {node.id}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Selected Node Inspector (Width: 3 cols) */}
        <div className="col-span-12 md:col-span-3 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
          <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-blue-600" />
              Chi Tiết Công Đoạn
            </h3>
            {selectedNode && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold border border-blue-200">
                {selectedNode.type}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-3.5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <label className="text-xs font-bold text-slate-800">Tên công đoạn / Bước *</label>
                <input
                  type="text"
                  value={selectedNode.label}
                  onChange={(e) => handleUpdateNode(selectedNode.id, { label: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Vai trò / Bộ phận phụ trách</label>
                <input
                  type="text"
                  value={selectedNode.role || ""}
                  onChange={(e) => handleUpdateNode(selectedNode.id, { role: e.target.value })}
                  placeholder="VD: QC Tiếp nhận, Tổ Chế biến..."
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* CCP Toggle */}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-rose-800 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-600" />
                    Điểm Kiểm Soát Tới Hạn (CCP)
                  </div>
                  <div className="text-[10px] text-rose-600">Yêu cầu thiết lập giới hạn tới hạn</div>
                </div>
                <input
                  type="checkbox"
                  checked={!!selectedNode.is_ccp}
                  onChange={(e) =>
                    handleUpdateNode(selectedNode.id, {
                      is_ccp: e.target.checked,
                      type: e.target.checked ? "ccp_check" : "process",
                    })
                  }
                  className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Yêu cầu kỹ thuật / Giám sát</label>
                <textarea
                  rows={3}
                  value={selectedNode.description || ""}
                  onChange={(e) => handleUpdateNode(selectedNode.id, { description: e.target.value })}
                  placeholder="Nhập thông số giám sát, tiêu chuẩn nhiệt độ, thời gian..."
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Edge Label for outgoing connection */}
              <div>
                <label className="text-xs font-semibold text-slate-700">Nhãn chuyển tiếp (Edge Label)</label>
                <input
                  type="text"
                  value={
                    template.edges.find((e) => e.source === selectedNode.id)?.label ||
                    (selectedNode.is_ccp ? "Kiểm soát CCP Đạt" : "Chuyển tiếp")
                  }
                  onChange={(e) => {
                    const newLabel = e.target.value;
                    setTemplate((prev) => ({
                      ...prev,
                      edges: prev.edges.map((edge) =>
                        edge.source === selectedNode.id ? { ...edge, label: newLabel } : edge
                      ),
                    }));
                  }}
                  placeholder="VD: Kiểm soát CCP Đạt, Chuyển tiếp..."
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500 text-xs border-2 border-dashed border-slate-200 rounded-xl p-4 bg-white">
              Vui lòng chọn 1 bước công đoạn ở sơ đồ giữa để cấu hình chi tiết.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
