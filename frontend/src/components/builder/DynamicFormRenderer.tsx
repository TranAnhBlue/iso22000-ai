import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Send,
  Star,
  Calendar,
  Clock,
  PenTool,
  Camera,
  Info,
  ShieldCheck,
  FileCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { FormField, FormTemplateData } from "./types";

interface DynamicFormRendererProps {
  template: FormTemplateData;
  onSubmit: (values: Record<string, any>) => void;
  onCancel?: () => void;
  disabled?: boolean;
  initialValues?: Record<string, any>;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  template,
  onSubmit,
  onCancel,
  disabled = false,
  initialValues = {},
}) => {
  const [formValues, setFormValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = { ...initialValues };
    template.fields.forEach((f) => {
      if (initial[f.name] === undefined) {
        if (f.default_value !== undefined) {
          initial[f.name] = f.default_value;
        } else if (f.type === "YESNO") {
          initial[f.name] = true;
        } else if (f.type === "RATING") {
          initial[f.name] = 5;
        } else if (f.type === "SELECT" && f.options && f.options.length > 0) {
          initial[f.name] = f.options[0];
        } else {
          initial[f.name] = "";
        }
      }
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (name: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    template.fields.forEach((f) => {
      const val = formValues[f.name];
      if (f.required) {
        if (val === undefined || val === null || val === "") {
          newErrors[f.name] = `Vui lòng nhập "${f.label}"`;
          return;
        }
      }

      if (f.type === "NUMBER" && val !== "" && val !== undefined) {
        const num = parseFloat(val);
        if (isNaN(num)) {
          newErrors[f.name] = `"${f.label}" phải là giá trị số`;
        } else {
          if (f.min_val !== undefined && num < f.min_val) {
            newErrors[f.name] = `Giá trị tối thiểu cho phép là ${f.min_val} ${f.unit || ""}`;
          }
          if (f.max_val !== undefined && num > f.max_val) {
            newErrors[f.name] = `Giá trị tối đa cho phép là ${f.max_val} ${f.unit || ""}`;
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Vui lòng hoàn thiện các trường dữ liệu còn thiếu hoặc sai định dạng!");
      return;
    }

    setSubmitting(true);
    try {
      onSubmit(formValues);
    } finally {
      setSubmitting(false);
    }
  };

  // Tính điểm tuân thủ (%) dựa trên các trường Yes/No và Rating
  const complianceScore = (() => {
    let totalChecks = 0;
    let passedChecks = 0;

    template.fields.forEach((f) => {
      if (f.type === "YESNO") {
        totalChecks++;
        if (formValues[f.name] === true) passedChecks++;
      } else if (f.type === "RATING") {
        totalChecks++;
        const rating = Number(formValues[f.name] || 0);
        passedChecks += rating / 5;
      }
    });

    if (totalChecks === 0) return 100;
    return Math.round((passedChecks / totalChecks) * 100);
  })();

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-h-[90vh] flex flex-col bg-white text-slate-800 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden font-sans"
    >
      {/* Header Info - Always visible at top */}
      <div className="bg-slate-50 border-b border-slate-200 p-5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {template.code}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                Phiên bản: {template.version}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                Phân hệ: {template.module}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{template.title}</h2>
            {template.description && (
              <p className="text-xs text-slate-600 mt-1">{template.description}</p>
            )}
          </div>

          {/* Compliance Badge & Close Action */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Điểm Tuân Thủ Dự Kiến
                </div>
                <div
                  className={`text-base font-black ${
                    complianceScore >= 90
                      ? "text-emerald-700"
                      : complianceScore >= 70
                      ? "text-amber-700"
                      : "text-rose-700"
                  }`}
                >
                  {complianceScore}%
                </div>
              </div>
              <div
                className={`p-1.5 rounded-lg border ${
                  complianceScore >= 90
                    ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                    : complianceScore >= 70
                    ? "bg-amber-100 text-amber-700 border-amber-300"
                    : "bg-rose-100 text-rose-700 border-rose-300"
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="p-2 rounded-xl border border-slate-300 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 shadow-sm transition-colors"
                title="Đóng phiếu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fields List - Scrollable Body */}
      <div className="p-6 space-y-5 divide-y divide-slate-100 overflow-y-auto flex-1">
        {template.fields.map((field, idx) => {
          const value = formValues[field.name];
          const hasError = !!errors[field.name];

          return (
            <div key={field.id} className={`pt-4 first:pt-0 space-y-2`}>
              <div className="flex items-start justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="text-slate-500">{idx + 1}.</span>
                  <span>{field.label}</span>
                  {field.required && <span className="text-rose-600 font-bold">*</span>}
                </label>
                {field.unit && (
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Đơn vị: {field.unit}
                  </span>
                )}
              </div>

              {/* RENDER FIELD INPUT ACCORDING TO TYPE */}
              {field.type === "TEXT" && (
                <input
                  type="text"
                  disabled={disabled}
                  value={value || ""}
                  placeholder={field.placeholder || "Nhập thông tin..."}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className={`w-full bg-white border rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none transition-all ${
                    hasError
                      ? "border-rose-400 focus:border-rose-500 ring-1 ring-rose-300"
                      : "border-slate-300 focus:border-emerald-600"
                  }`}
                />
              )}

              {field.type === "NUMBER" && (
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    disabled={disabled}
                    value={value !== undefined ? value : ""}
                    placeholder={field.placeholder || "Nhập giá trị số..."}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className={`w-full bg-white border rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none transition-all ${
                      hasError
                        ? "border-rose-400 focus:border-rose-500 ring-1 ring-rose-300"
                        : "border-slate-300 focus:border-emerald-600"
                    }`}
                  />
                  {field.unit && (
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-500 font-bold">
                      {field.unit}
                    </span>
                  )}
                </div>
              )}

              {field.type === "SELECT" && (
                <select
                  disabled={disabled}
                  value={value || ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="">-- Vui lòng chọn một mục --</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {field.type === "YESNO" && (
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleChange(field.name, true)}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                      value === true
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    ĐẠT TIÊU CHUẨN (PASS)
                  </button>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleChange(field.name, false)}
                    className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                      value === false
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    KHÔNG ĐẠT (FAIL / CẢNH BÁO)
                  </button>
                </div>
              )}

              {field.type === "RATING" && (
                <div className="flex items-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleChange(field.name, star)}
                      className={`p-2 rounded-xl border transition-all ${
                        Number(value || 0) >= star
                          ? "bg-amber-100 border-amber-400 text-amber-600"
                          : "bg-slate-50 border-slate-300 text-slate-300 hover:text-amber-500"
                      }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">
                    {value || 0}/5 Sao
                  </span>
                </div>
              )}

              {field.type === "DATE" && (
                <div className="relative">
                  <input
                    type="date"
                    disabled={disabled}
                    value={value || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              )}

              {field.type === "TIME" && (
                <div className="relative">
                  <input
                    type="time"
                    disabled={disabled}
                    value={value || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              )}

              {field.type === "SIGNATURE" && (
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-700">
                    <span className="font-semibold flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5 text-blue-600" /> Ký tên điện tử xác nhận
                    </span>
                    <span className="text-[10px] text-slate-500">Ký họ tên hoặc mã KCS</span>
                  </div>
                  <input
                    type="text"
                    disabled={disabled}
                    value={value || ""}
                    placeholder="Nhập chữ ký điện tử hoặc họ tên người phụ trách..."
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              )}

              {field.type === "PHOTO" && (
                <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center space-y-2">
                  <Camera className="w-6 h-6 text-slate-400 mx-auto" />
                  <div className="text-xs text-slate-700 font-semibold">Tải lên hình ảnh bằng chứng hiện trường</div>
                  <input
                    type="text"
                    disabled={disabled}
                    value={value || ""}
                    placeholder="Nhập đường dẫn URL ảnh hoặc ghi chú ảnh hiện trường..."
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              )}

              {/* Helper text or validation error message */}
              {hasError ? (
                <div className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {errors[field.name]}
                </div>
              ) : field.help_text ? (
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  {field.help_text}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Footer Submit Bar */}
      {!disabled && (
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>Xác nhận thông tin đo đạc chính xác theo tiêu chuẩn ISO 22000:2018</span>
          </div>

          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 px-4 py-2.5 rounded-xl"
              >
                Hủy / Đóng
              </Button>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Đang xử lý..." : "Xác Nhận Nộp Phiếu Kiểm Tra"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
};

export default DynamicFormRenderer;
