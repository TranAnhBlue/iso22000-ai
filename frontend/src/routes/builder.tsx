import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { BuilderModule } from "@/features/builder/BuilderModule";

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Biểu Mẫu & Lưu Đồ – WCERT" },
      { name: "description", content: "Trung tâm quản lý biểu mẫu và quy trình động theo chuẩn ISO 22000:2018." },
    ],
  }),
  component: () => (
    <AppShell module="builder">
      <BuilderModule />
    </AppShell>
  ),
});
