import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader, AIBadge } from "@/components/PageHeader";
import { CrudTable, Pill, type CrudField } from "@/components/CrudTable";
import { useCollection, type Row } from "@/lib/crud-store";

export const Route = createFileRoute("/prp")({
  head: () => ({
    meta: [
      { title: "PRP / GMP / SSOP – WCERT FSMS" },
      { name: "description", content: "Thư viện checklist GMP, SSOP và giám sát tuân thủ theo ca sản xuất." },
      { property: "og:title", content: "PRP / GMP / SSOP – WCERT FSMS" },
      { property: "og:description", content: "Quản lý chương trình tiên quyết: thêm, sửa, xoá checklist và hạng mục giám sát." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell module="prp">
      <PRP />
    </AppShell>
  ),
});

const PRP_SEED: Row[] = [
  { id: "GMP-01", name: "GMP tiếp nhận nguyên liệu", group: "GMP", status: "Tuân thủ", owner: "QC" },
  { id: "GMP-02", name: "GMP bảo quản lạnh", group: "GMP", status: "Tuân thủ", owner: "Kho lạnh" },
  { id: "GMP-03", name: "GMP sản xuất chả cá", group: "GMP", status: "Tuân thủ", owner: "Sản xuất" },
  { id: "GMP-04", name: "GMP cấp đông", group: "GMP", status: "Không phù hợp", owner: "Kho lạnh" },
  { id: "GMP-05", name: "GMP đóng gói", group: "GMP", status: "Tuân thủ", owner: "Đóng gói" },
  { id: "SSOP-01", name: "Nguồn nước", group: "SSOP", status: "Tuân thủ", owner: "QC" },
  { id: "SSOP-02", name: "Vệ sinh thiết bị", group: "SSOP", status: "Tuân thủ", owner: "Sản xuất" },
  { id: "SSOP-03", name: "Phòng chống nhiễm chéo", group: "SSOP", status: "Không phù hợp", owner: "Sản xuất" },
  { id: "SSOP-04", name: "Vệ sinh cá nhân", group: "SSOP", status: "Tuân thủ", owner: "HC-NS" },
  { id: "SSOP-05", name: "Kiểm soát côn trùng", group: "SSOP", status: "Tuân thủ", owner: "Bảo trì" },
];

const CHECK_SEED: Row[] = [
  { id: "CK-01", time: "06:30", task: "Kiểm tra nhiệt độ kho lạnh", shift: "Ca sáng", result: "Đạt" },
  { id: "CK-02", time: "07:00", task: "Vệ sinh dây chuyền A", shift: "Ca sáng", result: "Đạt" },
  { id: "CK-03", time: "08:15", task: "Test nồng độ Clo nước rửa", shift: "Ca sáng", result: "Đạt" },
  { id: "CK-04", time: "09:00", task: "Kiểm tra vệ sinh cá nhân (15 NV)", shift: "Ca sáng", result: "Cần khắc phục" },
  { id: "CK-05", time: "10:30", task: "Bẫy côn trùng khu kho", shift: "Ca sáng", result: "Chờ thực hiện" },
  { id: "CK-06", time: "11:00", task: "Hiệu chuẩn cân định lượng", shift: "Ca sáng", result: "Chờ thực hiện" },
];

const prpTone = (v: string) => (v === "Tuân thủ" ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700");
const ckTone = (v: string) =>
  v === "Đạt" ? "bg-emerald-500/10 text-emerald-700" : v === "Cần khắc phục" ? "bg-amber-500/10 text-amber-700" : "bg-muted text-muted-foreground";

const PRP_FIELDS: CrudField[] = [
  { key: "name", label: "Hạng mục", required: true },
  { key: "group", label: "Nhóm", type: "select", options: ["GMP", "SSOP", "5S"] },
  { key: "owner", label: "Bộ phận" },
  { key: "status", label: "Trạng thái", type: "select", options: ["Tuân thủ", "Không phù hợp"], render: (v: string) => <Pill value={v} tone={prpTone(v)} /> },
];

const CK_FIELDS: CrudField[] = [
  { key: "time", label: "Giờ", placeholder: "07:00", mono: true },
  { key: "task", label: "Nội dung kiểm tra", required: true },
  { key: "shift", label: "Ca", type: "select", options: ["Ca sáng", "Ca chiều", "Ca đêm"] },
  { key: "result", label: "Kết quả", type: "select", options: ["Đạt", "Cần khắc phục", "Chờ thực hiện"], render: (v: string) => <Pill value={v} tone={ckTone(v)} /> },
];

function PRP() {
  const prp = useCollection("prp-items", PRP_SEED);
  const ck = useCollection("prp-checklist", CHECK_SEED);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chương trình tiên quyết (PRP)"
        description="Thư viện checklist GMP · SSOP · 5S — giám sát theo ca/lô với bằng chứng số hoá."
      />

      <AIBadge>
        <b>AI hỗ trợ:</b> Tự sinh checklist theo công đoạn · Phân tích xu hướng không tuân thủ · Đề xuất tần suất giám sát tối ưu.
      </AIBadge>

      <CrudTable
        title="Hạng mục GMP / SSOP"
        fields={PRP_FIELDS}
        rows={prp.rows}
        onCreate={prp.create}
        onUpdate={prp.update}
        onDelete={prp.remove}
        onReset={prp.reset}
        idPrefix="PRP"
        addLabel="Thêm hạng mục"
      />

      <CrudTable
        title="Checklist giám sát theo ca"
        fields={CK_FIELDS}
        rows={ck.rows}
        onCreate={ck.create}
        onUpdate={ck.update}
        onDelete={ck.remove}
        onReset={ck.reset}
        idPrefix="CK"
        addLabel="Thêm mục kiểm tra"
      />
    </div>
  );
}
