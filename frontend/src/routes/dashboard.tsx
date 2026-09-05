import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout";
import { ExecutiveDashboard } from "@/features/dashboard";

export * from "@/features/dashboard";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell module="dashboard">
      <ExecutiveDashboard />
    </AppShell>
  );
}
