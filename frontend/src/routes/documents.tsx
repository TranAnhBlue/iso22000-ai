import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DocumentsPage } from "@/features/documents";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Tài liệu & SOPs – WCERT ISO 22000" },
      {
        name: "description",
        content: "Quản lý hệ thống tài liệu ISO 22000:2018 5 cấp: Chính sách, Sổ tay, SOP, Hướng dẫn công việc và Biểu mẫu.",
      },
    ],
  }),
  component: () => (
    <AppShell module="documents">
      <DocumentsPage />
    </AppShell>
  ),
});

export * from "@/features/documents";
