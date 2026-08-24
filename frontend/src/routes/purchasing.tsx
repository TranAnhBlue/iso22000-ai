import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader, AIBadge } from "@/components/PageHeader";
import { CrudTable, Pill, type CrudField } from "@/components/CrudTable";
import { useCollection, type Row } from "@/lib/crud-store";

export const Route = createFileRoute("/purchasing")({
  head: () => ({
    meta: [
      { title: "Mua hàng & Nhà cung cấp – WCERT FSMS" },
      { name: "description", content: "Đánh giá nhà cung cấp định kỳ, hồ sơ COA và lịch sử giao hàng theo ISO 22000." },
      { property: "og:title", content: "Mua hàng & Nhà cung cấp – WCERT FSMS" },
      { property: "og:description", content: "Quản lý danh sách NCC: thêm, sửa, xoá và chấm điểm AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell module="purchasing">
      <P />
    </AppShell>
  ),
});

const SEED: Row[] = [
  { id: "NCC-01", name: "Cty Hải sản A", item: "Cá nguyên liệu", score: 92, status: "Đạt" },
  { id: "NCC-02", name: "Bột mì Bình Đông", item: "Bột mì", score: 88, status: "Đạt" },
  { id: "NCC-03", name: "Gia vị Sài Gòn", item: "Gia vị", score: 95, status: "Đạt" },
  { id: "NCC-07", name: "Bao bì Phú Mỹ", item: "Bao bì PE", score: 64, status: "Cảnh báo" },
  { id: "NCC-09", name: "Hóa chất An Lành", item: "Clo, chất tẩy", score: 78, status: "Đạt" },
];

const FIELDS: CrudField[] = [
  { key: "name", label: "Nhà cung cấp", required: true },
  { key: "item", label: "Mặt hàng" },
  {
    key: "score",
    label: "Điểm AI",
    type: "number",
    render: (v: number) => (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${v >= 80 ? "bg-emerald-500" : v >= 70 ? "bg-amber-500" : "bg-rose-500"}`}
            style={{ width: `${Math.max(0, Math.min(100, Number(v) || 0))}%` }}
          />
        </div>
        <span className="text-xs">{v}</span>
      </div>
    ),
  },
  {
    key: "status",
    label: "Trạng thái",
    type: "select",
    options: ["Đạt", "Cảnh báo", "Ngừng hợp tác"],
    render: (v: string) => (
      <Pill value={v} tone={v === "Đạt" ? "bg-emerald-500/10 text-emerald-700" : v === "Cảnh báo" ? "bg-amber-500/10 text-amber-700" : "bg-rose-500/10 text-rose-700"} />
    ),
  },
  { key: "contact", label: "Liên hệ", hideInTable: true },
];

function P() {
  const { rows, create, update, remove, reset } = useCollection("suppliers", SEED);

  return (
    <div className="space-y-6">
      <PageHeader title="Mua hàng & Quản lý nhà cung cấp" description="Đánh giá NCC định kỳ, hồ sơ COA, lịch sử giao hàng." />
      <AIBadge>
        <b>AI hỗ trợ:</b> Chấm điểm NCC tự động theo chất lượng, giao hàng & sự cố · Cảnh báo NCC có rủi ro tăng · Đề xuất NCC dự phòng.
      </AIBadge>

      <CrudTable
        fields={FIELDS}
        rows={rows}
        onCreate={create}
        onUpdate={update}
        onDelete={remove}
        onReset={reset}
        idPrefix="NCC"
        addLabel="Thêm nhà cung cấp"
      />
    </div>
  );
}
