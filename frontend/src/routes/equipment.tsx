import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { EquipmentModule } from "@/features/equipment/EquipmentModule";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: "Thiết bị, Hiệu chuẩn & Bảo trì máy móc – WCERT FSMS" },
      {
        name: "description",
        content:
          "Quản lý vòng đời thiết bị, chu kỳ hiệu chuẩn và bảo trì phòng ngừa theo ISO 22000:2018 Điều khoản 7.1.5 & 8.2.",
      },
    ],
  }),
  component: () => (
    <AppShell module="equipment">
      <EquipmentModule />
    </AppShell>
  ),
});

export { EquipmentModule };
