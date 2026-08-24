import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader, AIBadge } from "@/components/PageHeader";
import {
  ShieldCheck,
  ClipboardCheck,
  AlertTriangle,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard – WCERT FSMS" }] }),
  component: () => (
    <AppShell module="dashboard">
      <Dashboard />
    </AppShell>
  ),
});

function Dashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Trung tâm điều hành ATTP"
        description="Trạng thái tổng quan của PRP · HACCP · CAPA · Tài liệu — cập nhật theo thời gian thực."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="PRP / GMP / SSOP" value="94%" sub="Tuân thủ" trend="up" change="+2.1%" icon={<ClipboardCheck className="h-5 w-5" />} color="success" />
        <Stat title="HACCP CCPs" value="12 / 12" sub="Trong giới hạn" trend="up" change="ổn định" icon={<ShieldCheck className="h-5 w-5" />} color="primary" />
        <Stat title="CAPA mở" value="18" sub="3 quá hạn" trend="down" change="-5" icon={<AlertTriangle className="h-5 w-5" />} color="warning" />
        <Stat title="Tài liệu chờ duyệt" value="7" sub="2 tài liệu khẩn" trend="up" change="+3" icon={<FileText className="h-5 w-5" />} color="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Xu hướng Không phù hợp (NC) – 6 tháng</h3>
            <span className="text-xs text-muted-foreground">Cập nhật 5 phút trước</span>
          </div>
          <Sparkline />
          <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
            <Mini label="Sinh học" v="42%" />
            <Mini label="Hóa học" v="31%" />
            <Mini label="Vật lý" v="27%" />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h3 className="mb-3 font-semibold">Đầu việc quá hạn</h3>
          <ul className="space-y-3 text-sm">
            <Overdue title="CAPA: Xử phạt NV không tuân thủ" due="05/06/2026" tag="CAPA" />
            <Overdue title="Hiệu chuẩn nhiệt kế dây chuyền 2" due="10/06/2026" tag="Thiết bị" />
            <Overdue title="Đánh giá NCC mới – Cty Hải sản A" due="12/06/2026" tag="Mua hàng" />
            <Overdue title="Soát xét SOP-PRD-08 phiên bản mới" due="14/06/2026" tag="Tài liệu" />
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Calendar className="h-4 w-4 text-primary" /> Lịch trình tiếp theo
          </h3>
          <ul className="divide-y text-sm">
            {[
              { d: "Hôm nay 14:00", t: "Họp xem xét lãnh đạo Q2/2026", st: "Sắp diễn ra" },
              { d: "16/06", t: "Đánh giá nội bộ Phòng Sản xuất – đợt 1", st: "Đã lên kế hoạch" },
              { d: "18/06", t: "Đào tạo HACCP cho NV mới (15 học viên)", st: "Đã lên kế hoạch" },
              { d: "20/06", t: "Hiệu chuẩn máy dò kim loại CCP3", st: "Đã lên kế hoạch" },
              { d: "22/06", t: "CAPA: Xử phạt NV không tuân thủ", st: "Trễ", late: true },
            ].map((r, i) => (
              <li key={i} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-xs text-muted-foreground">{r.d}</div>
                  <div className="font-medium">{r.t}</div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${r.late ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                  {r.st}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <AIBadge>
          <div className="font-semibold mb-2">Phân tích AI</div>
          <ul className="space-y-2 text-sm">
            <li>• Phát hiện <b>3 NC lặp lại</b> ở công đoạn Rửa – ưu tiên CAPA gốc rễ.</li>
            <li>• Đề xuất bổ sung <b>cảm biến nhiệt độ IoT</b> cho CCP2 (Gia nhiệt).</li>
            <li>• Khoảng trống năng lực: <b>4 NV</b> chưa hoàn thành đào tạo HACCP cơ bản.</li>
            <li>• Cảnh báo rủi ro: nhà cung cấp <b>NCC-07</b> trễ giao 2 lần liên tiếp.</li>
          </ul>
          <button className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">
            Mở trợ lý AI
          </button>
        </AIBadge>
      </div>
    </div>
  );
}

function Stat({ title, value, sub, trend, change, icon, color }: any) {
  const colors: Record<string, string> = {
    success: "bg-emerald-500/10 text-emerald-600",
    primary: "bg-primary/10 text-primary",
    warning: "bg-amber-500/10 text-amber-600",
    info: "bg-sky-500/10 text-sky-600",
  };
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${colors[color]}`}>{icon}</div>
        <span className={`inline-flex items-center gap-1 text-xs ${trend === "up" ? "text-emerald-600" : "text-rose-600"}`}>
          {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {change}
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Mini({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-lg bg-muted/50 py-2">
      <div className="font-semibold">{v}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

function Overdue({ title, due, tag }: { title: string; due: string; tag: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
        <Clock className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">Hạn: {due} · <span className="text-primary">{tag}</span></div>
      </div>
    </li>
  );
}

function Sparkline() {
  const data = [22, 18, 25, 17, 14, 19, 12, 15, 10, 13, 9, 11];
  const max = Math.max(...data);
  const w = 100 / (data.length - 1);
  const points = data.map((v, i) => `${i * w},${40 - (v / max) * 35}`).join(" ");
  return (
    <svg viewBox="0 0 100 40" className="h-32 w-full">
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.62 0.16 152)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="oklch(0.62 0.16 152)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,40 ${points} 100,40`} fill="url(#g)" />
      <polyline points={points} fill="none" stroke="oklch(0.62 0.16 152)" strokeWidth="1.2" />
    </svg>
  );
}
