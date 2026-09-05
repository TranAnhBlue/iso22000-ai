import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PRPModule } from "@/features/prp/PRPModule";

export const Route = createFileRoute("/prp")({
  head: () => ({
    meta: [
      { title: "Chương trình Tiên quyết (PRP / GMP / SSOP) – WCERT ISO 22000" },
      {
        name: "description",
        content:
          "Thư viện quy chuẩn GMP, SSOP, 5S và giám sát tuân thủ checklist theo ca sản xuất theo tiêu chuẩn ISO 22000:2018 Điều khoản 8.2.",
      },
    ],
  }),
  component: () => (
    <AppShell module="prp">
      <PRPModule />
    </AppShell>
  ),
});
