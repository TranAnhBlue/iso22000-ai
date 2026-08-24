import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader, AIBadge } from "@/components/PageHeader";
import { CrudTable, Pill, type CrudField } from "@/components/CrudTable";
import { useCollection, type Row } from "@/lib/crud-store";

export const Route = createFileRoute("/capa")({
  head: () => ({
    meta: [
      { title: "CAPA & Không phù hợp – WCERT FSMS" },
      { name: "description", content: "Ghi nhận NC, phân tích nguyên nhân gốc rễ và theo dõi hành động khắc phục phòng ngừa." },
      { property: "og:title", content: "CAPA & Không phù hợp – WCERT FSMS" },
      { property: "og:description", content: "Quản lý CAPA đầy đủ: thêm, sửa, xoá và theo dõi trạng thái." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell module="capa">
      <CAPA />
    </AppShell>
  ),
});

const STATUSES = ["Mới phát hiện", "Đang xử lý", "Chờ đánh giá", "Hoàn thành", "Không hiệu lực"];

const SEED: Row[] = [
  { id: "NC-2026-018", title: "Nhiệt độ kho lạnh vượt ngưỡng 2h", src: "HACCP", severity: "Cao", status: "Đang xử lý", due: "20/06/2026", owner: "Lê Văn C" },
  { id: "NC-2026-017", title: "NV không đội mũ trong khu sản xuất", src: "PRP", severity: "Trung bình", status: "Chờ đánh giá", due: "18/06/2026", owner: "Trần Thị B" },
  { id: "NC-2026-016", title: "Sai lệch khối lượng đóng gói lô L0612", src: "ĐGNB", severity: "Thấp", status: "Hoàn thành", due: "10/06/2026", owner: "Phạm Thị D" },
  { id: "NC-2026-015", title: "Máy dò kim loại báo lỗi cảm biến", src: "Thiết bị", severity: "Cao", status: "Mới phát hiện", due: "16/06/2026", owner: "Vũ Thị F" },
  { id: "NC-2026-014", title: "Nhà cung cấp NCC-07 trễ giao COA", src: "Mua hàng", severity: "Trung bình", status: "Đang xử lý", due: "22/06/2026", owner: "Hoàng Văn E" },
];

function sevColor(s: string) {
  return s === "Cao" ? "bg-rose-500/10 text-rose-700" : s === "Trung bình" ? "bg-amber-500/10 text-amber-700" : "bg-sky-500/10 text-sky-700";
}
function stColor(s: string) {
  if (s === "Hoàn thành") return "bg-emerald-500/10 text-emerald-700";
  if (s === "Đang xử lý") return "bg-amber-500/10 text-amber-700";
  if (s === "Mới phát hiện") return "bg-rose-500/10 text-rose-700";
  if (s === "Chờ đánh giá") return "bg-sky-500/10 text-sky-700";
  return "bg-muted text-muted-foreground";
}

const FIELDS: CrudField[] = [
  { key: "title", label: "Tiêu đề", required: true },
  { key: "src", label: "Nguồn", type: "select", options: ["HACCP", "PRP", "ĐGNB", "Thiết bị", "Mua hàng", "Khiếu nại khách hàng"] },
  { key: "severity", label: "Mức độ", type: "select", options: ["Cao", "Trung bình", "Thấp"], render: (v: string) => <Pill value={v} tone={sevColor(v)} /> },
  { key: "status", label: "Trạng thái", type: "select", options: STATUSES, render: (v: string) => <Pill value={v} tone={stColor(v)} /> },
  { key: "due", label: "Hạn xử lý", placeholder: "dd/mm/yyyy" },
  { key: "owner", label: "Người phụ trách" },
  { key: "rootCause", label: "Nguyên nhân gốc rễ (5-Why)", type: "textarea", hideInTable: true },
  { key: "action", label: "Hành động khắc phục", type: "textarea", hideInTable: true },
];

function CAPA() {
  const { rows, create, update, remove, reset } = useCollection("capa", SEED);

  return (
    <div className="space-y-6">
      <PageHeader
        title="CAPA & Không phù hợp (NC)"
        description="Ghi nhận, phân tích nguyên nhân gốc rễ, theo dõi hành động khắc phục & phòng ngừa."
      />

      <AIBadge>
        <b>AI hỗ trợ:</b> Gợi ý hành động dựa trên dữ liệu quá khứ · Phân tích nguyên nhân gốc rễ (5-Why, fishbone) ·
        Phát hiện KPH lặp lại · Đề xuất biện pháp phòng ngừa.
      </AIBadge>

      <div className="grid gap-3 md:grid-cols-5">
        {STATUSES.map((s) => (
          <div key={s} className="rounded-xl border bg-card p-4">
            <div className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${stColor(s)}`}>{s}</div>
            <div className="mt-2 text-2xl font-bold">{rows.filter((r) => r.status === s).length}</div>
          </div>
        ))}
      </div>

      <CrudTable
        fields={FIELDS}
        rows={rows}
        onCreate={create}
        onUpdate={update}
        onDelete={remove}
        onReset={reset}
        idLabel="Mã NC"
        idPrefix="NC-2026"
        addLabel="Khởi tạo CAPA"
      />
    </div>
  );
}
