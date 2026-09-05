import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { HACCPModule } from "@/features/haccp";

export const Route = createFileRoute("/haccp")({
  head: () => ({
    meta: [
      { title: "Kế hoạch HACCP & Giám sát CCP – WCERT ISO 22000" },
      {
        name: "description",
        content:
          "Quản lý kế hoạch HACCP, lưu đồ quy trình công đoạn, ma trận phân tích mối nguy, điểm kiểm soát tới hạn (CCP/oPRP) và giám sát đo đạc thời gian thực theo tiêu chuẩn ISO 22000:2018 Điều khoản 8.5.",
      },
    ],
  }),
  component: () => (
    <AppShell module="haccp">
      <HACCPModule />
    </AppShell>
  ),
});

export * from "@/features/haccp";
