import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/features/landing";

export * from "@/features/landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WCERT FSMS – Hệ Thống Quản Lý ATTP Theo Chuẩn ISO 22000:2018" },
      { name: "description", content: "Nền tảng số hoá quản lý An toàn thực phẩm theo ISO 22000:2018 với trợ lý AI." },
    ],
  }),
  component: LandingPage,
});