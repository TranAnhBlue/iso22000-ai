import { Link } from "@tanstack/react-router";
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
  ArrowRight,
  MapPin,
  Trash2,
  Edit,
  Tag,
  QrCode,
  Flame,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { QRCodeModal } from "@/components/QRCodeModal";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ==========================================
// TYPES
// ==========================================
export interface StockItem {
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

export interface RetainedSampleItem {
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

export interface BatchItem {
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

export interface DispatchItem {
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

export function InventoryModule() {
  const [activeTab, setActiveTab] = useState<"stock" | "bins" | "samples" | "production">("stock");

  // Data states
  const [stocks, setStocks] = useState<StockItem[]>(SEED_STOCKS);
  const [samples, setSamples] = useState<RetainedSampleItem[]>(SEED_SAMPLES);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [dispatches, setDispatches] = useState<DispatchItem[]>([]);
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
      const [resStock, resSamples, resBatches, resDispatches, resKpi] = await Promise.allSettled([
        api.get("/inventory/stock"),
        api.get("/inventory/samples"),
        api.get("/inventory/batches"),
        api.get("/inventory/dispatches"),
        api.get("/inventory/kpi-stats"),
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
      </div>

      {/* TAB 1: TỒN KHO FEFO */}
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

      {/* TAB 2: SƠ ĐỒ VỊ TRÍ KỆ & BIN KHO LẠNH */}
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

      {/* TAB 3: MẪU LƯU NGHIỆM THỨC */}
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

      {/* TAB 4: MẺ SẢN XUẤT & XUẤT HÀNG */}
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

      {/* MODAL: THÊM / SỬA TỒN KHO FEFO */}
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

      {/* MODAL: THÊM / SỬA MẪU LƯU */}
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

export default InventoryModule;
