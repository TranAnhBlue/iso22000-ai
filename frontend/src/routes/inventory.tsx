import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader, AIBadge } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Package,
  Boxes,
  ThermometerSnowflake,
  FlaskConical,
  Truck,
  Plus,
  RefreshCw,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Trash2,
  Edit,
  Tag,
  Eye,
  FileSpreadsheet,
  QrCode,
  Flame,
  Printer,
  CheckSquare,
  X,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { QRCodeModal } from "@/components/QRCodeModal";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { printHtml } from "@/lib/print";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Quản lý Kho FEFO & Lưu mẫu – WCERT FSMS" },
      { name: "description", content: "Quản lý xuất nhập tồn theo nguyên tắc FEFO, vị trí bin kho lạnh, mẫu lưu nghiệm thức và mẻ sản xuất theo ISO 22000:2018." },
      { property: "og:title", content: "Quản lý Kho FEFO & Lưu mẫu – WCERT FSMS" },
      { property: "og:description", content: "Hệ thống quản lý kho thông minh chuẩn ISO 22000." },
    ],
  }),
  component: () => (
    <AppShell module="inventory">
      <InventoryPage />
    </AppShell>
  ),
});

// ==========================================
// TYPES
// ==========================================
interface StockItem {
  inventory_id: string;
  item_code: string;
  item_name: string;
  category: "RAW_MATERIAL" | "ADDITIVE" | "PACKAGING" | "FINISHED_GOOD";
  lot_number: string;
  batch_id?: string;
  qr_code: string;
  quantity: number;
  unit: string;
  min_stock_level: number;
  mfg_date: string;
  exp_date: string;
  warehouse_type: "COLD_STORAGE" | "CHILL_STORAGE" | "DRY_STORAGE";
  location_bin: string;
  temperature_c?: number;
  status: "AVAILABLE" | "QUARANTINE" | "RESERVED" | "EXPIRED" | "DISPOSED";
  notes?: string;
  days_to_expiry: number;
  fefo_status: "EXPIRED" | "CRITICAL_NEAR_EXPIRY" | "NEAR_EXPIRY" | "GOOD";
  fefo_priority_rank: number;
}

interface RetainedSampleItem {
  sample_id: string;
  sample_code: string;
  batch_number: string;
  product_name: string;
  sample_weight_g: number;
  storage_cabinet: string;
  storage_temperature_c?: number;
  sample_date: string;
  expiry_date: string;
  sampled_by: string;
  test_result: "PASS" | "FAIL" | "TESTING" | "PENDING";
  test_details?: any;
  status: "STORED" | "TESTED" | "DISPOSED" | "SEIZED";
  days_remaining: number;
  is_expired_storage: boolean;
  notes?: string;
}

interface BatchItem {
  batch_id: string;
  batch_number: string;
  product_name: string;
  product_code?: string;
  production_line?: string;
  shift?: string;
  planned_quantity: number;
  actual_quantity: number;
  unit: string;
  start_time: string;
  end_time?: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "HOLD" | "CANCELLED";
  qc_inspector?: string;
  notes?: string;
  material_usages?: Array<{
    usage_id: string;
    material_name: string;
    lot_number: string;
    quantity_used: number;
    unit: string;
  }>;
  ccp_logs_count?: number;
}

interface DispatchItem {
  dispatch_id: string;
  dispatch_code: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  destination_address?: string;
  batch_number: string;
  product_name: string;
  quantity_dispatched: number;
  unit: string;
  vehicle_number?: string;
  vehicle_temp_c?: number;
  vehicle_check_status: boolean;
  status: "PREPARING" | "SHIPPED" | "DELIVERED" | "RETURNED" | "RECALLED";
  dispatched_at?: string;
  notes?: string;
}

interface VehicleInspectionItem {
  id: number;
  inspection_code: string;
  inspection_date: string;
  order_dispatch_id?: string;
  vehicle_plate: string;
  driver_name: string;
  driver_phone?: string;
  transport_company?: string;
  valid_registration_check: boolean;
  cargo_integrity_check: boolean;
  clean_dry_check: boolean;
  no_odor_check: boolean;
  pest_free_check: boolean;
  inspection_result: "PASS" | "FAIL";
  inspector_name: string;
  notes?: string;
}

interface DisposalRecordItem {
  id: number;
  record_code: string;
  disposal_date: string;
  batch_id?: string;
  batch_number: string;
  product_name: string;
  quantity: number;
  unit: string;
  reason: string;
  disposal_method: string;
  disposal_location?: string;
  witness_council?: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "DISPOSED";
  approved_by?: string;
  notes?: string;
}

// ==========================================
// SEED FALLBACK DATA
// ==========================================
const SEED_STOCKS: StockItem[] = [
  {
    inventory_id: "stk-01",
    item_code: "NL-03",
    item_name: "Bột lòng trắng trứng nhập khẩu",
    category: "RAW_MATERIAL",
    lot_number: "NL-2026-TRUNG01",
    qr_code: "QR-FEFO-NEAR",
    quantity: 45,
    unit: "kg",
    min_stock_level: 50,
    mfg_date: "2026-03-01",
    exp_date: "2026-09-01",
    warehouse_type: "DRY_STORAGE",
    location_bin: "Kệ B2-03 (Kho Khô)",
    temperature_c: 24.0,
    status: "AVAILABLE",
    days_to_expiry: 5,
    fefo_status: "CRITICAL_NEAR_EXPIRY",
    fefo_priority_rank: 1,
    notes: "Cảnh báo FEFO: Lô hàng còn 5 ngày hết hạn - Ưu tiên xuất trước!",
  },
  {
    inventory_id: "stk-02",
    item_code: "SP-CC500",
    item_name: "Chả cá Ba Sa Thượng Hạng 500g",
    category: "FINISHED_GOOD",
    lot_number: "LOT-202608-B01",
    qr_code: "QR-CC500-B01",
    quantity: 300,
    unit: "gói",
    min_stock_level: 100,
    mfg_date: "2026-08-25",
    exp_date: "2026-10-26",
    warehouse_type: "COLD_STORAGE",
    location_bin: "Kệ A1-01 (Kho Đông)",
    temperature_c: -18.5,
    status: "AVAILABLE",
    days_to_expiry: 60,
    fefo_status: "GOOD",
    fefo_priority_rank: 3,
    notes: "Thành phẩm đạt chuẩn vi sinh đã kiểm tra.",
  },
];

