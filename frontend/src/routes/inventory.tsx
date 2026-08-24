import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader, AIBadge } from "@/components/PageHeader";
import { CrudTable, Pill, type CrudField } from "@/components/CrudTable";
import { useCollection, type Row } from "@/lib/crud-store";
import { Package } from "lucide-react";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Kho & Truy xuất nguồn gốc – WCERT FSMS" },
      { name: "description", content: "Quản lý nhập – xuất – tồn, mẫu lưu và truy xuất lô sản xuất theo ISO 22000." },
      { property: "og:title", content: "Kho & Truy xuất nguồn gốc – WCERT FSMS" },
      { property: "og:description", content: "Thêm, sửa, xoá tồn kho nguyên liệu và mẫu lưu sản phẩm." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell module="inventory">
      <Inv />
    </AppShell>
  ),
});

const STOCK_SEED: Row[] = [
  { id: "NL-01", name: "Cá tươi nguyên liệu", qty: 1240, unit: "kg", level: 65, lot: "NL-2606-04" },
  { id: "NL-02", name: "Bột mì A", qty: 320, unit: "kg", level: 30, lot: "BM-2605-11" },
  { id: "NL-03", name: "Gia vị tổng hợp", qty: 85, unit: "kg", level: 80, lot: "GV-2606-02" },
  { id: "NL-04", name: "Bao bì PE 500g", qty: 12500, unit: "cái", level: 50, lot: "BB-2604-09" },
];

const SAMPLE_SEED: Row[] = [
  { id: "M-L0612", name: "Chả cá L0612", cabinet: "T-02", date: "12/06/2026", result: "Đạt" },
  { id: "M-L0611", name: "Chả cá L0611", cabinet: "T-02", date: "11/06/2026", result: "Đạt" },
  { id: "M-L0610", name: "Cá viên L0610", cabinet: "T-01", date: "10/06/2026", result: "Đạt" },
  { id: "M-L0609", name: "Chả cá L0609", cabinet: "T-02", date: "09/06/2026", result: "Đạt" },
];

const STOCK_FIELDS: CrudField[] = [
  { key: "name", label: "Nguyên liệu", required: true },
  { key: "qty", label: "Số lượng", type: "number" },
  { key: "unit", label: "ĐVT", type: "select", options: ["kg", "cái", "lít", "thùng"] },
  { key: "lot", label: "Mã lô", mono: true },
  {
    key: "level",
    label: "Mức tồn",
    type: "number",
    render: (v: number) => (
      <div className="h-1.5 w-24 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, Number(v) || 0))}%` }} />
      </div>
    ),
  },
];

const SAMPLE_FIELDS: CrudField[] = [
  { key: "name", label: "Mẫu lưu", required: true },
  { key: "cabinet", label: "Tủ", type: "select", options: ["T-01", "T-02", "T-03"] },
  { key: "date", label: "Ngày lưu", placeholder: "dd/mm/yyyy" },
  {
    key: "result",
    label: "Kết quả",
    type: "select",
    options: ["Đạt", "Không đạt", "Đang kiểm"],
    render: (v: string) => (
      <Pill value={v} tone={v === "Đạt" ? "bg-emerald-500/10 text-emerald-700" : v === "Không đạt" ? "bg-rose-500/10 text-rose-700" : "bg-amber-500/10 text-amber-700"} />
    ),
  },
];

function Inv() {
  const stock = useCollection("inventory-stock", STOCK_SEED);
  const samples = useCollection("inventory-samples", SAMPLE_SEED);

  return (
    <div className="space-y-6">
      <PageHeader title="Kho & Truy xuất nguồn gốc" description="Quản lý nhập – xuất – tồn, mẫu lưu, lô sản xuất và truy xuất ngược/xuôi." />
      <AIBadge>
        <b>AI hỗ trợ:</b> Dự báo nhu cầu nguyên liệu · Cảnh báo lô gần hết hạn (FEFO) · Truy xuất tự động khi có sự cố ATTP.
      </AIBadge>

      <CrudTable
        title="Tồn kho nguyên liệu"
        fields={STOCK_FIELDS}
        rows={stock.rows}
        onCreate={stock.create}
        onUpdate={stock.update}
        onDelete={stock.remove}
        onReset={stock.reset}
        idPrefix="NL"
        addLabel="Thêm nguyên liệu"
      />

      <CrudTable
        title="Mẫu lưu sản phẩm"
        fields={SAMPLE_FIELDS}
        rows={samples.rows}
        onCreate={samples.create}
        onUpdate={samples.update}
        onDelete={samples.remove}
        onReset={samples.reset}
        idPrefix="M"
        addLabel="Thêm mẫu lưu"
      />

      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Truy xuất lô L0612 – Chả cá</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {["NCC: Hải sản A", "Lô NL: NL-2606-04", "Sản xuất: 12/06 ca 2", "Đóng gói: 12/06 17:00", "Khách hàng: SR Hồ Chí Minh", "Mẫu lưu T-02"].map((s) => (
            <span key={s} className="rounded-full border bg-muted/30 px-3 py-1">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
