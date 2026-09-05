import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { OrgManagement } from "@/features/organization/OrgManagement";

export const Route = createFileRoute("/organization")({
  head: () => ({
    meta: [
      { title: "Tổ chức & Người dùng – WCERT" },
      { name: "description", content: "Quản lý phòng ban, nhân sự và phân quyền RBAC trong hệ thống ATTP ISO 22000." },
    ],
  }),
  component: () => (
    <AppShell module="organization">
      <OrgManagement />
    </AppShell>
  ),
});