const SEED_SAMPLES: RetainedSampleItem[] = [
  {
    sample_id: "smp-01",
    sample_code: "ML-202608-01",
    batch_number: "LOT-202608-B01",
    product_name: "Chả cá Ba Sa Thượng Hạng 500g",
    sample_weight_g: 250,
    storage_cabinet: "Tủ đông mẫu T-01",
    storage_temperature_c: -18.0,
    sample_date: "2026-08-25",
    expiry_date: "2026-11-25",
    sampled_by: "Trần Thị Lan (QC KCS)",
    test_result: "PASS",
    status: "STORED",
    days_remaining: 90,
    is_expired_storage: false,
    notes: "Lưu mẫu đối chứng chuẩn ISO 22000 Điều khoản 8.5.2.",
  },
];

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"stock" | "bins" | "samples" | "production" | "vehicles" | "disposal">("stock");
  
  // Data states
  const [stocks, setStocks] = useState<StockItem[]>(SEED_STOCKS);
  const [samples, setSamples] = useState<RetainedSampleItem[]>(SEED_SAMPLES);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [dispatches, setDispatches] = useState<DispatchItem[]>([]);
  const [vehicleInspections, setVehicleInspections] = useState<VehicleInspectionItem[]>([]);
  const [disposalRecords, setDisposalRecords] = useState<DisposalRecordItem[]>([]);
  const [logisticsStats, setLogisticsStats] = useState({
    total_vehicle_inspections: 0,
    passed_inspections: 0,
    failed_inspections: 0,
    total_disposal_records: 0,
    total_disposed_qty_kg: 0,
  });
  const [loading, setLoading] = useState(false);
  const [kpi, setKpi] = useState({
    total_stock_items: 2,
    total_stock_quantity: 345,
    expired_items: 0,
    near_expiry_items: 1,
    total_retained_samples: 1,
    active_retained_samples: 1,
    total_production_batches: 1,
    total_order_dispatches: 2,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [fefoFilter, setFefoFilter] = useState("ALL");

  // Vehicle and Disposal Filters
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleResultFilter, setVehicleResultFilter] = useState<"ALL" | "PASS" | "FAIL">("ALL");
  const [disposalSearch, setDisposalSearch] = useState("");
  const [disposalStatusFilter, setDisposalStatusFilter] = useState<"ALL" | "DISPOSED" | "PENDING_APPROVAL" | "APPROVED">("ALL");

  // Vehicle Inspection Modal State
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleInspectionItem | null>(null);
  const [vehicleForm, setVehicleForm] = useState<any>({
    inspection_code: "",
    inspection_date: new Date().toISOString().slice(0, 16),
    vehicle_plate: "",
    driver_name: "",
    driver_phone: "",
    transport_company: "Đội xe Công ty",
    valid_registration_check: true,
    cargo_integrity_check: true,
    clean_dry_check: true,
    no_odor_check: true,
    pest_free_check: true,
    inspection_result: "PASS",
    inspector_name: "Thủ kho xuất hàng",
    notes: "",
  });

  // Disposal Record Modal State
  const [disposalModalOpen, setDisposalModalOpen] = useState(false);
  const [editingDisposal, setEditingDisposal] = useState<DisposalRecordItem | null>(null);
  const [disposalForm, setDisposalForm] = useState<any>({
    record_code: "",
    disposal_date: new Date().toISOString().split("T")[0],
    batch_number: "",
    product_name: "",
    quantity: 10,
    unit: "kg",
    reason: "",
    disposal_method: "Tiêu hủy nhiệt và chôn lấp hợp vệ sinh",
    disposal_location: "Khu xử lý chất thải Nhà máy",
    witness_council: "1. Đại diện BGĐ\n2. Ban QLCL & ATTP\n3. Thủ kho\n4. Kế toán",
    status: "DISPOSED",
    approved_by: "Giám Đốc Nhà Máy",
    notes: "",
  });

  // Modals
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [stockForm, setStockForm] = useState({
    item_code: "",
    item_name: "",
    category: "RAW_MATERIAL",
    lot_number: "",
    quantity: 100,
    unit: "kg",
    min_stock_level: 50,
    mfg_date: new Date().toISOString().split("T")[0],
    exp_date: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
    warehouse_type: "COLD_STORAGE",
    location_bin: "Kệ A1-01",
    temperature_c: -18.0,
    status: "AVAILABLE",
    notes: "",
  });

  const [sampleModalOpen, setSampleModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<RetainedSampleItem | null>(null);
  const [sampleForm, setSampleForm] = useState({
    sample_code: "",
    batch_number: "",
    product_name: "",
    sample_weight_g: 200,
    storage_cabinet: "Tủ đông mẫu T-01",
    storage_temperature_c: -18.0,
    sample_date: new Date().toISOString().split("T")[0],
    expiry_date: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
    sampled_by: "QC Ca",
    test_result: "PASS",
    status: "STORED",
    notes: "",
  });

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalData, setQrModalData] = useState<{
    title: string;
    qrCodeText: string;
    lotNumber: string;
    productName: string;
    mfgDate?: string;
    expDate?: string;
    quantity?: number;
    unit?: string;
  }>({
    title: "Tem Mã QR Lô Hàng",
    qrCodeText: "QR-FEFO-NEAR",
    lotNumber: "NL-2026-TRUNG01",
    productName: "Bột lòng trắng trứng nhập khẩu",
  });

  const [deletingStockItem, setDeletingStockItem] = useState<{ id: string; name: string; lot: string } | null>(null);
  const [deletingSampleItem, setDeletingSampleItem] = useState<{ id: string; code: string } | null>(null);

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStock, resSamples, resBatches, resDispatches, resKpi, resVehicles, resDisposals, resLogistics] = await Promise.allSettled([
        api.get("/inventory/stock"),
        api.get("/inventory/samples"),
        api.get("/inventory/batches"),
        api.get("/inventory/dispatches"),
        api.get("/inventory/kpi-stats"),
        api.get("/inventory/vehicle-inspections"),
        api.get("/inventory/disposal-records"),
        api.get("/inventory/logistics-stats"),
      ]);

      if (resStock.status === "fulfilled" && Array.isArray(resStock.value.data)) {
        setStocks(resStock.value.data);
      }
      if (resSamples.status === "fulfilled" && Array.isArray(resSamples.value.data)) {
        setSamples(resSamples.value.data);
      }
      if (resBatches.status === "fulfilled" && Array.isArray(resBatches.value.data)) {
        setBatches(resBatches.value.data);
      }
      if (resDispatches.status === "fulfilled" && Array.isArray(resDispatches.value.data)) {
        setDispatches(resDispatches.value.data);
      }
      if (resKpi.status === "fulfilled" && resKpi.value.data) {
        setKpi(resKpi.value.data);
      }
      if (resVehicles.status === "fulfilled" && Array.isArray(resVehicles.value.data)) {
        setVehicleInspections(resVehicles.value.data);
      }
      if (resDisposals.status === "fulfilled" && Array.isArray(resDisposals.value.data)) {
        setDisposalRecords(resDisposals.value.data);
      }
      if (resLogistics.status === "fulfilled" && resLogistics.value.data) {
        setLogisticsStats(resLogistics.value.data);
      }
    } catch (e) {
      console.warn("Backend loading notice:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick Seed Demo Data
  const handleSeedDemo = async () => {
    setLoading(true);
    try {
      await api.post("/traceability/seed-demo");
      await fetchData();
      toast.success("Đã nạp dữ liệu mẫu kho FEFO và mẫu lưu đối chứng thành công!");
    } catch (err) {
      console.error("Lỗi khi nạp dữ liệu mẫu:", err);
      toast.error("Không thể nạp dữ liệu mẫu.");
    } finally {
      setLoading(false);
    }
  };

  // Stock Save Handler
  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedStock) {
        await api.put(`/inventory/stock/${selectedStock.inventory_id}`, stockForm);
        toast.success(`Đã cập nhật tồn kho lô [${stockForm.lot_number}] thành công!`);
      } else {
        await api.post("/inventory/stock", stockForm);
        toast.success(`Đã nhập kho lô hàng mới [${stockForm.lot_number}] thành công!`);
      }
      setStockModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi lưu tồn kho: " + (err.response?.data?.detail || err.message));
    }
  };

  // Sample Save Handler
  const handleSaveSample = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedSample) {
        await api.put(`/inventory/samples/${selectedSample.sample_id}`, sampleForm);
        toast.success(`Đã cập nhật hồ sơ mẫu lưu [${sampleForm.sample_code}] thành công!`);
      } else {
        await api.post("/inventory/samples", sampleForm);
        toast.success(`Đã lưu mẫu nghiệm thức đối chứng [${sampleForm.sample_code}] thành công!`);
      }
      setSampleModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi lưu mẫu lưu: " + (err.response?.data?.detail || err.message));
    }
  };

  // Vehicle Inspection Handlers
  const openNewVehicle = () => {
    setEditingVehicle(null);
    setVehicleForm({
      inspection_code: `PTVC-2026-${String(vehicleInspections.length + 1).padStart(3, "0")}`,
      inspection_date: new Date().toISOString().slice(0, 16),
      vehicle_plate: "",
      driver_name: "",
      driver_phone: "",
      transport_company: "Đội xe Công ty",
      valid_registration_check: true,
      cargo_integrity_check: true,
      clean_dry_check: true,
      no_odor_check: true,
      pest_free_check: true,
      inspection_result: "PASS",
      inspector_name: "Thủ kho xuất hàng",
      notes: "",
    });
    setVehicleModalOpen(true);
  };

  const openEditVehicle = (v: VehicleInspectionItem) => {
    setEditingVehicle(v);
    setVehicleForm({
      inspection_code: v.inspection_code,
      inspection_date: v.inspection_date ? v.inspection_date.slice(0, 16) : new Date().toISOString().slice(0, 16),
      vehicle_plate: v.vehicle_plate,
      driver_name: v.driver_name,
      driver_phone: v.driver_phone || "",
      transport_company: v.transport_company || "",
      valid_registration_check: v.valid_registration_check ?? true,
      cargo_integrity_check: v.cargo_integrity_check ?? true,
      clean_dry_check: v.clean_dry_check ?? true,
      no_odor_check: v.no_odor_check ?? true,
      pest_free_check: v.pest_free_check ?? true,
      inspection_result: v.inspection_result,
      inspector_name: v.inspector_name,
      notes: v.notes || "",
    });
    setVehicleModalOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...vehicleForm,
      };
      if (editingVehicle) {
        await api.put(`/inventory/vehicle-inspections/${editingVehicle.id}`, payload);
        toast.success(`Đã cập nhật phiếu kiểm tra xe [${payload.inspection_code}]`);
      } else {
        await api.post("/inventory/vehicle-inspections", payload);
        toast.success(`Đã thêm phiếu kiểm tra xe [${payload.inspection_code}]`);
      }
      setVehicleModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi lưu phiếu kiểm tra xe: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phiếu kiểm tra xe này?")) return;
    try {
      await api.delete(`/inventory/vehicle-inspections/${id}`);
      toast.success("Đã xóa phiếu kiểm tra xe");
      fetchData();
    } catch (err: any) {
      toast.error("Không thể xóa: " + (err.response?.data?.detail || err.message));
    }
  };

  // Disposal Record Handlers
  const openNewDisposal = () => {
    setEditingDisposal(null);
    setDisposalForm({
      record_code: `BBHH-2026-${String(disposalRecords.length + 1).padStart(3, "0")}`,
      disposal_date: new Date().toISOString().split("T")[0],
      batch_number: "",
      product_name: "",
      quantity: 10,
      unit: "kg",
      reason: "",
      disposal_method: "Tiêu hủy nhiệt và chôn lấp hợp vệ sinh",
      disposal_location: "Khu xử lý chất thải Nhà máy",
      witness_council: "1. Đại diện Ban Giám Đốc\n2. Ban QLCL & ATTP\n3. Thủ kho\n4. Kế toán",
      status: "DISPOSED",
      approved_by: "Giám Đốc Nhà Máy",
      notes: "",
    });
    setDisposalModalOpen(true);
  };

  const openEditDisposal = (d: DisposalRecordItem) => {
    setEditingDisposal(d);
    setDisposalForm({
      record_code: d.record_code,
      disposal_date: d.disposal_date,
      batch_number: d.batch_number,
      product_name: d.product_name,
      quantity: d.quantity,
      unit: d.unit,
      reason: d.reason,
      disposal_method: d.disposal_method,
      disposal_location: d.disposal_location || "",
      witness_council: d.witness_council || "",
      status: d.status,
      approved_by: d.approved_by || "",
      notes: d.notes || "",
    });
    setDisposalModalOpen(true);
  };

  const handleSaveDisposal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...disposalForm,
        quantity: Number(disposalForm.quantity),
      };
      if (editingDisposal) {
        await api.put(`/inventory/disposal-records/${editingDisposal.id}`, payload);
        toast.success(`Đã cập nhật biên bản hủy hàng [${payload.record_code}]`);
      } else {
        await api.post("/inventory/disposal-records", payload);
        toast.success(`Đã lập biên bản hủy hàng [${payload.record_code}]`);
      }
      setDisposalModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi lưu biên bản hủy hàng: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteDisposal = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa biên bản hủy hàng này?")) return;
    try {
      await api.delete(`/inventory/disposal-records/${id}`);
      toast.success("Đã xóa biên bản hủy hàng");
      fetchData();
    } catch (err: any) {
      toast.error("Không thể xóa: " + (err.response?.data?.detail || err.message));
    }
  };

  // IN BM01-PTVC (Kiểm tra phương tiện vận chuyển trước xếp hàng)
  const handlePrintVehicleInspection = (v: VehicleInspectionItem) => {
    const html = `
      <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; color: #111; max-width: 800px; margin: 0 auto; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #333; padding: 6px;">
              <strong style="font-size: 13pt; color: #047857;">WCERT FOOD</strong><br/>
              <span style="font-size: 9pt;">HỆ THỐNG FSMS ISO 22000</span>
            </td>
            <td style="width: 50%; text-align: center; border: 1px solid #333; padding: 6px;">
              <strong style="font-size: 13pt; text-transform: uppercase;">PHIẾU KIỂM TRA PHƯƠNG TIỆN VẬN CHUYỂN</strong><br/>
              <span style="font-size: 10pt; font-weight: bold;">(Trước khi bốc xếp hàng hóa lên xe)</span>
            </td>
            <td style="width: 25%; border: 1px solid #333; padding: 6px; font-size: 9.5pt;">
              Biểu mẫu: <strong>BM01-PTVC</strong><br/>
              Lần ban hành: <strong>02</strong><br/>
              Ngày áp dụng: <strong>01/01/2026</strong>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin-bottom: 16px;">
          <h2 style="margin: 0; font-size: 15pt; text-transform: uppercase;">
            BIÊN BẢN KIỂM SOÁT PHƯƠNG TIỆN VẬN CHUYỂN
          </h2>
          <div style="font-style: italic; margin-top: 3px;">Mã phiếu: <strong>${v.inspection_code}</strong></div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11pt;">
          <tr>
            <td style="padding: 4px 0; width: 50%;"><strong>1. Biển kiểm soát xe:</strong> ${v.vehicle_plate}</td>
            <td style="padding: 4px 0; width: 50%;"><strong>2. Thời gian kiểm tra:</strong> ${v.inspection_date}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;"><strong>3. Họ tên lái xe:</strong> ${v.driver_name}</td>
            <td style="padding: 4px 0;"><strong>4. Điện thoại liên lạc:</strong> ${v.driver_phone || "--"}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0;" colSpan="2"><strong>5. Đơn vị vận tải:</strong> ${v.transport_company || "Đội xe Công ty"}</td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11pt;" border="1">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: center;">
              <th style="padding: 6px; width: 8%;">STT</th>
              <th style="padding: 6px; width: 42%;">Hạng mục kiểm tra</th>
              <th style="padding: 6px; width: 34%;">Tiêu chuẩn kỹ thuật quy định</th>
              <th style="padding: 6px; width: 16%;">Kết quả</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center; padding: 6px;">1</td>
              <td style="padding: 6px;"><strong>Niên hạn / Giấy phép đăng kiểm xe</strong></td>
              <td style="padding: 6px;">Xe còn niên hạn sử dụng, được cơ quan đăng kiểm cấp phép lưu hành hợp lệ</td>
              <td style="text-align: center; font-weight: bold; color: ${v.valid_registration_check ? "#047857" : "#b91c1c"};">
                ${v.valid_registration_check ? "ĐẠT" : "K. ĐẠT"}
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding: 6px;">2</td>
              <td style="padding: 6px;"><strong>Kết cấu thùng chứa hàng</strong></td>
              <td style="padding: 6px;">Kết cấu bền chắc, kín, không thủng rách, không có góc cạnh sắc nhọn</td>
              <td style="text-align: center; font-weight: bold; color: ${v.cargo_integrity_check ? "#047857" : "#b91c1c"};">
                ${v.cargo_integrity_check ? "ĐẠT" : "K. ĐẠT"}
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding: 6px;">3</td>
              <td style="padding: 6px;"><strong>Vệ sinh thùng xe</strong></td>
              <td style="padding: 6px;">Sạch sẽ, khô ráo, không han gỉ, phù hợp với chủng loại hàng hóa</td>
              <td style="text-align: center; font-weight: bold; color: ${v.clean_dry_check ? "#047857" : "#b91c1c"};">
                ${v.clean_dry_check ? "ĐẠT" : "K. ĐẠT"}
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding: 6px;">4</td>
              <td style="padding: 6px;"><strong>Kiểm soát mùi lạ</strong></td>
              <td style="padding: 6px;">Không mùi lạ (hóa chất độc hại, xăng dầu, phân bón, thuốc BVTV...)</td>
              <td style="text-align: center; font-weight: bold; color: ${v.no_odor_check ? "#047857" : "#b91c1c"};">
                ${v.no_odor_check ? "ĐẠT" : "K. ĐẠT"}
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding: 6px;">5</td>
              <td style="padding: 6px;"><strong>Côn trùng & Động vật gây hại</strong></td>
              <td style="padding: 6px;">Không ẩm mốc, không có côn trùng, chuột bọ hoặc động vật gây hại</td>
              <td style="text-align: center; font-weight: bold; color: ${v.pest_free_check ? "#047857" : "#b91c1c"};">
                ${v.pest_free_check ? "ĐẠT" : "K. ĐẠT"}
              </td>
            </tr>
          </tbody>
        </table>

        <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #333; background-color: ${v.inspection_result === "PASS" ? "#f0fdf4" : "#fef2f2"};">
          <strong>KẾT LUẬN KIỂM TRA:</strong> 
          <span style="font-size: 13pt; font-weight: bold; color: ${v.inspection_result === "PASS" ? "#047857" : "#b91c1c"}; margin-left: 8px;">
            ${v.inspection_result === "PASS" ? "ĐỦ ĐIỀU KIỆN XẾP HÀNG (PASS)" : "KHÔNG ĐỦ ĐIỀU KIỆN XẾP HÀNG (FAIL)"}
          </span>
          ${v.notes ? `<div style="margin-top: 4px; font-size: 10.5pt; font-style: italic;">Ghi chú KCS: ${v.notes}</div>` : ""}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 35px; text-align: center;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <strong>LÁI XE VẬN CHUYỂN</strong><br/>
              <span style="font-size: 9.5pt; font-style: italic;">(Ký & ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <strong>${v.driver_name}</strong>
            </td>
            <td style="width: 50%; vertical-align: top;">
              <strong>KCS / THỦ KHO KIỂM TRA</strong><br/>
              <span style="font-size: 9.5pt; font-style: italic;">(Ký & ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <strong>${v.inspector_name}</strong>
            </td>
          </tr>
        </table>
      </div>
    `;
    printHtml(html);
  };

  // IN BM02-HỦY HÀNG (Biên bản tiêu hủy thực phẩm / hàng không phù hợp)
  const handlePrintDisposalRecord = (d: DisposalRecordItem) => {
    const html = `
      <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.45; color: #111; max-width: 800px; margin: 0 auto; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="width: 25%; text-align: center; border: 1px solid #333; padding: 6px;">
              <strong style="font-size: 13pt; color: #047857;">WCERT FOOD</strong><br/>
              <span style="font-size: 9pt;">HỆ THỐNG FSMS ISO 22000</span>
            </td>
            <td style="width: 50%; text-align: center; border: 1px solid #333; padding: 6px;">
              <strong style="font-size: 13pt; text-transform: uppercase;">BIÊN BẢN TIÊU HỦY SẢN PHẨM KHÔNG PHÙ HỢP</strong><br/>
              <span style="font-size: 10pt; font-weight: bold;">(Căn cứ Điều khoản 8.9.3 & 8.9.4 Tiêu chuẩn ISO 22000:2018)</span>
            </td>
            <td style="width: 25%; border: 1px solid #333; padding: 6px; font-size: 9.5pt;">
              Biểu mẫu: <strong>BM02-HỦY HÀNG</strong><br/>
              Lần ban hành: <strong>02</strong><br/>
              Ngày áp dụng: <strong>01/01/2026</strong>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin-bottom: 18px;">
          <h2 style="margin: 0; font-size: 15pt; text-transform: uppercase;">
            BIÊN BẢN XÁC NHẬN HỦY HÀNG
          </h2>
          <div style="font-style: italic; margin-top: 3px;">Mã số biên bản: <strong>${d.record_code}</strong> &nbsp;|&nbsp; Ngày lập: <strong>${d.disposal_date}</strong></div>
        </div>

        <div style="margin-bottom: 12px; font-size: 11pt;">
          <strong>Thành phần tham gia xác nhận hủy hàng bao gồm:</strong>
          <div style="border: 1px solid #999; padding: 10px 14px; margin-top: 5px; background-color: #fafafa; font-size: 10.5pt; line-height: 1.6;">
            ${
              d.witness_council && d.witness_council.includes("1.")
                ? d.witness_council.split("\n").map((line, idx) => `<div>${line}</div>`).join("")
                : `<div>1. Ông/Bà: <strong>Nguyễn Văn Tài</strong> &nbsp;&nbsp;&nbsp;&nbsp; Phòng / Ban: <strong>Kho Vận</strong> &nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: <strong>Thủ kho</strong></div>
                   <div>2. Ông/Bà: <strong>Lê Hoàng Nam</strong> &nbsp;&nbsp;&nbsp;&nbsp; Phòng / Ban: <strong>QLCL (QA/QC)</strong> &nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: <strong>Chuyên viên HACCP</strong></div>
                   <div>3. Ông/Bà: <strong>Trần Quốc Huy</strong> &nbsp;&nbsp;&nbsp;&nbsp; Phòng / Ban: <strong>Phân xưởng Chế biến</strong> &nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: <strong>Quản đốc Sản xuất</strong></div>`
            }
          </div>
        </div>

        <div style="margin-bottom: 10px; font-size: 11pt;">
          Chúng tôi đã tiến hành bàn giao hàng hủy tại <strong>${d.disposal_location || "Khu xử lý chất thải Nhà máy"}</strong> với số lượng như sau:
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10.5pt;" border="1">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: center;">
              <th style="padding: 6px; width: 5%;">STT</th>
              <th style="padding: 6px; width: 30%;">DANH MỤC</th>
              <th style="padding: 6px; width: 8%;">ĐVT</th>
              <th style="padding: 6px; width: 14%;">SỐ LƯỢNG</th>
              <th style="padding: 6px; width: 23%;">PHƯƠNG PHÁP TIÊU HỦY (*)</th>
              <th style="padding: 6px; width: 20%;">ĐÁNH GIÁ KẾT QUẢ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center; padding: 8px;">1</td>
              <td style="padding: 8px;">
                <strong>${d.product_name}</strong><br/>
                <span style="font-size: 9pt; color: #555;">Mã lô: ${d.batch_number}</span>
              </td>
              <td style="text-align: center; padding: 8px;">${d.unit}</td>
              <td style="text-align: center; padding: 8px; font-weight: bold; color: #b91c1c;">${d.quantity}</td>
              <td style="padding: 8px; font-size: 10pt;">${d.disposal_method}</td>
              <td style="text-align: center; padding: 8px; font-weight: bold; color: #047857;">
                ${d.status === "DISPOSED" ? "ĐÃ TIÊU HỦY" : "CHỜ TIÊU HỦY"}
              </td>
            </tr>
          </tbody>
        </table>

        <div style="margin-bottom: 10px; font-size: 9pt; font-style: italic; color: #555;">
          (*) <strong>Ghi chú mở rộng phần mềm:</strong> Trường phương pháp hủy và lý do hủy là tính năng số hóa hỗ trợ hệ thống quản lý FSMS (trên mẫu giấy BM02 gốc ghi chung tại mục đánh giá/ghi chú).
        </div>

        <div style="margin-bottom: 12px; font-size: 10.5pt;">
          <strong>Lý do tiêu hủy:</strong>
          <div style="border: 1px solid #ccc; padding: 6px 10px; margin-top: 3px; background-color: #fafafa;">
            ${d.reason}
          </div>
        </div>

        <div style="margin-bottom: 25px; padding: 10px 14px; border: 1px dashed #047857; background-color: #f0fdf4; font-size: 10.5pt; line-height: 1.5;">
          Số lượng hàng đã tiêu hủy và quá trình hủy hàng được sự giám sát và thực hiện đúng cách thức hủy hàng đã nêu trong biên bản.<br/>
          Các bên đã thống nhất những nội dung và đồng ý ký vào biên bản này.
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 25px; text-align: center;">
          <tr>
            <td style="width: 33.3%; vertical-align: top;">
              <strong style="text-transform: uppercase;">ĐƠN VỊ THỰC HIỆN HỦY HÀNG</strong><br/>
              <span style="font-size: 9pt; font-style: italic;">(Ký & ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <span style="font-size: 9.5pt; color: #444; font-style: italic;">(Đã ký xác nhận)</span>
            </td>
            <td style="width: 33.3%; vertical-align: top;">
              <strong style="text-transform: uppercase;">P. QLCL</strong><br/>
              <span style="font-size: 9pt; font-style: italic;">(Ký & ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <strong>${d.approved_by || "Lê Hoàng Nam (QA)"}</strong>
            </td>
            <td style="width: 33.3%; vertical-align: top;">
              <strong style="text-transform: uppercase;">PHÒNG BAN ĐỀ XUẤT HỦY HÀNG</strong><br/>
              <span style="font-size: 9pt; font-style: italic;">(Ký & ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <span style="font-size: 9.5pt; color: #444; font-style: italic;">(Đã ký xác nhận)</span>
            </td>
          </tr>
        </table>
      </div>
    `;
    printHtml(html);
  };

  // Filtered stocks
  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      const matchSearch =
        search === "" ||
        s.item_name.toLowerCase().includes(search.toLowerCase()) ||
        s.item_code.toLowerCase().includes(search.toLowerCase()) ||
        s.lot_number.toLowerCase().includes(search.toLowerCase()) ||
        s.location_bin.toLowerCase().includes(search.toLowerCase());

      const matchCat = categoryFilter === "ALL" || s.category === categoryFilter;

      let matchFefo = true;
      if (fefoFilter === "EXPIRED") matchFefo = s.fefo_status === "EXPIRED";
      else if (fefoFilter === "NEAR_EXPIRY")
        matchFefo = s.fefo_status === "CRITICAL_NEAR_EXPIRY" || s.fefo_status === "NEAR_EXPIRY";
      else if (fefoFilter === "GOOD") matchFefo = s.fefo_status === "GOOD";

      return matchSearch && matchCat && matchFefo;
    });
  }, [stocks, search, categoryFilter, fefoFilter]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicleInspections.filter((v) => {
      const matchSearch =
        vehicleSearch === "" ||
        v.inspection_code.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        v.vehicle_plate.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        v.driver_name.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        (v.transport_company || "").toLowerCase().includes(vehicleSearch.toLowerCase());
      const matchResult = vehicleResultFilter === "ALL" || v.inspection_result === vehicleResultFilter;
      return matchSearch && matchResult;
    });
  }, [vehicleInspections, vehicleSearch, vehicleResultFilter]);

  // Filtered disposals
  const filteredDisposals = useMemo(() => {
    return disposalRecords.filter((d) => {
      const matchSearch =
        disposalSearch === "" ||
        d.record_code.toLowerCase().includes(disposalSearch.toLowerCase()) ||
        d.batch_number.toLowerCase().includes(disposalSearch.toLowerCase()) ||
        d.product_name.toLowerCase().includes(disposalSearch.toLowerCase()) ||
        d.reason.toLowerCase().includes(disposalSearch.toLowerCase());
      const matchStatus = disposalStatusFilter === "ALL" || d.status === disposalStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [disposalRecords, disposalSearch, disposalStatusFilter]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader
            title="Kho FEFO & Lưu Mẫu Nghiệm Thức"
            description="Quản lý xuất nhập tồn theo chuẩn FEFO, kiểm soát vị trí bin kho lạnh, mẫu lưu đối chứng và kết nối truy xuất 1 chạm theo ISO 22000:2018."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSeedDemo} disabled={loading} className="gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Nạp mẫu Demo ISO
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Link to="/traceability">
            <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold">
              <QrCode className="h-4 w-4" />
              Truy xuất nguồn gốc 1 chạm
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <AIBadge>
        <b>AI Kho vận & FEFO:</b> Tự động tính toán rủi ro hạn dùng theo từng giờ · Đề xuất ưu tiên thứ tự xuất kho (FEFO Priority) · Cảnh báo mẻ mẫu lưu hết hạn cần xử lý hủy.
      </AIBadge>

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Tổng Tồn Kho</span>
            <Boxes className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{kpi.total_stock_items}</span>
            <span className="text-xs text-muted-foreground">mặt hàng ({kpi.total_stock_quantity.toLocaleString()} kg/gói)</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Kiểm soát xuất nhập tồn liên tục
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Cảnh Báo Cận Date (FEFO)</span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600">{kpi.near_expiry_items}</span>
            <span className="text-xs text-rose-600 font-medium">({kpi.expired_items} hết hạn)</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700 font-medium">
            Ưu tiên xuất trước theo Điều khoản 8.2
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Mẫu Lưu Đối Chứng</span>
            <FlaskConical className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-blue-600">{kpi.active_retained_samples}</span>
            <span className="text-xs text-muted-foreground">/ {kpi.total_retained_samples} mẫu</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-600 font-medium">
            Nhiệt độ tủ đối chứng ≤ -18°C
          </div>
        </div>

        {/* Card 4 */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Mẻ SX & Xuất Hàng</span>
            <Truck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{kpi.total_production_batches}</span>
            <span className="text-xs text-muted-foreground">mẻ ({kpi.total_order_dispatches} phiếu xuất)</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">
            Sẵn sàng truy xuất 1 chạm 100%
          </div>
        </div>
      </div>

      {/* QUICK TRACEABILITY PROMO BANNER */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Hệ Thống Truy Xuất Nguồn Gốc 1 Chạm (One-Touch Traceability Engine)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Nhập mã Lô thành phẩm hoặc mã Lô nguyên liệu để vẽ sơ đồ chuỗi cung ứng 4 tầng & In Biên bản BM-TX-01 chuẩn ISO 22000:2018 Điều khoản 8.5.2.
              </p>
            </div>
          </div>
          <Link to="/traceability" className="w-full sm:w-auto shrink-0">
            <Button size="sm" className="w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              Mở Trình Truy Xuất
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveTab("stock")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "stock"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Boxes className="h-4 w-4" />
          1. Tồn Kho FEFO & Cảnh Báo ({stocks.length})
        </button>

        <button
          onClick={() => setActiveTab("bins")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "bins"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MapPin className="h-4 w-4" />
          2. Sơ Đồ Vị Trí Kệ & Bin Kho Lạnh
        </button>

        <button
          onClick={() => setActiveTab("samples")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "samples"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FlaskConical className="h-4 w-4" />
          3. Mẫu Lưu Nghiệm Thức ({samples.length})
        </button>

        <button
          onClick={() => setActiveTab("production")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "production"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Truck className="h-4 w-4" />
          4. Mẻ Sản Xuất & Xuất Hàng ({batches.length + dispatches.length})
        </button>

        <button
          onClick={() => setActiveTab("vehicles")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "vehicles"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          5. Kiểm Xe Xuất Hàng (BM01-PTVC) ({vehicleInspections.length})
        </button>

        <button
          onClick={() => setActiveTab("disposal")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "disposal"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Trash2 className="h-4 w-4" />
          6. Hủy Hàng Không Phù Hợp (BM02) ({disposalRecords.length})
        </button>
      </div>

      {/* ==========================================
          TAB 1: TỒN KHO FEFO
      ========================================== */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên nguyên liệu, mã lô, vị trí kệ, mã QR..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Tất cả phân loại</option>
                <option value="RAW_MATERIAL">Nguyên liệu tươi sống</option>
                <option value="ADDITIVE">Phụ gia & Gia vị</option>
                <option value="PACKAGING">Bao bì trực tiếp</option>
                <option value="FINISHED_GOOD">Thành phẩm xuất xưởng</option>
              </select>

              <select
                value={fefoFilter}
                onChange={(e) => setFefoFilter(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">Tất cả trạng thái FEFO</option>
                <option value="NEAR_EXPIRY">⚠️ Cận hạn (≤ 30 ngày) - Ưu tiên xuất</option>
                <option value="EXPIRED">🛑 Đã quá hạn (Biệt trữ)</option>
                <option value="GOOD">✅ An toàn</option>
              </select>
            </div>

            <Button
              onClick={() => {
                setSelectedStock(null);
                setStockForm({
                  item_code: `NL-${(stocks.length + 1).toString().padStart(2, "0")}`,
                  item_name: "",
                  category: "RAW_MATERIAL",
                  lot_number: `NL-2026-${Date.now().toString().slice(-4)}`,
                  quantity: 100,
                  unit: "kg",
                  min_stock_level: 50,
                  mfg_date: new Date().toISOString().split("T")[0],
                  exp_date: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
                  warehouse_type: "COLD_STORAGE",
                  location_bin: "Kệ A1-01",
                  temperature_c: -18.0,
                  status: "AVAILABLE",
                  notes: "",
                });
                setStockModalOpen(true);
              }}
              className="gap-1.5 shrink-0"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Nhập Kho Mới
            </Button>
          </div>

          {/* STOCK TABLE */}
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Mã & Mặt Hàng</th>
                    <th className="py-3 px-4">Mã Lô & QR</th>
                    <th className="py-3 px-4">Số Lượng Tồn</th>
                    <th className="py-3 px-4">Vị Trí & Nhiệt Độ</th>
                    <th className="py-3 px-4">Ngày SX / Hạn Dùng</th>
                    <th className="py-3 px-4">Ưu Tiên FEFO</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStocks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Không tìm thấy mục tồn kho nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredStocks.map((item) => (
                      <tr key={item.inventory_id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium">
                          <div className="font-semibold text-foreground">{item.item_name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] text-muted-foreground">{item.item_code}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-normal">
                              {item.category === "RAW_MATERIAL"
                                ? "Nguyên liệu"
                                : item.category === "ADDITIVE"
                                ? "Phụ gia/Gia vị"
                                : item.category === "PACKAGING"
                                ? "Bao bì"
                                : "Thành phẩm"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-primary">{item.lot_number}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <QrCode className="h-3 w-3" /> {item.qr_code}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">
                            {item.quantity.toLocaleString()} {item.unit}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Tối thiểu: {item.min_stock_level} {item.unit}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium flex items-center gap-1 text-foreground">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            {item.location_bin}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <ThermometerSnowflake className="h-3 w-3 text-blue-500" />
                            {item.temperature_c !== undefined && item.temperature_c !== null
                              ? `${item.temperature_c}°C`
                              : "Nhiệt độ phòng"}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-muted-foreground text-xs">NSX: {item.mfg_date}</div>
                          <div className="font-semibold text-foreground text-xs">HSD: {item.exp_date}</div>
                        </td>

                        <td className="py-3 px-4">
                          {item.fefo_status === "EXPIRED" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-700">
                              <AlertTriangle className="h-3.5 w-3.5" /> Quá hạn (Cách ly)
                            </span>
                          ) : item.fefo_status === "CRITICAL_NEAR_EXPIRY" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-500/30">
                              <Flame className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                              Ưu tiên #1 (Còn {item.days_to_expiry} ngày)
                            </span>
                          ) : item.fefo_status === "NEAR_EXPIRY" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              <Clock className="h-3.5 w-3.5" /> Cận date ({item.days_to_expiry} ngày)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> An toàn ({item.days_to_expiry} ngày)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Xem & In Tem Mã QR"
                              onClick={() => {
                                setQrModalData({
                                  title: `Tem Mã QR – ${item.item_name}`,
                                  qrCodeText: item.qr_code || item.lot_number,
                                  lotNumber: item.lot_number,
                                  productName: item.item_name,
                                  mfgDate: item.mfg_date,
                                  expDate: item.exp_date,
                                  quantity: item.quantity,
                                  unit: item.unit,
                                });
                                setQrModalOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedStock(item);
                                setStockForm({
                                  item_code: item.item_code,
                                  item_name: item.item_name,
                                  category: item.category,
                                  lot_number: item.lot_number,
                                  quantity: item.quantity,
                                  unit: item.unit,
                                  min_stock_level: item.min_stock_level,
                                  mfg_date: item.mfg_date,
                                  exp_date: item.exp_date,
                                  warehouse_type: item.warehouse_type,
                                  location_bin: item.location_bin,
                                  temperature_c: item.temperature_c ?? -18.0,
                                  status: item.status,
                                  notes: item.notes || "",
                                });
                                setStockModalOpen(true);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingStockItem({ id: item.inventory_id, name: item.item_name, lot: item.lot_number })}
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              title="Xóa tồn kho"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: SƠ ĐỒ VỊ TRÍ KỆ & BIN KHO LẠNH
      ========================================== */}
      {activeTab === "bins" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <ThermometerSnowflake className="h-5 w-5 text-blue-500" />
              Bản Đồ Phân Vùng Kho & Ma Trận Ô Kệ (Warehouse Bin Layout)
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Phân vùng kho theo tiêu chuẩn PRP (ISO 22000 Điều khoản 8.2) chống nhiễm chéo giữa nguyên liệu sống và thành phẩm.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              {/* KHU VỰC 1: KHO ĐÔNG LẠNH */}
              <div className="rounded-xl border border-blue-500/30 bg-blue-50/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-blue-900 flex items-center gap-1.5">
                    <ThermometerSnowflake className="h-4 w-4 text-blue-600" />
                    KHO ĐÔNG LẠNH (≤ -18°C)
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700">
                    Nhiệt độ đo: -18.5°C
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border bg-card p-3 shadow-xs">
                    <div className="font-bold text-primary">Kệ A1-01</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Chả cá Ba Sa Thượng Hạng</div>
                    <div className="text-[10px] font-mono text-emerald-600 font-bold mt-1">300 gói (AVAILABLE)</div>
                  </div>
                  <div className="rounded-lg border bg-card p-3 shadow-xs">
                    <div className="font-bold text-primary">Kệ A1-02</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Cá Tra Fillet tươi</div>
                    <div className="text-[10px] font-mono text-emerald-600 font-bold mt-1">1,500 kg (IQC ĐẠT)</div>
                  </div>
                  <div className="rounded-lg border border-dashed bg-muted/40 p-3 flex items-center justify-center text-muted-foreground text-center">
                    Kệ A2-01 (Trống)
                  </div>
                  <div className="rounded-lg border border-dashed bg-muted/40 p-3 flex items-center justify-center text-muted-foreground text-center">
                    Kệ A2-02 (Trống)
                  </div>
                </div>
              </div>

              {/* KHU VỰC 2: KHO MÁT CHILL STORAGE */}
              <div className="rounded-xl border border-teal-500/30 bg-teal-50/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-teal-900 flex items-center gap-1.5">
                    <ThermometerSnowflake className="h-4 w-4 text-teal-600" />
                    KHO MÁT (0°C - 4°C)
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700">
                    Nhiệt độ đo: 2.5°C
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border bg-card p-3 shadow-xs">
                    <div className="font-bold text-primary">Kệ M-01</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Rau thơm & Ớt tươi</div>
                    <div className="text-[10px] font-mono text-emerald-600 font-bold mt-1">80 kg</div>
                  </div>
                  <div className="rounded-lg border bg-card p-3 shadow-xs">
                    <div className="font-bold text-primary">Kệ M-02</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Men & Phụ gia ủ</div>
                    <div className="text-[10px] font-mono text-emerald-600 font-bold mt-1">45 kg</div>
                  </div>
                  <div className="rounded-lg border border-dashed bg-muted/40 p-3 flex items-center justify-center text-muted-foreground text-center">
                    Kệ M-03 (Trống)
                  </div>
                  <div className="rounded-lg border border-dashed bg-muted/40 p-3 flex items-center justify-center text-muted-foreground text-center">
                    Kệ M-04 (Trống)
                  </div>
                </div>
              </div>

              {/* KHU VỰC 3: KHO KHÔ & BAO BÌ */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-50/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-amber-900 flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-amber-600" />
                    KHO KHÔ & BAO BÌ (≤ 25°C)
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700">
                    Độ ẩm: 55%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-amber-500/40 bg-amber-50/60 p-3 shadow-xs">
                    <div className="font-bold text-amber-900">Kệ B2-03 ⚠️</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Bột lòng trắng trứng</div>
                    <div className="text-[10px] font-mono text-amber-700 font-bold mt-1">Còn 5 ngày (FEFO #1)</div>
                  </div>
                  <div className="rounded-lg border bg-card p-3 shadow-xs">
                    <div className="font-bold text-primary">Kệ B1-01</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Gia vị tổng hợp cao cấp</div>
                    <div className="text-[10px] font-mono text-emerald-600 font-bold mt-1">200 kg (AVAILABLE)</div>
                  </div>
                  <div className="rounded-lg border bg-card p-3 shadow-xs">
                    <div className="font-bold text-primary">Kệ BB-01</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Bao bì PE in sẵn 500g</div>
                    <div className="text-[10px] font-mono text-emerald-600 font-bold mt-1">12,500 cái</div>
                  </div>
                  <div className="rounded-lg border border-dashed bg-muted/40 p-3 flex items-center justify-center text-muted-foreground text-center">
                    Kệ BB-02 (Trống)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: MẪU LƯU NGHIỆM THỨC
      ========================================== */}
      {activeTab === "samples" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Quản lý mẫu lưu đối chứng theo từng ca/mẻ sản xuất. Hạn lưu tối thiểu: <b>HSD + 30 ngày</b> theo ISO 22000 Điều khoản 8.5.2.
            </div>
            <Button
              onClick={() => {
                setSelectedSample(null);
                setSampleForm({
                  sample_code: `ML-202608-${(samples.length + 1).toString().padStart(2, "0")}`,
                  batch_number: "LOT-202608-B01",
                  product_name: "Chả cá Ba Sa Thượng Hạng 500g",
                  sample_weight_g: 250,
                  storage_cabinet: "Tủ đông mẫu T-01",
                  storage_temperature_c: -18.0,
                  sample_date: new Date().toISOString().split("T")[0],
                  expiry_date: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
                  sampled_by: "QC Ca",
                  test_result: "PASS",
                  status: "STORED",
                  notes: "",
                });
                setSampleModalOpen(true);
              }}
              className="gap-1.5 shrink-0"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Thêm Mẫu Lưu Mới
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {samples.map((sample) => (
              <div key={sample.sample_id} className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-primary">{sample.sample_code}</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      sample.test_result === "PASS"
                        ? "bg-emerald-500/10 text-emerald-700"
                        : sample.test_result === "FAIL"
                        ? "bg-rose-500/10 text-rose-700"
                        : "bg-amber-500/10 text-amber-700"
                    }`}
                  >
                    {sample.test_result === "PASS" ? "Vi sinh: ĐẠT" : sample.test_result === "FAIL" ? "KHÔNG ĐẠT" : "Đang kiểm nghiệm"}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-foreground">{sample.product_name}</h4>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Mẻ sản xuất: <span className="font-mono font-semibold text-foreground">{sample.batch_number}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg">
                  <div>
                    <span className="text-muted-foreground">Vị trí tủ:</span>
                    <div className="font-semibold text-foreground">{sample.storage_cabinet}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nhiệt độ lưu:</span>
                    <div className="font-semibold text-blue-600">{sample.storage_temperature_c}°C</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ngày lấy mẫu:</span>
                    <div className="font-semibold text-foreground">{sample.sample_date}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hạn lưu mẫu:</span>
                    <div className="font-semibold text-foreground">{sample.expiry_date}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t">
                  <span className="text-muted-foreground">Người lấy: {sample.sampled_by}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSample(sample);
                        setSampleForm({
                          sample_code: sample.sample_code,
                          batch_number: sample.batch_number,
                          product_name: sample.product_name,
                          sample_weight_g: sample.sample_weight_g,
                          storage_cabinet: sample.storage_cabinet,
                          storage_temperature_c: sample.storage_temperature_c ?? -18.0,
                          sample_date: sample.sample_date,
                          expiry_date: sample.expiry_date,
                          sampled_by: sample.sampled_by,
                          test_result: sample.test_result,
                          status: sample.status,
                          notes: sample.notes || "",
                        });
                        setSampleModalOpen(true);
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingSampleItem({ id: sample.sample_id, code: sample.sample_code })}
                      className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      title="Xóa mẫu lưu"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: MẺ SẢN XUẤT & XUẤT HÀNG
      ========================================== */}
      {activeTab === "production" && (
        <div className="space-y-6">
          {/* PRODUCTION BATCHES */}
          <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Boxes className="h-5 w-5 text-primary" />
                Danh Sách Mẻ Sản Xuất (Production Batches)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">Mã Mẻ & Tên Sản Phẩm</th>
                    <th className="py-2.5 px-3">Ca Kíp & Dây Chuyền</th>
                    <th className="py-2.5 px-3">Sản Lượng</th>
                    <th className="py-2.5 px-3">Nguyên Liệu Cấu Thành</th>
                    <th className="py-2.5 px-3">Thời Gian & QC</th>
                    <th className="py-2.5 px-3">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {batches.map((batch) => (
                    <tr key={batch.batch_id} className="hover:bg-muted/30">
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-primary">{batch.batch_number}</div>
                        <div className="font-medium text-foreground">{batch.product_name}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div>{batch.shift}</div>
                        <div className="text-xs text-muted-foreground">{batch.production_line}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold">
                        {batch.actual_quantity} {batch.unit}
                      </td>
                      <td className="py-3 px-3">
                        {batch.material_usages && batch.material_usages.length > 0 ? (
                          <div className="space-y-0.5">
                            {batch.material_usages.map((m, idx) => (
                              <div key={idx} className="text-xs">
                                • {m.material_name} ({m.lot_number}): <b>{m.quantity_used} {m.unit}</b>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">2 lô nguyên liệu</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        <div>Bắt đầu: {new Date(batch.start_time).toLocaleString("vi-VN")}</div>
                        <div className="text-foreground font-medium">QC: {batch.qc_inspector}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> {batch.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ORDER DISPATCHES */}
          <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-600" />
                Phiếu Xuất Kho & Giao Nhận Hàng (Order Dispatches)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">Mã Phiếu & Đơn Hàng</th>
                    <th className="py-2.5 px-3">Khách Hàng / Đại Lý</th>
                    <th className="py-2.5 px-3">Lô Xuất & Số Lượng</th>
                    <th className="py-2.5 px-3">Xe Giao & Nhiệt Độ</th>
                    <th className="py-2.5 px-3">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dispatches.map((d) => (
                    <tr key={d.dispatch_id} className="hover:bg-muted/30">
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-primary">{d.dispatch_code}</div>
                        <div className="text-xs text-muted-foreground">{d.order_number}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">
                        <div>{d.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{d.destination_address}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono font-semibold">{d.batch_number}</div>
                        <div className="text-xs text-foreground font-bold">
                          {d.quantity_dispatched} {d.unit}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-xs font-semibold">{d.vehicle_number}</div>
                        <div className="text-xs text-blue-600 font-medium">Nhiệt độ: {d.vehicle_temp_c}°C (ĐẠT)</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 5: KIỂM XE XUẤT HÀNG (BM01-PTVC)
      ========================================== */}
      {activeTab === "vehicles" && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo biển số xe, tên tài xế, mã phiếu, nhà xe..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>

              <select
                value={vehicleResultFilter}
                onChange={(e) => setVehicleResultFilter(e.target.value as any)}
                className="h-9 rounded-md border bg-background px-3 text-xs sm:text-sm"
              >
                <option value="ALL">Tất cả kết quả</option>
                <option value="PASS">ĐẠT (PASS - Cho phép bốc hàng)</option>
                <option value="FAIL">TỪ CHỐI (FAIL - Không đạt chuẩn)</option>
              </select>
            </div>

            <Button onClick={openNewVehicle} size="sm" className="gap-2 shrink-0 bg-primary hover:bg-primary/90 font-semibold">
              <Plus className="h-4 w-4" />
              Lập Phiếu Kiểm Xe (BM01-PTVC)
            </Button>
          </div>

          {/* TABLE OF VEHICLE INSPECTIONS */}
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  Sổ Nhật Ký Kiểm Tra Phương Tiện Vận Chuyển Trước Bốc Hàng
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Biểu mẫu BM01-PTVC (Điều khoản 8.2 ISO 22000) — Đánh giá 5 tiêu chí: Đăng kiểm hợp lệ, thùng xe kín bền, sạch khô, không mùi lạ, không côn trùng hại.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Đạt: {vehicleInspections.filter(v => v.inspection_result === "PASS").length}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 font-semibold text-rose-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> Từ chối: {vehicleInspections.filter(v => v.inspection_result === "FAIL").length}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[11px] font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Mã Phiếu & Ngày Giờ</th>
                    <th className="py-2.5 px-3">Biển Số & Đơn Vị</th>
                    <th className="py-2.5 px-3">Tài Xế</th>
                    <th className="py-2.5 px-3 text-center">5 Tiêu Chuẩn Kỹ Thuật (BM01-PTVC)</th>
                    <th className="py-2.5 px-3 text-center">Kết Quả</th>
                    <th className="py-2.5 px-3">Người Kiểm Tra</th>
                    <th className="py-2.5 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Chưa có phiếu kiểm tra phương tiện vận chuyển nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-primary">{v.inspection_code}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(v.inspection_date).toLocaleString("vi-VN")}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-foreground">{v.vehicle_plate}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {v.transport_company || "Đội xe Công ty"}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-foreground">{v.driver_name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {v.driver_phone || "--"}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-center max-w-md">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${v.valid_registration_check ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {v.valid_registration_check ? "✓ Đăng kiểm còn hạn" : "✗ Hết đăng kiểm"}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${v.cargo_integrity_check ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {v.cargo_integrity_check ? "✓ Thùng kín, bền" : "✗ Thủng/Rách"}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${v.clean_dry_check ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {v.clean_dry_check ? "✓ Sạch sẽ, khô ráo" : "✗ Bẩn/Ẩm"}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${v.no_odor_check ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {v.no_odor_check ? "✓ Không mùi lạ" : "✗ Có mùi lạ"}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${v.pest_free_check ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {v.pest_free_check ? "✓ Không sâu hại/mốc" : "✗ Côn trùng/Mốc"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {v.inspection_result === "PASS" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> ĐẠT (CHO PHÉP)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-500/20">
                              <AlertTriangle className="h-3 w-3" /> TỪ CHỐI
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-foreground">{v.inspector_name}</div>
                          {v.notes && <div className="text-[11px] text-muted-foreground line-clamp-1 italic">{v.notes}</div>}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintVehicleInspection(v)}
                              title="In Phiếu Kiểm Tra PTVC (BM01-PTVC)"
                              className="h-8 w-8 p-0 text-slate-700 hover:text-primary hover:border-primary"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditVehicle(v)}
                              title="Chỉnh sửa phiếu"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteVehicle(v.id)}
                              title="Xóa phiếu"
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 6: HỦY HÀNG KHÔNG PHÙ HỢP (BM02)
      ========================================== */}
      {activeTab === "disposal" && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo số biên bản, mã lô, tên sản phẩm, lý do hủy..."
                  value={disposalSearch}
                  onChange={(e) => setDisposalSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>

              <select
                value={disposalStatusFilter}
                onChange={(e) => setDisposalStatusFilter(e.target.value as any)}
                className="h-9 rounded-md border bg-background px-3 text-xs sm:text-sm"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="DISPOSED">ĐÃ TIÊU HỦY (Hoàn tất)</option>
                <option value="APPROVED">ĐÃ PHÊ DUYỆT (Chờ hủy)</option>
                <option value="PENDING_APPROVAL">CHỜ PHÊ DUYỆT</option>
              </select>
            </div>

            <Button onClick={openNewDisposal} size="sm" className="gap-2 shrink-0 bg-rose-600 hover:bg-rose-700 text-white font-semibold">
              <Plus className="h-4 w-4" />
              Lập Biên Bản Hủy Hàng (BM02)
            </Button>
          </div>

          {/* TABLE OF DISPOSAL RECORDS */}
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-rose-600" />
                  Sổ Theo Dõi Tiêu Hủy Sản Phẩm / Thực Phẩm Không Phù Hợp
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Biểu mẫu BM02-HỦY HÀNG (Điều khoản 8.9.4 & 8.9.5 ISO 22000) — Hội đồng 3 bên chứng kiến, giám sát và ký biên bản (Đơn vị thực hiện hủy, P.QLCL, Phòng ban đề xuất).
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 font-semibold text-rose-700">
                  <Flame className="h-3.5 w-3.5" /> Tổng khối lượng đã hủy: {disposalRecords.reduce((sum, r) => sum + (r.unit === 'kg' ? r.quantity : 0), 0).toLocaleString()} kg
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[11px] font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Số Biên Bản & Ngày</th>
                    <th className="py-2.5 px-3">Mã Lô & Sản Phẩm</th>
                    <th className="py-2.5 px-3 text-right">Khối Lượng Hủy</th>
                    <th className="py-2.5 px-3">Lý Do Tiêu Hủy</th>
                    <th className="py-2.5 px-3">Phương Pháp & Địa Điểm</th>
                    <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                    <th className="py-2.5 px-3">Phê Duyệt</th>
                    <th className="py-2.5 px-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDisposals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        Chưa có biên bản hủy hàng nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredDisposals.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-rose-600">{d.record_code}</div>
                          <div className="text-[11px] text-muted-foreground">{d.disposal_date}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-foreground">{d.product_name}</div>
                          <div className="text-[11px] font-mono text-muted-foreground">Lô: {d.batch_number}</div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="font-mono font-bold text-foreground text-sm">
                            {d.quantity.toLocaleString()} {d.unit}
                          </div>
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <div className="text-xs text-rose-700 font-medium line-clamp-2">{d.reason}</div>
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <div className="text-xs font-semibold text-foreground line-clamp-1">{d.disposal_method}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">{d.disposal_location}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {d.status === "DISPOSED" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> ĐÃ HỦY
                            </span>
                          ) : d.status === "APPROVED" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-500/20">
                              <CheckSquare className="h-3 w-3" /> ĐÃ DUYỆT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-500/20">
                              <Clock className="h-3 w-3" /> CHỜ DUYỆT
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-foreground">{d.approved_by || "Chưa ký"}</div>
                          {d.witness_council && (
                            <div className="text-[11px] text-muted-foreground line-clamp-1 italic">Hội đồng 3 bên</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintDisposalRecord(d)}
                              title="In Biên Bản Hủy Hàng (BM02)"
                              className="h-8 w-8 p-0 text-slate-700 hover:text-rose-600 hover:border-rose-600"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDisposal(d)}
                              title="Chỉnh sửa biên bản"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteDisposal(d.id)}
                              title="Xóa biên bản"
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: THÊM / SỬA TỒN KHO FEFO (DẠNG DỌC CHUẨN)
      ========================================== */}
      <Dialog open={stockModalOpen} onOpenChange={setStockModalOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Boxes className="h-5 w-5 text-primary" />
              {selectedStock ? "Chỉnh Sửa Mục Tồn Kho" : "Nhập Kho Nguyên Liệu / Thành Phẩm Mới"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Nhập đầy đủ thông tin định danh, số lượng và ngày hạn dùng để tính toán thứ tự ưu tiên xuất kho FEFO.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveStock} className="space-y-4 mt-2">
            {/* NHÓM 1: THÔNG TIN MẶT HÀNG */}
            <div className="rounded-lg border bg-muted/20 p-3.5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> 1. Định danh Mặt Hàng
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Mã mặt hàng *</label>
                  <Input
                    required
                    value={stockForm.item_code}
                    onChange={(e) => setStockForm({ ...stockForm, item_code: e.target.value })}
                    placeholder="NL-01, SP-CC500"
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Phân loại *</label>
                  <select
                    value={stockForm.category}
                    onChange={(e) => setStockForm({ ...stockForm, category: e.target.value as any })}
                    className="w-full h-9 rounded-md border bg-background px-3 text-xs sm:text-sm"
                  >
                    <option value="RAW_MATERIAL">Nguyên liệu tươi sống</option>
                    <option value="ADDITIVE">Phụ gia & Gia vị</option>
                    <option value="PACKAGING">Bao bì trực tiếp</option>
                    <option value="FINISHED_GOOD">Thành phẩm xuất xưởng</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Tên mặt hàng / sản phẩm *</label>
                <Input
                  required
                  value={stockForm.item_name}
                  onChange={(e) => setStockForm({ ...stockForm, item_name: e.target.value })}
                  placeholder="Cá Tra Fillet tươi, Chả cá Ba Sa..."
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Mã Lô Hàng / Mẻ SX (Lot Number) *</label>
                <Input
                  required
                  value={stockForm.lot_number}
                  onChange={(e) => setStockForm({ ...stockForm, lot_number: e.target.value })}
                  placeholder="NL-2026-CA01, LOT-202608-B01"
                  className="text-xs sm:text-sm font-mono"
                />
              </div>
            </div>

            {/* NHÓM 2: SỐ LƯỢNG & ĐỊNH MỨC */}
            <div className="rounded-lg border bg-muted/20 p-3.5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5" /> 2. Số Lượng & Đơn Vị Tính
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Số lượng tồn *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: parseFloat(e.target.value) || 0 })}
                    className="text-xs sm:text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Đơn vị tính *</label>
                  <select
                    value={stockForm.unit}
                    onChange={(e) => setStockForm({ ...stockForm, unit: e.target.value })}
                    className="w-full h-9 rounded-md border bg-background px-3 text-xs sm:text-sm"
                  >
                    <option value="kg">kg</option>
                    <option value="tấn">tấn</option>
                    <option value="gói">gói</option>
                    <option value="thùng">thùng</option>
                    <option value="cái">cái</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Mức tồn tối thiểu</label>
                  <Input
                    type="number"
                    value={stockForm.min_stock_level}
                    onChange={(e) => setStockForm({ ...stockForm, min_stock_level: parseFloat(e.target.value) || 0 })}
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* NHÓM 3: NGÀY THÁNG FEFO & VỊ TRÍ KHO */}
            <div className="rounded-lg border bg-muted/20 p-3.5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> 3. Quản Trị Hạn Dùng (FEFO) & Vị Trí Ô Kệ
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Ngày sản xuất (MFG) *</label>
                  <Input
                    type="date"
                    required
                    value={stockForm.mfg_date}
                    onChange={(e) => setStockForm({ ...stockForm, mfg_date: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Hạn sử dụng (EXP) *</label>
                  <Input
                    type="date"
                    required
                    value={stockForm.exp_date}
                    onChange={(e) => setStockForm({ ...stockForm, exp_date: e.target.value })}
                    className="text-xs sm:text-sm font-bold text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Vị trí ô/kệ kho *</label>
                  <Input
                    required
                    value={stockForm.location_bin}
                    onChange={(e) => setStockForm({ ...stockForm, location_bin: e.target.value })}
                    placeholder="Kệ A1-01 (Kho Đông)"
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Nhiệt độ bảo quản (°C)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={stockForm.temperature_c}
                    onChange={(e) => setStockForm({ ...stockForm, temperature_c: parseFloat(e.target.value) || 0 })}
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Ghi chú lưu kho & cảnh báo</label>
              <Textarea
                rows={2}
                value={stockForm.notes}
                onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                placeholder="Ghi chú về tình trạng bao bì, điều kiện cách ly..."
                className="text-xs sm:text-sm"
              />
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setStockModalOpen(false)} className="w-full sm:w-auto">
                Hủy bỏ
              </Button>
              <Button type="submit" className="w-full sm:w-auto font-semibold">
                Lưu Thông Tin Tồn Kho
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          MODAL: THÊM / SỬA MẪU LƯU (DẠNG DỌC)
      ========================================== */}
      <Dialog open={sampleModalOpen} onOpenChange={setSampleModalOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              {selectedSample ? "Cập Nhật Mẫu Lưu Nghiệm Thức" : "Ghi Nhận Mẫu Lưu Mới (ISO 8.5.2)"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Mẫu lưu nghiệm thức đối chứng phục vụ điều tra sự cố và đối chiếu khiếu nại chất lượng.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSample} className="space-y-4 mt-2">
            <div className="rounded-lg border bg-muted/20 p-3.5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Mã mẫu lưu *</label>
                  <Input
                    required
                    value={sampleForm.sample_code}
                    onChange={(e) => setSampleForm({ ...sampleForm, sample_code: e.target.value })}
                    placeholder="ML-202608-01"
                    className="text-xs sm:text-sm font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Mã mẻ sản xuất *</label>
                  <Input
                    required
                    value={sampleForm.batch_number}
                    onChange={(e) => setSampleForm({ ...sampleForm, batch_number: e.target.value })}
                    placeholder="LOT-202608-B01"
                    className="text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Tên sản phẩm lưu mẫu *</label>
                <Input
                  required
                  value={sampleForm.product_name}
                  onChange={(e) => setSampleForm({ ...sampleForm, product_name: e.target.value })}
                  placeholder="Chả cá Ba Sa Thượng Hạng 500g"
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Khối lượng mẫu (gam) *</label>
                  <Input
                    type="number"
                    required
                    value={sampleForm.sample_weight_g}
                    onChange={(e) => setSampleForm({ ...sampleForm, sample_weight_g: parseFloat(e.target.value) || 0 })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Vị trí tủ lưu *</label>
                  <select
                    value={sampleForm.storage_cabinet}
                    onChange={(e) => setSampleForm({ ...sampleForm, storage_cabinet: e.target.value })}
                    className="w-full h-9 rounded-md border bg-background px-3 text-xs sm:text-sm"
                  >
                    <option value="Tủ đông mẫu T-01">Tủ đông mẫu T-01 (≤ -18°C)</option>
                    <option value="Tủ đông mẫu T-02">Tủ đông mẫu T-02 (≤ -18°C)</option>
                    <option value="Tủ mát kiểm nghiệm T-03">Tủ mát kiểm nghiệm T-03 (0-4°C)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Ngày lấy mẫu *</label>
                  <Input
                    type="date"
                    required
                    value={sampleForm.sample_date}
                    onChange={(e) => setSampleForm({ ...sampleForm, sample_date: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Hạn lưu bắt buộc (HSD + 30 ngày) *</label>
                  <Input
                    type="date"
                    required
                    value={sampleForm.expiry_date}
                    onChange={(e) => setSampleForm({ ...sampleForm, expiry_date: e.target.value })}
                    className="text-xs sm:text-sm font-bold text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Người lấy mẫu *</label>
                  <Input
                    required
                    value={sampleForm.sampled_by}
                    onChange={(e) => setSampleForm({ ...sampleForm, sampled_by: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Kết quả kiểm nghiệm vi sinh *</label>
                  <select
                    value={sampleForm.test_result}
                    onChange={(e) => setSampleForm({ ...sampleForm, test_result: e.target.value as any })}
                    className="w-full h-9 rounded-md border bg-background px-3 text-xs sm:text-sm font-bold"
                  >
                    <option value="PASS">ĐẠT (PASS - Âm tính Salmonella, E.coli)</option>
                    <option value="TESTING">Đang nuôi cấy / Kiểm nghiệm</option>
                    <option value="FAIL">KHÔNG ĐẠT (FAIL - Dương tính vi sinh)</option>
                    <option value="PENDING">Chưa kiểm nghiệm</option>
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setSampleModalOpen(false)} className="w-full sm:w-auto">
                Hủy bỏ
              </Button>
              <Button type="submit" className="w-full sm:w-auto font-semibold">
                Lưu Mẫu Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          MODAL: KIỂM TRA PHƯƠNG TIỆN VẬN CHUYỂN (BM01-PTVC)
      ========================================== */}
      <Dialog open={vehicleModalOpen} onOpenChange={setVehicleModalOpen}>
        <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {editingVehicle ? "Chỉnh Sửa Phiếu Kiểm Tra Xe" : "Lập Phiếu Kiểm Tra Phương Tiện Vận Chuyển (BM01-PTVC)"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Đánh giá 5 tiêu chí kỹ thuật chuẩn ISO 22000 / BM01-PTVC gốc (niên hạn/đăng kiểm, thùng kín bền, sạch khô, không mùi lạ, không sâu hại) trước khi bốc hàng.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVehicle} className="space-y-4 mt-2">
            {/* NHÓM 1: THÔNG TIN PHƯƠNG TIỆN & TÀI XẾ */}
            <div className="rounded-lg border bg-muted/20 p-3.5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" /> 1. Định Danh Phương Tiện & Tài Xế
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Mã phiếu kiểm tra *</label>
                  <Input
                    required
                    value={vehicleForm.inspection_code}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, inspection_code: e.target.value })}
                    className="text-xs sm:text-sm font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Ngày giờ kiểm tra *</label>
                  <Input
                    type="datetime-local"
                    required
                    value={vehicleForm.inspection_date}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, inspection_date: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Biển số xe *</label>
                  <Input
                    required
                    value={vehicleForm.vehicle_plate}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_plate: e.target.value })}
                    placeholder="VD: 67C-184.29"
                    className="text-xs sm:text-sm font-bold font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Đơn vị vận chuyển</label>
                  <Input
                    value={vehicleForm.transport_company}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, transport_company: e.target.value })}
                    placeholder="VD: Đội xe Công ty / Vận tải Mekong"
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Họ tên tài xế *</label>
                  <Input
                    required
                    value={vehicleForm.driver_name}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, driver_name: e.target.value })}
                    placeholder="VD: Nguyễn Văn Tài"
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Số điện thoại tài xế</label>
                  <Input
                    value={vehicleForm.driver_phone}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, driver_phone: e.target.value })}
                    placeholder="VD: 0918 234 567"
                    className="text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* NHÓM 2: 5 TIÊU CHUẨN KỸ THUẬT BM01-PTVC */}
            <div className="rounded-lg border bg-muted/20 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" /> 2. Đánh Giá 5 Tiêu Chuẩn Kỹ Thuật (Đạt / Không đạt)
                </h4>
                <span className="text-[11px] text-muted-foreground italic">Căn cứ biểu mẫu BM01-PTVC</span>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-background hover:bg-muted/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vehicleForm.valid_registration_check}
                    onChange={(e) => {
                      const val = e.target.checked;
                      const next = { ...vehicleForm, valid_registration_check: val };
                      const pass = val && next.cargo_integrity_check && next.clean_dry_check && next.no_odor_check && next.pest_free_check;
                      next.inspection_result = pass ? "PASS" : "FAIL";
                      setVehicleForm(next);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary"
                  />
                  <div>
                    <div className="text-xs font-semibold">1. Niên hạn sử dụng & Đăng kiểm xe hợp lệ</div>
                    <div className="text-[11px] text-muted-foreground">Xe còn niên hạn sử dụng, được cơ quan đăng kiểm cho phép lưu hành</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-background hover:bg-muted/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vehicleForm.cargo_integrity_check}
                    onChange={(e) => {
                      const val = e.target.checked;
                      const next = { ...vehicleForm, cargo_integrity_check: val };
                      const pass = next.valid_registration_check && val && next.clean_dry_check && next.no_odor_check && next.pest_free_check;
                      next.inspection_result = pass ? "PASS" : "FAIL";
                      setVehicleForm(next);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary"
                  />
                  <div>
                    <div className="text-xs font-semibold">2. Kết cấu thùng chứa hàng bền, kín</div>
                    <div className="text-[11px] text-muted-foreground">Kết cấu thùng chứa bền, kín, không thủng rách, không có vật sắc nhọn</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-background hover:bg-muted/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vehicleForm.clean_dry_check}
                    onChange={(e) => {
                      const val = e.target.checked;
                      const next = { ...vehicleForm, clean_dry_check: val };
                      const pass = next.valid_registration_check && next.cargo_integrity_check && val && next.no_odor_check && next.pest_free_check;
                      next.inspection_result = pass ? "PASS" : "FAIL";
                      setVehicleForm(next);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary"
                  />
                  <div>
                    <div className="text-xs font-semibold">3. Tình trạng vệ sinh sạch sẽ, khô ráo</div>
                    <div className="text-[11px] text-muted-foreground">Thùng xe sạch sẽ, khô ráo, không han gỉ, phù hợp chủng loại hàng</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-background hover:bg-muted/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vehicleForm.no_odor_check}
                    onChange={(e) => {
                      const val = e.target.checked;
                      const next = { ...vehicleForm, no_odor_check: val };
                      const pass = next.valid_registration_check && next.cargo_integrity_check && next.clean_dry_check && val && next.pest_free_check;
                      next.inspection_result = pass ? "PASS" : "FAIL";
                      setVehicleForm(next);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary"
                  />
                  <div>
                    <div className="text-xs font-semibold">4. Kiểm soát mùi lạ</div>
                    <div className="text-[11px] text-muted-foreground">Không mùi lạ (hóa chất, xăng dầu, phân bón, thuốc bảo vệ thực vật...)</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-background hover:bg-muted/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vehicleForm.pest_free_check}
                    onChange={(e) => {
                      const val = e.target.checked;
                      const next = { ...vehicleForm, pest_free_check: val };
                      const pass = next.valid_registration_check && next.cargo_integrity_check && next.clean_dry_check && next.no_odor_check && val;
                      next.inspection_result = pass ? "PASS" : "FAIL";
                      setVehicleForm(next);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary"
                  />
                  <div>
                    <div className="text-xs font-semibold">5. Kiểm soát côn trùng & nấm mốc</div>
                    <div className="text-[11px] text-muted-foreground">Không có dấu hiệu ẩm mốc, không có côn trùng, mối mọt, chuột bọ gây hại</div>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Kết luận thẩm định *</label>
                  <select
                    value={vehicleForm.inspection_result}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, inspection_result: e.target.value as any })}
                    className="w-full h-9 rounded-md border bg-background px-3 text-xs sm:text-sm font-bold"
                  >
                    <option value="PASS">ĐẠT (PASS - Đủ điều kiện xếp hàng)</option>
                    <option value="FAIL">TỪ CHỐI (FAIL - Không đạt chuẩn BM01)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Người kiểm tra (KCS/Thủ kho) *</label>
                  <Input
                    required
                    value={vehicleForm.inspector_name}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, inspector_name: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Ghi chú & Biện pháp xử lý nếu có</label>
              <Textarea
                rows={2}
                value={vehicleForm.notes}
                onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
                placeholder="Ghi nhận hiện trạng đặc biệt của xe, yêu cầu vệ sinh lại..."
                className="text-xs sm:text-sm"
              />
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setVehicleModalOpen(false)} className="w-full sm:w-auto">
                Hủy bỏ
              </Button>
              <Button type="submit" className="w-full sm:w-auto font-semibold">
                Lưu Phiếu Kiểm Xe
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          MODAL: BIÊN BẢN HỦY HÀNG KHÔNG PHÙ HỢP (BM02)
      ========================================== */}
      <Dialog open={disposalModalOpen} onOpenChange={setDisposalModalOpen}>
        <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5 text-rose-600" />
              {editingDisposal ? "Chỉnh Sửa Biên Bản Hủy Hàng" : "Lập Biên Bản Hủy Hàng Không Phù Hợp (BM02)"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tiêu hủy sản phẩm không phù hợp chuẩn Điều khoản 8.9.4 & 8.9.5 ISO 22000 với Hội đồng 3 bên (Đơn vị thực hiện hủy, P.QLCL, Phòng ban đề xuất).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDisposal} className="space-y-4 mt-2">
            {/* NHÓM 1: LÔ HÀNG VÀ KHỐI LƯỢNG */}
            <div className="rounded-lg border bg-muted/20 p-3.5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> 1. Định Danh Lô Hàng Cần Tiêu Hủy
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Số biên bản *</label>
                  <Input
                    required
                    value={disposalForm.record_code}
                    onChange={(e) => setDisposalForm({ ...disposalForm, record_code: e.target.value })}
                    className="text-xs sm:text-sm font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Ngày tiêu hủy *</label>
                  <Input
                    type="date"
                    required
                    value={disposalForm.disposal_date}
                    onChange={(e) => setDisposalForm({ ...disposalForm, disposal_date: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Mã Lô Hàng (Lot Number) *</label>
                  <Input
                    required
                    value={disposalForm.batch_number}
                    onChange={(e) => setDisposalForm({ ...disposalForm, batch_number: e.target.value })}
                    placeholder="VD: NL-2026-CA01 hoặc LOT-202608-B01"
                    className="text-xs sm:text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Tên sản phẩm / nguyên liệu *</label>
                  <Input
                    required
                    value={disposalForm.product_name}
                    onChange={(e) => setDisposalForm({ ...disposalForm, product_name: e.target.value })}
                    placeholder="VD: Cá Tra Fillet vụn dập..."
                    className="text-xs sm:text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Số lượng tiêu hủy *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={disposalForm.quantity}
                    onChange={(e) => setDisposalForm({ ...disposalForm, quantity: e.target.value })}
                    className="text-xs sm:text-sm font-bold text-rose-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Đơn vị tính *</label>
                  <select
                    value={disposalForm.unit}
                    onChange={(e) => setDisposalForm({ ...disposalForm, unit: e.target.value })}
                    className="w-full h-9 rounded-md border bg-background px-3 text-xs sm:text-sm"
                  >
                    <option value="kg">kg</option>
                    <option value="tấn">tấn</option>
                    <option value="thùng">thùng</option>
                    <option value="gói">gói</option>
                    <option value="cái">cái</option>
                  </select>
                </div>
              </div>
            </div>

            {/* NHÓM 2: LÝ DO, PHƯƠNG PHÁP & HỘI ĐỒNG */}
            <div className="rounded-lg border bg-muted/20 p-3.5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> 2. Lý Do & Phương Pháp Tiêu Hủy
              </h4>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Lý do tiêu hủy (Mô tả sự không phù hợp) *</label>
                <Textarea
                  rows={2}
                  required
                  value={disposalForm.reason}
                  onChange={(e) => setDisposalForm({ ...disposalForm, reason: e.target.value })}
                  placeholder="VD: Lô hàng bảo quản đứt gãy nhiệt độ, phát hiện vi sinh Salmonella vượt ngưỡng cho phép..."
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Phương pháp tiêu hủy *</label>
                  <Input
                    required
                    value={disposalForm.disposal_method}
                    onChange={(e) => setDisposalForm({ ...disposalForm, disposal_method: e.target.value })}
                    placeholder="VD: Thiêu đốt nhiệt và chôn lấp hợp vệ sinh"
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Địa điểm tiêu hủy *</label>
                  <Input
                    required
                    value={disposalForm.disposal_location}
                    onChange={(e) => setDisposalForm({ ...disposalForm, disposal_location: e.target.value })}
                    placeholder="VD: Khu xử lý chất thải Nhà máy"
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Hội đồng 3 bên chứng kiến & giám sát *</label>
                <Textarea
                  rows={3}
                  required
                  value={disposalForm.witness_council}
                  onChange={(e) => setDisposalForm({ ...disposalForm, witness_council: e.target.value })}
                  placeholder="1. Đại diện Đơn vị thực hiện hủy: Ông/Bà ... - Chức vụ: ...&#10;2. Đại diện Phòng Quản lý Chất lượng (P.QLCL): Ông/Bà ... - Chức vụ: ...&#10;3. Đại diện Phòng ban đề xuất hủy: Ông/Bà ... - Chức vụ: ..."
                  className="text-xs sm:text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Trạng thái hồ sơ *</label>
                  <select
                    value={disposalForm.status}
                    onChange={(e) => setDisposalForm({ ...disposalForm, status: e.target.value as any })}
                    className="w-full h-9 rounded-md border bg-background px-3 text-xs sm:text-sm font-bold"
                  >
                    <option value="DISPOSED">ĐÃ TIÊU HỦY (Hoàn tất biên bản)</option>
                    <option value="APPROVED">ĐÃ PHÊ DUYỆT (Chờ lịch hủy)</option>
                    <option value="PENDING_APPROVAL">CHỜ PHÊ DUYỆT</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Người phê duyệt *</label>
                  <Input
                    required
                    value={disposalForm.approved_by}
                    onChange={(e) => setDisposalForm({ ...disposalForm, approved_by: e.target.value })}
                    placeholder="VD: Giám Đốc Nhà Máy"
                    className="text-xs sm:text-sm font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Ghi chú bổ sung</label>
              <Textarea
                rows={2}
                value={disposalForm.notes}
                onChange={(e) => setDisposalForm({ ...disposalForm, notes: e.target.value })}
                placeholder="Ghi chú về hình ảnh hiện trường, niêm phong bao bì trước khi hủy..."
                className="text-xs sm:text-sm"
              />
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setDisposalModalOpen(false)} className="w-full sm:w-auto">
                Hủy bỏ
              </Button>
              <Button type="submit" className="w-full sm:w-auto font-semibold bg-rose-600 hover:bg-rose-700 text-white">
                Lưu Biên Bản Hủy Hàng
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR CODE MODAL */}
      <QRCodeModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        title={qrModalData.title}
        qrCodeText={qrModalData.qrCodeText}
        lotNumber={qrModalData.lotNumber}
        productName={qrModalData.productName}
        mfgDate={qrModalData.mfgDate}
        expDate={qrModalData.expDate}
        quantity={qrModalData.quantity}
        unit={qrModalData.unit}
      />

      {/* Modal Xóa Tồn Kho */}
      <ConfirmDialog
        isOpen={!!deletingStockItem}
        onClose={() => setDeletingStockItem(null)}
        onConfirm={async () => {
          if (deletingStockItem) {
            try {
              await api.delete(`/inventory/stock/${deletingStockItem.id}`);
              toast.success(`Đã xoá tồn kho [${deletingStockItem.name}] thành công!`);
              fetchData();
            } catch (err: any) {
              toast.error("Lỗi khi xóa tồn kho: " + (err.response?.data?.detail || err.message));
            }
            setDeletingStockItem(null);
          }
        }}
        title="Xác nhận xóa tồn kho"
        description={`Bạn có chắc chắn muốn xóa bản ghi tồn kho [${deletingStockItem?.name}] (Lô: ${deletingStockItem?.lot}) khỏi hệ thống không? Dữ liệu đã xóa không thể khôi phục.`}
        confirmLabel="Xóa tồn kho"
        variant="destructive"
      />

      {/* Modal Xóa Mẫu Lưu */}
      <ConfirmDialog
        isOpen={!!deletingSampleItem}
        onClose={() => setDeletingSampleItem(null)}
        onConfirm={async () => {
          if (deletingSampleItem) {
            try {
              await api.delete(`/inventory/samples/${deletingSampleItem.id}`);
              toast.success(`Đã xoá mẫu lưu [${deletingSampleItem.code}] thành công!`);
              fetchData();
            } catch (err: any) {
              toast.error("Lỗi khi xóa mẫu lưu: " + (err.response?.data?.detail || err.message));
            }
            setDeletingSampleItem(null);
          }
        }}
        title="Xác nhận hủy / xóa mẫu lưu nghiệm thức"
        description={`Bạn có chắc chắn muốn xóa mẫu lưu đối chứng [${deletingSampleItem?.code}] khỏi hệ thống tủ bảo quản?`}
        confirmLabel="Xóa mẫu lưu"
        variant="destructive"
      />
    </div>
  );
}
