import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader, AIBadge } from "@/components/PageHeader";
import { CrudTable, Pill, type CrudField } from "@/components/CrudTable";
import { useCollection, type Row } from "@/lib/crud-store";
import { Thermometer, AlertCircle, CheckCircle2, Activity } from "lucide-react";

export const Route = createFileRoute("/haccp")({
  head: () => ({
    meta: [
      { title: "HACCP & Kiểm soát mối nguy – WCERT FSMS" },
      { name: "description", content: "Quản lý kế hoạch HACCP, điểm kiểm soát tới hạn (CCP) và bảng phân tích mối nguy." },
      { property: "og:title", content: "HACCP & Kiểm soát mối nguy – WCERT FSMS" },
      { property: "og:description", content: "Thêm, sửa, xoá CCP và mối nguy theo từng công đoạn sản xuất." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell module="haccp">
      <HACCP />
    </AppShell>
  ),
});

const CCP_SEED: Row[] = [
  { id: "CCP 1", name: "Tiếp nhận nguyên liệu", hazard: "Vi sinh (Vibrio, Salmonella) · Kháng sinh tồn dư", cl: "Cảm quan đạt, COA hợp lệ", status: "Trong giới hạn", value: "PASS", freq: "Mỗi lô", monitor: "QC Ca 1" },
  { id: "CCP 2", name: "Gia nhiệt", hazard: "Salmonella, Listeria", cl: "≥ 75°C trong ≥ 15 giây", status: "Trong giới hạn", value: "78.4°C / 17s", freq: "Mỗi mẻ", monitor: "QC Ca 2" },
  { id: "CCP 3", name: "Dò kim loại", hazard: "Mảnh kim loại lẫn sản phẩm", cl: "Fe ≤ 1.5mm · SUS ≤ 2.5mm", status: "Cảnh báo", value: "Fe 1.4mm — sát ngưỡng", freq: "Mỗi mẻ", monitor: "QC Ca 2" },
  { id: "CCP 4", name: "Cấp đông", hazard: "Phát triển vi sinh do nhiệt độ cao", cl: "≤ -18°C, thời gian ≤ 4h", status: "Trong giới hạn", value: "-21°C / 3h12", freq: "Mỗi mẻ", monitor: "Kho lạnh" },
];

const HAZARD_SEED: Row[] = [
  { id: "HZ-01", step: "Tiếp nhận cá", hazard: "Vibrio, Salmonella", type: "Sinh học", freq: "V", level: "C", eval: "Ý nghĩa", measure: "COA + kiểm cảm quan" },
  { id: "HZ-02", step: "Tiếp nhận cá", hazard: "Tồn dư kháng sinh", type: "Hóa học", freq: "T", level: "C", eval: "Ý nghĩa", measure: "Test nhanh + COA" },
  { id: "HZ-03", step: "Rửa", hazard: "Nhiễm chéo vi sinh", type: "Sinh học", freq: "V", level: "V", eval: "Ý nghĩa", measure: "SSOP-01 nguồn nước" },
  { id: "HZ-04", step: "Rửa", hazard: "Clo dư", type: "Hóa học", freq: "T", level: "T", eval: "Không ý nghĩa", measure: "Giám sát nồng độ Clo" },
  { id: "HZ-05", step: "Gia nhiệt", hazard: "Salmonella, Listeria", type: "Sinh học", freq: "V", level: "C", eval: "CCP", measure: "Nhiệt độ ≥ 75°C / 15s" },
  { id: "HZ-06", step: "Dò kim loại", hazard: "Mảnh kim loại", type: "Vật lý", freq: "T", level: "C", eval: "CCP", measure: "Máy dò + loại bỏ" },
];

function ccpTone(s: string) {
  if (s === "Cảnh báo") return "bg-amber-500/10 text-amber-700";
  if (s === "Vượt giới hạn") return "bg-rose-500/10 text-rose-700";
  return "bg-emerald-500/10 text-emerald-700";
}

const CCP_FIELDS: CrudField[] = [
  { key: "name", label: "Công đoạn", required: true },
  { key: "hazard", label: "Mối nguy", type: "textarea" },
  { key: "cl", label: "Giới hạn tới hạn", type: "textarea" },
  { key: "value", label: "Giá trị hiện tại" },
  { key: "freq", label: "Tần suất" },
  { key: "monitor", label: "Người giám sát" },
  { key: "status", label: "Trạng thái", type: "select", options: ["Trong giới hạn", "Cảnh báo", "Vượt giới hạn"], render: (v: string) => <Pill value={v} tone={ccpTone(v)} /> },
];

const HZ_FIELDS: CrudField[] = [
  { key: "step", label: "Công đoạn", required: true },
  { key: "hazard", label: "Mối nguy", required: true },
  { key: "type", label: "Loại", type: "select", options: ["Sinh học", "Hóa học", "Vật lý", "Dị ứng"] },
  { key: "freq", label: "Tần suất", type: "select", options: ["T", "V", "C"] },
  { key: "level", label: "Mức độ", type: "select", options: ["T", "V", "C"] },
  { key: "eval", label: "Đánh giá", type: "select", options: ["Không ý nghĩa", "Ý nghĩa", "CCP"] },
  { key: "measure", label: "Biện pháp" },
];

function HACCP() {
  const ccp = useCollection("haccp-ccp", CCP_SEED);
  const hz = useCollection("haccp-hazards", HAZARD_SEED);

  return (
    <div className="space-y-6">
      <PageHeader
        title="HACCP & Kiểm soát mối nguy"
        description="Quản lý kế hoạch phân tích rủi ro và các điểm kiểm soát tới hạn (CCP) theo lô / ca sản xuất."
      />

      <AIBadge>
        <b>AI hỗ trợ:</b> Gợi ý CCP/CL tham khảo theo sản phẩm & quy trình · Phát hiện xu hướng lệch chuẩn ·
        Cảnh báo sớm khi giá trị giám sát tiệm cận giới hạn tới hạn.
      </AIBadge>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi icon={<Activity className="h-5 w-5" />} label="CCP đang giám sát" value={String(ccp.rows.length)} sub="Realtime" />
        <Kpi icon={<CheckCircle2 className="h-5 w-5" />} label="Trong giới hạn" value={String(ccp.rows.filter((r) => r.status === "Trong giới hạn").length)} sub="" tone="ok" />
        <Kpi icon={<AlertCircle className="h-5 w-5" />} label="Cảnh báo" value={String(ccp.rows.filter((r) => r.status === "Cảnh báo").length)} sub="Sát ngưỡng" tone="warn" />
        <Kpi icon={<Thermometer className="h-5 w-5" />} label="Vượt giới hạn" value={String(ccp.rows.filter((r) => r.status === "Vượt giới hạn").length)} sub="24h qua" tone="ok" />
      </div>

      <CrudTable
        title="Điểm kiểm soát tới hạn (CCP)"
        fields={CCP_FIELDS}
        rows={ccp.rows}
        onCreate={ccp.create}
        onUpdate={ccp.update}
        onDelete={ccp.remove}
        onReset={ccp.reset}
        idLabel="Mã CCP"
        idPrefix="CCP"
        addLabel="Thêm CCP"
      />

      <CrudTable
        title="Bảng phân tích mối nguy theo công đoạn"
        fields={HZ_FIELDS}
        rows={hz.rows}
        onCreate={hz.create}
        onUpdate={hz.update}
        onDelete={hz.remove}
        onReset={hz.reset}
        idPrefix="HZ"
        addLabel="Thêm mối nguy"
      />
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: string }) {
  const t = tone === "warn" ? "bg-amber-500/10 text-amber-700" : tone === "ok" ? "bg-emerald-500/10 text-emerald-700" : "bg-primary/10 text-primary";
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${t}`}>{icon}</div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-sm">{label}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
