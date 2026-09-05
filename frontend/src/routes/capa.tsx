import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CAPAManagementPage } from "@/features/capa";

export const Route = createFileRoute("/capa")({
  head: () => ({
    meta: [
      { title: "CAPA & Xử Lý Sự Không Phù Hợp – WCERT ISO 22000:2018" },
      { name: "description", content: "Hệ thống quản lý sự không phù hợp (NC), phân tích 5-Why, sơ đồ xương cá Ishikawa và thẩm tra hiệu lực CAPA theo ISO 22000 Điều khoản 8.9 & 10.1." },
      { property: "og:title", content: "CAPA & Xử Lý Sự Không Phù Hợp – WCERT ISO 22000:2018" },
      { property: "og:description", content: "Quy trình 5 bước CAPA chuẩn ISO 22000 với Trợ lý AI phân tích nguyên nhân gốc rễ và thẩm tra sau 30 ngày." },
    ],
  }),
  component: () => (
    <AppShell module="capa">
      <CAPAManagementPage />
    </AppShell>
  ),
});

export * from "@/features/capa";
