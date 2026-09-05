import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PurchasingModule } from "@/features/purchasing/PurchasingModule";

export const Route = createFileRoute("/purchasing")({
  head: () => ({
    meta: [
      { title: "Nhà Cung Cấp & Kiểm Định Tiếp Nhận IQC – WCERT ISO 22000" },
      {
        name: "description",
        content:
          "Kiểm soát các quá trình, sản phẩm hoặc dịch vụ do bên ngoài cung cấp (ASL), tiếp nhận lô nguyên liệu (FEFO) và thẩm định COA/IQC theo tiêu chuẩn ISO 22000:2018 Điều khoản 7.1.6.",
      },
    ],
  }),
  component: () => (
    <AppShell module="purchasing">
      <PurchasingModule />
    </AppShell>
  ),
});

export { PurchasingModule };
export function PurchasingPage() {
  return <PurchasingModule />;
}
