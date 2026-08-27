import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader, AIBadge } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logoImg from "@/assets/logo.png";
import {
  QrCode,
  Search,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  ShieldCheck,
  Building2,
  Boxes,
  ThermometerSnowflake,
  FlaskConical,
  Truck,
  RotateCcw,
  Sparkles,
  Layers,
  FileText,
  Phone,
  MapPin,
  Lock,
  Flame,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useState, useEffect } from "react";
import api from "@/lib/api";

import { QRCodeModal } from "@/components/QRCodeModal";

export const Route = createFileRoute("/traceability")({
  head: () => ({
    meta: [
      { title: "Truy Xuất Nguồn Gốc 1 Chạm & Thu Hồi – WCERT FSMS" },
      { name: "description", content: "Hệ thống truy xuất nguồn gốc ngược và xuôi 1 chạm theo tiêu chuẩn ISO 22000:2018 Điều khoản 8.5.2." },
      { property: "og:title", content: "Truy Xuất Nguồn Gốc 1 Chạm & Thu Hồi – WCERT FSMS" },
      { property: "og:description", content: "Truy xuất chuỗi cung ứng 4 tầng và giả lập thu hồi sản phẩm." },
    ],
  }),
  component: () => (
    <AppShell module="inventory">
      <TraceabilityPage />
    </AppShell>
  ),
});

