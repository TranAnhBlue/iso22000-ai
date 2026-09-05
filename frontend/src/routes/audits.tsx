import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AuditManagementPage } from "@/features/audits";

export const Route = createFileRoute("/audits")({
  head: () => ({
    meta: [
      { title: "Đánh Giá Nội Bộ, Đào Tạo & Khai Báo Sức Khỏe – WCERT ISO 22000:2018" },
      { name: "description", content: "Hệ thống quản lý đánh giá nội bộ (Điều 9.2), ma trận đào tạo nhân sự (Điều 7.2) và sổ khai báo sức khỏe ca (Điều 8.2 PRP) chuẩn ISO 22000:2018." },
      { property: "og:title", content: "Đánh Giá Nội Bộ, Đào Tạo & Khai Báo Sức Khỏe – WCERT ISO 22000:2018" },
      { property: "og:description", content: "Số hóa quy trình ĐGNB, đào tạo sát hạch nhân sự và kiểm soát vệ sinh sức khỏe công nhân trước ca với Trợ lý AI." },
    ],
  }),
  component: () => (
    <AppShell module="audits">
      <AuditManagementPage />
    </AppShell>
  ),
});

export * from "@/features/audits";
