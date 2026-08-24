import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader, AIBadge } from "@/components/PageHeader";
import { CrudTable, Pill, type CrudField } from "@/components/CrudTable";
import { useCollection, type Row } from "@/lib/crud-store";
import { Wrench, Calendar, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: "Thiết bị & Bảo trì – WCERT FSMS" },
      { name: "description", content: "Quản lý hồ sơ thiết bị, lịch hiệu chuẩn và bảo trì phòng ngừa theo ISO 22000." },
      { property: "og:title", content: "Thiết bị & Bảo trì – WCERT FSMS" },
      { property: "og:description", content: "Thêm, sửa, xoá thiết bị và theo dõi hạn hiệu chuẩn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell module="equipment">
      <Eq />
    </AppShell>
  ),
});

const SEED: Row[] = [
  { id: "EQ-001", name: "Máy dò kim loại CCP3", dept: "SX dây chuyền A", lastCal: "12/03/2026", nextCal: "12/09/2026", status: "OK" },
  { id: "EQ-002", name: "Lò gia nhiệt L02 (CCP2)", dept: "SX dây chuyền A", lastCal: "05/04/2026", nextCal: "05/10/2026", status: "OK" },
  { id: "EQ-003", name: "Tủ cấp đông CD-3", dept: "Kho lạnh", lastCal: "20/01/2026", nextCal: "20/07/2026", status: "Sắp đến hạn" },
  { id: "EQ-004", name: "Cân điện tử 5kg #02", dept: "Đóng gói", lastCal: "10/12/2025", nextCal: "10/06/2026", status: "Quá hạn" },
  { id: "EQ-005", name: "Nhiệt kế hồng ngoại NT-01", dept: "QC", lastCal: "01/05/2026", nextCal: "01/11/2026", status: "OK" },
];

function st(s: string) {
  if (s === "OK") return "bg-emerald-500/10 text-emerald-700";
  if (s === "Sắp đến hạn") return "bg-amber-500/10 text-amber-700";
  return "bg-rose-500/10 text-rose-700";
}

const FIELDS: CrudField[] = [
  { key: "name", label: "Tên thiết bị", required: true },
  { key: "dept", label: "Bộ phận", type: "select", options: ["SX dây chuyền A", "SX dây chuyền B", "Kho lạnh", "Đóng gói", "QC"] },
  { key: "lastCal", label: "Hiệu chuẩn lần cuối", placeholder: "dd/mm/yyyy" },
  { key: "nextCal", label: "Lần tới", placeholder: "dd/mm/yyyy" },
  { key: "status", label: "Trạng thái", type: "select", options: ["OK", "Sắp đến hạn", "Quá hạn"], render: (v: string) => <Pill value={v} tone={st(v)} /> },
  { key: "note", label: "Ghi chú bảo trì", type: "textarea", hideInTable: true },
];

function Eq() {
  const { rows, create, update, remove, reset } = useCollection("equipment", SEED);

  return (
    <div className="space-y-6">
      <PageHeader title="Thiết bị & Bảo trì" description="Quản lý hồ sơ, lịch hiệu chuẩn (calibration) & bảo trì phòng ngừa (PM)." />

      <AIBadge>
        <b>AI hỗ trợ:</b> Dự báo hỏng hóc dựa trên lịch sử & dữ liệu cảm biến · Tối ưu chu kỳ PM · Cảnh báo thiết bị sắp hết hạn hiệu chuẩn.
      </AIBadge>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi icon={<Wrench />} v={String(rows.length)} l="Thiết bị" />
        <Kpi icon={<Calendar />} v={String(rows.filter((r) => r.status === "OK").length)} l="Trong hạn" />
        <Kpi icon={<AlertCircle />} v={String(rows.filter((r) => r.status === "Quá hạn").length)} l="Quá hạn hiệu chuẩn" />
        <Kpi icon={<Calendar />} v={String(rows.filter((r) => r.status === "Sắp đến hạn").length)} l="Sắp đến hạn" />
      </div>

      <CrudTable
        fields={FIELDS}
        rows={rows}
        onCreate={create}
        onUpdate={update}
        onDelete={remove}
        onReset={reset}
        idPrefix="EQ"
        addLabel="Thêm thiết bị"
      />
    </div>
  );
}

function Kpi({ icon, v, l }: { icon: React.ReactNode; v: string; l: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      <div className="mt-3 text-2xl font-bold">{v}</div>
      <div className="text-sm text-muted-foreground">{l}</div>
    </div>
  );
}
