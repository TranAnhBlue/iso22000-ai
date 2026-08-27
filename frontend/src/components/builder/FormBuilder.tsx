import React, { useState } from "react";
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Settings,
  Eye,
  Save,
  CheckCircle2,
  FileText,
  Sliders,
  Hash,
  ListFilter,
  CheckSquare,
  Star,
  Calendar,
  Clock,
  PenTool,
  Camera,
  Layers,
  HelpCircle,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DynamicFormRenderer } from "./DynamicFormRenderer";
import type { FormField, FormTemplateData } from "./types";

export type { FormField, FormTemplateData };

interface FormBuilderProps {
  initialData?: FormTemplateData;
  onSave: (data: FormTemplateData) => Promise<void> | void;
  onCancel?: () => void;
}

const FIELD_TYPES = [
  { type: "TEXT", label: "Văn bản (Text)", icon: FileText, desc: "Nhập nội dung ngắn hoặc mô tả" },
  { type: "NUMBER", label: "Số đo / Thông số (Number)", icon: Hash, desc: "Đo nhiệt độ, áp suất, thời gian" },
  { type: "SELECT", label: "Danh sách lựa chọn (Select)", icon: ListFilter, desc: "Chọn 1 mục trong danh sách" },
  { type: "YESNO", label: "Đạt / Không đạt (Yes/No)", icon: CheckSquare, desc: "Kiểm tra tiêu chí tuân thủ" },
  { type: "RATING", label: "Đánh giá sao (1-5 Sao)", icon: Star, desc: "Chấm điểm chất lượng, độ sạch" },
  { type: "DATE", label: "Ngày tháng (Date)", icon: Calendar, desc: "Ngày kiểm tra, ngày sản xuất" },
  { type: "TIME", label: "Thời gian (Time)", icon: Clock, desc: "Giờ giám sát theo ca" },
  { type: "SIGNATURE", label: "Chữ ký xác nhận", icon: PenTool, desc: "Ký duyệt của QC/KCS/Trưởng ca" },
  { type: "PHOTO", label: "Ảnh chụp hiện trường", icon: Camera, desc: "Chụp ảnh bằng chứng sự cố" },
];

const MODULE_OPTIONS = [
  { value: "HACCP", label: "HACCP & Điểm Kiểm Soát CCP" },
  { value: "PRP", label: "PRP / GMP / SSOP (Checklist Vệ sinh)" },
  { value: "IQC", label: "IQC Tiếp Nhận & Nghiệm Thu Nguyên Liệu" },
  { value: "SUPPLIER_AUDIT", label: "Đánh Giá Nhà Cung Cấp" },
  { value: "EQUIPMENT", label: "Thiết Bị, Bảo Trì & Hiệu Chuẩn" },
  { value: "CAPA", label: "CAPA Sự Cố & Hành Động Khắc Phục" },
  { value: "INTERNAL_AUDIT", label: "Đánh Giá Nội Bộ ISO 22000" },
  { value: "GENERAL", label: "Biểu Mẫu Chung Khác" },
];