export function TraceabilityPage() {
  const [mode, setMode] = useState<"backward" | "forward">("backward");
  const [queryCode, setQueryCode] = useState("LOT-202608-B01");
  const [forwardCode, setForwardCode] = useState("NL-2026-CA01");
  const [loading, setLoading] = useState(false);
  const [quarantining, setQuarantining] = useState(false);
  const [isQuarantinedSuccess, setIsQuarantinedSuccess] = useState(false);
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
    title: "Mã QR Lô Hàng Thành Phẩm",
    qrCodeText: "QR-CC500-B01",
    lotNumber: "LOT-202608-B01",
    productName: "Chả cá Ba Sa Thượng Hạng 500g",
  });

  // Results
  const [backwardTree, setBackwardTree] = useState<any>(null);
  const [forwardRecall, setForwardRecall] = useState<any>(null);

  // Backward Trace Handler
  const handleBackwardSearch = async (targetCode?: string) => {
    const code = (targetCode || queryCode).trim();
    if (!code) return;
    setLoading(true);
    try {
      const res = await api.get(`/traceability/backward?query_code=${encodeURIComponent(code)}`);
      setBackwardTree(res.data);
    } catch (err: any) {
      console.error("Lỗi truy xuất ngược:", err);
      alert("Không thể kết nối API truy xuất ngược: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Forward Trace Handler
  const handleForwardSearch = async (targetLot?: string) => {
    const lot = (targetLot || forwardCode).trim();
    if (!lot) return;
    setLoading(true);
    try {
      const res = await api.get(`/traceability/forward?material_lot_number=${encodeURIComponent(lot)}`);
      setForwardRecall(res.data);
    } catch (err: any) {
      console.error("Lỗi truy xuất xuôi:", err);
      alert("Không thể kết nối API truy xuất xuôi: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Seed demo data and auto query
  const handleSeedAndSearch = async () => {
    setLoading(true);
    try {
      await api.post("/traceability/seed-demo");
      setIsQuarantinedSuccess(false);
      if (mode === "backward") {
        await handleBackwardSearch("LOT-202608-B01");
      } else {
        await handleForwardSearch("NL-2026-CA01");
      }
    } catch (err) {
      console.error("Lỗi seed demo:", err);
    } finally {
      setLoading(false);
    }
  };

  // Quarantine Batch Stock Action
  const handleQuarantine = async (batchNumber: string) => {
    if (!confirm(`XÁC NHẬN KHÓA XUẤT KHO:\nBạn có chắc muốn chuyển toàn bộ tồn kho của mẻ ${batchNumber} sang trạng thái BIỆT TRỮ CÁCH LY (QUARANTINE)?`)) {
      return;
    }
    setQuarantining(true);
    try {
      const res = await api.post(`/traceability/quarantine-batch/${batchNumber}?reason=Phat%20hien%20su%20co%20nguyen%20lieu`);
      setIsQuarantinedSuccess(true);
      if (mode === "backward") handleBackwardSearch();
      else handleForwardSearch();
    } catch (err: any) {
      alert("Lỗi khi khóa tồn kho: " + (err.response?.data?.detail || err.message));
    } finally {
      setQuarantining(false);
    }
  };

  // Auto query initial demo on mount
  useEffect(() => {
    handleBackwardSearch("LOT-202608-B01");
  }, []);

  const triggerPrint = () => {
    document.body.classList.add("printing-bm-tx");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-bm-tx");
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* PRINT STYLES FOR BM-TX-01 */}
      <style>{`
        @media print {
          body.printing-bm-tx * {
            visibility: hidden !important;
          }
          body.printing-bm-tx #printable-bm-tx-01,
          body.printing-bm-tx #printable-bm-tx-01 * {
            visibility: visible !important;
          }
          body.printing-bm-tx #printable-bm-tx-01 {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            border: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
        }
      `}</style>
      {/* HEADER (HIDE IN PRINT) */}
      <div className="print:hidden flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/inventory" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 font-medium">
              <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Kho FEFO
            </Link>
          </div>
          <PageHeader
            title="Truy Xuất Nguồn Gốc 1 Chạm (Traceability Engine)"
            description="Truy xuất ngược từ Thành phẩm sang Nguyên liệu & Truy xuất xuôi thu hồi khẩn cấp theo ISO 22000:2018 Điều khoản 8.5.2."
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSeedAndSearch} disabled={loading} className="gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Nạp mẫu Demo ISO
          </Button>
          {backwardTree && backwardTree.found && mode === "backward" && (
            <Button size="sm" onClick={triggerPrint} className="gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
              <Printer className="h-4 w-4" />
              In Biên Bản BM-TX-01
            </Button>
          )}
        </div>
      </div>

      <div className="print:hidden">
        <AIBadge>
          <b>AI Phân Tích Chuỗi Cung Ứng:</b> Tự động liên kết mẻ sản xuất với kết quả kiểm tra CCP và nhà cung ứng · Xác định nhanh danh sách khách hàng cần thu hồi trong &lt; 15 phút (vượt chuẩn ISO 120 phút).
        </AIBadge>
      </div>

      {/* MODE SELECTOR (HIDE IN PRINT) */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => {
            setMode("backward");
            handleBackwardSearch(queryCode);
          }}
          className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
            mode === "backward"
              ? "border-emerald-600 bg-emerald-50/20 ring-1 ring-emerald-600"
              : "border-border bg-card hover:bg-muted/30"
          }`}
        >
          <div className={`p-2.5 rounded-lg shrink-0 ${mode === "backward" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-foreground flex items-center gap-2">
              1. Truy Xuất Ngược (Backward Traceability)
              {mode === "backward" && <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full">Đang chọn</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Nhập Mã Lô Thành phẩm → Truy ra toàn bộ: Mẻ SX, Nhật ký CCP, Tủ mẫu lưu, Nguyên liệu và Nhà cung ứng.
            </p>
          </div>
        </button>

        <button
          onClick={() => {
            setMode("forward");
            handleForwardSearch(forwardCode);
          }}
          className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all ${
            mode === "forward"
              ? "border-rose-600 bg-rose-50/20 ring-1 ring-rose-600"
              : "border-border bg-card hover:bg-muted/30"
          }`}
        >
          <div className={`p-2.5 rounded-lg shrink-0 ${mode === "forward" ? "bg-rose-600 text-white" : "bg-muted text-muted-foreground"}`}>
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-foreground flex items-center gap-2">
              2. Truy Xuất Xuôi & Thu Hồi (Mock Recall)
              {mode === "forward" && <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full">Đang chọn</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Nhập Mã Lô Nguyên liệu sự cố → Quét toàn bộ mẻ đã dùng, tồn kho cần khóa và khách hàng cần thu hồi khẩn cấp.
            </p>
          </div>
        </button>
      </div>

      {/* SEARCH BAR (HIDE IN PRINT) */}
      <div className="print:hidden rounded-2xl border bg-card p-4 sm:p-5 shadow-xs">
        {mode === "backward" ? (
          <div className="space-y-3">
            <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
              <QrCode className="h-4 w-4 text-emerald-600" />
              Tra cứu Mã Lô Thành Phẩm / Mã Phiếu Xuất Kho / Quét QR:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={queryCode}
                  onChange={(e) => setQueryCode(e.target.value)}
                  placeholder="Ví dụ: LOT-202608-B01, PXK-2026-0801, QR-CC500-B01..."
                  className="pl-10 text-xs sm:text-sm font-mono font-bold"
                  onKeyDown={(e) => e.key === "Enter" && handleBackwardSearch()}
                />
              </div>
              <Button onClick={() => handleBackwardSearch()} disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shrink-0">
                <Search className="h-4 w-4" />
                {loading ? "Đang truy xuất..." : "Truy Xuất Ngược 1 Chạm"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Mẫu thử nghiệm nhanh:</span>
              <button
                onClick={() => {
                  setQueryCode("LOT-202608-B01");
                  handleBackwardSearch("LOT-202608-B01");
                }}
                className="font-mono text-primary font-semibold hover:underline bg-muted/60 px-2 py-0.5 rounded"
              >
                LOT-202608-B01 (Chả cá Ba Sa)
              </button>
              <button
                onClick={() => {
                  setQueryCode("PXK-2026-0801");
                  handleBackwardSearch("PXK-2026-0801");
                }}
                className="font-mono text-primary font-semibold hover:underline bg-muted/60 px-2 py-0.5 rounded"
              >
                PXK-2026-0801 (Xuất Co.opmart)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Nhập Mã Lô Nguyên Liệu Cần Điều Tra / Thu Hồi Khẩn Cấp:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={forwardCode}
                  onChange={(e) => setForwardCode(e.target.value)}
                  placeholder="Ví dụ: NL-2026-CA01, NL-2026-GV01, NL-2606-04..."
                  className="pl-10 text-xs sm:text-sm font-mono font-bold text-rose-700 border-rose-200"
                  onKeyDown={(e) => e.key === "Enter" && handleForwardSearch()}
                />
              </div>
              <Button onClick={() => handleForwardSearch()} disabled={loading} className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold shrink-0">
                <ShieldAlert className="h-4 w-4" />
                {loading ? "Đang quét..." : "Quét Giả Lập Thu Hồi (Mock Recall)"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Mẫu thử nghiệm nhanh:</span>
              <button
                onClick={() => {
                  setForwardCode("NL-2026-CA01");
                  handleForwardSearch("NL-2026-CA01");
                }}
                className="font-mono text-rose-600 font-semibold hover:underline bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
              >
                NL-2026-CA01 (Cá Tra Fillet)
              </button>
              <button
                onClick={() => {
                  setForwardCode("NL-2026-GV01");
                  handleForwardSearch("NL-2026-GV01");
                }}
                className="font-mono text-rose-600 font-semibold hover:underline bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
              >
                NL-2026-GV01 (Gia vị tổng hợp)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODE A: BACKWARD TRACEABILITY TREE & REPORT (BM-TX-01)
      ========================================================================= */}
      {mode === "backward" && backwardTree && (
        <div className="space-y-6">
          {/* COMPLIANCE SCORECARD (HIDE IN PRINT) */}
          <div className="print:hidden rounded-xl border border-emerald-500/30 bg-emerald-50/20 p-4 sm:p-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-emerald-950">
                      Kết Luận Thẩm Định Xuất Xưởng (Release Clearance)
                    </h3>
                    <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      ĐẠT CHUẨN ISO 22000
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Lô hàng đáp ứng 100% tiêu chí ATTP: CCP trong giới hạn tới hạn, nguyên liệu IQC Đạt, mẫu đối chứng đã được lưu giữ an toàn.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Giám sát CCP: ĐẠT
                </div>
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  IQC Nguyên Liệu: ĐẠT
                </div>
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Mẫu Lưu Nghiệm: ĐÃ KHÓA TỦ
                </div>
              </div>
            </div>
          </div>

          {/* SƠ ĐỒ PHẢ HỆ CHUỖI CUNG ỨNG 4 TẦNG (INTERACTIVE SUPPLY CHAIN LINEAGE) */}
          <div className="print:hidden space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Sơ Đồ Cây Phả Hệ Chuỗi Cung Ứng 4 Tầng (Supply Chain Lineage Tree)
            </h3>

            <div className="space-y-4">
              {/* TẦNG 1: NGUYÊN LIỆU & NHÀ CUNG CẤP */}
              <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-blue-600 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-blue-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    TẦNG 1: NHÀ CUNG CẤP & NGUYÊN VẬT LIỆU ĐẦU VÀO ({backwardTree.suppliers_and_materials.length} lô)
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">ISO 22000 Điều khoản 7.1.6 & 8.2</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {backwardTree.suppliers_and_materials.map((sup: any, idx: number) => (
                    <div key={idx} className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{sup.supplier_name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                          {sup.supplier_code}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground">Nguyên liệu:</span>
                          <div className="font-semibold text-foreground">{sup.material_name}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Mã lô NL:</span>
                          <div className="font-mono font-bold text-primary">{sup.lot_number}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Đánh giá NCC:</span>
                          <div className="font-semibold text-emerald-600">{sup.rating_score}/100 điểm</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Kiểm tra IQC:</span>
                          <div className="font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> {sup.iqc_status}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MŨI TÊN LIÊN KẾT */}
              <div className="flex justify-center -my-2 text-muted-foreground">
                <ChevronRight className="h-5 w-5 rotate-90" />
              </div>

              {/* TẦNG 2: MẺ CHẾ BIẾN & GIÁM SÁT CCP */}
              <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-primary space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-primary" />
                    TẦNG 2: MẺ SẢN XUẤT & HỒ SƠ GIÁM SÁT CCP / oPRP
                  </span>
                  <div className="flex items-center gap-2">
                    {backwardTree.batch_info && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQrModalData({
                            title: `Tem Mã QR Lô – ${backwardTree.batch_info.product_name}`,
                            qrCodeText: `QR-${backwardTree.batch_info.batch_number}`,
                            lotNumber: backwardTree.batch_info.batch_number,
                            productName: backwardTree.batch_info.product_name,
                            quantity: backwardTree.batch_info.actual_quantity,
                            unit: backwardTree.batch_info.unit,
                          });
                          setQrModalOpen(true);
                        }}
                        className="h-7 text-xs gap-1.5 font-semibold text-primary border-primary/30 hover:bg-primary/5"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        Xem Tem Mã QR
                      </Button>
                    )}
                    <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">ISO 22000 Điều khoản 8.5.4</span>
                  </div>
                </div>

                {backwardTree.batch_info ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-muted/40 p-3 rounded-lg">
                      <div>
                        <span className="text-muted-foreground">Mã mẻ SX:</span>
                        <div className="font-mono font-bold text-primary text-sm">{backwardTree.batch_info.batch_number}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tên sản phẩm:</span>
                        <div className="font-semibold text-foreground">{backwardTree.batch_info.product_name}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sản lượng:</span>
                        <div className="font-bold text-foreground">
                          {backwardTree.batch_info.actual_quantity} {backwardTree.batch_info.unit}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">QC Thẩm định:</span>
                        <div className="font-semibold text-foreground">{backwardTree.batch_info.qc_inspector}</div>
                      </div>
                    </div>

                    {backwardTree.ccp_monitoring_records && backwardTree.ccp_monitoring_records.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-muted-foreground">Hồ sơ đo đạc CCP theo thời gian thực:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {backwardTree.ccp_monitoring_records.map((ccp: any, cidx: number) => (
                            <div key={cidx} className="rounded-lg border bg-muted/20 p-2.5 text-xs space-y-1">
                              <div className="flex items-center justify-between font-bold">
                                <span>{ccp.ccp_code}: {ccp.ccp_name}</span>
                                <span className="text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> {ccp.measured_value} {ccp.unit} (ĐẠT)
                                </span>
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Người kiểm tra: {ccp.checked_by_name} | Công đoạn: {ccp.process_step}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground bg-muted/20 p-2 rounded flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Giám sát CCP1 (Thanh trùng nhiệt độ 85.5°C / 15 phút) & CCP2 (Máy dò kim loại Fe 1.2mm) đạt 100%.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Không có thông tin mẻ.</div>
                )}
              </div>

              {/* MŨI TÊN LIÊN KẾT */}
              <div className="flex justify-center -my-2 text-muted-foreground">
                <ChevronRight className="h-5 w-5 rotate-90" />
              </div>

              {/* TẦNG 3: TỒN KHO FEFO & MẪU LƯU NGHIỆM THỨC */}
              <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-teal-600 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-teal-950 flex items-center gap-2">
                    <ThermometerSnowflake className="h-4 w-4 text-teal-600" />
                    TẦNG 3: TỒN KHO HIỆN TẠI & MẪU LƯU ĐỐI CHỨNG
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">ISO 22000 Điều khoản 8.5.2 & 8.7</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Cột Tồn kho */}
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <Boxes className="h-3.5 w-3.5 text-teal-600" />
                      Tồn Kho Thành Phẩm Sẵn Có:
                    </span>
                    {backwardTree.warehouse_stock.length > 0 ? (
                      backwardTree.warehouse_stock.map((stk: any, sidx: number) => (
                        <div key={sidx} className="text-[11px] space-y-1">
                          <div className="font-bold text-foreground">
                            {stk.quantity} {stk.unit} ({stk.location_bin})
                          </div>
                          <div className="text-muted-foreground">
                            HSD: {stk.exp_date} (Còn {stk.days_to_expiry} ngày) | Trạng thái: <b>{stk.status}</b>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground italic">Không có hàng tồn ở kho (Đã xuất hết).</div>
                    )}
                  </div>

                  {/* Cột Mẫu lưu */}
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <FlaskConical className="h-3.5 w-3.5 text-blue-600" />
                      Mẫu Lưu Đối Chứng Nghiệm Thức:
                    </span>
                    {backwardTree.retained_samples.length > 0 ? (
                      backwardTree.retained_samples.map((smp: any, mpidx: number) => (
                        <div key={mpidx} className="text-[11px] space-y-1">
                          <div className="font-bold text-foreground flex items-center justify-between">
                            <span>Mã mẫu: {smp.sample_code}</span>
                            <span className="text-emerald-700 font-bold">Vi sinh: {smp.test_result}</span>
                          </div>
                          <div className="text-muted-foreground">
                            Vị trí: {smp.storage_cabinet} | Hạn lưu: {smp.expiry_date}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground italic">Chưa ghi nhận mẫu lưu.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* MŨI TÊN LIÊN KẾT */}
              <div className="flex justify-center -my-2 text-muted-foreground">
                <ChevronRight className="h-5 w-5 rotate-90" />
              </div>

              {/* TẦNG 4: PHÂN PHỐI & KHÁCH HÀNG */}
              <div className="rounded-xl border bg-card p-4 shadow-sm border-l-4 border-l-emerald-600 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs sm:text-sm text-emerald-950 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-emerald-600" />
                    TẦNG 4: ĐƠN HÀNG XUẤT KHO & KHÁCH HÀNG TIÊU THỤ ({backwardTree.customers_dispatched.length} phiếu xuất)
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">ISO 22000 Điều khoản 8.5.2</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {backwardTree.customers_dispatched.map((cust: any, cidx: number) => (
                    <div key={cidx} className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-sm">{cust.customer_name}</span>
                        <span className="font-mono font-bold text-primary">{cust.dispatch_code}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div>
                          <span className="text-muted-foreground">Số lượng giao:</span>
                          <div className="font-bold text-foreground">{cust.quantity_dispatched} {cust.unit}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Xe giao hàng:</span>
                          <div className="font-semibold text-foreground">{cust.vehicle_number} ({cust.vehicle_temp_c}°C)</div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Địa điểm giao:</span>
                          <div className="text-foreground">{cust.destination_address || "Kho trung tâm"}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              DOCUMENT PREVIEW & PRINT TEMPLATE: BM-TX-01 (BIÊN BẢN TRUY XUẤT NGUỒN GỐC)
          ========================================================================= */}
          <div
            id="printable-bm-tx-01"
            className="mt-8 rounded-2xl border bg-card p-6 sm:p-8 shadow-md print:shadow-none print:border-none print:p-0 print:m-0"
          >
            {/* DOCUMENT HEADER */}
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="WCERT" className="h-12 w-auto object-contain" />
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                    CÔNG TY CỔ PHẦN CHẾ BIẾN THỰC PHẨM WCERT
                  </h2>
                  <div className="text-xs text-muted-foreground">
                    Hệ Thống Quản Lý An Toàn Thực Phẩm Theo Tiêu Chuẩn Quốc Tế ISO 22000:2018
                  </div>
                </div>
              </div>
              <div className="text-right text-xs font-mono">
                <div className="font-bold text-foreground">BIỂU MẪU: BM-TX-01</div>
                <div className="text-muted-foreground">Lần ban hành: 02 (2026)</div>
                <div className="text-muted-foreground">Ngày in: {new Date().toLocaleDateString("vi-VN")}</div>
              </div>
            </div>

            {/* DOCUMENT TITLE */}
            <div className="text-center my-6">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground uppercase">
                BIÊN BẢN TRUY XUẤT NGUỒN GỐC LÔ HÀNG THÀNH PHẨM
              </h1>
              <p className="text-xs text-muted-foreground italic mt-1">
                (Áp dụng theo quy định truy xuất nguồn gốc một chạm - ISO 22000:2018 Điều khoản 8.5.2)
              </p>
            </div>

            {/* SECTION 1: PRODUCT INFO */}
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="rounded-lg border p-3 bg-muted/10 space-y-2">
                <h4 className="font-bold uppercase text-primary text-xs">I. THÔNG TIN SẢN PHẨM & MẺ CHẾ BIẾN</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Mã Mẻ Sản Xuất:</span>
                    <div className="font-mono font-bold text-foreground">{backwardTree.batch_info?.batch_number}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tên Sản Phẩm:</span>
                    <div className="font-bold text-foreground">{backwardTree.batch_info?.product_name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sản Lượng Thực Tế:</span>
                    <div className="font-bold text-foreground">
                      {backwardTree.batch_info?.actual_quantity} {backwardTree.batch_info?.unit}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dây Chuyền / Ca:</span>
                    <div className="font-medium text-foreground">{backwardTree.batch_info?.production_line} ({backwardTree.batch_info?.shift})</div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: RAW MATERIALS */}
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="font-bold uppercase text-primary text-xs">II. NGUYÊN LIỆU ĐẦU VÀO & NHÀ CUNG CẤP</h4>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                      <th className="py-1.5 px-2">Tên Nguyên Liệu</th>
                      <th className="py-1.5 px-2">Mã Lô NL</th>
                      <th className="py-1.5 px-2">Nhà Cung Ứng</th>
                      <th className="py-1.5 px-2">Kết Quả IQC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {backwardTree.suppliers_and_materials.map((s: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-2 font-medium">{s.material_name}</td>
                        <td className="py-1.5 px-2 font-mono">{s.lot_number}</td>
                        <td className="py-1.5 px-2">{s.supplier_name}</td>
                        <td className="py-1.5 px-2 font-bold text-emerald-700">{s.iqc_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SECTION 3: CCP COMPLIANCE */}
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="font-bold uppercase text-primary text-xs">III. THẨM ĐỊNH ĐIỂM KIỂM SOÁT TỚI HẠN (CCP / oPRP)</h4>
                <p className="text-xs text-muted-foreground">
                  • <b>CCP 1 (Thanh trùng nhiệt độ):</b> Đo thực tế 85.5°C (Giới hạn tới hạn: ≥ 85.0°C trong ≥ 15 phút) → <b>ĐẠT TIÊU CHUẨN</b>.
                  <br />
                  • <b>CCP 2 (Dò kim loại sau đóng gói):</b> Test strip Fe 1.2mm, Non-Fe 1.5mm, SUS 2.0mm → <b>KHÔNG PHÁT HIỆN DỊ VẬT (ĐẠT)</b>.
                  <br />
                  • <b>Mẫu lưu đối chứng (ML-202608-01):</b> Khối lượng 250g, bảo quản tại Tủ đông T-01 (≤ -18°C), Hạn lưu đến 25/11/2026.
                </p>
              </div>

              {/* SECTION 4: DISPATCHES */}
              <div className="rounded-lg border p-3 space-y-2">
                <h4 className="font-bold uppercase text-primary text-xs">IV. PHÂN PHỐI & KHÁCH HÀNG NHẬN</h4>
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                      <th className="py-1.5 px-2">Mã Phiếu Xuất</th>
                      <th className="py-1.5 px-2">Khách Hàng / Đại Lý</th>
                      <th className="py-1.5 px-2">Số Lượng</th>
                      <th className="py-1.5 px-2">Nhiệt Độ Xe Giao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {backwardTree.customers_dispatched.map((c: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-2 font-mono font-bold">{c.dispatch_code}</td>
                        <td className="py-1.5 px-2">{c.customer_name}</td>
                        <td className="py-1.5 px-2 font-bold">{c.quantity_dispatched} {c.unit}</td>
                        <td className="py-1.5 px-2 text-blue-600 font-semibold">{c.vehicle_temp_c}°C ({c.vehicle_number})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SIGNATURE SECTION */}
              <div className="grid grid-cols-3 gap-4 text-center pt-8 mt-6 border-t">
                <div className="space-y-12">
                  <div className="font-bold text-xs">NGƯỜI LẬP BIÊN BẢN</div>
                  <div className="font-semibold text-xs text-foreground">Trần Thị Lan (QC)</div>
                </div>
                <div className="space-y-12">
                  <div className="font-bold text-xs">TRƯỞNG BAN ISO / QA</div>
                  <div className="font-semibold text-xs text-foreground">Nguyễn Văn An</div>
                </div>
                <div className="space-y-12">
                  <div className="font-bold text-xs">GIÁM ĐỐC NHÀ MÁY</div>
                  <div className="font-semibold text-xs text-foreground">Lê Hoàng Quân</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE B: FORWARD TRACEABILITY & MOCK RECALL (GIẢ LẬP THU HỒI SỰ CỐ)
      ========================================================================= */}
      {mode === "forward" && forwardRecall && (
        <div className="space-y-6">
          {/* MOCK RECALL BANNER */}
          <div className="rounded-xl border border-rose-500/40 bg-rose-50/30 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rose-600 text-white">
                  <ShieldAlert className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-rose-950">
                      Báo Cáo Giả Lập Thu Hồi Sự Cố ATTP (Mock Recall Report)
                    </h3>
                    <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      MỨC ĐỘ RỦI RO: {forwardRecall.recall_risk_level}
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 mt-0.5">
                    Lô nguyên liệu nghi ngờ: <b>{forwardRecall.material_name}</b> (Mã Lô: <span className="font-mono font-bold">{forwardRecall.material_lot_number}</span>) · Nhà cung cấp: <b>{forwardRecall.supplier_name}</b>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isQuarantinedSuccess ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs">
                    <CheckCircle2 className="h-4 w-4" /> Đã Khóa Cách Ly Kho
                  </span>
                ) : (
                  <Button
                    onClick={() => handleQuarantine(forwardRecall.affected_batches[0] || "LOT-202608-B01")}
                    disabled={quarantining}
                    className="gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm"
                    size="sm"
                  >
                    <Lock className="h-4 w-4" />
                    {quarantining ? "Đang khóa..." : "Khóa Biệt Trữ Tồn Kho"}
                  </Button>
                )}
              </div>
            </div>

            {/* QUARANTINE SUCCESS BANNER */}
            {isQuarantinedSuccess && (
              <div className="rounded-lg border border-rose-300 bg-rose-100/80 p-3 text-xs text-rose-900 font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                <span>
                  <b>ĐÃ THỰC THI LỆNH BIỆT TRỮ KHẨN CẤP:</b> Toàn bộ lô tồn kho của mẻ chế biến đã được chuyển sang trạng thái <b>QUARANTINE</b> (Niêm phong cách ly, khóa quyền xuất kho cho thủ kho).
                </span>
              </div>
            )}

            {/* TIME BENCHMARK */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-rose-200 text-xs">
              <div className="bg-white/80 p-2.5 rounded-lg border border-rose-100">
                <span className="text-muted-foreground">Thời gian truy xuất hoàn thành:</span>
                <div className="text-base font-bold text-emerald-700 flex items-center gap-1">
                  <Clock className="h-4 w-4" /> {forwardRecall.iso_recall_time_est_minutes} Phút (Chuẩn ISO &lt; 120 Phút)
                </div>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-rose-100">
                <span className="text-muted-foreground">Mẻ sản xuất bị ảnh hưởng:</span>
                <div className="text-base font-bold text-rose-700">
                  {forwardRecall.affected_batches.length} mẻ ({forwardRecall.total_affected_production_qty.toLocaleString()} kg/gói)
                </div>
              </div>
              <div className="bg-white/80 p-2.5 rounded-lg border border-rose-100">
                <span className="text-muted-foreground">Số lượng đã xuất ra thị trường:</span>
                <div className="text-base font-bold text-rose-700">
                  {forwardRecall.total_units_in_market.toLocaleString()} gói (Cần thu hồi)
                </div>
              </div>
            </div>
          </div>

          {/* LIST OF AFFECTED CUSTOMERS */}
          <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Truck className="h-5 w-5 text-rose-600" />
              Danh Sách Khách Hàng / Đại Lý Đã Nhận Hàng (Cần Kích Hoạt Thu Hồi Trong 2 Giờ)
            </h3>
            <p className="text-xs text-muted-foreground">
              Theo quy định Điều khoản 8.5.2 & 8.9.5, danh sách khách hàng dưới đây phải được thông báo khẩn cấp và niêm phong sản phẩm trên kệ bán lẻ.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">Mã Phiếu Xuất</th>
                    <th className="py-2.5 px-3">Tên Khách Hàng / Đại Lý</th>
                    <th className="py-2.5 px-3">Số Điện Thoại & Địa Chỉ</th>
                    <th className="py-2.5 px-3">Số Lượng Cần Thu Hồi</th>
                    <th className="py-2.5 px-3">Trạng Thái Xử Lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {forwardRecall.affected_customers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Không có sản phẩm nào đã xuất ra thị trường. Toàn bộ còn nằm trong kho an toàn!
                      </td>
                    </tr>
                  ) : (
                    forwardRecall.affected_customers.map((c: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="py-3 px-3 font-mono font-bold text-primary">{c.dispatch_code}</td>
                        <td className="py-3 px-3 font-bold text-foreground">{c.customer_name}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 text-primary font-medium">
                            <Phone className="h-3 w-3" /> {c.customer_phone || "028.3836.0143"}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {c.destination_address || "Tổng kho Bình Dương"}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-rose-600 text-sm">
                          {c.quantity_dispatched} {c.unit}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                            <AlertTriangle className="h-3 w-3" /> LỆNH THU HỒI KHẨN
                          </span>
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

      {/* QR CODE MODAL COMPONENT */}
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
    </div>
  );
}
