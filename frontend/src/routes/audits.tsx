import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader, AIBadge } from "@/components/PageHeader";
import { CrudTable, Pill, type CrudField } from "@/components/CrudTable";
import { useCollection, type Row } from "@/lib/crud-store";
import { GraduationCap, ClipboardList, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/audits")({
  head: () => ({
    meta: [
      { title: "Đánh giá nội bộ & Đào tạo – WCERT FSMS" },
      { name: "description", content: "Quản lý kế hoạch đánh giá nội bộ, khoá đào tạo ISO 22000 và phân tích khoảng trống năng lực." },
      { property: "og:title", content: "Đánh giá nội bộ & Đào tạo – WCERT FSMS" },
      { property: "og:description", content: "Thêm, sửa, xoá kế hoạch ĐGNB và khoá đào tạo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell module="audits">
      <Audits />
    </AppShell>
  ),
});

const PLAN_SEED: Row[] = [
  { id: "AU-01", unit: "Phòng Sản xuất – dây chuyền A", lead: "Trần Thị B", date: "16/06/2026", status: "Đã lên kế hoạch" },
  { id: "AU-02", unit: "Phòng Thiết bị", lead: "Vũ Thị F", date: "18/06/2026", status: "Đã lên kế hoạch" },
  { id: "AU-03", unit: "Phòng Mua hàng & NCC", lead: "Trần Thị B", date: "23/06/2026", status: "Đã lên kế hoạch" },
  { id: "AU-04", unit: "Tổng hợp – HACCP & PRP", lead: "Ban QLCL", date: "28/06/2026", status: "Đang thực hiện" },
];

const COURSE_SEED: Row[] = [
  { id: "TR-01", title: "ISO 22000:2018 – Foundation", learners: 32, progress: 78, status: "Đang mở" },
  { id: "TR-02", title: "HACCP & 7 nguyên tắc", learners: 15, progress: 45, status: "Đang mở" },
  { id: "TR-03", title: "SSOP – Vệ sinh cá nhân", learners: 120, progress: 92, status: "Đang mở" },
  { id: "TR-04", title: "CAPA & Root Cause Analysis", learners: 8, progress: 30, status: "Đang mở" },
];

const auTone = (v: string) =>
  v === "Hoàn thành" ? "bg-emerald-500/10 text-emerald-700" : v === "Đang thực hiện" ? "bg-amber-500/10 text-amber-700" : "bg-primary/10 text-primary";

const PLAN_FIELDS: CrudField[] = [
  { key: "unit", label: "Đơn vị được đánh giá", required: true },
  { key: "lead", label: "Trưởng đoàn" },
  { key: "date", label: "Ngày", placeholder: "dd/mm/yyyy" },
  { key: "status", label: "Trạng thái", type: "select", options: ["Đã lên kế hoạch", "Đang thực hiện", "Hoàn thành"], render: (v: string) => <Pill value={v} tone={auTone(v)} /> },
  { key: "scope", label: "Phạm vi đánh giá", type: "textarea", hideInTable: true },
];

const COURSE_FIELDS: CrudField[] = [
  { key: "title", label: "Khoá đào tạo", required: true },
  { key: "learners", label: "Học viên", type: "number" },
  {
    key: "progress",
    label: "Tiến độ",
    type: "number",
    render: (v: number) => (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, Number(v) || 0))}%` }} />
        </div>
        <span className="text-xs">{v}%</span>
      </div>
    ),
  },
  { key: "status", label: "Trạng thái", type: "select", options: ["Đang mở", "Sắp khai giảng", "Đã kết thúc"] },
];

function Audits() {
  const plans = useCollection("audit-plans", PLAN_SEED);
  const courses = useCollection("training-courses", COURSE_SEED);
  const learners = courses.rows.reduce((s, r) => s + (Number(r.learners) || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đánh giá nội bộ, Xem xét lãnh đạo & Đào tạo"
        description="Quản lý điện tử toàn bộ hoạt động đào tạo & ĐGNB cho CBCNV, nhà thầu, các bên liên quan."
      />

      <AIBadge>
        <b>AI hỗ trợ:</b> Phân tích khoảng trống năng lực (Skill Gap) · Gợi ý lộ trình đào tạo ISO 22000 ·
        Tự động tạo bài kiểm tra/trắc nghiệm · Tổng hợp báo cáo đánh giá nội bộ.
      </AIBadge>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi icon={<ClipboardList />} v={String(plans.rows.length)} l="Cuộc ĐGNB" />
        <Kpi icon={<GraduationCap />} v={String(courses.rows.length)} l="Khoá đào tạo" />
        <Kpi icon={<BarChart3 />} v={String(plans.rows.filter((r) => r.status === "Hoàn thành").length)} l="ĐGNB đã hoàn thành" />
        <Kpi icon={<GraduationCap />} v={String(learners)} l="Lượt học viên" />
      </div>

      <CrudTable
        title="Kế hoạch đánh giá nội bộ"
        fields={PLAN_FIELDS}
        rows={plans.rows}
        onCreate={plans.create}
        onUpdate={plans.update}
        onDelete={plans.remove}
        onReset={plans.reset}
        idPrefix="AU"
        addLabel="Thêm kế hoạch"
      />

      <CrudTable
        title="Khoá đào tạo"
        fields={COURSE_FIELDS}
        rows={courses.rows}
        onCreate={courses.create}
        onUpdate={courses.update}
        onDelete={courses.remove}
        onReset={courses.reset}
        idPrefix="TR"
        addLabel="Thêm khoá đào tạo"
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