export const FormBuilder: React.FC<FormBuilderProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [template, setTemplate] = useState<FormTemplateData>(
    initialData || {
      module: "PRP",
      code: `FORM-AUTO-${Date.now().toString().slice(-4)}`,
      title: "Biểu Mẫu Kiểm Tra Tùy Biến Mới",
      description: "Mô tả mục đích áp dụng của biểu mẫu theo tiêu chuẩn ISO 22000:2018.",
      version: "1.0",
      fields: [
        {
          id: "field_1",
          name: "inspector_name",
          label: "Người thực hiện kiểm tra",
          type: "TEXT",
          required: true,
          placeholder: "Nhập họ tên KCS / QC ca",
        },
        {
          id: "field_2",
          name: "is_sanitized",
          label: "Bề mặt thiết bị đã được vệ sinh & khử trùng đạt chuẩn?",
          type: "YESNO",
          required: true,
          default_value: true,
        },
        {
          id: "field_3",
          name: "temperature_c",
          label: "Nhiệt độ đo thực tế (°C)",
          type: "NUMBER",
          required: true,
          min_val: -25,
          max_val: 100,
          unit: "°C",
          default_value: 18.5,
        },
      ],
      status: "ACTIVE",
    }
  );

  const [activeTab, setActiveTab] = useState<"DESIGN" | "PREVIEW">("DESIGN");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    template.fields[0]?.id || null
  );
  const [saving, setSaving] = useState(false);

  const selectedField = template.fields.find((f) => f.id === selectedFieldId);

  const handleAddField = (typeStr: string) => {
    const newId = `field_${Date.now()}`;
    const defaultLabel = `Trường dữ liệu ${template.fields.length + 1} (${typeStr})`;
    const newField: FormField = {
      id: newId,
      name: `param_${Date.now().toString().slice(-4)}`,
      label: defaultLabel,
      type: typeStr,
      required: false,
      placeholder: typeStr === "TEXT" ? "Nhập thông tin..." : undefined,
      options: typeStr === "SELECT" ? ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C"] : undefined,
      unit: typeStr === "NUMBER" ? "°C" : undefined,
      default_value: typeStr === "YESNO" ? true : undefined,
    };

    setTemplate((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setSelectedFieldId(newId);
    toast.success(`Đã thêm trường mới (${typeStr})`);
  };

  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  };

  const handleDeleteField = (id: string) => {
    setTemplate((prev) => {
      const remaining = prev.fields.filter((f) => f.id !== id);
      if (selectedFieldId === id) {
        setSelectedFieldId(remaining[0]?.id || null);
      }
      return { ...prev, fields: remaining };
    });
    toast.info("Đã xóa trường dữ liệu");
  };

  const handleMoveField = (index: number, direction: "UP" | "DOWN") => {
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= template.fields.length) return;

    setTemplate((prev) => {
      const newFields = [...prev.fields];
      const temp = newFields[index];
      newFields[index] = newFields[targetIdx];
      newFields[targetIdx] = temp;
      return { ...prev, fields: newFields };
    });
  };

  const handleSaveSubmit = async () => {
    if (!template.code.trim()) {
      toast.error("Vui lòng nhập Mã biểu mẫu!");
      return;
    }
    if (!template.title.trim()) {
      toast.error("Vui lòng nhập Tên biểu mẫu!");
      return;
    }
    if (template.fields.length === 0) {
      toast.error("Biểu mẫu phải có ít nhất 1 trường dữ liệu!");
      return;
    }

    setSaving(true);
    try {
      await onSave(template);
      toast.success("Đã lưu Biểu mẫu thành công!");
    } catch (e: any) {
      toast.error(`Lỗi khi lưu biểu mẫu: ${e?.message || "Không thể kết nối máy chủ"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Bộ Thiết Kế Biểu Mẫu Tùy Biến (Dynamic Form Studio)
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                ISO 22000 Clause 8.2 & 8.5
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Tạo biểu mẫu giám sát đo đạc, checklist vệ sinh, nghiệm thu IQC và phiếu đánh giá động.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-200/70 p-1 border border-slate-300">
            <button
              onClick={() => setActiveTab("DESIGN")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "DESIGN"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Thiết Kế Cấu Trúc
            </button>
            <button
              onClick={() => setActiveTab("PREVIEW")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === "PREVIEW"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Xem Trước Biểu Mẫu
            </button>
          </div>

          <Button
            onClick={handleSaveSubmit}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? "Đang lưu..." : "Lưu Biểu Mẫu"}
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
      {activeTab === "PREVIEW" ? (
        <div className="flex-1 p-6 overflow-y-auto bg-slate-100/60">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Chế độ xem trước tương tác thực tế - Người dùng có thể nhập liệu trực tiếp để kiểm tra tính năng.</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("DESIGN")}
                className="text-xs bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                Quay lại sửa thiết kế
              </Button>
            </div>
            <DynamicFormRenderer
              template={template}
              onSubmit={(vals: Record<string, any>) => {
                toast.success("Dữ liệu xem trước hợp lệ!");
                console.log("Preview Form Values:", vals);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-12 overflow-hidden bg-white">
          {/* Left Column: Metadata & Add Field Toolbox (Width: 3 cols) */}
          <div className="col-span-12 md:col-span-3 border-r border-slate-200 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
            {/* Metadata Card */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                Thông Tin Biểu Mẫu
              </h3>

              <div>
                <label className="text-xs font-semibold text-slate-700">Phân hệ áp dụng</label>
                <select
                  value={template.module}
                  onChange={(e) => setTemplate({ ...template, module: e.target.value })}
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                >
                  {MODULE_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Mã Biểu Mẫu *</label>
                <input
                  type="text"
                  value={template.code}
                  onChange={(e) => setTemplate({ ...template, code: e.target.value })}
                  placeholder="VD: FORM-GMP-01"
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono font-bold focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Tên Biểu Mẫu *</label>
                <input
                  type="text"
                  value={template.title}
                  onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                  placeholder="VD: Phiếu Kiểm Tra Vệ Sinh Xưởng"
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Phiên bản</label>
                  <input
                    type="text"
                    value={template.version}
                    onChange={(e) => setTemplate({ ...template, version: e.target.value })}
                    className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Trạng thái</label>
                  <select
                    value={template.status}
                    onChange={(e) => setTemplate({ ...template, status: e.target.value })}
                    className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="DRAFT">Bản nháp</option>
                    <option value="ARCHIVED">Lưu trữ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Mô tả / Ghi chú</label>
                <textarea
                  rows={2}
                  value={template.description || ""}
                  onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                  placeholder="Căn cứ áp dụng ISO 22000..."
                  className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Field Toolbox */}
            <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Thêm Loại Trường Mới
              </h3>
              <div className="grid grid-cols-1 gap-1.5">
                {FIELD_TYPES.map((ft) => {
                  const Icon = ft.icon;
                  return (
                    <button
                      key={ft.type}
                      onClick={() => handleAddField(ft.type)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-left transition-all group"
                    >
                      <div className="p-1 rounded bg-white border border-slate-200 text-slate-600 group-hover:text-emerald-700 group-hover:border-emerald-300">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 truncate">
                          {ft.label}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{ft.desc}</div>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Middle Column: Field List Structure (Width: 5 cols) */}
          <div className="col-span-12 md:col-span-5 border-r border-slate-200 p-4 overflow-y-auto space-y-3 bg-slate-50/20">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                Danh Sách Trường Dữ Liệu ({template.fields.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">Bấm chọn để cấu hình chi tiết</span>
            </div>

            {template.fields.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs border-2 border-dashed border-slate-200 rounded-xl p-6 bg-white">
                Chưa có trường dữ liệu nào. Vui lòng chọn loại trường từ cột bên trái để thêm!
              </div>
            ) : (
              <div className="space-y-2">
                {template.fields.map((f, idx) => {
                  const isSelected = f.id === selectedFieldId;
                  const ftInfo = FIELD_TYPES.find((t) => t.type === f.type);
                  const Icon = ftInfo?.icon || FileText;

                  return (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFieldId(f.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? "bg-emerald-50/80 border-emerald-500 shadow-md ring-1 ring-emerald-400"
                          : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-400 pt-0.5">{idx + 1}.</div>
                      <div className={`p-2 rounded-lg border shrink-0 ${
                        isSelected ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {f.label || "Chưa đặt tên"}
                          </span>
                          {f.required && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold border border-rose-200">
                              Bắt buộc
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="font-mono text-slate-600 bg-slate-100 px-1 rounded">{f.name}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">{f.type}</span>
                          {f.unit && <span className="text-slate-600 font-mono">[{f.unit}]</span>}
                        </div>
                      </div>

                      {/* Reorder & Delete controls */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveField(idx, "UP")}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30"
                          title="Di chuyển lên"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === template.fields.length - 1}
                          onClick={() => handleMoveField(idx, "DOWN")}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30"
                          title="Di chuyển xuống"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteField(f.id)}
                          className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Xóa trường"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Selected Field Inspector (Width: 4 cols) */}
          <div className="col-span-12 md:col-span-4 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
            <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-emerald-600" />
                Cấu Hình Thuộc Tính Trường
              </h3>
              {selectedField && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold border border-emerald-200">
                  {selectedField.type}
                </span>
              )}
            </div>

            {selectedField ? (
              <div className="space-y-3.5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <label className="text-xs font-bold text-slate-800">Tiêu đề hiển thị (Label) *</label>
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) => handleUpdateField(selectedField.id, { label: e.target.value })}
                    className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Tên biến dữ liệu (Key / Variable Name)</label>
                  <input
                    type="text"
                    value={selectedField.name}
                    onChange={(e) => handleUpdateField(selectedField.id, { name: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-mono focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Gợi ý nhập liệu (Placeholder)</label>
                  <input
                    type="text"
                    value={selectedField.placeholder || ""}
                    onChange={(e) => handleUpdateField(selectedField.id, { placeholder: e.target.value })}
                    placeholder="VD: Nhập kết quả đo..."
                    className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 pb-1">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Trường bắt buộc</div>
                    <div className="text-[10px] text-slate-500">Không cho phép để trống khi nộp</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={(e) => handleUpdateField(selectedField.id, { required: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>

                {/* NUMBER CONFIG */}
                {selectedField.type === "NUMBER" && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-200">
                    <div className="text-xs font-bold text-emerald-700">Giới hạn thông số đo</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">Tối thiểu</label>
                        <input
                          type="number"
                          value={selectedField.min_val ?? ""}
                          onChange={(e) =>
                            handleUpdateField(selectedField.id, {
                              min_val: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">Tối đa</label>
                        <input
                          type="number"
                          value={selectedField.max_val ?? ""}
                          onChange={(e) =>
                            handleUpdateField(selectedField.id, {
                              max_val: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                          }
                          className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">Đơn vị</label>
                        <input
                          type="text"
                          value={selectedField.unit || ""}
                          onChange={(e) => handleUpdateField(selectedField.id, { unit: e.target.value })}
                          placeholder="°C, ppm, phút"
                          className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SELECT CONFIG */}
                {selectedField.type === "SELECT" && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <label className="text-xs font-bold text-slate-800">
                      Các lựa chọn (Mỗi dòng một mục)
                    </label>
                    <textarea
                      rows={3}
                      value={(selectedField.options || []).join("\n")}
                      onChange={(e) =>
                        handleUpdateField(selectedField.id, {
                          options: e.target.value.split("\n").filter((x) => x.trim()),
                        })
                      }
                      className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-700">Hướng dẫn / Chú thích nghiệp vụ</label>
                  <input
                    type="text"
                    value={selectedField.help_text || ""}
                    onChange={(e) => handleUpdateField(selectedField.id, { help_text: e.target.value })}
                    placeholder="VD: Kiểm tra theo tiêu chuẩn ISO 22000 Điều khoản 8.2"
                    className="w-full mt-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs border-2 border-dashed border-slate-200 rounded-xl p-4 bg-white">
                Vui lòng chọn 1 trường ở danh sách giữa để cấu hình thuộc tính.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
