import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { TraceabilityModule } from "@/features/traceability/TraceabilityModule";

export const Route = createFileRoute("/traceability")({
  head: () => ({
    meta: [
      { title: "Truy Xuất Nguồn Gốc 1 Chạm & Thu Hồi – WCERT" },
      { name: "description", content: "Hệ thống truy xuất nguồn gốc ngược và xuôi 1 chạm theo tiêu chuẩn ISO 22000:2018 Điều khoản 8.5.2." },
      { property: "og:title", content: "Truy Xuất Nguồn Gốc 1 Chạm & Thu Hồi – WCERT" },
      { property: "og:description", content: "Truy xuất chuỗi cung ứng 4 tầng và giả lập thu hồi sản phẩm." },
    ],
  }),
  component: () => (
    <AppShell module="traceability">
      <TraceabilityModule />
    </AppShell>
  ),
});
