import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { InventoryModule } from "@/features/inventory/InventoryModule";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Quản lý Kho FEFO & Lưu mẫu – WCERT FSMS" },
      {
        name: "description",
        content:
          "Quản lý xuất nhập tồn theo nguyên tắc FEFO, vị trí bin kho lạnh, mẫu lưu nghiệm thức và mẻ sản xuất theo ISO 22000:2018.",
      },
      { property: "og:title", content: "Quản lý Kho FEFO & Lưu mẫu – WCERT FSMS" },
      { property: "og:description", content: "Hệ thống quản lý kho thông minh chuẩn ISO 22000." },
    ],
  }),
  component: () => (
    <AppShell module="inventory">
      <InventoryModule />
    </AppShell>
  ),
});

export function InventoryPage() {
  return <InventoryModule />;
}
