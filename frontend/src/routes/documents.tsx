import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader, AIBadge } from "@/components/PageHeader";
import { CrudTable, Pill, type CrudField } from "@/components/CrudTable";
import { useCollection, type Row } from "@/lib/crud-store";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Tài liệu & Hồ sơ – WCERT FSMS" },
      { name: "description", content: "Quản lý tài liệu ISO 22000:2018 5 cấp: soạn thảo, xem xét, phê duyệt, ban hành." },
      { property: "og:title", content: "Tài liệu & Hồ sơ – WCERT FSMS" },
      { property: "og:description", content: "Thêm, sửa, xoá tài liệu ISO 22000 với hỗ trợ AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell module="documents">
      <Documents />
    </AppShell>
  ),
});

const SEED: Row[] = [
  { id: "CS-01", name: "Chính sách chất lượng & ATTP", type: "Chính sách", dept: "Ban Giám đốc", ver: "3.0", std: "ISO 22000", status: "Đã duyệt" },
  { id: "ST-01", name: "Sổ tay chất lượng & ATTP", type: "Sổ tay", dept: "Ban QLCL", ver: "5.2", std: "ISO 22000 / 9001", status: "Đã duyệt" },
  { id: "QT-04", name: "Quy trình kiểm soát tài liệu", type: "Quy trình", dept: "Ban QLCL", ver: "2.1", std: "ISO 22000", status: "Đã duyệt" },
  { id: "QT-09", name: "Quy trình đánh giá nội bộ", type: "Quy trình", dept: "Ban QLCL", ver: "2.0", std: "ISO 22000", status: "Đang xem xét" },
  { id: "HD-PRD-03", name: "Hướng dẫn vận hành máy dò kim loại", type: "Hướng dẫn", dept: "Sản xuất", ver: "1.4", std: "HACCP CCP3", status: "Đã duyệt" },
  { id: "BM-HACCP-02", name: "Biểu mẫu giám sát CCP gia nhiệt", type: "Biểu mẫu", dept: "Sản xuất", ver: "2.3", std: "HACCP CCP2", status: "Đã duyệt" },
  { id: "TC-NL-01", name: "Tiêu chuẩn nguyên liệu cá tươi", type: "Tiêu chuẩn", dept: "Mua hàng", ver: "1.1", std: "ISO 22000", status: "Đã duyệt" },
  { id: "QT-12", name: "Quy trình truy xuất nguồn gốc & thu hồi", type: "Quy trình", dept: "Kinh doanh", ver: "1.0", std: "ISO 22000", status: "Đang xem xét" },
  { id: "HD-SSOP-04", name: "Hướng dẫn vệ sinh cá nhân", type: "Hướng dẫn", dept: "Sản xuất", ver: "3.0", std: "SSOP", status: "Đã duyệt" },
  { id: "BM-KTNL-01", name: "Báo cáo kiểm tra nguyên vật liệu", type: "Biểu mẫu", dept: "QC", ver: "2.0", std: "PRP", status: "Từ chối" },
];

function statusColor(s: string) {
  if (s === "Đã duyệt") return "bg-emerald-500/10 text-emerald-700";
  if (s === "Đang xem xét") return "bg-amber-500/10 text-amber-700";
  return "bg-rose-500/10 text-rose-700";
}

const FIELDS: CrudField[] = [
  { key: "name", label: "Tên tài liệu", required: true },
  { key: "type", label: "Loại", type: "select", options: ["Chính sách", "Sổ tay", "Quy trình", "Hướng dẫn", "Tiêu chuẩn", "Biểu mẫu"] },
  { key: "dept", label: "Phòng ban", type: "select", options: ["Ban Giám đốc", "Ban QLCL", "Sản xuất", "QC", "Mua hàng", "Kinh doanh", "Thiết bị"] },
  { key: "ver", label: "Phiên bản", placeholder: "1.0" },
  { key: "std", label: "Tiêu chuẩn", placeholder: "ISO 22000" },
  { key: "status", label: "Trạng thái", type: "select", options: ["Đã duyệt", "Đang xem xét", "Từ chối"], render: (v: string) => <Pill value={v} tone={statusColor(v)} /> },
];

function Documents() {
  const { rows, create, update, remove, reset } = useCollection("documents", SEED);
  const count = (t: string) => rows.filter((r) => r.type === t).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý tài liệu & hồ sơ"
        description="Phân cấp 5 cấp theo ISO 22000:2018. Quy trình soạn thảo → xem xét → phê duyệt → ban hành."
      />

      <AIBadge>
        <b>AI hỗ trợ:</b> Sinh dàn ý SOP theo ISO 22000:2018 · Gợi ý cải tiến · Phát hiện chồng chéo & từ vựng không chuẩn ·
        Đề xuất phiên bản mới khi tiêu chuẩn cập nhật.
      </AIBadge>

      <div className="grid gap-3 md:grid-cols-5">
        {[
          { l: "Cấp 1 — Chính sách", n: count("Chính sách"), c: "bg-primary/10 text-primary" },
          { l: "Cấp 2 — Sổ tay", n: count("Sổ tay"), c: "bg-accent/10 text-accent-foreground" },
          { l: "Cấp 3 — Quy trình", n: count("Quy trình"), c: "bg-emerald-500/10 text-emerald-700" },
          { l: "Cấp 4 — Tiêu chuẩn & HD", n: count("Tiêu chuẩn") + count("Hướng dẫn"), c: "bg-amber-500/10 text-amber-700" },
          { l: "Cấp 5 — Biểu mẫu", n: count("Biểu mẫu"), c: "bg-sky-500/10 text-sky-700" },
        ].map((x) => (
          <div key={x.l} className="rounded-xl border bg-card p-4">
            <div className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${x.c}`}>{x.l}</div>
            <div className="mt-2 text-2xl font-bold">{x.n}</div>
            <div className="text-xs text-muted-foreground">tài liệu</div>
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
        idPrefix="QT"
        addLabel="Tạo tài liệu"
      />
    </div>
  );
}
