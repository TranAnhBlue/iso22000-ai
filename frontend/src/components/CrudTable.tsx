import React, { useState, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export interface CrudField {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "date" | "textarea";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  mono?: boolean;
  hideInTable?: boolean;
  render?: (val: any, row: any) => React.ReactNode;
}

export function Pill({ value, tone }: { value: string; tone?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone || "bg-primary/10 text-primary"}`}>
      {value}
    </span>
  );
}

interface CrudTableProps {
  title?: string;
  fields: CrudField[];
  rows: any[];
  onCreate: (row: Record<string, any>) => void;
  onUpdate: (id: string, patch: Record<string, any>) => void;
  onDelete: (id: string) => void;
  onReset?: () => void;
  idPrefix?: string;
  idLabel?: string;
  addLabel?: string;
  canEdit?: boolean;
}

export function CrudTable({
  title,
  fields,
  rows,
  onCreate,
  onUpdate,
  onDelete,
  addLabel = "Thêm bản ghi",
  canEdit = true,
}: CrudTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Lọc tìm kiếm
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((val) => String(val).toLowerCase().includes(term))
    );
  }, [rows, searchTerm]);

  const handleOpenCreate = () => {
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === "select" && f.options?.length) {
        initial[f.key] = f.options[0];
      } else {
        initial[f.key] = "";
      }
    });
    setFormData(initial);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (row: any) => {
    setEditingRow(row);
    setFormData({ ...row });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRow) {
      onUpdate(editingRow.id, formData);
      setEditingRow(null);
    } else {
      onCreate(formData);
      setIsCreateOpen(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      {/* Header Toolbar */}
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {title && <h3 className="text-base font-bold tracking-tight">{title}</h3>}
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>
        </div>

        {canEdit && (
          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-center w-12">STT</th>
              {fields.map((f) => (
                <th key={f.key} className="px-4 py-3">
                  {f.label}
                </th>
              ))}
              {canEdit && <th className="px-4 py-3 text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={fields.length + 2} className="py-8 text-center text-muted-foreground">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              filteredRows.map((r, index) => (
                <tr key={r.id || index} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-center font-medium text-muted-foreground">
                    {index + 1}
                  </td>
                  {fields.map((f) => (
                    <td key={f.key} className="px-4 py-3">
                      {f.render ? f.render(r[f.key], r) : r[f.key] ?? "—"}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Bạn có chắc chắn muốn xoá bản ghi này?")) {
                              onDelete(r.id);
                            }
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm/Sửa Bản ghi */}
      <Dialog open={isCreateOpen || !!editingRow} onOpenChange={() => { setIsCreateOpen(false); setEditingRow(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingRow ? "Chỉnh sửa thông tin" : addLabel}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className={`space-y-1.5 ${f.key === "name" ? "sm:col-span-2" : ""}`}>
                  <Label className="text-xs">
                    {f.label} {f.required && <span className="text-destructive">*</span>}
                  </Label>

                  {f.type === "select" ? (
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={formData[f.key] || ""}
                      onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                    >
                      {f.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={f.type || "text"}
                      required={f.required}
                      placeholder={f.label}
                      className="h-9 text-xs"
                      value={formData[f.key] ?? ""}
                      onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => { setIsCreateOpen(false); setEditingRow(null); }}>
                Huỷ
              </Button>
              <Button type="submit" size="sm">
                {editingRow ? "Lưu thay đổi" : "Thêm mới"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}